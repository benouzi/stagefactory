# 4.67.0 — gizmo du plan 2D : flèche rouge (jardin–cour), flèche bleue (face–lointain), anneau de rotation, à la vraie souris.
import sys,os,math; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:520],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200)
    ev("DOCK.view('plan');APP.toggleConsole(false);APP.toggleHelp(true)"); pg.wait_for_timeout(1500)
    AB="Object.fromEntries(STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name.split(' · ')[1],[s.a.x,s.a.y,s.b.x,s.b.y]]))"
    fid=ev("STAGE.S.sups.find(s=>s.name.endsWith('face')).id"); ev("PONTS.select('%s')"%fid); pg.wait_for_timeout(900)
    G="(()=>{const g=PONTS.pgGroup(),r=document.querySelector('#plan2d').getBoundingClientRect(),P=PLAN.P;return g?{x:r.left+P.ox+g.c.x/1000*P.s,y:r.top+P.oy-g.c.y/1000*P.s,s:P.s,n:g.grp.length,view:P.view}:null})()"
    g=ev(G); ok(g and g['n']==4 and g['view']=='plan','un pont du gril choisi : le gizmo du plan est au centre de la structure (4 travées)',g)
    pg.screenshot(path=OUT+'/t148-a-gizmo.png')
    def drag(x0,y0,x1,y1,steps=8):
        pg.mouse.move(x0,y0); pg.mouse.down(); 
        for i in range(1,steps+1): pg.mouse.move(x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps); pg.wait_for_timeout(40)
        pg.wait_for_timeout(200)
    a0=ev(AB)
    # flèche rouge : +80 px vers la droite, avec un écart vertical qui ne doit pas compter
    drag(g['x']+40,g['y'],g['x']+120,g['y']+35); pg.screenshot(path=OUT+'/t148-b-rouge.png'); inf=ev("PONTS.PG.info"); pg.mouse.up(); pg.wait_for_timeout(700); a1=ev(AB)
    dx=round(80/g['s']/.05)*.05*1000; ok(all(a1[k][0]-a0[k][0]==dx and a1[k][2]-a0[k][2]==dx and a1[k][1]==a0[k][1] and a1[k][3]==a0[k][3] for k in a0) and 'Jardin–cour' in inf,'flèche rouge tirée de 80 px : toute la structure glisse en jardin–cour seulement, la cote s\'affiche pendant le geste',[dx,inf,a1['face']])
    g=ev(G)
    # flèche bleue : 60 px vers le haut (lointain)
    drag(g['x'],g['y']-40,g['x']+30,g['y']-100); pg.mouse.up(); pg.wait_for_timeout(700); a2=ev(AB); dy=round(60/g['s']/.05)*.05*1000
    ok(all(a2[k][1]-a1[k][1]==dy and a2[k][3]-a1[k][3]==dy and a2[k][0]==a1[k][0] for k in a0),'flèche bleue tirée de 60 px vers le haut : la structure part vers le lointain seulement',[dy,a2['face']])
    g=ev(G)
    # anneau : saisi à droite du centre, amené au-dessus = un quart de tour
    R=92; pg.mouse.move(g['x']+R,g['y']); pg.mouse.down()
    for i in range(1,13): a=math.pi/2*i/12; pg.mouse.move(g['x']+R*math.cos(a),g['y']-R*math.sin(a)); pg.wait_for_timeout(40)
    pg.wait_for_timeout(200); inf=ev("PONTS.PG.info"); pg.screenshot(path=OUT+'/t148-c-anneau.png'); pg.mouse.up(); pg.wait_for_timeout(700); a3=ev(AB)
    cx=sum(a2[k][0]+a2[k][2] for k in a2)/8; cy=sum(a2[k][1]+a2[k][3] for k in a2)/8
    rot=lambda x,y:(cx-(y-cy),cy+(x-cx)); e=max(max(abs(a3[k][0]-rot(a2[k][0],a2[k][1])[0]),abs(a3[k][1]-rot(a2[k][0],a2[k][1])[1]),abs(a3[k][2]-rot(a2[k][2],a2[k][3])[0]),abs(a3[k][3]-rot(a2[k][2],a2[k][3])[1])) for k in a2)
    ok(e<=2 and '90' in inf and ev("PONTS.structs().map(q=>q.m.length)")==[4],'anneau tourné d\'un quart de tour : toute la structure tourne de 90° autour de son centre, sans se défaire',[e,inf])
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(3): pg.keyboard.press('Control+z'); pg.wait_for_timeout(700)
    ok(ev(AB)==a0,'trois Ctrl+Z : la structure est revenue à sa place (une annulation par geste)',ev(AB)['face'])
    # un clic ailleurs sur un pont garde le comportement d'avant (choisir, glisser)
    q=ev("(()=>{const s=STAGE.S.sups.find(s=>s.name.endsWith('lointain')),r=document.querySelector('#plan2d').getBoundingClientRect(),P=PLAN.P,[x,z]=PONTS.at(s,PONTS.len(s)*.15);return {x:r.left+P.ox+x*P.s,y:r.top+P.oy+z*P.s,id:s.id}})()")
    pg.mouse.click(q['x'],q['y']); pg.wait_for_timeout(700); nm=ev("(()=>{const s=PONTS.byId(PONTS.sel);return [s&&s.name,PONTS.pgHit?1:0]})()"); ok(ev("PONTS.sel")==q['id'],'cliquer un autre pont le choisit comme avant',[nm,q,fid])
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
print('\nt148 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
