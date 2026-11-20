import sys; sys.path.insert(0,'/home/claude/tools')
from h import *
with sync_playwright() as p:
    b,pg,errs=open_app(p,1300,800,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.VIEW3D && window.AI && window.WINS",timeout=120000); pg.add_style_tag(content='#modal{display:none!important}'); ev("APP.renderer.setAnimationLoop(null)")
    tick="for(let k=0;k<3;k++){for(const f of APP.hooks.update)f(1/30)}"
    print('défaut',ev("[VIEW3D.V.bg,VIEW3D.V.grid,'#'+APP.scene.background.getHexString(),VIEW3D.plane.visible]"))
    pg.click('#vwBtn'); pg.wait_for_selector('#vwPop [data-k=grid]'); pg.check('#vwPop [data-k=grid]'); pg.click('#vwPop [data-bg="#5d6068"]'); pg.select_option('#vwPop [data-k=step]','1')
    ev(tick+";APP.toggleSide(true);APP.persp.position.set(34,22,44);APP.orbit.target.set(0,1,4);APP.orbit.update();APP.renderer.render(APP.scene,APP.persp)")
    print('grille+gris',ev("[VIEW3D.V.bg,'#'+APP.scene.background.getHexString(),VIEW3D.plane.visible,APP.store.get('view3d').grid,APP.scene.fog&&'#'+APP.scene.fog.color.getHexString()]"),errs[:3]); pg.screenshot(path='/home/claude/shots/t57_grille.png')
    ev("STAGE.setLive(true);"+tick); print('spectacle : grille masquée',ev("VIEW3D.plane.visible")==False); ev("STAGE.setLive(false);"+tick)
    ev("VIEW3D.set({level:'sol'});"+tick); print('niveau sol',ev("VIEW3D.plane.position.y"))
    pg.click('#vwPop [data-vr]'); print('origine',ev("[VIEW3D.V.bg,VIEW3D.V.grid,'#'+APP.scene.background.getHexString()]"),errs[:3]); b.close()
