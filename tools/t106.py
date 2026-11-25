# vidéo : viser un écran (incliner / décaler l'optique), caler les 4 coins, tirer l'image à la souris ; l'image éclairée suit le gabarit
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.VIDEO",timeout=60000); pg.wait_for_timeout(1500)
    ids=ev("""(()=>{const T=APP.THREE,at=(x,y,z)=>({point:new T.Vector3(x,y,z),object:{userData:{}},face:null});
      const s=STAGE.place('ecran',at(0,0,-3),true,{}); s.pos=[0,1,-3]; const v=STAGE.place('vp12',at(0,0,5),true,{}); v.pos=[0,1.2,5]; v.hang=null; v.content='blanc';
      for(const o of [s,v]){STAGE.unbuild(o.id);STAGE.build(o)} STAGE.setLive(true); STAGE.touch(); STAGE.tick(0); STAGE.select([v.id]); return [s.id,v.id]})()""")
    sid,vid=ids; pg.wait_for_timeout(800)
    G="(id)=>{STAGE.tick(0);const o=STAGE.byId(id),g=STAGE.RT.get(id).geom,r=v=>+v.toFixed(3);return {pan:o.pan,tilt:o.tilt,th:o.throw,lsh:o.lsh||0,lsv:o.lsv||0,warp:o.warp||null,W:r(g.W),H:r(g.H),D:r(g.D),kx:r(g.kx),ky:r(g.ky),lux:Math.round(g.lux),used:r(g.op.used),ctr:g.ctr.toArray().map(r),cn:g.cn.map(p=>p.toArray().map(r)),src:g.src.toArray().map(r),scr:VIDEO.scrGeo(STAGE.byId('%s')).cn.map(p=>p.toArray().map(r)),cover:VIDEO.cover(o,STAGE.byId('%s'))}}"%(sid,sid)
    dist=lambda a,b:sum((x-y)**2 for x,y in zip(a,b))**.5
    # rangement des coins de l'écran vu du projecteur (il regarde vers -Z : sa droite est +X)
    def scr_bl(g): s=g['scr']; return sorted(s,key=lambda p:(p[1]>2,p[0])) and [min([q for q in s if q[1]<2],key=lambda q:q[0]),max([q for q in s if q[1]<2],key=lambda q:q[0]),max([q for q in s if q[1]>2],key=lambda q:q[0]),min([q for q in s if q[1]>2],key=lambda q:q[0])]
    ev("(id)=>VIDEO.aim(STAGE.byId(id),VIDEO.scrOf(STAGE.byId(id)),'tilt')",vid); g=ev(G,vid)
    ok(dist(g['ctr'],[0,2.688,-3])<.03 and abs(g['W']-6)<.06 and g['kx']<.1 and g['ky']<.005,'incliner vers l\'écran, projecteur en face : le centre de l\'image est au centre de l\'écran, image de 6 m de large',[g['ctr'],g['W'],g['H'],g['th'],g['kx'],g['ky']])
    # projecteur désaxé et en hauteur
    ev("(id)=>{STAGE.select([]);const o=STAGE.byId(id);o.pos=[3,4.2,5];STAGE.unbuild(id);STAGE.build(o);STAGE.touch();STAGE.tick(0);VIDEO.aim(o,VIDEO.scrOf(o),'tilt');STAGE.select([id])}",vid); g=ev(G,vid)
    ok(dist(g['ctr'],[0,2.688,-3])<.03 and (g['kx']>.02 or g['ky']>.02),'projecteur désaxé et incliné : l\'image arrive bien au centre mais en trapèze, et c\'est dit',[g['kx'],g['ky'],g['cn']])
    pg.wait_for_timeout(400); ev("STAGE.UI.tab='prop';STAGE.render()"); pg.wait_for_timeout(300)
    inf=ev("document.querySelector('#console')?.innerText||''").replace('\n',' '); ok('Trapèze' in inf and 'Décalage V' in inf and ev("!!document.querySelector('#console [data-vp=pin]')"),'la fiche montre le trapèze, les décalages d\'optique et les boutons pour viser',inf[inf.find('Distance'):][:200])
    ev("(id)=>VIDEO.aim(STAGE.byId(id),VIDEO.scrOf(STAGE.byId(id)),'shift')",vid); g=ev(G,vid); S=scr_bl(g)
    ok(g['kx']<.005 and g['ky']<.005 and dist(g['ctr'],[0,2.688,-3])<.03 and (abs(g['pan']-180)<.01 or abs(g['pan']+180)<.01),'décaler l\'optique : le projecteur reste d\'équerre, plus de trapèze, image centrée sur l\'écran',[g['pan'],g['tilt'],g['lsh'],g['lsv'],g['kx'],g['ky'],g['ctr']])
    th=g['th']; W=8/th; H=W*1200/1920; ok(abs(g['W']-W)<.02 and abs(g['lsh']-(0-3)/W*100)<.6 and abs(g['lsv']-(2.688-g['src'][1])/H*100)<.6,'le décalage affiché est celui de la géométrie (écart / taille d\'image)',[g['lsh'],g['lsv'],W,H,g['src']])
    # l'image éclairée tombe là où le gabarit le dit : image plus petite que l'écran, on regarde dedans et dehors
    S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def lum(tag,pts):
        pg.wait_for_timeout(1500); f=OUT+'/t106-'+tag+'.png'; pg.screenshot(path=f); im=Image.open(f).convert('L'); out=[]
        for q in pts: x,y=ev(S3,q); out.append(im.getpixel((int(x),int(y))))
        return out
    ev("(id)=>{const o=STAGE.byId(id);o.throw=2;STAGE.touch();STAGE.select([]);APP.camera.position.set(0,3,9);APP.orbit.target.set(0,2.6,-3);APP.orbit.update()}",vid); g=ev(G,vid); c=g['ctr']; cn=g['cn']
    mix=lambda a,b,k:[a[i]+(b[i]-a[i])*k for i in range(3)]
    ins=[mix(c,q,.85) for q in cn]; outs=[mix(c,q,1.2) for q in cn]; li=lum('a',ins); lo=lum('a',outs)
    ok(g['W']<5 and min(li)>max(lo)+40,'optique décalée, image de 4 m : éclairé juste dans les 4 coins du gabarit, sombre juste dehors',[g['W'],li,lo])
    # 4 coins : on rentre le coin haut-droite, l'ancien coin devient sombre
    ev("(id)=>{const o=STAGE.byId(id);o.warp=[[0,0],[1,0],[.6,.6],[0,1]];STAGE.touch()}",vid); g2=ev(G,vid); li2=lum('b',[mix(c,q,.85) for q in cn]); 
    ok(li2[2]<li[2]-40 and min(li2[0],li2[1],li2[3])>li[0]-25 and abs(g2['used']-.6)<.01,'coin haut-droite rentré de 40 % : l\'ancien coin n\'est plus éclairé, les trois autres le sont toujours, 60 % de la matrice utilisée',[li2,g2['used'],g2['cn'][2]])
    ev("(id)=>{const o=STAGE.byId(id);delete o.warp;o.pos=[3,4.2,5];STAGE.touch();VIDEO.aim(o,VIDEO.scrOf(o),'tilt');VIDEO.pin(o,VIDEO.scrOf(o))}",vid); g=ev(G,vid); S=scr_bl(g)
    e=[round(dist(g['cn'][i],S[i]),3) for i in range(4)]; ok(max(e)<.03 and g['cover'] and g['warp'] and g['used']<1,'incliner puis « Caler sur l\'écran » : les 4 coins de l\'image sont sur les 4 coins de l\'écran',[e,g['used'],g['th'],g['lux']])
    li3=lum('c',[mix([0,2.688,-3],q,.9) for q in S]); ok(min(li3)>100,'et l\'écran est éclairé jusque dans ses coins',li3)
    ev("(id)=>VIDEO.unpin(STAGE.byId(id))",vid); g=ev(G,vid); ok(g['warp'] is None and g['used']==1,'« Remettre droit » : la matrice entière',g['used'])
    # à la souris
    ev("(id)=>{STAGE.select([id]);APP.camera.position.set(-2,4,10);APP.orbit.target.set(0,2.6,-3);APP.orbit.update()}",vid); pg.wait_for_timeout(1200)
    tip=ev("document.querySelector('#vpTip').innerText").replace('\n',' '); ok(ev("VIDEO.on") and 'image' in tip and 'lux' in tip,'projecteur choisi : les poignées sont sur l\'image, sa taille est affichée',tip[:140])
    cam0=ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))")
    def drag(k,dv):
        h=[x for x in ev("VIDEO.handles()") if x[0]==k][0][1:]; a=ev(S3,h); t_=ev(S3,[h[0]+dv[0],h[1]+dv[1],h[2]+dv[2]]); pg.mouse.move(*a); pg.wait_for_timeout(150); pg.mouse.down(); pg.wait_for_timeout(100); pg.mouse.move((a[0]+t_[0])/2,(a[1]+t_[1])/2,steps=5); pg.mouse.move(*t_,steps=5); pg.wait_for_timeout(250); tp=ev("document.querySelector('#vpTip').innerText").replace('\n',' '); pg.mouse.up(); pg.wait_for_timeout(900); return tp
    g0=ev(G,vid); tp=drag('m',[-1,0,0]); g1=ev(G,vid)
    ok(abs((g1['ctr'][0]-g0['ctr'][0])+1)<.12 and abs(g1['ctr'][1]-g0['ctr'][1])<.12 and 'pan' in tp and ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))")==cam0,'tirer le losange blanc d\'1 m vers jardin : l\'image se déplace d\'1 m, la caméra ne bouge pas',[g0['ctr'],g1['ctr'],tp[:120]])
    tp=drag('z',[-.6,0,0]); g2=ev(G,vid); ok(g2['W']<g1['W']-.5 and g2['th']>g1['th'],'tirer le cube orange vers l\'intérieur : l\'image rétrécit (rapport plus long)',[g1['W'],g2['W'],g1['th'],g2['th'],tp[:100]])
    tp=drag('c2',[-.8,-.5,0]); g3=ev(G,vid); ok(g3['warp'] and g3['warp'][2][0]<.95 and g3['warp'][2][1]<.95 and g3['warp'][0]==[0,0] and 'coin haut droite' in tp,'tirer la boule du coin haut-droite vers l\'intérieur : seul ce coin rentre',[g3['warp'],tp[:120]])
    tp=drag('c0',[-1,-1,0]); g4=ev(G,vid); ok(g4['warp'][0]==[0,0],'tirer un coin vers l\'extérieur : il ne sort pas de la matrice',g4['warp'][0])
    pg.screenshot(path=OUT+'/t106-d.png',clip={'x':60,'y':45,'width':1090,'height':640}); pg.click('[data-pv=coupe]'); pg.wait_for_timeout(700); pg.screenshot(path=OUT+'/t106-e.png',clip={'x':600,'y':45,'width':560,'height':560}); pg.click('[data-pv=plan]')
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(3): pg.keyboard.press('Control+z'); pg.wait_for_timeout(700)
    g9=ev(G,vid); ok(g9['warp'] is None and abs(g9['pan']-g0['pan'])<.01 and abs(g9['th']-g0['th'])<.001,'trois Ctrl+Z : image, taille et coins d\'avant (un pas par geste)',[g9['pan'],g0['pan'],g9['th'],g9['warp']])
    ev("STAGE.UI.tab='prop';STAGE.render()"); pg.wait_for_timeout(300); pg.click('#console [data-vp=tilt]'); pg.wait_for_timeout(600); pg.click('#console [data-vp=pin]'); pg.wait_for_timeout(900); g=ev(G,vid); ok(g['warp'] is not None and g['cover'],'le bouton « Caler sur l\'écran » de la fiche fait le calage',g['used'])
    js=ev("JSON.parse(STAGE.serialize()).objs.find(o=>o.warp)"); ok(js and len(js['warp'])==4 and js.get('scr')==sid,'les 4 coins et l\'écran visé sont enregistrés dans le fichier')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
