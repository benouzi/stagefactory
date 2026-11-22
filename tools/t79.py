# Mode dessin : tracé 2D (polyligne, polygone, rectangle, cercle, polygone régulier, texte), extrusion en volume, sélection, déformation, annulation, enregistrement.
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
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ok(ev("!!document.querySelector('[data-dom=des]')"),'métier « Dessin » dans la barre du haut')
    ev("document.querySelector('[data-dom=des]').click();document.querySelector('#planBtn').click()"); pg.wait_for_timeout(600); ev("PLAN.fit();PLAN.draw()")
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    SH=lambda: ev("STAGE.S.shapes.map(s=>({k:s.k,n:s.name,p:s.p,c:s.c,r:s.r,cl:!!s.closed,rect:!!s.rect,h:s.h,y:s.y}))")
    # rectangle à la souris
    pg.click('#rail [data-t=drect]'); pg.wait_for_timeout(150); ok(ev("DRAW.tl.k")=='rect' and ev("getComputedStyle(document.querySelector('#drawBar')).display")=='flex','outil Rectangle : barre du dessin visible')
    pg.mouse.click(*P(-3,1)); pg.mouse.move(*P(-1,2.5)); pg.wait_for_timeout(80); info=ev("DRAW.tl.info"); pg.mouse.click(*P(-1,2.5)); pg.wait_for_timeout(150)
    s=SH(); ok(len(s)==1 and s[0]['rect'] and s[0]['p']==[[-3,1],[-1,1],[-1,2.5],[-3,2.5]] and '2,00 × 1,50' in info,'rectangle 2 × 1,5 m tracé à la souris',[s,info])
    # rectangle aux cotes tapées, avec hauteur : une boîte
    pg.fill('#drawBar [data-di=h]','1,2'); pg.keyboard.press('Tab'); pg.mouse.click(*P(1,1)); pg.mouse.move(*P(2,2)); pg.fill('#drawBar [data-di=val]','4x3'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    s=SH(); ok(len(s)==2 and s[1]['p']==[[1,1],[5,1],[5,4],[1,4]] and s[1]['h']==1.2,'« 4x3 » tapé avec une hauteur de 1,2 m : une boîte',s[1])
    m=ev("(()=>{let n=0,box=null;APP.scene.getObjectByName('dessin').traverse(o=>{if(o.isMesh&&o.geometry.type==='ExtrudeGeometry'){n++;box=new APP.THREE.Box3().setFromObject(o)}});return {n,min:box.min.toArray().map(v=>Math.round(v*100)/100),max:box.max.toArray().map(v=>Math.round(v*100)/100)}})()")
    ok(m['n']==1 and m['min']==[1,0,1] and m['max']==[5,1.2,4],'volume 3D : 4 × 3 × 1,2 m au bon endroit',m)
    # cercle au rayon tapé → cylindre
    pg.click('#rail [data-t=dcirc]'); pg.mouse.click(*P(-2,-2)); pg.mouse.move(*P(-1,-2)); pg.fill('#drawBar [data-di=val]','0,75'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    s=SH(); ok(len(s)==3 and s[2]['k']=='circle' and s[2]['c']==[-2,-2] and s[2]['r']==0.75,'cercle de rayon 0,75 tapé',s[2])
    # polyligne fermée sur le premier point
    pg.fill('#drawBar [data-di=h]','0'); pg.keyboard.press('Tab'); pg.click('#rail [data-t=dpoly]')
    for q in [(2,-3),(4,-3),(4,-1),(3,-1)]: pg.mouse.click(*P(*q)); pg.wait_for_timeout(60)
    pg.mouse.move(*P(2.02,-2.98)); pg.wait_for_timeout(80); pg.mouse.click(*P(2.02,-2.98)); pg.wait_for_timeout(200)
    s=SH(); ok(len(s)==4 and s[3]['cl'] and len(s[3]['p'])==4 and s[3]['h']==0,'polyligne refermée sur son premier point : polygone à plat',s[3])
    # tracé ouvert à la longueur tapée, terminé par Entrée
    pg.mouse.click(*P(-4,-4)); pg.mouse.move(*P(-2,-4)); pg.fill('#drawBar [data-di=val]','2,5'); pg.keyboard.press('Enter'); pg.evaluate("document.activeElement.blur()"); pg.mouse.move(*P(-1.5,-3)); pg.mouse.click(*P(-1.5,-3)); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    s=SH(); ok(len(s)==5 and not s[4]['cl'] and s[4]['p'][:2]==[[-4,-4],[-1.5,-4]] and len(s[4]['p'])==3,'tracé ouvert : segment de 2,5 m tapé, puis un clic, Entrée pour finir',s[4])
    # texte
    pg.click('#rail [data-t=dtext]'); pg.mouse.click(*P(0,3.5)); pg.wait_for_timeout(120); pg.fill('#drawBar [data-di=val]','Régie'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    s=ev("STAGE.S.shapes.filter(s=>s.k==='text').map(s=>[s.txt,s.c])"); ok(s==[['Régie',[0,3.5]]],'texte posé',s)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); pg.evaluate("document.activeElement.blur()"); pg.keyboard.press('Escape'); pg.wait_for_timeout(150); ok(ev("!DRAW.tl"),'Échap : outil quitté')
    # sélection dans le plan, propriétés, extrusion après coup
    pg.mouse.click(*P(-2,1.7)); pg.wait_for_timeout(200); ok(ev("DRAW.byId(DRAW.sel)?.name")=='Rectangle 1' and 'surface 3,00 m²' in ev("document.querySelector('#drawBar').innerText"),'clic dans le plan : rectangle choisi, surface affichée',ev("document.querySelector('#drawBar .h').innerText")[:90])
    pg.fill('#drawBar [data-ds=h]','0,4'); pg.keyboard.press('Tab'); pg.wait_for_timeout(200); ok(ev("STAGE.S.shapes[0].h")==0.4 and 'volume 1,20 m³' in ev("document.querySelector('#drawBar').innerText"),'hauteur donnée après coup : le rectangle devient un volume de 1,2 m³')
    pg.fill('#drawBar [data-ds=w]','3'); pg.keyboard.press('Tab'); pg.wait_for_timeout(150); ok(ev("STAGE.S.shapes[0].p[1][0]")==0,'largeur changée dans la barre',ev("STAGE.S.shapes[0].p"))
    # déplacer à la souris, déformer un coin
    pg.mouse.move(*P(-1.5,1.7)); pg.mouse.down(); pg.mouse.move(*P(-1.2,2.0),steps=4); pg.mouse.move(*P(-0.5,2.7),steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
    q=ev("STAGE.S.shapes[0].p[0]"); ok(q==[-2,2],'glisser : rectangle déplacé de 1 m en x et en z',q)
    pg.mouse.move(*P(1,3.5)); pg.mouse.down(); pg.mouse.move(*P(1.5,3.8),steps=3); pg.mouse.move(*P(2,4),steps=3); pg.mouse.up(); pg.wait_for_timeout(200)
    q=ev("STAGE.S.shapes[0].p"); ok(q==[[-2,2],[2,2],[2,4],[-2,4]],'glisser un coin : le rectangle reste d\'équerre',q)
    # annulation, suppression, duplication
    pg.evaluate("document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(500); ok(ev("STAGE.S.shapes[0].p[2]")==[1,3.5],'Ctrl+Z : déformation annulée',ev("STAGE.S.shapes[0].p"))
    n0=ev("STAGE.S.shapes.length"); pg.mouse.click(*P(-2,-2)); pg.wait_for_timeout(150); ok(ev("DRAW.byId(DRAW.sel)?.k")=='circle','cercle choisi au clic'); pg.keyboard.press('Control+d'); pg.wait_for_timeout(200); pg.keyboard.press('Delete'); pg.wait_for_timeout(200); ok(ev("STAGE.S.shapes.length")==n0,'Ctrl+D duplique, Suppr efface la copie')
    # enregistrement et rechargement
    js=ev("STAGE.serialize()"); ok('"shapes":[' in js,'dessins enregistrés dans le projet'); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(600)
    ok(ev("STAGE.S.shapes.length")==n0 and ev("(()=>{let n=0;APP.scene.getObjectByName('dessin').traverse(o=>{if(o.isMesh)n++});return n})()")>=4,'rechargé : dessins et volumes de retour')
    # sélection dans la vue 3D
    ev("document.querySelector('#planBtn').click();(()=>{APP.camera.position.set(3,6,9);APP.orbit.target.set(3,.6,2.5);APP.orbit.update()})()"); pg.wait_for_timeout(900)
    xy=ev("(()=>{const v=new APP.THREE.Vector3(3,1.2,2.5).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]})()"); pg.mouse.click(*xy); pg.wait_for_timeout(300)
    ok(ev("DRAW.byId(DRAW.sel)?.name")=='Rectangle 2','clic sur le volume dans la vue 3D : il est choisi',ev("DRAW.sel"))
    ev("DRAW.select(null);document.querySelector('#view3d').click();(()=>{APP.camera.position.set(1,7,11);APP.orbit.target.set(0,.4,0);APP.orbit.update()})()"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/t79-3d.png',clip={'x':60,'y':45,'width':1090,'height':560})
    ev("document.querySelector('#planOnly').click()"); pg.wait_for_timeout(800); ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'/t79-plan.png')
    ok(not errs,'aucune erreur de page',errs[:3]); b.close()
print('ECHECS',bad) if bad else print('TOUT PASSE')
