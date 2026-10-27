"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, ArrowRight, User } from "lucide-react";

interface LandingNavbarProps {
  isLoggedIn?: boolean;
}

export function LandingNavbar({ isLoggedIn = false }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-md shadow-xs border-b border-slate-200/80 py-2.5"
          : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-[#0B1F4D] via-[#162E6E] to-[#2F5BFF] flex items-center justify-center text-white shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
            <Compass className="w-7 h-7 animate-pulse" />
          </div>
          <span className="text-2xl sm:text-[1.85rem] font-black text-[#0B1F4D] tracking-tight leading-none">
            Rota<span className="text-[#2F5BFF]">MIS</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a
            href="#nasil-calisir"
            className="hover:text-[#2F5BFF] transition-colors"
          >
            Nasıl Çalışır?
          </a>
          <a
            href="#deneyimler"
            className="hover:text-[#2F5BFF] transition-colors"
          >
            Öğrenci Yorumları
          </a>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-[#0B1F4D] hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <User className="w-4 h-4 text-[#2F5BFF]" />
              <span>Panelime Git</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-bold text-slate-700 hover:text-[#2F5BFF] px-3 py-2 transition-colors"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-sm font-bold bg-[#2F5BFF] hover:bg-[#1944E6] text-white px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95 group"
              >
                <span>Rotamı Çiz</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
