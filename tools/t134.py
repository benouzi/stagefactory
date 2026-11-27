# 4.55.0 — raccourcis Alt+chiffre, F9 (vue 3D seule), disposition par métier, export / import des dispositions. Vraie souris, vrai clavier, vrai téléchargement, vrai sélecteur de fichier.
import sys,os,json; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_DV']='1'; os.environ['SF_BLANK']='1'
from h import *
S='/home/claude/shots/d1-'; ok=[]
def chk(n,c,x=''): ok.append(bool(c)); print(('OK  ' if c else 'ECHEC ')+n,x)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1920,1040); ev=pg.evaluate
    pg.wait_for_function("window.PANELS && PANELS.ready",timeout=90000); pg.wait_for_timeout(2000)
    loc=lambda i: ev("(i)=>{const p=PANELS.api.getPanel(i);return p?p.group.api.location.type:null}",i)
    vis=lambda i: ev("(i)=>PANELS.has(i)&&PANELS.visible(i)",i)
    c=lambda s: ev("(s)=>{const r=document.querySelector(s).getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}",s)
    W=lambda i: ev("(i)=>Math.round(PANELS.holder(i).getBoundingClientRect().width)",i)
    pg.mouse.click(700,400)
    def alt(n,want):          # le navigateur d'essai (Chromium sous Linux, où Alt+chiffre change d'onglet) avale parfois la première frappe d'un Alt+chiffre : on la refait une fois si rien n'a bougé, et on le dit
        k={2:'insp',7:'rig'}[n]; pg.keyboard.press('Alt+%d'%n); pg.wait_for_timeout(600)
        if bool(ev("(i)=>PANELS.has(i)&&PANELS.visible(i)",k))!=want: print('   (frappe Alt+%d non reçue par la page, refaite)'%n); pg.keyboard.press('Alt+%d'%n); pg.wait_for_timeout(600)
    pg.keyboard.press('Alt'); pg.wait_for_timeout(300)          # navigateur d'essai sans fenêtre : la toute première frappe avec Alt après le chargement n'arrive pas à la page (constaté, y compris sans notre code)
    # raccourcis
    alt(7,True); chk('Alt+7 : Rigging et charges passe devant', vis('rig'))
    alt(7,False); chk('Alt+7 encore : il se ferme', loc('rig') is None)
    alt(7,True); chk('Alt+7 : il revient', vis('rig'))
    alt(2,False); chk('Alt+2 : l\'Inspecteur se ferme', loc('insp') is None)
    alt(2,True); chk('Alt+2 : l\'Inspecteur revient', loc('insp')=='grid')
    chk('aucun objet posé ni outil changé par ces touches', ev("STAGE.S.objs.length")==0)
    # F9
    ev("PANELS.float('secu',{x:300,y:200,width:500,height:300})"); pg.wait_for_timeout(600); w0=(W('v3d'),W('plan'),W('insp'))
    pg.keyboard.press('F9'); pg.wait_for_timeout(900); w1=W('v3d'); fl=ev("getComputedStyle(document.querySelector('#dvRoot .dv-resize-container')).display"); cv=ev("(()=>{const r=document.querySelector('#c').getBoundingClientRect();return Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vw')))})()")
    chk('F9 : la vue 3D prend tout l\'écran, fenêtres flottantes masquées', w1>1800 and fl=='none' and cv>1800, (w0,w1,fl,cv)); pg.wait_for_timeout(1500); pg.screenshot(path=S+'1-solo.png')
    pg.keyboard.press('F9'); pg.wait_for_timeout(900); w2=(W('v3d'),W('plan'),W('insp')); chk('F9 encore : tout revient comme avant', w2==w0 and loc('secu')=='floating', (w0,w2))
    # disposition par métier : Lumière = inspecteur fermé + Sécurité flottante
    alt(2,False)
    pg.mouse.click(*c('#dvBtn')); pg.wait_for_timeout(300); pg.screenshot(path=S+'2-menu.png'); pg.mouse.click(*c('#dvPop [data-da=domsave]')); pg.wait_for_timeout(500)
    chk('★ Retenir pour le métier Lumière', ev("!!JSON.parse(localStorage.getItem('onex.dvDom')).lum"))
    pg.mouse.click(*c('#doms [data-dom=rig]')); pg.wait_for_timeout(900); chk('passage sur Rigging (rien de retenu) : l\'écran ne bouge pas', loc('insp') is None and loc('secu')=='floating')
    alt(2,True); ev("PANELS.home(['secu'])"); pg.wait_for_timeout(700)
    pg.mouse.click(*c('#dvBtn')); pg.wait_for_timeout(300); pg.mouse.click(*c('#dvPop [data-da=domsave]')); pg.wait_for_timeout(500)
    pg.mouse.click(*c('#doms [data-dom=lum]')); pg.wait_for_timeout(1200); chk('retour sur Lumière : sa disposition revient (Inspecteur fermé, Sécurité flottante)', loc('insp') is None and loc('secu')=='floating', (loc('insp'),loc('secu')))
    pg.mouse.click(*c('#doms [data-dom=rig]')); pg.wait_for_timeout(1200); chk('retour sur Rigging : la sienne (Inspecteur ouvert, Sécurité en bas)', loc('insp')=='grid' and loc('secu')=='grid', (loc('insp'),loc('secu')))
    pg.screenshot(path=S+'3-rigging.png')
    # export / import
    ev("PANELS.save('Plan de feu')")
    pg.mouse.click(*c('#dvBtn')); pg.wait_for_timeout(300)
    with pg.expect_download() as d: pg.mouse.click(*c('#dvPop [data-da=export]'))
    f='/home/claude/scratch/dispositions.json'; d.value.save_as(f); j=json.load(open(f)); chk('export : un fichier avec la disposition nommée et celles des deux métiers', j.get('kind')=='dispositions' and 'Plan de feu' in j['nommees'] and set(j['metiers'])=={'lum','rig'}, (d.value.suggested_filename,list(j['nommees']),list(j['metiers'])))
    ev("localStorage.removeItem('onex.dvLayouts');localStorage.removeItem('onex.dvDom')")
    pg.mouse.click(*c('#dvBtn')); pg.wait_for_timeout(300)
    with pg.expect_file_chooser() as fc: pg.mouse.click(*c('#dvPop [data-da=import]'))
    fc.value.set_files(f); pg.wait_for_timeout(900)
    chk('import sur un poste vide : tout est retrouvé', ev("PANELS.layouts().includes('Plan de feu') && Object.keys(JSON.parse(localStorage.getItem('onex.dvDom'))).sort().join()==='lum,rig'"), ev("document.querySelector('#toast').textContent"))
    open('/home/claude/scratch/faux.json','w').write('{"kind":"autre"}'); pg.mouse.click(*c('#dvBtn')); pg.wait_for_timeout(300)
    with pg.expect_file_chooser() as fc: pg.mouse.click(*c('#dvPop [data-da=import]'))
    fc.value.set_files('/home/claude/scratch/faux.json'); pg.wait_for_timeout(700); chk('mauvais fichier : refusé avec un message', 'pas un export' in ev("document.querySelector('#toast').textContent"))
    # oublier la disposition d'un métier
    pg.mouse.click(*c('#dvBtn')); pg.wait_for_timeout(300); pg.mouse.click(*c('#dvPop [data-da=domdel]')); pg.wait_for_timeout(400); chk('✕ : le métier Rigging n\'a plus de disposition', ev("!JSON.parse(localStorage.getItem('onex.dvDom')).rig"))
    pg.keyboard.press('Escape'); chk('aucune erreur de script', not errs, errs[:3]); print('RESULTAT',sum(ok),'/',len(ok)); b.close()
