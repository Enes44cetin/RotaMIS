"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Flame } from "lucide-react";
import { useDashboard } from "../dashboard-shell";
import { buildSprints } from "@/lib/path/build-sprints";
import { partitionCycles } from "@/lib/path/cycle";
import { SprintSection } from "./sprint-section";
import { CycleSummaryCard } from "./cycle-summary-card";
import { NextSprintPreview } from "./next-sprint-preview";
import { CatalogPendingNode } from "./catalog-pending-node";
import { PathEmptyState } from "./path-empty-state";
import { TaskDetailSheet } from "../task-detail/task-detail-sheet";
import { MiniCheckupSheet } from "../mini-checkup/mini-checkup-sheet";
import { CheckupResultModal } from "../welcome/checkup-result-modal";
import { ProfileSettingsModal } from "../profile/profile-settings-modal";
import type {
  SkillGapRow,
  StudentSettingsInitial,
  UniversityOption,
} from "@/types/database";

interface CareerPathProps {
  roadmapTitle?: string | null;
  roadmapSummary?: string | null;
  careerName: string;
  overallReadiness: number;
  skillGaps: SkillGapRow[];
  showWelcomeModal?: boolean;
  universities: UniversityOption[];
  settingsInitial: StudentSettingsInitial;
}

export function CareerPath({
  roadmapTitle,
  roadmapSummary,
  careerName,
  overallReadiness,
  skillGaps,
  showWelcomeModal = false,
  universities,
  settingsInitial,
}: CareerPathProps) {
  const {
    sprints: rawSprints,
    completedMiniSprintIds,
    tasks,
    totalXp,
    effectiveStreak,
    streakStatus,
    pendingTaskId,
    catalogExhausted,
    lastAppendedSprintNumber,
    activeMiniCheckupSprintId,
    closeMiniCheckup,
    isSettingsOpen,
    closeSettings,
  } = useDashboard();
  const prefersReducedMotion = useReducedMotion();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(showWelcomeModal);
  const hasAutoScrolled = useRef(false);

  const sprints = useMemo(
    () =>
      buildSprints(
        rawSprints,
        tasks,
        completedMiniSprintIds,
        skillGaps,
        roadmapSummary
      ),
    [rawSprints, tasks, completedMiniSprintIds, skillGaps, roadmapSummary]
  );

  const { pastCycles, activeCycleSprints } = useMemo(
    () => partitionCycles(sprints),
    [sprints]
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const activeMiniCheckupSprint = useMemo(
    () => sprints.find((s) => s.id === activeMiniCheckupSprintId) || null,
    [sprints, activeMiniCheckupSprintId]
  );

  const cleanWelcomeUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("welcome")) {
        url.searchParams.delete("welcome");
        window.history.replaceState(
          null,
          "",
          url.pathname + (url.search ? url.search : "")
        );
      }
    }
  }, []);

  const handleCloseWelcome = useCallback(() => {
    setWelcomeOpen(false);
    cleanWelcomeUrl();
  }, [cleanWelcomeUrl]);

  const handleStartFirstTask = useCallback(() => {
    setWelcomeOpen(false);
    cleanWelcomeUrl();

    const firstActiveSprint =
      sprints.find((s) => !s.allTasksDone) || sprints[0];
    const targetId = firstActiveSprint?.recommendedTaskId;
    if (!targetId) return;

    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-task-node-id="${targetId}"]`
      );
      if (el) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "center",
        });
      }
    }, 180);
  }, [cleanWelcomeUrl, sprints, prefersReducedMotion]);

  // İlk açılışta öğrencinin kaldığı aktif düğüme yumuşak odaklanma
  useEffect(() => {
    if (hasAutoScrolled.current || sprints.length === 0 || welcomeOpen) return;
    hasAutoScrolled.current = true;

    const firstActiveSprint =
      sprints.find((s) => !s.allTasksDone) || sprints[sprints.length - 1];
    const targetId = firstActiveSprint?.recommendedTaskId;
    if (!targetId) return;

    const anyCompleted = tasks.some((t) => t.status === "completed");
    if (!anyCompleted) return;

    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-task-node-id="${targetId}"]`
      );
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const isComfortablyVisible =
        rect.top >= 120 && rect.bottom <= window.innerHeight - 100;
      if (!isComfortablyVisible) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "center",
        });
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [sprints, tasks, prefersReducedMotion, welcomeOpen]);

  // Yeni sprint eklendiğinde sayfayı aşağıya, yeni eklenen sprintin başlığına kaydır
  useEffect(() => {
    if (!lastAppendedSprintNumber) return;

    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-sprint-number="${lastAppendedSprintNumber}"]`
      );
      if (el) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [lastAppendedSprintNumber, prefersReducedMotion]);

  const tailSprint = sprints[sprints.length - 1];

  return (
    <div className="space-y-6">
      {/* Seri Tehlikede Bandı (dün aktif olup bugün henüz görev tamamlamayan öğrenci için) */}
      {streakStatus === "at_risk" && effectiveStreak > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300/90 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black text-amber-950">
                {effectiveStreak} Günlük Serin Tehlikede!
              </div>
              <p className="text-[11px] sm:text-xs text-amber-800/90 leading-snug">
                Serini sıfırlanmadan korumak için bugün patikandan bir görev
                tamamla.
              </p>
            </div>
          </div>
        </div>
      )}

      {sprints.length === 0 ? (
        <PathEmptyState />
      ) : (
        <div className="space-y-8">
          {/* Geçmişte Tamamlanmış 4'lü Döngüler (Katlanabilir Özet Kartları) */}
          {pastCycles.map((cycle) => (
            <CycleSummaryCard
              key={cycle.cycleNumber}
              cycle={cycle}
              roadmapTitle={roadmapTitle}
              pendingTaskId={pendingTaskId}
              onSelectTask={(taskId) => setSelectedTaskId(taskId)}
            />
          ))}

          {/* Aktif Döngünün Sprintleri (Yukarıdan aşağıya kesintisiz uzayan patika) */}
          {activeCycleSprints.map((sprint, index) => {
            const isTail = sprint.id === tailSprint.id;
            return (
              <div key={sprint.id} className="space-y-2">
                {index > 0 && (
                  <div className="mx-auto w-1.5 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-[#2F5BFF] mb-2" />
                )}
                <SprintSection
                  sprint={sprint}
                  isTailSprint={isTail}
                  isNewlyAppended={
                    sprint.sprintNumber === lastAppendedSprintNumber
                  }
                  roadmapTitle={roadmapTitle}
                  pendingTaskId={pendingTaskId}
                  onSelectTask={(taskId) => setSelectedTaskId(taskId)}
                />
              </div>
            );
          })}

          {/* Alt Kısım: Katalog Tükendiyse Bekleme Kartı, Değilse Sıradaki Sprint Önizlemesi */}
          {catalogExhausted ? (
            <CatalogPendingNode />
          ) : (
            <NextSprintPreview nextSprintNumber={tailSprint.sprintNumber + 1} />
          )}
        </div>
      )}

      <TaskDetailSheet
        task={selectedTask}
        skillGaps={skillGaps}
        careerName={careerName}
        onClose={() => setSelectedTaskId(null)}
      />

      <MiniCheckupSheet
        sprint={activeMiniCheckupSprint}
        skillGaps={skillGaps}
        onClose={closeMiniCheckup}
      />

      <CheckupResultModal
        open={welcomeOpen}
        careerName={careerName}
        overallReadiness={overallReadiness}
        totalXp={totalXp}
        skillGaps={skillGaps}
        onClose={handleCloseWelcome}
        onStartFirstTask={handleStartFirstTask}
      />

      <ProfileSettingsModal
        open={isSettingsOpen}
        onClose={closeSettings}
        initial={settingsInitial}
        universities={universities}
      />
    </div>
  );
}
