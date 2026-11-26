// Panneaux ancrables (Dockview, MIT — vendor/dockview-core.min.js) : UN seul système pour toutes les fenêtres de travail.
// Chaque panneau se glisse par son onglet : sur un bord d'un autre panneau (il s'aimante à côté), sur ses onglets (il s'empile), ou dans le vide (il flotte).
// La disposition est gardée, et on peut en enregistrer plusieurs (bouton « ▦ » de la barre du haut).
//
// Comment c'est branché :
//  - les panneaux existants (#console, #side, #planWin, #drawer, #libWin, #olWin) sont DÉPLACÉS dans le contenu de leur panneau Dockview (classe .dvin :
//    ils remplissent le panneau) ; leurs identifiants et leurs écouteurs ne changent pas ;
//  - la vue 3D n'est pas déplacée : son panneau est un trou transparent, et le canevas plein écran derrière suit son rectangle (--vx, --vw, --vr, --vhh).
//    Elle doit donc rester en haut, seule dans son groupe, jamais flottante : une disposition qui casserait ça est refusée (retour à la précédente) ;
//  - l'état de l'application reste la référence : un panneau existe si son état est « ouvert » (A.toggleConsole, A.toggleSide, PLAN.toggle, LIBWIN, OBJLIST) ;
//    fermer un onglet éteint cet état, et inversement (reconcile()).
// Mode d'origine (anciennes fenêtres) : A.store 'dv' = false, puis recharger (PANELS.legacy()).
export function initPanels(A, ST){
  const $ = s => document.querySelector(s), body = document.body, root = document.documentElement, UI = ST.UI;
  const ON = A.store.get('dv', true) !== false;
  if (!ON){ window.PANELS = { on: false, enable(){ A.store.set('dv', true); location.reload(); } }; return; }
  body.classList.add('dv');
  const sc = document.createElement('script'); sc.src = './vendor/dockview-core.min.js'; const fallback = why => { body.classList.remove('dv'); window.PANELS = { on: false, why }; console.warn('Panneaux : ' + why + ' — anciennes fenêtres.'); window.DOCK && DOCK.layout(); dispatchEvent(new Event('resize')); };
  sc.onload = () => window['dockview-core'] ? wait(0) : fallback('bibliothèque Dockview absente'); sc.onerror = () => fallback('bibliothèque Dockview absente'); document.head.appendChild(sc);
  const ready = () => window['dockview-core'] && window.DOCK && window.DRAWER && window.PLAN && PLAN.P && window.LIBWIN && window.OBJLIST && $('#libWin') && $('#olWin') && $('#drawer') && $('#v3Bar');
  function wait(n){ if (ready()) return start(); if (n > 200) return fallback('modules manquants'); setTimeout(() => wait(n + 1), 100); }
  window.PANELS = { on: true, ready: false };

  function start(){
    const DV = window['dockview-core'];
    const css = document.createElement('style'); css.textContent = `
    #dvRoot{position:fixed;top:50px;bottom:27px;z-index:9;pointer-events:none;font-size:12px}
    #dvRoot,#dvRoot[class*=dockview-theme],#dvRoot [class*=dockview-theme]{--dv-group-view-background-color:var(--panel,#1d2027);--dv-tabs-and-actions-container-background-color:var(--bg,#15171c);--dv-tabs-and-actions-container-height:27px;--dv-tabs-and-actions-container-font-size:12px;
      --dv-activegroup-visiblepanel-tab-background-color:var(--panel,#1d2027);--dv-activegroup-visiblepanel-tab-color:var(--accent2,#f2a93b);--dv-inactivegroup-visiblepanel-tab-background-color:var(--panel,#1d2027);--dv-inactivegroup-visiblepanel-tab-color:var(--ink,#e9ebf0);
      --dv-activegroup-hiddenpanel-tab-background-color:transparent;--dv-inactivegroup-hiddenpanel-tab-background-color:transparent;--dv-activegroup-hiddenpanel-tab-color:var(--mute,#a3abb8);--dv-inactivegroup-hiddenpanel-tab-color:var(--mute,#a3abb8);
      --dv-separator-border:var(--line,#2c313b);--dv-paneview-header-border-color:var(--line,#2c313b);--dv-drag-over-background-color:rgba(242,169,59,.22);--dv-drag-over-border-color:var(--accent2,#f2a93b);--dv-active-sash-color:var(--accent2,#f2a93b);--dv-floating-box-shadow:0 14px 40px rgba(0,0,0,.6)}
    #dvRoot .dv-dockview,#dvRoot .dv-grid-view,#dvRoot .dv-split-view-container,#dvRoot .dv-view,#dvRoot .dv-view-container,#dvRoot .dv-branch-node{background:transparent!important}
    #dvRoot .dv-groupview,#dvRoot .dv-sash,#dvRoot .dv-resize-container,#dvRoot .dv-edge-tool-window,#dvRoot .dv-render-overlay{pointer-events:auto}
    #dvRoot .dv-groupview.dv3d,#dvRoot .dv-groupview.dv3d *{pointer-events:none;background:transparent!important}
    body.dvdrag #dvRoot,body.dvdrag #dvRoot .dv-groupview.dv3d,body.dvdrag #dvRoot .dv-groupview.dv3d *{pointer-events:auto}
    #dvRoot .dv-groupview{border:1px solid var(--line,#2c313b);box-sizing:border-box}#dvRoot .dv-groupview.dv3d{border-color:transparent}
    #dvRoot .dv-tab{padding:0 8px}#dvRoot .dvp{position:relative;width:100%;height:100%;overflow:hidden}
    body.dv #console.dvin.dvin.dvin.dvin,body.dv #side.dvin.dvin.dvin.dvin,body.dv #planWin.dvin.dvin.dvin.dvin,body.dv #libWin.dvin.dvin.dvin.dvin,body.dv #olWin.dvin.dvin.dvin.dvin{position:absolute!important;left:0!important;top:0!important;right:0!important;bottom:0!important;width:auto!important;height:auto!important;transform:none!important;margin:0!important;border:0!important;border-radius:0!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;visibility:inherit!important;box-shadow:none!important;z-index:auto!important}          /* visibility:inherit — Dockview cache le contenu d'un onglet inactif par visibility:hidden sur son conteneur ; « visible » le laissait affiché par-dessus l'onglet actif */
    body.dv #planWin.dvin.dvin.dvin.dvin,body.dv #libWin.dvin.dvin.dvin.dvin,body.dv #olWin.dvin.dvin.dvin.dvin{display:flex!important}body.dv #console.dvin.dvin.dvin.dvin,body.dv #side.dvin.dvin.dvin.dvin{display:block!important;overflow:auto!important}
    body.dv .dockSw,body.dv #planGrip,body.dv #conGrip,body.dv .wpill,body.dv #drGrip,body.dv #libWin .lw-bar,body.dv #libWin .lw-rs,body.dv #olWin .ow-rs,body.dv #olWin .ow-bar span,body.dv #olWin [data-ow=x],body.dv [data-a=libwin],body.dv #planWin .ph > b{display:none!important}
    body.dv #olWin .ow-bar{cursor:default;justify-content:flex-end;padding:3px 10px}body.dv #drawer.min #drBody{display:block}
    body.dv.desk #dvRoot{bottom:calc(var(--dh,310px) + 30px)}
    body.dv #drawBar,body.dv #pontBar,body.dv #gzTip,body.dv #vpTip,body.dv #scTip{z-index:10}body.dv #drawBar,body.dv #pontBar{top:auto!important;bottom:calc(100vh - var(--vhh,100vh) + 8px)}          /* barres du dessin et des ponts : en bas de la zone 3D + plan (en haut elles couvriraient la rangée Plan / Coupe / Face) */
    #dvRoot .dvact{display:flex;align-items:center;height:100%;padding:0 6px}#dvRoot .dvact a{cursor:pointer;color:var(--mute,#a3abb8);font-size:12px;padding:2px 6px;border-radius:4px;white-space:nowrap}#dvRoot .dvact a:hover{color:var(--ink,#e9ebf0);background:rgba(255,255,255,.08)}#dvRoot .dvact a[data-dva=dock]{color:var(--accent2,#f2a93b)}
    #dvBtn.on{color:var(--accent2,#f2a93b)}@media (max-width:1420px){body.dv #olBtn{display:none}}#dvPop,#dvPlace{position:fixed;z-index:40;min-width:230px;background:var(--panel,#1d2027);border:1px solid var(--line);border-radius:8px;padding:6px;box-shadow:0 12px 30px rgba(0,0,0,.55);display:none;flex-direction:column;font-size:12.5px;color:var(--ink)}
    #dvPop b{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);padding:7px 8px 2px;font-weight:500}#dvPop button,#dvPlace button{all:unset;cursor:pointer;padding:4px 8px;border-radius:5px;display:flex;gap:8px;align-items:center}#dvPop button:hover,#dvPlace button:hover{background:#262a33}#dvPop button.on{color:var(--accent2,#f2a93b)}#dvPop button i{margin-left:auto;font-style:normal;color:var(--mute);padding:0 4px}#dvPop button i:hover{color:#ff8f8f}`; document.head.appendChild(css);
    const host = document.createElement('div'); host.id = 'dvRoot'; body.appendChild(host);
    const railRight = window.DOCK && DOCK.D && DOCK.D.rail === 'right'; host.style.left = railRight ? '4px' : '54px'; host.style.right = railRight ? '54px' : '4px';
    /* les onglets de l'ancien tiroir du bas sont chacun un panneau : par défaut ils sont rangés ensemble en bas, dans l'ordre d'avant, et chacun se détache */
    const DT = (window.DRAWER && DRAWER.DT) || [], BOT = ['patch', 'lib', 'objs', 'rig', 'secu', 'con', 'warn'];
    const EL = { insp: '#console', env: '#side', plan: '#planWin', lib: '#libWin', objs: '#olWin' }, TITLE = { v3d: 'Vue 3D', plan: 'Plan technique', insp: 'Inspecteur', env: 'Environnement', patch: 'Patch', lib: 'Bibliothèque', objs: 'Liste des objets', rig: 'Rigging et charges', secu: 'Sécurité', con: 'Console', warn: 'Avertissements' }, IDS = Object.keys(TITLE);
    const TABS = Object.assign({}, A.store.get('dvTabs', null) || {});
    const side = $('#side'), con = $('#console');
    const STATE = {
      v3d: { get: () => true, set(){} },
      insp: { get: () => !con.classList.contains('hide'), set: v => A.toggleConsole(v) },
      env: { get: () => !side.classList.contains('hide'), set: v => A.toggleSide(!v) },
      plan: { get: () => !!PLAN.P.on, set: v => PLAN.toggle(v) },
      lib: { get: () => !!LIBWIN.on, set: v => LIBWIN.toggle(v) },
      objs: { get: () => !!OBJLIST.winOn, set: v => OBJLIST.win(v) },
    };
    for (const k of DT) STATE[k] = { get: () => TABS[k] !== false, set: v => { TABS[k] = !!v; A.store.set('dvTabs', TABS); } };
    const holders = {}, holder = id => holders[id] || (holders[id] = Object.assign(document.createElement('div'), { className: 'dvp' }));
    /* références gardées : Dockview détache le contenu d'un panneau AVANT de prévenir qu'il est fermé, document.querySelector ne le trouverait plus */
    const REF = {}; for (const id of Object.keys(EL)) REF[id] = $(EL[id]); for (const k of DT) REF[k] = DRAWER.bodyOf(k);
    const mount = id => { const el = REF[id]; holder(id).dataset.p = id; if (el && el.parentNode !== holder(id)){ holder(id).appendChild(el); el.classList.add('dvin'); } };
    const unmount = id => { const el = REF[id]; if (el && (el.classList.contains('dvin') || !el.isConnected)){ el.classList.remove('dvin'); body.appendChild(el); } };
    let busy = 0, api = null;
    // chaque groupe de panneaux a son bouton : ⇱ le faire flotter, ⇲ le remettre à sa place d'origine (toujours possible, même si on ne trouve pas où le lâcher)
    const headBtn = group => { const el = document.createElement('div'); el.className = 'dvact'; let off = null;
      const paint = () => { let fl = false; try { fl = group.api.location.type === 'floating'; } catch (_){ } el.innerHTML = `<a data-dva="${fl ? 'dock' : 'float'}" title="${fl ? 'Ancrer : remettre ce panneau à sa place dans la fenêtre' : 'Détacher : faire flotter ce panneau'}">${fl ? '⇲ Ancrer' : '⇱'}</a><a data-dva="menu" title="Placer ce panneau : en bas, à gauche, à droite, flottant, à sa place d'origine">▾</a>`; };
      el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('click', e => { const t = e.target.closest('[data-dva]'); if (!t) return; e.stopPropagation(); const ids = group.panels.map(q => q.id); if (t.dataset.dva === 'menu') return placeMenu(t, ids, group); if (t.dataset.dva === 'dock') home(ids); else { try { const r = group.element.getBoundingClientRect(); api.addFloatingGroup(group, { x: Math.max(60, Math.round(r.left + 30 - host.getBoundingClientRect().left)), y: Math.max(40, Math.round(r.top - 80 - host.getBoundingClientRect().top)), width: Math.max(360, Math.min(700, Math.round(r.width))), height: Math.max(260, Math.min(520, Math.round(r.height))) }); } catch (er){ console.error(er); } } later(); });
      return { element: el, init(){ paint(); try { const d = group.api.onDidLocationChange(paint); off = () => d.dispose(); } catch (_){ } }, dispose(){ off && off(); } }; };
    api = DV.createDockview(host, { theme: DV.themeAbyss, floatingGroupBounds: 'boundedWithinViewport', singleTabMode: 'default', createRightHeaderActionComponent: headBtn,
      dndEdges: { size: { value: 120, type: 'pixels' }, activationSize: { value: 56, type: 'pixels' } },
      createComponent: o => ({ element: holder(o.id), init(){ mount(o.id); }, dispose(){ unmount(o.id); } }) });
    const has = id => api.getPanel(id);
    function add(id){ if (has(id)) return; const P = { id, component: id, title: TITLE[id], ...(id === 'v3d' ? {} : { renderer: 'always' }) };          /* 'always' : le contenu reste dans la page même quand son onglet est caché (le reste du logiciel y écrit par son identifiant) */ let pos = null, ex = {};
      if (id === 'plan') pos = has('v3d') ? { referencePanel: 'v3d', direction: 'right' } : null;
      else if (id === 'insp'){ pos = { direction: 'right' }; ex = { initialWidth: 340 }; }
      else if (id === 'env'){ pos = { direction: 'left' }; ex = { initialWidth: 250 }; }
      else if (BOT.includes(id)){ const mate = BOT.find(k => k !== id && has(k) && (() => { try { return has(k).group.api.location.type === 'grid'; } catch (_){ return false; } })()); if (mate){ const g = has(mate).group, after = BOT.slice(0, BOT.indexOf(id)).filter(k => g.panels.some(q => q.id === k)).length; pos = { referencePanel: mate, index: after }; } else { pos = { direction: 'below' }; ex = { initialHeight: 250 }; } }
      const w3 = id === 'plan' && has('v3d') ? holder('v3d').getBoundingClientRect().width : 0;
      busy++; try { api.addPanel({ ...P, ...(pos ? { position: pos } : {}), ...ex }); } catch (e){ console.error('panneau', id, e); try { api.addPanel(P); } catch (_){ } } busy--;
      if (w3 > 300){ try { has('plan').group.api.setSize({ width: Math.round(w3 * .42) }); has('v3d').group.api.setSize({ width: Math.round(w3 * .58) }); } catch (_){ } } }          /* le plan s'ouvre à côté de la 3D sans lui prendre la moitié */
    /* placer un groupe de panneaux sur un bord de toute la fenêtre, sans avoir à viser une zone à la souris */
    function place(ids, where){ ids = ids.filter(id => id !== 'v3d' && has(id)); if (!ids.length) return; const dir = { bas: 'below', gauche: 'left', droite: 'right' }[where]; busy++; try { for (const id of ids){ try { has(id).api.close(); } catch (_){ } unmount(id); }
        ids.forEach((id, i) => { try { api.addPanel({ id, component: id, title: TITLE[id], renderer: 'always', position: i ? { referencePanel: ids[0] } : { direction: dir }, ...(i ? {} : where === 'bas' ? { initialHeight: 250 } : { initialWidth: 340 }) }); } catch (e){ console.error(e); } }); } finally { busy--; } for (const id of ids) mount(id); tag3d(); later(); }
    const pm = document.createElement('div'); pm.id = 'dvPlace'; body.appendChild(pm); addEventListener('pointerdown', e => { if (pm.style.display === 'flex' && !pm.contains(e.target)) pm.style.display = 'none'; }, true);
    function placeMenu(at, ids, group){ let fl = false; try { fl = group.api.location.type === 'floating'; } catch (_){ } pm.innerHTML = `<button data-pw="bas">▁ En bas, sur toute la largeur</button><button data-pw="gauche">▏ À gauche</button><button data-pw="droite">▕ À droite</button>${fl ? '' : '<button data-pw="float">⇱ Flottant</button>'}<button data-pw="home">↺ À sa place d'origine</button>`; pm.style.display = 'flex'; const r = at.getBoundingClientRect(); pm.style.top = (r.bottom + 4) + 'px'; pm.style.left = Math.max(6, Math.min(innerWidth - pm.offsetWidth - 6, r.right - pm.offsetWidth)) + 'px';
      pm.onclick = e => { const b = e.target.closest('[data-pw]'); if (!b) return; pm.style.display = 'none'; const w = b.dataset.pw; if (w === 'home') home(ids); else if (w === 'float'){ try { api.addFloatingGroup(group, { x: 160, y: 110, width: 520, height: 400 }); } catch (er){ console.error(er); } later(); } else place(ids, w); }; }
    /* retour à la place d'origine : les panneaux sont retirés puis reposés là où la disposition de départ les met */
    function home(ids){ ids = ids.filter(id => id !== 'v3d'); busy++; try { for (const id of ids){ const p = has(id); if (p){ try { p.api.close(); } catch (_){ } } unmount(id); } } finally { busy--; } for (const id of ORDER) if (ids.includes(id) && STATE[id].get()) add(id); tag3d(); later(); }
    function close(id){ const p = has(id); if (!p) return; busy++; try { p.api.close(); } catch (_){ } busy--; unmount(id); }
    function tag3d(){ for (const g of host.querySelectorAll('.dv-groupview.dv3d')) g.classList.remove('dv3d'); const p = has('v3d'); if (!p) return; try { p.group.header.hidden = true; } catch (_){ } p.group.element.classList.add('dv3d'); }
    // l'état de l'application décide des panneaux présents
    const ORDER = ['plan', 'insp', 'env', ...BOT];
    function reconcile(){ if (busy) return; if (!has('v3d')) add('v3d'); for (const id of ORDER){ const want = STATE[id].get(), p = has(id); if (want && !p) add(id); else if (!want && p) close(id); } tag3d(); }
    api.onDidRemovePanel(p => { const id = p.id; unmount(id); if (busy) return; if (id === 'v3d') return void setTimeout(reconcile, 0); if (STATE[id] && STATE[id].get()){ busy++; try { STATE[id].set(false); } finally { busy--; } } });
    // la vue 3D : en haut, seule, dans la grille. Sinon la disposition est refusée.
    let good = null, saveT = 0;
    const valid = () => { const p = has('v3d'); if (!p) return false; try { if (p.group.api.location.type !== 'grid') return false; if (p.group.panels.length !== 1) return false; } catch (_){ } if (api.hasMaximizedGroup && api.hasMaximizedGroup()) return true; const r = holder('v3d').getBoundingClientRect(), h = host.getBoundingClientRect(); return r.width > 120 && r.height > 120 && Math.abs(r.top - h.top) < 3; };
    function sync(){ if (!api) return; tag3d();
      { const rr = !!(window.DOCK && DOCK.D && DOCK.D.rail === 'right'), rail = $('#rail'); if (rail){ rail.style.left = rr ? 'auto' : '6px'; rail.style.right = rr ? '6px' : 'auto'; } const l = rr ? '4px' : '54px', r2 = rr ? '54px' : '4px'; if (host.style.left !== l){ host.style.left = l; host.style.right = r2; } }
      const D = window.DOCK && DOCK.D, pl = has('plan'); try { const mx = api.hasMaximizedGroup(); if (D && D.pfull && pl && STATE.plan.get()){ if (!mx) api.maximizeGroup(pl); } else if (mx && !(D && D.pfull)) api.exitMaximizedGroup(); } catch (_){ } body.classList.toggle('planfull', !!(D && D.pfull && pl && STATE.plan.get()));
      /* invalide seulement si ça dure : pendant un glisser ou un changement d'onglet la zone 3D peut être nulle un instant */
      if (!valid()){ if (!sync.bad){ sync.bad = performance.now(); setTimeout(later, 350); } else if (performance.now() - sync.bad > 300 && good && !sync.rev){ sync.bad = 0; sync.rev = true; busy++; try { api.fromJSON(good); } catch (e){ console.error(e); } busy--; for (const id of IDS) if (has(id)) mount(id); tag3d(); sync.rev = false; ST.toast('La vue 3D reste en haut, seule dans sa zone : range les autres panneaux à côté ou dessous.', true); } }
      else { sync.bad = 0; } if (valid() && !sync.bad) if (!(api.hasMaximizedGroup && api.hasMaximizedGroup())){ try { good = api.toJSON(); } catch (_){ } clearTimeout(saveT); saveT = setTimeout(() => { if (good) A.store.set('dvLayout', good); }, 400); }
      const r = holder('v3d').getBoundingClientRect(); if (r.width > 50){ root.style.setProperty('--vx', r.left + 'px'); root.style.setProperty('--vw', r.width + 'px'); root.style.setProperty('--vr', (innerWidth - r.right) + 'px'); root.style.setProperty('--vhh', r.bottom + 'px'); /* zone centrale (barres d'outils du dessin et des ponts) : la 3D, plus le plan s'il est collé à sa droite ou à sa gauche */ let cx = r.left, cr = r.right; if (pl){ const q = holder('plan').getBoundingClientRect(); if (q.width > 50 && Math.abs(q.left - r.right) < 12) cr = q.right; else if (q.width > 50 && Math.abs(q.right - r.left) < 12) cx = q.left; } root.style.setProperty('--cx', cx + 'px'); root.style.setProperty('--cwd', (cr - cx) + 'px'); }
      const hint = $('#hint'); if (hint && r.width > 50){ hint.style.left = (r.left + 8) + 'px'; hint.style.width = Math.max(0, r.width - 16) + 'px'; }
      A.resize(); window.PLAN && PLAN.size && PLAN.size(); window.PLAN && PLAN.draw && PLAN.draw(); window.OBJLIST && OBJLIST.refreshWin && OBJLIST.refreshWin(); }
    let st = 0; const later = () => { if (st) return; st = requestAnimationFrame(() => { st = 0; sync(); }); };
    api.onDidLayoutChange(later); addEventListener('resize', () => { try { api.layout(host.clientWidth, host.clientHeight); } catch (_){ } later(); }); new ResizeObserver(later).observe(holder('v3d'));
    for (const id of ['objs', 'plan', 'lib']) new ResizeObserver(later).observe(holder(id));
    /* l'onglet qui vient au premier plan se remplit (les onglets cachés ne sont pas redessinés) */
    try { api.onDidActivePanelChange(() => { const ap = api.activePanel; if (ap && DT.includes(ap.id)) DRAWER.setTab(ap.id); setTimeout(() => window.DRAWER && DRAWER.refresh(), 0); }); } catch (_){ }
    new ResizeObserver(() => { try { api.layout(host.clientWidth, host.clientHeight); } catch (_){ } later(); }).observe(host);
    // pendant qu'on tire un onglet ou une barre de titre, toute la surface accepte le dépôt (sinon la zone 3D laisse passer la souris)
    addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('#dvRoot .dv-tabs-and-actions-container, #dvRoot .dv-floating-titlebar')) body.classList.add('dvdrag'); }, true);
    for (const ev of ['pointerup', 'dragend', 'drop']) addEventListener(ev, () => { if (body.classList.contains('dvdrag')) setTimeout(() => body.classList.remove('dvdrag'), 80); }, true);
    try { api.onWillDragPanel(() => body.classList.add('dvdrag')); api.onWillDragGroup(() => body.classList.add('dvdrag')); } catch (_){ }

    // ---- départ : disposition gardée, sinon celle d'origine
    function fresh(){ busy++; try { api.clear(); } catch (_){ } busy--; for (const id of IDS) unmount(id); add('v3d'); for (const k of DT) STATE[k].set(true); if (!LIBWIN.on) LIBWIN.toggle(true); if (!OBJLIST.winOn) OBJLIST.win(true); if (!STATE.insp.get()) A.toggleConsole(true); reconcile(); try { has('lib').api.setActive(); } catch (_){ }
      /* proportions de départ : la vue 3D garde la plus grande part du centre */
      try { api.layout(host.clientWidth, host.clientHeight); const W = host.clientWidth, right = Math.min(340, Math.round(W * .24)), pi = has('insp'), pp = has('plan'); const envW = has('env') ? 250 : 0, mid = W - right - envW, planW = pp ? Math.round(mid * .40) : 0; for (let k = 0; k < 2; k++){ if (pi) pi.group.api.setSize({ width: right }); if (pp) pp.group.api.setSize({ width: planW }); has('v3d').group.api.setSize({ width: mid - planW }); } const pb = has('lib') || has('patch'); if (pb) pb.group.api.setSize({ height: Math.round(Math.min(270, host.clientHeight * .32)) }); } catch (e){ console.error(e); } }
    function load(json){ if (json && json.panels && json.panels.drawer) return false;          /* disposition d'avant la 4.52 (un seul panneau « tiroir ») : on repart de celle d'origine */
      busy++; let ok = true; try { api.fromJSON(json); } catch (e){ console.error(e); ok = false; } busy--; if (!ok || !has('v3d')) return false; for (const id of IDS) if (has(id)) mount(id);
      busy++; try { for (const id of ORDER){ const want = !!has(id); if (STATE[id].get() !== want) STATE[id].set(want); } } finally { busy--; } tag3d(); return true; }
    if (window.DRAWER){ DRAWER.D.open = true; if (!DT.includes(DRAWER.D.tab)) DRAWER.D.tab = 'patch'; }
    const saved = A.store.get('dvLayout', null); if (!(saved && load(saved))) fresh();
    new MutationObserver(reconcile).observe(body, { attributes: true, attributeFilter: ['class'] }); for (const el of [con, side]) new MutationObserver(reconcile).observe(el, { attributes: true, attributeFilter: ['class'] }); setInterval(reconcile, 300);
    try { api.layout(host.clientWidth, host.clientHeight); } catch (_){ } sync(); setTimeout(sync, 200);

    // ---- bouton « ▦ » : panneaux affichés, dispositions enregistrées
    const LAY = () => A.store.get('dvLayouts', null) || {}, pop = document.createElement('div'); pop.id = 'dvPop'; body.appendChild(pop);
    const show = id => { if (!STATE[id]) return; if (!STATE[id].get()) STATE[id].set(true); reconcile(); const p = has(id); if (p) try { p.api.setActive(); } catch (_){ } };
    /* un panneau ne doit jamais défiler lui-même (scrollIntoView d'un contenu le décalerait) */
    host.addEventListener('scroll', e => { const t = e.target; if (t && t.classList && (t.classList.contains('dvp') || t.classList.contains('dv-render-overlay') || t.classList.contains('dv-content-container'))){ if (t.scrollTop) t.scrollTop = 0; if (t.scrollLeft) t.scrollLeft = 0; } }, true);
    function menu(){ const L = LAY(), on = id => !!has(id);
      pop.innerHTML = `<b>Panneaux</b>${['plan', 'insp', 'env', ...BOT].map(id => `<button data-dp="${id}" class="${on(id) ? 'on' : ''}">${on(id) ? '☑' : '☐'} ${TITLE[id]}</button>`).join('')}<b>Dispositions</b>${Object.keys(L).map(n => `<button data-dl="${encodeURIComponent(n)}">▦ ${ST.esc(n)}<i data-dx="${encodeURIComponent(n)}" title="Supprimer cette disposition">✕</i></button>`).join('') || '<span style="padding:3px 8px;color:var(--mute)">Aucune disposition enregistrée.</span>'}<button data-da="save">＋ Enregistrer la disposition actuelle…</button><button data-da="reset">↺ Disposition d'origine</button><button data-da="legacy" title="Revenir aux fenêtres d'avant (rechargement de la page)">Anciennes fenêtres…</button>`; }
    const btn = document.createElement('button'); btn.className = 'tool'; btn.id = 'dvBtn'; btn.style.cssText = 'padding-left:7px;padding-right:7px'; btn.title = 'Panneaux et dispositions : afficher un panneau, enregistrer ou reprendre une disposition de l\'écran'; btn.textContent = '▦'; { const ob = $('#olBtn') || $('#conBtn'); ob && ob.parentNode.insertBefore(btn, ob); }
    const openPop = v => { if (!v){ pop.style.display = 'none'; btn.classList.remove('on'); return; } menu(); pop.style.display = 'flex'; btn.classList.add('on'); const r = btn.getBoundingClientRect(); pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = Math.max(6, Math.min(innerWidth - pop.offsetWidth - 6, r.right - pop.offsetWidth)) + 'px'; };
    btn.addEventListener('click', e => { e.stopPropagation(); openPop(pop.style.display === 'none' || !pop.style.display); });
    addEventListener('pointerdown', e => { if (pop.style.display === 'flex' && !pop.contains(e.target) && e.target !== btn) openPop(false); }, true);
    pop.addEventListener('click', e => { const x = e.target.closest('[data-dx]'), t = e.target.closest('button'); if (!t) return;
      if (x){ const L = LAY(); delete L[decodeURIComponent(x.dataset.dx)]; A.store.set('dvLayouts', L); return menu(); }
      if (t.dataset.dp){ const id = t.dataset.dp; if (has(id)){ STATE[id].set(false); reconcile(); } else show(id); later(); return menu(); }
      if (t.dataset.dl){ const j = LAY()[decodeURIComponent(t.dataset.dl)]; if (j && load(j)){ later(); ST.toast('Disposition « ' + decodeURIComponent(t.dataset.dl) + ' » reprise.'); } return openPop(false); }
      const a = t.dataset.da; if (a === 'save'){ const n = (prompt('Nom de cette disposition (ex. Plan de feu, Rigging, Spectacle) :', '') || '').trim(); if (n){ const L = LAY(); L[n] = api.toJSON(); A.store.set('dvLayouts', L); ST.toast('Disposition « ' + n + ' » enregistrée.'); } return openPop(false); }
      if (a === 'reset'){ fresh(); later(); openPop(false); return ST.toast('Disposition d\'origine.'); }
      if (a === 'legacy'){ if (confirm('Revenir aux anciennes fenêtres ? La page se recharge ; le projet est gardé.')){ A.store.set('dv', false); location.reload(); } } });
    const visible = id => { const p = has(id); try { return !!(p && p.api.isVisible); } catch (_){ return false; } };
    Object.assign(window.PANELS, { ready: true, api, sync, reconcile, show, visible, title(id, t){ const p = has(id); if (p && p.title !== t) try { p.api.setTitle(t); } catch (_){ } }, toggleShow(id){ if (has(id) && visible(id)){ STATE[id].set(false); reconcile(); } else show(id); later(); }, has: id => !!has(id), reset: () => { fresh(); later(); }, load, toJSON: () => api.toJSON(), holder, legacy(){ A.store.set('dv', false); location.reload(); },
      home, place, save(n){ const L = LAY(); L[n] = api.toJSON(); A.store.set('dvLayouts', L); }, layouts: () => Object.keys(LAY()), float(id, box){ const p = has(id); if (p) api.addFloatingGroup(p, box || { x: 120, y: 90, width: 420, height: 380 }); } });
  }
}
