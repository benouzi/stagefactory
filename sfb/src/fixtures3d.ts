// Les appareils en 3D quand il n'y a pas de fiche GDTF avec maillage : lyres, PAR, découpes, Fresnel, blinders, barres, poursuites, enceintes, vidéoprojecteurs.
// Tout est dessiné ici, à partir de formes simples : rien n'est repris d'un fabricant. Chaque type est modelé une fois puis réutilisé par tous les appareils du même type.
import * as THREE from "three";
import { starTexture } from "./shine3d";
import { domainOf, type SymbolDef } from "./library";
import { Kit, ball, cyl, dome, kmat, lathe, meshes, profile, prism, rbox, rod, tile, torus, type Geos } from "./kit3d";

// ---------- Faisceau volumétrique : un cône de brume éclairée, dense près de la lentille, doux sur ses bords ----------
export const beamMaterial = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  uniforms: { uColor: { value: new THREE.Color(1, 0.85, 0.6) }, uLevel: { value: 0 }, uHaze: { value: 0.5 }, uGobo: { value: null as THREE.Texture | null }, uHasGobo: { value: 0 } },
  vertexShader: `varying float vT; varying float vA; varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main() { vT = uv.y; vA = uv.x; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uLevel; uniform float uHaze; uniform sampler2D uGobo; uniform float uHasGobo; varying float vT; varying float vA; varying vec3 vN; varying vec3 vV; varying vec3 vW;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y), mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
    void main() {
      // Un faisceau net : son éclat suit l'épaisseur de brume traversée (maximale dans l'axe, nulle sur la silhouette), avec un bord franc et non un dégradé mou.
      float nv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
      float edge = smoothstep(0.0, 0.22, nv);                        // le bord du cône : une transition courte, donc un contour lisible
      float body = edge * (0.42 + 0.58 * nv);                        // le cœur un peu plus dense que les flancs
      float t = clamp(vT, 0.0, 1.0);                                 // 1 à la lentille, 0 au bout (borné : une valeur négative donnerait un calcul impossible)
      float fall = mix(0.2, 1.0, pow(t, 1.25));                      // la lumière se dilue en s'élargissant, sans disparaître avant la fin
      float tip = smoothstep(0.0, 0.035, t);                         // le bout s'efface sur une très courte distance : le faisceau touche ce qu'il éclaire
      // un gobo découpe le faisceau en rais : on lit l'image sur deux cercles, autour de l'axe
      float ang = vA * 6.2831853; vec2 d = vec2(cos(ang), sin(ang));
      float g = mix(1.0, 0.16 + 0.84 * 0.5 * (texture2D(uGobo, vec2(0.5) + d * 0.36).r + texture2D(uGobo, vec2(0.5) + d * 0.2).r), uHasGobo);
      float mist = 0.93 + 0.14 * noise(vW * 1.3) * noise(vW * 0.4 + 3.7);   // un léger grain de brume, sans brouiller le contour
      // la brume rend le faisceau visible, elle ne le noie pas : même à fond, chaque faisceau reste distinct de ses voisins
      float haze = 0.05 + 0.37 * pow(clamp(uHaze, 0.0, 1.0), 0.8);
      float a = max(0.0, uLevel * haze * g * body * fall * tip * mist); gl_FragColor = vec4(uColor * a, a); }`,
});
// cône unitaire : sommet (la lentille) à l'origine, axe vers −Y, longueur 1, rayon 1 au bout ; uv.y = 1 à la lentille
export const BEAM_GEO = (() => { const g = new THREE.CylinderGeometry(0.035, 1, 1, 56, 1, true); g.translate(0, -0.5, 0); g.userData.shared = true; return g; })();

/** Verre d'une optique : sombre et brillant éteint, lumineux allumé. Une matière par appareil (sa couleur change). */
export const lensMat = () => new THREE.MeshStandardMaterial({ color: 0x06080b, roughness: 0.08, metalness: 0.55, emissive: 0x000000, emissiveIntensity: 1 });

// Éclat d'une source vue de face : un halo qui grandit quand on regarde dans le faisceau.
let glowTex: THREE.Texture | null = null;
function glowTexture(): THREE.Texture {
  if (glowTex) return glowTex; const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.08, "rgba(255,255,255,0.85)"); g.addColorStop(0.22, "rgba(255,255,255,0.32)"); g.addColorStop(0.5, "rgba(255,255,255,0.08)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace; return glowTex;
}
export interface Rig3D { root: THREE.Group; pan: THREE.Object3D | null; tilt: THREE.Object3D | null; beams: { holder: THREE.Object3D; mesh: THREE.Mesh; angle: number; glow?: THREE.Sprite }[]; lenses: THREE.MeshStandardMaterial[]; gdtf: boolean; gobos?: Map<string, THREE.Texture> }
/** Un faisceau et son éclat, accrochés à la sortie de l'optique (le faisceau part vers −Y). */
export function addBeam(beams: Rig3D["beams"], parent: THREE.Object3D, x: number, y: number, z: number, angle: number, glowSize = 0.3): void {
  const h = new THREE.Group(); h.position.set(x, y, z); parent.add(h);
  const b = new THREE.Mesh(BEAM_GEO, beamMaterial()); b.visible = false; b.renderOrder = 5; h.add(b);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture(), color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.position.y = -0.03; glow.visible = false; glow.renderOrder = 6; glow.userData.noAO = true; glow.userData.size = glowSize; h.add(glow);
  beams.push({ holder: h, mesh: b, angle, glow });
}

// ---------- gabarits : un par type d'appareil et par pose (suspendu ou au sol) ----------
interface Tpl { root: Geos; pan: Geos | null; panY: number; tilt: Geos | null; tiltY: number; lens: { where: "root" | "tilt"; geo: THREE.BufferGeometry }[]; beams: { x: number; y: number; z: number; angle: number; glow: number }[] }
const cache = new Map<string, Tpl>();
const hex = (n: number, step: number): [number, number][] => { const out: [number, number][] = [[0, 0]]; for (let ring = 1; ring <= n; ring++) for (let s = 0; s < 6; s++) for (let i = 0; i < ring; i++) { const a0 = (s * 60 * Math.PI) / 180, a1 = ((s + 2) * 60 * Math.PI) / 180; out.push([(Math.cos(a0) * ring + Math.cos(a1) * i) * step, (Math.sin(a0) * ring + Math.sin(a1) * i) * step]); } return out; };

/** Crochet : une mâchoire autour du tube (le tube passe en y = 0, le long de x), et sa tige jusqu'à l'appareil. Dessiné « debout », retourné ensuite. */
function clamp(k: Kit, x: number, top: number) {
  k.add("steel", torus(0.031, 0.008, Math.PI * 1.55, 20, 8), x, 0, 0, 0, 90, -50);
  k.add("steel", rbox(0.034, 0.03, 0.05, 0.006), x, 0.042, 0); k.add("alu", cyl(0.006, 0.006, 0.06, 8), x, 0.03, 0.036, 20, 0, 0); k.add("dark", cyl(0.014, 0.014, 0.012, 12), x, 0.058, 0.045, 20, 0, 0);
  k.add("steel", cyl(0.008, 0.008, Math.max(0.01, top - 0.05), 8), x, (top + 0.05) / 2, 0);
  /* élingue de sécurité : une boucle fine à côté du crochet */
  k.add("steel", torus(0.045, 0.0022, Math.PI * 2, 24, 5), x + 0.03, 0.02, 0, 0, 90, 0);
}
/** Lyre fixe en U : deux flasques, une traverse, les molettes de blocage. Renvoie la hauteur de l'axe de bascule. */
function yoke(k: Kit, ax: number, H: number, o: number, hung: boolean, clamps: number[] = [0]): number {
  const t = 0.006, w = 0.046;
  k.add("steel", rbox(2 * ax + t, t, w, 0.002), 0, o + t / 2, 0);
  k.pair("steel", () => rbox(t, H, w, 0.002), ax, o + H / 2, 0);
  k.pair("steel", () => cyl(w / 2, w / 2, t, 16), ax, o + H, 0, 0, 0, 90);
  k.pair("dark", () => cyl(0.024, 0.021, 0.022, 14), ax + 0.016, o + H - 0.004, 0, 0, 0, 90); k.pair("alu", () => cyl(0.009, 0.009, 0.034, 8), ax + 0.012, o + H - 0.004, 0, 0, 0, 90);
  if (hung) for (const x of clamps) clamp(k, x, o);
  return o + H - 0.004;
}

function design(sym: SymbolDef, hung: boolean): Tpl {
  const R = new Kit(), P = new Kit(), T = new Kit(), L = new Kit(), dom = domainOf(sym), s = sym.size ?? { w: 300, d: 300, h: 300 }, key = sym.key;
  const o = hung ? 0.078 : 0; let panY = 0, tiltY = 0, hasPan = false, hasTilt = true; const beams: Tpl["beams"] = []; let lensAt: "root" | "tilt" = "tilt";
  const done = (): Tpl => ({ root: R.geos(hung), pan: hasPan ? P.geos(hung) : null, panY, tilt: hasTilt ? T.geos() : null, tiltY, lens: [...L.geos().values()].map((geo) => ({ where: lensAt, geo })), beams });

  // ----- son et vidéo : un boîtier aux cotes de l'appareil -----
  if (dom !== "light") {
    const w = s.w / 1000, h = s.h / 1000, d = s.d / 1000, y0 = hung ? 0.08 : 0; hasTilt = false; lensAt = "root";
    if (dom === "sound") {
      if (key === "wedge") { // retour de scène : un coin, la grille tournée vers l'artiste
        const pts: [number, number][] = [[-d / 2, 0], [d / 2, 0], [d / 2, h * 0.3], [-d * 0.02, h], [-d * 0.3, h]];
        R.add("cab", profile(pts, w, 0.012), 0, y0, 0);
        const cz = (d / 2 - d * 0.02) / 2, cy = h * 0.65, len = Math.hypot(d * 0.52, h * 0.7), a = (Math.atan2(d * 0.52, h * 0.7) * 180) / Math.PI;
        R.add("grille", tile(rbox(w * 0.9, len * 0.86, 0.014, 0.005), (w * 0.9) / 0.011, (len * 0.86) / 0.011), 0, y0 + cy + 0.004, cz + 0.004, -a, 0, 0);
        R.pair("dark", () => rbox(0.012, h * 0.22, d * 0.3, 0.004), w / 2 + 0.001, y0 + h * 0.45, -d * 0.12);
      } else {
        const taper = key === "pt12" || key === "la8" ? 0.82 : 1; // vue de dessus : l'arrière se resserre
        R.add("cab", prism([[-w / 2, d / 2], [w / 2, d / 2], [(w / 2) * taper, -d / 2], [(-w / 2) * taper, -d / 2]], h, 0.012), 0, y0, 0);
        R.add("grille", tile(rbox(w * 0.93, h * 0.9, 0.016, 0.006), (w * 0.93) / 0.011, (h * 0.9) / 0.011), 0, y0 + h / 2, d / 2 + 0.003);
        R.add("alu", rbox(Math.min(0.07, w * 0.16), 0.014, 0.004, 0.002), 0, y0 + h * 0.1, d / 2 + 0.0125);
        if (key === "la8") { R.pair("steel", () => rbox(0.008, h * 0.86, d * 0.5, 0.002), w / 2 + 0.003, y0 + h / 2, d * 0.1); R.pair("alu", () => cyl(0.012, 0.012, 0.014, 10), w / 2 + 0.008, y0 + h * 0.8, d * 0.25, 0, 0, 90); R.pair("alu", () => cyl(0.012, 0.012, 0.014, 10), w / 2 + 0.008, y0 + h * 0.2, d * 0.25, 0, 0, 90); }
        else { R.pair("dark", () => rbox(0.012, Math.min(0.14, h * 0.3), Math.min(0.2, d * 0.45), 0.004), (w / 2) * (taper + 1) / 2 + 0.001, y0 + h * 0.62, 0, 0, taper < 1 ? -6 : 0, 0); }
        if (!hung && key === "sub18") for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) R.add("dark", cyl(0.025, 0.025, 0.012, 12), x * w * 0.38, 0.006, z * d * 0.36);
      }
      if (hung) { R.add("steel", rbox(Math.min(w * 0.6, 0.3), 0.008, 0.05, 0.002), 0, 0.076, 0); clamp(R, 0, 0.074); }
    } else { // vidéoprojecteur : carter clair, objectif en façade, ouïes sur les côtés
      R.add("white", rbox(w, h, d, Math.min(0.03, h * 0.22), 4), 0, y0 + h / 2, 0);
      R.add("gloss", rbox(w * 0.96, h * 0.74, 0.008, 0.003), 0, y0 + h / 2, d / 2 - 0.002);
      const lr = Math.max(0.03, Math.min(h * 0.36, 0.085));
      R.add("gloss", lathe([[lr * 0.9, 0], [lr, 0.012], [lr, 0.05], [lr * 0.92, 0.062], [lr * 0.8, 0.062], [lr * 0.74, 0.045]], 32), 0, y0 + h / 2, d / 2 - 0.004, 90, 0, 0);
      R.add("alu", torus(lr * 0.97, 0.004, Math.PI * 2, 32, 6), 0, y0 + h / 2, d / 2 + 0.03); R.add("glass", dome(lr * 0.76, 0.3), 0, y0 + h / 2, d / 2 + 0.04, -90, 0, 0);
      R.pair("dark", () => rbox(0.006, h * 0.55, d * 0.6, 0.002), w / 2, y0 + h / 2, -d * 0.05);
      R.add("dark", rbox(w * 0.7, h * 0.5, 0.006, 0.002), 0, y0 + h / 2, -d / 2);
      R.add("screen", rbox(0.012, 0.004, 0.002, 0), w * 0.38, y0 + h * 0.86, d / 2 + 0.003);
      if (hung) { R.add("steel", rbox(Math.min(0.28, w * 0.6), 0.008, Math.min(0.28, d * 0.6), 0.002), 0, 0.078, 0); R.add("steel", cyl(0.02, 0.02, 0.05, 12), 0, 0.055, 0); clamp(R, 0, 0.04); }
      else for (const [x, z] of [[-1, 1], [1, 1], [0, -1]]) R.add("dark", cyl(0.016, 0.016, 0.012, 10), x * w * 0.4, 0.004, z * d * 0.4);
    }
    return done();
  }

  // ----- lyres : base, lyre motorisée, tête -----
  if (sym.moving) {
    const wash = key === "wash", beam = key === "beam", HR = wash ? 0.165 : beam ? 0.125 : 0.13, ax = HR + 0.052;
    hasPan = true;
    if (hung) clamp(R, 0, o); else for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) R.add("dark", cyl(0.02, 0.022, 0.014, 12), x * 0.15, 0.007, z * 0.11);
    const b0 = o + (hung ? 0 : 0.014);
    R.add("body", rbox(0.38, 0.112, 0.3, 0.022, 4), 0, b0 + 0.056, 0);
    R.add("gloss", rbox(0.23, 0.062, 0.006, 0.003), 0, b0 + 0.058, 0.149); R.add("screen", rbox(0.075, 0.036, 0.003, 0.001), -0.05, b0 + 0.06, 0.1525);
    for (let i = 0; i < 4; i++) R.add("fin", cyl(0.008, 0.008, 0.004, 10), 0.02 + i * 0.024, b0 + 0.06, 0.153, 90, 0, 0);
    R.pair("dark", () => rbox(0.01, 0.034, 0.18, 0.004), 0.191, b0 + 0.07, 0);                                            // poignées en creux
    for (const x of [-0.11, -0.07, 0.03]) R.add("alu", cyl(0.012, 0.012, 0.016, 12), x, b0 + 0.05, -0.152, 90, 0, 0);      // connecteurs
    R.add("dark", rbox(0.09, 0.05, 0.004, 0.002), 0.11, b0 + 0.058, -0.15);                                              // ouïe
    R.add("fin", cyl(0.125, 0.135, 0.022, 36), 0, b0 + 0.123, 0);                                                         // couronne de rotation
    panY = b0 + 0.134; tiltY = wash ? 0.265 : 0.3;
    // la lyre : une traverse et deux bras galbés
    P.add("body", rbox(2 * ax + 0.07, 0.07, 0.165, 0.03, 4), 0, 0.036, 0);
    P.pair("body", () => rbox(0.07, tiltY + 0.075, 0.155, 0.03, 4), ax, (tiltY + 0.075) / 2 + 0.005, 0);
    P.pair("gloss", () => cyl(0.062, 0.058, 0.012, 28), ax + 0.036, tiltY, 0, 0, 0, -90); P.pair("fin", () => cyl(0.02, 0.02, 0.016, 14), ax + 0.038, tiltY, 0, 0, 0, -90);
    P.pair("dark", () => rbox(0.004, 0.11, 0.07, 0.002), ax + 0.0345, tiltY * 0.42, 0);
    // la tête, optique vers −Y
    T.pair("gloss", () => cyl(0.045, 0.045, 0.03, 18), HR - 0.004, 0, 0, 0, 0, 90);
    if (wash) {
      T.add("body", lathe([[0, 0.115], [0.085, 0.113], [0.14, 0.09], [0.162, 0.045], [0.165, -0.085], [0.16, -0.118], [0.15, -0.126], [0, -0.126]]));
      for (let i = 0; i < 4; i++) T.add("fin", cyl(0.164 - i * 0.012, 0.158 - i * 0.012, 0.006, 36), 0, 0.05 + i * 0.016, 0);
      T.add("gloss", cyl(0.15, 0.15, 0.004, 36), 0, -0.127, 0);
      for (const [x, z] of hex(2, 0.062)) { L.add("lens", dome(0.027, 0.4, 14), x, -0.129, z); T.add("fin", torus(0.0285, 0.003, Math.PI * 2, 14, 5), x, -0.1295, z, 90, 0, 0); }
      beams.push({ x: 0, y: -0.13, z: 0, angle: sym.beamAngleDeg ?? 30, glow: 0.42 });
    } else {
      const fl = beam ? 0.22 : 0.245; // longueur avant
      T.add("body", beam
        ? lathe([[0, 0.18], [0.055, 0.178], [0.088, 0.16], [0.1, 0.1], [0.1, -0.02], [0.118, -0.07], [0.125, -0.19], [0.125, -fl], [0.112, -fl - 0.006], [0.108, -fl + 0.012], [0, -fl + 0.012]])
        : lathe([[0, 0.2], [0.06, 0.198], [0.1, 0.178], [0.113, 0.13], [0.113, 0.055], [0.13, 0.035], [0.13, -0.15], [0.119, -0.168], [0.119, -fl + 0.022], [0.129, -fl + 0.012], [0.129, -fl], [0.114, -fl - 0.004], [0.108, -fl + 0.012], [0, -fl + 0.012]]));
      const n = beam ? 4 : 5; for (let i = 0; i < n; i++) T.add("fin", cyl((beam ? 0.104 : 0.118), (beam ? 0.104 : 0.118), 0.007, 36), 0, 0.068 + i * 0.016, 0);
      T.add("gloss", torus(beam ? 0.117 : 0.121, 0.007, Math.PI * 2, 36, 8), 0, -fl - 0.001, 0, 90, 0, 0);
      T.pair("dark", () => rbox(0.004, 0.09, 0.05, 0.002), beam ? 0.1 : 0.113, 0.12, 0);
      L.add("lens", dome(beam ? 0.108 : 0.102, beam ? 0.34 : 0.2), 0, -fl + 0.012, 0);
      beams.push({ x: 0, y: -fl, z: 0, angle: sym.beamAngleDeg ?? (beam ? 4 : 18), glow: beam ? 0.5 : 0.4 });
    }
    return done();
  }

  // ----- barre LED : dix cellules, deux flasques en bout -----
  if (key === "barre") {
    tiltY = yoke(R, 0.512, 0.1, o, hung, [-0.3, 0.3]);
    T.add("body", rbox(1, 0.074, 0.086, 0.012, 3)); T.pair("dark", () => rbox(0.012, 0.078, 0.09, 0.004), 0.497, 0, 0);
    for (let i = 0; i < 5; i++) T.add("fin", rbox(0.9, 0.004, 0.092, 0.001), 0, 0.012 + i * 0.006, 0);
    T.add("gloss", rbox(0.97, 0.004, 0.07, 0.001), 0, -0.037, 0);
    for (let i = 0; i < 10; i++) L.add("lens", rbox(0.084, 0.006, 0.058, 0.003), -0.45 + i * 0.1, -0.039, 0);
    beams.push({ x: 0, y: -0.045, z: 0, angle: sym.beamAngleDeg ?? 40, glow: 0.55 });
    return done();
  }
  // ----- blinder : deux lampes dans un caisson -----
  if (key === "blinder") {
    tiltY = yoke(R, 0.252, 0.2, o, hung);
    T.add("body", rbox(0.47, 0.15, 0.25, 0.018, 3)); for (let i = 0; i < 7; i++) T.add("fin", rbox(0.4, 0.02, 0.005, 0.001), 0, 0.075, -0.09 + i * 0.03);
    for (const x of [-0.115, 0.115]) { T.add("alu", lathe([[0.07, 0], [0.096, -0.03], [0.1, -0.03], [0.1, -0.036], [0.094, -0.036]], 32), x, -0.046, 0); T.add("gloss", torus(0.099, 0.006, Math.PI * 2, 32, 6), x, -0.079, 0, 90, 0, 0); L.add("lens", dome(0.09, 0.12), x, -0.07, 0); }
    beams.push({ x: 0, y: -0.078, z: 0, angle: sym.beamAngleDeg ?? 50, glow: 0.7 });
    return done();
  }
  // ----- poursuite : un long corps, sur pied quand elle est au sol -----
  if (key === "poursuite") {
    let base = o;
    if (!hung) { base = 1.25; R.add("steel", cyl(0.022, 0.022, 0.75, 12), 0, 0.875, 0); R.add("alu", cyl(0.03, 0.03, 0.6, 12), 0, 0.45, 0); R.add("dark", cyl(0.04, 0.04, 0.05, 12), 0, 0.75, 0);
      for (let i = 0; i < 3; i++) { const a = (i * 120 + 30) * Math.PI / 180, x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55; R.add("steel", rod([0, 0.62, 0], [x, 0.02, z], 0.014)); R.add("steel", rod([0, 0.2, 0], [x * 0.5, 0.31, z * 0.5], 0.008)); R.add("dark", ball(0.022, 10, 8), x, 0.02, z); } }
    tiltY = yoke(R, 0.165, 0.26, base, hung);
    T.add("body", rbox(0.27, 0.72, 0.27, 0.03, 4), 0, 0.12, 0); for (let i = 0; i < 6; i++) T.add("fin", rbox(0.276, 0.01, 0.276, 0.002), 0, 0.3 + i * 0.026, 0);
    T.add("body", cyl(0.1, 0.1, 0.34, 32), 0, -0.4, 0); T.add("gloss", cyl(0.108, 0.108, 0.04, 32), 0, -0.56, 0); T.add("fin", cyl(0.105, 0.105, 0.03, 32), 0, -0.3, 0);
    T.add("steel", torus(0.06, 0.008, Math.PI, 16, 6), 0, 0.485, 0, 0, 90, 0); T.pair("dark", () => cyl(0.014, 0.014, 0.1, 10), 0.15, 0.3, 0.06, 0, 0, 70);
    L.add("lens", dome(0.094, 0.22), 0, -0.578, 0); beams.push({ x: 0, y: -0.585, z: 0, angle: sym.beamAngleDeg ?? 8, glow: 0.45 });
    return done();
  }
  // ----- découpe : lanterne à ailettes, couteaux, long tube d'optique, porte-filtre -----
  if (key.startsWith("decoupe")) {
    const wide = key === "decoupe-l", tl = wide ? 0.2 : 0.27, tr = wide ? 0.078 : 0.068, f = -tl - 0.03;
    tiltY = yoke(R, 0.132, 0.23, o, hung);
    T.add("body", lathe([[0, 0.31], [0.05, 0.308], [0.086, 0.288], [0.1, 0.24], [0.1, 0.125], [0.078, 0.075], [0.078, 0.05], [0, 0.05]]));
    for (let i = 0; i < 6; i++) T.add("fin", cyl(0.107, 0.107, 0.006, 32), 0, 0.14 + i * 0.02, 0);
    T.add("body", rbox(0.156, 0.056, 0.156, 0.01), 0, 0.024, 0);                                                         // boîte à couteaux
    for (let i = 0; i < 4; i++) { const a = i * 90 + 45, x = Math.cos(a * Math.PI / 180) * 0.108, z = Math.sin(a * Math.PI / 180) * 0.108; T.add("alu", rbox(0.05, 0.004, 0.022, 0.001), x, 0.024, z, 0, -a, 0); T.add("dark", cyl(0.007, 0.007, 0.014, 8), x * 1.2, 0.024, z * 1.2); }
    T.add("body", cyl(tr, tr, tl, 32), 0, -tl / 2, 0); T.add("fin", cyl(tr + 0.004, tr + 0.004, 0.03, 32), 0, -tl * 0.45, 0);
    T.add("dark", cyl(0.012, 0.012, 0.03, 10), tr + 0.008, -tl * 0.45, 0, 0, 0, 90);                                      // molette de mise au point
    T.add("body", lathe([[tr, 0], [tr + 0.012, -0.012], [tr + 0.012, -0.03], [tr - 0.006, -0.03]], 32), 0, -tl, 0);
    T.add("body", rbox(0.17, 0.016, 0.17, 0.004), 0, f - 0.006, 0); T.add("dark", cyl(tr - 0.004, tr - 0.004, 0.018, 32), 0, f - 0.006, 0);
    T.add("steel", torus(0.03, 0.005, Math.PI, 12, 6), 0, 0.315, 0, 0, 90, 0);                                            // poignée arrière
    L.add("lens", dome(tr - 0.006, 0.16), 0, f - 0.012, 0); beams.push({ x: 0, y: f - 0.018, z: 0, angle: sym.beamAngleDeg ?? (wide ? 36 : 22), glow: 0.34 });
    return done();
  }
  // ----- Fresnel et PC : corps court, volets coupe-flux -----
  if (key === "fresnel" || key === "pc1k") {
    tiltY = yoke(R, 0.142, 0.22, o, hung);
    T.add("body", lathe([[0, 0.15], [0.06, 0.148], [0.105, 0.125], [0.118, 0.08], [0.118, -0.1], [0, -0.1]]));
    for (let i = 0; i < 5; i++) T.add("fin", cyl(0.123, 0.123, 0.006, 32), 0, 0.02 + i * 0.02, 0);
    T.add("body", rbox(0.25, 0.016, 0.25, 0.004), 0, -0.106, 0);
    T.add("dark", cyl(0.014, 0.014, 0.03, 10), 0.128, -0.04, 0, 0, 0, 90); T.add("steel", torus(0.032, 0.005, Math.PI, 12, 6), 0, 0.152, 0, 0, 90, 0);
    for (let i = 0; i < 4; i++) { // quatre volets, ouverts en corolle
      const a = i * 90, big = i % 2 === 0, len = big ? 0.15 : 0.12, wd = big ? 0.24 : 0.2, c = Math.cos(a * Math.PI / 180), sn = Math.sin(a * Math.PI / 180), open = 52 * Math.PI / 180, r0 = 0.122;
      const g = rbox(wd, len, 0.003, 0.001); g.translate(0, -len / 2, 0); g.rotateX(-open); g.translate(0, -0.114, r0); g.rotateY(a * Math.PI / 180); void c; void sn; T.add("gloss", g);
    }
    L.add("lens", dome(0.1, key === "pc1k" ? 0.34 : 0.1), 0, -0.114, 0);
    if (key === "fresnel") for (const r of [0.03, 0.055, 0.08]) T.add("glass", torus(r, 0.0025, Math.PI * 2, 28, 5), 0, -0.1235, 0, 90, 0, 0);
    beams.push({ x: 0, y: -0.126, z: 0, angle: sym.beamAngleDeg ?? 35, glow: 0.4 });
    return done();
  }
  // ----- PAR : corps court à ailettes, cellules LED ou grande lentille de zoom -----
  const zoom = key === "par-zoom", len = zoom ? 0.19 : 0.15, fy = -len / 2;
  tiltY = yoke(R, 0.128, 0.19, o, hung);
  T.add("body", lathe([[0, len / 2], [0.06, len / 2 - 0.002], [0.098, len / 2 - 0.022], [0.108, len / 2 - 0.07], [0.108, fy + 0.012], [0.114, fy + 0.004], [0.114, fy - 0.006], [0.104, fy - 0.006], [0.1, fy + 0.004], [0, fy + 0.004]]));
  for (let i = 0; i < 4; i++) T.add("fin", cyl(0.112 - i * 0.008, 0.108 - i * 0.008, 0.005, 32), 0, len / 2 - 0.066 + i * 0.014, 0);
  T.add("dark", rbox(0.06, 0.004, 0.04, 0.001), 0, len / 2 + 0.001, 0);
  if (zoom) { L.add("lens", dome(0.096, 0.3), 0, fy + 0.004, 0); }
  else { T.add("gloss", cyl(0.1, 0.1, 0.003, 32), 0, fy + 0.003, 0); for (const [x, z] of hex(1, 0.064)) { L.add("lens", dome(0.029, 0.42, 14), x, fy + 0.001, z); T.add("fin", torus(0.0305, 0.003, Math.PI * 2, 14, 5), x, fy + 0.0008, z, 90, 0, 0); } }
  beams.push({ x: 0, y: fy - 0.008, z: 0, angle: sym.beamAngleDeg ?? 28, glow: 0.36 });
  return done();
}

/** Le modèle 3D d'un appareil sans fiche GDTF. hung : suspendu sous son point d'accroche (sinon posé, point d'appui en y = 0). */
export function genericModel(sym: SymbolDef, hung: boolean): Rig3D {
  const id = sym.key + (hung ? "|h" : "|f") + "|" + (sym.beamAngleDeg ?? "") + "|" + (sym.size ? `${sym.size.w}x${sym.size.d}x${sym.size.h}` : "");
  let t = cache.get(id); if (!t) { t = design(sym, hung); cache.set(id, t); }
  const dir = hung ? -1 : 1, root = new THREE.Group(), beams: Rig3D["beams"] = [], lenses: THREE.MeshStandardMaterial[] = [];
  meshes(root, t.root, kmat);
  let pan: THREE.Group | null = null, tilt: THREE.Group | null = null;
  if (t.pan) { pan = new THREE.Group(); pan.position.y = dir * t.panY; root.add(pan); meshes(pan, t.pan, kmat); }
  if (t.tilt) { tilt = new THREE.Group(); tilt.position.y = dir * t.tiltY; (pan ?? root).add(tilt); meshes(tilt, t.tilt, kmat); }
  if (t.lens.length) { const m = lensMat(); lenses.push(m); for (const l of t.lens) { const d = new THREE.Mesh(l.geo, m); (l.where === "tilt" && tilt ? tilt : root).add(d); } }
  for (const b of t.beams) addBeam(beams, tilt ?? root, b.x, b.y, b.z, b.angle, b.glow);
  return { root, pan, tilt, beams, lenses, gdtf: false };
}
