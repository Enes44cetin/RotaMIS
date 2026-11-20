"use client";

import React, {
  createContext,
  useContext,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  toggleTaskStatus,
  markTaskInProgress,
  skipTask,
  unskipTask,
  reportBrokenResource,
} from "@/actions/tasks";
import { advanceSprint } from "@/actions/journey";
import type {
  EffectiveStreakStatus,
  ResourceReportReason,
  SprintRow,
  TaskRow,
  TaskStatus,
} from "@/types/database";

interface OptimisticDashboardState {
  tasks: TaskRow[];
  totalXp: number;
  effectiveStreak: number;
  streakStatus: EffectiveStreakStatus;
}

type OptimisticAction =
  | { type: "toggle"; taskId: string; nextStatus: TaskStatus; xpDelta: number }
  | { type: "start"; taskId: string }
  | { type: "skip"; taskId: string; nextStatus: "skipped" | "pending" };

interface DashboardContextValue {
  sprints: SprintRow[];
  completedMiniSprintIds: Set<string>;
  sealedSprintIds: Set<string>;
  tasks: TaskRow[];
  totalXp: number;
  effectiveStreak: number;
  streakStatus: EffectiveStreakStatus;
  isPending: boolean;
  pendingTaskId: string | null;
  isAdvancingSprint: boolean;
  catalogExhausted: boolean;
  allGapsClosed: boolean;
  lastAppendedSprintNumber: number | null;
  activeMiniCheckupSprintId: string | null;
  isSettingsOpen: boolean;
  toggleTask: (
    task: TaskRow
  ) => Promise<{ ok: boolean; completed: boolean; xpDelta: number }>;
  startTask: (task: TaskRow) => void;
  skipTaskAction: (task: TaskRow) => Promise<boolean>;
  unskipTaskAction: (task: TaskRow) => Promise<boolean>;
  reportTaskResource: (params: {
    task: TaskRow;
    reason: ResourceReportReason;
    note?: string;
    skipAfterReport: boolean;
  }) => Promise<boolean>;
  advanceToNextSprint: () => Promise<boolean>;
  openMiniCheckup: (sprintId: string) => void;
  closeMiniCheckup: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  grantClientXpBonus: (xpBonus: number) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within <DashboardShell />");
  }
  return ctx;
}

interface DashboardShellProps {
  initialSprints: SprintRow[];
  initialCompletedMiniSprintIds: string[];
  initialTasks: TaskRow[];
  initialTotalXp: number;
  initialEffectiveStreak: number;
  initialStreakStatus: EffectiveStreakStatus;
  children: React.ReactNode;
}

export function DashboardShell({
  initialSprints,
  initialCompletedMiniSprintIds,
  initialTasks,
  initialTotalXp,
  initialEffectiveStreak,
  initialStreakStatus,
  children,
}: DashboardShellProps) {
  const [isPending, startTransition] = useTransition();
  const [isAdvancingSprint, startAdvanceTransition] = useTransition();
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [catalogExhausted, setCatalogExhausted] = useState(false);
  const [allGapsClosed, setAllGapsClosed] = useState(false);
  const [lastAppendedSprintNumber, setLastAppendedSprintNumber] = useState<
    number | null
  >(null);
  const [activeMiniCheckupSprintId, setActiveMiniCheckupSprintId] = useState<
    string | null
  >(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [bonusXpOffset, setBonusXpOffset] = useState(0);

  // Server revalidation geldiğinde bonusXpOffset sıfırlanır (initialTotalXp zaten yeni XP'yi içerir)
  const [prevServerXp, setPrevServerXp] = useState(initialTotalXp);
  if (initialTotalXp !== prevServerXp) {
    setPrevServerXp(initialTotalXp);
    setBonusXpOffset(0);
  }

  const completedMiniSprintIds = new Set(initialCompletedMiniSprintIds);
  const sealedSprintIds = new Set(
    initialSprints.filter((s) => s.status === "completed").map((s) => s.id)
  );

  const [optimisticState, addOptimistic] = useOptimistic<
    OptimisticDashboardState,
    OptimisticAction
  >(
    {
      tasks: initialTasks,
      totalXp: initialTotalXp + bonusXpOffset,
      effectiveStreak: initialEffectiveStreak,
      streakStatus: initialStreakStatus,
    },
    (current, action) => {
      if (action.type === "toggle") {
        const activatingStreak =
          action.nextStatus === "completed" &&
          current.streakStatus !== "active_today";
        const nextStreak = activatingStreak
          ? current.streakStatus === "at_risk"
            ? current.effectiveStreak + 1
            : 1
          : current.effectiveStreak;

        return {
          tasks: current.tasks.map((t) =>
            t.id === action.taskId ? { ...t, status: action.nextStatus } : t
          ),
          totalXp: Math.max(0, current.totalXp + action.xpDelta),
          effectiveStreak: nextStreak,
          streakStatus: activatingStreak ? "active_today" : current.streakStatus,
        };
      }

      if (action.type === "start") {
        return {
          ...current,
          tasks: current.tasks.map((t) =>
            t.id === action.taskId && t.status === "pending"
              ? { ...t, status: "in_progress" }
              : t
          ),
        };
      }

      if (action.type === "skip") {
        return {
          ...current,
          tasks: current.tasks.map((t) =>
            t.id === action.taskId ? { ...t, status: action.nextStatus } : t
          ),
        };
      }

      return current;
    }
  );

  function toggleTask(
    task: TaskRow
  ): Promise<{ ok: boolean; completed: boolean; xpDelta: number }> {
    if (task.sprint_id && sealedSprintIds.has(task.sprint_id)) {
      toast.info(
        "Tamamlanmış sprintlerdeki görevler kalıcı olarak mühürlenmiştir."
      );
      return Promise.resolve({ ok: false, completed: true, xpDelta: 0 });
    }

    const nextStatus: TaskStatus =
      task.status === "completed" ? "pending" : "completed";
    const xpDelta =
      nextStatus === "completed"
        ? task.xp_reward || 0
        : -(task.xp_reward || 0);

    setPendingTaskId(task.id);

    return new Promise((resolve) => {
      startTransition(async () => {
        addOptimistic({
          type: "toggle",
          taskId: task.id,
          nextStatus,
          xpDelta,
        });

        const res = await toggleTaskStatus(task.id, task.status);
        setPendingTaskId(null);

        if (res?.error) {
          toast.error(res.error);
          resolve({ ok: false, completed: false, xpDelta: 0 });
          return;
        }

        if (nextStatus === "completed") {
          toast.success(`Görev tamamlandı! +${task.xp_reward} XP kazandın 🎉`);
          resolve({ ok: true, completed: true, xpDelta });
        } else {
          toast.info("Görev tekrar aktif duruma alındı.");
          resolve({ ok: true, completed: false, xpDelta });
        }
      });
    });
  }

  function startTask(task: TaskRow) {
    if (task.status !== "pending") return;
    if (task.sprint_id && sealedSprintIds.has(task.sprint_id)) return;

    startTransition(async () => {
      addOptimistic({ type: "start", taskId: task.id });
      await markTaskInProgress(task.id);
    });
  }

  function skipTaskAction(task: TaskRow): Promise<boolean> {
    if (task.sprint_id && sealedSprintIds.has(task.sprint_id)) {
      toast.info("Tamamlanmış sprintlerdeki görevler atlanamaz.");
      return Promise.resolve(false);
    }

    setPendingTaskId(task.id);

    return new Promise((resolve) => {
      startTransition(async () => {
        addOptimistic({
          type: "skip",
          taskId: task.id,
          nextStatus: "skipped",
        });

        const res = await skipTask(task.id);
        setPendingTaskId(null);

        if (res?.error) {
          toast.error(res.error);
          resolve(false);
          return;
        }

        toast.info(
          "Görev atlandı (0 XP). İstersen düğüme tıklayıp tekrar aktif edebilirsin."
        );
        resolve(true);
      });
    });
  }

  function unskipTaskAction(task: TaskRow): Promise<boolean> {
    if (task.sprint_id && sealedSprintIds.has(task.sprint_id)) {
      toast.info("Tamamlanmış sprintlerdeki görevlerin durumu değiştirilemez.");
      return Promise.resolve(false);
    }

    setPendingTaskId(task.id);

    return new Promise((resolve) => {
      startTransition(async () => {
        addOptimistic({
          type: "skip",
          taskId: task.id,
          nextStatus: "pending",
        });

        const res = await unskipTask(task.id);
        setPendingTaskId(null);

        if (res?.error) {
          toast.error(res.error);
          resolve(false);
          return;
        }

        toast.success("Görev tekrar aktif duruma alındı.");
        resolve(true);
      });
    });
  }

  function reportTaskResource({
    task,
    reason,
    note,
    skipAfterReport,
  }: {
    task: TaskRow;
    reason: ResourceReportReason;
    note?: string;
    skipAfterReport: boolean;
  }): Promise<boolean> {
    setPendingTaskId(task.id);

    return new Promise((resolve) => {
      startTransition(async () => {
        if (skipAfterReport && !(task.sprint_id && sealedSprintIds.has(task.sprint_id))) {
          addOptimistic({
            type: "skip",
            taskId: task.id,
            nextStatus: "skipped",
          });
        }

        const res = await reportBrokenResource({
          taskId: task.id,
          resourceId: task.resource_id ?? null,
          reason,
          note,
          skipAfterReport,
        });
        setPendingTaskId(null);

        if (res?.error) {
          toast.error(res.error);
          resolve(false);
          return;
        }

        toast.success(
          res.skipped
            ? "Bildirimin ekibimize iletildi ve görev patikanda atlandı."
            : "Bildirimin ekibimize iletildi. Teşekkürler!"
        );
        resolve(true);
      });
    });
  }

  function advanceToNextSprint(): Promise<boolean> {
    return new Promise((resolve) => {
      startAdvanceTransition(async () => {
        const res = await advanceSprint();
        if (!res.ok) {
          toast.error(res.error || "Yeni sprint başlatılamadı.");
          resolve(false);
          return;
        }

        if (res.allGapsClosed) {
          setAllGapsClosed(true);
          toast.success(
            "Tebrikler! Hedef mesleğindeki tüm yetkinlik açıklarını kapattın! 🏆"
          );
          resolve(true);
          return;
        }

        if (res.catalogExhausted) {
          setCatalogExhausted(true);
          toast.success(
            "Tebrikler! Mevcut katalogdaki tüm uygun içerikleri tamamladın! 🎉"
          );
          resolve(true);
          return;
        }

        setCatalogExhausted(false);
        if (res.sprintNumber) {
          setLastAppendedSprintNumber(res.sprintNumber);
          toast.success(
            `Sprint ${res.sprintNumber} patikana eklendi! Başarılar 🚀`
          );
        }
        resolve(true);
      });
    });
  }

  return (
    <DashboardContext.Provider
      value={{
        sprints: initialSprints,
        completedMiniSprintIds,
        sealedSprintIds,
        tasks: optimisticState.tasks,
        totalXp: optimisticState.totalXp,
        effectiveStreak: optimisticState.effectiveStreak,
        streakStatus: optimisticState.streakStatus,
        isPending,
        pendingTaskId,
        isAdvancingSprint,
        catalogExhausted,
        allGapsClosed,
        lastAppendedSprintNumber,
        activeMiniCheckupSprintId,
        isSettingsOpen,
        toggleTask,
        startTask,
        skipTaskAction,
        unskipTaskAction,
        reportTaskResource,
        advanceToNextSprint,
        openMiniCheckup: (sprintId) => setActiveMiniCheckupSprintId(sprintId),
        closeMiniCheckup: () => setActiveMiniCheckupSprintId(null),
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
        grantClientXpBonus: (xp) => setBonusXpOffset((prev) => prev + xp),
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
