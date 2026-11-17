import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { MarketImportWizard } from "@/components/admin/import/market-import-wizard";

export const metadata: Metadata = {
  title: "Sektör Verisi Toplu Yükleme (CSV) — Admin Konsolu",
};

export default async function AdminMarketImportPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: careerPaths }, { data: rawBatches }] = await Promise.all([
    supabase
      .from("career_paths")
      .select("id, name_tr, slug")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("market_import_batches")
      .select(
        `
        id,
        file_name,
        market_scope,
        role_filter,
        total_postings,
        imported_skills_count,
        radar_axes_count,
        created_at,
        career:career_paths(name_tr)
      `
      )
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const recentBatches = (rawBatches || []).map((b) => {
    const careerRel = b.career as unknown as { name_tr: string } | null;
    return {
      id: b.id,
      file_name: b.file_name,
      market_scope: b.market_scope,
      role_filter: b.role_filter,
      total_postings: b.total_postings,
      imported_skills_count: b.imported_skills_count,
      radar_axes_count: b.radar_axes_count,
      created_at: b.created_at,
      career_name: careerRel?.name_tr,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0B1F4D]">
          Sektör Verisi Toplu Yükleme (Bulk Import)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          LinkedIn ve Kariyer.net iş ilanı analiz çıktılarını (CSV) tek tıkla
          sisteme aktarın, mesleklere özel 6&apos;lı beceri radarlarını ve
          dinamik check-up soru havuzunu oluşturun.
        </p>
      </div>

      <MarketImportWizard
        careerPaths={careerPaths || []}
        recentBatches={recentBatches}
      />
    </div>
  );
}

