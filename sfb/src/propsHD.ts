// Modèles détaillés du catalogue : personnages, instruments, mobilier rembourré, tissus plissés, matériel de tournée.
// Dessinés ici, pièce par pièce (aucune reprise d'une bibliothèque). Chaque modèle est soudé par matière, puis gardé pour être réutilisé.
import * as THREE from "three";
import { Kit, ball, capsule, cyl, drape, lathe, prism, profile, rbox, rod, tile, torus } from "./kit3d";

const R = Math.PI / 180;
const blob = (rx: number, ry: number, rz: number, w = 22, h = 14) => { const g = ball(1, w, h); g.scale(rx, ry, rz); return g; };
/** Rend visible des deux côtés une surface mince (tissu) : on ajoute son envers. */
const both = (g: THREE.BufferGeometry) => { const a = g.index ? g.toNonIndexed() : g, b = a.clone(), p = b.attributes.position as THREE.BufferAttribute, n = b.attributes.normal as THREE.BufferAttribute, u = b.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 3) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)); p.setXYZ(i + 1, x, y, z); if (u) { const s = u.getX(i), t = u.getY(i); u.setXY(i, u.getX(i + 1), u.getY(i + 1)); u.setXY(i + 1, s, t); } }
  b.computeVertexNormals(); void n; return [a, b]; };
const tripod = (K: Kit, mat: string, x: number, z: number, top: number, spread: number, r = 0.009, turn = 0) => { for (let i = 0; i < 3; i++) { const a = (i * 120 + 90 + turn) * R, fx = x + Math.cos(a) * spread, fz = z + Math.sin(a) * spread; K.add(mat, rod([x, top, z], [fx, 0.012, fz], r, 8)); K.add("caoutchouc", ball(r * 1.7, 8, 6), fx, 0.012, fz); } };

const mrod = (K: Kit, mat: string, a: [number, number, number], b: [number, number, number], r: number, seg = 10) => { K.add(mat, rod(a, b, r, seg)); K.add(mat, rod([-a[0], a[1], a[2]], [-b[0], b[1], b[2]], r, seg)); };
type Build = (K: Kit, w: number, h: number, d: number) => void;
interface HD { nominal?: [number, number, number]; build: Build }

// ---------- personnages : silhouettes habillées, coiffées, en situation ----------
type V3 = [number, number, number];
/** Membre : tronc de cône entre deux articulations. */
const limb = (a: V3, b: V3, ra: number, rb: number, seg = 12) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = Math.max(1e-4, A.distanceTo(B)), g = cyl(ra, rb, len, seg); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize())); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); return g; };
interface Fig { hip: V3; chest: V3; head: V3; sh?: number; armR: [V3, V3]; armL: [V3, V3]; legR: [V3, V3]; legL: [V3, V3]; hair?: "court" | "long" | "chignon"; hairMat?: string; skirt?: boolean; sleeves?: boolean; jacket?: boolean; bottom?: string }
function figure(K: Kit, f: Fig) {
  const sh = f.sh ?? 0.2, bottom = f.bottom ?? "jean", [hx, hy, hz] = f.hip, [cx, cy, cz] = f.chest, [ex, ey, ez] = f.head, hm = f.hairMat ?? "cheveux", top = "$";
  // bassin, ventre, poitrine, épaules
  K.add(f.skirt ? top : bottom, blob(0.162, 0.118, 0.112), hx, hy, hz); K.add(top, blob(0.152, 0.2, 0.102), (hx + cx) / 2, (hy + cy) / 2 + 0.02, (hz + cz) / 2); K.add(top, blob(sh + 0.004, 0.158, 0.118), cx, cy, cz + 0.004);
  if (f.jacket) { K.add("sombre", blob(sh + 0.016, 0.2, 0.128), cx, cy - 0.03, cz - 0.012); K.add("sombre", blob(0.166, 0.2, 0.112), (hx + cx) / 2, (hy + cy) / 2, (hz + cz) / 2 - 0.012); }
  if (f.skirt) K.add(top, lathe([[0.15, 0.06], [0.168, -0.06], [0.2, -0.42], [0.19, -0.44], [0, -0.43]], 20), hx, hy, hz); else K.add("noir", torus(0.158, 0.012, Math.PI * 2, 20, 6), hx, hy + 0.085, hz, 90, 0, 0);
  // cou, tête, nez, oreilles, cheveux
  K.add("chair", limb([cx, cy + 0.12, cz], [ex, ey - 0.08, ez - 0.01], 0.047, 0.043)); K.add("chair", blob(0.086, 0.11, 0.097), ex, ey, ez); K.add("chair", blob(0.012, 0.02, 0.016), ex, ey - 0.012, ez + 0.094);
  for (const s of [-1, 1]) K.add("chair", blob(0.012, 0.024, 0.016), ex + s * 0.086, ey - 0.005, ez - 0.004);
  { const cap = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.56); cap.scale(0.094, 0.118, 0.106); K.add(hm, cap, ex, ey + 0.006, ez - 0.012, -14, 0, 0); K.add(hm, blob(0.088, 0.085, 0.06), ex, ey - 0.01, ez - 0.055);
    if (f.hair === "long") { K.add(hm, blob(0.1, 0.17, 0.055), ex, ey - 0.15, ez - 0.07); for (const s of [-1, 1]) K.add(hm, blob(0.03, 0.13, 0.05), ex + s * 0.085, ey - 0.1, ez - 0.01); }
    if (f.hair === "chignon") K.add(hm, ball(0.05, 12, 10), ex, ey + 0.07, ez - 0.09); }
  // bras : manche, coude, avant-bras, main
  for (const [s, [el, wr]] of [[1, f.armR], [-1, f.armL]] as [number, [V3, V3]][]) {
    const S: V3 = [cx + s * sh, cy + 0.095, cz], sl = f.sleeves || f.jacket, sm = f.jacket ? "sombre" : top;
    K.add(sm, ball(0.064, 14, 10), S[0], S[1], S[2]); K.add(sm, limb(S, el, 0.052, 0.043)); K.add(sl ? sm : "chair", ball(0.042, 12, 8), el[0], el[1], el[2]); K.add(sl ? sm : "chair", limb(el, wr, 0.04, 0.03));
    const d = new THREE.Vector3(wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]).normalize(); K.add("chair", blob(0.036, 0.042, 0.034, 12, 8), wr[0] + d.x * 0.045, wr[1] + d.y * 0.045, wr[2] + d.z * 0.045);
  }
  // jambes : cuisse, genou, mollet, chaussure
  for (const [s, [kn, an]] of [[1, f.legR], [-1, f.legL]] as [number, [V3, V3]][]) {
    const H: V3 = [hx + s * 0.088, hy - 0.03, hz], lm = f.skirt ? "chair" : bottom, k = f.skirt ? 0.86 : 1;
    K.add(lm, limb(H, kn, 0.084 * k, 0.062 * k)); K.add(lm, ball(0.062 * k, 12, 8), kn[0], kn[1], kn[2]); K.add(lm, limb(kn, an, 0.06 * k, 0.043 * k));
    K.add("noir", rbox(0.094, 0.066, 0.25, 0.03), an[0], Math.max(0.033, an[1] - 0.047), an[2] + 0.055); K.add("blanc", rbox(0.096, 0.016, 0.254, 0.006), an[0], Math.max(0.008, an[1] - 0.072), an[2] + 0.055);
  }
}
const man: Build = (K) => figure(K, { hip: [0.01, 0.95, 0], chest: [0, 1.3, 0], head: [0, 1.64, 0.012], armR: [[0.265, 1.14, -0.02], [0.27, 0.9, 0.07]], armL: [[-0.255, 1.14, -0.03], [-0.23, 0.92, 0.1]], legR: [[0.105, 0.52, 0.03], [0.115, 0.08, -0.01]], legL: [[-0.09, 0.52, 0.07], [-0.1, 0.08, 0.1]] });
const woman: Build = (K) => figure(K, { hip: [-0.01, 0.93, 0], chest: [0, 1.26, 0], head: [0.005, 1.59, 0.012], sh: 0.175, hair: "long", hairMat: "cheveux2", skirt: true, armR: [[0.235, 1.1, -0.02], [0.245, 0.87, 0.06]], armL: [[-0.3, 1.1, -0.06], [-0.17, 0.97, 0.04]], legR: [[0.08, 0.5, 0.02], [0.085, 0.08, 0]], legL: [[-0.085, 0.5, 0.04], [-0.1, 0.08, 0.06]] });
const singer: Build = (K) => { figure(K, { hip: [0, 0.94, 0], chest: [0, 1.29, 0.01], head: [0.01, 1.63, 0.04], hair: "long", jacket: true, armR: [[0.27, 1.19, 0.14], [0.1, 1.46, 0.2]], armL: [[-0.33, 1.26, 0.06], [-0.5, 1.2, 0.24]], legR: [[0.15, 0.51, 0.04], [0.2, 0.08, 0]], legL: [[-0.14, 0.51, 0.06], [-0.2, 0.08, 0.06]] });
  K.add("sombre", rod([0.1, 1.44, 0.21], [0.05, 1.555, 0.16], 0.017, 10)); K.add("metal", ball(0.027, 12, 8), 0.04, 1.575, 0.152); };
const guitarist: Build = (K) => { figure(K, { hip: [0, 0.94, 0], chest: [0, 1.29, 0], head: [-0.01, 1.63, 0.03], hairMat: "cheveux2", sleeves: true, bottom: "noir", armR: [[0.31, 1.13, 0.05], [0.13, 1.0, 0.2]], armL: [[-0.33, 1.13, 0.1], [-0.4, 1.27, 0.22]], legR: [[0.14, 0.51, 0.04], [0.17, 0.08, 0]], legL: [[-0.12, 0.51, 0.07], [-0.16, 0.08, 0.08]] });
  const g = new Kit(); void g; const a = 28 * R, put = (m: string, geo: THREE.BufferGeometry, along: number, off = 0) => { geo.rotateZ(Math.PI / 2 + a); K.add(m, geo, 0.1 - Math.cos(a) * along, 1.0 + Math.sin(a) * along + off, 0.17); };
  put("rouge", blob(0.2, 0.16, 0.026, 20, 12), 0); put("rouge", blob(0.13, 0.12, 0.026, 18, 10), 0.2); put("blanc", rbox(0.1, 0.05, 0.03, 0.004), 0.02); put("bois", rbox(0.5, 0.045, 0.02, 0.006), 0.5); put("noir", rbox(0.14, 0.06, 0.018, 0.006), 0.8); put("chrome", rbox(0.03, 0.07, 0.03, 0.004), -0.08);
  K.add("noir", limb([0.24, 1.0, 0.13], [-0.18, 1.4, -0.06], 0.012, 0.012, 6)); K.add("noir", limb([-0.18, 1.4, -0.06], [0.2, 1.38, -0.1], 0.012, 0.012, 6)); };
const dancer: Build = (K) => figure(K, { hip: [0.02, 0.95, 0], chest: [0, 1.3, 0], head: [-0.01, 1.64, 0.02], sh: 0.18, hair: "chignon", sleeves: true, bottom: "noir", armR: [[0.32, 1.6, 0], [0.38, 1.88, 0.05]], armL: [[-0.4, 1.42, 0], [-0.64, 1.5, 0.06]], legR: [[0.11, 0.52, 0.02], [0.12, 0.08, 0]], legL: [[-0.25, 0.66, 0.22], [-0.13, 0.36, 0.04]] });
const seatedFig = (K: Kit, sticks: boolean) => { const hy = 0.56, hz = -0.2;
  figure(K, { hip: [0, hy, hz], chest: [0, hy + 0.35, hz + 0.01], head: [0, hy + 0.69, hz + 0.03], hairMat: sticks ? "cheveux2" : "cheveux", armR: sticks ? [[0.3, hy + 0.2, hz + 0.08], [0.26, hy + 0.3, 0.14]] : [[0.25, hy + 0.2, hz + 0.05], [0.15, hy + 0.08, 0.1]], armL: sticks ? [[-0.3, hy + 0.2, hz + 0.08], [-0.26, hy + 0.24, 0.14]] : [[-0.25, hy + 0.2, hz + 0.05], [-0.15, hy + 0.08, 0.1]], legR: [[0.11, hy - 0.02, 0.24], [0.115, 0.08, 0.27]], legL: [[-0.11, hy - 0.02, 0.24], [-0.115, 0.08, 0.27]] });
  if (sticks) for (const s of [-1, 1]) K.add("bois", rod([s * 0.26, hy + (s > 0 ? 0.3 : 0.24), 0.18], [s * 0.12, hy + (s > 0 ? 0.36 : 0.2), 0.56], 0.007, 6)); };
const seated: Build = (K) => seatedFig(K, false);
const drummer: Build = (K) => seatedFig(K, true);

// ---------- batterie ----------
const drum = (K: Kit, x: number, y: number, z: number, r: number, h: number, rx = 0, rz = 0, both2 = false) => {
  K.add("$", cyl(r, r, h, 36), x, y, z, rx, 0, rz);
  for (const s of both2 ? [-1, 1] : [1]) { const hd = cyl(r * 0.985, r * 0.985, 0.004, 36); hd.translate(0, s * (h / 2 + 0.002), 0); K.add("membrane", hd, x, y, z, rx, 0, rz); }
  for (const s of [-1, 1]) { const t = torus(r + 0.004, 0.007, Math.PI * 2, 36, 8); t.rotateX(Math.PI / 2); t.translate(0, s * (h / 2 + 0.003), 0); K.add("chrome", t, x, y, z, rx, 0, rz); }
  const n = r > 0.24 ? 8 : 6; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, g = rbox(0.014, Math.min(0.05, h * 0.5), 0.012, 0.003); g.translate(Math.cos(a) * (r + 0.006), 0, Math.sin(a) * (r + 0.006)); K.add("chrome", g, x, y, z, rx, 0, rz); }
};
const cymbal = (K: Kit, x: number, y: number, z: number, r: number, rx = 0, rz = 0, stand = true) => {
  K.add("laiton", lathe([[0, 0.022], [0.028, 0.02], [0.05, 0.008], [r, 0], [0.05, 0.004], [0.028, 0.015], [0, 0.017]], 40), x, y, z, rx, 0, rz); K.add("chrome", cyl(0.007, 0.007, 0.03, 8), x, y + 0.025, z);
  if (stand) { K.add("chrome", rod([x, 0.32, z], [x, y, z], 0.009, 8)); K.add("chrome", cyl(0.013, 0.013, 0.5, 8), x, 0.52, z); tripod(K, "chrome", x, z, 0.36, 0.24, 0.008, x * 100); }
};
const drums: Build = (K) => {
  drum(K, 0, 0.29, 0.3, 0.28, 0.42, 90, 0, true); mrod(K, "chrome", [0.2, 0.2, 0.42], [0.36, 0.01, 0.52], 0.007, 8);
  K.add("chrome", rbox(0.09, 0.02, 0.26, 0.005), 0, 0.012, -0.02); K.add("chrome", rod([0, 0.03, 0.04], [0, 0.26, 0.08], 0.006, 6)); K.add("membrane", ball(0.028, 10, 8), 0, 0.27, 0.085);
  K.add("chrome", rod([0, 0.57, 0.26], [0, 0.72, 0.26], 0.012, 8));
  drum(K, -0.17, 0.79, 0.24, 0.15, 0.2, -22, 8); drum(K, 0.18, 0.79, 0.24, 0.165, 0.22, -22, -8);
  drum(K, 0.5, 0.44, -0.08, 0.2, 0.37); for (let i = 0; i < 3; i++) { const a = (i * 120 + 40) * R; K.add("chrome", rod([0.5 + Math.cos(a) * 0.21, 0.5, -0.08 + Math.sin(a) * 0.21], [0.5 + Math.cos(a) * 0.25, 0.01, -0.08 + Math.sin(a) * 0.25], 0.006, 6)); }
  drum(K, -0.36, 0.66, -0.06, 0.178, 0.14, -4, 6, true); K.add("chrome", rod([-0.36, 0.3, -0.06], [-0.36, 0.58, -0.06], 0.011, 8)); tripod(K, "chrome", -0.36, -0.06, 0.34, 0.22, 0.008, 20);
  cymbal(K, -0.64, 0.9, 0.0, 0.18, 0, 0); K.add("laiton", lathe([[0, -0.022], [0.028, -0.02], [0.05, -0.008], [0.18, 0], [0.05, -0.004], [0, -0.017]], 40), -0.64, 0.885, 0);
  cymbal(K, -0.5, 1.22, 0.42, 0.21, -14, 10); cymbal(K, 0.62, 1.08, 0.2, 0.26, -16, -12); cymbal(K, 0.3, 1.27, 0.5, 0.2, -12, -8);
  K.add("noir", lathe([[0, 0.085], [0.13, 0.08], [0.17, 0.05], [0.17, 0.02], [0.14, 0], [0, 0]], 28), 0, 0.46, -0.52); K.add("chrome", cyl(0.014, 0.014, 0.2, 8), 0, 0.36, -0.52); tripod(K, "chrome", 0, -0.52, 0.3, 0.24, 0.009, 60);
};

// ---------- amplis ----------
const corners = (K: Kit, w: number, y0: number, y1: number, d: number, r = 0.02) => { for (const x of [-1, 1]) for (const y of [y0, y1]) for (const z of [-1, 1]) K.add("chrome", ball(r, 10, 8), x * (w / 2 - r * 0.5), y + (y === y0 ? r * 0.5 : -r * 0.5), z * (d / 2 - r * 0.5)); };
const knobs = (K: Kit, n: number, x0: number, x1: number, y: number, z: number, r = 0.011) => { for (let i = 0; i < n; i++) K.add("noir", cyl(r, r * 0.85, 0.016, 12), x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, z, 90, 0, 0); };
const combo: Build = (K, w, h, d) => {
  K.add("$", rbox(w, h - 0.02, d, 0.018, 4), 0, h / 2 + 0.01, 0);
  K.add("tissu", tile(rbox(w - 0.07, h * 0.66, 0.012, 0.005), 30, 20), 0, h * 0.4 + 0.01, d / 2 - 0.003); K.add("chrome", rbox(w - 0.06, 0.006, 0.006, 0.002), 0, h * 0.745, d / 2 + 0.002);
  K.add("laiton", rbox(w - 0.07, h * 0.115, 0.01, 0.003), 0, h * 0.84, d / 2 - 0.002); knobs(K, 7, -w / 2 + 0.1, w / 2 - 0.16, h * 0.84, d / 2 + 0.008);
  K.add("lampe", ball(0.008, 8, 6), w / 2 - 0.08, h * 0.84, d / 2 + 0.006);
  K.add("noir", rbox(0.2, 0.014, 0.03, 0.006), 0, h + 0.012, 0); K.pair("chrome", () => rbox(0.03, 0.012, 0.036, 0.004), 0.1, h + 0.006, 0);
  corners(K, w, 0.02, h, d); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.add("caoutchouc", cyl(0.018, 0.018, 0.02, 10), x * (w / 2 - 0.06), 0.01, z * (d / 2 - 0.05));
};
const stack: Build = (K, w, h, d) => {
  const ch = h * 0.76, hh = h - ch - 0.012;
  K.add("$", rbox(w, ch - 0.05, d, 0.018, 4), 0, ch / 2 + 0.025, 0); K.add("grille", tile(rbox(w - 0.08, ch - 0.14, 0.014, 0.005), (w - 0.08) / 0.012, (ch - 0.14) / 0.012), 0, ch / 2 + 0.025, d / 2 - 0.002);
  corners(K, w, 0.05, ch, d); K.pair("noir", () => rbox(0.012, 0.1, 0.16, 0.004), w / 2 + 0.001, ch * 0.62, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { K.add("chrome", rbox(0.05, 0.008, 0.05, 0.002), x * (w / 2 - 0.07), 0.052, z * (d / 2 - 0.07)); K.add("caoutchouc", cyl(0.024, 0.024, 0.02, 12), x * (w / 2 - 0.07), 0.024, z * (d / 2 - 0.07), 0, 0, 90); }
  const y = ch + 0.012 + hh / 2, hw = w * 0.94, hd = d * 0.82;
  K.add("$", rbox(hw, hh, hd, 0.016, 4), 0, y, 0); K.add("metal", rbox(hw - 0.06, hh * 0.56, 0.008, 0.002), 0, y, hd / 2 - 0.001); knobs(K, 8, -hw / 2 + 0.09, hw / 2 - 0.13, y, hd / 2 + 0.008);
  K.add("lampe", ball(0.008, 8, 6), hw / 2 - 0.06, y, hd / 2 + 0.006); K.add("noir", rbox(0.2, 0.014, 0.03, 0.006), 0, y + hh / 2 + 0.01, 0); corners(K, hw, y - hh / 2, y + hh / 2, hd, 0.016);
};
const wedge: Build = (K, w, h, d) => {
  K.add("$", profile([[-d / 2, 0], [d / 2, 0], [d / 2, h * 0.3], [-d * 0.02, h], [-d * 0.3, h]], w, 0.012));
  const len = Math.hypot(d * 0.52, h * 0.7), a = Math.atan2(d * 0.52, h * 0.7) / R;
  K.add("grille", tile(rbox(w * 0.9, len * 0.86, 0.014, 0.005), (w * 0.9) / 0.011, (len * 0.86) / 0.011), 0, h * 0.65 + 0.004, (d / 2 - d * 0.02) / 2 + 0.004, -a, 0, 0);
  K.pair("caoutchouc", () => rbox(0.012, h * 0.22, d * 0.3, 0.004), w / 2 + 0.001, h * 0.45, -d * 0.12);
};
const speakerOnStand: Build = (K) => {
  K.add("sombre", cyl(0.018, 0.018, 0.95, 10), 0, 0.72, 0); K.add("metal", cyl(0.014, 0.014, 0.5, 10), 0, 1.22, 0); K.add("caoutchouc", cyl(0.026, 0.026, 0.05, 10), 0, 1.0, 0); tripod(K, "sombre", 0, 0, 0.75, 0.52, 0.012); for (let i = 0; i < 3; i++) { const a = (i * 120 + 90) * R; K.add("sombre", rod([0, 0.32, 0], [Math.cos(a) * 0.22, 0.44, Math.sin(a) * 0.22], 0.007, 6)); }
  const w = 0.4, h = 0.62, d = 0.36, y0 = 1.38;
  K.add("$", prism([[-w / 2, d / 2], [w / 2, d / 2], [w * 0.4, -d / 2], [-w * 0.4, -d / 2]], h, 0.012), 0, y0, 0); K.add("grille", tile(rbox(w * 0.93, h * 0.92, 0.016, 0.006), (w * 0.93) / 0.011, (h * 0.92) / 0.011), 0, y0 + h / 2, d / 2 + 0.003);
  K.pair("caoutchouc", () => rbox(0.012, 0.13, 0.16, 0.004), w * 0.46, y0 + h * 0.6, 0, 0, -6, 0);
};

// ---------- micro sur pied ----------
const micStand: Build = (K) => {
  tripod(K, "sombre", 0, 0, 0.3, 0.24, 0.009); K.add("sombre", cyl(0.02, 0.02, 0.06, 10), 0, 0.3, 0);
  K.add("sombre", cyl(0.011, 0.011, 0.78, 10), 0, 0.68, 0); K.add("chrome", cyl(0.008, 0.008, 0.5, 8), 0, 1.2, 0); K.add("sombre", cyl(0.016, 0.016, 0.05, 10), 0, 1.07, 0);
  K.add("sombre", ball(0.022, 10, 8), 0, 1.45, 0); K.add("chrome", rod([0, 1.38, 0.18], [0, 1.57, -0.3], 0.006, 8)); K.add("sombre", ball(0.016, 8, 6), 0, 1.38, 0.18);
  K.add("sombre", rod([0, 1.565, -0.29], [0, 1.6, -0.45], 0.017, 12)); K.add("metal", blob(0.027, 0.027, 0.032, 14, 10), 0, 1.607, -0.475); K.add("chrome", torus(0.0265, 0.003, Math.PI * 2, 16, 5), 0, 1.607, -0.47, 12, 0, 0);
};
const musicStand: Build = (K) => {
  tripod(K, "sombre", 0, 0, 0.3, 0.24, 0.008); K.add("sombre", cyl(0.01, 0.01, 0.62, 8), 0, 0.6, 0); K.add("sombre", cyl(0.007, 0.007, 0.34, 8), 0, 0.98, 0);
  K.add("sombre", rbox(0.5, 0.33, 0.004, 0.002), 0, 1.04, 0.02, -18, 0, 0); K.add("sombre", rbox(0.5, 0.006, 0.05, 0.002), 0, 0.885, 0.085, -18, 0, 0); K.add("blanc", rbox(0.42, 0.29, 0.002, 0), 0, 1.045, 0.025, -18, 0, 0);
};

// ---------- claviers et pianos ----------
const keys = (K: Kit, x0: number, x1: number, y: number, z: number, depth: number) => {
  const n = Math.max(14, Math.round((x1 - x0) / 0.0235)), kw = (x1 - x0) / n;
  K.add("ivoire", rbox(x1 - x0, 0.016, depth, 0.002), (x0 + x1) / 2, y, z);
  for (let i = 0; i < n - 1; i++) { const k = i % 7; if (k === 2 || k === 6) continue; K.add("noir", rbox(kw * 0.58, 0.012, depth * 0.62, 0.002), x0 + (i + 1) * kw, y + 0.012, z - depth * 0.19); }
};
const keyboard: Build = (K) => {
  for (const z of [-0.1, 0.1]) { K.add("sombre", rod([-0.42, 0.02, z], [0.42, 0.83, z], 0.013, 8)); K.add("sombre", rod([0.42, 0.02, z], [-0.42, 0.83, z], 0.013, 8)); }
  for (const x of [-0.42, 0.42]) for (const y of [0.02, 0.83]) { K.add("sombre", rod([x, y, -0.2], [x, y, 0.2], 0.014, 8)); for (const z of [-0.2, 0.2]) K.add("caoutchouc", ball(0.02, 8, 6), x, y, z); }
  K.add("chrome", cyl(0.02, 0.02, 0.24, 10), 0, 0.425, 0, 90, 0, 0);
  K.add("sombre", rbox(1.3, 0.085, 0.36, 0.016, 4), 0, 0.895, 0); keys(K, -0.61, 0.61, 0.936, 0.085, 0.14);
  K.add("verre", rbox(0.16, 0.004, 0.05, 0.001), 0, 0.939, -0.1); knobs(K, 5, -0.5, -0.2, 0.94, -0.1, 0.012); for (let i = 0; i < 6; i++) K.add("gris", rbox(0.022, 0.006, 0.03, 0.002), 0.2 + i * 0.05, 0.94, -0.1);
};
const grand: Build = (K) => {
  const out: [number, number][] = [[-0.75, 1.1], [0.75, 1.1], [0.75, 0.25], [0.73, -0.02], [0.66, -0.24], [0.52, -0.42], [0.4, -0.58], [0.32, -0.78], [0.24, -0.96], [0.1, -1.07], [-0.2, -1.1], [-0.5, -1.05], [-0.69, -0.88], [-0.75, -0.6]];
  K.add("$", prism(out, 0.3, 0.012), 0, 0.62, 0);
  const lid = prism(out.map(([x, z]) => [x, Math.min(z, 0.78)] as [number, number]), 0.022, 0.006); lid.translate(0.75, 0, 0); lid.rotateZ(34 * R); lid.translate(-0.75, 0.925, 0); K.add("$", lid);
  K.add("$", rbox(1.46, 0.02, 0.3, 0.004), 0, 0.93, 0.93); K.add("laiton", rod([0.5, 0.92, -0.1], [0.38, 1.56, -0.1], 0.008, 6));
  K.add("noir", rbox(1.36, 0.1, 0.02, 0.004), 0, 0.82, 0.86); keys(K, -0.61, 0.61, 0.752, 1.0, 0.15); K.add("$", rbox(1.5, 0.05, 0.05, 0.01), 0, 0.72, 1.085); K.pair("$", () => rbox(0.1, 0.12, 0.26, 0.012), 0.7, 0.76, 0.97);
  K.add("$", rbox(0.7, 0.26, 0.012, 0.004), 0, 1.02, 0.72, -14, 0, 0);
  for (const [x, z] of [[-0.62, 0.86], [0.62, 0.86], [-0.12, -0.88]]) { K.add("$", cyl(0.032, 0.058, 0.56, 14), x, 0.34, z); K.add("laiton", cyl(0.03, 0.03, 0.02, 12), x, 0.05, z); K.add("laiton", cyl(0.024, 0.024, 0.02, 12), x, 0.024, z, 0, 0, 90); }
  K.add("$", rbox(0.22, 0.05, 0.1, 0.012), 0, 0.12, 0.82); mrod(K, "$", [0.07, 0.14, 0.82], [0.05, 0.62, 0.82], 0.014, 8); for (const x of [-0.07, 0, 0.07]) K.add("laiton", rbox(0.03, 0.008, 0.09, 0.003), x, 0.09, 0.9);
};
const upright: Build = (K) => {
  K.add("$", rbox(1.5, 1.22, 0.36, 0.016, 4), 0, 0.63, -0.12); K.add("$", rbox(1.5, 0.05, 0.3, 0.01), 0, 0.7, 0.2); keys(K, -0.62, 0.62, 0.735, 0.2, 0.15); K.add("noir", rbox(1.36, 0.08, 0.02, 0.004), 0, 0.79, 0.07);
  K.pair("$", () => rbox(0.07, 0.68, 0.28, 0.014), 0.715, 0.34, 0.2); K.add("$", rbox(1.52, 0.03, 0.4, 0.01), 0, 1.255, -0.12); K.add("$", rbox(0.9, 0.3, 0.01, 0.003), 0, 1.0, 0.064);
  for (const x of [-0.07, 0, 0.07]) K.add("laiton", rbox(0.03, 0.008, 0.08, 0.003), x, 0.07, 0.1); K.add("$", rbox(1.5, 0.08, 0.1, 0.01), 0, 0.04, 0.03);
};

// ---------- mobilier rembourré ----------
const sofa: Build = (K, w, h, d) => {
  const s = h / 0.85, arm = Math.min(0.2, w * 0.2), n = Math.max(1, Math.round((w - 2 * arm) / 0.65)), cw = (w - 2 * arm) / n;
  K.add("$", rbox(w, 0.2 * s, d * 0.96, 0.04, 4), 0, 0.21 * s, 0); K.add("$", rbox(w, 0.56 * s, d * 0.2, 0.06, 4), 0, 0.52 * s, -d * 0.4);
  for (let i = 0; i < n; i++) { const x = -w / 2 + arm + cw * (i + 0.5); K.add("$", rbox(cw - 0.012, 0.17 * s, d * 0.72, 0.055, 5), x, 0.39 * s, d * 0.08); K.add("$", rbox(cw - 0.02, 0.44 * s, d * 0.2, 0.075, 5), x, 0.66 * s, -d * 0.25, -10, 0, 0); }
  K.pair("$", () => rbox(arm, 0.46 * s, d * 0.96, Math.min(0.075, arm * 0.42), 5), w / 2 - arm / 2, 0.38 * s, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.add("bois", cyl(0.018, 0.026, 0.11 * s, 10), x * (w / 2 - 0.07), 0.055 * s, z * (d / 2 - 0.08));
};

// ---------- tissus ----------
const cloth = (K: Kit, mat: string, w: number, h: number, depth: number, x = 0, y = 0, z = 0, full = 1) => { for (const g of both(drape(w, h, depth, full))) K.add(mat, g, x, y, z); };
const curtain: Build = (K, w, h, d) => { cloth(K, "$", w, h, Math.max(0.14, Math.min(0.3, d * 1.6))); K.add("sombre", cyl(0.02, 0.02, w, 8), 0, h - 0.01, 0, 0, 0, 90); };
const houseCurtain: Build = (K, w, h, d) => {
  const sw = w * 0.22, dp = Math.max(0.22, Math.min(0.4, d));
  for (const sx of [-1, 1]) cloth(K, "$", sw, h * 0.9, dp, sx * (w / 2 - sw / 2), 0, 0, 2.4);
  cloth(K, "$", w, h * 0.16, dp * 0.8, 0, h * 0.84, dp * 0.3, 1.3); K.add("laiton", rbox(w, 0.03, 0.02, 0.004), 0, h * 0.845, dp * 0.3 + 0.02);
};

// ---------- matériel de tournée ----------
const flightCase: Build = (K, w, h, d) => {
  const y0 = 0.12, bh = h - y0, e = 0.028;
  K.add("$", rbox(w - 0.01, bh - 0.01, d - 0.01, 0.006), 0, y0 + bh / 2, 0);
  for (const y of [y0 + e / 2, h - e / 2]) { for (const z of [-1, 1]) K.add("metal", rbox(w, e, e, 0.006), 0, y, z * (d / 2 - e / 2)); for (const x of [-1, 1]) K.add("metal", rbox(e, e, d, 0.006), x * (w / 2 - e / 2), y, 0); }
  for (const x of [-1, 1]) for (const z of [-1, 1]) K.add("metal", rbox(e, bh, e, 0.006), x * (w / 2 - e / 2), y0 + bh / 2, z * (d / 2 - e / 2));
  const ly = y0 + bh * 0.68; for (const z of [-1, 1]) K.add("metal", rbox(w, 0.022, 0.006, 0.002), 0, ly, z * (d / 2)); for (const x of [-1, 1]) K.add("metal", rbox(0.006, 0.022, d, 0.002), x * (w / 2), ly, 0);
  for (const x of [-1, 1]) for (const y of [y0, h]) for (const z of [-1, 1]) K.add("chrome", ball(0.03, 10, 8), x * (w / 2 - 0.012), y + (y === y0 ? 0.012 : -0.012), z * (d / 2 - 0.012));
  for (const x of w > 0.9 ? [-w * 0.28, w * 0.28] : [0]) for (const z of [-1, 1]) { K.add("noir", rbox(0.1, 0.1, 0.006, 0.002), x, ly, z * (d / 2 + 0.001)); K.add("chrome", rbox(0.05, 0.07, 0.01, 0.003), x, ly, z * (d / 2 + 0.004)); }
  for (const x of [-1, 1]) { K.add("noir", rbox(0.006, 0.1, 0.16, 0.002), x * (w / 2 + 0.001), y0 + bh * 0.4, 0); K.add("chrome", rbox(0.012, 0.016, 0.11, 0.004), x * (w / 2 + 0.004), y0 + bh * 0.42, 0); }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = x * (w / 2 - 0.1), cz = z * (d / 2 - 0.09); K.add("metal", rbox(0.1, 0.008, 0.09, 0.002), cx, y0 - 0.004, cz); K.add("metal", rbox(0.05, 0.06, 0.006, 0.002), cx - 0.022, y0 - 0.04, cz); K.add("metal", rbox(0.05, 0.06, 0.006, 0.002), cx + 0.022, y0 - 0.04, cz); K.add("caoutchouc", cyl(0.05, 0.05, 0.034, 18), cx, 0.05, cz, 0, 0, 90); K.add("chrome", cyl(0.02, 0.02, 0.04, 10), cx, 0.05, cz, 0, 0, 90); }
};

// ---------- végétal et minéral : volumes taillés à facettes ----------
const facet = (r: number, seed: number, detail = 1, squash: [number, number, number] = [1, 1, 1]) => { const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.16 * Math.sin(x * 9.1 / r + seed) * Math.cos(y * 7.3 / r + seed * 1.7) + 0.1 * Math.sin(z * 11.7 / r + seed * 2.3); p.setXYZ(i, x * k * squash[0], y * k * squash[1], z * k * squash[2]); } g.computeVertexNormals(); return g; };
const tree: Build = (K) => {
  K.add("bois", lathe([[0.2, 0], [0.13, 0.25], [0.1, 0.9], [0.085, 1.7], [0.05, 2.3], [0, 2.3]], 12)); K.add("bois", rod([0, 1.5, 0], [0.45, 2.2, 0.15], 0.04, 7)); K.add("bois", rod([0, 1.7, 0], [-0.4, 2.35, -0.2], 0.035, 7));
  const B: [number, number, number, number][] = [[0, 2.9, 0, 0.85], [0.55, 2.55, 0.25, 0.6], [-0.55, 2.65, -0.25, 0.62], [0.15, 2.5, -0.6, 0.55], [-0.2, 2.45, 0.6, 0.55], [0.3, 3.3, 0.2, 0.55], [-0.3, 3.25, -0.15, 0.5], [0.7, 3.0, -0.3, 0.45], [-0.7, 3.0, 0.3, 0.45]];
  B.forEach(([x, y, z, r], i) => K.add("$", facet(r, i * 1.9 + 1), x, y, z));
};
const plant: Build = (K) => {
  K.add("bois", lathe([[0, 0], [0.13, 0], [0.17, 0.3], [0.18, 0.33], [0.15, 0.33], [0.14, 0.3], [0, 0.3]], 20)); K.add("sombre", cyl(0.14, 0.14, 0.01, 16), 0, 0.3, 0);
  for (let i = 0; i < 11; i++) { const a = i * 2.4, tilt = 12 + (i % 4) * 11, len = 0.5 + (i % 3) * 0.14, g = blob(0.05, len / 2, 0.012, 8, 8); g.translate(0, len / 2, 0); g.rotateZ(-tilt * R); g.rotateY(a); K.add("$", g, 0, 0.3, 0); }
  K.add("$", facet(0.16, 4, 1, [1, 1.2, 1]), 0, 0.5, 0);
};
const rock: Build = (K) => { K.add("$", facet(0.5, 2.2, 2, [1.45, 0.86, 1.15]), 0, 0.4, 0); K.add("$", facet(0.26, 5.1, 1, [1.3, 0.9, 1.1]), 0.42, 0.2, 0.3); };

// ---------- totem de pont : une tour à treillis sur son embase ----------
const totem: Build = (K, w, h) => { const a = Math.max(0.08, w / 2 - 0.025), C: [number, number][] = [[-a, -a], [a, -a], [a, a], [-a, a]], n = Math.max(2, Math.round(h / 0.5)), st = (h - 0.02) / n;
  K.add("metal", rbox(Math.max(0.6, w * 2), 0.02, Math.max(0.6, w * 2), 0.004), 0, 0.01, 0);
  for (const [x, z] of C) K.add("metal", rod([x, 0.02, z], [x, h, z], 0.0255, 12));
  for (let f = 0; f < 4; f++) { const [xa, za] = C[f], [xb, zb] = C[(f + 1) % 4]; for (let i = 0; i < n; i++) { const y0 = 0.02 + i * st, fl = (i + f) % 2 === 0; K.add("metal", rod([fl ? xa : xb, y0, fl ? za : zb], [fl ? xb : xa, y0 + st, fl ? zb : za], 0.01, 6)); } K.add("metal", rod([xa, h - 0.02, za], [xb, h - 0.02, zb], 0.012, 6)); } };
export const HD_PROPS: Record<string, HD> = {
  personne: { nominal: [0.6, 1.76, 0.4], build: man }, "personne-f": { nominal: [0.6, 1.71, 0.4], build: woman }, chanteur: { nominal: [0.85, 1.76, 0.5], build: singer }, guitariste: { nominal: [1.0, 1.76, 0.5], build: guitarist }, danseuse: { nominal: [1.1, 1.95, 0.5], build: dancer },
  "personne-assise": { nominal: [0.6, 1.37, 0.8], build: seated }, batteur: { nominal: [0.7, 1.37, 0.9], build: drummer },
  batterie: { nominal: [1.8, 1.3, 1.5], build: drums }, "ampli-guitare": { build: combo }, "ampli-basse": { build: stack }, retour: { build: wedge }, "enceinte-pied": { nominal: [0.45, 2, 0.45], build: speakerOnStand },
  "pied-micro": { nominal: [0.5, 1.64, 0.7], build: micStand }, "pupitre-musique": { nominal: [0.5, 1.22, 0.45], build: musicStand },
  clavier: { nominal: [1.3, 0.95, 0.45], build: keyboard }, "piano-queue": { nominal: [1.5, 1.0, 2.2], build: grand }, "piano-droit": { nominal: [1.5, 1.27, 0.6], build: upright },
  fauteuil: { build: sofa }, canape: { build: sofa },
  "fond-noir": { build: curtain }, pendrillon: { build: curtain }, frise: { build: curtain }, "rideau-avant-scene": { build: houseCurtain },
  "flight-case": { build: flightCase }, "totem-pont": { build: totem }, arbre: { nominal: [2.2, 3.8, 2.2], build: tree }, plante: { nominal: [0.5, 1.2, 0.5], build: plant }, rocher: { nominal: [1.5, 0.9, 1.2], build: rock },
};
export { cloth };
