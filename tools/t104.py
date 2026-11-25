# scène en praticables : la tirer par ses bords pour l'agrandir ou la réduire, flèche verte pour la hauteur ; l'habillage est refait
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.SCENES && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("STAGE.runAct('scene')"); pg.wait_for_timeout(500); pg.click('#modal [data-a=sceneok]'); pg.wait_for_timeout(1500)
    Q="(()=>{const g=SCENES.grp||STAGE.S.objs.find(o=>o.grp).grp,M=SCENES.mods(g),B=SCENES.bounds(M),D=STAGE.S.objs.filter(o=>o.grp===g&&o.dress);return {g,n:M.length,w:+(B.x1-B.x0).toFixed(2),d:+(B.z1-B.z0).toFixed(2),x:[B.x0,B.x1],z:[B.z0,B.z1],h:B.h,jupes:D.filter(o=>o.type==='jupe').map(o=>[o.yaw||0,o.size[0],o.size[1]]),dr:SCENES.dressOf(g),on:SCENES.on,sel:STAGE.UI.sel.length}})()"
    q0=ev(Q); ok(q0['n']==24 and q0['w']==8 and q0['d']==6 and q0['on'] and len(q0['jupes'])==3,'scène 8 × 6 m posée avec ses jupes : les flèches apparaissent',q0)
    ev("(()=>{APP.camera.position.set(-9,9,11);APP.orbit.target.set(1,0.8,-3);APP.orbit.update()})()"); pg.wait_for_timeout(1200)
    t=ev("document.querySelector('#scTip').innerText").replace('\n',' '); ok('8,0 × 6,0 m' in t and '24 praticables' in t,'sa cote est affichée',t[:120]); pg.screenshot(path=OUT+'/t104-a.png',clip={'x':60,'y':45,'width':1090,'height':560})
    S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def pull(side,d):
        h=ev("(k)=>{const g=APP.scene.getObjectByName('sceneHandles').children.find(c=>c.userData.side===k),s=g.scale.x,p=g.position;return [p.x,p.y,p.z,s]}",side); n={'cour':(1,0,0),'jardin':(-1,0,0),'avant':(0,0,1),'arriere':(0,0,-1),'haut':(0,1,0)}[side]; o=.3*h[3]
        a=ev(S3,[h[0]+n[0]*o,h[1]+n[1]*o,h[2]+n[2]*o]); t_=ev(S3,[h[0]+n[0]*(o+d),h[1]+n[1]*(o+d),h[2]+n[2]*(o+d)]); pg.mouse.move(*a); pg.wait_for_timeout(150); pg.mouse.down(); pg.wait_for_timeout(100); pg.mouse.move((a[0]+t_[0])/2,(a[1]+t_[1])/2,steps=6); pg.mouse.move(*t_,steps=6); pg.wait_for_timeout(250); tip=ev("document.querySelector('#scTip').innerText").replace('\n',' '); pg.mouse.up(); pg.wait_for_timeout(1400); return tip
    cam0=ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))")
    tp=pull('cour',4); q1=ev(Q); ok(q1['n']==36 and q1['w']==12 and q1['x']==[-4,8] and q1['d']==6 and 'la scène fera 12,0 × 6,0 m' in tp and ev("APP.camera.position.toArray().map(v=>+v.toFixed(3))")==cam0,'tirer le bord cour de 4 m à la souris : deux rangées de praticables s\'ajoutent, la scène fait 12 × 6 m, la caméra ne bouge pas',[q1['n'],q1['x'],tp[:110]])
    ok(len(q1['jupes'])==3 and any(abs(j[1]-12)<.01 for j in q1['jupes']) and q1['dr']['jupe']==q0['dr']['jupe'] and q1['sel']>=36,'l\'habillage est refait : la jupe avant fait maintenant 12 m, mêmes côtés qu\'avant',q1['jupes'])
    pg.screenshot(path=OUT+'/t104-b.png',clip={'x':60,'y':45,'width':1090,'height':560})
    tp=pull('avant',2); q2=ev(Q); ok(q2['d']==8 and q2['z'][1]==q1['z'][1]+2 and q2['n']==48,'tirer le bord avant de 2 m : deux rangées de plus vers le public',[q2['n'],q2['z']])
    tp=pull('haut',.4); q3=ev(Q); ok(abs(q3['h']-1.2)<.001 and all(abs(j[2]-(1.2-.01))<.02 for j in q3['jupes']),'flèche verte, +40 cm : toute la scène passe à 1,20 m, les jupes suivent',[q3['h'],tp[:70]])
    tp=pull('jardin',-2); q4=ev(Q); ok(q4['w']==10 and q4['x']==[-2,8] and q4['n']==40,'repousser le bord jardin de 2 m : une rangée est retirée',[q4['n'],q4['x'],tp[:90]])
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(4): pg.keyboard.press('Control+z'); pg.wait_for_timeout(800)
    q9=ev(Q); ok(q9['n']==24 and q9['w']==8 and q9['d']==6 and abs(q9['h']-.8)<.001 and len(q9['jupes'])==3,'quatre Ctrl+Z : la scène d\'origine, un seul pas par geste',[q9['n'],q9['w'],q9['d'],q9['h']])
    ev("STAGE.select([])"); pg.wait_for_timeout(500); ok(ev("!SCENES.on") and ev("getComputedStyle(document.querySelector('#scTip')).display")=='none','rien de choisi : plus de flèches')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
