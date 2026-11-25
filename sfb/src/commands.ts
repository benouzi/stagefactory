import type { StructurePlan } from "./structures";
import type { Backdrop, Doc, Fixture, Id, Obj, RigPoint, Selection, Support, Vec2 } from "./model";
import { propOf, type CustomProp } from "./props";
import { evenPoints, uid } from "./model";
import { exec, getState, select } from "./store";
import { domainOf, footprintOf, symbolOf } from "./library";
import { dist, fixturePos, pointOnSupport, rotate, supportLength } from "./geom";
import { firstFree, fixturesOn, range, readingOrder, sortedSupports } from "./queries";

const nextNumber = (values: string[]): string => String(values.reduce((m, v) => Math.max(m, parseInt(v, 10) || 0), 0) + 1);

// Adresse suivante : juste après la dernière adresse occupée du dernier univers utilisé.
// Si l'appareil n'y tient plus, on passe à l'univers suivant. Un appareil sans canal DMX n'est pas patché.
export function nextPatch(d: Doc, footprint: number): { universe: number; address: number } | null {
  if (footprint <= 0) return null;
  let u = 1, last = 0;
  for (const f of Object.values(d.fixtures)) { const r = range(f); if (!r) continue; if (r.u > u) { u = r.u; last = r.to; } else if (r.u === u) last = Math.max(last, r.to); }
  if (last + footprint > 512) { u += 1; last = 0; }
  return u > 64 ? null : { universe: u, address: last + 1 };
}

function makeFixture(d: Doc, symbol: string, attach: Fixture["attach"], pos: Vec2, autoNumber: boolean, autoPatch = false): Fixture {
  const s = symbolOf(symbol);
  if (s.source === "gdtf" && !d.library[s.key]) d.library[s.key] = s; // la fiche voyage avec le projet
  const patch = autoPatch ? nextPatch(d, s.modes[0].footprint) : null;
  const light = domainOf(s) === "light"; // seuls les projecteurs prennent un numéro de canal
  const same = Object.values(d.fixtures).filter((f) => (f.attach?.supportId ?? null) === (attach?.supportId ?? null));
  return {
    id: uid(), symbol, attach, pos, zMm: 0, rotDeg: 0,
    unitNumber: autoNumber ? nextNumber(same.map((f) => f.unitNumber)) : "",
    channel: autoNumber && light ? nextNumber(Object.values(d.fixtures).map((f) => f.channel)) : "",
    universe: patch?.universe ?? null, address: patch?.address ?? null, modeName: s.modes[0].name, purpose: "", color: "", group: "",
    panDeg: 0, tiltDeg: 0, weightKg: s.weightKg, powerW: s.powerW, notes: "",
    ...(domainOf(s) === "video" ? { throwRatio: s.throwRatio ?? 1.5, lumens: s.lumens ?? null, targetId: nearestScreen(d, attach ? pointOnSupport(d.supports[attach.supportId], attach.alongMm) : pos) } : {}),
  };
}

const nearestScreen = (d: Doc, at: Vec2): Id | null => Object.values(d.objects).filter((o) => o.kind === "screen").sort((a, b) => dist(a.pos, at) - dist(b.pos, at))[0]?.id ?? null;

/** Pose une structure scénique d'un coup (une seule étape d'annulation) : ses ponts, et ses totems. Renvoie les identifiants créés. */
export function addStructure(plan: StructurePlan, label = "Poser une structure"): { supports: Id[]; objects: Id[] } {
  const supports: Id[] = [], objects: Id[] = [];
  exec(label, (d) => {
    for (const s of plan.supports) { const id = uid(); d.supports[id] = { ...s, id, points: s.points.map((p) => ({ ...p, id: uid() })) }; supports.push(id); }
    for (const t of plan.totems) { const id = uid(); d.objects[id] = { id, kind: "prop", pos: { ...t.pos }, rotDeg: 0, wMm: t.sectionMm, dMm: t.sectionMm, hMm: t.hMm, zMm: 0, model: "totem-pont" } as Obj; objects.push(id); }
  });
  select([...supports.map((id) => ({ kind: "support" as const, id })), ...objects.map((id) => ({ kind: "object" as const, id }))]);
  return { supports, objects };
}
/** Les ponts raccordés à celui-ci, de proche en proche (bouts qui se touchent à la même hauteur). */
export function trussChain(d: Doc, id: Id): Id[] {
  const out = new Set<Id>([id]), todo = [id], near = (p: Vec2, q: Vec2) => Math.hypot(p.x - q.x, p.y - q.y) < 60;
  while (todo.length) { const s = d.supports[todo.pop()!]; if (!s || s.kind !== "truss") continue; for (const t of Object.values(d.supports)) { if (out.has(t.id) || t.kind !== "truss" || Math.abs(t.zMm - s.zMm) > 60) continue; if ([s.a, s.b].some((e) => near(e, t.a) || near(e, t.b))) { out.add(t.id); todo.push(t.id); } } }
  return [...out];
}
/** Hauteur d'un pont : toute la structure raccordée monte ou descend avec lui. */
export function setTrussHeight(id: Id, zMm: number): number {
  const ids = trussChain(getState().doc, id); exec(ids.length > 1 ? "Hauteur de la structure" : "Modifier", (d) => { for (const k of ids) if (d.supports[k]) d.supports[k].zMm = zMm; }); return ids.length;
}
/** Renomme une série de supports : préfixe, numéro qui avance, suffixe. Dans l'ordre donné. */
export function renameSupports(ids: Id[], prefix: string, start: number, suffix: string) {
  exec("Renuméroter", (d) => { ids.forEach((id, i) => { if (d.supports[id]) d.supports[id].name = `${prefix}${start + i}${suffix}`.trim() || d.supports[id].name; }); });
}
/** Allonge un pont par un bout : le bout « from » part en « to ». Les points d'accroche gardent leur place, une tour de bout suit le bout. */
export function extendTruss(id: Id, from: Vec2, to: Vec2, extra: Partial<Support> = {}) {
  exec("Ajouter un élément au pont", (d) => { const s = d.supports[id]; if (!s) return; const L0 = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), atA = Math.hypot(s.a.x - from.x, s.a.y - from.y) < Math.hypot(s.b.x - from.x, s.b.y - from.y);
    if (atA) s.a = { ...to }; else s.b = { ...to }; const L1 = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), add = L1 - L0;
    for (const p of s.points) { const end = atA ? p.alongMm < 60 : Math.abs(p.alongMm - L0) < 60; if (p.leg && end) p.alongMm = atA ? 0 : L1; else if (atA) p.alongMm += add; }
    for (const l of s.loads ?? []) if (atA) l.alongMm += add; for (const acc of s.accessories ?? []) if (atA) acc.alongMm += add;
    for (const f of Object.values(d.fixtures)) if (atA && f.attach?.supportId === id) f.attach.alongMm += add;
    if (s.a.x > s.b.x) { const t = s.a; s.a = s.b; s.b = t; for (const p of s.points) p.alongMm = L1 - p.alongMm; for (const l of s.loads ?? []) l.alongMm = L1 - l.alongMm; for (const acc of s.accessories ?? []) acc.alongMm = L1 - acc.alongMm; for (const f of Object.values(d.fixtures)) if (f.attach?.supportId === id) f.attach.alongMm = L1 - f.attach.alongMm; s.points.sort((p, q) => p.alongMm - q.alongMm); }
    Object.assign(s, extra); });
}
/** Pose ou retire une tour (appui au sol) à un bout d'un pont. */
export function toggleLeg(id: Id, end: "a" | "b") {
  exec("Tour de pont", (d) => { const s = d.supports[id]; if (!s) return; const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), at = end === "a" ? 0 : L, i = s.points.findIndex((p) => p.leg && Math.abs(p.alongMm - at) < 60); if (i >= 0) s.points.splice(i, 1); else s.points.push({ id: uid(), alongMm: at, capacityKg: null, kind: "fixed", leg: true }); s.points.sort((p, q) => p.alongMm - q.alongMm); });
}
export function addSupport(a: Vec2, b: Vec2, kind: Support["kind"] = "pipe"): Id {
  const id = uid();
  const [p, q] = a.x <= b.x ? [a, b] : [b, a]; // extrémité jardin en premier
  exec(kind === "truss" ? "Poser un pont" : "Poser une perche", (d) => {
    const n = nextNumber(Object.values(d.supports).map((s) => (s.name.match(/(\d+)\s*$/) || [])[1] || "0"));
    const L = dist(p, q), word = kind === "truss" ? "Pont" : "Perche";
    // un point tous les 3 à 4 m, deux au minimum ; un pont arrive sur moteurs, une perche sur fils fixes
    d.supports[id] = { id, kind, name: `${word} ${n}`, a: p, b: q, zMm: kind === "truss" ? 6000 : 7000, houseNo: null, allowableKg: null, kgPerM: kind === "truss" ? 8 : 4, points: evenPoints(L, Math.max(2, Math.round(L / 3500)), kind === "truss" ? "hoist" : "fixed") };
  });
  select([{ kind: "support", id }]);
  return id;
}

export function insertFixture(symbol: string, attach: Fixture["attach"], pos: Vec2, autoNumber: boolean, autoPatch = false): Id {
  let id = "";
  exec("Poser un projecteur", (d) => { const f = makeFixture(d, symbol, attach, pos, autoNumber, autoPatch); id = f.id; d.fixtures[f.id] = f; });
  select([{ kind: "fixture", id }]);
  return id;
}

// Série répartie : n appareils à intervalles égaux, avec une demi-travée de marge à chaque bout.
export function insertDistributed(symbol: string, supportId: Id, n: number, autoNumber: boolean, autoPatch = false): Id[] {
  const ids: Id[] = [];
  exec(`Poser ${n} projecteurs`, (d) => {
    const s = d.supports[supportId];
    if (!s) return;
    const L = supportLength(s);
    for (let i = 0; i < n; i++) {
      const f = makeFixture(d, symbol, { supportId, alongMm: Math.round((L * (i + 0.5)) / n) }, pointOnSupport(s, 0), autoNumber, autoPatch);
      d.fixtures[f.id] = f; ids.push(f.id);
    }
  });
  select(ids.map((id) => ({ kind: "fixture" as const, id })));
  return ids;
}

export function setFixtureFields(ids: Id[], fields: Partial<Fixture>, label = "Modifier", group?: string) {
  exec(label, (d) => { for (const id of ids) if (d.fixtures[id]) Object.assign(d.fixtures[id], fields); }, group);
}
export function setSupportFields(id: Id, fields: Partial<Support>, group?: string) {
  exec("Modifier la perche", (d) => { if (d.supports[id]) Object.assign(d.supports[id], fields); }, group);
}
export function setMode(ids: Id[], modeName: string) {
  exec("Changer le mode DMX", (d) => { for (const id of ids) { const f = d.fixtures[id]; if (f && symbolOf(f.symbol).modes.some((m) => m.name === modeName)) f.modeName = modeName; } });
}

export function moveFixture(id: Id, attach: Fixture["attach"], pos: Vec2, group: string) {
  exec("Déplacer", (d) => {
    const f = d.fixtures[id];
    if (!f) return;
    if (!attach && f.attach) f.zMm = d.supports[f.attach.supportId]?.zMm ?? f.zMm;
    f.attach = attach; f.pos = pos;
  }, group);
}
export function moveSupport(id: Id, delta: Vec2, group: string) {
  exec("Déplacer la perche", (d) => { const s = d.supports[id]; if (!s) return; s.a = { x: s.a.x + delta.x, y: s.a.y + delta.y }; s.b = { x: s.b.x + delta.x, y: s.b.y + delta.y }; }, group);
}

// Supprimer une perche détache ses projecteurs au lieu de les effacer.
export function deleteSelection(sel: Selection) {
  if (!sel.length) return;
  exec("Supprimer", (d) => {
    for (const s of sel) {
      if (s.kind === "fixture") delete d.fixtures[s.id];
      else if (s.kind === "support") {
        const sup = d.supports[s.id];
        if (!sup) continue;
        for (const f of Object.values(d.fixtures)) if (f.attach?.supportId === s.id) { f.pos = pointOnSupport(sup, f.attach.alongMm); f.zMm = sup.zMm; f.attach = null; }
        delete d.supports[s.id];
      } else if (s.kind === "object") {
        for (const f of Object.values(d.fixtures)) if (f.targetId === s.id) f.targetId = null;
        delete d.objects[s.id];
      } else if (s.kind === "backdrop") d.backdrop = null;
    }
  });
  select([]);
}

export function duplicateFixtures(ids: Id[]) {
  const out: Id[] = [];
  exec("Dupliquer", (d) => {
    for (const id of ids) {
      const f = d.fixtures[id];
      if (!f) continue;
      const s = f.attach ? d.supports[f.attach.supportId] : null;
      const np = f.universe != null && f.address != null ? nextPatch(d, footprintOf(f.symbol, f.modeName)) : null; // un original patché donne une copie patchée à la suite
      const copy: Fixture = { ...f, id: uid(), universe: np?.universe ?? null, address: np?.address ?? null, unitNumber: "", channel: nextNumber(Object.values(d.fixtures).map((x) => x.channel)) };
      if (s && f.attach) copy.attach = { supportId: s.id, alongMm: Math.min(supportLength(s), f.attach.alongMm + 500) };
      else copy.pos = { x: f.pos.x + 500, y: f.pos.y };
      d.fixtures[copy.id] = copy; out.push(copy.id);
    }
  });
  select(out.map((id) => ({ kind: "fixture" as const, id })));
}

// Numérotation dans l'ordre de lecture : du lointain vers la face, de jardin à cour.
export function renumber(startChannel: number) {
  exec("Renuméroter", (d) => {
    let ch = startChannel;
    for (const s of [...sortedSupports(d), null]) {
      let unit = 1;
      for (const f of fixturesOn(d, s ? s.id : null)) { d.fixtures[f.id].unitNumber = String(unit++); d.fixtures[f.id].channel = String(ch++); }
    }
  });
}

// Patch à la suite, dans l'ordre des canaux. Passe à l'univers suivant quand l'appareil ne tient plus.
export function autoPatch(ids: Id[], universe: number, start: number): { patched: number; skipped: number } {
  let patched = 0, skipped = 0;
  exec("Patcher à la suite", (d) => {
    const list = ids.map((id) => d.fixtures[id]).filter(Boolean).sort((a, b) => (parseInt(a.channel, 10) || 1e9) - (parseInt(b.channel, 10) || 1e9));
    let u = universe, a = start;
    for (const f of list) {
      const n = footprintOf(f.symbol, f.modeName);
      if (n <= 0) { skipped++; continue; }
      if (a + n - 1 > 512) { u++; a = 1; }
      f.universe = u; f.address = a; a += n; patched++;
    }
  });
  return { patched, skipped };
}
export function patchToFirstFree(id: Id) {
  const d = getState().doc, f = d.fixtures[id];
  if (!f) return;
  const u = f.universe ?? 1;
  const a = firstFree(d, u, footprintOf(f.symbol, f.modeName), id);
  if (a != null) setFixtureFields([id], { universe: u, address: a }, "Déplacer à la première adresse libre");
}
export function unpatch(ids: Id[]) { setFixtureFields(ids, { universe: null, address: null }, "Dépatcher"); }

export function setBackdrop(b: Backdrop | null) { exec(b ? "Importer un fond de plan" : "Retirer le fond de plan", (d) => { d.backdrop = b; }); }
export function toggleBackdropLayer(name: string) { exec("Afficher ou masquer un calque du dessin", (d) => { const b = d.backdrop; if (!b) return; const h = new Set(b.hiddenLayers ?? []); if (h.has(name)) h.delete(name); else h.add(name); b.hiddenLayers = [...h]; }); }
export function toggleWallLayer(name: string) { exec("Élever ou coucher un calque en murs", (d) => { const b = d.backdrop; if (!b) return; const h = new Set(b.wallLayers ?? []); if (h.has(name)) h.delete(name); else h.add(name); b.wallLayers = [...h]; }); }
export function setWallHeight(mm: number) { exec("Hauteur des murs du plan", (d) => { if (d.backdrop && Number.isFinite(mm)) d.backdrop.wallHMm = Math.min(40000, Math.max(200, Math.round(mm))); }, "wall-h"); }
export function setBackdropLayers(hidden: string[]) { exec("Calques du dessin", (d) => { if (d.backdrop) d.backdrop.hiddenLayers = hidden; }); }
export function setBackdropOpacity(o: number) { exec("Opacité du fond", (d) => { if (d.backdrop) d.backdrop.opacity = o; }, "bd-opacity"); }

// Calage : deux points désignés sur le fond et la distance réelle qui les sépare. Le premier point reste en place.
export function calibrate(a: Vec2, b: Vec2, realMm: number) {
  exec("Caler l'échelle du fond", (d) => {
    const bd = d.backdrop;
    if (!bd) return;
    const k = realMm / (dist(a, b) || 1);
    bd.origin = { x: a.x + (bd.origin.x - a.x) * k, y: a.y + (bd.origin.y - a.y) * k };
    bd.mmPerPx *= k; bd.calibrated = true;
  });
}
// Origine : le point désigné devient le nez de scène dans l'axe (0 ; 0). Tout ce qui est déjà posé suit le fond.
export function setOrigin(p: Vec2) {
  exec("Placer l'origine", (d) => {
    if (d.backdrop) d.backdrop.origin = { x: d.backdrop.origin.x - p.x, y: d.backdrop.origin.y - p.y };
    for (const s of Object.values(d.supports)) { s.a = { x: s.a.x - p.x, y: s.a.y - p.y }; s.b = { x: s.b.x - p.x, y: s.b.y - p.y }; }
    for (const f of Object.values(d.fixtures)) f.pos = { x: f.pos.x - p.x, y: f.pos.y - p.y };
    for (const o of Object.values(d.objects)) o.pos = { x: o.pos.x - p.x, y: o.pos.y - p.y };
  });
}
export function setInfo(fields: Partial<Doc["info"]>) { exec("Modifier le cartouche", (d) => { Object.assign(d.info, fields); }, "info"); }
export function setSettings(fields: Partial<Doc["settings"]>) { exec("Modifier la mise en page", (d) => { Object.assign(d.settings, fields); }); }
export function toggleLayer(k: keyof Doc["layers"]) { exec("Afficher ou masquer un calque", (d) => { d.layers[k] = !d.layers[k]; }); }


// Appareils venus d'un MVR : posés à leur place ; un appareil qui tombe sur une perche à la bonne hauteur s'y accroche.
export function importFixtures(list: import("./mvr").MvrFixture[]): { added: number; attached: number } {
  const ids: Id[] = []; let attached = 0;
  exec(`Importer ${list.length} appareils`, (d) => {
    for (const m of list) {
      const s = symbolOf(m.symbol); if (s.source === "gdtf" && !d.library[s.key]) d.library[s.key] = s;
      let attach: Fixture["attach"] = null, best = 260;
      for (const sp of Object.values(d.supports)) { const L = supportLength(sp) || 1, t = ((m.pos.x - sp.a.x) * (sp.b.x - sp.a.x) + (m.pos.y - sp.a.y) * (sp.b.y - sp.a.y)) / (L * L), q = pointOnSupport(sp, Math.max(0, Math.min(1, t)) * L), dd = dist(q, m.pos); if (dd < best && Math.abs(sp.zMm - m.zMm) < 700) { best = dd; attach = { supportId: sp.id, alongMm: Math.round(Math.max(0, Math.min(1, t)) * L) }; } }
      if (attach) attached++;
      const id = uid(); ids.push(id);
      d.fixtures[id] = { id, symbol: m.symbol, attach, pos: m.pos, zMm: m.zMm, rotDeg: m.rotDeg, unitNumber: m.unit, channel: m.channel, universe: m.universe, address: m.address, modeName: m.mode, purpose: "", color: "", group: "", panDeg: 0, tiltDeg: 0, weightKg: s.weightKg, powerW: s.powerW, notes: "" };
    }
  });
  select(ids.map((id) => ({ kind: "fixture" as const, id })));
  return { added: ids.length, attached };
}

// ---------- Scène et vidéo ----------
const OBJ: Record<Obj["kind"], { label: string; base: Partial<Obj> }> = {
  deck: { label: "Praticable", base: { wMm: 2000, dMm: 1000, hMm: 400, zMm: 0 } },
  curtain: { label: "Rideau", base: { wMm: 4000, dMm: 120, hMm: 6000, zMm: 0 } },
  screen: { label: "Écran", base: { wMm: 4000, dMm: 60, hMm: 2250, zMm: 1500 } },
  ledwall: { label: "Mur LED", base: { wMm: 4000, dMm: 100, hMm: 2000, zMm: 500, pitchMm: 3.9, kgPerM2: 30, wPerM2: 350 } },
  prop: { label: "Élément de décor", base: { wMm: 500, dMm: 500, hMm: 500, zMm: 0, model: "cube" } },
};
/** Pose un élément de scénographie du catalogue, ou un modèle importé (« glb:<id> »), à ses dimensions d'origine. */
export function addProp(model: string, pos: Vec2, size?: { wMm: number; dMm: number; hMm: number }, label?: string): Id {
  const def = propOf(model, getState().doc.customProps), id = uid(), name = label ?? def?.label ?? "Élément";
  exec(`Poser : ${name.toLowerCase()}`, (d) => {
    const n = Object.values(d.objects).filter((o) => o.kind === "prop" && o.model === model).length + 1;
    d.objects[id] = { id, kind: "prop", model, name: `${name} ${n}`, pos, rotDeg: 0, wMm: size?.wMm ?? def?.w ?? 500, dMm: size?.dMm ?? def?.d ?? 500, hMm: size?.hMm ?? def?.h ?? 500, zMm: def?.z ?? 0, pitchMm: 0, kgPerM2: 0, wPerM2: 0 };
  });
  return id;
}
/** Crée ou remplace un modèle personnel. Les objets déjà posés avec ce modèle suivent ; leurs dimensions sont remises à celles du modèle si elles n'avaient pas été retouchées. */
export function saveCustomProp(def: Omit<CustomProp, "id"> & { id?: Id }, label = "Modèle personnel", group?: string): Id {
  const id = def.id ?? uid();
  exec(label, (d) => { const old = (d.customProps ??= {})[id]; d.customProps[id] = { ...def, id };
    for (const o of Object.values(d.objects)) if (o.kind === "prop" && o.model === "perso:" + id && (!old || (o.wMm === old.w && o.dMm === old.d && o.hMm === old.h))) {
      /* la boîte du modèle a pu grandir d'un seul côté : l'objet posé se décale d'autant, pour que ses pièces ne bougent pas sur le plateau */
      if (old) { const sh = rotate({ x: (def.cx ?? 0) - (old.cx ?? 0), y: (def.cy ?? 0) - (old.cy ?? 0) }, o.rotDeg); o.pos = { x: o.pos.x + sh.x, y: o.pos.y + sh.y }; }
      o.wMm = def.w; o.dMm = def.d; o.hMm = def.h; } }, group);
  return id;
}
export function removeCustomProp(id: Id) { exec("Supprimer un modèle personnel", (d) => { if (Object.values(d.objects).some((o) => o.model === "perso:" + id)) return; delete d.customProps?.[id]; }); }
/** Garde un modèle 3D importé dans le projet. */
export function addModel3D(name: string, data: string, bytes: number, source?: string): Id { const id = uid(); exec("Importer un modèle 3D", (d) => { (d.models ??= {})[id] = { id, name, data, bytes, source }; }); return id; }
export const objectLabel = (k: Obj["kind"]) => OBJ[k].label;
export function addObject(kind: Obj["kind"], pos: Vec2): Id {
  const id = uid();
  exec(`Poser : ${OBJ[kind].label.toLowerCase()}`, (d) => {
    const n = Object.values(d.objects).filter((o) => o.kind === kind).length + 1;
    d.objects[id] = { id, kind, name: `${OBJ[kind].label} ${n}`, pos, rotDeg: 0, wMm: 1000, dMm: 100, hMm: 1000, zMm: 0, pitchMm: 0, kgPerM2: 0, wPerM2: 0, ...OBJ[kind].base };
    // un écran tout neuf devient la cible des vidéoprojecteurs qui n'en ont pas
    if (kind === "screen") for (const f of Object.values(d.fixtures)) if (domainOf(symbolOf(f.symbol)) === "video" && !f.targetId) f.targetId = id;
  });
  select([{ kind: "object", id }]);
  return id;
}
// ----- verrouiller, masquer
const flagged = (d: Doc) => [...Object.values(d.fixtures), ...Object.values(d.objects)];
export function setFlag(sel: Selection, flag: "locked" | "hidden", on: boolean) {
  exec(flag === "locked" ? (on ? "Verrouiller" : "Déverrouiller") : on ? "Masquer" : "Afficher", (d) => { for (const s of sel) { const e = s.kind === "fixture" ? d.fixtures[s.id] : s.kind === "object" ? d.objects[s.id] : null; if (e) { if (on) e[flag] = true; else delete e[flag]; } } });
  if (on) select([]);
}
export function clearFlag(flag: "locked" | "hidden") { exec(flag === "locked" ? "Tout déverrouiller" : "Tout afficher", (d) => { for (const e of flagged(d)) delete e[flag]; }); }
export const flagCount = (d: Doc, flag: "locked" | "hidden") => flagged(d).filter((e) => e[flag]).length;
// ----- configurations de salle
export function saveConfig(name?: string, id?: Id): Id {
  const cid = id ?? uid();
  exec(id ? "Mettre à jour la configuration" : "Enregistrer la configuration", (d) => { const n = Object.keys(d.configs ?? {}).length + 1; (d.configs ??= {})[cid] = { id: cid, name: (name ?? d.configs[cid]?.name ?? "Configuration " + n).slice(0, 40), room: structuredClone(JSON.parse(JSON.stringify(d.room))), hidden: flagged(d).filter((e) => e.hidden).map((e) => e.id) }; d.configId = cid; });
  return cid;
}
export function applyConfig(id: Id) {
  exec("Appliquer la configuration", (d) => { const c = d.configs?.[id]; if (!c) return; d.room = JSON.parse(JSON.stringify(c.room)); const h = new Set(c.hidden); for (const e of flagged(d)) { if (h.has(e.id)) e.hidden = true; else delete e.hidden; } d.configId = id; });
  select([]);
}
export function renameConfig(id: Id, name: string) { exec("Renommer la configuration", (d) => { const c = d.configs?.[id]; if (c && name.trim()) c.name = name.trim().slice(0, 40); }); }
export function removeConfig(id: Id) { exec("Supprimer la configuration", (d) => { delete d.configs?.[id]; if (d.configId === id) d.configId = null; }); }
// ----- presse-papiers interne : copier, couper, coller des appareils et des objets
let clip: { fixtures: Fixture[]; objects: Obj[] } = { fixtures: [], objects: [] }, pasted = 0;
export const clipboardCount = () => clip.fixtures.length + clip.objects.length;
export function copySelection(sel: Selection): number { const d = getState().doc; clip = { fixtures: sel.filter((s) => s.kind === "fixture" && d.fixtures[s.id]).map((s) => structuredClone(d.fixtures[s.id])), objects: sel.filter((s) => s.kind === "object" && d.objects[s.id]).map((s) => structuredClone(d.objects[s.id])) }; pasted = 0; return clipboardCount(); }
export function cutSelection(sel: Selection): number { const n = copySelection(sel); if (n) deleteSelection(sel.filter((s) => s.kind !== "support")); pasted = -1; return n; }
/** Colle ce qui a été copié, décalé de 50 cm à chaque collage ; les appareils collés perdent numéro et adresse. */
export function pasteClipboard(): Selection {
  const made: Selection = []; if (!clipboardCount()) return made; pasted++; const off = pasted * 500;
  exec("Coller", (d) => {
    for (const o of clip.objects) { const c: Obj = { ...structuredClone(o), id: uid(), pos: { x: o.pos.x + off, y: o.pos.y - off } }; d.objects[c.id] = c; made.push({ kind: "object", id: c.id }); }
    for (const f of clip.fixtures) { const sup = f.attach ? d.supports[f.attach.supportId] : null, c: Fixture = { ...structuredClone(f), id: uid(), unitNumber: "", channel: "", universe: null, address: null };
      if (sup && f.attach) c.attach = { ...f.attach, alongMm: Math.max(0, Math.min(supportLength(sup), f.attach.alongMm + off)) }; else { c.attach = null; c.pos = { x: f.pos.x + off, y: f.pos.y - off }; }
      d.fixtures[c.id] = c; made.push({ kind: "fixture", id: c.id }); }
  });
  select(made); return made;
}
// ----- menu « Objet » : aligner, répartir, copier en miroir. Concerne les objets de scène et les appareils posés au sol (ceux d'une perche suivent leur perche).
type Free = { get(): Vec2; set(d: Doc, p: Vec2): void };
function freeOf(d: Doc, sel: Selection): Free[] {
  const out: Free[] = [];
  for (const s of sel) { if (s.kind === "object" && d.objects[s.id]) out.push({ get: () => d.objects[s.id].pos, set: (dd, p) => { dd.objects[s.id].pos = p; } }); else if (s.kind === "fixture" && d.fixtures[s.id] && !d.fixtures[s.id].attach) out.push({ get: () => d.fixtures[s.id].pos, set: (dd, p) => { dd.fixtures[s.id].pos = p; } }); }
  return out;
}
export const freeCount = (sel: Selection) => freeOf(getState().doc, sel).length;
/** Aligne sur la moyenne : axe « x » = même position cour-jardin, axe « y » = même profondeur. « zero » : sur l'axe de la salle ou au nez de scène. */
export function alignSelection(sel: Selection, axis: "x" | "y", zero = false) {
  const d0 = getState().doc, list = freeOf(d0, sel); if (list.length < (zero ? 1 : 2)) return; const v = zero ? 0 : Math.round(list.reduce((t, f) => t + f.get()[axis], 0) / list.length / 10) * 10;
  exec(zero ? "Centrer sur l'axe" : "Aligner", (d) => { for (const f of freeOf(d, sel)) f.set(d, { ...f.get(), [axis]: v } as Vec2); });
}
/** Répartit à intervalles égaux entre les deux éléments extrêmes. */
export function distributeSelection(sel: Selection, axis: "x" | "y") {
  const d0 = getState().doc, list = freeOf(d0, sel); if (list.length < 3) return; const order = list.map((f, i) => ({ i, v: f.get()[axis] })).sort((a, b) => a.v - b.v), a = order[0].v, b = order[order.length - 1].v;
  exec("Répartir", (d) => { const l2 = freeOf(d, sel); order.forEach((o, k) => l2[o.i].set(d, { ...l2[o.i].get(), [axis]: Math.round(a + ((b - a) * k) / (order.length - 1)) } as Vec2)); });
}
/** Copie miroir par rapport à l'axe de la salle : jardin devient cour. */
export function mirrorSelection(sel: Selection): Selection {
  const made: Selection = [];
  exec("Copie miroir cour / jardin", (d) => { for (const s of sel) {
    if (s.kind === "object" && d.objects[s.id]) { const o = d.objects[s.id], c: Obj = { ...o, id: uid(), pos: { x: -o.pos.x, y: o.pos.y }, rotDeg: -o.rotDeg }; d.objects[c.id] = c; made.push({ kind: "object", id: c.id }); }
    else if (s.kind === "fixture" && d.fixtures[s.id] && !d.fixtures[s.id].attach) { const f = d.fixtures[s.id], c = { ...f, id: uid(), pos: { x: -f.pos.x, y: f.pos.y }, rotDeg: -f.rotDeg, panDeg: f.panDeg != null ? -f.panDeg : f.panDeg, unitNumber: "", channel: "", universe: null, address: null }; d.fixtures[c.id] = c as typeof f; made.push({ kind: "fixture", id: c.id }); } } });
  if (made.length) select(made); return made;
}
export function selectAll(kinds?: Selection[number]["kind"][]) { const d = getState().doc, all: Selection = [...Object.keys(d.fixtures).map((id) => ({ kind: "fixture" as const, id })), ...Object.keys(d.objects).map((id) => ({ kind: "object" as const, id })), ...Object.keys(d.supports).map((id) => ({ kind: "support" as const, id }))]; select(kinds ? all.filter((s) => kinds.includes(s.kind)) : all); }
/** Sélectionne tout ce qui est du même type que la sélection : même appareil, même genre d'objet. */
export function selectSame(sel: Selection) { const d = getState().doc, syms = new Set(sel.filter((s) => s.kind === "fixture").map((s) => d.fixtures[s.id]?.symbol)), kinds = new Set(sel.filter((s) => s.kind === "object").map((s) => d.objects[s.id]?.kind + "|" + (d.objects[s.id]?.model ?? ""))), sup = sel.some((s) => s.kind === "support");
  select([...Object.values(d.fixtures).filter((f) => syms.has(f.symbol)).map((f) => ({ kind: "fixture" as const, id: f.id })), ...Object.values(d.objects).filter((o) => kinds.has(o.kind + "|" + (o.model ?? ""))).map((o) => ({ kind: "object" as const, id: o.id })), ...(sup ? Object.keys(d.supports).map((id) => ({ kind: "support" as const, id })) : [])]); }
export function setObjectFields(ids: Id[], fields: Partial<Obj>, group?: string) { exec("Modifier", (d) => { for (const id of ids) if (d.objects[id]) Object.assign(d.objects[id], fields); }, group); }
export function moveObject(id: Id, pos: Vec2, group: string) { exec("Déplacer", (d) => { if (d.objects[id]) d.objects[id].pos = pos; }, group); }
export function duplicateObjects(ids: Id[]) {
  const out: Id[] = [];
  exec("Dupliquer", (d) => { for (const id of ids) { const o = d.objects[id]; if (!o) continue; const c: Obj = { ...o, id: uid(), pos: { x: o.pos.x + (o.kind === "deck" ? o.wMm : 500), y: o.pos.y } }; d.objects[c.id] = c; out.push(c.id); } });
  select(out.map((id) => ({ kind: "object" as const, id })));
}

// ---------- Rigging : points d'accroche d'une barre ----------
export function addLoad(supportId: Id) { exec("Ajouter une charge de rigging", (d) => { const s = d.supports[supportId]; if (!s) return; (s.loads ??= []).push({ id: uid(), name: "Charge " + (s.loads.length + 1), alongMm: Math.round(supportLength(s) / 2), kg: null, lengthMm: 0 }); }); }
export function setLoadFields(supportId: Id, loadId: Id, fields: Partial<import("./model").RigLoad>) { exec("Modifier la charge de rigging", (d) => { const l = d.supports[supportId]?.loads?.find((x) => x.id === loadId); if (l) Object.assign(l, fields); }, "load-" + loadId); }
export function removeLoad(supportId: Id, loadId: Id) { exec("Retirer la charge de rigging", (d) => { const s = d.supports[supportId]; if (s?.loads) s.loads = s.loads.filter((x) => x.id !== loadId); }); }
export function addAcc(supportId: Id, kind: import("./model").RigAcc["kind"]) { exec(kind === "arm" ? "Ajouter un bras de déport" : "Ajouter une échelle de projecteur", (d) => { const s = d.supports[supportId]; if (!s) return; const n = (s.accessories ??= []).filter((a) => a.kind === kind).length + 1; s.accessories.push({ id: uid(), kind, name: (kind === "arm" ? "Bras " : "Échelle ") + n, alongMm: Math.round(supportLength(s) / 2), kg: null, lengthMm: kind === "arm" ? 600 : 2000, side: 1 }); }); }
export function setAccFields(supportId: Id, accId: Id, fields: Partial<import("./model").RigAcc>) { exec("Modifier l'accessoire d'accroche", (d) => { const a = d.supports[supportId]?.accessories?.find((x) => x.id === accId); if (!a) return; Object.assign(a, fields); for (const f of Object.values(d.fixtures)) if (f.attach?.accId === accId) f.attach.alongMm = a.alongMm; }, "acc-" + accId); }
export function removeAcc(supportId: Id, accId: Id) { exec("Retirer l'accessoire d'accroche", (d) => { const s = d.supports[supportId]; if (!s?.accessories) return; s.accessories = s.accessories.filter((x) => x.id !== accId); for (const f of Object.values(d.fixtures)) if (f.attach?.accId === accId) { delete f.attach.accId; delete f.attach.dropMm; } }); }
/** Accroche des appareils à un bras ou une échelle de leur barre (accId null : retour sur la barre). */
export function hangOnAcc(ids: Id[], accId: Id | null, dropMm?: number) { exec(accId ? "Accrocher à l'accessoire" : "Raccrocher à la barre", (d) => { for (const id of ids) { const f = d.fixtures[id]; if (!f?.attach) continue; const a = accId ? d.supports[f.attach.supportId]?.accessories?.find((x) => x.id === accId) : null; if (accId && !a) continue; if (a) { f.attach.accId = a.id; f.attach.alongMm = a.alongMm; if (a.kind === "ladder") f.attach.dropMm = Math.max(0, Math.min(a.lengthMm, dropMm ?? f.attach.dropMm ?? a.lengthMm)); else delete f.attach.dropMm; } else { delete f.attach.accId; delete f.attach.dropMm; } } }, "hang"); }
export function saveSection(supportId: Id, name: string) { exec("Enregistrer la fiche de section", (d) => { const s = d.supports[supportId], n = name.trim().slice(0, 40); if (!s || !n) return; d.sections = [...(d.sections ?? []).filter((x) => x.name !== n), { name: n, kgPerM: s.kgPerM, mAdmKgm: s.mAdmKgm ?? null, vAdmKg: s.vAdmKg ?? null }]; }); }
export function applySection(supportIds: Id[], name: string) { exec("Appliquer la fiche de section", (d) => { const sec = d.sections?.find((x) => x.name === name); if (!sec) return; for (const id of supportIds) { const s = d.supports[id]; if (s) { s.kgPerM = sec.kgPerM; s.mAdmKgm = sec.mAdmKgm; s.vAdmKg = sec.vAdmKg; } } }); }
export function removeSection(name: string) { exec("Retirer la fiche de section", (d) => { d.sections = (d.sections ?? []).filter((x) => x.name !== name); }); }
export function addDim(a: Vec2, b: Vec2) { exec("Poser une cote", (d) => { (d.dims ??= []).push({ id: uid(), a: { x: Math.round(a.x), y: Math.round(a.y) }, b: { x: Math.round(b.x), y: Math.round(b.y) }, offsetMm: 600 }); }); }
export function setDimOffset(id: Id, offsetMm: number) { exec("Décaler la cote", (d) => { const x = d.dims?.find((q) => q.id === id); if (x) x.offsetMm = Math.max(-20000, Math.min(20000, Math.round(offsetMm))); }, "dim-" + id); }
export function removeDims(ids: Id[] | null) { exec(ids ? "Retirer la cote" : "Retirer toutes les cotes", (d) => { d.dims = ids ? (d.dims ?? []).filter((q) => !ids.includes(q.id)) : []; }); }
export function addPoint(supportId: Id, alongMm: number, kind: RigPoint["kind"] = "hoist") { exec("Ajouter un point d'accroche", (d) => { const s = d.supports[supportId]; if (s) s.points.push({ id: uid(), alongMm: Math.max(0, Math.min(supportLength(s), alongMm)), capacityKg: null, kind, hoistKg: null, cls: null, secondary: false }); }); }
export function spreadPoints(supportId: Id, n: number) { exec("Répartir les points d'accroche", (d) => { const s = d.supports[supportId]; if (!s) return; const old = s.points[0]; s.points = evenPoints(supportLength(s), n, old?.kind ?? (s.kind === "truss" ? "hoist" : "fixed")).map((p) => ({ ...p, capacityKg: old?.capacityKg ?? null, hoistKg: old?.hoistKg ?? null, cls: old?.cls ?? null, secondary: old?.secondary ?? false })); }); }
export function setPointFields(supportId: Id, pointId: Id, fields: Partial<RigPoint>, group?: string) { exec("Modifier le point d'accroche", (d) => { const p = d.supports[supportId]?.points.find((x) => x.id === pointId); if (p) Object.assign(p, fields); }, group); }
export function removePoint(supportId: Id, pointId: Id) { exec("Retirer le point d'accroche", (d) => { const s = d.supports[supportId]; if (s) s.points = s.points.filter((p) => p.id !== pointId); }); }

/** Construction d'une salle depuis le dossier importé : tout d'un coup, donc un seul Ctrl+Z pour revenir en arrière. */
export interface VenueBuild { backdrop: Backdrop | null; room: Partial<Doc["room"]> | null; venue: string | null; pipes: { name: string; yMm: number; xMm: number; lengthMm: number; zMm: number }[]; replacePipes: boolean }
export function setVenueMemo(facts: NonNullable<Doc["venueFacts"]> | null, notes: string | null) { exec("Noter ce qui est su de la salle", (d) => { if (facts) d.venueFacts = facts.slice(0, 200); if (notes !== null) d.venueNotes = notes.slice(0, 20000); }); }
export function clearSupports() { exec("Retirer les perches vides", (d) => { const used = new Set(Object.values(d.fixtures).map((f) => f.attach?.supportId)); for (const id of Object.keys(d.supports)) if (!used.has(id)) delete d.supports[id]; }); }
export function applyVenue(v: VenueBuild) {
  exec("Construire la salle depuis le dossier", (d) => {
    if (v.backdrop) d.backdrop = v.backdrop;
    if (v.room) Object.assign(d.room, v.room);
    if (v.venue) d.info.venue = v.venue;
    if (v.pipes.length && v.replacePipes) { const used = new Set(Object.values(d.fixtures).map((f) => f.attach?.supportId)); for (const id of Object.keys(d.supports)) if (!used.has(id)) delete d.supports[id]; }
    for (const p of v.pipes) { const id = uid(), L = Math.max(500, p.lengthMm);
      // la charge admissible reste inconnue : elle ne se déduit jamais d'un dessin
      d.supports[id] = { id, kind: "pipe", name: p.name, a: { x: p.xMm - L / 2, y: p.yMm }, b: { x: p.xMm + L / 2, y: p.yMm }, zMm: Math.max(500, p.zMm), houseNo: null, allowableKg: null, kgPerM: 4, points: evenPoints(L, Math.max(2, Math.round(L / 3500)), "fixed") }; }
  });
}
export function setRoom(fields: Partial<Doc["room"]>) { exec("Modifier la salle", (d) => { Object.assign(d.room, fields); }, "room"); }

// ---------- Sécurité ----------
export function setSafety(fields: Partial<Doc["safety"]>) { exec("Modifier les réglages de sécurité", (d) => { Object.assign(d.safety, fields); }, "safety"); }
export function toggleCheck(key: string) { exec("Cocher un contrôle", (d) => { d.safety.checklist[key] = !d.safety.checklist[key]; }); }

export { readingOrder, fixturePos };
