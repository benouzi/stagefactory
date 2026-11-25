# hiérarchie d'une structure : Structure › pièces. Ce qui est boulonné bouge ensemble ; retirer une pièce laisse un trou ; deux structures seulement si plus rien ne les relie.
import sys,os,json; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from h import *
from playwright.sync_api import sync_playwright
OUT=os.environ.get('OUT','/home/claude/shots'); bad=[]
def ok(c,m,d=''):
    print(('OK  ' if c else '!!  ')+m,d if not c or d=='' else str(d)[:200]); 
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1200)
    ST="PONTS.structs().map(q=>[q.name,q.m.length])"; SU="STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>[s.name,s.a.x,s.a.y,s.b.x,s.b.y,PONTS.piecesOf(s)])"
    r=ev(ST); ok(r==[['Gril',4]],'le gril posé est UNE structure de quatre travées',r)
    ev("PONTS.select(null);document.querySelector('#planBtn').click()"); pg.wait_for_timeout(600); ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300)
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    # clic sur une pièce (travée de face, premier élément côté jardin) : son nom d'abord, puis sa place dans la hiérarchie
    pg.mouse.click(*P(-3,0)); pg.wait_for_timeout(500); txt=ev("document.querySelector('#pontBar').innerText").replace('\n',' '); p0=ev("PONTS.piecesOf(STAGE.S.sups.find(s=>s.a.y===0&&s.b.y===0))")
    ok(txt.startswith('H30V-L%03d'%(p0[0]//10)) and 'Gril › face › pièce 1 sur %d'%len(p0) in txt,'clic sur une pièce : la barre donne son nom, puis Gril › face › pièce 1 sur n',txt[:90])
    tr=ev("(()=>{const t=document.querySelector('.ptree');if(!t)return null;const r=[...t.children];return {n:r.length,on:r.filter(x=>x.classList.contains('on')).map(x=>x.innerText.replace(/\\n/g,' ')),first:r[0].innerText.replace(/\\n/g,' ')}})()")
    ok(tr and tr['first'].startswith('Gril') and 'structure' in tr['first'] and tr['n']>=1+4+8+4+4 and len(tr['on'])==1 and tr['on'][0].startswith('H30V-L'),'Inspecteur : l\'arbre Gril › travées › pièces, coins, tours ; la pièce choisie y est marquée',tr)
    pg.screenshot(path=OUT+'/t89-arbre.png')
    def drag(x0,z0,x1,z1):
        x,y=P(x0,z0); x2,y2=P(x1,z1); pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move((x+x2)/2,(y+y2)/2,steps=4); pg.mouse.move(x2,y2,steps=4); pg.mouse.up(); pg.wait_for_timeout(700)
    # glisser une pièce boulonnée : toute la structure suit
    s0=ev(SU); drag(-3,0,-2,1); s1=ev(SU)
    ok(all(b_[1]-a_[1]==1000 and b_[3]-a_[3]==1000 and b_[2]-a_[2]==-1000 and b_[4]-a_[4]==-1000 for a_,b_ in zip(s0,s1)) and ev("PONTS.nodes().length")==4,'glisser une pièce boulonnée : les quatre travées avancent de 1 m, les coins tiennent',[s0[0][:5],s1[0][:5]])
    pg.evaluate("document.activeElement&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(700); ok(ev(SU)==s0,'Ctrl+Z : un seul pas ramène toute la structure',[ev(SU)[0][:5]])
    # niveau structure
    pg.mouse.click(*P(-3,0)); pg.wait_for_timeout(400); pg.click('#pontBar a[data-pa=tr]',timeout=8000); pg.wait_for_timeout(700)
    hi=ev("(()=>{let n=0,t=0;APP.scene.traverse(o=>{if(o.isInstancedMesh&&o.material.emissive){t+=o.count;if(o.material.emissive.getHex()===0x4a3008)n+=o.count}});return [n,t]})()")
    ok(ev("PONTS.st===true") and hi[0]>400 and ev("!!document.querySelector('[data-stn]')"),'clic sur « Gril » dans la barre : toute la structure est choisie et mise en évidence, sa fiche s\'ouvre',hi)
    pg.fill('[data-stn]','Gril scène'); pg.keyboard.press('Tab'); pg.wait_for_timeout(600); r=ev("[PONTS.structs().map(q=>q.name),STAGE.S.sups.filter(s=>s.kind==='truss').map(s=>s.name)]"); ok(r[0]==['Gril scène'] and all(n.startswith('Gril scène · ') for n in r[1]),'renommer la structure : ses travées suivent',r)
    # une travée boulonnée des deux côtés ne s'allonge pas
    pg.mouse.click(*P(-3,0)); pg.wait_for_timeout(400); s0=ev(SU); pg.click('#pontBar [data-pa=pcIns]',timeout=8000); pg.wait_for_timeout(500); ok(ev(SU)==s0,'insérer une pièce dans une travée tenue des deux côtés : refusé, rien ne bouge')
    # retirer la pièce côté jardin de la face : un trou, toujours UNE structure
    pg.click('#pontBar [data-pa=pcDel]',timeout=8000); pg.wait_for_timeout(1000); r=ev(ST); su=ev(SU); fa=[q for q in su if q[2]==0 and q[4]==0]
    ok(r==[['Gril scène',4]] and fa and fa[0][1]==-3500+p0[0] and fa[0][3]==4000 and fa[0][5]==p0[1:],'retirer la pièce de la face côté jardin : un trou, le reste en place, toujours UNE structure',[r,fa])
    pg.screenshot(path=OUT+'/t89-trou.png')
    # retirer aussi la pièce du lointain côté jardin (par l'arbre) : la travée jardin n'est plus reliée à rien, deux structures
    lo=ev("STAGE.S.sups.find(s=>s.a.y===6000&&s.b.y===6000).id"); ev("PONTS.select('%s')"%lo); pg.wait_for_timeout(500)
    pg.click('.ptree [data-id="pc|%s|0"]'%lo,timeout=8000); pg.wait_for_timeout(500); txt=ev("document.querySelector('#pontBar').innerText").replace('\n',' '); ok('lointain › pièce 1 sur' in txt and ev("PONTS.pc&&PONTS.pc.i")==0,'clic sur une pièce dans l\'arbre : elle est choisie dans la vue',txt[:80])
    pg.click('#pontBar [data-pa=pcDel]',timeout=8000); pg.wait_for_timeout(1000); r=ev(ST)
    ok(len(r)==2 and sorted(q[1] for q in r)==[1,3] and sorted(q[0] for q in r)==['Gril scène','Gril scène (2)'],'retirer aussi celle du lointain : la travée jardin n\'est plus tenue, deux structures distinctes',r)
    # glisser la travée jardin : elle seule bouge
    s0=ev(SU); drag(-4,-3,-5,-3); s1=ev(SU); mv=[b_[1]-a_[1] for a_,b_ in zip(s0,s1)]
    ok(sorted(mv)==[-1000,0,0,0],'glisser la travée jardin détachée : elle seule bouge',mv)
    pg.evaluate("document.activeElement&&document.activeElement.blur()")
    for _ in range(3): pg.keyboard.press('Control+z'); pg.wait_for_timeout(600)
    r=ev(ST); ok(r==[['Gril scène',4]],'trois Ctrl+Z : le gril est de nouveau entier',r)
    # champ X d'une travée boulonnée : tout suit
    ev("PONTS.select(STAGE.S.sups[0].id)"); pg.wait_for_timeout(400); s0=ev(SU); el=pg.query_selector('[data-pk=cx]')
    if el:
        v=float(el.input_value()); el.fill(str(v+2)); pg.keyboard.press('Tab'); pg.wait_for_timeout(600); s1=ev(SU); ok(all(b_[1]-a_[1]==2000 and b_[2]==a_[2] for a_,b_ in zip(s0,s1)),'champ « Centre X » d\'une travée : toute la structure se déplace de 2 m',[s0[1][:5],s1[1][:5]])
    else: ok(False,'champ Centre X introuvable')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
