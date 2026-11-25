// Projets d'exemple : trois scénographies montées, chacune dans son lieu, pour juger le rendu 3D et essayer les outils sans rien dessiner.
// Un concert en aréna, une soirée électro dans un hangar, une pièce de théâtre. Tout est posé avec les mêmes commandes que l'utilisateur.
import { newDoc, sampleDoc, type Doc, type Id, type Support, type Vec2 } from "./model";
import * as cmd from "./commands";
import { getState, loadDoc } from "./store";
import { planStructure } from "./structures";
import { visualUrl, type VisualKind } from "./visuals";

/** Réglages que la vue 3D doit prendre à sa prochaine ouverture (ou tout de suite si elle est ouverte). */
export const pending3d: { v: Record<string, unknown> | null; cam: { p: number[]; t: number[] } | null } = { v: null, cam: null };

// ---------- outils de montage ----------
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const doc = (): Doc => getState().doc;
const put = (model: string, x: number, y: number, f: Record<string, unknown> = {}): Id => { const id = cmd.addProp(model, { x, y }); if (Object.keys(f).length) cmd.setObjectFields([id], f as any); return id; };
const box = (x: number, y: number, w: number, d: number, h: number, color: string, f: Record<string, unknown> = {}) => put("cube", x, y, { wMm: w, dMm: d, hMm: h, color, ...f });
const deck = (x: number, y: number, w: number, d: number, h: number) => { const id = cmd.addObject("deck", { x, y }); cmd.setObjectFields([id], { wMm: w, dMm: d, hMm: h }); return id; };
const led = (x: number, y: number, w: number, h: number, z: number, kind: VisualKind, rotDeg = 0, text?: string) => { const id = cmd.addObject("ledwall", { x, y }); cmd.setObjectFields([id], { wMm: w, hMm: h, zMm: z, rotDeg, content: "image", imageUrl: visualUrl(kind, w >= h ? 640 : Math.max(64, Math.round((640 * w) / h)), w >= h ? Math.max(64, Math.round((640 * h) / w)) : 640, text) } as any); return id; };
const truss = (name: string, a: Vec2, b: Vec2, z: number): Support => { const id = cmd.addSupport(a, b, "truss"); cmd.setSupportFields(id, { zMm: z, name }); return doc().supports[id]; };
/** Pan et tilt pour viser un point (mm, hauteur comprise) depuis une position. Tilt 0 = à la verticale vers le bas ; pan 0 = vers la salle. */
const aim = (from: [number, number, number], to: [number, number, number]) => { const dx = to[0] - from[0], dz = -(to[1] - from[1]), dy = to[2] - from[2], L = Math.hypot(dx, dy, dz) || 1; return { tiltDeg: Math.round((Math.acos(Math.max(-1, Math.min(1, -dy / L))) * 180) / Math.PI), panDeg: Math.round((Math.atan2(dx, dz) * 180) / Math.PI) }; };
/** Une série d'appareils répartis sur un pont. `to(i, n, x, y)` donne le point visé par chacun. */
function row(sym: string, s: Support, n: number, color: string | ((i: number) => string), to: (i: number, n: number, x: number, y: number) => [number, number, number], extra: Record<string, unknown> = {}, from = 0.06, until = 0.94) {
  const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
  for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : from + ((until - from) * i) / (n - 1), x = s.a.x + (s.b.x - s.a.x) * t, y = s.a.y + (s.b.y - s.a.y) * t, id = cmd.insertFixture(sym, { supportId: s.id, alongMm: Math.round(L * t) }, { x, y }, true, true);
    if (!id) continue; const A = aim([x, y, s.zMm - 400], to(i, n, x, y)), moving = MOVING.has(sym);
    // une lyre s'oriente par son pan ; un appareil fixe se tourne tout entier, puis s'incline
    cmd.setFixtureFields([id], { ...(moving ? A : { tiltDeg: A.tiltDeg, rotDeg: A.panDeg }), color: typeof color === "string" ? color : color(i), ...extra } as any); }
}
/** Une lyre posée au sol : tilt 0 = à la verticale vers le haut, et son pan est retourné par rapport à une lyre suspendue. */
const floorFx = (sym: string, x: number, y: number, z: number, color: string, to: [number, number, number], extra: Record<string, unknown> = {}) => { const id = cmd.insertFixture(sym, null, { x, y }, true, true); if (!id) return id;
  const dx = to[0] - x, dz = -(to[1] - y), dy = to[2] - (z + 400), L = Math.hypot(dx, dy, dz) || 1;
  cmd.setFixtureFields([id], { zMm: z, color, tiltDeg: Math.round((Math.acos(Math.max(-1, Math.min(1, dy / L))) * 180) / Math.PI), panDeg: Math.round((Math.atan2(-dx, -dz) * 180) / Math.PI), ...extra } as any); return id; };
/** Un vidéoprojecteur accroché, qui projette un visuel sur un objet du décor (mapping). */
const mapping = (s: Support, t: number, target: Id, kind: VisualKind, text?: string, throwRatio = 1.2, lumens = 12000) => { const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), x = s.a.x + (s.b.x - s.a.x) * t, y = s.a.y + (s.b.y - s.a.y) * t, id = cmd.insertFixture("vp20", { supportId: s.id, alongMm: Math.round(L * t) }, { x, y }, true, false);
  if (id) cmd.setFixtureFields([id], { targetId: target, vpContent: "image", vpImage: visualUrl(kind, 640, 360, text), throwRatio, lumens } as any); };
const MOVING = new Set(["spot", "beam", "wash"]);
const PUBLIC = ["public-1", "public-2", "public-3", "public-4", "public-5", "public-6"];
/** Une foule tournée vers la scène : positions tirées au sort (toujours les mêmes), jamais deux personnes au même endroit. */
function crowd(n: number, x0: number, x1: number, y0: number, y1: number, z = 0) {
  const taken: Vec2[] = []; let tries = 0;
  while (taken.length < n && tries++ < n * 30) { const x = x0 + rnd() * (x1 - x0), y = y0 + Math.pow(rnd(), 1.5) * (y1 - y0); if (taken.some((q) => Math.hypot(q.x - x, q.y - y) < 780)) continue; taken.push({ x, y });
    put(PUBLIC[Math.floor(rnd() * PUBLIC.length)], Math.round(x), Math.round(y), { rotDeg: 180 + Math.round((rnd() - 0.5) * 30) + Math.round((Math.atan2(-x, 8000 - y) * 180) / Math.PI * 0.5), ...(z ? { zMm: z } : {}) }); }
}
const finish = (title: string, venue: string, view: Record<string, unknown>, cam: { p: number[]; t: number[] }) => {
  cmd.setInfo({ title, venue }); loadDoc(doc()); // l'exemple arrive comme un projet ouvert : rien à annuler
  pending3d.v = { beams: "on", amb: "noir", ...view }; pending3d.cam = cam;
  window.dispatchEvent(new CustomEvent("sf:fit")); window.dispatchEvent(new CustomEvent("sf:3d-settings"));
};

// ---------- 1. Concert en aréna ----------
function arena() {
  seed = 4711; loadDoc(newDoc()); const H = 1800; // hauteur de la scène
  deck(0, 7000, 24000, 14000, H); box(0, 60, 24000, 80, H - 40, "noir"); for (const sx of [-1, 1]) box(sx * 11960, 7000, 80, 14000, H - 40, "noir"); // jupe de scène deck(0, 10000, 5000, 3000, H + 500); // scène et praticable batterie
  for (const sx of [-1, 1]) { deck(sx * 9000, 6500, 3000, 2000, H + 300); } // ailes surélevées
  const roof = cmd.addStructure(planStructure({ type: "gril", name: "Toit", x: 0, y: 7000, rotDeg: 0, lengthMm: 26000, depthMm: 14000, heightMm: 12500, sectionMm: 520, kgPerM: 14, count: 4 }));
  void roof; const T = [truss("Pont de face", { x: -12000, y: 1500 }, { x: 12000, y: 1500 }, 11800), truss("Pont milieu", { x: -12000, y: 6500 }, { x: 12000, y: 6500 }, 11400), truss("Pont de contre", { x: -12000, y: 12000 }, { x: 12000, y: 12000 }, 11000), truss("Pont du fond", { x: -9000, y: 13200 }, { x: 9000, y: 13200 }, 8200)];
  // écrans : mur central, deux écrans de retransmission en portrait, bandeau haut
  led(0, 13600, 13000, 6000, H + 900, "rayons"); led(-17500, 3000, 6000, 9000, 2500, "braise", 12); led(17500, 3000, 6000, 9000, 2500, "aurore", -12); led(0, 13650, 13000, 1000, H + 7100, "titre", 0, "SCENOFACTORY LIVE");
  // mapping : deux grands châssis blancs de part et d'autre du mur, habillés par deux vidéoprojecteurs
  const cL = put("chassis", -9800, 13000, { wMm: 5000, hMm: 7000, zMm: H, rotDeg: 14, color: "blanc" }), cR = put("chassis", 9800, 13000, { wMm: 5000, hMm: 7000, zMm: H, rotDeg: -14, color: "blanc" });
  mapping(T[1], 0.2, cL, "tunnel"); mapping(T[1], 0.8, cR, "tunnel");
  // le groupe
  put("batterie", 0, 10300, { zMm: H + 500 }); put("batteur", 0, 10900, { zMm: H + 950 }); put("tabouret", 0, 10900, { zMm: H + 500, hMm: 450 });
  put("chanteur", 0, 2600, { zMm: H }); put("pied-micro", 0, 2150, { zMm: H }); put("guitariste", -4200, 3600, { zMm: H, rotDeg: 15 }); put("chanteuse", 4300, 3800, { zMm: H, rotDeg: -15 }); put("pied-micro", 4300, 3350, { zMm: H });
  put("deejay", 6800, 8200, { zMm: H, rotDeg: -25 }); put("clavier", 6600, 7700, { zMm: H, rotDeg: -25 }); put("ampli-guitare", -5200, 8200, { zMm: H, rotDeg: -10 }); put("ampli-basse", -3600, 8600, { zMm: H }); put("ampli-basse", 3600, 8600, { zMm: H });
  for (const x of [-3000, -1000, 1000, 3000]) put("retour", x, 1100, { zMm: H, rotDeg: 180 });
  // lumière : contre blanc en éventail, latéraux bleus, face ambre, blinders, faisceaux au sol
  row("beam", T[2], 8, "blanc froid", (i, n, x) => [x * 2.4, -9000 - Math.abs(i - (n - 1) / 2) * 900, 2500]);
  row("spot", T[1], 10, (i) => (i % 2 ? "cyan" : "bleu"), (i, n, x) => [-x * 0.8, 3500, H]);
  row("wash", T[0], 10, "ambre", (i, n, x) => [x * 0.75, 4500, H + 800]);
  row("blinder", T[3], 6, "ambre", (i, n, x) => [x * 1.2, -12000, 1500]);
  row("wash", T[3], 6, "bleu", (i, n, x) => [x * 0.5, 7000, H], {}, 0.12, 0.88);
  for (let i = 0; i < 8; i++) { const x = -10500 + i * 3000; floorFx("beam", x, 12600, H, i % 2 ? "blanc froid" : "ambre", [x * 1.9, -4000, 16000]); }
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) floorFx("spot", sx * (9000 + i * 600), 6200 + i * 500, H + 300, "bleu", [sx * -3000 * (i - 1), -16000, 9000]);
  // sonorisation, barrières, régie, public
  for (const sx of [-1, 1]) { box(sx * 13800, 600, 1200, 900, 5200, "sombre", { zMm: 5600, rotDeg: sx * -8 }); for (let i = 0; i < 3; i++) box(sx * (4000 + i * 2600), -700, 1200, 800, 600, "sombre"); }
  for (let x = -12500; x <= 12500; x += 2500) put("barriere", x, -2200);
  deck(0, -27000, 6000, 4000, 600); put("regie", 0, -27000, { zMm: 600, rotDeg: 180 }); put("technicien", 900, -27900, { zMm: 600, rotDeg: 180 });
  crowd(150, -13500, 13500, -3200, -24000);
  finish("Concert en aréna", "Aréna (exemple)", { sol: "noir", haze: 0.36, expo: 0.85 }, { p: [-4.5, 3.2, 21], t: [0, 6.4, -8] });
}

// ---------- 2. Soirée électro dans un hangar ----------
function hangar() {
  seed = 2026; loadDoc(newDoc()); const W = 30000, Y0 = -34000, Y1 = 14000, Hh = 10500, mid = (Y0 + Y1) / 2, len = Y1 - Y0;
  // la coque : mur du fond, deux murs latéraux, toiture et ses fermes d'acier
  put("paroi", 0, Y1, { wMm: W, hMm: Hh, color: "#3a3d42" }); put("paroi", W / 2, mid, { wMm: len, hMm: Hh, rotDeg: -90, color: "#33363b" }); put("paroi", -W / 2, mid, { wMm: len, hMm: Hh, rotDeg: 90, color: "#33363b" }); put("paroi", 0, Y0, { wMm: W, hMm: Hh, rotDeg: 180, color: "#33363b" });
  put("plafond", 0, mid, { wMm: W, dMm: len, zMm: Hh, color: "#1e2024" }); // murs et plafond à une seule face : de dehors, on voit dedans
  for (let y = Y0 + 4000; y < Y1; y += 8000) { box(0, y, W, 300, 700, "#15171a", { zMm: Hh - 700 }); for (const sx of [-1, 1]) box(sx * (W / 2 - 350), y, 350, 350, Hh, "#15171a"); }
  // la cabine du DJ, son mur LED, et des colonnes de lumière sur les murs
  deck(0, 9500, 8000, 3500, 1300); put("dj", 0, 9000, { zMm: 1300, wMm: 3200 }); put("deejay", 0, 9900, { zMm: 1300 }); for (const sx of [-1, 1]) put("retour", sx * 2600, 9800, { zMm: 1300, rotDeg: sx * 35 });
  led(0, 13500, 12000, 5000, 2600, "tunnel"); led(-8200, 13300, 3000, 6500, 1200, "barres", 20); led(8200, 13300, 3000, 6500, 1200, "barres", -20); led(0, 8000, 8000, 1100, 150, "titre", 0, "WAREHOUSE");
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) led(sx * (W / 2 - 320), 10000 - i * 6000, 600, 7000, 1500, "tunnel", sx * 90);
  // mapping sur deux grands châssis en biais, de chaque côté de la piste
  const T = [0, 1, 2, 3, 4].map((i) => truss(`Pont ${i + 1}`, { x: -12500, y: 6500 - i * 6500 }, { x: 12500, y: 6500 - i * 6500 }, 8600));
  const cL = put("chassis", -12800, 2500, { wMm: 7000, hMm: 5000, zMm: 2500, rotDeg: 70, color: "blanc" }), cR = put("chassis", 12800, 2500, { wMm: 7000, hMm: 5000, zMm: 2500, rotDeg: -70, color: "blanc" });
  mapping(T[1], 0.62, cL, "aurore"); mapping(T[1], 0.38, cR, "aurore");
  // lumière : faisceaux croisés cyan et bleu, wash magenta sur la piste, stroboscopes
  row("beam", T[0], 8, (i) => (i % 2 ? "cyan" : "bleu"), (i, n, x) => [-x * 1.3, -6000 - (i % 3) * 5000, 1200]);
  row("beam", T[1], 6, "cyan", (i, n, x) => [x * 0.2 + (i % 2 ? 9000 : -9000), -14000, 3000]);
  row("spot", T[2], 8, (i) => (i % 2 ? "bleu" : "violet"), (i, n, x) => [-x * 0.9, -4000 + (i % 4) * 3000, 0]);
  row("wash", T[3], 8, "magenta", (i, n, x) => [x * 0.8, -14000, 0]);
  row("beam", T[4], 8, "bleu", (i, n, x) => [x * 1.4, 4000, 2000 + (i % 2) * 3000]);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) floorFx("beam", sx * (4600 + i * 700), 10800, 1300, "cyan", [sx * (2000 + i * 5000), -8000, 12000]);
  // sonorisation, bar, public
  for (const sx of [-1, 1]) { for (let i = 0; i < 2; i++) box(sx * (5600 + i * 1300), 7200, 1200, 900, 1500, "sombre"); put("enceinte-pied", sx * 6200, 7200, { zMm: 1500, hMm: 2600, wMm: 900, dMm: 700 }); }
  for (let i = 0; i < 4; i++) { put("table", 11500, -20000 - i * 2400, { rotDeg: 90, hMm: 1100, color: "sombre" }); put("personne", 12800, -20000 - i * 2400, { rotDeg: 90 }); }
  put("regie", 0, -24000, { rotDeg: 180 }); put("technicien", 0, -25000, { rotDeg: 180 });
  for (let x = -7500; x <= 7500; x += 2500) put("barriere", x, 6300);
  crowd(130, -11500, 11500, 5200, -19000);
  finish("Soirée électro au hangar", "Hangar (exemple)", { sol: "noir", haze: 0.24, expo: 0.8 }, { p: [-3.5, 2.3, 17], t: [0.5, 4.2, -9] });
}

// ---------- 3. Pièce de théâtre ----------
function theatre() {
  seed = 1789; loadDoc(sampleDoc()); cmd.setInfo({ venue: "Théâtre (exemple)" });
  const P = Object.values(doc().supports).sort((a, b) => a.a.y - b.a.y); // de la face (P[0]) au lointain (P[13])
  // le ciel au lointain sur mur LED, deux châssis peints en lumière (mapping), draperies
  led(0, 10300, 13000, 6500, 300, "nuit");
  const cL = put("chassis", -4300, 8600, { wMm: 5200, hMm: 6000, rotDeg: 8, color: "blanc" }), cR = put("chassis", 4300, 8600, { wMm: 5200, hMm: 6000, rotDeg: -8, color: "blanc" });
  mapping(P[7], 0.19, cL, "palais", undefined, 0.68, 5000); mapping(P[7], 0.81, cR, "palais", undefined, 0.68, 5000); // rien n'est accroché entre ces projecteurs et le décor : pas d'ombre portée sur l'image
  put("colonne", -1650, 8500, { hMm: 6000, color: "ivoire" }); put("colonne", 1650, 8500, { hMm: 6000, color: "ivoire" }); box(0, 8500, 3800, 500, 500, "ivoire", { zMm: 5500 });
  for (const sx of [-1, 1]) { put("pendrillon", sx * 7600, 2500, { rotDeg: 90 }); put("pendrillon", sx * 7600, 5500, { rotDeg: 90 }); put("pendrillon", sx * 7600, 8500, { rotDeg: 90 }); }
  put("frise", 0, 1200, { wMm: 14000, zMm: 6200 }); put("frise", 0, 5200, { wMm: 14000, zMm: 6300 });
  // mobilier et comédiens
  put("bureau", 2600, 4300, { wMm: 3200, dMm: 1100, color: "rouge" }); put("estrade-ronde", -3000, 5600, { wMm: 3000, dMm: 3000, hMm: 250 });
  put("fauteuil", 4700, 5200, { rotDeg: -30, color: "rouge" }); put("personne-assise", 4700, 5150, { rotDeg: -30 }); put("chaise", 6000, 4300, { rotDeg: -50 }); put("comedienne", 5600, 3300, { rotDeg: -40 });
  put("comedien", -600, 4200, { rotDeg: 25 }); put("comedienne-genou", -3600, 3600, { rotDeg: 65 }); put("personne", 1500, 5600, { rotDeg: -10 }); put("gueridon", -5600, 6400); put("lampadaire", -6200, 7300); put("portant", 6400, 7600, { rotDeg: -70 });
  // lumière : face chaude sur les comédiens, latéraux, contre bleu nuit, découpes sur le décor
  // les 28 premiers appareils posés éclairent vraiment le décor : la face et les ponctuels d'abord
  row("decoupe", P[3], 4, "blanc chaud", (i) => [[-3600, 3600, 900], [-600, 4200, 1500], [2600, 4300, 1500], [5200, 4200, 1300]][i] as [number, number, number], { zoomDeg: 18 }, 0.2, 0.8);
  row("decoupe", P[0], 6, "blanc chaud", (i, n, x) => [x * 0.8, 4200, 1400], { zoomDeg: 28 });
  row("par-led", P[6], 6, "bleu nuit", (i, n, x) => [x * 0.9, 5000, 0]);
  row("fresnel", P[1], 4, "ambre", (i, n, x) => [x * 0.9, 5200, 1200], {}, 0.15, 0.85);
  row("wash", P[5], 4, "congo", (i, n, x) => [x * 0.7, 3500, 0], {}, 0.15, 0.85);
  row("spot", P[4], 4, "lavande", (i, n, x) => [x * 1.2, 6500 + (i % 2) * 1500, 0], {}, 0.2, 0.8);
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) floorFx("wash", sx * 6800, 2800 + i * 3200, 0, "ambre", [0, 4500, 1300]);
  finish("Pièce de théâtre", "Théâtre (exemple)", { sol: "parquet", haze: 0.14, expo: 1.1 }, { p: [-1.5, 2.4, 10.5], t: [0.2, 2.7, -6] });
}

export const DEMOS: { key: string; label: string; note: string; build(): void }[] = [
  { key: "arena", label: "Exemple : concert en aréna", note: "Grande scène, toit de ponts, murs LED, mapping, 150 spectateurs", build: arena },
  { key: "hangar", label: "Exemple : soirée électro au hangar", note: "Cabine DJ, colonnes LED, faisceaux croisés, piste pleine", build: hangar },
  { key: "theatre", label: "Exemple : pièce de théâtre", note: "Décor projeté, ciel sur mur LED, face chaude et contre bleu", build: theatre },
];
export const loadDemo = (key: string) => DEMOS.find((d) => d.key === key)?.build();
/** Ancien nom, gardé pour les essais : le concert. */
export const loadShowDemo = () => arena();
