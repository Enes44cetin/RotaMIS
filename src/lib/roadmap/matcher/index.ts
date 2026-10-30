import { ruleMatcher } from "./rule-matcher";
import { geminiMatcher, GeminiResourceMatcher } from "./gemini-matcher";
import type { MatcherInput, MatcherOutput, ResourceMatcher } from "./types";

/**
 * Eşleştirme stratejileri kaydı (Strategy Pattern).
 * ROTAMIS_MATCHER_MODE='gemini' veya 'ai' yapıldığında GeminiResourceMatcher çalışır.
 * Herhangi bir AI zaman aşımı, kota sorunu veya hatasında sistem kesintisiz olarak `ruleMatcher`'a düşer.
 */
const registeredMatchers: Record<string, ResourceMatcher> = {
  rule: ruleMatcher,
  gemini: geminiMatcher,
  ai: geminiMatcher,
};

/**
 * Hata durumunda hiçbir hassas bilgiyi (API key, URL, ham veri) sızdırmadan
 * yalnızca genel hata kodunu veya türünü döndüren güvenlik yardımcısı.
 */
function getSafeErrorCode(err: unknown): string {
  if (err && typeof err === "object") {
    const status = (err as { status?: number | string }).status;
    const code = (err as { code?: string }).code;
    const name = (err as { name?: string }).name;

    if (status) return `HTTP_${status}`;
    if (code) return String(code);
    if (name && name !== "Error") return String(name);
  }
  return "AI_PROVIDER_ERROR";
}

export async function matchResourcesForNextSprint(
  input: MatcherInput
): Promise<MatcherOutput> {
  const mode = process.env.ROTAMIS_MATCHER_MODE || "rule";
  const activeMatcher = registeredMatchers[mode] || ruleMatcher;

  console.log(
    `[RoadmapMatcher:START] Sprint #${input.sprintNumber} için eşleştirme başlatıldı. Hedef motor: ${activeMatcher.version}`
  );

  try {
    const result = await activeMatcher.selectResources(input);
    if (result.items.length > 0 || activeMatcher === ruleMatcher) {
      console.log(
        `[RoadmapMatcher:SUCCESS] ${result.matcherVersion} başarıyla tamamlandı (${result.items.length} görev seçildi).`
      );
      return result;
    }

    console.warn(
      `[RoadmapMatcher:FALLBACK] ${activeMatcher.version} 0 görev döndürdü. 'rule-v1' motoruna güvenli geçiş yapılıyor.`
    );
    return await ruleMatcher.selectResources(input);
  } catch (err: unknown) {
    const safeCode = getSafeErrorCode(err);
    console.error(
      `[RoadmapMatcher:FALLBACK] ${activeMatcher.version} hatası (${safeCode}). 'rule-v1' motoruna güvenli geçiş yapılıyor.`
    );
    return await ruleMatcher.selectResources(input);
  }
}

export * from "./types";
export { GeminiResourceMatcher, geminiMatcher };
