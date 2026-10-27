import { createClient } from "@/lib/supabase/server";

export interface LogAuditOptions {
  action: string;
  entityType: "matrix" | "career_path" | "skill" | "university" | "resource" | "user";
  entityId?: string | null;
  details?: Record<string, unknown>;
  adminId?: string;
}

/**
 * Inserts an immutable audit record into public.admin_audit_log
 */
export async function logAdminAction(options: LogAuditOptions) {
  try {
    const supabase = await createClient();
    let adminId = options.adminId;

    if (!adminId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      adminId = user?.id;
    }

    if (!adminId) return;

    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action: options.action,
      entity_type: options.entityType,
      entity_id: options.entityId || null,
      details: options.details || {},
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
}
