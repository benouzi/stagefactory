# panneaux Dockview : disposition d'origine, la 3D et le plan répondent, onglets, flottant, aimant, disposition gardée et nommée, 3D protégée
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'; os.environ['SF_DV']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.PANELS && PANELS.ready && window.OBJLIST && window.LIBWIN && !!PLAN.world",timeout=90000); pg.wait_for_timeout(2500)
    ev("(()=>{if(!PLAN.P.on)PLAN.toggle(true)})()"); pg.wait_for_timeout(900)          # selon l'ordre de chargement, le plan n'est pas toujours ouvert au départ
    RC="(i)=>{const r=PANELS.holder(i).getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]}"
    H=lambda i: ev(RC,i)
    has=lambda: ev("['v3d','plan','insp','objs','env','drawer','lib'].filter(i=>PANELS.has(i))")
    ok(set(has())>={'v3d','plan','insp','objs','drawer','lib'},'disposition d\'origine : vue 3D, plan, objets, inspecteur, bibliothèque et tiroir sont des panneaux du même système',has())
    v=H('v3d'); pl=H('plan'); ob=H('objs'); ins=H('insp'); lb=H('lib')
    ok(v[1]<=52 and pl[0]>=v[0]+v[2]-2 and ob[0]>=pl[0]+pl[2]-2 and ins[1]>=ob[1]+ob[3]-2 and lb[1]>=v[1]+v[3]-2,'rien ne se chevauche : 3D | plan | objets au-dessus de l\'inspecteur, bibliothèque dessous',[v,pl,ob,ins,lb])
    c=ev("(()=>{const r=document.querySelector('#c').getBoundingClientRect();return [Math.round(r.left),Math.round(r.width),Math.round(r.bottom)]})()"); ok(abs(c[0]-v[0])<=1 and abs(c[1]-v[2])<=1 and abs(c[2]-(v[1]+v[3]))<=1,'la vue 3D remplit exactement son panneau',[c,v])
    ok(ev("!document.querySelector('.wbar[style*=flex]') && getComputedStyle(document.querySelector('#libWin .lw-bar')).display==='none'"),'plus de seconde sorte de fenêtre : les anciennes barres « Ancrer » et la barre de la bibliothèque ont disparu')
    # la 3D répond à travers son panneau
    ev("STAGE.UI.placing='par-zoom';STAGE.render()"); pg.mouse.click(v[0]+v[2]*.5,v[1]+v[3]*.62); pg.wait_for_timeout(700); n=ev("STAGE.S.objs.length"); ok(n==1,'clic dans la vue 3D : le projecteur choisi dans la bibliothèque est posé',n)
    pg.wait_for_timeout(800); ok(ev("document.querySelectorAll('#olWin tr.olr').length")==1,'il apparaît dans le panneau Objets')
    pg.click('#olWin tr.olr td.nm'); pg.wait_for_timeout(600); ok(ev("STAGE.UI.sel.length")==1 and ev("!!document.querySelector('#console [data-k=pan]')") and ev("document.querySelector('#console').closest('#dvRoot')!==null"),'clic sur sa ligne : ses réglages s\'affichent dans le panneau Inspecteur')
    # le plan répond
    W="([x,z])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+x*PLAN.P.s,r.top+PLAN.P.oy+z*PLAN.P.s]}"
    ev("STAGE.select([]);STAGE.UI.placing='decoupe';STAGE.render()"); pg.mouse.click(*ev(W,[2,2])); pg.wait_for_timeout(700); q=ev("STAGE.S.objs[STAGE.S.objs.length-1].pos"); ok(ev("STAGE.S.objs.length")==2 and abs(q[0]-2)<.1 and abs(q[2]-2)<.1,'clic sur le plan : la découpe est posée au bon endroit',q)
    # tracer un pont dans la vue 3D (outil du rail)
    ev("STAGE.select([]);document.querySelector('[data-dom=rig]').click();document.querySelector('#rail [data-t=truss]').click()"); pg.wait_for_timeout(900)
    S3=lambda x,z: ev("([x,z])=>{const v=new APP.THREE.Vector3(x,0,z).project(APP.camera),r=APP.canvas.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}",[x,z])
    a3=S3(-2,-2); c3=S3(2,-2); pg.mouse.click(*a3); pg.wait_for_timeout(200); pg.mouse.move(*c3); pg.wait_for_timeout(200); pg.mouse.click(*c3); pg.wait_for_timeout(500); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    sp=ev("STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.a.x,s.b.x])"); ok(len(sp)==1 and abs(sp[0][0]+2000)<=300 and abs(sp[0][1]-2000)<=300,'outil « pont » : tracé à la souris dans la vue 3D',sp); ev("PONTS.select&&PONTS.select(null);document.querySelector('[data-dom=lum]').click()"); pg.wait_for_timeout(300)
    # onglets : le tiroir et la bibliothèque partagent leur zone
    pg.click('#dvRoot .dv-tab:has-text("Patch")'); pg.wait_for_timeout(500); ok(ev("document.querySelector('#drawer').getBoundingClientRect().height")>100 and ev("!!document.querySelector('#drawer .dr-tabs [data-dt=rig]') && !document.querySelector('#drawer .dr-tabs [data-dt=lib]')"),'onglet « Patch · Rigging · Console » : le tiroir, sans les onglets devenus des panneaux')
    top=ev("(()=>{const d=document.querySelector('#drawer').getBoundingClientRect(),e=document.elementFromPoint(d.left+d.width/2,d.top+14);return [!!(e&&e.closest('#drawer')),!!(e&&e.closest('#libWin')),getComputedStyle(document.querySelector('#libWin')).visibility]})()"); ok(top==[True,False,'hidden'],'c\'est bien le tiroir qui est affiché et cliquable, la bibliothèque est cachée derrière son onglet',top)
    pg.click('#drawer .dr-tabs [data-dt=rig]'); pg.wait_for_timeout(400); ok(ev("DRAWER.is('rig')"),'ses onglets internes (Patch, Rigging et charges, Sécurité, Console, Avertissements) marchent')
    pg.click('#drawer .dr-tabs [data-dt=patch]'); pg.wait_for_timeout(400); ok(ev("DRAWER.is('patch') && document.querySelector('#drBody').getBoundingClientRect().height>60"),'onglet Patch affiché')
    pg.click('#dvRoot .dv-tab:has-text("Bibliothèque")'); pg.wait_for_timeout(400); ok(ev("document.querySelector('#libWin').getBoundingClientRect().height")>100,'retour à la bibliothèque'); ok(ev("[getComputedStyle(document.querySelector('#libWin')).visibility,getComputedStyle(document.querySelector('#drawer')).visibility]")==['visible','hidden'],'… et là c\'est le tiroir qui est caché')
    # fermer / rouvrir par le bouton ▦
    pg.click('#dvBtn'); pg.wait_for_timeout(300); pg.click('#dvPop [data-dp=objs]'); pg.wait_for_timeout(600); ok('objs' not in has() and not ev("OBJLIST.winOn"),'bouton ▦ : décocher « Objets » retire le panneau',has()); pg.keyboard.press('Escape'); pg.mouse.click(700,25)
    pg.keyboard.press('o'); pg.wait_for_timeout(700); ok('objs' in has(),'touche O : il revient')
    pg.click('#dvRoot .dv-tab:has-text("Inspecteur") .dv-default-tab-action'); pg.wait_for_timeout(600); ok('insp' not in has() and ev("document.querySelector('#console').classList.contains('hide')"),'✕ de l\'onglet Inspecteur : fermé, comme avec la touche L',has())
    pg.click('#conBtn'); pg.wait_for_timeout(600); ok('insp' in has(),'bouton « Inspecteur » : il revient')
    # flottant
    ev("PANELS.float('objs',{x:300,y:160,width:420,height:360})"); pg.wait_for_timeout(700); fo=H('objs'); ok(ev("PANELS.api.getPanel('objs').group.api.location.type")=='floating' and fo[2]>300,'un panneau peut flotter',fo)
    z=ev("(()=>{const e=document.elementFromPoint(%d,%d);return !!(e&&e.closest('#olWin'))})()"%(fo[0]+fo[2]//2,fo[1]+fo[3]//2)); ok(z,'flottant, il passe bien PAR-DESSUS le plan et la vue 3D')
    pg.screenshot(path=OUT+'/t127_float.png')
    # aimant : tirer son onglet sur le bord droit de l'inspecteur
    tb=pg.locator('#dvRoot .dv-resize-container .dv-tab:has-text("Objets")').bounding_box(); ins=H('insp')
    pg.mouse.move(tb['x']+20,tb['y']+10); pg.mouse.down(); pg.mouse.move(tb['x']+60,tb['y']+40,steps=4); pg.mouse.move(ins[0]+ins[2]//2,ins[1]+20,steps=12); pg.wait_for_timeout(300); pg.mouse.move(ins[0]+ins[2]//2,ins[1]+24,steps=2); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(900)
    loc=ev("PANELS.api.getPanel('objs').group.api.location.type"); o2=H('objs'); ok(loc=='grid','tiré par son onglet et lâché sur l\'inspecteur : il s\'aimante dans la grille',[loc,o2,H('insp')])
    # sortir le panneau du bas puis le remettre : trois façons
    loc=lambda i: ev("(i)=>{const p=PANELS.api.getPanel(i);return p?p.group.api.location.type:null}",i)
    pg.click('#dvRoot .dv-tab:has-text("Bibliothèque")'); pg.wait_for_timeout(300); g=pg.locator('#dvRoot .dv-groupview:has(.dv-tab:has-text("Bibliothèque")) .dvact [data-dva=float]'); g.click(); pg.wait_for_timeout(800)
    ok(loc('lib')=='floating' and loc('drawer')=='floating','bouton ⇱ du panneau du bas : il flotte (bibliothèque et tiroir ensemble)',[loc('lib'),loc('drawer')])
    pg.click('#dvRoot .dvact [data-dva=dock]'); pg.wait_for_timeout(900); r=H('lib'); ok(loc('lib')=='grid' and loc('drawer')=='grid' and r[2]>1300 and r[1]>500,'bouton « ⇲ Ancrer » : il revient en bas, sur toute la largeur',r)
    ev("PANELS.float('lib',{x:300,y:200,width:600,height:300})"); pg.wait_for_timeout(800); tb=pg.locator('#dvRoot .dv-resize-container .dv-tab:has-text("Bibliothèque")').bounding_box(); v3=H('v3d')
    pg.mouse.move(tb['x']+20,tb['y']+10); pg.mouse.down(); pg.mouse.move(tb['x']+40,tb['y']+40,steps=4); pg.mouse.move(v3[0]+v3[2]//2,v3[1]+v3[3]-25,steps=14); pg.wait_for_timeout(500); pg.mouse.move(v3[0]+v3[2]//2+2,v3[1]+v3[3]-24,steps=2); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(900)
    r=H('lib'); v4=H('v3d'); ok(loc('lib')=='grid' and r[1]>=v4[1]+v4[3]-2 and abs(r[0]-v4[0])<4 and v4[1]<=52,'tiré par son onglet et lâché en bas de la vue 3D : il s\'aimante sous la vue 3D, qui reste en haut',[r,v4])
    ev("PANELS.float('drawer',{x:300,y:200,width:600,height:300})"); pg.wait_for_timeout(800); pg.click('#dvRoot .dv-resize-container .dvact [data-dva=menu]'); pg.wait_for_timeout(300); pg.click('#dvPlace [data-pw=droite]'); pg.wait_for_timeout(900)
    r=H('drawer'); ok(loc('drawer')=='grid' and r[0]>1000,'menu ▾ → « À droite » : le panneau se range à droite sans viser',r)
    ev("PANELS.reset()"); pg.wait_for_timeout(900); ev("(()=>{if(!PLAN.P.on)PLAN.toggle(true)})()"); pg.wait_for_timeout(700)
    # disposition gardée, nommée
    ev("PANELS.save('Essai')"); pg.wait_for_timeout(700); j=ev("JSON.parse(localStorage.getItem('onex.dvLayout')||'null')"); ok(j is not None and 'Essai' in ev("PANELS.layouts()"),'la disposition est gardée, et on peut en enregistrer une sous un nom')
    ev("PANELS.reset()"); pg.wait_for_timeout(900); v2=H('v3d'); ok(set(has())>={'v3d','plan','insp','objs','drawer','lib'} and v2[1]<=52,'« Disposition d\'origine » remet tout en place',has())
    pg.click('#dvBtn'); pg.wait_for_timeout(300); pg.click('#dvPop [data-dl]'); pg.wait_for_timeout(900); ok(ev("PANELS.api.getPanel('objs').group.api.location.type")=='grid' and ev("STAGE.S.objs.length")==2,'reprise de la disposition « Essai » : panneaux replacés, projet intact')
    # la 3D ne peut pas flotter
    ev("PANELS.reset()"); pg.wait_for_timeout(700); ev("PANELS.float('v3d')"); pg.wait_for_timeout(1200); ok(ev("PANELS.api.getPanel('v3d').group.api.location.type")=='grid' and H('v3d')[1]<=52,'faire flotter la vue 3D est refusé : elle reste à sa place')
    # 3D seule / plan seul
    pg.click('#top button:has-text("Plan"):not(:has-text("3D"))'); pg.wait_for_timeout(900); p2=H('plan'); ok(p2[2]>1200,'bouton « Plan » : le plan prend toute la place',p2)
    pg.click('#top button:has-text("3D + Plan")'); pg.wait_for_timeout(900); ok(H('plan')[2]<900 and H('v3d')[2]>200,'« 3D + Plan » : retour côte à côte',[H('v3d'),H('plan')])
    pg.screenshot(path=OUT+'/t127.png')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    print('fin','tout passe' if not bad else bad); b.close()
