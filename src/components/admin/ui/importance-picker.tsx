"use client";

interface ImportancePickerProps {
  value: number; // 1, 2, 3
  onChange: (val: number) => void;
  disabled?: boolean;
}

const importanceOptions = [
  { val: 1, label: "İyi Olur", color: "text-slate-600 bg-slate-100 hover:bg-slate-200", active: "bg-slate-700 text-white" },
  { val: 2, label: "Önemli", color: "text-blue-700 bg-blue-50 hover:bg-blue-100", active: "bg-blue-600 text-white" },
  { val: 3, label: "Kritik", color: "text-red-700 bg-red-50 hover:bg-red-100", active: "bg-red-600 text-white" },
];

export function ImportancePicker({
  value,
  onChange,
  disabled = false,
}: ImportancePickerProps) {
  return (
    <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
      {importanceOptions.map((opt) => {
        const isSelected = value === opt.val;
        return (
          <button
            key={opt.val}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.val)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              isSelected ? opt.active + " shadow-xs" : "text-slate-600 hover:text-slate-900"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-95"}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
