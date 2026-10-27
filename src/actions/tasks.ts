"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleTaskStatus(taskId: string, currentStatus: "pending" | "completed") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor." };
  }

  const nextStatus = currentStatus === "completed" ? "pending" : "completed";

  const { error } = await supabase
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Görev güncellenirken bir hata oluştu: " + error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, nextStatus };
}
