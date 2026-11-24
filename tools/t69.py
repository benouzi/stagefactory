# Vues exclusives : 3D seule, plan + 3D, plan seul sur tout l'écran.
import os, sys
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:300],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1366,768); ev=pg.evaluate
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && !!DOCK.view",timeout=60000); pg.wait_for_timeout(1500)
    R=lambda s: ev("(s)=>{const r=document.querySelector(s).getBoundingClientRect();return [r.left,r.width].map(Math.round)}",s)
    on=lambda: ev("['view3d','planBtn','planOnly'].map(i=>document.querySelector('#'+i).classList.contains('on'))")
    w0=R('#planWin'); ok(on()==[False,True,False],'départ : plan + 3D',on())
    pg.click('#planOnly'); pg.wait_for_timeout(500); w=R('#planWin'); c=ev("getComputedStyle(document.querySelector('#c')).visibility")
    ok(w[1]>w0[1]+350 and c=='hidden' and on()==[False,False,True],'Plan : le plan prend toute la largeur, la 3D est cachée',[w0,w,c])
    ok(ev("Math.abs(document.querySelector('#plan2d').getBoundingClientRect().width-PLAN.P.w)<3"),'le dessin suit la nouvelle largeur')
    ev("PONTS.addTruss({x:-4000,y:3000},{x:4000,y:3000},null,true);PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(600); pg.screenshot(path=OUT+'/t69.png')
    pg.click('#view3d'); pg.wait_for_timeout(400); ok(ev("!PLAN.P.on") and ev("getComputedStyle(document.querySelector('#c')).visibility")=='visible' and on()==[True,False,False],'3D : plan fermé, vue 3D seule',on())
    pg.click('#planBtn'); pg.wait_for_timeout(400); w=R('#planWin'); ok(abs(w[1]-w0[1])<4 and on()==[False,True,False],'3D + Plan : retour côte à côte',[w0,w])
    pg.keyboard.press('Shift+P'); pg.wait_for_timeout(400); ok(ev("document.body.classList.contains('planfull')"),'Maj + P : plan seul'); pg.keyboard.press('Shift+P'); pg.wait_for_timeout(300); ok(not ev("document.body.classList.contains('planfull')"),'Maj + P : retour')
    pg.click('#planOnly'); pg.reload(); pg.wait_for_function("window.DOCK && window.PLAN && !!DOCK.view",timeout=60000); pg.wait_for_timeout(2500); ok(ev("document.body.classList.contains('planfull')"),'le choix est retenu à la réouverture')
    ok(not errs,'aucune erreur',errs[:3]); b.close()
print('ÉCHECS :',bad if bad else 'aucun')
