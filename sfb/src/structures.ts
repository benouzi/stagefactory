// Structures scéniques : des assemblages de ponts posés en une fois (portique, gril sur tours, pont suspendu, ligne de totems).
// Chaque pont créé est un vrai support du projet : il porte des appareils et entre dans le calcul des charges comme les autres.
// Rien n'est inventé sur la résistance : charges admissibles et capacités des tours restent « inconnues » tant qu'elles ne sont pas saisies.
import { evenPoints, type RigPoint, type Support, type Vec2 } from "./model";
import { seriesFields, seriesOf } from "./trussLib";

export type StructureType = "portique" | "gril" | "suspendu" | "totems";
export interface StructureSpec { type: StructureType; name?: string; x: number; y: number; rotDeg: number; lengthMm: number; depthMm: number; heightMm: number; sectionMm: number; kgPerM: number; count: number; series?: string }
export const STRUCTURES: { key: StructureType; label: string; note: string }[] = [
  { key: "portique", label: "Portique", note: "Un pont posé sur deux tours : face, contre, arche d'entrée, pont de fond." },
  { key: "gril", label: "Gril sur quatre tours", note: "Un cadre de quatre ponts sur quatre tours d'angle : scène couverte, stand, plateau sans accroche." },
  { key: "suspendu", label: "Pont suspendu", note: "Un pont levé par des moteurs répartis, quand la salle offre des points d'accroche." },
  { key: "totems", label: "Ligne de totems", note: "Des tours verticales alignées, pour des projecteurs latéraux ou un fond lumineux." },
];
export const SECTIONS = [290, 400, 520];
export const DEFAULT_SPEC: StructureSpec = { type: "portique", x: 0, y: 3000, rotDeg: 0, lengthMm: 8000, depthMm: 6000, heightMm: 5000, sectionMm: 290, kgPerM: 8, count: 4 };
export type NewSupport = Omit<Support, "id">;
export interface StructurePlan { supports: NewSupport[]; totems: { pos: Vec2; hMm: number; sectionMm: number }[]; towers: Vec2[]; notes: string[] }

const rot = (p: Vec2, c: Vec2, deg: number): Vec2 => { const a = (deg * Math.PI) / 180, dx = p.x - c.x, dy = p.y - c.y; return { x: Math.round(c.x + dx * Math.cos(a) - dy * Math.sin(a)), y: Math.round(c.y + dx * Math.sin(a) + dy * Math.cos(a)) }; };
const legs = (L: number): RigPoint[] => [0, L].map((alongMm, i) => ({ id: "leg" + i + Math.random().toString(36).slice(2, 8), alongMm, capacityKg: null, kind: "fixed" as const, leg: true }));

/** Ce que la structure va créer. Pur calcul : rien n'est posé ici. */
export function planStructure(s: StructureSpec): StructurePlan {
  const c = { x: s.x, y: s.y }, L = Math.max(1000, s.lengthMm), D = Math.max(1000, s.depthMm), H = Math.max(500, s.heightMm), name = (s.name || "").trim(), out: StructurePlan = { supports: [], totems: [], towers: [], notes: [] };
  const truss = (label: string, a: Vec2, b: Vec2, points: RigPoint[]): NewSupport => { const A = rot(a, c, s.rotDeg), B = rot(b, c, s.rotDeg), [p, q] = A.x < B.x || (A.x === B.x && A.y <= B.y) ? [A, B] : [B, A];
    return { kind: "truss", name: label, a: p, b: q, zMm: H, houseNo: null, allowableKg: null, kgPerM: Math.max(0, s.kgPerM), points, sectionMm: s.sectionMm, ...(seriesOf(s.series) ? seriesFields(s.series, Math.hypot(q.x - p.x, q.y - p.y)) : {}) }; };
  if (s.type === "portique") {
    out.supports.push(truss(name || "Portique", { x: c.x - L / 2, y: c.y }, { x: c.x + L / 2, y: c.y }, legs(L)));
    out.towers.push(rot({ x: c.x - L / 2, y: c.y }, c, s.rotDeg), rot({ x: c.x + L / 2, y: c.y }, c, s.rotDeg));
    out.notes.push("Le pont repose sur ses deux tours : leur capacité et la charge admissible du pont sont à saisir d'après le fabricant.");
  } else if (s.type === "gril") {
    const n = name || "Gril", x0 = c.x - L / 2, x1 = c.x + L / 2, y0 = c.y - D / 2, y1 = c.y + D / 2;
    out.supports.push(truss(n + " · face", { x: x0, y: y0 }, { x: x1, y: y0 }, legs(L)), truss(n + " · lointain", { x: x0, y: y1 }, { x: x1, y: y1 }, legs(L)), truss(n + " · jardin", { x: x0, y: y0 }, { x: x0, y: y1 }, legs(D)), truss(n + " · cour", { x: x1, y: y0 }, { x: x1, y: y1 }, legs(D)));
    for (const p of [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x0, y: y1 }, { x: x1, y: y1 }]) out.towers.push(rot(p, c, s.rotDeg));
    out.notes.push("Chaque tour d'angle porte deux ponts : sa charge réelle est la somme des deux réactions affichées à cet angle dans « Rigging et charges ».", "Le calcul traite chaque pont séparément ; il ne vérifie ni les tours, ni les angles, ni la tenue au vent ou au renversement.");
  } else if (s.type === "suspendu") {
    const sup = truss(name || "Pont suspendu", { x: c.x - L / 2, y: c.y }, { x: c.x + L / 2, y: c.y }, evenPoints(L, Math.max(2, Math.min(12, Math.round(s.count))), "hoist")); out.supports.push(sup);
    out.notes.push("Les moteurs sont répartis régulièrement : règle leur position et leur capacité dans l'inspecteur du pont.");
  } else {
    const n = Math.max(1, Math.min(24, Math.round(s.count)));
    const tsec = seriesOf(s.series)?.sectionMm ?? s.sectionMm; void tsec;
    for (let i = 0; i < n; i++) out.totems.push({ pos: rot({ x: n === 1 ? c.x : c.x - L / 2 + (L * i) / (n - 1), y: c.y }, c, s.rotDeg), hMm: H, sectionMm: s.sectionMm });
    out.notes.push("Un totem est un élément de décor : il n'entre pas dans le calcul des charges. Vérifie sa stabilité (embase, lest) d'après le fabricant.");
  }
  return out;
}
/** Longueur totale de pont et poids propre, pour l'aperçu. */
export function structureTotals(p: StructurePlan): { trussM: number; ownKg: number } {
  let m = 0, kg = 0; for (const s of p.supports) { const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) / 1000; m += L; kg += L * s.kgPerM; } return { trussM: m, ownKg: kg };
}
