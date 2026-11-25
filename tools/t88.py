# Structure toute faite : les tours sont montées en vraies pièces et se choisissent, les coins se choisissent (3D et plan), leur poids se saisit.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:440],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200)
    r=ev("({n:STAGE.S.sups.length,nodes:PONTS.nodes().map(n=>[n.ways,n.tower,n.label,n.code]),legs:STAGE.S.sups.map(s=>(s.points||[]).filter(p=>p.leg).length),z:STAGE.S.sups[0].zMm})"); ok(r['n']==4 and len(r['nodes'])==4 and all(n[0]==3 and n[1] for n in r['nodes']),'gril sur quatre tours : 4 ponts, 4 coins à 3 départs dont la tour',r)
    lg=ev("(()=>{const s=STAGE.S.sups.find(s=>(s.points||[]).some(p=>p.leg)),p=s.points.find(p=>p.leg);return [PONTS.legMm(s,p),s.zMm,PONTS.arms(s)]})()"); ok(lg[0]==lg[1]+144-500-30,'hauteur de tour : de l\'embase jusque sous le bras du coin',lg)
    ev("PONTS.select(null);document.querySelector('#view3d')?.click()"); pg.wait_for_timeout(300)
    nd=ev("(()=>{const n=PONTS.nodes().slice().sort((a,b)=>(a.at.x-a.at.y)-(b.at.x-b.at.y))[0];return {x:n.at.x/1000,z:-n.at.y/1000,y:n.z/1000,k:PONTS.nodeKey(n)}})()")
    ev("([x,y,z])=>{APP.camera.position.set(x-5,y+2.5,z+7);APP.orbit.target.set(x,y-1.5,z);APP.orbit.update()}",[nd['x'],nd['y'],nd['z']]); pg.wait_for_timeout(1200)
    S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    # clic sur la tour, à mi-hauteur
    pg.mouse.click(*ev(S3,[nd['x'],nd['y']/2,nd['z']])); pg.wait_for_timeout(500); txt=ev("document.querySelector('#pontBar').innerText")
    ok(ev("!!PONTS.leg") and txt.startswith('Tour') and 'hauteur' in txt and ev("getComputedStyle(document.querySelector('#pontBar')).display")=='flex','clic sur une tour en 3D : elle est choisie, sa barre donne hauteur et pièces',txt[:150])
    hi=ev("(()=>{let n=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isInstancedMesh&&o.material.emissive&&o.material.emissive.getHex()===0x4a3008)n+=o.count});return n})()"); ok(hi>30,'la tour choisie est mise en évidence',hi); pg.screenshot(path=OUT+'/t88-tour.png',clip={'x':60,'y':45,'width':1090,'height':560})
    zb=ev("[...document.querySelectorAll('#pontBar [data-pa=legZ]')].map(b=>+b.dataset.id)")
    if zb:
        pg.click('#pontBar [data-pa=legZ]'); pg.wait_for_timeout(900); r2=ev("(()=>{const s=STAGE.S.sups.find(s=>(s.points||[]).some(p=>p.leg)),p=s.points.find(p=>p.leg);return [STAGE.S.sups.map(s=>s.zMm),PONTS.legMm(s,p)%250]})()"); ok(len(set(r2[0]))==1 and r2[0][0]==zb[0] and min(r2[1],250-r2[1])<=2,'« Pont à x m » : toute la structure change de hauteur, la tour tombe juste',[zb,r2])
    else: ok(True,'la tour tombe déjà juste (aucun reste)')
    # une pièce de la tour : clic sur le petit élément du haut, on le remplace par 1 m, toute la structure monte de 50 cm
    nd=ev("(()=>{const n=PONTS.nodes().slice().sort((a,b)=>(a.at.x-a.at.y)-(b.at.x-b.at.y))[0];return {x:n.at.x/1000,z:-n.at.y/1000,y:n.z/1000,k:PONTS.nodeKey(n)}})()"); ev("([x,y,z])=>{APP.camera.position.set(x-5,y+2.5,z+7);APP.orbit.target.set(x,y-1.5,z);APP.orbit.update()}",[nd['x'],nd['y'],nd['z']]); pg.wait_for_timeout(900)
    top=ev("(()=>{const s=STAGE.S.sups.find(s=>(s.points||[]).some(p=>p.leg)),p=s.points.find(p=>p.leg);return (PONTS.legMm(s,p)+30-200)/1000})()"); pg.mouse.click(*ev(S3,[nd['x'],top,nd['z']])); pg.wait_for_timeout(500); txt=ev("document.querySelector('#pontBar').innerText")
    ok(ev("PONTS.leg&&PONTS.leg.k")==1 and 'pièce 2 sur 2' in txt,'clic sur le petit élément du haut de la tour : c\'est lui qui est choisi',txt[:80]); z0=ev("STAGE.S.sups[0].zMm")
    pg.select_option('#pontBar [data-lgs]','1000'); pg.wait_for_timeout(900); r3=ev("({z:STAGE.S.sups.map(s=>s.zMm),pcs:STAGE.S.sups.flatMap(s=>(s.points||[]).filter(p=>p.leg).map(p=>p.pieces)),bom:PONTS.bom().lines.filter(l=>/L100|L400/.test(l.code)).map(l=>[l.code,l.qty])})")
    ok(set(r3['z'])=={z0+500} and all(q==[4000,1000] for q in r3['pcs']) and any(c=='H30V-L100' and q>=4 for c,q in r3['bom']) and any(c=='H30V-L400' and q>=4 for c,q in r3['bom']),'pièce de 0,5 m remplacée par 1 m : la structure monte de 50 cm, les quatre tours suivent, la nomenclature aussi',r3)
    pg.evaluate("document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(700); ok(ev("STAGE.S.sups[0].zMm")==z0,'Ctrl+Z : hauteur revenue')
    # clic sur le coin
    nd=ev("(()=>{const n=PONTS.nodes().slice().sort((a,b)=>(a.at.x-a.at.y)-(b.at.x-b.at.y))[0];return {x:n.at.x/1000,z:-n.at.y/1000,y:n.z/1000,k:PONTS.nodeKey(n)}})()"); ev("([x,y,z])=>{APP.camera.position.set(x-5,y+2.5,z+7);APP.orbit.target.set(x,y-1.5,z);APP.orbit.update()}",[nd['x'],nd['y'],nd['z']]); pg.wait_for_timeout(900)
    pg.mouse.click(*ev(S3,[nd['x'],nd['y']+.14,nd['z']])); pg.wait_for_timeout(500); txt=ev("document.querySelector('#pontBar').innerText")
    ok(ev("PONTS.node")==nd['k'] and txt.startswith('Coin') and '3 départs' in txt,'clic sur un coin en 3D : il est choisi',txt[:160]); pg.screenshot(path=OUT+'/t88-coin.png',clip={'x':60,'y':45,'width':1090,'height':560})
    # n'importe où sur le coin : au milieu d'un bras, puis juste après le bras (premier élément droit)
    mb=ev("(()=>{const n=PONTS.nodes().find(n=>PONTS.nodeKey(n)===PONTS.node);return n.members.map(m=>[m.dir.x,-m.dir.y])})()")
    for i,(dx,dz) in enumerate(mb):
        ev('PONTS.select(null)'); pg.wait_for_timeout(200); pg.mouse.click(*ev(S3,[nd['x']+dx*.32,nd['y']+.29,nd['z']+dz*.32])); pg.wait_for_timeout(450)
        ok(ev('PONTS.node')==nd['k'],'clic au milieu du bras %d du coin en 3D : le coin est choisi'%(i+1),ev('[PONTS.node,PONTS.sel,JSON.stringify(PONTS.pc)]'))
    dx,dz=mb[0]; ev('PONTS.select(null)'); pg.wait_for_timeout(200); pg.mouse.click(*ev(S3,[nd['x']+dx*.9,nd['y']+.29,nd['z']+dz*.9])); pg.wait_for_timeout(450)
    ok(ev('!PONTS.node && !!PONTS.sel && !!PONTS.pc'),'clic juste après le bras : c\'est la pièce du pont qui est choisie',ev('[PONTS.node,PONTS.sel,JSON.stringify(PONTS.pc)]'))
    ev('PONTS.select(null)'); pg.mouse.click(*ev(S3,[nd['x'],nd['y']+.14,nd['z']])); pg.wait_for_timeout(450)
    # son poids, inconnu au catalogue, se saisit et entre dans la nomenclature
    pg.fill('#pontBar [data-ck]','9.5'); pg.keyboard.press('Tab'); pg.wait_for_timeout(700); bm=ev("PONTS.bom().lines.filter(l=>/coin/.test(l.item)).map(l=>[l.item,l.qty,l.kgEach])"); ok(bm and bm[0][1]==4 and bm[0][2]==9.5,'poids du coin saisi : repris dans la nomenclature pour les 4 coins',bm)
    # plan : clic sur le coin
    ev("PONTS.select(null);document.querySelector('#planBtn').click()"); pg.wait_for_timeout(600); ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300)
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    ev("PONTS.pickNode&&0"); pg.mouse.click(5,5); pg.mouse.click(*P(nd['x'],nd['z'])); pg.wait_for_timeout(400); ok(ev("PONTS.node")==nd['k'],'clic sur le coin dans le plan : il est choisi',ev("PONTS.node"))
    for i,(dx,dz) in enumerate(mb):
        ev('PONTS.select(null)'); pg.wait_for_timeout(150); pg.mouse.click(*P(nd['x']+dx*.4,nd['z']+dz*.4)); pg.wait_for_timeout(350); ok(ev('PONTS.node')==nd['k'],'plan : clic sur le bras %d du coin, le coin est choisi'%(i+1),ev('[PONTS.node,PONTS.sel]'))
    pg.mouse.click(*P(nd['x']+mb[0][0]*2,nd['z']+mb[0][1]*2)); pg.wait_for_timeout(400); ok(ev("!PONTS.node && !!PONTS.sel && !!PONTS.pc"),'clic sur le pont ensuite : le coin est lâché, la pièce est choisie',ev("[PONTS.node,PONTS.sel,JSON.stringify(PONTS.pc)]"))
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
