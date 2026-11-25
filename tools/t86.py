# Structure : pièces réelles. Chaque élément se voit en 3D, se choisit dans la vue (3D ou plan), se remplace, se scinde, s'insère, se retire ; les pièces des fabricants sont dans la bibliothèque.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:380],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click()"); pg.wait_for_timeout(300)
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    # un pont H30V de 7 m, sans point d'accroche : 3 + 2 + 2
    ev("(()=>{PONTS.O.series='prolyte-h30v';PONTS.O.hang='none';PONTS.O.zMm=3000;const s=PONTS.addTruss({x:-3500,y:0},{x:3500,y:0},null,true,[3000,2000,2000]);PONTS.select(null)})()"); pg.wait_for_timeout(400)
    PCS=lambda: ev("PONTS.piecesOf(STAGE.S.sups[0])"); LEN=lambda: ev("(s=>Math.round(Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)))(STAGE.S.sups[0])")
    ok(PCS()==[3000,2000,2000] and LEN()==7000,'pont de 7 m en 3 + 2 + 2 m',PCS())
    n1=ev("(()=>{let n=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isInstancedMesh)n+=o.count});return n})()"); ok(n1>=3*(12+8)+40,'3D : chaque pièce a ses membrures, ses manchons et ses cadres',n1)
    # clic dans le plan sur la 2e pièce (x = 0,5 m)
    ev("document.querySelector('#planBtn').click()"); pg.wait_for_timeout(500); ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(200)
    pg.mouse.click(*P(.5,0)); pg.wait_for_timeout(300); pc=ev("PONTS.pc"); txt=ev("document.querySelector('#pontBar').innerText"); ok(pc and pc['i']==1 and 'Pièce 2 sur 3' in txt and ev("getComputedStyle(document.querySelector('#pontBar')).display")=='flex','clic dans le plan : la 2e pièce est choisie, sa barre s\'ouvre',[pc,txt[:60]])
    hi=ev("(()=>{let n=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isInstancedMesh&&o.material.emissive&&o.material.emissive.getHex()===0xc8861a)n+=o.count});return n})()"); ok(hi>=20,'3D : la pièce choisie est mise en évidence',hi)
    # remplacer par 1 m : le pont raccourcit de 1 m, son premier bout ne bouge pas
    pg.select_option('#pontBar [data-pcs]','1000'); pg.wait_for_timeout(400); a=ev("STAGE.S.sups[0].a"); ok(PCS()==[3000,1000,2000] and LEN()==6000 and a['x']==-3500,'remplacer 2 m par 1 m : 3 + 1 + 2, 6 m, premier bout en place',[PCS(),LEN()])
    pg.click('#pontBar [data-pa=pcIns]'); pg.wait_for_timeout(300); ok(PCS()==[3000,1000,1000,2000] and LEN()==7000,'insérer la même après',PCS())
    pg.click('#pontBar [data-pa=pcNav][data-id="-1"]'); pg.wait_for_timeout(200); ok(ev("PONTS.pc.i")==0 and 'Pièce 1 sur 4' in ev("document.querySelector('#pontBar').innerText"),'◀ : pièce précédente')
    pg.click('#pontBar [data-pa=pcNav][data-id="-1"]'); pg.wait_for_timeout(200); ok(ev("PONTS.pc.i")==3,'◀ depuis la première : on arrive à la dernière'); pg.click('#pontBar [data-pa=pcSplit]'); pg.wait_for_timeout(300); ok(PCS()==[3000,1000,1000,1000,1000] and LEN()==7000,'scinder 2 m en 1 + 1',PCS())
    pg.click('#pontBar [data-pa=pcShift][data-id="-1"]'); pg.wait_for_timeout(300); ok(ev("PONTS.pc.i")==2 and len(PCS())==5,'reculer : la pièce change de place',[ev("PONTS.pc.i"),PCS()])
    pg.click('#pontBar [data-pa=pcDel]'); pg.wait_for_timeout(300); ok(PCS()==[3000,1000,1000,1000] and LEN()==6000,'retirer une pièce',PCS())
    pg.evaluate("document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(500); ok(len(PCS())==5,'Ctrl+Z : la pièce revient',PCS())
    # clic 3D
    ev("PONTS.select(null);document.querySelector('#view3d')?.click();(()=>{APP.camera.position.set(0,6,9);APP.orbit.target.set(0,3,0);APP.orbit.update()})()"); pg.wait_for_timeout(900)
    xy=ev("(()=>{const v=new APP.THREE.Vector3(-2,3.15,0).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]})()"); pg.mouse.click(*xy); pg.wait_for_timeout(400)
    ok(ev("PONTS.pc&&PONTS.pc.i")==0 and 'Pièce 1 sur 5' in ev("document.querySelector('#pontBar').innerText"),'clic dans la vue 3D : la pièce sous le pointeur est choisie',ev("PONTS.pc")); pg.screenshot(path=OUT+'/t86.png',clip={'x':60,'y':80,'width':1090,'height':520})
    # bibliothèque
    ev("PONTS.select(null);STAGE.UI.tab='lib';STAGE.UI.libCat='str';APP.toggleConsole(true);STAGE.render()"); pg.wait_for_timeout(400); nb=ev("document.querySelectorAll('[data-pa=libPiece]').length"); ok(nb>=30,'bibliothèque, onglet Structure : les pièces des fabricants',nb)
    ev("[...document.querySelectorAll('[data-pa=libPiece]')].find(b=>b.dataset.id==='prolyte-h40v|2000').click()"); pg.wait_for_timeout(300); ok(ev("PONTS.tl&&PONTS.tl.k")=='piece' and ev("PONTS.O.series")=='prolyte-h40v' and ev("PONTS.O.piece")==2000,'un clic sur « H40V 2 m » arme l\'outil pièce par pièce')
    ev("document.querySelector('#planBtn').click()"); pg.wait_for_timeout(500); pg.mouse.move(*P(0,3)); pg.wait_for_timeout(100); pg.mouse.click(*P(0,3)); pg.wait_for_timeout(400); s=ev("STAGE.S.sups.map(s=>[s.series,PONTS.piecesOf(s)])"); ok(len(s)==2 and s[1]==['prolyte-h40v',[2000]],'clic dans le plan : la pièce est posée',s)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
