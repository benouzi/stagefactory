// Le créateur de salle : l'IA travaille comme un régisseur devant les plans. Elle regarde les documents, zoome, lit les cotes,
// recoupe plan et coupe, puis construit le projet par des outils. On peut ensuite lui donner d'autres informations pour l'améliorer.
import type { Backdrop, Doc } from "./model";
import * as cmd from "./commands";
import { getState, mergeUndoSince, undoDepth } from "./store";
import { costUsd, digestCad, transformPlan, type VenueFile } from "./venue";
import { projectState, runTool } from "./agent";
import { lighten } from "./history";

const num = { type: "number" }, str = { type: "string" };
const ZONE = { type: "object", description: "Partie à agrandir, en fractions de la page : x0,y0 = coin haut-gauche, x1,y1 = coin bas-droit (0 à 1)", properties: { x0: num, y0: num, x1: num, y1: num } };
export const BUILD_TOOLS = [
  { name: "voir_document", description: "Montre un document en image : une page de PDF, une image, ou le rendu d'un plan de CAO. Sans zone : la page entière. Avec une zone : cette partie agrandie, pour lire les cotes, les règles graduées et les petits textes. À utiliser autant de fois que nécessaire.", input_schema: { type: "object", properties: { fichier: str, page: num, zone: ZONE }, required: ["fichier"] } },
  { name: "lire_texte_pdf", description: "Rend les textes d'une page de PDF avec leur position (fractions de la page, x vers la droite, y vers le bas). Très utile pour les règles graduées et les numéros de perches : la position des étiquettes donne l'échelle exacte. « contient » filtre les textes.", input_schema: { type: "object", properties: { fichier: str, page: num, contient: str, zone: ZONE }, required: ["fichier"] } },
  { name: "caler_plan", description: "Pose une page de PDF ou une image comme fond de plan, à l'échelle. largeurReelleM = largeur réelle représentée par toute la largeur de la page (largeur du papier × échelle ; par ex. une page A1 portrait de 0,594 m au 1:50 = 29,7 m). axeX et zeroY = position, en fractions de la page, de l'axe de la salle et du zéro (nez de scène ou cadre). Le lointain doit être en haut de la page.", input_schema: { type: "object", properties: { fichier: str, page: num, largeurReelleM: num, axeX: num, zeroY: num }, required: ["fichier", "largeurReelleM", "axeX", "zeroY"] } },
  { name: "caler_plan_cao", description: "Pose un plan de CAO (DWG, DXF) comme fond : recadré sur la salle, zéro au nez de scène, lointain en haut, calques de murs élevés en 3D. Coordonnées dans le repère du plan montré par voir_document (mètres).", input_schema: { type: "object", properties: { fichier: str, facteurEchelle: num, zoneSalle: { type: "object", properties: { x0: num, y0: num, x1: num, y1: num } }, nezDeScene: { type: "object", properties: { x: num, y: num } }, directionLointainDeg: num, calquesMurs: { type: "array", items: str }, calquesMasques: { type: "array", items: str }, hauteurMursM: num }, required: ["fichier"] } },
  { name: "regler_salle", description: "Décrit le volume de la salle pour la vue 3D. Toutes les valeurs en mètres. hauteurSceneM = hauteur du plateau au-dessus du sol du premier rang.", input_schema: { type: "object", properties: { plateauLargeurM: num, plateauProfondeurM: num, cadreOuvertureM: num, cadreHauteurM: num, hauteurCageM: num, hauteurSalleM: num, hauteurSceneM: num, salleLargeurM: num, salleProfondeurM: num, gradinDebutM: num, gradinRangs: num, gradinProfondeurRangM: num, gradinHauteurRangM: { type: "number", description: "hauteur du premier rang" }, gradinHauteurDernierRangM: { type: "number", description: "si la pente du gradin augmente vers le fond : hauteur du dernier rang" }, hauteurGrilM: num, passerellesLateralesHauteursM: { type: "array", items: num, description: "hauteur de chaque passerelle latérale de la cage de scène" }, passerelleLargeurM: num, passerelleLointainHauteurM: num, fosseProfondeurM: { type: "number", description: "profondeur de la fosse devant le nez de scène" }, fosseNiveauM: { type: "number", description: "niveau du plancher de fosse par rapport au plateau : 0 au niveau scène, négatif plus bas" } } } },
  { name: "poser_perches", description: "Pose une série de perches parallèles au nez de scène, numérotées à la suite.", input_schema: { type: "object", properties: { prefixe: str, premierNumero: num, nombre: num, yPremiereM: { type: "number", description: "distance de la première au zéro, vers le lointain" }, pasM: num, longueurM: num, hauteurM: num }, required: ["nombre", "yPremiereM", "pasM", "longueurM", "hauteurM"] } },
  { name: "poser_perche", description: "Pose une seule perche, un pont ou une passerelle (pont : true). y négatif = côté public.", input_schema: { type: "object", properties: { nom: str, y: num, x: num, longueurM: num, hauteurM: num, pont: { type: "boolean" } }, required: ["y", "longueurM", "hauteurM"] } },
  { name: "retirer_perches", description: "Retire toutes les perches qui ne portent aucun appareil, pour les reposer autrement.", input_schema: { type: "object", properties: {} } },
  { name: "lire_projet", description: "Rend l'état actuel du projet.", input_schema: { type: "object", properties: {} } },
  { name: "noter_faits", description: "À appeler à la fin : tout ce qui a été retenu, avec la source précise et la confiance, les questions à poser au régisseur, et ce qui manque. Remplace la liste précédente.", input_schema: { type: "object", properties: { nomSalle: str, faits: { type: "array", items: { type: "object", properties: { sujet: str, valeur: str, source: str, confiance: { type: "string", enum: ["lu", "déduit", "supposé"] } }, required: ["sujet", "valeur", "source", "confiance"] } }, questions: { type: "array", items: str } }, required: ["faits"] } },
];
export const SYSTEM = `Tu es le créateur de salle de ScenoFactory, un logiciel de plan de feu. Un régisseur te confie tout ce qu'il sait d'une salle de spectacle : plans, coupes, fiche technique, photos, notes. Tu construis le projet de cette salle, le plus complet et le plus juste possible, puis tu rends compte.
Travaille comme un régisseur devant les plans, pas en une seule lecture :
1. Fais le tour des documents (voir_document, page entière) pour savoir ce que chacun montre : vue en plan, coupe, détail, fiche.
2. Trouve l'échelle et le zéro. Les plans de théâtre portent souvent des règles graduées en centimètres, avec un zéro à l'axe et un zéro au nez de scène ou au cadre : lire_texte_pdf donne la position de leurs étiquettes, d'où l'échelle exacte. Sinon, sers-toi de l'échelle du cartouche et du format de la page, ou d'une cote écrite.
3. Mesure : zoome sur les zones utiles. Largeur et profondeur du plateau, cadre, salle, gradin, position de chaque perche, passerelles. Une coupe peut être dessinée tournée d'un quart de tour : repère où est le haut grâce aux personnages et aux fauteuils.
4. Recoupe : une même cote lue sur le plan et sur la coupe doit concorder. En cas d'écart, garde la plus sûre et signale-le.
5. Construis : caler_plan (le plan de base comme fond, zéro et axe exacts), regler_salle, poser_perches pour les séries régulières, poser_perche pour les passerelles et les cas particuliers.
6. Vérifie avec lire_projet, corrige, puis appelle noter_faits.
Règles :
- Ne pose une perche que si un document la montre. Les séries numérotées se posent d'un coup avec leur pas.
- Sécurité : tu ne remplis jamais une charge admissible. Si une fiche technique en donne, cite-les dans noter_faits ; elles seront saisies à la main.
- Ce que tu ne peux pas établir, ne l'invente pas : prends une valeur d'usage seulement quand le modèle 3D en a besoin, et marque-la « supposé ».
- Quand on te donne ensuite de nouvelles informations, corrige le projet existant sans tout refaire, et mets à jour les faits.
- Réponds en français, brièvement : ce que tu as construit, ce qui est incertain, ce qu'il te faudrait pour faire mieux.`;

// ---------- documents ----------
const pdfs = new Map<VenueFile, Promise<any>>();
async function pdfOf(f: VenueFile) {
  if (!pdfs.has(f)) pdfs.set(f, (async () => { const pdfjs: any = await import("pdfjs-dist/build/pdf.min.mjs"), worker: any = await import("pdfjs-dist/build/pdf.worker.min.mjs"); (globalThis as any).pdfjsWorker = worker; return pdfjs.getDocument({ data: f.bytes!.slice(), isEvalSupported: false }).promise; })());
  return pdfs.get(f)!;
}
type Zone = { x0: number; y0: number; x1: number; y1: number };
const zoneOf = (z: any): Zone => { const c = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d); const a = { x0: c(z?.x0, 0), y0: c(z?.y0, 0), x1: c(z?.x1, 1), y1: c(z?.y1, 1) }; return a.x1 - a.x0 < 0.01 || a.y1 - a.y0 < 0.01 ? { x0: 0, y0: 0, x1: 1, y1: 1 } : a; };
async function renderPdf(f: VenueFile, pageNo: number, z: Zone, long: number, q = 0.8) {
  const pdf = await pdfOf(f), page = await pdf.getPage(Math.max(1, Math.min(pdf.numPages, Math.round(pageNo) || 1))), v1 = page.getViewport({ scale: 1 });
  const zw = (z.x1 - z.x0) * v1.width, zh = (z.y1 - z.y0) * v1.height, scale = Math.min(8, long / Math.max(zw, zh)), vp = page.getViewport({ scale });
  const c = document.createElement("canvas"); c.width = Math.round(zw * scale); c.height = Math.round(zh * scale); const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: g, viewport: vp, transform: [1, 0, 0, 1, -z.x0 * vp.width, -z.y0 * vp.height] }).promise;
  return { canvas: c, data: c.toDataURL("image/jpeg", q).split(",")[1], pages: pdf.numPages as number, wMm: (v1.width / 72) * 25.4, hMm: (v1.height / 72) * 25.4 };
}
async function cropImage(dataUrl: string, z: Zone, long: number) {
  const img = new Image(); img.src = dataUrl; await img.decode(); const sw = (z.x1 - z.x0) * img.width, sh = (z.y1 - z.y0) * img.height, s = Math.min(4, long / Math.max(sw, sh));
  const c = document.createElement("canvas"); c.width = Math.round(sw * s); c.height = Math.round(sh * s); const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, z.x0 * img.width, z.y0 * img.height, sw, sh, 0, 0, c.width, c.height);
  return { data: c.toDataURL("image/jpeg", 0.82).split(",")[1], w: img.width, h: img.height };
}
const image = (data: string) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
const r3 = (x: number) => Math.round(x * 1000) / 1000, mm = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.round(x * 1000) : undefined);

// ---------- outils ----------
type Out = { content: any[]; log: string };
const txt = (o: unknown, log: string): Out => ({ content: [{ type: "text", text: typeof o === "string" ? o : JSON.stringify(o) }], log });
export async function tool(name: string, i: any, files: VenueFile[]): Promise<Out> {
  const find = () => files.find((f) => f.name === i.fichier) ?? files.find((f) => f.name.toLowerCase().includes(String(i.fichier ?? "").toLowerCase().slice(0, 30)) && i.fichier);
  const missing = () => txt({ erreur: `Fichier « ${i.fichier} » introuvable. Fichiers : ${files.filter((f) => f.kind !== "other").map((f) => f.name).join(" | ")}` }, `Fichier introuvable : ${i.fichier}`);
  if (name === "voir_document") {
    const f = find(); if (!f) return missing(); const z = zoneOf(i.zone), part = i.zone ? ` (zone ${r3(z.x0)},${r3(z.y0)} → ${r3(z.x1)},${r3(z.y1)})` : "";
    if (f.kind === "pdf" && f.bytes) { const r = await renderPdf(f, i.page ?? 1, z, 1568); return { content: [image(r.data), { type: "text", text: `« ${f.name} », page ${i.page ?? 1} sur ${r.pages}${part}. Format du papier : ${Math.round(r.wMm)} × ${Math.round(r.hMm)} mm.` }], log: `Regarde ${f.name}${part}` }; }
    if (f.kind === "image" && f.data) { const r = await cropImage("data:" + (f.mime || "image/jpeg") + ";base64," + f.data, z, 1568); return { content: [image(r.data), { type: "text", text: `Image « ${f.name} »${part}.` }], log: `Regarde ${f.name}${part}` }; }
    if (f.kind === "cad" && f.cad?.vector) { const d = digestCad(f.name, f.cad), r = await cropImage("data:image/png;base64," + d.png, z, 1568); return { content: [image(r.data), { type: "text", text: d.text }], log: `Regarde le plan de CAO ${f.name}${part}` }; }
    if (f.kind === "text") return txt(`NOTE « ${f.name} » :\n${(f.text ?? "").slice(0, 30000)}`, `Lit ${f.name}`);
    return txt({ erreur: "Ce fichier n'est pas lisible." }, `Illisible : ${f.name}`);
  }
  if (name === "lire_texte_pdf") {
    const f = find(); if (!f || f.kind !== "pdf" || !f.bytes) return f ? txt({ erreur: "Ce n'est pas un PDF." }, "Pas un PDF") : missing();
    const pdf = await pdfOf(f), page = await pdf.getPage(Math.max(1, Math.min(pdf.numPages, Math.round(i.page ?? 1)))), vp = page.getViewport({ scale: 1 }), tc = await page.getTextContent(), z = zoneOf(i.zone), needle = typeof i.contient === "string" ? i.contient.toLowerCase() : "";
    const all = (tc.items as any[]).filter((t) => t.str && t.str.trim()).map((t) => { const [x, y] = vp.convertToViewportPoint(t.transform[4], t.transform[5]); return { t: t.str.trim().slice(0, 50), x: r3((x + (t.width || 0) / 2) / vp.width), y: r3((y - (t.height || 0) / 2) / vp.height) }; })
      .filter((t) => t.x >= z.x0 && t.x <= z.x1 && t.y >= z.y0 && t.y <= z.y1 && (!needle || t.t.toLowerCase().includes(needle)));
    return txt({ page: i.page ?? 1, papierMm: [Math.round((vp.width / 72) * 25.4), Math.round((vp.height / 72) * 25.4)], textes: all.length, rendus: Math.min(all.length, 500), liste: all.slice(0, 500).map((t) => `${t.t} @ ${t.x},${t.y}`), ...(all.length ? {} : { remarque: "Aucun texte : ce PDF est peut-être une image. Lis-le avec voir_document." }) }, `Lit les textes de ${f.name}${needle ? ` (« ${i.contient} »)` : ""} : ${all.length}`);
  }
  if (name === "caler_plan") {
    const f = find(); if (!f) return missing(); const W = mm(i.largeurReelleM); if (!W || W < 2000 || W > 500000) return txt({ erreur: "largeurReelleM doit être la largeur réelle couverte par toute la page, entre 2 et 500 m." }, "Échelle refusée");
    let dataUrl: string, wPx: number, hPx: number;
    if (f.kind === "pdf" && f.bytes) { const r = await renderPdf(f, i.page ?? 1, { x0: 0, y0: 0, x1: 1, y1: 1 }, 3300, 0.72); dataUrl = "data:image/jpeg;base64," + r.data; wPx = r.canvas.width; hPx = r.canvas.height; }
    else if (f.kind === "image" && f.data) { const r = await cropImage("data:" + (f.mime || "image/jpeg") + ";base64," + f.data, { x0: 0, y0: 0, x1: 1, y1: 1 }, 3300); dataUrl = "data:image/jpeg;base64," + r.data; const im = new Image(); im.src = dataUrl; await im.decode(); wPx = im.width; hPx = im.height; }
    else return txt({ erreur: "caler_plan prend un PDF ou une image. Pour un DWG ou DXF, utilise caler_plan_cao." }, "Mauvais type de fichier");
    const k = W / wPx, ax = Math.max(0, Math.min(1, Number(i.axeX))), zy = Math.max(0, Math.min(1, Number(i.zeroY)));
    const b: Backdrop = { dataUrl, wPx, hPx, mmPerPx: k, origin: { x: Math.round(-ax * wPx * k), y: Math.round(zy * hPx * k) }, calibrated: true, opacity: 0.9, fileName: f.name };
    cmd.applyVenue({ backdrop: b, room: null, venue: null, pipes: [], replacePipes: false });
    return txt({ ok: true, emprise: { deXM: r3(b.origin.x / 1000), aXM: r3((b.origin.x + wPx * k) / 1000), lointainJusquAM: r3(b.origin.y / 1000), publicJusquAM: r3((b.origin.y - hPx * k) / 1000) } }, `Plan calé : ${f.name}, ${r3(W / 1000)} m de large`);
  }
  if (name === "caler_plan_cao") {
    const f = find(); if (!f || f.kind !== "cad" || !f.cad?.vector) return f ? txt({ erreur: "Ce n'est pas un plan de CAO." }, "Pas un plan de CAO") : missing();
    const b = transformPlan(f.cad, i, f.name); cmd.applyVenue({ backdrop: b, room: null, venue: null, pipes: [], replacePipes: false });
    return txt({ ok: true, calquesMurs: b.wallLayers, calquesMasques: b.hiddenLayers, hauteurMursM: (b.wallHMm ?? 0) / 1000 }, `Plan de CAO calé : ${f.name}, ${b.wallLayers?.length ?? 0} calque(s) en murs`);
  }
  if (name === "regler_salle") {
    const lim = (v: unknown, lo: number, hi: number) => { const x = mm(v); return x !== undefined && x >= lo * 1000 && x <= hi * 1000 ? x : undefined; };
    const r: Record<string, number | boolean | undefined> = { enabled: true, stageWMm: lim(i.plateauLargeurM, 2, 100), stageDMm: lim(i.plateauProfondeurM, 1, 80), prosWMm: lim(i.cadreOuvertureM, 2, 60), prosHMm: lim(i.cadreHauteurM, 2, 30), wallHMm: lim(i.hauteurCageM, 2, 50), houseHMm: lim(i.hauteurSalleM, 2, 50), stageRiseMm: lim(i.hauteurSceneM, 0, 4), houseWMm: lim(i.salleLargeurM, 2, 100), houseDMm: lim(i.salleProfondeurM, 2, 100), tierStartMm: lim(i.gradinDebutM, 0, 60), tierDepthMm: lim(i.gradinProfondeurRangM, 0.4, 3), tierRiseMm: lim(i.gradinHauteurRangM, 0, 1.5), tierRiseLastMm: lim(i.gradinHauteurDernierRangM, 0, 1.5), gridHMm: lim(i.hauteurGrilM, 2, 50), galleryWMm: lim(i.passerelleLargeurM, 0.3, 5), backGalleryHMm: lim(i.passerelleLointainHauteurM, 1, 50), pitDMm: lim(i.fosseProfondeurM, 0.3, 15) };
    if (Array.isArray(i.passerellesLateralesHauteursM)) (r as any).galleryHsMm = i.passerellesLateralesHauteursM.map((x: unknown) => mm(x)).filter((x: unknown): x is number => typeof x === "number" && x > 500 && x < 50000).slice(0, 8);
    if (typeof i.fosseNiveauM === "number" && Number.isFinite(i.fosseNiveauM)) (r as any).pitLevelMm = Math.max(-6000, Math.min(0, Math.round(i.fosseNiveauM * 1000)));
    if (typeof i.gradinRangs === "number") r.tierRows = Math.max(0, Math.min(80, Math.round(i.gradinRangs)));
    const clean = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)); cmd.setRoom(clean as Partial<Doc["room"]>);
    return txt({ ok: true, salle: getState().doc.room }, `Volume de la salle réglé (${Object.keys(clean).length - 1} cotes)`);
  }
  if (name === "poser_perches") {
    const n = Math.max(1, Math.min(120, Math.round(Number(i.nombre) || 0))), y0 = mm(i.yPremiereM), step = mm(i.pasM), L = mm(i.longueurM), z = mm(i.hauteurM), first = Math.round(Number(i.premierNumero) || 1), pre = typeof i.prefixe === "string" && i.prefixe.trim() ? i.prefixe.trim().slice(0, 20) : "Perche";
    if (y0 === undefined || step === undefined || !L || !z) return txt({ erreur: "yPremiereM, pasM, longueurM et hauteurM sont nécessaires." }, "Série refusée");
    cmd.applyVenue({ backdrop: null, room: null, venue: null, replacePipes: false, pipes: Array.from({ length: n }, (_, k) => ({ name: `${pre} ${first + k}`, yMm: y0 + k * step, xMm: 0, lengthMm: L, zMm: z })) });
    return txt({ posees: n, de: `${pre} ${first} à ${r3(y0 / 1000)} m`, a: `${pre} ${first + n - 1} à ${r3((y0 + (n - 1) * step) / 1000)} m`, chargeAdmissible: "inconnue : à saisir depuis la fiche technique" }, `${n} perches posées, de ${pre} ${first} à ${pre} ${first + n - 1}`);
  }
  if (name === "retirer_perches") { const before = Object.keys(getState().doc.supports).length; cmd.clearSupports(); return txt({ retirees: before - Object.keys(getState().doc.supports).length }, "Perches vides retirées"); }
  if (name === "noter_faits") {
    const facts = (Array.isArray(i.faits) ? i.faits : []).filter((x: any) => x && x.sujet).map((x: any) => ({ sujet: String(x.sujet).slice(0, 80), valeur: String(x.valeur ?? "").slice(0, 160), source: String(x.source ?? "").slice(0, 160), confiance: ["lu", "déduit", "supposé"].includes(x.confiance) ? x.confiance : "supposé" }));
    cmd.setVenueMemo(facts, null); if (typeof i.nomSalle === "string" && i.nomSalle.trim()) cmd.setInfo({ venue: i.nomSalle.trim().slice(0, 80) }); questions = Array.isArray(i.questions) ? i.questions.map((q: any) => String(q).slice(0, 300)).slice(0, 20) : [];
    return txt({ ok: true, faits: facts.length }, `${facts.length} faits notés avec leur source`);
  }
  const r = runTool(name, i ?? {}); return txt(r.result, r.log); // lire_projet, poser_perche
}

// ---------- la session ----------
export interface BuildSession { messages: any[]; usd: number; rounds: number }
export const newBuild = (): BuildSession => ({ messages: [], usd: 0, rounds: 0 });
let questions: string[] = [];
export const lastQuestions = () => questions;
type Ask = (body: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
const MAX_ROUNDS = 40;
/** Une passe du créateur : première construction, ou amélioration avec de nouvelles informations. Tout s'annule d'un seul Ctrl+Z. */
export async function runBuild(s: BuildSession, files: VenueFile[], notes: string, model: string, ask: Ask, onAction: (line: string) => void): Promise<{ text: string; actions: string[] }> {
  const depth = undoDepth(), actions: string[] = [], said: string[] = [], first = s.messages.length === 0, usable = files.filter((f) => f.kind !== "other");
  const list = usable.map((f) => `- ${f.name} (${f.kind === "cad" ? "plan de CAO" : f.kind === "pdf" ? "PDF" : f.kind === "image" ? "image" : "note"}${f.note ? ", " + f.note : ""})`).join("\n");
  s.messages.push({ role: "user", content: [{ type: "text", text: `${first ? "Voici le dossier de la salle." : "Nouvelles informations pour améliorer le projet."}\nDOCUMENTS DISPONIBLES :\n${list || "(aucun)"}\n\nÉTAT DU PROJET :\n${JSON.stringify(projectState(getState().doc))}\n\n${notes.trim() ? "CE QUE LE RÉGISSEUR PRÉCISE :\n" + notes.trim() : first ? "Construis le projet." : "Reprends le projet et améliore-le."}` }] });
  if (notes.trim()) cmd.setVenueMemo(null, [getState().doc.venueNotes, notes.trim()].filter(Boolean).join("\n\n"));
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const r = await ask({ model, max_tokens: 16000, system: SYSTEM, tools: BUILD_TOOLS, messages: s.messages });
      if (!r.ok) throw new Error(r.error || "L'IA n'a pas répondu.");
      const content: any[] = Array.isArray(r.data?.content) ? r.data.content : []; s.usd += costUsd(model, r.data?.usage).usd; s.rounds++; s.messages.push({ role: "assistant", content });
      for (const b of content) if (b.type === "text" && b.text.trim()) said.push(b.text.trim());
      const calls = content.filter((b) => b.type === "tool_use"); if (!calls.length) break;
      const results: any[] = [];
      for (const c of calls) { let out: Out; try { out = await tool(c.name, c.input ?? {}, files); } catch (e: any) { out = txt({ erreur: e?.message || "Échec de l'outil." }, `Échec : ${c.name}`); } actions.push(out.log); onAction(out.log); results.push({ type: "tool_result", tool_use_id: c.id, content: out.content }); }
      s.messages.push({ role: "user", content: results }); lighten(s.messages);
      if (round === MAX_ROUNDS - 1) said.push("Je m'arrête ici : la lecture a pris beaucoup d'étapes. Donne-moi une consigne pour continuer.");
    }
  } finally { if (undoDepth() > depth) mergeUndoSince(depth, first ? "Créer la salle depuis le dossier" : "Améliorer la salle"); }
  return { text: said.slice(-3).join("\n\n") || "C'est fait.", actions };
}
