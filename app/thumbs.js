// Vignettes 3D de la bibliothèque : chaque type est construit une fois avec le même constructeur que la scène, photographié hors écran, puis retiré.
// Les images sont posées dans les <img data-th="identifiant du type"> à mesure qu'elles sont prêtes ; rien n'est redessiné autour.
export function initThumbs(A, ST){
  const THREE = A.THREE, cache = new Map(), queue = [], wait = new Set(); let gl = null, busy = false, failed = false;
  const css = document.createElement('style'); css.textContent = '.lib button.th{display:flex;align-items:center;gap:9px} .lib button.th img{width:46px;height:46px;object-fit:contain;flex:none;border-radius:6px;background:rgba(255,255,255,.045)} .lib button.th img:not([src]){visibility:hidden} .lib button.th>span{display:flex;flex-direction:column;min-width:0;gap:1px} #libFiche a{color:#8fb7ff} #libFiche{display:grid;grid-template-columns:minmax(0,1fr) 170px;column-gap:16px;align-items:start} #libFiche>*{grid-column:1} #libFiche>img.big{grid-column:2;grid-row:1 / span 30;width:170px;height:170px;object-fit:contain;border-radius:10px;background:rgba(255,255,255,.045)} #libFiche .big:not([src]){visibility:hidden}'; document.head.appendChild(css);
  function setup(){ if (gl || failed) return gl; try { const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setClearColor(0x000000, 0); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
      const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x4a4e58, 1.9)); const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.position.set(2.2, 4, 3); scene.add(sun); const fill = new THREE.DirectionalLight(0xbfd0ff, .9); fill.position.set(-3, 1.5, -2); scene.add(fill);
      const holder = new THREE.Group(); scene.add(holder); gl = { r, scene, holder, cam: new THREE.PerspectiveCamera(28, 1, .01, 100) }; } catch (e){ failed = true; } return gl; }
  function shoot(id, px){ const g = setup(), t = ST.LIBALL().find(x => x.id === id) || ST.S.lib.find(x => x.id === id); if (!g || !t) return '';
    if (t.kind === 'sprop') return window.DECOR ? window.DECOR.thumb(t.key) : '';
    const o = { id: '__th' + Math.random().toString(36).slice(2), type: id, pos: [0, 0, 0], yaw: 0, pan: 0, tilt: t.mover ? 35 : 0, dim: 0 }; if (t.size) o.size = [...t.size]; if (t.len) o.len = t.len; let url = '';
    try { const r = ST.build(o), root = r.root, par = root.parent; g.holder.add(root); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.updateWorldMatrix(true, true);
      const hid = []; root.traverse(m => { if (m.visible && ((m.material && m.material.isShaderMaterial) || m.isLine || m.isSprite || m.isLight)){ m.visible = false; hid.push(m); } });
      const box = new THREE.Box3().setFromObject(root, true); if (box.isEmpty()) box.set(new THREE.Vector3(-.2, -.2, -.2), new THREE.Vector3(.2, .2, .2));
      const c = box.getCenter(new THREE.Vector3()), rad = Math.max(.02, box.getSize(new THREE.Vector3()).length() / 2), dist = rad / Math.sin(14 * Math.PI / 180) * 1.04;
      g.cam.position.set(c.x + dist * .62, c.y + dist * .4, c.z + dist * .68); g.cam.lookAt(c); g.cam.near = dist / 60; g.cam.far = dist * 4; g.cam.updateProjectionMatrix();
      g.r.setSize(px, px, false); g.r.render(g.scene, g.cam); url = g.r.domElement.toDataURL('image/png'); hid.forEach(m => m.visible = true); g.holder.remove(root); if (par) par.add(root);
    } catch (e){ url = ''; } try { ST.unbuild(o.id); } catch (_){ } return url; }
  const key = (id, big) => id + (big ? '|g' : '');
  function paint(k, url){ if (!url) return; for (const im of document.querySelectorAll('img[data-th]')) if (key(im.dataset.th, im.dataset.big) === k && im.getAttribute('src') !== url) im.src = url; }
  function pump(){ if (busy) return; busy = true; const step = () => { const k = queue.shift(); if (k == null){ busy = false; return; } wait.delete(k); const [id, big] = k.split('|'), url = shoot(id, big ? 380 : 112); if (url){ cache.set(k, url); paint(k, url); } else if (ST.typeOf({ type: id }).kind === 'sprop' && !window.DECOR?.ready) setTimeout(() => { if (!wait.has(k)){ wait.add(k); queue.push(k); pump(); } }, 1500); setTimeout(step, 12); }; setTimeout(step, 0); }
  function scan(){ let n = 0; for (const im of document.querySelectorAll('img[data-th]')){ if (!im.offsetParent && !im.closest('#modal')) continue; const k = key(im.dataset.th, im.dataset.big), u = cache.get(k); if (u){ if (im.getAttribute('src') !== u) im.src = u; } else if (!wait.has(k)){ wait.add(k); if (im.dataset.big) queue.unshift(k); else queue.push(k); n++; } } if (n) pump(); }
  let tm = 0; const later = () => { if (!tm) tm = setTimeout(() => { tm = 0; scan(); }, 140); }; new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); later();
  window.THUMBS = { scan, cache, drop: id => { cache.delete(id); cache.delete(id + '|g'); later(); }, shoot };
}
