// Musique et son-lumière : lecture d'un fichier audio, analyse (graves, médiums, aigus, temps forts, tempo) et réaction des groupes.
export function initAudio(A, ST, AUD){
  const $ = s => document.querySelector(s), S = ST.S, T = A.THREE, esc = ST.esc;
  const st = { el: null, ctx: null, an: null, gain: null, name: '', bass: 0, mid: 0, high: 0, lvl: 0, beat: 0, nb: 0, bpm: 120, auto: true, hist: [], lastBeat: 0, ivals: [], clock: 0, open: false, spec: null };
  const cfg = () => (S.audio && S.audio.groups ? S.audio : (S.audio = { groups: {}, sens: 1, bpm: 120 }));
  const MODES = { '': 'Aucune', bass: 'Intensité sur les graves', mid: 'Intensité sur les médiums', high: 'Intensité sur les aigus', lvl: 'Intensité sur le niveau', flash: 'Flash sur le temps', chase: 'Chenillard sur le temps', color: 'Couleur suivante sur le temps', tempo: 'Vitesse de l\'effet au tempo' };
  const PAL = ['#ff2a2a', '#ff9a1f', '#ffe14a', '#3cff6a', '#19d3ff', '#3a5bff', '#c23cff', '#ff3cb0'].map(c => new T.Color(c));
  const playing = () => st.el && !st.el.paused && !st.el.ended;
  const groups = () => [...new Set(S.objs.filter(o => o.grp && ST.typeOf(o).cat === 'lum').map(o => o.grp))];

  // ---------------------------------------------------------------- analyse
  function ensure(){ if (st.ctx) return; st.ctx = new (window.AudioContext || window.webkitAudioContext)(); st.an = st.ctx.createAnalyser(); st.an.fftSize = 2048; st.an.smoothingTimeConstant = .55; st.gain = st.ctx.createGain(); st.an.connect(st.gain); st.gain.connect(st.ctx.destination); st.spec = new Uint8Array(st.an.frequencyBinCount); }
  function load(file){
    ensure(); if (st.el){ st.el.pause(); URL.revokeObjectURL(st.el.src); }
    const el = new Audio(); el.src = URL.createObjectURL(file); el.preload = 'auto'; st.el = el; st.name = file.name; st.ivals = []; st.hist = [];
    st.ctx.createMediaElementSource(el).connect(st.an); el.onended = () => render(); el.onloadedmetadata = () => render(); el.onerror = () => ST.toast('Ce fichier audio ne peut pas être lu par le navigateur.', true);
    render(); ST.toast('Musique chargée : ' + file.name);
  }
  const band = (f0, f1) => { const hz = st.ctx.sampleRate / st.an.fftSize, a = Math.max(1, Math.floor(f0 / hz)), b = Math.min(st.spec.length - 1, Math.ceil(f1 / hz)); let s = 0; for (let i = a; i <= b; i++) s += st.spec[i]; return s / (b - a + 1) / 255; };
  const env = (cur, v, dt, up, down) => cur + (v - cur) * (1 - Math.exp(-dt * (v > cur ? up : down)));
  function onBeat(now){ st.beat = 1; st.nb++; if (st.lastBeat){ const iv = now - st.lastBeat; if (iv > .25 && iv < 1.5){ st.ivals.push(iv); if (st.ivals.length > 12) st.ivals.shift(); if (st.auto && st.ivals.length >= 4){ const m = [...st.ivals].sort((a, b) => a - b)[st.ivals.length >> 1]; let bpm = 60 / m; while (bpm < 75) bpm *= 2; while (bpm > 160) bpm /= 2; st.bpm = st.bpm + (bpm - st.bpm) * .3; } } } st.lastBeat = now; }
  function tick(dt){
    const c = cfg(), now = performance.now() / 1000; st.beat = Math.max(0, st.beat - dt * 5.5);
    if (playing() && st.an){ st.an.getByteFrequencyData(st.spec); const k = c.sens || 1, b = Math.min(1, band(30, 150) * 1.25 * k), m = Math.min(1, band(150, 2000) * 1.5 * k), h = Math.min(1, band(2000, 10000) * 2.2 * k);
      st.bass = env(st.bass, b, dt, 40, 7); st.mid = env(st.mid, m, dt, 30, 6); st.high = env(st.high, h, dt, 40, 9); st.lvl = env(st.lvl, Math.min(1, (b + m + h) / 2.2), dt, 30, 5);
      st.hist.push(b); if (st.hist.length > 45) st.hist.shift(); const avg = st.hist.reduce((s, v) => s + v, 0) / st.hist.length;
      if (b > avg * 1.32 + .04 && b > .18 && now - st.lastBeat > .26) onBeat(now); }
    else { st.bass = env(st.bass, 0, dt, 9, 4); st.mid = env(st.mid, 0, dt, 9, 4); st.high = env(st.high, 0, dt, 9, 4); st.lvl = env(st.lvl, 0, dt, 9, 4);
      if (st.clockOn){ st.clock += dt * st.bpm / 60; if (st.clock >= 1){ st.clock -= 1; st.beat = 1; st.nb++; st.bass = .9; st.lvl = .8; } } }
    AUD.on = (playing() || st.clockOn) && Object.values(c.groups).some(g => g && g.mode);
    if (st.open && (st.mt = (st.mt || 0) + dt) > .05){ st.mt = 0; meter(); }
  }
  // l'analyse tourne sur sa propre horloge (60 fois par seconde), indépendamment de la fluidité de l'affichage
  let tPrev = performance.now(); setInterval(() => { const n = performance.now(), dt = Math.min(.1, (n - tPrev) / 1000); tPrev = n; tick(dt); }, 16);
  // ---------------------------------------------------------------- effet sur un projecteur
  const R = { dim: 1, rate: 1, flash: 0, hard: false, col: null, colK: 0 };
  AUD.mod = (o, ph, i, n) => {
    const g = cfg().groups[o.grp]; if (!g || !g.mode) return null; const a = g.amt ?? .8; R.dim = 1; R.rate = 1; R.flash = 0; R.hard = false; R.col = null;
    switch (g.mode){
      case 'bass': R.dim = 1 - a + a * st.bass; break; case 'mid': R.dim = 1 - a + a * st.mid; break; case 'high': R.dim = 1 - a + a * st.high; break; case 'lvl': R.dim = 1 - a + a * st.lvl; break;
      case 'flash': R.dim = 1 - a * .75 + a * .75 * st.beat; R.flash = st.beat * a; R.hard = st.beat > .6; break;
      case 'chase': R.dim = (st.nb % Math.max(1, n)) === i ? 1 : 1 - a; R.hard = true; break;
      case 'color': R.col = PAL[(st.nb + (a > .66 ? i : 0)) % PAL.length]; R.colK = 1; break;
      case 'tempo': R.rate = st.bpm / 120 * (.5 + a); break; }
    return R;
  };

  // ---------------------------------------------------------------- panneau flottant
  const fmtT = t => isFinite(t) ? Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') : '0:00';
  const panel = document.createElement('div'); panel.id = 'audPanel'; panel.style.display = 'none'; document.body.appendChild(panel);
  function render(){
    if (!st.open) return; const c = cfg(), gs = groups();
    panel.innerHTML = `<div class="ah"><b>Musique et son-lumière</b><span data-au="close" style="cursor:pointer;color:var(--mute)">✕</span></div>
      <div class="ar"><button class="b" data-au="file">Importer une musique…</button><span class="nm" title="${esc(st.name)}">${st.name ? esc(st.name) : 'Aucun fichier (mp3, wav, m4a, ogg…)'}</span></div>
      <div class="ar"><button class="b${playing() ? ' on' : ''}" data-au="play" ${st.el ? '' : 'disabled'}>${playing() ? '❚❚ Pause' : '▶ Lecture'}</button><button class="b" data-au="stop" ${st.el ? '' : 'disabled'}>■</button>
        <input type="range" data-au="seek" min="0" max="1000" value="${st.el && st.el.duration ? Math.round(st.el.currentTime / st.el.duration * 1000) : 0}" style="flex:1" ${st.el ? '' : 'disabled'}><span class="mono" id="audT">${st.el ? fmtT(st.el.currentTime) + ' / ' + fmtT(st.el.duration) : ''}</span></div>
      <canvas id="audCv" style="width:100%;height:54px;display:block;border-radius:6px;background:#15171c"></canvas>
      <div class="ar"><span>Tempo</span><b class="mono" id="audBpm">${Math.round(st.bpm)}</b><span>BPM</span><button class="b" data-au="tap" title="Tape le tempo (4 fois)">Tap</button>
        <label style="display:flex;gap:4px;align-items:center"><input type="checkbox" data-au="auto" ${st.auto ? 'checked' : ''}>auto</label>
        <label style="display:flex;gap:4px;align-items:center" title="Sans musique : une horloge au tempo donne les temps"><input type="checkbox" data-au="clock" ${st.clockOn ? 'checked' : ''}>horloge</label></div>
      <div class="ar"><span>Sensibilité</span><input type="range" data-au="sens" min="0.3" max="3" step="0.05" value="${c.sens || 1}" style="flex:1"><span>Volume</span><input type="range" data-au="vol" min="0" max="1" step="0.01" value="${st.gain ? st.gain.gain.value : 1}" style="width:70px"></div>
      <div class="ag">${gs.length ? gs.map(g => { const q = c.groups[g] || {}; return `<span class="nm">${esc(g)}</span><select data-ag="${esc(g)}">${Object.entries(MODES).map(([k, v]) => `<option value="${k}"${(q.mode || '') === k ? ' selected' : ''}>${v}</option>`).join('')}</select><input type="range" data-aa="${esc(g)}" min="0" max="1" step="0.05" value="${q.amt ?? .8}" title="Quantité">`; }).join('') : '<span style="grid-column:1/-1;color:var(--mute)">Aucun groupe de projecteurs. Donne un nom de groupe aux projecteurs (onglet Réglages) pour les faire réagir.</span>'}</div>
      <div class="sub" style="margin:6px 0 0">La réaction s'ajoute aux mémoires et aux effets en cours. Passe en mode spectacle pour voir les faisceaux.${st.el ? '' : ' La musique n\'est pas enregistrée dans le projet : il faudra la réimporter.'}</div>`;
    meter();
  }
  function meter(){
    const t = $('#audT'); if (t && st.el) t.textContent = fmtT(st.el.currentTime) + ' / ' + fmtT(st.el.duration); const bp = $('#audBpm'); if (bp) bp.textContent = Math.round(st.bpm);
    const sk = panel.querySelector('[data-au=seek]'); if (sk && st.el && st.el.duration && document.activeElement !== sk) sk.value = Math.round(st.el.currentTime / st.el.duration * 1000);
    const cv = $('#audCv'); if (!cv) return; const d = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== Math.round(W * d)){ cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
    const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    if (st.spec && playing()){ const n = 64, bw = (W - 150) / n; for (let i = 0; i < n; i++){ const j = Math.floor(Math.pow(i / n, 2) * 420) + 1, v = st.spec[j] / 255; c.fillStyle = i < 6 ? '#5b14f0' : i < 30 ? '#b78bff' : '#2affd0'; c.fillRect(i * bw, H - v * H, bw - 1, v * H); } }
    const bars = [['Graves', st.bass, '#7c5cff'], ['Médiums', st.mid, '#b78bff'], ['Aigus', st.high, '#2affd0']]; c.font = '9px system-ui,sans-serif'; c.textBaseline = 'middle';
    bars.forEach(([l, v, col], k) => { const y = 8 + k * 15; c.fillStyle = '#8a8d96'; c.textAlign = 'left'; c.fillText(l, W - 142, y); c.fillStyle = '#2a2248'; c.fillRect(W - 96, y - 4, 70, 8); c.fillStyle = col; c.fillRect(W - 96, y - 4, 70 * v, 8); });
    c.fillStyle = `rgba(255,255,255,${.12 + .88 * st.beat})`; c.beginPath(); c.arc(W - 12, 22, 8, 0, 7); c.fill();
  }
  let taps = [];
  panel.addEventListener('click', e => { const a = e.target.closest('[data-au]')?.dataset.au; if (!a) return;
    if (a === 'close') toggle(false);
    else if (a === 'file'){ const i = document.createElement('input'); i.type = 'file'; i.accept = 'audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac'; i.onchange = () => i.files[0] && load(i.files[0]); i.click(); }
    else if (a === 'play' && st.el){ ensure(); st.ctx.resume(); if (playing()) st.el.pause(); else { st.el.play().catch(() => ST.toast('Lecture refusée par le navigateur.', true)); if (!A.live) ST.setLive(true); } setTimeout(render, 60); }
    else if (a === 'stop' && st.el){ st.el.pause(); st.el.currentTime = 0; render(); }
    else if (a === 'tap'){ const now = performance.now(); taps = taps.filter(t => now - t < 2500); taps.push(now); if (taps.length >= 3){ const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); st.bpm = Math.max(40, Math.min(220, 60000 / iv)); st.auto = false; cfg().bpm = st.bpm; const cb = panel.querySelector('[data-au=auto]'); if (cb) cb.checked = false; } st.beat = 1; } });
  panel.addEventListener('input', e => { const el = e.target, a = el.dataset.au;
    if (a === 'seek' && st.el && st.el.duration) st.el.currentTime = el.value / 1000 * st.el.duration; else if (a === 'vol'){ ensure(); st.gain.gain.value = +el.value; } else if (a === 'sens'){ cfg().sens = +el.value; ST.touch(); }
    else if (el.dataset.aa){ (cfg().groups[el.dataset.aa] ??= { mode: '' }).amt = +el.value; ST.touch(); } });
  panel.addEventListener('change', e => { const el = e.target, a = el.dataset.au;
    if (a === 'auto') st.auto = el.checked; else if (a === 'clock'){ st.clockOn = el.checked; st.clock = 0; if (st.clockOn && !A.live) ST.setLive(true); }
    else if (el.dataset.ag !== undefined && el.tagName === 'SELECT'){ ST.pushUndo(0, 'Réaction audio'); (cfg().groups[el.dataset.ag] ??= { amt: .8 }).mode = el.value; ST.touch(); } });
  function toggle(f){ st.open = f ?? !st.open; panel.style.display = st.open ? 'block' : 'none'; if (st.open) render(); }
  window.AUDIO = { toggle, st, load, cfg, render, MODES, isOpen: () => st.open, test: (b, m, h, beat) => { st.bass = b; st.mid = m; st.high = h; st.lvl = (b + m + h) / 3; if (beat){ st.beat = 1; st.nb++; } AUD.on = Object.values(cfg().groups).some(g => g && g.mode); } };
}
