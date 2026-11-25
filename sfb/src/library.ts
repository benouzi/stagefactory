// Bibliothèque de départ.
// Poids et puissances : valeurs génériques indicatives, à remplacer par celles du matériel réel.
import type { Vec2 } from "./model";

export type Prim =
  | { t: "poly"; pts: Vec2[]; closed: boolean; fill?: boolean }
  | { t: "circle"; c: Vec2; r: number; fill?: boolean }
  | { t: "line"; a: Vec2; b: Vec2 };

// Rôle d'un canal DMX dans un mode. « cell » numérote les pixels d'un appareil à plusieurs sources.
export type ChanAttr = "dim" | "r" | "g" | "b" | "w" | "a" | "c" | "m" | "y" | "pan" | "tilt" | "shutter" | "zoom" | "gobo" | "iris" | "blade1" | "blade2" | "blade3" | "blade4" | "blade1b" | "blade2b" | "blade3b" | "blade4b" | "other";
export interface Chan { attr: ChanAttr; offset: number; fine?: number; cell?: number; gdtf?: string; phys?: [number, number] } // phys : course en degrés (pan, tilt)
export interface Mode { name: string; footprint: number; channels?: Chan[]; gobo?: { from: number; slot: number }[] } // gobo : valeur DMX de départ -> numéro de gobo (1 = premier de la roue)

export interface SymbolDef {
  key: string;
  name: string;
  moving: boolean;
  weightKg: number;
  powerW: number;
  modes: Mode[];
  plan: Prim[]; // en mm, origine au point d'accroche, lentille vers −Y (vers le public)
  source?: "builtin" | "gdtf";
  domain?: "light" | "video" | "sound"; // absent = lumière
  throwRatio?: number; // vidéoprojecteur
  lumens?: number;
  coverageDeg?: number; // enceinte : ouverture horizontale
  size?: { w: number; d: number; h: number }; // encombrement en mm, pour la vue 3D
  wheel?: { name: string; file: string }[]; // roue de gobos ; file = image de la fiche, ou « sf:… » pour un motif dessiné par l'outil
  manufacturer?: string;
  beamAngleDeg?: number | null;
  missing?: string[]; // données absentes de la fiche GDTF (poids, puissance)
  share?: { rid: number; revision: string; uploader: string }; // provenance GDTF Share
}

// Écriture courte d'un mode : un mot par canal, « + » pour l'octet fin du canal précédent, « - » pour un canal sans rôle suivi.
const M = (name: string, layout: string, cells = 1): Mode => {
  const channels: Chan[] = []; let o = 0;
  for (let cell = 1; cell <= cells; cell++) for (const w of layout.split(" ")) { o++; if (w === "+") channels[channels.length - 1].fine = o; else channels.push({ attr: (w === "-" ? "other" : w) as ChanAttr, offset: o, ...(cells > 1 ? { cell } : {}) }); }
  return { name, footprint: o, channels };
};
// Roue de gobos des lyres génériques : motifs dessinés par l'outil, un tous les 32 pas DMX.
const WHEEL = [{ name: "Ouvert", file: "sf:open" }, { name: "Points", file: "sf:dots" }, { name: "Étoile", file: "sf:star" }, { name: "Barres", file: "sf:bars" }, { name: "Brisures", file: "sf:breakup" }];
const G = (m: Mode): Mode => ({ ...m, gobo: WHEEL.map((_, i) => ({ from: i * 32, slot: i + 1 })) });
const P = (...n: number[]): Vec2[] => { const o: Vec2[] = []; for (let i = 0; i < n.length; i += 2) o.push({ x: n[i], y: n[i + 1] }); return o; };
const poly = (pts: Vec2[], fill = true): Prim => ({ t: "poly", pts, closed: true, fill });
const circle = (x: number, y: number, r: number, fill = true): Prim => ({ t: "circle", c: { x, y }, r, fill });
const line = (x1: number, y1: number, x2: number, y2: number): Prim => ({ t: "line", a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });

const par: Prim[] = [poly(P(-130, 60, 130, 60, 130, -120, 90, -210, -90, -210, -130, -120))];
const decoupe = (w: number): Prim[] => [poly(P(-90, 80, 90, 80, w, -260, -w, -260)), poly(P(-w + 15, -260, w - 15, -260, w - 15, -330, -w + 15, -330))];
const fresnel: Prim[] = [poly(P(-140, 90, 140, 90, 140, -170, -140, -170)), line(-140, -110, 140, -110), line(-140, -140, 140, -140)];
const pc: Prim[] = [poly(P(-140, 90, 140, 90, 140, -170, -140, -170)), line(-140, -140, 140, -140)];
const lyre = (inner: Prim[]): Prim[] => [poly(P(-170, 170, 170, 170, 170, -170, -170, -170)), circle(0, 0, 130), ...inner];

export const LIBRARY: SymbolDef[] = [
  { key: "par-led", name: "PAR LED RGBW", moving: false, weightKg: 4, powerW: 150, modes: [M("RGBW", "dim r g b w shutter -"), M("Étendu", "dim + r g b w shutter - - -")], plan: par },
  { key: "par-zoom", name: "PAR LED zoom", moving: false, weightKg: 6, powerW: 200, modes: [M("RGBW + zoom", "dim r g b w shutter zoom - -")], plan: [...par, line(-90, -160, 90, -160)] },
  { key: "decoupe", name: "Découpe LED 15-30°", moving: false, weightKg: 9, powerW: 250, modes: [M("Dimmer 16 bits", "dim +"), M("Dimmer", "dim")], plan: decoupe(55) },
  { key: "decoupe-l", name: "Découpe LED 25-50°", moving: false, weightKg: 9, powerW: 250, modes: [M("Dimmer 16 bits", "dim +")], plan: decoupe(80) },
  { key: "fresnel", name: "Fresnel LED 15-55°", moving: false, weightKg: 8, powerW: 250, modes: [M("Dimmer 16 bits", "dim +")], plan: fresnel },
  { key: "pc1k", name: "PC 1 kW halogène", moving: false, weightKg: 7, powerW: 1000, modes: [M("Gradateur", "dim")], plan: pc },
  { key: "wash", name: "Lyre wash LED", moving: true, weightKg: 19, powerW: 420, modes: [M("Standard", "pan + tilt + dim shutter r g b w zoom - - - -"), M("Étendu", "pan + tilt + dim + shutter r + g + b + w + zoom - - - - -")], plan: lyre([line(-130, 0, 130, 0)]) },
  { key: "beam", name: "Lyre beam", moving: true, weightKg: 18, powerW: 350, modes: [M("Standard", "pan + tilt + dim shutter - - - - - - - - - -"), M("Étendu", "pan + tilt + dim + shutter - - - - - - - - - - - - -")], plan: lyre([line(-92, -92, 92, 92), line(-92, 92, 92, -92)]) },
  { key: "spot", name: "Lyre spot / profile", moving: true, weightKg: 24, powerW: 550, modes: [G(M("Standard", "pan + tilt + dim + shutter c m y zoom gobo iris - - - - - - - - - - -")), G(M("Étendu", "pan + tilt + dim + shutter c + m + y + zoom + gobo iris blade1 blade2 blade3 blade4 - - - - - - - - - - -"))], wheel: WHEEL, plan: lyre([circle(0, 0, 60, false)]) },
  { key: "barre", name: "Barre LED 1 m", moving: false, weightKg: 6, powerW: 180, modes: [M("RGB", "r g b"), M("10 pixels", "r g b", 10)], plan: [poly(P(-500, 60, 500, 60, 500, -60, -500, -60)), line(-300, 60, -300, -60), line(-100, 60, -100, -60), line(100, 60, 100, -60), line(300, 60, 300, -60)] },
  { key: "blinder", name: "Blinder 2 lampes", moving: false, weightKg: 5, powerW: 1300, modes: [{ name: "2 canaux", footprint: 2, channels: [{ attr: "dim", offset: 1, cell: 1 }, { attr: "dim", offset: 2, cell: 2 }] }], plan: [poly(P(-230, 110, 230, 110, 230, -110, -230, -110)), circle(-110, 0, 80, false), circle(110, 0, 80, false)] },
  { key: "poursuite", name: "Poursuite 1200", moving: false, weightKg: 40, powerW: 1500, modes: [{ name: "Manuelle", footprint: 0, channels: [] }], plan: [poly(P(-150, 450, 150, 450, 110, -450, -110, -450)), line(-125, -200, 125, -200)] },
  // Vidéo et son. Rapports de projection, flux, ouvertures et poids indicatifs.
  ...[[7, 12, 300], [10, 18, 450], [12, 22, 550], [20, 45, 1200], [30, 75, 2200]].map(([k, kg, w]): SymbolDef => ({ key: `vp${k}`, name: `Vidéoprojecteur ${k} 000 lm`, moving: false, weightKg: kg, powerW: w * 2, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "video", throwRatio: 1.5, lumens: k * 1000, size: { w: 500 + k * 8, d: 550 + k * 8, h: 200 + k * 4 }, plan: [poly(P(-250, 300, 250, 300, 250, -260, -250, -260)), poly(P(-80, -260, 80, -260, 80, -340, -80, -340)), line(-250, 200, 250, 200)] })),
  { key: "la8", name: "Enceinte line array 8\"", moving: false, weightKg: 32, powerW: 600, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "sound", coverageDeg: 100, size: { w: 580, d: 400, h: 250 }, plan: [poly(P(-290, 200, 290, 200, 220, -200, -220, -200)), line(-220, -200, 220, -200), line(0, 200, 0, -200)] },
  { key: "pt12", name: "Enceinte point source 12\"", moving: false, weightKg: 22, powerW: 500, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "sound", coverageDeg: 80, size: { w: 380, d: 360, h: 600 }, plan: [poly(P(-190, 180, 190, 180, 150, -180, -150, -180)), circle(0, -20, 90, false)] },
  { key: "sub18", name: "Sub 18\"", moving: false, weightKg: 45, powerW: 1200, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "sound", coverageDeg: 360, size: { w: 600, d: 700, h: 500 }, plan: [poly(P(-300, 350, 300, 350, 300, -350, -300, -350)), circle(0, 0, 210, false)] },
  { key: "wedge", name: "Retour de scène", moving: false, weightKg: 18, powerW: 400, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "sound", coverageDeg: 60, size: { w: 550, d: 450, h: 350 }, plan: [poly(P(-275, 225, 275, 225, 200, -225, -200, -225)), line(-240, 0, 240, 0)] },
];

// Registre : bibliothèque de départ + fiches importées (du projet ouvert et de la bibliothèque personnelle).
const registry = new Map<string, SymbolDef>(LIBRARY.map((s) => [s.key, s]));
let version = 0;
const subs = new Set<() => void>();
export const libraryVersion = () => version;
export const subscribeLibrary = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export function registerSymbols(list: SymbolDef[]) { let ch = false; for (const s of list) if (s && s.key && !LIBRARY.some((b) => b.key === s.key)) { registry.set(s.key, s); ch = true; } if (ch) { version++; subs.forEach((f) => f()); } }
export function unregisterSymbol(key: string) { if (!LIBRARY.some((b) => b.key === key) && registry.delete(key)) { version++; subs.forEach((f) => f()); } }
export const allSymbols = (): SymbolDef[] => [...registry.values()];
export const hasSymbol = (key: string) => registry.has(key);

export const symbolOf = (key: string): SymbolDef =>
  registry.get(key) ?? { key, name: key.startsWith("gdtf-") ? "Fiche GDTF manquante" : key, moving: false, weightKg: 0, powerW: 0, modes: [{ name: "—", footprint: 1 }], plan: [circle(0, 0, 150)] };

export const footprintOf = (symbol: string, modeName: string): number => {
  const s = symbolOf(symbol);
  return (s.modes.find((m) => m.name === modeName) ?? s.modes[0]).footprint;
};
export const modeOf = (symbol: string, modeName: string): Mode => { const s = symbolOf(symbol); return s.modes.find((m) => m.name === modeName) ?? s.modes[0]; };
export const domainOf = (s: SymbolDef): "light" | "video" | "sound" => s.domain ?? "light";
