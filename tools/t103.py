# VÉRIFICATION À LA SOURIS des flèches de gizmo faites aujourd'hui : travée (pousser, niveau, Ctrl = prolonger), coin, bout de pont, moteur
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
HANDLE="""([ax,d])=>{const T=APP.THREE,z=PONTS.gz,g=z.gz,cam=g.camera,p=z.proxy.getWorldPosition(new T.Vector3()),q=z.proxy.getWorldQuaternion(new T.Quaternion()),dir=new T.Vector3(ax==='X'?1:0,ax==='Y'?1:0,ax==='Z'?1:0);if(g.space==='local')dir.applyQuaternion(q);
 const f=p.distanceTo(cam.position)*Math.min(1.9*Math.tan(Math.PI*cam.fov/360)/cam.zoom,7),s=f*g.size/4,P=v=>{const w=v.clone().project(cam),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(w.x+1)/2*r.width,r.top+(1-w.y)/2*r.height]},h=p.clone().addScaledVector(dir,.3*s);return [P(h),P(h.clone().addScaledVector(dir,d))]}"""
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1500)
    pg.wait_for_function("!!PONTS.gz",timeout=30000)
    cam=lambda: (ev("(()=>{APP.camera.position.set(-10,11,12);APP.orbit.target.set(0,4,-2);APP.orbit.update()})()"),pg.wait_for_timeout(1000))
    def pull(ax,d,mod=None):
        a,t=ev(HANDLE,[ax,d]); pg.mouse.move(a[0]-3,a[1]-3); pg.mouse.move(*a,steps=3); pg.wait_for_timeout(250); got=ev("PONTS.gz.gz.axis")
        if mod: pg.keyboard.down(mod)
        pg.mouse.down(); pg.mouse.move((a[0]+t[0])/2,(a[1]+t[1])/2,steps=6); pg.mouse.move(*t,steps=6); pg.wait_for_timeout(150); pg.mouse.up()
        if mod: pg.keyboard.up(mod)
        pg.wait_for_timeout(1000); pg.mouse.move(5,5); return got
    SU="Object.fromEntries(STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name.split(' · ')[1]||s.name,[s.a.x,s.a.y,s.b.x,s.b.y,s.zMm]]))"
    ID=lambda n: ev("STAGE.S.sups.find(s=>s.name.endsWith(' · %s')).id"%n)
    sel=lambda i:(ev("PONTS.select('%s')"%i),pg.wait_for_timeout(500),pg.click('.ptree [data-id="po|%s"]'%i,timeout=8000),pg.wait_for_timeout(900))
    cam(); fid=ID('face')
    # 1. travée : flèche perpendiculaire
    sel(fid); s0=ev(SU); g=pull('Z',1.5); s1=ev(SU); dy=s1['face'][1]-s0['face'][1]
    ok(g=='Z' and 900<=abs(dy)<=2100 and s1['face'][3]-s0['face'][3]==dy and s1['lointain']==s0['lointain'] and s1['jardin'][1]==s1['face'][1],'SOURIS · travée, flèche perpendiculaire : la face est poussée, jardin et cour suivent',[g,dy])
    # 2. travée : flèche verticale
    sel(fid); g=pull('Y',1.0); s2=ev(SU); dz=s2['face'][4]-s1['face'][4]
    ok(g=='Y' and 500<=dz<=1500 and len(set(v[4] for v in s2.values()))==1,'SOURIS · travée, flèche verticale : tout le niveau monte',[g,dz])
    # 3. Ctrl + flèche : prolonger
    sel(fid); n0=len(s2); g=pull('Z',3.5,'Control'); s3=ev(SU)
    ok(g=='Z' and len(s3)==n0+3 and 'face 2' in s3 and s3['face']==s2['face'],'SOURIS · Ctrl + flèche : la structure est prolongée (nouvelle travée, deux liaisons), la face ne bouge pas',[g,sorted(s3)])
    # 4. coin
    k=ev("(()=>{const n=PONTS.nodes().find(n=>n.at.x<0&&n.at.y===Math.max(...PONTS.nodes().map(m=>m.at.y)));return PONTS.nodeKey(n)})()"); ev("PONTS.pickNode('%s')"%k); pg.wait_for_timeout(900); s4a=ev(SU); g=pull('X',-1.0); s4=ev(SU)
    ok(g=='X' and s4!=s4a and ev("PONTS.nodes().length")>=6 and ev("!!PONTS.node"),'SOURIS · coin, flèche dans l\'axe d\'une travée : le coin se déplace, il reste choisi',[g,[k for k in s4 if s4[k]!=s4a[k]]])
    # 5. bout libre d'un pont seul
    ev("(()=>{PONTS.O.hang='none';PONTS.O.zMm=3000;const s=PONTS.addTruss({x:-3000,y:-9000},{x:3000,y:-9000},null,true);PONTS.sync();const t=STAGE.S.sups[STAGE.S.sups.length-1];PONTS.select(t.id);PONTS.pickPiece(t,5500);APP.camera.position.set(-4,8,16);APP.orbit.target.set(1,3,9);APP.orbit.update()})()"); pg.wait_for_timeout(1300)
    L0=ev("(()=>{const t=STAGE.S.sups[STAGE.S.sups.length-1];return [t.a.x,t.b.x]})()"); em=ev("PONTS.gz.endMode"); g=pull('X',2.0); L1=ev("(()=>{const t=STAGE.S.sups[STAGE.S.sups.length-1];return [t.a.x,t.b.x]})()")
    ok(em=='b' and g=='X' and L1[0]==L0[0] and 1000<=L1[1]-L0[1]<=3000,'SOURIS · bout de pont, flèche dans l\'axe : le pont s\'allonge par ce bout, l\'autre ne bouge pas',[em,g,L0,L1])
    # 6. moteur : flèche
    ev("(()=>{PONTS.O.hang='auto';const s=PONTS.addTruss({x:-3000,y:-13000},{x:3000,y:-13000},null,true);PONTS.sync();const t=STAGE.S.sups[STAGE.S.sups.length-1];PONTS.pickPt(t,0);APP.camera.position.set(-3,7,20);APP.orbit.target.set(0,3.5,13);APP.orbit.update()})()"); pg.wait_for_timeout(1300)
    a0=ev("STAGE.S.sups[STAGE.S.sups.length-1].points[0].alongMm"); pm=ev("PONTS.gz.ptMode"); g=pull('X',1.0); a1=ev("STAGE.S.sups[STAGE.S.sups.length-1].points.map(p=>p.alongMm)")
    ok(pm and g=='X' and any(500<=v-a0<=1500 for v in a1),'SOURIS · moteur, flèche : il coulisse le long du pont',[pm,g,a0,a1])
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
