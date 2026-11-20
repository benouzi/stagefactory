// Tiroir du bas, comme dans ScenoFactory : Patch, Bibliothèque, Liste, Rigging et charges, Sécurité, Console, Avertissements.
// L'Inspecteur (à droite ou à gauche) ne garde que les réglages de la sélection et le projet.
export function initDrawer(A, ST){
  const $ = s => document.querySelector(s), S = ST.S, UI = ST.UI, esc = ST.esc, root = document.documentElement;
  const D = Object.assign({ open: true, h: 270, tab: 'lib' }, A.store.get('drawer') || {}), save = () => A.store.set('drawer', { open: D.open, h: D.h, tab: D.tab });
  const TABS = [['patch', 'Patch'], ['lib', 'Bibliothèque'], ['list', 'Liste des objets'], ['rig', 'Rigging et charges'], ['secu', 'Sécurité'], ['con', 'Console'], ['warn', 'Avertissements']];
  const css = document.createElement('style'); css.textContent = `
  #drawer{position:fixed;bottom:25px;z-index:6;display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-bottom:0;border-radius:6px 6px 0 0;overflow:hidden}
  #drawer .dr-tabs{display:flex;align-items:center;gap:2px;height:30px;flex:0 0 30px;padding:0 6px;border-bottom:1px solid var(--line);overflow:auto hidden;scrollbar-width:none;user-select:none}
  #drawer .dr-tabs button{background:none;border:0;color:var(--mute);font:500 12px Inter,system-ui,sans-serif;padding:0 10px;height:30px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent}
  #drawer .dr-tabs button:hover{color:var(--ink)} #drawer .dr-tabs button.on{color:var(--ink);border-bottom-color:var(--accent,#f2a93b)} #drawer .dr-tabs .n{display:inline-block;min-width:15px;padding:0 4px;margin-left:5px;border-radius:8px;background:#e5484d;color:#fff;font-size:10px;line-height:15px;text-align:center}
  #drawer .dr-tabs .n.u{background:#f0a23c;color:#14161a}
  #drBody{flex:1;overflow:auto;padding:8px 12px 12px;font-size:12px} #drGrip{position:absolute;left:0;right:0;top:-3px;height:7px;cursor:ns-resize;z-index:2}
  #drawer.min #drBody{display:none} #drawer .lib{grid-template-columns:repeat(auto-fill,minmax(180px,1fr))} #drawer .olist{max-height:none}
  #drawer h2{margin:10px 0 4px} #drawer h2:first-child{margin-top:0} #drawer .pf{max-width:560px}
  #drawer table.t{width:100%;border-collapse:collapse} #drawer table.t th{position:sticky;top:-8px;background:var(--panel);z-index:1} .pa-t td:nth-child(3){white-space:nowrap;max-width:190px;overflow:hidden;text-overflow:ellipsis}
  .pa-t input,.pa-t select{background:var(--bg,#15171c);color:var(--ink);border:1px solid var(--line);border-radius:4px;padding:2px 4px;font:inherit;width:100%;box-sizing:border-box} .pa-t input[type=number]{width:64px} .pa-t tr.bad td{color:#ff8f8f} .pa-t tr.sel td{background:rgba(242,169,59,.10)} .pa-t td{cursor:default}
  body.desk #drawer,body.cine #drawer,body.ext3d #drawer{display:none}
  body.drw:not(.desk) #planWin:not(.fl){bottom:calc(var(--drh,30px) + 30px)!important} body.drw:not(.desk) #hud,body.drw:not(.desk) #aiPanel,body.drw:not(.desk) #audPanel{bottom:calc(var(--drh,30px) + 34px)!important} body.drw:not(.desk) #toast{bottom:calc(var(--drh,30px) + 44px)!important}`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'drawer'; el.innerHTML = '<div id="drGrip"></div><div class="dr-tabs"></div><div id="drBody"></div>'; document.body.appendChild(el); document.body.classList.add('drw');
  const body = el.querySelector('#drBody'), tabs = el.querySelector('.dr-tabs');
  A.bindPanel(body);
  const f = (v, d = 0) => (+v).toFixed(d).replace('.', ',');

  // ---------------------------------------------------------------- Patch
  function patchHtml(){ const bad = ST.conflicts(), os = S.objs.filter(o => ST.typeOf(o).cat === 'lum').sort((a, b) => (a.uni - b.uni) || ((a.addr || 9999) - (b.addr || 9999)) || (a.n - b.n));
    if (!os.length) return '<div class="info">Aucun projecteur dans le projet. Le patch se remplit à mesure que tu en poses : chaque projecteur reçoit la première adresse libre de son univers.</div>';
    const unis = [...new Set(os.map(o => o.uni))].sort((a, b) => a - b).map(u => { const l = os.filter(o => o.uni === u), used = l.reduce((s, o) => s + ST.modeCh(o), 0); return `U${u} : ${used}/512`; }).join(' · ');
    return `<div class="sub" style="margin:0 0 6px">${os.length} projecteur(s) · ${unis}${bad.size ? ` · <b style="color:#ff8f8f">${bad.size} en conflit d'adresse</b>` : ''}. Le DMX sort tel qu'il est patché ici.</div>
    <table class="t pa-t"><tr><th>N°</th><th>Nom</th><th>Type</th><th>Mode</th><th>Univers</th><th>Adresse</th><th>Canaux</th><th>Jusqu'à</th><th>Groupe</th><th>Accroche</th></tr>
    ${os.map(o => { const t = ST.typeOf(o), ch = ST.modeCh(o); return `<tr class="${bad.has(o.id) ? 'bad' : ''}${UI.sel.includes(o.id) ? ' sel' : ''}" data-dsel="${o.id}"><td><input type="number" min="0" step="1" data-dp="n" data-id="${o.id}" value="${o.n}"></td><td><input type="text" data-dp="name" data-id="${o.id}" value="${esc(o.name)}"></td><td>${esc((t.brand ? t.brand + ' ' : '') + t.name)}</td>
      <td>${t.modes.length > 1 ? `<select data-dp="mode" data-id="${o.id}">${t.modes.map((m, i) => `<option value="${i}"${i === (o.mode || 0) ? ' selected' : ''}>${esc(m[0])} (${m[1]})</option>`).join('')}</select>` : esc(t.modes[0][0])}</td>
      <td><input type="number" min="1" max="64" step="1" data-dp="uni" data-id="${o.id}" value="${o.uni}"></td><td><input type="number" min="0" max="512" step="1" data-dp="addr" data-id="${o.id}" value="${o.addr || ''}" placeholder="—"></td><td class="mono">${ch}</td><td class="mono">${o.addr ? o.addr + ch - 1 : '—'}</td>
      <td><input type="text" data-dp="grp" data-id="${o.id}" value="${esc(o.grp || '')}"></td><td>${o.hang === 'perche' ? 'Perche ' + ((o.pi ?? 0) + 1) : o.hang === 'pont' ? esc(window.PONTS ? PONTS.nameOf(o.sid) : 'Pont') : o.hang ? 'Fixe' : 'Sol'}</td></tr>`; }).join('')}</table>`; }
  body.addEventListener('change', e => { const el2 = e.target, k = el2.dataset && el2.dataset.dp; if (!k) return; e.stopPropagation(); const o = ST.byId(el2.dataset.id); if (!o) return; ST.pushUndo('patch' + k + o.id, 'Patch');
    if (k === 'name' || k === 'grp') o[k] = el2.value; else if (k === 'mode'){ o.mode = +el2.value || 0; } else o[k] = Math.max(k === 'uni' ? 1 : 0, Math.min(k === 'addr' ? 512 : 9999, parseInt(el2.value) || 0)); ST.touch(); A.keepFocus(ST.render); }, true);
  body.addEventListener('click', e => { const r = e.target.closest && e.target.closest('[data-dsel]'); if (!r || /INPUT|SELECT/.test(e.target.tagName)) return; const id = r.dataset.dsel; ST.select(e.shiftKey || e.ctrlKey ? [...new Set([...UI.sel, id])] : [id]); });

  // ---------------------------------------------------------------- Avertissements
  function warnings(){ const out = [], P = window.PONTS, bad = ST.conflicts();
    if (bad.size) out.push(['bad', 'DMX', `${bad.size} projecteur(s) en conflit d'adresse.`, 'patch']);
    const noAd = S.objs.filter(o => ST.typeOf(o).cat === 'lum' && !o.addr).length; if (noAd) out.push(['unk', 'DMX', `${noAd} projecteur(s) sans adresse.`, 'patch']);
    if (P){ for (const r of P.results().values()){ const s = r.support; if (r.error && (r.count || (s.points || []).length < 2)) out.push(['bad', s.name, r.error, 'rig', s.id]); else if (!r.error) for (const c of r.checks) if (c.state === 'bad') out.push(['bad', s.name, c.label + ' — ' + c.detail, 'rig', s.id]);
        if (!(s.kgPerM > 0)) out.push(['unk', s.name, 'Poids propre du pont inconnu : compté pour 0.', 'rig', s.id]); if (r.count && s.allowableKg == null) out.push(['unk', s.name, 'Charge admissible non saisie : rien n\'est comparé.', 'rig', s.id]); } }
    if (window.RIG && RIG.all) RIG.all().forEach((q, i) => { if (A.PERCHES[i].off || !q.n) return; for (const w of q.warn) out.push(['bad', 'Perche ' + (i + 1), w, 'perche', i]); });
    const noW = S.objs.filter(o => o.hang && !(ST.weightOf(o) > 0)); if (noW.length) out.push(['unk', 'Poids', `${noW.length} objet(s) accroché(s) sans poids connu : ${noW.slice(0, 6).map(o => o.name).join(', ')}${noW.length > 6 ? '…' : ''}.`, 'list']);
    try { const pk = window.PARC && PARC.libList && PARC.libList(); if (pk) for (const q of pk.types) if (q.placed > q.qty) out.push(['bad', 'Parc', `${q.t.name} : ${q.placed} posés pour ${q.qty} au parc.`, 'lib']); } catch (_){ }
    return out; }
  function warnHtml(){ const w = warnings(); if (!w.length) return '<div class="info" style="border:1px solid #3fb97a">Aucun avertissement dans ce qui est saisi.</div>';
    return w.map(([lv, who, msg, go, id]) => `<div class="ck" data-dgo="${go}" data-id="${id ?? ''}" style="cursor:pointer"><i style="background:${lv === 'bad' ? '#e5484d' : '#f0a23c'}"></i><span><b>${esc(who)}</b> — ${esc(msg)}</span></div>`).join(''); }
  body.addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-dgo]'); if (!g) return; const go = g.dataset.dgo, id = g.dataset.id; if (go === 'perche') return window.RIG?.open?.(+id || 0); if (go === 'rig' && id) window.PONTS?.select(id); open(go); });

  const HTML = { patch: patchHtml, lib: () => A.panelHtml.lib(), list: () => window.WS ? WS.listHtml() : '', rig: () => window.PONTS ? PONTS.rigHtml() : '<div class="info">Chargement…</div>', secu: () => window.PONTS ? PONTS.secuHtml() : '<div class="info">Chargement…</div>', con: () => A.panelHtml.con(), warn: warnHtml };
  function drawTabs(){ const w = warnings(), nb = w.filter(x => x[0] === 'bad').length, nu = w.length - nb;
    tabs.innerHTML = TABS.map(([k, l]) => `<button data-dt="${k}" class="${D.open && D.tab === k ? 'on' : ''}">${l}${k === 'warn' && w.length ? `<span class="n${nb ? '' : ' u'}">${nb || nu}</span>` : ''}</button>`).join('') + `<span style="flex:1"></span><button data-dt="_" title="${D.open ? 'Replier le tiroir' : 'Ouvrir le tiroir'}">${D.open ? '▾' : '▴'}</button>`; }
  function refresh(only){ drawTabs(); if (!D.open || (only && !only.includes(D.tab))) return; const a = document.activeElement; if (body.contains(a) && a.tagName === 'INPUT' && /text|number|search/.test(a.type) && only) return;
    const st = body.scrollTop, keep = body.contains(a) && a.dataset ? [a.dataset.dp || a.dataset.sf || a.dataset.ws, a.dataset.id] : null; let h = ''; try { h = HTML[D.tab](); } catch (e){ console.error(e); h = '<div class="info">Ce volet n\'a pas pu s\'afficher.</div>'; }
    if (keep && keep[0] === 'q') { const b2 = body.querySelector('#olBody'); if (b2) return; } body.innerHTML = h; body.scrollTop = st; }
  const h = () => document.body.classList.contains('desk') ? 0 : D.open ? D.h : 30;
  function place(x, w){ el.style.left = x + 'px'; el.style.width = w + 'px'; el.style.height = h() + 'px'; el.classList.toggle('min', !D.open); root.style.setProperty('--drh', h() + 'px'); }
  const relayout = () => { window.DOCK ? DOCK.layout() : dispatchEvent(new Event('resize')); window.PLAN?.draw?.(); };
  function show(t){ if (HTML[t]) D.tab = t; const was = D.open; D.open = true; save(); if (!was) relayout(); }
  function open(t){ show(t); refresh(); if (el.offsetHeight < 60) relayout(); }
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-dt]'); if (!b) return; const k = b.dataset.dt; if (k === '_' || (D.open && k === D.tab)){ D.open = !D.open; save(); relayout(); refresh(); return; } open(k); });
  el.querySelector('#drGrip').addEventListener('pointerdown', e => { e.preventDefault(); const g = e.currentTarget; g.setPointerCapture(e.pointerId); const mv = ev => { D.h = Math.round(Math.max(120, Math.min(innerHeight - 160, innerHeight - 25 - ev.clientY))); D.open = true; relayout(); }, up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); save(); refresh(); }; g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); });
  window.DRAWER = { D, refresh, show, open, place, h, is: k => D.open && D.tab === k, warnings, get tab(){ return D.open ? D.tab : null; } };
  if (innerHeight < 640) D.open = false;
  relayout(); ST.render();
}
