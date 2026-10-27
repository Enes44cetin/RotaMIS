"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Archive,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/ui/data-table";
import { FormDrawer } from "@/components/admin/ui/form-drawer";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { slugify } from "@/lib/admin/slugify";
import {
  createCareerPathAction,
  updateCareerPathAction,
  toggleActiveCareerPathAction,
  deleteCareerPathAction,
} from "@/actions/admin/career-paths";
import { toast } from "sonner";
import Link from "next/link";

export interface CareerPathItem {
  id: string;
  name_tr: string;
  name_en: string;
  slug: string;
  description_tr: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  requirementsCount: number;
  studentCount: number;
}

interface CareerPathsManagerProps {
  careerPaths: CareerPathItem[];
}

export function CareerPathsManager({ careerPaths }: CareerPathsManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<CareerPathItem[]>(careerPaths);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CareerPathItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if server props change
  useEffect(() => {
    setItems(careerPaths);
  }, [careerPaths]);

  // Form State
  const [nameTr, setNameTr] = useState("");
  const [slug, setSlug] = useState("");
  const [descTr, setDescTr] = useState("");
  const [icon, setIcon] = useState("briefcase");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Delete / Archive confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "archive" | "delete";
    item: CareerPathItem | null;
  }>({ isOpen: false, type: "archive", item: null });

  const openCreateDrawer = () => {
    setEditingItem(null);
    setNameTr("");
    setSlug("");
    setDescTr("");
    setIcon("briefcase");
    setSortOrder(items.length + 1);
    setIsActive(true);
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: CareerPathItem) => {
    setEditingItem(item);
    setNameTr(item.name_tr);
    setSlug(item.slug);
    setDescTr(item.description_tr || "");
    setIcon(item.icon || "briefcase");
    setSortOrder(item.sort_order);
    setIsActive(item.is_active);
    setDrawerOpen(true);
  };

  const handleNameChange = (val: string) => {
    setNameTr(val);
    if (!editingItem) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (andGoToMatrix = false) => {
    if (!nameTr.trim() || !slug.trim()) {
      toast.error("Lütfen alan adı ve slug giriniz.");
      return;
    }

    setIsSubmitting(true);
    let res: { success: boolean; id?: string; error?: string };

    if (editingItem) {
      res = await updateCareerPathAction(editingItem.id, {
        name_tr: nameTr,
        slug,
        description_tr: descTr,
        icon,
        sort_order: sortOrder,
        is_active: isActive,
      });
      if (res.success) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === editingItem.id
              ? {
                  ...p,
                  name_tr: nameTr,
                  slug,
                  description_tr: descTr,
                  icon,
                  sort_order: sortOrder,
                  is_active: isActive,
                }
              : p
          )
        );
      }
    } else {
      res = await createCareerPathAction({
        name_tr: nameTr,
        slug,
        description_tr: descTr,
        icon,
        sort_order: sortOrder,
        is_active: isActive,
      });
      if (res.success && (res as { id?: string }).id) {
        setItems((prev) => [
          ...prev,
          {
            id: (res as { id: string }).id,
            name_tr: nameTr,
            name_en: nameTr,
            slug,
            description_tr: descTr,
            icon,
            sort_order: sortOrder,
            is_active: isActive,
            requirementsCount: 0,
            studentCount: 0,
          },
        ]);
      }
    }

    setIsSubmitting(false);

    if (res.success) {
      toast.success(
        editingItem ? "Kariyer rotası güncellendi!" : "Yeni kariyer rotası başarıyla eklendi!"
      );
      setDrawerOpen(false);

      if (andGoToMatrix) {
        const targetId = editingItem ? editingItem.id : (res as { id?: string }).id;
        router.push(`/admin/matrix?career=${targetId}`);
      }
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
        prev.map((p) => (p.id === id ? { ...p, is_active: !is_active } : p))
      );
      toast.success(!is_active ? "Kariyer rotası aktifleştirildi" : "Kariyer rotası arşive alındı");

      const res = await toggleActiveCareerPathAction(id, !is_active);
      if (!res.success) {
        setItems(careerPaths);
        toast.error(res.error || "Durum değiştirilemedi");
      }
    } else {
      // Optimistic delete: instant UI response (0ms)
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.success("Kariyer rotası kalıcı olarak silindi");

      const res = await deleteCareerPathAction(id);
      if (!res.success) {
        setItems(careerPaths);
        toast.error(res.error || "Silinemedi");
      }
    }
  };

  const columns: Column<CareerPathItem>[] = [
    {
      key: "name_tr",
      header: "Kariyer Rotası",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-xs">{item.name_tr}</div>
            <div className="text-[10px] text-slate-400 font-mono">/{item.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "requirementsCount",
      header: "Beceri Beklentisi",
      align: "center",
      render: (item) => (
        <Link
          href={`/admin/matrix?career=${item.id}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
            item.requirementsCount > 0
              ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
          title="Matris beklentilerini görüntüle ve düzenle"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>{item.requirementsCount} Beceri</span>
        </Link>
      ),
    },
    {
      key: "studentCount",
      header: "Hedefleyen Öğrenci",
      align: "center",
      render: (item) => (
        <span className="font-semibold text-slate-700">{item.studentCount}</span>
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
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/matrix?career=${item.id}`}
            title="Sektör Matrisini Aç"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </Link>
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
          {item.studentCount === 0 && item.requirementsCount === 0 && (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, type: "delete", item })}
              title="Kalıcı Sil"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={items}
        columns={columns}
        rowKey={(item) => item.id}
        searchKey="name_tr"
        searchPlaceholder="Kariyer rotası ara..."
        actions={
          <button
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2F5BFF] hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kariyer Rotası Ekle</span>
          </button>
        }
      />

      {/* Form Drawer */}
      <FormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingItem ? "Kariyer Rotasını Düzenle" : "Yeni Kariyer Rotası Ekle"}
        description="Öğrencilerin check-up sırasında seçeceği hedef kariyer alanını tanımlayın."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kariyer Alanı Adı (Türkçe) *
            </label>
            <input
              type="text"
              value={nameTr}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Örn: Siber Güvenlik Analisti"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              URL / Slug Adı *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="orn: siber-guvenlik-analisti"
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Açıklama</label>
            <textarea
              rows={3}
              value={descTr}
              onChange={(e) => setDescTr(e.target.value)}
              placeholder="Bu kariyer rolünün temel sorumluluklarını özetleyin..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">İkon Adı</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="briefcase, shield, boxes vb."
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
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
          </div>

          <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-800">Yayında / Aktif</div>
              <div className="text-[11px] text-slate-500">
                Pasife alınırsa check-up listesinde görünmez.
              </div>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Vazgeç
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-[#0B1F4D] hover:bg-slate-900 text-white rounded-xl shadow-xs cursor-pointer"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-[#2F5BFF] hover:bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydet ve Matrisi Düzenle →"}
            </button>
          </div>
        </div>
      </FormDrawer>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: "archive", item: null })}
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.type === "archive"
            ? confirmDialog.item?.is_active
              ? "Kariyer Rotasını Arşive Al"
              : "Kariyer Rotasını Aktifleştir"
            : "Kariyer Rotasını Kalıcı Sil"
        }
        message={
          confirmDialog.type === "archive"
            ? `"${confirmDialog.item?.name_tr}" kariyer alanı ${
                confirmDialog.item?.is_active
                  ? "arşive alınacak ve öğrenci check-up seçiminden gizlenecek."
                  : "yeniden aktif hale getirilecek."
              }`
            : `"${confirmDialog.item?.name_tr}" kariyer alanı kalıcı olarak silinecek. Bu işlem geri alınamaz.`
        }
        confirmLabel={confirmDialog.type === "archive" ? "Onayla" : "Kalıcı Sil"}
        variant={confirmDialog.type === "delete" ? "danger" : "warning"}
      />
    </div>
  );
}
