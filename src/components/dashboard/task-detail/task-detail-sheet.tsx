"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  X,
  ExternalLink,
  Clock,
  Award,
  CheckCircle2,
  RotateCcw,
  Star,
  Loader2,
  Target,
  Sparkles,
  Lock,
  SkipForward,
  Flag,
  Compass,
} from "lucide-react";
import { getResourceMeta, getDifficultyLabel } from "@/lib/path/task-meta";
import {
  buildTaskReason,
  isInternalLeanResourceUrl,
} from "@/lib/path/task-reason";
import { useDashboard } from "../dashboard-shell";
import { XpBurst } from "./xp-burst";
import type {
  ResourceReportReason,
  SkillGapRow,
  TaskRow,
} from "@/types/database";

interface TaskDetailSheetProps {
  task: TaskRow | null;
  skillGaps: SkillGapRow[];
  careerName: string;
  onClose: () => void;
}

const REPORT_REASONS: Array<{ id: ResourceReportReason; label: string }> = [
  { id: "broken_link", label: "Link açılmıyor / kırık" },
  { id: "outdated", label: "İçerik güncel değil" },
  { id: "other", label: "Diğer sorun" },
];

export function TaskDetailSheet({
  task,
  skillGaps,
  careerName,
  onClose,
}: TaskDetailSheetProps) {
  const {
    toggleTask,
    startTask,
    skipTaskAction,
    unskipTaskAction,
    reportTaskResource,
    pendingTaskId,
    sealedSprintIds,
  } = useDashboard();
  const prefersReducedMotion = useReducedMotion();
  const [burstXp, setBurstXp] = useState<number | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] =
    useState<ResourceReportReason>("broken_link");
  const [reportNote, setReportNote] = useState("");
  const [skipAfterReport, setSkipAfterReport] = useState(true);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setBurstXp(null);
    setIsCelebrating(false);
    setReportOpen(false);
    setReportReason("broken_link");
    setReportNote("");
    setSkipAfterReport(true);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [task?.id]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!task) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [task, onClose]);

  async function handleToggle(currentTask: TaskRow) {
    const willComplete = currentTask.status !== "completed";

    if (willComplete) {
      setBurstXp(currentTask.xp_reward || 0);
      setIsCelebrating(true);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 900);

      const res = await toggleTask(currentTask);
      if (!res.ok) {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        setBurstXp(null);
        setIsCelebrating(false);
      }
      return;
    }

    await toggleTask(currentTask);
  }

  async function handleSkip(currentTask: TaskRow) {
    const ok = await skipTaskAction(currentTask);
    if (ok) {
      onClose();
    }
  }

  async function handleUnskip(currentTask: TaskRow) {
    await unskipTaskAction(currentTask);
  }

  async function handleSubmitReport(currentTask: TaskRow) {
    const ok = await reportTaskResource({
      task: currentTask,
      reason: reportReason,
      note: reportNote,
      skipAfterReport,
    });
    if (ok) {
      setReportOpen(false);
      if (skipAfterReport) {
        onClose();
      }
    }
  }

  return (
    <AnimatePresence>
      {task && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-sheet-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs"
          />

          {/* Modal / Bottom Sheet Card */}
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
            {(() => {
              const meta = getResourceMeta(task.resource_type);
              const ResourceIcon = meta.Icon;
              const isCompleted = task.status === "completed";
              const isSkipped = task.status === "skipped";
              const isInProgress = task.status === "in_progress";
              const isUpdating = pendingTaskId === task.id;
              const isSprintSealed = Boolean(
                task.sprint_id && sealedSprintIds.has(task.sprint_id)
              );
              const difficulty = Math.min(3, Math.max(1, task.difficulty || 1));
              const reasonSummary = buildTaskReason(task, skillGaps, careerName);
              const hasExternalResourceUrl = Boolean(
                task.resource_url &&
                  !isInternalLeanResourceUrl(task.resource_url)
              );

              return (
                <>
                  {/* Top Accent Header */}
                  <div
                    className={`p-5 sm:p-6 border-b ${
                      isCompleted
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50/60 border-emerald-100"
                        : isSkipped
                        ? "bg-slate-50 border-slate-200/80"
                        : "bg-gradient-to-r from-slate-50 to-blue-50/50 border-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs shrink-0 ${
                            isCompleted
                              ? "bg-emerald-500 text-white border-emerald-600"
                              : isSkipped
                              ? "bg-slate-200 text-slate-600 border-slate-300"
                              : "bg-white border-slate-200/90 " +
                                meta.iconColorClass
                          }`}
                        >
                          {isSkipped ? (
                            <SkipForward className="w-6 h-6" />
                          ) : (
                            <ResourceIcon className="w-6 h-6" />
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.pillClass}`}
                          >
                            {meta.label}
                          </span>

                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white border border-slate-200 text-slate-600">
                            Kendi Hızında
                          </span>

                          {isInProgress && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 border border-amber-200 text-amber-900">
                              Devam Ediyor
                            </span>
                          )}

                          {isSkipped && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 border border-slate-300 text-slate-700">
                              Atlandı
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onClose}
                        aria-label="Detay penceresini kapat"
                        className="p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <h3
                      id="task-sheet-title"
                      className="mt-4 text-lg sm:text-xl font-black text-[#0B1F4D] leading-snug"
                    >
                      {task.title}
                    </h3>
                  </div>

                  {/* Body */}
                  <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                    {/* Metadata Strip */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 font-extrabold">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>+{task.xp_reward} XP</span>
                      </div>

                      {task.estimated_hours && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>~{task.estimated_hours} Saat</span>
                        </div>
                      )}

                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 font-semibold">
                        <span className="inline-flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= difficulty
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                        </span>
                        <span>{getDifficultyLabel(difficulty)}</span>
                      </div>

                      {task.skill?.name_tr && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-[#2F5BFF] font-bold">
                          <Target className="w-3.5 h-3.5" />
                          <span>{task.skill.name_tr}</span>
                        </div>
                      )}
                    </div>

                    {/* "Neden Bu Görev?" Personalized Rationale Card (QW5) */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#2F5BFF] uppercase tracking-wider">
                          <Compass className="w-3.5 h-3.5" />
                          <span>Neden Bu Görev?</span>
                        </span>
                        {reasonSummary.demandBadge && (
                          <span className="px-2 py-0.5 rounded-full bg-white/90 border border-blue-200 text-[10px] font-bold text-[#0B1F4D]">
                            {reasonSummary.demandBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#0B1F4D]/90 leading-relaxed font-medium">
                        {reasonSummary.detail}
                      </p>
                    </div>

                    {/* Description */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/60">
                      <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Görev Yönergesi
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {task.description ||
                          "Bu görevi tamamlayarak hedef kariyerindeki yetkinlik açığını kapatabilir ve deneyim puanı (XP) kazanabilirsin."}
                      </p>
                    </div>

                    {/* External Learning Resource Link (yalnızca admin harici bir URL tanımladıysa gösterilir) */}
                    {hasExternalResourceUrl && task.resource_url && (
                      <a
                        href={task.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => startTask(task)}
                        className="w-full p-4 rounded-2xl bg-blue-50/80 hover:bg-blue-100/70 border border-blue-200 flex items-center justify-between gap-3 group transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-[#0B1F4D] group-hover:text-[#2F5BFF] transition-colors">
                            Öğrenme Kaynağını Aç
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {task.resource_url}
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-blue-200 text-[#2F5BFF] text-xs font-extrabold shrink-0 shadow-2xs group-hover:translate-x-0.5 transition-transform">
                          <span>Kaynağa Git</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </a>
                    )}

                    {/* Inline Broken Link / Resource Issue Report Panel */}
                    {reportOpen && (
                      <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
                            <Flag className="w-3.5 h-3.5 text-amber-600" />
                            <span>Kaynak Sorunu Bildir</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReportOpen(false)}
                            className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                          >
                            Kapat
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {REPORT_REASONS.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setReportReason(r.id)}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                                reportReason === r.id
                                  ? "bg-amber-600 text-white border-amber-600"
                                  : "bg-white text-slate-700 border-amber-200 hover:bg-amber-100/60"
                              }`}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>

                        <textarea
                          rows={2}
                          maxLength={500}
                          value={reportNote}
                          onChange={(e) => setReportNote(e.target.value)}
                          placeholder="İstersen kısa bir not ekle (örn: 404 sayfasına gidiyor)..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder:text-slate-400"
                        />

                        {!isSprintSealed && !isCompleted && (
                          <label className="flex items-center gap-2 text-[11px] font-semibold text-amber-950 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={skipAfterReport}
                              onChange={(e) =>
                                setSkipAfterReport(e.target.checked)
                              }
                              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>
                              Görevi atla (0 XP) ve sprint patikama devam et
                            </span>
                          </label>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => void handleSubmitReport(task)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                          >
                            {isUpdating && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                            <span>Bildirimi Gönder</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Celebration Burst Overlay */}
                  {burstXp !== null && (
                    <div className="absolute inset-x-0 bottom-24 flex justify-center pointer-events-none z-20">
                      <XpBurst xp={burstXp} />
                    </div>
                  )}

                  {/* Footer CTA */}
                  <div className="p-5 sm:p-6 pt-3 border-t border-slate-100 bg-white space-y-2.5">
                    {isCelebrating ? (
                      <div className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-[0_5px_0_#047857] flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <span>
                          Harika! +{task.xp_reward} XP Kazanıldı!
                        </span>
                      </div>
                    ) : isCompleted ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-700">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span>Bu görevi başarıyla tamamladın!</span>
                        </div>
                        {isSprintSealed ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Sprint Tamamlandı • Kalıcı Kazanım</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => void handleToggle(task)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Tamamlanmadı Olarak İşaretle</span>
                          </button>
                        )}
                      </div>
                    ) : isSkipped ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                          <SkipForward className="w-4 h-4 text-slate-500" />
                          <span>Bu görevi atladın (0 XP).</span>
                        </div>
                        {isSprintSealed ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Sprint Mühürlü</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => void handleUnskip(task)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#2F5BFF] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Tekrar Aktif Et</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void handleToggle(task)}
                          className="w-full py-3.5 px-6 rounded-2xl bg-[#2F5BFF] hover:bg-[#1E46E8] text-white font-black text-sm shadow-[0_5px_0_#1736B5] active:translate-y-0.5 active:shadow-[0_2px_0_#1736B5] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                          <span>
                            Görevi Tamamla (+{task.xp_reward} XP Kazan)
                          </span>
                        </button>

                        {!isSprintSealed && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void handleSkip(task)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <SkipForward className="w-3.5 h-3.5" />
                              <span>Zaten Biliyorum / Atla</span>
                            </button>

                            {hasExternalResourceUrl && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => setReportOpen((prev) => !prev)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 hover:text-amber-900 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Flag className="w-3.5 h-3.5" />
                                <span>Link Kırık / Sorun Bildir</span>
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
