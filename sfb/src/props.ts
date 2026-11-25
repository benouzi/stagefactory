// Catalogue d'éléments de scénographie. Tous les modèles sont dessinés ici même, à partir de formes simples : rien n'est repris d'une bibliothèque,
// ils sont donc libres de tout droit. Chaque modèle tient dans un cube unité (x et z de -0,5 à 0,5, y de 0 à 1 ; la face tournée vers le public est en +z),
// puis il est étiré aux dimensions de l'objet. Une pièce : [forme, x, y, z, largeur, hauteur, profondeur, couleur].
// Formes : b = boîte, c = cylindre debout, h = cylindre couché (axe vers le public), s = boule, k = cône. Couleur « $ » = la couleur choisie pour l'objet.
export type Part = [shape: "b" | "c" | "h" | "s" | "k" | "w", x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, rot?: [number, number, number]];
// « w » = rampe (pleine hauteur au lointain, zéro côté public). rot = rotation de la pièce en degrés autour de x, de la verticale, puis de l'axe public.
export interface PropDef { key: string; label: string; group: string; w: number; d: number; h: number; z?: number; color?: string; round?: boolean; parts: Part[] }
export const PALETTE: Record<string, { c: number; r?: number; m?: number; o?: number; e?: number }> = {
  bois: { c: 0x7a5a3c, r: 0.7 }, sombre: { c: 0x2a2c30, r: 0.7 }, noir: { c: 0x0b0b0d, r: 0.95 }, metal: { c: 0x8a8f98, r: 0.4, m: 0.7 }, blanc: { c: 0xbdbbb4, r: 0.9 }, gris: { c: 0x8c8f93, r: 0.85 },
  rouge: { c: 0x7c1420, r: 0.9 }, vert: { c: 0x2f5a32, r: 0.9 }, verre: { c: 0xa9c4d6, r: 0.1, o: 0.3 }, tulle: { c: 0x9aa0a8, r: 1, o: 0.35 }, laiton: { c: 0xb08d3c, r: 0.35, m: 0.8 }, peau: { c: 0xa7a6a2, r: 0.72 }, lampe: { c: 0xffe2a8, r: 0.6, e: 0.9 },
  chrome: { c: 0xe6e9ee, r: 0.12, m: 1 }, tissu: { c: 0x2e2b28, r: 1 }, laque: { c: 0x060607, r: 0.1, m: 0.05 }, ivoire: { c: 0xe9e4d6, r: 0.35 }, caoutchouc: { c: 0x0a0a0b, r: 0.95 }, membrane: { c: 0xdedacd, r: 0.55 }, chair: { c: 0xc9987a, r: 0.62 }, cheveux: { c: 0x23180f, r: 0.75 }, cheveux2: { c: 0x7a5530, r: 0.7 }, jean: { c: 0x26324b, r: 0.88 },
};
const legs = (x: number, z: number, h: number, t: number, col: string): Part[] => [[-x, z], [x, z], [-x, -z], [x, -z]].map(([a, b]) => ["b", a, h / 2, b, t, h, t, col] as Part);
const steps = (n: number, col: string): Part[] => Array.from({ length: n }, (_, i) => ["b", 0, (i + 1) / (2 * n), 0.5 - (i + 0.5) / n, 1, (i + 1) / n, 1 / n, col] as Part);
const seat = (col: string): Part[] => [["b", 0, 0.22, 0.05, 1, 0.44, 0.9, col], ["b", 0, 0.62, -0.38, 1, 0.76, 0.24, col], ["b", -0.43, 0.5, 0.05, 0.14, 0.24, 0.9, col], ["b", 0.43, 0.5, 0.05, 0.14, 0.24, 0.9, col]];
const P = (key: string, label: string, group: string, w: number, d: number, h: number, parts: Part[], x: Partial<PropDef> = {}): PropDef => ({ key, label, group, w, d, h, parts, ...x });

export const PROPS: PropDef[] = [
  // ----- mobilier -----
  P("chaise", "Chaise", "Mobilier", 450, 500, 850, [["b", 0, 0.52, 0.05, 0.95, 0.05, 0.85, "$"], ["b", 0, 0.8, -0.42, 0.95, 0.4, 0.07, "$"], ...legs(0.42, 0.4, 0.5, 0.08, "sombre"), ["b", -0.42, 0.75, -0.42, 0.08, 0.5, 0.07, "sombre"], ["b", 0.42, 0.75, -0.42, 0.08, 0.5, 0.07, "sombre"]], { color: "bois" }),
  P("tabouret", "Tabouret haut", "Mobilier", 380, 380, 750, [["c", 0, 0.97, 0, 1, 0.06, 1, "$"], ...legs(0.36, 0.36, 0.94, 0.08, "metal"), ["c", 0, 0.35, 0, 0.9, 0.03, 0.9, "metal"]], { color: "bois", round: true }),
  P("table", "Table", "Mobilier", 1600, 800, 750, [["b", 0, 0.97, 0, 1, 0.06, 1, "$"], ...legs(0.46, 0.42, 0.94, 0.05, "sombre")], { color: "bois" }),
  P("table-ronde", "Table ronde", "Mobilier", 1000, 1000, 750, [["c", 0, 0.97, 0, 1, 0.06, 1, "$"], ["c", 0, 0.48, 0, 0.1, 0.92, 0.1, "sombre"], ["c", 0, 0.02, 0, 0.6, 0.04, 0.6, "sombre"]], { color: "bois", round: true }),
  P("gueridon", "Guéridon", "Mobilier", 600, 600, 1100, [["c", 0, 0.98, 0, 1, 0.04, 1, "$"], ["c", 0, 0.49, 0, 0.1, 0.94, 0.1, "metal"], ["c", 0, 0.015, 0, 0.7, 0.03, 0.7, "metal"]], { color: "noir", round: true }),
  P("bureau", "Bureau", "Mobilier", 1400, 700, 750, [["b", 0, 0.97, 0, 1, 0.06, 1, "$"], ["b", -0.47, 0.47, 0, 0.04, 0.94, 0.95, "$"], ["b", 0.47, 0.47, 0, 0.04, 0.94, 0.95, "$"], ["b", 0, 0.6, -0.44, 0.9, 0.5, 0.03, "$"]], { color: "bois" }),
  P("banc", "Banc", "Mobilier", 1500, 400, 450, [["b", 0, 0.94, 0, 1, 0.12, 1, "$"], ["b", -0.42, 0.44, 0, 0.05, 0.88, 0.9, "$"], ["b", 0.42, 0.44, 0, 0.05, 0.88, 0.9, "$"]], { color: "bois" }),
  P("fauteuil", "Fauteuil", "Mobilier", 850, 850, 850, seat("$"), { color: "rouge" }),
  P("canape", "Canapé", "Mobilier", 2000, 900, 850, [...seat("$"), ["b", 0, 0.47, 0.08, 0.02, 0.06, 0.8, "sombre"]], { color: "gris" }),
  P("lit", "Lit", "Mobilier", 1600, 2000, 900, [["b", 0, 0.16, 0, 1, 0.32, 1, "$"], ["b", 0, 0.42, 0.02, 0.96, 0.2, 0.94, "blanc"], ["b", 0, 0.5, -0.48, 1, 1, 0.04, "$"], ["b", -0.24, 0.56, -0.36, 0.4, 0.1, 0.16, "blanc"], ["b", 0.24, 0.56, -0.36, 0.4, 0.1, 0.16, "blanc"]], { color: "bois" }),
  P("pupitre", "Pupitre d'orateur", "Mobilier", 600, 500, 1150, [["b", 0, 0.45, -0.05, 0.6, 0.9, 0.5, "$"], ["b", 0, 0.94, 0, 1, 0.06, 1, "$"], ["b", 0, 0.02, 0, 0.9, 0.04, 0.9, "$"]], { color: "sombre" }),
  P("lampadaire", "Lampadaire", "Mobilier", 400, 400, 1700, [["c", 0, 0.01, 0, 0.8, 0.02, 0.8, "laiton"], ["c", 0, 0.42, 0, 0.07, 0.82, 0.07, "laiton"], ["k", 0, 0.91, 0, 1, 0.18, 1, "lampe"]], { round: true }),
  P("portant", "Portant à costumes", "Mobilier", 1500, 500, 1700, [["c", -0.47, 0.5, 0, 0.03, 1, 0.08, "metal"], ["c", 0.47, 0.5, 0, 0.03, 1, 0.08, "metal"], ["b", 0, 0.98, 0, 0.96, 0.02, 0.07, "metal"], ["b", -0.47, 0.01, 0, 0.04, 0.02, 1, "metal"], ["b", 0.47, 0.01, 0, 0.04, 0.02, 1, "metal"], ["b", -0.2, 0.62, 0, 0.3, 0.66, 0.5, "$"], ["b", 0.2, 0.66, 0, 0.3, 0.58, 0.5, "rouge"]], { color: "gris" }),
  // ----- musique -----
  P("batterie", "Batterie", "Musique", 1800, 1500, 1300, [["h", 0, 0.22, 0.2, 0.32, 0.44, 0.3, "$"], ["c", -0.22, 0.47, -0.08, 0.2, 0.1, 0.24, "$"], ["c", 0.3, 0.3, -0.12, 0.24, 0.3, 0.28, "$"], ["c", -0.12, 0.6, 0.16, 0.16, 0.14, 0.2, "$"], ["c", 0.14, 0.6, 0.16, 0.18, 0.15, 0.22, "$"],
    ["c", -0.4, 0.6, -0.02, 0.2, 0.012, 0.24, "laiton"], ["c", -0.4, 0.3, -0.02, 0.015, 0.6, 0.018, "metal"], ["c", -0.33, 0.9, 0.3, 0.26, 0.01, 0.31, "laiton"], ["c", -0.33, 0.45, 0.3, 0.015, 0.9, 0.018, "metal"], ["c", 0.38, 0.84, 0.18, 0.3, 0.01, 0.36, "laiton"], ["c", 0.38, 0.42, 0.18, 0.015, 0.84, 0.018, "metal"],
    ["c", 0, 0.37, -0.4, 0.19, 0.05, 0.23, "noir"], ["c", 0, 0.17, -0.4, 0.03, 0.34, 0.036, "metal"]], { color: "rouge" }),
  P("piano-queue", "Piano à queue", "Musique", 1500, 2200, 1000, [["b", 0, 0.76, -0.06, 1, 0.3, 0.86, "$"], ["b", 0, 0.7, 0.42, 1, 0.18, 0.14, "$"], ["b", 0, 0.76, 0.43, 0.92, 0.02, 0.1, "blanc"], ["c", -0.4, 0.3, 0.3, 0.08, 0.6, 0.055, "$"], ["c", 0.4, 0.3, 0.3, 0.08, 0.6, 0.055, "$"], ["c", 0, 0.3, -0.38, 0.08, 0.6, 0.055, "$"]], { color: "laque" }),
  P("piano-droit", "Piano droit", "Musique", 1500, 600, 1250, [["b", 0, 0.5, -0.15, 1, 1, 0.7, "$"], ["b", 0, 0.56, 0.3, 1, 0.08, 0.4, "$"], ["b", 0, 0.61, 0.33, 0.92, 0.015, 0.28, "blanc"], ["b", -0.47, 0.27, 0.3, 0.05, 0.54, 0.3, "$"], ["b", 0.47, 0.27, 0.3, 0.05, 0.54, 0.3, "$"]], { color: "laque" }),
  P("clavier", "Clavier sur stand", "Musique", 1300, 450, 950, [["b", 0, 0.94, 0, 1, 0.1, 0.9, "sombre"], ["b", 0, 0.995, 0.12, 0.9, 0.012, 0.45, "blanc"], ["b", -0.3, 0.44, 0, 0.03, 0.88, 0.9, "metal"], ["b", 0.3, 0.44, 0, 0.03, 0.88, 0.9, "metal"], ["b", 0, 0.45, 0, 0.6, 0.03, 0.1, "metal"]]),
  P("ampli-guitare", "Ampli guitare", "Musique", 700, 300, 550, [["b", 0, 0.5, 0, 1, 1, 1, "$"], ["b", 0, 0.42, 0.49, 0.9, 0.72, 0.04, "gris"], ["b", 0, 0.9, 0.49, 0.9, 0.1, 0.04, "laiton"]], { color: "noir" }),
  P("ampli-basse", "Ampli basse (tête et baffle)", "Musique", 650, 450, 1300, [["b", 0, 0.39, 0, 1, 0.78, 1, "$"], ["b", 0, 0.39, 0.49, 0.9, 0.7, 0.04, "gris"], ["b", 0, 0.89, 0, 0.92, 0.2, 0.8, "$"], ["b", 0, 0.89, 0.41, 0.84, 0.12, 0.02, "metal"]], { color: "noir" }),
  P("pied-micro", "Pied de micro", "Musique", 500, 500, 1600, [["c", 0, 0.008, 0, 0.6, 0.016, 0.6, "sombre"], ["c", 0, 0.48, 0, 0.05, 0.94, 0.05, "metal"], ["h", 0, 0.965, 0.08, 0.09, 0.028, 0.3, "sombre"]], { round: true }),
  P("pupitre-musique", "Pupitre de musicien", "Musique", 500, 400, 1200, [["c", 0, 0.01, 0, 0.9, 0.02, 0.9, "sombre"], ["c", 0, 0.4, 0, 0.06, 0.78, 0.07, "sombre"], ["b", 0, 0.87, 0, 1, 0.26, 0.06, "sombre"]]),
  P("retour", "Retour de scène", "Musique", 600, 450, 350, [["b", 0, 0.35, -0.1, 1, 0.7, 0.8, "$"], ["b", 0, 0.2, 0.3, 1, 0.4, 0.4, "$"], ["b", 0, 0.75, -0.1, 0.9, 0.5, 0.6, "gris"]], { color: "noir" }),
  P("enceinte-pied", "Enceinte sur pied", "Musique", 450, 450, 2000, [["c", 0, 0.34, 0, 0.09, 0.68, 0.09, "metal"], ["b", 0, 0.02, 0, 0.9, 0.012, 0.08, "metal"], ["b", 0, 0.02, 0, 0.08, 0.012, 0.9, "metal"], ["b", 0, 0.84, 0, 0.8, 0.32, 0.75, "$"], ["b", 0, 0.84, 0.38, 0.7, 0.28, 0.02, "gris"]], { color: "noir" }),
  P("dj", "Table de DJ", "Musique", 2000, 800, 1000, [["b", 0, 0.45, 0, 1, 0.9, 0.9, "$"], ["b", 0, 0.93, 0, 1, 0.06, 1, "sombre"], ["c", -0.3, 0.975, 0, 0.17, 0.03, 0.42, "metal"], ["c", 0.3, 0.975, 0, 0.17, 0.03, 0.42, "metal"], ["b", 0, 0.98, 0, 0.16, 0.04, 0.45, "gris"]], { color: "noir" }),
  // ----- décor -----
  P("chassis", "Châssis (mur de décor)", "Décor", 2000, 100, 3000, [["b", 0, 0.5, 0.2, 1, 1, 0.6, "$"], ["b", -0.47, 0.5, -0.3, 0.04, 1, 0.4, "bois"], ["b", 0.47, 0.5, -0.3, 0.04, 1, 0.4, "bois"], ["b", 0, 0.5, -0.3, 0.9, 0.03, 0.4, "bois"]], { color: "gris" }),
  P("porte", "Porte avec encadrement", "Décor", 1000, 150, 2100, [["b", -0.46, 0.5, 0, 0.08, 1, 1, "blanc"], ["b", 0.46, 0.5, 0, 0.08, 1, 1, "blanc"], ["b", 0, 0.975, 0, 1, 0.05, 1, "blanc"], ["b", 0, 0.475, 0, 0.84, 0.95, 0.3, "$"], ["s", 0.34, 0.48, 0.3, 0.06, 0.03, 0.5, "laiton"]], { color: "bois" }),
  P("fenetre", "Fenêtre dans son mur", "Décor", 1500, 120, 2600, [["b", 0, 0.17, 0, 1, 0.34, 1, "$"], ["b", 0, 0.94, 0, 1, 0.12, 1, "$"], ["b", -0.43, 0.61, 0, 0.14, 0.54, 1, "$"], ["b", 0.43, 0.61, 0, 0.14, 0.54, 1, "$"], ["b", 0, 0.61, 0, 0.72, 0.54, 0.15, "verre"], ["b", 0, 0.61, 0, 0.03, 0.54, 0.3, "blanc"], ["b", 0, 0.61, 0, 0.72, 0.02, 0.3, "blanc"]], { color: "gris" }),
  P("colonne", "Colonne", "Décor", 500, 500, 3500, [["b", 0, 0.02, 0, 1, 0.04, 1, "$"], ["c", 0, 0.5, 0, 0.8, 0.92, 0.8, "$"], ["b", 0, 0.98, 0, 1, 0.04, 1, "$"]], { color: "blanc", round: true }),
  P("escalier", "Escalier (4 marches)", "Décor", 1000, 1200, 800, steps(4, "$"), { color: "sombre" }),
  P("gradin", "Gradin de scène (3 niveaux)", "Décor", 4000, 2400, 900, steps(3, "$"), { color: "sombre" }),
  P("cube", "Cube", "Décor", 500, 500, 500, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "blanc" }),
  P("estrade-ronde", "Estrade ronde", "Décor", 2000, 2000, 300, [["c", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "sombre", round: true }),
  P("portique", "Portique", "Décor", 3000, 300, 3000, [["b", -0.46, 0.46, 0, 0.08, 0.92, 1, "$"], ["b", 0.46, 0.46, 0, 0.08, 0.92, 1, "$"], ["b", 0, 0.96, 0, 1, 0.08, 1, "$"]], { color: "sombre" }),
  P("cadre", "Cadre vide", "Décor", 2000, 100, 2000, [["b", -0.47, 0.5, 0, 0.06, 1, 1, "$"], ["b", 0.47, 0.5, 0, 0.06, 1, 1, "$"], ["b", 0, 0.97, 0, 1, 0.06, 1, "$"], ["b", 0, 0.03, 0, 1, 0.06, 1, "$"]], { color: "laiton" }),
  P("arbre", "Arbre", "Décor", 2200, 2200, 3800, [["c", 0, 0.25, 0, 0.12, 0.5, 0.12, "bois"], ["s", 0, 0.68, 0, 1, 0.62, 1, "$"], ["s", 0.18, 0.5, 0.1, 0.5, 0.3, 0.5, "$"]], { color: "vert", round: true }),
  P("plante", "Plante en pot", "Décor", 500, 500, 1200, [["c", 0, 0.14, 0, 0.6, 0.28, 0.6, "bois"], ["s", 0, 0.64, 0, 1, 0.72, 1, "$"]], { color: "vert", round: true }),
  P("rocher", "Rocher", "Décor", 1500, 1200, 900, [["s", 0, 0.42, 0, 1, 1.1, 1, "$"], ["s", 0.25, 0.25, 0.2, 0.5, 0.5, 0.5, "$"]], { color: "gris", round: true }),
  P("tapis", "Tapis", "Décor", 3000, 2000, 15, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "rouge" }),
  P("tapis-danse", "Tapis de danse", "Décor", 10000, 8000, 6, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "noir" }),
  P("totem", "Totem lumineux", "Décor", 400, 400, 2500, [["b", 0, 0.01, 0, 1, 0.02, 1, "sombre"], ["b", 0, 0.51, 0, 0.6, 0.98, 0.6, "$"]], { color: "lampe" }),
  // ----- tissus -----
  P("fond-noir", "Fond noir", "Tissus", 12000, 100, 7000, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "noir" }),
  P("pendrillon", "Pendrillon", "Tissus", 2000, 100, 7000, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "noir" }),
  P("frise", "Frise", "Tissus", 12000, 100, 1200, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "noir", z: 6000 }),
  P("cyclo", "Cyclorama", "Tissus", 12000, 100, 7000, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "blanc" }),
  P("tulle", "Tulle", "Tissus", 12000, 60, 7000, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "tulle" }),
  P("rideau-avant-scene", "Rideau d'avant-scène (ouvert)", "Tissus", 12000, 300, 7000, [["b", -0.39, 0.5, 0, 0.22, 1, 1, "$"], ["b", 0.39, 0.5, 0, 0.22, 1, 1, "$"], ["b", 0, 0.93, 0.1, 1, 0.14, 1, "$"]], { color: "rouge" }),
  // ----- technique -----
  P("regie", "Régie (table et consoles)", "Technique", 2400, 900, 1050, [["b", 0, 0.69, 0, 1, 0.04, 1, "sombre"], ...legs(0.47, 0.42, 0.67, 0.03, "metal"), ["b", -0.25, 0.76, 0, 0.4, 0.1, 0.7, "noir"], ["b", 0.27, 0.75, 0, 0.36, 0.08, 0.6, "noir"], ["b", -0.25, 0.92, -0.3, 0.22, 0.16, 0.03, "gris"], ["b", 0.27, 0.92, -0.3, 0.22, 0.16, 0.03, "gris"]]),
  P("flight-case", "Flight case", "Technique", 1200, 600, 700, [["b", 0, 0.55, 0, 1, 0.9, 1, "$"], ["b", 0, 0.55, 0, 1.01, 0.04, 1.01, "metal"], ["b", -0.495, 0.55, 0, 0.02, 0.9, 1.01, "metal"], ["b", 0.495, 0.55, 0, 0.02, 0.9, 1.01, "metal"], ["c", -0.4, 0.05, 0.35, 0.07, 0.1, 0.14, "gris"], ["c", 0.4, 0.05, 0.35, 0.07, 0.1, 0.14, "gris"], ["c", -0.4, 0.05, -0.35, 0.07, 0.1, 0.14, "gris"], ["c", 0.4, 0.05, -0.35, 0.07, 0.1, 0.14, "gris"]], { color: "noir" }),
  P("machine-fumee", "Machine à fumée", "Technique", 500, 300, 250, [["b", 0, 0.45, 0, 1, 0.9, 1, "sombre"], ["h", 0.2, 0.5, 0.5, 0.16, 0.3, 0.12, "metal"]]),
  P("ventilateur", "Ventilateur de scène", "Technique", 600, 300, 700, [["b", 0, 0.03, 0, 1, 0.06, 1, "sombre"], ["h", 0, 0.55, 0, 0.95, 0.85, 0.5, "metal"], ["h", 0, 0.55, 0.05, 0.3, 0.26, 0.6, "sombre"]]),
  P("barriere", "Barrière de sécurité", "Technique", 2500, 600, 1100, [["b", 0, 0.98, 0, 1, 0.04, 0.08, "metal"], ["b", 0, 0.12, 0, 1, 0.04, 0.08, "metal"], ...[-0.48, -0.24, 0, 0.24, 0.48].map((x) => ["b", x, 0.55, 0, 0.02, 0.9, 0.08, "metal"] as Part), ["b", -0.48, 0.02, 0, 0.03, 0.04, 1, "metal"], ["b", 0.48, 0.02, 0, 0.03, 0.04, 1, "metal"]]),
  P("paroi", "Mur de salle (une face)", "Décor", 10000, 20, 6000, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "#35383d" }),
  P("plafond", "Plafond (une face)", "Décor", 10000, 10000, 20, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "#1e2024" }),
  P("totem-pont", "Totem de pont", "Technique", 290, 290, 3000, [["b", 0, 0.008, 0, 2, 0.016, 2, "metal"], ...legs(0.42, 0.42, 1, 0.16, "metal"), ...[0.2, 0.4, 0.6, 0.8, 0.99].map((y) => ["b", 0, y, 0, 0.9, 0.012, 0.9, "metal"] as Part)]),
  // ----- personnages (échelle humaine) -----
  // personnages : modèles MakeHuman (CC0), fabriqués hors du logiciel et embarqués (peopleData.ts). Cotes réelles de chaque pose.
  P("chanteur", "Chanteur", "Personnages", 986, 390, 1891, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("chanteuse", "Chanteuse", "Personnages", 1002, 498, 1642, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("guitariste", "Guitariste", "Personnages", 1322, 455, 1735, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("batteur", "Batteur assis", "Personnages", 1130, 701, 1296, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("deejay", "DJ aux platines", "Personnages", 1130, 502, 1729, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("danseuse", "Danseuse", "Personnages", 900, 508, 1581, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("comedien", "Comédien, bras tendu", "Personnages", 1155, 555, 1693, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("comedienne", "Comédienne", "Personnages", 649, 611, 1599, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("comedienne-genou", "Comédienne à genoux", "Personnages", 581, 1096, 1303, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("technicien", "Technicien", "Personnages", 684, 573, 1772, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("personne", "Homme debout", "Personnages", 660, 601, 1735, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("personne-f", "Femme debout", "Personnages", 550, 448, 1616, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("personne-assise", "Homme assis", "Personnages", 1087, 684, 1331, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-1", "Public : homme, bras levés", "Personnages", 735, 489, 1959, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-2", "Public : homme, un bras levé", "Personnages", 911, 507, 2034, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-3", "Public : femme, bras levés", "Personnages", 697, 303, 1833, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-4", "Public : femme debout", "Personnages", 536, 518, 1596, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-5", "Public : homme debout", "Personnages", 644, 541, 1773, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-6", "Public : femme, un bras levé", "Personnages", 792, 388, 1809, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
];
export const PROP_BY_KEY: Record<string, PropDef> = Object.fromEntries(PROPS.map((p) => [p.key, p]));
export const PROP_GROUPS = [...new Set(PROPS.map((p) => p.group))];
/** Couleurs proposées pour teinter un élément (clé de la palette ou code #rrggbb). */
export const TINTS: [string, string][] = [["", "Couleur du modèle"], ["noir", "Noir"], ["sombre", "Anthracite"], ["gris", "Gris"], ["blanc", "Blanc"], ["bois", "Bois"], ["rouge", "Rouge théâtre"], ["vert", "Vert"], ["laiton", "Laiton"], ["#1d3a6e", "Bleu nuit"], ["#c9a227", "Or"], ["#d8c7a6", "Beige"]];
/** Un modèle créé dans l'atelier ou par l'IA, gardé dans le projet. Mêmes pièces que le catalogue. */
export interface CustomProp { id: string; name: string; w: number; d: number; h: number; color?: string; parts: Part[]; cx?: number; cy?: number } // cx, cy : centre de la boîte englobante dans le repère des pièces (mm), pour que les cotes de l'atelier ne bougent pas quand le modèle grandit
export const isCustom = (model?: string) => !!model && model.startsWith("perso:");
/** Le modèle d'un objet : catalogue, ou modèle personnel du projet. */
export function propOf(model: string | undefined, custom?: Record<string, CustomProp>): PropDef | null {
  if (!model) return null; if (PROP_BY_KEY[model]) return PROP_BY_KEY[model];
  if (isCustom(model)) { const c = custom?.[model.slice(6)]; if (c) return { key: model, label: c.name, group: "Mes modèles", w: c.w, d: c.d, h: c.h, color: c.color, parts: c.parts }; }
  return null;
}
export const SHAPES: [Part[0], string][] = [["b", "Boîte"], ["c", "Cylindre debout"], ["h", "Cylindre couché"], ["s", "Boule"], ["k", "Cône"], ["w", "Rampe"]];
export const isGlb = (model?: string) => !!model && model.startsWith("glb:");
