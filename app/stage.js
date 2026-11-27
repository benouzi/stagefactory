// Atelier de prévisualisation : objets (lumière, vidéo, son, structure), bibliothèque, console, patch, documents.
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createLed } from './led.js';
import { DECOR_LIST } from './decor-list.js';
import { LA_LIB, LA_FREE } from './la-data.js';
import { CATALOG, FAMILIES } from './catalog.js';

let A, $, scene, fmt;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);

// ============================================================ bibliothèque intégrée
const CATS = { lum: 'Lumière', vid: 'Vidéo', son: 'Son', str: 'Structure & décor' };
const LIB = [
  { id: 'par-led', cat: 'lum', kind: 'par', name: 'PAR LED RGBW', lumens: 3000, zoom: [24, 24], color: 'rgb', modes: [['RGBW', 7], ['Étendu', 10]], w: 4.5, p: 180 },
  { id: 'par-zoom', cat: 'lum', kind: 'par', name: 'PAR LED zoom', lumens: 4500, zoom: [10, 50], color: 'rgb', modes: [['RGBW + zoom', 9]], w: 6, p: 250 },
  { id: 'decoupe', cat: 'lum', kind: 'prof', name: 'Découpe LED 15-30°', lumens: 8000, zoom: [15, 30], color: 'white', modes: [['Dimmer 16 bits', 2], ['Dimmer', 1]], w: 9, p: 250 },
  { id: 'decoupe-l', cat: 'lum', kind: 'prof', name: 'Découpe LED 25-50°', lumens: 8000, zoom: [25, 50], color: 'white', modes: [['Dimmer 16 bits', 2]], w: 8.5, p: 250 },
  { id: 'fresnel', cat: 'lum', kind: 'fresnel', name: 'Fresnel LED 15-55°', lumens: 9000, zoom: [15, 55], color: 'white', modes: [['Dimmer 16 bits', 2]], w: 8, p: 280 },
  { id: 'pc1k', cat: 'lum', kind: 'fresnel', name: 'PC 1 kW halogène', lumens: 7000, zoom: [10, 60], color: 'gel', modes: [['Gradateur', 1]], w: 7, p: 1000 },
  { id: 'wash', cat: 'lum', kind: 'wash', mover: true, name: 'Lyre wash LED', lumens: 8000, zoom: [6, 50], color: 'rgb', modes: [['Standard', 15], ['Étendu', 21]], w: 8, p: 350 },
  { id: 'beam', cat: 'lum', kind: 'beam', mover: true, name: 'Lyre beam', lumens: 4000, zoom: [2, 6], color: 'rgb', modes: [['Standard', 16], ['Étendu', 20]], w: 17, p: 400 },
  { id: 'spot', cat: 'lum', kind: 'spot', mover: true, name: 'Lyre spot / profile', lumens: 14000, zoom: [5, 45], color: 'rgb', modes: [['Standard', 24], ['Étendu', 32]], w: 23, p: 650 },
  { id: 'barre', cat: 'lum', kind: 'bar', name: 'Barre LED 1 m', lumens: 5000, zoom: [25, 25], color: 'rgb', modes: [['RGB', 3], ['10 pixels', 30]], w: 5, p: 150 },
  { id: 'blinder', cat: 'lum', kind: 'par', name: 'Blinder 2 lampes', lumens: 9000, zoom: [60, 60], color: 'white', modes: [['2 canaux', 2]], w: 4, p: 1300 },
  { id: 'poursuite', cat: 'lum', kind: 'prof', name: 'Poursuite 1200', lumens: 20000, zoom: [7, 14], color: 'white', modes: [['Manuelle', 0]], w: 38, p: 1500 },
  { id: 'vp7', cat: 'vid', name: 'Vidéoprojecteur 7 000 lm', lumens: 7000, throw: [1.4, 2.2], res: [1920, 1200], w: 17, p: 600 },
  { id: 'vp12', cat: 'vid', name: 'Vidéoprojecteur 12 000 lm', lumens: 12000, throw: [1.2, 2.0], res: [1920, 1200], w: 28, p: 1100 },
  { id: 'vp20', cat: 'vid', name: 'Vidéoprojecteur 20 000 lm', lumens: 20000, throw: [0.8, 3.2], res: [1920, 1200], w: 49, p: 2000 },
  { id: 'vp30', cat: 'vid', name: 'Vidéoprojecteur 30 000 lm 4K', lumens: 30000, throw: [0.9, 4.0], res: [3840, 2160], w: 92, p: 3200 },
  { id: 'vpust', cat: 'vid', name: 'VP ultra-courte focale', lumens: 6000, throw: [0.35, 0.5], res: [1920, 1200], w: 12, p: 480 },
  { id: 'la8', cat: 'son', kind: 'line', name: 'Line array 8 boîtes', boxes: 8, spl: 139, hd: 100, vd: 40, w: 208, p: 4000 },
  { id: 'la6', cat: 'son', kind: 'line', name: 'Line array 6 boîtes', boxes: 6, spl: 137, hd: 110, vd: 36, w: 150, p: 3000 },
  { id: 'pt12', cat: 'son', kind: 'point', name: 'Enceinte 12" 2 voies', spl: 129, hd: 90, vd: 60, w: 19, p: 500 },
  { id: 'pt15', cat: 'son', kind: 'point', name: 'Enceinte 15" 2 voies', spl: 132, hd: 80, vd: 50, w: 27, p: 700 },
  { id: 'sub18', cat: 'son', kind: 'sub', name: 'Sub 18"', spl: 133, hd: 360, vd: 360, w: 42, p: 1000 },
  { id: 'sub218', cat: 'son', kind: 'sub', name: 'Sub 2 × 18"', spl: 139, hd: 360, vd: 360, w: 78, p: 2000 },
  { id: 'wedge', cat: 'son', kind: 'wedge', name: 'Retour de scène 12"', spl: 127, hd: 60, vd: 40, w: 16, p: 400 },
  { id: 'mur-led', cat: 'str', kind: 'ledwall', name: 'Mur LED (configurable)', w: 400, p: 0 },
  { id: 'ecran', cat: 'str', kind: 'screen', name: 'Écran de projection', size: [6, 3.375], w: 40, p: 0 },
  { id: 'cyclo', cat: 'str', kind: 'drape', col: '#f2f2f0', name: 'Cyclorama', size: [10, 6], w: 25, p: 0 },
  { id: 'frise', cat: 'str', kind: 'drape', name: 'Frise (velours noir)', size: [12, 1.2], w: 8, p: 0 },
  { id: 'rideau-n', cat: 'str', kind: 'drape', name: 'Rideau ou pendrillon noir', size: [3, 6], w: 12, p: 0 },
  { id: 'boite', cat: 'str', kind: 'riser', name: 'Volume simple (boîte)', size: [.6, .5, .5], w: 10, p: 0 },
  { id: 'prim-plan', cat: 'str', kind: 'prim', shape: 'plane', grp: 'Formes de base', name: 'Plan (surface)', size: [2, 2, 0], w: 0, noW: true, p: 0, noP: true },
  { id: 'prim-cube', cat: 'str', kind: 'prim', shape: 'box', grp: 'Formes de base', name: 'Cube, boîte', size: [1, 1, 1], w: 0, noW: true, p: 0, noP: true },
  { id: 'prim-sphere', cat: 'str', kind: 'prim', shape: 'sphere', grp: 'Formes de base', name: 'Sphère', size: [1, 1, 1], w: 0, noW: true, p: 0, noP: true, round: true },
  { id: 'prim-cyl', cat: 'str', kind: 'prim', shape: 'cyl', grp: 'Formes de base', name: 'Cylindre', size: [1, 1, 1], w: 0, noW: true, p: 0, noP: true, round: true },
  { id: 'prim-cone', cat: 'str', kind: 'prim', shape: 'cone', grp: 'Formes de base', name: 'Cône', size: [1, 1, 1], w: 0, noW: true, p: 0, noP: true, round: true },
  { id: 'prim-pyr', cat: 'str', kind: 'prim', shape: 'pyr', grp: 'Formes de base', name: 'Pyramide', size: [1, 1, 1], w: 0, noW: true, p: 0, noP: true },
  { id: 'prim-dome', cat: 'str', kind: 'prim', shape: 'dome', grp: 'Formes de base', name: 'Dôme (demi-sphère)', size: [2, 2, 1], w: 0, noW: true, p: 0, noP: true, round: true },
  { id: 'prim-coin', cat: 'str', kind: 'prim', shape: 'wedge', grp: 'Formes de base', name: 'Coin, rampe', size: [1, 1, 0.5], w: 0, noW: true, p: 0, noP: true },
  { id: 'prim-tore', cat: 'str', kind: 'prim', shape: 'torus', grp: 'Formes de base', name: 'Tore (anneau)', size: [1, 1, 0.2], w: 0, noW: true, p: 0, noP: true, round: true },
  { id: 'gear', cat: 'str', kind: 'gear', name: 'Appareil (boîtier générique)', box: [.4, .25, .3], fp: [.4, .3], w: 0, noW: true, p: 0, noP: true },
  { id: 'truss', cat: 'str', kind: 'truss', name: 'Pont carré 30', len: 3, w: 15, p: 0 },
  { id: 'prat', cat: 'str', kind: 'riser', name: 'Praticable 2 × 1 m', size: [2, 1, 0.4], w: 35, p: 0 },
  { id: 'prat-1', cat: 'str', kind: 'riser', name: 'Praticable 1 × 1 m', size: [1, 1, 0.4], w: 20, p: 0 },
  { id: 'prat-tri', cat: 'str', kind: 'riser', shape: 'tri', name: 'Praticable triangle 1 × 1 m', size: [1, 1, 0.4], w: 12, p: 0 },
  { id: 'prat-qr', cat: 'str', kind: 'riser', shape: 'quart', name: 'Praticable quart de rond (rayon 1 m)', size: [1, 1, 0.4], w: 17, p: 0 },
  { id: 'escalier', cat: 'str', kind: 'stairs', name: 'Escalier de scène', size: [1, 1, 0.4], w: 25, p: 0 },
  { id: 'garde-corps', cat: 'str', kind: 'rail', name: 'Garde-corps', len: 2, w: 12, p: 0 },
  { id: 'jupe', cat: 'str', kind: 'drape', skirt: true, name: 'Jupe de scène', size: [2, 0.4], w: 1, p: 0 },
  { id: 'perso', cat: 'str', kind: 'person', name: 'Personne debout (homme)', w: 78, p: 0 },
  { id: 'perso-f', cat: 'str', kind: 'person', fem: true, name: 'Personne debout (femme)', w: 64, p: 0 },
  { id: 'chanteur', cat: 'str', kind: 'person', pose: 'micro', name: 'Chanteur·euse au micro', w: 70, p: 0 },
  { id: 'guitariste', cat: 'str', kind: 'person', pose: 'guitare', name: 'Guitariste', w: 76, p: 0 },
  { id: 'assis', cat: 'str', kind: 'person', pose: 'assis', name: 'Personne assise', w: 75, p: 0 },
  { id: 'mic-droit', cat: 'str', kind: 'mic', name: 'Micro sur pied droit', fp: [.3, .3], w: 3, p: 0 },
  { id: 'mic-perche', cat: 'str', kind: 'mic', boom: 1, name: 'Micro sur pied perche', fp: [.5, .7], w: 4, p: 0 },
  { id: 'mic-bas', cat: 'str', kind: 'mic', boom: 2, name: 'Micro sur petit pied (ampli, grosse caisse)', fp: [.3, .5], w: 2, p: 0 },
  { id: 'la-bump', cat: 'son', kind: 'labump', name: 'Cadre de line array (bumper)', box: [.7, .1, .5], spl: 0, hd: 0, vd: 0, p: 0, la: true },
  ...[...LA_LIB, LA_FREE].map(m => ({ id: 'lab-' + m.id, cat: 'son', kind: 'labox', brand: m.maker, name: m.name + (m.id === 'libre' ? ' (boîte de line array)' : ' (boîte)'), box: [m.w / 1000, m.h / 1000, m.d / 1000], spl: m.spl || 130, hd: m.hd, vd: m.vd || 10, w: m.kg ?? undefined, p: 0, la: true })),
  ...DECOR_LIST.map(d => ({ id: 'sf-' + d[0], cat: 'str', kind: 'sprop', key: d[0], name: d[1], grp: d[2], size: [d[3] / 1000, d[4] / 1000, d[5] / 1000], fp: [d[3] / 1000, d[4] / 1000], h: d[5] / 1000, zoff: d[6] / 1000, round: !!d[7], p: 0 })),
  { id: 'batterie', cat: 'str', kind: 'drums', name: 'Batterie 5 fûts', fp: [2, 1.8], w: 45, p: 0 },
  { id: 'ampli-g', cat: 'str', kind: 'amp', name: 'Ampli guitare combo', fp: [.62, .28], w: 22, p: 120 },
  { id: 'ampli-b', cat: 'str', kind: 'amp', stack: true, name: 'Ampli basse (tête + baffle)', fp: [.62, .42], w: 45, p: 500 },
  { id: 'clavier', cat: 'str', kind: 'keys', name: 'Clavier sur stand', fp: [1.32, .36], w: 18, p: 40 },
  { id: 'piano', cat: 'str', kind: 'piano', name: 'Piano à queue', fp: [1.55, 2.3], w: 350, p: 0 },
  { id: 'guitare-st', cat: 'str', kind: 'gstand', name: 'Guitare sur stand', fp: [.4, .4], w: 4, p: 0 },
  { id: 'pupitre', cat: 'str', kind: 'pupitre', name: 'Pupitre', fp: [.5, .4], w: 2, p: 0 },
  { id: 'regie', cat: 'str', kind: 'desk', name: 'Table de régie', size: [2, 0.8, 0.75], w: 30, p: 0 },
];
const SWATCH = ['#ffffff', '#fff0d8', '#ffb347', '#ff6a00', '#ff1e1e', '#ff2bd6', '#8a2bff', '#2a4dff', '#00b7ff', '#00ffc8', '#3dff3d'];
const FXS = { fixe: 'Fixe', balayage: 'Balayage', cercle: 'Cercle', huit: 'Huit (pan / tilt)', vague: 'Vague (dimmer)', chenillard: 'Chenillard', pulse: 'Pulsation', scintille: 'Scintillement', arc: 'Arc-en-ciel', strobe: 'Strobe' };
const LKEYS = ['dim', 'color', 'zoom', 'pan', 'tilt', 'fx', 'speed', 'fx2', 'speed2', 'fx3', 'speed3', 'amp', 'iris', 'gobo', 'gobor', 'gobos', 'focus', 'b1', 'b1r', 'b2', 'b2r', 'b3', 'b3r', 'b4', 'b4r', 'cw', 'cto', 'prism', 'prismr', 'prisms'];
/* ---- 4.57 — ce qui se place dans le plan image d'un projecteur : IRIS, COUTEAUX, GOBO. Ils découpent le faisceau pour de bon, sur les surfaces ET dans la fumée, avec le même calcul des deux côtés.
   o.iris : part du faisceau laissée ouverte (1 = ouvert, 0,15 = fermé au plus serré) ; o.b1…o.b4 : enfoncement d'un couteau (0 = sorti, 0,5 = au centre, 1 = tout fermé), o.b1r…o.b4r : son angle (° autour de sa position de repos : haut, droite, bas, gauche vus de derrière l'appareil) ;
   o.gobo : numéro du gobo (0 = aucun), o.gobor : son orientation (°), o.gobos : sa rotation continue (tours par seconde, signe = sens) ; o.focus : netteté (0 = net, 1 = très flou).
   Les gobos ci-dessous sont des motifs GÉNÉRIQUES dessinés par le logiciel, pas ceux d'un fabricant : les roues réelles viendront des fiches GDTF. */
const GOBOS = [['', 'Aucun'], ['pts', 'Points en couronne'], ['etoile', 'Étoile'], ['barres', 'Barres'], ['fenetre', 'Fenêtre'], ['feuil', 'Feuillage'], ['spir', 'Spirale'], ['tri', 'Triangles'], ['cerc', 'Cercles'], ['nuit', 'Ciel étoilé'], ['ray', 'Rayons'], ['dam', 'Damier']];
const fxCaps = t => ({ gobo: t.cat === 'lum' && (t.kind === 'spot' || t.kind === 'beam' || t.kind === 'prof'), iris: t.cat === 'lum' && (t.kind === 'spot' || t.kind === 'prof'), blades: t.cat === 'lum' && (t.kind === 'spot' || t.kind === 'prof'), wheel: t.cat === 'lum' && (t.kind === 'spot' || t.kind === 'beam'), cto: t.cat === 'lum' && (t.kind === 'spot' || t.kind === 'wash'), prism: t.cat === 'lum' && (t.kind === 'spot' || t.kind === 'beam') });
/* ---- 4.58 — couleur et prisme. o.cw : filtre de la roue de couleurs (0 = ouvert) ; o.cto : correcteur de température vers le chaud (0 … 1 = CTO plein) ; ce sont des FILTRES : ils multiplient la lumière, donc ils en retirent.
   o.prism : nombre de facettes (0 = pas de prisme), o.prismr : orientation (°), o.prisms : rotation continue (tours/s). Le prisme recopie l'image du faisceau autour de l'axe ; chaque copie reçoit une part égale du flux.
   Filtres et CTO ci-dessous sont GÉNÉRIQUES (teintes courantes, CTO ≈ 6500 K → 3200 K), pas ceux d'un fabricant. */
const CWHEEL = [['', 'Ouvert'], ['#ff2414', 'Rouge'], ['#ff8600', 'Orange'], ['#ffdf3c', 'Jaune'], ['#2fd048', 'Vert'], ['#1fc6e8', 'Cyan'], ['#2446ff', 'Bleu'], ['#d238ff', 'Magenta'], ['#ff6aa8', 'Rose'], ['#5426ff', 'Congo']].map(([h, n]) => [h, n, h ? new THREE.Color(h) : null]);
const CTOF = new THREE.Color().setRGB(.84, .50, .23), PRISMS = [0, 3, 5, 8], PRISMOFF = .95, _cf = new THREE.Color();
const FXN = 128, FXDATA = new Float32Array(6 * FXN * 4), FXD = new THREE.DataTexture(FXDATA, 6, FXN, THREE.RGBAFormat, THREE.FloatType); FXD.minFilter = FXD.magFilter = THREE.NearestFilter; FXD.needsUpdate = true;
const FXFREE = Array.from({ length: FXN }, (_, i) => FXN - 1 - i), FXU = { d: { value: FXD }, g: { value: null } };
function goboAtlas(){ if (FXU.g.value) return FXU.g.value; const C = 256, cv = document.createElement('canvas'); cv.width = cv.height = C * 4; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, C * 4, C * 4);
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  GOBOS.forEach(([k], i) => { if (!i) return; const ox = (i % 4) * C + C / 2, oy = Math.floor(i / 4) * C + C / 2, R = C * .46; g.save(); g.translate(ox, oy); g.beginPath(); g.arc(0, 0, R, 0, 7); g.clip(); g.fillStyle = g.strokeStyle = '#fff';
    const dot = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    if (k === 'pts'){ for (let a = 0; a < 8; a++) dot(Math.cos(a * Math.PI / 4) * R * .62, Math.sin(a * Math.PI / 4) * R * .62, R * .15); dot(0, 0, R * .16); }
    else if (k === 'etoile'){ g.beginPath(); for (let a = 0; a < 10; a++){ const r = a % 2 ? R * .36 : R * .92, t = a * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(t) * r, Math.sin(t) * r); } g.closePath(); g.fill(); }
    else if (k === 'barres'){ for (let x = -4; x <= 4; x += 2) g.fillRect(x * R * .13 - R * .075, -R, R * .15, R * 2); }
    else if (k === 'fenetre'){ for (const x of [-1, 1]) for (const y of [-1, 0, 1]) g.fillRect(x * R * .3 - R * .24, y * R * .42 - R * .18, R * .48, R * .36); }
    else if (k === 'feuil'){ for (let n = 0; n < 46; n++){ const a = rnd() * 7, d = Math.sqrt(rnd()) * R * .9, x = Math.cos(a) * d, y = Math.sin(a) * d; g.save(); g.translate(x, y); g.rotate(rnd() * 7); g.beginPath(); g.ellipse(0, 0, R * (.06 + rnd() * .1), R * (.025 + rnd() * .04), 0, 0, 7); g.fill(); g.restore(); } }
    else if (k === 'spir'){ g.lineWidth = R * .11; g.lineCap = 'round'; for (let arm = 0; arm < 3; arm++){ g.beginPath(); for (let t = 0; t <= 1.001; t += .02){ const a = arm * 2.094 + t * 4.4, r = R * (.08 + t * .84); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); } }
    else if (k === 'tri'){ for (let a = 0; a < 6; a++){ g.save(); g.rotate(a * Math.PI / 3); g.beginPath(); g.moveTo(0, -R * .18); g.lineTo(R * .2, -R * .86); g.lineTo(-R * .2, -R * .86); g.closePath(); g.fill(); g.restore(); } }
    else if (k === 'cerc'){ g.lineWidth = R * .1; for (const r of [.24, .52, .8]){ g.beginPath(); g.arc(0, 0, R * r, 0, 7); g.stroke(); } }
    else if (k === 'nuit'){ for (let n = 0; n < 70; n++){ const a = rnd() * 7, d = Math.sqrt(rnd()) * R * .93; dot(Math.cos(a) * d, Math.sin(a) * d, R * (.012 + rnd() * .03)); } }
    else if (k === 'ray'){ for (let a = 0; a < 12; a++){ g.save(); g.rotate(a * Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(R * .11, -R * .95); g.lineTo(-R * .11, -R * .95); g.closePath(); g.fill(); g.restore(); } }
    else if (k === 'dam'){ const q = R * .3; for (let x = -4; x < 4; x++) for (let y = -4; y < 4; y++) if ((x + y) & 1) g.fillRect(x * q, y * q, q, q); }
    g.restore(); });
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace; tx.generateMipmaps = true; tx.minFilter = THREE.LinearMipmapLinearFilter; tx.magFilter = THREE.LinearFilter; tx.flipY = false; FXU.g.value = tx; return tx; }
/* le même masque pour l'éclairage des surfaces et pour la fumée. p : position dans la section du faisceau (1 = bord du faisceau), dans les axes de l'appareil (x = sa droite, y = son haut) ; un couteau = (nx, ny, d) : éclairé là où p·n < d */
const SFMASK = `float sfBase( vec2 p, vec3 b1, vec3 b2, vec3 b3, vec3 b4, float gi, float gr, float fo, sampler2D gob ){ float s = 0.006 + fo * 0.28, m = 1.0;
  m *= 1.0 - smoothstep( -s, s, dot( p, b1.xy ) - b1.z ); m *= 1.0 - smoothstep( -s, s, dot( p, b2.xy ) - b2.z ); m *= 1.0 - smoothstep( -s, s, dot( p, b3.xy ) - b3.z ); m *= 1.0 - smoothstep( -s, s, dot( p, b4.xy ) - b4.z );
  if ( gi > 0.5 && m > 0.0 ){ float c = cos( gr ), sn = sin( gr ); vec2 q = vec2( c * p.x - sn * p.y, sn * p.x + c * p.y ); if ( dot( q, q ) >= 1.0 ) return 0.0;
    vec2 cell = vec2( mod( gi, 4.0 ), floor( gi / 4.0 ) ); m *= textureLod( gob, ( cell + clamp( q * 0.5 + 0.5, 0.01, 0.99 ) ) * 0.25, fo * 5.0 ).r; }
  return m; }
/* pz : prisme (nombre de facettes, orientation, écart des copies en rayons de faisceau). Sans prisme : le masque simple. Avec : n copies de l'image, chacune avec son bord de disque, chacune 1/n du flux */
float sfMask( vec2 p, vec3 b1, vec3 b2, vec3 b3, vec3 b4, float gi, float gr, float fo, sampler2D gob, vec3 pz ){ if ( pz.x < 1.5 ) return sfBase( p, b1, b2, b3, b4, gi, gr, fo, gob );
  float m = 0.0; for ( int i = 0; i < 8; i ++ ){ if ( float( i ) > pz.x - 0.5 ) break; float a = pz.y + 6.2831853 * float( i ) / pz.x; vec2 q = p - pz.z * vec2( cos( a ), sin( a ) ); float e = 1.0 - smoothstep( 0.95 - fo * 0.3, 1.0, length( q ) ); if ( e > 0.0 ) m += e * sfBase( q, b1, b2, b3, b4, gi, gr, fo, gob ); }
  return m / pz.x; }
`;
function fxFree(r){ if (r.fxI != null){ FXFREE.push(r.fxI); r.fxI = null; } }
const LNUM = ['dim', 'zoom', 'pan', 'tilt', 'speed', 'speed2', 'speed3', 'amp', 'iris', 'gobor', 'gobos', 'focus', 'b1', 'b1r', 'b2', 'b2r', 'b3', 'b3r', 'b4', 'b4r', 'cto', 'prismr', 'prisms'];
const SLOTS = [['fx2', 'speed2', 'fp2'], ['fx3', 'speed3', 'fp3']];          // effets supplémentaires, cumulés avec le premier

// ============================================================ état
const S = { objs: [], lib: [], cues: [], master: 1, haze: .5, black: false, name: 'Démo — concert' };
const RT = new Map();          // id -> objets three
const MEDIA = new Map();       // id d'objet -> { el, kind } (image / vidéo choisie par l'utilisateur)
const UI = { tab: 'lib', libCat: 'lum', sel: [], placing: null, serie: 1, serieStep: 0, serieSym: false, blkCols: 2, blkRows: 2, blkH: .4, blkRot: false, aiming: false, labels: false, spl: false, cov: false, gizmo: 'translate', t: 0, fade: null, cue: -1 };
const undoStack = [], redoStack = [];
const layHid = o => { const L = S.layers; if (!L) return false; const c = L._c; if (o.ly && c && Array.isArray(c.custom) && c.custom.some(x => x.id === o.ly)) return !!(c.vis && c.vis[o.ly] === false);   /* rangé dans un calque à soi (layers.js) */ const t = typeOf(o); return L[t.kind === 'sprop' ? 'dec' : t.cat] === false; };
// ---- catalogue de références réelles (catalog.js) et modèles de l'utilisateur : une référence = un modèle générique + ses valeurs lues sur une fiche
const FAM = new Map(FAMILIES.map(f => [f[0], f])), refKey = (b, m) => (String(b || '') + ' ' + String(m || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function refType(c, user){ const fam = FAM.get(c.fam), b = fam && LIB.find(t => t.id === (c.fam === 'micro' && c.mic === 'grave' ? 'mic-bas' : fam[2])); if (!b) return null;
  const t = { ...JSON.parse(JSON.stringify(b)), ...(c.over || {}), id: (user ? 'm-' : 'c-') + (c.id || refKey(c.brand, c.model)), name: c.model, brand: c.brand, fam: c.fam, base: b.id, w: c.w ?? 0, p: c.p ?? 0, dim: c.dim || null, src: c.src || '', srcKind: c.srcKind || '', spec: c.spec || {}, def: c };
  if (c.mic) t.micShape = c.mic; if (b.kind === 'gear') t.shape = { console: 'console', rack: 'rack', di: 'di', moteur: 'hoist', levage: 'lift', 'dalle-led': 'panel', fumee: 'fog' }[c.fam] || 'box';
  if (user) t.userCat = true; else t.catalog = true; if (c.w == null) t.noW = true; else delete t.noW; if (c.p == null) t.noP = true; else delete t.noP;
  if (b.kind === 'gear'){ const D0 = { console: [.9, .22, .6], rack: [.483, .088, .4], di: [.13, .05, .1], hoist: [.3, .32, .28], lift: [1.2, 1.8, 1.2], panel: [.5, .5, .08], fog: [.25, .25, .47] }[t.shape] || b.box; t.box = c.dim ? c.dim.map(v => v / 1000) : D0; t.fp = [t.box[0], t.box[2]]; if (!c.dim) t.noDim = true; }
  if (b.cat === 'lum'){ t.modes = c.over && c.over.modes ? c.over.modes : [['DMX non décrit', 0]]; t.chs = t.modes.map(() => []); t.noDmx = true; if (t.modes.every(m => m[1] === 1)){ t.chs = t.modes.map(() => ['dim']); delete t.noDmx; t.color = 'gel'; } if (c.noZoom) t.noZoom = true; if (c.noLm) t.noLm = true; }      // nombre de canaux connu, ordre inconnu : pas pilotable (sauf un simple gradateur)
  if (b.cat === 'son' && !(c.over && c.over.spl)) t.noSpl = true; if (b.cat === 'vid' && !(c.over && c.over.throw)) t.noThrow = true;
  if (b.kind === 'riser' && (c.dim || c.plat)){ const q = c.dim ? [c.dim[0], c.dim[2]] : c.plat; t.size = [q[0] / 1000, q[1] / 1000, b.size[2]]; } return t; }
for (const c of CATALOG){ const t = refType(c); if (t) LIB.push(t); }
const refTypes = () => [...LIB, ...S.lib].filter(t => t.catalog || t.userCat).sort((a, b) => (a.brand + ' ' + a.name).localeCompare(b.brand + ' ' + b.name, 'fr', { numeric: true })), refDup = (b, m, not) => [...LIB, ...S.lib].find(t => t.id !== not && t.brand && refKey(t.brand, t.name) === refKey(b, m));
// ---- modèles génériques des appareils en boîtier : la silhouette dit ce que c'est, les cotes sont celles de la fiche (ou un gabarit signalé si elles manquent)
function gearModel(t, r){ const [w, h, d] = t.box, sh = t.shape || 'box', H = r.head, add = (...m) => H.add(...m), rad = Math.min(.012, w / 8, h / 8, d / 8);
  if (sh === 'console'){ const y0 = .74, s2 = new THREE.Shape(); s2.moveTo(-d / 2, 0); s2.lineTo(d / 2, 0); s2.lineTo(d / 2, h * .32); s2.lineTo(-d * .22, h * .78); s2.lineTo(-d / 2, h); s2.closePath();
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s2, { depth: w, bevelEnabled: false }), M.body); body.rotation.y = -Math.PI / 2; body.position.set(w / 2, y0, 0); add(body);
    const sl = Math.atan2(h * .46, d * .72), n = Math.max(2, Math.min(8, Math.round(w / .16))); for (let i = 0; i < n; i++){ const st = box(w / n * .78, .004, d * .6, M.steel, -w / 2 + (i + .5) * w / n, y0 + h * .55 + .004, d * .14); st.rotation.x = sl; add(st); }
    const scr = box(w * .34, h * .5, .012, M.glass, 0, y0 + h * 1.02, -d * .42); scr.rotation.x = -.25; add(scr);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(box(.03, y0, .03, M.steel, sx * (w / 2 - .05), y0 / 2, sz * (d / 2 - .05))); add(box(w, .025, d, M.body, 0, y0 - .0125, 0)); return; }
  if (sh === 'rack'){ H.position.y = h / 2; add(rbox(w, h, d, M.body, 0, 0, 0, rad), box(Math.max(w, .483), h * .96, .004, M.steel, 0, 0, d / 2 + .002)); for (const sx of [-1, 1]) add(box(.012, h * .5, .03, M.body, sx * (Math.max(w, .483) / 2 - .02), 0, d / 2 + .018)); const k = Math.max(1, Math.round(h / .044)); for (let i = 0; i < Math.min(k, 6); i++) add(box(w * .5, .003, .002, M.body, 0, -h / 2 + (i + .5) * h / Math.min(k, 6), d / 2 + .005)); return; }
  if (sh === 'di'){ H.position.y = h / 2; add(rbox(w, h, d, M.steel, 0, 0, 0, Math.min(.004, rad)), box(w * .8, h * .5, .002, M.body, 0, 0, d / 2 + .001)); for (const sx of [-1, 1]) add(cylAt(h * .16, h * .16, .008, M.body, 0, 10).rotateX(Math.PI / 2).translateY(d / 2 + .004).translateX(sx * w * .22)); return; }
  if (sh === 'hoist'){ H.position.y = h / 2 + .12; add(rbox(w, h, d, M.body, 0, 0, 0, rad), box(w * .5, h * .5, .004, M.steel, 0, 0, d / 2 + .002), cylAt(.008, .008, 1.1, M.steel, h / 2 + .55, 8), cylAt(.008, .008, .1, M.steel, -h / 2 - .05, 8));
    const hk = new THREE.Mesh(new THREE.TorusGeometry(.03, .008, 6, 14, Math.PI * 1.5), M.steel); hk.position.y = -h / 2 - .12; add(hk); const hk2 = hk.clone(); hk2.position.y = h / 2 + 1.12; hk2.rotation.z = Math.PI; add(hk2); add(rbox(w * .6, h * .5, d * .5, M.cab || M.body, w * .62, -h * .3, 0, rad)); return; }
  if (sh === 'lift'){ const mh = h, mw = Math.min(.14, w * .12); add(box(mw, mh, mw, M.steel, 0, mh / 2 + .05, 0), box(mw * .7, mh * .3, mw * .7, M.body, 0, mh + .05 + mh * .1, 0), box(mw * 2.6, .02, mw * 1.2, M.steel, 0, mh * 1.25 + .05, 0));
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]){ const L = Math.hypot(w, d) / 2, lg = box(.035, .035, L, M.steel, sx * w / 4, .06, sz * d / 4); lg.rotation.y = Math.atan2(sx * w, sz * d); add(lg); add(cylAt(.03, .03, .05, M.body, .025, 10).translateX(sx * w / 2).translateZ(sz * d / 2)); } return; }
  if (sh === 'panel'){ H.position.y = h / 2; add(box(w, h, d * .35, M.glass, 0, 0, d * .325), box(w * .98, h * .98, d * .3, M.body, 0, 0, 0)); for (const a of [-1, 1]){ const br = box(Math.hypot(w, h) * .9, .02, d * .3, M.steel, 0, 0, -d * .32); br.rotation.z = a * Math.atan2(h, w); add(br); } add(box(w * .3, h * .18, d * .3, M.body, 0, 0, -d * .35)); return; }
  H.position.y = h / 2; add(rbox(w, h, d, M.body, 0, 0, 0, rad), box(w * .7, h * .18, .006, M.steel, 0, h * .2, d / 2 + .003), box(w * .5, .012, .02, M.steel, 0, h / 2 + .02, 0));
  if (sh === 'fog') add(cylAt(Math.min(w, h) * .14, Math.min(w, h) * .14, .04, M.steel, 0, 12).rotateX(Math.PI / 2).translateY(d / 2 + .02)); }
// ---- le modèle 3D d'une fiche GDTF remplace le modèle générique dès qu'il est lu (une lecture par type)
const G3D = new Map(), G3DR = new Map();
// les fichiers GDTF importés sont gardés dans le navigateur (IndexedDB) : sans eux, plus de modèle 3D ni d'aperçu après un rechargement de la page
const rawDb = () => new Promise((ok, ko) => { const r = indexedDB.open('stagefactory-gdtf', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
async function rawPut(id, buf){ try { const d = await rawDb(); await new Promise((ok, ko) => { const t = d.transaction('f', 'readwrite'); t.objectStore('f').put(buf, id); t.oncomplete = ok; t.onerror = () => ko(t.error); }); d.close(); } catch (_){ } }
async function rawGet(id){ try { const d = await rawDb(), v = await new Promise((ok, ko) => { const q = d.transaction('f').objectStore('f').get(id); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); }); d.close(); return v || null; } catch (_){ return null; } }
function rawRestore(){ for (const t of S.lib){ if (!t.gdtf || t.raw) continue; rawGet(t.id).then(b => { if (!b || t.raw || !S.lib.includes(t)) return; t.raw = b instanceof Uint8Array ? b : new Uint8Array(b); delete t.g3d; G3D.delete(t.id); window.THUMBS?.drop(t.id); for (const o of S.objs) if (o.type === t.id && RT.has(o.id)) rebuild(o); render(); }); } }
function gdtfModel(t){ if (!G3D.has(t.id)) G3D.set(t.id, (async () => { let g = null; try { const [m, z] = await Promise.all([import('./gdtf3d.js'), zipLib()]); g = await m.buildGdtfModel(t.raw, z.unzipSync); } catch (e){ g = null; } t.g3d = !!g; G3DR.set(t.id, g); return g; })()); return G3D.get(t.id); }
function gdtfApply(o, r, g, hung){ const inner = g.root.clone(true), wrap = new THREE.Group(); wrap.add(inner);
  if (!hung){ inner.rotation.x = Math.PI; inner.updateMatrixWorld(true); inner.position.y -= new THREE.Box3().setFromObject(inner).min.y; }
  for (const c of [...r.root.children]) c.traverse(m => { if (m.isMesh) m.visible = false; }); r.root.add(wrap); r.gdtf = wrap; inner.traverse(n => { if (n.name === 'sf-pan') r.gPan = n; else if (n.name === 'sf-tilt') r.gTilt = n; if (n.isMesh){ n.castShadow = true; n.userData.oid = o.id; } }); r.dirty = true; }
function gdtfSwap(o, t, r, hung){ if (G3DR.has(t.id)){ const g = G3DR.get(t.id); if (g) gdtfApply(o, r, g, hung); return; }
  gdtfModel(t).then(g => { window.THUMBS?.drop(t.id); if (g && RT.get(o.id) === r) gdtfApply(o, r, g, hung); render(); }); }
/* lyre aux dimensions réelles : tout l'appareil est agrandi d'UN seul facteur (sa hauteur, tête dressée à l'opposé du socle) — une pièce qui tourne ne peut pas être étirée différemment selon les axes sans se déformer en tournant ; seul le socle, fixe, est ensuite ajusté en largeur et en profondeur */
function fitMover(r, dim, hung){ const root = r.root, par = root.parent, pos = root.position.clone(), q = root.quaternion.clone(); if (par) par.remove(root); root.position.set(0, 0, 0); root.quaternion.identity(); root.scale.set(1, 1, 1); r.baseG.scale.set(1, 1, 1); r.yoke.rotation.set(0, 0, 0); r.head.rotation.set(hung ? 0 : Math.PI, 0, 0); root.updateMatrixWorld(true);
  const s = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()), k = s.y > 1e-3 ? dim[1] / 1000 / s.y : 1; root.scale.setScalar(k); const b = new THREE.Box3().setFromObject(r.baseG).getSize(new THREE.Vector3());
  if (b.x > 1e-3 && b.z > 1e-3) r.baseG.scale.set(clamp(dim[0] / 1000 / (b.x * k), .6, 1.8), 1, clamp(dim[2] / 1000 / (b.z * k), .6, 1.8)); r.head.rotation.set(0, 0, 0); root.position.copy(pos); root.quaternion.copy(q); if (par) par.add(root); }
function fitDim(obj, dim){ const par = obj.parent, pos = obj.position.clone(), q = obj.quaternion.clone(); if (par) par.remove(obj); obj.position.set(0, 0, 0); obj.quaternion.identity(); obj.scale.set(1, 1, 1); obj.updateMatrixWorld(true);
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()); if (s.x > 1e-3 && s.y > 1e-3 && s.z > 1e-3) obj.scale.set(dim[0] / 1000 / s.x, dim[1] / 1000 / s.y, dim[2] / 1000 / s.z); obj.position.copy(pos); obj.quaternion.copy(q); if (par) par.add(obj); }
const typeOf = o => S.lib.find(t => t.id === o.type) || LIB.find(t => t.id === o.type) || LIB[0];
const byId = id => S.objs.find(o => o.id === id);
const weightOf = o => o.w ?? typeOf(o).w ?? 0;
const powerOf = o => { const t = typeOf(o); return t.kind === 'ledwall' && LEDW ? Math.round(LEDW.info(o).wmax / 3) : t.p || 0; };          // mur LED : puissance moyenne
const selObjs = () => UI.sel.map(byId).filter(Boolean);
const dirOf = (pan, tilt, v = new THREE.Vector3()) => { const p = pan * D2R, t = tilt * D2R; return v.set(Math.sin(t) * Math.sin(p), -Math.cos(t), Math.sin(t) * Math.cos(p)).normalize(); };
const posOf = (o, v = new THREE.Vector3()) => v.set(o.pos[0], o.pos[1] + (o.hang === 'perche' ? A.percheDeltaAt(o.pos[2]) : 0), o.pos[2]);

// ============================================================ matériaux et géométries partagés
const M = {};
function mats(){
  M.body = new THREE.MeshStandardMaterial({ color: '#17171a', roughness: .42, metalness: .6 });
  M.steel = new THREE.MeshStandardMaterial({ color: '#8d9299', roughness: .35, metalness: .9 });
  M.cab = new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: .72 });
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gx = gc.getContext('2d'); gx.fillStyle = '#9a9a9a'; gx.fillRect(0, 0, 64, 64); gx.fillStyle = '#1c1c1c';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++){ gx.beginPath(); gx.arc(x * 16 + (y % 2 ? 12 : 4), y * 16 + 8, 4.6, 0, 7); gx.fill(); }
  const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(14, 10); gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = 8;
  M.grille = new THREE.MeshStandardMaterial({ color: '#3a3a3d', roughness: .55, metalness: .5, map: gt, bumpMap: gt, bumpScale: .6 });
  M.brass = new THREE.MeshStandardMaterial({ color: '#c9a03c', roughness: .28, metalness: .95 });
  M.glass = new THREE.MeshStandardMaterial({ color: '#0a0c10', roughness: .08, metalness: .9 });
  M.vp = new THREE.MeshStandardMaterial({ color: '#e9e9ea', roughness: .5 });
  M.screen = new THREE.MeshStandardMaterial({ color: '#f2f2f0', roughness: 1, side: THREE.DoubleSide });
  M.frame = new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: .7 }); M.drape = new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 1, side: THREE.DoubleSide });
  M.deck = new THREE.MeshStandardMaterial({ color: '#2a2928', roughness: .7 });
  M.person = new THREE.MeshStandardMaterial({ color: '#7b808c', roughness: .85 });
  M.sel = new THREE.LineBasicMaterial({ color: '#2affd0', depthTest: false });
  M.cov = new THREE.LineBasicMaterial({ color: '#19b6c9', transparent: true, opacity: .8 });
  M.vfr = new THREE.LineBasicMaterial({ color: '#b48cff', transparent: true, opacity: .9 });
}
const PAL = { skin: ['#e6b89a', '#d29a78', '#b9805c', '#8a5a3c', '#f0c8ae'], top: ['#1c1c20', '#2f3a52', '#6d2a2a', '#d9d6cf', '#3d5a45', '#55555c', '#7a6a4a', '#243b4a'], legs: ['#1a1a1d', '#262b38', '#3a3f4a', '#4a3f33', '#15171c'], hair: ['#17120e', '#3a2616', '#6b4a2a', '#9a8a78', '#111113', '#b08a4a'] };
const PM = new Map();
const pmat = (c, rough = .85) => { const k = c + rough; if (!PM.has(k)) PM.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: rough })); return PM.get(k); };
const hstr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// personnage : proportions humaines, vêtements, cheveux, mains et chaussures ; pose debout, micro, guitare ou assis
function human(o, t){
  const g = new THREE.Group(), h = hstr(o.id), pick = (a, sh) => a[(h >>> sh) % a.length], fem = t.fem ?? ((h >>> 20) % 2 === 1 && t.pose !== undefined);
  const skin = pmat(pick(PAL.skin, 0), .7), top = pmat(pick(PAL.top, 3), .9), legs = pmat(pick(PAL.legs, 7), .9), hair = pmat(pick(PAL.hair, 11), .75), shoe = pmat('#0f0f11', .6), dark = pmat('#101012', .5);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), sit = t.pose === 'assis', dy = sit ? -.42 : 0, sw = fem ? .9 : 1, hw = fem ? 1.08 : 1;
  const limb = (a, b, r0, r1, m, seg = 12) => { const d = b.clone().sub(a), L = d.length(), c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, seg), m); c.position.copy(a).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(UP, d.normalize()); g.add(c); const j = new THREE.Mesh(new THREE.SphereGeometry(r1, seg, 8), m); j.position.copy(b); g.add(j); };
  const ball = (p, r, m, sx = 1, sy = 1, sz = 1) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); b.position.copy(p); b.scale.set(sx, sy, sz); g.add(b); return b; };
  // jambes et chaussures
  for (const sx of [-1, 1]){ const x = sx * .092 * hw, hip = V(x, .9 + dy, 0), knee = sit ? V(x * 1.1, .5, .4) : V(x, .5, .012), ank = sit ? V(x * 1.1, .09, .42) : V(x * .95, .09, -.01);
    ball(hip, .088 * hw, legs); limb(hip, knee, .086 * hw, .058, legs); limb(knee, ank, .056, .042, legs);
    const sh = rbox(.095, .075, .27, shoe, ank.x, .038, ank.z + .07, .03); g.add(sh); }
  // bassin et buste (profil de révolution aplati)
  ball(V(0, .915 + dy, 0), .165, legs, .98 * hw, .56, .68); { const belt = cylAt(.146, .15, .035, dark, .965 + dy, 20); belt.scale.set(1.12 * sw, 1, .66); g.add(belt); }
  const pr = fem ? [[.118, .96], [.112, 1.06], [.128, 1.2], [.15, 1.3], [.158, 1.38], [.13, 1.44], [.06, 1.475], [.05, 1.49]] : [[.142, .96], [.138, 1.08], [.158, 1.22], [.175, 1.33], [.178, 1.4], [.14, 1.45], [.065, 1.48], [.055, 1.495]];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(r, y)), 22), top); torso.scale.set(1.12 * sw, 1, .66); torso.position.y = dy; g.add(torso);
  if (fem) for (const sx of [-1, 1]) ball(V(sx * .064, 1.275 + dy, .058), .058, top, 1.05, .9, .7);
  // cou, tête, visage, cheveux
  limb(V(0, 1.47 + dy, 0), V(0, 1.56 + dy, .008), .05, .046, skin);
  const hy = 1.645 + dy; ball(V(0, hy, .012), .1, skin, .9, 1.16, 1.02); ball(V(0, hy - .048, .024), .083, skin, .88, .92, .97);                       // crâne, mâchoire
  ball(V(0, hy - .012, .108), .016, skin, .8, 1.2, 1); g.add(box(.04, .005, .004, pmat('#7a3f38', .6), 0, hy - .058, .1)); for (const sx of [-1, 1]) g.add(box(.026, .005, .004, hair, sx * .034, hy + .03, .094)); for (const sx of [-1, 1]){ ball(V(sx * .034, hy + .012, .092), .0085, dark); ball(V(sx * .09, hy - .005, .005), .022, skin, .45, 1, .7); }
  const hc = new THREE.Mesh(new THREE.SphereGeometry(.106, 20, 12, 0, Math.PI * 2, 0, Math.PI * .47), hair); hc.position.set(0, hy + .014, .006); hc.scale.set(.94, 1.15, 1.05); hc.rotation.x = -.62; g.add(hc);
  if (fem || (h >>> 15) % 4 === 0) ball(V(0, hy - .07, -.062), .095, hair, .95, 1.5, .62);                                                          // cheveux longs
  // bras : épaule, coude, poignet, main
  const arm = (sx, el, wr, hand) => { const sh = V(sx * .205 * sw, 1.405 + dy, 0); ball(sh, .054, top); limb(sh, el, .05, .042, top); limb(el, wr, .041, .031, (h >>> 17) % 3 ? top : skin); ball(hand, .046, skin, .62, 1.15, .42); };
  const down = sx => arm(sx, V(sx * .235 * sw, 1.11 + dy, -.01), V(sx * .225 * sw, .86 + dy, .05), V(sx * .22 * sw, .78 + dy, .065));
  if (sit){ for (const sx of [-1, 1]) arm(sx, V(sx * .23, 1.12 + dy, .04), V(sx * .15, .98 + dy, .27), V(sx * .13, .96 + dy, .34)); }
  else if (t.pose === 'micro'){ down(-1); arm(1, V(.27, 1.16, .08), V(.12, 1.4, .2), V(.085, 1.46, .215));
    const mic = cyl(.016, .013, .15, dark, 10); mic.position.set(.07, 1.5, .2); mic.rotation.set(.5, 0, .35); const mh = new THREE.Mesh(new THREE.SphereGeometry(.027, 12, 10), M.steel); mh.position.set(.045, 1.565, .165); g.add(mic, mh); }
  else if (t.pose === 'guitare'){ arm(-1, V(-.3, 1.2, .1), V(-.42, 1.13, .26), V(-.47, 1.15, .3)); arm(1, V(.26, 1.15, .1), V(.12, 1.02, .24), V(.07, 1.0, .25));
    const gt = guitar(pick(['#7a2a1c', '#c9a15a', '#1c1c1e', '#2d4a6a'], 13));

    gt.rotation.z = 1.18; gt.position.set(.12, 1.0, .19); g.add(gt); }
  else { down(-1); down(1); }
  if (sit){ g.add(rbox(.42, .04, .42, dark, 0, .47, .0, .015)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cylAt(.014, .014, .46, M.steel, .23, 8)), g.children.at(-1).position.set(sx * .18, .23, sz * .18); }
  const k = .95 + ((h >>> 22) % 9) * .0115 - (fem ? .045 : 0); g.scale.setScalar(k);
  return g;
}
function guitar(col){ const gt = new THREE.Group(), wood = pmat(col, .35), nk = pmat('#2a1c12', .6), b1 = cyl(.185, .185, .05, wood, 28), b2 = cyl(.14, .14, .05, wood, 28), hole = cyl(.04, .04, .004, pmat('#101012', .5), 14);
  b1.rotation.x = b2.rotation.x = hole.rotation.x = Math.PI / 2; b2.position.y = .24; hole.position.set(0, .08, .027);
  gt.add(b1, b2, hole, box(.045, .55, .025, nk, 0, .62, .005), rbox(.065, .16, .025, nk, 0, .96, 0, .01), box(.03, .5, .004, M.steel, 0, .6, .019)); return gt; }
// instruments et micros
function instrument(o, t){
  const g = new THREE.Group(), k = t.kind, h = hstr(o.id), dark = pmat('#101012', .5), blk = pmat('#17171a', .6), white = pmat('#e9e7e0', .6);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tube = (a, b, r = .011, m = M.steel) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(), c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), m); c.position.copy(a).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(UP, d.normalize()); g.add(c); };
  const put = (m, x, y, z, rx = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; };
  const tripod = (x, z, top, r = .28) => { tube(V(x, .12, z), V(x, top, z), .012); for (let i = 0; i < 3; i++){ const a = i * 2.094 + .5; tube(V(x, .3, z), V(x + Math.cos(a) * r, .01, z + Math.sin(a) * r), .009); } };
  const micro = (p, dir) => { dir = dir.clone().normalize(); const sh = t.micShape || 'boule', D = t.dim ? Math.min(...t.dim) / 1000 : 0, L = t.dim ? Math.max(...t.dim) / 1000 : 0, along = (m, a) => { m.quaternion.setFromUnitVectors(UP, dir); m.position.copy(p).addScaledVector(dir, a); g.add(m); };
    if (sh === 'crayon'){ const r = (D || .021) / 2, l = L || .11; along(cyl(r, r, l * .8, M.steel, 12), l * .4 - .03); along(cyl(r * 1.02, r * 1.02, l * .2, dark, 12), l * .9 - .03); }
    else if (sh === 'large' || sh === 'grave'){ if (sh === 'large') dir.set(0, 1, 0); const r = (D || (sh === 'grave' ? .09 : .056)) / 2, l = L || (sh === 'grave' ? .15 : .2); along(cyl(r, r * .92, l * .55, sh === 'grave' ? dark : M.steel, 16), l * .275 - .02); along(cyl(r * 1.04, r * 1.04, l * .45, M.grille, 16), l * .775 - .02); }
    else { const hd = D || .051, l = L || .162, m = cyl(Math.min(.02, hd * .38), Math.min(.016, hd * .3), l - hd * .8, dark, 10), s = new THREE.Mesh(new THREE.SphereGeometry(hd / 2, 14, 10), M.steel); along(m, (l - hd * .8) / 2 - .05); along(s, l - hd * .5 - .05); } };
  const knobs = (y, z) => { for (let i = 0; i < 6; i++) put(cyl(.012, .012, .014, dark, 10), -.2 + i * .08, y, z, Math.PI / 2); };
  const keysRow = (n, x0, w, y, z, d) => { for (let i = 0; i < n; i++) if ([1, 2, 4, 5, 6].includes(i % 7)) g.add(box(w / n * .55, .014, d, dark, x0 + i * (w / n), y, z)); };
  if (k === 'mic' && t.micShape === 'plat'){ const d = t.dim ? t.dim.map(v => v / 1000) : [.095, .02, .14]; g.add(rbox(d[0], d[1], d[2], dark, 0, d[1] / 2, 0, .004), box(d[0] * .7, .003, d[2] * .5, M.grille, 0, d[1] + .001, 0));
  } else if (k === 'mic'){
    if (!t.boom){ g.add(cylAt(.13, .14, .025, blk, .0125, 24)); tube(V(0, .02, 0), V(0, 1.5, 0), .011); micro(V(0, 1.55, .035), V(0, .55, .8)); }
    else if (t.boom === 1){ tripod(0, 0, 1.25); g.add(cylAt(.022, .022, .05, blk, 1.26, 10)); tube(V(0, 1.2, -.22), V(0, 1.52, .5), .009); micro(V(0, 1.535, .54), V(0, .25, 1)); }
    else { g.add(cylAt(.11, .12, .025, blk, .0125, 20)); tube(V(0, .02, 0), V(0, .32, 0), .011); tube(V(0, .3, -.08), V(0, .42, .34), .009); micro(V(0, .43, .38), V(0, .1, 1)); }
  } else if (k === 'drums'){
    const shell = pmat(['#7a1818', '#16161a', '#1f3a5a', '#b8b4aa', '#5a3418'][h % 5], .28);
    const drum = (x, y, z, r, d, rx = 0, rz = 0, kick) => { const gr = new THREE.Group(); gr.add(cylAt(r, r, d, shell, 0, 28), cylAt(r + .008, r + .008, .018, M.steel, d / 2 - .004, 28), cylAt(r + .008, r + .008, .018, M.steel, -d / 2 + .004, 28), cylAt(r - .006, r - .006, .004, white, d / 2 + .006, 28)); if (kick) gr.add(cylAt(r - .006, r - .006, .004, blk, -d / 2 - .006, 28)); put(gr, x, y, z, rx, rz); };
    const cymb = (x, y, z, r, rx, rz, hat) => { put(cyl(r * .2, r, .022, M.brass, 28), x, y, z, rx, rz); if (hat) put(cyl(r, r * .2, .022, M.brass, 28), x, y - .028, z); tripod(x, z, y - .02, .24); };
    g.add(rbox(2, .012, 1.8, pmat('#2a2326', .95), 0, .006, -.15, .005));
    drum(0, .3, .15, .28, .42, -Math.PI / 2, 0, true); for (const sx of [-1, 1]) tube(V(sx * .2, .14, .36), V(sx * .34, .01, .52), .009);
    drum(-.4, .6, -.3, .178, .14, .08); tripod(-.4, -.3, .52, .2);
    drum(-.17, .82, .08, .13, .2, .45, .12); drum(.17, .84, .08, .15, .23, .45, -.12); tube(V(0, .58, .12), V(0, .78, .1), .014);
    drum(.5, .42, -.28, .2, .38); for (let i = 0; i < 3; i++) tube(V(.5 + Math.cos(i * 2.09) * .2, .5, -.28 + Math.sin(i * 2.09) * .2), V(.5 + Math.cos(i * 2.09) * .25, .01, -.28 + Math.sin(i * 2.09) * .25), .007);
    cymb(-.68, .88, -.2, .175, 0, 0, true); cymb(-.55, 1.3, .32, .22, .28, .2); cymb(.68, 1.12, .22, .26, .25, -.18);
    put(cyl(.16, .16, .07, blk, 20), 0, .5, -.65); tripod(0, -.65, .47, .2);
    g.add(box(.09, .02, .28, M.steel, .08, .012, -.22), box(.09, .02, .28, M.steel, -.6, .012, -.42));
  } else if (k === 'amp'){
    const tolex = pmat(['#141416', '#2b2420', '#1c2630'][h % 3], .85);
    if (t.stack){ g.add(rbox(.62, .8, .42, tolex, 0, .42, 0, .02), box(.56, .72, .012, M.grille, 0, .42, .207), rbox(.6, .22, .3, tolex, 0, .93, 0, .02), box(.54, .07, .008, M.steel, 0, .95, .152), box(.2, .02, .04, dark, 0, 1.05, 0)); knobs(.95, .16); }
    else { g.add(rbox(.62, .5, .28, tolex, 0, .25, 0, .02), box(.56, .34, .012, M.grille, 0, .2, .137), box(.56, .06, .008, M.steel, 0, .43, .138), box(.22, .02, .04, dark, 0, .51, 0)); knobs(.43, .146); }
  } else if (k === 'keys'){
    g.add(rbox(1.3, .09, .32, blk, 0, .9, 0, .015), box(1.22, .012, .13, white, 0, .947, .08), box(.5, .004, .1, M.glass, 0, .947, -.08)); keysRow(36, -.6, 1.22, .956, .05, .08);
    for (const sx of [-1, 1]){ tube(V(sx * .45, .02, -.2), V(sx * .45, .84, .14), .014, blk); tube(V(sx * .45, .02, .14), V(sx * .45, .84, -.2), .014, blk); tube(V(sx * .45, .84, -.2), V(sx * .45, .84, .14), .014, blk); tube(V(sx * .45, .02, -.2), V(sx * .45, .02, .14), .014, blk); }
    tube(V(-.45, .43, -.03), V(.45, .43, -.03), .012, blk);
  } else if (k === 'piano'){
    const lac = pmat('#0b0b0d', .12), sh = new THREE.Shape(); sh.moveTo(-.75, 0); sh.lineTo(.75, 0); sh.lineTo(.75, .55); sh.bezierCurveTo(.75, 1.1, .3, 1.2, .25, 1.6); sh.bezierCurveTo(.2, 2.1, -.2, 2.25, -.5, 2.1); sh.bezierCurveTo(-.75, 1.95, -.75, 1.6, -.75, 1.2); sh.closePath();
    // la forme est tracée vue de dessus : clavier côté public (z+), queue vers le lointain
    const flat = (depth, bevel) => { const ge = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel, bevelSize: .012, bevelThickness: .012, bevelSegments: 2, curveSegments: 20 }); ge.rotateX(-Math.PI / 2); return ge; };
    put(new THREE.Mesh(flat(.3, true), lac), 0, .68, 0);
    const lid = new THREE.Mesh(flat(.02, false), lac), lg = new THREE.Group(); lid.position.x = .75; lg.add(lid); put(lg, -.75, 1.012, 0, 0, .5); tube(V(.32, .98, -1.1), V(.5, 1.62, -1.1), .008, lac);
    g.add(rbox(1.5, .1, .3, lac, 0, .76, .14, .012), box(1.24, .02, .15, white, 0, .815, .19), rbox(1.3, .05, .04, lac, 0, .8, .3, .01)); keysRow(52, -.61, 1.24, .832, .155, .09);
    for (const [x, z] of [[-.62, -.15], [.62, -.15], [-.1, -1.75]]) put(cyl(.045, .03, .68, lac, 12), x, .34, z);
    g.add(box(.3, .02, .1, M.brass, 0, .06, -.02)); tube(V(-.08, .06, -.02), V(-.08, .68, -.1), .012, lac); tube(V(.08, .06, -.02), V(.08, .68, -.1), .012, lac);
    g.add(rbox(.7, .08, .36, pmat('#1a1a1c', .7), 0, .5, .78, .02)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) tube(V(sx * .3, 0, .78 + sz * .14), V(sx * .3, .46, .78 + sz * .14), .018, lac);
  } else if (k === 'gstand'){
    const gt = guitar(['#7a2a1c', '#c9a15a', '#1c1c1e', '#2d4a6a', '#e8e2d0'][h % 5]); put(gt, 0, .27, .02, -.16);
    tube(V(0, .1, -.1), V(0, .95, -.19), .01); for (let i = 0; i < 3; i++){ const a = i * 2.094 + 1.57; tube(V(0, .2, -.11), V(Math.cos(a) * .22, .01, -.1 + Math.sin(a) * .22), .008); } tube(V(-.1, .08, .06), V(.1, .08, .06), .01, dark); tube(V(-.1, .08, .06), V(0, .12, -.1), .008); tube(V(.1, .08, .06), V(0, .12, -.1), .008);
  } else if (k === 'pupitre'){
    tripod(0, 0, 1.1, .22); put(box(.48, .32, .012, blk), 0, 1.2, .03, -.35); g.add(box(.48, .012, .05, blk, 0, 1.06, .1)); put(box(.4, .28, .004, white), 0, 1.21, .04, -.35);
  }
  return g;
}
// faces à LED (PAR, wash, barres) : matrice de sources visibles quand l'appareil est allumé
const LEDT = {};
function ledTex(bar){ const key = bar ? 'bar' : 'round'; if (LEDT[key]) return LEDT[key];
  const c = document.createElement('canvas'); c.width = bar ? 512 : 128; c.height = bar ? 40 : 128; const x = c.getContext('2d'); x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, c.width, c.height);
  const dot = (cx, cy, r) => { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, '#fff'); gr.addColorStop(.55, '#f4f4f4'); gr.addColorStop(1, '#3a3a3a'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  if (bar) for (let i = 0; i < 10; i++) dot(26 + i * 51.2, 20, 17); else { dot(64, 64, 13); for (let i = 0; i < 6; i++) dot(64 + Math.cos(i * 1.047) * 27, 64 + Math.sin(i * 1.047) * 27, 13); for (let i = 0; i < 12; i++) dot(64 + Math.cos(i * .5236 + .26) * 51, 64 + Math.sin(i * .5236 + .26) * 51, 12); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (LEDT[key] = t); }
const beamGeo = new THREE.CylinderGeometry(0.03, 1, 1, 48, 1, false); beamGeo.translate(0, -0.5, 0);
const OLDLIB = new Set(['truss', 'la6', 'la8', 'la-bump']);          // anciens types remplacés par les ponts et l'outil Line array : gardés pour relire les vieux projets, masqués de la bibliothèque
const BEAMT = { value: 0 }, BEAMK = .26;       // BEAMK : réglage d'affichage de la fumée, pas une donnée
// Faisceau dans la fumée : un vrai volume. Pour chaque pixel on calcule où le regard entre et sort du cône, puis on additionne la lumière diffusée
// le long de ce trajet : éclairement en 1/surface de la section (donc en 1/d²), bord adouci, diffusion vers l'avant (Henyey-Greenstein), volutes de brouillard.
// Le cône est un volume fermé : la face avant porte la première moitié du trajet, la face arrière la seconde ; un objet dans le faisceau cache donc ce qui est derrière lui.
const beamVS = `varying vec3 vP; varying vec3 vO; varying vec3 vW;
void main(){ vP = position; vO = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const beamFS = `uniform vec3 color; uniform float amount; uniform float time; uniform float soft; uniform float fade; uniform vec2 scl; uniform sampler2D shMap; uniform mat4 shMat; uniform float shOn; uniform vec4 shR;
uniform float fxOn; uniform vec3 fxO; uniform vec3 fxDir; uniform vec3 fxRt; uniform float fxTan; uniform vec3 fxB1; uniform vec3 fxB2; uniform vec3 fxB3; uniform vec3 fxB4; uniform vec3 fxG; uniform vec3 fxP; uniform sampler2D fxGob;
#include <packing>
${SFMASK}
 varying vec3 vP; varying vec3 vO; varying vec3 vW;
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fog(vec3 w){ return n3(w * 0.55 + vec3(time * 0.11, -time * 0.05, time * 0.07)) * 0.65 + n3(w * 1.7 + vec3(-time * 0.2, time * 0.06, 0.0)) * 0.35; }
void main(){ const float A0 = 0.03, B0 = 0.97; vec3 o = vO, d = vP - vO;                       // repère du cône : sommet en y = 0, base de rayon 1 en y = -1 ; t = 1 au pixel
  float ya = abs(d.y) < 1e-6 ? (o.y > -1.0 && o.y < 0.0 ? -1e9 : 1e9) : (-1.0 - o.y) / d.y, yb = abs(d.y) < 1e-6 ? (o.y > -1.0 && o.y < 0.0 ? 1e9 : -1e9) : -o.y / d.y;
  float t0 = min(ya, yb), t1 = max(ya, yb);
  float k = A0 - B0 * o.y, m = -B0 * d.y, qa = dot(d.xz, d.xz) - m * m, qb = 2.0 * (dot(o.xz, d.xz) - k * m), qc = dot(o.xz, o.xz) - k * k; if (abs(qa) < 1e-7) qa = 1e-7;
  float disc = qb * qb - 4.0 * qa * qc;
  if (disc < 0.0){ if (qa > 0.0) discard; }
  else { float sq = sqrt(disc), r0 = (-qb - sq) / (2.0 * qa), r1 = (-qb + sq) / (2.0 * qa); if (r0 > r1){ float x = r0; r0 = r1; r1 = x; }
    if (qa > 0.0){ t0 = max(t0, r0); t1 = min(t1, r1); }
    else { float a1 = min(t1, r0), b0 = max(t0, r1); if (a1 - t0 > t1 - b0) t1 = a1; else t0 = b0; } }
  bool inside = t0 <= 0.0; t0 = max(t0, 0.0); if (t1 <= t0) discard;
  float tm = 0.5 * (t0 + t1), ta = inside ? t0 : gl_FrontFacing ? t0 : tm, tb = inside ? t1 : gl_FrontFacing ? tm : t1; if (inside && gl_FrontFacing) discard;
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))), sum = 0.0; const int N = 14;
  for (int i = 0; i < N; i++){ float t = mix(ta, tb, (float(i) + jit) / float(N)); vec3 p = o + d * t; float s = clamp(-p.y, 0.0, 1.0), rl = A0 + B0 * s, rho = length(p.xz) / rl, rw = max(rl * scl.x, 0.1);
    float lit = 1.0; if (shOn > 0.5){ vec4 sc = shMat * vec4(mix(cameraPosition, vW, t), 1.0); vec3 q = sc.xyz / sc.w; if (sc.w > 0.0 && q.x > shR.x && q.x < shR.z && q.y > shR.y && q.y < shR.w && q.z > 0.0 && q.z < 1.0) lit = step(q.z - 0.0015, unpackRGBAToDepth(texture2D(shMap, q.xy))); }      // ombre réelle : ce point de fumée voit-il la source ?
    if (fxOn > 0.5 && lit > 0.0){ vec3 fl = mix(cameraPosition, vW, t) - fxO; float al = max(dot(fl, fxDir), 1e-4); vec3 pr = fl - al * fxDir; lit *= sfMask(vec2(dot(pr, fxRt), dot(pr, cross(fxDir, fxRt))) / (al * fxTan), fxB1, fxB2, fxB3, fxB4, fxG.x, fxG.y, fxG.z, fxGob, fxP); }      // iris, couteaux, gobo : la fumée est découpée comme les surfaces
    sum += lit * (1.0 - smoothstep(1.0 - soft, 1.0, rho)) * (1.0 - fade * smoothstep(0.82, 1.0, s)) / (rw * rw); }
  float wl = length(d * vec3(scl.x, scl.y, scl.x)) * (tb - ta) / float(N);                     // longueur réelle d'un pas, en mètres
  vec3 pm = o + d * (0.5 * (ta + tb)); vec3 lw = normalize(vec3(pm.x * scl.x, pm.y * scl.y - 0.03 * scl.y, pm.z * scl.x)), vw = -normalize(d * vec3(scl.x, scl.y, scl.x));
  float c = dot(lw, vw), g = 0.3, ph = pow(1.0 + g * g, 1.5) / pow(1.0 + g * g - 2.0 * g * c, 1.5);   // plus lumineux quand on regarde vers la source ; 1 de profil
  float hz = 0.55 + 0.9 * 0.5 * (fog(mix(cameraPosition, vW, mix(ta, tb, 0.3))) + fog(mix(cameraPosition, vW, mix(ta, tb, 0.7))));
  gl_FragColor = vec4(color * (amount * sum * wl * ph * hz * 0.3183), 1.0); }`;
let _flareTex = null;
function flareTex(){ if (_flareTex) return _flareTex; const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.06, 'rgba(255,255,255,.85)'); gr.addColorStop(.2, 'rgba(255,255,255,.22)'); gr.addColorStop(.5, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'lighter'; for (const [w, h, a] of [[256, 5, .5], [5, 150, .22]]){ gr = w > h ? g.createLinearGradient(0, 0, 256, 0) : g.createLinearGradient(0, 53, 0, 203); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(128 - w / 2, 128 - h / 2, w, h); }
  _flareTex = new THREE.CanvasTexture(c); _flareTex.colorSpace = THREE.SRGBColorSpace; return _flareTex; }
const FXHOOK = { mod: null }, _fl = new THREE.Vector3();           // mod : pilotage direct des projecteurs par le mode cinéma
const DOWN = new THREE.Vector3(0, -1, 0), UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Color(), _c2 = new THREE.Color();
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
const cyl = (r1, r2, h, m, seg = 28) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
const cylAt = (r1, r2, h, m, y, seg = 28) => { const c = cyl(r1, r2, h, m, seg); c.position.y = y; return c; };
const rbox = (w, h, d, m, x = 0, y = 0, z = 0, r = .02) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.2, h / 2.2, d / 2.2)), m); b.position.set(x, y, z); return b; };
const caps = (r, l, m, x, y, z) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 12), m); c.position.set(x, y, z); return c; };
// fusionne les pièces d'un groupe par matériau : plus de détail, moins d'objets à dessiner
function bake(group, stop){
  group.updateMatrixWorld(true); const inv = group.matrixWorld.clone().invert(), by = new Map(), olds = [];
  (function walk(n){ for (const ch of n.children){ if (ch === stop) continue; if (ch.isMesh && !ch.userData.noBake){ let g = ch.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, ch.matrixWorld)); if (g.index) { const t = g.toNonIndexed(); g.dispose(); g = t; }
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
        if (!by.has(ch.material)) by.set(ch.material, []); by.get(ch.material).push(g); olds.push(ch); } walk(ch); } })(group);
  for (const m of olds){ m.parent.remove(m); m.geometry.dispose(); }
  for (const [mat, list] of by){ const g = list.length > 1 ? mergeGeometries(list, false) : list[0]; if (list.length > 1) list.forEach(x => x.dispose()); group.add(new THREE.Mesh(g, mat)); }
}

// ============================================================ construction des objets 3D
function build(o){
  const t = typeOf(o), r = { o, t, root: new THREE.Group(), head: new THREE.Group(), extra: [] };
  r.root.add(r.head);
  const hung = !!o.hang;
  if (t.cat === 'lum'){
    const k = t.kind; let lensR = .09, len = .3;
    const hook = cyl(.02, .02, .14, M.steel, 10); hook.position.y = hung ? -.07 : .07; if (hung){ r.root.add(hook); const cl = new THREE.Mesh(new THREE.TorusGeometry(.034, .011, 8, 18, Math.PI * 1.5), M.steel); cl.rotation.set(0, Math.PI / 2, -Math.PI / 4); cl.position.y = .03; r.root.add(cl, box(.05, .03, .06, M.steel, 0, -.005, 0)); }
    r.head.position.y = hung ? -.3 : (t.mover ? .42 : .3);
    if (t.mover){
      /* une lyre est articulée comme une vraie : le SOCLE ne bouge pas ; la LYRE (traverse + deux bras) tourne autour de l'axe vertical = pan ; la TÊTE bascule entre les bras, autour de l'axe qui les relie = tilt.
         (Avant, socle et bras étaient fixes et seule la tête s'orientait : elle passait à travers les bras.) */
      r.baseG = new THREE.Group(); r.yoke = new THREE.Group(); r.root.add(r.baseG, r.yoke); r.yoke.add(r.head);
      r.baseG.add(rbox(.36, .14, .3, M.body, 0, hung ? -.09 : .07, 0, .025), box(.16, .06, .004, M.glass, 0, hung ? -.09 : .07, .151));
      r.yoke.add(rbox(.44, .05, .13, M.body, 0, hung ? -.175 : .155, 0, .02), cylAt(.11, .11, .012, M.steel, hung ? -.146 : .134, 24));          // traverse, et la couronne de rotation entre socle et lyre
      const PY = hung ? -.3 : .42; for (const sx of [-1, 1]){ r.yoke.add(rbox(.035, .3, .13, M.body, sx * .205, hung ? -.3 : .28, 0, .015)); const pv = cyl(.034, .034, .01, M.body, 16); pv.rotation.z = Math.PI / 2; pv.position.set(sx * .226, PY, 0); r.yoke.add(pv); }
      lensR = k === 'beam' ? .075 : k === 'spot' ? .09 : .12; len = k === 'spot' ? .45 : .34;
    } else if (k === 'prof'){ lensR = .08; len = .6; }
    else if (k === 'fresnel'){ lensR = .11; len = .32; }
    else if (k === 'bar'){ lensR = .04; len = .12; }
    if (!t.mover){ const RX = k === 'bar' ? .52 : lensR + .085, HY = hung ? .21 : .285, yk = new THREE.Mesh(new THREE.TorusGeometry(1, .012 / RX, 6, 28, Math.PI), M.steel);
      yk.scale.set(RX, HY, RX * 3.2); if (!hung) yk.rotation.z = Math.PI; yk.position.y = hung ? -.3 : .3; r.root.add(yk);
      for (const sx of [-1, 1]){ const kn = cyl(.022, .022, .03, M.body, 12); kn.rotation.z = Math.PI / 2; kn.position.set(sx * (RX + .018), hung ? -.3 : .3, 0); r.root.add(kn); }
      if (!hung) r.root.add(rbox(.26, .025, .2, M.body, 0, .0125, 0, .01)); }
    let body;
    if (k === 'bar'){ body = rbox(1, .12, .12, M.body, 0, .04, 0, .015); r.head.add(box(.04, .13, .13, M.steel, -.5, .04, 0), box(.04, .13, .13, M.steel, .5, .04, 0)); }
    else {
      const R = lensR + .045; body = cylAt(R - .01, R + .01, len, M.body, len / 2 - .02);
      r.head.add(cylAt(R + .022, R + .022, .035, M.body, -.012), cylAt(lensR * .55, R - .01, .07, M.body, len + .015));            // bague avant, capot arrière
      if (t.mover) r.head.add(cylAt(R + .014, R + .014, .05, M.body, len * .55), box(.1, .012, .1, M.grille, 0, len + .052, 0));
      else if (k === 'prof'){ r.head.add(rbox(R * 2 + .05, .09, R * 2 + .05, M.body, 0, len * .48, 0, .012), cylAt(R + .012, R + .012, .03, M.steel, len * .2));
        for (const a of [0, 1, 2, 3]){ const h = box(.012, .012, .09, M.steel, 0, len * .48, 0); h.position.set(Math.cos(a * Math.PI / 2 + .78) * (R + .05), len * .48, Math.sin(a * Math.PI / 2 + .78) * (R + .05)); h.rotation.y = -a * Math.PI / 2 - .78 + Math.PI / 2; r.head.add(h); } }
      else { for (const f of [.5, .64, .78]) r.head.add(cylAt(R + .012, R + .012, .014, M.body, len * f));                            // ailettes de refroidissement
        if (k === 'fresnel') for (const sg of [-1, 1]){ const a = box(.004, .13, R * 1.7, M.body, sg * (R + .05), -.085, 0); a.rotation.z = sg * .42; const b2 = box(R * 1.7, .13, .004, M.body, 0, -.085, sg * (R + .05)); b2.rotation.x = -sg * .42; r.head.add(a, b2); } }
    }
    r.head.add(body);
    r.lensMat = new THREE.MeshBasicMaterial({ color: '#000' }); if (t.color === 'rgb' && (k === 'par' || k === 'wash' || k === 'bar')) r.lensMat.map = ledTex(k === 'bar');
    const lens = k === 'bar' ? new THREE.Mesh(new THREE.PlaneGeometry(.96, .08), r.lensMat) : new THREE.Mesh(new THREE.CircleGeometry(lensR, 32), r.lensMat);
    lens.rotation.x = Math.PI / 2; lens.position.y = -.03; r.head.add(lens);
    r.light = new THREE.SpotLight('#fff', 0, 0, .3, k === 'beam' ? .15 : k === 'prof' || k === 'spot' ? .25 : .5, 2);
    { const sh = r.light.shadow; sh.autoUpdate = false; sh.mapSize.set(512, 512); sh.camera.near = .15; sh.camera.far = 40; sh.bias = -.0008; sh.normalBias = .02; sh.radius = 2; }
    occInit();          // le morceau de shader des ombres et des masques doit être en place avant la première compilation d'un matériau éclairé
    r.bm = new THREE.ShaderMaterial({ uniforms: { color: { value: new THREE.Color() }, amount: { value: 0 }, time: BEAMT, soft: { value: k === 'prof' ? .08 : k === 'beam' || k === 'spot' ? .16 : .5 }, fade: { value: 1 }, shMap: { value: null }, shMat: { value: new THREE.Matrix4() }, shOn: { value: 0 }, shR: { value: new THREE.Vector4(0, 0, 1, 1) }, scl: { value: new THREE.Vector2(1, 1) }, fxOn: { value: 0 }, fxO: { value: new THREE.Vector3() }, fxDir: { value: new THREE.Vector3(0, -1, 0) }, fxRt: { value: new THREE.Vector3(1, 0, 0) }, fxTan: { value: 1 }, fxB1: { value: new THREE.Vector3(1, 0, 9) }, fxB2: { value: new THREE.Vector3(1, 0, 9) }, fxB3: { value: new THREE.Vector3(1, 0, 9) }, fxB4: { value: new THREE.Vector3(1, 0, 9) }, fxG: { value: new THREE.Vector3() }, fxP: { value: new THREE.Vector3() }, fxGob: { value: goboAtlas() } }, vertexShader: beamVS, fragmentShader: beamFS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    r.beam = new THREE.Mesh(beamGeo, r.bm); r.beam.userData.noAO = true; r.beam.frustumCulled = false;
    r.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex(), color: 0x000000, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); r.flare.userData.noAO = true; r.flare.visible = false; r.flare.renderOrder = 5;
    r.extra.push(r.light, r.light.target, r.beam, r.flare);
  } else if (t.cat === 'vid'){
    r.head.position.y = hung ? -.32 : .16;
    if (hung){ for (const sx of [-1, 1]) r.root.add(box(.03, .2, .03, M.steel, sx * .2, -.1, 0)); }
    r.head.add(rbox(.55, .2, .6, M.vp, 0, 0, 0, .03), box(.2, .1, .006, M.grille, -.15, 0, .301), box(.5, .012, .5, M.frame, 0, -.104, 0));
    const l = cyl(.07, .08, .12, M.body); l.rotation.x = Math.PI / 2; l.position.z = .34; const l2 = cyl(.088, .088, .03, M.steel); l2.rotation.x = Math.PI / 2; l2.position.z = .385; r.head.add(l, l2);
    r.lensMat = new THREE.MeshBasicMaterial({ color: '#000' });
    const gl = new THREE.Mesh(new THREE.CircleGeometry(.06, 20), r.lensMat); gl.position.z = .401; r.head.add(gl);
    r.light = new THREE.SpotLight('#fff', 0, 0, .3, 0, 2);
    r.light.shadow.mapSize.set(1024, 1024); r.light.shadow.camera.near = .3; r.light.shadow.camera.far = 45; r.light.shadow.bias = -.0006; r.light.shadow.focus = 1;
    r.canvas = document.createElement('canvas'); r.canvas.width = r.canvas.height = 1024;
    r.tex = new THREE.CanvasTexture(r.canvas); r.tex.colorSpace = THREE.SRGBColorSpace;
    r.frust = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(48), 3)), M.vfr); r.frust.frustumCulled = false;
    r.extra.push(r.light, r.light.target, r.frust);
  } else if (t.cat === 'son'){
    const k = t.kind;
    if (k === 'line'){
      const n = t.boxes || 6; r.head.position.y = hung ? -.12 : n * .29 + .05;
      if (hung) r.root.add(box(.5, .06, .5, M.steel, 0, -.06, 0));
      for (let i = 0; i < n; i++){
        const g = new THREE.Group(); const a = (i - (n - 1) / 2) * 3 * D2R + 0; g.position.set(0, -.14 - i * .29, -Math.pow(i / n, 2) * .35); g.rotation.x = i * 2.2 * D2R;
        g.add(rbox(.72, .27, .42, M.cab, 0, 0, 0, .015)); g.add(box(.68, .23, .012, M.grille, 0, 0, .212)); g.add(box(.012, .2, .3, M.steel, -.364, 0, -.02), box(.012, .2, .3, M.steel, .364, 0, -.02)); r.head.add(g);
      }
    } else if (k === 'labump'){ const [w, h, d] = o.size || t.box; r.head.add(box(w, h * .5, d, M.steel, 0, 0, 0)); for (const sz of [-1, 1]) r.head.add(box(w * .9, h, .04, M.steel, 0, 0, sz * (d / 2 - .02))); r.head.add(box(.05, h * 1.6, d * .9, M.steel, 0, h * .3, 0));
    } else if (k === 'labox'){ const [w, h, d] = o.size || t.box; r.head.add(rbox(w, h, d, M.cab, 0, 0, 0, .012)); r.head.add(box(w - .04, h - .03, .012, M.grille, 0, 0, d / 2 + .002)); for (const sx of [-1, 1]) r.head.add(box(.012, h * .8, d * .7, M.steel, sx * (w / 2 + .004), 0, -.02)); }
    else if (k === 'sub'){ const two = t.id === 'sub218'; r.head.position.y = .28; r.head.add(rbox(two ? 1.1 : .6, .56, .72, M.cab, 0, 0, 0, .02)); r.head.add(box(two ? 1.04 : .54, .5, .012, M.grille, 0, 0, .362)); for (const sx of [-1, 1]) r.head.add(box(.008, .1, .16, M.frame, sx * (two ? .551 : .301), .08, 0)); }
    else if (t.fam === 'line'){ const [w, h, d] = (t.dim || [700, 300, 450]).map(v => v / 1000); r.head.position.y = h / 2; r.head.add(rbox(w, h, d, M.cab, 0, 0, 0, .012), box(w - .04, h - .03, .012, M.grille, 0, 0, d / 2 + .002)); for (const sx of [-1, 1]) r.head.add(box(.012, h * .8, d * .7, M.steel, sx * (w / 2 + .004), 0, -.02)); }
    else if (k === 'wedge'){ r.head.position.y = .2; r.head.add(rbox(.55, .34, .42, M.cab, 0, 0, 0, .02)); r.head.add(box(.5, .3, .012, M.grille, 0, 0, .212)); }
    else { const big = t.id === 'pt15'; r.head.position.y = hung ? -.42 : 1.6;
      if (hung) r.root.add(box(.04, .12, .04, M.steel, 0, -.06, 0)); else { const st = cyl(.02, .02, 1.3, M.steel, 8); st.position.y = .65; r.root.add(st); for (let i = 0; i < 3; i++){ const leg = cyl(.012, .012, .7, M.steel, 6); leg.position.set(Math.cos(i * 2.09) * .25, .25, Math.sin(i * 2.09) * .25); leg.rotation.z = Math.cos(i * 2.09) * .7; leg.rotation.x = -Math.sin(i * 2.09) * .7; r.root.add(leg); } }
      { const w = big ? .46 : .4, hh = big ? .72 : .62, d = .38, sh = new THREE.Shape(); const wS = w - .03, dS = d - .03; sh.moveTo(-wS / 2, -dS / 2); sh.lineTo(wS / 2, -dS / 2); sh.lineTo(wS * .3, dS / 2); sh.lineTo(-wS * .3, dS / 2); sh.closePath();
        const cg = new THREE.ExtrudeGeometry(sh, { depth: hh - .03, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 2 }); cg.rotateX(-Math.PI / 2); cg.translate(0, -hh / 2 + .015, 0); r.head.add(new THREE.Mesh(cg, M.cab), cylAt(.03, .03, .05, M.steel, -hh / 2 - .02, 12)); } r.head.add(box(big ? .42 : .36, big ? .68 : .58, .012, M.grille, 0, 0, .192)); for (const sx of [-1, 1]) r.head.add(box(.008, .12, .1, M.frame, sx * (big ? .231 : .201), .05, 0)); }
    r.cov = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(48), 3)), M.cov); r.cov.frustumCulled = false;
    r.extra.push(r.cov);
  } else {
    const k = t.kind;
    if (k === 'prim'){ const [w, d, h0] = o.size || t.size, h = Math.max(h0, .001), sp = t.shape, mat = matFor(o.mat || 'peint', o.pcol, { side: sp === 'plane' ? THREE.DoubleSide : THREE.FrontSide }); let g;          // formes de base : géométrie unité mise aux cotes, posée sur sa base
      if (sp === 'plane'){ g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.scale(w, 1, d); g.translate(0, .002, 0); }
      else if (sp === 'sphere'){ g = new THREE.SphereGeometry(.5, 40, 24); g.scale(w, h, d); g.translate(0, h / 2, 0); }
      else if (sp === 'dome'){ g = new THREE.SphereGeometry(.5, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(w, h * 2, d); }
      else if (sp === 'cyl' || sp === 'cone' || sp === 'pyr'){ g = new THREE.CylinderGeometry(sp === 'cyl' ? .5 : 0, sp === 'pyr' ? Math.SQRT1_2 : .5, 1, sp === 'pyr' ? 4 : 40); if (sp === 'pyr') g.rotateY(Math.PI / 4); g.scale(w, h, d); g.translate(0, h / 2, 0); }
      else if (sp === 'torus'){ const mn = Math.max(.02, Math.min(w, d)), tr = Math.min(h / 2, mn / 4); g = new THREE.TorusGeometry(mn / 2 - tr, tr, 18, 56); g.rotateX(Math.PI / 2); g.scale(w / mn, 1, d / mn); g.translate(0, tr, 0); }
      else if (sp === 'wedge'){ const s2 = new THREE.Shape(); s2.moveTo(-.5, 0); s2.lineTo(.5, 0); s2.lineTo(.5, 1); s2.closePath(); g = new THREE.ExtrudeGeometry(s2, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -.5); g.rotateY(Math.PI / 2); g.scale(w, h, d); }
      else { g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); }
      if (matTile(o.mat)) g = boxUV(g, matTile(o.mat));
      const m = new THREE.Mesh(g, mat), piv = new THREE.Group(); m.castShadow = m.receiveShadow = true; m.userData.noBake = true; piv.rotation.set((o.rx || 0) * D2R, 0, (o.rz || 0) * D2R); piv.add(m); r.head.add(piv); }
    else if (k === 'sprop'){ const [w, d, h] = o.size || t.size, g = window.DECOR && DECOR.ready ? DECOR.build(t.key, w, h, d, o.tint) : null; if (g){ g.traverse(m => { if (m.isMesh) m.userData.noBake = true; }); r.head.add(g); }          // jamais fusionné : un personnage est un maillage articulé, le fusionner le remet en pose neutre et perd des morceaux
    else { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: 0x6e7787, wireframe: true })); m.position.y = h / 2; r.head.add(m); window.DECOR?.load(); } }
    else if (k === 'mesh3d'){ if (window.IMPORT3D) r.head.add(IMPORT3D.mesh(t, o)); }          // modèle importé (import3d.js) ; reconstruit quand le module est prêt
    else if (k === 'screen'){ const [w, h] = o.size || t.size; const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.screen); pl.position.y = h / 2; r.head.add(pl);
      r.head.add(box(w + .12, .06, .05, M.frame, 0, h + .03, -.03), box(w + .12, .06, .05, M.frame, 0, -.03, -.03), box(.06, h + .12, .05, M.frame, -w / 2 - .03, h / 2, -.03), box(.06, h + .12, .05, M.frame, w / 2 + .03, h / 2, -.03)); }
    else if (k === 'gear'){ gearModel(t, r); }
    else if (k === 'drape'){ const [w, h] = o.size || t.size; const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), t.col ? M.screen : M.drape); pl.position.y = h / 2; pl.castShadow = pl.receiveShadow = true; r.head.add(pl); if (t.skirt) pl.material = M.drape; else r.head.add(box(w, .04, .04, M.frame, 0, h + .02, 0)); }
    else if (k === 'truss'){ const L = o.len || t.len; for (const [x, y] of [[-.13, -.13], [.13, -.13], [-.13, .13], [.13, .13]]){ const c = cyl(.025, .025, L, M.steel, 8); c.rotation.z = Math.PI / 2; c.position.set(0, y - .15, x); r.head.add(c); }
      const n = Math.max(1, Math.round(L / .5)); for (let i = 0; i <= n; i++){ const x = -L / 2 + i * L / n; r.head.add(box(.02, .28, .02, M.steel, x, -.15, -.13), box(.02, .28, .02, M.steel, x, -.15, .13), box(.02, .02, .28, M.steel, x, -.02, 0), box(.02, .02, .28, M.steel, x, -.28, 0)); if (i < n) for (const z of [-.13, .13]){ const dg = box(.018, Math.hypot(L / n, .26), .018, M.steel, x + L / n / 2, -.15, z); dg.rotation.z = (i % 2 ? 1 : -1) * Math.atan2(L / n, .26); r.head.add(dg); } } }
    else if (k === 'riser' && t.shape){ const [w, d, h] = o.size || t.size, sh = new THREE.Shape();          // triangle ou quart de rond : l'angle droit est au coin jardin-lointain du module
      sh.moveTo(-w / 2, -d / 2); if (t.shape === 'tri'){ sh.lineTo(w / 2, -d / 2); sh.lineTo(-w / 2, d / 2); } else { sh.lineTo(w / 2, -d / 2); sh.absarc(-w / 2, -d / 2, w, 0, Math.PI / 2, false); } sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: false }); g.rotateX(Math.PI / 2); const dk = new THREE.Mesh(g, M.deck); dk.position.y = h; dk.castShadow = dk.receiveShadow = true; r.head.add(dk);
      for (const [x, z] of t.shape === 'tri' ? [[-w / 2 + .05, -d / 2 + .05], [w / 2 - .14, -d / 2 + .05], [-w / 2 + .05, d / 2 - .14]] : [[-w / 2 + .05, -d / 2 + .05], [w / 2 - .06, -d / 2 + .05], [-w / 2 + .05, d / 2 - .06], [-w / 2 + w * .68, -d / 2 + d * .68]]) r.head.add(box(.05, h - .05, .05, M.steel, x, (h - .05) / 2, z)); }
    else if (k === 'rail'){ const L = o.len || t.len, n = Math.max(1, Math.ceil(L / 1.01)); r.head.add(box(L, .04, .04, M.steel, 0, 1.08, 0)); r.head.add(box(L, .03, .03, M.steel, 0, .55, 0)); r.head.add(box(L, .1, .015, M.steel, 0, .05, 0)); for (let i = 0; i <= n; i++) r.head.add(box(.04, 1.1, .04, M.steel, -L / 2 + .02 + (L - .04) * i / n, .55, 0)); }
    else if (k === 'stairs'){ const [w, , h] = o.size || t.size, n = Math.max(1, Math.round(h / .2)), rise = h / n, go = .28;          // le haut touche le bord de la scène (z local = 0), l'escalier descend vers z local positif
      for (let i = 1; i < n; i++){ const y = h - i * rise; r.head.add(box(w, .04, go, M.deck, 0, y - .02, (i - .5) * go)); r.head.add(box(w, y - .04, .02, M.steel, 0, (y - .04) / 2, i * go - .01)); }
      for (const sx of [-1, 1]) r.head.add(box(.03, h, .03, M.steel, sx * (w / 2 - .015), h / 2, .015)); if (n < 2) r.head.add(box(w, .02, .1, M.deck, 0, .01, .05)); }
    else if (k === 'riser' || k === 'desk'){ const [w, d, h] = o.size || t.size; r.head.add(box(w, .05, d, M.deck, 0, h - .025, 0)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) r.head.add(box(.05, h - .05, .05, M.steel, sx * (w / 2 - .05), (h - .05) / 2, sz * (d / 2 - .05))); if (k === 'desk'){ const cm = A.consoleModel('son', Math.min(1.1, w - .5)); cm.position.set(-.2, h, 0); r.head.add(cm); r.head.add(rbox(.34, .015, .24, M.steel, w / 2 - .3, h + .008, 0, .006)); const ls = box(.33, .21, .008, M.glass, w / 2 - .3, h + .12, -.125); ls.rotation.x = -.2; r.head.add(ls); } }
    else if (k === 'ledwall') LEDW.build(r, o);
    else if (['mic', 'drums', 'amp', 'keys', 'piano', 'gstand', 'pupitre'].includes(k)) r.head.add(instrument(o, t));
    else if (k === 'person'){ const hd = new THREE.Mesh(new THREE.SphereGeometry(.105, 18, 14), M.person); hd.position.y = 1.645; hd.scale.set(.92, 1.1, 1); const to = caps(.15, .36, M.person, 0, 1.2, 0); to.scale.set(1.15, 1, .72); const hp = caps(.14, .1, M.person, 0, .9, 0); hp.scale.set(1.1, 1, .75);
      r.head.add(human(o, t)); if (0) r.head.add(hd, to, hp, cylAt(.045, .055, .09, M.person, 1.5, 12));  }
  }
  bake(r.head); if (r.yoke){ bake(r.yoke, r.head); bake(r.baseG); r.root.remove(r.yoke, r.baseG); bake(r.root); r.root.add(r.baseG, r.yoke); } else bake(r.root, r.head);
  if (t.raw && t.gdtf && t.g3d !== false) gdtfSwap(o, t, r, hung);
  if (t.dim && t.kind !== 'gear' && t.kind !== 'mic' && t.kind !== 'ledwall' && t.kind !== 'riser' && t.fam !== 'line') (t.mover && r.yoke ? fitMover(r, t.dim, hung) : fitDim(t.mover ? r.root : r.head, t.dim));          // le modèle générique est mis aux dimensions réelles de la référence
  r.root.traverse(m => { if (m.isMesh){ m.castShadow = m.receiveShadow = !m.userData.noShadow; m.userData.oid = o.id; if (m.castShadow && !m.material?.transparent) m.layers.enable(1); } });          // calque 1 : ce qui arrête un faisceau (voir occFlush)
  scene.add(r.root); r.extra.forEach(e => scene.add(e));
  r.boxh = new THREE.BoxHelper(r.root, '#2affd0'); r.boxh.material = M.sel; r.boxh.visible = false; r.boxh.renderOrder = 8; scene.add(r.boxh);
  RT.set(o.id, r); r.dirty = true;
  return r;
}
function unbuild(id){
  const r = RT.get(id); if (!r) return; if (r.led) LEDW.dispose(id); occFree(r); fxFree(r);
  scene.remove(r.root, r.boxh, ...r.extra);
  r.root.traverse(m => { if (m.isMesh) m.geometry.dispose(); });
  r.tex?.dispose(); r.light?.dispose?.(); r.bm?.dispose(); r.boxh.geometry.dispose();
  RT.delete(id);
}
function rebuild(o){ unbuild(o.id); build(o); }

// ============================================================ photométrie / acoustique
const coneSr = deg => 2 * Math.PI * (1 - Math.cos(deg * D2R / 2));
const candela = (lm, deg) => lm / coneSr(Math.max(1, deg));
const dispI = cd => 6 * Math.pow(Math.max(1, cd), .45);     // intensité d'affichage (compression perceptive)
const rc = new THREE.Raycaster();
function hitAlong(origin, dir, far = 60){
  rc.set(origin, dir); rc.far = far; rc.near = .3;
  const list = A.pickMeshes.filter(m => m.visible && m.userData.gid !== 'gril' && m.userData.gid !== 'perches' && m.userData.gid !== 'ponts');
  for (const r of RT.values()) if (r.t.cat === 'str' && !String(r.o?.id || '').startsWith('__th')) r.root.traverse(m => { if (m.isMesh && m.visible) list.push(m); });
  const h = rc.intersectObjects(list, false); return h.length ? h[0] : null;
}
function splAt(P, list){
  let e = 0;
  for (const { o, t, src, d } of list){
    _v.copy(P).sub(src); const r = Math.max(1, _v.length()); _v.normalize();
    let loss = 0;
    if (t.kind !== 'sub'){
      const ax = d, right = _v2.crossVectors(ax, UP).normalize(); const up2 = new THREE.Vector3().crossVectors(right, ax);
      const f = _v.dot(ax), h = Math.atan2(_v.dot(right), f) * R2D, v = Math.atan2(_v.dot(up2), Math.hypot(f, _v.dot(right))) * R2D;
      loss = Math.min(24, 6 * (Math.pow(h / (t.hd / 2), 2) + Math.pow(v / (t.vd / 2), 2)));
    }
    e += Math.pow(10, (t.spl + (o.gain || 0) - 20 * Math.log10(r) - loss) / 10);
  }
  return e > 0 ? 10 * Math.log10(e) : 0;
}
const speakers = noSub => S.objs.filter(o => typeOf(o).cat === 'son' && typeOf(o).kind !== 'labump' && o.on !== false && !(noSub && typeOf(o).kind === 'sub')).map(o => { const r = RT.get(o.id); return { o, t: typeOf(o), src: r.head.getWorldPosition(new THREE.Vector3()), d: dirOf(o.pan, o.tilt, new THREE.Vector3()) }; });
let splMesh = null, splTimer = 0;
function splMap(){
  if (splMesh){ scene.remove(splMesh); splMesh.geometry.dispose(); splMesh = null; }
  if (!UI.spl) return;
  const list = speakers(true); if (!list.length) return;
  const st = .6, pos = [], col = [], P = new THREE.Vector3(), cells = [];
  const B = A.venueBounds(), prm = A.venue.type === 'param', xa = prm ? -B.hw + .1 : -8.4, xb = prm ? B.hw - .1 : 8.4, zb = prm ? B.z1 - .1 : 21.6, y0 = prm ? B.h - .3 : 5.8;
  for (let x = xa; x < xb; x += st) for (let z = .3; z < zb; z += st){
    const f = A.floorAt(x + st / 2, y0, z + st / 2, 0); if (f === null) continue;
    P.set(x + st / 2, f + 1.2, z + st / 2); cells.push([x, f + .12, z, splAt(P, list)]);
  }
  if (!cells.length) return;
  const vs = cells.map(c => c[3]).sort((a, b) => a - b), hi = Math.ceil(vs[vs.length - 1]), lo = hi - 18; UI.splRange = [lo, hi, vs[Math.floor(vs.length / 2)]];
  const stops = ['#2b3bd1', '#19b6c9', '#3fc24a', '#f0d234', '#e2574c'];
  for (const [x, y, z, v] of cells){
    const k = clamp((v - lo) / (hi - lo), 0, 1), i = Math.min(3, Math.floor(k * 4)), c = _c.set(stops[i]).lerp(_c2.set(stops[i + 1]), k * 4 - i);
    pos.push(x, y, z, x + st, y, z, x + st, y, z + st, x, y, z, x + st, y, z + st, x, y, z + st);
    for (let q = 0; q < 6; q++) col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  splMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .62, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  splMesh.userData.noAO = true; splMesh.renderOrder = 5; scene.add(splMesh);
}

// ============================================================ contenu vidéo
// L'image est d'abord tracée telle quelle dans r.src (au format de la matrice), puis posée dans la carte du faisceau (r.canvas) :
// décalée si l'optique est décalée, déformée si les 4 coins ont été réglés. Hors de l'image, le projecteur n'éclaire pas.
function quadMap(p){ const [x0, y0] = p[0], [x1, y1] = p[1], [x2, y2] = p[2], [x3, y3] = p[3], dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3, den = dx1 * dy2 - dx2 * dy1 || 1e-9, g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den, a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3; return (u, v) => { const w = g * u + h * v + 1; return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w]; }; }
function triDraw(g, img, s0, s1, s2, d0, d1, d2){ const u1x = s1[0] - s0[0], u1y = s1[1] - s0[1], u2x = s2[0] - s0[0], u2y = s2[1] - s0[1], det = u1x * u2y - u2x * u1y; if (Math.abs(det) < 1e-9) return;
  const v1x = d1[0] - d0[0], v1y = d1[1] - d0[1], v2x = d2[0] - d0[0], v2y = d2[1] - d0[1], a = (v1x * u2y - v2x * u1y) / det, c = (v2x * u1x - v1x * u2x) / det, b = (v1y * u2y - v2y * u1y) / det, d = (v2y * u1x - v1y * u2x) / det;
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, ex = q => { const x = q[0] - cx, y = q[1] - cy, l = Math.hypot(x, y) || 1; return [q[0] + x / l * .8, q[1] + y / l * .8]; }, e0 = ex(d0), e1 = ex(d1), e2 = ex(d2);
  g.save(); g.beginPath(); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.lineTo(e2[0], e2[1]); g.closePath(); g.clip(); g.setTransform(a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]); g.drawImage(img, 0, 0); g.restore(); }
function drawContent(r){
  const o = r.o, t = r.t, ar = t.res[0] / t.res[1], op = r.geom?.op || vpOptics(o, t);
  if (!r.src){ r.src = document.createElement('canvas'); r.src.width = 1024; } const sh = Math.round(1024 / ar); if (r.src.height !== sh) r.src.height = sh;
  const md = MEDIA.get(o.id), kind = o.content || 'mire';
  { const g = r.src.getContext('2d'), w = 1024, h = sh; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    if ((kind === 'image' || kind === 'video' || kind === 'cam' || kind === 'ecran' || kind === 'ndi') && md?.el){ try { const el = md.el, sw = el.videoWidth || el.naturalWidth || el.width || 0, shh = el.videoHeight || el.naturalHeight || el.height || 0; if (md.live && sw && shh){ const k = Math.min(w / sw, h / shh), dw = sw * k, dh = shh * k; g.drawImage(el, (w - dw) / 2, (h - dh) / 2, dw, dh); } else g.drawImage(el, 0, 0, w, h); } catch (_){} }          // une source en direct garde son format (bandes noires), comme sur un vrai projecteur
    else if (kind === 'cam' || kind === 'ecran' || kind === 'ndi'){ g.fillStyle = '#0a1a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `600 ${Math.round(h * .09)}px Inter, sans-serif`; g.fillText('Pas de signal', w / 2, h * .48); g.font = `${Math.round(h * .045)}px Inter, sans-serif`; g.fillText('choisis la source dans la fiche du projecteur', w / 2, h * .58); }
    else if (kind === 'blanc'){ g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    else if (kind === 'degrade'){ const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ff2bd6'); gr.addColorStop(.5, '#2a4dff'); gr.addColorStop(1, '#00ffc8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    else {
      g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 2;
      const n = 16; for (let i = 0; i <= n; i++){ g.beginPath(); g.moveTo(i * w / n, 0); g.lineTo(i * w / n, h); g.stroke(); }
      const m = Math.round(n / ar); for (let i = 0; i <= m; i++){ g.beginPath(); g.moveTo(0, i * h / m); g.lineTo(w, i * h / m); g.stroke(); }
      const bars = ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f', '#000']; bars.forEach((b, i) => { g.fillStyle = b; g.fillRect(w * .2 + i * w * .6 / 8, h * .62, w * .6 / 8 + 1, h * .16); });
      g.beginPath(); g.arc(w / 2, h / 2, h * .42, 0, 6.3); g.lineWidth = 4; g.stroke(); g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = '#fff'; g.font = `600 ${Math.round(h * .1)}px Inter, sans-serif`; g.textAlign = 'center'; g.fillText(`${t.res[0]} × ${t.res[1]}`, w / 2, h * .36);
      g.font = `${Math.round(h * .06)}px Inter, sans-serif`; g.fillText(o.name || t.name, w / 2, h * .48);
    }
    // part du contenu montrée par ce projecteur (raccord : chacun montre sa moitié, plus le recouvrement) : crop = [u0, v0, u1, v1], v vers le haut
    const cr = Array.isArray(o.crop) && o.crop.length === 4 ? o.crop : null; if (cr){ const tmp = r.tmp || (r.tmp = document.createElement('canvas')); tmp.width = w; tmp.height = h; tmp.getContext('2d').drawImage(r.src, 0, 0); g.drawImage(tmp, cr[0] * w, (1 - cr[3]) * h, (cr[2] - cr[0]) * w, (cr[3] - cr[1]) * h, 0, 0, w, h); }
    // fondu de bord : la lumière monte de 0 à 100 % sur la largeur du recouvrement (bll, blr, blt, blb en % de l'image). Deux fondus qui se
    // croisent font 100 % partout : la rampe est écrite en lumière réelle, d'où la correction de gamma de la carte (sRGB).
    const band = (x0, y0, x1, y1, rx, ry, rw, rh) => { const gr = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i <= 16; i++){ const k = i / 16; gr.addColorStop(k, `rgba(0,0,0,${(1 - Math.pow(k, 1 / 2.2)).toFixed(4)})`); } g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); }, pc = v => Math.max(0, Math.min(90, +v || 0)) / 100;
    const L = pc(o.bll), R = pc(o.blr), T = pc(o.blt), B = pc(o.blb); if (L) band(0, 0, w * L, 0, 0, 0, w * L, h); if (R) band(w, 0, w - w * R, 0, w - w * R, 0, w * R, h); if (T) band(0, 0, 0, h * T, 0, 0, w, h * T); if (B) band(0, h, 0, h - h * B, 0, h - h * B, w, h * B); }
  // la carte du faisceau : plus fine quand l'optique est très décalée (l'image n'occupe alors qu'un coin du cône)
  const want = op.T / Math.hypot(op.a, op.b) > 1.25 && kind !== 'video' ? 2048 : 1024;
  if (r.canvas.width !== want){ r.canvas = document.createElement('canvas'); r.canvas.width = r.canvas.height = want; r.tex.dispose(); r.tex = new THREE.CanvasTexture(r.canvas); r.tex.colorSpace = THREE.SRGBColorSpace; }
  const c = r.canvas, g = c.getContext('2d'), Sz = c.width, px = ([tx, ty]) => [Sz / 2 * (1 + tx / op.T), Sz / 2 * (1 - ty / op.T)];
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, Sz, Sz);
  if (o.map && window.VIDEO && r.geom && VIDEO.mapDraw(r, g, px, op, sh)){ r.tex.needsUpdate = true; return; }          // mapping sur un volume (video.js)
  const q = op.quad.map(px), TL = q[3], TR = q[2], BR = q[1], BL = q[0];
  if (!op.warp) g.drawImage(r.src, TL[0], TL[1], BR[0] - TL[0], BR[1] - TL[1]);
  else { const f = quadMap([TL, TR, BR, BL]), N = 16, w = 1024, h = sh; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){ const u0 = i / N, u1 = (i + 1) / N, v0 = j / N, v1 = (j + 1) / N, a = f(u0, v0), b = f(u1, v0), cc = f(u1, v1), d = f(u0, v1), sa = [u0 * w, v0 * h], sb = [u1 * w, v0 * h], sc = [u1 * w, v1 * h], sd = [u0 * w, v1 * h]; triDraw(g, r.src, sa, sb, sc, a, b, cc); triDraw(g, r.src, sa, sc, sd, a, cc, d); } }
  r.tex.needsUpdate = true;
}

// ============================================================ mise à jour par image
// Optique d'un vidéoprojecteur, dans le plan à 1 m de l'objectif (x vers la droite du projecteur, y vers le haut) :
// rapport de projection, décalage d'optique (lsh / lsv, en % de la largeur / hauteur d'image), 4 coins (warp, en fractions de la matrice).
const VPC = [[0, 0], [1, 0], [1, 1], [0, 1]];
// l'optique montée (appareils du catalogue qui ont leur liste d'optiques), son rapport de projection et sa plage de décalage.
// vpShift rend { v: [bas, haut], h: [gauche, droite] } en % de l'image entière, ou null si la plage n'est pas connue (rien n'est alors limité).
// o.lens = '__c' : optique saisie à la main (rapport mini o.lcA, maxi o.lcB lus par l'utilisateur sur la fiche de son optique) — possible sur tout appareil.
const vpLens = (o, t) => { if (o.lens === '__c' && +o.lcA > 0){ const a = +o.lcA, b = +o.lcB > 0 ? +o.lcB : a; return { id: '__c', name: 'optique saisie', throw: [Math.min(a, b), Math.max(a, b)], shift: null, custom: true }; } return t.lenses ? t.lenses.find(l => l.id === o.lens) || t.lenses.find(l => l.id === t.lens) || t.lenses[0] : null; }, vpThrow = (o, t) => vpLens(o, t)?.throw || t.throw;
function vpShift(o, t){ const l = vpLens(o, t); if (!l) return null; const s = l.shift === undefined ? t.shift : l.shift; if (s === null || s === undefined) return null; if (s === 0) return { v: [0, 0], h: [0, 0], none: true };
  return o.hang ? { ...s, v: [-s.v[1], -s.v[0]], hung: true } : s; }          // suspendu, le projecteur est tête en bas : la plage verticale se retourne          // bas-gauche, bas-droite, haut-droite, haut-gauche
function vpOptics(o, t){
  const TR = vpThrow(o, t), SH = vpShift(o, t), th = clamp(o.throw ?? TR[0], TR[0], TR[1]), a = .5 / th, b = a * t.res[1] / t.res[0], lsh = SH ? clamp(o.lsh || 0, SH.h[0], SH.h[1]) : o.lsh || 0, lsv = SH ? clamp(o.lsv || 0, SH.v[0], SH.v[1]) : o.lsv || 0, cx = lsh / 100 * 2 * a, cy = lsv / 100 * 2 * b;
  const at = ([u, v]) => [cx + (u - .5) * 2 * a, cy + (v - .5) * 2 * b], warp = Array.isArray(o.warp) && o.warp.length === 4 && o.warp.some((c, i) => Math.abs(c[0] - VPC[i][0]) > 1e-4 || Math.abs(c[1] - VPC[i][1]) > 1e-4);
  const pan = VPC.map(at), quad = warp ? o.warp.map(c => at([clamp(c[0], 0, 1), clamp(c[1], 0, 1)])) : pan;
  let used = 1; if (warp){ const w = o.warp; used = 0; for (let i = 0; i < 4; i++){ const p = w[i], q = w[(i + 1) % 4]; used += p[0] * q[1] - q[0] * p[1]; } used = Math.abs(used) / 2; }
  return { th, a, b, cx, cy, lsh, lsv, pan, quad, warp, used, T: Math.max(...pan.map(p => Math.hypot(p[0], p[1]))) };
}
function vpGeom(o, t, r){
  const src = r.head.getWorldPosition(new THREE.Vector3()), d = dirOf(o.pan, o.tilt, new THREE.Vector3()), op = vpOptics(o, t);
  const rt = new THREE.Vector3().crossVectors(d, UP); if (rt.lengthSq() < 1e-6) rt.set(1, 0, 0); rt.normalize(); const up = new THREE.Vector3().crossVectors(rt, d);
  const dir = ([tx, ty]) => d.clone().addScaledVector(rt, tx).addScaledVector(up, ty), ch = hitAlong(src, dir([op.cx, op.cy]).normalize());
  const D = ch ? ch.point.clone().sub(src).dot(d) : 10;          // distance mesurée dans l'axe de l'objectif, jusqu'à la surface au centre de l'image
  const cast = p => { const v = dir(p), h = hitAlong(src, v.clone().normalize()); return h ? h.point.clone() : src.clone().addScaledVector(v, D); };
  const cn = op.quad.map(cast), ctr = ch ? ch.point.clone() : src.clone().addScaledVector(dir([op.cx, op.cy]), D);
  // la surface visée : le plan de ce que touche le centre de l'image. L'image y est mesurée (taille, trapèze, lux) ; cn garde les points
  // réellement éclairés, qui s'en écartent quand l'image déborde de la surface (un coin part sur le mur du fond, par exemple).
  const n = ch && ch.face ? ch.face.normal.clone().transformDirection(ch.object.matrixWorld) : d.clone().negate(); if (n.dot(d) > 0) n.negate();
  const k0 = ctr.clone().sub(src).dot(n), onPl = p => { const v = dir(p), den = v.dot(n), tt = Math.abs(den) > 1e-5 ? k0 / den : -1; return src.clone().addScaledVector(v, tt > 0 ? tt : D); }, pl = op.quad.map(onPl);
  const wB = pl[0].distanceTo(pl[1]), wT = pl[3].distanceTo(pl[2]), hL = pl[0].distanceTo(pl[3]), hR = pl[1].distanceTo(pl[2]), W = (wB + wT) / 2, H = (hL + hR) / 2;
  const tri = (p, q, s) => new THREE.Vector3().crossVectors(q.clone().sub(p), s.clone().sub(p)).length() / 2, area = Math.max(1e-6, tri(pl[0], pl[1], pl[2]) + tri(pl[0], pl[2], pl[3]));
  return { src, d, rt, up, op, D, W, H, th: op.th, cn, pl, n, ctr, wB, wT, hL, hR, area, hit: ch, spill: Math.max(...cn.map((p, i) => p.distanceTo(pl[i]))) > .05, kx: Math.max(wB, wT) / Math.max(1e-6, Math.min(wB, wT)) - 1, ky: Math.max(hL, hR) / Math.max(1e-6, Math.min(hL, hR)) - 1,
    lux: t.lumens * (o.bright ?? 1) * op.used / area, px: W / t.res[0] * 1000 };
}
const FA = {}, FB = {}, FC = {};
function fxOut(fx, p, sp, ph, o){ o.dp = 0; o.dt = 0; o.dm = 1; o.h = -1;
  if (fx === 'balayage') o.dp = Math.sin(p * 2.2 + ph * 2.4) * 38;
  else if (fx === 'cercle'){ o.dp = Math.cos(p * 2.4 + ph * 6.28) * 25; o.dt = Math.sin(p * 2.4 + ph * 6.28) * 18; }
  else if (fx === 'vague') o.dm = .15 + .85 * Math.pow(.5 + .5 * Math.sin(p * 4 - ph * 5), 2);
  else if (fx === 'huit'){ o.dp = Math.sin(p * 2.4 + ph * 3.14) * 30; o.dt = Math.sin(p * 4.8 + ph * 6.28) * 12; }
  else if (fx === 'chenillard'){ const w = (((p * 1.2 - ph * .86) % 1) + 1) % 1; o.dm = w < .16 ? 1 : w < .26 ? 1 - (w - .16) * 9 : .06; }
  else if (fx === 'pulse') o.dm = .25 + .75 * Math.pow(.5 + .5 * Math.sin(p * 5), 1.5);
  else if (fx === 'scintille'){ const k = Math.floor(p * 9), a = Math.sin((k + ph * 37.7) * 127.1) * 43758.5453, b = Math.sin((k + 1 + ph * 37.7) * 127.1) * 43758.5453, f = p * 9 - k; o.dm = .2 + .8 * ((a - Math.floor(a)) * (1 - f) + (b - Math.floor(b)) * f); }
  else if (fx === 'arc') o.h = (((p * .25 + ph * .5) % 1) + 1) % 1;
  else if (fx === 'strobe') o.dm = (sp % 1) < .18 ? 1 : 0; }
const AUD = { on: false, mod: () => null };              // rempli par audio.js : réaction des groupes à la musique
let LEDW = null;
const HIL = new Set(), FLS = new Set();                 // remplis par le pupitre : Highlight et Flash
const DMXIN = { on: false, read: () => null };          // rempli par dmx.js : valeurs reçues des consoles
// ---- ombres réelles : les projecteurs allumés les plus puissants portent une ombre (limite du nombre de cartes d'ombre que la carte graphique accepte à la fois)
let SHK = 6, shT = -1;          // nombre de vraies ombres : fixé d'après la carte graphique dans shadowPick
// ---------------------------------------------------------------- matières de base : chacune réagit à la lumière selon sa nature (mat, satiné, brillant, métal, velours, verre)
// r : rugosité (1 = mat, 0 = miroir) · m : métal · cc : vernis · sheen : duvet du velours · op : opacité · env : reflète la salle · tex/tile : motif et sa taille réelle en mètres
const MATS = [['peint', 'Peinture mate', { col: '#8a93a6', r: .88 }], ['satin', 'Peinture satinée', { col: '#8a93a6', r: .45 }], ['laque', 'Laqué brillant', { col: '#16161a', r: .1, cc: 1, env: 1 }],
  ['noir-mat', 'Noir mat (scène)', { col: '#0d0d0e', r: .96 }], ['tapis-n', 'Tapis de danse noir', { col: '#0e0e10', r: .36, env: 1 }], ['tapis-b', 'Tapis de danse blanc', { col: '#e6e6e2', r: .42 }],
  ['bois', 'Plancher bois clair', { col: '#ffffff', r: .6, tex: 'pin', tile: 1.92, n: .9 }], ['chene', 'Parquet chêne', { col: '#ffffff', r: .5, tex: 'chene', tile: 1.44, n: .6 }], ['plancher-n', 'Plancher de scène noir', { col: '#ffffff', r: .58, tex: 'noir', tile: 1.92, n: 1 }],
  ['bois-brut', 'Bois brut (planches)', { col: '#ffffff', r: .85, tex: 'brut', tile: 2.4, n: 1.4 }], ['cp', 'Contreplaqué', { col: '#ffffff', r: .72, tex: 'ply', tile: 2.5, n: .35 }], ['osb', 'Panneau OSB', { col: '#ffffff', r: .8, tex: 'osb', tile: 1.25, n: .5 }],
  ['brique', 'Brique', { col: '#ffffff', r: .9, tex: 'brick', tile: 1.76, n: 1.6 }], ['carrelage', 'Carrelage', { col: '#ffffff', r: .3, tex: 'tile', tile: 1.2, n: .8, env: 1 }], ['beton', 'Béton', { col: '#ffffff', r: .88, tex: 'beton', tile: 3, n: .5 }],
  ['moquette', 'Moquette', { col: '#5b5f68', r: 1, tex: 'noise', tile: .4, n: .5 }], ['velours', 'Velours noir', { col: '#09090b', r: 1, sheen: 1 }], ['tissu', 'Toile, coton blanc', { col: '#eeeae0', r: .96, tex: 'weave', tile: .16, n: .5 }],
  ['metal', 'Métal brossé', { col: '#b9bcc2', r: .34, m: 1, tex: 'brush', tile: .5, env: 1 }], ['alu', 'Alu poli, chrome', { col: '#d9dbe0', r: .07, m: 1, env: 1 }], ['miroir', 'Miroir', { col: '#ffffff', r: 0, m: 1, env: 1 }], ['verre', 'Verre, plexi', { col: '#dfeef2', r: .04, op: .22, env: 1 }]];
const MATBY = new Map(MATS.map(m => [m[0], m[2]])), MTEX = new Map();
// Motifs fabriqués ici (aucun fichier externe), raccordables bord à bord : une image de couleur et une image de relief, d'où l'on tire la carte de normales qui accroche la lumière rasante (joints de plancher, mortier, veinage).
function matTex(k){ if (MTEX.has(k)) return MTEX.get(k); const N = 1024, cv = document.createElement('canvas'), hv = document.createElement('canvas'); cv.width = cv.height = hv.width = hv.height = N; const c = cv.getContext('2d'), h = hv.getContext('2d'); let sd = 7 + [...k].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 11) % 100000; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const col = (b, t, a = 1) => `rgba(${Math.min(255, b[0] * t) | 0},${Math.min(255, b[1] * t) | 0},${Math.min(255, b[2] * t) | 0},${a})`; h.fillStyle = '#fff'; h.fillRect(0, 0, N, N);
  // plancher : rangées de lames aux joints décalés ; chaque lame a sa teinte, son veinage, parfois un nœud
  const planks = (rows, len, base, vary, gapA, grain, knotP, scuff) => { const pw = N / rows; for (let i = 0; i < rows; i++){ const y0 = i * pw; let a = rnd() * N; const end = a + N; while (a < end - 1){ const L = Math.min(end - a, len * (.7 + rnd() * .6)), s0 = sd;
        for (const dx of a + L > N ? [0, -N] : [0]){ sd = s0; const x0 = a + dx, t = 1 + (rnd() - .5) * vary; c.save(); c.beginPath(); c.rect(x0, y0, L, pw); c.clip(); c.fillStyle = col(base, t); c.fillRect(x0, y0, L, pw);
          for (let j = 0; j < grain; j++){ const y = y0 + rnd() * pw, al = .04 + rnd() * .1, am = rnd() * 2.2, f = .004 + rnd() * .012, ph = rnd() * 7; c.strokeStyle = rnd() > .45 ? col(base, .45, al) : col(base, 1.35, al * .8); c.lineWidth = .6 + rnd() * 1.7; c.beginPath(); for (let x = 0; x <= L; x += 24) c[x ? 'lineTo' : 'moveTo'](x0 + x, y + Math.sin(x * f + ph) * am); c.stroke(); }
          if (rnd() < knotP){ const kx = x0 + L * (.15 + rnd() * .7), ky = y0 + pw * (.25 + rnd() * .5), kr = pw * (.07 + rnd() * .1); for (let q = 4; q >= 0; q--){ c.strokeStyle = col(base, .42, .16); c.lineWidth = 1; c.beginPath(); c.ellipse(kx, ky, kr * (1 + q * .7) * 1.9, kr * (1 + q * .5), 0, 0, 7); c.stroke(); } c.fillStyle = col(base, .36, .8); c.beginPath(); c.ellipse(kx, ky, kr * 1.5, kr, 0, 0, 7); c.fill(); }
          if (scuff) for (let j = 0; j < scuff; j++){ c.strokeStyle = `rgba(${150 + rnd() * 60 | 0},${140 + rnd() * 50 | 0},${120 + rnd() * 40 | 0},${.03 + rnd() * .07})`; c.lineWidth = 1 + rnd() * 3; const sx = x0 + rnd() * L, sy = y0 + rnd() * pw; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + (rnd() - .5) * 140, sy + (rnd() - .5) * 30); c.stroke(); }
          c.restore(); c.fillStyle = `rgba(8,5,2,${gapA})`; c.fillRect(x0, y0, L, 1.6); c.fillRect(x0, y0, 1.6, pw); h.fillStyle = `rgb(${(232 + (t - 1) * 60) | 0},0,0)`; h.fillRect(x0, y0, L, pw); h.fillStyle = '#000'; h.fillRect(x0, y0 - 1, L, 2.6); h.fillRect(x0 - 1, y0, 2.6, pw); } a += L; } } };
  const blobs = (n, r0, r1, f) => { for (let j = 0; j < n; j++){ const x = rnd() * N, y = rnd() * N, r = r0 + rnd() * (r1 - r0), s0 = sd; for (const dx of [0, x < r ? N : x > N - r ? -N : null]) for (const dy of [0, y < r ? N : y > N - r ? -N : null]){ if (dx == null || dy == null) continue; sd = s0; f(x + dx, y + dy, r); } } };
  if (k === 'pin') planks(16, 620, [214, 170, 112], .2, .5, 26, .22);
  else if (k === 'chene') planks(16, 430, [168, 122, 74], .24, .55, 34, .06);
  else if (k === 'noir') planks(16, 700, [26, 25, 24], .3, .85, 10, 0, 5);
  else if (k === 'brut') planks(12, 900, [176, 148, 108], .3, .8, 44, .5);
  else if (k === 'ply'){ c.fillStyle = 'rgb(214,186,140)'; c.fillRect(0, 0, N, N); for (let j = 0; j < 520; j++){ const y = rnd() * N, al = .03 + rnd() * .07, am = 3 + rnd() * 16, q = 1 + (rnd() * 3 | 0), ph = rnd() * 7; c.strokeStyle = rnd() > .5 ? `rgba(120,80,30,${al})` : `rgba(255,238,205,${al})`; c.lineWidth = .7 + rnd() * 2.6; c.beginPath(); for (let x = 0; x <= N; x += 16) c[x ? 'lineTo' : 'moveTo'](x, y + Math.sin(x / N * Math.PI * 2 * q + ph) * am); c.stroke(); }
    c.fillStyle = 'rgba(40,25,10,.55)'; h.fillStyle = '#000'; for (const y of [0, N / 2]){ c.fillRect(0, y, N, 1.6); h.fillRect(0, y - 1, N, 2.6); } c.fillRect(0, 0, 1.6, N); h.fillRect(0, 0, 2.6, N); }
  else if (k === 'osb'){ c.fillStyle = 'rgb(176,140,84)'; c.fillRect(0, 0, N, N); blobs(2600, 26, 60, (x, y, r) => { const t = .7 + rnd() * .65, an = rnd() * Math.PI; c.save(); c.translate(x, y); c.rotate(an); c.fillStyle = col([196, 158, 98], t, .88); c.fillRect(-r, -r * .2, r * 2, r * .4); c.strokeStyle = 'rgba(60,38,14,.25)'; c.lineWidth = .8; c.strokeRect(-r, -r * .2, r * 2, r * .4); c.restore(); h.save(); h.translate(x, y); h.rotate(an); h.fillStyle = `rgb(${200 + rnd() * 55 | 0},0,0)`; h.fillRect(-r, -r * .2, r * 2, r * .4); h.restore(); }); }
  else if (k === 'brick'){ const bw = N / 8, bh = N / 24, mo = 5; c.fillStyle = 'rgb(186,180,168)'; c.fillRect(0, 0, N, N); h.fillStyle = '#000'; h.fillRect(0, 0, N, N); for (let i = 0; i < 24; i++) for (let j = -1; j < 8; j++){ const x = j * bw + (i % 2 ? bw / 2 : 0), y = i * bh, t = .78 + rnd() * .4, s0 = sd; for (const dx of x < 0 ? [0, N] : [0]){ sd = s0; c.fillStyle = col([150 + rnd() * 26, 74 + rnd() * 16, 56], t); c.fillRect(x + dx + mo / 2, y + mo / 2, bw - mo, bh - mo); for (let q = 0; q < 26; q++){ c.fillStyle = `rgba(${rnd() > .5 ? 255 : 40},${rnd() > .5 ? 220 : 30},${rnd() > .5 ? 200 : 20},${.03 + rnd() * .06})`; c.fillRect(x + dx + mo + rnd() * (bw - 2 * mo), y + mo + rnd() * (bh - 2 * mo), 1 + rnd() * 5, 1 + rnd() * 3); } h.fillStyle = `rgb(${215 + rnd() * 40 | 0},0,0)`; h.fillRect(x + dx + mo / 2, y + mo / 2, bw - mo, bh - mo); } } }
  else if (k === 'tile'){ const g = N / 4, jo = 5; c.fillStyle = 'rgb(120,118,112)'; c.fillRect(0, 0, N, N); h.fillStyle = '#000'; h.fillRect(0, 0, N, N); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++){ const t = .93 + rnd() * .12; c.fillStyle = col([206, 202, 192], t); c.fillRect(j * g + jo / 2, i * g + jo / 2, g - jo, g - jo); for (let q = 0; q < 60; q++){ c.fillStyle = `rgba(${rnd() > .5 ? 255 : 90},${rnd() > .5 ? 255 : 90},${rnd() > .5 ? 250 : 80},${.02 + rnd() * .04})`; c.beginPath(); c.arc(j * g + jo + rnd() * (g - 2 * jo), i * g + jo + rnd() * (g - 2 * jo), 2 + rnd() * 14, 0, 7); c.fill(); } h.fillStyle = '#fff'; h.fillRect(j * g + jo / 2 + 1, i * g + jo / 2 + 1, g - jo - 2, g - jo - 2); } }
  else if (k === 'beton'){ c.fillStyle = 'rgb(150,150,146)'; c.fillRect(0, 0, N, N); blobs(170, 40, 190, (x, y, r) => { const v = rnd() > .5 ? 255 : 60, g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${v},${v},${v},${.05 + rnd() * .06})`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
    for (let j = 0; j < 30000; j++){ const v = 110 + rnd() * 110; c.fillStyle = `rgba(${v},${v},${v},${.12 + rnd() * .3})`; c.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 1.6, 1 + rnd() * 1.6); } blobs(240, 1.2, 4.5, (x, y, r) => { c.fillStyle = 'rgba(40,40,40,.55)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); h.fillStyle = '#000'; h.beginPath(); h.arc(x, y, r, 0, 7); h.fill(); }); c.fillStyle = 'rgba(40,40,40,.3)'; h.fillStyle = 'rgb(120,0,0)'; c.fillRect(0, 0, N, 1.5); h.fillRect(0, 0, N, 2.5); }
  else if (k === 'noise'){ c.fillStyle = '#d2d2d2'; c.fillRect(0, 0, N, N); for (let j = 0; j < 90000; j++){ const v = 150 + rnd() * 105, x = rnd() * N, y = rnd() * N; c.fillStyle = `rgba(${v},${v},${v},${.25 + rnd() * .5})`; c.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2); h.fillStyle = `rgb(${v | 0},0,0)`; h.fillRect(x, y, 2, 2); } }
  else if (k === 'weave'){ c.fillStyle = '#e9e9e9'; c.fillRect(0, 0, N, N); const n = 64, st = N / n; for (let i = 0; i < n; i++){ c.fillStyle = `rgba(0,0,0,${.06 + rnd() * .1})`; c.fillRect(0, i * st, N, st * .34); c.fillRect(i * st, 0, st * .34, N); c.fillStyle = `rgba(255,255,255,${.1 + rnd() * .12})`; c.fillRect(0, i * st + st * .5, N, st * .3); h.fillStyle = '#000'; h.fillRect(0, i * st, N, st * .34); h.fillRect(i * st, 0, st * .34, N); } }
  else { c.fillStyle = '#dcdcdc'; c.fillRect(0, 0, N, N); for (let j = 0; j < 5200; j++){ const v = rnd() > .5 ? 255 : 110; c.strokeStyle = `rgba(${v},${v},${v},${.04 + rnd() * .1})`; c.lineWidth = .4 + rnd(); const y = rnd() * N; c.beginPath(); c.moveTo(0, y); c.lineTo(N, y); c.stroke(); } }
  const mk = (cvs, srgb) => { const t = new THREE.CanvasTexture(cvs); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }, out = { map: mk(cv, true), nrm: null };
  if (k !== 'brush'){ const H = h.getImageData(0, 0, N, N).data, nv = document.createElement('canvas'); nv.width = nv.height = N; const nc = nv.getContext('2d'), im = nc.createImageData(N, N), D = im.data, at = (x, y) => H[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){ const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2, dy = (at(x, y + 1) - at(x, y - 1)) * 2.2, l = 1 / Math.hypot(dx, dy, 1), i = (y * N + x) * 4; D[i] = (-dx * l * .5 + .5) * 255; D[i + 1] = (dy * l * .5 + .5) * 255; D[i + 2] = (l * .5 + .5) * 255; D[i + 3] = 255; } nc.putImageData(im, 0, 0); out.nrm = mk(nv, false); }
  MTEX.set(k, out); return out; }
// reflet de la salle pour les matières brillantes : une sonde cubique rendue depuis le milieu des objets concernés, rafraîchie toutes les 1,5 s
let envRT = null, envCam = null, envT = -9;
const envTex = () => { if (!envRT){ envRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType }); envCam = new THREE.CubeCamera(.15, 90, envRT); } return envRT.texture; };
function envTick(){ if (!envRT || (UI.t - envT < 1.5 && UI.t >= envT)) return; let n = 0, x = 0, y = 0, z = 0; for (const o of S.objs){ if (o.mat && MATBY.get(o.mat)?.env && !o.hidden){ n++; x += o.pos[0]; y += o.pos[1] + ((o.size && o.size[2]) || 1) / 2; z += o.pos[2]; } }
  for (const s of S.shapes || []){ if (s.mat && MATBY.get(s.mat)?.env){ const p = s.k === 'poly' ? s.p[0] : s.c; n++; x += p[0]; y += (s.y || 0) + (s.h || 0) / 2; z += p[1]; } } if (!n) return; envT = UI.t; envCam.position.set(x / n, Math.max(.3, y / n), z / n);
  const gv = gizmo && gizmo.visible, hv = gizmoHelper && gizmoHelper.visible; if (gizmoHelper) gizmoHelper.visible = false; try { envCam.update(A.renderer, A.scene); } catch (e){ } if (gizmoHelper) gizmoHelper.visible = hv; }
function matFor(id, col, o = {}){ const d = MATBY.get(id) || MATBY.get('peint'), phys = d.cc || d.sheen, P = { color: col || d.col, roughness: d.r, metalness: d.m || 0, side: o.side ?? THREE.FrontSide };
  if (d.tex){ const T = matTex(d.tex); P.map = T.map; if (T.nrm && d.n){ P.normalMap = T.nrm; P.normalScale = new THREE.Vector2(d.n, d.n); } } if (d.op){ P.transparent = true; P.opacity = d.op; P.depthWrite = false; P.side = THREE.DoubleSide; } if (d.cc){ P.clearcoat = d.cc; P.clearcoatRoughness = .06; } if (d.sheen){ P.sheen = d.sheen; P.sheenRoughness = .45; P.sheenColor = new THREE.Color('#3a3a44'); }
  const m = phys ? new THREE.MeshPhysicalMaterial(P) : new THREE.MeshStandardMaterial(P); if (d.env){ m.envMap = envTex(); m.envMapIntensity = 1; envT = -9; } return m; }
// coordonnées de texture par projection sur les trois plans, en mètres réels : le motif garde sa taille quelle que soit la forme
function boxUV(g, tile = 1){ if (g.index) g = g.toNonIndexed(); const p = g.attributes.position, uv = new Float32Array(p.count * 2), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3){ a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); n.subVectors(b, a).cross(c.clone().sub(a)); const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z), k = ay >= ax && ay >= az ? 1 : ax >= az ? 0 : 2;
    [a, b, c].forEach((v, j) => { uv[(i + j) * 2] = (k === 0 ? v.z : v.x) / tile; uv[(i + j) * 2 + 1] = (k === 1 ? v.z : v.y) / tile; }); } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; }
const matTile = id => MATBY.get(id)?.tex ? MATBY.get(id).tile : 0;
// ---------------------------------------------------------------- ombres de tous les projecteurs : un atlas de cartes de profondeur, une case par projecteur
// Le moteur ne sait donner une vraie carte d'ombre qu'à quelques spots (une unité de texture chacun, voir shadowPick). Tous les autres projecteurs allumés reçoivent ici une case 256 px dans UN atlas (une seule unité de texture),
// vue depuis leur lentille. Cet atlas sert deux fois : au faisceau dans la fumée (beamFS) et à l'éclairage des surfaces (morceau de shader ajouté à l'éclairage des spots, ci-dessous). Le numéro de case voyage dans
// l'exposant d'atténuation du spot (decay = 2 + numéro × 1e-5, sans effet visible sur la lumière) : pas besoin de connaître l'ordre dans lequel le moteur range ses spots.
const OCCN = 8, OCCT = 256, OCCQ = [], OCCCAM = new THREE.PerspectiveCamera(40, 1, .35, 20), OCCMAT = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }), OCCBIAS = new THREE.Matrix4(), OCCFREE = Array.from({ length: OCCN * OCCN }, (_, i) => i).reverse(); OCCCAM.layers.set(1); let occLT = -1e9, OCCA = null; const _occC = new THREE.Color();
const OCCDATA = new Float32Array(6 * OCCN * OCCN * 4), OCCD = new THREE.DataTexture(OCCDATA, 6, OCCN * OCCN, THREE.RGBAFormat, THREE.FloatType); OCCD.minFilter = OCCD.magFilter = THREE.NearestFilter; OCCD.needsUpdate = true;
const OCCU = { a: { value: null }, d: { value: OCCD } };
function occInit(){ if (OCCA) return; OCCA = new THREE.WebGLRenderTarget(OCCN * OCCT, OCCN * OCCT, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); OCCA.scissorTest = true; OCCU.a.value = OCCA.texture;
  // tous les matériaux éclairés reçoivent l'atlas et sa table ; le morceau de shader est ajouté une fois pour toutes à l'éclairage des spots
  goboAtlas(); THREE.Material.prototype.onBeforeCompile = function (sh){ sh.uniforms.sfOccA = OCCU.a; sh.uniforms.sfOccD = OCCU.d; sh.uniforms.sfFxD = FXU.d; sh.uniforms.sfGob = FXU.g; };
  const C = THREE.ShaderChunk; if (!C.lights_pars_begin.includes('sfOccA')){ C.lights_pars_begin += '\nuniform sampler2D sfOccA;\nuniform highp sampler2D sfOccD;\nuniform highp sampler2D sfFxD;\nuniform sampler2D sfGob;\n' + SFMASK;
    const key = 'spotLight = spotLights[ i ];', i0 = C.lights_fragment_begin.indexOf(key), i1 = C.lights_fragment_begin.indexOf('RE_Direct(', i0);
    if (i0 > 0 && i1 > i0) C.lights_fragment_begin = C.lights_fragment_begin.slice(0, i1) + `{ int sfT = int( floor( ( spotLight.decay - 2.0 ) * 100000.0 + 0.5 ) ), sfS = sfT / 100, sfI = sfT - sfS * 100;          // deux numéros voyagent dans l'exposant d'atténuation : la case d'ombre (1 à 64) et la ligne du masque iris / couteaux / gobo (× 100)
			if ( sfT > 0 && directLight.visible ) directLight.color *= pow( max( length( spotLight.position - geometryPosition ), 0.1 ), spotLight.decay - 2.0 );          // on rend à l'atténuation son exposant exact (2)
			if ( sfS > 0 && sfS <= ${FXN} && directLight.visible ) { sfS -= 1; vec4 sfA = texelFetch( sfFxD, ivec2( 0, sfS ), 0 ), sfB1 = texelFetch( sfFxD, ivec2( 1, sfS ), 0 ), sfB2 = texelFetch( sfFxD, ivec2( 2, sfS ), 0 ), sfB3 = texelFetch( sfFxD, ivec2( 3, sfS ), 0 ), sfB4 = texelFetch( sfFxD, ivec2( 4, sfS ), 0 );
				vec3 sfDr = - spotLight.direction, sfRt = mat3( viewMatrix ) * sfA.xyz, sfL = geometryPosition - spotLight.position; float sfAl = max( dot( sfL, sfDr ), 1e-4 ); vec3 sfPr = sfL - sfAl * sfDr;
				directLight.color *= sfMask( vec2( dot( sfPr, sfRt ), dot( sfPr, cross( sfDr, sfRt ) ) ) / ( sfAl * sfA.w ), sfB1.xyz, sfB2.xyz, sfB3.xyz, sfB4.xyz, sfB1.w, sfB2.w, sfB3.w, sfGob, texelFetch( sfFxD, ivec2( 5, sfS ), 0 ).xyz ); }
			if ( sfI > 0 && sfI <= ${OCCN * OCCN} && directLight.visible ) { sfI -= 1;
				mat4 sfM = mat4( texelFetch( sfOccD, ivec2( 0, sfI ), 0 ), texelFetch( sfOccD, ivec2( 1, sfI ), 0 ), texelFetch( sfOccD, ivec2( 2, sfI ), 0 ), texelFetch( sfOccD, ivec2( 3, sfI ), 0 ) );
				vec4 sfR = texelFetch( sfOccD, ivec2( 4, sfI ), 0 ), sfNF = texelFetch( sfOccD, ivec2( 5, sfI ), 0 ); mat3 sfV = transpose( mat3( viewMatrix ) );
				vec4 sfC = sfM * vec4( sfV * ( geometryPosition - viewMatrix[ 3 ].xyz ) + sfV * geometryNormal * 0.035, 1.0 ); vec3 sfQ = sfC.xyz / sfC.w;
				if ( sfC.w > 0.0 && sfQ.x > sfR.x && sfQ.x < sfR.z && sfQ.y > sfR.y && sfQ.y < sfR.w && sfQ.z < 1.0 && sfQ.z > 0.0 ) {
					float sfZ = sfNF.x * sfNF.y / ( sfNF.y - sfQ.z * ( sfNF.y - sfNF.x ) ) - 0.05, sfL = 0.0;
					for ( int sfK = 0; sfK < 4; sfK ++ ) { vec2 sfO = vec2( sfK == 0 || sfK == 3 ? -0.35 : 0.35, sfK < 2 ? -0.35 : 0.35 ) / ${OCCN * OCCT}.0; float sfD = unpackRGBAToDepth( texture2D( sfOccA, clamp( sfQ.xy + sfO, sfR.xy, sfR.zw ) ) ); sfL += step( sfZ, sfNF.x * sfNF.y / ( sfNF.y - sfD * ( sfNF.y - sfNF.x ) ) ); }
					directLight.color *= sfL * 0.25; } } }
		` + C.lights_fragment_begin.slice(i1); }
  A.scene.traverse(m => { const mm = m.material; if (mm) for (const q of Array.isArray(mm) ? mm : [mm]) q.needsUpdate = true; }); }
function occFree(r){ if (r.occI != null){ OCCFREE.push(r.occI); r.occI = null; } r.occOK = false; }
let occPT = 0, occMs = 16;
function occFlush(){ { const n = performance.now(); occMs = occMs * .8 + Math.min(200, n - occPT) * .2; occPT = n; } if (!OCCQ.length) return; occInit(); OCCQ.sort((a, b) => a[0] - b[0]); const R = A.renderer, sc = A.scene;
  if (performance.now() - occLT > 700){ occLT = performance.now(); sc.traverse(m => { if (m.isMesh){ if (m.castShadow && !m.material?.transparent) m.layers.enable(1); else m.layers.disable(1); } }); }
  const rt0 = R.getRenderTarget(), ov = sc.overrideMaterial, bg = sc.background, ca = R.getClearAlpha(), au = R.shadowMap.autoUpdate, xr = R.xr.enabled; R.getClearColor(_occC); sc.overrideMaterial = OCCMAT; sc.background = null; R.setClearColor(0xffffff, 1); R.shadowMap.autoUpdate = false; R.xr.enabled = false; let ch = false;
  try { for (const [, r, v, d, ang, L0] of OCCQ.splice(0, occMs > 70 ? 1 : occMs > 40 || A.quality === 'basse' ? 2 : 4)){ if (RT.get(r.o.id) !== r) continue; if (r.occI == null){ if (!OCCFREE.length) continue; r.occI = OCCFREE.pop(); r.occM = new THREE.Matrix4(); r.occR = new THREE.Vector4(); }
      const tx = r.occI % OCCN, ty = r.occI / OCCN | 0, k = 1 / OCCN, e = .75 / (OCCN * OCCT);
      OCCCAM.position.copy(v); OCCCAM.up.set(0, Math.abs(d.y) > .98 ? 0 : 1, Math.abs(d.y) > .98 ? 1 : 0); OCCCAM.lookAt(v.x + d.x, v.y + d.y, v.z + d.z); OCCCAM.fov = Math.min(160, ang * 2 * R2D * 1.12 + 2); OCCCAM.far = Math.max(2, L0 + 1); OCCCAM.updateProjectionMatrix(); OCCCAM.updateMatrixWorld(true);
      OCCBIAS.set(.5 * k, 0, 0, (.5 + tx) * k, 0, .5 * k, 0, (.5 + ty) * k, 0, 0, .5, .5, 0, 0, 0, 1); r.occM.copy(OCCBIAS).multiply(OCCCAM.projectionMatrix).multiply(OCCCAM.matrixWorldInverse); r.occR.set(tx * k + e, ty * k + e, (tx + 1) * k - e, (ty + 1) * k - e);
      OCCA.viewport.set(tx * OCCT, ty * OCCT, OCCT, OCCT); OCCA.scissor.set(tx * OCCT, ty * OCCT, OCCT, OCCT); R.setRenderTarget(OCCA); R.clear(); R.render(sc, OCCCAM);
      const o = r.occI * 24; OCCDATA.set(r.occM.elements, o); OCCDATA[o + 16] = r.occR.x; OCCDATA[o + 17] = r.occR.y; OCCDATA[o + 18] = r.occR.z; OCCDATA[o + 19] = r.occR.w; OCCDATA[o + 20] = OCCCAM.near; OCCDATA[o + 21] = OCCCAM.far; ch = true; r.occOK = true; r.occT2 = UI.t; } } catch (e){ }
  if (ch) OCCD.needsUpdate = true; OCCQ.length = 0; sc.overrideMaterial = ov; sc.background = bg; R.setClearColor(_occC, ca); R.shadowMap.autoUpdate = au; R.xr.enabled = xr; R.setRenderTarget(rt0); }
function shadowPick(){ const c = []; for (const [id, r] of RT){ if (!r.light || r.t.cat !== 'lum' || !r.light.visible || String(id).startsWith('__th')) continue; const d = r.cdim ?? r.o.dim ?? 0; if (d > .02) c.push([d * (r.t.lumens || 8000) * (r.light.castShadow ? 1.25 : 1), r]); }
  { let nv = 0; for (const r of RT.values()) if (r.t.cat === 'vid' && r.light && r.light.castShadow) nv++; SHK = Math.max(3, clamp((A.renderer.capabilities.maxTextures || 16) - 10, 4, 12) - nv); }          // chaque ombre prend une unité de texture ; on en garde 8 pour les matières
  c.sort((a, b) => b[0] - a[0]); const keep = new Set(c.slice(0, SHK).map(x => x[1])); for (const r of RT.values()) if (r.light && r.t.cat === 'lum' && r.light.castShadow !== keep.has(r)){ r.light.castShadow = keep.has(r); if (r.light.castShadow) r.light.shadow.needsUpdate = true; } }
function update(dt){
  UI.t += dt; BEAMT.value = UI.t; occFlush(); envTick(); if (LEDW) LEDW.update(dt);
  if (UI.auto && S.cues.length && window.ENG){ const r0 = ENG.rt(0); if (!(r0.on && r0.k < 1)){ UI.autoT = (UI.autoT || 0) + dt; const c = S.cues[UI.cue]; if (!c || UI.autoT >= (c.hold ?? 6)){ UI.autoT = 0; goCue((UI.cue + 1) % S.cues.length, { keepProg: true }); render(); } } }
  const live = A.live, master = S.black ? 0 : S.master, t = UI.t; if (UI.t - shT > .3 || UI.t < shT){ shT = UI.t; shadowPick(); }
  let nvp = 0; const grpCount = {}, grpIdx = {};
  for (const o of S.objs) if (o.grp) grpCount[o.grp] = (grpCount[o.grp] || 0) + 1;
  for (const o of S.objs){
    const r = RT.get(o.id); if (!r) continue; const ty = r.t;
    if (o.hidden || layHid(o)){ if (!r.hid){ r.hid = true; r.root.visible = false; r.extra.forEach(e => e.visible = false); if (r.light) r.light.visible = false; } continue; } else if (r.hid){ r.hid = false; r.root.visible = true; r.dirty = true; }
    posOf(o, r.root.position);
    if (ty.cat === 'lum'){
      const n = grpCount[o.grp] || 1, i = grpIdx[o.grp] = (grpIdx[o.grp] ?? -1) + 1, ph = n > 1 ? i / (n - 1) : 0, s = o.speed ?? .5;
      let dim = o.dim ?? 0, pan = o.pan, tilt = o.tilt; _c.set(o.color || '#fff');
      const dx = DMXIN.on ? DMXIN.read(o, ty, _c) : null; if (dx){ dim = dx.dim; if (dx.pan !== undefined){ pan = dx.pan; tilt = dx.tilt; } }
      const au = dx ? null : FXHOOK.mod ? FXHOOK.mod(o, ph, i, n) : AUD.on ? AUD.mod(o, ph, i, n) : null, sp = au ? s * au.rate : s; if (au && au.col) _c.copy(au.col);
      r.fp = (r.fp ?? t * s) + dt * sp; r.sp = (r.sp ?? 0) + dt * (3 + s * 12);
      fxOut(dx ? 'fixe' : o.fx, r.fp, r.sp, ph, FA);
      if (dx){ if (dx.strobe){ r.dsp = (r.dsp || 0) + dt * dx.strobe; FA.dm = (r.dsp % 1) < .3 ? 1 : 0; } }
      else if (r.fxFrom != null && r.fxMix < 1){ fxOut(r.fxFrom, r.fp, r.sp, ph, FB); const m = r.fxMix; FA.dp = FB.dp + (FA.dp - FB.dp) * m; FA.dt = FB.dt + (FA.dt - FB.dt) * m; FA.dm = FB.dm + (FA.dm - FB.dm) * m;
        const ca = FB.h >= 0 ? _c2.setHSL(FB.h, 1, .55) : _c2.copy(_c); if (FA.h >= 0) _c.setHSL(FA.h, 1, .55); _c.copy(ca.lerp(_c, m)); }
      else if (FA.h >= 0) _c.setHSL(FA.h, 1, .55);
      if (!dx){ const amp = o.amp ?? 1, dep = d => amp < 1 ? 1 - amp * (1 - d) : d; FA.dp *= amp; FA.dt *= amp; FA.dm = dep(FA.dm);
        for (const [fk, sk, pk] of SLOTS){ const f = o[fk]; if (!f || f === 'fixe') continue; r[pk] = (r[pk] ?? t * s) + dt * (o[sk] ?? s) * (au ? au.rate : 1); fxOut(f, r[pk], r.sp, ph, FC); FA.dp += FC.dp * amp; FA.dt += FC.dt * amp; FA.dm *= dep(FC.dm); if (FC.h >= 0) _c.setHSL(FC.h, 1, .55); } }
      pan += FA.dp; tilt += FA.dt; dim *= FA.dm; if (au){ dim *= au.dim; if (au.flash) _c.lerp(_c2.set('#ffffff'), au.flash * .6); }
      if (HIL.has(o.id)){ dim = 1; _c.set('#ffffff'); } else if (FLS.has(o.id)) dim = 1;
      const hard = dx ? !!dx.strobe : o.fx === 'strobe' || o.fx2 === 'strobe' || o.fx3 === 'strobe' || r.fxFrom === 'strobe' || (au && au.hard);
      if (ty.mover){ const a = r.cpan === undefined ? 1 : 1 - Math.exp(-dt * 6.5); r.cpan = (r.cpan ?? pan) + (pan - (r.cpan ?? pan)) * a; r.ctilt = (r.ctilt ?? tilt) + (tilt - (r.ctilt ?? tilt)) * a; pan = r.cpan; tilt = r.ctilt; }
      { const a = hard || r.cdim === undefined ? 1 : 1 - Math.exp(-dt * (ty.color === 'gel' ? 7 : 16)); r.cdim = (r.cdim ?? dim) + (dim - (r.cdim ?? dim)) * a; dim = r.cdim; }
      dim *= master;
      dirOf(pan, tilt, _d); if (r.yoke){ r.yoke.rotation.y = pan * D2R; r.head.rotation.set(-tilt * D2R, 0, 0); } else r.head.quaternion.setFromUnitVectors(DOWN, _d); if (r.gPan) r.gPan.rotation.z = pan * D2R; if (r.gTilt) r.gTilt.rotation.x = tilt * D2R;
      const vis = live; r.light.visible = vis; r.beam.visible = vis && dim > .002 && S.haze > .01 && A.camera.isPerspectiveCamera;
      if (vis){
        const zoom = clamp((dx && dx.zoom !== undefined ? dx.zoom : o.zoom) ?? ty.zoom[0], ty.zoom[0], ty.zoom[1]), FC = r.fxc || (r.fxc = fxCaps(ty)), fv = (k, def) => { const v = dx && dx[k] !== undefined ? dx[k] : o[k]; return v === undefined || v === null || v !== v ? def : +v; };
        const iris = FC.iris ? clamp(fv('iris', 1), .15, 1) : 1, prism = FC.prism ? (PRISMS.includes(Math.round(fv('prism', 0))) ? Math.round(fv('prism', 0)) : 0) : 0, ang0 = Math.atan(Math.tan(zoom * D2R / 2) * iris), ang = prism ? Math.atan(Math.tan(ang0) * (1 + PRISMOFF)) : ang0;          // avec un prisme le cône s'élargit pour contenir les copies
        if (!HIL.has(o.id)){ const cw = FC.wheel ? CWHEEL[clamp(Math.round(fv('cw', 0)), 0, CWHEEL.length - 1)] : null, cto = FC.cto ? clamp(fv('cto', 0), 0, 1) : 0; if (cw && cw[2]) _c.multiply(cw[2]); if (cto > .001) _c.multiply(_cf.setRGB(1, 1, 1).lerp(CTOF, cto)); }          // filtres : ils multiplient la lumière          // l'iris resserre le faisceau sans changer son intensité : il coupe du flux, pas de la densité
        const gobo = FC.gobo ? clamp(Math.round(fv('gobo', 0)), 0, GOBOS.length - 1) : 0, bl = FC.blades ? [fv('b1', 0), fv('b2', 0), fv('b3', 0), fv('b4', 0)] : null, fxAct = gobo > 0 || prism > 0 || (bl && (bl[0] > .001 || bl[1] > .001 || bl[2] > .001 || bl[3] > .001));
        if (fxAct && dim > .002){ if (r.fxI == null && FXFREE.length) r.fxI = FXFREE.pop(); } else fxFree(r);
        if (r.fxI != null){ const U = r.bm.uniforms, foc = clamp(fv('focus', 0), 0, 1), spin = fv('gobos', 0), gr = (fv('gobor', 0) + (spin ? (UI.t || 0) * spin * 360 : 0)) * D2R, k0 = r.fxI * 24, F = FXDATA, tn = Math.tan(ang0), psp = fv('prisms', 0), pr = (fv('prismr', 0) + (psp ? (UI.t || 0) * psp * 360 : 0)) * D2R;
          const rt = _v2.set(1, 0, 0); if (r.yoke) rt.applyAxisAngle(UP, pan * D2R); else rt.applyQuaternion(r.head.quaternion);          // la droite de l'appareil : l'axe de bascule de la tête
          F[k0] = rt.x; F[k0 + 1] = rt.y; F[k0 + 2] = rt.z; F[k0 + 3] = tn; U.fxRt.value.copy(rt); U.fxDir.value.copy(_d); U.fxTan.value = tn; U.fxG.value.set(gobo, gr, foc); U.fxP.value.set(prism, pr, PRISMOFF); F[k0 + 20] = prism; F[k0 + 21] = pr; F[k0 + 22] = PRISMOFF; F[k0 + 23] = 0;
          for (let i = 0; i < 4; i++){ const ins = bl ? clamp(bl[i], 0, 1) : 0, a = (90 - i * 90 + (bl ? clamp(fv('b' + (i + 1) + 'r', 0), -45, 45) : 0)) * D2R, nx = Math.cos(a), ny = Math.sin(a), d = ins > .001 ? 1 - 2 * ins : 9, q = k0 + 4 + i * 4;          // couteau 1 en haut, 2 à droite, 3 en bas, 4 à gauche
            F[q] = nx; F[q + 1] = ny; F[q + 2] = d; F[q + 3] = i === 0 ? gobo : i === 1 ? gr : i === 2 ? foc : 0; U['fxB' + (i + 1)].value.set(nx, ny, d); }
          FXD.needsUpdate = true; U.fxOn.value = 1; } else r.bm.uniforms.fxOn.value = 0;
        r.head.getWorldPosition(_v); if (r.fxI != null) r.bm.uniforms.fxO.value.copy(_v); r.light.position.copy(_v).addScaledVector(_d, .02);
        r.light.target.position.copy(_v).addScaledVector(_d, 10); r.light.target.updateMatrixWorld();
        r.light.color.copy(_c); r.light.angle = Math.min(1.5, ang * 1.05); r.light.intensity = dim * dispI(candela(ty.lumens, zoom));
        // le faisceau s'arrête sur le premier obstacle rencontré dans son axe (décor, praticable, mur, sol) : il ne traverse plus les objets
        const L0 = _d.y < -.05 ? Math.min(18, (_v.y + 1.5) / -_d.y) : 16, ok_ = (_v.x * 50 | 0) + ',' + (_v.y * 50 | 0) + ',' + (_v.z * 50 | 0) + ',' + (_d.x * 400 | 0) + ',' + (_d.y * 400 | 0) + ',' + (_d.z * 400 | 0);
        if (r.occN === undefined) r.occN = Math.random() * 20 | 0; const due = s => { if (!(UI.t - (r.occT || 0) < s + r.occN * .004)){ r.occT = UI.t; return true; } return false; }, moved = r.occK !== ok_ + '|' + (ang * 500 | 0), shd = r.light.castShadow; r.occK = ok_ + '|' + (ang * 500 | 0);
        // ombre réelle (surfaces et fumée) pour les projecteurs qui en portent une : la carte n'est recalculée que si l'appareil bouge, et de temps en temps pour suivre le décor
        if (shd){ if (moved || !r.light.shadow.map || due(.13)) r.light.shadow.needsUpdate = true; r.occD = null; if (r.occI != null) occFree(r); } else { if (moved || due(.33)){ const h = hitAlong(_v, _d, L0); r.occD = h ? h.distance : null; } if (dim > .002 && (moved || !r.occOK || UI.t - (r.occT2 || 0) > .5 + r.occN * .01 || UI.t < (r.occT2 || 0))) OCCQ.push([!r.occOK ? -2 : moved ? -1 : r.occT2, r, _v.clone(), _d.clone(), ang, L0]); }
        const own = !UI.noOcc && !shd && r.occOK && r.occI != null; r.light.decay = 2 + ((r.fxI != null ? (r.fxI + 1) * 100 : 0) + (own ? r.occI + 1 : 0)) * 1e-5;
        { const u = r.bm.uniforms, mp = shd && r.light.shadow.map; u.shOn.value = mp || own ? 1 : 0; if (mp){ u.shMap.value = mp.texture; u.shMat.value.copy(r.light.shadow.matrix); u.shR.value.set(0, 0, 1, 1); } else if (own){ u.shMap.value = OCCA.texture; u.shMat.value.copy(r.occM); u.shR.value.copy(r.occR); } }
        const cut = !shd && r.occD != null && r.occD < L0 - .05, L = cut && !own ? r.occD + .03 : L0, R = Math.tan(ang) * L; r.bm.uniforms.fade.value = cut && !own ? 0 : 1; r.light.distance = cut && !own ? r.occD * 1.6 + .5 : 0;
        r.beam.position.copy(_v); r.beam.quaternion.setFromUnitVectors(DOWN, _d); r.beam.scale.set(R, L, R);
        r.bm.uniforms.amount.value = dim * S.haze * BEAMK * clamp(Math.sqrt((ty.lumens || 8000) / 8000), .5, 2.3) * iris * iris * (prism ? (1 + PRISMOFF) * (1 + PRISMOFF) : 1); /* la fumée suppose le flux étalé sur toute la section du cône : l'iris (qui coupe du flux sans le concentrer) et le prisme (cône élargi) sont compensés pour que la densité reste juste */ r.bm.uniforms.scl.value.set(R, L); r.bm.uniforms.color.value.copy(_c);
        r.lensMat.color.copy(_c).multiplyScalar(dim * 6);
        // halo de lentille : d'autant plus fort que le projecteur regarde la caméra
        { const cam = A.camera, dist = _fl.copy(cam.position).sub(_v).length(), f = cam.isPerspectiveCamera ? Math.max(0, _fl.normalize().dot(_d)) : 0, k = dim * (.12 + .88 * Math.pow(f, 5)); r.flare.visible = k > .03 && A.quality !== 'basse';
          if (r.flare.visible){ const sz = (.35 + 1.9 * k) * Math.min(3.2, .3 + dist * .085) * (ty.kind === 'blinder' ? 1.5 : 1); r.flare.position.copy(_v).addScaledVector(_d, .06); r.flare.scale.set(sz * 1.5, sz, 1); r.flare.material.color.copy(_c).multiplyScalar(Math.min(1.3, k * 1.25)); } }
      } else { r.lensMat.color.set('#000'); r.flare.visible = false; }
    } else if (ty.cat === 'vid'){
      const on = live && o.on !== false && nvp < 3; if (live && o.on !== false) nvp++;
      const md = MEDIA.get(o.id);
      if (r.dirty || (on && (o.content === 'video' || o.content === 'cam' || o.content === 'ecran' || o.content === 'ndi') && md?.el && !md.el.paused)){
        dirOf(o.pan, o.tilt, _d); r.head.getWorldPosition(_v); r.head.lookAt(_v2.copy(_v).add(_d));
        if (r.dirty){
          const G = r.geom = vpGeom(o, ty, r), hd = G.op.T;
          r.light.position.copy(G.src).addScaledVector(G.d, .3); r.light.target.position.copy(G.src).addScaledVector(G.d, 10); r.light.target.updateMatrixWorld();
          r.light.angle = Math.atan(hd); const sr = (1 / G.th) * (ty.res[1] / ty.res[0] / G.th);
          r.light.intensity = dispI(ty.lumens / sr) * 1.6 * (o.bright ?? 1);
          // gabarit de projection
          const cn = G.cn;
          const p = r.frust.geometry.attributes.position; let q = 0; const put = (a, b) => { p.setXYZ(q++, a.x, a.y, a.z); p.setXYZ(q++, b.x, b.y, b.z); };
          for (let i = 0; i < 4; i++){ put(G.src, cn[i]); put(cn[i], cn[(i + 1) % 4]); } p.needsUpdate = true;
        }
        drawContent(r); r.dirty = false;
      }
      r.light.visible = on; r.light.castShadow = on; r.light.map = on ? r.tex : null;
      r.lensMat.color.set(on ? '#dfe8ff' : '#000'); r.frust.visible = UI.sel.includes(o.id) || (UI.cov && o.on !== false);
    } else if (ty.cat === 'son'){
      if (r.dirty){
        dirOf(o.pan, o.tilt, _d); r.root.updateMatrixWorld(); r.head.getWorldPosition(_v); r.head.lookAt(_v2.copy(_v).add(_d));
        const p = r.cov.geometry.attributes.position, L = 12, hd = Math.min(170, ty.hd) * D2R / 2, vd = Math.min(170, ty.vd) * D2R / 2;
        const rt = new THREE.Vector3().crossVectors(_d, UP); if (rt.lengthSq() < 1e-6) rt.set(1, 0, 0); rt.normalize(); const up = new THREE.Vector3().crossVectors(rt, _d);
        const cn = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => _v.clone().addScaledVector(_d, L).addScaledVector(rt, a * Math.tan(hd) * L).addScaledVector(up, b * Math.tan(vd) * L));
        let q = 0; const put = (a, b) => { p.setXYZ(q++, a.x, a.y, a.z); p.setXYZ(q++, b.x, b.y, b.z); };
        for (let i = 0; i < 4; i++){ put(_v, cn[i]); put(cn[i], cn[(i + 1) % 4]); } p.needsUpdate = true; r.dirty = false;
      }
      r.cov.visible = ty.kind !== 'sub' && (UI.cov || UI.sel.includes(o.id));
    } else if (r.dirty){ r.head.rotation.y = (o.yaw || 0) * D2R; r.dirty = false; }
    if (r.boxh.visible) r.boxh.update();
  }
  if (splTimer > 0 && (splTimer -= dt) <= 0){ splMap(); if (UI.tab === 'doc') syncDoc(); }
  if (gizmo.object) gizmo.camera = A.camera;
  drawLabels();
}

// ============================================================ sélection, pose, visée
let gizmo, gizmoHelper, gizmoR = null;
function select(ids, add){ if (ids && ids.length && window.PONTS && PONTS.sel) PONTS.select(null, true);
  if (ids.length) A.selectCurtain?.(-1);
  UI.sel = add ? [...new Set([...UI.sel, ...ids])] : ids;
  for (const [id, r] of RT) r.boxh.visible = UI.sel.includes(id);
  const p = byId(UI.sel[UI.sel.length - 1]);
  if (p && !p.locked && !p.hidden && A.mode !== 'walk'){ gizmo.attach(RT.get(p.id).root); setGizmoMode(); } else gizmo.detach();
  if (UI.sel.length && UI.tab !== 'prop' && UI.tab !== 'con' && UI.tab !== 'list') UI.tab = 'prop';
  render(); window.WS?.status(); if (window.PLAN) PLAN.P.dirty = true;
}
function setGizmoMode(){
  const p = byId(UI.sel[UI.sel.length - 1]); if (!p) return;
  const rot = UI.gizmo === 'rotate';                    // « tourner » : l'anneau seul ; sinon flèches de déplacement + anneau de rotation
  gizmo.setMode('translate'); gizmo.showX = gizmo.showY = gizmo.showZ = !rot; if (gizmoR) gizmoR.setSize(rot ? 1.25 : 1.0);
}
function pickObj(ev){
  const m = new THREE.Vector2((ev.clientX - VX()) / VW() * 2 - 1, -(ev.clientY / VH()) * 2 + 1); rc.setFromCamera(m, A.camera); rc.far = 500; rc.near = 0;
  const list = []; for (const r of RT.values()) if (!r.o.hidden && !layHid(r.o) && !r.o.locked && !(window.LAYERS && LAYERS.locked(r.o))) r.root.traverse(o => { if (o.isMesh) list.push(o); });
  const h = rc.intersectObjects(list, false).filter(x => !A.isClipped(x.point)); pickObj.d = h.length ? h[0].distance : Infinity; return h.length ? h[0].object.userData.oid : null;
}
function pickScene(ev, withObjs){
  const m = new THREE.Vector2((ev.clientX - VX()) / VW() * 2 - 1, -(ev.clientY / VH()) * 2 + 1); rc.setFromCamera(m, A.camera); rc.far = 500; rc.near = 0;
  const list = A.pickMeshes.filter(o => o.visible); if (withObjs) for (const r of RT.values()) if (r.t.cat === 'str') r.head.traverse(o => { if (o.isMesh) list.push(o); });
  return rc.intersectObjects(list, false).find(x => !A.isClipped(x.point)) || null;
}
function nextNum(cat){ const pre = { lum: 0, vid: 500, son: 600, str: 900 }[cat]; let n = pre + 1; const used = new Set(S.objs.map(o => o.n)); while (used.has(n)) n++; return n; }
function defaults(t){
  const o = { id: uid(), type: t.id, name: t.name, pos: [0, 0, 0], hang: null };
  if (t.cat === 'lum') Object.assign(o, { pan: 180, tilt: 30, dim: .8, color: t.color === 'gel' ? '#ffd9a0' : t.color === 'white' ? '#fff0d8' : '#ffffff', zoom: t.zoom[0] + (t.zoom[1] - t.zoom[0]) * .4, fx: 'fixe', speed: .5, fx2: 'fixe', speed2: .5, fx3: 'fixe', speed3: .5, amp: 1, mode: 0, uni: 1, addr: 0, grp: '' });
  if (t.cat === 'vid') Object.assign(o, { pan: 180, tilt: 85, on: true, content: 'mire', throw: Math.round((vpThrow({}, t)[0] + vpThrow({}, t)[1]) / 2 * 100) / 100, bright: 1, ...(t.lenses ? { lens: vpLens({}, t).id } : {}) });
  if (t.cat === 'son') Object.assign(o, { pan: 0, tilt: t.kind === 'wedge' ? 125 : 88, on: true, gain: 0 });
  if (t.cat === 'str'){ o.yaw = 0; if (t.size) o.size = [...t.size]; if (t.len) o.len = t.len; }
  return o;
}
function place(typeId, hit, quiet, init){
  const t = [...S.lib, ...LIB].find(x => x.id === typeId); if (!t) return;
  { const L = libV(); if (L.rec[0] !== typeId){ L.rec = [typeId, ...L.rec.filter(x => x !== typeId)].slice(0, 16); libVSave(); } }          /* « Utilisés récemment » de la bibliothèque */
  if (!quiet) pushUndo(0, 'Poser ' + t.name);
  const o = Object.assign(defaults(t), init || {}), gid = hit.object.userData.gid, n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : UP;
  o.n = nextNum(t.cat);
  if (gid === 'ponts' && window.PONTS && PONTS.hangAt(o, hit.object.userData.sid, hit.point.x, hit.point.z)){}
  else if (gid === 'perches'){ o.hang = 'perche'; o.pos = [hit.point.x, 6.0 - .03, A.PERCHES[hit.object.userData.pi].z]; }
  else if (gid === 'gril' || gid === 'charpente' || n.y < -.5){ o.hang = 'fixe'; o.pos = [hit.point.x, gid === 'gril' ? 6.68 : hit.point.y, hit.point.z]; }
  else o.pos = [hit.point.x, hit.point.y + (n.y > .5 ? 0 : 0), hit.point.z];
  o.pos = o.pos.map(v => Math.round(v * 100) / 100);
  if (t.cat === 'lum'){ o.addr = freeAddr(o.uni, t.modes[0][1]); if (!o.hang) o.tilt = 120; if (o.pos[2] > 0 && t.cat === 'lum') o.pan = 180; else o.pan = 0; if (o.hang && o.pos[2] > 0){ o.pan = 180; o.tilt = 45; } }
  if (t.cat === 'vid' && !o.hang) o.tilt = 90;
  if (t.cat === 'str' && t.kind === 'truss'){ o.hang = o.hang || null; }
  if (t.zoff && !o.hang){ o.pos[1] = Math.round((o.pos[1] + t.zoff) * 100) / 100; o.hang = 'fixe'; }
  S.objs.push(o); build(o);
  if ((t.cat === 'lum' || t.cat === 'vid') && !A.live) setLive(true);
  if (quiet) return o;
  touch(); select([o.id]); return o;
}
// ---------------------------------------------------------------- pose en série : n objets au même écartement le long d'une ligne
// a, b : [x, z]. n objets de a à b compris ; ou, si pas > 0, un objet tous les « pas » mètres en partant de a.
function seriePts(a, b, n = UI.serie, pas = UI.serieStep){
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (pas > 0){ n = Math.min(60, Math.floor(L / pas + 1e-6) + 1); const ux = L ? (b[0] - a[0]) / L : 0, uz = L ? (b[1] - a[1]) / L : 0; return Array.from({ length: n }, (_, i) => [a[0] + ux * pas * i, a[1] + uz * pas * i]); }
  n = Math.max(1, Math.min(60, Math.round(n))); if (n === 1 || L < 1e-6) return [[a[0], a[1]]];
  return Array.from({ length: n }, (_, i) => [a[0] + (b[0] - a[0]) * i / (n - 1), a[1] + (b[1] - a[1]) * i / (n - 1)]);
}
// ---------------------------------------------------------------- aimant : un appareil qu'on amène sur une perche ou un pont s'y accroche (comme dans ScenoFactory)
// R : rayon de l'aimant en mètres. use3d : la hauteur compte aussi (flèches de la vue 3D) ; sinon seul le plan compte (glisser dans le plan technique).
const magnetOk = o => { const t = typeOf(o); return t.cat === 'lum' || t.cat === 'vid' || (t.cat === 'son' && t.kind !== 'sub' && t.kind !== 'wedge'); };
const realY = o => o.pos[1] + (o.hang === 'perche' ? A.percheDeltaAt(o.pos[2]) : 0);
function supportNear(x, y, z, R, use3d){ let best = null, bd = R;
  const pn = window.PONTS && PONTS.nearest ? PONTS.nearest(x, y, z, R, use3d) : null; if (pn){ best = pn; bd = pn.d; }
  A.PERCHES.forEach((P, i) => { if (P.off) return; const hl = A.percheLen(i) / 2, cx = A.percheX(i), px = Math.max(cx - hl, Math.min(cx + hl, x)), dp = Math.hypot(x - px, z - P.z), d = use3d ? Math.hypot(dp, y - (P.y - .03)) : dp; if (d < bd){ bd = d; best = { t: 'perche', pi: i, x: px, z: P.z, d }; } });
  return best; }
// list : [[objet, état d'origine { hang, sid, pi, y }]]. Hors de portée de tout support, l'objet retrouve son état d'origine s'il n'était pas suspendu ; s'il l'était, il devient une accroche fixe à sa hauteur.
function magnet(list, R, off, use3d){ let n = 0; for (const [o, og] of list){ if (!magnetOk(o) || o.locked) continue; const was = o.hang + '|' + (o.sid || '') + '|' + (o.pi ?? '');
    const b = off ? null : supportNear(o.pos[0], realY(o), o.pos[2], R, use3d);
    if (b && b.t === 'pont'){ o.hang = 'pont'; o.sid = b.sid; delete o.pi; o.pos = [b.x, b.y, b.z].map(v => Math.round(v * 1000) / 1000); }
    else if (b){ o.hang = 'perche'; o.pi = b.pi; delete o.sid; o.pos = [Math.round(b.x * 1000) / 1000, 6.0 - .03, b.z]; }
    else if (o.hang === 'pont' || o.hang === 'perche'){ const hung0 = og && (og.hang === 'pont' || og.hang === 'perche'); if (og && !hung0){ o.hang = og.hang || null; o.pos[1] = og.y; } else { o.pos[1] = Math.round(realY(o) * 1000) / 1000; o.hang = 'fixe'; } delete o.sid; delete o.pi; }
    if (was !== o.hang + '|' + (o.sid || '') + '|' + (o.pi ?? '')){ n++; const r = RT.get(o.id); if (r) r.dirty = true; } } return n; }
const magState = o => ({ hang: o.hang, sid: o.sid, pi: o.pi, y: o.pos[1] });
function magSay(list){ const ch = list.filter(([o, og]) => og && (og.hang !== o.hang || og.sid !== o.sid || og.pi !== o.pi)); if (!ch.length) return; const o = ch[0][0], where = o.hang === 'pont' ? 'accroché à ' + (window.PONTS ? PONTS.nameOf(o.sid) : 'un pont') : o.hang === 'perche' ? 'accroché à la perche ' + ((o.pi ?? 0) + 1) : o.hang === 'fixe' ? 'décroché (accroche fixe, hauteur gardée)' : 'posé au sol';
  toast(ch.length > 1 ? `${ch.length} appareils : ${where}.` : `${o.name} : ${where}.`); }
// la perche la plus proche d'un point du plan, si le point tombe dessus (à tol mètres près)
function percheNear(x, z, tol = .35){ let best = -1, bd = tol; A.PERCHES.forEach((P, i) => { if (P.off) return; const d = Math.abs(P.z - z), hl = A.percheLen(i) / 2, cx = A.percheX(i); if (d < bd && x > cx - hl - tol && x < cx + hl + tol){ bd = d; best = i; } }); return best; }
// où l'objet se pose quand on vise un point du plan : sous la perche pi, sinon sur le sol, le plateau ou un gradin
function hitAt(x, z, pi = -1){
  if (pi >= 0) return { point: new THREE.Vector3(x, 0, A.PERCHES[pi].z), object: { userData: { gid: 'perches', pi } }, face: null };
  { const pn = window.PONTS?.near(x, z); if (pn) return { point: new THREE.Vector3(pn.x, pn.y, pn.z), object: { userData: { gid: 'ponts', sid: pn.id } }, face: null }; }
  rc.set(_v.set(x, 60, z), DOWN); rc.far = 200; rc.near = 0; let h = null;
  for (const q of rc.intersectObjects(A.pickMeshes.filter(o => o.visible && !['perches', 'gril', 'charpente'].includes(o.userData.gid)), false)){ if (q.point.y > 3 || !q.face || q.face.normal.clone().transformDirection(q.object.matrixWorld).y < .5) continue; if (!h || q.point.y > h.point.y) h = q; }
  return h || { point: new THREE.Vector3(x, 0, z), object: { userData: {} }, face: null };
}
// ---------------------------------------------------------------- praticables en bloc : un rectangle rempli de modules
const blkType = id => { const t = id && [...S.lib, ...LIB].find(x => x.id === id); return t && t.kind === 'riser' && !t.shape && t.size && t.size[0] >= 1 ? t : null; };
const blkMod = t => UI.blkRot ? [t.size[1], t.size[0]] : [t.size[0], t.size[1]];
// aimant : le coin de départ se colle au bord d'un praticable voisin
function blkSnap(p){ const q = [Math.round(p[0] * 20) / 20, Math.round(p[1] * 20) / 20]; let bx = .25, bz = .25;
  for (const o of S.objs){ const t = typeOf(o); if (t.kind !== 'riser' || !o.size) continue; const r = Math.abs(((o.yaw || 0) % 180 + 180) % 180 - 90) < 1, w = (r ? o.size[1] : o.size[0]) / 2, d = (r ? o.size[0] : o.size[1]) / 2;
    for (const e of [o.pos[0] - w, o.pos[0] + w]) if (Math.abs(e - p[0]) < bx){ bx = Math.abs(e - p[0]); q[0] = e; } for (const e of [o.pos[2] - d, o.pos[2] + d]) if (Math.abs(e - p[1]) < bz){ bz = Math.abs(e - p[1]); q[1] = e; } }
  return q; }
// les modules qui remplissent le rectangle tracé de a vers b (au moins un), ou un bloc colonnes × rangées centré sur a si b est absent
function blkCells(t, a, b){ const [mw, md] = blkMod(t); let nx, nz, sx = 1, sz = 1;
  if (b){ nx = Math.max(1, Math.min(40, Math.round(Math.abs(b[0] - a[0]) / mw))); nz = Math.max(1, Math.min(40, Math.round(Math.abs(b[1] - a[1]) / md))); sx = b[0] < a[0] ? -1 : 1; sz = b[1] < a[1] ? -1 : 1; }
  else { nx = Math.max(1, Math.min(40, Math.round(UI.blkCols))); nz = Math.max(1, Math.min(40, Math.round(UI.blkRows))); a = blkSnap([a[0] - nx * mw / 2, a[1] - nz * md / 2]); }
  const pts = []; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) pts.push([a[0] + sx * (i + .5) * mw, a[1] + sz * (j + .5) * md]);
  return { pts, nx, nz, w: nx * mw, d: nz * md, mw, md, x0: Math.min(a[0], a[0] + sx * nx * mw), z0: Math.min(a[1], a[1] + sz * nz * md) }; }
function placeBlock(typeId, cells, base){
  const t = blkType(typeId); if (!t || !cells.pts.length) return [];
  pushUndo(0, `Poser ${cells.pts.length} × ${t.name}`); const used = new Set(S.objs.map(o => o.grp)); let k = 1; while (used.has('Scène ' + k)) k++;
  const h = Math.max(.2, Math.min(1.6, +UI.blkH || t.size[2])), out = []; base = base || hitAt(cells.pts[0][0], cells.pts[0][1]);
  for (const [x, z] of cells.pts){ const o = place(typeId, { point: new THREE.Vector3(x, base.point.y, z), object: { userData: {} }, face: null }, true, { size: [t.size[0], t.size[1], h], yaw: UI.blkRot ? 90 : 0, grp: 'Scène ' + k }); if (o) out.push(o); }
  touch(); select(out.map(o => o.id)); toast(`${out.length} praticable${out.length > 1 ? 's' : ''} : ${fmt(cells.w, 1)} × ${fmt(cells.d, 1)} m à ${Math.round(h * 100)} cm (groupe « Scène ${k} »).`); return out;
}
// ---------------------------------------------------------------- habiller une scène : jupe, garde-corps, escalier sur le pourtour d'un groupe de praticables
// rend les tronçons de bord extérieur : { side: 'avant' | 'arriere' | 'jardin' | 'cour', f (coordonnée fixe), a, b, h, y }
function stageEdges(mods){ const U = .5, M2 = new Map(), r2 = v => Math.round(v * 100) / 100;
  for (const o of mods){ const rot = Math.abs(((o.yaw || 0) % 180 + 180) % 180 - 90) < 1, w = rot ? o.size[1] : o.size[0], d = rot ? o.size[0] : o.size[1], x0 = r2(o.pos[0] - w / 2), x1 = r2(o.pos[0] + w / 2), z0 = r2(o.pos[2] - d / 2), z1 = r2(o.pos[2] + d / 2), h = o.size[2], y = o.pos[1];
    const add = (ori, f, a, b, side) => { for (let u = a; u < b - 1e-6; u = r2(u + U)){ const k = ori + '|' + f + '|' + u, e = M2.get(k); if (e) e.n++; else M2.set(k, { n: 1, ori, f, u, side, h, y }); } };
    add('h', z0, x0, x1, 'arriere'); add('h', z1, x0, x1, 'avant'); add('v', x0, z0, z1, 'jardin'); add('v', x1, z0, z1, 'cour'); }
  const es = [...M2.values()].filter(e => e.n === 1).sort((p, q) => p.side.localeCompare(q.side) || p.f - q.f || p.u - q.u), runs = [];
  for (const e of es){ const l = runs[runs.length - 1]; if (l && l.side === e.side && l.f === e.f && Math.abs(l.b - e.u) < 1e-6 && l.h === e.h && l.y === e.y) l.b = r2(e.u + U); else runs.push({ side: e.side, f: e.f, a: e.u, b: r2(e.u + U), h: e.h, y: e.y }); }
  return runs; }
// opt : { jupe: [côtés], rail: [côtés], stair: côté ou '' , keep: garder l'habillage existant }
function dressStage(grp, opt){
  const mods = S.objs.filter(o => { const t = typeOf(o); return t.kind === 'riser' && !t.shape && o.size && (grp ? o.grp === grp : true) && !o.dress; }); if (!mods.length){ toast('Sélectionne d\'abord un praticable de la scène à habiller.', true); return []; }
  pushUndo(0, 'Habiller la scène'); if (!opt.keep){ const old = S.objs.filter(o => o.dress && o.grp === (grp || mods[0].grp)); for (const o of old){ unbuild(o.id); } S.objs = S.objs.filter(o => !old.includes(o)); }
  const runs = stageEdges(mods), g = grp || mods[0].grp || '', out = [], at = (x, y, z) => ({ point: new THREE.Vector3(x, y, z), object: { userData: {} }, face: null }), N = { avant: [0, 1], arriere: [0, -1], jardin: [-1, 0], cour: [1, 0] };
  const put = (id, x, y, z, init) => { const o = place(id, at(x, y, z), true, { grp: g, dress: 1, ...init }); if (o){ o.pos = [x, y, z].map(v => Math.round(v * 1000) / 1000); const r = RT.get(o.id); if (r) r.dirty = true; out.push(o); } return o; };
  const P = (r, u, off) => { const n = N[r.side]; return r.side === 'avant' || r.side === 'arriere' ? [u + n[0] * off, r.f + n[1] * off] : [r.f + n[0] * off, u + n[1] * off]; }, yawE = r => ({ avant: 0, arriere: 180, cour: 90, jardin: -90 })[r.side];
  let hole = null;          // l'ouverture laissée dans le garde-corps devant l'escalier
  if (opt.stair){ const c = runs.filter(r => r.side === opt.stair).sort((p, q) => (q.b - q.a) - (p.b - p.a))[0]; if (c){ const w = Math.min(1, c.b - c.a), m = Math.round((c.a + c.b) / 2 * 2) / 2, [x, z] = P(c, m, 0), n = N[c.side]; put('escalier', x, c.y, z, { size: [w, 1, c.h], yaw: Math.round(Math.atan2(n[0], n[1]) * R2D) }); hole = { r: c, a: m - w / 2, b: m + w / 2 }; } }
  for (const r of runs){
    if (opt.jupe?.includes(r.side)){ const [x, z] = P(r, (r.a + r.b) / 2, .02); put('jupe', x, r.y, z, { size: [r.b - r.a, r.h - .01], yaw: yawE(r) }); }
    if (opt.rail?.includes(r.side)){ const segs = hole && hole.r === r ? [[r.a, hole.a], [hole.b, r.b]] : [[r.a, r.b]]; for (const [a, b] of segs){ let u = a; while (b - u > .49){ const L = Math.min(2, Math.round((b - u) * 2) / 2), [x, z] = P(r, u + L / 2, -.04); put('garde-corps', x, r.y + r.h, z, { len: L, yaw: yawE(r) }); u += L; } } } }
  touch(); select([...mods, ...out].map(o => o.id)); const nb = id => out.filter(o => o.type === id).length;
  toast(`Scène habillée : ${nb('jupe')} jupe(s), ${nb('garde-corps')} garde-corps, ${nb('escalier')} escalier.`); return out;
}
const SIDES = [['avant', 'Avant (public)'], ['jardin', 'Jardin'], ['cour', 'Cour'], ['arriere', 'Arrière']];
const dressForm = (j, r, st) => `<label>Jupe de scène</label><span>${SIDES.map(([k, l]) => `<label style="display:inline-flex;gap:4px;margin-right:10px"><input type="checkbox" data-dj="${k}" ${j.includes(k) ? 'checked' : ''}>${l}</label>`).join('')}</span><label>Garde-corps</label><span>${SIDES.map(([k, l]) => `<label style="display:inline-flex;gap:4px;margin-right:10px"><input type="checkbox" data-dr="${k}" ${r.includes(k) ? 'checked' : ''}>${l}</label>`).join('')}</span><label>Escalier</label><select id="dsSt"><option value="">Aucun</option>${SIDES.map(([k, l]) => `<option value="${k}" ${st === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const dressRead = () => ({ jupe: [...document.querySelectorAll('#modal [data-dj]:checked')].map(e => e.dataset.dj), rail: [...document.querySelectorAll('#modal [data-dr]:checked')].map(e => e.dataset.dr), stair: $('#dsSt')?.value || '' });
const blkTip = c => `${c.nx} × ${c.nz} modules · ${fmt(c.w, 1)} × ${fmt(c.d, 1)} m · ${c.pts.length} praticable${c.pts.length > 1 ? 's' : ''}`;
function placeSeries(typeId, pts, pi = -1, base = null){
  const t = [...S.lib, ...LIB].find(x => x.id === typeId); if (!t || !pts.length) return [];
  pushUndo(0, pts.length > 1 ? `Poser ${pts.length} × ${t.name}` : 'Poser ' + t.name); const out = [];
  for (const [x, z] of pts){ const h = base ? { point: new THREE.Vector3(x, base.point.y, z), object: base.object, face: base.face } : hitAt(x, z, pi); const o = place(typeId, h, true); if (o) out.push(o); }
  snapPerches(); touch(); select(out.map(o => o.id)); if (pts.length > 1) toast(`${out.length} × ${t.name} posés${pts.length > 1 ? ', écart ' + fmt(Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), 2) + ' m' : ''}.`); return out;
}
function aimAt(P){
  pushUndo();
  for (const o of selObjs()){ const r = RT.get(o.id); if (o.pan === undefined) continue;
    r.root.updateMatrixWorld(true); r.head.getWorldPosition(_v); _d.copy(P).sub(_v).normalize();
    o.tilt = Math.round(Math.acos(clamp(-_d.y, -1, 1)) * R2D * 10) / 10; o.pan = Math.round(Math.atan2(_d.x, _d.z) * R2D * 10) / 10; r.dirty = true; }
  touch(); refreshProps();
}
function bindCanvas(){
  const cv = A.canvas; let down = null, ser = null;
  // ---- pose en série dans la vue 3D : presser, tirer, relâcher
  const serG = new THREE.Group(), serM = new THREE.MeshBasicMaterial({ color: 0xffd24a, depthTest: false, transparent: true, opacity: .95 }), serGeo = new THREE.SphereGeometry(.09, 12, 8); serG.renderOrder = 999; A.scene.add(serG);
  const tip = document.createElement('div'); tip.id = 'serieTip'; tip.style.cssText = 'position:fixed;z-index:60;pointer-events:none;display:none;background:#1d2027;color:#ffd24a;border:1px solid #ffd24a;border-radius:7px;padding:4px 8px;font:600 12px system-ui,sans-serif;white-space:nowrap'; document.body.appendChild(tip);
  const serOn = () => UI.placing && (UI.serie > 1 || UI.serieStep > 0 || blkType(UI.placing));
  const blkL = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([0, 1, 2, 3].map(() => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0xffd24a, depthTest: false })); blkL.renderOrder = 999; blkL.visible = false; blkL.frustumCulled = false; A.scene.add(blkL);
  const serLine = () => { let a = [ser.h.point.x, ser.h.point.z], b = [ser.end.x, ser.end.z]; if (UI.serieSym){ a = [-b[0], b[1]]; } return [a, b]; };
  const serDraw = e => { if (ser.blk){ const c = blkCells(ser.blk, ser.a, [ser.end.x, ser.end.z]), y = ser.h.point.y + UI.blkH;
      while (serG.children.length < c.pts.length) serG.add(new THREE.Mesh(serGeo, serM)); serG.children.forEach((m, i) => { m.visible = i < c.pts.length; if (m.visible) m.position.set(c.pts[i][0], y, c.pts[i][1]); }); serG.visible = true;
      const pa = blkL.geometry.attributes.position; [[c.x0, c.z0], [c.x0 + c.w, c.z0], [c.x0 + c.w, c.z0 + c.d], [c.x0, c.z0 + c.d]].forEach((p, i) => pa.setXYZ(i, p[0], y, p[1])); pa.needsUpdate = true; blkL.visible = true;
      tip.textContent = blkTip(c); tip.style.display = 'block'; tip.style.left = e.clientX + 16 + 'px'; tip.style.top = e.clientY + 16 + 'px'; return; }
    const [a, b] = serLine(), pts = seriePts(a, b), y = ser.pi >= 0 ? A.PERCHES[ser.pi].y - .12 : ser.h.point.y + .1;
    while (serG.children.length < pts.length) serG.add(new THREE.Mesh(serGeo, serM)); serG.children.forEach((m, i) => { m.visible = i < pts.length; if (m.visible) m.position.set(pts[i][0], y, pts[i][1]); }); serG.visible = true;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); tip.textContent = `${pts.length} × · ${pts.length > 1 ? 'écart ' + fmt(Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), 2) + ' m · ' : ''}ligne ${fmt(L, 2)} m${UI.serieStep > 0 ? '' : ' · molette : quantité'}`; tip.style.display = 'block'; tip.style.left = e.clientX + 16 + 'px'; tip.style.top = e.clientY + 16 + 'px'; };
  const serEnd = () => { serG.visible = false; blkL.visible = false; tip.style.display = 'none'; if (ser){ A.orbit.enabled = ser.o; A.orthoCtl.enabled = ser.oc; } ser = null; };
  cv.addEventListener('pointerdown', e => { if (e.button !== 0 || !serOn() || A.mode === 'walk' || A.measuring) return; const h = pickScene(e, false); if (!h) return;
    const gid = h.object.userData.gid, blk = blkType(UI.placing); let pi = gid === 'perches' ? h.object.userData.pi : -1; if (blk){ if (pi >= 0 || gid === 'gril' || gid === 'charpente') return; } if (pi >= 0) h.point.z = A.PERCHES[pi].z;
    ser = { h, pi, blk, a: blk ? blkSnap([h.point.x, h.point.z]) : null, x: e.clientX, y: e.clientY, end: h.point.clone(), moved: false, o: A.orbit.enabled, oc: A.orthoCtl.enabled }; A.orbit.enabled = A.orthoCtl.enabled = false; }, true);
  addEventListener('pointermove', e => { if (!ser) return; if (Math.hypot(e.clientX - ser.x, e.clientY - ser.y) > 4) ser.moved = true; if (!ser.moved) return;
    rc.setFromCamera(new THREE.Vector2((e.clientX - VX()) / VW() * 2 - 1, -(e.clientY / VH()) * 2 + 1), A.camera); const O = rc.ray.origin, D = rc.ray.direction;
    if (ser.pi >= 0){ const P = A.PERCHES[ser.pi], hl = A.percheLen(ser.pi) / 2, cx = A.percheX(ser.pi), w = _v.set(O.x, O.y - P.y, O.z - P.z), b = D.x, den = 1 - b * b;          // point de la perche le plus proche du rayon
      const x = den < 1e-6 ? ser.end.x : (w.x - b * D.dot(w)) / den; ser.end.set(Math.max(cx - hl, Math.min(cx + hl, x)), ser.h.point.y, P.z); }
    else if (Math.abs(D.y) > 1e-4){ const k = (ser.h.point.y - O.y) / D.y; if (k > 0) ser.end.set(O.x + D.x * k, ser.h.point.y, O.z + D.z * k); }
    serDraw(e); });
  addEventListener('wheel', e => { if (!ser || !ser.moved || UI.serieStep > 0 || ser.blk) return; e.preventDefault(); e.stopPropagation(); UI.serie = Math.max(2, Math.min(60, UI.serie + (e.deltaY < 0 ? 1 : -1))); serDraw(e); const f = document.querySelector('[data-ser="serie"]'); if (f) f.value = UI.serie; }, { capture: true, passive: false });
  addEventListener('pointerup', e => { if (!ser) return; const s = ser, mv = s.moved;
    if (s.blk){ placeBlock(UI.placing, mv ? blkCells(s.blk, s.a, [s.end.x, s.end.z]) : blkCells(s.blk, [s.h.point.x, s.h.point.z]), s.h); down = null; if (!e.shiftKey) UI.placing = null; render(); serEnd(); return; }
    if (mv){ const [a, b] = serLine(); placeSeries(UI.placing, seriePts(a, b), s.pi, s.pi >= 0 ? null : s.h); if (!e.shiftKey){ UI.placing = null; } render(); } serEnd(); }, true);
  addEventListener('keydown', e => { if (ser && e.code === 'Escape') serEnd(); }, true);
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, b: e.button }; });
  // double-clic sur un objet : l'Atelier s'ouvre sur tous ses réglages
  cv.addEventListener('dblclick', e => { if (A.mode === 'walk' || A.measuring || UI.placing || UI.aiming) return; const id = pickObj(e), cu = A.pickCurtain ? A.pickCurtain(e) : null; if (cu && cu.d < pickObj.d) return void A.selectCurtain(cu.slot); if (!id) return; UI.tab = 'prop'; select([id]); A.toggleConsole(true); const pn = document.querySelector('#console .body, #console'); if (pn) pn.scrollTop = 0; });
  cv.addEventListener('pointerup', e => {
    if (!down || down.b !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4 || A.mode === 'walk' || A.measuring || gizmo.dragging || gizmoR.dragging || window.PONTS?.tl) return;
    if (UI.placing){ const h = pickScene(e, false); if (h){ place(UI.placing, h); if (!e.shiftKey){ UI.placing = null; render(); } } return; }
    if (UI.aiming){ const h = pickScene(e, true); if (h) aimAt(h.point); UI.aiming = false; render(); return; }
    let id = pickObj(e); const cu = A.pickCurtain ? A.pickCurtain(e) : null;          // un rideau devant l'objet visé se sélectionne à sa place
    if (cu && cu.d < pickObj.d){ if (UI.sel.length) select([]); A.selectCurtain(cu.slot); return; } A.selectCurtain?.(-1);
    if (id) select(e.shiftKey || e.ctrlKey || e.metaKey ? (UI.sel.includes(id) ? UI.sel.filter(x => x !== id) : [...UI.sel, id]) : [id]);
    else if (UI.sel.length && !e.shiftKey) select([]);
    if (!id && window.DRAW && DRAW.pick3D(e)){ window.PONTS?.select(null); return; } if (id) window.DRAW?.select(null);
    if (!id && window.PONTS) PONTS.pick3D(e); else if (id && window.PONTS) PONTS.select(null);
  });
  for (const el of [A.canvas, document.querySelector('#plan2d')]) el?.addEventListener('pointerdown', () => { const f = document.activeElement; if (f && f !== document.body && f.blur) f.blur(); }, true);
  A.busy = () => !!(UI.placing || UI.aiming || gizmo.dragging || gizmo.axis || gizmoR.dragging || gizmoR.axis);
  addEventListener('keydown', e => {
    if ((e => { const t = e.target; return t.tagName === 'TEXTAREA' || t.isContentEditable || (t.tagName === 'INPUT' && !/^(range|checkbox|radio|button|color|file)$/.test(t.type)); })(e)) return;
    const ctrl = e.ctrlKey || e.metaKey; const code = /^[a-z]$/i.test(e.key) ? 'Key' + e.key.toUpperCase() : e.code;
    if (ctrl && code === 'KeyZ'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (ctrl && code === 'KeyY'){ e.preventDefault(); redo(); return; }
    if (A.mode === 'walk') return;
    if (code === 'Escape'){ if (UI.placing || UI.aiming){ UI.placing = null; UI.aiming = false; render(); } else select([]); }
    if ((code === 'Delete' || code === 'Backspace') && UI.sel.length){ e.preventDefault(); removeSel(); }
    if (ctrl && code === 'KeyD' && UI.sel.length){ e.preventDefault(); duplicate(1, [.5, 0, 0]); }
    if (ctrl && code === 'KeyA'){ e.preventDefault(); select(S.objs.filter(o => !o.hidden && !o.locked).map(o => o.id)); }
    if (!ctrl && code === 'KeyG'){ UI.gizmo = 'translate'; setGizmoMode(); }
    if (!ctrl && code === 'KeyR'){ UI.gizmo = 'rotate'; setGizmoMode(); }
    if (!ctrl && code === 'KeyV' && UI.sel.length){ UI.aiming = true; render(); }
  });
}
function removeSel(){ if (!UI.sel.length) return; pushUndo(0, 'Supprimer ' + UI.sel.length + ' objet(s)'); for (const id of UI.sel){ unbuild(id); MEDIA.delete(id); } S.objs = S.objs.filter(o => !UI.sel.includes(o.id)); for (const c of S.cues) for (const id of UI.sel) delete c.s[id]; touch(); select([]); }
function duplicate(count, step){
  pushUndo(0, 'Dupliquer'); const src = selObjs(), made = [];
  for (let k = 1; k <= count; k++) for (const o of src){ const c = JSON.parse(JSON.stringify(o)); c.id = uid(); c.pos = [o.pos[0] + step[0] * k, o.pos[1] + step[1] * k, o.pos[2] + step[2] * k]; c.n = nextNum(typeOf(o).cat);
    S.objs.push(c); if (typeOf(c).cat === 'lum') c.addr = freeAddr(c.uni, modeCh(c)); build(c); made.push(c.id); }
  touch(); select(made);
}

// ============================================================ patch DMX
const modeCh = o => { const t = typeOf(o); return (t.modes?.[o.mode || 0] || t.modes?.[0] || ['', 0])[1]; };
function freeAddr(uni, ch){
  if (!ch) return 0; const used = new Uint8Array(514);
  for (const o of S.objs) if (typeOf(o).cat === 'lum' && o.uni === uni && o.addr) for (let i = 0; i < modeCh(o); i++) used[o.addr + i] = 1;
  for (let a = 1; a + ch - 1 <= 512; a++){ let ok = true; for (let i = 0; i < ch; i++) if (used[a + i]){ ok = false; a += i; break; } if (ok) return a; }
  return 0;
}
function conflicts(){
  const bad = new Set(), map = {};
  for (const o of S.objs){ if (typeOf(o).cat !== 'lum' || !o.addr) continue; const ch = modeCh(o); if (o.addr + ch - 1 > 512) bad.add(o.id);
    for (let i = 0; i < ch; i++){ const k = o.uni + ':' + (o.addr + i); if (map[k] && map[k] !== o.id){ bad.add(o.id); bad.add(map[k]); } map[k] = o.id; } }
  return bad;
}
function autoPatch(){ pushUndo(0, 'Patch automatique'); const ls = S.objs.filter(o => typeOf(o).cat === 'lum').sort((a, b) => a.n - b.n); ls.forEach(o => o.addr = 0); let uni = 1; for (const o of ls){ const ch = modeCh(o); if (!ch) continue; let a = freeAddr(uni, ch); if (!a){ uni++; a = freeAddr(uni, ch); } o.uni = uni; o.addr = a; } touch(); render(); toast('Patch recalculé dans l\'ordre des numéros.'); }
const addrStr = o => o.addr ? `${o.uni}.${String(o.addr).padStart(3, '0')}` : '—';

// ============================================================ mémoires
const snap = o => Object.fromEntries(LKEYS.map(k => [k, o[k]]));
// Les mémoires passent par le moteur (prog.js). Depuis l'Atelier : « enregistrer l'état » prend tout l'état visible, et rappeler une mémoire vide d'abord le programmeur.
function recCue(i){ const E = window.ENG; if (!E) return toast('Moteur lumière en cours de chargement.', true); const r = E.store(0, i >= 0 ? i : undefined, { look: true, replace: i >= 0 }); if (r.err) return toast(r.err, true); E.dropProg();
  if (i >= 0) toast(`Mémoire « ${r.name} » mise à jour.`); render(); window.DESK?.sync(); }
function goCue(i, o = {}){ const E = window.ENG; if (!E || !S.cues[i]) return; if (!o.keepProg) E.clearProg(); E.go(0, i, o); syncConsole(); }

// ============================================================ annuler / rétablir / enregistrer
// light = true (pas d'annulation) : les modèles 3D importés, lourds, ne sont pas recopiés à chaque pas — seulement leur référence
const MODELS = new Map(), serialize = light => JSON.stringify({ v: 3, name: S.name, objs: S.objs, cues: S.cues, lib: [...S.lib, ...LIB.filter(t => t.userCat && !S.lib.some(x => x.id === t.id) && S.objs.some(o => o.type === t.id))].map(({ raw, ...t }) => light === true && t.model && t.model.groups ? (MODELS.set(t.id, t.model), { ...t, model: { ref: t.id } }) : t), master: S.master, haze: S.haze, room: A.roomState(), rig: S.rig, audio: S.audio, follow: S.follow, pal: S.pal, salle: A.venue, prog: S.prog, xseq: S.xseq, seqMaster: S.seqMaster, seqName: S.seqName, sups: S.sups || [], cornerKg: S.cornerKg || {}, safety: S.safety || null, dims: S.dims || [], shapes: S.shapes || [], layers: S.layers || {}, arrays: S.arrays || [] });
function pushUndo(key, label){ const now = performance.now(); if (key && pushUndo.k === key && now - pushUndo.t < 900){ pushUndo.t = now; return; } pushUndo.k = key; pushUndo.t = now; undoStack.push({ s: serialize(true), label: label || ULAB[key] || 'Modification', at: Date.now() }); if (undoStack.length > 100) undoStack.shift(); redoStack.length = 0; UI.dirty = true; histChanged(); }
const ULAB = { pcolor: 'Couleur', drag: 'Déplacement' };
function histChanged(){ const u = $('#undoBtn'), r = $('#redoBtn'); if (u){ u.disabled = !undoStack.length; u.title = undoStack.length ? 'Annuler : ' + undoStack[undoStack.length - 1].label + ' (Ctrl+Z)' : 'Rien à annuler'; r.disabled = !redoStack.length; r.title = redoStack.length ? 'Rétablir : ' + redoStack[redoStack.length - 1].label + ' (Ctrl+Y)' : 'Rien à rétablir'; } window.WS?.status(); }
function undo(){ if (!undoStack.length) return toast('Rien à annuler.'); const u = undoStack.pop(); redoStack.push({ s: serialize(true), label: u.label, at: u.at }); loadShow(JSON.parse(u.s), true); UI.dirty = true; histChanged(); toast('Annulé : ' + u.label); }
function undoTo(n){ let k = 0; while (undoStack.length > n && k++ < 200){ const u = undoStack.pop(); redoStack.push({ s: serialize(true), label: u.label, at: u.at }); loadShow(JSON.parse(u.s), true); } UI.dirty = true; histChanged(); }
function redo(){ if (!redoStack.length) return toast('Rien à rétablir.'); const u = redoStack.pop(); undoStack.push({ s: serialize(true), label: u.label, at: u.at }); loadShow(JSON.parse(u.s), true); UI.dirty = true; histChanged(); toast('Rétabli : ' + u.label); }
const blankShow = () => ({ name: 'Sans titre', objs: [], cues: [], follow: false, salle: { ...A.VOPEN } });
function loadShow(d, keepSel){
  gizmo?.detach(); for (const id of [...RT.keys()]) unbuild(id);
  const raws = new Map(S.lib.filter(t => t.raw).map(t => [t.id, t.raw]));
  S.name = d.name || 'Sans titre'; S.objs = d.objs || []; { const known = new Set([...LIB, ...(d.lib || [])].map(t => t.id)), n0 = S.objs.length; S.objs = S.objs.filter(o => o && known.has(o.type) && Array.isArray(o.pos)); if (S.objs.length < n0) setTimeout(() => toast(`${n0 - S.objs.length} objet(s) d'un type inconnu ont été ignorés à l'ouverture.`, true), 50); } S.cues = d.cues || []; S.prog = d.prog && typeof d.prog === 'object' ? d.prog : {}; S.xseq = Array.isArray(d.xseq) ? d.xseq : []; S.seqMaster = d.seqMaster ?? 1; S.seqName = d.seqName || ''; S.lib = (d.lib || []).map(t => ({ ...t, raw: raws.get(t.id), ...(t.model && t.model.ref ? { model: MODELS.get(t.model.ref) } : {}) })); setTimeout(rawRestore, 0); S.master = d.master ?? 1; S.haze = d.haze ?? .5; S.pal = d.pal && d.pal.color ? d.pal : null; S.follow = d.follow !== false; { const fc = document.querySelector('#followCfg'); if (fc) fc.checked = S.follow; }
  S.shapes = Array.isArray(d.shapes) ? d.shapes : []; S.sups = Array.isArray(d.sups) ? d.sups : []; S.safety = d.safety && typeof d.safety === 'object' ? d.safety : null; S.cornerKg = d.cornerKg && typeof d.cornerKg === 'object' ? d.cornerKg : {}; S.dims = Array.isArray(d.dims) ? d.dims : []; S.layers = d.layers && typeof d.layers === 'object' ? d.layers : {}; S.arrays = Array.isArray(d.arrays) ? d.arrays : [];
  S.rig = d.rig && d.rig.def ? d.rig : { def: {}, per: {} }; S.audio = d.audio && d.audio.groups ? d.audio : { groups: {}, sens: 1, bpm: 120 }; window.AUDIO?.render();
  { const pd = d.planData && d.salle && d.salle.plan && d.salle.plan.id; if (pd) A.setPlanData(d.salle.plan.id, d.planData); const cur = JSON.stringify(A.venue), nv = d.salle && d.salle.type === 'param' ? d.salle : { type: 'onex' }; if (pd || JSON.stringify(nv) !== cur) A.setVenue(nv, keepSel); }
  S.objs.forEach(build); UI.fade = null; if (d.room) A.setRoomState(d.room);
  if (!keepSel) UI.cue = -1; window.ENG?.reset(!keepSel);
  window.PONTS?.sync(keepSel); window.PUB?.sync(); window.DRAW?.sync(); if (A.live && !keepSel && noLight()) setTimeout(() => { if (A.live && noLight()) setLive(false); }, 0);
  const sel = keepSel ? UI.sel.filter(id => RT.has(id)) : []; touch(true); select(sel);
}
let saveT = 0, db = null, me = null, dl = null, cloudState = '';
// un objet « sur perche » est toujours rattaché à la perche la plus proche : il s'aimante sur son axe
function snapPerches(){ const Ps = A.PERCHES; for (const o of S.objs){ if (o.hang !== 'perche') continue; let b = 0; Ps.forEach((P, i) => { if (Math.abs(P.z - o.pos[2]) < Math.abs(Ps[b].z - o.pos[2])) b = i; }); o.pi = b; o.pos[2] = Ps[b].z; { const hl = A.percheLen(b) / 2, cx = A.percheX(b); o.pos[0] = Math.max(cx - hl, Math.min(cx + hl, o.pos[0])); } } }
function touch(noSave){
  snapPerches(); window.PONTS?.snap(); window.RIG?.changed(); window.PONTS?.changed();
  for (const o of S.objs){ const r = RT.get(o.id); if (r) r.dirty = true; }
  if (UI.spl) splTimer = .35;
  if (noSave) return;
  UI.dirty = true; window.WS?.status();
  clearTimeout(saveT); saveT = setTimeout(() => { A.store.set('show', serialize()); }, 800);
}
async function cloud(){
  try { const c = window.claude; if (!c?.use) return;
    c.use('downloads').then(x => { dl = x; });
    const [d, u] = await Promise.all([c.use('db'), c.use('user')]); if (!d || !u) return; const id = await u.id(); if (!id) return; db = d; me = id; cloudState = 'ok'; if (UI.tab === 'doc') render(); } catch (_){}
}
const cloudDoc = () => db.doc('data/users/' + me + '/show');
async function cloudSave(){ if (!db) return toast('Sauvegarde en ligne indisponible ici : utilise « Exporter le projet ».', true);
  try { await cloudDoc().set({ json: serialize(), at: new Date().toISOString(), name: S.name }); UI.dirty = false; UI.savedAt = Date.now(); window.WS?.status(); toast('Projet enregistré en ligne.'); } catch (e){ toast('Échec de l\'enregistrement : ' + (e.message || e.code), true); } }
async function cloudLoad(){ if (!db) return toast('Sauvegarde en ligne indisponible ici.', true);
  try { const s = await cloudDoc().get(); if (!s.exists) return toast('Aucun projet enregistré en ligne.'); pushUndo(); loadShow(JSON.parse(s.data().json)); toast('Projet chargé (enregistré le ' + String(s.data().at).slice(0, 16).replace('T', ' à ') + ').'); } catch (e){ toast('Échec du chargement : ' + (e.message || e.code), true); } }
async function saveFile(filename, data, text){
  if (!dl && !window.claude){ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data])); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return; }
  if (dl){ try { await dl.save({ filename, data }); return; } catch (e){ if (e?.code === 'declined') return; } }
  if (text !== undefined) modal(`<h1>${esc(filename)}</h1><div class="sub">Le téléchargement n'est pas disponible dans cette vue : copie le contenu ci-dessous.</div><textarea readonly>${esc(text)}</textarea><div class="btns"><button class="b" data-a="copy">Copier</button><button class="b" data-a="close">Fermer</button></div>`);
  else toast('Le téléchargement de fichiers n\'est pas disponible dans cette vue.', true);
}

// ============================================================ import / export
let fflate = null;
const zipLib = async () => fflate || (fflate = await import(window.ONEX_LIBS?.fflate || 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js'));
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
function parseGdtf(xmlText, fileName){
  const x = new DOMParser().parseFromString(xmlText, 'application/xml'), ft = x.querySelector('FixtureType'); if (!ft) throw new Error('description.xml sans FixtureType');
  const attrs = new Set([...x.querySelectorAll('ChannelFunction, LogicalChannel')].map(e => (e.getAttribute('Attribute') || '').split('.').pop()));
  const has = re => [...attrs].some(a => re.test(a));
  const modes = [...x.querySelectorAll('DMXModes > DMXMode')].map(m => { let max = 0; m.querySelectorAll('DMXChannel').forEach(c => String(c.getAttribute('Offset') || '').split(',').forEach(v => { max = Math.max(max, parseInt(v) || 0); })); return [m.getAttribute('Name') || 'Mode', max]; });
  const TOK = { Dimmer: 'dim', Pan: 'pan', Tilt: 'tilt', ColorAdd_R: 'r', ColorAdd_G: 'g', ColorAdd_B: 'b', ColorAdd_W: 'w', ColorAdd_A: 'a', ColorRGB_Red: 'r', ColorRGB_Green: 'g', ColorRGB_Blue: 'b', ColorSub_C: 'c', ColorSub_M: 'm', ColorSub_Y: 'y', Zoom: 'zoom', Shutter1: 'shutter' };
  const rng = {}, sh = []; let shDone = false;
  const chs = [...x.querySelectorAll('DMXModes > DMXMode')].map(m => { const a = []; m.querySelectorAll('DMXChannel').forEach(c => { const offs = String(c.getAttribute('Offset') || '').split(',').map(v => parseInt(v)).filter(v => v > 0); if (!offs.length) return;
      const lc = c.querySelector('LogicalChannel'), at = (lc?.getAttribute('Attribute') || '').split('.').pop(), tk = TOK[at]; if (!tk) return; if (a[offs[0] - 1] && a[offs[0] - 1] !== '-') return;
      a[offs[0] - 1] = tk; if (offs[1] && (tk === 'dim' || tk === 'pan' || tk === 'tilt')) a[offs[1] - 1] = tk + 'F';
      const cf = lc.querySelector('ChannelFunction'); if ((tk === 'pan' || tk === 'tilt') && cf && !rng[tk]){ const f = num(cf.getAttribute('PhysicalFrom')), t2 = num(cf.getAttribute('PhysicalTo')); if (f !== t2) rng[tk] = [f, t2]; }
      if (tk === 'shutter' && !shDone){ shDone = true; const d8 = v => { const [n, by] = String(v || '0/1').split('/').map(Number); return Math.round(n / Math.pow(256, (by || 1) - 1)); };
        lc.querySelectorAll('ChannelFunction').forEach(f => { const strobe = /Strobe/i.test(f.getAttribute('Attribute') || ''), sets = [...f.querySelectorAll('ChannelSet')].filter(q => /open|clos/i.test(q.getAttribute('Name') || ''));
          if (strobe || !sets.length) sh.push([d8(f.getAttribute('DMXFrom')), strobe ? 'strobe' : 'open']); for (const q of sets) sh.push([d8(q.getAttribute('DMXFrom')), /clos/i.test(q.getAttribute('Name')) ? 'closed' : 'open']); }); sh.sort((p, q) => p[0] - q[0]); } });
    const n = a.length; for (let i = 0; i < n; i++) if (!a[i]) a[i] = '-'; return a; });
  const beams = [...x.querySelectorAll('Geometries Beam')], b = beams[0];
  let zoom = null; x.querySelectorAll('ChannelFunction').forEach(c => { if (/^Zoom$/.test((c.getAttribute('Attribute') || '').split('.').pop())){ const a = num(c.getAttribute('PhysicalFrom')), z = num(c.getAttribute('PhysicalTo')); if (z !== a) zoom = [Math.min(a, z), Math.max(a, z)]; } });
  const ba = b ? num(b.getAttribute('BeamAngle'), 25) : 25; if (!zoom) zoom = [ba, ba];
  const lm = beams.reduce((s, e) => s + num(e.getAttribute('LuminousFlux')), 0) || 5000;
  const mover = has(/^Pan$/) && has(/^Tilt$/), mix = has(/^Color(Add|Sub)_/) || has(/^Color\d$/) || has(/^CTO$/);
  const pw = num(x.querySelector('PowerConsumption')?.getAttribute('Value')) || beams.reduce((s, e) => s + num(e.getAttribute('PowerConsumption')), 0);
  const name = ft.getAttribute('LongName') || ft.getAttribute('Name') || fileName, kind = mover ? (zoom[1] <= 8 ? 'beam' : zoom[1] - zoom[0] > 25 && !has(/^Gobo/) ? 'wash' : 'spot') : (zoom[1] > 45 ? 'par' : 'prof');
  return { id: 'gdtf-' + (ft.getAttribute('FixtureTypeID') || uid()), cat: 'lum', kind, mover, name, brand: ft.getAttribute('Manufacturer') || '', lumens: Math.round(lm), zoom: zoom.map(v => Math.round(clamp(v, 1, 120) * 10) / 10), color: mix ? 'rgb' : 'white',
    modes: modes.length ? modes : [['Défaut', 1]], w: num(x.querySelector('PhysicalDescriptions Properties Weight')?.getAttribute('Value')), p: Math.round(pw), gdtf: fileName,
    chs: chs.map((a, i) => { const n = modes[i] ? modes[i][1] : a.length; while (a.length < n) a.push('-'); return a; }), rng, sh: sh.length ? sh : undefined };
}
// Personnalité Avolites Titan (.d4, XML) : un fichier par projecteur, tous ses modes, canaux dans l'ordre exact de Titan
function parseD4(xmlText, fileName){
  const x = new DOMParser().parseFromString(xmlText, 'application/xml'), fx = x.querySelector('Fixture'); if (!fx || !fx.querySelector(':scope > Mode')) throw new Error('fichier .d4 sans <Fixture> ni <Mode>');
  const A = {}; fx.querySelectorAll(':scope > Control > Attribute').forEach(a => { A[a.getAttribute('ID')] = a; });
  const TOK = { Dimmer: 'dim', Master_Dimmer: 'dim', Pan: 'pan', Tilt: 'tilt', Red: 'r', Green: 'g', Blue: 'b', White: 'w', Amber: 'a', Cyan: 'c', Magenta: 'm', Yellow: 'y', Zoom: 'zoom', Shutter: 'shutter' };
  const allModes = [...fx.querySelectorAll(':scope > Mode')], byName = Object.fromEntries(allModes.map(m => [m.getAttribute('Name'), m])), offs = e => String(e.getAttribute('ChannelOffset') || '').split(',').map(v => parseInt(v)).filter(v => v > 0);
  const put = (a, e, base, cell) => { const o = offs(e); if (!o.length) return; const id = e.getAttribute('ID'); let tk = TOK[id]; if (id === 'Master_Dimmer' && a.includes('dim')) tk = null; if (cell && tk === 'dim') tk = null;
    o.forEach((v, i) => { const k = base + v - 1; if (a[k] && a[k] !== '-') return; a[k] = i === 0 ? (tk || '-') : (tk === 'dim' || tk === 'pan' || tk === 'tilt' ? tk + 'F' : '-'); }); };
  const vis = allModes.filter(m => !m.getAttribute('Hidden')), used = new Set();
  const chs = vis.map(m => { const a = [];
    m.querySelectorAll(':scope > Include > Attribute').forEach(e => { used.add(e.getAttribute('ID')); put(a, e, 0); });
    const master = [...m.querySelectorAll(':scope > Cells > Master > Attribute')]; for (const e of master.filter(q => q.getAttribute('ID') !== 'Master_Dimmer')){ used.add(e.getAttribute('ID')); put(a, e, 0); } for (const e of master.filter(q => q.getAttribute('ID') === 'Master_Dimmer')){ used.add('Dimmer'); put(a, e, 0); }
    m.querySelectorAll(':scope > Cells > Cell').forEach(c => { const sub = byName[c.getAttribute('ModeLink')], base = (parseInt(c.getAttribute('ChannelOffset')) || 1) - 1; if (sub) sub.querySelectorAll(':scope > Include > Attribute').forEach(e => { used.add(e.getAttribute('ID')); put(a, e, base, true); }); });
    const n = Math.max(a.length, parseInt(m.getAttribute('Channels')) || 0); for (let i = 0; i < n; i++) if (!a[i]) a[i] = '-'; return a; });
  const modes = vis.map((m, i) => [(m.getAttribute('Name') || 'Mode ' + (i + 1)).replace(/,\s*\d+\s*DMX\s*$/i, ''), chs[i].length]);
  // obturateur : plages fermé / ouvert / strobe lues dans les fonctions de l'attribut Shutter (ramenées sur 8 bits)
  const sh = [], S8 = A.Shutter && A.Shutter.getAttribute('Size') === '2' ? 256 : 1; if (A.Shutter) A.Shutter.querySelectorAll('Function').forEach(f => { const d = String(f.getAttribute('Dmx') || '').split('~').map(Number); if (!isFinite(d[0])) return; const nm = f.getAttribute('Name') || ''; sh.push([Math.round(Math.min(d[0], d[1] ?? d[0]) / S8), /clos|black/i.test(nm) ? 'closed' : /strob|puls|random|flash/i.test(nm) ? 'strobe' : 'open']); }); sh.sort((p, q) => p[0] - q[0]);
  const fo = fx.querySelector('Mode > Physical > Focus'), pm = num(fo?.getAttribute('PanMax')), tm = num(fo?.getAttribute('TiltMax')), rng = {}; if (pm > 0) rng.pan = [-pm / 2, pm / 2]; if (tm > 0) rng.tilt = [-tm / 2, tm / 2];
  const ph = q => num(fx.querySelector('Mode > Physical > ' + q[0])?.getAttribute(q[1])), deg = ph(['Lens', 'Degrees']), lm = ph(['Bulb', 'Lumens']), kg = ph(['Weight', 'Kg']);
  const mover = used.has('Pan') && used.has('Tilt'), mix = ['Red', 'Green', 'Blue', 'Cyan', 'Magenta', 'Yellow'].some(k => used.has(k)), hasZoom = used.has('Zoom'), gobo = Object.keys(A).some(k => /^Gobo/i.test(k));
  const zoom = hasZoom ? [5, 50] : [deg > 0 ? deg : mover ? 20 : 30, deg > 0 ? deg : mover ? 20 : 30], brand = fx.getAttribute('Company') || '', nm = fx.getAttribute('Name') || fileName;
  return { id: 'd4-' + (brand + '-' + nm).toLowerCase().replace(/[^a-z0-9]+/g, '-'), cat: 'lum', kind: mover ? (gobo ? 'spot' : mix || hasZoom ? 'wash' : 'beam') : 'par', mover, name: (brand ? brand + ' ' : '') + nm, brand, lumens: Math.round(lm) || (mover ? 9000 : 4000), zoom, color: mix ? 'rgb' : 'white',
    modes: modes.length ? modes : [['Défaut', 1]], w: kg, p: 0, d4: fileName, chs, rng, sh: sh.length ? sh : undefined };
}
function addType(t){ if (t.raw && t.gdtf) rawPut(t.id, t.raw); const i = S.lib.findIndex(x => x.id === t.id); if (i >= 0) S.lib[i] = { ...S.lib[i], ...t }; else S.lib.push(t); return t; }
const m2a = (x, y, z) => [x / 1000, z / 1000, -y / 1000];           // MVR (mm, Z haut) -> app (m, Y haut, Z vers le public)
const a2m = v => [v.x, -v.z, v.y];
async function importFiles(files){
  let nT = 0, nO = 0, n3 = 0; const errs = []; pushUndo(0, 'Import');
  for (const f of files){
    try {
      const ext = f.name.split('.').pop().toLowerCase(), buf = new Uint8Array(await f.arrayBuffer());
      if (ext === 'json'){ const d = JSON.parse(new TextDecoder().decode(buf));
        if (d.objs){ loadShow(d); toast('Projet « ' + S.name + ' » chargé.'); return; }
        for (const t of (Array.isArray(d) ? d : d.types || d.lib || [])){ if (t.id && t.cat && t.name){ addType(t); nT++; } } }
      else if (ext === 'd4'){ addType(parseD4(new TextDecoder().decode(buf), f.name)); nT++; }
      else if (ext === 'gdtf'){ const z = (await zipLib()).unzipSync(buf); const k = Object.keys(z).find(n => /description\.xml$/i.test(n)); if (!k) throw new Error('description.xml introuvable');
        const t = parseGdtf(new TextDecoder().decode(z[k]), f.name); t.raw = buf; addType(t); nT++; }
      else if (ext === 'mvr' || ext === 'zip'){ const Z = await zipLib(), z = Z.unzipSync(buf); const k = Object.keys(z).find(n => /GeneralSceneDescription\.xml$/i.test(n)); if (!k) throw new Error('GeneralSceneDescription.xml introuvable');
        const types = {}; for (const n of Object.keys(z)) if (/\.gdtf$/i.test(n)){ try { const g = Z.unzipSync(z[n]); const dk = Object.keys(g).find(q => /description\.xml$/i.test(q)); const t = parseGdtf(new TextDecoder().decode(g[dk]), n); t.raw = z[n]; types[n.toLowerCase()] = addType(t); nT++; } catch (e){ errs.push(n + ' : ' + e.message); } }
        const x = new DOMParser().parseFromString(new TextDecoder().decode(z[k]), 'application/xml');
        for (const fx of x.querySelectorAll('Fixture')){
          const spec = (fx.querySelector(':scope > GDTFSpec')?.textContent || '').trim(), t = types[spec.toLowerCase()] || types[(spec + '.gdtf').toLowerCase()] || LIB.find(q => q.id === 'par-zoom');
          const o = defaults(t); o.name = fx.getAttribute('name') || t.name; o.hang = 'fixe';
          const mt = (fx.querySelector(':scope > Matrix')?.textContent || '').match(/-?[\d.]+(?:e-?\d+)?/gi)?.map(Number);
          if (mt?.length >= 12){ o.pos = m2a(mt[9], mt[10], mt[11]).map(v => Math.round(v * 1000) / 1000); const [dx, dy, dz] = m2a(-mt[6] * 1000, -mt[7] * 1000, -mt[8] * 1000); const L = Math.hypot(dx, dy, dz) || 1; o.tilt = Math.acos(clamp(-dy / L, -1, 1)) * R2D; o.pan = Math.atan2(dx, dz) * R2D; }
          const ad = (fx.querySelector('Addresses > Address')?.textContent || '').trim(); if (/^\d+\.\d+$/.test(ad)){ [o.uni, o.addr] = ad.split('.').map(Number); } else if (+ad > 0){ o.uni = Math.floor((+ad - 1) / 512) + 1; o.addr = (+ad - 1) % 512 + 1; }
          const md = (fx.querySelector(':scope > GDTFMode')?.textContent || '').trim(); const mi = t.modes.findIndex(q => q[0] === md); o.mode = Math.max(0, mi);
          o.n = parseInt(fx.querySelector(':scope > FixtureID')?.textContent) || nextNum('lum'); o.grp = fx.closest('Layer')?.getAttribute('name') || ''; o.dim = .6; o.pos[1] = Math.max(0, o.pos[1]);
          S.objs.push(o); build(o); nO++; } }
      else if (ext === 'obj' || ext === 'glb' || ext === 'stl'){ if (!window.IMPORT3D) throw new Error('import 3D pas encore prêt, réessaie dans un instant'); if (await IMPORT3D.importFile(f, files)){ nT++; n3++; } }
      else if (ext === 'mtl'){ if (!files.some(x => /\.obj$/i.test(x.name))) errs.push(f.name + ' : un .mtl s\'importe avec son .obj (choisis les deux fichiers ensemble)'); }
      else errs.push(f.name + ' : format non pris en charge');
    } catch (e){ errs.push(f.name + ' : ' + e.message); }
  }
  touch(); render();
  if (!(n3 && n3 === nT && !errs.length)) toast(`${nT} type${nT > 1 ? 's' : ''} ajouté${nT > 1 ? 's' : ''} à la bibliothèque` + (nO ? `, ${nO} projecteur${nO > 1 ? 's' : ''} posé${nO > 1 ? 's' : ''}` : '') + (errs.length ? ' · ' + errs.join(' · ') : '.'), errs.length > 0);
  if (nT && !nO && !n3){ UI.tab = 'lib'; UI.libCat = 'imp'; render(); }
}
const slug = n => (n || 'projet').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '');
const csv = rows => rows.map(r => r.map(c => /[;"\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(';')).join('\n');
function patchRows(){ const rows = [['N°', 'Nom', 'Type', 'Groupe', 'Univers', 'Adresse', 'Mode', 'Canaux', 'X (m)', 'Y (m)', 'Z (m)', 'Accroche']];
  for (const o of [...S.objs].sort((a, b) => a.n - b.n)){ const t = typeOf(o); if (t.cat !== 'lum') continue; rows.push([o.n, o.name, t.name, o.grp || '', o.uni, o.addr || '', t.modes[o.mode || 0]?.[0] || '', modeCh(o), ...o.pos.map(v => fmt(v)), o.hang ? (o.hang === 'perche' ? 'Perche' : o.hang === 'pont' ? 'Pont ' + (window.PONTS ? PONTS.nameOf(o.sid) : '') : 'Fixe') : 'Sol']); } return rows; }
function gearRows(){ const m = {}; for (const o of S.objs){ const t = typeOf(o); const g = m[t.id] = m[t.id] || { t, n: 0, w: 0, p: 0 }; g.n++; g.w += weightOf(o); g.p += powerOf(o); }
  const rows = [['Catégorie', 'Matériel', 'Quantité', 'Poids unitaire (kg)', 'Poids total (kg)', 'Puissance unitaire (W)', 'Puissance totale (W)']];
  for (const { t, n, w, p } of Object.values(m).sort((a, b) => a.t.cat.localeCompare(b.t.cat))) rows.push([CATS[t.cat], (t.brand ? t.brand + ' ' : '') + t.name, n, fmt(w / n, 1), fmt(w, 1), Math.round(p / n), Math.round(p)]); return rows; }
async function exportMvr(){
  let Z; try { Z = await zipLib(); } catch (_){ return toast('Impossible de charger le module de compression.', true); }
  const files = {}, enc = new TextEncoder(), g = () => { const h = () => Math.floor(Math.random() * 65536).toString(16).padStart(4, '0'); return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`.toUpperCase(); };
  const layers = {};
  for (const o of S.objs){ const t = typeOf(o), r = RT.get(o.id); if (t.cat === 'str' && t.kind === 'person') continue;
    const p = posOf(o), d = o.pan !== undefined ? dirOf(o.pan, o.tilt, new THREE.Vector3()) : new THREE.Vector3(0, -1, 0);
    const w = new THREE.Vector3(...a2m(d)).negate(), ref = Math.abs(w.z) > .95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1), u = new THREE.Vector3().crossVectors(ref, w).normalize(), v = new THREE.Vector3().crossVectors(w, u);
    const P = a2m(p).map(q => q * 1000), f = q => (Math.round(q * 1e6) / 1e6).toString(), mtx = `{${f(u.x)},${f(u.y)},${f(u.z)}}{${f(v.x)},${f(v.y)},${f(v.z)}}{${f(w.x)},${f(w.y)},${f(w.z)}}{${f(P[0])},${f(P[1])},${f(P[2])}}`;
    let xml;
    if (t.cat === 'lum'){ if (t.raw && t.gdtf) files[t.gdtf] = t.raw;
      xml = `<Fixture name="${esc(o.name)}" uuid="${g()}"><Matrix>${mtx}</Matrix><GDTFSpec>${esc(t.gdtf || '')}</GDTFSpec><GDTFMode>${esc(t.modes[o.mode || 0]?.[0] || '')}</GDTFMode><Addresses>${o.addr ? `<Address break="0">${(o.uni - 1) * 512 + o.addr}</Address>` : ''}</Addresses><FixtureID>${o.n}</FixtureID><UnitNumber>${o.n}</UnitNumber><FixtureTypeId>0</FixtureTypeId><CustomId>0</CustomId></Fixture>`; }
    else xml = `<SceneObject name="${esc(o.name)}" uuid="${g()}"><Matrix>${mtx}</Matrix></SceneObject>`;
    const L = t.cat === 'lum' ? (o.grp || 'Lumière') : CATS[t.cat]; (layers[L] = layers[L] || []).push(xml); }
  const body = Object.entries(layers).map(([n, xs]) => `<Layer name="${esc(n)}" uuid="${g()}"><ChildList>${xs.join('')}</ChildList></Layer>`).join('');
  files['GeneralSceneDescription.xml'] = enc.encode(`<?xml version="1.0" encoding="UTF-8"?>\n<GeneralSceneDescription verMajor="1" verMinor="5" provider="StageFactory" providerVersion="2"><UserData/><Scene><Layers>${body}</Layers></Scene></GeneralSceneDescription>`);
  await saveFile(slug(S.name) + '.mvr.zip', Z.zipSync(files));
}

// ============================================================ interface
let toastT = 0;
function toast(msg, warn){ const el = $('#toast'); el.textContent = msg; el.className = warn ? 'warn' : ''; el.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => el.style.display = 'none', warn ? 7000 : 3500); }
// ---- « Nouveau modèle » : une référence à soi, avec ses vraies valeurs ; un champ vide reste « inconnu »
const saveUserCat = () => A.store.set('userCat', LIB.filter(t => t.userCat).map(t => t.def));
function libForm(t){ const d = t ? t.def : {}, v = x => x == null ? '' : esc(String(x).replace('.', ',')); UI.libEdit = t ? t.id : null;
  modal(`<h1>${t ? 'Modifier le modèle' : 'Nouveau modèle'}</h1><div class="sub">Recopie les valeurs de la fiche du fabricant. Laisse vide ce que tu ne connais pas : ce sera affiché « inconnu » et compté 0 dans les charges, jamais estimé.</div>
  <div class="pf"><label>Famille</label><select id="nm_fam">${FAMILIES.map(f => `<option value="${f[0]}" ${d.fam === f[0] ? 'selected' : ''}>${esc(f[1])}</option>`).join('')}</select>
  <label>Marque</label><input id="nm_brand" value="${esc(d.brand || '')}" placeholder="Shure"><label>Modèle</label><input id="nm_model" value="${esc(d.model || '')}" placeholder="Beta 58A">
  <label>Poids (kg)</label><input id="nm_w" value="${v(d.w)}" placeholder="inconnu" inputmode="decimal"><label>Largeur (mm)</label><input id="nm_dw" value="${v(d.dim?.[0])}" placeholder="inconnue" inputmode="decimal"><label>Hauteur (mm)</label><input id="nm_dh" value="${v(d.dim?.[1])}" placeholder="inconnue" inputmode="decimal"><label>Profondeur (mm)</label><input id="nm_dd" value="${v(d.dim?.[2])}" placeholder="inconnue" inputmode="decimal">
  <label>Puissance (W)</label><input id="nm_p" value="${v(d.p)}" placeholder="inconnue ; 0 = passif" inputmode="decimal"><label>Canaux DMX</label><input id="nm_ch" value="${v(d.over?.modes?.[0]?.[1])}" placeholder="lumière seulement" inputmode="numeric">
  <label>Lien de la fiche</label><input id="nm_src" value="${esc(d.src || '')}" placeholder="https://…"><label>Remarque</label><input id="nm_note" value="${esc(d.spec?.Remarque || '')}" placeholder="facultatif"></div>
  <div class="btns"><button class="b on" data-a="libok">${t ? 'Enregistrer' : 'Ajouter à ma bibliothèque'}</button><button class="b" data-a="close">Annuler</button></div>`); setTimeout(() => $('#nm_brand')?.focus(), 30); }
function modal(html){ const m = $('#modal'); m.firstElementChild.style.width = ''; m.firstElementChild.innerHTML = html; m.style.display = 'flex'; }
// en mode spectacle, rien n'éclaire la salle si aucun projecteur n'est allumé : on le dit et on laisse une veilleuse
const noLight = () => !(window.DMX?.U?.size) && !S.objs.some(o => !o.hidden && typeOf(o).cat === 'lum' && (o.dim ?? 0) > .01) && !S.objs.some(o => !o.hidden && typeOf(o).cat === 'vid' && o.on !== false);
setInterval(() => { if (!A.live) return; const g = noLight(); if (g !== !!A.liveGuard){ A.liveGuard = g; A.applyAmb(); } }, 800);
function setLive(on){ A.live = on; A.liveGuard = on && noLight(); if (A.liveGuard) toast(S.objs.some(o => typeOf(o).cat === 'lum') ? 'Mode spectacle : tous les projecteurs sont à zéro. Monte une intensité ou restitue une mémoire. Une veilleuse reste allumée en attendant.' : 'Mode spectacle : il n\'y a aucun projecteur dans ce projet. Pose-en depuis la bibliothèque (onglet Lumière). Une veilleuse reste allumée en attendant.', true); A.applyAmb(); for (const o of S.objs){ const r = RT.get(o.id); if (r) r.dirty = true; } render(); }
const rng = (k, min, max, step, val, unit = '') => `<div class="rv"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}"><span data-v="${k}">${fmt(+val, step < 1 ? (step < .1 ? 2 : 1) : 0)}${unit}</span></div>`;
let LIBV = null; const libV = () => LIBV || (LIBV = Object.assign({ view: 'big', grp: 'brand', sort: 'name', proj: false, fiche: true, fav: [], rec: [] }, A.store.get('libv', null) || {})), libVSave = () => A.store.set('libv', libV());
function libHtml(){
  const Q = (UI.libQ || '').trim(), QW = refKey(Q, '') ? Q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/\s+/).filter(Boolean) : [], CATA = !QW.length && UI.libCat === 'cata', hay = t => ((t.brand || '') + ' ' + t.name + ' ' + (t.fam ? FAM.get(t.fam)?.[1] || '' : '') + ' ' + (t.grp || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const LV = libV(), ALL = [...LIB, ...S.lib], cats = { fav: 'Favoris', rec: 'Utilisés récemment', lum: CATS.lum, vid: CATS.vid, son: CATS.son, str: 'Structure', dec: 'Décor', cata: 'Catalogue', imp: 'Importés', salle: 'Parc' }, PIN = !QW.length && (UI.libCat === 'fav' || UI.libCat === 'rec'), DEC = !QW.length && UI.libCat === 'dec', PK = !QW.length && UI.libCat === 'salle' && window.PARC ? PARC.libList() : null, list0 = QW.length ? [...LIB, ...S.lib].filter(t => !OLDLIB.has(t.id) && QW.every(w => hay(t).includes(w))).slice(0, 80) : CATA ? (UI.libBrand ? refTypes().filter(t => t.brand === UI.libBrand) : []) : PK ? PK.types.map(q => q.t) : UI.libCat === 'imp' ? S.lib : DEC ? LIB.filter(t => t.kind === 'sprop') : PIN ? LV[UI.libCat].map(id => ALL.find(t => t.id === id)).filter(Boolean) : [...LIB.filter(t => t.cat === UI.libCat && t.kind !== 'sprop' && !OLDLIB.has(t.id) && !t.catalog && !t.userCat), ...ALL.filter(t => t.cat === UI.libCat && (t.catalog || t.userCat) && !OLDLIB.has(t.id))], cnt = PK ? new Map(PK.types.map(q => [q.t.id, q])) : null;
  const kgs = t => t.noW ? 'poids inconnu' : (t.w < 1 ? Math.round(t.w * 1000) + ' g' : String(+(+t.w).toFixed(1)).replace('.', ',') + ' kg'), sub0 = t => t.catalog || t.userCat ? [FAM.get(t.fam)?.[1], kgs(t), t.cat === 'lum' && t.modes[0][1] ? t.modes.map(m => m[1]).join('/') + ' can.' : '', t.cat === 'son' && !t.noSpl ? t.spl + ' dB' : ''].filter(Boolean).join(' · ') : t.kind === 'sprop' ? (t.grp || '') : t.cat === 'lum' ? `${t.zoom[0] === t.zoom[1] ? t.zoom[0] + '°' : t.zoom[0] + '–' + t.zoom[1] + '°'} · ${t.modes[0][1]} can.` : t.cat === 'vid' ? `${t.throw[0]}–${t.throw[1]}:1 · ${t.res.join('×')}` : t.cat === 'son' ? `${t.spl} dB max · ${t.kind === 'sub' ? 'omni' : t.hd + '×' + t.vd + '°'}` : t.size ? t.size.join(' × ') + ' m' : '';
  const sub = t => { const q = cnt && cnt.get(t.id); return q ? `<span style="color:${q.placed > q.qty ? '#ff7b7b' : q.placed === q.qty ? '#f0c96a' : 'inherit'}">${q.placed} posé${q.placed > 1 ? 's' : ''} sur ${q.qty}${q.placed > q.qty ? ' · stock dépassé' : ''}</span>${q.dmx === false ? ' <span style="color:#ff7b7b">· DMX à décrire</span>' : ''}` : esc(sub0(t)); };
  const placed = new Map(); for (const o of S.objs) placed.set(o.type, (placed.get(o.type) || 0) + 1);
  const star = t => `<i class="lst${LV.fav.includes(t.id) ? ' on' : ''}" data-a="libfav" data-id="${esc(t.id)}" title="${LV.fav.includes(t.id) ? 'Retirer des favoris' : 'Mettre en favori'}">${LV.fav.includes(t.id) ? '★' : '☆'}</i>`, badge = t => placed.get(t.id) ? `<em class="lbd" title="Déjà dans ce projet">${placed.get(t.id)} posé${placed.get(t.id) > 1 ? 's' : ''}</em>` : '';
  const tile = t => { const du = t.kind === 'sprop' && window.DECOR && DECOR.ready ? DECOR.thumb(t.key) : null; return `<button draggable="true" data-a="pick" data-id="${esc(t.id)}" class="th ${UI.placing === t.id ? 'on' : ''}" title="Clic : choisir puis cliquer dans la vue · ou glisser directement dans la vue 3D ou le plan">${du ? `<img src="${du}" alt="" loading="lazy">` : `<img data-th="${esc(t.id)}" alt="">`}<span>${esc((t.brand ? t.brand + ' ' : '') + t.name)}${LV.view === 'small' ? '' : `<small>${sub(t)}</small>`}</span>${badge(t)}${star(t)}</button>`; }, cur = UI.placing && [...LIB, ...S.lib].find(t => t.id === UI.placing), nRef = refTypes().length;
  const mm3 = d => d ? d.map(v => String(v)).join(' × ') + ' mm (l × h × p)' : null, unk = '<span style="color:#f0a23c">inconnu</span>';
  const fiche = t => `<div class="info" id="libFiche" style="border-left:3px solid var(--acc,#f2a93b);"><img class="big" data-th="${esc(t.id)}" data-big="1" alt=""><div><b>${esc(t.brand + ' ' + t.name)}</b> — ${esc(FAM.get(t.fam)?.[1] || '')}${t.userCat ? ' · <i>mon modèle</i>' : ''}</div><table class="t" style="margin:6px 0">
    <tr><td>Poids</td><td class="mono r">${t.noW ? unk : kgs(t)}</td></tr><tr><td>Dimensions</td><td class="mono r">${mm3(t.dim) || unk}</td></tr><tr><td>Puissance électrique</td><td class="mono r">${t.noP ? unk : t.p ? t.p + ' W' : 'aucune (passif)'}</td></tr>
    ${Object.entries(t.spec || {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>`).join('')}</table>
    ${t.noThrow ? '<div class="sub" style="color:#f0a23c">Rapport de projection non relevé (souvent : appareil vendu sans optique) : celui du modèle générique est utilisé, ce n\'est pas une donnée de cet appareil.</div>' : ''}${t.cat === 'lum' && (t.noZoom || t.noLm) ? `<div class="sub" style="color:#f0a23c">${[t.noZoom ? 'ouverture' : '', t.noLm ? 'flux' : ''].filter(Boolean).join(' et ')} non relevé${t.noZoom && t.noLm ? 's' : ''} : le faisceau dessiné reprend ${t.noZoom && t.noLm ? 'ceux' : 'celui'} du modèle générique, ce n\'est pas une donnée de cet appareil.</div>` : ''}${t.cat === 'lum' && t.noDmx ? '<div class="sub">DMX : le nombre de canaux est connu, pas leur ordre. L\'appareil se pose, se patche et se règle à la main ; pour le piloter en DMX, importe sa personnalité (Titan) ou décris ses canaux.</div>' : ''}
    <div class="sub">Modèle 3D : générique « ${esc(LIB.find(x => x.id === t.base)?.name || '')} »${t.kind === 'gear' ? ' — ' + ({ console: 'console sur pieds', rack: 'appareil en rack', di: 'boîte de direct', hoist: 'palan à chaîne', lift: 'pied de levage', panel: 'dalle LED', fog: 'machine à fumée' }[t.shape] || 'boîtier') + (t.noDim ? ', gabarit par défaut car les dimensions sont inconnues' : ', aux dimensions de la fiche') : t.kind === 'mic' ? ' — micro ' + ({ crayon: 'crayon', large: 'à large membrane', grave: 'de grosse caisse', plat: 'de surface', boule: 'main' }[t.micShape] || '') + (t.dim ? ' à sa taille réelle' : '') : t.dim ? ' mis aux dimensions de la fiche' : ''}. ${t.src ? `Source : <a href="${esc(t.src)}" target="_blank" rel="noopener">${esc(t.src.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a> (${t.srcKind === 'fabricant' ? 'fabricant' : t.srcKind === 'catalogue' ? 'catalogue du fabricant, lecture automatique' : t.srcKind === 'copie' ? 'fiche du fabricant, copie hébergée ailleurs' : t.srcKind === 'revendeur' ? 'revendeur' : 'saisie par toi'}).` : 'Source : saisie par toi, sans lien.'}</div>
    ${t.userCat ? `<div class="btns"><button class="b" data-a="libedit" data-id="${esc(t.id)}">Modifier</button><button class="b" data-a="libdel" data-id="${esc(t.id)}">Supprimer de ma bibliothèque</button></div>` : ''}</div>`;
  /* ---- filtres, tri, groupes : la liste à montrer ---- */
  const brandsOf = L => [...L.reduce((m, t) => m.set(t.brand || '', (m.get(t.brand || '') || 0) + 1), new Map())].sort((a, b) => a[0].localeCompare(b[0], 'fr')), BR = CATA ? brandsOf(refTypes()) : brandsOf(list0);
  let list = list0, FI = ''; if (UI.libBrand && !CATA && !QW.length) list = list.filter(t => UI.libBrand === '__gen' ? !t.brand : t.brand === UI.libBrand); if (LV.proj) list = list.filter(t => placed.get(t.id));
  const nm = t => (t.brand ? t.brand + ' ' : '') + t.name, num = (a, b, k) => (k(a) == null ? 1e12 : k(a)) - (k(b) == null ? 1e12 : k(b)), SORT = { name: (a, b) => t0(a) - t0(b) || a.name.localeCompare(b.name, 'fr', { numeric: true }), brand: (a, b) => (a.brand || '').localeCompare(b.brand || '', 'fr') || a.name.localeCompare(b.name, 'fr', { numeric: true }), w: (a, b) => num(a, b, t => t.noW || !(t.w > 0) ? null : t.w), p: (a, b) => num(a, b, t => t.noP || !(t.p > 0) ? null : t.p) }, t0 = t => t.brand ? 1 : 0;
  if (!(PIN && UI.libCat === 'rec') && !(LV.sort === 'name' && !list.some(t => t.brand))) list = [...list].sort(SORT[LV.sort] || SORT.name);          /* tri « nom » sur des modèles tous génériques : l'ordre d'origine de la bibliothèque est gardé */
  const famOf = t => t.kind === 'sprop' ? (t.grp || 'Décor') : t.fam ? (FAM.get(t.fam)?.[1] || 'Autres') : 'Génériques', keyB = t => t.brand || 'Génériques';
  function listing(){ if (!list.length) return `<div class="info">${LV.proj ? 'Aucun de ces modèles n\'est posé dans ce projet (filtre « Dans ce projet » du menu Affichage).' : UI.libCat === 'fav' && !QW.length ? 'Aucun favori pour l\'instant : clique l\'étoile ☆ d\'un modèle.' : UI.libCat === 'rec' && !QW.length ? 'Rien de posé récemment.' : PK ? '' : UI.libCat === 'imp' && !QW.length ? 'Aucun type importé pour l\'instant.' : 'Aucun modèle ici.'}</div>`;
    let gk = LV.grp === 'fam' ? famOf : LV.grp === 'brand' ? keyB : null; if (DEC && LV.grp !== 'none') gk = famOf; if (gk === keyB && new Set(list.map(keyB)).size < 2) gk = new Set(list.map(famOf)).size > 1 ? famOf : null;
    const G = new Map(); for (const t of list){ const k = gk ? gk(t) : ''; (G.get(k) || G.set(k, []).get(k)).push(t); } const keys = [...G.keys()].sort((a, b) => (a === 'Génériques' ? -1 : b === 'Génériques' ? 1 : 0) || a.localeCompare(b, 'fr', { numeric: true })), few = keys.length <= 3 || QW.length || UI.libBrand || DEC || PIN || PK;
    const CAP = LV.view === 'list' ? 800 : 160; let left = CAP, cut = 0;
    const kgs2 = t => t.noW || !(t.w > 0) ? '' : kgs(t), ch = t => t.cat === 'lum' && t.modes && t.modes[0] && t.modes[0][1] ? t.modes.map(m => m[1]).join(' / ') : '';
    const rowsOf = L => LV.view === 'list' ? `<table class="libt"><thead><tr><th></th><th data-a="libopt" data-id="sort:brand">Constructeur${LV.sort === 'brand' ? ' ▲' : ''}</th><th data-a="libopt" data-id="sort:name">Modèle${LV.sort === 'name' ? ' ▲' : ''}</th><th>Famille</th><th class="r" data-a="libopt" data-id="sort:w">Poids${LV.sort === 'w' ? ' ▲' : ''}</th><th class="r" data-a="libopt" data-id="sort:p">Puissance${LV.sort === 'p' ? ' ▲' : ''}</th><th class="r">Canaux DMX</th><th class="r">Posés</th></tr></thead><tbody>${L.map(t => `<tr draggable="true" data-a="pick" data-id="${esc(t.id)}" class="${UI.placing === t.id ? 'on' : ''}"><td>${star(t)}</td><td class="mu">${esc(t.brand || '')}</td><td>${esc(t.name)}</td><td class="mu">${esc(t.kind === 'sprop' ? (t.grp || '') : t.fam ? (FAM.get(t.fam)?.[1] || '') : 'générique')}</td><td class="r"${kgs2(t) ? '' : ' title="Poids inconnu / non relevé"'}>${kgs2(t)}</td><td class="r">${t.noP || !(t.p > 0) ? '' : t.p + ' W'}</td><td class="r">${ch(t)}</td><td class="r">${placed.get(t.id) || ''}</td></tr>`).join('')}</tbody></table>` : DEC && LV.view !== 'small' ? `<div class="lib dec">${L.map(t => { const u = DECOR.thumb(t.key); return `<button draggable="true" data-a="pick" data-id="${esc(t.id)}" class="${UI.placing === t.id ? 'on' : ''}">${u ? `<img src="${u}" alt="" loading="lazy">` : '<span class="ph"></span>'}${esc(t.name)}<small>${sub(t)}</small>${badge(t)}${star(t)}</button>`; }).join('')}</div>` : `<div class="lib${LV.view === 'small' ? ' sm' : ''}">${L.map(tile).join('')}</div>`;
    let h = ''; for (const k of keys){ const L = G.get(k), ov = UI.libOpen && UI.libOpen[k], open = !gk || (ov != null ? ov : few || k === 'Génériques' || L.some(t => t.id === UI.placing));
      if (gk) h += `<h2 class="libg" data-a="libgrp" data-id="${esc(k)}" data-open="${open ? 1 : 0}">${open ? '▾' : '▸'} ${esc(k)} <small>${L.length}</small></h2>`; if (!open) continue; const part = L.slice(0, Math.max(0, left)); left -= part.length; cut += L.length - part.length; if (part.length) h += rowsOf(part); }
    return h + (cut ? `<div class="info">${cut} modèle${cut > 1 ? 's' : ''} de plus non affiché${cut > 1 ? 's' : ''} : choisis un constructeur, replie des groupes, ou passe en « Liste ».</div>` : ''); }
  const opt = (k, v, l) => `<button data-a="libopt" data-id="${k}:${v}" class="${LV[k] === v ? 'on' : ''}">${LV[k] === v ? '●' : '○'} ${l}</button>`, chk = (k, l, on) => `<button data-a="libopt" data-id="${k}:!" class="${on ? 'on' : ''}">${on ? '☑' : '☐'} ${l}</button>`;
  return `<div class="libx"><div class="libmain"><div class="libtop"><input id="libQ" type="search" placeholder="Chercher dans toute la bibliothèque : marque, modèle, famille…" value="${esc(Q)}">
    <select class="inp" data-lv="cat" title="Catégorie"${QW.length ? ' disabled' : ''}>${Object.entries(cats).map(([k, v]) => `<option value="${k}"${UI.libCat === k ? ' selected' : ''}>${k === 'fav' ? '★ ' : ''}${v}${k === 'imp' && S.lib.length ? ' (' + S.lib.length + ')' : k === 'cata' ? ' : références réelles (' + nRef + ')' : k === 'fav' && LV.fav.length ? ' (' + LV.fav.length + ')' : ''}</option>${k === 'rec' ? '<option disabled>──────────</option>' : ''}`).join('')}</select>
    <select class="inp" data-lv="brand" title="Constructeur"${QW.length || DEC || PK || !BR.length ? ' disabled' : ''}><option value="">Tous les constructeurs</option>${BR.map(([b, n]) => `<option value="${b ? esc(b) : '__gen'}"${UI.libBrand === (b || '__gen') ? ' selected' : ''}>${b ? esc(b) : 'Génériques (sans marque)'} (${n})</option>`).join('')}</select>
    <details class="libmenu"><summary class="b">Affichage ▾</summary><div class="libpop"><b>Vue</b>${opt('view', 'big', 'Grandes vignettes')}${opt('view', 'small', 'Petites vignettes')}${opt('view', 'list', 'Liste détaillée')}<b>Grouper</b>${opt('grp', 'brand', 'Par constructeur')}${opt('grp', 'fam', 'Par famille')}${opt('grp', 'none', 'Sans groupe')}<b>Trier</b>${opt('sort', 'name', 'Par nom')}${opt('sort', 'brand', 'Par constructeur')}${opt('sort', 'w', 'Par poids')}${opt('sort', 'p', 'Par puissance')}<b>Options</b>${chk('proj', 'Seulement ce qui est dans ce projet', LV.proj)}${chk('fiche', 'Fiche technique du modèle choisi', LV.fiche !== false)}</div></details>
    <button class="b" data-a="libnew">Nouveau modèle…</button><button class="b" data-a="libwin" title="${window.LIBWIN && LIBWIN.on ? 'Remettre la bibliothèque dans le tiroir du bas' : 'Détacher la bibliothèque dans sa propre fenêtre, à déplacer et redimensionner'}">${window.LIBWIN && LIBWIN.on ? '⇲ Ancrer' : '⇱ Détacher'}</button></div>
  ${QW.length ? `<div class="info">${list.length ? list.length + ' résultat' + (list.length > 1 ? 's' : '') : 'Rien ne correspond. « Nouveau modèle… » permet de l\'ajouter avec ses vraies valeurs.'}</div>` : ''}${(FI = cur && (cur.catalog || cur.userCat) ? fiche(cur) : cur && cur.kind !== 'sprop' ? `<div class="info" id="libFiche" ><img class="big" data-th="${esc(cur.id)}" data-big="1" alt=""><div><b>${esc(cur.name)}</b>${cur.gdtf ? ` — fiche GDTF importée${cur.raw ? (cur.g3d === false ? ', sans modèle 3D dans la fiche : modèle générique' : ', modèle 3D de la fiche') : ' (le fichier n\'est plus en mémoire : réimporte-le pour revoir son modèle 3D)'}` : ' — modèle générique de la bibliothèque, valeurs indicatives'}</div><div class="sub">${esc(sub0(cur))}${cur.w ? ' · ' + kgs(cur) : ''}${cur.p ? ' · ' + cur.p + ' W' : ''}</div></div>` : '', '')}${CATA ? `<div class="info">Références réelles : chaque valeur vient d'une fiche, ce qui n'a pas été lu reste « inconnu ». ${UI.libBrand ? 'Clique une référence pour voir sa fiche et la poser.' : 'Choisis une marque, ou cherche directement un modèle dans le champ ci-dessus.'}</div>${UI.libBrand ? `<div class="btns"><button class="b" data-a="libbrand" data-id="">← Toutes les marques</button><b style="align-self:center;margin-left:8px">${esc(UI.libBrand)}</b></div>` : `<div class="lib">${(m => [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([b, n]) => `<button data-a="libbrand" data-id="${esc(b)}">${esc(b)}<small>${n} référence${n > 1 ? 's' : ''}</small></button>`).join(''))(refTypes().reduce((m, t) => m.set(t.brand, (m.get(t.brand) || 0) + 1), new Map()))}</div>`}` : ''}${PK ? `<div class="info">${PK.head}</div><div class="btns"><button class="b on" data-a="parc">Parc de matériel…</button></div>` : ''}
  ${UI.placing ? (blkType(UI.placing) ? `<div class="info warn"><b>Praticables en bloc.</b> Trace un rectangle à la souris (vue 3D ou plan 2D) : il se remplit de modules. Ou clique une fois pour poser le bloc ci-dessous, centré sous le pointeur. Le coin de départ se colle aux praticables voisins. Maj : continuer. Échap : annuler.</div>
  <div class="pf" id="blkBox"><label>Colonnes</label><input type="number" data-ser="blkCols" min="1" max="40" step="1" value="${UI.blkCols}"><label>Rangées</label><input type="number" data-ser="blkRows" min="1" max="40" step="1" value="${UI.blkRows}"><label>Hauteur</label><select data-ser="blkH">${[.2, .4, .6, .8, 1, 1.2, 1.4, 1.6].map(v => `<option value="${v}" ${Math.abs(v - UI.blkH) < .01 ? 'selected' : ''}>${Math.round(v * 100)} cm</option>`).join('')}</select><label>Tourner les modules (1 × 2)</label><input type="checkbox" data-ser="blkRot" ${UI.blkRot ? 'checked' : ''}></div>` : `<div class="info warn">Clique dans la vue pour poser (perche, passerelle ou sol). <b>Plusieurs d'un coup</b> : règle la quantité ci-dessous, puis presse et tire une ligne à la souris, dans la vue 3D ou sur le plan 2D. Maj : continuer à poser. Échap : annuler.</div>
  <div class="pf" id="serieBox"><label>Quantité</label><input type="number" data-ser="serie" min="1" max="60" step="1" value="${UI.serie}"><label>ou un tous les (m)</label><input type="number" data-ser="serieStep" min="0" max="20" step="0.05" value="${UI.serieStep || ''}" placeholder="libre"><label>Symétrique à l'axe</label><input type="checkbox" data-ser="serieSym" ${UI.serieSym ? 'checked' : ''}></div>`) : `<div class="info">Choisis un matériel, puis clique dans la vue. Sur une perche ou une passerelle, il s'accroche dessous.</div>`}
  ${DEC && !(window.DECOR && DECOR.ready) ? (window.DECOR?.load(), '<div class="info">Lecture des modèles de décor et des personnages…</div>') : CATA && !UI.libBrand ? '' : listing()}${UI.libCat === 'str' && !QW.length && !PK && window.PONTS && PONTS.libHtml ? PONTS.libHtml() : ''}${PK && PK.other.length ? `<div class="info"><b>Sans modèle 3D</b> (micros, backline, accessoires) : ${PK.other.map(l => esc(l.qty + ' × ' + l.label)).join(' · ')}</div>` : ''}
  ${UI.libCat === 'str' ? `<div class="btns"><button class="b on" data-a="scene">Scène en praticables…</button></div>` : ''}<h2>Importer</h2><div class="btns"><button class="b on" data-a="flib">Bibliothèques Titan et GDTF Share…</button><button class="b" data-a="import">Fichiers GDTF, Avolites .d4, MVR ou JSON…</button></div>
  <div class="info">Une personnalité <b>Avolites .d4</b> (dossier FixtureLibrary de Titan) ajoute le projecteur avec tous ses modes et l'ordre exact de ses canaux : patché pareil dans Titan, il répond juste. Un <b>GDTF</b> ajoute un projecteur à la bibliothèque (modes DMX, zoom, flux, poids). Un <b>MVR</b> pose aussi les projecteurs à leur position avec leur patch. On en trouve sur gdtf-share.com et dans les exports Vectorworks, Capture ou grandMA3.</div></div>${FI && LV.fiche !== false ? `<aside class="libside"><a class="libx-x" data-a="libopt" data-id="fiche:!" title="Fermer la fiche (elle se rouvre par le menu Affichage)">✕</a>${FI}</aside>` : ''}</div>`;
}
function objHtml(){
  const bad = conflicts(), rows = Object.keys(CATS).map(c => { const os = S.objs.filter(o => typeOf(o).cat === c).sort((a, b) => a.n - b.n); if (!os.length) return '';
    return `<div style="color:var(--mute);font-size:10px;text-transform:uppercase;letter-spacing:.08em;cursor:default;padding-top:6px">${CATS[c]} · ${os.length}</div>` + os.map(o => `<div data-a="sel" data-id="${o.id}" class="${UI.sel.includes(o.id) ? 'sel' : ''}"><span class="mono" style="width:26px;color:var(--mute)">${o.n}</span><span>${esc(o.name)}</span><span class="ad mono ${bad.has(o.id) ? 'warn' : ''}">${c === 'lum' ? addrStr(o) : ''}</span></div>`).join(''); }).join('');
  return `<h2>Objets du projet (${S.objs.length})</h2><div class="olist">${rows || '<div>Aucun objet</div>'}</div>`;
}
function propHtml(){
  const sel = selObjs(); if (!sel.length) return `<div class="info">Rien de sélectionné. Clique un objet dans la vue ou dans la liste. Maj + clic pour en sélectionner plusieurs.</div>` + (window.OBJLIST ? OBJLIST.mini() : objHtml());
  const o = sel[sel.length - 1], t = typeOf(o), same = sel.filter(x => typeOf(x).cat === t.cat), multi = sel.length > 1;
  let h = `<div class="btns"><button class="b" data-a="dup">Dupliquer</button><button class="b" data-a="array">Répéter en ligne…</button>${o.pan !== undefined ? `<button class="b ${UI.aiming ? 'on' : ''}" data-a="aim">Viser un point (V)</button>` : ''}<button class="b red" data-a="del">Supprimer</button></div>`;
  h += `<div class="info"><b>${multi ? sel.length + ' objets · ' : ''}${esc((t.brand ? t.brand + ' ' : '') + t.name)}</b><br>${t.w ? fmt(t.w, 1) + ' kg' : ''}${t.p ? ' · ' + t.p + ' W' : ''}${t.cat === 'lum' ? ' · ' + t.lumens.toLocaleString('fr') + ' lm' : ''}<span id="photo"></span></div>`;
  h += `<div class="pf">${multi ? '' : `<label>Nom</label><input type="text" data-k="name" value="${esc(o.name)}"><label>Numéro</label><input type="number" data-k="n" value="${o.n}">`}
    <label>Position</label><div class="tri">${[0, 1, 2].map(i => `<input type="number" step="0.05" data-pos="${i}" value="${o.pos[i]}" title="${['X : jardin − / cour +', 'Y : hauteur', 'Z : distance au nez de scène'][i]}">`).join('')}</div>
    <label>Poids (kg)</label><input type="number" class="inp" data-k="w" min="0" step="0.1" value="${weightOf(o)}" title="Poids utilisé par le plan de charge. Valeur du modèle : ${fmt(t.w || 0, 1)} kg">
    <label>Accroche</label><select class="inp" data-k="hang"><option value="">Posé au sol</option><option value="fixe" ${o.hang === 'fixe' ? 'selected' : ''}>Accroche fixe</option><option value="perche" ${o.hang === 'perche' ? 'selected' : ''}>Sur perche (suit la hauteur)</option>${window.PONTS && (S.sups || []).some(q => q.kind === 'truss') ? `<option value="pont" ${o.hang === 'pont' ? 'selected' : ''}>Sur pont${o.hang === 'pont' ? ' : ' + esc(PONTS.nameOf(o.sid)) : ' (le plus proche)'}</option>` : ''}</select>${window.LAYERS ? LAYERS.fiche(o) : ''}${window.LARRAY && o.la && !multi ? LARRAY.fiche(o) : ''}`;
    if (o.hang === 'perche' && !multi){ const sm = window.RIG ? RIG.sum(o.pi ?? 0) : null; h += `<label>Perche</label><select class="inp" data-k="pi">${A.PERCHES.map((P, i) => P.off ? '' : `<option value="${i}"${i === o.pi ? ' selected' : ''}>P${i + 1} — à ${fmt(P.z, 2)} m</option>`).join('')}</select>${sm ? `<div class="info" style="margin-top:6px;border:1px solid ${sm.col}">Perche ${o.pi + 1} : <b>${fmt(sm.kg, 0)} kg</b> utiles, taux <b>${fmt(sm.util * 100, 0)} %</b> · <a data-a="rig" style="cursor:pointer;text-decoration:underline">plan de charge</a></div>` : ''}`; }
  if (t.cat === 'lum'){
    h += `<label>Groupe</label><input type="text" data-k="grp" value="${esc(o.grp || '')}" list="grps"><datalist id="grps">${groups().map(g => `<option value="${esc(g)}">`).join('')}</datalist>
    ${multi ? '' : `<label>DMX</label><div class="tri"><input type="number" min="1" max="64" data-k="uni" value="${o.uni}" title="Univers"><input type="number" min="0" max="512" data-k="addr" value="${o.addr}" title="Adresse"><select class="inp" data-k="mode" title="Mode">${t.modes.map((m, i) => `<option value="${i}" ${i === (o.mode || 0) ? 'selected' : ''}>${esc(m[0])} · ${m[1]}</option>`).join('')}</select></div>`}
    <label>Intensité</label>${rng('dim', 0, 1, .01, o.dim)}
    <label>Couleur</label><div class="sws">${SWATCH.map(c => `<i style="background:${c}" data-c="${c}"></i>`).join('')}<input type="color" data-k="color" value="${o.color}"></div>
    ${t.zoom[0] !== t.zoom[1] ? `<label>Zoom</label>${rng('zoom', t.zoom[0], t.zoom[1], .5, clamp(o.zoom, t.zoom[0], t.zoom[1]), '°')}` : ''}
    ${(FC => `${FC.iris ? `<label>Iris</label>${rng('iris', .15, 1, .01, o.iris ?? 1)}` : ''}${FC.gobo ? `<label>Gobo</label><select class="inp" data-k="gobo" title="Motifs génériques dessinés par le logiciel (pas ceux d'un fabricant)">${GOBOS.map((g, i) => `<option value="${i}" ${(o.gobo || 0) === i ? 'selected' : ''}>${i ? i + ' · ' : ''}${g[1]}</option>`).join('')}</select>${o.gobo ? `<label>Orientation du gobo</label>${rng('gobor', 0, 360, 1, o.gobor || 0, '°')}<label>Rotation du gobo</label>${rng('gobos', -2, 2, .05, o.gobos || 0, ' tr/s')}` : ''}` : ''}${FC.wheel ? `<label>Roue de couleurs</label><select class="inp" data-k="cw" title="Filtres génériques (pas ceux d'un fabricant) : ils retirent de la lumière">${CWHEEL.map((c, i) => `<option value="${i}" ${(o.cw || 0) === i ? 'selected' : ''}>${c[1]}</option>`).join('')}</select>` : ''}${FC.cto ? `<label>CTO</label>${rng('cto', 0, 1, .01, o.cto || 0)}` : ''}${FC.prism ? `<label>Prisme</label><select class="inp" data-k="prism">${PRISMS.map(n => `<option value="${n}" ${(o.prism || 0) === n ? 'selected' : ''}>${n ? n + ' facettes' : 'Aucun'}</option>`).join('')}</select>${o.prism ? `<label>Orientation du prisme</label>${rng('prismr', 0, 360, 1, o.prismr || 0, '°')}<label>Rotation du prisme</label>${rng('prisms', -2, 2, .05, o.prisms || 0, ' tr/s')}` : ''}` : ''}${FC.gobo || FC.blades ? `<label>Netteté</label>${rng('focus', 0, 1, .01, o.focus || 0)}` : ''}${FC.blades ? ['haut', 'droit', 'bas', 'gauche'].map((n, i) => `<label>Couteau ${n}</label>${rng('b' + (i + 1), 0, 1, .01, o['b' + (i + 1)] || 0)}<label>Angle ${n}</label>${rng('b' + (i + 1) + 'r', -45, 45, .5, o['b' + (i + 1) + 'r'] || 0, '°')}`).join('') : ''}`)(fxCaps(t))}
    <label>Pan</label>${rng('pan', -180, 180, .5, o.pan, '°')}<label>Tilt</label>${rng('tilt', 0, 180, .5, o.tilt, '°')}
    ${same.length > 1 ? `<label>Éventail</label>${rng('fan', -30, 30, .5, 0, '°')}` : ''}
    <label>Effet</label><select class="inp" data-k="fx">${Object.entries(FXS).map(([k, v]) => `<option value="${k}" ${o.fx === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label>Effet 2</label><select class="inp" data-k="fx2">${Object.entries(FXS).map(([k, v]) => `<option value="${k}" ${(o.fx2 || 'fixe') === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label>Effet 3</label><select class="inp" data-k="fx3">${Object.entries(FXS).map(([k, v]) => `<option value="${k}" ${(o.fx3 || 'fixe') === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label>Vitesse</label>${rng('speed', .05, 3, .05, o.speed)}`;
  } else if (t.cat === 'vid'){
    h += `<label>Allumé</label><div><input type="checkbox" data-k="on" ${o.on !== false ? 'checked' : ''}></div>
    <label>Contenu</label><select class="inp" data-k="content">${[['mire', 'Mire de réglage'], ['blanc', 'Blanc'], ['degrade', 'Dégradé'], ['image', 'Image…'], ['video', 'Vidéo…'], ['cam', 'Source en direct : caméra, carte d\'acquisition, NDI…'], ['ndi', 'Source en direct : NDI (réseau)…'], ['ecran', 'Source en direct : écran ou fenêtre…']].map(([k, v]) => `<option value="${k}" ${o.content === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label title="${esc(t.lensSrc || 'Aucune liste d\'optiques relevée pour cet appareil : tu peux saisir le rapport de la tienne.')}">Optique</label><select class="inp" data-k="lens">${t.lenses ? t.lenses.map(l => `<option value="${l.id}"${l.id === vpLens(o, t)?.id ? ' selected' : ''}>${esc(l.name)}</option>`).join('') : `<option value=""${o.lens === '__c' ? '' : ' selected'}>${t.noThrow || !(t.catalog || t.userCat) ? 'Générique' : 'Celle de la fiche'} (${fmt(t.throw[0], 2)}–${fmt(t.throw[1], 2)}:1)</option>`}<option value="__c"${vpLens(o, t)?.custom ? ' selected' : ''}>Saisir une optique…</option></select>
    ${vpLens(o, t)?.custom ? `<label title="Rapport de projection de ton optique, lu sur sa fiche : distance ÷ largeur d'image. Pour une optique fixe, mets la même valeur deux fois.">Son rapport</label><div style="display:flex;gap:6px;align-items:center"><input type="number" class="inp" data-k="lcA" min="0.2" max="20" step="0.01" value="${+(+o.lcA).toFixed(3)}" style="width:5.2em"> à <input type="number" class="inp" data-k="lcB" min="0.2" max="20" step="0.01" value="${+(+(o.lcB || o.lcA)).toFixed(3)}" style="width:5.2em"> :1</div>` : t.lensNominal ? `<label></label><div><small style="color:var(--text-muted,#a3abb8)">rapport nominal de la fiche ; décalage non relevé</small></div>` : ''}
    <label>Rapport</label>${vpThrow(o, t)[0] === vpThrow(o, t)[1] ? `<div><b>${fmt(vpThrow(o, t)[0], 2)}:1</b> <small style="color:var(--text-muted,#a3abb8)">optique fixe : pour changer la taille, déplace le projecteur</small></div>` : rng('throw', vpThrow(o, t)[0], vpThrow(o, t)[1], .01, clamp(o.throw, vpThrow(o, t)[0], vpThrow(o, t)[1]), ':1')}
    <label>Luminosité</label>${rng('bright', .1, 1, .01, o.bright ?? 1)}
    <label>Pan</label>${rng('pan', -180, 180, .5, o.pan, '°')}<label>Tilt</label>${rng('tilt', 0, 180, .5, o.tilt, '°')}
    ${(SH => SH && SH.none ? `<label>Décalage</label><div><small style="color:var(--text-muted,#a3abb8)">cette optique ne se décale pas (fiche du fabricant)</small></div>` : `<label title="Décalage d'optique (lens shift) : l'image se déplace sans incliner le projecteur, donc sans trapèze. En % de la largeur d'image.${SH ? ' Plage de cette optique d\'après le fabricant.' : ' Plage non connue pour cet appareil : à vérifier sur la fiche de l\'optique.'}">Décalage H</label>${rng('lsh', SH ? SH.h[0] : -100, SH ? SH.h[1] : 100, SH ? .5 : 1, SH ? clamp(o.lsh || 0, SH.h[0], SH.h[1]) : o.lsh || 0, ' %')}
    <label title="Décalage d'optique vertical, en % de la hauteur d'image.${SH ? ' Plage de cette optique d\'après le fabricant' + (SH.hung ? ', retournée car le projecteur est suspendu tête en bas.' : '.') : ' Plage non connue pour cet appareil : à vérifier sur la fiche de l\'optique.'}">Décalage V</label>${rng('lsv', SH ? SH.v[0] : -150, SH ? SH.v[1] : 150, SH ? .5 : 1, SH ? clamp(o.lsv || 0, SH.v[0], SH.v[1]) : o.lsv || 0, ' %')}`)(vpShift(o, t))}${window.VIDEO ? VIDEO.fiche(o, t) : ''}`;
  } else if (t.cat === 'son'){
    h += `<label>Actif</label><div><input type="checkbox" data-k="on" ${o.on !== false ? 'checked' : ''}></div>
    <label>Niveau</label>${rng('gain', -30, 0, .5, o.gain || 0, ' dB')}
    <label>Pan</label>${rng('pan', -180, 180, .5, o.pan, '°')}<label>Tilt</label>${rng('tilt', 0, 180, .5, o.tilt, '°')}`;
  } else {
    h += `<label>Rotation</label>${rng('yaw', -180, 180, 1, o.yaw || 0, '°')}`;
    if (t.kind === 'ledwall'){ const I = LEDW.info(o); h += `</div><div class="info">${fmt(I.w, 2)} × ${fmt(I.h, 2)} m · ${I.px} × ${I.py} px · ${I.kg} kg</div><div class="btns"><button class="b on" data-a="ledcfg">Configurer le mur LED…</button></div><div class="pf">`; }
    if (t.kind === 'drape') h += `<label>Largeur</label>${rng('size0', .5, 30, .05, (o.size || t.size)[0], ' m')}<label>Hauteur</label>${rng('size1', .3, 20, .05, (o.size || t.size)[1], ' m')}`;
    if (t.kind === 'mesh3d'){ const k = o.sc || 1, sz = t.size || [0, 0, 0]; h += `<label title="Agrandit ou réduit le modèle importé. 1 = la taille choisie à l'import.">Échelle</label><input type="number" class="inp" data-k="sc" min="0.01" step="0.05" value="${+(+k).toFixed(3)}"><label>Taille</label><div><b>${fmt(sz[0] * k, 2)} × ${fmt(sz[1] * k, 2)} × ${fmt(sz[2] * k, 2)} m</b> <small style="color:var(--text-muted,#a3abb8)">larg. × prof. × haut. · ${(t.model?.tri || 0).toLocaleString('fr')} triangles · ${esc(t.model?.src?.file || '')}</small></div>`; }
    if (t.kind === 'screen') h += `<label>Largeur</label>${rng('size0', 1, 14, .05, (o.size || t.size)[0], ' m')}<label>Hauteur</label>${rng('size1', .5, 8, .025, (o.size || t.size)[1], ' m')}`;
    if (t.kind === 'truss') h += `<label>Longueur</label>${rng('len', .5, 14, .5, o.len || t.len, ' m')}`;
    if (t.kind === 'prim'){ const sz = o.size || t.size, ni = (k, v, mn = .01) => `<input type="number" class="inp" data-k="${k}" min="${mn}" step="0.05" value="${+(+v).toFixed(3)}">`, flat = t.shape === 'plane';
      h += `<label>Largeur (m)</label>${ni('size0', sz[0])}<label>Profondeur (m)</label>${ni('size1', sz[1])}${flat ? '' : `<label>${t.shape === 'torus' ? 'Épaisseur (m)' : 'Hauteur (m)'}</label>${ni('size2', sz[2])}`}<label>Matière</label><select class="inp" data-k="mat">${MATS.map(([k, l]) => `<option value="${k}"${(o.mat || 'peint') === k ? ' selected' : ''}>${l}</option>`).join('')}</select><label>Couleur</label><input type="color" data-k="pcol" value="${o.pcol || MATBY.get(o.mat || 'peint').col}"><label>Bascule avant-arrière</label>${rng('rx', -180, 180, 1, o.rx || 0, '°')}<label>Bascule de côté</label>${rng('rz', -180, 180, 1, o.rz || 0, '°')}`; }
    if (t.kind === 'sprop'){ const sz = o.size || t.size, mx = v => Math.max(4, Math.ceil(v * 3)); h += `<label>Largeur</label>${rng('size0', .05, mx(t.size[0]), .01, sz[0], ' m')}<label>Profondeur</label>${rng('size1', .01, mx(t.size[1]), .01, sz[1], ' m')}<label>Hauteur</label>${rng('size2', .01, mx(t.size[2]), .01, sz[2], ' m')}${window.DECOR && DECOR.ready && !DECOR.isPerson(t.key) ? `<label>Teinte</label><select class="inp" data-k="tint">${DECOR.tints().map(([k, l]) => `<option value="${k}"${(o.tint || '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select>` : ''}<label>Poids (kg)</label><input type="number" class="inp" data-k="w" min="0" step="0.5" value="${o.w ?? ''}" placeholder="inconnu">`; }
    if (t.kind === 'riser') h += `<label>Hauteur</label>${rng('size2', .2, 1.6, .2, (o.size || t.size)[2], ' m')}`;
    if (t.kind === 'stairs') h += `<label>Largeur</label>${rng('size0', .6, 3, .1, (o.size || t.size)[0], ' m')}<label>Hauteur</label>${rng('size2', .2, 1.6, .2, (o.size || t.size)[2], ' m')}`;
    if (t.kind === 'rail') h += `<label>Longueur</label>${rng('len', .5, 4, .5, o.len || t.len, ' m')}`;
    if (t.kind === 'riser' && !t.shape) h += `</div><div class="btns"><button class="b on" data-a="dress">Habiller la scène (jupe, garde-corps, escalier)…</button></div><div class="pf">`;
  }
  return h + '</div>' + (window.OBJLIST ? OBJLIST.mini() : objHtml());
}
function photo(){
  const el = $('#photo'); if (!el) return; const o = selObjs().pop(); if (!o) return; const t = typeOf(o), r = RT.get(o.id); let s = '';
  if (t.cat === 'lum'){ r.head.getWorldPosition(_v); const d = dirOf(o.pan, o.tilt, new THREE.Vector3()), h = hitAlong(_v.clone(), d), D = h ? h.distance : 0, z = clamp(o.zoom, t.zoom[0], t.zoom[1]);
    if (D) s = `<br>Distance <b>${fmt(D, 1)} m</b> · tache <b>⌀ ${fmt(2 * D * Math.tan(z * D2R / 2), 2)} m</b> · <b>${Math.round(candela(t.lumens, z) * (o.dim ?? 1) / (D * D)).toLocaleString('fr')} lux</b> au centre`; }
  else if (t.cat === 'vid' && r.geom){ const G = r.geom; s = `<br>Distance <b>${fmt(G.D, 1)} m</b> · image <b>${fmt(G.W, 2)} × ${fmt(G.H, 2)} m</b><br><b>${Math.round(G.lux).toLocaleString('fr')} lux</b> sur écran blanc · pixel <b>${fmt(G.px, 1)} mm</b>${G.kx > .01 || G.ky > .01 ? `<br><span style="color:var(--warn,#f2a93b)">Trapèze : ${G.kx > .01 ? `largeur ${fmt(G.wT, 2)} m en haut, ${fmt(G.wB, 2)} m en bas` : ''}${G.kx > .01 && G.ky > .01 ? ' · ' : ''}${G.ky > .01 ? `hauteur ${fmt(G.hL, 2)} m à gauche, ${fmt(G.hR, 2)} m à droite` : ''}</span>` : ''}${G.spill ? `<br><span style="color:var(--warn,#f2a93b)">L'image déborde de la surface visée.</span>` : ''}${G.op.warp ? `<br>4 coins réglés : ${Math.round(G.op.used * 100)} % de la matrice utilisée` : ''}${window.VIDEO ? VIDEO.info(o, G) : ''}`; }
  else if (t.cat === 'son'){ r.head.getWorldPosition(_v); const d = dirOf(o.pan, o.tilt, new THREE.Vector3()); const L = [{ o, t, src: _v.clone(), d }]; s = `<br>Dans l'axe : <b>${fmt(splAt(_v.clone().addScaledVector(d, 10), L), 0)} dB</b> à 10 m · <b>${fmt(splAt(_v.clone().addScaledVector(d, 20), L), 0)} dB</b> à 20 m (max, champ direct)`; }
  el.innerHTML = s;
}
const groups = () => [...new Set(S.objs.filter(o => typeOf(o).cat === 'lum' && o.grp).map(o => o.grp))];
function conHtml(){
  return `<div class="swt"><div><b>Mode spectacle</b><div class="dmx">Éteint la lumière de service, allume projecteurs et vidéo</div></div><div class="tg ${A.live ? 'on' : ''}" data-a="live"></div></div>
  <div class="btns"><button class="b on" data-a="desk">Ouvrir le pupitre lumière</button></div>${window.ENG && ENG.progCount().v ? `<div class="btns"><button class="b" data-a="pclear" title="Les réglages faits à la main passent devant les mémoires tant qu'ils ne sont pas vidés ou enregistrés">Vider le programmeur (${ENG.progCount().v} valeur(s))</button></div>` : ''}<h2>Mémoires</h2><div class="mem">${S.cues.map((c, i) => `<button data-a="cue" data-id="${i}" class="${UI.cue === i ? 'on' : ''}" title="Double-clic : renommer">${esc(c.name)}</button>`).join('')}</div>
  <div class="btns"><button class="b" data-a="rec">+ Enregistrer l'état</button>${UI.cue >= 0 && S.cues[UI.cue] ? `<button class="b" data-a="upd">Mettre à jour</button><button class="b" data-a="ren">Renommer</button><button class="b red" data-a="delcue">Suppr.</button>` : ''}</div>
  ${UI.cue >= 0 && S.cues[UI.cue] ? `<div class="pf" style="grid-template-columns:1fr 1fr"><label>Fondu d'entrée (s)</label><input type="number" class="inp" data-cq="fade" min="0" max="60" step="0.1" value="${S.cues[UI.cue].fade ?? 1.5}"><label>Tenue en enchaînement (s)</label><input type="number" class="inp" data-cq="hold" min="0.5" max="600" step="0.5" value="${S.cues[UI.cue].hold ?? 6}"></div>` : ''}
  <div class="btns"><button class="b${UI.auto ? ' on' : ''}" data-a="auto">${UI.auto ? '■ Arrêter l\'enchaînement' : '▶ Enchaîner les mémoires'}</button><button class="b" data-a="cnext">Suivante ▸</button></div>
  ${UI.cue >= 0 && S.cues[UI.cue] ? `<div class="pf"><label>Fondu</label>${rng('cuefade', 0, 8, .1, S.cues[UI.cue].fade ?? 1.5, ' s')}</div>` : ''}
  <h2>Général</h2><div class="pf"><label>Master</label>${rng('master', 0, 1, .01, S.master)}<label>Fumée</label>${rng('haze', 0, 1, .01, S.haze)}<label>Lumière public</label>${rng('house', 0, .4, .01, A.houseLevel)}</div>
  <button class="bo ${S.black ? 'on' : ''}" data-a="black">BLACKOUT</button>
  <h2>Groupes</h2>${groups().map(g => { const os = S.objs.filter(o => o.grp === g), d = os.reduce((s, o) => s + (o.dim || 0), 0) / os.length;
    return `<div class="card"><div class="hd"><span class="dot" style="background:${os[0].fx === 'arc' ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' : os[0].color}"></span><span class="nm" data-a="selgrp" data-id="${esc(g)}">${esc(g)}<br><span class="ad mono">${os.length} proj. · cliquer pour régler</span></span><input type="range" min="0" max="1" step="0.01" value="${d}" data-g="${esc(g)}"></div></div>`; }).join('') || '<div class="info">Donne un nom de groupe à tes projecteurs (onglet Réglages) pour les piloter ensemble ici.</div>'}`;
}
function docHtml(){
  const bad = conflicts(), W = S.objs.reduce((s, o) => s + weightOf(o), 0), Wh = S.objs.filter(o => o.hang).reduce((s, o) => s + weightOf(o), 0), P = S.objs.reduce((s, o) => s + powerOf(o), 0);
  const un = {}; for (const o of S.objs) if (typeOf(o).cat === 'lum' && o.addr) un[o.uni] = (un[o.uni] || 0) + modeCh(o);
  const gr = gearRows().slice(1);
  return `<div class="pf"><label>Projet</label><input type="text" data-k="showname" value="${esc(S.name)}"></div>
  <div class="btns"><button class="b" data-a="csave">Enregistrer en ligne</button><button class="b" data-a="cload">Recharger</button><button class="b" data-a="xproj">Exporter le projet</button><button class="b" data-a="import">Importer…</button><button class="b" data-a="demo">Projet de démo</button><button class="b red" data-a="clear">Tout vider</button></div>
  <div class="info">${db ? 'La sauvegarde en ligne est liée à ton compte.' : 'Le projet est gardé dans ce navigateur. Pour le conserver ou le transférer, exporte-le.'} Annuler : Ctrl+Z.</div>
  <h2>Synthèse</h2><div class="info"><b>${S.objs.length}</b> objets · poids total <b>${fmt(W, 0)} kg</b>, dont <b>${fmt(Wh, 0)} kg accrochés</b><br>Puissance installée <b>${fmt(P / 1000, 1)} kW</b> · ${fmt(P / 230, 0)} A en mono 230 V · ${fmt(P / (400 * 1.732), 0)} A par phase en tri 400 V<br>
  DMX : ${Object.entries(un).map(([u, c]) => `univers ${u} : <b>${c}</b>/512`).join(' · ') || 'aucun canal'}${bad.size ? `<br><span class="warn">${bad.size} projecteur(s) en conflit d'adresse</span>` : ''}</div>
  <div class="btns"><button class="b" data-a="autopatch">Patch automatique</button><button class="b" data-a="xpatch">Patch (CSV)</button><button class="b" data-a="xgear">Liste de matériel (CSV)</button><button class="b" data-a="rig">Plan de charge des perches</button><button class="b" data-a="xmvr">Export MVR</button></div>
  ${window.PUB ? PUB.docHtml() : ''}<h2>Affichage technique</h2>
  <label class="chk"><input type="checkbox" data-k="labels" ${UI.labels ? 'checked' : ''}> Étiquettes (numéro et adresse)</label>
  <label class="chk"><input type="checkbox" data-k="cov" ${UI.cov ? 'checked' : ''}> Couverture des enceintes et gabarits vidéo</label>
  <label class="chk"><input type="checkbox" data-k="spl" ${UI.spl ? 'checked' : ''}> Carte de niveau sonore (public)</label>
  ${UI.spl && UI.splRange ? `<div class="legend"><span>${UI.splRange[0]} dB</span><i></i><span>${UI.splRange[1]} dB</span></div><div class="info">Médiane dans le public : <b>${fmt(UI.splRange[2], 0)} dB</b> (niveau maximal des enceintes actives, hors subs).</div><div class="info">Niveau maximal en champ direct à hauteur d'oreille, sans réflexions ni occultation : une estimation de couverture, pas une simulation acoustique.</div>` : ''}
  <h2>Matériel</h2><table class="t"><tr><th>Matériel</th><th>Qté</th><th>kg</th><th>W</th></tr>${gr.map(r => `<tr><td>${esc(r[1])}</td><td>${r[2]}</td><td>${r[4]}</td><td>${r[6]}</td></tr>`).join('')}</table>`;
}
const panelFocus = () => { const a = document.activeElement; return $('#console').contains(a) || !!document.querySelector('#drawer')?.contains(a) || !!(a && a.closest && a.closest('.drp')); };
function render(){
  const DR = window.DRAWER; if (DR && (UI.tab === 'lib' || UI.tab === 'list' || UI.tab === 'con')){ DR.show(UI.tab); UI.tab = UI.sel.length || window.PONTS?.sel ? 'prop' : 'doc'; }
  const el = $('#console'), st = el.scrollTop, inner = [...el.querySelectorAll('.olist')].map(q => [q.id, q.scrollTop]), tabs = DR ? { prop: 'Réglages', doc: 'Projet' } : { lib: 'Biblio.', list: 'Objets', prop: 'Réglages', con: 'Console', doc: 'Projet' };
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h1>${DR ? 'Inspecteur' : 'Atelier'}</h1><span><span class="b" data-a="undo" title="Annuler (Ctrl+Z)">↶</span> <span class="b" data-a="redo" title="Rétablir (Ctrl+Y)">↷</span> <span style="cursor:pointer;color:var(--mute);margin-left:6px" data-a="closep">✕</span></span></div>
  <div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button data-a="tab" data-id="${k}" class="${UI.tab === k ? 'on' : ''}">${v}${k === 'prop' && UI.sel.length ? ' (' + UI.sel.length + ')' : ''}</button>`).join('')}</div>
  <div id="tabBody">${{ lib: libHtml, list: () => window.WS ? WS.listHtml() : '', prop: () => (!UI.sel.length && window.PONTS && (PONTS.sel || PONTS.node) ? PONTS.propHtml() : propHtml()), con: conHtml, doc: docHtml }[UI.tab]()}</div>`;
  DR?.refresh(); window.DESK?.sync(); el.scrollTop = st; { const now = [...el.querySelectorAll('.olist')]; inner.forEach(([id, top], i) => { const q = id ? now.find(x => x.id === id) : now[i]; if (q && (!id || q.id === id)) q.scrollTop = top; }); } photo();
  A.canvas.style.cursor = UI.placing || UI.aiming ? 'crosshair' : '';
}
function refreshProps(){ if (UI.tab === 'prop' && !panelFocus()) render(); else if (UI.tab === 'prop'){ const o = selObjs().pop(); if (o) document.querySelectorAll('#console [data-pos]').forEach(i => { if (document.activeElement !== i) i.value = o.pos[+i.dataset.pos]; }); photo(); } }
function syncDoc(){ if (!panelFocus() || document.activeElement.type === 'checkbox') render(); }
function syncConsole(){ if ((UI.tab === 'con' || window.DRAWER?.is('con')) && !panelFocus()) render(); }
let fanBase = null;
function onInput(e){
  const el = e.target, k = el.dataset.k, val = el.type === 'checkbox' ? el.checked : el.value;
  const lab = el.parentElement?.querySelector(`[data-v="${k}"]`); if (lab) lab.textContent = fmt(+val, +el.step < 1 ? (+el.step < .1 ? 2 : 1) : 0) + (lab.textContent.match(/[^\d,.\-]+$/)?.[0] || '');
  if (el.dataset.cq){ const c = S.cues[UI.cue]; if (c){ pushUndo('cq', 'Temps de la mémoire'); c[el.dataset.cq] = Math.max(0, +val || 0); touch(); } return; }
  if (el.dataset.g){ pushUndo('g' + el.dataset.g); UI.fade = null; for (const o of S.objs) if (o.grp === el.dataset.g) o.dim = +val; touch(); return; }
  if (el.dataset.pos !== undefined){ pushUndo('pos'); const i = +el.dataset.pos, sel = selObjs(), p = sel[sel.length - 1], dlt = (+val || 0) - p.pos[i]; for (const o of sel) o.pos[i] = Math.round((o.pos[i] + dlt) * 1000) / 1000; touch(); photo(); return; }
  if (!k) return;
  if (k === 'master'){ S.master = +val; return; } if (k === 'haze'){ S.haze = +val; UI.fade = null; return touch(); } if (k === 'house'){ A.houseLevel = +val; A.applyAmb(); return; }
  if (k === 'cuefade'){ if (S.cues[UI.cue]) S.cues[UI.cue].fade = +val; return touch(); }
  if (k === 'showname'){ S.name = val; return touch(); }
  if (k === 'labels'){ UI.labels = val; return; } if (k === 'cov'){ UI.cov = val; return touch(true); } if (k === 'spl'){ UI.spl = val; splMap(); return render(); }
  const sel = selObjs(), p = sel[sel.length - 1]; if (!p) return; const cat = typeOf(p).cat, tg = sel.filter(o => typeOf(o).cat === cat);
  pushUndo('p' + k); UI.fade = null;
  if (k === 'fan'){ fanBase = fanBase && fanBase.key === UI.sel.join() ? fanBase : { key: UI.sel.join(), pan: tg.reduce((s, o) => s + o.pan, 0) / tg.length }; const so = [...tg].sort((a, b) => a.pos[0] - b.pos[0]); so.forEach((o, i) => o.pan = fanBase.pan + (i - (so.length - 1) / 2) * +val); return touch(); }
  if (k === 'name' || k === 'n' || k === 'uni' || k === 'addr'){ p[k] = k === 'name' ? val : Math.max(0, parseInt(val) || 0); return touch(); }
  for (const o of tg){
    if (/^size\d$/.test(k)){ o.size = [...(o.size || typeOf(o).size)]; o.size[+k[4]] = +val; }
    else if (k === 'pi'){ o.pi = +val; o.pos[2] = A.PERCHES[o.pi].z; }
    else if (k === 'hang'){ const was = !!o.hang; o.hang = val || null; if (o.hang !== 'perche') delete o.pi; if (o.hang === 'pont'){ if (!window.PONTS?.attachNearest(o)) o.hang = 'fixe'; } else delete o.sid; }
    else if (k === 'tint'){ if (val) o.tint = val; else delete o.tint; } else if (k === 'w'){ if (val === '' || !(+val >= 0)) delete o.w; else o.w = +val; } else if (['fx', 'fx2', 'fx3', 'color', 'content', 'grp', 'pcol', 'lens'].includes(k)) o[k] = val; else if (k === 'mat'){ o.mat = val; o.pcol = MATBY.get(val)?.col || o.pcol; } else if (k === 'on') o.on = val; else if (k === 'mode') o.mode = +val; else o[k] = +val;
    if (k === 'sc') o.sc = clamp(+val || 1, .001, 1000);
    if (/^size|^len$|^hang$|^tint$|^pcol$|^rx$|^rz$|^mat$|^sc$/.test(k)) rebuild(o);
  }
  if (k === 'lens'){ for (const o of tg){ const t = typeOf(o); if (o.lens === '') delete o.lens; if (o.lens === '__c' && !(+o.lcA > 0)){ delete o.lens; const T0 = vpThrow(o, t); o.lcA = T0[0]; o.lcB = T0[1]; o.lens = '__c'; } const TR = vpThrow(o, t); o.throw = clamp(o.throw ?? TR[0], TR[0], TR[1]); } }
  if (k === 'hang' || k === 'mat' || k === 'lens') select(UI.sel); else if (/^size|^len$|^tint$|^pcol$|^rx$|^rz$|^sc$/.test(k)) reattach();
  if (k === 'content' && (val === 'image' || val === 'video')) pickMedia(p, val); else if (k === 'content' && (val === 'cam' || val === 'ecran' || val === 'ndi') && window.VIDEO) VIDEO.live(p, val);
  touch(); photo();
}
function pickMedia(o, kind){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = kind === 'image' ? 'image/*' : 'video/*';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const url = URL.createObjectURL(f); let el;
    if (kind === 'image'){ el = new Image(); el.onload = () => touch(true); el.src = url; } else { el = document.createElement('video'); el.src = url; el.loop = true; el.muted = true; el.playsInline = true; el.play().catch(() => {}); }
    MEDIA.set(o.id, { el, kind }); touch(true); };
  inp.click();
}
let lastSel = { id: null, t: 0 };   // les deux clics d'un double-clic doivent tomber sur la même ligne (pas sur l'œil ou le cadenas)
function onClick(e){
  const sw = e.target.closest('.sws i'); if (sw){ pushUndo('pcolor'); UI.fade = null; for (const o of selObjs()) if (typeOf(o).cat === 'lum'){ o.color = sw.dataset.c; if (o.fx === 'arc') o.fx = 'fixe'; } touch(); return render(); }
  const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a, id = el.dataset.id;
  const acts = {
    tab(){ UI.tab = id; render(); }, libcat(){ UI.libCat = id; UI.libBrand = ''; render(); }, libfav(){ const L = libV(), i = L.fav.indexOf(id); i < 0 ? L.fav.unshift(id) : L.fav.splice(i, 1); libVSave(); render(); }, libopt(){ const [k, v] = id.split(':'), L = libV(); L[k] = v === '!' ? !L[k] : v; libVSave(); render(); }, libgrp(){ UI.libOpen = UI.libOpen || {}; UI.libOpen[id] = !(el && el.dataset.open === '1'); render(); }, libwin(){ window.LIBWIN?.toggle(); }, parc(){ window.PARC?.open(); }, closep(){ A.toggleConsole(false); }, undo, redo,
    libbrand(){ UI.libBrand = id || ''; render(); }, libnew(){ libForm(null); }, libedit(){ libForm([...LIB, ...S.lib].find(t => t.id === id)); },
    libdel(){ const i = LIB.findIndex(t => t.id === id && t.userCat); if (i < 0) return; if (S.objs.some(o => o.type === id)){ const t = LIB[i]; if (!S.lib.some(x => x.id === id)) S.lib.push(t); } LIB.splice(i, 1); saveUserCat(); if (UI.placing === id) UI.placing = null; toast('Modèle retiré de ta bibliothèque.' + (S.objs.some(o => o.type === id) ? ' Il reste dans ce projet, où il est utilisé.' : '')); render(); },
    libok(){ const g = k => ($('#nm_' + k)?.value || '').trim(), n = k => { const v = parseFloat(g(k).replace(',', '.')); return isFinite(v) && v >= 0 ? v : null; }, brand = g('brand'), model = g('model'), edit = UI.libEdit || null;
      if (!brand || !model) return toast('Il faut au moins la marque et le modèle.', true); const dup = refDup(brand, model, edit); if (dup) return toast(`« ${dup.brand} ${dup.name} » existe déjà dans la bibliothèque : pas de doublon.`, true);
      const d = [n('dw'), n('dh'), n('dd')], c = { id: refKey(brand, model), brand, model, fam: g('fam'), w: n('w'), p: g('p') === '' ? null : n('p'), dim: d.every(v => v > 0) ? d : null, src: /^https?:\/\//.test(g('src')) ? g('src') : '', srcKind: g('src') ? 'saisie' : '', spec: g('note') ? { Remarque: g('note') } : {} };
      const ch = Math.round(n('ch') || 0); if (ch > 0) c.over = { modes: [[ch + ' canaux', ch]] }; const t = refType(c, true); if (!t) return toast('Famille inconnue.', true);
      const i = edit ? LIB.findIndex(x => x.id === edit) : -1; if (i >= 0){ if (t.id !== edit) for (const o of S.objs) if (o.type === edit) o.type = t.id; LIB[i] = t; const j = S.lib.findIndex(x => x.id === edit); if (j >= 0) S.lib[j] = t; } else LIB.push(t);
      saveUserCat(); $('#modal').style.display = 'none'; UI.libEdit = null; UI.libQ = ''; UI.libCat = 'cata'; UI.libBrand = t.brand; UI.placing = t.id; for (const o of S.objs) if (o.type === t.id){ const r = RT.get(o.id); if (r){ unbuild(o); build(o); } } toast(`${brand} ${model} ajouté à ta bibliothèque.`); render(); },
    pick(){ UI.placing = UI.placing === id ? null : id; UI.aiming = false; if (UI.placing && A.mode === 'walk') toast('Passe en vue Orbite ou Plan pour poser du matériel.', true); render(); },
    sel(){ select(e.shiftKey || e.ctrlKey ? [...UI.sel, id] : [id]); const dbl = e.detail >= 2 && lastSel.id === id && e.timeStamp - lastSel.t < 700; lastSel = { id, t: e.timeStamp }; if (dbl && !e.shiftKey && !e.ctrlKey && byId(id)){ UI.tab = 'prop'; A.toggleConsole(true); render(); requestAnimationFrame(() => { const pn = document.querySelector('#console .body, #console'); if (pn) pn.scrollTop = 0; }); } }, selgrp(){ UI.tab = 'prop'; select(S.objs.filter(o => o.grp === id).map(o => o.id)); },
    scene(){ modal(`<h1>Scène en praticables</h1><div class="sub">Une scène rectangulaire en modules de 2 × 1 m, centrée sur l'axe. Les dimensions sont arrondies au module.</div><div class="pf"><label>Largeur (m)</label><input type="number" id="scW" value="8" min="2" max="40" step="2"><label>Profondeur (m)</label><input type="number" id="scD" value="6" min="1" max="30" step="1"><label>Hauteur</label><select id="scH">${[.2, .4, .6, .8, 1, 1.2, 1.4, 1.6].map(v => `<option value="${v}" ${v === .8 ? 'selected' : ''}>${Math.round(v * 100)} cm</option>`).join('')}</select><label>Bord avant, depuis le nez de scène (m, vers le lointain)</label><input type="number" id="scZ" value="0" step="0.5">${dressForm(['avant', 'jardin', 'cour'], [], '')}</div><div class="btns"><button class="b on" data-a="sceneok">Créer</button><button class="b" data-a="close">Annuler</button></div>`); },
    sceneok(){ const W = +$('#scW').value || 8, D = +$('#scD').value || 6, zf = -(+$('#scZ').value || 0), keep = [UI.blkH, UI.blkRot]; UI.blkH = +$('#scH').value || .8; UI.blkRot = false; $('#modal').style.display = 'none';
      const t = blkType('prat'), nx = Math.max(1, Math.round(W / t.size[0])), nz = Math.max(1, Math.round(D / t.size[1])), x0 = -nx * t.size[0] / 2; const dr = dressRead(), out = placeBlock('prat', blkCells(t, [x0, zf], [x0 + nx * t.size[0], zf - nz * t.size[1]])); [UI.blkH, UI.blkRot] = keep; if (out.length && (dr.jupe.length || dr.rail.length || dr.stair)) dressStage(out[0].grp, dr); UI.tab = 'lib'; render(); },
    dress(){ const o = selObjs().find(q => typeOf(q).kind === 'riser' && !q.dress) || S.objs.find(q => typeOf(q).kind === 'riser' && !typeOf(q).shape && !q.dress); if (!o) return toast('Pose d\'abord des praticables.', true); UI.dressGrp = o.grp || '';
      modal(`<h1>Habiller la scène${o.grp ? ' « ' + esc(o.grp) + ' »' : ''}</h1><div class="sub">Jupe, garde-corps et escalier se posent sur le pourtour des praticables${o.grp ? ' du groupe' : ''}. L'habillage précédent de cette scène est remplacé. Le garde-corps s'ouvre devant l'escalier.</div><div class="pf">${dressForm(['avant', 'jardin', 'cour'], ['arriere', 'jardin', 'cour'], '')}</div><div class="btns"><button class="b on" data-a="dressok">Habiller</button><button class="b" data-a="close">Annuler</button></div>`); },
    dressok(){ const dr = dressRead(); $('#modal').style.display = 'none'; dressStage(UI.dressGrp, dr); render(); },
    dup(){ duplicate(1, [.5, 0, 0]); }, del: removeSel, aim(){ UI.aiming = !UI.aiming; UI.placing = null; render(); },
    array(){ modal(`<h1>Répéter en ligne</h1><div class="pf"><label>Copies</label><input type="number" id="arN" value="3" min="1" max="40"><label>Pas X (m)</label><input type="number" id="arX" value="1" step="0.1"><label>Pas Z (m)</label><input type="number" id="arZ" value="0" step="0.1"></div><div class="btns"><button class="b on" data-a="arrayok">Créer</button><button class="b" data-a="close">Annuler</button></div>`); },
    arrayok(){ duplicate(clamp(parseInt($('#arN').value) || 1, 1, 40), [+$('#arX').value || 0, 0, +$('#arZ').value || 0]); $('#modal').style.display = 'none'; },
    live(){ setLive(!A.live); }, black(){ S.black = !S.black; render(); },
    cue(){ goCue(+id); render(); }, auto(){ UI.auto = !UI.auto; UI.autoT = 1e9; if (UI.auto) window.ENG?.clearProg(); if (UI.auto && !A.live) setLive(true); render(); }, cnext(){ if (S.cues.length){ goCue((UI.cue + 1) % S.cues.length); render(); } }, rec(){ recCue(-1); }, upd(){ recCue(UI.cue); }, delcue(){ window.ENG?.del(0, UI.cue); render(); }, pclear(){ pushUndo(0, 'Vider le programmeur'); window.ENG?.clearProg(); touch(); render(); },
    ren: openRename, _x(){ modal(`<h1>Renommer la mémoire</h1><div class="pf"><label>Nom</label><input type="text" id="cueName" value="${esc(S.cues[UI.cue].name)}"></div><div class="btns"><button class="b on" data-a="renok">OK</button><button class="b" data-a="close">Annuler</button></div>`); },
    renok(){ pushUndo(); S.cues[UI.cue].name = $('#cueName').value || S.cues[UI.cue].name; $('#modal').style.display = 'none'; touch(); render(); },
    flib(){ window.FLIB?.toggle(true); },
    import(){ const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = '.gdtf,.d4,.mvr,.json,.zip,.obj,.mtl,.glb,.stl'; i.onchange = () => importFiles([...i.files]); i.click(); },
    autopatch: autoPatch, csave: cloudSave, cload: cloudLoad,
    xproj(){ const d = JSON.parse(serialize()), pd = window.VENUE && VENUE.planData(); if (pd) d.planData = pd; const t = pd ? JSON.stringify(d) : JSON.stringify(d, null, 1); saveFile(slug(S.name) + '.json', t, pd ? undefined : t); },
    xpatch(){ const t = csv(patchRows()); saveFile('patch.csv', '﻿' + t, t); }, xgear(){ const t = csv(gearRows()); saveFile('materiel.csv', '﻿' + t, t); }, xmvr: exportMvr,
    desk(){ window.DESK?.toggle(true); }, ledcfg(){ LEDW.toggle(true, UI.sel[UI.sel.length - 1]); },
    demo(){ pushUndo(0, 'Charger la démo'); loadShow(demoShow()); toast('Projet de démo chargé.'); }, clear(){ window.WS ? WS.run('new') : loadShow({ name: 'Nouveau projet', objs: [], cues: [], follow: false }); },
    close(){ $('#modal').style.display = 'none'; }, copy(){ const ta = $('#modal textarea'); navigator.clipboard?.writeText(ta.value).then(() => toast('Copié.'), () => { ta.select(); toast('Sélectionné : Ctrl+C pour copier.'); }); },
  };
  if (acts[a]) acts[a](); else window.WS?.act(a, id, e, el);
}
const runAct = a => onClick({ target: { closest: s => s === '[data-a]' ? { dataset: { a } } : null } });
function openRename(){ if (!S.cues[UI.cue]) return; modal(`<h1>Renommer la mémoire</h1><div class="pf"><label>Nom</label><input type="text" id="cueName" value="${esc(S.cues[UI.cue].name)}"></div><div class="btns"><button class="b on" data-a="renok">OK</button><button class="b" data-a="close">Annuler</button></div>`); }
function reattach(){ for (const [id, r] of RT) r.boxh.visible = UI.sel.includes(id); const p = byId(UI.sel[UI.sel.length - 1]); if (p && A.mode !== 'walk'){ gizmo.attach(RT.get(p.id).root); setGizmoMode(); } }
const labelEls = new Map();
function drawLabels(){
  const box = $('#labels'), show = (UI.labels || A.mode === 'top') && A.mode !== 'walk' && !A.infoOff;
  if (!show){ if (labelEls.size){ box.innerHTML = ''; labelEls.clear(); } return; }
  const cam = A.camera, seen = new Set();
  for (const o of S.objs){ const t = typeOf(o); if (t.cat === 'str') continue; const r = RT.get(o.id); if (!r) continue;
    _v.copy(r.root.position); if (A.isClipped(_v) && A.mode !== 'top') continue; _v.project(cam); if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) continue;
    let el = labelEls.get(o.id); if (!el){ el = document.createElement('span'); box.appendChild(el); labelEls.set(o.id, el); }
    const txt = t.cat === 'lum' && UI.labels ? `${o.n} · ${addrStr(o)}` : `${o.n}`; if (el.textContent !== txt) el.textContent = txt;
    el.className = UI.sel.includes(o.id) ? 'sel' : ''; el.style.left = ((_v.x + 1) / 2 * VW()) + 'px'; el.style.top = ((1 - _v.y) / 2 * VH() - 14) + 'px'; seen.add(o.id); }
  for (const [id, el] of labelEls) if (!seen.has(id)){ el.remove(); labelEls.delete(id); }
}

// ============================================================ projet de démonstration
function bandShow(big){
  const objs = [], lin = (n, w) => Array.from({ length: n }, (_, i) => n === 1 ? 0 : -w + 2 * w * i / (n - 1)); let n = 1, addr = 1;
  const L = (type, grp, name, xs, y, z, hang, p) => xs.forEach((x, i) => { const t = LIB.find(q => q.id === type), o = { ...defaults(t), ...p, pos: [Math.round(x * 100) / 100, y, z], hang, grp, name: `${name} ${i + 1}`, n: n++, uni: 1, addr }; addr += t.modes[0][1]; objs.push(o); });
  L('par-led', 'Contres', 'Contre', lin(8, 6.3), 5.97, -3.84, 'perche', { dim: .8, color: '#2a4dff', pan: 0, tilt: 32 });
  L('beam', 'Beams', 'Beam', lin(6, 5.6), 5.97, -3.1, 'perche', { dim: .9, color: '#ffffff', zoom: 4, pan: 0, tilt: 22, fx: 'balayage', speed: .6 });
  L('wash', 'Wash', 'Wash', lin(6, 6), 5.97, -1.65, 'perche', { dim: .7, color: '#ff9a3c', zoom: 28, pan: 180, tilt: 14 });
  L('decoupe', 'Face', 'Face', [-4.6, -1.6, 1.6, 4.6], 6.68, 2.05, 'fixe', { dim: .55, color: '#fff0d8', zoom: 24, pan: 180, tilt: 44 });
  const add = (type, name, pos, hang, p, num) => { const t = LIB.find(q => q.id === type); objs.push({ ...defaults(t), ...p, name, pos, hang, n: num }); };
  add('la6', 'Line array jardin', [-7.0, 6.68, 3.15], 'fixe', { pan: 6, tilt: 78 }, 601); add('la6', 'Line array cour', [7.0, 6.68, 3.15], 'fixe', { pan: -6, tilt: 78 }, 602);
  add('sub218', 'Sub jardin', [-6.6, 0, -.6], null, {}, 603); add('sub218', 'Sub cour', [6.6, 0, -.6], null, {}, 604);
  [-3.2, -1.1, 1.1, 3.2].forEach((x, i) => add('wedge', 'Retour ' + (i + 1), [x, 0, -.9], null, { pan: 180 }, 605 + i));
  add('ecran', 'Écran fond de scène', [0, 1.3, -4.25], null, { yaw: 0 }, 901);
  add('vp20', 'VP fond de scène', [0, 6.68, 8.75], 'fixe', { pan: 180, tilt: 75.8, throw: 2.3, content: 'mire', on: true }, 501);
  add('prat', 'Praticable batterie', [0, 0, -3.4], null, {}, 902); add('prat', 'Praticable batterie', [0, 0, -2.4], null, {}, 903);
  [[0, -2.9, .4], [-2.6, -1.8, 0], [2.6, -1.8, 0], [0, -1.2, 0]].forEach(([x, z, y], i) => add(['assis', 'guitariste', 'guitariste', 'chanteur'][i], ['Batteur', 'Guitariste', 'Bassiste', 'Chant'][i], [x, y, z], null, {}, 910 + i));
  add('batterie', 'Batterie', [0, .4, -2.25], null, {}, 920); add('ampli-g', 'Ampli guitare', [-3.3, 0, -2.7], null, { yaw: 15 }, 921); add('ampli-b', 'Ampli basse', [3.3, 0, -2.7], null, { yaw: -15 }, 922);
  add('mic-perche', 'Micro chœur jardin', [-2.6, 0, -1.25], null, {}, 923); add('mic-perche', 'Micro chœur cour', [2.6, 0, -1.25], null, {}, 924); add('mic-bas', 'Micro ampli guitare', [-3.15, 0, -2.3], null, { yaw: 195 }, 925); add('clavier', 'Clavier', [-1.5, 0, -3.1], null, {}, 926); add('guitare-st', 'Guitare de rechange', [3.9, 0, -1.9], null, {}, 927);
  const G = g => objs.filter(o => o.grp === g), cue = (name, def, haze, fade = 1.5, hold = 6) => { const s = {}; for (const [g, p] of Object.entries(def)) for (const o of G(g)) s[o.id] = { ...Object.fromEntries(LKEYS.map(k => [k, o[k]])), ...p }; return { name, fade, hold, haze, s }; };
  const cues = [
    cue('Intro', { Contres: { dim: .6, color: '#2a4dff', fx: 'vague', speed: .3 }, Beams: { dim: .45, color: '#bcd0ff', tilt: 8, fx: 'cercle', speed: .12 }, Wash: { dim: .15, color: '#1b2f9c', tilt: 20, fx: 'fixe' }, Face: { dim: 0 } }, .8, 4, 9),
    cue('Couplet 1', { Contres: { dim: .5, color: '#ffb347', fx: 'fixe', speed: .3 }, Beams: { dim: 0, color: '#ffd9a0', tilt: 18, fx: 'fixe' }, Wash: { dim: .7, color: '#ff9a3c', tilt: 14, fx: 'fixe' }, Face: { dim: .55 } }, .45, 3, 10),
    cue('Pré-refrain', { Contres: { dim: .75, color: '#ff3d8b', fx: 'vague', speed: .8 }, Beams: { dim: .6, color: '#ff9a3c', tilt: 22, fx: 'balayage', speed: .35 }, Wash: { dim: .6, color: '#ff4a2b', tilt: 18, fx: 'fixe' }, Face: { dim: .5 } }, .55, 2.5, 6),
    cue('Refrain', { Contres: { dim: 1, color: '#ff1e1e', fx: 'vague', speed: 1.4 }, Beams: { dim: 1, color: '#ffffff', tilt: 34, fx: 'balayage', speed: 1 }, Wash: { dim: .8, color: '#ff2bd6', tilt: 24, fx: 'arc', speed: .4 }, Face: { dim: .6 } }, .65, .8, 10),
    cue('Couplet 2', { Contres: { dim: .5, color: '#19d3c5', fx: 'fixe', speed: .3 }, Beams: { dim: .4, color: '#00b7ff', tilt: 46, fx: 'fixe', speed: .3 }, Wash: { dim: .6, color: '#0f8f9c', tilt: 12, fx: 'fixe' }, Face: { dim: .5 } }, .5, 3, 9),
    cue('Pont', { Contres: { dim: .4, color: '#0a3cff', fx: 'fixe' }, Beams: { dim: .3, color: '#8a2bff', tilt: 10, fx: 'cercle', speed: .2 }, Wash: { dim: .3, color: '#2a4dff', tilt: 30, fx: 'fixe' }, Face: { dim: .3 } }, .7, 5, 10),
    cue('Solo', { Contres: { dim: 1, color: '#ffb347', fx: 'vague', speed: 2 }, Beams: { dim: 1, color: '#ffd27a', tilt: 52, fx: 'cercle', speed: 1.1 }, Wash: { dim: .7, color: '#ff2a1a', tilt: 16, fx: 'fixe' }, Face: { dim: .7 } }, .7, 1.2, 8),
    cue('Final', { Contres: { dim: 1, color: '#ffffff', fx: 'arc', speed: 1 }, Beams: { dim: 1, color: '#ffffff', tilt: 38, fx: 'balayage', speed: 1.6 }, Wash: { dim: 1, color: '#ff2bd6', tilt: 26, fx: 'arc', speed: .9 }, Face: { dim: .7 } }, .8, .6, 9),
    cue('Plein feu', { Contres: { dim: 1, color: '#ffffff', fx: 'fixe' }, Beams: { dim: 1, color: '#ffffff', tilt: 28, fx: 'fixe' }, Wash: { dim: 1, color: '#ffffff', tilt: 14, fx: 'fixe' }, Face: { dim: 1 } }, .5, 2, 5),
    cue('Noir', { Contres: { dim: 0, fx: 'fixe' }, Beams: { dim: 0, fx: 'fixe' }, Wash: { dim: 0, fx: 'fixe' }, Face: { dim: 0 } }, .5, 4, 3),
  ];
  if (big){ L('blinder', 'Blinders', 'Blinder', lin(4, 5.4), 5.97, -.92, 'perche', { dim: 0, color: '#ffd9a0', pan: 0, tilt: 62 }); L('beam', 'Sol', 'Beam sol', lin(4, 4.2), 0, -4.1, null, { dim: .8, color: '#ffffff', zoom: 4, pan: 0, tilt: 150, fx: 'cercle', speed: .5 });
    const on = { Refrain: [1, .9], Solo: [.5, .9], Final: [1, 1], 'Plein feu': [.6, .6] }; for (const c of cues){ const [b, f] = on[c.name] || [0, c.name === 'Noir' ? 0 : .35]; for (const o of objs){ if (o.grp === 'Blinders') c.s[o.id] = { ...Object.fromEntries(LKEYS.map(k => [k, o[k]])), dim: b, fx: c.name === 'Final' ? 'chenillard' : 'fixe', speed: 1.2 }; if (o.grp === 'Sol') c.s[o.id] = { ...Object.fromEntries(LKEYS.map(k => [k, o[k]])), dim: f, color: c.s[objs.find(q => q.grp === 'Beams').id].color, fx: 'cercle', speed: c.name === 'Final' ? 1.3 : .4 }; } c.haze = Math.min(1, (c.haze || .5) + .15); } }
  return { v: 2, name: big ? 'Démo — concert debout' : 'Démo — concert assis-debout', objs, cues, lib: [], master: 1, haze: big ? .7 : .5, follow: true };
}
// ---- éclairage décoratif de la salle : murs en bois éclairés du sol, charpente éclairée depuis les passerelles.
// Les couleurs de chaque mémoire sont déduites de celles du plateau, pour que la salle prolonge l'ambiance de la scène.
function addDeco(show, kind){
  const TH = { oneman: ['#5a2a9f', '#ffb066'], assisdb: ['#2a4dff', '#ff9a3c'], debout: ['#2a4dff', '#ff2bd6'], danse: ['#1e3cff', '#7fa8ff'], electro: ['#b04bff', '#2affd0'], diner: ['#ffb066', '#5b14f0'] }[kind] || ['#5b14f0', '#2affd0'];
  const objs = show.objs, par = LIB.find(q => q.id === 'par-zoom'), wash = LIB.find(q => q.id === 'wash'); let uni = Math.max(1, ...objs.map(o => o.uni || 1)) + 1, addr = 1, n = Math.max(0, ...objs.filter(o => o.n < 500).map(o => o.n)) + 1; const made = [];
  const put = (t, grp, name, pos, hang, p) => { const o = { ...defaults(t), ...p, pos, hang, grp, name, n: n++, uni, addr, fx: 'fixe', speed: .3 }; addr += t.modes[0][1]; objs.push(o); made.push(o); };
  [8.2, 11.7, 15.2, 18.6].forEach((z, i) => { for (const sx of [-1, 1]) put(par, 'Déco murs', `Mur ${sx < 0 ? 'jardin' : 'cour'} ${i + 1}`, [sx * 8.72, 0, z], null, { dim: .5, color: TH[0], zoom: 50, pan: sx * 90, tilt: 166 }); });
  [[-5.6, 6.2], [5.6, 6.2], [-5.6, 13.6], [5.6, 13.6]].forEach(([x, z], i) => put(wash, 'Déco charpente', `Charpente ${i + 1}`, [x, 7.0, z], 'fixe', { dim: .4, color: TH[1], zoom: 50, pan: 0, tilt: 178 }));
  const sat = hex => { _c.set(hex); const h = {}; _c.getHSL(h); const mx = Math.max(_c.r, _c.g, _c.b), mn = Math.min(_c.r, _c.g, _c.b); h.s = mx > 0 ? (mx - mn) / mx : 0; return h; }, quiet = /^(noir|sortie)$/i, strong = /drop|final|refrain|acid|solo/i;
  for (const c of show.cues){
    const cand = Object.entries(c.s).map(([id, st]) => ({ st, o: objs.find(q => q.id === id) })).filter(e => e.o && e.st.dim > .2 && e.st.fx !== 'arc' && sat(e.st.color || '#fff').s > .6).sort((a, b) => b.st.dim - a.st.dim);
    let c1 = cand[0]?.st.color || TH[0], c2 = (cand.find(e => Math.abs(sat(e.st.color).h - sat(c1).h) > .08) || {}).st?.color || TH[1];
    const k = quiet.test(c.name) ? .12 : strong.test(c.name) ? 1 : .7, fx = kind === 'electro' && strong.test(c.name) ? 'pulse' : 'fixe';
    for (const o of made) c.s[o.id] = { ...Object.fromEntries(LKEYS.map(q => [q, o[q]])), dim: (o.grp === 'Déco murs' ? .85 : .7) * k, color: o.grp === 'Déco murs' ? c1 : c2, fx, speed: fx === 'pulse' ? 1 : .3 };
  }
  if (show.cues[0]) for (const o of made) Object.assign(o, show.cues[0].s[o.id]);
  // matériel réel du catalogue et éléments dessinés : retours de scène, console de retours, boîte de direct, mur de décor en matière
  { const T = id => LIB.find(q => q.id === id), x15 = T('c-l-acoustics-x15-hiq'), cl5 = T('c-yamaha-cl5'), di = T('c-radial-j48'), sm58 = T('c-shure-sm58'), extra = (t, name, pos, p, num) => { if (t) objs.push({ ...defaults(t), ...p, type: t.id, name, pos, hang: null, n: num }); };
    if (x15) for (const o of objs) if (o.type === 'wedge'){ o.type = x15.id; o.name = (o.name || 'Retour') + ' (X15 HiQ)'; }
    if (kind === 'assisdb' || kind === 'debout'){ extra(cl5, 'Console retours (CL5)', [-6.4, 0, -1.6], { yaw: 90 }, 950); const ab = objs.find(o => o.type === 'ampli-b'); if (ab) extra(di, 'Boîte de direct basse (J48)', [ab.pos[0] + .55, 0, ab.pos[2] + .35], {}, 951); }
    if (kind === 'oneman'){ extra(sm58, 'Micro main (SM58)', [1.2, .78, -2.2], {}, 952); show.shapes = [{ id: 'demo-mur', k: 'poly', p: [[-2.4, -3.05], [2.4, -3.05]], closed: false, h: 2.6, y: 0, col: '#ffffff', mat: 'brique', name: 'Mur de briques (décor)' }, { id: 'demo-estrade', k: 'poly', p: [[-1.6, -2.9], [1.6, -2.9], [1.6, -.6], [-1.6, -.6]], closed: true, rect: true, h: .02, y: 0, col: '#ffffff', mat: 'chene', name: 'Parquet (décor)' }]; }
    const used = new Set(objs.map(o => o.type)); show.lib = [...(show.lib || []), ...[x15, cl5, di, sm58].filter(t => t && used.has(t.id) && !LIB.some(q => q.id === t.id) && !(show.lib || []).some(q => q.id === t.id))]; }
  return show;
}
// ---- une scène et un plan de feu cohérents pour chaque configuration de la salle
function sceneShow(kind){
  if (kind === 'assisdb') return addDeco(bandShow(false), kind); if (kind === 'debout') return addDeco(bandShow(true), kind);
  const objs = [], lin = (n, w) => Array.from({ length: n }, (_, i) => n === 1 ? 0 : -w + 2 * w * i / (n - 1)); let n = 1, addr = 1, uni = 1;
  const L = (type, grp, name, xs, y, z, hang, p) => xs.forEach((x, i) => { const t = LIB.find(q => q.id === type), ch = t.modes[0][1]; if (addr + ch > 513){ uni++; addr = 1; } const P = typeof p === 'function' ? p(x, i) : p, o = { ...defaults(t), ...P, pos: [Math.round(x * 100) / 100, y, z], hang, grp, name: xs.length > 1 ? `${name} ${i + 1}` : name, n: n++, uni, addr }; addr += ch; objs.push(o); });
  const add = (type, name, pos, hang, p, num) => { const t = LIB.find(q => q.id === type); objs.push({ ...defaults(t), ...p, name, pos, hang, n: num }); };
  const G = g => objs.filter(o => o.grp === g), cues = [], cue = (name, def, haze, fade = 2, hold = 8) => { const s = {}; for (const o of objs) if (o.grp) s[o.id] = { ...Object.fromEntries(LKEYS.map(k => [k, o[k]])), dim: 0, fx: 'fixe', ...(def[o.grp] || {}) }; cues.push({ name, fade, hold, haze, s }); };
  const first = () => { for (const o of objs){ const st = cues[0].s[o.id]; if (st) Object.assign(o, st); } };
  let name, haze = .3, audio;
  if (kind === 'oneman'){
    name = 'Démo — one man show'; haze = .12;
    L('decoupe', 'Face', 'Face', [-3.4, -1.15, 1.15, 3.4], 6.68, 2.05, 'fixe', x => ({ dim: .85, color: '#ffe9cf', zoom: 24, pan: 180 + Math.atan2(x * .8, 3.65) * 57.3, tilt: 38 }));
    L('decoupe', 'Douche', 'Douche', [0], 5.97, -1.65, 'perche', { dim: .5, color: '#fff3e2', zoom: 26, pan: 0, tilt: 2 });
    L('par-led', 'Contres', 'Contre', lin(6, 4.6), 5.97, -3.84, 'perche', x => ({ dim: .45, color: '#ffb066', pan: -x * 2, tilt: 30 }));
    L('par-led', 'Rideau', 'Rideau', lin(6, 6), 5.97, -3.11, 'perche', { dim: .25, color: '#3a1f8f', pan: 180, tilt: 38 });
    L('poursuite', 'Poursuite', 'Poursuite', [0], 5.7, 19.4, null, { dim: 0, color: '#ffffff', zoom: 8, pan: 180, tilt: 78 });
    add('la6', 'Line array jardin', [-7.0, 6.68, 3.15], 'fixe', { pan: 6, tilt: 78 }, 601); add('la6', 'Line array cour', [7.0, 6.68, 3.15], 'fixe', { pan: -6, tilt: 78 }, 602); add('wedge', 'Retour', [1.6, 0, -.5], null, { pan: 200 }, 603);
    add('chanteur', 'Humoriste', [0, 0, -1.6], null, { yaw: 0 }, 910); add('mic-droit', 'Micro de secours', [-1.3, 0, -1.9], null, {}, 911); add('pupitre', 'Tabouret et notes', [1.2, 0, -2.2], null, { yaw: -20 }, 912);
    cue('Entrée public', { Contres: { dim: .2, color: '#2a3dff' }, Rideau: { dim: .35, color: '#3a1f8f' } }, .12, 3, 8);
    cue('Plein feu', { Face: { dim: .5 }, Douche: { dim: .3 }, Contres: { dim: .5, color: '#ffb066' }, Rideau: { dim: .2, color: '#5a2a9f' } }, .12, 1.5, 12);
    cue('Sketch intime', { Face: { dim: .15 }, Douche: { dim: .55 }, Poursuite: { dim: .5 }, Contres: { dim: .3, color: '#2a3dff' }, Rideau: { dim: .1, color: '#1b1f6f' } }, .15, 3, 10);
    cue('Chute', { Face: { dim: .08 }, Douche: { dim: .75 }, Rideau: { dim: .5, color: '#ff2a4a' } }, .15, .3, 5);
    cue('Saluts', { Face: { dim: .65 }, Douche: { dim: .4 }, Poursuite: { dim: .4 }, Contres: { dim: .9, color: '#ffd9a0' }, Rideau: { dim: .5, color: '#ff8a3c' } }, .2, 1, 8);
    cue('Noir', {}, .12, 2, 3);
  } else if (kind === 'danse'){
    name = 'Démo — spectacle de danse'; haze = .22;
    for (const [k, z] of [[0, -7.2], [1, -4.6], [2, -2.0]]) for (const sx of [-1, 1]){ const side = sx < 0 ? 'J' : 'C', pan = sx < 0 ? 90 : -90;
      L('decoupe-l', 'Latéraux bas', `Bas ${side}${k + 1}`, [sx * 7.3], .35, z, null, { dim: .7, color: '#cfe0ff', zoom: 36, pan, tilt: 90 }); L('decoupe-l', 'Latéraux milieu', `Milieu ${side}${k + 1}`, [sx * 7.3], 1.15, z, null, { dim: .7, color: '#ffffff', zoom: 36, pan, tilt: 92 }); L('decoupe-l', 'Latéraux haut', `Haut ${side}${k + 1}`, [sx * 7.3], 1.95, z, null, { dim: .6, color: '#ffe9cf', zoom: 34, pan, tilt: 96 }); }
    L('wash', 'Contres', 'Contre', lin(6, 5.6), 5.97, -6.05, 'perche', { dim: .5, color: '#9fc0ff', zoom: 40, pan: 0, tilt: 24 });
    L('par-zoom', 'Cyclo', 'Cyclo', lin(8, 6.2), 5.97, -8.24, 'perche', { dim: .8, color: '#1e3cff', zoom: 50, pan: 180, tilt: 30 });
    L('decoupe', 'Face', 'Face', [-3.2, 3.2], 6.68, 2.05, 'fixe', x => ({ dim: .15, color: '#ffe9cf', zoom: 28, pan: 180 - x * 3, tilt: 46 }));
    add('ecran', 'Cyclorama', [0, .1, -9.25], null, { yaw: 0, size: [15, 6.5] }, 901); add('la6', 'Line array jardin', [-7.0, 6.68, 3.15], 'fixe', { pan: 6, tilt: 78 }, 601); add('la6', 'Line array cour', [7.0, 6.68, 3.15], 'fixe', { pan: -6, tilt: 78 }, 602);
    [['perso-f', -2.2, -3.4, 30], ['perso', 0.4, -5.2, -15], ['perso-f', 2.6, -2.6, 160], ['perso', -3.8, -6.2, 80], ['perso-f', 4.2, -5.6, -120]].forEach(([t, x, z, yaw], i) => add(t, 'Danseur·se ' + (i + 1), [x, 0, z], null, { yaw }, 910 + i));
    const lat = (dim, c1, c2, c3) => ({ 'Latéraux bas': { dim, color: c1 }, 'Latéraux milieu': { dim, color: c2 }, 'Latéraux haut': { dim: dim * .85, color: c3 } });
    cue('Froid', { ...lat(.75, '#bcd4ff', '#e6eeff', '#cfe0ff'), Contres: { dim: .4, color: '#7fa8ff' }, Cyclo: { dim: .7, color: '#1e3cff' }, Face: { dim: .1 } }, .22, 4, 10);
    cue('Chaud', { ...lat(.8, '#ffb878', '#ffe2c0', '#ffd0a0'), Contres: { dim: .5, color: '#ff9a4a' }, Cyclo: { dim: .8, color: '#ff4a1e' }, Face: { dim: .15 } }, .22, 5, 10);
    cue('Silhouettes', { Cyclo: { dim: 1, color: '#ff2a8a' }, Contres: { dim: .12, color: '#4a2aff' } }, .25, 3, 8);
    cue('Couloirs', { 'Latéraux bas': { dim: 1, color: '#9fffe6' }, Contres: { dim: .25, color: '#2a4dff' }, Cyclo: { dim: .25, color: '#0a1a7f' } }, .3, 2.5, 9);
    cue('Douches', { Contres: { dim: .9, color: '#ffffff', fx: 'pulse', speed: .25 }, 'Latéraux haut': { dim: .3, color: '#cfe0ff' }, Cyclo: { dim: .35, color: '#3a1f8f' } }, .3, 4, 9);
    cue('Plein feu', { ...lat(.9, '#ffffff', '#ffffff', '#fff3e2'), Contres: { dim: .8, color: '#ffffff' }, Cyclo: { dim: .9, color: '#6fa8ff' }, Face: { dim: .45 } }, .2, 2, 6);
    cue('Noir', {}, .2, 4, 3);
  } else if (kind === 'electro'){
    name = 'Démo — festival électro'; haze = .9;
    L('beam', 'Beams', 'Beam', lin(8, 6.4), 5.97, -6.05, 'perche', { dim: .9, color: '#ffffff', zoom: 3, pan: 0, tilt: 30, fx: 'balayage', speed: .8 });
    L('beam', 'Beams avant', 'Beam avant', lin(6, 5.6), 5.97, -2.38, 'perche', { dim: .8, color: '#2affd0', zoom: 3, pan: 0, tilt: 55, fx: 'huit', speed: .7 });
    L('wash', 'Wash', 'Wash', lin(6, 6), 5.97, -4.56, 'perche', { dim: .8, color: '#b04bff', zoom: 30, pan: 0, tilt: 26 });
    L('blinder', 'Blinders', 'Blinder', lin(6, 6.2), 5.97, -.92, 'perche', { dim: 0, color: '#fff0d8', pan: 0, tilt: 60 });
    L('barre', 'Barres', 'Barre LED', lin(8, 3.9), .82, -6.95, null, { dim: .9, color: '#2affd0', pan: 0, tilt: 100, fx: 'chenillard', speed: 1.2 });
    L('par-led', 'Sol', 'PAR sol', lin(6, 5.6), 0, -5.7, null, { dim: .7, color: '#5b14f0', pan: 0, tilt: 150 });
    add('mur-led', 'Mur LED', [0, 1.1, -9.7], null, { yaw: 0, w: 1630, led: { panel: '50x50', cols: 22, rows: 9, pitch: 3.9, bright: .85, curve: 0, content: 'spectre', color: '#5b14f0', color2: '#2affd0', speed: 1, glow: true } }, 901);
    add('la8', 'Line array jardin', [-7.0, 6.68, 3.15], 'fixe', { pan: 6, tilt: 76 }, 601); add('la8', 'Line array cour', [7.0, 6.68, 3.15], 'fixe', { pan: -6, tilt: 76 }, 602); [-6.9, -5.7, 5.7, 6.9].forEach((x, i) => add('sub218', 'Sub ' + (i + 1), [x, 0, -.7], null, {}, 603 + i));
    add('perso', 'DJ', [0, .8, -7.9], null, { yaw: 0 }, 910); add('wedge', 'Retour DJ jardin', [-1.9, .8, -7.6], null, { pan: 90 }, 607); add('wedge', 'Retour DJ cour', [1.9, .8, -7.6], null, { pan: -90 }, 608);
    cue('Warm-up', { Wash: { dim: .5, color: '#5b14f0', fx: 'pulse', speed: .3 }, Sol: { dim: .5, color: '#2a4dff' }, Barres: { dim: .4, color: '#b04bff', fx: 'vague', speed: .4 }, Beams: { dim: .3, color: '#7c8bff', tilt: 14, fx: 'cercle', speed: .15 } }, .8, 4, 9);
    cue('Montée', { Wash: { dim: .7, color: '#2affd0', fx: 'pulse', speed: 1 }, Sol: { dim: .7, color: '#2affd0' }, Barres: { dim: .8, color: '#ffffff', fx: 'chenillard', speed: 1.6 }, Beams: { dim: .8, color: '#ffffff', tilt: 60, fx: 'cercle', speed: .5 }, 'Beams avant': { dim: .6, color: '#2affd0', tilt: 70, fx: 'huit', speed: .6 } }, .9, 6, 8);
    cue('Drop', { Wash: { dim: 1, color: '#ff2bd6', fx: 'arc', speed: 1.2 }, Sol: { dim: 1, color: '#ffffff', fx: 'strobe', speed: .5 }, Barres: { dim: 1, color: '#ffffff', fx: 'chenillard', speed: 2 }, Beams: { dim: 1, color: '#ffffff', tilt: 36, fx: 'balayage', speed: 1.8 }, 'Beams avant': { dim: 1, color: '#2affd0', tilt: 48, fx: 'huit', speed: 1.6 }, Blinders: { dim: 1, fx: 'chenillard', speed: 2 } }, 1, .15, 10);
    cue('Acid', { Wash: { dim: .8, color: '#aaff1e', fx: 'scintille', speed: 1 }, Sol: { dim: .8, color: '#aaff1e' }, Barres: { dim: 1, color: '#ffe14a', fx: 'chenillard', speed: 1.4 }, Beams: { dim: .9, color: '#aaff1e', tilt: 44, fx: 'huit', speed: 1.2 }, 'Beams avant': { dim: .8, color: '#ffe14a', tilt: 58, fx: 'balayage', speed: 1.1 } }, 1, 1, 9);
    cue('Break', { Wash: { dim: .35, color: '#b04bff', fx: 'pulse', speed: .2 }, Barres: { dim: .25, color: '#5b14f0', fx: 'scintille', speed: .4 }, Beams: { dim: .5, color: '#b78bff', tilt: 8, fx: 'cercle', speed: .1 } }, .85, 5, 8);
    cue('Noir', {}, .7, 3, 3);
    audio = { groups: { Beams: { mode: 'tempo', amt: .7 }, Wash: { mode: 'bass', amt: .7 }, Sol: { mode: 'flash', amt: .8 }, Barres: { mode: 'chase', amt: .9 } }, sens: 1, bpm: 128 };
  } else {                                                                                   // dîner spectacle : scène centrale dans la fosse
    name = 'Démo — dîner spectacle'; haze = .2;
    L('decoupe', 'Scène centrale', 'Scène', lin(6, 3.4), 5.97, -.19, 'perche', x => ({ dim: 0, color: '#ffe9cf', zoom: 26, pan: -x * 4, tilt: 30 }));
    L('wash', 'Douches', 'Douche', [-2.2, 0, 2.2, -2.2, 0, 2.2], 6.68, 2.6, 'fixe', (x, i) => ({ dim: .3, color: '#ffb066', zoom: 34, pan: 0, tilt: i < 3 ? 4 : 14 }));
    for (const z of [8.9, 12.2, 15.6]) L('par-zoom', 'Tables', `Tables ${z > 15 ? 'fond' : z > 12 ? 'milieu' : 'devant'}`, [-6, -2, 2, 6], 6.68, z, 'fixe', { dim: .55, color: '#ffc890', zoom: 46, pan: 0, tilt: 2 });
    L('par-zoom', 'Tables', 'Tables scène', [-5.5, -1.8, 1.8, 5.5], 5.97, -3.84, 'perche', { dim: .55, color: '#ffc890', zoom: 50, pan: 0, tilt: 4 });
    L('par-led', 'Rideau', 'Rideau', lin(8, 6.4), 5.97, -6.05, 'perche', { dim: .6, color: '#5b14f0', pan: 180, tilt: 30 });
    [[-7.2, 2.2, 20], [7.2, 2.2, -20], [-7.2, 12, 10], [7.2, 12, -10]].forEach(([x, z, pan], i) => add('pt15', 'Enceinte ' + (i + 1), [x, 6.68, z], 'fixe', { pan: x < 0 ? 90 - pan : -90 - pan, tilt: 60 }, 601 + i));
    add('piano', 'Piano', [-1.3, .3, 3.7], null, { yaw: 115 }, 901); add('chanteur', 'Chanteuse', [.9, .3, 3.2], null, { yaw: 0 }, 910); add('guitariste', 'Contrebasse / guitare', [2.3, .3, 2.2], null, { yaw: -25 }, 911); add('assis', 'Pianiste', [-1.9, .3, 2.6], null, { yaw: 100 }, 912); add('mic-droit', 'Micro chant', [.9, .3, 3.75], null, {}, 913);
    cue('Accueil', { Tables: { dim: .65, color: '#ffc890' }, Rideau: { dim: .6, color: '#5b14f0' }, Douches: { dim: .25, color: '#b04bff' } }, .2, 4, 10);
    cue('Dîner', { Tables: { dim: .45, color: '#ffb878' }, Rideau: { dim: .4, color: '#1e3cff' }, Douches: { dim: .2, color: '#ffb066' }, 'Scène centrale': { dim: .15 } }, .2, 6, 12);
    cue('Numéro', { Tables: { dim: .12, color: '#ff9a5a' }, Rideau: { dim: .7, color: '#b04bff' }, Douches: { dim: .7, color: '#ffb066' }, 'Scène centrale': { dim: .9 } }, .3, 3, 12);
    cue('Slow', { Tables: { dim: .08, color: '#ff7a5a' }, Rideau: { dim: .5, color: '#ff2a8a', fx: 'pulse', speed: .15 }, Douches: { dim: .6, color: '#ff4a9a' }, 'Scène centrale': { dim: .55, color: '#ffd9c0' } }, .35, 5, 10);
    cue('Final', { Tables: { dim: .5, color: '#ffd9a0' }, Rideau: { dim: 1, color: '#2affd0', fx: 'arc', speed: .5 }, Douches: { dim: 1, color: '#ffffff', fx: 'cercle', speed: .5 }, 'Scène centrale': { dim: 1 } }, .4, 1.5, 9);
    cue('Sortie', { Tables: { dim: .8, color: '#ffe2c0' }, Rideau: { dim: .3, color: '#5b14f0' } }, .2, 5, 6);
  }
  first();
  return addDeco({ v: 2, name, objs, cues, lib: [], master: 1, haze, follow: true, ...(audio ? { audio } : {}) }, kind);
}
const demoShow = () => sceneShow(A.config || 'oneman');
// changement de configuration par l'utilisateur : la scène et la lumière suivent, sauf si on a décoché l'option
function followConfig(id){ if (S.follow === false || A.venue.type === 'param') return; const d = sceneShow(id); loadShow(d); A.setCurtainPerche(0, id === 'danse' ? 0 : 7); if (A.live) goCue(0); toast('Scène et lumière adaptées : ' + d.name.replace('Démo — ', '') + '. Ctrl+Z pour revenir à la précédente.'); }

// ============================================================ démarrage
export function init(APP){
  A = APP; $ = A.$; scene = A.scene; fmt = A.fmt; A.layHid = layHid; mats();
  for (const c of A.store.get('userCat') || []){ const t = c && refType(c, true); if (t && !LIB.some(x => x.id === t.id)) LIB.push(t); }          // les modèles de l'utilisateur, gardés d'un projet à l'autre
  { let qt = 0; document.addEventListener('input', e => { if (e.target.id !== 'libQ') return; UI.libQ = e.target.value; clearTimeout(qt); qt = setTimeout(() => { render(); const back = () => { const q = [...document.querySelectorAll('#libQ')].find(x => x.offsetParent); if (q && document.activeElement !== q){ q.focus(); const n = q.value.length; try { q.setSelectionRange(n, n); } catch (_){ } } }; back(); setTimeout(back, 60); setTimeout(back, 220); }, 160); }); }
  // après une saisie, le panneau est redessiné : le champ où l'on vient d'arriver (Tab, clic) garde la main
  A.keepFocus = fn => setTimeout(() => { const a = document.activeElement, host = a && a.closest && a.closest('#console,#drawer,.drp'), d = a && a.dataset, sig = host && d && Object.keys(d).length ? a.tagName + Object.entries(d).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${CSS.escape(v)}"]`).join('') : null;
    fn(); if (sig && !document.contains(a)){ const el = host.querySelector(sig); if (el){ el.focus({ preventScroll: true }); if (el.select && /text|number|search/.test(el.type)) el.select(); } } }, 0);
  LEDW = createLed(A, new Proxy({}, { get: (_, k) => window.STAGE[k] }));
  gizmo = new TransformControls(A.camera, A.canvas); gizmo.setSize(.8); gizmo.setTranslationSnap(.05); gizmo.setRotationSnap(5 * D2R);
  gizmoHelper = gizmo.getHelper ? gizmo.getHelper() : gizmo; gizmoHelper.userData.noAO = true; scene.add(gizmoHelper);
  let start = null;
  gizmo.addEventListener('dragging-changed', e => {
    A.orbit.enabled = !e.value && A.mode === 'orbit'; A.orthoCtl.enabled = !e.value && (A.mode === 'top' || A.mode === 'side');
    if (e.value){ pushUndo(0, gizmo.mode === 'rotate' ? 'Rotation' : 'Déplacement'); start = gizmo.object.position.clone(); start.yaw = Object.fromEntries(selObjs().map(o => [o.id, o.yaw || 0])); start.mag = selObjs().map(o => [o, magState(o)]); }
    else { if (start && start.mag && gizmo.mode !== 'rotate'){ magnet(start.mag, .6, false, true); magSay(start.mag); } touch(); refreshProps(); select(UI.sel); }
  });
  gizmo.addEventListener('objectChange', () => {
    const sel = selObjs(), p = sel[sel.length - 1]; if (!p || !start) return; const root = gizmo.object;
    const dl = root.position.clone().sub(start); start.copy(root.position);
    for (const o of sel){ o.pos = [o.pos[0] + dl.x, o.pos[1] + dl.y, o.pos[2] + dl.z].map(v => Math.round(v * 1000) / 1000); RT.get(o.id).dirty = true; }
  });
  // anneau de rotation, affiché en même temps que les flèches : il tourne l'objet (structures) ou son pan (projecteurs, enceintes, vidéoprojecteurs)
  gizmoR = new TransformControls(A.camera, A.canvas); gizmoR.setMode('rotate'); gizmoR.showX = gizmoR.showZ = false; gizmoR.setSize(1.0); gizmoR.setRotationSnap(5 * D2R);
  { const hR = gizmoR.getHelper ? gizmoR.getHelper() : gizmoR; hR.userData.noAO = true; scene.add(hR); }
  let rs0 = null, rSkipS = false; const wrap = v => Math.round(((v + 540) % 360 + 360) % 360 - 180);
  gizmoR.addEventListener('dragging-changed', e => { if (e.value && gizmo.dragging){ rSkipS = true; return; } if (rSkipS){ if (!e.value) rSkipS = false; return; }          /* une flèche déjà tirée a la priorité sur l'anneau qui passe derrière elle */ A.orbit.enabled = !e.value && A.mode === 'orbit'; A.orthoCtl.enabled = !e.value && (A.mode === 'top' || A.mode === 'side');
    if (e.value){ pushUndo(0, 'Rotation'); rs0 = Object.fromEntries(selObjs().filter(o => !o.locked).map(o => [o.id, o.yaw !== undefined ? o.yaw || 0 : o.pan || 0])); } else { if (gizmoR.object) gizmoR.object.quaternion.identity(); touch(); refreshProps(); } });
  gizmoR.addEventListener('objectChange', () => { const root = gizmoR.object; if (rSkipS){ if (root) root.quaternion.identity(); return; } if (!root || !rs0) return; const dy = 2 * Math.atan2(root.quaternion.y, root.quaternion.w) * R2D; root.quaternion.identity();
    for (const o of selObjs()){ if (rs0[o.id] === undefined) continue; if (o.yaw !== undefined) o.yaw = wrap(rs0[o.id] + dy); else if (o.pan !== undefined) o.pan = wrap(rs0[o.id] + dy); const r = RT.get(o.id); if (r) r.dirty = true; } });
  A.hooks.update.push(() => { if (gizmoR.object !== gizmo.object){ if (gizmo.object) gizmoR.attach(gizmo.object); else gizmoR.detach(); } gizmoR.camera = gizmo.camera; if (!gizmoR.dragging) gizmoR.enabled = !gizmo.dragging && !gizmo.axis; if (!gizmo.dragging) gizmo.enabled = !gizmoR.dragging; });
  A.hooks.update.push(update);
  A.hooks.mode.push(m => { if (m === 'walk'){ gizmo.detach(); UI.placing = null; UI.aiming = false; } else if (UI.sel.length) select(UI.sel); gizmo.camera = A.camera; });
  A.hooks.amb.push(() => { if (A.live){ A.live = false; render(); } });
  A.hooks.perche.push(() => touch(true));
  const bindPanel = el => { el.addEventListener('input', e => { const k = e.target.dataset?.ser; if (!k) return; e.stopPropagation(); UI[k] = e.target.type === 'checkbox' ? e.target.checked : k === 'serie' || k === 'blkCols' || k === 'blkRows' ? Math.max(1, Math.min(60, Math.round(+e.target.value || 1))) : Math.max(0, +e.target.value || 0); }, true); el.addEventListener('input', onInput); el.addEventListener('change', e => { if (e.target.dataset?.ser) return; if (e.target.type !== 'range' && e.target.type !== 'color') A.keepFocus(render); });
  el.addEventListener('click', onClick); if (el.id === 'console') $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') e.target.style.display = 'none'; else onClick(e); });
  el.addEventListener('dblclick', e => { const c = e.target.closest('[data-a="cue"]'); if (c){ UI.cue = +c.dataset.id; openRename(); } }); }; bindPanel($('#console')); A.bindPanel = bindPanel; A.panelHtml = { lib: libHtml, con: conHtml }; A.rows = { patch: patchRows, gear: gearRows };
  bindCanvas();
  let d = null, raw0 = null; try { raw0 = A.store.get('show', null); if (raw0) d = JSON.parse(raw0); } catch (_){}
  // à l'ouverture : toujours un projet vierge dans un espace vide. Le travail précédent est gardé pour « Reprendre le dernier projet ». (?demo : l'ancien démarrage, pour les essais)
  if (/[?&]demo\b/.test(location.search)) loadShow(d && d.objs ? d : demoShow());
  else { if (d && d.objs && (d.objs.length || (d.cues || []).length || (d.salle && d.salle.type === 'param' && !d.salle.open))) A.store.set('lastShow', raw0); loadShow(blankShow()); }
  undoStack.length = 0;
  setInterval(photo, 400);
  cloud(); histChanged();
  import('./app.js').then(m => m.initWS(A, window.STAGE)).catch(e => console.error(e));
  A.onUserConfig = followConfig; { const fc = document.querySelector('#followCfg'); if (fc){ fc.checked = S.follow !== false; fc.onchange = () => { S.follow = fc.checked; touch(); }; } }
  import('./prog.js').then(m => m.initProg(A, window.STAGE)).catch(e => console.error(e)).then(() => import('./desk.js')).then(m => m.initDesk(A, window.STAGE)).catch(e => console.error(e));
  import('./ai.js').then(m => m.initAI(A, window.STAGE)).catch(e => console.error(e));
          // le show démo en mode cinéma (cine.js) a été retiré à la demande de Benjamin le 24.11.2026 ; le fichier reste dans le dépôt, il n'est plus chargé
  import('./lib.js').then(m => m.initLib(A, window.STAGE)).catch(e => console.error(e));
  import('./audio.js').then(m => m.initAudio(A, window.STAGE, AUD)).catch(e => console.error(e));
  import('./dmx.js').then(m => m.initDmx(A, window.STAGE, DMXIN)).catch(e => console.error(e));
  import('./rig.js').then(m => m.initRig(A, window.STAGE)).catch(e => console.error(e));
  import('./ponts.js').then(m => m.initPonts(A, window.STAGE)).catch(e => console.error(e));
  import('./scenes.js').then(m => m.initScenes(A, window.STAGE)).catch(e => console.error(e));
  import('./video.js').then(m => m.initVideo(A, window.STAGE)).catch(e => console.error(e));
  import('./import3d.js').then(m => m.initImport3d(A, window.STAGE)).catch(e => console.error(e));
  import('./layers.js').then(m => m.initLayers(A, window.STAGE)).catch(e => console.error(e));
  import('./objlist.js').then(m => m.initObjList(A, window.STAGE)).catch(e => console.error(e));
  import('./libwin.js').then(m => m.initLibWin(A, window.STAGE)).catch(e => console.error(e));
  import('./panels.js').then(m => m.initPanels(A, window.STAGE)).catch(e => console.error(e));
  import('./decor.js').then(m => m.initDecor(A, window.STAGE)).catch(e => console.error(e));
  import('./linearray.js').then(m => m.initLineArray(A, window.STAGE)).catch(e => console.error(e));
  import('./publish.js').then(m => m.initPublish(A, window.STAGE)).catch(e => console.error(e));
  import('./draw.js').then(m => m.initDraw(A, window.STAGE)).catch(e => console.error(e));
  setTimeout(() => import('./thumbs.js').then(m => m.initThumbs(A, window.STAGE)).catch(e => console.error(e)), 1500);
  setTimeout(() => import('./drawer.js').then(m => m.initDrawer(A, window.STAGE)).catch(e => console.error(e)), 1000);
  import('./plan.js').then(m => m.initPlan(A, window.STAGE)).catch(e => console.error(e));
  import('./parc.js').then(m => m.initParc(A, window.STAGE)).catch(e => console.error(e));
  import('./venue.js').then(m => m.initVenue(A, window.STAGE)).catch(e => console.error(e));
  import('./view.js').then(m => m.initView(A, window.STAGE)).catch(e => console.error(e));
  import('./render.js').then(m => m.initRender(A, window.STAGE)).catch(e => console.error(e));
  setTimeout(() => import('./wins.js').then(m => m.initWins(A, window.STAGE)).catch(e => console.error(e)), 600);
  setTimeout(() => import('./dock.js').then(m => m.initDock(A, window.STAGE)).catch(e => console.error(e)), 900);
  window.STAGE = { GOBOS, CWHEEL, PRISMS, LNUM, fxCaps, pickAt: e => pickScene(e, false), dropAt: (e, id) => { const h = pickScene(e, false); if (!h) return false; place(id, h); render(); return true; }, libHtml, addType, quadMap, triDraw, hitAlong, vpOptics, vpLens, vpThrow, vpShift, MEDIA, MATS, matFor, boxUV, matTile, matCol: id => MATBY.get(id)?.col, parseD4, LKEYS, HIL, FLS, FXHOOK, sceneShow, dirOf, setDl: x => { dl = x; }, get gizmoR(){ return gizmoR; }, fmt, LED: LEDW, FXS, defaults, recCue, tick: update, weightOf, LIBALL: () => LIB, removeSel, duplicate, cloudSave, cloudLoad, runAct, undoTo, hist: () => ({ undo: undoStack, redo: redoStack }), byId, build, unbuild, nextNum, freeAddr, modeCh, modal, esc, gizmo, uid, posOf, setGizmo: m => { UI.gizmo = m; setGizmoMode(); }, hasCloud: () => !!db, histChanged, typeOf, pushUndo, touch, refreshProps, addrStr, saveFile, toast, selObjs, undo, redo, conflicts, S, UI, RT, select, setLive, goCue, place, placeSeries, seriePts, percheNear, hitAt, blkType, blkCells, blkSnap, placeBlock, blkTip, stageEdges, dressStage, importFiles, loadShow, demoShow, blankShow, serialize, exportMvr, parseGdtf, splMap, render, magnet, magState, magSay, supportNear };
}
