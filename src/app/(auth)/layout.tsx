import Link from "next/link";
import { Compass, Sparkles, CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#F7F9FC]">
      {/* Left Column: Brand & Hero Showcase (visible on large screens) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#0B1F4D] via-[#0D255C] to-[#1E3A8A] text-white relative overflow-hidden">
        {/* Decorative blur shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Compass className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tight leading-none">
              Rota<span className="text-blue-400">MIS</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Kariyerinde Netlik Kazan</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight leading-snug">
            YBS serüvenini somut veriler ve hedeflerle yönet.
          </h2>

          <p className="mt-4 text-blue-100/80 text-sm leading-relaxed">
            Hangi rolde ne kadar hazırsın? Sektör ne istiyor, sende ne eksik? RotaMIS ile tahmin etme, analiz et ve uygula.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "5 Dakikalık Detaylı Beceri Check-Up'ı",
              "Sektör Standartlarıyla Radar Gap Analizi",
              "Haftalık Kişiselleştirilmiş AI Görevleri",
              "Gamified XP, Seviye ve Rozet Ekosistemi",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs text-blue-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-blue-300/60">
          © 2026 RotaMIS Platformu. Tüm hakları saklıdır.
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md">
          {/* Mobile Brand Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0B1F4D] to-[#2F5BFF] flex items-center justify-center text-white shadow-md">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black text-[#0B1F4D] tracking-tight leading-none">
                Rota<span className="text-[#2F5BFF]">MIS</span>
              </span>
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
