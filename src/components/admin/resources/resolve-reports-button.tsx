"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resolveResourceReportsAction } from "@/actions/admin/resources";

interface ResolveReportsButtonProps {
  resourceId: string;
  resourceTitle: string;
}

export function ResolveReportsButton({
  resourceId,
  resourceTitle,
}: ResolveReportsButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleResolve() {
    startTransition(async () => {
      const res = await resolveResourceReportsAction(resourceId);
      if (!res.success) {
        toast.error(res.error || "Bildirim kapatılamadı.");
        return;
      }
      toast.success(`"${resourceTitle}" için açık link bildirimleri çözüldü işaretlendi.`);
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleResolve}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[11px] font-bold text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Check className="w-3 h-3" />
      )}
      <span>Çözüldü</span>
    </button>
  );
}
