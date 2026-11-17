"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  bulkImportMarketSchema,
  type BulkImportMarketInput,
} from "@/lib/validation/admin-schemas";
import { slugifyTr } from "@/lib/admin/slugify";
import { logAdminAction } from "@/lib/admin/audit";

export async function importMarketDataAction(rawInput: BulkImportMarketInput) {
  try {
    const session = await requireAdmin();
    const parsed = bulkImportMarketSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Geçersiz veri formatı gönderildi.",
      };
    }

    const data = parsed.data;
    const adminClient = createAdminClient();

    // 1. Kariyer Rotasını Belirle veya Yeni Oluştur
    let targetCareerId = data.careerPathId || "";
    let targetCareerName = data.newCareerNameTr || "Kariyer Rotası";

    if (data.mode === "new_career") {
      const nameTr = (data.newCareerNameTr || "").trim();
      if (nameTr.length < 2) {
        return {
          success: false,
          error: "Yeni kariyer rotası için geçerli bir isim giriniz.",
        };
      }
      const slug = slugifyTr(nameTr) || `career-${Date.now()}`;
      const marketSummary = `${data.marketScope} Piyasa Analizi · ${data.totalPostings} İş İlanı`;

      const { data: existingCareer } = await adminClient
        .from("career_paths")
        .select("id, name_tr")
        .eq("slug", slug)
        .maybeSingle();

      if (existingCareer) {
        targetCareerId = existingCareer.id;
        targetCareerName = existingCareer.name_tr;
      } else {
        const { data: createdCareer, error: createCareerErr } =
          await adminClient
            .from("career_paths")
            .insert({
              slug,
              name_tr: nameTr,
              name_en: nameTr,
              description_tr:
                data.newCareerDescriptionTr ||
                `${nameTr} alanı için gerçek iş ilanı verileriyle oluşturulmuş kariyer rotası.`,
              description_en: nameTr,
              icon: "code-2",
              is_active: true,
              sort_order: 1,
            })
            .select("id, name_tr")
            .single();

        if (createCareerErr || !createdCareer) {
          return {
            success: false,
            error:
              "Yeni kariyer rotası oluşturulamadı: " +
              (createCareerErr?.message || ""),
          };
        }
        targetCareerId = createdCareer.id;
        targetCareerName = createdCareer.name_tr;
      }

      // Sektör meta alanlarını güncelle (Migration 13 uygulandıysa)
      await adminClient
        .from("career_paths")
        .update({
          market_summary: marketSummary,
          total_postings: data.totalPostings,
          market_scope: data.marketScope,
          scope_warning: data.scopeWarning,
        })
        .eq("id", targetCareerId);
    } else {
      if (!targetCareerId) {
        return {
          success: false,
          error: "Lütfen hedef kariyer rotasını seçin.",
        };
      }
      const { data: existingCareer } = await adminClient
        .from("career_paths")
        .select("id, name_tr")
        .eq("id", targetCareerId)
        .single();

      if (!existingCareer) {
        return {
          success: false,
          error: "Seçilen kariyer rotası bulunamadı.",
        };
      }
      targetCareerName = existingCareer.name_tr;

      const marketSummary = `${data.marketScope} Piyasa Analizi · ${data.totalPostings} İş İlanı`;
      await adminClient
        .from("career_paths")
        .update({
          market_summary: marketSummary,
          total_postings: data.totalPostings,
          market_scope: data.marketScope,
          scope_warning: data.scopeWarning,
        })
        .eq("id", targetCareerId);
    }

    // 2. Mevcut Becerileri Çek ve Eşleştir / Eksikleri Oluştur
    const { data: existingSkills } = await adminClient
      .from("skills")
      .select("id, slug, name_tr");

    const skillBySlug = new Map<string, string>();
    const skillByName = new Map<string, string>();

    for (const sk of existingSkills || []) {
      skillBySlug.set(sk.slug.toLowerCase(), sk.id);
      skillByName.set(sk.name_tr.trim().toLowerCase(), sk.id);
    }

    let createdSkillsCount = 0;
    const resolvedItems: Array<{
      skill_id: string;
      required_level: number;
      importance: number;
      is_radar_axis: boolean;
      axis_order: number | null;
      axis_label_tr: string | null;
      demand_pct: number;
      mention_count: number;
      total_postings: number;
      priority_label: string;
      display_badge: string;
      is_core_checkup: boolean;
    }> = [];

    const seenSkillIds = new Set<string>();

    for (let i = 0; i < data.skills.length; i++) {
      const item = data.skills[i];
      const normSlug = slugifyTr(item.slug || item.nameTr) || `skill-${i}`;
      const normName = item.nameTr.trim().toLowerCase();

      let skillId =
        skillBySlug.get(normSlug) ||
        skillBySlug.get(item.slug.toLowerCase()) ||
        skillByName.get(normName);

      if (!skillId) {
        // Yeni beceri oluştur
        const { data: newSkill, error: skillErr } = await adminClient
          .from("skills")
          .insert({
            slug: normSlug,
            category: item.category,
            name_tr: item.nameTr.trim(),
            name_en: item.nameTr.trim(),
            description_tr: item.displayBadge
              ? `Sektör talebi: ${item.displayBadge} (${item.priorityLabel})`
              : `${targetCareerName} sektörel yetkinliği`,
            icon:
              item.category === "technical"
                ? "code"
                : item.category === "business"
                ? "workflow"
                : "message-circle",
            is_active: true,
            sort_order: i + 1,
          })
          .select("id")
          .single();

        if (!skillErr && newSkill) {
          const createdId = newSkill.id as string;
          skillId = createdId;
          skillBySlug.set(normSlug, createdId);
          skillByName.set(normName, createdId);
          createdSkillsCount++;

          if (item.promptTr) {
            await adminClient
              .from("skills")
              .update({
                prompt_tr: item.promptTr,
                market_category: item.marketCategory || null,
              })
              .eq("id", skillId);
          }
        }
      } else {
        // Mevcut beceriyi aktif tut ve varsa prompt_tr güncelle
        await adminClient
          .from("skills")
          .update({
            is_active: true,
            ...(item.promptTr ? { prompt_tr: item.promptTr } : {}),
          })
          .eq("id", skillId);
      }

      if (skillId && !seenSkillIds.has(skillId)) {
        seenSkillIds.add(skillId);
        resolvedItems.push({
          skill_id: skillId,
          required_level: item.requiredLevel,
          importance: item.importance,
          is_radar_axis: item.isRadarAxis,
          axis_order: item.isRadarAxis ? item.axisOrder || i + 1 : null,
          axis_label_tr: item.axisLabelTr || item.nameTr,
          demand_pct: item.demandPct,
          mention_count: item.mentionCount,
          total_postings: item.totalPostings,
          priority_label: item.priorityLabel,
          display_badge: item.displayBadge,
          is_core_checkup: item.isCoreCheckup,
        });
      }
    }

    // 3. Eğer hiçbir radar ekseni seçilmediyse en yüksek yüzdeli ilk 6 tanesini otomatik seç
    const currentAxes = resolvedItems.filter((r) => r.is_radar_axis);
    if (currentAxes.length === 0) {
      resolvedItems.slice(0, 6).forEach((r, idx) => {
        r.is_radar_axis = true;
        r.axis_order = idx + 1;
      });
    } else {
      // Sıra numaralarını 1..N olarak normalize et
      currentAxes
        .sort((a, b) => (a.axis_order ?? 99) - (b.axis_order ?? 99))
        .forEach((r, idx) => {
          r.axis_order = idx + 1;
        });
    }

    // 4. Önceki matrisi yedekle (Rollback desteği için)
    const { data: prevReqs } = await adminClient
      .from("career_path_skill_requirements")
      .select("*")
      .eq("career_path_id", targetCareerId);

    // 5. Matrisi güncelle
    await adminClient
      .from("career_path_skill_requirements")
      .delete()
      .eq("career_path_id", targetCareerId);

    // Önce yeni sektörel kolonlarla eklemeyi dene, eğer Migration 13 henüz çalıştırılmadıysa temel kolonlarla ekle
    const fullRows = resolvedItems.map((r) => ({
      career_path_id: targetCareerId,
      skill_id: r.skill_id,
      required_level: r.required_level,
      importance: r.importance,
      is_radar_axis: r.is_radar_axis,
      axis_order: r.axis_order,
      axis_label_tr: r.axis_label_tr,
      demand_pct: r.demand_pct,
      mention_count: r.mention_count,
      total_postings: r.total_postings,
      priority_label: r.priority_label,
      display_badge: r.display_badge,
      is_core_checkup: r.is_core_checkup,
      data_source: "market_import",
    }));

    const { error: insertFullErr } = await adminClient
      .from("career_path_skill_requirements")
      .insert(fullRows);

    if (insertFullErr) {
      // Fallback: Temel kolonlarla ekle
      const basicRows = resolvedItems.map((r) => ({
        career_path_id: targetCareerId,
        skill_id: r.skill_id,
        required_level: r.required_level,
        importance: r.importance,
        data_source: "market_import",
      }));
      const { error: insertBasicErr } = await adminClient
        .from("career_path_skill_requirements")
        .insert(basicRows);

      if (insertBasicErr) {
        return {
          success: false,
          error: "Matris kaydedilirken hata oluştu: " + insertBasicErr.message,
        };
      }
    }

    const radarCount = resolvedItems.filter((r) => r.is_radar_axis).length;

    // 6. Toplu yükleme geçmişi (market_import_batches) ve Audit Log kaydı
    await adminClient.from("market_import_batches").insert({
      career_path_id: targetCareerId,
      file_name: data.fileName,
      market_scope: data.marketScope,
      role_filter: data.roleFilter,
      total_postings: data.totalPostings,
      imported_skills_count: resolvedItems.length,
      radar_axes_count: radarCount,
      scope_warning: data.scopeWarning,
      summary: {
        career_name: targetCareerName,
        created_skills: createdSkillsCount,
        total_skills: resolvedItems.length,
        radar_axes: radarCount,
      },
      previous_snapshot: prevReqs || [],
      created_by: session.user.id,
    });

    await logAdminAction({
      action: "bulk_market_import",
      entityType: "matrix",
      entityId: targetCareerId,
      details: {
        career_name: targetCareerName,
        file_name: data.fileName,
        market_scope: data.marketScope,
        role_filter: data.roleFilter,
        total_postings: data.totalPostings,
        imported_skills_count: resolvedItems.length,
        created_skills_count: createdSkillsCount,
        radar_axes_count: radarCount,
      },
      adminId: session.user.id,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/matrix");
    revalidatePath("/admin/skills");
    revalidatePath("/admin/career-paths");
    revalidatePath("/admin/import");
    revalidatePath("/onboarding");
    revalidatePath("/dashboard");

    return {
      success: true,
      careerPathId: targetCareerId,
      careerName: targetCareerName,
      importedCount: resolvedItems.length,
      createdSkillsCount,
      radarCount,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Toplu veri yükleme sırasında beklenmeyen bir hata oluştu.";
    return { success: false, error: msg };
  }
}
