# plan 2D : un pont au-dessus de praticables se prend au clic ; le cadre de sélection prend les ponts
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
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && window.LAYERS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500); ev("window.OBJLIST&&OBJLIST.winOn&&OBJLIST.win(false)")
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200); ev("PONTS.select(null)")
    T=ev("STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>({id:s.id,ax:s.a.x/1000,az:-s.a.y/1000,bx:s.b.x/1000,bz:-s.b.y/1000,name:s.name}))"); t=T[0]; mx=(t['ax']+t['bx'])/2; mz=(t['az']+t['bz'])/2
    PR=ev("STAGE.LIBALL().find(t=>/praticable/i.test(t.name)&&t.cat==='str').id")
    ids=ev("([x,z,pr])=>{const T=APP.THREE,mk=(dx)=>{const o=STAGE.place(pr,{point:new T.Vector3(x+dx,0,z),object:{userData:{}},face:null},true,{});const q=STAGE.byId((o&&o.id)||o);q.pos[0]=x+dx;q.pos[2]=z;STAGE.unbuild(q.id);STAGE.build(q);return q.id};const a=[mk(-1),mk(1)];STAGE.select([]);STAGE.render();PLAN.draw();return a}",[mx,mz,PR]); pg.wait_for_timeout(500)
    W="([x,z])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+x*PLAN.P.s,r.top+PLAN.P.oy+z*PLAN.P.s]}"
    ok(ev("([x,z])=>!!PLAN.hit(x,z)",[mx-1,mz]),'un praticable est bien sous le pont à cet endroit')
    pg.mouse.click(*ev(W,[mx-1,mz])); pg.wait_for_timeout(500); s=ev("[PONTS.sel,STAGE.UI.sel.length]"); ok(s==[t['id'],0],'clic sur le pont, là où un praticable est dessous : c\'est le pont qui est pris',s)
    pg.mouse.click(*ev(W,[mx-1,mz+.4])); pg.wait_for_timeout(500); s=ev("[PONTS.sel,STAGE.UI.sel]"); ok(s[1]==[ids[0]],'clic à côté du pont, sur le praticable : c\'est le praticable',s)
    # un projecteur accroché sur le pont reste prioritaire (calque au-dessus)
    pj=ev("([x,z])=>{const T=APP.THREE;const o=STAGE.place('par-zoom',{point:new T.Vector3(x,0,z),object:{userData:{}},face:null},true,{});const q=STAGE.byId((o&&o.id)||o);q.pos[0]=x;q.pos[2]=z;q.pos[1]=4.5;STAGE.unbuild(q.id);STAGE.build(q);STAGE.select([]);PONTS.select(null);STAGE.render();PLAN.draw();return q.id}",[mx+2.5,mz]); pg.wait_for_timeout(400)
    pg.mouse.click(*ev(W,[mx+2.5,mz])); pg.wait_for_timeout(500); ok(ev("STAGE.UI.sel")==[pj],'un projecteur posé sur le pont se prend toujours, lui (son calque est au-dessus)',ev("[PONTS.sel,STAGE.UI.sel]"))
    # ordre des calques inversé : la scène au-dessus des ponts → le praticable repasse devant
    ev("STAGE.select([]);PONTS.select(null)"); k=0
    while ev("LAYERS.rank('str')<LAYERS.rank('ponts')") and k<8: ev("LAYERS.move('str',1)"); k+=1
    pg.wait_for_timeout(300); pg.mouse.click(*ev(W,[mx-1,mz])); pg.wait_for_timeout(500); ok(ev("STAGE.UI.sel")==[ids[0]],'calque « Structure et scène » remonté au-dessus des ponts : au même endroit, c\'est le praticable qui est pris')
    while ev("LAYERS.rank('str')>0") and k>0: ev("LAYERS.move('str',-1)"); k-=1
    ev("STAGE.select([]);PONTS.select(null)"); pg.wait_for_timeout(300)
    # cadre de sélection
    xs=[q[k] for q in T for k in ('ax','bx')]; zs=[q[k] for q in T for k in ('az','bz')]; a=ev(W,[min(xs)-1.2,min(zs)-1.2]); c=ev(W,[max(xs)+1.2,max(zs)+1.2])
    pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move((a[0]+c[0])/2,(a[1]+c[1])/2,steps=5); pg.mouse.move(*c,steps=5); pg.mouse.up(); pg.wait_for_timeout(700)
    s=ev("[!!PONTS.st,PONTS.stSet?PONTS.stSet.size:0,STAGE.UI.sel.length]"); ok(s[0] and s[1]==len(T) and s[2]==0,'cadre autour de tout : la structure entière est choisie (les ponts passent avant les objets du cadre, un message le dit)',s)
    ev("STAGE.select([]);PONTS.select(null)"); pg.wait_for_timeout(300); u=T[2] if abs(T[2]['az']-T[2]['bz'])<.01 or abs(T[2]['ax']-T[2]['bx'])<.01 else T[1]
    x0=min(u['ax'],u['bx'])-.6; x1=max(u['ax'],u['bx'])+.6; z0=min(u['az'],u['bz'])-.6; z1=max(u['az'],u['bz'])+.6; inside=[q['id'] for q in T if all(x0<=q[k]<=x1 for k in('ax','bx')) and all(z0<=q[k]<=z1 for k in('az','bz'))]
    a=ev(W,[x0,z0]); c=ev(W,[x1,z1]); free=ev("([x,z])=>!PLAN.hit(x,z)",[x0,z0])
    pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move((a[0]+c[0])/2,(a[1]+c[1])/2,steps=5); pg.mouse.move(*c,steps=5); pg.mouse.up(); pg.wait_for_timeout(700)
    s=ev("[PONTS.sel,!!PONTS.st]"); ok(inside==[u['id']] and s==[u['id'],False],'cadre autour d\'une seule travée : elle seule est choisie',[s,inside,free]); pg.screenshot(path=OUT+'/t126.png')
    ok(not errs,'aucune erreur dans la console',errs[:3])
    print('fin','tout passe' if not bad else bad); b.close()
