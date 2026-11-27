# 4.60.0 — fiche GDTF : gobos (images de la fiche), roue de couleurs (couleurs CIE), CTO en kelvins, iris, zoom, prisme, couteaux lus dans les fonctions de canal ; faisceau qui sort de la lentille à son diamètre.
# Fiche d'essai fabriquée ici (rien d'un fabricant). Si une fiche GDTF réelle est donnée dans SF_GDTF (ou trouvée dans /home/claude/gd), elle est essayée aussi.
import sys,os,io,zipfile,base64,glob; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_BLANK']='1'
from h import *
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
def ch(n,at,body): return f'<DMXChannel DMXBreak="1" Offset="{n}" Geometry="Beam"><LogicalChannel Attribute="{at}">{body}</LogicalChannel></DMXChannel>'
I='{1,0,0,0}{0,1,0,0}{0,0,1,%s}{0,0,0,1}'
XML='''<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.2"><FixtureType Name="Essai Roues" LongName="Essai Roues" Manufacturer="Essai" FixtureTypeID="99999999-2222-3333-4444-555555555555">
<AttributeDefinitions><Attributes><Attribute Name="Gobo1PosRotate" PhysicalUnit="AngularSpeed"/></Attributes></AttributeDefinitions>
<Wheels><Wheel Name="G1"><Slot Name="Open"/><Slot Name="Demi" MediaFileName="demi"/><Slot Name="SansImage"/></Wheel>
<Wheel Name="C1"><Slot Name="Open" Color="0.3127,0.3290,100"/><Slot Name="Rouge" Color="0.64,0.33,21.26"/></Wheel>
<Wheel Name="P1"><Slot Name="Open"/><Slot Name="Trois"><Facet/><Facet/><Facet/></Slot></Wheel></Wheels>
<Models><Model Name="Base" Length="0.30" Width="0.30" Height="0.10" PrimitiveType="Cube"/><Model Name="Head" Length="0.24" Width="0.24" Height="0.30" PrimitiveType="Cylinder"/></Models>
<Geometries><Geometry Name="Base" Model="Base" Position="'''+I%'0'+'''"><Geometry Name="Head" Model="Head" Position="'''+I%'-0.10'+'''"><Beam Name="Beam" Position="'''+I%'-0.30'+'''" BeamAngle="20" BeamRadius="0.10" LuminousFlux="12000" ColorTemperature="6000"/></Geometry></Geometry></Geometries>
<DMXModes><DMXMode Name="Standard" Geometry="Base"><DMXChannels>'''+ch(1,'Dimmer','<ChannelFunction Attribute="Dimmer" DMXFrom="0/1"/>')+\
 ch(2,'Gobo1','<ChannelFunction Attribute="Gobo1" DMXFrom="0/1" Wheel="G1"><ChannelSet DMXFrom="0/1" Name="Open" WheelSlotIndex="1"/><ChannelSet DMXFrom="64/1" Name="Demi" WheelSlotIndex="2"/><ChannelSet DMXFrom="128/1" Name="SansImage" WheelSlotIndex="3"/></ChannelFunction>')+\
 ch(3,'Gobo1Pos','<ChannelFunction Attribute="Gobo1Pos" DMXFrom="0/1" PhysicalFrom="0" PhysicalTo="360"/><ChannelFunction Attribute="Gobo1PosRotate" DMXFrom="128/1" PhysicalFrom="-360" PhysicalTo="360"/>')+\
 ch(4,'Color1','<ChannelFunction Attribute="Color1" DMXFrom="0/1" Wheel="C1"><ChannelSet DMXFrom="0/1" Name="Open" WheelSlotIndex="1"/><ChannelSet DMXFrom="128/1" Name="Rouge" WheelSlotIndex="2"/></ChannelFunction>')+\
 ch(5,'CTO','<ChannelFunction Attribute="CTO" DMXFrom="0/1" PhysicalFrom="6000" PhysicalTo="3000"/>')+\
 ch(6,'Iris','<ChannelFunction Attribute="Iris" DMXFrom="0/1"><ChannelSet DMXFrom="0/1" Name="Open"/><ChannelSet DMXFrom="255/1" Name="Closed"/></ChannelFunction>')+\
 ch(7,'Zoom','<ChannelFunction Attribute="Zoom" DMXFrom="0/1" PhysicalFrom="40" PhysicalTo="10"/>')+\
 ch(8,'Prism1','<ChannelFunction Attribute="Prism1" DMXFrom="0/1" Wheel="P1"><ChannelSet DMXFrom="0/1" Name="Open" WheelSlotIndex="1"/><ChannelSet DMXFrom="128/1" Name="Trois" WheelSlotIndex="2"/></ChannelFunction>')+\
 ch(9,'Blade1A','<ChannelFunction Attribute="Blade1A" DMXFrom="0/1" PhysicalFrom="0" PhysicalTo="1"/>')+ch(10,'Blade1B','<ChannelFunction Attribute="Blade1B" DMXFrom="0/1" PhysicalFrom="0" PhysicalTo="1"/>')+\
 ch(11,'Blade2A','<ChannelFunction Attribute="Blade2A" DMXFrom="0/1" PhysicalFrom="0" PhysicalTo="1"/>')+ch(12,'Blade2Rot','<ChannelFunction Attribute="Blade2Rot" DMXFrom="0/1" PhysicalFrom="-45" PhysicalTo="45"/>')+\
 ch(13,'Focus1','<ChannelFunction Attribute="Focus1" DMXFrom="0/1"/>')+'''</DMXChannels></DMXMode></DMXModes></FixtureType></GDTF>'''
im=Image.new('RGBA',(128,128),(0,0,0,255)); im.paste((255,255,255,255),(0,0,64,128)); pb=io.BytesIO(); im.save(pb,'PNG')
buf=io.BytesIO(); z=zipfile.ZipFile(buf,'w'); z.writestr('description.xml',XML); z.writestr('wheels/demi.png',pb.getvalue()); z.close(); B64=base64.b64encode(buf.getvalue()).decode()
REAL=os.environ.get('SF_GDTF') or next(iter(glob.glob('/home/claude/gd/blender-dmx/assets/profiles/*BeskydBeam*.gdtf')),None)
IMP="async ([b,n])=>{const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));await STAGE.importFiles([new File([u],n)]);}"
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && window.DMX",timeout=60000); pg.wait_for_timeout(1500)
    ev(IMP,[B64,'Essai@Essai_Roues.gdtf']); pg.wait_for_timeout(600)
    t=ev("(()=>{const t=STAGE.S.lib.find(t=>t.gdtf);return {id:t.id,kind:t.kind,fx:t.fx,chs:t.chs[0],lens:t.lens,zoom:t.zoom,cct:t.cct,caps:STAGE.fxCaps(t)}})()"); TID=t['id']
    ok([g['n'] for g in t['fx']['gobo']]==['Ouvert','Demi','SansImage'] and t['fx']['gobo'][1].get('f')=='demi' and not t['fx']['gobo'][2].get('f'),'roue de gobos lue dans la fiche : noms et image',t['fx']['gobo'])
    c=t['fx']['cw']; ok([q['n'] for q in c]==['Ouvert','Rouge'] and c[1]['c'][0]>.95 and c[1]['c'][1]<.05 and c[1]['c'][2]<.05,'roue de couleurs : rouge CIE (0,64 ; 0,33) → rouge pur',c)
    ok(t['fx']['prism']==[0,3] and t['fx']['ctoK']==[6000,3000] and abs(t['lens']['r']-.1)<1e-6 and t['cct']==6000,'prisme 3 facettes, CTO 6000 → 3000 K, lentille de 10 cm de rayon',[t['fx']['prism'],t['fx'].get('ctoK'),t['lens']])
    ok(all(t['caps'][k] for k in ['gobo','iris','blades','wheel','cto','prism']),'réglages proposés = ceux que la fiche décrit',t['caps'])
    ok(t['chs']==['dim','gobo','gobor','cw','cto','iris','zoom','prism','b1','b1b','b2','b2r','foc0'],'ordre des canaux',t['chs'])
    # DMX : valeurs lues dans les plages de la fiche
    ev("([id])=>{STAGE.place(id,{point:new APP.THREE.Vector3(0,0,0),object:{userData:{}}});const o=STAGE.S.objs.at(-1);o.pos=[0,6,0];o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;o.zoom=30;o.color='#ffffff';o.uni=1;o.addr=1;o.mode=0;STAGE.S.haze=0;STAGE.touch()}",[TID]); pg.wait_for_timeout(1500)
    RD="(vals)=>{const o=STAGE.S.objs.at(-1),t=STAGE.typeOf(o),IN=DMX.IN||DMX.in||null,U=(IN&&IN.universes)||DMX.universes||DMX.U,rd=(IN&&IN.read)||DMX.read,buf=new Uint8Array(512);vals.forEach((v,i)=>buf[i]=v);const old=U.get(1);U.set(1,buf);const q=rd(o,t,new APP.THREE.Color()),r={};for(const k of ['gobo','gobor','gobos','cw','cto','iris','zoom','prism','b1','b1r','b2','b2r','focus'])r[k]=q[k]===undefined?null:+(+q[k]).toFixed(3);if(old)U.set(1,old);else U.delete&&U.delete(1);return r}"
    a=ev(RD,[255,70,64,200,255,0,0,200,255,255,0,255,99]); ok(a['gobo']==1 and abs(a['gobor']-181.4)<1 and a['gobos']==0 and a['cw']==1 and a['cto']==1 and a['iris']==1 and a['zoom']==40 and a['prism']==3,'DMX : gobo 2e plage, orientation 181°, filtre rouge, CTO plein, iris ouvert, zoom à 40° (sens inversé de la fiche), prisme',a)
    ok(a['b1']==1 and a['b1r']==0 and a['b2']==0 and a['b2r']==45 and a['focus'] is None,'DMX : couteau 1 (A et B à fond) fermé droit ; couteau 2 incliné de 45° ; netteté non simulée',a)
    a=ev(RD,[255,130,255,0,0,255,255,0,255,0,0,128,0]); ok(a['gobo']==2 and a['gobor']==0 and abs(a['gobos']-1)<.02 and a['cw']==0 and a['cto']==0 and abs(a['iris']-.15)<.01 and a['zoom']==10 and a['prism']==0 and a['b1']==.5 and abs(a['b1r']-45)<.1,'DMX : rotation 1 tr/s (360°/s), iris fermé, zoom 10°, couteau 1 en biais (A à fond, B sorti)',a)
    # rendu : vu de dessus
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(1200)
    ev("DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true);STAGE.setLive(true);STAGE.select([]);(()=>{APP.camera.position.set(0.01,11,0.02);APP.orbit.target.set(0,0,0);APP.orbit.update()})()"); pg.wait_for_timeout(5000)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def shot(name,wait=2200):
        pg.wait_for_timeout(wait); f=OUT+'/t140-'+name+'.png'; pg.screenshot(path=f); return Image.open(f).convert('RGB')
    def px(im,pt):
        x,y=ev(S2,pt); x=int(x); y=int(y); q=[im.getpixel((x+dx,y+dy)) for dx in (-2,0,2) for dy in (-2,0,2)]; return [round(sum(c[i] for c in q)/9) for i in range(3)]
    def lum(im,pt): return round(sum(px(im,pt))/3)
    def setv(**kw): ev("(kw)=>{const o=STAGE.S.objs.find(o=>STAGE.typeOf(o).cat==='lum');for(const k of ['iris','gobo','gobor','gobos','focus','cw','cto','prism','b1','b1r','b2','b2r'])delete o[k];Object.assign(o,kw);STAGE.touch()}",kw)
    g=ev("(()=>{const o=STAGE.S.objs.at(-1),r=STAGE.RT.get(o.id);return {beam:!!r.gBeam,ly:r.light.position.y,ang:r.light.angle,hit:r.hitD,lr:r.lr,cells:STAGE.fxLists(STAGE.typeOf(o)).cell(1)}})()")
    import math
    exp=math.atan(math.tan(math.radians(15))+g['lr']/g['hit'])*1.05 if g['hit'] else 0
    ok(g['beam'] and abs(g['lr']-.1)<1e-6 and abs(g['ly']-(6-.42))<.06,'la lumière part de la sortie de faisceau de la fiche (0,40 m sous l\'accroche), lentille de 10 cm',g)
    ok(g['hit'] and abs(g['hit']-g['ly'])<.1 and abs(g['ang']-exp)<1e-3,'tache au sol : rayon = lentille + distance × tan (angle de la source élargi d\'autant)',[g['ang'],exp])
    ok(g['cells']>=12,'image du gobo rangée dans l\'atlas, après les motifs génériques',g['cells'])
    im=shot('a-ouvert'); A=[lum(im,[1,0,.3]),lum(im,[-1,0,.3]),lum(im,[2.3,0,0])]; ok(A[0]>90 and A[1]>90 and A[2]<25,'ouvert : disque éclairé',A)
    setv(gobo=1); im=shot('b-gobo-demi'); G=[lum(im,[.9,0,.3]),lum(im,[-.9,0,.3])]; ok((G[0]>90)!=(G[1]>90) and min(G)<25,'gobo de la fiche (moitié blanche, moitié noire) : une moitié du disque seulement',G)
    setv(gobo=2); im=shot('c-gobo-sans-image'); G2=[lum(im,[.9,0,.3]),lum(im,[-.9,0,.3])]; ok(min(G2)>90,'emplacement sans image dans la fiche : rien d\'inventé, le faisceau reste ouvert',G2)
    setv(cw=1); im=shot('d-rouge'); R=px(im,[1,0,.3]); ok(R[0]>120 and R[1]<40 and R[2]<40,'filtre rouge de la fiche',R)
    setv(cto=0); im=shot('e-cto0'); N=px(im,[1,0,.3]); setv(cto=1); im=shot('f-cto1'); W=px(im,[1,0,.3]); ok(abs(N[0]-N[2])<14 and W[0]-W[2]>45 and W[0]>=W[1]>=W[2],'CTO : neutre à 6000 K (température de la source), chaud à 3000 K',[N,W])
    setv(prism=3); pg.wait_for_timeout(600); pz=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs.at(-1).id);return r.bm.uniforms.fxP.value.x})()"); ok(pz==3,'prisme 3 facettes de la fiche accepté',pz)
    # fumée, vue de côté : le faisceau sort au diamètre de la lentille
    setv(); ev("STAGE.S.haze=.6;STAGE.touch();(()=>{APP.camera.position.set(0,5.2,3.2);APP.orbit.target.set(0,5.2,0);APP.orbit.update()})()"); im=shot('g-fumee-lentille',5000)
    u=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs.at(-1).id),u=r.bm.uniforms;return {a0:u.a0.value,R:u.scl.value.x,L:u.scl.value.y,y:r.beam.position.y}})()"); ok(abs(u['a0']*u['R']-.1)<.002 and abs(u['R']-(.1+u['L']*math.tan(math.radians(15))))<.01,'fumée : rayon de 10 cm à la lentille puis ouverture du zoom',u)
    Y=u['y']-.06; H=[lum(im,[0,Y,0]),lum(im,[.07,Y,0]),lum(im,[.2,Y,0])]; ok(H[1]>H[2]+12 and H[0]>H[2]+12,'fumée visible sur la largeur de la lentille juste sous l\'appareil, pas au-delà',H)
    # inspecteur : gestes réels
    ev("STAGE.S.haze=0;DOCK.view('3d');STAGE.select([STAGE.S.objs.at(-1).id]);APP.toggleConsole(true)"); pg.wait_for_timeout(900)
    op=ev("['gobo','cw','prism'].map(k=>[...document.querySelectorAll('#console select[data-k='+k+'] option')].map(o=>o.textContent))"); ok(op[0]==['Ouvert','1 · Demi','2 · SansImage (sans image dans la fiche)'] and op[1]==['Ouvert','Rouge'] and op[2]==['Aucun','3 facettes'],'inspecteur : listes de la fiche, pas les listes génériques',op)
    pg.select_option('#console select[data-k=gobo]','1'); pg.wait_for_timeout(500); pg.select_option('#console select[data-k=cw]','1'); pg.wait_for_timeout(500)
    o=ev("(o=>[o.gobo,o.cw])(STAGE.S.objs.at(-1))"); ok([int(o[0]),int(o[1])]==[1,1],'choisir un gobo et un filtre dans l\'inspecteur',o); pg.screenshot(path=OUT+'/t140-h-inspecteur.png')
    # projet rouvert après rechargement de la page, fiche d'avant la lecture des roues : relue toute seule
    js=ev("(()=>{const t=STAGE.S.lib.find(t=>t.gdtf);const j=JSON.parse(STAGE.serialize());return JSON.stringify(j)})()")
    pg.reload(); pg.wait_for_function("window.STAGE && document.querySelector('#loader').style.display==='none' && window.DMX",timeout=240000); pg.wait_for_timeout(1500)
    ev("j=>{const d=JSON.parse(j);const strip=o=>{if(o&&typeof o==='object'){if(o.gdtf&&o.fx){delete o.fx;delete o.cfn;delete o.fxv;delete o.lens}for(const k in o)strip(o[k])}};strip(d);STAGE.loadShow(d)}",js); pg.wait_for_timeout(5000)
    t2=ev("(()=>{const t=STAGE.S.lib.find(t=>t.gdtf);return t?{raw:!!t.raw,fxv:t.fxv,n:t.fx?t.fx.gobo.length:0,cfn:!!t.cfn,cell:STAGE.fxLists(t).cell(1)}:null})()"); ok(t2 and t2['raw'] and t2['fxv']==1 and t2['n']==3 and t2['cfn'] and t2['cell']>=12,'ancien projet : la fiche gardée est relue (roues, canaux) et ses images rechargées',t2)
    if REAL:
        ev(IMP,[base64.b64encode(open(REAL,'rb').read()).decode(),os.path.basename(REAL)]); pg.wait_for_timeout(800)
        r=ev("(()=>{const t=STAGE.S.lib.filter(t=>t.gdtf).at(-1);return {id:t.id,name:t.name,ng:t.fx?t.fx.gobo.length:0,caps:STAGE.fxCaps(t),chs:t.chs[0],ctoK:t.fx&&t.fx.ctoK,lens:t.lens,zoom:t.zoom}})()"); print('fiche réelle',r)
        ok(r['ng']==23 and r['caps']['gobo'] and r['caps']['cto'] and abs(r['lens']['r']-.08)<1e-6,'fiche GDTF réelle (GDTF Builder) : 2 roues de 11 gobos, CTO, lentille de 8 cm',[r['ng'],r['caps'],r['lens']])
        ev("([id])=>{for(const o of [...STAGE.S.objs])STAGE.remove&&0;STAGE.place(id,{point:new APP.THREE.Vector3(3,0,0),object:{userData:{}}});const o=STAGE.S.objs.at(-1);o.pos=[3,6,0];o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;o.zoom=40;o.color='#ffffff';o.gobo=3;o.uni=2;o.addr=1;STAGE.S.haze=0;STAGE.touch()}",[r['id']]); js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(5000)
        c=ev("(()=>{const o=STAGE.S.objs.at(-1),t=STAGE.typeOf(o),L=STAGE.fxLists(t);return [...Array(23).keys()].map(i=>L.cell(i))})()"); ok(c[0]==0 and len(set(c[1:12]))==11 and min(c[1:])>=12,'les images des gobos de la fiche réelle sont dans l\'atlas',c)
        ev("DOCK.view('3d');APP.toggleConsole(false);STAGE.setLive(true);STAGE.select([]);(()=>{APP.camera.position.set(3.01,11,0.02);APP.orbit.target.set(3,0,0);APP.orbit.update()})()"); im=shot('i-fiche-reelle-gobo3',6000); V=[lum(im,[3+dx,0,dz]) for dx in (-1.5,-1,-.5,.5,1,1.5) for dz in (-.8,.8)]; ok(max(V)>70 and min(V)<30,'fiche réelle : le gobo 3 dessine du clair et du sombre au sol',V)
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
print('\nt140 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
