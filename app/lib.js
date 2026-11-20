// Bibliothèques de projecteurs : dossier FixtureLibrary de Titan (.d4) et GDTF Share. Rien n'est embarqué : on lit ce que l'utilisateur possède déjà.
export function initLib(A, ST){
  const $ = s => document.querySelector(s), esc = ST.esc, LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const L = { open: false, tab: 'titan', q: '', titan: null, folder: null, gdtf: null, logged: false, msg: '', busy: false };
  const el = document.createElement('div'); el.id = 'libPanel'; el.className = 'toolwin'; el.style.display = 'none'; document.body.appendChild(el);
  const api = async (u, o) => { const r = await fetch(u, o); return r.headers.get('content-type')?.includes('json') ? r.json() : r; };
  const words = q => q.toLowerCase().split(/\s+/).filter(Boolean), match = (txt, w) => { const t = txt.toLowerCase(); return w.every(k => t.includes(k)); };
  const d4name = n => n.replace(/\.d4$/i, '').replace(/_/g, ' · ').replace(/ · /, ' — ');

  async function loadTitan(refresh){ if (!LOCAL) return; L.busy = true; render(); try { const j = await api('/api/lib/titan/list' + (refresh ? '?refresh=1' : '')); L.titan = j.files || []; L.dirs = j.dirs || []; } catch (e){ L.titan = []; L.msg = 'Passerelle locale injoignable.'; } L.busy = false; render(); }
  async function loadGdtf(refresh){ L.busy = true; L.msg = 'Chargement de la liste GDTF Share…'; render(); try { const j = await api('/api/lib/gdtf/list' + (refresh ? '?refresh=1' : '')); if (j.ok){ L.gdtf = j.list; L.logged = true; L.msg = ''; } else { L.gdtf = null; L.logged = false; L.msg = j.login ? '' : 'GDTF Share : ' + (j.error || 'erreur'); } } catch (e){ L.msg = 'Passerelle locale injoignable.'; } L.busy = false; render(); }
  async function login(){ const user = $('#libU').value.trim(), password = $('#libP').value; if (!user || !password) return; L.busy = true; L.msg = 'Connexion…'; render(); try { const j = await api('/api/lib/gdtf/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, password }) }); if (j.ok){ L.logged = true; L.msg = ''; return loadGdtf(true); } L.msg = 'Connexion refusée : ' + (j.error || 'identifiants incorrects ?'); } catch (e){ L.msg = 'Passerelle locale injoignable.'; } L.busy = false; render(); }
  async function addTitan(name){ try { let text; if (L.folder){ const f = L.folder.find(q => q.name === name); text = await f.text(); } else { const r = await fetch('/api/lib/titan/get?f=' + encodeURIComponent(name)); if (!r.ok) throw new Error('lecture impossible'); text = await r.text(); } await ST.importFiles([new File([text], name)]); } catch (e){ ST.toast('Import impossible : ' + e.message, true); } }
  async function addGdtf(rid){ const e = (L.gdtf || []).find(q => String(q.rid) === String(rid)); if (!e) return; ST.toast('Téléchargement de ' + e.f + '…'); try { const r = await fetch('/api/lib/gdtf/get?rid=' + e.rid); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'refusé'); await ST.importFiles([new File([await r.arrayBuffer()], (e.m + '@' + e.f).replace(/[\\/:*?"<>|]/g, '_') + '.gdtf')]); } catch (x){ ST.toast('Téléchargement impossible : ' + x.message, true); } }

  function rows(){
    const w = words(L.q), MAX = 150;
    if (L.tab === 'titan'){ const src = L.folder ? L.folder.map(f => f.name) : L.titan; if (!src) return LOCAL ? '<div class="info">Lecture du dossier Titan…</div>' : '';
      const hit = src.filter(n => match(n.replace(/_/g, ' '), w)); return `<div class="libcount">${hit.length} personnalité(s)${hit.length > MAX ? ' · les ' + MAX + ' premières affichées, précise la recherche' : ''}</div>` + hit.slice(0, MAX).map(n => `<div class="librow"><span>${esc(d4name(n))}</span><button class="b" data-lt="${esc(n)}">Ajouter</button></div>`).join(''); }
    if (!L.gdtf) return ''; const hit = L.gdtf.filter(e => match(e.m + ' ' + e.f, w)).sort((a, b) => (a.m + a.f).localeCompare(b.m + b.f) || b.mod - a.mod);
    return `<div class="libcount">${hit.length} fichier(s)${hit.length > MAX ? ' · les ' + MAX + ' premiers affichés, précise la recherche' : ''}</div>` + hit.slice(0, MAX).map(e => `<div class="librow"><span><b>${esc(e.m)}</b> ${esc(e.f)}<small>${esc(e.rev)}${e.modes.length ? ' · ' + e.modes.length + ' mode(s)' : ''}${e.up ? ' · ' + esc(e.up) : ''}</small></span><button class="b" data-lg="${e.rid}">Ajouter</button></div>`).join('');
  }
  function body(){
    if (L.tab === 'titan'){
      if (!LOCAL && !L.folder) return `<div class="info">Dans cette version en ligne, désigne le dossier <b>FixtureLibrary</b> de Titan (sur un PC : <span class="mono">C:\\Program Files\\Avolites\\Titan\\FixtureLibrary</span>). Les fichiers restent sur ton ordinateur.</div><div class="btns"><button class="b on" data-la="folder">Choisir le dossier…</button></div>`;
      if (LOCAL && L.titan && !L.titan.length && !L.folder) return `<div class="info">Aucune bibliothèque Titan trouvée sur cet ordinateur (dossiers cherchés : Program Files\\Avolites\\Titan\\FixtureLibrary et Documents\\Titan\\Personalities).</div><div class="btns"><button class="b on" data-la="folder">Choisir un dossier de fichiers .d4…</button></div>`;
      return `<div class="libsrc">${L.folder ? 'Dossier choisi' : esc((L.dirs || []).join(' · '))} <a data-la="folder">changer</a>${LOCAL && !L.folder ? ' · <a data-la="refresh">actualiser</a>' : ''}</div>`;
    }
    if (!LOCAL) return `<div class="info">La recherche dans <b>GDTF Share</b> demande la version installée du logiciel : une page web n'a pas le droit d'interroger ce site. En attendant, télécharge les fichiers sur gdtf-share.com et importe-les par Fichier → Importer.</div>`;
    if (L.busy && !L.logged) return '';          // la liste ou la connexion est en cours : pas de champs qui s'effaceraient pendant la saisie
    if (!L.logged) return `<div class="info">Connecte-toi avec ton compte <b>GDTF Share</b> (gratuit, à créer sur gdtf-share.com). Le mot de passe est envoyé à GDTF Share uniquement et n'est pas enregistré.</div>
      <div class="pf"><label>Identifiant</label><input type="text" class="inp" id="libU" autocomplete="username"><label>Mot de passe</label><input type="password" class="inp" id="libP" autocomplete="current-password"></div><div class="btns"><button class="b on" data-la="login">Se connecter</button></div>`;
    return `<div class="libsrc">Connecté à GDTF Share · ${(L.gdtf || []).length} fichiers <a data-la="grefresh">actualiser</a></div>`;
  }
  function render(){
    if (!L.open) return; const showSearch = L.tab === 'titan' ? !!(L.folder || (L.titan && L.titan.length)) : !!L.gdtf;
    el.innerHTML = `<div class="th"><b>Bibliothèques de projecteurs</b><span class="pv"><a class="${L.tab === 'titan' ? 'on' : ''}" data-ltab="titan">Avolites Titan</a><a class="${L.tab === 'gdtf' ? 'on' : ''}" data-ltab="gdtf">GDTF Share</a></span><a data-la="close" class="x">✕</a></div>
      <div class="tb">${body()}${L.msg ? `<div class="info" style="border:1px solid #f0a23c;color:#ffd9a0">${esc(L.msg)}</div>` : ''}
      ${showSearch ? `<input type="search" class="inp" id="libQ" placeholder="Rechercher : marque, modèle…  (ex. clay paky b-eye)" value="${esc(L.q)}" style="width:100%;margin:6px 0"><div id="libRows">${rows()}</div>` : ''}</div>`;
  }
  el.addEventListener('click', e => { let b;
    if ((b = e.target.closest('[data-ltab]'))){ L.tab = b.dataset.ltab; L.msg = ''; render(); if (L.tab === 'gdtf' && LOCAL && !L.gdtf && !L.busy) loadGdtf(); return; }
    if ((b = e.target.closest('[data-lt]'))) return void addTitan(b.dataset.lt); if ((b = e.target.closest('[data-lg]'))) return void addGdtf(b.dataset.lg);
    if ((b = e.target.closest('[data-la]'))){ const a = b.dataset.la; if (a === 'close') toggle(false); else if (a === 'login') login(); else if (a === 'refresh') loadTitan(true); else if (a === 'grefresh') loadGdtf(true);
      else if (a === 'folder'){ const i = document.createElement('input'); i.type = 'file'; i.webkitdirectory = true; i.multiple = true; i.onchange = () => { const fs = [...i.files].filter(f => /\.d4$/i.test(f.name)); if (!fs.length) return ST.toast('Aucun fichier .d4 dans ce dossier.', true); L.folder = fs.sort((x, y) => x.name.localeCompare(y.name)); render(); }; i.click(); } } });
  el.addEventListener('input', e => { if (e.target.id === 'libQ'){ L.q = e.target.value; const r = $('#libRows'); if (r) r.innerHTML = rows(); } });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.id === 'libP' || e.target.id === 'libU')) login(); e.stopPropagation(); });
  function toggle(f){ L.open = f ?? !L.open; el.style.display = L.open ? 'flex' : 'none'; if (L.open){ render(); if (LOCAL && !L.titan) loadTitan(); } }
  window.FLIB = { toggle, isOpen: () => L.open, L, render };
}
