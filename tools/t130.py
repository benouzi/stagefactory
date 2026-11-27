# 4.53.1 — poste resté en « anciennes fenêtres » : panneaux réactivés une fois ; saisir un onglet et le lâcher sur la vue 3D = fenêtre flottante ; le re-saisir pour le ranger. Tout à la vraie souris.
import sys,os; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_DV']='1'; os.environ['SF_BLANK']='1'
# poste resté en « anciennes fenêtres » depuis la 4.51 (cas de Benjamin)
os.environ['SF_INIT']="try{if(!sessionStorage.getItem('seed')){sessionStorage.setItem('seed','1');localStorage.setItem('onex.dv','false');localStorage.removeItem('onex.dvMig')}}catch(e){}"
from h import *
S='/home/claude/shots/v3-'; ok=[]
def chk(n,c,x=''): ok.append(bool(c)); print(('OK  ' if c else 'ECHEC ')+n,x)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1920,1040); ev=pg.evaluate
    pg.wait_for_function("window.PANELS && (PANELS.ready || PANELS.on===false)",timeout=90000); pg.wait_for_timeout(2500)
    chk('poste resté en anciennes fenêtres : les panneaux sont réactivés au premier lancement', ev("PANELS.on && PANELS.ready && localStorage.getItem('onex.dv')==='true'"), ev("PANELS.why||''"))
    pg.screenshot(path=S+'1-reactive.png')
    ev("window.LOG=[];PANELS.api.onWillDrop(e=>LOG.push(['willdrop',e.kind,e.position,e.group&&e.group.id,JSON.stringify(e.getData())]));for(const t of ['dragstart','drop','dragend'])document.addEventListener(t,e=>LOG.push([t,e.target.className&&String(e.target.className).slice(0,30),e.clientX,e.clientY,e.dataTransfer&&e.dataTransfer.dropEffect]),true)")
    loc=lambda i: ev("(i)=>PANELS.api.getPanel(i).group.api.location.type",i)
    def tabc(i): return ev("(i)=>{const t=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid===i).getBoundingClientRect();return [t.left+18,t.top+t.height/2]}",i)
    v=ev("(()=>{const r=PANELS.holder('v3d').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
    # geste : saisir l'onglet Sécurité, le tirer au milieu de la vue 3D, lâcher
    x,y=tabc('secu'); tx,ty=v[0]+v[2]*0.5,v[1]+v[3]*0.45
    pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move(x+8,y-12,steps=3); pg.mouse.move(x+30,y-60,steps=4); pg.mouse.move(tx,ty,steps=14); pg.wait_for_timeout(350); pg.mouse.move(tx+2,ty+2); pg.wait_for_timeout(200)
    pg.screenshot(path=S+'2-pendant.png'); pg.mouse.up(); pg.wait_for_timeout(1000)
    r=ev("(()=>{const r=PANELS.holder('secu').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
    chk('onglet Sécurité saisi et lâché sur la vue 3D : fenêtre flottante sous la souris', loc('secu')=='floating' and r[0]<tx<r[0]+r[2] and abs(r[1]-ty)<80, (loc('secu'),r,(tx,ty)))
    chk('les autres onglets restent en bas, la vue 3D reste seule', all(loc(i)=='grid' for i in ['patch','lib','objs','rig','con','warn']) and ev("PANELS.api.getPanel('v3d').group.panels.length")==1)
    pg.screenshot(path=S+'3-lache.png')
    # geste : un deuxième (Console)
    x,y=tabc('con'); pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move(x+8,y-12,steps=3); pg.mouse.move(v[0]+200,v[1]+200,steps=14); pg.wait_for_timeout(350); pg.mouse.move(v[0]+202,v[1]+202); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(1000)
    chk('second onglet (Console) tiré : seconde fenêtre flottante', loc('con')=='floating' and ev("PANELS.api.getPanel('con').group!==PANELS.api.getPanel('secu').group"))
    ev("PANELS.home(['con'])"); pg.wait_for_timeout(700)          # la seconde fenêtre recouvrait l'onglet de la première
    # geste : re-saisir l'onglet de la fenêtre flottante et le lâcher sur la rangée d'onglets du bas -> il se range
    x,y=tabc('secu'); bx,by=tabc('rig')
    pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move(x+8,y+10,steps=3); pg.mouse.move(bx+30,by,steps=16); pg.wait_for_timeout(350); pg.mouse.move(bx+32,by+1); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(1000)
    chk('onglet flottant re-saisi et lâché sur les onglets du bas : il se range', loc('secu')=='grid' and ev("PANELS.api.getPanel('secu').group===PANELS.api.getPanel('rig').group"), loc('secu'))
    # geste : tirer un onglet sur le BORD droit de la vue 3D -> il s'aimante à côté (pas flottant)
    x,y=tabc('patch'); pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move(x+8,y-12,steps=3); pg.mouse.move(v[0]+v[2]-25,v[1]+v[3]*0.5,steps=14); pg.wait_for_timeout(350); pg.mouse.move(v[0]+v[2]-24,v[1]+v[3]*0.5+1); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(1000)
    chk('onglet lâché sur le bord droit de la vue 3D : il s\'aimante à côté', loc('patch')=='grid', loc('patch'))
    pg.screenshot(path=S+'4-fin.png')
    # anciennes fenêtres choisies APRÈS : le choix est respecté, et le message le dit
    ev("localStorage.setItem('onex.dv','false')"); pg.reload(); pg.wait_for_function("window.PANELS && PANELS.on===false",timeout=120000); pg.wait_for_timeout(2500)
    chk('anciennes fenêtres rechoisies ensuite : respecté, lien bien visible', ev("!!document.querySelector('#dvBack')"), ev("document.querySelector('#toast')&&document.querySelector('#toast').textContent"))
    pg.screenshot(path=S+'5-anciennes.png',clip={'x':900,'y':940,'width':1020,'height':100})
    chk('aucune erreur de script', not errs, errs[:4]); print('RESULTAT',sum(ok),'/',len(ok)); b.close()
