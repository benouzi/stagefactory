# une forme finie est choisie et a son gizmo dans la vue 3D : flèches (déplacer, hauteur), anneau (tourner), aussi pour une forme debout
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
HANDLE="""([ax,d])=>{const T=APP.THREE,z=DRAW.gz,g=z.gz,cam=g.camera,p=z.proxy.getWorldPosition(new T.Vector3()),dir=new T.Vector3(ax==='X'?1:0,ax==='Y'?1:0,ax==='Z'?1:0);
 const f=p.distanceTo(cam.position)*Math.min(1.9*Math.tan(Math.PI*cam.fov/360)/cam.zoom,7),s=f*g.size/4,P=v=>{const w=v.clone().project(cam),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(w.x+1)/2*r.width,r.top+(1-w.y)/2*r.height]},h=p.clone().addScaledVector(dir,.3*s);return [P(h),P(h.clone().addScaledVector(dir,d))]}"""
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && !!PLAN.world && DRAW.gz && DRAW.gz.gz",timeout=60000); pg.wait_for_timeout(1500)
    ev("(()=>{if(!PLAN.P.on)PLAN.toggle(true)})()"); pg.wait_for_timeout(700)
    WP="([x,z])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+x*PLAN.P.s,r.top+PLAN.P.oy+z*PLAN.P.s]}"
    W="([u,h])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+u*PLAN.P.s,r.top+PLAN.P.oy-h*PLAN.P.s]}"
    def drag2(a,b_,w):
        A_=ev(w,a); B_=ev(w,b_); pg.mouse.move(*A_); pg.wait_for_timeout(100); pg.mouse.down(); pg.wait_for_timeout(80); pg.mouse.move((A_[0]+B_[0])/2,(A_[1]+B_[1])/2,steps=8); pg.mouse.move(*B_,steps=8); pg.wait_for_timeout(120); pg.mouse.up(); pg.wait_for_timeout(400)
    G="()=>{const z=DRAW.gz,h=t=>(t.getHelper?t.getHelper():t).visible&&t.enabled,r=v=>+v.toFixed(2);return {arrows:h(z.gz),ring:h(z.gzR),pos:z.proxy.position.toArray().map(r),sel:DRAW.sels.length}}"
    last="DRAW.shapes().slice(-1)[0]"
    g0=ev(G); ok(not g0['arrows'] and not g0['ring'],'rien de dessiné : pas de gizmo',g0)
    ev("DRAW.O.h=1;DRAW.tool('rect')"); pg.wait_for_timeout(300); drag2([-1,-3],[1,-1],WP); R=ev(last); pg.wait_for_timeout(500); g=ev(G)
    ok(ev("DRAW.sel")==R['id'] and g['arrows'] and g['ring'] and g['pos']==[0,.5,-2] and ev("DRAW.tl.k")=='rect','le rectangle à peine fini est choisi et son gizmo apparaît au centre du volume dans la vue 3D (l\'outil reste armé)',g)
    ev("(()=>{DRAW.tool(null);APP.camera.position.set(-7,7,6);APP.orbit.target.set(0,.5,-2);APP.orbit.update()})()"); pg.wait_for_timeout(1200); cam0=ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))")
    def pull(ax,d):
        a,t=ev(HANDLE,[ax,d]); pg.mouse.move(a[0]-3,a[1]-3); pg.mouse.move(*a,steps=3); pg.wait_for_timeout(250); got=ev("DRAW.gz.gz.axis"); pg.mouse.down(); pg.mouse.move((a[0]+t[0])/2,(a[1]+t[1])/2,steps=6); pg.mouse.move(*t,steps=6); pg.wait_for_timeout(150); pg.mouse.up(); pg.wait_for_timeout(700); pg.mouse.move(5,5); return got
    S="(id)=>{const s=DRAW.byId(id);return {p:s.p,y:s.y||0,h:s.h,rect:!!s.rect,pl:s.pl||'p',c:s.c}}"
    ax=pull('X',2); s=ev(S,R['id']); xs=sorted(set(q[0] for q in s['p'])); ok(ax=='X' and abs(xs[0]-1)<.11 and abs(xs[1]-3)<.11 and sorted(set(q[1] for q in s['p']))==[-3,-1] and ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))")==cam0,'tirer la flèche rouge de 2 m à la souris : la forme avance de 2 m vers cour, la caméra ne bouge pas',[ax,xs])
    ax=pull('Y',1.5); s=ev(S,R['id']); ok(ax=='Y' and abs(s['y']-1.5)<.11 and s['h']==1,'flèche verte, +1,5 m : la forme s\'élève (élévation 1,5 m), sa hauteur ne change pas',[ax,s['y']])
    ax=pull('Z',-1); s=ev(S,R['id']); zs=sorted(set(q[1] for q in s['p'])); ok(ax=='Z' and abs(zs[0]+4)<.11 and abs(zs[1]+2)<.11,'flèche bleue, 1 m vers le lointain',[ax,zs])
    g=ev(G); ok(abs(g['pos'][0]-2)<.11 and abs(g['pos'][1]-2)<.11 and abs(g['pos'][2]+3)<.11,'le gizmo a suivi la forme',g['pos'])
    # anneau : tourner (appliqué par l'API du gizmo, l'anneau n'est pas tiré à la souris ici)
    ev("(()=>{const z=DRAW.gz;z.gzR.dispatchEvent({type:'dragging-changed',value:true});z.proxy.rotation.y=Math.PI/2;z.gzR.dispatchEvent({type:'objectChange'});z.gzR.dispatchEvent({type:'dragging-changed',value:false})})()"); pg.wait_for_timeout(400); s2=ev(S,R['id']); c0=[sum(q[0] for q in s['p'])/4,sum(q[1] for q in s['p'])/4]; c2=[sum(q[0] for q in s2['p'])/4,sum(q[1] for q in s2['p'])/4]
    ok(abs(c0[0]-c2[0])<.01 and abs(c0[1]-c2[1])<.01 and sorted(set(round(q[0],2) for q in s2['p']))==sorted(set(round(q[0],2) for q in s['p'])),'anneau à 90° : la forme tourne sur place autour de son centre',[s2['p']])
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(4): pg.keyboard.press('Control+z'); pg.wait_for_timeout(500)
    s=ev(S,R['id']); ok(sorted(set(q[0] for q in s['p']))==[-1,1] and s['y']==0,'quatre Ctrl+Z : la forme revient à sa place (un pas par geste)',[s['p'],s['y']])
    # forme debout, tracée en face
    pg.click('[data-pv=face]'); pg.wait_for_timeout(700); ev("DRAW.O.h=.2;DRAW.tool('rect')"); pg.wait_for_timeout(300); drag2([3,0],[5,2],W); F=ev(last); ev("DRAW.tool(null)"); pg.wait_for_timeout(600); g=ev(G)
    ok(F['pl']=='f' and ev("DRAW.sel")==F['id'] and g['arrows'] and not g['ring'] and g['pos']==[4,1,-.1],'un panneau tracé en face est choisi lui aussi : gizmo au centre, flèches seulement (pas d\'anneau pour une forme debout)',g)
    ev("(()=>{APP.camera.position.set(-3,6,9);APP.orbit.target.set(4,1,0);APP.orbit.update()})()"); pg.wait_for_timeout(1200)
    ax=pull('Z',-3); s=ev(S,F['id']); ok(ax=='Z' and abs(s['y']+3)<.11 and sorted(set(q[0] for q in s['p']))==[3,5],'flèche bleue sur le panneau : il recule de 3 m — sa « position z » passe à -3, son dessin ne change pas',[ax,s['y']])
    ax=pull('Y',1); s=ev(S,F['id']); ys=sorted(set(q[1] for q in s['p'])); ok(ax=='Y' and abs(ys[0]-1)<.11 and abs(ys[1]-3)<.11,'flèche verte : le panneau monte d\'1 m',[ax,ys])
    pg.screenshot(path=OUT+'/t115-a.png',clip={'x':60,'y':45,'width':485,'height':515})
    ev("DRAW.select(null)"); pg.wait_for_timeout(400); g=ev(G); ok(not g['arrows'] and not g['ring'],'plus rien de choisi : le gizmo disparaît',g)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
