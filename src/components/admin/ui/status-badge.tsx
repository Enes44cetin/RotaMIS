interface StatusBadgeProps {
  status: "active" | "archived" | "draft" | "published" | "ok" | "broken" | "unknown" | boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function StatusBadge({
  status,
  activeLabel = "Aktif",
  inactiveLabel = "Arşiv",
}: StatusBadgeProps) {
  if (typeof status === "boolean") {
    return status ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>{activeLabel}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>{inactiveLabel}</span>
      </span>
    );
  }

  const styles: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
    active: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      label: activeLabel,
    },
    published: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      label: "Yayında",
    },
    archived: {
      bg: "bg-slate-100",
      text: "text-slate-600",
      border: "border-slate-200",
      dot: "bg-slate-400",
      label: inactiveLabel,
    },
    draft: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
      label: "Taslak",
    },
    ok: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      label: "Çalışıyor",
    },
    broken: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      dot: "bg-rose-500",
      label: "Kırık Link",
    },
    unknown: {
      bg: "bg-slate-100",
      text: "text-slate-500",
      border: "border-slate-200",
      dot: "bg-slate-400",
      label: "Kontrol Edilmedi",
    },
  };

  const current = styles[status] || styles.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${current.bg} ${current.text} border ${current.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
}
