import type { LearningStyle, TaskResourceType } from "@/types/database";

export interface CatalogResourceCandidate {
  id: string;
  title: string;
  resource_type: TaskResourceType;
  estimated_hours: number | null;
  difficulty: number;
  sort_order: number;
  resource_skills: Array<{
    skill_id: string;
    min_level: number;
    target_level: number;
  }>;
}

export interface MatcherSkillGap {
  skill_id: string;
  skill_slug: string;
  name_tr: string;
  current_level: number;
  required_level: number;
  importance: number;
  gap: number;
}

export interface MatcherInput {
  sprintNumber: number;
  skillGaps: MatcherSkillGap[];
  catalogResources: CatalogResourceCandidate[];
  usedResourceIds: Set<string>;
  /** Bu 4'lü döngü içinde daha önce hangi beceriden kaç görev atandığı */
  cycleSkillCounts: Map<string, number>;
  weeklyHours: number | null;
  learningStyle: LearningStyle | null;
}

export interface MatchedResourceItem {
  resourceId: string;
  skillId: string | null;
  reasonCode: string;
}

export interface MatcherOutput {
  matcherVersion: string;
  items: MatchedResourceItem[];
  focusSkillIds: string[];
  /** Açığı olup katalogda uygun yeni kaynak bulunamayan beceriler (Admin analitiği için) */
  exhaustedSkillIds: string[];
}

/**
 * AI Takım Arkadaşı İçin Tak-Çalıştır Sözleşmesi (Strategy Pattern):
 * AI hiçbir görev başlığı, açıklaması veya URL SENTEZLEMEZ; yalnızca `catalogResources`
 * içinden en uygun `resourceId` listesini seçip döndürür. Metinler DB içinde kopyalanır.
 */
export interface ResourceMatcher {
  readonly version: string;
  selectResources(input: MatcherInput): Promise<MatcherOutput>;
}

