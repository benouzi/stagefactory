// Ce qui fait « briller » la vue 3D : le sol qui reflète la scène, l'éclat en étoile des sources,
// les taches de lumière au sol des appareils qui n'ont pas de vraie lampe dans le calcul, et la mesure de fluidité.
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

// ---------- Sol réfléchissant ----------
export type Finish = "beton" | "parquet" | "noir";
export const FINISHES: Record<Finish, { label: string; strength: number; blur: number; rough: number }> = {
  beton: { label: "Mat", strength: 0.1, blur: 2.6, rough: 0.82 },
  parquet: { label: "Parquet verni", strength: 0.55, blur: 1.15, rough: 0.34 },
  noir: { label: "Tapis de danse noir", strength: 0.8, blur: 0.75, rough: 0.22 },
};
const MIRROR_SHADER = {
  name: "FloorShine",
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uStrength: { value: 0.5 }, uBlur: { value: 1 }, uRough: { value: null }, uHasRough: { value: 0 }, uTile: { value: 2 } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() { vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float uStrength; uniform float uBlur; uniform sampler2D uRough; uniform float uHasRough; uniform float uTile; varying vec4 vUv; varying vec3 vW;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      if (vUv.w < 1e-4) discard; // derrière l'œil : pas de reflet, et surtout pas de division par zéro
      vec2 uv = vUv.xy / vUv.w; vec3 V = cameraPosition - vW; float dist = length(V); V /= dist;
      // un sol verni reflète peu quand on le regarde d'en haut, beaucoup en vue rasante
      float fres = 0.07 + 0.93 * pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
      // reflet adouci : plusieurs lectures autour du point, étirées dans la hauteur comme sur un vrai sol
      float r = uBlur * 0.0035; vec3 c = texture2D(tDiffuse, uv).rgb * 0.2;
      c += texture2D(tDiffuse, uv + vec2( 0.62,  0.90) * r * vec2(1.0, 2.6)).rgb * 0.1; c += texture2D(tDiffuse, uv + vec2(-0.71,  0.55) * r * vec2(1.0, 2.6)).rgb * 0.1;
      c += texture2D(tDiffuse, uv + vec2( 0.33, -0.95) * r * vec2(1.0, 2.6)).rgb * 0.1; c += texture2D(tDiffuse, uv + vec2(-0.40, -0.70) * r * vec2(1.0, 2.6)).rgb * 0.1;
      c += texture2D(tDiffuse, uv + vec2( 1.00,  0.10) * r * vec2(1.0, 2.6)).rgb * 0.1; c += texture2D(tDiffuse, uv + vec2(-1.00, -0.15) * r * vec2(1.0, 2.6)).rgb * 0.1;
      c += texture2D(tDiffuse, uv + vec2( 0.05,  1.60) * r * vec2(1.0, 2.6)).rgb * 0.1; c += texture2D(tDiffuse, uv + vec2(-0.10, -1.60) * r * vec2(1.0, 2.6)).rgb * 0.1;
      // les joints et le veinage du plancher cassent le reflet
      float grain = mix(1.0, 1.0 - 0.75 * texture2D(uRough, vW.xz / uTile).r, uHasRough);
      float far = smoothstep(70.0, 28.0, dist);
      gl_FragColor = vec4(c * color * uStrength * fres * grain * far, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
export interface Mirror { mesh: THREE.Mesh; place(x: number, y: number, z: number, w: number, d: number): void; finish(f: Finish, rough: THREE.Texture | null, tile: number): void; resize(w: number, h: number): void; dispose(): void }
/** Une nappe posée au ras du sol : elle ajoute le reflet de la scène par-dessus le sol éclairé. */
export function makeMirror(): Mirror {
  const m = new Reflector(new THREE.PlaneGeometry(1, 1), { textureWidth: 512, textureHeight: 512, clipBias: 0.003, shader: MIRROR_SHADER, color: 0xffffff, multisample: 0 });
  const mat = m.material as THREE.ShaderMaterial; mat.transparent = true; mat.blending = THREE.AdditiveBlending; mat.depthWrite = false; mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2; m.userData.noAO = true; m.userData.helper = false; m.raycast = () => {}; m.frustumCulled = false;
  return { mesh: m,
    place(x, y, z, w, d) { m.position.set(x, y, z); m.scale.set(w, d, 1); m.updateMatrixWorld(); },
    finish(f, rough, tile) { const F = FINISHES[f]; mat.uniforms.uStrength.value = F.strength; mat.uniforms.uBlur.value = F.blur; mat.uniforms.uRough.value = rough; mat.uniforms.uHasRough.value = rough ? 1 : 0; mat.uniforms.uTile.value = tile; },
    resize(w, h) { m.getRenderTarget().setSize(Math.max(64, Math.round(w)), Math.max(64, Math.round(h))); },
    dispose() { m.dispose(); } };
}

// ---------- Éclat des sources : un cœur, un halo, et six fines aigrettes comme à travers un objectif ----------
let star: THREE.Texture | null = null;
export function starTexture(): THREE.Texture {
  if (star) return star; const n = 512, c = document.createElement("canvas"); c.width = c.height = n; const x = c.getContext("2d")!, h = n / 2;
  const g = x.createRadialGradient(h, h, 0, h, h, h); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.03, "rgba(255,255,255,0.95)"); g.addColorStop(0.08, "rgba(255,255,255,0.42)"); g.addColorStop(0.2, "rgba(255,255,255,0.12)"); g.addColorStop(0.45, "rgba(255,255,255,0.03)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, n, n); x.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) { x.save(); x.translate(h, h); x.rotate((i * Math.PI) / 3 + 0.26); const len = i === 0 ? h : h * 0.72;
    const s = x.createLinearGradient(-len, 0, len, 0); s.addColorStop(0, "rgba(255,255,255,0)"); s.addColorStop(0.35, "rgba(255,255,255,0.10)"); s.addColorStop(0.5, "rgba(255,255,255,0.75)"); s.addColorStop(0.65, "rgba(255,255,255,0.10)"); s.addColorStop(1, "rgba(255,255,255,0)");
    for (const [t, a] of [[1.2, 1], [3.5, 0.35], [8, 0.1]] as const) { x.globalAlpha = a; x.fillStyle = s; x.beginPath(); x.moveTo(-len, 0); x.quadraticCurveTo(0, -t, len, 0); x.quadraticCurveTo(0, t, -len, 0); x.fill(); }
    x.restore(); }
  star = new THREE.CanvasTexture(c); star.colorSpace = THREE.SRGBColorSpace; return star;
}

// ---------- Taches de lumière au sol : pour les appareils au-delà du nombre de vraies lampes calculées ----------
let disc: THREE.Texture | null = null;
function discTexture() { if (disc) return disc; const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.55, "rgba(255,255,255,0.85)"); g.addColorStop(0.85, "rgba(255,255,255,0.25)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); disc = new THREE.CanvasTexture(c); disc.colorSpace = THREE.SRGBColorSpace; return disc; }
export interface Pools { group: THREE.Group; begin(): void; add(pos: THREE.Vector3, dir: THREE.Vector3, angleDeg: number, color: THREE.Color, level: number, floorY: number): void; count(): number }
export function makePools(max = 64): Pools {
  const group = new THREE.Group(), geo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2); let used = 0;
  const all = Array.from({ length: max }, () => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: discTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); m.visible = false; m.renderOrder = 1; m.userData.noAO = true; m.raycast = () => {}; group.add(m); return m; });
  return { group, begin() { for (let i = 0; i < used; i++) all[i].visible = false; used = 0; }, count: () => used,
    add(pos, dir, angleDeg, color, level, floorY) {
      if (used >= max || dir.y > -0.08) return; const t = (pos.y - floorY) / -dir.y; if (t <= 0.3 || t > 45) return;
      const m = all[used++], r = Math.tan((Math.min(80, angleDeg) / 2) * (Math.PI / 180)) * t, cos = -dir.y;
      m.position.set(pos.x + dir.x * t, floorY + 0.006, pos.z + dir.z * t); m.rotation.y = Math.atan2(-dir.z, dir.x); m.scale.set(Math.max(0.05, r / Math.max(0.25, cos)), 1, Math.max(0.05, r));
      // même éclairement qu'une vraie lampe : intensité / distance², réduit par l'inclinaison, renvoyé par un sol mat sombre
      const k = Math.min(6, (level * 900 * cos) / (t * t) * 0.045); (m.material as THREE.MeshBasicMaterial).color.copy(color).multiplyScalar(k); m.visible = true; } };
}

// ---------- Mesure : quelle carte graphique, combien d'images par seconde, combien de triangles ----------
export function gpuName(renderer: THREE.WebGLRenderer): string {
  try { const gl = renderer.getContext(), ext = gl.getExtension("WEBGL_debug_renderer_info"); const raw = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const m = /ANGLE \([^,]*,\s*([^,(]+)/.exec(raw); return (m ? m[1] : raw).replace(/\s+Direct3D.*$/, "").trim().slice(0, 60); } catch { return "inconnue"; }
}
