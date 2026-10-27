"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, ShieldCheck, ExternalLink } from "lucide-react";

interface AdminTopbarProps {
  adminEmail: string;
  adminName?: string | null;
  onOpenSidebar: () => void;
}

const breadcrumbMap: Record<string, string> = {
  "/admin": "Genel Bakış",
  "/admin/matrix": "Sektör Beklenti Matrisi",
  "/admin/career-paths": "Kariyer Rotaları",
  "/admin/skills": "Beceri Havuzu",
  "/admin/universities": "Üniversiteler",
  "/admin/resources": "Eğitim & Sertifika Kataloğu",
  "/admin/users": "Öğrenci Yönetimi",
  "/admin/audit": "Denetim & Değişiklik Geçmişi",
};

export function AdminTopbar({ adminEmail, adminName, onOpenSidebar }: AdminTopbarProps) {
  const pathname = usePathname();
  const currentTitle = breadcrumbMap[pathname] || "Admin Konsolu";

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          title="Menüyü Aç"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-400">Yönetim</span>
          <span className="text-slate-300">/</span>
          <h1 className="font-bold text-[#0B1F4D] text-base">{currentTitle}</h1>
        </div>
      </div>

      {/* Right: Quick actions & Admin badge */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <span>Açılış Sayfası</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        {/* Admin profile pill */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2F5BFF]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              {adminName || adminEmail.split("@")[0]}
            </div>
            <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
              Yönetici
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
