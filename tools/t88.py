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
    hi=ev("(()=>{let n=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isInstancedMesh&&o.material.emissive&&o.material.emissive.getHex()===0xc8861a)n+=o.count});return n})()"); ok(hi>30,'la tour choisie est mise en évidence',hi); pg.screenshot(path=OUT+'/t88-tour.png',clip={'x':60,'y':45,'width':1090,'height':560})
    zb=ev("[...document.querySelectorAll('#pontBar [data-pa=legZ]')].map(b=>+b.dataset.id)")
    if zb:
        pg.click('#pontBar [data-pa=legZ]'); pg.wait_for_timeout(900); r2=ev("(()=>{const s=STAGE.S.sups.find(s=>(s.points||[]).some(p=>p.leg)),p=s.points.find(p=>p.leg);return [STAGE.S.sups.map(s=>s.zMm),PONTS.legMm(s,p)%250]})()"); ok(len(set(r2[0]))==1 and r2[0][0]==zb[0] and min(r2[1],250-r2[1])<=2,'« Pont à x m » : toute la structure change de hauteur, la tour tombe juste',[zb,r2])
    else: ok(True,'la tour tombe déjà juste (aucun reste)')
    # clic sur le coin
    nd=ev("(()=>{const n=PONTS.nodes().slice().sort((a,b)=>(a.at.x-a.at.y)-(b.at.x-b.at.y))[0];return {x:n.at.x/1000,z:-n.at.y/1000,y:n.z/1000,k:PONTS.nodeKey(n)}})()"); ev("([x,y,z])=>{APP.camera.position.set(x-5,y+2.5,z+7);APP.orbit.target.set(x,y-1.5,z);APP.orbit.update()}",[nd['x'],nd['y'],nd['z']]); pg.wait_for_timeout(900)
    pg.mouse.click(*ev(S3,[nd['x'],nd['y']+.14,nd['z']])); pg.wait_for_timeout(500); txt=ev("document.querySelector('#pontBar').innerText")
    ok(ev("PONTS.node")==nd['k'] and txt.startswith('Coin') and '3 départs' in txt,'clic sur un coin en 3D : il est choisi',txt[:160]); pg.screenshot(path=OUT+'/t88-coin.png',clip={'x':60,'y':45,'width':1090,'height':560})
    # son poids, inconnu au catalogue, se saisit et entre dans la nomenclature
    pg.fill('#pontBar [data-ck]','9.5'); pg.keyboard.press('Tab'); pg.wait_for_timeout(700); bm=ev("PONTS.bom().lines.filter(l=>/coin/.test(l.item)).map(l=>[l.item,l.qty,l.kgEach])"); ok(bm and bm[0][1]==4 and bm[0][2]==9.5,'poids du coin saisi : repris dans la nomenclature pour les 4 coins',bm)
    # plan : clic sur le coin
    ev("PONTS.select(null);document.querySelector('#planBtn').click()"); pg.wait_for_timeout(600); ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300)
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    ev("PONTS.pickNode&&0"); pg.mouse.click(5,5); pg.mouse.click(*P(nd['x'],nd['z'])); pg.wait_for_timeout(400); ok(ev("PONTS.node")==nd['k'],'clic sur le coin dans le plan : il est choisi',ev("PONTS.node"))
    pg.mouse.click(*P(nd['x']+2,nd['z'])); pg.wait_for_timeout(400); ok(ev("!PONTS.node && !!PONTS.sel && !!PONTS.pc"),'clic sur le pont ensuite : le coin est lâché, la pièce est choisie',ev("[PONTS.node,PONTS.sel,JSON.stringify(PONTS.pc)]"))
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
