"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  toggleTaskStatusSchema,
  markTaskInProgressSchema,
} from "@/lib/validation/student-schemas";
import type { TaskStatus } from "@/types/database";

export async function toggleTaskStatus(taskId: string, currentStatus: TaskStatus) {
  const parsed = toggleTaskStatusSchema.safeParse({ taskId, currentStatus });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Geçersiz görev parametresi." };
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
    return { error: parsed.error.issues[0]?.message || "Geçersiz görev parametresi." };
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
