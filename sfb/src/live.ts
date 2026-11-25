// DMX en direct : ce que la console envoie, lu par l'application installée, et la petite sortie « Identifier ».
// Rien ici n'entre dans le projet ni dans l'historique : c'est un état d'écran.
import type { Doc, Fixture, Id } from "./model";
import { modeOf, type Chan } from "./library";
import { can } from "./platform";

export interface LiveSource { protocol: "Art-Net" | "sACN"; address: string; name: string; universes: number[]; fps: number }
interface Bridge {
  listen(o: { artnetZero: boolean; universes: number[] }): Promise<{ ok: boolean; artnet: boolean; sacn: boolean; errors: string[] }>;
  stop(): Promise<void>;
  output(o: { protocol: "artnet" | "sacn"; frames: [number, Uint8Array][] } | null): Promise<{ ok: boolean; active: boolean }>;
  onData(cb: (d: { frames: [number, Uint8Array][]; sources: LiveSource[]; at: number }) => void): void;
}
const bridge = (): Bridge | null => (can("dmxOut") ? ((window as any).showFactoryDesktop?.dmx as Bridge | undefined) ?? null : null);

export interface LiveState { listening: boolean; artnet: boolean; sacn: boolean; errors: string[]; sources: LiveSource[]; frames: Map<number, Uint8Array>; at: number; artnetZero: boolean; identify: boolean; outProtocol: "artnet" | "sacn"; version: number }
let state: LiveState = { listening: false, artnet: false, sacn: false, errors: [], sources: [], frames: new Map(), at: 0, artnetZero: true, identify: false, outProtocol: "artnet", version: 0 };
const subs = new Set<() => void>();
const set = (p: Partial<LiveState>) => { state = { ...state, ...p, version: state.version + 1 }; subs.forEach((f) => f()); };
export const liveState = () => state;
export const subscribeLive = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const liveAvailable = () => !!bridge();

let wired = false;
const universesOf = (doc: Doc) => [...new Set(Object.values(doc.fixtures).map((f) => f.universe).filter((u): u is number => u != null))];
export async function startListening(doc: Doc): Promise<void> {
  const b = bridge(); if (!b) return;
  if (!wired) { wired = true; b.onData((d) => { if (!state.listening) return; const frames = state.frames; for (const [u, data] of d.frames) frames.set(u, data); set({ frames, sources: d.sources, at: d.frames.length ? d.at : state.at }); }); }
  const r = await b.listen({ artnetZero: state.artnetZero, universes: universesOf(doc) });
  set({ listening: r.ok, artnet: r.artnet, sacn: r.sacn, errors: r.errors, frames: new Map(), sources: [], at: 0 });
}
export async function stopListening(): Promise<void> { await bridge()?.stop(); set({ listening: false, sources: [], frames: new Map(), at: 0, errors: [] }); }
export async function setArtnetZero(v: boolean, doc: Doc): Promise<void> { set({ artnetZero: v }); if (state.listening) await startListening(doc); }
export const setOutProtocol = (p: "artnet" | "sacn") => set({ outProtocol: p });

// ---------- Lecture d'un appareil dans une trame ----------
export interface FixtureLive { level: number; rgb: [number, number, number]; known: boolean; panDeg?: number; tiltDeg?: number; zoomDeg?: number; goboSlot?: number; iris?: number; blades?: number[]; bladeTilt?: number[] }
const WARM: [number, number, number] = [255, 214, 150];
export function decode(f: Fixture, data: Uint8Array | undefined): FixtureLive | null {
  if (!data || f.address == null) return null;
  const mode = modeOf(f.symbol, f.modeName), base = f.address - 1;
  const v = (c: Chan) => (data[base + c.offset - 1] ?? 0) / 255;
  const ch = mode.channels ?? [];
  const max = (a: string) => { const l = ch.filter((c) => c.attr === a); return l.length ? Math.max(...l.map(v)) : null; };
  // pan et tilt : 16 bits quand l'appareil a un canal fin ; course lue dans la fiche, sinon 540° et 270°
  const angle = (attr: "pan" | "tilt", span: number) => { const c = ch.find((x) => x.attr === attr); if (!c) return undefined; const t = c.fine ? ((data[base + c.offset - 1] ?? 0) * 256 + (data[base + c.fine - 1] ?? 0)) / 65535 : v(c); const [lo, hi] = c.phys ?? [-span / 2, span / 2]; return lo + (hi - lo) * t; };
  const zc = ch.find((x) => x.attr === "zoom"), gc = ch.find((x) => x.attr === "gobo"), gv = gc ? data[base + gc.offset - 1] ?? 0 : 0;
  const zoomDeg = zc ? (zc.phys ?? [10, 50])[0] + ((zc.phys ?? [10, 50])[1] - (zc.phys ?? [10, 50])[0]) * v(zc) : undefined;
  const goboSlot = gc && mode.gobo ? [...mode.gobo].reverse().find((s) => gv >= s.from)?.slot : undefined;
  // iris : 0 = ouvert sur le canal, comme sur la plupart des appareils ; couteaux : insertion de chaque lame, et son inclinaison si la fiche a deux côtés
  const one = (a: string) => { const c = ch.find((x) => x.attr === a); return c ? v(c) : undefined; };
  const ir = one("iris"), bl = [1, 2, 3, 4].map((n) => [one("blade" + n), one("blade" + n + "b")] as const), hasBl = bl.some(([a]) => a != null);
  const mv = { panDeg: angle("pan", 540), tiltDeg: angle("tilt", 270), zoomDeg, goboSlot, iris: ir == null ? undefined : 1 - ir,
    blades: hasBl ? bl.map(([a, b]) => Math.max(a ?? 0, b ?? 0)) : undefined, bladeTilt: hasBl ? bl.map(([a, b]) => (b == null ? 0 : ((a ?? 0) - b) * 30)) : undefined };
  const dim = max("dim"), r = max("r"), g = max("g"), b = max("b"), w = max("w") ?? 0, a = max("a") ?? 0, cy = max("c"), ma = max("m"), ye = max("y");
  if (r != null || g != null || b != null) {
    const R = Math.min(1, (r ?? 0) + w + a), G = Math.min(1, (g ?? 0) + w + a * 0.75), B = Math.min(1, (b ?? 0) + w), top = Math.max(R, G, B);
    const level = (dim ?? 1) * top;
    return { level, rgb: top > 0 ? [Math.round((R / top) * 255), Math.round((G / top) * 255), Math.round((B / top) * 255)] : WARM, known: true, ...mv };
  }
  if (dim != null) {
    const rgb: [number, number, number] = cy != null || ma != null || ye != null ? [Math.round((1 - (cy ?? 0)) * 255), Math.round((1 - (ma ?? 0)) * 255), Math.round((1 - (ye ?? 0)) * 255)] : WARM;
    return { level: dim, rgb, known: true, ...mv };
  }
  // rôle des canaux inconnu : on montre seulement qu'il y a de l'activité sur la plage de l'appareil
  let top = 0; for (let i = 0; i < mode.footprint; i++) top = Math.max(top, data[base + i] ?? 0);
  return { level: top / 255, rgb: WARM, known: false };
}
export function liveMap(doc: Doc): Map<Id, FixtureLive> | undefined {
  if (!state.listening || !state.frames.size) return undefined;
  const out = new Map<Id, FixtureLive>();
  for (const f of Object.values(doc.fixtures)) { if (f.universe == null) continue; const l = decode(f, state.frames.get(f.universe)); if (l) out.set(f.id, l); }
  return out;
}

// ---------- Sortie « Identifier » : plein feu, en blanc, sur les appareils choisis ----------
export function identifyFrames(doc: Doc, ids: Id[]): { frames: [number, Uint8Array][]; done: number; skipped: number } {
  const byU = new Map<number, Uint8Array>(); let done = 0, skipped = 0;
  for (const id of ids) {
    const f = doc.fixtures[id]; if (!f || f.universe == null || f.address == null) { skipped++; continue; }
    const ch = (modeOf(f.symbol, f.modeName).channels ?? []).filter((c) => ["dim", "r", "g", "b", "w"].includes(c.attr));
    if (!ch.length) { skipped++; continue; }
    let d = byU.get(f.universe); if (!d) byU.set(f.universe, (d = new Uint8Array(512)));
    for (const c of ch) for (const o of [c.offset, c.fine]) if (o && f.address - 1 + o <= 512) d[f.address + o - 2] = 255;
    done++;
  }
  return { frames: [...byU.entries()], done, skipped };
}
export async function identify(doc: Doc, ids: Id[] | null): Promise<{ done: number; skipped: number }> {
  const b = bridge(); if (!b) return { done: 0, skipped: 0 };
  if (!ids) { await b.output(null); set({ identify: false }); return { done: 0, skipped: 0 }; }
  const r = identifyFrames(doc, ids);
  await b.output(r.frames.length ? { protocol: state.outProtocol, frames: r.frames } : null);
  set({ identify: r.frames.length > 0 });
  return r;
}
