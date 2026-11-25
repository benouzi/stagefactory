// La réflexion de l'IA est liée à tout ce qui la précède dans la conversation : la moindre retouche d'un ancien message la rend invalide
// et le service refuse la demande. Règle : on n'ajoute qu'à la fin. Quand il faut vraiment alléger, on retire d'abord toute la réflexion.
export function dropThinking(messages: any[]) {
  for (const m of messages) {
    if (m.role !== "assistant" || !Array.isArray(m.content)) continue;
    const rest = m.content.filter((b: any) => b.type !== "thinking" && b.type !== "redacted_thinking");
    m.content = rest.length ? rest : [{ type: "text", text: "(réflexion retirée)" }];
  }
}
/** Images encore présentes dans les résultats d'outils. */
export const imageCount = (messages: any[]) => messages.reduce((n, m) => n + (m.role === "user" && Array.isArray(m.content) ? m.content.reduce((k: number, b: any) => k + (b.type === "tool_result" && Array.isArray(b.content) ? b.content.filter((c: any) => c.type === "image").length : 0), 0) : 0), 0);
/** Le créateur de salle : tant qu'il y a peu d'images, rien ne bouge. Au-delà du seuil, une seule coupe franche : réflexion retirée, quatre images gardées. */
export function lighten(messages: any[], max = 12, keep = 4): boolean {
  if (imageCount(messages) <= max) return false;
  dropThinking(messages); let kept = 0;
  for (let k = messages.length - 1; k >= 0; k--) { const m = messages[k]; if (m.role !== "user" || !Array.isArray(m.content)) continue;
    for (const b of m.content) if (b.type === "tool_result" && Array.isArray(b.content)) b.content = b.content.slice().reverse().map((c: any) => (c.type === "image" ? (++kept <= keep ? c : { type: "text", text: "(image déjà regardée, retirée pour alléger : redemande-la si besoin)" }) : c)).reverse(); }
  return true;
}
/** L'assistant : les anciens « ÉTAT DU PROJET » restent en place ; passé le seuil, même coupe franche, seul le dernier état reste. */
export function trimStates(messages: any[], max = 8): boolean {
  const MARK = "ÉTAT DU PROJET :", at: [any, number][] = [];
  for (const m of messages) if (m.role === "user" && Array.isArray(m.content)) { const i = m.content.findIndex((c: any) => c.type === "text" && typeof c.text === "string" && c.text.startsWith(MARK) && c.text.length > 60); if (i >= 0) at.push([m, i]); }
  if (at.length <= max) return false;
  dropThinking(messages); for (const [m, i] of at.slice(0, -1)) m.content[i] = { type: "text", text: MARK + " (ancien, remplacé plus bas)" };
  return true;
}
