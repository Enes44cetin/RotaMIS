"use client";

import { useState } from "react";
import Link from "next/link";
import { LANDING_ROLES } from "@/lib/landing/content";
import { TypewriterRole } from "./typewriter-role";
import { RoleChips } from "./role-chips";
import { HeroRadarCard } from "./hero-radar-card";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

export function HeroSection() {
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeRole = LANDING_ROLES[currentRoleIndex];

  function handleSelectChip(idx: number) {
    setCurrentRoleIndex(idx);
    setIsPaused(true);
    // Resume auto-typing after 8 seconds of manual interaction
    setTimeout(() => {
      setIsPaused(false);
    }, 8000);
  }

  return (
    <section className="relative overflow-hidden pt-6 pb-16 md:pt-14 md:pb-24">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-gradient-to-tr from-[#2F5BFF]/12 via-indigo-400/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <Reveal direction="up" delay={0.1}>
              {/* Dynamic Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-[#0B1F4D] tracking-tight leading-[1.18]">
                Okulda öğrendiklerin{" "}
                <span className="relative inline-block text-[#2F5BFF]">
                  sektörde
                  {/* Subtle vector underline */}
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-2.5 text-[#2F5BFF]/40"
                    viewBox="0 0 120 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 7C38 2.5 82 2.5 117 7"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                ne kadar geçerli?
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              {/* Typewriter Subheadline */}
              <div className="text-lg sm:text-2xl text-slate-700 font-semibold min-h-[3rem] flex items-center justify-center lg:justify-start flex-wrap gap-x-2">
                <span>Geleceğin</span>
                <TypewriterRole
                  currentRoleIndex={currentRoleIndex}
                  onRoleChange={setCurrentRoleIndex}
                  isPaused={isPaused}
                />
                <span>ol.</span>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.25}>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                5 dakikalık check-up ile teknik ve süreç becerilerini puanla. Radar analiziyle sektör arasındaki farkı gör ve AI görevleriyle kariyer rotanı çiz.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.3}>
              {/* Interactive Role Selector Chips */}
              <div className="flex justify-center lg:justify-start">
                <RoleChips
                  currentIndex={currentRoleIndex}
                  onSelect={handleSelectChip}
                />
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.35}>
              {/* CTA Group */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2F5BFF] hover:bg-[#1944E6] text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 transition-all text-base active:scale-98 group"
                >
                  <span>Rotamı Çiz</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a
                  href="#nasil-calisir"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold px-6 py-4 rounded-xl border border-slate-200 shadow-xs transition-all text-sm"
                >
                  Nasıl Çalışır?
                </a>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.4}>
              {/* Micro Trust Checklist */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tamamen Ücretsiz</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>5 Dakika Check-Up</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Interactive Radar Card */}
          <div className="lg:col-span-6 max-w-lg mx-auto w-full">
            <Reveal direction="up" delay={0.3}>
              <HeroRadarCard activeRole={activeRole} />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
