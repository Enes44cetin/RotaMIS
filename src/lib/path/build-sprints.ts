import { getCycleNumber, getSprintKind } from "./cycle";
import type {
  SkillGapRow,
  SprintRow,
  SprintUnit,
  TaskRow,
  TaskSkillSummary,
} from "@/types/database";

const CYCLE_STEP_PRESETS: Array<{
  firstCycleSuffix: string;
  laterCycleSuffix: string;
  subtitle: string;
  theme: SprintUnit["theme"];
}> = [
  {
    firstCycleSuffix: "Temelleri Atıyoruz",
    laterCycleSuffix: "Yeni Döngüye Başlıyoruz",
    subtitle:
      "Zaman baskısı yok — kendi hızında, istediğin görev düğümünden başlayarak ilerle.",
    theme: "royal",
  },
  {
    firstCycleSuffix: "Derinleşiyoruz",
    laterCycleSuffix: "Analitik Kasları Güçlendiriyoruz",
    subtitle:
      "Uygulamalı pratikler ve sektörel içeriklerle yetkinliklerini bir üst seviyeye taşı.",
    theme: "indigo",
  },
  {
    firstCycleSuffix: "Sahaya Çıkıyoruz",
    laterCycleSuffix: "Sektör Senaryoları",
    subtitle:
      "Gerçek iş problemlerine odaklanan görevlerle portföyünü ve pratiğini sağlamlaştır.",
    theme: "emerald",
  },
  {
    firstCycleSuffix: "Döngü Finali & Boss Durağı",
    laterCycleSuffix: "Döngü Finali & Boss Durağı",
    subtitle:
      "Bu sprinti tamamladığında Mini Check-Up kilidi açılacak ve gelişimin radarına yansıyacak!",
    theme: "amber",
  },
];

export function buildSprints(
  sprintRows: SprintRow[],
  tasks: TaskRow[],
  completedMiniSprintIds: Set<string>,
  fallbackTopGaps: SkillGapRow[] = [],
  roadmapSummary?: string | null
): SprintUnit[] {
  const skillById = new Map<string, TaskSkillSummary>();
  for (const t of tasks) {
    if (t.skill && t.skill.id) {
      skillById.set(t.skill.id, t.skill);
    }
  }
  for (const g of fallbackTopGaps) {
    if (!skillById.has(g.skill_id)) {
      skillById.set(g.skill_id, {
        id: g.skill_id,
        name_tr: g.name_tr,
        category: g.category,
      });
    }
  }

  // Geriye dönük güvenli yedek: Eğer DB'de sprint satırı henüz yoksa görevlerden Sprint 1 sentezle
  const effectiveSprints: SprintRow[] =
    sprintRows && sprintRows.length > 0
      ? [...sprintRows].sort((a, b) => a.sprint_number - b.sprint_number)
      : tasks.length > 0
      ? [
          {
            id: "legacy-sprint-1",
            roadmap_id: tasks[0].roadmap_id,
            user_id: tasks[0].user_id,
            sprint_number: 1,
            kind: "standard",
            status: "active",
            source_assessment_id: null,
            matcher_version: "legacy",
            focus_skill_ids: [],
            started_at: new Date().toISOString(),
            completed_at: null,
          },
        ]
      : [];

  if (effectiveSprints.length === 0) {
    return [];
  }

  const tasksBySprintId = new Map<string, TaskRow[]>();
  const orphanTasks: TaskRow[] = [];

  for (const task of tasks) {
    if (task.sprint_id) {
      const bucket = tasksBySprintId.get(task.sprint_id) || [];
      bucket.push(task);
      tasksBySprintId.set(task.sprint_id, bucket);
    } else {
      orphanTasks.push(task);
    }
  }

  return effectiveSprints.map((sp, idx) => {
    const rawSprintTasks =
      sp.id === "legacy-sprint-1"
        ? tasks
        : [
            ...(tasksBySprintId.get(sp.id) || []),
            ...(idx === 0 ? orphanTasks : []),
          ];

    const sprintTasks = [...rawSprintTasks].sort(
      (a, b) => a.sort_order - b.sort_order
    );

    const sprintNumber = sp.sprint_number;
    const cycleNumber = getCycleNumber(sprintNumber);
    const kind = sp.kind || getSprintKind(sprintNumber);
    const posIndex = (sprintNumber - 1) % 4;
    const preset = CYCLE_STEP_PRESETS[posIndex];

    const titleSuffix =
      cycleNumber === 1 ? preset.firstCycleSuffix : preset.laterCycleSuffix;

    const completedCount = sprintTasks.filter(
      (t) => t.status === "completed" || t.status === "skipped"
    ).length;
    const totalXp = sprintTasks.reduce((sum, t) => sum + (t.xp_reward || 0), 0);
    const earnedXp = sprintTasks
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + (t.xp_reward || 0), 0);

    // Hedef beceriler: önce görevlerin bağlı becerileri, yoksa focus_skill_ids, yoksa genel açıklar
    const focusMap = new Map<string, TaskSkillSummary>();
    for (const t of sprintTasks) {
      if (t.skill && t.skill.id) {
        focusMap.set(t.skill.id, t.skill);
      }
    }
    if (focusMap.size === 0 && sp.focus_skill_ids?.length) {
      for (const fid of sp.focus_skill_ids) {
        const found = skillById.get(fid);
        if (found) focusMap.set(fid, found);
      }
    }
    if (focusMap.size === 0 && fallbackTopGaps.length > 0) {
      for (const gap of fallbackTopGaps.filter((g) => g.gap > 0).slice(0, 3)) {
        focusMap.set(gap.skill_id, {
          id: gap.skill_id,
          name_tr: gap.name_tr,
          category: gap.category,
        });
      }
    }

    const isSealed = sp.status === "completed";
    const allTasksDone =
      sprintTasks.length > 0 && completedCount === sprintTasks.length;

    const inProgressTask = sprintTasks.find((t) => t.status === "in_progress");
    const firstPendingTask = sprintTasks.find((t) => t.status === "pending");
    const recommendedTaskId = isSealed
      ? null
      : inProgressTask?.id || firstPendingTask?.id || null;

    return {
      id: sp.id,
      sprintNumber,
      cycleNumber,
      kind,
      status: sp.status,
      title: `Sprint ${sprintNumber}: ${titleSuffix}`,
      subtitle:
        sprintNumber === 1 && roadmapSummary ? roadmapSummary : preset.subtitle,
      theme: preset.theme,
      tasks: sprintTasks,
      completedCount,
      totalXp,
      earnedXp,
      focusSkills: Array.from(focusMap.values()).slice(0, 4),
      allTasksDone,
      isSealed,
      miniCheckupCompleted: completedMiniSprintIds.has(sp.id),
      recommendedTaskId,
    };
  });
}
