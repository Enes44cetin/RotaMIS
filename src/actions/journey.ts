"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchResourcesForNextSprint } from "@/lib/roadmap/matcher";
import type {
  CatalogResourceCandidate,
  MatcherSkillGap,
} from "@/lib/roadmap/matcher";
import { getCycleNumber } from "@/lib/path/cycle";
import {
  miniCheckupSchema,
  type MiniCheckupInput,
} from "@/lib/validation/student-schemas";
import type {
  LearningStyle,
  MiniCheckupSkillDelta,
  MiniCheckupSubmitResult,
} from "@/types/database";

export interface AdvanceSprintResult {
  ok: boolean;
  error?: string;
  sprintId?: string | null;
  sprintNumber?: number;
  catalogExhausted?: boolean;
}

/**
 * Hem ilk onboarding bitiminde (Sprint 1) hem de patika üzerindeki "Sıradaki Sprinte Geç"
 * kapılarında çalışan ortak sunucu fonksiyonu.
 */
export async function createNextSprintForUser(
  userId: string,
  roadmapId: string
): Promise<AdvanceSprintResult> {
  const adminClient = createAdminClient();

  const [
    { data: gaps },
    { data: latestAssess },
    { data: catalogResources },
    { data: existingSprints },
    { data: existingTasks },
  ] = await Promise.all([
    adminClient
      .from("v_skill_gap")
      .select(
        "skill_id, skill_slug, name_tr, gap, required_level, current_level, importance"
      )
      .eq("user_id", userId)
      .order("gap", { ascending: false })
      .order("importance", { ascending: false }),
    adminClient
      .from("v_latest_assessment")
      .select("career_path_id, weekly_hours, learning_style")
      .eq("user_id", userId)
      .maybeSingle(),
    adminClient
      .from("learning_resources")
      .select(
        `
        id,
        title,
        resource_type,
        estimated_hours,
        difficulty,
        sort_order,
        resource_skills (
          skill_id,
          min_level,
          target_level
        )
      `
      )
      .eq("status", "published")
      .order("sort_order"),
    adminClient
      .from("sprints")
      .select("id, sprint_number, kind, status")
      .eq("roadmap_id", roadmapId)
      .order("sprint_number", { ascending: true }),
    adminClient
      .from("tasks")
      .select("id, sprint_id, resource_id, skill_id, status")
      .eq("roadmap_id", roadmapId),
  ]);

  const sprintsList = existingSprints || [];
  const tasksList = existingTasks || [];

  // Mevcut aktif sprint varsa tüm görevlerinin bittiğinden emin ol
  const activeSprint = sprintsList.find((s) => s.status === "active");
  if (activeSprint) {
    const hasIncomplete = tasksList.some(
      (t) =>
        t.sprint_id === activeSprint.id &&
        t.status !== "completed" &&
        t.status !== "skipped"
    );
    if (hasIncomplete) {
      return {
        ok: false,
        error: "Yeni sprinte geçmek için mevcut sprintteki tüm görevleri tamamlamalısın.",
      };
    }
  }

  const maxSprintNumber =
    sprintsList.length > 0
      ? sprintsList[sprintsList.length - 1].sprint_number
      : 0;
  const nextSprintNumber = maxSprintNumber + 1;
  const targetCycleNumber = getCycleNumber(nextSprintNumber);

  const usedResourceIds = new Set<string>();
  for (const t of tasksList) {
    if (t.resource_id) {
      usedResourceIds.add(t.resource_id);
    }
  }

  // Bu döngü içindeki önceki sprintlerde hangi becerilere kaç görev verildiğini hesapla
  const sprintIdsInTargetCycle = new Set(
    sprintsList
      .filter((s) => getCycleNumber(s.sprint_number) === targetCycleNumber)
      .map((s) => s.id)
  );
  const cycleSkillCounts = new Map<string, number>();
  for (const t of tasksList) {
    if (t.sprint_id && sprintIdsInTargetCycle.has(t.sprint_id) && t.skill_id) {
      cycleSkillCounts.set(
        t.skill_id,
        (cycleSkillCounts.get(t.skill_id) || 0) + 1
      );
    }
  }

  const skillGaps = (gaps as unknown as MatcherSkillGap[]) || [];
  const candidates =
    (catalogResources as unknown as CatalogResourceCandidate[]) || [];

  const matchResult = await matchResourcesForNextSprint({
    sprintNumber: nextSprintNumber,
    skillGaps,
    catalogResources: candidates,
    usedResourceIds,
    cycleSkillCounts,
    weeklyHours: latestAssess?.weekly_hours ?? null,
    learningStyle: (latestAssess?.learning_style as LearningStyle | null) ?? null,
  });

  // Eksik katalog sinyallerini Admin Paneli için kaydet (tekrarsız)
  if (matchResult.exhaustedSkillIds.length > 0) {
    const gapLookup = new Map(skillGaps.map((g) => [g.skill_id, g]));
    const { data: existingDemands } = await adminClient
      .from("catalog_demand")
      .select("skill_id")
      .eq("user_id", userId)
      .eq("resolved", false);

    const alreadyLogged = new Set(
      (existingDemands || []).map((d) => d.skill_id).filter(Boolean)
    );

    const demandRows = matchResult.exhaustedSkillIds
      .filter((skillId) => !alreadyLogged.has(skillId))
      .map((skillId) => ({
        user_id: userId,
        career_path_id: latestAssess?.career_path_id ?? null,
        skill_id: skillId,
        current_level: gapLookup.get(skillId)?.current_level ?? null,
        sprint_number: nextSprintNumber,
      }));

    if (demandRows.length > 0) {
      await adminClient.from("catalog_demand").insert(demandRows);
    }
  }

  // Katalogdaki tüm onaylı kaynaklar bu öğrenci tarafından tamamlanmışsa
  if (matchResult.items.length === 0) {
    if (activeSprint && activeSprint.kind === "standard") {
      await adminClient
        .from("sprints")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", activeSprint.id);
    }

    return {
      ok: true,
      catalogExhausted: true,
      sprintId: null,
      sprintNumber: maxSprintNumber,
    };
  }

  const rpcPayload = matchResult.items.map((item) => ({
    resource_id: item.resourceId,
    skill_id: item.skillId,
  }));

  const { data: newSprintId, error: rpcError } = await adminClient.rpc(
    "append_sprint",
    {
      p_user_id: userId,
      p_roadmap_id: roadmapId,
      p_items: rpcPayload,
      p_matcher_version: matchResult.matcherVersion,
      p_focus_skill_ids: matchResult.focusSkillIds,
    }
  );

  if (rpcError) {
    return {
      ok: false,
      error: rpcError.message || "Yeni sprint oluşturulurken bir hata oluştu.",
    };
  }

  return {
    ok: true,
    catalogExhausted: false,
    sprintId: newSprintId as string,
    sprintNumber: nextSprintNumber,
  };
}

export async function advanceSprint(): Promise<AdvanceSprintResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Oturum açmanız gerekiyor." };
  }

  const { data: activeRoadmap } = await supabase
    .from("roadmaps")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!activeRoadmap) {
    return { ok: false, error: "Aktif bir kariyer patikası bulunamadı." };
  }

  const res = await createNextSprintForUser(user.id, activeRoadmap.id);

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return res;
}

export async function submitMiniCheckup(
  rawInput: MiniCheckupInput
): Promise<MiniCheckupSubmitResult> {
  const parsed = miniCheckupSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ||
        "Geçersiz değerlendirme verisi gönderildi.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Oturum açmanız gerekiyor." };
  }

  const skillIds = parsed.data.ratings.map((r) => r.skillId);

  // Önceki seviyeleri al (Boss Yenildi ekranındaki karşılaştırmalı fark gösterimi için)
  const [{ data: beforeGaps }, { data: skillCatalog }] = await Promise.all([
    supabase
      .from("v_skill_gap")
      .select("skill_id, name_tr, current_level, required_level")
      .eq("user_id", user.id)
      .in("skill_id", skillIds),
    supabase.from("skills").select("id, name_tr").in("id", skillIds),
  ]);

  const beforeMap = new Map(
    (beforeGaps || []).map((g) => [g.skill_id, g])
  );
  const nameMap = new Map(
    (skillCatalog || []).map((s) => [s.id, s.name_tr])
  );

  const rpcRatings = parsed.data.ratings.map((r) => ({
    skill_id: r.skillId,
    level: r.level,
  }));

  const { data, error } = await supabase.rpc("submit_mini_checkup", {
    p_sprint_id: parsed.data.sprintId,
    p_ratings: rpcRatings,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "Mini Check-Up kaydedilirken bir hata oluştu.",
    };
  }

  const deltas: MiniCheckupSkillDelta[] = parsed.data.ratings.map((r) => {
    const prev = beforeMap.get(r.skillId);
    return {
      skillId: r.skillId,
      nameTr: prev?.name_tr || nameMap.get(r.skillId) || "Beceri",
      previousLevel: prev?.current_level ?? 1,
      newLevel: r.level,
      requiredLevel: prev?.required_level ?? 4,
    };
  });

  const rpcResult = (data as { xp_awarded?: number } | null) || {};

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return {
    ok: true,
    xpAwarded: rpcResult.xp_awarded ?? 50,
    deltas,
  };
}

