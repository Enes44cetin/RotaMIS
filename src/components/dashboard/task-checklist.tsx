"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ExternalLink, Clock, Sparkles, Award, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleTaskStatus } from "@/actions/tasks";
import type { TaskRow } from "@/types/database";

interface TaskChecklistProps {
  tasks: TaskRow[];
}

export function TaskChecklist({ tasks: initialTasks }: TaskChecklistProps) {
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  async function handleToggle(task: TaskRow) {
    setTogglingId(task.id);
    const nextStatus = task.status === "completed" ? "pending" : "completed";

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    const res = await toggleTaskStatus(task.id, task.status);

    if (res?.error) {
      // Revert if error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      toast.error(res.error);
    } else if (nextStatus === "completed") {
      toast.success(`Görev tamamlandı! +${task.xp_reward} XP kazandın 🎉`);
    }

    setTogglingId(null);
  }

  // Group tasks by week
  const groupedTasks: Record<number, TaskRow[]> = {};
  tasks.forEach((t) => {
    const w = t.week_number || 1;
    if (!groupedTasks[w]) groupedTasks[w] = [];
    groupedTasks[w].push(t);
  });

  const weeks = Object.keys(groupedTasks).map(Number).sort((a, b) => a - b);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="text-lg font-bold text-[#0B1F4D]">
              Yapay Zekâ Destekli Görev Planı
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Eksiklerini kapatmak için hazırlanan görevleri tamamla, seviye atla ve XP kazan.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <span>İlerleme:</span>
          <span className="text-blue-600 font-extrabold">
            {tasks.filter((t) => t.status === "completed").length} / {tasks.length} Görev
          </span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">
          Henüz oluşturulmuş bir görev bulunmuyor.
        </div>
      ) : (
        <div className="space-y-6">
          {weeks.map((weekNum) => {
            const weekTasks = groupedTasks[weekNum];
            return (
              <div key={weekNum} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    {weekNum}. Hafta
                  </span>
                  <div className="h-px bg-slate-100 flex-1" />
                </div>

                <div className="space-y-2.5">
                  {weekTasks.map((task) => {
                    const isCompleted = task.status === "completed";
                    const isUpdating = togglingId === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                          isCompleted
                            ? "bg-slate-50/70 border-slate-200/60 opacity-80"
                            : "bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs"
                        }`}
                      >
                        {/* Interactive Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggle(task)}
                          disabled={isUpdating}
                          className="mt-0.5 text-slate-400 hover:text-blue-600 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 hover:text-blue-500" />
                          )}
                        </button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                isCompleted
                                  ? "line-through text-slate-400"
                                  : "text-slate-800"
                              }`}
                            >
                              {task.title}
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Award className="w-3 h-3 text-amber-600" />
                              +{task.xp_reward} XP
                            </span>
                          </div>

                          {task.description && (
                            <p
                              className={`text-xs mt-1 leading-relaxed ${
                                isCompleted ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 mt-2.5 text-[11px] text-slate-400">
                            {task.estimated_hours && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>~{task.estimated_hours} Saat</span>
                              </div>
                            )}

                            {task.resource_url && (
                              <a
                                href={task.resource_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <span>Kaynağa Git</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
