"use client";

import { DataTable, type Column } from "@/components/admin/ui/data-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Award, Flame, GraduationCap, Briefcase } from "lucide-react";

export interface StudentItem {
  id: string;
  email: string;
  full_name: string | null;
  university_name: string;
  target_career_name: string;
  total_xp: number;
  current_streak: number;
  onboarding_completed: boolean;
  created_at: string;
}

interface StudentsTableProps {
  students: StudentItem[];
}

export function StudentsTable({ students }: StudentsTableProps) {
  const columns: Column<StudentItem>[] = [
    {
      key: "email",
      header: "Öğrenci",
      render: (item) => (
        <div>
          <div className="font-bold text-slate-800 text-xs">
            {item.full_name || item.email.split("@")[0]}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">{item.email}</div>
        </div>
      ),
    },
    {
      key: "university_name",
      header: "Üniversite",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="line-clamp-1">{item.university_name}</span>
        </div>
      ),
    },
    {
      key: "target_career_name",
      header: "Hedef Kariyer",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="line-clamp-1 font-semibold">{item.target_career_name}</span>
        </div>
      ),
    },
    {
      key: "total_xp",
      header: "XP & Seri",
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
            <Award className="w-3 h-3 text-blue-600" />
            <span>{item.total_xp} XP</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>{item.current_streak}g</span>
          </span>
        </div>
      ),
    },
    {
      key: "onboarding_completed",
      header: "Check-Up",
      align: "center",
      render: (item) => (
        <StatusBadge
          status={item.onboarding_completed}
          activeLabel="Tamamlandı"
          inactiveLabel="Bekliyor"
        />
      ),
    },
    {
      key: "created_at",
      header: "Kayıt Tarihi",
      align: "right",
      render: (item) => <span className="text-slate-500 text-xs">{item.created_at}</span>,
    },
  ];

  return (
    <DataTable
      data={students}
      columns={columns}
      rowKey={(item) => item.id}
      searchKey={(s) => `${s.email} ${s.full_name || ""} ${s.university_name} ${s.target_career_name}`}
      searchPlaceholder="Öğrenci adı, e-posta, üniversite veya kariyer ara..."
    />
  );
}
