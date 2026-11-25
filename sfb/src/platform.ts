// Trois versions d'un même outil. La version PC (installeur Windows) est la version complète :
// c'est elle qui parlera à grandMA onPC et à Avolites Titan. Les versions Mac et HTML affichent
// « Seulement sur la version PC » là où la fonction ne peut pas exister chez elles.
// Règle pour le Mac : rester au plus près du PC. Si une fonction y est possible, même autrement, elle y est.
export type Platform = "pc" | "mac" | "html";
export type Feature = "gdtfShare" | "grandMA" | "titan" | "dmxOut" | "dwg" | "ai" | "connector" | "catalogue" | "window3d" | "render";

// L'application installée s'annonce elle-même (préchargement Electron). Le lanceur local sur Windows
// tient lieu de version PC en attendant l'installeur.
function detect(): Platform {
  const desk = (window as any).showFactoryDesktop as { platform?: string } | undefined;
  if (desk) return desk.platform === "darwin" ? "mac" : "pc";
  const local = location.protocol === "http:" && (location.hostname === "localhost" || location.hostname === "127.0.0.1");
  if (local) return /Macintosh|Mac OS/i.test(navigator.userAgent) ? "mac" : "pc";
  return "html";
}
export const platform: Platform = detect();
export const PLATFORM_NAME: Record<Platform, string> = { pc: "Version PC", mac: "Version Mac", html: "Version HTML" };

// Une seule table à tenir à jour : ce que chaque version sait faire.
const TABLE: Record<Feature, Record<Platform, boolean>> = {
  render: { pc: true, mac: true, html: false }, // le rendu IA passe par une clé gardée hors de la page : il faut l'application installée
  gdtfShare: { pc: true, mac: true, html: false }, // connexion à un autre site : impossible depuis une simple page
  grandMA: { pc: true, mac: true, html: false },
  titan: { pc: true, mac: true, html: false }, // Titan tourne sous Windows : depuis un Mac, par le réseau,
  dmxOut: { pc: true, mac: true, html: false },
  dwg: { pc: true, mac: true, html: false }, // le lecteur DWG pèse 11 Mo : il vit dans l'application installée
  window3d: { pc: true, mac: true, html: false }, // une seconde fenêtre du système, pour un second écran
  catalogue: { pc: true, mac: true, html: false }, // téléchargement depuis une bibliothèque en ligne : hors de portée d'une simple page
  connector: { pc: true, mac: true, html: false }, // une IA extérieure pilote l'application : il faut l'application installée
  ai: { pc: true, mac: true, html: false }, // la clé API doit rester hors de la page : elle vit dans l'application installée
};
export const can = (f: Feature): boolean => TABLE[f][platform];
export const PC_ONLY = "Seulement sur la version PC";
// Page publiée comme artefact Claude : les fichiers sortent par la fenêtre de confirmation de l'hôte.
export const inArtifact = (): boolean => typeof (window as any).claude?.use === "function";
export const isDesktop = (): boolean => !!(window as any).showFactoryDesktop;
