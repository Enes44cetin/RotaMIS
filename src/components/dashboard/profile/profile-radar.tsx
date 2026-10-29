import { SkillRadar } from "@/components/charts/skill-radar";
import type { SkillGapRow } from "@/types/database";

interface ProfileRadarProps {
  skillGaps: SkillGapRow[];
}

export function ProfileRadar({ skillGaps }: ProfileRadarProps) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/80">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div>
          <h2 className="text-xs font-extrabold text-[#0B1F4D] uppercase tracking-wider">
            Beceri Radarı
          </h2>
          <p className="text-[11px] text-slate-500">
            Mavi: Sen • Turuncu: Sektör hedefi
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
          1-5 Ölçek
        </span>
      </div>

      <SkillRadar data={skillGaps} compact />
    </div>
  );
}

