// Plan technique 2D (dessin au trait, sans rendu) affiché à côté de la vue 3D.
// Scène en haut, public en bas, cour à droite. Unités : mètres.
export function initPlan(A, ST){
  const $ = s => document.querySelector(s);
  const win = $('#planWin'), cv = $('#plan2d'), ctx = cv.getContext('2d'), root = document.documentElement;
  const P = { on: false, frac: .5, s: 20, ox: 0, oy: 0, labels: true, fitted: false, dirty: true, hover: null };
  // couleurs du plan : fond, tracé et grille se choisissent (bouton ▦ de la fenêtre) ; le reste en découle
  const TDEF = { paper: '#fbfaf6', ink: '#15161a', grid: true, step: 1, gcol: '' }, TH = { ...TDEF, ...A.store.get('plan2d', {}) };
  let INK, MID, LIGHT, ACC, BLUE, PAPER, G1, G2, FILL, FILL2, CURTC;
  const rgb = h => { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }, mix = (a, b, t) => { const p = rgb(a), q = rgb(b); return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  function theme(){ PAPER = TH.paper; INK = TH.ink; const std = TH.paper === TDEF.paper && TH.ink === TDEF.ink, pr = rgb(PAPER), dark = (pr[0] * .299 + pr[1] * .587 + pr[2] * .114) < 110;
    MID = std ? '#6b6f78' : mix(INK, PAPER, .42); LIGHT = std ? '#c9ccd3' : mix(INK, PAPER, .78); ACC = dark ? '#ff6b5e' : '#b3261e'; BLUE = dark ? '#7fb0ff' : '#1f4e9c';
    G1 = TH.gcol ? mix(TH.gcol, PAPER, .5) : mix(INK, PAPER, .86); G2 = TH.gcol || mix(INK, PAPER, .7); FILL = std ? '#d9d6cd' : mix(INK, PAPER, .84); FILL2 = std ? '#f0efe9' : mix(INK, PAPER, .93); CURTC = std ? '#3a3d46' : mix(INK, PAPER, .18); }
  theme();
  // quadrillage au pas choisi, un trait marqué tous les cinq pas ; ln = fonction de trait (plan ou coupe)
  function grid2(a0, a1, b0, b1, ln){ if (!TH.grid || P.s * TH.step < 3) return; const s = TH.step;
    a0 = -P.ox / P.s; a1 = (P.w - P.ox) / P.s; if (ln === line){ b0 = -P.oy / P.s; b1 = (P.h - P.oy) / P.s; } else { b0 = (P.oy - P.h) / P.s; b1 = P.oy / P.s; }   // toute la fenêtre : la grille ne s'arrête pas aux murs
    for (let k = Math.ceil(a0 / s - 1e-6); k * s <= a1 + 1e-6; k++){ lw(k % 5 ? .5 : .9, k % 5 ? G1 : G2); ln(k * s, b0, k * s, b1); } for (let k = Math.ceil(b0 / s - 1e-6); k * s <= b1 + 1e-6; k++){ lw(k % 5 ? .5 : .9, k % 5 ? G1 : G2); ln(a0, k * s, a1, k * s); } }
  const f1 = v => v.toFixed(2).replace('.', ',');
  const lvl = v => (v >= 0 ? '+' : '−') + f1(Math.abs(v));

  // ---------------------------------------------------------------- mise en page (vue partagée)
  function layout(){
    if (window.DOCK) return window.DOCK.layout();
    const con = (document.body.classList.contains('con') && !document.body.classList.contains('confl')) ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) || 340) + 12 : 0, W = window.innerWidth, narrow = W - con < 720;
    if (P.on && !narrow && !win.classList.contains('fl')){
      const vw = Math.round(Math.max(260, Math.min(W - con - 280, (W - con) * P.frac)));
      root.style.setProperty('--vw', vw + 'px'); win.style.left = (vw + 6) + 'px';
    } else { root.style.removeProperty('--vw'); win.style.left = '12px'; }
    A.resize(); size();
  }
  function size(){
    if (!P.on) return;
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    if (r.width < 2) return;
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); P.w = r.width; P.h = r.height; P.d = d;
    if (!P.fitted) fit(); P.dirty = true;
  }
  function fit(){
    if (P.view === 'coupe' && A.venue.open){ let z0 = -9, z1 = 7, top = 6; for (const o of ST.S.objs){ z0 = Math.min(z0, o.pos[2] - 2); z1 = Math.max(z1, o.pos[2] + 2); top = Math.max(top, o.pos[1] + 2); } for (const s of ST.S.sups || []){ z0 = Math.min(z0, -s.a.y / 1000 - 2, -s.b.y / 1000 - 2); z1 = Math.max(z1, -s.a.y / 1000 + 2, -s.b.y / 1000 + 2); top = Math.max(top, s.zMm / 1000 + 2.5); }
      const m = 14; P.s = Math.min((P.w - 2 * m) / (z1 - z0), (P.h - 2 * m - 150) / (top + 1.2)); P.ox = P.w / 2 - (z0 + z1) / 2 * P.s; P.oy = m + 30 + top * P.s; P.fitted = true; P.dirty = true; return; }
    if (P.view === 'coupe' && A.venue.type === 'param'){ const m = 14, B = A.venueBounds(), top = B.h + 2.5, bot = -B.floor + 1.6; P.s = Math.min((P.w - 2 * m) / (B.z1 - B.z0 + 6), (P.h - 2 * m - 96) / (top + bot)); P.ox = P.w / 2 - (B.z0 + B.z1) / 2 * P.s; P.oy = m + 30 + top * P.s; P.fitted = true; P.dirty = true; return; }
    if (P.view === 'coupe'){ const m = 14; P.s = Math.min((P.w - 2 * m) / 39.5, (P.h - 2 * m - 74) / 14.5); P.ox = (P.w - 37.2 * P.s) / 2 + 13.2 * P.s; P.oy = Math.max(m + 30 + 12 * P.s, (P.h - 66) / 2 + 4.4 * P.s); P.fitted = true; P.dirty = true; return; }
    const st = A.planState();
    if (A.venue.open){ let x0 = -9, x1 = 9, z0 = -9, z1 = 7; for (const o of ST.S.objs){ x0 = Math.min(x0, o.pos[0] - 2); x1 = Math.max(x1, o.pos[0] + 2); z0 = Math.min(z0, o.pos[2] - 2); z1 = Math.max(z1, o.pos[2] + 2); } for (const s of ST.S.sups || []) for (const q of [s.a, s.b]){ x0 = Math.min(x0, q.x / 1000 - 2); x1 = Math.max(x1, q.x / 1000 + 2); z0 = Math.min(z0, -q.y / 1000 - 2); z1 = Math.max(z1, -q.y / 1000 + 2); }          // espace vide : on cadre le matériel, ou 18 m autour du zéro
      const m = 14; P.s = Math.min((P.w - 2 * m) / (x1 - x0), (P.h - 2 * m - 70) / (z1 - z0)); P.ox = P.w / 2 - (x0 + x1) / 2 * P.s; P.oy = m + -z0 * P.s; P.fitted = true; P.dirty = true; return; }
    const m = 14, top = 3.6, bot = 4.2;
    P.s = Math.min((P.w - 2 * m) / (2 * st.W + 8.2), (P.h - 2 * m - 70) / (st.Z1 - st.Z0 + top + bot));
    P.ox = P.w / 2 - .5 * P.s; P.oy = m + (-st.Z0 + top) * P.s; P.fitted = true; P.dirty = true;
  }
  function toggle(force){
    P.on = force ?? !P.on; document.body.classList.toggle('split', P.on); $('#planBtn').classList.toggle('on', P.on);
    layout(); if (P.on){ P.fitted = false; requestAnimationFrame(() => { size(); draw(); }); }
  }
  addEventListener('wins', () => { if (!layout.busy){ layout.busy = true; layout(); layout.busy = false; } draw(); });   // fenêtre détachée, ancrée ou redimensionnée
  $('#planBtn').onclick = () => toggle(); $('#planClose').onclick = () => toggle(false);
  $('#planFit').onclick = () => { fit(); draw(); };
  $('#planLab').onclick = () => { P.labels = !P.labels; $('#planLab').classList.toggle('on', P.labels); draw(); };
  $('#planLab').classList.add('on');
  // deux vues : plan (dessus) et coupe longitudinale ; chacune garde son cadrage
  P.view = 'plan'; const TV = {};
  function setView(v){ if (v === P.view) return; TV[P.view] = { s: P.s, ox: P.ox, oy: P.oy }; P.view = v; win.querySelectorAll('[data-pv]').forEach(a => a.classList.toggle('on', a.dataset.pv === v)); if (TV[v]) Object.assign(P, TV[v]); else fit(); $('#planPng').title = v === 'coupe' ? 'Exporter la coupe en PNG (A3 paysage, 1:100)' : 'Exporter en PNG (A3, 1:100)'; draw(); }
  win.querySelectorAll('[data-pv]').forEach(a => a.onclick = () => setView(a.dataset.pv));
  addEventListener('resize', () => { if (P.on || root.style.getPropertyValue('--vw')) { if (!layout.busy){ layout.busy = true; layout(); layout.busy = false; } } });
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) toggle(); });
  $('#planGrip').addEventListener('pointerdown', e => {
    e.preventDefault(); const g = e.currentTarget; g.setPointerCapture(e.pointerId);
    const mv = ev => { const con = (document.body.classList.contains('con') && !document.body.classList.contains('confl')) ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) || 340) + 12 : 0; P.frac = window.DOCK ? DOCK.fracAt(ev.clientX) : Math.max(.15, Math.min(.85, ev.clientX / (window.innerWidth - con))); layout(); draw(); };
    const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); };
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
  });

  // ---------------------------------------------------------------- primitives de dessin
  let c = ctx, K = 1;                                   // K : épaisseur de trait (1 à l'écran, plus à l'export)
  const X = x => P.ox + x * P.s, Z = z => P.oy + z * P.s;
  const lw = (w, col = INK, dash) => { c.lineWidth = w * K; c.strokeStyle = col; c.setLineDash(dash ? dash.map(v => v * K) : []); };
  const line = (x0, z0, x1, z1) => { c.beginPath(); c.moveTo(X(x0), Z(z0)); c.lineTo(X(x1), Z(z1)); c.stroke(); };
  const rect = (x0, z0, x1, z1, fill) => { if (fill){ c.fillStyle = fill; c.fillRect(X(x0), Z(z0), (x1 - x0) * P.s, (z1 - z0) * P.s); } c.strokeRect(X(x0), Z(z0), (x1 - x0) * P.s, (z1 - z0) * P.s); };
  const LBOX = [];
  const text = (t, x, z, o = {}) => {
    c.font = `${o.b ? '600 ' : ''}${(o.px || 10) * K}px ${o.mono ? 'ui-monospace,Menlo,Consolas,monospace' : 'system-ui,sans-serif'}`;
    c.textAlign = o.al || 'center'; c.textBaseline = o.bl || 'middle';
    const px = X(x) + (o.dx || 0) * K; let pz = Z(z) + (o.dy || 0) * K;
    if (o.bg){ const w = c.measureText(t).width + 4 * K, h = (o.px || 10) * K + 3 * K, rx = o.al === 'left' ? px - 2 * K : o.al === 'right' ? px - w + 2 * K : px - w / 2, top = y => o.bl === 'bottom' ? y - h + 1.5 * K : o.bl === 'top' ? y - 1.5 * K : y - h / 2;
      // deux étiquettes ne se recouvrent pas : la seconde se décale d'une hauteur de ligne, vers le haut ou le bas, jusqu'à trouver une place libre
      const hit = y => LBOX.some(b => rx < b[0] + b[2] && rx + w > b[0] && top(y) < b[1] + b[3] && top(y) + h > b[1]);
      if (hit(pz)) for (const k of [1, -1, 2, -2, 3, -3]){ const d = k * (o.bl === 'bottom' ? -1 : 1) * h; if (!hit(pz + d)){ pz += d; break; } }
      LBOX.push([rx, top(pz), w, h]); c.fillStyle = PAPER; c.fillRect(rx, top(pz), w, h); }
    c.fillStyle = o.col || INK; c.fillText(t, px, pz);
  };
  function hatch(x0, z0, x1, z1){                       // murs coupés : hachures à 45°
    c.save(); c.beginPath(); c.rect(X(x0), Z(z0), (x1 - x0) * P.s, (z1 - z0) * P.s); c.clip();
    lw(.5, MID); const st = Math.max(4 * K, .16 * P.s), a = X(x0), b = Z(z0), w = (x1 - x0) * P.s, h = (z1 - z0) * P.s;
    c.beginPath(); for (let t = -h; t < w; t += st){ c.moveTo(a + t, b + h); c.lineTo(a + t + h, b); } c.stroke(); c.restore();
    lw(1.6); c.strokeRect(X(x0), Z(z0), (x1 - x0) * P.s, (z1 - z0) * P.s);
  }
  function stairs(x0, x1, z0, z1, n, up){               // volée : n marches entre z0 et z1, flèche vers le haut
    lw(.7); rect(x0, z0, x1, z1);
    for (let k = 1; k < n; k++){ const z = z0 + (z1 - z0) * k / n; line(x0, z, x1, z); }
    const xm = (x0 + x1) / 2, a = up > 0 ? z0 : z1, b = up > 0 ? z1 : z0; lw(.8, ACC); line(xm, a + (b - a) * .08, xm, b - (b - a) * .08);
    const t = b - (b - a) * .08, d = Math.sign(b - a) * .16; c.beginPath(); c.moveTo(X(xm), Z(t)); c.lineTo(X(xm - .12), Z(t - d)); c.moveTo(X(xm), Z(t)); c.lineTo(X(xm + .12), Z(t - d)); c.stroke();
  }
  function dimH(x0, x1, z, label){                      // cote horizontale
    lw(.6, BLUE); line(x0, z, x1, z); for (const x of [x0, x1]){ line(x, z - .25, x, z + .25); c.beginPath(); c.moveTo(X(x) - 3 * K, Z(z) + 3 * K); c.lineTo(X(x) + 3 * K, Z(z) - 3 * K); c.stroke(); }
    text(label, (x0 + x1) / 2, z, { col: BLUE, bg: true, px: 9.5, mono: true });
  }
  function dimV(x, z0, z1, label){
    lw(.6, BLUE); line(x, z0, x, z1); for (const z of [z0, z1]){ line(x - .25, z, x + .25, z); c.beginPath(); c.moveTo(X(x) - 3 * K, Z(z) + 3 * K); c.lineTo(X(x) + 3 * K, Z(z) - 3 * K); c.stroke(); }
    c.save(); c.translate(X(x), Z((z0 + z1) / 2)); c.rotate(-Math.PI / 2); c.font = `${9.5 * K}px ui-monospace,Menlo,Consolas,monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(label).width + 4 * K; c.fillStyle = PAPER; c.fillRect(-w / 2, -6.5 * K, w, 13 * K); c.fillStyle = BLUE; c.fillText(label, 0, 0); c.restore();
  }

  // ---------------------------------------------------------------- la salle
  function room(st){
    if (st.param) return roomParam(st);
    const W = st.W, Z0 = st.Z0, Z1 = st.Z1, WT = .3, ZO0 = -11.85, ZO1 = 23.75, f = st.fosse;
    // quadrillage 1 m (5 m marqué)
    grid2(-9, 9, Z0, Z1, line);
    // murs latéraux avec portes
    for (const s of [-1, 1]){
      const a = s > 0 ? W : -W - WT, b = a + WT; let zc = ZO0;
      for (const [d0, d1] of [[6.55, 7.65], [15.65, 16.75]]){
        hatch(a, zc, b, d0); zc = d1; lw(.6, MID); line(a, d0, a, d1); line(b, d0, b, d1);
        lw(.7); const hx = s > 0 ? W : -W; c.beginPath(); c.moveTo(X(hx), Z(d0)); c.lineTo(X(hx + s * (d1 - d0)), Z(d0)); c.stroke();          // vantail ouvert vers l'extérieur
        lw(.5, MID, [3, 2]); c.beginPath(); c.arc(X(hx), Z(d0), (d1 - d0) * P.s, s > 0 ? 0 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI); c.stroke();
      }
      hatch(a, zc, b, ZO1);
    }
    hatch(-W - WT, ZO0 - .0, W + WT, -11.5); hatch(-W - WT, 23.4, W + WT, ZO1);                               // façades arrière et avant
    for (const [a, b] of [[-W, -6.9], [-5.7, 5.7], [6.9, W]]) hatch(a, Z0 - .24, b, Z0);                       // mur de fond de scène
    for (const s of [-1, 1]){ const a = s * 5.7, b = s * 6.9; lw(.7); line(a, Z0 - .24, a, Z0 - .24 - 1.2); lw(.5, MID, [3, 2]); c.beginPath(); c.arc(X(a), Z(Z0 - .24), 1.2 * P.s, s > 0 ? -Math.PI / 2 : Math.PI, s > 0 ? 0 : -Math.PI / 2); c.stroke(); }
    hatch(-W, 20.8, W, 21.0);                                                                                 // mur sous balcon
    text('DÉGAGEMENT', 0, -10.9, { col: MID, px: 9 }); text('FOYER', 0, 22.2, { col: MID, px: 9 });
    // passerelles techniques (au-dessus : trait mixte)
    lw(.7, MID, [8, 3, 2, 3]);
    line(-W + 1, Z0, -W + 1, 19.29); line(W - 1, Z0, W - 1, 19.29); line(-W + 1, 19.29, W - 1, 19.29);
    for (const [a, b] of [[2.0, 3.18], [8.71, 9.76]]){ line(-W + 1, a, W - 1, a); line(-W + 1, b, W - 1, b); }
    text('passerelle +6,95', -W + 1.1, 7.1, { al: 'left', col: MID, px: 8.5, bg: true }); text('passerelle +6,95', 4.9, 2.59, { col: MID, px: 8.5, bg: true }); text('passerelle +6,95', 4.9, 9.24, { col: MID, px: 8.5, bg: true });
    // balcon / régie (au-dessus)
    lw(.8, MID, [6, 3]); line(-W, 19.18, W, 19.18); text('balcon régie +4,35', -5.6, 19.55, { col: MID, px: 8.5, bg: true });
    lw(.6, MID); rect(-1.06, 19.45, 1.06, 20.25); for (const [x, , z] of st.balcon) seat(x, z, MID);
    // fosse
    lw(1.2); rect(-f.x, f.z0, f.x, f.z1);
    const flat = f.zones.every(z => Math.abs(z.h) < .02);
    f.zones.forEach((z, i) => { if (i){ lw(.6, flat ? LIGHT : INK); line(-f.x, z.z0, f.x, z.z0); } if (!flat || (i === 2 && f.c < .02)) text(flat ? 'fosse couverte ±0,00' : lvl(z.h), f.x - .1, (z.z0 + z.z1) / 2, { al: 'right', px: 8.5, col: BLUE, mono: true, bg: true }); });
    if (f.c > .02){ lw(.9); rect(-3.6, f.z0 + .5, 3.6, f.z1 - .5); text('scène centrale ' + lvl(f.c), 0, (f.z0 + f.z1) / 2, { px: 9, col: BLUE, bg: true }); }
    for (const s of f.seats) seat(s.x, s.z);
    if (f.stRear) for (const s of [-1, 1]){ const a = s * (f.x - 1.25), b = s * (f.x - .05); stairs(Math.min(a, b), Math.max(a, b), f.z1 - .28 * f.stRear, f.z1, f.stRear, 1); }
    if (f.stFront) stairs(-.7, .7, f.z0, f.z0 + .28 * f.stFront, f.stFront, -1);
    if (f.regie){ lw(.9); rect(-1.95, 4.05, 1.95, f.z1, FILL2); rect(-1.3, 4.2, 1.3, 4.85); text('RÉGIE', 0, 5.4, { px: 9, b: true }); }
    // tribune télescopique
    const dep = st.rows.filter(r => r.dep), sto = st.rows.filter(r => !r.dep);
    if (sto.length){ const z0 = Math.min(...sto.map(r => r.z)); lw(.8, MID, [5, 3]); rect(-st.TW, z0, st.TW, 20.72); lw(.4, LIGHT); line(-st.TW, z0, st.TW, 20.72); line(st.TW, z0, -st.TW, 20.72); text(`tribune repliée (${sto.length} rangs)`, 0, (z0 + 20.72) / 2, { px: 9, col: MID, bg: true }); }
    dep.forEach((r, i) => {
      const zb = dep[i + 1] ? dep[i + 1].z : r.z + st.DEPTH; lw(.8); rect(-st.TW, r.z, st.TW, zb);
      lw(.5, MID); line(-st.AX, r.z, -st.AX, zb); line(st.AX, r.z, st.AX, zb); for (const s of [-1, 1]) line(s * st.AX, (r.z + zb) / 2, s * st.TW, (r.z + zb) / 2);
      for (let k = 0; k < r.n; k++) seat(r.x0 + k * .54, r.z + .52);
      if (P.s > 13) text(lvl(r.h), -st.TW + .08, (r.z + zb) / 2, { al: 'left', px: 7.5, col: BLUE, mono: true, bg: true });
    });
    if (st.front != null) for (let k = 0; k < 26; k++) seat(-6.75 + k * .54, st.front);
    // mobilier
    for (const [z, x] of st.tables){ lw(.7); c.fillStyle = PAPER; c.beginPath(); c.arc(X(x), Z(z), .9 * P.s, 0, 7); c.fill(); c.stroke(); for (let k = 0; k < 12; k++){ const a = k * Math.PI / 6; c.beginPath(); c.arc(X(x) + Math.cos(a) * 1.28 * P.s, Z(z) + Math.sin(a) * 1.28 * P.s, .2 * P.s, 0, 7); c.stroke(); } }
    if (st.dj){ lw(.9); rect(-4.5, -9.2, 4.5, -6.9, FILL2); rect(-1.6, -8.0, 1.6, -7.2); text('scène DJ +0,80', 0, -8.6, { px: 9, col: BLUE }); lw(1.1, INK, [6, 2]); line(-7.5, -5.92, 7.4, -5.92); text('barrière', 6.2, -5.6, { px: 8, col: MID }); lw(.8); rect(-1.2, 17.3, 1.2, 18.1); text('régie', 0, 17.7, { px: 8 }); }
    // perches et rideaux
    st.perches.forEach((p, i) => { const sm = window.RIG ? RIG.sum(i) : null, hot = sm && sm.util > .8 && (sm.n || sm.util > 1), pc = hot ? (sm.util > 1 ? ACC : '#b86a00') : BLUE; lw(hot ? 1.6 : .9, pc); line(-8, p.z, 8, p.z); for (const s of [-1, 1]){ c.fillStyle = pc; c.beginPath(); c.arc(X(s * 8), Z(p.z), 1.8 * K, 0, 7); c.fill(); } text(`P${i + 1} ${lvl(p.y)}${sm && sm.n ? '  ' + Math.round(sm.kg) + ' kg' + (sm.util > 1 ? ' !' : '') : ''}`, W + .5, p.z, { al: 'left', px: Math.max(6.5, Math.min(8.5, P.s * .42)), col: pc, mono: true }); });
    for (const cu of st.curtains){ lw(1.6, ACC); c.beginPath(); const n = Math.max(4, Math.round((cu.x1 - cu.x0) / .25)); for (let k = 0; k <= n; k++){ const x = cu.x0 + (cu.x1 - cu.x0) * k / n, z = cu.z + (k % 2 ? .07 : -.07); k ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z)); } c.stroke(); }
    const fond = st.curtains.find(q => q.kind === 'fond'); if (fond) text('rideau de fond', 0, fond.z - .38, { px: 8.5, col: ACC, bg: true });
    // axe, nez de scène, repères
    lw(.6, ACC, [10, 3, 2, 3]); line(0, Z0 - 2.4, 0, Z1 + 2.2); text('AXE', 0, Z0 - 2.75, { px: 8, col: ACC });
    lw(.9, ACC, [6, 3]); line(-W, 0, W, 0); text('nez de scène  0,00', -W + .2, -.28, { al: 'left', px: 8.5, col: ACC, bg: true });
    if (!st.dj) text('SCÈNE', 0, -8.6, { px: 13, b: true, col: MID }); text('◄ JARDIN', -5.5, Z0 - 2.6, { px: 9.5, b: true, col: MID }); text('COUR ►', 5.5, Z0 - 2.6, { px: 9.5, b: true, col: MID });
    dimH(-W, W, Z1 + 2.6, f1(2 * W) + ' m'); dimV(-W - 1.5, Z0, 0, f1(-Z0) + ' m'); dimV(-W - 1.5, 0, 20.8, '20,80 m'); dimH(-f.x, f.x, f.z1 + .32, f1(2 * f.x) + ' m');
  }
  // fond de plan importé (DXF, DWG, PDF, image) : rendu une fois par cadrage dans un canevas à part, puis recopié
  const BD = { key: '', cv: null };
  function backdrop(pl, D){
    const full = c !== ctx, key = full ? '' : JSON.stringify(pl) + '|' + INK + PAPER + '|' + [P.s, P.ox, P.oy, P.w, P.h, P.d, !!D.img].join(',');
    if (full){ c.save(); A.planPaint(c, pl, D, -P.ox / P.s, -P.oy / P.s, P.s, { col: MID, wallCol: INK, lw: .7 * K, alpha: .8, texts: true }); c.restore(); return; }
    if (BD.key !== key){ const cv2 = BD.cv || (BD.cv = document.createElement('canvas')); cv2.width = cv.width; cv2.height = cv.height; const g = cv2.getContext('2d'); g.setTransform(P.d, 0, 0, P.d, 0, 0); g.clearRect(0, 0, P.w, P.h);
      A.planPaint(g, pl, D, -P.ox / P.s, -P.oy / P.s, P.s, { col: MID, wallCol: INK, lw: .7, alpha: .8, texts: P.s > 14 }); BD.key = key; }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(BD.cv, 0, 0); c.restore();
  }
  // salle sur mesure : murs, cadre, plateau, fosse, gradin, passerelles, perches et rideaux d'après ses dimensions
  function roomParam(st){
    const v = st.param, W = st.W, Z0 = st.Z0, Z1 = st.Z1, WT = .25, sw = v.stageW / 2, pz = -(v.prosZ || 0), pl = v.plan, D = pl && pl.show2d && A.PLANS.get(pl.id);
    if (D && D.kind === 'img'){ backdrop(pl, D); grid2(-W, W, Z0, Z1, line); } else { grid2(-W, W, Z0, Z1, line); if (D) backdrop(pl, D); }   // sur un plan en image, la grille passe par-dessus le papier
    if (v.shell !== false){ lw(1.4); for (const [x0, z0, x1, z1] of [[-W - WT, Z0 - WT, W + WT, Z0], [-W - WT, Z1, W + WT, Z1 + WT], [-W - WT, Z0, -W, Z1], [W, Z0, W + WT, Z1]]){ rect(x0, z0, x1, z1, FILL); hatch(x0, z0, x1, z1); } }
    if (v.prosW){ const ow = Math.min(v.prosW, 2 * W) / 2; lw(1.4); for (const [x0, x1] of [[-W, -ow], [ow, W]]) if (x1 - x0 > .02){ rect(x0, pz - .3, x1, pz, FILL); hatch(x0, pz - .3, x1, pz); } lw(.7, MID, [5, 3]); line(-ow, pz - .15, ow, pz - .15); if (P.labels) text('cadre ' + f1(v.prosW) + (v.prosH ? ' × ' + f1(v.prosH) : '') + ' m', 0, pz - .15, { px: 8, col: MID, bg: true, dy: -11 }); }
    if (!v.open){ lw(1.1); rect(-sw, -v.stageD, sw, 0, D ? null : 'rgba(0,0,0,.035)'); } if (v.stageH > 0) text('plateau ' + lvl(0) + '  ·  public ' + lvl(-v.stageH), 0, -v.stageD + .45, { px: 8, col: MID, bg: true });
    if (v.pitD){ const pw = Math.min(W, (v.pitW || v.prosW || v.stageW) / 2); lw(.9, INK, [4, 2]); rect(-pw, 0, pw, v.pitD); text('fosse ' + lvl(v.pitY), 0, v.pitD / 2, { px: 8.5, col: MID, bg: true, dy: 6 }); }
    if (v.rows){ let y = -v.stageH, zb = v.rowStart; for (let k = 0; k < v.rows; k++){ y += v.rowH + (v.rowHLast ? (v.rowHLast - v.rowH) * (v.rows > 1 ? k / (v.rows - 1) : 0) : 0); const za = v.rowStart + k * v.rowD; if (za >= Z1 - .01) break; zb = Math.min(Z1, za + v.rowD); lw(.5, MID); line(-W, za, W, za); if (P.labels && P.s > 16 && (k === 0 || k === v.rows - 1 || k % 5 === 4)) text('rang ' + (k + 1) + '  ' + lvl(y), W - .2, (za + zb) / 2, { al: 'right', px: 7, col: MID, mono: true }); } lw(.5, MID); line(-W, zb, W, zb); }
    { const gw = v.galW || 1.2; lw(.7, MID, [3, 2]); if (v.galHs) for (const sx of [-1, 1]){ rect(sx < 0 ? -W : W - gw, Z0, sx < 0 ? -W + gw : W, pz); if (P.labels && P.s > 12) text(v.galHs.map(lvl).join(' / '), sx * (W - gw / 2), (Z0 + pz) / 2 + sx * 0, { px: 7, col: MID, mono: true, bg: true }); } if (v.backGalH){ rect(-W, Z0, W, Z0 + gw); if (P.labels && P.s > 12) text('passerelle ' + lvl(v.backGalH), 0, Z0 + gw / 2, { px: 7, col: MID, mono: true, bg: true }); } }
    for (const cu of st.curtains){ lw(cu.kind === 'fond' ? 2.4 : 1.8, CURTC); line(cu.x0, cu.z + .06, cu.x1, cu.z + .06); }
    const dense = st.perches.length > 16 && P.s < 22;
    st.perches.forEach((pe, i) => { const load = window.RIG && RIG.sum ? RIG.sum(i) : null, hl = pe.len / 2, cx = pe.x || 0; if (pe.truss){ const hs = Math.max(pe.sect / 2, .06); lw(1, load ? load.col : BLUE); line(cx - hl, pe.z - hs, cx + hl, pe.z - hs); line(cx - hl, pe.z + hs, cx + hl, pe.z + hs); lw(.5, load ? load.col : BLUE); const nb = Math.max(2, Math.round(pe.len / .5)); for (let k = 0; k <= nb; k++){ const x = cx - hl + pe.len * k / nb; line(x, pe.z - hs, x, pe.z + hs); } } else { lw(1.2, load ? load.col : BLUE, [7, 3]); line(cx - hl, pe.z, cx + hl, pe.z); }
      if (pe.mxs) for (const mx of pe.mxs){ lw(1, INK); c.fillStyle = '#d9a640'; c.fillRect(X(cx + mx - .13), Z(pe.z - .13), .26 * P.s, .26 * P.s); c.strokeRect(X(cx + mx - .13), Z(pe.z - .13), .26 * P.s, .26 * P.s); }
      if (P.labels && (!dense || i % 5 === 0 || i === st.perches.length - 1)) text((pe.name || 'P' + (i + 1)) + '  ' + lvl(pe.y) + (pe.c ? '  ' + pe.c + ' circ.' : '') + (pe.wllP ? '  ' + pe.wllP + ' kg lus' : '') + (load && load.kg > 1 ? '  ' + Math.round(load.kg) + ' kg' : ''), cx + hl + .15, pe.z, { al: 'left', px: 7.5, col: load ? load.col : BLUE, mono: true }); });
    lw(.6, ACC, [10, 3, 2, 3]); line(0, Z0 - 1.6, 0, Z1 + 1.6); text('AXE', 0, Z0 - 1.95, { px: 8, col: ACC });
    lw(.9, ACC, [6, 3]); line(-W, 0, W, 0); text(v.open ? 'NEZ DE SCÈNE' : 'nez de scène  0,00', v.open ? (8 - P.ox) / P.s + .1 : -W + .2, v.open ? -.35 : .3, { al: 'left', px: 8.5, col: ACC, bg: true });
    if (!D && !v.open){ text('SCÈNE', 0, -Math.min(v.stageD, 8) / 2, { px: 13, b: true, col: MID }); text('PUBLIC', 0, Math.min(Z1 * .55, 9), { px: 13, b: true, col: MID }); } if (!v.open){ text('◄ JARDIN', -W * .6, Z0 - 1.8, { px: 9.5, b: true, col: MID }); text('COUR ►', W * .6, Z0 - 1.8, { px: 9.5, b: true, col: MID }); }
    if (!v.open){ dimH(-W, W, Z1 + 1.5, f1(2 * W) + ' m'); dimV(-W - 1.3, Z0, 0, f1(-Z0) + ' m'); dimV(-W - 1.3, 0, Z1, f1(Z1) + ' m'); } if (!v.open) dimH(-sw, sw, v.pitD ? v.pitD + .7 : .9, f1(v.stageW) + ' m');
    if (D && pl && !pl.calibrated) text('Plan non calé : échelle à vérifier (panneau « Dimensions de l’environnement » → Caler le plan)', 0, Z1 + 2.6, { px: 9, col: ACC, bg: true });
  }
  function seat(x, z, col = INK){ lw(.5, col); const w = .44, d = .42; c.strokeRect(X(x - w / 2), Z(z - d / 2), w * P.s, d * P.s); if (P.s > 14){ c.beginPath(); c.moveTo(X(x - w / 2), Z(z + d / 2 - .09)); c.lineTo(X(x + w / 2), Z(z + d / 2 - .09)); c.stroke(); } }

  // ---------------------------------------------------------------- matériel de l'Atelier (symboles)
  const SYM = () => Math.max(.5, 9 / P.s);              // les symboles gardent une taille lisible en vue d'ensemble
  function symbol(o, t, sel){
    const k = SYM() * P.s, col = sel ? ACC : INK;
    c.save(); c.translate(X(o.pos[0]), Z(o.pos[2])); c.rotate(-(t.cat === 'str' ? (o.yaw || 0) : (o.pan || 0)) * Math.PI / 180);
    c.lineWidth = (sel ? 1.8 : 1.1) * K; c.strokeStyle = col; c.fillStyle = PAPER; c.setLineDash([]);
    const R = (x, y, w, h) => { c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h); }, C = r => { c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.stroke(); }, L = (...p) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };
    if (t.cat === 'lum'){
      const kd = t.kind;
      if (kd === 'bar') R(-.5 * P.s, -.07 * k, P.s, .14 * k);
      else if (kd === 'prof'){ c.beginPath(); c.moveTo(-.2 * k, -.45 * k); c.lineTo(.2 * k, -.45 * k); c.lineTo(.3 * k, .35 * k); c.lineTo(-.3 * k, .35 * k); c.closePath(); c.fill(); c.stroke(); }
      else if (kd === 'fresnel'){ C(.36 * k); c.beginPath(); c.arc(0, 0, .2 * k, 0, 7); c.stroke(); }
      else if (kd === 'wash'){ R(-.36 * k, -.36 * k, .72 * k, .72 * k); C(.27 * k); }
      else if (kd === 'beam'){ C(.36 * k); L(-.25 * k, -.25 * k, .25 * k, .25 * k); L(.25 * k, -.25 * k, -.25 * k, .25 * k); }
      else if (kd === 'spot'){ C(.38 * k); c.fillStyle = col; c.beginPath(); c.moveTo(0, .26 * k); c.lineTo(-.2 * k, -.14 * k); c.lineTo(.2 * k, -.14 * k); c.closePath(); c.fill(); }
      else C(.32 * k);
      L(0, .36 * k, 0, .72 * k); L(-.1 * k, .58 * k, 0, .72 * k, .1 * k, .58 * k);                           // sens de tir
    } else if (t.cat === 'vid'){
      R(-.32 * k, -.3 * k, .64 * k, .6 * k); R(-.1 * k, .3 * k, .2 * k, .12 * k);
      const d = Math.min(14, (o.throw || 1.5) * 4) * P.s, hw = d / (o.throw || 1.5) / 2; c.setLineDash([5 * K, 3 * K]); c.lineWidth = .7 * K; L(0, .42 * k, -hw, d); L(0, .42 * k, hw, d); L(-hw, d, hw, d);
    } else if (t.cat === 'son'){
      const kd = t.kind;
      if (kd === 'sub'){ R(-.4 * k, -.4 * k, .8 * k, .8 * k); L(-.4 * k, -.4 * k, .4 * k, .4 * k); L(.4 * k, -.4 * k, -.4 * k, .4 * k); }
      else if (kd === 'wedge'){ c.beginPath(); c.moveTo(-.4 * k, -.25 * k); c.lineTo(.4 * k, -.25 * k); c.lineTo(.25 * k, .3 * k); c.lineTo(-.25 * k, .3 * k); c.closePath(); c.fill(); c.stroke(); }
      else { c.beginPath(); c.moveTo(-.28 * k, -.38 * k); c.lineTo(.28 * k, -.38 * k); c.lineTo(.42 * k, .32 * k); c.lineTo(-.42 * k, .32 * k); c.closePath(); c.fill(); c.stroke(); if (kd === 'line'){ L(-.33 * k, -.12 * k, .33 * k, -.12 * k); L(-.38 * k, .1 * k, .38 * k, .1 * k); } }
      if (kd !== 'sub' && t.hd < 200){ const a = t.hd * Math.PI / 360, d = 4 * P.s; c.setLineDash([2 * K, 3 * K]); c.lineWidth = .6 * K; L(0, .3 * k, -Math.sin(a) * d, Math.cos(a) * d); L(0, .3 * k, Math.sin(a) * d, Math.cos(a) * d); }
    } else {
      const kd = t.kind, s = P.s;
      if (kd === 'screen' || kd === 'ledwall'){ const w = (kd === 'ledwall' ? ST.LED.info(o).w : (o.size?.[0] || 6)) * s; if (kd === 'ledwall'){ c.fillStyle = INK; c.fillRect(-w / 2, -.06 * s, w, .12 * s); } c.lineWidth = 2.4 * K; L(-w / 2, 0, w / 2, 0); c.lineWidth = .8 * K; L(-w / 2, -.12 * s, -w / 2, .12 * s); L(w / 2, -.12 * s, w / 2, .12 * s); }
      else if (kd === 'truss'){ const l = (o.len || 3) * s, h = .29 * s; R(-l / 2, -h / 2, l, h); c.lineWidth = .6 * K; c.beginPath(); const n = Math.max(2, Math.round((o.len || 3) / .5)); for (let i = 0; i <= n; i++){ const x = -l / 2 + l * i / n, y = i % 2 ? h / 2 : -h / 2; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
      else if (kd === 'riser' && t.shape){ const w = (o.size?.[0] || 1) * s, d = (o.size?.[1] || 1) * s; c.beginPath(); c.moveTo(-w / 2, -d / 2); if (t.shape === 'tri'){ c.lineTo(w / 2, -d / 2); c.lineTo(-w / 2, d / 2); } else { c.lineTo(w / 2, -d / 2); c.arc(-w / 2, -d / 2, w, 0, Math.PI / 2); } c.closePath(); c.fill(); c.stroke(); }
      else if (kd === 'rail'){ const l = (o.len || 2) * s; c.lineWidth = 2.2 * K; L(-l / 2, 0, l / 2, 0); c.lineWidth = 1 * K; const n = Math.max(1, Math.ceil((o.len || 2) / 1.01)); for (let i = 0; i <= n; i++){ const x = -l / 2 + l * i / n; c.beginPath(); c.arc(x, 0, 2.2 * K, 0, 7); c.fill(); c.stroke(); } }
      else if (kd === 'stairs'){ const w = (o.size?.[0] || 1) * s, n = Math.max(1, Math.round((o.size?.[2] || .4) / .2)), d = Math.max(.1, (n - 1) * .28) * s; R(-w / 2, 0, w, d); c.lineWidth = .5 * K; for (let i = 1; i < n - 1; i++) L(-w / 2, d * i / (n - 1), w / 2, d * i / (n - 1)); L(0, d * .15, 0, d * .85); L(0, d * .85, -w * .12, d * .65); L(0, d * .85, w * .12, d * .65); }
      else if (kd === 'drape'){ const w = (o.size?.[0] || 3) * s; c.lineWidth = (t.skirt ? 1.6 : 2.4) * K; if (t.skirt) c.setLineDash([5 * K, 2.5 * K]); L(-w / 2, 0, w / 2, 0); c.setLineDash([]); }
      else if (kd === 'prim'){ const w = (o.size || t.size)[0] * s, d = (o.size || t.size)[1] * s; c.fillStyle = (o.pcol || '#8a93a6') + '55'; if (t.round){ c.beginPath(); c.ellipse(0, 0, w / 2, d / 2, 0, 0, 7); c.fill(); c.stroke(); if (t.shape === 'cone'){ c.beginPath(); c.arc(0, 0, 1.5 * K, 0, 7); c.stroke(); } if (t.shape === 'torus'){ const k2 = Math.max(.05, 1 - 2 * (o.size || t.size)[2] / Math.max(.01, Math.min((o.size || t.size)[0], (o.size || t.size)[1]))); c.beginPath(); c.ellipse(0, 0, w / 2 * k2, d / 2 * k2, 0, 0, 7); c.stroke(); } } else { R(-w / 2, -d / 2, w, d); if (t.shape === 'pyr'){ c.lineWidth = .5 * K; L(-w / 2, -d / 2, w / 2, d / 2); L(-w / 2, d / 2, w / 2, -d / 2); } if (t.shape === 'wedge'){ c.lineWidth = .5 * K; L(-w / 2, -d / 2, w / 2, 0); L(-w / 2, d / 2, w / 2, 0); } } }
      else if (kd === 'sprop'){ const w = (o.size || t.size)[0] * s, d = (o.size || t.size)[1] * s; if (t.round){ c.beginPath(); c.ellipse(0, 0, w / 2, d / 2, 0, 0, 7); c.fill(); c.stroke(); } else R(-w / 2, -d / 2, w, d); if (t.grp === 'Personnages'){ c.beginPath(); c.arc(0, 0, Math.min(w, d) * .22, 0, 7); c.stroke(); } }
      else if (kd === 'riser' || kd === 'desk'){ const w = (o.size?.[0] || 2) * s, d = (o.size?.[1] || 1) * s; R(-w / 2, -d / 2, w, d); if (kd === 'riser'){ c.lineWidth = .5 * K; L(-w / 2, -d / 2, w / 2, d / 2); } }
      else if (kd === 'mic'){ c.beginPath(); c.arc(0, 0, .13 * s, 0, 7); c.fill(); c.stroke(); L(-.13 * s, 0, .13 * s, 0); L(0, -.13 * s, 0, .13 * s); if (t.boom){ L(0, 0, 0, .5 * s); c.beginPath(); c.arc(0, .5 * s, .05 * s, 0, 7); c.fill(); c.stroke(); } }
      else if (kd === 'drums'){ c.setLineDash([4 * K, 3 * K]); c.strokeRect(-1 * s, -.75 * s, 2 * s, 1.8 * s); c.setLineDash([]); for (const [x, y, r] of [[0, .15, .28], [-.4, -.3, .18], [-.17, .08, .13], [.17, .08, .15], [.5, -.28, .2], [0, -.65, .16]]){ c.beginPath(); c.arc(x * s, y * s, r * s, 0, 7); c.fill(); c.stroke(); } c.lineWidth = .6 * K; for (const [x, y, r] of [[-.68, -.2, .175], [-.55, .32, .22], [.68, .22, .26]]){ c.beginPath(); c.arc(x * s, y * s, r * s, 0, 7); c.stroke(); L(x * s - 3 * K, y * s, x * s + 3 * K, y * s); L(x * s, y * s - 3 * K, x * s, y * s + 3 * K); } }
      else if (kd === 'piano'){ c.beginPath(); c.moveTo(-.75 * s, 0); c.lineTo(.75 * s, 0); c.lineTo(.75 * s, -.55 * s); c.bezierCurveTo(.75 * s, -1.1 * s, .3 * s, -1.2 * s, .25 * s, -1.6 * s); c.bezierCurveTo(.2 * s, -2.1 * s, -.2 * s, -2.25 * s, -.5 * s, -2.1 * s); c.bezierCurveTo(-.75 * s, -1.95 * s, -.75 * s, -1.6 * s, -.75 * s, -1.2 * s); c.closePath(); c.fill(); c.stroke(); R(-.75 * s, 0, 1.5 * s, .3 * s); R(-.35 * s, .6 * s, .7 * s, .36 * s); }
      else if (t.fp){ const w = t.fp[0] * s, d = t.fp[1] * s; R(-w / 2, -d / 2, w, d); c.lineWidth = .5 * K; if (kd === 'amp') L(-w / 2, d / 2 - .05 * s, w / 2, d / 2 - .05 * s); if (kd === 'keys') for (let i = 1; i < 12; i++) L(-w / 2 + w * i / 12, 0, -w / 2 + w * i / 12, d / 2); }
      else { c.beginPath(); c.ellipse(0, 0, .26 * s, .14 * s, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.arc(0, 0, .1 * s, 0, 7); c.fill(); c.stroke(); }
    }
    c.restore();
  }
  function objects(){
    const S = ST.S, sel = ST.UI.sel;
    for (const o of S.objs){
      if ((o.hidden || A.layHid(o))) continue;
      const t = ST.typeOf(o), isSel = sel.includes(o.id); symbol(o, t, isSel);
      if (!P.labels) continue;
      const k = SYM(), col = isSel ? ACC : INK, hang = o.hang === 'perche' ? A.percheDeltaAt(o.pos[2]) : 0;
      const far = P.s < 26 && !isSel; if (far && t.cat === 'str') continue;
      const tag = t.cat === 'str' ? (o.name || t.name) : `${o.n ?? ''}${!far && t.cat === 'lum' && o.addr ? '  ' + ST.addrStr(o) : ''}`;
      text(tag, o.pos[0], o.pos[2] - k * .62, { px: far ? 7.5 : 8.5, b: true, col, bg: !far, bl: 'bottom', mono: t.cat !== 'str', dy: -1 });
      if (isSel) text(`${o.name || t.name} · h ${f1(o.pos[1] + hang)}`, o.pos[0], o.pos[2] + k * .9, { px: 8.5, col: ACC, bg: true, bl: 'top', dy: 2 });
    }
  }
  // ---------------------------------------------------------------- coupe longitudinale (z horizontal, hauteur verticale ; scène à gauche)
  const V = y => P.oy - y * P.s, D2R = Math.PI / 180;
  const lineC = (z0, y0, z1, y1) => { c.beginPath(); c.moveTo(X(z0), V(y0)); c.lineTo(X(z1), V(y1)); c.stroke(); };
  const textC = (t, z, y, o) => text(t, z, -y, o);          // text() place en (X, Z) : Z(-y) = V(y)
  const objY = o => ST.posOf(o).y;
  function section(st){
    const z0 = st.param ? st.Z0 - 1 : -12.6, z1 = st.param ? st.Z1 + 1 : 24.6, yT = st.param ? Math.ceil(A.venueBounds().h) + 1 : 11;
    grid2(Math.ceil(z0), z1, -3, yT, lineC);
    // bâti coupé : nuage de points issu du modèle 3D
    const pts = A.sectionPoints(), r = Math.max(1.1 * K, P.s * .034); c.fillStyle = INK; for (let i = 0; i < pts.length; i += 2) c.fillRect(X(pts[i]) - r / 2, V(pts[i + 1]) - r / 2, r, r);
    // niveaux
    lw(.9, ACC, [6, 3]); lineC(z0, 0, z1, 0); textC('niveau scène  ±0,00', z1 - .2, 0, { al: 'right', px: 8.5, col: ACC, bg: true, dy: -7 });
    lw(.6, ACC, [10, 3, 2, 3]); lineC(0, -3.2, 0, yT + .4); textC('NEZ DE SCÈNE', 0, yT + .75, { px: 8, col: ACC });
    for (let y = -2; y <= yT - 1; y += 2){ lw(.6, MID); lineC(z0 - .35, y, z0, y); textC(lvl(y), z0 - .45, y, { al: 'right', px: 8, mono: true, col: MID }); }
    textC('SCÈNE', -5, -1.6, { px: 12, b: true, col: MID }); textC('PUBLIC', 11, -2.6, { px: 12, b: true, col: MID }); textC('◄ LOINTAIN', -9.5, yT + .75, { px: 9.5, b: true, col: MID }); textC('FACE / PUBLIC ►', 14, yT + .75, { px: 9.5, b: true, col: MID });
    // rideaux et pendrillons, perches avec leur hauteur
    const seen = new Set(); for (const cu of st.curtains){ const k = cu.z.toFixed(2); if (seen.has(k)) continue; seen.add(k); const pe = st.perches.find(q => Math.abs(q.z - cu.z) < .05); lw(cu.kind === 'fond' ? 2.6 : 1.8, CURTC); lineC(cu.z + .06, 0, cu.z + .06, pe ? pe.y - .06 : 6); }
    st.perches.forEach((pe, i) => { const load = window.RIG && RIG.sum ? RIG.sum(i) : null; c.fillStyle = PAPER; lw(1.1, BLUE); c.beginPath(); c.arc(X(pe.z), V(pe.y), Math.max(2.2 * K, .05 * P.s), 0, 7); c.fill(); c.stroke();
      lw(.4, BLUE, [2, 3]); lineC(pe.z, pe.y + .08, pe.z, st.param ? st.param.h : 9.2);
      if (P.labels && (P.s > 15 || i % 2 === 0)) textC('P' + (i + 1), pe.z, pe.y, { px: 7.5, b: true, col: BLUE, dy: 9, bg: P.s > 22 }); });
    if (P.labels && st.perches.length){ const ys = st.perches.map(q => q.y), same = Math.max(...ys) - Math.min(...ys) < .02, za = st.perches[0].z, zb = st.perches[st.perches.length - 1].z; if (same) textC('perches à ' + lvl(ys[0]), (za + zb) / 2, ys[0], { px: 8.5, col: BLUE, bg: true, dy: -11 }); else if (P.s > 22) st.perches.forEach(pe => textC(f1(pe.y), pe.z, pe.y, { px: 7, col: BLUE, mono: true, dy: -9 })); }
  }
  function symbolC(o, t, sel){
    const z = o.pos[2], y = objY(o), col = sel ? ACC : INK, k = Math.max(.34, 9 / P.s); lw(sel ? 1.8 : 1.1, col); c.fillStyle = PAPER;
    if (t.cat === 'lum'){ const p = (o.pan || 0) * D2R, ti = (o.tilt || 0) * D2R, dz = Math.sin(ti) * Math.cos(p), dy = -Math.cos(ti), n = Math.hypot(dz, dy) || 1, L = sel ? 40 : 1.1;
      // faisceau projeté dans le plan de coupe ; pour la sélection, jusqu'au sol avec l'ouverture
      if (n > .15){ lw(sel ? .9 : .7, sel ? ACC : MID, sel ? null : [3, 2]); let e = L; if (sel && dy < -.02) e = Math.min(40, (y + 3) / -(dy / n)); if (sel && t.zoom){ const a = Math.atan2(dy, dz), h = (o.zoom ?? t.zoom[0]) * D2R / 2; for (const q of [a - h, a + h]) lineC(z, y - .15, z + Math.cos(q) * e, y - .15 + Math.sin(q) * e); } else lineC(z, y - .15, z + dz / n * e, y - .15 + dy / n * e); }
      lw(sel ? 1.8 : 1.1, col); c.beginPath(); c.arc(X(z), V(y - .18), k * .42 * P.s, 0, 7); c.fill(); c.stroke(); lineC(z, y, z, y - .05); return; }
    const hgt = t.kind === 'prim' ? Math.max(.02, (o.size || t.size)[2]) : t.kind === 'ledwall' || t.kind === 'screen' ? (o.size ? o.size[1] : 2) : t.cat === 'son' ? .7 : /pers|human|chant|music|public/.test(t.id + (t.kind || '')) ? 1.75 : Math.min(2.2, Math.max(.3, (t.h || t.fp && Math.min(t.fp[0], t.fp[1])) || .5)), dep = t.kind === 'prim' ? (o.size || t.size)[1] : t.kind === 'ledwall' || t.kind === 'screen' ? .12 : Math.max(.25, Math.min(1.6, t.fp ? t.fp[1] : .45));
    const down = o.hang ? 1 : 0; c.fillRect(X(z - dep / 2), V(y + (down ? 0 : hgt)), dep * P.s, hgt * P.s); c.strokeRect(X(z - dep / 2), V(y + (down ? 0 : hgt)), dep * P.s, hgt * P.s);
  }
  function objectsC(){
    const S = ST.S, sel = ST.UI.sel, list = S.objs.filter(o => !(o.hidden || A.layHid(o))).sort((a, b) => sel.includes(a.id) - sel.includes(b.id));
    for (const o of list){ const t = ST.typeOf(o), isSel = sel.includes(o.id); symbolC(o, t, isSel); if (!P.labels) continue; const far = P.s < 26 && !isSel; if (far && t.cat !== 'lum') continue;
      const y = objY(o); if (isSel) textC(`${t.cat === 'str' ? '' : (o.n ?? '') + ' · '}${o.name || t.name} · h ${f1(y)}`, o.pos[2], y, { px: 8.5, col: ACC, bg: true, bl: 'bottom', dy: -13 });
      else if (!far) textC(t.cat === 'str' ? (o.name || t.name) : String(o.n ?? ''), o.pos[2], y, { px: 7.5, b: true, mono: t.cat !== 'str', bl: 'bottom', dy: -11 }); }
  }
  function hitC(z, y){ let best = null, bd = 1e9; const R = Math.max(.4, 11 / P.s); for (const o of ST.S.objs){ if ((o.hidden || A.layHid(o)) || o.locked) continue; const t = ST.typeOf(o), oy = objY(o), cy = t.cat === 'lum' ? oy - .18 : o.hang ? oy - .4 : oy + .5, d = Math.hypot(o.pos[2] - z, (cy - y) * (t.cat === 'lum' ? 1 : .6)); if (d < R && d < bd){ bd = d; best = o; } } return best; }
  function cartouche(st, x, y, w){
    const S = ST.S, n = cat => S.objs.filter(o => ST.typeOf(o).cat === cat).length, h = 58 * K;
    c.setLineDash([]); c.fillStyle = PAPER; c.fillRect(x, y, w, h); c.lineWidth = 1.2 * K; c.strokeStyle = INK; c.strokeRect(x, y, w, h);
    c.lineWidth = .6 * K; c.beginPath(); c.moveTo(x, y + 20 * K); c.lineTo(x + w, y + 20 * K); c.moveTo(x, y + 39 * K); c.lineTo(x + w, y + 39 * K); c.stroke();
    c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = INK;
    c.font = `600 ${11 * K}px system-ui,sans-serif`; c.fillText((st.param ? st.param.name : 'Salle de démonstration') + ' — ' + (P.view === 'coupe' ? 'coupe longitudinale (axe)' : 'plan technique'), x + 6 * K, y + 10 * K);
    c.font = `${9.5 * K}px system-ui,sans-serif`; c.fillText(`Projet : ${S.name}  ·  Configuration : ${st.cfg}`, x + 6 * K, y + 29.5 * K);
    c.fillText(`${n('lum')} projecteurs · ${n('vid')} VP · ${n('son')} enceintes  ·  ${new Date().toLocaleDateString('fr-CH')}  ·  cotes en m`, x + 6 * K, y + 48.5 * K);
  }
  // une feuille hors écran pour la publication : la vue demandée, à l'échelle donnée (denom, 0 = ajustée), sans cartouche
  function sheet(view, W, H, dpi, denom){
    LBOX.length = 0; const st = A.planState(), keep = { s: P.s, ox: P.ox, oy: P.oy, w: P.w, h: P.h, view: P.view, fitted: P.fitted }, off = document.createElement('canvas'); off.width = W; off.height = H;
    try { c = off.getContext('2d'); K = dpi / 96 * 1.15; P.view = view; P.w = W; P.h = H; fit();
      if (denom > 0){ const cx = (W / 2 - P.ox) / P.s, cy = (H / 2 - P.oy) / P.s; P.s = dpi / 25.4 * 1000 / denom; P.ox = W / 2 - cx * P.s; P.oy = H / 2 - cy * P.s; }
      c.fillStyle = PAPER; c.fillRect(0, 0, W, H); const cp = view === 'coupe'; if (cp){ section(st); objectsC(); } else { room(st); objects(); } extras(cp); scaleBar(40 * K, H - 40 * K);
      return { canvas: off, denom: Math.round(dpi / 25.4 * 1000 / P.s) }; }
    finally { Object.assign(P, keep); c = ctx; K = 1; P.dirty = true; }
  }
  function scaleBar(x, y){
    const steps = [1, 2, 5, 10], m = steps.find(v => v * P.s > 70 * K) || 10, w = m * P.s;
    c.setLineDash([]); c.strokeStyle = INK; c.lineWidth = 1 * K; c.fillStyle = INK;
    c.strokeRect(x, y, w, 5 * K); c.fillRect(x, y, w / 2, 5 * K);
    c.font = `${9 * K}px ui-monospace,Menlo,Consolas,monospace`; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillText('0', x - 2 * K, y + 8 * K); c.textAlign = 'right'; c.fillText(m + ' m', x + w + 6 * K, y + 8 * K);
  }
  const extras = cp => { for (const f of (window.PLANX || [])) try { f({ c, X, Z, V, s: P.s, K, cp, P, INK, BLUE, ACC, MID, PAPER, text }); } catch (e){ console.error(e); } };
  function draw(){
    if (!P.on || !P.w) return; P.dirty = false; LBOX.length = 0;
    const st = A.planState(); c = ctx; K = 1;
    c.setTransform(P.d, 0, 0, P.d, 0, 0); c.fillStyle = PAPER; c.fillRect(0, 0, P.w, P.h);
    const cp = P.view === 'coupe'; if (cp){ section(st); objectsC(); } else { room(st); objects(); } extras(cp);
    if (drag?.box){ let [a, b, c2, d] = drag.box; if (cp){ b = -b; d = -d; } c.setLineDash([4, 3]); c.lineWidth = 1; c.strokeStyle = BLUE; c.fillStyle = 'rgba(31,78,156,.08)'; c.fillRect(X(a), Z(b), (c2 - a) * P.s, (d - b) * P.s); c.strokeRect(X(a), Z(b), (c2 - a) * P.s, (d - b) * P.s); c.setLineDash([]); }
    if (!cp && drag?.ser?.moved && drag.ser.blk){ const q = drag.ser, k = ST.blkCells(q.blk, q.a, q.b); lw(1.2, ACC); for (const [px, pz] of k.pts) c.strokeRect(X(px - k.mw / 2), Z(pz - k.md / 2), k.mw * P.s, k.md * P.s); c.fillStyle = 'rgba(255,170,40,.14)'; c.fillRect(X(k.x0), Z(k.z0), k.w * P.s, k.d * P.s); text(ST.blkTip(k), k.x0 + k.w / 2, k.z0, { dy: -14, px: 10, col: ACC, bg: true, b: true }); }
    else if (!cp && drag?.ser?.moved){ const q = drag.ser, [a, b] = serAB(q), pts = ST.seriePts(a, b); lw(1.2, ACC); c.setLineDash([5, 4]); c.beginPath(); c.moveTo(X(a[0]), Z(a[1])); c.lineTo(X(b[0]), Z(b[1])); c.stroke(); c.setLineDash([]); c.fillStyle = ACC; for (const [px, pz] of pts){ c.beginPath(); c.arc(X(px), Z(pz), 4.5, 0, 7); c.fill(); }
      text(`${pts.length} ×${pts.length > 1 ? ' · écart ' + f1(Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1])) + ' m' : ''}`, b[0], b[1], { dy: -16, px: 10, col: ACC, bg: true, b: true }); }
    if (!cp && P.marks) for (const [mx, mz, ml] of P.marks){ lw(1.4, ACC); c.beginPath(); c.arc(X(mx), Z(mz), 6, 0, 7); c.moveTo(X(mx) - 11, Z(mz)); c.lineTo(X(mx) + 11, Z(mz)); c.moveTo(X(mx), Z(mz) - 11); c.lineTo(X(mx), Z(mz) + 11); c.stroke(); if (ml) text(ml, mx, mz, { dy: -16, px: 9.5, col: ACC, bg: true, b: true }); }
    if (!cp && P.picker){ c.font = '600 12px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top'; const w = c.measureText(P.picker.hint).width + 20; c.fillStyle = ACC; c.fillRect(P.w / 2 - w / 2, 8, w, 24); c.fillStyle = '#fff'; c.fillText(P.picker.hint, P.w / 2, 14); }
    const cw = Math.min(360, P.w - 16); cartouche(st, P.w - cw - 8, P.h - 66, cw); if (P.w - cw > 150) scaleBar(14, P.h - 30);
    if (cp){ c.font = '9px system-ui,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = MID; c.fillText('Coupe dans l\'axe. Glisser un objet : profondeur, et hauteur s\'il n\'est pas sur perche.', 12, 8); } else if (P.s < 26 && P.labels && ST.S.objs.length){ c.font = '9px system-ui,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = MID; c.fillText('Zoome (molette) pour afficher les adresses DMX et les noms.', 12, 8); }
  }
  A.hooks.update.push(dt => { if (!P.on) return; P.acc = (P.acc || 0) + dt; if (P.acc > .15 || P.dirty){ P.acc = 0; draw(); } });

  // ---------------------------------------------------------------- export PNG (A3 portrait, 1:100)
  $('#planPng').onclick = async () => {
    if (P.view === 'coupe'){ const st = A.planState(), keep = { s: P.s, ox: P.ox, oy: P.oy, w: P.w, h: P.h }, dpi = 150, W = Math.round(420 / 25.4 * dpi), H = Math.round(297 / 25.4 * dpi);
      const off = document.createElement('canvas'); off.width = W; off.height = H; c = off.getContext('2d'); K = dpi / 96 * 1.15; P.s = dpi / 25.4 * 10; P.ox = 110 + 13.6 * P.s; P.oy = 150 + 11.6 * P.s; P.w = W; P.h = H;
      c.fillStyle = PAPER; c.fillRect(0, 0, W, H); try { section(st); objectsC(); extras(true); cartouche(st, W - 400 * K - 40, H - 58 * K - 40, 400 * K); scaleBar(60, H - 70); c.font = `${9 * K}px system-ui,sans-serif`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = INK; c.fillText('Échelle 1:100 sur A3 paysage', 60, H - 110); }
      finally { Object.assign(P, keep); c = ctx; K = 1; draw(); }
      const blob = await new Promise(r => off.toBlob(r, 'image/png')); if (!blob) return ST.toast('Export impossible dans cette vue.', true);
      return void await ST.saveFile('coupe-' + (ST.S.name || 'stagefactory').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png', new Uint8Array(await blob.arrayBuffer())); }
    const st = A.planState(), keep = { s: P.s, ox: P.ox, oy: P.oy, w: P.w, h: P.h }, dpi = 150, W = Math.round(297 / 25.4 * dpi), H = Math.round(420 / 25.4 * dpi);
    const off = document.createElement('canvas'); off.width = W; off.height = H; c = off.getContext('2d'); K = dpi / 96 * 1.15;
    P.s = dpi / 25.4 * 10; P.ox = W / 2; P.oy = 150 + (-st.Z0 + 1.9) * P.s; P.w = W; P.h = H;
    c.fillStyle = PAPER; c.fillRect(0, 0, W, H); try { room(st); objects(); extras(false); cartouche(st, W - 400 * K - 40, H - 58 * K - 40, 400 * K); scaleBar(60, H - 70);
      c.font = `${9 * K}px system-ui,sans-serif`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = INK; c.fillText('Échelle 1:100 sur A3', 60, H - 110); }
    finally { Object.assign(P, keep); c = ctx; K = 1; draw(); }
    const blob = await new Promise(r => off.toBlob(r, 'image/png'));
    if (!blob) return ST.toast('Export impossible dans cette vue.', true);
    await ST.saveFile('plan-' + (ST.S.name || 'stagefactory').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png', new Uint8Array(await blob.arrayBuffer()));
  };

  // ---------------------------------------------------------------- interaction : zoom, déplacement, sélection
  const CP = () => P.view === 'coupe';
  const world = e => { const r = cv.getBoundingClientRect(), u = (e.clientX - r.left - P.ox) / P.s, v = (e.clientY - r.top - P.oy) / P.s; return CP() ? [u, -v] : [u, v]; };          // en coupe : [profondeur z, hauteur y]
  function hit(x, z){
    if (CP()) return hitC(x, z);
    const objs = ST.S.objs, R = Math.max(.45, SYM() * .55); let best = null, bd = 1e9;
    for (const o of objs){ if ((o.hidden || A.layHid(o)) || o.locked) continue; const t = ST.typeOf(o); let d = Math.hypot(o.pos[0] - x, o.pos[2] - z), r = R;
      if (t.cat === 'str' && t.fp){ d = Math.hypot(o.pos[0] - x, o.pos[2] - z); r = Math.max(.3, Math.min(t.fp[0], t.fp[1]) / 2); }
      if (t.kind === 'prim'){ const z2 = o.size || t.size; r = Math.max(.3, Math.min(z2[0], z2[1]) / 2); }
      else if (t.cat === 'str' && (o.size || o.len || t.kind === 'ledwall')){ const a = (o.yaw || 0) * Math.PI / 180, dx = x - o.pos[0], dz = z - o.pos[2], lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a), hw = (o.len || o.size[0]) / 2, hd = t.kind === 'screen' ? .25 : (o.size ? o.size[1] / 2 : .2); d = Math.max(Math.abs(lx) - hw, Math.abs(lz) - hd, 0); r = .15; }
      if (d <= r && d < bd){ bd = d; best = o; } }
    return best;
  }
  const ptr = new Map(); let drag = null; P.tool = 'pan';
  const serAB = q => ST.UI.serieSym ? [[-q.b[0], q.b[1]], q.b] : [q.a, q.b];
  cv.addEventListener('pointerdown', e => {
    if (P.picker && e.button === 0 && !CP()){ const [x, z] = world(e), pk = P.picker; e.preventDefault(); pk.cb(x, z); draw(); return; }
    cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ST.UI.placing && e.button === 0 && !CP() && ptr.size === 1){ let [x, z] = world(e); const blk = ST.blkType(ST.UI.placing), pi = blk ? -1 : ST.percheNear(x, z); if (pi >= 0) z = A.PERCHES[pi].z; drag = { ser: { blk, c: [x, z], a: blk ? ST.blkSnap([x, z]) : [x, z], b: [x, z], pi, sx: e.clientX, sy: e.clientY, moved: false } }; cv.style.cursor = 'crosshair'; return; }          // pose : un clic = un objet, une ligne tirée = une série
    if (ptr.size === 2){ const [a, b] = [...ptr.values()]; drag = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), s: P.s }; return; }
    const [x, z] = world(e), o = hit(x, z);
    if (e.button === 2){ if (o && !ST.UI.sel.includes(o.id)) ST.select([o.id]); drag = null; ptr.delete(e.pointerId); draw(); window.WS?.ctx(e.clientX, e.clientY); return; }
    if (e.button === 1){ drag = { pan: [e.clientX, e.clientY, P.ox, P.oy], moved: true }; return; }
    if (!o && e.pointerType === 'mouse' && (e.shiftKey || P.tool === 'box')){ drag = { box: [x, z, x, z], add: e.shiftKey && P.tool === 'box' }; return; }
    if (o){ if (!ST.UI.sel.includes(o.id) || e.shiftKey) ST.select([o.id], e.shiftKey); drag = { x, z, moved: false, start: ST.selObjs().filter(q => !q.locked).map(q => [q, q.pos[0], q.pos[2], q.pos[1]]), h0: new Map(ST.selObjs().map(q => [q.id, ST.magState(q)])) }; cv.style.cursor = 'move'; }
    else { drag = { pan: [e.clientX, e.clientY, P.ox, P.oy], moved: false }; cv.style.cursor = 'grabbing'; }
    draw();
  });
  cv.addEventListener('pointermove', e => {
    if (ptr.has(e.pointerId)) ptr.set(e.pointerId, [e.clientX, e.clientY]);
    const [x, z] = world(e); $('#planXY').textContent = CP() ? `Z ${f1(x)}  H ${f1(z)} m` : `X ${f1(x)}  Z ${f1(z)} m`;
    if (!drag){ cv.style.cursor = P.picker || ST.UI.placing ? 'crosshair' : hit(x, z) ? 'pointer' : 'grab'; return; }
    if (drag.pinch){ if (ptr.size < 2) return; const [a, b] = [...ptr.values()], r = cv.getBoundingClientRect(), mx = (a[0] + b[0]) / 2 - r.left, my = (a[1] + b[1]) / 2 - r.top; zoomAt(mx, my, drag.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / drag.pinch / P.s); return; }
    if (drag.box){ drag.box[2] = x; drag.box[3] = z; draw(); return; }
    if (drag.ser){ const q = drag.ser; if (Math.hypot(e.clientX - q.sx, e.clientY - q.sy) > 4) q.moved = true; if (q.pi >= 0){ const hl = A.percheLen(q.pi) / 2, cx = A.percheX(q.pi); q.b = [Math.max(cx - hl, Math.min(cx + hl, x)), A.PERCHES[q.pi].z]; } else q.b = [x, z]; draw(); return; }
    if (drag.pan){ const dx = e.clientX - drag.pan[0], dy = e.clientY - drag.pan[1]; if (Math.hypot(dx, dy) > 3) drag.moved = true; P.ox = drag.pan[2] + dx; P.oy = drag.pan[3] + dy; draw(); return; }
    const dx = x - drag.x, dz = z - drag.z; if (!drag.moved){ if (Math.hypot(dx, dz) * P.s < 4) return; drag.moved = true; ST.pushUndo(0, 'Déplacement'); }
    const snap = e.altKey ? 1e-3 : (window.WS?.pref.snap || 1e-3);
    if (CP()){ for (const [o, , z0, y0] of drag.start){ o.pos[2] = Math.round((z0 + dx) / snap) * snap; if (o.hang !== 'perche') o.pos[1] = Math.max(0, Math.round((y0 + dz) / snap) * snap); } }
    else { for (const [o, x0, z0] of drag.start){ o.pos[0] = Math.round((x0 + dx) / snap) * snap; o.pos[2] = Math.round((z0 + dz) / snap) * snap; }
      if (!drag.mag) drag.mag = drag.start.map(q => [q[0], { hang: drag.h0.get(q[0].id).hang, sid: drag.h0.get(q[0].id).sid, pi: drag.h0.get(q[0].id).pi, y: q[3] }]);
      ST.magnet(drag.mag, Math.max(.25, Math.min(.8, 40 / P.s)), e.altKey, false); }   // aimant : à 40 pixels d'une perche ou d'un pont, l'appareil s'y accroche (Alt : sans aimant)
    ST.touch(true); draw();
  });
  const end = e => {
    ptr.delete(e.pointerId); if (!drag) return;
    if (drag.ser){ const q = drag.ser, [a, b] = serAB(q), id = ST.UI.placing; drag = null; cv.style.cursor = 'grab'; if (id && q.blk){ ST.placeBlock(id, q.moved ? ST.blkCells(q.blk, q.a, q.b) : ST.blkCells(q.blk, q.c)); if (!e.shiftKey) ST.UI.placing = null; ST.render(); } else if (id){ ST.placeSeries(id, q.moved ? ST.seriePts(a, b) : [q.a], q.pi); if (!e.shiftKey) ST.UI.placing = null; ST.render(); } draw(); return; }
    if (drag.box){ const [a, b, c2, d] = drag.box, x0 = Math.min(a, c2), x1 = Math.max(a, c2), z0 = Math.min(b, d), z1 = Math.max(b, d); ST.select(ST.S.objs.filter(o => { if ((o.hidden || A.layHid(o)) || o.locked) return false; const u = CP() ? o.pos[2] : o.pos[0], v = CP() ? objY(o) : o.pos[2]; return u >= x0 && u <= x1 && v >= z0 && v <= z1; }).map(o => o.id), true); }
    else if (drag.start && drag.moved){ if (drag.mag) ST.magSay(drag.mag); ST.touch(); ST.refreshProps(); const g = ST.selObjs().pop(); if (g) ST.select(ST.UI.sel); }
    else if (drag.pan && !drag.moved && ST.UI.sel.length) ST.select([]);
    drag = null; cv.style.cursor = 'grab'; draw();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  function zoomAt(mx, my, f){ const s = Math.max(4, Math.min(260, P.s * f)); f = s / P.s; P.ox = mx - (mx - P.ox) * f; P.oy = my - (my - P.oy) * f; P.s = s; draw(); }
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015))); }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  $('#planTool').onclick = () => { P.tool = P.tool === 'box' ? 'pan' : 'box'; $('#planTool').classList.toggle('on', P.tool === 'box'); };
  cv.addEventListener('dblclick', () => { fit(); draw(); });

  const pick = (hint, cb) => { P.picker = cb ? { hint, cb } : null; if (cb && !P.on) toggle(true); if (cb && P.view !== 'plan') setView('plan'); draw(); };
  { const ob = document.createElement('button'); ob.className = 'b'; ob.id = 'planOpt'; ob.textContent = '▦'; ob.title = 'Fond, tracé et grille du plan'; win.querySelector('.pv').after(ob);
    const pp = document.createElement('div'); pp.id = 'planPop'; pp.style.cssText = 'position:absolute;right:10px;top:44px;z-index:5;width:236px;display:none;background:#1d2027;color:#e8e6f5;border:1px solid #3a3266;border-radius:10px;padding:10px 12px;font:12px Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.45)'; win.appendChild(pp);
    const THEMES = [['Papier', '#fbfaf6', '#15161a'], ['Blanc', '#ffffff', '#000000'], ['Gris', '#d9dbe0', '#14161a'], ['Noir', '#101216', '#e8e8ea'], ['Bleu de plan', '#123a66', '#eaf2ff']];
    const row = 'display:flex;align-items:center;gap:8px;margin:6px 0', lab = 'flex:1;color:#a9a5c9', ci = 'width:34px;height:24px;padding:0;border:1px solid #3a3266;border-radius:6px;background:none';
    const ren = () => { pp.innerHTML = `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">${THEMES.map(([n, p, k], i) => `<a data-th="${i}" title="${n}" style="cursor:pointer;flex:0 0 38px;height:24px;border-radius:6px;background:${p};border:${TH.paper === p && TH.ink === k ? '2px solid #2affd0' : '1px solid #6a6496'};color:${k};font:700 11px system-ui;display:flex;align-items:center;justify-content:center">Aa</a>`).join('')}</div>
        <div style="${row}"><label style="${lab}">Fond</label><input type="color" data-t="paper" value="${TH.paper}" style="${ci}"></div><div style="${row}"><label style="${lab}">Tracé</label><input type="color" data-t="ink" value="${TH.ink}" style="${ci}"></div>
        <label class="chk" style="color:#e8e6f5"><input type="checkbox" data-t="grid" ${TH.grid ? 'checked' : ''}> Grille</label>
        <div style="${row}"><label style="${lab}">Pas de la grille</label><select data-t="step" style="background:#1c1636;color:#e8e6f5;border:1px solid #3a3266;border-radius:6px;padding:3px 5px;font:12px Inter,sans-serif">${[[.5, '0,5 m'], [1, '1 m'], [2, '2 m'], [5, '5 m']].map(([v, l]) => `<option value="${v}"${+TH.step === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div style="${row}"><label style="${lab}">Couleur de la grille</label><input type="color" data-t="gcol" value="${TH.gcol || G2}" style="${ci}"><a data-ga="1" title="Couleur déduite du fond et du tracé" style="cursor:pointer;color:#a9a5c9">auto</a></div>
        <div class="btns"><button class="b" data-tr="1">Réglages d'origine</button></div>`; };
    const set = () => { theme(); A.store.set('plan2d', TH); BD.key = ''; P.dirty = true; draw(); };
    ob.onclick = e => { e.stopPropagation(); const on = pp.style.display !== 'block'; pp.style.display = on ? 'block' : 'none'; ob.classList.toggle('on', on); if (on) ren(); };
    pp.addEventListener('input', e => { const k = e.target.dataset.t; if (!k) return; TH[k] = e.target.type === 'checkbox' ? e.target.checked : k === 'step' ? +e.target.value : e.target.value; set(); if (k === 'paper' || k === 'ink') pp.querySelectorAll('[data-th]').forEach((a, i) => a.style.border = TH.paper === THEMES[i][1] && TH.ink === THEMES[i][2] ? '2px solid #2affd0' : '1px solid #6a6496'); });
    pp.addEventListener('click', e => { const t = e.target.closest('[data-th]'); if (t){ TH.paper = THEMES[+t.dataset.th][1]; TH.ink = THEMES[+t.dataset.th][2]; set(); return ren(); } if (e.target.closest('[data-ga]')){ TH.gcol = ''; set(); return ren(); } if (e.target.closest('[data-tr]')){ Object.assign(TH, TDEF); set(); ren(); } });
    pp.addEventListener('pointerdown', e => e.stopPropagation()); pp.addEventListener('keydown', e => e.stopPropagation());
    cv.addEventListener('pointerdown', () => { if (pp.style.display === 'block'){ pp.style.display = 'none'; ob.classList.remove('on'); } }, true);
    P.theme = TH; P.setTheme = o => { Object.assign(TH, o); set(); }; }
  window.PLAN = { P, toggle, draw, fit, hit, layout, setView, pick, size, world, sheet };
}
