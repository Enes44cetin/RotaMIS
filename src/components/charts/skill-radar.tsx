"use client";

import { useEffect, useRef, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
  compact?: boolean;
}

interface PolarTickProps {
  x?: number | string;
  y?: number | string;
  textAnchor?: "start" | "middle" | "end" | "inherit";
  payload?: {
    value?: string | number;
  };
}

function wrapSkillLabel(rawLabel: string, maxCharsPerLine: number): string[] {
  const clean = rawLabel.trim();
  if (clean.length <= maxCharsPerLine) return [clean];

  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  if (lines.length <= 2) {
    return lines.map((line) =>
      line.length > maxCharsPerLine + 2
        ? `${line.slice(0, maxCharsPerLine)}…`
        : line
    );
  }

  const first = lines[0];
  const rest = lines.slice(1).join(" ");
  const second =
    rest.length > maxCharsPerLine
      ? `${rest.slice(0, maxCharsPerLine - 1)}…`
      : rest;
  return [first, second];
}

export function SkillRadar({ data, compact = false }: SkillRadarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const nextWidth = Math.floor(rect.width);
      const nextHeight = Math.floor(rect.height);
      setDimensions((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
      );
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="h-60 flex items-center justify-center text-slate-400 text-xs">
        Grafik oluşturulacak beceri verisi bulunamadı.
      </div>
    );
  }

  // Format data for Recharts (limit to top skills if too many for clean display)
  const chartData = data.slice(0, compact ? 8 : 10).map((d) => ({
    skill: d.name_tr,
    "Senin Seviyen": d.current_level,
    "Sektör Beklentisi": d.required_level,
  }));

  const maxLineChars = compact ? 13 : 18;
  const fontSize = compact ? 10 : 11;

  const renderPolarTick = (props: PolarTickProps) => {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const rawValue = String(props.payload?.value ?? "");
    const lines = wrapSkillLabel(rawValue, maxLineChars);
    const anchor = props.textAnchor || "middle";
    const startDy = lines.length > 1 ? -4 : 3;

    return (
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fill="#334155"
        fontSize={fontSize}
        fontWeight={600}
      >
        {lines.map((line, index) => (
          <tspan
            key={`${rawValue}-${index}`}
            x={x}
            dy={index === 0 ? startDy : fontSize + 2}
          >
            {line}
          </tspan>
        ))}
      </text>
    );
  };

  return (
    <div
      ref={containerRef}
      className={compact ? "w-full h-64 overflow-hidden" : "w-full h-80 sm:h-96 overflow-hidden"}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <RadarChart
          width={dimensions.width}
          height={dimensions.height}
          cx="50%"
          cy="48%"
          outerRadius={compact ? "52%" : "68%"}
          margin={
            compact
              ? { top: 10, right: 24, bottom: 6, left: 24 }
              : { top: 12, right: 32, bottom: 8, left: 32 }
          }
          data={chartData}
        >
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis dataKey="skill" tick={renderPolarTick} />
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
              paddingTop: "8px",
              fontSize: compact ? "11px" : "12px",
              fontWeight: 600,
            }}
          />
        </RadarChart>
      )}
    </div>
  );
}
