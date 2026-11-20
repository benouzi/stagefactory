# Version installée : créateur de salle face à une fausse IA (clé, images envoyées, une seule annulation), puis les mêmes outils par le connecteur Claude (MCP, images comprises).
import subprocess,time,os,json,shutil,base64,urllib.request
from playwright.sync_api import sync_playwright
SAMP='/home/claude/src/sceno/ScenoFactory-0.45.0-sources/app/test/'
b64=lambda p: base64.b64encode(open(p,'rb').read()).decode()
shutil.rmtree('/tmp/appdata54',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata54',AI_BASE='http://127.0.0.1:8798/',PORT='8795',ARTNET_PORT='16458',SACN_PORT='15572'); D='/home/claude/local/dist/StageFactory'
m=subprocess.Popen(['node','/home/claude/tools/mockai.js']); g=subprocess.Popen(['node',D+'/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2); n=[0]; bad=[]
def ok(c,msg,extra=''):
    print(('OK  ' if c else '!!  ')+msg, str(extra)[:300], flush=True)
    if not c: bad.append(msg)
def rpc(mc,method,params=None):
    n[0]+=1; mc.stdin.write(json.dumps({'jsonrpc':'2.0','id':n[0],'method':method,'params':params or {}})+'\n'); mc.stdin.flush(); return json.loads(mc.stdout.readline())['result']
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1200,'height':760}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda c: c.type=='error' and errs.append(c.text)); pg.set_default_timeout(180000); pg.goto('http://localhost:8795/?demo')
    pg.wait_for_function("window.STAGE && window.AI && window.VENUE && window.PLAN && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate
    ev("APP.renderer.setAnimationLoop(null)"); pg.add_style_tag(content='#modal{display:none!important}'); ok(pg.title()=='StageFactory','titre',pg.title())
    a0=ev("STAGE.serialize()"); u0=ev("STAGE.hist().undo.length")
    # bibliothèques locales : PDF, DWG et DXF lus sans réseau
    r=ev("""(async(a)=>{const mk=(n,b)=>new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],n);await VENUE.addFiles([mk('salle.pdf',a[0]),mk('salle.dxf',a[1]),mk('ex.dwg',a[2]),mk('note.txt',btoa('Le plateau fait 12 m de large.'))]);return VENUE.K.files.map(f=>[f.name,f.kind,f.note])})""",[b64(SAMP+'salle.pdf'),b64(SAMP+'samples/salle.dxf'),b64(SAMP+'samples/example_2010.dwg')])
    ok([x[1] for x in r]==['pdf','cad','cad','text'],'fichiers lus avec les bibliothèques locales',r)
    # sans clé : le créateur renvoie vers les réglages
    ev("VENUE.open(true)"); pg.wait_for_selector('#venueWin [data-v=run]'); time.sleep(.6)
    ok(ev("VENUE.aiMode()")=='nokey','sans clé',ev("document.querySelector('#venueWin .info').innerText.slice(0,90)"))
    ok(pg.is_disabled('#venueWin [data-v=run]'),'bouton IA désactivé sans clé')
    r=ev("fetch('/api/ai/key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'sk-ant-test-0123456789abcdef'})}).then(r=>r.json())"); ok(r.get('ok'),'clé enregistrée',r)
    ev("VENUE.open(false);AI.st.ready=false"); ev("VENUE.open(true)"); pg.wait_for_function("VENUE.aiMode()==='local'"); ok(True,'mode local')
    pg.fill('#vnNotes','C\'est la grande salle.'); pg.click('#venueWin [data-v=run]'); pg.wait_for_selector('#venueWin [data-v=oknew]'); ok('sera remplacé' in pg.inner_text('#venueWin') and ev("APP.venue.type")=='onex','confirmation avant de remplacer le projet ouvert'); pg.click('#venueWin [data-v=oknew]')
    pg.wait_for_function("!VENUE.K.busy && VENUE.K.report")
    s=json.loads(urllib.request.urlopen('http://127.0.0.1:8798/seen').read())
    ok(s['calls']==6 and s['maxTok']==8000,'six échanges avec l\'IA',s['calls'])
    ok(s['images']>=3,'pages de plans reçues en image par l\'IA',s['images'])
    ok('lister_documents' not in s['tools'] and 'caler_plan_cao' in s['tools'],'outils du créateur',len(s['tools']))
    v=ev("APP.venue"); ok(v['type']=='param' and v['name']=='Salle d\'essai' and v['prosW']==10 and v['rows']==10 and len(v['pipes'])==12 and v['shell'] is False and v['plan']['walls']==['MURS'] and v['plan']['hidden']==['AXES'],'salle construite',[v['name'],v['w'],v['d'],v['stageD'],v['prosW'],v['rows'],len(v['pipes']),v['plan']['name']])
    ok(len(v['facts'])==2 and v['notes']=='C\'est la grande salle.','faits et consignes gardés',v.get('questions'))
    ok(ev("STAGE.hist().undo.length")==u0+2,'deux étapes d\'annulation : la salle neuve, puis toute la construction',ev("STAGE.hist().undo.slice(-1)[0].label"))
    ok('12 perches' in ev("VENUE.K.report"),'compte rendu',ev("VENUE.K.report"))
    pg.screenshot(path='/home/claude/shots/t54_rapport.png')
    # amélioration : la conversation continue
    pg.fill('#vnNotes','La salle fait 9,50 m de haut.'); pg.click('#venueWin [data-v=run]'); pg.wait_for_function("!VENUE.K.busy && /9,50/.test(VENUE.K.report)")
    ok(ev("APP.venue.h")==9.5 and ev("STAGE.hist().undo.length")==u0+3,'amélioration',ev("[APP.venue.h,VENUE.K.session.rounds,VENUE.K.session.tin]"))
    # le plan survit au rechargement de la page (IndexedDB) ; Ctrl+Z revient à Onex
    pid=ev("APP.venue.plan.id"); ev("APP.store.set('show',STAGE.serialize())"); pg.reload(); pg.wait_for_function("window.STAGE && window.VENUE && document.querySelector('#loader').style.display==='none'"); ev("APP.renderer.setAnimationLoop(null)"); pg.add_style_tag(content='#modal{display:none!important}')
    pg.wait_for_function("APP.venue.plan && APP.PLANS.has(APP.venue.plan.id)"); ok(ev("APP.venue.plan.id")==pid and ev("APP.pickMeshes.some(m=>m.userData.planWalls)"),'plan retrouvé après rechargement')
    # ---- connecteur Claude
    time.sleep(1.5); mc=subprocess.Popen(['node',D+'/mcp.js'],env=dict(env,ONEX_PORT='8795'),stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
    ini=rpc(mc,'initialize',{'protocolVersion':'2025-06-18'}); ok(ini['serverInfo']['title']=='StageFactory' and 'lister_documents' in ini['instructions'],'connecteur : présentation',ini['serverInfo'])
    T=rpc(mc,'tools/list')['tools']; names=[t['name'] for t in T]; ok(len(T)==36 and 'voir_document' in names and 'new_project' in names and 'ecrire_parc' in names,'connecteur : outils',len(T)); json.dump(T,open('/home/claude/local/mcp-tools.json','w'),ensure_ascii=False)
    r=rpc(mc,'tools/call',{'name':'lister_documents','arguments':{}}); ok('aucun document' in r['content'][0]['text'] and 'MÉTHODE' in r['content'][0]['text'],'connecteur : aucun document après rechargement',r['content'][0]['text'][:80])
    ev("""(async(a)=>{const mk=(n,b)=>new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],n);await VENUE.addFiles([mk('salle.pdf',a[0])])})""",[b64(SAMP+'salle.pdf')])
    r=rpc(mc,'tools/call',{'name':'voir_document','arguments':{'fichier':'salle.pdf'}}); ok(r['content'][0]['type']=='image' and r['content'][0]['mimeType']=='image/jpeg' and len(r['content'][0]['data'])>3000 and 'page 1' in r['content'][1]['text'],'connecteur : page vue en image',r['content'][1]['text'])
    open('/home/claude/shots/t54_mcp_page.jpg','wb').write(base64.b64decode(r['content'][0]['data']))
    r=rpc(mc,'tools/call',{'name':'caler_plan','arguments':{'fichier':'salle.pdf','largeurReelleM':24,'axeX':.5,'zeroY':.7}}); j=json.loads(r['content'][0]['text']); ok(j.get('ok') and abs(j['empriseM']['aX']-12)<.01,'connecteur : plan calé',j)
    r=rpc(mc,'tools/call',{'name':'poser_perche','arguments':{'nom':'Face','y':-3,'longueurM':9,'hauteurM':6}}); ok(json.loads(r['content'][0]['text']).get('numero')==13,'connecteur : perche posée',r['content'][0]['text'])
    r=rpc(mc,'tools/call',{'name':'get_state','arguments':{}}); ok('ÉTAT' in r['content'][0]['text'],'connecteur : état',r['content'][0]['text'][:60])
    ok(ev("[APP.venue.plan.kind,APP.venue.pipes.length]")==['img',13],'page : salle modifiée par Claude',ev("APP.venue.plan.name"))
    # parc par le connecteur ; salles enregistrées dans un fichier du poste
    r=rpc(mc,'tools/call',{'name':'creer_type','arguments':{'nom':'Nexo PS15','categorie':'son','forme':'enceinte'}}); tid=json.loads(r['content'][0]['text'])['type']
    r=rpc(mc,'tools/call',{'name':'ecrire_parc','arguments':{'lignes':[{'libelle':'10 x Nexo PS15','quantite':10,'categorie':'son','type':tid},{'libelle':'SM58','quantite':6,'categorie':'micros'}]}}); j=json.loads(r['content'][0]['text']); ok(j.get('pieces')==16,'connecteur : parc écrit',j)
    r=rpc(mc,'tools/call',{'name':'lire_parc','arguments':{}}); ok(json.loads(r['content'][0]['text'])['lignes'][0]['quantite']==10,'connecteur : parc relu')
    time.sleep(2.5); vf='/tmp/appdata54/OnexPreviz/venues.json'; V=json.load(open(vf)) if os.path.exists(vf) else {}; rec=next(iter(V.values()),{}); ok(len(V)==1 and len(rec.get('parc',[]))==2 and len(rec['salle']['pipes'])==13,'salle et parc enregistrés dans venues.json',list(V.keys()))
    pg.reload(); pg.wait_for_function("window.PARC && PARC.ready && document.querySelector('#loader').style.display==='none'"); ok(ev("PARC.list().length")==1 and ev("PARC.lines().length")==2,'parc retrouvé après rechargement',ev("PARC.list()"))
    ok(not errs,'aucune erreur dans la page',errs[:3]); mc.kill(); b.close()
finally: m.kill(); g.kill()
print('ÉCHECS :',bad or 'aucun')
