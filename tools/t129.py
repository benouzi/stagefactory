# 4.53.0 — panneaux : défauts vus sur capture (en-tête du plan, Inspecteur en double, fenêtre flottante, ligne d'aide de l'outil, menu d'onglet en français, nom de disposition). Tout à la vraie souris. Usage : python3 tools/t129.py [largeur, 1920 par défaut ; 1366 aussi]
import sys,os,json; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_DV']='1'; os.environ['SF_BLANK']='1'
from h import *
W=int(sys.argv[1]) if len(sys.argv)>1 else 1920; H=1040 if W>1500 else 768
S='/home/claude/shots/v1-%d-'%W; ok=[]; 
def chk(n,c,x=''): ok.append(bool(c)); print(('OK  ' if c else 'ECHEC ')+n,x)
with sync_playwright() as p:
    b,pg,errs=open_app(p,W,H); ev=pg.evaluate
    pg.wait_for_function("window.PANELS && PANELS.ready",timeout=60000); pg.wait_for_timeout(2500)
    if not ev("PANELS.has('plan')"): ev("PLAN.toggle(true)"); pg.wait_for_timeout(800)
    pg.screenshot(path=S+'1-depart.png')
    ph=ev("(()=>{const ph=document.querySelector('#planWin .ph'),r=ph.getBoundingClientRect();return {sw:ph.scrollWidth,cw:ph.clientWidth,h:r.height,out:[...ph.children].filter(c=>getComputedStyle(c).display!=='none'&&c.getBoundingClientRect().right>r.right+1).map(c=>c.id),lb:getComputedStyle(ph.querySelector('.lb')).display}})()")
    chk('en-tête du plan : rien ne dépasse à droite', not ph['out'] and ph['sw']<=ph['cw'], ph)
    th=ev("(()=>{const e=document.querySelector('#toolHint'),r=e.getBoundingClientRect(),v=document.querySelector('#v3Bar').getBoundingClientRect();const top=document.elementsFromPoint(r.left+20,r.top+12).map(x=>x.id||x.tagName).slice(0,3);return {l:r.left,t:r.top,vl:v.left,vb:v.bottom,txt:e.textContent.slice(0,40),rail:document.querySelector('#rail').getBoundingClientRect().right}})()")
    chk("ligne d'aide de l'outil : dans la vue 3D, sous sa barre", th['l']>=th['vl'] and th['t']>=th['vb']-1 and th['l']>th['rail'], th)
    ins=ev("(()=>{const c=document.querySelector('#console');const h1=c.querySelector('h1'),x=c.querySelector('[data-a=closep]'),u=c.querySelector('[data-a=undo]').getBoundingClientRect(),tb=c.querySelector('.tabs').getBoundingClientRect();const hit=document.elementFromPoint(u.left+u.width/2,u.top+u.height/2);return {h1:getComputedStyle(h1).display,x:getComputedStyle(x).display,undoHit:hit&&hit.dataset.a,undo:[u.left,u.right,u.top],tabs:[tb.left,tb.right,tb.top,tb.bottom]}})()")
    chk('Inspecteur : un seul titre, une seule croix', ins['h1']=='none' and ins['x']=='none', ins)
    chk('Inspecteur : Annuler reste cliquable et ne recouvre pas les onglets', ins['undoHit']=='undo' and ins['undo'][0]>=ins['tabs'][1]-1, '')
    # geste 1 : clic réel sur Ajuster puis Étiquettes
    for bid in ['planFit','planLab']:
        r=ev(f"(()=>{{const r=document.querySelector('#{bid}').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()"); pg.mouse.click(*r); pg.wait_for_timeout(300)
    chk('clic réel sur Étiquettes : le bouton bascule', ev("!document.querySelector('#planLab').classList.contains('on')")); pg.mouse.click(*r); pg.wait_for_timeout(200)
    # geste 2 : détacher Patch par le ⇱ de son onglet
    chk('un seul « Détacher » par groupe, plus d\'icône sur les onglets', ev("document.querySelectorAll('#dvRoot [data-tb=swap]').length")==0 and ev("[...document.querySelectorAll('#dvRoot .dv-groupview')].every(g=>g.querySelectorAll('[data-dva=float]').length<=1)"))
    r=ev("(()=>{const t=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid==='patch').getBoundingClientRect();return [t.left+20,t.top+t.height/2]})()"); pg.mouse.click(*r); pg.wait_for_timeout(500)
    r=ev("(()=>{const t=PANELS.api.getPanel('patch').group.element.querySelector('[data-dva=float]').getBoundingClientRect();return [t.left+t.width/2,t.top+t.height/2]})()"); pg.mouse.click(*r); pg.wait_for_timeout(900)
    fl=ev("(()=>{const f=document.querySelector('#dvRoot .dv-resize-container');if(!f)return null;const r=f.getBoundingClientRect(),tb=f.querySelector('.dv-floating-titlebar'),hd=f.querySelector('.dv-tabs-and-actions-container').getBoundingClientRect();return {box:[r.left,r.top,r.width,r.height],titlebar:!!tb,head:[hd.left,hd.top,hd.right,hd.bottom],gap:hd.top-r.top,acts:[...f.querySelectorAll('[data-dva]')].map(a=>a.textContent)}})()")
    chk('fenêtre détachée : pas de barre vide au-dessus des onglets', fl and not fl['titlebar'] and fl['gap']<6, fl)
    chk('fenêtre détachée : « ⇲ Ancrer » et ▾', fl and fl['acts']==['⇲ Ancrer','▾'], fl and fl['acts'])
    pg.screenshot(path=S+'2-detache.png')
    # geste 3 : déplacer la fenêtre en tirant la partie vide de sa rangée d'onglets
    x0=fl['head'][0]+(fl['head'][2]-fl['head'][0])*0.6; y0=(fl['head'][1]+fl['head'][3])/2
    pg.mouse.move(x0,y0); pg.mouse.down(); 
    for i in range(1,9): pg.mouse.move(x0+i*20,y0+i*10); pg.wait_for_timeout(30)
    pg.mouse.up(); pg.wait_for_timeout(500)
    b2=ev("(()=>{const r=document.querySelector('#dvRoot .dv-resize-container').getBoundingClientRect();return [r.left,r.top]})()")
    chk('fenêtre détachée : se déplace en tirant sa rangée d\'onglets', 130<=b2[0]-fl['box'][0]<=165 and 60<=b2[1]-fl['box'][1]<=85, (fl['box'][:2],b2))
    # geste 4 : redimensionner par le coin bas-droite
    r=ev("(()=>{const r=document.querySelector('#dvRoot .dv-resize-container').getBoundingClientRect();return [r.right-2,r.bottom-2,r.width,r.height]})()")
    pg.mouse.move(r[0],r[1]); pg.mouse.down(); pg.mouse.move(r[0]+60,r[1]+40,steps=6); pg.mouse.up(); pg.wait_for_timeout(400)
    r2=ev("(()=>{const r=document.querySelector('#dvRoot .dv-resize-container').getBoundingClientRect();return [r.width,r.height]})()")
    chk('fenêtre détachée : se redimensionne par le coin', r2[0]>r[2]+40 and r2[1]>r[3]+25,(r[2:],r2))
    # geste 5 : clic droit sur l'onglet Rigging -> menu français -> Placer à droite
    r=ev("(()=>{const t=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid==='rig').getBoundingClientRect();return [t.left+20,t.top+t.height/2]})()"); pg.mouse.click(*r,button='right'); pg.wait_for_timeout(400)
    cx=ev("(()=>{const m=document.querySelector('#dvCtx');return {on:getComputedStyle(m).display,items:[...m.querySelectorAll('button')].map(b=>b.textContent),dv:document.querySelectorAll('.dv-context-menu,[class*=context-menu]').length}})()")
    chk('clic droit sur un onglet : menu en français, pas celui de Dockview', cx['on']=='flex' and cx['dv']==0 and any('Placer à droite' in i for i in cx['items']), cx)
    pg.screenshot(path=S+'3-menu-onglet.png')
    r=ev("(()=>{const t=document.querySelector('#dvCtx [data-cx=droite]').getBoundingClientRect();return [t.left+30,t.top+t.height/2]})()"); pg.mouse.click(*r); pg.wait_for_timeout(900)
    rg=ev("(()=>{const r=PANELS.holder('rig').getBoundingClientRect();return [r.left,r.right,r.top,r.bottom,innerWidth]})()")
    chk('« Placer à droite » : Rigging est au bord droit', rg[1]>rg[4]-20 and rg[1]-rg[0]>150, rg)
    pg.screenshot(path=S+'4-rig-droite.png')
    # geste 6 : le ranger par le clic droit -> détacher, puis double-clic sur l'onglet pour ancrer
    r=ev("(()=>{const t=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid==='rig').getBoundingClientRect();return [t.left+20,t.top+t.height/2]})()"); pg.mouse.dblclick(*r); pg.wait_for_timeout(800)
    chk('double-clic sur l\'onglet : il se détache', ev("PANELS.api.getPanel('rig').group.api.location.type")=='floating')
    # deux onglets dans la même fenêtre flottante : double-clic range un seul onglet, « Ancrer tout » range la fenêtre
    ev("PANELS.api.getPanel('patch').api.moveTo({group:PANELS.api.getPanel('rig').group})"); pg.wait_for_timeout(700)
    ev("PANELS.api.getPanel('secu').api.moveTo({group:PANELS.api.getPanel('rig').group})"); pg.wait_for_timeout(700)
    acts=ev("[...PANELS.api.getPanel('rig').group.element.querySelectorAll('[data-dva]')].map(a=>a.textContent)"); chk('fenêtre à plusieurs onglets : « ⇲ Ancrer tout »', acts==['⇲ Ancrer tout','▾'], acts)
    pg.screenshot(path=S+'5-deux-onglets.png')
    r=ev("(()=>{const t=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid==='secu').getBoundingClientRect();return [t.left+15,t.top+t.height/2]})()"); pg.mouse.dblclick(*r); pg.wait_for_timeout(900)
    st=ev("['secu','patch','rig'].map(i=>PANELS.api.getPanel(i).group.api.location.type)"); chk('double-clic sur un onglet de la fenêtre : lui seul retourne en bas', st==['grid','floating','floating'], st)
    r=ev("(()=>{const t=PANELS.api.getPanel('rig').group.element.querySelector('[data-dva=dock]').getBoundingClientRect();return [t.left+t.width/2,t.top+t.height/2]})()"); pg.mouse.click(*r); pg.wait_for_timeout(900)
    st=ev("['patch','rig','lib'].map(i=>PANELS.api.getPanel(i).group.api.location.type+':'+PANELS.api.getPanel(i).group.id)")
    chk('« ⇲ Ancrer tout » : Patch et Rigging reviennent en bas avec la Bibliothèque', all(x.startswith('grid') for x in st) and len(set(st))==1, st)
    order=ev("PANELS.api.getPanel('lib').group.panels.map(p=>p.id)"); chk("ordre des onglets du bas retrouvé", order==['patch','lib','objs','rig','secu','con','warn'], order)
    # geste 7 : ▦ -> enregistrer une disposition en tapant son nom
    r=ev("(()=>{const t=document.querySelector('#dvBtn').getBoundingClientRect();return [t.left+t.width/2,t.top+t.height/2]})()"); pg.mouse.click(*r); pg.wait_for_timeout(300)
    r=ev("(()=>{const t=document.querySelector('#dvPop [data-da=save]').getBoundingClientRect();return [t.left+40,t.top+t.height/2]})()"); pg.mouse.click(*r); pg.wait_for_timeout(300)
    chk('nom de disposition : champ dans le menu, curseur dedans', ev("document.activeElement && document.activeElement.closest('.dvname')!==null"))
    pg.keyboard.type('Plan de feu'); pg.screenshot(path=S+'6-nom-disposition.png'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    chk('disposition « Plan de feu » enregistrée, aucun objet créé par les touches tapées', ev("PANELS.layouts().includes('Plan de feu') && STAGE.S.objs.length===0 && getComputedStyle(document.querySelector('#dvPop')).display==='none'"), ev("PANELS.layouts()"))
    # geste 8 : Environnement
    ev("APP.toggleSide(false)"); pg.wait_for_timeout(900); pg.screenshot(path=S+'7-environnement.png')
    env=ev("(()=>{const s=document.querySelector('#side');const x=s.querySelector('.dockX');return {panel:PANELS.has('env'),x:x?getComputedStyle(x).display:'absent'}})()"); chk('Environnement : pas de seconde croix', env['panel'] and env['x'] in('none','absent'), env)
    chk('aucune erreur de script', not errs, errs[:4])
    print('RESULTAT',sum(ok),'/',len(ok)); b.close()
