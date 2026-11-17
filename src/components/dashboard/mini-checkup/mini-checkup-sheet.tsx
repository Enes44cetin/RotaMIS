"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  Radar,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { submitMiniCheckup } from "@/actions/journey";
import { useDashboard } from "../dashboard-shell";
import { selectDynamicMiniCheckupTopics } from "@/lib/checkup/topic-selector";
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
  1: "Bilgim Yok",
  2: "Aşina / Temel",
  3: "Uygulayıcı",
  4: "Yetkin",
  5: "Uzman",
};

export function MiniCheckupSheet({
  sprint,
  skillGaps,
  onClose,
}: MiniCheckupSheetProps) {
  const { advanceToNextSprint, isAdvancingSprint, grantClientXpBonus } =
    useDashboard();
  const prefersReducedMotion = useReducedMotion();
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Dinamik Soru Seçim Motoru: Sprint yoğunluğu, çalışılan görevler ve mesleğin 6 radar eksenine göre 3..8 konu seçer
  const { topics: targetSkills, dynamicReasonSummary } = useMemo(
    () => selectDynamicMiniCheckupTopics(sprint, skillGaps),
    [sprint, skillGaps]
  );

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [completedResult, setCompletedResult] = useState<{
    xpAwarded: number;
    deltas: MiniCheckupSkillDelta[];
  } | null>(null);
  const initializedSprintIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sprint) {
      initializedSprintIdRef.current = null;
      setRatings({});
      setCompletedResult(null);
      return;
    }

    // Yalnızca yeni bir sprint için modal açıldığında başlangıç puanlarını sıfırla;
    // submit sonrası revalidatePath("/dashboard") yeni skillGaps gönderdiğinde Boss zafer ekranını koru!
    if (initializedSprintIdRef.current === sprint.id) {
      return;
    }
    initializedSprintIdRef.current = sprint.id;

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
      toast.success(
        `Boss geçildi! Meslek radarın güncellendi ve +${awarded} XP kazandın 🏆`
      );
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
            className="relative z-10 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
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
                    Mesleğine özel 6&apos;lı beceri radarın ve hazırlık skorun yeni özdeğerlendirmene göre canlı olarak güncellendi.
                  </p>
                </div>

                <div className="p-5 sm:p-6 space-y-3 overflow-y-auto">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Güncellenen Sektörel Yetkinlik Seviyelerin
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
                            {diff > 0 && (
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            )}
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
              /* ========== SEKTÖREL & DİNAMİK ÖZDEĞERLENDİRME FORMU ========== */
              <>
                <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50/40 border-b border-amber-200/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
                        <Swords className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-extrabold">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Boss Durağı • +50 XP</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#2F5BFF] text-[11px] font-extrabold">
                            <span>Dinamik: {targetSkills.length} Sektörel Konu</span>
                          </span>
                        </div>
                        <h3
                          id="mini-checkup-title"
                          className="mt-1 text-lg sm:text-xl font-black text-[#0B1F4D]"
                        >
                          Sektörel Yetkinlik Check-Up&apos;ı
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

                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    {dynamicReasonSummary}
                  </p>
                </div>

                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                  {targetSkills.map((sk, idx) => {
                    const currentVal = ratings[sk.skillId] ?? sk.previousLevel;
                    const activeAnchor =
                      sk.anchors.find((a) => a.level === currentVal) ||
                      sk.anchors[0];

                    return (
                      <div
                        key={sk.skillId}
                        className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-black text-slate-400">
                                #{idx + 1}
                              </span>
                              <span className="text-sm font-extrabold text-[#0B1F4D]">
                                {sk.nameTr}
                              </span>

                              {sk.isRadarAxis && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/80 border border-amber-300 text-amber-950 text-[10px] font-extrabold">
                                  <Radar className="w-3 h-3 text-amber-600" />
                                  <span>Radar Ekseni</span>
                                </span>
                              )}

                              {sk.displayBadge && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                                  <Briefcase className="w-2.5 h-2.5" />
                                  <span>{sk.displayBadge}</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                              {sk.promptTr}
                            </p>

                            <div className="text-[11px] font-semibold text-slate-500">
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

                        {activeAnchor && (
                          <div className="px-3 py-2 rounded-xl bg-white border border-slate-200/70 text-[11px] text-slate-600 leading-snug">
                            <strong className="text-[#0B1F4D]">
                              Seviye {currentVal} ({activeAnchor.label}):
                            </strong>{" "}
                            {activeAnchor.desc}
                          </div>
                        )}
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
                    <span>
                      Özdeğerlendirmeyi Kaydet &amp; Radarı Güncelle (+50 XP)
                    </span>
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
