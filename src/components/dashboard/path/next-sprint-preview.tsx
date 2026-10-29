import { Lock, Swords, Compass } from "lucide-react";
import { isCheckpointSprintNumber, getCycleNumber } from "@/lib/path/cycle";

interface NextSprintPreviewProps {
  nextSprintNumber: number;
}

export function NextSprintPreview({
  nextSprintNumber,
}: NextSprintPreviewProps) {
  const isBossNext = isCheckpointSprintNumber(nextSprintNumber);
  const nextCycle = getCycleNumber(nextSprintNumber);

  return (
    <div className="relative pt-2">
      {/* Vertical Dotted Connector */}
      <div className="mx-auto w-1 h-8 border-l-4 border-dashed border-slate-300/80 mb-2" />

      <div className="rounded-3xl border border-dashed border-slate-300/90 bg-slate-100/65 p-5 sm:p-6 text-slate-500 select-none">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                isBossNext
                  ? "bg-amber-100/70 border-amber-200 text-amber-700"
                  : "bg-white border-slate-200 text-slate-400"
              }`}
            >
              {isBossNext ? (
                <Swords className="w-6 h-6" />
              ) : (
                <Compass className="w-6 h-6" />
              )}
            </div>

            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {nextCycle}. Döngü • Sıradaki Durak
              </div>
              <div className="text-base sm:text-lg font-black text-slate-600 truncate">
                Sprint {nextSprintNumber}:{" "}
                {isBossNext
                  ? "Döngü Finali & Boss Check-Up"
                  : "Yeni Beceri Görevleri"}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBossNext
                  ? "4 sprintte bir yapılan hızlı Mini Check-Up durağı bu sprintin sonunda açılacak."
                  : "Mevcut sprintini bitirdiğinde en güncel beceri açıklarına göre otomatik oluşturulur."}
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/90 text-xs font-bold text-slate-400 shrink-0">
            <Lock className="w-3.5 h-3.5" />
            <span>Sırada</span>
          </span>
        </div>
      </div>
    </div>
  );
}

