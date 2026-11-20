# Audit 2 : captures d'écran des situations courantes, en 1366 × 768.
import os, sys
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b,pg,errs=open_app(p,1366,768); ev=pg.evaluate
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && window.PUB && window.DECOR && window.LARRAY && window.WS",timeout=60000); pg.wait_for_timeout(1500)
    S=lambda n: (pg.wait_for_timeout(900), pg.screenshot(path=OUT+'/a2-%s.png'%n))
    S('01-depart')
    ev("document.querySelector('[data-dom=rig]').click()"); ev("document.querySelector('#rail [data-t=truss]').click()"); pg.wait_for_timeout(300)
    r=ev("(()=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox,r.top+P.oy,P.s]})()")
    P=lambda x,z:(r[0]+x*r[2],r[1]+z*r[2])
    pg.mouse.click(*P(-4,-4)); pg.mouse.move(*P(3.3,-4.1)); S('02-trace-pont')
    pg.mouse.click(*P(4,-4)); pg.mouse.move(*P(4.1,-1)); pg.mouse.click(*P(4.1,-1)); pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
    ev("PONTS.structOpen()"); S('03-structure'); ev("document.querySelector('#modal').style.display='none'")
    ev("STAGE.UI.serie=5;STAGE.UI.placing='par-led';STAGE.render()"); a=P(-3.5,-4); c=P(3.5,-4); pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(*c,steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    ev("PONTS.select(STAGE.S.sups[0].id)"); S('04-pont-inspecteur')
    ev("document.querySelector('#console').scrollTop=600"); ev("STAGE.UI.ptOpen=STAGE.S.sups[0].points[0].id;STAGE.render();document.querySelector('#console').scrollTop=520"); S('05-points')
    ev("DRAWER.D.h=420;DRAWER.open('rig')"); S('06-rig'); ev("document.querySelector('#drBody').scrollTop=500"); S('07-rig-bas')
    ev("DRAWER.D.h=270;DRAWER.open('secu')"); S('08-secu')
    ev("DRAWER.open('patch')"); S('09-patch')
    ev("STAGE.UI.libCat='lum';DRAWER.open('lib')"); S('10-lib-lum')
    ev("STAGE.UI.libCat='dec';DRAWER.open('lib')"); pg.wait_for_function("DECOR.ready",timeout=90000); pg.wait_for_timeout(2500); ev("STAGE.render()"); S('11-lib-dec')
    ev("DRAWER.open('list')"); S('12-liste'); ev("DRAWER.open('con')"); S('13-console'); ev("DRAWER.open('warn')"); S('14-avert')
    ev("PONTS.select(null);STAGE.select([]);STAGE.UI.tab='doc';STAGE.render()"); S('15-projet'); ev("document.querySelector('#console').scrollTop=9999"); S('16-projet-bas')
    ev("PLAN.setView('coupe')"); S('17-coupe'); ev("PLAN.setView('plan')")
    ev("LARRAY.open()"); S('18-linearray'); ev("document.querySelector('#modal').firstElementChild.scrollTop=9999"); S('19-linearray-bas'); ev("document.querySelector('#modal').style.display='none'")
    ev("PUB.pdfDialog()"); S('20-pdf'); ev("document.querySelector('#modal').style.display='none'")
    ev("document.querySelector('#drawer [data-dt=\"_\"]').click()"); S('21-tiroir-replie')
    ev("WS.C.desk.run()"); S('22-pupitre'); ev("WS.C.desk.run()")
    ev("APP.toggleSide(false)"); S('23-environnement')
    print(errs[:5]); b.close()
