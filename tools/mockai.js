// Fausse API Messages pour les essais : une IA scriptée qui crée une salle depuis le dossier, puis l'améliore.
const http = require('http'); const seen = { calls: 0, images: 0, key: '', maxTok: 0, tools: [], lastBytes: 0 };
const use = (id, name, input) => ({ type: 'tool_use', id, name, input });
const STEPS = [
  () => [{ type: 'text', text: 'Je regarde le dossier.' }, use('t1', 'voir_document', { fichier: 'salle.pdf' }), use('t2', 'voir_document', { fichier: 'salle.dxf' })],
  () => [use('t3', 'lire_texte_pdf', { fichier: 'salle.pdf' }), use('t4', 'voir_document', { fichier: 'salle.pdf', zone: { x0: .2, y0: .5, x1: .8, y1: 1 } })],
  () => [use('t5', 'caler_plan_cao', { fichier: 'salle.dxf', nezDeScene: { x: 9.3, y: 15.6 }, directionLointainDeg: 90, calquesMurs: ['MURS'], calquesMasques: ['AXES'], hauteurMursM: 8 })],
  () => [use('t6', 'regler_salle', { nomSalle: 'Salle d\'essai', plateauLargeurM: 12, plateauProfondeurM: 8, hauteurSceneM: 1, hauteurSalleM: 8, cadreOuvertureM: 10, cadreHauteurM: 6, gradinDebutM: 3, gradinRangs: 10, gradinProfondeurRangM: .9, gradinHauteurRangM: .16 }), use('t7', 'poser_perches', { nombre: 12, yPremiereM: .6, pasM: .6, longueurM: 11, hauteurM: 6.5 })],
  () => [use('t8', 'lire_salle', {}), use('t9', 'noter_faits', { nomSalle: 'Salle d\'essai', faits: [{ sujet: 'Plateau', valeur: '12,00 × 8,00 m', source: 'salle.pdf, texte « PLATEAU 12,00 x 8,00 m »', confiance: 'lu' }, { sujet: 'Hauteur des perches', valeur: '6,50 m', source: 'valeur d\'usage', confiance: 'supposé' }], questions: ['Quelle est la charge admissible des perches ?'] })],
  () => [{ type: 'text', text: 'Fait : salle construite, 12 perches posées. Les hauteurs sont supposées.' }],
  // seconde passe (amélioration)
  () => [use('u1', 'regler_salle', { hauteurSalleM: 9.5 })],
  () => [{ type: 'text', text: 'Fait : hauteur de salle corrigée à 9,50 m.' }],
];
let step = 0;
http.createServer((req, res) => {
  if (req.url === '/seen'){ res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ...seen, step })); }
  const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => {
    const raw = Buffer.concat(ch), b = JSON.parse(raw.toString()); seen.calls++; seen.key = req.headers['x-api-key'] || ''; seen.maxTok = b.max_tokens; seen.tools = (b.tools || []).map(t => t.name); seen.lastBytes = raw.length;
    if (seen.key !== 'sk-ant-test-0123456789abcdef'){ res.writeHead(401, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: { message: 'invalid x-api-key' } })); }
    for (const m of b.messages) if (Array.isArray(m.content)) for (const c of m.content) if (c.type === 'tool_result' && Array.isArray(c.content)) seen.images += c.content.filter(x => x.type === 'image' && x.source && x.source.data && x.source.data.length > 1000).length;
    const content = (STEPS[step] || STEPS[STEPS.length - 1])(); step++;
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ content, stop_reason: content.some(c => c.type === 'tool_use') ? 'tool_use' : 'end_turn', usage: { input_tokens: 1200, output_tokens: 150 } }));
  });
}).listen(8798, '127.0.0.1');
