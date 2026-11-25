// Une seule description du dessin, en millimètres monde (Y vers le lointain), pour l'écran et pour le PDF.
import { propOf } from "./props";
import { isStageKind } from "./model";
import type { Doc, Id, Vec2 } from "./model";
import { add, fixturePos, rotate } from "./geom";
import { domainOf, symbolOf, type Prim } from "./library";
import { conflicts, ledInfo, videoCheck } from "./queries";
import { rig } from "./rigging";
import { pointOnSupport, roomPlanDepth } from "./geom";

export type Item =
  | { t: "line"; a: Vec2; b: Vec2; w: number; color: string; dash?: number[] }
  | { t: "poly"; pts: Vec2[]; closed: boolean; w: number; color: string; fill?: string }
  | { t: "circle"; c: Vec2; r: number; w: number; color: string; fill?: string }
  | { t: "text"; at: Vec2; text: string; size: number; color: string; anchor: "start" | "middle" | "end"; bold?: boolean };

// Fond de plan vectoriel (DXF, DWG) : les traits du dessin, mis à l'échelle. Calculés une fois puis gardés.
const vecCache = new WeakMap<object, { key: string; items: Item[] }>();
function vectorItems(doc: Doc): Item[] {
  const b = doc.backdrop!, v = b.vector!, key = [b.origin.x, b.origin.y, b.mmPerPx, b.opacity, (b.hiddenLayers ?? []).join("|")].join(";"), hit = vecCache.get(v);
  if (hit && hit.key === key) return hit.items;
  const hidden = new Set((b.hiddenLayers ?? []).map((n) => v.layers.indexOf(n))), k = b.mmPerPx, col = `rgba(52,58,72,${Math.min(1, b.opacity).toFixed(2)})`, items: Item[] = [];
  const W = (x: number, y: number): Vec2 => ({ x: b.origin.x + x * k, y: b.origin.y - y * k });
  for (const q of v.polys) { if (hidden.has(q.l)) continue; const pts: Vec2[] = []; for (let i = 0; i < q.p.length; i += 2) pts.push(W(q.p[i], q.p[i + 1])); if (pts.length === 2) items.push({ t: "line", a: pts[0], b: pts[1], w: 0, color: col }); else items.push({ t: "poly", pts, closed: false, w: 0, color: col }); }
  for (const t of v.texts) { if (hidden.has(t.l) || Math.abs(t.r) > 0.2) continue; items.push({ t: "text", at: W(t.x, t.y), text: t.s, size: Math.max(60, t.h * k), color: col, anchor: "start" }); } // les textes tournés ne sont pas repris
  vecCache.set(v, { key, items }); return items;
}

export interface PlanColors { ink: string; muted: string; paper: string; selection: string; attach: string; warn: string }
export interface PlanOptions { rigging?: boolean; selected?: Set<Id>; hotSupport?: Id | null; colors: PlanColors; live?: Map<Id, { level: number; rgb: [number, number, number] }> }

export function symbolItems(prims: Prim[], at: Vec2, rotDeg: number, color: string, w: number, fill: string): Item[] {
  const T = (p: Vec2) => add(at, rotate(p, rotDeg));
  return prims.map((p): Item =>
    p.t === "poly" ? { t: "poly", pts: p.pts.map(T), closed: p.closed, w, color, fill: p.fill === false ? undefined : fill }
    : p.t === "circle" ? { t: "circle", c: T(p.c), r: p.r, w, color, fill: p.fill === false ? undefined : fill }
    : { t: "line", a: T(p.a), b: T(p.b), w: w * 0.7, color });
}
function extentY(prims: Prim[], rotDeg: number): { min: number; max: number } {
  let min = Infinity, max = -Infinity;
  const see = (p: Vec2, r = 0) => { const q = rotate(p, rotDeg); min = Math.min(min, q.y - r); max = Math.max(max, q.y + r); };
  for (const p of prims) { if (p.t === "poly") p.pts.forEach((q) => see(q)); else if (p.t === "circle") see(p.c, p.r); else { see(p.a); see(p.b); } }
  return { min, max };
}

/** Longueur d'une cote, telle qu'elle est écrite : mètres, deux décimales. */
export const dimText = (a: Vec2, b: Vec2) => (Math.hypot(b.x - a.x, b.y - a.y) / 1000).toFixed(2).replace(".", ",") + " m";
function dimItems(doc: Doc, color: string): Item[] {
  const out: Item[] = [];
  for (const q of doc.dims ?? []) { const dx = q.b.x - q.a.x, dy = q.b.y - q.a.y, L = Math.hypot(dx, dy); if (L < 1) continue; const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, o = q.offsetMm, s = o >= 0 ? 1 : -1;
    const A = { x: q.a.x + nx * o, y: q.a.y + ny * o }, B = { x: q.b.x + nx * o, y: q.b.y + ny * o };
    out.push({ t: "line", a: A, b: B, w: 14, color });
    for (const [p0, p1] of [[q.a, A], [q.b, B]] as const) { out.push({ t: "line", a: { x: p0.x + nx * 80 * s, y: p0.y + ny * 80 * s }, b: { x: p1.x + nx * 120 * s, y: p1.y + ny * 120 * s }, w: 10, color }); out.push({ t: "line", a: { x: p1.x - (ux + nx) * 90, y: p1.y - (uy + ny) * 90 }, b: { x: p1.x + (ux + nx) * 90, y: p1.y + (uy + ny) * 90 }, w: 22, color }); }
    out.push({ t: "text", at: { x: (A.x + B.x) / 2 + nx * 260 * s, y: (A.y + B.y) / 2 + ny * 260 * s - 90 }, text: dimText(q.a, q.b), size: 280, color, anchor: "middle", bold: true }); }
  return out;
}
export function buildPlan(doc: Doc, o: PlanOptions): Item[] {
  const c = o.colors, out: Item[] = [];
  const sel = o.selected ?? new Set<Id>();
  const inConflict = new Set<Id>();
  for (const k of conflicts(doc)) { inConflict.add(k.a); inConflict.add(k.b); }

  if (doc.backdrop?.vector && doc.layers.backdrop) for (const it of vectorItems(doc)) out.push(it);

  // La salle : contour du plateau, cadre de scène, murs de salle et rangs du gradin.
  const rm = doc.room, m2 = (mm: number) => (mm / 1000).toFixed(2).replace(".", ",");
  if (rm?.enabled && doc.layers.stage) {
    const sw = rm.stageWMm / 2, hw = rm.houseWMm / 2, pw = rm.prosWMm / 2, L = (a: Vec2, b: Vec2, w = 26, dash?: number[]): Item => ({ t: "line", a, b, w, color: c.muted, dash });
    out.push(L({ x: -sw, y: 0 }, { x: -sw, y: rm.stageDMm }), L({ x: -sw, y: rm.stageDMm }, { x: sw, y: rm.stageDMm }), L({ x: sw, y: rm.stageDMm }, { x: sw, y: 0 }));
    for (const sg of [-1, 1]) out.push({ t: "line", a: { x: sg * pw, y: 0 }, b: { x: sg * Math.max(sw, hw), y: 0 }, w: 120, color: c.ink });
    // Le plan s'arrête au pied du gradin : la salle entière écraserait l'échelle du plateau. Elle est complète en 3D.
    const cut = roomPlanDepth(rm);
    out.push(L({ x: -hw, y: 0 }, { x: -hw, y: -cut }, 18), L({ x: hw, y: 0 }, { x: hw, y: -cut }, 18), L({ x: -hw, y: -cut }, { x: hw, y: -cut }, 12, [200, 140]));
    if (rm.tierRows > 0 && rm.tierStartMm < cut) out.push(L({ x: -hw + 1200, y: -rm.tierStartMm }, { x: hw - 1200, y: -rm.tierStartMm }, 14));
    if (doc.layers.labels) out.push({ t: "text", at: { x: 0, y: -cut + 180 }, text: rm.tierRows > 0 ? `GRADIN · ${rm.tierRows} RANGS · SALLE DE ${m2(rm.houseDMm)} m` : `SALLE DE ${m2(rm.houseDMm)} m`, size: 125, color: c.muted, anchor: "middle" });
  }

  // Scène et vidéo, sous tout le reste.
  for (const ob of Object.values(doc.objects)) {
    if (!(isStageKind(ob.kind) ? doc.layers.stage : doc.layers.video)) continue;
    const isSel = sel.has(ob.id), col = isSel ? c.selection : c.ink, hw = ob.wMm / 2, hd = Math.max(ob.dMm, ob.kind === "deck" ? 0 : 90) / 2;
    const T = (x: number, y: number) => add(ob.pos, rotate({ x, y }, ob.rotDeg));
    const box = [T(-hw, hd), T(hw, hd), T(hw, -hd), T(-hw, -hd)];
    if (ob.kind === "prop") {
      const def = propOf(ob.model, doc.customProps), cloth = def?.group === "Tissus", n = 20;
      const pts = def?.round ? Array.from({ length: n }, (_, i) => T(hw * Math.cos((i / n) * 2 * Math.PI), (ob.dMm / 2) * Math.sin((i / n) * 2 * Math.PI))) : box;
      out.push({ t: "poly", pts, closed: true, w: isSel ? 30 : 14, color: col, fill: cloth ? "rgba(40,44,54,0.55)" : "rgba(150,140,120,0.16)" });
      /* un trait marque la face tournée vers le public */
      if (!cloth && !def?.round) out.push({ t: "line", a: T(-hw * 0.5, -hd), b: T(hw * 0.5, -hd), w: 34, color: col });
      if (doc.layers.labels) out.push({ t: "text", at: T(0, hd + 100), text: ob.name, size: 120, color: c.muted, anchor: "middle" });
    } else if (ob.kind === "deck") {
      out.push({ t: "poly", pts: box, closed: true, w: isSel ? 34 : 20, color: col, fill: "rgba(120,130,150,0.10)" });
      out.push({ t: "line", a: box[0], b: box[2], w: 8, color: c.muted }, { t: "line", a: box[1], b: box[3], w: 8, color: c.muted });
      if (doc.layers.labels) out.push({ t: "text", at: T(0, -60), text: `+${m2(ob.hMm)}`, size: 130, color: c.muted, anchor: "middle" });
    } else if (ob.kind === "curtain") {
      out.push({ t: "poly", pts: box, closed: true, w: isSel ? 30 : 14, color: col, fill: "rgba(40,44,54,0.55)" });
      const n = Math.max(2, Math.round(ob.wMm / 250)); for (let i = 1; i < n; i++) { const x = -hw + (ob.wMm * i) / n; out.push({ t: "line", a: T(x, hd), b: T(x, -hd), w: 8, color: c.paper }); }
      if (doc.layers.labels) out.push({ t: "text", at: T(0, hd + 90), text: ob.name, size: 120, color: c.muted, anchor: "middle" });
    } else if (ob.kind === "screen") {
      out.push({ t: "poly", pts: box, closed: true, w: isSel ? 30 : 16, color: col, fill: c.paper });
      out.push({ t: "line", a: T(-hw, -hd - 50), b: T(hw, -hd - 50), w: 30, color: col });
      if (doc.layers.labels) out.push({ t: "text", at: T(0, hd + 90), text: `${ob.name} · ${m2(ob.wMm)} × ${m2(ob.hMm)} m`, size: 125, color: c.ink, anchor: "middle" });
    } else {
      const li = ledInfo(ob);
      out.push({ t: "poly", pts: box, closed: true, w: isSel ? 30 : 16, color: col, fill: "rgba(20,24,34,0.85)" });
      const n = Math.max(1, Math.round(ob.wMm / 500)); for (let i = 1; i < n; i++) { const x = -hw + (ob.wMm * i) / n; out.push({ t: "line", a: T(x, hd), b: T(x, -hd), w: 8, color: c.paper }); }
      if (doc.layers.labels) out.push({ t: "text", at: T(0, hd + 90), text: `${ob.name} · ${m2(ob.wMm)} × ${m2(ob.hMm)} m${li.px ? ` · ${li.px[0]} × ${li.px[1]} px` : ""}`, size: 125, color: c.ink, anchor: "middle" });
    }
  }

  if (doc.layers.supports)
    for (const s of Object.values(doc.supports)) {
      const hot = o.hotSupport === s.id, isSel = sel.has(s.id);
      if (s.kind === "truss" && !hot) {
        // pont : deux membrures et un treillis
        const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) || 1, nx = (-(s.b.y - s.a.y) / L) * 145, ny = ((s.b.x - s.a.x) / L) * 145, k = isSel ? c.selection : c.ink;
        out.push({ t: "line", a: { x: s.a.x + nx, y: s.a.y + ny }, b: { x: s.b.x + nx, y: s.b.y + ny }, w: 30, color: k }, { t: "line", a: { x: s.a.x - nx, y: s.a.y - ny }, b: { x: s.b.x - nx, y: s.b.y - ny }, w: 30, color: k });
        const n = Math.max(2, Math.round(L / 500)); for (let i = 0; i < n; i++) { const p = pointOnSupport(s, (L * i) / n), q = pointOnSupport(s, (L * (i + 1)) / n), sg = i % 2 ? 1 : -1; out.push({ t: "line", a: { x: p.x + nx * sg, y: p.y + ny * sg }, b: { x: q.x - nx * sg, y: q.y - ny * sg }, w: 12, color: k }); }
      } else out.push({ t: "line", a: s.a, b: s.b, w: hot ? 110 : 55, color: hot ? c.attach : isSel ? c.selection : c.ink });
      // bras de déport, échelles et charges ajoutées : dessinés à leur place sur la barre
      { const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, Ls = Math.hypot(dx, dy) || 1, ux = dx / Ls, uy = dy / Ls, nx = -uy, ny = ux, col = c.ink;
        for (const a of s.accessories ?? []) { const p0 = pointOnSupport(s, a.alongMm);
          if (a.kind === "arm") { const p1 = { x: p0.x + nx * a.lengthMm * a.side, y: p0.y + ny * a.lengthMm * a.side }; out.push({ t: "line", a: p0, b: p1, w: 40, color: col }); out.push({ t: "line", a: { x: p1.x - ux * 120, y: p1.y - uy * 120 }, b: { x: p1.x + ux * 120, y: p1.y + uy * 120 }, w: 40, color: col }); }
          else { out.push({ t: "poly", pts: [[-150, -150], [150, -150], [150, 150], [-150, 150]].map(([e, f]) => ({ x: p0.x + ux * e + nx * f, y: p0.y + uy * e + ny * f })), closed: true, w: 22, color: col, fill: c.paper }); for (const f of [-60, 60]) out.push({ t: "line", a: { x: p0.x - ux * 150 + nx * f, y: p0.y - uy * 150 + ny * f }, b: { x: p0.x + ux * 150 + nx * f, y: p0.y + uy * 150 + ny * f }, w: 14, color: col }); }
          if (o.rigging !== false) out.push({ t: "text", at: { x: p0.x + nx * (a.kind === "arm" ? a.lengthMm * a.side + 220 * a.side : -330), y: p0.y + ny * (a.kind === "arm" ? a.lengthMm * a.side + 220 * a.side : -330) }, text: a.name, size: 110, color: c.muted, anchor: "middle" }); }
        if (o.rigging !== false) for (const l of s.loads ?? []) { const p0 = pointOnSupport(s, l.alongMm), k = l.kg == null ? c.warn : col, half = Math.max(0, l.lengthMm / 2);
          if (half > 0) out.push({ t: "line", a: { x: p0.x - ux * half - nx * 170, y: p0.y - uy * half - ny * 170 }, b: { x: p0.x + ux * half - nx * 170, y: p0.y + uy * half - ny * 170 }, w: 36, color: k });
          out.push({ t: "poly", pts: [{ x: p0.x - nx * 60, y: p0.y - ny * 60 }, { x: p0.x - ux * 110 - nx * 260, y: p0.y - uy * 110 - ny * 260 }, { x: p0.x + ux * 110 - nx * 260, y: p0.y + uy * 110 - ny * 260 }], closed: true, w: 18, color: k, fill: k });
          out.push({ t: "text", at: { x: p0.x - nx * 420, y: p0.y - ny * 420 }, text: `${l.name} · ${l.kg == null ? "? kg" : l.kg + " kg"}`, size: 110, color: l.kg == null ? c.warn : c.muted, anchor: "middle" }); } }
      // points d'accroche et charge reprise par chacun
      if (s.points?.length) { const r = o.rigging === false ? null : rig(doc, s); for (const pt of s.points) {
        const at = pointOnSupport(s, pt.alongMm), load = r?.points.find((x) => x.id === pt.id), bad = !!r && (!!r.error || (!!load && (load.over || load.uplift))), k = bad ? c.warn : c.ink;
        if (pt.kind === "hoist") out.push({ t: "poly", pts: [{ x: at.x, y: at.y + 190 }, { x: at.x + 165, y: at.y - 95 }, { x: at.x - 165, y: at.y - 95 }], closed: true, w: bad ? 30 : 16, color: k, fill: c.paper });
        else { out.push({ t: "line", a: { x: at.x - 110, y: at.y - 110 }, b: { x: at.x + 110, y: at.y + 110 }, w: bad ? 30 : 16, color: k }); out.push({ t: "line", a: { x: at.x - 110, y: at.y + 110 }, b: { x: at.x + 110, y: at.y - 110 }, w: bad ? 30 : 16, color: k }); }
        if (load && o.rigging && doc.layers.labels) out.push({ t: "text", at: { x: at.x, y: at.y + 250 }, text: `${load.designKg.toFixed(0)} kg`, size: 120, color: k, anchor: "middle", bold: bad });
      } }
      for (const p of [s.a, s.b]) out.push({ t: "circle", c: p, r: 45, w: 20, color: isSel ? c.selection : c.ink, fill: c.paper });
      const left = s.a.x <= s.b.x ? s.a : s.b;
      out.push({ t: "text", at: { x: left.x - 220, y: left.y + 40 }, text: s.name.toUpperCase(), size: 150, color: c.ink, anchor: "end", bold: true });
      out.push({ t: "text", at: { x: left.x - 220, y: left.y - 150 }, text: `+${(s.zMm / 1000).toFixed(2).replace(".", ",")} m`, size: 125, color: c.muted, anchor: "end" });
    }

  if (doc.layers.fixtures)
    for (const f of Object.values(doc.fixtures)) {
      const at = fixturePos(doc, f), sym = symbolOf(f.symbol), isSel = sel.has(f.id);
      const dom = domainOf(sym);
      if (dom === "video") { const v = videoCheck(doc, f); if (v?.screen) { const sc = v.screen, half = Math.min(v.imageW, sc.wMm * 1.5) / 2; for (const sg of [-1, 1]) out.push({ t: "line", a: at, b: add(sc.pos, rotate({ x: half * sg, y: 0 }, sc.rotDeg)), w: 10, color: v.warning ? c.warn : c.muted, dash: [120, 90] }); } }
      if (dom === "sound" && sym.coverageDeg && sym.coverageDeg < 360) for (const sg of [-1, 1]) out.push({ t: "line", a: at, b: add(at, rotate({ x: 0, y: -6000 }, f.rotDeg + (sg * sym.coverageDeg) / 2)), w: 10, color: c.muted, dash: [120, 90] });
      // DMX en direct : un halo et un corps teintés à la couleur et au niveau reçus de la console.
      const lv = o.live?.get(f.id), lit = lv && lv.level > 0.02 ? lv : null;
      if (lit) out.push({ t: "circle", c: at, r: 520, w: 0, color: "rgba(0,0,0,0)", fill: `rgba(${lit.rgb.join(",")},${(0.15 + lit.level * 0.5).toFixed(3)})` });
      const body = lit ? `rgb(${lit.rgb.map((v) => Math.round(255 - (255 - v) * (0.35 + lit.level * 0.65))).join(",")})` : c.paper;
      out.push(...symbolItems(sym.plan, at, f.rotDeg, isSel ? c.selection : c.ink, isSel ? 36 : 22, body));
      if (!doc.layers.labels) continue;
      const e = extentY(sym.plan, f.rotDeg);
      if (f.unitNumber) out.push({ t: "text", at: { x: at.x, y: at.y + e.max + 70 }, text: f.unitNumber, size: 130, color: c.muted, anchor: "middle" });
      let y = at.y + e.min - 190;
      if (f.channel) {
        out.push({ t: "circle", c: { x: at.x, y }, r: 135, w: 16, color: c.ink, fill: c.paper });
        out.push({ t: "text", at: { x: at.x, y: y - 55 }, text: f.channel, size: 150, color: c.ink, anchor: "middle", bold: true });
        y -= 300;
      }
      if (f.universe != null && f.address != null) {
        const txt = `${f.universe}.${String(f.address).padStart(3, "0")}`;
        const bad = inConflict.has(f.id);
        out.push({ t: "poly", pts: [{ x: at.x - 230, y: y + 95 }, { x: at.x + 230, y: y + 95 }, { x: at.x + 230, y: y - 95 }, { x: at.x - 230, y: y - 95 }], closed: true, w: bad ? 30 : 14, color: bad ? c.warn : c.ink, fill: c.paper });
        out.push({ t: "text", at: { x: at.x, y: y - 48 }, text: txt, size: 125, color: c.ink, anchor: "middle" });
        y -= 250;
      }
      if (f.color) out.push({ t: "text", at: { x: at.x, y: y - 20 }, text: f.color, size: 115, color: c.muted, anchor: "middle" });
    }
  if (doc.layers.labels) out.push(...dimItems(doc, o.colors.ink));
  return out;
}
