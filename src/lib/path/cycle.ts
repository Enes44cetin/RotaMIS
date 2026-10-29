import type { SprintKind, SprintUnit } from "@/types/database";

export const SPRINTS_PER_CYCLE = 4;

export function getCycleNumber(sprintNumber: number): number {
  return Math.max(1, Math.ceil(sprintNumber / SPRINTS_PER_CYCLE));
}

export function isCheckpointSprintNumber(sprintNumber: number): boolean {
  return sprintNumber > 0 && sprintNumber % SPRINTS_PER_CYCLE === 0;
}

export function getSprintKind(sprintNumber: number): SprintKind {
  return isCheckpointSprintNumber(sprintNumber) ? "checkpoint" : "standard";
}

export interface CompletedCycleGroup {
  cycleNumber: number;
  sprints: SprintUnit[];
  totalTasks: number;
  totalEarnedXp: number;
}

/**
 * Geçmişte tamamlanmış 4'lü döngüleri (Cycle 1, Cycle 2...) katlanabilir özet kartları için ayırır;
 * öğrencinin şu an içinde bulunduğu aktif döngünün sprintlerini ise açık tutar.
 */
export function partitionCycles(sprints: SprintUnit[]): {
  pastCycles: CompletedCycleGroup[];
  activeCycleSprints: SprintUnit[];
} {
  if (sprints.length === 0) {
    return { pastCycles: [], activeCycleSprints: [] };
  }

  const maxSprintNumber = sprints[sprints.length - 1].sprintNumber;
  const currentCycleNumber = getCycleNumber(maxSprintNumber);

  // Eğer en son sprint bir döngünün son sprintiyse (örn: Sprint 4) ve Boss da tamamlanmışsa,
  // ama henüz Sprint 5 açılmamışsa bu döngüyü yine ekranda açık tutalım ki kullanıcı kapıyı görsün.
  const byCycle = new Map<number, SprintUnit[]>();
  for (const s of sprints) {
    const bucket = byCycle.get(s.cycleNumber) || [];
    bucket.push(s);
    byCycle.set(s.cycleNumber, bucket);
  }

  const pastCycles: CompletedCycleGroup[] = [];
  const activeCycleSprints: SprintUnit[] = [];

  for (const [cycleNum, cycleSprints] of Array.from(byCycle.entries()).sort(
    (a, b) => a[0] - b[0]
  )) {
    const allSealed =
      cycleSprints.length === SPRINTS_PER_CYCLE &&
      cycleSprints.every((s) => s.isSealed);

    if (cycleNum < currentCycleNumber && allSealed) {
      pastCycles.push({
        cycleNumber: cycleNum,
        sprints: cycleSprints,
        totalTasks: cycleSprints.reduce((acc, s) => acc + s.tasks.length, 0),
        totalEarnedXp: cycleSprints.reduce((acc, s) => acc + s.earnedXp, 0),
      });
    } else {
      activeCycleSprints.push(...cycleSprints);
    }
  }

  return { pastCycles, activeCycleSprints };
}

