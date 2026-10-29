"use client";

import { useState } from "react";
import { Trophy, ChevronDown, ChevronUp, CheckCircle2, Award } from "lucide-react";
import type { CompletedCycleGroup } from "@/lib/path/cycle";
import { SprintSection } from "./sprint-section";

interface CycleSummaryCardProps {
  cycle: CompletedCycleGroup;
  roadmapTitle?: string | null;
  pendingTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

export function CycleSummaryCard({
  cycle,
  roadmapTitle,
  pendingTaskId,
  onSelectTask,
}: CycleSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const firstSprint = cycle.sprints[0]?.sprintNumber ?? 1;
  const lastSprint =
    cycle.sprints[cycle.sprints.length - 1]?.sprintNumber ?? firstSprint;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white border border-emerald-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Trophy className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {cycle.cycleNumber}. Döngü Tamamlandı (Sprint {firstSprint}–{lastSprint})
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#0B1F4D] truncate">
              {cycle.totalTasks} Görev &amp; Boss Check-Up Başarıyla Geçildi
            </h3>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 mt-0.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>+{cycle.totalEarnedXp} XP Kazanıldı</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-extrabold text-[#0B1F4D] transition-colors shrink-0 cursor-pointer"
        >
          <span>{expanded ? "Geçmişi Gizle" : "Patikayı İncele"}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="space-y-6 pl-2 sm:pl-4 border-l-4 border-emerald-200/70">
          {cycle.sprints.map((sprint) => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              isTailSprint={false}
              roadmapTitle={roadmapTitle}
              pendingTaskId={pendingTaskId}
              onSelectTask={onSelectTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

