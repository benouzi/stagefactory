# Praticables en bloc : rectangle tracé, bloc colonnes × rangées, aimant, scène toute faite (version installée).
import subprocess,time,os,json,shutil
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/appdata64',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata64',PORT='8799',SACN_PORT='15576'); D='/home/claude/local/dist/StageFactory'
g=subprocess.Popen(['node',D+'/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2); bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:300],flush=True)
    if not c: bad.append(m)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1400,'height':860}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.set_default_timeout(120000); pg.goto('http://localhost:8799/?demo')
    pg.wait_for_function("window.STAGE && window.AI && window.VENUE && window.PARC && PARC.ready && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate
    hide=pg.add_style_tag(content='#modal{display:none!important}')
    T=lambda n,a={}: json.loads(ev("async(a)=>(await VENUE.tool(a[0],a[1])).content[0].text",[n,a]))
    T('creer_salle',{'nom':'Salle praticables','confirme':True}); ev("STAGE.S.objs.length=0;STAGE.render();APP.renderer.setAnimationLoop(null)")
    O=lambda: ev("STAGE.S.objs.filter(o=>o.type==='prat').map(o=>({x:+o.pos[0].toFixed(2),z:+o.pos[2].toFixed(2),y:+o.pos[1].toFixed(2),h:o.size[2],yaw:o.yaw,g:o.grp}))")
    pg.keyboard.press('p'); pg.wait_for_timeout(500)
    arm=lambda extra='': ev("STAGE.UI.tab='lib';STAGE.UI.libCat='str';STAGE.UI.placing='prat';STAGE.UI.blkRot=false;STAGE.UI.blkH=.4;"+extra+"APP.toggleConsole(true);STAGE.render()")
    arm(); ok(pg.locator('#blkBox').count()==1 and pg.locator('#serieBox').count()==0,'bandeau des praticables à la place du bandeau de série')
    sc=ev("(()=>{const r=document.querySelector('#plan2d').getBoundingClientRect(),P=PLAN.P;return {l:r.left,t:r.top,ox:P.ox,oy:P.oy,s:P.s}})()")
    X=lambda x: sc['l']+sc['ox']+x*sc['s']; Z=lambda z: sc['t']+sc['oy']+z*sc['s']
    # ---- rectangle tracé : 6 m × 3 m
    pg.mouse.move(X(-3),Z(-1)); pg.mouse.down(); pg.mouse.move(X(0),Z(-2.5),steps=4); pg.mouse.move(X(3.1),Z(-4.1),steps=4); pg.mouse.up(); pg.wait_for_timeout(200)
    o=O(); xs=sorted(set(q['x'] for q in o)); zs=sorted(set(q['z'] for q in o))
    ok(len(o)==9 and xs==[-2,0,2] and zs==[-3.5,-2.5,-1.5] and all(q['h']==.4 and q['y']==0 for q in o),'rectangle 6 × 3 m : 9 modules jointifs à 40 cm',[xs,zs])
    ok(len(set(q['g'] for q in o))==1 and o[0]['g']=='Scène 1' and len(ev("STAGE.UI.sel"))==9,'un seul groupe « Scène 1 », tout sélectionné')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(200); ok(ev("STAGE.S.objs.length")==0,'un seul Ctrl+Z retire le bloc')
    # ---- un clic : bloc 3 × 2 à 80 cm, centré
    arm("STAGE.UI.blkCols=3;STAGE.UI.blkRows=2;STAGE.UI.blkH=.8;"); pg.mouse.click(X(0),Z(-3)); pg.wait_for_timeout(200)
    o=O(); xs=sorted(set(q['x'] for q in o)); zs=sorted(set(q['z'] for q in o))
    ok(len(o)==6 and xs==[-2,0,2] and zs==[-3.5,-2.5] and all(q['h']==.8 for q in o),'un clic : bloc 3 × 2 centré, à 80 cm',[xs,zs])
    # ---- aimant : un deuxième bloc qui démarre près du bord droit se colle
    arm("STAGE.UI.blkH=.8;"); pg.mouse.move(X(3.15),Z(-3.9)); pg.mouse.down(); pg.mouse.move(X(4),Z(-3),steps=3); pg.mouse.move(X(5.1),Z(-2.05),steps=3); pg.mouse.up(); pg.wait_for_timeout(200)
    o=O()[6:]; ok(len(o)==2 and sorted(q['x'] for q in o)==[4,4] and sorted(q['z'] for q in o)==[-3.5,-2.5] and o[0]['g']=='Scène 2','aimant : le nouveau bloc se colle au bord du premier',o)
    # ---- modules tournés
    ev("STAGE.S.objs.length=0;STAGE.render()"); arm("STAGE.UI.blkRot=true;"); pg.mouse.move(X(0),Z(0-1)); pg.mouse.down(); pg.mouse.move(X(1),Z(-3),steps=3); pg.mouse.move(X(2),Z(-5),steps=3); pg.mouse.up(); pg.wait_for_timeout(200)
    o=O(); ok(len(o)==4 and all(q['yaw']==90 for q in o) and sorted(set(q['x'] for q in o))==[.5,1.5] and sorted(set(q['z'] for q in o))==[-4,-2],'modules tournés : 2 × 2 en 1 × 2 m',o)
    # ---- scène toute faite
    ev("STAGE.S.objs.length=0;STAGE.UI.sel=[];STAGE.UI.placing=null;STAGE.UI.tab='lib';STAGE.UI.libCat='str';STAGE.render()"); pg.evaluate("h=>h.remove()",hide); ev("document.querySelector('#modal').style.display='none'")
    pg.click('[data-a="scene"]'); pg.wait_for_selector('#scW'); pg.fill('#scW','8'); pg.fill('#scD','4'); pg.select_option('#scH','1'); pg.click('[data-a="sceneok"]'); pg.wait_for_timeout(300)
    o=O(); xs=sorted(set(q['x'] for q in o)); zs=sorted(set(q['z'] for q in o))
    ok(len(o)==16 and xs==[-3,-1,1,3] and zs==[-3.5,-2.5,-1.5,-.5] and all(q['h']==1 for q in o),'scène 8 × 4 m à 1 m : 16 modules, centrée, du nez de scène vers le lointain',[xs,zs])
    # ---- vue 3D : tracer un rectangle sur le plateau
    pg.keyboard.press('p'); pg.wait_for_timeout(300); ev("STAGE.S.objs.length=0;STAGE.render()"); arm(); ev("VIEW3D.goView('top');APP.renderer.render(APP.scene,APP.camera)"); pg.wait_for_timeout(300)
    pr=ev("(()=>{const T=APP.THREE,r=APP.canvas.getBoundingClientRect(),f=(x,z)=>{const v=new T.Vector3(x,0,z).project(APP.camera);return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]};return [f(-2,-1),f(0,-2),f(2.1,-3.1)]})()")
    pg.mouse.move(*pr[0]); pg.mouse.down(); pg.mouse.move(*pr[1],steps=4); pg.mouse.move(*pr[2],steps=4); pg.wait_for_timeout(100)
    tip=pg.inner_text('#serieTip'); ok('2 × 2 modules' in tip and '4 praticables' in tip,'vue 3D : étiquette pendant le tracé',tip)
    pg.mouse.up(); pg.wait_for_timeout(300); o=O(); xs=sorted(set(q['x'] for q in o)); zs=sorted(set(q['z'] for q in o))
    ok(len(o)==4 and xs==[-1,1] and zs==[-2.5,-1.5],'vue 3D : 4 modules posés dans le rectangle',[xs,zs])
    ok(not errs,'aucune erreur de page',errs[:2]); b.close()
finally: g.terminate()
print('\nECHECS:',bad if bad else 'aucun'); raise SystemExit(1 if bad else 0)
