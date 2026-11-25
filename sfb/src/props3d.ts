// Les éléments de scénographie en 3D : modèles du catalogue (formes simples) et modèles importés (fichiers GLB libres de droits).
import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { PEOPLE } from "./peopleData";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PALETTE, type PropDef } from "./props";
import { Kit, kmat, meshes, rbox, type Geos } from "./kit3d";
import { HD_PROPS } from "./propsHD";

const wedge = (() => { const g = new THREE.BufferGeometry(), a = [-0.5, -0.5, -0.5], b = [0.5, -0.5, -0.5], c = [0.5, 0.5, -0.5], d = [-0.5, 0.5, -0.5], e = [-0.5, -0.5, 0.5], f = [0.5, -0.5, 0.5], tri = [a, c, b, a, d, c, a, b, f, a, f, e, d, e, f, d, f, c, a, e, d, b, c, f].flat(); g.setAttribute("position", new THREE.Float32BufferAttribute(tri, 3)); g.computeVertexNormals(); return g; })();
const GEO = { b: new THREE.BoxGeometry(1, 1, 1), c: new THREE.CylinderGeometry(0.5, 0.5, 1, 40), h: new THREE.CylinderGeometry(0.5, 0.5, 1, 40), s: new THREE.SphereGeometry(0.5, 32, 20), k: new THREE.ConeGeometry(0.5, 1, 40, 1, true), w: wedge };
const mats = new Map<string, THREE.Material>();
const KIT = new Set(["grille", "cab", "alu", "steel", "gloss", "body", "fin", "dark", "glass", "white", "yellow", "screen"]);
function mat(name: string): THREE.Material {
  let m = mats.get(name); if (m) return m;
  if (!PALETTE[name] && KIT.has(name)) return kmat(name);
  const p = PALETTE[name], color = p ? p.c : /^#[0-9a-f]{6}$/i.test(name) ? parseInt(name.slice(1), 16) : PALETTE.gris.c;
  m = new THREE.MeshStandardMaterial({ color, roughness: p?.r ?? 0.8, metalness: p?.m ?? 0.03, transparent: !!p?.o, opacity: p?.o ?? 1, side: name === "lampe" || name === "tulle" ? THREE.DoubleSide : THREE.FrontSide, ...(p?.e ? { emissive: color, emissiveIntensity: p.e } : {}) });
  m.userData.shared = true; mats.set(name, m); return m;
}
// Les modèles soudés sont gardés : par modèle détaillé et par cotes, ou par liste de pièces (catalogue, atelier, IA).
const hdCache = new Map<string, Geos>(), partCache = new WeakMap<object, Map<string, Geos>>();
function generic(def: PropDef, w: number, h: number, d: number): Geos {
  const K = new Kit();
  for (const [shape, x, y, z, sx, sy, sz, col, rot] of def.parts) {
    const W = Math.max(1e-4, sx * w), H = Math.max(1e-4, sy * h), Dp = Math.max(1e-4, sz * d); let g: THREE.BufferGeometry;
    /* une boîte a ses arêtes adoucies, comme un vrai objet : c'est ce qui accroche la lumière */
    if (shape === "b") g = rbox(W, H, Dp, Math.min(0.012, Math.min(W, H, Dp) * 0.16));
    else if (shape === "h") { g = GEO.h.clone(); g.scale(W, Dp, H); g.rotateX(Math.PI / 2); }
    else { g = GEO[shape].clone(); g.scale(W, H, Dp); if (shape !== "s") g.computeVertexNormals(); }
    K.add(col, g, x * w, y * h, z * d, rot?.[0] ?? 0, rot?.[1] ?? 0, rot?.[2] ?? 0);
  }
  return K.geos();
}
/** Un modèle du catalogue aux dimensions de l'objet (mètres) : modèle détaillé s'il en existe un, sinon ses pièces. */
export function buildProp(def: PropDef, w: number, h: number, d: number, tint?: string): THREE.Group {
  // personnage embarqué : son modèle, dès qu'il est lu (une boîte en fil de fer le temps de la lecture, puis la vue se redessine)
  const who = PEOPLE[def.key]; if (who) { const g = new THREE.Group(); g.add(glbInstance("people:" + def.key, who.glb, w, h, d, () => window.dispatchEvent(new CustomEvent("sf:people")))); return g; }
  const g = new THREE.Group(), dims = `${Math.round(w * 1000)}x${Math.round(h * 1000)}x${Math.round(d * 1000)}`, hd = HD_PROPS[def.key]; let geos: Geos | undefined;
  if (hd) { const id = def.key + "|" + dims; geos = hdCache.get(id); if (!geos) { const K = new Kit(); if (hd.nominal) { hd.build(K, hd.nominal[0], hd.nominal[1], hd.nominal[2]); geos = K.geos(false, [w / hd.nominal[0], h / hd.nominal[1], d / hd.nominal[2]]); } else { hd.build(K, w, h, d); geos = K.geos(); } if (hdCache.size > 400) hdCache.clear(); hdCache.set(id, geos); } }
  else { let per = partCache.get(def.parts); if (!per) partCache.set(def.parts, (per = new Map())); geos = per.get(dims); if (!geos) { geos = generic(def, w, h, d); if (per.size > 60) per.clear(); per.set(dims, geos); } }
  const own = tint || def.color || "gris"; meshes(g, geos, (name) => mat(name === "$" ? own : name));
  return g;
}
// ----- modèles importés -----
const bytesOf = (b64: string) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
export const toB64 = (buf: ArrayBuffer) => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
type Ready = { unit: THREE.Group; size: THREE.Vector3 };
const cache = new Map<string, Ready | "loading" | "error">();
/** Lit un fichier GLB et le ramène dans le cube unité, posé au sol et centré. Renvoie aussi sa taille d'origine (mètres). */
export function parseGlb(buf: ArrayBuffer): Promise<Ready> {
  return new Promise((resolve, reject) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(buf, "", (gltf) => {
    const root = gltf.scene, box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    if (!(size.x > 0 && size.y > 0 && size.z > 0)) return reject(new Error("Ce modèle est vide ou plat."));
    /* Une matière importée ne garde que sa couleur et son image : les autres cartes (relief, rugosité, occlusion) dépasseraient le budget d'unités de texture de certaines cartes graphiques. */
    root.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true;
      for (const mt of (Array.isArray(m.material) ? m.material : [m.material]) as any[]) { if (!mt) continue; for (const k of ["normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "bumpMap", "displacementMap", "alphaMap", "lightMap", "envMap", "clearcoatMap", "clearcoatNormalMap", "clearcoatRoughnessMap", "sheenColorMap", "sheenRoughnessMap", "transmissionMap", "thicknessMap", "specularColorMap", "specularIntensityMap", "iridescenceMap", "iridescenceThicknessMap", "anisotropyMap"]) if (mt[k]) mt[k] = null; if ("metalness" in mt) mt.metalness = Math.min(mt.metalness ?? 0, 0.2); if ("roughness" in mt) mt.roughness = Math.max(mt.roughness ?? 0.8, 0.6); mt.needsUpdate = true; } });
    root.position.set(-c.x, -box.min.y, -c.z); const inner = new THREE.Group(); inner.add(root); inner.scale.set(1 / size.x, 1 / size.y, 1 / size.z); const unit = new THREE.Group(); unit.add(inner); resolve({ unit, size });
  }, (e) => reject(new Error("Fichier GLB illisible : " + (e?.message || "format non reconnu")))));
}
/** Le modèle d'un personnage embarqué, ramené au cube unité, ou rien tant qu'il n'est pas lu (la lecture est alors lancée). */
export function peopleUnit(key: string): THREE.Group | null {
  const who = PEOPLE[key]; if (!who) return null; const id = "people:" + key, got = cache.get(id);
  if (got && got !== "loading" && got !== "error") return got.unit;
  if (!got) { cache.set(id, "loading"); parseGlb(bytesOf(who.glb)).then((r) => { cache.set(id, r); window.dispatchEvent(new CustomEvent("sf:people")); }, () => cache.set(id, "error")); }
  return null;
}
export const isPerson = (key: string | undefined) => !!key && !!PEOPLE[key];
export const peopleReady = (key: string) => { const c = cache.get("people:" + key); return !!c && c !== "loading" && c !== "error"; };
/** Pour la vue 3D : le modèle s'il est prêt, sinon une boîte d'attente ; « again » est rappelé quand il arrive. */
export function glbInstance(id: string, b64: string | undefined, w: number, h: number, d: number, again: () => void): THREE.Object3D {
  const got = cache.get(id);
  if (got && got !== "loading" && got !== "error") { const g = got.unit.clone(true); g.scale.set(w, h, d); return g; }
  if (!got && b64) { cache.set(id, "loading"); parseGlb(bytesOf(b64)).then((r) => { cache.set(id, r); again(); }, () => cache.set(id, "error")); }
  const wait = new THREE.Mesh(GEO.b, new THREE.MeshStandardMaterial({ color: got === "error" || !b64 ? 0x803030 : 0x555a62, wireframe: true })); wait.scale.set(w, h, d); wait.position.y = h / 2; return wait;
}

// ----- vignettes des palettes
let thumbGl: { r: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera; holder: THREE.Group } | null = null; const thumbs = new Map<string, string>();
/** Une image d'un objet 3D, vu de trois quarts, sur fond transparent. Rendue une seule fois par clé puis gardée. */
export function objectThumb(key: string, make: () => THREE.Object3D): string {
  const had = thumbs.get(key); if (had) return had;
  try {
    if (!thumbGl) { const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(144, 144, false); r.setClearColor(0x000000, 0); const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x50545c, 1.5)); const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 3); scene.add(sun); const holder = new THREE.Group(); scene.add(holder); thumbGl = { r, scene, cam: new THREE.PerspectiveCamera(30, 1, 0.01, 500), holder }; }
    const { r, scene, cam, holder } = thumbGl, obj = make(); holder.clear(); holder.add(obj); obj.updateWorldMatrix(true, true);
    /* les faisceaux et les aides ne comptent pas dans le cadrage */
    obj.traverse((o) => { const m = o as THREE.Mesh; if ((m.material as any)?.isShaderMaterial || (o as any).isLine) o.visible = false; });
    const box = new THREE.Box3().setFromObject(obj, true); if (box.isEmpty()) box.set(new THREE.Vector3(-0.2, -0.2, -0.2), new THREE.Vector3(0.2, 0.2, 0.2)); const c = box.getCenter(new THREE.Vector3()), rad = Math.max(0.02, box.getSize(new THREE.Vector3()).length() / 2), dist = (rad / Math.sin((15 * Math.PI) / 180)) * 1.02;
    cam.position.set(c.x + dist * 0.62, c.y + dist * 0.42, c.z + dist * 0.66); cam.lookAt(c); cam.near = dist / 50; cam.far = dist * 4; cam.updateProjectionMatrix();
    r.render(scene, cam); const url = r.domElement.toDataURL("image/png"); holder.clear(); thumbs.set(key, url); return url;
  } catch { return ""; }
}
export const hasThumb = (key: string) => thumbs.has(key);
/** Vignette d'un élément de scénographie. */
export function propThumb(def: PropDef, tint?: string): string {
  if (PEOPLE[def.key] && !peopleReady(def.key)) { buildProp(def, 1, 1, 1); return ""; }
  return objectThumb("prop|" + def.key + "|" + (tint ?? "") + "|" + def.parts.length + "|" + def.w + "x" + def.d + "x" + def.h, () => buildProp(def, def.w / 1000, def.h / 1000, def.d / 1000, tint));
}
