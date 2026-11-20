import test from "node:test";
import assert from "node:assert/strict";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  skipTaskSchema,
  unskipTaskSchema,
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

test("skipTaskSchema, unskipTaskSchema & reportBrokenResourceSchema enforce UUID and bounds", () => {
  const validId = "11111111-1111-4111-8111-111111111111";
  assert.equal(skipTaskSchema.safeParse({ taskId: validId }).success, true);
  assert.equal(skipTaskSchema.safeParse({ taskId: "not-a-uuid" }).success, false);
  assert.equal(unskipTaskSchema.safeParse({ taskId: validId }).success, true);
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

import {
  translateAuthError,
  sanitizeRelativeNextPath,
  resolveSafeCallbackOrigin,
} from "../src/lib/auth/error-messages.ts";
import {
  computeEffectiveStreak,
  getReadinessMilestone,
} from "../src/lib/gamification.ts";
import { buildTaskReason } from "../src/lib/path/task-reason.ts";
import type { SkillGapRow } from "../src/types/database.ts";

test("translateAuthError translates common Supabase errors and hides unknown English", () => {
  assert.match(translateAuthError("Invalid login credentials"), /hatalı/i);
  assert.match(translateAuthError("Email not confirmed"), /doğrulanmamış/i);
  assert.match(translateAuthError("User already registered"), /zaten var/i);
  assert.match(
    translateAuthError("For security purposes, you can only request this after 45 seconds"),
    /bekle|sık/i
  );
  assert.match(
    translateAuthError("New password should be different from the old password."),
    /farklı/i
  );
  const fallback = translateAuthError("Unexpected internal postgres timeout error");
  assert.doesNotMatch(fallback, /postgres|timeout/i);
});

test("sanitizeRelativeNextPath blocks open redirects", () => {
  assert.equal(sanitizeRelativeNextPath("/reset-password"), "/reset-password");
  assert.equal(sanitizeRelativeNextPath("/dashboard?welcome=1"), "/dashboard?welcome=1");
  assert.equal(sanitizeRelativeNextPath("//evil.com"), "/dashboard");
  assert.equal(sanitizeRelativeNextPath("https://evil.com/phish"), "/dashboard");
  assert.equal(sanitizeRelativeNextPath("/\\evil.com"), "/dashboard");
  assert.equal(sanitizeRelativeNextPath(""), "/dashboard");
  assert.equal(sanitizeRelativeNextPath(null), "/dashboard");
});

test("computeEffectiveStreak handles Europe/Istanbul day boundary accurately", () => {
  // 2026-11-20T12:00:00Z is 2026-11-20 15:00 in Istanbul
  const sameDay = computeEffectiveStreak(5, "2026-11-20", new Date("2026-11-20T12:00:00Z"));
  assert.deepEqual(sameDay, { effectiveStreak: 5, status: "active_today" });

  // 2026-11-20T22:30:00Z is 2026-11-21 01:30 in Istanbul (UTC+3) -> 2026-11-20 is YESTERDAY!
  const istanbulBoundary = computeEffectiveStreak(
    4,
    "2026-11-20",
    new Date("2026-11-20T22:30:00Z")
  );
  assert.deepEqual(istanbulBoundary, { effectiveStreak: 4, status: "at_risk" });

  // Two days ago -> broken
  const stale = computeEffectiveStreak(7, "2026-11-18", new Date("2026-11-20T12:00:00Z"));
  assert.deepEqual(stale, { effectiveStreak: 0, status: "broken" });

  // Null date or 0 streak -> broken
  assert.deepEqual(computeEffectiveStreak(0, "2026-11-20", new Date("2026-11-20T12:00:00Z")), {
    effectiveStreak: 0,
    status: "broken",
  });
  assert.deepEqual(computeEffectiveStreak(3, null, new Date("2026-11-20T12:00:00Z")), {
    effectiveStreak: 0,
    status: "broken",
  });
});

test("getReadinessMilestone returns expected thresholds", () => {
  assert.equal(getReadinessMilestone(25).label, "Keşif Aşaması");
  assert.equal(getReadinessMilestone(25).nextLabel, "Gelişim Aşaması");
  assert.equal(getReadinessMilestone(25).pointsToNext, 15);
  assert.equal(getReadinessMilestone(54).label, "Gelişim Aşaması");
  assert.equal(getReadinessMilestone(54).nextLabel, "Staja Hazır");
  assert.equal(getReadinessMilestone(54).pointsToNext, 6);
  assert.equal(getReadinessMilestone(72).label, "Staja Hazır");
  assert.equal(getReadinessMilestone(72).nextLabel, "Sektöre Hazır");
  assert.equal(getReadinessMilestone(85).label, "Sektöre Hazır");
  assert.equal(getReadinessMilestone(85).nextLabel, null);
  assert.equal(getReadinessMilestone(85).pointsToNext, 0);
});

test("buildTaskReason produces clean Turkish copy across gap, demand, and missing skill cases", () => {
  const sampleGaps: SkillGapRow[] = [
    {
      user_id: "u1",
      assessment_id: "a1",
      career_path_id: "c1",
      skill_id: "s-sql",
      skill_slug: "sql",
      category: "technical",
      name_tr: "SQL",
      name_en: "SQL",
      sort_order: 1,
      current_level: 2,
      required_level: 4,
      importance: 3,
      gap: 2,
      demand_pct: 78.4,
      display_badge: "%78 İlanlarda",
    },
    {
      user_id: "u1",
      assessment_id: "a1",
      career_path_id: "c1",
      skill_id: "s-bpmn",
      skill_slug: "bpmn",
      category: "business",
      name_tr: "Süreç Modelleme",
      name_en: "BPMN",
      sort_order: 2,
      current_level: 1,
      required_level: 3,
      importance: 2,
      gap: 2,
      demand_pct: null,
    },
    {
      user_id: "u1",
      assessment_id: "a1",
      career_path_id: "c1",
      skill_id: "s-comm",
      skill_slug: "comm",
      category: "soft",
      name_tr: "İletişim",
      name_en: "Communication",
      sort_order: 3,
      current_level: 4,
      required_level: 4,
      importance: 2,
      gap: 0,
      demand_pct: 60,
    },
  ];

  const withDemand = buildTaskReason({ skill_id: "s-sql", skill: null }, sampleGaps, "Veri Analisti");
  assert.match(withDemand.detail, /%78/);
  assert.match(withDemand.detail, /SQL/);
  assert.match(withDemand.detail, /2\/5 → 4\/5/);
  assert.equal(withDemand.demandBadge, "%78 İlanlarda");

  const withoutDemand = buildTaskReason(
    { skill_id: "s-bpmn", skill: null },
    sampleGaps,
    "İş Analisti"
  );
  assert.doesNotMatch(withoutDemand.detail, /null|undefined|%0/i);
  assert.match(withoutDemand.detail, /Süreç Modelleme/);

  const zeroGap = buildTaskReason({ skill_id: "s-comm", skill: null }, sampleGaps, "İş Analisti");
  assert.match(zeroGap.detail, /pekiştir/i);

  const noSkill = buildTaskReason({ skill_id: null, skill: null }, sampleGaps, "Veri Analisti");
  assert.match(noSkill.detail, /Veri Analisti/);
  assert.doesNotMatch(noSkill.detail, /null|undefined/i);
});

test("sanitizeRelativeNextPath rejects ASCII control chars and sneaky protocol/host payloads", () => {
  assert.equal(sanitizeRelativeNextPath("/\t/evil.com"), "/dashboard");
  assert.equal(sanitizeRelativeNextPath("/foo\r\nSet-Cookie: a=1"), "/dashboard");
  assert.equal(sanitizeRelativeNextPath("/\x00/dashboard"), "/dashboard");
  assert.equal(sanitizeRelativeNextPath("/%09/evil.com"), "/%09/evil.com");
  assert.equal(sanitizeRelativeNextPath("/login?redirect=/dashboard"), "/login?redirect=/dashboard");
});

test("resolveSafeCallbackOrigin prioritizes NEXT_PUBLIC_SITE_URL and rejects malformed forwarded hosts", () => {
  assert.equal(
    resolveSafeCallbackOrigin("http://internal:3000", "evil.com/path", "https://rotamis.app/x", false),
    "https://rotamis.app"
  );
  assert.equal(
    resolveSafeCallbackOrigin("http://internal:3000", "rotamis.app, proxy.local", undefined, false),
    "https://rotamis.app"
  );
  assert.equal(
    resolveSafeCallbackOrigin("https://rotamis.app", "evil.com/inject@bad", undefined, false),
    "https://rotamis.app"
  );
  assert.equal(
    resolveSafeCallbackOrigin("http://localhost:3000", "evil.com", undefined, true),
    "http://localhost:3000"
  );
});
