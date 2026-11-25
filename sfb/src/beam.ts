// Plan de charge d'une barre : moment fléchissant, contrainte et flèche le long de la barre, à partir des réactions déjà calculées (rigging.ts).
// La section d'un tube se déduit de sa géométrie (diamètre, épaisseur) ; le module d'élasticité est celui du matériau. Aucune limite n'est supposée :
// charge admissible, capacité des points et contrainte admissible restent « inconnues » tant qu'elles ne sont pas saisies.
import type { Doc, Support } from "./model";
import { supportLength } from "./geom";
import { rig, type RigResult } from "./rigging";

export interface Tube { key: string; label: string; odMm: number; tMm: number; material: "acier" | "alu"; E: number; rho: number }
const T = (material: "acier" | "alu", odMm: number, tMm: number): Tube => ({ key: `${material}-${odMm}x${tMm}`, label: `${material === "acier" ? "Acier" : "Aluminium"} Ø ${String(odMm).replace(".", ",")} × ${String(tMm).replace(".", ",")} mm`, odMm, tMm, material, E: material === "acier" ? 210000 : 70000, rho: material === "acier" ? 7850 : 2700 });
export const TUBES: Tube[] = [T("acier", 48.3, 3.2), T("acier", 48.3, 4), T("acier", 60.3, 3.6), T("alu", 48.3, 4), T("alu", 50, 3), T("alu", 50, 4), T("alu", 50, 5)];
export const tubeOf = (key?: string | null) => TUBES.find((t) => t.key === key) ?? null;
/** Propriétés d'un tube rond : aire (mm²), inertie (mm⁴), module de flexion (mm³), poids au mètre (kg/m). Géométrie pure. */
export function tubeProps(t: Tube) { const D = t.odMm, d = D - 2 * t.tMm, A = (Math.PI / 4) * (D * D - d * d), I = (Math.PI / 64) * (D ** 4 - d ** 4); return { A, I, W: I / (D / 2), kgPerM: +((A * t.rho) / 1e6).toFixed(2) }; }

export interface BeamLoad { x: number; kg: number; label: string; from?: number; to?: number; n?: number }
export interface BeamPlan {
  r: RigResult; L: number; q: number; loads: BeamLoad[]; xs: number[]; M: number[]; w: (number | null)[];
  mMax: number; mAt: number; sigmaMPa: number | null; wMaxMm: number | null; wAt: number; spanRef: number; usefulKg: number;
}
const G = 9.80665, N = 400;
/** Tout ce qu'il faut pour dessiner et vérifier une barre. Les réactions viennent de rig() : ici on ne fait que parcourir la barre. */
export function beamPlan(doc: Doc, s: Support): BeamPlan {
  const r = rig(doc, s), sf = doc.safety, L = supportLength(s) / 1000, q = (s.kgPerM || 0) + sf.cableKgPerM, loads: BeamLoad[] = [], pt: { x: number; kg: number }[] = [];
  const fx = Object.values(doc.fixtures).filter((f) => f.attach?.supportId === s.id).sort((a, b) => a.attach!.alongMm - b.attach!.alongMm);
  fx.forEach((f, i) => { const x = Math.min(L, Math.max(0, f.attach!.alongMm / 1000)), kg = (f.weightKg || 0) + sf.accessoryKg; loads.push({ x, kg, label: f.unitNumber ? "n° " + f.unitNumber : "appareil " + (i + 1), n: i + 1 }); pt.push({ x, kg }); });
  for (const e of s.loads ?? []) { const kg = e.kg ?? 0; if (!(kg > 0)) continue; const a = Math.max(0, (e.alongMm - e.lengthMm / 2) / 1000), b = Math.min(L, (e.alongMm + e.lengthMm / 2) / 1000);
    if (!(e.lengthMm > 0) || b - a < 0.02) { const x = Math.min(L, Math.max(0, e.alongMm / 1000)); loads.push({ x, kg, label: e.name || "charge" }); pt.push({ x, kg }); }
    else { loads.push({ x: (a + b) / 2, kg, label: e.name || "charge répartie", from: a, to: b }); const n = Math.max(2, Math.ceil((b - a) / 0.1)); for (let k = 0; k < n; k++) pt.push({ x: a + ((b - a) * (k + 0.5)) / n, kg: kg / n }); } }
  for (const a of s.accessories ?? []) { const kg = a.kg ?? 0; if (kg > 0) { const x = Math.min(L, Math.max(0, a.alongMm / 1000)); loads.push({ x, kg, label: a.kind === "arm" ? "bras de déport" : "échelle" }); pt.push({ x, kg }); } }
  const xs = Array.from({ length: N + 1 }, (_, i) => (L * i) / N), M = new Array<number>(N + 1).fill(0), w: (number | null)[] = new Array(N + 1).fill(null), usefulKg = r.totalKg - r.selfKg;
  const out: BeamPlan = { r, L, q, loads, xs, M, w, mMax: 0, mAt: 0, sigmaMPa: null, wMaxMm: null, wAt: 0, spanRef: 0, usefulKg };
  if (r.error || !r.points.length) return out;
  const R = r.points.map((p) => ({ x: Math.min(L, Math.max(0, p.alongMm / 1000)), kg: p.kg }));
  for (let i = 0; i <= N; i++) { const x = xs[i]; let m = (-q * x * x) / 2; for (const p of R) if (x > p.x) m += p.kg * (x - p.x); for (const p of pt) if (x > p.x) m -= p.kg * (x - p.x); M[i] = m; if (Math.abs(m) > Math.abs(out.mMax)) { out.mMax = m; out.mAt = x; } }
  const tube = s.kind === "pipe" ? tubeOf(s.tube) : null; if (!tube) return out;
  const tp = tubeProps(tube), EI = tube.E * tp.I * 1e-6; // N·m²
  out.sigmaMPa = (Math.abs(out.mMax) * G * 1000) / tp.W; // N·mm / mm³
  // flèche : double intégration de la courbure M/EI, nulle sur le premier et le dernier point d'accroche
  const h = L / N, th = new Array<number>(N + 1).fill(0), y = new Array<number>(N + 1).fill(0); for (let i = 1; i <= N; i++) { th[i] = th[i - 1] + ((M[i - 1] + M[i]) / 2) * G * h / EI; y[i] = y[i - 1] + ((th[i - 1] + th[i]) / 2) * h; }
  const at = (x: number) => { const u = Math.min(N, Math.max(0, x / h)), i = Math.min(N - 1, Math.floor(u)), f = u - i; return y[i] * (1 - f) + y[i + 1] * f; }, x0 = R[0].x, x1 = R[R.length - 1].x, y0 = at(x0), y1 = at(x1), c1 = x1 > x0 ? -(y1 - y0) / (x1 - x0) : 0, c2 = -y0 - c1 * x0;
  let wm = 0; for (let i = 0; i <= N; i++) { const v = (y[i] + c1 * xs[i] + c2) * 1000; w[i] = v; if (Math.abs(v) > Math.abs(wm)) { wm = v; out.wAt = xs[i]; } }
  out.wMaxMm = Math.abs(wm);
  // portée de référence pour le critère de flèche : la travée où elle est maximale, ou deux fois le porte-à-faux
  const k = R.findIndex((p) => p.x > out.wAt); out.spanRef = k === 0 ? 2 * R[0].x : k < 0 ? 2 * (L - x1) : R[k].x - R[k - 1].x;
  return out;
}
export interface PlanCheck { key: string; label: string; value: string; limit: string; ratio: number | null }
/** Les quatre vérifications du plan de charge. ratio : null quand la limite n'a pas été saisie. */
export function planChecks(p: BeamPlan, s: Support, deflRatio: number): PlanCheck[] {
  const fr = (n: number, d = 1) => n.toFixed(d).replace(".", ","), top = p.r.points.reduce((m, x) => (x.designKg > (m?.designKg ?? -1) ? x : m), null as RigResult["points"][number] | null);
  const caps = p.r.points.map((x) => x.capacityKg).filter((c): c is number => c != null), capMin = caps.length === p.r.points.length && caps.length ? Math.min(...caps) : null, worst = p.r.points.length ? Math.max(...p.r.points.map((x) => (x.capacityKg ? x.designKg / x.capacityKg : 0))) : 0;
  const lim = p.spanRef > 0 ? (p.spanRef * 1000) / deflRatio : null;
  return [
    { key: "charge", label: "Charge utile (matériel, accessoires, câbles, charges ajoutées)", value: fr(p.usefulKg) + " kg", limit: s.allowableKg != null ? fr(s.allowableKg, 0) + " kg" : "inconnue", ratio: s.allowableKg ? p.usefulKg / s.allowableKg : null },
    { key: "point", label: "Point de suspension le plus chargé", value: top ? fr(top.designKg) + " kg" : "—", limit: capMin != null ? fr(capMin, 0) + " kg" : "inconnue", ratio: capMin != null ? worst : null },
    { key: "sigma", label: `Contrainte de flexion (M = ${fr(Math.abs(p.mMax))} kg·m à ${fr(p.mAt, 2)} m)`, value: p.sigmaMPa != null ? fr(p.sigmaMPa) + " MPa" : "inconnue (tube à choisir)", limit: s.stressAdmMPa != null ? fr(s.stressAdmMPa, 0) + " MPa" : "inconnue", ratio: p.sigmaMPa != null && s.stressAdmMPa ? p.sigmaMPa / s.stressAdmMPa : null },
    { key: "fleche", label: `Flèche${p.wMaxMm != null ? ` (à ${fr(p.wAt, 2)} m)` : ""}`, value: p.wMaxMm != null ? fr(p.wMaxMm) + " mm" : "inconnue (tube à choisir)", limit: lim != null && p.wMaxMm != null ? `portée / ${deflRatio} = ${fr(lim)} mm` : `portée / ${deflRatio}`, ratio: p.wMaxMm != null && lim ? p.wMaxMm / lim : null },
  ];
}
