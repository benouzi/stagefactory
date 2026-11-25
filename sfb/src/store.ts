// Document unique, modifié uniquement par des commandes annulables.
import { applyPatches, enablePatches, produceWithPatches, type Patch } from "immer";
import { useSyncExternalStore } from "react";
import { migrate, newDoc, type Doc, type Selection } from "./model";
import { registerSymbols, unregisterSymbol, type SymbolDef } from "./library";

enablePatches();

interface Entry { label: string; patches: Patch[]; inverse: Patch[]; at: number; group?: string }
export interface State { doc: Doc; selection: Selection; undo: Entry[]; redo: Entry[]; savedAt: number | null; dirty: boolean }

let state: State = { doc: newDoc(), selection: [], undo: [], redo: [], savedAt: null, dirty: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (next: Partial<State>) => { state = { ...state, ...next }; emit(); };

export const getState = () => state;
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
// ----- fenêtre 3D séparée : deux fenêtres, un seul projet. La fenêtre principale garde l'historique et l'enregistrement.
let satelliteMode = false, remoteDoc: Doc | null = null;
export const setSatellite = () => { satelliteMode = true; };
export const isRemoteDoc = (d: Doc) => d === remoteDoc;
/** Fenêtre secondaire : reçoit le projet et la sélection de la fenêtre principale. */
export function setRemote(doc: Doc, selection: Selection) { registerSymbols(Object.values(doc.library ?? {})); remoteDoc = doc; state = { ...state, doc, selection }; emit(); }
/** Fenêtre principale : ce qui a été fait dans la fenêtre secondaire devient une étape d'annulation. */
export function applyRemoteDoc(doc: Doc) { exec("Modification dans la fenêtre 3D", (d) => { for (const k of Object.keys(d)) if (!(k in doc)) delete (d as any)[k]; Object.assign(d, doc); }); remoteDoc = state.doc; }

export const useStore = <T,>(sel: (s: State) => T): T => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => sel(state));

// Exécute une commande. « group » fusionne les commandes successives d'un même geste (glisser, frappe)
// en une seule entrée d'historique.
export function exec(label: string, recipe: (d: Doc) => void, group?: string): void {
  const [doc, patches, inverse] = produceWithPatches(state.doc, recipe);
  if (!patches.length) return;
  const undo = [...state.undo];
  const last = undo[undo.length - 1];
  if (group && last && last.group === group && Date.now() - last.at < 1500) {
    undo[undo.length - 1] = { ...last, patches: [...last.patches, ...patches], inverse: [...inverse, ...last.inverse], at: Date.now() };
  } else undo.push({ label, patches, inverse, at: Date.now(), group });
  if (undo.length > 300) undo.shift();
  set({ doc, undo, redo: [], dirty: true });
  scheduleAutosave();
}
/** Profondeur de l'historique, pour pouvoir regrouper ensuite tout ce qui a été fait depuis. */
export const undoDepth = () => state.undo.length;
/** Fond en une seule étape tout ce qui a été fait depuis la profondeur donnée : un seul Ctrl+Z l'annulera. */
export function mergeUndoSince(depth: number, label: string) {
  const tail = state.undo.slice(depth); if (tail.length < 1 || depth < 0) return;
  const merged = { ...tail[tail.length - 1], label, group: undefined, patches: tail.flatMap((e) => e.patches), inverse: [...tail].reverse().flatMap((e) => e.inverse) };
  set({ undo: [...state.undo.slice(0, depth), merged] });
}
export function undo(): string | null {
  const e = state.undo[state.undo.length - 1];
  if (!e) return null;
  const doc = applyPatches(state.doc, e.inverse);
  set({ doc, undo: state.undo.slice(0, -1), redo: [...state.redo, e], selection: pruneSelection(doc, state.selection), dirty: true });
  scheduleAutosave();
  return e.label;
}
export function redo(): string | null {
  const e = state.redo[state.redo.length - 1];
  if (!e) return null;
  const doc = applyPatches(state.doc, e.patches);
  set({ doc, redo: state.redo.slice(0, -1), undo: [...state.undo, e], selection: pruneSelection(doc, state.selection), dirty: true });
  scheduleAutosave();
  return e.label;
}
function pruneSelection(doc: Doc, sel: Selection): Selection {
  return sel.filter((s) => (s.kind === "fixture" ? !!doc.fixtures[s.id] : s.kind === "support" ? !!doc.supports[s.id] : !!doc.backdrop));
}
export const select = (selection: Selection, force = false) => { const d = state.doc; set({ selection: force ? selection : selection.filter((s) => { const e = s.kind === "fixture" ? d.fixtures[s.id] : s.kind === "object" ? d.objects[s.id] : null; return !e || (!e.locked && !e.hidden); }) }); };
export function loadDoc(doc: Doc) { registerSymbols(Object.values(doc.library ?? {})); set({ doc, selection: [], undo: [], redo: [], dirty: false }); scheduleAutosave(); }

// ---------- Enregistrement automatique (IndexedDB) ----------
const DB = "plan-de-feu", STORE = "kv";
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbPut(key: string, value: unknown) {
  const db = await idb();
  await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(value, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  db.close();
}
async function idbGet(key: string): Promise<unknown> {
  const db = await idb();
  const v = await new Promise<unknown>((res, rej) => { const rq = db.transaction(STORE).objectStore(STORE).get(key); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
  db.close();
  return v;
}
let timer: number | undefined;
export let autosaveError: string | null = null;
function scheduleAutosave() {
  if (satelliteMode) return; /* la fenêtre secondaire n'enregistre rien : une seule fenêtre écrit le projet */
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    try { await idbPut("autosave", state.doc); autosaveError = null; set({ savedAt: Date.now(), dirty: false }); }
    catch (e) { autosaveError = "Enregistrement automatique impossible dans ce navigateur. Utilise « Enregistrer » pour garder ton travail."; emit(); }
  }, 800);
}
export async function restoreAutosave(): Promise<boolean> {
  try {
    const raw = await idbGet("autosave");
    if (!raw) return false;
    const doc = migrate(raw);
    registerSymbols(Object.values(doc.library));
    set({ doc, savedAt: Date.now(), dirty: false });
    return true;
  } catch { return false; }
}

// ---------- Bibliothèque personnelle : fiches GDTF importées, gardées d'un projet à l'autre ----------
export async function loadUserLibrary(): Promise<void> { try { const v = (await idbGet("library")) as SymbolDef[] | undefined; if (Array.isArray(v)) registerSymbols(v); } catch { /* bibliothèque indisponible : on continue sans */ } }
export async function addToUserLibrary(list: SymbolDef[]): Promise<boolean> {
  registerSymbols(list);
  try { const cur = ((await idbGet("library")) as SymbolDef[] | undefined) ?? []; const keys = new Set(list.map((s) => s.key)); await idbPut("library", [...cur.filter((s) => !keys.has(s.key)), ...list]); return true; } catch { return false; }
}
export async function removeFromUserLibrary(key: string): Promise<void> {
  unregisterSymbol(key);
  try { const cur = ((await idbGet("library")) as SymbolDef[] | undefined) ?? []; await idbPut("library", cur.filter((s) => s.key !== key)); } catch { /* rien à retirer */ }
}

// Fichiers GDTF d'origine, gardés à part pour pouvoir les joindre à un export MVR.
export async function keepGdtfFile(key: string, bytes: Uint8Array): Promise<void> { try { await idbPut("gdtf:" + key, bytes); } catch { /* sans stockage : l'export MVR le signalera */ } }
export async function gdtfFile(key: string): Promise<Uint8Array | null> { try { const v = await idbGet("gdtf:" + key); return v instanceof Uint8Array ? v : v instanceof ArrayBuffer ? new Uint8Array(v) : null; } catch { return null; } }
