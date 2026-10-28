"use client";

import React from "react";

interface SkillItem {
  id: string;
  name_tr: string;
  category: "technical" | "business" | "soft";
  slug: string;
}

interface CareerItem {
  id: string;
  name_tr: string;
  slug: string;
}

interface RequirementItem {
  career_path_id: string;
  skill_id: string;
  required_level: number;
  importance: number;
}

interface MatrixHeatmapProps {
  careerPaths: CareerItem[];
  skills: SkillItem[];
  requirements: RequirementItem[];
  onSelectCareer: (careerId: string) => void;
}

export function MatrixHeatmap({
  careerPaths,
  skills,
  requirements,
  onSelectCareer,
}: MatrixHeatmapProps) {
  // Build lookup map: `${career_path_id}_${skill_id}` => RequirementItem
  const reqMap = new Map<string, RequirementItem>();
  requirements.forEach((r) => {
    reqMap.set(`${r.career_path_id}_${r.skill_id}`, r);
  });

  // Group skills by category
  const categories: { key: "technical" | "business" | "soft"; label: string }[] = [
    { key: "technical", label: "Teknik Beceriler" },
    { key: "business", label: "İşletme & Süreç Becerileri" },
    { key: "soft", label: "Sosyal Beceriler" },
  ];

  const levelStyles: Record<number, { bg: string; text: string }> = {
    1: { bg: "bg-blue-50 hover:bg-blue-100", text: "text-blue-700 font-medium" },
    2: { bg: "bg-blue-100 hover:bg-blue-200", text: "text-blue-800 font-semibold" },
    3: { bg: "bg-blue-200 hover:bg-blue-300", text: "text-blue-900 font-bold" },
    4: { bg: "bg-blue-600 hover:bg-blue-700", text: "text-white font-bold" },
    5: { bg: "bg-[#0B1F4D] hover:bg-slate-900", text: "text-white font-black" },
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold text-[#0B1F4D]">Tüm Rotalar Karşılaştırma Matrisi (Isı Haritası)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sektör beklentilerini yan yana inceleyin. Düzenlemek istediğiniz bir sütunun başlığına veya hücresine tıklayın.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <span>Seviye:</span>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <span
              key={lvl}
              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${levelStyles[lvl].bg} ${levelStyles[lvl].text}`}
            >
              {lvl}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-slate-50 p-3.5 text-slate-500 font-bold uppercase text-[10px] w-64 min-w-[16rem] border-r border-slate-200">
                Beceri / Kariyer Rotası
              </th>
              {careerPaths.map((cp) => (
                <th
                  key={cp.id}
                  onClick={() => onSelectCareer(cp.id)}
                  className="p-3.5 text-center font-bold text-[#0B1F4D] hover:text-blue-600 hover:bg-blue-50/50 cursor-pointer transition-colors border-r border-slate-200 min-w-[8rem]"
                  title={`${cp.name_tr} rotasını düzenlemek için tıklayın`}
                >
                  <div className="line-clamp-1">{cp.name_tr}</div>
                  <div className="text-[10px] font-normal text-slate-400 mt-0.5">Düzenle ↗</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {categories.map((cat) => {
              const catSkills = skills.filter((s) => s.category === cat.key);
              if (catSkills.length === 0) return null;

              return (
                <React.Fragment key={cat.key}>
                  {/* Category Header Row */}
                  <tr className="bg-slate-100/70 border-y border-slate-200">
                    <td
                      colSpan={careerPaths.length + 1}
                      className="px-3.5 py-2 font-black text-[11px] text-[#0B1F4D] uppercase tracking-wider"
                    >
                      {cat.label} ({catSkills.length})
                    </td>
                  </tr>

                  {/* Skill Rows */}
                  {catSkills.map((sk) => (
                    <tr key={sk.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white p-3 font-semibold text-slate-800 border-r border-slate-200 shadow-xs">
                        {sk.name_tr}
                      </td>

                      {careerPaths.map((cp) => {
                        const req = reqMap.get(`${cp.id}_${sk.id}`);
                        const lvl = req?.required_level;

                        return (
                          <td
                            key={cp.id}
                            onClick={() => onSelectCareer(cp.id)}
                            className="p-2 text-center border-r border-slate-100 cursor-pointer transition-colors"
                            title={`${cp.name_tr} — ${sk.name_tr}: ${lvl ? `Seviye ${lvl}` : "Dahil değil"}`}
                          >
                            {lvl ? (
                              <div
                                className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs shadow-xs transition-transform hover:scale-105 ${levelStyles[lvl].bg} ${levelStyles[lvl].text}`}
                              >
                                {lvl}
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
