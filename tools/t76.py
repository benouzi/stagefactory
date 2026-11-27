# Vignettes 3D de la bibliothèque, grand aperçu dans la fiche, modèle 3D d'une fiche GDTF (fichier d'essai fabriqué ici, volumes simples).
import os, sys, io, zipfile, base64
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
XML='''<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.2"><FixtureType Name="Essai Lyre" ShortName="ESL" LongName="Essai Lyre" Manufacturer="Essai" Description="" FixtureTypeID="11111111-2222-3333-4444-555555555555">
<Models><Model Name="Base" Length="0.30" Width="0.30" Height="0.12" PrimitiveType="Cube"/><Model Name="Yoke" Length="0.36" Width="0.10" Height="0.34" PrimitiveType="Cube"/><Model Name="Head" Length="0.22" Width="0.22" Height="0.30" PrimitiveType="Cylinder"/></Models>
<Geometries><Geometry Name="Base" Model="Base" Position="{1,0,0,0}{0,1,0,0}{0,0,1,0}{0,0,0,1}"><Axis Name="Yoke" Model="Yoke" Position="{1,0,0,0}{0,1,0,0}{0,0,1,-0.12}{0,0,0,1}"><Axis Name="Head" Model="Head" Position="{1,0,0,0}{0,1,0,0}{0,0,1,-0.20}{0,0,0,1}"><Beam Name="Beam" Model="" Position="{1,0,0,0}{0,1,0,0}{0,0,1,0}{0,0,0,1}" BeamAngle="20" BeamRadius="0.08"/></Axis></Axis></Geometry></Geometries>
<DMXModes><DMXMode Name="Standard" Geometry="Base"><DMXChannels><DMXChannel DMXBreak="1" Offset="1" Geometry="Base"><LogicalChannel Attribute="Dimmer"><ChannelFunction Attribute="Dimmer" DMXFrom="0/1"/></LogicalChannel></DMXChannel></DMXChannels></DMXMode></DMXModes></FixtureType></GDTF>'''
buf=io.BytesIO(); z=zipfile.ZipFile(buf,'w'); z.writestr('description.xml',XML); z.close(); open('/tmp/essai.gdtf','wb').write(buf.getvalue())
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DRAWER && window.DOCK && window.PONTS",timeout=60000); pg.wait_for_function("!!window.THUMBS",timeout=30000)
    ev("DRAWER.open('lib')"); pg.wait_for_timeout(2500)
    im=ev("[...document.querySelectorAll('#drawer .lib img[data-th]')].map(i=>[i.dataset.th,(i.getAttribute('src')||'').length])"); ok(len(im)>=10 and all(x[1]>800 for x in im),'chaque tuile de l\'onglet Lumière a sa vignette 3D',im[:4])
    ok(len(set(ev("[...document.querySelectorAll('#drawer .lib img[data-th]')].map(i=>i.getAttribute('src'))")))>=6,'les vignettes sont différentes d\'un type à l\'autre')
    n0=ev("STAGE.S.objs.length+':'+STAGE.RT.size"); ok(n0=='0:0','aucun objet laissé dans la scène par les vignettes',n0)
    pg.select_option('#drBody [data-lv=cat]','cata'); pg.wait_for_timeout(300); pg.click('#drawer [data-a=libbrand][data-id="Yamaha"]'); pg.wait_for_timeout(12000)
    im=ev("[...document.querySelectorAll('#drawer .lib img[data-th]')].map(i=>(i.getAttribute('src')||'').length)"); ok(len(im)>=40 and sum(1 for x in im if x>800)>=len(im)-1,'catalogue Yamaha : vignettes des consoles et enceintes',[len(im),sum(1 for x in im if x>800)])
    pg.click('#drawer [data-a=pick] >> nth=0'); pg.wait_for_timeout(1500); big=ev("(i=>i?[i.naturalWidth,(i.getAttribute('src')||'').length]:null)(document.querySelector('#libFiche img.big'))"); ok(big and big[0]==380 and big[1]>3000,'grand aperçu 3D dans la fiche',big)
    pg.screenshot(path=OUT+'/t76-cata.png')
    # GDTF
    pg.keyboard.press('Escape'); b64=base64.b64encode(open('/tmp/essai.gdtf','rb').read()).decode()
    ev("async b=>{const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));await STAGE.importFiles([new File([u],'Essai@Essai_Lyre.gdtf')]);}",b64); pg.wait_for_timeout(600)
    t=ev("STAGE.S.lib.map(t=>[t.id,t.name,!!t.raw,t.gdtf])"); ok(len(t)==1 and t[0][2],'fiche GDTF importée, fichier gardé en mémoire',t)
    tid=t[0][0]; ev("id=>{STAGE.place(id,STAGE.hitAt(0,0),true);STAGE.render()}",tid); pg.wait_for_timeout(1500)
    g=ev("(()=>{const o=STAGE.S.objs[0],r=STAGE.RT.get(o.id);let n=0;r.gdtf&&r.gdtf.traverse(m=>{if(m.isMesh)n++});return {g:!!r.gdtf,n,pan:!!r.gPan,tilt:!!r.gTilt,g3d:STAGE.typeOf(o).g3d}})()"); ok(g['g'] and g['n']==4 and g['pan'] and g['tilt'] and g['g3d']==True,'modèle 3D de la fiche dans la scène : 3 volumes et la lentille, pivots pan et tilt',g)
    ev("(()=>{const o=STAGE.S.objs[0];o.pan=40;o.tilt=30;o.dim=1;STAGE.setLive(true);STAGE.render()})()"); pg.wait_for_timeout(900); rz=ev("(()=>{const r=STAGE.RT.get(STAGE.S.objs[0].id);return [Math.round(r.gPan.rotation.z*100)/100,Math.round(r.gTilt.rotation.x*100)/100]})()"); ok(abs(rz[0])>.1 and abs(rz[1])>.1,'la tête de la fiche suit pan et tilt',rz)
    pg.select_option('#drBody [data-lv=cat]','imp'); pg.wait_for_timeout(1800); th=ev("(i=>i?(i.getAttribute('src')||'').length:0)(document.querySelector('#drawer .lib img[data-th]'))"); ok(th>800,'vignette de la fiche GDTF dans « Importés »',th)
    ev("document.querySelector('#view3d')?.click();(()=>{APP.camera.position.set(2.2,1.4,2.6);APP.orbit.target.set(0,.4,0);APP.orbit.update()})()"); pg.wait_for_timeout(1300); pg.screenshot(path=OUT+'/t76-gdtf.png')
    # rechargement de la page : le fichier GDTF revient du stockage du navigateur, le modèle 3D et l'aperçu avec
    js=ev("STAGE.serialize()"); ev("j=>{STAGE.S.lib.forEach(t=>delete t.raw);STAGE.loadShow(JSON.parse(j))}",js); pg.wait_for_timeout(2500)
    r=ev("(()=>{const t=STAGE.S.lib[0],r=STAGE.RT.get(STAGE.S.objs[0].id);return [!!t.raw,t.g3d,!!(r&&r.gPan)]})()"); ok(r[0] and r[2],'après rechargement : fichier GDTF restauré, modèle 3D de retour',r)
    ok(not errs,'aucune erreur de page',errs[:3]); b.close()
print('ECHECS',bad) if bad else print('TOUT PASSE')
