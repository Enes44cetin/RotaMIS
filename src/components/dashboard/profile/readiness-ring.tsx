import type { CategoryScoreRow } from "@/types/database";

interface ReadinessRingProps {
  overallReadiness: number;
  categoryScores: CategoryScoreRow[];
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Teknik",
  business: "İşletme",
  soft: "Sosyal",
};

export function ReadinessRing({
  overallReadiness,
  categoryScores,
}: ReadinessRingProps) {
  const clamped = Math.min(100, Math.max(0, overallReadiness));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70 flex items-center gap-4">
      {/* Circular SVG Ring */}
      <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#2F5BFF"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute text-xs font-black text-[#0B1F4D] tabular-nums">
          %{clamped}
        </span>
      </div>

      {/* Category Mini Breakdown */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="text-[11px] font-extrabold text-[#0B1F4D] uppercase tracking-wider">
          Sektör Hazırlık Skoru
        </div>
        {categoryScores.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            Check-up verilerine göre hesaplanır.
          </p>
        ) : (
          <div className="space-y-1">
            {categoryScores.map((cat) => {
              const pct = Math.min(100, Math.max(0, Math.round(cat.readiness_pct || 0)));
              return (
                <div key={cat.category} className="flex items-center gap-2 text-[11px]">
                  <span className="w-14 text-slate-600 font-semibold truncate">
                    {CATEGORY_LABELS[cat.category] || cat.category}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 80
                          ? "bg-emerald-500"
                          : pct >= 50
                          ? "bg-[#2F5BFF]"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-bold text-slate-700 tabular-nums">
                    %{pct}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

