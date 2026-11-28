# 4.68.0 — GDTF Share : filtre par déposant (Fabricant / Utilisateurs), fiche du fabricant en premier. Faux service local, gestes réels (clics, saisie).
import subprocess,time,os,json,sys
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
E=lambda rid,m,f,rev,up,mod:dict(rid=rid,manufacturer=m,fixture=f,revision=rev,uploader=up,lastModified=mod,modes=[dict(name='Standard',dmxfootprint=38)])
LIST=[E(1,'Clay Paky','Arolla Aqua','Chris','User',100),E(2,'Clay Paky','Arolla Aqua','check in','User',200),E(3,'Clay Paky','Arolla Aqua','ClayPaky FW 2_1','Manuf.',150),E(4,'Clay Paky','Aleda B-EYE K10','Adjusted','User',50),E(5,'Clay Paky','Aleda B-EYE K10','Official','Manuf.',60),E(6,'Robe','Spiider','v1','Manuf.',10),E(7,'Robe','Pointe','perso','User',10)]
env=dict(os.environ,GDTF_BASE='http://127.0.0.1:8799/',PORT='8794',ARTNET_PORT='16465',SACN_PORT='15579')
g=subprocess.Popen(['node','/home/claude/local/dist/StageFactory/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
m=subprocess.Popen(['node',os.path.join(os.path.dirname(os.path.abspath(__file__)),'mock-gdtf-share.js')],env=dict(os.environ,MOCK_LIST=json.dumps(LIST))); time.sleep(2.5)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1400,'height':900}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda q: q.type=='error' and 'Failed to load resource' not in q.text and errs.append(q.text)); pg.set_default_timeout(240000)
    pg.add_init_script("try{if(localStorage.getItem('onex.dv')===null){localStorage.setItem('onex.dv','false');localStorage.setItem('onex.dvMig','453')}}catch(e){}")
    pg.goto('http://localhost:8794/'); pg.wait_for_function("window.STAGE && window.FLIB && document.querySelector('#loader').style.display==='none'",timeout=240000); ev=pg.evaluate
    ev("FLIB.toggle(true)"); pg.click('[data-ltab=gdtf]'); pg.wait_for_selector('#libU'); pg.fill('#libU','ben'); pg.fill('#libP','ok'); pg.click('[data-la=login]'); pg.wait_for_selector('#libRows .librow')
    rows="[...document.querySelectorAll('#libRows .librow')].map(r=>r.querySelector('span').innerText.replace(/\\s+/g,' ').trim())"; chips="[...document.querySelectorAll('#libRows [data-lup]')].map(b=>b.innerText.trim()+(b.classList.contains('on')?' *':''))"
    c=ev(chips); r=ev(rows)
    ok(c==['Tous · 7 *','Fabricant · 3','Utilisateurs · 4'],'trois boutons de filtre avec leurs comptes, « Tous » actif',c)
    ia=[i for i,x in enumerate(r) if 'Arolla Aqua' in x]
    ok(len(r)==7 and 'Fabricant' in r[ia[0]] and 'ClayPaky FW 2_1' in r[ia[0]] and all('Utilisateurs' in r[i] for i in ia[1:]),'même appareil : la fiche du fabricant est en premier, chaque ligne dit qui l\'a déposée',r[:4])
    pg.click('#libRows [data-lup="Manuf."]'); pg.wait_for_timeout(300); c=ev(chips); r=ev(rows)
    ok(len(r)==3 and all('Fabricant' in x for x in r) and c[1].endswith('*'),'clic « Fabricant » : seules les 3 fiches de fabricants',[c,r])
    pg.click('#flibQ'); pg.keyboard.type('arolla',delay=30); pg.wait_for_timeout(400); c=ev(chips); r=ev(rows)
    ok(c==['Tous · 3','Fabricant · 1 *','Utilisateurs · 2'] and len(r)==1 and 'ClayPaky FW 2_1' in r[0],'la recherche garde le filtre, les comptes suivent la recherche',[c,r])
    ok(ev("document.activeElement&&document.activeElement.id")=='flibQ','le champ de recherche garde le curseur pendant la frappe')
    pg.click('#libRows [data-lup="User"]'); pg.wait_for_timeout(300); r=ev(rows); ok(len(r)==2 and all('Utilisateurs' in x for x in r) and 'check in' in r[0],'clic « Utilisateurs » : les 2 fiches d\'utilisateurs, la plus récente d\'abord',r)
    pg.fill('#flibQ',''); pg.keyboard.type('spiider',delay=30); pg.wait_for_timeout(400); c=ev(chips); r=ev(rows)
    ok(len(r)==1 and 'Spiider' in r[0],'filtre sans résultat pour cette recherche : il se relâche au lieu d\'afficher une liste vide',[c,r])
    pg.fill('#flibQ',''); pg.keyboard.type('clay',delay=30); pg.wait_for_timeout(300); pg.click('#libRows [data-lup="*"]'); pg.wait_for_timeout(300); ok(len(ev(rows))==5,'clic « Tous » : tout revient',ev(chips))
    pg.screenshot(path='/home/claude/shots/t152.png'); ok(not errs,'aucune erreur de console',errs[:3]); b.close()
finally:
    g.terminate(); m.terminate()
print('\nt152 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
