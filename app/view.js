// Réglages de la vue 3D, dans un petit menu posé sur la vue : couleur du fond, grille de repère sans fin.
export function initView(A, ST){
  const T = A.THREE, $ = s => document.querySelector(s), FOG = A.scene.fog;
  const DEF = { bg: '#101216', grid: true, step: 1, col: '#8a93a3', op: .55, level: 'plateau', axes: true, hideLive: true };
  const V = { ...DEF, ...A.store.get('view3d', {}) }, FOG0 = FOG ? '#' + FOG.color.getHexString() : null;
  // grille : un seul grand plan, les traits sont calculés au pixel près (nets à toute distance) et s'effacent au loin
  const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, extensions: { derivatives: true },
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6,          // la grille passe toujours devant le sol qu'elle frôle : plus de clignotement au loin
    uniforms: { uCol: { value: new T.Color(V.col) }, uOp: { value: V.op }, uStep: { value: V.step }, uAxes: { value: 1 }, uFar: { value: 160 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; uniform vec3 uCol; uniform float uOp, uStep, uAxes, uFar;
      float grid(vec2 p, float s){ vec2 c = p / s, w = fwidth(c), g = abs(fract(c - .5) - .5) / w; return (1. - min(min(g.x, g.y), 1.)) * (1. - smoothstep(.22, .6, max(w.x, w.y))); }          // au loin, quand une maille approche le pixel, la ligne s'efface au lieu de scintiller
      void main(){ vec2 p = vW.xz; float d = distance(cameraPosition, vW), fade = 1. - smoothstep(uFar * .35, uFar, d);
        float a = grid(p, uStep) * .45 * (1. - smoothstep(uFar * .12, uFar * .45, d)) + grid(p, uStep * 5.) * .85; vec3 col = uCol;
        vec2 ax = abs(p) / fwidth(p); if (uAxes > .5){ float ax1 = 1. - min(ax.y / 1.6, 1.), ax2 = 1. - min(ax.x / 1.6, 1.); if (ax1 > 0.){ col = mix(col, vec3(1., .32, .3), ax1); a = max(a, ax1); } if (ax2 > 0.){ col = mix(col, vec3(.25, .9, .75), ax2); a = max(a, ax2); } }
        a *= fade * uOp; if (a < .004) discard; gl_FragColor = vec4(col, a); }` });
  const plane = new T.Mesh(new T.PlaneGeometry(4000, 4000), mat); plane.rotation.x = -Math.PI / 2; plane.renderOrder = -1; plane.frustumCulled = false; plane.userData.viewGrid = true; A.scene.add(plane);
  function apply(){
    A.scene.background = new T.Color(V.bg); if (FOG) FOG.color.set(V.bg === DEF.bg ? FOG0 : V.bg);
    mat.uniforms.uCol.value.set(V.col); mat.uniforms.uOp.value = V.op; mat.uniforms.uStep.value = V.step; mat.uniforms.uAxes.value = V.axes ? 1 : 0;
    plane.position.y = (V.level === 'sol' ? A.venueBounds().floor : 0) + (A.venue.open ? .006 : -.004);          // espace vide : la grille passe au-dessus du sol nu A.store.set('view3d', V); 
  }
  A.hooks.update.push(() => { plane.visible = V.grid && !(V.hideLive && A.live) && !document.body.classList.contains('cine'); if (plane.visible) plane.position.y = (V.level === 'sol' ? A.venueBounds().floor : 0) + (A.venue.open ? .006 : -.004); });
  // ---- points de vue : en perspective (on garde la souris et les outils habituels), dessus et côté en vraie vue à plat
  const CAM = { id: '', fov: 65 }, NEAR0 = FOG ? FOG.near : 60, FAR0 = FOG ? FOG.far : 140;
  const VIEWS = [['persp', 'Perspective', 'Vue d\'ensemble en perspective'], ['iso', 'Isométrique', 'Vue de trois quarts sans fuyantes, côté cour'], ['iso2', 'Iso. jardin', 'Vue de trois quarts sans fuyantes, côté jardin'], ['top', 'Dessus', 'Vue de dessus à plat'], ['side', 'Côté', 'Vue de côté à plat (coupe)'],
    ['face', 'Depuis le public', 'Du fond du public vers la scène'], ['back', 'Depuis le lointain', 'Du fond de scène vers le public'], ['jar', 'Depuis jardin', 'Du mur jardin vers cour, au plateau'], ['cour', 'Depuis cour', 'Du mur cour vers jardin, au plateau']];
  function setFov(f){ CAM.fov = Math.max(8, Math.min(100, +f)); A.persp.fov = CAM.fov; A.persp.updateProjectionMatrix(); }
  function goView(id){
    const B = A.venueBounds(), P = A.persp, cz = (B.z0 + B.z1) / 2, cy = (B.h + B.floor) / 2, R = .5 * Math.hypot(2 * B.hw, B.z1 - B.z0, B.h - B.floor); CAM.id = id;
    if (id === 'top' || id === 'side'){ setFov(65); return A.setMode(id); }
    A.setMode('orbit'); let pos, tgt, fov = 65; const eye = Math.max(1.7, B.h * .3), sd = Math.min(6, -B.z0 - 1.5) / 2;
    if (id === 'iso' || id === 'iso2'){ fov = 14; const d = R / Math.tan(fov * Math.PI / 360) * 1.02, k = d / Math.sqrt(3); pos = [(id === 'iso' ? 1 : -1) * k, cy + k, cz + k]; tgt = [0, cy, cz]; }
    else if (id === 'face'){ pos = [0, B.floor + eye + 1.2, B.z1 - 1.2]; tgt = [0, 1.5, -sd]; }
    else if (id === 'back'){ pos = [0, 2.2, B.z0 + 1]; tgt = [0, 1.5, B.z1 * .4]; }
    else if (id === 'jar' || id === 'cour'){ const sx = id === 'jar' ? -1 : 1; pos = [sx * (B.hw - .8), 2.6, -sd]; tgt = [-sx * B.hw, 1.4, -sd]; }
    else { pos = [B.hw * 1.9, B.h * 1.6 + 12, B.z1 + 9]; tgt = [0, 1, cz * .8]; }
    setFov(fov); const d = Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]); P.far = Math.max(220, d * 3); P.updateProjectionMatrix();
    if (FOG){ FOG.near = Math.max(NEAR0, d * 1.3); FOG.far = Math.max(FAR0, d * 3); }
    P.position.set(...pos); A.orbit.target.set(...tgt); A.orbit.update();
  }
  // ---- le petit menu, sur la vue
  const css = document.createElement('style'); css.textContent = `
  #vwPop{position:fixed;left:276px;bottom:70px;z-index:12;width:250px;display:none;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12px;box-shadow:0 12px 34px rgba(0,0,0,.55)} body.desk #vwPop{bottom:calc(var(--dh,310px) + 70px)}
  #vwPop h3{margin:2px 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#b9a8ff} #vwPop .r{display:flex;align-items:center;gap:8px;margin:5px 0} #vwPop .r label{flex:1;color:var(--mute)}
  #vwPop .vsw{display:flex;gap:5px;flex-wrap:wrap;margin:4px 0 8px} #vwPop .vsw i{flex:0 0 24px;width:24px;height:24px;display:block;border-radius:6px;border:1px solid rgba(255,255,255,.25);cursor:pointer} #vwPop .vsw i.on{outline:2px solid #f2a93b;outline-offset:1px}
  #vwPop input[type=color]{width:34px;height:24px;padding:0;border:1px solid var(--line);border-radius:6px;background:none} #vwPop select{background:#1c1636;color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:3px 5px;font:12px Inter,sans-serif}
  #vwPop input[type=range]{width:110px;accent-color:var(--accent2)} #vwPop .vv{display:flex;flex-wrap:wrap;gap:4px} #vwPop .vv .b{padding:4px 8px;font-size:11.5px}
  #vwPop{width:270px;max-height:calc(100vh - 130px);overflow:auto}`; document.head.appendChild(css);
  // barre en haut de la vue 3D, sur le modèle de celle du plan technique : points de vue, grille, fond
  const bar = document.createElement('div'); bar.id = 'v3Bar'; document.body.appendChild(bar);
  { const c2 = document.createElement('style'); c2.textContent = `
  #v3Bar{position:fixed;top:50px;left:var(--vx,0px);width:var(--vw,100vw);z-index:5;box-sizing:border-box;display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--panel);border-bottom:1px solid var(--line);color:var(--ink);font-size:12px;white-space:nowrap;overflow-x:auto;scrollbar-width:none}
  #v3Bar b{font-weight:600;margin-right:4px} #v3Bar .pv{flex:none;display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden} #v3Bar .pv a{padding:3px 9px;cursor:pointer;color:var(--mute)} #v3Bar .pv a:hover{color:var(--ink)} #v3Bar .pv a.on{background:var(--accent);color:var(--onacc,#0b0916);font-weight:600}
  #v3Bar select{flex:none;background:var(--bg,#15171c);color:var(--ink);border:1px solid var(--line);border-radius:7px;padding:3px 6px;font:inherit;max-width:170px} #v3Bar .b{padding:3px 9px;font-size:11.5px;flex:none} #v3Bar .sp{flex:1}
  body.planfull #v3Bar,body.cine #v3Bar{display:none!important} #vwPop{top:92px!important;bottom:auto!important;left:auto!important;right:calc(var(--vr,0px) + 12px)!important} #help{top:98px!important}`; document.head.appendChild(c2); }
  function barRender(){ bar.innerHTML = `<b>Vue 3D</b><select id="v3Cam" title="Point de vue de la caméra">${VIEWS.some(v => v[0] === CAM.id) ? '' : '<option value="" selected>Vue libre</option>'}${VIEWS.map(([id, l, t]) => `<option value="${id}" title="${t}"${CAM.id === id ? ' selected' : ''}>${l}</option>`).join('')}</select><span class="sp"></span><button class="b" data-rd="1" title="Faire une image de la vue : image propre calculée ici, ou rendu retravaillé par IA">📷 Rendu…</button><button class="b${V.grid ? ' on' : ''}" data-vg="1" title="Afficher ou masquer la grille de repère">▦ Grille</button><button class="b" id="vwBtn" title="Couleur du fond, pas et couleur de la grille, axes, angle de champ">Fond et grille…</button>`; }
  bar.addEventListener('change', e => { if (e.target.id === 'v3Cam' && e.target.value){ goView(e.target.value); e.target.blur(); barRender(); } });
  bar.addEventListener('click', e => { if (e.target.closest('[data-rd]')){ if (window.RENDU) RENDU.open(); return; } if (e.target.closest('[data-vg]')){ V.grid = !V.grid; apply(); barRender(); if (pop.style.display === 'block') render(); return; } if (e.target.closest('#vwBtn')){ e.stopPropagation(); open(); } });
  const btn = bar;
  const pop = document.createElement('div'); pop.id = 'vwPop'; document.body.appendChild(pop);
  const SW = [['#0d0a1c', 'Nuit (d\'origine)'], ['#000000', 'Noir'], ['#23252b', 'Gris foncé'], ['#5d6068', 'Gris moyen'], ['#c9ccd3', 'Gris clair'], ['#ffffff', 'Blanc'], ['#16324a', 'Bleu']];
  function render(){ pop.innerHTML = `<h3>Point de vue</h3><div class="vv">${VIEWS.map(([id, l, t]) => `<button class="b${CAM.id === id ? ' on' : ''}" data-cam="${id}" title="${t}">${l}</button>`).join('')}</div>
    <div class="r"><label>Angle de champ</label><input type="range" data-fov="1" min="8" max="100" step="1" value="${Math.round(A.persp.fov)}"><span id="vwFov" style="width:30px;text-align:right">${Math.round(A.persp.fov)}°</span></div>
    <h3 style="margin-top:10px">Fond</h3><div class="vsw">${SW.map(([c, n]) => `<i data-bg="${c}" title="${n}" style="background:${c}" class="${V.bg.toLowerCase() === c ? 'on' : ''}"></i>`).join('')}<input type="color" data-k="bg" value="${V.bg}" title="Autre couleur"></div>
    <h3>Grille de repère</h3><label class="chk"><input type="checkbox" data-k="grid" ${V.grid ? 'checked' : ''}> Afficher la grille (sans fin)</label>
    <div class="r"><label>Pas</label><select data-k="step">${[[.5, '0,5 m (gras tous les 2,5 m)'], [1, '1 m (gras tous les 5 m)'], [2, '2 m (gras tous les 10 m)']].map(([v, l]) => `<option value="${v}"${+V.step === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="r"><label>Niveau</label><select data-k="level"><option value="plateau"${V.level === 'plateau' ? ' selected' : ''}>Plateau (0,00)</option><option value="sol"${V.level === 'sol' ? ' selected' : ''}>Sol le plus bas de l’environnement</option></select></div>
    <div class="r"><label>Couleur</label><input type="color" data-k="col" value="${V.col}"></div>
    <div class="r"><label>Intensité</label><input type="range" data-k="op" min="0.1" max="1" step="0.05" value="${V.op}"></div>
    <label class="chk"><input type="checkbox" data-k="axes" ${V.axes ? 'checked' : ''}> Axes : nez de scène (rouge), axe (vert)</label>
    <label class="chk"><input type="checkbox" data-k="hideLive" ${V.hideLive ? 'checked' : ''}> Masquer en mode spectacle</label>
    <div class="btns"><button class="b" data-vr="1">Revenir aux réglages d'origine</button></div>`; }
  const open = f => { const on = f ?? pop.style.display !== 'block'; pop.style.display = on ? 'block' : 'none'; if (on) render(); };
  pop.addEventListener('input', e => { if (e.target.dataset.fov){ setFov(e.target.value); $('#vwFov').textContent = Math.round(CAM.fov) + '°'; return; } const k = e.target.dataset.k; if (!k) return; V[k] = e.target.type === 'checkbox' ? e.target.checked : (k === 'step' || k === 'op') ? +e.target.value : e.target.value; apply(); if (k === 'bg') pop.querySelectorAll(".vsw i").forEach(i => i.classList.toggle('on', i.dataset.bg === V.bg.toLowerCase())); });
  pop.addEventListener('click', e => { const cb = e.target.closest('[data-cam]'); if (cb){ goView(cb.dataset.cam); return render(); } const s = e.target.closest('[data-bg]'); if (s){ V.bg = s.dataset.bg; apply(); return render(); } if (e.target.closest('[data-vr]')){ Object.assign(V, DEF); apply(); render(); } });
  pop.addEventListener('keydown', e => e.stopPropagation());
  addEventListener('pointerdown', e => { if (pop.style.display === 'block' && !pop.contains(e.target) && !bar.contains(e.target)) open(false); }, true);
  apply(); barRender(); setInterval(() => { const sl = bar.querySelector('#v3Cam'); if (document.activeElement !== sl && (sl ? sl.value : '') !== (VIEWS.some(v => v[0] === CAM.id) ? CAM.id : '') || !!bar.querySelector('[data-vg].on') !== !!V.grid) barRender(); }, 400);
  window.VIEW3D = { V, apply, open, plane, goView, setFov, CAM, VIEWS, set: o => { Object.assign(V, o); apply(); } };
}
