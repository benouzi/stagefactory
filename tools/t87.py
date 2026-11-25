# Structure, lot 2 : gammes triangulaires et échelles, coins réels (soudés à bras ou cubes d'angle), longueur réelle des travées entre les coins, nomenclature cohérente.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ids=ev("(async()=>{const C=await import('./sceno-core.js');return C.TRUSS_LIB.map(s=>[s.id,s.shape||'carré',s.cornerArmMm,s.lengths.filter(l=>l[1]==null).length])})()")
    ok(len(ids)==10 and ['prolyte-h30d','tri',500,0] in ids and ['prolyte-h30l','ladder',None,0] in ids and ['prolyte-x30v','carré',500,0] in ids and ['prolyte-h40v','carré',600,0] in ids,'10 gammes : triangulaires, échelles, X30V complété, coin H40V à 600 mm',ids)
    # cadre H30V 6 × 4 m posé d'axe en axe
    ev("(()=>{PONTS.O.series='prolyte-h30v';PONTS.O.hang='none';PONTS.O.corner='weld';PONTS.O.zMm=3000;const A=[[-3000,2000],[3000,2000],[3000,-2000],[-3000,-2000]];A.forEach((p,i)=>{const q=A[(i+1)%4];PONTS.addTruss({x:p[0],y:p[1]},{x:q[0],y:q[1]},null,true)});PONTS.select(null);PONTS.changed()})()"); pg.wait_for_timeout(900)
    r=ev("STAGE.S.sups.map(s=>[PONTS.arms(s),PONTS.spanMm(s),PONTS.piecesOf(s)])"); ok(all(x[0]==[500,500] for x in r) and r[0][1]==5000 and sum(r[0][2])==5000 and sum(r[1][2])==3000,'coins soudés : chaque coin prend 50 cm, les éléments droits couvrent 5 m et 3 m',r)
    bm=ev("(b=>({l:b.lines.map(l=>[l.item,l.code,l.qty,l.kgEach]),t:b.totalKg,n:b.notes}))(PONTS.bom())"); droit=sum(q*float(i.split(' ')[2].replace(',','.')) for i,c,q,k in bm['l'] if i.startswith('élément droit'))
    ok(abs(droit-16)<1e-6 and any(c=='H30V-C003' and q==4 for i,c,q,k in bm['l']),'nomenclature : 16 m d\'éléments droits et 4 coins C003',bm['l'])
    n=ev("(()=>{let n=0,cm=0;APP.scene.traverse(o=>{if(o.isInstancedMesh&&o.userData.truss){n+=o.count}});return n})()"); ok(n>400,'3D : travées et bras des coins dessinés',n)
    ev("document.querySelector('#view3d')?.click();(()=>{APP.camera.position.set(-4.6,3.9,3.4);APP.orbit.target.set(-3,3.1,-2);APP.orbit.update()})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t87-coin.png',clip={'x':60,'y':80,'width':1090,'height':520})
    # cubes d'angle
    ev("PONTS.O.corner='box';PONTS.sync()"); pg.wait_for_timeout(900); r=ev("STAGE.S.sups.map(s=>[PONTS.arms(s),PONTS.spanMm(s)])"); bm=ev("(b=>b.lines.map(l=>[l.item,l.code,l.qty,l.kgEach]))(PONTS.bom())")
    ok(r[0][0]==[144,144] and any(c=='BOX-30V' and q==4 and k==12.2 for i,c,q,k in bm),'cubes d\'angle : demi-section à chaque bout, 4 cubes BOX-30V 2 départs à 12,2 kg',[r[0],bm]); pg.screenshot(path=OUT+'/t87-cube.png',clip={'x':60,'y':80,'width':1090,'height':520})
    ev("PONTS.O.corner='weld';PONTS.sync()"); pg.wait_for_timeout(600)
    # pose pièce par pièce en coin : le nœud est au bout du bras
    ev("(()=>{STAGE.S.sups.length=0;PONTS.sync();const s=PONTS.addTruss({x:0,y:0},{x:4000,y:0},null,true,[2000,2000]);PONTS.placePiece({x:4000,y:0},{x:4000,y:2000},s,{angle:90},2000);PONTS.changed()})()"); pg.wait_for_timeout(900)
    r=ev("STAGE.S.sups.map(s=>[s.a,s.b,PONTS.arms(s),PONTS.piecesOf(s)])"); ok(len(r)==2 and r[0][1]=={'x':4500,'y':0} and r[0][3]==[2000,2000] and r[1][0]=={'x':4500,'y':0} and r[1][1]=={'x':4500,'y':2500} and r[1][3]==[2000],'pièce posée en coin : le pont de 4 m garde ses deux pièces, le coin prend 50 cm de chaque côté, la nouvelle pièce de 2 m part après',r)
    # triangulaire et échelle
    ev("(()=>{STAGE.S.sups.length=0;PONTS.sync();PONTS.O.series='prolyte-h30d';PONTS.addTruss({x:-3000,y:1000},{x:3000,y:1000},null,true);PONTS.O.series='prolyte-h30l';PONTS.addTruss({x:-3000,y:-1000},{x:3000,y:-1000},null,true);PONTS.O.series='prolyte-h30v';PONTS.changed()})()"); pg.wait_for_timeout(700)
    r=ev("STAGE.S.sups.map(s=>[s.series,s.kgPerM,PONTS.piecesOf(s)])"); ok(r[0][0]=='prolyte-h30d' and abs(r[0][1]-(17.75+9.27)/6)<.02 and r[1][0]=='prolyte-h30l' and abs(r[1][1]-(11.0+5.6)/6)<.02,'H30D et H30L : découpe et poids propre d\'après le fabricant',r)
    ev("(()=>{APP.camera.position.set(-3.8,3.6,2.2);APP.orbit.target.set(-2.2,3.1,0);APP.orbit.update()})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t87-tri.png',clip={'x':60,'y':80,'width':1090,'height':520})
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
