// Vue en coupe longitudinale, dans l'axe de la salle : distance au nez de scène à l'horizontale (lointain à droite), hauteur à la verticale.
// Les mêmes éléments de dessin que le plan, pour être tracés à l'écran comme dans le PDF.
import type { Doc, Vec2 } from "./model";
import { tierHeights } from "./model";
import type { Item } from "./plan";
import { fixturePos, fixtureZ } from "./geom";
import { domainOf, symbolOf } from "./library";

export interface SectionColors { ink: string; muted: string; paper: string; accent: string }
const RAD = Math.PI / 180;
/** Où le faisceau d'un appareil touche le plateau, dans la coupe. null s'il ne descend pas. */
export function beamFloor(yMm: number, zMm: number, panDeg: number, tiltDeg: number, floorZ = 0): Vec2 | null {
  const dy = -Math.sin(tiltDeg * RAD) * Math.cos(panDeg * RAD), dz = -Math.cos(tiltDeg * RAD); if (dz > -0.05 || zMm <= floorZ) return null;
  const t = (zMm - floorZ) / -dz; return { x: yMm + dy * t, y: floorZ };
}
export function buildSection(doc: Doc, c: SectionColors): { items: Item[]; min: Vec2; max: Vec2 } {
  const out: Item[] = [], r = doc.room, sup = Object.values(doc.supports), fx = Object.values(doc.fixtures), objs = Object.values(doc.objects);
  let x0 = -2000, x1 = 4000, y1 = 4000, y0 = 0; const grow = (x: number, y: number) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  for (const s of sup) { grow(s.a.y, s.zMm + 800); grow(s.b.y, s.zMm + 800); } for (const o of objs) grow(o.pos.y, o.zMm + o.hMm);
  const line = (ax: number, ay: number, bx: number, by: number, w = 30, color = c.ink, dash?: number[]) => { out.push({ t: "line", a: { x: ax, y: ay }, b: { x: bx, y: by }, w, color, dash }); grow(ax, ay); grow(bx, by); };
  if (r.enabled && doc.layers.stage) {
    const sd = r.stageDMm, hd = r.houseDMm, wh = r.wallHMm, hh = Math.min(wh, r.houseHMm ?? wh), rise = r.stageRiseMm;
    line(0, 0, sd, 0, 60); line(0, -rise, 0, 0, 60); line(-hd, -rise, 0, -rise, 60);                    // plateau, nez de scène, sol de salle
    line(sd, 0, sd, wh, 60); line(0, wh, sd, wh, 40); line(0, r.prosHMm, 0, wh, 90);                     // mur du lointain, gril, linteau du cadre
    line(-hd, -rise, -hd, hh, 60); line(-hd, hh, 0, hh, 40);                                               // fond et plafond de salle
    const pts: Vec2[] = [{ x: -r.tierStartMm, y: -rise }]; const TH = tierHeights(r); for (let i = 0; i < r.tierRows && r.tierStartMm + (i + 1) * r.tierDepthMm <= hd + 10; i++) { const h = -rise + TH[i], xa = -(r.tierStartMm + i * r.tierDepthMm), xb = xa - r.tierDepthMm; pts.push({ x: xa, y: h }, { x: xb, y: h }); }
    if (pts.length > 1) { out.push({ t: "poly", pts, closed: false, w: 30, color: c.ink }); for (const p of pts) grow(p.x, p.y); }
    if (r.gridHMm && r.gridHMm <= wh) { line(0, r.gridHMm, sd, r.gridHMm, 26, c.ink, [220, 120]); out.push({ t: "text", at: { x: sd - 300, y: r.gridHMm + 140 }, text: "gril", size: 200, color: c.muted, anchor: "end" }); }
    const gwS = r.galleryWMm ?? 1200; for (const g of r.galleryHsMm ?? []) if (g > 500 && g <= wh) line(sd - 350, g, sd, g, 20, c.muted); // passerelles latérales : vues de face, repérées contre le mur du lointain
    if (r.backGalleryHMm && r.backGalleryHMm <= wh) { line(sd - gwS, r.backGalleryHMm, sd, r.backGalleryHMm, 70); line(sd - gwS, r.backGalleryHMm, sd - gwS, r.backGalleryHMm + 1050, 20); }
    if (r.pitDMm && r.pitDMm > 200) { const pl = Math.min(0, r.pitLevelMm ?? 0); line(-r.pitDMm, pl, 0, pl, 50); line(-r.pitDMm, pl, -r.pitDMm, -rise, 30); out.push({ t: "text", at: { x: -r.pitDMm / 2, y: pl + 150 }, text: "fosse", size: 200, color: c.muted, anchor: "middle" }); }
    out.push({ t: "text", at: { x: 0, y: -rise - 420 }, text: "nez de scène", size: 220, color: c.muted, anchor: "middle" });
  } else line(x0, 0, x1, 0, 60);
  // objets de scène
  if (doc.layers.stage) for (const o of objs) {
    if (o.kind === "deck") { const a = o.pos.y - o.dMm / 2, b = o.pos.y + o.dMm / 2; out.push({ t: "poly", pts: [{ x: a, y: 0 }, { x: a, y: o.hMm }, { x: b, y: o.hMm }, { x: b, y: 0 }], closed: true, w: 24, color: c.ink, fill: c.paper }); grow(a, 0); grow(b, o.hMm); }
    else if (o.kind === "prop" && o.dMm > 300) { const a = o.pos.y - o.dMm / 2, b = o.pos.y + o.dMm / 2; out.push({ t: "poly", pts: [{ x: a, y: o.zMm }, { x: a, y: o.zMm + o.hMm }, { x: b, y: o.zMm + o.hMm }, { x: b, y: o.zMm }], closed: true, w: 20, color: c.ink, fill: c.paper }); grow(a, o.zMm); grow(b, o.zMm + o.hMm); }
    else line(o.pos.y, o.zMm, o.pos.y, o.zMm + o.hMm, o.kind === "curtain" || o.kind === "prop" ? 50 : 80);
    out.push({ t: "text", at: { x: o.pos.y, y: (o.kind === "deck" ? o.hMm : o.zMm + o.hMm) + 160 }, text: o.name, size: 200, color: c.muted, anchor: "middle" });
  }
  // perches et ponts : vus en bout, un rond à leur hauteur
  if (doc.layers.supports) for (const s of sup) {
    const y = (s.a.y + s.b.y) / 2; if (Math.abs(s.a.y - s.b.y) > 50) line(s.a.y, s.zMm, s.b.y, s.zMm, 40);
    if (s.kind === "truss") out.push({ t: "poly", pts: [[-150, 0], [150, 0], [150, 290], [-150, 290]].map(([a, b]) => ({ x: y + a, y: s.zMm + b })), closed: true, w: 24, color: c.ink, fill: c.paper });
    else out.push({ t: "circle", c: { x: y, y: s.zMm }, r: 70, w: 24, color: c.ink, fill: c.ink });
    if (doc.layers.labels) out.push({ t: "text", at: { x: y, y: s.zMm + (s.kind === "truss" ? 420 : 200) }, text: s.name.replace(/^Perche\s+/i, ""), size: 190, color: c.muted, anchor: "middle" });
    for (const a of s.accessories ?? []) if (a.kind === "ladder") line(y, s.zMm, y, s.zMm - a.lengthMm, 30);
  }
  // appareils : à leur hauteur, avec l'axe de leur faisceau jusqu'au plateau
  if (doc.layers.fixtures) for (const f of fx) {
    const p = fixturePos(doc, f), z = fixtureZ(doc, f), hung = !!f.attach, top = hung ? z - 60 : z, sym = symbolOf(f.symbol);
    out.push({ t: "poly", pts: [[-110, 0], [110, 0], [80, -260], [-80, -260]].map(([a, b]) => ({ x: p.y + a, y: top + (hung ? b : -b) })), closed: true, w: 20, color: c.ink, fill: c.paper }); grow(p.y, z);
    if (domainOf(sym) === "light") { const hit = beamFloor(p.y, hung ? z - 320 : z + 260, f.panDeg ?? 0, hung ? f.tiltDeg ?? 0 : 180 - (f.tiltDeg ?? 0)); if (hit && Math.abs(hit.x - p.y) < 40000) line(p.y, hung ? z - 320 : z + 260, hit.x, hit.y, 22, c.accent, [160, 110]); }
  }
  // repères : une silhouette de 1,75 m, les hauteurs et les distances tous les mètres
  const px = r.enabled ? Math.min(2000, r.stageDMm / 2) : 1000; line(px, 0, px, 1500, 26, c.muted); out.push({ t: "circle", c: { x: px, y: 1625 }, r: 125, w: 26, color: c.muted }); line(px - 280, 1150, px + 280, 1150, 26, c.muted);
  const step = y1 > 12000 ? 2000 : 1000, left = x0 - 600;
  for (let h = 0; h <= y1; h += step) { out.push({ t: "line", a: { x: left, y: h }, b: { x: x1 + 300, y: h }, w: 6, color: c.muted, dash: [60, 160] }); out.push({ t: "text", at: { x: left - 150, y: h - 80 }, text: (h / 1000).toFixed(0) + " m", size: 200, color: c.muted, anchor: "end" }); }
  const xs = x1 - x0 > 30000 ? 5000 : 2000; for (let x = Math.ceil(x0 / xs) * xs; x <= x1; x += xs) { out.push({ t: "line", a: { x, y: y0 - 150 }, b: { x, y: y0 - 300 }, w: 12, color: c.muted }); out.push({ t: "text", at: { x, y: y0 - 620 }, text: (x / 1000).toFixed(0), size: 200, color: c.muted, anchor: "middle" }); }
  return { items: out, min: { x: left - 1100, y: y0 - 900 }, max: { x: x1 + 500, y: y1 + 700 } };
}
