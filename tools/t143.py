# 4.62.0 — faute de la 4.60 : caméra près d'un projecteur (dans le cylindre d'appui du faisceau mais hors du cône) → un coin du faisceau était deux fois moins lumineux, avec un bord net.
import sys,os; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_BLANK']='1'
from h import *
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:300],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN",timeout=60000); pg.wait_for_timeout(1500)
    ev("()=>{STAGE.place('par-led',{point:new APP.THREE.Vector3(0,0,-3),object:{userData:{}}});const o=STAGE.S.objs.at(-1);o.pos=[0,6,-3];o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;o.color='#ffffff';STAGE.S.haze=.7;const j=STAGE.serialize();STAGE.loadShow(JSON.parse(j));STAGE.setLive(true);STAGE.select([]);DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true)}")
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def lum(im,pt):
        x,y=ev(S2,pt); x=int(x); y=int(y); q=[im.getpixel((x+dx,y+dy)) for dx in (-2,0,2) for dy in (-2,0,2)]; return round(sum(sum(c) for c in q)/27)
    def view(cx,name):
        ev("([cx])=>{APP.camera.position.set(cx,5,-3);APP.orbit.target.set(0,4.2,-3);APP.orbit.update()}",[cx]); pg.wait_for_timeout(5000); f=OUT+'/t143-'+name+'.png'; pg.screenshot(path=f); return Image.open(f).convert('RGB')
    R=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs.at(-1).id);return r.bm.uniforms.scl.value.x})()")
    far=view(R+3,'loin'); F=[lum(far,[0,y,-3]) for y in (5.0,4.4,3.8)]
    near=view(min(1.2,R*.5),'pres'); N=[lum(near,[0,y,-3]) for y in (5.0,4.4,3.8)]
    print(R,F,N)
    ok(all(n>=f*.75 for n,f in zip(N[1:],F[1:])) and min(F)>20,'faisceau vu de près (caméra à côté du projecteur) : aussi lumineux que vu de loin, sans coin sombre',[F,N])
    ok(not errs,'aucune erreur de console',errs[:2]); b.close()
print('\nt143 :', 'TOUT BON' if not bad else ' | '.join(bad))
