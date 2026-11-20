# RotaMIS Sprint 1 (Hijyen, Güven ve "Aha Anı") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate student dead-ends and streak/auth bugs (Faz 0) while adding the post-checkup result modal (QW1) and per-task personalized rationale (QW5) without touching the AI matcher module.

**Architecture:** Five cohesive workstreams layered cleanly onto Next.js 16 App Router Server Actions and Supabase RLS/RPCs: (1) auth recovery, Turkish error translation, and KVKK modal; (2) onboarding guard, empty-path recovery, task skip (`skipped`) and broken-link reporting with admin resolution; (3) non-destructive profile & learning-tempo settings modal; (4) Istanbul-timezone effective streak + idempotent `14_sprint1_hygiene.sql` anti-exploit trigger/RPC/table migration with pre-migration TypeScript fallbacks; (5) check-up celebration modal and "Why this task?" card.

**Tech Stack:** Next.js `16.4.6` (`next build --webpack`), React `19.3.1`, TypeScript `7` (`strict: true`), Tailwind CSS `4.3.3`, `@supabase/ssr`, Zod `4`, `lucide-react`, `sonner`, `motion/react`, Node `24` built-in test runner (`node --test`).

**Spec:** [2026-11-20-sprint1-hygiene-aha-design.md](file:///c:/Users/hp/Desktop/rotam%C4%B1s/docs/superpowers/specs/2026-11-20-sprint1-hygiene-aha-design.md)

## Global Constraints

- **Protected boundaries:** Do NOT touch `src/lib/roadmap/matcher/gemini-matcher.ts`, `src/lib/roadmap/matcher/index.ts`, `src/proxy.ts`, `src/lib/supabase/middleware.ts`, `src/lib/auth/require-admin.ts`, `AGENTS.md`, or `supabase/migrations/00..13*.sql`.
- **Auth dev/prod preservation:** `src/actions/auth.ts` edits are PO-approved, but `NODE_ENV === "development"` auto-confirm registration and login paths MUST remain intact.
- **Zero `any`:** Keep `strict: true` clean; put shared types in `src/types/database.ts`.
- **Zero waterfall:** All independent DB queries in Server Components/Actions MUST run in parallel via `Promise.all`.
- **Pre-migration safety:** Every query/RPC referencing Migration 14 (`resource_reports`, `update_student_learning_preferences`, `ever_completed_at`) MUST gracefully degrade if Migration 14 has not yet been executed in Supabase SQL Editor.
- **SQL discipline:** `14_sprint1_hygiene.sql` MUST be idempotent (`if not exists`, `create or replace`, `drop policy if exists`), enable RLS on new tables using `(select auth.uid())` / `public.is_admin()`, use `set search_path = ''` on `security definer` functions, and revoke public/anon execution.
- **Admin Action Standard:** Any new admin action MUST run `requireAdmin()` → Zod → DB → `logAdminAction()` → `revalidatePath()`.
- **UI/UX:** 100% natural Turkish copy (`lang="tr"`), `#0B1F4D` / `#2F5BFF` / `#F7F9FC` / `#F59E0B` palette, `rounded-2xl`/`rounded-3xl`, `cn()`, `useReducedMotion()`, `useOptimistic` + `useTransition`, preserve dashboard split layout (35% sticky profile / 65% path + mobile drawer).
- **Verification Gate:** `node --test`, `npx tsc --noEmit`, `npm run build`, and live Chrome DevTools QA with zero console/network errors before claiming done.

## Review Focus

1. **Open-redirect bypass in `/auth/callback`:** `next=//evil.com`, `next=https://evil.com`, or `next=/\evil.com` must sanitize to `"/dashboard"`. (Pinned in Task 2 tests, consumed by Task 3.)
2. **UTC vs. `Europe/Istanbul` day boundary in `computeEffectiveStreak`:** `2026-11-20T22:30:00Z` is `2026-11-21` in Istanbul (UTC+3); a `last_activity_date` of `2026-11-20` must evaluate as `"at_risk"` (yesterday), not `"active_today"`. (Pinned in Task 2 tests.)
3. **Pre-Migration 14 resilience:** Missing `resource_reports` table or missing `update_student_learning_preferences` RPC must not crash `/admin`, `reportBrokenResource`, or `updateStudentSettings`. (Verified in Tasks 4 & 5.)
4. **Same-task uncheck/recheck streak exploit:** Toggling an already-completed task off and back on a later day must NOT call `register_activity` again (`ever_completed_at` stays set), while sealed sprints still reject any status transition. (Enforced in Task 1 SQL.)
5. **Partial/missing skill data in `buildTaskReason`:** Tasks with `skill_id: null`, unmapped skills, `gap === 0`, or `demand_pct === null` must still produce natural, grammatically clean Turkish copy with zero `"undefined"` or `"null"` fragments. (Pinned in Task 2 tests.)

---

## File Structure Map

**Database & Shared Types / Validation**
- Create: `supabase/migrations/14_sprint1_hygiene.sql`
- Modify: `src/types/database.ts`
- Modify: `src/lib/validation/student-schemas.ts`

**Pure Domain Helpers & Unit Tests**
- Create: `src/lib/auth/error-messages.ts`
- Modify: `src/lib/gamification.ts`
- Create: `src/lib/path/task-reason.ts`
- Create: `tests/sprint1-domain.test.ts`

**Workstream 1 — Auth, Recovery & KVKK**
- Modify: `src/actions/auth.ts`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/components/auth/forgot-password-form.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`
- Create: `src/components/auth/reset-password-form.tsx`
- Create: `src/components/auth/kvkk-modal.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

**Workstream 2 & 3 — Guards, Recovery, Skip/Report, Admin Resolution & Profile Settings**
- Create: `src/components/onboarding/already-completed-card.tsx`
- Modify: `src/app/(onboarding)/onboarding/page.tsx`
- Modify: `src/actions/onboarding.ts`
- Modify: `src/actions/journey.ts`
- Modify: `src/components/dashboard/path/path-empty-state.tsx`
- Modify: `src/actions/tasks.ts`
- Modify: `src/actions/admin/resources.ts`
- Create: `src/components/admin/resources/resolve-reports-button.tsx`
- Modify: `src/app/admin/page.tsx`
- Create: `src/actions/profile.ts`
- Create: `src/components/dashboard/profile/profile-settings-modal.tsx`

**Workstream 4 & 5 — Dashboard Integration, Effective Streak, Skip/Report UI & Aha Moment**
- Create: `src/components/dashboard/welcome/checkup-result-modal.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/dashboard/dashboard-shell.tsx`
- Modify: `src/components/dashboard/dashboard-navbar.tsx`
- Modify: `src/components/dashboard/profile/profile-greeting.tsx`
- Modify: `src/components/dashboard/profile/profile-card.tsx`
- Modify: `src/components/dashboard/profile/level-progress.tsx`
- Modify: `src/components/dashboard/path/path-node.tsx`
- Modify: `src/components/dashboard/path/sprint-section.tsx`
- Modify: `src/components/dashboard/path/career-path.tsx`
- Modify: `src/components/dashboard/task-detail/task-detail-sheet.tsx`

---

### Task 1: Migration `14_sprint1_hygiene.sql`, Shared Types & Zod Schemas

**Files:**
- Create: `supabase/migrations/14_sprint1_hygiene.sql`
- Modify: `src/types/database.ts`
- Modify: `src/lib/validation/student-schemas.ts`
- Test: `tests/sprint1-domain.test.ts`

**Interfaces:**
- Produces in `src/types/database.ts`:
  - `ResourceReportReason = "broken_link" | "outdated" | "other"`
  - `EffectiveStreakStatus = "active_today" | "at_risk" | "broken"`
  - `EffectiveStreakInfo = { effectiveStreak: number; status: EffectiveStreakStatus }`
  - `UniversityOption = { id: string; name: string; city: string | null }`
  - `StudentSettingsInitial = { fullName: string; universityId: string | null; universityOther: string | null; weeklyHours: number; learningStyle: LearningStyle }`
- Produces in `src/lib/validation/student-schemas.ts`:
  - `forgotPasswordSchema`, `resetPasswordSchema`, `skipTaskSchema`, `unskipTaskSchema`, `reportBrokenResourceSchema`, `studentSettingsSchema` + inferred input types.

- [ ] **Step 1: Write failing Zod schema tests in `tests/sprint1-domain.test.ts`**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  skipTaskSchema,
  reportBrokenResourceSchema,
  studentSettingsSchema,
} from "../src/lib/validation/student-schemas.ts";

test("forgotPasswordSchema validates and trims email", () => {
  const ok = forgotPasswordSchema.safeParse({ email: "  ali@uni.edu.tr  " });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.email, "ali@uni.edu.tr");
  assert.equal(forgotPasswordSchema.safeParse({ email: "gecersiz" }).success, false);
});

test("resetPasswordSchema rejects mismatch and short passwords", () => {
  assert.equal(
    resetPasswordSchema.safeParse({ password: "123", confirmPassword: "123" }).success,
    false
  );
  assert.equal(
    resetPasswordSchema.safeParse({ password: "secret1", confirmPassword: "secret2" }).success,
    false
  );
  assert.equal(
    resetPasswordSchema.safeParse({ password: "secret1", confirmPassword: "secret1" }).success,
    true
  );
});

test("skipTaskSchema & reportBrokenResourceSchema enforce UUID and bounds", () => {
  const validId = "11111111-1111-4111-8111-111111111111";
  assert.equal(skipTaskSchema.safeParse({ taskId: validId }).success, true);
  assert.equal(skipTaskSchema.safeParse({ taskId: "not-a-uuid" }).success, false);
  assert.equal(
    reportBrokenResourceSchema.safeParse({
      taskId: validId,
      resourceId: validId,
      reason: "broken_link",
      note: "404 veriyor",
      skipAfterReport: true,
    }).success,
    true
  );
  assert.equal(
    reportBrokenResourceSchema.safeParse({
      taskId: validId,
      reason: "invalid_reason",
    }).success,
    false
  );
});

test("studentSettingsSchema enforces weeklyHours 2..40 and university rules", () => {
  assert.equal(
    studentSettingsSchema.safeParse({
      fullName: "Ayşe Demir",
      universityId: "other",
      universityOther: "Marmara Üniversitesi",
      weeklyHours: 10,
      learningStyle: "hands_on",
    }).success,
    true
  );
  assert.equal(
    studentSettingsSchema.safeParse({
      fullName: "Ayşe Demir",
      universityId: "other",
      universityOther: "",
      weeklyHours: 10,
      learningStyle: "hands_on",
    }).success,
    false
  );
  assert.equal(
    studentSettingsSchema.safeParse({
      fullName: "Ayşe Demir",
      universityId: "11111111-1111-4111-8111-111111111111",
      weeklyHours: 100,
      learningStyle: "video",
    }).success,
    false
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sprint1-domain.test.ts`  
Expected: FAIL (missing exported schemas).

- [ ] **Step 3: Create idempotent `supabase/migrations/14_sprint1_hygiene.sql`**

Include three idempotent sections:
1. `alter table public.tasks add column if not exists ever_completed_at timestamptz;` + backfill for `status = 'completed' and ever_completed_at is null`. Update `public.tasks_before_update()` (preserving sealed-sprint lock from Migration 11!) so `new.ever_completed_at := now()` on first transition to `'completed'` (`old.ever_completed_at is null`), never clearing `ever_completed_at` on uncheck. Update `public.tasks_after_status_change()` so `perform public.register_activity(new.user_id);` runs ONLY when `old.ever_completed_at is null`.
2. `create table if not exists public.resource_reports (...)` with `reason text not null check (reason in ('broken_link', 'outdated', 'other'))`, `note text check (char_length(note) <= 500)`, `resolved boolean not null default false`, partial unique index `resource_reports_open_user_res_uidx` on `(user_id, resource_id) where resolved = false and resource_id is not null`, index `resource_reports_unresolved_idx` on `(resolved, created_at desc)`, `enable row level security`, and `drop policy if exists` + `create policy` for student insert/select own via `(select auth.uid())` and admin all via `public.is_admin()`.
3. `create or replace function public.update_student_learning_preferences(p_weekly_hours smallint, p_learning_style public.learning_style) returns void language plpgsql security definer set search_path = ''` verifying `auth.uid()`, `p_weekly_hours between 1 and 60`, updating the latest `status = 'completed'` assessment row for `auth.uid()`. `revoke execute ... from public, anon; grant execute ... to authenticated;`.

- [ ] **Step 4: Add shared types to `src/types/database.ts` and Zod schemas to `src/lib/validation/student-schemas.ts`**

Add the exact types listed in **Interfaces** to `src/types/database.ts` and the 6 Zod schemas with Turkish validation messages to `src/lib/validation/student-schemas.ts` (`studentSettingsSchema` requires `universityOther.trim().length >= 2` when `universityId === "other"`).

- [ ] **Step 5: Run schema tests and type check**

Run: `node --test tests/sprint1-domain.test.ts`  
Expected: PASS (all 4 tests pass).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/14_sprint1_hygiene.sql src/types/database.ts src/lib/validation/student-schemas.ts tests/sprint1-domain.test.ts
git commit -m "feat: add migration 14 hygiene schema, shared types, and student zod schemas"
```

---

### Task 2: Pure Domain Helpers (Auth Errors, Effective Streak, Task Reason)

**Files:**
- Create: `src/lib/auth/error-messages.ts`
- Modify: `src/lib/gamification.ts`
- Create: `src/lib/path/task-reason.ts`
- Modify: `tests/sprint1-domain.test.ts`

**Interfaces:**
- Produces in `src/lib/auth/error-messages.ts`:
  - `translateAuthError(rawMessage: string | null | undefined, fallback?: string): string`
  - `sanitizeRelativeNextPath(rawNext: string | null | undefined, defaultPath?: string): string`
- Produces in `src/lib/gamification.ts`:
  - `computeEffectiveStreak(currentStreak: number | null | undefined, lastActivityDate: string | null | undefined, now?: Date): EffectiveStreakInfo`
  - `getReadinessMilestone(readinessPct: number): { label: string; nextLabel: string | null; pointsToNext: number; tone: "slate" | "blue" | "emerald" | "amber" }`
- Produces in `src/lib/path/task-reason.ts`:
  - `buildTaskReason(task: Pick<TaskRow, "skill_id" | "skill">, skillGaps: SkillGapRow[], careerName: string): { headline: string; detail: string; demandBadge: string | null }`

- [ ] **Step 1: Append failing tests to `tests/sprint1-domain.test.ts`**

Add tests covering:
- `translateAuthError`: maps `"Invalid login credentials"`, `"Email not confirmed"`, `"User already registered"`, `"For security purposes, you can only request this after..."`, `"New password should be different from the old password"`, `"Auth session missing"`, and unknown English strings to natural Turkish without leaking raw English.
- `sanitizeRelativeNextPath`: allows `"/reset-password"`, `"/dashboard?welcome=1"`; rejects `"//evil.com"`, `"https://evil.com"`, `"/\\evil.com"`, `""`, `null` -> returns `"/dashboard"`.
- `computeEffectiveStreak`:
  - Same Istanbul day (`2026-11-20`, `now = new Date("2026-11-20T12:00:00Z")`) -> `{ effectiveStreak: 4, status: "active_today" }`.
  - UTC vs Istanbul boundary (`lastActivityDate = "2026-11-20"`, `now = new Date("2026-11-20T22:30:00Z")` which is `2026-11-21 01:30` in Istanbul!) -> `{ effectiveStreak: 4, status: "at_risk" }`.
  - Two days ago (`"2026-11-18"` on `"2026-11-20"`) -> `{ effectiveStreak: 0, status: "broken" }`.
  - `currentStreak = 0` or `lastActivityDate = null` -> `{ effectiveStreak: 0, status: "broken" }`.
- `getReadinessMilestone`: checks thresholds `0..39` ("Keşif Aşaması", next "Gelişim Aşaması"), `40..59` ("Gelişim Aşaması", next "Staja Hazır"), `60..79` ("Staja Hazır", next "Sektöre Hazır"), `80..100` ("Sektöre Hazır", `nextLabel: null`, `pointsToNext: 0`).
- `buildTaskReason`:
  - Gap > 0 with `demand_pct: 78` -> mentions `%78`, skill name, `gap`, and `current/5 → required/5`.
  - Gap > 0 with `demand_pct: null` -> no `"null"` or `"%0"`.
  - Gap === 0 -> reinforcement phrasing.
  - `skill_id: null` -> general career enrichment phrasing with `careerName`.

- [ ] **Step 2: Run test to verify failures**

Run: `node --test tests/sprint1-domain.test.ts`  
Expected: FAIL (modules/exports not found).

- [ ] **Step 3: Implement `src/lib/auth/error-messages.ts`, `src/lib/gamification.ts` additions, and `src/lib/path/task-reason.ts`**

- In `src/lib/gamification.ts`, compute Istanbul `YYYY-MM-DD` using `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" })` for `now` and `new Date(now.getTime() - 86_400_000)` (yesterday).
- Keep all three modules pure TypeScript with zero Next.js/Supabase runtime imports so they run directly in `node --test`.

- [ ] **Step 4: Run tests to verify all pass**

Run: `node --test tests/sprint1-domain.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/error-messages.ts src/lib/gamification.ts src/lib/path/task-reason.ts tests/sprint1-domain.test.ts
git commit -m "feat: add pure helpers for Turkish auth errors, Istanbul streak, and task rationale"
```

---

### Task 3: Auth Hygiene, Forgot/Reset Password Flow & KVKK Modal (Workstream 1)

**Files:**
- Modify: `src/actions/auth.ts`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/components/auth/forgot-password-form.tsx`
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/components/auth/reset-password-form.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`
- Create: `src/components/auth/kvkk-modal.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

**Interfaces:**
- Consumes: `translateAuthError`, `sanitizeRelativeNextPath` (Task 2); `forgotPasswordSchema`, `resetPasswordSchema` (Task 1).
- Produces in `src/actions/auth.ts`:
  - `export interface AuthActionState { error?: string | null; success?: string | null }`
  - `requestPasswordResetAction(prevState, formData): Promise<AuthActionState>`
  - `updatePasswordAction(prevState, formData): Promise<AuthActionState>`

- [ ] **Step 1: Update `src/actions/auth.ts`**

1. Extend `AuthActionState` with `success?: string | null`.
2. Preserve existing `NODE_ENV === "development"` auto-confirm login and registration branches untouched.
3. Route Supabase error strings in `loginAction` and `registerAction` through `translateAuthError`.
4. In `registerAction` production branch (`!signUpData.session`), when `signInError` happens because email confirmation is required, return `{ success: "Kaydınız alındı! Lütfen e-posta adresinize gönderilen doğrulama bağlantısını onaylayarak giriş yapın." }` (instead of `{ error: ... }`).
5. Add `requestPasswordResetAction`: validate with `forgotPasswordSchema`, resolve origin from `process.env.NEXT_PUBLIC_SITE_URL` or `headers()` (`x-forwarded-proto`/`host`, defaulting `http://localhost:3000`), call `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` })`. On rate-limit error return Turkish rate-limit error; otherwise always return non-enumerating `{ success: "Eğer bu e-posta adresiyle kayıtlı bir hesabın varsa, şifre sıfırlama bağlantısını gelen kutuna gönderdik." }`.
6. Add `updatePasswordAction`: validate with `resetPasswordSchema`, verify `supabase.auth.getUser()` exists, call `supabase.auth.updateUser({ password })`, on success call `supabase.auth.signOut()` and `redirect("/login?reset=1")`.

- [ ] **Step 2: Create `src/app/auth/callback/route.ts`**

Handle `GET(request: NextRequest)`:
- Read `code`, `token_hash`, `type`, `next`.
- Sanitize `next` via `sanitizeRelativeNextPath(rawNext, "/dashboard")`.
- If `code` present → `supabase.auth.exchangeCodeForSession(code)`.
- Else if `token_hash` and `type` present → `supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash })`.
- On success redirect to `${origin}${next}` (respecting `x-forwarded-host` in prod per `@supabase/ssr` guide); otherwise redirect to `${origin}/login?error=link_expired`.

- [ ] **Step 3: Create Forgot Password & Reset Password pages and forms**

- `src/components/auth/forgot-password-form.tsx` + `src/app/(auth)/forgot-password/page.tsx`: uses `useActionState(requestPasswordResetAction, initialState)`, renders green success card or red error alert, link back to `/login`.
- `src/components/auth/reset-password-form.tsx` + `src/app/(auth)/reset-password/page.tsx`: server page checks `supabase.auth.getUser()`; if missing session renders invalid/expired link card with CTA to `/forgot-password`; if valid renders password + confirmPassword form bound to `updatePasswordAction`.

- [ ] **Step 4: Update Login page/form & Register page + KVKK Modal**

- `src/app/(auth)/login/page.tsx`: accept `reset?: string` and `error?: string` in `searchParams` and pass `resetSuccess={params.reset === "1"}` and `linkError={params.error === "link_expired"}` to `LoginForm`.
- `src/components/auth/login-form.tsx`: show green banner on `resetSuccess`, amber/red banner on `linkError`, and add `<Link href="/forgot-password">Şifremi unuttum</Link>` right-aligned next to the "Şifre" label.
- `src/components/auth/kvkk-modal.tsx`: accessible dialog (`role="dialog"`, `aria-modal="true"`, Escape & backdrop close, `useReducedMotion()`) containing structured Turkish KVKK Aydınlatma Metni tailored to RotaMIS.
- `src/app/(auth)/register/page.tsx`: render green success banner for `state?.success`; turn **"KVKK Aydınlatma Metni"** into an interactive `<button type="button">` (`e.preventDefault(); e.stopPropagation(); setKvkkOpen(true)`) opening `<KvkkModal />`.

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`  
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/actions/auth.ts src/app/auth/callback/route.ts src/app/\(auth\)/forgot-password src/app/\(auth\)/reset-password src/components/auth src/app/\(auth\)/login/page.tsx src/app/\(auth\)/register/page.tsx
git commit -m "feat: add forgot/reset password flow, auth callback, Turkish auth banners, and KVKK modal"
```

---

### Task 4: Onboarding Guard, Empty Path Recovery, Task Skip / Broken Link Reporting & Admin Resolution (Workstream 2)

**Files:**
- Create: `src/components/onboarding/already-completed-card.tsx`
- Modify: `src/app/(onboarding)/onboarding/page.tsx`
- Modify: `src/actions/journey.ts`
- Modify: `src/components/dashboard/path/path-empty-state.tsx`
- Modify: `src/actions/tasks.ts`
- Modify: `src/actions/admin/resources.ts`
- Create: `src/components/admin/resources/resolve-reports-button.tsx`
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `skipTaskSchema`, `unskipTaskSchema`, `reportBrokenResourceSchema` (Task 1); `resetStudentCareerJourney` (`src/actions/journey.ts`).
- Produces:
  - `retryInitialRoadmap(): Promise<AdvanceSprintResult>` in `src/actions/journey.ts`
  - `skipTask(taskId: string): Promise<{ success?: boolean; error?: string; nextStatus?: TaskStatus }>` in `src/actions/tasks.ts`
  - `unskipTask(taskId: string): Promise<{ success?: boolean; error?: string; nextStatus?: TaskStatus }>` in `src/actions/tasks.ts`
  - `reportBrokenResource(rawInput: ReportBrokenResourceInput): Promise<{ success?: boolean; error?: string; skipped?: boolean; degraded?: boolean }>` in `src/actions/tasks.ts`
  - `resolveResourceReportsAction(resourceId: string): Promise<{ success: boolean; error?: string }>` in `src/actions/admin/resources.ts`

- [ ] **Step 1: Add `/onboarding` guard for completed students**

- Update `src/app/(onboarding)/onboarding/page.tsx`: select `onboarding_completed` in the existing profile query. If `profile?.onboarding_completed && profile.role !== "admin"`, render `<OnboardingAlreadyCompletedCard careerName={...} />` instead of `<OnboardingWizard />`.
- Create `src/components/onboarding/already-completed-card.tsx`: primary Link to `/dashboard` ("Dashboard'a Dön") + secondary button with inline confirm calling `resetStudentCareerJourney()` then `router.refresh()` ("Hedef Değiştir ve Baştan Başla").

- [ ] **Step 2: Add `retryInitialRoadmap` & upgrade `PathEmptyState`**

- In `src/actions/journey.ts`, export `retryInitialRoadmap()`: authenticates user, reads `v_latest_assessment` (`id, career_path_id`), finds or inserts active `roadmaps` row via `createAdminClient()` (matching `onboarding.ts` source rule), calls `createNextSprintForUser(user.id, roadmapId)`, calls `revalidatePath("/dashboard")` & `revalidatePath("/admin")`, and returns `AdvanceSprintResult`.
- Update `src/components/dashboard/path/path-empty-state.tsx` to `"use client"` with **"Patikayı Oluşturmayı Tekrar Dene"** button invoking `retryInitialRoadmap()`. If `catalogExhausted`, show calm catalog-expanding feedback (never send completed user back to `/onboarding`).

- [ ] **Step 3: Add `skipTask`, `unskipTask`, and `reportBrokenResource` to `src/actions/tasks.ts`**

- `skipTask(taskId)`: validate `skipTaskSchema`, auth check, `tasks.update({ status: "skipped" }).eq("id", taskId).eq("user_id", user.id)`, handle sealed sprint trigger error cleanly in Turkish, `revalidatePath("/dashboard")`.
- `unskipTask(taskId)`: validate `unskipTaskSchema`, auth check, `tasks.update({ status: "pending" }).eq("id", taskId).eq("user_id", user.id).eq("status", "skipped")`, `revalidatePath("/dashboard")`.
- `reportBrokenResource(rawInput)`: validate `reportBrokenResourceSchema`, auth check, verify task belongs to user, insert into `resource_reports` (`user_id`, `resource_id`, `task_id`, `reason`, `note`). Treat Postgres `23505` (already reported) as success; treat `42P01` / missing relation (pre-Migration 14) as `degraded: true` without throwing. If `skipAfterReport` is true, also update task `status = "skipped"`. `revalidatePath("/dashboard")` & `revalidatePath("/admin")`.

- [ ] **Step 4: Add admin auto-resolution & `/admin` alert card for `resource_reports`**

- In `src/actions/admin/resources.ts`:
  - Add private helper `markResourceReportsResolved(supabase, resourceId)` wrapped in `try/catch` (silently ignores missing table pre-Migration 14). Call it in `updateResourceAction`, `toggleStatusResourceAction` (when `status === "archived"`), and `deleteResourceAction` (before delete, or via `resource_id`).
  - Export `resolveResourceReportsAction(resourceId: string)` following the Admin Action Standard: `requireAdmin()` → `uuidSchema.parse(resourceId)` → update `resource_reports set resolved = true where resource_id = validId and resolved = false` → `logAdminAction({ action: "resolve_resource_reports", entityType: "resource", entityId: validId, adminId })` → `revalidatePath("/admin")` & `revalidatePath("/admin/resources")`.
- Create `src/components/admin/resources/resolve-reports-button.tsx`: compact `"use client"` button invoking `resolveResourceReportsAction` with `useTransition` + `sonner` toast.
- In `src/app/admin/page.tsx`: add `resource_reports` query inside the existing `Promise.all` (gracefully ignoring `error` if Migration 14 isn't applied), group open reports by `resource_id`, and display an actionable alert card inside "Veri Sağlığı & Dikkat Gerektirenler" listing reported resource titles, counts, a link to `/admin/resources`, and `<ResolveReportsButton />`.

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`  
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(onboarding\)/onboarding/page.tsx src/components/onboarding/already-completed-card.tsx src/actions/journey.ts src/components/dashboard/path/path-empty-state.tsx src/actions/tasks.ts src/actions/admin/resources.ts src/components/admin/resources/resolve-reports-button.tsx src/app/admin/page.tsx
git commit -m "feat: add onboarding guard, empty-path retry, task skip/broken-link reporting, and admin resolution"
```

---

### Task 5: Student Profile & Tempo Settings Action + Modal (Workstream 3)

**Files:**
- Create: `src/actions/profile.ts`
- Create: `src/components/dashboard/profile/profile-settings-modal.tsx`

**Interfaces:**
- Consumes: `studentSettingsSchema` (Task 1); `UniversityOption`, `StudentSettingsInitial` (`src/types/database.ts`).
- Produces:
  - `updateStudentSettings(rawInput: StudentSettingsInput): Promise<{ ok: boolean; error?: string }>` in `src/actions/profile.ts`
  - `<ProfileSettingsModal open onClose initial universities />` in `src/components/dashboard/profile/profile-settings-modal.tsx`

- [ ] **Step 1: Implement `src/actions/profile.ts`**

`updateStudentSettings(rawInput)`:
1. Validate with `studentSettingsSchema`.
2. Authenticate via `supabase.auth.getUser()`.
3. Update `profiles` (`full_name`, `university_id: isOther ? null : universityId`, `university_other: isOther ? universityOther : null`) using user's RLS client (respects column-level grants).
4. Call `supabase.rpc("update_student_learning_preferences", { p_weekly_hours: weeklyHours, p_learning_style: learningStyle })`.
5. Pre-Migration 14 fallback: if `rpcError`, find the latest completed `assessments` row for `user.id` and update only `{ weekly_hours, learning_style }` via `createAdminClient()` filtered strictly by `.eq("id", latest.id).eq("user_id", user.id)`.
6. `revalidatePath("/dashboard")` and return `{ ok: true }`.

- [ ] **Step 2: Create `src/components/dashboard/profile/profile-settings-modal.tsx`**

- Responsive dialog (bottom-sheet on mobile, centered `sm:max-w-lg` on desktop) matching `TaskDetailSheet` / `MiniCheckupSheet` motion + Escape/backdrop close + `useReducedMotion()`.
- Fields: Ad Soyad input, Üniversite `<select>` (with `"other"` option showing `university_other` input), Haftalık Çalışma Süresi range slider (`2..40`, step `2`), 4 Öğrenme Stili cards (`hands_on`, `video`, `reading`, `mixed`).
- Clear info callout: *"Haftalık tempo ve öğrenme stili değişikliklerin mevcut patikanı sıfırlamaz; bir sonraki sprintin oluşturulurken otomatik uygulanır."*
- Saves with `useTransition()`, shows Turkish `toast.success` / `toast.error`, closes modal on success.

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`  
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/actions/profile.ts src/components/dashboard/profile/profile-settings-modal.tsx
git commit -m "feat: add non-destructive student profile and learning tempo settings modal"
```

---

### Task 6: Dashboard Integration — Effective Streak, Risk Banner, Skip/Report UI, "Why This Task?", Settings Trigger & Check-Up Result Modal (Workstreams 2, 3, 4, 5 UI)

**Files:**
- Modify: `src/actions/onboarding.ts`
- Create: `src/components/dashboard/welcome/checkup-result-modal.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/dashboard/dashboard-shell.tsx`
- Modify: `src/components/dashboard/dashboard-navbar.tsx`
- Modify: `src/components/dashboard/profile/profile-greeting.tsx`
- Modify: `src/components/dashboard/profile/profile-card.tsx`
- Modify: `src/components/dashboard/profile/level-progress.tsx`
- Modify: `src/components/dashboard/path/path-node.tsx`
- Modify: `src/components/dashboard/path/sprint-section.tsx`
- Modify: `src/components/dashboard/path/career-path.tsx`
- Modify: `src/components/dashboard/task-detail/task-detail-sheet.tsx`

**Interfaces:**
- Consumes: `computeEffectiveStreak`, `getReadinessMilestone` (Task 2); `buildTaskReason` (Task 2); `skipTask`, `unskipTask`, `reportBrokenResource` (Task 4); `ProfileSettingsModal` (Task 5).
- Produces: Complete integrated student Dashboard UX.

- [ ] **Step 1: Update `src/actions/onboarding.ts` redirect & create `CheckupResultModal`**

- In `src/actions/onboarding.ts:265`, change final redirect to `"/dashboard?welcome=1"`.
- Create `src/components/dashboard/welcome/checkup-result-modal.tsx`:
  - Props: `open: boolean`, `careerName: string`, `overallReadiness: number`, `totalXp: number`, `skillGaps: SkillGapRow[]`, `onClose: () => void`, `onStartFirstTask: () => void`.
  - Shows celebration header (`+50 XP`, `Seviye {level}`, `🏅 Yola Çıktın`), circular readiness ring + `getReadinessMilestone(overallReadiness)` pill, top 3 gaps (`gap > 0`) with `current_level/5 → required_level/5` and optional `display_badge`, and primary CTA **"Sprint 1 Hazır — İlk Göreve Başla →"**.
  - On close/CTA, removes `?welcome=1` via `window.history.replaceState(null, "", "/dashboard")` so page reloads do not replay the modal.

- [ ] **Step 2: Upgrade `src/app/(app)/dashboard/page.tsx` & `DashboardShell`**

- In `dashboard/page.tsx`:
  - Accept `{ searchParams }: { searchParams: Promise<{ welcome?: string }> }` and `await searchParams`.
  - Add `last_activity_date` and `university_id` to `profiles` select.
  - Add `universities` (`id, name, city`, `is_active = true`) and `v_latest_assessment` (`weekly_hours, learning_style`) into the **same existing `Promise.all`** (zero waterfall).
  - Compute `const streakInfo = computeEffectiveStreak(profile.current_streak, profile.last_activity_date);`.
  - Pass `initialEffectiveStreak`, `initialStreakStatus`, `showWelcomeModal={params.welcome === "1"}`, `universities`, and `settingsInitial` to `DashboardShell` / child components.
- In `src/components/dashboard/dashboard-shell.tsx`:
  - Add `effectiveStreak`, `streakStatus`, `isSettingsOpen`, `openSettings`, `closeSettings`, `skipTaskAction`, `unskipTaskAction`, `reportTaskResource` to `DashboardContext`.
  - Extend `OptimisticAction` with `{ type: "skip"; taskId: string; nextStatus: "skipped" | "pending" }`.
  - When `toggleTask` completes a task and `streakStatus !== "active_today"`, optimistically mark today's streak active (`effectiveStreak` + 1 if it was `at_risk` or `0`→`1`, `streakStatus = "active_today"`) so the at-risk banner disappears immediately.

- [ ] **Step 3: Wire Effective Streak & Settings Trigger in Navbar and Profile Components**

- `dashboard-navbar.tsx`: read `effectiveStreak` and `openSettings` from `useDashboard()`; show subtle Settings gear button (`aria-label="Profil ve Tempo Ayarları"`) next to XP pill.
- `profile-greeting.tsx`: add compact "Ayarlar" button alongside "Hedef Değiştir" calling `openSettings()`.
- `profile-card.tsx` & `level-progress.tsx`: display live `effectiveStreak` from `useDashboard()` instead of raw `profile.current_streak`, and add settings button access on mobile compact strip.

- [ ] **Step 4: Visualize `skipped` Nodes, Render Streak Risk Banner, Checkup Result Modal & Profile Settings Modal**

- `path-node.tsx` & `sprint-section.tsx`: handle `task.status === "skipped"` with muted slate circular button, `SkipForward` icon, status text `"Atlandı"`, and `"Atlandı • 0 XP"` pill.
- `career-path.tsx`:
  - Render compact amber **"Serin tehlikede!"** banner at top when `streakStatus === "at_risk"`.
  - Pass `skillGaps` and `careerName` to `TaskDetailSheet`.
  - Mount `<CheckupResultModal />` (closing scrolls to first recommended node) and `<ProfileSettingsModal />` (bound to `isSettingsOpen` / `closeSettings`).

- [ ] **Step 5: Upgrade `TaskDetailSheet` with "Why This Task?", Skip & Broken Link Report UI**

- In `src/components/dashboard/task-detail/task-detail-sheet.tsx`:
  - Render **"Neden Bu Görev?"** info card using `buildTaskReason(task, skillGaps, careerName)` right above "Görev Yönergesi".
  - Handle `isSkipped = task.status === "skipped"` footer state: shows `"Bu görevi atladın (0 XP)"` + `"Tekrar Aktif Et"` button (unless sprint is sealed).
  - On non-completed, non-skipped, unsealed tasks: below the primary `"Görevi Tamamla (+XP)"` button, render two subtle secondary actions:
    1. **"Zaten Biliyorum / Atla"** (`skipTaskAction(task)`).
    2. **"Link Kırık / Sorun Bildir"** (when `task.resource_url` exists): toggles compact inline form (reason radio/pills: `broken_link` | `outdated` | `other`, optional note textarea max 500, checkbox `"Görevi atla ve patikaya devam et"` default checked, submit button calling `reportTaskResource`).

- [ ] **Step 6: Verify compilation and tests**

Run: `node --test tests/sprint1-domain.test.ts && npx tsc --noEmit && npm run build`  
Expected: All unit tests pass, 0 TypeScript errors, production webpack build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/actions/onboarding.ts src/app/\(app\)/dashboard/page.tsx src/components/dashboard
git commit -m "feat: integrate checkup result modal, task rationale, skip/report UX, settings, and live streak"
```

---

### Task 7: Verification Gate & Live Chrome DevTools QA

**Files:**
- Verify only (fix any issues found in-place).

- [ ] **Step 1: Run full automated verification suite**

Run: `node --test tests/sprint1-domain.test.ts && npx tsc --noEmit && npm run build`  
Expected: Exit code 0 across all three commands.

- [ ] **Step 2: Live browser verification via Chrome DevTools**

Verify on running dev server (`npm run dev`, zero console errors, zero failed network requests):
1. `/login` → "Şifremi unuttum" link → `/forgot-password` form submits and shows non-enumerating Turkish success banner; `/login?reset=1` and `/login?error=link_expired` banners render cleanly.
2. `/register` → clicking "KVKK Aydınlatma Metni" opens accessible modal without toggling checkbox; Escape closes modal.
3. `/onboarding` as completed student → renders `OnboardingAlreadyCompletedCard` (does not overwrite path).
4. `/dashboard?welcome=1` → renders `CheckupResultModal`, CTA cleans URL and focuses path.
5. Task detail sheet → shows **"Neden Bu Görev?"** card; **"Zaten Biliyorum / Atla"** turns node into `"Atlandı • 0 XP"` and can be undone via `"Tekrar Aktif Et"`; **"Link Kırık / Sorun Bildir"** panel submits cleanly without crashing (even pre-Migration 14!).
6. Profile Settings modal → opens from navbar & profile card, updates name/tempo cleanly without resetting roadmap.
7. Mobile viewport (`390x844`) → zero horizontal overflow, bottom-sheet modals and mobile profile strip work smoothly.
8. `/admin` as admin → loads cleanly with zero errors pre-Migration 14 and renders broken link alert if reports exist.

- [ ] **Step 3: Report Migration 14 instruction to user**

Remind the user clearly to execute [14_sprint1_hygiene.sql](file:///c:/Users/hp/Desktop/rotam%C4%B1s/supabase/migrations/14_sprint1_hygiene.sql) in the Supabase SQL Editor (idempotent) to activate the `resource_reports` table, `update_student_learning_preferences` RPC, and `tasks.ever_completed_at` streak anti-exploit trigger.
