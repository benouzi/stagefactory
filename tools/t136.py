# (le centre du disque n'est jamais lu : vu de dessus, l'appareil lui-même le cache)
# 4.57.0 — iris, couteaux, gobo : découpent le faisceau sur les surfaces ET dans la fumée, avec ou sans vraie ombre ; lyre : les couteaux suivent le pan ; réglages dans l'inspecteur.
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
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW",timeout=60000); pg.wait_for_timeout(1500)
    PL="(t,x,z)=>STAGE.place(t,{point:new APP.THREE.Vector3(x,0,z),object:{userData:{}}})"
    ev("([PL])=>{const P=eval(PL);const lamp=(t,x,z,dim)=>{P(t,x,z);const o=STAGE.S.objs.at(-1);o.pos=[x,6,z];o.hang='fixe';o.dim=dim;o.pan=0;o.tilt=0;o.zoom=30;o.color='#ffffff';return o};lamp('decoupe',0,0,1);STAGE.S.haze=0}",[PL])
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(400)
    ev("DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true);STAGE.setLive(true);STAGE.select([]);(()=>{APP.camera.position.set(0.01,11,0.02);APP.orbit.target.set(0,0,0);APP.orbit.update()})()"); pg.wait_for_timeout(5000)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def shot(name,wait=2200):
        pg.wait_for_timeout(wait); f=OUT+'/t136-'+name+'.png'; pg.screenshot(path=f); return Image.open(f).convert('RGB')
    def lum(im,pt):
        x,y=ev(S2,pt); x=int(x); y=int(y); px=[im.getpixel((x+dx,y+dy)) for dx in (-2,0,2) for dy in (-2,0,2)]; return round(sum(sum(q) for q in px)/27)
    def setv(**kw): ev("(kw)=>{const o=STAGE.S.objs.find(o=>STAGE.typeOf(o).cat==='lum');for(const k of ['iris','gobo','gobor','gobos','focus','b1','b1r','b2','b2r','b3','b3r','b4','b4r'])delete o[k];Object.assign(o,kw);STAGE.touch()}",kw)
    P={'c':[.4,0,.4],'xp':[1,0,0],'xm':[-1,0,0],'zp':[0,0,1],'zm':[0,0,-1],'out':[2.2,0,0]}
    im=shot('a-ouvert'); A={k:lum(im,v) for k,v in P.items()}; ok(min(A['c'],A['xp'],A['xm'],A['zp'],A['zm'])>90 and A['out']<25,'ouvert : disque éclairé de 1,6 m de rayon, noir dehors',A)
    setv(b2=.5); im=shot('b-couteau-droit'); B={k:lum(im,v) for k,v in P.items()}; ok(B['xp']<25 and B['xm']>90 and B['zp']>60 and B['zm']>60,'couteau droit au centre : la moitié cour est noire, le reste éclairé',B)
    ok(abs(B['xm']-A['xm'])<12,'le côté resté ouvert garde le même niveau (le couteau coupe du flux, pas de la densité)',(A['xm'],B['xm']))
    setv(b1=.25); im=shot('c-couteau-haut'); C=[lum(im,[0,0,1.25]),lum(im,[0,0,.4]),lum(im,[0,0,-1.2])]; ok(C[0]<25 and C[1]>90 and C[2]>90,'couteau haut au quart : seule la bande du haut (vers le public) est coupée',C)
    setv(b2=.5,b2r=45); im=shot('d-couteau-angle'); D=[lum(im,[.6,0,-.9]),lum(im,[-.6,0,.9]),lum(im,[.9,0,.6]),lum(im,[-.9,0,-.6])]; ok((D[0]>90)!=(D[1]>90) and (D[2]<25 or D[3]<25),'couteau droit tourné de 45° : le bord de coupe est en diagonale',D)
    setv(iris=.5); im=shot('e-iris'); E=[lum(im,[.4,0,.4]),lum(im,[.5,0,0]),lum(im,[1.2,0,0])]; ok(E[2]<25 and E[1]>90 and abs(E[0]-A['c'])<12,'iris à 50 % : le disque fait la moitié du rayon, même niveau au centre',E)
    setv(gobo=3); im=shot('f-gobo-barres'); F=[lum(im,[x,0,.7]) for x in (0,.19,.385,.58,.77)]; ok(F[0]>90 and F[2]>90 and F[4]>60 and F[1]<30 and F[3]<50,'gobo « barres » : bandes éclairées et noires aux bons endroits',F)
    setv(gobo=3,gobor=90); im=shot('g-gobo-tourne'); G=[lum(im,[.7,0,0]),lum(im,[.7,0,.19]),lum(im,[.7,0,.385])]; ok(G[0]>90 and G[1]<30 and G[2]>90,'gobo tourné de 90° : les barres ont tourné',G)
    setv(gobo=3,focus=1); im=shot('h-gobo-flou'); H=[lum(im,[x,0,.7]) for x in (0,.19)]; ok(abs(H[0]-H[1])<abs(F[0]-F[1])*.6 and H[1]>30,'netteté au flou : le contraste des barres s\'adoucit',(F[:2],H))
    setv(gobo=3,gobos=.25); a=ev("STAGE.RT.get(STAGE.S.objs[0].id).bm.uniforms.fxG.value.y"); pg.wait_for_timeout(1500); b2=ev("STAGE.RT.get(STAGE.S.objs[0].id).bm.uniforms.fxG.value.y"); ok(b2>a+.1,'rotation continue : le gobo tourne dans le temps',(a,b2))
    # fumée : vue de face, couteau droit au centre
    setv(b2=.5); ev("STAGE.S.haze=.9;(()=>{APP.camera.position.set(0,3,12);APP.orbit.target.set(0,3,0);APP.orbit.update()})()"); im=shot('i-fumee',4000); Hz=[lum(im,[.45,3,0]),lum(im,[-.45,3,0]),lum(im,[2.5,3,0])]; ok(Hz[1]>Hz[0]+25 and Hz[0]<Hz[2]+14,'fumée : le faisceau est coupé du même côté que sur le sol',Hz)
    u=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs[0].id);return [r.fxI,Math.round((r.light.decay-2)*1e5),r.light.castShadow,r.occI]})()"); ok(u[0] is not None and u[1]//100==u[0]+1,'le masque voyage avec le projecteur (ligne de la table)',u)
    # sans vraie ombre : 15 projecteurs forts au loin prennent les ombres du moteur
    ev("([PL])=>{const P=eval(PL);for(let i=0;i<15;i++){P('decoupe',30+i*1.5,-20);const o=STAGE.S.objs.at(-1);o.pos=[30+i*1.5,6,-20];o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;o.zoom=30}const me=STAGE.S.objs[0];me.dim=.7;STAGE.S.haze=0}",[PL])
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(400); ev("STAGE.setLive(true);STAGE.select([]);(()=>{APP.camera.position.set(0.01,11,0.02);APP.orbit.target.set(0,0,0);APP.orbit.update()})()")
    im=shot('j-atlas',8000); u=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs[0].id);const t=Math.round((r.light.decay-2)*1e5);return [r.light.castShadow,r.occI,r.fxI,t]})()"); J=[lum(im,[1,0,0]),lum(im,[-1,0,0])]
    ok(u[0] is False and u[1] is not None and u[3]==(u[2]+1)*100+u[1]+1 and J[0]<25 and J[1]>60,'projecteur sans vraie ombre : case d\'ombre et masque voyagent ensemble, le couteau coupe toujours',(u,J))
    # lyre : les couteaux tournent avec le pan
    ev("([PL])=>{STAGE.loadShow(JSON.parse('{}'));}",[PL]) if False else None
    ev("(()=>{for(const o of [...STAGE.S.objs])STAGE.unbuild&&0})()")
    ev("([PL])=>{const S=STAGE.S;S.objs.length=0;STAGE.loadShow(JSON.parse(STAGE.serialize()));const P=eval(PL);P('spot',0,0);const o=STAGE.S.objs.at(-1);o.pos=[0,6,0];o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;o.zoom=30;o.color='#ffffff';o.b2=.5;STAGE.S.haze=0}",[PL])
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(400); ev("STAGE.setLive(true);STAGE.select([]);(()=>{APP.camera.position.set(0.01,11,0.02);APP.orbit.target.set(0,0,0);APP.orbit.update()})()")
    im=shot('k-lyre-pan0',6000); K0=[lum(im,[1,0,0]),lum(im,[-1,0,0]),lum(im,[0,0,1]),lum(im,[0,0,-1])]
    ev("(()=>{const o=STAGE.S.objs[0];o.pan=90;STAGE.touch()})()"); im=shot('l-lyre-pan90',5000); K9=[lum(im,[1,0,0]),lum(im,[-1,0,0]),lum(im,[0,0,1]),lum(im,[0,0,-1])]
    ok(K0[0]<25 and K0[1]>90 and K9[3]<25 and K9[2]>90 and K9[0]>50 and K9[1]>50,'lyre : à pan 0 le couteau droit coupe côté cour, à pan 90° la coupe a tourné d\'un quart de tour',(K0,K9))
    # inspecteur : les réglages existent et pilotent
    ev("APP.toggleConsole(true);STAGE.select([STAGE.S.objs[0].id]);STAGE.UI.tab='prop';STAGE.render()"); pg.wait_for_timeout(700)
    ui=ev("(()=>{const c=document.querySelector('#console');return {gobo:!!c.querySelector('select[data-k=gobo]'),iris:!!c.querySelector('[data-k=iris]'),b:c.querySelectorAll('[data-k^=b]').length,n:c.querySelector('select[data-k=gobo]')?.options.length}})()"); ok(ui['gobo'] and ui['iris'] and ui['n']==12,'inspecteur d\'une lyre spot : iris, gobo (11 motifs + aucun), netteté, quatre couteaux',ui)
    pg.select_option('#console select[data-k=gobo]','2'); pg.wait_for_timeout(700); ok(ev("STAGE.S.objs[0].gobo")==2 and ev("!!document.querySelector('#console [data-k=gobor]')"),'choisir un gobo dans la liste : il est appliqué, et orientation / rotation apparaissent')
    ev("APP.toggleConsole(false);STAGE.select([])"); shot('m-etoile',3000)
    wash=ev("(()=>{const t=STAGE.LIBALL().find(t=>t.id==='wash');return STAGE.fxCaps(t)})()"); ok(not wash['gobo'] and not wash['blades'],'une lyre wash n\'a ni gobo ni couteaux',wash)
    ok(not errs,'aucune erreur de script',errs[:3]); print('ÉCHECS :',bad or 'aucun'); b.close()
