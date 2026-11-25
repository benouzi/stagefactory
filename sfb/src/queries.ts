import type { Doc, Fixture, Id, Obj, Support } from "./model";
import { fixturePos, fixtureZ, supportLength } from "./geom";
import { domainOf, footprintOf, symbolOf } from "./library";
import { rig } from "./rigging";

export interface Conflict { a: Id; b: Id; universe: number; from: number; to: number }

export function range(f: Fixture): { u: number; from: number; to: number } | null {
  if (f.universe == null || f.address == null) return null;
  const n = footprintOf(f.symbol, f.modeName);
  if (n <= 0) return null;
  return { u: f.universe, from: f.address, to: f.address + n - 1 };
}

export function conflicts(doc: Doc): Conflict[] {
  const list = Object.values(doc.fixtures).map((f) => ({ f, r: range(f) })).filter((x) => x.r) as { f: Fixture; r: { u: number; from: number; to: number } }[];
  list.sort((p, q) => p.r.u - q.r.u || p.r.from - q.r.from);
  const out: Conflict[] = [];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length && list[j].r.u === list[i].r.u && list[j].r.from <= list[i].r.to; j++)
      out.push({ a: list[i].f.id, b: list[j].f.id, universe: list[i].r.u, from: list[j].r.from, to: Math.min(list[i].r.to, list[j].r.to) });
  return out;
}

export function overflows(doc: Doc): Id[] {
  return Object.values(doc.fixtures).filter((f) => { const r = range(f); return r && (r.from < 1 || r.to > 512); }).map((f) => f.id);
}

export function universeUsage(doc: Doc, u: number): { used: boolean[]; conflict: boolean[]; firstFreeAfterLast: number } {
  const count = new Array(513).fill(0);
  for (const f of Object.values(doc.fixtures)) {
    const r = range(f);
    if (r && r.u === u) for (let a = Math.max(1, r.from); a <= Math.min(512, r.to); a++) count[a]++;
  }
  let last = 0;
  for (let a = 1; a <= 512; a++) if (count[a]) last = a;
  return { used: count.map((c) => c > 0), conflict: count.map((c) => c > 1), firstFreeAfterLast: last + 1 };
}

// Première adresse libre pouvant accueillir n canaux dans l'univers u, en ignorant l'appareil « except ».
export function firstFree(doc: Doc, u: number, n: number, except?: Id): number | null {
  const busy = new Array(514).fill(false);
  for (const f of Object.values(doc.fixtures)) {
    if (f.id === except) continue;
    const r = range(f);
    if (r && r.u === u) for (let a = Math.max(1, r.from); a <= Math.min(512, r.to); a++) busy[a] = true;
  }
  for (let a = 1; a + n - 1 <= 512; a++) {
    let ok = true;
    for (let k = 0; k < n; k++) if (busy[a + k]) { ok = false; a += k; break; }
    if (ok) return a;
  }
  return null;
}

// Ordre de lecture d'un plan : du lointain vers la face, puis de jardin à cour.
export function sortedSupports(doc: Doc): Support[] {
  return Object.values(doc.supports).sort((p, q) => (q.a.y + q.b.y) - (p.a.y + p.b.y) || p.name.localeCompare(q.name, "fr", { numeric: true }));
}
export function fixturesOn(doc: Doc, supportId: Id | null): Fixture[] {
  return Object.values(doc.fixtures)
    .filter((f) => (f.attach?.supportId ?? null) === supportId)
    .sort((p, q) => { const a = fixturePos(doc, p), b = fixturePos(doc, q); return a.x - b.x || b.y - a.y; });
}
export function readingOrder(doc: Doc): Fixture[] {
  return [...sortedSupports(doc).flatMap((s) => fixturesOn(doc, s.id)), ...fixturesOn(doc, null)];
}

export interface LoadRow { support: Support; count: number; weightKg: number; kgPerM: number; powerW: number; over: boolean | null }
export function loads(doc: Doc): LoadRow[] {
  return sortedSupports(doc).map((s) => {
    const fx = fixturesOn(doc, s.id);
    const w = fx.reduce((t, f) => t + (f.weightKg || 0), 0);
    const L = supportLength(s) / 1000 || 1;
    return { support: s, count: fx.length, weightKg: w, kgPerM: w / L, powerW: fx.reduce((t, f) => t + (f.powerW || 0), 0), over: s.allowableKg == null ? null : w > s.allowableKg };
  });
}

export interface Warning { level: "warn" | "info"; text: string; target?: { kind: "fixture" | "support" | "object"; id: Id } }
export function warnings(doc: Doc): Warning[] {
  const out: Warning[] = [];
  const ch = (id: Id) => doc.fixtures[id]?.channel || "sans canal";
  for (const c of conflicts(doc))
    out.push({ level: "warn", text: `Conflit de patch dans l'univers ${c.universe} : canaux ${ch(c.a)} et ${ch(c.b)} se recouvrent (${c.from} à ${c.to}).`, target: { kind: "fixture", id: c.b } });
  for (const id of overflows(doc)) out.push({ level: "warn", text: `Le canal ${ch(id)} dépasse l'adresse 512.`, target: { kind: "fixture", id } });
  for (const f of Object.values(doc.fixtures)) {
    if (!f.attach && domainOf(symbolOf(f.symbol)) === "light") out.push({ level: "info", text: `${symbolOf(f.symbol).name} (canal ${f.channel || "—"}) n'est accroché à aucune perche.`, target: { kind: "fixture", id: f.id } });
    if (!f.weightKg) out.push({ level: "info", text: `${symbolOf(f.symbol).name} (canal ${f.channel || "—"}) n'a pas de poids.`, target: { kind: "fixture", id: f.id } });
  }
  for (const s of Object.values(doc.supports)) {
    const r = rig(doc, s);
    if (r.error && (r.count || r.state === "error")) out.push({ level: "warn", text: `${s.name} : ${r.error}`, target: { kind: "support", id: s.id } });
    for (const c of r.checks) if (c.state === "bad" && c.key !== "points" || (c.key === "points" && c.state === "bad" && !r.error)) out.push({ level: "warn", text: `${s.name} — ${c.label.toLowerCase()} : ${c.detail}`, target: { kind: "support", id: s.id } });
  }
  for (const v of videoChecks(doc)) if (v.warning) out.push({ level: "warn", text: v.warning, target: { kind: "fixture", id: v.fixture.id } });
  if (doc.backdrop && !doc.backdrop.calibrated) out.push({ level: "warn", text: "Le fond de plan n'est pas calé à l'échelle : les cotes ne sont pas fiables." });
  return out;
}

// ---------- Vidéo : ce que donne un vidéoprojecteur sur l'écran qu'il vise ----------
export interface VideoCheck { fixture: Fixture; screen: Obj | null; distanceM: number; imageW: number; imageH: number; fill: number; lux: number | null; offAxisDeg: number; warning: string | null }
export function videoCheck(doc: Doc, f: Fixture): VideoCheck | null {
  const sym = symbolOf(f.symbol); if (domainOf(sym) !== "video") return null;
  const screen = f.targetId ? doc.objects[f.targetId] ?? null : null, ratio = f.throwRatio || sym.throwRatio || 1.5;
  if (!screen) return { fixture: f, screen: null, distanceM: 0, imageW: 0, imageH: 0, fill: 0, lux: null, offAxisDeg: 0, warning: null };
  const p = fixturePos(doc, f), r = (screen.rotDeg * Math.PI) / 180, nx = -Math.sin(r), ny = Math.cos(r); // normale de l'écran
  const dx = p.x - screen.pos.x, dy = p.y - screen.pos.y, zc = screen.zMm + screen.hMm / 2, dz = fixtureZ(doc, f) - zc;
  const perp = Math.abs(dx * nx + dy * ny), d = Math.hypot(dx, dy, dz);
  const imageW = d / ratio, imageH = (imageW * screen.hMm) / (screen.wMm || 1), fill = imageW / (screen.wMm || 1);
  const lumens = f.lumens ?? sym.lumens ?? null, area = (Math.min(imageW, screen.wMm) / 1000) * (Math.min(imageH, screen.hMm) / 1000);
  const offAxisDeg = (Math.acos(Math.min(1, perp / (Math.hypot(dx, dy) || 1))) * 180) / Math.PI;
  const name = `${sym.name}${f.unitNumber ? " " + f.unitNumber : ""}`;
  const warning = fill < 0.97 ? `${name} est trop près de ${screen.name} : l'image fait ${(imageW / 1000).toFixed(2).replace(".", ",")} m pour ${(screen.wMm / 1000).toFixed(2).replace(".", ",")} m d'écran. Recule-le à ${((screen.wMm * ratio) / 1000).toFixed(2).replace(".", ",")} m ou prends une optique plus courte.` : fill > 1.25 ? `${name} déborde largement de ${screen.name} : l'image fait ${(imageW / 1000).toFixed(2).replace(".", ",")} m pour ${(screen.wMm / 1000).toFixed(2).replace(".", ",")} m d'écran.` : null;
  return { fixture: f, screen, distanceM: d / 1000, imageW, imageH, fill, lux: lumens && area > 0 ? (lumens * Math.min(1, 1 / (fill * fill))) / area : null, offAxisDeg, warning };
}
export const videoChecks = (doc: Doc): VideoCheck[] => Object.values(doc.fixtures).map((f) => videoCheck(doc, f)).filter((v): v is VideoCheck => !!v);
export const ledInfo = (o: Obj) => { const a = (o.wMm / 1000) * (o.hMm / 1000); return { px: o.pitchMm > 0 ? [Math.round(o.wMm / o.pitchMm), Math.round(o.hMm / o.pitchMm)] : null, kg: a * o.kgPerM2, w: a * o.wPerM2, m2: a }; };
