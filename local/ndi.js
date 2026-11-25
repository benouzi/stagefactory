// Récepteur NDI de StageFactory (version installée). Il appelle la bibliothèque NDI officielle, déjà sur l'ordinateur quand NDI Tools
// (gratuit) ou le « NDI Runtime » est installé : rien de NDI n'est embarqué ici. L'appel natif passe par koffi (node_modules).
// Structures et signatures : Processing.NDI.structs.h, .Find.h, .Recv.h du SDK NDI.
// Les images sont demandées en RGBA 8 bits, réduites au besoin, et gardées une par source pour la page (voir /api/ndi/* dans serveur.js).
'use strict';
const fs = require('fs'), path = require('path');
const ST = { lib: null, err: '', file: '', tried: false, find: null, findAt: 0, names: [], recv: new Map() };
let K = null, T = null, F = null;

function candidates(){ const L = [], W = process.platform === 'win32', M = process.platform === 'darwin', E = process.env;
  if (E.SF_NDI_LIB) L.push(E.SF_NDI_LIB);
  const name = W ? (process.arch === 'x64' ? 'Processing.NDI.Lib.x64.dll' : process.arch === 'arm64' ? 'Processing.NDI.Lib.ARM64.dll' : 'Processing.NDI.Lib.x86.dll') : M ? 'libndi.dylib' : 'libndi.so.6';
  for (const v of ['NDI_RUNTIME_DIR_V6', 'NDI_RUNTIME_DIR_V5', 'NDI_RUNTIME_DIR_V4', 'NDI_RUNTIME_DIR_V3']) if (E[v]) L.push(path.join(E[v], name));
  if (W) for (const pf of [E.ProgramFiles, E['ProgramW6432'], E['ProgramFiles(x86)']].filter(Boolean)) for (const d of ['NDI\\NDI 6 Runtime\\v6', 'NDI\\NDI 6 Tools\\Runtime', 'NDI\\NDI 5 Runtime\\v5', 'NDI\\NDI 5 Tools\\Runtime', 'NDI\\NDI 6 SDK\\Bin\\x64', 'NDI\\NDI 5 SDK\\Bin\\x64']) L.push(path.join(pf, d, name));
  if (M) L.push('/usr/local/lib/libndi.dylib', '/Library/NDI SDK for Apple/lib/macOS/libndi.dylib', '/Applications/NDI Video Monitor.app/Contents/Frameworks/libndi_advanced.dylib', '/Applications/NDI Tools/NDI Video Monitor.app/Contents/Frameworks/libndi_advanced.dylib');
  if (!W && !M) L.push('/usr/lib/libndi.so.6', '/usr/local/lib/libndi.so.6', '/usr/lib/libndi.so.5', '/usr/local/lib/libndi.so.5');
  return [...new Set(L)]; }

function load(){ if (ST.tried) return !!ST.lib; ST.tried = true;
  try { K = require('koffi'); } catch (e){ ST.err = 'module d\'appel natif (koffi) absent de cette installation : ' + e.message; return false; }
  const C = candidates(), found = C.filter(f => { try { return fs.existsSync(f); } catch (_){ return false; } });
  if (!found.length){ ST.err = 'bibliothèque NDI introuvable sur cet ordinateur. Installe NDI Tools (gratuit, ndi.video/tools) puis relance StageFactory.'; return false; }
  let lib = null, last = ''; for (const f of found){ try { lib = K.load(f); ST.file = f; break; } catch (e){ last = e.message; } }
  if (!lib){ ST.err = 'bibliothèque NDI trouvée mais impossible à charger : ' + last; return false; }
  try {
    const Source = K.struct('NDIlib_source_t', { p_ndi_name: 'const char *', p_url_address: 'const char *' });
    K.struct('NDIlib_find_create_t', { show_local_sources: 'bool', p_groups: 'const char *', p_extra_ips: 'const char *' });
    K.struct('NDIlib_recv_create_v3_t', { source_to_connect_to: Source, color_format: 'int', bandwidth: 'int', allow_video_fields: 'bool', p_ndi_recv_name: 'const char *' });
    const Frame = K.struct('NDIlib_video_frame_v2_t', { xres: 'int', yres: 'int', FourCC: 'int', frame_rate_N: 'int', frame_rate_D: 'int', picture_aspect_ratio: 'float', frame_format_type: 'int', timecode: 'int64_t', p_data: 'void *', line_stride_in_bytes: 'int', p_metadata: 'void *', timestamp: 'int64_t' });
    T = { Source, Frame };
    F = { init: lib.func('bool NDIlib_initialize()'), findCreate: lib.func('void *NDIlib_find_create_v2(const NDIlib_find_create_t *s)'), findWait: lib.func('bool NDIlib_find_wait_for_sources(void *i, uint32_t ms)'), findGet: lib.func('void *NDIlib_find_get_current_sources(void *i, _Out_ uint32_t *n)'),
      recvCreate: lib.func('void *NDIlib_recv_create_v3(const NDIlib_recv_create_v3_t *s)'), recvDestroy: lib.func('void NDIlib_recv_destroy(void *i)'), capture: lib.func('int NDIlib_recv_capture_v2(void *i, void *video, void *audio, void *meta, uint32_t ms)'), freeVideo: lib.func('void NDIlib_recv_free_video_v2(void *i, void *video)') };
    if (!F.init()){ ST.err = 'la bibliothèque NDI refuse de démarrer sur ce processeur (NDIlib_initialize a répondu non).'; return false; }
    ST.lib = lib; return true;
  } catch (e){ ST.err = 'bibliothèque NDI inattendue (' + path.basename(ST.file) + ') : ' + e.message; return false; } }

const status = () => { const ok = load(); return { ok, err: ok ? '' : ST.err, lib: ST.file, receivers: [...ST.recv.values()].map(r => ({ name: r.name, w: r.w, h: r.h, seq: r.seq, fps: r.fps })) }; };

// ---------------------------------------------------------------- les sources du réseau
function readSources(){ const n = [0], p = F.findGet(ST.find, n), out = []; if (p && n[0] > 0){ const arr = K.decode(p, K.array(T.Source, n[0])); for (const s of arr) if (s.p_ndi_name) out.push({ name: s.p_ndi_name, url: s.p_url_address || '' }); } ST.names = out; return out; }
function sources(wait){ return new Promise(res => { if (!load()) return res({ ok: false, err: ST.err, sources: [] });
  try { if (!ST.find){ ST.find = F.findCreate({ show_local_sources: true, p_groups: null, p_extra_ips: null }); if (!ST.find) return res({ ok: false, err: 'la recherche de sources NDI n\'a pas pu démarrer', sources: [] }); ST.findAt = Date.now(); wait = Math.max(wait || 0, 1500); }
    const done = () => { try { res({ ok: true, sources: readSources().map(s => s.name) }); } catch (e){ res({ ok: false, err: e.message, sources: [] }); } };
    if (wait > 0) F.findWait.async(ST.find, Math.min(wait, 5000), () => done()); else done();
  } catch (e){ res({ ok: false, err: e.message, sources: [] }); } }); }

// ---------------------------------------------------------------- recevoir une source
// bw : 'low' = flux d'aperçu NDI (petit, léger), sinon flux complet. maxW : largeur maximale gardée (0 = telle quelle).
function receiver(name, bw, maxW){ const key = name + '|' + bw + '|' + maxW; let r = ST.recv.get(key); if (r){ r.last = Date.now(); return r; }
  const src = ST.names.find(s => s.name === name) || { name, url: '' };
  const inst = F.recvCreate({ source_to_connect_to: { p_ndi_name: src.name, p_url_address: src.url || null }, color_format: 2 /* RGBX_RGBA */, bandwidth: bw === 'low' ? 0 : 100, allow_video_fields: false, p_ndi_recv_name: 'StageFactory' });
  if (!inst) throw new Error('impossible d\'ouvrir la source « ' + name + ' »');
  r = { key, name, inst, mem: K.alloc(T.Frame, 1), seq: 0, w: 0, h: 0, buf: null, last: Date.now(), at: 0, fps: 0, n0: 0, t0: Date.now(), waiters: [], dead: false, maxW };
  ST.recv.set(key, r); pump(r); return r; }
// fermer : jamais pendant qu'une capture est en cours dans son fil (la bibliothèque écrirait dans de la mémoire rendue) — on attend son retour
function release(r){ if (r.gone) return; r.gone = true; try { F.recvDestroy(r.inst); } catch (_){ } try { K.free(r.mem); } catch (_){ } }
function close(r){ if (r.dead) return; r.dead = true; ST.recv.delete(r.key); for (const w of r.waiters.splice(0)) w(null); if (!r.busy) release(r); }
function pump(r){ if (r.dead) return; if (Date.now() - r.last > 6000) return close(r);          // plus personne ne regarde cette source
  r.busy = true; F.capture.async(r.inst, r.mem, null, null, 250, (err, type) => { r.busy = false; if (r.dead){ if (!err && type === 1){ try { F.freeVideo(r.inst, r.mem); } catch (_){ } } return release(r); } if (err){ r.err = err.message; return close(r); }
    if (type === 1){ try { const v = K.decode(r.mem, T.Frame), W = v.xres, H = v.yres, st = v.line_stride_in_bytes, cc = v.FourCC >>> 0;
        if (v.p_data && W > 0 && H > 0 && (cc === 0x41424752 || cc === 0x58424752)){          // 'RGBA' ou 'RGBX'
          const src = new Uint8Array(K.view(v.p_data, st * H)), step = r.maxW > 0 && W > r.maxW ? Math.ceil(W / r.maxW) : 1, w = Math.floor(W / step), h = Math.floor(H / step), out = Buffer.allocUnsafe(w * h * 4);
          if (step === 1){ for (let y = 0; y < h; y++) out.set(src.subarray(y * st, y * st + w * 4), y * w * 4); for (let i = 3; i < out.length; i += 4) out[i] = 255; }
          else for (let y = 0, o = 0; y < h; y++){ let p = y * step * st; for (let x = 0; x < w; x++, p += step * 4, o += 4){ out[o] = src[p]; out[o + 1] = src[p + 1]; out[o + 2] = src[p + 2]; out[o + 3] = 255; } }
          r.buf = out; r.w = w; r.h = h; r.sw = W; r.sh = H; r.seq++; r.at = Date.now(); r.n0++; if (r.at - r.t0 >= 2000){ r.fps = Math.round(r.n0 * 1000 / (r.at - r.t0)); r.n0 = 0; r.t0 = r.at; }
          for (const wt of r.waiters.splice(0)) wt(r); }
        else r.err = 'format d\'image NDI inattendu (' + String.fromCharCode(cc & 255, cc >> 8 & 255, cc >> 16 & 255, cc >> 24 & 255) + ')';
      } catch (e){ r.err = e.message; } finally { try { F.freeVideo(r.inst, r.mem); } catch (_){ } } }
    setImmediate(() => pump(r)); }); }
// la prochaine image après « after » (attend au plus 1 s). Rend { r } ou { none: true } (rien de neuf) ou { err }.
function frame(name, after, bw, maxW){ return new Promise(res => { if (!load()) return res({ err: ST.err }); let r; try { r = receiver(name, bw, maxW); } catch (e){ return res({ err: e.message }); }
  if (r.seq > after && r.buf) return res({ r }); const t = setTimeout(() => { const i = r.waiters.indexOf(w); if (i >= 0) r.waiters.splice(i, 1); res(r.err && !r.buf ? { err: r.err } : { none: true, age: r.at ? Date.now() - r.at : -1 }); }, 1000), w = x => { clearTimeout(t); res(x ? { r: x } : { err: r.err || 'source fermée' }); }; r.waiters.push(w); }); }

module.exports = { status, sources, frame, _state: ST, _close: () => { for (const r of [...ST.recv.values()]) close(r); } };
