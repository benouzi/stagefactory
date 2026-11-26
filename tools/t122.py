# bibliothèque : catégorie + constructeur, menu Affichage (vues, groupes, tri), favoris, récents, « dans ce projet », fiche à la demande, fenêtre détachable, glisser dans la vue
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:460],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.LIBWIN && window.DRAWER && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("localStorage.removeItem('libv');DRAWER.D.h=430;DRAWER.open('lib');window.DOCK&&DOCK.layout()"); pg.wait_for_timeout(700)
    B='#drBody '
    opts=ev("[...document.querySelectorAll('#drBody [data-lv=cat] option:not([disabled])')].map(o=>o.textContent.trim())"); ok(opts[0].startswith('★ Favoris') and 'Utilisés récemment' in opts[1] and any(o.startswith('Lumière') for o in opts) and ev("!document.querySelector('#drBody .tabs')"),'les onglets sont remplacés par une liste déroulante « Catégorie », favoris et récents en tête',opts)
    pg.select_option(B+'[data-lv=cat]','lum'); pg.wait_for_timeout(500)
    G=lambda: ev("[...document.querySelectorAll('#drBody h2.libg')].map(h=>[h.dataset.id,h.dataset.open,h.querySelector('small').textContent])")
    g=G(); ok(len(g)>5 and g[0][0]=='Génériques' and g[0][1]=='1' and all(x[1]=='0' for x in g[1:]),'Lumière : rangée par constructeur, « Génériques » ouvert, les marques repliées avec leur nombre',g[:4])
    br=ev("[...document.querySelectorAll('#drBody [data-lv=brand] option')].map(o=>o.value)"); mk=[x for x in br if x and x!='__gen'][0]
    nG=ev("document.querySelectorAll('#drBody .lib .th').length"); pg.click(B+'h2.libg[data-id="%s"]'%g[1][0]); pg.wait_for_timeout(400); n2=ev("document.querySelectorAll('#drBody .lib .th').length"); ok(n2==nG+int(g[1][2]),'clic sur une marque : son groupe se déplie',[nG,n2,g[1]])
    pg.select_option(B+'[data-lv=brand]',mk); pg.wait_for_timeout(500); names=ev("[...document.querySelectorAll('#drBody .lib .th span')].map(s=>s.firstChild.textContent)")
    ok(len(names)>0 and all(n.startswith(mk) for n in names),'liste « Constructeur » : il ne reste que cette marque dans la catégorie',[mk,len(names)])
    # menu Affichage
    def opt(k): pg.click(B+'.libmenu summary'); pg.wait_for_timeout(200); pg.click(B+'.libpop [data-id="%s"]'%k); pg.wait_for_timeout(500)
    opt('view:list'); rows=ev("[...document.querySelectorAll('#drBody table.libt tbody tr')].map(t=>[...t.children].map(c=>c.textContent.trim()))")
    ok(len(rows)==len(names) and rows[0][1]==mk and ev("!document.querySelector('#drBody .lib .th')"),'Affichage → « Liste détaillée » : un tableau constructeur / modèle / famille / poids / puissance / canaux',rows[0])
    unk=ev("(b)=>STAGE.LIBALL().filter(t=>t.brand===b&&t.cat==='lum'&&(t.noW||!(t.w>0))).length",mk); ok(len([r for r in rows if r[4]==''])==unk,'un poids inconnu reste une case vide',[unk])
    opt('grp:none'); opt('sort:w'); ws=[float(r[4].replace(' kg','').replace(',','.')) if 'kg' in r[4] else (float(r[4].replace(' g',''))/1000 if r[4] else 1e9) for r in ev("[...document.querySelectorAll('#drBody table.libt tbody tr')].map(t=>[...t.children].map(c=>c.textContent.trim()))")]
    ok(ws==sorted(ws),'tri « Par poids » : du plus léger au plus lourd, les inconnus à la fin',ws[:5]); opt('sort:name'); opt('grp:brand'); opt('view:small'); ok(ev("!!document.querySelector('#drBody .lib.sm .th')"),'« Petites vignettes »'); opt('view:big')
    # favori
    pg.select_option(B+'[data-lv=brand]',''); pg.select_option(B+'[data-lv=cat]','lum'); pg.wait_for_timeout(400)
    fid=ev("document.querySelector('#drBody .lib .th').dataset.id"); pg.hover(B+'.lib .th'); pg.click(B+'.lib .th .lst'); pg.wait_for_timeout(400)
    ok(ev("JSON.parse(localStorage.getItem('libv')||'{}').fav")==[fid] or ev("!!document.querySelector('#drBody .lib .th .lst.on')"),'clic sur l\'étoile : le modèle devient favori (sans être choisi pour la pose)',[fid,ev("STAGE.UI.placing")]); ok(ev("STAGE.UI.placing")!=fid,'… et il n\'est pas choisi pour la pose')
    pg.select_option(B+'[data-lv=cat]','fav'); pg.wait_for_timeout(400); ok(ev("[...document.querySelectorAll('#drBody .lib .th')].map(t=>t.dataset.id)")==[fid],'catégorie « Favoris » : il y est')
    # glisser dans la vue 3D
    n0=ev("STAGE.S.objs.length"); a=pg.locator(B+'.lib .th').first.bounding_box(); c=pg.locator('#stage3d, canvas').first.bounding_box(); cv=ev("(()=>{const r=APP.canvas.getBoundingClientRect();return [r.left+r.width*.5,r.top+r.height*.62]})()")
    pg.mouse.move(a['x']+20,a['y']+12); pg.mouse.down(); pg.mouse.move(a['x']+40,a['y']+2,steps=4); pg.mouse.move(cv[0],cv[1],steps=10); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(700)
    ok(ev("STAGE.S.objs.length")==n0+1 and ev("STAGE.S.objs[STAGE.S.objs.length-1].type")==fid,'glisser la vignette dans la vue 3D : le projecteur est posé sous le pointeur',ev("STAGE.S.objs.map(o=>o.pos)"))
    # glisser sur le plan
    pl=ev("(()=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+2*PLAN.P.s,r.top+PLAN.P.oy+1*PLAN.P.s]})()"); a=pg.locator(B+'.lib .th').first.bounding_box()
    pg.mouse.move(a['x']+20,a['y']+12); pg.mouse.down(); pg.mouse.move(a['x']+40,a['y']+2,steps=4); pg.mouse.move(pl[0],pl[1],steps=10); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(700)
    q=ev("STAGE.S.objs[STAGE.S.objs.length-1].pos"); ok(ev("STAGE.S.objs.length")==n0+2 and abs(q[0]-2)<.08 and abs(q[2]-1)<.08,'glisser sur le plan : posé à l\'endroit du lâcher (2 m cour, 1 m)',q)
    ok(ev("document.querySelector('#drBody .lib .th .lbd')?.textContent")=='2 posés','le compteur de la vignette indique « 2 posés »')
    pg.select_option(B+'[data-lv=cat]','rec'); pg.wait_for_timeout(400); ok(ev("[...document.querySelectorAll('#drBody .lib .th')].map(t=>t.dataset.id)")==[fid],'« Utilisés récemment » : le modèle posé y figure')
    pg.select_option(B+'[data-lv=cat]','lum'); pg.wait_for_timeout(300); opt('proj:!'); ids=ev("[...document.querySelectorAll('#drBody .lib .th')].map(t=>t.dataset.id)"); ok(ids==[fid],'option « Seulement ce qui est dans ce projet »',ids); opt('proj:!')
    # fiche à la demande
    pg.select_option(B+'[data-lv=brand]',mk); pg.wait_for_timeout(400); pg.click(B+'.lib .th'); pg.wait_for_timeout(500)
    s=ev("(()=>{const a=document.querySelector('#drBody .libside'),m=document.querySelector('#drBody .libmain');if(!a)return null;const r=a.getBoundingClientRect(),q=m.getBoundingClientRect();return [!!a.querySelector('#libFiche'),r.left>=q.right-1,Math.abs(r.top-q.top)<4]})()")
    ok(s==[True,True,True],'modèle choisi : sa fiche s\'ouvre dans un volet à droite, la liste ne descend pas',s)
    pg.click(B+'.libside .libx-x'); pg.wait_for_timeout(400); ok(ev("!document.querySelector('#drBody .libside') && !!STAGE.UI.placing"),'✕ ferme le volet, le modèle reste choisi'); opt('fiche:!'); ok(ev("!!document.querySelector('#drBody .libside')"),'le menu Affichage le rouvre'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    # détacher
    pg.click(B+'[data-a=libwin]'); pg.wait_for_timeout(600)
    w=ev("(()=>{const w=document.querySelector('#libWin'),r=w.getBoundingClientRect();return [w.classList.contains('on'),!!w.querySelector('.libx'),!document.querySelector('#drBody .libx'),Math.round(r.left),Math.round(r.top),Math.round(r.width)]})()")
    ok(w[0] and w[1] and w[2],'« Détacher » : la bibliothèque passe dans sa propre fenêtre, le tiroir le dit',w)
    bb=pg.locator('#libWin .lw-bar span').bounding_box(); pg.mouse.move(bb['x']+30,bb['y']+8); pg.mouse.down(); pg.mouse.move(bb['x']+230,bb['y']+68,steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    w2=ev("(()=>{const r=document.querySelector('#libWin').getBoundingClientRect();return [Math.round(r.left),Math.round(r.top)]})()"); ok(w2==[w[3]+200,w[4]+60],'la fenêtre se déplace par sa barre',w2)
    rs=pg.locator('#libWin .lw-rs').bounding_box(); pg.mouse.move(rs['x']+8,rs['y']+8); pg.mouse.down(); pg.mouse.move(rs['x']+108,rs['y']+48,steps=5); pg.mouse.up(); pg.wait_for_timeout(300); ok(ev("Math.round(document.querySelector('#libWin').getBoundingClientRect().width)")==w[5]+100,'et se redimensionne par son coin')
    pg.select_option('#libWin [data-lv=cat]','son'); pg.wait_for_timeout(500); ok(ev("STAGE.UI.libCat")=='son' and ev("document.querySelectorAll('#libWin .lib .th').length")>0,'elle fonctionne détachée : changer de catégorie')
    pg.click('#libWin .lib .th'); pg.wait_for_timeout(400); ok(ev("!!STAGE.UI.placing && !!document.querySelector('#libWin .th.on')"),'choisir un modèle dans la fenêtre détachée')
    pg.keyboard.press('Escape'); pg.screenshot(path=OUT+'/t122.png')
    pg.click('#libWin [data-lw=dock]'); pg.wait_for_timeout(500); ok(ev("!document.querySelector('#libWin').classList.contains('on') && !!document.querySelector('#drBody .libx')"),'« Ancrer » : elle revient dans le tiroir')
    # recherche
    pg.fill(B+'#libQ','par'); pg.wait_for_timeout(900); ok(ev("document.querySelectorAll('#drBody .lib .th').length")>0 and ev("document.querySelector('#drBody [data-lv=cat]').disabled"),'la recherche cherche dans toute la bibliothèque (les listes sont grisées)')
    ok(not errs,'aucune erreur dans la console',errs[:3])
    print('fin','tout passe' if not bad else bad); b.close()
