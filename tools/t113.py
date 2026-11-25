# vue 2D : la flèche trace un cadre de sélection, la main (ou Espace, ou le bouton du milieu) déplace la vue, curseurs justes ; dessin au glisser et à main levée
import sys,os,math; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ids=ev("""(()=>{const T=APP.THREE,at=(x,z)=>({point:new T.Vector3(x,0,z),object:{userData:{}},face:null});const a=STAGE.place('prim-cube',at(-2,1),true,{}),b=STAGE.place('prim-cube',at(0,1),true,{}),c=STAGE.place('prim-cube',at(3,-2),true,{});STAGE.touch();STAGE.select([]);if(!PLAN.P.on)PLAN.toggle(true);return [a.id,b.id,c.id]})()"""); pg.wait_for_timeout(900)
    W="([x,z])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+x*PLAN.P.s,r.top+PLAN.P.oy+z*PLAN.P.s]}"
    chk=ev("(()=>{const [sx,sy]=(%s)([1.5,-.5]);const w=PLAN.world({clientX:sx,clientY:sy});return [w[0],w[1]]})()"%W); ok(abs(chk[0]-1.5)<.01 and abs(chk[1]+.5)<.01,'(repère de l\'essai : un point du plan retombe au bon endroit à l\'écran)',chk)
    cur=lambda: ev("getComputedStyle(document.querySelector('#plan2d')).cursor")
    view=lambda: ev("[PLAN.P.ox,PLAN.P.oy].map(v=>Math.round(v))")
    sel=lambda: sorted(ev("STAGE.UI.sel"))
    def mv(x,z): pg.mouse.move(*ev(W,[x,z])); pg.wait_for_timeout(120)
    def drag(a,b_,button='left',steps=8,hold=None):
        pg.mouse.move(*ev(W,a)); pg.wait_for_timeout(100)
        if hold: pg.keyboard.down(hold); pg.wait_for_timeout(80)
        pg.mouse.down(button=button); pg.wait_for_timeout(80); A_=ev(W,a); B_=ev(W,b_); pg.mouse.move((A_[0]+B_[0])/2,(A_[1]+B_[1])/2,steps=steps); pg.mouse.move(*B_,steps=steps); pg.wait_for_timeout(120); c=cur(); pg.mouse.up(button=button)
        if hold: pg.keyboard.up(hold)
        pg.wait_for_timeout(350); return c
    mv(5,3); c0=cur(); mv(0,1); c1=cur(); ok(c0=='default' and c1=='move' and ev("PLAN.P.tool")=='sel','au départ l\'outil est la flèche : curseur flèche dans le vide, curseur de déplacement sur un objet — plus de main',[c0,c1])
    v0=view(); drag([-3,0],[1,2]); ok(sel()==sorted(ids[:2]) and view()==v0,'glisser dans le vide avec la flèche : un cadre de sélection prend les deux cubes qu\'il entoure, la vue ne bouge pas',[len(sel()),view(),v0])
    pg.mouse.click(*ev(W,[5,3])); pg.wait_for_timeout(300); ok(sel()==[],'un clic dans le vide désélectionne tout')
    pg.mouse.click(*ev(W,[3,-2])); pg.wait_for_timeout(300); s1=sel(); pg.keyboard.down('Shift'); drag([-3,0],[1,2]); pg.keyboard.up('Shift'); ok(s1==[ids[2]] and sel()==sorted(ids),'clic sur un cube, puis Maj + cadre autour des deux autres : ils s\'ajoutent à la sélection',len(sel()))
    c=drag([5,3],[4,2],hold='Space'); v1=view(); ok(c=='grabbing' and v1!=v0 and sel()==sorted(ids),'Espace tenu + glisser : la vue se déplace (curseur main), la sélection ne change pas',[c,v0,v1])
    drag([5,3],[4,2.5],button='middle'); v2=view(); ok(v2!=v1,'bouton du milieu + glisser : la vue se déplace aussi',[v1,v2])
    pg.click('#planTool'); pg.wait_for_timeout(200); mv(5,3); c=cur(); drag([5,3],[4.5,3.5]); v3=view(); ok(c=='grab' and v3!=v2 and ev("PLAN.P.tool")=='pan' and sel()==sorted(ids),'bouton « ✋ Main » : curseur main, glisser déplace la vue sans rien sélectionner',[c,v2,v3])
    pg.click('#planTool'); pg.wait_for_timeout(200); mv(5,3); ok(cur()=='default' and ev("PLAN.P.tool")=='sel','re-clic : retour à la flèche')
    # dessin
    ev("STAGE.select([]);DRAW.tool('rect')"); pg.wait_for_timeout(300); mv(5,2); c=cur(); n0=ev("DRAW.shapes().length"); drag([4,2],[6,3.5]); R=ev("DRAW.shapes().slice(-1)[0]")
    ok(c=='crosshair' and ev("DRAW.shapes().length")==n0+1 and R['rect'] and abs(max(q[0] for q in R['p'])-min(q[0] for q in R['p'])-2)<.11 and abs(max(q[1] for q in R['p'])-min(q[1] for q in R['p'])-1.5)<.11 and view()==v3,'outil Rectangle : curseur en croix ; appuyer, glisser, relâcher trace un rectangle de 2 × 1,5 m (la vue ne bouge pas)',[c,R['p']])
    pg.mouse.click(*ev(W,[4,-3])); pg.wait_for_timeout(200); pg.mouse.click(*ev(W,[5,-2])); pg.wait_for_timeout(300); ok(ev("DRAW.shapes().length")==n0+2,'les deux clics marchent toujours (un coin, puis l\'autre)')
    ev("DRAW.tool('circle')"); pg.wait_for_timeout(200); drag([-4,-3],[-3,-3]); C=ev("DRAW.shapes().slice(-1)[0]"); ok(C['k']=='circle' and abs(C['r']-1)<.06,'outil Cercle au glisser : centre puis rayon de 1 m',C.get('r'))
    # main levée
    ev("DRAW.tool('free')"); pg.wait_for_timeout(200); mv(-5,2); c=cur(); pts=[[-5+ i*.12, 2+.5*math.sin(i*.45)] for i in range(34)]
    pg.mouse.move(*ev(W,pts[0])); pg.mouse.down(); 
    for q in pts[1:]: pg.mouse.move(*ev(W,q),steps=2)
    pg.wait_for_timeout(150); live=ev("DRAW.tl.pts.length"); pg.mouse.up(); pg.wait_for_timeout(400); Fr=ev("DRAW.shapes().slice(-1)[0]")
    ok(c=='crosshair' and live>20 and Fr['k']=='poly' and not Fr['closed'] and 5<=len(Fr['p'])<live and abs(Fr['p'][0][0]+5)<.05 and abs(Fr['p'][-1][0]-(-5+33*.12))<.05 and Fr['name'].startswith('Main levée'),'outil Main levée : le trait suit la souris ; au relâcher une forme ouverte est créée, allégée (moins de points) mais avec les mêmes extrémités',[live,len(Fr['p'])])
    amp=max(q[1] for q in Fr['p'])-min(q[1] for q in Fr['p']); ok(abs(amp-1)<.12,'la forme garde son ondulation (1 m de crête à creux)',round(amp,2))
    loop=[[2+1.2*math.cos(i/40*2*math.pi), 4.2+ .9*math.sin(i/40*2*math.pi)] for i in range(41)]
    pg.mouse.move(*ev(W,loop[0])); pg.mouse.down()
    for q in loop[1:]: pg.mouse.move(*ev(W,q),steps=2)
    pg.mouse.up(); pg.wait_for_timeout(400); Lp=ev("DRAW.shapes().slice(-1)[0]"); ok(Lp['closed'] and len(Lp['p'])>=6 and ev("DRAW.tl.k")=='free','un trait qui revient à son départ donne une forme fermée ; l\'outil reste armé pour le trait suivant',len(Lp['p']))
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(600); ok(ev("DRAW.shapes().slice(-1)[0].name")==Fr['name'],'Ctrl+Z retire le dernier trait, un pas par trait')
    # la flèche prend aussi les dessins dans son cadre
    ev("DRAW.tool(null)"); pg.wait_for_timeout(200); mv(5,0); c=cur(); drag([3.5,1.5],[6.5,4]); ds=ev("DRAW.sels.length"); ok(c=='default' and ds==1 and ev("DRAW.sel")==R['id'],'retour à la flèche : un cadre autour du rectangle dessiné le sélectionne',[c,ds])
    pg.screenshot(path=OUT+'/t113-a.png'); e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
