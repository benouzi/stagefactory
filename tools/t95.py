# coin intérieur : pousser une travée du milieu déplace simplement le coin, un côté raccourcit, l'autre s'allonge, jamais de manque ; un étage suit la travée qui le porte
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
    ID=lambda n: ev("STAGE.S.sups.find(s=>s.name.endsWith(' · %s')).id"%n)
    sel=lambda i:(ev("PONTS.select('%s')"%i),pg.wait_for_timeout(500),pg.click('.ptree [data-id="po|%s"]'%i,timeout=8000),pg.wait_for_timeout(800))
    def go(dx,dy,dz,ctrl=False): ev("([dx,dy,dz,c])=>{const z=PONTS.gz;z.start(false,c);z.proxy.position.x+=dx;z.proxy.position.y+=dy;z.proxy.position.z+=dz;z.apply(false);z.end()}",[dx,dy,dz,ctrl]); pg.wait_for_timeout(1100)
    fits=lambda s: all(abs(v[4])<=5 for v in s.values())
    fid=ID('face'); sel(fid); go(0,0,4,True); s1=ev(SU); ok(len(s1)==7 and fits(s1),'gril prolongé de 4 m : 7 travées, toutes en pièces justes',s1)
    # la face est maintenant au milieu : la pousser déplace le coin intérieur
    sel(fid); go(0,0,1.5); s2=ev(SU)
    ok(s2['face'][1]==s2['face'][3] and -1750<=s2['face'][1]<=-1250 and s2['jardin'][:4]==[-4000,s2['face'][1],-4000,6000] and s2['jardin 2'][:4]==[-4000,s2['face'][1],-4000,-4000] and s2['face 2']==s1['face 2'] and s2['lointain']==s1['lointain'],'pousser la travée du milieu : seul le coin intérieur se déplace, jardin s\'allonge, jardin 2 raccourcit, les deux bouts de la structure ne bougent pas',s2)
    ok(fits(s2) and ev("PONTS.nodes().length")==6 and ev("PONTS.structs().length")==1,'aucun manque : toutes les travées sont recomposées en pièces de la gamme, 6 coins, une structure',{k:v[4] for k,v in s2.items()})
    # une position que la gamme ne fait pas : on tombe sur la plus proche qui se fait
    go(0,0,.35); s3=ev(SU); ok(fits(s3) and s3['face'][1]!=s2['face'][1] or fits(s3),'déplacement de 35 cm : la travée s\'arrête là où tout tombe juste',[s3['face'][:2],{k:v[4] for k,v in s3.items()}])
    # un étage sur la face, puis on pousse la face : l'étage suit
    go(0,2,0,True); s4=ev(SU); ok('face haut' in s4 and s4['face haut'][:4]==s4['face'][:4],'étage posé sur la face',s4.get('face haut'))
    sel(fid); go(0,0,-1); s5=ev(SU)
    ok(s5['face'][1]!=s4['face'][1] and s5['face haut'][:4]==s5['face'][:4] and fits(s5) and ev("PONTS.structs().length")==1,'pousser la face : l\'étage qu\'elle porte la suit, rien ne se détache, tout tombe juste',[s5['face'][:4],s5['face haut'][:4]])
    ev("(()=>{APP.camera.position.set(-12,12,13);APP.orbit.target.set(0,4,-1);APP.orbit.update()})()"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/t95.png',clip={'x':60,'y':45,'width':1090,'height':560})
    # double-clic dans la vue : niveau travée
    ev("PONTS.select(null)"); pg.wait_for_timeout(400); xy=ev("(()=>{const s=STAGE.S.sups.find(s=>s.name.endsWith(' · face 2')),v=new APP.THREE.Vector3((s.a.x+s.b.x)/2000+1,s.zMm/1000+.29,-(s.a.y+s.b.y)/2000).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]})()")
    pg.mouse.dblclick(*xy); pg.wait_for_timeout(900); ok(ev("!!PONTS.gz.span&&!PONTS.pc")==True and ev("PONTS.sel")==ID('face 2'),'double-clic sur une travée dans la vue 3D : c\'est la travée qui est choisie, avec son gizmo',ev("[PONTS.sel,JSON.stringify(PONTS.pc)]"))
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
