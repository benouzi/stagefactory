// faux GDTF Share pour l'essai t146 : identifiants acceptés seulement en formulaire (comme le client libre BlenderDMX), liste, téléchargement
const http=require('http'),fs=require('fs');const M=process.env.MOCK_M||'Acme',F=process.env.MOCK_F||'Spot',FILE=process.env.MOCK_FILE;
let list=[{rid:11,manufacturer:M,fixture:F,revision:'v3 essai',uploader:'fabricant',lastModified:1700000000,modes:[{name:'Default',dmxfootprint:17}]},{rid:12,manufacturer:M,fixture:F+' Wash XL',revision:'v1',uploader:'x',lastModified:1600000000,modes:[]},{rid:13,manufacturer:'Autre Marque',fixture:F,revision:'v1',uploader:'x',lastModified:1,modes:[]},{rid:14,manufacturer:M,fixture:'Tout Autre Chose 9000',revision:'v1',uploader:'x',lastModified:1,modes:[]}];
if(process.env.MOCK_LIST)list=JSON.parse(process.env.MOCK_LIST);
http.createServer((q,s)=>{const u=new URL(q.url,'http://x');const ch=[];q.on('data',c=>ch.push(c));q.on('end',()=>{const body=Buffer.concat(ch).toString(),j=(c,o,h)=>{s.writeHead(c,{'Content-Type':'application/json',...(h||{})});s.end(JSON.stringify(o))};
 if(u.pathname.endsWith('login.php')){const ct=q.headers['content-type']||'';if(!/x-www-form-urlencoded/.test(ct))return j(200,{result:false,error:'format'});const p=new URLSearchParams(body);if(p.get('user')==='ben'&&p.get('password')==='ok')return j(200,{result:true},{'Set-Cookie':'PHPSESSID=abc; path=/'});return j(200,{result:false,error:'Wrong user or password'})}
 if(!/PHPSESSID=abc/.test(q.headers.cookie||''))return j(401,{result:false,error:'login'});
 if(u.pathname.endsWith('getList.php'))return j(200,{result:true,list});
 if(u.pathname.endsWith('downloadFile.php')){if(u.searchParams.get('rid')!=='11')return j(404,{result:false});s.writeHead(200,{'Content-Type':'application/octet-stream'});return s.end(fs.readFileSync(FILE))}
 j(404,{})})}).listen(8799,'127.0.0.1');
