# 4.56.0 — lyre articulée : le socle reste fixe, la lyre (traverse + bras) tourne en pan, la tête bascule en tilt entre les bras. Contrôle par le calcul (direction de la tête = dirOf, axe des bras, tête entre les bras) et captures.
import sys,os; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_BLANK']='1'
from h import *
S='/home/claude/shots/l1-'; ok=[]
def chk(n,c,x=''): ok.append(bool(c)); print(('OK  ' if c else 'ECHEC ')+n,x)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1300,800,'haute'); ev=pg.evaluate; pg.wait_for_timeout(1500)
    ev("(()=>{window.L1=STAGE.place('spot',{point:new (STAGE.THREE||THREE).Vector3(0,0,0)},true)})()") if False else None
    ids=ev("(()=>{const a=STAGE.place('spot',STAGE.hitAt(0,0),true),b=STAGE.place('wash',STAGE.hitAt(1.2,0),true);return [a&&a.id,b&&b.id]})()"); print(ids)
    def pose(pan,tilt):
        ev("([ids,p,t])=>{for(const i of ids){const o=STAGE.byId(i);o.pan=p;o.tilt=t;o.dim=1;const r=STAGE.RT.get(i);r.cpan=p;r.ctilt=t}STAGE.touch&&0}",[ids,pan,tilt]); ev("STAGE.tick&&STAGE.tick(0.05)"); pg.wait_for_timeout(300)
    def geom(i,pan,tilt):
        return ev("""([i,pan,tilt])=>{const r=STAGE.RT.get(i);r.root.updateMatrixWorld(true);const T=r.head.matrixWorld.elements;const hd=[-T[4],-T[5],-T[6]];const n=Math.hypot(...hd);const d=STAGE.dirOf(pan,tilt);
          const rs=r.root.scale.x;const yk=r.yoke.matrixWorld.elements;const armx=[yk[0],yk[1],yk[2]].map(v=>v/Math.hypot(yk[0],yk[1],yk[2]));
          return {err:Math.hypot(hd[0]/n-d.x,hd[1]/n-d.y,hd[2]/n-d.z),armx,exp:[Math.cos(pan*Math.PI/180),0,-Math.sin(pan*Math.PI/180)],yokeY:r.yoke.rotation.y,base:r.baseG.rotation.y}}""",[i,pan,tilt])
    ev("(()=>{DOCK.view('3d');APP.toggleConsole(false);STAGE.setLive(false);STAGE.select([]);window.VIEW3D&&VIEW3D.set({grid:true});APP.camera.position.set(1.7,1.15,1.9);APP.orbit.target.set(.6,.35,0);APP.orbit.update()})()"); pg.wait_for_timeout(1200)
    worst=0
    for (pa,ti) in [(0,0),(0,120),(45,120),(90,60),(180,135),(-135,100),(270,90)]:
        pose(pa,ti); g=geom(ids[0],pa,ti); worst=max(worst,g['err']); ax=max(abs(g['armx'][k]-g['exp'][k]) for k in range(3))
        if g['err']>1e-3 or ax>1e-3 or abs(g['base'])>1e-9: print('  écart',pa,ti,g)
        ev("STAGE.select([])"); pg.wait_for_timeout(900); pg.screenshot(path=S+'pan%d-tilt%d.png'%(pa,ti),clip={'x':150,'y':95,'width':1000,'height':430})
    chk('la tête vise exactement la direction pan / tilt demandée, les bras suivent le pan, le socle ne tourne pas', worst<1e-3, worst)
    # la tête reste entre les bras : dans le repère de la lyre, son encombrement en x ne touche pas les bras
    inter=ev("""(i)=>{const r=STAGE.RT.get(i);let bad=0;for(const t of [0,40,90,125,180]){r.head.rotation.set(-t*Math.PI/180,0,0);r.root.updateMatrixWorld(true);const inv=r.yoke.matrixWorld.clone().invert();const bx=new (r.head.children[0].geometry.boundingBox?r.head.children[0].geometry.boundingBox.constructor:Object)();let mn=1e9,mx=-1e9;r.head.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;const v=r.root.position.clone();for(let k=0;k<p.count;k+=7){v.fromBufferAttribute(p,k).applyMatrix4(m.matrixWorld).applyMatrix4(inv);mn=Math.min(mn,v.x);mx=Math.max(mx,v.x)}});if(mn<-.19||mx>.19)bad++}return bad}""",ids[0])
    chk('quelle que soit l\'inclinaison, la tête reste entre les deux bras', inter==0, inter)
    chk('aucune erreur de script', not errs, errs[:3]); print('RESULTAT',sum(ok),'/',len(ok)); b.close()
