// ../src/sceno/ScenoFactory-0.45.0-sources/app/src/trussLib.ts
var TRUSS_LIB = [
  {
    id: "prolyte-h30v",
    maker: "Prolyte",
    name: "H30V",
    sectionMm: 287,
    tube: "membrures 48 \xD7 3 mm, diagonales 16 \xD7 2 mm, raccord CCS6",
    stepMm: 250,
    lengths: [[250, 2.7], [290, 2.9], [500, 4.2], [710, 5.4], [750, 5.7], [1e3, 7], [1500, 10.1], [2e3, 12.9], [2500, 15.7], [3e3, 18.9], [4e3, 24.6]],
    corners: [{ code: "H30V-C001", label: "coin 2 d\xE9parts 45\xB0", ways: 2, angleDeg: 45, kg: null }, { code: "H30V-C002", label: "coin 2 d\xE9parts 60\xB0", ways: 2, angleDeg: 60, kg: null }, { code: "H30V-C003", label: "coin 2 d\xE9parts 90\xB0", ways: 2, angleDeg: 90, kg: null }, { code: "H30V-C004", label: "coin 2 d\xE9parts 120\xB0", ways: 2, angleDeg: 120, kg: null }, { code: "H30V-C005", label: "coin 2 d\xE9parts 135\xB0", ways: 2, angleDeg: 135, kg: null }, { code: "H30V-C012", label: "coin 3 d\xE9parts", ways: 3, kg: null }, { code: "H30V-C017", label: "t\xE9 3 d\xE9parts", ways: 3, kg: null }, { code: "H30V-C016", label: "coin 4 d\xE9parts", ways: 4, kg: null }],
    cornerArmMm: 500,
    source: "prolyte.com, fiche \xAB H30V Square Truss Length \xBB ; coins : catalogue Prolyte",
    url: "https://prolyte.com/products/aluminium-truss/square-truss/h30v-l100-square-30-length-100-cm",
    checked: "2026-11-16"
  },
  {
    id: "prolyte-h40v",
    maker: "Prolyte",
    name: "H40V",
    sectionMm: 387,
    tube: "membrures 48 \xD7 3 mm, diagonales 20 \xD7 2 mm, raccord CCS6",
    stepMm: 250,
    lengths: [[250, 3.4], [500, 4.7], [750, 6.3], [810, 6.7], [1e3, 8.1], [1500, 11], [2e3, 13.9], [2500, 17.7], [3e3, 20.8], [4e3, 26.8]],
    corners: [{ code: "H40V-C003", label: "coin 2 d\xE9parts 90\xB0", ways: 2, angleDeg: 90, kg: null }, { code: "H40V-C012", label: "coin 3 d\xE9parts", ways: 3, kg: null }, { code: "H40V-C017", label: "t\xE9 3 d\xE9parts", ways: 3, kg: null }, { code: "H40V-C016", label: "coin 4 d\xE9parts", ways: 4, kg: null }],
    cornerArmMm: null,
    source: "prolyte.com, fiche \xAB H40V Square Truss Length \xBB",
    url: "https://www.prolyte.com/products/aluminium-truss/square-truss/h40v-l100-square-40-length-100-cm",
    checked: "2026-11-16"
  },
  {
    id: "prolyte-x30v",
    maker: "Prolyte",
    name: "X30V",
    sectionMm: 290,
    tube: "membrures 51 \xD7 2 mm, diagonales 16 \xD7 2 mm, raccord CCS6",
    stepMm: 250,
    lengths: [[250, null], [290, null], [500, null], [710, null], [750, null], [1e3, null], [1500, 8.3], [2e3, 10.7], [2500, 12.8], [3e3, 15.4], [4e3, 20]],
    corners: [{ code: "X30V-C003", label: "coin 2 d\xE9parts 90\xB0", ways: 2, angleDeg: 90, kg: null }, { code: "X30V-C012", label: "coin 3 d\xE9parts", ways: 3, kg: null }, { code: "X30V-C017", label: "t\xE9 3 d\xE9parts", ways: 3, kg: null }, { code: "X30V-C016", label: "coin 4 d\xE9parts", ways: 4, kg: null }],
    cornerArmMm: 500,
    source: "prolyte.com, fiche \xAB X30V Square Truss Length \xBB (poids des \xE9l\xE9ments courts non relev\xE9s)",
    url: "https://www.prolyte.com/products/aluminium-truss/square-truss/x30v-l100-square-30-length-100-cm",
    checked: "2026-11-16"
  },
  {
    id: "global-f34",
    maker: "Global Truss",
    name: "F34",
    sectionMm: 290,
    tube: "tube principal 50 \xD7 2 mm, diagonales 20 mm, raccords coniques",
    stepMm: 500,
    lengths: [[170, null], [210, null], [240, null], [290, 3.8], [500, 4.9], [650, 6.6], [700, 6.8], [1e3, null], [1500, null], [2e3, null], [2500, null], [3e3, 18], [4e3, null]],
    corners: [{ code: "F34 C21", label: "coin 2 d\xE9parts 90\xB0", ways: 2, angleDeg: 90, kg: null }, { code: "F34 C30", label: "coin 3 d\xE9parts 90\xB0", ways: 3, kg: null }, { code: "F34 C35", label: "t\xE9 3 d\xE9parts", ways: 3, kg: null }, { code: "F34 C41", label: "coin 4 d\xE9parts", ways: 4, kg: null }],
    cornerArmMm: 500,
    source: "fiches produit thomann (F34029, F34050, F34065, F34070, F34300) ; les autres poids n'ont pas \xE9t\xE9 relev\xE9s",
    url: "https://www.thomann.co.uk/stairville_4punkttraverse_4110_f34_globaltruss.htm",
    checked: "2026-11-16"
  }
];
var seriesOf = (id) => TRUSS_LIB.find((s) => s.id === id) ?? null;
var seriesLabel = (s) => `${s.maker} ${s.name}`;
function compose(series, lengthMm) {
  const step = series.stepMm, std = series.lengths.map((l) => l[0]).filter((mm) => mm % step === 0).sort((a, b) => b - a), n = Math.max(0, Math.floor((lengthMm + 2) / step)), INF = 1e9;
  const best = new Array(n + 1).fill(INF), take = new Array(n + 1).fill(0);
  best[0] = 0;
  for (let i2 = 1; i2 <= n; i2++) for (const mm of std) {
    const u = mm / step;
    if (u <= i2 && best[i2 - u] + 1 < best[i2]) {
      best[i2] = best[i2 - u] + 1;
      take[i2] = mm;
    }
  }
  let i = n;
  while (i > 0 && best[i] >= INF) i--;
  const pieces = [];
  for (let k = i; k > 0; k -= take[k] / step) pieces.push(take[k]);
  pieces.sort((a, b) => b - a);
  const w = new Map(series.lengths), unknown = [...new Set(pieces.filter((p) => w.get(p) == null))];
  return { pieces, restMm: Math.round(lengthMm - pieces.reduce((t, p) => t + p, 0)), kg: unknown.length ? null : +pieces.reduce((t, p) => t + w.get(p), 0).toFixed(2), unknown };
}
var piecesText = (pieces) => {
  const c = /* @__PURE__ */ new Map();
  for (const p of pieces) c.set(p, (c.get(p) ?? 0) + 1);
  return [...c].sort((a, b) => b[0] - a[0]).map(([mm, n]) => `${n} \xD7 ${String(mm / 1e3).replace(".", ",")} m`).join(" + ") || "aucun \xE9l\xE9ment";
};
function seriesKgPerM(series, lengthMm) {
  const c = compose(series, lengthMm);
  return c.kg == null || lengthMm <= 0 || Math.abs(c.restMm) > 5 ? null : +(c.kg / (lengthMm / 1e3)).toFixed(2);
}
var near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 60;
function trussBom(doc) {
  const sups = Object.values(doc.supports).filter((s) => s.kind === "truss" && seriesOf(s.series)), lines = /* @__PURE__ */ new Map(), notes = /* @__PURE__ */ new Set(), per = [];
  const add = (series, item, code, kgEach, qty = 1) => {
    const k = series.id + "|" + code + "|" + item, l = lines.get(k);
    if (l) l.qty += qty;
    else lines.set(k, { series: seriesLabel(series), item, code, qty, kgEach });
  };
  const straight = (series, mm) => {
    const c = compose(series, mm), w = new Map(series.lengths);
    for (const p of c.pieces) add(series, `\xE9l\xE9ment droit ${String(p / 1e3).replace(".", ",")} m`, `${series.name}-L${String(Math.round(p / 10)).padStart(3, "0")}`, w.get(p) ?? null);
    return c;
  };
  const nodes = [];
  for (const s of sups) {
    const se = seriesOf(s.series), L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) || 1;
    let ends = 0;
    for (const [e, o, along] of [[s.a, s.b, 0], [s.b, s.a, L]]) {
      const tower = s.points.some((p) => p.leg && Math.abs(p.alongMm - along) < 60), joined = sups.some((t) => t.id !== s.id && Math.abs(t.zMm - s.zMm) < 60 && (near(t.a, e) || near(t.b, e)));
      if (!tower && !joined) continue;
      ends++;
      let nd = nodes.find((x) => near(x.at, e) && Math.abs(x.z - s.zMm) < 60);
      if (!nd) nodes.push(nd = { at: e, z: s.zMm, members: [], tower: false, series: se });
      nd.members.push({ s, dir: { x: (o.x - e.x) / L, y: (o.y - e.y) / L } });
      if (tower) nd.tower = true;
    }
    const arm = se.cornerArmMm;
    if (ends && arm == null) notes.add(`${seriesLabel(se)} : la longueur prise par un coin n'est pas relev\xE9e ; les \xE9l\xE9ments droits sont compt\xE9s sur toute la longueur du pont.`);
    const explicit = !!s.pieces?.length && Math.abs(s.pieces.reduce((t, p) => t + p, 0) - L) <= 5;
    if (explicit && ends) notes.add(`${s.name} : pos\xE9 \xE9l\xE9ment par \xE9l\xE9ment, ses pi\xE8ces sont compt\xE9es telles quelles ; le bras des coins n'en est pas retir\xE9.`);
    const mm = explicit ? L : L - ends * (arm ?? 0), c = explicit ? (() => {
      const cc = compOf(se, s, L), w = new Map(se.lengths);
      for (const p of cc.pieces) add(se, `\xE9l\xE9ment droit ${String(p / 1e3).replace(".", ",")} m`, `${se.name}-L${String(Math.round(p / 10)).padStart(3, "0")}`, w.get(p) ?? null);
      return cc;
    })() : straight(se, mm);
    per.push({ id: s.id, name: s.name, straightMm: Math.round(mm), comp: c, ends });
    if (Math.abs(c.restMm) > 5) notes.add(`${s.name} : il reste ${Math.round(c.restMm / 10)} cm hors \xE9l\xE9ments standard (${seriesLabel(se)} va par ${se.stepMm / 10} cm).`);
  }
  for (const nd of nodes) {
    const ways = nd.members.length + (nd.tower ? 1 : 0), se = nd.series;
    if (ways < 2) continue;
    let ang;
    if (nd.members.length === 2 && !nd.tower) {
      const [a, b] = nd.members, dot = a.dir.x * b.dir.x + a.dir.y * b.dir.y;
      ang = Math.round(Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI / 5) * 5;
    }
    if (ang === 180) {
      continue;
    }
    const c = se.corners.find((x) => x.ways === ways && (ways !== 2 || x.angleDeg == null || (nd.tower ? x.angleDeg === 90 : ang == null || x.angleDeg === ang))) ?? null;
    if (c) add(se, c.label, c.code, c.kg);
    else {
      add(se, `coin ${ways} d\xE9parts${ang != null ? " " + ang + "\xB0" : ""} (hors catalogue relev\xE9)`, "\xE0 d\xE9finir", null);
    }
    if (nd.tower) {
      const h = nd.z - (se.cornerArmMm ?? 0), t = straight(se, h);
      add(se, "embase de tour", "\xE0 d\xE9finir", null);
      if (Math.abs(t.restMm) > 5) notes.add(`Tour de ${String(nd.z / 1e3).replace(".", ",")} m : il reste ${Math.round(t.restMm / 10)} cm hors \xE9l\xE9ments standard.`);
    }
  }
  const out = [...lines.values()].sort((a, b) => a.series.localeCompare(b.series) || a.item.localeCompare(b.item, "fr", { numeric: true }));
  const anyNull = out.some((l) => l.kgEach == null);
  if (anyNull) notes.add("Poids total inconnu : le poids de certains \xE9l\xE9ments (coins, embases, ou longueurs non relev\xE9es) n'est pas dans la biblioth\xE8que.");
  if (out.length) notes.add("Les axes des ponts sont pris bout \xE0 bout : les longueurs r\xE9elles d\xE9pendent du type de coin choisi (coin \xE0 bras ou cube) \u2014 \xE0 valider avec le loueur.");
  return { lines: out, totalKg: anyNull || !out.length ? null : +out.reduce((t, l) => t + l.qty * l.kgEach, 0).toFixed(1), notes: [...notes], perSupport: per };
}
function seriesFields(id, lengthMm) {
  const se = seriesOf(id);
  if (!se) return { series: void 0 };
  const k = seriesKgPerM(se, lengthMm);
  return { series: se.id, sectionMm: se.sectionMm, ...k != null ? { kgPerM: k } : {} };
}
function compOf(series, s, lengthMm) {
  const pcs = s.pieces;
  if (!pcs?.length || Math.abs(pcs.reduce((t, p) => t + p, 0) - lengthMm) > 5) return compose(series, lengthMm);
  const w = new Map(series.lengths), pieces = [...pcs].sort((a, b) => b - a), unknown = [...new Set(pieces.filter((p) => w.get(p) == null))];
  return { pieces, restMm: 0, kg: unknown.length ? null : +pieces.reduce((t, p) => t + w.get(p), 0).toFixed(2), unknown };
}

// ../src/sceno/ScenoFactory-0.45.0-sources/app/src/model.ts
var defaultSafety = () => ({ dynFactor: 1.2, cableKgPerM: 1, accessoryKg: 1, peopleBelow: true, supplyA: null, supplyPhases: 3, checklist: {}, checkedBy: "" });
var uid = () => crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
var evenPoints = (lengthMm, n, kind = "fixed") => Array.from({ length: Math.max(0, n) }, (_, i) => ({ id: uid(), alongMm: Math.round(lengthMm * (i + 0.5) / n), capacityKg: null, kind }));

// ../src/sceno/ScenoFactory-0.45.0-sources/app/src/structures.ts
var STRUCTURES = [
  { key: "portique", label: "Portique", note: "Un pont pos\xE9 sur deux tours : face, contre, arche d'entr\xE9e, pont de fond." },
  { key: "gril", label: "Gril sur quatre tours", note: "Un cadre de quatre ponts sur quatre tours d'angle : sc\xE8ne couverte, stand, plateau sans accroche." },
  { key: "suspendu", label: "Pont suspendu", note: "Un pont lev\xE9 par des moteurs r\xE9partis, quand la salle offre des points d'accroche." },
  { key: "totems", label: "Ligne de totems", note: "Des tours verticales align\xE9es, pour des projecteurs lat\xE9raux ou un fond lumineux." }
];
var SECTIONS = [290, 400, 520];
var DEFAULT_SPEC = { type: "portique", x: 0, y: 3e3, rotDeg: 0, lengthMm: 8e3, depthMm: 6e3, heightMm: 5e3, sectionMm: 290, kgPerM: 8, count: 4 };
var rot = (p, c, deg) => {
  const a = deg * Math.PI / 180, dx = p.x - c.x, dy = p.y - c.y;
  return { x: Math.round(c.x + dx * Math.cos(a) - dy * Math.sin(a)), y: Math.round(c.y + dx * Math.sin(a) + dy * Math.cos(a)) };
};
var legs = (L) => [0, L].map((alongMm, i) => ({ id: "leg" + i + Math.random().toString(36).slice(2, 8), alongMm, capacityKg: null, kind: "fixed", leg: true }));
function planStructure(s) {
  const c = { x: s.x, y: s.y }, L = Math.max(1e3, s.lengthMm), D = Math.max(1e3, s.depthMm), H = Math.max(500, s.heightMm), name = (s.name || "").trim(), out = { supports: [], totems: [], towers: [], notes: [] };
  const truss = (label, a, b, points) => {
    const A = rot(a, c, s.rotDeg), B = rot(b, c, s.rotDeg), [p, q] = A.x < B.x || A.x === B.x && A.y <= B.y ? [A, B] : [B, A];
    return { kind: "truss", name: label, a: p, b: q, zMm: H, houseNo: null, allowableKg: null, kgPerM: Math.max(0, s.kgPerM), points, sectionMm: s.sectionMm, ...seriesOf(s.series) ? seriesFields(s.series, Math.hypot(q.x - p.x, q.y - p.y)) : {} };
  };
  if (s.type === "portique") {
    out.supports.push(truss(name || "Portique", { x: c.x - L / 2, y: c.y }, { x: c.x + L / 2, y: c.y }, legs(L)));
    out.towers.push(rot({ x: c.x - L / 2, y: c.y }, c, s.rotDeg), rot({ x: c.x + L / 2, y: c.y }, c, s.rotDeg));
    out.notes.push("Le pont repose sur ses deux tours : leur capacit\xE9 et la charge admissible du pont sont \xE0 saisir d'apr\xE8s le fabricant.");
  } else if (s.type === "gril") {
    const n = name || "Gril", x0 = c.x - L / 2, x1 = c.x + L / 2, y0 = c.y - D / 2, y1 = c.y + D / 2;
    out.supports.push(truss(n + " \xB7 face", { x: x0, y: y0 }, { x: x1, y: y0 }, legs(L)), truss(n + " \xB7 lointain", { x: x0, y: y1 }, { x: x1, y: y1 }, legs(L)), truss(n + " \xB7 jardin", { x: x0, y: y0 }, { x: x0, y: y1 }, legs(D)), truss(n + " \xB7 cour", { x: x1, y: y0 }, { x: x1, y: y1 }, legs(D)));
    for (const p of [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x0, y: y1 }, { x: x1, y: y1 }]) out.towers.push(rot(p, c, s.rotDeg));
    out.notes.push("Chaque tour d'angle porte deux ponts : sa charge r\xE9elle est la somme des deux r\xE9actions affich\xE9es \xE0 cet angle dans \xAB Rigging et charges \xBB.", "Le calcul traite chaque pont s\xE9par\xE9ment ; il ne v\xE9rifie ni les tours, ni les angles, ni la tenue au vent ou au renversement.");
  } else if (s.type === "suspendu") {
    const sup = truss(name || "Pont suspendu", { x: c.x - L / 2, y: c.y }, { x: c.x + L / 2, y: c.y }, evenPoints(L, Math.max(2, Math.min(12, Math.round(s.count))), "hoist"));
    out.supports.push(sup);
    out.notes.push("Les moteurs sont r\xE9partis r\xE9guli\xE8rement : r\xE8gle leur position et leur capacit\xE9 dans l'inspecteur du pont.");
  } else {
    const n = Math.max(1, Math.min(24, Math.round(s.count)));
    const tsec = seriesOf(s.series)?.sectionMm ?? s.sectionMm;
    void tsec;
    for (let i = 0; i < n; i++) out.totems.push({ pos: rot({ x: n === 1 ? c.x : c.x - L / 2 + L * i / (n - 1), y: c.y }, c, s.rotDeg), hMm: H, sectionMm: s.sectionMm });
    out.notes.push("Un totem est un \xE9l\xE9ment de d\xE9cor : il n'entre pas dans le calcul des charges. V\xE9rifie sa stabilit\xE9 (embase, lest) d'apr\xE8s le fabricant.");
  }
  return out;
}
function structureTotals(p) {
  let m = 0, kg = 0;
  for (const s of p.supports) {
    const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) / 1e3;
    m += L;
    kg += L * s.kgPerM;
  }
  return { trussM: m, ownKg: kg };
}

// ../src/sceno/ScenoFactory-0.45.0-sources/app/src/geom.ts
var sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
var len = (a) => Math.hypot(a.x, a.y);
var dist = (a, b) => len(sub(a, b));
var supportLength = (s) => dist(s.a, s.b);

// ../src/sceno/ScenoFactory-0.45.0-sources/app/src/library.ts
var M = (name, layout, cells = 1) => {
  const channels = [];
  let o = 0;
  for (let cell = 1; cell <= cells; cell++) for (const w of layout.split(" ")) {
    o++;
    if (w === "+") channels[channels.length - 1].fine = o;
    else channels.push({ attr: w === "-" ? "other" : w, offset: o, ...cells > 1 ? { cell } : {} });
  }
  return { name, footprint: o, channels };
};
var WHEEL = [{ name: "Ouvert", file: "sf:open" }, { name: "Points", file: "sf:dots" }, { name: "\xC9toile", file: "sf:star" }, { name: "Barres", file: "sf:bars" }, { name: "Brisures", file: "sf:breakup" }];
var G = (m) => ({ ...m, gobo: WHEEL.map((_, i) => ({ from: i * 32, slot: i + 1 })) });
var P = (...n) => {
  const o = [];
  for (let i = 0; i < n.length; i += 2) o.push({ x: n[i], y: n[i + 1] });
  return o;
};
var poly = (pts, fill = true) => ({ t: "poly", pts, closed: true, fill });
var circle = (x, y, r, fill = true) => ({ t: "circle", c: { x, y }, r, fill });
var line = (x1, y1, x2, y2) => ({ t: "line", a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });
var par = [poly(P(-130, 60, 130, 60, 130, -120, 90, -210, -90, -210, -130, -120))];
var decoupe = (w) => [poly(P(-90, 80, 90, 80, w, -260, -w, -260)), poly(P(-w + 15, -260, w - 15, -260, w - 15, -330, -w + 15, -330))];
var fresnel = [poly(P(-140, 90, 140, 90, 140, -170, -140, -170)), line(-140, -110, 140, -110), line(-140, -140, 140, -140)];
var pc = [poly(P(-140, 90, 140, 90, 140, -170, -140, -170)), line(-140, -140, 140, -140)];
var lyre = (inner) => [poly(P(-170, 170, 170, 170, 170, -170, -170, -170)), circle(0, 0, 130), ...inner];
var LIBRARY = [
  { key: "par-led", name: "PAR LED RGBW", moving: false, weightKg: 4, powerW: 150, modes: [M("RGBW", "dim r g b w shutter -"), M("\xC9tendu", "dim + r g b w shutter - - -")], plan: par },
  { key: "par-zoom", name: "PAR LED zoom", moving: false, weightKg: 6, powerW: 200, modes: [M("RGBW + zoom", "dim r g b w shutter zoom - -")], plan: [...par, line(-90, -160, 90, -160)] },
  { key: "decoupe", name: "D\xE9coupe LED 15-30\xB0", moving: false, weightKg: 9, powerW: 250, modes: [M("Dimmer 16 bits", "dim +"), M("Dimmer", "dim")], plan: decoupe(55) },
  { key: "decoupe-l", name: "D\xE9coupe LED 25-50\xB0", moving: false, weightKg: 9, powerW: 250, modes: [M("Dimmer 16 bits", "dim +")], plan: decoupe(80) },
  { key: "fresnel", name: "Fresnel LED 15-55\xB0", moving: false, weightKg: 8, powerW: 250, modes: [M("Dimmer 16 bits", "dim +")], plan: fresnel },
  { key: "pc1k", name: "PC 1 kW halog\xE8ne", moving: false, weightKg: 7, powerW: 1e3, modes: [M("Gradateur", "dim")], plan: pc },
  { key: "wash", name: "Lyre wash LED", moving: true, weightKg: 19, powerW: 420, modes: [M("Standard", "pan + tilt + dim shutter r g b w zoom - - - -"), M("\xC9tendu", "pan + tilt + dim + shutter r + g + b + w + zoom - - - - -")], plan: lyre([line(-130, 0, 130, 0)]) },
  { key: "beam", name: "Lyre beam", moving: true, weightKg: 18, powerW: 350, modes: [M("Standard", "pan + tilt + dim shutter - - - - - - - - - -"), M("\xC9tendu", "pan + tilt + dim + shutter - - - - - - - - - - - - -")], plan: lyre([line(-92, -92, 92, 92), line(-92, 92, 92, -92)]) },
  { key: "spot", name: "Lyre spot / profile", moving: true, weightKg: 24, powerW: 550, modes: [G(M("Standard", "pan + tilt + dim + shutter c m y zoom gobo iris - - - - - - - - - - -")), G(M("\xC9tendu", "pan + tilt + dim + shutter c + m + y + zoom + gobo iris blade1 blade2 blade3 blade4 - - - - - - - - - - -"))], wheel: WHEEL, plan: lyre([circle(0, 0, 60, false)]) },
  { key: "barre", name: "Barre LED 1 m", moving: false, weightKg: 6, powerW: 180, modes: [M("RGB", "r g b"), M("10 pixels", "r g b", 10)], plan: [poly(P(-500, 60, 500, 60, 500, -60, -500, -60)), line(-300, 60, -300, -60), line(-100, 60, -100, -60), line(100, 60, 100, -60), line(300, 60, 300, -60)] },
  { key: "blinder", name: "Blinder 2 lampes", moving: false, weightKg: 5, powerW: 1300, modes: [{ name: "2 canaux", footprint: 2, channels: [{ attr: "dim", offset: 1, cell: 1 }, { attr: "dim", offset: 2, cell: 2 }] }], plan: [poly(P(-230, 110, 230, 110, 230, -110, -230, -110)), circle(-110, 0, 80, false), circle(110, 0, 80, false)] },
  { key: "poursuite", name: "Poursuite 1200", moving: false, weightKg: 40, powerW: 1500, modes: [{ name: "Manuelle", footprint: 0, channels: [] }], plan: [poly(P(-150, 450, 150, 450, 110, -450, -110, -450)), line(-125, -200, 125, -200)] },
  // Vidéo et son. Rapports de projection, flux, ouvertures et poids indicatifs.
  ...[[7, 12, 300], [10, 18, 450], [12, 22, 550], [20, 45, 1200], [30, 75, 2200]].map(([k, kg, w]) => ({ key: `vp${k}`, name: `Vid\xE9oprojecteur ${k} 000 lm`, moving: false, weightKg: kg, powerW: w * 2, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "video", throwRatio: 1.5, lumens: k * 1e3, size: { w: 500 + k * 8, d: 550 + k * 8, h: 200 + k * 4 }, plan: [poly(P(-250, 300, 250, 300, 250, -260, -250, -260)), poly(P(-80, -260, 80, -260, 80, -340, -80, -340)), line(-250, 200, 250, 200)] })),
  { key: "la8", name: 'Enceinte line array 8"', moving: false, weightKg: 32, powerW: 600, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "sound", coverageDeg: 100, size: { w: 580, d: 400, h: 250 }, plan: [poly(P(-290, 200, 290, 200, 220, -200, -220, -200)), line(-220, -200, 220, -200), line(0, 200, 0, -200)] },
  { key: "pt12", name: 'Enceinte point source 12"', moving: false, weightKg: 22, powerW: 500, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "sound", coverageDeg: 80, size: { w: 380, d: 360, h: 600 }, plan: [poly(P(-190, 180, 190, 180, 150, -180, -150, -180)), circle(0, -20, 90, false)] },
  { key: "sub18", name: 'Sub 18"', moving: false, weightKg: 45, powerW: 1200, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "sound", coverageDeg: 360, size: { w: 600, d: 700, h: 500 }, plan: [poly(P(-300, 350, 300, 350, 300, -350, -300, -350)), circle(0, 0, 210, false)] },
  { key: "wedge", name: "Retour de sc\xE8ne", moving: false, weightKg: 18, powerW: 400, modes: [{ name: "Sans DMX", footprint: 0, channels: [] }], domain: "sound", coverageDeg: 60, size: { w: 550, d: 450, h: 350 }, plan: [poly(P(-275, 225, 275, 225, 200, -225, -200, -225)), line(-240, 0, 240, 0)] }
];
var registry = new Map(LIBRARY.map((s) => [s.key, s]));
var symbolOf = (key) => registry.get(key) ?? { key, name: key.startsWith("gdtf-") ? "Fiche GDTF manquante" : key, moving: false, weightKg: 0, powerW: 0, modes: [{ name: "\u2014", footprint: 1 }], plan: [circle(0, 0, 150)] };

// ../src/sceno/ScenoFactory-0.45.0-sources/app/src/rigging.ts
function solve(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    if (Math.abs(A[p][i]) < 1e-11) return null;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const k = A[r][i] / A[i][i];
      if (!k) continue;
      for (let c = i; c < n; c++) A[r][c] -= k * A[i][c];
      b[r] -= k * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}
function beamReactions(L, supports, loads, q) {
  if (supports.length < 2) return null;
  const snap = (v) => v >= L - 5e-5 ? L : Math.max(0, +v.toFixed(4));
  const xs = [...new Set([0, L, ...supports, ...loads.map((l) => l.x)].map(snap))].sort((a, b) => a - b);
  const n = xs.length, N2 = n * 2, K = Array.from({ length: N2 }, () => new Array(N2).fill(0)), F = new Array(N2).fill(0);
  const at = (x) => xs.indexOf(snap(x));
  for (let e = 0; e < n - 1; e++) {
    const l = xs[e + 1] - xs[e], k = 1 / (l * l * l), d = [e * 2, e * 2 + 1, e * 2 + 2, e * 2 + 3];
    const m = [[12, 6 * l, -12, 6 * l], [6 * l, 4 * l * l, -6 * l, 2 * l * l], [-12, -6 * l, 12, -6 * l], [6 * l, 2 * l * l, -6 * l, 4 * l * l]];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) K[d[i]][d[j]] += m[i][j] * k;
    F[d[0]] -= q * l / 2;
    F[d[1]] -= q * l * l / 12;
    F[d[2]] -= q * l / 2;
    F[d[3]] += q * l * l / 12;
  }
  for (const p of loads) {
    const i = at(p.x);
    if (i < 0) return null;
    F[i * 2] -= p.kg;
  }
  if (supports.some((x) => at(x) < 0)) return null;
  const fixed = new Set(supports.map((s) => at(s) * 2)), free = [...Array(N2).keys()].filter((i) => !fixed.has(i));
  const u = solve(free.map((i) => free.map((j) => K[i][j])), free.map((i) => F[i]));
  if (!u) return null;
  const full = new Array(N2).fill(0);
  free.forEach((i, k) => full[i] = u[k]);
  return supports.map((s) => {
    const i = at(s) * 2;
    let r = -F[i];
    for (let j = 0; j < N2; j++) r += K[i][j] * full[j];
    return r;
  });
}
function beamReactionsCheck(L, supports, loads, q) {
  const n = supports.length;
  if (n < 2) return null;
  const mac = (x2, a) => x2 > a ? (x2 - a) ** 3 / 6 : 0;
  const A = [], b = [];
  for (const s of supports) {
    A.push([...supports.map((si) => mac(s, si)), s, 1]);
    b.push(loads.reduce((t, p) => t + p.kg * mac(s, p.x), 0) + q * s ** 4 / 24);
  }
  A.push([...supports.map(() => 1), 0, 0]);
  b.push(loads.reduce((t, p) => t + p.kg, 0) + q * L);
  A.push([...supports, 0, 0]);
  b.push(loads.reduce((t, p) => t + p.kg * p.x, 0) + q * L * L / 2);
  const x = solve(A, b);
  return x ? x.slice(0, n) : null;
}
function internal(L, supports, reactions, loads, q) {
  const ev = [...supports.map((x, i) => ({ x, f: reactions[i] })), ...loads.map((p) => ({ x: p.x, f: -p.kg }))].sort((a, b) => a.x - b.x);
  let V = 0, M2 = 0, x0 = 0, mMax = 0, vMax = 0;
  const walk = (x1) => {
    const d = x1 - x0;
    if (d <= 0) return;
    if (q > 0 && V > 0 && V - q * d < 0) {
      const dz = V / q;
      mMax = Math.max(mMax, Math.abs(M2 + V * dz - q * dz * dz / 2));
    }
    M2 += V * d - q * d * d / 2;
    V -= q * d;
    x0 = x1;
    mMax = Math.max(mMax, Math.abs(M2));
    vMax = Math.max(vMax, Math.abs(V));
  };
  for (const e of ev) {
    walk(e.x);
    V += e.f;
    vMax = Math.max(vMax, Math.abs(V));
  }
  walk(L);
  return { mMax, vMax };
}
function bridle(W, aMm, bMm, dropMm) {
  if (!(dropMm > 0) || !(aMm >= 0) || !(bMm >= 0) || aMm + bMm <= 0 || !(W >= 0)) return null;
  const a1 = Math.atan2(aMm, dropMm), a2 = Math.atan2(bMm, dropMm), s = Math.sin(a1 + a2), t1 = W * Math.sin(a2) / s, t2 = W * Math.sin(a1) / s;
  const l1 = Math.hypot(aMm, dropMm), l2 = Math.hypot(bMm, dropMm), m = [[-aMm / l1, bMm / l2], [dropMm / l1, dropMm / l2]], det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  if (Math.abs(det) < 1e-12) return null;
  const u1 = (0 * m[1][1] - m[0][1] * W) / det, u2 = (m[0][0] * W - 0 * m[1][0]) / det;
  if (![t1, t2, u1, u2].every(Number.isFinite) || Math.abs(t1 - u1) > 1e-6 * Math.max(1, W) || Math.abs(t2 - u2) > 1e-6 * Math.max(1, W)) return null;
  return { t1, t2, a1Deg: a1 * 180 / Math.PI, a2Deg: a2 * 180 / Math.PI, includedDeg: (a1 + a2) * 180 / Math.PI, h: t1 * Math.sin(a1) };
}
var worst = (list) => list.includes("bad") ? "bad" : list.includes("unknown") ? "unknown" : "ok";
var TOL = 5e-3;
function rig(doc, s) {
  const sf = doc.safety, L = supportLength(s) / 1e3;
  const fx = Object.values(doc.fixtures).filter((f) => f.attach?.supportId === s.id);
  const loads = fx.map((f) => ({ x: Math.min(L, Math.max(0, f.attach.alongMm / 1e3)), kg: (f.weightKg || 0) + sf.accessoryKg }));
  const extra = s.loads ?? [];
  let extraKg = 0;
  for (const e of extra) {
    const kg2 = e.kg ?? 0;
    if (!(kg2 > 0)) continue;
    const a = Math.max(0, (e.alongMm - e.lengthMm / 2) / 1e3), b = Math.min(L, (e.alongMm + e.lengthMm / 2) / 1e3);
    extraKg += kg2;
    if (!(e.lengthMm > 0) || b - a < 0.02) loads.push({ x: Math.min(L, Math.max(0, e.alongMm / 1e3)), kg: kg2 });
    else {
      const n2 = Math.max(2, Math.ceil((b - a) / 0.1));
      for (let k = 0; k < n2; k++) loads.push({ x: a + (b - a) * (k + 0.5) / n2, kg: kg2 / n2 });
    }
  }
  const accs = s.accessories ?? [];
  let torsion = 0;
  for (const a of accs) {
    const x = Math.min(L, Math.max(0, a.alongMm / 1e3)), kg2 = a.kg ?? 0;
    if (kg2 > 0) {
      loads.push({ x, kg: kg2 });
      extraKg += kg2;
    }
    if (a.kind === "arm") torsion += a.side * (a.lengthMm / 1e3) * (kg2 / 2 + fx.filter((f) => f.attach?.accId === a.id).reduce((t, f) => t + (f.weightKg || 0) + sf.accessoryKg, 0));
  }
  const q = (s.kgPerM || 0) + sf.cableKgPerM;
  const fixturesKg = fx.reduce((t, f) => t + (f.weightKg || 0), 0), accessoriesKg = fx.length * sf.accessoryKg, selfKg = (s.kgPerM || 0) * L, cableKg = sf.cableKgPerM * L;
  const totalKg = fixturesKg + accessoriesKg + selfKg + cableKg + extraKg, missingWeight = fx.filter((f) => !f.weightKg).length + extra.filter((e) => e.kg == null).length + accs.filter((a) => a.kg == null).length;
  const pts = [...s.points ?? []].sort((a, b) => a.alongMm - b.alongMm), xs = pts.map((p) => Math.min(L, Math.max(0, p.alongMm / 1e3)));
  const base = { support: s, lengthM: L, count: fx.length, powerW: fx.reduce((t, f) => t + (f.powerW || 0), 0), fixturesKg, accessoriesKg, selfKg, cableKg, extraKg, totalKg, missingWeight, allowableOver: s.allowableKg == null ? null : totalKg > s.allowableKg };
  const spanMax = xs.length > 1 ? Math.max(...xs.slice(1).map((x, i) => x - xs[i])) : 0, overhangMax = xs.length ? Math.max(xs[0], L - xs[xs.length - 1]) : L;
  const fail = (error, state) => ({
    ...base,
    points: [],
    indeterminate: false,
    mMax: 0,
    vMax: 0,
    spanMax,
    overhangMax,
    error,
    state,
    verdict: state === "none" && !fx.length ? "unknown" : "bad",
    checks: [{ key: "points", label: "Points d'accroche", state: state === "none" && !fx.length ? "unknown" : "bad", detail: error }]
  });
  if (!pts.length) return fail("Aucun point d'accroche d\xE9fini : la r\xE9partition ne peut pas \xEAtre calcul\xE9e.", "none");
  if (pts.length === 1 || new Set(xs.map((x) => x.toFixed(3))).size < 2) return fail("Un seul point d'accroche : la barre n'est pas stable et la r\xE9partition n'a pas de sens.", "single");
  const tol = Math.max(0.05, totalKg * TOL);
  const both = (sx) => {
    const a = beamReactions(L, sx, loads, q), b = beamReactionsCheck(L, sx, loads, q);
    if (!a || !b || a.some((v, i) => !isFinite(v) || Math.abs(v - b[i]) > tol)) return null;
    const sum = a.reduce((t, v) => t + v, 0), mom = a.reduce((t, v, i) => t + v * sx[i], 0), momLoads = loads.reduce((t, p) => t + p.kg * p.x, 0) + q * L * L / 2;
    return Math.abs(sum - totalKg) > tol || Math.abs(mom - momLoads) > tol * Math.max(1, L) ? null : a;
  };
  const settle = (keep) => {
    let k = [...keep];
    for (; ; ) {
      if (k.length < 2) return "unstable";
      const r = both(k.map((i) => xs[i]));
      if (!r) return null;
      let lo = 0;
      for (let j = 1; j < r.length; j++) if (r[j] < r[lo]) lo = j;
      if (r[lo] >= -tol) return { keep: k, r };
      k = k.filter((_, j) => j !== lo);
    }
  };
  const all = xs.map((_, i) => i), first = both(xs), base0 = settle(all);
  if (!first || base0 === null) return fail("Le calcul n'a pas pass\xE9 son contr\xF4le interne (deux m\xE9thodes en d\xE9saccord ou \xE9quilibre non respect\xE9). Aucun chiffre n'est affich\xE9 : v\xE9rifie que deux points ne sont pas au m\xEAme endroit, puis signale ce cas.", "error");
  if (base0 === "unstable") return fail("La charge en porte-\xE0-faux fait basculer la barre : avec ces points d'accroche elle ne tient pas en \xE9quilibre. Rapproche un point du bout charg\xE9.", "uplift");
  const n = xs.length, ideal = new Array(n).fill(0);
  base0.keep.forEach((k, j) => ideal[k] = base0.r[j]);
  const slack = new Set(all.filter((i) => !base0.keep.includes(i)));
  const worstKg = [...ideal];
  let { mMax, vMax } = internal(L, base0.keep.map((k) => xs[k]), base0.r, loads, q);
  let tipping = false;
  if (n >= 3) {
    const patterns = [];
    for (let i = 0; i < n; i++) patterns.push(all.filter((k) => k !== i));
    if (n >= 4) {
      patterns.push(all.filter((k) => k % 2 === 0));
      patterns.push(all.filter((k) => k % 2 === 1));
    }
    for (const keep of patterns) {
      const st = settle(keep);
      if (st === "unstable") {
        tipping = true;
        continue;
      }
      if (!st) continue;
      st.keep.forEach((k, j) => {
        worstKg[k] = Math.max(worstKg[k], st.r[j]);
      });
      const it = internal(L, st.keep.map((k) => xs[k]), st.r, loads, q);
      mMax = Math.max(mMax, it.mMax);
      vMax = Math.max(vMax, it.vMax);
    }
  }
  const points = pts.map((p, i) => {
    const dyn = p.kind === "hoist" ? sf.dynFactor : 1, designKg = worstKg[i] * dyn, uplift = slack.has(i);
    return { id: p.id, alongMm: p.alongMm, kind: p.kind, kg: ideal[i], worstKg: worstKg[i], designKg, buildingKg: designKg + (p.hoistKg ?? 0), capacityKg: p.capacityKg, hoistKg: p.hoistKg ?? null, use: p.capacityKg ? designKg / p.capacityKg : null, over: p.capacityKg != null && designKg > p.capacityKg, uplift };
  });
  const kg = (v) => `${v.toFixed(0)} kg`, checks = [];
  const noCap = points.filter((p) => p.capacityKg == null).length, over = points.filter((p) => p.over), top = points.reduce((a, b) => b.designKg > a.designKg ? b : a);
  checks.push({
    key: "points",
    label: "Charge de chaque point contre sa capacit\xE9",
    state: over.length ? "bad" : noCap ? "unknown" : "ok",
    detail: over.length ? `${over.length} point${over.length > 1 ? "s" : ""} au-del\xE0 de sa capacit\xE9 (jusqu'\xE0 ${kg(over.reduce((a, b) => b.designKg > a.designKg ? b : a).designKg)}).` : noCap ? `Capacit\xE9 non renseign\xE9e sur ${noCap} point${noCap > 1 ? "s" : ""} : rien n'est compar\xE9 pour ${noCap > 1 ? "eux" : "lui"}.` : `Point le plus charg\xE9 : ${kg(top.designKg)}, soit ${Math.round((top.use ?? 0) * 100)} % de sa capacit\xE9.`
  });
  checks.push({ key: "uplift", label: "Aucun point soulev\xE9", state: points.some((p) => p.uplift) ? "bad" : "ok", detail: points.some((p) => p.uplift) ? "Une charge en porte-\xE0-faux d\xE9tend un point : il ne porte rien, ses voisins prennent tout et la barre peut basculer." : "Tous les points portent." });
  if (tipping) checks.push({ key: "tip", label: "Stabilit\xE9 si un point l\xE2che", state: "bad", detail: "Si un des points ne porte plus, la barre bascule : il n'y a aucune marge. Ajoute un point ou rapproche les points des bouts charg\xE9s." });
  checks.push({ key: "total", label: "Charge totale contre la charge admissible de la barre", state: s.allowableKg == null ? "unknown" : totalKg > s.allowableKg ? "bad" : "ok", detail: s.allowableKg == null ? "Charge admissible non renseign\xE9e." : `${kg(totalKg)} pour ${kg(s.allowableKg)} admissibles.` });
  if (accs.some((a) => a.kind === "arm")) checks.push({ key: "torsion", label: "Torsion de la barre (bras de d\xE9port)", state: "unknown", detail: `Les bras de d\xE9port tordent la barre : couple de ${Math.abs(torsion).toFixed(0)} kg\xB7m${Math.abs(torsion) < 0.5 ? " (les bras s'\xE9quilibrent)" : ""}. Ce logiciel ne v\xE9rifie ni la tenue en torsion de la barre ni celle des colliers : \xE0 faire valider par une personne comp\xE9tente.` });
  if (accs.some((a) => a.kind === "ladder")) checks.push({ key: "ladder", label: "\xC9chelles de projecteur", state: "unknown", detail: "La charge admissible de chaque \xE9chelle et la s\xE9curit\xE9 de son accroche (\xE9lingue de s\xE9curit\xE9, anti-balancement) ne sont pas v\xE9rifi\xE9es ici : voir la notice du fabricant." });
  {
    const src = (id) => pts.find((p) => p.id === id), n2 = (i) => `point ${i + 1}`, bad = [], miss = [], info = [];
    let any = false;
    points.forEach((pl, i) => {
      const p = src(pl.id);
      if (p.slingCapKg != null) {
        any = true;
        if (pl.designKg > p.slingCapKg) bad.push(`${n2(i)} : \xE9lingue charg\xE9e \xE0 ${kg(pl.designKg)} pour ${kg(p.slingCapKg)} admis`);
      }
      if (p.bridle) {
        any = true;
        const b = bridle(pl.buildingKg, p.bridle.aMm, p.bridle.bMm, p.bridle.dropMm);
        if (!b) {
          bad.push(`${n2(i)} : palonnier impossible \xE0 calculer (hauteur nulle ou \xE9carts incoh\xE9rents)`);
          return;
        }
        info.push(`${n2(i)} : brins \xE0 ${kg(b.t1)} et ${kg(b.t2)} pour ${kg(pl.buildingKg)} port\xE9s, ouverture ${b.includedDeg.toFixed(0)}\xB0, effort horizontal ${kg(b.h)} sur chaque ancrage`);
        if (b.includedDeg > 120) bad.push(`${n2(i)} : ouverture de ${b.includedDeg.toFixed(0)}\xB0, au-del\xE0 de 120\xB0 un brin porte plus que la charge elle-m\xEAme`);
        if (p.bridle.legCapKg == null) miss.push(`${n2(i)} : charge admissible des brins`);
        else if (Math.max(b.t1, b.t2) > p.bridle.legCapKg) bad.push(`${n2(i)} : brin \xE0 ${kg(Math.max(b.t1, b.t2))} pour ${kg(p.bridle.legCapKg)} admis`);
        if (p.originCapKg == null) miss.push(`${n2(i)} : capacit\xE9 des ancrages`);
        else if (Math.max(b.t1, b.t2) > p.originCapKg) bad.push(`${n2(i)} : ancrage \xE0 ${kg(Math.max(b.t1, b.t2))} pour ${kg(p.originCapKg)} admis`);
      } else if (p.originCapKg != null) {
        any = true;
        if (pl.buildingKg > p.originCapKg) bad.push(`${n2(i)} : point du b\xE2timent \xE0 ${kg(pl.buildingKg)} pour ${kg(p.originCapKg)} admis`);
      }
    });
    if (any) checks.push({ key: "above", label: "\xC9lingues, palonniers et points du b\xE2timent", state: bad.length ? "bad" : miss.length ? "unknown" : "ok", detail: [...bad, ...miss.length ? ["Non renseign\xE9 : " + miss.join(" ; ")] : [], ...info].join(". ") + ". Les efforts horizontaux d'un palonnier doivent \xEAtre repris par la structure : ce point n'est pas v\xE9rifi\xE9 ici." });
  }
  const mAdm = s.mAdmKgm ?? null, vAdm = s.vAdmKg ?? null;
  checks.push({
    key: "beam",
    label: "R\xE9sistance de la barre (flexion et effort tranchant)",
    state: mAdm == null || vAdm == null ? "unknown" : mMax > mAdm || vMax > vAdm ? "bad" : "ok",
    detail: `Moment fl\xE9chissant maximal ${mMax.toFixed(0)} kg\xB7m, effort tranchant maximal ${kg(vMax)}, plus grande port\xE9e entre points ${spanMax.toFixed(2).replace(".", ",")} m, porte-\xE0-faux ${overhangMax.toFixed(2).replace(".", ",")} m. ` + (mAdm == null || vAdm == null ? "Valeurs admissibles du fabricant non renseign\xE9es : \xE0 comparer \xE0 son tableau de charge." : mMax > mAdm || vMax > vAdm ? "Au-del\xE0 des valeurs admissibles saisies." : "Sous les valeurs admissibles saisies.")
  });
  checks.push({ key: "weights", label: "Poids de tous les appareils connus", state: missingWeight ? "unknown" : "ok", detail: missingWeight ? `${missingWeight} appareil${missingWeight > 1 ? "s" : ""} sans poids : la charge r\xE9elle est plus \xE9lev\xE9e que celle affich\xE9e.` : fx.some((f) => symbolOf(f.symbol).source !== "gdtf") ? "Tous renseign\xE9s, dont des poids g\xE9n\xE9riques de la biblioth\xE8que : \xE0 confirmer sur les fiches du mat\xE9riel r\xE9el." : "Tous renseign\xE9s." });
  const hoists = pts.filter((p) => p.kind === "hoist");
  if (hoists.length) {
    const unk = hoists.filter((p) => !p.cls).length, d8 = hoists.filter((p) => p.cls === "D8" && !p.secondary).length;
    checks.push({
      key: "class",
      label: "Moteurs adapt\xE9s \xE0 la pr\xE9sence de personnes sous la charge",
      state: !sf.peopleBelow ? "ok" : d8 ? "bad" : unk ? "unknown" : "ok",
      detail: !sf.peopleBelow ? "Personne sous la charge d'apr\xE8s les r\xE9glages du projet." : d8 ? `${d8} moteur${d8 > 1 ? "s" : ""} D8 sans s\xE9curit\xE9 secondaire : un D8 ne tient pas une charge au-dessus de personnes sans reprise secondaire.` : unk ? `Classe non renseign\xE9e pour ${unk} moteur${unk > 1 ? "s" : ""}.` : "D8 avec s\xE9curit\xE9 secondaire, D8+ ou C1 partout. Un moteur D8 ou D8+ ne se man\u0153uvre pas avec des personnes dessous."
    });
    const noW = hoists.filter((p) => p.hoistKg == null).length;
    checks.push({ key: "hoistKg", label: "Poids des moteurs compt\xE9 au point de la salle", state: noW ? "unknown" : "ok", detail: noW ? `Poids non renseign\xE9 pour ${noW} moteur${noW > 1 ? "s" : ""} : la charge sur la charpente est sous-estim\xE9e d'autant.` : "Renseign\xE9 partout." });
  }
  if (n >= 3) checks.push({ key: "level", label: "R\xE9partition r\xE9elle mesur\xE9e (pesons)", state: "unknown", detail: "Avec trois points ou plus, seul un peson sur chaque point dit ce qu'il reprend vraiment. Le cas d\xE9favorable calcul\xE9 ici couvre un point qui ne porte plus, pas tous les mauvais r\xE9glages possibles." });
  const verdict = worst(checks.map((c) => c.state));
  return { ...base, points, indeterminate: n >= 3, mMax, vMax, spanMax, overhangMax, error: null, checks, verdict, state: points.some((p) => p.uplift) ? "uplift" : over.length ? "over" : "ok" };
}
function power(doc) {
  const sf = doc.safety, led = Object.values(doc.objects).filter((o) => o.kind === "ledwall").reduce((t, o) => t + o.wMm / 1e3 * (o.hMm / 1e3) * o.wPerM2, 0);
  const totalW = Object.values(doc.fixtures).reduce((t, f) => t + (f.powerW || 0), 0) + led, phases = sf.supplyPhases;
  const perPhaseA = totalW / (phases === 3 ? 3 : 1) / 230;
  const state = sf.supplyA == null ? "unknown" : perPhaseA > sf.supplyA ? "bad" : "ok";
  return {
    totalW,
    amps: totalW / 230,
    perPhaseA,
    supplyA: sf.supplyA,
    phases,
    state,
    detail: sf.supplyA == null ? "Alimentation disponible non renseign\xE9e." : perPhaseA > sf.supplyA ? `${perPhaseA.toFixed(0)} A par phase pour ${sf.supplyA} A disponibles.` : `${perPhaseA.toFixed(0)} A par phase pour ${sf.supplyA} A disponibles (${Math.round(perPhaseA / sf.supplyA * 100)} %).`
  };
}

// ../src/sceno/ScenoFactory-0.45.0-sources/app/src/beam.ts
var T = (material, odMm, tMm) => ({ key: `${material}-${odMm}x${tMm}`, label: `${material === "acier" ? "Acier" : "Aluminium"} \xD8 ${String(odMm).replace(".", ",")} \xD7 ${String(tMm).replace(".", ",")} mm`, odMm, tMm, material, E: material === "acier" ? 21e4 : 7e4, rho: material === "acier" ? 7850 : 2700 });
var TUBES = [T("acier", 48.3, 3.2), T("acier", 48.3, 4), T("acier", 60.3, 3.6), T("alu", 48.3, 4), T("alu", 50, 3), T("alu", 50, 4), T("alu", 50, 5)];
var tubeOf = (key) => TUBES.find((t) => t.key === key) ?? null;
function tubeProps(t) {
  const D = t.odMm, d = D - 2 * t.tMm, A = Math.PI / 4 * (D * D - d * d), I = Math.PI / 64 * (D ** 4 - d ** 4);
  return { A, I, W: I / (D / 2), kgPerM: +(A * t.rho / 1e6).toFixed(2) };
}
var G2 = 9.80665;
var N = 400;
function beamPlan(doc, s) {
  const r = rig(doc, s), sf = doc.safety, L = supportLength(s) / 1e3, q = (s.kgPerM || 0) + sf.cableKgPerM, loads = [], pt = [];
  const fx = Object.values(doc.fixtures).filter((f) => f.attach?.supportId === s.id).sort((a, b) => a.attach.alongMm - b.attach.alongMm);
  fx.forEach((f, i) => {
    const x = Math.min(L, Math.max(0, f.attach.alongMm / 1e3)), kg = (f.weightKg || 0) + sf.accessoryKg;
    loads.push({ x, kg, label: f.unitNumber ? "n\xB0 " + f.unitNumber : "appareil " + (i + 1), n: i + 1 });
    pt.push({ x, kg });
  });
  for (const e of s.loads ?? []) {
    const kg = e.kg ?? 0;
    if (!(kg > 0)) continue;
    const a = Math.max(0, (e.alongMm - e.lengthMm / 2) / 1e3), b = Math.min(L, (e.alongMm + e.lengthMm / 2) / 1e3);
    if (!(e.lengthMm > 0) || b - a < 0.02) {
      const x = Math.min(L, Math.max(0, e.alongMm / 1e3));
      loads.push({ x, kg, label: e.name || "charge" });
      pt.push({ x, kg });
    } else {
      loads.push({ x: (a + b) / 2, kg, label: e.name || "charge r\xE9partie", from: a, to: b });
      const n = Math.max(2, Math.ceil((b - a) / 0.1));
      for (let k2 = 0; k2 < n; k2++) pt.push({ x: a + (b - a) * (k2 + 0.5) / n, kg: kg / n });
    }
  }
  for (const a of s.accessories ?? []) {
    const kg = a.kg ?? 0;
    if (kg > 0) {
      const x = Math.min(L, Math.max(0, a.alongMm / 1e3));
      loads.push({ x, kg, label: a.kind === "arm" ? "bras de d\xE9port" : "\xE9chelle" });
      pt.push({ x, kg });
    }
  }
  const xs = Array.from({ length: N + 1 }, (_, i) => L * i / N), M2 = new Array(N + 1).fill(0), w = new Array(N + 1).fill(null), usefulKg = r.totalKg - r.selfKg;
  const out = { r, L, q, loads, xs, M: M2, w, mMax: 0, mAt: 0, sigmaMPa: null, wMaxMm: null, wAt: 0, spanRef: 0, usefulKg };
  if (r.error || !r.points.length) return out;
  const R = r.points.map((p) => ({ x: Math.min(L, Math.max(0, p.alongMm / 1e3)), kg: p.kg }));
  for (let i = 0; i <= N; i++) {
    const x = xs[i];
    let m = -q * x * x / 2;
    for (const p of R) if (x > p.x) m += p.kg * (x - p.x);
    for (const p of pt) if (x > p.x) m -= p.kg * (x - p.x);
    M2[i] = m;
    if (Math.abs(m) > Math.abs(out.mMax)) {
      out.mMax = m;
      out.mAt = x;
    }
  }
  const tube = s.kind === "pipe" ? tubeOf(s.tube) : null;
  if (!tube) return out;
  const tp = tubeProps(tube), EI = tube.E * tp.I * 1e-6;
  out.sigmaMPa = Math.abs(out.mMax) * G2 * 1e3 / tp.W;
  const h = L / N, th = new Array(N + 1).fill(0), y = new Array(N + 1).fill(0);
  for (let i = 1; i <= N; i++) {
    th[i] = th[i - 1] + (M2[i - 1] + M2[i]) / 2 * G2 * h / EI;
    y[i] = y[i - 1] + (th[i - 1] + th[i]) / 2 * h;
  }
  const at = (x) => {
    const u = Math.min(N, Math.max(0, x / h)), i = Math.min(N - 1, Math.floor(u)), f = u - i;
    return y[i] * (1 - f) + y[i + 1] * f;
  }, x0 = R[0].x, x1 = R[R.length - 1].x, y0 = at(x0), y1 = at(x1), c1 = x1 > x0 ? -(y1 - y0) / (x1 - x0) : 0, c2 = -y0 - c1 * x0;
  let wm = 0;
  for (let i = 0; i <= N; i++) {
    const v = (y[i] + c1 * xs[i] + c2) * 1e3;
    w[i] = v;
    if (Math.abs(v) > Math.abs(wm)) {
      wm = v;
      out.wAt = xs[i];
    }
  }
  out.wMaxMm = Math.abs(wm);
  const k = R.findIndex((p) => p.x > out.wAt);
  out.spanRef = k === 0 ? 2 * R[0].x : k < 0 ? 2 * (L - x1) : R[k].x - R[k - 1].x;
  return out;
}
function planChecks(p, s, deflRatio) {
  const fr = (n, d = 1) => n.toFixed(d).replace(".", ","), top = p.r.points.reduce((m, x) => x.designKg > (m?.designKg ?? -1) ? x : m, null);
  const caps = p.r.points.map((x) => x.capacityKg).filter((c) => c != null), capMin = caps.length === p.r.points.length && caps.length ? Math.min(...caps) : null, worst2 = p.r.points.length ? Math.max(...p.r.points.map((x) => x.capacityKg ? x.designKg / x.capacityKg : 0)) : 0;
  const lim = p.spanRef > 0 ? p.spanRef * 1e3 / deflRatio : null;
  return [
    { key: "charge", label: "Charge utile (mat\xE9riel, accessoires, c\xE2bles, charges ajout\xE9es)", value: fr(p.usefulKg) + " kg", limit: s.allowableKg != null ? fr(s.allowableKg, 0) + " kg" : "inconnue", ratio: s.allowableKg ? p.usefulKg / s.allowableKg : null },
    { key: "point", label: "Point de suspension le plus charg\xE9", value: top ? fr(top.designKg) + " kg" : "\u2014", limit: capMin != null ? fr(capMin, 0) + " kg" : "inconnue", ratio: capMin != null ? worst2 : null },
    { key: "sigma", label: `Contrainte de flexion (M = ${fr(Math.abs(p.mMax))} kg\xB7m \xE0 ${fr(p.mAt, 2)} m)`, value: p.sigmaMPa != null ? fr(p.sigmaMPa) + " MPa" : "inconnue (tube \xE0 choisir)", limit: s.stressAdmMPa != null ? fr(s.stressAdmMPa, 0) + " MPa" : "inconnue", ratio: p.sigmaMPa != null && s.stressAdmMPa ? p.sigmaMPa / s.stressAdmMPa : null },
    { key: "fleche", label: `Fl\xE8che${p.wMaxMm != null ? ` (\xE0 ${fr(p.wAt, 2)} m)` : ""}`, value: p.wMaxMm != null ? fr(p.wMaxMm) + " mm" : "inconnue (tube \xE0 choisir)", limit: lim != null && p.wMaxMm != null ? `port\xE9e / ${deflRatio} = ${fr(lim)} mm` : `port\xE9e / ${deflRatio}`, ratio: p.wMaxMm != null && lim ? p.wMaxMm / lim : null }
  ];
}
export {
  DEFAULT_SPEC,
  SECTIONS,
  STRUCTURES,
  TRUSS_LIB,
  TUBES,
  beamPlan,
  beamReactions,
  beamReactionsCheck,
  bridle,
  compOf,
  compose,
  defaultSafety,
  evenPoints,
  internal,
  piecesText,
  planChecks,
  planStructure,
  power,
  rig,
  seriesFields,
  seriesKgPerM,
  seriesLabel,
  seriesOf,
  structureTotals,
  trussBom,
  tubeOf,
  tubeProps
};
