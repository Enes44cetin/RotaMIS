"use client";

import { useState, useTransition } from "react";
import { Compass, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { retryInitialRoadmap } from "@/actions/journey";

export function PathEmptyState() {
  const [isRetrying, startRetryTransition] = useTransition();
  const [catalogPending, setCatalogPending] = useState(false);

  function handleRetry() {
    startRetryTransition(async () => {
      const res = await retryInitialRoadmap();
      if (!res.ok) {
        toast.error(res.error || "Patika oluşturulurken bir hata oluştu.");
        return;
      }

      if (res.catalogExhausted) {
        setCatalogPending(true);
        toast.info(
          "Bu kariyer alanı için onaylı eğitim kataloğumuz genişletiliyor; talebin ekibimize iletildi."
        );
        return;
      }

      toast.success("Kariyer patikan ve Sprint 1 başarıyla oluşturuldu! 🚀");
    });
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs space-y-4">
      <div
        className={`w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center ${
          catalogPending
            ? "bg-amber-50 border-amber-200 text-amber-600"
            : "bg-blue-50 border-blue-200/80 text-[#2F5BFF]"
        }`}
      >
        {catalogPending ? (
          <Sparkles className="w-8 h-8" />
        ) : (
          <Compass className="w-8 h-8" />
        )}
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h2 className="text-lg font-extrabold text-[#0B1F4D]">
          {catalogPending
            ? "Katalog İçerikleri Hazırlanıyor"
            : "Kariyer Patikan Hazırlanıyor"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {catalogPending
            ? "Check-up sonuçların kaydedildi. Seçtiğin kariyer alanındaki becerilerin için onaylı kaynak havuzumuz genişletiliyor; yeni kaynak eklendiğinde tek tıkla patikanı başlatabilirsin."
            : "Check-up verilerin güvende! İlk sprint görevlerin henüz yüklenemedi. Aşağıdan tek tıkla patikanı yeniden oluşturmayı deneyebilirsin."}
        </p>
      </div>
      <div className="pt-2">
        <button
          type="button"
          disabled={isRetrying}
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
        >
          {isRetrying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>
            {isRetrying
              ? "Patika Oluşturuluyor..."
              : "Patikayı Oluşturmayı Tekrar Dene"}
          </span>
        </button>
      </div>
    </div>
  );
}
