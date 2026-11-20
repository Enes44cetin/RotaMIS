import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMarketCsvText,
  normalizeSliceForImport,
  SAMPLE_DEVELOPER_MARKET_CSV,
} from "../src/lib/market/csv-parser.ts";
import { isInternalLeanResourceUrl } from "../src/lib/path/task-reason.ts";
import {
  filterEligibleCatalogForGaps,
  ruleMatcher,
} from "../src/lib/roadmap/matcher/rule-matcher.ts";
import type {
  CatalogResourceCandidate,
  MatcherSkillGap,
} from "../src/lib/roadmap/matcher/types.ts";

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

test("isInternalLeanResourceUrl identifies internal lean template URLs and allows real external URLs", () => {
  assert.equal(
    isInternalLeanResourceUrl("https://rotamis.local/skill/sql/tier-1"),
    true
  );
  assert.equal(isInternalLeanResourceUrl(""), true);
  assert.equal(isInternalLeanResourceUrl(null), true);
  assert.equal(isInternalLeanResourceUrl("#"), true);
  assert.equal(isInternalLeanResourceUrl("https://react.dev/learn"), false);
});

const SAMPLE_CATALOG: CatalogResourceCandidate[] = [
  {
    id: "sql-t1",
    title: "SQL — Temel Yetkinlik",
    resource_type: "practice",
    estimated_hours: 3,
    difficulty: 1,
    sort_order: 1,
    resource_skills: [{ skill_id: "s-sql", min_level: 1, target_level: 2 }],
  },
  {
    id: "sql-t2",
    title: "SQL — Uygulama & Pratik",
    resource_type: "practice",
    estimated_hours: 4,
    difficulty: 2,
    sort_order: 2,
    resource_skills: [{ skill_id: "s-sql", min_level: 2, target_level: 4 }],
  },
  {
    id: "sql-t3",
    title: "SQL — İleri Seviye & Sektör Standardı",
    resource_type: "project",
    estimated_hours: 5,
    difficulty: 3,
    sort_order: 3,
    resource_skills: [{ skill_id: "s-sql", min_level: 4, target_level: 5 }],
  },
  {
    id: "git-t1",
    title: "Git — Temel Yetkinlik",
    resource_type: "practice",
    estimated_hours: 3,
    difficulty: 1,
    sort_order: 4,
    resource_skills: [{ skill_id: "s-git", min_level: 1, target_level: 2 }],
  },
  {
    id: "erp-t1",
    title: "ERP — Temel Yetkinlik",
    resource_type: "course",
    estimated_hours: 4,
    difficulty: 1,
    sort_order: 5,
    resource_skills: [{ skill_id: "s-erp", min_level: 1, target_level: 2 }],
  },
];

test("all-5s student (zero skill gaps) gets 0 eligible resources and 0 tasks from ruleMatcher", async () => {
  const zeroGaps: MatcherSkillGap[] = [
    {
      skill_id: "s-sql",
      skill_slug: "sql",
      name_tr: "SQL",
      current_level: 5,
      required_level: 5,
      importance: 3,
      gap: 0,
    },
    {
      skill_id: "s-git",
      skill_slug: "git",
      name_tr: "Git",
      current_level: 5,
      required_level: 4,
      importance: 3,
      gap: 0,
    },
  ];

  const filtered = filterEligibleCatalogForGaps(
    SAMPLE_CATALOG,
    zeroGaps,
    new Set()
  );
  assert.equal(filtered.length, 0);

  const res = await ruleMatcher.selectResources({
    sprintNumber: 1,
    skillGaps: zeroGaps,
    catalogResources: SAMPLE_CATALOG,
    usedResourceIds: new Set(),
    cycleSkillCounts: new Map(),
    weeklyHours: 10,
    learningStyle: "hands_on",
  });
  assert.equal(res.items.length, 0);
});

test("level 4/5 student needing level 5/5 only receives Tier 3 (target_level > current_level), never Tier 1 or Tier 2", async () => {
  const gaps: MatcherSkillGap[] = [
    {
      skill_id: "s-sql",
      skill_slug: "sql",
      name_tr: "SQL",
      current_level: 4,
      required_level: 5,
      importance: 3,
      gap: 1,
    },
    {
      skill_id: "s-git",
      skill_slug: "git",
      name_tr: "Git",
      current_level: 4,
      required_level: 4,
      importance: 3,
      gap: 0,
    },
  ];

  const filtered = filterEligibleCatalogForGaps(SAMPLE_CATALOG, gaps, new Set());
  assert.deepEqual(
    filtered.map((r) => r.id),
    ["sql-t3"]
  );

  const res = await ruleMatcher.selectResources({
    sprintNumber: 1,
    skillGaps: gaps,
    catalogResources: SAMPLE_CATALOG,
    usedResourceIds: new Set(),
    cycleSkillCounts: new Map(),
    weeklyHours: 10,
    learningStyle: "hands_on",
  });
  assert.deepEqual(
    res.items.map((i) => i.resourceId),
    ["sql-t3"]
  );
});

test("single small gap student receives only tasks for that gap skill, never padded with zero-gap or unrelated career skills", async () => {
  const gaps: MatcherSkillGap[] = [
    {
      skill_id: "s-sql",
      skill_slug: "sql",
      name_tr: "SQL",
      current_level: 3,
      required_level: 4,
      importance: 3,
      gap: 1,
    },
    {
      skill_id: "s-git",
      skill_slug: "git",
      name_tr: "Git",
      current_level: 4,
      required_level: 4,
      importance: 3,
      gap: 0,
    },
  ];

  const res = await ruleMatcher.selectResources({
    sprintNumber: 1,
    skillGaps: gaps,
    catalogResources: SAMPLE_CATALOG,
    usedResourceIds: new Set(),
    cycleSkillCounts: new Map(),
    weeklyHours: 16,
    learningStyle: "hands_on",
  });

  // Only sql-t2 (2->4) and sql-t3 (4->5) have target_level > 3 for s-sql; s-git (gap=0) and s-erp (unrelated) are never added
  assert.ok(res.items.length >= 1 && res.items.length <= 2);
  for (const item of res.items) {
    assert.equal(item.skillId, "s-sql");
    assert.notEqual(item.resourceId, "sql-t1");
  }
  assert.equal(res.items[0].resourceId, "sql-t2");
});

import { shouldKeepTailSprintGateOpen } from "../src/lib/path/task-reason.ts";

test("shouldKeepTailSprintGateOpen returns false once all gaps are closed or sealed with zero gaps", () => {
  assert.equal(shouldKeepTailSprintGateOpen(true, false, false, false), true);
  assert.equal(shouldKeepTailSprintGateOpen(true, true, true, false), false);
  assert.equal(shouldKeepTailSprintGateOpen(true, true, false, true), false);
  assert.equal(shouldKeepTailSprintGateOpen(false, false, false, false), false);
});
