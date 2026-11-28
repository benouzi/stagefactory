# 4.62.0 — ombres : pénombre selon la taille de la source (bord net sous une découpe, large sous une barre de LED), 144 ombres au lieu de 64.
import sys,os,math; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_BLANK']='1'; os.environ['SF_INIT']='window.SF_SOFT=1'
from h import *
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,900,os.environ.get('SF_Q','basse')); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW",timeout=60000); pg.wait_for_timeout(1500)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def lum(im,pt):
        x,y=ev(S2,pt); x=int(x); y=int(y); q=[im.getpixel((x+dx,y+dy)) for dx in (-2,-1,0,1,2) for dy in (-2,-1,0,1,2)]; return sum(sum(c) for c in q)/75
    def scene(typ,n,ax='x'):
        L,Pp,C,T=([1,6,0],[-1,2,0],[6,11,0],[-.6,0,0]) if ax=='x' else ([0,6,1],[0,2,-.5],[0,11,6],[0,0,-.6])
        ev("""([t,n,L,Pp,C,T])=>{STAGE.loadShow({name:'t',objs:[],cues:[],lib:STAGE.S.lib,follow:false});const P=(t,x,y,z)=>{STAGE.place(t,{point:new APP.THREE.Vector3(x,0,z),object:{userData:{}}});const o=STAGE.S.objs.at(-1);o.pos=[x,y,z];return o};
          const l=P(t,...L);l.hang='fixe';l.dim=.7;l.pan=0;l.tilt=0;l.color='#ffffff';if(t==='decoupe')l.zoom=50;
          const q=P('prat',...Pp);
          for(let i=0;i<n;i++){const o=P('decoupe',30+i*1.5,6,-20);o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;o.zoom=30}
          STAGE.S.haze=0;const j=STAGE.serialize();STAGE.loadShow(JSON.parse(j));STAGE.setLive(true);STAGE.select([]);DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true);APP.camera.position.set(...C);APP.orbit.target.set(...T);APP.orbit.update()}""",[typ,n,L,Pp,C,T])
    def edge(name,ax='x'):
        pg.wait_for_timeout(9000); f=OUT+'/t142-'+name+'.png'; pg.screenshot(path=f); im=Image.open(f).convert('RGB')
        xs=[i*.035 for i in range(41)]; pts=[[-1.3+x,0,0] if ax=='x' else [0,0,-1.3+x] for x in xs]
        v=[lum(im,q) for q in pts]; lo=sum(v[:4])/4; hi=sum(v[-4:])/4
        a=next((x for x,q in zip(xs,v) if q>lo+.15*(hi-lo)),None); z=next((x for x,q in zip(xs,v) if q>lo+.85*(hi-lo)),None); return [round(lo),round(hi),round(z-a,2) if a is not None and z is not None else None]
    st="(()=>{const r=STAGE.RT.get(STAGE.S.objs[0].id),p=STAGE.RT.get(STAGE.S.objs[1].id);return {cast:r.light.castShadow,occ:r.occI,src:r.srcR,py:p.root.position.y}})()"
    scene('decoupe',15); d=edge('a-decoupe'); sd=ev(st); print('découpe',d,sd,len(errs))
    ok(sd['cast'] is False and sd['occ'] is not None and abs(sd['py']-2)<.5,'découpe servie par l\'atlas d\'ombres, praticable suspendu à 2 m',sd)
    ok(d[1]>d[0]+40 and d[2] is not None and d[2]<=.25,'découpe (lentille de 8 cm) : bord d\'ombre net',d)
    scene('barre',15); bx=edge('b-barre-travers'); sb=ev(st); print('barre',bx,sb,len(errs))
    ok(sb['occ'] is not None and sb['src']>.4 and bx[1]>bx[0]+25 and bx[2] is not None and bx[2]>=d[2]+.15,'barre de LED (ligne de 1 m), bord d\'ombre perpendiculaire à la barre : pénombre large',[d,bx])
    scene('barre',15,'z'); bz=edge('c-barre-long','z'); print('barre z',bz,len(errs))
    ok(bz[1]>bz[0]+8 and bz[2] is not None and bz[2]<=bx[2]-.12,'barre, bord d\'ombre parallèle à la barre : pénombre étroite',[bz,bx])
    # plus de 64 ombres
    scene('decoupe',80)
    for i in range(30):
        pg.wait_for_timeout(8000); n=ev("(()=>{let a=0,c=0;for(const o of STAGE.S.objs){const r=STAGE.RT.get(o.id);if(!r||!r.light)continue;if(r.occI!=null&&r.occOK)a++;if(r.light.castShadow)c++}return [a,c]})()")
        if n[0]>=66: break
    pg.screenshot(path=OUT+'/t142-c-81.png')
    ok(n[0]>=66,'81 projecteurs allumés : plus de 64 ont leur ombre dans l\'atlas',n)
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
print('\nt142 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
