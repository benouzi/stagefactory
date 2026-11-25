# optiques : tout projecteur du catalogue a un choix d'optique (liste relevée, nominale, ou saisie) ; source en direct (caméra / NDI en webcam)
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'; os.environ['SF_BASE']='https://app/'; os.environ['SF_ARGS']='--use-fake-device-for-media-stream --use-fake-ui-for-media-stream'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:600],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.VIDEO",timeout=60000); pg.wait_for_timeout(1500)
    st=ev("(()=>{const V=STAGE.LIBALL().filter(t=>t.cat==='vid'&&t.catalog);return {n:V.length,withL:V.filter(t=>t.lenses).length,barco:V.filter(t=>t.brand==='Barco').map(t=>[t.name,t.lenses?t.lenses.length:0,!!t.lensNominal])}})()")
    ok(st['n']>=90 and all(x[1]>=8 for x in st['barco']) and len(st['barco'])>=14,'tous les Barco du catalogue ont maintenant leur liste d\'optiques',st['barco'])
    P="(tid)=>{const T=APP.THREE,v=STAGE.place(tid,{point:new T.Vector3(0,0,6),object:{userData:{}},face:null},true,{});STAGE.touch();STAGE.tick(0);STAGE.select([v.id]);STAGE.UI.tab='prop';STAGE.render();return v.id}"
    F="()=>{const q=s=>document.querySelector('#console '+s);return {lens:q('[data-k=lens]')?[...q('[data-k=lens]').options].map(o=>o.textContent):null,val:q('[data-k=lens]')?.value,th:q('[data-k=throw]')?[+q('[data-k=throw]').min,+q('[data-k=throw]').max]:null,lcA:q('[data-k=lcA]')?.value,txt:document.querySelector('#console').innerText.replace(/\\n/g,' ')}}"
    G="(id)=>{STAGE.tick(0);const o=STAGE.byId(id),t=STAGE.typeOf(o);return {lens:o.lens,th:o.throw,TR:STAGE.vpThrow(o,t),SH:STAGE.vpShift(o,t),gth:STAGE.RT.get(id).geom.th,lcA:o.lcA,lcB:o.lcB}}"
    # Barco G62 : liste nominale
    a=ev(P,'c-barco-g62-w11'); pg.wait_for_timeout(400); f=ev(F); g=ev(G,a)
    ok(f['lens'] and len(f['lens'])==9 and f['lens'][-1].startswith('Saisir') and '1,22–1,53:1' in f['lens'] and g['TR']==[1.22,1.53] and g['SH'] is None and 'rapport nominal' in f['txt'],'Barco G62-W11 : 8 optiques de sa fiche à choisir (rapports nominaux, décalage annoncé non relevé), plus « Saisir une optique… »',[f['lens'],g['TR']])
    pg.select_option('#console [data-k=lens]','n-2.9-5.5'); pg.wait_for_timeout(500); g=ev(G,a); f=ev(F); ok(g['TR']==[2.9,5.5] and g['gth']==2.9 and f['th']==[2.9,5.5],'choisir la 2,90–5,50 : le zoom du projecteur passe dans cette plage',[g['TR'],g['gth']])
    # UDM-4K22 : tableau TLD+, décalage du manuel UDM
    u=ev(P,'c-barco-udm-4k22'); pg.wait_for_timeout(400); g=ev(G,u); f=ev(F); ok(len(f['lens'])==10 and g['TR']==[1.25,1.6] and g['SH']['v']==[-50,65],'Barco UDM-4K22 : les 9 TLD+ avec leurs rapports en 4K, décalage du manuel UDM',[len(f['lens']),g['TR'],g['SH']])
    # saisir une optique : sur un appareil du catalogue, et sur un projecteur générique
    pg.select_option('#console [data-k=lens]','__c'); pg.wait_for_timeout(500); f=ev(F); g=ev(G,u); ok(f['val']=='__c' and f['lcA']=='1.25' and g['lens']=='__c' and g['TR']==[1.25,1.6] and g['SH'] is None,'« Saisir une optique… » : deux champs apparaissent, partant du rapport en cours ; le décalage n\'est plus limité (inconnu)',[f['lcA'],g['TR']])
    pg.fill('#console [data-k=lcA]','0.9'); pg.dispatch_event('#console [data-k=lcA]','input'); pg.fill('#console [data-k=lcB]','1.1'); pg.dispatch_event('#console [data-k=lcB]','input'); pg.wait_for_timeout(500); g=ev(G,u)
    ok(g['TR']==[.9,1.1] and .9<=g['gth']<=1.1,'rapport saisi 0,9 à 1,1 : le projecteur s\'y tient',[g['TR'],g['gth']])
    v=ev(P,'vp12'); pg.wait_for_timeout(400); f=ev(F); ok(f['lens'] and len(f['lens'])==2 and 'Générique' in f['lens'][0] and f['lens'][1].startswith('Saisir'),'projecteur générique : son optique est dite « générique », et on peut saisir la sienne',f['lens'])
    pg.select_option('#console [data-k=lens]','__c'); pg.wait_for_timeout(400); pg.fill('#console [data-k=lcA]','3'); pg.dispatch_event('#console [data-k=lcA]','input'); pg.fill('#console [data-k=lcB]','3'); pg.dispatch_event('#console [data-k=lcB]','input'); pg.wait_for_timeout(400); g=ev(G,v); ok(g['TR']==[3,3] and g['gth']==3,'optique fixe saisie (3 à 3) sur le générique : rapport 3:1',g['TR'])
    js=ev("JSON.parse(STAGE.serialize()).objs.filter(o=>o.lens==='__c').map(o=>[o.lcA,o.lcB])"); ok(js==[[.9,1.1],[3,3]],'les optiques saisies sont enregistrées dans le projet',js)
    # source en direct : caméra (ici la caméra factice du navigateur, comme le serait « NDI Webcam Input »)
    ev("""(()=>{const T=APP.THREE,s=STAGE.place('ecran',{point:new T.Vector3(0,0,-3),object:{userData:{}},face:null},true,{});s.pos=[0,1,-3];STAGE.unbuild(s.id);STAGE.build(s);STAGE.setLive(true);STAGE.touch()})()""")
    ev("(id)=>{const o=STAGE.byId(id);delete o.lens;o.pos=[0,1.5,6];STAGE.select([]);STAGE.unbuild(id);STAGE.build(o);STAGE.touch();STAGE.tick(0);STAGE.select([id]);VIDEO.aim(o,VIDEO.scrOf(o),'tilt');STAGE.render()}",v); pg.wait_for_timeout(400)
    pg.select_option('#console [data-k=content]','cam'); pg.wait_for_selector('#modal [data-vcam]',timeout=20000); mt=ev("document.querySelector('#modal').innerText").replace('\n',' '); nb=ev("document.querySelectorAll('#modal [data-vcam]:not([data-vcam=\"\"])').length")
    ok('NDI Webcam Input' in mt and nb>=1,'« Source en direct » : la liste des caméras de l\'ordinateur s\'ouvre, avec la marche à suivre pour le NDI',[nb,mt[:150]])
    pg.click('#modal [data-vcam]:not([data-vcam=""])'); pg.wait_for_timeout(2500)
    m=ev("(id)=>{const md=STAGE.MEDIA.get(id);return md&&{live:md.live,label:md.label,w:md.el.videoWidth,h:md.el.videoHeight,paused:md.el.paused,src:STAGE.byId(id).srcLabel}}",v); ok(m and m['live']=='cam' and m['w']>0 and not m['paused'] and m['src']==m['label'],'la caméra choisie devient le contenu du projecteur (image reçue, en lecture)',m)
    # l'image projetée bouge (la caméra factice anime son image)
    ev("(()=>{STAGE.select([]);APP.camera.position.set(0,2.7,5);APP.orbit.target.set(0,2.7,-3);APP.orbit.update()})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t111-a.png',clip={'x':60,'y':45,'width':485,'height':515}); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t111-b.png',clip={'x':60,'y':45,'width':485,'height':515})
    A_=Image.open(OUT+'/t111-a.png').convert('L'); B_=Image.open(OUT+'/t111-b.png').convert('L'); df=sum(abs(x-y) for x,y in zip(A_.getdata(),B_.getdata()))/(485*515); mx=max(A_.getdata())
    ok(mx>80 and df>.15,'à l\'écran : l\'image de la caméra est projetée et elle bouge d\'une capture à l\'autre',[mx,round(df,2)])
    ev("(id)=>{STAGE.select([id]);STAGE.render()}",v); pg.wait_for_timeout(300); tx=ev("document.querySelector('#console').innerText").replace('\n',' '); ok(m['label'][:12] in tx and 'Changer' in tx,'la fiche montre la source reçue et sa définition',tx[tx.find('Source'):][:90])
    # coupure du signal
    ev("(id)=>{STAGE.MEDIA.get(id).stream.getTracks().forEach(t=>{t.stop();t.dispatchEvent(new Event('ended'))});return [!STAGE.MEDIA.get(id),document.querySelector('#toast').innerText]}",v); r0=ev("(id)=>{STAGE.render();return [!STAGE.MEDIA.get(id),document.querySelector('#console').innerText.includes('pas de signal'),document.querySelector('#toast').innerText]}",v); print('   ',r0); ok(r0[0] and r0[1] and 'perdue' in r0[2],'source coupée : « pas de signal » dans la fiche (et sur l\'image), pas une image figée')
    # réouverture du projet : la caméra est retrouvée par son nom
    s=ev("STAGE.serialize()"); ev("(s)=>{STAGE.loadShow(JSON.parse(s));STAGE.tick(0)}",s); pg.wait_for_timeout(6500); m2=ev("()=>{const o=STAGE.S.objs.find(o=>o.content==='cam'),md=o&&STAGE.MEDIA.get(o.id);return md&&{live:md.live,w:md.el.videoWidth}}")
    ok(m2 and m2['live']=='cam' and m2['w']>0,'projet rouvert : la source est retrouvée toute seule par son nom',m2)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
