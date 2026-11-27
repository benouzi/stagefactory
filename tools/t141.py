# 4.62.0 — sources larges : barre de LED et blinder éclairent comme une ligne de lampes (tache allongée, fumée en nappe) ; fresnel : bord très doux et volets.
import sys,os,math; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_BLANK']='1'
from h import *
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW",timeout=60000); pg.wait_for_timeout(1500)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def shot(name,wait=2500):
        pg.wait_for_timeout(wait); f=OUT+'/t141-'+name+'.png'; pg.screenshot(path=f); return Image.open(f).convert('RGB')
    def lum(im,pt):
        x,y=ev(S2,pt); x=int(x); y=int(y); q=[im.getpixel((x+dx,y+dy)) for dx in (-2,0,2) for dy in (-2,0,2)]; return round(sum(sum(c) for c in q)/27)
    def scene(typ,y=4,zoom=None,haze=0):
        ev("([t,y,z,h])=>{STAGE.loadShow({name:'t',objs:[],cues:[],lib:STAGE.S.lib,follow:false});STAGE.place(t,{point:new APP.THREE.Vector3(0,0,0),object:{userData:{}}});const o=STAGE.S.objs.at(-1);o.pos=[0,y,0];o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;if(z)o.zoom=z;o.color='#ffffff';STAGE.S.haze=h;const j=STAGE.serialize();STAGE.loadShow(JSON.parse(j));STAGE.setLive(true);STAGE.select([])}",[typ,y,zoom,haze])
    top="DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true);(()=>{APP.camera.position.set(0.01,11,0.02);APP.orbit.target.set(0,0,0);APP.orbit.update()})()"
    info="(()=>{const o=STAGE.S.objs.at(-1),r=STAGE.RT.get(o.id),u=r.bm.uniforms;return {rt:u.fxRt.value.toArray(),lh:r.lh,fx:r.fxI,ly:r.light.position.y,ang:r.light.angle,lnH:u.lnH.value,R:u.scl.value.x,kind:STAGE.typeOf(o).kind}})()"
    # barre de LED 1 m, 25°, à 4 m
    scene('barre'); ev(top); im=shot('a-barre',6000); g=ev(info); rt=g['rt']; D=g['ly']; t=math.tan(math.radians(12.5))
    ok(abs(g['lh']-.48)<.02 and g['fx'] is not None and abs(abs(rt[0])+abs(rt[2])-1)<.05,'barre : source en ligne de 0,96 m, le long de l\'appareil',g)
    al=lambda d:[rt[0]*d,0,rt[2]*d]; ac=lambda d:[-rt[2]*d,0,rt[0]*d]
    A=dict(c=lum(im,ac(.25)),al1=lum(im,al(1.0)),ac1=lum(im,ac(1.0)),al2=lum(im,al(1.7)),ac06=lum(im,ac(.55)),al06=lum(im,al(.55)))
    ok(A['c']>70 and A['al1']>A['ac1']+25 and A['ac1']<22 and A['al2']<30,'tache allongée : éclairé à 1 m dans la longueur de la barre, noir à 1 m en travers',A)
    ok(abs(g['ang']-math.atan(t+g['lh']/D)*1.05)<.01,'cône d\'appui élargi de la demi-longueur',[g['ang'],D])
    # même flux qu'une source ponctuelle de même angle : au centre, un peu moins (le flux est étalé sur la longueur)
    scene('barre',haze=.6); ev("DOCK.view('3d');APP.toggleConsole(false);(()=>{APP.camera.position.set(0,2.6,6.5);APP.orbit.target.set(0,2.4,0);APP.orbit.update()})()"); im=shot('b-barre-fumee-face',6000); g=ev(info); rt=g['rt']
    ev("(()=>{APP.camera.position.set(6.5,2.6,0);APP.orbit.target.set(0,2.4,0);APP.orbit.update()})()"); im2=shot('c-barre-fumee-profil',5000)
    ok(abs(g['lnH']-g['lh']/g['R'])<1e-3 and g['lnH']>.15,'fumée : nappe (section en stade) de la longueur de la barre',[g['lnH'],g['R']])
    Y=3.45; face=[lum(im,[x,Y,0]) for x in (-.4,0,.4,.85)]; prof=[lum(im2,[0,Y,z]) for z in (-.4,0,.4,.85)]
    ok(prof[1]>prof[0]+40 and prof[1]>prof[2]+40,'juste sous la barre, vue de profil : la nappe est mince (la vue de face se juge sur la capture)',[face,prof])
    # blinder : deux lampes
    scene('blinder'); ev(top); im=shot('d-blinder',6000); g=ev(info); ok(g['kind']=='blinder' and abs(g['lh']-.115)<.01 and g['fx'] is not None,'blinder : deux lampes côte à côte (source de 23 cm)',g)
    ok(lum(im,[.5,0,.5])>60,'blinder : il éclaire',lum(im,[.5,0,.5]))
    ev("(()=>{APP.camera.position.set(.9,3.3,1.3);APP.orbit.target.set(0,3.9,0);APP.orbit.update()})()"); shot('e-blinder-modele',3500)
    # fresnel : bord doux, volets
    scene('fresnel',y=5,zoom=40); ev(top); im=shot('f-fresnel',6000); R=5*math.tan(math.radians(20)); F=[lum(im,[R*f,0,.3]) for f in (.3,.6,.85,1.1)]
    ok(F[0]>F[1]>F[2]>F[3] and F[3]<12 and F[2]<F[0]*.6,'fresnel : la lumière décroît doucement du centre au bord',F)
    ev("(()=>{const o=STAGE.S.objs.at(-1);o.b2=.5;STAGE.touch()})()"); im=shot('g-fresnel-volet'); rtf=ev(info)['rt']; side=lambda d:[rtf[0]*d,0,rtf[2]*d+.0]; V=[lum(im,side(d)) for d in (-.9,-.45,.12,.45,.9)]
    cutp=V[0]<V[4]; lit,dark,edge=(V[4],V[0],None) if cutp else (V[0],V[4],None)
    ok(lit>50 and dark<30,'volet au centre : un côté coupé',V)
    op=ev("(()=>{STAGE.select([STAGE.S.objs.at(-1).id]);APP.toggleConsole(true);return 1})()"); pg.wait_for_timeout(900); n=ev("document.querySelectorAll('#console input[data-k=b1],#console input[data-k=b2r]').length"); ok(n>=2,'inspecteur du fresnel : réglages des volets présents',n)
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
print('\nt141 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
