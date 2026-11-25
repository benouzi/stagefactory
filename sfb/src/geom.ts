import type { Doc, Fixture, Support, Vec2 } from "./model";

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => len(sub(a, b));
export const supportLength = (s: Support): number => dist(s.a, s.b);

export function pointOnSupport(s: Support, alongMm: number): Vec2 {
  const L = supportLength(s) || 1;
  return add(s.a, mul(sub(s.b, s.a), alongMm / L));
}

// Projection d'un point sur un support : abscisse bornée et distance au tube.
export function project(s: Support, p: Vec2): { alongMm: number; d: number } {
  const ab = sub(s.b, s.a);
  const L2 = ab.x * ab.x + ab.y * ab.y || 1;
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * ab.x + (p.y - s.a.y) * ab.y) / L2));
  const q = add(s.a, mul(ab, t));
  return { alongMm: t * Math.sqrt(L2), d: dist(p, q) };
}

export function fixturePos(doc: Doc, f: Fixture): Vec2 {
  const s = f.attach ? doc.supports[f.attach.supportId] : undefined;
  if (!s || !f.attach) return f.pos;
  const acc = f.attach.accId ? s.accessories?.find((a) => a.id === f.attach!.accId) : undefined, p = pointOnSupport(s, acc ? acc.alongMm : f.attach.alongMm);
  if (acc?.kind !== "arm") return p;
  // bras de déport : à l'horizontale, perpendiculaire à la barre
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, L = Math.hypot(dx, dy) || 1; return { x: p.x + (-dy / L) * acc.lengthMm * acc.side, y: p.y + (dx / L) * acc.lengthMm * acc.side };
}
export function fixtureZ(doc: Doc, f: Fixture): number {
  const s = f.attach ? doc.supports[f.attach.supportId] : undefined;
  if (!s) return f.zMm;
  const acc = f.attach?.accId ? s.accessories?.find((a) => a.id === f.attach!.accId) : undefined;
  return acc?.kind === "ladder" ? Math.max(0, s.zMm - Math.min(acc.lengthMm, Math.max(0, f.attach!.dropMm ?? acc.lengthMm))) : s.zMm; // sur une échelle : plus bas que la barre
}

export function rotate(p: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function nearestSupport(doc: Doc, p: Vec2, maxD: number): { s: Support; alongMm: number } | null {
  let best: { s: Support; alongMm: number; d: number } | null = null;
  for (const s of Object.values(doc.supports)) {
    const r = project(s, p);
    if (r.d <= maxD && (!best || r.d < best.d)) best = { s, alongMm: r.alongMm, d: r.d };
  }
  return best && { s: best.s, alongMm: best.alongMm };
}

export function bounds(doc: Doc, withBackdrop: boolean): { min: Vec2; max: Vec2 } | null {
  const pts: Vec2[] = [];
  for (const s of Object.values(doc.supports)) pts.push(s.a, s.b);
  for (const f of Object.values(doc.fixtures)) pts.push(fixturePos(doc, f));
  for (const o of Object.values(doc.objects ?? {})) pts.push({ x: o.pos.x - o.wMm / 2, y: o.pos.y - o.wMm / 2 }, { x: o.pos.x + o.wMm / 2, y: o.pos.y + o.wMm / 2 });
  if (withBackdrop && doc.backdrop) {
    const b = doc.backdrop;
    pts.push(b.origin, { x: b.origin.x + b.wPx * b.mmPerPx, y: b.origin.y - b.hPx * b.mmPerPx });
  }
  if (doc.room?.enabled) pts.push({ x: -Math.max(doc.room.stageWMm, doc.room.houseWMm) / 2, y: -roomPlanDepth(doc.room) }, { x: Math.max(doc.room.stageWMm, doc.room.houseWMm) / 2, y: doc.room.stageDMm });
  if (!pts.length) return null;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { min: { x: Math.min(...xs), y: Math.min(...ys) }, max: { x: Math.max(...xs), y: Math.max(...ys) } };
}

// Saisie d'une longueur : « 2,5 m », « 250 cm », « 2500 », « 2500mm ». Sans unité = unité par défaut.
export function parseLength(text: string, defaultUnit: "mm" | "cm" | "m" = "m"): number | null {
  const m = text.trim().replace(/\s+/g, "").replace(",", ".").replace(/−/g, "-").match(/^(-?\d*\.?\d+)(mm|cm|m)?$/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!isFinite(v)) return null;
  const u = (m[2] || defaultUnit).toLowerCase();
  return u === "mm" ? v : u === "cm" ? v * 10 : v * 1000;
}
export const fmtM = (mm: number, digits = 2): string => (mm / 1000).toFixed(digits).replace(".", ",");

// Profondeur de salle montrée sur le plan : jusqu'au pied du gradin, pas plus.
export const roomPlanDepth = (r: Doc["room"]): number => Math.min(r.houseDMm, (r.tierRows > 0 ? r.tierStartMm : 3000) + 1500);
