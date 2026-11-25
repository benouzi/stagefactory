# hauteurs, même logique : flèche verticale d'une travée = tout son niveau monte, les tours s'allongent ; avec Ctrl = un étage au-dessus, porté par deux montants
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:520],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200)
    pg.wait_for_function("!!PONTS.gz",timeout=30000)
    Z="Object.fromEntries(STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name.split(' · ')[1],s.zMm]))"
    LG="STAGE.S.sups.filter(s=>s.kind==='truss').flatMap(s=>(s.points||[]).filter(p=>p.leg).map(p=>[s.name.split(' · ')[1],p.baseMm||0,PONTS.legMm(s,p),PONTS.legMm(s,p)-PONTS.legPieces(s,p).reduce((a,b)=>a+b,0)]))"
    AB="Object.fromEntries(STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name.split(' · ')[1],[s.a.x,s.a.y,s.b.x,s.b.y]]))"
    z0=ev(Z); l0=ev(LG); ab0=ev(AB); fid=ev("STAGE.S.sups.find(s=>s.name.endsWith('face')).id")
    sel=lambda i:(ev("PONTS.select('%s')"%i),pg.wait_for_timeout(500),pg.click('.ptree [data-id="po|%s"]'%i,timeout=8000),pg.wait_for_timeout(800))
    go=lambda dy,ctrl:(ev("([dy,c])=>{const z=PONTS.gz;z.start(false,c);z.proxy.position.y+=dy;z.apply(false);z.end()}",[dy,ctrl]),pg.wait_for_timeout(1100))
    sel(fid); ok(ev("PONTS.gz.gz.showY&&!!PONTS.gz.span"),'travée choisie : la flèche de hauteur est là')
    # monter de 1 m : tout le niveau, les tours s'allongent
    go(1,False); z1=ev(Z); l1=ev(LG)
    ok(len(set(z1.values()))==1 and abs(z1['face']-z0['face']-1000)<=250 and all(abs(q[3])<=2 for q in l1) and all(b_[2]-a_[2]==z1['face']-z0['face'] for a_,b_ in zip(l0,l1)) and ev(AB)==ab0 and ev("PONTS.nodes().length")==4,'flèche verticale, +1 m : les quatre travées montent ensemble d\'environ 1 m, à la hauteur où les tours tombent juste en pièces de la gamme ; rien ne bouge au sol',[z1,l1[0]])
    # Ctrl : un étage
    go(2,True); z2=ev(Z); l2=ev(LG); ab=ev(AB); up=[q for q in l2 if q[0]=='face haut']
    ok(abs(z2.get('face haut',0)-z1['face']-2000)<=250 and all(z2[k]==z1[k] for k in z1) and ab.get('face haut')==ab0['face'],'Ctrl + flèche verticale, +2 m : la face reste, une travée « face haut » naît 2 m au-dessus, à l\'aplomb',z2)
    ok(len(up)==2 and all(600<=q[1]-z1['face']<=700 for q in up) and all(500<=q[2]<=2000 and abs(q[3])<=2 for q in up) and len(l2)==len(l1)+2,'elle est portée par deux montants qui partent du dessus de la face (pas du sol) et tombent juste en pièces de la gamme',up)
    r=ev("[PONTS.structs().map(q=>[q.name,q.m.length]),PONTS.sel===STAGE.S.sups.find(s=>s.name.endsWith('face haut')).id,[...document.querySelectorAll('.ptree>div')].filter(d=>/Montant/.test(d.innerText)).length]"); ok(r[0]==[['Gril',5]] and r[1] and r[2]==2,'toujours UNE structure (5 travées) ; la nouvelle travée est choisie ; l\'arbre montre ses deux montants',r)
    ev("(()=>{APP.camera.position.set(-11,11,13);APP.orbit.target.set(0,4,-2);APP.orbit.update()})()"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/t94.png',clip={'x':60,'y':45,'width':1090,'height':560})
    hi=ev("(()=>{let n=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isInstancedMesh)n+=o.count});return n})()")
    # la travée du haut seule
    go(.5,False); z3=ev(Z); ok(abs(z3['face haut']-z2['face haut']-500)<=250 and z3['face haut']>z2['face haut'] and all(z3[k]==z2[k] for k in z1),'flèche verticale sur la travée du haut : elle seule monte, ses montants s\'allongent',z3)
    # le niveau du bas : les montants repartent de plus haut, la travée du haut ne bouge pas
    sel(fid); go(.5,False); z4=ev(Z); l4=[q for q in ev(LG) if q[0]=='face haut']
    ok(len(set(z4[k] for k in z1))==1 and 250<=z4['face']-z3['face']<=750 and z4['face haut']==z3['face haut'] and all(q[1]-up[0][1]==z4['face']-z3['face'] for q in l4),'flèche verticale sur le niveau du bas : il monte, les montants partent d\'autant plus haut, la travée du haut reste',[z4,l4])
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(4): pg.keyboard.press('Control+z'); pg.wait_for_timeout(700)
    ok(ev(Z)==z0 and ev(LG)==l0,'quatre Ctrl+Z : le gril d\'origine',ev(Z))
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
