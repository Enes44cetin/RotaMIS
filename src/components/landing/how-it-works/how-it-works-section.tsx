import Link from "next/link";
import {
  ClipboardCheck,
  Radar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Award,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

export function HowItWorksSection() {
  return (
    <section id="nasil-calisir" className="py-20 bg-white border-y border-slate-200/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Reveal direction="down">
            <span className="text-xs font-extrabold text-[#2F5BFF] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60 inline-block mb-3">
              3 Basit Adım
            </span>
          </Reveal>
          <Reveal direction="up" delay={0.1}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F4D] tracking-tight">
              Nasıl Çalışır?
            </h2>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Okulda aldığın teorik eğitimi sektörün aradığı somut projelere ve yetkinliklere dönüştür.
            </p>
          </Reveal>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <Reveal direction="up" delay={0.1} className="h-full">
            <div className="h-full p-7 rounded-3xl bg-[#F7F9FC] border border-slate-200/80 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-[#2F5BFF] flex items-center justify-center font-black text-base shadow-xs group-hover:scale-110 transition-transform">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    ADIM 01
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#0B1F4D] mb-2">
                  5 dakikada kendini değerlendir
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  SQL, Python, BPMN ve ERP gibi 20 temel araç ve işletme becerisinde mevcut seviyeni 1-5 arasında puanla.
                </p>
              </div>

              {/* Mini visual */}
              <div className="mt-6 pt-5 border-t border-slate-200/60">
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex justify-between">
                    <span>SQL / Veri Tabanı</span>
                    <span className="text-[#2F5BFF]">Seviye 3/5</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-2 rounded-full ${
                          lvl <= 3 ? "bg-[#2F5BFF]" : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Step 2 */}
          <Reveal direction="up" delay={0.2} className="h-full">
            <div className="h-full p-7 rounded-3xl bg-[#F7F9FC] border border-slate-200/80 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center font-black text-base shadow-xs group-hover:scale-110 transition-transform">
                    <Radar className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    ADIM 02
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#0B1F4D] mb-2">
                  Radar analiziyle eksiklerini keşfet
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Hedeflediğin pozisyonun sektör beklentileriyle kendi puanlarını karşılaştır, en büyük gap'lerini anında gör.
                </p>
              </div>

              {/* Mini visual */}
              <div className="mt-6 pt-5 border-t border-slate-200/60">
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-700">
                    <div>Süreç Modelleme (BPMN)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Sen: 3 • Sektör: 5</div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                    +2 Seviye Fark
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Step 3 */}
          <Reveal direction="up" delay={0.3} className="h-full">
            <div className="h-full p-7 rounded-3xl bg-[#F7F9FC] border border-slate-200/80 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center font-black text-base shadow-xs group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    ADIM 03
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#0B1F4D] mb-2">
                  Yapay zekâ sana özel görevler versin
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Haftalık ayrılabilecek saatine göre uygulamalı görevleri tamamla, XP topla ve CV'ni güçlendir.
                </p>
              </div>

              {/* Mini visual */}
              <div className="mt-6 pt-5 border-t border-slate-200/60">
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-bold line-through text-slate-400">
                      BPMN Sipariş Akışı Çiz
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                    <Award className="w-3 h-3 text-emerald-600" />
                    +30 XP
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Secondary CTA Button */}
        <div className="mt-14 text-center">
          <Reveal direction="up" delay={0.35}>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[#0B1F4D] hover:bg-slate-900 text-white font-bold px-7 py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] text-sm group"
            >
              <span>Yetkinliklerini Ölç</span>
              <ArrowRight className="w-4 h-4 text-[#2F5BFF] group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
