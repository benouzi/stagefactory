// Espace de travail : barre de menus, commandes d'édition, liste des objets, barre d'état, raccourcis.
export function initWS(A, ST){
  const $ = s => document.querySelector(s), S = ST.S, UI = ST.UI, esc = ST.esc;
  const pref = Object.assign({ snap: .05 }, A.store.get('prefs', {}));
  const f2 = v => (+v).toFixed(2).replace('.', ',');
  const sel = () => ST.selObjs(), free = () => sel().filter(o => !o.locked);
  const cat = o => ST.typeOf(o).cat;
  let clip = [], pasteN = 0, listQ = '', closed = {};

  // ---------------------------------------------------------------- salle : annulation + sauvegarde auto
  A.beforeChange = (k, label) => { ST.pushUndo(k ? 'room-' + k : 0, label || 'Environnement'); clearTimeout(A.beforeChange.t); A.beforeChange.t = setTimeout(() => ST.touch(), 400); };
  const applySnap = () => { ST.gizmo.setTranslationSnap(pref.snap || null); A.store.set('prefs', pref); status(); };

  // ---------------------------------------------------------------- commandes
  function after(){ ST.touch(); ST.refreshProps(); ST.select(UI.sel.filter(id => ST.byId(id))); }
  function copy(){ if (!UI.sel.length) return; clip = JSON.parse(JSON.stringify(sel())); pasteN = 0; ST.toast(clip.length + ' objet(s) copié(s).'); }
  function paste(){
    if (!clip.length) return ST.toast('Presse-papiers vide : copie d\'abord un objet (Ctrl+C).');
    ST.pushUndo(0, 'Coller ' + clip.length + ' objet(s)'); pasteN++; const made = [];
    for (const src of clip){ const o = JSON.parse(JSON.stringify(src)); o.id = ST.uid(); o.pos[0] += .5 * pasteN; o.n = ST.nextNum(cat(o)); delete o.locked; delete o.hidden;
      S.objs.push(o); if (cat(o) === 'lum') o.addr = ST.freeAddr(o.uni, ST.modeCh(o)); ST.build(o); made.push(o.id); }
    ST.touch(); ST.select(made);
  }
  function cut(){ if (!UI.sel.length) return; copy(); ST.removeSel(); }
  function align(ax){ const s = free(); if (s.length < 2) return ST.toast('Sélectionne au moins deux objets (Maj + clic).'); ST.pushUndo(0, 'Aligner'); const ref = s[s.length - 1].pos[ax]; for (const o of s) o.pos[ax] = ref; after(); }
  function distribute(ax){ const s = free().sort((a, b) => a.pos[ax] - b.pos[ax]); if (s.length < 3) return ST.toast('Sélectionne au moins trois objets.'); ST.pushUndo(0, 'Répartir'); const a = s[0].pos[ax], b = s[s.length - 1].pos[ax]; s.forEach((o, i) => o.pos[ax] = Math.round((a + (b - a) * i / (s.length - 1)) * 1000) / 1000); after(); }
  function mirror(){
    const s = sel(); if (!s.length) return; ST.pushUndo(0, 'Miroir cour / jardin'); const made = [];
    for (const src of s){ const o = JSON.parse(JSON.stringify(src)); o.id = ST.uid(); o.pos[0] = -o.pos[0]; if (o.pan !== undefined) o.pan = -o.pan; if (o.yaw !== undefined) o.yaw = -o.yaw; o.n = ST.nextNum(cat(o));
      S.objs.push(o); if (cat(o) === 'lum') o.addr = ST.freeAddr(o.uni, ST.modeCh(o)); ST.build(o); made.push(o.id); }
    ST.touch(); ST.select(made);
  }
  function nudge(dx, dy, dz){ const s = free(); if (!s.length) return; ST.pushUndo('nudge', 'Déplacement'); for (const o of s){ o.pos[0] = Math.round((o.pos[0] + dx) * 1000) / 1000; o.pos[1] = Math.max(0, Math.round((o.pos[1] + dy) * 1000) / 1000); o.pos[2] = Math.round((o.pos[2] + dz) * 1000) / 1000; } ST.touch(); ST.refreshProps(); status(); }
  function setFlag(k, v, objs = sel()){ if (!objs.length) return; ST.pushUndo(0, { locked: v ? 'Verrouiller' : 'Déverrouiller', hidden: v ? 'Masquer' : 'Afficher' }[k]); for (const o of objs) v ? o[k] = true : delete o[k]; ST.touch(); ST.select(k === 'hidden' && v ? [] : UI.sel); }
  function renumber(){ const s = sel(); if (!s.length) return; ST.pushUndo(0, 'Renuméroter'); const by = {}; for (const o of s) (by[cat(o)] ??= []).push(o);
    for (const [c, list] of Object.entries(by)){ const others = new Set(S.objs.filter(o => !UI.sel.includes(o.id)).map(o => o.n)); let n = { lum: 0, vid: 500, son: 600, str: 900 }[c] + 1; list.sort((a, b) => a.pos[2] - b.pos[2] || a.pos[0] - b.pos[0]); for (const o of list){ while (others.has(n)) n++; o.n = n; others.add(n); } }
    after(); ST.toast('Renuméroté du lointain vers la face, de jardin à cour.'); }
  function focus(){
    const s = sel(); if (!s.length) return ST.toast('Sélectionne un objet pour centrer la vue dessus.');
    const T = A.THREE, c = new T.Vector3(); for (const o of s) c.add(ST.posOf(o)); c.multiplyScalar(1 / s.length);
    if (A.mode !== 'orbit') A.setMode('orbit');
    const d = A.persp.position.clone().sub(A.orbit.target), L = Math.min(d.length(), 9); A.orbit.target.copy(c); A.persp.position.copy(c).add(d.setLength(Math.max(4, L))); A.orbit.update();
  }
  function selSame(){ const types = new Set(sel().map(o => o.type)); if (!types.size) return; ST.select(S.objs.filter(o => types.has(o.type) && !o.hidden && !o.locked).map(o => o.id)); }
  function invert(){ ST.select(S.objs.filter(o => !UI.sel.includes(o.id) && !o.hidden && !o.locked).map(o => o.id)); }
  async function shot(){ try { const u = A.snapshot(), b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); await ST.saveFile('vue-3d-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.png', a); } catch (e){ ST.toast('Capture impossible dans cette vue.', true); } }
  function fullscreen(){ try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => ST.toast('Le plein écran est bloqué dans cette vue : ouvre la page dans son propre onglet.', true)); } catch (_){ ST.toast('Plein écran indisponible ici.', true); } }
  const needSel = () => UI.sel.length > 0, mode = m => () => A.mode === m;

  const C = {
    new: { l: 'Nouveau projet…', k: 'Ctrl+N', run: newProject },
    resume: { l: 'Reprendre le dernier projet', run: () => { try { const d = JSON.parse(A.store.get('lastShow', 'null')); if (!d) return; window.PARC?.backup('avant de reprendre le dernier projet'); ST.pushUndo(0, 'Reprendre le dernier projet'); ST.loadShow(d); ST.touch(); ST.render(); ST.toast('Projet « ' + (d.name || 'sans nom') + ' » repris.'); } catch (_){ ST.toast('Le dernier projet n\'a pas pu être relu.', true); } }, on: () => !!A.store.get('lastShow', null) },
    viewOpt: { l: 'Points de vue, fond et grille de la vue 3D…', run: () => window.VIEW3D?.open(true) },
    ext3d: { l: 'Vue 3D sur un autre écran', run: () => window.WINS?.ext3d(), ck: () => !!window.WINS && WINS.extOpen() },
    dockAll: { l: 'Ancrer toutes les fenêtres', run: () => window.WINS?.dockAll(), on: () => !!window.WINS && WINS.anyFloat() },
    parc: { l: 'Parc de matériel…', run: () => window.PARC?.open(true) },
    backups: { l: 'Projets mis de côté…', run: () => window.PARC?.restoreDialog() },
    helpSalle: { l: 'Environnements et parc de matériel', run: helpSalle }, helpRig: { l: 'Ponts, charges, décor, publication', run: helpRig },
    venue: { l: 'Créer un environnement depuis des plans…', run: () => window.VENUE?.open(true) },
    venueCal: { l: 'Caler le plan de l’environnement…', run: () => window.VENUE?.ui('calib'), on: () => !!A.venue.plan },
    scene: { l: 'Scène en praticables…', run: () => ST.runAct('scene') },
    venuePipes: { l: 'Perches de l’environnement…', run: () => window.VENUE?.ui('pipes'), on: () => A.venue.type === 'param' },
    open: { l: 'Ouvrir un fichier…', k: 'Ctrl+O', run: () => ST.runAct('import') },
    save: { l: 'Enregistrer en ligne', k: 'Ctrl+S', run: () => ST.cloudSave() },
    reload: { l: 'Revenir à la version en ligne', run: () => ST.cloudLoad() },
    rename: { l: 'Renommer le projet…', run: () => ST.modal(`<h1>Nom du projet</h1><div class="pf"><label>Nom</label><input type="text" id="pjName" value="${esc(S.name)}"></div><div class="btns"><button class="b on" data-a="wsRenameOk">OK</button><button class="b" data-a="close">Annuler</button></div>`) },
    import: { l: 'Importer GDTF / Avolites .d4 / MVR…', run: () => ST.runAct('import') },
    xproj: { l: 'Exporter le projet (.json)', k: 'Ctrl+E', run: () => ST.runAct('xproj') },
    xmvr: { l: 'Exporter en MVR', run: () => ST.runAct('xmvr') }, xpatch: { l: 'Exporter le patch (CSV)', run: () => ST.runAct('xpatch') }, xgear: { l: 'Exporter la liste de matériel (CSV)', run: () => ST.runAct('xgear') },
    xplan: { l: 'Exporter le plan 2D (PNG, A3 1:100)', run: () => { if (!document.body.classList.contains('split')) window.PLAN?.toggle(true); setTimeout(() => $('#planPng').click(), 300); } },
    shot: { l: 'Capture de la vue 3D (PNG)', run: shot }, demo: { l: 'Ouvrir la démonstration', run: () => ST.runAct('demo') },
    undo: { l: () => 'Annuler' + (ST.hist().undo.length ? ' : ' + ST.hist().undo.at(-1).label : ''), k: 'Ctrl+Z', run: ST.undo, on: () => ST.hist().undo.length > 0 },
    redo: { l: () => 'Rétablir' + (ST.hist().redo.length ? ' : ' + ST.hist().redo.at(-1).label : ''), k: 'Ctrl+Y', run: ST.redo, on: () => ST.hist().redo.length > 0 },
    hist: { l: 'Historique…', run: history },
    cut: { l: 'Couper', k: 'Ctrl+X', run: cut, on: needSel }, copy: { l: 'Copier', k: 'Ctrl+C', run: copy, on: needSel }, paste: { l: 'Coller', k: 'Ctrl+V', run: paste, on: () => clip.length > 0 },
    dup: { l: 'Dupliquer', k: 'Ctrl+D', run: () => ST.duplicate(1, [.5, 0, 0]), on: needSel }, array: { l: 'Répéter en ligne…', run: () => ST.runAct('array'), on: needSel },
    del: { l: 'Supprimer', k: 'Suppr', run: ST.removeSel, on: needSel },
    all: { l: 'Tout sélectionner', k: 'Ctrl+A', run: () => ST.select(S.objs.filter(o => !o.hidden && !o.locked).map(o => o.id)) }, same: { l: 'Sélectionner le même type', run: selSame, on: needSel },
    inv: { l: 'Inverser la sélection', k: 'Ctrl+I', run: invert }, none: { l: 'Désélectionner', k: 'Échap', run: () => ST.select([]), on: needSel },
    prefs: { l: 'Préférences…', run: prefs },
    move: { l: 'Outil Déplacer', k: 'G', run: () => ST.setGizmo('translate'), ck: () => UI.gizmo === 'translate' }, rot: { l: 'Outil Tourner', k: 'R', run: () => ST.setGizmo('rotate'), ck: () => UI.gizmo === 'rotate' },
    aim: { l: 'Viser un point', k: 'V', run: () => ST.runAct('aim'), on: needSel },
    alx: { l: 'Aligner sur l\'axe cour-jardin (même X)', run: () => align(0), on: () => UI.sel.length > 1 }, alz: { l: 'Aligner en profondeur (même Z)', run: () => align(2), on: () => UI.sel.length > 1 }, aly: { l: 'Aligner en hauteur', run: () => align(1), on: () => UI.sel.length > 1 },
    dix: { l: 'Répartir de jardin à cour', run: () => distribute(0), on: () => UI.sel.length > 2 }, diz: { l: 'Répartir en profondeur', run: () => distribute(2), on: () => UI.sel.length > 2 },
    mirror: { l: 'Copie miroir cour / jardin', k: 'Ctrl+M', run: mirror, on: needSel },
    lock: { l: () => sel().length && sel().every(o => o.locked) ? 'Déverrouiller' : 'Verrouiller', k: 'Ctrl+L', run: () => setFlag('locked', !sel().every(o => o.locked)), on: needSel },
    hide: { l: 'Masquer', k: 'H', run: () => setFlag('hidden', true), on: needSel },
    showAll: { l: 'Tout afficher', k: 'Maj+H', run: () => setFlag('hidden', false, S.objs.filter(o => o.hidden)), on: () => S.objs.some(o => o.hidden) },
    unlockAll: { l: 'Tout déverrouiller', run: () => setFlag('locked', false, S.objs.filter(o => o.locked)), on: () => S.objs.some(o => o.locked) },
    renum: { l: 'Renuméroter la sélection', run: renumber, on: needSel }, focus: { l: 'Centrer la vue sur la sélection', k: 'F', run: focus, on: needSel },
    vOrbit: { l: 'Vue 3D (orbite)', k: '1', run: () => A.setMode('orbit'), ck: mode('orbit') }, vWalk: { l: 'Vue Marcher', k: '2', run: () => A.setMode('walk'), ck: mode('walk') }, vTop: { l: 'Vue Plan (rendu)', k: '3', run: () => A.setMode('top'), ck: mode('top') }, vSide: { l: 'Vue Coupe', k: '4', run: () => A.setMode('side'), ck: mode('side') },
    plan: { l: 'Plan technique 2D à côté', k: 'P', run: () => window.PLAN?.toggle(), ck: () => document.body.classList.contains('split') },
    atelier: { l: 'Inspecteur', k: 'L', run: () => A.toggleConsole(), ck: () => document.body.classList.contains('con') },
    swPlan: { l: 'Plan technique : changer de côté', run: () => window.DOCK?.swap('plan') }, swAtelier: { l: 'Inspecteur : changer de côté', run: () => window.DOCK?.swap('atelier') }, swEnv: { l: 'Environnement : changer de côté', run: () => window.DOCK?.swap('env') }, swRail: { l: 'Outils : changer de côté', run: () => window.DOCK?.swap('rail') },
    side: { l: 'Panneau Environnement', k: 'Tab', run: () => A.toggleSide(), ck: () => !$('#side').classList.contains('hide') },
    list: { l: 'Liste des objets', k: 'O', run: () => { UI.tab = 'list'; A.toggleConsole(true); ST.render(); } },
    labels: { l: 'Étiquettes dans la vue 3D', run: () => { UI.labels = !UI.labels; ST.render(); }, ck: () => UI.labels },
    full: { l: 'Plein écran', run: fullscreen, ck: () => !!document.fullscreenElement },
    qH: { l: 'Qualité haute', run: () => setQ('haute'), ck: () => A.quality === 'haute' }, qM: { l: 'Qualité moyenne', run: () => setQ('moyenne'), ck: () => A.quality === 'moyenne' }, qB: { l: 'Qualité basse (fluide)', run: () => setQ('basse'), ck: () => A.quality === 'basse' },
    rig: { l: 'Plan de charge des perches…', k: 'K', run: () => window.RIG?.open() },
    pubPdf: { l: 'Publier en PDF…', run: () => window.PUB?.pdfDialog() }, secuPdf: { l: 'Rapport de sécurité (PDF)', run: () => window.PUB?.safetyPdf() }, cotes: { l: 'Poser des cotes sur le plan', run: () => window.PUB?.tool('dim') },
    hpt: { l: 'Poser des points d\'accroche, des moteurs', run: () => { if (window.PLAN && !PLAN.P.on) PLAN.toggle(true); window.PONTS?.tool('point'); } },
    pont: { l: 'Tracer un pont', run: () => { if (window.PLAN && !PLAN.P.on) PLAN.toggle(true); window.PONTS?.tool(true); } }, struct: { l: 'Structure toute faite…', run: () => window.PONTS?.structOpen() }, rigP: { l: 'Rigging et charges', run: () => window.DRAWER?.open('rig') }, secu: { l: 'Sécurité', run: () => window.DRAWER?.open('secu') }, larray: { l: 'Line array…', run: () => window.LARRAY?.open() }, drawer: { l: 'Tiroir du bas', run: () => { const D = window.DRAWER; if (D) D.D.open ? document.querySelector('#drawer [data-dt="_"]').click() : D.open(D.D.tab); } },
    dmx: { l: 'DMX / réseau (Art-Net, sACN)…', k: 'N', run: () => window.DMX?.open(), ck: () => !!window.DMX && DMX.D.state === 'ok' && DMX.P.on },
    led: { l: 'Mur LED : configurateur', run: () => ST.LED.toggle(), ck: () => ST.LED.isOpen() },
    walkHere: { l: 'Aller ici à pied', run: () => { if (!ctxAt) return; const r = A.canvas.getBoundingClientRect(); if (ctxAt[0] > r.right || ctxAt[1] > r.bottom) return ST.toast('« Aller ici à pied » s\'utilise dans la vue 3D.'); A.walkTo({ clientX: ctxAt[0], clientY: ctxAt[1] }); } },
    flib: { l: 'Bibliothèques de projecteurs (Titan, GDTF Share)', run: () => window.FLIB?.toggle(), ck: () => !!window.FLIB && FLIB.isOpen() },
    mcp: { l: 'Connecter à Claude (connecteur)…', run: () => window.AI?.connectInfo() },
    desk: { l: 'Pupitre lumière', k: 'U', run: () => window.DESK?.toggle(), ck: () => !!window.DESK && DESK.isOpen() },
    ai: { l: 'Assistant (texte et voix)', k: 'I', run: () => window.AI?.toggle(), ck: () => !!window.AI && AI.isOpen() },
    music: { l: 'Musique et son-lumière', k: 'M', run: () => window.AUDIO?.toggle(), ck: () => !!window.AUDIO && AUDIO.isOpen() },
    tSpl: { l: 'Carte de pression sonore (SPL)', run: () => { UI.spl = !UI.spl; ST.splMap(); ST.render(); }, ck: () => UI.spl }, tCov: { l: 'Couverture des enceintes', run: () => { UI.cov = !UI.cov; ST.touch(true); ST.render(); }, ck: () => UI.cov },
    tPatch: { l: 'Patch DMX automatique', run: () => ST.runAct('autopatch') }, tAuto: { l: 'Enchaîner les mémoires', run: () => ST.runAct('auto'), ck: () => UI.auto },
    envSave: { l: () => (window.PARC && A.venue.vid && PARC.REC[A.venue.vid] ? 'Mettre à jour cet environnement…' : 'Enregistrer cet environnement…'), run: () => window.PARC && PARC.saveDialog(), on: () => A.venue.type === 'param' },
    live: { l: 'Mode spectacle', run: () => ST.setLive(!A.live), ck: () => A.live },
    welcome: { l: 'Prise en main', run: () => WS.welcome() },
    keys: { l: 'Raccourcis clavier', k: 'F1', run: shortcuts }, nav: { l: 'Aide de navigation', run: () => A.toggleHelp(), ck: () => !$('#help').classList.contains('hide') }, about: { l: 'À propos', run: about },
  };
  for (const [id, c] of Object.entries(A.CONFIGS)) C['cfg_' + id] = { l: c.label + ' — ' + c.sub, run: () => A.userConfig(id), ck: () => A.config === id };
  const setQ = q => { const e = $('#qual'); e.value = q; e.dispatchEvent(new Event('change')); };
  const MENUS = {
    Fichier: ['new', 'resume', 'open', 'backups', '-', 'save', 'reload', 'rename', '-', 'import', 'xproj', 'xmvr', 'xpatch', 'xgear', 'xplan', 'pubPdf', 'secuPdf', 'shot', '-', 'demo'],
    'Édition': ['undo', 'redo', 'hist', '-', 'cut', 'copy', 'paste', 'dup', 'array', 'del', '-', 'all', 'same', 'inv', 'none', '-', 'prefs'],
    Objet: ['move', 'rot', 'aim', 'focus', '-', 'alx', 'alz', 'aly', 'dix', 'diz', 'mirror', '-', 'lock', 'hide', 'showAll', 'unlockAll', '-', 'renum'],
    // les configurations (One man show, Concert debout…) sont celles de la salle de démonstration : on ne les propose que quand c'est elle qui est ouverte, jamais sur une page blanche ou dans une salle sur mesure
    Environnement: () => { const envs = window.PARC ? PARC.list() : []; for (const v of envs) C['env_' + v.vid] = { l: v.name + (v.fixed ? ' — ' + v.fixed + ' élément(s) fixe(s)' : ''), run: () => PARC.openEnv(v.vid), ck: () => A.venue.vid === v.vid };          // les environnements enregistrés sur ce poste : un clic ouvre un nouveau projet dans ce lieu
      return ['side', 'venue', 'envSave', 'parc', 'venueCal', 'venuePipes', 'scene', ...(envs.length ? ['-', ...envs.map(v => 'env_' + v.vid)] : []), ...(A.venue.type === 'param' ? [] : ['-', ...Object.keys(A.CONFIGS).map(id => 'cfg_' + id)]), '-', 'live']; },
    Affichage: ['vOrbit', 'vWalk', 'vTop', 'vSide', '-', 'plan', 'atelier', 'drawer', 'list', 'side', '-', 'viewOpt', 'ext3d', 'dockAll', '-', 'swPlan', 'swAtelier', 'swEnv', 'swRail', '-', 'labels', 'qH', 'qM', 'qB', 'full'],
    Outils: ['desk', 'ai', 'mcp', 'flib', '-', 'hpt', 'pont', 'struct', 'rigP', 'rig', 'secu', 'larray', 'cotes', '-', 'dmx', 'music', 'led', '-', 'tSpl', 'tCov', 'tPatch', '-', 'tAuto'],
    Aide: ['welcome', 'keys', 'nav', 'helpRig', 'helpSalle', 'about'],
  };
  const CTX = ['cut', 'copy', 'paste', 'dup', 'del', '-', 'aim', 'focus', 'mirror', '-', 'lock', 'hide', '-', 'all', 'same', '-', 'walkHere']; let ctxAt = null;
  function run(id){ const c = C[id]; if (!c || (c.on && !c.on())) return; closeMenu(); c.run(); status(); }

  // ---------------------------------------------------------------- menus déroulants et menu contextuel
  const pop = $('#menuPop'); let openName = null;
  const itemsHtml = ids => ids.map(id => { if (id === '-') return '<hr>'; const c = C[id], off = c.on && !c.on(); return `<div class="mi${off ? ' off' : ''}" data-c="${id}"><span class="ck">${c.ck && c.ck() ? '✓' : ''}</span><span>${esc(typeof c.l === 'function' ? c.l() : c.l)}</span>${c.k ? `<kbd>${c.k}</kbd>` : ''}</div>`; }).join('');
  function place(x, y){ pop.style.display = 'block'; const w = pop.offsetWidth, h = pop.offsetHeight; pop.style.left = Math.max(4, Math.min(x, innerWidth - w - 6)) + 'px'; pop.style.top = Math.max(4, Math.min(y, innerHeight - h - 30)) + 'px'; }
  function openMenu(name, btn){ openName = name; { const m = MENUS[name]; pop.innerHTML = itemsHtml(typeof m === 'function' ? m() : m); } const r = btn.getBoundingClientRect(); place(r.left, r.bottom + 4); document.querySelectorAll('#menus .mn').forEach(b => b.classList.toggle('open', b === btn)); }
  function closeMenu(){ openName = null; pop.style.display = 'none'; document.querySelectorAll('#menus .mn').forEach(b => b.classList.remove('open')); }
  function ctx(x, y){ ctxAt = [x, y]; openName = '_ctx'; pop.innerHTML = (UI.sel.length ? `<div class="mh">${UI.sel.length > 1 ? UI.sel.length + ' objets' : esc(sel()[0]?.name || '')}</div>` : '') + itemsHtml(CTX); place(x, y); }
  $('#menus').innerHTML = Object.keys(MENUS).map(n => `<button class="mn" data-m="${n}">${n}</button>`).join('');
  document.querySelectorAll('#menus .mn').forEach(b => { b.onclick = e => { e.stopPropagation(); openName === b.dataset.m ? closeMenu() : openMenu(b.dataset.m, b); }; b.onmouseenter = () => { if (openName && openName !== '_ctx' && openName !== b.dataset.m) openMenu(b.dataset.m, b); }; });
  pop.addEventListener('click', e => { const it = e.target.closest('.mi'); if (it) run(it.dataset.c); });
  addEventListener('pointerdown', e => { if (openName && !pop.contains(e.target) && !e.target.closest('#menus')) closeMenu(); }, true);
  addEventListener('blur', closeMenu);
  $('#undoBtn').onclick = () => ST.undo(); $('#redoBtn').onclick = () => ST.redo();
  let rdown = null;
  A.canvas.addEventListener('pointerdown', e => { if (e.button === 2) rdown = [e.clientX, e.clientY]; });
  A.canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (A.mode !== 'walk' && rdown && Math.hypot(e.clientX - rdown[0], e.clientY - rdown[1]) < 5) ctx(e.clientX, e.clientY); });

  // ---------------------------------------------------------------- fenêtres : historique, préférences, raccourcis
  function history(){
    const h = ST.hist(), t = at => new Date(at).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    ST.modal(`<h1>Historique</h1><div class="sub">Clique une ligne pour revenir juste avant cette action. ${h.undo.length} action(s) annulable(s), ${h.redo.length} à rétablir.</div>
      <div class="olist" style="max-height:50vh;overflow:auto">${h.undo.length ? h.undo.map((u, i) => `<div class="or" data-a="wsHist" data-id="${i}"><span class="n">${i + 1}</span><span class="nm">${esc(u.label)}</span><span style="color:var(--mute)">${t(u.at)}</span></div>`).reverse().join('') : '<div class="sub">Aucune action pour l\'instant.</div>'}</div>
      <div class="btns"><button class="b" data-a="close">Fermer</button></div>`);
  }
  function prefs(){
    const opt = [[0, 'Libre (aucun)'], [.01, '1 cm'], [.05, '5 cm'], [.1, '10 cm'], [.25, '25 cm'], [.5, '50 cm'], [1, '1 m']];
    ST.modal(`<h1>Préférences</h1><div class="pf"><label>Pas d'accrochage</label><select id="pfSnap">${opt.map(([v, l]) => `<option value="${v}"${v === pref.snap ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="sub">S'applique au déplacement dans la vue 3D, dans le plan 2D et aux flèches du clavier. Maintiens Alt dans le plan pour un déplacement libre.</div>
      <div class="btns"><button class="b on" data-a="wsPrefOk">OK</button><button class="b" data-a="close">Annuler</button></div>`);
  }
  function shortcuts(){
    const rows = [['Fichier'], ['Ctrl+S', 'Enregistrer en ligne'], ['Ctrl+O', 'Ouvrir un projet, un GDTF ou un MVR'], ['Ctrl+E', 'Exporter le projet'],
      ['Édition'], ['Ctrl+Z / Ctrl+Y', 'Annuler / rétablir (objets et lieu)'], ['Ctrl+X / C / V', 'Couper / copier / coller'], ['Ctrl+D', 'Dupliquer'], ['Suppr', 'Supprimer'], ['Ctrl+A / Ctrl+I', 'Tout sélectionner / inverser'], ['Échap', 'Annuler l\'outil ou désélectionner'], ['Maj + clic', 'Ajouter à la sélection'],
      ['Objets'], ['Flèches / anneau jaune', 'Déplacer / tourner l\'objet sélectionné'], ['G / R / V', 'Flèches + anneau / anneau seul / viser un point'], ['← → ↑ ↓', 'Décaler d\'un pas (Maj : ×10)'], ['Page ↑ / Page ↓', 'Monter / descendre'], ['Ctrl+M', 'Copie miroir cour / jardin'], ['Ctrl+L', 'Verrouiller / déverrouiller'], ['H / Maj+H', 'Masquer / tout afficher'], ['F', 'Centrer la vue sur la sélection'],
      ['Affichage'], ['1 2 3 4', 'Orbite / marcher / plan / coupe'], ['P', 'Plan technique 2D à côté de la 3D'], ['L', 'Inspecteur'], ['O', 'Liste des objets (double-clic sur une ligne : ses réglages)'], ['Outils'], ['U', 'Pupitre lumière (Espace : GO, Maj+Espace : Back, Entrée : ligne de commande)'], ['I', 'Assistant, texte et voix'], ['M', 'Musique et son-lumière'], ['K', 'Plan de charge des perches'], ['N', 'DMX / réseau'], ['Ctrl+N', 'Nouveau projet vierge'], ['Affichage (suite)'], ['Tab', 'Panneau Environnement'], ['F1', 'Cette fenêtre'],
      ['Pose'], ['Clic', 'Poser un objet (vue 3D ou plan 2D)'], ['Tirer une ligne', 'Poser la quantité choisie au même écartement'], ['Molette en tirant', 'Changer la quantité'], ['Maj', 'Continuer à poser'], ['Praticables', 'Tracer un rectangle : il se remplit de modules ; un clic : bloc colonnes × rangées'], ['Habiller la scène', 'Réglages d\'un praticable : jupe, garde-corps, escalier sur le pourtour'], ['Plan 2D'], ['Molette', 'Zoom'], ['Glisser le fond', 'Déplacer le plan'], ['Maj + glisser', 'Sélection par rectangle'], ['Clic droit', 'Menu contextuel'], ['Double-clic', 'Ajuster à la fenêtre']];
    ST.modal(`<h1>Raccourcis clavier</h1><div style="max-height:62vh;overflow:auto"><table class="keys">${rows.map(r => r.length === 1 ? `<tr><th colspan="2">${r[0]}</th></tr>` : `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table></div><div class="btns"><button class="b" data-a="close">Fermer</button></div>`);
  }
  // projet vierge : salle au choix, plateau nu, aucune mémoire ; la scène ne change plus avec la configuration
  function newProject(){
    const last = A.store.get('newFrom', 'open'), sel = v => v === last ? ' selected' : '';
    ST.modal(`<h1>Nouveau projet</h1><div class="sub">Aucun matériel, aucune mémoire. Le projet en cours reste récupérable avec Ctrl+Z.</div>
      <div class="pf" style="grid-template-columns:150px 1fr"><label>Nom du projet</label><input type="text" id="npName" value="Nouvelle création">
      <label>Point de départ</label><select id="npRoom" class="inp" onchange="document.getElementById('npDemo').style.display=this.value==='onex'?'contents':'none'"><option value="open"${sel('open')}>Espace vide — plein air, aucun bâtiment</option><option value="param"${sel('param')}>Environnement à décrire — dimensions à saisir, ou plans à importer</option>${(window.PARC ? PARC.list() : []).map(v => `<option value="v:${esc(v.vid)}">${esc(v.name)} — environnement enregistré${v.parc ? ', parc de ' + v.parc + ' références' : ''}</option>`).join('')}<option value="onex"${sel('onex')}>Salle de démonstration — polyvalente, 1000 places</option></select>
      <div id="npDemo" style="display:${last === 'onex' ? 'contents' : 'none'}"><label>Configuration</label><select id="npCfg" class="inp">${Object.entries(A.CONFIGS).map(([k, c]) => `<option value="${k}"${k === (A.config || 'oneman') ? ' selected' : ''}>${esc(c.label)} — ${esc(c.sub)}</option>`).join('')}</select>
      <label>Hauteur des perches</label><select id="npH" class="inp"><option value="6">6,00 m (réglage)</option><option value="7">7,00 m (jeu)</option><option value="1.4">1,40 m (à hauteur d'homme, pour équiper)</option></select>
      <label>Rideaux</label><select id="npR" class="inp"><option value="1">Rideau de fond et pendrillons</option><option value="0">Plateau sans rideaux</option></select></div></div>
      <div class="btns"><button class="b on" data-a="wsNewOk">Créer</button><button class="b" data-a="close">Annuler</button></div>`);
  }
  // aide : salles enregistrées, parc, types à la volée, import d'une fiche technique
  function helpRig(){ ST.modal(`<h1>Ponts, charges, décor, publication</h1><div style="max-height:66vh;overflow:auto;line-height:1.6">
    <h2>L'écran</h2><div class="info">Les <b>métiers</b> (Dessin, Scène, Rigging, Lumière, Son, Vidéo) changent les outils du rail. L'<b>Inspecteur</b> donne les réglages de ce qui est sélectionné et le projet (calques, cartouche). Le <b>tiroir du bas</b> rassemble Patch, Bibliothèque, Liste, Rigging et charges, Sécurité, Console, Avertissements ; un clic sur l'onglet ouvert le replie, sa bordure haute se tire.</div>
    <h2>Points d'accroche d'abord</h2><div class="info">Métier <b>Rigging</b>, outil <b>Point d'accroche</b> : moteur ou point fixe, hauteur et capacité si tu les connais, posé d'un clic, seul ou en grille (tant en largeur × tant en profondeur). Un pont tracé dessous reprend ces points : ce sont eux qui le portent. Un point à l'angle de deux ponts les porte tous les deux.</div>
    <h2>Tracer un pont</h2><div class="info">Accroche au choix : moteurs répartis, aucun point (pont seul), ou deux tours. Après le premier clic, tu peux <b>taper la longueur</b> : la découpe la plus proche en éléments du catalogue est posée, avec le moins de pièces possible. Dans l'Inspecteur, les longueurs réalisables voisines sont proposées.<br>Métier <b>Rigging</b>, outil <b>Pont</b>. Choisis la série (Prolyte H30V, H40V, X30V, Global Truss F34, ou générique), la hauteur sous pont, « suspendu sur moteurs » ou « sur deux tours ». Clique un bout, puis l'autre, dans le plan ou la vue 3D. La longueur se cale sur les éléments du catalogue et le pont est <b>découpé en éléments réels</b>, avec leur poids. Près d'un bout de pont, le nouveau s'y <b>raccorde</b> et se cale sur les angles des coins du catalogue. « Enchaîner » repart du dernier bout. Alt : longueur libre. Échap : terminer.<br>Un pont se sélectionne d'un clic, se glisse dans le plan, se règle dans l'Inspecteur. Suppr le retire.</div>
    <h2>Cubes d'angle</h2><div class="info">Dès que deux ponts se touchent par leurs bouts à la même hauteur, ou qu'un pont repose sur une tour, un <b>cube d'angle</b> est dessiné au raccord, dans le plan et en 3D, avec la référence du coin du catalogue. Aucun fabricant ne donnant ici le poids de ses coins, il reste « inconnu » : saisis-le une fois par référence dans la <b>nomenclature</b> du volet Rigging et charges, il est alors compté au bout des ponts qu'il relie. Deux ponts dans le prolongement l'un de l'autre n'ont pas de cube. Un pont qui arrive sur le corps d'un autre fait une <b>jonction en T</b> : le tracé s'y aimante, le té du catalogue est compté, et la nomenclature rappelle que le pont traversé est à recouper de part et d'autre.</div>
    <h2>Pièce par pièce</h2><div class="info">Dans l'outil Pont, bouton <b>Pièce par pièce</b>. Choisis la longueur dans la barre (toutes celles du catalogue de la série), clique : la pièce est posée. Les clics suivants ajoutent une pièce au bout : souris droit devant, elle <b>prolonge</b> le pont ; souris sur le côté, elle <b>part en coin</b> à l'angle du catalogue. Change de longueur quand tu veux. <b>Retour arrière</b> retire la dernière pièce, <b>R</b> tourne une pièce posée librement, <b>Échap</b> lâche le bout pour commencer ailleurs. Près d'un bout de pont existant, la pièce s'y raccorde.<br>Dans l'Inspecteur du pont, chaque pièce se remplace ou se retire, et « + pièce » en ajoute une au bout.</div>
    <h2>Charges dans la vue 3D</h2><div class="info">Flèches jaunes : les appareils. Flèches bleues : les charges ajoutées. Au-dessus de chaque point : la charge à retenir, verte, orange (capacité inconnue) ou rouge (dépassée). Sous le pont : la courbe du moment fléchissant. La case « Charges dans la vue 3D » du volet Rigging et charges les masque.</div>
    <h2>Structures toutes faites</h2><div class="info">Portique, gril sur quatre tours, pont suspendu, ligne de totems : cotes, série, aperçu, puis « Poser la structure ». Chaque pont créé est un vrai pont du projet.</div>
    <h2>Accrocher</h2><div class="info"><b>Aimant</b> : glisse un projecteur, une enceinte ou un vidéoprojecteur près d'une perche ou d'un pont, il s'y accroche et se cale sur l'axe ; tire-le plus loin, il se décroche. Alt enfoncé : pas d'aimant. Un moteur glissé près d'un pont devient son point de levage.<br>Pose un projecteur sur un pont (clic sur le pont en 3D, ou dessus dans le plan) : il s'accroche dessous et suit le pont s'il monte ou se déplace. Tracer une ligne le long du pont en pose plusieurs au même écartement.</div>
    <h2>Points d'accroche et charges</h2><div class="info">Dans l'Inspecteur du pont : position de chaque point, moteur, point fixe ou tour, capacité. Le détail (▸) donne le poids et la classe du moteur (D8, D8+, C1), la sécurité secondaire, l'élingue, le palonnier à deux brins, le point du bâtiment. S'y ajoutent les charges libres (enceinte, rideau, décor), les bras de déport et les échelles.<br>Le volet <b>Rigging et charges</b> donne pour chaque point trois chiffres : <b>idéal</b> (tout porte), <b>défavorable</b> (un point voisin ne porte plus), <b>à retenir</b> (défavorable, majoré sur un moteur). Chaque résultat est calculé par deux méthodes indépendantes ; si elles divergent, aucun chiffre n'est affiché. Une donnée manquante n'est jamais comptée comme bonne : le contrôle passe à « non vérifié ».<br>Les perches de l'environnement gardent leur propre plan de charge (tube, contrainte, flèche).</div>
    <h2>Sécurité</h2><div class="info">Réglages du projet (majoration sur moteurs, câblage, crochets, public sous les charges, alimentation), synthèse des ponts et des perches, électricité, douze contrôles à cocher sur site, et le <b>rapport de sécurité</b> en PDF. Le logiciel ne déclare jamais une accroche sûre.</div>
    <h2>Décor et personnages</h2><div class="info">Métier <b>Scène</b>, outil Décor, ou Bibliothèque → Décor : mobilier, instruments, décor, tissus, technique, 19 personnages. Largeur, profondeur, hauteur et teinte se règlent dans l'Inspecteur. Leur poids est inconnu tant que tu ne le saisis pas.</div>
    <h2>Line array</h2><div class="info">Métier <b>Son</b>, outil Line array. Modèle (données publiées par le fabricant, source citée), nombre de boîtes, angles entre boîtes, hauteur, public en coupe. Tu lis le poids, la hauteur de la ligne, le point d'accroche (ou la charge de deux points) et où vise chaque boîte. « Viser automatiquement » répartit les visées du dernier rang au premier. « Poser dans la scène » crée les boîtes ; « Charger le pont le plus proche » ajoute leur poids au pont. Les limites mécaniques du cadre et le niveau réel se lisent dans le logiciel du fabricant.</div>
    <h2>Cotes, calques, PDF</h2><div class="info">Outil <b>Cote</b> : deux clics pour les deux points (ils s'aimantent aux objets et aux bouts de ponts), un troisième pour écarter la ligne. Clic droit sur une cote : la retirer.<br><b>Calques</b> (Inspecteur → Projet) : Lumière, Vidéo, Son, Structure, Décor, Ponts, Cotes. Un calque décoché disparaît du plan, de la coupe, de la 3D et du PDF.<br><b>Fichier → Publier en PDF</b> : plan et coupe à l'échelle avec cartouche, liste du matériel, patch, rigging et charges, nomenclature des ponts, rapport de sécurité.</div>
    </div><div class="btns"><button class="b on" data-a="close">Fermer</button></div>`); $('#modal').firstElementChild.style.width = 'min(760px,94vw)'; }
  function helpSalle(){ ST.modal(`<h1>Environnements et parc de matériel</h1><div style="max-height:66vh;overflow:auto;line-height:1.6">
    <div class="info"><b>Un environnement se garde à part des projets.</b> Une salle, un chapiteau, une scène de plein air : ses dimensions, ses perches, son matériel installé à demeure, son parc et ses types créés à la volée sont enregistrés sur ce poste. Fichier → Nouveau projet propose tous les environnements enregistrés : le nouveau projet retrouve l’environnement entier.</div>
    <div class="info"><b>Parc de matériel</b> (menu Environnement, ou onglet « Parc » de la bibliothèque) : une ligne par référence, avec catégorie (lumière, son, vidéo, plateau, micros, backline), libellé de la fiche, type de la bibliothèque et quantité. Tout se modifie à la main. Une ligne sans type est gardée pour mémoire (micros, backline).</div>
    <div class="info"><b>Bibliothèque filtrée</b> : dans la bibliothèque (tiroir du bas), l'onglet « Parc » ne montre que le matériel de l’environnement. Chaque type affiche « posés sur stock » ; il passe au rouge et une alerte s'affiche quand tu poses plus que le stock.</div>
    <div class="info"><b>Créer un type</b> : quand un appareil n'existe ni dans Titan ni en GDTF, « Créer un type… » dans la fenêtre du parc demande un nom, une catégorie, une forme de base, un poids et un nombre de canaux. Un poids laissé vide reste inconnu : il compte 0 kg dans le plan de charge et porte le signe ⚠.</div>
    <div class="info"><b>Matériel installé à demeure</b> : rideau de fond, pendrillons, frises, cyclo, diffusion, vidéoprojecteur. Il revient dans chaque projet de l’environnement. Pour y ajouter un objet posé à la main : sélectionne-le, puis « Marquer la sélection comme matériel de l’environnement » dans la fenêtre du parc.</div>
    <div class="info"><b>Importer une fiche technique</b> (Fichier → Créer un environnement depuis des plans) : dépose la fiche, puis demande à Claude, par le connecteur, de créer l’environnement. L'import se fait en trois passes : l’environnement et les perches, le parc avec ses quantités, puis le matériel fixe. Le projet ouvert n'est jamais remplacé sans ton accord : il est mis de côté (Fichier → Projets mis de côté).</div>
    <div class="info"><b>Charges et circuits</b> : le nombre de circuits par perche lu dans la fiche est inscrit directement. Une charge admissible lue dans la fiche est seulement proposée dans le plan de charge (touche K) : c'est toi qui la valides, perche par perche.</div>
    <div class="info"><b>Perches en pont et moteurs</b> : une perche peut être un pont (truss) plutôt qu'un tube, portée par des moteurs. Dans « Perches de l’environnement », choisis Structure : Pont et le nombre de moteurs. Le plan de charge vérifie alors la charge totale et ce que reprend chaque moteur ; la contrainte et la flèche d'un pont ne sont pas calculées (tableaux du fabricant).</div>
    <div class="info"><b>DMX des appareils</b> : un projecteur importé de Titan ou d'un GDTF arrive avec ses vrais modes. Un projecteur sur gradateur créé à la volée répond sur 1 canal. Pour un automatique créé à la volée, l'ordre des canaux doit être décrit (Claude le recopie de la notice) ; sinon il se patche mais ne répond pas, et il est signalé.</div>
    <div class="info"><b>Recouvrement sonore</b> : Outils → Niveau sonore, ou demande-le à Claude. La carte montre le niveau direct maximal des enceintes posées, à hauteur d'oreille. Le niveau d'une enceinte créée à la volée est celui de sa forme de base tant que le niveau du fabricant n'est pas renseigné.</div>
    <div class="info"><b>Seulement sur la version PC</b> : la recherche dans la bibliothèque Titan, le connecteur Claude, et l'enregistrement des environnements dans un fichier du poste (ailleurs, ils restent dans le stockage du navigateur).</div></div>
    <div class="btns"><button class="b" data-a="close">Fermer</button></div>`); }
  function about(){ ST.modal(`<h1>StageFactory 4.38.0</h1><div class="sub">Prévisualisation de spectacle : implantation, lumière, son, vidéo, charges, en plein air, dans un environnement décrit par ses dimensions ou créé depuis ses plans (PDF, DWG, DXF).<br><br>La version 4 réunit StageFactory et ScenoFactory : ponts par fabricant, structures, points d'accroche et calcul des charges, sécurité, décor et personnages, cotes, calques, publication PDF, line array.<br><br><b>Salle de démonstration</b> : une salle polyvalente de 1000 places à six configurations, fournie comme exemple.<br><br>Le projet est sauvegardé automatiquement dans ce navigateur ; « Enregistrer en ligne » le garde sur ton compte.</div><div class="btns"><button class="b" data-a="close">Fermer</button></div>`); }
  function act(a, id, e, el){
    if (a === 'wsRenameOk'){ ST.pushUndo(0, 'Renommer le projet'); S.name = $('#pjName').value.trim() || S.name; $('#modal').style.display = 'none'; ST.touch(); ST.render(); }
    else if (a === 'wsNewOk'){ const name = $('#npName').value.trim() || 'Nouvelle création', cfg = $('#npCfg').value, hh = +$('#npH').value, rid = $('#npR').value === '1'; $('#modal').style.display = 'none';
      if ($('#npRoom').value.startsWith('v:')){ if (window.PARC && PARC.newProjectIn($('#npRoom').value.slice(2), name)){ A.toggleSide(false); ST.toast('Nouveau projet dans l’environnement enregistré : matériel fixe et parc retrouvés.'); } status(); return; }
      const from = $('#npRoom').value, prm = from !== 'onex'; A.store.set('newFrom', from); window.PARC?.backup('avant un nouveau projet'); ST.pushUndo(0, 'Nouveau projet'); ST.loadShow({ name, objs: [], cues: [], follow: false, salle: from === 'open' ? { ...A.VOPEN, name } : prm ? { ...A.VDEF, name } : { type: 'onex' } }); if (!prm){ A.setConfig(cfg, true); A.PERCHES.forEach((P, i) => A.setPerche(i, hh)); A.notifyPerches(); [7, 9, 11, 13].forEach((pi, k) => A.setCurtainPerche(k, pi)); } else { A.toggleSide(false); }
      for (const [id, v] of [['fRid', rid], ['rFond', true], ['rPend', true]]){ const e = $('#' + id); if (e && e.checked !== v){ e.checked = v; } } A.syncCurtains?.(); ST.setLive(false); ST.select([]); ST.UI.tab = 'lib'; A.toggleConsole(true); ST.touch(); ST.render(); if (from === 'open') A.toggleSide(true); ST.toast(from === 'open' ? 'Espace vide créé. Commence par la scène : Environnement → Scène en praticables, ou la bibliothèque.' : 'Projet créé. Pose ton matériel depuis la bibliothèque.'); }
    else if (a === 'wsPrefOk'){ pref.snap = +$('#pfSnap').value; $('#modal').style.display = 'none'; applySnap(); }
    else if (a === 'wsHist'){ ST.undoTo(+id); $('#modal').style.display = 'none'; ST.toast('Retour à l\'étape ' + (+id + 1) + '. Ctrl+Y pour rétablir.'); }
    else if (a === 'ohide'){ e.stopPropagation?.(); const o = ST.byId(id); setFlag('hidden', !o.hidden, [o]); }
    else if (a === 'olock'){ e.stopPropagation?.(); const o = ST.byId(id); setFlag('locked', !o.locked, [o]); }
    else if (a === 'ocat'){ ST.select(S.objs.filter(o => cat(o) === id && !o.hidden && !o.locked).map(o => o.id)); }
    else if (a === 'ofold'){ closed[id] = !closed[id]; ST.render(); }
    else if (C[a]) run(a);
  }

  // ---------------------------------------------------------------- onglet « Objets » (liste)
  const CATS = { lum: 'Lumière', vid: 'Vidéo', son: 'Son', str: 'Structures et décor' };
  function listBody(){
    const q = listQ.trim().toLowerCase(); let h = '';
    for (const [c, label] of Object.entries(CATS)){
      const list = S.objs.filter(o => cat(o) === c && (!q || (o.name || '').toLowerCase().includes(q) || String(o.n).includes(q) || ST.typeOf(o).name.toLowerCase().includes(q) || (o.grp || '').toLowerCase().includes(q))).sort((a, b) => a.n - b.n);
      if (!list.length) continue;
      h += `<div class="oh"><span data-a="ofold" data-id="${c}">${closed[c] ? '▸' : '▾'} ${label} (${list.length})</span><span data-a="ocat" data-id="${c}" title="Sélectionner toute la catégorie">tout</span></div>`;
      if (!closed[c]) h += list.map(o => `<div class="or${UI.sel.includes(o.id) ? ' on' : ''}" data-a="sel" data-id="${o.id}" style="${o.hidden ? 'opacity:.45' : ''}"><span class="n">${o.n ?? ''}</span><span class="nm" title="${esc(ST.typeOf(o).name)}">${esc(o.name || ST.typeOf(o).name)}${c === 'lum' && o.addr ? ` <span style="color:var(--mute)">${ST.addrStr(o)}</span>` : ''}</span><i data-a="ohide" data-id="${o.id}" class="${o.hidden ? 'act' : ''}" title="Masquer / afficher">${o.hidden ? '◌' : '●'}</i><i data-a="olock" data-id="${o.id}" class="${o.locked ? 'act' : ''}" title="Verrouiller / déverrouiller">${o.locked ? '🔒' : '🔓'}</i></div>`).join('');
    }
    return h || `<div class="sub">${S.objs.length ? 'Aucun objet ne correspond.' : 'Aucun objet. Pose du matériel depuis l\'onglet « Biblio. ».'}</div>`;
  }
  const listHtml = () => `<input type="search" data-ws="q" placeholder="Rechercher (nom, numéro, type, groupe)…" value="${esc(listQ)}" style="width:100%;box-sizing:border-box;margin:2px 0 6px;padding:6px 8px;background:#15171c;border:1px solid var(--line);border-radius:7px;color:var(--ink);font:inherit">
    <div class="sub" style="margin:0 0 4px">${S.objs.length} objet(s) · ${S.objs.filter(o => o.hidden).length} masqué(s) · ${S.objs.filter(o => o.locked).length} verrouillé(s). Double-clic : ouvrir les réglages de l'objet. Maj + clic pour en sélectionner plusieurs.</div><div class="olist" id="olBody">${listBody()}</div>`;
  document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.ws === 'q'){ listQ = e.target.value; e.stopPropagation(); $('#olBody').innerHTML = listBody(); } }, true);

  // ---------------------------------------------------------------- barre d'état
  let stT = 0;
  function status(){ if (stT) return; stT = requestAnimationFrame(() => { stT = 0;
    const s = sel(), o = s[s.length - 1];
    $('#stMsg').textContent = UI.placing ? (UI.serie > 1 || UI.serieStep > 0 ? 'Presse et tire une ligne (vue 3D ou plan 2D) pour poser la série · molette : quantité · Échap pour arrêter' : 'Clique pour poser l\'objet (vue 3D ou plan 2D) · Échap pour arrêter') : UI.aiming ? 'Clique le point à viser · Échap pour annuler' : A.mode === 'walk' ? 'Marche : ZQSD / flèches, souris pour regarder · Échap pour sortir' : s.length ? 'Flèches : déplacer · anneau jaune : tourner · V viser · clavier : décaler · clic droit : menu' : 'Clic : sélectionner · Maj + clic : ajouter · F1 : raccourcis';
    $('#stSel').textContent = s.length > 1 ? s.length + ' objets sélectionnés' : o ? `${o.n ?? ''} ${o.name || ''}${o.locked ? ' (verrouillé)' : ''}` : '';
    $('#stPos').textContent = o ? `X ${f2(o.pos[0])}  Z ${f2(o.pos[2])}  H ${f2(ST.posOf(o).y)}` : '';
    $('#stSnap').textContent = 'Pas : ' + (pref.snap ? (pref.snap < 1 ? Math.round(pref.snap * 100) + ' cm' : pref.snap + ' m') : 'libre');
    $('#stCfg').textContent = (A.venue.type === 'param' ? A.venue.name : A.config ? A.CONFIGS[A.config].label : 'Config. personnalisée') + ' · ' + S.objs.length + ' objets';
    const sv = $('#stSave'); sv.classList.toggle('dirty', !!UI.dirty && ST.hasCloud()); sv.textContent = !ST.hasCloud() ? 'Sauvegarde locale auto' : UI.dirty ? '● Non enregistré en ligne' : UI.savedAt ? 'Enregistré en ligne' : 'Sauvegarde locale auto';
    sv.title = S.name; }); }
  $('#stSnap').onclick = () => { const st = [0, .01, .05, .1, .25, .5, 1]; pref.snap = st[(st.indexOf(pref.snap) + 1) % st.length]; applySnap(); };
  $('#stSave').style.cursor = 'pointer'; $('#stSave').onclick = () => run('save');
  setInterval(status, 600);

  // ---------------------------------------------------------------- raccourcis clavier
  addEventListener('keydown', e => {
    const code = /^[a-z]$/i.test(e.key) ? 'Key' + e.key.toUpperCase() : e.code;   // lettre gravée sur la touche (clavier suisse / AZERTY), pas sa position physique
    if (code === 'Escape' && openName){ closeMenu(); return; }
    if (code === 'F1'){ e.preventDefault(); return shortcuts(); }
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && code === 'KeyS'){ e.preventDefault(); return run('save'); }
    if ((e => { const t = e.target; return t.tagName === 'TEXTAREA' || t.isContentEditable || (t.tagName === 'INPUT' && !/^(range|checkbox|radio|button|color|file)$/.test(t.type)); })(e) || $('#modal').style.display === 'flex') return;
    if (ctrl && code === 'KeyN'){ e.preventDefault(); return run('new'); }
    if (ctrl && code === 'KeyO'){ e.preventDefault(); return run('open'); }
    if (ctrl && code === 'KeyE'){ e.preventDefault(); return run('xproj'); }
    if (A.mode === 'walk'){ if (!ctrl && code === 'Digit1') A.setMode('orbit'); return; }
    const map = ctrl ? { KeyC: 'copy', KeyX: 'cut', KeyV: 'paste', KeyI: 'inv', KeyL: 'lock', KeyM: 'mirror' } : e.shiftKey ? { KeyH: 'showAll' } : { KeyH: 'hide', KeyF: 'focus', KeyO: 'list', KeyK: 'rig', KeyN: 'dmx', KeyM: 'music', KeyI: 'ai', KeyU: 'desk', Digit1: 'vOrbit', Digit2: 'vWalk', Digit3: 'vTop', Digit4: 'vSide' };
    if (ctrl && (code === 'KeyC' || code === 'KeyV') && !UI.sel.length && window.PONTS && (code === 'KeyC' ? (PONTS.sel && !PONTS.tl) : PONTS.clip)) return;   // une structure, un pont ou des pièces choisis : c'est ponts.js qui copie et colle
    if (map[code]){ e.preventDefault(); e.stopImmediatePropagation(); return run(map[code]); }
    if (!ctrl && UI.sel.length){ const st = (pref.snap || .05) * (e.shiftKey ? 10 : 1), d = { ArrowLeft: [-st, 0, 0], ArrowRight: [st, 0, 0], ArrowUp: [0, 0, -st], ArrowDown: [0, 0, st], PageUp: [0, st, 0], PageDown: [0, -st, 0] }[code]; if (d){ e.preventDefault(); nudge(...d); } }
  }, true);
  addEventListener('beforeunload', () => { try { A.store.set('show', ST.serialize()); } catch (_){} });

  // premier lancement : trois points d'entrée, puis on n'y revient plus
  function welcome(){ ST.modal(`<h1>Bienvenue dans StageFactory</h1><div class="sub">Pour préparer un plateau en 3D : implantation, lumière, son, vidéo, charges. Tu pars d'un espace vide, d'un environnement décrit par ses dimensions ou créé depuis ses plans, ou de la salle de démonstration.</div>
    <div class="info" style="line-height:1.7"><b>Environnement</b> (à gauche) : configuration, tribune, fosse, perches, rideaux.<br><b>Métiers</b> (en haut) : Dessin, Scène, Rigging, Lumière, Son, Vidéo ; chacun a ses outils dans le rail.<br><b>Inspecteur</b> (à droite) : réglages de la sélection, projet, calques.<br><b>Tiroir du bas</b> : patch, bibliothèque, liste, rigging et charges, sécurité, console.<br><b>Outils</b> (menu du haut) : pupitre lumière, assistant, ponts, line array, DMX, musique, mur LED.<br><b>Plan 2D</b> : le plan technique à côté de la vue 3D.<br><b>Un autre environnement</b> : Fichier → Nouveau projet, ou Fichier → Créer un environnement depuis des plans (PDF, DWG, DXF, images).<br>Tout s'annule avec Ctrl+Z. F1 liste les raccourcis.</div>
    <div class="btns"><button class="b on" data-a="close">Explorer la démonstration</button><button class="b" data-a="new">Nouveau projet</button><button class="b" data-a="keys">Raccourcis</button></div>`); A.store.set('welcome', 1); }
  // disposition de départ : plan technique et vue 3D côte à côte, grilles visibles, panneau Environnement fermé, Atelier ouvert sur la bibliothèque
  if (!/[?&]demo\b/.test(location.search)) setTimeout(() => { try { if (window.PLAN && !PLAN.P.on) PLAN.toggle(true); A.toggleSide(true); document.querySelector('#hud')?.classList.add('hide'); UI.tab = 'lib'; A.toggleConsole(innerWidth >= 1150); window.VIEW3D?.set({ grid: true }); ST.render(); window.PLAN?.fit?.(); } catch (e){ console.error(e); } }, 300);
  window.WS = { welcome, pref, status, listHtml, act, ctx, run, C, copy, paste, align, distribute, mirror, nudge, setFlag };
  applySnap(); ST.histChanged(); if (UI.tab === 'list' || window.DRAWER?.is('list')) ST.render();
}
