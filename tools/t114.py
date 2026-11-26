# dessiner en coupe et en face : formes debout (rectangle, tracé, main levée), 3D juste, retouche dans leur vue, encombrement dans les autres
import sys,os,math; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("(()=>{if(!PLAN.P.on)PLAN.toggle(true)})()"); pg.wait_for_timeout(700)
    # en coupe et en face, PLAN.world rend [u, hauteur] : l'écran est à oy - hauteur * s
    W="([u,h])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+u*PLAN.P.s,r.top+PLAN.P.oy-h*PLAN.P.s]}"
    WP="([x,z])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+x*PLAN.P.s,r.top+PLAN.P.oy+z*PLAN.P.s]}"
    def drag(a,b_,w=W,steps=8):
        A_=ev(w,a); B_=ev(w,b_); pg.mouse.move(*A_); pg.wait_for_timeout(100); pg.mouse.down(); pg.wait_for_timeout(80); pg.mouse.move((A_[0]+B_[0])/2,(A_[1]+B_[1])/2,steps=steps); pg.mouse.move(*B_,steps=steps); pg.wait_for_timeout(120); pg.mouse.up(); pg.wait_for_timeout(350)
    BX="(id)=>{const g=APP.scene.getObjectByName('dessin');g.updateMatrixWorld(true);const b=new APP.THREE.Box3();g.traverse(m=>{if((m.isMesh||m.isLine)&&m.userData.sid===id||(m.parent&&m.isLine&&m.parent.children.some(c=>c.userData&&c.userData.sid===id)))b.expandByObject(m)});const z=v=>+v.toFixed(2);return [...b.min.toArray().map(z),...b.max.toArray().map(z)]}"
    last="DRAW.shapes().slice(-1)[0]"
    # ---- FACE
    pg.click('[data-pv=face]'); pg.wait_for_timeout(700); chk=ev("(()=>{const [sx,sy]=(%s)([2,1.5]);return PLAN.world({clientX:sx,clientY:sy})})()"%W); ok(abs(chk[0]-2)<.01 and abs(chk[1]-1.5)<.01,'(repère : en face, un point [x, hauteur] retombe au bon endroit)',chk)
    ev("DRAW.O.h=0.3;DRAW.tool('rect')"); pg.wait_for_timeout(300); pg.mouse.move(*ev(W,[1,1])); pg.wait_for_timeout(150); c=ev("getComputedStyle(document.querySelector('#plan2d')).cursor"); drag([-2,0],[2,3]); R=ev(last)
    ok(c=='crosshair' and R and R.get('pl')=='f' and sorted(set(q[0] for q in R['p']))==[-2,2] and sorted(set(q[1] for q in R['p']))==[0,3],'vue Face, outil Rectangle : un panneau de 4 m de large et 3 m de haut est tracé, debout (points en x et en hauteur)',[c,R and R.get('pl'),R and R['p']])
    bx=ev(BX,R['id']); ok(bx==[-2,0,-.3,2,3,0],'en 3D le panneau est bien debout : x de -2 à 2, hauteur de 0 à 3, épaisseur de 30 cm vers le lointain (z de -0,3 à 0)',bx)
    ev("DRAW.tool(null)"); pg.wait_for_timeout(200); pg.mouse.click(*ev(W,[0,1.5])); pg.wait_for_timeout(400); bar=ev("document.querySelector('#drawBar').innerText").replace('\n',' '); ok(ev("DRAW.sel")==R['id'] and 'Épaisseur' in bar and 'Position z' in bar and 'Élévation' not in bar and 'Profondeur' not in bar,'un clic dessus le sélectionne ; sa barre parle d\'épaisseur et de position z (plus de hauteur / élévation)',bar[:120])
    drag([0,1.5],[1,2]); R2=ev("(id)=>DRAW.byId(id)",R['id']); ok(sorted(set(q[0] for q in R2['p']))==[-1,3] and sorted(set(q[1] for q in R2['p']))==[.5,3.5],'le glisser le déplace dans son plan : 1 m vers cour, 50 cm plus haut',R2['p'])
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(600)
    ev("(id)=>{const s=DRAW.byId(id);s.y=-4;DRAW.sync()}",R['id']); bx=ev(BX,R['id']); ok(bx[2]==-4.3 and bx[5]==-4,'position z = -4 m : le panneau recule de 4 m (z de -4,3 à -4)',bx)
    # main levée en face
    ev("DRAW.O.h=0;DRAW.tool('free')"); pg.wait_for_timeout(200); pts=[[-4+i*.2, 4+.6*math.sin(i*.5)] for i in range(30)]; pg.mouse.move(*ev(W,pts[0])); pg.mouse.down()
    for q in pts[1:]: pg.mouse.move(*ev(W,q),steps=2)
    pg.mouse.up(); pg.wait_for_timeout(400); Fr=ev(last); ok(Fr['pl']=='f' and Fr['k']=='poly' and not Fr['closed'] and len(Fr['p'])>=5 and abs(max(q[1] for q in Fr['p'])-4.6)<.08 and abs(min(q[1] for q in Fr['p'])-3.4)<.08,'main levée en face : la courbe est tracée entre 3,4 et 4,6 m de haut',[len(Fr['p'])])
    bx=ev("(id)=>{const g=APP.scene.getObjectByName('dessin');g.updateMatrixWorld(true);const b=new APP.THREE.Box3();g.traverse(m=>{if(m.isLine)b.expandByObject(m)});return [...b.min.toArray(),...b.max.toArray()].map(v=>+v.toFixed(2))}",Fr['id']); ok(abs(bx[1]-3.4)<.1 and abs(bx[4]-4.61)<.1 and abs(bx[2])<.03 and abs(bx[5])<.03 and abs(bx[0]+4)<.05,'en 3D elle est dans le plan du nez de scène (z = 0), à la bonne hauteur',bx)
    pg.screenshot(path=OUT+'/t114-face.png',clip={'x':545,'y':45,'width':620,'height':560})
    # ---- COUPE
    ev("DRAW.tool(null)"); pg.click('[data-pv=coupe]'); pg.wait_for_timeout(700)
    ev("DRAW.O.h=1;DRAW.tool('poly')"); pg.wait_for_timeout(200)
    for q in ([-6,0],[-3,0],[-6,2]): pg.mouse.click(*ev(W,q)); pg.wait_for_timeout(200)
    pg.mouse.click(*ev(W,[-6,0])); pg.wait_for_timeout(500); T=ev(last)
    ok(T['pl']=='c' and T['closed'] and len(T['p'])==3 and T['p'][2]==[-6,2],'vue Coupe, outil Tracé : un triangle (rampe) cliqué point par point, fermé sur son départ — points en profondeur et en hauteur',[T.get('pl'),T['p']])
    bx=ev(BX,T['id']); ok(bx==[0,0,-6,1,2,-3],'en 3D la rampe est debout dans la coupe : profondeur z de -6 à -3, hauteur de 0 à 2, épaisseur de 1 m vers cour (x de 0 à 1)',bx)
    ev("DRAW.tool('circle')"); pg.wait_for_timeout(200); drag([2,3],[3,3]); C=ev(last); bx=ev(BX,C['id']); ok(C['pl']=='c' and C['k']=='circle' and abs(C['r']-1)<.06 and abs(bx[2]-1)<.1 and abs(bx[5]-3)<.1 and abs(bx[1]-2)<.1 and abs(bx[4]-4)<.1,'cercle en coupe au glisser : un disque debout, centre à 2 m de profondeur et 3 m de haut',[C['c'],C['r'],bx])
    ev("DRAW.tool(null)"); pg.wait_for_timeout(200)
    # le panneau tracé en face n'est pas retouchable en coupe, mais on y voit son encombrement (trait à z = -4 de 0 à 3 m)
    pg.mouse.click(*ev(W,[-4.15,1.5])); pg.wait_for_timeout(300); ok(ev("DRAW.sel")!=R['id'],'en coupe, cliquer sur le panneau tracé en face ne le prend pas : une forme se retouche dans sa vue')
    pg.screenshot(path=OUT+'/t114-coupe.png',clip={'x':545,'y':45,'width':620,'height':560})
    # sommets : tirer le sommet haut de la rampe
    pg.mouse.click(*ev(W,[-5.5,.5])); pg.wait_for_timeout(300); drag([-6,2],[-6,3]); T2=ev("(id)=>DRAW.byId(id)",T['id']); ok(ev("DRAW.sel")==T['id'] and T2['p'][2]==[-6,3],'en coupe, tirer le sommet haut de la rampe : il monte à 3 m',T2['p'])
    # cadre de sélection en coupe
    pg.mouse.click(*ev(W,[6,5])); pg.wait_for_timeout(200); drag([-7,-.5],[-2,3.5]); ok(ev("DRAW.sels")==[T['id']],'le cadre de sélection en coupe prend la rampe',ev("DRAW.sels.length"))
    # ---- PLAN : les formes debout y apparaissent par leur emprise, et on dessine toujours à plat
    pg.click('[data-pv=plan]'); pg.wait_for_timeout(700); ev("DRAW.O.h=0.5;DRAW.tool('rect')"); pg.wait_for_timeout(200); drag([4,2],[6,3],w=WP); Pl=ev(last); bx=ev(BX,Pl['id'])
    ok(not Pl.get('pl') and bx==[4,0,2,6,.5,3],'retour en vue de dessus : un rectangle tracé là reste une forme à plat (hauteur 50 cm vers le haut)',bx)
    ev("DRAW.tool(null)"); pg.wait_for_timeout(200); pg.mouse.click(*ev(WP,[.5,-4.5])); pg.wait_for_timeout(300); ok(ev("DRAW.sel")!=T['id'] and ev("DRAW.sel")!=R['id'],'en vue de dessus, les formes debout ne se prennent pas (elles y sont dessinées par leur emprise)')
    pg.screenshot(path=OUT+'/t114-plan.png',clip={'x':545,'y':45,'width':620,'height':560})
    # mapping vidéo et enregistrement
    s=ev("JSON.parse(STAGE.serialize()).shapes.map(s=>s.pl||'p')"); ok(s.count('f')==2 and s.count('c')==2 and s.count('p')==1,'le plan de dessin de chaque forme est enregistré dans le projet',s)
    ev("(s)=>{STAGE.loadShow(JSON.parse(s));DRAW.sync&&DRAW.sync();STAGE.tick(0)}",ev("STAGE.serialize()")); pg.wait_for_timeout(900); bx=ev(BX,T['id']); ok(bx==[0,0,-6,1,3,-3],'projet rouvert : la rampe est toujours debout',bx)
    n=ev("(id)=>(VIDEO.planes('d:'+id)||[]).length",T['id']); ok(n==5,'la rampe tracée en coupe se mappe en vidéo comme les autres volumes : ses 5 faces sont lues',n)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
