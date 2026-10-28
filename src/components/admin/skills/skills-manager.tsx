"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Archive,
  Layers,
  Code2,
  Workflow,
  MessageCircle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/ui/data-table";
import { FormDrawer } from "@/components/admin/ui/form-drawer";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { slugify } from "@/lib/admin/slugify";
import {
  createSkillAction,
  updateSkillAction,
  toggleActiveSkillAction,
  deleteSkillAction,
} from "@/actions/admin/skills";
import { toast } from "sonner";

export interface SkillItem {
  id: string;
  name_tr: string;
  name_en: string;
  slug: string;
  category: "technical" | "business" | "soft";
  description_tr: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  careerUsageCount: number;
  assessmentUsageCount: number;
}

interface SkillsManagerProps {
  skills: SkillItem[];
}

export function SkillsManager({ skills }: SkillsManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<SkillItem[]>(skills);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "technical" | "business" | "soft">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SkillItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if server props change
  useEffect(() => {
    setItems(skills);
  }, [skills]);

  // Form State
  const [nameTr, setNameTr] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<"technical" | "business" | "soft">("technical");
  const [descTr, setDescTr] = useState("");
  const [icon, setIcon] = useState("sparkles");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "archive" | "delete";
    item: SkillItem | null;
  }>({ isOpen: false, type: "archive", item: null });

  const filteredSkills = selectedCategory === "all"
    ? items
    : items.filter((s) => s.category === selectedCategory);

  const openCreateDrawer = () => {
    setEditingItem(null);
    setNameTr("");
    setSlug("");
    setCategory(selectedCategory === "all" ? "technical" : selectedCategory);
    setDescTr("");
    setIcon("sparkles");
    setSortOrder(items.length + 1);
    setIsActive(true);
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: SkillItem) => {
    setEditingItem(item);
    setNameTr(item.name_tr);
    setSlug(item.slug);
    setCategory(item.category);
    setDescTr(item.description_tr || "");
    setIcon(item.icon || "sparkles");
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

  const handleSubmit = async () => {
    if (!nameTr.trim() || !slug.trim()) {
      toast.error("Lütfen beceri adı ve slug giriniz.");
      return;
    }

    setIsSubmitting(true);
    let res: { success: boolean; id?: string; error?: string };

    if (editingItem) {
      res = await updateSkillAction(editingItem.id, {
        name_tr: nameTr,
        slug,
        category,
        description_tr: descTr,
        icon,
        sort_order: sortOrder,
        is_active: isActive,
      });
      if (res.success) {
        setItems((prev) =>
          prev.map((s) =>
            s.id === editingItem.id
              ? {
                  ...s,
                  name_tr: nameTr,
                  slug,
                  category,
                  description_tr: descTr,
                  icon,
                  sort_order: sortOrder,
                  is_active: isActive,
                }
              : s
          )
        );
      }
    } else {
      res = await createSkillAction({
        name_tr: nameTr,
        slug,
        category,
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
            category,
            description_tr: descTr,
            icon,
            sort_order: sortOrder,
            is_active: isActive,
            careerUsageCount: 0,
            assessmentUsageCount: 0,
          },
        ]);
      }
    }

    setIsSubmitting(false);

    if (res.success) {
      toast.success(editingItem ? "Beceri güncellendi!" : "Yeni beceri havuza eklendi!");
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
        prev.map((s) => (s.id === id ? { ...s, is_active: !is_active } : s))
      );
      toast.success(!is_active ? "Beceri aktifleştirildi" : "Beceri arşive alındı");

      const res = await toggleActiveSkillAction(id, !is_active);
      if (!res.success) {
        setItems(skills);
        toast.error(res.error || "Durum değiştirilemedi");
      }
    } else {
      // Optimistic delete: instant UI response (0ms)
      setItems((prev) => prev.filter((s) => s.id !== id));
      toast.success("Beceri kalıcı olarak silindi");

      const res = await deleteSkillAction(id);
      if (!res.success) {
        setItems(skills);
        toast.error(res.error || "Silinemedi");
      }
    }
  };

  const categoryLabels = {
    technical: { label: "Teknik Beceri", icon: Code2, color: "text-blue-700 bg-blue-50 border-blue-200" },
    business: { label: "İş & Süreç", icon: Workflow, color: "text-purple-700 bg-purple-50 border-purple-200" },
    soft: { label: "Sosyal Beceri", icon: MessageCircle, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  };

  const columns: Column<SkillItem>[] = [
    {
      key: "name_tr",
      header: "Beceri Adı",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
            <Sparkles className="w-4 h-4 text-[#2F5BFF]" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-xs">{item.name_tr}</div>
            <div className="text-[10px] text-slate-400 font-mono">/{item.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      render: (item) => {
        const cat = categoryLabels[item.category];
        const Icon = cat.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cat.color}`}>
            <Icon className="w-3 h-3" />
            <span>{cat.label}</span>
          </span>
        );
      },
    },
    {
      key: "careerUsageCount",
      header: "Kullanılan Rota",
      align: "center",
      render: (item) => (
        <span className="font-bold text-slate-700 text-xs">
          {item.careerUsageCount} Rota
        </span>
      ),
    },
    {
      key: "assessmentUsageCount",
      header: "Değerlendirilme",
      align: "center",
      render: (item) => (
        <span className="font-medium text-slate-500 text-xs">
          {item.assessmentUsageCount} kez
        </span>
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
        const canDelete = item.careerUsageCount === 0 && item.assessmentUsageCount === 0;

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
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: "Tüm Beceriler", count: items.length },
          { key: "technical", label: "Teknik Beceriler", count: items.filter((s) => s.category === "technical").length },
          { key: "business", label: "İş & Süreç", count: items.filter((s) => s.category === "business").length },
          { key: "soft", label: "Sosyal Beceriler", count: items.filter((s) => s.category === "soft").length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedCategory(tab.key as typeof selectedCategory)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === tab.key
                ? "bg-[#0B1F4D] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                selectedCategory === tab.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        data={filteredSkills}
        columns={columns}
        rowKey={(item) => item.id}
        searchKey="name_tr"
        searchPlaceholder="Beceri ara..."
        actions={
          <button
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2F5BFF] hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Beceri Ekle</span>
          </button>
        }
      />

      {/* Form Drawer */}
      <FormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingItem ? "Beceriyi Düzenle" : "Yeni Beceri Tanımla"}
        description="Öğrencilerin check-up sırasında değerlendireceği beceri tanımını girin."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kategori *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "technical", label: "Teknik" },
                { val: "business", label: "İş & Süreç" },
                { val: "soft", label: "Sosyal" },
              ].map((c) => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => setCategory(c.val as typeof category)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    category === c.val
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Beceri Adı (Türkçe) *</label>
            <input
              type="text"
              value={nameTr}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Örn: SQL, BPMN 2.0, Sunum Becerisi"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">URL / Slug Adı *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="orn: sql, bpmn-2"
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Açıklama</label>
            <textarea
              rows={3}
              value={descTr}
              onChange={(e) => setDescTr(e.target.value)}
              placeholder="Bu becerinin kapsamını ve YBS öğrencisi için neden önemli olduğunu belirtin..."
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
                placeholder="database, code, workflow vb."
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
              <div className="text-[11px] text-slate-500">Pasife alınırsa yeni check-up'larda sorulmaz.</div>
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: "archive", item: null })}
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.type === "archive"
            ? confirmDialog.item?.is_active
              ? "Beceriyi Arşive Al"
              : "Beceriyi Aktifleştir"
            : "Beceriyi Kalıcı Sil"
        }
        message={
          confirmDialog.type === "archive"
            ? `"${confirmDialog.item?.name_tr}" becerisi ${
                confirmDialog.item?.is_active
                  ? "arşive alınacak. Mevcut öğrenci puanları korunur ancak yeni check-up'larda görünmez."
                  : "yeniden aktif hale getirilecek."
              }`
            : `"${confirmDialog.item?.name_tr}" becerisi kalıcı olarak silinecek.`
        }
        confirmLabel={confirmDialog.type === "archive" ? "Onayla" : "Kalıcı Sil"}
        variant={confirmDialog.type === "delete" ? "danger" : "warning"}
      />
    </div>
  );
}
