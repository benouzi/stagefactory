// Client de GDTF Share, à travers le petit serveur local (une page ouverte depuis le disque ne peut pas s'y connecter).
import type { SymbolDef } from "./library";

export interface ShareEntry { rid: number; fixture: string; manufacturer: string; revision: string; lastModified: number; uploader: string; rating: number; version: string; uuid: string; filesize: number; modes: { name: string; dmxfootprint: number }[] }
export const shareAvailable = (): boolean => !!(window as any).showFactoryDesktop || location.protocol === "http:" && (location.hostname === "localhost" || location.hostname === "127.0.0.1");

export class ShareError extends Error { constructor(message: string, public unauthorized = false) { super(message); } }
async function call(path: string, init?: RequestInit): Promise<Response> {
  let r: Response;
  try { r = await fetch("/api/gdtf" + path, { ...init, cache: "no-store" }); }
  catch { throw new ShareError((window as any).showFactoryDesktop ? "Le relais GDTF Share ne répond pas. Ferme et rouvre ScenoFactory." : "Le serveur local ne répond plus. Relance « Lancer ScenoFactory »."); }
  if (r.status === 401) { const j = await r.json().catch(() => ({})); throw new ShareError(j.error === "Non connecté." || j.error === "Unauthorized." ? "Session GDTF Share expirée : reconnecte-toi." : j.error === "No valid user or password provided." ? "Identifiant ou mot de passe refusé par GDTF Share." : j.error || "Connexion refusée.", true); }
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new ShareError(j.error || `GDTF Share a répondu ${r.status}.`); }
  return r;
}
export async function shareStatus(): Promise<{ connected: boolean; user: string }> {
  try { const r = await fetch("/api/ping", { cache: "no-store" }); const j = await r.json(); return j.gdtfShare ?? { connected: false, user: "" }; } catch { return { connected: false, user: "" }; }
}
export async function shareLogin(user: string, password: string): Promise<void> { await call("/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user, password }) }); }
export async function shareLogout(): Promise<void> { await call("/logout", { method: "POST" }); cache = null; }

// La liste est gardée 2 heures en mémoire, comme le recommande GDTF Share, pour ne pas la redemander à chaque recherche.
let cache: { at: number; list: ShareEntry[] } | null = null;
export async function shareList(force = false): Promise<{ list: ShareEntry[]; at: number }> {
  if (!force && cache && Date.now() - cache.at < 2 * 3600 * 1000) return cache;
  const j = await (await call("/list")).json();
  if (!j.result || !Array.isArray(j.list)) throw new ShareError(j.error || "Liste illisible.");
  const list: ShareEntry[] = j.list.map((e: any) => ({ rid: Number(e.rid), fixture: String(e.fixture ?? ""), manufacturer: String(e.manufacturer ?? ""), revision: String(e.revision ?? ""), lastModified: Number(e.lastModified) || 0, uploader: String(e.uploader ?? ""), rating: Number(e.rating) || 0, version: String(e.version ?? ""), uuid: String(e.uuid ?? "").toUpperCase(), filesize: Number(e.filesize) || 0, modes: Array.isArray(e.modes) ? e.modes.map((m: any) => ({ name: String(m.name ?? ""), dmxfootprint: Number(m.dmxfootprint) || 0 })) : [] }));
  cache = { at: Date.now(), list };
  return cache;
}
export async function shareDownload(entry: ShareEntry): Promise<SymbolDef> {
  const r = await call("/download?rid=" + entry.rid);
  if ((r.headers.get("content-type") || "").includes("json")) { const j = await r.json().catch(() => ({})); throw new ShareError(j.error || "Téléchargement refusé."); }
  const { parseGdtf } = await import("./gdtf");
  const bytes = new Uint8Array(await r.arrayBuffer());
  const s = parseGdtf(bytes, `${entry.manufacturer} ${entry.fixture}.gdtf`);
  await (await import("./store")).keepGdtfFile(s.key, bytes);
  return { ...s, manufacturer: s.manufacturer || entry.manufacturer, share: { rid: entry.rid, revision: entry.revision, uploader: entry.uploader } };
}
