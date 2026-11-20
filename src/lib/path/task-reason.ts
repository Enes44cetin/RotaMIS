import type { SkillGapRow, TaskRow } from "@/types/database";

export interface TaskReasonSummary {
  headline: string;
  detail: string;
  demandBadge: string | null;
}

/**
 * Görev detay penceresinde "Neden Bu Görev?" kartını besler.
 * Kullanıcının gerçek beceri açığı (v_skill_gap) ve ilan talep oranını kullanır.
 */
export function buildTaskReason(
  task: Pick<TaskRow, "skill_id" | "skill">,
  skillGaps: SkillGapRow[],
  careerName: string
): TaskReasonSummary {
  const safeCareer = careerName?.trim() || "Hedef kariyer";
  const targetSkillId = task.skill_id || task.skill?.id || null;

  const matchedGap = targetSkillId
    ? skillGaps.find((g) => g.skill_id === targetSkillId) || null
    : null;

  if (matchedGap) {
    const skillName = matchedGap.name_tr;
    const current = Math.max(0, matchedGap.current_level || 0);
    const required = Math.max(1, matchedGap.required_level || 3);
    const gap = Math.max(0, matchedGap.gap || 0);
    const roundedDemand =
      typeof matchedGap.demand_pct === "number" && matchedGap.demand_pct > 0
        ? Math.round(matchedGap.demand_pct)
        : null;
    const demandBadge =
      matchedGap.display_badge ||
      (roundedDemand !== null ? `İlanların %${roundedDemand}'inde` : null);

    if (gap > 0) {
      const detail =
        roundedDemand !== null
          ? `${safeCareer} ilanlarının %${roundedDemand}'inde aranan ${skillName} becerindeki ${gap} seviyelik açığı (${current}/5 → ${required}/5) kapatmak için seçildi.`
          : `${safeCareer} hedefindeki ${skillName} becerinde sektör beklentisine (${current}/5 → ${required}/5) ulaşman için seçildi.`;

      return {
        headline: `${skillName} Açığını Kapatıyor (-${gap} Seviye)`,
        detail,
        demandBadge,
      };
    }

    return {
      headline: `${skillName} Yetkinliğini Pekiştiriyor`,
      detail: `${safeCareer} rolündeki ${skillName} yetkinliğini (${current}/5) pekiştirip sektörde öne çıkman için seçildi.`,
      demandBadge,
    };
  }

  if (task.skill?.name_tr) {
    return {
      headline: `${task.skill.name_tr} Odaklı Gelişim`,
      detail: `${safeCareer} kariyer patikandaki ${task.skill.name_tr} pratiğini güçlendirmek için önerildi.`,
      demandBadge: null,
    };
  }

  return {
    headline: "Sektörel Yetkinlik Gelişimi",
    detail: `${safeCareer} kariyer patikandaki temel sektörel yetkinliklerini güçlendirmek için önerildi.`,
    demandBadge: null,
  };
}
