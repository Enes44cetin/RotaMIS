import type {
  CatalogResourceCandidate,
  MatchedResourceItem,
  MatcherInput,
  MatcherOutput,
  ResourceMatcher,
} from "./types";
import type { LearningStyle, TaskResourceType } from "@/types/database";

function computeTargetTaskCount(weeklyHours: number | null): number {
  if (!weeklyHours) return 4;
  if (weeklyHours <= 5) return 3;
  if (weeklyHours >= 14) return 5;
  return 4;
}

function matchesLearningStyle(
  style: LearningStyle | null,
  resourceType: TaskResourceType
): boolean {
  if (!style || style === "mixed") return false;
  if (style === "video") return resourceType === "video" || resourceType === "course";
  if (style === "reading") return resourceType === "article" || resourceType === "course";
  if (style === "hands_on") return resourceType === "practice" || resourceType === "project";
  return false;
}

function idealDifficultyForSprint(sprintNumber: number): number {
  const posInCycle = ((sprintNumber - 1) % 4) + 1; // 1..4
  if (posInCycle === 1) return 1;
  if (posInCycle === 2 || posInCycle === 3) return 2;
  return 3;
}

export class DeterministicRuleMatcher implements ResourceMatcher {
  public readonly version = "rule-v1";

  public async selectResources(input: MatcherInput): Promise<MatcherOutput> {
    const {
      sprintNumber,
      skillGaps,
      catalogResources,
      usedResourceIds,
      cycleSkillCounts,
      weeklyHours,
      learningStyle,
    } = input;

    const targetCount = computeTargetTaskCount(weeklyHours);
    const idealDiff = idealDifficultyForSprint(sprintNumber);

    const unusedCatalog = catalogResources.filter(
      (r) => !usedResourceIds.has(r.id)
    );

    if (unusedCatalog.length === 0) {
      const openSkillIds = skillGaps
        .filter((g) => g.gap > 0)
        .slice(0, 3)
        .map((g) => g.skill_id);
      return {
        matcherVersion: this.version,
        items: [],
        focusSkillIds: [],
        exhaustedSkillIds: openSkillIds,
      };
    }

    const gapBySkillId = new Map(skillGaps.map((g) => [g.skill_id, g]));
    const activeGaps = skillGaps.filter((g) => g.gap > 0);
    const exhaustedSkillIds: string[] = [];

    // Katalog kapsam kontrolü: Açığı olan becerilerden hiç kullanılmamış kaynağı kalmayanları işaretle
    for (const gap of activeGaps.slice(0, 4)) {
      const hasAnyUnusedForSkill = unusedCatalog.some((r) =>
        (r.resource_skills || []).some((rs) => rs.skill_id === gap.skill_id)
      );
      if (!hasAnyUnusedForSkill) {
        exhaustedSkillIds.push(gap.skill_id);
      }
    }

    const selected: MatchedResourceItem[] = [];
    const chosenIds = new Set<string>();
    const sprintSkillCount = new Map<string, number>();
    const sprintTypeCount = new Map<TaskResourceType, number>();

    // Adım 1: Sıkı seviye uyumu + açık önceliği ile puanlayarak seç
    const pickPass = (relaxLevelFilter: boolean, allowZeroGapCareerSkills: boolean) => {
      while (selected.length < targetCount) {
        let bestCandidate: {
          resource: CatalogResourceCandidate;
          skillId: string | null;
          score: number;
          reason: string;
        } | null = null;

        for (const res of unusedCatalog) {
          if (chosenIds.has(res.id)) continue;

          const links = res.resource_skills || [];
          let bestLinkSkillId: string | null = null;
          let bestSkillScore = -1;
          let bestReason = "general_enrichment";

          for (const link of links) {
            const gapInfo = gapBySkillId.get(link.skill_id);
            if (!gapInfo) continue;

            if (!allowZeroGapCareerSkills && gapInfo.gap <= 0) continue;

            // Aynı sprintte tek beceriye en fazla 2 görev yığılsın
            const countInThisSprint = sprintSkillCount.get(link.skill_id) || 0;
            if (countInThisSprint >= 2 && !relaxLevelFilter) continue;

            // Seviye uygunluğu (sıkı turda öğrenci seviyesinin çok üstündeki kaynağı ele)
            const effectiveCurrent = Math.max(1, gapInfo.current_level);
            if (!relaxLevelFilter && link.min_level > effectiveCurrent + 1) {
              continue;
            }

            // Bu döngüde daha önce çok çalışılan becerinin ağırlığını hafifçe azalt ki patika çeşitlensin
            const priorCycleTasks = cycleSkillCounts.get(link.skill_id) || 0;
            const cycleDampener = Math.max(0.45, 1 - priorCycleTasks * 0.2 + countInThisSprint * -0.25);

            const baseGapWeight =
              gapInfo.gap > 0
                ? gapInfo.gap * gapInfo.importance * 12 * cycleDampener
                : gapInfo.importance * 4 * cycleDampener;

            if (baseGapWeight > bestSkillScore) {
              bestSkillScore = baseGapWeight;
              bestLinkSkillId = link.skill_id;
              bestReason = gapInfo.gap > 0 ? "skill_gap_match" : "career_reinforcement";
            }
          }

          if (bestSkillScore < 0) continue;

          // Ek bonuslar: Öğrenme stili + Zorluk uyumu + Kaynak türü çeşitliliği
          let totalScore = bestSkillScore;
          if (matchesLearningStyle(learningStyle, res.resource_type)) {
            totalScore += 5;
          }

          const diffDelta = Math.abs((res.difficulty || 2) - idealDiff);
          totalScore += Math.max(0, 4 - diffDelta * 2);

          const usedSameType = sprintTypeCount.get(res.resource_type) || 0;
          if (usedSameType === 0) {
            totalScore += 3;
          }

          if (!bestCandidate || totalScore > bestCandidate.score) {
            bestCandidate = {
              resource: res,
              skillId: bestLinkSkillId,
              score: totalScore,
              reason: bestReason,
            };
          }
        }

        if (!bestCandidate) break;

        chosenIds.add(bestCandidate.resource.id);
        if (bestCandidate.skillId) {
          sprintSkillCount.set(
            bestCandidate.skillId,
            (sprintSkillCount.get(bestCandidate.skillId) || 0) + 1
          );
        }
        sprintTypeCount.set(
          bestCandidate.resource.resource_type,
          (sprintTypeCount.get(bestCandidate.resource.resource_type) || 0) + 1
        );

        selected.push({
          resourceId: bestCandidate.resource.id,
          skillId: bestCandidate.skillId,
          reasonCode: bestCandidate.reason,
        });
      }
    };

    // Tur 1: Açığı olan beceriler + uygun seviye
    pickPass(false, false);

    // Tur 2: Yeterli görev çıkmadıysa seviye filtresini gevşet
    if (selected.length < targetCount) {
      pickPass(true, false);
    }

    // Tur 3: Hâlâ azsa kariyerdeki pekiştirme (gap = 0) becerilerini de dahil et
    if (selected.length < Math.min(3, targetCount)) {
      pickPass(true, true);
    }

    // Tur 4: Son çare — genel katalogdan kullanılmamış kaynaklarla en az 2-3 göreve tamamla
    if (selected.length < Math.min(3, targetCount)) {
      for (const res of unusedCatalog) {
        if (selected.length >= Math.min(3, targetCount)) break;
        if (chosenIds.has(res.id)) continue;

        chosenIds.add(res.id);
        const fallbackSkillId = res.resource_skills?.[0]?.skill_id || null;
        selected.push({
          resourceId: res.id,
          skillId: fallbackSkillId,
          reasonCode: "catalog_fallback",
        });
      }
    }

    const focusSkillIds = Array.from(
      new Set(
        selected
          .map((item) => item.skillId)
          .filter((id): id is string => Boolean(id))
      )
    ).slice(0, 4);

    return {
      matcherVersion: this.version,
      items: selected,
      focusSkillIds,
      exhaustedSkillIds,
    };
  }
}

export const ruleMatcher = new DeterministicRuleMatcher();

