# Pont posé pièce par pièce (façon Braceworks), pièces modifiables une à une, charges dans la vue 3D.
import os, sys
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && !!PONTS.placePiece",timeout=60000); pg.wait_for_timeout(1500)
    ev("PONTS.O.hang='auto';PONTS.O.series='prolyte-h30v';PONTS.O.pieceRot=0;PLAN.fit();PLAN.draw()")
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    T=lambda: ev("STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>({n:s.name,a:s.a,b:s.b,L:PONTS.len(s),pc:s.pieces,k:s.kgPerM,pts:s.points.map(p=>p.alongMm)}))")
    ev("document.querySelector('[data-dom=rig]').click()"); pg.click('#rail [data-t=truss]'); pg.click('#pontBar [data-pa=pcMode]'); pg.wait_for_timeout(200)
    ok(ev("PONTS.tl.k")=='piece' and ev("document.querySelectorAll('#pontBar [data-pa=pcPick]').length")==11,'mode pièce par pièce : les 11 longueurs H30V proposées',ev("[...document.querySelectorAll('#pontBar [data-pa=pcPick]')].map(b=>b.textContent).join(' ')"))
    pg.click('#pontBar [data-pa=pcPick][data-id="3000"]'); pg.mouse.move(*P(-4,-3)); pg.mouse.click(*P(-4,-3)); pg.wait_for_timeout(250)
    t=T(); ok(len(t)==1 and t[0]['L']==3000 and t[0]['pc']==[3000] and t[0]['a']=={'x':-4000,'y':3000},'première pièce de 3 m posée au clic',t)
    # deuxième et troisième pièce : clic n'importe où devant → prolongent
    pg.mouse.move(*P(1,-3.2)); pg.wait_for_timeout(100); info=ev("PONTS.tl.info"); pg.mouse.click(*P(1,-3.2)); pg.wait_for_timeout(250)
    pg.click('#pontBar [data-pa=pcPick][data-id="2000"]'); pg.mouse.move(*P(5,-3)); pg.mouse.click(*P(5,-3)); pg.wait_for_timeout(250)
    t=T(); ok(len(t)==1 and t[0]['pc']==[3000,3000,2000] and t[0]['L']==8000 and t[0]['b']=={'x':4000,'y':3000} and abs(t[0]['k']-(18.9*2+12.9)/8)<.01,'3 + 3 + 2 m : un seul pont de 8 m, pièces dans l\'ordre, poids réel',[t,info])
    ok('prolonge' in (info or ''),'l\'aperçu annonce « prolonge Pont 1 »',info)
    ok(len(t[0]['pts'])==2 and t[0]['pts']==[2000,6000],'moteurs répartis de nouveau sur la longueur',t[0]['pts'])
    # souris sur le côté : part en coin à 90°
    pg.click('#pontBar [data-pa=pcPick][data-id="1000"]'); pg.mouse.move(*P(4.1,-1)); pg.wait_for_timeout(100); info=ev("PONTS.tl.info"); pg.mouse.click(*P(4.1,-1)); pg.wait_for_timeout(250)
    t=T(); ok(len(t)==2 and t[1]['L']==1500 and t[1]['pc']==[1000] and t[1]['a']['x']==4500 and t[1]['b']['x']==4500 and t[0]['b']['x']==4500 and t[0]['pc']==[3000,3000,2000] and 'coin 90' in info and 'C003' in info,'pièce posée sur le côté : nouveau pont en coin 90° (H30V-C003)',[t[1],info])
    pg.mouse.move(*P(4,2)); pg.mouse.click(*P(4,2)); pg.wait_for_timeout(250); t=T(); ok(t[1]['L']==2500 and t[1]['pc']==[1000,1000],'la branche se prolonge à son tour',t[1])
    ok(ev("PONTS.C.trussBom(PONTS.doc()).lines.map(l=>l.qty+'x'+l.code).join(' ')")=='1xH30V-C003 2xH30V-L100 1xH30V-L200 2xH30V-L300','nomenclature : 2 × 3 m, 1 × 2 m, 2 × 1 m, 1 coin',ev("PONTS.C.trussBom(PONTS.doc()).lines.map(l=>l.qty+'x'+l.code).join(' ')"))
    # retirer la dernière (Retour arrière), deux fois
    pg.keyboard.press('Backspace'); pg.wait_for_timeout(350); t=T(); ok(t[1]['L']==1500,'Retour arrière : dernière pièce retirée',t[1])
    pg.keyboard.press('Backspace'); pg.wait_for_timeout(350); t=T(); ok(len(t)==1 and ev("PONTS.tl.from && PONTS.tl.from.at.x")==4000,'encore : la branche disparaît, on repart du bout du pont de 8 m',t)
    # nouveau départ ailleurs, pièce tournée de 90°
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(ev("PONTS.tl && PONTS.tl.k")=='piece' and ev("PONTS.tl.from")==None,'Échap : lâche le bout, l\'outil reste')
    pg.mouse.move(*P(-6,0)); pg.keyboard.press('r'); pg.mouse.move(*P(-6,1)); pg.mouse.click(*P(-6,1)); pg.wait_for_timeout(250)
    t=T(); ok(len(t)==2 and t[1]['a']['x']==t[1]['b']['x']==-6000 and t[1]['L']==1000,'touche R : pièce libre posée tournée de 90°',t[1])
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(150); ok(ev("!PONTS.tl"),'Échap deux fois : outil terminé')
    # raccord au début d'un pont existant : la pièce s'ajoute en tête
    ev("PONTS.tool('piece')"); pg.click('#pontBar [data-pa=pcPick][data-id="500"]'); pg.mouse.move(*P(-4.3,-3)); pg.wait_for_timeout(100); pg.mouse.click(*P(-4.3,-3)); pg.wait_for_timeout(250)
    t=T(); ok(t[0]['pc']==[500,3000,3000,2000] and t[0]['a']=={'x':-4500,'y':3000} and t[0]['L']==8500,'pièce de 0,5 m ajoutée au début du pont',t[0])
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
    # inspecteur : remplacer une pièce, en retirer une, en ajouter une
    sid=ev("STAGE.S.sups.filter(s=>s.kind==='truss')[0].id"); ev("(id)=>PONTS.select(id)",sid); pg.wait_for_timeout(200)
    ok(ev("document.querySelectorAll('#console [data-pcs]').length")==4,'Inspecteur : les 4 pièces, une par une')
    pg.select_option('#console [data-pcs="3"]','4000'); pg.wait_for_timeout(300); t=T(); ok(t[0]['pc']==[500,3000,3000,4000] and t[0]['L']==10500 and t[0]['a']=={'x':-4500,'y':3000},'dernière pièce remplacée par 4 m : 10,5 m, le début ne bouge pas',t[0])
    pg.click('#console [data-pa=pcDel][data-id="0"]'); pg.wait_for_timeout(300); pg.click('#console [data-pa=pcAdd]'); pg.wait_for_timeout(300); t=T(); ok(t[0]['pc']==[3000,3000,4000,4000] and t[0]['L']==14000,'pièce retirée puis ajoutée au bout',t[0])
    # charges en 3D
    ev("STAGE.UI.serie=1;for(const x of [-2,2,5])STAGE.place('par-led',STAGE.hitAt(x,-3),true);STAGE.touch();STAGE.setLive(false)"); pg.wait_for_timeout(700)
    n=ev("(()=>{let sp=0,im=0,ln=0;APP.scene.traverse(o=>{if(o.isSprite)sp++;});const g=APP.scene.children.find(c=>c.children&&c.children.some(q=>q.isSprite));if(g)g.traverse(o=>{if(o.isInstancedMesh)im+=o.count;if(o.isLine)ln++});return [sp,im,ln]})()")
    ok(ev("(()=>{let sp=0;APP.scene.traverse(o=>{if(o.isSprite&&Math.abs(o.scale.x-1.5)<1e-6)sp++});return sp})()")==4 and n[1]==6 and n[2]==1,'vue 3D : une étiquette par point, 3 flèches de charge, courbe du moment',n)
    ev("DRAWER.open('rig');PONTS.select(null);APP.persp.position.set(-8,5,8);APP.orbit.target.set(2,4,-3);APP.orbit.update();PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(2500); pg.screenshot(path=OUT+'/t72.png')
    pg.uncheck('#drBody [data-pa=show3d]'); pg.wait_for_timeout(300); ok(ev("(()=>{let sp=0;APP.scene.traverse(o=>{if(o.isSprite&&Math.abs(o.scale.x-1.5)<1e-6)sp++});return sp})()")==0,'case décochée : plus de charges dans la vue 3D')
    ok(not errs,'aucune erreur de script',errs[:4]); b.close()
print('ÉCHECS :',bad if bad else 'aucun')
