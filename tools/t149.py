# 4.67.1 — les deux champs de recherche (bibliothèque et GDTF Share) portaient le même identifiant : taper dans l'un écrivait dans l'autre. Origine de chaque modèle et de sa forme 3D écrite sur les tuiles.
import subprocess,time,os,sys,glob
from playwright.sync_api import sync_playwright
REAL=os.environ.get('SF_GDTF') or next(iter(glob.glob('/home/claude/gd/blender-dmx/assets/profiles/*BeskydBeam*.gdtf')),None)
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
env=dict(os.environ,GDTF_BASE='http://127.0.0.1:8799/',PORT='8794',ARTNET_PORT='16474',SACN_PORT='15588')
g=subprocess.Popen(['node','/home/claude/local/dist/StageFactory/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
m=subprocess.Popen(['node',os.path.join(os.path.dirname(os.path.abspath(__file__)),'mock-gdtf-share.js')],env=dict(os.environ,MOCK_M='Acme',MOCK_F='Spot 300',MOCK_FILE=REAL or __file__)); time.sleep(2)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1500,'height':900}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda q: q.type=='error' and 'Failed to load resource' not in q.text and errs.append(q.text)); pg.set_default_timeout(240000)
    pg.goto('http://localhost:8794/'); pg.wait_for_function("window.STAGE && window.FLIB && window.PANELS && document.querySelector('#loader').style.display==='none'",timeout=240000); ev=pg.evaluate; ev("document.querySelector('#modal').style.display='none'"); pg.wait_for_timeout(2500)
    ok(ev("document.body.classList.contains('dv')"),'mode panneaux (celui de Benjamin)')
    ev("FLIB.toggle(true)"); pg.wait_for_timeout(800); pg.click('[data-ltab=gdtf]'); pg.wait_for_selector('#libU'); pg.fill('#libU','ben'); pg.fill('#libP','ok'); pg.click('[data-la=login]'); pg.wait_for_function("FLIB.L.gdtf && FLIB.L.gdtf.length===4"); pg.wait_for_timeout(600)
    ids=ev("[document.querySelectorAll('#libQ').length,document.querySelectorAll('#flibQ').length,[...document.querySelectorAll('[id]')].map(e=>e.id).filter((v,i,a)=>v&&a.indexOf(v)!==i)]"); ok(ids[0]==1 and ids[1]==1,'un champ de recherche par fenêtre, chacun son identifiant',ids)
    lq=[q for q in pg.query_selector_all('#libQ') if q.is_visible()]; ok(len(lq)==1,'le champ de la bibliothèque est visible',len(lq))
    pg.click('#flibQ'); pg.keyboard.type('sdf',delay=90); pg.wait_for_timeout(900)
    v=ev("[document.querySelector('#flibQ').value,document.querySelector('#libQ').value,document.activeElement.id]"); ok(v==['sdf','','flibQ'],'taper « sdf » dans GDTF Share : rien ne s\'écrit dans la bibliothèque, le curseur reste où il est',v)
    pg.click('#libQ'); pg.keyboard.type('par',delay=90); pg.wait_for_timeout(1200)
    v=ev("[document.querySelector('#flibQ').value,document.querySelector('#libQ').value,document.activeElement.id]"); ok(v==['sdf','par','libQ'],'taper « par » dans la bibliothèque : GDTF Share garde « sdf », le curseur reste dans la bibliothèque',v)
    t=ev("[...document.querySelectorAll('.lorig')].slice(0,3).map(e=>e.innerText)"); leg=ev("document.querySelector('.lorigleg')?.innerText||''"); ok(len(t)>=1 and 'Générique · 3D générique' in t[0] and 'Catalogue' in leg and 'Importé' in leg,'chaque tuile dit d\'où vient le modèle et sa forme 3D ; légende en haut de la liste',[t,leg[:80]])
    pg.screenshot(path='/home/claude/shots/t149.png')
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
finally:
  g.kill(); m.kill()
print('\nt149 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
