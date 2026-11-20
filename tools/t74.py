# Faisceaux volumétriques : rendu sans erreur de shader, captures sous plusieurs angles (scène proche de la capture de Benjamin).
import os, sys
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,860); ev=pg.evaluate
    logs=[]; pg.on('console',lambda m: logs.append(m.text[:300]) if ('THREE' in m.text or 'ERROR' in m.text or 'shader' in m.text.lower()) else None)
    pg.wait_for_function("window.STAGE && window.DOCK && window.PONTS",timeout=60000); pg.wait_for_timeout(1500)
    ev("""()=>{const S=STAGE.S,add=(t,x,z,c,pan,tilt,zoom)=>{STAGE.place(t,STAGE.hitAt(x,z),true);const o=S.objs[S.objs.length-1];o.pos[1]=6;o.dim=1;o.color=c;if(pan!=null)o.pan=pan;if(tilt!=null)o.tilt=tilt;if(zoom)o.zoom=zoom;return o};
      add('decoupe',1,0,'#ffffff');add('wash',1.6,5,'#7a3cff',0,35,20);add('par-zoom',0,7,'#ffd9a0',0,-20,30);add('beam',-4,2,'#40ffb0',90,40);
      S.haze=.6;STAGE.setLive(true);STAGE.render();document.querySelector('#view3d')?.click();}""")
    print('objs',ev("STAGE.S.objs.map(o=>[o.type,o.pan,o.tilt,o.zoom,STAGE.RT.get(o.id)?.beam?.visible])"))
    cam=lambda px,py,pz,tx,ty,tz,n:(ev(f"(()=>{{APP.camera.position.set({px},{py},{pz});APP.orbit.target.set({tx},{ty},{tz});APP.orbit.update()}})()"),pg.wait_for_timeout(1300),pg.screenshot(path=OUT+f'/t74-{n}.png',clip={'x':60,'y':45,'width':1090,'height':560}))
    cam(10,5,14,0,3,3,'a'); cam(0.5,22,4,0.5,0,3.5,'top'); cam(14,3,3,0,3,3,'side'); cam(1,1.2,0.3,1,6,0,'in'); cam(1,4,-9,1,3,6,'face')
    print('erreurs',errs[:3]); print('journal',logs[:5]); b.close()
