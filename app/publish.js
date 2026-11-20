// Publication : cotes posées sur le plan, calques, cartouche, dossier PDF (plan, coupe, listes, charges) et rapport de sécurité.
// Les PDF sont fabriqués avec pdf-lib, comme dans ScenoFactory : texte en vrai texte, plans en image à 200 points par pouce.
export function initPublish(A, ST){
  const S = ST.S, UI = ST.UI, esc = ST.esc, $ = s => document.querySelector(s);
  const f = (v, d = 2) => (+v).toFixed(d).replace('.', ','), uid = () => 'c' + Math.random().toString(36).slice(2, 9);
  const dims = () => S.dims || (S.dims = []), L = () => S.layers || (S.layers = {}), cart = () => L().cart || (L().cart = {});
  const P = { tl: null };
  const LAYERS = [['lum', 'Lumière'], ['vid', 'Vidéo'], ['son', 'Son'], ['str', 'Structure et scène'], ['dec', 'Décor et personnages'], ['ponts', 'Ponts et structures'], ['cotes', 'Cotes']];
  const on = k => L()[k] !== false;

  // ---------------------------------------------------------------- cotes
  // aimant : centre d'un objet, bout ou point d'un pont, sinon pas de 5 cm
  function snapPt(x, z, tol){ let best = null, bd = tol; const tryP = (px, pz) => { const d = Math.hypot(px - x, pz - z); if (d < bd){ bd = d; best = [px, pz]; } };
    for (const o of S.objs) if (!o.hidden && !A.layHid(o)) tryP(o.pos[0], o.pos[2]);
    for (const s of S.sups || []){ tryP(s.a.x / 1000, -s.a.y / 1000); tryP(s.b.x / 1000, -s.b.y / 1000); }
    tryP(0, 0); return best || [Math.round(x / .05) * .05, Math.round(z / .05) * .05]; }
  function tool(k){ k = k || null; if (k === P.tl) return; P.tl = k ? { k, a: null, cur: null } : null; if (k){ window.PONTS?.tool(false); UI.placing = null; if (window.PLAN && !PLAN.P.on) PLAN.toggle(true); if (!on('cotes')){ L().cotes = true; } ST.toast('Cote : clique deux points sur le plan. Ils s\'aimantent aux objets et aux bouts de ponts. Clic droit sur une cote : la retirer. Échap : terminer.'); } if (window.PLAN) PLAN.P.dirty = true; }
  const nearDim = (x, z, tol) => dims().find(d => { const ax = d.a[0], az = d.a[1], bx = d.b[0], bz = d.b[1], l = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / l, uz = (bz - az) / l, nx = -uz * (d.off || 0), nz = ux * (d.off || 0), t = (x - ax - nx) * ux + (z - az - nz) * uz, px = ax + nx + ux * Math.max(0, Math.min(l, t)), pz = az + nz + uz * Math.max(0, Math.min(l, t)); return Math.hypot(x - px, z - pz) < tol; });
  function bindPlan(){ const cv = document.querySelector('#plan2d'); if (!cv || !window.PLAN || !PLAN.world){ setTimeout(bindPlan, 400); return; }
    cv.addEventListener('pointerdown', e => { if (!P.tl || PLAN.P.view === 'coupe') return; e.stopImmediatePropagation(); e.preventDefault(); const [x, z] = PLAN.world(e), tol = Math.max(.15, 10 / PLAN.P.s);
      if (e.button === 2){ const d = nearDim(x, z, tol); if (d){ ST.pushUndo(0, 'Retirer une cote'); S.dims = dims().filter(q => q !== d); ST.touch(); } return; } if (e.button !== 0) return;
      const p = e.altKey ? [x, z] : snapPt(x, z, tol);
      if (!P.tl.a){ P.tl.a = p; P.tl.cur = p; } else if (!P.tl.b){ if (Math.hypot(p[0] - P.tl.a[0], p[1] - P.tl.a[1]) < .02) return; P.tl.b = p; }
      else { const t = P.tl, l = Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]), ux = (t.b[0] - t.a[0]) / l, uz = (t.b[1] - t.a[1]) / l, off = Math.round(((x - t.a[0]) * -uz + (z - t.a[1]) * ux) / .05) * .05; ST.pushUndo(0, 'Poser une cote'); dims().push({ id: uid(), a: t.a.map(v => +v.toFixed(3)), b: t.b.map(v => +v.toFixed(3)), off: +off.toFixed(2) }); P.tl = { k: 'dim', a: null, cur: null }; ST.touch(); }
      PLAN.P.dirty = true; }, true);
    cv.addEventListener('contextmenu', e => { if (P.tl){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    cv.addEventListener('pointermove', e => { if (!P.tl) return; const [x, z] = PLAN.world(e); P.tl.cur = P.tl.b || e.altKey ? [x, z] : snapPt(x, z, Math.max(.15, 10 / PLAN.P.s)); PLAN.P.dirty = true; }, true);
  } bindPlan();
  addEventListener('keydown', e => { if (P.tl && e.code === 'Escape'){ e.stopPropagation(); if (P.tl.a){ P.tl = { k: 'dim', a: null, cur: null }; if (window.PLAN) PLAN.P.dirty = true; } else tool(null); } }, true);
  (window.PLANX || (window.PLANX = [])).push(({ c, X, Z, s: sc, K, cp, INK, BLUE, ACC, PAPER }) => { if (cp || !on('cotes')) return;
    const one = (a, b, off, col, live) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < .01) return; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l, nx = -uz, nz = ux, o = off || 0, sg = o < 0 ? -1 : 1, ex = .12 / Math.max(.02, sc / 60);
      const A1 = [a[0] + nx * o, a[1] + nz * o], B1 = [b[0] + nx * o, b[1] + nz * o]; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = .8 * K; c.setLineDash([]);
      c.beginPath(); if (Math.abs(o) > .01){ c.moveTo(X(a[0]), Z(a[1])); c.lineTo(X(A1[0] + nx * sg * ex), Z(A1[1] + nz * sg * ex)); c.moveTo(X(b[0]), Z(b[1])); c.lineTo(X(B1[0] + nx * sg * ex), Z(B1[1] + nz * sg * ex)); } c.moveTo(X(A1[0]), Z(A1[1])); c.lineTo(X(B1[0]), Z(B1[1])); c.stroke();
      const t = 4.5 * K; for (const q of [A1, B1]){ c.beginPath(); c.moveTo(X(q[0]) - (ux + nx) * t, Z(q[1]) - (uz + nz) * t); c.lineTo(X(q[0]) + (ux + nx) * t, Z(q[1]) + (uz + nz) * t); c.lineWidth = 1.4 * K; c.stroke(); }
      const mx = X((A1[0] + B1[0]) / 2), mz = Z((A1[1] + B1[1]) / 2); let an = Math.atan2(uz, ux); if (an > Math.PI / 2 + .01 || an < -Math.PI / 2 - .01) an += Math.PI; const txt = f(l) + ' m';
      c.save(); c.translate(mx, mz); c.rotate(an); c.font = `${live ? '600 ' : ''}${10 * K}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'bottom'; const w = c.measureText(txt).width + 6 * K; c.fillStyle = PAPER; c.fillRect(-w / 2, -14 * K, w, 12 * K); c.fillStyle = col; c.fillText(txt, 0, -2.5 * K); c.restore(); };
    for (const d of dims()) one(d.a, d.b, d.off, BLUE);
    const t = P.tl; if (t && t.a && t.cur){ if (!t.b) one(t.a, t.cur, 0, ACC, true); else { const l = Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]), ux = (t.b[0] - t.a[0]) / l, uz = (t.b[1] - t.a[1]) / l; one(t.a, t.b, (t.cur[0] - t.a[0]) * -uz + (t.cur[1] - t.a[1]) * ux, ACC, true); } }
    else if (t && t.cur){ c.strokeStyle = ACC; c.lineWidth = 1.2 * K; c.beginPath(); c.arc(X(t.cur[0]), Z(t.cur[1]), 5 * K, 0, 7); c.stroke(); }
  });

  // ---------------------------------------------------------------- volet Projet : calques, cartouche, publication
  const FORMATS = { A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189] };
  const PG = [['plan', 'Plan technique'], ['coupe', 'Coupe longitudinale'], ['gear', 'Liste du matériel'], ['patch', 'Patch DMX'], ['rig', 'Rigging et charges'], ['bom', 'Nomenclature des ponts'], ['secu', 'Rapport de sécurité']];
  const O = Object.assign({ fmt: 'A3', land: true, scale: 0, pages: { plan: true, coupe: true, gear: true, patch: true, rig: true, bom: true, secu: false } }, A.store.get('pubOpt') || {});
  function docHtml(){ const c = cart();
    return `<h2>Calques</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 10px">${LAYERS.map(([k, l]) => `<label class="chk"><input type="checkbox" data-ly="${k}"${on(k) ? ' checked' : ''}> ${l}</label>`).join('')}</div>
      <div class="sub">Un calque décoché disparaît du plan, de la coupe, de la vue 3D et du PDF. ${dims().length ? dims().length + ' cote(s) posée(s). <span class="b" data-pu="dimsClear">Tout retirer</span>' : ''}</div>
      <div class="btns" style="justify-content:flex-start"><button class="b${P.tl ? ' on' : ''}" data-pu="dim">Poser des cotes</button><button class="b on" data-pu="pdf">Publier en PDF…</button></div>
      <h2>Cartouche</h2><div class="pf"><label>Lieu</label><input class="inp" data-ct="lieu" value="${esc(c.lieu || '')}"><label>Date du spectacle</label><input class="inp" data-ct="date" value="${esc(c.date || '')}"><label>Dessiné par</label><input class="inp" data-ct="auteur" value="${esc(c.auteur || '')}"><label>Révision</label><input class="inp" data-ct="rev" value="${esc(c.rev || '')}"><label>Remarque</label><input class="inp" data-ct="note" value="${esc(c.note || '')}"></div>`; }
  function pdfDialog(){ ST.modal(`<h1>Publier en PDF</h1><div class="sub">Un dossier à remettre : plans à l'échelle avec cartouche, listes, charges. Les calques décochés n'y figurent pas.</div>
    <div class="pf pfw"><label>Format</label><select data-po2="fmt">${Object.keys(FORMATS).map(k => `<option${k === O.fmt ? ' selected' : ''}>${k}</option>`).join('')}</select><label>Orientation des plans</label><select data-po2="land"><option value="1"${O.land ? ' selected' : ''}>Paysage</option><option value="0"${O.land ? '' : ' selected'}>Portrait</option></select>
      <label>Échelle des plans</label><select data-po2="scale">${[[0, 'Ajustée à la feuille'], [20, '1:20'], [25, '1:25'], [50, '1:50'], [75, '1:75'], [100, '1:100'], [200, '1:200']].map(([v, l]) => `<option value="${v}"${v === O.scale ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    <h2>Pages</h2>${PG.map(([k, l]) => `<label class="chk"><input type="checkbox" data-pg2="${k}"${O.pages[k] ? ' checked' : ''}> ${l}</label>`).join('')}
    <div class="info">Les listes et les charges sortent en A4 portrait. « Ajustée » : l'échelle réelle est écrite dans le cartouche, arrondie à l'échelle usuelle inférieure quand c'est possible.</div>
    <div class="btns"><button class="b" data-a="close">Annuler</button><button class="b on" data-pu="pdfGo">Fabriquer le PDF</button></div>`); }
  document.addEventListener('change', e => { const el = e.target, d = el.dataset; if (!d) return;
    if (d.ly){ e.stopPropagation(); ST.pushUndo('ly', 'Calques'); L()[d.ly] = el.checked; window.PONTS?.layer(); ST.touch(); ST.select(UI.sel.filter(id => { const o = ST.byId(id); return o && !A.layHid(o); })); return; }
    if (d.ct){ e.stopPropagation(); ST.pushUndo('ct' + d.ct, 'Cartouche'); cart()[d.ct] = el.value; ST.touch(true); return; }
    if (d.po2){ O[d.po2] = d.po2 === 'fmt' ? el.value : d.po2 === 'land' ? el.value === '1' : +el.value; A.store.set('pubOpt', O); return; }
    if (d.pg2){ O.pages[d.pg2] = el.checked; A.store.set('pubOpt', O); } }, true);
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pu]'); if (!b) return; const a = b.dataset.pu;
    if (a === 'dim'){ tool(P.tl ? null : 'dim'); return ST.render(); } if (a === 'dimsClear'){ ST.pushUndo(0, 'Retirer les cotes'); S.dims = []; ST.touch(); return ST.render(); }
    if (a === 'pdf') return pdfDialog(); if (a === 'pdfGo'){ $('#modal').style.display = 'none'; return publish(); } });

  // ---------------------------------------------------------------- PDF
  let LIB = null; const lib = () => LIB || (LIB = import('./vendor/pdf-lib.js'));
  const slug = t => (t || 'stagefactory').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stagefactory';
  // Helvetica (WinAnsi) : ce qu'elle ne sait pas écrire est remplacé
  const clean = t => String(t ?? '').replace(/→/g, '->').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/[   ]/g, ' ').replace(/[^\x20-\x7e¡-ÿ–—‘’“”•…Œœ€]/g, '?');
  const MMP = 72 / 25.4, today = () => new Date().toLocaleDateString('fr-CH');
  async function writer(){ const { PDFDocument, StandardFonts, rgb } = await lib(), pdf = await PDFDocument.create(), F = await pdf.embedFont(StandardFonts.Helvetica), B = await pdf.embedFont(StandardFonts.HelveticaBold);
    pdf.setTitle(clean(S.name)); pdf.setCreator('StageFactory'); const INK = rgb(.08, .09, .1), MUT = rgb(.42, .44, .48), COL = { ok: rgb(.1, .5, .28), bad: rgb(.78, .16, .18), unknown: rgb(.72, .45, .05) };
    let page = null, y = 0; const W = 210 * MMP, H = 297 * MMP, M = 16 * MMP; let head = '';
    const foot = () => { const n = pdf.getPageCount(); page.drawText(clean(`${S.name} — ${head} — ${today()} — page ${n}`), { x: M, y: 9 * MMP, size: 7.5, font: F, color: MUT }); page.drawText('StageFactory', { x: W - M - F.widthOfTextAtSize('StageFactory', 7.5), y: 9 * MMP, size: 7.5, font: F, color: MUT }); };
    const add = () => { page = pdf.addPage([W, H]); y = H - M; foot(); }, need = h => { if (!page || y - h < M + 6 * MMP) add(); };
    const wrap = (t, font, size, maxW) => { const out = []; for (const para of clean(t).split('\n')){ let line = ''; for (const w of para.split(' ')){ const tr = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(tr, size) > maxW && line){ out.push(line); line = w; } else line = tr; } out.push(line); } return out; };
    const text = (t, o = {}) => { const size = o.size || 9, font = o.b ? B : F, ind = (o.indent || 0) * MMP; for (const l of wrap(t, font, size, W - 2 * M - ind)){ need(size * 1.35); y -= size * 1.25; page.drawText(l, { x: M + ind, y, size, font, color: o.color || INK }); } y -= (o.gap || 0) * MMP; };
    const rule = () => { need(4 * MMP); y -= 2 * MMP; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: .5, color: MUT }); y -= 1 * MMP; };
    const title = (t, sub) => { head = t; add(); text(t, { size: 16, b: true, gap: 1 }); if (sub) text(sub, { size: 9, color: MUT, gap: 2 }); rule(); };
    // tableau : colonnes en fractions de la largeur ; « r » = aligné à droite
    const table = (cols, rows, o = {}) => { const size = o.size || 8, tw = W - 2 * M, xs = []; let x = M; for (const cdef of cols){ xs.push(x); x += cdef.w * tw; }
      const row = (cells, bold, color) => { const font = bold ? B : F, lines = cells.map((cl, i) => wrap(cl, font, size, cols[i].w * tw - 4)), h = Math.max(...lines.map(l => l.length)) * size * 1.25 + 3; need(h); const y0 = y;
        lines.forEach((ls, i) => ls.forEach((l, k) => { const wd = font.widthOfTextAtSize(l, size); page.drawText(l, { x: cols[i].r ? xs[i] + cols[i].w * tw - 3 - wd : xs[i] + 1, y: y0 - size * 1.1 - k * size * 1.25, size, font, color: color || INK }); })); y = y0 - h; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: bold ? .6 : .25, color: MUT }); };
      row(cols.map(cdef => cdef.l), true); for (const r of rows) row(r.cells || r, false, r.color); y -= 3 * MMP; };
    // feuille de plan : image de la vue et cartouche vectoriel
    const sheet = async (view, label) => { const [a, b] = FORMATS[O.fmt] || FORMATS.A3, wMm = O.land ? Math.max(a, b) : Math.min(a, b), hMm = O.land ? Math.min(a, b) : Math.max(a, b), dpi = wMm > 600 ? 110 : wMm > 430 ? 150 : 200, m = 8, cartH = 22;
      const Wp = Math.round((wMm - 2 * m) / 25.4 * dpi), Hp = Math.round((hMm - 2 * m - cartH) / 25.4 * dpi), sh = PLAN.sheet(view, Wp, Hp, dpi, O.scale), blob = await new Promise(r => sh.canvas.toBlob(r, 'image/png')), img = await pdf.embedPng(new Uint8Array(await blob.arrayBuffer()));
      const pg = pdf.addPage([wMm * MMP, hMm * MMP]), x0 = m * MMP, y0 = m * MMP, w = (wMm - 2 * m) * MMP, ch = cartH * MMP; pg.drawImage(img, { x: x0, y: y0 + ch, width: w, height: (hMm - 2 * m - cartH) * MMP });
      pg.drawRectangle({ x: x0, y: y0, width: w, height: (hMm - 2 * m) * MMP, borderColor: INK, borderWidth: 1 }); pg.drawLine({ start: { x: x0, y: y0 + ch }, end: { x: x0 + w, y: y0 + ch }, thickness: 1, color: INK });
      const c = cart(), cells = [[.34, 'Projet', S.name, 15], [.2, 'Lieu', c.lieu || (A.venue && !A.venue.open ? A.venue.name : '') || '', 10], [.12, 'Date', c.date || '', 10], [.1, 'Échelle', '1:' + sh.denom, 12], [.1, 'Format', O.fmt, 10], [.14, 'Révision', (c.rev ? c.rev + ' — ' : '') + today(), 9]]; let x = x0;
      for (const [fw, l, v, sz] of cells){ const cw = fw * w; pg.drawLine({ start: { x, y: y0 }, end: { x, y: y0 + ch }, thickness: .6, color: INK }); pg.drawText(clean(l).toUpperCase(), { x: x + 5, y: y0 + ch - 10, size: 6.5, font: F, color: MUT }); let s = sz, t = clean(v); while (s > 6 && B.widthOfTextAtSize(t, s) > cw - 10) s -= .5; pg.drawText(t, { x: x + 5, y: y0 + ch - 12 - s * 1.5, size: s, font: B, color: INK }); x += cw; }
      pg.drawText(clean(`${label}${c.auteur ? ' — dessiné par ' + c.auteur : ''}${c.note ? ' — ' + c.note : ''} — cotes en mètres, zéro au nez de scène dans l'axe`), { x: x0 + 5, y: y0 + 5, size: 7.5, font: F, color: MUT }); };
    return { pdf, text, rule, title, table, need, sheet, COL, MUT, INK, get y(){ return y; } };
  }
  const WORD = { ok: 'CONFORME AUX DONNÉES SAISIES', bad: 'À CORRIGER', unknown: 'INCOMPLET' };
  function rigPages(w, full){ const PT = window.PONTS; if (!PT) return; const R = [...PT.results().values()]; if (!R.length){ w.text('Aucun pont dans le projet.', { color: w.MUT }); return; }
    for (const r of R){ const s = r.support; w.need(120); w.text(`${s.name} — pont de ${f(r.lengthM)} m à +${f(s.zMm / 1000)} m — ${r.error ? 'PAS DE CALCUL' : WORD[r.verdict]}`, { size: 10.5, b: true, color: r.error ? w.COL.bad : w.COL[r.verdict], gap: .5 });
      w.text(`Charge totale ${f(r.totalKg, 0)} kg : ${r.count} appareil(s) ${f(r.fixturesKg, 0)} kg, accessoires ${f(r.accessoriesKg, 0)} kg, poids propre ${s.kgPerM > 0 ? f(r.selfKg, 0) + ' kg' : 'INCONNU (compté 0)'}, câblage ${f(r.cableKg, 0)} kg${r.extraKg ? ', charges ajoutées ' + f(r.extraKg, 0) + ' kg' : ''}.`, { indent: 2, gap: 1 });
      if (r.error){ w.text(r.error, { indent: 2, color: w.COL.bad, gap: 3 }); continue; }
      w.table([{ l: 'Point', w: .08 }, { l: 'Position', w: .12, r: 1 }, { l: 'Type', w: .16 }, { l: 'Idéal kg', w: .12, r: 1 }, { l: 'Défavorable kg', w: .15, r: 1 }, { l: 'À retenir kg', w: .13, r: 1 }, { l: 'Sur bâtiment kg', w: .13, r: 1 }, { l: 'Capacité kg', w: .11, r: 1 }],
        r.points.map((p, i) => { const src = s.points.find(q => q.id === p.id) || {}; return { cells: [String(i + 1), f(p.alongMm / 1000) + ' m', src.leg ? 'tour' : p.kind === 'hoist' ? 'moteur' + (src.cls ? ' ' + src.cls : '') : 'point fixe', f(p.kg, 0), f(p.worstKg, 0), p.uplift ? 'détendu' : f(p.designKg, 0) + ` (${f(p.designKg * 0.00980665)} kN)`, src.leg ? '—' : f(p.buildingKg, 0) + (p.kind === 'hoist' && p.hoistKg == null ? ' *' : ''), p.capacityKg != null ? f(p.capacityKg, 0) : 'inconnue'], color: p.over || p.uplift ? w.COL.bad : undefined }; }));
      if (r.points.some(p => p.kind === 'hoist' && p.hoistKg == null)) w.text('* hors poids du moteur, non renseigné.', { size: 7.5, color: w.MUT, indent: 2 });
      for (const c of r.checks) if (full || c.state !== 'ok') w.text(`[${{ ok: 'OK', bad: 'À CORRIGER', unknown: 'NON VÉRIFIÉ' }[c.state]}] ${c.label} : ${c.detail}`, { indent: 2, size: 8, color: w.COL[c.state] }); w.text('', { gap: 2 }); } }
  function bomPage(w){ const PT = window.PONTS, bom = PT.bom(); if (!bom.lines.length){ w.text('Aucun pont d\'une série de fabricant.', { color: w.MUT }); return; }
    w.table([{ l: 'Série', w: .22 }, { l: 'Élément', w: .36 }, { l: 'Référence', w: .2 }, { l: 'Qté', w: .08, r: 1 }, { l: 'kg pièce', w: .14, r: 1 }], bom.lines.map(l => [l.series, l.item, l.code, String(l.qty), l.kgEach != null ? f(l.kgEach, 1) : 'inconnu']));
    w.text(`Poids total : ${bom.totalKg != null ? f(bom.totalKg, 1) + ' kg' : 'inconnu'}.`, { b: true, gap: 1 }); for (const n of bom.notes) w.text('- ' + n, { size: 8, color: w.MUT, indent: 2 }); }
  function secuPages(w){ const PT = window.PONTS, sf = PT.safety(), q = PT.summary();
    w.text(q.bad ? `${q.bad} point(s) à corriger avant d'accrocher.` : q.unk ? `Rien d'anormal dans ce qui est saisi, mais ${q.unk} vérification(s) incomplète(s) : il manque des données.` : 'Rien d\'anormal dans ce qui est saisi.', { size: 11, b: true, color: q.bad ? w.COL.bad : q.unk ? w.COL.unknown : w.COL.ok, gap: 2 });
    w.text('Ce document est une aide au contrôle. Il ne déclare pas une accroche sûre et ne remplace ni le tableau de charge des fabricants, ni la note de calcul d\'une personne compétente, ni les règles du lieu.', { size: 8.5, gap: 2 });
    w.text('Hypothèses', { size: 11, b: true, gap: 1 });
    for (const l of ['Chaque résultat est calculé par deux méthodes indépendantes et contrôlé par l\'équilibre ; en cas de désaccord aucun chiffre n\'est donné.', `Charges : poids saisi de chaque appareil + ${f(sf.accessoryKg, 1)} kg de crochet et d'élingue par appareil ; poids propre du pont + ${f(sf.cableKgPerM, 1)} kg/m de câblage.`, 'Trois points ou plus : la charge à retenir est le cas défavorable où un point voisin ne porte plus (ou un point sur deux), pas le calcul idéal.', `Moteurs : charge à retenir majorée de ${f(sf.dynFactor, 2)} pour la manœuvre. Valeur réglée par l'utilisateur.`, 'Non pris en compte : hauteur réelle des points, raideur réelle du pont, charpente du lieu, vent, charges horizontales, tours et embases.', sf.peopleBelow ? 'Des personnes passent sous les charges.' : 'Personne ne passe sous les charges (déclaré par l\'utilisateur).']) w.text('- ' + l, { indent: 2, size: 8.5 });
    w.rule(); w.text('Ponts', { size: 11, b: true, gap: 1 }); rigPages(w, true);
    if (q.per.length){ w.rule(); w.text('Perches du lieu (plan de charge séparé : tube, contrainte, flèche)', { size: 11, b: true, gap: 1 }); for (const p of q.per) w.text(`${p.name} : ${f(p.kg, 0)} kg utiles, taux ${Math.round(p.util * 100)} % des limites saisies. ${p.warn.join(' ') || 'Limites à confirmer avec le responsable du lieu.'}`, { indent: 2, size: 8.5, color: p.util > 1 ? w.COL.bad : w.COL.unknown }); }
    w.rule(); w.text('Électricité', { size: 11, b: true, gap: 1 }); w.text(`[${{ ok: 'OK', bad: 'À CORRIGER', unknown: 'NON VÉRIFIÉ' }[q.pw.state]}] ${f(q.pw.totalW / 1000, 1)} kW tout à pleine puissance, soit ${f(q.pw.perPhaseA, 0)} A ${q.pw.phases === 3 ? 'par phase en triphasé équilibré' : 'en monophasé'}. ${q.pw.detail} Estimation sans facteur de puissance ni courants d'appel.`, { indent: 2, color: w.COL[q.pw.state], gap: 2 });
    w.rule(); w.need(200); w.text('Contrôles sur site', { size: 11, b: true, gap: 1 }); for (const [k, l] of PT.SITE_CHECKS) w.text(`[${sf.checklist[k] ? 'x' : '  '}] ${l}`, { indent: 2 });
    w.text('', { gap: 5 }); w.need(60); w.text(`Contrôlé par : ${sf.checkedBy || '........................................'}        Date : ....................        Signature : ........................................`, { size: 9 }); }
  async function save(w, name){ const bytes = await w.pdf.save(); await ST.saveFile(name, bytes); ST.toast('PDF fabriqué : ' + name + ' (' + w.pdf.getPageCount() + ' page(s)).'); return bytes; }
  async function publish(opt){ const o = opt || O.pages; try { ST.toast('Fabrication du PDF…'); const w = await writer(), c = cart();
      if (o.plan) await w.sheet('plan', 'Plan technique'); if (o.coupe) await w.sheet('coupe', 'Coupe longitudinale dans l\'axe');
      const sub = [c.lieu, c.date, c.auteur && 'dessiné par ' + c.auteur, c.rev && 'révision ' + c.rev].filter(Boolean).join(' — ');
      if (o.gear){ w.title('Liste du matériel', sub); const rows = A.rows.gear(); w.table(rows[0].map((l, i) => ({ l: String(l), w: i === 0 ? .17 : i === 1 ? .33 : .5 / (rows[0].length - 2), r: i > 1 })), rows.slice(1).map(r => r.map(String))); }
      if (o.patch){ w.title('Patch DMX', sub); const rows = A.rows.patch(), keep = [0, 1, 2, 3, 4, 5, 6, 7, 11], ws = [.06, .2, .2, .1, .08, .08, .1, .08, .1]; if (rows.length < 2) w.text('Aucun projecteur.', { color: w.MUT }); else w.table(keep.map((k, i) => ({ l: String(rows[0][k]), w: ws[i] })), rows.slice(1).map(r => keep.map(k => String(r[k] ?? '')))); }
      if (o.rig){ w.title('Rigging et charges', sub); rigPages(w, false); w.text('Les lignes « non vérifié » signalent une donnée manquante : rien n\'est comparé tant qu\'elle n\'est pas saisie.', { size: 8, color: w.MUT }); }
      if (o.bom){ w.title('Nomenclature des ponts', sub); bomPage(w); }
      if (o.secu){ w.title('Rapport de sécurité', sub); secuPages(w); }
      if (!w.pdf.getPageCount()) return ST.toast('Aucune page choisie.', true);
      return await save(w, slug(S.name) + (opt && opt.secu && !opt.plan ? '-rapport-securite' : '-dossier') + '.pdf'); } catch (e){ console.error(e); ST.toast('Le PDF n\'a pas pu être fabriqué : ' + (e.message || e), true); } }
  Object.assign(P, { tool, docHtml, pdfDialog, publish, safetyPdf: () => publish({ secu: true }), busy: () => !!P.tl, sync: () => { if (window.PLAN) PLAN.P.dirty = true; }, on, LAYERS });
  window.PUB = P;
}
