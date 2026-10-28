"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  saveMatrixSchema,
  copyMatrixSchema,
  type SaveMatrixFormData,
} from "@/lib/validation/admin-schemas";
import { logAdminAction } from "@/lib/admin/audit";

export async function saveMatrixAction(data: SaveMatrixFormData) {
  try {
    await requireAdmin();
    const validated = saveMatrixSchema.parse(data);

    const supabase = await createClient();

    // Call atomic RPC function in Postgres (which also records the audit log entry atomically)
    const { error } = await supabase.rpc("save_requirement_matrix", {
      p_career_path_id: validated.career_path_id,
      p_requirements: validated.requirements,
    });

    if (error) {
      console.error("RPC save_requirement_matrix failed:", error);
      return { success: false, error: error.message };
    }

    // Revalidate affected pages
    revalidatePath("/admin/matrix");
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Matris kaydedilirken bir hata oluştu";
    return { success: false, error: errorMsg };
  }
}

export async function copyMatrixAction(
  sourceCareerPathId: string,
  targetCareerPathId: string
) {
  try {
    const session = await requireAdmin();
    const validated = copyMatrixSchema.parse({
      sourceCareerPathId,
      targetCareerPathId,
    });

    const supabase = await createClient();

    // 1. Fetch requirements from source
    const { data: sourceReqs, error: fetchErr } = await supabase
      .from("career_path_skill_requirements")
      .select("skill_id, required_level, importance")
      .eq("career_path_id", validated.sourceCareerPathId);

    if (fetchErr || !sourceReqs) {
      return { success: false, error: "Kaynak rotanın gereksinimleri alınamadı." };
    }

    // 2. Save into target via RPC
    const { error: rpcErr } = await supabase.rpc("save_requirement_matrix", {
      p_career_path_id: validated.targetCareerPathId,
      p_requirements: sourceReqs,
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    await logAdminAction({
      action: "copy_matrix",
      entityType: "matrix",
      entityId: validated.targetCareerPathId,
      details: {
        source_id: validated.sourceCareerPathId,
        target_id: validated.targetCareerPathId,
        copied_count: sourceReqs.length,
      },
      adminId: session.user.id,
    });

    revalidatePath("/admin/matrix");
    revalidatePath("/dashboard");

    return { success: true, count: sourceReqs.length };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Kopyalama sırasında hata oluştu";
    return { success: false, error: errorMsg };
  }
}
