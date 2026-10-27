"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { universitySchema, type UniversityFormData } from "@/lib/validation/admin-schemas";
import { logAdminAction } from "@/lib/admin/audit";

export async function createUniversityAction(data: UniversityFormData) {
  try {
    const session = await requireAdmin();
    const validated = universitySchema.parse(data);

    const supabase = await createClient();

    const { data: inserted, error } = await supabase
      .from("universities")
      .insert({
        name: validated.name,
        city: validated.city || null,
        sort_order: validated.sort_order,
        is_active: validated.is_active,
      })
      .select("id, name")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Bu üniversite adı zaten kayıtlı." };
      }
      return { success: false, error: error.message };
    }

    await logAdminAction({
      action: "create_university",
      entityType: "university",
      entityId: inserted.id,
      details: { name: inserted.name, city: validated.city },
      adminId: session.user.id,
    });

    revalidatePath("/admin/universities");
    revalidatePath("/admin");
    return { success: true, id: inserted.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Üniversite oluşturulamadı";
    return { success: false, error: msg };
  }
}

export async function updateUniversityAction(id: string, data: UniversityFormData) {
  try {
    const session = await requireAdmin();
    const validated = universitySchema.parse(data);

    const supabase = await createClient();

    const { error } = await supabase
      .from("universities")
      .update({
        name: validated.name,
        city: validated.city || null,
        sort_order: validated.sort_order,
        is_active: validated.is_active,
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: "update_university",
      entityType: "university",
      entityId: id,
      details: { name: validated.name },
      adminId: session.user.id,
    });

    revalidatePath("/admin/universities");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Üniversite güncellenemedi";
    return { success: false, error: msg };
  }
}

export async function toggleActiveUniversityAction(id: string, is_active: boolean) {
  try {
    const session = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("universities")
      .update({ is_active })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: is_active ? "activate_university" : "archive_university",
      entityType: "university",
      entityId: id,
      adminId: session.user.id,
    });

    revalidatePath("/admin/universities");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Durum değiştirilemedi";
    return { success: false, error: msg };
  }
}

export async function deleteUniversityAction(id: string) {
  try {
    const session = await requireAdmin();
    const supabase = await createClient();

    // Check student count
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("university_id", id);

    if (count && count > 0) {
      return {
        success: false,
        error: `Bu üniversitede kayıtlı ${count} öğrenci bulunuyor. Kalıcı silinemez, lütfen pasife (arşive) alın.`,
      };
    }

    const { error } = await supabase.from("universities").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: "delete_university",
      entityType: "university",
      entityId: id,
      adminId: session.user.id,
    });

    revalidatePath("/admin/universities");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Silme işlemi başarısız";
    return { success: false, error: msg };
  }
}

/**
 * Merges a custom "university_other" written by students into either an existing catalog university
 * or creates a new university and attaches students to it.
 * Uses adminClient (service_role) because it updates multiple student profile rows.
 */
export async function mergeUnlistedUniversityAction(params: {
  rawName: string;
  action: "merge_existing" | "create_new";
  targetUniversityId?: string;
  newUniversityName?: string;
  city?: string;
}) {
  try {
    const session = await requireAdmin();
    const adminClient = createAdminClient();

    let finalUniversityId = params.targetUniversityId;

    if (params.action === "create_new") {
      if (!params.newUniversityName?.trim()) {
        return { success: false, error: "Yeni üniversite adı boş bırakılamaz." };
      }

      // 1. Create new university
      const { data: newUni, error: createErr } = await adminClient
        .from("universities")
        .insert({
          name: params.newUniversityName.trim(),
          city: params.city?.trim() || null,
          is_active: true,
        })
        .select("id")
        .single();

      if (createErr) {
        return { success: false, error: `Üniversite eklenemedi: ${createErr.message}` };
      }
      finalUniversityId = newUni.id;
    }

    if (!finalUniversityId) {
      return { success: false, error: "Hedef üniversite belirlenemedi." };
    }

    // 2. Update all profiles that typed this exact rawName in university_other
    const { error: updateErr, count } = await adminClient
      .from("profiles")
      .update({
        university_id: finalUniversityId,
        university_other: null,
      })
      .ilike("university_other", params.rawName.trim());

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    await logAdminAction({
      action: "merge_unlisted_university",
      entityType: "university",
      entityId: finalUniversityId,
      details: {
        rawName: params.rawName,
        action: params.action,
        merged_profiles_count: count ?? 0,
      },
      adminId: session.user.id,
    });

    revalidatePath("/admin/universities");
    revalidatePath("/admin");

    return { success: true, count: count ?? 0, newId: finalUniversityId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Eşleştirme işlemi başarısız";
    return { success: false, error: msg };
  }
}
