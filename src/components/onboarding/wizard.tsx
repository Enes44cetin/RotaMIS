"use client";

import { useState } from "react";
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
  Code2,
  TrendingUp,
  HeartHandshake,
} from "lucide-react";
import { saveOnboardingAssessment } from "@/actions/onboarding";
import type { DraftAssessment, LearningStyle, SkillCategory } from "@/types/database";

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
}

interface Skill {
  id: string;
  slug: string;
  category: SkillCategory;
  name_tr: string;
  icon: string | null;
  sort_order: number;
}

interface WizardProps {
  universities: University[];
  careerPaths: CareerPath[];
  skills: Skill[];
  initialDraft?: DraftAssessment | null;
  initialUniversityId?: string | null;
  initialUniversityOther?: string | null;
  initialCareerPathId?: string | null;
}

const STEP_TITLES = [
  { id: 1, title: "Temel Bilgiler", desc: "Üniversite, sınıf ve kariyer hedefin", icon: GraduationCap },
  { id: 2, title: "Teknik Beceriler", desc: "Yazılım, veri ve araç yetkinliklerin", icon: Code2 },
  { id: 3, title: "İşletme & Süreç", desc: "Analiz, modelleme ve yönetim bilgin", icon: TrendingUp },
  { id: 4, title: "Sosyal Beceriler", desc: "İletişim, takım çalışması ve yabancı dil", icon: HeartHandshake },
  { id: 5, title: "Hedefler & Tercih", desc: "Çalışma saatin ve öğrenme tarzın", icon: Target },
];

const LEVEL_DESCRIPTIONS = [
  { level: 1, label: "Hiç Bilmiyorum", desc: "Henüz bu konuda deneyimim yok." },
  { level: 2, label: "Temel Farkındalık", desc: "Teorik olarak biliyorum, basit örnekleri tanırım." },
  { level: 3, label: "Rehberle Yapabilirim", desc: "Döküman veya rehber yardımıyla uygulayabilirim." },
  { level: 4, label: "Bağımsız Yapabilirim", desc: "Projelerde tek başıma rahatlıkla kullanırım." },
  { level: 5, label: "Uzmanım / İleri", desc: "Derinlemesine hakimim, başkalarına öğretebilirim." },
];

export function OnboardingWizard({
  universities,
  careerPaths,
  skills,
  initialDraft,
  initialUniversityId,
  initialUniversityOther,
  initialCareerPathId,
}: WizardProps) {
  const router = useRouter();

  // Wizard State
  const [step, setStep] = useState<number>(initialDraft?.current_step || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic
  const [universityId, setUniversityId] = useState<string>(
    initialUniversityOther
      ? "other"
      : initialUniversityId || universities[0]?.id || ""
  );
  const [universityOther, setUniversityOther] = useState<string>(
    initialUniversityOther || ""
  );
  const [classYear, setClassYear] = useState<number>(initialDraft?.class_year ?? 3);
  const [careerPathId, setCareerPathId] = useState<string>(
    initialDraft?.career_path_id || initialCareerPathId || careerPaths[0]?.id || ""
  );
  const [secondaryCareerPathId] = useState<string>(
    initialDraft?.secondary_career_path_id || ""
  );
  const [hasInternship, setHasInternship] = useState<boolean>(
    initialDraft?.has_internship ?? false
  );

  // Steps 2, 3, 4: Ratings (skillId -> 1..5)
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

  // Step 5: Goals & Preferences
  const [weeklyHours, setWeeklyHours] = useState<number>(initialDraft?.weekly_hours ?? 10);
  const [learningStyle, setLearningStyle] = useState<LearningStyle>(
    initialDraft?.learning_style || "hands_on"
  );
  const [targetDate] = useState<string>(initialDraft?.target_date || "");
  const [goalsNote, setGoalsNote] = useState<string>(initialDraft?.goals_note || "");

  // Categorized skills
  const technicalSkills = skills.filter((s) => s.category === "technical");
  const businessSkills = skills.filter((s) => s.category === "business");
  const softSkills = skills.filter((s) => s.category === "soft");

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
      const res = await saveOnboardingAssessment({
        step: isFinal ? 5 : step + 1,
        classYear,
        careerPathId,
        secondaryCareerPathId: secondaryCareerPathId || undefined,
        universityId: universityId === "other" ? undefined : universityId,
        universityOther: universityId === "other" ? universityOther : undefined,
        hasInternship,
        ratings,
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

      setStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handlePrev() {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const learningStyleOptions: { id: LearningStyle; label: string; desc: string }[] = [
    { id: "hands_on", label: "Uygulamalı / Proje", desc: "Kod yazarak ve yaparak" },
    { id: "video", label: "Video İzleyerek", desc: "YouTube & Kurs serileri" },
    { id: "reading", label: "Okuyarak / Döküman", desc: "Makale, kitap ve rehberler" },
    { id: "mixed", label: "Karma / Dengeli", desc: "Teori ve pratiği bir arada" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-200/60">
          <Sparkles className="w-3.5 h-3.5 text-[#2F5BFF]" />
          <span>Kişiselleştirilmiş Kariyer Check-Up&apos;ı</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4D] tracking-tight">
          YBS Kariyer Profilini Oluştur
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
          Mevcut yetkinliklerini sektör standartlarıyla karşılaştırıp sana özel AI yol haritanı hazırlayacağız.
        </p>
      </div>

      {/* Modern Stepper */}
      <div className="mb-8 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STEP_TITLES.map((st) => {
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
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-[#2F5BFF] text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.id}
                  </div>
                  <span
                    className={`text-xs font-bold truncate ${
                      isCurrent ? "text-blue-900" : "text-slate-700"
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1">{st.desc}</div>
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
        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#0B1F4D]">
                Adım 1: Temel Bilgiler ve Kariyer Hedefin
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Eğitim durumunu ve seni en çok heyecanlandıran YBS kariyer alanını seç.
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Hedeflediğin Birincil Kariyer Alanı
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {careerPaths.map((cp) => {
                  const isSelected = careerPathId === cp.id;
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
                        <span className="font-bold text-sm text-slate-900">{cp.name_tr}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#2F5BFF]" />}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{cp.description_tr}</p>
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

        {/* STEP 2: Technical Skills */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0B1F4D]">
                Adım 2: Teknik Beceriler ve Araçlar
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Her bir teknik araç için mevcut bilgi ve uygulama seviyeni 1-5 arasında işaretle.
              </p>
            </div>
            <SkillRatingList
              skills={technicalSkills}
              ratings={ratings}
              onRate={setSkillLevel}
            />
          </div>
        )}

        {/* STEP 3: Business & Process Skills */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0B1F4D]">
                Adım 3: İşletme ve Süreç Bilgisi
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                İş analizi, süreç modelleme ve kurumsal yönetim yetkinliklerini değerlendir.
              </p>
            </div>
            <SkillRatingList
              skills={businessSkills}
              ratings={ratings}
              onRate={setSkillLevel}
            />
          </div>
        )}

        {/* STEP 4: Soft Skills */}
        {step === 4 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0B1F4D]">
                Adım 4: Sosyal ve İletişim Becerileri
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Takım çalışması, sunum, problem çözme ve yabancı dil yetkinliklerini puanla.
              </p>
            </div>
            <SkillRatingList
              skills={softSkills}
              ratings={ratings}
              onRate={setSkillLevel}
            />
          </div>
        )}

        {/* STEP 5: Goals & Preferences */}
        {step === 5 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#0B1F4D]">
                Adım 5: Hedefler ve Çalışma Tercihleri
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Yapay zekanın üreteceği görevlerin sana ve takvimine tam uyması için bu tercihleri belirt.
              </p>
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
                    <div className="text-[10px] text-slate-500 mt-1">{ls.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Goals note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Kariyerinle İlgili Özel Bir Hedefin veya Notun Var mı? (Opsiyonel)
              </label>
              <textarea
                rows={3}
                placeholder="Örn: 4. sınıfta SAP danışmanlığı stajı bulmak istiyorum, SQL'i çok seviyorum..."
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

          {step < 5 ? (
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

// Subcomponent for 1-5 rating items
function SkillRatingList({
  skills,
  ratings,
  onRate,
}: {
  skills: Skill[];
  ratings: Record<string, number>;
  onRate: (id: string, lvl: number) => void;
}) {
  return (
    <div className="space-y-6">
      {skills.map((skill) => {
        const currentLevel = ratings[skill.id] || 1;

        return (
          <div
            key={skill.id}
            className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:shadow-xs transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <span className="font-bold text-sm text-slate-900">{skill.name_tr}</span>
              </div>
              <div className="text-xs font-semibold text-[#2F5BFF] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/50 self-start sm:self-auto">
                {LEVEL_DESCRIPTIONS[currentLevel - 1].label} (Seviye {currentLevel}/5)
              </div>
            </div>

            {/* Level selection buttons 1-5 */}
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isSelected = currentLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onRate(skill.id, lvl)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      isSelected
                        ? "bg-[#2F5BFF] text-white border-[#2F5BFF] shadow-md shadow-blue-500/20 scale-[1.02]"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-sm">{lvl}</span>
                    <span className="text-[10px] hidden sm:inline-block font-normal truncate max-w-full">
                      {LEVEL_DESCRIPTIONS[lvl - 1].label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-500 mt-2 italic">
              💡 {LEVEL_DESCRIPTIONS[currentLevel - 1].desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}
