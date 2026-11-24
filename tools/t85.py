# Ombres de tous les projecteurs : au-delà des vraies ombres du moteur, l'atlas arrête aussi bien le faisceau dans la fumée que la lumière sur les surfaces. Nouvelles matières à relief.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:380],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW",timeout=60000); pg.wait_for_timeout(1500)
    PL="(t,x,z)=>STAGE.place(t,{point:new APP.THREE.Vector3(x,0,z),object:{userData:{}}})"
    lt=ev("STAGE.LIBALL().find(t=>t.cat==='lum'&&/d.coupe|profile|spot/i.test(t.name))?.id||STAGE.LIBALL().find(t=>t.cat==='lum').id")
    # 15 projecteurs plein feu au loin (ils prennent toutes les vraies ombres du moteur) + 1 projecteur plus faible à l'origine, avec un mur de 3 m décalé de son axe
    ev("([lt,PL])=>{const P=eval(PL);const down=(()=>{let best=[0,0],bd=-2;const tg=new APP.THREE.Vector3(0,-1,0);for(let pa=-180;pa<=180;pa+=10)for(let ti=-180;ti<=180;ti+=5){const d=STAGE.dirOf(pa,ti).dot(tg);if(d>bd){bd=d;best=[pa,ti]}}return best})();const lamp=(x,z,dim)=>{P(lt,x,z);const o=STAGE.S.objs.at(-1);o.pos=[x,6,z];o.hang='fixe';o.dim=dim;o.pan=down[0];o.tilt=down[1];o.zoom=50;o.color='#ffffff'};for(let i=0;i<15;i++)lamp(30+i*1.5,-20,1);lamp(0,0,.7);P('prim-cube',.45,0);const c=STAGE.S.objs.at(-1);c.size=[.6,3,3];STAGE.S.haze=0}",[lt,PL])
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(500); ev("STAGE.setLive(true);STAGE.select([]);document.querySelector('#view3d')?.click();(()=>{APP.camera.position.set(6,7,6);APP.orbit.target.set(.5,0,.5);APP.orbit.update()})()"); pg.wait_for_timeout(7000)
    r=ev("(()=>{const L=[...STAGE.RT.values()].filter(r=>r.t.cat==='lum'&&r.light);const me=L.find(r=>Math.abs(r.o.pos[0])<.1);return {n:L.length,vraies:L.filter(r=>r.light.castShadow).length,atlas:L.filter(r=>!r.light.castShadow&&r.occOK&&r.occI!=null).length,moi:[me.light.castShadow,me.occI,Math.round((me.light.decay-2)*1e5)],max:APP.renderer.capabilities.maxTextures}})()")
    ok(r['n']==16 and r['vraies']+r['atlas']==16 and r['moi'][0] is False and r['moi'][2]==r['moi'][1]+1,'16 projecteurs : le plus faible n\'a pas de vraie ombre, il a sa case dans l\'atlas',r)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    pg.screenshot(path=OUT+'/t85.png'); im=Image.open(OUT+'/t85.png').convert('RGB')
    lum=lambda w:(lambda q:sum(sum(im.getpixel((int(q[0])+dx,int(q[1])+dy))) for dx in (-2,0,2) for dy in (-2,0,2))/27)(ev(S2,w))
    a=lum([1.1,0,0]); bq=lum([-.5,0,1.2]); ok(a<bq*.35 and bq>40,'sol derrière le mur : dans l\'ombre ; sol à côté : éclairé (lumière sur les surfaces, sans vraie ombre du moteur)',[round(a),round(bq)])
    # le faisceau dans la fumée lit le même atlas
    ev("STAGE.S.haze=.8"); pg.wait_for_timeout(2500); u=ev("(()=>{const me=[...STAGE.RT.values()].find(r=>r.t.cat==='lum'&&Math.abs(r.o.pos[0])<.1),u=me.bm.uniforms;return [u.shOn.value,u.shR.value.toArray().map(v=>Math.round(v*1000)/1000),me.beam.visible]})()"); ok(u[0]==1 and u[1][2]-u[1][0]<.13 and u[2],'faisceau : il lit sa case de l\'atlas',u); pg.screenshot(path=OUT+'/t85b.png')
    # déplacer le mur : l'ombre suit
    ev("(()=>{const c=STAGE.S.objs.find(o=>o.type==='prim-cube');c.pos[0]=-.45;STAGE.loadShow(JSON.parse(STAGE.serialize()));STAGE.S.haze=0;STAGE.setLive(true)})()"); pg.wait_for_timeout(6000); pg.screenshot(path=OUT+'/t85c.png'); im=Image.open(OUT+'/t85c.png').convert('RGB'); a2=lum([1.1,0,0]); ok(a2>a*2.5 and a2>40,'mur déplacé de l\'autre côté : le sol redevient éclairé',[round(a),round(a2)])
    # matières
    ids=ev("STAGE.MATS.map(m=>m[0])"); ok(len(ids)==22 and all(k in ids for k in ['bois','chene','plancher-n','bois-brut','osb','brique','carrelage']),'22 matières dont planchers, parquet, brique, carrelage',len(ids))
    m=ev("(()=>{const out={};for(const k of ['bois','chene','plancher-n','brique','carrelage','beton']){const m=STAGE.matFor(k);out[k]=[!!m.map,!!m.normalMap,m.map.image.width]}return out})()"); ok(all(v==[True,True,1024] for v in m.values()),'motif 1024 px et carte de relief pour chaque matière à motif',m)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
