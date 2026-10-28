"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  RefreshCw,
  Award,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Layers,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/ui/data-table";
import { FormDrawer } from "@/components/admin/ui/form-drawer";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  createResourceAction,
  updateResourceAction,
  toggleStatusResourceAction,
  deleteResourceAction,
  checkResourceLinksAction,
} from "@/actions/admin/resources";
import { toast } from "sonner";

export interface SkillRef {
  id: string;
  name_tr: string;
}

export interface ResourceSkillLink {
  skill_id: string;
  skill_name: string;
  min_level: number;
  target_level: number;
}

export interface ResourceItem {
  id: string;
  title: string;
  provider: string;
  url: string;
  resource_type: string;
  language: "tr" | "en" | "mixed";
  pricing: "free" | "freemium" | "paid";
  estimated_hours: number;
  difficulty: number;
  gives_certificate: boolean;
  certificate_info: string | null;
  description: string | null;
  status: "draft" | "published" | "archived";
  last_checked_at: string | null;
  link_status: "unknown" | "ok" | "broken";
  sort_order: number;
  skills: ResourceSkillLink[];
}

interface ResourcesManagerProps {
  resources: ResourceItem[];
  availableSkills: SkillRef[];
}

export function ResourcesManager({ resources, availableSkills }: ResourcesManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<ResourceItem[]>(resources);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);

  // Sync state if server props change
  useEffect(() => {
    setItems(resources);
  }, [resources]);

  // Form Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [url, setUrl] = useState("");
  const [resourceType, setResourceType] = useState<
    "course" | "article" | "video" | "project" | "certification" | "practice" | "other"
  >("course");
  const [language, setLanguage] = useState<"tr" | "en" | "mixed">("tr");
  const [pricing, setPricing] = useState<"free" | "freemium" | "paid">("free");
  const [estimatedHours, setEstimatedHours] = useState(4.0);
  const [difficulty, setDifficulty] = useState(1);
  const [givesCertificate, setGivesCertificate] = useState(false);
  const [certificateInfo, setCertificateInfo] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("published");
  const [sortOrder, setSortOrder] = useState(0);

  // Associated skills in drawer
  const [selectedSkills, setSelectedSkills] = useState<{
    skill_id: string;
    min_level: number;
    target_level: number;
  }[]>([]);

  // Picker row in drawer
  const [pickerSkillId, setPickerSkillId] = useState("");
  const [pickerMinLevel, setPickerMinLevel] = useState(1);
  const [pickerTargetLevel, setPickerTargetLevel] = useState(3);

  // Confirm delete dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: ResourceItem | null }>({
    isOpen: false,
    item: null,
  });

  const filteredResources = items.filter((r) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "broken") return r.link_status === "broken";
    return r.status === filterStatus;
  });

  const openCreateDrawer = () => {
    setEditingItem(null);
    setTitle("");
    setProvider("");
    setUrl("");
    setResourceType("course");
    setLanguage("tr");
    setPricing("free");
    setEstimatedHours(4.0);
    setDifficulty(1);
    setGivesCertificate(false);
    setCertificateInfo("");
    setDescription("");
    setStatus("published");
    setSortOrder(items.length + 1);
    setSelectedSkills([]);
    setPickerSkillId(availableSkills[0]?.id || "");
    setPickerMinLevel(1);
    setPickerTargetLevel(3);
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: ResourceItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setProvider(item.provider);
    setUrl(item.url);
    setResourceType(item.resource_type as typeof resourceType);
    setLanguage(item.language);
    setPricing(item.pricing);
    setEstimatedHours(item.estimated_hours);
    setDifficulty(item.difficulty);
    setGivesCertificate(item.gives_certificate);
    setCertificateInfo(item.certificate_info || "");
    setDescription(item.description || "");
    setStatus(item.status);
    setSortOrder(item.sort_order);
    setSelectedSkills(
      item.skills.map((s) => ({
        skill_id: s.skill_id,
        min_level: s.min_level,
        target_level: s.target_level,
      }))
    );
    setPickerSkillId(availableSkills[0]?.id || "");
    setPickerMinLevel(1);
    setPickerTargetLevel(3);
    setDrawerOpen(true);
  };

  const handleAddSkillLink = () => {
    if (!pickerSkillId) return;
    if (selectedSkills.some((s) => s.skill_id === pickerSkillId)) {
      toast.info("Bu beceri zaten listeye eklenmiş.");
      return;
    }
    setSelectedSkills([
      ...selectedSkills,
      {
        skill_id: pickerSkillId,
        min_level: pickerMinLevel,
        target_level: Math.max(pickerMinLevel, pickerTargetLevel),
      },
    ]);
  };

  const handleRemoveSkillLink = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s.skill_id !== skillId));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !provider.trim() || !url.trim()) {
      toast.error("Lütfen başlık, sağlayıcı ve geçerli bir URL giriniz.");
      return;
    }

    setIsSubmitting(true);
    let res: { success: boolean; id?: string; error?: string };

    const payload = {
      title,
      provider,
      url,
      resource_type: resourceType,
      language,
      pricing,
      estimated_hours: estimatedHours,
      difficulty,
      gives_certificate: givesCertificate,
      certificate_info: certificateInfo,
      description,
      status,
      sort_order: sortOrder,
      skills: selectedSkills,
    };

    if (editingItem) {
      res = await updateResourceAction(editingItem.id, payload);
      if (res.success) {
        setItems((prev) =>
          prev.map((r) =>
            r.id === editingItem.id
              ? {
                  ...r,
                  ...payload,
                  skills: selectedSkills.map((sk) => ({
                    skill_id: sk.skill_id,
                    skill_name: availableSkills.find((s) => s.id === sk.skill_id)?.name_tr || "",
                    min_level: sk.min_level,
                    target_level: sk.target_level,
                  })),
                }
              : r
          )
        );
      }
    } else {
      res = await createResourceAction(payload);
      if (res.success && (res as { id?: string }).id) {
        setItems((prev) => [
          ...prev,
          {
            id: (res as { id: string }).id,
            ...payload,
            certificate_info: certificateInfo || null,
            description: description || null,
            last_checked_at: null,
            link_status: "unknown" as const,
            skills: selectedSkills.map((sk) => ({
              skill_id: sk.skill_id,
              skill_name: availableSkills.find((s) => s.id === sk.skill_id)?.name_tr || "",
              min_level: sk.min_level,
              target_level: sk.target_level,
            })),
          },
        ]);
      }
    }

    setIsSubmitting(false);

    if (res.success) {
      toast.success(editingItem ? "Kaynak güncellendi!" : "Yeni kaynak kataloğa eklendi!");
      setDrawerOpen(false);
    } else {
      toast.error(res.error || "İşlem başarısız.");
    }
  };

  const handleCheckAllLinks = async () => {
    setIsCheckingLinks(true);
    toast.info("Tüm kaynak linkleri kontrol ediliyor, lütfen bekleyin...");
    const res = await checkResourceLinksAction();
    setIsCheckingLinks(false);

    if (res.success) {
      if (res.broken === 0) {
        toast.success(`Tüm ${res.total} kaynak linki sorunsuz çalışıyor! ✅`);
      } else {
        toast.warning(
          `Kontrol tamamlandı: ${res.ok} çalışan, ${res.broken} kırık link tespit edildi. ⚠️`
        );
      }
      router.refresh();
    } else {
      toast.error(res.error || "Link kontrolü başarısız.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;
    const targetId = deleteConfirm.item.id;
    setDeleteConfirm({ isOpen: false, item: null });

    // Optimistic delete: instant UI response (0ms)
    setItems((prev) => prev.filter((r) => r.id !== targetId));
    toast.success("Kaynak katalogdan silindi.");

    const res = await deleteResourceAction(targetId);
    if (!res.success) {
      setItems(resources);
      toast.error(res.error || "Silinemedi.");
    }
  };

  const typeLabels: Record<string, string> = {
    course: "Kurs",
    article: "Makale / Doküman",
    video: "Video Serisi",
    project: "Uygulamalı Proje",
    certification: "Sertifika Sınavı",
    practice: "Pratik / Egzersiz",
    other: "Diğer",
  };

  const pricingLabels = {
    free: { label: "Ücretsiz", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    freemium: { label: "Kısmen Ücretsiz", style: "bg-blue-50 text-blue-700 border-blue-200" },
    paid: { label: "Ücretli", style: "bg-slate-100 text-slate-700 border-slate-200" },
  };

  const columns: Column<ResourceItem>[] = [
    {
      key: "title",
      header: "Kaynak & Sağlayıcı",
      render: (item) => (
        <div className="flex items-start gap-3 max-w-xs">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpenCheck className="w-4 h-4" />
          </div>
          <div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-800 hover:text-blue-600 text-xs inline-flex items-center gap-1 group"
            >
              <span>{item.title}</span>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </a>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="font-semibold text-slate-600">{item.provider}</span>
              <span>•</span>
              <span className="uppercase">{item.language}</span>
              <span>•</span>
              <span>{item.estimated_hours}s</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "resource_type",
      header: "Tür & Ücret",
      render: (item) => {
        const pr = pricingLabels[item.pricing];
        return (
          <div className="space-y-1">
            <div className="font-semibold text-slate-700 text-xs">
              {typeLabels[item.resource_type] || item.resource_type}
            </div>
            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${pr.style}`}>
              {pr.label}
            </span>
          </div>
        );
      },
    },
    {
      key: "skills",
      header: "Hedef Beceriler",
      render: (item) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {item.skills.length > 0 ? (
            item.skills.map((s) => (
              <span
                key={s.skill_id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-800 text-[10px] font-bold"
              >
                <span>{s.skill_name}</span>
                <span className="text-blue-500 font-mono">({s.min_level}→{s.target_level})</span>
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-xs italic">Bağlı beceri yok</span>
          )}
        </div>
      ),
    },
    {
      key: "gives_certificate",
      header: "Sertifika",
      align: "center",
      render: (item) => (
        item.gives_certificate ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
            <Award className="w-3 h-3 text-amber-600" />
            <span>Var</span>
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )
      ),
    },
    {
      key: "link_status",
      header: "Link Durumu",
      align: "center",
      render: (item) => <StatusBadge status={item.link_status} />,
    },
    {
      key: "status",
      header: "Yayın Durumu",
      align: "center",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "İşlemler",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEditDrawer(item)}
            title="Düzenle"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeleteConfirm({ isOpen: true, item })}
            title="Sil"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: "Tüm Kaynaklar", count: items.length },
            { key: "published", label: "Yayında", count: items.filter((r) => r.status === "published").length },
            { key: "draft", label: "Taslak", count: items.filter((r) => r.status === "draft").length },
            { key: "archived", label: "Arşiv", count: items.filter((r) => r.status === "archived").length },
            {
              key: "broken",
              label: "Kırık Linkler",
              count: items.filter((r) => r.link_status === "broken").length,
              alert: true,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === tab.key
                  ? tab.alert
                    ? "bg-rose-600 text-white"
                    : "bg-[#0B1F4D] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  filterStatus === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleCheckAllLinks}
            disabled={isCheckingLinks}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isCheckingLinks ? "animate-spin" : ""}`} />
            <span>{isCheckingLinks ? "Test Ediliyor..." : "Tüm Linkleri Test Et"}</span>
          </button>

          <button
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2F5BFF] hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kaynak Ekle</span>
          </button>
        </div>
      </div>

      <DataTable
        data={filteredResources}
        columns={columns}
        rowKey={(item) => item.id}
        searchKey="title"
        searchPlaceholder="Kaynak başlığı veya sağlayıcı ara..."
      />

      {/* Form Drawer */}
      <FormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingItem ? "Kaynağı Düzenle" : "Yeni Eğitim / Sertifika Kaynağı"}
        description="Öğrencilerin eksik becerilerini kapatmak için yol haritalarına önerilecek kaynak."
        width="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kaynak Başlığı *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: SQL Temelleri ve İleri Sorgulama Teknikleri"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sağlayıcı *</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Örn: BTK Akademi, Coursera, Udemy"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tür *</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as typeof resourceType)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kaynak Web Adresi (URL) *</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Et</span>
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dil</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
              >
                <option value="tr">Türkçe (TR)</option>
                <option value="en">İngilizce (EN)</option>
                <option value="mixed">Karma</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ücret Modeli</label>
              <select
                value={pricing}
                onChange={(e) => setPricing(e.target.value as typeof pricing)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
              >
                <option value="free">Tamamen Ücretsiz</option>
                <option value="freemium">Kısmen Ücretsiz</option>
                <option value="paid">Ücretli</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahmini Süre (Saat)</label>
              <input
                type="number"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Certificate Toggle & Info */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Sertifika Sağlıyor Mu?</div>
                <div className="text-[11px] text-slate-500">Tamamlandığında resmi sertifika/rozet verilir.</div>
              </div>
              <input
                type="checkbox"
                checked={givesCertificate}
                onChange={(e) => setGivesCertificate(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
            </div>

            {givesCertificate && (
              <div>
                <input
                  type="text"
                  value={certificateInfo}
                  onChange={(e) => setCertificateInfo(e.target.value)}
                  placeholder="Sertifika adı veya sınav detayları (örn: Microsoft Certified: Power BI Data Analyst Associate)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Skill Linker Multi-Selector */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#0B1F4D] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Hedef Beceriler & Seviye Aralığı</span>
              </div>
              <span className="text-[11px] text-blue-700">
                {selectedSkills.length} Beceri Bağlı
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Öğrencinin check-up sonucunda bu becerideki açığı belirlenen aralıktaysa, yol haritası üreticisi bu kaynağı otomatik olarak seçecektir.
            </p>

            {/* List of currently linked skills */}
            <div className="space-y-1.5">
              {selectedSkills.map((link) => {
                const sk = availableSkills.find((s) => s.id === link.skill_id);
                return (
                  <div
                    key={link.skill_id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-200 text-xs shadow-xs"
                  >
                    <span className="font-bold text-slate-800">{sk?.name_tr}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                        Seviye {link.min_level} → {link.target_level}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkillLink(link.skill_id)}
                        className="text-slate-400 hover:text-red-600 p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add new skill association row */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 border-t border-blue-200/60">
              <select
                value={pickerSkillId}
                onChange={(e) => setPickerSkillId(e.target.value)}
                className="w-full sm:w-auto sm:flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              >
                {availableSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_tr}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span>Hedef:</span>
                <select
                  value={pickerMinLevel}
                  onChange={(e) => setPickerMinLevel(Number(e.target.value))}
                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                >
                  {[1, 2, 3, 4].map((l) => (
                    <option key={l} value={l}>
                      Lvl {l}
                    </option>
                  ))}
                </select>
                <span>→</span>
                <select
                  value={pickerTargetLevel}
                  onChange={(e) => setPickerTargetLevel(Number(e.target.value))}
                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                >
                  {[2, 3, 4, 5].map((l) => (
                    <option key={l} value={l}>
                      Lvl {l}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddSkillLink}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Ekle
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Açıklama / Notlar</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Öğrencinin bu kaynaktan nasıl faydalanacağını açıklayın..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Yayın Durumu</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
              >
                <option value="published">Yayında (Öğrencilere Önerilir)</option>
                <option value="draft">Taslak (İncelemede)</option>
                <option value="archived">Arşiv</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sıralama</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, item: null })}
        onConfirm={handleDeleteConfirm}
        title="Kaynağı Sil"
        message={`"${deleteConfirm.item?.title}" kaynağı katalogdan kalıcı olarak silinecektir.`}
        confirmLabel="Kalıcı Sil"
        variant="danger"
      />
    </div>
  );
}
