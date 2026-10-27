"use client";

import { useState } from "react";
import { Copy, AlertCircle, X } from "lucide-react";
import { copyMatrixAction } from "@/actions/admin/matrix";
import { toast } from "sonner";

interface CopyMatrixDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetCareerPath: { id: string; name_tr: string };
  allCareerPaths: { id: string; name_tr: string }[];
  onSuccess: () => void;
}

export function CopyMatrixDialog({
  isOpen,
  onClose,
  targetCareerPath,
  allCareerPaths,
  onSuccess,
}: CopyMatrixDialogProps) {
  const [sourceId, setSourceId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const availableSources = allCareerPaths.filter((p) => p.id !== targetCareerPath.id);

  const handleCopy = async () => {
    if (!sourceId) {
      toast.error("Lütfen bir kaynak kariyer rotası seçin.");
      return;
    }

    setIsLoading(true);
    const res = await copyMatrixAction(sourceId, targetCareerPath.id);
    setIsLoading(false);

    if (res.success) {
      toast.success(`${res.count} beceri beklentisi başarıyla kopyalandı!`);
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || "Kopyalama başarısız oldu.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0B1F4D]">Başka Rotadan Kopyala</h3>
                <p className="text-[11px] text-slate-500">
                  Hedef: <strong className="text-slate-800">{targetCareerPath.name_tr}</strong>
                </p>
              </div>
            </div>

            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-4 space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Bu işlem, <strong>{targetCareerPath.name_tr}</strong> için tanımlanmış mevcut tüm beceri beklentilerinin üzerine yazacaktır.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kaynak Kariyer Rotası
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">Bir rota seçin...</option>
                {availableSources.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_tr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={isLoading || !sourceId}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2F5BFF] hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Kopyalanıyor..." : "Kopyala ve Uygula"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
