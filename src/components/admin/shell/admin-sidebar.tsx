"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  SlidersHorizontal,
  Briefcase,
  Sparkles,
  GraduationCap,
  BookOpenCheck,
  History,
  Users,
  Compass,
  ArrowLeft,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navSections = [
  {
    title: "YÖNETİM",
    items: [
      {
        href: "/admin",
        label: "Genel Bakış",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/admin/matrix",
        label: "Sektör Matrisi",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    title: "KATALOG",
    items: [
      {
        href: "/admin/career-paths",
        label: "Kariyer Rotaları",
        icon: Briefcase,
      },
      {
        href: "/admin/skills",
        label: "Beceri Havuzu",
        icon: Sparkles,
      },
      {
        href: "/admin/universities",
        label: "Üniversiteler",
        icon: GraduationCap,
      },
      {
        href: "/admin/resources",
        label: "Eğitim & Sertifika",
        icon: BookOpenCheck,
      },
    ],
  },
  {
    title: "SİSTEM",
    items: [
      {
        href: "/admin/users",
        label: "Öğrenciler",
        icon: Users,
      },
      {
        href: "/admin/audit",
        label: "Değişiklik Geçmişi",
        icon: History,
      },
    ],
  },
];

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B1F4D] text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } border-r border-slate-800/80 shadow-2xl lg:shadow-none`}
      >
        {/* Brand header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-[#2F5BFF] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-white tracking-tight leading-none">
                Rota<span className="text-[#2F5BFF]">MIS</span>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-400 mt-0.5">
                Admin Konsolu
              </div>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-[#2F5BFF] text-white shadow-md shadow-blue-600/30"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer: Return to student dashboard */}
        <div className="p-3 border-t border-slate-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#2F5BFF]" />
            <span>Öğrenci Paneline Dön</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
