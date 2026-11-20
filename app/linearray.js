// Line array : mécanique (boîtes, angles, poids, point d'accroche) et couverture en coupe (visée de chaque boîte).
// Données : celles que publient les fabricants (la-data.js). Ce module ne remplace pas le logiciel de prédiction du fabricant
// (Soundvision, ArrayCalc, LAC…), qui seul donne les limites mécaniques du cadre et le niveau réel.
// Modèle géométrique, écrit dans le dialogue : les boîtes s'articulent sur leur arête avant, le centre de gravité de chaque boîte est pris en son milieu.
import { LA_LIB, LA_FREE } from './la-data.js';
export function initLineArray(A, ST){
  const S = ST.S, esc = ST.esc, $ = s => document.querySelector(s), D2R = Math.PI / 180;
  const f = (v, d = 1) => (+v).toFixed(d).replace('.', ','), num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; }, uid = () => 'la' + Math.random().toString(36).slice(2, 9);
  const arrays = () => S.arrays || (S.arrays = []);
  const modelOf = a => { const m = LA_LIB.find(x => x.id === a.model); return m || { ...LA_FREE, ...(a.free || {}) }; };
  let cur = null;
  const fresh = () => { const v = A.venue || {}, n = arrays().length; return { id: uid(), name: n % 2 ? 'Line array cour' : 'Line array jardin', model: 'kara2', n: 8, splays: Array(7).fill(1), site: 0, topY: 7, x: n % 2 ? 6 : -6, z: -.5, yaw: 0, frameKg: null, extraKg: 0, pick: 1, pa: 0, pb: 500, aud: { x0: 4, x1: 30, ear: 1.2, f0: 0, f1: 0 }, objs: [] }; };

  // ---------------------------------------------------------------- calcul
  // repère de la coupe : u = distance horizontale vers le public depuis l'arête avant-haut de la première boîte, v = hauteur
  function solve(a){ const m = modelOf(a), h = m.h / 1000, d = m.d / 1000, n = Math.max(1, Math.min(24, Math.round(a.n))), boxes = []; let th = a.site || 0, F = [0, a.topY];
    const au = a.aud, e0 = au.f0 + au.ear, e1 = au.f1 + au.ear, hit = (M, an) => { const dx = Math.cos(an * D2R), dy = -Math.sin(an * D2R), sx = au.x1 - au.x0, sy = e1 - e0, den = dx * sy - dy * sx; if (Math.abs(den) < 1e-9) return null; const t = ((au.x0 - M[0]) * sy - (e0 - M[1]) * sx) / den, k = ((au.x0 - M[0]) * dy - (e0 - M[1]) * dx) / den; return t > 0 ? { u: M[0] + dx * t, v: M[1] + dy * t, k, t } : null; };
    for (let i = 0; i < n; i++){ if (i) th += +a.splays[i - 1] || 0; const ax = [Math.cos(th * D2R), -Math.sin(th * D2R)], fc = [-Math.sin(th * D2R), -Math.cos(th * D2R)], M = [F[0] + fc[0] * h / 2, F[1] + fc[1] * h / 2], C = [M[0] - ax[0] * d / 2, M[1] - ax[1] * d / 2], hi = hit(M, th);
      boxes.push({ i, th, F: [...F], M, C, ax, fc, hit: hi, splay: i ? +a.splays[i - 1] || 0 : null }); F = [F[0] + fc[0] * h, F[1] + fc[1] * h]; }
    const kgBox = m.kg, frameKg = a.frameKg ?? m.frame.kg, known = kgBox != null, W = known ? n * kgBox + (frameKg || 0) + (+a.extraKg || 0) : null;
    // centre de gravité : boîtes en leur milieu ; cadre et câbles comptés à l'aplomb du milieu de la première boîte (hypothèse)
    let cg = null; if (known){ const mu = boxes.reduce((s, b) => s + kgBox * b.C[0], 0) + ((frameKg || 0) + (+a.extraKg || 0)) * boxes[0].C[0]; cg = mu / W; }
    const mech = { W, frameKg, kgBox, cg, boxesKg: known ? n * kgBox : null, bottom: F[1], depth: Math.min(...boxes.map(b => b.C[0] - d / 2)) };
    if (cg != null){ mech.single = -cg;                                   // distance en arrière de la face avant où pendre la ligne pour qu'elle prenne seule l'angle voulu
      if (a.pick === 2){ const uf = -(a.pa || 0) / 1000, ur = -(a.pb || 0) / 1000; if (Math.abs(uf - ur) > .01){ mech.Rf = W * (cg - ur) / (uf - ur); mech.Rr = W - mech.Rf; } } }
    return { m, n, boxes, mech, e0, e1 }; }
  // choisit les angles pour que les visées se répartissent du fond vers l'avant du public (distances en progression géométrique)
  function autoAim(a){ const m = modelOf(a), n = a.n, au = a.aud, h = m.h / 1000; a.site = Math.ceil(Math.atan2(a.topY - h / 2 - (au.f1 + au.ear), au.x1 - .3) / D2R * 2) / 2; a.splays = Array(Math.max(0, n - 1)).fill(0);
    const allowed = m.angles || Array.from({ length: Math.round(12 / (m.step || 1)) + 1 }, (_, k) => k * (m.step || 1)), r = Math.pow(Math.max(.05, au.x0 / au.x1), 1 / Math.max(1, n - 1));
    for (let i = 1; i < n; i++){ const target = au.x1 * Math.pow(r, i); let best = allowed[0], bd = 1e9; for (const s of allowed){ a.splays[i - 1] = s; const b = solve(a).boxes[i], d = b.hit ? Math.abs(b.hit.u - target) + (b.hit.u < au.x0 ? 1e3 : 0) : 1e6; if (d < bd - 1e-9){ bd = d; best = s; } } a.splays[i - 1] = best; } }

  // ---------------------------------------------------------------- dessin de la coupe
  function svg(a, R){ const m = R.m, h = m.h / 1000, d = m.d / 1000, au = a.aud, x0 = Math.min(-d - 1, R.mech.depth - .5), x1 = Math.max(au.x1 + 2, 6), y1 = a.topY + 1.5, y0 = Math.min(au.f0, au.f1, 0) - .8, W = 900, H = Math.max(240, Math.min(420, W * (y1 - y0) / (x1 - x0))), k = Math.min(W / (x1 - x0), H / (y1 - y0)), X = u => (u - x0) * k, Y = v => (y1 - v) * k;
    let o = `<svg viewBox="0 0 ${W} ${((y1 - y0) * k).toFixed(0)}" style="width:100%;background:#15171c;border:1px solid var(--line);border-radius:8px;font:10px ui-monospace,Menlo,monospace">`;
    for (let g = Math.ceil(x0 / 5) * 5; g <= x1; g += 5) o += `<line x1="${X(g)}" x2="${X(g)}" y1="0" y2="${Y(y0)}" stroke="#262a33"/><text x="${X(g) + 2}" y="${Y(y0) - 3}" fill="#6e7787">${g} m</text>`;
    for (let g = 0; g <= y1; g += 2) o += `<line x1="0" x2="${W}" y1="${Y(g)}" y2="${Y(g)}" stroke="#262a33"/><text x="2" y="${Y(g) - 2}" fill="#6e7787">${g}</text>`;
    o += `<polyline points="${X(x0)},${Y(0)} ${X(Math.min(0, au.x0))},${Y(0)} ${X(au.x0)},${Y(au.f0)} ${X(au.x1)},${Y(au.f1)} ${X(x1)},${Y(au.f1)}" fill="none" stroke="#6e7787" stroke-width="1.5"/><line x1="${X(au.x0)}" y1="${Y(R.e0)}" x2="${X(au.x1)}" y2="${Y(R.e1)}" stroke="#3fb97a" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${X(au.x1) - 4}" y="${Y(R.e1) - 5}" fill="#3fb97a" text-anchor="end">oreilles du public</text>`;
    for (const b of R.boxes){ const vd = m.vd, c = b.hit && b.hit.k >= -.001 && b.hit.k <= 1.001 ? '#f2a93b' : '#e5484d';
      if (vd) for (const s of [-1, 1]){ const an = (b.th + s * vd / 2) * D2R; o += `<line x1="${X(b.M[0])}" y1="${Y(b.M[1])}" x2="${X(b.M[0] + Math.cos(an) * 60)}" y2="${Y(b.M[1] - Math.sin(an) * 60)}" stroke="rgba(242,169,59,.13)"/>`; }
      const end = b.hit ? [b.hit.u, b.hit.v] : [b.M[0] + b.ax[0] * 80, b.M[1] + b.ax[1] * 80]; o += `<line x1="${X(b.M[0])}" y1="${Y(b.M[1])}" x2="${X(end[0])}" y2="${Y(end[1])}" stroke="${c}" stroke-width=".9" stroke-opacity=".8"/>${b.hit ? `<circle cx="${X(end[0])}" cy="${Y(end[1])}" r="2.6" fill="${c}"/>` : ''}`;
      const P4 = [b.F, [b.F[0] + b.fc[0] * h, b.F[1] + b.fc[1] * h], [b.F[0] + b.fc[0] * h - b.ax[0] * d, b.F[1] + b.fc[1] * h - b.ax[1] * d], [b.F[0] - b.ax[0] * d, b.F[1] - b.ax[1] * d]]; o += `<polygon points="${P4.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}" fill="#2d323c" stroke="#c6cad2" stroke-width="1"/>`; }
    if (R.mech.cg != null) o += `<line x1="${X(R.mech.cg)}" x2="${X(R.mech.cg)}" y1="${Y(a.topY + 1.2)}" y2="${Y(R.mech.bottom - .3)}" stroke="#8fb4ff" stroke-dasharray="3 3"/><text x="${X(R.mech.cg) + 3}" y="${Y(a.topY + 1.05)}" fill="#8fb4ff">centre de gravité</text>`;
    return o + '</svg>'; }

  // ---------------------------------------------------------------- dialogue
  function draw(){ const a = cur, m = modelOf(a), R = solve(a), M = R.mech, au = a.aud, ni = (k, v, step = 'any', ph = '') => `<input type="number" step="${step}" data-la="${k}" value="${v ?? ''}" placeholder="${ph}">`;
    const angSel = i => m.angles ? `<select data-la="sp" data-i="${i}">${[...new Set([...m.angles, +a.splays[i] || 0])].sort((p, q) => p - q).map(v => `<option value="${v}"${v === (+a.splays[i] || 0) ? ' selected' : ''}>${f(v, v % 1 ? 2 : 0).replace(/,?0+$/, '')}°${m.angles.includes(v) ? '' : ' (hors liste)'}</option>`).join('')}</select>` : `<input type="number" min="0" step="${m.step || .5}" data-la="sp" data-i="${i}" value="${+a.splays[i] || 0}" style="width:60px">`;
    const inA = b => b.hit && b.hit.k >= -.001 && b.hit.k <= 1.001, hits = R.boxes.filter(inA), over = R.boxes.filter(b => !b.hit || b.hit.k > 1.001).length, short = R.boxes.filter(b => b.hit && b.hit.k < -.001).length;
    const rows = R.boxes.map(b => `<tr><td class="mono">${b.i + 1}</td><td>${b.i ? angSel(b.i - 1) : '<span style="color:var(--mute)">cadre</span>'}</td><td class="mono r">${f(b.th, 1)}°</td><td class="mono r">${f(b.M[1], 2)} m</td><td class="mono r" style="color:${inA(b) ? 'inherit' : '#ff8f8f'}">${b.hit ? f(b.hit.u, 1) + ' m' : 'au-dessus'}${b.hit && b.hit.k > 1.001 ? ' (derrière le public)' : b.hit && b.hit.k < -.001 ? ' (devant le public)' : ''}</td><td class="mono r">${b.hit ? f(b.hit.t, 1) + ' m' : '—'}</td></tr>`).join('');
    const single = M.single, warn = [];
    if (M.W == null) warn.push('Poids d\'une boîte inconnu : saisis-le pour obtenir le poids et le point d\'accroche.');
    if (M.frameKg == null) warn.push(`Poids du cadre (${m.frame.name}) non relevé : il n'est pas compté. Saisis-le d'après le fabricant.`);
    if (over) warn.push(`${over} boîte(s) visent au-delà du dernier rang ou au-dessus du public.`); if (short) warn.push(`${short} boîte(s) visent devant le premier rang.`);
    if (single != null && a.pick === 1 && (single < 0 || single > m.d / 1000)) warn.push(`Avec un seul point, la ligne ne tient cet angle que si le point est à ${f(single * 100, 0)} cm en arrière de la face avant : hors de la profondeur d'une boîte. Il faut un second point (ou une barre d'extension).`);
    if (a.pick === 2 && M.Rf != null && (M.Rf < 0 || M.Rr < 0)) warn.push(`Le point ${M.Rf < 0 ? 'avant' : 'arrière'} se détend : cet angle n'est pas tenable avec ces deux points. Écarte-les ou change l'inclinaison.`);
    if (R.mech.bottom < 2.2 && R.mech.bottom > -50) warn.push(`Le bas de la ligne est à ${f(R.mech.bottom, 2)} m du sol.`);
    ST.modal(`<div style="display:flex;gap:10px;align-items:center"><h1 style="margin:0;flex:1">Line array</h1><select data-la="which">${arrays().map(x => `<option value="${x.id}"${x.id === a.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}${arrays().includes(a) ? '' : `<option selected>${esc(a.name)} (nouveau)</option>`}</select><button class="b" data-lb="new">Nouveau</button>${arrays().includes(a) ? '<button class="b" data-lb="mirror" title="Copie symétrique par rapport à l\'axe">Symétrique</button><button class="b" data-lb="del">Supprimer</button>' : ''}</div>
      <div class="sub">Boîtes, angles, poids, point d'accroche, et où vise chaque boîte en coupe. Données du fabricant ; le logiciel de prédiction du fabricant reste la référence pour les limites mécaniques et le niveau.</div>
      <div style="display:grid;grid-template-columns:minmax(280px,340px) 1fr;gap:16px;align-items:start"><div>
        <div class="pf pfw"><label>Nom</label><input type="text" data-la="name" value="${esc(a.name)}"><label>Modèle</label><select data-la="model">${LA_LIB.map(x => `<option value="${x.id}"${x.id === a.model ? ' selected' : ''}>${esc(x.maker + ' ' + x.name)}</option>`).join('')}<option value="libre"${a.model === 'libre' ? ' selected' : ''}>Modèle libre…</option></select>
          ${a.model === 'libre' ? `<label>Poids d'une boîte (kg)</label>${ni('f_kg', a.free?.kg, .1, 'inconnu')}<label>Hauteur d'une boîte (mm)</label>${ni('f_h', m.h, 1)}<label>Profondeur (mm)</label>${ni('f_d', m.d, 1)}<label>Largeur (mm)</label>${ni('f_w', m.w, 1)}<label>Ouverture verticale d'une boîte (°)</label>${ni('f_vd', a.free?.vd, .5, 'inconnue')}` : ''}
          <label>Nombre de boîtes</label>${ni('n', a.n, 1)}<label>Inclinaison de la première boîte (° vers le bas)</label>${ni('site', a.site, .5)}<label>Haut de la ligne (m)</label>${ni('topY', a.topY, .1)}
          <label>Poids du cadre ${esc(m.frame.name)} (kg)</label>${ni('frameKg', a.frameKg ?? m.frame.kg, .1, 'inconnu')}<label>Câbles et accessoires (kg)</label>${ni('extraKg', a.extraKg || '', .5, '0')}
          <label>Accroche</label><select data-la="pick"><option value="1"${a.pick === 1 ? ' selected' : ''}>Un point</option><option value="2"${a.pick === 2 ? ' selected' : ''}>Deux points (avant, arrière)</option></select>
          ${a.pick === 2 ? `<label>Point avant : en arrière de la face (mm)</label>${ni('pa', a.pa, 10)}<label>Point arrière : en arrière de la face (mm)</label>${ni('pb', a.pb, 10)}` : ''}</div>
        <h2>Public (en coupe)</h2><div class="pf pfw"><label>Premier rang : distance (m)</label>${ni('x0', au.x0, .5)}<label>Dernier rang : distance (m)</label>${ni('x1', au.x1, .5)}<label>Hauteur d'oreille</label><select data-la="ear"><option value="1.2"${au.ear === 1.2 ? ' selected' : ''}>Assis, 1,2 m</option><option value="1.7"${au.ear === 1.7 ? ' selected' : ''}>Debout, 1,7 m</option></select><label>Sol au premier rang (m)</label>${ni('f0', au.f0, .1)}<label>Sol au dernier rang (m)</label>${ni('f1', au.f1, .1)}</div>
        <h2>Position dans la scène</h2><div class="pf pfw"><label>X (cour +)</label>${ni('x', a.x, .1)}<label>Z (public +)</label>${ni('z', a.z, .1)}<label>Orientation (°, 0 = face au public)</label>${ni('yaw', a.yaw, 1)}</div>
        <div class="info">${esc(m.maker + ' ' + m.name)} : ${m.kg != null ? f(m.kg, 1) + ' kg' : 'poids inconnu'} · ${m.w} × ${m.h} × ${m.d} mm · ${m.hdNote || m.hd + '°'} horizontal · ${m.vd ? m.vd + '° vertical par boîte' : 'ouverture verticale par boîte non publiée'}${m.spl ? ' · ' + m.spl + ' dB max' : ''}.<br>Source : ${esc(m.source)}${m.checked ? ', relevé le ' + m.checked.split('-').reverse().join('.') : ''}.</div></div>
      <div>${svg(a, R)}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:8px 0">
          <div class="info" style="margin:0"><b>Poids</b><br>${M.W != null ? `<span style="font-size:18px">${f(M.W, 0)} kg</span><br>${R.n} × ${f(M.kgBox, 1)} kg${M.frameKg ? ' + cadre ' + f(M.frameKg, 1) : M.frameKg == null ? ' · cadre non compté' : ''}${a.extraKg ? ' + ' + f(a.extraKg, 1) : ''}` : 'inconnu'}</div>
          <div class="info" style="margin:0"><b>Hauteur de la ligne</b><br><span style="font-size:18px">${f(a.topY - M.bottom, 2)} m</span><br>bas à ${f(M.bottom, 2)} m du sol</div>
          <div class="info" style="margin:0"><b>${a.pick === 2 ? 'Charge par point' : 'Point d\'accroche'}</b><br>${M.W == null ? 'inconnu' : a.pick === 2 ? (M.Rf != null ? `<span style="font-size:15px">avant ${f(M.Rf, 0)} kg · arrière ${f(M.Rr, 0)} kg</span>` : 'points confondus') : `<span style="font-size:18px">${f(single * 100, 0)} cm</span><br>en arrière de la face avant`}</div>
          <div class="info" style="margin:0"><b>Visée</b><br>${hits.length ? `<span style="font-size:15px">de ${f(Math.min(...hits.map(b => b.hit.u)), 1)} à ${f(Math.max(...hits.map(b => b.hit.u)), 1)} m</span><br>${hits.length} boîte(s) sur ${R.n} dans le public` : 'aucune boîte ne vise le public'}</div></div>
        ${warn.length ? `<div class="info" style="border:1px solid #f0a23c">${warn.map(esc).join('<br>')}</div>` : ''}
        <div class="btns" style="justify-content:flex-start"><button class="b on" data-lb="auto" title="Incline la première boîte vers le dernier rang, puis choisit les angles pour répartir les visées jusqu'au premier rang">Viser automatiquement</button><button class="b" data-lb="all0">Tout à 0°</button></div>
        <table class="t pa-t" style="width:100%"><tr><th>Boîte</th><th>Angle avec la précédente</th><th class="r">Inclinaison</th><th class="r">Hauteur</th><th class="r">Vise à</th><th class="r">Portée</th></tr>${rows}</table>
        <div class="sub">Modèle : articulation sur l'arête avant des boîtes, centre de gravité de chaque boîte en son milieu, cadre et câbles à l'aplomb de la première boîte. La visée est l'axe de chaque boîte ; elle ne dit rien du niveau ni de la réponse en fréquence. La charge admissible du cadre pour cette configuration se lit dans la notice ou le logiciel du fabricant : elle n'est pas vérifiée ici.</div></div></div>
      <div class="btns"><button class="b" data-lb="load" title="Ajoute le poids de la ligne comme charge ponctuelle sur le pont le plus proche, au-dessus">Charger le pont le plus proche</button><span style="flex:1"></span><button class="b" data-a="close">Fermer</button><button class="b on" data-lb="place">${a.objs && a.objs.some(id => ST.byId(id)) ? 'Mettre à jour dans la scène' : 'Poser dans la scène'}</button></div>`);
    $('#modal').firstElementChild.style.width = 'min(1180px,96vw)'; }
  function open(id){ cur = arrays().find(x => x.id === id) || cur && arrays().includes(cur) && cur || arrays()[0] || fresh(); if (!arrays().includes(cur) && !cur.auto){ cur.auto = 1; autoAim(cur); } draw(); }
  const keep = () => { if (!arrays().includes(cur)){ ST.pushUndo(0, 'Line array'); delete cur.auto; arrays().push(cur); } else ST.pushUndo('la' + cur.id, 'Régler le line array'); };
  function setN(a, n){ n = Math.max(1, Math.min(24, Math.round(n || 1))); const last = a.splays[a.splays.length - 1] ?? 0; a.n = n; a.splays = Array.from({ length: n - 1 }, (_, i) => a.splays[i] ?? last); }
  document.addEventListener('change', e => { const el = e.target, k = el.dataset && el.dataset.la; if (!k || !cur) return; e.stopPropagation(); const v = num(el.value), a = cur;
    if (k === 'which'){ const x = arrays().find(q => q.id === el.value); if (x) cur = x; return draw(); }
    keep();
    if (k === 'name') a.name = el.value || a.name; else if (k === 'model'){ a.model = el.value; if (a.model === 'libre') a.free = a.free || {}; a.frameKg = null; const m = modelOf(a); if (m.angles) a.splays = a.splays.map(s => m.angles.reduce((b, x) => Math.abs(x - s) < Math.abs(b - s) ? x : b, m.angles[0])); }
    else if (k === 'n') setN(a, v); else if (k === 'sp') a.splays[+el.dataset.i] = Math.max(0, v || 0); else if (k === 'pick') a.pick = +el.value === 2 ? 2 : 1; else if (k === 'ear') a.aud.ear = +el.value;
    else if (['x0', 'x1', 'f0', 'f1'].includes(k)){ if (v != null) a.aud[k] = v; if (a.aud.x1 < a.aud.x0 + 1) a.aud.x1 = a.aud.x0 + 1; } else if (k === 'frameKg') a.frameKg = v != null && v >= 0 ? v : null; else if (k.startsWith('f_')){ a.free = a.free || {}; const kk = k.slice(2); if (v == null || v <= 0) delete a.free[kk]; else a.free[kk] = v; }
    else if (v != null) a[k] = v;
    ST.touch(true); draw(); }, true);
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lb]'); if (!b || !cur) return; const k = b.dataset.lb, a = cur;
    if (k === 'new'){ cur = fresh(); cur.auto = 1; autoAim(cur); return draw(); }
    if (k === 'del'){ ST.pushUndo(0, 'Supprimer ' + a.name); const ids = new Set(a.objs || []); for (const id of ids) ST.unbuild(id); S.objs = S.objs.filter(o => !ids.has(o.id)); S.arrays = arrays().filter(x => x !== a); cur = arrays()[0] || fresh(); ST.touch(); ST.select([]); return draw(); }
    if (k === 'mirror'){ ST.pushUndo(0, 'Line array symétrique'); const c = JSON.parse(JSON.stringify(a)); c.id = uid(); c.x = -a.x; c.yaw = -a.yaw; c.objs = []; c.name = /jardin/i.test(a.name) ? a.name.replace(/jardin/i, 'cour') : /cour/i.test(a.name) ? a.name.replace(/cour/i, 'jardin') : a.name + ' (symétrique)'; arrays().push(c); cur = c; place(c, true); return draw(); }
    keep();
    if (k === 'auto') autoAim(a); else if (k === 'all0') a.splays = a.splays.map(() => 0); else if (k === 'place') return place(a); else if (k === 'load') return loadPont(a);
    ST.touch(true); draw(); });
  // pose (ou remet à jour) une boîte par objet, à sa place et à son angle : elles entrent dans la carte de niveau, la liste de matériel et le poids accroché
  function place(a, quiet){ const R = solve(a), m = R.m, tid = 'lab-' + (LA_LIB.some(x => x.id === a.model) ? a.model : 'libre'), t = ST.LIBALL().find(x => x.id === tid), yw = a.yaw * D2R, old = (a.objs || []).map(id => ST.byId(id)).filter(Boolean);
    for (const o of old.slice(R.n)) ST.unbuild(o.id); const gone = new Set(old.slice(R.n).map(o => o.id)); S.objs = S.objs.filter(o => !gone.has(o.id)); a.objs = [];
    R.boxes.forEach((b, i) => { let o = old[i]; if (!o){ o = { ...ST.defaults(t), n: ST.nextNum('son') }; S.objs.push(o); } else ST.unbuild(o.id);
      Object.assign(o, { type: tid, name: `${a.name} ${i + 1}`, grp: a.name, hang: 'fixe', pos: [+(a.x + Math.sin(yw) * b.C[0]).toFixed(3), +b.C[1].toFixed(3), +(a.z + Math.cos(yw) * b.C[0]).toFixed(3)], pan: a.yaw, tilt: 90 - b.th, size: [m.w / 1000, m.h / 1000, m.d / 1000] }); if (m.kg != null) o.w = m.kg; else delete o.w; delete o.sid; delete o.pi; ST.build(o); a.objs.push(o.id); });
    ST.touch(); if (!quiet){ $('#modal').style.display = 'none'; ST.select(a.objs); ST.toast(`${a.name} : ${R.n} boîtes posées${R.mech.W != null ? ', ' + f(R.mech.W, 0) + ' kg' : ''}. Accroche fixe : ajoute sa charge au pont avec « Charger le pont le plus proche ».`); } }
  function loadPont(a){ const PT = window.PONTS, R = solve(a); if (!PT || !(S.sups || []).some(s => s.kind === 'truss')) return ST.toast('Aucun pont dans le projet : trace d\'abord le pont qui porte la ligne.', true); if (R.mech.W == null) return ST.toast('Poids inconnu : rien à ajouter.', true);
    let best = null, bd = 1e9; for (const s of S.sups){ if (s.kind !== 'truss') continue; const q = PT.proj(s, a.x, a.z); if (q.d < bd){ bd = q.d; best = [s, q]; } } const [s, q] = best;
    s.loads = (s.loads || []).filter(l => l.la !== a.id); s.loads.push({ id: uid(), la: a.id, name: a.name, alongMm: Math.round(q.along), kg: Math.round(R.mech.W * 10) / 10, lengthMm: 0 }); PT.build(s); ST.touch(); draw();
    ST.toast(`${f(R.mech.W, 0)} kg ajoutés sur ${s.name} à ${f(q.along / 1000, 2)} m${bd > 1 ? ` (le pont est à ${f(bd, 1)} m de la ligne en plan)` : ''}.${R.mech.frameKg == null ? ' Poids du cadre non compté.' : ''}`, bd > 1 || R.mech.frameKg == null); }
  window.LARRAY = { open, solve, autoAim, place, fresh, arrays, modelOf, LA_LIB, get cur(){ return cur; }, set cur(v){ cur = v; } };
}
