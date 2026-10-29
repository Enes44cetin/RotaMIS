"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Radar, Award, X, ChevronRight, Flame } from "lucide-react";
import { ProfileGreeting } from "./profile-greeting";
import { LevelProgress } from "./level-progress";
import { ReadinessRing } from "./readiness-ring";
import { ProfileRadar } from "./profile-radar";
import { BadgeShelf } from "./badge-shelf";
import { useDashboard } from "../dashboard-shell";
import { calculateLevelStats } from "@/lib/gamification";
import type {
  BadgeCatalogItem,
  CategoryScoreRow,
  SkillGapRow,
  UserBadgeWithDetails,
} from "@/types/database";

interface ProfileCardProps {
  fullName: string | null;
  universityName: string;
  careerName: string;
  currentStreak: number;
  longestStreak: number;
  overallReadiness: number;
  categoryScores: CategoryScoreRow[];
  skillGaps: SkillGapRow[];
  allBadges: BadgeCatalogItem[];
  userBadges: UserBadgeWithDetails[];
}

export function ProfileCard({
  fullName,
  universityName,
  careerName,
  currentStreak,
  longestStreak,
  overallReadiness,
  categoryScores,
  skillGaps,
  allBadges,
  userBadges,
}: ProfileCardProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { totalXp } = useDashboard();
  const prefersReducedMotion = useReducedMotion();
  const stats = calculateLevelStats(totalXp);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileDrawerOpen]);

  return (
    <>
      {/* MOBILE COMPACT STRIP (< lg) */}
      <div className="lg:hidden bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[#2F5BFF] truncate">
              {careerName}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base font-extrabold text-[#0B1F4D] truncate">
                {fullName || "Öğrenci"}
              </span>
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/90 text-[11px] font-extrabold text-[#0B1F4D]">
                Lvl {stats.level}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {currentStreak}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2F5BFF] text-xs font-extrabold tabular-nums">
              %{overallReadiness} Hazır
            </span>
          </div>
        </div>

        {/* Compact XP bar */}
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2F5BFF] to-indigo-500 transition-all duration-500"
              style={{ width: `${stats.progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span>{stats.title}</span>
            <span>Sonraki seviyeye {stats.xpNeededForNext} XP</span>
          </div>
        </div>

        {/* Trigger button for Radar & Badges Drawer */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between text-xs font-bold text-[#0B1F4D] transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <Radar className="w-4 h-4 text-[#2F5BFF]" />
            <span>Beceri Radarı & Rozetlerini Gör</span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
              <Award className="w-3 h-3 text-amber-500" />
              {userBadges.length}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* MOBILE BOTTOM SHEET DRAWER */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden flex items-end justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Profil Analizi ve Rozetler"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            />
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { y: "100%" }}
              animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="relative z-10 w-full max-h-[86dvh] overflow-y-auto rounded-t-3xl bg-[#F7F9FC] p-5 space-y-4 shadow-2xl border-t border-slate-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <h2 className="text-sm font-extrabold text-[#0B1F4D]">
                  Profil Analizi & Rozetler
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Kapat"
                  className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ReadinessRing
                overallReadiness={overallReadiness}
                categoryScores={categoryScores}
              />
              <ProfileRadar skillGaps={skillGaps} />
              <BadgeShelf allBadges={allBadges} userBadges={userBadges} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DESKTOP STICKY LEFT COLUMN (>= lg) */}
      <aside
        aria-label="Öğrenci Profil Kartı"
        className="hidden lg:block lg:space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1"
      >
        <ProfileGreeting
          fullName={fullName}
          universityName={universityName}
          careerName={careerName}
        />

        <LevelProgress
          currentStreak={currentStreak}
          longestStreak={longestStreak}
        />

        <ReadinessRing
          overallReadiness={overallReadiness}
          categoryScores={categoryScores}
        />

        <ProfileRadar skillGaps={skillGaps} />

        <BadgeShelf allBadges={allBadges} userBadges={userBadges} />
      </aside>
    </>
  );
}

