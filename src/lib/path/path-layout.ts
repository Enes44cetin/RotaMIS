import type { TaskRow } from "@/types/database";

/**
 * Duolingo tarzı yılan (zigzag) patika için deterministik X yüzdeleri (0..100).
 * %32 ile %68 arasında kalarak en dar mobil ekranlarda (320px) bile
 * düğüm + alt başlık taşmasını %100 engeller.
 */
const WAVE_X_PCT = [50, 65, 68, 54, 35, 32, 46];

const FIRST_NODE_Y = 96;
const STANDARD_ROW_GAP = 212;
const END_NODE_GAP = 236;
const BOTTOM_PADDING = 168;

export interface PathNodeCoord {
  taskId: string;
  index: number;
  xPct: number;
  yPx: number;
}

export interface PathSegment {
  id: string;
  fromTaskId: string;
  d: string;
  isFilled: boolean;
}

export interface SprintPathGeometry {
  nodes: PathNodeCoord[];
  endNode: {
    xPct: number;
    yPx: number;
  };
  segments: PathSegment[];
  fullTrackPathD: string;
  totalHeightPx: number;
}

function cubicSegmentD(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

export function computeSprintPathGeometry(tasks: TaskRow[]): SprintPathGeometry {
  const nodes: PathNodeCoord[] = [];
  let currentY = FIRST_NODE_Y;

  tasks.forEach((task, idx) => {
    if (idx > 0) {
      currentY += STANDARD_ROW_GAP;
    }

    const xPct = WAVE_X_PCT[idx % WAVE_X_PCT.length];

    nodes.push({
      taskId: task.id,
      index: idx,
      xPct,
      yPx: currentY,
    });
  });

  const endNodeY = (nodes.length > 0 ? currentY : FIRST_NODE_Y) + END_NODE_GAP;
  const endNode = {
    xPct: 50,
    yPx: endNodeY,
  };

  // Parça parça (segment-bazlı) renklenen kübik Bezier yol parçaları
  const segments: PathSegment[] = [];
  const allPoints: Array<{ x: number; y: number }> = [
    ...nodes.map((n) => ({ x: n.xPct, y: n.yPx })),
    { x: endNode.xPct, y: endNode.yPx },
  ];

  for (let i = 0; i < nodes.length; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];
    const sourceTask = tasks[i];
    segments.push({
      id: `seg-${sourceTask.id}`,
      fromTaskId: sourceTask.id,
      d: cubicSegmentD(p1.x, p1.y, p2.x, p2.y),
      isFilled:
        sourceTask.status === "completed" || sourceTask.status === "skipped",
    });
  }

  let fullTrackPathD = "";
  if (allPoints.length >= 2) {
    fullTrackPathD = `M ${allPoints[0].x} ${allPoints[0].y}`;
    for (let i = 0; i < allPoints.length - 1; i++) {
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];
      const midY = (p1.y + p2.y) / 2;
      fullTrackPathD += ` C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    }
  }

  return {
    nodes,
    endNode,
    segments,
    fullTrackPathD,
    totalHeightPx: endNodeY + BOTTOM_PADDING,
  };
}
