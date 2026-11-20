// ../src/sceno/ScenoFactory-0.45.0-sources/app/src/props.ts
var legs = (x, z, h, t, col) => [[-x, z], [x, z], [-x, -z], [x, -z]].map(([a, b]) => ["b", a, h / 2, b, t, h, t, col]);
var steps = (n, col) => Array.from({ length: n }, (_, i) => ["b", 0, (i + 1) / (2 * n), 0.5 - (i + 0.5) / n, 1, (i + 1) / n, 1 / n, col]);
var seat = (col) => [["b", 0, 0.22, 0.05, 1, 0.44, 0.9, col], ["b", 0, 0.62, -0.38, 1, 0.76, 0.24, col], ["b", -0.43, 0.5, 0.05, 0.14, 0.24, 0.9, col], ["b", 0.43, 0.5, 0.05, 0.14, 0.24, 0.9, col]];
var P = (key, label, group, w, d, h, parts, x = {}) => ({ key, label, group, w, d, h, parts, ...x });
var PROPS = [
  // ----- mobilier -----
  P("chaise", "Chaise", "Mobilier", 450, 500, 850, [["b", 0, 0.52, 0.05, 0.95, 0.05, 0.85, "$"], ["b", 0, 0.8, -0.42, 0.95, 0.4, 0.07, "$"], ...legs(0.42, 0.4, 0.5, 0.08, "sombre"), ["b", -0.42, 0.75, -0.42, 0.08, 0.5, 0.07, "sombre"], ["b", 0.42, 0.75, -0.42, 0.08, 0.5, 0.07, "sombre"]], { color: "bois" }),
  P("tabouret", "Tabouret haut", "Mobilier", 380, 380, 750, [["c", 0, 0.97, 0, 1, 0.06, 1, "$"], ...legs(0.36, 0.36, 0.94, 0.08, "metal"), ["c", 0, 0.35, 0, 0.9, 0.03, 0.9, "metal"]], { color: "bois", round: true }),
  P("table", "Table", "Mobilier", 1600, 800, 750, [["b", 0, 0.97, 0, 1, 0.06, 1, "$"], ...legs(0.46, 0.42, 0.94, 0.05, "sombre")], { color: "bois" }),
  P("table-ronde", "Table ronde", "Mobilier", 1e3, 1e3, 750, [["c", 0, 0.97, 0, 1, 0.06, 1, "$"], ["c", 0, 0.48, 0, 0.1, 0.92, 0.1, "sombre"], ["c", 0, 0.02, 0, 0.6, 0.04, 0.6, "sombre"]], { color: "bois", round: true }),
  P("gueridon", "Gu\xE9ridon", "Mobilier", 600, 600, 1100, [["c", 0, 0.98, 0, 1, 0.04, 1, "$"], ["c", 0, 0.49, 0, 0.1, 0.94, 0.1, "metal"], ["c", 0, 0.015, 0, 0.7, 0.03, 0.7, "metal"]], { color: "noir", round: true }),
  P("bureau", "Bureau", "Mobilier", 1400, 700, 750, [["b", 0, 0.97, 0, 1, 0.06, 1, "$"], ["b", -0.47, 0.47, 0, 0.04, 0.94, 0.95, "$"], ["b", 0.47, 0.47, 0, 0.04, 0.94, 0.95, "$"], ["b", 0, 0.6, -0.44, 0.9, 0.5, 0.03, "$"]], { color: "bois" }),
  P("banc", "Banc", "Mobilier", 1500, 400, 450, [["b", 0, 0.94, 0, 1, 0.12, 1, "$"], ["b", -0.42, 0.44, 0, 0.05, 0.88, 0.9, "$"], ["b", 0.42, 0.44, 0, 0.05, 0.88, 0.9, "$"]], { color: "bois" }),
  P("fauteuil", "Fauteuil", "Mobilier", 850, 850, 850, seat("$"), { color: "rouge" }),
  P("canape", "Canap\xE9", "Mobilier", 2e3, 900, 850, [...seat("$"), ["b", 0, 0.47, 0.08, 0.02, 0.06, 0.8, "sombre"]], { color: "gris" }),
  P("lit", "Lit", "Mobilier", 1600, 2e3, 900, [["b", 0, 0.16, 0, 1, 0.32, 1, "$"], ["b", 0, 0.42, 0.02, 0.96, 0.2, 0.94, "blanc"], ["b", 0, 0.5, -0.48, 1, 1, 0.04, "$"], ["b", -0.24, 0.56, -0.36, 0.4, 0.1, 0.16, "blanc"], ["b", 0.24, 0.56, -0.36, 0.4, 0.1, 0.16, "blanc"]], { color: "bois" }),
  P("pupitre", "Pupitre d'orateur", "Mobilier", 600, 500, 1150, [["b", 0, 0.45, -0.05, 0.6, 0.9, 0.5, "$"], ["b", 0, 0.94, 0, 1, 0.06, 1, "$"], ["b", 0, 0.02, 0, 0.9, 0.04, 0.9, "$"]], { color: "sombre" }),
  P("lampadaire", "Lampadaire", "Mobilier", 400, 400, 1700, [["c", 0, 0.01, 0, 0.8, 0.02, 0.8, "laiton"], ["c", 0, 0.42, 0, 0.07, 0.82, 0.07, "laiton"], ["k", 0, 0.91, 0, 1, 0.18, 1, "lampe"]], { round: true }),
  P("portant", "Portant \xE0 costumes", "Mobilier", 1500, 500, 1700, [["c", -0.47, 0.5, 0, 0.03, 1, 0.08, "metal"], ["c", 0.47, 0.5, 0, 0.03, 1, 0.08, "metal"], ["b", 0, 0.98, 0, 0.96, 0.02, 0.07, "metal"], ["b", -0.47, 0.01, 0, 0.04, 0.02, 1, "metal"], ["b", 0.47, 0.01, 0, 0.04, 0.02, 1, "metal"], ["b", -0.2, 0.62, 0, 0.3, 0.66, 0.5, "$"], ["b", 0.2, 0.66, 0, 0.3, 0.58, 0.5, "rouge"]], { color: "gris" }),
  // ----- musique -----
  P("batterie", "Batterie", "Musique", 1800, 1500, 1300, [
    ["h", 0, 0.22, 0.2, 0.32, 0.44, 0.3, "$"],
    ["c", -0.22, 0.47, -0.08, 0.2, 0.1, 0.24, "$"],
    ["c", 0.3, 0.3, -0.12, 0.24, 0.3, 0.28, "$"],
    ["c", -0.12, 0.6, 0.16, 0.16, 0.14, 0.2, "$"],
    ["c", 0.14, 0.6, 0.16, 0.18, 0.15, 0.22, "$"],
    ["c", -0.4, 0.6, -0.02, 0.2, 0.012, 0.24, "laiton"],
    ["c", -0.4, 0.3, -0.02, 0.015, 0.6, 0.018, "metal"],
    ["c", -0.33, 0.9, 0.3, 0.26, 0.01, 0.31, "laiton"],
    ["c", -0.33, 0.45, 0.3, 0.015, 0.9, 0.018, "metal"],
    ["c", 0.38, 0.84, 0.18, 0.3, 0.01, 0.36, "laiton"],
    ["c", 0.38, 0.42, 0.18, 0.015, 0.84, 0.018, "metal"],
    ["c", 0, 0.37, -0.4, 0.19, 0.05, 0.23, "noir"],
    ["c", 0, 0.17, -0.4, 0.03, 0.34, 0.036, "metal"]
  ], { color: "rouge" }),
  P("piano-queue", "Piano \xE0 queue", "Musique", 1500, 2200, 1e3, [["b", 0, 0.76, -0.06, 1, 0.3, 0.86, "$"], ["b", 0, 0.7, 0.42, 1, 0.18, 0.14, "$"], ["b", 0, 0.76, 0.43, 0.92, 0.02, 0.1, "blanc"], ["c", -0.4, 0.3, 0.3, 0.08, 0.6, 0.055, "$"], ["c", 0.4, 0.3, 0.3, 0.08, 0.6, 0.055, "$"], ["c", 0, 0.3, -0.38, 0.08, 0.6, 0.055, "$"]], { color: "laque" }),
  P("piano-droit", "Piano droit", "Musique", 1500, 600, 1250, [["b", 0, 0.5, -0.15, 1, 1, 0.7, "$"], ["b", 0, 0.56, 0.3, 1, 0.08, 0.4, "$"], ["b", 0, 0.61, 0.33, 0.92, 0.015, 0.28, "blanc"], ["b", -0.47, 0.27, 0.3, 0.05, 0.54, 0.3, "$"], ["b", 0.47, 0.27, 0.3, 0.05, 0.54, 0.3, "$"]], { color: "laque" }),
  P("clavier", "Clavier sur stand", "Musique", 1300, 450, 950, [["b", 0, 0.94, 0, 1, 0.1, 0.9, "sombre"], ["b", 0, 0.995, 0.12, 0.9, 0.012, 0.45, "blanc"], ["b", -0.3, 0.44, 0, 0.03, 0.88, 0.9, "metal"], ["b", 0.3, 0.44, 0, 0.03, 0.88, 0.9, "metal"], ["b", 0, 0.45, 0, 0.6, 0.03, 0.1, "metal"]]),
  P("ampli-guitare", "Ampli guitare", "Musique", 700, 300, 550, [["b", 0, 0.5, 0, 1, 1, 1, "$"], ["b", 0, 0.42, 0.49, 0.9, 0.72, 0.04, "gris"], ["b", 0, 0.9, 0.49, 0.9, 0.1, 0.04, "laiton"]], { color: "noir" }),
  P("ampli-basse", "Ampli basse (t\xEAte et baffle)", "Musique", 650, 450, 1300, [["b", 0, 0.39, 0, 1, 0.78, 1, "$"], ["b", 0, 0.39, 0.49, 0.9, 0.7, 0.04, "gris"], ["b", 0, 0.89, 0, 0.92, 0.2, 0.8, "$"], ["b", 0, 0.89, 0.41, 0.84, 0.12, 0.02, "metal"]], { color: "noir" }),
  P("pied-micro", "Pied de micro", "Musique", 500, 500, 1600, [["c", 0, 8e-3, 0, 0.6, 0.016, 0.6, "sombre"], ["c", 0, 0.48, 0, 0.05, 0.94, 0.05, "metal"], ["h", 0, 0.965, 0.08, 0.09, 0.028, 0.3, "sombre"]], { round: true }),
  P("pupitre-musique", "Pupitre de musicien", "Musique", 500, 400, 1200, [["c", 0, 0.01, 0, 0.9, 0.02, 0.9, "sombre"], ["c", 0, 0.4, 0, 0.06, 0.78, 0.07, "sombre"], ["b", 0, 0.87, 0, 1, 0.26, 0.06, "sombre"]]),
  P("retour", "Retour de sc\xE8ne", "Musique", 600, 450, 350, [["b", 0, 0.35, -0.1, 1, 0.7, 0.8, "$"], ["b", 0, 0.2, 0.3, 1, 0.4, 0.4, "$"], ["b", 0, 0.75, -0.1, 0.9, 0.5, 0.6, "gris"]], { color: "noir" }),
  P("enceinte-pied", "Enceinte sur pied", "Musique", 450, 450, 2e3, [["c", 0, 0.34, 0, 0.09, 0.68, 0.09, "metal"], ["b", 0, 0.02, 0, 0.9, 0.012, 0.08, "metal"], ["b", 0, 0.02, 0, 0.08, 0.012, 0.9, "metal"], ["b", 0, 0.84, 0, 0.8, 0.32, 0.75, "$"], ["b", 0, 0.84, 0.38, 0.7, 0.28, 0.02, "gris"]], { color: "noir" }),
  P("dj", "Table de DJ", "Musique", 2e3, 800, 1e3, [["b", 0, 0.45, 0, 1, 0.9, 0.9, "$"], ["b", 0, 0.93, 0, 1, 0.06, 1, "sombre"], ["c", -0.3, 0.975, 0, 0.17, 0.03, 0.42, "metal"], ["c", 0.3, 0.975, 0, 0.17, 0.03, 0.42, "metal"], ["b", 0, 0.98, 0, 0.16, 0.04, 0.45, "gris"]], { color: "noir" }),
  // ----- décor -----
  P("chassis", "Ch\xE2ssis (mur de d\xE9cor)", "D\xE9cor", 2e3, 100, 3e3, [["b", 0, 0.5, 0.2, 1, 1, 0.6, "$"], ["b", -0.47, 0.5, -0.3, 0.04, 1, 0.4, "bois"], ["b", 0.47, 0.5, -0.3, 0.04, 1, 0.4, "bois"], ["b", 0, 0.5, -0.3, 0.9, 0.03, 0.4, "bois"]], { color: "gris" }),
  P("porte", "Porte avec encadrement", "D\xE9cor", 1e3, 150, 2100, [["b", -0.46, 0.5, 0, 0.08, 1, 1, "blanc"], ["b", 0.46, 0.5, 0, 0.08, 1, 1, "blanc"], ["b", 0, 0.975, 0, 1, 0.05, 1, "blanc"], ["b", 0, 0.475, 0, 0.84, 0.95, 0.3, "$"], ["s", 0.34, 0.48, 0.3, 0.06, 0.03, 0.5, "laiton"]], { color: "bois" }),
  P("fenetre", "Fen\xEAtre dans son mur", "D\xE9cor", 1500, 120, 2600, [["b", 0, 0.17, 0, 1, 0.34, 1, "$"], ["b", 0, 0.94, 0, 1, 0.12, 1, "$"], ["b", -0.43, 0.61, 0, 0.14, 0.54, 1, "$"], ["b", 0.43, 0.61, 0, 0.14, 0.54, 1, "$"], ["b", 0, 0.61, 0, 0.72, 0.54, 0.15, "verre"], ["b", 0, 0.61, 0, 0.03, 0.54, 0.3, "blanc"], ["b", 0, 0.61, 0, 0.72, 0.02, 0.3, "blanc"]], { color: "gris" }),
  P("colonne", "Colonne", "D\xE9cor", 500, 500, 3500, [["b", 0, 0.02, 0, 1, 0.04, 1, "$"], ["c", 0, 0.5, 0, 0.8, 0.92, 0.8, "$"], ["b", 0, 0.98, 0, 1, 0.04, 1, "$"]], { color: "blanc", round: true }),
  P("escalier", "Escalier (4 marches)", "D\xE9cor", 1e3, 1200, 800, steps(4, "$"), { color: "sombre" }),
  P("gradin", "Gradin de sc\xE8ne (3 niveaux)", "D\xE9cor", 4e3, 2400, 900, steps(3, "$"), { color: "sombre" }),
  P("cube", "Cube", "D\xE9cor", 500, 500, 500, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "blanc" }),
  P("estrade-ronde", "Estrade ronde", "D\xE9cor", 2e3, 2e3, 300, [["c", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "sombre", round: true }),
  P("portique", "Portique", "D\xE9cor", 3e3, 300, 3e3, [["b", -0.46, 0.46, 0, 0.08, 0.92, 1, "$"], ["b", 0.46, 0.46, 0, 0.08, 0.92, 1, "$"], ["b", 0, 0.96, 0, 1, 0.08, 1, "$"]], { color: "sombre" }),
  P("cadre", "Cadre vide", "D\xE9cor", 2e3, 100, 2e3, [["b", -0.47, 0.5, 0, 0.06, 1, 1, "$"], ["b", 0.47, 0.5, 0, 0.06, 1, 1, "$"], ["b", 0, 0.97, 0, 1, 0.06, 1, "$"], ["b", 0, 0.03, 0, 1, 0.06, 1, "$"]], { color: "laiton" }),
  P("arbre", "Arbre", "D\xE9cor", 2200, 2200, 3800, [["c", 0, 0.25, 0, 0.12, 0.5, 0.12, "bois"], ["s", 0, 0.68, 0, 1, 0.62, 1, "$"], ["s", 0.18, 0.5, 0.1, 0.5, 0.3, 0.5, "$"]], { color: "vert", round: true }),
  P("plante", "Plante en pot", "D\xE9cor", 500, 500, 1200, [["c", 0, 0.14, 0, 0.6, 0.28, 0.6, "bois"], ["s", 0, 0.64, 0, 1, 0.72, 1, "$"]], { color: "vert", round: true }),
  P("rocher", "Rocher", "D\xE9cor", 1500, 1200, 900, [["s", 0, 0.42, 0, 1, 1.1, 1, "$"], ["s", 0.25, 0.25, 0.2, 0.5, 0.5, 0.5, "$"]], { color: "gris", round: true }),
  P("tapis", "Tapis", "D\xE9cor", 3e3, 2e3, 15, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "rouge" }),
  P("tapis-danse", "Tapis de danse", "D\xE9cor", 1e4, 8e3, 6, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "noir" }),
  P("totem", "Totem lumineux", "D\xE9cor", 400, 400, 2500, [["b", 0, 0.01, 0, 1, 0.02, 1, "sombre"], ["b", 0, 0.51, 0, 0.6, 0.98, 0.6, "$"]], { color: "lampe" }),
  // ----- tissus -----
  P("fond-noir", "Fond noir", "Tissus", 12e3, 100, 7e3, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "noir" }),
  P("pendrillon", "Pendrillon", "Tissus", 2e3, 100, 7e3, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "noir" }),
  P("frise", "Frise", "Tissus", 12e3, 100, 1200, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "noir", z: 6e3 }),
  P("cyclo", "Cyclorama", "Tissus", 12e3, 100, 7e3, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "blanc" }),
  P("tulle", "Tulle", "Tissus", 12e3, 60, 7e3, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "tulle" }),
  P("rideau-avant-scene", "Rideau d'avant-sc\xE8ne (ouvert)", "Tissus", 12e3, 300, 7e3, [["b", -0.39, 0.5, 0, 0.22, 1, 1, "$"], ["b", 0.39, 0.5, 0, 0.22, 1, 1, "$"], ["b", 0, 0.93, 0.1, 1, 0.14, 1, "$"]], { color: "rouge" }),
  // ----- technique -----
  P("regie", "R\xE9gie (table et consoles)", "Technique", 2400, 900, 1050, [["b", 0, 0.69, 0, 1, 0.04, 1, "sombre"], ...legs(0.47, 0.42, 0.67, 0.03, "metal"), ["b", -0.25, 0.76, 0, 0.4, 0.1, 0.7, "noir"], ["b", 0.27, 0.75, 0, 0.36, 0.08, 0.6, "noir"], ["b", -0.25, 0.92, -0.3, 0.22, 0.16, 0.03, "gris"], ["b", 0.27, 0.92, -0.3, 0.22, 0.16, 0.03, "gris"]]),
  P("flight-case", "Flight case", "Technique", 1200, 600, 700, [["b", 0, 0.55, 0, 1, 0.9, 1, "$"], ["b", 0, 0.55, 0, 1.01, 0.04, 1.01, "metal"], ["b", -0.495, 0.55, 0, 0.02, 0.9, 1.01, "metal"], ["b", 0.495, 0.55, 0, 0.02, 0.9, 1.01, "metal"], ["c", -0.4, 0.05, 0.35, 0.07, 0.1, 0.14, "gris"], ["c", 0.4, 0.05, 0.35, 0.07, 0.1, 0.14, "gris"], ["c", -0.4, 0.05, -0.35, 0.07, 0.1, 0.14, "gris"], ["c", 0.4, 0.05, -0.35, 0.07, 0.1, 0.14, "gris"]], { color: "noir" }),
  P("machine-fumee", "Machine \xE0 fum\xE9e", "Technique", 500, 300, 250, [["b", 0, 0.45, 0, 1, 0.9, 1, "sombre"], ["h", 0.2, 0.5, 0.5, 0.16, 0.3, 0.12, "metal"]]),
  P("ventilateur", "Ventilateur de sc\xE8ne", "Technique", 600, 300, 700, [["b", 0, 0.03, 0, 1, 0.06, 1, "sombre"], ["h", 0, 0.55, 0, 0.95, 0.85, 0.5, "metal"], ["h", 0, 0.55, 0.05, 0.3, 0.26, 0.6, "sombre"]]),
  P("barriere", "Barri\xE8re de s\xE9curit\xE9", "Technique", 2500, 600, 1100, [["b", 0, 0.98, 0, 1, 0.04, 0.08, "metal"], ["b", 0, 0.12, 0, 1, 0.04, 0.08, "metal"], ...[-0.48, -0.24, 0, 0.24, 0.48].map((x) => ["b", x, 0.55, 0, 0.02, 0.9, 0.08, "metal"]), ["b", -0.48, 0.02, 0, 0.03, 0.04, 1, "metal"], ["b", 0.48, 0.02, 0, 0.03, 0.04, 1, "metal"]]),
  P("paroi", "Mur de salle (une face)", "D\xE9cor", 1e4, 20, 6e3, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "#35383d" }),
  P("plafond", "Plafond (une face)", "D\xE9cor", 1e4, 1e4, 20, [["b", 0, 0.5, 0, 1, 1, 1, "$"]], { color: "#1e2024" }),
  P("totem-pont", "Totem de pont", "Technique", 290, 290, 3e3, [["b", 0, 8e-3, 0, 2, 0.016, 2, "metal"], ...legs(0.42, 0.42, 1, 0.16, "metal"), ...[0.2, 0.4, 0.6, 0.8, 0.99].map((y) => ["b", 0, y, 0, 0.9, 0.012, 0.9, "metal"])]),
  // ----- personnages (échelle humaine) -----
  // personnages : modèles MakeHuman (CC0), fabriqués hors du logiciel et embarqués (peopleData.ts). Cotes réelles de chaque pose.
  P("chanteur", "Chanteur", "Personnages", 986, 390, 1891, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("chanteuse", "Chanteuse", "Personnages", 1002, 498, 1642, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("guitariste", "Guitariste", "Personnages", 1322, 455, 1735, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("batteur", "Batteur assis", "Personnages", 1130, 701, 1296, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("deejay", "DJ aux platines", "Personnages", 1130, 502, 1729, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("danseuse", "Danseuse", "Personnages", 900, 508, 1581, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("comedien", "Com\xE9dien, bras tendu", "Personnages", 1155, 555, 1693, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("comedienne", "Com\xE9dienne", "Personnages", 649, 611, 1599, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("comedienne-genou", "Com\xE9dienne \xE0 genoux", "Personnages", 581, 1096, 1303, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("technicien", "Technicien", "Personnages", 684, 573, 1772, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("personne", "Homme debout", "Personnages", 660, 601, 1735, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("personne-f", "Femme debout", "Personnages", 550, 448, 1616, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("personne-assise", "Homme assis", "Personnages", 1087, 684, 1331, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-1", "Public : homme, bras lev\xE9s", "Personnages", 735, 489, 1959, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-2", "Public : homme, un bras lev\xE9", "Personnages", 911, 507, 2034, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-3", "Public : femme, bras lev\xE9s", "Personnages", 697, 303, 1833, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-4", "Public : femme debout", "Personnages", 536, 518, 1596, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-5", "Public : homme debout", "Personnages", 644, 541, 1773, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" }),
  P("public-6", "Public : femme, un bras lev\xE9", "Personnages", 792, 388, 1809, [["b", 0, 0.5, 0, 0.7, 1, 0.7, "$"]], { color: "gris" })
];
var PROP_BY_KEY = Object.fromEntries(PROPS.map((p) => [p.key, p]));
var PROP_GROUPS = [...new Set(PROPS.map((p) => p.group))];
export {
  PROPS
};
