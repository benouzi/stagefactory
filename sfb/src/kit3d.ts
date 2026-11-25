// Atelier de modelage : de quoi dessiner des modèles 3D détaillés avec peu de code, et les afficher à peu de frais.
// Un « Kit » reçoit des formes (boîtes aux arêtes adoucies, pièces tournées, tubes, capsules…) rangées par matière ;
// à la fin, toutes les formes d'une même matière sont soudées en une seule pièce : un appareil détaillé ne coûte que quelques tracés.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Geos = Map<string, THREE.BufferGeometry>;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const D = Math.PI / 180;

// ---------- formes ----------
/** Boîte aux arêtes adoucies. r : rayon de l'arrondi (m). */
export const rbox = (w: number, h: number, d: number, r = 0.008, seg = 3): THREE.BufferGeometry => {
  const rr = Math.max(0, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));
  return rr < 0.0008 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, seg, rr);
};
/** Cylindre ou tronc de cône debout : rayon du bas, rayon du haut, hauteur. */
export const cyl = (rBot: number, rTop: number, h: number, seg = 24, open = false) => new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
/** Pièce tournée autour de la verticale : suite de points [rayon, hauteur]. */
export const lathe = (pts: [number, number][], seg = 36) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg);
export const torus = (R: number, r: number, arc = Math.PI * 2, seg = 28, tube = 10) => new THREE.TorusGeometry(R, r, tube, seg, arc);
export const ball = (r: number, w = 22, h = 14) => new THREE.SphereGeometry(r, w, h);
/** Capsule debout : rayon, longueur totale (calottes comprises). */
export const capsule = (r: number, len: number, seg = 14) => new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, seg);
/** Verre bombé d'une lentille : disque de rayon r, bombé vers −Y. */
export const dome = (r: number, bulge = 0.22, seg = 28) => { const g = new THREE.SphereGeometry(r, seg, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, bulge, 1); g.rotateX(Math.PI); return g; };
/** Prisme droit : contour vu de dessus [x, z], élevé sur la hauteur h, posé sur y = 0. */
export const prism = (pts: [number, number][], h: number, bevel = 0.006): THREE.BufferGeometry => {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))), b = Math.min(bevel, h / 2 - 1e-4);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: b > 0.0005, bevelSize: b, bevelThickness: b, bevelSegments: 2, bevelOffset: -b, curveSegments: 18 });
  g.rotateX(-Math.PI / 2); g.translate(0, b, 0); return g;
};
/** Profilé : contour vu de côté [z, y], tiré sur la largeur w (centré en x). */
export const profile = (pts: [number, number][], w: number, bevel = 0.006): THREE.BufferGeometry => {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y))), b = Math.min(bevel, w / 2 - 1e-4);
  const g = new THREE.ExtrudeGeometry(s, { depth: w - 2 * b, bevelEnabled: b > 0.0005, bevelSize: b, bevelThickness: b, bevelSegments: 2, bevelOffset: -b, curveSegments: 18 });
  g.rotateY(Math.PI / 2); g.translate(-w / 2 + b, 0, 0); return g;
};
/** Tube entre deux points. */
export const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10): THREE.BufferGeometry => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = Math.max(1e-4, A.distanceTo(B)), g = new THREE.CylinderGeometry(r, r, len, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize())); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); return g;
};
/** Tissu plissé : largeur, hauteur, profondeur des plis. Le bas reste au sol (y = 0), le tissu est centré en x. */
export const drape = (w: number, h: number, depth: number, fullness = 1): THREE.BufferGeometry => {
  const folds = Math.max(3, Math.round((w / 0.42) * fullness)), nx = Math.min(480, folds * 10), g = new THREE.PlaneGeometry(w, h, nx, 6), p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) + h / 2, u = (x / w + 0.5) * folds * Math.PI * 2, t = y / Math.max(0.01, h);
    /* les plis s'ouvrent un peu vers le bas et ne sont pas tous pareils */
    const amp = (depth / 2) * (0.75 + 0.25 * (1 - t)) * (0.8 + 0.2 * Math.sin(u * 0.37 + 1.3));
    p.setXYZ(i, x + Math.sin(u * 2 + 0.6) * depth * 0.06, y, Math.sin(u) * amp + Math.sin(u * 0.5 + t * 2.2) * depth * 0.08);
  }
  g.computeVertexNormals(); return g;
};
/** Répète l'image d'une matière sur une forme (les coordonnées d'image sont multipliées). */
export const tile = <T extends THREE.BufferGeometry>(g: T, u: number, v: number): T => { const a = g.attributes.uv as THREE.BufferAttribute; if (a) for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * u, a.getY(i) * v); return g; };

// ---------- le kit ----------
export class Kit {
  private bins = new Map<string, THREE.BufferGeometry[]>();
  /** Ajoute une forme : matière, forme, position, rotation en degrés (x, y, z). */
  add(mat: string, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): this {
    let g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose();
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    if (x || y || z || rx || ry || rz) g.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx * D, ry * D, rz * D, "YXZ")), _s.set(1, 1, 1)));
    const bin = this.bins.get(mat); if (bin) bin.push(g); else this.bins.set(mat, [g]); return this;
  }
  /** Les mêmes pièces, de part et d'autre de l'axe (x et −x). */
  pair(mat: string, make: () => THREE.BufferGeometry, x: number, y = 0, z = 0, rx = 0, ry = 0, rz = 0): this { this.add(mat, make(), x, y, z, rx, ry, rz); return this.add(mat, make(), -x, y, z, rx, -ry, -rz); }
  /** Soude tout : une pièce par matière. flip : le modèle, dessiné debout, est retourné pour pendre sous son point d'accroche. scale : étirement (x, y, z). */
  geos(flip = false, scale?: [number, number, number]): Geos {
    const out: Geos = new Map();
    for (const [mat, list] of this.bins) {
      const g = list.length === 1 ? list[0] : mergeGeometries(list, false); if (!g) continue; if (list.length > 1) list.forEach((x) => x.dispose());
      if (scale) { g.scale(scale[0], scale[1], scale[2]); g.computeVertexNormals(); }
      if (flip) g.rotateZ(Math.PI);
      g.userData.shared = true; out.set(mat, g);
    }
    this.bins.clear(); return out;
  }
}
/** Pose les pièces soudées dans un groupe, chacune avec sa matière. */
export function meshes(into: THREE.Object3D, geos: Geos, mat: (name: string) => THREE.Material, shadow = true): void {
  for (const [name, g] of geos) { const m = new THREE.Mesh(g, mat(name)); m.castShadow = shadow && !(m.material as THREE.Material).transparent; m.receiveShadow = true; into.add(m); }
}

// ---------- matières de l'atelier (partagées : jamais libérées avec la scène) ----------
let dots: THREE.Texture | null = null;
/** Tôle perforée d'une grille d'enceinte : une petite image répétée. */
export function grilleTexture(): THREE.Texture {
  if (dots) return dots; const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d")!;
  x.fillStyle = "#b9bcc2"; x.fillRect(0, 0, 32, 32); x.fillStyle = "#17181b"; for (const [cx, cy] of [[8, 8], [24, 24]]) { x.beginPath(); x.arc(cx, cy, 5.6, 0, 7); x.fill(); } for (const [cx, cy] of [[24, 8], [8, 24]]) { x.beginPath(); x.arc(cx, cy, 5.6, 0, 7); x.fill(); }
  dots = new THREE.CanvasTexture(c); dots.wrapS = dots.wrapT = THREE.RepeatWrapping; dots.colorSpace = THREE.SRGBColorSpace; dots.anisotropy = 4; return dots;
}
const S = (color: number, roughness: number, metalness = 0, x: THREE.MeshStandardMaterialParameters = {}) => () => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...x });
const DEFS: Record<string, () => THREE.Material> = {
  body: S(0x16171b, 0.52, 0.15),        // carter noir satiné
  gloss: S(0x0b0c0f, 0.2, 0.3),         // noir brillant : flasques, façades
  fin: S(0x23252b, 0.42, 0.75),         // ailettes de refroidissement
  dark: S(0x070708, 0.92, 0),           // caoutchouc, évents
  alu: S(0xb9bdc4, 0.32, 0.9),          // aluminium
  steel: S(0x777c85, 0.42, 0.85),       // acier
  chrome: S(0xe9ecf0, 0.1, 1),
  white: S(0xd9dadd, 0.45, 0.05),       // carter de vidéoprojecteur
  cab: S(0x0f1012, 0.86, 0.02),         // peinture structurée des enceintes
  yellow: S(0xe0a020, 0.5, 0.25),
  glass: S(0x05070a, 0.06, 0.6),        // optique éteinte
  screen: S(0x06080c, 0.25, 0.1, { emissive: 0x2a6cff, emissiveIntensity: 0.55 }),
  grille: () => new THREE.MeshStandardMaterial({ color: 0x4a4d54, roughness: 0.5, metalness: 0.65, map: grilleTexture() }),
};
const made = new Map<string, THREE.Material>();
export function kmat(name: string): THREE.Material {
  let m = made.get(name); if (!m) { m = (DEFS[name] ?? DEFS.body)(); m.userData.shared = true; made.set(name, m); } return m;
}
