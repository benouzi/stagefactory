import { DEFAULT_SPEC, planStructure, structureTotals, type StructureSpec } from "./structures";
// L'assistant de scénographie : il reçoit l'état du projet et des outils, et agit dans le plan par les mêmes commandes que la souris.
import type { Doc, Fixture, Id } from "./model";
import * as cmd from "./commands";
import { getState, mergeUndoSince, undoDepth } from "./store";
import { allSymbols, domainOf, symbolOf } from "./library";
import { fixturePos, fixtureZ, supportLength } from "./geom";
import { fixturesOn, sortedSupports, warnings } from "./queries";
import { power, rig } from "./rigging";
import { costUsd } from "./venue";
import { trimStates } from "./history";
import { PALETTE, PROPS, PROP_GROUPS, TINTS, propOf, type CustomProp, type Part } from "./props";

const m = (mm: number) => Math.round(mm / 10) / 100, mm = (x: unknown, d = 0) => (typeof x === "number" && Number.isFinite(x) ? Math.round(x * 1000) : d);
const num = { type: "number" }, str = { type: "string" };
const SEL = { type: "object", description: "Quels projecteurs : par identifiants, ou par type, perche et groupe (les critères se cumulent)", properties: { ids: { type: "array", items: str }, type: str, perche: str, groupe: str } };
const LOOK = { panDeg: num, tiltDeg: { type: "number", description: "0 = droit vers le bas, 90 = à l'horizontale" }, zoomDeg: num, gobo: { type: "number", description: "0 = sans gobo, 1 = premier de la roue" }, iris: { type: "number", description: "0 fermé à 1 ouvert" }, couleur: str, fonction: str, groupe: str };
export const TOOLS = [
  { name: "lire_projet", description: "Rend l'état actuel du projet : perches, objets, projecteurs, bibliothèque.", input_schema: { type: "object", properties: {} } },
  { name: "poser_projecteurs", description: "Pose des projecteurs, répartis régulièrement sur une perche (ou un seul au sol). Ils sont numérotés et patchés automatiquement.", input_schema: { type: "object", properties: { type: { type: "string", description: "Clé du type dans la bibliothèque" }, perche: { type: "string", description: "Nom ou identifiant de la perche" }, sol: { type: "object", properties: { x: num, y: num } }, nombre: num, debutM: { type: "number", description: "Depuis le bout jardin de la perche" }, finM: num, ...LOOK }, required: ["type", "nombre"] } },
  { name: "modifier_projecteurs", description: "Change l'orientation, le faisceau ou les libellés de projecteurs existants.", input_schema: { type: "object", properties: { selection: SEL, ...LOOK }, required: ["selection"] } },
  { name: "pointer_vers", description: "Oriente des projecteurs vers un point de la scène (calcule pan et tilt).", input_schema: { type: "object", properties: { selection: SEL, x: num, y: num, z: { type: "number", description: "Hauteur du point visé, 0 = plateau" } }, required: ["selection", "x", "y"] } },
  { name: "supprimer_projecteurs", description: "Retire des projecteurs.", input_schema: { type: "object", properties: { selection: SEL }, required: ["selection"] } },
  { name: "enregistrer_configuration", description: "Enregistre l'état actuel de la salle comme une configuration nommée : le volume de la salle (réglé avec regler_salle) et les éléments masqués. Pour une salle à plusieurs configurations (gradin déployé ou replié, frontal, bifrontal, fosse ouverte…), règle la salle pour l'une, enregistre-la, règle pour la suivante, enregistre-la. Le même nom met la configuration à jour.", input_schema: { type: "object", properties: { nom: str }, required: ["nom"] } },
  { name: "appliquer_configuration", description: "Applique une configuration de salle enregistrée, par son nom.", input_schema: { type: "object", properties: { nom: str }, required: ["nom"] } },
  { name: "creer_modele", description: "Crée un modèle 3D sur mesure quand le catalogue n'a pas l'objet voulu, en assemblant des formes simples aux cotes réelles. Chaque pièce : forme, centre (x vers cour, y vers le lointain, z = hauteur du CENTRE de la pièce au-dessus du sol), largeurM (le long de x), profondeurM (le long de y), hauteurM (verticale). La face de l'objet tournée vers le public est du côté des y négatifs. rotationDeg tourne une pièce sur elle-même : [autour de x, autour de y, autour de la verticale]. « cylindre » est debout ; « cylindre_couche » a son axe le long de y ; « rampe » est pleine hauteur côté lointain et descend à zéro côté public. Sois précis : des pièces qui se touchent, des proportions justes, 5 à 40 pièces. Recréer un modèle du même nom le remplace partout où il est posé. Avec « poser », le modèle est aussi posé sur le plateau.", input_schema: { type: "object", properties: { nom: str, couleur: str, pieces: { type: "array", items: { type: "object", properties: { forme: { type: "string", enum: ["boite", "cylindre", "cylindre_couche", "sphere", "cone", "rampe"] }, x: num, y: num, z: num, largeurM: num, profondeurM: num, hauteurM: num, couleur: { type: "string", description: "noir, sombre, gris, blanc, bois, metal, laiton, rouge, vert, verre, tulle, lampe (lumineux), ou #rrggbb ; « $ » = couleur réglable de l'objet" }, rotationDeg: { type: "array", items: num } }, required: ["forme", "x", "y", "z", "largeurM", "profondeurM", "hauteurM"] } }, poser: { type: "object", properties: { x: num, y: num, rotationDeg: num } } }, required: ["nom", "pieces"] } },
  { name: "poser_structure", description: "Pose une structure scénique d'un coup. type : portique (un pont sur deux tours), gril (cadre de quatre ponts sur quatre tours), suspendu (un pont sur moteurs), totems (tours verticales alignées). Les ponts créés portent des appareils et entrent dans le calcul des charges ; leur charge admissible reste inconnue tant que l'utilisateur ne l'a pas saisie.", input_schema: { type: "object", properties: { type: { type: "string", enum: ["portique", "gril", "suspendu", "totems"] }, nom: { type: "string" }, x: { type: "number", description: "centre, mètres (jardin négatif)" }, y: { type: "number", description: "centre, mètres vers le lointain" }, rotationDeg: { type: "number" }, longueurM: { type: "number" }, profondeurM: { type: "number", description: "gril seulement" }, hauteurM: { type: "number" }, sectionCm: { type: "number", enum: [29, 40, 52] }, serie: { type: "string", enum: ["prolyte-h30v", "prolyte-h40v", "prolyte-x30v", "global-f34"], description: "série de pont d'un fabricant : éléments réels, section et poids propre du catalogue" }, nombre: { type: "number", description: "moteurs (suspendu) ou totems" } }, required: ["type", "longueurM", "hauteurM"] } },
  { name: "poser_objet", description: "Pose un élément de scène. genre : praticable (deck), rideau (curtain), écran (screen), mur LED (ledwall), ou élément de scénographie (prop) avec « modele ». Modèles par famille — " + PROP_GROUPS.map((g) => g + " : " + PROPS.filter((p) => p.group === g).map((p) => `${p.key} (${p.label}, ${p.w / 1000}×${p.d / 1000}×${p.h / 1000} m)`).join(", ")).join(" ; ") + ". Sans dimensions, le modèle garde sa taille réelle. rotationDeg 0 = face au public. couleur : " + TINTS.filter(([k]) => k).map(([k]) => k).join(", ") + ", ou #rrggbb. Pense à l'échelle humaine : place « personne » pour montrer les interprètes.", input_schema: { type: "object", properties: { genre: { type: "string", enum: ["deck", "curtain", "screen", "ledwall", "prop"] }, modele: { type: "string", description: "clé du catalogue, ou « perso:… » pour un modèle créé avec creer_modele" }, couleur: str, nom: str, x: num, y: num, largeurM: num, profondeurM: num, hauteurM: num, altitudeM: num, rotationDeg: num }, required: ["genre", "x", "y"] } },
  { name: "supprimer_objets", description: "Retire des éléments de scène.", input_schema: { type: "object", properties: { ids: { type: "array", items: str } }, required: ["ids"] } },
  { name: "poser_perche", description: "Ajoute une perche (ou un pont) parallèle au nez de scène.", input_schema: { type: "object", properties: { nom: str, y: num, x: num, longueurM: num, hauteurM: num, pont: { type: "boolean" } }, required: ["y", "longueurM", "hauteurM"] } },
  { name: "verifier", description: "Contrôle le projet : charges par perche, puissance électrique, avertissements. À appeler après avoir posé du matériel.", input_schema: { type: "object", properties: {} } },
];
export const SYSTEM = `Tu es l'assistant de scénographie de ScenoFactory, un logiciel de plan de feu et de scène. Tu aides un régisseur à concevoir une implantation : lumière, éléments de scène, vidéo, son. Tu agis dans le projet par les outils ; l'état du projet t'est donné à chaque message.
Repère : mètres. x = 0 sur l'axe de la salle, négatif côté jardin, positif côté cour. y = 0 au nez de scène, positif vers le lointain, négatif vers le public. z = hauteur au-dessus du plateau.
Façon de travailler :
- Agis plutôt que de demander, quand la demande est claire. Pour une scénographie complète, annonce ton parti pris en une phrase, puis construis : faces, contres, latéraux, effets, selon ce que la bibliothèque et les perches permettent.
- Une scénographie, ce n'est pas que la lumière : pose aussi le décor et le mobilier (poser_objet, genre « prop »), les tissus (fond noir, pendrillons, frises, cyclo, tulle), les instruments, et une ou deux « personne » pour donner l'échelle. Place les éléments avant d'éclairer, puis pointe les projecteurs vers eux.
- Si le catalogue n'a pas l'objet qu'il faut (un comptoir, un réverbère, une structure particulière), fabrique-le avec creer_modele, aux cotes réelles, puis pose-le. Un décor sur mesure précis vaut mieux qu'un cube.
- N'utilise que les types présents dans la bibliothèque (leur clé) et les perches existantes ; ajoute une perche seulement si on te le demande ou s'il n'y en a aucune.
- Donne une fonction et un groupe à ce que tu poses (« Face », « Contre », « Latéral jardin »…), et oriente les appareils avec pointer_vers.
- Après avoir posé du matériel, appelle verifier et rapporte le résultat tel quel.
Sécurité, sans exception : tu ne dis jamais qu'une perche tient ou qu'une installation est sûre. Une charge admissible « inconnue » reste inconnue : dis qu'elle doit être saisie depuis la fiche technique et vérifiée par une personne compétente. Si verifier signale un dépassement, dis-le en premier et propose d'alléger.
Réponds en français, brièvement : ce que tu as fait, ce qui reste à décider, ce qui est à vérifier.`;

// ---------- état du projet, résumé pour l'IA ----------
const supName = (d: Doc, id?: Id | null) => (id && d.supports[id]?.name) || "sol";
export function projectState(d: Doc) {
  const sup = sortedSupports(d).map((s) => ({ id: s.id, nom: s.name, genre: s.kind === "truss" ? "pont" : "perche", y: m((s.a.y + s.b.y) / 2), deX: m(Math.min(s.a.x, s.b.x)), aX: m(Math.max(s.a.x, s.b.x)), longueurM: m(supportLength(s)), hauteurM: m(s.zMm), appareils: fixturesOn(d, s.id).length, chargeAdmissibleKg: s.allowableKg ?? "inconnue" }));
  const groups = new Map<string, { type: string; perche: string; fonction: string; groupe: string; ids: Id[] }>();
  for (const f of Object.values(d.fixtures)) { const k = [f.symbol, f.attach?.supportId ?? "", f.purpose, f.group].join("|"); const g = groups.get(k) ?? { type: f.symbol, perche: supName(d, f.attach?.supportId), fonction: f.purpose, groupe: f.group, ids: [] }; g.ids.push(f.id); groups.set(k, g); }
  const used = new Set(Object.values(d.fixtures).map((f) => f.symbol));
  const lib = allSymbols().filter((s) => s.source !== "gdtf" || used.has(s.key) || !!d.library[s.key]).slice(0, 80).map((s) => ({ type: s.key, nom: s.name, domaine: domainOf(s) === "light" ? "lumière" : domainOf(s) === "video" ? "vidéo" : "son", lyre: s.moving, kg: s.weightKg, watts: s.powerW, gobos: s.wheel?.length ?? 0 }));
  const b = d.backdrop, r = d.room;
  return { lieu: d.info.venue || null, spectacle: d.info.title || null,
    salle: r.enabled ? { plateauLargeurM: m(r.stageWMm), plateauProfondeurM: m(r.stageDMm), cadreOuvertureM: m(r.prosWMm), cadreHauteurM: m(r.prosHMm) } : b ? { planImporte: b.fileName, deX: m(b.origin.x), aX: m(b.origin.x + b.wPx * b.mmPerPx), deY: m(b.origin.y - b.hPx * b.mmPerPx), aY: m(b.origin.y) } : null,
    perches: sup, configurations: Object.values(d.configs ?? {}).map((c) => ({ nom: c.name, active: d.configId === c.id })), modelesPersonnels: Object.values(d.customProps ?? {}).map((c) => ({ modele: "perso:" + c.id, nom: c.name, largeurM: m(c.w), profondeurM: m(c.d), hauteurM: m(c.h), pieces: c.parts.length })), objets: Object.values(d.objects).map((o) => ({ id: o.id, genre: o.kind, ...(o.kind === "prop" ? { modele: o.model, ...(o.color ? { couleur: o.color } : {}) } : {}), nom: o.name, x: m(o.pos.x), y: m(o.pos.y), largeurM: m(o.wMm), profondeurM: m(o.dMm), hauteurM: m(o.hMm), altitudeM: m(o.zMm), rotationDeg: o.rotDeg })),
    projecteurs: [...groups.values()].map((g) => ({ ...g, nombre: g.ids.length, ids: g.ids.slice(0, 40) })), bibliotheque: lib };
}

// ---------- exécution des outils ----------
type In = Record<string, any>;
const findSupport = (d: Doc, ref?: string) => { if (!ref) return null; const k = String(ref).trim().toLowerCase(); return Object.values(d.supports).find((s) => s.id === ref || s.name.toLowerCase() === k) ?? Object.values(d.supports).find((s) => s.name.toLowerCase().replace(/\s+/g, "") === k.replace(/\s+/g, "")) ?? null; };
function pick(d: Doc, sel: In | undefined): Fixture[] {
  if (!sel || typeof sel !== "object") return []; const sup = sel.perche ? findSupport(d, sel.perche) : null; if (sel.perche && !sup && !/^sol$/i.test(sel.perche)) return [];
  const ids = Array.isArray(sel.ids) ? new Set<string>(sel.ids) : null; if (!ids && !sel.type && !sel.perche && !sel.groupe) return [];
  return Object.values(d.fixtures).filter((f) => (!ids || ids.has(f.id)) && (!sel.type || f.symbol === sel.type) && (!sel.perche || (sup ? f.attach?.supportId === sup.id : !f.attach)) && (!sel.groupe || f.group.toLowerCase() === String(sel.groupe).toLowerCase()));
}
const look = (i: In): Partial<Fixture> => { const o: Partial<Fixture> = {}, n = (x: unknown) => typeof x === "number" && Number.isFinite(x);
  if (n(i.panDeg)) o.panDeg = Math.max(-270, Math.min(270, i.panDeg)); if (n(i.tiltDeg)) o.tiltDeg = Math.max(-135, Math.min(135, i.tiltDeg)); if (n(i.zoomDeg)) o.zoomDeg = Math.max(1, Math.min(80, i.zoomDeg)); if (n(i.gobo)) o.goboSlot = Math.max(0, Math.round(i.gobo)); if (n(i.iris)) o.iris = Math.max(0, Math.min(1, i.iris));
  if (typeof i.couleur === "string") o.color = i.couleur.slice(0, 40); if (typeof i.fonction === "string") o.purpose = i.fonction.slice(0, 60); if (typeof i.groupe === "string") o.group = i.groupe.slice(0, 40); return o; };
/** Pan et tilt pour viser un point, appareil accroché tête en bas, non tourné (convention des modèles génériques). */
export function aim(from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) {
  const vx = to.x - from.x, vy = to.y - from.y, vz = to.z - from.z, h = Math.hypot(vx, vy);
  return { panDeg: h < 1 ? 0 : Math.round((Math.atan2(vx, -vy) * 180) / Math.PI * 10) / 10, tiltDeg: Math.round((Math.atan2(h, -vz) * 180) / Math.PI * 10) / 10 };
}
const FORMES: Record<string, Part[0]> = { boite: "b", cylindre: "c", cylindre_couche: "h", sphere: "s", cone: "k", rampe: "w" };
/** Des pièces décrites en mètres dans le repère du plateau → un modèle du catalogue, ramené à sa boîte englobante. */
export function modelFromPieces(name: string, pieces: any[], color?: string): Omit<CustomProp, "id"> | { erreur: string } {
  const ok = pieces.filter((p) => p && FORMES[p.forme] && [p.x, p.y, p.z, p.largeurM, p.profondeurM, p.hauteurM].every((v) => typeof v === "number" && isFinite(v)) && p.largeurM > 0 && p.profondeurM > 0 && p.hauteurM > 0).slice(0, 120);
  if (!ok.length) return { erreur: "Aucune pièce valable : chaque pièce a besoin d'une forme, d'un centre (x, y, z) et de trois dimensions positives en mètres." };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, top = 0;
  for (const p of ok) { x0 = Math.min(x0, p.x - p.largeurM / 2); x1 = Math.max(x1, p.x + p.largeurM / 2); y0 = Math.min(y0, p.y - p.profondeurM / 2); y1 = Math.max(y1, p.y + p.profondeurM / 2); top = Math.max(top, p.z + p.hauteurM / 2); }
  const W = x1 - x0, D = y1 - y0, H = top, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; if (!(W > 0.005 && D > 0.005 && H > 0.005) || Math.max(W, D, H) > 60) return { erreur: "Dimensions hors limites : le modèle doit mesurer entre 5 mm et 60 m." };
  const r5 = (v: number) => Math.round(v * 1e5) / 1e5, col = (c: unknown) => (typeof c === "string" && (c === "$" || PALETTE[c] || /^#[0-9a-f]{6}$/i.test(c)) ? c : "$");
  const parts = ok.map((p): Part => { const rot = Array.isArray(p.rotationDeg) && p.rotationDeg.some((v: unknown) => typeof v === "number" && v) ? ([Number(p.rotationDeg[0]) || 0, Number(p.rotationDeg[2]) || 0, -(Number(p.rotationDeg[1]) || 0)] as [number, number, number]) : undefined;
    const part: Part = [FORMES[p.forme], r5((p.x - cx) / W), r5(p.z / H), r5(-(p.y - cy) / D), r5(p.largeurM / W), r5(p.hauteurM / H), r5(p.profondeurM / D), col(p.couleur)]; if (rot) part.push(rot); return part; });
  return { name, w: Math.round(W * 1000), d: Math.round(D * 1000), h: Math.round(H * 1000), cx: Math.round(cx * 1000), cy: Math.round(cy * 1000), color: typeof color === "string" && (PALETTE[color] || /^#[0-9a-f]{6}$/i.test(color)) ? color : "gris", parts };
}
const FORME_OF = Object.fromEntries(Object.entries(FORMES).map(([k, v]) => [v, k])) as Record<string, string>;
/** L'inverse de modelFromPieces : les pièces d'un modèle, en mètres, telles que l'atelier et l'IA les manipulent. */
export function piecesFromModel(def: { w: number; d: number; h: number; parts: Part[]; cx?: number; cy?: number }) {
  const W = def.w / 1000, D = def.d / 1000, H = def.h / 1000, ox = (def.cx ?? 0) / 1000, oy = (def.cy ?? 0) / 1000, r3 = (v: number) => Math.round(v * 1000) / 1000;
  return def.parts.map(([shape, x, y, z, sx, sy, sz, col, rot]) => ({ forme: FORME_OF[shape] ?? "boite", x: r3(x * W + ox), y: r3(-z * D + oy), z: r3(y * H), largeurM: r3(sx * W), profondeurM: r3(sz * D), hauteurM: r3(sy * H), couleur: col, rotationDeg: rot ? [rot[0], -rot[2], rot[1]] : [0, 0, 0] }));
}
export function runTool(name: string, i: In): { result: unknown; log: string } {
  const d = getState().doc;
  if (name === "lire_projet") return { result: projectState(d), log: "Lecture du projet" };
  if (name === "poser_projecteurs") {
    const sym = allSymbols().find((s) => s.key === i.type); if (!sym) return { result: { erreur: `Type « ${i.type} » absent de la bibliothèque. Types disponibles : ${allSymbols().slice(0, 40).map((s) => s.key).join(", ")}` }, log: `Type inconnu : ${i.type}` };
    const n = Math.max(1, Math.min(60, Math.round(Number(i.nombre) || 1))), ids: Id[] = [], sup = findSupport(d, i.perche);
    if (i.perche && !sup) return { result: { erreur: `Perche « ${i.perche} » introuvable. Perches : ${Object.values(d.supports).map((s) => s.name).join(", ") || "aucune"}` }, log: `Perche inconnue : ${i.perche}` };
    if (sup) { const L = supportLength(sup), a = Math.max(0, Math.min(L, mm(i.debutM, Math.min(500, L / 4)))), b = Math.max(a, Math.min(L, mm(i.finM, L - Math.min(500, L / 4)))); for (let k = 0; k < n; k++) ids.push(cmd.insertFixture(sym.key, { supportId: sup.id, alongMm: Math.round((n === 1 ? (a + b) / 2 : a + ((b - a) * k) / (n - 1)) / 10) * 10 }, { x: 0, y: 0 }, true, true)); }
    else { const at = { x: mm(i.sol?.x), y: mm(i.sol?.y) }; for (let k = 0; k < n; k++) ids.push(cmd.insertFixture(sym.key, null, { x: at.x + k * 600, y: at.y }, true, true)); }
    const f = look(i); if (Object.keys(f).length) cmd.setFixtureFields(ids, f, "Régler");
    const now = getState().doc, first = now.fixtures[ids[0]], last = now.fixtures[ids[ids.length - 1]];
    return { result: { poses: n, ids, sur: sup ? sup.name : "sol", patch: first?.universe ? `univers ${first.universe}, adresses ${first.address} à ${(last.address ?? 0) + (symbolOf(last.symbol).modes[0].footprint - 1)}` : "non patché (plus de place)" }, log: `${n} × ${sym.name} sur ${sup ? sup.name : "le sol"}` };
  }
  if (name === "modifier_projecteurs" || name === "pointer_vers" || name === "supprimer_projecteurs") {
    const list = pick(d, i.selection); if (!list.length) return { result: { erreur: "Aucun projecteur ne correspond à cette sélection." }, log: "Sélection vide" };
    if (name === "supprimer_projecteurs") { cmd.deleteSelection(list.map((f) => ({ kind: "fixture" as const, id: f.id }))); return { result: { supprimes: list.length }, log: `${list.length} projecteur${list.length > 1 ? "s" : ""} retiré${list.length > 1 ? "s" : ""}` }; }
    if (name === "modifier_projecteurs") { const f = look(i); if (!Object.keys(f).length) return { result: { erreur: "Rien à modifier." }, log: "Rien à modifier" }; cmd.setFixtureFields(list.map((x) => x.id), f, "Régler"); return { result: { modifies: list.length }, log: `${list.length} projecteur${list.length > 1 ? "s" : ""} réglé${list.length > 1 ? "s" : ""}` }; }
    const to = { x: mm(i.x), y: mm(i.y), z: mm(i.z) }; let fixed = 0, gdtf = 0;
    for (const f of list) { const sym = symbolOf(f.symbol), p = fixturePos(d, f), z = fixtureZ(d, f); if (!sym.moving && domainOf(sym) !== "light") continue; if (sym.source === "gdtf") gdtf++; cmd.setFixtureFields([f.id], aim({ x: p.x, y: p.y, z }, to), "Pointer"); fixed++; }
    return { result: { pointes: fixed, vers: { x: i.x, y: i.y, z: i.z ?? 0 }, ...(gdtf ? { remarque: `${gdtf} appareil(s) à fiche GDTF : le sens du pan dépend de la fiche, à contrôler dans la vue 3D.` } : {}) }, log: `${fixed} projecteur${fixed > 1 ? "s" : ""} pointé${fixed > 1 ? "s" : ""} vers (${i.x} ; ${i.y})` };
  }
  if (name === "enregistrer_configuration" || name === "appliquer_configuration") {
    const nom = String(i.nom ?? "").trim().slice(0, 40), found = Object.values(d.configs ?? {}).find((c) => c.name.toLowerCase() === nom.toLowerCase());
    if (!nom) return { result: { erreur: "Il faut un nom." }, log: "Configuration sans nom" };
    if (name === "appliquer_configuration") { if (!found) return { result: { erreur: `Aucune configuration « ${nom} ».`, configurations: Object.values(d.configs ?? {}).map((c) => c.name) }, log: "Configuration inconnue : " + nom }; cmd.applyConfig(found.id); return { result: { appliquee: found.name }, log: `Configuration appliquée : ${found.name}` }; }
    cmd.saveConfig(nom, found?.id); return { result: { enregistree: nom, miseAJour: !!found, configurations: Object.values(getState().doc.configs ?? {}).map((c) => c.name) }, log: `Configuration ${found ? "mise à jour" : "enregistrée"} : ${nom}` };
  }
  if (name === "creer_modele") {
    const made = modelFromPieces(String(i.nom ?? "Modèle").slice(0, 40), Array.isArray(i.pieces) ? i.pieces : [], typeof i.couleur === "string" ? i.couleur : undefined);
    if ("erreur" in made) return { result: made, log: "Modèle refusé : " + made.erreur };
    const old = Object.values(d.customProps ?? {}).find((c) => c.name.toLowerCase() === made.name.toLowerCase()), id = cmd.saveCustomProp({ ...made, id: old?.id }, (old ? "Remplacer le modèle " : "Créer le modèle ") + made.name);
    let pose: string | undefined; if (i.poser && typeof i.poser === "object") { pose = cmd.addProp("perso:" + id, { x: mm(i.poser.x), y: mm(i.poser.y) }); if (typeof i.poser.rotationDeg === "number") cmd.setObjectFields([pose], { rotDeg: i.poser.rotationDeg }); }
    return { result: { modele: "perso:" + id, nom: made.name, largeurM: m(made.w), profondeurM: m(made.d), hauteurM: m(made.h), pieces: made.parts.length, remplace: !!old, ...(pose ? { objet: pose } : {}), note: "Pour le poser ailleurs : poser_objet avec genre « prop » et modele « perso:" + id + " »." }, log: `Modèle ${old ? "remplacé" : "créé"} : ${made.name} (${made.parts.length} pièces, ${m(made.w)} × ${m(made.d)} × ${m(made.h)} m)` };
  }
  if (name === "poser_structure") {
    if (!["portique", "gril", "suspendu", "totems"].includes(i.type)) return { result: { erreur: "Type de structure inconnu." }, log: "Type de structure inconnu" };
    const spec: StructureSpec = { ...DEFAULT_SPEC, type: i.type, name: typeof i.nom === "string" ? i.nom.slice(0, 40) : undefined, x: mm(i.x ?? 0), y: mm(i.y ?? 3), rotDeg: Number(i.rotationDeg) || 0, lengthMm: Math.max(1000, mm(i.longueurM)), depthMm: Math.max(1000, mm(i.profondeurM ?? 6)), heightMm: Math.max(500, mm(i.hauteurM)), sectionMm: [29, 40, 52].includes(Number(i.sectionCm)) ? Number(i.sectionCm) * 10 : 290, count: Math.max(1, Math.round(Number(i.nombre) || 4)), series: typeof i.serie === "string" ? i.serie : undefined };
    const plan = planStructure(spec), r = cmd.addStructure(plan), t = structureTotals(plan);
    return { result: { ponts: r.supports, totems: r.objects, longueurDePontM: +t.trussM.toFixed(2), poidsPropreKg: Math.round(t.ownKg), chargeAdmissible: "inconnue : à saisir par l'utilisateur d'après le fabricant", notes: plan.notes }, log: `Structure posée : ${i.type} (${r.supports.length} pont(s), ${r.objects.length} totem(s))` };
  }
  if (name === "poser_objet") {
    if (!["deck", "curtain", "screen", "ledwall", "prop"].includes(i.genre)) return { result: { erreur: "Genre inconnu." }, log: "Genre inconnu" };
    if (i.genre === "prop" && !propOf(String(i.modele), d.customProps)) return { result: { erreur: `Modèle « ${i.modele} » absent du catalogue.`, modeles: PROPS.map((p) => p.key) }, log: "Modèle inconnu : " + i.modele };
    const id = i.genre === "prop" ? cmd.addProp(String(i.modele), { x: mm(i.x), y: mm(i.y) }) : cmd.addObject(i.genre, { x: mm(i.x), y: mm(i.y) }), f: Record<string, unknown> = {};
    if (i.genre === "prop" && typeof i.couleur === "string" && (PALETTE[i.couleur] || /^#[0-9a-f]{6}$/i.test(i.couleur))) f.color = i.couleur;
    if (typeof i.nom === "string") f.name = i.nom.slice(0, 40); if (mm(i.largeurM) > 0) f.wMm = Math.min(60000, mm(i.largeurM)); if (mm(i.profondeurM) > 0) f.dMm = Math.min(60000, mm(i.profondeurM)); if (mm(i.hauteurM) > 0) f.hMm = Math.min(30000, mm(i.hauteurM)); if (typeof i.altitudeM === "number") f.zMm = Math.max(0, mm(i.altitudeM)); if (typeof i.rotationDeg === "number") f.rotDeg = i.rotationDeg;
    if (Object.keys(f).length) cmd.setObjectFields([id], f as any); const o = getState().doc.objects[id];
    return { result: { id, nom: o.name, largeurM: m(o.wMm), profondeurM: m(o.dMm), hauteurM: m(o.hMm) }, log: `${o.name} posé en (${i.x} ; ${i.y})` };
  }
  if (name === "supprimer_objets") { const ids = (Array.isArray(i.ids) ? i.ids : []).filter((id: string) => d.objects[id]); if (ids.length) cmd.deleteSelection(ids.map((id: string) => ({ kind: "object" as const, id }))); return { result: { supprimes: ids.length }, log: `${ids.length} élément${ids.length > 1 ? "s" : ""} retiré${ids.length > 1 ? "s" : ""}` }; }
  if (name === "poser_perche") {
    const L = Math.max(500, Math.min(60000, mm(i.longueurM, 10000))), y = mm(i.y), x = mm(i.x), id = cmd.addSupport({ x: x - L / 2, y }, { x: x + L / 2, y }, i.pont ? "truss" : "pipe"), f: Record<string, unknown> = { zMm: Math.max(500, Math.min(40000, mm(i.hauteurM, 7000))) }; if (typeof i.nom === "string" && i.nom.trim()) f.name = i.nom.slice(0, 40);
    cmd.setSupportFields(id, f as any); return { result: { id, nom: getState().doc.supports[id].name, chargeAdmissible: "inconnue : à saisir depuis la fiche technique" }, log: `${getState().doc.supports[id].name} posée à ${i.y} m du nez de scène` };
  }
  if (name === "verifier") {
    const sup = sortedSupports(d).filter((s) => fixturesOn(d, s.id).length).map((s) => { const r = rig(d, s); return { perche: s.name, appareils: r.count, chargeTotaleKg: Math.round(r.totalKg), verdict: r.verdict === "ok" ? "conforme aux données saisies" : r.verdict === "bad" ? "DÉPASSEMENT" : "inconnu : données manquantes", aRegler: r.checks.filter((c) => c.state !== "ok").map((c) => `${c.label} : ${c.detail}`).slice(0, 6) }; });
    const pw = power(d), w = warnings(d);
    return { result: { charges: sup, electricite: { puissanceW: Math.round(pw.totalW), amperesParPhase: Math.round(pw.perPhaseA * 10) / 10, etat: pw.state === "ok" ? "dans l'alimentation saisie" : pw.state === "bad" ? "DÉPASSEMENT" : "inconnu : alimentation non saisie", detail: pw.detail }, avertissements: w.slice(0, 20).map((x) => x.text), rappel: "Ces contrôles reposent sur les données saisies. Une valeur « inconnue » n'est pas une valeur sûre." }, log: "Contrôle des charges et de l'électricité" };
  }
  return { result: { erreur: "Outil inconnu." }, log: "Outil inconnu : " + name };
}

// ---------- la conversation ----------
export interface Turn { role: "user" | "assistant"; text: string; actions?: string[]; error?: boolean }
export interface Session { messages: any[]; usd: number }
export const newSession = (): Session => ({ messages: [], usd: 0 });
type Ask = (body: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
/** Une demande du régisseur : l'IA agit par les outils jusqu'à sa réponse finale. Tout ce qu'elle a fait s'annule en un seul Ctrl+Z. */
export async function send(s: Session, text: string, model: string, ask: Ask, onAction: (line: string) => void): Promise<{ text: string; actions: string[] }> {
  const depth = undoDepth(), actions: string[] = [], said: string[] = [];
  s.messages.push({ role: "user", content: [{ type: "text", text: "ÉTAT DU PROJET :\n" + JSON.stringify(projectState(getState().doc)) }, { type: "text", text }] });
  try {
    for (let round = 0; round < 14; round++) {
      const r = await ask({ model, max_tokens: 16000, system: SYSTEM, tools: TOOLS, messages: s.messages });
      if (!r.ok) throw new Error(r.error || "L'IA n'a pas répondu.");
      const content: any[] = Array.isArray(r.data?.content) ? r.data.content : []; s.usd += costUsd(model, r.data?.usage).usd; s.messages.push({ role: "assistant", content });
      for (const b of content) if (b.type === "text" && b.text.trim()) said.push(b.text.trim());
      const calls = content.filter((b) => b.type === "tool_use"); if (!calls.length) break;
      const results = calls.map((c) => { let out: { result: unknown; log: string }; try { out = runTool(c.name, c.input ?? {}); } catch (e: any) { out = { result: { erreur: e?.message || "Échec de l'outil." }, log: `Échec : ${c.name}` }; } actions.push(out.log); onAction(out.log); return { type: "tool_result", tool_use_id: c.id, content: JSON.stringify(out.result) }; });
      s.messages.push({ role: "user", content: results });
      if (round === 13) said.push("Je m'arrête ici : la demande a pris trop d'étapes. Dis-moi si je dois continuer.");
    }
  } finally { if (undoDepth() > depth) mergeUndoSince(depth, "Assistant : " + text.slice(0, 40)); trimStates(s.messages); }
  return { text: said.join("\n\n") || "C'est fait.", actions };
}
