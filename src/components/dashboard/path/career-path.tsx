"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
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
import type { SkillGapRow } from "@/types/database";

interface CareerPathProps {
  roadmapTitle?: string | null;
  roadmapSummary?: string | null;
  skillGaps: SkillGapRow[];
}

export function CareerPath({
  roadmapTitle,
  roadmapSummary,
  skillGaps,
}: CareerPathProps) {
  const {
    sprints: rawSprints,
    completedMiniSprintIds,
    tasks,
    pendingTaskId,
    catalogExhausted,
    lastAppendedSprintNumber,
    activeMiniCheckupSprintId,
    closeMiniCheckup,
  } = useDashboard();
  const prefersReducedMotion = useReducedMotion();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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

  // İlk açılışta öğrencinin kaldığı aktif düğüme yumuşak odaklanma
  useEffect(() => {
    if (hasAutoScrolled.current || sprints.length === 0) return;
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
  }, [sprints, tasks, prefersReducedMotion]);

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

  if (sprints.length === 0) {
    return <PathEmptyState />;
  }

  const tailSprint = sprints[sprints.length - 1];

  return (
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
              isNewlyAppended={sprint.sprintNumber === lastAppendedSprintNumber}
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

      <TaskDetailSheet
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
      />

      <MiniCheckupSheet
        sprint={activeMiniCheckupSprint}
        skillGaps={skillGaps}
        onClose={closeMiniCheckup}
      />
    </div>
  );
}
