# 4.67.2 — fiche GDTF dont la sortie de faisceau est À L'INTÉRIEUR du maillage de la tête (cas de la Clay Paky Arolla Aqua de Benjamin) : l'appareil ne doit pas se faire d'ombre à lui-même.
import sys,os,io,zipfile,base64; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_BLANK']='1'
from h import *
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
I='{1,0,0,0}{0,1,0,0}{0,0,1,%s}{0,0,0,1}'
XML='''<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.2"><FixtureType Name="Essai Dedans" LongName="Essai Dedans" Manufacturer="Essai" FixtureTypeID="77777777-2222-3333-4444-555555555555">
<Models><Model Name="Base" Length="0.30" Width="0.30" Height="0.10" PrimitiveType="Cube"/><Model Name="Head" Length="0.26" Width="0.26" Height="0.45" PrimitiveType="Cylinder"/></Models>
<Geometries><Geometry Name="Base" Model="Base" Position="'''+I%'0'+'''"><Geometry Name="Head" Model="Head" Position="'''+I%'-0.10'+'''"><Beam Name="Beam" Position="'''+I%'-0.08'+'''" BeamAngle="25" BeamRadius="0.06" LuminousFlux="9000" ColorTemperature="6000"/></Geometry></Geometry></Geometries>
<DMXModes><DMXMode Name="Standard" Geometry="Base"><DMXChannels><DMXChannel DMXBreak="1" Offset="1" Geometry="Beam"><LogicalChannel Attribute="Dimmer"><ChannelFunction Attribute="Dimmer" DMXFrom="0/1"/></LogicalChannel></DMXChannel></DMXChannels></DMXMode></DMXModes></FixtureType></GDTF>'''
buf=io.BytesIO(); z=zipfile.ZipFile(buf,'w'); z.writestr('description.xml',XML); z.close(); B64=base64.b64encode(buf.getvalue()).decode()
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN",timeout=60000); pg.wait_for_timeout(1500)
    ev("async ([b,n])=>{const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));await STAGE.importFiles([new File([u],n)]);}",[B64,'Essai@Essai_Dedans.gdtf']); pg.wait_for_timeout(600)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def lum(im,pt):
        x,y=ev(S2,pt); x=int(x); y=int(y); q=[im.getpixel((x+dx,y+dy)) for dx in (-2,0,2) for dy in (-2,0,2)]; return round(sum(sum(c) for c in q)/27)
    def scene(n,haze):
        ev("""([n,hz])=>{const id=STAGE.S.lib.find(t=>t.gdtf).id;STAGE.loadShow({name:'t',objs:[],cues:[],lib:STAGE.S.lib,follow:false});const P=(t,x,y,z)=>{STAGE.place(t,{point:new APP.THREE.Vector3(x,0,z),object:{userData:{}}});const o=STAGE.S.objs.at(-1);o.pos=[x,y,z];o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;o.color='#ffffff';return o};
          {const o=P(id,0,5,0);o.zoom=25;if(n)o.dim=.4} for(let i=0;i<n;i++)P('decoupe',30+i*1.5,6,-20).zoom=30; STAGE.S.haze=hz;const j=STAGE.serialize();STAGE.loadShow(JSON.parse(j));STAGE.setLive(true);STAGE.select([]);DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true)}""",[n,haze])
    st="(()=>{const r=STAGE.RT.get(STAGE.S.objs[0].id),u=r.bm.uniforms;return {beam:!!r.gBeam,shd:r.light.castShadow,occI:r.occI,occD:r.occD==null?null:+r.occD.toFixed(2),hitD:r.hitD==null?null:+r.hitD.toFixed(2),L:+u.scl.value.y.toFixed(2),near:+r.light.shadow.camera.near.toFixed(2),self:r.selfNear==null?null:+r.selfNear.toFixed(2),ly:+r.light.position.y.toFixed(2)}})()"
    for n,name in ((0,'ombre du moteur'),(14,'atlas d\'ombres')):
        scene(n,0); ev("(()=>{APP.camera.position.set(0.01,11,0.02);APP.orbit.target.set(0,0,0);APP.orbit.update()})()"); pg.wait_for_timeout(9000); f=OUT+'/t150-sol-%d.png'%n; pg.screenshot(path=f); im=Image.open(f).convert('RGB'); s=ev(st); V=[lum(im,[.6,0,.4]),lum(im,[.5,0,-.6])]
        ok(s['beam'] and s['shd']==(n==0) and min(V)>(45 if n else 70),name+' : le sol est éclairé (la tête ne fait pas d\'ombre à sa propre lumière)',[V,s])
        ok(s['hitD'] and s['hitD']>3.5 and s['L']>4,name+' : le faisceau va jusqu\'au sol, il ne s\'arrête pas sur la tête',s)
    scene(0,.6); ev("(()=>{APP.camera.position.set(0,3,7);APP.orbit.target.set(0,2.6,0);APP.orbit.update()})()"); pg.wait_for_timeout(8000); f=OUT+'/t150-fumee.png'; pg.screenshot(path=f); im=Image.open(f).convert('RGB'); H=[lum(im,[0,y,0]) for y in (3.6,2.4,1.2)]; B=lum(im,[2.5,2.4,0])
    ok(min(H)>B+12,'fumée : le faisceau est visible sur toute sa hauteur, pas seulement près de l\'appareil',[H,B])
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
print('\nt150 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
