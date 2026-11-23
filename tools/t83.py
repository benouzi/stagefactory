import os, sys
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN",timeout=60000); pg.wait_for_timeout(1500)
    ev("STAGE.place('prim-cube',{point:new APP.THREE.Vector3(1,0,2),object:{userData:{}}});STAGE.place('prim-sphere',{point:new APP.THREE.Vector3(-1.5,0,3),object:{userData:{}}});STAGE.select([]);document.querySelector('#view3d')?.click();(()=>{APP.camera.position.set(-6,5,14);APP.orbit.target.set(0,.5,0);APP.orbit.update()})()")
    pg.wait_for_timeout(2500); pg.screenshot(path=OUT+'/t83.png',clip={'x':60,'y':45,'width':1090,'height':560})
    ev("APP.scene.traverse(o=>{if(o.isDirectionalLight){o.castShadow=false}})"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/t83b.png',clip={'x':60,'y':45,'width':1090,'height':560})
    ev("APP.scene.traverse(o=>{if(o.isMesh&&!o.userData.gid&&o.position.y<.02&&o.material&&!o.material.color)o.visible=false})"); pg.wait_for_timeout(800); pg.screenshot(path=OUT+'/t83c.png',clip={'x':60,'y':45,'width':1090,'height':560})
    print('erreurs',[x for x in errs if 'favicon' not in x][:3]); b.close()
print('fin')
