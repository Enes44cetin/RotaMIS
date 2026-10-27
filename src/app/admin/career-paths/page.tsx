import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CareerPathsManager, type CareerPathItem } from "@/components/admin/career-paths/career-paths-manager";

export const metadata: Metadata = {
  title: "Kariyer Rotaları Kataloğu — Admin Konsolu",
};

export default async function AdminCareerPathsPage() {
  const supabase = await createClient();

  // 1. Fetch career paths and student counts in parallel
  const [{ data: rawPaths }, { data: profileCareerCounts }] = await Promise.all([
    supabase
      .from("career_paths")
      .select(`
        id,
        name_tr,
        name_en,
        slug,
        description_tr,
        icon,
        is_active,
        sort_order,
        requirements:career_path_skill_requirements(count)
      `)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("target_career_path_id")
      .eq("role", "student"),
  ]);

  const careerStudentCountMap = new Map<string, number>();
  (profileCareerCounts || []).forEach((p) => {
    if (p.target_career_path_id) {
      careerStudentCountMap.set(
        p.target_career_path_id,
        (careerStudentCountMap.get(p.target_career_path_id) || 0) + 1
      );
    }
  });

  const careerPaths: CareerPathItem[] = (rawPaths || []).map((p) => ({
    id: p.id,
    name_tr: p.name_tr,
    name_en: p.name_en,
    slug: p.slug,
    description_tr: p.description_tr,
    icon: p.icon,
    is_active: p.is_active,
    sort_order: p.sort_order,
    requirementsCount: (p.requirements as unknown as { count: number }[])?.[0]?.count ?? 0,
    studentCount: careerStudentCountMap.get(p.id) || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F4D]">Kariyer Rotaları Kataloğu</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Öğrencilerin seçeceği hedef kariyer alanlarını ve sektör standartlarını yönetin.
          </p>
        </div>
      </div>

      <CareerPathsManager careerPaths={careerPaths} />
    </div>
  );
}
