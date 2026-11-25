# moteur posé seul : même palan dessiné, se choisit, sa fiche a repère / fonction / chaîne, se glisse à la souris dans la vue 3D, et un pont dessous le reprend
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click()"); pg.wait_for_timeout(400); pg.wait_for_function("!!PONTS.gz",timeout=30000)
    ev("(()=>{PONTS.O.series='prolyte-h30v';PONTS.O.hang='none';PONTS.O.zMm=3000;PONTS.addPoints([{x:-2000,y:2000}]);const f=STAGE.S.sups[0];f.zMm=6000;PONTS.sync();PONTS.select(null);APP.camera.position.set(0,6,9);APP.orbit.target.set(0,3.5,0);APP.orbit.update()})()"); pg.wait_for_timeout(1300)
    k=ev("[STAGE.S.sups.length,STAGE.S.sups[0].kind,STAGE.S.sups[0].pt.kind]"); ok(k==[1,'point','hoist'],'un moteur posé seul',k)
    n=ev("(()=>{let m=0,c=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.material.color&&o.material.color.getHex()===0xd9a514)m++;if(o.isInstancedMesh)c+=o.count});return [m,c]})()"); ok(n[0]==2 and n[1]>15,'il est dessiné comme un vrai palan (deux flasques, chaîne à maillons)',n)
    S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    yb=6-1.2-.6+.44; p0=ev(S3,[-2,yb,-2]); pg.mouse.click(*p0); pg.wait_for_timeout(800); pg.screenshot(path=OUT+'/t101.png',clip={'x':60,'y':45,'width':540,'height':560})
    ok(ev("PONTS.sel")==ev("STAGE.S.sups[0].id") and ev("!!document.querySelector('[data-pk=pt_tag]')&&!!document.querySelector('[data-pk=pt_chainM]')"),'clic dessus : il est choisi, sa fiche propose repère, fonction et longueur de chaîne')
    pg.fill('[data-pk=pt_tag]','M7'); pg.keyboard.press('Tab'); pg.wait_for_timeout(500); pg.fill('[data-pk=pt_chainM]','2'); pg.keyboard.press('Tab'); pg.wait_for_timeout(700); ok(ev("[STAGE.S.sups[0].pt.tag,STAGE.S.sups[0].pt.chainMm]")==['M7',2000],'repère et chaîne saisis',ev("[STAGE.S.sups[0].pt.tag,STAGE.S.sups[0].pt.chainMm]"))
    # glisser dans la vue 3D
    yb=6-2-.6+.44; p0=ev(S3,[-2,yb,-2]); p1=ev(S3,[0,yb,-2]); cam0=ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))"); pg.mouse.move(*p0); pg.mouse.down(); pg.mouse.move((p0[0]+p1[0])/2,(p0[1]+p1[1])/2,steps=5); pg.mouse.move(*p1,steps=5); pg.mouse.up(); pg.wait_for_timeout(900); a=ev("STAGE.S.sups[0].a")
    ok(abs(a['x']-0)<=150 and abs(a['y']-2000)<=150 and a['x']%50==0 and ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))")==cam0 and ev("APP.orbit.enabled")==True,'glisser à la souris dans la vue 3D : il se déplace de 2 m à sa hauteur, la caméra ne tourne pas',a)
    # un pont tracé dessous le reprend
    ev("(()=>{const f=STAGE.S.sups[0];PONTS.addTruss({x:f.a.x-3000,y:f.a.y},{x:f.a.x+3000,y:f.a.y},null,true);PONTS.sync()})()"); pg.wait_for_timeout(900); r=ev("(()=>{const t=STAGE.S.sups.find(s=>s.kind==='truss'),f=STAGE.S.sups.find(s=>s.kind==='point');return [t.points.map(p=>[!!p.pid,p.tag,p.chainMm]),!!f.on,PONTS.hoists().map(h=>[h.p.tag,h.sling])]})()")
    ok(r[0]==[[True,'M7',2000]] and r[1] and r[2][0][0]=='M7' and r[2][0][1]==6000-3287-2000,'un pont tracé dessous le reprend comme point d\'accroche, avec son repère et sa chaîne (ici trop courte de 71 cm)',r)
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
