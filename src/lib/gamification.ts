import type { EffectiveStreakInfo } from "@/types/database";

export interface LevelStats {
  level: number;
  title: string;
  totalXp: number;
  currentLevelMinXp: number;
  nextLevelMinXp: number;
  xpIntoLevel: number;
  xpSpan: number;
  xpNeededForNext: number;
  progressPct: number;
}

const LEVEL_TITLES: Record<number, string> = {
  1: "YBS Keşifçisi",
  2: "Analitik Çırak",
  3: "Veri & Süreç Avcısı",
  4: "Sistem Uzman Adayı",
  5: "Dijital Dönüşüm Öncüsü",
  6: "Kariyer Mimarı",
};

export function getLevelTitle(level: number): string {
  if (level <= 1) return LEVEL_TITLES[1];
  if (LEVEL_TITLES[level]) return LEVEL_TITLES[level];
  return "Sektör Lideri";
}

/**
 * Mevcut seviye formülü: Level = floor(sqrt(totalXp / 40)) + 1
 * L. seviye taban XP: (L - 1)^2 * 40
 * (L + 1). seviye taban XP: L^2 * 40
 */
export function calculateLevelStats(rawTotalXp: number | null | undefined): LevelStats {
  const totalXp = Math.max(0, Math.floor(rawTotalXp || 0));
  const level = Math.floor(Math.sqrt(totalXp / 40)) + 1;

  const currentLevelMinXp = (level - 1) * (level - 1) * 40;
  const nextLevelMinXp = level * level * 40;
  const xpSpan = Math.max(1, nextLevelMinXp - currentLevelMinXp);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelMinXp);
  const xpNeededForNext = Math.max(0, nextLevelMinXp - totalXp);
  const progressPct = Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpSpan) * 100)));

  return {
    level,
    title: getLevelTitle(level),
    totalXp,
    currentLevelMinXp,
    nextLevelMinXp,
    xpIntoLevel,
    xpSpan,
    xpNeededForNext,
    progressPct,
  };
}

function formatIstanbulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Veritabanındaki `register_activity` fonksiyonuyla aynı zaman dilimini
 * (`Europe/Istanbul`) kullanarak bayat seri değerini canlı olarak hesaplar.
 */
export function computeEffectiveStreak(
  currentStreak: number | null | undefined,
  lastActivityDate: string | null | undefined,
  now: Date = new Date()
): EffectiveStreakInfo {
  const streak = Math.max(0, Math.floor(currentStreak || 0));
  if (streak === 0 || !lastActivityDate) {
    return { effectiveStreak: 0, status: "broken" };
  }

  const normalizedLast = lastActivityDate.slice(0, 10);
  const todayIstanbul = formatIstanbulDate(now);
  const yesterdayIstanbul = formatIstanbulDate(
    new Date(now.getTime() - 24 * 60 * 60 * 1000)
  );

  if (normalizedLast === todayIstanbul) {
    return { effectiveStreak: streak, status: "active_today" };
  }
  if (normalizedLast === yesterdayIstanbul) {
    return { effectiveStreak: streak, status: "at_risk" };
  }
  return { effectiveStreak: 0, status: "broken" };
}

export interface ReadinessMilestone {
  label: string;
  nextLabel: string | null;
  pointsToNext: number;
  tone: "slate" | "blue" | "emerald" | "amber";
}

export function getReadinessMilestone(readinessPct: number): ReadinessMilestone {
  const pct = Math.min(100, Math.max(0, Math.round(readinessPct || 0)));

  if (pct < 40) {
    return {
      label: "Keşif Aşaması",
      nextLabel: "Gelişim Aşaması",
      pointsToNext: 40 - pct,
      tone: "slate",
    };
  }
  if (pct < 60) {
    return {
      label: "Gelişim Aşaması",
      nextLabel: "Staja Hazır",
      pointsToNext: 60 - pct,
      tone: "amber",
    };
  }
  if (pct < 80) {
    return {
      label: "Staja Hazır",
      nextLabel: "Sektöre Hazır",
      pointsToNext: 80 - pct,
      tone: "blue",
    };
  }
  return {
    label: "Sektöre Hazır",
    nextLabel: null,
    pointsToNext: 0,
    tone: "emerald",
  };
}

