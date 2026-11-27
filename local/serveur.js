// StageFactory (ex-Onex Previz) : serveur local et passerelle DMX (Art-Net + sACN). Aucune dépendance : Node.js suffit.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), dgram = require('dgram'), crypto = require('crypto'), os = require('os'), { exec } = require('child_process');
const ROOT = path.join(__dirname, 'app'), PORT0 = +process.env.PORT || 8765, NOOPEN = process.argv.includes('--no-open'), APPMODE = process.argv.includes('--app');
const ART_PORT = +process.env.ARTNET_PORT || 6454, SACN_PORT = +process.env.SACN_PORT || 5568;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

// ------------------------------------------------------------------ pages
// ---------------------------------------------------------------- bibliothèques de projecteurs : dossier Titan (.d4) et GDTF Share
const https = require('https'), GDTF_BASE = process.env.GDTF_BASE || 'https://gdtf-share.com/apis/public/', LIBS = { titan: null, cookies: '', gdtf: null };
const jsonOut = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
function titanScan(){
  if (LIBS.titan) return LIBS.titan; const pf = [process.env.TITAN_LIB, process.env['ProgramFiles'] && path.join(process.env['ProgramFiles'], 'Avolites', 'Titan', 'FixtureLibrary'), process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Avolites', 'Titan', 'FixtureLibrary'), path.join(os.homedir(), 'Documents', 'Titan', 'Personalities')].filter(Boolean);
  const files = {}, dirs = []; for (const d of pf){ let l; try { l = fs.readdirSync(d); } catch (_){ continue; } dirs.push(d); for (const n of l) if (/\.d4$/i.test(n) && !files[n]) files[n] = path.join(d, n); }
  return LIBS.titan = { dirs, files };
}
function gdtfReq(method, file, body, form){ return new Promise((ok, ko) => { const u = new URL(file, GDTF_BASE), lib = u.protocol === 'http:' ? http : https, data = body ? Buffer.from(form ? new URLSearchParams(body).toString() : JSON.stringify(body)) : null;
  const r = lib.request(u, { method, timeout: 30000, headers: { 'User-Agent': 'StageFactory', ...(LIBS.cookies ? { Cookie: LIBS.cookies } : {}), ...(data ? { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json', 'Content-Length': data.length } : {}) } }, q => { const ch = []; q.on('data', c => ch.push(c)); q.on('end', () => { const sc = q.headers['set-cookie']; if (sc) LIBS.cookies = sc.map(c => c.split(';')[0]).join('; '); ok({ code: q.statusCode, type: q.headers['content-type'] || '', buf: Buffer.concat(ch) }); }); });
  r.on('timeout', () => r.destroy(new Error('délai dépassé'))); r.on('error', ko); if (data) r.write(data); r.end(); }); }
// ---------------------------------------------------------------- assistant IA : la clé API de l'utilisateur reste sur cet ordinateur, la page ne la revoit jamais
// le dossier de réglages garde le nom d'Onex Previz : la clé API et le connecteur déjà en place restent valables
const CFG_FILE = path.join(process.env.APPDATA || path.join(os.homedir(), '.config'), 'OnexPreviz', 'config.json'), AI_BASE = process.env.AI_BASE || 'https://api.anthropic.com/v1/messages', AI_MODEL = 'claude-sonnet-5-5';
const cfgRead = () => { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch (_){ return {}; } }, cfgWrite = c => { fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true }); fs.writeFileSync(CFG_FILE, JSON.stringify(c), { mode: 0o600 }); };
const bodyOf = req => new Promise(ok => { const ch = []; let n = 0; req.on('data', c => { n += c.length; if (n < 6e7) ch.push(c); });   // large : le créateur de salle envoie des pages de plans en image
  req.on('end', () => { try { ok(JSON.parse(Buffer.concat(ch).toString() || '{}')); } catch (_){ ok({}); } }); });
function aiRoute(p, req, res){
  const o = req.headers.origin; if (o && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return jsonOut(res, 403, { error: 'origine refusée' });
  const c = cfgRead();
  if (p === '/api/ai/status') return jsonOut(res, 200, { hasKey: !!c.aiKey, model: c.aiModel || AI_MODEL, tail: c.aiKey ? c.aiKey.slice(-4) : '' });
  if (p === '/api/ai/key' && req.method === 'POST') return void bodyOf(req).then(b => { const k = String(b.key || '').trim(); if (b.clear){ delete c.aiKey; } else if (k){ if (!/^[\w\-]{20,300}$/.test(k)) return jsonOut(res, 200, { ok: false, error: 'Cette clé n\'a pas la forme attendue.' }); c.aiKey = k; } if (b.model) c.aiModel = String(b.model).trim().slice(0, 80); try { cfgWrite(c); } catch (e){ return jsonOut(res, 200, { ok: false, error: 'Écriture impossible : ' + e.message }); } jsonOut(res, 200, { ok: true, hasKey: !!c.aiKey, model: c.aiModel || AI_MODEL }); });
  if (p === '/api/ai/chat' && req.method === 'POST') return void bodyOf(req).then(b => { if (!c.aiKey) return jsonOut(res, 200, { error: 'Aucune clé API enregistrée.', code: 'no_key' });
    const data = Buffer.from(JSON.stringify({ model: c.aiModel || AI_MODEL, max_tokens: Math.max(500, Math.min(16000, +b.max_tokens || 2000)), system: String(b.system || ''), messages: b.messages || [], tools: b.tools || [] })), u = new URL(AI_BASE), lib = u.protocol === 'http:' ? http : https;
    const r = lib.request(u, { method: 'POST', timeout: 300000, headers: { 'content-type': 'application/json', 'content-length': data.length, 'x-api-key': c.aiKey, 'anthropic-version': '2023-06-01' } }, q => { const ch = []; q.on('data', d => ch.push(d)); q.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(ch).toString()); } catch (_){ }
      if (q.statusCode !== 200 || !j) return jsonOut(res, 200, { error: (j && j.error && j.error.message) || ('réponse ' + q.statusCode), code: q.statusCode === 401 ? 'bad_key' : q.statusCode === 404 ? 'bad_model' : q.statusCode === 429 ? 'rate_limited' : 'api' }); jsonOut(res, 200, { content: j.content || [], stop: j.stop_reason, usage: j.usage || null }); }); });
    r.on('timeout', () => r.destroy(new Error('délai dépassé'))); r.on('error', e => jsonOut(res, 200, { error: 'Service injoignable : ' + e.message, code: 'network' })); r.write(data); r.end(); });
  jsonOut(res, 404, { error: 'inconnu' });
}
// ---------------------------------------------------------------- rendu IA de la vue 3D : modèles d'image de Google (« Nano Banana »), clé Google gardée ici comme celle de l'assistant
const IMG_BASE = process.env.IMG_BASE || 'https://generativelanguage.googleapis.com/v1beta/models/', IMG_MODELS = ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-3.1-flash-lite-image'], IMG_WAIT = +process.env.IMG_WAIT || 2500;
function imgRoute(p, req, res){
  const o = req.headers.origin; if (o && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return jsonOut(res, 403, { error: 'origine refusée' });
  const c = cfgRead();
  if (p === '/api/img/status') return jsonOut(res, 200, { hasKey: !!c.imgKey, model: c.imgModel || IMG_MODELS[0], models: IMG_MODELS, tail: c.imgKey ? c.imgKey.slice(-4) : '' });
  if (p === '/api/img/key' && req.method === 'POST') return void bodyOf(req).then(b => { const k = String(b.key || '').trim(); if (b.clear){ delete c.imgKey; } else { if (!/^[\w\-.]{20,300}$/.test(k)) return jsonOut(res, 200, { ok: false, error: 'Cette clé n\'a pas la forme attendue.' }); c.imgKey = k; }
    try { cfgWrite(c); } catch (e){ return jsonOut(res, 200, { ok: false, error: 'Écriture impossible : ' + e.message }); } jsonOut(res, 200, { ok: true, hasKey: !!c.imgKey }); });
  if (p === '/api/img/gen' && req.method === 'POST') return void bodyOf(req).then(b => { if (!c.imgKey) return jsonOut(res, 200, { error: 'Aucune clé Google enregistrée.', code: 'no_key' });
    const model = String(b.model || c.imgModel || IMG_MODELS[0]).trim(); if (!/^[\w.\-]{3,80}$/.test(model)) return jsonOut(res, 200, { error: 'Nom de modèle invalide.', code: 'bad_model' });
    if (typeof b.image !== 'string' || !/^image\/(png|jpeg|webp)$/.test(b.mime || '') || !b.prompt) return jsonOut(res, 200, { error: 'Demande incomplète.', code: 'bad_request' });
    const data = Buffer.from(JSON.stringify({ contents: [{ parts: [{ text: String(b.prompt).slice(0, 6000) }, { inline_data: { mime_type: b.mime, data: b.image } }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }));
    // un appel à Google pour un modèle donné ; rend { sc, j } (sc = 0 : réseau)
    const call = (mdl, done) => { const u = new URL(IMG_BASE + encodeURIComponent(mdl) + ':generateContent'), lib = u.protocol === 'http:' ? http : https; let fin = false; const end = x => { if (!fin){ fin = true; done(x); } };
      const r = lib.request(u, { method: 'POST', timeout: 240000, headers: { 'content-type': 'application/json', 'content-length': data.length, 'x-goog-api-key': c.imgKey } }, q => { const ch = []; q.on('data', d => ch.push(d)); q.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(ch).toString()); } catch (_){ } end({ sc: q.statusCode, j }); }); });
      r.on('timeout', () => r.destroy(new Error('délai dépassé'))); r.on('error', e => end({ sc: 0, net: e.message })); r.write(data); r.end(); };
    // Google surchargé (503, 500, 529) : on réessaie une fois le même modèle, puis les autres modèles de la liste, avant de renoncer
    const busy = x => x.sc === 503 || x.sc === 500 || x.sc === 529 || (x.j && x.j.error && /overloaded|high demand|unavailable/i.test(x.j.error.message || '')), plan = [model, model, ...IMG_MODELS.filter(m => m !== model)], tried = [];
    const step = i => call(plan[i], x => { const mdl = plan[i]; if (busy(x) && i + 1 < plan.length){ tried.push(mdl); return void setTimeout(() => step(i + 1), i === 0 ? IMG_WAIT : 400); }
      const j = x.j, sc = x.sc, m = (j && j.error && j.error.message) || (x.net ? x.net : 'réponse ' + sc), was = tried.length ? ' (essayé : ' + [...new Set([...tried, mdl])].join(', ') + ')' : '';
      if (sc === 0) return jsonOut(res, 200, { code: 'network', error: 'Google injoignable : ' + m + '. Vérifie la connexion Internet de cet ordinateur.' });
      if (sc !== 200 || !j){
        if (busy(x)) return jsonOut(res, 200, { code: 'busy', error: 'Les serveurs de Google sont surchargés en ce moment' + was + '. Ce n\'est ni ta clé ni le logiciel : réessaie dans quelques minutes.' });
        if (sc === 404) return jsonOut(res, 200, { code: 'bad_model', error: 'Google ne connaît pas (ou plus) le modèle « ' + mdl + ' » : choisis-en un autre dans la liste, ou tape le nom affiché dans Google AI Studio.' });
        if (sc === 429) return jsonOut(res, 200, { code: 'rate_limited', error: (/limit:\s*0|free.?tier|billing/i.test(m) ? 'Cette clé Google n\'a pas de quota pour les modèles d\'image : ils ne sont pas compris dans l\'offre gratuite. Active la facturation du projet dans Google AI Studio (Paramètres → Facturation), puis réessaie.' : 'Quota Google dépassé ou trop de demandes d\'un coup : attends une minute et réessaie.') + ' (' + String(m).slice(0, 220) + ')' });
        if (sc === 401 || sc === 403 || /api key not valid|API_KEY_INVALID|permission/i.test(m)) return jsonOut(res, 200, { code: 'bad_key', error: 'Google refuse cette clé : elle est fausse, supprimée, ou n\'a pas le droit d\'utiliser l\'API Gemini. « Oublier la clé Google », puis colle une clé neuve créée dans Google AI Studio. (' + String(m).slice(0, 220) + ')' });
        return jsonOut(res, 200, { code: 'api', error: 'Google a refusé la demande (' + sc + ') : ' + String(m).slice(0, 300) }); }
      const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [], im = parts.find(q => q.inlineData || q.inline_data), d = im && (im.inlineData || im.inline_data);
      if (!d) return jsonOut(res, 200, { code: 'no_image', error: 'Le modèle n\'a pas renvoyé d\'image' + ((parts.find(q => q.text) || {}).text ? ' : ' + String(parts.find(q => q.text).text).slice(0, 300) : (j.promptFeedback && j.promptFeedback.blockReason ? ' (demande bloquée : ' + j.promptFeedback.blockReason + ')' : (j.candidates && j.candidates[0] && j.candidates[0].finishReason ? ' (arrêt : ' + j.candidates[0].finishReason + ')' : '.'))) });
      if (mdl === model && model !== c.imgModel){ c.imgModel = model; try { cfgWrite(c); } catch (_){ } }          // on ne retient un nom de modèle que s'il a marché, et seulement celui qui a été demandé
      jsonOut(res, 200, { image: d.data, mime: d.mimeType || d.mime_type || 'image/png', model: mdl, fallback: mdl !== model ? model : undefined }); });
    step(0); });
  jsonOut(res, 404, { error: 'inconnu' });
}
// ---------------------------------------------------------------- connecteur Claude (MCP) : mcp.js dépose des appels d'outils, la fenêtre les exécute
const MCP = { q: [], wait: null, pend: new Map(), n: 0, lastPoll: 0, tools: null }, MCP_CACHE = path.join(path.dirname(CFG_FILE), 'mcp-tools.json');
function mcpRoute(p, req, res){
  const o = req.headers.origin; if (o && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return jsonOut(res, 403, { error: 'origine refusée' });
  if (p === '/api/mcp/info') return jsonOut(res, 200, { node: process.execPath, script: path.join(__dirname, 'mcp.js'), window: Date.now() - MCP.lastPoll < 40000, tools: (MCP.tools || []).length, platform: process.platform });
  if (p === '/api/mcp/tools') return jsonOut(res, 200, { tools: MCP.tools || [] });
  if (p === '/api/mcp/register' && req.method === 'POST') return void bodyOf(req).then(b => { if (Array.isArray(b.tools)){ MCP.tools = b.tools; try { fs.mkdirSync(path.dirname(MCP_CACHE), { recursive: true }); fs.writeFileSync(MCP_CACHE, JSON.stringify(b.tools)); } catch (_){ } } jsonOut(res, 200, { ok: true }); });
  if (p === '/api/mcp/next'){ MCP.lastPoll = Date.now(); if (MCP.q.length) return jsonOut(res, 200, MCP.q.shift()); if (MCP.wait){ try { jsonOut(MCP.wait.res, 200, {}); } catch (_){ } clearTimeout(MCP.wait.t); } const w = { res, t: setTimeout(() => { if (MCP.wait === w){ MCP.wait = null; MCP.lastPoll = Date.now(); jsonOut(res, 200, {}); } }, 25000) }; MCP.wait = w; req.on('close', () => { if (MCP.wait === w){ clearTimeout(w.t); MCP.wait = null; } }); return; }
  if (p === '/api/mcp/result' && req.method === 'POST') return void bodyOf(req).then(b => { const h = MCP.pend.get(b.id); if (h){ MCP.pend.delete(b.id); clearTimeout(h.t); jsonOut(h.res, 200, b.error ? { error: String(b.error) } : { result: b.result }); } jsonOut(res, 200, { ok: true }); });
  if (p === '/api/mcp/call' && req.method === 'POST') return void bodyOf(req).then(b => { if (!MCP.wait && Date.now() - MCP.lastPoll > 40000) return jsonOut(res, 200, { error: 'fenêtre fermée', code: 'no_window' });
    const job = { id: 'm' + (++MCP.n), name: String(b.name || ''), args: b.args || {} }; MCP.pend.set(job.id, { res, t: setTimeout(() => { if (MCP.pend.delete(job.id)) jsonOut(res, 200, { error: 'StageFactory n\'a pas répondu à temps.' }); }, 80000) });
    if (MCP.wait){ const w = MCP.wait; MCP.wait = null; clearTimeout(w.t); jsonOut(w.res, 200, job); } else MCP.q.push(job); });
  jsonOut(res, 404, { error: 'inconnu' });
}
// ---------------------------------------------------------------- salles enregistrées (dimensions, perches, matériel fixe, parc) : un fichier du dossier de réglages
const VEN_FILE = path.join(path.dirname(CFG_FILE), 'venues.json');
function venueRoute(p, req, res){
  const o = req.headers.origin; if (o && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return jsonOut(res, 403, { error: 'origine refusée' });
  if (req.method === 'GET'){ let v = {}; try { v = JSON.parse(fs.readFileSync(VEN_FILE, 'utf8')); } catch (_){ } return jsonOut(res, 200, { venues: v && typeof v === 'object' ? v : {} }); }
  if (req.method === 'POST') return void bodyOf(req).then(b => { if (!b.venues || typeof b.venues !== 'object') return jsonOut(res, 200, { ok: false, error: 'contenu attendu : venues' });
    try { fs.mkdirSync(path.dirname(VEN_FILE), { recursive: true }); const tmp = VEN_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(b.venues)); try { if (fs.existsSync(VEN_FILE)) fs.copyFileSync(VEN_FILE, VEN_FILE + '.bak'); } catch (_){ } fs.renameSync(tmp, VEN_FILE); jsonOut(res, 200, { ok: true }); } catch (e){ jsonOut(res, 200, { ok: false, error: e.message }); } });
  jsonOut(res, 404, { error: 'inconnu' });
}
function libRoute(p, req, res){
  const o = req.headers.origin; if (o && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return jsonOut(res, 403, { error: 'origine refusée' });
  const q = new URL(req.url, 'http://x').searchParams;
  if (p === '/api/lib/titan/list'){ if (q.get('refresh')) LIBS.titan = null; const t = titanScan(); return jsonOut(res, 200, { dirs: t.dirs, files: Object.keys(t.files).sort((a, b) => a.localeCompare(b)) }); }
  if (p === '/api/lib/titan/get'){ const f = titanScan().files[q.get('f') || '']; if (!f) return jsonOut(res, 404, { error: 'fichier inconnu' }); return fs.readFile(f, (e, d) => { if (e) return jsonOut(res, 500, { error: e.message }); res.writeHead(200, { 'Content-Type': 'application/xml' }); res.end(d); }); }
  if (p === '/api/lib/gdtf/login' && req.method === 'POST'){ const ch = []; req.on('data', c => ch.push(c)); return req.on('end', async () => { try { const b = JSON.parse(Buffer.concat(ch).toString() || '{}'); LIBS.cookies = ''; LIBS.gdtf = null; const cred = { user: String(b.user || ''), password: String(b.password || '') }; let r = await gdtfReq('POST', 'login.php', cred), j = {}; try { j = JSON.parse(r.buf.toString()); } catch (_){ }
      /* le service a deux façons connues de recevoir les identifiants : en JSON (sa documentation) ou en formulaire (ce que fait le client libre BlenderDMX). Si la première est refusée, on essaie la seconde. */
      if (!(r.code === 200 && j.result)){ LIBS.cookies = ''; const r2 = await gdtfReq('POST', 'login.php', cred, true); let j2 = {}; try { j2 = JSON.parse(r2.buf.toString()); } catch (_){ } if (r2.code === 200 && j2.result){ r = r2; j = j2; } }
      if (r.code === 200 && j.result) return jsonOut(res, 200, { ok: true, notice: j.notice || '' }); LIBS.cookies = ''; jsonOut(res, 200, { ok: false, error: j.error || ('réponse ' + r.code) }); } catch (e){ jsonOut(res, 200, { ok: false, error: 'GDTF Share injoignable : ' + e.message }); } }); }
  if (p === '/api/lib/gdtf/list') return void (async () => { try { if (!LIBS.gdtf || q.get('refresh')){ const r = await gdtfReq('GET', 'getList.php'); let j = {}; try { j = JSON.parse(r.buf.toString()); } catch (_){ } if (r.code !== 200 || !j.result || !Array.isArray(j.list)) return jsonOut(res, 200, { ok: false, login: r.code === 401 || !LIBS.cookies, error: j.error || ('réponse ' + r.code) });
        LIBS.gdtf = j.list.map(e => ({ rid: e.rid, m: e.manufacturer || '', f: e.fixture || '', rev: e.revision || '', up: e.uploader || '', mod: e.lastModified || 0, modes: Array.isArray(e.modes) ? e.modes.map(m => [m.name, m.dmxfootprint]) : [] })); }
      jsonOut(res, 200, { ok: true, list: LIBS.gdtf }); } catch (e){ jsonOut(res, 200, { ok: false, error: 'GDTF Share injoignable : ' + e.message }); } })();
  if (p === '/api/lib/gdtf/get') return void (async () => { try { const rid = parseInt(q.get('rid')); if (!(rid > 0)) return jsonOut(res, 400, { error: 'rid manquant' }); const r = await gdtfReq('GET', 'downloadFile.php?rid=' + rid); if (r.code !== 200 || /json/.test(r.type) || r.buf.length < 100) return jsonOut(res, 502, { error: 'téléchargement refusé (' + r.code + ')' }); res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); res.end(r.buf); } catch (e){ jsonOut(res, 502, { error: e.message }); } })();
  jsonOut(res, 404, { error: 'inconnu' });
}
// ------------------------------------------------------------------ NDI (récepteur natif, voir ndi.js)
// /api/ndi/status · /api/ndi/sources?wait=ms · /api/ndi/frame?src=NOM&after=N&w=LARGEUR&bw=low|high → image RGBA brute (en-têtes X-W, X-H, X-Seq), 204 si rien de neuf
let NDI = null; const ndiMod = () => { if (NDI === null){ try { NDI = require('./ndi.js'); } catch (e){ NDI = { status: () => ({ ok: false, err: 'récepteur NDI absent de cette installation : ' + e.message }), sources: async () => ({ ok: false, err: e.message, sources: [] }), frame: async () => ({ err: e.message }) }; } } return NDI; };
function ndiRoute(p, req, res){ const q = new URL(req.url, 'http://x').searchParams, N = ndiMod();
  if (p === '/api/ndi/status') return jsonOut(res, 200, N.status());
  if (p === '/api/ndi/sources') return void N.sources(Math.max(0, Math.min(5000, +q.get('wait') || 0))).then(r => jsonOut(res, 200, r)).catch(e => jsonOut(res, 200, { ok: false, err: e.message, sources: [] }));
  if (p === '/api/ndi/frame'){ const src = q.get('src') || ''; if (!src) return jsonOut(res, 400, { err: 'source manquante' }); const w = Math.max(0, Math.min(3840, +q.get('w') || 0));
    return void N.frame(src, +q.get('after') || 0, q.get('bw') === 'low' ? 'low' : 'high', w).then(r => { if (r.err) return jsonOut(res, 502, { err: r.err }); if (r.none){ res.writeHead(204, { 'X-Age': String(r.age), 'Cache-Control': 'no-store' }); return res.end(); }
      const f = r.r; res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': f.buf.length, 'X-W': f.w, 'X-H': f.h, 'X-Seq': f.seq, 'X-Src-W': f.sw, 'X-Src-H': f.sh, 'X-Fps': f.fps, 'Cache-Control': 'no-store' }); res.end(f.buf); }).catch(e => jsonOut(res, 502, { err: e.message })); }
  jsonOut(res, 404, { err: 'inconnu' }); }
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  if (p === '/__onex'){ res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('onex'); }
  if (p.startsWith('/api/lib/')) return libRoute(p, req, res);
  if (p === '/api/venues') return venueRoute(p, req, res);
  if (p.startsWith('/api/ai/')) return aiRoute(p, req, res);
  if (p.startsWith('/api/img/')) return imgRoute(p, req, res);
  if (p.startsWith('/api/mcp/')) return mcpRoute(p, req, res);
  if (p.startsWith('/api/ndi/')) return ndiRoute(p, req, res);
  const f = path.normalize(path.join(ROOT, p)); if (!f.startsWith(ROOT)){ res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, data) => { if (e){ res.writeHead(404); return res.end('Introuvable'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data); });
});

// ------------------------------------------------------------------ WebSocket minimal (RFC 6455)
const clients = new Set(); let hadClient = false, quitT = 0;
function frame(data, binary){ const n = data.length, h = n < 126 ? Buffer.from([binary ? 0x82 : 0x81, n]) : n < 65536 ? Buffer.from([binary ? 0x82 : 0x81, 126, n >> 8, n & 255]) : null; return h ? Buffer.concat([h, data]) : null; }
const sendAll = (data, binary) => { const f = frame(data, binary); if (f) for (const c of clients) if (c.writable) c.write(f); };
server.on('upgrade', (req, sock) => {
  if (req.url.split('?')[0] !== '/dmx' || !req.headers['sec-websocket-key']) return sock.destroy();
  const origin = req.headers.origin || ''; if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return sock.destroy();      // seule la page locale peut se connecter
  const key = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + key + '\r\n\r\n');
  sock.setNoDelay(true); clients.add(sock); hadClient = true; clearTimeout(quitT); log('Application connectée.'); status();
  let buf = Buffer.alloc(0);
  sock.on('data', d => { buf = Buffer.concat([buf, d]);
    while (buf.length >= 2){ const op = buf[0] & 15, masked = buf[1] & 128; let n = buf[1] & 127, o = 2; if (n === 126){ if (buf.length < 4) return; n = buf.readUInt16BE(2); o = 4; } else if (n === 127){ return sock.destroy(); }
      const need = o + (masked ? 4 : 0) + n; if (buf.length < need) return; const mask = masked ? buf.subarray(o, o + 4) : null; o += masked ? 4 : 0; const pl = Buffer.from(buf.subarray(o, o + n)); if (mask) for (let i = 0; i < n; i++) pl[i] ^= mask[i & 3]; buf = buf.subarray(need);
      if (op === 8) return sock.end(); if (op === 9){ sock.write(Buffer.concat([Buffer.from([0x8a, pl.length]), pl])); continue; }
      if (op === 1){ try { onMessage(JSON.parse(pl.toString('utf8'))); } catch (_){} } else if (op === 2) onBinary(pl); } });
  const bye = () => { if (clients.delete(sock)) log('Application déconnectée.'); if (APPMODE && hadClient && !clients.size){ clearTimeout(quitT); quitT = setTimeout(() => { if (!clients.size){ log('Fenêtre fermée : arrêt.'); process.exit(0); } }, 12000); } }; sock.on('close', bye); sock.on('error', bye);
});

// ------------------------------------------------------------------ réception DMX
const cfg = { sacn: [1, 2, 3, 4], artOff: 1 }, sources = new Map(), state = { artnet: { port: ART_PORT, ok: false, err: '' }, sacn: { port: SACN_PORT, ok: false, err: '' } };
const last = new Map();
function push(universe, proto, data, rinfo, name){
  if (universe < 0 || universe > 63999) return; const k = rinfo.address + '/' + proto; let s = sources.get(k); if (!s){ s = { ip: rinfo.address, proto, name: name || '', n: 0 }; sources.set(k, s); log(`Source ${proto} : ${rinfo.address}${name ? ' (' + name + ')' : ''}`); status(); } s.n++; s.t = Date.now(); if (name) s.name = name;
  const out = Buffer.alloc(516); out[0] = 1; out[1] = universe & 255; out[2] = universe >> 8; out[3] = proto === 'sACN' ? 1 : 0; data.copy(out, 4, 0, Math.min(512, data.length));
  const prev = last.get(universe), now = Date.now(); if (prev && now - prev.t < 400 && prev.b.equals(out)) return; last.set(universe, { b: out, t: now }); sendAll(out, true);
}
const ifaces = () => Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
const art = dgram.createSocket({ type: 'udp4', reuseAddr: true });
art.on('error', e => { state.artnet.ok = false; state.artnet.err = e.code === 'EADDRINUSE' ? 'port déjà utilisé par un autre logiciel sur ce poste' : e.message; log('Art-Net :', state.artnet.err); status(); });
art.on('message', (m, r) => {
  if (m.length < 12 || m.toString('latin1', 0, 8) !== 'Art-Net\0') return; const op = m.readUInt16LE(8);
  if (op === 0x5000 && m.length >= 18){ const uni = (m[15] & 0x7f) << 8 | m[14], len = Math.min(512, m.readUInt16BE(16)); push(uni + cfg.artOff, 'Art-Net', m.subarray(18, 18 + len), r); }
  else if (op === 0x2000) pollReply(r);
});
function pollReply(r){                                                // la console nous voit comme un nœud Art-Net
  const ip = (ifaces()[0] || '127.0.0.1').split('.').map(Number), b = Buffer.alloc(239); b.write('Art-Net\0', 0, 'latin1'); b.writeUInt16LE(0x2100, 8); b.set(ip, 10); b.writeUInt16LE(0x1936, 14);
  b.write('StageFactory', 26, 'latin1'); b.write('StageFactory - previsualisation 3D', 44, 'latin1'); b.writeUInt16BE(1, 172); b[174] = 0x80; b[190] = 0; b[211] = 0;
  art.send(b, ART_PORT, r.address, () => {});
}
art.bind(ART_PORT, () => { state.artnet.ok = true; try { art.setBroadcast(true); } catch (_){} log('Art-Net à l\'écoute sur le port', ART_PORT); status(); });

const sacn = dgram.createSocket({ type: 'udp4', reuseAddr: true }); let joined = new Set();
sacn.on('error', e => { state.sacn.ok = false; state.sacn.err = e.code === 'EADDRINUSE' ? 'port déjà utilisé par un autre logiciel sur ce poste' : e.message; log('sACN :', state.sacn.err); status(); });
sacn.on('message', (m, r) => {
  if (m.length < 126 || m.toString('latin1', 4, 13) !== 'ASC-E1.17' || m.readUInt32BE(18) !== 4 || m.readUInt32BE(40) !== 2 || m[117] !== 2 || m[125] !== 0) return;
  const uni = m.readUInt16BE(113), n = Math.min(512, m.readUInt16BE(123) - 1), name = m.toString('utf8', 44, 108).replace(/\0.*$/, ''); push(uni, 'sACN', m.subarray(126, 126 + n), r, name);
});
function joinSacn(){ if (!state.sacn.ok) return; const want = new Set(cfg.sacn);
  for (const u of joined) if (!want.has(u)){ for (const a of ['0.0.0.0', ...ifaces()]) try { sacn.dropMembership(`239.255.${u >> 8}.${u & 255}`, a === '0.0.0.0' ? undefined : a); } catch (_){} }
  for (const u of want) if (!joined.has(u)){ try { sacn.addMembership(`239.255.${u >> 8}.${u & 255}`); } catch (_){} for (const a of ifaces()) try { sacn.addMembership(`239.255.${u >> 8}.${u & 255}`, a); } catch (_){} }
  joined = want; }
sacn.bind(SACN_PORT, () => { state.sacn.ok = true; log('sACN à l\'écoute sur le port', SACN_PORT, '— univers', cfg.sacn.join(', ')); joinSacn(); status(); });

function parseList(s){ const out = new Set(); for (const part of String(s || '').split(/[;,\s]+/)){ const m = part.match(/^(\d+)(?:-(\d+))?$/); if (!m) continue; for (let u = +m[1]; u <= +(m[2] || m[1]) && out.size < 64; u++) if (u >= 1 && u <= 63999) out.add(u); } return [...out]; }
function onMessage(m){ if (m.t === 'cfg'){ const l = parseList(m.sacn); if (l.length) cfg.sacn = l; if (m.artOff === 0 || m.artOff === 1) cfg.artOff = m.artOff; joinSacn(); log('Réglages : sACN', cfg.sacn.join(', '), '· Art-Net 0 → univers', cfg.artOff); status(); } }
// envoi (prévu pour la suite : piloter des consoles ou des projecteurs depuis l'application)
let seq = 1;
function onBinary(b){ if (b[0] !== 2 || b.length < 516 || !state.artnet.ok) return; const uni = (b[1] | b[2] << 8) - cfg.artOff; if (uni < 0) return;
  const p = Buffer.alloc(530); p.write('Art-Net\0', 0, 'latin1'); p.writeUInt16LE(0x5000, 8); p.writeUInt16BE(14, 10); p[12] = seq = seq % 255 + 1; p[14] = uni & 255; p[15] = uni >> 8; p.writeUInt16BE(512, 16); b.copy(p, 18, 4, 516); art.send(p, ART_PORT, process.env.ARTNET_TARGET || '255.255.255.255', () => {}); }
function status(){ const now = Date.now(); sendAll(Buffer.from(JSON.stringify({ t: 'status', version: 1, artnet: state.artnet, sacn: state.sacn, ifaces: ifaces(), cfg, sources: [...sources.values()].filter(s => now - s.t < 5000).map(s => ({ ip: s.ip, proto: s.proto, name: s.name })) })), false); }
setInterval(status, 1500);

// ------------------------------------------------------------------ démarrage
// ouvre l'application dans une fenêtre dédiée (Chrome ou Edge en mode application), sinon dans le navigateur par défaut
function openUI(url){
  if (NOOPEN) return; const { spawn } = require('child_process'), W = process.platform === 'win32', M = process.platform === 'darwin';
  const fallback = () => exec(W ? `start "" "${url}"` : M ? `open "${url}"` : `xdg-open "${url}"`, () => {});
  if (W){ const pf = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)'], process.env['LOCALAPPDATA']].filter(Boolean), c = [];
    for (const d of pf){ c.push(path.join(d, 'Google', 'Chrome', 'Application', 'chrome.exe')); c.push(path.join(d, 'Microsoft', 'Edge', 'Application', 'msedge.exe')); }
    const exe = c.find(f => fs.existsSync(f)); if (!exe) return fallback();
    try { spawn(exe, ['--app=' + url, '--start-maximized'], { detached: true, stdio: 'ignore' }).unref(); } catch (_){ fallback(); } }
  else if (M){ const apps = ['Google Chrome', 'Microsoft Edge', 'Brave Browser', 'Chromium'], home = os.homedir(), a = apps.find(n => fs.existsSync(`/Applications/${n}.app`) || fs.existsSync(`${home}/Applications/${n}.app`));
    if (!a) return fallback(); exec(`open -na "${a}" --args --app="${url}" --window-position=0,0 --window-size=1280,800`, e => { if (e) fallback(); }); }
  else fallback();
}
function listen(port, tries){
  server.once('error', e => {
    if (e.code !== 'EADDRINUSE' || tries <= 0){ console.error('Impossible de démarrer :', e.message); process.exit(1); }
    http.get({ host: '127.0.0.1', port, path: '/__onex', timeout: 1500 }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { if (d === 'onex'){ console.log('Déjà lancé : ouverture de la fenêtre.'); openUI('http://localhost:' + port); setTimeout(() => process.exit(0), 1500); } else listen(port + 1, tries - 1); }); }).on('error', () => listen(port + 1, tries - 1));
  });
  server.listen(port, '127.0.0.1', () => { const url = 'http://localhost:' + port; console.log('\n  StageFactory\n  Adresse : ' + url + '\n  Ce programme fait la passerelle DMX : il s\'arrête quand tu fermes la fenêtre de l\'application.\n');
    const a = ifaces(); if (a.length) console.log('  Adresse(s) réseau de ce poste, à viser depuis la console : ' + a.join(', ') + '\n'); openUI(url); });
}
listen(PORT0, 10);
