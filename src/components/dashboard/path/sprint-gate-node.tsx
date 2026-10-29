"use client";

import { motion, useReducedMotion } from "motion/react";
import { Lock, Rocket, Check, Loader2, Sparkles, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "../dashboard-shell";

interface SprintGateNodeProps {
  sprintNumber: number;
  xPct: number;
  yPx: number;
  completedCount: number;
  totalCount: number;
  isSealed: boolean;
  isTailSprint: boolean;
}

export function SprintGateNode({
  sprintNumber,
  xPct,
  yPx,
  completedCount,
  totalCount,
  isSealed,
  isTailSprint,
}: SprintGateNodeProps) {
  const { advanceToNextSprint, isAdvancingSprint } = useDashboard();
  const prefersReducedMotion = useReducedMotion();

  const remainingCount = Math.max(0, totalCount - completedCount);
  const allDone = totalCount > 0 && remainingCount === 0;
  const pct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  // Eğer bu sprint geçmişte tamamlandıysa ve altında zaten sonraki sprint açılmışsa:
  if (isSealed && !isTailSprint) {
    return (
      <div
        style={{ left: `${xPct}%`, top: `${yPx}px` }}
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 text-white border-4 border-emerald-200 shadow-[0_6px_0_#047857] flex items-center justify-center">
          <Check className="w-9 h-9 stroke-[3]" />
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 text-center">
          <div className="px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black shadow-2xs">
            Sprint {sprintNumber} Tamamlandı ✓
          </div>
        </div>
      </div>
    );
  }

  function handleClick() {
    if (!allDone) {
      toast.info(
        `Sıradaki sprinte geçmek için bu sprintteki kalan ${remainingCount} görevi tamamla! 💪`,
        { id: `gate-locked-${sprintNumber}` }
      );
      return;
    }
    if (isAdvancingSprint) return;
    void advanceToNextSprint();
  }

  return (
    <div
      style={{ left: `${xPct}%`, top: `${yPx}px` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
    >
      {/* Floating Callout when Ready to Advance */}
      {allDone && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 z-20 pointer-events-none">
          <motion.div
            animate={prefersReducedMotion ? undefined : { y: [-4, 4, -4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="px-3.5 py-1 rounded-full bg-gradient-to-r from-[#2F5BFF] to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Sprint {sprintNumber + 1} Hazır!</span>
          </motion.div>
        </div>
      )}

      <div className="relative flex items-center justify-center">
        {/* Progress Ring when Locked */}
        {!allDone && (
          <svg
            className="absolute w-28 h-28 -rotate-90 pointer-events-none"
            viewBox="0 0 112 112"
            aria-hidden="true"
          >
            <circle
              cx="56"
              cy="56"
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="6"
            />
            <circle
              cx="56"
              cy="56"
              r={radius}
              fill="none"
              stroke="#2F5BFF"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
        )}

        {/* Pulsing Halo when Unlocked */}
        {allDone && !prefersReducedMotion && (
          <motion.span
            animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0.06, 0.5] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
            className="absolute -inset-3.5 rounded-full bg-[#2F5BFF]/30 pointer-events-none"
          />
        )}

        <motion.button
          type="button"
          disabled={isAdvancingSprint}
          onClick={handleClick}
          aria-label={
            allDone
              ? `Sıradaki Sprinte Geç: Sprint ${sprintNumber + 1} başlat`
              : `Sıradaki Sprint Kilidi: Açmak için ${remainingCount} görev kaldı`
          }
          animate={
            allDone && !prefersReducedMotion && !isAdvancingSprint
              ? { scale: [1, 1.04, 1] }
              : undefined
          }
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`relative w-22 h-22 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F5BFF]/40 active:translate-y-1 disabled:opacity-70 ${
            allDone
              ? "bg-gradient-to-br from-[#2F5BFF] via-blue-600 to-indigo-700 text-white border-4 border-blue-200 shadow-[0_7px_0_#1E3A8A] hover:brightness-105"
              : "bg-slate-100 text-slate-400 border-4 border-slate-300 shadow-[0_7px_0_#CBD5E1] hover:bg-slate-200/70"
          }`}
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-4 top-2 h-3 rounded-full bg-white/25 pointer-events-none"
          />

          {isAdvancingSprint ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : allDone ? (
            <Rocket className="w-9 h-9 drop-shadow-xs" />
          ) : (
            <div className="relative flex items-center justify-center">
              <ArrowDown className="w-8 h-8 text-slate-400/80" />
              <span className="absolute -bottom-1 -right-2 w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-xs">
                <Lock className="w-3 h-3" />
              </span>
            </div>
          )}
        </motion.button>
      </div>

      {/* Gate Title Card */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3.5 w-52 sm:w-60 text-center">
        <div
          className={`px-3.5 py-2 rounded-2xl border shadow-xs ${
            allDone
              ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 text-[#0B1F4D]"
              : "bg-white border-slate-200/90 text-slate-600"
          }`}
        >
          <div className="text-xs sm:text-sm font-black tracking-tight text-[#0B1F4D]">
            {isAdvancingSprint
              ? `Sprint ${sprintNumber + 1} Hazırlanıyor...`
              : allDone
              ? "Sıradaki Sprinte Geç →"
              : `Sprint ${sprintNumber + 1} Kapısı`}
          </div>
          <div className="text-[11px] font-semibold mt-0.5 text-slate-500">
            {allDone
              ? "Tıkla ve patikanı aşağı doğru uzat!"
              : `Kilidi açmak için ${remainingCount} görev kaldı`}
          </div>
        </div>
      </div>
    </div>
  );
}

