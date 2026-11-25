// Images dessinées par l'outil pour la vue 3D : gobos des lyres génériques et mire de réglage des écrans.
import * as THREE from "three";

const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const cache = new Map<string, THREE.Texture>();
const tex = (key: string, make: () => HTMLCanvasElement, srgb = true) => { let t = cache.get(key); if (!t) { t = new THREE.CanvasTexture(make()); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; cache.set(key, t); } return t; };

// Gobo : blanc = la lumière passe, noir = elle est arrêtée. Disque de 256 px.
export function goboTexture(name: string): THREE.Texture | null {
  if (name === "sf:open") return null;
  return tex(name, () => {
    const c = canvas(256, 256), g = c.getContext("2d")!; g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#fff"; g.strokeStyle = "#fff";
    g.save(); g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.clip();
    if (name === "sf:dots") { for (let r = 0; r < 3; r++) { const n = r === 0 ? 1 : r * 7, rad = r * 44; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r; g.beginPath(); g.arc(128 + Math.cos(a) * rad, 128 + Math.sin(a) * rad, 13, 0, Math.PI * 2); g.fill(); } } }
    else if (name === "sf:star") { g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? 38 : 112; g.lineTo(128 + Math.cos(a) * rad, 128 + Math.sin(a) * rad); } g.closePath(); g.fill(); }
    else if (name === "sf:bars") { for (let x = 22; x < 256; x += 44) g.fillRect(x, 0, 20, 256); }
    else { let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 70; i++) { g.beginPath(); const x = rnd() * 256, y = rnd() * 256, w = 8 + rnd() * 26; g.ellipse(x, y, w, w * (0.3 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2); g.fill(); } }
    g.restore(); return c;
  }, false);
}

// Mire : barres de couleur, grille, cercle et cadre, pour juger un cadrage et une taille d'image.
export function mireTexture(aspect: number): THREE.Texture {
  const a = Math.round(aspect * 100) / 100;
  return tex("mire:" + a, () => {
    const h = 540, w = Math.max(240, Math.round(h * a)), c = canvas(w, h), g = c.getContext("2d")!;
    g.fillStyle = "#16181c"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.28)"; g.lineWidth = 1; for (let x = 0; x <= w; x += h / 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += h / 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const cols = ["#d8d8d8", "#d6c21c", "#22c7c4", "#27b33a", "#c22cc0", "#c9302b", "#2a3fcf"], bw = (w * 0.7) / cols.length; cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(w * 0.15 + i * bw, h * 0.2, bw + 1, h * 0.34); });
    for (let i = 0; i < 11; i++) { const v = Math.round((i / 10) * 255); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(w * 0.15 + (i * w * 0.7) / 11, h * 0.56, (w * 0.7) / 11 + 1, h * 0.1); }
    g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.arc(w / 2, h / 2, h * 0.46, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    g.fillStyle = "#fff"; g.font = `600 ${Math.round(h * 0.06)}px system-ui, sans-serif`; g.textAlign = "center"; g.fillText("ScenoFactory", w / 2, h * 0.78); g.font = `${Math.round(h * 0.04)}px system-ui, sans-serif`; g.fillText(`${a.toFixed(2).replace(".", ",")}:1`, w / 2, h * 0.85);
    return c;
  });
}
/** Un visuel de spectacle prêt à l'emploi : rayons colorés sur fond sombre, pour qu'un mur LED vive sans image importée. */
export function visualTexture(aspect: number): THREE.Texture {
  const a = Math.round(aspect * 100) / 100;
  return tex("visuel:" + a, () => {
    const h = 540, w = Math.max(240, Math.round(h * a)), c = canvas(w, h), g = c.getContext("2d")!;
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#0a0626"); bg.addColorStop(0.5, "#3a0b52"); bg.addColorStop(1, "#06122e"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter"; const cx = w / 2, cy = h * 1.05;
    for (let i = 0; i < 26; i++) { const t = i / 25, ang = -Math.PI * (0.06 + 0.88 * t), len = h * 1.5, wd = 0.018 + 0.03 * ((i * 7) % 5) / 4, hue = 190 + 150 * t;
      const gr = g.createLinearGradient(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); gr.addColorStop(0, `hsla(${hue},95%,70%,0.9)`); gr.addColorStop(0.6, `hsla(${hue},95%,55%,0.35)`); gr.addColorStop(1, `hsla(${hue},95%,50%,0)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang - wd) * len, cy + Math.sin(ang - wd) * len); g.lineTo(cx + Math.cos(ang + wd) * len, cy + Math.sin(ang + wd) * len); g.closePath(); g.fill(); }
    const sun = g.createRadialGradient(cx, cy, 0, cx, cy, h * 0.55); sun.addColorStop(0, "rgba(255,240,220,1)"); sun.addColorStop(0.35, "rgba(255,120,200,0.55)"); sun.addColorStop(1, "rgba(120,60,255,0)"); g.fillStyle = sun; g.fillRect(0, 0, w, h);
    return c;
  });
}
const images = new Map<string, THREE.Texture>();
export function imageTexture(url: string, onLoad: () => void): THREE.Texture {
  let t = images.get(url); if (!t) { t = new THREE.TextureLoader().load(url, onLoad); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; images.set(url, t); if (images.size > 24) { const k = images.keys().next().value!; images.get(k)?.dispose(); images.delete(k); } }
  return t;
}
const projections = new Map<string, THREE.CanvasTexture>();
/** Image d'un vidéoprojecteur telle qu'elle sort de l'objectif : centrée dans un carré noir, sur la fraction « frac » de sa largeur. */
export function projectionTexture(source: "mire" | string, aspect: number, frac: number, onLoad: () => void, offX = 0, offY = 0): THREE.CanvasTexture {
  const key = source.slice(0, 64) + source.length + "|" + aspect.toFixed(3) + "|" + frac.toFixed(4) + "|" + offX.toFixed(4) + "|" + offY.toFixed(4); let t = projections.get(key); if (t) return t;
  /* offX, offY : centre de l'image par rapport à l'axe optique, en fraction du demi-côté du carré (décalage d'objectif) ; le haut de l'image est en haut du carré */
  const S = 2048, c = canvas(S, S), g = c.getContext("2d")!, w = S * frac, h = w / aspect, x = (S - w) / 2 + (offX * S) / 2, y = (S - h) / 2 - (offY * S) / 2; g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; const made = t;
  if (source === "mire") g.drawImage(mireTexture(aspect).image as CanvasImageSource, x, y, w, h);
  else { const img = new Image(); img.onload = () => { /* l'image remplit le cadre sans être déformée */ const k = Math.max(w / img.width, h / img.height), iw = w / k, ih = h / k; g.drawImage(img, (img.width - iw) / 2, (img.height - ih) / 2, iw, ih, x, y, w, h); made.needsUpdate = true; onLoad(); }; img.src = source; }
  projections.set(key, t); if (projections.size > 12) { const k = projections.keys().next().value!; projections.get(k)?.dispose(); projections.delete(k); }
  return t;
}
// Réduit une image choisie par l'utilisateur pour qu'elle voyage dans le projet sans l'alourdir (1280 px au plus, JPEG).
export async function shrinkImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight)), c = canvas(Math.max(1, Math.round(img.naturalWidth * k)), Math.max(1, Math.round(img.naturalHeight * k)));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.85);
  } catch { throw new Error("Cette image n'a pas pu être lue. Formats acceptés : PNG et JPEG."); } finally { URL.revokeObjectURL(url); }
}

// Image projetée par un appareil : son gobo (ou un disque plein), resserré par l'iris et rogné par les couteaux.
// Rendue sur un petit canevas, gardée en réserve : les mêmes réglages redonnent la même image.
const masks = new Map<string, THREE.CanvasTexture>();
export function maskTexture(goboKey: string, gobo: THREE.Texture | null, iris: number, blades: number[] | null, tilts: number[] | null, rotDeg: number): THREE.Texture | null {
  const q = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 32) / 32, ir = q(iris), bl = (blades ?? [0, 0, 0, 0]).map(q), plain = ir >= 1 && bl.every((b) => b === 0);
  if (plain) return gobo;
  const img = gobo?.image as (HTMLImageElement | HTMLCanvasElement | undefined), ready = !img || (img as HTMLImageElement).complete !== false;
  const key = [goboKey, ready ? 1 : 0, ir, bl.join(), (tilts ?? []).map((t) => Math.round(t)).join(), Math.round(rotDeg)].join("|");
  let t = masks.get(key);
  if (!t) {
    const c = canvas(256, 256), g = c.getContext("2d")!, R = 122; g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256);
    g.save(); g.beginPath(); g.arc(128, 128, R * (0.12 + 0.88 * ir), 0, Math.PI * 2); g.clip();
    if (img && ready) { try { g.drawImage(img, 0, 0, 256, 256); } catch { g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256); } } else { g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256); }
    g.restore(); g.fillStyle = "#000";
    bl.forEach((ins, i) => { if (ins <= 0) return; g.save(); g.translate(128, 128); g.rotate(((rotDeg + i * 90 + (tilts?.[i] ?? 0)) * Math.PI) / 180); g.fillRect(-200, -200, 400, 200 - R + ins * R); g.restore(); });
    t = new THREE.CanvasTexture(c); masks.set(key, t);
    if (masks.size > 96) { const k = masks.keys().next().value!; masks.get(k)?.dispose(); masks.delete(k); }
  }
  return t;
}

// Couleur moyenne d'une image (pour la lumière qu'un mur LED renvoie sur la scène). Calculée une fois, dès que l'image est lue.
const avgs = new Map<string, [number, number, number] | "loading">();
export function averageColor(url: string): [number, number, number] | null {
  const got = avgs.get(url); if (got && got !== "loading") return got; if (got) return null; avgs.set(url, "loading");
  const im = new Image(); im.onload = () => { try { const c = canvas(8, 8), g = c.getContext("2d")!; g.drawImage(im, 0, 0, 8, 8); const d = g.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } avgs.set(url, [r / 64 / 255, gg / 64 / 255, b / 64 / 255]); window.dispatchEvent(new CustomEvent("sf:people")); } catch { avgs.set(url, [0.5, 0.5, 0.5]); } };
  im.onerror = () => avgs.set(url, [0.5, 0.5, 0.5]); im.src = url; return null;
}
