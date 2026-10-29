import { Sparkles, CheckCircle2, Target, Infinity as InfinityIcon, Swords } from "lucide-react";
import type { SprintUnit } from "@/types/database";

interface SprintHeaderProps {
  sprint: SprintUnit;
  roadmapTitle?: string | null;
}

const THEME_STYLES: Record<
  SprintUnit["theme"],
  {
    wrapper: string;
    pill: string;
    chip: string;
    progressBg: string;
    progressFill: string;
  }
> = {
  royal: {
    wrapper:
      "bg-gradient-to-r from-[#2F5BFF] via-[#244EE8] to-[#1A3BBF] border-b-4 border-[#132C91]",
    pill: "bg-white/15 border-white/25 text-white",
    chip: "bg-[#0B1F4D]/35 border-white/20 text-blue-50",
    progressBg: "bg-blue-950/35",
    progressFill: "bg-amber-300",
  },
  indigo: {
    wrapper:
      "bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 border-b-4 border-indigo-950/60",
    pill: "bg-white/15 border-white/25 text-white",
    chip: "bg-indigo-950/40 border-white/20 text-indigo-50",
    progressBg: "bg-indigo-950/40",
    progressFill: "bg-emerald-300",
  },
  emerald: {
    wrapper:
      "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 border-b-4 border-emerald-950/60",
    pill: "bg-white/15 border-white/25 text-white",
    chip: "bg-emerald-950/40 border-white/20 text-emerald-50",
    progressBg: "bg-emerald-950/40",
    progressFill: "bg-amber-300",
  },
  amber: {
    wrapper:
      "bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 border-b-4 border-rose-950/50",
    pill: "bg-white/20 border-white/30 text-white",
    chip: "bg-rose-950/35 border-white/20 text-amber-50",
    progressBg: "bg-rose-950/35",
    progressFill: "bg-white",
  },
};

export function SprintHeader({ sprint, roadmapTitle }: SprintHeaderProps) {
  const styles = THEME_STYLES[sprint.theme];
  const pct =
    sprint.tasks.length > 0
      ? Math.round((sprint.completedCount / sprint.tasks.length) * 100)
      : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-blue-900/10 ${styles.wrapper}`}
    >
      <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-white/90">
            <span className="inline-flex items-center gap-1.5">
              {sprint.kind === "checkpoint" ? (
                <Swords className="w-3.5 h-3.5 text-amber-200" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>
                {sprint.cycleNumber}. Döngü • {roadmapTitle || "Kariyer Patikası"}
              </span>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold normal-case tracking-normal">
              <InfinityIcon className="w-3 h-3" />
              <span>Kendi Hızında</span>
            </span>

            {sprint.isSealed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-200/40 text-emerald-50 text-[10px] font-extrabold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Tamamlandı</span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {sprint.title}
          </h2>

          <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
            {sprint.subtitle}
          </p>
        </div>

        {/* Completion Pill */}
        <div
          className={`self-start inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border backdrop-blur-xs text-xs font-extrabold shrink-0 tabular-nums ${styles.pill}`}
        >
          <CheckCircle2 className="w-4 h-4 text-amber-200" />
          <span>
            {sprint.completedCount} / {sprint.tasks.length} Görev
          </span>
          <span className="opacity-60">•</span>
          <span>{sprint.earnedXp}/{sprint.totalXp} XP</span>
        </div>
      </div>

      {/* Sprint Progress Bar */}
      <div className="relative z-10 mt-4">
        <div className={`h-2.5 w-full rounded-full overflow-hidden ${styles.progressBg}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${styles.progressFill}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Target Focus Skills Chips */}
      {sprint.focusSkills.length > 0 && (
        <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/80 mr-1">
            <Target className="w-3.5 h-3.5 text-amber-200" />
            <span>Odak Beceriler:</span>
          </span>
          {sprint.focusSkills.map((sk) => (
            <span
              key={sk.id}
              className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${styles.chip}`}
            >
              {sk.name_tr}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
