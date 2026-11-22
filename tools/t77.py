# Le faisceau s'arrête sur l'obstacle au lieu de le traverser.
import os, sys
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:300],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,860); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PONTS",timeout=60000); pg.wait_for_timeout(1500)
    ev("""()=>{const S=STAGE.S;STAGE.place('spot',STAGE.hitAt(4,0),true);const o=S.objs[0];o.pos[1]=.6;o.dim=1;o.pan=90;o.tilt=85;S.haze=.6;STAGE.setLive(true);STAGE.render();document.querySelector('#view3d')?.click();}""")
    pg.wait_for_timeout(900); L0=ev("STAGE.RT.get(STAGE.S.objs[0].id).beam.scale.y"); d=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs[0].id),v=new APP.THREE.Vector3();STAGE.dirOf(STAGE.S.objs[0].pan,STAGE.S.objs[0].tilt,v);return [v.x,v.y,v.z].map(x=>Math.round(x*100)/100)})()")
    ok(L0>8,'sans obstacle : faisceau long',[L0,d])
    # un volume posé dans l'axe, à 2,5 m de l'appareil
    ev("([dx,dy,dz])=>{STAGE.place('ampli-b',STAGE.hitAt(4+dx*2.5,dz*2.5),true);STAGE.render()}",d); pg.wait_for_timeout(1200)
    st=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs[0].id);return {cast:r.light.castShadow,map:!!r.light.shadow.map,on:r.bm.uniforms.shOn.value,L:r.beam.scale.y,dist:r.light.distance}})()"); ok(st['cast'] and st['map'] and st['on']==1 and st['L']>8 and st['dist']==0,'projecteur à ombre réelle : carte d\'ombre active, cône entier (l\'ombre le découpe)',st)
    ev("(()=>{APP.camera.position.set(4.5,3.2,5.5);APP.orbit.target.set(6.5,.4,0);APP.orbit.update()})()"); pg.wait_for_timeout(1000); pg.screenshot(path=OUT+'/t77.png',clip={'x':60,'y':45,'width':1090,'height':560})
    # au-delà de la limite de cartes d'ombre : les projecteurs les moins puissants gardent la coupure dans l'axe
    ev("()=>{for(let i=0;i<7;i++){STAGE.place('poursuite',STAGE.hitAt(-6+i,6),true);const o=STAGE.S.objs[STAGE.S.objs.length-1];o.pos[1]=4;o.dim=1}STAGE.render()}"); pg.wait_for_timeout(6000)
    c=ev("STAGE.S.objs.map(o=>{const r=STAGE.RT.get(o.id);return r.light&&STAGE.typeOf(o).cat==='lum'?(r.light.castShadow?1:0):null}).filter(x=>x!==null)"); ok(sum(c)==6 and c[0]==0,'8 projecteurs allumés : 6 portent une ombre, le moins puissant repasse à la coupure dans l\'axe',c)
    L1=ev("STAGE.RT.get(STAGE.S.objs[0].id).beam.scale.y"); ok(1.5<L1<3.2,'celui-là s\'arrête sur l\'obstacle',L1)
    ok(not errs,'aucune erreur de page',errs[:3]); b.close()
print('ECHECS',bad) if bad else print('TOUT PASSE')
