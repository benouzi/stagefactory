// Moteur lumière à la manière d'une grandMA : programmeur prioritaire, mémoires qui ne contiennent que les valeurs actives,
// tracking dans la séquence, plusieurs séquences sur des exécuteurs (dernière action prioritaire), Off, Highlight.
import * as THREE from 'three';
export function initProg(A, ST){
  const S = ST.S, UI = ST.UI, KEYS = ST.LKEYS, NUM = new Set(ST.LNUM || ['dim', 'zoom', 'pan', 'tilt', 'speed', 'speed2', 'speed3', 'amp']);
  const LAST = new Map(), RTS = [], c1 = new THREE.Color(), c2 = new THREE.Color(); let BASE = {}, clock = 0;
  const E = { sel: 0, hi: false };
  const isLum = o => ST.typeOf(o).cat === 'lum', lums = () => S.objs.filter(isLum);
  const prog = () => (S.prog && typeof S.prog === 'object' ? S.prog : (S.prog = {}));
  const seqs = () => [{ name: S.seqName || 'Séquence 1', cues: S.cues, main: true }, ...(Array.isArray(S.xseq) ? S.xseq : (S.xseq = []))];
  const rt = i => RTS[i] || (RTS[i] = { cue: -1, on: false, t0: 0, k: 1, dur: 0, from: {}, to: {}, cur: {}, master: 1 });
  const master = i => i === 0 ? (S.seqMaster ?? 1) : (seqs()[i]?.master ?? 1);
  const eq = (a, b) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-6 : a === b;
  const snapO = o => { const s = {}; for (const k of KEYS) if (o[k] !== undefined) s[k] = o[k]; return s; };
  // état « suivi » d'une mémoire : cumul de toutes les mémoires précédentes de la séquence (tracking)
  function tracked(si, i){ const cues = seqs()[si]?.cues || [], st = {}; for (let n = 0; n <= i && n < cues.length; n++){ const s = cues[n].s || {}; for (const id in s) Object.assign(st[id] || (st[id] = {}), s[id]); } return st; }
  const hasSource = (id, a, except) => { for (let i = 0; i < RTS.length; i++){ const r = RTS[i]; if (r && r.on && i !== except && r.to[id] && r.to[id][a] !== undefined) return true; } return false; };

  // ---------------------------------------------------------------- restitution
  function go(si, i, o = {}){
    const sq = seqs()[si]; if (!sq || !sq.cues[i]) return false; const r = rt(si), cue = sq.cues[i], clean = tracked(si, i), to = { ...clean }, from = {}; let rel = false;
    // ce que la mémoire précédente tenait et que celle-ci ne tient plus (retour en arrière, bouclage) est relâché : l'intensité descend à zéro
    if (r.on) for (const id in r.to) if (r.to[id].dim !== undefined && !(clean[id] && clean[id].dim !== undefined) && ST.byId(id)){ to[id] = { ...(clean[id] || {}), dim: 0 }; rel = true; }
    for (const id in to){ const ob = ST.byId(id); if (!ob) continue; const L = LAST.get(id) || ob, f = from[id] = {}; for (const a in to[id]) f[a] = (r.on && r.cur[id] && r.cur[id][a] !== undefined ? r.cur[id][a] : L[a]) ?? to[id][a];
      const rr = ST.RT.get(id); if (rr && to[id].fx && f.fx !== to[id].fx){ rr.fxFrom = f.fx || 'fixe'; rr.fxMix = 0; } }
    Object.assign(r, { cue: i, on: true, t0: ++clock, k: 0, dur: o.instant ? 0 : cue.fade ?? 1.5, from, to, cur: from, clean: rel ? clean : null, hazeFrom: S.haze, haze: cue.haze });
    if (si === 0){ UI.cue = i; UI.autoT = 0; } if (S.black) S.black = false; if (!A.live) ST.setLive(true); return true;
  }
  function off(si){ const r = RTS[si]; if (!r || !r.on) return; r.on = false; const P = prog();
    for (const id in r.to){ const ob = ST.byId(id); if (!ob || (P[id] && 'dim' in P[id]) || hasSource(id, 'dim', si)) continue; ob.dim = 0; const L = LAST.get(id); if (L) L.dim = 0; const rr = ST.RT.get(id); if (rr) rr.fxFrom = null; }
    r.cue = -1; if (si === 0) UI.cue = -1; }
  const cueOf = si => (RTS[si] && RTS[si].on ? RTS[si].cue : -1);
  function step(si, d){ const sq = seqs()[si]; if (!sq || !sq.cues.length) return false; const c = cueOf(si); return go(si, c < 0 ? (d > 0 ? 0 : sq.cues.length - 1) : (c + d + sq.cues.length) % sq.cues.length); }

  // ---------------------------------------------------------------- programmeur
  const progCount = () => { const P = prog(); let f = 0, v = 0; for (const id in P){ const n = Object.keys(P[id]).length; if (n){ f++; v += n; } } return { f, v }; };
  function clearProg(){ const P = prog(); let n = 0;
    for (const id in P){ const ob = ST.byId(id), L = LAST.get(id); if (!ob) continue; for (const a in P[id]){ n++; if (!hasSource(id, a) && BASE[id] && BASE[id][a] !== undefined){ ob[a] = BASE[id][a]; if (L) L[a] = ob[a]; } } }
    S.prog = {}; BASE = {}; return n; }
  const dropProg = () => { S.prog = {}; BASE = {}; };       // vide le programmeur sans toucher aux valeurs (elles viennent d'être enregistrées)
  // Clear en deux temps, comme sur la console : d'abord la sélection, ensuite les valeurs
  function clear(){ if (UI.sel.length){ ST.select([]); return 'sel'; } if (!progCount().v) return 'rien'; ST.pushUndo(0, 'Vider le programmeur'); clearProg(); ST.touch(); return 'prog'; }
  function setHi(on){ E.hi = on; }

  // ---------------------------------------------------------------- enregistrement
  // Store : seules les valeurs du programmeur entrent dans la mémoire (fusion si elle existe). look : état complet de tous les projecteurs.
  function store(si = E.sel, i, o = {}){
    const sq = seqs()[si]; if (!sq) return { err: 'Séquence introuvable.' }; let content;
    if (o.look){ content = {}; for (const ob of lums()) content[ob.id] = snapO(ob); }
    else { content = JSON.parse(JSON.stringify(prog())); for (const id in content) if (!Object.keys(content[id]).length || !ST.byId(id)) delete content[id]; if (!Object.keys(content).length) return { err: 'Programmeur vide : rien à enregistrer. Règle des projecteurs, ou utilise « Store Look » pour l\'état complet.' }; }
    ST.pushUndo(0, 'Enregistrer une mémoire'); const cues = sq.cues; if (i === undefined || i > cues.length) i = cues.length; let merged = false;
    if (cues[i]){ if (o.replace) cues[i].s = content; else { for (const id in content) Object.assign(cues[i].s[id] || (cues[i].s[id] = {}), content[id]); merged = true; } if (o.look) cues[i].haze = S.haze; }
    else cues[i] = { name: o.name || (o.look ? 'Mémoire ' : 'Cue ') + (i + 1), fade: 2, hold: 6, haze: si === 0 ? S.haze : undefined, s: content };
    if (o.name) cues[i].name = String(o.name).slice(0, 40);
    const r = rt(si); Object.assign(r, { cue: i, on: true, t0: ++clock, k: 1, dur: 0, to: tracked(si, i), clean: null }); r.cur = r.from = r.to; if (si === 0) UI.cue = i;       // la mémoire enregistrée devient active
    ST.touch(); return { i, merged, n: Object.keys(content).length, name: cues[i].name };
  }
  function update(si = E.sel){ const c = cueOf(si); if (c < 0) return { err: 'Aucune mémoire active sur cet exécuteur.' }; return store(si, c); }
  function del(si, i){ const sq = seqs()[si]; if (!sq || !sq.cues[i]) return false; ST.pushUndo(0, 'Supprimer une mémoire'); sq.cues.splice(i, 1); const r = rt(si); if (r.on){ if (!sq.cues.length) off(si); else { r.cue = Math.min(r.cue >= i ? Math.max(0, r.cue - 1) : r.cue, sq.cues.length - 1); r.to = tracked(si, r.cue); r.cur = r.from = r.to; r.k = 1; r.clean = null; if (si === 0) UI.cue = r.cue; } } ST.touch(); return true; }
  function addSeq(name){ ST.pushUndo(0, 'Nouvelle séquence'); seqs(); S.xseq.push({ name: name || 'Séquence ' + (S.xseq.length + 2), cues: [], master: 1 }); E.sel = S.xseq.length; ST.touch(); return E.sel; }
  function delSeq(si){ if (si <= 0 || !S.xseq[si - 1]) return false; ST.pushUndo(0, 'Supprimer la séquence'); off(si); S.xseq.splice(si - 1, 1); RTS.splice(si, 1); E.sel = Math.min(E.sel, S.xseq.length); ST.touch(); return true; }
  function setMaster(si, v){ if (si === 0) S.seqMaster = v; else if (S.xseq[si - 1]) S.xseq[si - 1].master = v; }
  // au chargement d'un projet ou après une annulation : on repart des valeurs des objets, les exécuteurs gardent leur mémoire courante
  function reset(hard){ LAST.clear(); BASE = {}; if (hard){ RTS.length = 0; E.sel = 0; E.hi = false; } const q = seqs(); RTS.length = Math.min(RTS.length, q.length); if (E.sel >= q.length) E.sel = 0;
    for (let i = 0; i < RTS.length; i++){ const r = RTS[i]; if (!r) continue; if (!r.on || !q[i].cues[r.cue]){ r.on = false; r.cue = -1; continue; } r.to = tracked(i, r.cue); r.cur = r.from = r.to; r.k = 1; r.clean = null; }
    if (RTS[0] && !RTS[0].on) UI.cue = -1; }

  // ---------------------------------------------------------------- à chaque image, avant le rendu
  function frame(dt){
    const P = prog(), L0 = lums();
    // 1. toute valeur modifiée ailleurs (curseurs, palettes, assistant, anneau…) entre dans le programmeur
    for (const o of L0){ const L = LAST.get(o.id); if (!L) continue; for (const a of KEYS){ if (o[a] === undefined || eq(o[a], L[a])) continue; const p = P[o.id] || (P[o.id] = {}); if (!(a in p)) (BASE[o.id] || (BASE[o.id] = {}))[a] = L[a]; p[a] = o[a]; } }
    // 2. fondus des exécuteurs
    const act = [];
    for (let i = 0; i < RTS.length; i++){ const r = RTS[i]; if (!r || !r.on) continue; act.push(i); if (r.k >= 1 && r.clean){ r.to = r.cur = r.clean; r.clean = null; }
      if (r.k < 1){ r.k = r.dur > 0 ? Math.min(1, r.k + dt / r.dur) : 1; const e = A.ease(r.k), cur = {};
        for (const id in r.to){ const f = r.from[id] || {}, t = r.to[id], c = cur[id] = {}; for (const a in t){ const fv = f[a], tv = t[a];
            c[a] = fv === undefined || r.k >= 1 ? tv : NUM.has(a) ? fv + (tv - fv) * e : a === 'color' && typeof fv === 'string' ? '#' + c1.set(fv).lerp(c2.set(tv), e).getHexString() : tv; }
          const rr = ST.RT.get(id); if (rr && rr.fxFrom != null){ rr.fxMix = e; if (r.k >= 1) rr.fxFrom = null; } }
        r.cur = r.k >= 1 ? r.to : cur; if (i === 0 && r.haze !== undefined) S.haze = r.hazeFrom + (r.haze - r.hazeFrom) * e; if (r.k >= 1){ ST.refreshProps(); } } }
    act.sort((a, b) => RTS[b].t0 - RTS[a].t0);
    // 3. sortie : programmeur, sinon l'exécuteur déclenché en dernier qui possède la valeur
    for (const o of L0){ const p = P[o.id];
      if (act.length) for (const a of KEYS){ if (p && a in p) continue; for (const i of act){ const st = RTS[i].cur[o.id]; if (st && st[a] !== undefined){ o[a] = a === 'dim' ? st[a] * master(i) : st[a]; break; } } }
      let L = LAST.get(o.id); if (!L) LAST.set(o.id, L = {}); for (const a of KEYS) L[a] = o[a]; }
    for (const id of LAST.keys()) if (!ST.byId(id)){ LAST.delete(id); delete P[id]; }
    ST.HIL.clear(); if (E.hi) for (const id of UI.sel) ST.HIL.add(id);
  }
  A.hooks.update.unshift(frame);
  Object.assign(E, { seqs, rt, go, off, step, cueOf, tracked, prog, progCount, clear, clearProg, dropProg, setHi, store, update, del, addSeq, delSeq, master, setMaster, reset, frame, inProg: (id, a) => !!(prog()[id] && a in prog()[id]) });
  window.ENG = E; reset(); if (UI.cue >= 0 && S.cues[UI.cue]) go(0, UI.cue, { instant: true });
  return E;
}
