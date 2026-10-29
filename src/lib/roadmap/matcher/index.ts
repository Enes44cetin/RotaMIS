import { ruleMatcher } from "./rule-matcher";
import type { MatcherInput, MatcherOutput, ResourceMatcher } from "./types";

/**
 * İleride AI modülünü yazacak takım arkadaşınız buraya `aiMatcher` ekleyip
 * `ROTAMIS_MATCHER_MODE=ai` ortam değişkeniyle devreye alabilir.
 * Herhangi bir AI zaman aşımı veya hatasında sistem kesintisiz olarak `ruleMatcher`'a düşer.
 */
const registeredMatchers: Record<string, ResourceMatcher> = {
  rule: ruleMatcher,
};

export async function matchResourcesForNextSprint(
  input: MatcherInput
): Promise<MatcherOutput> {
  const mode = process.env.ROTAMIS_MATCHER_MODE || "rule";
  const activeMatcher = registeredMatchers[mode] || ruleMatcher;

  try {
    const result = await activeMatcher.selectResources(input);
    if (result.items.length > 0 || activeMatcher === ruleMatcher) {
      return result;
    }
    return await ruleMatcher.selectResources(input);
  } catch (err) {
    console.error(`[Matcher:${activeMatcher.version}] Hata oluştu, rule-v1'e düşülüyor:`, err);
    return await ruleMatcher.selectResources(input);
  }
}

export * from "./types";

