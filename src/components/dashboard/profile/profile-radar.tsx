import { ShieldCheck } from "lucide-react";
import { SkillRadar } from "@/components/charts/skill-radar";
import { extractCareerRadarAxes } from "@/lib/checkup/topic-selector";
import type { SkillGapRow } from "@/types/database";

interface ProfileRadarProps {
  skillGaps: SkillGapRow[];
  careerName?: string;
  marketSummary?: string | null;
}

export function ProfileRadar({
  skillGaps,
  careerName,
  marketSummary,
}: ProfileRadarProps) {
  const radarAxes = extractCareerRadarAxes(skillGaps, 6);

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xs font-extrabold text-[#0B1F4D] uppercase tracking-wider truncate">
            {careerName ? `${careerName} Radarı` : "Mesleğe Özel Beceri Radarı"}
          </h2>
          <p className="text-[11px] text-slate-500">
            En çok aranan {radarAxes.length} sektörel yetkinlik • Mavi: Sen • Turuncu: Sektör
          </p>
        </div>
        <span className="text-[10px] font-bold text-[#2F5BFF] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md shrink-0">
          {radarAxes.length} Eksen
        </span>
      </div>

      {marketSummary && (
        <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{marketSummary}</span>
        </div>
      )}

      <SkillRadar data={radarAxes} compact />
    </div>
  );
}
