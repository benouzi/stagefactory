# Dessin, lot 3 : trous, unir / soustraire / intersecter (à plat et en volume, par tranches), pousser-tirer dans la vue 3D.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:380],flush=True)
    if not c: bad.append(m)
AREA="P=>Math.abs(P.reduce((a,p,i)=>{const q=P[(i+1)%P.length];return a+p[0]*q[1]-q[0]*p[1]},0)/2)"
VOL="(()=>{const A=%s;return Math.round(STAGE.S.shapes.reduce((v,s)=>v+(A(s.p)-(s.holes||[]).reduce((a,H)=>a+A(H),0))*(s.h||0),0)*1000)/1000})()"%AREA
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=des]').click()"); pg.wait_for_timeout(400)
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    R="(x0,z0,x1,z1,h,y)=>{DRAW.O.h=h||0;DRAW.O.y=y||0;const s=DRAW.add({k:'poly',p:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],closed:true,rect:true});DRAW.O.h=0;DRAW.O.y=0;return s.id}"
    reset=lambda: ev("(()=>{DRAW.select(null);STAGE.S.shapes.length=0;DRAW.sync()})()")
    SH=lambda: ev("STAGE.S.shapes.map(s=>({k:s.k,p:s.p,holes:(s.holes||[]).length,h:s.h,y:s.y,g:s.g||null,rect:!!s.rect}))")
    # --- à plat
    ev("(()=>{const R=%s;const a=R(0,0,4,2),b=R(2,1,6,3);DRAW.selectMany([a,b])})()"%R); pg.wait_for_timeout(200)
    ok(all(ev("!!document.querySelector('#drawBar [data-da=%s]')"%k) for k in ['buni','bsub','bint']),'deux formes fermées choisies : Unir, Soustraire, Intersecter dans la barre')
    pg.click('#drawBar [data-da=buni]'); pg.wait_for_timeout(900); s=SH(); a=ev("(%s)(STAGE.S.shapes[0].p)"%AREA); ok(len(s)==1 and len(s[0]['p'])==8 and abs(a-14)<1e-6,'Unir à plat : un seul contour de 14 m²',[len(s),a])
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(500); ok(len(SH())==2,'Ctrl+Z : les deux rectangles reviennent')
    ev("DRAW.selectMany(STAGE.S.shapes.map(s=>s.id))"); ev("DRAW.boolean('int')"); pg.wait_for_timeout(500); s=SH(); ok(len(s)==1 and s[0]['rect'] and sorted(map(tuple,s[0]['p']))==[(2,1),(2,2),(4,1),(4,2)],'Intersecter : le rectangle commun 2 × 1 m',s)
    reset(); ev("(()=>{const R=%s;const a=R(0,0,4,2),b=R(2,1,6,3);DRAW.selectMany([a,b])})()"%R); ev("DRAW.boolean('sub')"); pg.wait_for_timeout(500); s=SH(); a=ev("(%s)(STAGE.S.shapes[0].p)"%AREA); ok(len(s)==1 and abs(a-6)<1e-6 and len(s[0]['p'])==6,'Soustraire : la dernière choisie est retirée (8 − 2 = 6 m²)',[a,s[0]['p']])
    # --- percer un volume avec un cercle à plat
    reset(); ev("(()=>{const R=%s;const a=R(0,0,4,4,1);const c=DRAW.add({k:'circle',c:[2,2],r:1});DRAW.selectMany([a,c.id])})()"%R); ev("DRAW.boolean('sub')"); pg.wait_for_timeout(500); s=SH()
    v=ev(VOL); ok(len(s)==1 and s[0]['holes']==1 and s[0]['h']==1 and abs(v-(16-3.1326))<.02,'percer : boîte 4 × 4 × 1 m traversée par un cercle de rayon 1 m',[s[0]['holes'],v])
    m=ev("(()=>{let n=0,t=0;APP.scene.getObjectByName('dessin').traverse(o=>{if(o.isMesh){n++;t+=o.geometry.attributes.position.count}});return [n,t]})()"); ok(m[0]==1 and m[1]>300,'volume 3D percé construit',m)
    ev("document.querySelector('#planBtn').click()"); pg.wait_for_timeout(500); ev("PLAN.fit();PLAN.draw();DRAW.select(null)"); pg.wait_for_timeout(200)
    pg.mouse.click(*P(2,2)); pg.wait_for_timeout(150); a1=ev("DRAW.sels.length"); pg.mouse.click(*P(0.4,0.4)); pg.wait_for_timeout(150); ok(a1==0 and ev("DRAW.sels.length")==1,'plan : un clic dans le trou ne prend rien, un clic dans la matière prend la forme')
    # --- volumes de hauteurs différentes : par tranches
    reset(); ev("(()=>{const R=%s;const a=R(0,0,4,4,2,0),b=R(2,0,6,4,2,1);DRAW.selectMany([a,b])})()"%R); ev("DRAW.boolean('uni')"); pg.wait_for_timeout(500); s=SH(); v=ev(VOL)
    ok(len(s)==3 and abs(v-56)<1e-6 and len(set(x['g'] for x in s))==1 and s[0]['g'] and [(x['y'],x['h']) for x in s]==[(0,1),(1,1),(2,1)],'Unir deux boîtes décalées en hauteur : trois tranches groupées, 56 m³',[[(x['y'],x['h']) for x in s],v])
    reset(); ev("(()=>{const R=%s;const a=R(0,0,4,4,2,0),b=R(1,1,3,3,1,1);DRAW.selectMany([a,b])})()"%R); ev("DRAW.boolean('sub')"); pg.wait_for_timeout(500); s=SH(); v=ev(VOL)
    ok(len(s)==2 and abs(v-28)<1e-6 and s[0]['holes']==0 and s[1]['holes']==1 and s[1]['y']==1,'Soustraire : une cuvette de 2 × 2 × 1 m creusée dans le dessus (28 m³)',[s,v][1])
    reset(); ev("(()=>{const R=%s;const a=R(0,0,4,4,2,0),b=R(2,0,6,4,2,1);DRAW.selectMany([a,b])})()"%R); ev("DRAW.boolean('int')"); pg.wait_for_timeout(500); s=SH(); v=ev(VOL); ok(len(s)==1 and abs(v-8)<1e-6 and s[0]['y']==1 and s[0]['h']==1,'Intersecter deux volumes : 2 × 4 × 1 m',[s,v])
    reset(); ev("(()=>{const R=%s;const a=R(0,0,1,1),b=R(3,3,4,4);DRAW.selectMany([a,b])})()"%R); ev("DRAW.boolean('int')"); pg.wait_for_timeout(500); ok(len(SH())==2,'Intersecter deux formes disjointes : rien n\'est changé')
    # --- pousser-tirer en 3D
    reset(); ev("(()=>{const R=%s;R(-1,-1,1,1,1,0);R(3,-1,5,1,0,0);document.querySelector('#view3d')?.click();APP.camera.position.set(2,7,9);APP.orbit.target.set(2,.5,0);APP.orbit.update()})()"%R); pg.wait_for_timeout(900)
    S2="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    ok(ev("!!document.querySelector('#rail [data-t=dpush]')"),'outil Pousser-tirer dans le rail'); pg.keyboard.press('e'); pg.wait_for_timeout(150); ok(ev("DRAW.tl&&DRAW.tl.k")=='push','touche E : outil Pousser-tirer')
    a=ev(S2,[0,1,0]); c=ev(S2,[0,2.5,0]); pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(a[0],(a[1]+c[1])/2,steps=4); pg.mouse.move(*c,steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    h=ev("STAGE.S.shapes[0].h"); ok(abs(h-2.5)<.11,'tirer le dessus : la hauteur passe de 1 à 2,5 m',h)
    a=ev(S2,[4,0,0]); c=ev(S2,[4,1.2,0]); pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(a[0],(a[1]+c[1])/2,steps=4); pg.mouse.move(*c,steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    h=ev("STAGE.S.shapes[1].h"); ok(abs(h-1.2)<.11,'tirer une forme à plat : elle devient un volume de 1,2 m',h)
    a=ev(S2,[0,1.2,1]); c=ev(S2,[0,1.2,2]); pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move((a[0]+c[0])/2,(a[1]+c[1])/2,steps=4); pg.mouse.move(*c,steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    q=ev("STAGE.S.shapes[0].p"); zs=sorted(x[1] for x in q); ok(abs(zs[-1]-2)<.11 and zs[0]==-1 and ev("STAGE.S.shapes[0].rect"),'tirer un côté : la face avance de 1 m, le rectangle reste d\'équerre',q)
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(500); zs=sorted(x[1] for x in ev("STAGE.S.shapes[0].p")); ok(zs[-1]==1,'Ctrl+Z annule le dernier pousser-tirer',zs)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200); ok(ev("!DRAW.tl"),'Échap quitte l\'outil'); 
    js=ev("STAGE.serialize()"); ok('"shapes":[' in js,'enregistrement'); pg.screenshot(path=OUT+'/t84.png')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
