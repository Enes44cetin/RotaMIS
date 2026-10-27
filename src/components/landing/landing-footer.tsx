import { Compass, Heart } from "lucide-react";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="bg-[#071536] text-slate-400 py-12 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">
              Rota<span className="text-[#2F5BFF]">MIS</span>
            </span>
          </div>

          {/* Düzce University Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs font-semibold text-center">
            <span>Düzce Üniversitesi YBS öğrencileri tarafından, YBS'liler için kodlandı 🚀</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">
              Giriş Yap
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Kayıt Ol
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
          <div>© 2026 RotaMIS. Tüm hakları saklıdır.</div>
          <div className="flex items-center gap-1">
            <span>YBS vizyonuyla tasarlandı ve geliştirildi</span>
            <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
