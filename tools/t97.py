# jonctions en hauteur : coin à départ vertical sous un montant, pieds posés sur ce qu'il y a dessous (sinon au sol), hauteurs qui tombent juste
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1500)
    pg.wait_for_function("!!PONTS.gz",timeout=30000)
    LG="STAGE.S.sups.filter(s=>s.kind==='truss').flatMap(s=>(s.points||[]).filter(p=>p.leg).map(p=>[s.name.split(' · ')[1],p.baseMm||0,PONTS.legMm(s,p),PONTS.legMm(s,p)-PONTS.legPieces(s,p).reduce((a,b)=>a+b,0),Math.round(s.zMm)]))"
    SP="Object.fromEntries(STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name.split(' · ')[1],PONTS.piecesOf(s).reduce((a,b)=>a+b,0)-PONTS.spanMm(s)]))"
    ND="PONTS.nodes().map(n=>[Math.round(n.at.x),Math.round(n.at.y),Math.round(n.z),n.members.length,!!n.tower,!!n.up,n.ways])"
    ID=lambda n: ev("STAGE.S.sups.find(s=>s.name.endsWith(' · %s')).id"%n)
    sel=lambda i:(ev("PONTS.select('%s')"%i),pg.wait_for_timeout(500),pg.click('.ptree [data-id="po|%s"]'%i,timeout=8000),pg.wait_for_timeout(800))
    def go(dx,dy,dz,ctrl=False): ev("([dx,dy,dz,c])=>{const z=PONTS.gz;z.start(false,c);z.proxy.position.x+=dx;z.proxy.position.y+=dy;z.proxy.position.z+=dz;z.apply(false);z.end()}",[dx,dy,dz,ctrl]); pg.wait_for_timeout(1100)
    allfit=lambda: all(abs(q[3])<=5 for q in ev(LG)) and all(abs(v)<=5 for v in ev(SP).values())
    l0=ev(LG); ok(all(abs(q[3])<=5 for q in l0) and len(set(q[4] for q in l0))==1,'gril posé : la hauteur est réglée pour que les tours tombent juste, sans manque',l0[:2])
    # un étage sur la face
    fid=ID('face'); sel(fid); go(0,2,0,True); l1=ev(LG); nd=ev(ND); up=[q for q in l1 if q[0]=='face haut']; z=l0[0][4]
    ok(len(up)==2 and all(abs(q[1]-(z+144+500))<=3 for q in up) and allfit(),'étage : les deux montants partent du bras haut du coin (50 cm au-dessus de l\'axe), et tombent juste',up)
    lowc=[n for n in nd if n[2]==z and n[1]==0]; ok(len(lowc)==2 and all(n[5] and n[4] and n[6]==4 for n in lowc),'les deux coins de la face ont maintenant un départ vers le haut : 4 départs (2 travées, la tour, le montant)',lowc)
    upc=[n for n in nd if n[2]>z+500]; ok(len(upc)==2 and all(n[3]==1 and n[4] for n in upc),'en haut, chaque bout de la travée a son coin, avec son départ vers le bas',upc)
    ev("(()=>{APP.camera.position.set(-7,7.5,5);APP.orbit.target.set(-3.5,5.5,0);APP.orbit.update()})()"); pg.wait_for_timeout(1300); pg.screenshot(path=OUT+'/t97-coin.png',clip={'x':60,'y':45,'width':1090,'height':560})
    # prolonger la travée du haut vers le public : rien dessous, ses nouveaux pieds descendent au sol ; vers le lointain : au-dessus du gril, ils se posent dessus
    hid=ID('face haut'); sel(hid); go(0,0,3,True); l2=ev(LG); f2=[q for q in l2 if q[0]=='face haut 2']
    ok(len(f2)==2 and all(q[1]==0 for q in f2),'prolonger la travée du haut au-dessus du vide : ses pieds descendent jusqu\'au sol, avec leur embase',f2)
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(900)
    sel(hid); go(0,0,-6,True); l3=ev(LG); f3=[q for q in l3 if q[0]=='face haut 2']; nd=ev(ND)
    ok(len(f3)==2 and all(abs(q[1]-(z+144+500))<=3 for q in f3) and len([n for n in nd if n[2]==z and n[5]])==4,'prolonger la travée du haut jusqu\'au-dessus du lointain : ses pieds se posent sur les coins du gril, qui prennent un départ vers le haut ; aucune tour ne traverse le gril',[f3,[n for n in nd if n[5]]])
    ok(ev("PONTS.structs().length")==1,'une seule structure',ev("PONTS.structs().map(q=>[q.name,q.m.length])"))
    # monter le gril du bas : tout retombe juste
    sel(fid); go(0,.6,0); l4=ev(LG); ok(all(abs(q[3])<=5 for q in l4),'monter le niveau du bas : tours et montants retombent juste',[(q[0],q[2],q[3]) for q in l4])
    ev("(()=>{APP.camera.position.set(-12,12,13);APP.orbit.target.set(0,4,-3);APP.orbit.update()})()"); pg.wait_for_timeout(1300); pg.screenshot(path=OUT+'/t97.png',clip={'x':60,'y':45,'width':1090,'height':560})
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
