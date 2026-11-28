// Bibliothèque : fenêtre détachable, listes déroulantes Catégorie / Constructeur, glisser un modèle dans la vue 3D ou sur le plan.
// Le contenu lui-même (vues, groupes, tri, favoris, fiche) est écrit par libHtml() dans stage.js ; ici : la fenêtre, les gestes, le style.
export function initLibWin(A, ST){
  const UI = ST.UI, $ = s => document.querySelector(s), box = Object.assign({ on: false, x: 90, y: 110, w: 620, h: 520 }, A.store.get('libwin', null) || {}), save = () => A.store.set('libwin', box);
  const css = document.createElement('style'); css.textContent = `
  .lorig{display:block;color:var(--text-muted,#a3abb8);font-size:10.5px;line-height:1.3;margin-top:1px}.lorig i,.lorigleg i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px}.lorigleg{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:11px;color:var(--text-muted,#a3abb8);margin:4px 0 6px}.lorigleg b{color:var(--text,#e8eaee);font-weight:600;margin-right:3px}
  .libx{display:flex;gap:12px;align-items:flex-start}.libx .libmain{flex:1 1 0;min-width:0}.libx .libside{flex:0 0 300px;max-width:42%;position:sticky;top:0;max-height:100%;overflow:auto}.libx .libside .info{margin:0}.libx .libside img.big{max-width:100%}
  .libx .libx-x{float:right;cursor:pointer;color:var(--mute);padding:2px 6px;position:relative;z-index:1}.libx .libx-x:hover{color:var(--ink)}
  .libtop{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}.libtop #libQ{flex:1 1 200px;min-width:140px;background:rgba(255,255,255,.06);color:inherit;border:1px solid #4a505c;border-radius:6px;padding:7px 10px;font:inherit}.libtop select{width:auto;min-width:118px;max-width:230px;flex:0 1 auto;padding:5px 6px}#libWin .libtop [data-a=libwin]{display:none}.libtop select:disabled{opacity:.45}
  .libmenu{position:relative}.libmenu summary{list-style:none;cursor:pointer;display:inline-block}.libmenu summary::-webkit-details-marker{display:none}
  .libpop{position:absolute;right:0;top:calc(100% + 4px);z-index:30;min-width:250px;background:var(--panel,#1d2027);border:1px solid var(--line);border-radius:8px;padding:6px;box-shadow:0 12px 30px rgba(0,0,0,.55);display:flex;flex-direction:column}
  .libpop b{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);padding:7px 8px 2px;font-weight:500}.libpop button{all:unset;cursor:pointer;padding:4px 8px;border-radius:5px;font-size:12.5px}.libpop button:hover{background:#262a33}.libpop button.on{color:var(--accent2,#f2a93b)}
  .libx h2.libg{cursor:pointer;margin:8px 0 4px;font-size:12px;display:flex;gap:6px;align-items:baseline;border-top:1px solid rgba(255,255,255,.06);padding-top:6px}.libx h2.libg small{color:var(--mute);font-weight:400}.libx h2.libg:hover{color:var(--accent2,#f2a93b)}
  .libx .lib .th{position:relative}.libx .lst{position:absolute;right:4px;top:2px;font-style:normal;font-size:14px;line-height:1;color:var(--mute);opacity:0;cursor:pointer;padding:2px}.libx .th:hover .lst,.libx .lst.on{opacity:1}.libx .lst.on{color:var(--accent2,#f2a93b)}
  .libx .lbd{position:absolute;right:6px;bottom:3px;font-style:normal;font-size:10px;color:#14161a;background:var(--accent2,#f2a93b);border-radius:8px;padding:0 6px;font-weight:600}
  .libx .lib.sm{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))!important;gap:4px}.libx .lib.sm .th{padding:4px 5px;font-size:11px}.libx .lib.sm .th img{width:30px;height:30px}
  .libx .lib.dec button{position:relative}.libx .lib.dec button:hover .lst{opacity:1}
  .libx table.libt{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px}.libx .libt th{text-align:left;color:var(--mute);font-weight:500;padding:3px 7px;border-bottom:1px solid var(--line);white-space:nowrap}.libx .libt th[data-a]{cursor:pointer}.libx .libt th[data-a]:hover{color:var(--ink)}
  .libx .libt td{padding:3px 7px;border-top:1px solid rgba(255,255,255,.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}.libx .libt .r{text-align:right}.libx .libt .mu{color:var(--mute)}.libx .libt tr[data-a]{cursor:pointer}.libx .libt tr[data-a]:hover{background:#262a33}.libx .libt tr.on{background:rgba(242,169,59,.16);color:#fff}
  .libx .libt .lst{position:static;opacity:.45}.libx .libt tr:hover .lst,.libx .libt .lst.on{opacity:1}
  #libWin{position:fixed;z-index:14;display:none;flex-direction:column;background:var(--panel,#1d2027);border:1px solid var(--line);border-radius:10px;box-shadow:0 14px 40px rgba(0,0,0,.6);color:var(--ink);font-size:12px;min-width:340px;min-height:220px}
  #libWin.on{display:flex}#libWin .lw-bar{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--line);cursor:move;user-select:none;font-weight:600}#libWin .lw-bar span{flex:1}#libWin .lw-bar a{cursor:pointer;color:var(--mute);font-weight:400}#libWin .lw-bar a:hover{color:var(--ink)}
  #libWin .lw-body{flex:1;overflow:auto;padding:8px 12px 12px}#libWin .lw-body .lib{grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}#libWin h2{margin:10px 0 4px}#libWin .pf{max-width:560px}
  #libWin .lw-rs{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,var(--mute) 50%,var(--mute) 60%,transparent 60%,transparent 72%,var(--mute) 72%,var(--mute) 82%,transparent 82%)}
  body.cine #libWin,body.ext3d #libWin{display:none!important}
  .lib-drop{outline:2px dashed var(--accent2,#f2a93b)!important;outline-offset:-3px}`; document.head.appendChild(css);
  // ---------------------------------------------------------------- fenêtre
  const win = document.createElement('div'); win.id = 'libWin'; win.innerHTML = '<div class="lw-bar"><span>Bibliothèque</span><a data-lw="dock" title="Remettre la bibliothèque dans le tiroir du bas">⇲ Ancrer</a></div><div class="lw-body"></div><div class="lw-rs" title="Redimensionner"></div>'; document.body.appendChild(win);
  const body = win.querySelector('.lw-body'); A.bindPanel(body);
  const fit = () => { box.w = Math.max(340, Math.min(box.w, innerWidth - 20)); box.h = Math.max(220, Math.min(box.h, innerHeight - 60)); box.x = Math.max(0, Math.min(box.x, innerWidth - 80)); box.y = Math.max(40, Math.min(box.y, innerHeight - 60)); Object.assign(win.style, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' }); };
  let lastH = '';
  function refresh(){ win.classList.toggle('on', box.on); if (!box.on){ if (lastH){ body.innerHTML = ''; lastH = ''; } return; } const a = document.activeElement; if (body.contains(a) && a.id === 'libQ' && lastH){ /* pendant la frappe, stage.js redessine puis rend le curseur */ } let h = ''; try { h = ST.libHtml(); } catch (e){ console.error(e); h = '<div class="info">La bibliothèque n\'a pas pu s\'afficher.</div>'; } if (h === lastH) return; const st = body.scrollTop, mo = body.querySelector('.libmenu')?.open; body.innerHTML = h; lastH = h; body.scrollTop = st; if (mo) void 0; }
  function toggle(v){ box.on = v == null ? !box.on : !!v; if (box.on) fit(); save(); refresh(); window.DRAWER?.refresh(); ST.render(); }
  win.querySelector('[data-lw=dock]').addEventListener('click', () => toggle(false));
  for (const [sel, kind] of [['.lw-bar', 'move'], ['.lw-rs', 'size']]){ const h = win.querySelector(sel); let d = null;
    h.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('[data-lw]') || document.body.classList.contains('dv')) return; e.preventDefault(); d = { x: e.clientX, y: e.clientY, b: { ...box } }; h.setPointerCapture(e.pointerId); });
    h.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (kind === 'move'){ box.x = d.b.x + dx; box.y = d.b.y + dy; } else { box.w = d.b.w + dx; box.h = d.b.h + dy; } fit(); });
    const end = () => { if (d){ d = null; save(); } }; h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end); }
  win.addEventListener('pointerdown', () => { win.style.zIndex = 15; }, true);
  addEventListener('resize', () => { if (box.on) fit(); });
  // ---------------------------------------------------------------- listes déroulantes ; le menu Affichage se referme au clic ailleurs
  document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.lv; if (!k) return; if (k === 'cat'){ UI.libCat = e.target.value; UI.libBrand = ''; UI.libOpen = {}; } else if (k === 'brand'){ UI.libBrand = e.target.value; UI.libOpen = {}; } ST.render(); window.DRAWER?.refresh(); });
  document.addEventListener('pointerdown', e => { for (const m of document.querySelectorAll('.libmenu[open]')) if (!m.contains(e.target)) m.open = false; }, true);
  // ---------------------------------------------------------------- glisser un modèle dans la vue 3D ou sur le plan
  let dragId = null; const zone = e => { if (!dragId) return null; const t = e.target; if (t === A.canvas) return ['3d', t]; const p = t.closest && t.closest('#plan2d'); return p ? ['plan', p] : null; }, clear = () => document.querySelectorAll('.lib-drop').forEach(x => x.classList.remove('lib-drop'));
  document.addEventListener('dragstart', e => { const t = e.target.closest && e.target.closest('.libx [data-a=pick][data-id]'); if (!t) return; dragId = t.dataset.id; e.dataTransfer.effectAllowed = 'copy'; try { e.dataTransfer.setData('text/plain', dragId); } catch (_){ } });
  document.addEventListener('dragover', e => { const z = zone(e); if (!z) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!z[1].classList.contains('lib-drop')){ clear(); z[1].classList.add('lib-drop'); } });
  document.addEventListener('dragleave', e => { if (dragId && e.target.classList && e.target.classList.contains('lib-drop')) e.target.classList.remove('lib-drop'); });
  document.addEventListener('dragend', () => { dragId = null; clear(); });
  document.addEventListener('drop', e => { const z = zone(e); clear(); if (!z) return; e.preventDefault(); const id = dragId; dragId = null; dropAt(z[0], e, id); });
  function dropAt(where, e, id){
    if (where === '3d'){ if (A.mode === 'walk') return ST.toast('Passe en vue Orbite ou Plan pour poser du matériel.', true); if (!ST.dropAt(e, id)) ST.toast('Rien sous le pointeur pour poser ce matériel.', true); return; }
    if (window.PLAN && PLAN.P.view !== 'plan') return ST.toast('Glisse le matériel sur la vue de dessus (Plan), pas sur la coupe.', true);
    const [x, z] = PLAN.world(e), blk = ST.blkType(id); if (blk){ ST.placeBlock(id, ST.blkCells(blk, [x, z])); } else { const pi = ST.percheNear(x, z); ST.placeSeries(id, [[x, pi >= 0 ? A.PERCHES[pi].z : z]], pi); } ST.render(); PLAN.draw && PLAN.draw(); }
  window.LIBWIN = { get on(){ return box.on; }, toggle, refresh, box, dropAt };
  if (box.on){ fit(); refresh(); window.DRAWER?.refresh(); }
}
