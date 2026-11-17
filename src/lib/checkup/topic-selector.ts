import type {
  SkillCategory,
  SkillGapRow,
  SprintUnit,
} from "@/types/database";

export interface BehavioralLevelAnchor {
  level: number;
  label: string;
  desc: string;
}

export interface DynamicCheckupTopic {
  skillId: string;
  skillSlug: string;
  nameTr: string;
  axisLabelTr: string;
  category: SkillCategory;
  promptTr: string;
  previousLevel: number;
  requiredLevel: number;
  importance: number;
  isRadarAxis: boolean;
  axisOrder: number | null;
  demandPct: number | null;
  priorityLabel: string | null;
  displayBadge: string | null;
  reasonBadge: string;
  taskCount: number;
  anchors: BehavioralLevelAnchor[];
}

const DEFAULT_LEVEL_LABELS: Record<number, string> = {
  1: "Bilgim Yok",
  2: "Aşina / Temel",
  3: "Uygulayıcı",
  4: "Yetkin",
  5: "Uzman",
};

export function buildBehavioralAnchors(
  skillName: string,
  category: SkillCategory,
  customAnchors?: Record<string, string> | null
): BehavioralLevelAnchor[] {
  // Migration 13'teki eski jenerik şablon metni ("Kavramı duydum ancak...") dışındaki
  // gerçekten beceriye özel tanımlanmış customAnchors varsa onları kullan
  const isLegacyGenericAnchor =
    typeof customAnchors?.["1"] === "string" &&
    customAnchors["1"].startsWith("Kavramı duydum ancak henüz pratik");

  if (
    customAnchors &&
    !isLegacyGenericAnchor &&
    Object.keys(customAnchors).length >= 5
  ) {
    return [1, 2, 3, 4, 5].map((lvl) => ({
      level: lvl,
      label: DEFAULT_LEVEL_LABELS[lvl],
      desc:
        customAnchors[String(lvl)] ||
        `${skillName} konusunda ${lvl}/5 düzeyinde uygulama yetkinliği.`,
    }));
  }

  const lowerName = skillName.toLowerCase();
  const isLanguageSkill =
    lowerName.includes("ingilizce") || lowerName.includes("yabancı dil");

  if (isLanguageSkill) {
    return [
      {
        level: 1,
        label: "Bilgim Yok",
        desc: `İngilizce teknik terimleri veya metinleri anlamakta zorlanıyorum; başlangıç (A1) düzeyindeyim veya altyapım yok.`,
      },
      {
        level: 2,
        label: "Aşina / Temel",
        desc: `Temel teknik kavramlara aşinayım; çeviri araçları yardımıyla basit dokümanları takip edebilirim (A2).`,
      },
      {
        level: 3,
        label: "Uygulayıcı",
        desc: `İngilizce teknik dokümantasyonları okuyup anlayabilir ve temel yazılı iletişim kurabilirim (B1-B2).`,
      },
      {
        level: 4,
        label: "Yetkin",
        desc: `Global kaynakları rahatlıkla takip eder, yazılı ve sözlü teknik iletişimi bağımsız yürütebilirim (B2-C1).`,
      },
      {
        level: 5,
        label: "Uzman",
        desc: `Uluslararası ekiplerde akıcı teknik sunumlar, toplantılar ve dokümantasyon süreçlerini yönetebilirim (C1-C2).`,
      },
    ];
  }

  if (category === "technical") {
    return [
      {
        level: 1,
        label: "Bilgim Yok",
        desc: `${skillName} aracını/kavramını daha önce hiç duymadım veya henüz hiçbir teorik/pratik bilgim yok.`,
      },
      {
        level: 2,
        label: "Aşina / Temel",
        desc: `${skillName} kavramını duydum, ne işe yaradığını biliyorum; temel örnekleri okuyup basit düzeyde anlayabilirim.`,
      },
      {
        level: 3,
        label: "Uygulayıcı",
        desc: `Dokümantasyon veya rehber eşliğinde ${skillName} ile uçtan uca temel/orta ölçekli bir senaryoyu çalıştırabilirim.`,
      },
      {
        level: 4,
        label: "Yetkin",
        desc: `Gerçek bir projede ${skillName} aracını/dilini tek başıma kullanır, hata ayıklayıp çözüm üretirim.`,
      },
      {
        level: 5,
        label: "Uzman",
        desc: `${skillName} ile ileri seviye mimari/performans kararları alabilir ve başkalarına mentorluk yapabilirim.`,
      },
    ];
  }

  if (category === "business") {
    return [
      {
        level: 1,
        label: "Bilgim Yok",
        desc: `${skillName} metodolojisini/kavramını daha önce hiç duymadım veya bu alanda henüz hiçbir bilgim yok.`,
      },
      {
        level: 2,
        label: "Aşina / Temel",
        desc: `${skillName} kavramını duydum ve temel terminolojiye aşinayım; örnek analiz dokümanlarını veya süreç şemalarını anlayabilirim.`,
      },
      {
        level: 3,
        label: "Uygulayıcı",
        desc: `Standart şablonları kullanarak orta ölçekli bir projede ${skillName} çıktısı üretebilirim.`,
      },
      {
        level: 4,
        label: "Yetkin",
        desc: `Karmaşık iş senaryolarında bağımsız olarak ${skillName} sürecini yönetir ve paydaşlarla doğrularım.`,
      },
      {
        level: 5,
        label: "Uzman",
        desc: `Kurumsal ölçekte ${skillName} standartlarını kurgulayabilir ve ekipleri yönlendirebilirim.`,
      },
    ];
  }

  return [
    {
      level: 1,
      label: "Bilgim Yok",
      desc: `${skillName} alanında henüz proje, sunum veya profesyonel ekip içi deneyim kazanmadım.`,
    },
    {
      level: 2,
      label: "Aşina / Temel",
      desc: `Temel prensiplere aşinayım; günlük ve tanıdık durumlarda kendimi ifade edip süreci sürdürebilirim.`,
    },
    {
      level: 3,
      label: "Uygulayıcı",
      desc: `Ekip çalışmalarında ve sunumlarda hazırlıklı olduğumda süreci rahatlıkla yürütebilirim.`,
    },
    {
      level: 4,
      label: "Yetkin",
      desc: `Farklı disiplinlerden paydaşlarla profesyonel ortamda akıcı ve ikna edici biçimde çalışırım.`,
    },
    {
      level: 5,
      label: "Uzman",
      desc: `Yüksek baskılı veya global/kurumsal ortamlarda liderlik üstlenip kriz çözebilirim.`,
    },
  ];
}

export function buildSectoralPrompt(
  nameTr: string,
  category: SkillCategory,
  customPrompt?: string | null
): string {
  if (customPrompt && customPrompt.trim().length > 10) {
    return customPrompt.trim();
  }
  if (category === "technical") {
    return `Gerçek projelerde ${nameTr} kullanarak çözüm geliştirme, sorgulama veya sistem kurgulama düzeyin nedir?`;
  }
  if (category === "business") {
    return `İş dünyası senaryolarında ${nameTr} yaklaşımını kullanarak süreç/gereksinim analizi yapma düzeyin nedir?`;
  }
  return `Profesyonel ekip ve iş ortamlarında ${nameTr} yetkinliğini aktif olarak kullanma seviyen nedir?`;
}

/**
 * Seçilen mesleğin 6'lı (veya tanımlı) Radar Eksenlerini sabit saat yönü sırasıyla döndürür.
 * Check-up sonrasında puanlar değişse bile eksenlerin sırası ASLA yer değiştirmez.
 */
export function extractCareerRadarAxes(
  skillGaps: SkillGapRow[],
  maxAxes = 6
): SkillGapRow[] {
  if (!skillGaps || skillGaps.length === 0) return [];

  // 1. Öncelikle veritabanında açıkça is_radar_axis = true olarak işaretlenmiş eksenleri al
  const explicitAxes = skillGaps.filter((g) => g.is_radar_axis === true);

  if (explicitAxes.length >= 3) {
    return [...explicitAxes]
      .sort(
        (a, b) =>
          (a.axis_order ?? 99) - (b.axis_order ?? 99) ||
          (b.demand_pct ?? 0) - (a.demand_pct ?? 0) ||
          b.importance - a.importance ||
          a.sort_order - b.sort_order
      )
      .slice(0, maxAxes);
  }

  // 2. Güvenli yedek (Fallback): Eğer henüz is_radar_axis işaretlenmemişse,
  // meslekte required_level > 0 olan en yüksek ilan yüzdeli / önemli ilk 6 beceriyi seç
  // ve sabit sıraya (sort_order / skill_slug) diz ki radar eksenleri zıplamasın.
  const requiredSkills = skillGaps.filter((g) => g.required_level > 0);
  const pool = requiredSkills.length >= 3 ? requiredSkills : skillGaps;

  const topSix = [...pool]
    .sort(
      (a, b) =>
        (b.demand_pct ?? 0) - (a.demand_pct ?? 0) ||
        b.importance - a.importance ||
        b.required_level - a.required_level ||
        a.sort_order - b.sort_order
    )
    .slice(0, maxAxes);

  return topSix.sort(
    (a, b) =>
      (a.axis_order ?? 99) - (b.axis_order ?? 99) ||
      a.sort_order - b.sort_order ||
      a.name_tr.localeCompare(b.name_tr, "tr")
  );
}

/**
 * Mini Check-Up (Boss Durağı) için Dinamik Soru Sayısı ve Sektörel Konu Seçici.
 * Sabit 5 soru yerine; sprintin yoğunluğuna, çalışılan görevlere, mesleğin 6 radar eksenine
 * ve sektör ilanlarındaki talep oranına göre 3 ile 8 arasında dinamik konu belirler.
 */
export function selectDynamicMiniCheckupTopics(
  sprint: SprintUnit | null,
  skillGaps: SkillGapRow[]
): {
  topics: DynamicCheckupTopic[];
  dynamicReasonSummary: string;
} {
  if (!sprint || skillGaps.length === 0) {
    return {
      topics: [],
      dynamicReasonSummary: "Değerlendirilecek konu bulunamadı.",
    };
  }

  const gapMap = new Map(skillGaps.map((g) => [g.skill_id, g]));
  const radarAxes = extractCareerRadarAxes(skillGaps, 6);
  const radarSkillIds = new Set(radarAxes.map((r) => r.skill_id));

  // 1. Sprint yoğunluğunu ve bu sprintte çalışılan becerileri analiz et
  const sprintTasks = sprint.tasks || [];
  const sprintFocusSkills = sprint.focusSkills || [];
  const workedTaskCounts = new Map<string, number>();
  let totalSprintHours = 0;

  for (const task of sprintTasks) {
    totalSprintHours += task.estimated_hours || 3.5;
    const sid = task.skill?.id || task.skill_id;
    if (sid) {
      workedTaskCounts.set(sid, (workedTaskCounts.get(sid) || 0) + 1);
    }
  }

  // 2. Dinamik Soru Sayısı (N) Hesapla (3..8 arası)
  // - Baz sayı: Sprintteki iş yükü (görev sayısı ve toplam saat)
  let targetCount = 4;
  if (totalSprintHours >= 16 || sprintTasks.length >= 5) {
    targetCount = 6;
  } else if (totalSprintHours >= 11 || sprintTasks.length >= 4) {
    targetCount = 5;
  } else if (sprintTasks.length <= 2) {
    targetCount = 3;
  }

  // - Mesleğin radar eksenlerindeki kritik açık sayısı yüksekse +1 ekle
  const highRadarGaps = radarAxes.filter((r) => r.gap >= 2).length;
  if (highRadarGaps >= 4) {
    targetCount += 1;
  }

  // - Çalışılan farklı beceri sayısı targetCount'tan büyükse hepsini kapsa
  targetCount = Math.max(targetCount, workedTaskCounts.size);
  // - Toplam meslek becerisi sayısıyla ve [3..8] aralığıyla sınırla
  targetCount = Math.min(8, Math.max(3, Math.min(targetCount, skillGaps.length)));

  // 3. Aday konuları puanla ve sırala
  const scoredCandidates = skillGaps.map((g) => {
    const taskCount = workedTaskCounts.get(g.skill_id) || 0;
    const isRadar = radarSkillIds.has(g.skill_id);
    const isFocus = sprintFocusSkills.some((f) => f.id === g.skill_id);
    const demandWeight = (g.demand_pct || 25) / 10; // 2.0 .. 7.0

    let score = 0;
    let reasonBadge = "Sektör Beklentisi";

    if (taskCount > 0) {
      score += 100 + taskCount * 20;
      reasonBadge = isRadar
        ? `Bu Sprintte Çalıştın • Radar Ekseni`
        : `Bu Sprintte Çalıştın (${taskCount} Görev)`;
    } else if (isFocus) {
      score += 75;
      reasonBadge = "Sprint Odak Yetkinliği";
    } else if (isRadar && g.gap > 0) {
      score += 50 + g.gap * 12 + demandWeight;
      reasonBadge = "🎯 Meslek Radar Ekseni";
    } else if (g.gap > 0) {
      score += 20 + g.gap * 8 + demandWeight;
      reasonBadge = g.priority_label || "Sektörel Açık";
    } else if (isRadar) {
      score += 15 + demandWeight;
      reasonBadge = "🎯 Radar Kontrolü";
    } else {
      score += demandWeight;
    }

    return {
      gapRow: g,
      score,
      taskCount,
      isRadar,
      reasonBadge,
    };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  const selected = scoredCandidates.slice(0, targetCount).map((item) => {
    const g = gapMap.get(item.gapRow.skill_id) || item.gapRow;
    return {
      skillId: g.skill_id,
      skillSlug: g.skill_slug,
      nameTr: g.name_tr,
      axisLabelTr: g.axis_label_tr || g.name_tr,
      category: g.category,
      promptTr: buildSectoralPrompt(g.name_tr, g.category, g.prompt_tr),
      previousLevel: Math.max(1, g.current_level || 1),
      requiredLevel: g.required_level || 4,
      importance: g.importance || 2,
      isRadarAxis: item.isRadar,
      axisOrder: g.axis_order ?? null,
      demandPct: g.demand_pct ?? null,
      priorityLabel: g.priority_label ?? null,
      displayBadge: g.display_badge ?? null,
      reasonBadge: item.reasonBadge,
      taskCount: item.taskCount,
      anchors: buildBehavioralAnchors(g.name_tr, g.category, g.level_anchors),
    };
  });

  const radarCoveredCount = selected.filter((s) => s.isRadarAxis).length;
  const dynamicReasonSummary = `Sprint #${sprint.sprintNumber} yoğunluğu (~${Math.round(
    totalSprintHours
  )} saat) ve sektör önceliklerine göre ${selected.length} konu seçildi (${radarCoveredCount} tanesi doğrudan meslek radar eksenini günceller).`;

  return {
    topics: selected,
    dynamicReasonSummary,
  };
}

