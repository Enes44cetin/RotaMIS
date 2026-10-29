"use client";

import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { useDashboard } from "../dashboard-shell";

export function CatalogPendingNode() {
  const { advanceToNextSprint, isAdvancingSprint } = useDashboard();

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-emerald-200 p-6 sm:p-8 text-center shadow-xs space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
        <Sparkles className="w-8 h-8" />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-lg sm:text-xl font-black text-[#0B1F4D]">
          Muhteşem İlerleme! Mevcut İçerikleri Tamamladın 🎉
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Hedef kariyerindeki tüm onaylı eğitim ve proje modüllerini bitirdin.
          Eğitmen ekibimiz beceri profilin için yeni kaynaklar eklediğinde
          buradan tek tıkla yeni sprintini başlatabilirsin.
        </p>
      </div>

      <button
        type="button"
        disabled={isAdvancingSprint}
        onClick={() => void advanceToNextSprint()}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
      >
        {isAdvancingSprint ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        <span>Yeni İçerik Kontrol Et</span>
      </button>
    </div>
  );
}

