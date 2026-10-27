import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

export function FinalCta() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-[#0B1F4D] via-[#102B66] to-[#2F5BFF] text-white relative overflow-hidden">
      {/* Background decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#2F5BFF]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <Reveal direction="down">
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-blue-200 border border-white/20 flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.1}>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Rotanı şansa bırakma.
          </h2>
        </Reveal>

        <Reveal direction="up" delay={0.2}>
          <p className="mt-4 text-sm sm:text-base text-blue-100/90 max-w-xl mx-auto leading-relaxed">
            Hemen ücretsiz kaydol, 5 dakikalık check-up ile sektörün aradığı YBS yetkinliklerine adım adım ulaş.
          </p>
        </Reveal>

        <Reveal direction="up" delay={0.3}>
          <div className="mt-8 flex justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-[#0B1F4D] hover:bg-blue-50 font-extrabold px-9 py-4 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95 text-base group"
            >
              <span>Rotamı Çiz</span>
              <ArrowRight className="w-4 h-4 text-[#2F5BFF] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
