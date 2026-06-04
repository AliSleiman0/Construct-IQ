'use client';

import React, {
  useRef, useEffect, useState, useCallback, useReducer,
} from 'react';
import {
  Point, Viewport, CADObj, Layer, ToolType,
  LineObj, PolylineObj, CircleObj, ArcObj, RectObj, WallObj,
  TextObj, MTextObj, DimObj, BlockObj, SnapSettings, DrawingState,
} from './types';
import {
  worldToScreen, screenToWorld, dist, midpoint,
  applyOrtho, applyPolar, findSnap, SNAP_RADIUS_PX,
  lineCircleIntersects,
} from './snapEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BG = '#1e1e1e';
const GRID_MINOR = '#282828';
const GRID_MAJOR = '#333333';
const CROSSHAIR_COLOR = 'rgba(255,255,255,0.25)';
const SNAP_COLORS: Record<string, string> = {
  endpoint: '#ffff00', midpoint: '#ff8c00', center: '#00bfff',
  intersection: '#00ff7f', perpendicular: '#ff69b4', tangent: '#ffa500',
  nearest: '#9370db', quadrant: '#40e0d0', grid: '#555',
};

const DEFAULT_LAYERS: Layer[] = [
  { id: '0', name: '0', color: '#ffffff', visible: true, frozen: false, locked: false, lineType: 'continuous', lineWeight: 0.25 },
  { id: 'walls', name: 'Walls', color: '#ffffff', visible: true, frozen: false, locked: false, lineType: 'continuous', lineWeight: 0.5 },
  { id: 'doors', name: 'Doors', color: '#00d4ff', visible: true, frozen: false, locked: false, lineType: 'continuous', lineWeight: 0.25 },
  { id: 'windows', name: 'Windows', color: '#00ff88', visible: true, frozen: false, locked: false, lineType: 'continuous', lineWeight: 0.25 },
  { id: 'dims', name: 'Dimensions', color: '#ffff00', visible: true, frozen: false, locked: false, lineType: 'continuous', lineWeight: 0.18 },
  { id: 'text', name: 'Text', color: '#ffff00', visible: true, frozen: false, locked: false, lineType: 'continuous', lineWeight: 0.18 },
  { id: 'furniture', name: 'Furniture', color: '#aaaaaa', visible: true, frozen: false, locked: false, lineType: 'dashed', lineWeight: 0.18 },
  { id: 'structure', name: 'Structure', color: '#ff4444', visible: true, frozen: false, locked: false, lineType: 'continuous', lineWeight: 0.7 },
  { id: 'electrical', name: 'Electrical', color: '#ff44ff', visible: true, frozen: false, locked: false, lineType: 'dashed', lineWeight: 0.18 },
  { id: 'plumbing', name: 'Plumbing', color: '#4488ff', visible: true, frozen: false, locked: false, lineType: 'dashdot', lineWeight: 0.18 },
];

const TOOL_ALIASES: Record<string, ToolType> = {
  l: 'line', line: 'line',
  pl: 'polyline', pline: 'polyline',
  c: 'circle', circle: 'circle',
  a: 'arc3pt', arc: 'arc3pt',
  rec: 'rectangle', rectang: 'rectangle', rectangle: 'rectangle',
  el: 'ellipse', ellipse: 'ellipse',
  w: 'wall', wall: 'wall',
  t: 'mtext', mt: 'mtext', mtext: 'mtext',   // T = MTEXT in AutoCAD
  dt: 'text', text: 'text',                   // DT = single-line text in AutoCAD
  h: 'hatch', hatch: 'hatch',
  m: 'move', move: 'move',
  co: 'copy', copy: 'copy',
  ro: 'rotate', rotate: 'rotate',
  sc: 'scale', scale: 'scale',
  mi: 'mirror', mirror: 'mirror',
  o: 'offset', offset: 'offset',
  tr: 'trim', trim: 'trim',
  ex: 'extend', extend: 'extend',
  f: 'fillet', fillet: 'fillet',
  ar: 'array', array: 'array',
  e: 'erase', erase: 'erase',
  di: 'dist', dist: 'dist',
  aa: 'area', area: 'area',
  dli: 'dimlinear', dimlinear: 'dimlinear',
  dal: 'dimaligned', dimaligned: 'dimaligned',
  dra: 'dimradius', dimradius: 'dimradius',
  dan: 'dimangular', dimangular: 'dimangular',
  br: 'break', break: 'break',
  cha: 'chamfer', chamfer: 'chamfer',
  j: 'join', join: 'join',
  s: 'stretch', stretch: 'stretch',
  len: 'lengthen', lengthen: 'lengthen',
  le: 'leader', leader: 'leader',
};

const DOOR_WIDTH = 90; // cm default
const GRIP_HIT_PX = 7;

function newId(): string { return Math.random().toString(36).slice(2, 10); }

function getLineDash(lt: string, scale: number): number[] {
  const s = 1 / scale;
  switch (lt) {
    case 'dashed': return [12 * s, 6 * s];
    case 'dotted': return [2 * s, 5 * s];
    case 'dashdot': return [12 * s, 4 * s, 2 * s, 4 * s];
    case 'hidden': return [6 * s, 4 * s];
    case 'center': return [18 * s, 4 * s, 4 * s, 4 * s];
    default: return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderGrid(ctx: CanvasRenderingContext2D, vp: Viewport, w: number, h: number) {
  const minorTarget = 50;
  const worldMinor = minorTarget / vp.scale;
  const exp = Math.pow(10, Math.floor(Math.log10(worldMinor)));
  const mult = worldMinor / exp < 2 ? 1 : worldMinor / exp < 5 ? 2 : 5;
  const spacing = exp * mult;
  const majorSpacing = spacing * 10;

  const left = (0 - vp.x) / vp.scale;
  const top = -(h - vp.y) / vp.scale;
  const right = (w - vp.x) / vp.scale;
  const bottom = (vp.y) / vp.scale;

  if (spacing * vp.scale < 4) return;

  ctx.lineWidth = 1;
  for (let x = Math.floor(left / spacing) * spacing; x <= right; x += spacing) {
    ctx.strokeStyle = Math.abs(x % majorSpacing) < 0.001 ? GRID_MAJOR : GRID_MINOR;
    const sx = x * vp.scale + vp.x;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
  }
  for (let y = Math.floor(top / spacing) * spacing; y <= bottom; y += spacing) {
    ctx.strokeStyle = Math.abs(y % majorSpacing) < 0.001 ? GRID_MAJOR : GRID_MINOR;
    const sy = -y * vp.scale + vp.y;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();
  }
}

function renderObject(
  ctx: CanvasRenderingContext2D,
  obj: CADObj,
  layers: Layer[],
  vp: Viewport,
) {
  const layer = layers.find(l => l.id === obj.layer) ?? layers[0];
  if (!layer.visible || layer.frozen) return;

  const color = obj.color === 'bylayer' ? layer.color : obj.color;
  const lw = Math.max((obj.lineWeight || layer.lineWeight) / vp.scale, 0.5);
  const lt = obj.lineType === 'continuous' ? layer.lineType : obj.lineType;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.setLineDash(getLineDash(lt, vp.scale));

  const s = (p: Point) => worldToScreen(p, vp);

  switch (obj.type) {
    case 'line': {
      const a = s(obj.start); const b = s(obj.end);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      break;
    }
    case 'polyline': {
      if (obj.points.length < 2) break;
      ctx.beginPath();
      const p0 = s(obj.points[0]); ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < obj.points.length; i++) { const p = s(obj.points[i]); ctx.lineTo(p.x, p.y); }
      if (obj.closed) ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'circle': {
      const c = s(obj.center);
      ctx.beginPath(); ctx.arc(c.x, c.y, obj.radius * vp.scale, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'arc': {
      const c = s(obj.center);
      ctx.beginPath(); ctx.arc(c.x, c.y, obj.radius * vp.scale, -obj.endAngle, -obj.startAngle, true); ctx.stroke();
      break;
    }
    case 'rect': {
      const a = s(obj.p1); const b = s(obj.p2);
      ctx.beginPath(); ctx.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)); ctx.stroke();
      break;
    }
    case 'ellipse': {
      const c = s(obj.center);
      ctx.beginPath(); ctx.ellipse(c.x, c.y, obj.rx * vp.scale, obj.ry * vp.scale, -obj.rotation, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'wall': {
      const dx = obj.end.x - obj.start.x;
      const dy = obj.end.y - obj.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) break;
      const nx = (-dy / len) * (obj.thickness / 2);
      const ny = (dx / len) * (obj.thickness / 2);
      const p1 = s({ x: obj.start.x + nx, y: obj.start.y + ny });
      const p2 = s({ x: obj.end.x + nx, y: obj.end.y + ny });
      const p3 = s({ x: obj.end.x - nx, y: obj.end.y - ny });
      const p4 = s({ x: obj.start.x - nx, y: obj.start.y - ny });
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p4.x, p4.y);
      ctx.moveTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
      ctx.stroke();
      break;
    }
    case 'text': {
      const p = s(obj.pos);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-obj.rotation);
      ctx.font = `${obj.height * vp.scale}px monospace`;
      ctx.fillStyle = color;
      ctx.setLineDash([]);
      ctx.fillText(obj.content, 0, 0);
      ctx.restore();
      break;
    }
    case 'mtext': {
      const p = s(obj.pos);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-obj.rotation);
      const fontSize = obj.height * vp.scale;
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = color;
      ctx.setLineDash([]);
      const lines = obj.content.split('\n');
      lines.forEach((line, i) => ctx.fillText(line, 0, i * fontSize * 1.4));
      // border box for mtext
      ctx.strokeStyle = 'rgba(100,100,200,0.4)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, -fontSize, obj.width * vp.scale || 200, lines.length * fontSize * 1.4 + 4);
      ctx.restore();
      break;
    }
    case 'dim': {
      renderDimension(ctx, obj, vp, color, lw);
      break;
    }
    case 'block': {
      renderBlock(ctx, obj, vp, color, lw);
      break;
    }
    case 'hatch': {
      renderHatchPattern(ctx, obj.points, obj.pattern ?? 'ansi31', color, vp, obj.angle ?? 45);
      break;
    }
  }

  if (obj.selected) renderSelectionGrips(ctx, obj, vp);
  ctx.setLineDash([]);
}

// Overload to accept hot grip key
function renderObjectWithGrip(ctx: CanvasRenderingContext2D, obj: CADObj, layers: Layer[], vp: Viewport, hotGripKey?: string) {
  renderObject(ctx, obj, layers, vp);
  if (obj.selected && hotGripKey) renderSelectionGrips(ctx, obj, vp, hotGripKey);
}

function renderDimension(ctx: CanvasRenderingContext2D, obj: DimObj, vp: Viewport, color: string, lw: number) {
  const s = (p: Point) => worldToScreen(p, vp);
  const sp1 = s(obj.p1); const sp2 = s(obj.p2); const sdim = s(obj.dimPt);

  if (obj.dimType === 'linear' || obj.dimType === 'aligned') {
    const value = dist(obj.p1, obj.p2).toFixed(0);
    ctx.setLineDash([]);
    ctx.strokeStyle = color; ctx.lineWidth = lw;

    // extension lines
    ctx.beginPath();
    ctx.moveTo(sp1.x, sp1.y); ctx.lineTo(sdim.x, sp1.y === sdim.y ? sdim.y : sdim.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sp2.x, sp2.y); ctx.lineTo(sdim.x + (sp2.x - sp1.x), sdim.y);
    ctx.stroke();

    // dim line
    ctx.beginPath();
    ctx.moveTo(sp1.x, sdim.y); ctx.lineTo(sp2.x, sdim.y); ctx.stroke();

    // arrows
    const arrowSize = 8;
    ctx.beginPath();
    ctx.moveTo(sp1.x, sdim.y);
    ctx.lineTo(sp1.x + arrowSize, sdim.y - 3);
    ctx.lineTo(sp1.x + arrowSize, sdim.y + 3);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sp2.x, sdim.y);
    ctx.lineTo(sp2.x - arrowSize, sdim.y - 3);
    ctx.lineTo(sp2.x - arrowSize, sdim.y + 3);
    ctx.closePath(); ctx.fill();

    // text
    const mx = (sp1.x + sp2.x) / 2;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(value, mx, sdim.y - 5);
    ctx.textAlign = 'left';
  } else if (obj.dimType === 'radius') {
    const value = `R${dist(obj.p1, obj.p2).toFixed(0)}`;
    ctx.beginPath(); ctx.moveTo(sp1.x, sp1.y); ctx.lineTo(sp2.x, sp2.y); ctx.stroke();
    ctx.font = '12px sans-serif'; ctx.fillStyle = color;
    ctx.fillText(value, (sp1.x + sp2.x) / 2 + 4, (sp1.y + sp2.y) / 2 - 4);
  } else if (obj.dimType === 'angular') {
    // p1 = vertex, p2 = end of arm 1, dimPt = end of arm 2
    // arc radius = dist(vertex, dimPt) in screen space
    const sv = sp1; // vertex
    const sa1 = sp2; // arm 1 end (screen)
    const sa2 = sdim; // arm 2 end (screen)
    const arcR = dist(sv, sa2);
    const ang1 = Math.atan2(sa1.y - sv.y, sa1.x - sv.x);
    const ang2 = Math.atan2(sa2.y - sv.y, sa2.x - sv.x);
    // Extension lines from vertex outward
    ctx.beginPath(); ctx.moveTo(sv.x, sv.y); ctx.lineTo(sa1.x, sa1.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sv.x, sv.y); ctx.lineTo(sa2.x, sa2.y); ctx.stroke();
    // Dimension arc
    ctx.beginPath(); ctx.arc(sv.x, sv.y, arcR, ang1, ang2); ctx.stroke();
    // Angle value
    let angleDeg = Math.abs((ang2 - ang1) * 180 / Math.PI) % 360;
    if (angleDeg > 180) angleDeg = 360 - angleDeg;
    const midAng = (ang1 + ang2) / 2;
    const tx = sv.x + (arcR + 14) * Math.cos(midAng);
    const ty = sv.y + (arcR + 14) * Math.sin(midAng);
    ctx.font = '12px sans-serif'; ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(`${angleDeg.toFixed(1)}°`, tx, ty);
    ctx.textAlign = 'left';
  }
}

function renderBlock(ctx: CanvasRenderingContext2D, obj: BlockObj, vp: Viewport, color: string, lw: number) {
  const s = (p: Point) => worldToScreen(p, vp);
  const p = s(obj.pos);
  const sc = obj.scale * vp.scale;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-obj.rotation);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash([]);

  switch (obj.blockType) {
    case 'door': {
      const w = DOOR_WIDTH * sc;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, w, 0, Math.PI / 2); ctx.stroke();
      break;
    }
    case 'window': {
      const w = 120 * sc; const d = 15 * sc;
      ctx.beginPath(); ctx.rect(-w / 2, -d, w, d * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
      break;
    }
    case 'stairs': {
      const w = 100 * sc; const h = 200 * sc; const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const y = (i / steps) * h;
        ctx.beginPath(); ctx.moveTo(0, -y); ctx.lineTo(w, -y); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, -h); ctx.stroke();
      break;
    }
    case 'column': {
      const r = 30 * sc;
      ctx.beginPath(); ctx.rect(-r, -r, r * 2, r * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r, -r); ctx.lineTo(-r, r); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function renderSelectionGrips(ctx: CanvasRenderingContext2D, obj: CADObj, vp: Viewport, hotGripKey?: string) {
  const s = (p: Point) => worldToScreen(p, vp);
  const grip = (p: Point, key?: string) => {
    const sp = s(p);
    const hot = hotGripKey === key;
    ctx.fillStyle = hot ? '#ff4444' : '#0080ff';
    ctx.strokeStyle = hot ? '#ffffff' : '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.fillRect(sp.x - 4, sp.y - 4, 8, 8);
    ctx.strokeRect(sp.x - 4, sp.y - 4, 8, 8);
  };

  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#0080ff';
  ctx.lineWidth = 1;

  switch (obj.type) {
    case 'line': grip(obj.start, 'start'); grip(midpoint(obj.start, obj.end), 'mid'); grip(obj.end, 'end'); break;
    case 'wall': grip(obj.start, 'start'); grip(obj.end, 'end'); break;
    case 'polyline': obj.points.forEach((p, i) => grip(p, `pt${i}`)); break;
    case 'circle': grip(obj.center, 'center'); grip({ x: obj.center.x + obj.radius, y: obj.center.y }, 'r0'); grip({ x: obj.center.x, y: obj.center.y + obj.radius }, 'r90'); break;
    case 'arc': grip(obj.center, 'center'); break;
    case 'rect': grip(obj.p1, 'p1'); grip(obj.p2, 'p2'); grip({ x: obj.p2.x, y: obj.p1.y }, 'p3'); grip({ x: obj.p1.x, y: obj.p2.y }, 'p4'); grip({ x: (obj.p1.x + obj.p2.x) / 2, y: (obj.p1.y + obj.p2.y) / 2 }, 'mid'); break;
    case 'text': case 'mtext': grip(obj.pos, 'pos'); break;
    case 'block': grip(obj.pos, 'pos'); break;
  }
  ctx.setLineDash([]);
}

function getGripPoints(obj: CADObj): { key: string; pt: Point }[] {
  switch (obj.type) {
    case 'line': case 'wall':
      return [{ key: 'start', pt: obj.start }, { key: 'mid', pt: { x: (obj.start.x + obj.end.x) / 2, y: (obj.start.y + obj.end.y) / 2 } }, { key: 'end', pt: obj.end }];
    case 'polyline':
      return obj.points.map((pt, i) => ({ key: `pt${i}`, pt }));
    case 'circle':
      return [{ key: 'center', pt: obj.center }, { key: 'r0', pt: { x: obj.center.x + obj.radius, y: obj.center.y } }, { key: 'r90', pt: { x: obj.center.x, y: obj.center.y + obj.radius } }];
    case 'rect':
      return [
        { key: 'p1', pt: obj.p1 }, { key: 'p2', pt: obj.p2 },
        { key: 'p3', pt: { x: obj.p2.x, y: obj.p1.y } }, { key: 'p4', pt: { x: obj.p1.x, y: obj.p2.y } },
        { key: 'mid', pt: { x: (obj.p1.x + obj.p2.x) / 2, y: (obj.p1.y + obj.p2.y) / 2 } },
      ];
    case 'arc':
      return [
        { key: 'center', pt: obj.center },
        { key: 'start', pt: { x: obj.center.x + obj.radius * Math.cos(obj.startAngle), y: obj.center.y + obj.radius * Math.sin(obj.startAngle) } },
        { key: 'end',   pt: { x: obj.center.x + obj.radius * Math.cos(obj.endAngle),   y: obj.center.y + obj.radius * Math.sin(obj.endAngle)   } },
      ];
    case 'ellipse':
      return [{ key: 'center', pt: obj.center }];
    case 'text': case 'mtext':
      return [{ key: 'pos', pt: obj.pos }];
    case 'block':
      return [{ key: 'pos', pt: obj.pos }];
    default: return [];
  }
}

function applyGripMove(obj: CADObj, key: string, newPt: Point): Partial<CADObj> {
  switch (obj.type) {
    case 'line': case 'wall':
      if (key === 'start') return { start: newPt } as any;
      if (key === 'end') return { end: newPt } as any;
      if (key === 'mid') {
        const dx = newPt.x - (obj.start.x + obj.end.x) / 2;
        const dy = newPt.y - (obj.start.y + obj.end.y) / 2;
        return { start: { x: obj.start.x + dx, y: obj.start.y + dy }, end: { x: obj.end.x + dx, y: obj.end.y + dy } } as any;
      }
      return {};
    case 'polyline': {
      const i = parseInt(key.replace('pt', ''));
      const pts = [...obj.points]; pts[i] = newPt;
      return { points: pts } as any;
    }
    case 'circle':
      if (key === 'center') return { center: newPt } as any;
      return { radius: Math.sqrt((newPt.x - obj.center.x) ** 2 + (newPt.y - obj.center.y) ** 2) } as any;
    case 'arc':
      if (key === 'center') return { center: newPt } as any;
      if (key === 'start') return { startAngle: Math.atan2(newPt.y - obj.center.y, newPt.x - obj.center.x) } as any;
      if (key === 'end')   return { endAngle:   Math.atan2(newPt.y - obj.center.y, newPt.x - obj.center.x) } as any;
      return {};
    case 'ellipse':
      if (key === 'center') return { center: newPt } as any;
      return {};
    case 'rect':
      if (key === 'p1') return { p1: newPt } as any;
      if (key === 'p2') return { p2: newPt } as any;
      if (key === 'p3') return { p1: { x: obj.p1.x, y: newPt.y }, p2: { x: newPt.x, y: obj.p2.y } } as any;
      if (key === 'p4') return { p1: { x: newPt.x, y: obj.p1.y }, p2: { x: obj.p2.x, y: newPt.y } } as any;
      if (key === 'mid') {
        const dx = newPt.x - (obj.p1.x + obj.p2.x) / 2;
        const dy = newPt.y - (obj.p1.y + obj.p2.y) / 2;
        return { p1: { x: obj.p1.x + dx, y: obj.p1.y + dy }, p2: { x: obj.p2.x + dx, y: obj.p2.y + dy } } as any;
      }
      return {};
    case 'text': case 'mtext': return { pos: newPt } as any;
    case 'block': return { pos: newPt } as any;
    default: return {};
  }
}

function renderSnapIndicator(ctx: CanvasRenderingContext2D, snap: { type: string; point: Point }, vp: Viewport) {
  if (snap.type === 'none') return;
  const sp = worldToScreen(snap.point, vp);
  const color = SNAP_COLORS[snap.type] ?? '#ffff00';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);

  switch (snap.type) {
    case 'endpoint':
      ctx.strokeRect(sp.x - 6, sp.y - 6, 12, 12);
      break;
    case 'midpoint':
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y - 8); ctx.lineTo(sp.x + 7, sp.y + 5); ctx.lineTo(sp.x - 7, sp.y + 5); ctx.closePath(); ctx.stroke();
      break;
    case 'center':
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sp.x - 10, sp.y); ctx.lineTo(sp.x + 10, sp.y);
      ctx.moveTo(sp.x, sp.y - 10); ctx.lineTo(sp.x, sp.y + 10); ctx.stroke();
      break;
    case 'intersection':
      ctx.beginPath(); ctx.moveTo(sp.x - 7, sp.y - 7); ctx.lineTo(sp.x + 7, sp.y + 7);
      ctx.moveTo(sp.x + 7, sp.y - 7); ctx.lineTo(sp.x - 7, sp.y + 7); ctx.stroke();
      break;
    case 'quadrant':
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y - 8); ctx.lineTo(sp.x + 8, sp.y); ctx.lineTo(sp.x, sp.y + 8); ctx.lineTo(sp.x - 8, sp.y); ctx.closePath(); ctx.stroke();
      break;
    default:
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.fillStyle = color;
  ctx.font = '10px sans-serif';
  ctx.fillText(snap.type, sp.x + 10, sp.y - 5);
}

function renderCrosshair(ctx: CanvasRenderingContext2D, sp: Point, w: number, h: number) {
  ctx.strokeStyle = CROSSHAIR_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(sp.x, 0); ctx.lineTo(sp.x, h);
  ctx.moveTo(0, sp.y); ctx.lineTo(w, sp.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeRect(sp.x - 8, sp.y - 8, 16, 16);
}

function renderUCS(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ox = 28, oy = h - 28, len = 22;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ff5555'; ctx.fillStyle = '#ff5555';
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + len, oy); ctx.stroke();
  ctx.font = '9px sans-serif'; ctx.fillText('X', ox + len + 2, oy + 4);
  ctx.strokeStyle = '#55ff55'; ctx.fillStyle = '#55ff55';
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - len); ctx.stroke();
  ctx.fillText('Y', ox - 4, oy - len - 3);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(ox, oy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function renderHatchPattern(
  ctx: CanvasRenderingContext2D,
  points: Point[], pattern: string, color: string, vp: Viewport, angle: number,
) {
  if (points.length < 3) return;
  const s = (p: Point) => worldToScreen(p, vp);
  ctx.save();
  const path = new Path2D();
  const p0 = s(points[0]); path.moveTo(p0.x, p0.y);
  for (let i = 1; i < points.length; i++) { const p = s(points[i]); path.lineTo(p.x, p.y); }
  path.closePath();
  ctx.clip(path);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) {
    const sp = s(pt);
    minX = Math.min(minX, sp.x); minY = Math.min(minY, sp.y);
    maxX = Math.max(maxX, sp.x); maxY = Math.max(maxY, sp.y);
  }
  const pw = maxX - minX, ph = maxY - minY;

  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 0.5; ctx.setLineDash([]);

  if (pattern === 'solid') {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = color;
    ctx.fill(path);
  } else if (pattern === 'ansi31') {
    const sp = 14;
    const diag = pw + ph;
    for (let d = -diag; d < diag; d += sp) {
      ctx.beginPath();
      ctx.moveTo(minX + d, maxY);
      ctx.lineTo(minX + d + ph, minY);
      ctx.stroke();
    }
  } else if (pattern === 'ansi32') {
    const sp = 14;
    const diag = pw + ph;
    for (let d = -diag; d < diag; d += sp) {
      ctx.beginPath(); ctx.moveTo(minX + d, maxY); ctx.lineTo(minX + d + ph, minY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(minX + d + ph, maxY); ctx.lineTo(minX + d, minY); ctx.stroke();
    }
  } else if (pattern === 'brick') {
    const bw = 28, bh = 14;
    for (let row = 0; minY + row * bh < maxY + bh; row++) {
      const iy = minY + row * bh;
      const offset = row % 2 === 0 ? 0 : bw / 2;
      ctx.beginPath(); ctx.moveTo(minX, iy); ctx.lineTo(maxX, iy); ctx.stroke();
      for (let col = -1; minX + col * bw + offset < maxX; col++) {
        const ix = minX + col * bw + offset;
        ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix, iy + bh); ctx.stroke();
      }
    }
  } else if (pattern === 'cross') {
    const sp = 18;
    for (let ix = minX; ix < maxX; ix += sp) {
      for (let iy = minY; iy < maxY; iy += sp) {
        ctx.beginPath();
        ctx.moveTo(ix - 5, iy); ctx.lineTo(ix + 5, iy);
        ctx.moveTo(ix, iy - 5); ctx.lineTo(ix, iy + 5);
        ctx.stroke();
      }
    }
  } else if (pattern === 'dots') {
    const sp = 10;
    for (let ix = minX; ix < maxX; ix += sp)
      for (let iy = minY; iy < maxY; iy += sp) {
        ctx.beginPath(); ctx.arc(ix, iy, 1, 0, Math.PI * 2); ctx.fill();
      }
  }
  ctx.restore();
}

function renderPolarTracking(ctx: CanvasRenderingContext2D, anchor: Point, cursor: Point, vp: Viewport, step: number) {
  const dx = cursor.x - anchor.x, dy = cursor.y - anchor.y;
  const angleDeg = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
  const snapped = Math.round(angleDeg / step) * step;
  const snapRad = snapped * Math.PI / 180;
  const sa = worldToScreen(anchor, vp);
  const len = 9999;
  ctx.save();
  ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 0.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(sa.x - Math.cos(snapRad) * len, sa.y - Math.sin(snapRad) * len);
  ctx.lineTo(sa.x + Math.cos(snapRad) * len, sa.y + Math.sin(snapRad) * len);
  ctx.stroke();
  ctx.setLineDash([]);
  const cs = worldToScreen(cursor, vp);
  ctx.fillStyle = '#00ff88'; ctx.font = '10px Consolas';
  ctx.fillText(`${snapped.toFixed(0)}°`, cs.x + 12, cs.y - 8);
  ctx.restore();
}

function renderSelectionBox(ctx: CanvasRenderingContext2D, start: Point, end: Point, crossing: boolean) {
  const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y);
  ctx.save();
  ctx.strokeStyle = crossing ? '#ff8800' : '#00aaff';
  ctx.lineWidth = 1;
  ctx.setLineDash(crossing ? [6, 3] : []);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = crossing ? 'rgba(255,136,0,0.07)' : 'rgba(0,170,255,0.07)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// State reducer (undo/redo safe)
// ─────────────────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD'; obj: CADObj }
  | { type: 'ADD_MANY'; objs: CADObj[] }
  | { type: 'DELETE'; ids: string[] }
  | { type: 'UPDATE'; id: string; patch: Partial<CADObj> }
  | { type: 'SELECT'; ids: string[] }
  | { type: 'SELECT_ADD'; ids: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_LAYER_PROP'; id: string; patch: Partial<Layer> }
  | { type: 'ADD_LAYER'; layer: Layer }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'MOVE_SELECTED'; dx: number; dy: number }
  | { type: 'ROTATE_SELECTED'; angle: number; cx: number; cy: number }
  | { type: 'SCALE_SELECTED'; factor: number; cx: number; cy: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_OBJECTS'; objects: CADObj[] };

interface EditorState {
  objects: CADObj[];
  layers: Layer[];
  currentLayer: string;
  history: CADObj[][];
  historyIdx: number;
}

function reducer(state: EditorState, action: Action): EditorState {
  const pushHistory = (objects: CADObj[]) => {
    const hist = state.history.slice(0, state.historyIdx + 1);
    return { history: [...hist, objects], historyIdx: hist.length };
  };

  switch (action.type) {
    case 'ADD': {
      const objects = [...state.objects, action.obj];
      return { ...state, objects, ...pushHistory(objects) };
    }
    case 'ADD_MANY': {
      const objects = [...state.objects, ...action.objs];
      return { ...state, objects, ...pushHistory(objects) };
    }
    case 'DELETE': {
      const objects = state.objects.filter(o => !action.ids.includes(o.id));
      return { ...state, objects, ...pushHistory(objects) };
    }
    case 'UPDATE': {
      const objects = state.objects.map(o => o.id === action.id ? { ...o, ...action.patch } as CADObj : o);
      return { ...state, objects, ...pushHistory(objects) };
    }
    case 'SELECT':
      return { ...state, objects: state.objects.map(o => ({ ...o, selected: action.ids.includes(o.id) })) };
    case 'SELECT_ADD':
      return { ...state, objects: state.objects.map(o => action.ids.includes(o.id) ? { ...o, selected: true } : o) };
    case 'DESELECT_ALL':
      return { ...state, objects: state.objects.map(o => ({ ...o, selected: false })) };
    case 'MOVE_SELECTED': {
      const { dx, dy } = action;
      const objects = state.objects.map(o => {
        if (!o.selected) return o;
        switch (o.type) {
          case 'line': case 'wall': return { ...o, start: { x: o.start.x + dx, y: o.start.y + dy }, end: { x: o.end.x + dx, y: o.end.y + dy } };
          case 'polyline': return { ...o, points: o.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
          case 'circle': return { ...o, center: { x: o.center.x + dx, y: o.center.y + dy } };
          case 'arc': return { ...o, center: { x: o.center.x + dx, y: o.center.y + dy } };
          case 'rect': return { ...o, p1: { x: o.p1.x + dx, y: o.p1.y + dy }, p2: { x: o.p2.x + dx, y: o.p2.y + dy } };
          case 'text': case 'mtext': return { ...o, pos: { x: o.pos.x + dx, y: o.pos.y + dy } };
          case 'block': return { ...o, pos: { x: o.pos.x + dx, y: o.pos.y + dy } };
          case 'dim': return { ...o, p1: { x: o.p1.x + dx, y: o.p1.y + dy }, p2: { x: o.p2.x + dx, y: o.p2.y + dy }, dimPt: { x: o.dimPt.x + dx, y: o.dimPt.y + dy } };
          default: return o;
        }
      });
      return { ...state, objects, ...pushHistory(objects) };
    }
    case 'ROTATE_SELECTED': {
      const { angle, cx, cy } = action;
      const rot = (p: Point): Point => {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return { x: cx + (p.x - cx) * cos - (p.y - cy) * sin, y: cy + (p.x - cx) * sin + (p.y - cy) * cos };
      };
      const objects = state.objects.map(o => {
        if (!o.selected) return o;
        switch (o.type) {
          case 'line': case 'wall': return { ...o, start: rot(o.start), end: rot(o.end) };
          case 'polyline': return { ...o, points: o.points.map(rot) };
          case 'circle': case 'arc': return { ...o, center: rot(o.center) };
          case 'rect': return { ...o, p1: rot(o.p1), p2: rot(o.p2) };
          case 'ellipse': return { ...o, center: rot(o.center), rotation: o.rotation + angle };
          case 'text': case 'mtext': return { ...o, pos: rot(o.pos), rotation: o.rotation + angle };
          case 'block': return { ...o, pos: rot(o.pos), rotation: o.rotation + angle };
          case 'dim': return { ...o, p1: rot(o.p1), p2: rot(o.p2), dimPt: rot(o.dimPt) };
          case 'hatch': return { ...o, points: o.points.map(rot) };
          default: return o;
        }
      });
      return { ...state, objects, ...pushHistory(objects) };
    }
    case 'SCALE_SELECTED': {
      const { factor, cx, cy } = action;
      const sc = (p: Point): Point => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor });
      const objects = state.objects.map(o => {
        if (!o.selected) return o;
        switch (o.type) {
          case 'line': case 'wall': return { ...o, start: sc(o.start), end: sc(o.end), ...(o.type === 'wall' ? { thickness: (o as any).thickness * factor } : {}) };
          case 'polyline': return { ...o, points: o.points.map(sc) };
          case 'circle': return { ...o, center: sc(o.center), radius: o.radius * factor };
          case 'arc': return { ...o, center: sc(o.center), radius: o.radius * factor };
          case 'rect': return { ...o, p1: sc(o.p1), p2: sc(o.p2) };
          case 'ellipse': return { ...o, center: sc(o.center), rx: o.rx * factor, ry: o.ry * factor };
          case 'text': case 'mtext': return { ...o, pos: sc(o.pos), height: o.height * factor };
          case 'block': return { ...o, pos: sc(o.pos), scale: o.scale * factor };
          case 'dim': return { ...o, p1: sc(o.p1), p2: sc(o.p2), dimPt: sc(o.dimPt) };
          case 'hatch': return { ...o, points: o.points.map(sc) };
          default: return o;
        }
      });
      return { ...state, objects, ...pushHistory(objects) };
    }
    case 'UNDO': {
      if (state.historyIdx <= 0) return state;
      const idx = state.historyIdx - 1;
      return { ...state, historyIdx: idx, objects: state.history[idx] };
    }
    case 'REDO': {
      if (state.historyIdx >= state.history.length - 1) return state;
      const idx = state.historyIdx + 1;
      return { ...state, historyIdx: idx, objects: state.history[idx] };
    }
    case 'SET_LAYER_PROP':
      return { ...state, layers: state.layers.map(l => l.id === action.id ? { ...l, ...action.patch } : l) };
    case 'ADD_LAYER':
      return { ...state, layers: [...state.layers, action.layer] };
    case 'DELETE_LAYER':
      return { ...state, layers: state.layers.filter(l => l.id !== action.id) };
    case 'SET_OBJECTS':
      return { ...state, objects: action.objects, history: [action.objects], historyIdx: 0 };
    default:
      return state;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  token: string;
  projectName: string;
  initialData?: string;
  onSave: (json: string) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CADEditor({ token, projectName, initialData, onSave }: Props) {
  const mainRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport
  const [vp, setVp] = useState<Viewport>({ x: 400, y: 300, scale: 1 });
  const vpRef = useRef(vp);
  useEffect(() => { vpRef.current = vp; }, [vp]);

  // Editor state (undo/redo)
  const [state, dispatch] = useReducer(reducer, {
    objects: [],
    layers: DEFAULT_LAYERS,
    currentLayer: '0',
    history: [[]],
    historyIdx: 0,
  });
  const [currentLayer, setCurrentLayer] = useState('0');

  // Tool state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const activeToolRef = useRef<ToolType>('select');
  const [toolPts, setToolPts] = useState<Point[]>([]);
  const toolPtsRef = useRef<Point[]>([]);
  const [previewPt, setPreviewPt] = useState<Point | null>(null);
  const previewRef = useRef<Point | null>(null);

  // Snap / modes
  const [snap, setSnap] = useState<{ type: string; point: Point }>({ type: 'none', point: { x: 0, y: 0 } });
  const snapRef = useRef(snap);
  const [ortho, setOrtho] = useState(false);
  const orthoRef = useRef(false);
  const [polar, setPolar] = useState(false);
  const polarRef = useRef(false);
  const [gridSnap, setGridSnap] = useState(false);
  const [osnap, setOsnap] = useState(true);
  const osnapRef = useRef(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    endpoint: true, midpoint: true, center: true, intersection: true,
    perpendicular: false, tangent: false, nearest: false, quadrant: true,
  });
  const [wallThickness, setWallThickness] = useState(20);
  const [textHeight, setTextHeight] = useState(20);
  const [pendingText, setPendingText] = useState<Point | null>(null);
  const [textInput, setTextInput] = useState('');

  // UI panels
  const [showLayers, setShowLayers] = useState(true);
  const [showProps, setShowProps] = useState(true);
  const [showCmd, setShowCmd] = useState(true);
  const [show3D, setShow3D] = useState(false);

  // Command line
  const [cmdText, setCmdText] = useState('');
  const [cmdLog, setCmdLog] = useState<string[]>(['Welcome to ConstructIQ CAD. Type commands below or use the toolbar.']);
  const cmdRef = useRef<HTMLInputElement>(null);

  // Cursor pos
  const [curWorld, setCurWorld] = useState<Point>({ x: 0, y: 0 });

  // Pan state
  const isPanning = useRef(false);
  const panStart = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);
  const isMovingSelection = useRef(false);
  const moveStart = useRef<Point | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Offset tool
  const [offsetDist, setOffsetDist] = useState(0);
  const [offsetObj, setOffsetObj] = useState<string | null>(null);
  const offsetObjRef = useRef<string | null>(null);

  // Layer rename inline edit
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameLayerVal, setRenameLayerVal] = useState('');

  // Polar array
  const [arrayType, setArrayType] = useState<'rect' | 'polar'>('rect');
  const [polarArrayCount, setPolarArrayCount] = useState(6);
  const [polarArrayAngle, setPolarArrayAngle] = useState(360);
  const [polarArrayCenter, setPolarArrayCenter] = useState<Point | null>(null);

  // ── New feature state ─────────────────────────────────────────────────────

  // Ribbon / layout
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home'|'insert'|'annotate'|'view'|'manage'>('home');
  const [activeLayout, setActiveLayout] = useState<'model'|'layout1'|'layout2'>('model');

  // Dynamic Input (DYN)
  const [dynMode, setDynMode] = useState(true);
  const dynModeRef = useRef(true);

  // Trim tool: two phases – click boundary, then click to trim
  const [trimBoundaryId, setTrimBoundaryId] = useState<string | null>(null);
  const trimBoundaryRef = useRef<string | null>(null);

  // Fillet
  const [filletRadius, setFilletRadius] = useState(50);
  const filletRadiusRef = useRef(50);

  // Hatch settings
  const [hatchPattern, setHatchPattern] = useState('ansi31');
  const [hatchAngle, setHatchAngle] = useState(45);

  // Crossing window selection
  const [selBoxStart, setSelBoxStart] = useState<Point | null>(null);
  const selBoxStartRef = useRef<Point | null>(null);
  const [selBoxScreen, setSelBoxScreen] = useState<{ start: Point; end: Point } | null>(null);
  const selBoxScreenRef = useRef<{ start: Point; end: Point } | null>(null);

  // Polar angle step
  const [polarAngleStep, setPolarAngleStep] = useState(15);
  const polarAngleStepRef = useRef(15);

  // Array tool
  const [showArrayDialog, setShowArrayDialog] = useState(false);
  const [arrayRows, setArrayRows] = useState(3);
  const [arrayCols, setArrayCols] = useState(3);
  const [arrayRowSpacing, setArrayRowSpacing] = useState(100);
  const [arrayColSpacing, setArrayColSpacing] = useState(100);

  // Block library
  const [showBlockLib, setShowBlockLib] = useState(false);

  // Cursor screen position (for DYN input placement)
  const [cursorScreen, setCursorScreen] = useState<Point>({ x: 0, y: 0 });

  // Grip editing
  type GripTarget = { objId: string; gripKey: string };
  const [gripDrag, setGripDrag] = useState<GripTarget | null>(null);
  const gripDragRef = useRef<GripTarget | null>(null);

  // Command history (↑↓ navigation)
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);

  // Right-click context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: { label: string; fn: () => void }[] } | null>(null);

  // MText pending
  const [pendingMText, setPendingMText] = useState<Point | null>(null);
  const [mtextInput, setMTextInput] = useState('');
  const [mtextWidth, setMTextWidth] = useState(200);

  // Break tool phases
  const [breakObjId, setBreakObjId] = useState<string | null>(null);
  const breakObjRef = useRef<string | null>(null);

  // Stretch window
  const [stretchBox, setStretchBox] = useState<{ p1: Point; p2: Point } | null>(null);
  const stretchBoxRef = useRef<{ p1: Point; p2: Point } | null>(null);

  // State ref for overlay access (avoids stale closures in useCallback)
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Left sidebar panel
  const [leftPanelTab, setLeftPanelTab] = useState<'properties' | 'layers' | 'osnap' | null>('layers');

  // ── Load initial data ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!initialData) return;
    try {
      const parsed = JSON.parse(initialData);
      if (parsed.objects) dispatch({ type: 'SET_OBJECTS', objects: parsed.objects });
    } catch {}
  }, [initialData]);

  // ── Sync tool refs ────────────────────────────────────────────────────────

  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { toolPtsRef.current = toolPts; }, [toolPts]);
  useEffect(() => { previewRef.current = previewPt; }, [previewPt]);
  useEffect(() => { snapRef.current = snap; }, [snap]);
  useEffect(() => { orthoRef.current = ortho; }, [ortho]);
  useEffect(() => { polarRef.current = polar; }, [polar]);
  useEffect(() => { osnapRef.current = osnap; }, [osnap]);
  useEffect(() => { dynModeRef.current = dynMode; }, [dynMode]);
  useEffect(() => { trimBoundaryRef.current = trimBoundaryId; }, [trimBoundaryId]);
  useEffect(() => { filletRadiusRef.current = filletRadius; }, [filletRadius]);
  useEffect(() => { polarAngleStepRef.current = polarAngleStep; }, [polarAngleStep]);
  useEffect(() => { gripDragRef.current = gripDrag; }, [gripDrag]);
  useEffect(() => { breakObjRef.current = breakObjId; }, [breakObjId]);
  useEffect(() => { stretchBoxRef.current = stretchBox; }, [stretchBox]);

  // ── Canvas size ───────────────────────────────────────────────────────────

  useEffect(() => {
    function resize() {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      [mainRef.current, overlayRef.current].forEach(c => {
        if (!c) return;
        c.width = w * dpr;
        c.height = h * dpr;
        c.style.width = w + 'px';
        c.style.height = h + 'px';
        const ctx = c.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      });
      render();
    }
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    resize();
    return () => ro.disconnect();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  // RAF-based scheduling for smooth rendering
  const rafRef = useRef<number | null>(null);
  const renderRef = useRef<() => void>(() => {});
  const zoomTargetRef = useRef<Viewport | null>(null);
  const zoomRafRef = useRef<number | null>(null);
  // Trackpad / touch / mouse-pan sync — setVp once per RAF after direct vpRef updates
  const panSyncRaf = useRef<number | null>(null);
  // RAF handle for batching main-canvas redraws during mouse-pan (cap at display refresh rate)
  const panRenderRaf = useRef<number | null>(null);
  // Touch tracking for two-finger pan + pinch
  const lastTouchesRef = useRef<{ x: number; y: number }[]>([]);
  // Batch cursor-position UI state updates at RAF rate (avoids one React re-render per pixel)
  const pendingCursorRef = useRef<{ world: Point; screen: Point; preview: Point } | null>(null);
  const cursorBatchRaf = useRef<number | null>(null);
  // Track last activated tool so Space/Enter can repeat it (AutoCAD behaviour)
  const lastCommandRef = useRef<ToolType | null>(null);
  const scheduleRender = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      render();
    });
  }, []); // eslint-disable-line

  const render = useCallback(() => {
    const canvas = mainRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(1 / dpr, 1 / dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    if (gridVisible) renderGrid(ctx, vpRef.current, w, h);

    // Origin cross
    const origin = worldToScreen({ x: 0, y: 0 }, vpRef.current);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(origin.x - 20, origin.y); ctx.lineTo(origin.x + 20, origin.y);
    ctx.moveTo(origin.x, origin.y - 20); ctx.lineTo(origin.x, origin.y + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const obj of state.objects) {
      renderObject(ctx, obj, state.layers, vpRef.current);
    }

    renderUCS(ctx, w, h);
    ctx.restore();
  }, [state.objects, state.layers, gridVisible]);

  useEffect(() => { scheduleRender(); }, [render, scheduleRender]);
  useEffect(() => { renderRef.current = render; }, [render]);

  // ── Smooth zoom animation ─────────────────────────────────────────────────

  function startZoomAnimation() {
    function step() {
      const target = zoomTargetRef.current;
      if (!target) { zoomRafRef.current = null; return; }
      const cur = vpRef.current;
      const LERP = 0.22;
      const nVp: Viewport = {
        scale: cur.scale + (target.scale - cur.scale) * LERP,
        x: cur.x + (target.x - cur.x) * LERP,
        y: cur.y + (target.y - cur.y) * LERP,
      };
      const settled =
        Math.abs(nVp.scale - target.scale) < 0.00015 &&
        Math.abs(nVp.x - target.x) < 0.08 &&
        Math.abs(nVp.y - target.y) < 0.08;
      const finalVp = settled ? target : nVp;
      vpRef.current = finalVp;
      renderRef.current();
      if (settled) {
        setVp(finalVp);
        zoomTargetRef.current = null;
        zoomRafRef.current = null;
      } else {
        zoomRafRef.current = requestAnimationFrame(step);
      }
    }
    zoomRafRef.current = requestAnimationFrame(step);
  }

  // ── Overlay (crosshair + preview) ────────────────────────────────────────

  const renderOverlay = useCallback((screenPt: Point) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const vp = vpRef.current;
    const pts = toolPtsRef.current;
    const pp = previewRef.current;

    // ── Preview rubber-band (on overlay, not main canvas) ─────────────────
    if (pp && pts.length > 0) {
      const tool = activeToolRef.current;
      const { objects, layers } = stateRef.current;
      const s = (p: Point) => worldToScreen(p, vp);
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);

      switch (tool) {
        case 'line': case 'wall': {
          if (pts.length >= 1) {
            const a = s(pts[pts.length - 1]); const b = s(pp);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
          break;
        }
        case 'polyline': case 'leader': {
          if (pts.length >= 1) {
            ctx.beginPath();
            const p0 = s(pts[0]); ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < pts.length; i++) { const p = s(pts[i]); ctx.lineTo(p.x, p.y); }
            const pb = s(pp); ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
          }
          break;
        }
        case 'circle': {
          if (pts.length === 1) {
            const c = s(pts[0]); const r = dist(pts[0], pp) * vp.scale;
            ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
          }
          break;
        }
        case 'rectangle': {
          if (pts.length === 1) {
            const a = s(pts[0]); const b = s(pp);
            ctx.beginPath(); ctx.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)); ctx.stroke();
          }
          break;
        }
        case 'arc3pt': {
          if (pts.length === 1) {
            const a = s(pts[0]); const b = s(pp);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          } else if (pts.length === 2) {
            const arc = calcArc3pt(pts[0], pts[1], pp);
            if (arc) { const c = s(arc.center); ctx.beginPath(); ctx.arc(c.x, c.y, arc.radius * vp.scale, -arc.endAngle, -arc.startAngle, true); ctx.stroke(); }
          }
          break;
        }
        case 'dimlinear': case 'dimaligned': {
          if (pts.length === 2) {
            const sp1 = s(pts[0]); const sp2 = s(pts[1]); const sdim = s(pp);
            ctx.beginPath();
            ctx.moveTo(sp1.x, sp1.y); ctx.lineTo(sp1.x, sdim.y);
            ctx.moveTo(sp2.x, sp2.y); ctx.lineTo(sp2.x, sdim.y);
            ctx.moveTo(sp1.x, sdim.y); ctx.lineTo(sp2.x, sdim.y);
            ctx.stroke();
            const value = dist(pts[0], pts[1]).toFixed(0);
            ctx.setLineDash([]); ctx.font = '12px sans-serif'; ctx.fillStyle = '#ffff00';
            ctx.textAlign = 'center'; ctx.fillText(value, (sp1.x + sp2.x) / 2, sdim.y - 5); ctx.textAlign = 'left';
          } else if (pts.length === 1) {
            const sp1 = s(pts[0]); const sp2 = s(pp);
            ctx.beginPath(); ctx.moveTo(sp1.x, sp1.y); ctx.lineTo(sp2.x, sp2.y); ctx.stroke();
          }
          break;
        }
        case 'rotate': {
          if (pts.length === 1) {
            const base = pts[0];
            const angle = Math.atan2(pp.y - base.y, pp.x - base.x);
            const sb = s(base);
            ctx.strokeStyle = '#ffaa00'; ctx.setLineDash([4, 3]);
            const selObjs = objects.filter(o => o.selected);
            ctx.save();
            ctx.translate(sb.x, sb.y); ctx.rotate(-angle); ctx.translate(-sb.x, -sb.y);
            ctx.globalAlpha = 0.5;
            selObjs.forEach(o => renderObject(ctx, { ...o, color: '#ffaa00' } as any, layers, vp));
            ctx.globalAlpha = 1; ctx.restore(); ctx.setLineDash([]);
            const deg = ((angle * 180 / Math.PI) + 360) % 360;
            ctx.fillStyle = '#ffaa00'; ctx.font = '11px Consolas'; ctx.setLineDash([]);
            ctx.fillText(`${deg.toFixed(1)}°`, s(pp).x + 12, s(pp).y - 8);
          }
          break;
        }
        case 'scale': {
          if (pts.length === 2) {
            const base = pts[0], ref = pts[1];
            const d1 = dist(base, ref), d2 = dist(base, pp);
            const factor = d1 < 0.001 ? 1 : d2 / d1;
            const sb = s(base);
            ctx.save();
            ctx.translate(sb.x, sb.y); ctx.scale(factor, factor); ctx.translate(-sb.x, -sb.y);
            ctx.globalAlpha = 0.5;
            objects.filter(o => o.selected).forEach(o => renderObject(ctx, { ...o, color: '#88ff88' } as any, layers, vp));
            ctx.globalAlpha = 1; ctx.restore(); ctx.setLineDash([]);
            ctx.fillStyle = '#88ff88'; ctx.font = '11px Consolas';
            ctx.fillText(`×${factor.toFixed(3)}`, s(pp).x + 12, s(pp).y - 8);
          }
          break;
        }
      }
      ctx.setLineDash([]);

      // Distance label for line/circle
      if ((tool === 'line' || tool === 'wall') && pts.length >= 1) {
        const d = dist(pts[pts.length - 1], pp).toFixed(1);
        const ma = worldToScreen(midpoint(pts[pts.length - 1], pp), vp);
        ctx.fillStyle = '#00aaff'; ctx.font = '11px monospace'; ctx.setLineDash([]);
        ctx.fillText(d, ma.x + 5, ma.y - 5);
      }
    }

    // ── Crosshair ────────────────────────────────────────────────────────
    renderCrosshair(ctx, screenPt, w, h);

    const snap = snapRef.current;
    if (snap.type !== 'none') renderSnapIndicator(ctx, snap, vp);

    // Polar tracking
    if (polarRef.current && pts.length > 0) {
      const anchor = pts[pts.length - 1];
      const cursor = screenToWorld(screenPt, vp);
      renderPolarTracking(ctx, anchor, cursor, vp, polarAngleStepRef.current);
    }

    // Selection box
    const box = selBoxScreenRef.current;
    if (box && activeToolRef.current === 'select') {
      renderSelectionBox(ctx, box.start, box.end, box.end.x < box.start.x);
    }
  }, []);

  // ── Coord helpers ─────────────────────────────────────────────────────────

  function getEventPoint(e: React.MouseEvent): { screen: Point; world: Point } {
    const rect = mainRef.current!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const screen = { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
    const world = screenToWorld(screen, vpRef.current);
    return { screen, world };
  }

  function constrainPoint(raw: Point): Point {
    const pts = toolPtsRef.current;
    if (pts.length === 0) return raw;
    const anchor = pts[pts.length - 1];
    if (orthoRef.current) return applyOrtho(raw, anchor);
    if (polarRef.current) return applyPolar(raw, anchor, 15);
    return raw;
  }

  // ── Mouse events ──────────────────────────────────────────────────────────

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button === 1) {
      e.preventDefault(); // block Chrome's native autoscroll mode
      isPanning.current = true;
      panStart.current = { sx: e.clientX, sy: e.clientY, vx: vpRef.current.x, vy: vpRef.current.y };
      return;
    }
    if (e.button !== 0) return;

    const { screen, world } = getEventPoint(e);
    const sr = snapRef.current;
    const pt: Point = sr.type !== 'none' ? sr.point : constrainPoint(world);

    const tool = activeToolRef.current;

    // Text special case: open input
    if (tool === 'text') {
      setPendingText(pt);
      setTextInput('');
      return;
    }

    // Block insertion tools (single click)
    if (['door', 'window', 'stairs'].includes(tool)) {
      const blockType = tool as 'door' | 'window' | 'stairs';
      dispatch({
        type: 'ADD',
        obj: {
          id: newId(), type: 'block', blockType, pos: pt, rotation: 0, scale: 1,
          layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false,
        } as BlockObj,
      });
      log(`${blockType} inserted at ${fmt(pt)}`);
      return;
    }

    if (tool === 'select') {
      // 1. Check grip on a selected object first
      for (const obj of state.objects) {
        if (!obj.selected) continue;
        const grips = getGripPoints(obj);
        for (const g of grips) {
          const sp = worldToScreen(g.pt, vpRef.current);
          if (dist(screen, sp) <= GRIP_HIT_PX) {
            const gd = { objId: obj.id, gripKey: g.key };
            setGripDrag(gd); gripDragRef.current = gd;
            log(`Grip: ${obj.type} ${g.key}`);
            return;
          }
        }
      }
      // 2. Normal click
      const clicked = hitTest(pt, state.objects, vpRef.current, 8);
      if (clicked) {
        if (e.shiftKey) {
          dispatch({ type: 'SELECT_ADD', ids: [clicked.id] });
        } else {
          dispatch({ type: 'SELECT', ids: [clicked.id] });
        }
        isMovingSelection.current = true;
        moveStart.current = pt;
      } else {
        // start crossing/window selection box
        setSelBoxStart(pt);
        selBoxStartRef.current = pt;
        dispatch({ type: 'DESELECT_ALL' });
      }
      return;
    }

    if (tool === 'erase') {
      const hit = hitTest(pt, state.objects, vpRef.current, 8);
      if (hit) { dispatch({ type: 'DELETE', ids: [hit.id] }); log(`Erased ${hit.type}`); }
      return;
    }

    // ── Trim ───────────────────────────────────────────────────────────────
    if (tool === 'trim') {
      const hit = hitTest(pt, state.objects, vpRef.current, 8);
      if (!hit) return;
      if (!trimBoundaryRef.current) {
        // Phase 1: select boundary
        setTrimBoundaryId(hit.id);
        trimBoundaryRef.current = hit.id;
        dispatch({ type: 'SELECT', ids: [hit.id] });
        log('Trim: boundary selected. Now click object to trim.');
      } else {
        // Phase 2: trim — supports line, wall, arc (trimmed by line or circle boundary)
        if (hit.id === trimBoundaryRef.current) return;
        const boundary = state.objects.find(o => o.id === trimBoundaryRef.current);
        if (!boundary) return;

        if ((hit.type === 'line' || hit.type === 'wall') && (boundary.type === 'line' || boundary.type === 'wall')) {
          const bp = boundary as any;
          const isect = lineIntersect(hit.start, hit.end, bp.start, bp.end);
          if (!isect) { log('No intersection found.'); return; }
          const d1 = dist(pt, hit.start), d2 = dist(pt, hit.end);
          dispatch({ type: 'UPDATE', id: hit.id, patch: d1 < d2 ? { start: isect } as any : { end: isect } as any });
        } else if ((hit.type === 'line' || hit.type === 'wall') && boundary.type === 'circle') {
          const pts2 = lineCircleIntersects((hit as any).start, (hit as any).end, boundary.center, boundary.radius);
          if (!pts2.length) { log('No intersection.'); return; }
          const isect2 = pts2.reduce((a, b) => dist(pt, a) < dist(pt, b) ? a : b);
          const d1 = dist(pt, (hit as any).start), d2 = dist(pt, (hit as any).end);
          dispatch({ type: 'UPDATE', id: hit.id, patch: d1 < d2 ? { start: isect2 } as any : { end: isect2 } as any });
        } else if (hit.type === 'arc' && (boundary.type === 'line' || boundary.type === 'wall')) {
          const arcObj = hit as ArcObj;
          const bp2 = boundary as any;
          const pts3 = lineCircleIntersects(bp2.start, bp2.end, arcObj.center, arcObj.radius);
          if (!pts3.length) { log('No intersection.'); return; }
          const isect3 = pts3.reduce((a, b) => dist(pt, a) < dist(pt, b) ? a : b);
          const clickAng = Math.atan2(pt.y - arcObj.center.y, pt.x - arcObj.center.x);
          const trimAng = Math.atan2(isect3.y - arcObj.center.y, isect3.x - arcObj.center.x);
          const dStart = Math.abs(clickAng - arcObj.startAngle), dEnd = Math.abs(clickAng - arcObj.endAngle);
          dispatch({ type: 'UPDATE', id: hit.id, patch: dStart < dEnd ? { startAngle: trimAng } as any : { endAngle: trimAng } as any });
        } else { log('Trim: unsupported combination.'); return; }

        log('Trimmed.');
        setTrimBoundaryId(null); trimBoundaryRef.current = null;
        dispatch({ type: 'DESELECT_ALL' });
      }
      return;
    }

    // ── Extend ─────────────────────────────────────────────────────────────
    if (tool === 'extend') {
      const hit = hitTest(pt, state.objects, vpRef.current, 8);
      if (!hit) return;
      if (!trimBoundaryRef.current) {
        setTrimBoundaryId(hit.id);
        trimBoundaryRef.current = hit.id;
        dispatch({ type: 'SELECT', ids: [hit.id] });
        log('Extend: select boundary. Now click line to extend.');
      } else {
        if (hit.id === trimBoundaryRef.current) return;
        const boundary = state.objects.find(o => o.id === trimBoundaryRef.current);
        if (!boundary) return;

        if ((hit.type === 'line' || hit.type === 'wall') && (boundary.type === 'line' || boundary.type === 'wall')) {
          const bp = boundary as any;
          const d1 = dist(pt, hit.start), d2 = dist(pt, hit.end);
          const isect = lineIntersectInfinite(
            d1 < d2 ? hit.end : hit.start,
            d1 < d2 ? hit.start : hit.end,
            bp.start, bp.end,
          );
          if (!isect) { log('No intersection.'); return; }
          dispatch({ type: 'UPDATE', id: hit.id, patch: d1 < d2 ? { start: isect } as any : { end: isect } as any });
        } else if ((hit.type === 'line' || hit.type === 'wall') && boundary.type === 'circle') {
          const pts2 = lineCircleIntersects((hit as any).start, (hit as any).end, boundary.center, boundary.radius);
          if (!pts2.length) { log('No intersection.'); return; }
          const d1 = dist(pt, (hit as any).start), d2 = dist(pt, (hit as any).end);
          const isect2 = d1 < d2
            ? pts2.reduce((a, b) => dist(a, (hit as any).start) > dist(b, (hit as any).start) ? a : b)
            : pts2.reduce((a, b) => dist(a, (hit as any).end) > dist(b, (hit as any).end) ? a : b);
          dispatch({ type: 'UPDATE', id: hit.id, patch: d1 < d2 ? { start: isect2 } as any : { end: isect2 } as any });
        } else { log('Extend: unsupported combination.'); return; }

        log('Extended.');
        setTrimBoundaryId(null); trimBoundaryRef.current = null;
        dispatch({ type: 'DESELECT_ALL' });
      }
      return;
    }

    // ── Offset ─────────────────────────────────────────────────────────────
    if (tool === 'offset') {
      if (!offsetObjRef.current) {
        // Phase 1: pick object to offset
        const hit = hitTest(pt, state.objects, vpRef.current, 8);
        if (!hit) { log('OFFSET: click an object to offset.'); return; }
        setOffsetObj(hit.id); offsetObjRef.current = hit.id;
        dispatch({ type: 'SELECT', ids: [hit.id] });
        log(`OFFSET: click the side to offset to (dist = ${offsetDist > 0 ? offsetDist : 'type distance first'})`);
      } else {
        // Phase 2: click side → create offset copy
        const src = state.objects.find(o => o.id === offsetObjRef.current);
        if (!src) { setOffsetObj(null); offsetObjRef.current = null; return; }
        const d = offsetDist > 0 ? offsetDist : 50;

        let newObj: CADObj | null = null;
        if (src.type === 'line' || src.type === 'wall') {
          const dx = src.end.x - src.start.x, dy = src.end.y - src.start.y;
          const len = Math.sqrt(dx*dx + dy*dy) || 1;
          const nx = -dy/len, ny = dx/len; // left-side normal
          const side = (pt.x - src.start.x)*nx + (pt.y - src.start.y)*ny > 0 ? 1 : -1;
          const ox = nx*d*side, oy = ny*d*side;
          newObj = { ...src, id: newId(), start: { x: src.start.x+ox, y: src.start.y+oy }, end: { x: src.end.x+ox, y: src.end.y+oy }, selected: false } as any;
        } else if (src.type === 'circle') {
          const outside = dist(pt, src.center) > src.radius;
          const newR = outside ? src.radius + d : Math.max(1, src.radius - d);
          newObj = { ...src, id: newId(), radius: newR, selected: false };
        } else if (src.type === 'arc') {
          const outside = dist(pt, src.center) > src.radius;
          const newR = outside ? src.radius + d : Math.max(1, src.radius - d);
          newObj = { ...src, id: newId(), radius: newR, selected: false };
        } else if (src.type === 'polyline') {
          // Offset each segment by d, then re-intersect adjacent segments
          const segs = src.points;
          const offsetPts: Point[] = [];
          for (let i = 0; i < segs.length - 1; i++) {
            const ax = segs[i].x, ay = segs[i].y, bx = segs[i+1].x, by = segs[i+1].y;
            const dx2 = bx-ax, dy2 = by-ay, len2 = Math.sqrt(dx2*dx2+dy2*dy2)||1;
            const nx2 = -dy2/len2, ny2 = dx2/len2;
            const s2 = ((pt.x-ax)*nx2+(pt.y-ay)*ny2)>0?1:-1;
            if (i===0) offsetPts.push({x:ax+nx2*d*s2, y:ay+ny2*d*s2});
            offsetPts.push({x:bx+nx2*d*s2, y:by+ny2*d*s2});
          }
          newObj = { ...src, id: newId(), points: offsetPts, selected: false } as any;
        } else if (src.type === 'rect') {
          const side2 = dist(pt, { x: (src.p1.x+src.p2.x)/2, y: (src.p1.y+src.p2.y)/2 });
          const outside = side2 > dist(src.p1, src.p2)/2;
          const dd = outside ? d : -d;
          newObj = { ...src, id: newId(), p1: {x:src.p1.x-dd,y:src.p1.y-dd}, p2: {x:src.p2.x+dd,y:src.p2.y+dd}, selected: false } as any;
        }

        if (newObj) {
          dispatch({ type: 'ADD', obj: newObj });
          log(`Offset by ${d}`);
        } else {
          log('OFFSET: unsupported object type.');
        }
        setOffsetObj(null); offsetObjRef.current = null;
        dispatch({ type: 'DESELECT_ALL' });
      }
      return;
    }

    // ── Fillet ─────────────────────────────────────────────────────────────
    if (tool === 'fillet') {
      const hit = hitTest(pt, state.objects, vpRef.current, 8);
      if (!hit || hit.type !== 'line') { log('Fillet: click a line.'); return; }
      const pts = [...toolPtsRef.current];
      if (pts.length === 0) {
        // store first line click point on the object
        setToolPts([pt]);
        (toolPtsRef.current as any)._firstId = hit.id;
        log('Fillet: click second line.');
      } else {
        const firstId = (toolPtsRef.current as any)._firstId;
        if (firstId === hit.id) { setToolPts([]); return; }
        const line1 = state.objects.find(o => o.id === firstId) as LineObj;
        const line2 = hit as LineObj;
        if (!line1) return;
        applyFillet(line1, line2, pt, pts[0], filletRadiusRef.current, dispatch, log);
        setToolPts([]);
      }
      return;
    }

    // ── Rotate ─────────────────────────────────────────────────────────────
    if (tool === 'rotate') {
      const newPts2 = [...toolPtsRef.current, pt];
      if (newPts2.length === 1) {
        setToolPts(newPts2);
        log('Rotate: base point set. Move mouse or type angle in command line.');
      } else if (newPts2.length === 2) {
        const [base, ref] = newPts2;
        const angle = Math.atan2(pt.y - base.y, pt.x - base.x) - Math.atan2(ref.y - base.y, ref.x - base.x);
        dispatch({ type: 'ROTATE_SELECTED', angle, cx: base.x, cy: base.y });
        log(`Rotated ${(angle * 180 / Math.PI).toFixed(1)}°`);
        setToolPts([]); setActiveTool('select');
      }
      return;
    }

    // ── Scale ──────────────────────────────────────────────────────────────
    if (tool === 'scale') {
      const newPts2 = [...toolPtsRef.current, pt];
      if (newPts2.length === 1) {
        setToolPts(newPts2);
        log('Scale: base point set. Click to define scale or type factor in command line.');
      } else if (newPts2.length === 2) {
        const [base, ref] = newPts2;
        const d1 = dist(base, ref);
        const d2 = dist(base, pt);
        if (d1 < 0.001) return;
        const factor = d2 / d1;
        dispatch({ type: 'SCALE_SELECTED', factor, cx: base.x, cy: base.y });
        log(`Scaled ×${factor.toFixed(3)}`);
        setToolPts([]); setActiveTool('select');
      }
      return;
    }

    // ── Array ──────────────────────────────────────────────────────────────
    if (tool === 'array') {
      const sel = state.objects.filter(o => o.selected);
      if (sel.length === 0) { log('Array: select objects first.'); setActiveTool('select'); return; }
      setShowArrayDialog(true);
      return;
    }

    const newPts = [...toolPtsRef.current, pt];

    // Tools that finish on 2nd point
    if (tool === 'line') {
      if (newPts.length === 2) {
        const [a, b] = newPts;
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'line', start: a, end: b, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as LineObj });
        log(`Line ${fmt(a)} → ${fmt(b)}  L=${dist(a, b).toFixed(1)}`);
        // continue from end point (AutoCAD line continuation)
        setToolPts([b]);
        return;
      }
    }

    if (tool === 'wall') {
      if (newPts.length === 2) {
        const [a, b] = newPts;
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'wall', start: a, end: b, thickness: wallThickness, layer: currentLayer, color: 'bylayer', lineWeight: 0.5, lineType: 'continuous', selected: false } as WallObj });
        log(`Wall ${fmt(a)} → ${fmt(b)}`);
        setToolPts([b]);
        return;
      }
    }

    if (tool === 'circle') {
      if (newPts.length === 2) {
        const [c, edge] = newPts;
        const r = dist(c, edge);
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'circle', center: c, radius: r, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as CircleObj });
        log(`Circle center=${fmt(c)} r=${r.toFixed(1)}`);
        setToolPts([]); return;
      }
    }

    if (tool === 'rectangle') {
      if (newPts.length === 2) {
        const [p1, p2] = newPts;
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'rect', p1, p2, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as RectObj });
        log(`Rectangle ${fmt(p1)} → ${fmt(p2)}`);
        setToolPts([]); return;
      }
    }

    if (tool === 'arc3pt') {
      if (newPts.length === 3) {
        const [p1, p2, p3] = newPts;
        const arc = calcArc3pt(p1, p2, p3);
        if (arc) {
          dispatch({ type: 'ADD', obj: { id: newId(), type: 'arc', ...arc, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as ArcObj });
          log(`Arc`);
        }
        setToolPts([]); return;
      }
    }

    if (tool === 'dimlinear') {
      if (newPts.length === 3) {
        const [p1, p2, dimPt] = newPts;
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'dim', dimType: 'linear', p1, p2, dimPt, layer: 'dims', color: '#ffff00', lineWeight: 0.18, lineType: 'continuous', selected: false } as DimObj });
        log(`Dimension ${dist(p1, p2).toFixed(1)}`);
        setToolPts([]); return;
      }
    }

    if (tool === 'dimaligned') {
      if (newPts.length === 3) {
        const [p1, p2, dimPt] = newPts;
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'dim', dimType: 'aligned', p1, p2, dimPt, layer: 'dims', color: '#ffff00', lineWeight: 0.18, lineType: 'continuous', selected: false } as DimObj });
        setToolPts([]); return;
      }
    }

    if (tool === 'dimradius') {
      if (newPts.length === 2) {
        const [center, edge] = newPts;
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'dim', dimType: 'radius', p1: center, p2: edge, dimPt: edge, layer: 'dims', color: '#ffff00', lineWeight: 0.18, lineType: 'continuous', selected: false } as DimObj });
        setToolPts([]); return;
      }
    }

    if (tool === 'move') {
      if (newPts.length === 2) {
        const dx = newPts[1].x - newPts[0].x;
        const dy = newPts[1].y - newPts[0].y;
        dispatch({ type: 'MOVE_SELECTED', dx, dy });
        log(`Moved  Δ${dx.toFixed(1)},${dy.toFixed(1)}`);
        setToolPts([]); setActiveTool('select'); return;
      }
    }

    if (tool === 'copy') {
      if (newPts.length === 2) {
        const dx = newPts[1].x - newPts[0].x;
        const dy = newPts[1].y - newPts[0].y;
        const copies = state.objects
          .filter(o => o.selected)
          .map(o => ({ ...moveObj(o, dx, dy), id: newId(), selected: false }));
        dispatch({ type: 'ADD_MANY', objs: copies as CADObj[] });
        log(`Copied ${copies.length} object(s) — click next destination or Esc to exit.`);
        // Multiple mode: keep base point, reset to destination pick
        setToolPts([newPts[0]]);
        return;
      }
    }

    if (tool === 'mirror') {
      if (newPts.length === 2) {
        const [l1, l2] = newPts;
        const mirrored = state.objects
          .filter(o => o.selected)
          .map(o => ({ ...mirrorObj(o, l1, l2), id: newId(), selected: false }));
        dispatch({ type: 'ADD_MANY', objs: mirrored as CADObj[] });
        log(`Mirrored ${mirrored.length} object(s)`);
        setToolPts([]); setActiveTool('select'); return;
      }
    }

    // ── Break ──────────────────────────────────────────────────────────────
    if (tool === 'break') {
      const hit = hitTest(pt, state.objects, vpRef.current, 8);
      if (!breakObjRef.current) {
        if (!hit || (hit.type !== 'line' && hit.type !== 'wall')) { log('BREAK: click a line.'); return; }
        setBreakObjId(hit.id); breakObjRef.current = hit.id;
        dispatch({ type: 'SELECT', ids: [hit.id] });
        log('BREAK: first break point (or same point for break-at-point):');
        setToolPts([pt]);
        return;
      } else {
        const firstPt = toolPtsRef.current[0];
        const obj = state.objects.find(o => o.id === breakObjRef.current);
        if (!obj || (obj.type !== 'line' && obj.type !== 'wall')) { setBreakObjId(null); breakObjRef.current = null; setToolPts([]); return; }
        const breakResult = breakLine(obj as any, firstPt, pt);
        if (breakResult) {
          dispatch({ type: 'DELETE', ids: [obj.id] });
          if (breakResult[0]) dispatch({ type: 'ADD', obj: breakResult[0] });
          if (breakResult[1]) dispatch({ type: 'ADD', obj: breakResult[1] });
          log('Break: line split.');
        }
        setBreakObjId(null); breakObjRef.current = null; setToolPts([]);
        dispatch({ type: 'DESELECT_ALL' }); setActiveTool('select');
        return;
      }
    }

    // ── Chamfer ────────────────────────────────────────────────────────────
    if (tool === 'chamfer') {
      const hit = hitTest(pt, state.objects, vpRef.current, 8);
      if (!hit || hit.type !== 'line') { log('CHAMFER: click a line.'); return; }
      const pts = [...toolPtsRef.current];
      if (pts.length === 0) {
        setToolPts([pt]);
        (toolPtsRef.current as any)._firstId = hit.id;
        log('CHAMFER: click second line. [D1=50,D2=50 — type "cha d" to set distances]');
      } else {
        const firstId = (toolPtsRef.current as any)._firstId;
        if (firstId === hit.id) { setToolPts([]); return; }
        const line1 = state.objects.find(o => o.id === firstId) as LineObj;
        const line2 = hit as LineObj;
        if (!line1) return;
        applyChamfer(line1, line2, pts[0], pt, filletRadiusRef.current, dispatch, log);
        setToolPts([]);
      }
      return;
    }

    // ── Join ───────────────────────────────────────────────────────────────
    if (tool === 'join') {
      const hit = hitTest(pt, state.objects, vpRef.current, 8);
      if (!hit || (hit.type !== 'line' && hit.type !== 'wall')) { log('JOIN: click a line or wall.'); return; }
      const pts = [...toolPtsRef.current];
      if (pts.length === 0) {
        setToolPts([pt]);
        (toolPtsRef.current as any)._firstId = hit.id;
        dispatch({ type: 'SELECT', ids: [hit.id] });
        log('JOIN: click second line to join.');
      } else {
        const firstId = (toolPtsRef.current as any)._firstId;
        if (firstId === hit.id) { setToolPts([]); return; }
        const line1 = state.objects.find(o => o.id === firstId) as LineObj;
        const line2 = hit as LineObj;
        if (!line1) return;
        const joined = joinLines(line1, line2);
        if (joined) {
          dispatch({ type: 'DELETE', ids: [line1.id, line2.id] });
          dispatch({ type: 'ADD', obj: joined });
          log('JOIN: lines joined.');
        } else {
          log('JOIN: lines are not collinear or do not share an endpoint.');
        }
        setToolPts([]); dispatch({ type: 'DESELECT_ALL' });
      }
      return;
    }

    // ── Stretch ────────────────────────────────────────────────────────────
    if (tool === 'stretch') {
      if (newPts.length === 1) {
        log('STRETCH: second corner of crossing window:');
      } else if (newPts.length === 2) {
        const box = { p1: newPts[0], p2: newPts[1] };
        setStretchBox(box); stretchBoxRef.current = box;
        // Highlight objects to stretch
        const minX = Math.min(box.p1.x, box.p2.x), maxX = Math.max(box.p1.x, box.p2.x);
        const minY = Math.min(box.p1.y, box.p2.y), maxY = Math.max(box.p1.y, box.p2.y);
        const toSelect = state.objects.filter(obj => {
          const pts2 = getObjectPoints(obj);
          return pts2.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
        }).map(o => o.id);
        dispatch({ type: 'SELECT', ids: toSelect });
        log('STRETCH: base point:');
      } else if (newPts.length === 3) {
        // Third click is base point, fourth will be displacement
        log('STRETCH: new point:');
      } else if (newPts.length === 4) {
        const box = stretchBoxRef.current;
        if (!box) { setToolPts([]); return; }
        const dx = newPts[3].x - newPts[2].x;
        const dy = newPts[3].y - newPts[2].y;
        const minX = Math.min(box.p1.x, box.p2.x), maxX = Math.max(box.p1.x, box.p2.x);
        const minY = Math.min(box.p1.y, box.p2.y), maxY = Math.max(box.p1.y, box.p2.y);
        // Stretch: move only points inside the box
        state.objects.filter(o => o.selected).forEach(obj => {
          const patch = stretchObj(obj, minX, maxX, minY, maxY, dx, dy);
          if (patch) dispatch({ type: 'UPDATE', id: obj.id, patch: patch as any });
        });
        log(`Stretched Δ${dx.toFixed(1)},${dy.toFixed(1)}`);
        setStretchBox(null); stretchBoxRef.current = null;
        setToolPts([]); dispatch({ type: 'DESELECT_ALL' }); setActiveTool('select');
        return;
      }
    }

    // ── Lengthen ───────────────────────────────────────────────────────────
    if (tool === 'lengthen') {
      const hit = hitTest(pt, state.objects, vpRef.current, 8);
      if (!hit || (hit.type !== 'line' && hit.type !== 'wall')) { log('LENGTHEN: click a line. Type increment in command line.'); return; }
      log(`LENGTHEN: current length=${dist((hit as any).start, (hit as any).end).toFixed(2)}. Type new total length or increment (e.g. +50 or -30):`);
      dispatch({ type: 'SELECT', ids: [hit.id] });
      (toolPtsRef.current as any)._lenId = hit.id;
      setToolPts([pt]);
      return;
    }

    // ── MText ──────────────────────────────────────────────────────────────
    if (tool === 'mtext') {
      setPendingMText(pt);
      setMTextInput('');
      return;
    }

    // ── Leader ─────────────────────────────────────────────────────────────
    if (tool === 'leader') {
      if (newPts.length >= 2) {
        // On enter/dblclick: create leader + text prompt
        if (newPts.length >= 3) {
          const [p1, p2] = newPts;
          dispatch({ type: 'ADD', obj: { id: newId(), type: 'polyline', points: newPts.slice(0, -1), closed: false, layer: 'dims', color: '#ffff00', lineWeight: 0.18, lineType: 'continuous', selected: false } as any });
          // Add arrow at start
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ang = Math.atan2(dy, dx);
          const arrowLen = 10 / vpRef.current.scale;
          const ap = { x: p1.x + (dx / len) * arrowLen, y: p1.y + (dy / len) * arrowLen };
          dispatch({ type: 'ADD', obj: { id: newId(), type: 'text', pos: newPts[newPts.length - 1], content: 'Label', height: 15, rotation: 0, layer: 'dims', color: '#ffff00', lineWeight: 0.18, lineType: 'continuous', selected: false } as any });
          log('LEADER: added.'); setToolPts([]); setActiveTool('select'); return;
        }
      }
    }

    // ── Hatch auto-boundary ────────────────────────────────────────────────
    if (tool === 'hatch') {
      const autoBoundary = findHatchBoundary(pt, state.objects);
      if (autoBoundary) {
        dispatch({
          type: 'ADD',
          obj: {
            id: newId(), type: 'hatch', points: autoBoundary, pattern: hatchPattern,
            scale: 1, angle: hatchAngle, layer: currentLayer, color: 'bylayer',
            lineWeight: 0.25, lineType: 'continuous', selected: false,
          } as any,
        });
        log(`Hatch: auto-boundary detected (${autoBoundary.length} pts)`);
        setToolPts([]); return;
      }
    }

    // ── Ellipse (center → x-axis endpoint → y-radius) ─────────────────────
    if (tool === 'ellipse') {
      if (newPts.length === 2) {
        const [center, rxPt] = newPts;
        const rx = dist(center, rxPt);
        const rotation = Math.atan2(rxPt.y - center.y, rxPt.x - center.x);
        log(`Ellipse: rx=${rx.toFixed(1)}, rotation=${(rotation*180/Math.PI).toFixed(1)}°. Click to set y-radius:`);
      } else if (newPts.length === 3) {
        const [center, rxPt, ryPt] = newPts;
        const rx = dist(center, rxPt);
        const rotation = Math.atan2(rxPt.y - center.y, rxPt.x - center.x);
        // ry = perpendicular distance from axis to click
        const axDx = rxPt.x - center.x, axDy = rxPt.y - center.y;
        const axLen = Math.sqrt(axDx*axDx + axDy*axDy) || 1;
        const projX = center.x - axDy/axLen * 0, projY = center.y + axDx/axLen * 0;
        const ry = Math.abs((ryPt.x - center.x)*(-axDy/axLen) + (ryPt.y - center.y)*(axDx/axLen));
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'ellipse', center, rx, ry: Math.max(ry, 1), rotation, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as any });
        log(`Ellipse center=${fmt(center)} rx=${rx.toFixed(1)} ry=${ry.toFixed(1)}`);
        setToolPts([]); return;
      }
    }

    // ── Angular Dimension ─────────────────────────────────────────────────
    if (tool === 'dimangular') {
      const hit = hitTest(pt, state.objects, vpRef.current, 8);
      if (newPts.length === 0) {
        if (!hit || (hit.type !== 'line' && hit.type !== 'wall')) { log('DIMANGULAR: click first line.'); return; }
        (toolPtsRef.current as any)._l1id = hit.id;
        setToolPts([pt]);
        log('DIMANGULAR: click second line.');
        return;
      } else if (newPts.length === 1) {
        const l1id = (toolPtsRef.current as any)._l1id;
        if (!hit || (hit.type !== 'line' && hit.type !== 'wall') || hit.id === l1id) return;
        const l1 = state.objects.find(o => o.id === l1id) as LineObj;
        const l2 = hit as LineObj;
        const vertex = lineIntersectInfinite(l1.start, l1.end, l2.start, l2.end);
        if (!vertex) { log('DIMANGULAR: lines are parallel.'); setToolPts([]); return; }
        // arm endpoints: furthest point of each line from vertex
        const arm1 = dist(vertex, l1.end) > dist(vertex, l1.start) ? l1.end : l1.start;
        const arm2 = dist(vertex, l2.end) > dist(vertex, l2.start) ? l2.end : l2.start;
        (toolPtsRef.current as any)._vertex = vertex;
        (toolPtsRef.current as any)._arm1 = arm1;
        (toolPtsRef.current as any)._arm2 = arm2;
        setToolPts([...newPts, pt]);
        log('DIMANGULAR: click to place dimension arc.');
        return;
      } else if (newPts.length === 2) {
        const vertex = (toolPtsRef.current as any)._vertex as Point;
        const arm1  = (toolPtsRef.current as any)._arm1  as Point;
        const arm2  = (toolPtsRef.current as any)._arm2  as Point;
        if (!vertex) { setToolPts([]); return; }
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'dim', dimType: 'angular', p1: vertex, p2: arm1, dimPt: arm2, layer: 'dims', color: '#ffff00', lineWeight: 0.18, lineType: 'continuous', selected: false } as DimObj });
        log(`Angular dim placed.`);
        setToolPts([]); return;
      }
    }

    setToolPts(newPts);
  }

  function handleMouseMove(e: React.MouseEvent) {
    const { screen, world } = getEventPoint(e);

    // ── Pan (middle-mouse) ────────────────────────────────────────────────────
    // Update vpRef + redraw directly — no React state update per pixel.
    // setVp is called once in handleMouseUp so the zoom% label stays accurate.
    if (isPanning.current && panStart.current) {
      const dx = e.clientX - panStart.current.sx;
      const dy = e.clientY - panStart.current.sy;
      vpRef.current = { ...vpRef.current, x: panStart.current.vx + dx, y: panStart.current.vy + dy };
      // Cap main-canvas redraws at the display refresh rate; the overlay still follows the cursor immediately.
      if (panRenderRaf.current === null) {
        panRenderRaf.current = requestAnimationFrame(() => {
          panRenderRaf.current = null;
          renderRef.current();
        });
      }
      renderOverlay(screen);
      return;
    }

    // ── Grip drag ─────────────────────────────────────────────────────────────
    if (gripDragRef.current && activeToolRef.current === 'select') {
      const { objId, gripKey } = gripDragRef.current;
      const obj = state.objects.find(o => o.id === objId);
      if (obj) {
        const sr2 = osnapRef.current
          ? findSnap(screen, state.objects, vpRef.current, snapSettings, gridSnap, 50, toolPtsRef.current[toolPtsRef.current.length - 1])
          : { type: 'none' as const, point: world };
        const gripPt = sr2.type !== 'none' ? sr2.point : world;
        dispatch({ type: 'UPDATE', id: objId, patch: applyGripMove(obj, gripKey, gripPt) as any });
      }
      renderOverlay(screen);
      // React re-render from dispatch will call scheduleRender automatically
      return;
    }

    // ── Selection box drag ───────────────────────────────────────────────────
    // Only update the ref — renderOverlay reads the ref, no React re-render needed
    if (selBoxStartRef.current && activeToolRef.current === 'select') {
      selBoxScreenRef.current = { start: worldToScreen(selBoxStartRef.current, vpRef.current), end: screen };
    }

    // ── OSNAP ─────────────────────────────────────────────────────────────────
    const lastAnchor = toolPtsRef.current[toolPtsRef.current.length - 1];
    const sr = osnapRef.current
      ? findSnap(screen, state.objects, vpRef.current, snapSettings, gridSnap, 50, lastAnchor)
      : { type: 'none' as const, point: world };

    const snapPt = sr.type !== 'none' ? sr.point : world;
    const constrained = constrainPoint(snapPt);
    const finalSnap = sr.type !== 'none'
      ? { ...sr, point: constrained }
      : { type: 'none' as const, point: constrained };

    // Update refs immediately (canvas uses these, not state)
    snapRef.current = finalSnap as any;
    previewRef.current = constrained;

    // Batch React state updates (DYN tooltip + coord display) at RAF rate
    // so the UI updates ~60fps without driving a React re-render on every pixel
    pendingCursorRef.current = { world: constrained, screen, preview: constrained };
    if (cursorBatchRaf.current === null) {
      cursorBatchRaf.current = requestAnimationFrame(() => {
        cursorBatchRaf.current = null;
        const p = pendingCursorRef.current;
        if (p) {
          setCurWorld(p.world);
          setCursorScreen(p.screen);
          setPreviewPt(p.preview);
          pendingCursorRef.current = null;
        }
      });
    }

    renderOverlay(screen);
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (e.button === 1) {
      isPanning.current = false;
      panStart.current = null;
      setVp(vpRef.current); // sync zoom% label once after pan finishes
    }

    // End grip drag
    if (gripDragRef.current) {
      setGripDrag(null); gripDragRef.current = null;
      return;
    }

    isMovingSelection.current = false; moveStart.current = null;

    // Finish selection box
    if (selBoxStartRef.current && activeToolRef.current === 'select') {
      const { screen } = getEventPoint(e);
      const startW = selBoxStartRef.current;
      const endW = screenToWorld(screen, vpRef.current);
      const crossing = endW.x < startW.x;
      const minX = Math.min(startW.x, endW.x), maxX = Math.max(startW.x, endW.x);
      const minY = Math.min(startW.y, endW.y), maxY = Math.max(startW.y, endW.y);
      const w = maxX - minX, h = maxY - minY;
      if (w > 2 || h > 2) {
        const ids = state.objects
          .filter(obj => {
            const pts = getObjectPoints(obj);
            if (crossing) {
              // crossing: any point inside box OR object intersects box
              return pts.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
            } else {
              // window: all points inside box
              return pts.length > 0 && pts.every(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
            }
          })
          .map(o => o.id);
        if (ids.length) dispatch({ type: 'SELECT', ids });
      }
      setSelBoxStart(null); selBoxStartRef.current = null;
      selBoxScreenRef.current = null; // ref only — no state update needed
    }
  }

  function handleDblClick() {
    const tool = activeToolRef.current;
    if (tool === 'polyline' && toolPtsRef.current.length >= 2) {
      const pts = toolPtsRef.current;
      dispatch({ type: 'ADD', obj: { id: newId(), type: 'polyline', points: pts, closed: false, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as PolylineObj });
      log(`Polyline  ${pts.length} pts`);
      setToolPts([]);
    }
  }

  // ── Wheel (zoom + trackpad pan) ───────────────────────────────────────────
  // Registered as a native non-passive listener in useEffect below so that
  // e.preventDefault() actually stops the page from scrolling.
  // React's onWheel is passive in React 18 — preventDefault() there is a no-op.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (e.ctrlKey) {
        // Ctrl+wheel OR trackpad pinch (browser synthesises ctrlKey for pinch) → zoom
        const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
        const base = zoomTargetRef.current || vpRef.current;
        zoomTargetRef.current = {
          scale: Math.min(Math.max(base.scale * factor, 0.01), 500),
          x: cx - (cx - base.x) * factor,
          y: cy - (cy - base.y) * factor,
        };
        if (zoomRafRef.current === null) startZoomAnimation();
      } else {
        // Two-finger trackpad scroll → pan (OS provides momentum, no lerp needed)
        vpRef.current = {
          ...vpRef.current,
          x: vpRef.current.x - e.deltaX,
          y: vpRef.current.y - e.deltaY,
        };
        renderRef.current();
        if (panSyncRaf.current === null) {
          panSyncRaf.current = requestAnimationFrame(() => {
            panSyncRaf.current = null;
            setVp(vpRef.current);
          });
        }
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // eslint-disable-line

  // ── Touch (two-finger pan + pinch-zoom for tablet/touch screens) ─────────
  // Must be added via addEventListener with passive:false so preventDefault works
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastTouchesRef.current = [
          { x: e.touches[0].clientX, y: e.touches[0].clientY },
          { x: e.touches[1].clientX, y: e.touches[1].clientY },
        ];
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      e.preventDefault();

      const t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const t1 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const prev = lastTouchesRef.current;
      if (prev.length !== 2) { lastTouchesRef.current = [t0, t1]; return; }

      // Current and previous midpoints (pan)
      const midX = (t0.x + t1.x) / 2;
      const midY = (t0.y + t1.y) / 2;
      const prevMidX = (prev[0].x + prev[1].x) / 2;
      const prevMidY = (prev[0].y + prev[1].y) / 2;
      const panDx = midX - prevMidX;
      const panDy = midY - prevMidY;

      // Current and previous spread (pinch zoom)
      const curSpread = Math.hypot(t1.x - t0.x, t1.y - t0.y);
      const prevSpread = Math.hypot(prev[1].x - prev[0].x, prev[1].y - prev[0].y);
      const pinchFactor = prevSpread > 1 ? curSpread / prevSpread : 1;

      const rect = el!.getBoundingClientRect();
      const pivotX = midX - rect.left;
      const pivotY = midY - rect.top;
      const cur = vpRef.current;
      const newScale = Math.min(Math.max(cur.scale * pinchFactor, 0.01), 500);

      vpRef.current = {
        scale: newScale,
        x: pivotX - (pivotX - cur.x) * pinchFactor + panDx,
        y: pivotY - (pivotY - cur.y) * pinchFactor + panDy,
      };
      renderRef.current();

      lastTouchesRef.current = [t0, t1];

      if (panSyncRaf.current === null) {
        panSyncRaf.current = requestAnimationFrame(() => {
          panSyncRaf.current = null;
          setVp(vpRef.current);
        });
      }
    }

    function onTouchEnd(e: TouchEvent) {
      lastTouchesRef.current = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
      if (e.touches.length === 0) setVp(vpRef.current);
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // eslint-disable-line

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const tool = activeToolRef.current;

    // Build context menu items
    const items: { label: string; fn: () => void }[] = [];

    if (tool === 'polyline' && toolPtsRef.current.length >= 2) {
      items.push({ label: 'Close', fn: () => {
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'polyline', points: toolPtsRef.current, closed: true, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as PolylineObj });
        setToolPts([]); setActiveTool('select'); setCtxMenu(null);
      }});
      items.push({ label: 'Enter (finish open)', fn: () => {
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'polyline', points: toolPtsRef.current, closed: false, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as PolylineObj });
        log(`Polyline  ${toolPtsRef.current.length} pts`);
        setToolPts([]); setActiveTool('select'); setCtxMenu(null);
      }});
    }

    if (toolPtsRef.current.length > 0) {
      items.push({ label: 'Undo last point', fn: () => { setToolPts(p => p.slice(0, -1)); setCtxMenu(null); }});
    }

    const sel = state.objects.filter(o => o.selected);
    if (sel.length > 0) {
      items.push({ label: `Delete ${sel.length} object(s)`, fn: () => { dispatch({ type: 'DELETE', ids: sel.map(o => o.id) }); setCtxMenu(null); }});
      items.push({ label: 'Move', fn: () => { activateTool('move'); setCtxMenu(null); }});
      items.push({ label: 'Copy', fn: () => { activateTool('copy'); setCtxMenu(null); }});
      items.push({ label: 'Rotate', fn: () => { activateTool('rotate'); setCtxMenu(null); }});
      items.push({ label: 'Scale', fn: () => { activateTool('scale'); setCtxMenu(null); }});
    }

    items.push({ label: '─────────', fn: () => {} });
    items.push({ label: 'Undo (Ctrl+Z)', fn: () => { dispatchUndo(); setCtxMenu(null); }});
    items.push({ label: 'Redo (Ctrl+Y)', fn: () => { dispatchRedo(); setCtxMenu(null); }});
    items.push({ label: 'Zoom Fit', fn: () => { zoomExtents(); setCtxMenu(null); }});
    items.push({ label: 'Cancel (Esc)', fn: () => {
      setToolPts([]); setPreviewPt(null);
      if (!['select', 'erase'].includes(tool)) setActiveTool('select');
      setCtxMenu(null);
    }});

    const rect = mainRef.current!.getBoundingClientRect();
    setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, items });
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (pendingText !== null) return;

      // ── Function keys (match AutoCAD exactly) ─────────────────────────────
      // X = explode shortcut (when command line not focused and objects are selected)
      if (e.key.toUpperCase() === 'X' && document.activeElement !== cmdRef.current && state.objects.some(o => o.selected)) {
        cmdRef.current?.focus();
        if (cmdRef.current) { cmdRef.current.value = 'x'; handleCommand('x'); setCmdText(''); }
        return;
      }

      if (e.key === 'F3')  { e.preventDefault(); const v = !osnapRef.current; setOsnap(v); osnapRef.current = v; log(`OSNAP ${v ? 'ON' : 'OFF'}`); return; }
      if (e.key === 'F7')  { e.preventDefault(); setGridVisible(v => !v); return; }
      if (e.key === 'F8')  { e.preventDefault(); const v = !orthoRef.current; setOrtho(v); orthoRef.current = v; log(`ORTHO ${v ? 'ON' : 'OFF'}`); return; }
      if (e.key === 'F9')  { e.preventDefault(); setGridSnap(v => !v); return; }
      if (e.key === 'F10') { e.preventDefault(); const v = !polarRef.current; setPolar(v); polarRef.current = v; log(`POLAR ${v ? 'ON' : 'OFF'}`); return; }
      if (e.key === 'F11') { e.preventDefault(); const v = !polarRef.current; setPolar(v); polarRef.current = v; log(`OTRACK ${v ? 'ON' : 'OFF'}`); return; }
      if (e.key === 'F12') { e.preventDefault(); const v = !dynModeRef.current; setDynMode(v); dynModeRef.current = v; log(`DYN ${v ? 'ON' : 'OFF'}`); return; }

      // ── Ctrl / Meta shortcuts ──────────────────────────────────────────────
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && (e.key === 'Z' || e.key === 'z')) { e.preventDefault(); dispatchRedo(); return; }  // Ctrl+Shift+Z
        if (e.key === 'z') { e.preventDefault(); dispatchUndo(); return; }
        if (e.key === 'y') { e.preventDefault(); dispatchRedo(); return; }
        if (e.key === 's') { e.preventDefault(); handleSave(); return; }
        if (e.key === 'a') { e.preventDefault(); dispatch({ type: 'SELECT', ids: state.objects.map(o => o.id) }); return; }
        return; // block Ctrl+other from leaking into tool shortcuts below
      }

      if (e.key === 'Escape') {
        setToolPts([]);
        setPreviewPt(null);
        dispatch({ type: 'DESELECT_ALL' });
        setActiveTool('select');
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = state.objects.filter(o => o.selected).map(o => o.id);
        if (sel.length) { dispatch({ type: 'DELETE', ids: sel }); log(`Deleted ${sel.length} object(s)`); }
        return;
      }

      // ── Space / Enter — repeat last command (AutoCAD behaviour) ───────────
      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement === cmdRef.current) return; // let command line handle it
        e.preventDefault();
        if (activeToolRef.current === 'select' && lastCommandRef.current) {
          activateTool(lastCommandRef.current);
        } else {
          cmdRef.current?.focus();
        }
        return;
      }

      // ── Single-key tool shortcuts (only when command line not focused) ─────
      // Matches AutoCAD default alias list exactly.
      // Note: T = MTEXT (AutoCAD standard); R is REDRAW in AutoCAD — not rectangle (use REC).
      if (document.activeElement !== cmdRef.current) {
        switch (e.key.toUpperCase()) {
          case 'L': activateTool('line'); break;
          case 'C': activateTool('circle'); break;
          case 'A': activateTool('arc3pt'); break;
          case 'E': activateTool('erase'); break;
          case 'M': activateTool('move'); break;
          case 'T': activateTool('mtext'); break;    // AutoCAD T = MTEXT
          case 'S': activateTool('stretch'); break;
          case 'O': activateTool('offset'); break;
          case 'H': activateTool('hatch'); break;
          case 'F': activateTool('fillet'); break;
          case 'J': activateTool('join'); break;
          case 'W': activateTool('wall'); break;     // construction shortcut (custom)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.objects, pendingText]);

  // ── Undo/Redo ─────────────────────────────────────────────────────────────

  function dispatchUndo() { dispatch({ type: 'UNDO' }); log('Undo'); }
  function dispatchRedo() { dispatch({ type: 'REDO' }); log('Redo'); }

  // ── Command line ──────────────────────────────────────────────────────────

  function handleCommand(raw: string) {
    const input = raw.trim().toLowerCase();
    if (!input) { setToolPts([]); return; }

    // Numeric input while tool is active
    const toolActive = activeToolRef.current;
    const pts = toolPtsRef.current;
    const pp = previewRef.current;

    if (toolActive === 'line' && pts.length === 1 && pp) {
      const val = parseFloat(input);
      if (!isNaN(val)) {
        const anchor = pts[0];
        const dx = pp.x - anchor.x; const dy = pp.y - anchor.y;
        const angle = Math.atan2(dy, dx);
        const endPt = { x: anchor.x + val * Math.cos(angle), y: anchor.y + val * Math.sin(angle) };
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'line', start: anchor, end: endPt, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as LineObj });
        log(`Line L=${val}`);
        setToolPts([endPt]);
        setCmdText(''); return;
      }
    }

    // Rotate: type angle while base point set
    if (toolActive === 'rotate' && pts.length === 1) {
      const val = parseFloat(input);
      if (!isNaN(val)) {
        const angle = (val * Math.PI) / 180;
        dispatch({ type: 'ROTATE_SELECTED', angle, cx: pts[0].x, cy: pts[0].y });
        log(`Rotated ${val}°`);
        setToolPts([]); setActiveTool('select'); setCmdText(''); return;
      }
    }

    // Scale: type factor while base point set
    if (toolActive === 'scale' && pts.length === 1) {
      const val = parseFloat(input);
      if (!isNaN(val) && val > 0) {
        dispatch({ type: 'SCALE_SELECTED', factor: val, cx: pts[0].x, cy: pts[0].y });
        log(`Scaled ×${val}`);
        setToolPts([]); setActiveTool('select'); setCmdText(''); return;
      }
    }

    // Fillet radius: R <value>
    if (input.startsWith('r ') || input.startsWith('r')) {
      const val = parseFloat(input.slice(1).trim());
      if (!isNaN(val)) {
        setFilletRadius(val); filletRadiusRef.current = val;
        log(`Fillet radius: ${val}`); setCmdText(''); return;
      }
    }

    // Offset distance: O <value>
    if (toolActive === 'offset' && pts.length === 0) {
      const val = parseFloat(input);
      if (!isNaN(val)) { setOffsetDist(val); log(`Offset dist: ${val}`); setCmdText(''); return; }
    }

    if (input === 'close' || input === 'c') {
      if (toolActive === 'polyline' && pts.length >= 2) {
        dispatch({ type: 'ADD', obj: { id: newId(), type: 'polyline', points: pts, closed: true, layer: currentLayer, color: 'bylayer', lineWeight: 0.25, lineType: 'continuous', selected: false } as PolylineObj });
        log('Polyline closed'); setToolPts([]); setCmdText(''); return;
      }
    }

    if (input === 'u' || input === 'undo') { dispatchUndo(); setCmdText(''); return; }

    // EXPLODE — break selected objects into primitives
    if (input === 'x' || input === 'explode') {
      const sel = state.objects.filter(o => o.selected);
      if (!sel.length) { log('EXPLODE: select objects first, then type X.'); setCmdText(''); return; }
      const newObjs: CADObj[] = [];
      const delIds: string[] = [];
      for (const obj of sel) {
        if (obj.type === 'polyline') {
          for (let i = 0; i < obj.points.length - 1; i++) {
            newObjs.push({ id: newId(), type: 'line', start: obj.points[i], end: obj.points[i+1], layer: obj.layer, color: obj.color, lineWeight: obj.lineWeight, lineType: obj.lineType, selected: false } as LineObj);
          }
          if (obj.closed && obj.points.length > 2) newObjs.push({ id: newId(), type: 'line', start: obj.points[obj.points.length-1], end: obj.points[0], layer: obj.layer, color: obj.color, lineWeight: obj.lineWeight, lineType: obj.lineType, selected: false } as LineObj);
          delIds.push(obj.id);
        } else if (obj.type === 'rect') {
          const { p1, p2 } = obj;
          const corners = [p1, {x:p2.x,y:p1.y}, p2, {x:p1.x,y:p2.y}];
          for (let i = 0; i < 4; i++) newObjs.push({ id: newId(), type: 'line', start: corners[i], end: corners[(i+1)%4], layer: obj.layer, color: obj.color, lineWeight: obj.lineWeight, lineType: obj.lineType, selected: false } as LineObj);
          delIds.push(obj.id);
        } else if (obj.type === 'wall') {
          newObjs.push({ id: newId(), type: 'line', start: obj.start, end: obj.end, layer: obj.layer, color: obj.color, lineWeight: obj.lineWeight, lineType: obj.lineType, selected: false } as LineObj);
          delIds.push(obj.id);
        }
      }
      if (delIds.length) {
        dispatch({ type: 'DELETE', ids: delIds });
        if (newObjs.length) dispatch({ type: 'ADD_MANY', objs: newObjs });
        log(`Exploded ${delIds.length} object(s) → ${newObjs.length} primitives`);
      } else { log('EXPLODE: no explodable objects in selection.'); }
      setCmdText(''); return;
    }

    // ZOOM sub-commands — Z alone = extents (AutoCAD: Z → E for extents is most common)
    if (input === 'z' || input === 'zoom' || input === 'zoom all' || input === 'za' || input === 'ze') { zoomExtents(); setCmdText(''); return; }
    if (input === 'zoom in'  || input === 'zi') { zoomStep(1.5);       setCmdText(''); return; }
    if (input === 'zoom out' || input === 'zo') { zoomStep(1 / 1.5);   setCmdText(''); return; }
    if (input === 'zoom window' || input === 'zw') {
      log('Zoom Window: click first corner then second corner (use select box)'); setCmdText(''); return;
    }

    // LENGTHEN: increment input while lengthen tool active
    if (toolActive === 'lengthen' && (toolPtsRef.current as any)._lenId) {
      const lenId = (toolPtsRef.current as any)._lenId;
      const lenObj = state.objects.find(o => o.id === lenId);
      if (lenObj && (lenObj.type === 'line' || lenObj.type === 'wall')) {
        const line = lenObj as LineObj;
        const curLen = dist(line.start, line.end);
        let newLen = curLen;
        if (input.startsWith('+')) newLen = curLen + parseFloat(input.slice(1));
        else if (input.startsWith('-')) newLen = Math.max(1, curLen - parseFloat(input.slice(1)));
        else { const v = parseFloat(input); if (!isNaN(v) && v > 0) newLen = v; }
        if (!isNaN(newLen) && newLen > 0) {
          const f = newLen / curLen;
          const cx = line.start.x, cy = line.start.y;
          dispatch({ type: 'UPDATE', id: lenId, patch: { end: { x: cx + (line.end.x - cx) * f, y: cy + (line.end.y - cy) * f } } as any });
          log(`LENGTHEN: new length=${newLen.toFixed(2)}`);
          setToolPts([]); setActiveTool('select'); dispatch({ type: 'DESELECT_ALL' });
        }
        setCmdText(''); return;
      }
    }

    // CHAMFER distance shortcut: cha d 50
    if (input.startsWith('cha d')) {
      const val = parseFloat(input.slice(5).trim());
      if (!isNaN(val)) { setFilletRadius(val); filletRadiusRef.current = val; log(`Chamfer distance: ${val}`); }
      setCmdText(''); return;
    }

    // @x,y relative coords
    if (input.startsWith('@') && pts.length > 0) {
      const anchor = pts[pts.length - 1];
      const rel = input.slice(1);
      if (rel.includes('<')) {
        const [r, a] = rel.split('<').map(Number);
        const ang = (a * Math.PI) / 180;
        const pt = { x: anchor.x + r * Math.cos(ang), y: anchor.y + r * Math.sin(ang) };
        addPointToTool(pt); setCmdText(''); return;
      }
      const [dx, dy] = rel.split(',').map(Number);
      if (!isNaN(dx) && !isNaN(dy)) {
        addPointToTool({ x: anchor.x + dx, y: anchor.y + dy }); setCmdText(''); return;
      }
    }

    // absolute x,y
    if (input.includes(',') && !input.startsWith('@')) {
      const [x, y] = input.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) { addPointToTool({ x, y }); setCmdText(''); return; }
    }

    const tool = TOOL_ALIASES[input];
    if (tool) { activateTool(tool); setCmdText(''); return; }

    log(`Unknown command: ${input}`);
    setCmdText('');
  }

  function addPointToTool(pt: Point) {
    const e = { clientX: 0, clientY: 0, button: 0, shiftKey: false } as any;
    const fakeEvent = { ...e, button: 0, shiftKey: false };
    const savedSnap = snapRef.current;
    snapRef.current = { type: 'endpoint', point: pt };
    // simulate click
    const newPts = [...toolPtsRef.current, pt];
    setToolPts(newPts);
    snapRef.current = savedSnap;
  }

  // ── Tool activation ───────────────────────────────────────────────────────

  function activateTool(tool: ToolType) {
    setActiveTool(tool);
    activeToolRef.current = tool;
    if (tool !== 'select') lastCommandRef.current = tool;
    setToolPts([]);
    toolPtsRef.current = [];
    setPreviewPt(null);
    setBreakObjId(null); breakObjRef.current = null;
    setStretchBox(null); stretchBoxRef.current = null;
    dispatch({ type: 'DESELECT_ALL' });
    const prompts: Record<string, string> = {
      line: 'LINE Specify first point:',
      polyline: 'PLINE Specify start point: [Arc/Close/Halfwidth/Length/Undo/Width]',
      circle: 'CIRCLE Specify center point: [3P/2P/Ttr]',
      arc3pt: 'ARC Specify start point: [Center/End]',
      rectangle: 'RECTANG Specify first corner: [Chamfer/Fillet/Width]',
      wall: 'WALL Specify start point:',
      text: 'TEXT Specify start point: [Justify/Style]',
      mtext: 'MTEXT Specify first corner:',
      move: 'MOVE Specify base point: [Displacement]',
      copy: 'COPY Specify base point: [Displacement/mOde]',
      rotate: 'ROTATE Specify base point: [Copy/Reference]',
      scale: 'SCALE Specify base point: [Copy/Reference]',
      mirror: 'MIRROR Specify first point of mirror line: [Erase source objects?]',
      offset: 'OFFSET Specify offset distance or [Through/Erase/Layer]:',
      trim: 'TRIM Select cutting edges... [Fence/Crossing/Project/Edge/eRase/Undo]:',
      extend: 'EXTEND Select boundary edges... [Fence/Crossing/Project/Edge/Undo]:',
      fillet: 'FILLET Select first object: [Undo/Polyline/Radius/Trim/mUltiple]',
      chamfer: 'CHAMFER Select first line: [Undo/Polyline/Distance/Angle/Trim/mEthod]',
      break: 'BREAK Select object:',
      join: 'JOIN Select source object:',
      stretch: 'STRETCH Select objects with crossing window: first corner',
      lengthen: 'LENGTHEN Select object: [DElta/Percent/Total/DYnamic]',
      erase: 'ERASE Select objects:',
      array: 'ARRAY Select objects: [Rectangular/PAth/POlar]',
      leader: 'LEADER Specify leader start point:',
      hatch: 'HATCH Pick internal point or [Select objects/Undo/seTtings]:',
      dimlinear: 'DIMLINEAR Specify first extension line origin:',
      dimaligned: 'DIMALIGNED Specify first extension line origin:',
      dimradius: 'DIMRADIUS Select arc or circle:',
      door: 'INSERT DOOR Specify insertion point:',
      window: 'INSERT WINDOW Specify insertion point:',
      stairs: 'INSERT STAIRS Specify insertion point:',
    };
    log(prompts[tool] ?? `${tool.toUpperCase()} Specify first point:`);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    const json = JSON.stringify({ objects: state.objects, layers: state.layers });
    try { await onSave(json); setLastSaved(new Date()); log('Drawing saved.'); }
    catch { log('Save failed!'); }
    finally { setSaving(false); }
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  function zoomStep(factor: number) {
    const cur = vpRef.current;
    const w = mainRef.current!.clientWidth / 2;
    const h = mainRef.current!.clientHeight / 2;
    const newVp = {
      scale: Math.min(Math.max(cur.scale * factor, 0.01), 500),
      x: w - (w - cur.x) * factor,
      y: h - (h - cur.y) * factor,
    };
    vpRef.current = newVp; setVp(newVp);
  }

  function zoomExtents() {
    if (state.objects.length === 0) { setVp({ x: 400, y: 300, scale: 1 }); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const obj of state.objects) {
      const pts = getObjectPoints(obj);
      for (const p of pts) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
    }
    const w = mainRef.current!.clientWidth;
    const h = mainRef.current!.clientHeight;
    const dw = maxX - minX || 100; const dh = maxY - minY || 100;
    const sc = Math.min(w / dw, h / dh) * 0.8;
    const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
    const newVp = { scale: sc, x: w / 2 - cx * sc, y: h / 2 + cy * sc };
    vpRef.current = newVp; setVp(newVp);
    log('Zoom Extents');
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async function exportPNG() {
    const canvas = mainRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${projectName.replace(/\s+/g, '_')}_drawing.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function exportDXF() {
    let dxf = '0\nSECTION\n2\nENTITIES\n';
    for (const obj of state.objects) {
      const layer = state.layers.find(l => l.id === obj.layer) ?? state.layers[0];
      if (!layer.visible) continue;
      if (obj.type === 'line') {
        dxf += `0\nLINE\n8\n${obj.layer}\n10\n${obj.start.x.toFixed(4)}\n20\n${obj.start.y.toFixed(4)}\n30\n0\n11\n${obj.end.x.toFixed(4)}\n21\n${obj.end.y.toFixed(4)}\n31\n0\n`;
      } else if (obj.type === 'circle') {
        dxf += `0\nCIRCLE\n8\n${obj.layer}\n10\n${obj.center.x.toFixed(4)}\n20\n${obj.center.y.toFixed(4)}\n30\n0\n40\n${obj.radius.toFixed(4)}\n`;
      } else if (obj.type === 'arc') {
        const sa = (obj.startAngle * 180 / Math.PI + 360) % 360;
        const ea = (obj.endAngle * 180 / Math.PI + 360) % 360;
        dxf += `0\nARC\n8\n${obj.layer}\n10\n${obj.center.x.toFixed(4)}\n20\n${obj.center.y.toFixed(4)}\n30\n0\n40\n${obj.radius.toFixed(4)}\n50\n${sa.toFixed(4)}\n51\n${ea.toFixed(4)}\n`;
      } else if (obj.type === 'text') {
        dxf += `0\nTEXT\n8\n${obj.layer}\n10\n${obj.pos.x.toFixed(4)}\n20\n${obj.pos.y.toFixed(4)}\n30\n0\n40\n${obj.height.toFixed(4)}\n1\n${obj.content}\n`;
      } else if (obj.type === 'mtext') {
        dxf += `0\nMTEXT\n8\n${obj.layer}\n10\n${obj.pos.x.toFixed(4)}\n20\n${obj.pos.y.toFixed(4)}\n30\n0\n40\n${obj.height.toFixed(4)}\n41\n${obj.width.toFixed(4)}\n1\n${obj.content}\n`;
      } else if (obj.type === 'polyline') {
        dxf += `0\nPOLYLINE\n8\n${obj.layer}\n66\n1\n`;
        obj.points.forEach(p => {
          dxf += `0\nVERTEX\n8\n${obj.layer}\n10\n${p.x.toFixed(4)}\n20\n${p.y.toFixed(4)}\n30\n0\n`;
        });
        dxf += `0\nSEQEND\n`;
      }
    }
    dxf += '0\nENDSEC\n0\nEOF\n';
    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${projectName.replace(/\s+/g, '_')}.dxf`;
    a.href = url; a.click();
    URL.revokeObjectURL(url);
    log('DXF exported.');
  }

  async function exportSVG() {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" style="background:#1e1e1e">`;
    for (const obj of state.objects) {
      const layer = state.layers.find(l => l.id === obj.layer) ?? state.layers[0];
      if (!layer.visible) continue;
      const color = obj.color === 'bylayer' ? layer.color : obj.color;
      const lw = obj.lineWeight || layer.lineWeight;
      switch (obj.type) {
        case 'line':
          svg += `<line x1="${obj.start.x}" y1="${-obj.start.y}" x2="${obj.end.x}" y2="${-obj.end.y}" stroke="${color}" stroke-width="${lw}"/>`;
          break;
        case 'circle':
          svg += `<circle cx="${obj.center.x}" cy="${-obj.center.y}" r="${obj.radius}" stroke="${color}" stroke-width="${lw}" fill="none"/>`;
          break;
        case 'rect':
          const x = Math.min(obj.p1.x, obj.p2.x); const y = -Math.max(obj.p1.y, obj.p2.y);
          const w2 = Math.abs(obj.p2.x - obj.p1.x); const h2 = Math.abs(obj.p2.y - obj.p1.y);
          svg += `<rect x="${x}" y="${y}" width="${w2}" height="${h2}" stroke="${color}" stroke-width="${lw}" fill="none"/>`;
          break;
        case 'text':
          svg += `<text x="${obj.pos.x}" y="${-obj.pos.y}" fill="${color}" font-size="${obj.height}">${obj.content}</text>`;
          break;
      }
    }
    svg += `</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${projectName.replace(/\s+/g, '_')}_drawing.svg`;
    link.href = url; link.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function log(msg: string) {
    setCmdLog(prev => [...prev.slice(-50), msg]);
  }

  function fmt(p: Point) { return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }

  // ── Text input ────────────────────────────────────────────────────────────

  function submitText() {
    if (!pendingText || !textInput.trim()) { setPendingText(null); return; }
    dispatch({ type: 'ADD', obj: { id: newId(), type: 'text', pos: pendingText, content: textInput, height: textHeight, rotation: 0, layer: 'text', color: '#ffff00', lineWeight: 0.18, lineType: 'continuous', selected: false } as TextObj });
    log(`Text: "${textInput}"`);
    setPendingText(null); setTextInput('');
  }

  function submitMText() {
    if (!pendingMText || !mtextInput.trim()) { setPendingMText(null); return; }
    dispatch({ type: 'ADD', obj: { id: newId(), type: 'mtext', pos: pendingMText, content: mtextInput, height: textHeight, width: mtextWidth, rotation: 0, layer: 'text', color: '#ffff00', lineWeight: 0.18, lineType: 'continuous', selected: false } as MTextObj });
    log(`MText added`);
    setPendingMText(null); setMTextInput('');
  }

  function handleArrayConfirm() {
    const sel = state.objects.filter(o => o.selected);
    if (!sel.length) { log('Array: no objects selected.'); setShowArrayDialog(false); return; }

    if (arrayType === 'rect') {
      const newObjs = executeArray(sel, arrayRows, arrayCols, arrayRowSpacing, arrayColSpacing);
      dispatch({ type: 'ADD_MANY', objs: newObjs });
      log(`Array: ${arrayRows}×${arrayCols} = ${newObjs.length} new objects`);
    } else {
      // Polar array — rotate copies around center point
      const cx = polarArrayCenter?.x ?? 0, cy = polarArrayCenter?.y ?? 0;
      const totalRad = (polarArrayAngle * Math.PI) / 180;
      const step = totalRad / polarArrayCount;
      const newObjs: CADObj[] = [];
      for (let i = 1; i < polarArrayCount; i++) {
        const angle = step * i;
        const cos_a = Math.cos(angle), sin_a = Math.sin(angle);
        const rot = (p: Point): Point => ({
          x: cx + (p.x - cx)*cos_a - (p.y - cy)*sin_a,
          y: cy + (p.x - cx)*sin_a + (p.y - cy)*cos_a,
        });
        for (const obj of sel) {
          const rotated = (() => {
            switch (obj.type) {
              case 'line': case 'wall': return { ...obj, id: newId(), start: rot(obj.start), end: rot(obj.end), selected: false };
              case 'circle': case 'arc': return { ...obj, id: newId(), center: rot(obj.center), selected: false };
              case 'rect': return { ...obj, id: newId(), p1: rot(obj.p1), p2: rot(obj.p2), selected: false };
              case 'polyline': return { ...obj, id: newId(), points: obj.points.map(rot), selected: false };
              case 'text': case 'mtext': return { ...obj, id: newId(), pos: rot(obj.pos), rotation: obj.rotation + angle, selected: false };
              case 'block': return { ...obj, id: newId(), pos: rot(obj.pos), rotation: obj.rotation + angle, selected: false };
              default: return { ...obj, id: newId(), selected: false };
            }
          })();
          newObjs.push(rotated as CADObj);
        }
      }
      dispatch({ type: 'ADD_MANY', objs: newObjs });
      log(`Polar array: ${polarArrayCount} items = ${newObjs.length} new objects`);
    }

    setShowArrayDialog(false); setActiveTool('select');
  }

  // ── Cursor style ──────────────────────────────────────────────────────────

  const cursorStyle = activeTool === 'select' ? 'default' : 'crosshair';

  // ─────────────────────────────────────────────────────────────────────────
  // 3D viewer (Three.js)
  // ─────────────────────────────────────────────────────────────────────────

  const threeRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    if (!show3D || !threeRef.current) return;
    let renderer: any, scene: any, camera: any, animId: number;

    import('three').then(({ WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, AmbientLight, Mesh, BoxGeometry, MeshLambertMaterial, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, GridHelper, AxesHelper, Color }) => {
      const el = threeRef.current!;
      renderer = new WebGLRenderer({ antialias: true });
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.setClearColor(0x111111);
      el.appendChild(renderer.domElement);

      scene = new Scene();
      camera = new PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 100000);
      camera.position.set(500, 800, 1000);
      camera.lookAt(0, 0, 0);

      scene.add(new AmbientLight(0xffffff, 0.5));
      const dl = new DirectionalLight(0xffffff, 0.8);
      dl.position.set(1000, 2000, 1000);
      scene.add(dl);
      scene.add(new GridHelper(2000, 20, 0x333333, 0x222222));
      scene.add(new AxesHelper(200));

      // Extrude walls into 3D boxes
      const wallHeight = 280;
      for (const obj of state.objects) {
        if (obj.type === 'wall') {
          const dx = obj.end.x - obj.start.x;
          const dy = obj.end.y - obj.start.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) continue;
          const geo = new BoxGeometry(len, wallHeight, obj.thickness);
          const mat = new MeshLambertMaterial({ color: 0xcccccc });
          const mesh = new Mesh(geo, mat);
          const mx = (obj.start.x + obj.end.x) / 2;
          const my = (obj.start.y + obj.end.y) / 2;
          mesh.position.set(mx, wallHeight / 2, -my);
          mesh.rotation.y = -Math.atan2(dy, dx);
          scene.add(mesh);
        }
        if (obj.type === 'rect') {
          const w = Math.abs(obj.p2.x - obj.p1.x);
          const h2 = Math.abs(obj.p2.y - obj.p1.y);
          const geo = new BoxGeometry(w, 10, h2);
          const mat = new MeshLambertMaterial({ color: 0x888888 });
          const mesh = new Mesh(geo, mat);
          mesh.position.set((obj.p1.x + obj.p2.x) / 2, 5, -(obj.p1.y + obj.p2.y) / 2);
          scene.add(mesh);
        }
      }

      // Simple orbit
      let isDragging = false, lastX = 0, lastY = 0;
      let theta = Math.PI / 4, phi = Math.PI / 4, radius = 1500;
      function updateCamera() {
        camera.position.set(
          radius * Math.sin(theta) * Math.cos(phi),
          radius * Math.sin(phi),
          radius * Math.cos(theta) * Math.cos(phi),
        );
        camera.lookAt(0, 0, 0);
      }
      updateCamera();

      renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
      renderer.domElement.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging) return;
        theta -= (e.clientX - lastX) * 0.005;
        phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi - (e.clientY - lastY) * 0.005));
        lastX = e.clientX; lastY = e.clientY;
        updateCamera();
      });
      renderer.domElement.addEventListener('mouseup', () => { isDragging = false; });
      renderer.domElement.addEventListener('wheel', (e: WheelEvent) => { radius = Math.max(100, radius + e.deltaY); updateCamera(); });

      function animate() { animId = requestAnimationFrame(animate); renderer.render(scene, camera); }
      animate();
      sceneRef.current = { renderer, scene, camera };
    });

    return () => {
      cancelAnimationFrame(animId);
      if (sceneRef.current?.renderer) {
        sceneRef.current.renderer.dispose();
        if (threeRef.current && sceneRef.current.renderer.domElement.parentNode === threeRef.current) {
          threeRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
      }
    };
  }, [show3D, state.objects]);

  // ─────────────────────────────────────────────────────────────────────────
  // UI DATA
  // ─────────────────────────────────────────────────────────────────────────

  const propSelect: React.CSSProperties = { width: '100%', background: '#1e1e1e', color: '#ccc', border: '1px solid #3c3c3c', padding: '2px 4px', fontSize: 11, fontFamily: 'Consolas', outline: 'none', borderRadius: 2 };
  const propInput: React.CSSProperties = { width: '100%', background: '#1e1e1e', color: '#ccc', border: '1px solid #3c3c3c', padding: '2px 4px', fontSize: 11, fontFamily: 'Consolas', outline: 'none', borderRadius: 2 };

  const ribbonGroups: { label: string; tools: { tool: ToolType; icon: string; label: string; key?: string }[] }[] = [
    {
      label: 'Draw', tools: [
        { tool: 'line',      icon: '╱',  label: 'Line',    key: 'L' },
        { tool: 'polyline',  icon: '⏢', label: 'Pline',   key: 'PL' },
        { tool: 'rectangle', icon: '▭',  label: 'Rect',    key: 'REC' },
        { tool: 'circle',    icon: '○',  label: 'Circle',  key: 'C' },
        { tool: 'arc3pt',    icon: '⌒',  label: 'Arc',     key: 'A' },
        { tool: 'ellipse',   icon: '⬭',  label: 'Ellipse', key: 'EL' },
        { tool: 'wall',      icon: '▥',  label: 'Wall',    key: 'W' },
        { tool: 'hatch',     icon: '▨',  label: 'Hatch',   key: 'H' },
        { tool: 'text',      icon: 'A',  label: 'Text',    key: 'T' },
        { tool: 'mtext',     icon: '¶',  label: 'MText',   key: 'MT' },
      ],
    },
    {
      label: 'Annotate', tools: [
        { tool: 'dimlinear',  icon: '↔',  label: 'Linear',  key: 'DLI' },
        { tool: 'dimaligned', icon: '⟋',  label: 'Aligned', key: 'DAL' },
        { tool: 'dimradius',  icon: 'R⊙', label: 'Radius',  key: 'DRA' },
        { tool: 'dimangular', icon: '∠',  label: 'Angular', key: 'DAN' },
        { tool: 'leader',     icon: '↗',  label: 'Leader',  key: 'LE' },
        { tool: 'dist',       icon: '📐', label: 'Dist',    key: 'DI' },
      ],
    },
    {
      label: 'Modify', tools: [
        { tool: 'move',     icon: '✥',  label: 'Move',     key: 'M' },
        { tool: 'copy',     icon: '⎘',  label: 'Copy',     key: 'CO' },
        { tool: 'rotate',   icon: '↻',  label: 'Rotate',   key: 'RO' },
        { tool: 'scale',    icon: '⇲',  label: 'Scale',    key: 'SC' },
        { tool: 'mirror',   icon: '⇔',  label: 'Mirror',   key: 'MI' },
        { tool: 'trim',     icon: '✂',  label: 'Trim',     key: 'TR' },
        { tool: 'extend',   icon: '↔',  label: 'Extend',   key: 'EX' },
        { tool: 'offset',   icon: '⟺',  label: 'Offset',   key: 'O' },
        { tool: 'fillet',   icon: '⌣',  label: 'Fillet',   key: 'F' },
        { tool: 'chamfer',  icon: '⌐',  label: 'Chamfer',  key: 'CHA' },
        { tool: 'break',    icon: '✁',  label: 'Break',    key: 'BR' },
        { tool: 'join',     icon: '⊕',  label: 'Join',     key: 'J' },
        { tool: 'stretch',  icon: '⇿',  label: 'Stretch',  key: 'S' },
        { tool: 'lengthen', icon: '↕',  label: 'Length',   key: 'LEN' },
        { tool: 'array',    icon: '⊞',  label: 'Array',    key: 'AR' },
        { tool: 'erase',    icon: '✕',  label: 'Erase',    key: 'E' },
      ],
    },
    {
      label: 'Insert', tools: [
        { tool: 'door',    icon: '🚪', label: 'Door' },
        { tool: 'window',  icon: '⊟',  label: 'Window' },
        { tool: 'stairs',  icon: '⇑',  label: 'Stairs' },
        { tool: 'select',  icon: '↖',  label: 'Select', key: 'V' },
      ],
    },
  ];

  const leftTabs: { id: string; icon: string; label: string }[] = [
    { id: 'properties', icon: '☰', label: 'Prop.' },
    { id: 'layers',     icon: '◫', label: 'Layers' },
    { id: 'osnap',      icon: '⊕', label: 'Snap' },
  ];

  const selectedObjects = state.objects.filter(o => o.selected);

  function renderPropertiesPanel() {
    const sel = selectedObjects;
    // Determine mixed vs uniform values for batch editing
    const mixedLayer = sel.length > 1 && sel.some(o => o.layer !== sel[0].layer);
    const mixedColor = sel.length > 1 && sel.some(o => o.color !== sel[0].color);
    const mixedLT    = sel.length > 1 && sel.some(o => o.lineType !== sel[0].lineType);
    const mixedLW    = sel.length > 1 && sel.some(o => o.lineWeight !== sel[0].lineWeight);
    const dispatchAll = (patch: Record<string, unknown>) =>
      sel.forEach(o => dispatch({ type: 'UPDATE', id: o.id, patch: patch as any }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '8px 10px', background: '#2d2d2d', color: '#ccc', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #3c3c3c', flexShrink: 0 }}>
          {sel.length === 0 ? 'Properties' : sel.length === 1 ? sel[0].type.toUpperCase() : `${sel.length} Objects Selected`}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
          {sel.length === 0 ? (
            <div style={{ padding: '8px 10px', color: '#555', fontSize: 11 }}>No selection</div>
          ) : (
            <div>
              {/* Common props — apply to ALL selected objects */}
              {([
                { label: 'Layer', el: (
                  <select value={mixedLayer ? '' : sel[0].layer} onChange={e => dispatchAll({ layer: e.target.value })} style={propSelect}>
                    {mixedLayer && <option value="">— varies —</option>}
                    {state.layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                )},
                { label: 'Color', el: (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input type="color" value={mixedColor || sel[0].color === 'bylayer' ? '#ffffff' : sel[0].color}
                      onChange={e => dispatchAll({ color: e.target.value })}
                      style={{ width: 20, height: 18, border: 'none', padding: 0, cursor: 'pointer', background: 'none', flexShrink: 0 }} />
                    <select value={mixedColor ? '' : sel[0].color === 'bylayer' ? 'bylayer' : 'custom'}
                      onChange={e => { if (e.target.value === 'bylayer') dispatchAll({ color: 'bylayer' }); }}
                      style={propSelect}>
                      {mixedColor && <option value="">— varies —</option>}
                      <option value="bylayer">ByLayer</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                )},
                { label: 'Linetype', el: (
                  <select value={mixedLT ? '' : sel[0].lineType} onChange={e => dispatchAll({ lineType: e.target.value })} style={propSelect}>
                    {mixedLT && <option value="">— varies —</option>}
                    {['continuous','dashed','dotted','dashdot','hidden','center'].map(lt => <option key={lt} value={lt}>{lt}</option>)}
                  </select>
                )},
                { label: 'Lineweight', el: (
                  <select value={mixedLW ? '' : sel[0].lineWeight} onChange={e => dispatchAll({ lineWeight: +e.target.value })} style={propSelect}>
                    {mixedLW && <option value="">— varies —</option>}
                    {[0.09,0.13,0.18,0.25,0.35,0.5,0.7,1.0].map(w => <option key={w} value={w}>{w} mm</option>)}
                  </select>
                )},
              ] as { label: string; el: React.ReactNode }[]).map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #2a2a2a', padding: '4px 10px', minHeight: 28 }}>
                  <span style={{ width: 90, color: '#888', fontSize: 11, flexShrink: 0 }}>{row.label}</span>
                  <div style={{ flex: 1 }}>{row.el}</div>
                </div>
              ))}

              {/* Type-specific props — only when exactly 1 object selected */}
              {sel.length === 1 && (() => {
                const obj = sel[0];
                const typeRows: { label: string; el: React.ReactNode }[] = [];
                if (obj.type === 'circle')
                  typeRows.push({ label: 'Radius', el: <input type="number" value={obj.radius.toFixed(2)} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { radius: +e.target.value } as any })} style={propInput} /> });
                if (obj.type === 'arc') {
                  typeRows.push({ label: 'Radius', el: <span style={{ color:'#ccc', fontSize:11 }}>{obj.radius.toFixed(1)}</span> });
                  typeRows.push({ label: 'Start °', el: <input type="number" value={(obj.startAngle*180/Math.PI).toFixed(1)} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { startAngle: (+e.target.value)*Math.PI/180 } as any })} style={propInput} /> });
                  typeRows.push({ label: 'End °',   el: <input type="number" value={(obj.endAngle*180/Math.PI).toFixed(1)}   onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { endAngle:   (+e.target.value)*Math.PI/180 } as any })} style={propInput} /> });
                }
                if (obj.type === 'wall') {
                  typeRows.push({ label: 'Thickness', el: <input type="number" value={obj.thickness} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { thickness: +e.target.value } as any })} style={propInput} /> });
                  typeRows.push({ label: 'Length', el: <span style={{ color:'#ccc', fontSize:11 }}>{dist(obj.start, obj.end).toFixed(1)}</span> });
                }
                if (obj.type === 'line')
                  typeRows.push({ label: 'Length', el: <span style={{ color:'#ccc', fontSize:11 }}>{dist(obj.start, obj.end).toFixed(1)}</span> });
                if (obj.type === 'text' || obj.type === 'mtext') {
                  typeRows.push({ label: 'Content', el: <input value={obj.content} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { content: e.target.value } as any })} style={propInput} /> });
                  typeRows.push({ label: 'Height',  el: <input type="number" value={obj.height} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { height: +e.target.value } as any })} style={propInput} /> });
                  typeRows.push({ label: 'Rotation', el: <input type="number" value={(obj.rotation*180/Math.PI).toFixed(1)} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { rotation: (+e.target.value)*Math.PI/180 } as any })} style={propInput} /> });
                }
                if (obj.type === 'block') {
                  typeRows.push({ label: 'Rotation', el: <input type="number" value={(obj.rotation*180/Math.PI).toFixed(1)} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { rotation: (+e.target.value)*Math.PI/180 } as any })} style={propInput} /> });
                  typeRows.push({ label: 'Scale', el: <input type="number" step="0.1" value={obj.scale.toFixed(2)} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { scale: +e.target.value } as any })} style={propInput} /> });
                }
                if (obj.type === 'ellipse') {
                  typeRows.push({ label: 'Rx', el: <input type="number" value={obj.rx.toFixed(1)} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { rx: +e.target.value } as any })} style={propInput} /> });
                  typeRows.push({ label: 'Ry', el: <input type="number" value={obj.ry.toFixed(1)} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { ry: +e.target.value } as any })} style={propInput} /> });
                }
                if (obj.type === 'polyline')
                  typeRows.push({ label: 'Closed', el: <input type="checkbox" checked={obj.closed} onChange={e => dispatch({ type: 'UPDATE', id: obj.id, patch: { closed: e.target.checked } as any })} /> });
                return typeRows.map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #2a2a2a', padding: '4px 10px', minHeight: 28 }}>
                    <span style={{ width: 90, color: '#888', fontSize: 11, flexShrink: 0 }}>{row.label}</span>
                    <div style={{ flex: 1 }}>{row.el}</div>
                  </div>
                ));
              })()}
            </div>
          )}

          <div style={{ borderTop: '1px solid #3c3c3c', marginTop: 4 }}>
            <div style={{ padding: '6px 10px', color: '#888', fontSize: 11, fontWeight: 600 }}>Model Properties</div>
            {[
              { label: 'Wall T', el: <input type="number" value={wallThickness} onChange={e => setWallThickness(+e.target.value)} style={propInput} /> },
              { label: 'Text H', el: <input type="number" value={textHeight} onChange={e => setTextHeight(+e.target.value)} style={propInput} /> },
              { label: 'Fillet R', el: <input type="number" value={filletRadius} onChange={e => { setFilletRadius(+e.target.value); filletRadiusRef.current = +e.target.value; }} style={propInput} /> },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #2a2a2a', padding: '4px 10px', minHeight: 28 }}>
                <span style={{ width: 90, color: '#888', fontSize: 11, flexShrink: 0 }}>{row.label}</span>
                <div style={{ flex: 1 }}>{row.el}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderLayersPanel() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '6px 10px', background: '#2d2d2d', color: '#ccc', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #3c3c3c', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          Layers
          <button onClick={() => { const name = prompt('Layer name:'); if (!name) return; dispatch({ type: 'ADD_LAYER', layer: { id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), name, color: '#ffffff', visible: true, frozen: false, locked: false, lineType: 'continuous', lineWeight: 0.25 } }); }}
            style={{ background: '#0e639c', border: 'none', color: '#fff', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontSize: 10 }}>+ New</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {state.layers.map(layer => (
            <div key={layer.id} onClick={() => { if (renamingLayerId !== layer.id) setCurrentLayer(layer.id); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', background: currentLayer === layer.id ? '#0d3a58' : 'transparent', cursor: 'pointer', borderBottom: '1px solid #2a2a2a' }}>

              {/* Visibility */}
              <button onClick={e => { e.stopPropagation(); dispatch({ type: 'SET_LAYER_PROP', id: layer.id, patch: { visible: !layer.visible } }); }}
                title="Toggle visibility" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, color: layer.visible ? '#ccc' : '#444', lineHeight: 1, flexShrink: 0 }}>👁</button>

              {/* Lock */}
              <button onClick={e => { e.stopPropagation(); dispatch({ type: 'SET_LAYER_PROP', id: layer.id, patch: { locked: !layer.locked } }); }}
                title="Toggle lock" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: layer.locked ? '#f0c040' : '#444', lineHeight: 1, flexShrink: 0 }}>🔒</button>

              {/* Color */}
              <input type="color" value={layer.color} onClick={e => e.stopPropagation()}
                onChange={e => dispatch({ type: 'SET_LAYER_PROP', id: layer.id, patch: { color: e.target.value } })}
                style={{ width: 14, height: 14, border: '1px solid #555', padding: 0, cursor: 'pointer', background: 'none', flexShrink: 0, borderRadius: 2 }} />

              {/* Name — double-click to rename */}
              {renamingLayerId === layer.id ? (
                <input autoFocus value={renameLayerVal}
                  onChange={e => setRenameLayerVal(e.target.value)}
                  onBlur={() => {
                    if (renameLayerVal.trim()) dispatch({ type: 'SET_LAYER_PROP', id: layer.id, patch: { name: renameLayerVal.trim() } });
                    setRenamingLayerId(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.currentTarget.blur(); }
                    if (e.key === 'Escape') { setRenamingLayerId(null); }
                  }}
                  onClick={e => e.stopPropagation()}
                  style={{ flex: 1, background: '#1e1e1e', border: '1px solid #007acc', color: '#fff', fontSize: 11, padding: '1px 4px', outline: 'none' }} />
              ) : (
                <span onDoubleClick={e => { e.stopPropagation(); setRenamingLayerId(layer.id); setRenameLayerVal(layer.name); }}
                  title="Double-click to rename"
                  style={{ flex: 1, fontSize: 11, color: currentLayer === layer.id ? '#9cdcfe' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {layer.name}
                </span>
              )}

              {currentLayer === layer.id && <span style={{ color: '#007acc', fontSize: 10, flexShrink: 0 }}>✓</span>}

              {/* Delete — only non-current layers with no objects */}
              {layer.id !== '0' && currentLayer !== layer.id && (
                <button onClick={e => {
                  e.stopPropagation();
                  const used = state.objects.some(o => o.layer === layer.id);
                  if (used) { log(`Cannot delete layer "${layer.name}" — objects exist on it.`); return; }
                  dispatch({ type: 'DELETE_LAYER', id: layer.id });
                }} title="Delete layer" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: '#555', lineHeight: 1, flexShrink: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderOsnapPanel() {
    return (
      <div style={{ padding: 10 }}>
        <div style={{ color: '#ccc', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Object Snap</div>
        {(Object.keys(snapSettings) as Array<keyof typeof snapSettings>).map(k => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={snapSettings[k]} onChange={() => setSnapSettings(s => ({ ...s, [k]: !s[k] }))}
              style={{ accentColor: SNAP_COLORS[k] ?? '#007acc' }} />
            <span style={{ fontSize: 11, color: snapSettings[k] ? (SNAP_COLORS[k] ?? '#ccc') : '#666', textTransform: 'capitalize' }}>{k}</span>
          </label>
        ))}
        <div style={{ borderTop: '1px solid #333', marginTop: 10, paddingTop: 10 }}>
          <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>Polar angle step</div>
          <input type="number" value={polarAngleStep} onChange={e => { setPolarAngleStep(+e.target.value); polarAngleStepRef.current = +e.target.value; }}
            style={{ ...propInput, width: 60 }} />
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>Hatch pattern</div>
          <select value={hatchPattern} onChange={e => setHatchPattern(e.target.value)} style={propSelect}>
            {['solid','ansi31','ansi32','brick','cross','dots'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN (AutoCAD Web layout)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#1e1e1e', color:'#cccccc', fontFamily:'Consolas,monospace', fontSize:12, userSelect:'none', overflow:'hidden' }}>

      {/* App bar */}
      <div style={{ display:'flex', alignItems:'center', height:28, background:'#111111', borderBottom:'1px solid #2d2d2d', padding:'0 8px', gap:4, flexShrink:0 }}>
        <span style={{ color:'#569cd6', fontWeight:700, fontSize:11, marginRight:6 }}>ConstructIQ CAD</span>
        <div style={{ width:1, height:14, background:'#3c3c3c', margin:'0 2px' }} />
        <button onClick={dispatchUndo} style={acBtn} title="Undo Ctrl+Z">↩ Undo</button>
        <button onClick={dispatchRedo} style={acBtn} title="Redo Ctrl+Y">↪ Redo</button>
        <div style={{ width:1, height:14, background:'#3c3c3c', margin:'0 2px' }} />
        <button onClick={handleSave} style={{ ...acBtn, color: saving ? '#666' : '#6dca6d' }} title="Save Ctrl+S">{saving ? '…' : '💾'} Save</button>
        {lastSaved && <span style={{ color:'#555', fontSize:10 }}>Saved {lastSaved.toLocaleTimeString()}</span>}
        <div style={{ flex:1 }} />
        <button onClick={() => setShow3D(v => !v)} style={{ ...acBtn, color: show3D ? '#569cd6' : '#888' }}>3D</button>
        <button onClick={exportDXF} style={acBtn}>DXF</button>
        <button onClick={exportPNG} style={acBtn}>PNG</button>
        <div style={{ width:1, height:14, background:'#3c3c3c', margin:'0 4px' }} />
        <span style={{ color:'#666', fontSize:11 }}>{projectName}</span>
      </div>

      {/* Ribbon */}
      <div style={{ background:'#2b2b2b', borderBottom:'1px solid #3c3c3c', flexShrink:0, display:'flex', alignItems:'stretch', height:70, overflowX:'auto' }}>
        {ribbonGroups.map((group, gi) => (
          <React.Fragment key={group.label}>
            <div style={{ display:'flex', flexDirection:'column', padding:'4px 6px 0', minWidth:0 }}>
              <div style={{ display:'flex', gap:1, flexWrap:'wrap', maxHeight:48, overflow:'hidden' }}>
                {group.tools.map(t => (
                  <button key={t.tool} onClick={() => activateTool(t.tool)}
                    title={t.label + (t.key ? ' (' + t.key + ')' : '')}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      width:38, height:44, gap:1, padding:'3px 2px 2px',
                      background: activeTool === t.tool ? '#0e639c' : 'transparent',
                      border: activeTool === t.tool ? '1px solid #1f9fe8' : '1px solid transparent',
                      borderRadius:3, cursor:'pointer',
                      color: activeTool === t.tool ? '#fff' : '#c8c8c8',
                    }}
                    onMouseEnter={e => { if(activeTool !== t.tool)(e.currentTarget as HTMLButtonElement).style.background='#3a3a3a'; }}
                    onMouseLeave={e => { if(activeTool !== t.tool)(e.currentTarget as HTMLButtonElement).style.background='transparent'; }}
                  >
                    <span style={{ fontSize:17, lineHeight:1 }}>{t.icon}</span>
                    <span style={{ fontSize:8, opacity:0.85, whiteSpace:'nowrap' }}>{t.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ color:'#666', fontSize:9, textAlign:'center', borderTop:'1px solid #3c3c3c', paddingTop:2, marginTop:'auto' }}>{group.label}</div>
            </div>
            {gi < ribbonGroups.length - 1 && <div style={{ width:1, background:'#3c3c3c', margin:'6px 3px' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Left sidebar tabs */}
        <div style={{ width:44, background:'#1a1a1a', borderRight:'1px solid #2d2d2d', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:4, gap:2, flexShrink:0 }}>
          {leftTabs.map(tab => (
            <button key={tab.id} onClick={() => setLeftPanelTab(v => v === tab.id ? null : tab.id as any)} title={tab.label}
              style={{ width:38, height:44, background: leftPanelTab===tab.id ? '#0e639c' : 'transparent', border: leftPanelTab===tab.id ? '1px solid #1f9fe8' : '1px solid transparent', borderRadius:4, cursor:'pointer', color: leftPanelTab===tab.id ? '#fff' : '#777', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
              <span style={{ fontSize:15 }}>{tab.icon}</span>
              <span style={{ fontSize:8 }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Left panel */}
        {leftPanelTab && (
          <div style={{ width:272, background:'#252526', borderRight:'1px solid #2d2d2d', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
            {leftPanelTab === 'properties' && renderPropertiesPanel()}
            {leftPanelTab === 'layers'     && renderLayersPanel()}
            {leftPanelTab === 'osnap'      && renderOsnapPanel()}
          </div>
        )}

        {/* Canvas */}
        <div ref={containerRef} style={{ flex:1, position:'relative', overflow:'hidden', cursor: gripDragRef.current ? 'crosshair' : cursorStyle, touchAction:'none' }}
          onMouseDown={e => { if(ctxMenu) setCtxMenu(null); handleMouseDown(e); }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDblClick}
          onContextMenu={handleContextMenu}
        >
          <canvas ref={mainRef} style={{ position:'absolute', top:0, left:0 }} />
          <canvas ref={overlayRef} style={{ position:'absolute', top:0, left:0, pointerEvents:'none' }} />

          {/* 3D panel */}
          {show3D && (
            <div style={{ position:'absolute', top:0, right:0, width:'50%', height:'100%', borderLeft:'2px solid #007acc', background:'#111' }}>
              <div style={{ position:'absolute', top:6, left:8, color:'#569cd6', fontSize:11, zIndex:10, pointerEvents:'none' }}>3D View — drag to orbit · scroll to zoom</div>
              <div ref={threeRef} style={{ width:'100%', height:'100%' }} />
            </div>
          )}

          {/* Array dialog */}
          {showArrayDialog && (
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#252526', border:'1px solid #007acc', borderRadius:6, padding:16, zIndex:25, minWidth:300, boxShadow:'0 4px 20px rgba(0,0,0,0.7)' }}>
              <div style={{ color:'#9cdcfe', fontWeight:700, marginBottom:10, fontSize:12 }}>ARRAY</div>
              {/* Type toggle */}
              <div style={{ display:'flex', gap:4, marginBottom:10 }}>
                {(['rect','polar'] as const).map(t => (
                  <button key={t} onClick={() => setArrayType(t)}
                    style={{ flex:1, padding:'3px 0', fontSize:11, background: arrayType===t ? '#007acc' : '#333', color:'#fff', border:'1px solid #555', borderRadius:3, cursor:'pointer', textTransform:'capitalize' }}>
                    {t === 'rect' ? 'Rectangular' : 'Polar'}
                  </button>
                ))}
              </div>

              {arrayType === 'rect' ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {[
                    { label:'Rows',        val:arrayRows,        set:setArrayRows },
                    { label:'Columns',     val:arrayCols,        set:setArrayCols },
                    { label:'Row Spacing', val:arrayRowSpacing,  set:setArrayRowSpacing },
                    { label:'Col Spacing', val:arrayColSpacing,  set:setArrayColSpacing },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ color:'#888', fontSize:10, marginBottom:2 }}>{f.label}</div>
                      <input type="number" value={f.val} onChange={e => f.set(+e.target.value)} style={inputStyle} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {[
                    { label:'Count',       val:polarArrayCount, set:setPolarArrayCount },
                    { label:'Total angle', val:polarArrayAngle, set:setPolarArrayAngle },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ color:'#888', fontSize:10, marginBottom:2 }}>{f.label}</div>
                      <input type="number" value={f.val} onChange={e => f.set(+e.target.value)} style={inputStyle} />
                    </div>
                  ))}
                  <div style={{ gridColumn:'1/-1' }}>
                    <div style={{ color:'#888', fontSize:10, marginBottom:2 }}>Center X, Y (comma-separated)</div>
                    <input placeholder="0,0" style={inputStyle}
                      onBlur={e => { const [x,y]=e.target.value.split(',').map(Number); if(!isNaN(x)&&!isNaN(y)) setPolarArrayCenter({x,y}); }} />
                  </div>
                </div>
              )}

              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button onClick={handleArrayConfirm} style={{ ...btnStyle, background:'#007acc', color:'#fff' }}>OK</button>
                <button onClick={() => setShowArrayDialog(false)} style={btnStyle}>Cancel</button>
              </div>
            </div>
          )}

          {/* Text popup */}
          {pendingText && (
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#252526', border:'1px solid #007acc', borderRadius:6, padding:12, zIndex:20, minWidth:300, boxShadow:'0 4px 20px rgba(0,0,0,0.7)' }}>
              <div style={{ color:'#ccc', marginBottom:8, fontSize:11 }}>TEXT — Enter content:</div>
              <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter') submitText(); if(e.key==='Escape') setPendingText(null); }}
                style={{ width:'100%', background:'#1e1e1e', border:'1px solid #555', color:'#fff', padding:'4px 8px', fontSize:13, fontFamily:'Consolas', outline:'none' }} />
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                <button onClick={submitText} style={{ ...btnStyle, background:'#007acc' }}>OK</button>
                <button onClick={() => setPendingText(null)} style={btnStyle}>Cancel</button>
              </div>
            </div>
          )}

          {/* MText popup */}
          {pendingMText && (
            <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,0)', background:'#252526', border:'1px solid #007acc', borderRadius:6, padding:12, zIndex:20, minWidth:360, boxShadow:'0 4px 20px rgba(0,0,0,0.7)' }}>
              <div style={{ color:'#ccc', marginBottom:4, fontSize:11 }}>MTEXT:</div>
              <textarea autoFocus rows={5} value={mtextInput} onChange={e => setMTextInput(e.target.value)}
                onKeyDown={e => { if(e.ctrlKey && e.key==='Enter') submitMText(); if(e.key==='Escape') setPendingMText(null); }}
                style={{ width:'100%', background:'#1e1e1e', border:'1px solid #555', color:'#fff', padding:'4px 8px', fontSize:13, fontFamily:'Consolas', outline:'none', resize:'vertical' }}
                placeholder="Ctrl+Enter to confirm" />
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                <button onClick={submitMText} style={{ ...btnStyle, background:'#007acc' }}>OK</button>
                <button onClick={() => setPendingMText(null)} style={btnStyle}>Cancel</button>
              </div>
            </div>
          )}

          {/* Right-click context menu */}
          {ctxMenu && (
            <div style={{ position:'absolute', left:ctxMenu.x, top:ctxMenu.y, background:'#2b2b2b', border:'1px solid #555', borderRadius:4, zIndex:100, minWidth:190, boxShadow:'2px 4px 12px rgba(0,0,0,0.7)' }}
              onMouseLeave={() => setCtxMenu(null)}>
              {ctxMenu.items.map((item, i) => (
                <div key={i} onClick={item.label.startsWith('─') ? undefined : item.fn}
                  style={{ padding:'6px 14px', cursor:item.label.startsWith('─') ? 'default' : 'pointer', color:item.label.startsWith('─') ? '#444' : '#ccc', fontSize:11, fontFamily:'Consolas', borderBottom:'1px solid #333' }}
                  onMouseEnter={e => { if(!item.label.startsWith('─'))(e.target as HTMLDivElement).style.background='#094771'; }}
                  onMouseLeave={e => { (e.target as HTMLDivElement).style.background='transparent'; }}
                >{item.label}</div>
              ))}
            </div>
          )}

          {/* DYN input */}
          {dynMode && activeTool !== 'select' && activeTool !== 'erase' && toolPts.length > 0 && previewPt && (
            <div style={{ position:'absolute', left:cursorScreen.x+20, top:cursorScreen.y+10, background:'rgba(26,26,46,0.92)', border:'1px solid #007acc', borderRadius:3, padding:'3px 7px', pointerEvents:'none', fontFamily:'Consolas', fontSize:11, color:'#9cdcfe', zIndex:30, whiteSpace:'nowrap' }}>
              {(() => {
                const last = toolPts[toolPts.length - 1];
                const d = dist(last, previewPt).toFixed(1);
                const dx2 = previewPt.x - last.x, dy2 = previewPt.y - last.y;
                const ang = ((Math.atan2(dy2, dx2) * 180 / Math.PI) + 360) % 360;
                return <><span style={{ color:'#4ec9b0' }}>{d}</span><span style={{ color:'#555', margin:'0 5px' }}>|</span><span style={{ color:'#ffcc00' }}>{ang.toFixed(1)}°</span></>;
              })()}
            </div>
          )}

          {/* Coords overlay */}
          <div style={{ position:'absolute', bottom:6, right:8, color:'#666', fontSize:10, pointerEvents:'none', fontFamily:'Consolas', background:'rgba(0,0,0,0.5)', padding:'1px 5px', borderRadius:2 }}>
            X: {curWorld.x.toFixed(2)}  Y: {curWorld.y.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{ display:'flex', alignItems:'center', background:'#1a1a1a', borderTop:'1px solid #2d2d2d', height:24, flexShrink:0 }}>
        <div style={{ display:'flex', height:'100%' }}>
          {(['model','layout1','layout2'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveLayout(tab)}
              style={{ padding:'0 14px', height:'100%', background: activeLayout===tab ? '#2b2b2b' : 'transparent', border:'none', borderRight:'1px solid #2d2d2d', borderTop: activeLayout===tab ? '2px solid #007acc' : '2px solid transparent', color: activeLayout===tab ? '#ccc' : '#555', cursor:'pointer', fontSize:11, fontFamily:'Consolas' }}>
              {tab==='model' ? 'Model' : tab==='layout1' ? 'Layout1' : 'Layout2'}
            </button>
          ))}
          <button style={{ padding:'0 8px', height:'100%', background:'transparent', border:'none', borderRight:'1px solid #2d2d2d', color:'#555', cursor:'pointer', fontSize:14 }}>+</button>
        </div>
        <div style={{ flex:1 }} />
        {[
          { label:'SNAP & GRID', active:gridSnap, fn:() => setGridSnap(v => !v) },
          { label:'OSNAP',  active:osnap,   fn:() => { const v=!osnap; setOsnap(v); osnapRef.current=v; } },
          { label:'OTRACK', active:polar,   fn:() => { const v=!polar; setPolar(v); polarRef.current=v; } },
          { label:'ORTHO',  active:ortho,   fn:() => { const v=!ortho; setOrtho(v); orthoRef.current=v; } },
          { label:'POLAR',  active:polar,   fn:() => { const v=!polar; setPolar(v); polarRef.current=v; } },
          { label:'DYN',    active:dynMode, fn:() => { const v=!dynMode; setDynMode(v); dynModeRef.current=v; } },
        ].map((s, i) => (
          <button key={i} onClick={s.fn}
            style={{ padding:'0 10px', height:'100%', background:'none', border:'none', borderLeft:'1px solid #2d2d2d', cursor:'pointer', color: s.active ? '#cccccc' : '#555', fontSize:10, fontFamily:'Consolas', fontWeight: s.active ? 700 : 400 }}>
            {s.label}
          </button>
        ))}
        <span style={{ padding:'0 8px', color:'#444', fontSize:10, fontFamily:'Consolas', borderLeft:'1px solid #2d2d2d' }}>{(vp.scale*100).toFixed(0)}%</span>
      </div>

      {/* Command area */}
      <div style={{ background:'#1e1e1e', borderTop:'1px solid #2a2a2a', flexShrink:0, height:88, display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflowY:'auto', padding:'3px 10px 0', fontFamily:'Consolas', fontSize:11 }}>
          {cmdLog.slice(-5).map((line, i, arr) => (
            <div key={i} style={{ color: i===arr.length-1 ? '#cccccc' : '#555', lineHeight:'1.6' }}>{line}</div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', padding:'4px 8px', borderTop:'1px solid #2a2a2a' }}>
          <span style={{ color:'#569cd6', fontSize:14, marginRight:6, lineHeight:1 }}>›</span>
          <input ref={cmdRef} value={cmdText} onChange={e => setCmdText(e.target.value)}
            onKeyDown={e => {
              if(e.key==='Enter') { if(cmdText.trim()) setCmdHistory(h => [cmdText,...h.slice(0,49)]); handleCommand(cmdText); setCmdText(''); setCmdHistoryIdx(-1); }
              if(e.key==='Escape') { setToolPts([]); setActiveTool('select'); setCmdText(''); }
              if(e.key==='ArrowUp') { e.preventDefault(); const n=Math.min(cmdHistoryIdx+1,cmdHistory.length-1); setCmdHistoryIdx(n); if(cmdHistory[n]) setCmdText(cmdHistory[n]); }
              if(e.key==='ArrowDown') { e.preventDefault(); const n=Math.max(cmdHistoryIdx-1,-1); setCmdHistoryIdx(n); setCmdText(n===-1?'':(cmdHistory[n]??'')); }
            }}
            placeholder="Type a command  (L=Line  C=Circle  W=Wall  TR=Trim  F=Fillet  …)"
            style={{ flex:1, background:'transparent', border:'none', color:'#fff', fontSize:12, fontFamily:'Consolas', outline:'none' }}
          />
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions (outside component for perf)
// ─────────────────────────────────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  padding: '3px 8px', background: '#333', border: '1px solid #555',
  color: '#ccc', cursor: 'pointer', borderRadius: 3, fontSize: 11,
  fontFamily: 'Consolas, monospace',
};

const qatBtn: React.CSSProperties = {
  padding: '2px 7px', background: 'transparent', border: '1px solid transparent',
  color: '#aaa', cursor: 'pointer', borderRadius: 2, fontSize: 10,
  fontFamily: 'Consolas, monospace',
};

const acBtn: React.CSSProperties = {
  padding: '2px 8px', background: 'transparent', border: '1px solid transparent',
  color: '#aaa', cursor: 'pointer', borderRadius: 2, fontSize: 10,
  fontFamily: 'Consolas, monospace',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1e1e1e', border: '1px solid #555',
  color: '#ccc', padding: '2px 4px', fontSize: 11, fontFamily: 'Consolas', outline: 'none',
};

// ─── Line intersection utilities ──────────────────────────────────────────────

function executeArray(
  objects: CADObj[], rows: number, cols: number, rowSpacing: number, colSpacing: number,
): CADObj[] {
  const result: CADObj[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) continue;
      const dx = c * colSpacing, dy = r * rowSpacing;
      objects.forEach(o => {
        result.push({ ...moveObj(o, dx, dy), id: Math.random().toString(36).slice(2, 10), selected: false } as CADObj);
      });
    }
  }
  return result;
}

function lineIntersect(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y, x4 = p4.x, y4 = p4.y;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
}

function lineIntersectInfinite(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y, x4 = p4.x, y4 = p4.y;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
}

function applyFillet(
  line1: LineObj, line2: LineObj,
  clickPt2: Point, clickPt1: Point,
  radius: number,
  dispatch: (a: any) => void,
  log: (s: string) => void,
) {
  const isect = lineIntersectInfinite(line1.start, line1.end, line2.start, line2.end);
  if (!isect) { log('Fillet: lines are parallel.'); return; }

  if (radius === 0) {
    // Just trim both lines to intersection
    const d1s = dist(line1.start, isect), d1e = dist(line1.end, isect);
    const d2s = dist(line2.start, isect), d2e = dist(line2.end, isect);
    dispatch({ type: 'UPDATE', id: line1.id, patch: d1s < d1e ? { start: isect } : { end: isect } });
    dispatch({ type: 'UPDATE', id: line2.id, patch: d2s < d2e ? { start: isect } : { end: isect } });
    log('Chamfer (R=0)');
    return;
  }

  const len1 = dist(line1.start, line1.end);
  const len2 = dist(line2.start, line2.end);
  if (len1 < 0.001 || len2 < 0.001) return;

  const d1x = (line1.end.x - line1.start.x) / len1;
  const d1y = (line1.end.y - line1.start.y) / len1;
  const d2x = (line2.end.x - line2.start.x) / len2;
  const d2y = (line2.end.y - line2.start.y) / len2;

  const cos = d1x * d2x + d1y * d2y;
  const halfAngle = Math.acos(Math.min(1, Math.max(-1, cos))) / 2;
  if (Math.abs(halfAngle) < 1e-6) return;
  const t = radius / Math.tan(halfAngle);

  // tangent points: move from intersection along each line direction away from isect
  const i1 = dist(isect, line1.start) < dist(isect, line1.end) ? 1 : -1;
  const i2 = dist(isect, line2.start) < dist(isect, line2.end) ? 1 : -1;
  const T1: Point = { x: isect.x - d1x * t * i1, y: isect.y - d1y * t * i1 };
  const T2: Point = { x: isect.x - d2x * t * i2, y: isect.y - d2y * t * i2 };

  // Arc center: offset each tangent point by radius perpendicular inward
  const perp1 = { x: -d1y * i1, y: d1x * i1 };
  const cx = T1.x + perp1.x * radius;
  const cy = T1.y + perp1.y * radius;

  const startAngle = Math.atan2(T1.y - cy, T1.x - cx);
  const endAngle = Math.atan2(T2.y - cy, T2.x - cx);

  // Trim line1 to T1
  dispatch({ type: 'UPDATE', id: line1.id, patch: dist(line1.start, isect) < dist(line1.end, isect) ? { start: T1 } : { end: T1 } });
  dispatch({ type: 'UPDATE', id: line2.id, patch: dist(line2.start, isect) < dist(line2.end, isect) ? { start: T2 } : { end: T2 } });

  // Add fillet arc
  const arcId = Math.random().toString(36).slice(2, 10);
  dispatch({
    type: 'ADD',
    obj: {
      id: arcId, type: 'arc', center: { x: cx, y: cy }, radius,
      startAngle, endAngle, layer: line1.layer, color: 'bylayer',
      lineWeight: 0.25, lineType: 'continuous', selected: false,
    },
  });
  log(`Fillet R=${radius}`);
}

// ─── Break a line at two points ──────────────────────────────────────────────
function breakLine(obj: LineObj, p1: Point, p2: Point): [LineObj | null, LineObj | null] | null {
  const start = obj.start, end = obj.end;
  // Project p1 and p2 onto the line
  const project = (p: Point): number => {
    const dx = end.x - start.x, dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-10) return 0;
    return Math.max(0, Math.min(1, ((p.x - start.x) * dx + (p.y - start.y) * dy) / len2));
  };
  let t1 = project(p1), t2 = project(p2);
  if (t1 > t2) [t1, t2] = [t2, t1];
  const pt1: Point = { x: start.x + t1 * (end.x - start.x), y: start.y + t1 * (end.y - start.y) };
  const pt2: Point = { x: start.x + t2 * (end.x - start.x), y: start.y + t2 * (end.y - start.y) };
  const base = { id: newId(), type: 'line' as const, layer: obj.layer, color: obj.color, lineWeight: obj.lineWeight, lineType: obj.lineType, selected: false };
  const seg1: LineObj | null = t1 > 0.001 ? { ...base, id: newId(), start, end: pt1 } : null;
  const seg2: LineObj | null = t2 < 0.999 ? { ...base, id: newId(), start: pt2, end } : null;
  return [seg1, seg2];
}

// ─── Chamfer: straight cut at distance from intersection ─────────────────────
function applyChamfer(
  line1: LineObj, line2: LineObj,
  clickPt1: Point, clickPt2: Point,
  dist1: number,
  dispatch: (a: any) => void,
  log: (s: string) => void,
) {
  const isect = lineIntersectInfinite(line1.start, line1.end, line2.start, line2.end);
  if (!isect) { log('Chamfer: parallel lines.'); return; }
  const len1 = Math.sqrt((line1.end.x - line1.start.x) ** 2 + (line1.end.y - line1.start.y) ** 2);
  const len2 = Math.sqrt((line2.end.x - line2.start.x) ** 2 + (line2.end.y - line2.start.y) ** 2);
  if (!len1 || !len2) return;
  const d1x = (line1.end.x - line1.start.x) / len1, d1y = (line1.end.y - line1.start.y) / len1;
  const d2x = (line2.end.x - line2.start.x) / len2, d2y = (line2.end.y - line2.start.y) / len2;
  const i1 = Math.sqrt((isect.x - line1.start.x) ** 2 + (isect.y - line1.start.y) ** 2) < Math.sqrt((isect.x - line1.end.x) ** 2 + (isect.y - line1.end.y) ** 2) ? 1 : -1;
  const i2 = Math.sqrt((isect.x - line2.start.x) ** 2 + (isect.y - line2.start.y) ** 2) < Math.sqrt((isect.x - line2.end.x) ** 2 + (isect.y - line2.end.y) ** 2) ? 1 : -1;
  const T1: Point = { x: isect.x - d1x * dist1 * i1, y: isect.y - d1y * dist1 * i1 };
  const T2: Point = { x: isect.x - d2x * dist1 * i2, y: isect.y - d2y * dist1 * i2 };
  dispatch({ type: 'UPDATE', id: line1.id, patch: (Math.sqrt((isect.x - line1.start.x) ** 2 + (isect.y - line1.start.y) ** 2) < Math.sqrt((isect.x - line1.end.x) ** 2 + (isect.y - line1.end.y) ** 2)) ? { start: T1 } : { end: T1 } });
  dispatch({ type: 'UPDATE', id: line2.id, patch: (Math.sqrt((isect.x - line2.start.x) ** 2 + (isect.y - line2.start.y) ** 2) < Math.sqrt((isect.x - line2.end.x) ** 2 + (isect.y - line2.end.y) ** 2)) ? { start: T2 } : { end: T2 } });
  dispatch({ type: 'ADD', obj: { id: newId(), type: 'line' as const, start: T1, end: T2, layer: line1.layer, color: line1.color, lineWeight: line1.lineWeight, lineType: line1.lineType, selected: false } as LineObj });
  log(`Chamfer d=${dist1}`);
}

// ─── Join two collinear lines ─────────────────────────────────────────────────
function joinLines(line1: LineObj, line2: LineObj): LineObj | null {
  const TOLS = 5; // tolerance in world units
  const d = (a: Point, b: Point) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  // Find shared endpoint
  let sharedA: Point | null = null, sharedB: Point | null = null;
  let freeA: Point | null = null, freeB: Point | null = null;
  if (d(line1.end, line2.start) < TOLS) { sharedA = line1.end; sharedB = line2.start; freeA = line1.start; freeB = line2.end; }
  else if (d(line1.start, line2.end) < TOLS) { sharedA = line1.start; sharedB = line2.end; freeA = line1.end; freeB = line2.start; }
  else if (d(line1.end, line2.end) < TOLS) { sharedA = line1.end; sharedB = line2.end; freeA = line1.start; freeB = line2.start; }
  else if (d(line1.start, line2.start) < TOLS) { sharedA = line1.start; sharedB = line2.start; freeA = line1.end; freeB = line2.end; }
  if (!freeA || !freeB) return null;
  // Check collinearity
  const dx = freeB.x - freeA.x, dy = freeB.y - freeA.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6) return null;
  const cross = (sharedA!.x - freeA.x) * dy - (sharedA!.y - freeA.y) * dx;
  if (Math.abs(cross / len) > TOLS) return null;
  return { ...line1, id: newId(), start: freeA, end: freeB };
}

// ─── Stretch object: move only points inside box ──────────────────────────────
function stretchObj(obj: CADObj, minX: number, maxX: number, minY: number, maxY: number, dx: number, dy: number): Partial<CADObj> | null {
  const inside = (p: Point) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
  const mv = (p: Point): Point => inside(p) ? { x: p.x + dx, y: p.y + dy } : p;
  switch (obj.type) {
    case 'line': case 'wall': return { start: mv(obj.start), end: mv(obj.end) } as any;
    case 'polyline': return { points: obj.points.map(mv) } as any;
    case 'rect': return { p1: mv(obj.p1), p2: mv(obj.p2) } as any;
    default: return null;
  }
}

// ─── Auto-detect hatch boundary ───────────────────────────────────────────────
function pointInPolygon(pt: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y, xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function findHatchBoundary(pt: Point, objects: CADObj[]): Point[] | null {
  // Check closed polylines first
  for (const obj of objects) {
    if (obj.type === 'polyline' && obj.closed && obj.points.length >= 3) {
      if (pointInPolygon(pt, obj.points)) return [...obj.points];
    }
    if (obj.type === 'rect') {
      const pts = [obj.p1, { x: obj.p2.x, y: obj.p1.y }, obj.p2, { x: obj.p1.x, y: obj.p2.y }];
      if (pointInPolygon(pt, pts)) return pts;
    }
    if (obj.type === 'hatch' && obj.points.length >= 3) {
      if (pointInPolygon(pt, obj.points)) return [...obj.points]; // re-hatch same boundary
    }
  }
  return null;
}

function hitTest(pt: Point, objects: CADObj[], vp: Viewport, threshPx: number): CADObj | null {
  const sp = worldToScreen(pt, vp);
  const thr = threshPx;
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    switch (obj.type) {
      case 'line': case 'wall': {
        const a = worldToScreen(obj.type === 'line' ? obj.start : obj.start, vp);
        const b = worldToScreen(obj.type === 'line' ? obj.end : obj.end, vp);
        if (distToSegment(sp, a, b) < thr) return obj;
        break;
      }
      case 'circle': {
        const c = worldToScreen(obj.center, vp);
        const r = obj.radius * vp.scale;
        if (Math.abs(dist(sp, c) - r) < thr) return obj;
        break;
      }
      case 'rect': {
        const a = worldToScreen(obj.p1, vp); const b = worldToScreen(obj.p2, vp);
        if (ptNearRect(sp, a, b, thr)) return obj;
        break;
      }
      case 'text': case 'mtext': {
        const p = worldToScreen(obj.pos, vp);
        if (dist(sp, p) < 40) return obj;
        break;
      }
      case 'block': {
        const p = worldToScreen(obj.pos, vp);
        if (dist(sp, p) < thr * 2) return obj;
        break;
      }
    }
  }
  return null;
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x; const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function ptNearRect(p: Point, a: Point, b: Point, thr: number): boolean {
  const minX = Math.min(a.x, b.x); const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y); const maxY = Math.max(a.y, b.y);
  return (
    (Math.abs(p.x - minX) < thr && p.y >= minY - thr && p.y <= maxY + thr) ||
    (Math.abs(p.x - maxX) < thr && p.y >= minY - thr && p.y <= maxY + thr) ||
    (Math.abs(p.y - minY) < thr && p.x >= minX - thr && p.x <= maxX + thr) ||
    (Math.abs(p.y - maxY) < thr && p.x >= minX - thr && p.x <= maxX + thr)
  );
}

function calcArc3pt(p1: Point, p2: Point, p3: Point): { center: Point; radius: number; startAngle: number; endAngle: number } | null {
  const ax = p1.x; const ay = p1.y;
  const bx = p2.x; const by = p2.y;
  const cx = p3.x; const cy = p3.y;
  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D) < 1e-10) return null;
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;
  const center = { x: ux, y: uy };
  const radius = dist(center, p1);
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = Math.atan2(p3.y - center.y, p3.x - center.x);
  return { center, radius, startAngle, endAngle };
}

function getObjectPoints(obj: CADObj): Point[] {
  switch (obj.type) {
    case 'line': case 'wall': return [obj.start, obj.end];
    case 'polyline': return obj.points;
    case 'circle': return [{ x: obj.center.x - obj.radius, y: obj.center.y - obj.radius }, { x: obj.center.x + obj.radius, y: obj.center.y + obj.radius }];
    case 'arc': return [obj.center];
    case 'rect': return [obj.p1, obj.p2];
    case 'text': case 'mtext': return [obj.pos];
    case 'block': return [obj.pos];
    case 'dim': return [obj.p1, obj.p2];
    default: return [];
  }
}

function moveObj(obj: CADObj, dx: number, dy: number): CADObj {
  switch (obj.type) {
    case 'line': case 'wall': return { ...obj, start: { x: obj.start.x + dx, y: obj.start.y + dy }, end: { x: obj.end.x + dx, y: obj.end.y + dy } };
    case 'polyline': return { ...obj, points: obj.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
    case 'circle': return { ...obj, center: { x: obj.center.x + dx, y: obj.center.y + dy } };
    case 'arc': return { ...obj, center: { x: obj.center.x + dx, y: obj.center.y + dy } };
    case 'rect': return { ...obj, p1: { x: obj.p1.x + dx, y: obj.p1.y + dy }, p2: { x: obj.p2.x + dx, y: obj.p2.y + dy } };
    case 'text': case 'mtext': return { ...obj, pos: { x: obj.pos.x + dx, y: obj.pos.y + dy } };
    case 'block': return { ...obj, pos: { x: obj.pos.x + dx, y: obj.pos.y + dy } };
    case 'dim': return { ...obj, p1: { x: obj.p1.x + dx, y: obj.p1.y + dy }, p2: { x: obj.p2.x + dx, y: obj.p2.y + dy }, dimPt: { x: obj.dimPt.x + dx, y: obj.dimPt.y + dy } };
    default: return obj;
  }
}

function mirrorObj(obj: CADObj, l1: Point, l2: Point): CADObj {
  const mirrorPt = (p: Point): Point => {
    const dx = l2.x - l1.x; const dy = l2.y - l1.y;
    const len2 = dx * dx + dy * dy;
    const t = ((p.x - l1.x) * dx + (p.y - l1.y) * dy) / len2;
    const foot = { x: l1.x + t * dx, y: l1.y + t * dy };
    return { x: 2 * foot.x - p.x, y: 2 * foot.y - p.y };
  };
  switch (obj.type) {
    case 'line': case 'wall': return { ...obj, start: mirrorPt(obj.start), end: mirrorPt(obj.end) };
    case 'polyline': return { ...obj, points: obj.points.map(mirrorPt) };
    case 'circle': return { ...obj, center: mirrorPt(obj.center) };
    case 'rect': return { ...obj, p1: mirrorPt(obj.p1), p2: mirrorPt(obj.p2) };
    case 'text': case 'mtext': return { ...obj, pos: mirrorPt(obj.pos) };
    case 'block': return { ...obj, pos: mirrorPt(obj.pos) };
    default: return obj;
  }
}
