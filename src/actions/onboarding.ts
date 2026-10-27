"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getOnboardingCatalog() {
  const supabase = await createClient();

  const [universitiesRes, careerPathsRes, skillsRes] = await Promise.all([
    supabase.from("universities").select("id, name, city").eq("is_active", true).order("sort_order"),
    supabase.from("career_paths").select("id, slug, name_tr, description_tr, icon").eq("is_active", true).order("sort_order"),
    supabase.from("skills").select("id, slug, category, name_tr, icon, sort_order").eq("is_active", true).order("sort_order"),
  ]);

  return {
    universities: universitiesRes.data || [],
    careerPaths: careerPathsRes.data || [],
    skills: skillsRes.data || [],
  };
}

export async function getExistingDraftAssessment() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if user has an active draft assessment
  const { data: draft } = await supabase
    .from("assessments")
    .select(`
      *,
      ratings:assessment_skill_ratings(skill_id, level)
    `)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .maybeSingle();

  return draft;
}

export async function saveOnboardingAssessment(payload: {
  step: number;
  classYear?: number;
  careerPathId?: string;
  secondaryCareerPathId?: string;
  universityId?: string;
  universityOther?: string;
  hasInternship?: boolean;
  ratings?: Record<string, number>; // skill_id -> level (1-5)
  weeklyHours?: number;
  learningStyle?: "video" | "reading" | "hands_on" | "mixed";
  targetDate?: string;
  goalsNote?: string;
  isFinal?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
  if (payload.secondaryCareerPathId !== undefined) updateData.secondary_career_path_id = payload.secondaryCareerPathId;
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

  // 4. If this was the final submission, trigger mock roadmap generation via admin client
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

// Generates the initial roadmap with 4 weeks of structured tasks
async function generateInitialRoadmap(userId: string, assessmentId: string, careerPathId: string) {
  const adminClient = createAdminClient();

  // Deactivate any existing active roadmaps
  await adminClient
    .from("roadmaps")
    .update({ is_active: false })
    .eq("user_id", userId);

  // Create new roadmap
  const { data: roadmap, error: roadmapError } = await adminClient
    .from("roadmaps")
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      career_path_id: careerPathId,
      title: "Hedef Odaklı Kişisel Kariyer Yol Haritası",
      summary: "Beceri check-up sonuçlarına göre eksiklerini kapatman ve sektöre hazır hale gelmen için oluşturulan 4 haftalık gelişim planı.",
      source: "mock",
    })
    .select("id")
    .single();

  if (roadmapError || !roadmap) return;

  // 1. Fetch student's skill gaps to customize tasks
  const { data: gaps } = await adminClient
    .from("v_skill_gap")
    .select("skill_id, skill_slug, name_tr, gap, required_level, student_level")
    .eq("user_id", userId)
    .order("gap", { ascending: false });

  // 2. Fetch active published learning resources with their skill associations
  const { data: catalogResources } = await adminClient
    .from("learning_resources")
    .select(`
      id,
      title,
      description,
      url,
      resource_type,
      estimated_hours,
      difficulty,
      resource_skills (
        skill_id,
        min_level,
        target_level
      )
    `)
    .eq("status", "published")
    .order("sort_order");

  const tasksToInsert = [];
  const usedResourceIds = new Set<string>();

  // Match resources against student's largest gaps first
  const activeGaps = (gaps || []).filter((g) => g.gap > 0);

  if (catalogResources && catalogResources.length > 0) {
    for (const gap of activeGaps) {
      if (tasksToInsert.length >= 6) break;

      // Find matching resource for this skill
      const match = catalogResources.find((r) => {
        if (usedResourceIds.has(r.id)) return false;
        const links = (r.resource_skills as unknown as { skill_id: string; min_level: number; target_level: number }[]) || [];
        return links.some((l) => l.skill_id === gap.skill_id);
      });

      if (match) {
        usedResourceIds.add(match.id);
        const week = Math.min(4, Math.floor(tasksToInsert.length / 2) + 1);
        const hours = Number(match.estimated_hours) || 4.0;
        const xp = Math.min(100, Math.round(hours * 7 + match.difficulty * 5));

        tasksToInsert.push({
          roadmap_id: roadmap.id,
          user_id: userId,
          skill_id: gap.skill_id,
          resource_id: match.id,
          title: match.title,
          description: match.description || `${gap.name_tr} yetkinliğini geliştirmek için önerilen içerik.`,
          resource_url: match.url,
          resource_type: match.resource_type,
          estimated_hours: hours,
          difficulty: match.difficulty,
          xp_reward: xp,
          week_number: week,
          sort_order: tasksToInsert.length + 1,
          status: "pending" as const,
        });
      }
    }

    // If student has fewer than 4 tasks from gaps, fill with general published resources
    if (tasksToInsert.length < 4) {
      for (const r of catalogResources) {
        if (tasksToInsert.length >= 4) break;
        if (!usedResourceIds.has(r.id)) {
          usedResourceIds.add(r.id);
          const week = Math.min(4, Math.floor(tasksToInsert.length / 2) + 1);
          const hours = Number(r.estimated_hours) || 3.0;

          tasksToInsert.push({
            roadmap_id: roadmap.id,
            user_id: userId,
            resource_id: r.id,
            title: r.title,
            description: r.description || "Temel bilişim ve analitik yetkinlikleri pekiştirme modülü.",
            resource_url: r.url,
            resource_type: r.resource_type,
            estimated_hours: hours,
            difficulty: r.difficulty,
            xp_reward: Math.round(hours * 7 + r.difficulty * 5),
            week_number: week,
            sort_order: tasksToInsert.length + 1,
            status: "pending" as const,
          });
        }
      }
    }
  }

  // Safe fallback if catalog is currently empty
  if (tasksToInsert.length === 0) {
    tasksToInsert.push({
      roadmap_id: roadmap.id,
      user_id: userId,
      title: "SQL Window Functions ve CTE Egzersizleri",
      description: "SQLBolt modüllerinde ROW_NUMBER(), RANK() ve WITH sorguları ile pratik yap.",
      resource_url: "https://sqlbolt.com/",
      resource_type: "practice" as const,
      estimated_hours: 4.5,
      difficulty: 2,
      xp_reward: 35,
      week_number: 1,
      sort_order: 1,
      status: "pending" as const,
    });
  }

  await adminClient.from("tasks").insert(tasksToInsert);
}
