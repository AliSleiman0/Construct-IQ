import { Point, CADObj, SnapResult, SnapSettings, Viewport } from './types';

export const SNAP_RADIUS_PX = 14;

export function worldToScreen(p: Point, vp: Viewport): Point {
  return { x: p.x * vp.scale + vp.x, y: -p.y * vp.scale + vp.y };
}

export function screenToWorld(p: Point, vp: Viewport): Point {
  return { x: (p.x - vp.x) / vp.scale, y: -(p.y - vp.y) / vp.scale };
}

export function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function applyOrtho(cursor: Point, anchor: Point): Point {
  const dx = cursor.x - anchor.x;
  const dy = cursor.y - anchor.y;
  return Math.abs(dx) >= Math.abs(dy)
    ? { x: cursor.x, y: anchor.y }
    : { x: anchor.x, y: cursor.y };
}

export function applyPolar(cursor: Point, anchor: Point, deg: number): Point {
  const dx = cursor.x - anchor.x;
  const dy = cursor.y - anchor.y;
  const r = Math.sqrt(dx * dx + dy * dy);
  const a = Math.atan2(dy, dx);
  const inc = (deg * Math.PI) / 180;
  const snapped = Math.round(a / inc) * inc;
  return { x: anchor.x + r * Math.cos(snapped), y: anchor.y + r * Math.sin(snapped) };
}

// ─── Geometry utilities ────────────────────────────────────────────────────

/** Segment × segment intersection (returns null if parallel or outside both segments). */
export function segSegIntersect(a: Point, b: Point, c: Point, d: Point): Point | null {
  const dxAB = b.x - a.x, dyAB = b.y - a.y;
  const dxCD = d.x - c.x, dyCD = d.y - c.y;
  const denom = dxAB * dyCD - dyAB * dxCD;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((c.x - a.x) * dyCD - (c.y - a.y) * dxCD) / denom;
  const u = ((c.x - a.x) * dyAB - (c.y - a.y) * dxAB) / denom;
  if (t < -1e-4 || t > 1 + 1e-4 || u < -1e-4 || u > 1 + 1e-4) return null;
  return { x: a.x + t * dxAB, y: a.y + t * dyAB };
}

/** Infinite line × infinite line intersection. */
export function lineIntersectInfinite(a: Point, b: Point, c: Point, d: Point): Point | null {
  const dxAB = b.x - a.x, dyAB = b.y - a.y;
  const dxCD = d.x - c.x, dyCD = d.y - c.y;
  const denom = dxAB * dyCD - dyAB * dxCD;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((c.x - a.x) * dyCD - (c.y - a.y) * dxCD) / denom;
  return { x: a.x + t * dxAB, y: a.y + t * dyAB };
}

/** Segment × infinite circle intersection points. */
export function lineCircleIntersects(p1: Point, p2: Point, c: Point, r: number): Point[] {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const fx = p1.x - c.x, fy = p1.y - c.y;
  const a = dx * dx + dy * dy;
  if (a < 1e-12) return [];
  const b = 2 * (fx * dx + fy * dy);
  const cc = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return [];
  const sqrtD = Math.sqrt(Math.max(0, disc));
  const pts: Point[] = [];
  for (const s of [-1, 1]) {
    const t = (-b + s * sqrtD) / (2 * a);
    if (t >= -1e-4 && t <= 1 + 1e-4) pts.push({ x: p1.x + t * dx, y: p1.y + t * dy });
  }
  return pts;
}

/** Foot of perpendicular from point p to segment a→b (null if foot is outside segment). */
export function footOfPerp(p: Point, a: Point, b: Point): Point | null {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return null;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  if (t <= 1e-4 || t >= 1 - 1e-4) return null; // exclude endpoints — those are "endpoint" snaps
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/** Nearest point on segment a→b to point p. */
export function nearestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return a;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/** Nearest point on arc (center c, radius r, angles sa→ea) to world point p. */
function nearestOnArc(p: Point, c: Point, r: number, sa: number, ea: number): Point {
  const angle = Math.atan2(p.y - c.y, p.x - c.x);
  const norm = (x: number) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const an = norm(angle), san = norm(sa), ean = norm(ea);
  const inArc = san <= ean ? an >= san && an <= ean : an >= san || an <= ean;
  if (inArc) return { x: c.x + r * Math.cos(angle), y: c.y + r * Math.sin(angle) };
  const ps = { x: c.x + r * Math.cos(sa), y: c.y + r * Math.sin(sa) };
  const pe = { x: c.x + r * Math.cos(ea), y: c.y + r * Math.sin(ea) };
  return dist(p, ps) < dist(p, pe) ? ps : pe;
}

/**
 * Tangent points from external point `from` to circle (center c, radius r).
 * Returns two tangent contact points on the circle, or [] if from is inside.
 */
export function tangentPointsToCircle(from: Point, c: Point, r: number): Point[] {
  const dx = c.x - from.x, dy = c.y - from.y;
  const d2 = dx * dx + dy * dy;
  const d = Math.sqrt(d2);
  if (d <= r + 1e-6) return [];
  const a2 = d2 - r * r;
  const a = Math.sqrt(a2);
  // In local frame (from at origin, c along +x): tangent points are at (a²/d, ±a·r/d)
  const tx = a2 / d, ty = a * r / d;
  const cos_t = dx / d, sin_t = dy / d;
  return [
    { x: from.x + tx * cos_t - ty * sin_t, y: from.y + tx * sin_t + ty * cos_t },
    { x: from.x + tx * cos_t + ty * sin_t, y: from.y + tx * sin_t - ty * cos_t },
  ];
}

// ─── Object geometry helpers ───────────────────────────────────────────────

/** Get all line segments making up an object's outline (for intersection calc). */
function getSegments(obj: CADObj): Array<[Point, Point]> {
  switch (obj.type) {
    case 'line': case 'wall': return [[obj.start, obj.end]];
    case 'polyline': {
      const segs: Array<[Point, Point]> = [];
      for (let i = 0; i < obj.points.length - 1; i++) segs.push([obj.points[i], obj.points[i + 1]]);
      if (obj.closed && obj.points.length > 2) segs.push([obj.points[obj.points.length - 1], obj.points[0]]);
      return segs;
    }
    case 'rect': {
      const { p1, p2 } = obj;
      const c1 = p1, c2 = { x: p2.x, y: p1.y }, c3 = p2, c4 = { x: p1.x, y: p2.y };
      return [[c1, c2], [c2, c3], [c3, c4], [c4, c1]];
    }
    default: return [];
  }
}

function getObjectSnapPoints(obj: CADObj): Array<{ type: SnapResult['type']; point: Point }> {
  const pts: Array<{ type: SnapResult['type']; point: Point }> = [];
  switch (obj.type) {
    case 'line': case 'wall':
      pts.push({ type: 'endpoint', point: obj.start });
      pts.push({ type: 'endpoint', point: obj.end });
      pts.push({ type: 'midpoint', point: midpoint(obj.start, obj.end) });
      break;
    case 'polyline':
      for (let i = 0; i < obj.points.length; i++) {
        pts.push({ type: 'endpoint', point: obj.points[i] });
        if (i < obj.points.length - 1)
          pts.push({ type: 'midpoint', point: midpoint(obj.points[i], obj.points[i + 1]) });
      }
      break;
    case 'circle':
      pts.push({ type: 'center', point: obj.center });
      pts.push({ type: 'quadrant', point: { x: obj.center.x + obj.radius, y: obj.center.y } });
      pts.push({ type: 'quadrant', point: { x: obj.center.x - obj.radius, y: obj.center.y } });
      pts.push({ type: 'quadrant', point: { x: obj.center.x, y: obj.center.y + obj.radius } });
      pts.push({ type: 'quadrant', point: { x: obj.center.x, y: obj.center.y - obj.radius } });
      break;
    case 'arc':
      pts.push({ type: 'center', point: obj.center });
      pts.push({ type: 'endpoint', point: { x: obj.center.x + obj.radius * Math.cos(obj.startAngle), y: obj.center.y + obj.radius * Math.sin(obj.startAngle) } });
      pts.push({ type: 'endpoint', point: { x: obj.center.x + obj.radius * Math.cos(obj.endAngle), y: obj.center.y + obj.radius * Math.sin(obj.endAngle) } });
      break;
    case 'rect': {
      const corners = [obj.p1, { x: obj.p2.x, y: obj.p1.y }, obj.p2, { x: obj.p1.x, y: obj.p2.y }];
      corners.forEach(c => pts.push({ type: 'endpoint', point: c }));
      pts.push({ type: 'midpoint', point: midpoint(obj.p1, obj.p2) });
      break;
    }
    case 'block':
      pts.push({ type: 'endpoint', point: obj.pos });
      break;
  }
  return pts;
}

// ─── Main findSnap ──────────────────────────────────────────────────────────

/**
 * @param anchor  Last placed point — used for Perpendicular and Tangent snaps.
 *                Pass toolPts[toolPts.length-1] when a drawing command is active.
 */
export function findSnap(
  screenCursor: Point,
  objects: CADObj[],
  vp: Viewport,
  settings: SnapSettings,
  gridSnap: boolean,
  gridSize: number,
  anchor?: Point,
): SnapResult {
  let best: SnapResult = { type: 'none', point: screenToWorld(screenCursor, vp) };
  let bestDist = SNAP_RADIUS_PX;

  // 1. Standard snap points: endpoint (always on), midpoint, center, quadrant
  for (const obj of objects) {
    for (const sp of getObjectSnapPoints(obj)) {
      if (sp.type !== 'endpoint' && !settings[sp.type as keyof SnapSettings]) continue;
      const screen = worldToScreen(sp.point, vp);
      const d = dist(screenCursor, screen);
      if (d < bestDist) { bestDist = d; best = { type: sp.type, point: sp.point, objectId: obj.id }; }
    }
  }

  // 2. Intersection snap — line×line, line×circle/arc
  if (settings.intersection) {
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const oi = objects[i], oj = objects[j];
        const segsI = getSegments(oi), segsJ = getSegments(oj);

        // seg × seg
        for (const si of segsI) for (const sj of segsJ) {
          const p = segSegIntersect(si[0], si[1], sj[0], sj[1]);
          if (p) {
            const d = dist(screenCursor, worldToScreen(p, vp));
            if (d < bestDist) { bestDist = d; best = { type: 'intersection', point: p }; }
          }
        }

        // seg × circle / arc
        const checkCircle = (segs: Array<[Point, Point]>, co: { center: Point; radius: number }) => {
          for (const seg of segs) {
            for (const p of lineCircleIntersects(seg[0], seg[1], co.center, co.radius)) {
              const d = dist(screenCursor, worldToScreen(p, vp));
              if (d < bestDist) { bestDist = d; best = { type: 'intersection', point: p }; }
            }
          }
        };
        if (oj.type === 'circle') { checkCircle(segsI, oj); }
        if (oi.type === 'circle') { checkCircle(segsJ, oi); }
        if (oj.type === 'arc')    { checkCircle(segsI, oj); }
        if (oi.type === 'arc')    { checkCircle(segsJ, oi); }
      }
    }
  }

  // 3. Perpendicular snap — foot of perp from anchor to each segment (requires anchor)
  if (settings.perpendicular && anchor) {
    for (const obj of objects) {
      for (const [a, b] of getSegments(obj)) {
        const p = footOfPerp(anchor, a, b);
        if (p) {
          const d = dist(screenCursor, worldToScreen(p, vp));
          if (d < bestDist) { bestDist = d; best = { type: 'perpendicular', point: p, objectId: obj.id }; }
        }
      }
    }
  }

  // 4. Tangent snap — contact points from anchor to circles (requires anchor)
  if (settings.tangent && anchor) {
    for (const obj of objects) {
      if (obj.type === 'circle') {
        for (const tp of tangentPointsToCircle(anchor, obj.center, obj.radius)) {
          const d = dist(screenCursor, worldToScreen(tp, vp));
          if (d < bestDist) { bestDist = d; best = { type: 'tangent', point: tp, objectId: obj.id }; }
        }
      }
    }
  }

  // 5. Nearest snap — closest point on any geometry to the cursor world position
  if (settings.nearest) {
    const cursorWorld = screenToWorld(screenCursor, vp);
    for (const obj of objects) {
      let nearest: Point | null = null;
      switch (obj.type) {
        case 'line': case 'wall':
          nearest = nearestOnSegment(cursorWorld, obj.start, obj.end); break;
        case 'circle': {
          const angle = Math.atan2(cursorWorld.y - obj.center.y, cursorWorld.x - obj.center.x);
          nearest = { x: obj.center.x + obj.radius * Math.cos(angle), y: obj.center.y + obj.radius * Math.sin(angle) };
          break;
        }
        case 'arc':
          nearest = nearestOnArc(cursorWorld, obj.center, obj.radius, obj.startAngle, obj.endAngle); break;
        case 'polyline': {
          let nd = Infinity, np: Point | null = null;
          for (let i = 0; i < obj.points.length - 1; i++) {
            const n = nearestOnSegment(cursorWorld, obj.points[i], obj.points[i + 1]);
            const d2 = dist(cursorWorld, n);
            if (d2 < nd) { nd = d2; np = n; }
          }
          nearest = np; break;
        }
        default: break;
      }
      if (nearest) {
        const d = dist(screenCursor, worldToScreen(nearest, vp));
        if (d < bestDist) { bestDist = d; best = { type: 'nearest', point: nearest, objectId: obj.id }; }
      }
    }
  }

  if (best.type !== 'none') return best;

  // 6. Grid snap (lowest priority — only fires when no geometry snap hit)
  if (gridSnap) {
    const world = screenToWorld(screenCursor, vp);
    const gx = Math.round(world.x / gridSize) * gridSize;
    const gy = Math.round(world.y / gridSize) * gridSize;
    const snap = { x: gx, y: gy };
    if (dist(screenCursor, worldToScreen(snap, vp)) < SNAP_RADIUS_PX)
      return { type: 'grid', point: snap };
  }

  return best;
}
