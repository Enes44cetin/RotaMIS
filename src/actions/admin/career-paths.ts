"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  careerPathSchema,
  uuidSchema,
  type CareerPathFormData,
} from "@/lib/validation/admin-schemas";
import { logAdminAction } from "@/lib/admin/audit";

export async function createCareerPathAction(data: CareerPathFormData) {
  try {
    const session = await requireAdmin();
    const validated = careerPathSchema.parse(data);

    // If English name is empty, duplicate Turkish name per user decision
    const name_en = validated.name_en?.trim() || validated.name_tr;
    const description_en = validated.description_en?.trim() || validated.description_tr;

    const supabase = await createClient();

    const { data: inserted, error } = await supabase
      .from("career_paths")
      .insert({
        name_tr: validated.name_tr,
        name_en,
        slug: validated.slug,
        description_tr: validated.description_tr || null,
        description_en: description_en || null,
        icon: validated.icon || "briefcase",
        sort_order: validated.sort_order,
        is_active: validated.is_active,
      })
      .select("id, name_tr")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: "Bu slug (URL adı) ile kayıtlı bir kariyer alanı zaten var.",
        };
      }
      return { success: false, error: error.message };
    }

    await logAdminAction({
      action: "create_career_path",
      entityType: "career_path",
      entityId: inserted.id,
      details: { name: inserted.name_tr, slug: validated.slug },
      adminId: session.user.id,
    });

    revalidatePath("/admin/career-paths");
    revalidatePath("/admin/matrix");
    revalidatePath("/admin");

    return { success: true, id: inserted.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kariyer rotası oluşturulamadı";
    return { success: false, error: msg };
  }
}

export async function updateCareerPathAction(id: string, data: CareerPathFormData) {
  try {
    const session = await requireAdmin();
    const validId = uuidSchema.parse(id);
    const validated = careerPathSchema.parse(data);

    const name_en = validated.name_en?.trim() || validated.name_tr;
    const description_en = validated.description_en?.trim() || validated.description_tr;

    const supabase = await createClient();

    const { error } = await supabase
      .from("career_paths")
      .update({
        name_tr: validated.name_tr,
        name_en,
        slug: validated.slug,
        description_tr: validated.description_tr || null,
        description_en: description_en || null,
        icon: validated.icon || "briefcase",
        sort_order: validated.sort_order,
        is_active: validated.is_active,
      })
      .eq("id", validId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAdminAction({
      action: "update_career_path",
      entityType: "career_path",
      entityId: validId,
      details: { name: validated.name_tr },
      adminId: session.user.id,
    });

    revalidatePath("/admin/career-paths");
    revalidatePath("/admin/matrix");
    revalidatePath("/admin");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kariyer rotası güncellenemedi";
    return { success: false, error: msg };
  }
}

export async function toggleActiveCareerPathAction(id: string, is_active: boolean) {
  try {
    const session = await requireAdmin();
    const validId = uuidSchema.parse(id);
    const supabase = await createClient();

    const { error } = await supabase
      .from("career_paths")
      .update({ is_active: Boolean(is_active) })
      .eq("id", validId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: is_active ? "activate_career_path" : "archive_career_path",
      entityType: "career_path",
      entityId: validId,
      adminId: session.user.id,
    });

    revalidatePath("/admin/career-paths");
    revalidatePath("/admin/matrix");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Durum güncellenemedi";
    return { success: false, error: msg };
  }
}

export async function deleteCareerPathAction(id: string) {
  try {
    const session = await requireAdmin();
    const validId = uuidSchema.parse(id);
    const supabase = await createClient();

    // Check if any students are using it
    const { count: studentCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("target_career_path_id", validId);

    if (studentCount && studentCount > 0) {
      return {
        success: false,
        error: `Bu rota ${studentCount} öğrenci tarafından hedefleniyor. Kalıcı silinemez, lütfen pasife (arşive) alın.`,
      };
    }

    const { error } = await supabase.from("career_paths").delete().eq("id", validId);
    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: "delete_career_path",
      entityType: "career_path",
      entityId: validId,
      adminId: session.user.id,
    });

    revalidatePath("/admin/career-paths");
    revalidatePath("/admin/matrix");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Silme işlemi başarısız";
    return { success: false, error: msg };
  }
}
