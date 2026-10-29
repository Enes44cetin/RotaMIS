"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-xs space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-extrabold text-[#0B1F4D]">
            Kariyer Patikası Yüklenemedi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Veriler getirilirken geçici bir bağlantı sorunu oluştu. Lütfen sayfayı
            yeniden yüklemeyi dene.
          </p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Tekrar Dene</span>
        </button>
      </div>
    </div>
  );
}

