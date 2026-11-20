// Plan de charge des perches : chaque perche est calculée comme une poutre continue sur ses points de suspension.
// Méthode : éléments finis de poutre (Euler-Bernoulli), appuis unilatéraux (un câble ne pousse pas), charges ponctuelles et réparties.
export function initRig(A, ST){
  const $ = s => document.querySelector(s), S = ST.S, PS = A.PERCHES, G = 9.81, esc = ST.esc;
  const f = (v, d = 0) => (+v).toFixed(d).replace('.', ',');
  const MAT = { acier: { E: 210000, fy: 235, rho: 7850, label: 'acier S235' }, alu: { E: 70000, fy: 250, rho: 2700, label: 'aluminium EN AW-6082 T6' } };
  const TUBES = { a483x32: ['Acier Ø 48,3 × 3,2 mm', 'acier', 48.3, 3.2], a483x40: ['Acier Ø 48,3 × 4 mm', 'acier', 48.3, 4], a603x40: ['Acier Ø 60,3 × 4 mm', 'acier', 60.3, 4],
    al483x40: ['Aluminium Ø 48,3 × 4 mm', 'alu', 48.3, 4], al50x4: ['Aluminium Ø 50 × 4 mm', 'alu', 50, 4], al60x5: ['Aluminium Ø 60 × 5 mm', 'alu', 60, 5], perso: ['Section personnalisée', 'acier', 48.3, 3.2] };
  // valeurs par défaut : HYPOTHÈSES à remplacer par les données du constructeur de la machinerie
  const DEF = { tube: 'a483x32', mat: 'acier', D: 48.3, t: 3.2, sup: 5, supX: '', wllTotal: 300, wllPoint: 100, acc: 1.5, cable: 0.5, rid: 0.6, amp: 1.5, kdyn: 1, gamma: 1.5, flex: 200 };
  const rig = () => (S.rig && S.rig.def ? S.rig : (S.rig = { def: {}, per: {} }));
  const cfg = i => ({ ...DEF, ...rig().def, ...(rig().per[i] || {}) });
  function section(c){
    const [, m0, D0, t0] = TUBES[c.tube] || TUBES.perso, perso = c.tube === 'perso', m = MAT[perso ? c.mat : m0] || MAT.acier, D = perso ? +c.D : D0, t = Math.min(perso ? +c.t : t0, D / 2 - .1), d = D - 2 * t;
    const area = Math.PI / 4 * (D * D - d * d), I = Math.PI / 64 * (D ** 4 - d ** 4);
    return { D, t, m, area, I, W: I / (D / 2), kgm: area * 1e-6 * m.rho, EI: m.E * I * 1e-6, label: perso ? `Ø ${f(D, 1)} × ${f(t, 1)} mm, ${m.label}` : TUBES[c.tube][0] };
  }
  const supports = c => { const xs = String(c.supX || '').split(/[;\s]+/).map(v => parseFloat(v.replace(',', '.'))).filter(v => isFinite(v) && Math.abs(v) <= LEN_() / 2);
    if (xs.length >= 2) return [...new Set(xs)].sort((a, b) => a - b); const n = Math.max(2, Math.min(12, Math.round(+c.sup || 5))); return Array.from({ length: n }, (_, k) => -LEN_() / 2 + LEN_() * (k + .5) / n); };

  // ---------------------------------------------------------------- charges d'une perche
  let CUR = 0; const LEN_ = () => A.percheLen(CUR);   // longueur de la perche en cours de calcul ou de dessin
  function loads(i, c, sec){
    const pts = [], dists = [{ label: 'Poids propre du tube', x0: -LEN_() / 2, x1: LEN_() / 2, q: sec.kgm, self: true }];
    for (const o of S.objs){ if (o.hang !== 'perche' || o.pi !== i) continue; const t = ST.typeOf(o), acc = t.cat === 'str' && t.kind !== 'truss' ? 0 : +c.acc;
      pts.push({ o, n: o.n, name: o.name || t.name, x: Math.max(-LEN_() / 2, Math.min(LEN_() / 2, o.pos[0] - A.percheX(i))), kg: ST.weightOf(o) + acc, own: ST.weightOf(o), acc }); }
    pts.sort((a, b) => a.x - b.x);
    if (pts.length && +c.cable > 0) dists.push({ label: 'Câblage (forfait)', x0: -LEN_() / 2, x1: LEN_() / 2, q: +c.cable });
    for (const cu of A.planState().curtains) if (Math.abs(cu.z - PS[i].z) < .05) dists.push({ label: cu.kind === 'fond' ? 'Rideau de fond' : 'Pendrillon', x0: cu.x0, x1: cu.x1, q: +c.rid * +c.amp * PS[i].y });
    return { pts, dists };
  }

  // ---------------------------------------------------------------- poutre continue (éléments finis)
  function beam(EI, supX, pts, dists, k){
    const bp = new Set([-LEN_() / 2, LEN_() / 2, ...supX, ...pts.map(p => p.x), ...dists.flatMap(d => [d.x0, d.x1])].map(v => Math.round(v * 1000) / 1000));
    let xs = [...bp].sort((a, b) => a - b); const X = [];
    for (let j = 0; j < xs.length - 1; j++){ const n = Math.max(1, Math.ceil((xs[j + 1] - xs[j]) / .2)); for (let q = 0; q < n; q++) X.push(xs[j] + (xs[j + 1] - xs[j]) * q / n); } X.push(xs[xs.length - 1]);
    const N = X.length, n = 2 * N, K = new Float64Array(n * n), F = new Float64Array(n), idx = x => { let b = 0; for (let j = 1; j < N; j++) if (Math.abs(X[j] - x) < Math.abs(X[b] - x)) b = j; return b; };
    const qel = new Float64Array(N - 1);
    for (let e = 0; e < N - 1; e++){ const L = X[e + 1] - X[e], c = EI / L ** 3, m = [[12, 6 * L, -12, 6 * L], [6 * L, 4 * L * L, -6 * L, 2 * L * L], [-12, -6 * L, 12, -6 * L], [6 * L, 2 * L * L, -6 * L, 4 * L * L]], d = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) K[d[a] * n + d[b]] += c * m[a][b];
      const xm = (X[e] + X[e + 1]) / 2; let q = 0; for (const dd of dists) if (xm > dd.x0 && xm < dd.x1) q += dd.q * G * k; qel[e] = q;
      F[d[0]] -= q * L / 2; F[d[1]] -= q * L * L / 12; F[d[2]] -= q * L / 2; F[d[3]] += q * L * L / 12; }
    const P = new Float64Array(N); for (const p of pts){ const j = idx(p.x); P[j] += p.kg * G * k; F[2 * j] -= p.kg * G * k; }
    let act = supX.map(x => idx(x)), u = null, R = [], ok = true;
    for (let it = 0; it < supX.length; it++){
      if (new Set(act.filter(a => a >= 0)).size < 2){ ok = false; break; }
      const fixed = new Set(act.filter(a => a >= 0).map(a => 2 * a)), free = []; for (let j = 0; j < n; j++) if (!fixed.has(j)) free.push(j);
      const m = free.length, M = new Float64Array(m * (m + 1)); for (let a = 0; a < m; a++){ for (let b = 0; b < m; b++) M[a * (m + 1) + b] = K[free[a] * n + free[b]]; M[a * (m + 1) + m] = F[free[a]]; }
      for (let c = 0; c < m; c++){ let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(M[r * (m + 1) + c]) > Math.abs(M[p * (m + 1) + c])) p = r; if (Math.abs(M[p * (m + 1) + c]) < 1e-9){ ok = false; break; }
        if (p !== c) for (let b = c; b <= m; b++){ const t = M[c * (m + 1) + b]; M[c * (m + 1) + b] = M[p * (m + 1) + b]; M[p * (m + 1) + b] = t; }
        for (let r = c + 1; r < m; r++){ const fct = M[r * (m + 1) + c] / M[c * (m + 1) + c]; if (fct) for (let b = c; b <= m; b++) M[r * (m + 1) + b] -= fct * M[c * (m + 1) + b]; } }
      if (!ok) break;
      const sol = new Float64Array(m); for (let r = m - 1; r >= 0; r--){ let s = M[r * (m + 1) + m]; for (let b = r + 1; b < m; b++) s -= M[r * (m + 1) + b] * sol[b]; sol[r] = s / M[r * (m + 1) + r]; }
      u = new Float64Array(n); free.forEach((j, a) => u[j] = sol[a]);
      R = act.map(a => { if (a < 0) return 0; let s = -F[2 * a]; for (let b = 0; b < n; b++) s += K[2 * a * n + b] * u[b]; return s; });
      let worst = -1; R.forEach((r, j) => { if (act[j] >= 0 && r < -1e-6 && (worst < 0 || r < R[worst])) worst = j; });
      if (worst < 0) break; act = act.map((a, j) => j === worst ? -1 : a);                                     // câble détendu : on le retire et on recalcule
    }
    if (!ok || !u) return { ok: false, X, sup: supX.map(x => ({ x, R: NaN, active: false })) };
    // moment fléchissant par la statique (positif = fibre inférieure tendue), flèche issue du calcul
    const Mx = new Float64Array(N), V = new Float64Array(N); for (let j = 0; j < N; j++){ V[j] = u[2 * j]; let s = 0;
      for (let a = 0; a < act.length; a++) if (act[a] >= 0 && X[act[a]] < X[j] + 1e-9) s += R[a] * (X[j] - X[act[a]]);
      for (let b = 0; b < j; b++) s -= P[b] * (X[j] - X[b]);
      for (let e = 0; e < j; e++) if (qel[e]){ const L = X[e + 1] - X[e]; s -= qel[e] * L * (X[j] - (X[e] + X[e + 1]) / 2); }
      Mx[j] = s; }
    return { ok: true, X, M: Mx, V, sup: supX.map((x, j) => ({ x, R: R[j] / G, active: act[j] >= 0 })) };
  }

  // ---------------------------------------------------------------- calcul et vérifications
  function compute(i){ CUR = i;
    const c = cfg(i), Pq = PS[i], tr = !!Pq.truss, sec = tr ? { ...section(c), kgm: Pq.kgm || 0, label: 'Pont ' + f(Pq.sect * 100) + ' cm' + (Pq.kgm ? '' : ' · poids propre inconnu (compté 0)') } : section(c), supX = Pq.mxs && Pq.mxs.length >= 2 ? Pq.mxs.map(x => Math.round(x * 1000) / 1000) : supports(c), { pts, dists } = loads(i, c, sec), k = Math.max(1, +c.kdyn || 1);
    const b = beam(sec.EI, supX, pts, dists, k), dKg = d => d.q * (d.x1 - d.x0);
    const self = dists.filter(d => d.self).reduce((s, d) => s + dKg(d), 0), pay = pts.reduce((s, p) => s + p.kg, 0) + dists.filter(d => !d.self).reduce((s, d) => s + dKg(d), 0);
    const r = { i, c, sec, supX, pts, dists, k, b, self, pay, total: self + pay, warn: [], n: pts.length };
    r.uTotal = pay * k / Math.max(1, +c.wllTotal);
    if (!b.ok){ r.util = 9; r.unstable = true; r.warn.push('Perche instable avec ces points de suspension : le calcul ne converge pas.'); r.Rmax = NaN; r.uPoint = r.uSig = r.uDefl = 9; return r; }
    r.Rmax = Math.max(...b.sup.map(s => s.R)); r.uPoint = r.Rmax / Math.max(1, +c.wllPoint);
    let jm = 0; b.M.forEach((m, j) => { if (Math.abs(m) > Math.abs(b.M[jm])) jm = j; }); r.Mmax = b.M[jm]; r.xM = b.X[jm];
    r.sigma = Math.abs(r.Mmax) * 1000 / sec.W; r.sigAdm = sec.m.fy / Math.max(1, +c.gamma); r.uSig = r.sigma / r.sigAdm;
    const as = b.sup.filter(s => s.active).map(s => s.x); let ud = 0, jv = 0;
    b.X.forEach((x, j) => { let lim; if (x < as[0]) lim = 2 * (as[0] + LEN_() / 2) / c.flex; else if (x > as[as.length - 1]) lim = 2 * (LEN_() / 2 - as[as.length - 1]) / c.flex; else { let a = 0; while (a < as.length - 2 && as[a + 1] < x) a++; lim = (as[a + 1] - as[a]) / c.flex; }
      const uu = lim > 1e-6 ? Math.abs(b.V[j]) / lim : 0; if (uu > ud){ ud = uu; jv = j; } });
    r.uDefl = ud; r.defl = b.V[jv] * 1000; r.xV = b.X[jv];
    r.util = Math.max(r.uTotal, r.uPoint, r.uSig, r.uDefl);
    if (r.uTotal > 1) r.warn.push(`Charge utile ${f(pay * k)} kg supérieure à la CMU de la perche (${f(c.wllTotal)} kg).`);
    if (r.uPoint > 1) r.warn.push(`Un point de suspension reprend ${f(r.Rmax)} kg, au-delà de sa CMU (${f(c.wllPoint)} kg).`);
    if (r.uSig > 1) r.warn.push(`Contrainte de flexion ${f(r.sigma)} MPa supérieure à l'admissible (${f(r.sigAdm)} MPa).`);
    if (r.uDefl > 1) r.warn.push(`Flèche ${f(Math.abs(r.defl), 1)} mm supérieure à la limite portée / ${c.flex}.`);
    const slack = b.sup.filter(s => !s.active).length; if (slack) r.warn.push(`${slack} point(s) de suspension détendu(s) : la charge est déséquilibrée, à répartir autrement.`);
    if (tr){ r.truss = true; r.uSig = r.uDefl = 0; r.util = Math.max(r.uTotal, r.uPoint); r.warn = r.warn.filter(w => !/^(Contrainte|Flèche)/.test(w)); }   // pont : seules la charge totale et la reprise par moteur sont vérifiées
    for (const p of pts) if (Math.abs(p.x) >= LEN_() / 2 - 1e-6) r.warn.push(`${p.n ?? ''} ${p.name} dépasse le bout de la perche.`);
    return r;
  }
  let cache = null, tmr = 0;
  const all = () => cache || (cache = PS.map((_, i) => compute(i)));
  const colOf = u => u > 1 ? '#e5484d' : u > .8 ? '#f0a23c' : '#3fb97a';
  function paint(){ const R = all(); PS.forEach((P, i) => { const m = P.grp.children[0]; if (!m.userData.own){ m.material = m.material.clone(); m.userData.own = true; m.userData.col = m.material.color.clone(); }
    const u = R[i].util, hot = R[i].n > 0 && u > .8 || u > 1; m.material.color.set(hot ? colOf(u) : m.userData.col); m.material.emissive.set(u > 1 ? '#5a0d10' : '#000'); });
    if (window.PLAN) PLAN.P.dirty = true; if (openI >= 0 && $('#modal').style.display === 'flex' && $('#rigRoot')) render(); }
  function changed(){ cache = null; clearTimeout(tmr); tmr = setTimeout(paint, 250); }
  const sum = i => { const r = all()[i]; return { kg: r.pay, util: r.util, n: r.n, col: colOf(r.util) }; };

  // ---------------------------------------------------------------- fenêtre
  let openI = -1;
  const pct = u => u >= 9 ? '—' : f(u * 100) + ' %';
  function render(){
    const R = all(), r = R[openI], c = r.c, per = rig().per[openI] || {}, inp = (k, scope, step = 'any', w = 70) => `<input type="number" step="${step}" data-rk="${k}" data-sc="${scope}" value="${c[k]}" style="width:${w}px">`;
    const list = R.map((q, i) => PS[i].off ? '' : `<div class="rg-row${i === openI ? ' on' : ''}" data-ri="${i}"><b>P${i + 1}</b><span class="mono">${f(PS[i].z, 2)} m</span><span class="mono" style="text-align:right">${f(q.pay * q.k)} kg</span><span class="rg-bar"><i style="width:${Math.min(100, q.util * 100)}%;background:${colOf(q.util)}"></i></span><span class="mono" style="color:${colOf(q.util)};text-align:right">${pct(q.util)}</span></div>`).join('');
    const row = (l, v, u, lim) => `<tr><td>${l}</td><td class="mono" style="text-align:right">${v}</td><td class="mono" style="text-align:right;color:var(--mute)">${lim}</td><td class="mono" style="text-align:right;color:${colOf(u)}">${pct(u)}</td></tr>`;
    const res = r.unstable ? '' : `<table class="t"><tr><th>Vérification</th><th style="text-align:right">Calculé</th><th style="text-align:right">Limite</th><th style="text-align:right">Taux</th></tr>
      ${row('Charge utile (matériel, accessoires, câbles, rideaux)' + (r.k > 1 ? ' × ' + f(r.k, 2) : ''), f(r.pay * r.k, 1) + ' kg', r.uTotal, f(c.wllTotal) + ' kg')}
      ${row('Point de suspension le plus chargé', f(r.Rmax, 1) + ' kg', r.uPoint, f(c.wllPoint) + ' kg')}
      ${row(`Contrainte de flexion (M = ${f(Math.abs(r.Mmax) / G, 1)} kg·m à ${f(r.xM, 2)} m)`, f(r.sigma, 1) + ' MPa', r.uSig, f(r.sigAdm) + ' MPa')}
      ${row(`Flèche (à ${f(r.xV, 2)} m)`, f(Math.abs(r.defl), 1) + ' mm', r.uDefl, 'portée / ' + c.flex)}</table>`;
    const sup = r.b.sup.map((s, j) => `<tr><td>S${j + 1}</td><td class="mono" style="text-align:right">${f(s.x, 2)} m</td><td class="mono" style="text-align:right;color:${!s.active ? 'var(--mute)' : colOf(s.R / c.wllPoint)}">${isNaN(s.R) ? '—' : s.active ? f(s.R, 1) + ' kg' : 'détendu'}</td></tr>`).join('');
    const lds = r.pts.map(p => `<tr><td class="mono">${p.n ?? ''}</td><td>${esc(p.name)}</td><td class="mono" style="text-align:right">${f(p.x, 2)} m</td><td class="mono" style="text-align:right">${f(p.own, 1)}${p.acc ? ' + ' + f(p.acc, 1) : ''}</td><td class="mono" style="text-align:right">${f(p.kg, 1)} kg</td></tr>`).join('')
      + r.dists.map(d => `<tr><td></td><td>${d.label} <span style="color:var(--mute)">(${f(d.q, 2)} kg/m)</span></td><td class="mono" style="text-align:right">${f(d.x0, 1)} → ${f(d.x1, 1)}</td><td></td><td class="mono" style="text-align:right">${f(d.q * (d.x1 - d.x0), 1)} kg</td></tr>`).join('');
    const perso = c.tube === 'perso';
    $('#modal').firstElementChild.innerHTML = `<div id="rigRoot"><h1>Plan de charge des perches</h1>
      <div class="sub">Chaque perche est calculée comme une poutre continue sur ses points de suspension. Aide au plan de charge : les limites affichées sont des hypothèses tant que tu n'as pas saisi les données du constructeur, et ce calcul ne remplace pas la note d'un ingénieur.</div>
      <div class="rg-grid"><div><div class="rg-row hd"><b></b><span>Position</span><span style="text-align:right">Charge</span><span></span><span style="text-align:right">Taux</span></div>${list}
        <div class="sub" style="margin-top:8px">Total accroché aux perches : <b>${f(R.reduce((s, q) => s + q.pay, 0))} kg</b> utiles, <b>${f(R.reduce((s, q) => s + q.total, 0))} kg</b> avec les tubes.</div></div>
      <div><div style="display:flex;align-items:baseline;gap:10px"><h2 style="margin:0">Perche ${openI + 1}</h2><span class="sub" style="margin:0">hauteur ${f(PS[openI].y, 2)} m · ${r.n} appareil(s) · ${r.sec.label} · ${f(r.sec.kgm, 2)} kg/m</span></div>
        ${(() => { const P = PS[openI], per = rig().per[openI] || {}, out = []; if (P.wllP && per.wllTotal !== P.wllP) out.push(`charge répartie <b>${f(P.wllP)} kg</b> <button class="b" data-wl="wllTotal" data-v="${P.wllP}">Valider</button>`); if (P.wllPt && per.wllPoint !== P.wllPt) out.push(`charge par point <b>${f(P.wllPt)} kg</b> <button class="b" data-wl="wllPoint" data-v="${P.wllPt}">Valider</button>`); return out.length ? `<div class="info" id="rigProp" style="border:1px solid #f0a23c"><b>Lu dans la fiche technique, à vérifier avant de valider :</b> ${out.join(' · ')}<br>Tant que tu n'as pas validé, le calcul garde la valeur saisie ci-dessous.</div>` : ''; })()}${PS[openI].c ? `<div class="sub" style="margin:4px 0">${PS[openI].c} circuits de gradateur sur cette perche (fiche technique).</div>` : ''}
        ${r.truss ? `<div class="info">Cette perche est un <b>pont</b> porté par ${r.supX.length} moteur(s). Le calcul vérifie la charge totale et ce que reprend chaque moteur. La contrainte et la flèche du pont ne sont pas calculées : reporte-toi aux tableaux de charge du fabricant.</div>` : ''}<canvas id="rigCv" style="width:100%;height:360px;display:block;margin:8px 0;border:1px solid var(--line);border-radius:8px;background:#15171c"></canvas>
        ${r.warn.length ? `<div class="info" style="border:1px solid #e5484d;color:#ffb4b4">${r.warn.map(esc).join('<br>')}</div>` : `<div class="info" style="border:1px solid #3fb97a">Toutes les vérifications passent avec les hypothèses saisies.</div>`}
        ${res}
        <div class="rg-two"><div><h2>Points de suspension</h2><table class="t"><tr><th></th><th style="text-align:right">Position</th><th style="text-align:right">Réaction</th></tr>${sup}</table></div>
        <div><h2>Charges</h2><table class="t"><tr><th>N°</th><th>Élément</th><th style="text-align:right">Position</th><th style="text-align:right">kg + acc.</th><th style="text-align:right">Total</th></tr>${lds}</table></div></div>
        <h2>Données de la perche ${openI + 1}</h2><div class="rg-form">
          <label>Tube</label><select data-rk="tube" data-sc="per">${Object.entries(TUBES).map(([k, v]) => `<option value="${k}"${k === c.tube ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>
          ${perso ? `<label>Matériau</label><select data-rk="mat" data-sc="per"><option value="acier"${c.mat === 'acier' ? ' selected' : ''}>Acier S235</option><option value="alu"${c.mat === 'alu' ? ' selected' : ''}>Aluminium 6082 T6</option></select><label>Diamètre × épaisseur (mm)</label><span>${inp('D', 'per', .1, 60)} × ${inp('t', 'per', .1, 50)}</span>` : ''}
          <label>Nombre de points de suspension</label>${inp('sup', 'per', 1, 60)}
          <label>… ou positions exactes (m depuis l'axe, séparées par ;)</label><input type="text" data-rk="supX" data-sc="per" value="${esc(String(c.supX || ''))}" placeholder="${supports({ ...c, supX: '' }).map(v => f(v, 2)).join(' ; ')}" style="width:100%">
          <label>CMU de la perche, charge utile répartie (kg)</label>${inp('wllTotal', 'per', 10)}
          <label>CMU par point de suspension (kg)</label>${inp('wllPoint', 'per', 10)}</div>
        <div class="btns" style="justify-content:flex-start;margin-top:6px"><button class="b" data-rb="copy">Appliquer ces données à toutes les perches</button>${Object.keys(per).length ? '<button class="b" data-rb="reset">Revenir aux valeurs communes</button>' : ''}</div>
        <h2>Hypothèses générales</h2><div class="rg-form">
          <label>Accessoires par appareil : crochet, élingue (kg)</label>${inp('acc', 'def', .1)}
          <label>Câblage, forfait sur une perche équipée (kg/m)</label>${inp('cable', 'def', .1)}
          <label>Rideaux : grammage (kg/m²) × ampleur</label><span>${inp('rid', 'def', .05, 60)} × ${inp('amp', 'def', .1, 50)}</span>
          <label>Coefficient dynamique (1 = à l'arrêt, 1,2 à 1,5 en mouvement)</label>${inp('kdyn', 'def', .05)}
          <label>Coefficient de sécurité sur la limite élastique</label>${inp('gamma', 'def', .05)}
          <label>Flèche admissible : portée /</label>${inp('flex', 'def', 10)}</div>
      </div></div>
      <div class="btns"><button class="b" data-rb="csv">Exporter le tableau des charges (CSV)</button><button class="b" data-rb="png">Exporter ce diagramme (PNG)</button><button class="b on" data-a="close">Fermer</button></div></div>`;
    diagram($('#rigCv'), r);
  }
  function diagram(cv, r, forPng){ CUR = r.i;
    const d = forPng ? 2 : Math.min(2, devicePixelRatio || 1), W = forPng ? 1100 : cv.clientWidth, H = forPng ? 440 : cv.clientHeight; cv.width = W * d; cv.height = H * d; const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
    c.fillStyle = '#0e0b1c'; c.fillRect(0, 0, W, H); const mx = 46, X = x => mx + (x + LEN_() / 2) / LEN_() * (W - 2 * mx), yB = 104, INK = '#e8e8ea', MUTE = '#8a8d96';
    c.font = '10px ui-monospace,Menlo,Consolas,monospace'; c.textBaseline = 'middle';
    c.fillStyle = MUTE; c.textAlign = 'left'; c.fillText('JARDIN', 6, 12); c.textAlign = 'right'; c.fillText('COUR', W - 6, 12); c.textAlign = 'center'; if (forPng){ c.fillStyle = INK; c.fillText(`Perche ${r.i + 1} — ${r.sec.label} — charge utile ${f(r.pay * r.k, 1)} kg — taux ${pct(r.util)}`, W / 2, 12); }
    // charges réparties
    r.dists.filter(q => !q.self).forEach((q, j) => { c.fillStyle = 'rgba(120,150,255,.22)'; c.fillRect(X(q.x0), yB - 16 - j * 7, X(q.x1) - X(q.x0), 6); });
    // perche et graduations
    c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(X(-LEN_() / 2), yB); c.lineTo(X(LEN_() / 2), yB); c.stroke();
    c.lineWidth = 1; c.strokeStyle = '#3a3c44'; c.fillStyle = MUTE; for (let x = -8; x <= 8; x += 2){ c.beginPath(); c.moveTo(X(x), yB + 4); c.lineTo(X(x), yB + 9); c.stroke(); c.fillText(x, X(x), yB + 17); }
    // points de suspension et réactions
    r.b.sup.forEach((s, j) => { const col = !s.active ? MUTE : colOf(s.R / r.c.wllPoint); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.5; c.setLineDash(s.active ? [] : [3, 3]); c.beginPath(); c.moveTo(X(s.x), yB - 3); c.lineTo(X(s.x), 34); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(X(s.x), 30); c.lineTo(X(s.x) - 4, 38); c.lineTo(X(s.x) + 4, 38); c.fill(); c.fillText(isNaN(s.R) ? '—' : s.active ? f(s.R) + ' kg' : 'détendu', X(s.x), 22); });
    // charges ponctuelles
    const kmax = Math.max(1, ...r.pts.map(p => p.kg)); let lastX = -99, lv = 0;
    r.pts.forEach(p => { const x = X(p.x), h = 10 + 22 * p.kg / kmax; c.strokeStyle = '#b78bff'; c.fillStyle = '#b78bff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, yB + 26); c.lineTo(x, yB + 26 + h); c.stroke(); c.beginPath(); c.moveTo(x, yB + 28 + h); c.lineTo(x - 3.5, yB + 21 + h); c.lineTo(x + 3.5, yB + 21 + h); c.fill();
      lv = x - lastX < 34 ? (lv + 1) % 3 : 0; lastX = x; c.fillStyle = INK; c.fillText(`${p.n ?? ''}`, x, yB + 70 + lv * 11); c.fillStyle = MUTE; });
    c.fillStyle = MUTE; c.textAlign = 'left'; c.fillText('n° des appareils', 4, yB + 70); c.textAlign = 'center';
    if (!r.b.ok) return;
    // moment fléchissant et flèche
    const y0 = H - 92, yv = H - 30, mm = Math.max(1e-9, ...Array.from(r.b.M, Math.abs)), vm = Math.max(1e-9, ...Array.from(r.b.V, Math.abs));
    c.strokeStyle = '#3a3c44'; c.lineWidth = 1; for (const y of [y0, yv]){ c.beginPath(); c.moveTo(X(-LEN_() / 2), y); c.lineTo(X(LEN_() / 2), y); c.stroke(); }
    c.beginPath(); c.moveTo(X(r.b.X[0]), y0); r.b.X.forEach((x, j) => c.lineTo(X(x), y0 + r.b.M[j] / mm * 30)); c.lineTo(X(LEN_() / 2), y0); c.closePath(); c.fillStyle = 'rgba(229,72,77,.25)'; c.fill(); c.strokeStyle = '#e5484d'; c.lineWidth = 1.3; c.stroke();
    c.beginPath(); r.b.X.forEach((x, j) => { const y = yv - r.b.V[j] / vm * 20; j ? c.lineTo(X(x), y) : c.moveTo(X(x), y); }); c.strokeStyle = '#19b6c9'; c.stroke();
    c.textAlign = 'left'; c.fillStyle = '#e5484d'; c.fillText(`Moment fléchissant — max ${f(Math.abs(r.Mmax) / G, 1)} kg·m`, 4, y0 - 38); c.fillStyle = '#19b6c9'; c.fillText(`Flèche (amplifiée) — max ${f(Math.abs(r.defl), 1)} mm`, 4, yv - 26);
  }
  function setVal(k, sc, raw){
    const text = k === 'tube' || k === 'mat' || k === 'supX', v = text ? raw : parseFloat(String(raw).replace(',', '.')); if (!text && !isFinite(v)) return;
    ST.pushUndo('rig', 'Données de charge'); const R = rig(); if (sc === 'def') R.def[k] = v; else { (R.per[openI] ??= {})[k] = v; if (k === 'sup') R.per[openI].supX = ''; }
    cache = null; ST.touch(); render(); paint();
  }
  function open(i){
    if (i === undefined){ const s = ST.selObjs().find(o => o.hang === 'perche' && o.pi !== undefined); i = s ? s.pi : openI >= 0 ? openI : Math.max(0, all().reduce((b, q, j, a) => q.util > a[b].util && q.n ? j : b, 0)); }
    openI = i; cache = null; ST.modal('<div id="rigRoot"></div>'); $('#modal').firstElementChild.style.width = 'min(1120px,96vw)'; render();
  }
  const box = $('#modal').firstElementChild;
  box.addEventListener('click', e => { if (!$('#rigRoot')) return; { const wl = e.target.closest('[data-wl]'); if (wl) return setVal(wl.dataset.wl, 'per', wl.dataset.v); } const row = e.target.closest('[data-ri]'), b = e.target.closest('[data-rb]');
    if (row){ openI = +row.dataset.ri; render(); }
    else if (b){ const a = b.dataset.rb, R = rig();
      if (a === 'copy'){ ST.pushUndo(0, 'Données de charge'); Object.assign(R.def, R.per[openI] || {}); R.per = {}; cache = null; ST.touch(); render(); paint(); ST.toast('Données appliquées aux 14 perches.'); }
      else if (a === 'reset'){ ST.pushUndo(0, 'Données de charge'); delete R.per[openI]; cache = null; ST.touch(); render(); paint(); }
      else if (a === 'csv') csv(); else if (a === 'png') png(); } });
  box.addEventListener('change', e => { const el = e.target; if ($('#rigRoot') && el.dataset.rk) setVal(el.dataset.rk, el.dataset.sc, el.value); });
  function csv(){
    const R = all(), q = v => /[;"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v, n = (v, d = 1) => isFinite(v) ? f(v, d) : '';
    const rows = [['Perche', 'Position (m)', 'Hauteur (m)', 'Tube', 'Appareils', 'Charge utile (kg)', 'Poids du tube (kg)', 'Total (kg)', 'CMU perche (kg)', 'Réaction max (kg)', 'CMU point (kg)', 'Contrainte (MPa)', 'Admissible (MPa)', 'Flèche (mm)', 'Taux max (%)', 'Alertes']];
    for (const r of R) rows.push(['P' + (r.i + 1), n(PS[r.i].z, 2), n(PS[r.i].y, 2), r.sec.label, r.n, n(r.pay * r.k), n(r.self), n(r.total), r.c.wllTotal, n(r.Rmax), r.c.wllPoint, n(r.sigma), n(r.sigAdm, 0), n(Math.abs(r.defl)), r.util >= 9 ? '' : n(r.util * 100, 0), r.warn.join(' | ')]);
    rows.push([], ['Perche', 'N°', 'Élément', 'Position (m)', 'Poids (kg)', 'Accessoires (kg)', 'Total (kg)']);
    for (const r of R){ for (const p of r.pts) rows.push(['P' + (r.i + 1), p.n ?? '', p.name, n(p.x, 2), n(p.own), n(p.acc), n(p.kg)]); for (const d of r.dists) if (!d.self) rows.push(['P' + (r.i + 1), '', d.label + ' (' + n(d.q, 2) + ' kg/m)', n(d.x0, 1) + ' à ' + n(d.x1, 1), '', '', n(d.q * (d.x1 - d.x0))]); }
    rows.push([], ['Perche', 'Point de suspension', 'Position (m)', 'Réaction (kg)']); for (const r of R) r.b.sup.forEach((s, j) => rows.push(['P' + (r.i + 1), 'S' + (j + 1), n(s.x, 2), s.active ? n(s.R) : 'détendu']));
    const t = rows.map(r => r.map(q).join(';')).join('\r\n'); ST.saveFile('plan-de-charge.csv', '﻿' + t, t);
  }
  async function png(){ const cv = document.createElement('canvas'); diagram(cv, all()[openI], true); const b = await new Promise(r => cv.toBlob(r, 'image/png')); if (b) ST.saveFile(`charge-perche-${openI + 1}.png`, new Uint8Array(await b.arrayBuffer())); }

  window.RIG = { open, compute, all, sum, changed, beam, section, cfg, DEF };
  A.hooks.perche.push(changed); paint();
}
