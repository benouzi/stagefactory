# Alt + clic : ajouter un point sur un trait (et le tirer aussitôt), retirer un point ; dans le plan et en coupe
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
    ev("(()=>{if(!PLAN.P.on)PLAN.toggle(true)})()"); pg.wait_for_timeout(700)
    WP="([x,z])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+x*PLAN.P.s,r.top+PLAN.P.oy+z*PLAN.P.s]}"
    W="([u,h])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+u*PLAN.P.s,r.top+PLAN.P.oy-h*PLAN.P.s]}"
    S="(id)=>DRAW.byId(id).p"
    # une forme libre : main levée, un arc de 8 points environ
    ev("DRAW.O.h=0;DRAW.tool('free')"); pg.wait_for_timeout(200); pts=[[-4+i*.25, 1+1.2*math.sin(i*.2)] for i in range(17)]; pg.mouse.move(*ev(WP,pts[0])); pg.mouse.down()
    for q in pts[1:]: pg.mouse.move(*ev(WP,q),steps=2)
    pg.mouse.up(); pg.wait_for_timeout(400); ev("DRAW.tool(null)"); pg.wait_for_timeout(200); F=ev("DRAW.shapes().slice(-1)[0]"); n0=len(F['p']); a,b_=F['p'][0],F['p'][1]; mid=[(a[0]+b_[0])/2,(a[1]+b_[1])/2]
    ok(n0>=3 and ev("DRAW.sel")==F['id'],'une forme tracée à main levée, choisie',n0)
    pg.keyboard.down('Alt'); pg.mouse.click(*ev(WP,mid)); pg.keyboard.up('Alt'); pg.wait_for_timeout(400); P1=ev(S,F['id'])
    ok(len(P1)==n0+1 and abs(P1[1][0]-mid[0])<.03 and abs(P1[1][1]-mid[1])<.03 and P1[0]==a and P1[2]==b_,'Alt + clic au milieu du premier trait : un point de plus, exactement sur le trait, entre ses deux voisins',[n0,len(P1),P1[1]])
    # Alt + appuyer sur un trait puis glisser : le point est créé et suit la souris
    k=max(range(2,len(P1)-1),key=lambda i:(P1[i][0]-P1[i+1][0])**2+(P1[i][1]-P1[i+1][1])**2); c,d=P1[k],P1[k+1]; m2=[(c[0]+d[0])/2,(c[1]+d[1])/2]; A_=ev(WP,m2); B_=ev(WP,[m2[0],m2[1]+1.5]); pg.keyboard.down('Alt'); pg.mouse.move(*A_); pg.mouse.down(); pg.mouse.move((A_[0]+B_[0])/2,(A_[1]+B_[1])/2,steps=5); pg.mouse.move(*B_,steps=5); pg.mouse.up(); pg.keyboard.up('Alt'); pg.wait_for_timeout(400); P2=ev(S,F['id'])
    ok(len(P2)==n0+2 and abs(P2[k+1][0]-m2[0])<.06 and abs(P2[k+1][1]-(m2[1]+1.5))<.06,'Alt + appuyer sur un trait et glisser : le nouveau point est tiré d\'1,5 m dans le même geste',P2[4])
    # sans Alt : rien n'est ajouté, la forme se déplace comme avant
    pg.mouse.click(*ev(WP,[(P2[0][0]+P2[1][0])/2,(P2[0][1]+P2[1][1])/2])); pg.wait_for_timeout(300); ok(len(ev(S,F['id']))==n0+2,'un clic sans Alt sur un trait n\'ajoute rien')
    # Alt + clic sur un point : retiré
    pg.keyboard.down('Alt'); pg.mouse.click(*ev(WP,P2[k+1])); pg.keyboard.up('Alt'); pg.wait_for_timeout(400); P3=ev(S,F['id']); ok(len(P3)==n0+1 and P3[k+1]==P2[k+2],'Alt + clic sur un point : il est retiré, ses voisins se rejoignent',len(P3))
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
    for _ in range(3): pg.keyboard.press('Control+z'); pg.wait_for_timeout(450)
    ok(ev(S,F['id'])==F['p'],'trois Ctrl+Z : la forme d\'origine (un pas par ajout ou retrait)')
    # un rectangle : Alt + clic en fait un polygone à 5 points
    ev("DRAW.tool('rect')"); pg.wait_for_timeout(200); A_=ev(WP,[2,2]); B_=ev(WP,[5,4]); pg.mouse.move(*A_); pg.mouse.down(); pg.mouse.move(*B_,steps=8); pg.mouse.up(); pg.wait_for_timeout(400); ev("DRAW.tool(null)"); R=ev("DRAW.shapes().slice(-1)[0]")
    pg.keyboard.down('Alt'); pg.mouse.click(*ev(WP,[3.5,2])); pg.keyboard.up('Alt'); pg.wait_for_timeout(400); Rr=ev("(id)=>DRAW.byId(id)",R['id']); ok(len(Rr['p'])==5 and not Rr.get('rect') and Rr['closed'] and [3.5,2] in Rr['p'],'sur un rectangle, Alt + clic ajoute un cinquième point sur le côté : il devient un polygone libre',Rr['p'])
    for i in range(3):
        pp=ev(S,R['id']); pg.keyboard.down('Alt'); pg.mouse.click(*ev(WP,pp[0])); pg.keyboard.up('Alt'); pg.wait_for_timeout(350)
    tt=ev("document.querySelector('#toast').innerText"); ok(len(ev(S,R['id']))==3 and 'au moins 3 points' in tt,'on ne peut pas descendre sous 3 points pour une forme fermée (message)',[len(ev(S,R['id'])),tt[:50]])
    # en coupe
    pg.click('[data-pv=coupe]'); pg.wait_for_timeout(700); ev("DRAW.tool('poly')"); pg.wait_for_timeout(200)
    for q in ([-6,0],[-3,0],[-6,2]): pg.mouse.click(*ev(W,q)); pg.wait_for_timeout(200)
    pg.mouse.click(*ev(W,[-6,0])); pg.wait_for_timeout(500); ev("DRAW.tool(null)"); T=ev("DRAW.shapes().slice(-1)[0]")
    A_=ev(W,[-4.5,1]); B_=ev(W,[-4,2]); pg.keyboard.down('Alt'); pg.mouse.move(*A_); pg.mouse.down(); pg.mouse.move(*B_,steps=8); pg.mouse.up(); pg.keyboard.up('Alt'); pg.wait_for_timeout(400); Tp=ev(S,T['id'])
    ok(len(Tp)==4 and abs(Tp[2][0]+4)<.06 and abs(Tp[2][1]-2)<.06,'en coupe aussi : Alt sur la pente de la rampe ajoute un point, tiré à 2 m de haut',Tp)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
