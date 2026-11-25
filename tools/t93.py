# Ctrl + flèche d'une travée : la structure est PROLONGÉE. La travée et ses tours restent ; une nouvelle travée naît plus loin avec ses tours, reliée par deux travées de liaison.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
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
    pg.wait_for_function("!!PONTS.gz",timeout=30000)
    SU="Object.fromEntries(STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name.split(' · ')[1],[s.a.x,s.a.y,s.b.x,s.b.y,PONTS.piecesOf(s),PONTS.spanMm(s)]]))"
    TW="[...new Set(STAGE.S.sups.flatMap(s=>(s.points||[]).filter(p=>p.leg).map(p=>{const L=Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)||1,t=p.alongMm/L;return Math.round(s.a.x+(s.b.x-s.a.x)*t)+','+Math.round(s.a.y+(s.b.y-s.a.y)*t)})))].sort()"
    s0=ev(SU); fid=ev("STAGE.S.sups.find(s=>s.name.endsWith('face')).id")
    ev("PONTS.select('%s')"%fid); pg.wait_for_timeout(600); pg.click('.ptree [data-id="po|%s"]'%fid,timeout=8000); pg.wait_for_timeout(800)
    ev("(()=>{const z=PONTS.gz;z.start(false,true);z.proxy.position.z+=4;z.apply(false);z.end()})()"); pg.wait_for_timeout(1200); s1=ev(SU); tw=ev(TW)
    ok(all(s1[k]==s0[k] for k in s0),'Ctrl + flèche de la face, 4 m vers le public : les quatre travées d\'origine ne bougent pas',{k:s1[k][:4] for k in s0})
    ok('face 2' in s1 and s1['face 2'][:4]==[-4000,-4000,4000,-4000] and s1['face 2'][4]==s0['face'][4],'une nouvelle travée « face 2 », identique, 4 m plus loin',s1.get('face 2'))
    ok(s1.get('jardin 2',[0])[:4]==[-4000,0,-4000,-4000] and s1.get('cour 2',[0])[:4]==[4000,0,4000,-4000] and sum(s1['jardin 2'][4])==s1['jardin 2'][5] and sum(s1['cour 2'][4])==s1['cour 2'][5],'deux travées de liaison (jardin 2, cour 2) relient l\'ancienne face à la nouvelle, en pièces de la gamme',[s1.get('jardin 2'),s1.get('cour 2')])
    ok(tw==['-4000,-4000','-4000,0','-4000,6000','4000,-4000','4000,0','4000,6000'],'six tours : les quatre d\'origine en place, deux nouvelles sous la nouvelle travée',tw)
    r=ev("[PONTS.structs().map(q=>[q.name,q.m.length]),PONTS.nodes().map(n=>n.ways).sort(),PONTS.sel===STAGE.S.sups.find(s=>s.name.endsWith('face 2')).id,!!PONTS.gz.span]"); pg.wait_for_timeout(500)
    ok(r[0]==[['Gril',7]] and len(r[1])==6 and r[2],'toujours UNE structure (7 travées, 6 coins) ; la nouvelle travée est choisie, prête à être prolongée encore',r)
    ev("(()=>{APP.camera.position.set(-11,10,12);APP.orbit.target.set(0,3,-1);APP.orbit.update()})()"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/t93.png',clip={'x':60,'y':45,'width':1090,'height':560})
    g=ev("PONTS.gz.proxy.position.toArray().map(v=>+v.toFixed(2))"); ok(g[0]==0 and g[2]==4,'le gizmo est passé sur la nouvelle travée',g)
    # sans Ctrl, la nouvelle travée se pousse comme avant : ses liaisons s'allongent
    ev("(()=>{const z=PONTS.gz;z.start(false,false);z.proxy.position.z+=1;z.apply(false);z.end()})()"); pg.wait_for_timeout(1000); s2=ev(SU); ok(s2['face 2'][1]==-5000 and s2['jardin 2'][:4]==[-4000,0,-4000,-5000] and s2['face']==s0['face'],'sans Ctrl : la nouvelle travée avance, ses deux liaisons s\'allongent, l\'ancienne face reste',[s2['face 2'][:4],s2['jardin 2'][:4]])
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(2): pg.keyboard.press('Control+z'); pg.wait_for_timeout(700)
    ok(ev(SU)==s0 and ev(TW)==['-4000,0','-4000,6000','4000,0','4000,6000'],'deux Ctrl+Z : le gril d\'origine',ev(SU))
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
