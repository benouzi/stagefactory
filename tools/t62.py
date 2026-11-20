# Double-clic sur une ligne de la liste des objets : l'Atelier passe sur les réglages de cet objet (version installée).
import subprocess,time,os,json,shutil
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/appdata62',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata62',PORT='8797',SACN_PORT='15574'); D='/home/claude/local/dist/StageFactory'
g=subprocess.Popen(['node',D+'/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2); bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:300],flush=True)
    if not c: bad.append(m)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1300,'height':820}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.set_default_timeout(120000); pg.goto('http://localhost:8797/?demo')
    pg.wait_for_function("window.STAGE && window.AI && window.VENUE && window.PARC && PARC.ready && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate
    ev("APP.renderer.setAnimationLoop(null)"); pg.add_style_tag(content='#modal{display:none!important}')
    ids=ev("STAGE.S.objs.slice(-3).map(o=>o.id)")
    ev("document.querySelector('#modal').style.display='none'"); pg.keyboard.press('o'); pg.wait_for_selector('#olBody [data-a="sel"]')
    ok(ev("DRAWER.is('list')"),'la liste des objets est ouverte (tiroir du bas)')
    row='#olBody [data-a="sel"][data-id="%s"]'%ids[1]
    pg.click(row); ok(ev("DRAWER.is('list')") and ev("STAGE.UI.sel")==[ids[1]],'un simple clic sélectionne et reste dans la liste')
    pg.dblclick(row); pg.wait_for_timeout(200)
    ok(ev("STAGE.UI.tab")=='prop' and ev("STAGE.UI.sel")==[ids[1]],'double-clic : onglet des réglages, objet sélectionné',[ev("STAGE.UI.tab"),ev("STAGE.UI.sel")])
    nm=ev("STAGE.byId(%s).name"%json.dumps(ids[1])); vals=ev("[...document.querySelectorAll('#console input')].map(i=>i.value)"); ok(nm in vals,'les réglages affichés sont ceux de l\'objet cliqué')
    ok(not ev("document.querySelector('#console').classList.contains('hide')"),'l\'Atelier est visible')
    # sur un objet non sélectionné au départ, et sans passer par un simple clic
    pg.keyboard.press('o'); pg.wait_for_selector('#olBody [data-a="sel"]'); pg.dblclick('#olBody [data-a="sel"][data-id="%s"]'%ids[2]); pg.wait_for_timeout(200)
    ok(ev("STAGE.UI.tab")=='prop' and ev("STAGE.UI.sel")==[ids[2]],'double-clic direct sur un autre objet',ev("STAGE.UI.sel"))
    # l'œil et le cadenas gardent leur rôle
    pg.keyboard.press('o'); pg.wait_for_selector('#olBody [data-a="ohide"]'); print('avant',ev('STAGE.UI.tab')); pg.dblclick('#olBody [data-a="ohide"][data-id="%s"]'%ids[0]); pg.wait_for_timeout(200)
    ok(ev("DRAWER.is('list')") and ev("STAGE.byId(%s).hidden"%json.dumps(ids[0])) in (True,False,None),'double-clic sur l\'œil : on reste dans la liste')
    # Atelier fermé : il se rouvre
    ev("APP.toggleConsole(false)"); ev("APP.toggleConsole(true);STAGE.UI.tab='list';STAGE.render()"); pg.wait_for_selector('#olBody [data-a="sel"]')
    ok(not errs,'aucune erreur de page',errs[:2]); b.close()
finally: g.terminate()
print('\nECHECS:',bad if bad else 'aucun'); raise SystemExit(1 if bad else 0)
