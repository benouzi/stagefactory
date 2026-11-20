# Pilotage DMX de bout en bout sur la version installée : une vraie trame Art-Net traverse la passerelle et fait répondre
# un projecteur sur gradateur et un automatique dont l'ordre des canaux a été décrit. Un appareil sans DMX est refusé, puis signalé, puis décrit à la main.
import subprocess,time,os,json,shutil
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/appdata61',ignore_errors=True)
env=dict(os.environ,APPDATA='/tmp/appdata61',PORT='8796',SACN_PORT='15573'); D='/home/claude/local/dist/StageFactory'
g=subprocess.Popen(['node',D+'/serveur.js','--no-open'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT); time.sleep(2); bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:330],flush=True)
    if not c: bad.append(m)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(viewport={'width':1300,'height':820}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.set_default_timeout(180000); pg.goto('http://localhost:8796/?demo')
    pg.wait_for_function("window.STAGE && window.AI && window.VENUE && window.PARC && PARC.ready && window.DMX && document.querySelector('#loader').style.display==='none'"); ev=pg.evaluate
    ev("APP.renderer.setAnimationLoop(null)"); hide=pg.add_style_tag(content='#modal{display:none!important}')
    T=lambda n,a={}: json.loads(ev("async(a)=>(await VENUE.tool(a[0],a[1])).content[0].text",[n,a]))
    pg.wait_for_function("DMX.D.state==='ok'"); ok(True,'passerelle DMX connectée')
    T('creer_salle',{'nom':'Salle DMX','confirme':True}); T('poser_perche',{'nom':'P1','y':2,'longueurM':9,'hauteurM':4.3,'structure':'pont','moteurs':2})
    r=T('creer_type',{'nom':'Auto sans notice','categorie':'lum','forme':'lyre_wash','canaux':16}); ok('erreur' in r and 'titan_search' in r['erreur'] and 'modesDmx' in r['erreur'],'un automatique sans ordre de canaux est refusé',r['erreur'][:110])
    par=T('creer_type',{'nom':'PAR 64 1000 W','categorie':'lum','forme':'par','canaux':1,'source':'halogene'})['type']
    r=T('creer_type',{'nom':'Wash d\'essai','categorie':'lum','forme':'lyre_wash','modesDmx':[{'nom':'Standard','canaux':['pan','pan_fin','tilt','tilt_fin','dimmer','strobe','rouge','vert','bleu','blanc','zoom','autre']},{'nom':'Réduit','canaux':['dimmer','rouge','vert','bleu']}]}); wash=r['type']; ok(r['modes']==['Standard (12 can.)','Réduit (4 can.)'] and r['dmx']=='ordre des canaux connu','automatique créé avec ses deux modes',r['modes'])
    r=T('creer_type',{'nom':'Auto implantation','categorie':'lum','forme':'lyre_beam','canaux':18,'sansDmx':True}); nod=r['type']
    r=T('ecrire_parc',{'lignes':[{'libelle':'PAR','quantite':4,'categorie':'lum','type':par},{'libelle':'Wash','quantite':2,'categorie':'lum','type':wash},{'libelle':'Auto','quantite':1,'categorie':'lum','type':nod}]}); ok(r.get('nonPilotables')==['Auto implantation'],'le parc signale ce qui n\'est pas pilotable',r.get('nonPilotables'))
    ev("AI.run('add_objects',{items:[{type:arg[0],perche:1,x:-3},{type:arg[0],perche:1,x:-2},{type:arg[1],perche:1,x:0},{type:arg[2],perche:1,x:3}]})".replace('arg[0]',json.dumps(par)).replace('arg[1]',json.dumps(wash)).replace('arg[2]',json.dumps(nod)))
    ev("AI.run('patch_objects',{select:{type:%s},universe:1,start:1});AI.run('patch_objects',{select:{type:%s},universe:1,start:101});AI.run('patch_objects',{select:{type:%s},universe:1,start:201})"%(json.dumps(par),json.dumps(wash),json.dumps(nod)))
    v=T('verifier_dmx',{'detail':True}); ok(v['projecteurs']==4 and v['pilotables']==3 and len(v['problemes'])==1 and 'NON PILOTABLE' in v['problemes'][0] and 'passerelle DMX connectée' in v['reception'],'verifier_dmx : 3 pilotables sur 4, le fautif nommé',v['problemes'])
    ok(any('1.101' in l and 'Standard (12 can.)' in l for l in v['patch']) and any('pan, pan_fin, tilt, tilt_fin, dimmer' in m for t in v['types'] for m in t['modes']),'patch et ordre des canaux rendus pour la console',[l for l in v['patch'] if '1.101' in l])
    # ---- une vraie trame Art-Net (univers 0 de la console = univers 1 ici)
    vals={1:255,2:64,101:128,102:0,103:64,104:0,105:204,106:0,107:255,108:0,109:0,110:0,111:255}
    subprocess.run(['node','/home/claude/tools/send_dmx.js','artnet','0',json.dumps({str(k):x for k,x in vals.items()})],check=True); pg.wait_for_function("DMX.U.has(1) && DMX.U.get(1)[0]===255",timeout=15000)
    R=ev("""(()=>{const T=APP.THREE,out={};for(const o of STAGE.S.objs){const t=STAGE.typeOf(o);if(t.cat!=='lum')continue;const c=new T.Color(1,1,1),r=DMX.read(o,t,c);out[o.addr]=r?{dim:+r.dim.toFixed(3),pan:r.pan===undefined?null:+r.pan.toFixed(1),tilt:r.tilt===undefined?null:+r.tilt.toFixed(1),zoom:r.zoom===undefined?null:+r.zoom.toFixed(1),col:'#'+c.getHexString()}:null}return out})()""")
    ok(R['1']['dim']>.99 and abs(R['2']['dim']-64/255)<.01,'gradateurs : PAR 1 à plein, PAR 2 à 25 %',[R['1'],R['2']])
    ok(R['101'] and abs(R['101']['dim']-.8)<.01 and R['101']['col']=='#ff0000' and R['101']['pan'] is not None and abs(R['101']['pan'])<2 and R['101']['tilt']<0 and R['101']['zoom']>40,'automatique : dimmer 80 %, rouge, pan au centre, tilt, zoom ouvert',R['101'])
    ok(R['201'] is None,'l\'appareil sans ordre de canaux ne répond pas',R['201'])
    v=T('verifier_dmx'); ok('univers 1 : reçu de la console' in v['univers'],'univers reçu de la console',v['univers'])
    # ---- décrire le DMX à la main dans la fenêtre du parc
    ev("document.querySelector('#modal').style.display='none'"); pg.evaluate("h=>h.remove()",hide); ev("PARC.open(true)"); pg.wait_for_selector('#parcWin [data-dx]'); txt=pg.inner_text('#parcWin'); ok('✗ à décrire' in txt and '✓ 12 can.' in txt and '✓ 1 can.' in txt,'fenêtre du parc : colonne DMX',[l for l in txt.split('\n') if '✗' in l or '✓' in l][:3])
    pg.click('#parcWin [data-dx="%s"]'%nod); pg.wait_for_selector('#dxTxt'); pg.fill('#dxTxt','Standard : pan, pan fin, tilt, tilt fin, autre, dimmer, shutter, cyan, magenta, jaune, autre, autre, zoom, autre, autre, autre, autre, autre'); pg.click('#dxOk'); pg.wait_for_timeout(300)
    t=ev("STAGE.S.lib.find(t=>t.id===%s)"%json.dumps(nod)); ok(t['modes']==[['Standard',18]] and t['chs'][0][:8]==['pan','panF','tilt','tiltF','-','dim','shutter','c'] and not t.get('noDmx'),'ordre des canaux décrit à la main',t['chs'][0][:8])
    v=T('verifier_dmx'); ok(v['pilotables']==4 and v['verdict']=='tous les projecteurs posés sont pilotables','après description : tout est pilotable',v['verdict'])
    subprocess.run(['node','/home/claude/tools/send_dmx.js','artnet','0',json.dumps({'206':255,'208':255,'209':0,'210':0})],check=True); pg.wait_for_function("DMX.U.get(1)[205]===255",timeout=15000)
    r=ev("(()=>{const o=STAGE.S.objs.find(o=>o.addr===201),c=new APP.THREE.Color(1,1,1),r=DMX.read(o,STAGE.typeOf(o),c);return [r.dim,'#'+c.getHexString()]})()"); ok(r[0]>.99 and r[1]=='#00ffff','et il répond : plein feu, cyan',r)
    ok(not errs,'aucune erreur',errs[:3]); b.close()
finally: g.kill()
print('ÉCHECS :',bad or 'aucun')
