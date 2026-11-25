# élingues : couleurs de la norme, mode d'élingage dans la vérification, manilles et ceinture, liste d'accroche
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:600],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click()"); pg.wait_for_timeout(400)
    ev("""(()=>{PONTS.O.series='prolyte-h30v';PONTS.O.hang='auto';PONTS.O.zMm=3000;PONTS.addTruss({x:-6000,y:0},{x:6000,y:0},null,true);const a=STAGE.S.sups[0];a.points.forEach(p=>{p.originHMm=7000;p.capacityKg=1000});PONTS.sync();PONTS.select(a.id);STAGE.UI.ptOpen=a.points[0].id;STAGE.render();APP.camera.position.set(-3,5,4);APP.orbit.target.set(-4,3.6,0);APP.orbit.update()})()"""); pg.wait_for_timeout(1000)
    COL="(hex)=>{let n=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isInstancedMesh&&o.material.color&&o.material.color.getHex()===hex)n+=o.count});return n}"
    R="(()=>{const s=STAGE.S.sups[0],p=s.points[0],h=PONTS.hoists().find(x=>x.p.id===p.id);return {items:h.rg.items.map(o=>[o.k,o.type||'',o.cap,o.M||null,o.eff,o.use==null?null:+o.use.toFixed(4),o.col?o.col.name:'',o.len||null,o.n||null]),kg:h.kg,worst:h.rg.worst}})()"
    r=ev(R); ok(r['items'][0][0]=='belt' and r['items'][0][4] is None and len(r['items'])==1,'au départ : une ceinture sans type ni CMU, rien n\'est supposé ni vérifié',r)
    pg.select_option('.pt-det [data-pk=beltType]','ronde'); pg.wait_for_timeout(500); pg.fill('.pt-det [data-pk=beltCapKg]','2000'); pg.keyboard.press('Tab'); pg.wait_for_timeout(500); pg.select_option('.pt-det [data-pk=beltMode]','basket45'); pg.wait_for_timeout(800)
    r=ev(R); b0=r['items'][0]; ok(b0[1]=='ronde' and b0[2]==2000 and b0[3]==1.4 and b0[4]==2800 and b0[6]=='vert' and (r['kg'] is None or abs(b0[5]-r['kg']/2800)<1e-3),'ceinture ronde de 2 t en panier jusqu\'à 45° : couleur verte, CMU utile 2 800 kg (× 1,4), taux calculé sur la charge du point',r)
    ok(ev(COL,0x2e9e4f)==5,'vue 3D : la ceinture est dessinée en vert',ev(COL,0x2e9e4f)); t=ev("document.querySelector('.pt-det').innerText").replace('\n',' '); ok('Ceinture du pont : ronde textile vert' in t and '× 1,4' in t,'la fiche le résume : type, couleur, CMU × coefficient, taux',t[:330])
    pg.screenshot(path=OUT+'/t102.png',clip={'x':60,'y':45,'width':540,'height':560})
    pg.fill('.pt-det [data-pk=beltCapKg]','1000'); pg.keyboard.press('Tab'); pg.wait_for_timeout(700); ok(ev(COL,0x8e44ad)==5 and ev(COL,0x2e9e4f)==0 and ev(R)['items'][0][6]=='violet','CMU 1 t : elle passe au violet')
    pg.fill('.pt-det [data-pk=beltCapKg]','1500'); pg.keyboard.press('Tab'); pg.wait_for_timeout(700); ok(ev(R)['items'][0][6]=='hors code couleur' and ev(COL,0x8e44ad)==0,'CMU 1,5 t : hors du code couleur, aucune couleur n\'est inventée',ev(R)['items'][0])
    pg.select_option('.pt-det [data-pk=beltMode]','choke'); pg.wait_for_timeout(600); ok(ev(R)['items'][0][4]==1200,'étranglé : CMU utile 1 500 × 0,8 = 1 200 kg',ev(R)['items'][0])
    # chaîne trop courte : élingue au-dessus, noire, avec manille
    pg.fill('.pt-det [data-pk=chainM]','2'); pg.keyboard.press('Tab'); pg.wait_for_timeout(600); pg.select_option('.pt-det [data-pk=slingType]','noire'); pg.wait_for_timeout(500); pg.fill('.pt-det [data-pk=slingCapKg]','2000'); pg.keyboard.press('Tab'); pg.wait_for_timeout(500); pg.fill('.pt-det [data-pk=shackleCapKg]','3250'); pg.keyboard.press('Tab'); pg.wait_for_timeout(500); pg.fill('.pt-det [data-pk=shackleN]','2'); pg.keyboard.press('Tab'); pg.wait_for_timeout(800)
    r=ev(R); it={q[0]:q for q in r['items']}; ok('sling' in it and it['sling'][1]=='noire' and it['sling'][7]==7000-3287-2000 and it['sling'][4]==2000 and it['sh'][8]==2 and it['sh'][2]==3250 and ev(COL,0x15161a)==1,'chaîne de 2 m trop courte : élingue gainée noire de 1,71 m au-dessus du moteur (dessinée en noir), deux manilles de 3,25 t',r)
    # point fixe
    ev("(()=>{const s=STAGE.S.sups[0];s.points[2].kind='fixed';s.points[2].slingType='ronde';s.points[2].slingCapKg=3000;PONTS.sync();STAGE.render()})()"); pg.wait_for_timeout(800)
    fx=ev("PONTS.hoists().find(h=>h.p.kind==='fixed').rg.items.map(o=>[o.k,o.type||'',o.cap,o.len||null,o.col?o.col.name:''])"); ok(fx[1][0]=='sling' and fx[1][3]==7000-3287 and fx[1][4]=='jaune' and ev(COL,0xe3c21c)>=1,'point fixe : son élingue fait la hauteur crochet à crochet, jaune pour 3 t',fx)
    # rapport et liste d'accroche
    ev("PONTS.hoistReport()"); pg.wait_for_timeout(700); c=ev("[...document.querySelectorAll('#modal .hrt tr')].slice(1).map(t=>t.lastElementChild.innerText.trim())"); ok(len(c)==3 and 'incomplet' in c[1],'rapport : une colonne « Élingues » (couleurs, taux le plus élevé, « incomplet » si une donnée manque)',c)
    pg.click('#modal [data-pa=hoList]'); pg.wait_for_timeout(700); tx=ev("document.querySelector('#modal').innerText").replace('\n',' ').replace('\t',' ')
    rows=ev("[...document.querySelectorAll('#modal .hrt')].map(t=>[...t.querySelectorAll('tr')].slice(1).map(r=>[...r.children].map(c=>c.innerText.trim())))")
    ok(tx.startswith("Liste d'accroche") and len(rows)==3 and sum(int(r[-1]) for r in rows[0])==2 and any(r[0]=='élingue' and 'gainée noire' in r[1] and r[3]=='1,70 m' for r in rows[1]) and any(r[0]=='ceinture' and r[1]=='?' and r[-1]=='2' for r in rows[1]) and rows[2]==[['3250 kg','2']],'liste d\'accroche : moteurs par capacité, élingues par emploi / couleur / longueur (les non renseignées comptées à part), manilles',rows)
    pg.screenshot(path=OUT+'/t102-liste.png')
    ev("document.querySelector('#modal [data-a=close]').click()")
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
