"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface SkillGapItem {
  name_tr: string;
  current_level: number;
  required_level: number;
  gap: number;
  category: string;
}

interface SkillRadarProps {
  data: SkillGapItem[];
}

export function SkillRadar({ data }: SkillRadarProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
        Grafik oluşturulacak beceri verisi bulunamadı.
      </div>
    );
  }

  // Format data for Recharts (limit to top skills if too many for clean display)
  const chartData = data.slice(0, 10).map((d) => ({
    skill: d.name_tr,
    "Senin Seviyen": d.current_level,
    "Sektör Beklentisi": d.required_level,
  }));

  return (
    <div className="w-full h-80 sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 5]}
            tickCount={6}
            tick={{ fill: "#94A3B8", fontSize: 10 }}
          />
          <Radar
            name="Senin Seviyen"
            dataKey="Senin Seviyen"
            stroke="#2563EB"
            fill="#2563EB"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Radar
            name="Sektör Beklentisi"
            dataKey="Sektör Beklentisi"
            stroke="#F59E0B"
            fill="#F59E0B"
            fillOpacity={0.05}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid #E2E8F0",
              fontSize: "12px",
              fontWeight: 600,
            }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: "12px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
