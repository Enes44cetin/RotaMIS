"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Award, Loader2 } from "lucide-react";
import { getResourceMeta } from "@/lib/path/task-meta";
import type { TaskRow } from "@/types/database";

interface PathNodeProps {
  task: TaskRow;
  xPct: number;
  yPx: number;
  isRecommended: boolean;
  isUpdating: boolean;
  onSelect: (taskId: string) => void;
}

export function PathNode({
  task,
  xPct,
  yPx,
  isRecommended,
  isUpdating,
  onSelect,
}: PathNodeProps) {
  const prefersReducedMotion = useReducedMotion();
  const meta = getResourceMeta(task.resource_type);
  const ResourceIcon = meta.Icon;

  const isCompleted = task.status === "completed";
  const isInProgress = task.status === "in_progress";

  const statusText = isCompleted
    ? "Tamamlandı"
    : isInProgress
    ? "Devam ediyor"
    : "Aktif";

  return (
    <div
      data-task-node-id={task.id}
      style={{
        left: `${xPct}%`,
        top: `${yPx}px`,
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group"
    >
      {/* Floating Callout Bubble ("BAŞLA" or "DEVAM EDİYOR") - Anchored above circle */}
      {(isRecommended || isInProgress) && !isCompleted && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-20 pointer-events-none">
          <motion.div
            initial={prefersReducedMotion ? false : { y: 0 }}
            animate={
              prefersReducedMotion
                ? undefined
                : { y: [-3, 3, -3] }
            }
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md border whitespace-nowrap relative ${
              isInProgress
                ? "bg-amber-400 text-amber-950 border-amber-500/50"
                : "bg-white text-[#2F5BFF] border-blue-200"
            }`}
          >
            <span>{isInProgress ? "Devam Ediyor" : "Başla"}</span>
            <span
              className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-2.5 h-2.5 rotate-45 border-r border-b ${
                isInProgress
                  ? "bg-amber-400 border-amber-500/50"
                  : "bg-white border-blue-200"
              }`}
            />
          </motion.div>
        </div>
      )}

      {/* Main Circular Tactile 3D Node Button (Exact Center at xPct, yPx) */}
      <div className="relative flex items-center justify-center">
        {/* Rotating Dashed Ring for in_progress */}
        {isInProgress && !prefersReducedMotion && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            aria-hidden="true"
            className="absolute -inset-2 rounded-full border-2 border-dashed border-[#2F5BFF]/60 pointer-events-none"
          />
        )}

        {/* Subtle Pulse Halo for Recommended Pending Node */}
        {isRecommended && !isInProgress && !isCompleted && !prefersReducedMotion && (
          <motion.span
            animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.08, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
            className="absolute -inset-2 rounded-full bg-[#2F5BFF]/25 pointer-events-none"
          />
        )}

        <button
          type="button"
          onClick={() => onSelect(task.id)}
          aria-label={`Görev: ${task.title}, Tür: ${meta.label}, Ödül: ${task.xp_reward} XP, Durum: ${statusText}`}
          className={`relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F5BFF]/40 active:translate-y-1 ${
            isCompleted
              ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white border-4 border-emerald-200 shadow-[0_6px_0_#047857] hover:brightness-105 active:shadow-[0_2px_0_#047857]"
              : isInProgress
              ? "bg-gradient-to-b from-[#2F5BFF] to-[#1D4ED8] text-white border-4 border-blue-200 shadow-[0_6px_0_#1E3A8A] hover:brightness-105 active:shadow-[0_2px_0_#1E3A8A]"
              : "bg-white text-[#2F5BFF] border-4 border-[#2F5BFF] shadow-[0_6px_0_#CBD5E1] hover:bg-blue-50/70 hover:scale-[1.03] active:shadow-[0_2px_0_#CBD5E1]"
          }`}
        >
          {/* Inner glossy highlight */}
          <span
            aria-hidden="true"
            className="absolute inset-x-3 top-1.5 h-3 rounded-full bg-white/25 pointer-events-none"
          />

          {isUpdating ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <ResourceIcon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.25]" />
          )}

          {/* Completed Corner Checkmark Badge */}
          {isCompleted && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-emerald-600 border-2 border-emerald-500 shadow-xs flex items-center justify-center"
            >
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </span>
          )}
        </button>
      </div>

      {/* Node Label + XP Pill - Anchored below circle */}
      <button
        type="button"
        onClick={() => onSelect(task.id)}
        tabIndex={-1}
        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-36 sm:w-44 text-center cursor-pointer group-hover:scale-[1.02] transition-transform"
      >
        <div
          className={`px-2.5 py-1 rounded-xl border backdrop-blur-xs shadow-2xs text-[11px] sm:text-xs font-extrabold leading-tight line-clamp-2 ${
            isCompleted
              ? "bg-emerald-50/95 border-emerald-200/90 text-emerald-950"
              : "bg-white/95 border-slate-200/90 text-[#0B1F4D] group-hover:border-blue-300"
          }`}
        >
          {task.title}
        </div>

        <span
          className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border shadow-2xs ${
            isCompleted
              ? "bg-emerald-100/90 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200/90 text-amber-800"
          }`}
        >
          <Award className="w-3 h-3 text-amber-500" />
          <span>+{task.xp_reward} XP</span>
        </span>
      </button>
    </div>
  );
}

