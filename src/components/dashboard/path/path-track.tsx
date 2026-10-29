"use client";

import { motion, useReducedMotion } from "motion/react";
import type { PathSegment } from "@/lib/path/path-layout";

interface PathTrackProps {
  sprintNumber: number;
  fullTrackPathD: string;
  segments: PathSegment[];
  totalHeightPx: number;
}

export function PathTrack({
  sprintNumber,
  fullTrackPathD,
  segments,
  totalHeightPx,
}: PathTrackProps) {
  const prefersReducedMotion = useReducedMotion();
  const gradId = `sprintPathGrad-${sprintNumber}`;

  if (!fullTrackPathD) return null;

  return (
    <svg
      viewBox={`0 0 100 ${totalHeightPx}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#2F5BFF" />
        </linearGradient>
      </defs>

      {/* Outer Track Shadow / Base */}
      <path
        d={fullTrackPathD}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth="16"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Inner Subtle Groove */}
      <path
        d={fullTrackPathD}
        fill="none"
        stroke="#F1F5F9"
        strokeWidth="8"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Piece-by-Piece (Segment-based) Filled Paths */}
      {segments.map((seg) =>
        seg.isFilled ? (
          <motion.path
            key={seg.id}
            d={seg.d}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="14"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={
              prefersReducedMotion
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0.5 }
            }
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        ) : null
      )}
    </svg>
  );
}

