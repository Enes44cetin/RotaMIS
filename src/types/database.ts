export type UserRole = "student" | "admin";
export type SkillCategory = "technical" | "business" | "soft";
export type AssessmentStatus = "draft" | "completed";
export type LearningStyle = "video" | "reading" | "hands_on" | "mixed";
export type TaskStatus = "pending" | "in_progress" | "completed" | "skipped";
export type TaskResourceType =
  | "course"
  | "article"
  | "video"
  | "project"
  | "certification"
  | "practice"
  | "other";
export type RoadmapSource = "mock" | "gemini" | "admin";

export interface SkillGapRow {
  user_id: string;
  assessment_id: string;
  career_path_id: string | null;
  skill_id: string;
  skill_slug: string;
  category: SkillCategory;
  name_tr: string;
  name_en: string;
  sort_order: number;
  current_level: number;
  required_level: number;
  importance: number;
  gap: number;
}

export interface CategoryScoreRow {
  user_id: string;
  assessment_id: string;
  category: SkillCategory;
  avg_current: number;
  avg_required: number;
  readiness_pct: number;
}

export interface TaskRow {
  id: string;
  roadmap_id: string;
  user_id: string;
  skill_id: string | null;
  resource_id?: string | null;
  title: string;
  description: string | null;
  resource_url: string | null;
  resource_type: TaskResourceType;
  estimated_hours: number | null;
  difficulty: number;
  xp_reward: number;
  week_number: number | null;
  sort_order: number;
  status: TaskStatus;
  completed_at: string | null;
}

export interface DraftAssessmentRating {
  skill_id: string;
  level: number;
}

export interface DraftAssessment {
  id: string;
  user_id: string;
  status: AssessmentStatus;
  current_step: number;
  class_year: number | null;
  career_path_id: string | null;
  secondary_career_path_id: string | null;
  has_internship: boolean | null;
  weekly_hours: number | null;
  learning_style: LearningStyle | null;
  target_date: string | null;
  goals_note: string | null;
  ratings?: DraftAssessmentRating[];
}

export interface UserBadgeWithDetails {
  earned_at: string;
  badge: {
    id: string;
    name_tr: string;
    description_tr: string | null;
    icon: string | null;
  } | null;
}

