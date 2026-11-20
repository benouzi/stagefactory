// Décor, mobilier, instruments et personnages de ScenoFactory (54 modèles détaillés, 19 personnages MakeHuman CC0).
// Le gros fichier des modèles (sceno-props.js) n'est lu qu'au besoin : à l'ouverture de la bibliothèque Décor, ou si le projet en contient.
export function initDecor(A, ST){
  const S = ST.S, D = { ready: false, loading: null, M: null, thumbs: new Map() };
  const isDec = o => ST.typeOf(o).kind === 'sprop';
  const rebuild = only => { for (const o of S.objs) if (isDec(o) && (!only || only(o))){ ST.unbuild(o.id); ST.build(o); } ST.touch(true); ST.select(ST.UI.sel.filter(id => ST.RT.has(id))); };
  D.load = () => D.loading || (D.loading = import('./sceno-props.js').then(m => { D.M = m; D.ready = true; rebuild(); ST.render(); return m; }).catch(e => { console.error(e); D.loading = null; ST.toast('Les modèles de décor n\'ont pas pu être lus.', true); }));
  D.build = (key, w, h, d, tint) => { const def = D.M && D.M.PROP_BY_KEY[key]; if (!def) return null; const g = D.M.buildProp(def, w, h, d, tint || undefined); g.traverse(m => { if (m.isMesh){ m.castShadow = true; m.receiveShadow = true; } }); return g; };
  D.isPerson = key => !!(D.M && D.M.isPerson(key));
  D.thumb = key => { if (!D.M) return ''; const def = D.M.PROP_BY_KEY[key]; if (!def) return ''; let u = D.thumbs.get(key); if (!u){ try { u = D.M.propThumb(def); } catch (_){ u = ''; } if (u) D.thumbs.set(key, u); } return u || ''; };
  D.tints = () => D.M ? D.M.TINTS : [];
  let t = 0; addEventListener('sf:people', () => { clearTimeout(t); t = setTimeout(() => { rebuild(o => D.isPerson(ST.typeOf(o).key)); ST.render(); }, 150); });
  const css = document.createElement('style'); css.textContent = '.lib.dec{grid-template-columns:repeat(auto-fill,minmax(104px,1fr))!important} .lib.dec button{display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px} .lib.dec img,.lib.dec .ph{width:70px;height:70px;object-fit:contain;display:block}'; document.head.appendChild(css);
  window.DECOR = D; if (S.objs.some(isDec)) D.load();
}
