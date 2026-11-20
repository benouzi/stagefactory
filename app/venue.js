// Création de salle depuis des plans (repris de ScenoFactory : venue.ts, builder.ts, VenueImport.tsx).
// On dépose tout ce qu'on sait d'une salle : plans et coupes (PDF, DWG, DXF, images), fiche technique, notes.
// - Sans IA : un plan se pose en fond, se cale (échelle, zéro au nez de scène, orientation), et ses calques de murs s'élèvent en 3D.
// - Avec l'IA (assistant de la version installée, ou application Claude par le connecteur) : elle regarde les documents, mesure,
//   recoupe plan et coupe, puis règle la salle par des outils. Rien de ce qu'elle ne peut pas établir n'est inventé.
import { readDxf, readDwg, drawingToVector } from './cad.js';

export function initVenue(A, ST){
  const $ = s => document.querySelector(s), esc = ST.esc, S = ST.S, LIBS = window.ONEX_LIBS || {}, CDN = 'https://cdn.jsdelivr.net/npm/';
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const fin = x => typeof x === 'number' && Number.isFinite(x), r3 = x => Math.round(x * 1000) / 1000, r1 = x => Math.round(x * 10) / 10;
  const f2 = v => (+v).toFixed(2).replace('.', ','), uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const LIMITS = { files: 200, texts: 250, layers: 60 }, MAX_ROUNDS = 40;
  const newSession = () => ({ messages: [], rounds: 0, tin: 0, tout: 0 });
  const K = { open: false, files: [], reading: 0, session: newSession(), report: '', actions: [], live: [], busy: false, err: '', abort: null, notes: '' };

  // ---------------------------------------------------------------- données lourdes des plans : gardées sur ce poste (IndexedDB), hors du projet annulable
  const idb = () => new Promise((ok, ko) => { const r = indexedDB.open('stagefactory', 1); r.onupgradeneeded = () => r.result.createObjectStore('plans'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const pack = D => D.kind === 'img' ? { kind: 'img', url: D.url } : { kind: 'vec', layers: D.layers, polys: D.polys, texts: D.texts };
  async function idbPut(id, D){ try { const d = await idb(); await new Promise((ok, ko) => { const t = d.transaction('plans', 'readwrite'), st = t.objectStore('plans'); st.put({ at: Date.now(), data: pack(D) }, id);
    const rq = st.getAllKeys(); rq.onsuccess = () => { const keys = rq.result; if (keys.length > 12){ const all = st.getAll(); all.onsuccess = () => { keys.map((k, i) => [k, all.result[i].at || 0]).sort((a, b) => a[1] - b[1]).slice(0, keys.length - 12).forEach(([k]) => st.delete(k)); }; } }; t.oncomplete = ok; t.onerror = () => ko(t.error); }); d.close(); } catch (_){ /* stockage local indisponible : le plan reste en mémoire */ } }
  async function idbGet(id){ try { const d = await idb(), v = await new Promise((ok, ko) => { const rq = d.transaction('plans').objectStore('plans').get(id); rq.onsuccess = () => ok(rq.result); rq.onerror = () => ko(rq.error); }); d.close(); return v && v.data; } catch (_){ return null; } }
  // à l'ouverture : le projet connaît son plan par un identifiant ; on va rechercher ses traits sur ce poste
  async function restore(){ const pl = A.venue.plan; if (!pl || A.PLANS.has(pl.id)) return; const D = await idbGet(pl.id); if (D && A.venue.plan && A.venue.plan.id === pl.id){ A.setPlanData(pl.id, D); A.setVenue(A.venue, true); if (window.PLAN) PLAN.P.dirty = true; } }
  const planData = () => { const pl = A.venue.plan, D = pl && A.PLANS.get(pl.id); return D ? pack(D) : null; };

  // ---------------------------------------------------------------- lecture des fichiers déposés
  let pdfLib = null; const pdfs = new Map();
  const pdfjs = () => pdfLib || (pdfLib = (async () => { const base = LIBS.pdf || CDN + 'pdfjs-dist@4.6.82/build/', m = await import(base + 'pdf.min.mjs');
    try { globalThis.pdfjsWorker = await import(base + 'pdf.worker.min.mjs'); } catch (_){ m.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs'; } return m; })().catch(e => { pdfLib = null; throw new Error('Le lecteur PDF n\'a pas pu être chargé (' + (e?.message || 'réseau') + ').'); }));
  const pdfOf = f => { if (!pdfs.has(f)) pdfs.set(f, pdfjs().then(m => m.getDocument({ data: f.bytes.slice(), isEvalSupported: false }).promise)); return pdfs.get(f); };
  const zoneOf = z => { const c = (v, d) => (fin(v) ? Math.max(0, Math.min(1, v)) : d), a = { x0: c(z?.x0, 0), y0: c(z?.y0, 0), x1: c(z?.x1, 1), y1: c(z?.y1, 1) }; return a.x1 - a.x0 < .01 || a.y1 - a.y0 < .01 ? { x0: 0, y0: 0, x1: 1, y1: 1 } : a; };
  const FULL = { x0: 0, y0: 0, x1: 1, y1: 1 };
  async function renderPdf(f, pageNo, z, long, q = .8){
    const pdf = await pdfOf(f), page = await pdf.getPage(Math.max(1, Math.min(pdf.numPages, Math.round(pageNo) || 1))), v1 = page.getViewport({ scale: 1 });
    const zw = (z.x1 - z.x0) * v1.width, zh = (z.y1 - z.y0) * v1.height, scale = Math.min(8, long / Math.max(zw, zh)), vp = page.getViewport({ scale });
    const c = document.createElement('canvas'); c.width = Math.round(zw * scale); c.height = Math.round(zh * scale); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp, transform: [1, 0, 0, 1, -z.x0 * vp.width, -z.y0 * vp.height] }).promise;
    return { canvas: c, data: c.toDataURL('image/jpeg', q).split(',')[1], pages: pdf.numPages, wMm: v1.width / 72 * 25.4, hMm: v1.height / 72 * 25.4 };
  }
  async function cropImage(url, z, long, q = .82){
    const img = new Image(); img.src = url; await img.decode(); const sw = (z.x1 - z.x0) * img.width, sh = (z.y1 - z.y0) * img.height, s = Math.min(4, long / Math.max(sw, sh));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s)); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, z.x0 * img.width, z.y0 * img.height, sw, sh, 0, 0, c.width, c.height);
    return { data: c.toDataURL('image/jpeg', q).split(',')[1], w: c.width, h: c.height };
  }
  const decode = bytes => { try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (_){ return new TextDecoder('windows-1252').decode(bytes); } };
  async function readFile(file){
    const name = file.name, ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase(), base = { name, size: file.size };
    try {
      if (['dxf', 'dwg', 'dxfb'].includes(ext)){ const bytes = new Uint8Array(await file.arrayBuffer()), cad = drawingToVector(ext === 'dxf' ? await readDxf(decode(bytes)) : await readDwg(bytes, ext === 'dwg' ? 'dwg' : 'dxf'));
        return { ...base, kind: 'cad', cad, note: `${cad.vector.polys.length} tracés, ${cad.vector.layers.length} calques` + (cad.calibrated ? '' : ' · unité devinée') + (cad.truncated ? ' · dessin très lourd, tronqué' : '') }; }
      if (ext === 'pdf'){ const f = { ...base, kind: 'pdf', bytes: new Uint8Array(await file.arrayBuffer()) }, pdf = await pdfOf(f); f.pages = pdf.numPages; f.note = pdf.numPages + ' page' + (pdf.numPages > 1 ? 's' : ''); return f; }
      if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'].includes(ext)){ const bmp = await createImageBitmap(file), s = Math.min(1, 3300 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height); return { ...base, kind: 'image', url: c.toDataURL('image/jpeg', .85), w: c.width, h: c.height, note: `${bmp.width} × ${bmp.height} px` }; }
      if (['txt', 'md', 'csv', 'json'].includes(ext)) return { ...base, kind: 'text', text: await file.text(), note: 'texte' };
      return { ...base, kind: 'other', note: 'format non lu : laissé de côté' };
    } catch (e){ return { ...base, kind: 'other', note: e?.message || 'lecture impossible' }; }
  }
  async function addFiles(list){
    const take = [...list].slice(0, Math.max(0, LIMITS.files - K.files.length)); if (!take.length) return; K.reading += take.length; render();
    for (const f of take){ const v = await readFile(f); K.files = [...K.files.filter(x => x.name !== v.name), v]; K.reading--; render(); }
  }

  // ---------------------------------------------------------------- résumé d'un plan de CAO pour l'IA : image aux calques colorés avec grille cotée, liste des calques et des textes
  // repère montré : mètres, x vers la droite, y vers le haut, origine en bas à gauche du dessin
  const PALETTE = [['rouge', '#d62828'], ['bleu', '#1d4ed8'], ['vert', '#15803d'], ['orange', '#ea580c'], ['violet', '#7e22ce'], ['turquoise', '#0e7490'], ['rose', '#db2777'], ['brun', '#78350f'], ['olive', '#4d7c0f'], ['bleu ciel', '#0284c7'], ['magenta', '#a21caf'], ['gris', '#52525b']];
  const frame = b => { const k = b.mm / 1000; return { k, W: b.w * k, H: b.h * k, X: vx => vx * k, Y: vy => (b.h - vy) * k }; };
  function layerStats(v, f){ const stat = v.layers.map((l, i) => ({ l, i, seg: 0, len: 0, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }));
    for (const q of v.polys){ const s = stat[q.l]; if (!s) continue; for (let i = 0; i < q.p.length; i += 2){ const x = f.X(q.p[i]), y = f.Y(q.p[i + 1]); s.x0 = Math.min(s.x0, x); s.x1 = Math.max(s.x1, x); s.y0 = Math.min(s.y0, y); s.y1 = Math.max(s.y1, y); if (i){ s.seg++; s.len += Math.hypot(x - f.X(q.p[i - 2]), y - f.Y(q.p[i - 1])); } } } return stat; }
  function digestCad(name, b){
    const v = b.vector, f = frame(b), n = v.layers.length, stat = layerStats(v, f), order = stat.filter(s => s.seg).sort((a, c) => c.len - a.len), color = new Map(); order.forEach((s, r) => color.set(s.i, PALETTE[r % PALETTE.length]));
    const long = 1568, sc = long / Math.max(f.W, f.H, .001), pad = 46, cw = Math.round(f.W * sc) + pad * 2, ch = Math.round(f.H * sc) + pad * 2;
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch);
    const px = x => pad + x * sc, py = y => ch - pad - y * sc, span = Math.max(f.W, f.H), step = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(s => span / s <= 14) ?? 1000;
    g.font = '11px sans-serif'; g.fillStyle = '#666'; g.strokeStyle = '#e3e3e3'; g.lineWidth = 1;
    for (let x = 0; x <= f.W + 1e-6; x += step){ g.beginPath(); g.moveTo(px(x), py(0)); g.lineTo(px(x), py(f.H)); g.stroke(); g.textAlign = 'center'; g.fillText(String(x), px(x), ch - pad + 16); g.fillText(String(x), px(x), pad - 8); }
    for (let y = 0; y <= f.H + 1e-6; y += step){ g.beginPath(); g.moveTo(px(0), py(y)); g.lineTo(px(f.W), py(y)); g.stroke(); g.textAlign = 'right'; g.fillText(String(y), pad - 6, py(y) + 4); g.textAlign = 'left'; g.fillText(String(y), cw - pad + 6, py(y) + 4); }
    for (const q of v.polys){ const col = color.get(q.l); if (!col) continue; g.strokeStyle = col[1]; g.beginPath(); for (let i = 0; i < q.p.length; i += 2){ const x = px(f.X(q.p[i])), y = py(f.Y(q.p[i + 1])); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
    const lines = [`FICHIER « ${name} » — emprise ${r1(f.W)} × ${r1(f.H)} m. Échelle ${b.calibrated ? 'donnée par le fichier' : 'DEVINÉE (le fichier ne dit pas son unité) : vérifie-la avec une cote connue et donne facteurEchelle'}.`, `Repère : mètres, x vers la droite, y vers le haut, origine en bas à gauche ; la grille de l'image est cotée dans ce repère (pas de ${step} m).`, `Calques (${n}), du plus chargé au moins chargé — nom [couleur sur l'image] traits, longueur cumulée, emprise :`];
    for (const s of order.slice(0, LIMITS.layers)) lines.push(`- ${s.l || '(sans nom)'} [${color.get(s.i)[0]}] ${s.seg} traits, ${Math.round(s.len)} m, de (${r1(s.x0)}, ${r1(s.y0)}) à (${r1(s.x1)}, ${r1(s.y1)})`);
    if (order.length > LIMITS.layers) lines.push(`- … et ${order.length - LIMITS.layers} calques plus légers non listés`);
    const key = /sc[eè]ne|plateau|stage|cadre|proscen|salle|gradin|balcon|parterre|orchestre|fosse|r[eé]gie|gril|perche|porteuse|passerelle|rideau|manteau|axe|niveau|\+\s?\d|\d[.,]\d\d/i;
    const texts = [...v.texts].filter(t => t.s.trim().length > 1).sort((a, c2) => (key.test(c2.s) ? 1 : 0) - (key.test(a.s) ? 1 : 0) || c2.h - a.h).slice(0, LIMITS.texts);
    if (texts.length){ lines.push(`Textes du dessin (${texts.length} sur ${v.texts.length}) — « texte » @ (x, y) :`); for (const t of texts) lines.push(`- « ${t.s.trim().slice(0, 60)} » @ (${r1(f.X(t.x))}, ${r1(f.Y(t.y))}) [${v.layers[t.l] ?? ''}]`); }
    return { text: lines.join('\n'), url: c.toDataURL('image/png') };
  }

  // ---------------------------------------------------------------- poser un plan dans le projet
  // Le projet ne garde qu'une fiche légère du plan (échelle k, zéro ax/ay, rotation, calques) ; ses traits ou son image restent à part.
  // aucune salle n'est créée en silence par-dessus le projet ouvert : il faut passer par creer_salle (connecteur, IA) ou par la confirmation de la fenêtre
  function ensureParam(){ if (A.venue.type === 'param') return; throw new Error(window.PARC ? PARC.NEED() : 'Aucune salle sur mesure ouverte.'); }
  const setV = patch => { A.setVenue({ ...A.venue, ...patch }, true); ST.touch(); ST.render(); if (window.PLAN){ PLAN.P.dirty = true; } };
  function applyPlan(light, heavy, extra){ ensureParam(); A.setPlanData(light.id, heavy); idbPut(light.id, heavy); setV({ ...(extra || {}), plan: light }); }
  async function planFromFile(f, page = 1){
    if (f.kind === 'cad'){ const v = f.cad; return { light: { id: uid(), name: f.name, kind: 'vec', w: v.w, h: v.h, k: v.mm / 1000, ax: v.w / 2, ay: v.h / 2, rot: 0, hidden: v.hiddenLayers, walls: [], calibrated: false }, heavy: { kind: 'vec', layers: v.vector.layers, polys: v.vector.polys, texts: v.vector.texts } }; }
    if (f.kind === 'pdf'){ const r = await renderPdf(f, page, FULL, 3300, .72), W = r.wMm / 1000 * 100;        // faute de mieux : supposé au 1:100, à caler
      return { light: { id: uid(), name: f.name + (f.pages > 1 ? ' · p. ' + page : ''), kind: 'img', w: r.canvas.width, h: r.canvas.height, k: W / r.canvas.width, ax: r.canvas.width / 2, ay: r.canvas.height / 2, rot: 0, calibrated: false }, heavy: { kind: 'img', url: 'data:image/jpeg;base64,' + r.data } }; }
    if (f.kind === 'image') return { light: { id: uid(), name: f.name, kind: 'img', w: f.w, h: f.h, k: 30 / f.w, ax: f.w / 2, ay: f.h / 2, rot: 0, calibrated: false }, heavy: { kind: 'img', url: f.url } };
    throw new Error('Ce fichier ne peut pas servir de fond de plan.');
  }
  // emprise, dans la salle, des traits d'un plan vectoriel (tous, ou seulement ses calques de murs)
  function vecBounds(light, heavy, onlyWalls){ const T = A.planXf(light), wal = new Set(light.walls), hid = new Set(light.hidden); let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, n = 0;
    for (const q of heavy.polys){ const nm = heavy.layers[q.l]; if (hid.has(nm) || (onlyWalls && !wal.has(nm))) continue; for (let i = 0; i < q.p.length; i += 2){ const x = T.x(q.p[i], q.p[i + 1]), z = T.z(q.p[i], q.p[i + 1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); n++; } }
    return n ? { x0, x1, z0, z1 } : null; }
  // la boîte de la salle s'ajuste aux murs du plan (jamais plus petite que ce que le plan montre)
  function fitToWalls(light, heavy){ const b = vecBounds(light, heavy, true); if (!b) return {}; const hw = Math.min(60, Math.max(Math.abs(b.x0), Math.abs(b.x1)));
    return { shell: false, w: Math.max(4, r1(2 * hw + .4)), d: Math.max(3, Math.min(150, r1(b.z1 + .2))), stageD: Math.max(1, Math.min(60, r1(-b.z0 - 1.5 + .2))) }; }

  // ---------------------------------------------------------------- outils du créateur de salle
  const num = { type: 'number' }, str = { type: 'string' };
  const ZONE = { type: 'object', description: 'Partie à agrandir, en fractions de la page : x0,y0 = coin haut-gauche, x1,y1 = coin bas-droit (0 à 1)', properties: { x0: num, y0: num, x1: num, y1: num } };
  const HREF = 'hauteurM se compte depuis le PLATEAU (niveau 0,00) par défaut ; si la fiche donne la hauteur depuis le sol de la salle (cas fréquent des perches de face, côté public), passe reference: "sol" et la hauteur est convertie.';
  const PEXTRA = { reference: { type: 'string', enum: ['plateau', 'sol'], description: 'niveau depuis lequel hauteurM est comptée ; plateau par défaut' }, circuits: { type: 'number', description: 'nombre de circuits de gradateur sur la perche, lu dans la fiche' }, chargeRepartieLueKg: { type: 'number', description: 'charge admissible répartie LUE dans la fiche : seulement proposée, l\'utilisateur la valide dans le plan de charge' }, chargePonctuelleLueKg: { type: 'number', description: 'charge admissible par point ou par moteur LUE dans la fiche : seulement proposée' }, structure: { type: 'string', enum: ['tube', 'pont'], description: 'pont = la perche est un pont (truss) et non un tube ; hauteurM est alors la hauteur du DESSOUS du pont' }, sectionCm: { type: 'number', description: 'pont : côté de la section, 29 par défaut' }, moteurs: { type: 'number', description: 'nombre de moteurs (palans) qui portent la perche, s\'il est visible sur un document' }, positionsMoteursM: { type: 'array', items: num, description: 'position de chaque moteur le long de la perche, depuis l\'axe (négatif = jardin) ; sinon ils sont répartis' }, poidsPontKgParM: { type: 'number', description: 'poids propre du pont au mètre, seulement s\'il est écrit' } };
  const BUILD_TOOLS = [
    { name: 'lister_documents', description: 'Liste les documents que le régisseur a déposés dans la fenêtre « Créer la salle » de StageFactory (plans, coupes, fiche technique, photos, notes), avec ses consignes. À appeler en premier.', input_schema: { type: 'object', properties: {} } },
    { name: 'voir_document', description: 'Montre un document en image : une page de PDF, une image, ou le rendu d\'un plan de CAO. Sans zone : la page entière. Avec une zone : cette partie agrandie, pour lire les cotes, les règles graduées et les petits textes. À utiliser autant de fois que nécessaire.', input_schema: { type: 'object', properties: { fichier: str, page: num, zone: ZONE }, required: ['fichier'] } },
    { name: 'lire_texte_pdf', description: 'Rend les textes d\'une page de PDF avec leur position (fractions de la page, x vers la droite, y vers le bas). Très utile pour les règles graduées et les numéros de perches : la position des étiquettes donne l\'échelle exacte. « contient » filtre les textes.', input_schema: { type: 'object', properties: { fichier: str, page: num, contient: str, zone: ZONE }, required: ['fichier'] } },
    { name: 'caler_plan', description: 'Pose une page de PDF ou une image comme fond de plan, à l\'échelle. largeurReelleM = largeur réelle représentée par toute la largeur de la page (largeur du papier × échelle ; par ex. une page A1 portrait de 0,594 m au 1:50 = 29,7 m). axeX et zeroY = position, en fractions de la page, de l\'axe de la salle et du zéro (nez de scène). Le lointain doit être en haut de la page ; sinon donne rotationDeg (angle, dans le sens des aiguilles d\'une montre, dont il faut tourner la page pour mettre le lointain en haut : 0, 90, 180 ou 270).', input_schema: { type: 'object', properties: { fichier: str, page: num, largeurReelleM: num, axeX: num, zeroY: num, rotationDeg: num }, required: ['fichier', 'largeurReelleM', 'axeX', 'zeroY'] } },
    { name: 'caler_plan_cao', description: 'Pose un plan de CAO (DWG, DXF) comme fond : recadré sur la salle, zéro au nez de scène, lointain en haut, calques de murs élevés en 3D. Coordonnées dans le repère du plan montré par voir_document (mètres, x à droite, y en haut).', input_schema: { type: 'object', properties: { fichier: str, facteurEchelle: { type: 'number', description: '1 si l\'échelle du plan est juste ; sinon le facteur par lequel multiplier ses mètres pour obtenir les vrais mètres' }, zoneSalle: { type: 'object', description: 'Rectangle qui contient la salle de spectacle et sa cage de scène, sans le reste du bâtiment', properties: { x0: num, y0: num, x1: num, y1: num } }, nezDeScene: { type: 'object', description: 'Point du nez de scène sur l\'axe de la salle', properties: { x: num, y: num } }, directionLointainDeg: { type: 'number', description: 'Direction du nez de scène vers le lointain, en degrés : 0 = vers +x, 90 = vers +y' }, calquesMurs: { type: 'array', items: str, description: 'Noms exacts des calques qui dessinent les murs porteurs et cloisons de la salle' }, calquesMasques: { type: 'array', items: str, description: 'Noms exacts des calques à masquer (hachures, mobilier, cotes, réseaux…)' }, hauteurMursM: num }, required: ['fichier'] } },
    { name: 'regler_salle', description: 'Décrit le volume de la salle pour la vue 3D et la coupe. Toutes les valeurs en mètres ; seuls les champs fournis changent. hauteurSceneM = hauteur du plateau au-dessus du sol du premier rang. mursDuPlan = true quand les murs viennent des calques du plan de CAO (la boîte simple est alors retirée).', input_schema: { type: 'object', properties: { nomSalle: str, plateauLargeurM: num, plateauProfondeurM: num, cadreOuvertureM: num, cadreHauteurM: num, cadreReculM: { type: 'number', description: 'distance du nez de scène au cadre, vers le lointain' }, hauteurCageM: num, hauteurSalleM: num, hauteurSceneM: num, salleLargeurM: num, salleProfondeurM: { type: 'number', description: 'du nez de scène au mur du fond de salle' }, gradinDebutM: { type: 'number', description: 'distance du nez de scène au premier rang' }, gradinRangs: num, gradinProfondeurRangM: num, gradinHauteurRangM: { type: 'number', description: 'hauteur du premier rang' }, gradinHauteurDernierRangM: { type: 'number', description: 'si la pente du gradin augmente vers le fond : hauteur du dernier rang' }, hauteurGrilM: num, passerellesLateralesHauteursM: { type: 'array', items: num, description: 'hauteur de chaque passerelle latérale de la cage de scène' }, passerelleLargeurM: num, passerelleLointainHauteurM: num, fosseProfondeurM: { type: 'number', description: 'profondeur de la fosse devant le nez de scène' }, fosseNiveauM: { type: 'number', description: 'niveau du plancher de fosse par rapport au plateau : 0 au niveau scène, négatif plus bas' }, mursDuPlan: { type: 'boolean' } } } },
    { name: 'poser_perches', description: 'Pose une série de perches parallèles au nez de scène, numérotées à la suite. ' + A.MAXP + ' perches au plus dans une salle. ' + HREF, input_schema: { type: 'object', properties: { prefixe: str, premierNumero: num, nombre: num, yPremiereM: { type: 'number', description: 'distance de la première au zéro, vers le lointain (négatif = côté public)' }, pasM: num, longueurM: num, hauteurM: num, ...PEXTRA }, required: ['nombre', 'yPremiereM', 'pasM', 'longueurM', 'hauteurM'] } },
    { name: 'poser_perche', description: 'Pose une seule perche (ou un pont, une porteuse de face). y = distance au nez de scène vers le lointain ; y négatif = côté public. x = décalage par rapport à l\'axe (positif = cour). ' + HREF, input_schema: { type: 'object', properties: { nom: str, y: num, x: num, longueurM: num, hauteurM: num, ...PEXTRA }, required: ['y', 'longueurM', 'hauteurM'] } },
    { name: 'retirer_perches', description: 'Retire toutes les perches qui ne portent aucun appareil, pour les reposer autrement.', input_schema: { type: 'object', properties: {} } },
    { name: 'lire_salle', description: 'Rend l\'état actuel de la salle : dimensions, cadre, gradin, fosse, passerelles, perches, plan calé.', input_schema: { type: 'object', properties: {} } },
    { name: 'noter_faits', description: 'À appeler à la fin : tout ce qui a été retenu, avec la source précise et la confiance, les questions à poser au régisseur, et ce qui manque. Remplace la liste précédente.', input_schema: { type: 'object', properties: { nomSalle: str, faits: { type: 'array', items: { type: 'object', properties: { sujet: str, valeur: str, source: str, confiance: { type: 'string', enum: ['lu', 'déduit', 'supposé'] } }, required: ['sujet', 'valeur', 'source', 'confiance'] } }, questions: { type: 'array', items: str } }, required: ['faits'] } },
  ];
  const METHOD = `L'import d'une salle se fait en TROIS PASSES, dans cet ordre.
PASSE 1 — LA SALLE ET LES PERCHES. Travaille comme un régisseur devant les plans, pas en une seule lecture :
1. Si aucune salle sur mesure n'est ouverte, appelle creer_salle (demande d'abord à l'utilisateur si un projet est ouvert). La salle naît vide : aucune perche n'est posée d'office.
2. Fais le tour des documents (voir_document, page entière) pour savoir ce que chacun montre : vue en plan, coupe, détail, fiche technique.
3. Trouve l'échelle et le zéro. Les plans de théâtre portent souvent des règles graduées en centimètres, avec un zéro à l'axe et un zéro au nez de scène ou au cadre : lire_texte_pdf donne la position de leurs étiquettes, d'où l'échelle exacte. Sinon, sers-toi de l'échelle du cartouche et du format de la page, ou d'une cote écrite.
4. Mesure et recoupe : plateau, cadre, salle, gradin, position de chaque perche, passerelles. Une même cote lue sur le plan et sur la coupe doit concorder ; en cas d'écart, garde la plus sûre et signale-le.
5. Construis : caler_plan ou caler_plan_cao s'il y a un plan, regler_salle, poser_perches pour les séries régulières, poser_perche pour les cas particuliers. Pour chaque perche, donne aussi ce que la fiche écrit ou montre : circuits, chargeRepartieLueKg, chargePonctuelleLueKg, et sa nature : structure « pont » quand la perche est un pont (truss) et non un tube, avec ses moteurs s'ils sont dessinés (une perche « motorisée » a des moteurs). Attention à la référence des hauteurs (plateau ou sol de la salle) : paramètre reference.
PASSE 2 — LE PARC, AVEC SES QUANTITÉS. Pour chaque ligne de matériel de la fiche (lumière, son, vidéo, plateau, micros, backline) :
6. Trouve le type : list_library, puis titan_search et titan_import pour les projecteurs. S'il n'existe nulle part, crée-le avec creer_type (forme de base la plus proche ; poids seulement s'il est écrit).
Le DMX doit correspondre aux machines de la fiche : un projecteur trouvé dans Titan arrive avec ses vrais modes ; un projecteur sur gradateur se crée avec canaux: 1 ; pour un automatique absent de Titan, cherche la notice du fabricant et donne modesDmx avec l'ordre exact des canaux de chaque mode : creer_type refuse un automatique sans son DMX. Piloter les appareils est primordial : ecrire_parc te rend la liste des non pilotables, elle doit être vide. Pour une enceinte créée à la volée, donne splMaxDb et ses ouvertures si le fabricant les publie : la carte de couverture en dépend.
7. Écris tout le parc d'un coup avec ecrire_parc : libellé d'origine, quantité exacte de la fiche, catégorie, type. Les micros, le backline et les accessoires sans modèle 3D se notent sans type. Relis avec lire_parc et compare les quantités à la fiche.
PASSE 3 — LE MATÉRIEL FIXE. Ce qui est installé à demeure se pose avec poser_materiel_fixe : diffusion (façade, subs, rappels) à sa place, vidéoprojecteur, cyclo, frises, pendrillons, rideau de fond, gradateurs avec leurs circuits par perche. Ne pose pas le matériel mobile du parc : il reste au stock, le régisseur le posera. Une fois la diffusion posée, couverture_son affiche le recouvrement sonore de la salle.
ENSUITE, SI ON TE DEMANDE UNE SCÉNOGRAPHIE OU UN PLAN DE FEU : sers-toi du matériel de la salle (lire_parc), pose avec add_objects sans dépasser le stock qu'il te rend, patche avec patch_objects, contrôle avec verifier_dmx (tout doit être pilotable, et il rend le patch à recopier dans la console), vérifie load_report, et enregistre les mémoires.
POUR FINIR : vérifie avec lire_salle et lire_parc, puis appelle noter_faits.
Règles :
- Le zéro de StageFactory est le nez de scène, dans l'axe. Si le zéro du plan est au cadre, donne cadreReculM et décale les distances.
- Ne pose une perche que si un document la montre. Les séries numérotées se posent d'un coup avec leur pas.
- Sécurité : une charge admissible lue dans la fiche n'est jamais appliquée. Tu la donnes avec la perche (chargeRepartieLueKg, chargePonctuelleLueKg) : elle est proposée au régisseur, qui la valide lui-même dans le plan de charge. Cite-la aussi dans noter_faits avec sa source. N'en déduis jamais une.
- Ce que tu ne peux pas établir, ne l'invente pas : ni perche, ni quantité, ni poids. Prends une valeur d'usage seulement quand le modèle 3D en a besoin, et marque-la « supposé ».
- Quand on te donne ensuite de nouvelles informations, corrige la salle existante sans tout refaire, et mets à jour les faits.`;
  const SYSTEM = `Tu es le créateur de salle de StageFactory, un logiciel de prévisualisation de spectacle. Un régisseur te confie tout ce qu'il sait d'une salle : plans, coupes, fiche technique, photos, notes. Tu construis cette salle, la plus complète et la plus juste possible, puis tu rends compte.
${METHOD}
- Réponds en français, brièvement : ce que tu as construit, ce qui est incertain, ce qu'il te faudrait pour faire mieux.`;

  const img = data => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
  const txt = (o, log) => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o) }], log });
  const usable = () => K.files.filter(f => f.kind !== 'other');
  const kindLabel = f => f.kind === 'cad' ? 'plan de CAO' : f.kind === 'pdf' ? 'PDF' : f.kind === 'image' ? 'image' : 'note';
  const docList = () => usable().map(f => `- ${f.name} (${kindLabel(f)}${f.note ? ', ' + f.note : ''})`).join('\n') || '(aucun document déposé)';
  const roomState = () => { const v = A.venue; if (v.type !== 'param') return { salle: 'Salle de démonstration (bâti fixe). Pour créer une autre salle : creer_salle (le projet ouvert est mis de côté, après accord de l\'utilisateur).', projetOuvert: S.name, objets: S.objs.length };
    const { facts, questions, notes, plan, pipes, type, vid, curt, dimmers, ...dims } = v, b = plan ? A.planBounds(plan) : null;
    return { salle: dims, perches: A.PERCHES.filter(p => !p.off).map(p => ({ numero: p.i + 1, ...(p.name ? { nom: p.name } : {}), distanceNezM: r3(-p.z), longueurM: r3(p.len), hauteurDepuisPlateauM: r3(p.y), hauteurDepuisSolM: r3(p.y + (v.stageH || 0)), ...(p.x ? { decalageAxeM: r3(p.x) } : {}), ...(p.truss ? { structure: 'pont', sectionCm: Math.round(p.sect * 100) } : {}), ...(p.mot ? { moteurs: p.mot } : {}), ...(p.c ? { circuits: p.c } : {}), ...(p.wllP ? { chargeRepartieLueKg: p.wllP } : {}), ...(p.wllPt ? { chargePonctuelleLueKg: p.wllPt } : {}) })), gradateurs: v.dimmers || null, parc: window.PARC ? { references: PARC.lines().length, pieces: PARC.lines().reduce((s, q) => s + q.qty, 0) } : null, materielFixe: S.objs.filter(o => o.fix).map(o => o.name), perchesPoseesUneAUne: !!pipes,
      plan: plan ? { fichier: plan.name, cale: plan.calibrated, calquesMurs: plan.walls, empriseM: { deX: r1(b.x0), aX: r1(b.x1), lointainJusquA: r1(-b.z0), publicJusquA: r1(b.z1) } } : null, faits: (facts || []).length, objetsPoses: S.objs.length }; };
  let undoMark = null;                                    // une passe de l'IA = une seule étape d'annulation
  const mark = label => { if (undoMark === false) return; if (undoMark === null) ST.pushUndo(0, label); else if (!undoMark.done){ ST.pushUndo(0, undoMark.label); undoMark.done = true; } };
  async function tool(name, i){ try { return await tool0(name, i); } catch (e){ return txt({ erreur: e?.message || 'Échec de l\'outil.' }, 'Refusé : ' + name); } }
  async function tool0(name, i){
    i = i || {}; const files = K.files;
    const find = () => files.find(f => f.name === i.fichier) ?? (i.fichier ? files.find(f => f.kind !== 'other' && f.name.toLowerCase().includes(String(i.fichier).toLowerCase().slice(0, 30))) : null);
    const missing = () => txt({ erreur: `Fichier « ${i.fichier} » introuvable. Fichiers : ${usable().map(f => f.name).join(' | ') || 'aucun (le régisseur doit les déposer dans la fenêtre « Créer la salle »)'}` }, `Fichier introuvable : ${i.fichier}`);
    if (name === 'lister_documents') return txt(`DOCUMENTS DÉPOSÉS :\n${docList()}\n\n${K.notes.trim() ? 'CE QUE LE RÉGISSEUR PRÉCISE :\n' + K.notes.trim() + '\n\n' : ''}ÉTAT DE LA SALLE :\n${JSON.stringify(roomState())}\n\nMÉTHODE :\n${METHOD}`, 'Liste les documents');
    if (name === 'voir_document'){
      const f = find(); if (!f) return missing(); const z = zoneOf(i.zone), part = i.zone ? ` (zone ${r3(z.x0)},${r3(z.y0)} → ${r3(z.x1)},${r3(z.y1)})` : '';
      if (f.kind === 'pdf'){ const r = await renderPdf(f, i.page ?? 1, z, 1568); return { content: [img(r.data), { type: 'text', text: `« ${f.name} », page ${i.page ?? 1} sur ${r.pages}${part}. Format du papier : ${Math.round(r.wMm)} × ${Math.round(r.hMm)} mm.` }], log: `Regarde ${f.name}${part}` }; }
      if (f.kind === 'image'){ const r = await cropImage(f.url, z, 1568); return { content: [img(r.data), { type: 'text', text: `Image « ${f.name} »${part}.` }], log: `Regarde ${f.name}${part}` }; }
      if (f.kind === 'cad'){ const d = f.digest || (f.digest = digestCad(f.name, f.cad)), r = await cropImage(d.url, z, 1568, .88); return { content: [img(r.data), { type: 'text', text: d.text }], log: `Regarde le plan de CAO ${f.name}${part}` }; }
      if (f.kind === 'text') return txt(`NOTE « ${f.name} » :\n${(f.text ?? '').slice(0, 30000)}`, `Lit ${f.name}`);
      return txt({ erreur: 'Ce fichier n\'est pas lisible.' }, `Illisible : ${f.name}`);
    }
    if (name === 'lire_texte_pdf'){
      const f = find(); if (!f || f.kind !== 'pdf') return f ? txt({ erreur: 'Ce n\'est pas un PDF.' }, 'Pas un PDF') : missing();
      const pdf = await pdfOf(f), page = await pdf.getPage(Math.max(1, Math.min(pdf.numPages, Math.round(i.page ?? 1)))), vp = page.getViewport({ scale: 1 }), tc = await page.getTextContent(), z = zoneOf(i.zone), needle = typeof i.contient === 'string' ? i.contient.toLowerCase() : '';
      const all = tc.items.filter(t => t.str && t.str.trim()).map(t => { const [x, y] = vp.convertToViewportPoint(t.transform[4], t.transform[5]); return { t: t.str.trim().slice(0, 50), x: r3((x + (t.width || 0) / 2) / vp.width), y: r3((y - (t.height || 0) / 2) / vp.height) }; })
        .filter(t => t.x >= z.x0 && t.x <= z.x1 && t.y >= z.y0 && t.y <= z.y1 && (!needle || t.t.toLowerCase().includes(needle)));
      return txt({ page: i.page ?? 1, papierMm: [Math.round(vp.width / 72 * 25.4), Math.round(vp.height / 72 * 25.4)], textes: all.length, rendus: Math.min(all.length, 500), liste: all.slice(0, 500).map(t => `${t.t} @ ${t.x},${t.y}`), ...(all.length ? {} : { remarque: 'Aucun texte : ce PDF est peut-être une image. Lis-le avec voir_document.' }) }, `Lit les textes de ${f.name}${needle ? ` (« ${i.contient} »)` : ''} : ${all.length}`);
    }
    if (name === 'caler_plan'){
      const f = find(); if (!f) return missing(); const W = +i.largeurReelleM; if (!(W >= 2 && W <= 500)) return txt({ erreur: 'largeurReelleM doit être la largeur réelle couverte par toute la page, entre 2 et 500 m.' }, 'Échelle refusée');
      if (f.kind !== 'pdf' && f.kind !== 'image') return txt({ erreur: 'caler_plan prend un PDF ou une image. Pour un DWG ou DXF, utilise caler_plan_cao.' }, 'Mauvais type de fichier');
      const { light, heavy } = await planFromFile(f, i.page ?? 1), ax = Math.max(0, Math.min(1, +i.axeX || 0)), zy = Math.max(0, Math.min(1, +i.zeroY || 0)), q = ((Math.round((+i.rotationDeg || 0) / 90) % 4) + 4) % 4;
      Object.assign(light, { k: W / light.w, ax: ax * light.w, ay: zy * light.h, rot: q * Math.PI / 2, calibrated: true }); ensureParam(); mark('Caler le plan'); applyPlan(light, heavy); const b = A.planBounds(light);
      return txt({ ok: true, empriseM: { deX: r3(b.x0), aX: r3(b.x1), lointainJusquA: r3(-b.z0), publicJusquA: r3(b.z1) }, rappel: 'La boîte de la salle ne suit pas le plan : donne ses dimensions avec regler_salle.' }, `Plan calé : ${f.name}, ${r3(W)} m de large`);
    }
    if (name === 'caler_plan_cao'){
      const f = find(); if (!f || f.kind !== 'cad') return f ? txt({ erreur: 'Ce n\'est pas un plan de CAO.' }, 'Pas un plan de CAO') : missing(); ensureParam();
      const v = f.cad, fr = frame(v), uf = fin(i.facteurEchelle) && i.facteurEchelle > .001 && i.facteurEchelle < 1000 ? i.facteurEchelle : 1, zs = i.zoneSalle;
      const z = zs && [zs.x0, zs.y0, zs.x1, zs.y1].every(fin) ? { x0: Math.min(zs.x0, zs.x1) - 1, x1: Math.max(zs.x0, zs.x1) + 1, y0: Math.min(zs.y0, zs.y1) - 1, y1: Math.max(zs.y0, zs.y1) + 1 } : null;
      const o = i.nezDeScene && fin(i.nezDeScene.x) && fin(i.nezDeScene.y) ? i.nezDeScene : z ? { x: (z.x0 + z.x1) / 2, y: (z.y0 + z.y1) / 2 } : { x: fr.W / 2, y: fr.H / 2 }, dir = fin(i.directionLointainDeg) ? i.directionLointainDeg : 90;
      const inside = (vx, vy) => !z || (fr.X(vx) >= z.x0 && fr.X(vx) <= z.x1 && fr.Y(vy) >= z.y0 && fr.Y(vy) <= z.y1);
      const polys = v.vector.polys.filter(q => { for (let k = 0; k < q.p.length; k += 2) if (inside(q.p[k], q.p[k + 1])) return true; return false; });
      if (!polys.length) return txt({ erreur: 'La zone donnée ne contient aucun trait du plan. Vérifie zoneSalle dans le repère montré par voir_document.' }, 'Zone vide');
      const has = n => v.vector.layers.includes(n), cur = A.venue.type === 'param' ? A.venue : A.VDEF;
      const light = { id: uid(), name: f.name, kind: 'vec', w: v.w, h: v.h, k: fr.k * uf, ax: o.x / fr.k, ay: v.h - o.y / fr.k, rot: (dir - 90) * Math.PI / 180, hidden: [...new Set([...(v.hiddenLayers || []), ...(i.calquesMasques ?? []).filter(has)])], walls: (i.calquesMurs ?? []).filter(has), wallH: fin(i.hauteurMursM) && i.hauteurMursM > .2 ? i.hauteurMursM : cur.h, calibrated: true };
      const heavy = { kind: 'vec', layers: v.vector.layers, polys, texts: v.vector.texts.filter(t => inside(t.x, t.y)) }, fit = light.walls.length ? fitToWalls(light, heavy) : {};
      mark('Caler le plan'); applyPlan(light, heavy, fit); const b = vecBounds(light, heavy, false);
      return txt({ ok: true, calquesMurs: light.walls, calquesMasques: light.hidden, hauteurMursM: light.wallH, empriseM: b && { deX: r3(b.x0), aX: r3(b.x1), lointainJusquA: r3(-b.z0), publicJusquA: r3(b.z1) }, ...(light.walls.length ? { salleAjusteeAuxMurs: fit, rappel: 'Les murs viennent du plan. Précise plateau, cadre et hauteurs avec regler_salle.' } : { rappel: 'Aucun calque de murs : la boîte simple reste. Donne les dimensions avec regler_salle.' }) }, `Plan de CAO calé : ${f.name}, ${light.walls.length} calque(s) en murs`);
    }
    if (name === 'regler_salle'){
      const lim = (v, lo, hi) => (fin(v) && v >= lo && v <= hi ? v : undefined), cur = A.venue.type === 'param' ? A.venue : A.VDEF;
      const r = { stageW: lim(i.plateauLargeurM, 2, 100), stageD: lim(i.plateauProfondeurM, 1, 60), prosW: lim(i.cadreOuvertureM, 2, 60), prosH: lim(i.cadreHauteurM, 2, 40), prosZ: lim(i.cadreReculM, 0, 10), cageH: lim(i.hauteurCageM, 2.5, 50), h: lim(i.hauteurSalleM, 2.5, 40), stageH: lim(i.hauteurSceneM, 0, 4), d: lim(i.salleProfondeurM, 3, 150),
        rowStart: lim(i.gradinDebutM, 0, 120), rowD: lim(i.gradinProfondeurRangM, .4, 3), rowH: lim(i.gradinHauteurRangM, 0, 1.5), rowHLast: lim(i.gradinHauteurDernierRangM, 0, 1.5), gridH: lim(i.hauteurGrilM, 2, 50), galW: lim(i.passerelleLargeurM, .3, 5), backGalH: lim(i.passerelleLointainHauteurM, 1, 50), pitD: lim(i.fosseProfondeurM, .3, 20), pitY: lim(i.fosseNiveauM, -8, 0) };
      const sw = lim(i.salleLargeurM, 4, 120); if (sw || (r.stageW && r.stageW > cur.w)) r.w = Math.max(sw || 0, r.stageW || 0, sw ? 0 : cur.w);
      if (fin(i.gradinRangs)) r.rows = Math.max(0, Math.min(80, Math.round(i.gradinRangs)));
      if (Array.isArray(i.passerellesLateralesHauteursM)) r.galHs = i.passerellesLateralesHauteursM.filter(x => fin(x) && x >= 1 && x <= 50).slice(0, 8);
      if (typeof i.mursDuPlan === 'boolean') r.shell = !i.mursDuPlan; if (typeof i.nomSalle === 'string' && i.nomSalle.trim()) r.name = i.nomSalle.trim().slice(0, 60);
      const clean = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)); if (!Object.keys(clean).length) return txt({ erreur: 'Aucune cote exploitable (toutes les valeurs sont en mètres).' }, 'Réglage refusé');
      ensureParam(); mark('Régler la salle'); setV(clean); return txt({ ok: true, ...roomState() }, `Volume de la salle réglé (${Object.keys(clean).length} cotes)`);
    }
    const curPipes = () => (A.venue.type === 'param' && A.venue.pipes ? A.venue.pipes.map(q => ({ ...q })) : []);
    const hPl = h => (i.reference === 'sol' ? h - (A.venue.stageH || 0) : h), pex = () => ({ ...(+i.circuits > 0 ? { c: +i.circuits } : {}), ...(+i.chargeRepartieLueKg > 0 ? { wll: +i.chargeRepartieLueKg } : {}), ...(+i.chargePonctuelleLueKg > 0 ? { wllPt: +i.chargePonctuelleLueKg } : {}), ...(i.structure === 'pont' ? { st: 'truss', sec: +i.sectionCm || 29, ...(+i.poidsPontKgParM > 0 ? { kgm: +i.poidsPontKgParM } : {}) } : {}), ...(+i.moteurs > 0 ? { mot: +i.moteurs } : {}), ...(Array.isArray(i.positionsMoteursM) && i.positionsMoteursM.length ? { mx: i.positionsMoteursM } : {}) });
    const hNote = () => ({ hauteurDepuisLePlateauM: r3(hPl(+i.hauteurM)), hauteurDepuisLeSolDeSalleM: r3(hPl(+i.hauteurM) + (A.venue.stageH || 0)), ...(+i.chargeRepartieLueKg > 0 || +i.chargePonctuelleLueKg > 0 ? { charges: 'proposées dans le plan de charge, à valider par le régisseur' } : { chargeAdmissible: 'inconnue : à saisir à la main depuis la fiche technique' }) });
    if (name === 'poser_perches'){
      const n = Math.max(1, Math.min(A.MAXP, Math.round(+i.nombre || 0))), y0 = +i.yPremiereM, step = +i.pasM, L = +i.longueurM, h = +i.hauteurM, first = Math.round(+i.premierNumero || 1), pre = typeof i.prefixe === 'string' && i.prefixe.trim() ? i.prefixe.trim().slice(0, 20) : 'Perche';
      if (![y0, step, L, h].every(fin) || L <= 0 || h <= 0) return txt({ erreur: 'yPremiereM, pasM, longueurM et hauteurM sont nécessaires.' }, 'Série refusée');
      const base = curPipes(), room = A.MAXP - base.length, m = Math.min(n, room); if (m <= 0) return txt({ erreur: `La salle a déjà ${base.length} perches : c'est le maximum (${A.MAXP}).` }, 'Trop de perches');
      ensureParam(); mark('Poser des perches'); setV({ pipes: [...base, ...Array.from({ length: m }, (_, k) => ({ n: `${pre} ${first + k}`, z: -(y0 + k * step), len: L, y: hPl(h), ...pex() }))] });
      return txt({ posees: m, ...(m < n ? { nonPosees: n - m, raison: `limite de ${A.MAXP} perches` } : {}), de: `${pre} ${first} à ${r3(y0)} m`, a: `${pre} ${first + m - 1} à ${r3(y0 + (m - 1) * step)} m`, total: base.length + m, ...hNote() }, `${m} perches posées, de ${pre} ${first} à ${pre} ${first + m - 1}`);
    }
    if (name === 'poser_perche'){
      const y = +i.y, L = +i.longueurM, h = +i.hauteurM; if (![y, L, h].every(fin) || L <= 0 || h <= 0) return txt({ erreur: 'y, longueurM et hauteurM sont nécessaires.' }, 'Perche refusée');
      const base = curPipes(); if (base.length >= A.MAXP) return txt({ erreur: `La salle a déjà ${base.length} perches : c'est le maximum.` }, 'Trop de perches');
      ensureParam(); mark('Poser une perche'); setV({ pipes: [...base, { n: String(i.nom || '').slice(0, 40), z: -y, len: L, y: hPl(h), ...(fin(i.x) && i.x ? { x: i.x } : {}), ...pex() }] });
      return txt({ ok: true, numero: base.length + 1, total: base.length + 1, ...hNote() }, `Perche posée : ${i.nom || 'sans nom'} à ${r3(y)} m`);
    }
    if (name === 'retirer_perches'){
      const base = curPipes(), used = new Set(S.objs.filter(o => o.hang === 'perche').map(o => o.pi)), keep = base.filter((_, k) => used.has(k)); if (!base.length) return txt({ retirees: 0, remarque: 'Aucune perche posée une à une.' }, 'Rien à retirer');
      mark('Retirer les perches'); setV({ pipes: keep.length ? keep : undefined, ...(keep.length ? {} : { noPipes: true }) });
      return txt({ retirees: base.length - keep.length, restantes: keep.length }, 'Perches vides retirées');
    }
    if (name === 'lire_salle') return txt(roomState(), 'Lit la salle');
    if (name === 'noter_faits'){
      const facts = (Array.isArray(i.faits) ? i.faits : []).filter(x => x && x.sujet), qs = Array.isArray(i.questions) ? i.questions : [];
      ensureParam(); mark('Noter les faits'); setV({ facts, questions: qs, ...(typeof i.nomSalle === 'string' && i.nomSalle.trim() ? { name: i.nomSalle.trim().slice(0, 60) } : {}) });
      return txt({ ok: true, faits: (A.venue.facts || []).length }, `${(A.venue.facts || []).length} faits notés avec leur source`);
    }
    if (window.PARC && PARC.isTool(name)){ const r = await PARC.tool(name, i, mark); return txt(r.out, r.log); }
    return txt({ erreur: 'outil inconnu : ' + name }, 'Outil inconnu');
  }

  // ---------------------------------------------------------------- une passe du créateur
  const imageCount = ms => ms.reduce((n, m) => n + (m.role === 'user' && Array.isArray(m.content) ? m.content.reduce((k, b) => k + (b.type === 'tool_result' && Array.isArray(b.content) ? b.content.filter(c => c.type === 'image').length : 0), 0) : 0), 0);
  function lighten(ms, max = 12, keep = 4){ if (imageCount(ms) <= max) return; let kept = 0;       // au-delà du seuil : on ne garde que les dernières images
    for (let k = ms.length - 1; k >= 0; k--){ const m = ms[k]; if (m.role !== 'user' || !Array.isArray(m.content)) continue;
      for (const b of m.content) if (b.type === 'tool_result' && Array.isArray(b.content)) b.content = b.content.slice().reverse().map(c => (c.type === 'image' ? (++kept <= keep ? c : { type: 'text', text: '(image déjà regardée, retirée pour alléger : redemande-la si besoin)' }) : c)).reverse(); } }
  const aiMode = () => { const st = window.AI && AI.st; if (!st) return 'none'; if (LOCAL && st.local) return st.local.hasKey ? 'local' : 'nokey'; return st.sample && st.sample !== 'local' && window.claude ? 'sample' : 'none'; };
  const opening = (first, notes) => `${first ? 'Voici le dossier de la salle.' : 'Nouvelles informations pour améliorer la salle.'}\nDOCUMENTS DISPONIBLES :\n${docList()}\n\nÉTAT DE LA SALLE :\n${JSON.stringify(roomState())}\n\n${notes.trim() ? 'CE QUE LE RÉGISSEUR PRÉCISE :\n' + notes.trim() : first ? 'Construis la salle.' : 'Reprends la salle et améliore-la.'}`;
  async function runBuild(notes, onAction){
    const s = K.session, first = s.messages.length === 0, said = [], actions = [], mode = aiMode(); undoMark = { label: first ? 'Créer l’environnement depuis le dossier' : 'Améliorer l’environnement', done: false };
    const act = line => { actions.push(line); onAction(line); };
    try {
      if (mode === 'local'){
        const defs = allTools().filter(t => t.name !== 'lister_documents' && t.name !== 'creer_salle'); s.messages.push({ role: 'user', content: [{ type: 'text', text: opening(first, notes) }] });
        for (let round = 0; round < MAX_ROUNDS; round++){
          const r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: SYSTEM, messages: s.messages, tools: defs, max_tokens: 8000 }), signal: K.abort?.signal }), j = await r.json();
          if (j.error){ s.messages.pop(); const e = new Error(j.code === 'no_key' ? 'Aucune clé API enregistrée : ouvre l\'assistant (touche I), puis ⚙.' : j.code === 'bad_key' ? 'Clé API refusée par Anthropic : vérifie-la dans l\'assistant (touche I), puis ⚙.' : j.error); e.code = j.code; throw e; }
          const content = Array.isArray(j.content) ? j.content : []; s.rounds++; s.tin += j.usage?.input_tokens || 0; s.tout += j.usage?.output_tokens || 0; s.messages.push({ role: 'assistant', content });
          for (const b of content) if (b.type === 'text' && b.text.trim()) said.push(b.text.trim());
          const calls = content.filter(b => b.type === 'tool_use'); if (!calls.length) break;
          const results = []; for (const c of calls){ let out; try { out = await tool(c.name, c.input); } catch (e){ out = txt({ erreur: e?.message || 'Échec de l\'outil.' }, `Échec : ${c.name}`); } act(out.log); results.push({ type: 'tool_result', tool_use_id: c.id, content: out.content }); }
          s.messages.push({ role: 'user', content: results }); lighten(s.messages);
          if (round === MAX_ROUNDS - 1) said.push('Je m\'arrête ici : la lecture a pris beaucoup d\'étapes. Donne-moi une consigne pour continuer.');
        }
      } else if (mode === 'sample'){                      // version en ligne : pas d'image vers l'IA, elle travaille sur les textes des PDF et le résumé des plans de CAO
        const tools = allTools().filter(t => t.name !== 'lister_documents' && t.name !== 'creer_salle').map(t => ({ name: t.name, description: t.description, inputSchema: t.input_schema, execute: async input => { let out; try { out = await tool(t.name, input); } catch (e){ out = txt({ erreur: e?.message || 'Échec de l\'outil.' }, `Échec : ${t.name}`); } act(out.log);
          return out.content.map(c => (c.type === 'text' ? c.text : '(Image non transmise dans la version en ligne : appuie-toi sur lire_texte_pdf, sur le résumé du plan de CAO et sur les notes du régisseur.)')).join('\n').slice(0, 20000); } }));
        const prev = s.messages.filter(m => typeof m.content === 'string'), q = SYSTEM + '\n\n' + opening(first, notes), msgs = [...prev, { role: 'user', content: q }];
        const r = await AI.st.sample(msgs, { tools, cache: false, signal: K.abort?.signal }); s.rounds++; s.messages = [...msgs, { role: 'assistant', content: (r && r.text) || 'C\'est fait.' }]; said.push((r && r.text) || 'C\'est fait.');
      } else throw new Error(mode === 'nokey' ? 'Aucune clé API enregistrée : ouvre l\'assistant (touche I), puis ⚙.' : 'L\'IA n\'est pas disponible ici.');
      if (notes.trim() && A.venue.type === 'param' && undoMark.done) setV({ notes: [A.venue.notes, notes.trim()].filter(Boolean).join('\n\n') });   // les consignes restent avec la salle
    } finally { undoMark = null; }
    return { text: said.slice(-3).join('\n\n') || 'C\'est fait.', actions };
  }
  // connecteur Claude : mêmes outils, appelés depuis l'application Claude ; les images partent en vrai
  const allTools = () => [...BUILD_TOOLS, ...(window.PARC ? PARC.TOOLS : [])];
  const mcpTools = () => allTools().map(t => ({ name: t.name, description: (t.name === 'lister_documents' ? '' : 'Création de salle depuis des plans — ') + t.description, inputSchema: t.input_schema }));
  const isTool = name => allTools().some(t => t.name === name);
  async function mcpRun(name, args){ const out = await tool(name, args); if (K.open && !K.busy){ K.actions = [...K.actions, out.log].slice(-200); render(); }
    return { __mcp: true, text: out.content.filter(c => c.type === 'text').map(c => c.text).join('\n'), images: out.content.filter(c => c.type === 'image').map(c => c.source.data) }; }

  // ---------------------------------------------------------------- fenêtre « Créer la salle »
  const css = document.createElement('style'); css.textContent = `
  #venueWin{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:29;display:none;align-items:center;justify-content:center}
  #venueWin>div{background:#1d2027;border:1px solid var(--line);border-radius:12px;padding:16px;width:min(760px,94vw);max-height:90vh;overflow:auto;font-size:12.5px}
  #venueWin h1{font-size:16px;margin:0 0 4px} #venueWin .hd{display:flex;align-items:center;gap:8px;justify-content:space-between}
  #venueWin .drop{border:1.5px dashed var(--line);border-radius:10px;padding:14px;display:flex;gap:10px;align-items:center;margin:8px 0}
  #venueWin .drop.over{border-color:var(--accent2);background:#1c1636}
  #venueWin .fl{list-style:none;margin:6px 0;padding:0;display:grid;gap:3px} #venueWin .fl li{display:grid;grid-template-columns:84px 1fr auto auto;gap:8px;align-items:center;background:#1c1636;border-radius:6px;padding:4px 8px}
  #venueWin .fl li.off{opacity:.55} #venueWin .fl .k{color:var(--mute);font-size:10.5px;text-transform:uppercase;letter-spacing:.04em} #venueWin .fl .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #venueWin textarea{width:100%;background:#1c1636;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:8px;font:12.5px Inter,sans-serif;resize:vertical}
  #venueWin .log{max-height:150px;overflow:auto;margin:6px 0;padding:6px 10px 6px 24px;background:#15171c;border-radius:8px;font-size:11.5px;color:var(--mute)}
  #venueWin .rep{background:#1c1636;border-radius:8px;padding:10px;margin:8px 0;white-space:pre-wrap;line-height:1.5}
  #venueWin .b:disabled{opacity:.45;cursor:not-allowed}
  #venueWin .err{border:1px solid #e5484d;color:#ffb4b4;border-radius:8px;padding:8px;margin:8px 0}
  .vtab{width:100%;border-collapse:collapse;font-size:12px} .vtab th{text-align:left;color:var(--mute);font-weight:500;padding:3px 6px;position:sticky;top:0;background:#1d2027} .vtab td{padding:2px 6px;border-top:1px solid var(--line)} .vtab input[type=number],.vtab input[type=text]{width:100%;background:#1c1636;color:var(--ink);border:1px solid var(--line);border-radius:5px;padding:3px 5px;font:12px Inter,sans-serif}
  .vtag{font-size:10.5px;border-radius:4px;padding:1px 6px} .vtag.lu{background:#173a2a;color:#7be0a8} .vtag.deduit{background:#3a3217;color:#f0c96a} .vtag.suppose{background:#3a1c1c;color:#ff9c9c}
  #calibBar{position:fixed;left:50%;transform:translateX(-50%);top:54px;z-index:20;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 10px;display:none;gap:6px;align-items:center;flex-wrap:wrap;max-width:min(900px,94vw);font-size:12px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
  #calibBar input{width:80px;background:#1c1636;color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:4px 6px;font:12px Inter,sans-serif}`; document.head.appendChild(css);
  const win = document.createElement('div'); win.id = 'venueWin'; win.innerHTML = '<div></div>'; document.body.appendChild(win);
  const KIND = { cad: 'Plan de CAO', pdf: 'PDF', image: 'Image', text: 'Note', other: 'Non lu' }, sizeOf = n => (n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1000)) + ' ko');
  const factsHtml = v => { const facts = v.facts || [], qs = v.questions || [];
    return (qs.length ? `<div class="info"><b>Ce que l'IA aimerait savoir</b><ul style="margin:4px 0 0 16px;padding:0">${qs.map(q => `<li>${esc(q)}</li>`).join('')}</ul></div>` : '') +
      (facts.length ? `<details ${facts.length < 14 ? 'open' : ''}><summary style="cursor:pointer;margin:6px 0">${facts.length} valeur${facts.length > 1 ? 's' : ''} retenue${facts.length > 1 ? 's' : ''}, avec leur source</summary><table class="vtab"><thead><tr><th>Sujet</th><th>Valeur</th><th>D'où ça vient</th><th>Confiance</th></tr></thead><tbody>${facts.map(f => `<tr><td>${esc(f.sujet)}</td><td>${esc(f.valeur)}</td><td style="color:var(--mute)">${esc(f.source)}</td><td><span class="vtag ${f.confiance === 'lu' ? 'lu' : f.confiance === 'déduit' ? 'deduit' : 'suppose'}">${esc(f.confiance)}</span></td></tr>`).join('')}</tbody></table></details>` : ''); };
  function render(){
    if (!K.open) return; const box = win.firstElementChild, keepNotes = $('#vnNotes') ? $('#vnNotes').value : K.notes, built = K.session.messages.length > 0, mode = aiMode(), v = A.venue, use = usable();
    const aiLine = mode === 'local' ? `L'IA passe par ta clé API (assistant, touche I puis ⚙). Les documents sont envoyés à Anthropic par morceaux, au fil de la lecture : un environnement demande 15 à 40 échanges, soit quelques dollars selon le nombre de documents.${K.session.tin ? ` Jusqu'ici : ${Math.round((K.session.tin + K.session.tout) / 1000)} k jetons.` : ''}`
      : mode === 'nokey' ? 'Pour que l\'IA lise les plans ici, enregistre ta clé API : ouvre l\'assistant (touche I), puis ⚙. Sans clé, tu peux passer par l\'application Claude (connecteur), ou poser et caler un plan à la main ci-dessus.'
      : mode === 'sample' ? 'Version en ligne : l\'IA ne reçoit pas les images. Elle travaille sur les textes des PDF, le résumé des plans de CAO et tes notes ; le résultat est plus sûr avec la version installée.'
      : 'L\'IA n\'est pas disponible dans cette vue. Tu peux poser et caler un plan à la main ci-dessus.';
    box.innerHTML = `<div class="hd"><h1>${built ? 'Améliorer l’environnement' : 'Créer l’environnement depuis des plans'}</h1><span>${built ? '<button class="b" data-v="restart" title="Oublie la lecture précédente. L’environnement n\'est pas modifié.">Repartir de zéro</button> ' : ''}<button class="b" data-v="close">Fermer</button></span></div>
      <div class="sub">${built ? 'Ajoute ce que tu sais de plus : une cote corrigée, la fiche technique, une coupe, une consigne. L\'IA reprend l’environnement et le corrige, sans tout refaire.' : 'Dépose tout ce que tu sais de l’environnement : plans et coupes en PDF, DWG ou DXF, fiche technique, photos, notes. Un plan peut être posé en fond et calé à la main ; l\'IA peut aussi lire le dossier, mesurer sur les plans, recouper avec les coupes et construire l’environnement : fond de plan calé, volume, cadre, gradin, perches, passerelles.'}</div>
      ${K.err ? `<div class="err">${esc(K.err)}</div>` : ''}
      ${K.pending ? `<div class="err" style="border-color:#f0a23c;color:#ffe2b0"><b>Le projet ouvert sera remplacé.</b> « ${esc(S.name)} » (${S.objs.length} objet(s)) est dans un autre environnement. Il sera mis de côté : tu le retrouveras dans Fichier → Projets mis de côté.<div class="btns"><button class="b on" data-v="oknew">Créer le nouvel environnement</button><button class="b" data-v="nonew">Annuler</button></div></div>` : ''}
      ${built && K.report ? `<div class="rep">${esc(K.report)}</div>${factsHtml(v)}${K.actions.length ? `<details><summary style="cursor:pointer;margin:6px 0">${K.actions.length} étapes de travail</summary><ol class="log">${K.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ol></details>` : ''}` : ''}
      <div class="drop" id="vnDrop"><input type="file" id="vnFile" multiple hidden accept=".dwg,.dxf,.dxfb,.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.txt,.md,.csv"><button class="b on" data-v="pick" ${K.busy ? 'disabled' : ''}>${K.files.length ? 'Ajouter des fichiers' : 'Choisir des fichiers'}</button><span style="color:var(--mute)">ou glisse-les ici, autant que tu veux</span></div>
      ${K.files.length || K.reading ? `<ul class="fl">${K.files.map((f, k) => `<li class="${f.kind === 'other' ? 'off' : ''}"><span class="k">${KIND[f.kind]}</span><span class="n" title="${esc(f.name)}">${esc(f.name)} <span style="color:var(--mute)">· ${sizeOf(f.size)}${f.note ? ' · ' + esc(f.note) : ''}</span></span>${['cad', 'pdf', 'image'].includes(f.kind) ? `<span>${f.kind === 'pdf' && f.pages > 1 ? `p. <input type="number" min="1" max="${f.pages}" value="1" data-pg="${k}" style="width:46px;background:#1d2027;color:var(--ink);border:1px solid var(--line);border-radius:5px;padding:2px 4px"> ` : ''}<button class="b" data-v="place" data-k="${k}" ${K.busy ? 'disabled' : ''} title="Pose ce plan en fond, puis ouvre le calage : échelle, zéro au nez de scène, orientation">Poser en fond de plan</button></span>` : '<span></span>'}<a data-v="drop" data-k="${k}" style="cursor:pointer;color:var(--mute)">Retirer</a></li>`).join('')}${K.reading ? `<li style="color:var(--mute);display:block">Lecture de ${K.reading} fichier${K.reading > 1 ? 's' : ''}…</li>` : ''}</ul>` : ''}
      <label style="display:block;color:var(--mute);margin:8px 0 4px">${built ? 'Informations et consignes à ajouter' : 'Consignes et informations (facultatif)'}</label>
      <textarea id="vnNotes" rows="3" ${K.busy ? 'disabled' : ''} placeholder="${built ? 'Par exemple : les perches font 22 m. Le cadre est à 8 m de haut. Ajoute la passerelle de face à 6 m.' : 'Par exemple : c\'est la grande salle du bâtiment. Le zéro du plan est au cadre. Hauteur de travail des perches : 9 m.'}"></textarea>
      <div class="info">${aiLine}${LOCAL ? '<br><b>Avec l\'application Claude</b> (connecteur, menu Outils → Connecter à Claude) : laisse cette fenêtre ouverte avec les documents déposés, et demande à Claude « crée l’environnement à partir des documents déposés dans StageFactory ». Il voit les plans et règle l’environnement par les mêmes outils.' : ''}</div>
      ${K.busy ? `<ol class="log" id="vnLive">${K.live.map(a => `<li>${esc(a)}</li>`).join('') || '<li>L\'IA ouvre le dossier…</li>'}</ol>` : !built && K.actions.length ? `<details open><summary style="cursor:pointer;margin:6px 0">${K.actions.length} action(s) reçue(s) de Claude</summary><ol class="log">${K.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ol></details>${factsHtml(v)}` : ''}
      <div class="btns"><button class="b on" data-v="run" ${K.busy || K.reading || (mode !== 'local' && mode !== 'sample') || (!built && !use.length && !keepNotes.trim()) ? 'disabled' : ''}>${K.busy ? 'L\'IA travaille…' : built ? 'Améliorer avec l\'IA' : 'Construire avec l\'IA'}</button>${K.busy ? '<button class="b" data-v="stop">Arrêter</button>' : ''}<span style="flex:1"></span><span style="color:var(--mute);align-self:center">Tout s'annule d'un seul Ctrl+Z.</span></div>`;
    $('#vnNotes').value = keepNotes; const lv = $('#vnLive'); if (lv) lv.scrollTop = lv.scrollHeight;
    $('#vnFile').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
    const dz = $('#vnDrop'); dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over'); dz.ondrop = e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); if (!K.busy) addFiles(e.dataTransfer?.files ?? []); };
  }
  function openWin(f){ K.open = f ?? !K.open; win.style.display = K.open ? 'flex' : 'none'; if (K.open){ window.AI?.ready?.().then(render, () => {}); render(); } }
  win.addEventListener('input', e => { if (e.target.id === 'vnNotes') K.notes = e.target.value; });
  win.addEventListener('keydown', e => e.stopPropagation());
  win.addEventListener('pointerdown', e => { if (e.target === win && !K.busy) openWin(false); });
  win.addEventListener('click', async e => {
    const a = e.target.closest('[data-v]'); if (!a) return; const act = a.dataset.v, k = +a.dataset.k;
    if (act === 'close'){ if (K.busy) return ST.toast('L\'IA travaille encore : arrête-la d\'abord, ou attends la fin.', true); return openWin(false); }
    if (act === 'pick') return $('#vnFile').click();
    if (act === 'drop'){ if (!K.busy){ K.files = K.files.filter((_, i) => i !== k); render(); } return; }
    if (act === 'restart'){ K.session = newSession(); K.report = ''; K.actions = []; K.err = ''; return render(); }
    if (act === 'stop') return K.abort?.abort();
    if ((act === 'place' || act === 'run') && A.venue.type !== 'param' && !K.okNew){ K.pending = { act, k }; return render(); }
    if (act === 'oknew'){ const p = K.pending; K.pending = null; if (!p) return; window.PARC ? PARC.newVenue('Nouvel environnement') : 0; K.okNew = false; render(); const b = win.querySelector(p.act === 'run' ? '[data-v=run]' : `[data-v=place][data-k="${p.k}"]`); if (b && !b.disabled) b.click(); return; }
    if (act === 'nonew'){ K.pending = null; return render(); }
    if (act === 'place'){ const f = K.files[k], pg = +(win.querySelector(`[data-pg="${k}"]`)?.value || 1); if (!f) return;
      try { const { light, heavy } = await planFromFile(f, pg); ST.pushUndo(0, 'Poser un fond de plan'); applyPlan(light, heavy); openWin(false); ST.toast('Plan posé. Cale-le : échelle, puis zéro au nez de scène.'); calib(true); } catch (err){ K.err = err.message || 'Ce plan n\'a pas pu être posé.'; render(); } return; }
    if (act === 'run'){ const notes = $('#vnNotes').value; K.busy = true; K.err = ''; K.live = []; K.abort = new AbortController(); render();
      try { const r = await runBuild(notes, line => { K.live.push(line); render(); }); K.report = r.text; K.actions = r.actions; K.notes = ''; if ($('#vnNotes')) $('#vnNotes').value = ''; ST.toast(K.session.rounds > 1 || r.actions.length ? 'Lieu construit depuis le dossier. Un seul Ctrl+Z annule toute la passe.' : 'L\'IA a répondu sans modifier l’environnement.'); if (window.PLAN && A.venue.plan){ PLAN.toggle(true); PLAN.fit(); } }
      catch (err){ K.err = err && err.name === 'AbortError' ? 'Lecture interrompue. Ce qui était déjà construit reste en place (Ctrl+Z pour l\'annuler).' : (err && err.message) || 'La création a échoué.'; }
      finally { K.busy = false; K.abort = null; render(); } }
  });

  // ---------------------------------------------------------------- calage à la main : échelle, zéro, orientation
  const bar = document.createElement('div'); bar.id = 'calibBar'; document.body.appendChild(bar);
  const C = { on: false, step: '', pts: [], dist: 0 };
  const planPatch = (p, label) => { const pl = A.venue.plan; if (!pl) return; ST.pushUndo(0, label || 'Caler le plan'); setV({ plan: { ...pl, ...p } }); PLAN.draw(); };
  function calibRender(){
    const pl = A.venue.plan; if (!C.on || !pl){ bar.style.display = 'none'; if (window.PLAN){ PLAN.P.marks = null; PLAN.pick(null); } C.on = false; return; }
    bar.style.display = 'flex'; const b = A.planBounds(pl);
    bar.innerHTML = `<b>Caler le plan</b><span style="color:var(--mute)">${esc(pl.name.slice(0, 28))} · ${f2(b.x1 - b.x0)} × ${f2(b.z1 - b.z0)} m</span>
      <button class="b${C.step === 'scale' ? ' on' : ''}" data-c="scale" title="Clique deux points du plan dont tu connais la distance réelle (une cote, l'ouverture du cadre…)">1 · Échelle</button>
      <button class="b${C.step === 'zero' ? ' on' : ''}" data-c="zero" title="Clique le nez de scène, dans l'axe : il devient le zéro">2 · Zéro</button>
      <button class="b${C.step === 'align' ? ' on' : ''}" data-c="align" title="Clique deux points du nez de scène, de jardin vers cour : le plan tourne pour mettre le lointain en haut">3 · Aligner</button>
      <button class="b" data-c="l90" title="Quart de tour à gauche">↺</button><button class="b" data-c="r90" title="Quart de tour à droite">↻</button>
      ${C.step === 'dist' ? `<span>Distance réelle entre les deux points :</span><input type="number" id="calD" min="0.01" step="0.01" placeholder="m"> m <button class="b on" data-c="okd">OK</button>` : ''}
      <span style="flex:1"></span><button class="b on" data-c="done">Terminé</button>`;
    if (C.step === 'dist') setTimeout(() => $('#calD')?.focus(), 30);
  }
  function calibPick(){
    const hints = { scale: ['Échelle : clique le premier point', 'Échelle : clique le second point'], zero: ['Zéro : clique le nez de scène, dans l\'axe'], align: ['Aligner : clique le nez de scène côté jardin', 'Aligner : clique le nez de scène côté cour'] }[C.step];
    if (!hints){ PLAN.pick(null); return; }
    PLAN.P.marks = C.pts.map((p, k) => [p[0], p[1], String(k + 1)]);
    PLAN.pick(hints[C.pts.length], (x, z) => { C.pts.push([x, z]); const pl = A.venue.plan; if (!pl) return calib(false);
      if (C.step === 'zero'){ const [sx, sy] = A.planXf(pl).inv(x, z); planPatch({ ax: sx, ay: sy, calibrated: true }, 'Zéro du plan'); C.step = ''; C.pts = []; PLAN.P.marks = null; PLAN.pick(null); PLAN.fit(); PLAN.draw(); return calibRender(); }
      if (C.pts.length < 2) return calibPick();
      const [p, q] = C.pts;
      if (C.step === 'align'){ planPatch({ rot: pl.rot - Math.atan2(q[1] - p[1], q[0] - p[0]) }, 'Aligner le plan'); C.step = ''; C.pts = []; PLAN.P.marks = null; PLAN.pick(null); return calibRender(); }
      C.dist = Math.hypot(q[0] - p[0], q[1] - p[1]); PLAN.P.marks = C.pts.map((pt, k) => [pt[0], pt[1], String(k + 1)]); PLAN.pick(null); C.step = 'dist'; calibRender(); });
  }
  function calib(on){ if (on && !A.venue.plan) return ST.toast('Aucun plan posé dans ce projet.', true); C.on = on; C.step = ''; C.pts = []; if (on && window.PLAN){ PLAN.toggle(true); PLAN.setView('plan'); setTimeout(() => { PLAN.fit(); PLAN.draw(); }, 60); } calibRender(); }
  bar.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && e.target.id === 'calD') bar.querySelector('[data-c=okd]')?.click(); });
  bar.addEventListener('click', e => { const a = e.target.closest('[data-c]')?.dataset.c, pl = A.venue.plan; if (!a || !pl) return;
    if (a === 'done') return calib(false);
    if (a === 'l90' || a === 'r90'){ planPatch({ rot: pl.rot + (a === 'r90' ? 1 : -1) * Math.PI / 2 }, 'Tourner le plan'); PLAN.fit(); PLAN.draw(); return calibRender(); }
    if (a === 'okd'){ const d = parseFloat(String($('#calD').value).replace(',', '.')); if (!(d > 0) || !(C.dist > 1e-6)) return ST.toast('Donne la distance réelle, en mètres.', true); planPatch({ k: pl.k * d / C.dist, calibrated: true }, 'Échelle du plan'); C.step = ''; C.pts = []; PLAN.P.marks = null; PLAN.fit(); PLAN.draw(); return calibRender(); }
    C.step = C.step === a ? '' : a; C.pts = []; PLAN.P.marks = null; calibPick(); calibRender(); });

  // ---------------------------------------------------------------- calques et murs, perches une à une, faits retenus
  function layersDialog(){
    const pl = A.venue.plan, D = pl && A.PLANS.get(pl.id); if (!D || D.kind !== 'vec') return ST.toast(pl ? 'Ce plan est une image : il n\'a pas de calques. Les murs se règlent par les dimensions de l’environnement.' : 'Aucun plan posé.', true);
    const cnt = D.layers.map(() => 0); for (const q of D.polys) cnt[q.l] += q.p.length / 2 - 1; const hid = new Set(pl.hidden), wal = new Set(pl.walls), order = D.layers.map((n, i) => i).filter(i => cnt[i]).sort((a, b) => cnt[b] - cnt[a]);
    ST.modal(`<h1>Calques et murs du plan</h1><div class="sub">Coche « Mur » sur les calques qui dessinent les murs et cloisons : ils s'élèvent dans la vue 3D, arrêtent les faisceaux et apparaissent dans la coupe. Décoche « Visible » pour masquer cotes, hachures, mobilier.</div>
      <div style="max-height:46vh;overflow:auto"><table class="vtab"><thead><tr><th>Calque</th><th style="text-align:right">Traits</th><th>Visible</th><th>Mur</th></tr></thead><tbody>${order.map(i => `<tr><td>${esc(D.layers[i] || '(sans nom)')}</td><td class="mono" style="text-align:right">${cnt[i]}</td><td><input type="checkbox" data-lv="${i}" ${hid.has(D.layers[i]) ? '' : 'checked'}></td><td><input type="checkbox" data-lw="${i}" ${wal.has(D.layers[i]) ? 'checked' : ''}></td></tr>`).join('')}</tbody></table></div>
      <div class="pf" style="grid-template-columns:260px 110px;margin-top:10px"><label>Hauteur des murs (m)</label><input type="number" id="lyH" min="0.2" max="50" step="0.1" value="${pl.wallH}"></div>
      <label class="chk"><input type="checkbox" id="lyShell" ${A.venue.shell === false ? 'checked' : ''}> Les murs du plan remplacent la boîte simple, et l’environnement s'ajuste à eux</label>
      <div class="btns"><button class="b on" id="lyOk">Appliquer</button><button class="b" data-a="close">Annuler</button></div>`);
    $('#lyOk').onclick = () => { const m = $('#modal'), hidden = [], walls = []; m.querySelectorAll('[data-lv]').forEach(el => { if (!el.checked) hidden.push(D.layers[+el.dataset.lv]); }); m.querySelectorAll('[data-lw]').forEach(el => { if (el.checked) walls.push(D.layers[+el.dataset.lw]); });
      const light = { ...pl, hidden, walls, wallH: +$('#lyH').value || pl.wallH }, own = $('#lyShell').checked && walls.length; ST.pushUndo(0, 'Calques du plan'); setV({ ...(own ? fitToWalls(light, D) : { shell: undefined }), plan: light }); m.style.display = 'none'; ST.toast(walls.length ? `${walls.length} calque(s) élevés en murs.` : 'Calques mis à jour.'); };
  }
  function pipesDialog(){
    if (A.venue.type !== 'param') return; const v = A.venue;
    let rows = (v.pipes || A.PERCHES.filter(p => !p.off).map(p => ({ n: '', z: p.z, len: p.len, y: p.y }))).map(q => ({ n: q.n || '', d: r3(-q.z), len: r3(q.len), y: r3(q.y), x: r3(q.x || 0), c: q.c || 0, wll: q.wll || 0, wllPt: q.wllPt || 0, st: q.st || '', sec: q.sec, kgm: q.kgm, mot: q.mot || 0, mx: q.mx }));
    const draw = () => { ST.modal(`<h1>Perches</h1><div class="sub">Une ligne par perche, dans l'ordre de leur numéro. La distance se compte depuis le nez de scène vers le lointain (négative côté public, pour une porteuse de face). ${A.MAXP} perches au plus. Les charges admissibles se saisissent dans le plan de charge (touche K).</div>
        <div style="max-height:44vh;overflow:auto"><table class="vtab"><thead><tr><th style="width:34px">N°</th><th>Nom</th><th>Distance au nez (m)</th><th>Longueur (m)</th><th>Hauteur depuis le plateau (m)</th><th>Décalage axe (m)</th><th>Circuits</th><th>Moteurs</th><th>Structure</th><th></th></tr></thead><tbody>${rows.map((q, k) => `<tr><td class="mono">P${k + 1}</td><td><input type="text" data-pr="${k}" data-f="n" value="${esc(q.n)}"></td>${['d', 'len', 'y', 'x', 'c', 'mot'].map(f => `<td><input type="number" step="0.01" data-pr="${k}" data-f="${f}" value="${q[f]}"></td>`).join('')}<td><select data-pr="${k}" data-f="st" style="background:#1c1636;color:var(--ink);border:1px solid var(--line);border-radius:5px;padding:3px"><option value="">Tube</option><option value="truss"${q.st === 'truss' ? ' selected' : ''}>Pont</option></select></td><td><a data-pd="${k}" style="cursor:pointer;color:var(--mute)" title="Retirer cette perche">✕</a></td></tr>`).join('')}</tbody></table></div>
        <div class="btns"><button class="b" id="ppAdd">+ Une perche</button><span style="align-self:center;color:var(--mute)">Série :</span><input type="number" id="ppN" value="10" min="1" max="${A.MAXP}" title="Nombre" style="width:54px" class="inp"><input type="number" id="ppY" value="0.5" step="0.05" title="Distance de la première (m)" style="width:64px" class="inp"><input type="number" id="ppS" value="0.2" step="0.01" title="Pas entre deux perches (m)" style="width:64px" class="inp"><button class="b" id="ppSer" title="Ajoute une série : nombre, distance de la première, pas">+ Série</button></div>
        <div class="btns"><button class="b on" id="ppOk">Appliquer</button><button class="b" id="ppAuto" title="Revient à des perches réparties sur la profondeur du plateau">Répartition automatique</button><button class="b" data-a="close">Annuler</button></div>`);
      const m = $('#modal'); m.querySelectorAll('[data-pr]').forEach(el => el.onchange = () => { const q = rows[+el.dataset.pr], f = el.dataset.f; q[f] = f === 'n' || f === 'st' ? el.value : parseFloat(String(el.value).replace(',', '.')) || 0; });
      m.querySelectorAll('[data-pd]').forEach(el => el.onclick = () => { rows.splice(+el.dataset.pd, 1); draw(); });
      const last = () => rows[rows.length - 1] || { d: 0, len: v.percheLen, y: v.percheY, x: 0, c: 0, mot: 0, st: '' };
      $('#ppAdd').onclick = () => { if (rows.length >= A.MAXP) return ST.toast(`${A.MAXP} perches au plus.`, true); const l = last(); rows.push({ n: '', d: r3(l.d + .2), len: l.len, y: l.y, x: l.x, c: 0, mot: l.mot || 0, st: l.st || '', sec: l.sec, kgm: l.kgm }); draw(); };
      $('#ppSer').onclick = () => { const n = Math.max(1, Math.round(+$('#ppN').value || 0)), y0 = +$('#ppY').value || 0, st = +$('#ppS').value || .2, l = last(); for (let k = 0; k < n && rows.length < A.MAXP; k++) rows.push({ n: '', d: r3(y0 + k * st), len: l.len, y: l.y, x: 0, c: 0, mot: l.mot || 0, st: l.st || '', sec: l.sec, kgm: l.kgm }); draw(); };
      $('#ppOk').onclick = () => { if (!rows.length) return ST.toast('Il faut au moins une perche.', true); ST.pushUndo(0, 'Perches'); setV({ pipes: rows.map(q => ({ n: q.n, z: -q.d, len: q.len, y: q.y, ...(q.x ? { x: q.x } : {}), c: q.c, wll: q.wll, wllPt: q.wllPt, st: q.st, sec: q.sec, kgm: q.kgm, mot: q.mot, ...(q.mx && q.mx.length === q.mot ? { mx: q.mx } : {}) })) }); m.style.display = 'none'; };
      $('#ppAuto').onclick = () => { ST.pushUndo(0, 'Perches'); setV({ pipes: undefined, noPipes: undefined }); m.style.display = 'none'; }; };
    draw();
  }
  function factsDialog(){ const v = A.venue; ST.modal(`<h1>Ce qui a été retenu pour cet environnement</h1><div class="sub">Chaque valeur porte sa source et sa confiance : « lu » (écrit dans un document), « déduit » (mesuré ou calculé), « supposé » (valeur d'usage, à vérifier).</div>${factsHtml(v) || '<div class="info">Rien n\'a encore été noté.</div>'}${v.notes ? `<div class="info"><b>Tes consignes</b><br>${esc(v.notes).replace(/\n/g, '<br>')}</div>` : ''}<div class="btns"><button class="b" data-a="close">Fermer</button></div>`); }
  function ui(a){
    if (a === 'parc') return window.PARC?.open(true); if (a === 'create') return openWin(true); if (a === 'calib') return calib(!C.on); if (a === 'layers') return layersDialog(); if (a === 'pipes') return pipesDialog(); if (a === 'facts') return factsDialog();
    if (a === 'unplan'){ if (!A.venue.plan) return; calib(false); ST.pushUndo(0, 'Retirer le plan'); setV({ plan: undefined }); ST.toast('Plan retiré (Ctrl+Z pour le remettre).'); }
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && K.open && !K.busy){ e.stopPropagation(); openWin(false); } else if (e.key === 'Escape' && C.on) calib(false); }, true);

  window.VENUE = { ui, open: openWin, K, tool, runBuild, mcpTools, mcpRun, isTool, planData, restore, readFile, addFiles, planFromFile, applyPlan, digestCad, calib, BUILD_TOOLS, SYSTEM, roomState, fitToWalls, aiMode, C };
  restore();
}
