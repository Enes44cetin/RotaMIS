"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  Target,
  AlertCircle,
  Loader2,
  Radar,
  Layers,
  Star,
  BarChart3,
} from "lucide-react";
import { saveOnboardingAssessment } from "@/actions/onboarding";
import { SkillRadar } from "@/components/charts/skill-radar";
import {
  buildBehavioralAnchors,
  buildSectoralPrompt,
} from "@/lib/checkup/topic-selector";
import type {
  CareerRequirementItem,
  DraftAssessment,
  LearningStyle,
  SkillCategory,
  SkillGapRow,
} from "@/types/database";

interface University {
  id: string;
  name: string;
  city: string | null;
}

interface CareerPath {
  id: string;
  slug: string;
  name_tr: string;
  description_tr: string | null;
  icon: string | null;
  market_summary?: string | null;
  total_postings?: number | null;
}

interface Skill {
  id: string;
  slug: string;
  category: SkillCategory;
  name_tr: string;
  icon: string | null;
  sort_order: number;
  prompt_tr?: string | null;
  level_anchors?: Record<string, string> | null;
}

interface EnrichedCareerSkill {
  skill: Skill;
  req: CareerRequirementItem;
  isRadarAxis: boolean;
  axisOrder: number | null;
  axisLabelTr: string;
}

interface WizardProps {
  universities: University[];
  careerPaths: CareerPath[];
  skills: Skill[];
  careerRequirements?: CareerRequirementItem[];
  initialDraft?: DraftAssessment | null;
  initialUniversityId?: string | null;
  initialUniversityOther?: string | null;
  initialCareerPathId?: string | null;
}

export function OnboardingWizard({
  universities,
  careerPaths,
  skills,
  careerRequirements = [],
  initialDraft,
  initialUniversityId,
  initialUniversityOther,
  initialCareerPathId,
}: WizardProps) {
  const router = useRouter();

  // Map legacy 5-step draft into our 4-step sectoral check-up
  const initialStep = Math.min(Math.max(initialDraft?.current_step || 1, 1), 4);
  const [step, setStep] = useState<number>(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic & Career Selection
  const [universityId, setUniversityId] = useState<string>(
    initialUniversityOther
      ? "other"
      : initialUniversityId || universities[0]?.id || ""
  );
  const [universityOther, setUniversityOther] = useState<string>(
    initialUniversityOther || ""
  );
  const [classYear, setClassYear] = useState<number>(
    initialDraft?.class_year ?? 3
  );
  const [careerPathId, setCareerPathId] = useState<string>(
    initialDraft?.career_path_id ||
      initialCareerPathId ||
      careerPaths[0]?.id ||
      ""
  );
  const [secondaryCareerPathId] = useState<string>(
    initialDraft?.secondary_career_path_id || ""
  );
  const [hasInternship, setHasInternship] = useState<boolean>(
    initialDraft?.has_internship ?? false
  );

  // Ratings (skillId -> 1..5)
  const initialRatings: Record<string, number> = {};
  skills.forEach((s) => {
    initialRatings[s.id] = 1;
  });
  if (initialDraft?.ratings) {
    initialDraft.ratings.forEach((r) => {
      initialRatings[r.skill_id] = r.level;
    });
  }
  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings);

  // Step 4: Goals & Preferences
  const [weeklyHours, setWeeklyHours] = useState<number>(
    initialDraft?.weekly_hours ?? 10
  );
  const [learningStyle, setLearningStyle] = useState<LearningStyle>(
    initialDraft?.learning_style || "hands_on"
  );
  const [targetDate] = useState<string>(initialDraft?.target_date || "");
  const [goalsNote, setGoalsNote] = useState<string>(
    initialDraft?.goals_note || ""
  );

  const selectedCareer = useMemo(
    () => careerPaths.find((cp) => cp.id === careerPathId) || careerPaths[0],
    [careerPaths, careerPathId]
  );

  const skillById = useMemo(
    () => new Map(skills.map((s) => [s.id, s])),
    [skills]
  );

  // Compute dynamic sectoral skills for the selected career path
  const { radarSkills, complementarySkills, allCareerSkills } = useMemo(() => {
    const reqsForCareer = careerRequirements.filter(
      (r) =>
        r.career_path_id === careerPathId && r.is_core_checkup !== false
    );

    // Fallback if career_path_skill_requirements is empty
    if (reqsForCareer.length === 0) {
      const fallbackAll: EnrichedCareerSkill[] = skills
        .slice(0, 12)
        .map((s, idx) => ({
          skill: s,
          req: {
            career_path_id: careerPathId,
            skill_id: s.id,
            required_level: 3,
            importance: idx < 6 ? 5 : 4,
            is_radar_axis: idx < 6,
            axis_order: idx < 6 ? idx + 1 : null,
          },
          isRadarAxis: idx < 6,
          axisOrder: idx < 6 ? idx + 1 : null,
          axisLabelTr: s.name_tr,
        }));
      return {
        radarSkills: fallbackAll.slice(0, 6),
        complementarySkills: fallbackAll.slice(6),
        allCareerSkills: fallbackAll,
      };
    }

    const enriched: EnrichedCareerSkill[] = reqsForCareer
      .map((req) => {
        const skill = skillById.get(req.skill_id);
        if (!skill) return null;
        return {
          skill,
          req,
          isRadarAxis: Boolean(req.is_radar_axis),
          axisOrder: req.axis_order ?? null,
          axisLabelTr: req.axis_label_tr || skill.name_tr,
        };
      })
      .filter((item): item is EnrichedCareerSkill => item !== null);

    // Explicit radar axes first, otherwise top 6 by importance & demand_pct
    const explicitRadar = enriched
      .filter((item) => item.isRadarAxis)
      .sort((a, b) => (a.axisOrder ?? 99) - (b.axisOrder ?? 99))
      .slice(0, 6);

    const radarList =
      explicitRadar.length >= 3
        ? explicitRadar
        : [...enriched]
            .sort((a, b) => {
              if (b.req.importance !== a.req.importance) {
                return b.req.importance - a.req.importance;
              }
              return Number(b.req.demand_pct ?? 0) - Number(a.req.demand_pct ?? 0);
            })
            .slice(0, 6)
            .map((item, idx) => ({
              ...item,
              isRadarAxis: true,
              axisOrder: idx + 1,
            }));

    const radarIds = new Set(radarList.map((r) => r.skill.id));
    const compList = enriched
      .filter((item) => !radarIds.has(item.skill.id))
      .sort((a, b) => {
        const pctDiff =
          Number(b.req.demand_pct ?? 0) - Number(a.req.demand_pct ?? 0);
        if (pctDiff !== 0) return pctDiff;
        if (b.req.importance !== a.req.importance) {
          return b.req.importance - a.req.importance;
        }
        return a.skill.sort_order - b.skill.sort_order;
      });

    return {
      radarSkills: radarList,
      complementarySkills: compList,
      allCareerSkills: [...radarList, ...compList],
    };
  }, [careerRequirements, careerPathId, skillById, skills]);

  // Build live SkillGapRow[] for the Step 4 Radar Chart preview
  const liveRadarPreviewGaps: SkillGapRow[] = useMemo(() => {
    return radarSkills.map((item, idx) => {
      const currentLvl = ratings[item.skill.id] || 1;
      const reqLvl = item.req.required_level || 3;
      return {
        user_id: "preview",
        assessment_id: "preview",
        career_path_id: careerPathId,
        career_path_name: selectedCareer?.name_tr || null,
        skill_id: item.skill.id,
        skill_slug: item.skill.slug,
        category: item.skill.category,
        name_tr: item.skill.name_tr,
        name_en: item.skill.name_tr,
        sort_order: item.skill.sort_order,
        current_level: currentLvl,
        required_level: reqLvl,
        importance: item.req.importance,
        gap: Math.max(0, reqLvl - currentLvl),
        is_radar_axis: true,
        axis_order: item.axisOrder ?? idx + 1,
        axis_label_tr: item.axisLabelTr,
        demand_pct: item.req.demand_pct ?? null,
        priority_label: item.req.priority_label ?? null,
        display_badge: item.req.display_badge ?? null,
      };
    });
  }, [radarSkills, ratings, careerPathId, selectedCareer]);

  const stepTitles = [
    {
      id: 1,
      title: "Hedef & Profil",
      desc: "Üniversite ve kariyer alanı",
      icon: GraduationCap,
    },
    {
      id: 2,
      title: "6 Radar Yetkinliği",
      desc: `${selectedCareer?.name_tr || "Meslek"} çekirdek eksenleri (${radarSkills.length} soru)`,
      icon: Radar,
    },
    {
      id: 3,
      title: "Sektörel Konular",
      desc: `Tamamlayıcı beklentiler (${complementarySkills.length} soru)`,
      icon: Layers,
    },
    {
      id: 4,
      title: "Radar & Tempo",
      desc: "Canlı analiz ve çalışma planı",
      icon: Target,
    },
  ];

  function setSkillLevel(skillId: string, level: number) {
    setRatings((prev) => ({
      ...prev,
      [skillId]: level,
    }));
  }

  async function handleNext(isFinal = false) {
    setError(null);
    setLoading(true);

    try {
      // Only send ratings belonging to the selected career path so unrelated skills don't pollute the student's profile
      const filteredCareerRatings: Record<string, number> = {};
      for (const item of allCareerSkills) {
        filteredCareerRatings[item.skill.id] = ratings[item.skill.id] || 1;
      }

      // Skip Step 3 automatically if a career path has 0 complementary skills
      let nextStep = step + 1;
      if (step === 2 && complementarySkills.length === 0) {
        nextStep = 4;
      }

      const res = await saveOnboardingAssessment({
        step: isFinal ? 5 : nextStep,
        classYear,
        careerPathId,
        secondaryCareerPathId: secondaryCareerPathId || undefined,
        universityId: universityId === "other" ? undefined : universityId,
        universityOther: universityId === "other" ? universityOther : undefined,
        hasInternship,
        ratings: filteredCareerRatings,
        weeklyHours,
        learningStyle,
        targetDate: targetDate || undefined,
        goalsNote,
        isFinal,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      if (isFinal && res?.redirect) {
        router.push(res.redirect);
        return;
      }

      setStep(Math.min(nextStep, 4));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handlePrev() {
    setStep((prev) => {
      if (prev === 4 && complementarySkills.length === 0) {
        return 2;
      }
      return Math.max(prev - 1, 1);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const learningStyleOptions: {
    id: LearningStyle;
    label: string;
    desc: string;
  }[] = [
    {
      id: "hands_on",
      label: "Uygulamalı / Proje",
      desc: "Kod yazarak ve yaparak",
    },
    { id: "video", label: "Video İzleyerek", desc: "YouTube & Kurs serileri" },
    {
      id: "reading",
      label: "Okuyarak / Döküman",
      desc: "Makale, kitap ve rehberler",
    },
    {
      id: "mixed",
      label: "Karma / Dengeli",
      desc: "Teori ve pratiği bir arada",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-200/60">
          <Sparkles className="w-3.5 h-3.5 text-[#2F5BFF]" />
          <span>Sektör Verisiyle Beslenen Dinamik Check-Up</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4D] tracking-tight">
          YBS Kariyer &amp; Sektör Check-Up&apos;ı
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
          Seçtiğin kariyer hedefine ait gerçek iş ilanı analizlerine göre mevcut
          seviyeni belirle, mesleğine özel 6 eksenli beceri radarını ve
          sprintlerini oluşturalım.
        </p>
      </div>

      {/* Modern 4-Step Dynamic Stepper */}
      <div className="mb-8 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stepTitles.map((st) => {
            const isCompleted = step > st.id;
            const isCurrent = step === st.id;

            return (
              <div
                key={st.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20"
                    : isCompleted
                    ? "bg-slate-50 border-slate-200 text-slate-500"
                    : "border-transparent opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCompleted
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-[#2F5BFF] text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      st.id
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold truncate ${
                      isCurrent ? "text-blue-900" : "text-slate-700"
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1">
                  {st.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-10 mb-8">
        {/* STEP 1: Basic Information & Career Selection */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#0B1F4D]">
                Adım 1: Temel Bilgiler ve Kariyer Hedefin
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Seçeceğin kariyer alanına göre özdeğerlendirme konuların ve
                beceri radarın tamamen o mesleğin sektör beklentilerine göre
                şekillenecek.
              </p>
            </div>

            {/* University Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Üniversite
              </label>
              <select
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
              >
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.city ? `(${u.city})` : ""}
                  </option>
                ))}
                <option value="other">Diğer / Listede Yok</option>
              </select>

              {universityId === "other" && (
                <input
                  type="text"
                  placeholder="Üniversite adınızı yazın..."
                  value={universityOther}
                  onChange={(e) => setUniversityOther(e.target.value)}
                  maxLength={150}
                  className="mt-3 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              )}
            </div>

            {/* Class Year */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Sınıf / Eğitim Düzeyi
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { value: 0, label: "Hazırlık" },
                  { value: 1, label: "1. Sınıf" },
                  { value: 2, label: "2. Sınıf" },
                  { value: 3, label: "3. Sınıf" },
                  { value: 4, label: "4. Sınıf" },
                  { value: 5, label: "Mezun" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setClassYear(item.value)}
                    className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      classYear === item.value
                        ? "bg-[#2F5BFF] text-white border-[#2F5BFF] shadow-md shadow-blue-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Target Career Path */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Hedeflediğin Birincil Kariyer Alanı
                </label>
                <span className="text-[11px] font-bold text-[#2F5BFF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  Seçilen meslek için {allCareerSkills.length} sektörel konu
                  sorulacak
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {careerPaths.map((cp) => {
                  const isSelected = careerPathId === cp.id;
                  const cpSkillCount = careerRequirements.filter(
                    (r) =>
                      r.career_path_id === cp.id && r.is_core_checkup !== false
                  ).length;

                  return (
                    <div
                      key={cp.id}
                      onClick={() => setCareerPathId(cp.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50/70 border-[#2F5BFF] ring-2 ring-blue-500/30"
                          : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900">
                          {cp.name_tr}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#2F5BFF] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {cp.description_tr}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {cpSkillCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                            6 Radar Ekseni · {cpSkillCount} Konu
                          </span>
                        )}
                        {cp.total_postings ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
                            <BarChart3 className="w-2.5 h-2.5" />
                            {cp.total_postings} İlan Analizi
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Internship Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Daha Önce Staj veya Sektör Deneyimin Oldu mu?
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setHasInternship(true)}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border cursor-pointer ${
                    hasInternship
                      ? "bg-[#2F5BFF] text-white border-[#2F5BFF]"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  Evet, staj yaptım
                </button>
                <button
                  type="button"
                  onClick={() => setHasInternship(false)}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border cursor-pointer ${
                    !hasInternship
                      ? "bg-[#2F5BFF] text-white border-[#2F5BFF]"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  Hayır, henüz yapmadım
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: 6 Career-Specific Radar Axes */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full mb-2">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>
                  {selectedCareer?.name_tr} · 6 Ana Radar Ekseni
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#0B1F4D]">
                Adım 2: Mesleğin 6 Çekirdek Radar Yetkinliği
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {selectedCareer?.market_summary
                  ? selectedCareer.market_summary
                  : `${selectedCareer?.name_tr} iş ilanlarında en yüksek frekansla talep edilen 6 ana yetkinlik ekseninde mevcut seviyeni işaretle.`}
              </p>
            </div>
            <SectoralSkillRatingList
              items={radarSkills}
              careerTitle={selectedCareer?.name_tr}
              ratings={ratings}
              onRate={setSkillLevel}
            />
          </div>
        )}

        {/* STEP 3: Complementary Sectoral Topics */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full mb-2">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {selectedCareer?.name_tr} · Tamamlayıcı Sektörel Beklentiler (
                  {complementarySkills.length} Konu)
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#0B1F4D]">
                Adım 3: Sektörde Fark Yaratan Tamamlayıcı Konular
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                İlan analizlerinde adayları öne çıkaran süreç, mimari ve sosyal
                yetkinlik konularındaki durumunu değerlendir.
              </p>
            </div>
            <SectoralSkillRatingList
              items={complementarySkills}
              careerTitle={selectedCareer?.name_tr}
              ratings={ratings}
              onRate={setSkillLevel}
            />
          </div>
        )}

        {/* STEP 4: Live Career Radar Preview & Tempo Preferences */}
        {step === 4 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#0B1F4D]">
                Adım 4: Meslek Radarın ve Çalışma Tempon
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Cevaplarına göre oluşan{" "}
                <strong className="text-slate-700">
                  {selectedCareer?.name_tr} Beceri Radarını
                </strong>{" "}
                incele ve haftalık çalışma temponu belirle.
              </p>
            </div>

            {/* Live Career Radar Preview Card */}
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F5BFF]">
                    Canlı Önizleme
                  </span>
                  <h3 className="text-sm font-extrabold text-[#0B1F4D]">
                    {selectedCareer?.name_tr} — 6 Eksenli Beceri Radarın
                  </h3>
                </div>
                {selectedCareer?.market_summary && (
                  <span className="text-[11px] text-slate-500 max-w-xs sm:text-right line-clamp-2">
                    {selectedCareer.market_summary}
                  </span>
                )}
              </div>
              <SkillRadar
                data={liveRadarPreviewGaps}
                compact
              />
            </div>

            {/* Weekly Hours */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Haftalık Kendini Geliştirmeye Ayırabileceğin Süre
                </label>
                <span className="text-sm font-extrabold text-[#2F5BFF] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  {weeklyHours} Saat / Hafta
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={40}
                step={2}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2F5BFF]"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>2 Saat (Hafif tempo)</span>
                <span>20 Saat (Yoğun)</span>
                <span>40 Saat (Tam odak)</span>
              </div>
            </div>

            {/* Learning Style */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nasıl Daha İyi Öğreniyorsun?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {learningStyleOptions.map((ls) => (
                  <button
                    key={ls.id}
                    type="button"
                    onClick={() => setLearningStyle(ls.id)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      learningStyle === ls.id
                        ? "bg-blue-50/80 border-[#2F5BFF] ring-2 ring-blue-500/30 text-blue-900"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold text-xs">{ls.label}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {ls.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Goals note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Kariyerinle İlgili Özel Bir Hedefin veya Notun Var mı?
                (Opsiyonel)
              </label>
              <textarea
                rows={3}
                placeholder="Örn: 4. sınıfta staj bulmak istiyorum, backend ve veritabanı mimarisine odaklanmak istiyorum..."
                value={goalsNote}
                onChange={(e) => setGoalsNote(e.target.value)}
                maxLength={500}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Geri</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => handleNext(false)}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-[#2F5BFF] hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <span>Sonraki Adım</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNext(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#2F5BFF] to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm shadow-xl shadow-blue-600/30 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Yol Haritan Hazırlanıyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Check-Up&apos;ı Bitir &amp; Yol Haritasını Gör</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponent for sectoral 1-5 rating items with market badges & behavioral anchors
function SectoralSkillRatingList({
  items,
  careerTitle,
  ratings,
  onRate,
}: {
  items: EnrichedCareerSkill[];
  careerTitle?: string;
  ratings: Record<string, number>;
  onRate: (id: string, lvl: number) => void;
}) {
  return (
    <div className="space-y-6">
      {items.map((item) => {
        const { skill, req, isRadarAxis, axisOrder } = item;
        const currentLevel = ratings[skill.id] || 1;
        const anchors = buildBehavioralAnchors(
          skill.name_tr,
          skill.category,
          skill.level_anchors
        );
        const activeAnchor =
          anchors.find((a) => a.level === currentLevel) || anchors[0];
        const promptText = buildSectoralPrompt(
          skill.name_tr,
          skill.category,
          skill.prompt_tr
        );

        return (
          <div
            key={skill.id}
            className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:shadow-xs transition-all"
          >
            {/* Header & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  {isRadarAxis && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      ★ Radar Ekseni {axisOrder ? `#${axisOrder}` : ""}
                    </span>
                  )}
                  {req.display_badge && (
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      İlanların {req.display_badge}
                    </span>
                  )}
                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Sektör Hedefi: Seviye {req.required_level}/5
                  </span>
                </div>
                <span className="font-bold text-sm text-slate-900">
                  {skill.name_tr}
                </span>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {promptText}
                </p>
              </div>
              <div className="text-xs font-semibold text-[#2F5BFF] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/50 self-start shrink-0">
                {activeAnchor.label} (Seviye {currentLevel}/5)
              </div>
            </div>

            {/* Level selection buttons 1-5 */}
            <div className="grid grid-cols-5 gap-2 mt-3">
              {anchors.map((anchor) => {
                const isSelected = currentLevel === anchor.level;
                return (
                  <button
                    key={anchor.level}
                    type="button"
                    onClick={() => onRate(skill.id, anchor.level)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      isSelected
                        ? "bg-[#2F5BFF] text-white border-[#2F5BFF] shadow-md shadow-blue-500/20 scale-[1.02]"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-sm">{anchor.level}</span>
                    <span className="text-[10px] hidden sm:inline-block font-normal truncate max-w-full">
                      {anchor.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-600 mt-2.5 bg-white/90 px-3 py-2 rounded-xl border border-slate-200/60">
              <span className="font-bold text-[#0B1F4D]">
                Seviye {currentLevel} ({activeAnchor.label}):{" "}
              </span>
              <span>{activeAnchor.desc}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
