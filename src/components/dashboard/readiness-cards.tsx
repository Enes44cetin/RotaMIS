interface CategoryScore {
  category: "technical" | "business" | "soft";
  avg_current: number;
  avg_required: number;
  readiness_pct: number;
}

interface SkillGapItem {
  skill_id: string;
  name_tr: string;
  category: string;
  current_level: number;
  required_level: number;
  gap: number;
  importance: number;
}

interface ReadinessCardsProps {
  categoryScores: CategoryScore[];
  topGaps: SkillGapItem[];
}

const CATEGORY_NAMES: Record<string, string> = {
  technical: "Teknik Beceriler",
  business: "İşletme ve Süreç",
  soft: "Sosyal Beceriler",
};

export function ReadinessCards({ categoryScores, topGaps }: ReadinessCardsProps) {
  // Calculate overall readiness
  const totalReadiness = categoryScores.length
    ? Math.round(
        categoryScores.reduce((acc, c) => acc + (c.readiness_pct || 0), 0) /
          categoryScores.length
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Category Progress Bars */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-[#0B1F4D] uppercase tracking-wider">
            Yetkinlik Dağılımı
          </h3>
          <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
            Genel: %{totalReadiness}
          </span>
        </div>

        <div className="space-y-4">
          {categoryScores.map((cat) => {
            const pct = Math.min(Math.max(cat.readiness_pct || 0, 0), 100);
            return (
              <div key={cat.category}>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">
                    {CATEGORY_NAMES[cat.category] || cat.category}
                  </span>
                  <div className="text-slate-500">
                    <span className="font-bold text-slate-800">%{pct}</span>
                    <span className="text-[10px] ml-1">
                      ({cat.avg_current} / {cat.avg_required})
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      pct >= 80
                        ? "bg-emerald-500"
                        : pct >= 50
                        ? "bg-blue-600"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority Gaps to focus on */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-sm text-[#0B1F4D] uppercase tracking-wider mb-4">
          Öncelikli Gelişim Alanların
        </h3>

        {topGaps.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500">
            Tebrikler! Belirlediğin kariyer hedefi için tüm gereksinimleri karşılıyorsun.
          </div>
        ) : (
          <div className="space-y-3">
            {topGaps.slice(0, 4).map((g) => (
              <div
                key={g.skill_id}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">{g.name_tr}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Sen: <span className="font-semibold text-slate-700">{g.current_level}/5</span> • Sektör:{" "}
                    <span className="font-semibold text-blue-700">{g.required_level}/5</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                    +{g.gap} Seviye Fark
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
