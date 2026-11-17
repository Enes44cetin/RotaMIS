"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Eye,
  Grid3X3,
  ListFilter,
  Check,
  Star,
  FileSpreadsheet,
  PlusCircle,
} from "lucide-react";
import { CopyMatrixDialog } from "./copy-matrix-dialog";
import { MatrixHeatmap } from "./matrix-heatmap";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { SkillRadar } from "@/components/charts/skill-radar";
import { saveMatrixAction } from "@/actions/admin/matrix";
import { toast } from "sonner";

interface CareerPath {
  id: string;
  name_tr: string;
  slug: string;
  studentCount?: number;
}

interface Skill {
  id: string;
  name_tr: string;
  category: "technical" | "business" | "soft";
  slug: string;
  sort_order: number;
}

interface Requirement {
  career_path_id: string;
  skill_id: string;
  required_level: number;
  importance: number;
  is_radar_axis?: boolean;
  axis_order?: number | null;
  axis_label_tr?: string | null;
  demand_pct?: number | null;
  mention_count?: number | null;
  total_postings?: number | null;
  priority_label?: string | null;
  display_badge?: string | null;
  is_core_checkup?: boolean;
}

interface MatrixEditorProps {
  careerPaths: CareerPath[];
  skills: Skill[];
  initialRequirements: Requirement[];
  allRequirements: Requirement[];
  selectedCareerId: string;
}

export function MatrixEditor({
  careerPaths,
  skills,
  initialRequirements,
  allRequirements,
  selectedCareerId,
}: MatrixEditorProps) {
  const router = useRouter();
  const [savedRequirements, setSavedRequirements] = useState(initialRequirements);
  const [viewMode, setViewMode] = useState<"editor" | "heatmap">("editor");
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if initialRequirements change from server
  useEffect(() => {
    setSavedRequirements(initialRequirements);
  }, [initialRequirements]);

  // Active career path
  const currentCareer = useMemo(() => {
    return careerPaths.find((c) => c.id === selectedCareerId) || careerPaths[0];
  }, [careerPaths, selectedCareerId]);

  // Working state of requirements for current career path
  const initialMap = useMemo(() => {
    const map = new Map<
      string,
      {
        level: number;
        importance: number;
        included: boolean;
        isRadarAxis: boolean;
        axisOrder: number | null;
        axisLabelTr?: string | null;
        displayBadge?: string | null;
        priorityLabel?: string | null;
        demandPct?: number | null;
        mentionCount?: number | null;
        totalPostings?: number | null;
        isCoreCheckup?: boolean;
      }
    >();
    const currentReqs = savedRequirements.filter((r) => r.career_path_id === currentCareer?.id);

    currentReqs.forEach((r) => {
      map.set(r.skill_id, {
        level: r.required_level,
        importance: r.importance,
        included: true,
        isRadarAxis: r.is_radar_axis ?? false,
        axisOrder: r.axis_order ?? null,
        axisLabelTr: r.axis_label_tr ?? null,
        displayBadge: r.display_badge,
        priorityLabel: r.priority_label,
        demandPct: r.demand_pct,
        mentionCount: r.mention_count ?? null,
        totalPostings: r.total_postings ?? null,
        isCoreCheckup: r.is_core_checkup ?? true,
      });
    });
    return map;
  }, [savedRequirements, currentCareer?.id]);

  const [workingMap, setWorkingMap] = useState(new Map(initialMap));

  // Sync state if selectedCareerId changes
  const [lastCareerId, setLastCareerId] = useState(selectedCareerId);
  if (selectedCareerId !== lastCareerId) {
    setLastCareerId(selectedCareerId);
    setWorkingMap(new Map(initialMap));
  }

  // Calculate dirty / changed count
  const dirtyCount = useMemo(() => {
    let count = 0;
    skills.forEach((sk) => {
      const orig = initialMap.get(sk.id);
      const curr = workingMap.get(sk.id);

      const origIncluded = orig?.included ?? false;
      const currIncluded = curr?.included ?? false;

      if (origIncluded !== currIncluded) {
        count++;
      } else if (currIncluded && orig) {
        if (
          curr?.level !== orig.level ||
          curr?.importance !== orig.importance ||
          curr?.isRadarAxis !== orig.isRadarAxis
        ) {
          count++;
        }
      }
    });
    return count;
  }, [skills, initialMap, workingMap]);

  // Skill toggling
  const handleToggleSkill = (skillId: string) => {
    const next = new Map(workingMap);
    const existing = next.get(skillId);

    if (existing && existing.included) {
      next.set(skillId, { ...existing, included: false, isRadarAxis: false, axisOrder: null });
    } else {
      next.set(skillId, {
        level: existing?.level || 3,
        importance: existing?.importance || 2,
        included: true,
        isRadarAxis: existing?.isRadarAxis ?? false,
        axisOrder: existing?.axisOrder ?? null,
        axisLabelTr: existing?.axisLabelTr ?? null,
        displayBadge: existing?.displayBadge,
        priorityLabel: existing?.priorityLabel,
        demandPct: existing?.demandPct,
        mentionCount: existing?.mentionCount ?? null,
        totalPostings: existing?.totalPostings ?? null,
        isCoreCheckup: existing?.isCoreCheckup ?? true,
      });
    }
    setWorkingMap(next);
  };

  const handleToggleRadarAxis = (skillId: string) => {
    const next = new Map(workingMap);
    const existing = next.get(skillId) || {
      level: 3,
      importance: 2,
      included: true,
      isRadarAxis: false,
      axisOrder: null,
    };

    const currentAxisCount = Array.from(next.values()).filter(
      (v) => v.included && v.isRadarAxis
    ).length;

    if (!existing.isRadarAxis && currentAxisCount >= 6) {
      toast.info("Bir mesleğin radarında en fazla 6 ana eksen bulunabilir. Önce mevcut bir eksenin yıldızını kaldırın.");
      return;
    }

    next.set(skillId, {
      ...existing,
      included: true,
      isRadarAxis: !existing.isRadarAxis,
      axisOrder: !existing.isRadarAxis ? currentAxisCount + 1 : null,
    });
    setWorkingMap(next);
  };

  const handleReset = () => {
    setWorkingMap(new Map(initialMap));
    toast.info("Değişiklikler geri alındı.");
  };

  // Perform Save Action
  const handleSave = async () => {
    if (!currentCareer) return;
    setIsSaving(true);

    let axisOrderCounter = 1;
    const payload: {
      skill_id: string;
      required_level: number;
      importance: number;
      is_radar_axis: boolean;
      axis_order: number | null;
      axis_label_tr?: string | null;
      display_badge?: string | null;
      priority_label?: string | null;
      demand_pct?: number | null;
      mention_count?: number | null;
      total_postings?: number | null;
      is_core_checkup?: boolean;
    }[] = [];

    for (const [skill_id, data] of workingMap.entries()) {
      if (data.included) {
        payload.push({
          skill_id,
          required_level: data.level,
          importance: data.importance,
          is_radar_axis: data.isRadarAxis,
          axis_order: data.isRadarAxis ? axisOrderCounter++ : null,
          axis_label_tr: data.axisLabelTr ?? null,
          display_badge: data.displayBadge ?? null,
          priority_label: data.priorityLabel ?? null,
          demand_pct: data.demandPct ?? null,
          mention_count: data.mentionCount ?? null,
          total_postings: data.totalPostings ?? null,
          is_core_checkup: data.isCoreCheckup ?? true,
        });
      }
    }

    const res = await saveMatrixAction({
      career_path_id: currentCareer.id,
      requirements: payload,
    });

    setIsSaving(false);
    setConfirmSaveOpen(false);

    if (res.success) {
      toast.success(`${currentCareer.name_tr} sektör beklenti matrisi başarıyla güncellendi!`);
      setSavedRequirements((prev) => {
        const remaining = prev.filter((r) => r.career_path_id !== currentCareer.id);
        const nextSaved = payload.map((p) => ({
          career_path_id: currentCareer.id,
          skill_id: p.skill_id,
          required_level: p.required_level,
          importance: p.importance,
          is_radar_axis: p.is_radar_axis,
          axis_order: p.axis_order,
          axis_label_tr: p.axis_label_tr,
          display_badge: p.display_badge,
          priority_label: p.priority_label,
          demand_pct: p.demand_pct,
          mention_count: p.mention_count,
          total_postings: p.total_postings,
          is_core_checkup: p.is_core_checkup,
        }));
        return [...remaining, ...nextSaved];
      });
    } else {
      toast.error(res.error || "Matris kaydedilemedi.");
    }
  };

  // Split skills into radar axes vs complementary skills
  const { radarSkills, poolSkills, totalIncludedCount } = useMemo(() => {
    const radar: { skill: Skill; state: NonNullable<ReturnType<typeof workingMap.get>> }[] = [];
    const pool: { skill: Skill; state: NonNullable<ReturnType<typeof workingMap.get>> }[] = [];
    let includedCount = 0;

    for (const sk of skills) {
      const state = workingMap.get(sk.id) || {
        level: 3,
        importance: 2,
        included: false,
        isRadarAxis: false,
        axisOrder: null,
      };

      if (state.included) {
        includedCount++;
      }

      if (state.included && state.isRadarAxis) {
        radar.push({ skill: sk, state });
      } else if (state.included || showAllSkills) {
        pool.push({ skill: sk, state });
      }
    }

    radar.sort((a, b) => (a.state.axisOrder ?? 99) - (b.state.axisOrder ?? 99));
    pool.sort((a, b) => {
      if (a.state.included !== b.state.included) return a.state.included ? -1 : 1;
      return (b.state.demandPct ?? 0) - (a.state.demandPct ?? 0);
    });

    return { radarSkills: radar, poolSkills: pool, totalIncludedCount: includedCount };
  }, [skills, workingMap, showAllSkills]);

  // Prepare radar preview data
  const radarData = useMemo(() => {
    const explicitAxes = radarSkills.map((item) => ({
      name_tr: item.state.axisLabelTr || item.skill.name_tr,
      current_level: Math.max(1, item.state.level - 1),
      required_level: item.state.level,
      importance: item.state.importance,
      gap: 1,
      category: item.skill.category,
    }));

    if (explicitAxes.length >= 3) {
      return explicitAxes.slice(0, 6);
    }

    const fallbackList = [];
    for (const sk of skills) {
      const data = workingMap.get(sk.id);
      if (data && data.included) {
        fallbackList.push({
          name_tr: data.axisLabelTr || sk.name_tr,
          current_level: Math.max(1, data.level - 1),
          required_level: data.level,
          importance: data.importance,
          gap: 1,
          category: sk.category,
        });
      }
    }

    return fallbackList
      .sort((a, b) => b.importance - a.importance || b.required_level - a.required_level)
      .slice(0, 6);
  }, [radarSkills, skills, workingMap]);

  const categoryLabels: Record<Skill["category"], string> = {
    technical: "Teknik Yetkinlik",
    business: "İşletme & Süreç",
    soft: "Sosyal & Dil Yetkinliği",
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Controls Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Career Picker & View Switch */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kariyer Rotası:
            </label>
            <select
              value={currentCareer?.id}
              onChange={(e) => {
                if (dirtyCount > 0) {
                  if (!confirm("Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istiyor musunuz?")) {
                    return;
                  }
                }
                router.push(`/admin/matrix?career=${e.target.value}`);
              }}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0B1F4D] focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {careerPaths.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name_tr}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button
              onClick={() => setViewMode("editor")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "editor" ? "bg-white text-[#0B1F4D] shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Rota Özeti</span>
            </button>
            <button
              onClick={() => setViewMode("heatmap")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "heatmap" ? "bg-white text-[#0B1F4D] shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Tüm Meslekler Isı Haritası</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV Sektör Verisi Yükle</span>
          </Link>

          {viewMode === "editor" && (
            <button
              type="button"
              onClick={() => setCopyDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Rotadan Kopyala</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Heatmap vs Simplified Editor */}
      {viewMode === "heatmap" ? (
        <MatrixHeatmap
          careerPaths={careerPaths}
          skills={skills}
          requirements={allRequirements}
          onSelectCareer={(id) => {
            setViewMode("editor");
            router.push(`/admin/matrix?career=${id}`);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Clean 6 Radar Axes + Check-Up Pool */}
          <div className="lg:col-span-2 space-y-6">
            {/* Group 1: Selected 6 Radar Axes */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-[#0B1F4D]">
                    Seçilen 6 Radar Ekseni ({currentCareer?.name_tr})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Öğrencinin ana beceri radarında gösterilen 6 çekirdek yetkinlik. Değiştirmek için yıldıza tıklayın.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-extrabold">
                  <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  {radarSkills.length}/6 Eksen Seçili
                </span>
              </div>

              {radarSkills.length > 0 ? (
                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {radarSkills.map(({ skill, state }, idx) => (
                    <div
                      key={skill.id}
                      className="p-3.5 rounded-2xl border border-amber-200/90 bg-amber-50/20 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-extrabold text-[#0B1F4D] truncate">
                            {skill.name_tr}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 pl-7">
                          {state.displayBadge && (
                            <span className="text-[11px] font-bold text-emerald-700">
                              {state.displayBadge}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500">
                            • Hedef Seviye: <strong className="text-slate-700">{state.level}/5</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleRadarAxis(skill.id)}
                        title="Radar ekseninden çıkar"
                        className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                      >
                        <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                        <span>Eksen #{idx + 1}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Henüz radar ekseni seçilmedi. Aşağıdaki listeden en fazla 6 yetkinliği yıldızlayabilirsiniz.
                </div>
              )}
            </div>

            {/* Group 2: Complementary Check-Up Pool */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-[#0B1F4D]">
                    Check-Up Havuzundaki Tamamlayıcı Konular
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toplam {totalIncludedCount} yetkinlik bu meslek rotasına dahil. İsterseniz yıldızlayarak radar eksenine taşıyabilirsiniz.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllSkills(!showAllSkills)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    showAllSkills
                      ? "bg-blue-50 border-blue-200 text-[#2F5BFF]"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{showAllSkills ? "Sadece Dahil Olanları Göster" : "Havuzdan Beceri Ekle / Çıkar"}</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {poolSkills.length > 0 ? (
                  poolSkills.map(({ skill, state }) => {
                    const isIncluded = state.included;
                    const original = initialMap.get(skill.id);
                    const isDirty =
                      (original?.included ?? false) !== isIncluded ||
                      (isIncluded &&
                        original &&
                        (original.level !== state.level ||
                          original.importance !== state.importance ||
                          original.isRadarAxis !== state.isRadarAxis));

                    return (
                      <div
                        key={skill.id}
                        className={`px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isIncluded ? "bg-white hover:bg-slate-50/50" : "bg-slate-50/40 opacity-55"
                        } ${isDirty ? "bg-amber-50/40" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleSkill(skill.id)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isIncluded
                                ? "bg-[#2F5BFF] border-blue-600 text-white"
                                : "border-slate-300 bg-white hover:border-slate-400"
                            }`}
                          >
                            {isIncluded && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-bold ${isIncluded ? "text-slate-800" : "text-slate-500"}`}>
                                {skill.name_tr}
                              </span>
                              {state.displayBadge && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  {state.displayBadge}
                                </span>
                              )}
                              {isDirty && (
                                <span className="w-2 h-2 rounded-full bg-amber-500" title="Değiştirildi" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {categoryLabels[skill.category]}
                              {isIncluded && (
                                <>
                                  {" • "}Hedef Seviye: <strong className="text-slate-600">{state.level}/5</strong>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {isIncluded ? (
                          <button
                            type="button"
                            onClick={() => handleToggleRadarAxis(skill.id)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-900 text-slate-600 text-[11px] font-bold inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-colors cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 text-slate-400" />
                            <span>Radar&apos;a Taşı</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Rotaya dahil değil
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tamamlayıcı yetkinlik bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (1 col): Always-On Live Radar Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-[#0B1F4D] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Mesleğe Özel 6&apos;lı Radar</span>
                </h3>
                <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                  {radarData.length} Eksen
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Öğrencilerin <strong>{currentCareer?.name_tr}</strong> rotasını seçtiklerinde Dashboard ekranında görecekleri 6 eksenli radar profili.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {radarData.map((axis, i) => (
                  <span
                    key={axis.name_tr}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-bold text-slate-700"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#2F5BFF] text-white text-[10px] font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    {axis.name_tr}
                  </span>
                ))}
              </div>

              <div className="h-72 w-full">
                {radarData.length >= 3 ? (
                  <SkillRadar data={radarData} />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center p-4">
                    Radar grafiğinin çizilebilmesi için en az 3 becerinin rotaya dahil edilmesi gerekir.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Save Bar */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] sm:w-auto max-w-lg bg-[#0B1F4D] text-white px-4 sm:px-6 py-3.5 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4 sm:gap-6 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong>{dirtyCount}</strong> kaydedilmemiş değişiklik
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Geri Al
            </button>
            <button
              type="button"
              onClick={() => setConfirmSaveOpen(true)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2F5BFF] hover:bg-blue-600 text-white shadow-md shadow-blue-500/30 transition-all active:scale-95 cursor-pointer"
            >
              Değişiklikleri Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Copy Dialog */}
      {currentCareer && (
        <CopyMatrixDialog
          isOpen={copyDialogOpen}
          onClose={() => setCopyDialogOpen(false)}
          targetCareerPath={currentCareer}
          allCareerPaths={careerPaths}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Save Confirmation Dialog with Impact Warning */}
      <ConfirmDialog
        isOpen={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        onConfirm={handleSave}
        title="Sektör Matrisini Güncelle"
        message={`"${currentCareer?.name_tr}" rotasındaki değişiklikler anında kaydedilecek. Bu güncelleme, bu rotayı hedefleyen ${
          currentCareer?.studentCount ?? 0
        } öğrencinin radar analizi ve sektör hazırlık puanına doğrudan yansıyacaktır. Onaylıyor musunuz?`}
        confirmLabel={isSaving ? "Kaydediliyor..." : "Evet, Yayınla"}
        variant="warning"
        isLoading={isSaving}
      />
    </div>
  );
}
