# Mode dessin, lot 2 : raccourcis, sélection multiple, groupes, aimants, arc, décalage, miroir, échelle, rotation.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:380],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=des]').click();document.querySelector('#planBtn').click()"); pg.wait_for_timeout(600); ev("PLAN.fit();PLAN.draw()")
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    SH=lambda: ev("STAGE.S.shapes.map(s=>({id:s.id,k:s.k,n:s.name,p:s.p,c:s.c,r:s.r,cl:!!s.closed,rect:!!s.rect,arc:!!s.arc,g:s.g||null,h:s.h}))")
    ok(ev("!!document.querySelector('#rail [data-t=darc]')"),'outil Arc dans le rail')
    # raccourcis d'une touche
    pg.mouse.move(*P(0,0)); pg.keyboard.press('r'); pg.wait_for_timeout(120); ok(ev("DRAW.tl&&DRAW.tl.k")=='rect','touche R : outil Rectangle')
    pg.mouse.click(*P(-4,1)); pg.mouse.click(*P(-2,2)); pg.wait_for_timeout(120)
    pg.keyboard.press('c'); pg.wait_for_timeout(120); ok(ev("DRAW.tl.k")=='circle','touche C : outil Cercle'); pg.mouse.click(*P(2,2)); pg.mouse.click(*P(3,2)); pg.wait_for_timeout(120)
    pg.keyboard.press('l'); pg.wait_for_timeout(100); ok(ev("DRAW.tl.k")=='poly','touche L : outil Tracé')
    # aimants : sommet, milieu, centre, perpendiculaire
    q=ev("DRAW.snap(-3.97,1.03)"); lab=ev("DRAW.D.snapLab"); ok(q[:2]==[-4,1] and lab=='sommet','aimant sur un sommet',[q,lab])
    q=ev("DRAW.snap(-3.03,1.04)"); lab=ev("DRAW.D.snapLab"); ok(q[:2]==[-3,1] and lab=='milieu','aimant sur le milieu d\'un côté',[q,lab])
    q=ev("DRAW.snap(2.03,1.97)"); lab=ev("DRAW.D.snapLab"); ok(q[:2]==[2,2] and lab=='centre','aimant sur le centre du cercle',[q,lab])
    q=ev("DRAW.snap(-3.62,2.03,null,[-3.6,3.5])"); lab=ev("DRAW.D.snapLab"); ok(q[:2]==[-3.6,2] and lab=='perpendiculaire','aimant perpendiculaire à un côté',[q,lab])
    q=ev("DRAW.snap(-3.33,1.02)"); lab=ev("DRAW.D.snapLab"); ok(q[1]==1 and lab=='sur le trait','aimant sur le trait',[q,lab])
    q=ev("DRAW.snap(0.02,-0.03)"); ok(q[:2]==[0,-0.05] or q[:2]==[0,0] or q[:2]==[0,-.05],'hors aimant : grille',q)
    # tracé accroché au milieu puis perpendiculaire, à la souris
    pg.mouse.click(*P(-3.02,1.03)); pg.mouse.move(*P(-3,0)); pg.mouse.click(*P(-3,0)); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
    s=SH(); ok(s[-1]['p']==[[-3,1],[-3,0]],'tracé parti du milieu du côté',s[-1]['p'])
    # arc par 3 points
    pg.keyboard.press('a'); pg.wait_for_timeout(100); ok(ev("DRAW.tl.k")=='arc','touche A : outil Arc')
    pg.mouse.click(*P(0,-2)); pg.mouse.click(*P(2,-2)); pg.mouse.move(*P(1,-3)); pg.wait_for_timeout(60); pg.mouse.click(*P(1,-3)); pg.wait_for_timeout(150)
    s=SH(); a=s[-1]; import math
    rr=[round(math.hypot(q[0]-1,q[1]+2),2) for q in a['p']]; ok(a['arc'] and not a['cl'] and a['p'][0]==[0,-2] and a['p'][-1]==[2,-2] and set(rr)=={1.0} and min(q[1] for q in a['p'])==-3,'arc par 3 points : demi-cercle de rayon 1 m passant par le 3e point',[len(a['p']),rr[:4]])
    pg.keyboard.press('Escape'); pg.wait_for_timeout(120); ok(ev("!DRAW.tl"),'Échap quitte l\'outil')
    # sélection multiple : Maj + clic, déplacement d'ensemble, flèches
    pg.mouse.click(*P(-3,1.5)); pg.wait_for_timeout(100); pg.keyboard.down('Shift'); pg.mouse.click(*P(2,2.4)); pg.keyboard.up('Shift'); pg.wait_for_timeout(150)
    ok(ev("DRAW.sels.length")==2 and '2 formes' in ev("document.querySelector('#drawBar').innerText"),'Maj + clic : deux formes choisies, barre de groupe',ev("document.querySelector('#drawBar b').innerText"))
    pg.mouse.move(*P(-3,1.5)); pg.mouse.down(); pg.mouse.move(*P(-2.8,1.6),steps=3); pg.mouse.move(*P(-2,2.5),steps=5); pg.mouse.up(); pg.wait_for_timeout(150)
    s=SH(); ok(s[0]['p'][0]==[-3,2] and s[1]['c']==[3,3],'glisser : les deux formes bougent ensemble de 1 m',[s[0]['p'][0],s[1]['c']])
    pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(100); s=SH(); st=ev("DRAW.O.step"); ok(abs(s[0]['p'][0][0]-(-3-st))<1e-6 and abs(s[1]['c'][0]-(3-st))<1e-6,'flèche : toute la sélection poussée d\'un pas',[s[0]['p'][0],s[1]['c'],st]); pg.keyboard.press('ArrowRight')
    # grouper
    pg.click('#drawBar [data-da=grp]'); pg.wait_for_timeout(120); s=SH(); ok(s[0]['g'] and s[0]['g']==s[1]['g'],'Grouper : même groupe')
    pg.mouse.click(*P(6,-4)); pg.wait_for_timeout(100); ok(ev("DRAW.sels.length")==0,'clic dans le vide : rien de choisi'); pg.mouse.click(*P(-2,2.5)); pg.wait_for_timeout(120); ok(ev("DRAW.sels.length")==2 and '(groupe)' in ev("document.querySelector('#drawBar b').innerText"),'un clic sur une forme choisit tout le groupe')
    # miroir, échelle, rotation du groupe (boîte du groupe : x -3..4, centre .5)
    pg.click('#drawBar [data-da=mx]'); pg.wait_for_timeout(120); s=SH(); ok(s[1]['c']==[-2,3] and sorted(q[0] for q in s[0]['p'])==[2,2,4,4],'miroir ↔ autour du centre de la sélection',[s[0]['p'],s[1]['c']])
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(400); s=SH(); ok(s[1]['c']==[3,3],'Ctrl+Z : miroir annulé',s[1]['c'])
    pg.mouse.click(*P(-2,2.5)); pg.wait_for_timeout(120); pg.fill('#drawBar [data-ds=scl]','2'); pg.keyboard.press('Tab'); pg.wait_for_timeout(150); s=SH(); ok(s[1]['r']==2 and s[0]['p'][1][0]-s[0]['p'][0][0]==4,'échelle × 2 : rayon et côtés doublés',[s[0]['p'],s[1]['r']])
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(400)
    pg.mouse.click(*P(-2,2.5)); pg.wait_for_timeout(120); pg.click('#drawBar [data-da=ungrp]'); pg.wait_for_timeout(120); s=SH(); ok(not s[0]['g'] and not s[1]['g'],'Dégrouper')
    # décalage d'un rectangle et d'un cercle
    pg.mouse.click(*P(6,-4)); pg.mouse.click(*P(-2,2.5)); pg.wait_for_timeout(120); n0=len(SH()); pg.fill('#drawBar [data-ds=off]','0,5'); pg.keyboard.press('Tab'); pg.wait_for_timeout(150); s=SH()
    ok(len(s)==n0+1 and sorted(map(tuple,s[-1]['p']))==[(-3.5,1.5),(-3.5,3.5),(-0.5,1.5),(-0.5,3.5)],'décaler de 0,5 m : contour extérieur 3 × 2 m en plus',s[-1]['p'])
    pg.fill('#drawBar [data-ds=off]','-0,25'); pg.keyboard.press('Tab'); pg.wait_for_timeout(150); s=SH(); xs=sorted(q[0] for q in s[-1]['p']); ok(len(s)==n0+2 and xs==[-3.25,-3.25,-0.75,-0.75],'décalage négatif : vers l\'intérieur',s[-1]['p'])
    ev("DRAW.select(STAGE.S.shapes[1].id)"); pg.wait_for_timeout(100); pg.fill('#drawBar [data-ds=off]','0,5'); pg.keyboard.press('Tab'); pg.wait_for_timeout(150); s=SH(); ok(s[-1]['k']=='circle' and s[-1]['r']==1.5 and s[-1]['c']==[3,3],'décaler un cercle : cercle concentrique',[s[-1]['c'],s[-1]['r']])
    # rotation d'une forme seule
    ev("DRAW.select(STAGE.S.shapes[0].id)"); pg.wait_for_timeout(100); pg.fill('#drawBar [data-ds=rot]','90'); pg.keyboard.press('Tab'); pg.wait_for_timeout(150); s=SH(); xs=sorted(q[0] for q in s[0]['p']); ok(xs==[-2.5,-2.5,-1.5,-1.5],'tourner de 90° autour du centre',s[0]['p'])
    # Ctrl+A, Ctrl+D sur plusieurs, Suppr
    pg.evaluate("document.activeElement.blur()"); pg.keyboard.press('Control+a'); pg.wait_for_timeout(150); n=len(SH()); ok(ev("DRAW.sels.length")==n,'Ctrl+A : tout le dessin choisi',n)
    pg.keyboard.press('Control+d'); pg.wait_for_timeout(200); ok(len(SH())==2*n and ev("DRAW.sels.length")==n,'Ctrl+D : toute la sélection dupliquée, les copies choisies'); pg.keyboard.press('Delete'); pg.wait_for_timeout(200); ok(len(SH())==n and ev("DRAW.sels.length")==0,'Suppr : les copies effacées')
    # 3D : cloison courbe, enregistrement
    ev("(()=>{const a=STAGE.S.shapes.find(s=>s.arc);DRAW.select(a.id)})()"); pg.wait_for_timeout(100); pg.fill('#drawBar [data-ds=h]','2'); pg.keyboard.press('Tab'); pg.wait_for_timeout(200)
    js=ev("STAGE.serialize()"); ev("j=>STAGE.loadShow(JSON.parse(j))",js); pg.wait_for_timeout(600); s=SH(); ok(len(s)==n and any(x['arc'] and x['h']==2 for x in s),'arc avec hauteur enregistré et rechargé')
    ev("DRAW.select(null);PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'/t80-plan.png')
    ev("document.querySelector('#planBtn').click();(()=>{APP.camera.position.set(1,7,10);APP.orbit.target.set(0,.6,0);APP.orbit.update()})()"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/t80-3d.png')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
