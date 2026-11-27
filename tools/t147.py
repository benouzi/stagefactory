# 4.66.0 — structures : étage vers le bas (Ctrl + flèche verticale vers le bas), Ctrl+A (toutes les pièces), détacher une pièce.
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
    z0=ev(Z); l0=ev(LG); fid=ev("STAGE.S.sups.find(s=>s.name.endsWith('face')).id"); n0=ev("STAGE.S.sups.length")
    sel=lambda i:(ev("PONTS.select('%s')"%i),pg.wait_for_timeout(500),pg.click('.ptree [data-id="po|%s"]'%i,timeout=8000),pg.wait_for_timeout(800))
    go=lambda dy,ctrl:(ev("([dy,c])=>{const z=PONTS.gz;z.start(false,c);z.proxy.position.y+=dy;z.apply(false);z.end()}",[dy,ctrl]),pg.wait_for_timeout(1100))
    # --- étage vers le bas
    sel(fid); go(-2,True); z1=ev(Z); l1=ev(LG); lo=[q for q in l1 if q[0]=='face bas']; fa=[q for q in l1 if q[0]=='face']
    ok('face bas' in z1 and abs(z1['face bas']-(z0['face']-2000))<=300 and z1['face']==z0['face'],'Ctrl + flèche verticale vers le bas, −2 m : une travée « face bas » naît 2 m sous la face, qui ne bouge pas',z1)
    ok(len(lo)==2 and all(q[1]==0 and abs(q[3])<=2 for q in lo),'la travée du bas descend au sol sur ses deux tours, en pièces justes',lo)
    ok(len(fa)==2 and all(q[1]>z1['face bas'] and abs(q[3])<=2 for q in fa) and all(q[2]<1900 for q in fa),'les tours de la face deviennent des montants posés sur la travée du bas',fa)
    r=ev("[PONTS.structs().map(q=>[q.name,q.m.length]),PONTS.nodes().length]"); ok(r[0]==[['Gril',5]],'toujours une seule structure, 5 travées',r)
    ev("(()=>{DOCK.view('3d');APP.camera.position.set(-11,9,13);APP.orbit.target.set(0,3.5,-2);APP.orbit.update()})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t147-a-etage-bas.png')
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(900); ok(ev(Z)==z0 and ev(LG)==l0 and ev("STAGE.S.sups.length")==n0,'Ctrl+Z : le gril d\'origine, en un pas',ev(Z))
    # --- Ctrl+A : vraie touche
    ev("PONTS.select('%s')"%fid); pg.wait_for_timeout(500); pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+a'); pg.wait_for_timeout(900)
    a=ev("[PONTS.pcs?PONTS.pcs.size:0,STAGE.S.sups.filter(s=>s.kind==='truss').reduce((n,s)=>n+PONTS.piecesOf(s).length,0),document.querySelector('#pcBar,[id*=pcBar]')?1:0,[...document.querySelectorAll('button[data-pa=pcDetach]')].length]")
    ok(a[0]==a[1] and a[0]>4 and a[3]>=1,'Ctrl+A : toutes les pièces du gril sont choisies, la barre propose Détacher',a)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    # --- détacher une pièce : clic réel sur le bouton de la barre
    ev("(id)=>{const s=PONTS.byId(id);PONTS.select(id);PONTS.pickPiece(s,PONTS.arms(s)[0]+PONTS.piecesOf(s)[0]+50)}",fid); pg.wait_for_timeout(800)
    b0=ev("(id)=>{const s=PONTS.byId(id);return {pcs:PONTS.piecesOf(s),i:PONTS.pc&&PONTS.pc.i,n:STAGE.S.sups.filter(s=>s.kind==='truss').length,L:PONTS.len(s)}}",fid)
    pg.click('button[data-pa=pcDetach]'); pg.wait_for_timeout(1200)
    d=ev("(()=>{const T=STAGE.S.sups.filter(s=>s.kind==='truss'),s=PONTS.byId(PONTS.sel);return {n:T.length,sel:s&&{name:s.name,pcs:PONTS.piecesOf(s),L:PONTS.len(s),st:(PONTS.stOf(s)||{m:[s]}).m.length},tot:T.reduce((n,q)=>n+PONTS.piecesOf(q).length,0),structs:PONTS.structs().map(q=>q.m.length)}})()")
    ok(d['sel'] and d['sel']['pcs']==[b0['pcs'][b0['i']]] and d['sel']['st']==1 and d['n']>b0['n'],'« Détacher » : la pièce est devenue un pont à part (une seule pièce), choisi, hors de la structure',d)
    ev("(()=>{APP.camera.position.set(-6,9,9);APP.orbit.target.set(0,4,-1);APP.orbit.update()})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t147-b-detache.png')
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(900); e=ev("(id)=>[STAGE.S.sups.filter(s=>s.kind==='truss').length,PONTS.piecesOf(PONTS.byId(id))]",fid); ok(e[0]==b0['n'] and e[1]==b0['pcs'],'Ctrl+Z : la pièce est revenue à sa place, en un pas',e)
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
print('\nt147 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
