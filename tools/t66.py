# Ponts (bibliothèque, tracé, raccords, structures), points d'accroche, calcul de charges, tiroir du bas. Charge app/ sans passerelle.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:400],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && !!PLAN.world",timeout=60000)
    ev("document.querySelector('#modal').style.display='none'")
    ok(ev("!!document.querySelector('#drawer') && DRAWER.h()>100"),'tiroir du bas présent et ouvert',ev("[...document.querySelectorAll('#drawer .dr-tabs button')].map(b=>b.textContent).join('|')"))
    ok(ev("document.querySelector('#console h1').textContent")=='Inspecteur','le panneau latéral devient l\'Inspecteur',ev("[...document.querySelectorAll('#console .tabs button')].map(b=>b.textContent).join('|')"))
    # ---- tracé d'un pont de 8 m dans le plan : deux clics
    ev("document.querySelector('[data-dom=rig]').click()"); pg.click('#rail [data-t=truss]'); pg.wait_for_timeout(200)
    ok(ev("!!PONTS.tl && getComputedStyle(document.querySelector('#pontBar')).display==='flex'"),'outil Pont armé, barre de réglages affichée')
    def P(x,z):
        r=ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z]); return r
    a=P(-4,-3); pg.mouse.click(*a); c=P(4.1,-3.05); pg.mouse.move(*c); pg.wait_for_timeout(100); pg.mouse.click(*c); pg.wait_for_timeout(300)
    s=ev("STAGE.S.sups.map(s=>({n:s.name,a:s.a,b:s.b,z:s.zMm,k:s.kgPerM,se:s.series,sec:s.sectionMm,p:s.points.map(p=>[p.alongMm,p.kind])}))")
    ok(len(s)==1 and s[0]['a']=={'x':-4000,'y':3000} and s[0]['b']=={'x':4000,'y':3000},'pont de 8 m, longueur calée sur les éléments, direction redressée',s)
    ok(s[0]['se']=='prolyte-h30v' and s[0]['sec']==287 and abs(s[0]['k']-49.2/8)<.01,'série Prolyte H30V : section 287 mm, poids propre réel 2 × 4 m = 49,2 kg',s[0]['k'])
    ok(len(s[0]['p'])==2 and s[0]['p'][0][1]=='hoist','deux moteurs répartis',s[0]['p'])
    # ---- enchaîné : second pont à 90° depuis le bout, calé sur le coin du catalogue
    d=P(4.2,0.1); pg.mouse.move(*d); pg.wait_for_timeout(100); info=ev("PONTS.tl.info"); pg.mouse.click(*d); pg.wait_for_timeout(300)
    s=ev("STAGE.S.sups.map(s=>({a:s.a,b:s.b,z:s.zMm}))")
    ok(len(s)==2 and s[1]['a']['x']==4000 and s[1]['b']['x']==4000 and abs(s[1]['a']['y']-s[1]['b']['y'])==3000,'pont raccordé à 90°, 3 m',[s[1],info])
    ok('C003' in (info or ''),'le coin 90° du catalogue est annoncé',info)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200); ok(ev("!PONTS.tl"),'Échap termine le tracé')
    ok(ev("PONTS.C.trussBom(PONTS.doc()).lines.some(l=>l.code==='H30V-C003')"),'nomenclature : le coin H30V-C003 est compté',ev("PONTS.C.trussBom(PONTS.doc()).lines.map(l=>l.qty+'x'+l.code).join(' ')"))
    # ---- accrocher des projecteurs sous le pont, en série depuis le plan
    ev("STAGE.UI.serie=4;STAGE.UI.placing='par-led';STAGE.render()")
    a=P(-3,-3); c=P(3,-3); pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move((a[0]+c[0])/2,a[1],steps=4); pg.mouse.move(*c,steps=4); pg.mouse.up(); pg.wait_for_timeout(400)
    o=ev("STAGE.S.objs.map(o=>({h:o.hang,sid:o.sid,x:o.pos[0],y:o.pos[1],z:o.pos[2]}))")
    ok(len(o)==4 and all(q['h']=='pont' and abs(q['y']-4.97)<.001 and q['z']==-3 for q in o),'4 projecteurs accrochés sous le pont à 5 m',o)
    sid=ev("STAGE.S.sups[0].id"); r=ev("(id)=>{const r=PONTS.resOf(id);return {t:r.totalKg,c:r.count,e:r.error,v:r.verdict,p:r.points.map(p=>[+p.kg.toFixed(1),+p.worstKg.toFixed(1),+p.designKg.toFixed(1)])}}",sid)
    w=ev("STAGE.weightOf(STAGE.S.objs[0])"); tot=4*(w+1)+49.2+8
    ok(r['c']==4 and abs(r['t']-tot)<.01 and r['e'] is None,'charge totale = appareils + accessoires + poids propre + câblage',[r,tot])
    ok(abs(r['p'][0][0]+r['p'][1][0]-tot)<.05 and abs(r['p'][0][2]-r['p'][0][0]*1.2)<.05,'les deux réactions font la charge ; à retenir = × 1,2 sur moteur',r['p'])
    ok(r['v']=='unknown','verdict « incomplet » tant que les capacités ne sont pas saisies',r['v'])
    # ---- le pont monte : les appareils suivent
    ev("(id)=>{PONTS.select(id)}",sid); pg.wait_for_timeout(200)
    ok(ev("!!document.querySelector('#console [data-pk=zM]')"),'Inspecteur : réglages du pont')
    pg.fill('#console [data-pk=zM]','6.5'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300)
    ok(ev("STAGE.S.objs.every(o=>Math.abs(o.pos[1]-6.47)<.001) && STAGE.S.sups[0].zMm===6500"),'hauteur 6,5 m : les projecteurs suivent')
    # ---- capacité saisie : dépassement signalé
    pg.fill('#console [data-pg=points][data-pi="0"][data-pk=capacityKg]','20'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300)
    r=ev("(id)=>{const r=PONTS.resOf(id);return {v:r.verdict,o:r.points[0].over}}",sid); ok(r['v']=='bad' and r['o'],'capacité de 20 kg : point au-delà de sa capacité, verdict « à corriger »',r)
    # ---- troisième point : cas défavorable
    pg.click('#console [data-pa=ptAdd]'); pg.wait_for_timeout(300)
    r=ev("(id)=>{const r=PONTS.resOf(id);return r.points.map(p=>[p.alongMm,+p.kg.toFixed(1),+p.worstKg.toFixed(1)])}",sid); ok(len(r)==3 and all(q[2]>=q[1]-.01 for q in r) and r[1][2]>r[1][1],'trois points : le cas défavorable dépasse le cas idéal',r)
    # ---- tiroir : Rigging et charges, Sécurité, Patch, Avertissements
    ev("DRAWER.open('rig')"); pg.wait_for_timeout(300); t=ev("document.querySelector('#drBody').innerText")
    t=t.lower(); ok('défavorable' in t and 'nomenclature' in t and 'h30v-l400' in t and 'svg' in ev("document.querySelector('#drBody').innerHTML"),'volet Rigging et charges : tableau des points, diagramme, nomenclature')
    ev("DRAWER.open('secu')"); pg.wait_for_timeout(200); t=ev("document.querySelector('#drBody').innerText"); t=t.lower(); ok('à corriger' in t and 'contrôles sur site (0/12)' in t and 'kw' in t,'volet Sécurité : synthèse, électricité, contrôles sur site',t[:200])
    pg.check('#drBody [data-sf=check][data-id=poids]'); pg.wait_for_timeout(300); ok(ev("STAGE.S.safety.checklist.poids===true") and '(1/12)' in ev("document.querySelector('#drBody').innerText"),'contrôle coché et retenu')
    ev("DRAWER.open('patch')"); pg.wait_for_timeout(200); ok(ev("document.querySelectorAll('#drBody [data-dp=addr]').length")==4,'volet Patch : 4 projecteurs')
    ev("DRAWER.open('warn')"); pg.wait_for_timeout(200); ok('capacité' in ev("document.querySelector('#drBody').innerText"),'volet Avertissements : le dépassement y figure',ev("document.querySelector('#drBody').innerText")[:200])
    ev("DRAWER.open('lib')"); pg.wait_for_timeout(200); ok(ev("document.querySelectorAll('#drBody .lib button').length")>5,'volet Bibliothèque dans le tiroir')
    # ---- structure toute faite : gril sur quatre tours
    ev("PONTS.structOpen()"); pg.wait_for_timeout(200); pg.click('#modal [data-pa=stype][data-id=gril]'); pg.wait_for_timeout(150); pg.fill('#modal [data-sp=lengthMm]','10'); pg.keyboard.press('Tab'); pg.wait_for_timeout(150); pg.click('#modal [data-pa=sok]'); pg.wait_for_timeout(400)
    g=ev("STAGE.S.sups.filter(s=>s.name.startsWith('Gril')).map(s=>({n:s.name,L:Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y),legs:s.points.filter(p=>p.leg).length,k:s.kgPerM}))")
    ok(len(g)==4 and sorted(q['L'] for q in g)==[6000,6000,10000,10000] and all(q['legs']==2 and q['k']>0 for q in g),'gril : 4 ponts sur tours, poids propre du catalogue',g)
    # ---- annuler, enregistrer, recharger
    n=ev("STAGE.S.sups.length"); ev("STAGE.undo()"); pg.wait_for_timeout(300); ok(ev("STAGE.S.sups.length")==n-4,'annuler retire le gril')
    ev("STAGE.redo()"); d=ev("STAGE.serialize()"); ev("STAGE.loadShow(STAGE.blankShow())"); ok(ev("STAGE.S.sups.length")==0,'projet vierge : aucun pont')
    ev("(d)=>STAGE.loadShow(JSON.parse(d))",d); pg.wait_for_timeout(300); ok(ev("STAGE.S.sups.length")==n and ev("STAGE.S.objs.filter(o=>o.hang==='pont').length")==4 and ev("STAGE.S.safety.checklist.poids"),'rechargé : ponts, accroches et contrôles retrouvés')
    # ---- suppression : les appareils passent en accroche fixe
    ev("(id)=>PONTS.remove(id)",sid); pg.wait_for_timeout(200); ok(ev("STAGE.S.objs.every(o=>o.hang==='fixe' && !o.sid)"),'pont supprimé : appareils en accroche fixe')
    ev("STAGE.undo()"); pg.wait_for_timeout(300); ev("DRAWER.open('rig');PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t66.png')
    ok(not errs,'aucune erreur de script',errs[:4])
    b.close()
print('ÉCHECS :',bad if bad else 'aucun')
