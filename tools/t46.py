import subprocess,time,os,json
from playwright.sync_api import sync_playwright
env=dict(os.environ,TITAN_LIB='/tmp/titanlib',GDTF_BASE='http://127.0.0.1:8799/',PORT='8791',ARTNET_PORT='16454',SACN_PORT='15568')
m=subprocess.Popen(['node','/tmp/mock.js']); g=subprocess.Popen(['node','/home/claude/local/dist/StageFactory/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
time.sleep(2)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1100,'height':700}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('requestfailed',lambda r: errs.append('FAIL '+r.url)); pg.set_default_timeout(240000); pg.goto('http://localhost:8791/?demo')
    ev=pg.evaluate
    try: pg.wait_for_function("window.STAGE && window.FLIB && document.querySelector('#loader').style.display==='none'",timeout=120000)
    except Exception as e: print('ETAT',ev("[!!window.STAGE,!!window.FLIB,document.querySelector('#loader').style.display]"),errs[:6]); raise
    ev("APP.renderer.setAnimationLoop(null);document.querySelector('#modal').style.display='none'")
    print('modal',ev("document.querySelector('#modal').style.display+'|'+document.querySelector('#modal').innerText.slice(0,50)")); pg.add_style_tag(content='#modal{display:none!important}'); n0=ev("STAGE.S.lib.length"); ev("FLIB.toggle(true)"); pg.wait_for_function("FLIB.L.titan && FLIB.L.titan.length")
    print('titan',ev("[FLIB.L.titan, FLIB.L.dirs]"))
    pg.fill('#libQ','b-eye'); print('filtre',ev("document.querySelectorAll('#libRows .librow').length"))
    pg.click('[data-lt]'); pg.wait_for_function("STAGE.S.lib.length>%d"%n0); print('ajout d4',ev("STAGE.S.lib[STAGE.S.lib.length-1].name"))
    pg.click('[data-ltab=gdtf]'); pg.wait_for_selector('#libU'); pg.fill('#libU','ben'); pg.fill('#libP','bad'); pg.click('[data-la=login]'); pg.wait_for_function("FLIB.L.msg.includes('refus')"); print('mauvais mdp',ev("FLIB.L.msg"))
    pg.fill('#libU','ben'); pg.fill('#libP','ok'); pg.click('[data-la=login]'); pg.wait_for_function("FLIB.L.gdtf && FLIB.L.gdtf.length===2"); print('liste',ev("FLIB.L.gdtf.map(e=>e.m+' '+e.f)"))
    n1=ev("STAGE.S.lib.length"); pg.fill('#libQ','acme'); print('modal',ev("(()=>{const m=document.querySelector('#modal');const t=m.innerText.slice(0,60);m.style.display='none';return t})()")); pg.click('[data-lg]'); pg.wait_for_function("STAGE.S.lib.length>%d"%n1); print('ajout gdtf',ev("(()=>{const t=STAGE.S.lib[STAGE.S.lib.length-1];return [t.name,t.modes]})()"))
    pg.screenshot(path='/home/claude/shots/lib.png'); print(errs[:3]); b.close()
finally:
  m.kill(); g.kill()
