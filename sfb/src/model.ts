// Modèle de la première tranche : sous-ensemble de replica/schema.ts.
// Longueurs en millimètres, angles en degrés, poids en kilogrammes.
// Origine au nez de scène, dans l'axe. X positif côté cour, Y positif vers le lointain, Z vers le haut.
export type Id = string;
export type Vec2 = { x: number; y: number };
export const FORMAT_VERSION = 2;

export interface Doc {
  configs?: Record<Id, RoomConfig>; // configurations de salle enregistrées
  configId?: Id | null; // la configuration appliquée en dernier
  customProps?: Record<Id, import("./props").CustomProp>; // modèles créés dans l'atelier ou par l'IA
  models?: Record<Id, Model3D>; // modèles 3D importés pour la scénographie
  formatVersion: number;
  id: Id;
  info: { title: string; venue: string; author: string; date: string };
  venueFacts?: { sujet: string; valeur: string; source: string; confiance: string }[]; // ce que le créateur de salle a retenu, avec ses sources
  sections?: { name: string; kgPerM: number; mAdmKgm: number | null; vAdmKg: number | null }[]; // fiches de section de pont ou de tube, saisies depuis le fabricant
  dims?: { id: Id; a: Vec2; b: Vec2; offsetMm: number }[]; // cotes posées sur le plan
  venueNotes?: string; // consignes et informations données au créateur de salle
  settings: { paper: "A3" | "A4"; scale: number | "auto"; venuePreset: string | null; sectionPage?: boolean };
  layers: { backdrop: boolean; supports: boolean; fixtures: boolean; labels: boolean; stage: boolean; video: boolean };
  backdrop: Backdrop | null;
  supports: Record<Id, Support>;
  fixtures: Record<Id, Fixture>;
  safety: Safety;
  room: Room;
  objects: Record<Id, Obj>; // scène et vidéo : praticables, rideaux, écrans, murs LED
  library: Record<string, import("./library").SymbolDef>; // fiches importées utilisées par ce projet : le fichier se suffit à lui-même
}

export interface Backdrop {
  dataUrl: string; // image de la page PDF ou image importée
  wPx: number;
  hPx: number;
  origin: Vec2; // position monde du coin haut-gauche de l'image
  mmPerPx: number;
  calibrated: boolean;
  opacity: number;
  fileName: string;
  vector?: import("./cad").VectorBackdrop; // plan de CAO : des traits à l'échelle, pas une image
  hiddenLayers?: string[]; // calques du dessin masqués
  wallLayers?: string[]; // calques du dessin élevés en murs dans la vue 3D
  wallHMm?: number; // hauteur de ces murs
}

export interface Support {
  id: Id;
  kind: "pipe" | "truss";
  name: string;
  a: Vec2; // extrémité côté jardin de préférence
  b: Vec2;
  zMm: number;
  houseNo?: number | null; // numéro de la perche dans la salle, quand elle en a un
  allowableKg: number | null; // saisi par l'utilisateur ; null = inconnu
  kgPerM: number; // poids propre au mètre
  sectionMm?: number; // côté de la section d'un pont (290, 400, 520) : pour le dessin seulement
  tube?: string; // tube d'une perche (matière, diamètre, épaisseur) : donne l'inertie pour la contrainte et la flèche
  stressAdmMPa?: number | null; // contrainte de flexion admissible du tube, saisie par l'utilisateur
  pieces?: number[]; // éléments posés un à un (mm), dans l'ordre : la découpe réelle, quand elle est connue
  series?: string; // série de pont d'un fabricant (bibliothèque) : éléments réels, section et poids propre
  points: RigPoint[]; // moteurs, palans ou points fixes qui portent la barre
  mAdmKgm?: number | null; // moment fléchissant admissible, d'après le fabricant
  vAdmKg?: number | null; // effort tranchant admissible, d'après le fabricant
  loads?: RigLoad[]; // charges de rigging ajoutées à la main : enceinte, rideau, décor, câbles
  accessories?: RigAcc[]; // bras de déport et échelles de projecteur accrochés à la barre
}
/** Accessoire d'accroche. Bras de déport : sort de la barre à l'horizontale, de lengthMm, vers le lointain (side 1) ou la face (side -1). Échelle : pend sous la barre, sur lengthMm. */
export interface RigAcc { id: Id; kind: "arm" | "ladder"; name: string; alongMm: number; kg: number | null; lengthMm: number; side: 1 | -1 }
/** Charge ajoutée sur une barre. lengthMm = 0 : ponctuelle ; sinon répartie sur cette longueur, centrée sur alongMm. kg = null : poids inconnu. */
export interface RigLoad { id: Id; name: string; alongMm: number; kg: number | null; lengthMm: number }
export interface RigPoint { id: Id; alongMm: number; capacityKg: number | null; kind: "hoist" | "fixed"; leg?: boolean; /* point fixe qui est une tour posée au sol, pas une suspente */ hoistKg?: number | null; cls?: "D8" | "D8+" | "C1" | null; secondary?: boolean;
  originCapKg?: number | null; originHMm?: number | null; // origine de treuil : le point du bâtiment au-dessus, sa capacité et sa hauteur
  slingCapKg?: number | null; // charge maximale d'utilisation de l'élingue ou de l'accessoire de ce point
  bridle?: { aMm: number; bMm: number; dropMm: number; legCapKg: number | null } | null } // palonnier à deux brins : écarts horizontaux des deux ancrages (jardin, cour) et hauteur entre le sommet et les ancrages

// Réglages de sécurité du projet. Les trois premiers sont des valeurs de départ prudentes choisies par l'outil,
// pas des valeurs tirées d'une norme : à régler selon le matériel et les règles qui s'appliquent au lieu.
export interface Safety {
  dynFactor: number; // majoration des charges sur moteurs pendant la manœuvre
  deflRatio?: number; // critère de flèche : portée divisée par ce nombre (200 par défaut)
  cableKgPerM: number; // câblage le long de chaque barre
  accessoryKg: number; // crochet et élingue de sécurité de chaque appareil
  peopleBelow: boolean; // du public ou des artistes passent sous les charges
  supplyA: number | null; // alimentation disponible, par phase
  supplyPhases: 1 | 3;
  checklist: Record<string, boolean>; // contrôles faits sur site
  checkedBy: string;
}
// La salle, décrite par quelques cotes : plateau, cadre de scène, salle et gradins. Tout en millimètres.
// Le zéro des hauteurs est le plancher de scène ; le sol de la salle est plus bas de « stageRiseMm ».
export interface Room {
  enabled: boolean;
  stageWMm: number; stageDMm: number; // largeur mur à mur et profondeur du plateau
  prosWMm: number; prosHMm: number; // ouverture et hauteur du cadre de scène
  wallHMm: number; // hauteur sous gril ou sous plafond
  houseHMm?: number; // hauteur sous plafond de la salle, quand elle diffère de la cage de scène
  tierRiseLastMm?: number | null; // gradin à pente variable : hauteur du dernier rang (la hauteur d'un rang devient celle du premier)
  gridHMm?: number | null; // gril : plancher technique au-dessus du plateau
  galleryHsMm?: number[]; galleryWMm?: number; backGalleryHMm?: number | null; // passerelles de la cage de scène : hauteurs des passerelles latérales, leur largeur, et celle du lointain
  pitDMm?: number | null; pitLevelMm?: number; // fosse : profondeur devant le nez de scène, et niveau de son plancher par rapport au plateau (0 = au niveau scène)
  stageRiseMm: number; // hauteur de la scène au-dessus du sol de la salle
  houseWMm: number; houseDMm: number; // largeur et profondeur de la salle
  tierStartMm: number; tierRows: number; tierDepthMm: number; tierRiseMm: number; // gradin : distance au nez de scène, rangs, profondeur et hauteur d'un rang
}
/** Hauteur du dessus de chaque rang du gradin au-dessus du sol de salle. Pente régulière, ou qui grandit du premier au dernier rang. */
export function tierHeights(r: Pick<Room, "tierRows" | "tierRiseMm" | "tierRiseLastMm">): number[] {
  const n = Math.max(0, Math.round(r.tierRows)), first = r.tierRiseMm, last = r.tierRiseLastMm ?? first, out: number[] = []; let h = 0;
  for (let i = 0; i < n; i++) { h += n > 1 ? first + ((last - first) * i) / (n - 1) : first; out.push(Math.round(h)); }
  return out;
}
export const defaultRoom = (): Room => ({ enabled: false, stageWMm: 18000, stageDMm: 11000, prosWMm: 12000, prosHMm: 7000, wallHMm: 9000, stageRiseMm: 1000, houseWMm: 20000, houseDMm: 18000, tierStartMm: 4000, tierRows: 12, tierDepthMm: 950, tierRiseMm: 320 });
export const defaultSafety = (): Safety => ({ dynFactor: 1.2, cableKgPerM: 1, accessoryKg: 1, peopleBelow: true, supplyA: null, supplyPhases: 3, checklist: {}, checkedBy: "" });

// Objets de scène et de vidéo. Position = centre de l'objet en plan ; wMm = largeur le long de l'objet.
export interface Obj {
  id: Id;
  kind: "deck" | "curtain" | "screen" | "ledwall" | "prop";
  locked?: boolean; // verrouillé : ne se sélectionne plus au clic, donc ne bouge plus
  hidden?: boolean; // masqué : absent du plan, de la 3D et du PDF, mais toujours compté dans les charges
  model?: string; // élément de scénographie : clé du catalogue, ou « glb:<id> » pour un modèle importé
  color?: string; // teinte choisie (clé de palette ou #rrggbb)
  name: string;
  pos: Vec2;
  rotDeg: number;
  wMm: number;
  dMm: number; // profondeur en plan (praticable) ou épaisseur
  hMm: number; // praticable : hauteur du plancher ; autres : hauteur de l'objet
  zMm: number; // altitude du bas (rideau, écran, mur LED)
  pitchMm: number; // mur LED : pas de pixel
  kgPerM2: number; // mur LED
  wPerM2: number; // mur LED
  content?: "none" | "mire" | "visuel" | "image"; // ce que montre un écran ou un mur LED dans la vue 3D
  imageUrl?: string; // image réduite, gardée dans le projet
}
/** Les objets de la couche « scène » (les écrans et murs LED sont dans la couche vidéo). */
export const isStageKind = (k: Obj["kind"]) => k === "deck" || k === "curtain" || k === "prop";
/** Un modèle 3D importé (GLB), gardé dans le projet. */
export interface Model3D { id: Id; name: string; data: string; bytes: number; source?: string }

export interface Fixture {
  id: Id;
  symbol: string; // clé de bibliothèque
  locked?: boolean;
  hidden?: boolean;
  attach: { supportId: Id; alongMm: number; accId?: Id; dropMm?: number } | null; // accId : accroché à un bras de déport ou une échelle de la barre ; dropMm : hauteur sous la barre, sur une échelle
  pos: Vec2; // utilisé seulement si attach est null
  zMm: number; // idem
  rotDeg: number;
  unitNumber: string;
  channel: string;
  universe: number | null;
  address: number | null;
  modeName: string;
  purpose: string;
  color: string;
  group: string;
  panDeg: number;
  tiltDeg: number;
  weightKg: number;
  powerW: number;
  notes: string;
  throwRatio?: number | null; // vidéoprojecteur : rapport de projection (distance / largeur d'image)
  vpContent?: "none" | "mire" | "image"; // image réellement projetée dans la vue 3D, sur tout ce que le faisceau rencontre (mapping)
  vpImage?: string; // image réduite, gardée dans le projet
  vpAspect?: number; // format de l'image projetée (16:9 par défaut)
  vpShiftH?: number; // décalage d'objectif horizontal, en % de la largeur d'image (positif = vers la droite de l'image)
  vpShiftV?: number; // décalage d'objectif vertical, en % de la hauteur d'image (positif = vers le haut)
  vpRollDeg?: number; // rotation de l'appareil autour de son axe optique
  lumens?: number | null;
  targetId?: Id | null; // écran visé
  zoomDeg?: number | null; // réglages d'aperçu sans console : ouverture du faisceau et gobo
  goboSlot?: number | null;
  iris?: number | null; // 1 = grand ouvert, 0 = fermé au plus serré
  blades?: number[] | null; // couteaux haut, cour, bas, jardin : 0 = sorti, 1 = au centre du faisceau
  bladeRot?: number | null; // rotation du jeu de couteaux, en degrés
}

export type Selection = { kind: "fixture" | "support" | "backdrop" | "object"; id: Id }[];

export const uid = (): Id =>
  (crypto as any).randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

// Points répartis : une demi-travée de porte-à-faux à chaque bout, comme les fils d'une perche de théâtre.
export const evenPoints = (lengthMm: number, n: number, kind: RigPoint["kind"] = "fixed"): RigPoint[] =>
  Array.from({ length: Math.max(0, n) }, (_, i) => ({ id: uid(), alongMm: Math.round((lengthMm * (i + 0.5)) / n), capacityKg: null, kind }));

export function newDoc(): Doc {
  return {
    formatVersion: FORMAT_VERSION,
    id: uid(),
    info: { title: "", venue: "", author: "", date: new Date().toISOString().slice(0, 10) },
    settings: { paper: "A3", scale: "auto", venuePreset: null },
    layers: { backdrop: true, supports: true, fixtures: true, labels: true, stage: true, video: true },
    backdrop: null,
    supports: {},
    fixtures: {},
    safety: defaultSafety(),
    room: defaultRoom(),
    objects: {},
    library: {},
  };
}

// Salle d'essai : 14 perches numérotées. Sert aux essais automatiques ; elle n'est proposée nulle part dans le logiciel.
// Profondeurs déduites de deux repères lus dans la previz (perche 14 à 0,19 m, perche 6 à 6,05 m) ;
// longueur et hauteur par défaut. Tout est à corriger avec les cotes réelles.
export function sampleDoc(): Doc {
  const d = newDoc();
  d.info.venue = "Salle d'essai";
  d.settings.venuePreset = null;
  d.room.enabled = true; // cotes de salle génériques
  for (let k = 1; k <= 14; k++) {
    const y = Math.round(190 + (14 - k) * 732.5);
    const id = uid();
    d.supports[id] = { id, kind: "pipe", name: `Perche ${k}`, a: { x: -7000, y }, b: { x: 7000, y }, zMm: 7000, houseNo: k, allowableKg: null, kgPerM: 4, points: evenPoints(14000, 4) };
  }
  return d;
}

export function migrate(raw: any): Doc {
  if (!raw || typeof raw !== "object") throw new Error("Ce fichier n'est pas un projet de plan de feu.");
  if (typeof raw.formatVersion !== "number") throw new Error("Ce fichier n'est pas un projet de plan de feu.");
  if (raw.formatVersion > FORMAT_VERSION)
    throw new Error("Ce projet a été enregistré par une version plus récente de l'outil. Mets l'outil à jour pour l'ouvrir.");
  const base = newDoc();
  const doc = { ...base, ...raw, formatVersion: FORMAT_VERSION, info: { ...base.info, ...raw.info }, settings: { ...base.settings, ...raw.settings }, layers: { ...base.layers, ...raw.layers }, library: raw.library ?? {}, objects: raw.objects ?? {}, safety: { ...defaultSafety(), ...(raw.safety ?? {}) }, room: { ...defaultRoom(), ...(raw.room ?? {}) } } as Doc;
  // version 1 : les barres n'avaient ni poids propre ni points d'accroche
  for (const s of Object.values(doc.supports)) { if (typeof s.kgPerM !== "number") s.kgPerM = 4; if (!Array.isArray(s.points)) s.points = []; }
  return doc;
}

/** Une configuration de salle : le volume de la salle tel qu'il était réglé, et ce qui était masqué (gradin replié, fosse, décor d'une variante…). */
export interface RoomConfig { id: Id; name: string; room: Room; hidden: Id[] }
/** Le projet tel qu'il se dessine : sans les éléments masqués. Les calculs (charges, patch, listes) gardent le projet entier. */
export function visibleDoc(d: Doc): Doc {
  const fx = Object.values(d.fixtures), ob = Object.values(d.objects); if (!fx.some((f) => f.hidden) && !ob.some((o) => o.hidden)) return d;
  return { ...d, fixtures: Object.fromEntries(fx.filter((f) => !f.hidden).map((f) => [f.id, f])), objects: Object.fromEntries(ob.filter((o) => !o.hidden).map((o) => [o.id, o])) };
}
