# RotaMIS Yalın & 20 Mesleğe Ölçeklenen Görev Motoru Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace story-based manual tasks with an auto-generated 3-tier lean competency task engine that scales to 20+ careers with zero manual authoring, fixes the 99% readiness bug on all-5 ratings, and shows a 100% Mastery screen instead of a beginner roadmap when a student has no skill gaps.

**Architecture:** Idempotent Migration 15 (`15_lean_scalable_tasks.sql`) fixes `v_skill_gap` so unasked skills cannot create phantom Level-1 gaps, and adds a Postgres trigger on `public.skills` that auto-generates 3 lean competency tiers (`Temel Yetkinlik` `1→2`, `Uygulama & Pratik` `2→4`, `İleri Seviye & Sektör Standardı` `4→5`) for every existing and newly imported skill. In TypeScript, `journey.ts` and `rule-matcher.ts` pre-filter catalog candidates strictly to `gap > 0` and `target_level > current_level` (benefiting both `geminiMatcher` and `ruleMatcher` without touching `gemini-matcher.ts` or `matcher/index.ts`), short-circuit when `activeGaps.length === 0`, and render `<MasteryCompletedCard />` on `/dashboard`.

**Tech Stack:** Next.js `16.4.6` (`next build --webpack`), React `19.3.1`, TypeScript `7` (`strict: true`), Tailwind CSS `4.3.3`, Supabase PostgreSQL/PL/pgSQL, Node `24` (`node --test`).

**Spec:** [2026-11-20-lean-task-engine-design.md](file:///c:/Users/hp/Desktop/rotam%C4%B1s/docs/superpowers/specs/2026-11-20-lean-task-engine-design.md)

## Global Constraints

- **Protected boundaries:** Do NOT touch `src/lib/roadmap/matcher/gemini-matcher.ts`, `src/lib/roadmap/matcher/index.ts`, `src/proxy.ts`, `src/lib/supabase/middleware.ts`, `src/lib/auth/require-admin.ts`, `AGENTS.md`, or `supabase/migrations/00..14*.sql`.
- **View stability:** In `15_lean_scalable_tasks.sql`, `v_skill_gap` MUST keep the exact column names, order, `::int` casts, `with (security_invoker = true)`, and `revoke all on public.v_skill_gap from anon` from Migration 13 (avoid Postgres `42P16`).
- **DB integrity:** `learning_resources.difficulty` and `tasks.difficulty` CHECK constraint is `1..3`; skill levels are `1..5`.
- **Zero `any` & Turkish UI:** Maintain `strict: true` and 100% natural Turkish UI copy.
- **Verification Gate:** `node --test`, `npx tsc --noEmit`, `npm run build`, and live Chrome DevTools QA verifying both the all-5s (`%100` + Mastery card, 0 tasks) and partial-gap (lean level-matched tasks) flows.

## Review Focus

1. **All-5s (`gap = 0`) student check-up:** Must produce `overallReadiness === 100` (no unasked `is_core_checkup = false` skill dragging score to 99%) and `0` tasks/sprints, displaying `MasteryCompletedCard`. (Pinned in Task 1 & Task 2 tests.)
2. **High-level partial gap (`current_level: 4, required_level: 5`):** Must NEVER receive Tier 1 (`target_level: 2`) or Tier 2 (`target_level: 4`) tasks; only Tier 3 (`target_level: 5`) is eligible. (Pinned in Task 2 tests.)
3. **Single small gap (`1` skill with `current_level: 3, required_level: 4`):** Must NOT be padded with tasks from `gap = 0` skills or unrelated careers. (Pinned in Task 2 tests.)
4. **AI Matcher (`gemini-matcher.ts`) compatibility without touching AI files:** `journey.ts` pre-filters `catalogResources` (and prunes non-matching `resource_skills` entries on each candidate) before calling `matchResourcesForNextSprint`, so `gemini-matcher.ts` only sees valid `gap > 0` and `target_level > current_level` candidates. (Pinned in Task 2 tests.)
5. **Internal lean URL (`https://rotamis.local/skill/...`) handling:** `TaskDetailSheet` must hide external link & broken-link report controls for internal template URLs, while `checkResourceLinksAction` marks them `ok` without external HTTP requests. (Pinned in Task 2 & Task 3.)

---

## File Structure Map

- Create: `supabase/migrations/15_lean_scalable_tasks.sql`
- Modify: `src/lib/market/csv-parser.ts`
- Modify: `src/lib/path/task-reason.ts`
- Modify: `src/lib/roadmap/matcher/rule-matcher.ts`
- Modify: `src/actions/journey.ts`
- Modify: `src/lib/path/build-sprints.ts`
- Create: `src/components/dashboard/path/mastery-completed-card.tsx`
- Modify: `src/components/dashboard/dashboard-shell.tsx`
- Modify: `src/components/dashboard/path/career-path.tsx`
- Modify: `src/components/dashboard/task-detail/task-detail-sheet.tsx`
- Modify: `src/actions/admin/resources.ts`
- Create: `tests/lean-task-engine.test.ts`

---

### Task 1: Migration `15_lean_scalable_tasks.sql` & CSV Import `isCoreCheckup` Fix

**Files:**
- Create: `supabase/migrations/15_lean_scalable_tasks.sql`
- Modify: `src/lib/market/csv-parser.ts:451`
- Create: `tests/lean-task-engine.test.ts`

**Interfaces:**
- Produces in `supabase/migrations/15_lean_scalable_tasks.sql`:
  - Updated `public.v_skill_gap` view filtering `(req.is_core_checkup = true or r.level is not null)`
  - Function `public.ensure_lean_skill_resources(p_skill_id uuid, p_slug text, p_name_tr text)`
  - Trigger `trg_skills_ensure_lean_resources` on `public.skills`
- Produces in `src/lib/market/csv-parser.ts`:
  - `normalizeSliceForImport` sets `isCoreCheckup: true` for all imported career skills so no imported skill is silently skipped in check-up and defaulted to Level 1.

- [ ] **Step 1: Write failing test in `tests/lean-task-engine.test.ts` for CSV import `isCoreCheckup`**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMarketCsvText,
  normalizeSliceForImport,
  SAMPLE_DEVELOPER_MARKET_CSV,
} from "../src/lib/market/csv-parser.ts";

test("normalizeSliceForImport marks all imported career skills as isCoreCheckup=true so no hidden skill causes a 99% score bug", () => {
  const parsed = parseMarketCsvText(SAMPLE_DEVELOPER_MARKET_CSV);
  const norm = normalizeSliceForImport(parsed.rows, "Yerel__Geliştirici", false, 6);
  assert.ok(norm.skills.length > 6);
  for (const sk of norm.skills) {
    assert.equal(
      sk.isCoreCheckup,
      true,
      `Expected ${sk.slug} to have isCoreCheckup=true`
    );
  }
});
```

- [ ] **Step 2: Run test to verify failure (RED)**

Run: `node --test tests/lean-task-engine.test.ts`  
Expected: FAIL (low-percentage skills in `SAMPLE_DEVELOPER_MARKET_CSV` had `isCoreCheckup: false`).

- [ ] **Step 3: Update `src/lib/market/csv-parser.ts` and create `supabase/migrations/15_lean_scalable_tasks.sql`**

1. In `src/lib/market/csv-parser.ts:451`, set `isCoreCheckup: true`.
2. Create `supabase/migrations/15_lean_scalable_tasks.sql` (100% idempotent):
   - Set `update public.career_path_skill_requirements set is_core_checkup = true where is_core_checkup = false;`.
   - Recreate `public.v_skill_gap` with `with (security_invoker = true)` and exact column list/types from Migration 13, adding `where (req.is_core_checkup = true or r.level is not null);` and `revoke all on public.v_skill_gap from anon;`.
   - Create `public.ensure_lean_skill_resources(p_skill_id uuid, p_slug text, p_name_tr text)` (`security definer`, `set search_path = ''`) that upserts the 3 lean tiers per skill into `public.learning_resources` (by deterministic URL `https://rotamis.local/skill/<p_slug>/tier-<1|2|3>`, `provider = 'RotaMIS Yetkinlik Hedefi'`, `status = 'published'`, `link_status = 'ok'`) and links them in `public.resource_skills`:
     - Tier 1: `{p_name_tr} — Temel Yetkinlik`, `difficulty = 1`, `estimated_hours = 3.0`, `min_level = 1`, `target_level = 2`, `resource_type = 'practice'`
     - Tier 2: `{p_name_tr} — Uygulama & Pratik`, `difficulty = 2`, `estimated_hours = 4.0`, `min_level = 2`, `target_level = 4`, `resource_type = 'practice'`
     - Tier 3: `{p_name_tr} — İleri Seviye & Sektör Standardı`, `difficulty = 3`, `estimated_hours = 5.0`, `min_level = 4`, `target_level = 5`, `resource_type = 'project'`
   - Create trigger function `public.trg_fn_skills_ensure_lean_resources()` and trigger `trg_skills_ensure_lean_resources` (`after insert or update of slug, name_tr, is_active on public.skills`) calling `ensure_lean_skill_resources` whenever `new.is_active = true`.
   - Archive legacy seed resources (`update public.learning_resources set status = 'archived' where url not like 'https://rotamis.local/skill/%';`) and run `ensure_lean_skill_resources` across all existing active `public.skills`.
   - Sync existing open `public.tasks` (`where status in ('pending', 'in_progress') and skill_id is not null`) to their skill's matching lean resource title, description, and URL so existing student sprints immediately become lean.

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `node --test tests/lean-task-engine.test.ts`  
Expected: PASS.

---

### Task 2: Level-Aware Candidate Filtering, `gap = 0` Short-Circuit & `ruleMatcher` Overhaul

**Files:**
- Modify: `src/lib/path/task-reason.ts`
- Modify: `src/lib/roadmap/matcher/rule-matcher.ts`
- Modify: `src/actions/journey.ts`
- Modify: `tests/lean-task-engine.test.ts`

**Interfaces:**
- Produces in `src/lib/path/task-reason.ts`:
  - `INTERNAL_LEAN_URL_PREFIX = "https://rotamis.local/skill/"`
  - `isInternalLeanResourceUrl(url: string | null | undefined): boolean`
- Produces in `src/lib/roadmap/matcher/rule-matcher.ts`:
  - `filterEligibleCatalogForGaps(catalogResources: CatalogResourceCandidate[], skillGaps: MatcherSkillGap[], usedResourceIds: Set<string>): CatalogResourceCandidate[]`
- Produces in `src/actions/journey.ts`:
  - `AdvanceSprintResult` gains `allGapsClosed?: boolean`

- [ ] **Step 1: Add failing matcher & URL tests to `tests/lean-task-engine.test.ts` (RED)**

Add tests asserting:
1. `isInternalLeanResourceUrl`: returns `true` for `"https://rotamis.local/skill/sql/tier-1"`, `null`, `""`, `"#"`; returns `false` for `"https://react.dev/learn"`.
2. `filterEligibleCatalogForGaps` & `ruleMatcher.selectResources`:
   - When all `skillGaps` have `gap === 0` (student rated 5/5 on everything), `filterEligibleCatalogForGaps` returns `[]` and `ruleMatcher.selectResources` returns `items: []` (0 tasks!).
   - When student has `SQL` at `current_level: 4, required_level: 5, gap: 1`, Tier 1 (`1→2`) and Tier 2 (`2→4`) are excluded because `target_level <= current_level`; ONLY Tier 3 (`4→5`) is selected!
   - When student has only 1 skill with `gap > 0` (`current_level: 3, required_level: 4, gap: 1`) and 5 other skills with `gap: 0`, `ruleMatcher.selectResources` returns ONLY tasks for that 1 gap skill (never pads from `gap = 0` skills or unrelated skills).

- [ ] **Step 2: Run tests to verify failure (RED)**

Run: `node --test tests/lean-task-engine.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `isInternalLeanResourceUrl`, `filterEligibleCatalogForGaps`, updated `ruleMatcher`, and `journey.ts` pre-filter + short-circuit**

1. In `src/lib/path/task-reason.ts`: export `INTERNAL_LEAN_URL_PREFIX` and `isInternalLeanResourceUrl(url)` (returns `true` when `!url`, `!url.trim()`, `url.startsWith("#")`, or `url.startsWith(INTERNAL_LEAN_URL_PREFIX)`).
2. In `src/lib/roadmap/matcher/rule-matcher.ts`:
   - Export `filterEligibleCatalogForGaps(catalogResources, skillGaps, usedResourceIds)`:
     - Builds `activeGapBySkillId` for `g.gap > 0`.
     - If `activeGapBySkillId.size === 0`, returns `[]`.
     - For each unused resource, keeps only `resource_skills` links where `gapInfo = activeGapBySkillId.get(link.skill_id)` exists AND `link.target_level > Math.max(1, gapInfo.current_level)`.
     - Returns only resources with at least 1 eligible `resource_skills` link (with `resource_skills` narrowed to those eligible links so `gemini-matcher.ts` also cannot pick a zero-gap skill!).
   - In `DeterministicRuleMatcher.selectResources`:
     - If `activeGaps.length === 0`, return `{ matcherVersion: this.version, items: [], focusSkillIds: [], exhaustedSkillIds: [] }`.
     - Filter candidates via `filterEligibleCatalogForGaps`.
     - In `pickPass(relaxMinLevelFilter)`: require `link.target_level > effectiveCurrent`, prefer `link.min_level <= effectiveCurrent + 1` in Pass 1 (and bonus `+6` when `link.min_level <= effectiveCurrent && link.target_level > effectiveCurrent` so the exact next step is picked first before jumping to Tier 3!).
     - Remove Pass 3 (`allowZeroGapCareerSkills`) and Pass 4 (`catalog_fallback`).
3. In `src/actions/journey.ts`:
   - Add `allGapsClosed?: boolean` to `AdvanceSprintResult`.
   - In `createNextSprintForUser`:
     - Compute `const activeGaps = skillGaps.filter((g) => g.gap > 0);`.
     - If `activeGaps.length === 0`: if `activeSprint && activeSprint.kind === "standard"`, mark it `completed`; return `{ ok: true, allGapsClosed: true, catalogExhausted: false, sprintId: null, sprintNumber: maxSprintNumber }`.
     - Otherwise filter `eligibleCandidates = filterEligibleCatalogForGaps(candidates, skillGaps, usedResourceIds)` and pass `catalogResources: eligibleCandidates` to `matchResourcesForNextSprint`.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `node --test tests/lean-task-engine.test.ts && node --test tests/sprint1-domain.test.ts`  
Expected: All tests PASS.

---

### Task 3: Mastery (`%100 Hazır`) Dashboard Card, Dynamic Lean Sprint Titles & Lean `TaskDetailSheet`

**Files:**
- Create: `src/components/dashboard/path/mastery-completed-card.tsx`
- Modify: `src/lib/path/build-sprints.ts`
- Modify: `src/components/dashboard/dashboard-shell.tsx`
- Modify: `src/components/dashboard/path/career-path.tsx`
- Modify: `src/components/dashboard/welcome/checkup-result-modal.tsx`
- Modify: `src/components/dashboard/task-detail/task-detail-sheet.tsx`
- Modify: `src/actions/admin/resources.ts`

**Interfaces:**
- Consumes: `isInternalLeanResourceUrl` (Task 2), `resetStudentCareerJourney` (`src/actions/journey.ts`).
- Produces: `<MasteryCompletedCard careerName={careerName} overallReadiness={overallReadiness} />`.

- [ ] **Step 1: Create `src/components/dashboard/path/mastery-completed-card.tsx`**

- Clean celebration card shown when the student has zero open skill gaps (`gap === 0` across all career skills) and no active incomplete sprint tasks.
- Displays trophy badge, **"🏆 Tebrikler! {careerName} Sektör Beklentilerini %100 Karşılıyorsun"** headline, explanation that no competency gap remains so no redundant task list was generated, and button **"Değerlendirmemi Güncelle / Farklı Hedef Seç"** (with confirmation calling `resetStudentCareerJourney()` and `router.push("/onboarding")`).

- [ ] **Step 2: Update `build-sprints.ts`, `dashboard-shell.tsx`, `career-path.tsx`, and `checkup-result-modal.tsx`**

1. In `src/lib/path/build-sprints.ts`: derive the sprint title suffix from the sprint tasks' average difficulty when `kind !== "checkpoint"`:
   - Avg difficulty `<= 1.3` → `"Temel Yetkinlik Adımları"`
   - Avg difficulty `<= 2.3` → `"Uygulama & Sektör Pratiği"`
   - Avg difficulty `> 2.3` → `"İleri Seviye & Sektör Standardı"`
2. In `src/components/dashboard/dashboard-shell.tsx`: add `allGapsClosed: boolean` state; when `advanceSprint()` returns `res.allGapsClosed`, set `allGapsClosed(true)` and show `toast.success("Tebrikler! Hedef mesleğindeki tüm yetkinlik açıklarını kapattın! 🏆")`.
3. In `src/components/dashboard/path/career-path.tsx`:
   - Compute `const hasZeroSkillGaps = skillGaps.length > 0 && skillGaps.every((g) => g.gap === 0);`.
   - If `sprints.length === 0`: render `<MasteryCompletedCard careerName={careerName} overallReadiness={overallReadiness} />` when `hasZeroSkillGaps`, otherwise `<PathEmptyState />`.
   - At the bottom of the path (when `sprints.length > 0`): if `allGapsClosed || hasZeroSkillGaps`, render `<MasteryCompletedCard />` instead of `<NextSprintPreview />`.
4. In `src/components/dashboard/welcome/checkup-result-modal.tsx`: when `topGaps.length === 0`, change the bottom CTA text from `"Sprint 1 Hazır — İlk Göreve Başla →"` to `"Harika! Kariyer Paneline Geç →"`.

- [ ] **Step 3: Update `TaskDetailSheet` and `checkResourceLinksAction` for internal lean URLs**

1. In `src/components/dashboard/task-detail/task-detail-sheet.tsx`: compute `const hasExternalResourceUrl = Boolean(task.resource_url && !isInternalLeanResourceUrl(task.resource_url));` and only render the `"Öğrenme Kaynağını Aç"` link box and `"Link Kırık / Sorun Bildir"` button when `hasExternalResourceUrl` is true.
2. In `src/actions/admin/resources.ts`: inside `checkResourceLinksAction`, if `isInternalLeanResourceUrl(res.url)` is true, set `isOk = true` directly without making an external `fetch`.

- [ ] **Step 4: Verify tests and TypeScript**

Run: `node --test tests/lean-task-engine.test.ts; if ($LASTEXITCODE -eq 0) { node --test tests/sprint1-domain.test.ts }; if ($LASTEXITCODE -eq 0) { npx tsc --noEmit }`  
Expected: All unit tests pass, 0 TypeScript errors.

---

### Task 4: Verification Gate (`tsc`, `npm run build`, Live Chrome DevTools QA)

- [ ] **Step 1: Run unit tests, TypeScript check, and production build**

Run: `node --test tests/lean-task-engine.test.ts`, `node --test tests/sprint1-domain.test.ts`, `npx tsc --noEmit`, `npm run build`.  
Expected: Exit code 0 across all commands.

- [ ] **Step 2: Instruct user to run `15_lean_scalable_tasks.sql` in Supabase SQL Editor and verify in Chrome DevTools**

Verify live on `http://localhost:3000`:
1. Choosing `Yazılım Geliştirici` and rating all questions `5/5` produces **%100** readiness and displays `MasteryCompletedCard` with **0 tasks**.
2. Rating some questions `1–3` produces only lean competency tasks (`{Beceri Adı} — Temel Yetkinlik` / `Uygulama & Pratik`) for those exact gaps and levels, with no preachy story titles and no external link box on internal template tasks.
