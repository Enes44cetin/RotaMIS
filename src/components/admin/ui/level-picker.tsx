"use client";

interface LevelPickerProps {
  value: number; // 1 to 5
  onChange: (val: number) => void;
  disabled?: boolean;
}

const levelLabels: Record<number, string> = {
  1: "1 — Temel Bilgi (Teorik)",
  2: "2 — Başlangıç (Basit Görevler)",
  3: "3 — Orta (Bağımsız Uygulama)",
  4: "4 — İleri (Karmaşık Projeler)",
  5: "5 — Uzman (Mimari & Liderlik)",
};

export function LevelPicker({ value, onChange, disabled = false }: LevelPickerProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((lvl) => {
        const isSelected = value >= lvl;
        const isExact = value === lvl;

        return (
          <button
            key={lvl}
            type="button"
            disabled={disabled}
            onClick={() => onChange(lvl)}
            title={levelLabels[lvl]}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              isExact
                ? "bg-[#2F5BFF] text-white shadow-xs shadow-blue-600/30 ring-2 ring-blue-300"
                : isSelected
                ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-95"}`}
          >
            {lvl}
          </button>
        );
      })}
    </div>
  );
}
