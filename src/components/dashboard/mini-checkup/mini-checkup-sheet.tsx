"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  X,
  Trophy,
  Swords,
  Sparkles,
  TrendingUp,
  Rocket,
  Loader2,
  CheckCircle2,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { submitMiniCheckup } from "@/actions/journey";
import { useDashboard } from "../dashboard-shell";
import type {
  MiniCheckupSkillDelta,
  SkillGapRow,
  SprintUnit,
} from "@/types/database";

interface MiniCheckupSheetProps {
  sprint: SprintUnit | null;
  skillGaps: SkillGapRow[];
  onClose: () => void;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Başlangıç",
  2: "Temel",
  3: "Orta",
  4: "İyi",
  5: "Uzman",
};

interface CheckupSkillItem {
  skillId: string;
  nameTr: string;
  previousLevel: number;
  requiredLevel: number;
  taskCount: number;
}

export function MiniCheckupSheet({
  sprint,
  skillGaps,
  onClose,
}: MiniCheckupSheetProps) {
  const { advanceToNextSprint, isAdvancingSprint, grantClientXpBonus } =
    useDashboard();
  const prefersReducedMotion = useReducedMotion();
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Yalnızca bu son sprintte çalışılan becerileri derle (kullanıcı kararı: son sprint yeterli)
  const targetSkills = useMemo<CheckupSkillItem[]>(() => {
    if (!sprint) return [];

    const gapMap = new Map(skillGaps.map((g) => [g.skill_id, g]));
    const collected = new Map<string, CheckupSkillItem>();

    for (const task of sprint.tasks) {
      if (task.skill && task.skill.id) {
        const existing = collected.get(task.skill.id);
        const gapRow = gapMap.get(task.skill.id);
        if (existing) {
          existing.taskCount += 1;
        } else {
          collected.set(task.skill.id, {
            skillId: task.skill.id,
            nameTr: task.skill.name_tr,
            previousLevel: Math.max(1, gapRow?.current_level || 1),
            requiredLevel: gapRow?.required_level || 4,
            taskCount: 1,
          });
        }
      }
    }

    // Güvenli yedek: Eğer bu sprintteki görevlerde doğrudan beceri bağı yoksa odak becerileri kullan
    if (collected.size === 0) {
      for (const fs of sprint.focusSkills) {
        const gapRow = gapMap.get(fs.id);
        collected.set(fs.id, {
          skillId: fs.id,
          nameTr: fs.name_tr,
          previousLevel: Math.max(1, gapRow?.current_level || 1),
          requiredLevel: gapRow?.required_level || 4,
          taskCount: 1,
        });
      }
    }

    if (collected.size === 0) {
      for (const g of skillGaps.slice(0, 3)) {
        collected.set(g.skill_id, {
          skillId: g.skill_id,
          nameTr: g.name_tr,
          previousLevel: Math.max(1, g.current_level || 1),
          requiredLevel: g.required_level || 4,
          taskCount: 1,
        });
      }
    }

    return Array.from(collected.values()).slice(0, 6);
  }, [sprint, skillGaps]);

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [completedResult, setCompletedResult] = useState<{
    xpAwarded: number;
    deltas: MiniCheckupSkillDelta[];
  } | null>(null);

  useEffect(() => {
    if (!sprint) {
      setRatings({});
      setCompletedResult(null);
      return;
    }

    const initial: Record<string, number> = {};
    for (const item of targetSkills) {
      initial[item.skillId] = Math.min(5, Math.max(1, item.previousLevel));
    }
    setRatings(initial);
    setCompletedResult(null);
  }, [sprint, targetSkills]);

  useEffect(() => {
    if (!sprint) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting && !isAdvancingSprint) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sprint, isSubmitting, isAdvancingSprint, onClose]);

  function handleSubmit() {
    if (!sprint || targetSkills.length === 0) return;

    const payload = {
      sprintId: sprint.id,
      ratings: targetSkills.map((sk) => ({
        skillId: sk.skillId,
        level: ratings[sk.skillId] ?? sk.previousLevel,
      })),
    };

    startSubmitTransition(async () => {
      const res = await submitMiniCheckup(payload);
      if (!res.ok) {
        toast.error(res.error || "Mini Check-Up kaydedilemedi.");
        return;
      }

      const awarded = res.xpAwarded ?? 50;
      grantClientXpBonus(awarded);
      toast.success(`Boss geçildi! +${awarded} XP kazandın 🏆`);
      setCompletedResult({
        xpAwarded: awarded,
        deltas: res.deltas || [],
      });
    });
  }

  async function handleLaunchNextCycle() {
    const ok = await advanceToNextSprint();
    if (ok) {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {sprint && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mini-checkup-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isSubmitting && !isAdvancingSprint) onClose();
            }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 40, scale: 0.97 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 32, scale: 0.97 }
            }
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
          >
            {completedResult ? (
              /* ========== BOSS YENİLDİ! SONUÇ EKRANI ========== */
              <>
                <div className="p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white text-center relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Trophy className="w-9 h-9 text-amber-100" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider mb-2">
                    <Award className="w-3.5 h-3.5" />
                    <span>+{completedResult.xpAwarded} XP Boss Ödülü!</span>
                  </div>
                  <h3
                    id="mini-checkup-title"
                    className="text-xl sm:text-2xl font-black tracking-tight"
                  >
                    {sprint.cycleNumber}. Döngü Başarıyla Tamamlandı!
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-50/90 mt-1">
                    Beceri radarın ve hazırlık skorun yeni özdeğerlendirmene göre güncellendi.
                  </p>
                </div>

                <div className="p-5 sm:p-6 space-y-3 overflow-y-auto">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Güncellenen Beceri Seviyelerin
                  </div>

                  {completedResult.deltas.map((d) => {
                    const diff = d.newLevel - d.previousLevel;
                    return (
                      <div
                        key={d.skillId}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-extrabold text-[#0B1F4D] truncate">
                            {d.nameTr}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Sektör Hedefi: {d.requiredLevel}/5
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-slate-400 tabular-nums">
                            {d.previousLevel}/5 →
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-black tabular-nums inline-flex items-center gap-1">
                            {diff > 0 && <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{d.newLevel}/5</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-5 sm:p-6 pt-3 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    disabled={isAdvancingSprint}
                    onClick={() => void handleLaunchNextCycle()}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#2F5BFF] hover:bg-[#1E46E8] text-white font-black text-sm shadow-[0_5px_0_#1736B5] active:translate-y-0.5 active:shadow-[0_2px_0_#1736B5] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isAdvancingSprint ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Rocket className="w-5 h-5" />
                    )}
                    <span>
                      Yeni Döngüyü Başlat (Sprint {sprint.sprintNumber + 1}) →
                    </span>
                  </button>
                </div>
              </>
            ) : (
              /* ========== HIZLI ÖZDEĞERLENDİRME FORMU ========== */
              <>
                <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50/40 border-b border-amber-200/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
                        <Swords className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-extrabold">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Boss Durağı • +50 XP</span>
                        </span>
                        <h3
                          id="mini-checkup-title"
                          className="mt-1 text-lg sm:text-xl font-black text-[#0B1F4D]"
                        >
                          Hızlı Beceri Özdeğerlendirmesi
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Pencereyi kapat"
                      className="p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Bu sprintte çalıştığın becerilerde kendini şu an <strong>1 ile 5</strong> arasında
                    nerede görüyorsun? Seçimlerin bir sonraki döngünün görevlerini şekillendirecek.
                  </p>
                </div>

                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                  {targetSkills.map((sk) => {
                    const currentVal = ratings[sk.skillId] ?? sk.previousLevel;
                    return (
                      <div
                        key={sk.skillId}
                        className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-extrabold text-[#0B1F4D]">
                              {sk.nameTr}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                              Önceki puanın: {sk.previousLevel}/5 • Sektör hedefi:{" "}
                              {sk.requiredLevel}/5
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#2F5BFF] text-[11px] font-extrabold shrink-0">
                            {currentVal}/5 • {LEVEL_LABELS[currentVal]}
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map((lvl) => {
                            const selected = currentVal === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() =>
                                  setRatings((prev) => ({
                                    ...prev,
                                    [sk.skillId]: lvl,
                                  }))
                                }
                                className={`py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                  selected
                                    ? "bg-[#2F5BFF] border-[#1D4ED8] text-white shadow-[0_3px_0_#1E3A8A]"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/40"
                                }`}
                              >
                                <span className="text-sm">{lvl}</span>
                                <span
                                  className={`text-[9px] font-bold hidden sm:inline ${
                                    selected ? "text-blue-100" : "text-slate-400"
                                  }`}
                                >
                                  {LEVEL_LABELS[lvl]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-5 sm:p-6 pt-3 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-105 text-white font-black text-sm shadow-[0_5px_0_#B45309] active:translate-y-0.5 active:shadow-[0_2px_0_#B45309] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    <span>Özdeğerlendirmeyi Kaydet (+50 XP Kazan)</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

