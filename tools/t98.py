# bout libre d'un pont : la flèche dans l'axe tire pour allonger / raccourcir, les pièces sont recalculées ; saisie de la longueur exacte
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
    ev("document.querySelector('[data-dom=rig]').click()"); pg.wait_for_timeout(400); pg.wait_for_function("!!PONTS.gz",timeout=30000)
    ev("(()=>{PONTS.O.series='prolyte-h30v';PONTS.O.hang='auto';PONTS.O.zMm=3000;PONTS.addTruss({x:-3500,y:0},{x:3500,y:0},null,true,[3000,2000,2000]);PONTS.select(null)})()"); pg.wait_for_timeout(900)
    S="(()=>{const s=STAGE.S.sups.find(s=>s.kind==='truss');return {a:[s.a.x,s.a.y],b:[s.b.x,s.b.y],pcs:PONTS.piecesOf(s),gap:PONTS.piecesOf(s).reduce((a,b)=>a+b,0)-PONTS.spanMm(s),pts:(s.points||[]).map(p=>p.alongMm)}})()"
    pick=lambda al: (ev("(()=>{const s=STAGE.S.sups.find(s=>s.kind==='truss');PONTS.select(s.id);PONTS.pickPiece(s,%d)})()"%al),pg.wait_for_timeout(900))
    def go(dx,dz,axis): ev("([dx,dz,ax])=>{const z=PONTS.gz;z.start(false,false,ax);z.proxy.position.x+=dx;z.proxy.position.z+=dz;z.apply(false);z.end()}",[dx,dz,axis]); pg.wait_for_timeout(1000)
    s0=ev(S); pick(6500)
    g=ev("(()=>{const z=PONTS.gz;return {end:z.endMode,p:z.proxy.position.toArray().map(v=>+v.toFixed(2)),sp:z.gz.space,rot:!!z.gzR.object,tip:document.querySelector('#gzTip').innerText.replace(/\\n/g,' ').slice(0,60),v:(document.querySelector('#gzTip [data-gzd]')||{}).value}})()")
    ok(g['end']=='b' and g['p'][0]==3.5 and g['p'][2]==0 and g['sp']=='local' and g['tip'].startswith('Pont') and g['v']=='7','dernière pièce choisie : le gizmo est au bout du pont, dans son axe ; la longueur (7 m) est affichée',g)
    go(2,0,'X'); s1=ev(S); ok(s1['a']==s0['a'] and s1['b']==[5500,0] and sum(s1['pcs'])==9000 and abs(s1['gap'])<=5,'tirer la flèche de 2 m : le bout avance, l\'autre ne bouge pas, 9 m recomposés en pièces justes',s1)
    ok(len(s1['pts'])>=2 and max(s1['pts'])<=9000 and s1['pts']!=s0['pts'] and ev("PONTS.pc&&PONTS.pc.i")==len(s1['pcs'])-1 and ev("PONTS.gz.endMode")=='b','les points d\'accroche sont répartis sur la nouvelle longueur ; la pièce du bout reste choisie',s1['pts'])
    pg.screenshot(path=OUT+'/t98.png',clip={'x':60,'y':45,'width':1090,'height':560})
    pg.fill('#gzTip [data-gzd]','12'); pg.keyboard.press('Enter'); pg.wait_for_timeout(1100); s2=ev(S); ok(s2['a']==s0['a'] and s2['b']==[8500,0] and sum(s2['pcs'])==12000 and abs(s2['gap'])<=5,'taper 12 : le pont fait exactement 12 m',s2)
    go(-6.5,0,'X'); s3=ev(S); ok(s3['b']==[2000,0] and sum(s3['pcs'])==5500 and abs(s3['gap'])<=5,'repousser de 6,5 m : le pont raccourcit à 5,5 m',s3)
    # l'autre bout
    pick(500); ok(ev("PONTS.gz.endMode")=='a' and ev("PONTS.gz.proxy.position.x")==-3.5,'première pièce choisie : le gizmo passe à l\'autre bout'); go(-1.5,0,'X'); s4=ev(S)
    ok(s4['b']==s3['b'] and s4['a']==[-5000,0] and sum(s4['pcs'])==7000 and abs(s4['gap'])<=5,'tirer ce bout de 1,5 m vers l\'extérieur : c\'est lui qui avance',s4)
    # les autres flèches déplacent tout le pont
    go(0,1,'Z'); s5=ev(S); ok(s5['a']==[-5000,-1000] and s5['b']==[2000,-1000] and s5['pcs']==s4['pcs'],'flèche de travers : le pont entier se déplace, sa longueur ne change pas',s5)
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(5): pg.keyboard.press('Control+z'); pg.wait_for_timeout(600)
    s9=ev(S); ok(s9['a']==s0['a'] and s9['b']==s0['b'] and s9['pcs']==s0['pcs'],'cinq Ctrl+Z : le pont d\'origine',s9)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
