"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  skillSchema,
  uuidSchema,
  type SkillFormData,
} from "@/lib/validation/admin-schemas";
import { logAdminAction } from "@/lib/admin/audit";

export async function createSkillAction(data: SkillFormData) {
  try {
    const session = await requireAdmin();
    const validated = skillSchema.parse(data);

    const name_en = validated.name_en?.trim() || validated.name_tr;
    const description_en = validated.description_en?.trim() || validated.description_tr;

    const supabase = await createClient();

    const { data: inserted, error } = await supabase
      .from("skills")
      .insert({
        name_tr: validated.name_tr,
        name_en,
        slug: validated.slug,
        category: validated.category,
        description_tr: validated.description_tr || null,
        description_en: description_en || null,
        icon: validated.icon || "sparkles",
        sort_order: validated.sort_order,
        is_active: validated.is_active,
      })
      .select("id, name_tr")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Bu slug ile tanımlı bir beceri zaten var." };
      }
      return { success: false, error: error.message };
    }

    await logAdminAction({
      action: "create_skill",
      entityType: "skill",
      entityId: inserted.id,
      details: { name: inserted.name_tr, category: validated.category },
      adminId: session.user.id,
    });

    revalidatePath("/admin/skills");
    revalidatePath("/admin/matrix");
    revalidatePath("/admin");

    return { success: true, id: inserted.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Beceri oluşturulamadı";
    return { success: false, error: msg };
  }
}

export async function updateSkillAction(id: string, data: SkillFormData) {
  try {
    const session = await requireAdmin();
    const validId = uuidSchema.parse(id);
    const validated = skillSchema.parse(data);

    const name_en = validated.name_en?.trim() || validated.name_tr;
    const description_en = validated.description_en?.trim() || validated.description_tr;

    const supabase = await createClient();

    const { error } = await supabase
      .from("skills")
      .update({
        name_tr: validated.name_tr,
        name_en,
        slug: validated.slug,
        category: validated.category,
        description_tr: validated.description_tr || null,
        description_en: description_en || null,
        icon: validated.icon || "sparkles",
        sort_order: validated.sort_order,
        is_active: validated.is_active,
      })
      .eq("id", validId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: "update_skill",
      entityType: "skill",
      entityId: validId,
      details: { name: validated.name_tr },
      adminId: session.user.id,
    });

    revalidatePath("/admin/skills");
    revalidatePath("/admin/matrix");
    revalidatePath("/admin");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Beceri güncellenemedi";
    return { success: false, error: msg };
  }
}

export async function toggleActiveSkillAction(id: string, is_active: boolean) {
  try {
    const session = await requireAdmin();
    const validId = uuidSchema.parse(id);
    const supabase = await createClient();

    const { error } = await supabase
      .from("skills")
      .update({ is_active: Boolean(is_active) })
      .eq("id", validId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: is_active ? "activate_skill" : "archive_skill",
      entityType: "skill",
      entityId: validId,
      adminId: session.user.id,
    });

    revalidatePath("/admin/skills");
    revalidatePath("/admin/matrix");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Durum değiştirilemedi";
    return { success: false, error: msg };
  }
}

export async function deleteSkillAction(id: string) {
  try {
    const session = await requireAdmin();
    const validId = uuidSchema.parse(id);
    const supabase = await createClient();

    // Check if used in assessment ratings or requirements
    const [{ count: ratingCount }, { count: reqCount }] = await Promise.all([
      supabase
        .from("assessment_skill_ratings")
        .select("*", { count: "exact", head: true })
        .eq("skill_id", validId),
      supabase
        .from("career_path_skill_requirements")
        .select("*", { count: "exact", head: true })
        .eq("skill_id", validId),
    ]);

    if ((ratingCount && ratingCount > 0) || (reqCount && reqCount > 0)) {
      return {
        success: false,
        error: `Bu beceri ${ratingCount || 0} öğrenci check-up'ında puanlanmış ve ${
          reqCount || 0
        } sektör matrisinde tanımlı. Öğrenci verilerinin kaybolmaması için kalıcı silinemez. Lütfen "Arşive Al" butonunu kullanın.`,
      };
    }

    const { error } = await supabase.from("skills").delete().eq("id", validId);
    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: "delete_skill",
      entityType: "skill",
      entityId: validId,
      adminId: session.user.id,
    });

    revalidatePath("/admin/skills");
    revalidatePath("/admin/matrix");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Silme işlemi başarısız";
    return { success: false, error: msg };
  }
}
