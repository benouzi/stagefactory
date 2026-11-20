// Connecteur MCP de StageFactory (ex-Onex Previz) pour l'application Claude de bureau (transport stdio, sans dépendance).
// Claude lance ce fichier ; il relaie les appels d'outils vers la fenêtre StageFactory ouverte, via la passerelle locale.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const VERSION = '1.3.0', PORTS = [+process.env.ONEX_PORT || 8765, 8766, 8767, 8768, 8769, 8770];
const CACHE = path.join(process.env.APPDATA || path.join(os.homedir(), '.config'), 'OnexPreviz', 'mcp-tools.json'), STATIC = path.join(__dirname, 'mcp-tools.json');
let port = 0;
const req = (p, method, body, timeout = 4000, pt = port) => new Promise((ok, ko) => { const data = body ? Buffer.from(JSON.stringify(body)) : null;
  const r = http.request({ host: '127.0.0.1', port: pt, path: p, method, timeout, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {} }, q => { const ch = []; q.on('data', c => ch.push(c)); q.on('end', () => ok({ code: q.statusCode, text: Buffer.concat(ch).toString() })); });
  r.on('timeout', () => r.destroy(new Error('délai'))); r.on('error', ko); if (data) r.write(data); r.end(); });
async function findPort(){ if (port){ try { if ((await req('/__onex', 'GET', null, 800)).text === 'onex') return port; } catch (_){ } port = 0; } for (const p of PORTS){ try { if ((await req('/__onex', 'GET', null, 800, p)).text === 'onex') return port = p; } catch (_){ } } return 0; }
const readJson = f => { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return Array.isArray(j) && j.length ? j : null; } catch (_){ return null; } };
async function tools(){ if (await findPort()){ try { const j = JSON.parse((await req('/api/mcp/tools', 'GET')).text); if (Array.isArray(j.tools) && j.tools.length) return j.tools; } catch (_){ } } return readJson(CACHE) || readJson(STATIC) || []; }
const CLOSED = 'StageFactory n\'est pas ouvert (ou sa fenêtre est fermée). Demande à l\'utilisateur de lancer StageFactory, puis réessaie.';
async function call(name, args){ if (!(await findPort())) return { isError: true, content: [{ type: 'text', text: CLOSED }] };
  try { const r = await req('/api/mcp/call', 'POST', { name, args: args || {} }, 90000), j = JSON.parse(r.text); if (j.error) return { isError: true, content: [{ type: 'text', text: j.code === 'no_window' ? CLOSED : String(j.error) }] };
    if (j.result && j.result.__mcp) return { content: [...(j.result.images || []).map(data => ({ type: 'image', data, mimeType: 'image/jpeg' })), { type: 'text', text: String(j.result.text || 'ok') }] };   // documents de la salle montrés en image
    return { content: [{ type: 'text', text: typeof j.result === 'string' ? j.result : JSON.stringify(j.result ?? 'ok') }] }; }
  catch (e){ return { isError: true, content: [{ type: 'text', text: 'StageFactory ne répond pas : ' + e.message }] }; } }
const send = m => process.stdout.write(JSON.stringify(m) + '\n');
async function handle(m){
  if (!m || m.jsonrpc !== '2.0' || m.method === undefined) return; const reply = result => m.id !== undefined && send({ jsonrpc: '2.0', id: m.id, result }), fail = (code, message) => m.id !== undefined && send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return reply({ protocolVersion: (m.params && m.params.protocolVersion) || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'stagefactory', title: 'StageFactory', version: VERSION }, instructions: 'Pilote StageFactory, logiciel de prévisualisation de spectacle (ex-Onex Previz) : salle, objets sur le plateau, lumière, mémoires. Pour CRÉER UNE SALLE depuis une fiche technique ou des plans : l\'utilisateur dépose ses documents dans la fenêtre « Créer la salle » de StageFactory ; appelle lister_documents, qui rend la méthode complète, et suis-la. Elle se fait en trois passes : (1) creer_salle (après accord de l\'utilisateur si un projet est ouvert), regler_salle, poser_perches ; (2) le parc avec ses quantités : list_library, titan_search, titan_import, creer_type pour ce qui n\'existe nulle part, puis ecrire_parc et lire_parc ; (3) poser_materiel_fixe pour ce qui est installé à demeure. Termine par noter_faits. Une charge admissible lue dans la fiche est seulement proposée (chargeRepartieLueKg), jamais déduite ; n\'invente ni perche, ni quantité, ni poids. Commence par get_state pour connaître l\'état du projet. Pour une scénographie complète : new_project (si demandé), titan_search puis titan_import pour les projecteurs de la bibliothèque Titan, list_library pour le reste du matériel, add_objects, patch_objects, réglages avec update_objects et spread_objects, puis record_cue pour chaque mémoire (une mémoire enregistre l\'état visible). Termine par load_report pour vérifier la charge des perches, et résume le patch à recopier dans Titan. Coordonnées en mètres depuis le nez de scène : x négatif = jardin, positif = cour ; z négatif = lointain, positif = public.' });
    if (m.method === 'ping') return reply({});
    if (m.method === 'tools/list') return reply({ tools: await tools() });
    if (m.method === 'tools/call') return reply(await call(m.params && m.params.name, m.params && m.params.arguments));
    if (m.method === 'resources/list') return reply({ resources: [] }); if (m.method === 'prompts/list') return reply({ prompts: [] });
    if (String(m.method).startsWith('notifications/')) return;
    fail(-32601, 'Méthode inconnue : ' + m.method);
  } catch (e){ fail(-32603, e.message); }
}
let buf = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0){ const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; let m; try { m = JSON.parse(line); } catch (_){ send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON invalide' } }); continue; } (Array.isArray(m) ? m : [m]).forEach(handle); } });
process.stdin.on('end', () => process.exit(0));
