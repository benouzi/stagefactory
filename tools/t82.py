# Matières de base : chaque matière a ses réglages physiques, son motif à taille réelle, et les brillantes reflètent la salle.
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
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ids=ev("STAGE.MATS.map(m=>m[0])"); ok(len(ids)==16,'seize matières de base',ids)
    PL="(t,x,z)=>STAGE.place(t,{point:new APP.THREE.Vector3(x,0,z),object:{userData:{}}})"
    ev("(()=>{const PL=%s;const M=STAGE.MATS.map(m=>m[0]);M.forEach((m,i)=>{PL(i%%2?'prim-cube':'prim-sphere',-5.25+(i%%8)*1.5,i<8?1:3)});STAGE.S.objs.forEach((o,i)=>{o.mat=M[i];o.pcol=STAGE.matCol(M[i])});PL('prim-plan',0,2);const f=STAGE.S.objs.at(-1);f.size=[14,6,0];f.mat='bois';f.pcol='#ffffff';f.pos[1]=-.01})()"%PL)
    # trois projecteurs
    lt=ev("STAGE.LIBALL().find(t=>t.cat==='lum'&&/par|wash|fresnel/i.test(t.name+t.id))?.id||STAGE.LIBALL().find(t=>t.cat==='lum').id")
    ev("([lt,PL])=>{const P=eval(PL);for(const x of [-4,0,4]){P(lt,x,7);const o=STAGE.S.objs.at(-1);o.pos=[x,5,7];o.dim=1;o.hang='fixe';let best=[0,0],bd=-2;const tg=new APP.THREE.Vector3(x,0.5,2).sub(new APP.THREE.Vector3(x,5,7)).normalize();for(let pa=-180;pa<=180;pa+=5)for(let ti=-120;ti<=120;ti+=5){const d=STAGE.dirOf(pa,ti).dot(tg);if(d>bd){bd=d;best=[pa,ti]}}o.pan=best[0];o.tilt=best[1];if('zoom' in o)o.zoom=45}}",[lt,PL])
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(900)
    r=ev("(()=>{const o={};for(const ob of STAGE.S.objs){if(!ob.mat)continue;let m;STAGE.RT.get(ob.id).head.traverse(x=>{if(x.isMesh)m=x.material});o[ob.mat]={r:m.roughness,m:m.metalness,map:!!m.map,env:!!m.envMap,tr:m.transparent,cc:m.clearcoat||0,sh:m.sheen||0}}return o})()")
    ok(r['miroir']['r']==0 and r['miroir']['m']==1 and r['miroir']['env'],'miroir : métal, rugosité 0, reflet de la salle',r['miroir'])
    ok(r['velours']['r']==1 and r['velours']['sh']==1 and not r['velours']['env'],'velours : mat, duvet, aucun reflet',r['velours'])
    ok(r['bois']['map'] and r['metal']['map'] and r['metal']['m']==1 and r['laque']['cc']==1 and r['verre']['tr'],'bois et métal brossé à motif, laque vernie, verre transparent')
    ok(ev("(()=>{const ob=STAGE.S.objs.find(o=>o.mat==='bois'&&o.size[0]===14);let g;STAGE.RT.get(ob.id).head.traverse(x=>{if(x.isMesh)g=x.geometry});const u=g.attributes.uv.array;let mx=-1e9,mn=1e9;for(let i=0;i<u.length;i+=2){mx=Math.max(mx,u[i]);mn=Math.min(mn,u[i])}return Math.round((mx-mn)*100)/100})()")==round(14/.96,2),'plancher de 14 m : le motif se répète à taille réelle (0,96 m)')
    # inspecteur : changer la matière remet la couleur de la matière
    ev("STAGE.select([STAGE.S.objs[0].id])"); pg.wait_for_timeout(300); pg.select_option('[data-k=mat]','alu'); pg.wait_for_timeout(400)
    ok(ev("STAGE.S.objs[0].mat")=='alu' and ev("STAGE.S.objs[0].pcol")=='#d9dbe0' and ev("document.querySelector('[data-k=pcol]').value")=='#d9dbe0','inspecteur : matière changée, couleur de la matière reprise'); pg.keyboard.press('Control+z'); pg.wait_for_timeout(400)
    # dessin extrudé avec matière
    ev("(()=>{DRAW.O.h=1.2;const s=DRAW.add({k:'poly',p:[[-6,5],[-3,5],[-3,6],[-6,6]],closed:true,rect:true});DRAW.O.h=0;DRAW.select(s.id)})()"); pg.wait_for_timeout(300); pg.select_option('#drawBar [data-ds=mat]','metal'); pg.wait_for_timeout(300)
    ok(ev("(()=>{let m;APP.scene.getObjectByName('dessin').traverse(x=>{if(x.isMesh)m=x.material});return m.metalness===1&&!!m.map&&!!m.envMap})()") and ev("STAGE.S.shapes[0].mat")=='metal','dessin extrudé : matière métal brossé appliquée')
    js=ev("STAGE.serialize()"); ok('"mat":"metal"' in js and '"mat":"velours"' in js,'matières enregistrées dans le projet')
    ev("DRAW.select(null);STAGE.select([]);document.querySelector('#view3d')?.click();(()=>{APP.camera.position.set(0,4.2,9.5);APP.orbit.target.set(0,.5,2);APP.orbit.update()})()"); pg.wait_for_timeout(4500); pg.screenshot(path=OUT+'/t82.png')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
