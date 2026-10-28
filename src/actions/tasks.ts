"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { toggleTaskStatusSchema } from "@/lib/validation/student-schemas";
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

  const nextStatus = parsed.data.currentStatus === "completed" ? "pending" : "completed";

  const { error } = await supabase
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", parsed.data.taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Görev güncellenirken bir hata oluştu: " + error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, nextStatus };
}
