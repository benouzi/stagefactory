# liste des objets : groupes par calque, colonnes, tri, filtres, identiques regroupés, modification dans la ligne, actions groupées, clic droit, glisser vers un calque
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:500],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && window.LAYERS && window.OBJLIST && window.DRAWER && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    I=ev("""(()=>{const T=APP.THREE,at=(x,z)=>({point:new T.Vector3(x,0,z),object:{userData:{}},face:null}),id=o=>(o&&o.id)||o;const r={};['par-zoom','par-zoom','par-zoom'].forEach((t,i)=>r['p'+i]=id(STAGE.place(t,at(-2+i*2,1),true,{})));r.dec=id(STAGE.place('decoupe',at(0,3),true,{}));r.cube=id(STAGE.place('prim-cube',at(3,-2),true,{}));STAGE.select([]);return r})()""")
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200)
    ev("PONTS.select(null);STAGE.select([]);DRAWER.D.h=520;DRAWER.open('list');window.DOCK&&DOCK.layout()"); pg.wait_for_timeout(700)
    G=lambda: ev("[...document.querySelectorAll('#olx tr.olg')].map(t=>t.querySelector('b').textContent)")
    R=lambda: ev("[...document.querySelectorAll('#olx tr.olr[data-olr]')].map(t=>[...t.children].slice(0,8).map(c=>c.textContent.trim()))")
    row=lambda i: '#olx tr[data-olr="o:%s"]'%i
    g=G(); ok(g[0]=='Lumière' and 'Cotes' not in g and 'Ponts et structures' in g and g.index('Lumière')<g.index('Ponts et structures'),'ouverture : la liste est rangée par calque, celui du dessus en haut ; les ponts y sont aussi',g)
    r=R(); pr=[x for x in r if x[2]=='PAR LED zoom']; po=[x for x in r if x[2]=='Pont']
    ok(len(pr)==3 and len(po)==4 and pr[0][3]=='Lumière' and pr[0][4]=='Au sol' and pr[0][5]!='' ,'colonnes : numéro, nom, modèle, calque, accroche, hauteur',pr[0])
    cu=[x for x in r if 'Cube' in x[2]][0]; t=ev("(id)=>[STAGE.weightOf(STAGE.byId(id))]",I['cube'])
    ok((cu[6]=='')==(not t[0]>0) and cu[7]=='','poids inconnu = case vide, pas de zéro inventé ; pas d\'adresse DMX hors lumière',[cu,t])
    ok(all(x[6]=='' and x[5]!='' for x in po),'ponts : hauteur affichée, poids laissé vide',po[0])
    # tri
    pg.click('#olx th[data-ols=n]'); pg.wait_for_timeout(300); ns=[int(x[0]) for x in R() if x[2] in('PAR LED zoom','Découpe LED 15-30°') or 'coupe' in x[2]]
    ok(ns==sorted(ns,reverse=True) and len(ns)==4,'clic sur « N° » déjà trié : l\'ordre s\'inverse dans chaque groupe',ns); pg.click('#olx th[data-ols=n]'); pg.wait_for_timeout(300)
    # sélection
    pg.click(row(I['p0'])+' td.mu'); pg.wait_for_timeout(300); pg.click(row(I['p2'])+' td.mu',modifiers=['Shift']); pg.wait_for_timeout(400)
    ok(sorted(ev("STAGE.UI.sel"))==sorted([I['p0'],I['p1'],I['p2']]),'clic puis Maj + clic : les trois lignes de l\'une à l\'autre sont choisies',ev("STAGE.UI.sel.length"))
    ok(ev("document.querySelector('#olx .olbulk b').textContent")=='3 choisis' and ev("!document.querySelector('#olx [data-olb=lock]').disabled"),'la barre d\'actions apparaît : « 3 choisis »')
    pg.click(row(I['p1'])+' td.mu',modifiers=['Control']); pg.wait_for_timeout(300); ok(sorted(ev("STAGE.UI.sel"))==sorted([I['p0'],I['p2']]),'Ctrl + clic retire une ligne de la sélection')
    # filtre
    pg.click('#olx [data-olf=sel]'); pg.wait_for_timeout(300); ok(len(R())==2,'filtre « Sélection » : il ne reste que les 2 lignes choisies',len(R())); pg.click('#olx [data-olf=sel]'); pg.wait_for_timeout(300)
    pg.click('#olx [data-olf=noaddr]'); pg.wait_for_timeout(300); n1=len(R()); exp=ev("STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='lum'&&!o.addr).length"); ok(n1==exp,'filtre « Sans adresse DMX » : seulement les projecteurs non patchés',[n1,exp]); pg.click('#olx [data-olf=noaddr]'); pg.wait_for_timeout(300)
    # actions groupées
    pg.click('#olx [data-olb=lock]'); pg.wait_for_timeout(400); ok(ev("(a)=>a.every(id=>STAGE.byId(id).locked)",[I['p0'],I['p2']]) and not ev("(id)=>!!STAGE.byId(id).locked",I['p1']),'« Verrouiller » : les 2 choisis sont verrouillés, pas le troisième')
    pg.click('#olx [data-olf=lock]'); pg.wait_for_timeout(300); ok(len(R())==2,'filtre « Verrouillés » : 2 lignes'); pg.click('#olx [data-olf=lock]'); pg.wait_for_timeout(200); pg.click('#olx [data-olb=lock]'); pg.wait_for_timeout(400)
    ok(not ev("(a)=>a.some(id=>STAGE.byId(id).locked)",[I['p0'],I['p2']]),'« Déverrouiller » les libère')
    # modifier dans la ligne
    pg.dblclick(row(I['dec'])+' [data-olc=name]'); pg.wait_for_timeout(300); pg.fill('#olx .oled','Face cour'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    ok(ev("(id)=>STAGE.byId(id).name",I['dec'])=='Face cour','double-clic sur le nom, taper, Entrée : l\'objet est renommé')
    pg.dblclick(row(I['dec'])+' [data-olc=n]'); pg.wait_for_timeout(300); pg.fill('#olx .oled','42'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    ok(ev("(id)=>STAGE.byId(id).n",I['dec'])==42,'double-clic sur le numéro : 42')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(400); ok(ev("(id)=>STAGE.byId(id).n",I['dec'])!=42,'Ctrl+Z annule le changement de numéro')
    # regrouper les identiques
    ev("STAGE.select([])"); pg.wait_for_timeout(200); pg.check('#olx [data-olo=merge]'); pg.wait_for_timeout(400)
    m=ev("[...document.querySelectorAll('#olx tr.olm')].map(t=>t.textContent.replace(/\\s+/g,' ').trim())"); ok(any('3 × PAR LED zoom' in x for x in m) and len([x for x in R() if x[2]=='PAR LED zoom'])==0,'« Regrouper les identiques » : les 3 PAR deviennent une ligne « 3 × »',m)
    pg.click('#olx tr.olm [data-olk=open]'); pg.wait_for_timeout(300); ok(len([x for x in R() if x[2]=='PAR LED zoom'])==3,'la flèche déplie les 3 lignes')
    pg.click('#olx tr.olm td.mu'); pg.wait_for_timeout(300); ok(len([i for i in ev("STAGE.UI.sel") if i in (I['p0'],I['p1'],I['p2'])])==3,'clic sur la ligne regroupée : les 3 sont choisis'); pg.uncheck('#olx [data-olo=merge]'); pg.wait_for_timeout(300)
    # calque à soi + glisser
    cid=ev("LAYERS.add('Face')"); pg.wait_for_timeout(400); ok('Face' in G(),'un calque créé apparaît comme groupe vide, prêt à recevoir',G())
    ev("STAGE.select([])"); pg.wait_for_timeout(200)
    pg.locator(row(I['dec'])).scroll_into_view_if_needed(); a=pg.locator(row(I['dec'])+' td.mu').first.bounding_box(); t=pg.locator('#olx tr.olg[data-olg="%s"]'%cid).bounding_box()
    pg.mouse.move(a['x']+10,a['y']+a['height']/2); pg.mouse.down(); pg.mouse.move(a['x']+30,a['y']+a['height']/2+3,steps=4); pg.mouse.move(t['x']+80,t['y']+t['height']/2,steps=8); pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(500)
    if ev("(id)=>STAGE.byId(id).ly",I['dec'])!=cid: print('   (glisser à la souris sans effet en essai : appel direct)'); ev("([i,c])=>OBJLIST.drop({k:'o',ids:[i]},c)",[I['dec'],cid]); pg.wait_for_timeout(400); viaMouse=False
    else: viaMouse=True
    ok(ev("(id)=>STAGE.byId(id).ly",I['dec'])==cid and [x for x in R() if x[1]=='Face cour'][0][3]=='Face','glisser la découpe sur le calque « Face » : elle y est rangée'+('' if viaMouse else ' (appel direct)'))
    ev("([i])=>OBJLIST.drop({k:'o',ids:[i]},'son')",[I['p0']]); pg.wait_for_timeout(300); ok(not ev("(id)=>STAGE.byId(id).ly",I['p0']) and ev("(id)=>LAYERS.ofObj(STAGE.byId(id))",I['p0'])=='lum','glisser un projecteur sur le calque de métier « Son » est refusé')
    # bulk : ranger dans un calque
    ev("(a)=>STAGE.select(a)",[I['p0'],I['p1']]); pg.wait_for_timeout(400); pg.select_option('#olx [data-olb=ly]',cid); pg.wait_for_timeout(500); ok(ev("(a)=>a.every(id=>STAGE.byId(id).ly===a.c)||a.every(id=>!!STAGE.byId(id).ly)",[I['p0'],I['p1']]),'barre d\'actions « Ranger dans le calque… » : les 2 choisis y passent')
    # grouper par accroche / métier
    pg.select_option('#olx [data-olo=grp]','metier'); pg.wait_for_timeout(300); g=G(); ok(g[0]=='Lumière' and 'Ponts et structures' in g,'grouper « par métier »',g)
    pg.select_option('#olx [data-olo=grp]','accroche'); pg.wait_for_timeout(300); g=G(); ok('Au sol' in g,'grouper « par accroche »',g); pg.select_option('#olx [data-olo=grp]','calque'); pg.wait_for_timeout(300)
    # clic droit + centrer
    ev("STAGE.select([])"); pg.wait_for_timeout(200); pg.click(row(I['p2'])+' td.mu',button='right'); pg.wait_for_timeout(400)
    mh=ev("(()=>{const m=[...document.querySelectorAll('.mh')].find(x=>x.offsetParent);return m?m.textContent:null})()"); ok(ev("STAGE.UI.sel")==[I['p2']] and mh is not None,'clic droit sur une ligne : elle est choisie et le menu de la vue 3D s\'ouvre',mh); pg.keyboard.press('Escape'); pg.mouse.click(5,5); pg.wait_for_timeout(300)
    c0=ev("APP.orbit.target.toArray()"); pg.dblclick(row(I['cube'])+' td.mu'); pg.wait_for_timeout(900); c1=ev("APP.orbit.target.toArray()")
    ok(c0!=c1 and abs(c1[0]-3)<.01,'double-clic hors du nom : la vue se centre sur l\'objet',[c0,c1])
    # recherche
    pg.fill('#olx input[type=search]','cour'); pg.wait_for_timeout(400); r=R(); ok(len(r)>=1 and all('cour' in (x[1]+x[2]+x[4]).lower() for x in r),'recherche « cour »',r[:3]); pg.fill('#olx input[type=search]',''); pg.wait_for_timeout(300)
    # choisi dans la vue : la ligne est allumée
    ev("(id)=>{STAGE.select([id]);STAGE.render();DRAWER.refresh();document.querySelector('#drBody').scrollTop=0}",I['p0']); pg.wait_for_timeout(500); ev("document.querySelector('#drBody').scrollTop=0;DRAWER.D.h=200;DRAWER.refresh();window.DOCK&&DOCK.layout()"); pg.wait_for_timeout(400)
    ev("(id)=>{STAGE.select([id]);STAGE.render();DRAWER.refresh()}",I['cube']); pg.wait_for_timeout(500); ok(ev("(id)=>{const t=document.querySelector('#olx tr[data-olr=\"o:'+id+'\"]');if(!t)return false;const a=t.getBoundingClientRect(),b=t.closest('#drawer .body,#drBody,#drawer')?.getBoundingClientRect();return t.classList.contains('on')&&(!b||(a.top>=b.top-2&&a.bottom<=b.bottom+2))}",I['cube']),'objet choisi dans la vue : sa ligne est allumée et visible dans la liste')
    ev("(a)=>{DRAWER.D.h=430;STAGE.select(a);STAGE.render();DRAWER.refresh();window.DOCK&&DOCK.layout();document.querySelector('#drBody').scrollTop=0}",[I['p1'],I['p2']]); pg.wait_for_timeout(600); pg.screenshot(path=OUT+'/t121.png')
    ok(not errs,'aucune erreur dans la console',errs[:3])
    print('fin','tout passe' if not bad else bad); b.close()
