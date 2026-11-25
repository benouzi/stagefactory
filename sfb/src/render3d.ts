// Rendu de la vue 3D : matières dessinées à la main, lumière de service, et le plan importé comme base (sol et murs).
import * as THREE from "three";
import type { Doc } from "./model";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x / 1000, z / 1000, -y / 1000); // plan (mm, Z haut) -> scène

// ---------- matières ----------
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const cache = new Map<string, THREE.CanvasTexture>();
function canvasTex(key: string, size: number, draw: (g: CanvasRenderingContext2D, n: number) => void, srgb = true) {
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement("canvas"); c.width = c.height = size; seed = 7 + key.length * 131; draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; cache.set(key, t); return t;
}
/** Plancher de scène : lames sombres, veinage et joints. Une tuile = 2 m. */
export const woodTexture = () => canvasTex("wood", 1024, (g, n) => {
  const rows = 14, h = n / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * n * 0.5;
    while (x < n) { const w = n * (0.45 + rnd() * 0.5), l = 26 + rnd() * 14; g.fillStyle = `rgb(${l + 8},${l + 3},${l})`; g.fillRect(x, r * h, w, h);
      for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "120,100,80"},${0.03 + rnd() * 0.05})`; g.fillRect(x + rnd() * w, r * h + rnd() * h, 30 + rnd() * 160, 1); }
      g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(x + w - 1, r * h, 2, h); x += w; }
    g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(0, r * h, n, 1.5);
  }
});
/** Sol de salle et murs : béton, grain et taches. Une tuile = 3 m. */
export const concreteTexture = () => canvasTex("concrete", 512, (g, n) => {
  g.fillStyle = "#8f8d89"; g.fillRect(0, 0, n, n);
  for (let k = 0; k < 9000; k++) { const v = rnd() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${0.02 + rnd() * 0.05})`; const s = 1 + rnd() * 3; g.fillRect(rnd() * n, rnd() * n, s, s); }
  for (let k = 0; k < 40; k++) { const x = rnd() * n, y = rnd() * n, r = 20 + rnd() * 70, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${0.03 + rnd() * 0.05})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
});
/** Carte de rugosité assortie : les joints et le veinage accrochent moins la lumière. */
export const roughFrom = (key: string, src: THREE.CanvasTexture, base: number) => canvasTex("rough-" + key, 512, (g, n) => {
  g.filter = "grayscale(1) contrast(1.6)"; g.drawImage(src.image as HTMLCanvasElement, 0, 0, n, n); g.filter = "none"; g.globalCompositeOperation = "screen"; const v = Math.round(base * 255); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, 0, n, n);
}, false);

// ---------- le plan importé, base de la scène ----------
let raster: { url: string; tex: THREE.Texture } | null = null;
const rasterTex = (url: string) => { if (raster?.url !== url) { raster?.tex.dispose(); const tex = new THREE.TextureLoader().load(url); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; raster = { url, tex }; } return raster.tex; };
export interface PlanBase { group: THREE.Group; box: THREE.Box3 | null; walls: number; cut: { value: number } | null } // cut : 1 quand on regarde de dehors, les murs de devant s'effacent
const WALL_MAX = 40000;
/** Le fond de plan posé au sol, à l'échelle, et les calques choisis élevés en murs. */
export function buildPlanBase(doc: Doc): PlanBase {
  const group = new THREE.Group(), b = doc.backdrop; let walls = 0, cut: { value: number } | null = null;
  if (!b || !doc.layers.backdrop) return { group, box: null, walls, cut };
  const k = b.mmPerPx, box = new THREE.Box3(); box.expandByPoint(V(b.origin.x, b.origin.y, 0)); box.expandByPoint(V(b.origin.x + b.wPx * k, b.origin.y - b.hPx * k, 0));
  if (b.vector) {
    const v = b.vector, hidden = new Set((b.hiddenLayers ?? []).map((n) => v.layers.indexOf(n))), wall = new Set((b.wallLayers ?? []).map((n) => v.layers.indexOf(n))), H = (b.wallHMm ?? 6000) / 1000;
    const line: number[] = [], pos: number[] = [], W = (x: number, y: number) => [(b.origin.x + x * k) / 1000, -(b.origin.y - y * k) / 1000];
    for (const q of v.polys) {
      if (hidden.has(q.l)) continue; const isWall = wall.has(q.l);
      for (let i = 0; i + 3 < q.p.length; i += 2) {
        const [x0, z0] = W(q.p[i], q.p[i + 1]), [x1, z1] = W(q.p[i + 2], q.p[i + 3]);
        line.push(x0, 0, z0, x1, 0, z1);
        if (isWall && walls < WALL_MAX && Math.hypot(x1 - x0, z1 - z0) > 0.05) { pos.push(x0, 0, z0, x1, 0, z1, x1, H, z1, x0, 0, z0, x1, H, z1, x0, H, z0); walls++; }
      }
    }
    if (line.length) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(line, 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaeb8cc, transparent: true, opacity: Math.min(1, 0.35 + b.opacity * 0.6) })); l.position.y = 0.006; l.userData.noAO = true; group.add(l); }
    if (pos.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6f6d6a, map: concreteTexture(), roughness: 0.92, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide }));
      // la texture se plaque d'après la position : 3 m par tuile
      const uv: number[] = []; for (let i = 0; i < pos.length; i += 18) { const L = Math.hypot(pos[i + 3] - pos[i], pos[i + 5] - pos[i + 2]) / 3, h = H / 3; uv.push(0, 0, L, 0, L, h, 0, 0, L, h, 0, h); } g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      // vu de dehors, un mur placé entre l'œil et le centre de la salle s'efface : on voit dedans, comme dans une maquette ouverte
      const uCut = (cut = { value: 0 }), uCenter = { value: box.getCenter(new THREE.Vector3()) };
      (m.material as THREE.MeshStandardMaterial).onBeforeCompile = (sh) => {
        sh.uniforms.uCut = uCut; sh.uniforms.uCenter = uCenter;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vWN;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * normal);");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uCut; uniform vec3 uCenter; varying vec3 vWP; varying vec3 vWN;").replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (uCut > 0.5 && dot(vWN, cameraPosition - vWP) * dot(vWN, uCenter - vWP) < 0.0) discard;");
      };
      m.castShadow = true; m.receiveShadow = true; m.userData.planWalls = true; group.add(m); box.expandByPoint(new THREE.Vector3(box.min.x, H, box.min.z));
    }
  } else if (b.dataUrl) {
    const w = (b.wPx * k) / 1000, h = (b.hPx * k) / 1000, tex = rasterTex(b.dataUrl);
    // le papier blanc est assombri pour ne pas éblouir sous la lumière de service
    const mat = (clip?: THREE.Plane) => new THREE.MeshStandardMaterial({ map: tex, color: 0x555555, roughness: 0.95, transparent: b.opacity < 0.99, opacity: Math.min(1, 0.25 + b.opacity * 0.75), ...(clip ? { clippingPlanes: [clip] } : {}) });
    const sheet = (y: number, clip?: THREE.Plane) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), mat(clip)); m.position.copy(V(b.origin.x + (b.wPx * k) / 2, b.origin.y - (b.hPx * k) / 2, 0)); m.position.y = y; m.receiveShadow = true; m.userData.noAO = true; group.add(m); };
    // avec une salle décrite : le plan suit les niveaux, au plateau côté scène et au sol de salle côté public
    if (doc.room.enabled) { sheet(0.004, new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)); sheet(-doc.room.stageRiseMm / 1000 + 0.035, new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)); } else sheet(0.004);
  }
  return { group, box, walls, cut };
}

// ---------- lumière de service ----------
export type Ambiance = "service" | "salle" | "plateau" | "noir";
export const AMBIANCES: Record<Ambiance, { label: string; house: number; stage: number; hemi: number; env: number }> = {
  service: { label: "Service", house: 150, stage: 165, hemi: 0.42, env: 0.5 },
  salle: { label: "Salle graduée", house: 70, stage: 0, hemi: 0.14, env: 0.1 },
  plateau: { label: "Plateau", house: 0, stage: 700, hemi: 0.06, env: 0.05 },
  noir: { label: "Noir", house: 0, stage: 0, hemi: 0.045, env: 0.05 },
};
export interface Service { house: THREE.SpotLight[]; stage: THREE.SpotLight[]; place(box: THREE.Box3, stageZ: [number, number]): void; set(a: Ambiance): void }
/** Des découpes douces sous le plafond, comme une vraie lumière de service. `shadows` : combien portent une ombre. */
export function makeService(scene: THREE.Scene, shadows: number): Service {
  const mk = (color: number, sh: boolean) => { const s = new THREE.SpotLight(color, 0, 60, 1, 0.85, 1); /* atténuation douce : ce qui est accroché près de la source n'est pas brûlé */ if (sh) { s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.radius = 3; s.shadow.bias = -0.0004; s.shadow.normalBias = 0.03; s.shadow.camera.near = 0.5; s.shadow.camera.far = 60; s.shadow.camera.layers.enable(1); } scene.add(s, s.target); return s; };
  const house = Array.from({ length: 6 }, (_, i) => mk(0xffe4c8, i === 2 && shadows > 1)), stage = Array.from({ length: 3 }, (_, i) => mk(0xffd9a8, i === 1 && shadows > 0)); let gain = 1;
  return { house, stage,
    place(box, [z0, z1]) { // z0..z1 : la profondeur du plateau ; le reste du volume est la salle
      const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), h = Math.max(4, size.y) - 0.3, sx = Math.max(2, size.x * 0.24); gain = h / 6.75 / 6.75; // même éclairement au sol qu'une source de référence à 6,75 m
      const hz0 = Math.max(z1, box.min.z), hz1 = Math.max(hz0 + 2, box.max.z), deep = hz1 - hz0 > 3 && box.max.z > z1 + 1;
      house.forEach((s, i) => { const row = Math.floor(i / 2), side = i % 2 ? 1 : -1, z = deep ? hz0 + (hz1 - hz0) * (row + 0.5) / 3 : box.min.z + size.z * (row + 0.5) / 3; s.position.set(c.x + side * sx, h, z); s.target.position.set(c.x + side * sx * 0.5, 0, z + 0.5); s.angle = 1.0; });
      stage.forEach((s, i) => { const x = c.x + (i - 1) * Math.max(2, size.x * 0.22), zs = (z0 + z1) / 2; s.position.set(x, h, Math.min(z1 + Math.max(2, h * 0.5), box.max.z)); s.target.position.set(x * 0.8 + c.x * 0.2, 0, zs); s.angle = 0.75; });
    },
    set(a) { const A = AMBIANCES[a]; house.forEach((s) => { s.intensity = A.house * gain; s.visible = A.house > 0; }); stage.forEach((s) => { s.intensity = A.stage * gain; s.visible = A.stage > 0; }); }, // une lampe éteinte est retirée du calcul : chaque point de l'image coûte moins cher
  };
}

/** Plus grand nombre de textures lues par un même programme : il doit tenir dans ce que la carte graphique accepte. */
export function samplersInUse(renderer: THREE.WebGLRenderer) {
  const gl = renderer.getContext(); let most = 0;
  for (const p of (renderer.info.programs ?? []) as any[]) { const prog = p.program as WebGLProgram; if (!prog) continue; let n = 0; const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) { const u = gl.getActiveUniform(prog, i); if (u && (u.type === gl.SAMPLER_2D || u.type === gl.SAMPLER_CUBE || u.type === 0x8b62 /* sampler2DShadow */ || u.type === 0x8dc1 /* 2D array */ || u.type === 0x8b5f /* 3D */)) n += u.size; } most = Math.max(most, n); }
  return { most, limit: renderer.capabilities.maxTextures };
}

// ---------- Couleur d'un filtre : ce qui est écrit dans le champ « couleur » d'un appareil devient la teinte de son faisceau ----------
const GELS: Record<string, [number, number, number]> = {
  rouge: [255, 30, 20], red: [255, 30, 20], orange: [255, 120, 20], ambre: [255, 170, 60], amber: [255, 170, 60], jaune: [255, 225, 60], yellow: [255, 225, 60], vert: [40, 255, 70], green: [40, 255, 70], cyan: [40, 230, 255], turquoise: [30, 220, 200],
  bleu: [40, 80, 255], blue: [40, 80, 255], "bleu nuit": [30, 40, 200], congo: [90, 30, 255], violet: [150, 50, 255], purple: [150, 50, 255], lavande: [180, 150, 255], magenta: [255, 30, 200], rose: [255, 120, 180], pink: [255, 120, 180],
  blanc: [255, 255, 255], white: [255, 255, 255], "blanc chaud": [255, 214, 150], "blanc froid": [205, 225, 255], ctb: [185, 215, 255], cto: [255, 190, 120], uv: [110, 40, 255],
  // filtres courants (numéros Lee et Rosco) : teintes approchées
  l101: [255, 225, 60], l105: [255, 130, 20], l106: [255, 25, 15], l113: [255, 40, 150], l116: [20, 200, 190], l119: [35, 55, 230], l120: [45, 60, 220], l124: [30, 215, 90], l126: [240, 30, 200], l128: [255, 60, 190], l132: [50, 110, 255], l134: [255, 160, 70], l135: [255, 110, 30], l139: [40, 235, 60],
  l141: [70, 170, 255], l147: [255, 170, 110], l151: [255, 185, 150], l152: [255, 205, 170], l154: [255, 215, 195], l158: [255, 150, 40], l161: [150, 190, 255], l164: [255, 55, 25], l172: [50, 215, 235], l179: [255, 195, 70], l181: [80, 25, 255], l182: [255, 20, 10], l195: [50, 70, 235],
  l200: [150, 190, 255], l201: [185, 215, 255], l202: [215, 232, 255], l203: [235, 243, 255], l204: [255, 190, 120], l205: [255, 215, 165], l206: [255, 232, 200], l342: [255, 70, 150], l343: [150, 90, 255], l363: [35, 60, 240], l779: [255, 140, 60],
  r02: [255, 205, 150], r08: [255, 220, 180], r19: [255, 80, 20], r26: [255, 30, 15], r27: [235, 20, 10], r33: [255, 170, 190], r59: [100, 60, 255], r68: [70, 110, 255], r80: [40, 60, 240], r83: [30, 40, 190], r90: [35, 220, 60], r339: [255, 50, 150],
};
/** Lit une couleur de filtre : « #ff8800 », un nom (« bleu »), ou un numéro (« L201 », « R80 »). Rien de reconnu : null. */
export function gelRgb(text: string | undefined): [number, number, number] | null {
  if (!text) return null; const t = text.trim().toLowerCase(); const hx = /^#?([0-9a-f]{6})$/.exec(t); if (hx) { const n = parseInt(hx[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  if (GELS[t]) return GELS[t]; const num = /^(?:lee|l|rosco|r)?\s*-?\s*0*(\d{2,3})$/.exec(t); if (num) { const k = (t.startsWith("r") ? "r" : "l") + (t.startsWith("r") && num[1].length === 2 ? num[1].padStart(2, "0") : num[1]); if (GELS[k]) return GELS[k]; }
  return null;
}
