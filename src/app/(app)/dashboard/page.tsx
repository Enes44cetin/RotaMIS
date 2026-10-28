import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/actions/auth";
import { SkillRadar } from "@/components/charts/skill-radar";
import { ReadinessCards } from "@/components/dashboard/readiness-cards";
import { TaskChecklist } from "@/components/dashboard/task-checklist";
import type {
  SkillGapRow,
  CategoryScoreRow,
  TaskRow,
  UserBadgeWithDetails,
} from "@/types/database";
import {
  Compass,
  Award,
  Flame,
  LogOut,
  RefreshCw,
  GraduationCap,
  Briefcase,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch profile and dashboard datasets in parallel (Zero Waterfall)
  const [
    { data: profile },
    { data: rawSkillGaps },
    { data: rawCategoryScores },
    { data: activeRoadmap },
    { data: rawUserBadges },
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
        tasks(*)
      `
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("user_badges")
      .select(
        `
        earned_at,
        badge:badges(id, name_tr, description_tr, icon)
      `
      )
      .eq("user_id", user.id),
  ]);

  // If user hasn't done onboarding yet, redirect them to onboarding wizard
  if (!profile || !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  const skillGaps = (rawSkillGaps as unknown as SkillGapRow[]) || [];
  const categoryScores = (rawCategoryScores as unknown as CategoryScoreRow[]) || [];
  const userBadges = (rawUserBadges as unknown as UserBadgeWithDetails[]) || [];

  const rawTasks = (activeRoadmap?.tasks as unknown as TaskRow[]) || [];
  const tasks = [...rawTasks].sort(
    (a, b) =>
      (a.week_number || 0) - (b.week_number || 0) || a.sort_order - b.sort_order
  );

  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const overallReadiness = categoryScores.length
    ? Math.round(
        categoryScores.reduce((acc, c) => acc + (c.readiness_pct || 0), 0) /
          categoryScores.length
      )
    : 0;

  // Calculate user level (Level 1 at 0 XP, Level 2 at 100 XP, Level 3 at 250 XP...)
  const userLevel = Math.floor(Math.sqrt((profile.total_xp || 0) / 40)) + 1;

  const universityRel = profile.university as unknown as { name: string } | null;
  const targetCareerRel = profile.target_career as unknown as {
    name_tr: string;
    icon: string | null;
  } | null;

  const universityName =
    universityRel?.name || profile.university_other || "Belirtilmemiş";
  const careerName = targetCareerRel?.name_tr || "Kariyer Alanı Seçilmedi";

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#0B1F4D] to-[#2F5BFF] flex items-center justify-center text-white shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-[#0B1F4D] tracking-tight leading-none">
                Rota<span className="text-[#2F5BFF]">MIS</span>
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 text-xs text-slate-500 font-medium truncate">
              <Briefcase className="w-3.5 h-3.5 text-[#2F5BFF] shrink-0" />
              <span className="font-bold text-slate-800 truncate">{careerName}</span>
            </div>
          </div>

          {/* Gamification Stats & User Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Daily Streak */}
            <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>
                {profile.current_streak || 0}
                <span className="hidden xs:inline sm:inline"> Gün Seri</span>
              </span>
            </div>

            {/* Total XP & Level */}
            <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-bold">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2F5BFF] shrink-0" />
              <span>{profile.total_xp || 0} XP</span>
              <span className="bg-[#2F5BFF] text-white text-[10px] px-1.5 py-0.5 rounded-md ml-0.5">
                Lvl {userLevel}
              </span>
            </div>

            {/* Logout button */}
            <form action={signOutAction}>
              <button
                type="submit"
                title="Çıkış Yap"
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Welcome Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0B1F4D] via-[#0F2D6B] to-[#1E40AF] text-white shadow-xl shadow-blue-950/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
              <GraduationCap className="w-3.5 h-3.5 text-blue-300" />
              <span>{universityName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hoş Geldin, {profile.full_name || "Öğrenci"} 🚀
            </h1>
            <p className="mt-2 text-sm text-blue-100/80 max-w-xl">
              Hedefin olan{" "}
              <strong className="text-white font-bold">{careerName}</strong> pozisyonu
              için hazırlık seviyen %{overallReadiness}. Eksiklerini kapatmak için
              haftalık görevlerini tamamlamaya başla.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 self-stretch md:self-auto justify-end">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-white/20 backdrop-blur-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yeniden Check-Up Yap</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Hazırlık Oranı
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[#2F5BFF]">
              %{overallReadiness}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Sektör beklentisine göre</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tamamlanan Görev
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
              {completedTasksCount}{" "}
              <span className="text-sm font-semibold text-slate-400">/ {tasks.length}</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 font-medium">
              Haftalık plan aktif
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Toplam XP Puanı
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600">
              {profile.total_xp || 0}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Seviye {userLevel} Kariyer Avcısı
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kazanılan Rozetler
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-indigo-600">
              {userBadges.length}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Kariyer başarıları</div>
          </div>
        </div>

        {/* Middle Row: Radar Chart (60%) + Readiness Bars (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Radar Chart Card */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#0B1F4D]">
                  Sektör Beceri Karşılaştırması (Radar Analizi)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mavi alan senin seviyen, turuncu kesikli çizgiler sektörün hedefidir.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                1-5 Ölçeği
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <SkillRadar data={skillGaps} />
            </div>
          </div>

          {/* Readiness & Top Gaps (40%) */}
          <div className="lg:col-span-5">
            <ReadinessCards categoryScores={categoryScores} topGaps={skillGaps} />
          </div>
        </div>

        {/* Bottom Row: AI Roadmap Tasks & Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* AI Roadmap Task Checklist */}
          <div className="lg:col-span-8">
            <TaskChecklist tasks={tasks} />
          </div>

          {/* Badges Earned Container */}
          <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-[#0B1F4D]">Kazanılan Rozetler</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Check-up doldurarak ve görevleri bitirerek rozet koleksiyonunu genişlet.
            </p>

            {userBadges.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                Henüz kazanılmış rozetin yok. Görevleri tamamlamaya devam et!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {userBadges.map((ub, idx) => (
                  <div
                    key={ub.badge?.id || idx}
                    className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col items-center text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg mb-2">
                      🏆
                    </div>
                    <div className="font-bold text-xs text-slate-800 line-clamp-1">
                      {ub.badge?.name_tr}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                      {ub.badge?.description_tr}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
