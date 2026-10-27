"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Archive,
  Inbox,
  ArrowRight,
  Check,
  Building2,
  MapPin,
  Users,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/ui/data-table";
import { FormDrawer } from "@/components/admin/ui/form-drawer";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  createUniversityAction,
  updateUniversityAction,
  toggleActiveUniversityAction,
  deleteUniversityAction,
  mergeUnlistedUniversityAction,
} from "@/actions/admin/universities";
import { toast } from "sonner";

export interface UniversityItem {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
  sort_order: number;
  studentCount: number;
}

export interface UnlistedEntry {
  rawName: string;
  studentCount: number;
}

interface UniversitiesManagerProps {
  universities: UniversityItem[];
  unlistedEntries: UnlistedEntry[];
}

export function UniversitiesManager({ universities, unlistedEntries }: UniversitiesManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<UniversityItem[]>(universities);
  const [unlisted, setUnlisted] = useState<UnlistedEntry[]>(unlistedEntries);
  const [activeTab, setActiveTab] = useState<"catalog" | "inbox">("catalog");

  // Sync state if server props change
  useEffect(() => {
    setItems(universities);
  }, [universities]);

  useEffect(() => {
    setUnlisted(unlistedEntries);
  }, [unlistedEntries]);

  // Form Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UniversityItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Confirm delete/archive
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "archive" | "delete";
    item: UniversityItem | null;
  }>({ isOpen: false, type: "archive", item: null });

  // Merge modal state
  const [mergeModal, setMergeModal] = useState<{
    isOpen: boolean;
    rawName: string;
    studentCount: number;
  }>({ isOpen: false, rawName: "", studentCount: 0 });

  const [mergeMode, setMergeMode] = useState<"create_new" | "merge_existing">("create_new");
  const [newUniName, setNewUniName] = useState("");
  const [newUniCity, setNewUniCity] = useState("");
  const [targetUniId, setTargetUniId] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  const openCreateDrawer = () => {
    setEditingItem(null);
    setName("");
    setCity("");
    setSortOrder(items.length + 1);
    setIsActive(true);
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: UniversityItem) => {
    setEditingItem(item);
    setName(item.name);
    setCity(item.city || "");
    setSortOrder(item.sort_order);
    setIsActive(item.is_active);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Lütfen üniversite adı giriniz.");
      return;
    }

    setIsSubmitting(true);
    let res: { success: boolean; id?: string; error?: string };

    if (editingItem) {
      res = await updateUniversityAction(editingItem.id, {
        name,
        city,
        sort_order: sortOrder,
        is_active: isActive,
      });
      if (res.success) {
        setItems((prev) =>
          prev.map((u) =>
            u.id === editingItem.id
              ? { ...u, name, city: city || null, sort_order: sortOrder, is_active: isActive }
              : u
          )
        );
      }
    } else {
      res = await createUniversityAction({
        name,
        city,
        sort_order: sortOrder,
        is_active: isActive,
      });
      if (res.success && (res as { id?: string }).id) {
        setItems((prev) => [
          ...prev,
          {
            id: (res as { id: string }).id,
            name,
            city: city || null,
            sort_order: sortOrder,
            is_active: isActive,
            studentCount: 0,
          },
        ]);
      }
    }

    setIsSubmitting(false);

    if (res.success) {
      toast.success(editingItem ? "Üniversite güncellendi!" : "Üniversite kataloğa eklendi!");
      setDrawerOpen(false);
    } else {
      toast.error(res.error || "İşlem başarısız oldu.");
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.item) return;
    const { id, is_active } = confirmDialog.item;
    const targetType = confirmDialog.type;
    setConfirmDialog({ isOpen: false, type: "archive", item: null });

    if (targetType === "archive") {
      // Optimistic update: instant UI response (0ms)
      setItems((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: !is_active } : u))
      );
      toast.success(!is_active ? "Üniversite aktifleştirildi" : "Üniversite arşive alındı");

      const res = await toggleActiveUniversityAction(id, !is_active);
      if (!res.success) {
        setItems(universities);
        toast.error(res.error || "Durum değiştirilemedi");
      }
    } else {
      // Optimistic delete: instant UI response (0ms)
      setItems((prev) => prev.filter((u) => u.id !== id));
      toast.success("Üniversite kalıcı olarak silindi");

      const res = await deleteUniversityAction(id);
      if (!res.success) {
        setItems(universities);
        toast.error(res.error || "Silinemedi");
      }
    }
  };

  const openMergeModal = (entry: UnlistedEntry) => {
    setMergeModal({ isOpen: true, rawName: entry.rawName, studentCount: entry.studentCount });
    setMergeMode("create_new");
    setNewUniName(entry.rawName);
    setNewUniCity("");
    setTargetUniId(items[0]?.id || "");
  };

  const handleMergeSubmit = async () => {
    setIsMerging(true);
    const targetRawName = mergeModal.rawName;
    const res = await mergeUnlistedUniversityAction({
      rawName: targetRawName,
      action: mergeMode,
      targetUniversityId: mergeMode === "merge_existing" ? targetUniId : undefined,
      newUniversityName: mergeMode === "create_new" ? newUniName : undefined,
      city: mergeMode === "create_new" ? newUniCity : undefined,
    });
    setIsMerging(false);

    if (res.success) {
      toast.success(`${res.count} öğrenci profili başarıyla eşleştirildi!`);
      // Optimistically remove from inbox
      setUnlisted((prev) => prev.filter((e) => e.rawName !== targetRawName));
      // If created as new, add to catalog items
      if (mergeMode === "create_new" && res.newId) {
        setItems((prev) => [
          ...prev,
          {
            id: res.newId!,
            name: newUniName,
            city: newUniCity || null,
            sort_order: items.length + 1,
            is_active: true,
            studentCount: res.count || 0,
          },
        ]);
      } else if (mergeMode === "merge_existing" && targetUniId) {
        // Increment student count on existing university
        setItems((prev) =>
          prev.map((u) =>
            u.id === targetUniId
              ? { ...u, studentCount: u.studentCount + (res.count || 0) }
              : u
          )
        );
      }
      setMergeModal({ isOpen: false, rawName: "", studentCount: 0 });
    } else {
      toast.error(res.error || "Eşleştirme başarısız.");
    }
  };

  const columns: Column<UniversityItem>[] = [
    {
      key: "name",
      header: "Üniversite Adı",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-xs">{item.name}</div>
            {item.city && (
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{item.city}</span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "studentCount",
      header: "Kayıtlı Öğrenci",
      align: "center",
      render: (item) => (
        <span className="font-bold text-slate-700 text-xs">{item.studentCount}</span>
      ),
    },
    {
      key: "sort_order",
      header: "Sıra",
      align: "center",
      render: (item) => <span className="font-mono text-slate-500">{item.sort_order}</span>,
    },
    {
      key: "is_active",
      header: "Durum",
      align: "center",
      render: (item) => <StatusBadge status={item.is_active} />,
    },
    {
      key: "actions",
      header: "İşlemler",
      align: "right",
      render: (item) => {
        const canDelete = item.studentCount === 0;
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => openEditDrawer(item)}
              title="Düzenle"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirmDialog({ isOpen: true, type: "archive", item })}
              title={item.is_active ? "Arşive Al" : "Aktifleştir"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            {canDelete && (
              <button
                onClick={() => setConfirmDialog({ isOpen: true, type: "delete", item })}
                title="Kalıcı Sil"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "catalog"
              ? "bg-[#0B1F4D] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Üniversite Kataloğu ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("inbox")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "inbox"
              ? "bg-[#2F5BFF] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>"Listede Yok" Gelen Kutusu</span>
          {unlisted.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-amber-950 text-[10px] font-black">
              {unlisted.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "catalog" ? (
        <DataTable
          data={items}
          columns={columns}
          rowKey={(item) => item.id}
          searchKey="name"
          searchPlaceholder="Üniversite adı veya şehir ara..."
          actions={
            <button
              onClick={openCreateDrawer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2F5BFF] hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Üniversite Ekle</span>
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-[#0B1F4D]">
              Öğrencilerin Elle Girdiği Üniversiteler
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Check-up sırasında "Listede yok" seçeneğini kullanan öğrencilerin yazdığı isimler. Buradan tek tıkla yeni üniversite olarak ekleyebilir veya mevcut bir kayıtla eşleştirebilirsiniz.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {unlisted.length > 0 ? (
              unlisted.map((entry) => (
                <div
                  key={entry.rawName}
                  className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold text-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">"{entry.rawName}"</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{entry.studentCount} öğrenci bu ismi girdi</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openMergeModal(entry)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2F5BFF] hover:bg-blue-600 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Kataloğa Aktar / Eşleştir</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">Şu an incelenmesi gereken listede olmayan üniversite girdisi yok.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Drawer (Create / Edit Catalog Item) */}
      <FormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingItem ? "Üniversiteyi Düzenle" : "Yeni Üniversite Ekle"}
        description="Öğrencilerin kayıt ve check-up sırasında seçeceği üniversite kaydı."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Üniversite Adı *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Düzce Üniversitesi"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Şehir</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Örn: Düzce, İstanbul, Ankara"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sıralama</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-800">Yayında / Aktif</div>
              <div className="text-[11px] text-slate-500">Pasife alınırsa seçim listesinde görünmez.</div>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold bg-[#2F5BFF] hover:bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </FormDrawer>

      {/* Merge Modal for Unlisted Entries */}
      {mergeModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMergeModal({ isOpen: false, rawName: "", studentCount: 0 })}
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#0B1F4D]">
                  Listede Olmayan Üniversiteyi Eşleştir
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Öğrenci girdisi: <strong className="text-slate-800">"{mergeModal.rawName}"</strong> ({mergeModal.studentCount} öğrenci)
                </p>
              </div>

              {/* Action selection */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMergeMode("create_new")}
                  className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                    mergeMode === "create_new"
                      ? "bg-blue-50 border-blue-500 text-blue-900"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-bold">Yeni Olarak Ekle</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Kataloğa yeni üniversite açar</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMergeMode("merge_existing")}
                  className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                    mergeMode === "merge_existing"
                      ? "bg-blue-50 border-blue-500 text-blue-900"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-bold">Mevcutla Eşleştir</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Yazım hatalarını düzeltir</div>
                </button>
              </div>

              {mergeMode === "create_new" ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Resmi Üniversite Adı
                    </label>
                    <input
                      type="text"
                      value={newUniName}
                      onChange={(e) => setNewUniName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Şehir</label>
                    <input
                      type="text"
                      value={newUniCity}
                      onChange={(e) => setNewUniCity(e.target.value)}
                      placeholder="Şehir adı..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bağlanacak Mevcut Üniversite
                  </label>
                  <select
                    value={targetUniId}
                    onChange={(e) => setTargetUniId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.city ? `(${u.city})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMergeModal({ isOpen: false, rawName: "", studentCount: 0 })}
                  disabled={isMerging}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleMergeSubmit}
                  disabled={isMerging}
                  className="px-4 py-2 text-xs font-bold bg-[#2F5BFF] hover:bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isMerging ? "Eşleştiriliyor..." : "Eşleştirmeyi Tamamla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: "archive", item: null })}
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.type === "archive"
            ? confirmDialog.item?.is_active
              ? "Üniversiteyi Arşive Al"
              : "Üniversiteyi Aktifleştir"
            : "Üniversiteyi Kalıcı Sil"
        }
        message={
          confirmDialog.type === "archive"
            ? `"${confirmDialog.item?.name}" üniversitesi ${
                confirmDialog.item?.is_active
                  ? "arşive alınacak ve öğrenci kayıt seçiminden gizlenecek."
                  : "yeniden aktif hale getirilecek."
              }`
            : `"${confirmDialog.item?.name}" üniversitesi kalıcı olarak silinecek.`
        }
        confirmLabel={confirmDialog.type === "archive" ? "Onayla" : "Kalıcı Sil"}
        variant={confirmDialog.type === "delete" ? "danger" : "warning"}
      />
    </div>
  );
}
