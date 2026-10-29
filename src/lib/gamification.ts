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

