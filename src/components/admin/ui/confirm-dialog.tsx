"use client";

import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  variant = "warning",
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const colors = {
    danger: {
      iconBg: "bg-red-50 text-red-600 border-red-200",
      btn: "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20",
    },
    warning: {
      iconBg: "bg-amber-50 text-amber-600 border-amber-200",
      btn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
    },
  };

  const current = colors[variant];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md p-6 border border-slate-200">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${current.iconBg}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <h3 className="text-base font-bold text-[#0B1F4D]">{title}</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{message}</p>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${current.btn}`}
            >
              {isLoading ? "İşleniyor..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
