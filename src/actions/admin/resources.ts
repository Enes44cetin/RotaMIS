"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  resourceSchema,
  uuidSchema,
  type ResourceFormData,
} from "@/lib/validation/admin-schemas";
import { logAdminAction } from "@/lib/admin/audit";

function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.startsWith("169.254.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function createResourceAction(data: ResourceFormData) {
  try {
    const session = await requireAdmin();
    const validated = resourceSchema.parse(data);

    const supabase = await createClient();

    // 1. Insert learning resource
    const { data: resource, error } = await supabase
      .from("learning_resources")
      .insert({
        title: validated.title,
        provider: validated.provider,
        url: validated.url,
        resource_type: validated.resource_type,
        language: validated.language,
        pricing: validated.pricing,
        estimated_hours: validated.estimated_hours,
        difficulty: validated.difficulty,
        gives_certificate: validated.gives_certificate,
        certificate_info: validated.certificate_info || null,
        description: validated.description || null,
        status: validated.status,
        sort_order: validated.sort_order,
      })
      .select("id, title")
      .single();

    if (error || !resource) {
      return { success: false, error: error?.message || "Kaynak eklenemedi" };
    }

    // 2. Insert skill associations
    if (validated.skills && validated.skills.length > 0) {
      const skillLinks = validated.skills.map((s) => ({
        resource_id: resource.id,
        skill_id: s.skill_id,
        min_level: s.min_level,
        target_level: s.target_level,
      }));

      await supabase.from("resource_skills").insert(skillLinks);
    }

    await logAdminAction({
      action: "create_resource",
      entityType: "resource",
      entityId: resource.id,
      details: { title: resource.title, provider: validated.provider },
      adminId: session.user.id,
    });

    revalidatePath("/admin/resources");
    revalidatePath("/admin");
    return { success: true, id: resource.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kaynak oluşturulamadı";
    return { success: false, error: msg };
  }
}

export async function updateResourceAction(id: string, data: ResourceFormData) {
  try {
    const session = await requireAdmin();
    const validId = uuidSchema.parse(id);
    const validated = resourceSchema.parse(data);

    const supabase = await createClient();

    // 1. Update resource details
    const { error } = await supabase
      .from("learning_resources")
      .update({
        title: validated.title,
        provider: validated.provider,
        url: validated.url,
        resource_type: validated.resource_type,
        language: validated.language,
        pricing: validated.pricing,
        estimated_hours: validated.estimated_hours,
        difficulty: validated.difficulty,
        gives_certificate: validated.gives_certificate,
        certificate_info: validated.certificate_info || null,
        description: validated.description || null,
        status: validated.status,
        sort_order: validated.sort_order,
      })
      .eq("id", validId);

    if (error) return { success: false, error: error.message };

    // 2. Re-sync skill links
    await supabase.from("resource_skills").delete().eq("resource_id", validId);

    if (validated.skills && validated.skills.length > 0) {
      const skillLinks = validated.skills.map((s) => ({
        resource_id: validId,
        skill_id: s.skill_id,
        min_level: s.min_level,
        target_level: s.target_level,
      }));

      await supabase.from("resource_skills").insert(skillLinks);
    }

    await logAdminAction({
      action: "update_resource",
      entityType: "resource",
      entityId: validId,
      details: { title: validated.title },
      adminId: session.user.id,
    });

    revalidatePath("/admin/resources");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kaynak güncellenemedi";
    return { success: false, error: msg };
  }
}

export async function toggleStatusResourceAction(
  id: string,
  status: "draft" | "published" | "archived"
) {
  try {
    const session = await requireAdmin();
    const validId = uuidSchema.parse(id);
    const supabase = await createClient();

    const { error } = await supabase
      .from("learning_resources")
      .update({ status })
      .eq("id", validId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: `set_resource_${status}`,
      entityType: "resource",
      entityId: validId,
      adminId: session.user.id,
    });

    revalidatePath("/admin/resources");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Durum değiştirilemedi";
    return { success: false, error: msg };
  }
}

export async function deleteResourceAction(id: string) {
  try {
    const session = await requireAdmin();
    const validId = uuidSchema.parse(id);
    const supabase = await createClient();

    const { error } = await supabase
      .from("learning_resources")
      .delete()
      .eq("id", validId);
    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: "delete_resource",
      entityType: "resource",
      entityId: validId,
      adminId: session.user.id,
    });

    revalidatePath("/admin/resources");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Silme işlemi başarısız";
    return { success: false, error: msg };
  }
}

/**
 * Checks URL availability of all active learning resources in parallel batches
 */
export async function checkResourceLinksAction() {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: resources } = await supabase
      .from("learning_resources")
      .select("id, url")
      .neq("status", "archived");

    if (!resources || resources.length === 0) {
      return { success: true, total: 0, ok: 0, broken: 0 };
    }

    let okCount = 0;
    let brokenCount = 0;
    const nowIso = new Date().toISOString();

    // Process in concurrent batches of 6 to avoid long sequential timeouts
    const BATCH_SIZE = 6;
    for (let i = 0; i < resources.length; i += BATCH_SIZE) {
      const batch = resources.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (res) => {
          let isOk = false;

          if (isSafeExternalUrl(res.url)) {
            try {
              const response = await fetch(res.url, {
                method: "HEAD",
                headers: { "User-Agent": "RotaMIS-Bot/1.0" },
                signal: AbortSignal.timeout(5000),
              });

              isOk = response.status >= 200 && response.status < 400;

              if (response.status === 405 || response.status === 403) {
                const getRes = await fetch(res.url, {
                  method: "GET",
                  headers: { "User-Agent": "RotaMIS-Bot/1.0" },
                  signal: AbortSignal.timeout(5000),
                });
                isOk = getRes.status >= 200 && getRes.status < 400;
              }
            } catch {
              isOk = false;
            }
          }

          const status = isOk ? "ok" : "broken";
          if (isOk) okCount++;
          else brokenCount++;

          await supabase
            .from("learning_resources")
            .update({
              link_status: status,
              last_checked_at: nowIso,
            })
            .eq("id", res.id);
        })
      );
    }

    revalidatePath("/admin/resources");
    return {
      success: true,
      total: resources.length,
      ok: okCount,
      broken: brokenCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Link kontrolü başarısız oldu";
    return { success: false, error: msg };
  }
}
