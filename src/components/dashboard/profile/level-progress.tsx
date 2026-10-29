"use client";

import { motion, useReducedMotion } from "motion/react";
import { Flame, Sparkles, Trophy } from "lucide-react";
import { useDashboard } from "../dashboard-shell";
import { calculateLevelStats } from "@/lib/gamification";

interface LevelProgressProps {
  currentStreak: number;
  longestStreak: number;
}

export function LevelProgress({
  currentStreak,
  longestStreak,
}: LevelProgressProps) {
  const { totalXp, tasks } = useDashboard();
  const prefersReducedMotion = useReducedMotion();
  const stats = calculateLevelStats(totalXp);

  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-3">
      {/* Level & Animated XP Progress */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#2F5BFF]/10 border border-[#2F5BFF]/20 text-[#2F5BFF] flex items-center justify-center font-black text-sm shrink-0">
              {stats.level}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-[#0B1F4D] truncate">
                Seviye {stats.level} • {stats.title}
              </div>
              <div className="text-[11px] text-slate-500">
                Sonraki seviyeye{" "}
                <strong className="text-[#2F5BFF] font-bold tabular-nums">
                  {stats.xpNeededForNext} XP
                </strong>{" "}
                kaldı
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-800 text-xs font-black tabular-nums shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{stats.totalXp} XP</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/60">
          <motion.div
            initial={false}
            animate={{ width: `${stats.progressPct}%` }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 180, damping: 24 }
            }
            className="h-full rounded-full bg-gradient-to-r from-[#2F5BFF] to-indigo-500"
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-400 tabular-nums">
          <span>{stats.currentLevelMinXp} XP</span>
          <span>%{stats.progressPct} tamamlandı</span>
          <span>{stats.nextLevelMinXp} XP</span>
        </div>
      </div>

      {/* Mini Stats Row: Streak & Completed Tasks */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-amber-950 tabular-nums leading-tight">
              {currentStreak} Gün
            </div>
            <div className="text-[10px] font-semibold text-amber-700/80 truncate">
              Rekor: {longestStreak} gün
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-emerald-950 tabular-nums leading-tight">
              {completedTasks} / {tasks.length}
            </div>
            <div className="text-[10px] font-semibold text-emerald-700/80 truncate">
              Biten Görev
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

