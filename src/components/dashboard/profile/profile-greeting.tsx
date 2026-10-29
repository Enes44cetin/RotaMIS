import Link from "next/link";
import { GraduationCap, Briefcase, ArrowLeftRight } from "lucide-react";

interface ProfileGreetingProps {
  fullName: string | null;
  universityName: string;
  careerName: string;
}

export function ProfileGreeting({
  fullName,
  universityName,
  careerName,
}: ProfileGreetingProps) {
  const firstName = fullName?.trim().split(/\s+/)[0] || "Öğrenci";
  const initials = (fullName || "Ö")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="relative shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1F4D] via-[#102A6B] to-[#1E40AF] p-5 text-white shadow-md shadow-blue-950/10">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#2F5BFF]/25 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-xs flex items-center justify-center text-base font-black tracking-tight shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-blue-200/90 uppercase tracking-wider">
            Kariyer Profili
          </p>
          <h1 className="text-lg font-extrabold tracking-tight truncate">
            Selam, {firstName}! 👋
          </h1>
        </div>
      </div>

      <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2 text-blue-100/90">
          <div className="flex items-center gap-2 min-w-0">
            <Briefcase className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-bold text-white truncate">{careerName}</span>
          </div>
          <Link
            href="/onboarding"
            title="Kariyer hedefini değiştir"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-semibold text-blue-100 transition-colors shrink-0"
          >
            <ArrowLeftRight className="w-2.5 h-2.5" />
            <span>Hedef Değiştir</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 text-blue-200/80">
          <GraduationCap className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          <span className="truncate">{universityName}</span>
        </div>
      </div>
    </div>
  );
}

