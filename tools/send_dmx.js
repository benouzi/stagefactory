// Émetteur de test : Art-Net et sACN, comme le ferait une console.
const dgram = require('dgram'), s = dgram.createSocket('udp4');
const [,, proto, uni, json] = process.argv, vals = JSON.parse(json), data = Buffer.alloc(512); for (const [k, v] of Object.entries(vals)) data[+k - 1] = v;
let p;
if (proto === 'artnet'){ p = Buffer.alloc(530); p.write('Art-Net\0', 0, 'latin1'); p.writeUInt16LE(0x5000, 8); p.writeUInt16BE(14, 10); p[14] = uni & 255; p[15] = uni >> 8; p.writeUInt16BE(512, 16); data.copy(p, 18); }
else if (proto === 'poll'){ p = Buffer.alloc(14); p.write('Art-Net\0', 0, 'latin1'); p.writeUInt16LE(0x2000, 8); p.writeUInt16BE(14, 10); }
else { p = Buffer.alloc(638); p.writeUInt16BE(0x0010, 0); p.write('ASC-E1.17\0\0\0', 4, 'latin1'); p.writeUInt16BE(0x7000 | 622, 16); p.writeUInt32BE(4, 18); p.writeUInt16BE(0x7000 | 600, 38); p.writeUInt32BE(2, 40); p.write('grandMA3 test', 44, 'utf8'); p[108] = 100; p.writeUInt16BE(+uni, 113); p.writeUInt16BE(0x7000 | 523, 115); p[117] = 2; p[118] = 0xa1; p.writeUInt16BE(1, 121); p.writeUInt16BE(513, 123); p[125] = 0; data.copy(p, 126); }
if (proto === 'poll'){ s.on('message', m => { console.log('reply', m.length, m.readUInt16LE(8).toString(16), m.toString('latin1', 26, 37)); s.close(); }); s.bind(6454 + 0, () => {}); }
let n = 0; const port = proto === 'sacn' ? 5568 : 6454; const t = setInterval(() => { s.send(p, port, '127.0.0.1'); if (++n >= (proto === 'poll' ? 1 : 12)){ clearInterval(t); if (proto !== 'poll') setTimeout(() => s.close(), 100); else setTimeout(() => { try { s.close(); } catch (_){} }, 800); } }, 40);
