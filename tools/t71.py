# Aimant : un appareil amené sur une perche ou un pont s'y accroche ; un moteur amené sur un pont devient son point de levage.
import os, sys
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:400],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && !!PONTS.nearest && !!STAGE.magnet",timeout=60000); pg.wait_for_timeout(1500)
    ev("""(()=>{PONTS.O.hang='none';PONTS.addTruss({x:-4000,y:3000},{x:4000,y:3000},null,true);PONTS.addTruss({x:-4000,y:6000},{x:4000,y:6000},null,true);STAGE.place('par-led',STAGE.hitAt(0,1),true);STAGE.place('wedge',STAGE.hitAt(2,1),true);STAGE.touch();STAGE.setLive(false);PLAN.fit();PLAN.draw()})()""")
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    def drag(a,b,alt=False):
        pg.mouse.move(*P(*a)); pg.mouse.down(); m=((a[0]+b[0])/2,(a[1]+b[1])/2)
        if alt: pg.keyboard.down('Alt')
        pg.mouse.move(*P(*m),steps=3); pg.mouse.move(*P(*b),steps=3); pg.mouse.up()
        if alt: pg.keyboard.up('Alt')
        pg.wait_for_timeout(300)
    O=lambda i: ev("(i)=>{const o=STAGE.S.objs[i];return {h:o.hang,sid:o.sid||null,x:o.pos[0],y:o.pos[1],z:o.pos[2]}}",i)
    s1,s2=ev("STAGE.S.sups.map(s=>s.id)")
    ok(O(0)['h'] is None and O(0)['y']==0,'projecteur posé au sol au départ',O(0))
    # glissé près du premier pont (à 40 cm de l'axe) : il s'y accroche
    drag((0,1),(0.5,-2.6)); o=O(0); ok(o['h']=='pont' and o['sid']==s1 and o['z']==-3 and abs(o['y']-4.97)<.01 and abs(o['x']-.5)<.06,'projecteur amené près du pont : suspendu dessous, calé sur l\'axe',o)
    ok(ev("PONTS.resOf(STAGE.S.sups[0].id).count")==1,'le pont le compte dans sa charge')
    # glissé le long : reste dessus ; glissé vers le second pont : change de pont
    drag((0.5,-3),(-2,-3.1)); o=O(0); ok(o['sid']==s1 and abs(o['x']+2)<.06 and o['z']==-3,'glissé le long du pont : il coulisse',o)
    drag((-2,-3),(-2,-5.8)); o=O(0); ok(o['h']=='pont' and o['sid']==s2 and o['z']==-6,'amené sur l\'autre pont : il change de pont',o)
    # tiré loin de tout pont : décroché, hauteur gardée
    drag((-2,-6),(-2,-9)); o=O(0); ok(o['h']=='fixe' and o['sid'] is None and abs(o['y']-4.97)<.01 and o['z']==-9,'tiré hors des ponts : décroché, accroche fixe à la même hauteur',o)
    # Alt : pas d'aimant
    ev("(()=>{const o=STAGE.S.objs[0];o.hang=null;o.pos=[0,0,1];STAGE.touch()})()"); drag((0,1),(0,-3),alt=True); o=O(0); ok(o['h'] is None and o['y']==0 and o['z']==-3,'Alt enfoncé : il passe sous le pont sans s\'accrocher',o)
    # un retour de scène ne s'accroche jamais
    drag((2,1),(2,-3)); o=O(1); ok(o['h'] is None and o['y']==0,'retour de scène glissé sous le pont : reste au sol',o)
    # traversée : un projecteur au sol qui passe sur le pont et continue redevient au sol
    ev("(()=>{const o=STAGE.S.objs[0];o.hang=null;o.pos=[3,0,1];STAGE.touch()})()"); drag((3,1),(3,-4.5)); o=O(0); ok(o['h'] is None and o['y']==0 and o['z']==-4.5,'projecteur au sol qui traverse le pont et s\'arrête plus loin : toujours au sol',o)
    # moteur libre amené sur le pont : calé sur l'axe, point de levage
    ev("PONTS.O.pt.nx=1;PONTS.O.pt.nz=1;PONTS.O.pt.kind='hoist';PONTS.addPoints([{x:-3000,y:1000}])"); pg.wait_for_timeout(200); ok(ev("STAGE.S.sups[0].points.length")==0,'moteur posé à côté : le pont n\'a pas de point')
    drag((-3,-1),(-3.1,-2.7)); m=ev("STAGE.S.sups.find(s=>s.kind==='point').a"); pts=ev("STAGE.S.sups[0].points.map(p=>[p.alongMm,p.kind,!!p.pid])")
    ok(m['y']==3000 and pts==[[abs(m['x']+4000),'hoist',True]],'moteur amené à 30 cm du pont : calé sur l\'axe, devenu point de levage',[m,pts])
    # second moteur amené au bout du pont
    ev("PONTS.addPoints([{x:3000,y:1000}])"); drag((3,-1),(3.8,-2.9)); pts=ev("STAGE.S.sups[0].points.map(p=>p.alongMm)"); ok(len(pts)==2 and pts[1]==8000,'second moteur amené près du bout : calé sur le bout du pont',pts)
    ok(ev("PONTS.resOf(STAGE.S.sups[0].id).error")==None,'deux moteurs : le pont se calcule')
    # vue 3D : flèches — monter un projecteur au sol jusqu'au pont l'accroche
    r=ev("""(()=>{const o=STAGE.S.objs[0];o.hang=null;o.pos=[1,0,-3];STAGE.touch();const m=[[o,STAGE.magState(o)]];o.pos[1]=2;const a=STAGE.magnet(m,.6,false,true);const h1=o.hang;o.pos[1]=4.6;STAGE.magnet(m,.6,false,true);return [h1,o.hang,o.sid,o.pos]})()""")
    ok(r[0] is None and r[1]=='pont' and abs(r[3][1]-4.97)<.01,'3D : à 2 m de haut rien ; monté à 40 cm du pont, il s\'accroche',r)
    ok(not errs,'aucune erreur de script',errs[:4]); pg.screenshot(path=OUT+'/t71.png'); b.close()
print('ÉCHECS :',bad if bad else 'aucun')
