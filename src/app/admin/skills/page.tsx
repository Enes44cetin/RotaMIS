import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SkillsManager, type SkillItem } from "@/components/admin/skills/skills-manager";

export const metadata: Metadata = {
  title: "Beceri Havuzu Kataloğu — Admin Konsolu",
};

export default async function AdminSkillsPage() {
  const supabase = await createClient();

  // 1. Fetch skills
  const { data: rawSkills } = await supabase
    .from("skills")
    .select(`
      id,
      name_tr,
      name_en,
      slug,
      category,
      description_tr,
      icon,
      is_active,
      sort_order,
      careerReqs:career_path_skill_requirements(count),
      assessmentRatings:assessment_skill_ratings(count)
    `)
    .order("sort_order");

  const skills: SkillItem[] = (rawSkills || []).map((s) => ({
    id: s.id,
    name_tr: s.name_tr,
    name_en: s.name_en,
    slug: s.slug,
    category: s.category,
    description_tr: s.description_tr,
    icon: s.icon,
    is_active: s.is_active,
    sort_order: s.sort_order,
    careerUsageCount: (s.careerReqs as unknown as { count: number }[])?.[0]?.count ?? 0,
    assessmentUsageCount: (s.assessmentRatings as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0B1F4D]">Beceri Havuzu Kataloğu</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          YBS müfredatı ve sektör beklentilerine yönelik sert ve yumuşak beceri standartlarını yönetin.
        </p>
      </div>

      <SkillsManager skills={skills} />
    </div>
  );
}
