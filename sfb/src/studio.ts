// L'IA de ScenoFactory, en un seul interlocuteur : la même conversation sait lire le dossier d'une salle, la monter, puis concevoir la scénographie dedans.
// Elle réunit les outils du créateur de salle et ceux de l'assistant ; l'historique reste en ajout seul (voir history.ts).
import { TOOLS, SYSTEM as SCENO, projectState } from "./agent";
import { BUILD_TOOLS, SYSTEM as SALLE, tool } from "./builder";
import { getState, mergeUndoSince, undoDepth } from "./store";
import { costUsd, type VenueFile } from "./venue";
import { lighten, trimStates } from "./history";

export const STUDIO_TOOLS = [...BUILD_TOOLS, ...TOOLS.filter((t) => !BUILD_TOOLS.some((b) => b.name === t.name))];
export const STUDIO_SYSTEM = `Tu es l'IA de ScenoFactory, un logiciel pour concevoir des scénographies de spectacle : salle, lumière, éléments de scène, vidéo, son. Tu parles à un scénographe ou à un régisseur. Tu as deux métiers, dans la même conversation.
Choisis d'après la demande :
- On te donne des documents de la salle (plans, coupes, fiche technique), ou on te demande de créer ou de corriger la salle : fais le métier « SALLE ».
- On te décrit un spectacle, une ambiance, du matériel à poser ou à modifier : fais le métier « SCÉNOGRAPHIE ». Si le projet n'a ni salle ni perche et qu'aucun document n'est joint, dis-le en une phrase et propose : joindre le dossier de la salle, ou partir d'un plateau simple que tu poses toi-même (regler_salle et poser_perches) en marquant ces valeurs « supposé ».
- Une demande peut enchaîner les deux : d'abord la salle, ensuite la scénographie.
Une intention artistique (« intime », « froid », « concert rock ») se traduit en choix concrets que tu annonces en une phrase avant de construire.

===== MÉTIER « SCÉNOGRAPHIE » =====
${SCENO}

===== MÉTIER « SALLE » =====
${SALLE}`;

export interface StudioSession { messages: any[]; usd: number; rounds: number }
export const newStudio = (): StudioSession => ({ messages: [], usd: 0, rounds: 0 });
type Ask = (body: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
const KIND = { cad: "plan de CAO", pdf: "PDF", image: "image", text: "note", other: "" } as const, MAX_ROUNDS = 40;

/** Une demande : l'IA agit par les outils jusqu'à sa réponse. Tout ce qu'elle a fait s'annule d'un seul Ctrl+Z. */
export async function studioSend(s: StudioSession, text: string, files: VenueFile[], model: string, ask: Ask, onAction: (line: string) => void): Promise<{ text: string; actions: string[] }> {
  const depth = undoDepth(), actions: string[] = [], said: string[] = [], usable = files.filter((f) => f.kind !== "other");
  const docs = usable.length ? "DOCUMENTS DISPONIBLES (à ouvrir avec voir_document ou lire_texte_pdf) :\n" + usable.map((f) => `- ${f.name} (${KIND[f.kind]}${f.note ? ", " + f.note : ""})`).join("\n") + "\n\n" : "";
  s.messages.push({ role: "user", content: [{ type: "text", text: "ÉTAT DU PROJET :\n" + JSON.stringify(projectState(getState().doc)) }, { type: "text", text: docs + "DEMANDE :\n" + text }] });
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const r = await ask({ model, max_tokens: 16000, system: STUDIO_SYSTEM, tools: STUDIO_TOOLS, messages: s.messages });
      if (!r.ok) throw new Error(r.error || "L'IA n'a pas répondu.");
      const content: any[] = Array.isArray(r.data?.content) ? r.data.content : []; s.usd += costUsd(model, r.data?.usage).usd; s.rounds++; s.messages.push({ role: "assistant", content });
      for (const b of content) if (b.type === "text" && b.text.trim()) said.push(b.text.trim());
      const calls = content.filter((b) => b.type === "tool_use"); if (!calls.length) break;
      const results: any[] = [];
      for (const c of calls) { let out: { content: any[]; log: string }; try { out = await tool(c.name, c.input ?? {}, files); } catch (e: any) { out = { content: [{ type: "text", text: JSON.stringify({ erreur: e?.message || "Échec de l'outil." }) }], log: `Échec : ${c.name}` }; } actions.push(out.log); onAction(out.log); results.push({ type: "tool_result", tool_use_id: c.id, content: out.content }); }
      s.messages.push({ role: "user", content: results }); lighten(s.messages);
      if (round === MAX_ROUNDS - 1) said.push("Je m'arrête ici : la demande a pris beaucoup d'étapes. Dis-moi si je dois continuer.");
    }
  } finally { if (undoDepth() > depth) mergeUndoSince(depth, "IA : " + text.slice(0, 40)); trimStates(s.messages); }
  return { text: said.slice(-3).join("\n\n") || "C'est fait.", actions };
}
