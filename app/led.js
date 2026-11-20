// Mur LED : surface lumineuse (pas de vidéoprojecteur, pas d'ombre), contenus générés, fichiers, entrée vidéo (NDI via webcam virtuelle) et configurateur.
import * as THREE from 'three';
export function createLed(A, ST){
  const $ = s => document.querySelector(s), esc = s => ST.esc(s), reg = new Map(), media = new Map();          // id -> rendu ; id -> { el, kind, stream }
  const PANELS = { '50x50': [.5, .5, 8, 160], '50x100': [.5, 1, 14, 300], '60x60': [.6, .6, 9.5, 190], '100x50': [1, .5, 14, 300] };          // largeur, hauteur (m), kg, W max
  const PITCH = [1.9, 2.6, 2.9, 3.9, 4.8, 5.9, 8.3];
  const CONT = { plasma: 'Plasma animé', spectre: 'Spectre audio (réagit à la musique)', barres: 'Barres en mouvement', degrade: 'Dégradé animé', couleur: 'Couleur unie', texte: 'Texte défilant', mire: 'Mire de réglage', image: 'Image…', video: 'Fichier vidéo…', capture: 'Entrée vidéo (NDI, caméra, carte d\'acquisition)', ecran: 'Capture d\'écran ou de fenêtre' };
  const DEF = { panel: '50x50', cols: 12, rows: 6, pitch: 3.9, bright: .8, curve: 0, content: 'plasma', color: '#b04bff', color2: '#2affd0', text: 'ONEX', speed: 1, fit: 'cover', glow: true, dev: '' };
  const cfg = o => (o.led = { ...DEF, ...(o.led || {}) });
  const info = o => { const L = cfg(o), [pw, ph, kg, wmax] = PANELS[L.panel] || PANELS['50x50'], w = L.cols * pw, h = L.rows * ph, n = L.cols * L.rows, px = Math.round(w * 1000 / L.pitch), py = Math.round(h * 1000 / L.pitch);
    return { L, pw, ph, w, h, n, px, py, kg: Math.round(n * kg + w * 6), wmax: n * wmax, ports: Math.max(1, Math.ceil(px * py / 650000)), dmin: L.pitch, ar: w / h }; };

  // ---------------------------------------------------------------- objet 3D
  function build(r, o){
    const I = info(o), L = I.L, seg = L.curve ? Math.max(8, L.cols) : 1, geo = new THREE.PlaneGeometry(I.w, I.h, seg, 1), back = new THREE.PlaneGeometry(I.w, I.h, seg, 1);
    if (L.curve){ const a = L.curve * Math.PI / 180, R = I.w / a; for (const g of [geo, back]){ const p = g.attributes.position; for (let i = 0; i < p.count; i++){ const t = p.getX(i) / R; p.setX(i, Math.sin(t) * R); p.setZ(i, (1 - Math.cos(t)) * R); } g.computeVertexNormals(); } }
    const cw = Math.min(1024, Math.max(128, I.px)), ch = Math.max(32, Math.round(cw / I.ar)), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), face = new THREE.Mesh(geo, mat); face.position.y = I.h / 2; face.userData.noShadow = true;
    const bm = new THREE.Mesh(back, new THREE.MeshStandardMaterial({ color: '#141418', roughness: .7, metalness: .3, side: THREE.DoubleSide })); bm.position.set(0, I.h / 2, -.05); bm.userData.noShadow = bm.userData.noBake = true; face.userData.noBake = true;
    const fr = new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: .6 }), bar = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fr); m.position.set(x, y, z); m.userData.noShadow = m.userData.noBake = true; return m; };
    r.head.add(face, bm, bar(I.w + .06, .05, .1, 0, I.h + .025, -.03), bar(I.w + .06, .05, .1, 0, -.025, -.03));
    if (o.hang){ for (const sx of [-1, 1]) r.head.add(bar(.012, 2.5, .012, sx * I.w * .38, I.h + 1.3, -.03)); } else if (o.pos[1] < .05){ for (const sx of [-1, 1]) r.head.add(bar(.08, .06, .9, sx * I.w * .4, .03, -.35)); }
    const glow = new THREE.SpotLight('#fff', 0, 0, 1.25, 1, 1.6); glow.castShadow = false; r.extra.push(glow, glow.target);
    r.led = { o, I, cv, g: cv.getContext('2d'), tex, mat, face, glow, t: 0, acc: 0, probe: document.createElement('canvas'), avg: new THREE.Color(0, 0, 0) }; r.led.probe.width = r.led.probe.height = 8; reg.set(o.id, r);
    draw(r.led, 0, true);
  }
  function dispose(id){ const r = reg.get(id); if (r && r.led){ r.led.tex.dispose(); r.led.mat.dispose(); } reg.delete(id); }
  function forget(id){ const m = media.get(id); if (m){ if (m.stream) m.stream.getTracks().forEach(t => t.stop()); media.delete(id); } }

  // ---------------------------------------------------------------- contenus
  function draw(d, dt, force){
    const o = d.o, L = cfg(o), g = d.g, W = d.cv.width, H = d.cv.height, sp = L.speed ?? 1, md = media.get(o.id); d.t += dt * sp; const t = d.t, k = L.content;
    const live = k === 'plasma' || k === 'spectre' || k === 'barres' || k === 'degrade' || k === 'texte' || ((k === 'video' || k === 'capture' || k === 'ecran') && md && md.el);
    if (!force && !live && !d.dirty) return; d.dirty = false;
    if ((k === 'image' || k === 'video' || k === 'capture' || k === 'ecran') && md && md.el && (md.el.videoWidth || md.el.naturalWidth)){
      const sw = md.el.videoWidth || md.el.naturalWidth, sh = md.el.videoHeight || md.el.naturalHeight; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      if (L.fit === 'stretch') g.drawImage(md.el, 0, 0, W, H); else { const s = (L.fit === 'contain' ? Math.min : Math.max)(W / sw, H / sh), dw = sw * s, dh = sh * s; g.drawImage(md.el, (W - dw) / 2, (H - dh) / 2, dw, dh); } }
    else if (k === 'couleur'){ g.fillStyle = L.color; g.fillRect(0, 0, W, H); }
    else if (k === 'degrade'){ const a = t * .4, gr = g.createLinearGradient(W / 2 + Math.cos(a) * W, H / 2 + Math.sin(a) * H, W / 2 - Math.cos(a) * W, H / 2 - Math.sin(a) * H); gr.addColorStop(0, L.color); gr.addColorStop(.5, L.color2); gr.addColorStop(1, L.color); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    else if (k === 'barres'){ g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const n = 9, bw = W / n; for (let i = -1; i <= n; i++){ const x = ((i * bw + t * 90) % (W + bw)) - bw; g.fillStyle = i % 2 ? L.color : L.color2; g.fillRect(x, 0, bw * .55, H); } }
    else if (k === 'texte'){ g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.font = `800 ${Math.round(H * .62)}px Inter, system-ui, sans-serif`; g.textBaseline = 'middle'; const tw = g.measureText(L.text + '   ').width || 1, gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, L.color2); gr.addColorStop(1, L.color); g.fillStyle = gr; for (let x = -((t * 120) % tw); x < W; x += tw) g.fillText(L.text + '   ', x, H / 2); }
    else if (k === 'spectre'){ const au = window.AUDIO && AUDIO.st, sp2 = au && au.spec, on = sp2 && au.el && !au.el.paused; g.fillStyle = `rgba(0,0,0,${on ? .35 : 1})`; g.fillRect(0, 0, W, H); const n = 48, bw = W / n, gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, L.color); gr.addColorStop(1, L.color2); g.fillStyle = gr;
      for (let i = 0; i < n; i++){ const v = on ? sp2[Math.floor(Math.pow(i / n, 1.8) * 380) + 2] / 255 : .32 + .22 * Math.sin(t * 2 + i * .45) + .12 * Math.sin(t * 3.1 - i * .9) + (au ? au.beat * .4 : 0); g.fillRect(i * bw + 1, H - v * H, bw - 2, v * H); }
      if (au && au.beat > .5){ g.fillStyle = `rgba(255,255,255,${(au.beat - .5) * .5})`; g.fillRect(0, 0, W, H); } }
    else if (k === 'mire'){ g.fillStyle = '#111'; g.fillRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 1; const I = d.I; for (let i = 0; i <= L.cols; i++){ g.beginPath(); g.moveTo(i * W / L.cols, 0); g.lineTo(i * W / L.cols, H); g.stroke(); } for (let j = 0; j <= L.rows; j++){ g.beginPath(); g.moveTo(0, j * H / L.rows); g.lineTo(W, j * H / L.rows); g.stroke(); }
      ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f'].forEach((c, i) => { g.fillStyle = c; g.fillRect(W * .15 + i * W * .1, H * .62, W * .1, H * .16); }); g.beginPath(); g.arc(W / 2, H / 2, H * .44, 0, 7); g.lineWidth = 3; g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(H * .12)}px Inter, sans-serif`; g.fillText(`${I.px} × ${I.py}`, W / 2, H * .34); g.font = `${Math.round(H * .07)}px Inter, sans-serif`; g.fillText(`${L.cols} × ${L.rows} dalles · pas ${L.pitch} mm`, W / 2, H * .48); g.textAlign = 'left'; }
    else { const c1 = new THREE.Color(L.color), c2 = new THREE.Color(L.color2), step = Math.max(8, Math.round(W / 48));                               // plasma
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step){ const u = x / W * 6, v = y / H * 6 * (H / W), q = .5 + .25 * Math.sin(u + t) + .25 * Math.sin(v * 1.3 - t * .8) + .25 * Math.sin((u + v) * .7 + t * .6) + .25 * Math.sin(Math.hypot(u - 3, v - 2) * 1.6 - t * 1.2), m = Math.max(0, Math.min(1, q));
        g.fillStyle = `rgb(${Math.round((c1.r + (c2.r - c1.r) * m) * 255 * (.35 + .65 * m))},${Math.round((c1.g + (c2.g - c1.g) * m) * 255 * (.35 + .65 * m))},${Math.round((c1.b + (c2.b - c1.b) * m) * 255 * (.35 + .65 * m))})`; g.fillRect(x, y, step, step); } }
    d.tex.needsUpdate = true;
    try { const pg = d.probe.getContext('2d', { willReadFrequently: true }); pg.drawImage(d.cv, 0, 0, 8, 8); const px = pg.getImageData(0, 0, 8, 8).data; let R = 0, G = 0, B = 0; for (let i = 0; i < px.length; i += 4){ R += px[i]; G += px[i + 1]; B += px[i + 2]; } d.avg.setRGB(R / 64 / 255, G / 64 / 255, B / 64 / 255, THREE.SRGBColorSpace); } catch (_){}
  }
  const _p = new THREE.Vector3(), _n = new THREE.Vector3(), _q = new THREE.Quaternion();
  function update(dt){
    for (const r of reg.values()){ const d = r.led, o = d.o, L = cfg(o), on = !o.hidden; d.acc += dt; if (d.acc >= 1 / 30){ draw(d, d.acc); d.acc = 0; }
      const b = Math.max(0, Math.min(1, L.bright)) * (ST.S.black ? 0 : 1); d.mat.color.setScalar(.25 + 1.35 * b); if (!b) d.mat.color.setScalar(0);
      d.face.getWorldPosition(_p); d.face.getWorldQuaternion(_q); _n.set(0, 0, 1).applyQuaternion(_q);
      d.glow.visible = on && L.glow && b > 0; if (d.glow.visible){ d.glow.position.copy(_p).addScaledVector(_n, .1); d.glow.target.position.copy(_p).addScaledVector(_n, 6).setY(Math.max(0, _p.y - 2.5)); d.glow.target.updateMatrixWorld(); d.glow.color.copy(d.avg); const lum = Math.max(d.avg.r, d.avg.g, d.avg.b); if (lum > .001) d.glow.color.multiplyScalar(1 / lum); d.glow.intensity = b * Math.sqrt(lum) * Math.min(260, 9 * d.I.w * d.I.h); } }
  }

  // ---------------------------------------------------------------- sources : fichier, entrée vidéo, capture d'écran
  function setVideo(o, el, kind, stream){ forget(o.id); media.set(o.id, { el, kind, stream }); const r = reg.get(o.id); if (r) r.led.dirty = true; }
  function pickFile(o, kind){ const i = document.createElement('input'); i.type = 'file'; i.accept = kind === 'image' ? 'image/*' : 'video/*'; i.onchange = () => { const f = i.files[0]; if (!f) return; const url = URL.createObjectURL(f); let el;
      if (kind === 'image'){ el = new Image(); el.onload = () => { const r = reg.get(o.id); if (r) r.led.dirty = true; }; el.src = url; } else { el = document.createElement('video'); el.src = url; el.loop = true; el.muted = true; el.playsInline = true; el.play().catch(() => {}); } setVideo(o, el, kind); cfg(o).file = f.name; panel(); }; i.click(); }
  async function devices(){ try { return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); } catch (_){ return []; } }
  async function openStream(o, kind){
    const md = navigator.mediaDevices; if (!md || !(kind === 'ecran' ? md.getDisplayMedia : md.getUserMedia)) return ST.toast('Cette source vidéo n\'est pas disponible dans ce navigateur ou cette vue. Utilise la version installée, dans Chrome ou Edge.', true);
    try { const L = cfg(o), stream = kind === 'ecran' ? await md.getDisplayMedia({ video: { frameRate: 30 }, audio: false }) : await md.getUserMedia({ video: L.dev ? { deviceId: { exact: L.dev }, width: { ideal: 1920 }, height: { ideal: 1080 } } : { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      const el = document.createElement('video'); el.srcObject = stream; el.muted = true; el.playsInline = true; await el.play().catch(() => {}); setVideo(o, el, kind, stream); stream.getVideoTracks()[0].addEventListener('ended', () => { forget(o.id); panel(); }); ST.toast('Source vidéo connectée au mur LED.'); }
    catch (e){ ST.toast(e && e.name === 'NotAllowedError' ? 'Accès à la source vidéo refusé (par toi, ou par la page en ligne). Dans la version installée, autorise la caméra quand le navigateur le demande.' : 'Impossible d\'ouvrir cette source : ' + (e && e.message || e), true); }
    panel();
  }

  // ---------------------------------------------------------------- configurateur (panneau flottant)
  const P = document.createElement('div'); P.id = 'ledPanel'; P.style.display = 'none'; document.body.appendChild(P); let cur = null, devs = [];
  const walls = () => ST.S.objs.filter(o => ST.typeOf(o).kind === 'ledwall');
  function addWall(){ const t = ST.LIBALL().find(q => q.id === 'mur-led'); ST.pushUndo(0, 'Ajouter un mur LED'); const o = ST.defaults(t); o.n = ST.nextNum('str'); o.pos = [0, 1, -8.6]; o.yaw = 0; o.name = 'Mur LED ' + (walls().length + 1); cfg(o); o.w = info(o).kg; ST.S.objs.push(o); ST.build(o); ST.touch(); cur = o.id; ST.select([o.id]); panel(); }
  function apply(o, rebuild){ o.w = info(o).kg; if (rebuild){ ST.unbuild(o.id); ST.build(o); if (ST.UI.sel.includes(o.id)) ST.select(ST.UI.sel); } else { const r = reg.get(o.id); if (r) r.led.dirty = true; } ST.touch(); }
  const num = (k, v, min, max, step, w = 64) => `<input type="number" data-lk="${k}" value="${v}" min="${min}" max="${max}" step="${step}" style="width:${w}px">`;
  function panel(){
    if (P.style.display === 'none') return; const ws = walls(); let o = ws.find(q => q.id === cur) || ws.find(q => ST.UI.sel.includes(q.id)) || ws[0]; cur = o ? o.id : null;
    if (!o){ P.innerHTML = `<div class="ah"><b>Mur LED</b><span data-la="close" style="cursor:pointer;color:var(--mute)">✕</span></div><div class="sub">Aucun mur LED dans le projet. Un mur LED est une surface lumineuse : il ne projette pas d'ombre et n'a pas besoin de vidéoprojecteur.</div><div class="btns"><button class="b on" data-la="add">Ajouter un mur LED</button></div>`; return; }
    const I = info(o), L = I.L, md = media.get(o.id), src = L.content === 'capture' || L.content === 'ecran', hung = o.hang === 'perche';
    P.innerHTML = `<div class="ah"><b>Mur LED</b><span data-la="close" style="cursor:pointer;color:var(--mute)">✕</span></div>
      <div class="lr"><select data-la="pick" style="flex:1">${ws.map(q => `<option value="${q.id}"${q.id === o.id ? ' selected' : ''}>${esc(q.name || 'Mur LED')}</option>`).join('')}</select><button class="b" data-la="add" title="Ajouter un autre mur">+</button><button class="b" data-la="del" title="Supprimer ce mur">Suppr.</button></div>
      <h4>Dalles</h4><div class="lg"><label>Dalle</label><select data-lk="panel">${Object.keys(PANELS).map(k => `<option value="${k}"${k === L.panel ? ' selected' : ''}>${k.replace('x', ' × ')} cm</option>`).join('')}</select>
        <label>Largeur × hauteur (dalles)</label><span>${num('cols', L.cols, 1, 60, 1, 54)} × ${num('rows', L.rows, 1, 30, 1, 54)}</span>
        <label>Pas de pixel</label><select data-lk="pitch">${PITCH.map(p => `<option value="${p}"${p === L.pitch ? ' selected' : ''}>${String(p).replace('.', ',')} mm</option>`).join('')}</select>
        <label>Courbure totale (°)</label>${num('curve', L.curve, -120, 120, 5)}</div>
      <div class="lq"><button class="b" data-lp="16,9">16:9</button><button class="b" data-lp="21,9">21:9</button><button class="b" data-lp="4,3">4:3</button><button class="b" data-lp="1,1">Carré</button><span>au plus proche, même largeur</span></div>
      <div class="info" style="border:1px solid rgba(110,119,135,.3)"><b>${ST.fmt(I.w, 2)} × ${ST.fmt(I.h, 2)} m</b> · ${I.n} dalles · <b>${I.px} × ${I.py} px</b> (${(I.px * I.py / 1e6).toFixed(2).replace('.', ',')} Mpx)<br>Poids <b>${I.kg} kg</b> avec structure · puissance max <b>${(I.wmax / 1000).toFixed(1).replace('.', ',')} kW</b>, moyenne ≈ ${(I.wmax / 3000).toFixed(1).replace('.', ',')} kW<br>Sorties processeur : <b>${I.ports}</b> (≈ 650 000 px par port) · recul minimal conseillé ≈ <b>${ST.fmt(I.dmin, 1)} m</b></div>
      <h4>Position</h4><div class="lg"><label>Accroche</label><select data-la="hang"><option value="">Posé / sur pieds</option>${A.PERCHES.map((q, i) => q.off ? '' : `<option value="${i}"${hung && o.pi === i ? ' selected' : ''}>Sous la perche ${i + 1}</option>`).join('')}</select>
        <label>Axe (jardin − / cour +) · profondeur (m)</label><span>${num('x', ST.fmt(o.pos[0], 2).replace(',', '.'), -9, 9, .1, 58)} · ${num('z', ST.fmt(o.pos[2], 2).replace(',', '.'), -10, 22, .1, 58)}</span>
        <label>Hauteur du bas (m)</label>${num('y', ST.fmt(hung ? ST.posOf(o).y : o.pos[1], 2).replace(',', '.'), 0, 8, .05)}<label>Rotation (°)</label>${num('yaw', o.yaw || 0, -180, 180, 5)}</div>
      <h4>Image</h4><div class="lg"><label>Contenu</label><select data-lk="content">${Object.entries(CONT).map(([k, v]) => `<option value="${k}"${k === L.content ? ' selected' : ''}>${v}</option>`).join('')}</select>
        ${L.content === 'image' || L.content === 'video' ? `<label>Fichier</label><span><button class="b" data-la="file">Choisir…</button> ${esc(md ? L.file || 'chargé' : 'aucun (à rechoisir à chaque session)')}</span>` : ''}
        ${L.content === 'capture' ? `<label>Périphérique</label><span style="display:flex;gap:4px"><select data-lk="dev" style="flex:1;min-width:0"><option value="">Par défaut</option>${devs.map(d => `<option value="${esc(d.deviceId)}"${d.deviceId === L.dev ? ' selected' : ''}>${esc(d.label || 'Entrée vidéo')}</option>`).join('')}</select><button class="b" data-la="devs" title="Actualiser la liste">↻</button></span>` : ''}
        ${src ? `<label>Source</label><span><button class="b${md ? '' : ' on'}" data-la="open">${md ? 'Reconnecter' : 'Connecter'}</button> ${md ? '<span style="color:#3fb97a">connectée</span> <a data-la="stop" style="cursor:pointer;text-decoration:underline">couper</a>' : 'non connectée'}</span>` : ''}
        ${['image', 'video', 'capture', 'ecran'].includes(L.content) ? `<label>Cadrage</label><select data-lk="fit"><option value="cover"${L.fit === 'cover' ? ' selected' : ''}>Remplir (rogner)</option><option value="contain"${L.fit === 'contain' ? ' selected' : ''}>Entier (bandes noires)</option><option value="stretch"${L.fit === 'stretch' ? ' selected' : ''}>Étirer</option></select>` : ''}
        ${['plasma', 'spectre', 'barres', 'degrade', 'couleur', 'texte'].includes(L.content) ? `<label>Couleurs</label><span><input type="color" data-lk="color" value="${L.color}"> ${L.content === 'couleur' ? '' : `<input type="color" data-lk="color2" value="${L.color2}">`}</span>` : ''}
        ${L.content === 'texte' ? `<label>Texte</label><input type="text" data-lk="text" value="${esc(L.text)}" style="width:100%">` : ''}
        ${['plasma', 'spectre', 'barres', 'degrade', 'texte'].includes(L.content) ? `<label>Vitesse</label><input type="range" data-lk="speed" min="0" max="3" step="0.05" value="${L.speed}">` : ''}
        <label>Luminosité</label><input type="range" data-lk="bright" min="0" max="1" step="0.01" value="${L.bright}">
        <label>Éclaire la scène devant lui</label><input type="checkbox" data-lk="glow" ${L.glow ? 'checked' : ''}></div>
      ${L.content === 'capture' ? `<div class="sub"><b>NDI depuis MadMapper :</b> active la sortie NDI dans MadMapper, puis lance « NDI Webcam Input » (Windows, dans NDI Tools) ou « NDI Virtual Input » (Mac) et choisis-y la source MadMapper. Elle apparaît alors ici comme un périphérique vidéo. Une carte d'acquisition ou une caméra fonctionnent de la même façon.</div>` : ''}`;
  }
  P.addEventListener('click', async e => { const a = e.target.closest('[data-la]')?.dataset.la, o = walls().find(q => q.id === cur), pr = e.target.closest('[data-lp]');
    if (pr && o){ const [aw, ah] = pr.dataset.lp.split(',').map(Number), I = info(o); ST.pushUndo(0, 'Format du mur LED'); o.led.rows = Math.max(1, Math.round(I.w / (aw / ah) / I.ph)); apply(o, true); return panel(); }
    if (!a || e.target.tagName === 'SELECT') return;
    if (a === 'close') return toggle(false); if (a === 'add') return addWall();
    if (!o) return;
    if (a === 'del'){ ST.select([o.id]); ST.removeSel(); forget(o.id); cur = null; return panel(); }
    if (a === 'file') return pickFile(o, o.led.content); if (a === 'open') return openStream(o, o.led.content); if (a === 'stop'){ forget(o.id); return panel(); }
    if (a === 'devs'){ devs = await devices(); if (!devs.some(d => d.label)){ try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach(t => t.stop()); devs = await devices(); } catch (_){ ST.toast('Autorise l\'accès à la caméra pour lister les entrées vidéo (version installée).', true); } } return panel(); } });
  P.addEventListener('change', e => { const el = e.target, o = walls().find(q => q.id === cur);
    if (el.dataset.la === 'pick'){ cur = el.value; ST.select([cur]); return panel(); } if (!o) return;
    if (el.dataset.la === 'hang'){ ST.pushUndo(0, 'Accroche du mur LED'); if (el.value === ''){ o.hang = null; delete o.pi; o.pos[1] = 1; } else { const i = +el.value, I = info(o); o.hang = 'perche'; o.pi = i; o.pos[2] = A.PERCHES[i].z; o.pos[1] = Math.max(.2, 5.97 - I.h - .4); } apply(o, true); return panel(); }
    const k = el.dataset.lk; if (!k) return; const L = cfg(o);
    if (k === 'x' || k === 'z' || k === 'y' || k === 'yaw'){ ST.pushUndo('ledpos', 'Position du mur LED'); const v = parseFloat(el.value) || 0; if (k === 'x') o.pos[0] = v; else if (k === 'z'){ if (o.hang !== 'perche') o.pos[2] = v; } else if (k === 'y') o.pos[1] = Math.max(0, o.hang === 'perche' ? v - A.percheDeltaAt(o.pos[2]) : v); else o.yaw = v; apply(o, k === 'y'); return panel(); }
    ST.pushUndo('led' + k, 'Mur LED'); const struct = k === 'panel' || k === 'cols' || k === 'rows' || k === 'pitch' || k === 'curve';
    L[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' || k === 'pitch' ? parseFloat(el.value) || 0 : el.value; if (k === 'cols') L.cols = Math.max(1, Math.min(60, Math.round(L.cols))); if (k === 'rows') L.rows = Math.max(1, Math.min(30, Math.round(L.rows)));
    if (k === 'content'){ if (L.content === 'image' || L.content === 'video'){ if (!media.get(o.id) || media.get(o.id).kind !== L.content) pickFile(o, L.content); } else if (L.content !== 'capture' && L.content !== 'ecran') forget(o.id); else if (media.get(o.id) && media.get(o.id).kind !== L.content) forget(o.id); }
    apply(o, struct); if (el.type !== 'range' && el.type !== 'color') panel(); });
  P.addEventListener('input', e => { const el = e.target, o = walls().find(q => q.id === cur); if (!o || (el.type !== 'range' && el.type !== 'color' && el.dataset.lk !== 'text')) return; const L = cfg(o); L[el.dataset.lk] = el.type === 'range' ? +el.value : el.value; const r = reg.get(o.id); if (r) r.led.dirty = true; });
  P.addEventListener('keydown', e => e.stopPropagation());
  function toggle(f, id){ const on = f ?? P.style.display === 'none'; P.style.display = on ? 'block' : 'none'; if (id) cur = id; if (on){ const s = walls().find(q => ST.UI.sel.includes(q.id)); if (s && !id) cur = s.id; devices().then(d => { devs = d; panel(); }); panel(); } }
  return { build, dispose, forget, update, info, toggle, panel, cfg, walls, addWall, isOpen: () => P.style.display !== 'none', DEF, reg, media };
}
