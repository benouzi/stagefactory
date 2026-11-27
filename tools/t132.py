# 4.53.2 — le bug de Benjamin (onglet du bas fermé par × : son contenu restait affiché sans cadre sur la vue 3D), tous les onglets fermés, trois fenêtres flottantes, premier plan au clic, écran réduit, Plan seul, pupitre. Vraie souris.
import sys,os; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_DV']='1'; os.environ['SF_BLANK']='1'
from h import *
S='/home/claude/shots/m2-'; ok=[]
def chk(n,c,x=''): ok.append(bool(c)); print(('OK  ' if c else 'ECHEC ')+n,x)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1920,1040); ev=pg.evaluate
    pg.wait_for_function("window.PANELS && PANELS.ready",timeout=90000); pg.wait_for_timeout(2000)
    def tabc(i): return ev("(i)=>{const t=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid===i).getBoundingClientRect();return [t.left+14,t.top+t.height/2]}",i)
    def closeb(i): return ev("(i)=>{const e=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid===i).querySelector('[data-tb=close]').getBoundingClientRect();return [e.left+e.width/2,e.top+e.height/2]}",i)
    ghost="[...document.querySelectorAll('.drp')].filter(e=>!e.closest('.dvp')&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>2).map(e=>e.dataset.dt)"
    # son cas : afficher Sécurité (le contenu se remplit), puis fermer l'onglet par sa croix
    pg.mouse.click(*tabc('secu')); pg.wait_for_timeout(600); pg.mouse.click(*closeb('secu')); pg.wait_for_timeout(800)
    chk('onglet Sécurité fermé par × : plus de contenu fantôme sur la vue 3D', ev(ghost)==[], ev(ghost)); pg.screenshot(path=S+'1-ferme.png')
    # le rouvrir par ▦
    r=ev("(()=>{const t=document.querySelector('#dvBtn').getBoundingClientRect();return [t.left+t.width/2,t.top+t.height/2]})()"); pg.mouse.click(*r); pg.wait_for_timeout(300)
    r=ev("(()=>{const t=document.querySelector('#dvPop [data-dp=secu]').getBoundingClientRect();return [t.left+40,t.top+t.height/2]})()"); pg.mouse.click(*r); pg.wait_for_timeout(700); pg.keyboard.press('Escape'); pg.mouse.click(700,300); pg.wait_for_timeout(300)
    g=ev("PANELS.api.getPanel('secu').group.panels.map(p=>p.id)"); chk('rouvert par ▦ : Sécurité revient à son rang, avec son contenu', g==['patch','lib','objs','rig','secu','con','warn'] and ev("PANELS.holder('secu').textContent.length>50"), g)
    # fermer tous les onglets du bas un par un
    for i in ['patch','lib','objs','rig','secu','con','warn']:
        pg.mouse.click(*tabc(i)); pg.wait_for_timeout(250); pg.mouse.click(*closeb(i)); pg.wait_for_timeout(450)
    v=ev("(()=>{const r=PANELS.holder('v3d').getBoundingClientRect();return [r.top,r.bottom,innerHeight]})()")
    chk('tous les onglets du bas fermés : aucun fantôme, la vue 3D prend la hauteur', ev(ghost)==[] and v[1]>v[2]-60, (ev(ghost),v)); pg.screenshot(path=S+'2-bas-ferme.png')
    ev("PANELS.reset()"); pg.wait_for_timeout(900)
    # trois fenêtres flottantes ; cliquer dans celle de derrière la fait passer devant
    v=ev("(()=>{const r=PANELS.holder('v3d').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
    for n,i in enumerate(['secu','con','rig']):
        x,y=tabc(i); pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move(x+6,y-10,steps=3); pg.mouse.move(v[0]+v[2]*(.36+n*.1),v[1]+v[3]*(.34+n*.1),steps=10); pg.wait_for_timeout(250); pg.mouse.move(v[0]+v[2]*(.36+n*.1)+1,v[1]+v[3]*(.34+n*.1)+1); pg.wait_for_timeout(150); pg.mouse.up(); pg.wait_for_timeout(800)
    fl=ev("['secu','con','rig'].map(i=>PANELS.api.getPanel(i).group.api.location.type)"); chk('trois onglets tirés un à un : trois fenêtres flottantes', fl==['floating']*3, fl)
    pg.screenshot(path=S+'3-trois.png')
    r=ev("(()=>{const r=PANELS.holder('secu').getBoundingClientRect();return [r.left+12,r.top+r.height-12]})()"); 
    top=lambda x,y: ev("([x,y])=>{const e=document.elementFromPoint(x,y);const h=e&&e.closest('.dvp');return h?h.dataset.p:(e&&e.closest('.dv-resize-container')?'cadre':null)}",[x,y])
    pg.mouse.click(*r); pg.wait_for_timeout(500); q=ev("(()=>{const r=PANELS.holder('secu').getBoundingClientRect();return [r.left+r.width-30,r.top+60]})()")
    chk('clic dans la fenêtre de derrière : elle passe devant', top(*q)=='secu', top(*q)); pg.screenshot(path=S+'4-devant.png')
    # fenêtre réduite : les fenêtres flottantes restent atteignables
    pg.set_viewport_size({'width':1366,'height':768}); pg.wait_for_timeout(1200)
    out=ev("['secu','con','rig'].map(i=>{const r=PANELS.api.getPanel(i).group.element.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),r.left<innerWidth-60&&r.top<innerHeight-60&&r.top>=40]})"); chk('fenêtre du logiciel réduite à 1366 px : les trois flottantes restent atteignables', all(o[2] for o in out), out); pg.screenshot(path=S+'5-1366.png')
    # Plan seul puis retour, avec des fenêtres flottantes
    ev("DOCK.view('plan')"); pg.wait_for_timeout(900); pg.screenshot(path=S+'6-plan-seul.png'); ev("DOCK.view('split')"); pg.wait_for_timeout(900)
    chk('Plan seul puis 3D + Plan : la vue 3D retrouve sa place', ev("PANELS.holder('v3d').getBoundingClientRect().width")>200)
    # pupitre
    ev("document.querySelector('#deskBtn')&&document.querySelector('#deskBtn').click()"); pg.wait_for_timeout(1200); pg.screenshot(path=S+'7-pupitre.png')
    chk('aucune erreur de script', not errs, errs[:3]); print('RESULTAT',sum(ok),'/',len(ok)); b.close()
