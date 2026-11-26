// Fenêtres : chaque panneau se détache de sa place, flotte dans l'application, se déplace et se redimensionne.
// La vue 3D, elle, peut partir dans une vraie fenêtre à poser sur un écran externe (image en direct, souris relayée).
// Les panneaux réécrivent souvent leur contenu : la barre de titre et la poignée sont donc des éléments à part, posés par-dessus.
export function initWins(A, ST){
  const $ = s => document.querySelector(s), root = document.documentElement;
  const LIST = [['side', 'Environnement'], ['console', 'Inspecteur'], ['planWin', 'Plan technique'], ['desk', 'Pupitre'], ['aiPanel', 'Assistant'], ['audPanel', 'Musique'], ['ledPanel', 'Mur LED'], ['libPanel', 'Bibliothèques'], ['hud', 'Position'], ['help', 'Aide']].filter(([id]) => !(A.store.get('dv', true) !== false && ['side', 'console', 'planWin'].includes(id)));          /* ces trois-là sont des panneaux Dockview (panels.js) */
  const saved = A.store.get('wins', {}), W = new Map(); let zTop = 13, drag = null;
  const css = document.createElement('style'); css.textContent = `
  .fl{left:var(--fx)!important;top:var(--fy)!important;width:var(--fw)!important;height:var(--fh)!important;right:auto!important;bottom:auto!important;transform:none!important;max-width:none!important;max-height:none!important;min-width:0!important;z-index:var(--fz,13)!important;box-shadow:0 14px 40px rgba(0,0,0,.6);border-radius:0 0 10px 10px!important}
  .fl:not(#planWin):not(#desk){overflow:auto}
  #side.fl.hide,#console.fl.hide{display:none}
  #console.hide{transform:translateX(calc(var(--cw,340px) + 60px))!important;visibility:hidden}   /* fermé : sorti de l'écran quelle que soit sa largeur (il restait à moitié visible une fois élargi) */
  .wbar{position:fixed;z-index:39;display:none;align-items:center;gap:6px;height:22px;box-sizing:border-box;padding:0 4px 0 9px;font:600 11px Inter,system-ui,sans-serif;color:#d9d6f0;background:#2a2152;border:1px solid var(--line);border-bottom:0;border-radius:8px 8px 0 0;cursor:move;user-select:none;touch-action:none}
  .wbar span{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis} .wbar a{cursor:pointer;padding:0 6px;border-radius:4px;color:#b9b4dc;font-weight:500} .wbar a:hover{background:#40347a;color:#fff}
  .wpill{position:fixed;z-index:11;display:none;width:26px;height:13px;border-radius:0 0 7px 7px;background:#2a2152;border:1px solid var(--line);border-top:0;cursor:move;opacity:.55;touch-action:none}
  .wpill:hover{opacity:1;background:linear-gradient(90deg,#f2a93b,#f2a93b)} .wpill:after{content:'';position:absolute;left:7px;right:7px;top:4px;height:3px;border-top:1px solid #cfc9f5;border-bottom:1px solid #cfc9f5}
  .wrs{position:fixed;z-index:39;display:none;width:16px;height:16px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 50%,#6e7787 50%,#7c8bff 60%,transparent 60%,transparent 72%,#7c8bff 72%,#7c8bff 82%,transparent 82%)}
  body.confl #conGrip{display:none!important} body.confl #aiPanel,body.confl #hud,body.confl #ledPanel{right:calc(100vw - var(--vw,100vw) + 12px)} body.confl.split #planWin{right:12px}
  body.ext3d{--vw:100vw!important;--vhh:100vh!important}`; document.head.appendChild(css);

  const clampBox = b => { const iw = innerWidth, ih = innerHeight; b.w = Math.max(180, Math.min(iw - 8, b.w)); b.h = Math.max(90, Math.min(ih - 54, b.h)); b.x = Math.max(4 - b.w + 80, Math.min(iw - 80, b.x)); b.y = Math.max(70, Math.min(ih - 40, b.y)); return b; };
  const apply = w => { const b = clampBox(w.box), s = w.el.style; s.setProperty('--fx', b.x + 'px'); s.setProperty('--fy', b.y + 'px'); s.setProperty('--fw', b.w + 'px'); s.setProperty('--fh', b.h + 'px'); };
  const save = () => { const o = {}; for (const [id, w] of W) if (w.fl) o[id] = w.box; A.store.set('wins', o); };
  const relayout = () => { document.body.classList.toggle('confl', !!W.get('console')?.fl); dispatchEvent(new Event('wins')); dispatchEvent(new Event('resize')); sync(); };
  const front = w => { if (!w.fl) return; if (zTop > 28){ zTop = 13; [...W.values()].filter(q => q.fl).sort((a, b) => a.z - b.z).forEach(q => { q.z = ++zTop; q.el.style.setProperty('--fz', q.z); }); } w.z = ++zTop; w.el.style.setProperty('--fz', w.z); };
  function detach(w, box){ if (w.fl) return; const r = w.el.getBoundingClientRect(); w.box = box || { x: Math.round(r.left), y: Math.round(Math.max(r.top, 70)), w: Math.round(r.width), h: Math.round(Math.min(r.height, innerHeight - 110)) }; w.fl = true; apply(w); w.el.classList.add('fl'); front(w); relayout(); save(); }
  function attach(w){ if (!w.fl) return; w.fl = false; w.el.classList.remove('fl'); for (const k of ['--fx', '--fy', '--fw', '--fh', '--fz']) w.el.style.removeProperty(k); relayout(); save(); }
  const shown = el => { if (!el.isConnected) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && !((el.id === 'side' || el.id === 'console') && el.classList.contains('hide')); };
  function sync(){
    for (const w of W.values()){ const on = shown(w.el) && !document.body.classList.contains('cine'), r = on ? w.el.getBoundingClientRect() : null;
      w.bar.style.display = on && w.fl ? 'flex' : 'none'; w.rs.style.display = on && w.fl ? 'block' : 'none'; w.pill.style.display = on && !w.fl ? 'block' : 'none'; if (!on) continue;
      if (w.fl){ w.bar.style.left = r.left + 'px'; w.bar.style.top = (r.top - 22) + 'px'; w.bar.style.width = r.width + 'px'; w.rs.style.left = (r.right - 16) + 'px'; w.rs.style.top = (r.bottom - 16) + 'px'; w.bar.style.zIndex = w.rs.style.zIndex = w.z + 1; }
      else { w.pill.style.left = (r.left + r.width / 2 - 13) + 'px'; w.pill.style.top = Math.max(0, r.top) + 'px'; } }
  }
  function adopt(id, name){
    const el = document.getElementById(id); if (!el || W.has(id)) return; const w = { id, name, el, fl: false, z: 13, box: null };
    w.bar = document.createElement('div'); w.bar.className = 'wbar'; w.bar.innerHTML = `<span>${name}</span><a data-w="dock" title="Remettre cette fenêtre à sa place">Ancrer</a>`;
    w.pill = document.createElement('div'); w.pill.className = 'wpill'; w.pill.title = `Détacher « ${name} » : glisser pour la déplacer, cliquer pour la décrocher sur place`;
    w.rs = document.createElement('div'); w.rs.className = 'wrs'; w.rs.title = 'Redimensionner';
    document.body.append(w.pill, w.bar, w.rs); W.set(id, w);
    el.addEventListener('pointerdown', () => front(w), true);
    const start = (e, kind) => { if (e.button !== 0 || e.target.closest('[data-w]')) return; e.preventDefault(); e.stopPropagation(); if (!w.fl) detach(w); front(w); drag = { w, kind, x: e.clientX, y: e.clientY, b: { ...w.box }, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); };
    w.bar.addEventListener('pointerdown', e => start(e, 'move')); w.pill.addEventListener('pointerdown', e => start(e, 'move')); w.rs.addEventListener('pointerdown', e => start(e, 'size'));
    for (const h of [w.bar, w.pill, w.rs]){ h.addEventListener('pointermove', e => { if (!drag || drag.w !== w) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
        if (drag.kind === 'move'){ w.box.x = drag.b.x + dx; w.box.y = drag.b.y + dy; } else { w.box.w = drag.b.w + dx; w.box.h = drag.b.h + dy; } apply(w); sync(); if (drag.kind === 'size') dispatchEvent(new Event('wins')); });
      const end = () => { if (!drag || drag.w !== w) return; if (drag.kind === 'move' && w.box.y + w.box.h > innerHeight - 30 && w.box.y < innerHeight - 260){ w.box.h = Math.max(200, innerHeight - 30 - w.box.y); apply(w); }   /* la fenêtre lâchée garde son coin de redimensionnement à l'écran */ drag = null; save(); relayout(); }; h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end); }
    w.bar.addEventListener('click', e => { if (e.target.closest('[data-w=dock]')) attach(w); }); w.bar.addEventListener('dblclick', () => attach(w));
    if (saved[id] && isFinite(saved[id].x)){ w.box = { ...saved[id] }; w.fl = true; apply(w); el.classList.add('fl'); front(w); }
  }
  const scan = () => { for (const [id, name] of LIST) adopt(id, name); };
  scan(); relayout(); setInterval(() => { scan(); if (!drag) sync(); }, 200);
  addEventListener('resize', () => { for (const w of W.values()) if (w.fl) apply(w); sync(); });
  const dockAll = () => { for (const w of W.values()) attach(w); ST.toast('Toutes les fenêtres sont revenues à leur place.'); };
  const anyFloat = () => [...W.values()].some(w => w.fl);

  // ---------------------------------------------------------------- vue 3D sur un écran externe
  // La fenêtre externe montre l'image de la vue 3D en direct. La souris y est relayée : on y tourne, on y zoome, on y clique comme ici.
  const X = { win: null, t: 0 };
  { const cv = A.canvas, cap = cv.setPointerCapture.bind(cv), rel = cv.releasePointerCapture.bind(cv); cv.setPointerCapture = id => { try { cap(id); } catch (_){ /* pointeur relayé */ } }; cv.releasePointerCapture = id => { try { rel(id); } catch (_){ } }; }
  function ext3d(){
    if (X.win && !X.win.closed){ X.win.close(); return; }
    const cv = A.canvas; if (!cv.captureStream) return ST.toast('Ce navigateur ne sait pas envoyer la vue 3D vers une autre fenêtre.', true);
    const w = window.open('', 'stagefactory3d', 'popup,width=1280,height=720'); if (!w) return ST.toast('La fenêtre a été bloquée : autorise les fenêtres surgissantes pour StageFactory, puis recommence.', true);
    w.document.open(); w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>StageFactory — vue 3D</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}video{position:fixed;inset:0;width:100%;height:100%;object-fit:contain;display:block;cursor:crosshair}
      #h{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);font:13px system-ui,sans-serif;color:#fff;background:rgba(20,15,42,.85);padding:7px 14px;border-radius:9px;transition:opacity .6s}</style></head><body><video autoplay muted playsinline></video><div id="h">Glisse cette fenêtre sur l'écran externe, puis double-clic : plein écran</div></body></html>`); w.document.close();
    const v = w.document.querySelector('video'); v.srcObject = cv.captureStream(60); v.play().catch(() => {}); X.win = w; document.body.classList.add('ext3d'); dispatchEvent(new Event('resize'));
    setTimeout(() => { const h = w.document.getElementById('h'); if (h) h.style.opacity = 0; }, 6000);
    // de la fenêtre externe à la vue : l'image est centrée sans déformation, on retire les bandes noires
    const map = e => { const r = cv.getBoundingClientRect(), vw = w.innerWidth, vh = w.innerHeight, k = Math.min(vw / r.width, vh / r.height), ox = (vw - r.width * k) / 2, oy = (vh - r.height * k) / 2; return { clientX: r.left + (e.clientX - ox) / k, clientY: r.top + (e.clientY - oy) / k }; };
    const base = e => ({ bubbles: true, cancelable: true, composed: true, view: window, button: e.button, buttons: e.buttons, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, ...map(e) });
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) w.addEventListener(t, e => { cv.dispatchEvent(new PointerEvent(t, { ...base(e), pointerId: 991, pointerType: 'mouse', isPrimary: true })); });
    w.addEventListener('wheel', e => { e.preventDefault(); cv.dispatchEvent(new WheelEvent('wheel', { ...base(e), deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode })); }, { passive: false });
    w.addEventListener('contextmenu', e => e.preventDefault());
    w.addEventListener('dblclick', () => { const d = w.document; if (d.fullscreenElement) d.exitFullscreen(); else d.documentElement.requestFullscreen().catch(() => {}); });
    w.addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') w.document.documentElement.requestFullscreen().catch(() => {}); });
    clearInterval(X.t); X.t = setInterval(() => { if (!X.win || X.win.closed){ clearInterval(X.t); X.win = null; document.body.classList.remove('ext3d'); dispatchEvent(new Event('resize')); } }, 500);
    ST.toast('Vue 3D ouverte dans une autre fenêtre : glisse-la sur l\'écran externe, puis double-clic pour le plein écran.');
  }
  addEventListener('beforeunload', () => { try { X.win && X.win.close(); } catch (_){ } });
  window.WINS = { W, detach: id => W.get(id) && detach(W.get(id)), attach: id => W.get(id) && attach(W.get(id)), dockAll, anyFloat, ext3d, extOpen: () => !!(X.win && !X.win.closed), sync, list: () => [...W.values()].map(w => ({ id: w.id, name: w.name, fl: w.fl, box: w.box })) };
}
