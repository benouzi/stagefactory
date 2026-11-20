# Capture 3D : plan DXF calé, murs élevés depuis ses calques, plan dessiné au sol.
import sys,json,base64; sys.path.insert(0,'/home/claude/tools')
from h import *
SAMP='/home/claude/src/sceno/ScenoFactory-0.45.0-sources/app/test/'
b64=lambda p: base64.b64encode(open(p,'rb').read()).decode()
with sync_playwright() as p:
    b,pg,errs=open_app(p,1300,800,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.PLAN && window.RIG && window.AI && window.VENUE",timeout=120000)
    pg.add_style_tag(content='#modal{display:none!important}'); ev("APP.renderer.setAnimationLoop(null)")
    r=ev("""(async(arg)=>{const mk=(n,b)=>new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],n);
      const f=await VENUE.readFile(mk('salle.dxf',arg));VENUE.K.files=[f];const c=f.cad,W=c.w*c.mm/1000,H=c.h*c.mm/1000;
      await VENUE.tool('caler_plan_cao',{fichier:'salle.dxf',nezDeScene:{x:W/2,y:H*.565},directionLointainDeg:90,calquesMurs:['MURS'],hauteurMursM:8});
      await VENUE.tool('regler_salle',{plateauLargeurM:12,plateauProfondeurM:8,hauteurSceneM:1,hauteurSalleM:8,gradinDebutM:3,gradinRangs:10,gradinProfondeurRangM:.9,gradinHauteurRangM:.16});
      await VENUE.tool('poser_perches',{nombre:8,yPremiereM:.8,pasM:.9,longueurM:11,hauteurM:6.5});
      AI.run('add_objects',{items:[{type:'wash',perche:3,x:-3,color:'#2affd0',dim:1},{type:'wash',perche:3,x:3,color:'#ff9a1f',dim:1},{type:'perso',x:0,z:-3}]});
      for(let k=0;k<20;k++){for(const f of APP.hooks.update)f(1/30)}
      APP.persp.position.set(13,22,26);APP.orbit.target.set(0,1,2);APP.orbit.update();APP.renderer.render(APP.scene,APP.persp);
      return [APP.venue.shell,APP.venue.w,APP.venue.d,APP.venue.stageD,APP.venue.pipes.length]})""",b64(SAMP+'samples/salle.dxf'))
    print(r,errs[:3]); pg.screenshot(path='/home/claude/shots/t53_3d_dxf.png')
    ev("document.querySelector('#venueUI').scrollIntoView()"); b.close()
