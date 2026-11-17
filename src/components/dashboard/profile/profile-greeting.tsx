"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Briefcase,
  ArrowLeftRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { resetStudentCareerJourney } from "@/actions/journey";

interface ProfileGreetingProps {
  fullName: string | null;
  universityName: string;
  careerName: string;
}

export function ProfileGreeting({
  fullName,
  universityName,
  careerName,
}: ProfileGreetingProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isResetting, startResetTransition] = useTransition();

  const firstName = fullName?.trim().split(/\s+/)[0] || "Öğrenci";
  const initials = (fullName || "Ö")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  function handleConfirmCareerReset() {
    startResetTransition(async () => {
      const res = await resetStudentCareerJourney();
      if (!res.ok) {
        toast.error(res.error || "İşlem sırasında bir hata oluştu.");
        return;
      }
      setConfirmOpen(false);
      toast.info(
        "Yeni kariyer alanını seçip sektörel değerlendirmeni baştan tamamlayabilirsin."
      );
      router.push("/onboarding");
    });
  }

  return (
    <>
      <div className="relative shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1F4D] via-[#102A6B] to-[#1E40AF] p-5 text-white shadow-md shadow-blue-950/10">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#2F5BFF]/25 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-xs flex items-center justify-center text-base font-black tracking-tight shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-blue-200/90 uppercase tracking-wider">
              Kariyer Profili
            </p>
            <h1 className="text-lg font-extrabold tracking-tight truncate">
              Selam, {firstName}! 👋
            </h1>
          </div>
        </div>

        <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 text-blue-100/90">
            <div className="flex items-center gap-2 min-w-0">
              <Briefcase className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="font-bold text-white truncate">{careerName}</span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              title="Kariyer hedefini değiştir ve baştan değerlendir"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-semibold text-blue-100 transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeftRight className="w-2.5 h-2.5" />
              <span>Hedef Değiştir</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-blue-200/80">
            <GraduationCap className="w-3.5 h-3.5 text-blue-300 shrink-0" />
            <span className="truncate">{universityName}</span>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0B1F4D]">
                  Kariyer Hedefini Değiştir &amp; Sıfırla
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Kariyer alanını değiştirdiğinde mevcut aktif patikan sıfırlanır.
                  Seçeceğin yeni mesleğin sektörel beklentilerine göre{" "}
                  <strong>baştan Check-Up</strong> çözerek yeni mesleğine özel
                  beceri radarını ve Sprint 1 patikanı oluşturacaksın.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmCareerReset}
                className="px-4 py-2 rounded-xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Sıfırla ve Yeni Meslek Seç</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
