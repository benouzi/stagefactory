const http=require('http');let mode='ok',n=0,log=[];
http.createServer((q,r)=>{if(q.url.startsWith('/mode/')){mode=q.url.slice(6);n=0;log=[];return r.end('ok');}if(q.url==='/log')return r.end(JSON.stringify(log));
 const mdl=decodeURIComponent(q.url.split('/').pop().split(':')[0]);log.push(mdl);n++;let b='';q.on('data',d=>b+=d);q.on('end',()=>{const J=(sc,o)=>{r.writeHead(sc,{'content-type':'application/json'});r.end(JSON.stringify(o));},img={candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:'QUJD'}}]}}]},busy={error:{message:'The model is overloaded. Please try again later.',code:503}};
  if(mode==='ok')return J(200,img); if(mode==='once')return n===1?J(503,busy):J(200,img); if(mode==='first')return mdl==='gemini-3.1-flash-image'?J(503,busy):J(200,img); if(mode==='all')return J(503,busy);
  if(mode==='free')return J(429,{error:{message:'Quota exceeded for metric generate_content_free_tier_requests, limit: 0, model: gemini-3.1-flash-image'}}); if(mode==='key')return J(400,{error:{message:'API key not valid. Please pass a valid API key.',status:'INVALID_ARGUMENT'}}); if(mode==='404')return J(404,{error:{message:'not found'}});});
}).listen(9911);
