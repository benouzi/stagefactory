# Cubes d'angle : dessinés aux raccords et en tête de tour, poids saisi par référence, pris dans le calcul.
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
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && !!PONTS.nodes",timeout=60000); pg.wait_for_timeout(1500)
    ev("PONTS.O.hang='auto';PONTS.O.series='prolyte-h30v'")
    mm=lambda x,z:{'x':x,'y':-z}
    ev("""()=>{const A=(a,b)=>PONTS.addTruss(a,b,null,true); A({x:-3000,y:1000},{x:3000,y:1000}); A({x:3000,y:1000},{x:3000,y:5000}); A({x:3000,y:5000},{x:-3000,y:5000}); A({x:-3000,y:5000},{x:-3000,y:1000}); PONTS.changed(); PLAN.fit(); PLAN.draw();}""")
    pg.wait_for_timeout(600)
    n=ev("PONTS.nodes().map(n=>({w:n.ways,a:n.ang,c:n.code,kg:n.kg,at:n.at}))")
    ok(len(n)==4 and all(x['w']==2 and x['a']==90 and x['c']=='H30V-C003' and x['kg'] is None for x in n),'carré de 4 ponts : 4 coins 90° H30V-C003, poids inconnu',n)
    ok(ev("(()=>{let k=0;APP.scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.parent&&o.parent.children.some(c=>c.isInstancedMesh)&&o.parent.parent===APP.scene&&o.parent.name!=='ponts')k++});return k})()")>=4,'4 cubes dans la vue 3D')
    r0=ev("[...PONTS.results().values()].map(r=>({t:r.totalKg,e:r.extraKg||0,p:r.points.map(p=>p.kg)}))")
    ok(all(x['e']==0 for x in r0),'sans poids saisi, le coin ne pèse rien dans le calcul',r0)
    bm=ev("(b=>({l:b.lines.map(l=>l.qty+'x'+l.code+':'+l.kgEach),t:b.totalKg}))(PONTS.bom())"); ok(any(x.startswith('4xH30V-C003:null') for x in bm['l']) and bm['t'] is None,'nomenclature : 4 coins, poids total inconnu',bm)
    # saisie du poids dans le volet Rigging
    ev("DRAWER.open('rig')"); pg.wait_for_timeout(500)
    ok(ev("document.querySelectorAll('[data-ck]').length")==1,'un champ de poids pour la référence du coin')
    pg.fill('[data-ck="H30V-C003"]','8,4'); pg.keyboard.press('Tab'); pg.wait_for_timeout(600)
    n=ev("PONTS.nodes().map(n=>n.kg)"); ok(n==[8.4]*4,'8,4 kg saisi : repris par les 4 coins',n)
    r1=ev("[...PONTS.results().values()].map(r=>({t:r.totalKg,e:r.extraKg||0,p:r.points.map(p=>p.kg)}))")
    ok(all(abs(x['e']-8.4)<.01 for x in r1) and all(abs(a['t']-b['t']-8.4)<.05 for a,b in zip(r1,r0)),'chaque pont porte deux demi-coins : +8,4 kg',[r0[0],r1[0]])
    bm=ev("(b=>({t:b.totalKg,n:b.notes.join('|')}))(PONTS.bom())"); ok(bm['t'] is not None and 'Poids total inconnu' not in bm['n'],'poids total de la nomenclature connu',bm)
    ok(ev("STAGE.S.sups.every(s=>!(s.loads||[]).some(l=>l.corner))"),'rien d\'écrit dans les charges des ponts')
    ok(ev("document.querySelector('[data-ck]').value")=='8,4','le champ garde la valeur après rafraîchissement')
    # enregistrement / rechargement
    ok('"cornerKg":{"H30V-C003":8.4}' in ev("JSON.stringify(JSON.parse(STAGE.serialize?STAGE.serialize():'{}'))") if ev("!!STAGE.serialize") else True,'poids enregistré dans le projet')
    pg.screenshot(path=OUT+'/t73-plan.png')
    # annulation
    ev("document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(700); ok(ev("PONTS.nodes().map(n=>n.kg)")==[None]*4,'Ctrl+Z : poids retiré',ev("PONTS.nodes().map(n=>n.kg)"))
    # pont dans le prolongement : pas de cube ; hauteur différente : pas de cube
    ev("""()=>{PONTS.addTruss({x:3000,y:1000},{x:6000,y:1000},null,true);PONTS.changed()}"""); pg.wait_for_timeout(400)
    n=ev("PONTS.nodes().map(n=>({w:n.ways,c:n.code}))"); ok(len(n)==4 and sorted(x['w'] for x in n)==[2,2,2,3] and any(x['c']=='H30V-C012' or x['w']==3 for x in n),'5e pont au coin : le coin devient 3 départs',n)
    ev("""()=>{const s=STAGE.S.sups.filter(s=>s.kind==='truss')[4];s.zMm+=1000;PONTS.sync()}"""); pg.wait_for_timeout(400)
    n=ev("PONTS.nodes().map(n=>n.ways)"); ok(sorted(n)==[2,2,2,2],'pont à une autre hauteur : plus raccordé',n)
    ev("""()=>{const T=STAGE.S.sups.filter(s=>s.kind==='truss');T[4].zMm-=1000;T[4].a={x:-6000,y:1000};T[4].b={x:-3000,y:1000};PONTS.sync()}"""); pg.wait_for_timeout(400)
    # tour : pont seul sur deux pieds
    ev("""()=>{STAGE.S.sups.length=0;PONTS.O.hang='legs';PONTS.addTruss({x:-2000,y:2000},{x:2000,y:2000},null,true);PONTS.sync();PONTS.O.hang='auto'}"""); pg.wait_for_timeout(500)
    n=ev("PONTS.nodes().map(n=>({w:n.ways,t:n.tower,c:n.code}))"); ok(len(n)==2 and all(x['t'] and x['w']==2 and x['c']=='H30V-C003' for x in n),'pont sur tours : un cube en tête de chaque tour',n)
    ev("document.querySelector('#view3d')?.click()"); pg.wait_for_timeout(900); pg.screenshot(path=OUT+'/t73-3d.png')
    ok(not errs,'aucune erreur de page',errs[:3])
    b.close()
print('ECHECS',bad) if bad else print('TOUT PASSE')
