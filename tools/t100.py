# un moteur se choisit d'un clic (vue 3D, plan, arbre) : barre, fiche complète, flèche pour le glisser, Suppr, Échap
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
    ev("(()=>{PONTS.O.series='prolyte-h30v';PONTS.O.hang='auto';PONTS.O.zMm=3000;PONTS.addTruss({x:-6000,y:0},{x:6000,y:0},null,true);PONTS.select(null);APP.camera.position.set(0,6,9);APP.orbit.target.set(0,3,0);APP.orbit.update()})()"); pg.wait_for_timeout(1200)
    al=ev("STAGE.S.sups[0].points.map(p=>p.alongMm)"); S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    x1=(al[1]-6000)/1000; pg.mouse.click(*ev(S3,[x1,3.29+.32,0])); pg.wait_for_timeout(900)
    t=ev("document.querySelector('#pontBar').innerText.replace(/\\n/g,' ')"); r=ev("({pt:PONTS.pt,bar:getComputedStyle(document.querySelector('#pontBar')).display,det:!!document.querySelector('.pt-det'),tree:[...document.querySelectorAll('.ptree>div.on')].map(d=>d.innerText.replace(/\\n/g,' ')),gz:PONTS.gz.ptMode,gx:+PONTS.gz.proxy.position.x.toFixed(2)})")
    ok(r['pt'] and r['pt']['pi']==1 and r['bar']=='flex' and t.startswith('Moteur') and 'Capacité' in t and 'Chaîne' in t and r['det'],'clic sur un moteur dans la vue 3D : il est choisi, sa barre s\'ouvre (repère, capacité, chaîne, charge reprise) et sa fiche complète est ouverte dans l\'Inspecteur',[r,t[:120]])
    ok(len(r['tree'])==1 and r['tree'][0].startswith('Moteur') and r['gz'] and abs(r['gx']-x1)<.01,'il est marqué dans l\'arbre, et une flèche est posée sur lui',r)
    hi=ev("(()=>{let n=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.material&&o.material.emissive&&o.material.emissive.getHex()===0x4a3008)n++});return n})()"); ok(1<=hi<=3,'seul ce moteur est mis en évidence (ses flasques)',hi); pg.screenshot(path=OUT+'/t100.png',clip={'x':60,'y':45,'width':1090,'height':560})
    pg.fill('#pontBar [data-pk=capacityKg]','500'); pg.keyboard.press('Tab'); pg.wait_for_timeout(500); pg.fill('#pontBar [data-pk=tag]','M2'); pg.keyboard.press('Tab'); pg.wait_for_timeout(600); ok(ev("[STAGE.S.sups[0].points[1].capacityKg,STAGE.S.sups[0].points[1].tag]")==[500,'M2'],'capacité et repère saisis dans la barre')
    ev("(()=>{const z=PONTS.gz;z.start(false,false);z.proxy.position.x+=1;z.apply(false);z.end()})()"); pg.wait_for_timeout(900); a2=ev("STAGE.S.sups[0].points.map(p=>p.alongMm)"); ok(a2[1]==al[1]+1000 and a2[0]==al[0] and ev("PONTS.pt&&PONTS.pt.pi")==1,'la flèche le fait glisser de 1 m le long du pont ; il reste choisi',a2)
    pg.click('#pontBar [data-pa=ptNav][data-id="1"]'); pg.wait_for_timeout(600); ok(ev("PONTS.pt.pi")==2,'▶ : moteur suivant')
    # plan
    ev("PONTS.select(null);document.querySelector('#planBtn').click()"); pg.wait_for_timeout(600); ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300)
    xy=ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[(a2[0]-6000)/1000,0]); pg.mouse.click(*xy); pg.wait_for_timeout(700); ok(ev("PONTS.pt&&PONTS.pt.pi")==0,'clic sur un moteur dans le plan : il est choisi',ev("PONTS.pt"))
    n0=len(a2); pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Delete'); pg.wait_for_timeout(800); ok(ev("STAGE.S.sups[0].points.length")==n0-1 and ev("!PONTS.pt") and ev("STAGE.S.sups.length")==1,'Suppr : ce moteur est retiré, pas le pont',ev("STAGE.S.sups[0].points.length"))
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(700); ok(ev("STAGE.S.sups[0].points.length")==n0,'Ctrl+Z : il revient')
    pg.click('.ptree [data-id^="pt|"]',timeout=8000); pg.wait_for_timeout(600); ok(ev("!!PONTS.pt"),'clic sur le moteur dans l\'arbre : il est choisi'); pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Escape'); pg.wait_for_timeout(500); ok(ev("!PONTS.pt&&PONTS.st===true"),'Échap : on remonte au pont')
    # glisser un moteur à la souris : vue 3D puis plan
    ev("PONTS.select(null);(()=>{APP.camera.position.set(0,6,9);APP.orbit.target.set(0,3,0);APP.orbit.update()})()"); pg.wait_for_timeout(1000); a3=ev("STAGE.S.sups[0].points.map(p=>p.alongMm)"); cam0=ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))")
    x0=(a3[1]-6000)/1000; p0=ev(S3,[x0,3.29+.44,0]); p1=ev(S3,[x0-1.5,3.29+.44,0]); pg.mouse.move(*p0); pg.mouse.down(); pg.mouse.move((p0[0]+p1[0])/2,(p0[1]+p1[1])/2,steps=5); pg.mouse.move(*p1,steps=5); pg.mouse.up(); pg.wait_for_timeout(900); a4=ev("STAGE.S.sups[0].points.map(p=>p.alongMm)")
    ok(abs(a4[1]-(a3[1]-1500))<=150 and a4[0]==a3[0] and a4[2]==a3[2] and a4[1]%50==0 and ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))")==cam0 and ev("PONTS.pt&&PONTS.pt.pi")==1,'glisser un moteur dans la vue 3D : il coulisse le long du pont (ici 1,5 m), la caméra ne tourne pas, il reste choisi',[a3,a4])
    pg.wait_for_timeout(300); ok(ev("APP.orbit.enabled")==True,'la caméra est de nouveau libre après le geste')
    ev("PONTS.select(null);PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(400); PX=lambda x: ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,0])
    q0=PX((a4[0]-6000)/1000); q1=PX((a4[0]-6000)/1000+1); pg.mouse.move(*q0); pg.mouse.down(); pg.mouse.move((q0[0]+q1[0])/2,q0[1],steps=4); pg.mouse.move(*q1,steps=4); pg.mouse.up(); pg.wait_for_timeout(800); a5=ev("STAGE.S.sups[0].points.map(p=>p.alongMm)"); sa=ev("[STAGE.S.sups[0].a.x,STAGE.S.sups[0].b.x]")
    ok(abs(a5[0]-(a4[0]+1000))<=100 and a5[1]==a4[1] and sa==[-6000,6000],'glisser un moteur dans le plan : il coulisse de 1 m, le pont ne bouge pas',[a4,a5,sa])
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(600); ok(ev("STAGE.S.sups[0].points.map(p=>p.alongMm)")==a4,'Ctrl+Z : un seul pas par glisser')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
