// Ponts qui se connectent : un nouveau pont s'aimante au bout d'un pont existant, se cale sur des longueurs de 50 cm,
// et reprend la hauteur, la section et le poids propre du pont auquel il se raccorde.
import * as cmd from "./commands";
import { mergeUndoSince, undoDepth } from "./store";
import type { Doc, Id, RigPoint, Support, Vec2 } from "./model";
import { evenPoints } from "./model";
import { compOf, compose, currentSeries, seriesFields, seriesOf } from "./trussLib";

export const MODULE = 500; // les ponts se vendent par éléments : 0,5 m, 1 m, 2 m, 3 m…
export interface EndHit { at: Vec2; sup: Support }
/** Le bout de pont le plus proche du point, dans le rayon donné (mm). */
export function trussEnd(doc: Doc, p: Vec2, tol = 450, skip?: Vec2): EndHit | null {
  let best: EndHit | null = null, bd = tol;
  for (const s of Object.values(doc.supports)) { if (s.kind !== "truss") continue; for (const e of [s.a, s.b]) { if (skip && Math.hypot(e.x - skip.x, e.y - skip.y) < 1) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d <= bd) { bd = d; best = { at: { ...e }, sup: s }; } } }
  return best;
}
export interface Corner { angle: number; code: string | null; catalog: boolean }
const ANGLES = [45, 60, 90, 120, 135, 180];
/** Départ depuis le bout d'un pont : la direction se cale sur les angles des coins du catalogue (45, 60, 90, 120, 135°) ou sur le prolongement. */
export function snapCorner(link: Support, at: Vec2, raw: Vec2): { p: Vec2; corner: Corner } {
  const other = Math.hypot(link.a.x - at.x, link.a.y - at.y) < Math.hypot(link.b.x - at.x, link.b.y - at.y) ? link.b : link.a, ux = other.x - at.x, uy = other.y - at.y, vx = raw.x - at.x, vy = raw.y - at.y, lu = Math.hypot(ux, uy) || 1, lv = Math.hypot(vx, vy);
  if (lv < 1) return { p: raw, corner: { angle: 180, code: null, catalog: true } };
  const ang = (Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)))) * 180) / Math.PI, side = ux * vy - uy * vx >= 0 ? 1 : -1, se = seriesOf(link.series ?? currentSeries());
  const allowed = se ? [...se.corners.filter((c) => c.ways === 2 && c.angleDeg != null).map((c) => c.angleDeg as number), 180] : ANGLES, best = allowed.reduce((b, a) => (Math.abs(a - ang) < Math.abs(b - ang) ? a : b), allowed[0]);
  if (Math.abs(best - ang) > 11) return { p: raw, corner: { angle: Math.round(ang), code: null, catalog: false } };
  const t = (best * Math.PI) / 180 * side, c = Math.cos(t), sn = Math.sin(t), dx = (ux / lu) * c - (uy / lu) * sn, dy = (ux / lu) * sn + (uy / lu) * c;
  return { p: { x: at.x + dx * lv, y: at.y + dy * lv }, corner: { angle: best, code: best === 180 ? null : se?.corners.find((k) => k.ways === 2 && k.angleDeg === best)?.code ?? null, catalog: true } };
}
/** Le second bout : aimanté sur un bout de pont existant s'il y en a un tout près, sinon calé sur l'angle d'un coin (départ raccordé) et ramené à une longueur d'éléments entiers. */
export function trussSecond(doc: Doc, a: Vec2, raw0: Vec2, link?: Support | null): { b: Vec2; hit: EndHit | null; corner: Corner | null } {
  const hit = trussEnd(doc, raw0, 450, a); if (hit) return { b: hit.at, hit, corner: null };
  const sc = link ? snapCorner(link, a, raw0) : null, raw = sc ? sc.p : raw0;
  const dx = raw.x - a.x, dy = raw.y - a.y, L = Math.hypot(dx, dy); if (L < 1) return { b: raw, hit: null, corner: null };
  const step = seriesOf(link?.series ?? currentSeries())?.stepMm ?? MODULE, n = Math.max(step, Math.round(L / step) * step); return { b: { x: Math.round(a.x + (dx / L) * n), y: Math.round(a.y + (dy / L) * n) }, hit: null, corner: sc ? sc.corner : null };
}
/** Pose un pont raccordé : il hérite du pont voisin. Si le voisin est posé sur des tours, le nouveau pont l'est aussi (une tour à chaque bout). Une seule étape d'annulation. */
export function addLinkedTruss(a: Vec2, b: Vec2, link: Support | null, zMm?: number): Id {
  const depth = undoDepth(), id = cmd.addSupport(a, b, "truss"), L = Math.hypot(b.x - a.x, b.y - a.y), f: Partial<Support> = {};
  if (link) { f.zMm = link.zMm; f.kgPerM = link.kgPerM; if (link.sectionMm) f.sectionMm = link.sectionMm; if (link.points.some((p) => p.leg)) f.points = [0, L].map((alongMm, i): RigPoint => ({ id: "lg" + i + Math.random().toString(36).slice(2, 8), alongMm, capacityKg: null, kind: "fixed", leg: true })); }
  else if (zMm != null) f.zMm = zMm;
  /* la série : celle du pont voisin, sinon celle choisie dans la barre de l'outil */
  const sid = link ? link.series : currentSeries(); if (sid && seriesOf(sid)) Object.assign(f, seriesFields(sid, L));
  if (Object.keys(f).length) { cmd.setSupportFields(id, f); mergeUndoSince(depth, link ? "Poser un pont raccordé" : "Poser un pont"); }
  return id;
}
export const chaining = () => { try { return localStorage.getItem("sf.chain") === "1"; } catch { return false; } };

// ---------- pose élément par élément ----------
export const currentPiece = () => { try { return Math.max(0, Number(localStorage.getItem("sf.piece")) || 0); } catch { return 0; } };
/** Les éléments droits qu'on peut poser un à un : ceux de la série (au pas de la série), ou des longueurs courantes sans série. */
export const pieceChoices = (seriesId?: string | null): number[] => { const se = seriesOf(seriesId); return se ? se.lengths.map((l) => l[0]).filter((mm) => mm % se.stepMm === 0) : [500, 1000, 2000, 3000]; };
/** Où tomberait l'élément : depuis « a », vers la souris, sur la longueur exacte de la pièce. Depuis un bout de pont, la direction se cale sur un coin du catalogue ou sur le prolongement. */
export function pieceEnd(a: Vec2, raw: Vec2, link: Support | null, pieceMm: number): { b: Vec2; corner: Corner | null } {
  const sc = link ? snapCorner(link, a, raw) : null, r = sc ? sc.p : raw, dx = r.x - a.x, dy = r.y - a.y, L = Math.hypot(dx, dy) || 1;
  return { b: { x: Math.round(a.x + (dx / L) * pieceMm), y: Math.round(a.y + (dy / L) * pieceMm) }, corner: sc ? sc.corner : null };
}
/** Pose un élément. Dans le prolongement d'un pont, il l'allonge (un pont de trois éléments reste une seule poutre pour le calcul) ; après un coin, il commence un nouveau pont. Renvoie le bout libre et le pont à continuer. */
export function placePiece(doc: Doc, a: Vec2, raw: Vec2, link: Support | null, pieceMm: number): { first: Vec2; link: Id } {
  const t = pieceEnd(a, raw, link, pieceMm);
  const se = seriesOf(link ? link.series : currentSeries()), kgOf = (pcs: number[]) => { if (!se) return null; const c = compOf(se, { pieces: pcs }, pcs.reduce((x, y) => x + y, 0)); return c.kg == null ? null : +(c.kg / (pcs.reduce((x, y) => x + y, 0) / 1000)).toFixed(2); };
  if (link && t.corner?.angle === 180) { // dans le prolongement : le pont s'allonge, et garde la liste de ses pièces
    const L0 = Math.hypot(link.b.x - link.a.x, link.b.y - link.a.y), had = link.pieces?.length && Math.abs(link.pieces.reduce((x, y) => x + y, 0) - L0) <= 5 ? link.pieces : se ? compose(se, L0).pieces : [], atA = Math.hypot(link.a.x - a.x, link.a.y - a.y) < 60, pieces = atA ? [pieceMm, ...had] : [...had, pieceMm], k = kgOf(pieces);
    /* des moteurs encore à leur place d'origine (ni capacité saisie, ni palonnier, ni tour) sont répartis de nouveau sur la nouvelle longueur : sinon le bout ajouté part en porte-à-faux */
    const fresh = link.points.length > 0 && link.points.every((p) => p.kind === "hoist" && !p.leg && p.capacityKg == null && !p.bridle && p.hoistKg == null), L1 = L0 + pieceMm;
    cmd.extendTruss(link.id, a, t.b, { ...(se ? { pieces } : {}), ...(k != null ? { kgPerM: k } : {}), ...(fresh ? { points: evenPoints(L1, Math.max(2, Math.round(L1 / 3500)), "hoist") } : {}) }); return { first: t.b, link: link.id }; }
  const depth = undoDepth(), id = addLinkedTruss(a, t.b, link); if (se) { const k = kgOf([pieceMm]); cmd.setSupportFields(id, { pieces: [pieceMm], ...(k != null ? { kgPerM: k } : {}) }); mergeUndoSince(depth, "Poser un élément de pont"); }
  return { first: t.b, link: id };
}
/** Longueur réalisable la plus proche pour un pont de cette série. */
export function feasibleLength(seriesId: string | null | undefined, mm: number): number { const se = seriesOf(seriesId); if (!se) return mm; return Math.max(se.stepMm, Math.round(mm / se.stepMm) * se.stepMm); }
