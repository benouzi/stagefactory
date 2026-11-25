# gizmo 3D des structures : flèches et anneau déplacent / tournent TOUT ce qui est boulonné ensemble
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200)
    SU="STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.a.x,s.a.y,s.b.x,s.b.y,s.zMm])"
    pg.wait_for_function("!!PONTS.gz",timeout=30000)
    ev("PONTS.select(null)"); pg.wait_for_timeout(500); ok(ev("!PONTS.gz.gz.object"),'rien de choisi : pas de gizmo')
    ev("(()=>{APP.camera.position.set(-9,9,10);APP.orbit.target.set(0,3,-3);APP.orbit.update()})()"); pg.wait_for_timeout(900)
    S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    pg.mouse.click(*ev(S3,[1,ev('STAGE.S.sups[0].zMm')/1000+.28,0])); pg.wait_for_timeout(900)
    g=ev("(()=>{const z=PONTS.gz;return {on:!!z.gz.object,rot:!!z.gzR.object,p:z.proxy.position.toArray().map(v=>+v.toFixed(2)),pc:!!PONTS.pc}})()"); ok(g['on'] and g['rot'] and g['pc'] and g['p'][0]==0 and g['p'][2]==-3 and 4.5<g['p'][1]<5.6,'clic sur une pièce du gril : le gizmo (flèches + anneau) apparaît au centre de la structure',g)
    pg.screenshot(path=OUT+'/t91.png',clip={'x':60,'y':45,'width':1090,'height':560})
    # glisser la flèche X à la souris
    s0=ev(SU); h=ev("(()=>{const z=PONTS.gz,c=z.proxy.position;let sc=null;(z.gz.getHelper?z.gz.getHelper():z.gz).traverse(o=>{if(sc==null&&o.name==='X'&&o.isMesh&&o.visible){o.updateWorldMatrix(true,false);const w=new APP.THREE.Vector3();o.getWorldScale(w);sc=Math.max(w.x,w.y,w.z)}});return sc?[c.x+.3*sc,c.y,c.z,sc]:null})()"); print('poignée',h); h=h and h[:3]
    moved=False
    if h:
        x,y=ev(S3,h); x2,y2=ev(S3,[h[0]+2,h[1],h[2]]); pg.mouse.move(x,y); pg.wait_for_timeout(200); pg.mouse.down(); pg.mouse.move((x+x2)/2,(y+y2)/2,steps=5); pg.mouse.move(x2,y2,steps=5); pg.mouse.up(); pg.wait_for_timeout(900); s1=ev(SU)
        dx=[b_[0]-a_[0] for a_,b_ in zip(s0,s1)]; dy=[b_[1]-a_[1] for a_,b_ in zip(s0,s1)]; moved=len(set(dx))==1 and len(set(dy))==1 and ((abs(dx[0])>=300)!=(abs(dy[0])>=300)) and (dx[0]==0 or dy[0]==0) and dx[0]%50==0 and dy[0]%50==0 and all(b_[4]==a_[4] and b_[2]-a_[2]==dx[0] and b_[3]-a_[3]==dy[0] for a_,b_ in zip(s0,s1))
        ok(moved and ev("PONTS.nodes().length")==4,'glisser une flèche du gizmo à la souris : les quatre travées avancent ensemble sur ce seul axe, par pas de 5 cm, les coins tiennent',[dx,dy])
        pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(800); ok(ev(SU)==s0,'Ctrl+Z : un seul pas ramène tout')
    else: ok(False,'poignée X du gizmo introuvable')
    # même chemin que la souris, piloté directement : translation, hauteur, rotation
    ev("(()=>{const z=PONTS.gz;z.start(false);z.proxy.position.x+=1.5;z.proxy.position.z+=2;z.proxy.position.y+=.5;z.apply(false);z.end()})()"); pg.wait_for_timeout(700); s1=ev(SU)
    ok(all(b_[0]-a_[0]==1500 and b_[2]-a_[2]==1500 and b_[1]-a_[1]==-2000 and b_[3]-a_[3]==-2000 and b_[4]-a_[4]==500 for a_,b_ in zip(s0,s1)),'déplacement : +1,5 m en X, +2 m vers le public, +0,5 m en hauteur pour toute la structure',[s0[0],s1[0]])
    lg=ev("(()=>{const s=STAGE.S.sups.find(s=>(s.points||[]).some(p=>p.leg)),p=s.points.find(p=>p.leg);return [PONTS.legMm(s,p),s.zMm]})()"); ok(lg[1]==s1[0][4] and lg[0]>4400,'les tours suivent la nouvelle hauteur',lg)
    ev("(()=>{const z=PONTS.gz,q=new APP.THREE.Quaternion().setFromAxisAngle(new APP.THREE.Vector3(0,1,0),Math.PI/2);z.start(true);z.proxy.quaternion.copy(q);z.apply(true);z.end()})()"); pg.wait_for_timeout(700); s2=ev(SU)
    L=lambda q: round(((q[2]-q[0])**2+(q[3]-q[1])**2)**.5)
    ok([L(q) for q in s2]==[L(q) for q in s1] and all(abs(q[2]-q[0])<3 for q in s2[:2]) and ev("PONTS.nodes().length")==4 and ev("PONTS.structs().length")==1,'rotation de 90° : la structure tourne d\'un bloc autour de son centre, longueurs et coins conservés',s2)
    g=ev("PONTS.gz.proxy.position.toArray().map(v=>+v.toFixed(2))"); ok(g[0]==1.5 and g[2]==-1,'le gizmo est resté au centre de la structure',g)
    ev("PONTS.select(null)"); pg.wait_for_timeout(500); ok(ev("!PONTS.gz.gz.object"),'désélection : le gizmo disparaît')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
