import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { History, ShieldCheck, Clock, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Denetim & Değişiklik Geçmişi — Admin Konsolu",
};

interface AuditItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin_name: string;
  admin_email: string;
}

export default async function AdminAuditPage() {
  const supabase = await createClient();

  const { data: rawLogs } = await supabase
    .from("admin_audit_log")
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      details,
      created_at,
      admin:profiles!admin_audit_log_admin_id_fkey (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const logs: AuditItem[] = (rawLogs || []).map((l) => {
    const admin = l.admin as unknown as { full_name: string | null; email: string } | null;
    return {
      id: l.id,
      action: l.action,
      entity_type: l.entity_type,
      entity_id: l.entity_id,
      details: (l.details as Record<string, unknown>) || {},
      created_at: new Date(l.created_at).toLocaleString("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      admin_name: admin?.full_name || "Yönetici",
      admin_email: admin?.email || "",
    };
  });

  const actionLabels: Record<string, { label: string; color: string }> = {
    update_matrix: { label: "Sektör Matrisi Güncellendi", color: "bg-blue-100 text-blue-800" },
    copy_matrix: { label: "Sektör Matrisi Kopyalandı", color: "bg-purple-100 text-purple-800" },
    create_career_path: { label: "Yeni Kariyer Rotası Eklendi", color: "bg-emerald-100 text-emerald-800" },
    update_career_path: { label: "Kariyer Rotası Düzenlendi", color: "bg-slate-100 text-slate-800" },
    archive_career_path: { label: "Kariyer Rotası Arşive Alındı", color: "bg-amber-100 text-amber-800" },
    activate_career_path: { label: "Kariyer Rotası Aktifleştirildi", color: "bg-emerald-100 text-emerald-800" },
    delete_career_path: { label: "Kariyer Rotası Silindi", color: "bg-rose-100 text-rose-800" },
    create_skill: { label: "Yeni Beceri Eklendi", color: "bg-emerald-100 text-emerald-800" },
    update_skill: { label: "Beceri Düzenlendi", color: "bg-slate-100 text-slate-800" },
    archive_skill: { label: "Beceri Arşive Alındı", color: "bg-amber-100 text-amber-800" },
    activate_skill: { label: "Beceri Aktifleştirildi", color: "bg-emerald-100 text-emerald-800" },
    delete_skill: { label: "Beceri Silindi", color: "bg-rose-100 text-rose-800" },
    create_university: { label: "Üniversite Eklendi", color: "bg-emerald-100 text-emerald-800" },
    update_university: { label: "Üniversite Düzenlendi", color: "bg-slate-100 text-slate-800" },
    merge_unlisted_university: { label: "Listede Olmayan Üniversite Eşleştirildi", color: "bg-blue-100 text-blue-800" },
    create_resource: { label: "Yeni Kaynak Eklendi", color: "bg-emerald-100 text-emerald-800" },
    update_resource: { label: "Kaynak Düzenlendi", color: "bg-slate-100 text-slate-800" },
    delete_resource: { label: "Kaynak Silindi", color: "bg-rose-100 text-rose-800" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0B1F4D]">Denetim & Değişiklik Geçmişi</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Admin konsolu üzerinden yapılan tüm kritik matris, katalog ve eşleştirme hareketleri bu defterde değişmez olarak kaydedilir.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {logs.length > 0 ? (
            logs.map((log) => {
              const act = actionLabels[log.action] || {
                label: log.action,
                color: "bg-slate-100 text-slate-700",
              };

              return (
                <div
                  key={log.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                      <History className="w-4 h-4 text-blue-600" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${act.color}`}>
                          {act.label}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          ({log.entity_type})
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 mt-1 flex items-center gap-2">
                        <span className="font-bold">{log.admin_name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">({log.admin_email})</span>
                      </div>

                      {/* Details preview */}
                      {Object.keys(log.details).length > 0 && (
                        <div className="mt-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 max-w-lg overflow-x-auto">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 whitespace-nowrap self-end sm:self-auto flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{log.created_at}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">Henüz kayıtlı bir denetim hareketi bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
