# Audit lumière : aucun faisceau ne traverse un objet, même au-delà du nombre de vraies ombres et même hors de l'axe. Nouvelles matières à relief.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:380],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW",timeout=60000); pg.wait_for_timeout(1500)
    PL="(t,x,z)=>STAGE.place(t,{point:new APP.THREE.Vector3(x,0,z),object:{userData:{}}})"
    lt=ev("STAGE.LIBALL().find(t=>t.cat==='lum'&&/d.coupe|profile|spot/i.test(t.name))?.id||STAGE.LIBALL().find(t=>t.cat==='lum').id")
    # 14 projecteurs en ligne à 6 m, plein feu vers le bas ; un mur de 1,2 m de haut décalé de l'axe sous chacun (l'axe passe à côté : l'ancienne coupure dans l'axe ne voyait rien)
    ev("([lt,PL])=>{const P=eval(PL);for(let i=0;i<14;i++){const x=-9.75+i*1.5;P(lt,x,0);const o=STAGE.S.objs.at(-1);o.pos=[x,6,0];o.hang='fixe';o.dim=1;let best=[0,0],bd=-2;const tg=new APP.THREE.Vector3(0,-1,0);for(let pa=-180;pa<=180;pa+=10)for(let ti=-180;ti<=180;ti+=5){const d=STAGE.dirOf(pa,ti).dot(tg);if(d>bd){bd=d;best=[pa,ti]}}o.pan=best[0];o.tilt=best[1];o.zoom=40;P('prim-cube',x+.45,0);const c=STAGE.S.objs.at(-1);c.size=[.6,3,1.2]}STAGE.S.haze=.8}",[lt,PL])
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(500); ev("STAGE.setLive(true);document.querySelector('#view3d')?.click();(()=>{APP.camera.position.set(0,5,16);APP.orbit.target.set(0,2,0);APP.orbit.update()})()"); pg.wait_for_timeout(6000)
    r=ev("(()=>{const L=[...STAGE.RT.values()].filter(r=>r.t.cat==='lum'&&r.light);return {n:L.length,vraies:L.filter(r=>r.light.castShadow).length,cartes:L.filter(r=>!r.light.castShadow&&r.occOK&&r.occRT).length,on:L.filter(r=>r.bm.uniforms.shOn.value>0.5).length,max:APP.renderer.capabilities.maxTextures}})()")
    ok(r['n']==14 and r['on']==14 and r['vraies']+r['cartes']==14 and r['vraies']>=4,'14 projecteurs : chacun a une carte d\'obstacles pour son faisceau (vraies ombres + cartes maison)',r)
    # lecture d'une carte maison : sous le mur (x+0,45) la profondeur est celle du dessus du mur, à côté celle du sol
    d=ev("(()=>{const T=APP.THREE,L=[...STAGE.RT.values()].filter(r=>r.t.cat==='lum'&&r.light&&!r.light.castShadow&&r.occRT);if(!L.length)return null;const r=L[0],px=new Uint8Array(256*256*4);APP.renderer.readRenderTargetPixels(r.occRT,0,0,256,256,px);const dep=(w)=>{const q=new T.Vector4(w[0],w[1],w[2],1).applyMatrix4(r.occM);const u=q.x/q.w,v=q.y/q.w,i=((v*256|0)*256+(u*256|0))*4;const z=px[i]/255+px[i+1]/255/256+px[i+2]/255/65536+px[i+3]/255/16777216;return [Math.round(q.z/q.w*1000)/1000,Math.round(z*1000)/1000]};const x=r.o.pos[0];return {mur:dep([x+.45,0.6,0]),libre:dep([x-.6,0.6,0])}})()")
    ok(d and d['mur'][0]>d['mur'][1]+.002 and d['libre'][0]<=d['libre'][1]+.002,'carte maison : un point derrière le mur est masqué, un point à côté est éclairé',d)
    pg.screenshot(path=OUT+'/t85.png',clip={'x':60,'y':80,'width':1380,'height':520})
    # matières
    ids=ev("STAGE.MATS.map(m=>m[0])"); ok(len(ids)==22 and all(k in ids for k in ['bois','chene','plancher-n','bois-brut','osb','brique','carrelage']),'22 matières dont planchers, parquet, brique, carrelage',len(ids))
    m=ev("(()=>{const out={};for(const k of ['bois','chene','plancher-n','brique','carrelage','beton']){const m=STAGE.matFor(k);out[k]=[!!m.map,!!m.normalMap,m.map.image.width]}return out})()"); ok(all(v==[True,True,1024] for v in m.values()),'motif 1024 px et carte de relief pour chaque matière à motif',m)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
