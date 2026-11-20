import subprocess,time,os,json,shutil
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/appdata3',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata3',PORT='8794',ARTNET_PORT='16457',SACN_PORT='15571',TITAN_LIB='/tmp/titanlib'); D='/home/claude/local/dist/StageFactory'
g=subprocess.Popen(['node',D+'/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2); n=[0]
def call(m,name,args):
    n[0]+=1; m.stdin.write(json.dumps({'jsonrpc':'2.0','id':n[0],'method':'tools/call','params':{'name':name,'arguments':args}})+'\n'); m.stdin.flush(); r=json.loads(m.stdout.readline())['result']; t=r['content'][0]['text']
    try: t=json.loads(t)
    except Exception: pass
    return ('ERREUR ' if r.get('isError') else '')+json.dumps(t,ensure_ascii=False)[:330]
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1000,'height':650}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.set_default_timeout(120000); pg.goto('http://localhost:8794/?demo')
    pg.wait_for_function("window.STAGE && window.AI && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate; time.sleep(2)
    m=subprocess.Popen(['node',D+'/mcp.js'],env=dict(env,ONEX_PORT='8794'),stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
    m.stdin.write(json.dumps({'jsonrpc':'2.0','id':0,'method':'tools/list'})+'\n'); m.stdin.flush(); T=json.loads(m.stdout.readline())['result']['tools']; print('outils',len(T)); json.dump(T,open('/home/claude/local/mcp-tools.json','w'),ensure_ascii=False)
    print('new',call(m,'new_project',{'name':'Test Claude','config':'debout'}))
    print('search',call(m,'titan_search',{'query':'clay paky'}))
    print('import',call(m,'titan_import',{'files':['Clay Paky_MINI B.d4','absent.d4']}))
    print('lib',call(m,'list_library',{'query':'mini b'}))
    print('add',call(m,'add_objects',{'items':[{'type':'d4-clay-paky-mini-b','perche':5,'x':x,'group':'Wash','mode':'Basic RGBW 16bit (v2)'} for x in (-3,-1,1,3)]}))
    print('patch',call(m,'patch_objects',{'select':{'group':'Wash'},'universe':1,'start':101}))
    print('upd',call(m,'update_objects',{'select':{'group':'Wash'},'set':{'dim':1,'color':'#2a4dff'}}))
    print('cue',call(m,'record_cue',{'name':'Intro'}))
    print('list',call(m,'list_objects',{}))
    print('page',ev("[STAGE.S.name,APP.config,STAGE.S.objs.length,STAGE.S.cues.length,STAGE.S.objs.map(o=>o.uni+'.'+o.addr+'/m'+o.mode).join(' ')]"),errs[:3]); b.close(); m.kill()
finally: g.kill()
