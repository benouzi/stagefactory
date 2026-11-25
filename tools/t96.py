# barre de pièce en bas de la vue ; cotes en direct et saisie exacte ; gizmo aux coins (pousser, Ctrl = nouveau départ avec son pied)
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
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200)
    pg.wait_for_function("!!PONTS.gz",timeout=30000)
    SU="Object.fromEntries(STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name.split(' · ')[1],[s.a.x,s.a.y,s.b.x,s.b.y,PONTS.piecesOf(s).reduce((a,b)=>a+b,0)-PONTS.spanMm(s)]]))"
    TW="[...new Set(STAGE.S.sups.flatMap(s=>(s.points||[]).filter(p=>p.leg).map(p=>{const L=Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)||1,t=p.alongMm/L;return Math.round(s.a.x+(s.b.x-s.a.x)*t)+','+Math.round(s.a.y+(s.b.y-s.a.y)*t)})))].sort()"
    fits=lambda s: all(abs(v[4])<=5 for v in s.values())
    fid=ev("STAGE.S.sups.find(s=>s.name.endsWith(' · face')).id")
    # barre de pièce : en bas de la vue 3D, hors du plan
    ev("PONTS.select('%s');PONTS.pickPiece(STAGE.S.sups.find(s=>s.id==='%s'),1000)"%(fid,fid)); pg.wait_for_timeout(700)
    r=ev("(()=>{const b=document.querySelector('#pontBar').getBoundingClientRect(),c=document.querySelector('#plan2d').getBoundingClientRect(),v=APP.renderer.domElement.getBoundingClientRect();return {top:b.top,bottom:b.bottom,h:b.height,right:b.right,planL:c.left,vb:v.bottom,ih:innerHeight}})()")
    ok(r['top']>300 and r['right']<=r['planL']+2 and r['h']<140 and r['bottom']<=r['vb']+2,'barre de pièce : en bas de la vue 3D, elle ne recouvre plus le plan',r); pg.screenshot(path=OUT+'/t96-barre.png')
    # travée : cotes et saisie exacte
    pg.click('.ptree [data-id="po|%s"]'%fid,timeout=8000); pg.wait_for_timeout(900); t=ev("(()=>{const e=document.querySelector('#gzTip');return [getComputedStyle(e).display,e.innerText.replace(/\\n/g,' ')]})()")
    ok(t[0]=='flex' and t[1].startswith('Travée') and 'face 8,00 m' in t[1] and '(4 + 3)' in t[1],'travée choisie : sa cote et ses pièces sont affichées',t)
    ev("(()=>{const z=PONTS.gz;z.start(false,false);z.proxy.position.z+=1;z.apply(false)})()"); pg.wait_for_timeout(400); t=ev("document.querySelector('#gzTip').innerText.replace(/\\n/g,' ')"); ok('distance 1,00 m' in t and 'jardin 7,00 m' in t and 'cour 7,00 m' in t,'pendant le geste : distance et longueur des travées touchées, en direct',t)
    ev("PONTS.gz.end()"); pg.wait_for_timeout(900); v=ev("(document.querySelector('#gzTip [data-gzd]')||{}).value"); ok(v=='1','après le geste : la distance est dans un champ, modifiable',v)
    pg.fill('#gzTip [data-gzd]','2.5'); pg.keyboard.press('Enter'); pg.wait_for_timeout(1100); s1=ev(SU); t=ev("document.querySelector('#gzTip').innerText.replace(/\\n/g,' ')")
    ok(s1['face'][1]==-2500 and s1['jardin'][:4]==[-4000,-2500,-4000,6000] and fits(s1) and ev("(document.querySelector('#gzTip [data-gzd]')||{}).value")=='2.5' and 'jardin 8,50 m' in t,'taper 2,5 : la face se place exactement à 2,50 m, tout est recomposé juste',[s1['face'][:4],t])
    # coin : gizmo au coin
    key=ev("(()=>{const n=PONTS.nodes().find(n=>n.at.x===-4000&&n.at.y===-2500);return n?PONTS.nodeKey(n):null})()"); ev("PONTS.pickNode('%s')"%key); pg.wait_for_timeout(900)
    g=ev("(()=>{const z=PONTS.gz;return {on:!!z.gz.object,node:z.nodeMode,p:z.proxy.position.toArray().map(v=>+v.toFixed(2)),sp:z.gz.space,tip:document.querySelector('#gzTip').innerText.slice(0,4)}})()")
    ok(g['on'] and g['node'] and g['p'][0]==-4 and g['p'][2]==2.5 and g['sp']=='local' and g['tip']=='Coin','coin choisi : le gizmo est sur le coin',g)
    d0=ev("(()=>{const n=PONTS.nodes().find(n=>PONTS.nodeKey(n)===PONTS.node),m=n.members[0];return [m.dir.x,m.dir.y,m.s.name.split(' · ')[1]]})()")
    mv=lambda k,ctrl: (ev("([dx,dy,k,c])=>{const z=PONTS.gz;z.start(false,c,'X');z.proxy.position.x+=dx*k;z.proxy.position.z+=-dy*k;z.apply(false);z.end()}",[d0[0],d0[1],k,ctrl]),pg.wait_for_timeout(1100))
    s2a=ev(SU); mv(-1,False); s2=ev(SU); other='jardin' if d0[2]=='face' else 'face'
    L=lambda q:round(((q[2]-q[0])**2+(q[3]-q[1])**2)**.5)
    ok(L(s2[d0[2]])==L(s2a[d0[2]])+1000 and s2[other][:4]!=s2a[other][:4] and L(s2[other])==L(s2a[other]) and fits(s2) and ev("PONTS.nodes().length")==4 and ev("!!PONTS.node&&!!PONTS.nodes().find(n=>PONTS.nodeKey(n)===PONTS.node)"),'tirer le coin de 1 m dans l\'axe d\'une travée : elle s\'allonge, la travée d\'en face est poussée, le coin reste choisi',[d0,s2[d0[2]][:4],s2[other][:4]])
    # Ctrl sur le coin : un nouveau départ, avec son pied
    tw0=ev(TW); mv(-3,True); s3=ev(SU); tw=ev(TW)
    ok('départ' in s3 and 2500<=L(s3['départ'])<=3500 and fits(s3) and all(s3[k]==s2[k] for k in s2) and len(tw)==len(tw0)+1 and ev("PONTS.structs().length")==1 and ev("STAGE.S.sups.find(s=>s.id===PONTS.sel).name").endswith('départ'),'Ctrl + flèche du coin, vers l\'extérieur : une nouvelle travée part du coin, en pièces justes, avec son pied au bout ; le reste ne bouge pas',[s3.get('départ'),tw])
    ev("(()=>{APP.camera.position.set(-13,11,12);APP.orbit.target.set(-1,3,-1);APP.orbit.update()})()"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/t96.png',clip={'x':60,'y':45,'width':1090,'height':560})
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(4): pg.keyboard.press('Control+z'); pg.wait_for_timeout(700)
    s9=ev(SU); ok(len(s9)==4 and s9['face'][:4]==[-4000,0,4000,0],'quatre Ctrl+Z : le gril d\'origine',s9)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
