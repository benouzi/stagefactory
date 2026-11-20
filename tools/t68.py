# Version installée (passerelle) : démarrage vierge, ponts, décor (modèles et chargeurs servis en local), PDF, line array, anciens projets.
import subprocess,time,os,json,shutil
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/appdata68',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata68',PORT='8804',SACN_PORT='15580'); D='/home/claude/local/dist/StageFactory'
g=subprocess.Popen(['node',D+'/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2); bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:330],flush=True)
    if not c: bad.append(m)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1500,'height':900}); errs=[]; fails=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('requestfailed',lambda r: fails.append(r.url)); pg.on('response',lambda r: r.status>=400 and fails.append(str(r.status)+' '+r.url))
    pg.set_default_timeout(90000); pg.goto('http://localhost:8804/')
    pg.wait_for_function("window.STAGE && window.PONTS && window.DRAWER && window.PUB && window.DECOR && window.LARRAY && window.DOCK && window.PLAN && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate
    ev("document.querySelector('#modal').style.display='none';APP.renderer.setAnimationLoop(null)")
    ok(ev("STAGE.S.objs.length")==0 and ev("APP.venue.open")==True,'démarrage : projet vierge, espace vide')
    ok(ev("document.querySelector('#console h1').textContent")=='Inspecteur' and ev("DRAWER.h()")>100,'Inspecteur et tiroir du bas')
    ev("PONTS.addTruss({x:-5000,y:3000},{x:5000,y:3000},null,true);STAGE.place('par-led',STAGE.hitAt(0,-3),true);STAGE.touch()")
    ok(ev("STAGE.S.objs[0].hang")=='pont' and ev("PONTS.resOf(STAGE.S.sups[0].id).count")==1,'pont de 10 m et projecteur accroché')
    ev("STAGE.place('sf-piano-queue',STAGE.hitAt(2,-1),true);STAGE.place('sf-guitariste',STAGE.hitAt(-2,-1),true)"); pg.wait_for_function("DECOR.ready && DECOR.M.peopleReady('guitariste')",timeout=120000); pg.wait_for_timeout(800)
    m=ev("STAGE.S.objs.slice(1).map(o=>{let n=0;STAGE.RT.get(o.id).root.traverse(q=>{if(q.isMesh&&!q.material.wireframe)n++});return n})"); ok(all(x>0 for x in m),'piano et guitariste : modèles détaillés chargés depuis le poste',m)
    r=ev("async()=>{const pdf=await PUB.publish({plan:true,coupe:true,gear:true,patch:true,rig:true,bom:true,secu:true});return pdf?pdf.length:0}"); ok(r>50000,'dossier PDF fabriqué',r)
    ev("LARRAY.open()"); pg.wait_for_timeout(300); pg.click('#modal [data-lb=place]'); pg.wait_for_timeout(400); ok(ev("STAGE.S.objs.filter(o=>o.type==='lab-kara2').length")==8,'line array posé')
    # ancien projet (sans ponts) : s'ouvre comme avant
    ev("STAGE.loadShow(STAGE.demoShow())"); pg.wait_for_timeout(800); ok(ev("STAGE.S.objs.length")>20 and ev("STAGE.S.sups.length")==0,'la démonstration s\'ouvre toujours',ev("STAGE.S.objs.length"))
    ev("DRAWER.open('patch')"); pg.wait_for_timeout(300); ok(ev("document.querySelectorAll('#drBody [data-dp=addr]').length")>10,'patch de la démonstration dans le tiroir')
    ev("DRAWER.open('con')"); pg.wait_for_timeout(300); ok(ev("!!document.querySelector('#drBody [data-a=live]')"),'console dans le tiroir')
    l0=ev("APP.live"); pg.click('#drBody [data-a=live]'); pg.wait_for_timeout(300); ok(ev("APP.live")==(not l0),'mode spectacle basculé depuis le tiroir',l0)
    ev("STAGE.select([STAGE.S.objs[0].id])"); pg.wait_for_timeout(200); ok(ev("!!document.querySelector('#console [data-k=name]')"),'Inspecteur : réglages de l\'objet sélectionné')
    ok(not errs,'aucune erreur de script',errs[:3]); ok(not [f for f in fails if 'favicon' not in f],'aucun fichier manquant',fails[:5])
    pg.screenshot(path='/home/claude/shots/t68.png'); b.close()
finally:
  g.terminate()
print('ÉCHECS :',bad if bad else 'aucun')
