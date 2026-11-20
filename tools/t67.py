# Décor et personnages, cotes, calques, publication PDF, rapport de sécurité, line array. Charge app/ sans passerelle.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && !!PLAN.sheet && window.PUB && window.DECOR && window.LARRAY",timeout=60000)
    ev("document.querySelector('#modal').style.display='none'")
    # ---- décor : bibliothèque, pose, modèle détaillé
    n=ev("STAGE.LIBALL().filter(t=>t.kind==='sprop').length"); ok(n==73,'73 modèles de décor et personnages dans la bibliothèque',n)
    ev("document.querySelector('[data-dom=sce]').click()"); pg.click('#rail [data-t=prop]'); pg.wait_for_function("DECOR.ready",timeout=90000); pg.wait_for_timeout(1500)
    g=ev("[...document.querySelectorAll('#drBody h2')].map(h=>h.textContent)"); ok(g[:6]==['Mobilier','Musique','Décor','Tissus','Technique','Personnages'],'tiroir : bibliothèque Décor par groupes',g)
    ok(ev("document.querySelectorAll('#drBody .lib.dec img').length")>=50,'vignettes des modèles',ev("document.querySelectorAll('#drBody .lib.dec img').length"))
    ev("STAGE.place('sf-batterie',STAGE.hitAt(0,-3));STAGE.place('sf-chanteuse',STAGE.hitAt(0,-1));STAGE.place('sf-frise',STAGE.hitAt(0,-5))"); pg.wait_for_timeout(2500)
    o=ev("STAGE.S.objs.map(o=>({t:o.type,y:o.pos[1],h:o.hang,m:(()=>{let n=0;STAGE.RT.get(o.id).root.traverse(q=>{if(q.isMesh)n++});return n})()}))")
    ok(o[0]['m']>=4 and o[1]['m']>=1 and o[2]['y']==6 and o[2]['h']=='fixe','batterie détaillée, chanteuse, frise accrochée à 6 m',o)
    ok(ev("DECOR.M.peopleReady('chanteuse')"),'personnage MakeHuman lu')
    # ---- calques : le décor disparaît de la 3D et du plan
    ev("STAGE.UI.tab='doc';STAGE.select([]);STAGE.render()"); pg.wait_for_timeout(200); pg.uncheck('#console [data-ly=dec]'); pg.wait_for_timeout(500)
    ok(ev("STAGE.S.objs.every(o=>STAGE.RT.get(o.id).root.visible===false)") and ev("PLAN.hit(0,-3)")==None,'calque Décor décoché : caché en 3D, insensible dans le plan')
    pg.check('#console [data-ly=dec]'); pg.wait_for_timeout(500); ok(ev("STAGE.S.objs.every(o=>STAGE.RT.get(o.id).root.visible)"),'calque recoché : de retour')
    # ---- cotes sur le plan
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    pg.click('#rail [data-t=cote]'); pg.wait_for_timeout(200); ok(ev("!!PUB.tl"),'outil Cote armé')
    pg.mouse.click(*P(0.05,-3.02)); pg.mouse.click(*P(0.03,-0.98)); pg.mouse.click(*P(1.5,-2)); pg.wait_for_timeout(300)
    d=ev("STAGE.S.dims"); ok(len(d)==1 and d[0]['a']==[0,-3] and d[0]['b']==[0,-1] and abs(abs(d[0]['off'])-1.5)<.06,'cote de 2 m aimantée sur les deux objets, écartée de 1,5 m',d)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(ev("!PUB.tl"),'Échap termine les cotes')
    # ---- un pont chargé, pour le dossier
    ev("(()=>{const s=PONTS.addTruss({x:-4000,y:2000},{x:4000,y:2000},null,true);STAGE.UI.serie=1;for(const x of [-3,-1,1,3])STAGE.place('par-led',STAGE.hitAt(x,-2),true);STAGE.touch()})()"); pg.wait_for_timeout(300)
    ok(ev("STAGE.S.objs.filter(o=>o.hang==='pont').length")==4,'pont et 4 projecteurs')
    # ---- publication PDF
    r=ev("""async()=>{let got=null;const sv=STAGE.saveFile;const pdf=await (async()=>{const o=PUB.publish;return await PUB.publish({plan:true,coupe:true,gear:true,patch:true,rig:true,bom:true,secu:true})})();const L=await import('./vendor/pdf-lib.js');const d=await L.PDFDocument.load(pdf);return {n:d.getPageCount(),kb:Math.round(pdf.length/1024),sz:d.getPages().map(p=>p.getSize()).map(s=>[Math.round(s.width/72*25.4),Math.round(s.height/72*25.4)]),head:String.fromCharCode(...pdf.slice(0,5))}}""")
    ok(r['head']=='%PDF-' and r['n']>=7 and r['sz'][0]==[420,297] and r['sz'][2]==[210,297],'dossier PDF : plan et coupe en A3 paysage, puis listes en A4',r)
    open(OUT+'/t67.pdf','wb').write(bytes(ev("async()=>[...(await PUB.publish({plan:true,rig:true,secu:true}))]")))
    # ---- line array
    ev("LARRAY.open()"); pg.wait_for_timeout(300); t=ev("document.querySelector('#modal').innerText")
    ok('Kara II' in t and '26,0 kg' in t and 'l-acoustics.com' in t,'dialogue Line array : Kara II, 26 kg, source citée')
    R=ev("(()=>{const a=LARRAY.cur,R=LARRAY.solve(a);return {n:R.n,W:R.mech.W,fk:R.mech.frameKg,site:a.site,sp:a.splays,hit:R.boxes.map(b=>b.hit?+b.hit.u.toFixed(1):null),th:R.boxes.map(b=>b.th),cg:R.mech.cg}})()")
    ok(R['n']==8 and R['W']==208 and R['fk'] is None,'8 Kara II = 208 kg, cadre non compté car poids non relevé',R)
    ok(all(s in [0,1,2,3,4,5,7.5,10] for s in R['sp']) and R['hit'][0] is not None and abs(R['hit'][0]-30)<2.5 and all(R['hit'][i]>=R['hit'][i+1] for i in range(7)) and R['hit'][7]<12,'visée automatique : angles du catalogue, du dernier rang vers le premier',[R['sp'],R['hit']])
    # géométrie : boîte 2 tournée de l'angle choisi, articulée sur l'arête avant
    g=ev("(()=>{const a=LARRAY.fresh();a.site=0;a.splays=[5,5,5,5,5,5,5];const R=LARRAY.solve(a);return R.boxes.slice(0,3).map(b=>[b.th,+b.F[0].toFixed(4),+b.F[1].toFixed(4)])})()")
    import math
    ok(g[1]==[5,0,6.748] and abs(g[2][1]+0.252*math.sin(math.radians(5)))<1e-3 and abs(g[2][2]-(6.748-0.252*math.cos(math.radians(5))))<1e-3,'géométrie de la courbure vérifiée à la main',g)
    pg.fill('#modal [data-la=frameKg]','15'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300); ok(ev("LARRAY.solve(LARRAY.cur).mech.W")==223,'cadre saisi à 15 kg : 223 kg')
    pg.select_option('#modal [data-la=pick]','2'); pg.wait_for_timeout(300); m=ev("(()=>{const M=LARRAY.solve(LARRAY.cur).mech;return [M.Rf,M.Rr,M.W,M.cg]})()"); ok(abs(m[0]+m[1]-m[2])<1e-6 and abs(m[0]*0+m[1]*(-.5)-m[2]*m[3])<1e-6,'deux points : somme et moment équilibrés',m)
    pg.click('#modal [data-lb=place]'); pg.wait_for_timeout(500)
    o=ev("STAGE.S.objs.filter(o=>o.type==='lab-kara2').map(o=>({w:o.w,tilt:o.tilt,y:o.pos[1],x:o.pos[0],h:o.hang}))"); ok(len(o)==8 and all(q['w']==26 and q['h']=='fixe' for q in o) and o[0]['y']>o[7]['y'] and o[0]['tilt']>o[7]['tilt'],'8 boîtes posées dans la scène, de plus en plus inclinées',o[:2])
    ev("LARRAY.open()"); pg.wait_for_timeout(200); pg.click('#modal [data-lb=load]'); pg.wait_for_timeout(300)
    l=ev("STAGE.S.sups[0].loads"); ok(l and l[0]['kg']==223 and l[0]['lengthMm']==0,'charge de 223 kg ajoutée au pont',l)
    ok(ev("PONTS.resOf(STAGE.S.sups[0].id).extraKg")==223,'le calcul du pont la compte')
    pg.screenshot(path=OUT+'/t67.png'); ev("document.querySelector('#modal').style.display='none'")
    # ---- enregistrer et recharger
    d=ev("STAGE.serialize()"); ev("STAGE.loadShow(STAGE.blankShow())"); ev("(d)=>STAGE.loadShow(JSON.parse(d))",d); pg.wait_for_timeout(1500)
    ok(ev("STAGE.S.arrays.length")==1 and ev("STAGE.S.dims.length")==1 and ev("STAGE.S.objs.filter(o=>STAGE.typeOf(o).kind==='sprop').length")==3 and ev("STAGE.S.objs.filter(o=>o.type==='lab-kara2').length")==8,'rechargé : line array, cote, décor, boîtes')
    ev("PLAN.fit();PLAN.draw();DRAWER.open('secu')"); pg.wait_for_timeout(2500); pg.screenshot(path=OUT+'/t67b.png')
    ok(not errs,'aucune erreur de script',errs[:4])
    b.close()
print('ÉCHECS :',bad if bad else 'aucun')
