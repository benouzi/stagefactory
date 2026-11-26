# panneaux Dockview : tous les onglets du bas sont des panneaux détachables ; la 3D et le plan répondent ; flotter, ancrer, aimanter, dispositions
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'; os.environ['SF_DV']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
BOT=['patch','lib','objs','rig','secu','con','warn']
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.PANELS && PANELS.ready && window.OBJLIST && window.LIBWIN && !!PLAN.world",timeout=90000); pg.wait_for_timeout(2500)
    ev("(()=>{if(!PLAN.P.on)PLAN.toggle(true)})()"); pg.wait_for_timeout(900)          # selon l'ordre de chargement, le plan n'est pas toujours ouvert au départ
    H=lambda i: ev("(i)=>{const r=PANELS.holder(i).getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]}",i)
    loc=lambda i: ev("(i)=>{const p=PANELS.api.getPanel(i);return p?p.group.api.location.type:null}",i)
    has=lambda: ev("['v3d','plan','insp','env','patch','lib','objs','rig','secu','con','warn'].filter(i=>PANELS.has(i))")
    tab=lambda t: '#dvRoot .dv-tab:has-text("%s")'%t
    ok(set(has())>={'v3d','plan','insp',*BOT},'disposition d\'origine : vue 3D, plan, inspecteur et les sept onglets du bas, tous des panneaux du même système',has())
    g=ev("[...document.querySelectorAll('#dvRoot .dv-groupview')].map(g=>[...g.querySelectorAll('.dv-tab')].map(t=>t.textContent.trim())).find(a=>a.includes('Patch'))")
    ok(g==['Patch','Bibliothèque','Liste des objets','Rigging et charges','Sécurité','Console','Avertissements'],'en bas, les onglets sont rangés comme avant, dans le même ordre',g)
    v=H('v3d'); pl=H('plan'); ins=H('insp'); lb=H('lib')
    ok(v[1]<=52 and pl[0]>=v[0]+v[2]-2 and ins[0]>=pl[0]+pl[2]-2 and lb[1]>=v[1]+v[3]-2 and lb[2]>1300,'rien ne se chevauche : 3D | plan | inspecteur, et les onglets du bas sur toute la largeur',[v,pl,ins,lb])
    c=ev("(()=>{const r=document.querySelector('#c').getBoundingClientRect();return [Math.round(r.left),Math.round(r.width),Math.round(r.bottom)]})()"); ok(abs(c[0]-v[0])<=1 and abs(c[1]-v[2])<=1 and abs(c[2]-(v[1]+v[3]))<=1,'la vue 3D remplit exactement son panneau',[c,v])
    ok(ev("getComputedStyle(document.querySelector('#drawer')).display==='none' && getComputedStyle(document.querySelector('#libWin .lw-bar')).display==='none' && !document.querySelector('.wbar[style*=flex]')"),'plus d\'autre sorte de fenêtre : l\'ancien tiroir, les barres « Ancrer » et la barre de la bibliothèque ont disparu')
    # chaque onglet du bas affiche son contenu, et seulement lui
    for t,k,probe in [('Patch','patch','projecteur'),('Rigging et charges','rig','pont'),('Sécurité','secu',''),('Console','con','Mode spectacle'),('Avertissements','warn','')]:
        pg.click(tab(t)); pg.wait_for_timeout(450)
        r=ev("(k)=>{const b=document.querySelector('.drp[data-dt='+k+']'),q=b.getBoundingClientRect(),e=document.elementFromPoint(q.left+q.width/2,q.top+12);return [PANELS.visible(k),DRAWER.is(k),b.innerText.length>20,!!(e&&e.closest('.drp[data-dt='+k+']')),b.innerText.slice(0,400)]}",k)
        ok(r[0] and r[1] and r[2] and r[3] and probe.lower() in r[4].lower(),'onglet « %s » : son contenu est affiché au premier plan'%t,r[:4])
    pg.click(tab('Bibliothèque')); pg.wait_for_timeout(400); ok(ev("[getComputedStyle(document.querySelector('#libWin')).visibility,getComputedStyle(document.querySelector('.drp[data-dt=patch]')).visibility]")==['visible','hidden'] and ev("document.querySelectorAll('#libWin .lib .th').length")>5,'onglet « Bibliothèque » : la bibliothèque, les autres sont cachés derrière')
    # la 3D et le plan répondent
    ev("STAGE.UI.placing='par-zoom';STAGE.render()"); pg.mouse.click(v[0]+v[2]*.5,v[1]+v[3]*.62); pg.wait_for_timeout(700); ok(ev("STAGE.S.objs.length")==1,'clic dans la vue 3D : le projecteur choisi est posé')
    W="([x,z])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+x*PLAN.P.s,r.top+PLAN.P.oy+z*PLAN.P.s]}"
    ev("STAGE.select([]);STAGE.UI.placing='decoupe';STAGE.render()"); pg.mouse.click(*ev(W,[2,2])); pg.wait_for_timeout(700); q=ev("STAGE.S.objs[STAGE.S.objs.length-1].pos"); ok(ev("STAGE.S.objs.length")==2 and abs(q[0]-2)<.1 and abs(q[2]-2)<.1,'clic sur le plan : la découpe est posée au bon endroit',q)
    pg.click(tab('Liste des objets')); pg.wait_for_timeout(700); ok(ev("document.querySelectorAll('#olWin tr.olr').length")==2 and ev("!!document.querySelector('#olWin #olx th[data-ols=w]')"),'onglet « Liste des objets » : le tableau complet, avec les deux objets')
    ev("STAGE.select([])"); pg.wait_for_timeout(300); pg.click('#olWin tr.olr td.mu'); pg.wait_for_timeout(600); ok(ev("STAGE.UI.sel.length")==1 and ev("!!document.querySelector('#console [data-k=pan]')") and ev("document.querySelector('#console').closest('#dvRoot')!==null"),'clic sur une ligne : ses réglages s\'affichent dans le panneau Inspecteur')
    pg.click(tab('Patch')); pg.wait_for_timeout(500); ok('1.001' in ev("document.querySelector('.drp[data-dt=patch]').innerText") or ev("document.querySelectorAll('.drp[data-dt=patch] tr').length")>=2,'onglet Patch : les deux projecteurs y sont')
    # tracer un pont dans la vue 3D (outil du rail)
    ev("STAGE.select([]);document.querySelector('[data-dom=rig]').click();document.querySelector('#rail [data-t=truss]').click()"); pg.wait_for_timeout(900)
    S3=lambda x,z: ev("([x,z])=>{const v=new APP.THREE.Vector3(x,0,z).project(APP.camera),r=APP.canvas.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}",[x,z])
    a3=S3(-2,-2); c3=S3(2,-2); pg.mouse.click(*a3); pg.wait_for_timeout(200); pg.mouse.move(*c3); pg.wait_for_timeout(200); pg.mouse.click(*c3); pg.wait_for_timeout(500); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    sp=ev("STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.a.x,s.b.x])"); ok(len(sp)==1 and abs(sp[0][0]+2000)<=300 and abs(sp[0][1]-2000)<=300,'outil « pont » : tracé à la souris dans la vue 3D',sp); ev("PONTS.select&&PONTS.select(null);document.querySelector('[data-dom=lum]').click()"); pg.wait_for_timeout(300)
    ev("DRAWER.open('rig')"); pg.wait_for_timeout(600); ok(ev("PANELS.visible('rig') && document.querySelector('#drBody').dataset.dt==='rig'") and 'pont' in ev("document.querySelector('#drBody').innerText").lower(),'commande « Rigging et charges » : son onglet passe devant et montre le pont')
    # fermer / rouvrir
    pg.click(tab('Sécurité')); pg.wait_for_timeout(300); pg.click(tab('Sécurité')+' .dv-default-tab-action'); pg.wait_for_timeout(600); ok('secu' not in has(),'✕ d\'un onglet : le panneau est fermé',has())
    pg.click('#dvBtn'); pg.wait_for_timeout(300); pg.click('#dvPop [data-dp=secu]'); pg.wait_for_timeout(700); g=ev("[...document.querySelectorAll('#dvRoot .dv-groupview')].map(g=>[...g.querySelectorAll('.dv-tab')].map(t=>t.textContent.trim())).find(a=>a.includes('Patch'))")
    ok('secu' in has() and g.index('Sécurité')==g.index('Rigging et charges')+1,'bouton ▦ → « Sécurité » : il revient à sa place parmi les onglets',g); pg.keyboard.press('Escape'); pg.mouse.click(700,25); pg.wait_for_timeout(300)
    pg.keyboard.press('o'); pg.wait_for_timeout(700); ok(ev("PANELS.visible('objs')"),'touche O : la liste des objets passe devant'); pg.keyboard.press('o'); pg.wait_for_timeout(700); ok('objs' not in has(),'touche O encore : elle se ferme'); pg.keyboard.press('o'); pg.wait_for_timeout(700); ok(ev("PANELS.visible('objs')"),'… et se rouvre')
    pg.click(tab('Inspecteur')+' .dv-default-tab-action'); pg.wait_for_timeout(600); ok('insp' not in has() and ev("document.querySelector('#console').classList.contains('hide')"),'✕ de l\'onglet Inspecteur : fermé, comme avec la touche L'); pg.click('#conBtn'); pg.wait_for_timeout(600); ok('insp' in has(),'bouton « Inspecteur » : il revient')
    # détacher UN onglet du bas, le ranger
    pg.click(tab('Console')); pg.wait_for_timeout(300); ev("PANELS.float('con',{x:300,y:160,width:460,height:360})"); pg.wait_for_timeout(800); fo=H('con')
    z=ev("(()=>{const e=document.elementFromPoint(%d,%d);return !!(e&&e.closest('.drp[data-dt=con]'))})()"%(fo[0]+fo[2]//2,fo[1]+fo[3]//2)); ok(loc('con')=='floating' and z and loc('patch')=='grid','un seul onglet se détache (Console) : il flotte par-dessus le reste, les autres restent en bas',fo); pg.screenshot(path=OUT+'/t127_float.png')
    pg.click('#dvRoot .dv-resize-container .dvact [data-dva=dock]'); pg.wait_for_timeout(900); g=ev("[...document.querySelectorAll('#dvRoot .dv-groupview')].map(g=>[...g.querySelectorAll('.dv-tab')].map(t=>t.textContent.trim())).find(a=>a.includes('Patch'))"); ok(loc('con')=='grid' and 'Console' in g and g.index('Console')==g.index('Sécurité')+1,'« ⇲ Ancrer » : il retourne à sa place, entre Sécurité et Avertissements',g)
    # tout le groupe du bas : flotter, ancrer, glisser, menu
    pg.click(tab('Bibliothèque')); pg.wait_for_timeout(300); pg.locator('#dvRoot .dv-groupview:has(.dv-tab:has-text("Bibliothèque")) .dvact [data-dva=float]').click(); pg.wait_for_timeout(800)
    ok(all(loc(k)=='floating' for k in BOT),'bouton ⇱ du groupe du bas : tous ses onglets flottent ensemble'); pg.click('#dvRoot .dvact [data-dva=dock]'); pg.wait_for_timeout(900); r=H('lib'); ok(all(loc(k)=='grid' for k in BOT) and r[2]>1300 and r[1]>500,'« ⇲ Ancrer » : le groupe revient en bas, sur toute la largeur',r)
    ev("PANELS.float('lib',{x:300,y:200,width:600,height:300})"); pg.wait_for_timeout(800); tb=pg.locator('#dvRoot .dv-resize-container .dv-tab:has-text("Bibliothèque")').bounding_box(); ins=H('insp')
    pg.mouse.move(tb['x']+20,tb['y']+10); pg.mouse.down(); pg.mouse.move(tb['x']+40,tb['y']+40,steps=4); pg.mouse.move(ins[0]+ins[2]//2,ins[1]+20,steps=12); pg.wait_for_timeout(300); pg.mouse.move(ins[0]+ins[2]//2,ins[1]+24,steps=2); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(900)
    ok(loc('lib')=='grid' and H('lib')[0]>1000,'onglet Bibliothèque tiré et lâché sur l\'inspecteur : il s\'aimante à droite',H('lib'))
    pg.locator('#dvRoot .dv-groupview:has(.dv-tab:has-text("Bibliothèque")) .dvact [data-dva=menu]').first.click(); pg.wait_for_timeout(300); pg.click('#dvPlace [data-pw=home]'); pg.wait_for_timeout(900); g=ev("[...document.querySelectorAll('#dvRoot .dv-groupview')].map(g=>[...g.querySelectorAll('.dv-tab')].map(t=>t.textContent.trim())).find(a=>a.includes('Patch'))")
    ok(g[:2]==['Patch','Bibliothèque'] and 'insp' in has(),'menu ▾ → « À sa place d\'origine » : la bibliothèque retourne en bas, 2e onglet ; l\'inspecteur n\'a pas bougé',g)
    ev("PANELS.float('patch',{x:300,y:200,width:600,height:300})"); pg.wait_for_timeout(800); pg.click('#dvRoot .dv-resize-container .dvact [data-dva=menu]'); pg.wait_for_timeout(300); pg.click('#dvPlace [data-pw=gauche]'); pg.wait_for_timeout(900); r=H('patch'); ok(loc('patch')=='grid' and r[0]<80 and H('v3d')[1]<=52,'menu ▾ → « À gauche » : le Patch se range à gauche sans viser',r)
    # disposition gardée, nommée
    ev("PANELS.save('Essai')"); pg.wait_for_timeout(700); ok(ev("localStorage.getItem('onex.dvLayout')!==null") and 'Essai' in ev("PANELS.layouts()"),'la disposition est gardée, et on peut en enregistrer une sous un nom')
    ev("PANELS.reset()"); pg.wait_for_timeout(900); g=ev("[...document.querySelectorAll('#dvRoot .dv-groupview')].map(g=>[...g.querySelectorAll('.dv-tab')].map(t=>t.textContent.trim())).find(a=>a.includes('Patch'))"); ok(g==['Patch','Bibliothèque','Liste des objets','Rigging et charges','Sécurité','Console','Avertissements'] and H('v3d')[1]<=52,'« Disposition d\'origine » remet tout en place',g)
    pg.click('#dvBtn'); pg.wait_for_timeout(300); pg.click('#dvPop [data-dl]'); pg.wait_for_timeout(900); ok(H('patch')[0]<80 and ev("STAGE.S.objs.length")==2,'reprise de la disposition « Essai » : le Patch est de nouveau à gauche, le projet est intact')
    # garde-fous
    ev("PANELS.reset()"); pg.wait_for_timeout(700); ev("PANELS.float('v3d')"); pg.wait_for_timeout(1200); ok(loc('v3d')=='grid' and H('v3d')[1]<=52,'faire flotter la vue 3D est refusé : elle reste à sa place')
    ev("(()=>{if(!PLAN.P.on)PLAN.toggle(true)})()"); pg.wait_for_timeout(700); pg.click('#top button:has-text("Plan"):not(:has-text("3D"))'); pg.wait_for_timeout(900); ok(H('plan')[2]>1200,'bouton « Plan » : le plan prend toute la place'); pg.click('#top button:has-text("3D + Plan")'); pg.wait_for_timeout(900); ok(H('plan')[2]<900 and H('v3d')[2]>200,'« 3D + Plan » : retour côte à côte')
    # rechargement
    ev("PANELS.float('rig',{x:260,y:180,width:520,height:320})"); pg.wait_for_timeout(1200); pg.reload(); pg.wait_for_function("window.STAGE && window.PANELS && PANELS.ready && document.querySelector('#loader').style.display==='none'",timeout=120000); pg.wait_for_timeout(2500)
    ok(loc('rig')=='floating' and loc('patch')=='grid' and ev("document.querySelector('.drp[data-dt=rig]').innerText.length")>20,'après rechargement : la disposition est retrouvée (Rigging toujours flottant) et son contenu est là')
    pg.screenshot(path=OUT+'/t127.png')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    print('fin','tout passe' if not bad else bad); b.close()
