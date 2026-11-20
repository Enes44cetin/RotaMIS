"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  toggleTaskStatusSchema,
  markTaskInProgressSchema,
  skipTaskSchema,
  unskipTaskSchema,
  reportBrokenResourceSchema,
  type ReportBrokenResourceInput,
} from "@/lib/validation/student-schemas";
import type { TaskStatus } from "@/types/database";

export async function toggleTaskStatus(taskId: string, currentStatus: TaskStatus) {
  const parsed = toggleTaskStatusSchema.safeParse({ taskId, currentStatus });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Geçersiz görev parametresi.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor." };
  }

  const nextStatus: TaskStatus =
    parsed.data.currentStatus === "completed" ? "pending" : "completed";

  const { error } = await supabase
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", parsed.data.taskId)
    .eq("user_id", user.id);

  if (error) {
    if (error.message?.includes("Tamamlanmış bir sprintteki")) {
      return {
        error: "Tamamlanmış bir sprintteki görevlerin durumu değiştirilemez.",
      };
    }
    return { error: "Görev güncellenirken bir hata oluştu: " + error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, nextStatus };
}

export async function markTaskInProgress(taskId: string) {
  const parsed = markTaskInProgressSchema.safeParse({ taskId });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Geçersiz görev parametresi.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "in_progress" })
    .eq("id", parsed.data.taskId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) {
    return { error: "Görev durumu güncellenemedi: " + error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, nextStatus: "in_progress" as TaskStatus };
}

export async function skipTask(taskId: string) {
  const parsed = skipTaskSchema.safeParse({ taskId });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Geçersiz görev kimliği.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "skipped" })
    .eq("id", parsed.data.taskId)
    .eq("user_id", user.id);

  if (error) {
    if (error.message?.includes("Tamamlanmış bir sprintteki")) {
      return {
        error: "Tamamlanmış bir sprintteki görevler atlanamaz.",
      };
    }
    return { error: "Görev atlanırken bir hata oluştu: " + error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, nextStatus: "skipped" as TaskStatus };
}

export async function unskipTask(taskId: string) {
  const parsed = unskipTaskSchema.safeParse({ taskId });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Geçersiz görev kimliği.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "pending" })
    .eq("id", parsed.data.taskId)
    .eq("user_id", user.id)
    .eq("status", "skipped");

  if (error) {
    if (error.message?.includes("Tamamlanmış bir sprintteki")) {
      return {
        error: "Tamamlanmış bir sprintteki görevlerin durumu değiştirilemez.",
      };
    }
    return { error: "Görev tekrar aktif edilirken bir hata oluştu: " + error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, nextStatus: "pending" as TaskStatus };
}

export async function reportBrokenResource(rawInput: ReportBrokenResourceInput) {
  const parsed = reportBrokenResourceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message || "Geçersiz sorun bildirimi verisi.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor." };
  }

  const { taskId, resourceId, reason, note, skipAfterReport } = parsed.data;

  // Görevin kullanıcıya ait olduğunu doğrula
  const { data: taskRow } = await supabase
    .from("tasks")
    .select("id, resource_id")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!taskRow) {
    return { error: "Bildirilecek görev bulunamadı." };
  }

  // İstemciden gelen resourceId'ye asla güvenilmez; yalnızca doğrulanmış DB görevindeki kaynak kullanılır
  if (resourceId && taskRow.resource_id && resourceId !== taskRow.resource_id) {
    return { error: "Görev ile bildirilen kaynak kimliği eşleşmiyor." };
  }

  let degraded = false;
  const effectiveResourceId = taskRow.resource_id ?? null;

  const { error: insertError } = await supabase.from("resource_reports").insert({
    user_id: user.id,
    resource_id: effectiveResourceId,
    task_id: taskRow.id,
    reason,
    note: note?.trim() || null,
  });

  if (insertError) {
    const code = insertError.code || "";
    const msg = (insertError.message || "").toLowerCase();
    // 23505: Aynı kaynak için zaten açık bildirim mevcut — kullanıcı için başarı sayılır
    // 42P01 / schema cache: Migration 14 henüz çalıştırılmadıysa sessizce degrade ol
    if (code === "23505") {
      // already reported, continue cleanly
    } else if (
      code === "42P01" ||
      msg.includes("resource_reports") ||
      msg.includes("schema cache")
    ) {
      degraded = true;
    } else {
      return {
        error: "Bildirim kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.",
      };
    }
  }

  let skipped = false;
  if (skipAfterReport) {
    const { error: skipError } = await supabase
      .from("tasks")
      .update({ status: "skipped" })
      .eq("id", taskRow.id)
      .eq("user_id", user.id);

    if (!skipError) {
      skipped = true;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { success: true, skipped, degraded };
}
