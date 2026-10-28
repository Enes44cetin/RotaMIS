import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import {
  StudentsTable,
  type StudentItem,
} from "@/components/admin/users/students-table";

export const metadata: Metadata = {
  title: "Öğrenci Yönetimi — Admin Konsolu",
};

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: rawProfiles } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      university_other,
      total_xp,
      current_streak,
      onboarding_completed,
      created_at,
      university:universities(name),
      target_career:career_paths!profiles_target_career_path_id_fkey(name_tr)
    `
    )
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .limit(500);

  const students: StudentItem[] = (rawProfiles || []).map((p) => {
    const uni = (p.university as unknown as { name: string } | null)?.name;
    const career = (p.target_career as unknown as { name_tr: string } | null)
      ?.name_tr;

    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      university_name: uni || p.university_other || "Belirtilmemiş",
      target_career_name: career || "Seçilmedi",
      total_xp: p.total_xp || 0,
      current_streak: p.current_streak || 0,
      onboarding_completed: p.onboarding_completed,
      created_at: new Date(p.created_at).toLocaleDateString("tr-TR"),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0B1F4D]">
          Kayıtlı Öğrenciler ({students.length})
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Sisteme kayıt olmuş YBS öğrencilerinin hedef kariyer alanları, check-up
          durumları ve puanları.
        </p>
      </div>

      <StudentsTable students={students} />
    </div>
  );
}
