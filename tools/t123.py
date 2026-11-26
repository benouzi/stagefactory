# line array : pose à la souris, inspecteur, boîtes A/B/C, cadre et barre d'extension, supports, couverture sur le plan, pont porteur, mes modèles, fiche
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
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && window.LARRAY && window.LAYERS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("localStorage.removeItem('laUser')")
    # un gril pour le pont porteur
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200); ev("PONTS.select(null)")
    tr=ev("(()=>{const s=STAGE.S.sups.filter(s=>s.kind==='truss').find(s=>Math.abs(s.a.y-s.b.y)<1&&-(s.a.y)/1000>-1)||STAGE.S.sups.find(s=>s.kind==='truss');return {id:s.id,x:(s.a.x+s.b.x)/2000-2,z:-(s.a.y+s.b.y)/2000,zm:s.zMm,name:s.name}})()")
    W="([x,z])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+x*PLAN.P.s,r.top+PLAN.P.oy+z*PLAN.P.s]}"
    # ---- pose à la souris : 2 clics
    ev("LARRAY.tool()"); pg.wait_for_timeout(300); a=ev(W,[tr['x'],tr['z']]); c=ev(W,[tr['x'],tr['z']+4])
    pg.mouse.click(*a); pg.wait_for_timeout(300); pg.mouse.move(c[0],c[1],steps=4); pg.wait_for_timeout(200); ok(ev("LARRAY.tl&&LARRAY.tl.step")==1 and ev("STAGE.S.arrays?STAGE.S.arrays.length:0")==0,'outil Line array : 1er clic = position, rien n\'est encore posé'); pg.mouse.click(*c); pg.wait_for_timeout(900)
    A0=ev("(()=>{const a=STAGE.S.arrays[0];return a&&{x:a.x,z:a.z,yaw:a.yaw,sid:a.sid,top:a.topY,n:a.objs.length,types:a.objs.map(id=>STAGE.byId(id).type),sel:STAGE.UI.sel.length,tl:LARRAY.tl}})()")
    ok(A0 and abs(A0['x']-tr['x'])<.06 and abs(A0['z']-tr['z'])<.06 and abs(A0['yaw'])<2 and A0['n']==9 and A0['types'][0]=='la-bump' and A0['types'].count('lab-kara2')==8 and A0['tl'] is None,'2e clic = orientation : la ligne est posée, un cadre + 8 boîtes',A0)
    ok(A0['sid']==tr['id'] and abs(A0['top']-(tr['zm']/1000-.8))<.02,'posée sous un pont : elle s\'y accroche toute seule',[A0['sid'],A0['top']])
    L=lambda: ev("(id)=>{const s=STAGE.S.sups.find(s=>s.id===id);return (s.loads||[]).filter(l=>l.la).map(l=>l.kg)}",tr['id'])
    ok(L()==[208],'son poids (8 × 26 kg, cadre non relevé) est une charge du pont',L()); ok(ev("(id)=>PONTS.resOf(id).extraKg",tr['id'])==208,'le calcul du pont la compte')
    ins=ev("(()=>{const c=document.querySelector('#console');return [!!c.querySelector('[data-lb=cfg]'),!!c.querySelector('[data-la=topY]'),c.innerText.includes('208 kg')]})()"); ok(ins==[True,True,True],'le cadre est choisi : l\'inspecteur montre la ligne (poids, hauteur, « Configurer la ligne… »)',ins)
    pg.fill('#console [data-la=n]','6'); pg.keyboard.press('Tab'); pg.wait_for_timeout(600); ok(ev("STAGE.S.arrays[0].objs.length")==7 and L()==[156],'6 boîtes depuis l\'inspecteur : la scène et la charge du pont suivent',L())
    # ---- configuration : boîtes mélangées
    pg.click('#console [data-lb=cfg]'); pg.wait_for_timeout(400); pg.click('#modal [data-latab=B]'); pg.wait_for_timeout(200); pg.select_option('#modal [data-la=B_model]','v8'); pg.wait_for_timeout(300)
    pg.click('#modal [data-latab=array]'); pg.wait_for_timeout(200); pg.fill('#modal [data-la=addN]','2'); pg.keyboard.press('Tab'); pg.click('#modal [data-lb=add][data-id=B]'); pg.wait_for_timeout(400)
    R=ev("(()=>{const a=LARRAY.cur,R=LARRAY.solve(a);return {k:R.boxes.map(b=>b.k).join(''),W:R.mech.W,h:R.boxes.map(b=>b.h),th:R.boxes.map(b=>b.th)}})()"); ok(R['k']=='AAAAAABB' and R['W']==6*26+2*34 and R['h'][7]==.31,'onglet Enceinte B = d&b V8, « + B » × 2 : 6 Kara II puis 2 V8, 224 kg',R)
    pg.click('#modal [data-lb=up][data-i="6"]'); pg.wait_for_timeout(300); ok(ev("LARRAY.solve(LARRAY.cur).boxes.map(b=>b.k).join('')")=='AAAAABAB','▲ remonte une boîte dans la liste')
    pg.click('#modal [data-lb=rm][data-i="5"]'); pg.wait_for_timeout(300); ok(ev("LARRAY.solve(LARRAY.cur).boxes.map(b=>b.k).join('')")=='AAAAAAB' and ev("STAGE.S.arrays[0].objs.map(id=>STAGE.byId(id).type).filter(t=>t==='lab-v8').length")==1,'✕ retire une boîte ; dans la scène il reste 1 V8')
    # ---- cadre et barre d'extension
    pg.click('#modal [data-latab=bumper]'); pg.wait_for_timeout(200); pg.fill('#modal [data-la=frameKg]','20'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300)
    m0=ev("(()=>{const M=LARRAY.solve(LARRAY.cur).mech;return [M.W,M.single,M.singleOk]})()"); ok(m0[0]==6*26+34+20,'cadre saisi à 20 kg : 210 kg',m0)
    ev("(()=>{const a=LARRAY.cur;a.site=25;})()"); pg.check('#modal [data-la=e_on]'); pg.wait_for_timeout(300); m1=ev("(()=>{const R=LARRAY.solve(LARRAY.cur);return [R.mech.single,R.mech.singleOk,R.span,R.mech.W]})()")
    pg.fill('#modal [data-la=e_kg]','8'); pg.keyboard.press('Tab'); pg.wait_for_timeout(200); pg.fill('#modal [data-la=e_len]','1500'); pg.keyboard.press('Tab'); pg.wait_for_timeout(200); pg.fill('#modal [data-la=e_shift]','500'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300)
    m2=ev("(()=>{const R=LARRAY.solve(LARRAY.cur);return [R.mech.single,R.mech.singleOk,R.span,R.mech.W,R.ext]})()"); ok(m2[3]==218 and abs((m2[2][1]-m2[2][0])-max(1.5,.5+1.5))<.52 and m2[2][0]<-1.4,'barre d\'extension 1,5 m, 8 kg, déportée de 50 cm vers l\'arrière : 218 kg, la plage d\'accroche s\'allonge vers l\'arrière',m2)
    wr=ev("document.querySelector('#modal').innerText"); ok(('hors du cadre' in wr)==(not m2[1]),'l\'avertissement « point unique hors du cadre » suit le calcul',[m2[0],m2[1]])
    ev("(()=>{const a=LARRAY.cur;a.site=2;})()")
    # ---- couverture
    pg.click('#modal [data-latab=cover]'); pg.wait_for_timeout(200); pg.click('#modal [data-latab=array]'); pg.click('#modal [data-lb=auto]'); pg.wait_for_timeout(300); pg.click('#modal [data-latab=cover]'); pg.fill('#modal [data-la=throw]','15'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300)
    far=ev("LARRAY.solve(LARRAY.cur).boxes.map(b=>!!(b.hit&&b.hit.far))"); ok(far[0] and not far[-1] and 'portée 15 m' in ev("document.querySelector('#modal svg').textContent"),'portée de 15 m : les boîtes du haut visent hors de portée, l\'arc de portée est tracé',far)
    va=ev("LARRAY.solve(LARRAY.cur).boxes.map(b=>[b.fromAngles,+(b.lo-b.hi).toFixed(1)])"); ok(va[0]==[False,10] and va[-1][0]==True,'ouverture verticale : celle du fabricant pour Kara II (10°), déduite des angles pour la V8 (non publiée)',[va[0],va[-1]])
    pg.fill('#modal [data-la=throw]','40'); pg.keyboard.press('Tab'); pg.wait_for_timeout(200); ev("document.querySelector('#modal').style.display='none'"); ev("STAGE.select([])"); pg.wait_for_timeout(500)
    CNT="""()=>{PLAN.draw();const cv=document.querySelector('#plan2d'),d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<d.length;i+=16)if(d[i]>200&&d[i+1]>150&&d[i+1]<240&&d[i+2]<215&&d[i]-d[i+2]>25)n++;return n}"""
    h1=ev(CNT); ev("STAGE.S.arrays[0].show={hatch:false}"); h0=ev(CNT); ev("STAGE.S.arrays[0].show={}"); ok(h1>h0+200,'empreinte hachurée de la couverture tracée sur le plan (et retirée quand on la décoche)',[h0,h1]); pg.screenshot(path=OUT+'/t123_plan.png')
    # ---- la ligne suit le cadre qu'on déplace
    x0=ev("STAGE.S.arrays[0].x"); y0=ev("STAGE.S.arrays[0].topY"); ev("(()=>{const a=STAGE.S.arrays[0],o=STAGE.byId(a.objs[0]);o.pos[0]+=1;o.pos[1]-=.5;STAGE.unbuild(o.id);STAGE.build(o);STAGE.touch()})()"); pg.wait_for_timeout(1000)
    mv=ev("(()=>{const a=STAGE.S.arrays[0],E=LARRAY.expected(a).L;return [a.x,a.topY,a.objs.every((id,i)=>Math.abs(STAGE.byId(id).pos[0]-E[i].pos[0])<.002)]})()"); ok(abs(mv[0]-x0-1)<.01 and abs(mv[1]-(y0-.5))<.01 and mv[2],'cadre déplacé de 1 m et descendu de 50 cm : toute la ligne suit',mv)
    # ---- supports
    ev("LARRAY.tab='array';LARRAY.open()"); pg.wait_for_timeout(300); pg.select_option('#modal [data-la=support]','ground'); pg.wait_for_timeout(500)
    g=ev("(()=>{const a=LARRAY.cur,R=LARRAY.solve(a);return {ys:R.boxes.map(b=>+b.M[1].toFixed(2)),sid:a.sid||null,hang:a.objs.map(id=>STAGE.byId(id).hang||''),bump:STAGE.byId(a.objs[0]).pos[1]}})()")
    ok(all(g['ys'][i]<g['ys'][i+1] for i in range(len(g['ys'])-1)) and g['ys'][0]<.4 and g['sid'] is None and set(g['hang'])=={''} and L()==[],'« Posée au sol » : les boîtes s\'empilent vers le haut sur le cadre, plus d\'accroche ni de charge sur le pont',g)
    pg.select_option('#modal [data-la=support]','tripod'); pg.wait_for_timeout(500); t=ev("(()=>{const a=LARRAY.cur;return [a.objs.map(id=>STAGE.byId(id).type).includes('la-bump'),+LARRAY.solve(a).boxes[0].F[1].toFixed(2)]})()"); ok(t==[False,1.8],'« Sur pied » : pas de cadre, première boîte à 1,80 m',t)
    pg.select_option('#modal [data-la=support]','flown'); pg.wait_for_timeout(400); pg.click('#modal [data-latab=fiche]'); pg.click('#modal [data-lb=load]'); pg.wait_for_timeout(500); ok(len(L())==1 and L()[0]==218,'de nouveau suspendue, « Accrocher au pont le plus proche » : 218 kg sur le pont',L())
    # ---- fiche et étiquette
    pg.fill('#modal [data-la=m_col]','L1'); pg.keyboard.press('Tab'); pg.fill('#modal [data-la=m_rack]','Rack A'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300); ok(ev("JSON.stringify(STAGE.S.arrays[0].meta)")=='{"col":"L1","rack":"Rack A"}','fiche de la ligne : identifiant de colonne, rack')
    # ---- mes modèles
    pg.click('#modal [data-latab=C]'); pg.select_option('#modal [data-la=C_model]','libre'); pg.wait_for_timeout(300); pg.fill('#modal [data-la=C_f_name]','Down-fill maison'); pg.keyboard.press('Tab'); pg.fill('#modal [data-la=C_f_kg]','18'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300)
    t=ev("document.querySelector('#modal').innerText"); ok('ouverture inconnue' in t and 'ouverture verticale par boîte non publiée' in t,'modèle libre : ce qui n\'est pas saisi reste « inconnu »')
    pg.click('#modal [data-lb=saveBox]'); pg.wait_for_timeout(400); u=ev("LARRAY.USER.boxes"); ok(u and u[0]['name']=='Down-fill maison' and u[0]['kg']==18 and u[0]['hd'] is None and ev("STAGE.S.arrays[0].types.C.model").startswith('u:'),'« Enregistrer dans mes modèles » : gardé pour les autres projets, données inconnues laissées vides',u)
    ok(ev("!!document.querySelector('#modal [data-la=C_model] optgroup[label=\"Mes modèles\"]')"),'il apparaît dans la liste des modèles')
    pg.screenshot(path=OUT+'/t123.png'); ev("document.querySelector('#modal').style.display='none'")
    # ---- enregistrer, recharger, supprimer
    d=ev("STAGE.serialize()"); ev("STAGE.loadShow(STAGE.blankShow())"); ev("(d)=>STAGE.loadShow(JSON.parse(d))",d); pg.wait_for_timeout(1500)
    r=ev("(()=>{const a=STAGE.S.arrays[0],R=LARRAY.solve(a);return [R.boxes.map(b=>b.k).join(''),R.mech.W,a.meta.col,a.objs.length,a.ext.on]})()"); ok(r==['AAAAAAB',218,'L1',8,True],'projet rechargé : composition, cadre, barre, fiche retrouvés',r)
    ev("LARRAY.remove(STAGE.S.arrays[0])"); pg.wait_for_timeout(500); ok(ev("STAGE.S.arrays.length")==0 and L()==[] and ev("STAGE.S.objs.filter(o=>o.la).length")==0,'ligne supprimée : ses boîtes et sa charge sur le pont partent avec')
    ok(not errs,'aucune erreur dans la console',errs[:3])
    print('fin','tout passe' if not bad else bad); b.close()
