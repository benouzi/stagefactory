# Pose en série : n objets au même écartement en tirant une ligne, dans la vue 3D et sur le plan 2D (version installée).
import subprocess,time,os,json,shutil
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/appdata63',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata63',PORT='8798',SACN_PORT='15575'); D='/home/claude/local/dist/StageFactory'
g=subprocess.Popen(['node',D+'/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2); bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:300],flush=True)
    if not c: bad.append(m)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1400,'height':860}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.set_default_timeout(120000); pg.goto('http://localhost:8798/?demo')
    pg.wait_for_function("window.STAGE && window.AI && window.VENUE && window.PARC && PARC.ready && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate
    pg.add_style_tag(content='#modal{display:none!important}')
    T=lambda n,a={}: json.loads(ev("async(a)=>(await VENUE.tool(a[0],a[1])).content[0].text",[n,a]))
    T('creer_salle',{'nom':'Salle série','confirme':True}); T('poser_perche',{'nom':'P1','y':3,'longueurM':10,'hauteurM':5,'structure':'pont','moteurs':2})
    ev("STAGE.S.objs.length=0;STAGE.render()"); n0=ev("STAGE.S.objs.length")
    # ---- calcul des points
    ok(ev("STAGE.seriePts([-4,0],[4,0],5,0).map(p=>p[0])")==[-4,-2,0,2,4],'5 objets de -4 à +4 : écart 2 m')
    ok(ev("STAGE.seriePts([0,0],[3.2,0],1,1).map(p=>+p[0].toFixed(2))")==[0,1,2,3],'un tous les mètres sur 3,2 m : 4 objets')
    ok(ev("STAGE.percheNear(1,-3)")==0 and ev("STAGE.percheNear(1,0)")==-1,'la perche se reconnaît sous le pointeur')
    # ---- plan 2D : tirer une ligne sur la perche
    ev("APP.renderer.setAnimationLoop(null)")
    pg.keyboard.press('p'); pg.wait_for_timeout(500)
    ev("STAGE.UI.tab='lib';STAGE.UI.libCat='lum';STAGE.UI.placing='par-led';STAGE.UI.serie=5;STAGE.UI.serieStep=0;STAGE.UI.serieSym=false;APP.toggleConsole(true);STAGE.render()")
    ok(pg.locator('#serieBox').count()==1 and pg.input_value('[data-ser="serie"]')=='5','bandeau : quantité affichée')
    sc=ev("(()=>{const r=document.querySelector('#plan2d').getBoundingClientRect(),P=PLAN.P||PLAN;return {l:r.left,t:r.top,ox:P.ox,oy:P.oy,s:P.s}})()")
    print('plan',sc,ev('PLAN.P.on'),ev('PLAN.P.view'),ev('STAGE.UI.placing'))
    X=lambda x: sc['l']+sc['ox']+x*sc['s']; Z=lambda z: sc['t']+sc['oy']+z*sc['s']
    pg.mouse.move(X(-4),Z(-3.1)); pg.mouse.down(); pg.mouse.move(X(0),Z(-2.5),steps=4); pg.mouse.move(X(4),Z(-2.2),steps=4); pg.mouse.up(); pg.wait_for_timeout(200)
    o=ev("STAGE.S.objs.map(o=>({x:+o.pos[0].toFixed(2),z:+o.pos[2].toFixed(2),h:o.hang,t:o.type}))")
    ok(len(o)==5 and [q['x'] for q in o]==[-4,-2,0,2,4] and all(q['z']==-3 and q['h']=='perche' for q in o),'plan 2D : 5 PAR sur la perche, écart 2 m, tous accrochés',o)
    ok(len(ev("STAGE.UI.sel"))==5 and ev("STAGE.UI.placing")==None,'les 5 sont sélectionnés, la pose s\'arrête')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(200); ok(ev("STAGE.S.objs.length")==0,'un seul Ctrl+Z retire toute la série')
    # ---- symétrique à l'axe, au sol
    ev("STAGE.UI.placing='par-led';STAGE.UI.serie=4;STAGE.UI.serieSym=true;STAGE.render()")
    pg.mouse.move(X(1),Z(-1)); pg.mouse.down(); pg.mouse.move(X(2),Z(-1),steps=3); pg.mouse.move(X(3),Z(-1),steps=3); pg.mouse.up(); pg.wait_for_timeout(200)
    o=ev("STAGE.S.objs.map(o=>({x:+o.pos[0].toFixed(2),z:+o.pos[2].toFixed(2),h:o.hang,y:+o.pos[1].toFixed(2)}))")
    ok([q['x'] for q in o]==[-3,-1,1,3] and all(q['h'] is None and q['y']==0 for q in o),'symétrique : 4 objets de -3 à +3, posés sur le plateau',o)
    # ---- un clic simple dans le plan : un seul objet
    ev("STAGE.S.objs.length=0;STAGE.UI.placing='par-led';STAGE.UI.serieSym=false;STAGE.render()"); pg.mouse.click(X(0),Z(-1)); pg.wait_for_timeout(200)
    ok(ev("STAGE.S.objs.length")==1,'plan 2D : un clic pose un seul objet')
    # ---- un tous les 1,5 m
    ev("STAGE.S.objs.length=0;STAGE.UI.placing='par-led';STAGE.UI.serieStep=1.5;STAGE.render()")
    pg.mouse.move(X(-3),Z(-3)); pg.mouse.down(); pg.mouse.move(X(0),Z(-3),steps=3); pg.mouse.move(X(3.2),Z(-3),steps=3); pg.mouse.up(); pg.wait_for_timeout(200)
    ok(ev("STAGE.S.objs.map(o=>+o.pos[0].toFixed(2))")==[-3,-1.5,0,1.5,3],'pas fixe de 1,5 m : 5 objets',ev("STAGE.S.objs.map(o=>+o.pos[0].toFixed(2))"))
    # ---- vue 3D : tirer une ligne le long de la perche
    pg.keyboard.press('p'); pg.wait_for_timeout(300); ev("STAGE.S.objs.length=0;STAGE.UI.serieStep=0;STAGE.UI.serie=6;STAGE.UI.placing='par-led';STAGE.render();VIEW3D.goView('face');APP.renderer.render(APP.scene,APP.camera)"); pg.wait_for_timeout(300)
    pr=ev("(()=>{const T=APP.THREE,P=APP.PERCHES[0],f=x=>{const v=new T.Vector3(x,P.y,P.z).project(APP.camera);return [(v.x+1)/2*innerWidth*(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vw'))/100||1),(1-v.y)/2*innerHeight]};return [f(-4),f(0),f(4)]})()")
    vw=ev("APP.canvas.getBoundingClientRect().width"); k=vw/1400; pr=[[a*1 if vw==1400 else a, c] for a,c in pr]
    pr=ev("(()=>{const T=APP.THREE,P=APP.PERCHES[0],r=APP.canvas.getBoundingClientRect(),f=x=>{const v=new T.Vector3(x,P.y,P.z).project(APP.camera);return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]};return [f(-4),f(0),f(4)]})()")
    pg.mouse.move(*pr[0]); pg.mouse.down(); pg.mouse.move(*pr[1],steps=4); pg.mouse.move(*pr[2],steps=4); pg.wait_for_timeout(100)
    tip=pg.inner_text('#serieTip'); ok('6 ×' in tip and 'écart' in tip,'vue 3D : étiquette pendant le tracé',tip)
    pg.mouse.wheel(0,-100); pg.wait_for_timeout(100); ok(ev("STAGE.UI.serie")==7,'molette pendant le tracé : quantité 7')
    pg.mouse.up(); pg.wait_for_timeout(300)
    o=ev("STAGE.S.objs.map(o=>({x:+o.pos[0].toFixed(1),h:o.hang}))"); xs=[q['x'] for q in o]
    ok(len(o)==7 and all(q['h']=='perche' for q in o) and abs(xs[0]+4)<.3 and abs(xs[-1]-4)<.3 and all(abs((xs[i+1]-xs[i])-(xs[1]-xs[0]))<.11 for i in range(6)),'vue 3D : 7 PAR sur la perche, même écartement',xs)
    ok(pg.is_hidden('#serieTip'),'l\'aperçu disparaît après la pose')
    ok(not errs,'aucune erreur de page',errs[:2]); b.close()
finally: g.terminate()
print('\nECHECS:',bad if bad else 'aucun'); raise SystemExit(1 if bad else 0)
