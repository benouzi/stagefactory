// Line array (ligne d'enceintes) : composition, mécanique, couverture géométrique. Inspiré de l'outil « Speaker Array » de Vectorworks Spotlight.
// Données : celles que publient les fabricants (la-data.js) ou celles que l'utilisateur saisit ; une valeur inconnue reste null (affichée « inconnu », jamais inventée).
// Ce module ne remplace pas le logiciel de prédiction du fabricant (Soundvision, ArrayCalc, LAC…) : lui seul donne les limites mécaniques du cadre et le niveau réel.
// La couverture dessinée ici est de la GÉOMÉTRIE (ouvertures nominales, portée, hauteur d'écoute), pas un niveau sonore.
//
// Une ligne (S.arrays[i]) :
//   model / free      modèle des boîtes « A » ; types.B, types.C : deux autres modèles possibles ({ model, free }) ; kinds[i] = 'A' | 'B' | 'C' pour la boîte i
//   n, splays[i]      nombre de boîtes ; angle entre la boîte i+1 et la précédente
//   support           'flown' suspendu (boîtes sous le cadre, liste du haut vers le bas) · 'ground' posé au sol (cadre en socle, liste du bas vers le haut) · 'tripod' sur pied (pas de cadre)
//   site              angle du cadre = inclinaison de la première boîte (° vers le bas) ; shift : décalage de la première boîte sous le cadre (mm, + vers l'arrière)
//   topY | baseY | tripodH   hauteur du haut de la ligne (suspendu), du socle (au sol), du haut du pied
//   frameKg, bump{ name, w, d, th }, ext{ on, len, kg, shift }, pick 1|2, pa, pb, extraKg   cadre, barre d'extension, points moteurs
//   aud{ x0, x1, f0, f1, ear }, throw, vdArr, show{ lines, hatch }                          public en coupe, portée, dispersion
//   meta{ col, loc, role, rack, drive, note } ; x, z, yaw ; sid (pont porteur) ; objs (objets 3D posés : le cadre puis les boîtes)
// Modèle géométrique : les boîtes s'articulent sur leur arête avant, le centre de gravité de chaque boîte est pris en son milieu, le cadre en son milieu.
import { LA_LIB, LA_FREE } from './la-data.js';
export function initLineArray(A, ST){
  const S = ST.S, UI = ST.UI, esc = ST.esc, $ = s => document.querySelector(s), D2R = Math.PI / 180;
  const f = (v, d = 1) => (+v).toFixed(d).replace('.', ','), num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; }, uid = () => 'la' + Math.random().toString(36).slice(2, 9);
  const arrays = () => S.arrays || (S.arrays = []);
  // ---------------------------------------------------------------- modèles : fabricants, les miens, libre
  const USER = Object.assign({ boxes: [], bumps: [] }, A.store.get('laUser', null) || {}), saveUser = () => A.store.set('laUser', USER);
  const mById = (id, free) => { const m = LA_LIB.find(x => x.id === id); if (m) return m; const u = id && id.startsWith('u:') ? USER.boxes.find(x => x.id === id) : null; return { ...LA_FREE, hd: null, vd: null, ...(u || {}), ...(free || {}), id: id || 'libre', frame: LA_FREE.frame }; };          /* modèle saisi : une ouverture non saisie reste inconnue (pas d'empreinte tracée) */
  const modelOf = a => mById(a.model, a.free);
  const typeM = (a, k) => k === 'A' || !k ? modelOf(a) : a.types && a.types[k] && a.types[k].model ? mById(a.types[k].model, a.types[k].free) : null;
  const kindOf = (a, i) => { const k = a.kinds && a.kinds[i]; return k && k !== 'A' && typeM(a, k) ? k : 'A'; };
  const sup = a => a.support === 'ground' || a.support === 'tripod' ? a.support : 'flown';
  let cur = null, tab = 'array';
  const fresh = () => { const n = arrays().length; return { id: uid(), name: n % 2 ? 'Line array cour' : 'Line array jardin', model: 'kara2', n: 8, splays: Array(7).fill(1), site: 0, topY: 7, x: n % 2 ? 6 : -6, z: -.5, yaw: 0, frameKg: null, extraKg: 0, pick: 1, pa: 0, pb: 500, aud: { x0: 4, x1: 30, ear: 1.2, f0: 0, f1: 0 }, objs: [] }; };
  const bumpOf = a => { const m = modelOf(a), b = a.bump || {}; return { name: b.name || m.frame.name, w: (b.w ?? m.w) / 1000, d: (b.d ?? m.d) / 1000, th: (b.th ?? 100) / 1000 }; };

  // ---------------------------------------------------------------- calcul
  // repère de la coupe : u = distance horizontale vers le public depuis l'arête avant de la première boîte, v = hauteur
  function solve(a){
    const m = modelOf(a), n = Math.max(1, Math.min(24, Math.round(a.n))), mode = sup(a), up = mode !== 'flown', boxes = [], B = bumpOf(a);
    const au = a.aud, e0 = au.f0 + au.ear, e1 = au.f1 + au.ear, thr = a.throw > 0 ? a.throw : null;
    const hit = (M, an) => { const dx = Math.cos(an * D2R), dy = -Math.sin(an * D2R), sx = au.x1 - au.x0, sy = e1 - e0, den = dx * sy - dy * sx; if (Math.abs(den) < 1e-9) return null; const t = ((au.x0 - M[0]) * sy - (e0 - M[1]) * sx) / den, k = ((au.x0 - M[0]) * dy - (e0 - M[1]) * dx) / den; return t > 0 ? { u: M[0] + dx * t, v: M[1] + dy * t, k, t, far: thr != null && t > thr } : null; };
    let th = a.site || 0, F = [0, mode === 'flown' ? a.topY : mode === 'ground' ? (a.baseY || 0) + B.th : (a.tripodH ?? 1.8)];
    for (let i = 0; i < n; i++){
      const k = kindOf(a, i), mi = typeM(a, k) || m, h = mi.h / 1000, d = mi.d / 1000, sp = i ? +a.splays[i - 1] || 0 : null;
      if (i) th += up ? -sp : sp;
      const ax = [Math.cos(th * D2R), -Math.sin(th * D2R)], fc = up ? [Math.sin(th * D2R), Math.cos(th * D2R)] : [-Math.sin(th * D2R), -Math.cos(th * D2R)];
      const M = [F[0] + fc[0] * h / 2, F[1] + fc[1] * h / 2], C = [M[0] - ax[0] * d / 2, M[1] - ax[1] * d / 2];
      boxes.push({ i, k, m: mi, h, d, th, F: [...F], M, C, ax, fc, hit: hit(M, th), splay: sp, kg: mi.kg });
      F = [F[0] + fc[0] * h, F[1] + fc[1] * h];
    }
    // ouverture verticale de chaque boîte : celle du fabricant, sinon (ou si demandé) déduite des angles avec ses voisines
    boxes.forEach((b, i) => { const prev = i ? boxes[i].splay : (boxes[1] ? boxes[1].splay : 0), next = boxes[i + 1] ? boxes[i + 1].splay : boxes[i].splay ?? 0, vd = b.m.vd; b.fromAngles = a.vdArr || !vd; const a0 = b.fromAngles ? (prev || 0) / 2 : vd / 2, a1 = b.fromAngles ? (next || 0) / 2 : vd / 2; b.hi = b.th - (up ? a1 : a0); b.lo = b.th + (up ? a0 : a1); });
    // cadre : posé sur l'arête de la première boîte, décalé de « shift » ; barre d'extension par-dessus
    const ax0 = boxes[0].ax, sh = (a.shift || 0) / 1000, hasB = mode !== 'tripod', F0 = boxes[0].F, bF = [F0[0] - ax0[0] * sh, F0[1] - ax0[1] * sh], bR = [bF[0] - ax0[0] * B.d, bF[1] - ax0[1] * B.d], bC = [(bF[0] + bR[0]) / 2, (bF[1] + bR[1]) / 2 + (up ? -B.th / 2 : B.th / 2)];
    const ext = a.ext && a.ext.on && mode === 'flown' ? { len: (a.ext.len ?? 1000) / 1000, kg: a.ext.kg ?? null, shift: (a.ext.shift || 0) / 1000 } : null, eF = ext ? bF[0] + ext.shift * -1 : null, eR = ext ? eF - ext.len : null;
    const frameKg = hasB ? (a.frameKg ?? m.frame.kg) : 0, known = boxes.every(b => b.kg != null), extKg = ext ? (ext.kg || 0) : 0, add = (+a.extraKg || 0);
    const W = known ? boxes.reduce((s, b) => s + b.kg, 0) + (frameKg || 0) + extKg + add : null;
    let cg = null; if (known){ const mu = boxes.reduce((s, b) => s + b.kg * b.C[0], 0) + ((frameKg || 0) + add) * bC[0] + extKg * (ext ? (eF + eR) / 2 : 0); cg = mu / W; }
    const ys = boxes.flatMap(b => [b.F[1], b.F[1] + b.fc[1] * b.h, b.F[1] - b.ax[1] * b.d, b.F[1] + b.fc[1] * b.h - b.ax[1] * b.d]);
    const mech = { W, frameKg, extKg, kgBox: m.kg, cg, boxesKg: known ? boxes.reduce((s, b) => s + b.kg, 0) : null, bottom: Math.min(...ys), top: Math.max(...ys), depth: Math.min(...boxes.map(b => b.C[0] - b.d / 2)), unknown: boxes.filter(b => b.kg == null).length };
    // où pendre : plage offerte par le cadre et sa barre d'extension (distances en arrière de la face avant de la première boîte)
    const span = hasB ? [Math.min(bR[0], ext ? eR : 1e9), Math.max(bF[0], ext ? eF : -1e9)] : null;
    if (cg != null && mode === 'flown'){ mech.single = -cg; mech.singleOk = span ? cg >= span[0] - 1e-6 && cg <= span[1] + 1e-6 : false;
      if (a.pick === 2){ const uf = -(a.pa || 0) / 1000, ur = -(a.pb || 0) / 1000; if (Math.abs(uf - ur) > .01){ mech.Rf = W * (cg - ur) / (uf - ur); mech.Rr = W - mech.Rf; } } }
    return { m, n, boxes, mech, e0, e1, mode, up, B, bump: hasB ? { F: bF, R: bR, C: bC, ax: ax0 } : null, ext: ext ? { F: eF, R: eR, y: bF[1] + B.th } : null, span, thr };
  }
  // choisit les angles pour que les visées se répartissent du fond vers l'avant du public (distances en progression géométrique)
  function autoAim(a){
    const n = Math.max(1, Math.round(a.n)), au = a.aud, up = sup(a) !== 'flown'; a.splays = Array(Math.max(0, n - 1)).fill(0);
    const r = Math.pow(Math.max(.05, au.x0 / au.x1), 1 / Math.max(1, n - 1)), tgt = i => au.x1 * Math.pow(r, up ? n - 1 - i : i);
    const b0 = solve(a).boxes[0], yT = au.f0 + (au.f1 - au.f0) * Math.max(0, Math.min(1, (tgt(0) - au.x0) / Math.max(.1, au.x1 - au.x0))) + au.ear; a.site = Math.round(Math.atan2(b0.M[1] - yT, Math.max(.3, tgt(0) - .3)) / D2R * 2) / 2;
    for (let i = 1; i < n; i++){ const mi = typeM(a, kindOf(a, i)) || modelOf(a), allowed = mi.angles || Array.from({ length: Math.round(12 / (mi.step || 1)) + 1 }, (_, k) => k * (mi.step || 1)); let best = allowed[0], bd = 1e9;
      for (const s of allowed){ a.splays[i - 1] = s; const b = solve(a).boxes[i], d = b.hit ? Math.abs(b.hit.u - tgt(i)) + (b.hit.u < au.x0 ? 1e3 : 0) : 1e6; if (d < bd - 1e-9){ bd = d; best = s; } } a.splays[i - 1] = best; }
  }

  // ---------------------------------------------------------------- dessin de la coupe
  const KCOL = { A: '#c6cad2', B: '#8fb4ff', C: '#7fd6a4' };
  function svg(a, R){
    const au = a.aud, far = R.thr != null ? R.thr + 1 : au.x1 + 2, x0 = Math.min(-1.6, R.mech.depth - .6, R.ext ? R.ext.R - .4 : 0), x1 = Math.max(far, 6), y1 = Math.max(R.mech.top + 1.5, 3), y0 = Math.min(au.f0, au.f1, 0) - .8, W = 900, k = Math.min(W / (x1 - x0), Math.max(240, Math.min(420, W * (y1 - y0) / (x1 - x0))) / (y1 - y0)), X = u => ((u - x0) * k).toFixed(1), Y = v => ((y1 - v) * k).toFixed(1);
    let o = `<svg viewBox="0 0 ${W} ${((y1 - y0) * k).toFixed(0)}" style="width:100%;background:#15171c;border:1px solid var(--line);border-radius:8px;font:10px ui-monospace,Menlo,monospace">`;
    for (let g = Math.ceil(x0 / 5) * 5; g <= x1; g += 5) o += `<line x1="${X(g)}" x2="${X(g)}" y1="0" y2="${Y(y0)}" stroke="#262a33"/><text x="${+X(g) + 2}" y="${+Y(y0) - 3}" fill="#6e7787">${g} m</text>`;
    for (let g = 0; g <= y1; g += 2) o += `<line x1="0" x2="${W}" y1="${Y(g)}" y2="${Y(g)}" stroke="#262a33"/><text x="2" y="${+Y(g) - 2}" fill="#6e7787">${g}</text>`;
    o += `<polyline points="${X(x0)},${Y(0)} ${X(Math.min(0, au.x0))},${Y(0)} ${X(au.x0)},${Y(au.f0)} ${X(au.x1)},${Y(au.f1)} ${X(x1)},${Y(au.f1)}" fill="none" stroke="#6e7787" stroke-width="1.5"/><line x1="${X(au.x0)}" y1="${Y(R.e0)}" x2="${X(au.x1)}" y2="${Y(R.e1)}" stroke="#3fb97a" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${X(au.x1)}" y="${+Y(R.e1) - 5}" fill="#3fb97a" text-anchor="end">hauteur d'écoute</text>`;
    const L = R.thr != null ? R.thr : 80, ray = (M, an) => [M[0] + Math.cos(an * D2R) * L, M[1] - Math.sin(an * D2R) * L];
    if (!a.show || a.show.lines !== false) for (const b of R.boxes){ const p = [b.M, ray(b.M, b.hi), ray(b.M, b.lo)]; o += `<polygon points="${p.map(q => X(q[0]) + ',' + Y(q[1])).join(' ')}" fill="rgba(242,169,59,.07)" stroke="rgba(242,169,59,.22)" stroke-width=".6"${b.fromAngles ? ' stroke-dasharray="4 3"' : ''}/>`; }
    if (R.thr != null){ const b = R.boxes[0]; o += `<path d="M ${X(b.M[0] + L * Math.cos(R.boxes[0].hi * D2R))} ${Y(b.M[1] - L * Math.sin(R.boxes[0].hi * D2R))} A ${L * k} ${L * k} 0 0 1 ${X(b.M[0] + L * Math.cos(Math.min(89, R.boxes[R.n - 1].lo) * D2R))} ${Y(b.M[1] - L * Math.sin(Math.min(89, R.boxes[R.n - 1].lo) * D2R))}" fill="none" stroke="#f2a93b" stroke-dasharray="2 4"/><text x="${X(b.M[0] + L * Math.cos(b.th * D2R))}" y="${+Y(b.M[1] - L * Math.sin(b.th * D2R)) - 6}" fill="#f2a93b" text-anchor="end">portée ${f(L, 0)} m</text>`; }
    for (const b of R.boxes){ const inA = b.hit && b.hit.k >= -.001 && b.hit.k <= 1.001 && !b.hit.far, c = inA ? '#f2a93b' : '#e5484d', end = b.hit && !b.hit.far ? [b.hit.u, b.hit.v] : ray(b.M, b.th);
      o += `<line x1="${X(b.M[0])}" y1="${Y(b.M[1])}" x2="${X(end[0])}" y2="${Y(end[1])}" stroke="${c}" stroke-width=".9" stroke-opacity=".8"/>${b.hit && !b.hit.far ? `<circle cx="${X(end[0])}" cy="${Y(end[1])}" r="2.6" fill="${c}"/>` : ''}`;
      const P4 = [b.F, [b.F[0] + b.fc[0] * b.h, b.F[1] + b.fc[1] * b.h], [b.F[0] + b.fc[0] * b.h - b.ax[0] * b.d, b.F[1] + b.fc[1] * b.h - b.ax[1] * b.d], [b.F[0] - b.ax[0] * b.d, b.F[1] - b.ax[1] * b.d]];
      o += `<polygon points="${P4.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}" fill="#2d323c" stroke="${KCOL[b.k]}" stroke-width="1"/><text x="${+X(b.C[0]) - 3}" y="${+Y(b.C[1]) + 3}" fill="${KCOL[b.k]}" font-size="8">${b.k}</text>`; }
    if (R.bump){ const b = R.bump, s = R.up ? -1 : 1, t = R.B.th * s; o += `<polygon points="${[b.F, b.R, [b.R[0], b.R[1] + t], [b.F[0], b.F[1] + t]].map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}" fill="#4a505c" stroke="#e9ebf0" stroke-width="1"/><path d="M ${X(b.C[0])} ${Y(b.F[1] + t / 2)} L ${X(b.F[0] + .25)} ${Y(b.F[1] + t / 2)} m -5 -3 l 5 3 l -5 3" fill="none" stroke="#e9ebf0"/>`; }
    if (R.ext) o += `<rect x="${X(R.ext.R)}" y="${Y(R.ext.y + .06)}" width="${((R.ext.F - R.ext.R) * k).toFixed(1)}" height="${(.06 * k).toFixed(1)}" fill="#8fb4ff"/><text x="${X(R.ext.R)}" y="${+Y(R.ext.y + .06) - 3}" fill="#8fb4ff">barre d'extension</text>`;
    if (R.mode === 'flown'){ const yb = R.bump.F[1] + R.B.th + (R.ext ? .06 : 0), pts = a.pick === 2 ? [-(a.pa || 0) / 1000, -(a.pb || 0) / 1000] : R.mech.cg != null ? [R.mech.cg] : [];
      for (const u of pts) o += `<line x1="${X(u)}" x2="${X(u)}" y1="${Y(yb)}" y2="${Y(yb + 1.1)}" stroke="#ffd166" stroke-width="1.4"/><path d="M ${+X(u) - 5} ${Y(yb + 1.1)} h 10 l -5 -7 z" fill="#ffd166"/>`; }
    if (R.mode === 'tripod') o += `<line x1="${X(R.boxes[0].C[0])}" x2="${X(R.boxes[0].C[0])}" y1="${Y(0)}" y2="${Y(a.tripodH ?? 1.8)}" stroke="#e9ebf0" stroke-width="2"/><path d="M ${+X(R.boxes[0].C[0]) - 14} ${Y(0)} L ${X(R.boxes[0].C[0])} ${Y(.5)} L ${+X(R.boxes[0].C[0]) + 14} ${Y(0)}" fill="none" stroke="#e9ebf0"/>`;
    if (R.mech.cg != null) o += `<line x1="${X(R.mech.cg)}" x2="${X(R.mech.cg)}" y1="${Y(R.mech.top + .2)}" y2="${Y(R.mech.bottom - .3)}" stroke="#8fb4ff" stroke-dasharray="3 3"/><text x="${+X(R.mech.cg) + 3}" y="${+Y(R.mech.bottom - .3) + 10}" fill="#8fb4ff">centre de gravité</text>`;
    return o + '</svg>';
  }

  // ---------------------------------------------------------------- fenêtre de configuration (onglets)
  const ni = (k, v, step = 'any', ph = '', ex = '') => `<input type="number" step="${step}" data-la="${k}" value="${v ?? ''}" placeholder="${ph}"${ex}>`, ti = (k, v, ph = '') => `<input type="text" data-la="${k}" value="${esc(v ?? '')}" placeholder="${esc(ph)}">`;
  const SUPN = { flown: 'Suspendue (moteurs ou palans)', ground: 'Posée au sol (cadre en socle)', tripod: 'Sur pied ou mât de sub' };
  const modelSel = (k, id, none) => `<select data-la="${k}">${none ? `<option value=""${id ? '' : ' selected'}>Aucun</option>` : ''}<optgroup label="Fabricants">${LA_LIB.map(x => `<option value="${x.id}"${x.id === id ? ' selected' : ''}>${esc(x.maker + ' ' + x.name)}</option>`).join('')}</optgroup>${USER.boxes.length ? `<optgroup label="Mes modèles">${USER.boxes.map(x => `<option value="${x.id}"${x.id === id ? ' selected' : ''}>${esc((x.maker ? x.maker + ' ' : '') + x.name)}</option>`).join('')}</optgroup>` : ''}<option value="libre"${id === 'libre' ? ' selected' : ''}>Modèle libre (à saisir)</option></select>`;
  const infoM = m => `${esc((m.maker ? m.maker + ' ' : '') + m.name)} : ${m.kg != null ? f(m.kg, 1) + ' kg' : 'poids inconnu'} · ${m.w} × ${m.h} × ${m.d} mm · ${m.hdNote || (m.hd ? m.hd + '°' : 'ouverture inconnue')} horizontal · ${m.vd ? m.vd + '° vertical par boîte' : 'ouverture verticale par boîte non publiée'}${m.spl ? ' · ' + m.spl + ' dB max' : ''}.${m.source ? `<br>Source : ${esc(m.source)}${m.checked ? ' (relevé le ' + esc(m.checked) + ')' : ''}.` : ''}`;
  function typeTab(a, k){ const A_ = k === 'A', T = A_ ? { model: a.model, free: a.free } : (a.types && a.types[k]) || { model: '' }, m = T.model ? mById(T.model, T.free) : null, fr = T.model === 'libre', p = k + '_';
    return `<div class="pf pfw"><label>Modèle ${k}</label>${modelSel(p + 'model', T.model, !A_)}${m && fr ? `<label>Fabricant</label>${ti(p + 'f_maker', T.free?.maker, 'facultatif')}<label>Nom du modèle</label>${ti(p + 'f_name', T.free?.name, 'ex. tête principale')}<label>Poids d'une boîte (kg)</label>${ni(p + 'f_kg', T.free?.kg, .1, 'inconnu')}<label>Hauteur (mm)</label>${ni(p + 'f_h', m.h, 1)}<label>Profondeur (mm)</label>${ni(p + 'f_d', m.d, 1)}<label>Largeur (mm)</label>${ni(p + 'f_w', m.w, 1)}<label>Ouverture horizontale (°)</label>${ni(p + 'f_hd', T.free?.hd, 1, 'inconnue')}<label>Ouverture verticale d'une boîte (°)</label>${ni(p + 'f_vd', T.free?.vd, .5, 'inconnue')}<label>Niveau maximal (dB)</label>${ni(p + 'f_spl', T.free?.spl, 1, 'inconnu')}<label>Pas des angles (°)</label>${ni(p + 'f_step', m.step, .25)}` : ''}</div>
      ${m ? `<div class="info">${infoM(m)}</div>` : `<div class="info">Emplacement ${k} inutilisé. Choisis un modèle pour mélanger des boîtes dans la ligne (subs en tête, down-fill en bas…).</div>`}
      ${m && fr ? `<div class="btns" style="justify-content:flex-start"><button class="b" data-lb="saveBox" data-id="${k}" title="Garde ce modèle dans ma bibliothèque de line arrays, pour tous mes projets sur ce poste">Enregistrer dans mes modèles</button></div>` : ''}${m && T.model.startsWith('u:') ? `<div class="btns" style="justify-content:flex-start"><button class="b" data-lb="editBox" data-id="${k}">Modifier (repasse en modèle libre)</button><button class="b" data-lb="delBox" data-id="${k}">Supprimer de mes modèles</button></div>` : ''}`; }
  function draw(){
    const a = cur, m = modelOf(a), R = solve(a), M = R.mech, au = a.aud, mode = R.mode, up = R.up, B = R.B;
    const inA = b => b.hit && b.hit.k >= -.001 && b.hit.k <= 1.001 && !b.hit.far, hits = R.boxes.filter(inA), over = R.boxes.filter(b => !b.hit || b.hit.k > 1.001 || b.hit.far).length, short = R.boxes.filter(b => b.hit && b.hit.k < -.001).length, kinds = ['A', 'B', 'C'].filter(k => typeM(a, k));
    const angSel = (b, i) => b.m.angles ? `<select data-la="sp" data-i="${i}">${[...new Set([...b.m.angles, +a.splays[i] || 0])].sort((p, q) => p - q).map(v => `<option value="${v}"${v === (+a.splays[i] || 0) ? ' selected' : ''}>${f(v, v % 1 ? 2 : 0).replace(/,?0+$/, '')}°${b.m.angles.includes(v) ? '' : ' (hors liste)'}</option>`).join('')}</select>` : `<input type="number" data-la="sp" data-i="${i}" min="0" max="20" step="${b.m.step || .5}" value="${+a.splays[i] || 0}" style="width:70px">`;
    const rows = R.boxes.map(b => `<tr><td class="mono">${b.i + 1}</td><td>${kinds.length > 1 ? `<select data-la="kind" data-i="${b.i}">${kinds.map(k => `<option value="${k}"${k === b.k ? ' selected' : ''}>${k} · ${esc(typeM(a, k).name)}</option>`).join('')}</select>` : `<span style="color:${KCOL[b.k]}">${esc(b.m.name)}</span>`}</td><td>${b.i ? angSel(b, b.i - 1) : `<span style="color:var(--mute)">${mode === 'tripod' ? 'pied' : 'cadre'}</span>`}</td><td class="mono r">${f(b.th, 1)}°</td><td class="mono r">${f(b.M[1], 2)} m</td><td class="mono r" style="color:${inA(b) ? 'inherit' : '#ff8f8f'}">${b.hit && !b.hit.far ? f(b.hit.u, 1) + ' m' : b.hit ? 'hors portée' : '—'}</td><td class="mono r">${b.hit ? f(b.hit.t, 1) + ' m' : '—'}</td><td style="white-space:nowrap"><a data-lb="up" data-i="${b.i}" title="Monter dans la liste">▲</a> <a data-lb="dn" data-i="${b.i}" title="Descendre">▼</a> <a data-lb="rm" data-i="${b.i}" title="Retirer cette boîte">✕</a></td></tr>`).join('');
    const warn = [];
    if (M.W == null) warn.push(`Poids inconnu pour ${M.unknown} boîte(s) : pas de poids total ni de point d'accroche tant qu'il n'est pas saisi.`);
    if (mode !== 'tripod' && M.frameKg == null) warn.push(`Poids du cadre (${B.name}) non relevé : il n'est pas compté. Saisis-le d'après le fabricant (onglet Cadre).`);
    if (R.ext && a.ext.kg == null) warn.push('Poids de la barre d\'extension non saisi : il n\'est pas compté.');
    if (over) warn.push(`${over} boîte(s) visent au-delà du dernier rang, au-dessus du public ou hors de portée.`); if (short) warn.push(`${short} boîte(s) visent devant le premier rang.`);
    if (mode === 'flown' && M.single != null && a.pick === 1 && !M.singleOk) warn.push(`Avec un seul point, la ligne ne tient cet angle que si le point est à ${f(M.single * 100, 0)} cm en arrière de la face avant : hors du cadre${R.ext ? ' et de sa barre d\'extension' : ''}. Il faut ${R.ext ? 'déplacer ou allonger la barre, ou ' : 'une barre d\'extension ou '}un second point.`);
    if (a.pick === 2 && M.Rf != null && (M.Rf < 0 || M.Rr < 0)) warn.push(`Le point ${M.Rf < 0 ? 'avant' : 'arrière'} se détend : cet angle n'est pas tenable avec ces deux points. Écarte-les ou change l'inclinaison.`);
    if (mode === 'flown' && M.bottom < 2.2) warn.push(`Le bas de la ligne est à ${f(M.bottom, 2)} m du sol.`);
    if (R.boxes.some(b => b.M[1] <= Math.max(R.e0, R.e1))) warn.push('La hauteur d\'écoute doit rester sous les boîtes : sinon aucune empreinte n\'est tracée.');
    if (mode !== 'flown') warn.push(mode === 'ground' ? 'Empilage au sol : la stabilité (basculement, sangles, lest) n\'est pas calculée ici.' : 'Sur pied : la charge admissible et la stabilité du pied ne sont pas vérifiées ici.');
    const TABS = [['array', 'Ligne'], ['bumper', mode === 'tripod' ? 'Pied' : 'Cadre'], ['A', 'Enceinte A'], ['B', 'Enceinte B'], ['C', 'Enceinte C'], ['cover', 'Couverture'], ['fiche', 'Fiche']], pont = a.sid ? (S.sups || []).find(s => s.id === a.sid) : null;
    const T = {
      array: () => `<div class="pf pfw"><label>Nom</label>${ti('name', a.name)}<label>Support</label><select data-la="support">${Object.entries(SUPN).map(([k, l]) => `<option value="${k}"${k === mode ? ' selected' : ''}>${l}</option>`).join('')}</select>
          ${mode === 'flown' ? `<label>Haut de la ligne (m)</label>${ni('topY', a.topY, .1)}` : mode === 'ground' ? `<label>Hauteur du sol sous le socle (m)</label>${ni('baseY', a.baseY || 0, .05)}` : `<label>Hauteur du haut du pied (m)</label>${ni('tripodH', a.tripodH ?? 1.8, .05)}`}
          <label>${mode === 'tripod' ? 'Inclinaison de la première boîte' : 'Angle du cadre'} (° vers le bas)</label>${ni('site', a.site, .5)}${mode === 'flown' ? `<label>Décalage de la première boîte sous le cadre (mm, + vers l'arrière)</label>${ni('shift', a.shift || 0, 10)}` : ''}</div>
        <div class="btns" style="justify-content:flex-start;align-items:center"><span class="sub" style="margin:0">Ajouter</span>${ni('addN', UI.laAdd || 1, 1, '', ' min="1" max="24" style="width:54px"')}${kinds.map(k => `<button class="b" data-lb="add" data-id="${k}" title="${esc(typeM(a, k).name)}">+ ${k}</button>`).join('')}<span style="flex:1"></span><button class="b on" data-lb="auto" title="Incline la première boîte, puis choisit les angles pour répartir les visées du dernier rang au premier">Viser automatiquement</button><button class="b" data-lb="all0">Tout à 0°</button></div>
        <table class="t pa-t" style="width:100%"><tr><th>#</th><th>Boîte</th><th>Angle relatif</th><th class="r">Angle réel</th><th class="r">Hauteur</th><th class="r">Vise à</th><th class="r">Distance</th><th></th></tr>${rows}</table>
        <div class="sub">${up ? 'Liste du BAS vers le HAUT (la boîte 1 est posée sur le ' + (mode === 'tripod' ? 'pied' : 'socle') + ').' : 'Liste du HAUT vers le BAS (la boîte 1 est sous le cadre).'} ${R.n} boîte(s) : ${kinds.map(k => R.boxes.filter(b => b.k === k).length + ' × ' + esc(typeM(a, k).name)).join(', ')}.</div>`,
      bumper: () => mode === 'tripod' ? `<div class="info">Sur pied, il n'y a pas de cadre : la première boîte est posée en haut du pied. Règle sa hauteur dans l'onglet Ligne.</div><div class="pf pfw"><label>Câbles et accessoires (kg)</label>${ni('extraKg', a.extraKg || '', .5, '0')}</div>` : `<div class="pf pfw"><label>Nom du cadre</label>${ti('b_name', a.bump?.name, m.frame.name)}<label>Poids du cadre (kg)</label>${ni('frameKg', a.frameKg ?? m.frame.kg, .1, 'inconnu')}<label>Largeur (mm)</label>${ni('b_w', a.bump?.w, 1, String(m.w))}<label>Profondeur (mm)</label>${ni('b_d', a.bump?.d, 1, String(m.d))}<label>Épaisseur (mm)</label>${ni('b_th', a.bump?.th, 1, '100')}<label>Câbles et accessoires (kg)</label>${ni('extraKg', a.extraKg || '', .5, '0')}</div>
        ${USER.bumps.length ? `<div class="pf pfw"><label>Reprendre un de mes cadres</label><select data-la="b_pick"><option value="">—</option>${USER.bumps.map(b => `<option value="${b.id}">${esc(b.name)}${b.kg != null ? ' · ' + f(b.kg, 1) + ' kg' : ''}</option>`).join('')}</select></div>` : ''}<div class="btns" style="justify-content:flex-start"><button class="b" data-lb="saveBump" title="Garde ce cadre (nom, poids, dimensions) dans mes modèles">Enregistrer ce cadre</button></div>
        ${mode === 'flown' ? `<h2>Barre d'extension</h2><div class="pf pfw"><label>Barre d'extension</label><input type="checkbox" data-la="e_on"${a.ext?.on ? ' checked' : ''}>${a.ext?.on ? `<label>Longueur (mm)</label>${ni('e_len', a.ext.len ?? 1000, 10)}<label>Poids (kg)</label>${ni('e_kg', a.ext.kg, .1, 'inconnu')}<label>Déport (mm, − vers l'avant du cadre)</label>${ni('e_shift', a.ext.shift || 0, 10)}` : ''}</div>
        <h2>Points moteurs</h2><div class="pf pfw"><label>Accroche</label><select data-la="pick"><option value="1"${a.pick === 1 ? ' selected' : ''}>Un point</option><option value="2"${a.pick === 2 ? ' selected' : ''}>Deux points (avant, arrière)</option></select>${a.pick === 2 ? `<label>Point avant : en arrière de la face (mm)</label>${ni('pa', a.pa, 10)}<label>Point arrière : en arrière de la face (mm)</label>${ni('pb', a.pb, 10)}` : ''}</div><div class="sub">Les repères jaunes de la coupe montrent où pendre. Ce sont des repères approximatifs : les trous réels du cadre sont ceux de la notice du fabricant.</div>` : ''}`,
      A: () => typeTab(a, 'A'), B: () => typeTab(a, 'B'), C: () => typeTab(a, 'C'),
      cover: () => `<div class="pf pfw"><label>Premier rang : distance (m)</label>${ni('x0', au.x0, .5)}<label>Dernier rang : distance (m)</label>${ni('x1', au.x1, .5)}<label>Hauteur d'écoute</label><select data-la="ear"><option value="1.2"${au.ear === 1.2 ? ' selected' : ''}>Assis, 1,2 m</option><option value="1.7"${au.ear === 1.7 ? ' selected' : ''}>Debout, 1,7 m</option></select><label>Sol au premier rang (m)</label>${ni('f0', au.f0, .1)}<label>Sol au dernier rang (m)</label>${ni('f1', au.f1, .1)}<label>Portée (m)</label>${ni('throw', a.throw, 1, 'sans limite')}
          <label title="Au lieu de l'ouverture publiée par le fabricant, chaque boîte couvre jusqu'à mi-chemin de ses voisines">Ouverture verticale d'après les angles de la ligne</label><input type="checkbox" data-la="vdArr"${a.vdArr ? ' checked' : ''}><label>Lignes de dispersion (coupe)</label><input type="checkbox" data-la="s_lines"${!a.show || a.show.lines !== false ? ' checked' : ''}><label>Empreinte hachurée sur le plan</label><input type="checkbox" data-la="s_hatch"${!a.show || a.show.hatch !== false ? ' checked' : ''}></div>
        <div class="sub">L'empreinte du plan est tracée à la hauteur d'écoute au-dessus du sol du premier rang, d'après les ouvertures nominales de chaque boîte et la portée. Une boîte dont l'ouverture verticale n'est pas publiée est tracée d'après les angles de la ligne (pointillés en coupe). C'est de la géométrie : ni niveau, ni réponse en fréquence.</div>`,
      fiche: () => `<div class="pf pfw"><label>Identifiant de colonne</label>${ti('m_col', a.meta?.col, 'ex. L1')}<label>Emplacement</label>${ti('m_loc', a.meta?.loc, 'ex. avant-scène jardin')}<label>Rôle</label>${ti('m_role', a.meta?.role, 'ex. façade principale')}<label>Rack d'amplification</label>${ti('m_rack', a.meta?.rack)}<label>Ligne de signal</label>${ti('m_drive', a.meta?.drive)}<label>Note</label>${ti('m_note', a.meta?.note, 'loueur, référence de stock…')}<label>Étiquette sur le plan</label><input type="checkbox" data-la="s_label"${!a.show || a.show.label !== false ? ' checked' : ''}></div>
        <h2>Position dans la scène</h2><div class="pf pfw"><label>X (cour +)</label>${ni('x', a.x, .1)}<label>Z (public +)</label>${ni('z', a.z, .1)}<label>Orientation (°, 0 = face au public)</label>${ni('yaw', a.yaw, 1)}</div>
        <h2>Pont porteur</h2><div class="info">${pont ? `Accrochée à <b>${esc(pont.name || 'pont')}</b> : son poids${M.W != null ? ' (' + f(M.W, 0) + ' kg)' : ''} entre dans le calcul du pont et suit chaque modification.` : mode === 'flown' ? 'Pas de pont porteur : le poids de la ligne n\'entre dans aucun calcul de pont.' : 'Ligne non suspendue : pas de pont porteur.'}</div>${mode === 'flown' ? `<div class="btns" style="justify-content:flex-start"><button class="b" data-lb="load" title="Rattache la ligne au pont le plus proche en plan : son poids devient une charge ponctuelle de ce pont">${pont ? 'Rattacher au pont le plus proche' : 'Accrocher au pont le plus proche'}</button>${pont ? '<button class="b" data-lb="unload">Détacher du pont</button>' : ''}</div>` : ''}`,
    };
    ST.modal(`<div style="display:flex;gap:10px;align-items:center"><h1 style="margin:0;flex:1">Line array</h1><select data-la="which">${arrays().map(x => `<option value="${x.id}"${x.id === a.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}${arrays().includes(a) ? '' : `<option selected>${esc(a.name)} (nouveau)</option>`}</select><button class="b" data-lb="new">Nouveau</button><button class="b" data-lb="mirror" title="Crée la ligne symétrique de l'autre côté de l'axe">Symétrique</button>${arrays().includes(a) ? '<button class="b" data-lb="del">Supprimer</button>' : ''}</div>
      <div class="sub">Composition, cadre, points d'accroche, poids, et où vise chaque boîte. Le logiciel de prédiction du fabricant reste la référence pour les limites mécaniques du cadre et le niveau.</div>
      <div style="display:grid;grid-template-columns:minmax(330px,420px) 1fr;gap:16px;align-items:start"><div>
        <div class="tabs" style="flex-wrap:wrap">${TABS.map(([k, l]) => `<button data-latab="${k}" class="${tab === k ? 'on' : ''}"${(k === 'B' || k === 'C') && !typeM(a, k) ? ' style="opacity:.55"' : ''}>${l}</button>`).join('')}</div>${(T[tab] || T.array)()}</div>
      <div>${svg(a, R)}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:8px 0">
          <div class="info" style="margin:0"><b>Poids total</b><br>${M.W != null ? `<span style="font-size:18px">${f(M.W, 0)} kg</span><br>boîtes ${f(M.boxesKg, 1)}${M.frameKg ? ' + cadre ' + f(M.frameKg, 1) : mode !== 'tripod' && M.frameKg == null ? ' · cadre non compté' : ''}${M.extKg ? ' + barre ' + f(M.extKg, 1) : ''}${a.extraKg ? ' + ' + f(a.extraKg, 1) : ''}` : 'inconnu'}</div>
          <div class="info" style="margin:0"><b>${mode === 'flown' ? 'Sous la dernière boîte' : 'Haut de la pile'}</b><br><span style="font-size:18px">${f(mode === 'flown' ? M.bottom : M.top, 2)} m</span><br>ligne de ${f(M.top - M.bottom, 2)} m de haut</div>
          ${mode === 'flown' ? `<div class="info" style="margin:0"><b>${a.pick === 2 ? 'Charge par point' : 'Point d\'accroche'}</b><br>${M.W == null ? 'inconnu' : a.pick === 2 ? (M.Rf != null ? `<span style="font-size:15px">avant ${f(M.Rf, 0)} kg · arrière ${f(M.Rr, 0)} kg</span>` : 'points confondus') : `<span style="font-size:18px">${f(M.single * 100, 0)} cm</span><br>en arrière de la face avant`}</div>` : ''}
          <div class="info" style="margin:0"><b>Visée</b><br>${hits.length ? `<span style="font-size:15px">de ${f(Math.min(...hits.map(b => b.hit.u)), 1)} à ${f(Math.max(...hits.map(b => b.hit.u)), 1)} m</span><br>${hits.length} boîte(s) sur ${R.n} dans le public` : 'aucune boîte ne vise le public'}</div></div>
        ${warn.length ? `<div class="info" style="border:1px solid #f0a23c">${warn.map(esc).join('<br>')}</div>` : ''}
        <div class="info">${infoM(m)}</div>
        <div class="sub">Modèle : articulation sur l'arête avant des boîtes, centre de gravité de chaque boîte en son milieu, cadre en son milieu. La charge admissible du cadre pour cette configuration n'est pas calculée : elle se lit dans le logiciel du fabricant.</div></div></div>
      <div class="btns"><span style="flex:1"></span><button class="b" data-a="close">Fermer</button><button class="b on" data-lb="place">${a.objs && a.objs.some(id => ST.byId(id)) ? 'Mettre à jour dans la scène' : 'Poser dans la scène'}</button></div>`);
    $('#modal').firstElementChild.style.width = 'min(1240px,97vw)';
  }
  const dlgOpen = () => { const m = $('#modal'); return !!(m && m.style.display !== 'none' && m.querySelector('[data-latab]')); };
  function open(id){ cur = arrays().find(x => x.id === id) || cur && arrays().includes(cur) && cur || arrays()[0] || fresh(); if (!arrays().includes(cur) && !cur.auto){ cur.auto = 1; autoAim(cur); } draw(); }
  const keep = () => { if (!arrays().includes(cur)){ ST.pushUndo(0, 'Line array'); delete cur.auto; arrays().push(cur); } else ST.pushUndo('la' + cur.id, 'Régler le line array'); };
  function setN(a, n){ n = Math.max(1, Math.min(24, Math.round(n || 1))); const last = a.splays[a.splays.length - 1] ?? 0; a.n = n; a.splays = Array.from({ length: n - 1 }, (_, i) => a.splays[i] ?? last); if (a.kinds) a.kinds = Array.from({ length: n }, (_, i) => a.kinds[i] || 'A'); }
  const snapAngles = a => { const R = solve(a); a.splays = a.splays.map((s, i) => { const al = R.boxes[i + 1] && R.boxes[i + 1].m.angles; return al ? al.reduce((b, x) => Math.abs(x - s) < Math.abs(b - s) ? x : b, al[0]) : s; }); };
  // après tout changement : la scène suit (boîtes déjà posées), le pont porteur aussi, puis l'affichage
  function applied(a){ if (arrays().includes(a) && (a.objs || []).some(id => ST.byId(id))) place(a, true); else syncLoad(a); ST.touch(true); if (window.PLAN) PLAN.P.dirty = true; if (dlgOpen()) draw(); else ST.render(); }
  document.addEventListener('change', e => { const el = e.target, k = el.dataset && el.dataset.la; if (!k || !cur) return; e.stopPropagation(); const v = num(el.value), a = cur, on = el.checked;
    if (k === 'which'){ const x = arrays().find(q => q.id === el.value); if (x) cur = x; return draw(); }
    if (k === 'addN'){ UI.laAdd = Math.max(1, Math.min(24, Math.round(v || 1))); return; }
    keep();
    const tk = /^([ABC])_(.+)$/.exec(k);
    if (tk){ const K = tk[1], kk = tk[2], T = K === 'A' ? a : ((a.types = a.types || {})[K] = a.types[K] || { model: '' });
      if (kk === 'model'){ T.model = el.value; if (K === 'A' && !T.model) T.model = 'kara2'; if (T.model === 'libre') T.free = T.free || {}; else if (T.model.startsWith('u:')) T.free = { ...USER.boxes.find(x => x.id === T.model) }; else delete T.free; if (K === 'A') a.frameKg = null; if (K !== 'A' && !T.model && a.kinds) a.kinds = a.kinds.map(x => x === K ? 'A' : x); snapAngles(a); }
      else if (kk.startsWith('f_')){ T.free = T.free || {}; const q = kk.slice(2); if (q === 'maker' || q === 'name'){ if (el.value.trim()) T.free[q] = el.value.trim(); else delete T.free[q]; } else if (v == null || v <= 0) delete T.free[q]; else T.free[q] = v; } }
    else if (k === 'name') a.name = el.value || a.name; else if (k === 'support'){ a.support = el.value; if (a.support !== 'flown'){ delete a.sid; if (a.site > 10) a.site = 0; } }
    else if (k === 'sp') a.splays[+el.dataset.i] = Math.max(0, v || 0); else if (k === 'kind'){ a.kinds = Array.from({ length: a.n }, (_, i) => (a.kinds && a.kinds[i]) || 'A'); a.kinds[+el.dataset.i] = el.value; snapAngles(a); }
    else if (k === 'pick') a.pick = +el.value === 2 ? 2 : 1; else if (k === 'ear') a.aud.ear = +el.value;
    else if (['x0', 'x1', 'f0', 'f1'].includes(k)){ if (v != null) a.aud[k] = v; if (a.aud.x1 < a.aud.x0 + 1) a.aud.x1 = a.aud.x0 + 1; }
    else if (k === 'frameKg') a.frameKg = v != null && v >= 0 ? v : null; else if (k === 'throw') a.throw = v != null && v > 0 ? v : null; else if (k === 'vdArr') a.vdArr = on;
    else if (k.startsWith('s_')){ a.show = a.show || {}; a.show[k.slice(2)] = on; }
    else if (k.startsWith('m_')){ a.meta = a.meta || {}; const q = k.slice(2); if (el.value.trim()) a.meta[q] = el.value.trim(); else delete a.meta[q]; }
    else if (k === 'b_pick'){ const b = USER.bumps.find(x => x.id === el.value); if (b){ a.bump = { name: b.name, w: b.w, d: b.d, th: b.th }; a.frameKg = b.kg ?? null; } }
    else if (k.startsWith('b_')){ a.bump = a.bump || {}; const q = k.slice(2); if (q === 'name'){ if (el.value.trim()) a.bump.name = el.value.trim(); else delete a.bump.name; } else if (v == null || v <= 0) delete a.bump[q]; else a.bump[q] = v; }
    else if (k.startsWith('e_')){ a.ext = a.ext || {}; const q = k.slice(2); if (q === 'on') a.ext.on = on; else if (q === 'kg') a.ext.kg = v != null && v >= 0 ? v : null; else if (v != null) a.ext[q] = v; }
    else if (k === 'n') setN(a, v); else if (v != null) a[k] = v;
    applied(a); }, true);
  document.addEventListener('click', e => { const tb = e.target.closest && e.target.closest('[data-latab]'); if (tb && cur){ tab = tb.dataset.latab; return draw(); }
    const b = e.target.closest && e.target.closest('[data-lb]'); if (!b || !cur) return; const k = b.dataset.lb, a = cur, i = +b.dataset.i, K = b.dataset.id;
    if (k === 'cfg'){ tab = 'array'; return draw(); }
    if (k === 'new'){ cur = fresh(); cur.auto = 1; autoAim(cur); tab = 'array'; return draw(); }
    if (k === 'del') return remove(a, true);
    if (k === 'mirror'){ ST.pushUndo(0, 'Line array symétrique'); const c = JSON.parse(JSON.stringify(a)); c.id = uid(); c.x = -a.x; c.yaw = -a.yaw; c.objs = []; delete c.sid; c.name = /jardin/i.test(a.name) ? a.name.replace(/jardin/i, 'cour') : /cour/i.test(a.name) ? a.name.replace(/cour/i, 'jardin') : a.name + ' (symétrique)'; arrays().push(c); cur = c; if ((a.objs || []).length) place(c, true); ST.touch(); return dlgOpen() ? draw() : ST.render(); }
    if (k === 'saveBox' || k === 'editBox' || k === 'delBox'){ const T = K === 'A' ? a : a.types && a.types[K]; if (!T) return;
      if (k === 'saveBox'){ const m = mById('libre', T.free); if (!(T.free && T.free.name)) return ST.toast('Donne d\'abord un nom à ce modèle.', true); const u = { id: 'u:' + uid(), maker: T.free.maker || '', name: T.free.name, kg: T.free.kg ?? null, w: m.w, h: m.h, d: m.d, hd: T.free.hd ?? null, vd: T.free.vd ?? null, spl: T.free.spl ?? null, step: m.step, angles: null, source: 'saisi par l\'utilisateur' }; USER.boxes.push(u); saveUser(); keep(); T.model = u.id; T.free = { ...u }; ST.toast(`« ${u.name} » enregistré dans mes modèles.`); }
      else if (k === 'editBox'){ keep(); T.free = { ...(USER.boxes.find(x => x.id === T.model) || T.free || {}) }; delete T.free.id; T.model = 'libre'; }
      else { USER.boxes = USER.boxes.filter(x => x.id !== T.model); saveUser(); keep(); T.model = 'libre'; ST.toast('Retiré de mes modèles. Les projets qui l\'utilisent gardent ses valeurs.'); }
      return applied(a); }
    if (k === 'saveBump'){ const B = bumpOf(a); USER.bumps.push({ id: 'b:' + uid(), name: B.name, kg: a.frameKg ?? modelOf(a).frame.kg ?? null, w: Math.round(B.w * 1000), d: Math.round(B.d * 1000), th: Math.round(B.th * 1000) }); saveUser(); ST.toast(`Cadre « ${B.name} » enregistré.`); return draw(); }
    keep();
    if (k === 'auto') autoAim(a); else if (k === 'all0') a.splays = a.splays.map(() => 0); else if (k === 'place') return place(a); else if (k === 'load') return loadPont(a); else if (k === 'unload'){ delete a.sid; }
    else if (k === 'add'){ const c = Math.max(1, Math.min(24 - a.n, UI.laAdd || 1)); if (c < 1) return ST.toast('24 boîtes au plus.', true); a.kinds = Array.from({ length: a.n }, (_, j) => (a.kinds && a.kinds[j]) || 'A'); for (let j = 0; j < c; j++){ a.kinds.push(K); a.splays.push(a.splays[a.splays.length - 1] ?? 0); } a.n += c; a.splays = a.splays.slice(0, a.n - 1); snapAngles(a); }
    else if (k === 'rm'){ if (a.n < 2) return ST.toast('Il faut au moins une boîte.', true); a.kinds = Array.from({ length: a.n }, (_, j) => (a.kinds && a.kinds[j]) || 'A'); a.kinds.splice(i, 1); a.splays.splice(Math.max(0, i - 1), 1); a.n--; }
    else if (k === 'up' || k === 'dn'){ const j = i + (k === 'up' ? -1 : 1); if (j < 0 || j >= a.n) return; a.kinds = Array.from({ length: a.n }, (_, q) => (a.kinds && a.kinds[q]) || 'A'); [a.kinds[i], a.kinds[j]] = [a.kinds[j], a.kinds[i]]; snapAngles(a); }
    applied(a); });
  function remove(a, redraw){ ST.pushUndo(0, 'Supprimer ' + a.name); const ids = new Set(a.objs || []); for (const id of ids) if (ST.byId(id)) ST.unbuild(id); S.objs = S.objs.filter(o => !ids.has(o.id)); S.arrays = arrays().filter(x => x !== a); dropLoad(a.id); cur = arrays()[0] || fresh(); ST.touch(); ST.select([]); if (redraw) draw(); else ST.render(); }

  // ---------------------------------------------------------------- dans la scène : un objet par boîte, plus le cadre
  const typeId = m => LA_LIB.some(x => x.id === m.id) ? 'lab-' + m.id : 'lab-libre';
  function expected(a){ const R = solve(a), yw = a.yaw * D2R, at = (u, v) => [+(a.x + Math.sin(yw) * u).toFixed(3), +v.toFixed(3), +(a.z + Math.cos(yw) * u).toFixed(3)], L = [];
    if (R.bump) L.push({ bump: true, type: 'la-bump', name: `${a.name} · cadre`, pos: at(R.bump.C[0], R.bump.C[1]), tilt: 90 - (a.site || 0), size: [R.B.w, R.B.th, R.B.d], w: R.mech.frameKg != null ? R.mech.frameKg + R.mech.extKg : null });
    R.boxes.forEach((b, i) => L.push({ type: typeId(b.m), name: `${a.name} ${i + 1}`, pos: at(b.C[0], b.C[1]), tilt: 90 - b.th, size: [b.m.w / 1000, b.h, b.d], w: b.kg }));
    return { R, L }; }
  function place(a, quiet){
    const { R, L } = expected(a), all = ST.LIBALL(), old = (a.objs || []).map(id => ST.byId(id)).filter(Boolean), oldB = old.filter(o => o.type === 'la-bump'), oldX = old.filter(o => o.type !== 'la-bump'), used = new Set();
    a.objs = [];
    for (const e of L){ let o = e.bump ? oldB.shift() : oldX.shift(); const t = all.find(x => x.id === e.type); if (!t) continue;
      if (!o){ o = { ...ST.defaults(t), n: ST.nextNum('son') }; S.objs.push(o); } else ST.unbuild(o.id);
      Object.assign(o, { type: e.type, name: e.name, grp: a.name, hang: R.mode === 'flown' ? 'fixe' : '', pos: e.pos, pan: a.yaw, tilt: e.tilt, size: e.size, la: a.id }); if (e.w != null) o.w = e.w; else delete o.w; if (e.bump) o.on = false; if (o.hang === '') delete o.hang;
      ST.build(o); a.objs.push(o.id); used.add(o.id); }
    const gone = [...oldB, ...oldX]; for (const o of gone) ST.unbuild(o.id); if (gone.length){ const g = new Set(gone.map(o => o.id)); S.objs = S.objs.filter(o => !g.has(o.id)); UI.sel = UI.sel.filter(id => !g.has(id)); }
    syncLoad(a); ST.touch(); if (window.PLAN) PLAN.P.dirty = true;
    if (quiet && UI.sel.some(id => used.has(id))) ST.select([...UI.sel]);          /* les objets ont été reconstruits : le gizmo se raccroche */
    if (!quiet){ $('#modal').style.display = 'none'; ST.select(a.objs); ST.toast(`${a.name} : ${R.n} boîtes posées${R.mech.W != null ? ', ' + f(R.mech.W, 0) + ' kg' : ''}.${R.mode === 'flown' && !a.sid ? ' Pas de pont porteur : onglet Fiche → « Accrocher au pont le plus proche ».' : ''}`); }
  }
  // pont porteur : le poids de la ligne est UNE charge ponctuelle du pont (a.sid), tenue à jour
  const dropLoad = id => { for (const s of (S.sups || [])){ if (!(s.loads || []).some(l => l.la === id)) continue; s.loads = s.loads.filter(l => l.la !== id); window.PONTS && PONTS.build && PONTS.build(s); } };
  function syncLoad(a){ const PT = window.PONTS; if (!PT) return; const s = a.sid && sup(a) === 'flown' ? (S.sups || []).find(q => q.id === a.sid && q.kind === 'truss') : null; if (a.sid && !s) delete a.sid;
    const W = s ? solve(a).mech.W : null; if (!s || W == null) return dropLoad(a.id);
    const q = PT.proj(s, a.x, a.z), kg = Math.round(W * 10) / 10, al = Math.round(q.along), cur0 = (s.loads || []).find(l => l.la === a.id);
    for (const o of (S.sups || [])) if (o !== s && (o.loads || []).some(l => l.la === a.id)){ o.loads = o.loads.filter(l => l.la !== a.id); PT.build(o); }
    if (cur0 && cur0.kg === kg && cur0.alongMm === al && cur0.name === a.name) return;
    s.loads = (s.loads || []).filter(l => l.la !== a.id); s.loads.push({ id: cur0 ? cur0.id : uid(), la: a.id, name: a.name, alongMm: al, kg, lengthMm: 0 }); PT.build(s); }
  const nearTruss = (x, z) => { const PT = window.PONTS; let best = null, bd = 1e9; if (PT) for (const s of (S.sups || [])){ if (s.kind !== 'truss') continue; const q = PT.proj(s, x, z); if (q.d < bd){ bd = q.d; best = s; } } return best ? [best, bd] : null; };
  function loadPont(a){ const R = solve(a), n = nearTruss(a.x, a.z); if (!n) return ST.toast('Aucun pont dans le projet : trace d\'abord le pont qui porte la ligne.', true); if (R.mode !== 'flown') return ST.toast('Seule une ligne suspendue s\'accroche à un pont.', true);
    const [s, bd] = n; a.sid = s.id; applied(a); if (R.mech.W == null) return ST.toast(`Rattachée à ${s.name}, mais poids inconnu : rien n'est ajouté au calcul tant qu'il manque.`, true);
    ST.toast(`${f(R.mech.W, 0)} kg sur ${s.name}${bd > 1 ? ` (le pont est à ${f(bd, 1)} m de la ligne en plan)` : ''}.${R.mech.frameKg == null ? ' Poids du cadre non compté.' : ''} La charge suivra les modifications.`, bd > 1 || R.mech.frameKg == null); }

  // ---------------------------------------------------------------- inspecteur : la ligne se règle en sélectionnant son cadre ou une de ses boîtes
  const arrayOf = o => o && o.la ? arrays().find(a => a.id === o.la) : null;
  function fiche(o){ const a = arrayOf(o); if (!a) return ''; cur = a; const R = solve(a), M = R.mech, mode = R.mode, pont = a.sid ? (S.sups || []).find(s => s.id === a.sid) : null, kinds = ['A', 'B', 'C'].filter(k => typeM(a, k));
    return `<div class="info" style="grid-column:1/-1;margin:6px 0 2px;border-left:3px solid var(--accent2,#f2a93b)"><b>${esc(a.name)}</b> — ligne d'enceintes · ${R.n} boîte(s) : ${kinds.map(k => R.boxes.filter(b => b.k === k).length + ' × ' + esc(typeM(a, k).name)).join(', ')}<br>Poids total <b>${M.W != null ? f(M.W, 0) + ' kg' : 'inconnu'}</b>${mode !== 'tripod' && M.frameKg == null ? ' (cadre non compté)' : ''} · ${mode === 'flown' ? 'sous la dernière boîte' : 'haut de la pile'} <b>${f(mode === 'flown' ? M.bottom : M.top, 2)} m</b>${pont ? ' · sur ' + esc(pont.name || 'pont') : mode === 'flown' ? ' · <span style="color:#f0a23c">pas de pont porteur</span>' : ''}</div>
      <label>Ligne : nom</label>${ti('name', a.name)}<label>Support</label><select class="inp" data-la="support">${Object.entries(SUPN).map(([k, l]) => `<option value="${k}"${k === mode ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <label>${mode === 'flown' ? 'Haut de la ligne (m)' : mode === 'ground' ? 'Sol sous le socle (m)' : 'Haut du pied (m)'}</label>${mode === 'flown' ? ni('topY', a.topY, .1) : mode === 'ground' ? ni('baseY', a.baseY || 0, .05) : ni('tripodH', a.tripodH ?? 1.8, .05)}
      <label>${mode === 'tripod' ? 'Inclinaison 1re boîte (°)' : 'Angle du cadre (°)'}</label>${ni('site', a.site, .5)}<label>Nombre de boîtes</label>${ni('n', a.n, 1, '', ' min="1" max="24"')}<label>Orientation (°)</label>${ni('yaw', a.yaw, 1)}
      <div class="btns" style="grid-column:1/-1;justify-content:flex-start"><button class="b on" data-lb="cfg">Configurer la ligne…</button><button class="b" data-lb="auto" title="Répartit les visées du dernier rang au premier">Viser automatiquement</button><button class="b" data-lb="selAll">Choisir toute la ligne</button></div>`; }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lb=selAll]'); if (b && cur) ST.select((cur.objs || []).filter(id => ST.byId(id))); }, true);

  // ---------------------------------------------------------------- la ligne suit l'objet qu'on déplace à la souris (une boîte ou le cadre)
  let ptr = 0; addEventListener('pointerdown', () => { ptr++; }, true); const rel = () => { ptr = 0; }; addEventListener('pointerup', rel, true); addEventListener('pointercancel', rel, true);
  setInterval(() => { if (ptr || !arrays().length || UI.placing) return; let ch = false;
    for (const a of [...arrays()]){ if (!(a.objs || []).length) continue; const objs = a.objs.map(id => ST.byId(id)); if (!objs.some(Boolean)){ S.arrays = arrays().filter(x => x !== a); dropLoad(a.id); ch = true; continue; }
      if (objs.some(o => !o)){ a.objs = a.objs.filter(id => ST.byId(id)); place(a, true); ch = true; continue; }
      const { L } = expected(a); if (L.length !== objs.length) continue; let d = null; for (let i = 0; i < L.length; i++){ const p = objs[i].pos, q = L[i].pos, dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]; if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > .004){ d = [dx, dy, dz]; break; } }
      if (!d) continue; a.x = +(a.x + d[0]).toFixed(3); a.z = +(a.z + d[2]).toFixed(3); const m = sup(a); if (m === 'flown') a.topY = +(a.topY + d[1]).toFixed(3); else if (m === 'ground') a.baseY = +((a.baseY || 0) + d[1]).toFixed(3); else a.tripodH = +((a.tripodH ?? 1.8) + d[1]).toFixed(3);
      if (m === 'flown' && a.sid){ const n = nearTruss(a.x, a.z); if (n && n[0].id !== a.sid && n[1] < .6) a.sid = n[0].id; }
      place(a, true); ch = true; }
    if (ch){ ST.touch(true); ST.render(); window.PLAN && PLAN.draw && PLAN.draw(); } }, 350);

  // ---------------------------------------------------------------- pose à la souris : un clic pour la position, un second pour l'orientation
  let TL = null, eatT = 0;
  function tool(on){ TL = on === false ? null : { step: 0, p: null, cur: null }; if (TL){ UI.placing = null; if (window.PLAN && !PLAN.P.on) PLAN.toggle(true); ST.toast('Line array : clique où accrocher la ligne (plan ou vue 3D), puis clique en direction du public. Échap : annuler.'); } window.PLAN && PLAN.draw && PLAN.draw(); document.body.style.cursor = TL ? 'crosshair' : ''; }
  function create(x, z, yaw){ const a = fresh(); a.x = +x.toFixed(2); a.z = +z.toFixed(2); a.yaw = Math.round(yaw); a.name = a.x > .2 ? 'Line array cour' : a.x < -.2 ? 'Line array jardin' : 'Line array centre'; const nb = arrays().filter(q => q.name.startsWith(a.name)).length; if (nb) a.name += ' ' + (nb + 1);
    const n = nearTruss(a.x, a.z); if (n && n[1] < .6){ a.sid = n[0].id; a.topY = +Math.max(1, n[0].zMm / 1000 - .8).toFixed(2); }
    ST.pushUndo(0, 'Poser un line array'); autoAim(a); arrays().push(a); cur = a; place(a, true); ST.select(a.objs.slice(0, 1)); UI.tab = 'prop'; A.toggleConsole && A.toggleConsole(true); ST.render(); window.PLAN && PLAN.draw && PLAN.draw();
    ST.toast(`${a.name} posée : 8 × ${modelOf(a).name}${n && n[1] < .6 ? ', accrochée à ' + (n[0].name || 'le pont') + ' (haut de ligne 0,8 m sous le pont, à ajuster)' : ', sans pont porteur'}. Règle-la dans l'inspecteur ou par « Configurer la ligne… ».`); return a; }
  const onPlan = e => e.target.closest && e.target.closest('#plan2d');
  document.addEventListener('pointerdown', e => { if (!TL || e.button !== 0) return; const pl = onPlan(e), c3 = e.target === A.canvas; if (!pl && !c3) return; e.preventDefault(); e.stopPropagation(); eatT = performance.now();
    if (c3){ const h = ST.pickAt && ST.pickAt(e); if (!h) return ST.toast('Rien sous le pointeur.', true); TL = null; document.body.style.cursor = ''; return void create(h.point.x, h.point.z, 0); }
    if (window.PLAN && PLAN.P.view !== 'plan') return ST.toast('Pose la ligne sur la vue de dessus (Plan).', true);
    const [x, z] = PLAN.world(e); if (!TL.step){ TL.step = 1; TL.p = [x, z]; TL.cur = [x, z]; PLAN.draw(); return; }
    const dx = x - TL.p[0], dz = z - TL.p[1], yaw = Math.hypot(dx, dz) < .25 ? 0 : Math.atan2(dx, dz) / D2R, p = TL.p; TL = null; document.body.style.cursor = ''; create(p[0], p[1], yaw); }, true);
  document.addEventListener('pointermove', e => { if (!TL || !TL.step || !onPlan(e)) return; TL.cur = PLAN.world(e); PLAN.draw(); }, true);
  for (const ev of ['click', 'pointerup', 'dblclick']) document.addEventListener(ev, e => { if ((TL || performance.now() - eatT < 450) && (onPlan(e) || e.target === A.canvas)) e.stopPropagation(); }, true);
  document.addEventListener('keydown', e => { if (TL && e.key === 'Escape'){ e.stopPropagation(); tool(false); ST.toast('Pose du line array annulée.'); } }, true);

  // ---------------------------------------------------------------- plan : empreinte de couverture (hachures), étiquette, aperçu de pose
  const planDraw = ({ c, X, Z, K, cp, INK, ACC, P: PP, text }) => { if (cp) return;
    for (const a of arrays()){ const objs = (a.objs || []).map(id => ST.byId(id)).filter(Boolean); if (!objs.length || objs.every(o => o.hidden || A.layHid(o))) continue;
      const R = solve(a), yw = a.yaw * D2R, yl = a.aud.f0 + a.aud.ear, thr = R.thr != null ? R.thr : a.aud.x1 + 3, wp = (u, lat) => [a.x + Math.sin(yw) * u + Math.cos(yw) * lat, a.z + Math.cos(yw) * u - Math.sin(yw) * lat];
      if (!a.show || a.show.hatch !== false){ c.save();
        for (const b of R.boxes){ const dy = b.M[1] - yl, hd = b.m.hd; if (dy <= .05 || !hd || b.lo <= 0) continue; const near = b.lo >= 89.5 ? 0 : dy / Math.tan(b.lo * D2R), far = Math.min(thr, b.hi > .2 ? dy / Math.tan(b.hi * D2R) : thr); if (far <= near + .02) continue;
          const hh = hd / 2 * D2R, pts = []; for (let i = 0; i <= 12; i++){ const t = -hh + 2 * hh * i / 12; pts.push(wp(b.M[0] + Math.cos(t) * far, Math.sin(t) * far)); } for (let i = 12; i >= 0; i--){ const t = -hh + 2 * hh * i / 12; pts.push(wp(b.M[0] + Math.cos(t) * near, Math.sin(t) * near)); }
          c.beginPath(); pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](X(p[0]), Z(p[1]))); c.closePath(); c.fillStyle = 'rgba(242,169,59,.07)'; c.fill(); c.strokeStyle = 'rgba(200,120,20,.45)'; c.lineWidth = .6 * K; c.stroke(); }
        // hachures sur l'ensemble de l'empreinte
        const hs = R.boxes.filter(b => b.m.hd && b.M[1] - yl > .05 && b.lo > 0); if (hs.length){ const hdM = Math.max(...hs.map(b => b.m.hd)) / 2 * D2R, dyL = R.boxes[R.n - 1].M[1] - yl, loL = Math.max(...hs.map(b => b.lo)), near = loL >= 89.5 ? 0 : Math.min(...hs.map(b => (b.M[1] - yl) / Math.tan(Math.min(89.4, b.lo) * D2R))), far = Math.min(thr, Math.max(...hs.map(b => b.hi > .2 ? (b.M[1] - yl) / Math.tan(b.hi * D2R) : thr)));
          if (far > near){ c.beginPath(); for (let i = 0; i <= 16; i++){ const t = -hdM + 2 * hdM * i / 16, p = wp(Math.cos(t) * far, Math.sin(t) * far); c[i ? 'lineTo' : 'moveTo'](X(p[0]), Z(p[1])); } for (let i = 16; i >= 0; i--){ const t = -hdM + 2 * hdM * i / 16, p = wp(Math.cos(t) * near, Math.sin(t) * near); c.lineTo(X(p[0]), Z(p[1])); } c.closePath(); c.clip();
            c.strokeStyle = 'rgba(200,120,20,.30)'; c.lineWidth = .5 * K; const o0 = [X(a.x), Z(a.z)], rad = far * PP.s + 20, st = 9 * K; c.beginPath(); for (let d = -rad * 2; d <= rad * 2; d += st){ c.moveTo(o0[0] + d - rad, o0[1] + rad); c.lineTo(o0[0] + d + rad, o0[1] - rad); } c.stroke(); void dyL; } }
        c.restore(); }
      if ((!a.show || a.show.label !== false) && PP.labels){ const M = R.mech, l1 = (a.meta && a.meta.col ? a.meta.col + ' · ' : '') + a.name, l2 = `${R.n} boîtes · ${M.W != null ? f(M.W, 0) + ' kg' : 'poids inconnu'} · ${R.mode === 'flown' ? 'bas ' + f(M.bottom, 2) + ' m' : 'haut ' + f(M.top, 2) + ' m'}`, p = wp(-R.B.d - .25, 0);
        text(l1, p[0], p[1], { px: 8.5, b: true, col: INK, bg: true, bl: 'bottom', dy: -1 }); text(l2, p[0], p[1], { px: 7.5, col: INK, bg: true, bl: 'top', dy: 1 }); } }
    if (TL && TL.step && TL.cur){ const [x0, z0] = TL.p, [x1, z1] = TL.cur, L = Math.hypot(x1 - x0, z1 - z0); c.save(); c.strokeStyle = ACC; c.fillStyle = ACC; c.lineWidth = 1.6 * K; c.beginPath(); c.arc(X(x0), Z(z0), 5 * K, 0, 7); c.stroke(); if (L > .05){ c.setLineDash([6 * K, 4 * K]); c.beginPath(); c.moveTo(X(x0), Z(z0)); c.lineTo(X(x1), Z(z1)); c.stroke(); c.setLineDash([]); text(`face au public : ${f(Math.atan2(x1 - x0, z1 - z0) / D2R, 0)}°`, x1, z1, { px: 9, col: ACC, bg: true, dy: -12 }); } c.restore(); } };
  planDraw.ly = 'son'; (window.PLANX || (window.PLANX = [])).push(planDraw);

  window.LARRAY = { open, solve, autoAim, place, fresh, arrays, modelOf, typeM, LA_LIB, USER, tool, create, fiche, arrayOf, expected, syncLoad, remove, get tl(){ return TL; }, get cur(){ return cur; }, set cur(v){ cur = v; }, set tab(v){ tab = v; } };
}
