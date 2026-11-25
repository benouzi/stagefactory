// Le connecteur vu de la page : la liste des outils offerts à une IA extérieure, et leur exécution.
// Ce sont les outils de l'assistant intégré et du créateur de salle : mêmes garde-fous (aucune charge admissible inventée), même annulation en un seul Ctrl+Z par appel.
import { TOOLS, runTool } from "./agent";
import { BUILD_TOOLS, tool as roomTool } from "./builder";
import { mergeUndoSince, redo, undo, undoDepth } from "./store";

const ROOM = ["regler_salle", "poser_perches", "retirer_perches", "noter_faits"];
const VIEWS = ["plan", "coupe", "3d"], LOOKS = ["depart", "ensemble", "face", "dessus", "jardin", "cour", "plateau"];
const EXTRA = [
  { name: "voir", description: "Affiche une vue dans ScenoFactory et renvoie l'image de la fenêtre, pour contrôler le résultat. Vue « plan » (dessus), « coupe » ou « 3d » ; en 3D, « regard » choisit le point de vue.", input_schema: { type: "object", properties: { vue: { type: "string", enum: VIEWS }, regard: { type: "string", enum: LOOKS } }, required: ["vue"] } },
  { name: "annuler", description: "Annule la dernière action faite dans ScenoFactory (un appel d'outil = une action). « fois » pour en annuler plusieurs.", input_schema: { type: "object", properties: { fois: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "retablir", description: "Rétablit la dernière action annulée.", input_schema: { type: "object", properties: {} } },
];
type Result = { content: any[]; isError?: boolean };
const text = (t: unknown, isError = false): Result => ({ content: [{ type: "text", text: typeof t === "string" ? t : JSON.stringify(t) }], ...(isError ? { isError } : {}) });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tell = (line: string) => window.dispatchEvent(new CustomEvent("sf:connector", { detail: line }));

export const connectorTools = () => [...TOOLS, ...BUILD_TOOLS.filter((t) => ROOM.includes(t.name)), ...EXTRA].map((t: any) => ({ name: t.name, description: t.description, inputSchema: t.input_schema }));

export async function connectorCall(name: string, input: any): Promise<Result> {
  const i = input && typeof input === "object" ? input : {}, depth = undoDepth(); let log = name;
  try {
    if (name === "annuler") { const done: string[] = []; for (let k = 0; k < Math.max(1, Math.min(20, Math.round(Number(i.fois) || 1))); k++) { const l = undo(); if (!l) break; done.push(l); } log = done.length ? "annulé : " + done.join(" ; ") : "rien à annuler"; tell(log); return text(done.length ? { annule: done } : "Rien à annuler."); }
    if (name === "retablir") { const l = redo(); log = l ? "rétabli : " + l : "rien à rétablir"; tell(log); return text(l ? { retabli: l } : "Rien à rétablir."); }
    if (name === "voir") {
      const vue = VIEWS.includes(i.vue) ? i.vue : "plan", regard = LOOKS.includes(i.regard) ? i.regard : null;
      document.documentElement.classList.add("capturing"); window.dispatchEvent(new CustomEvent("sf:view", { detail: vue })); await wait(vue === "3d" ? 900 : 350);
      if (vue === "3d" && regard) { (window as any).__view3d?.view?.(regard); await wait(500); }
      return text(`Vue ${vue}${vue === "3d" && regard ? " (" + regard + ")" : ""} affichée.`);
    }
    if (ROOM.includes(name)) { const out = await roomTool(name, i, []); log = out.log; tell(log); return { content: out.content }; }
    if (TOOLS.some((t) => t.name === name)) { const out = runTool(name, i); log = out.log; if (name !== "lire_projet" && name !== "verifier") tell(log); return text(out.result); }
    return text(`Outil inconnu : ${name}. Outils : ${connectorTools().map((t) => t.name).join(", ")}.`, true);
  } catch (e: any) { return text({ erreur: e?.message || "Échec de l'outil." }, true); }
  finally { if (undoDepth() > depth) mergeUndoSince(depth, "Connecteur : " + log.slice(0, 50)); }
}
(window as any).__connector = { tools: connectorTools, call: connectorCall };
