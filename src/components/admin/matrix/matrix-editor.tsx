"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Copy,
  CheckCircle2,
  AlertCircle,
  Eye,
  RotateCcw,
  Sparkles,
  Grid3X3,
  ListFilter,
  Check,
} from "lucide-react";
import { LevelPicker } from "@/components/admin/ui/level-picker";
import { ImportancePicker } from "@/components/admin/ui/importance-picker";
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
  const [showRadarPreview, setShowRadarPreview] = useState(false);
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

  // Working state of requirements for current career path: skill_id => { level, importance, included }
  const initialMap = useMemo(() => {
    const map = new Map<string, { level: number; importance: number; included: boolean }>();
    const currentReqs = savedRequirements.filter((r) => r.career_path_id === currentCareer?.id);

    currentReqs.forEach((r) => {
      map.set(r.skill_id, {
        level: r.required_level,
        importance: r.importance,
        included: true,
      });
    });
    return map;
  }, [savedRequirements, currentCareer?.id]);

  const [workingMap, setWorkingMap] = useState<Map<string, { level: number; importance: number; included: boolean }>>(
    new Map(initialMap)
  );

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
        if (curr?.level !== orig.level || curr?.importance !== orig.importance) {
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
      next.set(skillId, { ...existing, included: false });
    } else {
      next.set(skillId, {
        level: existing?.level || 3,
        importance: existing?.importance || 2,
        included: true,
      });
    }
    setWorkingMap(next);
  };

  const handleLevelChange = (skillId: string, level: number) => {
    const next = new Map(workingMap);
    const existing = next.get(skillId) || { level: 3, importance: 2, included: true };
    next.set(skillId, { ...existing, level, included: true });
    setWorkingMap(next);
  };

  const handleImportanceChange = (skillId: string, importance: number) => {
    const next = new Map(workingMap);
    const existing = next.get(skillId) || { level: 3, importance: 2, included: true };
    next.set(skillId, { ...existing, importance, included: true });
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

    const payload: { skill_id: string; required_level: number; importance: number }[] = [];
    for (const [skill_id, data] of workingMap.entries()) {
      if (data.included) {
        payload.push({
          skill_id,
          required_level: data.level,
          importance: data.importance,
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
      // Update savedRequirements optimistically so dirtyCount resets to 0 instantly without full page refresh
      setSavedRequirements((prev) => {
        const remaining = prev.filter((r) => r.career_path_id !== currentCareer.id);
        const nextSaved = payload.map((p) => ({
          career_path_id: currentCareer.id,
          skill_id: p.skill_id,
          required_level: p.required_level,
          importance: p.importance,
        }));
        return [...remaining, ...nextSaved];
      });
    } else {
      toast.error(res.error || "Matris kaydedilemedi.");
    }
  };

  // Prepare radar preview data
  const radarData = useMemo(() => {
    const items = [];
    for (const sk of skills) {
      const data = workingMap.get(sk.id);
      if (data && data.included) {
        items.push({
          name_tr: sk.name_tr,
          current_level: Math.max(1, data.level - 1),
          required_level: data.level,
          gap: 1,
          category: sk.category,
        });
      }
    }
    return items;
  }, [skills, workingMap]);

  // Categories
  const categories: { key: "technical" | "business" | "soft"; label: string }[] = [
    { key: "technical", label: "Teknik Beceriler" },
    { key: "business", label: "İşletme & Süreç Becerileri" },
    { key: "soft", label: "Sosyal Beceriler" },
  ];

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
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0B1F4D] focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
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
              <span>Rota Editörü</span>
            </button>
            <button
              onClick={() => setViewMode("heatmap")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "heatmap" ? "bg-white text-[#0B1F4D] shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Isı Haritası</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {viewMode === "editor" && (
            <>
              <button
                type="button"
                onClick={() => setShowRadarPreview(!showRadarPreview)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  showRadarPreview
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>{showRadarPreview ? "Önizlemeyi Kapat" : "Canlı Radar Önizleme"}</span>
              </button>

              <button
                type="button"
                onClick={() => setCopyDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Rotadan Kopyala</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content: Heatmap vs Editor */}
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
          {/* Left Column (2 cols): Category Groups */}
          <div className={`${showRadarPreview ? "lg:col-span-2" : "lg:col-span-3"} space-y-6`}>
            {categories.map((cat) => {
              const catSkills = skills.filter((s) => s.category === cat.key);
              if (catSkills.length === 0) return null;

              const activeInCat = catSkills.filter((s) => workingMap.get(s.id)?.included).length;

              return (
                <div
                  key={cat.key}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-[#0B1F4D] tracking-tight">
                        {cat.label}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {activeInCat} / {catSkills.length} beceri rotaya dahil
                      </p>
                    </div>

                    <span className="text-xs font-bold text-slate-400">
                      Beklenen Seviye (1-5) & Önem (1-3)
                    </span>
                  </div>

                  {/* Skill Items */}
                  <div className="divide-y divide-slate-100">
                    {catSkills.map((sk) => {
                      const current = workingMap.get(sk.id) || { level: 3, importance: 2, included: false };
                      const isIncluded = current.included;

                      // Check if dirty
                      const original = initialMap.get(sk.id);
                      const isDirty =
                        (original?.included ?? false) !== isIncluded ||
                        (isIncluded && original && (original.level !== current.level || original.importance !== current.importance));

                      return (
                        <div
                          key={sk.id}
                          className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                            isIncluded ? "bg-white hover:bg-slate-50/50" : "bg-slate-50/30 opacity-60 hover:opacity-90"
                          } ${isDirty ? "bg-amber-50/40" : ""}`}
                        >
                          {/* Left: Checkbox & Name */}
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleSkill(sk.id)}
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                                isIncluded
                                  ? "bg-[#2F5BFF] border-blue-600 text-white shadow-xs"
                                  : "border-slate-300 bg-white hover:border-slate-400"
                              }`}
                            >
                              {isIncluded && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${isIncluded ? "text-slate-800" : "text-slate-500"}`}>
                                  {sk.name_tr}
                                </span>
                                {isDirty && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500" title="Değiştirildi" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                slug: {sk.slug}
                              </span>
                            </div>
                          </div>

                          {/* Right: LevelPicker & ImportancePicker */}
                          {isIncluded ? (
                            <div className="flex items-center gap-4 self-end sm:self-auto">
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 mb-1">
                                  Seviye
                                </span>
                                <LevelPicker
                                  value={current.level}
                                  onChange={(lvl) => handleLevelChange(sk.id, lvl)}
                                />
                              </div>

                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 mb-1">
                                  Önem
                                </span>
                                <ImportancePicker
                                  value={current.importance}
                                  onChange={(imp) => handleImportanceChange(sk.id, imp)}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic">
                              Rotaya dahil değil
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column (1 col): Live Radar Preview */}
          {showRadarPreview && (
            <div className="lg:col-span-1">
              <div className="sticky top-20 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-[#0B1F4D] flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>Canlı Radar Önizleme</span>
                  </h3>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {radarData.length} Beceri
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Öğrencilerin bu rotayı seçtiklerinde görecekleri sektör radar profilinin anlık simülasyonu.
                </p>

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
          )}
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
