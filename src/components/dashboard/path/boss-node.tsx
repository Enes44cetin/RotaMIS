"use client";

import { motion, useReducedMotion } from "motion/react";
import { Lock, Swords, Trophy, Sparkles, Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "../dashboard-shell";

interface BossNodeProps {
  sprintId: string;
  sprintNumber: number;
  xPct: number;
  yPx: number;
  completedCount: number;
  totalCount: number;
  isSealed: boolean;
  miniCheckupCompleted: boolean;
  isTailSprint: boolean;
}

export function BossNode({
  sprintId,
  sprintNumber,
  xPct,
  yPx,
  completedCount,
  totalCount,
  isSealed,
  miniCheckupCompleted,
  isTailSprint,
}: BossNodeProps) {
  const { openMiniCheckup, advanceToNextSprint, isAdvancingSprint } =
    useDashboard();
  const prefersReducedMotion = useReducedMotion();

  const remainingCount = Math.max(0, totalCount - completedCount);
  const allTasksDone = totalCount > 0 && remainingCount === 0;
  const pct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  // Durum 1: Boss zaten geçilmiş ve sonraki döngü (Sprint 5, 9...) zaten açılmış
  if ((isSealed || miniCheckupCompleted) && !isTailSprint) {
    return (
      <div
        style={{ left: `${xPct}%`, top: `${yPx}px` }}
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white border-4 border-amber-200 shadow-[0_7px_0_#B45309] flex items-center justify-center">
          <Trophy className="w-10 h-10 drop-shadow-xs" />
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3.5 w-56 text-center">
          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-black shadow-2xs">
            Boss Geçildi • Mini Check-Up ✓
          </div>
        </div>
      </div>
    );
  }

  // Durum 2: Mini Check-Up tamamlanmış, ancak henüz yeni döngünün ilk sprinti (Sprint 5, 9...) başlatılmamış
  const readyForNextCycle = miniCheckupCompleted && isTailSprint;

  function handleClick() {
    if (readyForNextCycle) {
      if (!isAdvancingSprint) {
        void advanceToNextSprint();
      }
      return;
    }

    if (!allTasksDone) {
      toast.info(
        `Boss durağını açmak için bu sprintteki kalan ${remainingCount} görevi tamamla! 💪`,
        { id: "boss-locked-toast" }
      );
      return;
    }

    openMiniCheckup(sprintId);
  }

  const isInteractiveUnlocked = allTasksDone || readyForNextCycle;

  return (
    <div
      style={{
        left: `${xPct}%`,
        top: `${yPx}px`,
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
    >
      {/* Floating Crown Callout when Unlocked */}
      {isInteractiveUnlocked && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 z-20 pointer-events-none">
          <motion.div
            animate={prefersReducedMotion ? undefined : { y: [-4, 4, -4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className={`px-3.5 py-1 rounded-full text-white text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 whitespace-nowrap ${
              readyForNextCycle
                ? "bg-gradient-to-r from-[#2F5BFF] to-indigo-600 shadow-blue-500/30"
                : "bg-gradient-to-r from-amber-400 to-orange-500 shadow-amber-500/30"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {readyForNextCycle
                ? `Boss Yenildi! Sprint ${sprintNumber + 1} Hazır`
                : "Boss Açıldı! Mini Check-Up"}
            </span>
          </motion.div>
        </div>
      )}

      {/* Exact Geometric Center at (xPct, yPx) */}
      <div className="relative flex items-center justify-center">
        {/* Progress Ring when Locked */}
        {!isInteractiveUnlocked && (
          <svg
            className="absolute w-32 h-32 -rotate-90 pointer-events-none"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="6"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
        )}

        {/* Pulsing Aura when Unlocked */}
        {isInteractiveUnlocked && !prefersReducedMotion && (
          <motion.span
            animate={{ scale: [1, 1.24, 1], opacity: [0.55, 0.05, 0.55] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
            className={`absolute -inset-4 rounded-full pointer-events-none ${
              readyForNextCycle ? "bg-blue-400/35" : "bg-amber-400/35"
            }`}
          />
        )}

        <motion.button
          type="button"
          disabled={isAdvancingSprint}
          onClick={handleClick}
          aria-label={
            readyForNextCycle
              ? `Yeni Döngüyü Başlat: Sprint ${sprintNumber + 1}`
              : isInteractiveUnlocked
              ? "Mini Check-Up Boss Durağı Açık! Özdeğerlendirme için tıkla."
              : `Mini Check-Up: Kilitli Boss Durağı. Açmak için ${remainingCount} görev kaldı.`
          }
          animate={
            isInteractiveUnlocked && !prefersReducedMotion && !isAdvancingSprint
              ? {
                  scale: [1, 1.05, 1],
                  rotate: [0, -2.5, 2.5, -1.5, 1.5, 0],
                }
              : undefined
          }
          transition={{
            duration: 2.2,
            repeat: Infinity,
            repeatDelay: 0.8,
            ease: "easeInOut",
          }}
          className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/50 active:translate-y-1 ${
            readyForNextCycle
              ? "bg-gradient-to-br from-[#2F5BFF] via-blue-600 to-indigo-700 text-white border-4 border-blue-200 shadow-[0_8px_0_#1E3A8A] hover:brightness-105"
              : isInteractiveUnlocked
              ? "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white border-4 border-amber-200 shadow-[0_8px_0_#B45309] hover:brightness-105"
              : "bg-slate-100 text-slate-400 border-4 border-slate-300 shadow-[0_8px_0_#CBD5E1] hover:bg-slate-200/70"
          }`}
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-5 top-2 h-3.5 rounded-full bg-white/25 pointer-events-none"
          />

          {isAdvancingSprint ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : readyForNextCycle ? (
            <Rocket className="w-10 h-10 sm:w-11 sm:h-11 drop-shadow-xs" />
          ) : isInteractiveUnlocked ? (
            <Trophy className="w-10 h-10 sm:w-11 sm:h-11 drop-shadow-xs" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Swords className="w-9 h-9 text-slate-400/80" />
              <span className="absolute -bottom-1 -right-2 w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-xs">
                <Lock className="w-3 h-3" />
              </span>
            </div>
          )}
        </motion.button>
      </div>

      {/* Boss Title Card - Anchored below Boss circle */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-56 sm:w-64 text-center">
        <div
          className={`px-3.5 py-2 rounded-2xl border shadow-xs ${
            readyForNextCycle
              ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 text-[#0B1F4D]"
              : isInteractiveUnlocked
              ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950"
              : "bg-white border-slate-200/90 text-slate-600"
          }`}
        >
          <div className="text-xs sm:text-sm font-black tracking-tight text-[#0B1F4D]">
            {readyForNextCycle
              ? `Yeni Döngüyü Başlat (Sprint ${sprintNumber + 1}) →`
              : "Gelişimini Ölç (Mini Check-Up)"}
          </div>
          <div className="text-[11px] font-semibold mt-0.5 text-slate-500">
            {readyForNextCycle
              ? "Güncellenen becerilerine göre yeni sprintini aç!"
              : isInteractiveUnlocked
              ? "30 saniyelik hızlı özdeğerlendirme ile +50 XP kazan →"
              : `Boss kilidini açmak için ${remainingCount} görev kaldı`}
          </div>
        </div>
      </div>
    </div>
  );
}
