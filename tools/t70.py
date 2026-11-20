# Points d'accroche posés d'abord, pont sans moteur, découpe optimisée, longueur tapée.
import os, sys
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && !!PONTS.link",timeout=60000); pg.wait_for_timeout(1500)
    ev("PLAN.fit();PLAN.draw()")
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    ev("document.querySelector('[data-dom=rig]').click()"); pg.click('#rail [data-t=hpt]'); pg.wait_for_timeout(200)
    ok(ev("PONTS.tl && PONTS.tl.k")=='point' and 'Point d\'accroche' in ev("document.querySelector('#pontBar').innerText"),'outil Point d\'accroche armé')
    # grille 2 × 2 : 8 m en largeur, 6 m en profondeur, hauteur 9 m, capacité 500 kg
    for k,v in [('hM','9'),('cap','500'),('nx','2'),('ex','8'),('nz','2'),('ez','6')]: pg.fill('#pontBar [data-pq=%s]'%k,v); pg.keyboard.press('Tab'); pg.wait_for_timeout(80)
    pg.mouse.move(*P(0.02,-4.01)); pg.wait_for_timeout(100); pg.mouse.click(*P(0.02,-4.01)); pg.wait_for_timeout(300)
    pts=ev("STAGE.S.sups.filter(s=>s.kind==='point').map(s=>[s.a.x,s.a.y,s.zMm,s.pt.kind,s.pt.capacityKg,s.name])")
    ok(len(pts)==4 and sorted((q[0],q[1]) for q in pts)==[(-4000,1000),(-4000,7000),(4000,1000),(4000,7000)] and all(q[2]==9000 and q[3]=='hoist' and q[4]==500 for q in pts),'4 moteurs posés en grille 8 × 6 m, sans aucun pont',pts)
    pg.keyboard.press('Escape'); ok(ev("PONTS.results().size")==0,'aucun pont : rien à calculer')
    # pont tracé sous deux moteurs : il les reprend, sans en ajouter
    pg.click('#rail [data-t=truss]'); pg.wait_for_timeout(200); pg.mouse.click(*P(-5,-1)); pg.mouse.move(*P(5,-1.02)); pg.wait_for_timeout(100); pg.mouse.click(*P(5,-1.02)); pg.wait_for_timeout(300)
    s=ev("STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>({L:PONTS.len(s),p:s.points.map(p=>[p.alongMm,p.kind,p.capacityKg,p.originHMm,!!p.pid])}))")
    ok(len(s)==1 and s[0]['L']==10000 and s[0]['p']==[[1000,'hoist',500,9000,True],[9000,'hoist',500,9000,True]],'pont de 10 m : porté par les deux moteurs déjà posés, à 1 m de chaque bout',s)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
    # pont seul, sans point
    pg.click('#rail [data-t=truss]'); pg.select_option('#pontBar [data-po=hang]','none'); pg.mouse.click(*P(-3,3)); pg.mouse.move(*P(3,3)); pg.wait_for_timeout(100)
    ok(ev("!!document.querySelector('#pontBar [data-po=len]')"),'après le premier clic : champ Longueur')
    # longueur tapée : 6,37 m → découpe la plus proche
    pg.fill('#pontBar [data-po=len]','6.37'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    t=ev("(()=>{const s=STAGE.S.sups.filter(s=>s.kind==='truss')[1];return {L:PONTS.len(s),pc:s.pieces,pts:s.points.length,k:s.kgPerM,a:s.a,b:s.b}})()")
    ok(t['pts']==0,'pont posé sans aucun point d\'accroche',t)
    ok(t['L']==6290 and sorted(t['pc'])==[290,2000,4000] and t['k']>0,'6,37 m tapés : longueur réalisable la plus proche, pièces du catalogue, poids connu',t)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
    # optimisation : toutes les pièces, le moins possible
    r=ev("(()=>{const se=PONTS.C.seriesOf('prolyte-h30v');return [PONTS.bestComp(se,9290),PONTS.bestComp(se,12000),PONTS.bestComp(se,6370),PONTS.nearComps(se,9300,false,5).map(o=>o.mm)]})()")
    ok(r[0]['mm']==9290 and sorted(r[0]['pieces'])==[290,1000,4000,4000] and r[1]['pieces']==[4000,4000,4000] and len(r[2]['pieces'])<=3,'9,29 m = 2 × 4 + 1 + 0,29 ; 12 m = 3 × 4',r)
    # inspecteur : longueur 7,3 → 7,29 proposé ; longueurs voisines cliquables
    sid=ev("STAGE.S.sups.filter(s=>s.kind==='truss')[1].id"); ev("(id)=>PONTS.select(id)",sid); pg.wait_for_timeout(200); pg.fill('#console [data-pk=lenM]','7.3'); pg.keyboard.press('Tab'); pg.wait_for_timeout(400)
    t=ev("(id)=>{const s=PONTS.byId(id);return {L:PONTS.len(s),pc:s.pieces}}",sid); ok(t['L']==7290 and sorted(t['pc'])==[290,3000,4000],'7,3 m dans l\'Inspecteur : ramené à 7,29 m (4 + 3 + 0,29)',t)
    ok(ev("document.querySelectorAll('#console [data-pa=lenSet]').length")>=3,'longueurs réalisables voisines proposées',ev("[...document.querySelectorAll('#console [data-pa=lenSet]')].map(b=>b.textContent)"))
    # rig : le pont sans point le dit, sans chiffre
    r=ev("(id)=>{const r=PONTS.resOf(id);return [r.error,r.points.length]}",sid); ok(r[0] and 'Aucun point' in r[0],'pont sans point : « aucun point d\'accroche défini », aucun chiffre',r)
    # déplacer un moteur le long du pont : le point du pont suit ; le sortir du pont : il se détache
    m=ev("STAGE.S.sups.find(s=>s.kind==='point'&&s.a.x===-4000&&s.a.y===1000).id"); ev("(id)=>{PONTS.select(id)}",m); pg.wait_for_timeout(200)
    ok('Porte' in ev("document.querySelector('#console').innerText"),'Inspecteur du moteur : dit quel pont il porte'); pg.fill('#console [data-pk=cx]','-2'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300)
    ok(ev("STAGE.S.sups.filter(s=>s.kind==='truss')[0].points.map(p=>p.alongMm)")==[3000,9000],'moteur déplacé de 2 m : le point du pont suit')
    pg.fill('#console [data-pk=cz]','-4'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300); ok(ev("STAGE.S.sups.filter(s=>s.kind==='truss')[0].points.length")==1,'moteur sorti de sous le pont : il n\'est plus un de ses points')
    ev("document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(400); ok(ev("STAGE.S.sups.filter(s=>s.kind==='truss')[0].points.length")==2,'Ctrl+Z : il le reprend'); pg.keyboard.press('Control+z'); pg.wait_for_timeout(400)
    # gril sur les 4 moteurs : un moteur d'angle porte deux ponts
    ev("(()=>{PONTS.O.hang='auto';for(const [a,b] of [[[-4,-7],[4,-7]],[[-4,-7],[-4,-1]],[[4,-7],[4,-1]]])PONTS.addTruss({x:a[0]*1000,y:-a[1]*1000},{x:b[0]*1000,y:-b[1]*1000},null,true);STAGE.touch()})()"); pg.wait_for_timeout(300)
    n=ev("STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>s.points.filter(p=>p.pid).length)"); ok(n[2:]==[2,2,2],'ponts ajoutés sur les moteurs : chacun repris par deux moteurs d\'angle',n)
    d=ev("STAGE.serialize()"); ev("STAGE.loadShow(STAGE.blankShow())"); ev("(d)=>STAGE.loadShow(JSON.parse(d))",d); pg.wait_for_timeout(400); ok(ev("STAGE.S.sups.filter(s=>s.kind==='point').length")==4 and ev("STAGE.S.sups.filter(s=>s.kind==='truss').length")==5,'enregistré et rechargé')
    ev("PONTS.select(null);PLAN.fit();PLAN.draw();DRAWER.open('rig')"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t70.png')
    ok(not errs,'aucune erreur de script',errs[:4]); b.close()
print('ÉCHECS :',bad if bad else 'aucun')
