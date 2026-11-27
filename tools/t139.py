# 4.59.0 — vidéoprojecteurs : huit projettent en même temps (avant : trois), chacun son image, chacun son ombre ; extinction et rallumage ; un neuvième aussi.
import sys,os; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_BLANK']='1'
from h import *
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:330],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && window.VIDEO",timeout=60000); pg.wait_for_timeout(1500)
    PL="(t,x,z)=>STAGE.place(t,{point:new APP.THREE.Vector3(x,0,z),object:{userData:{}}})"
    vt=ev("STAGE.LIBALL().find(t=>t.cat==='vid'&&t.kind!=='screen'&&t.kind!=='ledwall'&&t.lumens)?.id"); print('type',vt)
    COLS=['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff','#ffffff','#ff8000']
    # huit VP au plafond, visant le sol, alignés tous les 2,2 m ; un cube sous le 3e (son ombre) ; contenu = couleur unie
    r=ev("""([PL,vt,COLS])=>{const P=eval(PL);const ids=[];for(let i=0;i<8;i++){const x=-11.2+i*3.2;P(vt,x,0);const o=STAGE.S.objs.at(-1);o.pos=[x,5,0];o.hang='fixe';o.pan=0;o.tilt=0;o.on=true;o.content=i%2?'degrade':'blanc';ids.push(o.id)}P('prim-cube',-11.2+2*3.2+.35,0);const c=STAGE.S.objs.at(-1);c.size=[.5,.5,2.5];STAGE.S.haze=0;return {ids,keys:Object.keys(STAGE.S.objs[0]),contents:[...document.querySelectorAll('select[data-k=content] option')].map(o=>o.value)}}""",[PL,vt,COLS]); print(r['keys'])
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(400)
    ev("DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true);STAGE.setLive(true);STAGE.select([]);(()=>{APP.camera.position.set(0.01,24,0.03);APP.orbit.target.set(0,0,0);APP.orbit.update()})()"); pg.wait_for_timeout(9000)
    st=ev("STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='vid').map(o=>{const r=STAGE.RT.get(o.id);return [r.vpI,r.vpOK,r.light.visible,r.light.castShadow,!!r.light.map,o.content]})"); ok(len(st)==8 and all(s[0] is not None and s[1] and s[2] and not s[3] and not s[4] for s in st) and len(set(s[0] for s in st))==8,'huit vidéoprojecteurs allumés : chacun a sa couche et sa case, aucun ne prend d\'unité de texture du moteur',st)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def shot(name,wait=2500):
        pg.wait_for_timeout(wait); f=OUT+'/t139-'+name+'.png'; pg.screenshot(path=f); return Image.open(f).convert('RGB')
    def rgb(im,pt):
        x,y=ev(S2,pt); x=int(x); y=int(y); px=[im.getpixel((x+dx,y+dy)) for dx in (-2,0,2) for dy in (-2,0,2)]; return [round(sum(q[k] for q in px)/9) for k in range(3)]
    im=shot('a-huit'); G=ev("STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='vid').map(o=>{const g=STAGE.RT.get(o.id).geom;return g&&g.pl?[(g.pl[0].x+g.pl[2].x)/2,(g.pl[0].z+g.pl[2].z)/2,Math.abs(g.pl[1].x-g.pl[0].x),Math.abs(g.pl[2].z-g.pl[1].z)]:null})"); print('images',[[round(v,2) for v in g] for g in G])
    C=[rgb(im,[g[0]-g[2]*.3,0,g[1]-g[3]*.3]) for g in G]; L=[sum(c)//3 for c in C]; Rr=[sum(rgb(im,[g[0]+g[2]*.3,0,g[1]-g[3]*.3]))//3 for g in G]; SAT=[max(c)-min(c) for c in C]; print('gauche',L,'droite',Rr,'saturation',SAT)
    ok(all(max(L[i],Rr[i])>90 for i in range(8)),'les huit images sont projetées au sol',(L,Rr))
    ok(all(SAT[i]<25 for i in (0,2,4,6)) and all(SAT[i]>60 for i in (1,3,5,7)),'chaque projecteur montre SON contenu : blanc pour les pairs, dégradé de couleur pour les impairs',SAT)
    # ombre : sous le 3e, derrière le cube (vu du projecteur à 5 m, le cube de 0,6 m de haut cache le sol juste à côté de lui, vers l'extérieur)
    g=G[2]; sh=rgb(im,[g[0]+.95,0,0]); li=rgb(im,[g[0]-.95,0,0]); li=C[2]; ok(max(sh)<max(li)*.45 and max(li)>90,'le cube posé sous le 3e projecteur porte son ombre dans l\'image',(sh,li))
    # éteindre le 2e : son image disparaît, sa couche est rendue ; le rallumer
    ev("(()=>{const o=STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='vid')[1];o.on=false;STAGE.touch()})()"); im=shot('b-un-eteint'); g=G[1]; c=rgb(im,[g[0]-g[2]*.3,0,g[1]-g[3]*.3]); c2=rgb(im,[g[0]+g[2]*.3,0,g[1]-g[3]*.3]); c=[max(c[k],c2[k]) for k in range(3)]; n=ev("STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='vid').filter(o=>STAGE.RT.get(o.id).vpI!=null).length"); ok(max(c)<40 and n==7,'un projecteur éteint : son image disparaît, sa place est libérée',(c,n))
    ev("(()=>{const o=STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='vid')[1];o.on=true;STAGE.touch()})()"); im=shot('c-rallume',3500); c=rgb(im,[g[0]-g[2]*.3,0,g[1]-g[3]*.3]); c2=rgb(im,[g[0]+g[2]*.3,0,g[1]-g[3]*.3]); ok(max(max(c),max(c2))>90 and max(abs(c[k]-c2[k]) for k in range(3))>60,'rallumé : son image (le dégradé) revient',(c,c2))
    # déplacer un projecteur : l'image suit
    ev("(()=>{const o=STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='vid')[7];o.pos[2]=3;STAGE.touch()})()"); im=shot('d-deplace',3500); g2=ev("(()=>{const o=STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='vid')[7];const g=STAGE.RT.get(o.id).geom;return [(g.pl[0].x+g.pl[2].x)/2,(g.pl[0].z+g.pl[2].z)/2,Math.abs(g.pl[1].x-g.pl[0].x),Math.abs(g.pl[2].z-g.pl[1].z)]})()"); g=G[7]; a=[max(rgb(im,[g2[0]-g2[2]*.36,0,g2[1]]) ),max(rgb(im,[g2[0]+g2[2]*.36,0,g2[1]]))]; old=rgb(im,[g[0]+g[2]*.3,0,g[1]]); ok(max(a)>90 and max(old)<40 and abs(g2[1]-g[1])>2,'projecteur déplacé de 3 m : son image a suivi',(a,old,g2[1]-g[1]))
    mem=ev("(()=>{const i=APP.renderer.info.memory;return [i.textures,i.geometries]})()"); print('mémoire',mem)
    ok(not errs,'aucune erreur de script ni de shader',errs[:3]); print('ÉCHECS :',bad or 'aucun'); b.close()
