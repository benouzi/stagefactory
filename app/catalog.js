// Catalogue de matériel réel. RÈGLE : chaque valeur vient d'une fiche (lien dans `src`) ; ce qui n'a pas été lu est absent (affiché « inconnu »), jamais estimé.
// base : le modèle 3D générique de la bibliothèque sur lequel la référence s'appuie ; dim : [largeur, hauteur, profondeur] en mm (le modèle générique est mis à ces dimensions).
// over : ce qui remplace les valeurs du modèle générique (flux, zoom, modes DMX en NOMBRE de canaux seulement — l'ordre des canaux n'est pas dans le catalogue, donc l'appareil
// n'est pas pilotable en DMX tant que sa personnalité n'est pas importée). srcKind : 'fabricant', 'copie' (fiche du fabricant hébergée ailleurs) ou 'revendeur'.
export const FAMILIES = [
  // clé, libellé, modèle générique, catégorie d'affichage
  ['micro', 'Micro', 'mic-perche'], ['enceinte', 'Enceinte', 'pt12'], ['retour', 'Retour de scène', 'wedge'], ['sub', 'Caisson de basses', 'sub18'],
  ['lyre-wash', 'Lyre wash', 'wash'], ['lyre-spot', 'Lyre spot / beam', 'spot'], ['par', 'PAR / projecteur LED', 'par-led'], ['decoupe', 'Découpe', 'decoupe'], ['barre', 'Barre LED', 'barre'],
  ['fumee', 'Machine à fumée / brouillard', 'gear'], ['videoproj', 'Vidéoprojecteur', 'vp12'], ['dalle-led', 'Dalle / mur LED', 'mur-led'], ['boitier', 'Appareil (boîtier)', 'gear'], ['praticable', 'Praticable', 'prat'],
];
export const CATALOG = [
  { id: 'shure-sm58', brand: 'Shure', model: 'SM58', fam: 'micro', w: 0.298, dim: [51, 51, 162], p: 0,
    spec: { Type: 'dynamique, cardioïde', 'Bande passante': '50 – 15 000 Hz', Connecteur: 'XLR 3 broches', Remarque: 'Poids du micro seul (298 g sur la fiche produit ; le guide 2017 indique 0,37 kg). Le pied dessiné n\'est pas compté.' },
    src: 'https://collegeofsanmateo.edu/theatre/docs/sm58_specsheet.pdf', srcKind: 'copie' },
  { id: 'shure-sm57', brand: 'Shure', model: 'SM57', fam: 'micro', w: 0.284, dim: [32, 32, 157], p: 0,
    spec: { Type: 'dynamique, cardioïde', 'Bande passante': '40 – 15 000 Hz', Connecteur: 'XLR 3 broches', Remarque: 'Poids du micro seul. Le pied dessiné n\'est pas compté.' },
    src: 'https://collegeofsanmateo.edu/theatre/docs/sm57_specsheet.pdf', srcKind: 'copie' },
  { id: 'l-acoustics-x12', brand: 'L-Acoustics', model: 'X12', fam: 'enceinte', w: 20, dim: [430, 496, 375], p: 0, over: { spl: 136, hd: 60, vd: 90 },
    spec: { Type: '2 voies passive coaxiale, 12" + 3"', 'Bande passante (−10 dB)': '59 Hz – 20 kHz', 'SPL max': '136 dB (preset [X12])', Directivité: '60° × 90° (H × V, fiche technique et notice ; la page produit résume à l\'inverse)', Connecteurs: 'speakON 4 points', Remarque: 'Enceinte passive : la puissance est celle du contrôleur amplifié, pas de l\'enceinte.' },
    src: 'https://l-acoustics.com/products/x12', srcKind: 'fabricant' },
  { id: 'db-m4', brand: 'd&b audiotechnik', model: 'M4', fam: 'retour', w: 20, dim: [580, 363, 505], p: 0, over: { spl: 140, hd: 50, vd: 70 },
    spec: { Type: 'retour 2 voies coaxial, 15" / 1,3"', 'Bande passante (−5 dB)': '55 Hz – 17 kHz', 'SPL max': '140 dB en actif, 138 dB en passif (D20/30D)', Dispersion: '50° × 70°, orientable', Connecteurs: '2 × NLT4', Remarque: 'Enceinte passive : pas de consommation propre.' },
    src: 'https://www.dbaudio.com/global/en/products/series/monitors/m4/', srcKind: 'fabricant' },
  { id: 'robe-megapointe', brand: 'Robe', model: 'MegaPointe', fam: 'lyre-spot', w: 22, dim: [396, 640, 230], p: 670, over: { lumens: 16008, zoom: [3, 42], modes: [['Mode 1', 39], ['Mode 2', 34]] },
    spec: { Source: 'lampe à décharge Osram Sirius HRI 470 W RO', Zoom: '1,8° – 21° en beam, 3° – 42° en spot', Flux: '16 008 lm au goniophotomètre (20 010 lm en sphère), zoom à 21°', 'Modes DMX': '39 ou 34 canaux', Consommation: '670 W à 230 V', Connecteurs: 'powerCON TRUE1, XLR 3 et 5, RJ45', Hauteur: '640 mm tête à la verticale' },
    src: 'https://www.robe.cz/api/robe/pdfs/en/product/635', srcKind: 'fabricant' },
  { id: 'martin-mac-aura-xb', brand: 'Martin', model: 'MAC Aura XB', fam: 'lyre-wash', w: 6.5, dim: [302, 360, 302], over: { lumens: 6000, zoom: [10, 60], modes: [['Standard', 14], ['Étendu', 25]] },
    spec: { Source: '19 LED RGBW', Zoom: '10° – 60°', Flux: '6 000 lm', 'Modes DMX': '14 ou 25 canaux', Hauteur: '360 mm tête droite', Remarque: 'Consommation non relevée sur une fiche du fabricant.' },
    src: 'https://soundpro.com/products/martin-lighting-90232105hu', srcKind: 'revendeur' },
  { id: 'look-unique-21', brand: 'Look Solutions', model: 'Unique 2.1', fam: 'fumee', w: 8.7, dim: [250, 250, 470], p: 1500,
    spec: { Type: 'machine à brouillard (hazer) sans compresseur', Chauffe: 'environ 60 s', Réservoir: '2 l', Commande: 'DMX 512, 0–10 V, autonome', Remarque: 'Poids sans bidon. Nombre de canaux DMX non relevé.' },
    src: 'https://www.fullcompass.com/common/files/20954-LookSolutionsUniqueHazer21SpecSheet.pdf', srcKind: 'copie' },
];
