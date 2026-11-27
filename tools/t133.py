# 4.54.0 — les sept anciennes fenêtres d'outils (Pupitre, Assistant, Musique, Mur LED, Bibliothèques Titan/GDTF, Aide de navigation, Position) sont des panneaux : ouverture par leur bouton ou leur menu, onglet tiré sur l'Inspecteur, place retenue, fermeture, disposition d'origine. Vraie souris.
import sys,os; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_DV']='1'; os.environ['SF_BLANK']='1'
from h import *
S='/home/claude/shots/w3-'; ok=[]
def chk(n,c,x=''): ok.append(bool(c)); print(('OK  ' if c else 'ECHEC ')+n,x)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1920,1040); ev=pg.evaluate
    pg.wait_for_function("window.PANELS && PANELS.ready",timeout=90000); pg.wait_for_timeout(2000)
    loc=lambda i: ev("(i)=>{const p=PANELS.api.getPanel(i);return p?p.group.api.location.type:null}",i)
    rect=lambda i: ev("(i)=>{const r=PANELS.holder(i).getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(Math.round)}",i)
    def tabc(i): return ev("(i)=>{const t=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid===i).getBoundingClientRect();return [t.left+14,t.top+t.height/2]}",i)
    def closeb(i): return ev("(i)=>{const e=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid===i).querySelector('[data-tb=close]').getBoundingClientRect();return [e.left+e.width/2,e.top+e.height/2]}",i)
    def menu(m,txt):
        pg.locator('#top >> text='+m).first.click(); pg.wait_for_timeout(250); pg.locator('#menuPop >> text='+txt).first.click(); pg.wait_for_timeout(900)
    def center(sel): return ev("(s)=>{const r=document.querySelector(s).getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}",sel)
    stray="['#desk','#aiPanel','#audPanel','#ledPanel','#libPanel','#hud','#help'].filter(s=>{const e=document.querySelector(s);if(!e||e.closest('.dvp'))return false;const cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&e.getBoundingClientRect().height>2})"
    chk('au départ : aucune fenêtre d\'outil ouverte ni visible', all(loc(i) is None for i in ['desk','ai','aud','led','flib','help','hud']) and ev(stray)==[], ev(stray))
    # 1. Pupitre par son bouton
    pg.mouse.click(*center('#deskBtn')); pg.wait_for_timeout(1500)
    g=ev("PANELS.api.getPanel('desk')&&PANELS.api.getPanel('desk').group.panels.map(p=>p.id)"); r=rect('desk'); v=rect('v3d')
    chk('bouton Pupitre : un onglet de plus en bas, affiché, vue 3D toujours grande', g and 'patch' in g and g[-1]=='desk' and r[3]>=310 and v[3]>300 and not ev("document.body.classList.contains('desk')"), (g,r,v))
    chk('pupitre : sa ligne de commande et ses boutons sont dans le panneau', ev("(()=>{const h=PANELS.holder('desk').getBoundingClientRect();const c=document.querySelector('#desk [data-dk=all]').getBoundingClientRect();return c.top>h.top&&c.bottom<h.bottom})()"))
    pg.wait_for_timeout(3500); pg.screenshot(path=S+'1-pupitre.png')
    pg.mouse.click(*center('#desk [data-dk=all]')); pg.wait_for_timeout(300)
    pg.mouse.click(*center('#deskBtn')); pg.wait_for_timeout(900); chk('bouton Pupitre à nouveau : l\'onglet se ferme', loc('desk') is None and not ev("DESK.isOpen()"))
    # 2. Assistant par le menu Outils
    menu('Outils','Assistant'); r=rect('ai'); chk('menu Outils → Assistant : fenêtre flottante avec onglet', loc('ai')=='floating' and r[2]>350 and r[3]>300, r)
    pg.mouse.click(*center('#aiTxt')); pg.keyboard.type('bonjour gr'); chk('on tape dans l\'Assistant sans déclencher de raccourci', ev("document.querySelector('#aiTxt').value")=='bonjour gr' and ev("STAGE.S.objs.length")==0)
    ev("document.querySelector('#aiTxt').value=''")
    # 3. le tirer par son onglet sur les onglets de l'Inspecteur
    x,y=tabc('ai'); tx,ty=tabc('insp'); pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move(x+6,y+8,steps=3); pg.mouse.move(tx+40,ty,steps=12); pg.wait_for_timeout(300); pg.mouse.move(tx+41,ty+1); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(900)
    chk('onglet Assistant tiré sur l\'Inspecteur : il s\'y range en onglet', loc('ai')=='grid' and ev("PANELS.api.getPanel('ai').group===PANELS.api.getPanel('insp').group"))
    pg.screenshot(path=S+'2-assistant-range.png')
    pg.mouse.click(*closeb('ai')); pg.wait_for_timeout(700); chk('× sur l\'onglet Assistant : fermé pour de bon', loc('ai') is None and not ev("AI.isOpen()") and ev(stray)==[], ev(stray))
    menu('Outils','Assistant'); chk('rouvert : il revient en onglet avec l\'Inspecteur', loc('ai')=='grid' and ev("PANELS.api.getPanel('ai').group===PANELS.api.getPanel('insp').group"))
    pg.mouse.click(*closeb('ai')); pg.wait_for_timeout(500)
    # 4. Musique : déplacer la fenêtre, fermer, rouvrir -> même place
    menu('Outils','Musique'); r0=rect('aud'); x,y=tabc('aud'); 
    hd=ev("(()=>{const r=PANELS.api.getPanel('aud').group.element.querySelector('.dv-tabs-and-actions-container').getBoundingClientRect();return [r.left+r.width*.6,r.top+r.height/2]})()")
    pg.mouse.move(*hd); pg.mouse.down(); 
    for k in range(1,8): pg.mouse.move(hd[0]+k*25,hd[1]-k*20); pg.wait_for_timeout(30)
    pg.mouse.up(); pg.wait_for_timeout(700); r1=rect('aud'); chk('Musique : la fenêtre se déplace', r1[0]>r0[0]+120 and r1[1]<r0[1]-90,(r0,r1))
    pg.mouse.click(*closeb('aud')); pg.wait_for_timeout(600); menu('Outils','Musique'); r2=rect('aud'); chk('Musique fermée puis rouverte : même place', abs(r2[0]-r1[0])<6 and abs(r2[1]-r1[1])<6,(r1,r2))
    # 5. Mur LED, Bibliothèques, Aide (?), Position (▦)
    menu('Outils','Mur LED'); chk('menu Outils → Mur LED', loc('led')=='floating')
    menu('Outils','Biblioth'); chk('menu Outils → Bibliothèques Titan / GDTF', loc('flib')=='floating', loc('flib'))
    pg.mouse.click(*center('#helpBtn')); pg.wait_for_timeout(800); chk('bouton ? : l\'aide de navigation s\'affiche (elle restait invisible quand l\'Inspecteur était ouvert)', loc('help')=='floating' and ev("getComputedStyle(document.querySelector('#help')).display")=='block')
    pg.mouse.click(*center('#dvBtn')); pg.wait_for_timeout(300); pg.mouse.click(*center('#dvPop [data-dp=hud]')); pg.wait_for_timeout(800); pg.keyboard.press('Escape'); pg.mouse.click(*center('#dvBtn')); pg.wait_for_timeout(200)
    chk('▦ → Position', loc('hud')=='floating')
    pg.screenshot(path=S+'3-tout.png')
    chk('rien d\'affiché hors d\'un panneau', ev(stray)==[], ev(stray))
    # 6. disposition d'origine : tout est refermé
    ev("PANELS.reset()"); pg.wait_for_timeout(1200); chk('disposition d\'origine : les fenêtres d\'outils sont fermées', all(loc(i) is None for i in ['desk','ai','aud','led','flib','help','hud']) and ev(stray)==[] and not ev("AUDIO.isOpen()||STAGE.LED.isOpen()||FLIB.isOpen()"))
    chk('aucune erreur de script', not errs, errs[:3]); print('RESULTAT',sum(ok),'/',len(ok)); b.close()
