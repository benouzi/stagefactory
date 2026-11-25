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
    ok(min(l1[:3])>60 and max(l1[3:])<min(l1[:3])-40 and inf['map']['mode']=='masque' and inf['map']['ids']==[cid] and inf['info']['inside'] and inf['info']['tri']>=12,'mapping « découpé à la silhouette » : les trois faces vues du projecteur restent éclairées, le sol autour ne l\'est plus',[l1,inf['info']['tri'],inf['th']])
    ev("(id)=>VIDEO.mapMode(STAGE.byId(id),'faces')",vid); ev("(id)=>{STAGE.byId(id).content='mire';STAGE.touch()}",vid); pg.wait_for_timeout(300); inf2=ev("(id)=>STAGE.RT.get(id).mapInfo",vid); l2=lum('c',P)
    pl=ev("(id)=>(VIDEO.planes(id)||[]).length",cid); ok(pl==6 and inf2['faces']==3 and inf2['box']==0 and inf2['inside'] and max(l2[3:])<50,'mode « une image par face » : les 6 faces du cube sont lues sur sa géométrie, les 3 tournées vers le projecteur reçoivent chacune la mire, rien sur le sol',[pl,inf2,l2])
    # déplacer le cube : le mapping suit
    ev("(id)=>{const c=STAGE.byId(id);c.pos=[c.pos[0]-.8,c.pos[1],c.pos[2]];STAGE.select([]);STAGE.unbuild(id);STAGE.build(c);STAGE.touch()}",cid); ev("(id)=>{STAGE.byId(id).content='blanc';STAGE.touch()}",vid); P2=[[cx-.8,cy,cz+.5],[cx-.8,cy+.5,cz],[cx+.25,0,cz]]; l3=lum('d',P2)
    ok(min(l3[:2])>60 and l3[2]<min(l3[:2])-40,'le cube déplacé de 80 cm reste éclairé sur ses faces, le sol à son ancienne place ne l\'est pas',l3)
    # à la souris : bouton de la fiche puis clic sur la sphère
    ev("(id)=>{VIDEO.unmap(STAGE.byId(id));STAGE.select([id]);STAGE.UI.tab='prop';STAGE.render()}",vid); pg.wait_for_timeout(400); pg.click('#console [data-vp=mappick]'); pg.wait_for_timeout(300)
    tip=ev("document.querySelector('#vpTip').innerText").replace('\n',' '); sb=ev("(id)=>VIDEO.obb(id).ctr.toArray()",sph); xy=ev(S3,sb); pg.mouse.click(*xy); pg.wait_for_timeout(1200)
    m=ev("(id)=>({map:STAGE.byId(id).map,info:STAGE.RT.get(id).mapInfo,pick:VIDEO.picking})",vid)
    ok('clique' in tip and m['map'] and m['map']['ids']==[sph] and m['map']['mode']=='masque' and not m['pick'] and m['info']['tri']>50,'« Choisir le volume… » puis clic sur la sphère dans la vue 3D : le mapping passe sur la sphère, en silhouette (ce n\'est pas une boîte)',[tip[:70],m['map'],m['info']['tri']])
    ev("(()=>{STAGE.select([])})()"); sc=sb; l4=lum('e',[[sc[0],sc[1],sc[2]+.45],[sc[0]+.2,0,sc[2]+1.2]]); ok(l4[0]>60 and l4[1]<l4[0]-40,'la sphère est éclairée, pas le sol devant elle',l4)
    ev("(id)=>{STAGE.select([id]);STAGE.render()}",vid); pg.wait_for_timeout(300); inf=ev("document.querySelector('#console')?.innerText||''").replace('\n',' '); ok('Mapping sur' in inf and ev("!!document.querySelector('#console [data-vpmm]')") ,'la fiche dit sur quoi le projecteur est mappé et propose les deux modes',inf[inf.find('Mapping sur'):][:60])
    pg.click('#console [data-vp=unmap]'); pg.wait_for_timeout(600); ok(ev("(id)=>!STAGE.byId(id).map",vid),'« Retirer » : plus de mapping')
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(800); ok(ev("(id)=>STAGE.byId(id).map?.ids",vid)==[sph],'Ctrl+Z le remet')
    js=ev("JSON.parse(STAGE.serialize()).objs.find(o=>o.map)"); ok(js and js['map']['ids']==[sph],'le mapping est enregistré dans le fichier')
    # sphère en mode faces : forme courbe, repli annoncé
    ev("(id)=>VIDEO.mapMode(STAGE.byId(id),'faces')",vid); i5=ev("(id)=>{STAGE.tick(0);return STAGE.RT.get(id).mapInfo}",vid); ok(i5['box']==1 and i5['faces']>=1 and ev("(id)=>VIDEO.planes(id)",sph) is None,'sphère en « une image par face » : forme courbe reconnue, repli sur sa boîte englobante, et c\'est dit',i5)
    # plusieurs volumes : ajouter le cube à la souris
    ev("(()=>{STAGE.render()})()"); pg.wait_for_timeout(300); pg.click('#console [data-vp=mapadd]'); pg.wait_for_timeout(300); cb=ev("(id)=>VIDEO.obb(id).ctr.toArray()",cid); pg.mouse.click(*ev(S3,cb)); pg.wait_for_timeout(1200)
    m2=ev("(id)=>({ids:STAGE.byId(id).map.ids,mode:STAGE.byId(id).map.mode,info:STAGE.RT.get(id).mapInfo})",vid); ok(m2['ids']==[sph,cid] and m2['info']['vols']==2,'« Ajouter… » puis clic sur le cube : le projecteur éclaire les deux volumes et se recadre sur l\'ensemble',m2)
    ev("(id)=>{VIDEO.mapMode(STAGE.byId(id),'masque');STAGE.byId(id).content='blanc';STAGE.touch();STAGE.select([])}",vid); c2=ev("(id)=>VIDEO.obb(id).ctr.toArray()",cid); l6=lum('f',[[c2[0],c2[1],c2[2]+.5],[sb[0],sb[1],sb[2]+.45],[(c2[0]+sb[0])/2,0,c2[2]+.2]]); ok(min(l6[:2])>60 and l6[2]<min(l6[:2])-40,'cube et sphère éclairés ensemble, le sol entre les deux reste noir',l6)
    ev("(id)=>STAGE.select([id])",vid); pg.wait_for_timeout(300); ev("STAGE.render()"); pg.wait_for_timeout(300); n=ev("document.querySelectorAll('#console [data-vpmx]').length"); pg.click('#console [data-vpmx="%s"]'%sph); pg.wait_for_timeout(700); ok(n==2 and ev("(id)=>STAGE.byId(id).map.ids",vid)==[cid],'la fiche liste les deux volumes ; la croix retire la sphère seule',n)
    # le mapping suit un volume qu'on déplace, sans autre action (comme pendant un glisser)
    k0=ev("(a)=>{const r=STAGE.RT.get(a[1]);const g0=STAGE.RT.get(a[0]).geom,c=STAGE.byId(a[1]);c.pos=[c.pos[0]+.6,c.pos[1],c.pos[2]];r.dirty=true;for(let i=0;i<2;i++)APP.hooks.update.forEach(f=>{try{f(0)}catch(e){}});return STAGE.RT.get(a[0]).geom!==g0}",[vid,cid]); ok(k0 is True,'le volume bouge comme pendant un glisser au gizmo (sa position change, rien d\'autre) : le projecteur est recalculé à l\'image suivante',k0)
    ev("(a)=>{const c=STAGE.byId(a[1]);c.pos=[c.pos[0]-.6,c.pos[1],c.pos[2]];STAGE.touch();STAGE.tick(0)}",[vid,cid])
    # pyramide : vraies faces, image découpée au triangle
    pyr=ev("(()=>{const T=APP.THREE,p=STAGE.place('prim-pyr',{point:new T.Vector3(1.2,0,0),object:{userData:{}},face:null},true,{});STAGE.touch();STAGE.tick(0);return p.id})()"); ev("(a)=>VIDEO.mapSet(STAGE.byId(a[0]),a[1],'faces')",[vid,pyr]); i7=ev("(a)=>{STAGE.tick(0);return {n:(VIDEO.planes(a[1])||[]).length,info:STAGE.RT.get(a[0]).mapInfo}}",[vid,pyr])
    ok(i7['n']==5 and i7['info']['box']==0 and 2<=i7['info']['faces']<=3 and i7['info']['tri']>=2,'pyramide : ses 5 vraies faces (4 pans et la base) sont trouvées, les pans tournés vers le projecteur reçoivent l\'image découpée au triangle — pas sa boîte englobante',i7)
    # forme dessinée (outil de dessin) : un prisme en L extrudé
    ev("(()=>{(STAGE.S.shapes||(STAGE.S.shapes=[])).push({id:'dtest1',k:'poly',closed:true,p:[[-3,0],[-1.5,0],[-1.5,.7],[-2.3,.7],[-2.3,1.5],[-3,1.5]],h:1.2,y:0,name:'Décor en L'});DRAW.sync();STAGE.touch();STAGE.tick(0)})()"); pg.wait_for_timeout(500)
    ev("(id)=>VIDEO.mapSet(STAGE.byId(id),'d:dtest1')",vid); i8=ev("(id)=>{STAGE.tick(0);return {map:STAGE.byId(id).map,n:(VIDEO.planes('d:dtest1')||[]).length,info:STAGE.RT.get(id).mapInfo}}",vid)
    ok(i8['map']['ids']==['d:dtest1'] and i8['map']['mode']=='faces' and i8['n']==8 and 3<=i8['info']['faces']<=5 and i8['info']['box']==0,'forme dessinée en L, extrudée : elle se mappe comme un objet, ses 8 faces (6 côtés, dessus, dessous) sont lues',i8)
    ev("(id)=>{STAGE.byId(id).content='blanc';STAGE.touch();STAGE.select([]);APP.camera.position.set(3,4,6);APP.orbit.target.set(-2,.6,.7);APP.orbit.update()}",vid); l9=lum('g',[[-2.6,1.2,1.1],[-1.9,1.2,.35],[-1.9,0,1.2],[-.9,0,.4]]); ok(min(l9[:2])>60 and max(l9[2:])<min(l9[:2])-40,'le dessus du L est éclairé sur ses deux branches ; le sol dans le creux du L et à côté reste noir',l9)
    ev("(()=>{STAGE.S.shapes=STAGE.S.shapes.filter(s=>s.id!=='dtest1');DRAW.sync();STAGE.touch();STAGE.tick(0)})()"); ev("(id)=>{STAGE.select([id]);STAGE.render()}",vid); pg.wait_for_timeout(300); inf=ev("document.querySelector('#console')?.innerText||''").replace('\n',' '); ok('n\'existe plus' in inf,'forme supprimée : la fiche le dit au lieu d\'éclairer n\'importe quoi',inf[inf.find('Mapping'):][:70])
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
