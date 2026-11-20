import subprocess,time,os,json,shutil
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/appdata2',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata2',PORT='8793',ARTNET_PORT='16456',SACN_PORT='15570'); D='/home/claude/local/dist/StageFactory'
def rpc(proc,msg,wait=True):
    proc.stdin.write(json.dumps(msg)+'\n'); proc.stdin.flush()
    return json.loads(proc.stdout.readline()) if wait else None
def mcp(e): return subprocess.Popen(['node',D+'/mcp.js'],env=e,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
g=subprocess.Popen(['node',D+'/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1000,'height':650}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.set_default_timeout(120000); pg.goto('http://localhost:8793/?demo')
    pg.wait_for_function("window.STAGE && window.AI && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate; time.sleep(2)
    e2=dict(env,ONEX_PORT='8793'); m=mcp(e2)
    r=rpc(m,{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-06-18','capabilities':{},'clientInfo':{'name':'t','version':'1'}}}); print('init',r['result']['protocolVersion'],r['result']['serverInfo']['name'],list(r['result']['capabilities']))
    rpc(m,{'jsonrpc':'2.0','method':'notifications/initialized'},False)
    r=rpc(m,{'jsonrpc':'2.0','id':2,'method':'tools/list'}); T=r['result']['tools']; print('outils',len(T),[t['name'] for t in T]); json.dump(T,open('/home/claude/local/mcp-tools.json','w'),ensure_ascii=False)
    r=rpc(m,{'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'get_state','arguments':{}}}); print('état',r['result']['content'][0]['text'][:160].replace('\n',' | '))
    n0=ev("STAGE.S.objs.length"); add=[t for t in T if t['name']=='add_objects'][0]; print('schéma add',json.dumps(add['inputSchema'],ensure_ascii=False)[:300])
    r=rpc(m,{'jsonrpc':'2.0','id':4,'method':'tools/call','params':{'name':'add_objects','arguments':{'items':[{'type':'beam','count':4,'perche':5,'color':'#2a4dff'}]}}}); print('ajout',r['result'].get('isError'),r['result']['content'][0]['text'][:200],'objets',n0,'->',ev("STAGE.S.objs.length"))
    r=rpc(m,{'jsonrpc':'2.0','id':5,'method':'tools/call','params':{'name':'nimporte','arguments':{}}}); print('inconnu',r['result'].get('isError'),r['result']['content'][0]['text'])
    r=rpc(m,{'jsonrpc':'2.0','id':6,'method':'truc/inconnu'}); print('méthode',r.get('error'))
    print('info',ev("fetch('/api/mcp/info').then(r=>r.json())")); ev("AI.connectInfo()"); pg.wait_for_selector('#mcpCfg'); print('fenêtre',ev("document.querySelector('#mcpCfg').value.replace(/\\s+/g,' ')")); print(errs[:3]); b.close(); m.kill()
finally: g.kill()
time.sleep(1); m=mcp(dict(env,ONEX_PORT='8793')); r=rpc(m,{'jsonrpc':'2.0','id':1,'method':'tools/list'}); print('fermé: outils',len(r['result']['tools'])); r=rpc(m,{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'get_state','arguments':{}}}); print('fermé: appel',r['result'].get('isError'),r['result']['content'][0]['text'][:70]); m.kill()
