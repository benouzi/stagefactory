# vidéo : mapping sur un volume (une image par face, ou découpé à la silhouette), choix du volume à la souris
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:600],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.VIDEO",timeout=60000); pg.wait_for_timeout(1500)
    cid,sph,vid=ev("""(()=>{const T=APP.THREE,at=(x,y,z)=>({point:new T.Vector3(x,y,z),object:{userData:{}},face:null});
      const c=STAGE.place('prim-cube',at(0,0,-2),true,{}); const s=STAGE.place('prim-sphere',at(3,0,-2),true,{}); const v=STAGE.place('vp12',at(2.5,0,4),true,{}); v.pos=[2.5,2.2,4]; v.hang=null; v.content='blanc'; v.bright=.3;
      STAGE.unbuild(v.id);STAGE.build(v); STAGE.setLive(true); STAGE.touch(); STAGE.tick(0); return [c.id,s.id,v.id]})()""")
    pg.wait_for_timeout(600)
    bb=ev("(id)=>{const b=VIDEO.obb(id),r=v=>+v.toFixed(2);return {ctr:b.ctr.toArray().map(r),size:b.size.toArray().map(r),rad:r(b.rad)}}",cid)
    ok(bb['size']==[1,1,1],'la boîte englobante du cube est lue sur sa forme réelle (1 × 1 × 1 m)',bb)
    cx,cy,cz=bb['ctr']
    S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def lum(tag,pts):
        pg.wait_for_timeout(1800); f=OUT+'/t109-'+tag+'.png'; pg.screenshot(path=f); im=Image.open(f).convert('L'); out=[]
        for q in pts:
            x,y=ev(S3,q); out.append(round(sum(im.getpixel((int(x)+i,int(y)+j)) for i in (-2,0,2) for j in (-2,0,2))/9))
        return out
    ev("(()=>{STAGE.select([]);APP.camera.position.set(4.5,3.2,3);APP.orbit.target.set(%s,%s,%s);APP.orbit.update()})()"%(cx,cy,cz))
    # points : face avant, face cour, dessus du cube ; sol devant le cube, sol à cour du cube
    P=[[cx,cy,cz+.5],[cx+.5,cy,cz],[cx,cy+.5,cz],[cx+.2,0,cz+1.1],[cx+1.1,0,cz+.3]]
    ev("(a)=>{const o=STAGE.byId(a[0]);VIDEO.aim?0:0;const b=VIDEO.obb(a[1]);o.pan=Math.atan2(b.ctr.x-2.5,b.ctr.z-4)*180/Math.PI;o.tilt=74;o.throw=1.2;STAGE.touch()}",[vid,cid]); l0=lum('a',P)
    ok(min(l0)>40,'sans mapping, le projecteur éclaire le cube ET le sol autour',l0)
    ev("(a)=>VIDEO.mapSet(STAGE.byId(a[0]),STAGE.byId(a[1]),'masque')",[vid,cid]); l1=lum('b',P); inf=ev("(id)=>{const r=STAGE.RT.get(id);return {map:STAGE.byId(id).map,info:r.mapInfo,th:STAGE.byId(id).throw}}",vid)
    ok(min(l1[:3])>60 and max(l1[3:])<min(l1[:3])-40 and inf['map']['mode']=='masque' and inf['info']['inside'] and inf['info']['tri']>=12,'mapping « découpé à la silhouette » : les trois faces vues du projecteur restent éclairées, le sol autour ne l\'est plus',[l1,inf['info']['tri'],inf['th']])
    ev("(id)=>VIDEO.mapMode(STAGE.byId(id),'faces')",vid); ev("(id)=>{STAGE.byId(id).content='mire';STAGE.touch()}",vid); pg.wait_for_timeout(300); inf2=ev("(id)=>STAGE.RT.get(id).mapInfo",vid); l2=lum('c',P)
    ok(sorted(inf2['faces'])==['avant','cour','dessus'] and inf2['inside'] and max(l2[3:])<50,'mode « une image par face » : avant, cour et dessus (les trois faces vues du projecteur) reçoivent chacune la mire, rien sur le sol',[inf2['faces'],l2])
    # déplacer le cube : le mapping suit
    ev("(id)=>{const c=STAGE.byId(id);c.pos=[c.pos[0]-.8,c.pos[1],c.pos[2]];STAGE.select([]);STAGE.unbuild(id);STAGE.build(c);STAGE.touch()}",cid); ev("(id)=>{STAGE.byId(id).content='blanc';STAGE.touch()}",vid); P2=[[cx-.8,cy,cz+.5],[cx-.8,cy+.5,cz],[cx+.25,0,cz]]; l3=lum('d',P2)
    ok(min(l3[:2])>60 and l3[2]<min(l3[:2])-40,'le cube déplacé de 80 cm reste éclairé sur ses faces, le sol à son ancienne place ne l\'est pas',l3)
    # à la souris : bouton de la fiche puis clic sur la sphère
    ev("(id)=>{STAGE.select([id]);STAGE.UI.tab='prop';STAGE.render()}",vid); pg.wait_for_timeout(400); pg.click('#console [data-vp=mappick]'); pg.wait_for_timeout(300)
    tip=ev("document.querySelector('#vpTip').innerText").replace('\n',' '); sb=ev("(id)=>VIDEO.obb(id).ctr.toArray()",sph); xy=ev(S3,sb); pg.mouse.click(*xy); pg.wait_for_timeout(1200)
    m=ev("(id)=>({map:STAGE.byId(id).map,info:STAGE.RT.get(id).mapInfo,pick:VIDEO.picking})",vid)
    ok('clique' in tip and m['map'] and m['map']['id']==sph and m['map']['mode']=='masque' and not m['pick'] and m['info']['tri']>50,'« Choisir le volume… » puis clic sur la sphère dans la vue 3D : le mapping passe sur la sphère, en silhouette (ce n\'est pas une boîte)',[tip[:70],m['map'],m['info']['tri']])
    ev("(()=>{STAGE.select([])})()"); sc=sb; l4=lum('e',[[sc[0],sc[1],sc[2]+.45],[sc[0]+.2,0,sc[2]+1.2]]); ok(l4[0]>60 and l4[1]<l4[0]-40,'la sphère est éclairée, pas le sol devant elle',l4)
    ev("(id)=>{STAGE.select([id]);STAGE.render()}",vid); pg.wait_for_timeout(300); inf=ev("document.querySelector('#console')?.innerText||''").replace('\n',' '); ok('Mapping sur' in inf and ev("!!document.querySelector('#console [data-vpmm]')") ,'la fiche dit sur quoi le projecteur est mappé et propose les deux modes',inf[inf.find('Mapping sur'):][:60])
    pg.click('#console [data-vp=unmap]'); pg.wait_for_timeout(600); ok(ev("(id)=>!STAGE.byId(id).map",vid),'« Retirer » : plus de mapping')
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(800); ok(ev("(id)=>STAGE.byId(id).map?.id",vid)==sph,'Ctrl+Z le remet')
    js=ev("JSON.parse(STAGE.serialize()).objs.find(o=>o.map)"); ok(js and js['map']['id']==sph,'le mapping est enregistré dans le fichier')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
