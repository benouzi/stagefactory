// Show démo en mode cinéma : musique synthétisée sur place, lumière calée au temps près, foule, caméra de film, enregistrement vidéo.
import * as THREE from 'three';
export function initCine(A, ST){
  const $ = s => document.querySelector(s), BPM = 126, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 32, DUR = BARS * BAR;
  // sections, en mesures : intro, montée, drop A (2 couleurs), break, montée, drop B (2 couleurs), final
  const SEC = [['intro', 0], ['build', 4], ['dropA', 8], ['dropA2', 12], ['break', 16], ['build2', 20], ['dropB', 22], ['dropB2', 26], ['outro', 30]];
  const secAt = bar => { let k = 0; for (let i = 0; i < SEC.length; i++) if (bar >= SEC[i][1]) k = i; return k; };
  const C = { on: false, t: 0, sec: -1, saved: null, cam: null, crowd: null, ui: null, music: null, ac: null, src: null, rec: null, p0: 0, ending: false };

  // ---------------------------------------------------------------- musique (rendue hors ligne, puis jouée)
  async function makeMusic(){
    if (C.music) return C.music;
    const SR = 44100, oc = new OfflineAudioContext(2, Math.ceil((DUR + 2.5) * SR), SR), out = oc.createDynamicsCompressor(); out.threshold.value = -10; out.ratio.value = 5; out.attack.value = .004; out.release.value = .12;
    const master = oc.createGain(); master.gain.value = .85; out.connect(master); master.connect(oc.destination);
    const nb = oc.createBuffer(1, SR * 2, SR), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const duck = oc.createGain(); duck.connect(out);                                   // tout sauf le kick passe par un « sidechain »
    const dly = oc.createDelay(1), fb = oc.createGain(), dw = oc.createGain(); dly.delayTime.value = BEAT * .75; fb.gain.value = .38; dw.gain.value = .3; dly.connect(fb); fb.connect(dly); dly.connect(dw); dw.connect(duck);
    const noise = (t, d, type, f, q, g, dest = duck, f1) => { const s = oc.createBufferSource(); s.buffer = nb; s.loop = true; const fl = oc.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + d); fl.Q.value = q; const a = oc.createGain(); a.gain.value = 0; s.connect(fl); fl.connect(a); a.connect(dest); s.start(t, Math.random()); s.stop(t + d + .05); return a.gain; };
    const kick = (t, g = 1) => { const o = oc.createOscillator(), a = oc.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(46, t + .11); a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(.001, t + .34); o.connect(a); a.connect(out); o.start(t); o.stop(t + .36);
      const c = noise(t, .02, 'highpass', 2500, .7, 0, out); c.setValueAtTime(.35 * g, t); c.exponentialRampToValueAtTime(.001, t + .02);
      duck.gain.setValueAtTime(.28, t); duck.gain.linearRampToValueAtTime(1, t + BEAT * .62); };
    const hat = (t, g) => { const a = noise(t, .05, 'highpass', 8500, .8, 0); a.setValueAtTime(g, t); a.exponentialRampToValueAtTime(.001, t + .045); };
    const clap = (t, g = .5) => { const a = noise(t, .2, 'bandpass', 1700, .9, 0); a.setValueAtTime(g, t); a.exponentialRampToValueAtTime(.001, t + .17); };
    const tone = (t, d, f, type, g, cut, dest = duck, att = .005) => { const o = oc.createOscillator(), fl = oc.createBiquadFilter(), a = oc.createGain(); o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut, t); fl.frequency.exponentialRampToValueAtTime(Math.max(120, cut * .35), t + d); fl.Q.value = 3;
      a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + att); a.gain.setValueAtTime(g, t + Math.max(att, d * .6)); a.gain.linearRampToValueAtTime(0, t + d); o.connect(fl); fl.connect(a); a.connect(dest); o.start(t); o.stop(t + d + .02); };
    const ROOT = [55, 43.65, 65.41, 49], CH = [[0, 3, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12], [0, 4, 7, 11]], st = n => Math.pow(2, n / 12);
    for (let bar = 0; bar < BARS; bar++){
      const t0 = bar * BAR, s = SEC[secAt(bar)][0], drop = s.startsWith('drop'), r = ROOT[bar % 4], ch = CH[bar % 4];
      // nappe
      if (s === 'intro' || s === 'break' || s === 'outro' || drop) for (const n of [0, ch[1], ch[2]]) for (const dt of [-.06, .07]) tone(t0, BAR * 1.02, r * 4 * st(n) * (1 + dt * .01), 'sawtooth', drop ? .035 : .07, drop ? 1400 : 900, duck, .35);
      for (let b = 0; b < 4; b++){
        const t = t0 + b * BEAT;
        if (drop){ kick(t); hat(t + BEAT / 2, .22); for (let q = 0; q < 4; q++) hat(t + q * BEAT / 4, .05); if (b % 2 === 1) clap(t);
          tone(t + BEAT / 2, BEAT * .42, r * 2, 'sawtooth', .34, 520); tone(t + BEAT / 2, BEAT * .42, r, 'sine', .3, 300);
          for (let q = 0; q < 4; q++){ const i = (b * 4 + q), n = ch[[0, 2, 1, 3, 2, 3, 1, 2][i % 8]] + (i % 16 > 11 ? 12 : 0), up = s.endsWith('2') || s === 'dropB' ? 2 : 1; tone(t + q * BEAT / 4, BEAT * .22, r * 8 * up * st(n), s.startsWith('dropB') ? 'square' : 'sawtooth', .085, 3200, dly); tone(t + q * BEAT / 4, BEAT * .22, r * 8 * up * st(n), 'sawtooth', .07, 2600); } }
        else if (s === 'intro'){ if (bar >= 2) kick(t, .55); if (bar >= 1) { const n = ch[(b * 2) % 4]; tone(t, BEAT * .4, r * 8 * st(n), 'triangle', .09, 1800, dly); tone(t + BEAT / 2, BEAT * .3, r * 8 * st(ch[(b * 2 + 1) % 4]), 'triangle', .06, 1500, dly); } if (bar === 3) hat(t + BEAT / 2, .12); }
        else if (s === 'break'){ const n = ch[b % 4]; tone(t, BEAT * .8, r * 8 * st(n), 'triangle', .11, 2200, dly); if (bar >= 18) tone(t + BEAT / 2, BEAT * .4, r * 16 * st(ch[(b + 2) % 4]), 'sine', .05, 3000, dly); }
        else if (s === 'build' || s === 'build2'){ const k = s === 'build' ? bar - 4 : bar - 20 + 2, div = k < 2 ? 1 : k < 3 ? 2 : (b < 2 ? 4 : 8); kick(t, .5 + k * .1);
          for (let q = 0; q < div; q++){ const tt = t + q * BEAT / div, a = noise(tt, .09, 'bandpass', 1900 + k * 500, .8, 0); a.setValueAtTime(.16 + k * .07, tt); a.exponentialRampToValueAtTime(.001, tt + .08); }
          tone(t, BEAT * .5, r * 4 * st(ch[b % 4]), 'sawtooth', .1 + k * .02, 800 + k * 700); }
        else if (s === 'outro' && bar === 30 && b === 0){ kick(t); }
      }
      // montées : souffle qui grimpe ; drops : impact
      if (s === 'build' && bar === 4){ const a = noise(t0, BAR * 4, 'bandpass', 300, 1.2, 0, out, 9000); a.setValueAtTime(0, t0); a.linearRampToValueAtTime(.3, t0 + BAR * 4); a.setValueAtTime(0, t0 + BAR * 4 + .01); }
      if (s === 'build2' && bar === 20){ const a = noise(t0, BAR * 2, 'bandpass', 500, 1.2, 0, out, 10000); a.setValueAtTime(0, t0); a.linearRampToValueAtTime(.32, t0 + BAR * 2); a.setValueAtTime(0, t0 + BAR * 2 + .01); }
      if (bar === 8 || bar === 22 || bar === 30 || bar === 12 || bar === 26){ const big = bar !== 12 && bar !== 26, a = noise(t0, 2.4, 'highpass', 3500, .5, 0, out); a.setValueAtTime(big ? .4 : .2, t0); a.exponentialRampToValueAtTime(.001, t0 + 2.3); if (big){ const o = oc.createOscillator(), g = oc.createGain(); o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(30, t0 + 1.2); g.gain.setValueAtTime(.8, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + 1.5); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 1.6); } }
    }
    const buf = await oc.startRendering(); let pk = 0; for (let c = 0; c < buf.numberOfChannels; c++){ const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++){ const v = Math.abs(d[i]); if (v > pk) pk = v; } }
    if (pk > 0){ const k = .92 / pk; for (let c = 0; c < buf.numberOfChannels; c++){ const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; } }          // normalisation : aucun écrêtage
    return C.music = buf;
  }

  // ---------------------------------------------------------------- plateau du show
  const mix = (a, b, k) => a + (b - a) * k, lin = (n, w) => Array.from({ length: n }, (_, i) => n === 1 ? 0 : -w + 2 * w * i / (n - 1));
  function buildShow(){
    const d = ST.sceneShow('electro'), LIB = ST.LIBALL(), objs = d.objs; let n = Math.max(...objs.filter(o => o.n < 500).map(o => o.n)) + 1, addr = 1, uni = 2;
    const add = (type, grp, name, xs, y, z, hang, p) => xs.forEach((x, i) => { const t = LIB.find(q => q.id === type), o = { ...ST.defaults(t), ...p, pos: [Math.round(x * 100) / 100, y, z], hang, grp, name: `${name} ${i + 1}`, n: n++, uni, addr }; addr += t.modes[0][1]; objs.push(o); });
    // rampe de beams au sol derrière le DJ (ligne « à hauteur de nuque »), et latéraux croisés : deux gestes vus sur les scènes électro
    add('beam', 'Rampe', 'Rampe', [-6.6, -5.3, -4, -2.7, 2.7, 4, 5.3, 6.6], 0, -8.7, null, { dim: 0, color: '#ffffff', zoom: 3, pan: 0, tilt: 150 });
    add('beam', 'Latéraux', 'Latéral', [-7.9, -7.9, -7.9, 7.9, 7.9, 7.9], 0, -1.2, null, { dim: 0, color: '#ffffff', zoom: 4, pan: 0, tilt: 120 });
    objs.filter(o => o.grp === 'Latéraux').forEach((o, i) => { o.pos[2] = -1.2 - (i % 3) * 2.1; });
    const lums = objs.filter(o => ST.typeOf ? LIB.find(t => t.id === o.type)?.cat === 'lum' : false), G = {}; for (const o of lums) (G[o.grp] = G[o.grp] || []).push(o);
    const side = o => Math.sign(o.pos[0]) || 1;
    // une mémoire = un état complet ; les valeurs peuvent dépendre du projecteur (éventails, croisés)
    const cue = (name, fade, def, haze = .9) => { const s = {}; for (const o of lums){ const base = Object.fromEntries(ST.LKEYS.map(k => [k, o[k]])), p = def[o.grp] || { dim: 0 }, g = G[o.grp], i = g.indexOf(o), v = {}; for (const k in p) v[k] = typeof p[k] === 'function' ? p[k](o, i, g.length) : p[k]; s[o.id] = { ...base, fx: 'fixe', fx2: 'fixe', fx3: 'fixe', amp: 1, ...v }; } return { name, fade, hold: 8, haze, s }; };
    const fan = k => (o, i, n) => (i - (n - 1) / 2) * k, deco = { dim: .25, color: '#5b14f0' };
    const W = '#ffffff', MINT = '#2affd0', VIO = '#b04bff', IND = '#5b14f0', MAG = '#ff2bd6', CY = '#19d3ff', RED = '#ff1e1e', AMB = '#ff9a1f', BLUE = '#2a4dff';
    d.cues = [
      cue('Intro', 3, { Wash: { dim: .45, color: IND, zoom: 40, pan: fan(8), tilt: 24 }, Beams: { dim: .5, color: BLUE, zoom: 3, pan: fan(6), tilt: 8, fx: 'vague', speed: .25, amp: .5 }, Sol: { dim: .5, color: IND, tilt: 150 }, Barres: { dim: .25, color: BLUE, tilt: 100 }, 'Déco murs': deco, 'Déco charpente': { dim: .2, color: BLUE } }, .7),
      cue('Montée', BAR * 3.9, { Wash: { dim: .7, color: W, zoom: 18, pan: fan(3), tilt: 40 }, Beams: { dim: 1, color: W, zoom: 3, pan: fan(2), tilt: 168 }, 'Beams avant': { dim: 1, color: W, zoom: 3, pan: fan(3), tilt: 165 }, Rampe: { dim: 1, color: W, pan: fan(1), tilt: 178 }, Blinders: { dim: .9, color: '#fff0d8', tilt: 62 }, Barres: { dim: 1, color: W, tilt: 100 }, Sol: { dim: .6, color: W, tilt: 150 }, 'Déco murs': { dim: .1, color: W } }, 1),
      cue('Drop A', .05, { Wash: { dim: .85, color: VIO, zoom: 34, pan: fan(9), tilt: 30 }, Beams: { dim: 1, color: MINT, zoom: 3, pan: 0, tilt: 42, fx: 'balayage', speed: 1.1, fx2: 'vague', speed2: .9, amp: 1.1 }, 'Beams avant': { dim: 1, color: W, zoom: 3, pan: fan(9), tilt: 70, fx: 'huit', speed: 1.1 }, Rampe: { dim: 1, color: MINT, pan: fan(7), tilt: 138, fx: 'vague', speed: 1.3, amp: .8 }, 'Latéraux': { dim: .9, color: VIO, pan: o => -side(o) * 78, tilt: (o, i) => 108 + (i % 3) * 14, fx: 'balayage', speed: .7, amp: .5 }, Blinders: { dim: 1, color: '#fff0d8', tilt: 62 }, Barres: { dim: 1, color: MINT, tilt: 100 }, Sol: { dim: .9, color: VIO, tilt: 150 }, 'Déco murs': { dim: .5, color: VIO }, 'Déco charpente': { dim: .4, color: MINT } }, 1),
      cue('Drop A · magenta', .4, { Wash: { dim: .85, color: MAG, zoom: 34, pan: fan(9), tilt: 30 }, Beams: { dim: 1, color: CY, zoom: 3, pan: fan(10), tilt: 50, fx: 'cercle', speed: 1.2, amp: 1.1 }, 'Beams avant': { dim: 1, color: MAG, zoom: 3, pan: fan(-9), tilt: 64, fx: 'huit', speed: 1.3 }, Rampe: { dim: 1, color: CY, pan: fan(-9), tilt: 132, fx: 'balayage', speed: 1.5, amp: .7 }, 'Latéraux': { dim: .9, color: MAG, pan: o => -side(o) * 70, tilt: (o, i) => 100 + (i % 3) * 18, fx: 'vague', speed: 1.1, amp: .8 }, Blinders: { dim: 1, color: '#fff0d8', tilt: 62 }, Barres: { dim: 1, color: MAG, tilt: 100 }, Sol: { dim: .9, color: CY, tilt: 150 }, 'Déco murs': { dim: .5, color: MAG }, 'Déco charpente': { dim: .4, color: CY } }, 1),
      cue('Break', 2.5, { Wash: { dim: .5, color: BLUE, zoom: 44, pan: fan(10), tilt: 20 }, Beams: { dim: .55, color: AMB, zoom: 3, pan: fan(4), tilt: 14, fx: 'cercle', speed: .22, amp: .5 }, 'Beams avant': { dim: .35, color: BLUE, zoom: 5, pan: fan(2), tilt: 20, fx: 'vague', speed: .2, amp: .4 }, Sol: { dim: .35, color: AMB, tilt: 160 }, Barres: { dim: .2, color: AMB, tilt: 100 }, 'Déco murs': { dim: .35, color: BLUE }, 'Déco charpente': { dim: .3, color: AMB } }, .75),
      cue('Montée 2', BAR * 1.9, { Wash: { dim: .8, color: W, zoom: 16, pan: fan(3), tilt: 44 }, Beams: { dim: 1, color: W, zoom: 3, pan: fan(1), tilt: 172 }, 'Beams avant': { dim: 1, color: W, zoom: 3, pan: fan(2), tilt: 168 }, Rampe: { dim: 1, color: W, pan: fan(1), tilt: 179 }, 'Latéraux': { dim: 1, color: W, pan: o => -side(o) * 20, tilt: 175 }, Blinders: { dim: 1, color: '#fff0d8', tilt: 62 }, Barres: { dim: 1, color: W, tilt: 100 }, Sol: { dim: .7, color: W, tilt: 150 } }, 1),
      cue('Drop B', .05, { Wash: { dim: .9, color: RED, zoom: 30, pan: fan(9), tilt: 32 }, Beams: { dim: 1, color: W, zoom: 3, pan: fan(12), tilt: 46, fx: 'huit', speed: 1.5, fx2: 'balayage', speed2: .8, amp: 1.2 }, 'Beams avant': { dim: 1, color: RED, zoom: 3, pan: fan(10), tilt: 72, fx: 'balayage', speed: 1.6 }, Rampe: { dim: 1, color: W, pan: fan(10), tilt: 128, fx: 'cercle', speed: 1.6, amp: .9 }, 'Latéraux': { dim: 1, color: RED, pan: o => -side(o) * 82, tilt: (o, i) => 96 + (i % 3) * 16, fx: 'huit', speed: 1.2, amp: .7 }, Blinders: { dim: 1, color: '#fff0d8', tilt: 62 }, Barres: { dim: 1, color: RED, tilt: 100 }, Sol: { dim: 1, color: RED, tilt: 150 }, 'Déco murs': { dim: .6, color: RED }, 'Déco charpente': { dim: .5, color: W } }, 1),
      cue('Drop B · arc-en-ciel', .4, { Wash: { dim: .9, color: MINT, zoom: 30, pan: fan(9), tilt: 32, fx: 'arc', speed: .5 }, Beams: { dim: 1, color: W, zoom: 3, pan: fan(12), tilt: 40, fx: 'cercle', speed: 1.7, fx2: 'arc', speed2: .7, amp: 1.2 }, 'Beams avant': { dim: 1, color: MINT, zoom: 3, pan: fan(-10), tilt: 68, fx: 'huit', speed: 1.7, fx2: 'arc', speed2: .9 }, Rampe: { dim: 1, color: VIO, pan: fan(-10), tilt: 134, fx: 'vague', speed: 1.8, fx2: 'arc', speed2: .8, amp: .9 }, 'Latéraux': { dim: 1, color: MINT, pan: o => -side(o) * 76, tilt: (o, i) => 100 + (i % 3) * 16, fx: 'balayage', speed: 1.4, fx2: 'arc', speed2: .6, amp: .7 }, Blinders: { dim: 1, color: '#fff0d8', tilt: 62 }, Barres: { dim: 1, color: VIO, tilt: 100, fx2: 'arc', speed2: 1 }, Sol: { dim: 1, color: MINT, tilt: 150, fx: 'arc', speed: .6 }, 'Déco murs': { dim: .6, color: VIO, fx: 'arc', speed: .3 }, 'Déco charpente': { dim: .5, color: MINT } }, 1),
      cue('Final', .05, { Wash: { dim: 1, color: W, zoom: 44, pan: fan(8), tilt: 36 }, Beams: { dim: 1, color: W, zoom: 3, pan: fan(9), tilt: 64 }, 'Beams avant': { dim: 1, color: W, zoom: 3, pan: fan(8), tilt: 76 }, Rampe: { dim: 1, color: W, pan: fan(9), tilt: 140 }, 'Latéraux': { dim: 1, color: W, pan: o => -side(o) * 60, tilt: 130 }, Blinders: { dim: 1, color: '#fff0d8', tilt: 62 }, Barres: { dim: 1, color: W, tilt: 100 }, Sol: { dim: 1, color: W, tilt: 150 }, 'Déco murs': { dim: .7, color: W } }, 1),
      cue('Noir bleu', BAR * 1.6, { Wash: { dim: .22, color: IND, zoom: 44, pan: fan(8), tilt: 22 }, Beams: { dim: .25, color: BLUE, zoom: 3, pan: fan(5), tilt: 10 }, Sol: { dim: .2, color: IND, tilt: 150 }, 'Déco murs': { dim: .2, color: IND } }, .6),
    ];
    d.name = 'Démo — show'; d.salle = { type: 'onex' }; d.follow = false; d.master = 1; d.haze = .7; return d;
  }
  const CUEAT = [[0, 0], [4, 1], [8, 2], [12, 3], [16, 4], [20, 5], [22, 6], [26, 7], [30, 8], [30.25, 9]];

  // pilotage temps réel, par groupe, calé sur la musique
  const R = { dim: 1, rate: 1, flash: 0, hard: false, col: null }, fr = v => v - Math.floor(v);
  function mod(o, ph, i, n){
    const b = C.t / BEAT, bar = Math.floor(b / 4), s = SEC[secAt(bar)][0], pb = fr(b), kp = Math.exp(-5.5 * pb), beatN = Math.floor(b), g = o.grp; R.dim = 1; R.rate = 1; R.flash = 0; R.hard = false; R.col = null;
    if (C.t < 0 || C.t > DUR + 4) return R;
    if (s === 'intro'){ if (bar >= 2 && (g === 'Sol' || g === 'Barres')) R.dim = .55 + .45 * kp; R.rate = .6; }
    else if (s === 'build' || s === 'build2'){ const k = s === 'build' ? (b - 16) / 16 : (b - 80) / 8, div = k < .5 ? 2 : k < .75 ? 4 : 8, gate = fr(b * div) < .5 ? 1 : 0; R.rate = .4 + k * 2.2;
      if (g === 'Blinders'){ R.dim = gate * (k > .5 ? k : 0); R.hard = true; } else if (g === 'Beams' || g === 'Beams avant' || g === 'Rampe' || g === 'Barres' || g === 'Latéraux'){ R.dim = (.25 + .75 * gate) * (.3 + .7 * k); R.hard = true; } else R.dim = .4 + .6 * k; }
    else if (s.startsWith('drop')){ const B2 = s.startsWith('dropB'); R.rate = B2 ? 1.25 : 1;
      if (g === 'Beams') R.dim = .5 + .5 * kp; else if (g === 'Beams avant'){ R.dim = (beatN + i) % 2 ? 1 : .08; R.hard = true; }
      else if (g === 'Barres'){ R.dim = Math.floor(b * 4) % n === i || Math.floor(b * 4) % n === n - 1 - i ? 1 : .1; R.hard = true; }
      else if (g === 'Rampe'){ R.dim = B2 ? (Math.floor(b * 2) % 4 === Math.min(i, n - 1 - i) ? 1 : .15) : .35 + .65 * kp; R.hard = B2; }
      else if (g === 'Latéraux'){ R.dim = (Math.floor(b / 2) + (i < n / 2 ? 0 : 1)) % 2 ? 1 : .25; }
      else if (g === 'Sol' || g === 'Wash') R.dim = .6 + .4 * kp;
      else if (g === 'Blinders'){ const hit = (bar % 4 === 0 && beatN % 4 === 0) || (B2 && bar % 2 === 0 && beatN % 4 === 0) || (bar === 29 && beatN % 4 >= 2); R.dim = hit ? Math.exp(-3.2 * pb) : 0; R.hard = true; }
      else if (g && g.startsWith('Déco')) R.dim = .6 + .4 * kp;
      R.flash = (bar % 4 === 0 && beatN % 4 === 0 ? .5 : 0) * Math.exp(-4 * pb); }
    else if (s === 'break'){ R.rate = .5; if (g === 'Sol') R.dim = .7 + .3 * Math.sin(b * Math.PI / 2 + i); }
    else if (s === 'outro'){ const k = (b - 120) / 8; R.rate = .5; if (g === 'Blinders') R.dim = Math.exp(-2.2 * (b - 120)); }
    return R;
  }
  // mur LED : un contenu par section
  const LEDSEC = { intro: ['plasma', '#1a0a5e', '#2a4dff', .35], build: ['barres', '#ffffff', '#5b14f0', 2.2], dropA: ['plasma', '#2affd0', '#b04bff', 2.4], dropA2: ['barres', '#ff2bd6', '#19d3ff', 2.6], break: ['degrade', '#2a4dff', '#ff9a1f', .3], build2: ['barres', '#ffffff', '#ff1e1e', 3], dropB: ['plasma', '#ff1e1e', '#ff9a1f', 3], dropB2: ['texte', '#2affd0', '#b04bff', 2.2], outro: ['plasma', '#12083a', '#2a4dff', .3] };
  function ledFor(sec){ const o = ST.S.objs.find(q => q.type === 'mur-led'), L = LEDSEC[sec]; if (!o || !o.led || !L) return; Object.assign(o.led, { content: L[0], color: L[1], color2: L[2], speed: L[3], text: 'ONEX  ·  ONEX  ·  ONEX', bright: sec === 'intro' || sec === 'outro' || sec === 'break' ? .55 : sec === 'dropB' ? .75 : .9 }); const r = ST.RT.get(o.id); if (r) r.dirty = true; }

  // ---------------------------------------------------------------- foule
  function makeCrowd(){
    const pts = [], rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let z = 1.3; z < 15.5; z += .62) for (let x = -7.7; x <= 7.7; x += .6){ const dens = z < 8 ? .92 : mix(.85, .3, (z - 8) / 7.5); if (rnd() > dens) continue; const px = x + (rnd() - .5) * .34, pz = z + (rnd() - .5) * .34, f = A.floorAt(px, 2.2, pz, 3); if (f === null || f > 1.2) continue; pts.push({ x: px, y: f, z: pz, h: .9 + rnd() * .16, ph: rnd(), en: .5 + rnd() * .5, arm: rnd() < .42, lean: (rnd() - .5) * .2 }); }
    const N = pts.length, body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.19, .95, 3, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9 }), N), head = new THREE.InstancedMesh(new THREE.SphereGeometry(.115, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .75 }), N), arms = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.036, .5, 2, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .8 }), N * 2);
    const col = new THREE.Color(), SK = ['#c99b7c', '#8d5a3b', '#e0b89a', '#6b4429', '#d8a787'], CL = ['#15161c', '#1d2233', '#2a1d2e', '#101418', '#26262b', '#1a2a2a', '#3a1a22', '#e8e8ea'];
    pts.forEach((p, i) => { body.setColorAt(i, col.set(CL[Math.floor(rnd() * CL.length)])); const sk = SK[Math.floor(rnd() * SK.length)]; head.setColorAt(i, col.set(sk)); arms.setColorAt(i * 2, col.set(sk)); arms.setColorAt(i * 2 + 1, col.set(sk)); });
    const grp = new THREE.Group(); for (const m of [body, head, arms]){ m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.userData.noAO = true; grp.add(m); } A.scene.add(grp);
    return { pts, body, head, arms, grp, M: new THREE.Matrix4(), Q: new THREE.Quaternion(), E: new THREE.Euler(), P: new THREE.Vector3(), Sc: new THREE.Vector3(1, 1, 1), Z: new THREE.Vector3(0, 0, 0) };
  }
  function animCrowd(){
    const c = C.crowd; if (!c) return; const b = C.t / BEAT, bar = Math.floor(b / 4), s = SEC[secAt(Math.max(0, bar))][0], drop = s.startsWith('drop'), en = drop ? 1 : s.startsWith('build') ? .55 : s === 'intro' ? .22 : .12, { M, Q, E, P, Sc, Z } = c;
    c.pts.forEach((p, i) => { const j = Math.pow(Math.max(0, Math.sin(Math.PI * fr(b + p.ph * .12))), .7) * .17 * en * p.en * (C.t < 0 ? 0 : 1), sway = Math.sin(b * Math.PI / 2 + p.ph * 6.28) * .05 * (1.2 - en), y = p.y + j, hh = p.h;
      E.set(0, 0, p.lean * .3 + sway); Q.setFromEuler(E); Sc.set(1, hh, 1); P.set(p.x, y + .68 * hh, p.z); M.compose(P, Q, Sc); c.body.setMatrixAt(i, M);
      Sc.set(1, 1, 1); P.set(p.x - sway * 1.3, y + 1.48 * hh, p.z); M.compose(P, Q, Sc); c.head.setMatrixAt(i, M);
      const up = p.arm && (drop || s.startsWith('build')) ? 1 : 0;
      for (const sx of [-1, 1]){ if (up){ E.set(-.25 + j * 1.5, 0, sx * (-.28 - .3 * Math.sin(b * Math.PI + p.ph * 9))); Q.setFromEuler(E); P.set(p.x + sx * .27, y + 1.62 * hh + j * .4, p.z - .06); Sc.set(1, 1, 1); } else { E.set(0, 0, sx * .12); Q.setFromEuler(E); P.set(p.x + sx * .25, y + 1.0 * hh, p.z); Sc.set(1, 1, 1); } M.compose(P, Q, Sc); c.arms.setMatrixAt(i * 2 + (sx > 0 ? 1 : 0), M); } });
    c.body.instanceMatrix.needsUpdate = c.head.instanceMatrix.needsUpdate = c.arms.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- caméra : plans de film, coupés sur les mesures
  // [mesure début, mesure fin, position départ, visée départ, position arrivée, visée arrivée, focale (fov)]
  const SHOTS = [
    [0, 4, [0, 6.6, 20.5], [0, 2.6, -6], [0, 5.0, 14.5], [0, 2.8, -7], 48],
    [4, 8, [-2.8, 1.95, 11.5], [0, 3.0, -8], [-.6, 1.85, 4.2], [0, 3.6, -8], 56],
    [8, 10, [0, 3.0, 8.5], [0, 3.2, -6], [0, 3.8, 12.5], [0, 3.0, -6], 64],
    [10, 12, [-8.1, 1.9, -.3], [3, 2.8, -6.5], [-7.4, 3.6, 4], [1.5, 2.4, -6], 58],
    [12, 14, [1.9, 2.75, -9.05], [0, 1.0, 7], [-1.9, 3.0, -9.05], [0, 1.2, 7], 72],
    [14, 16, [0, 5.1, 1.6], [0, .4, -5.5], [0, 5.1, 6.5], [0, .2, -3], 66],
    [16, 20, [4.8, 2.1, -3.2], [0, 2.2, -7.9], [1.6, 2.0, -4.6], [0, 2.3, -7.9], 36],
    [20, 22, [3.2, 1.8, 9.5], [0, 3.8, -8], [1.2, 2.0, 5.5], [0, 4.2, -8], 54],
    [22, 24, [0, 7.4, 19], [0, 2.6, -6], [0, 5.6, 12.5], [0, 2.6, -6], 60],
    [24, 26, [7.2, 1.3, 1.8], [-2, 3.2, -7], [4.2, 1.7, 3.0], [-1, 3.0, -7], 62],
    [26, 28, [-2.2, 2.9, -9.05], [1, 1.2, 8], [2.2, 2.7, -9.05], [-1, 1.0, 8], 74],
    [28, 30, [0, 4.4, 20.5], [0, 2.8, -8], [0, 2.5, 2.6], [0, 3.0, -8], 58],
    [30, 33.5, [0, 2.8, 5], [0, 2.6, -8], [0, 7.2, 21], [0, 2.4, -6], 50],
  ];
  const v3 = new THREE.Vector3(), l3 = new THREE.Vector3(), sm = k => k * k * (3 - 2 * k);
  function camera(){
    const bar = Math.max(0, C.t / BAR), sh = SHOTS.find(q => bar >= q[0] && bar < q[1]) || SHOTS[SHOTS.length - 1], k = sm(Math.min(1, Math.max(0, (bar - sh[0]) / (sh[1] - sh[0])))) * .92 + .04, cam = A.persp;
    v3.set(mix(sh[2][0], sh[4][0], k), mix(sh[2][1], sh[4][1], k), mix(sh[2][2], sh[4][2], k)); l3.set(mix(sh[3][0], sh[5][0], k), mix(sh[3][1], sh[5][1], k), mix(sh[3][2], sh[5][2], k));
    const s = SEC[secAt(Math.floor(bar))][0]; if (s.startsWith('drop')){ const kp = Math.exp(-7 * fr(C.t / BEAT)); v3.y += kp * .018; l3.y -= kp * .03; }
    cam.position.copy(v3); A.orbit.target.copy(l3); cam.lookAt(l3); if (cam.fov !== sh[6]){ cam.fov = sh[6]; cam.updateProjectionMatrix(); }
  }

  // ---------------------------------------------------------------- habillage
  function makeUI(){
    const ui = document.createElement('div'); ui.id = 'cineUI'; ui.innerHTML = `<div class="cb top"></div><div class="cb bot"><i id="cineBar"></i></div><div id="cineTitle"></div><div id="cineHint">Échap pour quitter</div><div id="cineRec">● REC</div>`; document.body.appendChild(ui); return ui;
  }
  const TITLES = [[.6, 6.4, 'SALLE POLYVALENTE D\'ONEX', 'show démo · prévisualisation 3D'], [DUR - 1.2, DUR + 3.4, 'ONEX', 'du plan au plateau, avant le premier montage']];
  function title(){ const el = $('#cineTitle'); if (!el) return; const tt = TITLES.find(q => C.t >= q[0] && C.t < q[1]); if (!tt){ if (el.style.opacity !== '0') el.style.opacity = '0'; return; } if (el.dataset.k !== tt[2]){ el.dataset.k = tt[2]; el.innerHTML = `<b>${tt[2]}</b><span>${tt[3]}</span>`; } const k = Math.min(1, (C.t - tt[0]) / .9, (tt[1] - C.t) / .9); el.style.opacity = String(Math.max(0, k)); }

  // ---------------------------------------------------------------- déroulé
  async function start(opts = {}){
    if (C.on || C.starting) return; C.starting = true;
    ST.modal(`<h1>Show démo</h1><div class="sub">Préparation : composition de la musique, montage du plateau, installation du public…</div>`);
    await new Promise(r => setTimeout(r, 60));
    let buf = null; try { buf = await makeMusic(); } catch (e){ console.warn('musique indisponible', e); }
    window.PLAN?.toggle(false); if (window.DESK?.isOpen()) DESK.toggle(false); A.toggleConsole(false); A.selectCurtain?.(-1); ST.select([]);
    await new Promise(r => setTimeout(r, 950));              // laisse partir une éventuelle sauvegarde en attente : le show démo ne doit jamais écraser le projet
    C.saved = ST.serialize(); C.cam = { pos: A.persp.position.clone(), tg: A.orbit.target.clone(), fov: A.persp.fov, mode: A.mode, live: A.live, auto: ST.UI.auto, side: document.body.className };
    ST.UI.auto = false; A.setMode('orbit'); A.setConfig('electro'); A.simulate(14); ST.loadShow(buildShow()); A.setCurtainPerche?.(0, 0);
    C.crowd = makeCrowd(); C.ui = makeUI(); document.body.classList.add('cine'); dispatchEvent(new Event('resize'));
    $('#modal').style.display = 'none'; A.orbit.enabled = false; ST.setLive(true); ST.FXHOOK.mod = mod; C.sec = -1; C.cueI = -1; C.ending = false;
    // son
    try { C.ac = C.ac || new (window.AudioContext || window.webkitAudioContext)(); await C.ac.resume(); } catch (e){ C.ac = null; }
    if (opts.record) startRec(); $('#cineRec').style.display = C.rec ? 'block' : 'none';
    const lead = 1.2; C.p0 = performance.now() / 1000 + lead; C.t = -lead;
    if (C.ac && buf){ C.src = C.ac.createBufferSource(); C.src.buffer = buf; C.gain = C.ac.createGain(); C.gain.gain.value = .9; C.src.connect(C.gain); C.gain.connect(C.ac.destination); if (C.recDest) C.gain.connect(C.recDest); C.src.start(C.ac.currentTime + lead); }
    C.on = true; C.starting = false;
  }
  function startRec(){
    try { const vs = A.canvas.captureStream(30), tracks = [...vs.getVideoTracks()]; if (C.ac){ C.recDest = C.ac.createMediaStreamDestination(); tracks.push(...C.recDest.stream.getAudioTracks()); }
      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)); const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 12e6 }), chunks = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); }; rec.onstop = async () => { const blob = new Blob(chunks, { type: 'video/webm' }); if (blob.size > 1000){ await ST.saveFile('stagefactory-show-demo.webm', new Uint8Array(await blob.arrayBuffer())); ST.toast('Vidéo enregistrée : stagefactory-show-demo.webm'); } };
      rec.start(1000); C.rec = rec; } catch (e){ C.rec = null; ST.toast('L\'enregistrement vidéo n\'est pas disponible dans ce navigateur.', true); }
  }
  function stop(){
    if (!C.on) return; C.on = false; ST.FXHOOK.mod = null;
    try { C.src?.stop(); } catch (e){} C.src = null; if (C.rec){ try { C.rec.stop(); } catch (e){} C.rec = null; C.recDest = null; }
    if (C.crowd){ A.scene.remove(C.crowd.grp); for (const m of [C.crowd.body, C.crowd.head, C.crowd.arms]){ m.geometry.dispose(); m.material.dispose(); } C.crowd = null; }
    C.ui?.remove(); C.ui = null; document.body.classList.remove('cine');
    const k = C.cam; ST.loadShow(JSON.parse(C.saved)); A.store.set('show', C.saved); A.persp.fov = k.fov; A.persp.updateProjectionMatrix(); A.persp.position.copy(k.pos); A.orbit.target.copy(k.tg); A.setMode('orbit'); A.orbit.enabled = true; A.orbit.update(); ST.setLive(k.live); ST.UI.auto = false; ST.render();
    dispatchEvent(new Event('resize'));
  }
  A.hooks.update.unshift(() => {
    if (!C.on) return; C.t = performance.now() / 1000 - C.p0;
    const bar = C.t / BAR; if (C.t >= 0){ for (let i = CUEAT.length - 1; i > C.cueI; i--) if (bar >= CUEAT[i][0]){ C.cueI = i; window.ENG.go(0, CUEAT[i][1]); break; } const s = secAt(Math.floor(bar)); if (s !== C.sec){ C.sec = s; ledFor(SEC[s][0]); } }
    else if (C.cueI < 0 && C.t > -1){ C.cueI = 0; window.ENG.go(0, 0, { instant: true }); ledFor('intro'); C.sec = 0; }
    camera(); animCrowd(); title(); const pb = $('#cineBar'); if (pb) pb.style.width = Math.max(0, Math.min(100, C.t / DUR * 100)) + '%';
    if (C.t > DUR + 3.6) stop();
  });
  addEventListener('keydown', e => { if (C.on && e.key === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); stop(); } }, true);
  function ask(){ ST.modal(`<h1>Show démo</h1><div class="sub">Une minute de festival électro dans la salle de démonstration : musique composée sur place, lumière calée au temps près, public, caméra de film. Ton projet est mis de côté puis rétabli à la fin.</div>
    <div class="btns"><button class="b on" id="cineGo">▶ Lancer le show</button><button class="b" id="cineRecGo" title="Enregistre l'image et le son du show dans un fichier vidéo .webm">● Lancer et enregistrer la vidéo</button><button class="b" data-a="close">Annuler</button></div><div class="sub" style="margin-top:8px">Mets le son. Échap pour quitter à tout moment. Pour un rendu plus fin : menu Affichage → Qualité haute avant de lancer.</div>`);
    $('#cineGo').onclick = () => start(); $('#cineRecGo').onclick = () => start({ record: true }); }
  window.CINE = { start, stop, ask, C, mod, makeMusic, DUR };
}
