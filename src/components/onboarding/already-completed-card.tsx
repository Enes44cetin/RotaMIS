"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeftRight,
  AlertTriangle,
  Loader2,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import { resetStudentCareerJourney } from "@/actions/journey";

interface OnboardingAlreadyCompletedCardProps {
  careerName: string | null;
}

export function OnboardingAlreadyCompletedCard({
  careerName,
}: OnboardingAlreadyCompletedCardProps) {
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, startResetTransition] = useTransition();

  function handleReset() {
    startResetTransition(async () => {
      const res = await resetStudentCareerJourney();
      if (!res.ok) {
        toast.error(res.error || "Yolculuk sıfırlanırken bir hata oluştu.");
        return;
      }
      toast.info("Yeni kariyer alanını seçip check-up'a baştan başlayabilirsin.");
      router.refresh();
    });
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-8 sm:p-10 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[#2F5BFF] text-xs font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>{careerName || "Aktif Kariyer Patikası"}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#0B1F4D] tracking-tight">
            Beceri Check-Up&apos;ını Zaten Tamamladın
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Kariyer patikan, beceri radarın ve sprintlerin panelinde hazır. Mevcut
            ilerlemeni kaybetmeden doğrudan dashboard&apos;a dönebilirsin.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/25 transition-all"
          >
            <span>Dashboard&apos;a Dön</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Hedef Değiştir ve Baştan Check-Up Çöz</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Emin misin?</strong> Kariyer hedefini değiştirdiğinde
                  mevcut aktif patikan pasife alınır ve yeni mesleğin için Sprint 1
                  sıfırdan oluşturulur. (Kazanılmış XP ve rozetlerin korunur.)
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setConfirmReset(false)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleReset}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Evet, Sıfırla ve Başla</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
