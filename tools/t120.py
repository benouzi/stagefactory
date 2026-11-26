# calques : les ponts suivent l'ordre et la couleur de leur calque ; un projecteur d'un calque placé au-dessus est tracé par-dessus le pont
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:400],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && window.LAYERS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1500)
    t=ev("(()=>{const s=STAGE.S.sups.find(s=>s.kind==='truss');return [(s.a.x+s.b.x)/2000,-(s.a.y+s.b.y)/2000]})()")
    # un projecteur pile sur la travée, vu de dessus
    pid=ev("([x,z])=>{const T=APP.THREE;const o=STAGE.place('decoupe',{point:new T.Vector3(x,0,z),object:{userData:{}},face:null},true,{});const q=STAGE.byId(o.id||o);q.pos[0]=x;q.pos[2]=z;STAGE.select([]);STAGE.render();return q.id}",t); pg.wait_for_timeout(600)
    ev("PONTS.select&&PONTS.select(null)"); pg.wait_for_timeout(300)
    CNT="""([x,z,rr,gg,bb])=>{PLAN.draw&&PLAN.draw();const cv=document.querySelector('#plan2d'),k=cv.width/cv.getBoundingClientRect().width,cx=(PLAN.P.ox+x*PLAN.P.s)*k,cy=(PLAN.P.oy+z*PLAN.P.s)*k,R=Math.round(PLAN.P.s*.5*k),d=cv.getContext('2d').getImageData(cx-R,cy-R,2*R,2*R).data;let n=0;for(let i=0;i<d.length;i+=4)if(Math.abs(d[i]-rr)<40&&Math.abs(d[i+1]-gg)<40&&Math.abs(d[i+2]-bb)<40)n++;return n}"""
    blue=lambda: (pg.wait_for_timeout(500), ev(CNT,[t[0],t[1],0,0,255]))[1]
    red=lambda: (pg.wait_for_timeout(500), ev(CNT,[t[0],t[1],255,0,0]))[1]
    ev("LAYERS.set('lum','col','#0000ff')"); r0=red(); ev("LAYERS.set('ponts','col','#ff0000')"); r1=red()
    ok(r0==0 and r1>5,'couleur rouge donnée au calque « Ponts et structures » : le pont est tracé en rouge sur le plan',[r0,r1])
    o=ev("LAYERS.order()"); ok(o.index('lum')>o.index('ponts'),'par défaut la lumière est au-dessus des ponts'); top=blue()
    # la lumière passe sous les ponts
    for _ in range(4):
        if ev("LAYERS.order().indexOf('lum')>LAYERS.order().indexOf('ponts')"): ev("LAYERS.move('lum',-1)")
    under=blue(); ok(ev("LAYERS.order().indexOf('lum')<LAYERS.order().indexOf('ponts')") and under<top,'lumière descendue sous les ponts : le pont recouvre le projecteur ; au-dessus, le projecteur est entier',[top,under])
    for _ in range(4):
        if ev("LAYERS.order().indexOf('lum')<LAYERS.order().indexOf('ponts')"): ev("LAYERS.move('lum',1)")
    ok(blue()==top,'remontée : le projecteur repasse au premier plan',top)
    ev("LAYERS.set('ponts','plan',false)"); ok(red()==0,'calque des ponts masqué « sur le plan » : le pont a disparu du plan'); ev("LAYERS.set('ponts','plan',true)")
    pg.screenshot(path=OUT+'/t120.png')
    ok(not errs,'aucune erreur dans la console',errs[:3])
    print('fin','tout passe' if not bad else bad); b.close()
