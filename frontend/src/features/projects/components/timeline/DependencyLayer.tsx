'use client';

import { useMemo } from 'react';
import { useTheme } from '@mui/material';

export interface BarGeom {
  /** Left edge as % of track width (== rightPct for point items like milestones). */
  leftPct: number;
  rightPct: number;
  /** Vertical center in px within the lane. */
  cy: number;
}

/** Back-compat alias — task geometry has the same shape. */
export type TaskGeom = BarGeom;

/** Any timeline entity that can depend on its peers (task, phase, milestone). */
export interface DepItem {
  id: string;
  dependsOn: string[];
}

/**
 * SVG overlay drawing finish-to-start dependency arrows between timeline bars.
 * Coordinates come from a pre-built geometry map (percent x + pixel y), scaled
 * to the live track width — no getBoundingClientRect, so it's scroll/zoom-safe.
 * pointer-events:none so arrows never block bar dragging. Generic over tasks,
 * phases and milestones; `markerId` namespaces the arrowhead per instance so
 * multiple layers in one document don't collide on the marker id.
 */
export function DependencyLayer({
  items, geom, trackWidthPx, height, markerId = 'dep-arrow',
}: {
  items: DepItem[];
  geom: Map<string, BarGeom>;
  trackWidthPx: number;
  height: number;
  markerId?: string;
}) {
  const theme = useTheme();
  const color = theme.palette.text.secondary;

  const paths = useMemo(() => {
    if (trackWidthPx <= 0) return [];
    const px = (pct: number) => (pct / 100) * trackWidthPx;
    const out: { id: string; d: string }[] = [];
    for (const item of items) {
      const succ = geom.get(item.id);
      if (!succ) continue;
      for (const predId of item.dependsOn) {
        const pred = geom.get(predId);
        if (!pred) continue;
        const x0 = px(pred.rightPct);
        const y0 = pred.cy;
        const x1 = px(succ.leftPct);
        const y1 = succ.cy;
        const midX = Math.max(x0 + 12, x1 - 12);
        out.push({ id: `${predId}->${item.id}`, d: `M ${x0} ${y0} H ${midX} V ${y1} H ${x1}` });
      }
    }
    return out;
  }, [items, geom, trackWidthPx]);

  if (paths.length === 0) return null;

  return (
    <svg
      width={trackWidthPx}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 3, overflow: 'visible' }}
    >
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={color} />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.7}
          markerEnd={`url(#${markerId})`}
        />
      ))}
    </svg>
  );
}
