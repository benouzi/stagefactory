# Habillage d'une scène : jupe, garde-corps, escalier ; praticables de formes spéciales (version installée).
import subprocess,time,os,json,shutil
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/appdata65',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata65',PORT='8801',SACN_PORT='15577'); D='/home/claude/local/dist/StageFactory'
g=subprocess.Popen(['node',D+'/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2); bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:330],flush=True)
    if not c: bad.append(m)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1400,'height':860}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.set_default_timeout(60000); pg.goto('http://localhost:8801/?demo')
    pg.wait_for_function("window.STAGE && window.AI && window.VENUE && window.PARC && PARC.ready && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate
    hide=pg.add_style_tag(content='#modal{display:none!important}')
    T=lambda n,a={}: json.loads(ev("async(a)=>(await VENUE.tool(a[0],a[1])).content[0].text",[n,a]))
    T('creer_salle',{'nom':'Salle habillage','confirme':True}); ev("STAGE.S.objs.length=0;STAGE.render();APP.renderer.setAnimationLoop(null)")
    pg.evaluate("h=>h.remove()",hide); ev("document.querySelector('#modal').style.display='none'")
    O=lambda: ev("STAGE.S.objs.map(o=>({t:o.type,x:+o.pos[0].toFixed(2),z:+o.pos[2].toFixed(2),y:+o.pos[1].toFixed(2),s:o.size,len:o.len,yaw:o.yaw,g:o.grp,d:o.dress||0}))")
    # ---- scène 6 × 3 m à 80 cm, jupe avant + côtés, garde-corps arrière + côtés, escalier à jardin : tout depuis le dialogue
    ev("STAGE.UI.tab='lib';STAGE.UI.libCat='str';APP.toggleConsole(true);STAGE.render()"); pg.click('[data-a="scene"]'); pg.wait_for_selector('#scW')
    pg.fill('#scW','6'); pg.fill('#scD','3'); pg.select_option('#scH','0.8')
    for k in ['arriere','jardin','cour']: pg.check('#modal [data-dr="%s"]'%k)
    pg.select_option('#dsSt','jardin'); pg.click('[data-a="sceneok"]'); pg.wait_for_timeout(400)
    o=O(); pr=[q for q in o if q['t']=='prat']; ju=[q for q in o if q['t']=='jupe']; gc=[q for q in o if q['t']=='garde-corps']; es=[q for q in o if q['t']=='escalier']
    ok(len(pr)==9 and all(q['s'][2]==.8 for q in pr),'scène : 9 praticables à 80 cm')
    ok(len(ju)==3 and sorted(round(q['s'][0],2) for q in ju)==[3,3,6] and all(abs(q['s'][1]-.79)<.011 and q['y']==0 for q in ju),'jupe : avant 6 m, deux côtés 3 m, du plateau au sol',[(q['x'],q['z'],q['s'],q['yaw']) for q in ju])
    av=[q for q in ju if round(q['s'][0])==6][0]; ok(av['x']==0 and abs(av['z']-.02)<.011 and av['yaw']==0,'la jupe avant est sur le bord public, tournée vers le public',av)
    ok(len(es)==1 and es[0]['x']==-3 and es[0]['z']==-1.5 and es[0]['yaw']==-90 and es[0]['s'][2]==.8 and es[0]['y']==0,'escalier au milieu du côté jardin, descend vers jardin',es)
    L=lambda side: sum(q['len'] for q in gc if (abs(q['x']+2.96)<.02 if side=='j' else abs(q['x']-2.96)<.02 if side=='c' else abs(q['z']+2.96)<.02))
    ok(all(q['y']==.8 for q in gc) and L('a')==6 and L('c')==3 and L('j')==2,'garde-corps à hauteur du plateau : 6 m à l\'arrière, 3 m à cour, 2 m à jardin (ouverture de 1 m devant l\'escalier)',[(q['x'],q['z'],q['len']) for q in gc])
    jj=sorted(q['z'] for q in gc if abs(q['x']+2.96)<.02); ok(jj==[-2.5,-.5],'les deux garde-corps de jardin encadrent l\'escalier',jj)
    ok(all(q['g']=='Scène 1' and q['d']==1 for q in ju+gc+es),'tout l\'habillage est dans le groupe de la scène')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(200); o=O(); ok(len(o)==9,'Ctrl+Z retire l\'habillage seul',len(o))
    # ---- habiller depuis les réglages d'un praticable, puis refaire : l'ancien habillage est remplacé
    ev("STAGE.select([STAGE.S.objs[0].id]);STAGE.UI.tab='prop';STAGE.render()"); pg.click('[data-a="dress"]'); pg.wait_for_selector('#dsSt'); pg.click('[data-a="dressok"]'); pg.wait_for_timeout(300)
    n1=len(O()); ev("STAGE.select([STAGE.S.objs[0].id]);STAGE.UI.tab='prop';STAGE.render()"); pg.click('[data-a="dress"]'); pg.wait_for_selector('#dsSt'); pg.select_option('#dsSt','avant'); pg.click('[data-a="dressok"]'); pg.wait_for_timeout(300)
    o=O(); es=[q for q in o if q['t']=='escalier']; ok(len(o)==n1+1 and len(es)==1 and es[0]['x']==0 and es[0]['z']==0 and es[0]['yaw']==0,'refaire l\'habillage remplace l\'ancien ; escalier à l\'avant au centre',[n1,len(o),es])
    # ---- scène en L : le bord intérieur n'est pas habillé
    ev("STAGE.S.objs.length=0;STAGE.render()")
    ev("""(()=>{const mk=(x,z)=>STAGE.place('prat',{point:new APP.THREE.Vector3(x,0,z),object:{userData:{}},face:null},true,{size:[2,1,.4],grp:'L'});mk(-1,-.5);mk(1,-.5);mk(-1,-1.5);STAGE.touch()})()""")
    r=ev("STAGE.stageEdges(STAGE.S.objs).map(r=>[r.side,r.f,r.a,r.b])"); tot=sum(q[3]-q[2] for q in r)
    ok(abs(tot-12)<1e-6 and ['avant',0,-2,2] in r and ['arriere',-2,-2,0] in r and ['arriere',-1,0,2] in r and ['cour',0,-2,-1] in r,'scène en L : pourtour de 12 m, bords intérieurs ignorés',r)
    # ---- formes spéciales
    for t in ['prat-tri','prat-qr','prat-1','escalier','garde-corps','jupe']:
        ev("STAGE.place(%s,{point:new APP.THREE.Vector3(5,0,2),object:{userData:{}},face:null},true)"%json.dumps(t))
    ev("STAGE.touch();APP.renderer.render(APP.scene,APP.camera)")
    ok(ev("STAGE.S.objs.slice(-6).every(o=>{const r=STAGE.RT.get(o.id);let n=0;r.head.traverse(m=>{if(m.isMesh)n++});return n>0})"),'triangle, quart de rond, 1 × 1, escalier, garde-corps et jupe se construisent en 3D')
    ok(ev("!STAGE.blkType('prat-tri') && !STAGE.blkType('prat-qr') && !!STAGE.blkType('prat-1')"),'triangle et quart de rond se posent à l\'unité, le 1 × 1 en bloc')
    pg.keyboard.press('p'); pg.wait_for_timeout(500); ev("PLAN.draw()")
    ok(not errs,'aucune erreur de page (3D et plan 2D)',errs[:2]); b.close()
finally: g.terminate()
print('\nECHECS:',bad if bad else 'aucun'); raise SystemExit(1 if bad else 0)
