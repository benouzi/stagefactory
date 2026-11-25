# gestes de base sur les structures : Maj+clic (plusieurs pièces), Ctrl+glisser (copie), Ctrl+D, Ctrl+C/V, Suppr, Échap, flèches
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200)
    ST="PONTS.structs().map(q=>[q.name,q.m.length])"; SU="STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name,s.a.x,s.a.y,s.b.x,s.b.y,PONTS.piecesOf(s)])"
    ev("PONTS.select(null);document.querySelector('#planBtn').click()"); pg.wait_for_timeout(600); ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300)
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    def drag(x0,z0,x1,z1,mod=None):
        x,y=P(x0,z0); x2,y2=P(x1,z1); 
        if mod: pg.keyboard.down(mod)
        pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move((x+x2)/2,(y+y2)/2,steps=4); pg.mouse.move(x2,y2,steps=4); pg.mouse.up()
        if mod: pg.keyboard.up(mod)
        pg.wait_for_timeout(800)
    blur=lambda: pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    # structure entière : Échap remonte de la pièce à la structure, Ctrl+D la duplique
    pg.mouse.click(*P(-3,0)); pg.wait_for_timeout(400); blur(); pg.keyboard.press('Escape'); pg.wait_for_timeout(500); ok(ev("PONTS.st===true"),'Échap sur une pièce : on remonte à la structure')
    pg.keyboard.press('Control+d'); pg.wait_for_timeout(1200); r=ev(ST); ok(sorted(r)==[['Gril',4],['Gril 2',4]] and ev("PONTS.st===true"),'Ctrl+D sur la structure : un second gril complet, nommé Gril 2, et c\'est lui qui est choisi',r)
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(500); g2=ev("STAGE.S.sups.filter(s=>s.st==='Gril 2').map(s=>s.a.x)"); g1=ev("STAGE.S.sups.filter(s=>s.st==='Gril').map(s=>s.a.x)"); ok(sorted(g2)==[-2950,-2950,-2950,5050] and sorted(g1)==[-4000,-4000,-4000,4000],'flèche droite : la structure choisie avance de 5 cm, l\'autre ne bouge pas',[g2,g1])
    pg.keyboard.press('Control+c'); pg.wait_for_timeout(300); pg.keyboard.press('Control+v'); pg.wait_for_timeout(1200); r=ev(ST); ok(sorted(r)==[['Gril',4],['Gril 2',4],['Gril 3',4]],'Ctrl+C puis Ctrl+V : un troisième gril',r)
    pg.keyboard.press('Delete'); pg.wait_for_timeout(900); r=ev(ST); ok(sorted(r)==[['Gril',4],['Gril 2',4]],'Suppr sur la structure choisie : elle seule est supprimée',r)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); ok(ev("!PONTS.sel"),'Échap sur la structure : plus rien de choisi')
    # un pont seul de 7 m en 3 + 2 + 2
    ev("(()=>{STAGE.S.sups=[];PONTS.sync();PONTS.O.series='prolyte-h30v';PONTS.O.hang='none';PONTS.O.zMm=3000;PONTS.addTruss({x:-3500,y:0},{x:3500,y:0},null,true,[3000,2000,2000]);PONTS.select(null);PLAN.P.dirty=true})()"); pg.wait_for_timeout(900)
    pg.mouse.click(*P(-2,0)); pg.wait_for_timeout(300); pg.keyboard.down('Shift'); pg.mouse.click(*P(2.5,0)); pg.keyboard.up('Shift'); pg.wait_for_timeout(400); txt=ev("document.querySelector('#pontBar').innerText")
    hi=ev("(()=>{let n=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isInstancedMesh&&o.material.emissive&&o.material.emissive.getHex()===0x4a3008)n+=o.count});return n})()")
    ok(ev("PONTS.pcs&&PONTS.pcs.size")==2 and txt.startswith('2 pièces choisies') and hi>=40,'Maj+clic : deux pièces choisies (la 1re et la 3e), toutes deux mises en évidence',[txt[:40],hi])
    pg.keyboard.down('Shift'); pg.mouse.click(*P(2.5,0)); pg.wait_for_timeout(300); ok(ev("!PONTS.pcs&&PONTS.pc&&PONTS.pc.i")==0,'Maj+clic sur une pièce déjà choisie : elle sort de la sélection'); pg.mouse.click(*P(.5,0)); pg.keyboard.up('Shift'); pg.wait_for_timeout(400); ok(ev("PONTS.pcs&&[...PONTS.pcs].length")==2,'Maj+clic sur la 2e : pièces 1 et 2 choisies')
    # Ctrl+glisser : copie des deux pièces, qui restent ensemble ; l'original ne bouge pas
    drag(-2,0,-2,2,'Control'); su=ev(SU); ok(len(su)==2 and su[0][1:]==[-3500,0,3500,0,[3000,2000,2000]] and su[1][5]==[3000,2000] and su[1][2]==-2000 and su[1][1]==-3500 and su[1][3]==1500,'Ctrl+glisser : les deux pièces sont copiées 2 m plus près du public, en un seul pont de 3 + 2 ; l\'original est intact',su)
    blur(); pg.keyboard.press('Control+z'); pg.wait_for_timeout(700); ok(len(ev(SU))==1,'Ctrl+Z : la copie disparaît')
    # Ctrl+D sur une pièce
    pg.mouse.click(*P(2.5,0)); pg.wait_for_timeout(300); blur(); pg.keyboard.press('Control+d'); pg.wait_for_timeout(900); su=ev(SU); ok(len(su)==2 and su[1][5]==[2000] and su[1][1]==2500 and su[1][2]==-1000,'Ctrl+D sur une pièce : une copie de cette seule pièce, décalée de 1 m',su)
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(700)
    # Suppr sur une pièce : elle seule part (trou), pas le pont
    pg.mouse.click(*P(.5,0)); pg.wait_for_timeout(300); blur(); pg.keyboard.press('Delete'); pg.wait_for_timeout(900); su=ev(SU); ok(len(su)==2 and su[0][5]==[3000] and su[1][5]==[2000] and su[1][1]==1500,'Suppr sur la pièce du milieu : elle seule est retirée, il reste 3 m et 2 m avec un trou',su)
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(700)
    # Suppr sur plusieurs pièces
    pg.mouse.click(*P(-2,0)); pg.wait_for_timeout(300); pg.keyboard.down('Shift'); pg.mouse.click(*P(.5,0)); pg.keyboard.up('Shift'); pg.wait_for_timeout(300); blur(); pg.keyboard.press('Delete'); pg.wait_for_timeout(1000); su=ev(SU); ok(len(su)==1 and su[0][5]==[2000] and su[0][1]==1500 and su[0][3]==3500,'Suppr sur deux pièces : il reste la troisième, à sa place',su)
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(700); ok(ev(SU)[0][5]==[3000,2000,2000] and len(ev(SU))==1,'un seul Ctrl+Z ramène les deux pièces',ev(SU))
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
