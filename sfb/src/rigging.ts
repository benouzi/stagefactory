// Charges d'une perche ou d'un pont : ce que reprend chaque point d'accroche, et les efforts dans la barre.
//
// Principes, dans l'ordre :
// 1. La barre est une poutre continue posée sur ses points. Appareils = charges ponctuelles ; poids propre et câblage = charge répartie.
// 2. Chaque résultat est calculé deux fois, par deux méthodes sans rien en commun (déplacements par éléments, puis intégration
//    de la déformée par fonctions de singularité). Si elles ne tombent pas d'accord, ou si l'équilibre n'est pas respecté,
//    l'outil n'affiche aucun chiffre : il affiche une erreur.
// 3. Avec trois points ou plus, la répartition réelle dépend du réglage des moteurs : un moteur un peu bas ne porte plus rien
//    et ses voisins prennent sa part. On calcule donc aussi le cas défavorable (chaque point seul à ne plus porter, puis un
//    point sur deux) et c'est lui qu'on compare aux capacités.
// 4. Une donnée manquante n'est jamais comptée comme bonne : le contrôle correspondant passe à « non vérifié ».
// Reste hors du calcul : la hauteur exacte des points, la raideur réelle de la barre, les brides, la charpente de la salle.
import type { Doc, Id, RigPoint, Support } from "./model";
import { supportLength } from "./geom";
import { symbolOf } from "./library";

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    if (Math.abs(A[p][i]) < 1e-11) return null;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) { const k = A[r][i] / A[i][i]; if (!k) continue; for (let c = i; c < n; c++) A[r][c] -= k * A[i][c]; b[r] -= k * b[i]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return x;
}
export interface PLoad { x: number; kg: number }

// Méthode 1 : déplacements (éléments de poutre). Réactions en kg aux abscisses « supports » (m).
export function beamReactions(L: number, supports: number[], loads: PLoad[], q: number): number[] | null {
  if (supports.length < 2) return null;
  const snap = (v: number) => (v >= L - 5e-5 ? L : Math.max(0, +v.toFixed(4))); // le bout de la barre est une valeur exacte
  const xs = [...new Set([0, L, ...supports, ...loads.map((l) => l.x)].map(snap))].sort((a, b) => a - b);
  const n = xs.length, N = n * 2, K = Array.from({ length: N }, () => new Array(N).fill(0)), F = new Array(N).fill(0);
  const at = (x: number) => xs.indexOf(snap(x));
  for (let e = 0; e < n - 1; e++) {
    const l = xs[e + 1] - xs[e], k = 1 / (l * l * l), d = [e * 2, e * 2 + 1, e * 2 + 2, e * 2 + 3];
    const m = [[12, 6 * l, -12, 6 * l], [6 * l, 4 * l * l, -6 * l, 2 * l * l], [-12, -6 * l, 12, -6 * l], [6 * l, 2 * l * l, -6 * l, 4 * l * l]];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) K[d[i]][d[j]] += m[i][j] * k;
    F[d[0]] -= (q * l) / 2; F[d[1]] -= (q * l * l) / 12; F[d[2]] -= (q * l) / 2; F[d[3]] += (q * l * l) / 12;
  }
  for (const p of loads) { const i = at(p.x); if (i < 0) return null; F[i * 2] -= p.kg; } // une charge qu'on ne sait pas placer bloque le calcul, elle n'est jamais ignorée
  if (supports.some((x) => at(x) < 0)) return null;
  const fixed = new Set(supports.map((s) => at(s) * 2)), free = [...Array(N).keys()].filter((i) => !fixed.has(i));
  const u = solve(free.map((i) => free.map((j) => K[i][j])), free.map((i) => F[i]));
  if (!u) return null;
  const full = new Array(N).fill(0); free.forEach((i, k) => (full[i] = u[k]));
  return supports.map((s) => { const i = at(s) * 2; let r = -F[i]; for (let j = 0; j < N; j++) r += K[i][j] * full[j]; return r; });
}

// Méthode 2 : intégration de la déformée. EI·w(x) = Σ R_i<x−s_i>³/6 − Σ P_j<x−a_j>³/6 − q·x⁴/24 + C1·x + C2.
// Inconnues : les réactions et les deux constantes. Équations : flèche nulle sur chaque point, somme des forces, somme des moments.
export function beamReactionsCheck(L: number, supports: number[], loads: PLoad[], q: number): number[] | null {
  const n = supports.length; if (n < 2) return null;
  const mac = (x: number, a: number) => (x > a ? (x - a) ** 3 / 6 : 0);
  const A: number[][] = [], b: number[] = [];
  for (const s of supports) { A.push([...supports.map((si) => mac(s, si)), s, 1]); b.push(loads.reduce((t, p) => t + p.kg * mac(s, p.x), 0) + (q * s ** 4) / 24); }
  A.push([...supports.map(() => 1), 0, 0]); b.push(loads.reduce((t, p) => t + p.kg, 0) + q * L);
  A.push([...supports, 0, 0]); b.push(loads.reduce((t, p) => t + p.kg * p.x, 0) + (q * L * L) / 2);
  const x = solve(A, b);
  return x ? x.slice(0, n) : null;
}

// Efforts dans la barre pour des réactions données : plus grand moment fléchissant (kg·m) et plus grand effort tranchant (kg).
export function internal(L: number, supports: number[], reactions: number[], loads: PLoad[], q: number): { mMax: number; vMax: number } {
  const ev = [...supports.map((x, i) => ({ x, f: reactions[i] })), ...loads.map((p) => ({ x: p.x, f: -p.kg }))].sort((a, b) => a.x - b.x);
  let V = 0, M = 0, x0 = 0, mMax = 0, vMax = 0;
  const walk = (x1: number) => { const d = x1 - x0; if (d <= 0) return; // sur le tronçon : V décroît de q par mètre ; l'extremum de M est là où V s'annule
    if (q > 0 && V > 0 && V - q * d < 0) { const dz = V / q; mMax = Math.max(mMax, Math.abs(M + V * dz - (q * dz * dz) / 2)); }
    M += V * d - (q * d * d) / 2; V -= q * d; x0 = x1; mMax = Math.max(mMax, Math.abs(M)); vMax = Math.max(vMax, Math.abs(V)); };
  for (const e of ev) { walk(e.x); V += e.f; vMax = Math.max(vMax, Math.abs(V)); }
  walk(L);
  return { mMax, vMax };
}

/** Palonnier à deux brins : effort dans chaque brin pour une charge W suspendue au sommet. Deux méthodes ; null si elles divergent ou si la géométrie est impossible. */
export function bridle(W: number, aMm: number, bMm: number, dropMm: number): { t1: number; t2: number; a1Deg: number; a2Deg: number; includedDeg: number; h: number } | null {
  if (!(dropMm > 0) || !(aMm >= 0) || !(bMm >= 0) || aMm + bMm <= 0 || !(W >= 0)) return null;
  // 1) trigonométrie : angles des brins avec la verticale
  const a1 = Math.atan2(aMm, dropMm), a2 = Math.atan2(bMm, dropMm), s = Math.sin(a1 + a2), t1 = (W * Math.sin(a2)) / s, t2 = (W * Math.sin(a1)) / s;
  // 2) équilibre du sommet, résolu comme un système : composantes horizontales égales, composantes verticales = W
  const l1 = Math.hypot(aMm, dropMm), l2 = Math.hypot(bMm, dropMm), m = [[-aMm / l1, bMm / l2], [dropMm / l1, dropMm / l2]], det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  if (Math.abs(det) < 1e-12) return null; const u1 = (0 * m[1][1] - m[0][1] * W) / det, u2 = (m[0][0] * W - 0 * m[1][0]) / det;
  if (![t1, t2, u1, u2].every(Number.isFinite) || Math.abs(t1 - u1) > 1e-6 * Math.max(1, W) || Math.abs(t2 - u2) > 1e-6 * Math.max(1, W)) return null;
  return { t1, t2, a1Deg: (a1 * 180) / Math.PI, a2Deg: (a2 * 180) / Math.PI, includedDeg: ((a1 + a2) * 180) / Math.PI, h: t1 * Math.sin(a1) };
}
export type CheckState = "ok" | "bad" | "unknown";
export interface Check { key: string; label: string; state: CheckState; detail: string }
export interface PointLoad { id: Id; alongMm: number; kind: RigPoint["kind"]; kg: number; worstKg: number; designKg: number; buildingKg: number; capacityKg: number | null; hoistKg: number | null; use: number | null; over: boolean; uplift: boolean }
export interface RigResult {
  support: Support; lengthM: number; count: number; powerW: number;
  fixturesKg: number; accessoriesKg: number; selfKg: number; cableKg: number; extraKg: number; totalKg: number; missingWeight: number;
  points: PointLoad[]; indeterminate: boolean; mMax: number; vMax: number; spanMax: number; overhangMax: number;
  error: string | null; checks: Check[]; verdict: CheckState;
  state: "ok" | "over" | "none" | "single" | "uplift" | "error"; allowableOver: boolean | null;
}
const worst = (list: CheckState[]): CheckState => (list.includes("bad") ? "bad" : list.includes("unknown") ? "unknown" : "ok");
const TOL = 0.005; // 0,5 % de la charge totale, ou 50 g

export function rig(doc: Doc, s: Support): RigResult {
  const sf = doc.safety, L = supportLength(s) / 1000;
  const fx = Object.values(doc.fixtures).filter((f) => f.attach?.supportId === s.id);
  const loads: PLoad[] = fx.map((f) => ({ x: Math.min(L, Math.max(0, f.attach!.alongMm / 1000)), kg: (f.weightKg || 0) + sf.accessoryKg }));
  // Charges de rigging ajoutées à la main. Une charge répartie est découpée en tranches de 10 cm au plus : les deux méthodes la traitent alors comme une suite de charges ponctuelles.
  const extra = s.loads ?? []; let extraKg = 0;
  for (const e of extra) { const kg = e.kg ?? 0; if (!(kg > 0)) continue; const a = Math.max(0, (e.alongMm - e.lengthMm / 2) / 1000), b = Math.min(L, (e.alongMm + e.lengthMm / 2) / 1000); extraKg += kg;
    if (!(e.lengthMm > 0) || b - a < 0.02) loads.push({ x: Math.min(L, Math.max(0, e.alongMm / 1000)), kg }); else { const n = Math.max(2, Math.ceil((b - a) / 0.1)); for (let k = 0; k < n; k++) loads.push({ x: a + ((b - a) * (k + 0.5)) / n, kg: kg / n }); } }
  // Bras de déport et échelles : leur poids propre pèse sur la barre à leur point d'accroche. Les appareils qu'ils portent y pèsent déjà.
  const accs = s.accessories ?? []; let torsion = 0;
  for (const a of accs) { const x = Math.min(L, Math.max(0, a.alongMm / 1000)), kg = a.kg ?? 0; if (kg > 0) { loads.push({ x, kg }); extraKg += kg; }
    if (a.kind === "arm") torsion += a.side * (a.lengthMm / 1000) * (kg / 2 + fx.filter((f) => f.attach?.accId === a.id).reduce((t, f) => t + (f.weightKg || 0) + sf.accessoryKg, 0)); }
  const q = (s.kgPerM || 0) + sf.cableKgPerM;
  const fixturesKg = fx.reduce((t, f) => t + (f.weightKg || 0), 0), accessoriesKg = fx.length * sf.accessoryKg, selfKg = (s.kgPerM || 0) * L, cableKg = sf.cableKgPerM * L;
  const totalKg = fixturesKg + accessoriesKg + selfKg + cableKg + extraKg, missingWeight = fx.filter((f) => !f.weightKg).length + extra.filter((e) => e.kg == null).length + accs.filter((a) => a.kg == null).length;
  const pts = [...(s.points ?? [])].sort((a, b) => a.alongMm - b.alongMm), xs = pts.map((p) => Math.min(L, Math.max(0, p.alongMm / 1000)));
  const base = { support: s, lengthM: L, count: fx.length, powerW: fx.reduce((t, f) => t + (f.powerW || 0), 0), fixturesKg, accessoriesKg, selfKg, cableKg, extraKg, totalKg, missingWeight, allowableOver: s.allowableKg == null ? null : totalKg > s.allowableKg };
  const spanMax = xs.length > 1 ? Math.max(...xs.slice(1).map((x, i) => x - xs[i])) : 0, overhangMax = xs.length ? Math.max(xs[0], L - xs[xs.length - 1]) : L;
  const fail = (error: string, state: RigResult["state"]): RigResult => ({ ...base, points: [], indeterminate: false, mMax: 0, vMax: 0, spanMax, overhangMax, error, state, verdict: state === "none" && !fx.length ? "unknown" : "bad",
    checks: [{ key: "points", label: "Points d'accroche", state: state === "none" && !fx.length ? "unknown" : "bad", detail: error }] });
  if (!pts.length) return fail("Aucun point d'accroche défini : la répartition ne peut pas être calculée.", "none");
  if (pts.length === 1 || new Set(xs.map((x) => x.toFixed(3))).size < 2) return fail("Un seul point d'accroche : la barre n'est pas stable et la répartition n'a pas de sens.", "single");

  // Les deux méthodes, et l'équilibre. Le moindre désaccord bloque l'affichage.
  const tol = Math.max(0.05, totalKg * TOL);
  const both = (sx: number[]): number[] | null => {
    const a = beamReactions(L, sx, loads, q), b = beamReactionsCheck(L, sx, loads, q);
    if (!a || !b || a.some((v, i) => !isFinite(v) || Math.abs(v - b[i]) > tol)) return null;
    const sum = a.reduce((t, v) => t + v, 0), mom = a.reduce((t, v, i) => t + v * sx[i], 0), momLoads = loads.reduce((t, p) => t + p.kg * p.x, 0) + (q * L * L) / 2;
    return Math.abs(sum - totalKg) > tol || Math.abs(mom - momLoads) > tol * Math.max(1, L) ? null : a;
  };
  // Un point d'accroche ne peut que tirer vers le haut : une chaîne ou une élingue détendue ne retient rien.
  // Si le calcul donne une réaction vers le bas, ce point est en réalité détendu : on le retire et on recalcule.
  const settle = (keep: number[]): { keep: number[]; r: number[] } | "unstable" | null => {
    let k = [...keep];
    for (;;) {
      if (k.length < 2) return "unstable";
      const r = both(k.map((i) => xs[i])); if (!r) return null;
      let lo = 0; for (let j = 1; j < r.length; j++) if (r[j] < r[lo]) lo = j;
      if (r[lo] >= -tol) return { keep: k, r };
      k = k.filter((_, j) => j !== lo);
    }
  };
  const all = xs.map((_, i) => i), first = both(xs), base0 = settle(all);
  if (!first || base0 === null) return fail("Le calcul n'a pas passé son contrôle interne (deux méthodes en désaccord ou équilibre non respecté). Aucun chiffre n'est affiché : vérifie que deux points ne sont pas au même endroit, puis signale ce cas.", "error");
  if (base0 === "unstable") return fail("La charge en porte-à-faux fait basculer la barre : avec ces points d'accroche elle ne tient pas en équilibre. Rapproche un point du bout chargé.", "uplift");
  const n = xs.length, ideal = new Array(n).fill(0); base0.keep.forEach((k, j) => (ideal[k] = base0.r[j]));
  const slack = new Set(all.filter((i) => !base0.keep.includes(i)));

  // Cas défavorable : un point qui ne porte plus, puis un point sur deux (moteurs mal réglés). Sans objet avec deux points.
  const worstKg = [...ideal]; let { mMax, vMax } = internal(L, base0.keep.map((k) => xs[k]), base0.r, loads, q); let tipping = false;
  if (n >= 3) {
    const patterns: number[][] = [];
    for (let i = 0; i < n; i++) patterns.push(all.filter((k) => k !== i));
    if (n >= 4) { patterns.push(all.filter((k) => k % 2 === 0)); patterns.push(all.filter((k) => k % 2 === 1)); }
    for (const keep of patterns) {
      const st = settle(keep);
      if (st === "unstable") { tipping = true; continue; }
      if (!st) continue;
      st.keep.forEach((k, j) => { worstKg[k] = Math.max(worstKg[k], st.r[j]); });
      const it = internal(L, st.keep.map((k) => xs[k]), st.r, loads, q); mMax = Math.max(mMax, it.mMax); vMax = Math.max(vMax, it.vMax);
    }
  }
  const points: PointLoad[] = pts.map((p, i) => {
    const dyn = p.kind === "hoist" ? sf.dynFactor : 1, designKg = worstKg[i] * dyn, uplift = slack.has(i);
    return { id: p.id, alongMm: p.alongMm, kind: p.kind, kg: ideal[i], worstKg: worstKg[i], designKg, buildingKg: designKg + (p.hoistKg ?? 0), capacityKg: p.capacityKg, hoistKg: p.hoistKg ?? null, use: p.capacityKg ? designKg / p.capacityKg : null, over: p.capacityKg != null && designKg > p.capacityKg, uplift };
  });

  const kg = (v: number) => `${v.toFixed(0)} kg`, checks: Check[] = [];
  const noCap = points.filter((p) => p.capacityKg == null).length, over = points.filter((p) => p.over), top = points.reduce((a, b) => (b.designKg > a.designKg ? b : a));
  checks.push({ key: "points", label: "Charge de chaque point contre sa capacité", state: over.length ? "bad" : noCap ? "unknown" : "ok",
    detail: over.length ? `${over.length} point${over.length > 1 ? "s" : ""} au-delà de sa capacité (jusqu'à ${kg(over.reduce((a, b) => (b.designKg > a.designKg ? b : a)).designKg)}).` : noCap ? `Capacité non renseignée sur ${noCap} point${noCap > 1 ? "s" : ""} : rien n'est comparé pour ${noCap > 1 ? "eux" : "lui"}.` : `Point le plus chargé : ${kg(top.designKg)}, soit ${Math.round((top.use ?? 0) * 100)} % de sa capacité.` });
  checks.push({ key: "uplift", label: "Aucun point soulevé", state: points.some((p) => p.uplift) ? "bad" : "ok", detail: points.some((p) => p.uplift) ? "Une charge en porte-à-faux détend un point : il ne porte rien, ses voisins prennent tout et la barre peut basculer." : "Tous les points portent." });
  if (tipping) checks.push({ key: "tip", label: "Stabilité si un point lâche", state: "bad", detail: "Si un des points ne porte plus, la barre bascule : il n'y a aucune marge. Ajoute un point ou rapproche les points des bouts chargés." });
  checks.push({ key: "total", label: "Charge totale contre la charge admissible de la barre", state: s.allowableKg == null ? "unknown" : totalKg > s.allowableKg ? "bad" : "ok", detail: s.allowableKg == null ? "Charge admissible non renseignée." : `${kg(totalKg)} pour ${kg(s.allowableKg)} admissibles.` });
  if (accs.some((a) => a.kind === "arm")) checks.push({ key: "torsion", label: "Torsion de la barre (bras de déport)", state: "unknown", detail: `Les bras de déport tordent la barre : couple de ${Math.abs(torsion).toFixed(0)} kg·m${Math.abs(torsion) < 0.5 ? " (les bras s'équilibrent)" : ""}. Ce logiciel ne vérifie ni la tenue en torsion de la barre ni celle des colliers : à faire valider par une personne compétente.` });
  if (accs.some((a) => a.kind === "ladder")) checks.push({ key: "ladder", label: "Échelles de projecteur", state: "unknown", detail: "La charge admissible de chaque échelle et la sécurité de son accroche (élingue de sécurité, anti-balancement) ne sont pas vérifiées ici : voir la notice du fabricant." });
  // Au-dessus de la barre : élingue, palonnier, point du bâtiment. Contrôlés seulement quand ils sont décrits.
  { const src = (id: Id) => pts.find((p) => p.id === id)!, n = (i: number) => `point ${i + 1}`, bad: string[] = [], miss: string[] = [], info: string[] = []; let any = false;
    points.forEach((pl, i) => { const p = src(pl.id); if (p.slingCapKg != null) { any = true; if (pl.designKg > p.slingCapKg) bad.push(`${n(i)} : élingue chargée à ${kg(pl.designKg)} pour ${kg(p.slingCapKg)} admis`); }
      if (p.bridle) { any = true; const b = bridle(pl.buildingKg, p.bridle.aMm, p.bridle.bMm, p.bridle.dropMm);
        if (!b) { bad.push(`${n(i)} : palonnier impossible à calculer (hauteur nulle ou écarts incohérents)`); return; }
        info.push(`${n(i)} : brins à ${kg(b.t1)} et ${kg(b.t2)} pour ${kg(pl.buildingKg)} portés, ouverture ${b.includedDeg.toFixed(0)}°, effort horizontal ${kg(b.h)} sur chaque ancrage`);
        if (b.includedDeg > 120) bad.push(`${n(i)} : ouverture de ${b.includedDeg.toFixed(0)}°, au-delà de 120° un brin porte plus que la charge elle-même`);
        if (p.bridle.legCapKg == null) miss.push(`${n(i)} : charge admissible des brins`); else if (Math.max(b.t1, b.t2) > p.bridle.legCapKg) bad.push(`${n(i)} : brin à ${kg(Math.max(b.t1, b.t2))} pour ${kg(p.bridle.legCapKg)} admis`);
        if (p.originCapKg == null) miss.push(`${n(i)} : capacité des ancrages`); else if (Math.max(b.t1, b.t2) > p.originCapKg) bad.push(`${n(i)} : ancrage à ${kg(Math.max(b.t1, b.t2))} pour ${kg(p.originCapKg)} admis`); }
      else if (p.originCapKg != null) { any = true; if (pl.buildingKg > p.originCapKg) bad.push(`${n(i)} : point du bâtiment à ${kg(pl.buildingKg)} pour ${kg(p.originCapKg)} admis`); } });
    if (any) checks.push({ key: "above", label: "Élingues, palonniers et points du bâtiment", state: bad.length ? "bad" : miss.length ? "unknown" : "ok", detail: [...bad, ...(miss.length ? ["Non renseigné : " + miss.join(" ; ")] : []), ...info].join(". ") + ". Les efforts horizontaux d'un palonnier doivent être repris par la structure : ce point n'est pas vérifié ici." }); }
  const mAdm = s.mAdmKgm ?? null, vAdm = s.vAdmKg ?? null;
  checks.push({ key: "beam", label: "Résistance de la barre (flexion et effort tranchant)", state: mAdm == null || vAdm == null ? "unknown" : mMax > mAdm || vMax > vAdm ? "bad" : "ok",
    detail: `Moment fléchissant maximal ${mMax.toFixed(0)} kg·m, effort tranchant maximal ${kg(vMax)}, plus grande portée entre points ${spanMax.toFixed(2).replace(".", ",")} m, porte-à-faux ${overhangMax.toFixed(2).replace(".", ",")} m. ` + (mAdm == null || vAdm == null ? "Valeurs admissibles du fabricant non renseignées : à comparer à son tableau de charge." : mMax > mAdm || vMax > vAdm ? "Au-delà des valeurs admissibles saisies." : "Sous les valeurs admissibles saisies.") });
  checks.push({ key: "weights", label: "Poids de tous les appareils connus", state: missingWeight ? "unknown" : "ok", detail: missingWeight ? `${missingWeight} appareil${missingWeight > 1 ? "s" : ""} sans poids : la charge réelle est plus élevée que celle affichée.` : fx.some((f) => symbolOf(f.symbol).source !== "gdtf") ? "Tous renseignés, dont des poids génériques de la bibliothèque : à confirmer sur les fiches du matériel réel." : "Tous renseignés." });
  const hoists = pts.filter((p) => p.kind === "hoist");
  if (hoists.length) {
    const unk = hoists.filter((p) => !p.cls).length, d8 = hoists.filter((p) => p.cls === "D8" && !p.secondary).length;
    checks.push({ key: "class", label: "Moteurs adaptés à la présence de personnes sous la charge", state: !sf.peopleBelow ? "ok" : d8 ? "bad" : unk ? "unknown" : "ok",
      detail: !sf.peopleBelow ? "Personne sous la charge d'après les réglages du projet." : d8 ? `${d8} moteur${d8 > 1 ? "s" : ""} D8 sans sécurité secondaire : un D8 ne tient pas une charge au-dessus de personnes sans reprise secondaire.` : unk ? `Classe non renseignée pour ${unk} moteur${unk > 1 ? "s" : ""}.` : "D8 avec sécurité secondaire, D8+ ou C1 partout. Un moteur D8 ou D8+ ne se manœuvre pas avec des personnes dessous." });
    const noW = hoists.filter((p) => p.hoistKg == null).length;
    checks.push({ key: "hoistKg", label: "Poids des moteurs compté au point de la salle", state: noW ? "unknown" : "ok", detail: noW ? `Poids non renseigné pour ${noW} moteur${noW > 1 ? "s" : ""} : la charge sur la charpente est sous-estimée d'autant.` : "Renseigné partout." });
  }
  if (n >= 3) checks.push({ key: "level", label: "Répartition réelle mesurée (pesons)", state: "unknown", detail: "Avec trois points ou plus, seul un peson sur chaque point dit ce qu'il reprend vraiment. Le cas défavorable calculé ici couvre un point qui ne porte plus, pas tous les mauvais réglages possibles." });
  const verdict = worst(checks.map((c) => c.state));
  return { ...base, points, indeterminate: n >= 3, mMax, vMax, spanMax, overhangMax, error: null, checks, verdict, state: points.some((p) => p.uplift) ? "uplift" : over.length ? "over" : "ok" };
}
export const rigAll = (doc: Doc): RigResult[] => Object.values(doc.supports).map((s) => rig(doc, s));

// ---------- Électricité : puissance appelée, tout à pleine puissance ----------
export interface PowerResult { totalW: number; amps: number; perPhaseA: number; supplyA: number | null; phases: 1 | 3; state: CheckState; detail: string }
export function power(doc: Doc): PowerResult {
  const sf = doc.safety, led = Object.values(doc.objects).filter((o) => o.kind === "ledwall").reduce((t, o) => t + (o.wMm / 1000) * (o.hMm / 1000) * o.wPerM2, 0);
  const totalW = Object.values(doc.fixtures).reduce((t, f) => t + (f.powerW || 0), 0) + led, phases = sf.supplyPhases;
  const perPhaseA = totalW / (phases === 3 ? 3 : 1) / 230; // charges réparties également entre phases, cos φ = 1
  const state: CheckState = sf.supplyA == null ? "unknown" : perPhaseA > sf.supplyA ? "bad" : "ok";
  return { totalW, amps: totalW / 230, perPhaseA, supplyA: sf.supplyA, phases, state,
    detail: sf.supplyA == null ? "Alimentation disponible non renseignée." : perPhaseA > sf.supplyA ? `${perPhaseA.toFixed(0)} A par phase pour ${sf.supplyA} A disponibles.` : `${perPhaseA.toFixed(0)} A par phase pour ${sf.supplyA} A disponibles (${Math.round((perPhaseA / sf.supplyA) * 100)} %).` };
}
