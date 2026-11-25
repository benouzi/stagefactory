# plan 2D : tirer la scène par ses bords ; vue « Face » (coupe transversale vue du public)
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
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.SCENES && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("STAGE.runAct('scene')"); pg.wait_for_timeout(500); pg.click('#modal [data-a=sceneok]'); pg.wait_for_timeout(1500)
    ev("document.querySelector('#planBtn').click()"); pg.wait_for_timeout(700); ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(400)
    Q="(()=>{const g=STAGE.S.objs.find(o=>o.grp).grp,M=SCENES.mods(g),B=SCENES.bounds(M);return {n:M.length,x:[B.x0,B.x1],z:[B.z0,B.z1],grp:SCENES.grp,j:STAGE.S.objs.filter(o=>o.grp===g&&o.type==='jupe').map(o=>o.size[0])}})()"
    PX=lambda x,z: ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    def pull(side,d):
        h=ev("(k)=>{const g=SCENES.grp,B=SCENES.bounds(SCENES.mods(g));return SCENES.hpos(B,k,15/PLAN.P.s)}",side); n={'cour':(1,0),'jardin':(-1,0),'avant':(0,1),'arriere':(0,-1)}[side]
        a=PX(h[0],h[1]); t=PX(h[0]+n[0]*d,h[1]+n[1]*d); pg.mouse.move(*a); pg.wait_for_timeout(120); pg.mouse.down(); pg.mouse.move((a[0]+t[0])/2,(a[1]+t[1])/2,steps=5); pg.mouse.move(*t,steps=5); pg.wait_for_timeout(250); tip=ev("document.querySelector('#scTip').innerText").replace('\n',' '); pg.screenshot(path=OUT+'/t105-%s.png'%side); pg.mouse.up(); pg.wait_for_timeout(1300); return tip
    q0=ev(Q); ok(q0['n']==24 and q0['grp'],'scène posée et choisie : ses flèches sont aussi dans le plan',q0)
    tp=pull('cour',4); q1=ev(Q); ok(q1['n']==36 and q1['x']==[-4,8] and '12,0 × 6,0 m' in tp and any(abs(j-12)<.01 for j in q1['j']),'plan 2D · tirer le bord cour de 4 m : la scène passe à 12 × 6 m, habillage refait',[q1['n'],q1['x'],tp[:100]])
    tp=pull('arriere',2); q2=ev(Q); ok(q2['z']==[-8,0] and q2['n']==48,'plan 2D · tirer le bord arrière de 2 m : deux rangées de plus au lointain',[q2['n'],q2['z']])
    tp=pull('jardin',-4); q3=ev(Q); ok(q3['x']==[0,8] and q3['n']==32,'plan 2D · repousser le bord jardin de 4 m : deux rangées retirées',[q3['n'],q3['x']])
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(3): pg.keyboard.press('Control+z'); pg.wait_for_timeout(700)
    ok(ev(Q)['n']==24,'trois Ctrl+Z : la scène d\'origine')
    # vue Face
    ev("(()=>{PONTS.O.series='prolyte-h30v';PONTS.O.hang='auto';PONTS.O.zMm=5000;PONTS.addTruss({x:-5000,y:2000},{x:5000,y:2000},null,true);const t=STAGE.S.sups[0];t.points.forEach((p,i)=>{p.originHMm=8000;p.tag='M'+(i+1)});PONTS.sync();STAGE.select([])})()"); pg.wait_for_timeout(700)
    pg.click('#planWin [data-pv=face]'); pg.wait_for_timeout(900); ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(500)
    v=ev("[PLAN.P.view,PLAN.P.face,document.querySelector('#planWin [data-pv=face]').classList.contains('on')]"); ok(v==['face',True,True],'onglet « Face » : la coupe transversale s\'ouvre',v); pg.screenshot(path=OUT+'/t105-face.png')
    ink=ev("(()=>{const cv=document.querySelector('#plan2d'),c=cv.getContext('2d'),d=c.getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<d.length;i+=16)if(d[i]<90&&d[i+1]<90&&d[i+2]<110)n++;return n})()"); ok(ink>400,'la scène et le pont y sont dessinés',ink)
    # y glisser un praticable : il se déplace en X, pas en profondeur
    o0=ev("(()=>{const o=STAGE.S.objs.find(o=>o.grp&&!o.dress&&Math.abs(o.pos[0]-3)<.01);return {id:o.id,p:[...o.pos]}})()"); a=PX(o0['p'][0],-(o0['p'][1]+.4)); pg.mouse.click(*a); pg.wait_for_timeout(500); selok=ev("STAGE.UI.sel.length")
    t=PX(o0['p'][0]+2,-(o0['p'][1]+.4)); pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move((a[0]+t[0])/2,a[1],steps=4); pg.mouse.move(*t,steps=4); pg.mouse.up(); pg.wait_for_timeout(700); o1=ev("(id)=>{const o=STAGE.S.objs.find(o=>o.id===id);return o?[...o.pos]:null}",o0['id']); mv=ev("STAGE.S.objs.filter(o=>STAGE.UI.sel.includes(o.id)).map(o=>o.pos[0])")
    ok(selok>=1,'en vue Face, un clic choisit l\'objet sous le pointeur',selok)
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(500)
    pg.click('#planWin [data-pv=coupe]'); pg.wait_for_timeout(700); ok(ev("PLAN.P.view")=='coupe' and ev("!PLAN.P.face"),'retour à la coupe longitudinale'); pg.click('#planWin [data-pv=plan]'); pg.wait_for_timeout(500)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
