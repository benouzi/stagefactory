# 4.65.0 — fiche GDTF attachée à une référence du catalogue, trouvée dans GDTF Share (faux service local : le vrai demande un compte).
# Gestes réels : bibliothèque → catalogue → fiche de la référence → « Chercher sur GDTF Share » → connexion → « Attacher ».
import subprocess,time,os,json,sys,glob
from playwright.sync_api import sync_playwright
REAL=os.environ.get('SF_GDTF') or next(iter(glob.glob('/home/claude/gd/blender-dmx/assets/profiles/*BeskydBeam*.gdtf')),None)
if not REAL: print('t146 : fichier GDTF d\'essai absent (SF_GDTF)'); sys.exit(0)
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
env=dict(os.environ,GDTF_BASE='http://127.0.0.1:8799/',PORT='8793',ARTNET_PORT='16464',SACN_PORT='15578')
g=subprocess.Popen(['node','/home/claude/local/dist/StageFactory/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); m=None; time.sleep(2)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1400,'height':900}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda q: q.type=='error' and 'Failed to load resource' not in q.text and errs.append(q.text)); pg.set_default_timeout(240000)
    pg.add_init_script("try{if(localStorage.getItem('onex.dv')===null){localStorage.setItem('onex.dv','false');localStorage.setItem('onex.dvMig','453')}}catch(e){}")
    def boot():
        pg.goto('http://localhost:8793/'); pg.wait_for_function("window.STAGE && window.FLIB && window.DRAWER && document.querySelector('#loader').style.display==='none'",timeout=240000); pg.evaluate("document.querySelector('#modal').style.display='none'"); pg.wait_for_timeout(1500)
    boot(); ev=pg.evaluate
    ref=ev("(()=>{const t=STAGE.LIB.find(t=>t.base&&t.cat==='lum'&&t.mover&&t.brand&&t.name.split(' ').length>=2&&!t.gatt);return t?{id:t.id,brand:t.brand,name:t.name,modes:t.modes,dim:t.dim||null,lumens:t.lumens,w:t.w}:null})()"); print('référence',ref)
    m=subprocess.Popen(['node',os.path.join(os.path.dirname(os.path.abspath(__file__)),'mock-gdtf-share.js')],env=dict(os.environ,MOCK_M=ref['brand'],MOCK_F=ref['name'],MOCK_FILE=REAL)); time.sleep(1.2)
    ev("DRAWER.open('lib')"); pg.wait_for_timeout(1500); pg.select_option('#drBody [data-lv=cat]','cata'); pg.wait_for_timeout(400); pg.click(f'#drawer [data-a=libbrand][data-id="{ref["brand"]}"]'); pg.wait_for_timeout(2500)
    pg.click(f'#drawer [data-a=pick][data-id="{ref["id"]}"]'); pg.wait_for_selector('#libFiche #gdtfBox'); t0=ev("document.querySelector('#gdtfBox').innerText"); ok('aucune' in t0 and 'Chercher sur GDTF Share' in t0,'la fiche de la référence propose de chercher sa fiche GDTF',t0[:120])
    pg.click('#gdtfBox [data-a=gdtffind]'); pg.wait_for_selector('#libU'); pg.wait_for_timeout(500); msg=ev("document.querySelector('#toast')?.innerText||''"); ok(ev("FLIB.isOpen()") and ev("document.querySelector('#modal').style.display")=='none','pas connecté : la fenêtre de connexion GDTF Share s\'ouvre',msg[:110])
    pg.fill('#libU','ben'); pg.fill('#libP','ok'); pg.click('[data-la=login]'); pg.wait_for_function("FLIB.L.gdtf && FLIB.L.gdtf.length===4"); ok(True,'connexion acceptée (identifiants en formulaire après refus du format JSON), liste de 4 fiches reçue')
    ev("FLIB.toggle(false)"); pg.click('#gdtfBox [data-a=gdtffind]'); pg.wait_for_selector('#modal #gdtfCand [data-a=gdtfpick]'); c=ev("[...document.querySelectorAll('#modal #gdtfCand .librow')].map(r=>r.innerText.replace(/\\n/g,' '))")
    ok(len(c)==2 and 'v3 essai' in c[0] and 'Wash XL' in c[1] and 'Default (17 can.)' in c[0],'candidats : la fiche exacte d\'abord, la variante ensuite ; autre marque et autre modèle écartés',c); pg.screenshot(path='/home/claude/shots/t146-a-candidats.png')
    pg.click('#modal #gdtfCand [data-a=gdtfpick] >> nth=0'); pg.wait_for_function("(id)=>STAGE.LIB.find(t=>t.id===id).gatt",arg=ref['id']); pg.wait_for_timeout(800)
    t=ev("(id)=>{const t=STAGE.LIB.find(t=>t.id===id);return {gatt:t.gatt,gdtf:t.gdtf,modes:t.modes,ng:t.fx?t.fx.gobo.length:0,raw:!!t.raw,name:t.name,brand:t.brand,dim:t.dim||null,lumens:t.lumens,w:t.w,ch:t.chs[0].slice(0,5),box:document.querySelector('#gdtfBox')?.innerText.slice(0,260)}}",ref['id'])
    ok(t['gatt'] and t['raw'] and t['ng']==23 and t['modes'][0][1]==17 and t['ch']==['dim','pan','panF','tilt','tiltF'],'« Attacher » : la référence prend les modes, l\'ordre des canaux et les roues de la fiche',[t['modes'],t['ng'],t['ch']])
    ok(t['name']==ref['name'] and t['brand']==ref['brand'] and t['dim']==ref['dim'] and t['lumens']==ref['lumens'] and t['w']==ref['w'] and 'attachée' in (t['box'] or ''),'elle garde son nom, ses cotes, son poids et son flux relevés chez le fabricant',t['box'])
    # dans la scène : maillage de la fiche, à sa taille
    ev("(id)=>{STAGE.place(id,{point:new APP.THREE.Vector3(0,0,0),object:{userData:{}}});const o=STAGE.S.objs.at(-1);o.pos=[0,5,0];o.hang='fixe';o.dim=1;o.gobo=3;STAGE.S.haze=0;const j=STAGE.serialize();STAGE.loadShow(JSON.parse(j));STAGE.setLive(true)}",ref['id']); pg.wait_for_timeout(6000)
    s=ev("(()=>{const o=STAGE.S.objs.at(-1),r=STAGE.RT.get(o.id);if(!r.gdtf)return null;const B=new APP.THREE.Box3().setFromObject(r.gdtf),z=B.getSize(new APP.THREE.Vector3());return {h:+z.y.toFixed(3),w:+z.x.toFixed(3),beam:!!r.gBeam,cell:STAGE.fxLists(STAGE.typeOf(o)).cell(3)}})()")
    ok(s and .5<s['h']<.66 and abs(s['w']-.353)<.03 and s['beam'] and s['cell']>=12,'posé dans la scène : maillage de la fiche à sa taille réelle (35 cm de large, pas les 30 cm de la référence), sortie de faisceau et gobos de la fiche',s)
    ev("DOCK.view('3d');STAGE.select([]);(()=>{APP.camera.position.set(2.2,4.6,2.6);APP.orbit.target.set(0,4.6,0);APP.orbit.update()})()"); pg.wait_for_timeout(2500); pg.screenshot(path='/home/claude/shots/t146-b-scene.png')
    # relance du logiciel : la fiche reste attachée, le fichier est retrouvé
    js=ev("STAGE.serialize()"); boot(); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(5000)
    t2=ev("(id)=>{const t=STAGE.LIB.find(t=>t.id===id);const o=STAGE.S.objs.at(-1),r=o&&STAGE.RT.get(o.id);return {gatt:!!t.gatt,raw:!!t.raw,ng:t.fx?t.fx.gobo.length:0,model:!!(r&&r.gdtf)}}",ref['id']); ok(t2['gatt'] and t2['raw'] and t2['ng']==23 and t2['model'],'après relance : fiche toujours attachée, fichier retrouvé, maillage dans la scène',t2)
    ev("(id)=>STAGE.gdtfDetach(id)",ref['id']); pg.wait_for_timeout(1500); t3=ev("(id)=>{const t=STAGE.LIB.find(t=>t.id===id);const o=STAGE.S.objs.at(-1),r=STAGE.RT.get(o.id);return {gatt:!!t.gatt,modes:t.modes,fx:!!t.fx,gdtf:t.gdtf||null,model:!!r.gdtf}}",ref['id'])
    ok(not t3['gatt'] and t3['modes']==ref['modes'] and not t3['fx'] and not t3['gdtf'] and not t3['model'],'« Retirer la fiche » : la référence reprend ses modes et son modèle générique',t3)
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
finally:
  g.kill(); m and m.kill()
print('\nt146 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
