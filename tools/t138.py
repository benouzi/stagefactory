# 4.58.0 — roue de couleurs, CTO, prisme (surfaces et fumée), densité de la fumée juste avec l'iris, DMX, encodeurs du pupitre.
# (le centre du disque n'est jamais lu : vu de dessus, l'appareil lui-même le cache)
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
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && window.DMX",timeout=60000); pg.wait_for_timeout(1500)
    PL="(t,x,z)=>STAGE.place(t,{point:new APP.THREE.Vector3(x,0,z),object:{userData:{}}})"
    ev("([PL])=>{const P=eval(PL);P('spot',0,0);const o=STAGE.S.objs.at(-1);o.pos=[0,6,0];o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;o.zoom=20;o.color='#ffffff';STAGE.S.haze=0}",[PL])
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(400)
    ev("DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true);STAGE.setLive(true);STAGE.select([]);(()=>{APP.camera.position.set(0.01,11,0.02);APP.orbit.target.set(0,0,0);APP.orbit.update()})()"); pg.wait_for_timeout(5000)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def shot(name,wait=2200):
        pg.wait_for_timeout(wait); f=OUT+'/t138-'+name+'.png'; pg.screenshot(path=f); return Image.open(f).convert('RGB')
    def rgb(im,pt):
        x,y=ev(S2,pt); x=int(x); y=int(y); px=[im.getpixel((x+dx,y+dy)) for dx in (-2,0,2) for dy in (-2,0,2)]; return [round(sum(q[k] for q in px)/9) for k in range(3)]
    lum=lambda im,pt: round(sum(rgb(im,pt))/3)
    KEYS=['iris','gobo','gobor','gobos','focus','b1','b1r','b2','b2r','b3','b3r','b4','b4r','cw','cto','prism','prismr','prisms']
    def setv(**kw): ev("([kw,K])=>{const o=STAGE.S.objs.find(o=>STAGE.typeOf(o).cat==='lum');for(const k of K)delete o[k];Object.assign(o,kw);STAGE.touch()}",[kw,KEYS])
    Q=[.5,0,.5]
    im=shot('a-blanc'); A=rgb(im,Q); ok(min(A)>120 and max(A)-min(A)<25,'ouvert : tache blanche',A)
    setv(cw=1); im=shot('b-rouge'); B=rgb(im,Q); ok(B[0]>120 and B[1]<70 and B[2]<70,'roue de couleurs sur Rouge : la tache est rouge',B)
    setv(cw=6); im=shot('c-bleu'); C=rgb(im,Q); ok(C[2]>C[0]+60 and C[2]>C[1]+40,'roue de couleurs sur Bleu',C)
    setv(cto=1); im=shot('d-cto'); D=rgb(im,Q); ok(D[0]>D[1]+15 and D[1]>D[2]+25 and sum(D)<sum(A)-40,'CTO plein : la lumière se réchauffe et perd du niveau',(A,D))
    setv(cto=.5); im=shot('e-cto50'); E=rgb(im,Q); ok(D[2]<E[2]<A[2],'CTO à 50 % : entre les deux',(A,E,D))
    setv(prism=3); im=shot('f-prisme3'); R0=6*0.17633; c=[[.95*R0,0,0],[-.475*R0,0,.823*R0],[-.475*R0,0,-.823*R0]]; F=[lum(im,q) for q in c]+[lum(im,[-1.6,0,0]),lum(im,[1.5,0,0])]
    ok(min(F[:3])>45 and max(F[:3])-min(F[:3])<25 and F[3]<20 and max(F[:3])<sum(A)/3-15,'prisme 3 facettes : trois images à 120°, de même niveau, plus faibles que le faisceau entier',(F,round(sum(A)/3)))
    setv(prism=3,prismr=60); im=shot('g-prisme-tourne'); G=[lum(im,[-.95*R0,0,0]),lum(im,[1.5,0,0])]; ok(G[0]>45 and G[1]<20 and F[4]>45,'prisme tourné de 60° : les images ont tourné',(G,F[4]))
    setv(prism=5,gobo=2); im=shot('h-prisme5-etoile'); ok(ev("STAGE.RT.get(STAGE.S.objs[0].id).bm.uniforms.fxP.value.x")==5,'prisme 5 facettes avec un gobo : cinq copies du gobo')
    setv(prism=3,prisms=.25); a=ev("STAGE.RT.get(STAGE.S.objs[0].id).bm.uniforms.fxP.value.y"); pg.wait_for_timeout(1500); b2=ev("STAGE.RT.get(STAGE.S.objs[0].id).bm.uniforms.fxP.value.y"); ok(b2>a+.1,'rotation continue du prisme',(a,b2))
    # fumée : même densité dans le faisceau avec et sans iris
    setv(); ev("STAGE.S.haze=.9;(()=>{APP.camera.position.set(0,3,12);APP.orbit.target.set(0,3,0);APP.orbit.update()})()"); im=shot('i-fumee',4000); h1=lum(im,[0,2,0]); setv(iris=.5); im=shot('j-fumee-iris',3000); h2=lum(im,[0,2,0]); h3=lum(im,[.45,2,0])
    ok(h1>30 and h2>h1*.38 and h2<h1*1.25 and h3<h2,'fumée : l\'iris resserre le faisceau sans le rendre plus dense (vu de côté il est plus mince, donc un peu moins lumineux, jamais plus)',(h1,h2,h3))
    setv(prism=3); im=shot('k-fumee-prisme',3000); pz=[lum(im,[.95*R0*4/6,2,0]),lum(im,[2.2,2,0])]; ok(pz[0]>pz[1]+8,'fumée : avec le prisme on voit les faisceaux séparés',pz)
    # DMX
    r=ev("""(()=>{const o=STAGE.S.objs[0],t=STAGE.typeOf(o);o.uni=1;o.addr=1;o.mode=1;const lay=DMX.layout(t,1);const buf=new Uint8Array(512);const set=(n,v)=>{buf[lay.indexOf(n)]=v};set('dim',255);set('cw',Math.floor(256*6/10)+2);set('cto',128);set('prism',100);set('prismr',32);DMX.U.set(1,buf);const out=DMX.read(o,t,new APP.THREE.Color());const r={has:['cw','cto','prism','prismr'].map(n=>lay.indexOf(n)>=0),cw:out.cw,cto:+out.cto.toFixed(2),prism:out.prism,prismr:Math.round(out.prismr)};DMX.U.delete(1);o.addr=0;return r})()""")
    ok(all(r['has']) and r['cw']==6 and r['cto']==0.5 and r['prism']==3 and r['prismr']==91,'DMX (lyre spot, mode étendu) : roue, CTO, prisme et son orientation décodés',r)
    am=ev("""(()=>{const t={id:'x-rgba',cat:'lum',kind:'par',zoom:[20,20],chs:[['dim','r','g','b','a']]},o={uni:2,addr:1,mode:0};const buf=new Uint8Array(512);buf[0]=255;buf[4]=255;DMX.U.set(2,buf);const c=new APP.THREE.Color();const out=DMX.read(o,t,c);DMX.U.delete(2);return [out.dim,'#'+c.getHexString()]})()""")
    ok(am[0]>.9 and am[1][1:3]=='ff' and am[1][5:7]=='00' and am[1][3:5] not in ('00','ff'),'DMX : un canal Ambre seul donne une lumière ambrée',am)
    # pupitre
    ev("STAGE.S.haze=0;STAGE.select([STAGE.S.objs[0].id]);DESK.toggle(true)"); pg.wait_for_timeout(1500)
    d=ev("(()=>{const e=document.querySelector('#desk .dk-beam');if(!e)return null;e.open=true;return [...e.querySelectorAll('[data-dp]')].map(x=>x.dataset.dp)})()"); ok(d and set(['cw','cto','gobo','iris','focus','prism','b1','b4r']).issubset(set(d)),'pupitre : volet « Faisceau » avec roue, CTO, gobo, iris, netteté, prisme, couteaux',d)
    pg.wait_for_timeout(300); pg.select_option('#desk select[data-dp=prism]','5'); pg.wait_for_timeout(600); ok(ev("STAGE.S.objs[0].prism")==5 and ev("!!document.querySelector('#desk .dk-beam')?.open"),'pupitre : choisir « 5 facettes » l\'applique, le volet reste ouvert',ev("STAGE.S.objs[0].prism"))
    pg.screenshot(path=OUT+'/t138-l-pupitre.png')
    ok(not errs,'aucune erreur de script',errs[:3]); print('ÉCHECS :',bad or 'aucun'); b.close()
