# Formes de base (plan, cube, sphère, cylindre, cône…) : objets posables en plan et en 3D, déplaçables comme tout objet.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:380],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=des]').click();document.querySelector('#planBtn').click()"); pg.wait_for_timeout(600); ev("PLAN.fit();PLAN.draw()")
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    OB=lambda: ev("STAGE.S.objs.map(o=>({id:o.id,t:o.type,pos:o.pos.map(v=>Math.round(v*100)/100),size:o.size,pcol:o.pcol||null,rx:o.rx||0}))")
    ok(all(ev("!!document.querySelector('#rail [data-t=%s]')"%k) for k in ['pplane','pcube','psph','pcyl','pcone']),'cinq formes de base dans le rail du métier Dessin')
    ok(ev("['prim-plan','prim-cube','prim-sphere','prim-cyl','prim-cone','prim-pyr','prim-dome','prim-coin','prim-tore'].every(i=>STAGE.LIBALL().some(t=>t.id===i))"),'neuf formes dans la bibliothèque')
    # pose dans le plan 2D
    pg.click('#rail [data-t=pcube]'); pg.wait_for_timeout(200); pg.mouse.click(*P(-2,2)); pg.wait_for_timeout(400)
    o=OB(); ok(len(o)==1 and o[0]['t']=='prim-cube' and abs(o[0]['pos'][0]+2)<.06 and abs(o[0]['pos'][2]-2)<.06 and o[0]['pos'][1]==0,'cube posé d\'un clic dans le plan 2D',o)
    m=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs[0].id),b=new APP.THREE.Box3().setFromObject(r.head);return [...b.min.toArray(),...b.max.toArray()].map(v=>Math.round(v*100)/100)})()"); ok(abs(m[3]-m[0]-1)<.02 and abs(m[4]-m[1]-1)<.02 and abs(m[1])<.02,'volume 3D : 1 × 1 × 1 m posé au sol',m)
    # pose dans la vue 3D
    ev("(()=>{APP.camera.position.set(0,9,11);APP.orbit.target.set(0,0,1);APP.orbit.update()})()"); pg.wait_for_timeout(500)
    pg.click('#rail [data-t=psph]'); pg.wait_for_timeout(200)
    xy=ev("(()=>{const v=new APP.THREE.Vector3(2,0,2).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]})()"); pg.mouse.click(*xy); pg.wait_for_timeout(500)
    o=OB(); ok(len(o)==2 and o[1]['t']=='prim-sphere' and abs(o[1]['pos'][0]-2)<.15 and abs(o[1]['pos'][2]-2)<.15,'sphère posée d\'un clic dans la vue 3D',o[-1])
    for k,x in [('pplane',-4),('pcyl',0),('pcone',4)]:
        pg.click('#rail [data-t=%s]'%k); pg.wait_for_timeout(150); pg.mouse.click(*P(x,-1.5)); pg.wait_for_timeout(300)
    for i,(t,x) in enumerate([('prim-pyr',-3),('prim-dome',-1),('prim-coin',1.5),('prim-tore',3.5)]): ev("([t,x])=>STAGE.place(t,{point:new APP.THREE.Vector3(x,0,4.5),object:{userData:{}}})",[t,x])
    pg.wait_for_timeout(500); o=OB(); ok(len(o)==9,'les neuf formes sont posées et se construisent',[x['t'] for x in o])
    # sélection dans le plan, gizmo, déplacement à la souris
    pg.keyboard.press('Escape'); pg.mouse.click(*P(-2,2)); pg.wait_for_timeout(300); ok(ev("STAGE.UI.sel[0]")==o[0]['id'],'clic dans le plan : le cube est choisi')
    ok(ev("!!(APP.gizmo||APP.tc||STAGE.RT.get(STAGE.UI.sel[0]))") ,'objet géré comme les autres (runtime)')
    pg.mouse.move(*P(-2,2)); pg.mouse.down(); pg.mouse.move(*P(-1.8,2.2),steps=3); pg.mouse.move(*P(-1,3),steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    q=OB()[0]['pos']; ok(abs(q[0]+1)<.1 and abs(q[2]-3)<.1,'glisser dans le plan : le cube suit',q)
    # inspecteur : cotes, couleur, bascule
    ins=ev("[...document.querySelectorAll('[data-k]')].map(e=>e.dataset.k)"); ok(all(k in ins for k in ['size0','size1','size2','pcol','rx','rz']),'inspecteur : cotes, couleur, bascules',ins[:14])
    ev("(()=>{const s=(k,v)=>{const e=document.querySelector(`[data-k=${k}]`);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};s('size0',3);s('size2',0.4);s('pcol','#c0392b')})()"); pg.wait_for_timeout(400)
    q=OB()[0]; m=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs[0].id),b=new APP.THREE.Box3().setFromObject(r.head);let c='';r.head.traverse(x=>{if(x.isMesh)c=x.material.color.getHexString()});return [Math.round((b.max.x-b.min.x)*100)/100,Math.round((b.max.y-b.min.y)*100)/100,c]})()")
    ok(q['size']==[3,1,0.4] and q['pcol']=='#c0392b' and m==[3,0.4,'c0392b'],'cotes et couleur changées : le volume suit',[q,m])
    # enregistrement
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(700); o=OB(); ok(len(o)==9 and o[0]['size']==[3,1,0.4] and o[0]['pcol']=='#c0392b','enregistré et rechargé',o[0])
    ev("STAGE.select([]);PLAN.fit();PLAN.draw();(()=>{APP.camera.position.set(0,7,12);APP.orbit.target.set(0,.4,1.5);APP.orbit.update()})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t81.png')
    ev("STAGE.select([STAGE.S.objs[1].id])"); pg.wait_for_timeout(700); pg.screenshot(path=OUT+'/t81-sel.png')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
