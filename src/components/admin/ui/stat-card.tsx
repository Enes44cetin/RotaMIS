import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: string;
  variant?: "default" | "primary" | "warning" | "success";
}

export function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  variant = "default",
}: StatCardProps) {
  const iconColors = {
    default: "bg-slate-100 text-slate-700",
    primary: "bg-blue-50 text-[#2F5BFF] border border-blue-200/60",
    warning: "bg-amber-50 text-amber-600 border border-amber-200/60",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-200/60",
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </div>
          <div className="text-2xl font-black text-[#0B1F4D] tracking-tight mt-1.5">
            {value}
          </div>
        </div>

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColors[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtext || badge) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{subtext}</span>
          {badge && (
            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
