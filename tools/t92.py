# travée choisie dans l'arbre : gizmo centré sur elle ; la pousser allonge / raccourcit les travées d'équerre, recomposées en pièces de la gamme
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:460],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200)
    pg.wait_for_function("!!PONTS.gz",timeout=30000)
    SU="Object.fromEntries(STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name.split(' · ')[1],[s.a.x,s.a.y,s.b.x,s.b.y,PONTS.piecesOf(s),PONTS.spanMm(s)]]))"
    TW="[...new Set(STAGE.S.sups.flatMap(s=>(s.points||[]).filter(p=>p.leg).map(p=>{const L=Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)||1,t=p.alongMm/L;return Math.round(s.a.x+(s.b.x-s.a.x)*t)+','+Math.round(s.a.y+(s.b.y-s.a.y)*t)})))].sort()"
    s0=ev(SU); fid=ev("STAGE.S.sups.find(s=>s.name.endsWith('face')).id"); lid=ev("STAGE.S.sups.find(s=>s.name.endsWith('lointain')).id")
    # clic sur une pièce dans la vue : gizmo de la structure, au centre
    ev("PONTS.select('%s')"%fid); pg.wait_for_timeout(600)
    pg.click('.ptree [data-id="po|%s"]'%fid,timeout=8000); pg.wait_for_timeout(800)
    g=ev("(()=>{const z=PONTS.gz;return {span:!!z.span,p:z.proxy.position.toArray().map(v=>+v.toFixed(2)),x:z.gz.showX,y:z.gz.showY,zz:z.gz.showZ,rot:!!z.gzR.object,sp:z.gz.space}})()")
    ok(g['span'] and g['p']==[0,5.14,0] and not g['x'] and not g['y'] and g['zz'] and not g['rot'] and g['sp']=='local','« face » choisie dans l\'arbre : gizmo centré sur cette travée, une seule flèche, perpendiculaire',g)
    ev("(()=>{APP.camera.position.set(-9,9,10);APP.orbit.target.set(0,3,-3);APP.orbit.update()})()"); pg.wait_for_timeout(900); pg.screenshot(path=OUT+'/t92.png',clip={'x':60,'y':45,'width':1090,'height':560})
    # pousser la face de 1 m vers le public : jardin et cour s'allongent de 1 m
    ev("(()=>{const z=PONTS.gz;z.start(false);z.proxy.position.z+=1;z.apply(false);z.end()})()"); pg.wait_for_timeout(900); s1=ev(SU); tw=ev(TW)
    ok(s1['face'][:4]==[-4000,-1000,4000,-1000] and s1['face'][4]==s0['face'][4] and s1['lointain']==s0['lointain'] and s1['jardin'][:4]==[-4000,-1000,-4000,6000] and s1['cour'][:4]==[4000,-1000,4000,6000],'pousser la face de 1 m : elle avance, le lointain ne bouge pas, jardin et cour s\'allongent jusqu\'à elle',s1)
    ok(sum(s1['jardin'][4])==6000==s1['jardin'][5] and sum(s1['cour'][4])==6000 and s1['jardin'][4]!=s0['jardin'][4],'jardin et cour sont recomposés en pièces de la gamme (6 m entre coins)',[s0['jardin'][4],s1['jardin'][4]])
    ok(tw==['-4000,-1000','-4000,6000','4000,-1000','4000,6000'] and ev("PONTS.nodes().length")==4 and ev("PONTS.structs().length")==1,'les tours et les coins de la face ont suivi, toujours une seule structure',tw)
    g=ev("PONTS.gz.proxy.position.toArray().map(v=>+v.toFixed(2))"); pg.wait_for_timeout(300); ok(g==[0,5.14,1],'le gizmo est resté centré sur la face',g)
    pg.screenshot(path=OUT+'/t92-b.png',clip={'x':60,'y':45,'width':1090,'height':560})
    # la reculer de 2 m : jardin et cour raccourcissent
    ev("(()=>{const z=PONTS.gz;z.start(false);z.proxy.position.z-=2;z.apply(false);z.end()})()"); pg.wait_for_timeout(900); s2=ev(SU)
    ok(s2['face'][1]==1000 and s2['jardin'][:4]==[-4000,1000,-4000,6000] and sum(s2['jardin'][4])==4000 and ev("PONTS.nodes().length")==4,'reculer la face de 2 m : jardin et cour raccourcissent à 5 m (4 m entre coins)',s2)
    # le lointain, par son autre bout
    pg.click('.ptree [data-id="po|%s"]'%lid,timeout=8000); pg.wait_for_timeout(800); ev("(()=>{const z=PONTS.gz;z.start(false);z.proxy.position.z-=1;z.apply(false);z.end()})()"); pg.wait_for_timeout(900); s3=ev(SU); tw=ev(TW)
    ok(s3['lointain'][:4]==[-4000,7000,4000,7000] and s3['jardin'][:4]==[-4000,1000,-4000,7000] and sum(s3['cour'][4])==5000 and tw==['-4000,1000','-4000,7000','4000,1000','4000,7000'] and ev("PONTS.nodes().length")==4,'pousser le lointain de 1 m vers le fond : même logique par l\'autre bout',[s3,tw])
    # glisser de travers (le long de la travée) ne fait rien
    ev("(()=>{const z=PONTS.gz;z.start(false);z.proxy.position.x+=2;z.apply(false);z.end()})()"); pg.wait_for_timeout(700); ok(ev(SU)==s3,'un déplacement le long de la travée est ignoré : les coins restent d\'équerre')
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(4): pg.keyboard.press('Control+z'); pg.wait_for_timeout(600)
    ok(ev(SU)==s0,'quatre Ctrl+Z : le gril d\'origine',ev(SU))
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
