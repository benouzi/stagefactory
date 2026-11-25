// Modèle 3D d'un appareil, tiré de sa fiche GDTF : l'arbre des géométries (base, lyre, tête, faisceau) et les maillages
// joints à la fiche (glb ou 3ds). Sans maillage, on retombe sur des volumes simples aux cotes de la fiche.
// Le modèle rendu est en mètres, Y vers le haut, origine au point d'accroche de l'appareil.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TDSLoader } from "three/examples/jsm/loaders/TDSLoader.js";
import { unzipSync, strFromU8 } from "fflate";

export interface GdtfModel { root: THREE.Group; meshes: number; fromFiles: number; gobos: Map<string, THREE.Texture> } // gobos : images de la roue, par nom de fichier sans extension
const num = (v: string | null) => { const n = parseFloat((v ?? "").replace(",", ".")); return isFinite(n) ? n : 0; };
// « {a,b,c,d}{e,f,g,h}{i,j,k,l}{0,0,0,1} » : trois axes en lignes, translation en dernière colonne.
function matrixOf(s: string | null): THREE.Matrix4 {
  const v = (s ?? "").match(/-?\d+(?:[.,]\d+)?(?:e-?\d+)?/gi)?.map((x) => parseFloat(x.replace(",", "."))) ?? [];
  const m = new THREE.Matrix4();
  if (v.length >= 12) m.set(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], 0, 0, 0, 1);
  return m;
}
const body = () => new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.55, metalness: 0.35 });

async function meshFromFile(files: Record<string, Uint8Array>, file: string): Promise<THREE.Object3D | null> {
  const find = (dir: string, ext: string) => Object.keys(files).find((k) => k.toLowerCase() === `models/${dir}/${file.toLowerCase()}.${ext}`);
  const glb = find("gltf", "glb") ?? find("gltf_low", "glb") ?? find("gltf_high", "glb");
  if (glb) {
    try {
      const b = files[glb], gltf: any = await new Promise((res, rej) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, "", res, rej));
      const g = new THREE.Group(); g.add(gltf.scene); g.rotation.x = Math.PI / 2; // glTF : Y vers le haut ; GDTF : Z vers le haut
      const w = new THREE.Group(); w.add(g); return w;
    } catch { /* maillage illisible : on essaie le 3ds, puis le volume simple */ }
  }
  const tds = find("3ds", "3ds") ?? find("3ds_low", "3ds") ?? find("3ds_high", "3ds");
  if (tds) {
    try { const b = files[tds], o = new TDSLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, ""); o.scale.setScalar(0.001); const w = new THREE.Group(); w.add(o); return w; } // 3ds : millimètres
    catch { /* idem */ }
  }
  return null;
}
// Volume simple quand la fiche n'a pas de maillage : cotes de la fiche, posé sous son origine.
function primitive(L: number, W: number, H: number, type: string): THREE.Object3D {
  const l = L || 0.2, w = W || 0.2, h = H || 0.2;
  const geo = /Cylinder|Head|Conventional|Scanner/i.test(type) ? new THREE.CylinderGeometry(Math.min(l, w) / 2, Math.min(l, w) / 2, h, 24).rotateX(Math.PI / 2) : /Sphere/i.test(type) ? new THREE.SphereGeometry(Math.max(l, w, h) / 2, 20, 14) : new THREE.BoxGeometry(l, w, h);
  const m = new THREE.Mesh(geo, body()); m.position.z = /Sphere/i.test(type) ? 0 : -h / 2; return m;
}

export async function buildGdtfModel(bytes: Uint8Array): Promise<GdtfModel | null> {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { return null; }
  const xmlB = files["description.xml"]; if (!xmlB) return null;
  const xml = new DOMParser().parseFromString(strFromU8(xmlB), "application/xml"), ft = xml.querySelector("GDTF > FixtureType");
  const geos = ft?.querySelector(":scope > Geometries"); if (!ft || !geos) return null;
  const models = new Map<string, { L: number; W: number; H: number; file: string; type: string }>();
  for (const m of ft.querySelectorAll(":scope > Models > Model")) models.set(m.getAttribute("Name") || "", { L: num(m.getAttribute("Length")), W: num(m.getAttribute("Width")), H: num(m.getAttribute("Height")), file: m.getAttribute("File") || "", type: m.getAttribute("PrimitiveType") || "Undefined" });
  const cache = new Map<string, THREE.Object3D | null>(); let meshes = 0, fromFiles = 0, axes = 0;
  const top = new Map<string, Element>(); for (const g of geos.children) top.set(g.getAttribute("Name") || "", g);

  async function modelMesh(name: string): Promise<THREE.Object3D | null> {
    const m = models.get(name); if (!m) return null;
    if (!cache.has(name)) {
      let o = m.file ? await meshFromFile(files, m.file) : null;
      if (o) {
        fromFiles++;
        // le maillage est mis aux cotes annoncées par la fiche, quand elle en donne
        const bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(new THREE.Vector3());
        if (m.L > 0 && m.W > 0 && m.H > 0 && sz.x > 1e-6 && sz.y > 1e-6 && sz.z > 1e-6) o.scale.multiply(new THREE.Vector3(m.L / sz.x, m.W / sz.y, m.H / sz.z));
        o.traverse((x: any) => { if (x.isMesh) { x.castShadow = true; if (!x.material || x.material.type === "MeshBasicMaterial" || x.material.type === "MeshPhongMaterial") { const c = x.material?.color?.getHex?.() ?? 0x1b1d22; x.material = body(); x.material.color.setHex(c); } } });
      } else if (m.type !== "Undefined" || (m.L && m.W && m.H)) o = primitive(m.L, m.W, m.H, m.type);
      cache.set(name, o);
    }
    const o = cache.get(name); if (!o) return null; meshes++; return o.clone(true);
  }
  async function walk(el: Element, depth: number): Promise<THREE.Object3D> {
    const node = new THREE.Group(); node.applyMatrix4(matrixOf(el.getAttribute("Position")));
    if (el.tagName === "GeometryReference") {
      const ref = top.get(el.getAttribute("Geometry") || "");
      if (ref && depth < 8) { const inst = await walk(ref, depth + 1); inst.matrix.identity(); inst.position.set(0, 0, 0); inst.quaternion.identity(); inst.scale.set(1, 1, 1); node.add(inst); }
      const mm = await modelMesh(el.getAttribute("Model") || ""); if (mm) node.add(mm);
      return node;
    }
    // Un axe tourne : son contenu est rangé dans un pivot. Premier axe rencontré = pan, axe imbriqué = tilt.
    let holder: THREE.Object3D = node;
    if (el.tagName === "Axis") { const pivot = new THREE.Group(); pivot.name = axes === 0 ? "sf-pan" : axes === 1 ? "sf-tilt" : "sf-axis"; axes++; node.add(pivot); holder = pivot; }
    const mm = await modelMesh(el.getAttribute("Model") || ""); if (mm) holder.add(mm);
    if (el.tagName === "Beam") { const b = new THREE.Group(); b.name = "sf-beam"; b.userData.beamAngle = num(el.getAttribute("BeamAngle")) || 25; b.userData.radius = num(el.getAttribute("BeamRadius")) || 0.05; holder.add(b); }
    for (const c of el.children) if (c.tagName !== "Break") holder.add(await walk(c, depth));
    return node;
  }
  const zup = new THREE.Group();
  for (const g of geos.children) {
    // une géométrie de premier niveau qui ne sert que de modèle à des références n'est pas dessinée seule
    const name = g.getAttribute("Name") || ""; if (geos.querySelector(`GeometryReference[Geometry="${CSS.escape(name)}"]`)) continue;
    zup.add(await walk(g, 0));
  }
  const root = new THREE.Group(); zup.rotation.x = -Math.PI / 2; root.add(zup); // Z vers le haut -> Y vers le haut
  // images de la roue de gobos (dossier wheels de la fiche)
  const gobos = new Map<string, THREE.Texture>();
  for (const k of Object.keys(files)) { const m = k.toLowerCase().match(/^wheels\/(.+)\.png$/); if (!m) continue; const b = files[k], t = new THREE.TextureLoader().load(URL.createObjectURL(new Blob([b.slice().buffer], { type: "image/png" }))); gobos.set(m[1], t); }
  return meshes ? { root, meshes, fromFiles, gobos } : null;
}
