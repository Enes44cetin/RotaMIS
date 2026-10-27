import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  UniversitiesManager,
  type UniversityItem,
  type UnlistedEntry,
} from "@/components/admin/universities/universities-manager";

export const metadata: Metadata = {
  title: "Üniversiteler Kataloğu — Admin Konsolu",
};

export default async function AdminUniversitiesPage() {
  const supabase = await createClient();

  // 1. Fetch universities and unlisted profiles in parallel
  const [{ data: rawUnis }, { data: unlistedProfiles }] = await Promise.all([
    supabase
      .from("universities")
      .select(`
        id,
        name,
        city,
        is_active,
        sort_order,
        profiles:profiles(count)
      `)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("university_other")
      .not("university_other", "is", null),
  ]);

  const universities: UniversityItem[] = (rawUnis || []).map((u) => ({
    id: u.id,
    name: u.name,
    city: u.city,
    is_active: u.is_active,
    sort_order: u.sort_order,
    studentCount: (u.profiles as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  const unlistedCountMap = new Map<string, number>();
  (unlistedProfiles || []).forEach((p) => {
    if (p.university_other && p.university_other.trim()) {
      const trimmed = p.university_other.trim();
      unlistedCountMap.set(trimmed, (unlistedCountMap.get(trimmed) || 0) + 1);
    }
  });

  const unlistedEntries: UnlistedEntry[] = Array.from(unlistedCountMap.entries())
    .map(([rawName, studentCount]) => ({ rawName, studentCount }))
    .sort((a, b) => b.studentCount - a.studentCount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0B1F4D]">Üniversiteler Kataloğu</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Sistemde tanımlı üniversiteleri yönetin ve öğrencilerin girdiği özel üniversite isimlerini eşleştirin.
        </p>
      </div>

      <UniversitiesManager
        universities={universities}
        unlistedEntries={unlistedEntries}
      />
    </div>
  );
}
