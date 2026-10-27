"use client";

import { RoleData } from "@/lib/landing/content";
import { HeroRadarChart } from "./hero-radar-chart";
import { Sparkles, Target, TrendingUp, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeroRadarCardProps {
  activeRole: RoleData;
}

export function HeroRadarCard({ activeRole }: HeroRadarCardProps) {
  return (
    <div className="relative rounded-3xl p-3 bg-gradient-to-b from-blue-100/80 via-white to-blue-50/50 shadow-2xl shadow-[#0B1F4D]/12 border border-white">
      {/* Decorative background glow */}
      <div className="absolute -top-6 -right-6 w-48 h-48 bg-[#2F5BFF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/80 overflow-hidden">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2F5BFF] flex items-center justify-center font-bold text-sm border border-blue-100">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#0B1F4D]">
                  Canlı Radar Kıyaslaması
                </span>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  Örnek Profil · 3. Sınıf
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Hedeflenen Rol: <strong className="text-[#2F5BFF]">{activeRole.name}</strong>
              </p>
            </div>
          </div>

          {/* Dynamic Readiness Pill with Animated Number */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2F5BFF]" />
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Hazırlık Oranı
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeRole.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.25 }}
                  className="text-base font-black text-[#2F5BFF]"
                >
                  %{activeRole.readinessPct}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* The Recharts Radar Chart */}
        <div className="py-2">
          <HeroRadarChart activeRole={activeRole} />
        </div>

        {/* Bottom Insight Footer */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              En büyük gelişim alanı:{" "}
              <AnimatePresence mode="wait">
                <motion.strong
                  key={activeRole.biggestGap}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.2 }}
                  className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md inline-block ml-1"
                >
                  {activeRole.biggestGap}
                </motion.strong>
              </AnimatePresence>
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            20 Sektör Becerisi Ölçülüyor
          </div>
        </div>
      </div>
    </div>
  );
}
