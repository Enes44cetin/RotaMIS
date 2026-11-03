import { GoogleGenAI, Type } from "@google/genai";
import type {
  MatchedResourceItem,
  MatcherInput,
  MatcherOutput,
  ResourceMatcher,
} from "./types";

const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

export class GeminiResourceMatcher implements ResourceMatcher {
  public get version(): string {
    const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    return `${model}-v1`;
  }
  private ai: GoogleGenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  private getAI(): GoogleGenAI {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "GEMINI_API_KEY tanımlanmamış. Lütfen .env.local dosyasında GEMINI_API_KEY anahtarını girin."
      );
    }
    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: key });
    }
    return this.ai;
  }

  public async selectResources(input: MatcherInput): Promise<MatcherOutput> {
    const {
      sprintNumber,
      skillGaps,
      catalogResources,
      usedResourceIds,
      cycleSkillCounts,
      weeklyHours,
      learningStyle,
    } = input;

    // 1. Daha önce kullanılan kaynakları ele
    const availableCatalog = catalogResources.filter(
      (r) => !usedResourceIds.has(r.id)
    );

    // Açığı olup katalogda uygun kullanılmamış kaynağı kalmayan becerileri belirle
    const activeGaps = skillGaps.filter((g) => g.gap > 0);
    const exhaustedSkillIds: string[] = [];
    for (const gap of activeGaps.slice(0, 4)) {
      const hasAnyUnusedForSkill = availableCatalog.some((r) =>
        (r.resource_skills || []).some((rs) => rs.skill_id === gap.skill_id)
      );
      if (!hasAnyUnusedForSkill) {
        exhaustedSkillIds.push(gap.skill_id);
      }
    }

    if (availableCatalog.length === 0) {
      return {
        matcherVersion: this.version,
        items: [],
        focusSkillIds: [],
        exhaustedSkillIds,
      };
    }

    // 2. Sprint için hedef görev sayısı hesapla (Örn: 3 ila 5 görev)
    const targetCount =
      weeklyHours && weeklyHours >= 14
        ? 5
        : weeklyHours && weeklyHours <= 5
          ? 3
          : 4;

    // 3. LLM için sadeleştirilmiş ve pedagojik Prompt Context hazırla
    const prompt = `
Sen uzman bir YBS (Yönetim Bilişim Sistemleri) Eğitim Danışmanı ve Müfredat Mimarı'sın.
Öğrenci Sprint #${sprintNumber} aşamasındadır.

ÖĞRENCİ PROFİLİ:
- Haftalık Çalışma Kapasitesi: ~${weeklyHours || 6} Saat
- Öğrenme Tercihi: ${learningStyle || "Karışık (mixed)"}
- En Yüksek Beceri Açıkları (Öncelikli):
${JSON.stringify(
      skillGaps
        .filter((g) => g.gap > 0)
        .slice(0, 6)
        .map((g) => ({
          skill_id: g.skill_id,
          skill_slug: g.skill_slug,
          name: g.name_tr,
          current_level: g.current_level,
          required_level: g.required_level,
          gap: g.gap,
          importance: g.importance,
        })),
      null,
      2
    )}

BU DÖNGÜDE VERİLEN GÖREV SAYILARI (Döngü içi denge için):
${JSON.stringify(
      Array.from(cycleSkillCounts.entries()).map(([skillId, count]) => ({
        skill_id: skillId,
        prior_tasks_count: count,
      })),
      null,
      2
    )}

KATALOGDAKİ KULLANILABİLİR GÖREVLER (SADECE VE SADECE BU LİSTEDEKİ ID'LERİ KULLAN):
${JSON.stringify(
      availableCatalog.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.resource_type,
        hours: c.estimated_hours,
        difficulty: c.difficulty,
        skills: c.resource_skills,
      })),
      null,
      2
    )}

GÖREVİN VE KURALLAR:
1. Yukarıdaki katalogdan en fazla ${targetCount} adet görev seç.
2. Kolaydan zora doğru pedagojik bir sıra oluştur (ısınma/teoriden uygulamaya doğru).
3. Aynı sprintte tek beceriye en fazla 2 görev vererek dengeli bir dağılım sağla.
4. KESİNLİKLE YENİ GÖREV VEYA ID UYDURMA. Sadece listedeki geçerli 'id' değerlerini kullan.
5. Bu sprintte odaklanılan 1-3 becerinin UUID'sini 'focusSkillIds' dizisinde döndür.
`;

    // 4. Structured JSON Çıktısı iste
    const ai = this.getAI();
    const modelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            selectedTaskIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Katalogdan seçilen görev UUID'leri (pedagojik sırayla)",
            },
            focusSkillIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Bu sprintte odaklanılan 1-3 becerinin UUID'si",
            },
            pedagogicalReasoning: {
              type: Type.STRING,
              description:
                "Neden bu görevlerin seçildiğine dair kısa pedagojik gerekçe",
            },
          },
          required: ["selectedTaskIds", "focusSkillIds"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const candidateMap = new Map(availableCatalog.map((c) => [c.id, c]));
    const validIds = new Set(availableCatalog.map((c) => c.id));

    // Doğrulama: Model halüsinasyon görüp listede olmayan id üretirse filtrele, tekrarları önle
    const seenIds = new Set<string>();
    const items: MatchedResourceItem[] = [];

    for (const rawId of parsed.selectedTaskIds || []) {
      const id = typeof rawId === "string" ? rawId.trim() : "";
      if (validIds.has(id) && !seenIds.has(id)) {
        seenIds.add(id);
        const resource = candidateMap.get(id);

        let matchedSkillId: string | null = null;
        const resSkills = resource?.resource_skills || [];
        const matchingGap = resSkills.find((rs) =>
          activeGaps.some((g) => g.skill_id === rs.skill_id)
        );

        if (matchingGap) {
          matchedSkillId = matchingGap.skill_id;
        } else if (resSkills.length > 0) {
          matchedSkillId = resSkills[0].skill_id;
        }

        items.push({
          resourceId: id,
          skillId: matchedSkillId,
          reasonCode: "gemini_pedagogical_match",
        });

        if (items.length >= 6) break;
      }
    }

    // Odak becerileri doğrula
    const validSkillIds = new Set(skillGaps.map((g) => g.skill_id));
    let focusSkillIds: string[] = (parsed.focusSkillIds || [])
      .filter((id: string) => typeof id === "string" && validSkillIds.has(id.trim()))
      .slice(0, 3);

    if (focusSkillIds.length === 0) {
      focusSkillIds = Array.from(
        new Set(
          items
            .map((item) => item.skillId)
            .filter((id): id is string => Boolean(id))
        )
      ).slice(0, 3);
    }

    return {
      matcherVersion: this.version,
      items,
      focusSkillIds,
      exhaustedSkillIds,
    };
  }
}

export const geminiMatcher = new GeminiResourceMatcher();

