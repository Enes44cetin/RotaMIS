import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MatrixEditor } from "@/components/admin/matrix/matrix-editor";

export const metadata: Metadata = {
  title: "Sektör Beklenti Matrisi — Admin Konsolu",
};

interface MatrixPageProps {
  searchParams: Promise<{ career?: string }>;
}

export default async function AdminMatrixPage({ searchParams }: MatrixPageProps) {
  const { career } = await searchParams;
  const supabase = await createClient();

  // 1. Fetch all data in parallel
  const [
    { data: careerPaths },
    { data: profileCareerCounts },
    { data: skills },
    { data: allRequirements },
  ] = await Promise.all([
    supabase
      .from("career_paths")
      .select("id, name_tr, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("target_career_path_id")
      .eq("role", "student"),
    supabase
      .from("skills")
      .select("id, name_tr, category, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("career_path_skill_requirements")
      .select("career_path_id, skill_id, required_level, importance"),
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

  const enrichedCareerPaths = (careerPaths || []).map((cp) => ({
    ...cp,
    studentCount: careerStudentCountMap.get(cp.id) || 0,
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
