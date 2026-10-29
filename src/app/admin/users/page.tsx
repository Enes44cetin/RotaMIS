import { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
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

  const [{ data: rawProfiles }, { data: adminProfiles }] = await Promise.all([
    supabase
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
      .limit(500),
    supabase
      .from("profiles")
      .select("id, email, full_name, onboarding_completed")
      .eq("role", "admin")
      .order("created_at", { ascending: true }),
  ]);

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

      {adminProfiles && adminProfiles.length > 0 && (
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2F5BFF] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#0B1F4D]">
                Sistem Yöneticileri ({adminProfiles.length})
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Yönetici hesapları öğrenci istatistiklerini etkilememesi için aşağıdaki tablodan ayrı tutulur:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {adminProfiles.map((adm) => (
                  <span
                    key={adm.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200/80 text-xs font-semibold text-slate-800"
                  >
                    <span className="font-mono text-[11px] text-[#0B1F4D]">
                      {adm.email}
                    </span>
                    {adm.onboarding_completed && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Öğrenci Önizlemesi Aktif
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <StudentsTable students={students} />
    </div>
  );
}
