"use client";

import { motion, useReducedMotion } from "motion/react";
import { SprintHeader } from "./sprint-header";
import { PathTrack } from "./path-track";
import { PathNode } from "./path-node";
import { SprintGateNode } from "./sprint-gate-node";
import { BossNode } from "./boss-node";
import { computeSprintPathGeometry } from "@/lib/path/path-layout";
import type { SprintUnit } from "@/types/database";

interface SprintSectionProps {
  sprint: SprintUnit;
  isTailSprint: boolean;
  isNewlyAppended?: boolean;
  roadmapTitle?: string | null;
  pendingTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

export function SprintSection({
  sprint,
  isTailSprint,
  isNewlyAppended = false,
  roadmapTitle,
  pendingTaskId,
  onSelectTask,
}: SprintSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const geometry = computeSprintPathGeometry(sprint.tasks);
  const taskById = new Map(sprint.tasks.map((t) => [t.id, t]));

  return (
    <motion.section
      data-sprint-number={sprint.sprintNumber}
      aria-label={sprint.title}
      initial={
        isNewlyAppended && !prefersReducedMotion
          ? { opacity: 0, y: 36, scale: 0.98 }
          : false
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="bg-white/75 backdrop-blur-xs rounded-3xl border border-slate-200/80 p-3 sm:p-5 shadow-xs"
    >
      <SprintHeader sprint={sprint} roadmapTitle={roadmapTitle} />

      {/* Ekran okuyucular için erişilebilir özet liste */}
      <ol className="sr-only">
        {sprint.tasks.map((t) => (
          <li key={t.id}>
            {t.title} — {t.xp_reward} XP —{" "}
            {t.status === "completed" ? "Tamamlandı" : "Aktif"}
          </li>
        ))}
      </ol>

      {/* Dikey Kıvrımlı Patika Sahnesi (Zaman/Hafta Baskısı Yok) */}
      <div
        style={{ height: `${geometry.totalHeightPx}px` }}
        className="relative max-w-lg mx-auto w-full mt-4 select-none"
      >
        <PathTrack
          sprintNumber={sprint.sprintNumber}
          fullTrackPathD={geometry.fullTrackPathD}
          segments={geometry.segments}
          totalHeightPx={geometry.totalHeightPx}
        />

        {geometry.nodes.map((coord) => {
          const task = taskById.get(coord.taskId);
          if (!task) return null;

          return (
            <PathNode
              key={coord.taskId}
              task={task}
              xPct={coord.xPct}
              yPx={coord.yPx}
              isRecommended={sprint.recommendedTaskId === task.id}
              isUpdating={pendingTaskId === task.id}
              onSelect={onSelectTask}
            />
          );
        })}

        {sprint.kind === "checkpoint" ? (
          <BossNode
            sprintId={sprint.id}
            sprintNumber={sprint.sprintNumber}
            xPct={geometry.endNode.xPct}
            yPx={geometry.endNode.yPx}
            completedCount={sprint.completedCount}
            totalCount={sprint.tasks.length}
            isSealed={sprint.isSealed}
            miniCheckupCompleted={sprint.miniCheckupCompleted}
            isTailSprint={isTailSprint}
          />
        ) : (
          <SprintGateNode
            sprintNumber={sprint.sprintNumber}
            xPct={geometry.endNode.xPct}
            yPx={geometry.endNode.yPx}
            completedCount={sprint.completedCount}
            totalCount={sprint.tasks.length}
            isSealed={sprint.isSealed}
            isTailSprint={isTailSprint}
          />
        )}
      </div>
    </motion.section>
  );
}
