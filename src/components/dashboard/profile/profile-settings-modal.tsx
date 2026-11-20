"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  X,
  Settings,
  User,
  GraduationCap,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { updateStudentSettings } from "@/actions/profile";
import type {
  LearningStyle,
  StudentSettingsInitial,
  UniversityOption,
} from "@/types/database";

interface ProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
  initial: StudentSettingsInitial;
  universities: UniversityOption[];
}

const LEARNING_STYLE_OPTIONS: Array<{
  id: LearningStyle;
  label: string;
  desc: string;
}> = [
  { id: "hands_on", label: "Uygulamalı / Proje", desc: "Kod ve pratik odaklı" },
  { id: "video", label: "Video İzleyerek", desc: "Kurs ve video serileri" },
  { id: "reading", label: "Okuyarak / Doküman", desc: "Makale ve rehberler" },
  { id: "mixed", label: "Karma / Dengeli", desc: "Teori ve pratik birlikte" },
];

export function ProfileSettingsModal({
  open,
  onClose,
  initial,
  universities,
}: ProfileSettingsModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isSaving, startSaveTransition] = useTransition();

  const defaultUniValue = initial.universityOther
    ? "other"
    : initial.universityId || universities[0]?.id || "other";

  const [fullName, setFullName] = useState(initial.fullName);
  const [universityId, setUniversityId] = useState(defaultUniValue);
  const [universityOther, setUniversityOther] = useState(
    initial.universityOther || ""
  );
  const [weeklyHours, setWeeklyHours] = useState(initial.weeklyHours || 10);
  const [learningStyle, setLearningStyle] = useState<LearningStyle>(
    initial.learningStyle || "hands_on"
  );

  useEffect(() => {
    if (!open) return;
    setFullName(initial.fullName);
    setUniversityId(
      initial.universityOther
        ? "other"
        : initial.universityId || universities[0]?.id || "other"
    );
    setUniversityOther(initial.universityOther || "");
    setWeeklyHours(initial.weeklyHours || 10);
    setLearningStyle(initial.learningStyle || "hands_on");
  }, [open, initial, universities]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSaving) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isSaving, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startSaveTransition(async () => {
      const res = await updateStudentSettings({
        fullName,
        universityId,
        universityOther: universityId === "other" ? universityOther : undefined,
        weeklyHours,
        learningStyle,
      });

      if (!res.ok) {
        toast.error(res.error || "Ayarlar kaydedilemedi.");
        return;
      }

      toast.success("Profil ve çalışma tercihlerin güncellendi.");
      onClose();
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-settings-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isSaving) onClose();
            }}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs"
          />

          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 36, scale: 0.97 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 28, scale: 0.97 }
            }
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/50 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-[#2F5BFF] flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#2F5BFF]">
                    Patika Sıfırlanmadan Güncelle
                  </div>
                  <h2
                    id="profile-settings-title"
                    className="text-base sm:text-lg font-extrabold text-[#0B1F4D]"
                  >
                    Profil &amp; Çalışma Temposu
                  </h2>
                </div>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={onClose}
                aria-label="Ayarları kapat"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
                {/* Full Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    <User className="w-3.5 h-3.5 text-[#2F5BFF]" />
                    <span>Ad Soyad</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Adınız Soyadınız"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-[#2F5BFF]"
                  />
                </div>

                {/* University */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    <GraduationCap className="w-3.5 h-3.5 text-[#2F5BFF]" />
                    <span>Üniversite</span>
                  </label>
                  <select
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-[#2F5BFF]"
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
                      required
                      minLength={2}
                      maxLength={150}
                      value={universityOther}
                      onChange={(e) => setUniversityOther(e.target.value)}
                      placeholder="Üniversite adınızı yazın..."
                      className="mt-2.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-[#2F5BFF]"
                    />
                  )}
                </div>

                {/* Weekly Hours */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-[#2F5BFF]" />
                      <span>Haftalık Çalışma Süresi</span>
                    </label>
                    <span className="text-xs font-extrabold text-[#2F5BFF] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 tabular-nums">
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
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>2 Saat (Sınav haftası)</span>
                    <span>20 Saat (Yoğun)</span>
                    <span>40 Saat (Tam odak)</span>
                  </div>
                </div>

                {/* Learning Style */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#2F5BFF]" />
                    <span>Öğrenme Stili</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {LEARNING_STYLE_OPTIONS.map((opt) => {
                      const active = learningStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setLearningStyle(opt.id)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            active
                              ? "bg-blue-50/80 border-[#2F5BFF] ring-2 ring-blue-500/25 text-blue-950"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="text-xs font-bold">{opt.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {opt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info note */}
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex items-start gap-2.5 text-[11px] text-blue-900">
                  <Info className="w-4 h-4 text-[#2F5BFF] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Haftalık tempo ve öğrenme stili değişikliklerin mevcut patikanı
                    sıfırlamaz; bir sonraki sprintin oluşturulurken otomatik
                    uygulanır.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 sm:p-6 pt-3 border-t border-slate-100 bg-white flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
