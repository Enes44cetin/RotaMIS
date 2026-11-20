"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  CheckCircle2,
  ArrowLeftRight,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { resetStudentCareerJourney } from "@/actions/journey";

interface MasteryCompletedCardProps {
  careerName: string;
  overallReadiness: number;
}

export function MasteryCompletedCard({
  careerName,
  overallReadiness,
}: MasteryCompletedCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isResetting, startResetTransition] = useTransition();

  function handleReset() {
    startResetTransition(async () => {
      const res = await resetStudentCareerJourney();
      if (!res.ok) {
        toast.error(res.error || "İşlem sırasında bir hata oluştu.");
        return;
      }
      toast.info(
        "Yetkinlik puanlarını yeniden değerlendirebilir veya farklı bir meslek seçebilirsin."
      );
      router.push("/onboarding");
    });
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-emerald-200/90 p-6 sm:p-10 text-center shadow-xs space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
        <Trophy className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-lg mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-extrabold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>%{Math.max(100, overallReadiness)} Sektör Uyumu • 0 Açık Beceri</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-[#0B1F4D] tracking-tight">
          Tebrikler! {careerName} Sektör Beklentilerini %100 Karşılıyorsun
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Özdeğerlendirme puanlarına göre bu kariyer rotasında kapatman gereken
          hiçbir yetkinlik açığı bulunmuyor; bu nedenle gereksiz bir görev
          patikası oluşturulmadı.
        </p>
      </div>

      {!confirmOpen ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Puanlarımı Yeniden Değerlendir</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-[#2F5BFF]" />
            <span>Farklı Kariyer Hedefi Seç</span>
          </button>
        </div>
      ) : (
        <div className="max-w-md mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Check-up ekranına dönerek mevcut mesleğindeki becerilerini gerçekçi
              seviyelerle tekrar puanlayabilir veya yeni bir kariyer hedefi
              seçebilirsin.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isResetting}
              onClick={() => setConfirmOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={isResetting}
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Check-Up Ekranına Geç</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
