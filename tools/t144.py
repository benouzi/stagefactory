# 4.63.0 — vidéo : raccord en grille (3 en largeur, 2 × 2), fondus sur les quatre côtés, projecteur en portrait.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:500],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.VIDEO",timeout=60000); pg.wait_for_timeout(1500)
    def fresh():
        return ev("""(()=>{const T=APP.THREE,at=(x,y,z)=>({point:new T.Vector3(x,y,z),object:{userData:{}},face:null});STAGE.loadShow({name:'t',objs:[],cues:[],lib:STAGE.S.lib,follow:false});
          const s=STAGE.place('ecran',at(0,0,-3),true,{}); s.pos=[0,1,-3]; const v=STAGE.place('vp12',at(0,0,6),true,{}); v.pos=[0,2.5,6]; v.hang=null; v.content='blanc'; v.bright=.1;
          for(const o of [s,v]){STAGE.unbuild(o.id);STAGE.build(o)} STAGE.setLive(true); STAGE.touch(); STAGE.tick(0); STAGE.select([v.id]); return v.id})()""")
    VP="()=>{STAGE.tick(0);const r=v=>+v.toFixed(3);return STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='vid').map(o=>{const g=STAGE.RT.get(o.id).geom;return {id:o.id,pos:o.pos.map(r),th:o.throw,bg:o.bg||null,bgc:o.bgc||null,crop:o.crop||null,bl:[o.bll||0,o.blr||0,o.blb||0,o.blt||0],warp:!!o.warp,port:!!o.portrait,pl:g.pl.map(p=>p.toArray().map(r))}})}"
    S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def lum(tag,pts):
        pg.wait_for_timeout(2500); f=OUT+'/t144-'+tag+'.png'; pg.screenshot(path=f); im=Image.open(f).convert('L'); out=[]
        for q in pts:
            x,y=ev(S3,q); out.append(round(sum(im.getpixel((int(x)+i,int(y)+j)) for i in (-2,0,2) for j in (-2,0,2))/9))
        return out
    cam="(()=>{STAGE.select([]);DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true);APP.camera.position.set(0,7.5,5.5);APP.orbit.target.set(0,2.7,-3);APP.orbit.update()})()"
    W,H,Y0=6,3.375,1
    def regerr(v,cols,rows,k):
        w=(1+(cols-1)*k)/cols; h=(1+(rows-1)*k)/rows; ci,ri=v['bgc'][2],v['bgc'][3]; u0=ci*(w-k); v0=ri*(h-k)
        exp=[[(u-.5)*W,Y0+q*H,-3] for u,q in ((u0,v0),(u0+w,v0),(u0+w,v0+h),(u0,v0+h))]
        return max(sum((a-b)**2 for a,b in zip(v['pl'][i],exp[i]))**.5 for i in range(4))
    # --- référence : un projecteur calé
    vid=fresh(); ev("(id)=>{const o=STAGE.byId(id);VIDEO.aim(o,VIDEO.scrOf(o),'tilt');VIDEO.pin(o,VIDEO.scrOf(o))}",vid); ev(cam)
    ptsx=[[x,2.7,-3] for x in (-2.3,-1.7,-.85,-.33,.85,1.7,2.3)]; ref=lum('a-ref',ptsx); ok(20<min(ref) and max(ref)<200,'référence : un projecteur à 10 % calé sur l\'écran',ref)
    # --- 3 en largeur, par les réglages de la fiche (gestes réels)
    ev("(id)=>{STAGE.select([id]);APP.toggleConsole(true);STAGE.UI.tab='prop';STAGE.render()}",vid); pg.wait_for_timeout(600)
    pg.select_option('#console select[data-vpgc]','3'); pg.select_option('#console select[data-vpgr]','1'); pg.click('#console button[data-vp=grid]'); pg.wait_for_timeout(1500)
    v=ev(VP); e=[regerr(q,3,1,.15) for q in v] if all(q['bgc'] for q in v) else [9]
    ok(len(v)==3 and len(set(q['bg'] for q in v))==1 and max(e)<.04,'« Raccorder » 3 col. : trois projecteurs, chacun calé sur sa case (43 % de la largeur)',[e,[q['pos'] for q in v]])
    v.sort(key=lambda q:q['bgc'][2]); ok([q['bl'][:2] for q in v]==[[0,v[0]['bl'][1]],[v[1]['bl'][0],v[1]['bl'][1]],[v[2]['bl'][0],0]] and abs(v[1]['bl'][0]-34.6)<.2 and v[1]['bl'][0]==v[1]['bl'][1]==v[0]['bl'][1]==v[2]['bl'][0],'fondus : un côté pour les projecteurs du bord, deux pour celui du milieu (34,6 % de l\'image)',[q['bl'] for q in v])
    inf=ev("document.querySelector('#console')?.innerText||''").replace('\\n',' '); ok('Raccord 3 × 1' in inf,'la fiche annonce le raccord',inf[inf.find('Raccord 3'):][:80])
    ev(cam); l3=lum('b-3col',ptsx); ok(max(l3)-min(l3)<=16 and abs(sum(l3)/7-sum(ref)/7)<30,'lumière égale sur toute la largeur, recouvrements compris',[ref,l3])
    ev("()=>{for(const o of STAGE.S.objs)if(o.bg){o.bll=o.blr=0;STAGE.RT.get(o.id).dirty=true}STAGE.touch()}"); n3=lum('c-3col-sans-fondu',ptsx); ok(n3[2]-l3[2]>15 and n3[4]-l3[4]>15 and abs(n3[3]-l3[3])<10,'contre-épreuve sans fondu : les deux recouvrements ressortent plus clairs',[l3,n3])
    # --- 2 × 2
    vid=fresh(); ev("(id)=>{const o=STAGE.byId(id);VIDEO.grid(o,VIDEO.scrOf(o),2,2,20)}",vid); pg.wait_for_timeout(1200); v=ev(VP); e=[regerr(q,2,2,.2) for q in v] if all(q['bgc'] for q in v) else [9]
    ok(len(v)==4 and max(e)<.05,'grille 2 × 2 : quatre projecteurs calés sur leur quart d\'écran (plus recouvrement)',e)
    ok(all(sum(1 for z in q['bl'] if z>0)==2 for q in v),'chaque projecteur a deux fondus : un vertical, un horizontal',[q['bl'] for q in v])
    ev(cam); pts=[[x,y,-3] for x,y in ((-2.2,1.6),(2.2,1.6),(-2.2,3.8),(2.2,3.8),(-.4,1.6),(-.4,3.8),(-2.2,2.69),(2.2,2.69),(-.4,2.69))]; l4=lum('d-2x2',pts)
    ok(max(l4)-min(l4)<=18,'lumière égale partout, y compris au centre où les quatre images se croisent',l4)
    # --- portrait : case à cocher de la fiche
    vid=fresh(); ev("(id)=>{const o=STAGE.byId(id);VIDEO.aim(o,VIDEO.scrOf(o),'tilt');STAGE.select([id]);APP.toggleConsole(true);STAGE.UI.tab='prop';STAGE.render()}",vid); pg.wait_for_timeout(600)
    pg.check('#console input[data-vpport]'); pg.wait_for_timeout(900); q=ev(VP)[0]; xs=[c[0] for c in q['pl']]; ys=[c[1] for c in q['pl']]
    ok(q['port'] and (max(ys)-min(ys))>(max(xs)-min(xs))*1.3,'case « Portrait » : l\'image est plus haute que large',[max(xs)-min(xs),max(ys)-min(ys)])
    ev(cam); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t144-e-portrait.png')
    ev("(id)=>{STAGE.select([id]);const o=STAGE.byId(id);VIDEO.grid(o,VIDEO.scrOf(o),3,1,15)}",vid); pg.wait_for_timeout(1200); v=ev(VP); e=[regerr(z,3,1,.15) for z in v] if all(z['bgc'] for z in v) else [9]
    ok(len(v)==3 and all(z['port'] for z in v) and max(e)<.05,'3 projecteurs en portrait raccordés : chacun calé sur sa case',e)
    ev(cam); l5=lum('f-3-portrait',ptsx); ok(max(l5)-min(l5)<=16 and min(l5)>20,'lumière égale sur la largeur avec les trois en portrait',l5)
    ev("(id)=>{STAGE.select([id]);const o=STAGE.byId(id);VIDEO.ungrid(o)}",vid); v=ev(VP); ok(all(not z['bg'] and not z['crop'] and z['bl']==[0,0,0,0] for z in v),'« Défaire le raccord » : cases et fondus retirés',[z['bl'] for z in v])
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
print('\nt144 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
