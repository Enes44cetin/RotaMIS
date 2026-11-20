"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  studentSettingsSchema,
  type StudentSettingsInput,
} from "@/lib/validation/student-schemas";

export async function updateStudentSettings(
  rawInput: StudentSettingsInput
): Promise<{ ok: boolean; error?: string }> {
  const parsed = studentSettingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ||
        "Lütfen profil ve çalışma bilgilerini eksiksiz doldurun.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Oturum açmanız gerekiyor." };
  }

  const { fullName, universityId, universityOther, weeklyHours, learningStyle } =
    parsed.data;

  const isOtherUni = universityId === "other";

  // 1. Profil bilgilerini kullanıcının RLS yetkisiyle güncelle (sütun bazlı yetkiye tam uyumlu)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      university_id: isOtherUni ? null : universityId,
      university_other: isOtherUni ? (universityOther?.trim() || null) : null,
    })
    .eq("id", user.id);

  if (profileError) {
    return {
      ok: false,
      error: "Profil bilgileri güncellenemedi: " + profileError.message,
    };
  }

  // 2. Çalışma temposu ve öğrenme stilini patikayı sıfırlamadan güncelle (Migration 14 RPC + güvenli fallback)
  const { error: rpcError } = await supabase.rpc(
    "update_student_learning_preferences",
    {
      p_weekly_hours: weeklyHours,
      p_learning_style: learningStyle,
    }
  );

  if (rpcError) {
    const adminClient = createAdminClient();
    const { data: latestAssessment } = await adminClient
      .from("assessments")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestAssessment?.id) {
      const { error: fallbackError } = await adminClient
        .from("assessments")
        .update({
          weekly_hours: weeklyHours,
          learning_style: learningStyle,
        })
        .eq("id", latestAssessment.id)
        .eq("user_id", user.id);

      if (fallbackError) {
        return {
          ok: false,
          error:
            "Çalışma tercihleri güncellenirken bir hata oluştu: " +
            fallbackError.message,
        };
      }
    }
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
