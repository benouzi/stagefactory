// Plans de CAO (DXF, DWG) : des entités du dessin à un fond de plan vectoriel, à l'échelle.
// Deux lecteurs alimentent le même format simple : un lecteur DXF dans la page (partout), et LibreDWG dans
// l'application installée (DWG). Les courbes sont découpées en segments ; les blocs sont déroulés à leur place.
import type { Backdrop } from "./model";

export type NEnt =
  | { t: "line"; layer: string; a: number[]; b: number[] }
  | { t: "poly"; layer: string; pts: number[][]; closed: boolean }
  | { t: "circle"; layer: string; c: number[]; r: number }
  | { t: "arc"; layer: string; c: number[]; r: number; a0: number; a1: number }
  | { t: "ellipse"; layer: string; c: number[]; major: number[]; ratio: number; a0: number; a1: number }
  | { t: "spline"; layer: string; fit: number[][]; control: number[][]; knots: number[]; degree: number; closed: boolean }
  | { t: "text"; layer: string; at: number[]; h: number; rot: number; s: string; m?: boolean }
  | { t: "insert"; layer: string; name: string; at: number[]; sx: number; sy: number; rot: number };
export interface NDrawing { units: number; entities: NEnt[]; blocks: Record<string, { base: number[]; ents: NEnt[] }>; layers: { name: string; off: boolean }[]; skipped: Record<string, number> }
export interface VectorBackdrop { layers: string[]; polys: { l: number; p: number[] }[]; texts: { l: number; x: number; y: number; h: number; r: number; s: string }[] } // coordonnées en unités du dessin, depuis le coin haut-gauche, Y vers le bas

// ---------- Lecteur DXF (bibliothèque dxf-parser) ----------
export async function readDxf(text: string): Promise<NDrawing> {
  const { default: DxfParser } = await import("dxf-parser");
  let d: any; try { d = new (DxfParser as any)().parseSync(text); } catch (e: any) { throw new Error("Ce fichier DXF n'a pas pu être lu : " + (e?.message || "format inattendu") + "."); }
  if (!d) throw new Error("Ce fichier DXF est vide ou illisible.");
  const skipped: Record<string, number> = {}, P = (p: any) => [p?.x ?? 0, p?.y ?? 0];
  const one = (e: any): NEnt | null => {
    const layer = e.layer || "0";
    switch (e.type) {
      case "LINE": return e.vertices?.length >= 2 ? { t: "line", layer, a: P(e.vertices[0]), b: P(e.vertices[1]) } : null;
      case "LWPOLYLINE": case "POLYLINE": return { t: "poly", layer, pts: (e.vertices || []).map((v: any) => [v.x, v.y, v.bulge || 0]), closed: !!e.shape };
      case "CIRCLE": return { t: "circle", layer, c: P(e.center), r: e.radius };
      case "ARC": return { t: "arc", layer, c: P(e.center), r: e.radius, a0: e.startAngle, a1: e.endAngle };
      case "ELLIPSE": return { t: "ellipse", layer, c: P(e.center), major: P(e.majorAxisEndPoint), ratio: e.axisRatio, a0: e.startAngle ?? 0, a1: e.endAngle ?? Math.PI * 2 };
      case "SPLINE": return { t: "spline", layer, fit: (e.fitPoints || []).map(P), control: (e.controlPoints || []).map(P), knots: e.knotValues || [], degree: e.degreeOfSplineCurve || 3, closed: !!e.closed };
      case "TEXT": return e.text ? { t: "text", layer, at: P(e.startPoint), h: e.textHeight || 0, rot: ((e.rotation || 0) * Math.PI) / 180, s: String(e.text) } : null;
      case "MTEXT": return e.text ? { t: "text", layer, at: P(e.position), h: e.height || 0, rot: ((e.rotation || 0) * Math.PI) / 180, s: String(e.text), m: true } : null;
      case "INSERT": return { t: "insert", layer, name: e.name, at: P(e.position), sx: e.xScale ?? 1, sy: e.yScale ?? 1, rot: ((e.rotation || 0) * Math.PI) / 180 };
      case "DIMENSION": return e.block ? { t: "insert", layer, name: e.block, at: [0, 0], sx: 1, sy: 1, rot: 0 } : null;
      case "SOLID": case "3DFACE": { const v = e.points || e.vertices || []; return v.length >= 3 ? { t: "poly", layer, pts: (v.length === 4 && e.type === "SOLID" ? [v[0], v[1], v[3], v[2]] : v).map((p: any) => [p.x, p.y, 0]), closed: true } : null; }
      default: return null;
    }
  };
  const conv = (list: any[]) => list.map((e) => { const s = one(e); if (!s) skipped[e.type] = (skipped[e.type] || 0) + 1; return s; }).filter(Boolean) as NEnt[];
  const blocks: NDrawing["blocks"] = {};
  for (const [name, b] of Object.entries<any>(d.blocks || {})) if (!/^\*(model|paper)_space/i.test(name)) blocks[name] = { base: P(b.position), ents: conv(b.entities || []) };
  const layers = Object.values<any>(d.tables?.layer?.layers || {}).map((l) => ({ name: l.name, off: l.visible === false || !!l.frozen }));
  return { units: d.header?.$INSUNITS ?? 0, entities: conv(d.entities || []), blocks, layers, skipped };
}

// ---------- Des entités aux segments ----------
const UNIT_MM: Record<number, number> = { 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000, 8: 0.0000254, 9: 0.0254, 10: 914.4, 14: 100 };
const clean = (s: string) => s.replace(/\\P/g, " ").replace(/\\[A-Za-z][^;\\]*;/g, "").replace(/\\[~LlOoKk]/g, "").replace(/[{}]/g, "").replace(/%%[cCdDpP]/g, "").trim();
function arcPts(cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number): number[] {
  let sweep = a1 - a0; while (sweep <= 1e-9) sweep += Math.PI * 2; const n = Math.max(6, Math.ceil(sweep / (Math.PI / 24))), out: number[] = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) { const a = a0 + (sweep * i) / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push(cx + x * c - y * s, cy + x * s + y * c); }
  return out;
}
function bulgeArc(x0: number, y0: number, x1: number, y1: number, bulge: number): number[] { // arc entre deux sommets d'une polyligne (sans le point de départ)
  const d = Math.hypot(x1 - x0, y1 - y0); if (d < 1e-9) return [x1, y1];
  const theta = 4 * Math.atan(bulge), r = d / (2 * Math.sin(theta / 2)), mx = (x0 + x1) / 2, my = (y0 + y1) / 2, h = r * Math.cos(theta / 2), ux = -(y1 - y0) / d, uy = (x1 - x0) / d;
  const cx = mx + ux * h, cy = my + uy * h, a0 = Math.atan2(y0 - cy, x0 - cx), n = Math.max(3, Math.ceil(Math.abs(theta) / (Math.PI / 24))), out: number[] = [];
  for (let i = 1; i <= n; i++) { const a = a0 + (theta * i) / n; out.push(cx + Math.cos(a) * Math.abs(r), cy + Math.sin(a) * Math.abs(r)); }
  out[out.length - 2] = x1; out[out.length - 1] = y1; return out;
}
function splinePts(e: Extract<NEnt, { t: "spline" }>): number[] {
  const ctl = e.control, k = e.degree, kn = e.knots;
  if (ctl.length > k && kn.length >= ctl.length + k + 1) { // B-spline : algorithme de De Boor
    const out: number[] = [], t0 = kn[k], t1 = kn[ctl.length], n = Math.max(12, ctl.length * 8);
    for (let i = 0; i <= n; i++) {
      const t = Math.min(t1 - 1e-9, t0 + ((t1 - t0) * i) / n); let s = k; while (s < ctl.length - 1 && kn[s + 1] <= t) s++;
      const d = Array.from({ length: k + 1 }, (_, j) => [...ctl[j + s - k]]);
      for (let r = 1; r <= k; r++) for (let j = k; j >= r; j--) { const den = kn[j + 1 + s - r] - kn[j + s - k], a = den ? (t - kn[j + s - k]) / den : 0; d[j][0] = (1 - a) * d[j - 1][0] + a * d[j][0]; d[j][1] = (1 - a) * d[j - 1][1] + a * d[j][1]; }
      out.push(d[k][0], d[k][1]);
    }
    return out;
  }
  const pts = e.fit.length >= 2 ? e.fit : ctl; if (pts.length < 2) return [];
  const out: number[] = [], g = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))]; // courbe lissée passant par les points
  for (let i = 0; i < pts.length - 1; i++) { const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2); for (let j = 0; j < 10; j++) { const t = j / 10, t2 = t * t, t3 = t2 * t; for (const a of [0, 1]) out.push(0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)); } }
  out.push(pts[pts.length - 1][0], pts[pts.length - 1][1]); return out;
}

export interface CadResult { backdrop: Backdrop; segments: number; texts: number; layers: number; unitNote: string; skipped: string[]; truncated: boolean }
export function drawingToBackdrop(d: NDrawing, fileName: string): CadResult {
  const off = new Set(d.layers.filter((l) => l.off).map((l) => l.name)), layerIx = new Map<string, number>(), layers: string[] = [];
  const L = (name: string) => { let i = layerIx.get(name); if (i == null) { i = layers.length; layers.push(name); layerIx.set(name, i); } return i; };
  const polys: { l: number; p: number[] }[] = [], texts: VectorBackdrop["texts"] = []; let verts = 0, truncated = false; const MAX = 600000;
  type M = [number, number, number, number, number, number]; // matrice affine a b c d e f
  const mul = (m: M, n: M): M => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const push = (m: M, layer: string, flat: number[]) => { if (flat.length < 4) return; if (verts > MAX) { truncated = true; return; } const p = new Array(flat.length); for (let i = 0; i < flat.length; i += 2) { p[i] = m[0] * flat[i] + m[2] * flat[i + 1] + m[4]; p[i + 1] = m[1] * flat[i] + m[3] * flat[i + 1] + m[5]; } verts += flat.length / 2; polys.push({ l: L(layer), p }); };
  const walk = (ents: NEnt[], m: M, parentLayer: string | null, depth: number) => {
    for (const e of ents) {
      const layer = e.layer === "0" && parentLayer ? parentLayer : e.layer; // dans un bloc, le calque 0 prend le calque de l'insertion
      if (e.t === "line") push(m, layer, [...e.a, ...e.b]);
      else if (e.t === "poly") { const v = e.pts; if (v.length < 2) continue; const flat = [v[0][0], v[0][1]], n = e.closed ? v.length : v.length - 1; for (let i = 0; i < n; i++) { const a = v[i], b = v[(i + 1) % v.length]; if (a[2]) flat.push(...bulgeArc(a[0], a[1], b[0], b[1], a[2])); else flat.push(b[0], b[1]); } push(m, layer, flat); }
      else if (e.t === "circle") push(m, layer, arcPts(e.c[0], e.c[1], e.r, e.r, 0, 0, Math.PI * 2));
      else if (e.t === "arc") push(m, layer, arcPts(e.c[0], e.c[1], e.r, e.r, 0, e.a0, e.a1));
      else if (e.t === "ellipse") { const rx = Math.hypot(e.major[0], e.major[1]); push(m, layer, arcPts(e.c[0], e.c[1], rx, rx * e.ratio, Math.atan2(e.major[1], e.major[0]), e.a0, e.a1)); }
      else if (e.t === "spline") { const p = splinePts(e); if (e.closed && p.length >= 4) p.push(p[0], p[1]); push(m, layer, p); }
      else if (e.t === "text") { const s = clean(e.s), sc = Math.hypot(m[0], m[1]); if (s && texts.length < 20000) texts.push({ l: L(layer), x: m[0] * e.at[0] + m[2] * e.at[1] + m[4], y: m[1] * e.at[0] + m[3] * e.at[1] + m[5], h: (e.h || 0) * sc, r: e.rot + Math.atan2(m[1], m[0]), s: s.slice(0, 200) }); }
      else if (e.t === "insert") { const b = d.blocks[e.name]; if (!b || depth > 12) continue; const c = Math.cos(e.rot), s = Math.sin(e.rot); walk(b.ents, mul(mul(m, [c * e.sx, s * e.sx, -s * e.sy, c * e.sy, e.at[0], e.at[1]]), [1, 0, 0, 1, -b.base[0], -b.base[1]]), layer, depth + 1); }
    }
  };
  walk(d.entities, [1, 0, 0, 1, 0, 0], null, 0);
  if (!polys.length) throw new Error("Ce dessin ne contient aucun trait lisible dans l'espace objet. S'il a été dessiné dans une présentation (espace papier), exporte-le depuis l'espace objet.");
  // Emprise : on écarte les points aberrants (un trait perdu à des kilomètres) pour ne pas écraser le dessin.
  const xs: number[] = [], ys: number[] = []; for (const q of polys) for (let i = 0; i < q.p.length; i += 2) { xs.push(q.p[i]); ys.push(q.p[i + 1]); }
  const span = (a: number[]) => { const s = [...a].sort((p, q) => p - q), lo = s[Math.floor(s.length * 0.005)], hi = s[Math.ceil(s.length * 0.995) - 1], pad = (hi - lo) * 0.5 + 1e-9; return [Math.max(s[0], lo - pad), Math.min(s[s.length - 1], hi + pad)]; };
  const [x0, x1] = span(xs), [y0, y1] = span(ys), w = x1 - x0 || 1, h = y1 - y0 || 1;
  const inside = (q: { p: number[] }) => { for (let i = 0; i < q.p.length; i += 2) if (q.p[i] >= x0 && q.p[i] <= x1 && q.p[i + 1] >= y0 && q.p[i + 1] <= y1) return true; return false; };
  const kept = polys.filter(inside); for (const q of kept) for (let i = 0; i < q.p.length; i += 2) { q.p[i] = +(q.p[i] - x0).toFixed(3); q.p[i + 1] = +(y1 - q.p[i + 1]).toFixed(3); }
  const keptT = texts.filter((t) => t.x >= x0 && t.x <= x1 && t.y >= y0 && t.y <= y1).map((t) => ({ ...t, x: +(t.x - x0).toFixed(3), y: +(y1 - t.y).toFixed(3) }));
  // Unité : celle déclarée par le dessin ; sinon on la devine d'après la taille, et le plan reste à caler.
  let mm = UNIT_MM[d.units], known = !!mm, unitNote: string;
  if (!mm) { const m = Math.max(w, h); mm = m < 400 ? 1000 : m < 4000 ? 10 : 1; unitNote = `Le dessin ne dit pas son unité. D'après sa taille, ScenoFactory l'a lu en ${mm === 1000 ? "mètres" : mm === 10 ? "centimètres" : "millimètres"} : vérifie une cote, et cale l'échelle si besoin.`; }
  else unitNote = `Unité du dessin : ${({ 1: "pouces", 2: "pieds", 4: "millimètres", 5: "centimètres", 6: "mètres", 10: "yards", 14: "décimètres" } as Record<number, string>)[d.units] ?? "connue"}. Le plan est à l'échelle.`;
  const backdrop: Backdrop = { dataUrl: "", wPx: w, hPx: h, origin: { x: (-w * mm) / 2, y: h * mm }, mmPerPx: mm, calibrated: known, opacity: 0.7, fileName, vector: { layers, polys: kept, texts: keptT }, hiddenLayers: layers.filter((n) => off.has(n)) };
  return { backdrop, segments: kept.reduce((t, q) => t + q.p.length / 2 - 1, 0), texts: keptT.length, layers: layers.length, unitNote, skipped: Object.entries(d.skipped).filter(([k]) => !/VIEWPORT|ATTDEF|POINT|XLINE|RAY/.test(k)).map(([k, n]) => `${k} (${n})`), truncated };
}
