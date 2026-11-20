import subprocess,time,os,shutil
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/appdata',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata',AI_BASE='http://127.0.0.1:8798/',PORT='8792',ARTNET_PORT='16455',SACN_PORT='15569')
m=subprocess.Popen(['node','/tmp/mockai.js']); g=subprocess.Popen(['node','/home/claude/local/dist/StageFactory/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1100,'height':700}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.set_default_timeout(120000); pg.goto('http://localhost:8792/?demo')
    pg.wait_for_function("window.STAGE && window.AI && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate
    ev("APP.renderer.setAnimationLoop(null)"); pg.add_style_tag(content='#modal{display:none!important}')
    ev("AI.toggle(true)"); pg.wait_for_selector('#aiKey'); print('formulaire clé affiché')
    pg.fill('#aiKey','sk-ant-mauvaise-cle-000000000'); pg.click('[data-ai=savekey]'); pg.wait_for_selector('#aiTxt'); pg.fill('#aiTxt','liste les projecteurs'); pg.click('[data-ai=send]')
    pg.wait_for_selector('#aiKey'); print('mauvaise clé ->',pg.inner_text('#aiPanel .info >> nth=1') if pg.locator('#aiPanel .info').count()>1 else pg.inner_text('body')[:0])
    pg.fill('#aiKey','sk-ant-test-0123456789abcdef'); pg.click('[data-ai=savekey]'); pg.wait_for_selector('#aiTxt'); pg.fill('#aiTxt','liste les projecteurs'); pg.click('[data-ai=send]')
    pg.wait_for_function("document.querySelector('#aiLog').innerText.includes('Fait :')"); print('réponse ->',ev("document.querySelector('#aiLog').innerText.split('\\n').filter(Boolean).slice(-2).join(' | ')"))
    print('fichier config',open('/tmp/appdata/OnexPreviz/config.json').read()[:40]+'…', 'status',ev("fetch('/api/ai/status').then(r=>r.json())"), errs[:3]); b.close()
finally: m.kill(); g.kill()
