import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/ui/stat-card";
import {
  Users,
  CheckCircle2,
  Briefcase,
  Sparkles,
  BookOpenCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  ExternalLink,
  GraduationCap,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  // 1. Fetch counts in parallel
  const [
    { count: studentCount },
    { count: completedAssessmentsCount },
    { count: activeCareerPathsCount },
    { count: activeSkillsCount },
    { count: resourcesCount },
    { count: unlistedUniCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("assessments").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("career_paths").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("skills").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("learning_resources").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).not("university_other", "is", null),
  ]);

  // 2. Fetch career paths with requirements count to detect empty matrixes
  const { data: careerPaths } = await supabase
    .from("career_paths")
    .select(`
      id,
      name_tr,
      slug,
      is_active,
      requirements:career_path_skill_requirements(count)
    `)
    .eq("is_active", true)
    .order("sort_order");

  const pathsWithoutMatrix = (careerPaths || []).filter(
    (p) => !p.requirements || (p.requirements as unknown as { count: number }[])[0]?.count === 0
  );

  // 3. Fetch top 5 average skill gaps across students
  const { data: rawGaps } = await supabase
    .from("v_skill_gap")
    .select("skill_slug, name_tr, gap, required_level")
    .limit(100);

  // Group and average gaps by skill
  const gapMap = new Map<string, { name: string; totalGap: number; count: number }>();
  (rawGaps || []).forEach((row) => {
    const existing = gapMap.get(row.skill_slug) || { name: row.name_tr, totalGap: 0, count: 0 };
    existing.totalGap += row.gap;
    existing.count += 1;
    gapMap.set(row.skill_slug, existing);
  });

  const topGaps = Array.from(gapMap.values())
    .map((g) => ({
      name: g.name,
      avgGap: (g.totalGap / g.count).toFixed(1),
      count: g.count,
    }))
    .sort((a, b) => Number(b.avgGap) - Number(a.avgGap))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0B1F4D] via-[#122A63] to-[#2F5BFF] rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-950/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Merkezi Yönetim Konsolu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            RotaMIS Sektör & Katalog Yönetimi
          </h1>
          <p className="mt-2 text-blue-100/80 text-xs sm:text-sm max-w-xl leading-relaxed">
            Sektör beklenti matrislerini, beceri standartlarını ve öğrencilerin kişiselleştirilmiş yol haritalarına beslenen eğitim kaynaklarını buradan yönetin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/admin/matrix"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0B1F4D] hover:bg-blue-50 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#2F5BFF]" />
            <span>Matrisi Düzenle</span>
          </Link>
          <Link
            href="/admin/resources"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/40 hover:bg-blue-600/60 text-white border border-blue-400/30 font-bold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>Kaynak Ekle</span>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Öğrenciler"
          value={studentCount ?? 0}
          icon={Users}
          subtext="Kayıtlı öğrenci sayısı"
          variant="primary"
        />
        <StatCard
          title="Check-Up"
          value={completedAssessmentsCount ?? 0}
          icon={CheckCircle2}
          subtext="Tamamlanan değerlendirme"
          variant="success"
        />
        <StatCard
          title="Kariyer Rotaları"
          value={activeCareerPathsCount ?? 0}
          icon={Briefcase}
          subtext="Aktif kariyer alanı"
          variant="default"
        />
        <StatCard
          title="Beceriler"
          value={activeSkillsCount ?? 0}
          icon={Sparkles}
          subtext="Tanımlı beceri havuzu"
          variant="default"
        />
        <StatCard
          title="Eğitim / Sertifika"
          value={resourcesCount ?? 0}
          icon={BookOpenCheck}
          subtext="Önerilen onaylı kaynak"
          variant="default"
        />
      </div>

      {/* Middle Row: Data Health Warnings & Top Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): System Health & Actionable Alerts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0B1F4D] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Veri Sağlığı & Dikkat Gerektirenler</span>
            </h2>
            <span className="text-xs text-slate-400">Canlı Sistem Analizi</span>
          </div>

          <div className="space-y-3">
            {/* Alert: Paths without matrix */}
            {pathsWithoutMatrix.length > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-900">
                      {pathsWithoutMatrix.length} Kariyer Alanında Sektör Beklentisi Tanımlı Değil!
                    </h3>
                    <p className="text-xs text-amber-700/90 mt-1">
                      {pathsWithoutMatrix.map((p) => p.name_tr).join(", ")} için henüz hiçbir beceri seviyesi atanmamış. Bu rotayı seçen öğrencilerin radar grafiği boş çıkacaktır.
                    </p>
                  </div>
                </div>

                <Link
                  href="/admin/matrix"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shrink-0 transition-colors"
                >
                  Tanımla
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-center gap-3 text-xs text-emerald-800 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Tüm aktif kariyer rotalarının sektör beklenti matrisleri eksiksiz yapılandırılmış.</span>
              </div>
            )}

            {/* Alert: Unlisted universities */}
            {(unlistedUniCount ?? 0) > 0 && (
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-blue-900">
                      {unlistedUniCount} Öğrenci "Listede Yok" Üniversite Girdi
                    </h3>
                    <p className="text-xs text-blue-700/90 mt-1">
                      Öğrencilerin elle girdiği üniversiteleri inceleyip tek tıkla resmi kataloğa dahil edebilirsiniz.
                    </p>
                  </div>
                </div>

                <Link
                  href="/admin/universities"
                  className="px-3 py-1.5 rounded-lg bg-[#2F5BFF] text-white font-bold text-xs hover:bg-blue-700 shrink-0 transition-colors"
                >
                  İncele
                </Link>
              </div>
            )}
          </div>

          {/* Quick Management Shortcuts */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Katalog Hızlı Erişim
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { title: "Kariyer Rotaları", href: "/admin/career-paths", count: activeCareerPathsCount ?? 0, icon: Briefcase },
                { title: "Beceri Havuzu", href: "/admin/skills", count: activeSkillsCount ?? 0, icon: Sparkles },
                { title: "Üniversiteler", href: "/admin/universities", count: "Katalog", icon: GraduationCap },
                { title: "Eğitim / Sertifika", href: "/admin/resources", count: resourcesCount ?? 0, icon: BookOpenCheck },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="mt-3">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.count} Kayıt
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right (1 col): Most Prominent Skill Gaps in YBS */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#0B1F4D] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>En Yüksek Beceri Açıkları</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ortalama Gap
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Öğrencilerin check-up puanları ile sektör beklentisi arasındaki en yüksek farklar. Öncelikli olarak bu alanlara eğitim ve görev atanması önerilir.
            </p>

            <div className="space-y-3">
              {topGaps.length > 0 ? (
                topGaps.map((g, i) => (
                  <div
                    key={g.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-bold text-slate-800">{g.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md text-xs">
                      <span>-{g.avgGap}</span>
                      <span className="text-[10px] text-slate-400 font-normal">seviye</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Yeterli check-up verisi toplandığında beceri açıkları burada listelenecektir.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              href="/admin/matrix"
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 p-2 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <span>Tüm Matrisi İncele</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
