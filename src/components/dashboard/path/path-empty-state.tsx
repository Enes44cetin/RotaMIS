import Link from "next/link";
import { Compass, RefreshCw } from "lucide-react";

export function PathEmptyState() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs space-y-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-200/80 text-[#2F5BFF] flex items-center justify-center">
        <Compass className="w-8 h-8" />
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h2 className="text-lg font-extrabold text-[#0B1F4D]">
          Kariyer Patikan Henüz Oluşturulmadı
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Kişiselleştirilmiş haftalık görev düğümlerini oluşturmak için 5 dakikalık
          beceri check-up adımlarını tamamlayabilirsin.
        </p>
      </div>
      <div className="pt-2">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Check-Up Yap ve Patikayı Çiz</span>
        </Link>
      </div>
    </div>
  );
}

