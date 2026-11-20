import sys; sys.path.insert(0,'/home/claude/tools')
from h import *
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:230],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,860,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.VIEW3D && window.PLAN && window.AI && window.WINS",timeout=120000); pg.add_style_tag(content='#modal{display:none!important}'); ev("APP.renderer.setAnimationLoop(null)")
    cam="[APP.mode,APP.camera===APP.persp?'persp':'ortho',Math.round(APP.persp.fov),...APP.persp.position.toArray().map(v=>+v.toFixed(1))]"
    pg.click('#vwBtn'); pg.wait_for_selector('#vwPop [data-cam=iso]'); ok(pg.locator('#vwPop [data-cam]').count()==9,'neuf points de vue')
    seen={}
    for v in ['iso','iso2','top','side','face','back','jar','cour','persp']:
        pg.click('#vwPop [data-cam=%s]'%v); seen[v]=ev(cam); ev("APP.renderer.render(APP.scene,APP.camera)")
        if v in('iso','face','top'): pg.screenshot(path='/home/claude/shots/t58_%s.png'%v)
    ok(seen['iso'][2]==14 and seen['iso'][0]=='orbit' and seen['iso'][3]>0 and seen['iso2'][3]<0,'isométrique cour / jardin',seen['iso'])
    ok(seen['top'][:2]==['top','ortho'] and seen['side'][:2]==['side','ortho'],'dessus et côté à plat',seen['top'][:2])
    ok(seen['face'][5]>15 and seen['back'][5]<-5 and seen['jar'][3]<-5 and seen['cour'][3]>5 and seen['face'][2]==65,'vues depuis la salle, le lointain, jardin, cour',[seen['face'],seen['back']])
    ok(seen['persp'][0]=='orbit' and seen['persp'][2]==65,'retour perspective',seen['persp'])
    pg.fill('#vwPop [data-fov]','30'); ok(ev("Math.round(APP.persp.fov)")==30,'angle de champ',ev("document.querySelector('#vwFov').textContent"))
    # salle sur mesure : les vues suivent ses dimensions
    ev("AI.run('new_project',{name:'T',room:{w:30,d:40,h:14,stageW:20,stageD:14,stageH:1}});VIEW3D.goView('face')"); ok(abs(ev("APP.persp.position.z")-38.8)<.1,'vue adaptée à la salle sur mesure',ev(cam)); ev("STAGE.undoTo(0)")
    # plan 2D
    ev("PLAN.toggle(true)"); pg.wait_for_timeout(600); px="(()=>{const c=document.querySelector('#plan2d'),d=c.getContext('2d').getImageData(5,Math.round(c.height/2),1,1).data;return [d[0],d[1],d[2]]})()"
    p0=ev(px); pg.click('#planOpt'); pg.wait_for_selector('#planPop [data-th]'); pg.click('#planPop [data-th="3"]'); pg.wait_for_timeout(300); p1=ev(px); ok(p0==[251,250,246] and p1==[16,18,22],'fond du plan : papier puis noir',[p0,p1])
    pg.screenshot(path='/home/claude/shots/t58_plan_noir.png')
    pg.select_option('#planPop [data-t=step]','2'); pg.uncheck('#planPop [data-t=grid]'); ok(ev("[PLAN.P.theme.step,PLAN.P.theme.grid,APP.store.get('plan2d').paper]")==[2,False,'#101216'],'grille : pas et masquage, réglages gardés',ev("PLAN.P.theme"))
    pg.click('#planPop [data-th="4"]'); pg.check('#planPop [data-t=grid]'); ev("PLAN.setView('coupe')"); pg.wait_for_timeout(300); pg.locator('#planWin').screenshot(path='/home/claude/shots/t58_coupe_bleu.png'); ev("PLAN.setView('plan')")
    pg.click('#planPop [data-tr]'); pg.wait_for_timeout(200); ok(ev(px)==[251,250,246] and ev("PLAN.P.theme.step")==1,'réglages d\'origine')
    ok(not errs,'aucune erreur',errs[:3]); b.close()
print('ÉCHECS :',bad or 'aucun')
