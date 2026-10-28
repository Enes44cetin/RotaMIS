import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { MatrixEditor } from "@/components/admin/matrix/matrix-editor";

export const metadata: Metadata = {
  title: "Sektör Beklenti Matrisi — Admin Konsolu",
};

interface MatrixPageProps {
  searchParams: Promise<{ career?: string }>;
}

export default async function AdminMatrixPage({ searchParams }: MatrixPageProps) {
  await requireAdmin();
  const { career } = await searchParams;
  const supabase = await createClient();

  // Fetch career paths (with student count relation), skills, and requirements in parallel
  const [{ data: careerPaths }, { data: skills }, { data: allRequirements }] =
    await Promise.all([
      supabase
        .from("career_paths")
        .select(
          `
          id,
          name_tr,
          slug,
          sort_order,
          students:profiles!profiles_target_career_path_id_fkey(count)
        `
        )
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("skills")
        .select("id, name_tr, category, slug, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("career_path_skill_requirements")
        .select("career_path_id, skill_id, required_level, importance"),
    ]);

  const enrichedCareerPaths = (careerPaths || []).map((cp) => ({
    id: cp.id,
    name_tr: cp.name_tr,
    slug: cp.slug,
    sort_order: cp.sort_order,
    studentCount:
      (cp.students as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  // Determine selected career path ID
  const selectedCareer =
    enrichedCareerPaths.find((cp) => cp.id === career || cp.slug === career) ||
    enrichedCareerPaths[0];

  return (
    <div className="space-y-6">
      <MatrixEditor
        careerPaths={enrichedCareerPaths}
        skills={skills || []}
        initialRequirements={allRequirements || []}
        allRequirements={allRequirements || []}
        selectedCareerId={selectedCareer?.id || ""}
      />
    </div>
  );
}
