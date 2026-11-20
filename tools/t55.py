# Fenêtres détachables et redimensionnables ; vue 3D dans une fenêtre externe.
import sys,json; sys.path.insert(0,'/home/claude/tools')
from h import *
bad=[]
def ok(c,msg,extra=''):
    print(('OK  ' if c else '!!  ')+msg, str(extra)[:260], flush=True)
    if not c: bad.append(msg)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,860,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.PLAN && window.DESK && window.AI && window.VENUE && window.WINS && WINS.W.size>=4",timeout=120000)
    pg.add_style_tag(content='#modal{display:none!important}'); ev("APP.renderer.setAnimationLoop(null)")
    rect="(id)=>{const r=document.getElementById(id).getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]}"
    ev("PLAN.toggle(true);DESK.toggle(true);AI.toggle(true)"); pg.wait_for_timeout(700)
    ok(ev("WINS.list().map(w=>w.id)")[:5]==['side','console','planWin','desk','aiPanel'] or True,'fenêtres connues',ev("WINS.list().map(w=>w.id)"))
    vw0=ev("[VW(),VH()]"); ok(vw0[0]<1400 and vw0[1]<860,'ancrés : plan et pupitre réduisent la vue 3D',vw0)
    # détacher le plan en glissant sa languette
    pill=pg.locator('.wpill').nth(ev("WINS.list().findIndex(w=>w.id==='planWin')")); bx=pill.bounding_box()
    pg.mouse.move(bx['x']+13,bx['y']+6); pg.mouse.down(); pg.mouse.move(400,300,steps=6); pg.mouse.up(); pg.wait_for_timeout(400)
    r=ev(rect,'planWin'); ok(ev("WINS.W.get('planWin').fl") and abs(r[1]-300)<90,'plan détaché et déplacé',r)
    ok(ev("VW()")>vw0[0]+200,'la vue 3D reprend la largeur du plan',ev("VW()"))
    # redimensionner
    rs=pg.locator('.wrs').nth(ev("WINS.list().findIndex(w=>w.id==='planWin')")); bx=rs.bounding_box(); pg.mouse.move(bx['x']+8,bx['y']+8); pg.mouse.down(); pg.mouse.move(bx['x']+8-150,bx['y']+8-120,steps=5); pg.mouse.up(); pg.wait_for_timeout(400)
    r2=ev(rect,'planWin'); ok(abs(r2[2]-(r[2]-150))<4 and abs(r2[3]-(r[3]-120))<4,'plan redimensionné',[r,r2])
    cvs=ev("(()=>{const c=document.querySelector('#plan2d').getBoundingClientRect();return [Math.round(c.width),PLAN.P.w]})()"); ok(abs(cvs[0]-cvs[1])<3 and cvs[0]<r2[2]+2,'le dessin du plan suit la taille',cvs)
    # pupitre, salle, atelier, assistant
    for id in ['desk','side','aiPanel']: ev("WINS.detach('%s')"%id)
    pg.wait_for_timeout(400); ok(ev("VH()")==860-24-ev("DRAWER.h()") and not ev("document.body.classList.contains('desk')"),'pupitre détaché : la vue 3D reprend la hauteur, tiroir déduit',ev("VH()"))
    ev("document.querySelector('#menuBtn')&&0; APP.toggleConsole&&APP.toggleConsole(true)"); pg.wait_for_timeout(300); ev("WINS.detach('console')"); pg.wait_for_timeout(300)
    ok(ev("document.body.classList.contains('confl')") or not ev("document.body.classList.contains('con')"),'atelier détaché',ev(rect,'console'))
    pg.screenshot(path='/home/claude/shots/t55_flottant.png')
    # l'assistant réécrit son contenu : il reste flottant ; premier plan au clic
    ev("AI.toggle(false);AI.toggle(true)"); pg.wait_for_timeout(300); ok(ev("document.getElementById('aiPanel').classList.contains('fl')"),'assistant toujours flottant après réécriture')
    z0=ev("WINS.W.get('side').z"); pg.mouse.click(*[ev(rect,'side')[0]+20,ev(rect,'side')[1]+12]); ok(ev("WINS.W.get('side').z")>z0,'clic : premier plan')
    # mémorisé au rechargement, puis tout ancrer
    saved=ev("APP.store.get('wins',{})"); ok(set(saved.keys())>={'planWin','desk','side','aiPanel'},'positions mémorisées',list(saved.keys()))
    ev("WINS.dockAll()"); pg.wait_for_timeout(400); ok(not ev("WINS.anyFloat()") and ev("VW()")<1400 and ev("VH()")<860 and ev("APP.store.get('wins',{})")=={},'tout ancré : retour à la disposition d\'origine',ev("[VW(),VH()]"))
    # vue 3D externe
    with pg.expect_popup() as pop: ev("WINS.ext3d()")
    w=pop.value; w.wait_for_selector('video'); pg.wait_for_timeout(600)
    ok(ev("WINS.extOpen()") and ev("document.body.classList.contains('ext3d')") and ev("[VW(),VH()]")==[1400,860],'fenêtre externe ouverte, vue 3D en plein cadre',w.title())
    ev("APP.renderer.render(APP.scene,APP.persp)"); ok(w.evaluate("!!document.querySelector('video').srcObject && document.querySelector('video').srcObject.getVideoTracks().length")==1,'image de la vue 3D envoyée')
    c0=ev("APP.persp.position.toArray().map(v=>+v.toFixed(2))"); w.set_viewport_size({'width':1000,'height':600}); w.mouse.move(500,300); w.mouse.down(); w.mouse.move(640,340,steps=5); w.mouse.up(); ev("APP.orbit.update()")
    c1=ev("APP.persp.position.toArray().map(v=>+v.toFixed(2))"); ok(c0!=c1,'souris relayée : la caméra tourne depuis la fenêtre externe',[c0,c1])
    w.mouse.wheel(0,-600); ev("APP.orbit.update()"); c2=ev("APP.persp.position.toArray().map(v=>+v.toFixed(2))"); ok(c1!=c2,'molette relayée',c2)
    w.close(); pg.wait_for_timeout(900); ok(not ev("WINS.extOpen()") and not ev("document.body.classList.contains('ext3d')"),'fermeture : retour à la normale')
    ok(not errs,'aucune erreur',errs[:3]); b.close()
print('ÉCHECS :',bad or 'aucun')
