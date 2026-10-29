import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { ProfileCard } from "@/components/dashboard/profile/profile-card";
import { CareerPath } from "@/components/dashboard/path/career-path";
import type {
  BadgeCatalogItem,
  CategoryScoreRow,
  SkillGapRow,
  SprintRow,
  TaskRow,
  UserBadgeWithDetails,
} from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Tüm Dashboard veri setlerini paralel çek (Zero Waterfall)
  const [
    { data: profile },
    { data: rawSkillGaps },
    { data: rawCategoryScores },
    { data: activeRoadmap },
    { data: rawSprints },
    { data: rawMiniAssessments },
    { data: rawUserBadges },
    { data: rawAllBadges },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        role,
        university_other,
        total_xp,
        current_streak,
        longest_streak,
        onboarding_completed,
        university:universities(name),
        target_career:career_paths!profiles_target_career_path_id_fkey(name_tr, icon)
      `
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("v_skill_gap")
      .select("*")
      .eq("user_id", user.id)
      .order("gap", { ascending: false }),
    supabase
      .from("v_category_scores")
      .select("*")
      .eq("user_id", user.id),
    supabase
      .from("roadmaps")
      .select(
        `
        id,
        title,
        summary,
        tasks(
          *,
          skill:skills(id, name_tr, category)
        )
      `
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("sprints")
      .select("*")
      .eq("user_id", user.id)
      .order("sprint_number", { ascending: true }),
    supabase
      .from("assessments")
      .select("sprint_id")
      .eq("user_id", user.id)
      .eq("kind", "mini")
      .eq("status", "completed"),
    supabase
      .from("user_badges")
      .select(
        `
        earned_at,
        badge:badges(id, name_tr, description_tr, icon)
      `
      )
      .eq("user_id", user.id),
    supabase
      .from("badges")
      .select(
        "id, slug, name_tr, description_tr, icon, criteria_type, criteria_value, xp_bonus, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (!profile) {
    redirect("/login");
  }

  if (!profile.onboarding_completed) {
    if (profile.role === "admin") {
      redirect("/admin");
    }
    redirect("/onboarding");
  }

  const skillGaps = (rawSkillGaps as unknown as SkillGapRow[]) || [];
  const categoryScores =
    (rawCategoryScores as unknown as CategoryScoreRow[]) || [];
  const userBadges =
    (rawUserBadges as unknown as UserBadgeWithDetails[]) || [];
  const allBadges = (rawAllBadges as unknown as BadgeCatalogItem[]) || [];

  const rawTasks = (activeRoadmap?.tasks as unknown as TaskRow[]) || [];
  const tasks = [...rawTasks].sort(
    (a, b) =>
      (a.week_number || 1) - (b.week_number || 1) || a.sort_order - b.sort_order
  );

  const roadmapId = activeRoadmap?.id;
  const sprints = ((rawSprints as unknown as SprintRow[]) || []).filter((s) =>
    roadmapId ? s.roadmap_id === roadmapId : true
  );

  const completedMiniSprintIds = ((rawMiniAssessments || []) as Array<{
    sprint_id: string | null;
  }>)
    .map((m) => m.sprint_id)
    .filter((id): id is string => Boolean(id));

  const overallReadiness = categoryScores.length
    ? Math.round(
        categoryScores.reduce((acc, c) => acc + (c.readiness_pct || 0), 0) /
          categoryScores.length
      )
    : 0;

  const universityRel = profile.university as unknown as { name: string } | null;
  const targetCareerRel = profile.target_career as unknown as {
    name_tr: string;
    icon: string | null;
  } | null;

  const universityName =
    universityRel?.name || profile.university_other || "Belirtilmemiş";
  const careerName = targetCareerRel?.name_tr || "Kariyer Alanı Seçilmedi";

  return (
    <DashboardShell
      initialSprints={sprints}
      initialCompletedMiniSprintIds={completedMiniSprintIds}
      initialTasks={tasks}
      initialTotalXp={profile.total_xp || 0}
    >
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col">
        <DashboardNavbar
          careerName={careerName}
          currentStreak={profile.current_streak || 0}
          isAdmin={profile.role === "admin"}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
          {/* İki Sütunlu (Split) Layout: Sol %35 Sticky Profil Kartı | Sağ %65 Kaydırılabilir Sonsuz Patika */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)] gap-6 lg:gap-8 items-start">
            <ProfileCard
              fullName={profile.full_name}
              universityName={universityName}
              careerName={careerName}
              currentStreak={profile.current_streak || 0}
              longestStreak={profile.longest_streak || 0}
              overallReadiness={overallReadiness}
              categoryScores={categoryScores}
              skillGaps={skillGaps}
              allBadges={allBadges}
              userBadges={userBadges}
            />

            <CareerPath
              roadmapTitle={activeRoadmap?.title}
              roadmapSummary={activeRoadmap?.summary}
              skillGaps={skillGaps}
            />
          </div>
        </main>
      </div>
    </DashboardShell>
  );
}
