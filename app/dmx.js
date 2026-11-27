// DMX : réception Art-Net / sACN (grandMA3 onPC, Avolites Titan, MadMapper…) par la passerelle locale, et moniteur.
// La page publiée ne peut pas parler au réseau : ce module n'est actif que dans la version locale (http://localhost).
export function initDmx(A, ST, IN){
  const $ = s => document.querySelector(s), S = ST.S, T = A.THREE, esc = ST.esc;
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const U = new Map(), seen = new Map();                       // univers -> Uint8Array(512) ; univers -> { n, t, proto, fps }
  const P = Object.assign({ on: true, sacn: '1-4', artOff: 1 }, A.store.get('dmx', {}));
  const D = { state: LOCAL ? 'attente' : 'absent', ws: null, info: null, view: 1 };
  // personnalités des appareils génériques de la bibliothèque : un nom par canal, dans l'ordre
  const mv = (...rest) => ['pan', 'panF', 'tilt', 'tiltF', '-', ...rest];
  const GEN = {
    'par-led': [['dim', 'r', 'g', 'b', 'w', 'strobe', '-'], ['dim', 'dimF', 'r', 'g', 'b', 'w', 'strobe', '-', '-', '-']],
    'par-zoom': [['dim', 'r', 'g', 'b', 'w', 'strobe', 'zoom', '-', '-']],
    decoupe: [['dim', 'dimF'], ['dim']], 'decoupe-l': [['dim', 'dimF']], fresnel: [['dim', 'dimF']], pc1k: [['dim']],
    wash: [mv('dim', 'strobe', 'r', 'g', 'b', 'w', 'zoom', '-', '-', '-'), mv('dim', 'dimF', 'strobe', 'r', 'g', 'b', 'w', '-', 'zoom', '-', '-', '-', '-', '-', '-', '-')],
    beam: [mv('dim', 'strobe', 'r', 'g', 'b', 'zoom', 'gobo', 'gobor', 'cw', 'prism', 'prismr'), mv('dim', 'dimF', 'strobe', 'r', 'g', 'b', 'zoom', 'gobo', 'gobor', 'focus', 'cw', 'prism', 'prismr', '-', '-')],
    spot: [mv('dim', 'dimF', 'strobe', 'c', 'm', 'y', 'cto', 'zoom', 'gobo', 'gobor', 'iris', 'b1', 'b1r', 'b2', 'b2r', 'b3', 'b3r', 'b4', 'b4r'), mv('dim', 'dimF', 'strobe', 'c', 'm', 'y', 'cto', 'zoom', 'gobo', 'gobor', 'iris', 'focus', 'b1', 'b1r', 'b2', 'b2r', 'b3', 'b3r', 'b4', 'b4r', 'cw', 'prism', 'prismr', ...Array(4).fill('-'))],
    barre: [['r', 'g', 'b'], Array.from({ length: 30 }, (_, i) => 'rgb'[i % 3])],
    blinder: [['dim', 'dim']], poursuite: [[]],
  };
  const NAME = { dim: 'Dimmer', dimF: 'Dimmer fin', pan: 'Pan', panF: 'Pan fin', tilt: 'Tilt', tiltF: 'Tilt fin', r: 'Rouge', g: 'Vert', b: 'Bleu', w: 'Blanc', c: 'Cyan', m: 'Magenta', y: 'Jaune', zoom: 'Zoom', strobe: 'Strobe', shutter: 'Shutter', gobo: 'Gobo', gobor: 'Gobo : orientation / rotation', iris: 'Iris', focus: 'Netteté', b1: 'Couteau haut', b1r: 'Couteau haut : angle', b2: 'Couteau droit', b2r: 'Couteau droit : angle', b3: 'Couteau bas', b3r: 'Couteau bas : angle', b4: 'Couteau gauche', b4r: 'Couteau gauche : angle', cw: 'Roue de couleurs', cto: 'CTO', prism: 'Prisme', prismr: 'Prisme : orientation / rotation', a: 'Ambre', '-': '—' };
  const layout = (t, mode) => (t.chs && t.chs[mode]) || (GEN[t.id] && (GEN[t.id][mode] || GEN[t.id][0])) || null;
  const lerp = (r, v) => r[0] + (r[1] - r[0]) * v;
  const OUT = {}, col = new T.Color();
  function read(o, t, c){
    if (!o.addr) return null; const lay = layout(t, o.mode || 0), buf = U.get(o.uni || 1); if (!lay || !lay.length || !buf) return null;
    const a = o.addr - 1; if (a + lay.length > 512) return null;
    let dim = 0, nd = 0, dimF = 0, pan = -1, panF = 0, tilt = -1, tiltF = 0, r = 0, g = 0, b = 0, w = 0, nr = 0, ng = 0, nb = 0, nw = 0, cy = -1, mg = -1, ye = -1, zoom = -1, st = 0, sh = -1, am = 0, na = 0; const X = {};
    for (let i = 0; i < lay.length; i++){ const v = buf[a + i]; switch (lay[i]){
      case 'dim': dim += v; nd++; break; case 'dimF': dimF = v; break; case 'pan': pan = v; break; case 'panF': panF = v; break; case 'tilt': tilt = v; break; case 'tiltF': tiltF = v; break;
      case 'r': r += v; nr++; break; case 'g': g += v; ng++; break; case 'b': b += v; nb++; break; case 'w': w += v; nw++; break;
      case 'c': cy = v; break; case 'm': mg = v; break; case 'y': ye = v; break; case 'zoom': zoom = v; break; case 'strobe': st = v; break; case 'shutter': sh = v; break; case 'gobo': case 'gobor': case 'iris': case 'focus': case 'b1': case 'b1r': case 'b2': case 'b2r': case 'b3': case 'b3r': case 'b4': case 'b4r': case 'cw': case 'cto': case 'prism': case 'prismr': X[lay[i]] = v; break; case 'a': am += v; na++; break; } }
    let lvl = nd ? (nd === 1 ? (dim * 256 + dimF) / 65535 : dim / nd / 255) : 1;
    if (nr || ng || nb || na){ const W = nw ? w / nw / 255 * .85 : 0, AM = na ? am / na / 255 : 0; let R = Math.min(1, (nr ? r / nr / 255 : 0) + W + AM), G = Math.min(1, (ng ? g / ng / 255 : 0) + W + AM * .55), B = Math.min(1, (nb ? b / nb / 255 : 0) + W); /* ambre : une source de plus (teinte ≈ 590 nm), ajoutée comme le blanc */ const m = Math.max(R, G, B);
      if (m > 0) c.setRGB(R / m, G / m, B / m, T.SRGBColorSpace); lvl *= m; }
    else if (cy >= 0) c.setRGB(1 - cy / 255, 1 - (mg < 0 ? 0 : mg) / 255, 1 - (ye < 0 ? 0 : ye) / 255, T.SRGBColorSpace);
    OUT.strobe = 0;
    if (sh >= 0 && t.sh){ let k = 'open'; for (const e of t.sh) if (sh >= e[0]) k = e[1]; if (k === 'closed') lvl = 0; else if (k === 'strobe') OUT.strobe = 3 + sh / 255 * 14; }
    else if (st > 10) OUT.strobe = 2 + st / 255 * 18;
    OUT.dim = lvl;
    if (pan >= 0 && tilt >= 0){ OUT.pan = (o.panBase || 0) + lerp(t.rng?.pan || [-270, 270], (pan * 256 + panF) / 65535); OUT.tilt = lerp(t.rng?.tilt || [-135, 135], (tilt * 256 + tiltF) / 65535); } else OUT.pan = undefined;
    OUT.zoom = zoom >= 0 ? lerp(t.zoom, zoom / 255) : undefined;
    /* iris, gobo, couteaux (personnalités génériques du logiciel) : gobo = plages égales, la première = ouvert ; orientation 0–127 = 0 à 360°, 128–190 rotation dans un sens (rapide → lente), 191–192 arrêt, 193–255 dans l'autre (lente → rapide) ;
       iris 0 = ouvert, 255 = fermé au plus serré ; couteau 0 = sorti, 255 = tout fermé ; angle 128 = droit, ± 45° */
    const NG = (ST.GOBOS || []).length || 1; OUT.gobo = X.gobo === undefined ? undefined : Math.min(NG - 1, Math.floor(X.gobo / 256 * NG));
    if (X.gobor === undefined){ OUT.gobor = OUT.gobos = undefined; } else if (X.gobor < 128){ OUT.gobor = X.gobor / 127 * 360; OUT.gobos = 0; } else { OUT.gobor = 0; OUT.gobos = X.gobor <= 190 ? -(191 - X.gobor) / 63 * 2 : X.gobor <= 192 ? 0 : (X.gobor - 192) / 63 * 2; }
    OUT.iris = X.iris === undefined ? undefined : 1 - X.iris / 255 * .85; OUT.focus = X.focus === undefined ? undefined : X.focus / 255;
    const NW = (ST.CWHEEL || []).length || 1, PZ = ST.PRISMS || [0]; OUT.cw = X.cw === undefined ? undefined : Math.min(NW - 1, Math.floor(X.cw / 256 * NW)); OUT.cto = X.cto === undefined ? undefined : X.cto / 255; OUT.prism = X.prism === undefined ? undefined : PZ[Math.min(PZ.length - 1, Math.floor(X.prism / 256 * PZ.length))];
    if (X.prismr === undefined){ OUT.prismr = OUT.prisms = undefined; } else if (X.prismr < 128){ OUT.prismr = X.prismr / 127 * 360; OUT.prisms = 0; } else { OUT.prismr = 0; OUT.prisms = X.prismr <= 190 ? -(191 - X.prismr) / 63 * 2 : X.prismr <= 192 ? 0 : (X.prismr - 192) / 63 * 2; }
    for (const b of ['b1', 'b2', 'b3', 'b4']){ OUT[b] = X[b] === undefined ? undefined : X[b] / 255; OUT[b + 'r'] = X[b + 'r'] === undefined ? undefined : (X[b + 'r'] - 128) / 127 * 45; }
    return OUT;
  }
  IN.read = read; IN.layout = layout; IN.universes = U;

  // ---------------------------------------------------------------- liaison avec la passerelle
  function apply(){ IN.on = P.on && D.state === 'ok'; A.store.set('dmx', P); for (const o of S.objs){ const r = ST.RT.get(o.id); if (r) r.dirty = true; } }
  function sendCfg(){ if (D.ws && D.ws.readyState === 1) D.ws.send(JSON.stringify({ t: 'cfg', sacn: P.sacn, artOff: +P.artOff })); }
  function connect(){
    if (!LOCAL) return; D.state = 'attente'; let ws; try { ws = new WebSocket('ws://' + location.host + '/dmx'); } catch (_){ D.state = 'erreur'; return; }
    ws.binaryType = 'arraybuffer'; D.ws = ws;
    ws.onopen = () => { D.state = 'ok'; sendCfg(); apply(); ST.toast('Passerelle DMX connectée.'); refresh(); };
    ws.onclose = () => { const was = D.state; D.state = 'erreur'; D.ws = null; apply(); if (was === 'ok') ST.toast('Passerelle DMX déconnectée.', true); refresh(); setTimeout(connect, 2500); };
    ws.onmessage = e => { if (typeof e.data === 'string'){ try { const m = JSON.parse(e.data); if (m.t === 'status'){ D.info = m; if ($('#dmxRoot')) status(); } } catch (_){} return; }
      const b = new Uint8Array(e.data); if (b[0] !== 1 || b.length < 516) return; const u = b[1] | b[2] << 8; let buf = U.get(u); if (!buf){ buf = new Uint8Array(512); U.set(u, buf); } buf.set(b.subarray(4, 516));
      let s = seen.get(u); if (!s){ s = { n: 0, t: performance.now(), fps: 0, proto: '' }; seen.set(u, s); } s.n++; s.proto = b[3] ? 'sACN' : 'Art-Net'; s.last = performance.now(); };
  }
  setInterval(() => { const now = performance.now(); for (const s of seen.values()){ s.fps = s.n * 1000 / Math.max(1, now - s.t); s.n = 0; s.t = now; } if ($('#dmxRoot')){ status(); monitor(); } }, 500);

  // ---------------------------------------------------------------- fenêtre « DMX / réseau »
  const lums = () => S.objs.filter(o => ST.typeOf(o).cat === 'lum').sort((a, b) => (a.uni - b.uni) || (a.addr - b.addr));
  function status(){
    const el = $('#dmxStatus'); if (!el) return; const i = D.info, now = performance.now();
    const us = [...seen.entries()].filter(([, s]) => now - s.last < 3000).sort((a, b) => a[0] - b[0]);
    el.innerHTML = !LOCAL ? '' : D.state !== 'ok' ? `<div class="info" style="border:1px solid #e5484d;color:#ffb4b4">Passerelle introuvable. Lance l'application avec « Lancer-Windows.bat » ou « Lancer-Mac.command » : c'est ce programme qui écoute le réseau.</div>`
      : `<div class="info" style="border:1px solid ${us.length ? '#3fb97a' : 'var(--line)'}">Passerelle connectée${i ? ` · Art-Net : port ${i.artnet.port}${i.artnet.ok ? '' : ' (indisponible : ' + esc(i.artnet.err || '') + ')'} · sACN : port ${i.sacn.port}${i.sacn.ok ? '' : ' (indisponible : ' + esc(i.sacn.err || '') + ')'}` : ''}<br>
        ${i && i.ifaces.length ? 'Adresses de ce poste : <b>' + i.ifaces.map(esc).join('</b>, <b>') + '</b><br>' : ''}
        ${i && i.sources.length ? 'Sources : ' + i.sources.map(s => `<b>${esc(s.ip)}</b> (${esc(s.proto)}${s.name ? ', ' + esc(s.name) : ''})`).join(' · ') : 'Aucune trame reçue pour l\'instant.'}<br>
        ${us.length ? 'Univers reçus : ' + us.map(([u, s]) => `<a data-du="${u}" style="cursor:pointer;text-decoration:underline${u === D.view ? ';color:var(--accent2)' : ''}">${u}</a> <span style="color:var(--mute)">(${s.proto}, ${Math.round(s.fps)} img/s)</span>`).join(' · ') : ''}</div>`;
  }
  function monitor(){
    const cv = $('#dmxCv'); if (!cv) return; const d = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== W * d){ cv.width = W * d; cv.height = H * d; }
    const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.fillStyle = '#0e0b1c'; c.fillRect(0, 0, W, H); const buf = U.get(D.view), cw = W / 32, ch = H / 16;
    const own = new Map(); for (const o of lums()) if ((o.uni || 1) === D.view && o.addr){ const n = (layout(ST.typeOf(o), o.mode || 0) || []).length || ST.modeCh(o); for (let k = 0; k < n; k++) own.set(o.addr - 1 + k, k === 0 ? o.n : -1); }
    c.font = '8px ui-monospace,Menlo,Consolas,monospace'; c.textBaseline = 'top';
    for (let i = 0; i < 512; i++){ const x = (i % 32) * cw, y = Math.floor(i / 32) * ch, v = buf ? buf[i] : 0;
      c.fillStyle = own.has(i) ? '#241d40' : '#151127'; c.fillRect(x + .5, y + .5, cw - 1, ch - 1); if (v){ c.fillStyle = `rgba(42,255,208,${.15 + .85 * v / 255})`; c.fillRect(x + .5, y + .5 + (ch - 1) * (1 - v / 255), cw - 1, (ch - 1) * v / 255); }
      if (own.get(i) > 0){ c.fillStyle = '#b78bff'; c.fillText(own.get(i), x + 2, y + 1); } }
    c.fillStyle = '#8a8d96'; c.textBaseline = 'bottom'; for (let r = 0; r < 16; r += 4) c.fillText(r * 32 + 1, 2, (r + 1) * ch - 1);
  }
  function render(){
    const rows = lums().map(o => { const t = ST.typeOf(o), lay = layout(t, o.mode || 0), n = ST.modeCh(o);
      return `<tr><td class="mono">${o.n ?? ''}</td><td>${esc(o.name || t.name)}</td><td>${esc((t.brand ? t.brand + ' ' : '') + t.name)}</td><td>${esc(t.modes[o.mode || 0]?.[0] || '')}</td><td class="mono">${o.addr ? ST.addrStr(o) : '—'}</td><td class="mono" style="text-align:right">${n}</td><td style="color:${lay ? 'var(--mute)' : '#f0a23c'};font-size:10.5px">${lay ? (lay.length ? lay.map((k, i) => `${i + 1} ${NAME[k] || k}`).join(' · ') : 'non pilotable') : 'canaux inconnus : importe le GDTF de l\'appareil'}</td></tr>`; }).join('');
    $('#modal').firstElementChild.innerHTML = `<div id="dmxRoot"><h1>DMX / réseau</h1>
      <div class="sub">Réception Art-Net et sACN : grandMA3 onPC, Avolites Titan, MadMapper ou toute autre source pilotent les projecteurs de la maquette, selon leur patch.</div>
      ${LOCAL ? '' : `<div class="info" style="border:1px solid #f0a23c;color:#ffd9a0">Cette page est la version en ligne : un navigateur n'a pas le droit d'écouter le réseau. Le pilotage DMX fonctionne dans la <b>version locale</b> (dossier à télécharger, PC et Mac), qui embarque la passerelle Art-Net / sACN. Le tableau ci-dessous sert déjà à préparer le patch dans la console.</div>`}
      <div id="dmxStatus"></div>
      ${LOCAL ? `<div class="rg-form" style="margin:8px 0"><label>Les consoles pilotent les projecteurs (sinon : réglages et mémoires de l'application)</label><input type="checkbox" data-dk="on" ${P.on ? 'checked' : ''}>
        <label>Univers sACN à écouter (ex. 1-4 ou 1;2;10)</label><input type="text" data-dk="sacn" value="${esc(P.sacn)}" style="width:110px">
        <label>Art-Net : l'univers 0 de la console correspond à l'univers</label><input type="number" data-dk="artOff" value="${P.artOff}" min="0" max="1" step="1" style="width:60px"></div>
      <h2>Moniteur — univers ${D.view}</h2><canvas id="dmxCv" style="width:100%;height:230px;display:block;border:1px solid var(--line);border-radius:8px"></canvas>
      <div class="sub">Cases bleutées : canaux occupés par un projecteur de la maquette (son numéro est indiqué sur le premier canal).</div>` : ''}
      <h2>Patch à reproduire dans la console</h2>
      <div class="sub">Patch chaque appareil à la même adresse, avec le même mode. Pour un appareil réel, importe son fichier GDTF (Fichier → Importer) : ses canaux sont alors repris tels quels. Les lyres ont leur tilt à 50 % tête dans l'axe, et leur pan à 50 % vers le public.</div>
      <div style="max-height:38vh;overflow:auto"><table class="t"><tr><th>N°</th><th>Nom</th><th>Appareil</th><th>Mode</th><th>Adresse</th><th style="text-align:right">Canaux</th><th>Affectation</th></tr>${rows || '<tr><td colspan="7">Aucun projecteur dans le projet.</td></tr>'}</table></div>
      <div class="btns"><button class="b" data-a="xpatch">Exporter le patch (CSV)</button><button class="b" data-a="xmvr">Exporter en MVR (grandMA3)</button><button class="b on" data-a="close">Fermer</button></div></div>`;
    status(); monitor();
  }
  const refresh = () => { if ($('#dmxRoot')) render(); };
  function open(){ ST.modal('<div id="dmxRoot"></div>'); $('#modal').firstElementChild.style.width = 'min(1080px,96vw)'; render(); }
  const box = $('#modal').firstElementChild;
  box.addEventListener('click', e => { const a = e.target.closest('[data-du]'); if (a && $('#dmxRoot')){ D.view = +a.dataset.du; render(); } });
  box.addEventListener('change', e => { const el = e.target, k = el.dataset.dk; if (!k || !$('#dmxRoot')) return; P[k] = el.type === 'checkbox' ? el.checked : k === 'artOff' ? Math.max(0, Math.min(1, +el.value || 0)) : el.value; apply(); sendCfg(); });
  window.DMX = { open, read, layout, GEN, U, D, P, LOCAL, inject: (u, arr) => { let b = U.get(u); if (!b){ b = new Uint8Array(512); U.set(u, b); } b.set(arr); }, force: on => { D.state = on ? 'ok' : 'erreur'; apply(); } };
  connect();
}
