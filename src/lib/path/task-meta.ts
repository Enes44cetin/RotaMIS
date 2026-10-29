import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  PlayCircle,
  FileText,
  Hammer,
  Award,
  Dumbbell,
  Sparkles,
  Flame,
  Zap,
  Target,
  Trophy,
  Compass,
  CheckCircle2,
  Crown,
  Star,
  Rocket,
  Medal,
  ShieldCheck,
} from "lucide-react";
import type { TaskResourceType } from "@/types/database";

export interface ResourceTypeMeta {
  label: string;
  shortLabel: string;
  Icon: LucideIcon;
  pillClass: string;
  iconColorClass: string;
}

export const RESOURCE_TYPE_META: Record<TaskResourceType, ResourceTypeMeta> = {
  course: {
    label: "Eğitim Kursu",
    shortLabel: "Kurs",
    Icon: GraduationCap,
    pillClass: "bg-blue-50 text-blue-700 border-blue-200/80",
    iconColorClass: "text-[#2F5BFF]",
  },
  video: {
    label: "Video İçerik",
    shortLabel: "Video",
    Icon: PlayCircle,
    pillClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    iconColorClass: "text-indigo-600",
  },
  article: {
    label: "Makale & Doküman",
    shortLabel: "Doküman",
    Icon: FileText,
    pillClass: "bg-sky-50 text-sky-700 border-sky-200/80",
    iconColorClass: "text-sky-600",
  },
  project: {
    label: "Uygulamalı Proje",
    shortLabel: "Proje",
    Icon: Hammer,
    pillClass: "bg-violet-50 text-violet-700 border-violet-200/80",
    iconColorClass: "text-violet-600",
  },
  certification: {
    label: "Sertifika Programı",
    shortLabel: "Sertifika",
    Icon: Award,
    pillClass: "bg-amber-50 text-amber-800 border-amber-200/80",
    iconColorClass: "text-amber-600",
  },
  practice: {
    label: "İnteraktif Pratik",
    shortLabel: "Pratik",
    Icon: Dumbbell,
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    iconColorClass: "text-emerald-600",
  },
  other: {
    label: "Gelişim Görevi",
    shortLabel: "Görev",
    Icon: Sparkles,
    pillClass: "bg-slate-100 text-slate-700 border-slate-200/80",
    iconColorClass: "text-[#2F5BFF]",
  },
};

export function getResourceMeta(type: TaskResourceType | string | null | undefined): ResourceTypeMeta {
  if (type && type in RESOURCE_TYPE_META) {
    return RESOURCE_TYPE_META[type as TaskResourceType];
  }
  return RESOURCE_TYPE_META.other;
}

export function getDifficultyLabel(difficulty: number | null | undefined): string {
  switch (difficulty) {
    case 1:
      return "Başlangıç";
    case 2:
      return "Orta Seviye";
    case 3:
      return "İleri Düzey";
    default:
      return "Standart";
  }
}

const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  flame: Flame,
  fire: Flame,
  streak: Flame,
  award: Award,
  sparkles: Sparkles,
  zap: Zap,
  bolt: Zap,
  target: Target,
  trophy: Trophy,
  compass: Compass,
  check: CheckCircle2,
  "check-circle": CheckCircle2,
  crown: Crown,
  star: Star,
  rocket: Rocket,
  medal: Medal,
  shield: ShieldCheck,
  graduation: GraduationCap,
};

export function resolveBadgeIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Trophy;
  const normalized = iconName.trim().toLowerCase();
  return BADGE_ICON_MAP[normalized] || Trophy;
}

export function formatBadgeCriteria(
  criteriaType: string,
  criteriaValue: number
): string {
  switch (criteriaType) {
    case "tasks_completed":
      return `${criteriaValue} görev tamamla`;
    case "xp_total":
      return `${criteriaValue} toplam XP'ye ulaş`;
    case "streak_days":
      return `${criteriaValue} günlük seri yakala`;
    case "assessments_completed":
      return `${criteriaValue} beceri check-up'ı tamamla`;
    default:
      return "Hedefi tamamla";
  }
}

