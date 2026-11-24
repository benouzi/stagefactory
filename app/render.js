// Rendu de la vue 3D : une image propre de la vue (sans IA), ou la même vue retravaillée par un modèle d'image de Google (« Nano Banana »).
// Le rendu IA passe par la passerelle locale, qui garde la clé Google : il n'existe que dans la version installée.
export function initRender(A, ST){
  const $ = s => document.querySelector(s), esc = ST.esc, LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const STYLES = [
    ['photo', 'Photo de spectacle', 'Transforme cette prévisualisation 3D en photographie réaliste de spectacle, prise pendant la représentation : faisceaux visibles dans une brume légère, matières réelles (bois du plateau, velours des rideaux, métal des ponts et des perches), grain photographique discret.'],
    ['service', 'Photo en lumière de service', 'Transforme cette prévisualisation 3D en photographie réaliste de la salle en lumière de service : éclairage blanc neutre et uniforme, aucun faisceau de spectacle, matières réelles, comme une photo de repérage technique.'],
    ['maquette', 'Maquette de scénographe', 'Transforme cette prévisualisation 3D en photographie d\'une maquette de scénographe au 1/50 : carton plume, balsa, petits éléments peints, éclairage d\'atelier doux, faible profondeur de champ.'],
    ['croquis', 'Croquis aquarellé', 'Transforme cette prévisualisation 3D en croquis de scénographe : trait à l\'encre noire et lavis d\'aquarelle, papier à grain, couleurs de lumière suggérées par des aplats légers.'],
    ['visuel', 'Visuel de présentation', 'Transforme cette prévisualisation 3D en visuel de présentation pour un dossier : rendu d\'architecte soigné, lumière flatteuse, matières réalistes, image nette et lisible.']];
  const KEEP = 'Contraintes : garde exactement le même point de vue, le même cadrage et les mêmes proportions. Chaque élément reste à sa place : n\'ajoute, ne retire et ne déplace aucun projecteur, pont, rideau, écran ou meuble. Garde les couleurs et les directions des faisceaux. Aucun texte, aucun logo, aucun filigrane ajouté.';
  const R = { open: false, tab: 'img', def: 1, grid: false, sel: false, best: true, style: 'photo', more: '', model: '', st: null, key: '', busy: false, err: '', src: null, outs: [], cur: -1, ...A.store.get('rendu', {}) };
  R.open = false; R.busy = false; R.err = ''; R.src = null; R.outs = []; R.cur = -1; R.key = ''; R.st = null;
  const keep = () => A.store.set('rendu', { tab: R.tab, def: R.def, grid: R.grid, sel: R.sel, best: R.best, style: R.style, model: R.model });

  const css = document.createElement('style'); css.textContent = `
  #rdWin{position:fixed;left:50%;top:70px;transform:translateX(-50%);width:min(1080px,calc(100vw - 24px));height:min(700px,calc(100vh - 100px));z-index:14;display:none;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.6);color:var(--ink);font-size:12px;overflow:hidden}
  #rdWin .th{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--line);flex:none} #rdWin .th b{font-size:13px} #rdWin .th .sp{flex:1} #rdWin .th .x{cursor:pointer;color:var(--mute);font-size:15px;padding:0 4px}
  #rdWin .pv{display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden} #rdWin .pv a{padding:4px 12px;cursor:pointer;color:var(--mute)} #rdWin .pv a.on{background:var(--accent);color:var(--onacc,#0b0916);font-weight:600}
  #rdWin .bd{flex:1;display:flex;min-height:0} #rdWin .sd{flex:none;width:290px;padding:12px;overflow:auto;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:9px}
  #rdWin .sd label.f{display:flex;flex-direction:column;gap:4px;color:var(--mute)} #rdWin select,#rdWin textarea,#rdWin input[type=text],#rdWin input[type=password]{background:#1c1636;color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:5px 7px;font:12px Inter,sans-serif;width:100%;box-sizing:border-box} #rdWin textarea{resize:vertical}
  #rdWin .info{color:var(--mute);font-size:11px;line-height:1.45} #rdWin .err{color:#ff8a8a;line-height:1.4} #rdWin .keyb{border:1px solid var(--line);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px}
  #rdWin .sd .b{padding:6px 10px} #rdWin a.lk{color:#9db4ff;cursor:pointer;text-decoration:underline;font-size:11px}
  #rdWin .mn{flex:1;min-width:0;display:flex;flex-direction:column;background:#07060d} #rdWin .im{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:10px} #rdWin .im img{max-width:100%;max-height:100%;object-fit:contain;border-radius:4px} #rdWin .im p{color:var(--mute)}
  #rdWin .st{flex:none;display:flex;align-items:center;gap:6px;padding:7px 9px;border-top:1px solid var(--line);overflow-x:auto;background:var(--panel)} #rdWin .st button.t{flex:none;background:none;border:1px solid var(--line);border-radius:6px;padding:2px;cursor:pointer;color:var(--mute);font:10.5px Inter,sans-serif;display:flex;flex-direction:column;align-items:center;gap:2px} #rdWin .st button.t.on{border-color:#f2a93b;color:var(--ink)} #rdWin .st button.t img{height:44px;border-radius:3px;display:block} #rdWin .st .sp{flex:1}
  body.cine #rdWin{display:none!important}`; document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'rdWin'; document.body.appendChild(el);

  // ---- l'image de la vue, propre : sans grille ni cadres de sélection si on le demande, en définition normale ou supérieure
  function grab(def, forAI){
    const UI = ST.UI, sel = UI && UI.sel ? [...UI.sel] : [], hideSel = forAI || !R.sel, hideGrid = forAI || !R.grid, plane = window.VIEW3D && VIEW3D.plane, pv = plane && plane.visible;
    const q0 = A.quality, r = A.renderer, pr0 = r.getPixelRatio(), hid = []; let url;
    try {
      if (hideSel){ if (sel.length) ST.select([]); A.scene.traverse(o => { if ((o.isTransformControlsRoot || o.isTransformControlsGizmo || o.type === 'BoxHelper') && o.visible){ o.visible = false; hid.push(o); } }); } if (plane && hideGrid) plane.visible = false;          // poignées de déplacement, anneau de rotation, cadres, grille
      if (R.best && q0 !== 'haute') A.setQuality('haute');
      if (def > 1){ const w = window.VW(), h = window.VH(), k = Math.min(def * pr0, 8192 / Math.max(w, h)); r.setPixelRatio(k); A.resize(); }
      url = A.snapshot();
    } finally {
      if (r.getPixelRatio() !== pr0){ r.setPixelRatio(pr0); A.resize(); }
      if (A.quality !== q0) A.setQuality(q0); if (plane) plane.visible = pv; if (hideSel && sel.length) ST.select(sel); for (const o of hid) o.visible = true;
    }
    return url;
  }
  const size = u => new Promise(ok => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = () => ok([0, 0]); i.src = u; });
  // pour l'IA : JPEG, 1600 px au plus (le modèle rend autour de 1 à 2 K, et l'envoi reste léger)
  async function forAI(){ const u = grab(1, true), i = new Image(); await new Promise(ok => { i.onload = ok; i.onerror = ok; i.src = u; }); const k = Math.min(1, 1600 / Math.max(i.naturalWidth, i.naturalHeight, 1)), c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * k); c.height = Math.round(i.naturalHeight * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .92); }
  async function save(u, tag){ try { const b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); await ST.saveFile('rendu-' + tag + '-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + (u.startsWith('data:image/png') ? '.png' : '.jpg'), a); } catch (e){ ST.toast('Enregistrement impossible : ' + e.message, true); } }

  // ---- passerelle locale : état de la clé, enregistrement, demande de rendu
  const api = async (u, body) => (await fetch(u, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)).json();
  async function status(){ if (!LOCAL) return; try { R.st = await api('/api/img/status'); if (!R.model) R.model = R.st.model; } catch (_){ R.st = { off: true }; } render(); }
  async function saveKey(){ const k = R.key.trim(); if (k.length < 20) return; try { const j = await api('/api/img/key', { key: k }); if (!j.ok){ R.err = j.error || 'Clé refusée.'; return render(); } R.key = ''; R.err = ''; await status(); } catch (_){ R.err = 'Passerelle locale injoignable.'; render(); } }
  async function run(from, prompt, label){ R.busy = true; R.err = ''; render();
    try { const j = await api('/api/img/gen', { image: from.split(',')[1], mime: from.slice(5, from.indexOf(';')), prompt, model: R.model.trim() });
      if (j.error) R.err = j.error; else { R.outs.push({ url: 'data:' + (j.mime || 'image/png') + ';base64,' + j.image, label }); R.cur = R.outs.length - 1; } }
    catch (e){ R.err = 'Passerelle locale injoignable.'; } R.busy = false; render(); }
  async function generate(){ let from; try { from = await forAI(); } catch (e){ R.err = 'La vue 3D n\'est pas affichée : ouvre-la, cadre-la, puis recommence.'; return render(); } R.src = from; const s = STYLES.find(x => x[0] === R.style) || STYLES[0]; run(from, [s[2], R.more.trim() ? 'Précisions : ' + R.more.trim() : '', KEEP].filter(Boolean).join('\n\n'), s[1]); }
  function refine(){ const o = R.outs[R.cur]; if (!o || !R.more.trim()) return; run(o.url, 'Modifie cette image ainsi, sans rien changer d\'autre : ' + R.more.trim() + '\n\n' + KEEP, 'Retouche'); }
  async function plain(){ let u; try { u = grab(R.def, false); } catch (e){ R.err = 'La vue 3D n\'est pas affichée : ouvre-la, puis recommence.'; return render(); } const [w, h] = await size(u); R.err = ''; R.outs.push({ url: u, label: w + ' × ' + h, plain: true }); R.cur = R.outs.length - 1; render(); }
  function preview(){ try { R.src = grab(1, R.tab === 'ia'); } catch (_){ R.src = null; } }

  function side(){
    if (R.tab === 'img') return `<label class="f">Définition<select data-k="def">${[[1, 'Celle de l\'écran'], [2, 'Double'], [4, 'Quadruple (pour l\'impression)']].map(([v, l]) => `<option value="${v}"${+R.def === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" data-k="best" ${R.best ? 'checked' : ''}> Qualité d'image maximale</label>
      <label class="chk"><input type="checkbox" data-k="grid" ${R.grid ? 'checked' : ''}> Garder la grille de repère</label>
      <label class="chk"><input type="checkbox" data-k="sel" ${R.sel ? 'checked' : ''}> Garder les cadres de sélection</label>
      <div class="btns"><button class="b on" data-a="plain">Faire l'image</button></div>${R.err ? `<div class="err">${esc(R.err)}</div>` : ''}
      <div class="info">L'image est calculée par le logiciel, sur cet ordinateur : la vue telle qu'elle est cadrée, avec la lumière et la brume du moment. Rien ne part sur Internet.</div>`;
    if (!LOCAL) return `<div class="info" style="font-size:12px;color:var(--ink)">Le rendu IA demande la <b>version installée</b> du logiciel.</div><div class="info">Il envoie la vue 3D à un modèle d'image de Google, avec ta clé Google : cette clé doit rester sur ton ordinateur, hors de la page. Ici, l'onglet « Image de la vue » fonctionne normalement.</div>`;
    if (!R.st) return '<div class="info">Lecture des réglages…</div>';
    if (R.st.off) return '<div class="err">Passerelle locale injoignable : relance le logiciel.</div>';
    const noKey = !R.st.hasKey, models = R.st.models || [];
    return `${noKey ? `<div class="keyb"><div class="info">Colle ici ta clé d'API Google (Google AI Studio). Elle est gardée sur cet ordinateur et n'est envoyée qu'à Google.</div><input type="password" data-k="key" placeholder="Clé d'API Google" autocomplete="off" value="${esc(R.key)}"><button class="b on" data-a="key">Enregistrer la clé</button></div>` : ''}
      <label class="f">Style<select data-k="style">${STYLES.map(s => `<option value="${s[0]}"${R.style === s[0] ? ' selected' : ''}>${s[1]}</option>`).join('')}</select></label>
      <label class="f">Précisions (facultatif)<textarea rows="4" data-k="more" placeholder="Ex. : public debout dans la salle, ambiance concert rock, sol noir brillant">${esc(R.more)}</textarea></label>
      <label class="f">Modèle<input type="text" data-k="model" list="rdModels" value="${esc(R.model)}" placeholder="${esc(models[0] || '')}"><datalist id="rdModels">${models.map(m => `<option value="${esc(m)}">`).join('')}</datalist></label>
      <div class="btns"><button class="b on" data-a="gen" ${R.busy || noKey ? 'disabled' : ''}>${R.busy ? 'Rendu en cours…' : 'Générer depuis la vue 3D'}</button></div>
      <div class="btns"><button class="b" data-a="refine" ${R.busy || noKey || !R.outs[R.cur] ? 'disabled' : ''} title="Applique les précisions à l'image affichée, au lieu de repartir de la vue 3D">Retoucher l'image affichée</button></div>
      ${R.err ? `<div class="err">${esc(R.err)}</div>` : ''}
      <div class="info">La vue part chez Google telle qu'elle est cadrée, sans grille ni cadres de sélection. Chaque rendu est une demande facturée par Google sur ta clé. Le modèle peut déplacer ou inventer des détails : c'est une image d'ambiance, pas un document technique.</div>
      ${noKey ? '' : `<a class="lk" data-a="forget">Oublier la clé Google (…${esc(R.st.tail || '')})</a>`}`;
  }
  function render(){
    if (!R.open){ el.style.display = 'none'; return; } el.style.display = 'flex';
    const o = R.outs[R.cur], act = document.activeElement, fk = act && el.contains(act) && act.dataset.k, pos = fk && act.selectionStart;
    el.innerHTML = `<div class="th"><b>Rendu de la vue</b><span class="pv"><a class="${R.tab === 'img' ? 'on' : ''}" data-tab="img">Image de la vue</a><a class="${R.tab === 'ia' ? 'on' : ''}" data-tab="ia">Rendu IA</a></span><span class="sp"></span><span class="x" data-a="close" title="Fermer">✕</span></div>
      <div class="bd"><div class="sd">${side()}</div><div class="mn"><div class="im">${o ? `<img src="${o.url}" alt="Rendu : ${esc(o.label)}">` : R.src ? `<img src="${R.src}" alt="Vue 3D">` : '<p>Ouvre la vue 3D, cadre-la, puis reviens ici.</p>'}</div>
      <div class="st">${R.src ? `<button class="t${R.cur < 0 ? ' on' : ''}" data-cur="-1"><img src="${R.src}" alt=""><span>Vue 3D</span></button>` : ''}${R.outs.map((x, i) => `<button class="t${R.cur === i ? ' on' : ''}" data-cur="${i}"><img src="${x.url}" alt=""><span>${i + 1} · ${esc(x.label)}</span></button>`).join('')}<span class="sp"></span>${o ? '<button class="b on" data-a="save">Enregistrer l\'image…</button>' : ''}</div></div></div>`;
    if (fk){ const n = el.querySelector(`[data-k="${fk}"]`); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch (_){ } } }
  }
  el.addEventListener('input', e => { const k = e.target.dataset.k; if (!k) return; R[k] = e.target.type === 'checkbox' ? e.target.checked : k === 'def' ? +e.target.value : e.target.value; keep(); if (k === 'grid' || k === 'sel' || k === 'best'){ if (R.cur < 0) preview(); render(); } });
  el.addEventListener('keydown', e => { if (e.key !== 'Escape') e.stopPropagation(); });
  addEventListener('keydown', e => { if (R.open && e.key === 'Escape'){ e.stopPropagation(); open(false); } }, true);
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (t){ R.tab = t.dataset.tab; R.err = ''; keep(); if (R.tab === 'ia' && !R.st) status(); return render(); }
    const c = e.target.closest('[data-cur]'); if (c){ R.cur = +c.dataset.cur; return render(); }
    const a = e.target.closest('[data-a]'); if (!a || a.disabled) return; const k = a.dataset.a;
    if (k === 'close') open(false); else if (k === 'plain') plain(); else if (k === 'gen') generate(); else if (k === 'refine') refine(); else if (k === 'key') saveKey();
    else if (k === 'save'){ const o = R.outs[R.cur]; if (o) save(o.url, o.plain ? 'vue' : 'ia'); }
    else if (k === 'forget') api('/api/img/key', { clear: true }).then(status).catch(() => { });
  });
  function open(f, tab){ R.open = f ?? !R.open; if (tab) R.tab = tab; if (R.open){ R.err = ''; R.cur = R.outs.length ? R.cur : -1; preview(); if (R.tab === 'ia') status(); } render(); }
  window.RENDU = { open, R, grab, STYLES };
}
