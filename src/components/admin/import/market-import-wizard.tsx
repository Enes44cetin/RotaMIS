"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Star,
  Download,
  Loader2,
  Briefcase,
  Plus,
  ArrowRight,
  Check,
  RotateCcw,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseMarketCsvText,
  normalizeSliceForImport,
  SAMPLE_DEVELOPER_MARKET_CSV,
  type NormalizedMarketSkillItem,
} from "@/lib/market/csv-parser";
import { importMarketDataAction } from "@/actions/admin/import";
import { SkillRadar } from "@/components/charts/skill-radar";

interface CareerPathOption {
  id: string;
  name_tr: string;
  slug: string;
}

interface BatchHistoryItem {
  id: string;
  file_name: string | null;
  market_scope: string;
  role_filter: string;
  total_postings: number;
  imported_skills_count: number;
  radar_axes_count: number;
  created_at: string;
  career_name?: string;
}

interface MarketImportWizardProps {
  careerPaths: CareerPathOption[];
  recentBatches: BatchHistoryItem[];
}

interface EditableSkillRow extends NormalizedMarketSkillItem {
  included: boolean;
}

export function MarketImportWizard({
  careerPaths,
  recentBatches,
}: MarketImportWizardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sayfa ilk açıldığında boş başlar; tablo ve radar yalnızca CSV seçildikten sonra açılır
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const devCareer = careerPaths.find(
    (c) =>
      c.slug === "software-developer" ||
      c.name_tr.toLowerCase().includes("yazılım") ||
      c.name_tr.toLowerCase().includes("geliştirici")
  );
  const [careerMode, setCareerMode] = useState<"existing_career" | "new_career">(
    devCareer ? "existing_career" : "new_career"
  );
  const [selectedCareerId, setSelectedCareerId] = useState<string>(
    devCareer?.id || careerPaths[0]?.id || ""
  );
  const [newCareerName, setNewCareerName] = useState<string>("");
  const [newCareerDesc, setNewCareerDesc] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const parsedCsv = useMemo(() => {
    if (!csvText.trim()) return { rows: [], slices: [] };
    return parseMarketCsvText(csvText);
  }, [csvText]);

  const [selectedSliceKey, setSelectedSliceKey] = useState<string>(
    "Yerel__Geliştirici"
  );

  const activeSliceKey = useMemo(() => {
    if (parsedCsv.slices.some((s) => s.key === selectedSliceKey)) {
      return selectedSliceKey;
    }
    return parsedCsv.slices[0]?.key || "";
  }, [parsedCsv.slices, selectedSliceKey]);

  const normalized = useMemo(() => {
    if (!activeSliceKey || parsedCsv.rows.length === 0) {
      return {
        skills: [],
        educationStats: [],
        totalPostings: 0,
        scopeWarning: null,
      };
    }
    return normalizeSliceForImport(parsedCsv.rows, activeSliceKey, false, 6);
  }, [parsedCsv.rows, activeSliceKey]);

  const [customOverrides, setCustomOverrides] = useState<
    Record<
      string,
      Partial<{
        included: boolean;
        isRadarAxis: boolean;
      }>
    >
  >({});

  const workingRows = useMemo<EditableSkillRow[]>(() => {
    const base = normalized.skills.map((sk) => {
      const ov = customOverrides[sk.slug];
      return {
        ...sk,
        included: ov?.included ?? true,
        isRadarAxis: ov?.isRadarAxis ?? sk.isRadarAxis,
      };
    });

    let orderCounter = 1;
    return base.map((row) => {
      if (row.included && row.isRadarAxis) {
        return { ...row, axisOrder: orderCounter++ };
      }
      return { ...row, isRadarAxis: false, axisOrder: null };
    });
  }, [normalized.skills, customOverrides]);

  const radarRows = useMemo(
    () => workingRows.filter((r) => r.included && r.isRadarAxis),
    [workingRows]
  );

  const complementaryRows = useMemo(
    () => workingRows.filter((r) => !r.isRadarAxis),
    [workingRows]
  );

  const includedRows = useMemo(
    () => workingRows.filter((r) => r.included),
    [workingRows]
  );

  const radarPreviewData = useMemo(
    () =>
      radarRows.map((r) => ({
        name_tr: r.nameTr,
        axis_label_tr: r.axisLabelTr,
        current_level: Math.max(1, r.requiredLevel - 2),
        required_level: r.requiredLevel,
        gap: 2,
        category: r.category,
        display_badge: r.displayBadge,
        priority_label: r.priorityLabel,
      })),
    [radarRows]
  );

  const targetCareerDisplayName = useMemo(() => {
    if (careerMode === "new_career") {
      return newCareerName.trim() || "Yeni Meslek";
    }
    return (
      careerPaths.find((c) => c.id === selectedCareerId)?.name_tr ||
      "Seçili Meslek"
    );
  }, [careerMode, newCareerName, careerPaths, selectedCareerId]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || "");
      const check = parseMarketCsvText(content);
      if (check.error) {
        toast.error(check.error);
        return;
      }
      setCsvText(content);
      setCustomOverrides({});
      toast.success(`"${file.name}" okundu (${check.rows.length} satır analiz edildi).`);
    };
    reader.readAsText(file, "utf-8");
  }

  function handleClearFile() {
    setCsvText("");
    setFileName("");
    setCustomOverrides({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleToggleIncluded(slug: string, currentVal: boolean) {
    setCustomOverrides((prev) => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        included: !currentVal,
        ...(currentVal ? { isRadarAxis: false } : {}),
      },
    }));
  }

  function handleToggleRadarAxis(slug: string, currentVal: boolean) {
    if (!currentVal && radarRows.length >= 6) {
      toast.info(
        "Radarda en fazla 6 ana eksen bulunabilir. Önce üstteki 6 eksenden birinin yıldızını kaldırın."
      );
      return;
    }
    setCustomOverrides((prev) => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        included: true,
        isRadarAxis: !currentVal,
      },
    }));
  }

  function handleDownloadTemplate() {
    const blob = new Blob([SAMPLE_DEVELOPER_MARKET_CSV], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rotamis_sektor_analizi_sablon.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCommitImport() {
    if (careerMode === "new_career" && newCareerName.trim().length < 2) {
      toast.error("Lütfen yeni meslek için geçerli bir isim girin.");
      return;
    }
    if (includedRows.length < 3) {
      toast.error("En az 3 yetkinlik seçilmelidir.");
      return;
    }
    if (radarRows.length < 3 || radarRows.length > 6) {
      toast.error("Radar için 3 ile 6 arasında eksen seçilmelidir.");
      return;
    }

    const [piyasa, rol] = activeSliceKey.split("__");
    setIsSubmitting(true);

    const res = await importMarketDataAction({
      mode: careerMode,
      careerPathId:
        careerMode === "existing_career" ? selectedCareerId : undefined,
      newCareerNameTr:
        careerMode === "new_career" ? newCareerName : undefined,
      newCareerDescriptionTr:
        careerMode === "new_career" ? newCareerDesc : undefined,
      fileName: fileName || "sektor_analizi.csv",
      marketScope: piyasa || "Yerel",
      roleFilter: rol || "Geliştirici",
      totalPostings: normalized.totalPostings,
      scopeWarning: normalized.scopeWarning,
      skills: includedRows.map((r) => ({
        slug: r.slug,
        nameTr: r.nameTr,
        axisLabelTr: r.axisLabelTr,
        category: r.category,
        marketCategory: r.marketCategory,
        mentionCount: r.mentionCount,
        totalPostings: r.totalPostings,
        demandPct: r.demandPct,
        priorityLabel: r.priorityLabel,
        displayBadge: r.displayBadge,
        requiredLevel: r.requiredLevel,
        importance: r.importance,
        isRadarAxis: r.isRadarAxis,
        axisOrder: r.axisOrder,
        isCoreCheckup: r.isCoreCheckup,
        promptTr: r.promptTr,
      })),
    });

    setIsSubmitting(false);

    if (!res.success) {
      toast.error(res.error || "Veri aktarımı sırasında bir hata oluştu.");
      return;
    }

    toast.success(
      `"${res.careerName}" rotası güncellendi! ${res.importedCount} yetkinlik ve ${res.radarCount} radar ekseni kaydedildi.`
    );
    router.refresh();
    router.push(`/admin/matrix?career=${res.careerPathId}`);
  }

  const hasLoadedCsv = workingRows.length > 0;

  return (
    <div className="space-y-6 pb-20">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* ADIM 1: HEDEF MESLEK & CSV DOSYASI SEÇİMİ */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Sol: Hedef Meslek Seçimi */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#0B1F4D] uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#2F5BFF]" />
                  <span>1. Hedef Kariyer Rotası</span>
                </span>

                <div className="inline-flex rounded-xl p-0.5 bg-slate-200/80 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setCareerMode("existing_career")}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                      careerMode === "existing_career"
                        ? "bg-white text-[#0B1F4D] shadow-2xs"
                        : "text-slate-600"
                    }`}
                  >
                    Mevcut Mesleği Güncelle
                  </button>
                  <button
                    type="button"
                    onClick={() => setCareerMode("new_career")}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                      careerMode === "new_career"
                        ? "bg-white text-[#0B1F4D] shadow-2xs"
                        : "text-slate-600"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Yeni Meslek Ekle</span>
                  </button>
                </div>
              </div>

              {careerMode === "existing_career" ? (
                <div>
                  <select
                    value={selectedCareerId}
                    onChange={(e) => setSelectedCareerId(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#0B1F4D] focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    {careerPaths.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.name_tr}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={newCareerName}
                    onChange={(e) => setNewCareerName(e.target.value)}
                    placeholder="Yeni Meslek Adı (Örn: Veri Mühendisi)"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#0B1F4D]"
                  />
                  <input
                    type="text"
                    value={newCareerDesc}
                    onChange={(e) => setNewCareerDesc(e.target.value)}
                    placeholder="Kısa meslek açıklaması (isteğe bağlı)..."
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Yükleyeceğiniz CSV dosyasındaki en çok aranan 6 yetkinlik{" "}
              <strong className="text-slate-700">
                {targetCareerDisplayName}
              </strong>{" "}
              rotasının radar eksenlerini, diğer yetkinlikler ise Check-Up soru
              havuzunu otomatik oluşturur.
            </p>
          </div>

          {/* Sağ: CSV Dosya Yükleme Alanı */}
          <div className="p-5 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 text-[#2F5BFF] flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>

            {!hasLoadedCsv ? (
              <>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-extrabold text-[#0B1F4D]">
                    2. Sektör Analizi CSV Dosyasını Seçin
                  </h3>
                  <p className="text-xs text-slate-500">
                    İlan analizi çıktınızı (.csv) yükleyin; sistem mükerrer alt
                    araçları birleştirip 6 radar eksenini otomatik hazırlasın.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 cursor-pointer transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>CSV Dosyası Seç</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Örnek Şablon İndir</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{fileName}</span>
                  </span>
                  <p className="text-xs text-slate-600 pt-1">
                    <strong>{normalized.totalPostings} iş ilanı</strong> analizinden{" "}
                    <strong>{includedRows.length} net sektörel yetkinlik</strong>{" "}
                    çıkarıldı.
                  </p>
                </div>

                {parsedCsv.slices.length > 1 && (
                  <div className="w-full max-w-xs text-left">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      CSV İçi Veri Kırılımı
                    </label>
                    <select
                      value={activeSliceKey}
                      onChange={(e) => {
                        setSelectedSliceKey(e.target.value);
                        setCustomOverrides({});
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#0B1F4D]"
                    >
                      {parsedCsv.slices.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.piyasa} · {s.rol} ({s.totalPostings} İlan)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-[#0B1F4D] cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#2F5BFF]" />
                    <span>Başka Dosya Seç</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Temizle</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ADIM 2: YALNIZCA CSV YÜKLENDİĞİNDE AÇILAN SADE ÖNİZLEME & ONAY EKRANI */}
      {hasLoadedCsv && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Sol (2/3): Grup A (6 Radar Ekseni) + Grup B (Diğer Check-Up Konuları) */}
          <div className="lg:col-span-2 space-y-6">
            {/* GRUP A: 6 ANA RADAR EKSENİ */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-200/60 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-[#0B1F4D] flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Seçilen 6 Radar Ekseni ({targetCareerDisplayName})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Öğrencinin Dashboard radarında yer alacak en yüksek talepli 6 çekirdek yetkinlik. Değiştirmek için yıldızlara tıklayın.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-amber-950 text-xs font-extrabold">
                  {radarRows.length} / 6 Eksen Seçili
                </span>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {radarRows.map((row) => (
                  <div
                    key={row.slug}
                    className="p-4 rounded-2xl bg-amber-50/25 border border-amber-200/80 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black">
                          Eksen #{row.axisOrder}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          %{Math.round(row.demandPct)} İlan
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          Hedef: {row.requiredLevel}/5
                        </span>
                      </div>
                      <div className="font-extrabold text-sm text-[#0B1F4D] truncate">
                        {row.nameTr}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {row.displayBadge}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleRadarAxis(row.slug, true)}
                      title="Radardan çıkar (Tamamlayıcı konulara taşı)"
                      className="p-2 rounded-xl bg-white border border-amber-300 text-amber-600 hover:bg-amber-100 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* GRUP B: TAMAMLAYICI CHECK-UP KONULARI */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-[#0B1F4D] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2F5BFF]" />
                    <span>Check-Up Havuzundaki Tamamlayıcı Konular</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bu konular radarda eksen olmaz ancak öğrencinin özdeğerlendirme testinde ve görev önerilerinde yer alır.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {complementaryRows.filter((r) => r.included).length} tamamlayıcı konu dahil
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {complementaryRows.map((row) => (
                  <div
                    key={row.slug}
                    className={`px-6 py-3.5 flex items-center justify-between gap-3 transition-colors ${
                      !row.included ? "bg-slate-50/60 opacity-50" : "hover:bg-slate-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleIncluded(row.slug, row.included)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer shrink-0 ${
                          row.included
                            ? "bg-[#2F5BFF] border-[#2F5BFF] text-white"
                            : "bg-white border-slate-300"
                        }`}
                      >
                        {row.included && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {row.nameTr}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {row.displayBadge}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                        Otomatik Hedef: <strong className="text-slate-700">{row.requiredLevel}/5</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleRadarAxis(row.slug, false)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50 text-slate-500 hover:text-amber-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Star className="w-3 h-3" />
                        <span>Radara Al</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sağ (1/3): Canlı Radar Önizleme & Tek Tıkla Kaydet */}
          <div className="lg:col-span-1 sticky top-20">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-[#0B1F4D]">
                    {targetCareerDisplayName} Radarı
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Öğrencinin göreceği 6 eksenli radar önizlemesi
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#2F5BFF] text-[11px] font-extrabold">
                  {radarRows.length} Eksen
                </span>
              </div>

              <div className="h-68 w-full">
                {radarPreviewData.length >= 3 ? (
                  <SkillRadar data={radarPreviewData} compact />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center p-4">
                    Radar önizlemesi için en az 3 yetkinliği ★ Radar Ekseni olarak işaretleyin.
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={isSubmitting || includedRows.length < 3}
                onClick={() => void handleCommitImport()}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#2F5BFF] to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sisteme Aktarılıyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Onayla ve Sisteme Yükle ({includedRows.length} Yetkinlik)
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SON YÜKLEME GEÇMİŞİ (Varsa alt kısımda sade kart) */}
      {recentBatches.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <h4 className="text-xs font-extrabold text-[#0B1F4D] uppercase tracking-wider">
            Son Sektör Veri Yüklemeleri
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentBatches.slice(0, 6).map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[#0B1F4D] truncate">
                    {b.career_name || b.role_filter} ({b.market_scope})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {b.total_postings} ilan • {b.imported_skills_count} yetkinlik •{" "}
                    {b.radar_axes_count} radar ekseni
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold shrink-0">
                  Aktif
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
