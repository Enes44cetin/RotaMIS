"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Sparkles,
  Award,
  Trophy,
  Target,
  Rocket,
  X,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  calculateLevelStats,
  getReadinessMilestone,
} from "@/lib/gamification";
import type { SkillGapRow } from "@/types/database";

interface CheckupResultModalProps {
  open: boolean;
  careerName: string;
  overallReadiness: number;
  totalXp: number;
  skillGaps: SkillGapRow[];
  onClose: () => void;
  onStartFirstTask: () => void;
}

const MILESTONE_TONE_CLASSES: Record<
  "slate" | "blue" | "emerald" | "amber",
  string
> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  blue: "bg-blue-50 text-[#2F5BFF] border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function CheckupResultModal({
  open,
  careerName,
  overallReadiness,
  totalXp,
  skillGaps,
  onClose,
  onStartFirstTask,
}: CheckupResultModalProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const clamped = Math.min(100, Math.max(0, Math.round(overallReadiness || 0)));
  const levelStats = calculateLevelStats(totalXp);
  const milestone = getReadinessMilestone(clamped);

  const topGaps = [...skillGaps]
    .filter((g) => g.gap > 0)
    .sort(
      (a, b) =>
        b.gap - a.gap ||
        b.importance - a.importance ||
        (b.demand_pct ?? 0) - (a.demand_pct ?? 0)
    )
    .slice(0, 3);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkup-result-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          />

          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 40, scale: 0.96 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 32, scale: 0.96 }
            }
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative z-10 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
          >
            {/* Celebration Header */}
            <div className="relative shrink-0 p-5 sm:p-6 bg-gradient-to-br from-[#0B1F4D] via-[#13327A] to-[#2F5BFF] text-white overflow-hidden">
              <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />

              <button
                type="button"
                onClick={onClose}
                aria-label="Sonuç ekranını kapat"
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 transition-colors cursor-pointer z-20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-bold text-blue-50">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Check-Up Tamamlandı</span>
                </div>

                <h2
                  id="checkup-result-title"
                  className="text-xl sm:text-2xl font-black tracking-tight leading-snug pr-8"
                >
                  Kariyer Haritan Hazır! 🎉
                </h2>

                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                  <strong>{careerName}</strong> sektör beklentilerine göre mevcut
                  konumunu analiz ettik ve ilk sprintini oluşturduk.
                </p>

                {/* Reward Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-100 text-xs font-extrabold">
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>+50 XP Kazanıldı</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-extrabold">
                    <Trophy className="w-3.5 h-3.5 text-blue-200" />
                    <span>
                      Seviye {levelStats.level} • {levelStats.title}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-xs font-extrabold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>🏅 Yola Çıktın Rozeti</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto min-h-0 flex-1">
              {/* Readiness Score Summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4 sm:gap-5">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg
                    className="w-24 h-24 -rotate-90"
                    viewBox="0 0 92 92"
                    aria-hidden="true"
                  >
                    <circle
                      cx="46"
                      cy="46"
                      r={radius}
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="46"
                      cy="46"
                      r={radius}
                      fill="none"
                      stroke="#2F5BFF"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={
                        prefersReducedMotion
                          ? { strokeDashoffset }
                          : { strokeDashoffset: circumference }
                      }
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-[#0B1F4D] tabular-nums">
                      %{clamped}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Hazır
                    </span>
                  </div>
                </div>

                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Sektör Hazırlık Skoru
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        MILESTONE_TONE_CLASSES[milestone.tone]
                      }`}
                    >
                      {milestone.label}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-[#0B1F4D] leading-snug">
                    {careerName} rolü beklentilerinin %{clamped}&apos;ini şu an
                    karşılıyorsun.
                  </p>

                  {milestone.nextLabel && (
                    <p className="text-[11px] text-slate-500">
                      <strong>{milestone.nextLabel}</strong> eşiğine{" "}
                      <strong className="text-[#2F5BFF]">
                        {milestone.pointsToNext} puan
                      </strong>{" "}
                      kaldı.
                    </p>
                  )}
                </div>
              </div>

              {/* Top 3 Skill Gaps */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <Target className="w-3.5 h-3.5 text-[#2F5BFF]" />
                  <span>Öncelikli Odaklanacağın En Büyük Açıklar</span>
                </div>

                {topGaps.length > 0 ? (
                  <div className="space-y-2">
                    {topGaps.map((g, idx) => (
                      <div
                        key={g.skill_id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-200/80 text-[#2F5BFF] text-xs font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-extrabold text-[#0B1F4D] truncate">
                              {g.name_tr}
                            </div>
                            {g.display_badge && (
                              <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                                {g.display_badge}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold tabular-nums">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                            {g.current_level}/5
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-[#2F5BFF] font-black">
                            {g.required_level}/5
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 font-medium leading-relaxed">
                    Harika! Tüm çekirdek eksenlerde sektör hedefine ulaşmış
                    görünüyorsun. İleri seviye pekiştirme görevlerin Sprint
                    1&apos;de seni bekliyor.
                  </div>
                )}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="p-5 sm:p-6 pt-3 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={onStartFirstTask}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#2F5BFF] to-indigo-600 hover:brightness-105 text-white font-black text-sm shadow-[0_5px_0_#1736B5] active:translate-y-0.5 active:shadow-[0_2px_0_#1736B5] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Rocket className="w-5 h-5" />
                <span>Sprint 1 Hazır — İlk Göreve Başla →</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
