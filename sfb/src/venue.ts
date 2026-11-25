// « Importer les données de la salle » : on résume les plans, on les montre à l'IA avec les autres documents,
// elle propose une lecture de la salle, et rien n'entre dans le projet sans validation.
import type { Backdrop, Doc } from "./model";
import type { VenueBuild } from "./commands";

export interface VenueFile { name: string; kind: "cad" | "pdf" | "image" | "text" | "other"; size: number; cad?: Backdrop; bytes?: Uint8Array; data?: string; mime?: string; text?: string; note?: string }
export const MODELS = [
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5 (rapide, économique)", inUsd: 2, outUsd: 10 },
  { id: "claude-opus-5-5", label: "Opus 5.5 (plus fin sur les plans difficiles)", inUsd: 4, outUsd: 20 },
] as const;
export const LIMITS = { files: 500, pdfBytes: 12e6, totalBytes: 24e6, texts: 250, layers: 60 };

// ---------- le repère montré à l'IA : mètres, x vers la droite, y vers le haut, origine en bas à gauche du dessin ----------
const PALETTE: [string, string][] = [["rouge", "#d62828"], ["bleu", "#1d4ed8"], ["vert", "#15803d"], ["orange", "#ea580c"], ["violet", "#7e22ce"], ["turquoise", "#0e7490"], ["rose", "#db2777"], ["brun", "#78350f"], ["olive", "#4d7c0f"], ["bleu ciel", "#0284c7"], ["magenta", "#a21caf"], ["gris", "#52525b"]];
const frame = (b: Backdrop) => { const k = b.mmPerPx / 1000; return { k, W: b.wPx * k, H: b.hPx * k, X: (vx: number) => vx * k, Y: (vy: number) => (b.hPx - vy) * k }; };

export interface CadDigest { text: string; png: string; layerColors: Record<string, string> }
/** Résumé d'un plan de CAO : une image aux calques colorés avec une grille cotée, et la liste des calques et des textes. */
export function digestCad(name: string, b: Backdrop): CadDigest {
  const v = b.vector!, f = frame(b), n = v.layers.length;
  const stat = v.layers.map((l, i) => ({ l, i, seg: 0, len: 0, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }));
  for (const q of v.polys) { const s = stat[q.l]; if (!s) continue; for (let i = 0; i < q.p.length; i += 2) { const x = f.X(q.p[i]), y = f.Y(q.p[i + 1]); s.x0 = Math.min(s.x0, x); s.x1 = Math.max(s.x1, x); s.y0 = Math.min(s.y0, y); s.y1 = Math.max(s.y1, y); if (i) { s.seg++; s.len += Math.hypot(x - f.X(q.p[i - 2]), y - f.Y(q.p[i - 1])); } } }
  const order = stat.filter((s) => s.seg).sort((a, b) => b.len - a.len), color = new Map<number, [string, string]>(); order.forEach((s, r) => color.set(s.i, PALETTE[r % PALETTE.length]));
  // image
  const long = 1568, sc = long / Math.max(f.W, f.H, 0.001), pad = 46, cw = Math.round(f.W * sc) + pad * 2, ch = Math.round(f.H * sc) + pad * 2;
  const c = document.createElement("canvas"); c.width = cw; c.height = ch; const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, cw, ch);
  const px = (x: number) => pad + x * sc, py = (y: number) => ch - pad - y * sc, span = Math.max(f.W, f.H), step = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((s) => span / s <= 14) ?? 1000;
  g.font = "11px sans-serif"; g.fillStyle = "#666"; g.strokeStyle = "#e3e3e3"; g.lineWidth = 1;
  for (let x = 0; x <= f.W + 1e-6; x += step) { g.beginPath(); g.moveTo(px(x), py(0)); g.lineTo(px(x), py(f.H)); g.stroke(); g.textAlign = "center"; g.fillText(String(x), px(x), ch - pad + 16); g.fillText(String(x), px(x), pad - 8); }
  for (let y = 0; y <= f.H + 1e-6; y += step) { g.beginPath(); g.moveTo(px(0), py(y)); g.lineTo(px(f.W), py(y)); g.stroke(); g.textAlign = "right"; g.fillText(String(y), pad - 6, py(y) + 4); g.textAlign = "left"; g.fillText(String(y), cw - pad + 6, py(y) + 4); }
  g.lineWidth = 1; for (const q of v.polys) { const col = color.get(q.l); if (!col) continue; g.strokeStyle = col[1]; g.beginPath(); for (let i = 0; i < q.p.length; i += 2) { const x = px(f.X(q.p[i])), y = py(f.Y(q.p[i + 1])); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  // texte
  const r1 = (x: number) => Math.round(x * 10) / 10, lines = [`FICHIER « ${name} » — emprise ${r1(f.W)} × ${r1(f.H)} m. Échelle ${b.calibrated ? "donnée par le fichier" : "DEVINÉE (le fichier ne dit pas son unité) : vérifie-la avec une cote connue et donne facteurEchelle"}.`, `Repère : mètres, x vers la droite, y vers le haut, origine en bas à gauche ; la grille de l'image est cotée dans ce repère (pas de ${step} m).`, `Calques (${n}), du plus chargé au moins chargé — nom [couleur sur l'image] traits, longueur cumulée, emprise :`];
  for (const s of order.slice(0, LIMITS.layers)) lines.push(`- ${s.l || "(sans nom)"} [${color.get(s.i)![0]}] ${s.seg} traits, ${Math.round(s.len)} m, de (${r1(s.x0)}, ${r1(s.y0)}) à (${r1(s.x1)}, ${r1(s.y1)})`);
  if (order.length > LIMITS.layers) lines.push(`- … et ${order.length - LIMITS.layers} calques plus légers non listés`);
  const key = /sc[eè]ne|plateau|stage|cadre|proscen|salle|gradin|balcon|parterre|orchestre|fosse|r[eé]gie|gril|perche|porteuse|passerelle|rideau|manteau|axe|niveau|\+\s?\d|\d[.,]\d\d/i;
  const texts = [...v.texts].filter((t) => t.s.trim().length > 1).sort((a, b) => (key.test(b.s) ? 1 : 0) - (key.test(a.s) ? 1 : 0) || b.h - a.h).slice(0, LIMITS.texts);
  if (texts.length) { lines.push(`Textes du dessin (${texts.length} sur ${v.texts.length}) — « texte » @ (x, y) :`); for (const t of texts) lines.push(`- « ${t.s.trim().slice(0, 60)} » @ (${r1(f.X(t.x))}, ${r1(f.Y(t.y))}) [${v.layers[t.l] ?? ""}]`); }
  return { text: lines.join("\n"), png: c.toDataURL("image/png").split(",")[1], layerColors: Object.fromEntries(order.map((s) => [s.l, color.get(s.i)![0]])) };
}

// ---------- la demande ----------
export interface Proposal {
  nomSalle?: string; planDeBase?: string; facteurEchelle?: number;
  zoneSalle?: { x0: number; y0: number; x1: number; y1: number }; nezDeScene?: { x: number; y: number }; directionLointainDeg?: number;
  calquesMurs?: string[]; calquesMasques?: string[]; hauteurMursM?: number;
  salleParametrique?: boolean;
  plateau?: { largeurM?: number; profondeurM?: number; ouvertureCadreM?: number; hauteurCadreM?: number; hauteurSceneM?: number };
  salle?: { largeurM?: number; profondeurM?: number; rangs?: number; profondeurRangM?: number; hauteurRangM?: number; debutGradinM?: number };
  perches?: { nom: string; distanceNezM: number; longueurM: number; hauteurM: number; decalageAxeM?: number }[];
  faits?: { sujet: string; valeur: string; source: string; confiance: "lu" | "déduit" | "supposé" }[];
  questions?: string[]; alertes?: string[];
}
const num = { type: "number" }, str = { type: "string" };
export const TOOL = {
  name: "proposer_salle",
  description: "Rend la lecture de la salle tirée des documents. Toutes les coordonnées sont dans le repère du plan de base (mètres, x à droite, y en haut). N'indique que ce que les documents permettent d'établir ; laisse vide le reste.",
  input_schema: { type: "object", properties: {
    nomSalle: str, planDeBase: { type: "string", description: "Nom exact du fichier de CAO retenu comme plan de base (vue en plan de la salle)" },
    facteurEchelle: { type: "number", description: "1 si l'échelle du plan est juste ; sinon le facteur par lequel multiplier ses mètres pour obtenir les vrais mètres" },
    zoneSalle: { type: "object", description: "Rectangle qui contient la salle de spectacle et sa cage de scène, sans le reste du bâtiment", properties: { x0: num, y0: num, x1: num, y1: num }, required: ["x0", "y0", "x1", "y1"] },
    nezDeScene: { type: "object", description: "Point du nez de scène sur l'axe de la salle", properties: { x: num, y: num }, required: ["x", "y"] },
    directionLointainDeg: { type: "number", description: "Direction du nez de scène vers le lointain (fond de scène), en degrés, 0 = vers +x, 90 = vers +y" },
    calquesMurs: { type: "array", items: str, description: "Noms exacts des calques qui dessinent les murs porteurs et cloisons de la salle" },
    calquesMasques: { type: "array", items: str, description: "Noms exacts des calques à masquer (hachures, mobilier, cotes, réseaux…)" },
    hauteurMursM: num, salleParametrique: { type: "boolean", description: "true seulement si aucun plan de CAO n'est exploitable et que la salle doit être décrite par ses dimensions" },
    plateau: { type: "object", properties: { largeurM: num, profondeurM: num, ouvertureCadreM: num, hauteurCadreM: num, hauteurSceneM: num } },
    salle: { type: "object", properties: { largeurM: num, profondeurM: num, rangs: num, profondeurRangM: num, hauteurRangM: num, debutGradinM: num } },
    perches: { type: "array", items: { type: "object", properties: { nom: str, distanceNezM: { type: "number", description: "distance du nez de scène vers le lointain" }, longueurM: num, hauteurM: num, decalageAxeM: num }, required: ["nom", "distanceNezM", "longueurM", "hauteurM"] } },
    faits: { type: "array", description: "Chaque valeur retenue, avec le document et l'endroit d'où elle vient. Y mettre aussi les charges admissibles lues dans une fiche technique : elles ne sont jamais appliquées automatiquement.", items: { type: "object", properties: { sujet: str, valeur: str, source: str, confiance: { type: "string", enum: ["lu", "déduit", "supposé"] } }, required: ["sujet", "valeur", "source", "confiance"] } },
    questions: { type: "array", items: str, description: "Ce qu'il faut demander au régisseur pour lever un doute" },
    alertes: { type: "array", items: str, description: "Incohérences entre documents, échelle douteuse, document illisible" },
  } },
};
const SYSTEM = `Tu aides un régisseur de spectacle à monter le projet d'une salle dans ScenoFactory, un logiciel de plan de feu, à partir des documents qu'il a déposés : plans de CAO (résumés et rendus en image), PDF, images, notes.
Ta tâche : identifier la salle de spectacle dans ces documents et rendre sa lecture par l'outil proposer_salle. Appelle toujours cet outil, une seule fois.
Règles :
- Le plan de base est une vue en plan (de dessus) du niveau plateau. S'il y a plusieurs fichiers de CAO, choisis celui-là. S'il couvre tout un bâtiment, la zoneSalle isole la grande salle et sa cage de scène.
- Le nez de scène est le bord du plateau côté public, pris sur l'axe de symétrie de la salle. La direction du lointain va du public vers le fond de scène.
- Les calques de murs sont ceux dont les traits, sur l'image, dessinent l'enveloppe et les cloisons. Appuie-toi sur les noms, les couleurs de l'image et les emprises.
- Hauteurs, perches, cadre : seulement si une coupe, une fiche technique ou une note les donne. N'invente aucune perche.
- Sécurité : ne déduis jamais une charge admissible. Si une fiche technique en donne une, cite-la dans les faits avec sa source ; elle sera saisie à la main après vérification.
- Chaque fait porte sa source précise (fichier, page, calque ou texte) et une confiance : « lu » (écrit dans un document), « déduit » (mesuré ou calculé), « supposé » (valeur d'usage, faute de mieux).
- Écris en français, sans jargon inutile.`;

/** Corps de la demande à l'API Messages. */
export function buildRequest(files: VenueFile[], notes: string, model: string) {
  const content: any[] = [], digests: Record<string, CadDigest> = {};
  for (const f of files) {
    if (f.kind === "cad" && f.cad?.vector) { const d = (digests[f.name] = digestCad(f.name, f.cad)); content.push({ type: "text", text: d.text }, { type: "image", source: { type: "base64", media_type: "image/png", data: d.png } }); }
    else if (f.kind === "pdf" && f.data) content.push({ type: "text", text: `DOCUMENT PDF « ${f.name} » :` }, { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } });
    else if (f.kind === "image" && f.data) content.push({ type: "text", text: `IMAGE « ${f.name} » :` }, { type: "image", source: { type: "base64", media_type: f.mime || "image/jpeg", data: f.data } });
    else if (f.kind === "text" && f.text) content.push({ type: "text", text: `NOTE « ${f.name} » :\n${f.text.slice(0, 20000)}` });
  }
  content.push({ type: "text", text: (notes.trim() ? `Ce que le régisseur précise :\n${notes.trim()}\n\n` : "") + "Lis ces documents et appelle proposer_salle." });
  return { body: { model, max_tokens: 16000, system: SYSTEM, tools: [TOOL], tool_choice: { type: "auto" }, messages: [{ role: "user", content }] }, digests };
}
/** La proposition, que l'IA ait répondu par l'outil ou par un bloc JSON dans son texte. */
export function parseProposal(data: any): Proposal {
  const blocks: any[] = Array.isArray(data?.content) ? data.content : [], tool = blocks.find((b) => b.type === "tool_use" && b.name === TOOL.name);
  if (tool?.input && typeof tool.input === "object") return tool.input as Proposal;
  const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n"), m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]) as Proposal; } catch { /* pas du JSON */ } }
  throw new Error(data?.stop_reason === "max_tokens" ? "La réponse de l'IA a été coupée avant la fin. Réessaie avec moins de documents." : "L'IA n'a pas rendu de proposition exploitable. Réessaie, ou précise dans les notes où se trouve la salle.");
}
export function costUsd(model: string, usage: any) {
  const m = MODELS.find((x) => x.id === model) ?? MODELS[0], inp = (usage?.input_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0), out = usage?.output_tokens ?? 0;
  return { input: inp, output: out, usd: (inp * m.inUsd + out * m.outUsd) / 1e6 };
}

// ---------- de la proposition au projet ----------
const fin = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
/** Le plan de base recadré sur la salle, mis à l'échelle, tourné lointain en haut, zéro au nez de scène. */
export function transformPlan(b: Backdrop, p: Proposal, fileName: string): Backdrop {
  const v = b.vector!, f = frame(b), uf = fin(p.facteurEchelle) && p.facteurEchelle > 0.001 && p.facteurEchelle < 1000 ? p.facteurEchelle : 1;
  const z = p.zoneSalle && [p.zoneSalle.x0, p.zoneSalle.y0, p.zoneSalle.x1, p.zoneSalle.y1].every(fin) ? { x0: Math.min(p.zoneSalle.x0, p.zoneSalle.x1) - 1, x1: Math.max(p.zoneSalle.x0, p.zoneSalle.x1) + 1, y0: Math.min(p.zoneSalle.y0, p.zoneSalle.y1) - 1, y1: Math.max(p.zoneSalle.y0, p.zoneSalle.y1) + 1 } : null;
  const o = p.nezDeScene && fin(p.nezDeScene.x) && fin(p.nezDeScene.y) ? p.nezDeScene : z ? { x: (z.x0 + z.x1) / 2, y: (z.y0 + z.y1) / 2 } : { x: f.W / 2, y: f.H / 2 };
  const th = ((90 - (fin(p.directionLointainDeg) ? p.directionLointainDeg : 90)) * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th);
  const T = (vx: number, vy: number): [number, number] => { const dx = (f.X(vx) - o.x) * 1000 * uf, dy = (f.Y(vy) - o.y) * 1000 * uf; return [dx * cs - dy * sn, dx * sn + dy * cs]; };
  const inside = (vx: number, vy: number) => !z || (f.X(vx) >= z.x0 && f.X(vx) <= z.x1 && f.Y(vy) >= z.y0 && f.Y(vy) <= z.y1);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const polys: { l: number; w: number[] }[] = [];
  for (const q of v.polys) { let keep = false; for (let i = 0; i < q.p.length && !keep; i += 2) keep = inside(q.p[i], q.p[i + 1]); if (!keep) continue; const w: number[] = []; for (let i = 0; i < q.p.length; i += 2) { const [x, y] = T(q.p[i], q.p[i + 1]); w.push(x, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } polys.push({ l: q.l, w }); }
  if (!polys.length) throw new Error("La zone proposée par l'IA ne contient aucun trait du plan. Relance la lecture ou précise dans les notes où se trouve la salle.");
  const has = (n: string) => v.layers.includes(n), kk = (b.mmPerPx * uf);
  return { ...b, fileName, origin: { x: Math.round(x0), y: Math.round(y1) }, mmPerPx: 1, wPx: Math.round(x1 - x0), hPx: Math.round(y1 - y0), calibrated: true,
    hiddenLayers: (p.calquesMasques ?? []).filter(has), wallLayers: (p.calquesMurs ?? []).filter(has), wallHMm: fin(p.hauteurMursM) && p.hauteurMursM > 0.2 ? Math.round(p.hauteurMursM * 1000) : b.wallHMm ?? 6000,
    vector: { layers: v.layers, polys: polys.map((q) => ({ l: q.l, p: q.w.map((c, i) => Math.round(i % 2 ? y1 - c : c - x0)) })),
      texts: v.texts.filter((t) => inside(t.x, t.y)).map((t) => { const [x, y] = T(t.x, t.y); return { l: t.l, x: Math.round(x - x0), y: Math.round(y1 - y), h: t.h * kk, r: t.r + th, s: t.s }; }) } };
}
export interface Choices { plan: boolean; walls: boolean; pipes: boolean; room: boolean; replacePipes: boolean }
/** Ce qui sera appliqué au projet, selon ce que le régisseur a coché. */
export function toBuild(p: Proposal, files: VenueFile[], ch: Choices, doc: Doc): VenueBuild {
  const base = files.find((f) => f.kind === "cad" && f.cad?.vector && f.name === p.planDeBase) ?? files.find((f) => f.kind === "cad" && f.cad?.vector);
  let backdrop: Backdrop | null = null;
  if (ch.plan && base?.cad) { backdrop = transformPlan(base.cad, p, base.name); if (!ch.walls) backdrop.wallLayers = []; }
  const m = (x: number | undefined, lo: number, hi: number) => (fin(x) && x >= lo && x <= hi ? Math.round(x * 1000) : undefined), room: Partial<Doc["room"]> = {};
  if (ch.room) {
    if (p.salleParametrique && !backdrop) { const s = p.plateau ?? {}, h = p.salle ?? {}; Object.assign(room, { enabled: true }, Object.fromEntries(Object.entries({ stageWMm: m(s.largeurM, 2, 80), stageDMm: m(s.profondeurM, 1, 60), prosWMm: m(s.ouvertureCadreM, 2, 60), prosHMm: m(s.hauteurCadreM, 2, 30), stageRiseMm: m(s.hauteurSceneM, 0, 3), wallHMm: m(p.hauteurMursM, 2, 40), houseWMm: m(h.largeurM, 2, 80), houseDMm: m(h.profondeurM, 2, 80), tierDepthMm: m(h.profondeurRangM, 0.5, 2), tierRiseMm: m(h.hauteurRangM, 0.05, 1), tierStartMm: m(h.debutGradinM, 0, 40) }).filter(([, x]) => x !== undefined)), fin(h.rangs) ? { tierRows: Math.max(0, Math.min(60, Math.round(h.rangs))) } : {}); }
    else if (backdrop) room.enabled = false; // le plan importé devient la salle
  }
  const pipes = ch.pipes ? (p.perches ?? []).filter((q) => fin(q.distanceNezM) && fin(q.longueurM) && fin(q.hauteurM) && q.longueurM > 0.5 && q.longueurM < 60 && q.hauteurM > 0.5 && q.hauteurM < 40).slice(0, 80).map((q) => ({ name: String(q.nom || "Perche").slice(0, 40), yMm: Math.round(q.distanceNezM * 1000), xMm: Math.round((fin(q.decalageAxeM) ? q.decalageAxeM : 0) * 1000), lengthMm: Math.round(q.longueurM * 1000), zMm: Math.round(q.hauteurM * 1000) })) : [];
  void doc;
  return { backdrop, room: Object.keys(room).length ? room : null, venue: ch.plan || ch.room ? (p.nomSalle || "").slice(0, 80) || null : null, pipes, replacePipes: ch.replacePipes };
}

// ---------- lecture des fichiers déposés ----------
const b64 = (bytes: Uint8Array) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
export async function readVenueFile(file: File, readBackdrop: (f: File) => Promise<Backdrop>): Promise<VenueFile> {
  const name = file.name, ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase(), base = { name, size: file.size };
  try {
    if (["dwg", "dxf", "dxfb"].includes(ext)) { const cad = await readBackdrop(file); return cad.vector ? { ...base, kind: "cad", cad, note: `${cad.vector.polys.length} tracés, ${cad.vector.layers.length} calques` } : { ...base, kind: "other", note: "aucun trait lisible" }; }
    if (ext === "pdf") { const bytes = new Uint8Array(await file.arrayBuffer()); return { ...base, kind: "pdf", bytes, note: "PDF" }; } // lu sur place : l'IA n'en reçoit que les pages qu'elle demande, en image
    if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"].includes(ext)) {
      const bmp = await createImageBitmap(file), s = Math.min(1, 1568 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
      return { ...base, kind: "image", mime: "image/jpeg", data: c.toDataURL("image/jpeg", 0.85).split(",")[1], note: `${c.width} × ${c.height} px` };
    }
    if (["txt", "md", "csv", "json"].includes(ext)) return { ...base, kind: "text", text: await file.text(), note: "texte" };
    return { ...base, kind: "other", note: "format non lu par l'IA : laissé de côté" };
  } catch (e: any) { return { ...base, kind: "other", note: e?.message || "lecture impossible" }; }
}
