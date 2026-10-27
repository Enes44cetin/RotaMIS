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
import { RoleData, SKILL_AXES, STUDENT_SAMPLE_LEVELS } from "@/lib/landing/content";

interface HeroRadarChartProps {
  activeRole: RoleData;
}

export function HeroRadarChart({ activeRole }: HeroRadarChartProps) {
  const chartData = SKILL_AXES.map((axis) => ({
    skill: axis,
    "Senin Seviyen": STUDENT_SAMPLE_LEVELS[axis] || 2,
    "Sektör Beklentisi": activeRole.marketLevels[axis] || 3,
  }));

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "#334155", fontSize: 11, fontWeight: 700 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 5]}
            tickCount={6}
            tick={{ fill: "#94A3B8", fontSize: 9 }}
          />
          <Radar
            name="Senin Seviyen (3. Sınıf)"
            dataKey="Senin Seviyen"
            stroke="#2F5BFF"
            fill="#2F5BFF"
            fillOpacity={0.28}
            strokeWidth={2.5}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Radar
            name={`Sektör Beklentisi (${activeRole.name})`}
            dataKey="Sektör Beklentisi"
            stroke="#F59E0B"
            fill="#F59E0B"
            fillOpacity={0.08}
            strokeWidth={2}
            strokeDasharray="4 4"
            animationDuration={600}
            animationEasing="ease-in-out"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderRadius: "14px",
              boxShadow: "0 10px 25px -5px rgba(11, 31, 77, 0.12)",
              border: "1px solid #E2E8F0",
              fontSize: "12px",
              fontWeight: 600,
            }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: "8px",
              fontSize: "11px",
              fontWeight: 700,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
