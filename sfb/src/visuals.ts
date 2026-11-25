// Visuels dessinés par le logiciel : contenus de murs LED et images de mapping pour les projets d'exemple.
// Tout est tracé ici, à la main : aucune image reprise ailleurs.
export type VisualKind = "rayons" | "tunnel" | "barres" | "aurore" | "palais" | "nuit" | "braise" | "titre";
const memo = new Map<string, string>();
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Une image prête à mettre sur un mur LED ou dans un vidéoprojecteur (adresse de données JPEG). */
export function visualUrl(kind: VisualKind, w = 640, h = 360, text = "ScenoFactory"): string {
  const key = kind + w + "x" + h + text, had = memo.get(key); if (had) return had;
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; seed = 11 + kind.length * 97 + w;
  const fill = (stops: [number, string][], x0 = 0, y0 = 0, x1 = 0, y1 = h) => { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [t, col] of stops) gr.addColorStop(t, col); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  if (kind === "rayons") {
    fill([[0, "#0a0626"], [0.5, "#3a0b52"], [1, "#06122e"]], 0, 0, w, h); g.globalCompositeOperation = "lighter"; const cx = w / 2, cy = h * 1.05;
    for (let i = 0; i < 26; i++) { const t = i / 25, a = -Math.PI * (0.06 + 0.88 * t), len = h * 1.6, wd = 0.018 + 0.03 * ((i * 7) % 5) / 4, hue = 190 + 150 * t, gr = g.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      gr.addColorStop(0, `hsla(${hue},95%,70%,0.9)`); gr.addColorStop(0.6, `hsla(${hue},95%,55%,0.35)`); gr.addColorStop(1, `hsla(${hue},95%,50%,0)`); g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - wd) * len, cy + Math.sin(a - wd) * len); g.lineTo(cx + Math.cos(a + wd) * len, cy + Math.sin(a + wd) * len); g.fill(); }
  } else if (kind === "tunnel") {
    g.fillStyle = "#01030a"; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 12; i++) { const k = Math.pow(0.78, i), ww = w * 0.96 * k, hh = h * 0.92 * k; g.save(); g.translate(w / 2, h / 2); g.rotate(i * 0.13); g.strokeStyle = `hsla(${188 + i * 4},100%,${62 - i * 2}%,${0.95 - i * 0.05})`; g.lineWidth = Math.max(1.5, 9 * k); g.shadowColor = "#19d8ff"; g.shadowBlur = 18; g.strokeRect(-ww / 2, -hh / 2, ww, hh); g.restore(); }
  } else if (kind === "barres") {
    g.fillStyle = "#04020c"; g.fillRect(0, 0, w, h); const n = 32, bw = w / n;
    for (let i = 0; i < n; i++) { const v = 0.15 + 0.8 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21 + 1)) * (0.6 + 0.4 * rnd()), bh = h * v, gr = g.createLinearGradient(0, h, 0, h - bh); gr.addColorStop(0, "#ff2a6d"); gr.addColorStop(0.6, "#ffb347"); gr.addColorStop(1, "#fff6c9"); g.fillStyle = gr; g.fillRect(i * bw + 2, h - bh, bw - 4, bh); }
  } else if (kind === "aurore") {
    fill([[0, "#020814"], [1, "#061a2a"]]); g.globalCompositeOperation = "lighter";
    for (let b = 0; b < 5; b++) { g.beginPath(); const y0 = h * (0.25 + 0.12 * b), hue = 140 + b * 28; g.moveTo(0, h); for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.012 + b * 1.7) * h * 0.11 + Math.sin(x * 0.031 + b) * h * 0.04); g.lineTo(w, h); const gr = g.createLinearGradient(0, y0 - h * 0.15, 0, h); gr.addColorStop(0, `hsla(${hue},95%,62%,0.55)`); gr.addColorStop(0.5, `hsla(${hue + 30},90%,45%,0.18)`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fill(); }
  } else if (kind === "braise") {
    fill([[0, "#1a0500"], [0.6, "#a31d00"], [1, "#ffb400"]]); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 260; i++) { const x = rnd() * w, y = rnd() * h, r = 1 + rnd() * 5 * (y / h); g.fillStyle = `rgba(255,${150 + Math.round(rnd() * 100)},60,${0.25 + rnd() * 0.6})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  } else if (kind === "nuit") {
    fill([[0, "#02030c"], [0.7, "#0b1638"], [1, "#27305e"]]);
    for (let i = 0; i < 320; i++) { g.fillStyle = `rgba(255,255,${220 + Math.round(rnd() * 35)},${0.3 + rnd() * 0.7})`; g.fillRect(rnd() * w, rnd() * h * 0.8, 1 + rnd() * 1.6, 1 + rnd() * 1.6); }
    const mx = w * 0.76, my = h * 0.26, mr = h * 0.11, halo = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 4); halo.addColorStop(0, "rgba(255,246,214,0.5)"); halo.addColorStop(1, "rgba(255,246,214,0)"); g.fillStyle = halo; g.fillRect(0, 0, w, h); g.fillStyle = "#fff6d6"; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
  } else if (kind === "palais") {
    // un décor peint : mur ocre, pilastres, grande arche et soubassement, comme une toile de théâtre
    fill([[0, "#e9cf9c"], [1, "#d7b57a"]]); const col = (x: number, cw: number) => { const gr = g.createLinearGradient(x, 0, x + cw, 0); gr.addColorStop(0, "#b98a4e"); gr.addColorStop(0.35, "#f6e3b8"); gr.addColorStop(1, "#a97a40"); g.fillStyle = gr; g.fillRect(x, h * 0.16, cw, h * 0.7); g.fillStyle = "#8d6230"; g.fillRect(x - cw * 0.25, h * 0.12, cw * 1.5, h * 0.05); g.fillRect(x - cw * 0.25, h * 0.85, cw * 1.5, h * 0.04); };
    g.fillStyle = "#7c3b2a"; g.fillRect(0, 0, w, h * 0.1); g.fillStyle = "#c98d3b"; g.fillRect(0, h * 0.1, w, h * 0.025);
    for (const x of [0.04, 0.2, 0.74, 0.9]) col(w * x, w * 0.06);
    g.fillStyle = "#20110c"; g.beginPath(); g.moveTo(w * 0.33, h); g.lineTo(w * 0.33, h * 0.46); g.arc(w * 0.5, h * 0.46, w * 0.17, Math.PI, 0); g.lineTo(w * 0.67, h); g.fill();
    g.strokeStyle = "#8d6230"; g.lineWidth = h * 0.03; g.beginPath(); g.moveTo(w * 0.315, h); g.lineTo(w * 0.315, h * 0.46); g.arc(w * 0.5, h * 0.46, w * 0.185, Math.PI, 0); g.lineTo(w * 0.685, h); g.stroke();
    g.fillStyle = "#5a3020"; g.fillRect(0, h * 0.89, w, h * 0.11); g.fillStyle = "rgba(0,0,0,0.25)"; for (let x = 0; x < w; x += w / 14) g.fillRect(x, h * 0.9, 2, h * 0.1);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,240,200"},${0.02 + rnd() * 0.04})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 1); }
  } else {
    fill([[0, "#050510"], [1, "#16052c"]], 0, 0, w, h); g.textAlign = "center"; g.textBaseline = "middle"; g.font = `800 ${Math.round(h * 0.26)}px system-ui, sans-serif`; g.shadowColor = "#ff3ea5"; g.shadowBlur = 30; g.fillStyle = "#ffffff"; g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 0; g.fillStyle = "#19d8ff"; g.fillRect(w * 0.2, h * 0.72, w * 0.6, h * 0.02);
  }
  const url = c.toDataURL("image/jpeg", 0.82); memo.set(key, url); return url;
}
