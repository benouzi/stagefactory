import os, sys
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,860); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PONTS && window.DECOR",timeout=60000); pg.wait_for_timeout(1500)
    ev("DECOR.load&&DECOR.load()"); pg.wait_for_function("DECOR.ready",timeout=60000)
    ids=ev("STAGE.LIBALL().filter(t=>t.kind==='sprop'&&/person|homme|femme|assis|chaise/i.test(t.name+t.key)).map(t=>[t.id,t.name]).slice(0,8)"); print(ids)
    ev("ids=>{ids.forEach(([id],i)=>STAGE.place(id,STAGE.hitAt(i*1.2-3,0),true));STAGE.render();document.querySelector('#view3d')?.click();APP.camera.position.set(0,2.2,5.5);APP.orbit.target.set(0,.9,0);APP.orbit.update()}",ids)
    pg.wait_for_timeout(6000); pg.screenshot(path=OUT+'/pp1.png',clip={'x':60,'y':45,'width':1090,'height':560})
    ev("DRAWER.open('lib');STAGE.UI.libCat='dec';STAGE.render();DRAWER.refresh()"); pg.wait_for_timeout(5000)
    ev("document.querySelector('#view3d')?.click()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/pp2.png',clip={'x':60,'y':45,'width':1090,'height':560})
    print(errs[:3]); b.close()
