# moteurs : crochets et chaîne, chaîne trop courte = élingue, rapport, sélection par critère, modification groupée, repères
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
    ev("document.querySelector('[data-dom=rig]').click()"); pg.wait_for_timeout(400)
    ev("""(()=>{PONTS.O.series='prolyte-h30v';PONTS.O.hang='auto';PONTS.O.zMm=3000;PONTS.addTruss({x:-3500,y:0},{x:3500,y:0},null,true);PONTS.addTruss({x:-6000,y:3000},{x:6000,y:3000},null,true);
      const [a,b]=STAGE.S.sups; a.points.forEach(p=>{p.originHMm=7000;p.chainMm=2000;p.capacityKg=500}); b.points.forEach(p=>{p.originHMm=7000;p.capacityKg=1000}); PONTS.sync(); PONTS.select(a.id); STAGE.UI.ptOpen=a.points[0].id; STAGE.render()})()"""); pg.wait_for_timeout(900)
    n=ev("STAGE.S.sups.map(s=>s.points.length)"); H="PONTS.hoists().map(h=>[h.p.tag||'',h.s.name,Math.round(h.x*100)/100,h.p.capacityKg,h.lo,h.h2h,h.ch,h.sling])"
    h=ev(H); ok(len(h)==sum(n) and all(q[4]==3287 or q[4]==3290 for q in h) and [q[7] for q in h if q[1]==h[0][1]]==[q[5]-2000 for q in h if q[1]==h[0][1]] and all(q[7] is None for q in h if q[1]!=h[0][1]),'crochet bas, crochet à crochet et élingue manquante sont calculés ; sans longueur de chaîne, rien n\'est affirmé',h)
    t=ev("(document.querySelector('.pt-det')||{}).innerText||''").replace('\n',' ')
    ok('Crochet bas' in t and 'crochet haut 7,00 m' in t and 'crochet à crochet 3,71 m' in t and 'Chaîne de 2,00 m trop courte : il manque 1,71 m' in t,'fiche du point : crochets, et l\'alerte « chaîne trop courte, il manque 1,71 m »',t[:260])
    pg.fill('.pt-det [data-pk=tag]','M1'); pg.keyboard.press('Tab'); pg.wait_for_timeout(500); pg.fill('.pt-det [data-pk=fn]','face'); pg.keyboard.press('Tab'); pg.wait_for_timeout(500); ok(ev("[STAGE.S.sups[0].points[0].tag,STAGE.S.sups[0].points[0].fn]")==['M1','face'],'repère et fonction saisis dans la fiche')
    sl=ev("(()=>{let n=0;APP.scene.getObjectByName('ponts').traverse(o=>{if(o.isInstancedMesh&&o.material.color&&o.material.color.getHex()===0xd9a514)n+=o.count});return n})()"); ok(sl==n[0],'vue 3D : une élingue est dessinée au-dessus de chaque moteur dont la chaîne est trop courte',sl)
    # rapport
    ev("PONTS.hoistReport()"); pg.wait_for_timeout(700); r=ev("(()=>{const m=document.querySelector('#modal');return {on:getComputedStyle(m).display,rows:m.querySelectorAll('.hrt tr').length-1,warn:m.querySelectorAll('.hrt tr.w').length,th:[...m.querySelectorAll('.hrt th')].map(x=>x.innerText).join('|'),chips:[...m.querySelectorAll('[data-pa=hoF]')].map(x=>x.innerText)}})()")
    ok(r['on']=='flex' and r['rows']==sum(n) and r['warn']==n[0] and 'Crochet à crochet' in r['th'] and 'Élingue' in r['th'] and '500 kg' in r['chips'] and '1000 kg' in r['chips'],'rapport des moteurs : une ligne par point, colonnes crochets / chaîne / élingue, critères proposés',r); pg.screenshot(path=OUT+'/t99.png')
    pg.click('#modal [data-pa=hoF][data-id="cap|500"]'); pg.wait_for_timeout(700); ok(ev("document.querySelectorAll('#modal .hrt tr').length-1")==n[0] and ev("PONTS.hoSel&&PONTS.hoSel.size")==n[0],'clic sur « 500 kg » : tous les points de cette capacité sont choisis (et mis en couleur dans les vues)')
    pg.fill('#modal [data-hr=chainM]','5'); pg.keyboard.press('Tab'); pg.wait_for_timeout(900); h=ev(H); ok(all(q[6]==5000 and q[7]==0 for q in h if q[3]==500) and all(q[6] is None for q in h if q[3]==1000),'modification groupée : chaîne de 5 m pour ces points seulement, plus d\'élingue à prévoir',h)
    pg.click('#modal [data-pa=hoF][data-id="all|"]'); pg.wait_for_timeout(600); pg.select_option('#modal [data-hr=sort]','x'); pg.wait_for_timeout(600); xs=ev("[...document.querySelectorAll('#modal .hrt tr')].slice(1).map(t=>parseFloat(t.children[4].innerText.replace(',','.')))"); ok(xs==sorted(xs) and len(xs)==sum(n),'tri de jardin à cour',xs)
    pg.click('#modal [data-pa=hoTag]'); pg.wait_for_timeout(900); tg=ev("[...document.querySelectorAll('#modal .hrt tr')].slice(1).map(t=>t.children[0].innerText)"); ok(tg==[chr(65+i) for i in range(sum(n))],'« Repérer A, B, C… » : dans l\'ordre du tri affiché',tg)
    ev("document.querySelector('#modal [data-a=close]').click()"); pg.wait_for_timeout(400); pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(700); ok(ev("STAGE.S.sups[0].points[0].tag")=='M1','Ctrl+Z : les repères d\'avant reviennent',ev("STAGE.S.sups[0].points[0].tag"))
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
