# NDI : récepteur natif du serveur local (ici contre une fausse bibliothèque NDI aux mêmes structures), source choisie dans la page, projetée
import sys,os,subprocess,time,json,urllib.request; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'; os.environ['SF_API']='http://127.0.0.1:18765'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:600],flush=True)
    if not c: bad.append(m)
env=dict(os.environ,PORT='18765',NODE_PATH='/home/claude/pack/koffi-src/node_modules',SF_NDI_LIB='/tmp/fakendi/libndi.so',ARTNET_PORT='16454',SACN_PORT='15568')
srv=subprocess.Popen(['node','/home/claude/local/serveur.js','--no-open'],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
try:
    for _ in range(40):
        try: s=json.load(urllib.request.urlopen('http://127.0.0.1:18765/api/ndi/status',timeout=1)); break
        except Exception: time.sleep(.25)
    ok(s['ok'] and s['lib'].endswith('libndi.so'),'le serveur local charge la bibliothèque NDI et le dit',s)
    L=json.load(urllib.request.urlopen('http://127.0.0.1:18765/api/ndi/sources?wait=800')); ok(L['sources']==['REGIE (Media Server 1)','PORTABLE (Écran 2)'],'il liste les sources du réseau, accents compris',L)
    r=urllib.request.urlopen('http://127.0.0.1:18765/api/ndi/frame?src='+urllib.request.quote('REGIE (Media Server 1)')+'&after=0&w=1280'); b_=r.read(); ok(r.status==200 and r.headers['X-W']=='960' and r.headers['X-H']=='540' and len(b_)==960*540*4 and r.headers['X-Src-W']=='1920','une image demandée en 1280 de large : la source 1920 × 1080 est réduite d\'un pas entier (960 × 540), RGBA brut',[r.headers['X-W'],r.headers['X-H'],len(b_)])
    with sync_playwright() as p:
        b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
        pg.wait_for_function("window.STAGE && window.DOCK && window.VIDEO",timeout=60000); pg.wait_for_timeout(1500)
        v=ev("""(()=>{const T=APP.THREE,at=(x,y,z)=>({point:new T.Vector3(x,y,z),object:{userData:{}},face:null});const s=STAGE.place('ecran',at(0,0,-3),true,{});s.pos=[0,1,-3];const v=STAGE.place('vp12',at(0,0,6),true,{});v.pos=[0,1.5,6];v.hang=null;
          for(const o of [s,v]){STAGE.unbuild(o.id);STAGE.build(o)}STAGE.setLive(true);STAGE.touch();STAGE.tick(0);STAGE.select([v.id]);VIDEO.aim(v,VIDEO.scrOf(v),'tilt');STAGE.UI.tab='prop';STAGE.render();return v.id})()"""); pg.wait_for_timeout(400)
        pg.select_option('#console [data-k=content]','ndi'); pg.wait_for_selector('#modal [data-vndi]:not([data-vndi=""])',timeout=20000); names=ev("[...document.querySelectorAll('#modal [data-vndi]:not([data-vndi=\"\"])')].map(b=>b.textContent)")
        ok(names==['REGIE (Media Server 1)','PORTABLE (Écran 2)'],'contenu « NDI (réseau) » : la fenêtre liste les sources NDI',names)
        pg.click('#modal [data-vndi="REGIE (Media Server 1)"]'); pg.wait_for_timeout(2500)
        M="(id)=>{const md=STAGE.MEDIA.get(id);return md&&{live:md.live,label:md.label,w:md.el.width,h:md.el.height,sig:md.st.sig,seq:md.st.seq,info:md.st.info,err:md.st.err,src:STAGE.byId(id).srcLabel}}"
        m=ev(M,v); ok(m and m['live']=='ndi' and m['sig'] and m['w']==960 and m['info']['w']==1920 and m['seq']>5 and m['src']=='REGIE (Media Server 1)','la source choisie arrive dans le projecteur : images reçues en continu, définition de la source connue',m)
        ev("(()=>{STAGE.select([]);APP.camera.position.set(0,2.7,5);APP.orbit.target.set(0,2.7,-3);APP.orbit.update()})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t112-a.png',clip={'x':60,'y':45,'width':485,'height':515}); pg.wait_for_timeout(700); pg.screenshot(path=OUT+'/t112-b.png',clip={'x':60,'y':45,'width':485,'height':515})
        A_=Image.open(OUT+'/t112-a.png').convert('RGB'); B_=Image.open(OUT+'/t112-b.png').convert('RGB'); px=list(A_.getdata()); sat=sum(1 for q in px if max(q)-min(q)>120); df=sum(abs(x[0]-y[0])+abs(x[1]-y[1]) for x,y in zip(px,B_.getdata()))/(485*515)
        ok(sat>8000 and df>3,'à l\'écran : les barres de couleur de la source NDI sont projetées et défilent',[sat,round(df,1)])
        ev("(id)=>{STAGE.select([id]);STAGE.render()}",v); pg.wait_for_timeout(400); tx=ev("document.querySelector('#console').innerText").replace('\n',' '); ok('REGIE (Media Server 1) · 1920 × 1080' in tx and 'i/s' in tx,'la fiche montre la source, sa définition et sa cadence',tx[tx.find('Source NDI'):][:110])
        pg.select_option('#console [data-vpnq]','640'); pg.wait_for_timeout(1800); m=ev(M,v); ok(m['w']==640 and m['info']['w']==640,'définition « Aperçu NDI » : le flux léger de l\'émetteur est demandé (640 × 360)',[m['w'],m['info']])
        pg.select_option('#console [data-vpnq]','0'); pg.wait_for_timeout(2200); m=ev(M,v); ok(m['w']==1920 and m['h']==1080,'« Celle de la source » : 1920 × 1080 sans réduction',[m['w'],m['h']])
        # source qui se tait : pas de signal après 3 s
        ev("(id)=>VIDEO.ndiOpen(STAGE.byId(id),'PORTABLE (Écran 2)')",v); pg.wait_for_timeout(1500); m1=ev(M,v); pg.wait_for_timeout(4500); m2=ev(M,v); ev("STAGE.render()"); tx=ev("document.querySelector('#console').innerText")
        ok(m1['sig'] and not m2['sig'] and m2['w']==1280 and 'pas de signal' in tx,'une source qui cesse d\'émettre : « Pas de signal » sur l\'image et dans la fiche au bout de 3 s, pas une image figée',[m1['sig'],m2['sig']])
        # réouverture du projet
        ev("(id)=>VIDEO.ndiOpen(STAGE.byId(id),'REGIE (Media Server 1)')",v); pg.wait_for_timeout(800); s_=ev("STAGE.serialize()"); ev("(s)=>{STAGE.loadShow(JSON.parse(s));STAGE.tick(0)}",s_); pg.wait_for_timeout(6500)
        m3=ev("()=>{const o=STAGE.S.objs.find(o=>o.content==='ndi'),md=o&&STAGE.MEDIA.get(o.id);return md&&{sig:md.st.sig,label:md.label,ndiW:o.ndiW}}"); ok(m3 and m3['sig'] and m3['label']=='REGIE (Media Server 1)' and m3['ndiW']==0,'projet rouvert : la source NDI est reprise toute seule, avec sa définition',m3)
        e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
        b.close()
    time.sleep(7.5); s=json.load(urllib.request.urlopen('http://127.0.0.1:18765/api/ndi/status')); ok(len(s['receivers'])==0,'page fermée : le serveur referme ses récepteurs NDI au bout de quelques secondes',s['receivers'])
finally:
    srv.terminate()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
