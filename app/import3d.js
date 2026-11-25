// Import de modèles 3D (.obj avec son .mtl, .glb, .stl) : le modèle devient un type de la bibliothèque (« Importés »), gardé DANS le projet.
// Rien n'est deviné : un .obj ou un .stl ne dit pas son unité — on la demande, en montrant les dimensions que donnerait chaque choix.
// Un .glb est en mètres et Y vers le haut par sa norme. Le poids d'un modèle importé est inconnu tant qu'on ne le saisit pas.
// Le modèle est gardé sous forme compacte : ses triangles, rangés par couleur de matière, en entiers 16 bits dans sa boîte englobante.
export function initImport3d(A, ST){
  const THREE = A.THREE, S = ST.S, f = (v, d = 2) => (+v).toFixed(d).replace('.', ','), $ = s => document.querySelector(s);
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); }, unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const UNITS = { m: ['mètres', 1], cm: ['centimètres', .01], mm: ['millimètres', .001], in: ['pouces', .0254] }, MAXTRI = 400000;

  // ---------------------------------------------------------------- lire le fichier → triangles par couleur, dans les coordonnées du fichier
  async function read(file, all){ const ext = file.name.split('.').pop().toLowerCase(), buf = await file.arrayBuffer(); let root, notes = [];
    if (ext === 'obj'){ const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js'), ld = new OBJLoader(), txt = new TextDecoder().decode(buf), want = (txt.match(/^\s*mtllib\s+(.+)$/m) || [])[1]?.trim();
      const mtl = (all || []).find(x => /\.mtl$/i.test(x.name) && (!want || x.name.toLowerCase() === want.toLowerCase())) || (all || []).find(x => /\.mtl$/i.test(x.name));
      if (mtl){ const { MTLLoader } = await import('three/addons/loaders/MTLLoader.js'), mats = new MTLLoader().parse(await mtl.text(), ''); mats.preload(); ld.setMaterials(mats); notes.push('couleurs lues dans ' + mtl.name); }
      else notes.push(want ? `le fichier de matières « ${want} » n'a pas été fourni : couleur neutre` : 'pas de fichier .mtl : couleur neutre');
      root = ld.parse(txt); }
    else if (ext === 'glb'){ const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'); const g = await new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, e => rej(new Error('lecture du .glb impossible (' + (e?.message || e) + ') — les .glb compressés Draco ou Meshopt ne sont pas pris en charge')))); root = g.scene; }
    else if (ext === 'stl'){ const { STLLoader } = await import('three/addons/loaders/STLLoader.js'); root = new THREE.Mesh(new STLLoader().parse(buf), new THREE.MeshStandardMaterial({ color: 0xb9bec8 })); notes.push('un .stl n\'a pas de couleur : couleur neutre'); }
    else throw new Error('format non pris en charge');
    root.updateMatrixWorld(true); const G = new Map(), v = new THREE.Vector3(), bx = new THREE.Box3(); let tri = 0, tex = false;
    root.traverse(m => { if (!m.isMesh || !m.geometry?.attributes?.position) return; const g = m.geometry, pos = g.attributes.position, idx = g.index, mats = Array.isArray(m.material) ? m.material : [m.material], grs = g.groups && g.groups.length && mats.length > 1 ? g.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];
      for (const gr of grs){ const mt = mats[gr.materialIndex] || mats[0]; if (mt?.map) tex = true; const col = '#' + (mt?.color ? mt.color.getHexString() : 'b9bec8'), arr = G.get(col) || (G.set(col, []), G.get(col)), end = Math.min(gr.start + gr.count, idx ? idx.count : pos.count);
        for (let i = gr.start; i + 2 < end; i += 3){ for (let k = 0; k < 3; k++){ v.fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(m.matrixWorld); arr.push(v.x, v.y, v.z); bx.expandByPoint(v); } tri++; } } });
    if (!tri) throw new Error('aucun triangle dans ce fichier');
    if (tri > MAXTRI) throw new Error(`${tri.toLocaleString('fr')} triangles : c'est trop pour être gardé dans un projet (limite ${MAXTRI.toLocaleString('fr')}). Allège le modèle avant de l'importer.`);
    if (tex) notes.push('les images de texture ne sont pas reprises, seulement la couleur de chaque matière');
    return { ext, name: file.name.replace(/\.[^.]+$/, ''), file: file.name, G, tri, box: bx, notes }; }

  // ---------------------------------------------------------------- mettre à l'échelle, redresser, poser sur sa base, compacter
  function pack(R, unit, up){ const k = UNITS[unit][1], zup = up === 'z', T = (x, y, z) => zup ? [x * k, z * k, -y * k] : [x * k, y * k, z * k], bx = new THREE.Box3(), p = new THREE.Vector3();
    for (const arr of R.G.values()) for (let i = 0; i < arr.length; i += 3){ const q = T(arr[i], arr[i + 1], arr[i + 2]); bx.expandByPoint(p.set(q[0], q[1], q[2])); }
    const sz = bx.getSize(new THREE.Vector3()), mn = bx.min, r4 = v => Math.round(v * 1e4) / 1e4, groups = [];
    for (const [col, arr] of R.G){ const q = new Uint16Array(arr.length); for (let i = 0; i < arr.length; i += 3){ const t = T(arr[i], arr[i + 1], arr[i + 2]); q[i] = Math.round((t[0] - mn.x) / (sz.x || 1) * 65535); q[i + 1] = Math.round((t[1] - mn.y) / (sz.y || 1) * 65535); q[i + 2] = Math.round((t[2] - mn.z) / (sz.z || 1) * 65535); } groups.push({ col, n: arr.length / 9, q: b64(new Uint8Array(q.buffer)) }); }
    return { v: 1, box: [r4(sz.x), r4(sz.y), r4(sz.z)], tri: R.tri, groups, src: { file: R.file, fmt: R.ext, unit, up } }; }
  const dims = (R, unit, up) => { const s = R.box.getSize(new THREE.Vector3()).multiplyScalar(UNITS[unit][1]); return up === 'z' ? [s.x, s.y, s.z] : [s.x, s.z, s.y]; };          // largeur, profondeur, hauteur

  // ---------------------------------------------------------------- le maillage d'un type importé (une géométrie par type, partagée)
  const GC = new Map();
  function geos(t){ const hit = GC.get(t.id); if (hit && hit.m === t.model) return hit.L; const M = t.model, [sx, sy, sz] = M.box, L = [];
    for (const g of M.groups){ const u8 = unb64(g.q), q = new Uint16Array(u8.buffer, 0, u8.length >> 1), pos = new Float32Array(q.length); for (let i = 0; i < q.length; i += 3){ pos[i] = (q[i] / 65535 - .5) * sx; pos[i + 1] = q[i + 1] / 65535 * sy; pos[i + 2] = (q[i + 2] / 65535 - .5) * sz; }
      let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.computeVertexNormals(); L.push({ geo, col: g.col }); }
    GC.set(t.id, { m: M, L }); return L; }
  function mesh(t, o){ const grp = new THREE.Group(), k = Math.max(.001, +o.sc || 1); if (!t.model) return grp; for (const { geo, col } of geos(t)) grp.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: .78, metalness: .03, side: THREE.DoubleSide, flatShading: true }))); grp.scale.setScalar(k); return grp; }

  // ---------------------------------------------------------------- la fenêtre d'import : unité et axe du haut
  function ask(R){ return new Promise(res => { const fixed = R.ext === 'glb', st = { unit: fixed ? 'm' : null, up: R.ext === 'stl' ? null : 'y' };
    const row = (u) => { const d = dims(R, u, st.up || 'y'); return `<label style="display:flex;gap:8px;align-items:center;padding:5px 8px;border:1px solid var(--line,#2c313b);border-radius:6px;cursor:pointer"><input type="radio" name="i3u" value="${u}"${st.unit === u ? ' checked' : ''}> <span style="flex:1">en <b>${UNITS[u][0]}</b></span><span class="mono">${f(d[0])} × ${f(d[1])} × ${f(d[2])} m</span></label>`; };
    const draw = () => { ST.modal(`<h1>Importer « ${ST.esc(R.file)} »</h1><div class="sub">${R.tri.toLocaleString('fr')} triangles · ${R.G.size} couleur${R.G.size > 1 ? 's' : ''} de matière${R.notes.length ? ' · ' + ST.esc(R.notes.join(' · ')) : ''}</div>
      ${fixed ? `<div class="sub" style="margin-top:10px">Un .glb est en mètres, le haut vers Y (c'est sa norme) : <b>${dims(R, 'm', 'y').map(v => f(v)).join(' × ')} m</b> (largeur × profondeur × hauteur).</div>` : `
      <div style="margin-top:12px"><b>Où est le haut du modèle ?</b><div style="display:flex;gap:8px;margin-top:6px">${[['y', 'Axe Y (habituel pour un .obj)'], ['z', 'Axe Z (CAO, SketchUp, impression 3D)']].map(([k, l]) => `<label style="flex:1;display:flex;gap:8px;align-items:center;padding:5px 8px;border:1px solid var(--line,#2c313b);border-radius:6px;cursor:pointer"><input type="radio" name="i3up" value="${k}"${st.up === k ? ' checked' : ''}> ${l}</label>`).join('')}</div></div>
      <div style="margin-top:12px"><b>Dans quelle unité est-il dessiné ?</b> <span class="sub">Le fichier ne le dit pas. Voici sa taille (largeur × profondeur × hauteur) selon l'unité : choisis celle qui est juste.</span><div style="display:grid;gap:5px;margin-top:6px">${Object.keys(UNITS).map(row).join('')}</div></div>`}
      <div class="sub" style="margin-top:10px">Poids : inconnu (à saisir dans la fiche de l'objet si tu veux qu'il compte dans les charges). Le modèle est enregistré dans le projet.</div>
      <div class="row" style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end"><button class="btn" data-i3="no">Annuler</button><button class="btn primary" data-i3="ok"${st.unit && st.up ? '' : ' disabled'}>Importer</button></div>`); };
    const onCh = e => { if (e.target.name === 'i3u'){ st.unit = e.target.value; draw(); } else if (e.target.name === 'i3up'){ st.up = e.target.value; draw(); } };
    const done = v => { document.removeEventListener('change', onCh, true); document.removeEventListener('click', onCl, true); $('#modal').style.display = 'none'; res(v); };
    const onCl = e => { const b = e.target.closest?.('[data-i3]'); if (!b) return; e.stopPropagation(); if (b.dataset.i3 === 'ok'){ if (st.unit && st.up) done(st); } else done(null); };
    document.addEventListener('change', onCh, true); document.addEventListener('click', onCl, true); ASK.cur = { st, done, draw }; draw(); }); }
  const ASK = { cur: null };

  // importer un fichier : rend le type créé, ou null si on a annulé. opt = { unit, up } évite la fenêtre (essais, connecteur)
  async function importFile(file, all, opt){ const R = await read(file, all), st = opt || await ask(R); ASK.cur = null; if (!st) return null; const model = pack(R, st.unit, st.up), [sx, sy, sz] = model.box;
    const t = ST.addType({ id: 'imp-' + ST.uid(), cat: 'str', kind: 'mesh3d', grp: 'Modèles importés', name: R.name, size: [sx, sz, sy], fp: [sx, sz], w: 0, noW: true, p: 0, noP: true, model });
    const o = ST.place(t.id, { point: new THREE.Vector3(0, 0, 0), object: { userData: {} }, face: null }, true, {}); if (o) setTimeout(() => ST.select([o.id]), 0);
    ST.toast(`« ${R.name} » importé : ${f(sx)} × ${f(sz)} × ${f(sy)} m (largeur × profondeur × hauteur), ${R.tri.toLocaleString('fr')} triangles. Posé au centre, poids inconnu.${ST.serialize().length > 4.5e6 ? ' Le projet devient trop lourd pour la sauvegarde automatique du navigateur : enregistre-le en fichier.' : ''}`, ST.serialize().length > 4.5e6); return t; }

  window.IMPORT3D = { importFile, mesh, read, pack, dims, get asking(){ return ASK.cur; }, UNITS };
  // les objets importés d'un projet ouvert avant que ce module soit prêt : on les reconstruit
  for (const o of S.objs){ const t = ST.typeOf(o); if (t && t.kind === 'mesh3d'){ ST.unbuild(o.id); ST.build(o); } } ST.touch(true); ST.render();
}
