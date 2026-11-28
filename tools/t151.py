# 4.67.3 / 4.67.4 — fiche GDTF SANS <Axis> (lyre écrite Base > Yoke > Body en <Geometry>, cas de la révision utilisateur de la Clay Paky Arolla Aqua de Benjamin) :
# la tête doit suivre le tilt (géométrie désignée par le canal Tilt), sinon le faisceau traverse la tête restée en bas et se fait de l'ombre.
import sys,os,io,zipfile,base64; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_BLANK']='1'
from h import *
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
I='{1,0,0,0}{0,1,0,0}{0,0,1,%s}{0,0,0,1}'
CH=lambda off,att,geo:'<DMXChannel DMXBreak="1" Offset="%d" Geometry="%s"><LogicalChannel Attribute="%s"><ChannelFunction Attribute="%s" DMXFrom="0/1" PhysicalFrom="%s" PhysicalTo="%s"/></LogicalChannel></DMXChannel>'%(off,geo,att,att,'-270' if att=='Pan' else '-125' if att=='Tilt' else '0','270' if att=='Pan' else '125' if att=='Tilt' else '1')
def xml(tag):
    return '''<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.2"><FixtureType Name="Essai Sans Axe" LongName="Essai Sans Axe" Manufacturer="Essai" FixtureTypeID="77777777-2222-3333-4444-%s">
<Models><Model Name="Base" Length="0.30" Width="0.30" Height="0.10" PrimitiveType="Cube"/><Model Name="Yoke" Length="0.34" Width="0.10" Height="0.30" PrimitiveType="Cube"/><Model Name="Head" Length="0.24" Width="0.24" Height="0.50" PrimitiveType="Cylinder"/></Models>
<Geometries><Geometry Name="Base" Model="Base" Position="'''%('666666666666' if tag=='Geometry' else '888888888888')+I%'0'+'''"><'''+tag+''' Name="Yoke" Model="Yoke" Position="'''+I%'-0.10'+'''"><'''+tag+''' Name="Body" Model="Head" Position="'''+I%'-0.22'+'''"><Beam Name="Beam" Position="'''+I%'-0.26'+'''" BeamAngle="25" BeamRadius="0.06" LuminousFlux="9000" ColorTemperature="6000"/></'''+tag+'''></'''+tag+'''></Geometry></Geometries>
<DMXModes><DMXMode Name="Standard" Geometry="Base"><DMXChannels>'''+CH(1,'Dimmer','Beam')+CH(2,'Pan','Yoke')+CH(3,'Tilt','Body')+'''</DMXChannels></DMXMode></DMXModes></FixtureType></GDTF>'''
def b64(tag):
    buf=io.BytesIO(); z=zipfile.ZipFile(buf,'w'); z.writestr('description.xml',xml(tag)); z.close(); return base64.b64encode(buf.getvalue()).decode()
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN",timeout=60000); pg.wait_for_timeout(1500)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def lum(im,pt):
        x,y=ev(S2,pt); x=int(x); y=int(y); q=[im.getpixel((x+dx,y+dy)) for dx in (-2,0,2) for dy in (-2,0,2)]; return round(sum(sum(c) for c in q)/27)
    st="(()=>{const T=APP.THREE,o=STAGE.S.objs[0],r=STAGE.RT.get(o.id);const w=n=>n?n.getWorldPosition(new T.Vector3()).toArray().map(x=>+x.toFixed(3)):null;return {pan:!!r.gPan,tilt:!!r.gTilt,beam:w(r.gBeam),light:w(r.light),shd:r.light.castShadow,hitD:r.hitD==null?null:+r.hitD.toFixed(2),L:+r.bm.uniforms.scl.value.y.toFixed(2)}})()"
    for tag in ('Geometry','Axis'):
        ev("async ([b,n])=>{const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));await STAGE.importFiles([new File([u],n)]);}",[b64(tag),'Essai@Essai_'+tag+'.gdtf']); pg.wait_for_timeout(700)
        ev("""(tg)=>{const t=STAGE.S.lib.filter(t=>t.gdtf).at(-1);STAGE.loadShow({name:'t',objs:[],cues:[],lib:[t],follow:false});STAGE.place(t.id,{point:new APP.THREE.Vector3(0,0,0),object:{userData:{}}});const o=STAGE.S.objs.at(-1);o.pos=[0,5,0];o.hang='fixe';o.dim=1;o.pan=0;o.tilt=0;o.zoom=25;o.color='#ffffff';STAGE.S.haze=0;const j=STAGE.serialize();STAGE.loadShow(JSON.parse(j));STAGE.setLive(true);STAGE.select([]);DOCK.view('3d');APP.toggleConsole(false);APP.toggleHelp(true);APP.camera.position.set(0.01,12,0.02);APP.orbit.target.set(0,0,0);APP.orbit.update()}""",tag)
        pg.wait_for_timeout(7000); s0=ev(st)
        ok(s0['pan'] and s0['tilt'],tag+' : la fiche donne un pivot de pan et un pivot de tilt',s0)
        ev("(()=>{const o=STAGE.S.objs[0];o.tilt=35;STAGE.RT.get(o.id).dirty=true;STAGE.select([o.id]);STAGE.select([])})()"); pg.wait_for_timeout(8000); s1=ev(st)
        d=sum((a-c)**2 for a,c in zip(s0['beam'],s1['beam']))**.5
        ok(d>.08,tag+' : la tête suit le tilt (la sortie de faisceau se déplace)',[round(d,3),s0['beam'],s1['beam']])
        f=OUT+'/t151-%s.png'%tag; pg.screenshot(path=f); im=Image.open(f).convert('RGB')
        import math
        cz=5*math.tan(math.radians(35)); V=[lum(im,[0,0,cz]),lum(im,[.4,0,cz+.3]),lum(im,[0,0,-cz]),lum(im,[.4,0,-cz-.3])]; B=lum(im,[4.5,0,-3])
        ok(s1['shd'] and max(V)>B+45,tag+' : à 35° de tilt le sol est éclairé (la tête ne coupe pas son faisceau)',[V,B,s1])
        ok(s1['hitD'] and s1['hitD']>4.5,tag+' : le faisceau va jusqu\'au sol',s1)
        AL="(()=>{const T=APP.THREE,o=STAGE.S.objs[0],r=STAGE.RT.get(o.id);r.root.updateWorldMatrix(true,true);const d=r.light.target.getWorldPosition(new T.Vector3()).sub(r.light.getWorldPosition(new T.Vector3())).normalize();return +d.dot(new T.Vector3(0,0,-1).transformDirection(r.gBeam.matrixWorld)).toFixed(4)})()"
        dots=[]
        for pan,tilt in ((30,40),(-120,75),(200,-50),(0,110)):
            ev("([p,t])=>{const o=STAGE.S.objs[0];o.pan=p;o.tilt=t;const r=STAGE.RT.get(o.id);r.cpan=p;r.ctilt=t;r.dirty=true;STAGE.select([o.id]);STAGE.select([])}",[pan,tilt]); pg.wait_for_timeout(1500); dots.append(ev(AL))
        ok(min(dots)>.999,tag+' : accroché, la tête vise exactement là où va la lumière (4 positions)',dots)
        ev("()=>{const d=JSON.parse(STAGE.serialize());d.objs[0].hang=null;d.objs[0].pos=[0,0,0];d.objs[0].pan=40;d.objs[0].tilt=120;d.lib=STAGE.S.lib;STAGE.loadShow(d);STAGE.setLive(true);STAGE.select([])}"); pg.wait_for_timeout(5000); dots=[ev(AL)]
        ev("([p,t])=>{const o=STAGE.S.objs[0];o.pan=p;o.tilt=t;const r=STAGE.RT.get(o.id);r.cpan=p;r.ctilt=t;r.dirty=true;STAGE.select([o.id]);STAGE.select([])}",[-70,150]); pg.wait_for_timeout(1500); dots.append(ev(AL))
        ok(min(dots)>.999,tag+' : posé au sol, la tête vise exactement là où va la lumière',dots)
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
print('\nt151 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
