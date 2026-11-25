import { buildSection } from "./section";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Backdrop, Doc } from "./model";
import { migrate } from "./model";
import { bounds, fixturePos, fixtureZ, fmtM } from "./geom";
import { buildPlan, symbolItems, type Item } from "./plan";
import { allSymbols, footprintOf, symbolOf } from "./library";
import { gdtfFile, keepGdtfFile } from "./store";
import { buildMvr } from "./mvr";
import { power, rig, type CheckState } from "./rigging";
import { PC_ONLY } from "./platform";
import { fixturesOn, loads, readingOrder, sortedSupports } from "./queries";

const MM = 72 / 25.4;
const PAPER = { A3: { w: 420, h: 297 }, A4: { w: 297, h: 210 } };
export const SCALES = [10, 20, 25, 50, 75, 100, 150, 200, 250, 500];
const INK = "#16181d", MUTED = "#5a6170";

const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
// Couleur d'un élément du plan : « #rrggbb », « rgb(r,g,b) » ou « rgba(r,g,b,a) ».
const paint = (c: string): { color: ReturnType<typeof rgb>; opacity: number } => {
  if (c.startsWith("#")) return { color: hex(c), opacity: 1 };
  const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  return { color: rgb((m[0] ?? 0) / 255, (m[1] ?? 0) / 255, (m[2] ?? 0) / 255), opacity: m[3] ?? 1 };
};
// La police standard du PDF ne connaît que le jeu Latin-1 étendu : tout autre caractère est remplacé.
const ansi = (s: string) => s.replace(/−/g, "-").replace(/[‘’]/g, "'").replace(/[^\x20-\x7E -ÿŒœ–—…€]/g, "?");

// Renvoie false si la personne a refusé l'enregistrement. Dans un artefact Claude, une page n'a pas le droit
// de lancer elle-même un téléchargement : le fichier passe par la confirmation de l'hôte.
export async function download(name: string, data: BlobPart, type: string): Promise<boolean> {
  const blob = new Blob([data], { type });
  const claude = (window as any).claude;
  if (typeof claude?.use === "function") {
    const d = await claude.use("downloads").catch(() => null);
    if (!d) throw new Error("L'enregistrement de fichiers n'est pas disponible dans cette vue.");
    try { await d.save({ filename: name, data: blob }); return true; }
    catch (e: any) { if (e?.code === "declined") return false; throw new Error(e?.code === "rate_limited" ? "Une demande d'enregistrement est déjà ouverte." : "Le fichier n'a pas pu être enregistré" + (e?.code ? ` (${e.code}).` : ".")); }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
const slug = (s: string) => (s || "plan-de-feu").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "plan-de-feu";

// ---------- Projet ----------
export const saveProject = (doc: Doc) => download(`${slug(doc.info.title)}.showfactory.json`, JSON.stringify(doc), "application/json");
export async function readProject(file: File): Promise<Doc> {
  let raw: unknown;
  try { raw = JSON.parse(await file.text()); } catch { throw new Error("Ce fichier n'est pas lisible : ce n'est pas un projet de plan de feu."); }
  return migrate(raw);
}

// ---------- Fond de plan ----------
export async function readBackdrop(file: File): Promise<Backdrop> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) {
    const pdfjs: any = await import("pdfjs-dist/build/pdf.min.mjs");
    const worker: any = await import("pdfjs-dist/build/pdf.worker.min.mjs");
    (globalThis as any).pdfjsWorker = worker; // rendu dans la page, sans processus séparé : fonctionne aussi en ouvrant le fichier directement
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const k = Math.min(3, 2600 / Math.max(base.width, base.height));
    const vp = page.getViewport({ scale: k });
    const cv = document.createElement("canvas");
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    // Avant calage : on suppose un plan au 1:100, pour partir d'une taille plausible.
    const mmPerPx = ((base.width / 72) * 25.4 * 100) / cv.width;
    return { dataUrl: cv.toDataURL("image/jpeg", 0.85), wPx: cv.width, hPx: cv.height, origin: { x: (-cv.width * mmPerPx) / 2, y: cv.height * mmPerPx * 0.8 }, mmPerPx, calibrated: false, opacity: 0.6, fileName: file.name + (pdf.numPages > 1 ? ` (page 1 sur ${pdf.numPages})` : "") };
  }
  const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
  // ---------- CAO : le plan arrive en traits, à l'échelle ----------
  if (ext === "dxf" || ext === "dxfb" || ext === "dwg") {
    const { readDxf, drawingToBackdrop } = await import("./cad");
    const desk = (window as any).showFactoryDesktop?.cad as { read(bytes: Uint8Array, kind: string): Promise<any> } | undefined;
    let drawing;
    if (ext === "dwg") {
      if (!desk) throw new Error(`${PC_ONLY} : la lecture des fichiers DWG. Ici, enregistre le dessin en DXF depuis ton logiciel de CAO (« Enregistrer sous », format DXF) et importe ce fichier.`);
      drawing = await desk.read(new Uint8Array(await file.arrayBuffer()), "dwg").catch(ipcError);
    } else {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // un DXF binaire commence par une signature ; le lecteur de la page ne lit que le DXF texte
      const binary = new TextDecoder("latin1").decode(bytes.subarray(0, 18)).startsWith("AutoCAD Binary DXF");
      try { if (binary) throw new Error("DXF binaire"); drawing = await readDxf(new TextDecoder(bytes[0] === 0xef ? "utf-8" : "windows-1252").decode(bytes)); }
      catch (e: any) { if (!desk) throw binary ? new Error(`${PC_ONLY} : la lecture d'un DXF binaire. Ici, enregistre-le en DXF texte (ASCII).`) : e; drawing = await desk.read(bytes, "dxf").catch(ipcError); }
    }
    const r = drawingToBackdrop(drawing, file.name);
    importNotes = [`${r.segments.toLocaleString("fr-CH")} segments, ${r.texts} textes, ${r.layers} calques.`, r.unitNote, ...(r.skipped.length ? [`Éléments non repris : ${r.skipped.slice(0, 6).join(", ")}${r.skipped.length > 6 ? "…" : ""}.`] : []), ...(r.truncated ? ["Dessin très lourd : seule une partie des traits a été gardée."] : [])];
    return r.backdrop;
  }
  // ---------- Images : tout ce que le navigateur sait décoder, plus le TIFF ; ramenées en PNG ou JPEG ----------
  let cv: HTMLCanvasElement;
  if (ext === "tif" || ext === "tiff") {
    const UTIF: any = await import("utif2"), buf = await file.arrayBuffer(), ifds = UTIF.decode(buf); if (!ifds.length) throw new Error("Ce fichier TIFF ne contient aucune image.");
    UTIF.decodeImage(buf, ifds[0]); const rgba = UTIF.toRGBA8(ifds[0]), w = ifds[0].width, h = ifds[0].height;
    const full = document.createElement("canvas"); full.width = w; full.height = h; full.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), w, h), 0, 0);
    const k = Math.min(1, 4000 / Math.max(w, h)); cv = document.createElement("canvas"); cv.width = Math.round(w * k); cv.height = Math.round(h * k); cv.getContext("2d")!.drawImage(full, 0, 0, cv.width, cv.height);
  } else {
    if (!/^image\//.test(file.type) && !/^(png|jpe?g|webp|gif|bmp|svg|avif)$/.test(ext)) throw new Error("Format non pris en charge. Formats lus : PDF, DXF, DWG, PNG, JPEG, WebP, GIF, BMP, TIFF, SVG, AVIF, et MVR pour une scène complète.");
    const url = URL.createObjectURL(ext === "svg" && !file.type ? new Blob([await file.arrayBuffer()], { type: "image/svg+xml" }) : file);
    try {
      const img = await loadImage(url).catch(() => { throw new Error("Cette image n'a pas pu être lue."); });
      let w = img.naturalWidth, h = img.naturalHeight;
      if (ext === "svg") { // un SVG n'a pas toujours de taille : on la prend dans son cadre, et on le dessine en grand pour qu'il reste net
        const vb = (await file.text()).match(/viewBox\s*=\s*["']\s*[-\d.e]+[\s,]+[-\d.e]+[\s,]+([\d.e]+)[\s,]+([\d.e]+)/i); const ar = vb ? Number(vb[1]) / Number(vb[2]) : w && h ? w / h : 1.5; w = ar >= 1 ? 3600 : Math.round(3600 * ar); h = Math.round(w / ar);
      }
      if (!w || !h) throw new Error("Cette image n'a pas de taille lisible.");
      const k = Math.min(1, 4000 / Math.max(w, h)); cv = document.createElement("canvas"); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      const g = cv.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    } finally { URL.revokeObjectURL(url); }
  }
  const mmPerPx = 20000 / cv.width;
  importNotes = [];
  return { dataUrl: cv.toDataURL("image/jpeg", 0.88), wPx: cv.width, hPx: cv.height, origin: { x: -10000, y: cv.height * mmPerPx * 0.8 }, mmPerPx, calibrated: false, opacity: 0.6, fileName: file.name };
}
const ipcError = (e: any): never => { throw new Error(String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, "")); };
// Remarques du dernier import (unité devinée, éléments non repris…), à montrer à l'utilisateur.
export let importNotes: string[] = [];
export const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Image illisible.")); i.src = src; });

// ---------- Tableaux ----------
export interface Row { support: string; unit: string; type: string; channel: string; patch: string; mode: string; footprint: number; purpose: string; color: string; group: string; weightKg: number; powerW: number }
export function scheduleRows(doc: Doc): Row[] {
  return [...sortedSupports(doc).map((s) => ({ name: s.name, id: s.id as string | null })), { name: "Hors perche", id: null }].flatMap((s) =>
    fixturesOn(doc, s.id).map((f) => ({
      support: s.name, unit: f.unitNumber, type: symbolOf(f.symbol).name, channel: f.channel,
      patch: f.universe != null && f.address != null ? `${f.universe}.${String(f.address).padStart(3, "0")}` : "",
      mode: f.modeName, footprint: footprintOf(f.symbol, f.modeName), purpose: f.purpose, color: f.color, group: f.group, weightKg: f.weightKg, powerW: f.powerW,
    })));
}
const COLS: [keyof Row, string][] = [["support", "Position"], ["unit", "N°"], ["type", "Type"], ["channel", "Canal"], ["patch", "Patch"], ["mode", "Mode"], ["footprint", "Canaux"], ["purpose", "Fonction"], ["color", "Couleur"], ["group", "Groupe"], ["weightKg", "Poids (kg)"], ["powerW", "Puissance (W)"]];
export function exportCsv(doc: Doc) {
  const esc = (v: unknown) => { const s = String(v ?? ""); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [COLS.map((c) => c[1]).join(";"), ...scheduleRows(doc).map((r) => COLS.map((c) => esc(r[c[0]])).join(";"))];
  return download(`${slug(doc.info.title)}-liste-projecteurs.csv`, "﻿" + lines.join("\r\n"), "text/csv;charset=utf-8"); // séparateur « ; » et BOM pour Excel en français
}


// ---------- PDF ----------
export function suggestScale(doc: Doc, paper: "A3" | "A4"): number {
  const b = bounds(doc, doc.layers.backdrop);
  if (!b) return 50;
  const area = drawingArea(paper);
  const w = b.max.x - b.min.x + 2400, h = b.max.y - b.min.y + 2400; // marge pour les étiquettes
  return SCALES.find((s) => w / s <= area.w && h / s <= area.h) ?? SCALES[SCALES.length - 1];
}
const drawingArea = (paper: "A3" | "A4") => ({ x: 10, y: 10 + 22, w: PAPER[paper].w - 20, h: PAPER[paper].h - 20 - 22 });

function drawItems(page: PDFPage, items: Item[], font: PDFFont, bold: PDFFont, T: (p: { x: number; y: number }) => { x: number; y: number }, k: number) {
  for (const it of items) {
    if (it.t === "line") { const a = T(it.a), b = T(it.b); page.drawLine({ start: a, end: b, thickness: Math.max(0.2, it.w * k), color: paint(it.color).color, opacity: paint(it.color).opacity, dashArray: it.dash?.map((d) => d * k) }); }
    else if (it.t === "circle") { const c = T(it.c); page.drawCircle({ x: c.x, y: c.y, size: it.r * k, borderWidth: Math.max(0.2, it.w * k), borderColor: paint(it.color).color, borderOpacity: paint(it.color).opacity, color: it.fill ? paint(it.fill).color : undefined, opacity: it.fill ? paint(it.fill).opacity : undefined }); }
    else if (it.t === "poly") {
      const pts = it.pts.map(T);
      // Chemin SVG : son axe vertical pointe vers le bas, d'où l'inversion du signe.
      const d = pts.map((p, i) => `${i ? "L" : "M"}${(p.x - pts[0].x).toFixed(2)} ${(pts[0].y - p.y).toFixed(2)}`).join(" ") + (it.closed ? " Z" : "");
      page.drawSvgPath(d, { x: pts[0].x, y: pts[0].y, borderWidth: Math.max(0.2, it.w * k), borderColor: paint(it.color).color, borderOpacity: paint(it.color).opacity, color: it.fill ? paint(it.fill).color : undefined, opacity: it.fill ? paint(it.fill).opacity : undefined });
    } else {
      const f = it.bold ? bold : font, size = it.size * k, text = ansi(it.text), p = T(it.at); if (size < 1.2) continue; // texte de fond de plan trop petit pour être lu à cette échelle
      const w = f.widthOfTextAtSize(text, size);
      page.drawText(text, { x: it.anchor === "middle" ? p.x - w / 2 : it.anchor === "end" ? p.x - w : p.x, y: p.y, size, font: f, color: hex(it.color) });
    }
  }
}

export async function buildPdf(doc: Doc): Promise<{ bytes: Uint8Array; scale: number; pages: number }> {
  const paper = doc.settings.paper, P = PAPER[paper];
  const scale = doc.settings.scale === "auto" ? suggestScale(doc, paper) : doc.settings.scale;
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.info.title || "Plan de feu"); pdf.setCreator("ScenoFactory");
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([P.w * MM, P.h * MM]);
  const area = drawingArea(paper);
  const b = bounds(doc, doc.layers.backdrop) ?? { min: { x: -5000, y: 0 }, max: { x: 5000, y: 8000 } };
  const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2;
  const k = MM / scale; // points de papier par millimètre réel
  const T = (p: { x: number; y: number }) => ({ x: (area.x + area.w / 2) * MM + (p.x - cx) * k, y: (area.y + area.h / 2) * MM + (p.y - cy) * k });

  if (doc.backdrop && doc.layers.backdrop && !doc.backdrop.vector) {
    const bd = doc.backdrop, bytes = Uint8Array.from(atob(bd.dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
    const img = bd.dataUrl.startsWith("data:image/png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const tl = T(bd.origin), w = bd.wPx * bd.mmPerPx * k, h = bd.hPx * bd.mmPerPx * k;
    page.drawImage(img, { x: tl.x, y: tl.y - h, width: w, height: h, opacity: bd.opacity });
  }
  drawItems(page, buildPlan(doc, { colors: { ink: INK, muted: MUTED, paper: "#ffffff", selection: INK, attach: INK, warn: INK } }), font, bold, T, k);

  // Cadre, cartouche et légende, en millimètres de papier.
  const mm = (x: number, y: number) => ({ x: x * MM, y: y * MM });
  const text = (s: string, x: number, y: number, size: number, f = font, color = INK) => page.drawText(ansi(s), { ...mm(x, y), size, font: f, color: hex(color) });
  page.drawRectangle({ ...mm(10, 10), width: (P.w - 20) * MM, height: (P.h - 20) * MM, borderWidth: 0.8, borderColor: hex(INK) });
  page.drawLine({ start: mm(10, 32), end: mm(P.w - 10, 32), thickness: 0.8, color: hex(INK) });
  text(doc.info.title || "[Titre du spectacle]", 14, 23, 13, bold);
  text(doc.info.venue || "[Lieu]", 14, 15, 9, font, MUTED);
  const tx = P.w - 110;
  page.drawLine({ start: mm(tx, 10), end: mm(tx, 32), thickness: 0.5, color: hex(INK) });
  text("Plan de feu", tx + 4, 24.5, 10, bold);
  text(`Échelle 1:${scale}  ·  ${paper}`, tx + 4, 18.5, 8, font, MUTED);
  text(`${doc.info.author || "[Auteur]"}  ·  ${doc.info.date}`, tx + 4, 13, 8, font, MUTED);
  if (doc.backdrop && doc.layers.backdrop && !doc.backdrop.calibrated) text("Fond de plan non calé : cotes non fiables", tx - 78, 13, 8, bold);

  // Légende : un symbole par type utilisé, avec la quantité.
  const counts = new Map<string, number>();
  for (const f of Object.values(doc.fixtures)) counts.set(f.symbol, (counts.get(f.symbol) ?? 0) + 1);
  let kx = 120;
  for (const s of allSymbols().filter((l) => counts.has(l.key))) {
    if (kx > tx - 60) break;
    const ks = Math.min(0.012, 9 / 1000); // symbole réduit pour tenir dans la bande du cartouche
    drawItems(page, symbolItems(s.plan, { x: 0, y: 0 }, 0, INK, 30, "#ffffff"), font, bold, (p) => ({ x: (kx + 5) * MM + p.x * ks * MM, y: 22 * MM + p.y * ks * MM }), ks * MM);
    text(`${counts.get(s.key)} × ${s.name}`, kx + 12, 20, 7.5);
    kx += 16 + font.widthOfTextAtSize(ansi(`${counts.get(s.key)} × ${s.name}`), 7.5) / MM;
  }

  // Liste des projecteurs, sur les pages suivantes.
  const rows = scheduleRows(doc);
  const cols: [keyof Row, string, number][] = [["support", "Position", 34], ["unit", "N°", 10], ["type", "Type", 44], ["channel", "Canal", 14], ["patch", "Patch", 18], ["mode", "Mode", 30], ["purpose", "Fonction", 46], ["color", "Couleur", 20], ["group", "Groupe", 24], ["weightKg", "kg", 12], ["powerW", "W", 14]];
  if (rows.length) {
    const L = PAPER.A4; let pg: PDFPage | null = null, y = 0;
    const head = () => {
      pg = pdf.addPage([L.w * MM, L.h * MM]); y = L.h - 16;
      pg.drawText(ansi(`Liste des projecteurs — ${doc.info.title || "[Titre du spectacle]"}`), { ...mm(14, y), size: 12, font: bold, color: hex(INK) }); y -= 9;
      let x = 14; for (const c of cols) { pg.drawText(ansi(c[1]), { ...mm(x, y), size: 7.5, font: bold, color: hex(MUTED) }); x += c[2]; }
      pg.drawLine({ start: mm(14, y - 1.5), end: mm(L.w - 14, y - 1.5), thickness: 0.5, color: hex(INK) }); y -= 6;
    };
    head();
    for (const r of rows) {
      if (y < 20) head();
      let x = 14;
      for (const c of cols) {
        let s = ansi(String(r[c[0]] ?? ""));
        while (s.length > 1 && font.widthOfTextAtSize(s, 8) > (c[2] - 2) * MM) s = s.slice(0, -2) + ".";
        pg!.drawText(s, { ...mm(x, y), size: 8, font, color: hex(INK) }); x += c[2];
      }
      y -= 5;
    }
    y -= 4; if (y < 30) head();
    const tw = rows.reduce((t, r) => t + r.weightKg, 0), tp = rows.reduce((t, r) => t + r.powerW, 0);
    pg!.drawText(ansi(`${rows.length} projecteurs  ·  ${tw.toFixed(0)} kg  ·  ${(tp / 1000).toFixed(1).replace(".", ",")} kW`), { ...mm(14, y), size: 9, font: bold, color: hex(INK) }); y -= 7;
    for (const l of loads(doc).filter((x) => x.count)) {
      if (y < 16) head();
      pg!.drawText(ansi(`${l.support.name} : ${l.count} appareils, ${l.weightKg.toFixed(0)} kg sur ${fmtM(Math.hypot(l.support.b.x - l.support.a.x, l.support.b.y - l.support.a.y), 1)} m` + (l.support.allowableKg != null ? `, ${l.support.allowableKg} kg admissibles` : ", charge admissible non renseignée")), { ...mm(14, y), size: 8, font, color: hex(MUTED) }); y -= 4.5;
    }
    pg!.drawText(ansi("Poids indicatifs. Ce récapitulatif ne remplace pas une note de calcul."), { ...mm(14, Math.max(10, y - 3)), size: 7.5, font, color: hex(MUTED) });
  }
  // Deuxième feuille, à la demande : la vue en coupe, à la plus grande échelle normalisée qui tient dans la page.
  if (doc.settings.sectionPage) {
    const sec = buildSection(doc, { ink: INK, muted: MUTED, paper: "#ffffff", accent: MUTED }), sw = sec.max.x - sec.min.x, sh = sec.max.y - sec.min.y;
    const need = Math.max(sw / area.w, sh / (area.h - 12)), sc2 = [...SCALES].sort((x, y) => x - y).find((x) => x >= need) ?? Math.ceil(need / 50) * 50, k2 = MM / sc2, p2 = pdf.addPage([P.w * MM, P.h * MM]);
    const mx = (sec.min.x + sec.max.x) / 2, my = (sec.min.y + sec.max.y) / 2, T2 = (q: { x: number; y: number }) => ({ x: (area.x + area.w / 2) * MM + (q.x - mx) * k2, y: (area.y + (area.h - 12) / 2) * MM + (q.y - my) * k2 });
    drawItems(p2, sec.items, font, bold, T2, k2);
    p2.drawText(`${doc.info.title || "Plan de feu"} — coupe longitudinale dans l'axe — échelle 1:${sc2}`, { x: area.x * MM, y: (area.y + area.h - 6) * MM, size: 11, font: bold });
    p2.drawText("Public à gauche, lointain à droite. Hauteurs au-dessus du plateau. Faisceaux tracés jusqu'au plateau.", { x: area.x * MM, y: (area.y + area.h - 11) * MM, size: 8, font });
  }
  return { bytes: await pdf.save(), scale, pages: pdf.getPageCount() };
}
export async function exportPdf(doc: Doc): Promise<{ scale: number; pages: number; saved: boolean }> {
  const r = await buildPdf(doc);
  const saved = await download(`${slug(doc.info.title)}-plan-de-feu.pdf`, r.bytes as unknown as BlobPart, "application/pdf");
  return { scale: r.scale, pages: r.pages, saved };
}

// ---------- MVR, pour grandMA3 et les autres logiciels qui le lisent ----------
export async function exportMvr(doc: Doc) {
  const r = await buildMvr(doc, gdtfFile);
  const saved = await download(`${slug(doc.info.title)}.mvr`, r.bytes as unknown as BlobPart, "application/zip");
  return { ...r, saved };
}

// ---------- Rapport de sécurité : hypothèses, charges par point, ce qui manque, contrôles sur site ----------
export async function buildSafetyPdf(doc: Doc, siteChecks: [string, string][]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`Rapport de sécurité — ${doc.info.title || "sans titre"}`); pdf.setCreator("ScenoFactory");
  const W = 210 * MM, H = 297 * MM, left = 16 * MM, width = W - 32 * MM; let page = pdf.addPage([W, H]), y = H - 18 * MM;
  const need = (h: number) => { if (y - h < 16 * MM) { page = pdf.addPage([W, H]); y = H - 18 * MM; } };
  const text = (t: string, o: { size?: number; b?: boolean; color?: string; indent?: number; gap?: number } = {}) => {
    const size = o.size ?? 9, f = o.b ? bold : font, x = left + (o.indent ?? 0) * MM, max = width - (o.indent ?? 0) * MM, words = ansi(t).split(" "); let line = "";
    const out = (l: string) => { need(size * 1.4); page.drawText(l, { x, y, size, font: f, color: hex(o.color ?? INK) }); y -= size * 1.4; };
    for (const w of words) { const next = line ? line + " " + w : w; if (f.widthOfTextAtSize(next, size) > max && line) { out(line); line = w; } else line = next; }
    if (line) out(line); y -= o.gap ?? 0;
  };
  const rule = () => { need(4); page.drawLine({ start: { x: left, y }, end: { x: left + width, y }, thickness: 0.4, color: hex(MUTED) }); y -= 4 * MM; };
  const word: Record<CheckState, string> = { ok: "RIEN D'ANORMAL", bad: "À CORRIGER", unknown: "NON VÉRIFIÉ" }, colorOf: Record<CheckState, string> = { ok: "#1c6b3a", bad: "#a12525", unknown: "#8a5a00" };
  const sf = doc.safety, rows = sortedSupports(doc).map((s) => rig(doc, s)).filter((r) => r.count || r.support.kind === "truss"), pw = power(doc);
  const all = [...rows.map((r) => r.verdict), pw.state], nBad = all.filter((x) => x === "bad").length, nUnk = all.filter((x) => x === "unknown").length;

  text("Rapport de sécurité", { size: 18, b: true, gap: 2 });
  text(`${doc.info.title || "Sans titre"}${doc.info.venue ? " — " + doc.info.venue : ""}`, { size: 11 });
  text(`Plan du ${doc.info.date}${doc.info.author ? ", établi par " + doc.info.author : ""}. Rapport édité le ${new Date().toLocaleDateString("fr-CH")} par ScenoFactory.`, { color: MUTED, gap: 4 });
  text(nBad ? `${nBad} point${nBad > 1 ? "s" : ""} à corriger avant d'accrocher.` : nUnk ? `Rien d'anormal dans ce qui est saisi, mais ${nUnk} vérification${nUnk > 1 ? "s" : ""} incomplète${nUnk > 1 ? "s" : ""}.` : "Rien d'anormal dans ce qui est saisi.", { size: 11, b: true, color: nBad ? colorOf.bad : nUnk ? colorOf.unknown : colorOf.ok, gap: 3 });
  text("Ce document est une aide à la préparation. Il ne remplace ni la note de calcul d'un ingénieur, ni les tableaux de charge des fabricants, ni le contrôle sur place par la personne responsable du rigging et par le responsable du lieu.", { color: MUTED, gap: 4 });
  rule();
  text("Hypothèses du calcul", { size: 11, b: true, gap: 1 });
  for (const l of [
    "Chaque barre est une poutre continue posée sur ses points, de raideur uniforme, tous les points à la même hauteur.",
    "Chaque résultat est calculé par deux méthodes indépendantes et contrôlé par l'équilibre ; en cas de désaccord aucun chiffre n'est donné.",
    `Charges : poids saisi de chaque appareil + ${sf.accessoryKg} kg de crochet et d'élingue par appareil ; poids propre de la barre + ${sf.cableKgPerM} kg/m de câblage.`,
    "Trois points ou plus : la charge à retenir est le cas défavorable où un point voisin ne porte plus (ou un point sur deux), pas le calcul idéal.",
    `Moteurs : charge à retenir majorée de ${String(sf.dynFactor).replace(".", ",")} pour la manœuvre. Valeur réglée par l'utilisateur.`,
    "Non pris en compte : hauteur réelle des points, raideur réelle de la barre, brides et élingues de levage, charpente de la salle, vent, charges horizontales.",
    sf.peopleBelow ? "Des personnes passent sous les charges." : "Personne ne passe sous les charges (déclaré par l'utilisateur).",
  ]) text("- " + l, { indent: 2 });
  y -= 3 * MM; rule();
  text("Barres", { size: 11, b: true, gap: 1 });
  if (!rows.length) text("Aucune barre chargée.", { color: MUTED });
  for (const r of rows) {
    need(30 * MM);
    text(`${r.support.name} — ${r.support.kind === "truss" ? "pont" : "perche"} de ${fmtM(r.lengthM * 1000)} m à +${fmtM(r.support.zMm)} m — ${r.error ? "PAS DE CALCUL" : word[r.verdict]}`, { size: 10, b: true, color: r.error ? colorOf.bad : colorOf[r.verdict] });
    text(`Charge totale ${r.totalKg.toFixed(0)} kg : ${r.count} appareil${r.count > 1 ? "s" : ""} ${r.fixturesKg.toFixed(0)} kg, accessoires ${r.accessoriesKg.toFixed(0)} kg, poids propre ${r.selfKg.toFixed(0)} kg, câblage ${r.cableKg.toFixed(0)} kg.`, { indent: 2 });
    if (r.error) { text(r.error, { indent: 2, color: colorOf.bad, gap: 3 }); continue; }
    r.points.forEach((p, i) => text(`Point ${i + 1} à ${fmtM(p.alongMm)} m (${p.kind === "hoist" ? "moteur" : "fixe"}) : idéal ${p.kg.toFixed(0)} kg, défavorable ${p.worstKg.toFixed(0)} kg, à retenir ${p.designKg.toFixed(0)} kg (${(p.designKg * 0.00980665).toFixed(2).replace(".", ",")} kN)` + (p.kind === "hoist" ? `, sur la salle ${p.buildingKg.toFixed(0)} kg${p.hoistKg == null ? " hors poids du moteur" : ""}` : "") + ` — capacité ${p.capacityKg == null ? "non renseignée" : p.capacityKg + " kg (" + Math.round((p.use ?? 0) * 100) + " %)"}.`, { indent: 2, color: p.over || p.uplift ? colorOf.bad : INK }));
    for (const c of r.checks) text(`[${word[c.state]}] ${c.label} : ${c.detail}`, { indent: 2, size: 8.5, color: colorOf[c.state] });
    y -= 3 * MM;
  }
  rule();
  text("Électricité", { size: 11, b: true, gap: 1 });
  text(`[${word[pw.state]}] ${(pw.totalW / 1000).toFixed(1).replace(".", ",")} kW tout à pleine puissance, soit ${pw.perPhaseA.toFixed(0)} A ${pw.phases === 3 ? "par phase en triphasé équilibré" : "en monophasé"}. ${pw.detail} Estimation sans facteur de puissance ni courants d'appel.`, { indent: 2, color: colorOf[pw.state], gap: 3 });
  rule();
  need(70 * MM);
  text("Contrôles sur site", { size: 11, b: true, gap: 1 });
  for (const [k, l] of siteChecks) text(`[${sf.checklist[k] ? "x" : "  "}] ${l}`, { indent: 2 });
  y -= 6 * MM; need(22 * MM);
  text(`Contrôlé par : ${sf.checkedBy || "........................................"}        Date : ....................        Signature : ........................................`, { size: 9 });
  return pdf.save();
}
export async function exportSafetyPdf(doc: Doc, siteChecks: [string, string][]) { return download(`${slug(doc.info.title)}-rapport-securite.pdf`, (await buildSafetyPdf(doc, siteChecks)) as unknown as BlobPart, "application/pdf"); }

// ---------- Fiches GDTF ----------
export async function readGdtfFiles(files: File[]): Promise<{ ok: import("./library").SymbolDef[]; errors: string[] }> {
  const { parseGdtf } = await import("./gdtf");
  const ok: import("./library").SymbolDef[] = [], errors: string[] = [];
  for (const f of files) {
    try { const bytes = new Uint8Array(await f.arrayBuffer()), sym = parseGdtf(bytes, f.name); ok.push(sym); await keepGdtfFile(sym.key, bytes); }
    catch (e: any) { errors.push(e?.message || `${f.name} : fiche illisible.`); }
  }
  return { ok, errors };
}
