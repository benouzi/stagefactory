// Bibliothèque de ponts par fabricant : longueurs réelles des éléments, leur poids, la section, les coins du catalogue.
// Chaque valeur vient d'une page du fabricant ou d'un revendeur, citée dans « source ». Une valeur non trouvée reste « null » : elle s'affiche « inconnu »,
// elle n'est jamais estimée. Aucune charge admissible n'est reprise ici : elle dépend de la portée et du cas de charge, et se lit dans la note du fabricant.
import type { Doc, Support, Vec2 } from "./model";

export interface TrussSeries {
  id: string; maker: string; name: string; sectionMm: number; tube: string; stepMm: number;
  lengths: [mm: number, kg: number | null][];           // éléments droits du catalogue
  corners: { code: string; label: string; ways: number; angleDeg?: number; kg: number | null }[];
  cornerArmMm: number | null;                           // longueur prise par un coin sur chaque pont qui s'y raccorde
  source: string; url: string; checked: string;
}
export const TRUSS_LIB: TrussSeries[] = [
  { id: "prolyte-h30v", maker: "Prolyte", name: "H30V", sectionMm: 287, tube: "membrures 48 × 3 mm, diagonales 16 × 2 mm, raccord CCS6", stepMm: 250,
    lengths: [[250, 2.7], [290, 2.9], [500, 4.2], [710, 5.4], [750, 5.7], [1000, 7.0], [1500, 10.1], [2000, 12.9], [2500, 15.7], [3000, 18.9], [4000, 24.6]],
    corners: [{ code: "H30V-C001", label: "coin 2 départs 45°", ways: 2, angleDeg: 45, kg: null }, { code: "H30V-C002", label: "coin 2 départs 60°", ways: 2, angleDeg: 60, kg: null }, { code: "H30V-C003", label: "coin 2 départs 90°", ways: 2, angleDeg: 90, kg: null }, { code: "H30V-C004", label: "coin 2 départs 120°", ways: 2, angleDeg: 120, kg: null }, { code: "H30V-C005", label: "coin 2 départs 135°", ways: 2, angleDeg: 135, kg: null }, { code: "H30V-C012", label: "coin 3 départs", ways: 3, kg: null }, { code: "H30V-C017", label: "té 3 départs", ways: 3, kg: null }, { code: "H30V-C016", label: "coin 4 départs", ways: 4, kg: null }],
    cornerArmMm: 500, source: "prolyte.com, fiche « H30V Square Truss Length » ; coins : catalogue Prolyte", url: "https://prolyte.com/products/aluminium-truss/square-truss/h30v-l100-square-30-length-100-cm", checked: "2026-11-16" },
  { id: "prolyte-h40v", maker: "Prolyte", name: "H40V", sectionMm: 387, tube: "membrures 48 × 3 mm, diagonales 20 × 2 mm, raccord CCS6", stepMm: 250,
    lengths: [[250, 3.4], [500, 4.7], [750, 6.3], [810, 6.7], [1000, 8.1], [1500, 11.0], [2000, 13.9], [2500, 17.7], [3000, 20.8], [4000, 26.8]],
    corners: [{ code: "H40V-C003", label: "coin 2 départs 90°", ways: 2, angleDeg: 90, kg: null }, { code: "H40V-C012", label: "coin 3 départs", ways: 3, kg: null }, { code: "H40V-C017", label: "té 3 départs", ways: 3, kg: null }, { code: "H40V-C016", label: "coin 4 départs", ways: 4, kg: null }],
    cornerArmMm: null, source: "prolyte.com, fiche « H40V Square Truss Length »", url: "https://www.prolyte.com/products/aluminium-truss/square-truss/h40v-l100-square-40-length-100-cm", checked: "2026-11-16" },
  { id: "prolyte-x30v", maker: "Prolyte", name: "X30V", sectionMm: 290, tube: "membrures 51 × 2 mm, diagonales 16 × 2 mm, raccord CCS6", stepMm: 250,
    lengths: [[250, null], [290, null], [500, null], [710, null], [750, null], [1000, null], [1500, 8.3], [2000, 10.7], [2500, 12.8], [3000, 15.4], [4000, 20.0]],
    corners: [{ code: "X30V-C003", label: "coin 2 départs 90°", ways: 2, angleDeg: 90, kg: null }, { code: "X30V-C012", label: "coin 3 départs", ways: 3, kg: null }, { code: "X30V-C017", label: "té 3 départs", ways: 3, kg: null }, { code: "X30V-C016", label: "coin 4 départs", ways: 4, kg: null }],
    cornerArmMm: 500, source: "prolyte.com, fiche « X30V Square Truss Length » (poids des éléments courts non relevés)", url: "https://www.prolyte.com/products/aluminium-truss/square-truss/x30v-l100-square-30-length-100-cm", checked: "2026-11-16" },
  { id: "global-f34", maker: "Global Truss", name: "F34", sectionMm: 290, tube: "tube principal 50 × 2 mm, diagonales 20 mm, raccords coniques", stepMm: 500,
    lengths: [[170, null], [210, null], [240, null], [290, 3.8], [500, 4.9], [650, 6.6], [700, 6.8], [1000, null], [1500, null], [2000, null], [2500, null], [3000, 18.0], [4000, null]],
    corners: [{ code: "F34 C21", label: "coin 2 départs 90°", ways: 2, angleDeg: 90, kg: null }, { code: "F34 C30", label: "coin 3 départs 90°", ways: 3, kg: null }, { code: "F34 C35", label: "té 3 départs", ways: 3, kg: null }, { code: "F34 C41", label: "coin 4 départs", ways: 4, kg: null }],
    cornerArmMm: 500, source: "fiches produit thomann (F34029, F34050, F34065, F34070, F34300) ; les autres poids n'ont pas été relevés", url: "https://www.thomann.co.uk/stairville_4punkttraverse_4110_f34_globaltruss.htm", checked: "2026-11-16" },
];
export const seriesOf = (id?: string | null) => TRUSS_LIB.find((s) => s.id === id) ?? null;
export const seriesLabel = (s: TrussSeries) => `${s.maker} ${s.name}`;
export interface Composition { pieces: number[]; restMm: number; kg: number | null; unknown: number[] }
/** Découpe une longueur en éléments du catalogue : le moins de pièces possible, les plus longues d'abord. restMm : ce qui ne tombe pas sur des éléments standard. */
export function compose(series: TrussSeries, lengthMm: number): Composition {
  const step = series.stepMm, std = series.lengths.map((l) => l[0]).filter((mm) => mm % step === 0).sort((a, b) => b - a), n = Math.max(0, Math.floor((lengthMm + 2) / step)), INF = 1e9;
  const best = new Array<number>(n + 1).fill(INF), take = new Array<number>(n + 1).fill(0); best[0] = 0;
  for (let i = 1; i <= n; i++) for (const mm of std) { const u = mm / step; if (u <= i && best[i - u] + 1 < best[i]) { best[i] = best[i - u] + 1; take[i] = mm; } }
  let i = n; while (i > 0 && best[i] >= INF) i--; const pieces: number[] = []; for (let k = i; k > 0; k -= take[k] / step) pieces.push(take[k]);
  pieces.sort((a, b) => b - a); const w = new Map(series.lengths), unknown = [...new Set(pieces.filter((p) => w.get(p) == null))];
  return { pieces, restMm: Math.round(lengthMm - pieces.reduce((t, p) => t + p, 0)), kg: unknown.length ? null : +pieces.reduce((t, p) => t + (w.get(p) as number), 0).toFixed(2), unknown };
}
export const piecesText = (pieces: number[]) => { const c = new Map<number, number>(); for (const p of pieces) c.set(p, (c.get(p) ?? 0) + 1); return [...c].sort((a, b) => b[0] - a[0]).map(([mm, n]) => `${n} × ${String(mm / 1000).replace(".", ",")} m`).join(" + ") || "aucun élément"; };
/** Poids propre au mètre d'un pont de cette série à cette longueur, d'après le poids réel de ses éléments. null : un poids manque. */
export function seriesKgPerM(series: TrussSeries, lengthMm: number): number | null { const c = compose(series, lengthMm); return c.kg == null || lengthMm <= 0 || Math.abs(c.restMm) > 5 ? null : +(c.kg / (lengthMm / 1000)).toFixed(2); }

// ---------- nomenclature du projet ----------
export interface BomLine { series: string; item: string; code: string; qty: number; kgEach: number | null }
export interface Bom { lines: BomLine[]; totalKg: number | null; notes: string[]; perSupport: { id: string; name: string; straightMm: number; comp: Composition; ends: number }[] }
const near = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y) < 60;
/** Liste de matériel des ponts du projet : éléments droits (longueur du pont, moins ce que prennent les coins), coins aux raccords, tours. */
export function trussBom(doc: Doc): Bom {
  const sups = Object.values(doc.supports).filter((s) => s.kind === "truss" && seriesOf(s.series)), lines = new Map<string, BomLine>(), notes = new Set<string>(), per: Bom["perSupport"] = [];
  const add = (series: TrussSeries, item: string, code: string, kgEach: number | null, qty = 1) => { const k = series.id + "|" + code + "|" + item, l = lines.get(k); if (l) l.qty += qty; else lines.set(k, { series: seriesLabel(series), item, code, qty, kgEach }); };
  const straight = (series: TrussSeries, mm: number) => { const c = compose(series, mm), w = new Map(series.lengths); for (const p of c.pieces) add(series, `élément droit ${String(p / 1000).replace(".", ",")} m`, `${series.name}-L${String(Math.round(p / 10)).padStart(3, "0")}`, w.get(p) ?? null); return c; };
  // raccords : les bouts de ponts qui se touchent à la même hauteur, et les tours
  const nodes: { at: Vec2; z: number; members: { s: Support; dir: Vec2 }[]; tower: boolean; tee?: boolean; series: TrussSeries }[] = [];
  // jonction en T (ajout StageFactory) : le bout d'un pont qui arrive sur le corps d'un autre, à la même hauteur
  const body = (t: Support, e: Vec2) => { const Lt = Math.hypot(t.b.x - t.a.x, t.b.y - t.a.y) || 1, ux = (t.b.x - t.a.x) / Lt, uy = (t.b.y - t.a.y) / Lt, al = (e.x - t.a.x) * ux + (e.y - t.a.y) * uy; return al > 60 && al < Lt - 60 && Math.abs((e.x - t.a.x) * uy - (e.y - t.a.y) * ux) < 60 ? { al, ux, uy } : null; };
  for (const s of sups) { const se = seriesOf(s.series)!, L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) || 1; let ends = 0;
    for (const [e, o, along] of [[s.a, s.b, 0], [s.b, s.a, L]] as [Vec2, Vec2, number][]) {
      const tower = s.points.some((p) => p.leg && Math.abs(p.alongMm - along) < 60), joined = sups.some((t) => t.id !== s.id && Math.abs(t.zMm - s.zMm) < 60 && (near(t.a, e) || near(t.b, e)));
      const through = joined ? undefined : sups.find((t) => t.id !== s.id && Math.abs(t.zMm - s.zMm) < 60 && body(t, e));
      if (!tower && !joined && !through) continue; ends++;
      let nd = nodes.find((x) => near(x.at, e) && Math.abs(x.z - s.zMm) < 60); if (!nd) nodes.push((nd = { at: e, z: s.zMm, members: [], tower: false, series: se })); nd.members.push({ s, dir: { x: (o.x - e.x) / L, y: (o.y - e.y) / L } }); if (tower) nd.tower = true;
      if (through && !nd.tee) { const h = body(through, e)!; nd.tee = true; nd.members.push({ s: through, dir: { x: h.ux, y: h.uy } }, { s: through, dir: { x: -h.ux, y: -h.uy } }); notes.add(`${through.name} : une jonction en T le coupe à ${String((h.al / 1000).toFixed(2)).replace(".", ",")} m ; ses éléments sont à répartir de part et d'autre du té.`); }
    }
    // StageFactory fournit la longueur prise par le coin à chaque bout (armsMm) : coin soudé à bras, cube d'angle, ou rien pour deux ponts mis bout à bout
    const AR = (s as any).armsMm as number[] | undefined, arm = se.cornerArmMm, taken = AR ? AR[0] + AR[1] : ends * (arm ?? 0);
    if (!AR && ends && arm == null) notes.add(`${seriesLabel(se)} : la longueur prise par un coin n'est pas relevée ; les éléments droits sont comptés sur toute la longueur du pont.`);
    const explicit = !!s.pieces?.length && Math.abs(s.pieces.reduce((t, p) => t + p, 0) - (L - taken)) <= 5;
    const mm = L - taken, c = explicit ? (() => { const cc = compOf(se, s, mm), w = new Map(se.lengths); for (const p of cc.pieces) add(se, `élément droit ${String(p / 1000).replace(".", ",")} m`, `${se.name}-L${String(Math.round(p / 10)).padStart(3, "0")}`, w.get(p) ?? null); return cc; })() : straight(se, mm); per.push({ id: s.id, name: s.name, straightMm: Math.round(mm), comp: c, ends });
    if (Math.abs(c.restMm) > 5) notes.add(`${s.name} : il reste ${Math.round(c.restMm / 10)} cm hors éléments standard (${seriesLabel(se)} va par ${se.stepMm / 10} cm).`);
  }
  for (const nd of nodes) { const ways = nd.members.length + (nd.tower ? 1 : 0), se = nd.series; if (ways < 2) continue;
    let ang: number | undefined; if (nd.members.length === 2 && !nd.tower) { const [a, b] = nd.members, dot = a.dir.x * b.dir.x + a.dir.y * b.dir.y; ang = Math.round((Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI / 5) * 5; }
    if (ang === 180) { continue; } // deux ponts dans le prolongement l'un de l'autre : pas de coin, un simple raccord
    const c = (nd.tee && ways === 3 ? se.corners.find((x) => x.ways === 3 && /^té/.test(x.label)) : undefined) ?? se.corners.find((x) => x.ways === ways && (ways !== 2 || x.angleDeg == null || (nd.tower ? x.angleDeg === 90 : ang == null || x.angleDeg === ang))) ?? null;
    if (c) add(se, c.label, c.code, c.kg); else { add(se, `coin ${ways} départs${ang != null ? " " + ang + "°" : ""} (hors catalogue relevé)`, "à définir", null); }
    if (nd.tower) { const h = ((nd.members[0]?.s as any)?.legMm as number | undefined) ?? nd.z - (se.cornerArmMm ?? 0), LP = (nd.members[0]?.s as any)?.legPieces as number[] | undefined; add(se, "embase de tour", "à définir", null);
      if (LP?.length && Math.abs(LP.reduce((q, p) => q + p, 0) - h) <= 5) { const w = new Map(se.lengths); for (const p of LP) add(se, `élément droit ${String(p / 1000).replace(".", ",")} m`, `${se.name}-L${String(Math.round(p / 10)).padStart(3, "0")}`, w.get(p) ?? null); }          // tour montée pièce par pièce dans StageFactory
      else { const t = straight(se, h); if (Math.abs(t.restMm) > 5) notes.add(`Tour de ${String(nd.z / 1000).replace(".", ",")} m : il reste ${Math.round(t.restMm / 10)} cm hors éléments standard.`); } }
  }
  const out = [...lines.values()].sort((a, b) => a.series.localeCompare(b.series) || a.item.localeCompare(b.item, "fr", { numeric: true }));
  const anyNull = out.some((l) => l.kgEach == null); if (anyNull) notes.add("Poids total inconnu : le poids de certains éléments (coins, embases, ou longueurs non relevées) n'est pas dans la bibliothèque.");
  if (out.length) notes.add("Les axes des ponts sont pris bout à bout : les longueurs réelles dépendent du type de coin choisi (coin à bras ou cube) — à valider avec le loueur.");
  return { lines: out, totalKg: anyNull || !out.length ? null : +out.reduce((t, l) => t + l.qty * (l.kgEach as number), 0).toFixed(1), notes: [...notes], perSupport: per };
}

/** Ce qu'un pont reçoit quand on lui donne une série : sa section, et son poids propre s'il est connu pour cette longueur. Série vide : on ne touche qu'à la série. */
export function seriesFields(id: string | null | undefined, lengthMm: number): Partial<Support> {
  const se = seriesOf(id); if (!se) return { series: undefined }; const k = seriesKgPerM(se, lengthMm);
  return { series: se.id, sectionMm: se.sectionMm, ...(k != null ? { kgPerM: k } : {}) };
}
export const currentSeries = () => { try { return localStorage.getItem("sf.series") || ""; } catch { return ""; } };

/** La découpe d'un pont : celle qu'on a posée élément par élément si elle correspond encore à sa longueur, sinon la découpe calculée. */
export function compOf(series: TrussSeries, s: { pieces?: number[] }, lengthMm: number): Composition {
  const pcs = s.pieces; if (!pcs?.length || Math.abs(pcs.reduce((t, p) => t + p, 0) - lengthMm) > 5) return compose(series, lengthMm);
  const w = new Map(series.lengths), pieces = [...pcs].sort((a, b) => b - a), unknown = [...new Set(pieces.filter((p) => w.get(p) == null))];
  return { pieces, restMm: 0, kg: unknown.length ? null : +pieces.reduce((t, p) => t + (w.get(p) as number), 0).toFixed(2), unknown };
}
