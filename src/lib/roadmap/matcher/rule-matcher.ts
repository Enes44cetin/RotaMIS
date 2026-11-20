import type {
  CatalogResourceCandidate,
  MatchedResourceItem,
  MatcherInput,
  MatcherOutput,
  MatcherSkillGap,
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
  if (style === "video")
    return resourceType === "video" || resourceType === "course";
  if (style === "reading")
    return resourceType === "article" || resourceType === "course";
  if (style === "hands_on")
    return resourceType === "practice" || resourceType === "project";
  return false;
}

function idealDifficultyForSprint(sprintNumber: number): number {
  const posInCycle = ((sprintNumber - 1) % 4) + 1; // 1..4
  if (posInCycle === 1) return 1;
  if (posInCycle === 2 || posInCycle === 3) return 2;
  return 3;
}

/**
 * Hem Kural Tabanlı (rule-v1) hem de Gemini AI eşleştiricisi için aday havuzunu
 * öğrencinin GERÇEK beceri açıklarına (gap > 0) ve MEVCUT SEVİYESİNİN ÜSTÜNDEKİ
 * (target_level > current_level) kademelere filtreler.
 */
export function filterEligibleCatalogForGaps(
  catalogResources: CatalogResourceCandidate[],
  skillGaps: MatcherSkillGap[],
  usedResourceIds: Set<string>
): CatalogResourceCandidate[] {
  const activeGapBySkillId = new Map<string, MatcherSkillGap>();
  for (const g of skillGaps) {
    if (g.gap > 0) {
      activeGapBySkillId.set(g.skill_id, g);
    }
  }

  if (activeGapBySkillId.size === 0) {
    return [];
  }

  const eligible: CatalogResourceCandidate[] = [];

  for (const res of catalogResources) {
    if (usedResourceIds.has(res.id)) continue;

    const validLinks = (res.resource_skills || []).filter((link) => {
      const gapInfo = activeGapBySkillId.get(link.skill_id);
      if (!gapInfo) return false;
      const effectiveCurrent = Math.max(1, gapInfo.current_level || 1);
      return link.target_level > effectiveCurrent;
    });

    if (validLinks.length > 0) {
      eligible.push({
        ...res,
        resource_skills: validLinks,
      });
    }
  }

  return eligible;
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

    const activeGaps = skillGaps.filter((g) => g.gap > 0);

    // Öğrencinin hiçbir beceri açığı yoksa (örn. tüm sorulara 5/5 verdiyse) 0 görev döndür!
    if (activeGaps.length === 0) {
      return {
        matcherVersion: this.version,
        items: [],
        focusSkillIds: [],
        exhaustedSkillIds: [],
      };
    }

    const targetCount = computeTargetTaskCount(weeklyHours);
    const idealDiff = idealDifficultyForSprint(sprintNumber);

    const eligibleCatalog = filterEligibleCatalogForGaps(
      catalogResources,
      skillGaps,
      usedResourceIds
    );

    const exhaustedSkillIds: string[] = [];
    for (const gap of activeGaps.slice(0, 4)) {
      const hasAnyEligibleForSkill = eligibleCatalog.some((r) =>
        (r.resource_skills || []).some((rs) => rs.skill_id === gap.skill_id)
      );
      if (!hasAnyEligibleForSkill) {
        exhaustedSkillIds.push(gap.skill_id);
      }
    }

    if (eligibleCatalog.length === 0) {
      return {
        matcherVersion: this.version,
        items: [],
        focusSkillIds: [],
        exhaustedSkillIds,
      };
    }

    const gapBySkillId = new Map(activeGaps.map((g) => [g.skill_id, g]));
    const selected: MatchedResourceItem[] = [];
    const chosenIds = new Set<string>();
    const sprintSkillCount = new Map<string, number>();
    const sprintTypeCount = new Map<TaskResourceType, number>();

    const pickPass = (relaxMinLevelFilter: boolean) => {
      while (selected.length < targetCount) {
        let bestCandidate: {
          resource: CatalogResourceCandidate;
          skillId: string;
          score: number;
          reason: string;
        } | null = null;

        for (const res of eligibleCatalog) {
          if (chosenIds.has(res.id)) continue;

          const links = res.resource_skills || [];
          let bestLinkSkillId: string | null = null;
          let bestSkillScore = -1;

          for (const link of links) {
            const gapInfo = gapBySkillId.get(link.skill_id);
            if (!gapInfo || gapInfo.gap <= 0) continue;

            const effectiveCurrent = Math.max(1, gapInfo.current_level || 1);

            // Asla öğrencinin mevcut seviyesinin altında veya eşit tavanlı görev seçme!
            if (link.target_level <= effectiveCurrent) continue;

            // Aynı sprintte tek beceriye ilk turda en fazla 1, ikinci turda en fazla 2 görev ver
            const countInThisSprint = sprintSkillCount.get(link.skill_id) || 0;
            if (!relaxMinLevelFilter && countInThisSprint >= 1) continue;
            if (relaxMinLevelFilter && countInThisSprint >= 2) continue;

            // Sıkı turda öğrencinin mevcut seviyesinin çok üstünden başlayan kademeyi beklet
            if (!relaxMinLevelFilter && link.min_level > effectiveCurrent + 1) {
              continue;
            }

            const priorCycleTasks = cycleSkillCounts.get(link.skill_id) || 0;
            const cycleDampener = Math.max(
              0.45,
              1 - priorCycleTasks * 0.2 + countInThisSprint * -0.35
            );

            // Doğrudan öğrencinin mevcut seviyesini kapsayan sıradaki kademeye yüksek öncelik ver
            const exactNextTierBonus =
              link.min_level <= effectiveCurrent &&
              link.target_level > effectiveCurrent
                ? 8
                : 0;

            const baseGapWeight =
              gapInfo.gap * gapInfo.importance * 12 * cycleDampener +
              exactNextTierBonus;

            if (baseGapWeight > bestSkillScore) {
              bestSkillScore = baseGapWeight;
              bestLinkSkillId = link.skill_id;
            }
          }

          if (bestSkillScore < 0 || !bestLinkSkillId) continue;

          let totalScore = bestSkillScore;
          if (matchesLearningStyle(learningStyle, res.resource_type)) {
            totalScore += 4;
          }

          const diffDelta = Math.abs((res.difficulty || 2) - idealDiff);
          totalScore += Math.max(0, 4 - diffDelta * 2);

          const usedSameType = sprintTypeCount.get(res.resource_type) || 0;
          if (usedSameType === 0) {
            totalScore += 2;
          }

          if (!bestCandidate || totalScore > bestCandidate.score) {
            bestCandidate = {
              resource: res,
              skillId: bestLinkSkillId,
              score: totalScore,
              reason: "skill_gap_match",
            };
          }
        }

        if (!bestCandidate) break;

        chosenIds.add(bestCandidate.resource.id);
        sprintSkillCount.set(
          bestCandidate.skillId,
          (sprintSkillCount.get(bestCandidate.skillId) || 0) + 1
        );
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

    // Tur 1: Her açık beceriden sıradaki kademe
    pickPass(false);

    // Tur 2: Sprint kapasitesi dolmadıysa aynı açık becerinin bir üst kademesini de ekle
    if (selected.length < targetCount) {
      pickPass(true);
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
