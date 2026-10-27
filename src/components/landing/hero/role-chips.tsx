"use client";

import { LANDING_ROLES } from "@/lib/landing/content";
import { Check } from "lucide-react";

interface RoleChipsProps {
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function RoleChips({ currentIndex, onSelect }: RoleChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
        Hedef Rol:
      </span>
      {LANDING_ROLES.map((role, idx) => {
        const isSelected = currentIndex === idx;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelect(idx)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isSelected
                ? "bg-[#2F5BFF] text-white border-[#2F5BFF] shadow-sm shadow-blue-500/30 scale-102"
                : "bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5" />}
            <span>{role.name}</span>
          </button>
        );
      })}
    </div>
  );
}
