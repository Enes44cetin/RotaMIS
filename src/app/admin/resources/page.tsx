import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  ResourcesManager,
  type ResourceItem,
  type SkillRef,
} from "@/components/admin/resources/resources-manager";

export const metadata: Metadata = {
  title: "Eğitim & Sertifika Kataloğu — Admin Konsolu",
};

export default async function AdminResourcesPage() {
  const supabase = await createClient();

  // 1. Fetch learning resources and available skills in parallel
  const [{ data: rawResources }, { data: rawSkills }] = await Promise.all([
    supabase
      .from("learning_resources")
      .select(`
        id,
        title,
        provider,
        url,
        resource_type,
        language,
        pricing,
        estimated_hours,
        difficulty,
        gives_certificate,
        certificate_info,
        description,
        status,
        last_checked_at,
        link_status,
        sort_order,
        resource_skills (
          skill_id,
          min_level,
          target_level,
          skill:skills (
            id,
            name_tr
          )
        )
      `)
      .order("sort_order"),
    supabase
      .from("skills")
      .select("id, name_tr")
      .eq("is_active", true)
      .order("name_tr"),
  ]);

  const availableSkills: SkillRef[] = (rawSkills || []).map((s) => ({
    id: s.id,
    name_tr: s.name_tr,
  }));

  const resources: ResourceItem[] = (rawResources || []).map((r) => {
    const rawSkillsList = (r.resource_skills as unknown as {
      skill_id: string;
      min_level: number;
      target_level: number;
      skill: { id: string; name_tr: string } | null;
    }[]) || [];

    return {
      id: r.id,
      title: r.title,
      provider: r.provider,
      url: r.url,
      resource_type: r.resource_type,
      language: r.language as "tr" | "en" | "mixed",
      pricing: r.pricing as "free" | "freemium" | "paid",
      estimated_hours: Number(r.estimated_hours) || 4.0,
      difficulty: r.difficulty,
      gives_certificate: r.gives_certificate,
      certificate_info: r.certificate_info,
      description: r.description,
      status: r.status as "draft" | "published" | "archived",
      last_checked_at: r.last_checked_at,
      link_status: r.link_status as "unknown" | "ok" | "broken",
      sort_order: r.sort_order,
      skills: rawSkillsList.map((rs) => ({
        skill_id: rs.skill_id,
        skill_name: rs.skill?.name_tr || "Bilinmeyen Beceri",
        min_level: rs.min_level,
        target_level: rs.target_level,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0B1F4D]">Eğitim & Sertifika Kataloğu</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Öğrencilerin kişiselleştirilmiş yol haritalarına atanacak doğrulanmış kurs, pratik ve sertifika kaynaklarını yönetin.
        </p>
      </div>

      <ResourcesManager
        resources={resources}
        availableSkills={availableSkills}
      />
    </div>
  );
}
