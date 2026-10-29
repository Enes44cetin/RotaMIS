"use client";

import Link from "next/link";
import { Compass, Briefcase, Flame, Award, LogOut, Shield } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { useDashboard } from "./dashboard-shell";
import { calculateLevelStats } from "@/lib/gamification";

interface DashboardNavbarProps {
  careerName: string;
  currentStreak: number;
  isAdmin?: boolean;
}

export function DashboardNavbar({
  careerName,
  currentStreak,
  isAdmin = false,
}: DashboardNavbarProps) {
  const { totalXp } = useDashboard();
  const levelStats = calculateLevelStats(totalXp);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#0B1F4D] to-[#2F5BFF] flex items-center justify-center text-white shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-[#0B1F4D] tracking-tight leading-none">
              Rota<span className="text-[#2F5BFF]">MIS</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200 text-xs text-slate-500 font-medium truncate">
            <Briefcase className="w-3.5 h-3.5 text-[#2F5BFF] shrink-0" />
            <span className="font-bold text-slate-800 truncate">{careerName}</span>
          </div>
        </div>

        {/* Gamification Stats & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0B1F4D] hover:bg-[#162E6E] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span className="hidden xs:inline sm:inline">Admin Konsolu</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          )}

          {/* Daily Streak */}
          <div
            title="Günlük Öğrenme Serisi"
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold"
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500 shrink-0" />
            <span>
              {currentStreak}
              <span className="hidden sm:inline"> Gün</span>
            </span>
          </div>

          {/* Live Total XP & Level */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-bold transition-all">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2F5BFF] shrink-0" />
            <span className="tabular-nums">{levelStats.totalXp} XP</span>
            <span className="bg-[#2F5BFF] text-white text-[10px] px-1.5 py-0.5 rounded-md ml-0.5">
              Lvl {levelStats.level}
            </span>
          </div>

          {/* Logout */}
          <form action={signOutAction}>
            <button
              type="submit"
              title="Çıkış Yap"
              aria-label="Çıkış Yap"
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

