"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  onboardingAssessmentSchema,
  type OnboardingAssessmentInput,
} from "@/lib/validation/student-schemas";
import { createNextSprintForUser } from "@/actions/journey";
import type { DraftAssessment } from "@/types/database";

export async function getOnboardingCatalog() {
  const supabase = await createClient();

  const [universitiesRes, careerPathsRes, skillsRes] = await Promise.all([
    supabase
      .from("universities")
      .select("id, name, city")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("career_paths")
      .select("id, slug, name_tr, description_tr, icon")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("skills")
      .select("id, slug, category, name_tr, icon, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return {
    universities: universitiesRes.data || [],
    careerPaths: careerPathsRes.data || [],
    skills: skillsRes.data || [],
  };
}

export async function getExistingDraftAssessment(
  providedUserId?: string
): Promise<DraftAssessment | null> {
  const supabase = await createClient();
  let userId = providedUserId;

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (!userId) return null;

  // Check if user has an active draft assessment
  const { data: draft } = await supabase
    .from("assessments")
    .select(
      `
      id,
      user_id,
      status,
      current_step,
      class_year,
      career_path_id,
      secondary_career_path_id,
      has_internship,
      weekly_hours,
      learning_style,
      target_date,
      goals_note,
      ratings:assessment_skill_ratings(skill_id, level)
    `
    )
    .eq("user_id", userId)
    .eq("status", "draft")
    .maybeSingle();

  return (draft as unknown as DraftAssessment) || null;
}

export async function saveOnboardingAssessment(rawPayload: OnboardingAssessmentInput) {
  const parsed = onboardingAssessmentSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Geçersiz değerlendirme verisi gönderildi.",
    };
  }

  const payload = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açmanız gerekiyor." };
  }

  // Update profile university if provided in Step 1
  if (payload.universityId || payload.universityOther) {
    await supabase
      .from("profiles")
      .update({
        university_id: payload.universityId || null,
        university_other: payload.universityOther || null,
      })
      .eq("id", user.id);
  }

  // 1. Get or create draft assessment
  let { data: assessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .maybeSingle();

  if (!assessment) {
    const { data: newAssessment, error: createError } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        status: "draft",
        current_step: payload.step,
      })
      .select("id")
      .single();

    if (createError || !newAssessment) {
      return { error: "Değerlendirme başlatılamadı: " + (createError?.message || "") };
    }
    assessment = newAssessment;
  }

  // 2. Upsert skill ratings FIRST while assessment is still draft (RLS requires draft status)
  if (payload.ratings && Object.keys(payload.ratings).length > 0) {
    const ratingsArray = Object.entries(payload.ratings).map(([skillId, level]) => ({
      assessment_id: assessment.id,
      skill_id: skillId,
      level: Number(level),
    }));

    const { error: ratingError } = await supabase
      .from("assessment_skill_ratings")
      .upsert(ratingsArray, { onConflict: "assessment_id,skill_id" });

    if (ratingError) {
      return { error: "Beceri puanları kaydedilirken hata: " + ratingError.message };
    }
  }

  // 3. Update assessment fields based on what's provided
  const updateData: Record<string, unknown> = {
    current_step: payload.step,
  };

  if (payload.classYear !== undefined) updateData.class_year = payload.classYear;
  if (payload.careerPathId !== undefined) updateData.career_path_id = payload.careerPathId;
  if (payload.secondaryCareerPathId !== undefined) {
    updateData.secondary_career_path_id = payload.secondaryCareerPathId;
  }
  if (payload.hasInternship !== undefined) updateData.has_internship = payload.hasInternship;
  if (payload.weeklyHours !== undefined) updateData.weekly_hours = payload.weeklyHours;
  if (payload.learningStyle !== undefined) updateData.learning_style = payload.learningStyle;
  if (payload.targetDate !== undefined) updateData.target_date = payload.targetDate || null;
  if (payload.goalsNote !== undefined) updateData.goals_note = payload.goalsNote;

  if (payload.isFinal) {
    updateData.status = "completed";
  }

  const { error: updateError } = await supabase
    .from("assessments")
    .update(updateData)
    .eq("id", assessment.id);

  if (updateError) {
    return { error: "Kayıt güncellenirken hata: " + updateError.message };
  }

  // 4. If this was the final submission, trigger initial roadmap generation via admin client
  if (payload.isFinal) {
    try {
      let finalCareerPathId = payload.careerPathId;
      if (!finalCareerPathId) {
        const { data: aRow } = await supabase
          .from("assessments")
          .select("career_path_id")
          .eq("id", assessment.id)
          .single();
        finalCareerPathId = aRow?.career_path_id;
      }
      if (finalCareerPathId) {
        await generateInitialRoadmap(user.id, assessment.id, finalCareerPathId);
      }
    } catch (e) {
      console.error("Roadmap generation error:", e);
    }
    revalidatePath("/dashboard");
    return { success: true, redirect: "/dashboard" };
  }

  return { success: true, assessmentId: assessment.id };
}

// Generates the permanent career journey roadmap and initializes Sprint 1
async function generateInitialRoadmap(
  userId: string,
  assessmentId: string,
  careerPathId: string
) {
  const adminClient = createAdminClient();

  // Deactivate any existing active roadmaps (only when initial onboarding or explicit career change finishes)
  await adminClient.from("roadmaps").update({ is_active: false }).eq("user_id", userId);

  // Create new permanent Journey roadmap
  const { data: roadmap, error: roadmapError } = await adminClient
    .from("roadmaps")
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      career_path_id: careerPathId,
      title: "Hedef Odaklı Kişisel Kariyer Yolculuğu",
      summary:
        "Beceri check-up sonuçlarına göre kendi hızında ilerleyebileceğin, eksiklerini kapattıkça yeni sprintlerle uzayan gelişim patikası.",
      source: "mock",
    })
    .select("id")
    .single();

  if (roadmapError || !roadmap) return;

  await createNextSprintForUser(userId, roadmap.id);
}
