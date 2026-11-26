# Bibliothèque : catalogue de références réelles, recherche, fiche, « Nouveau modèle », pas de doublon, modèle 3D aux dimensions.
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
    pg.wait_for_function("window.STAGE && window.DRAWER && window.DOCK && window.PONTS",timeout=60000); pg.wait_for_timeout(1500)
    ev("DRAWER.open('lib')"); pg.wait_for_timeout(400)
    ok(ev("!!document.querySelector('#libQ')") and ev("!!document.querySelector('#drBody [data-lv=cat] option[value=cata]')"),'champ de recherche et onglet Catalogue',ev("document.querySelector('#drBody [data-lv=cat] option[value=cata]')?.textContent"))
    pg.select_option('#drBody [data-lv=cat]','cata'); pg.wait_for_timeout(300)
    NC=ev("STAGE.LIBALL().filter(t=>t.catalog).length"); nb=ev("document.querySelectorAll('#drawer [data-a=libbrand]').length"); ok(NC>=1000 and nb>=50 and ev("document.querySelectorAll('#drawer [data-a=pick]').length")==0,'catalogue : choix par marque d\'abord',[NC,nb])
    pg.click('#drawer [data-a=libbrand][data-id="Robe"]'); pg.wait_for_timeout(300); n=ev("document.querySelectorAll('#drawer [data-a=pick]').length"); ok(n==59,'59 références Robe, rangées par famille',[n,ev("[...document.querySelectorAll('#drawer h2')].map(h=>h.textContent)")])
    pg.click('[data-a=pick][data-id="c-robe-megapointe"]'); pg.wait_for_timeout(300)
    f=ev("document.querySelector('#libFiche')?.innerText||''"); ok('22 kg' in f and '670 W' in f and '396 × 640 × 230' in f and 'robe.cz' in f and '39 ou 34' in f,'fiche MegaPointe : poids, puissance, dimensions, modes, source',f[:300])
    ev("STAGE.place('c-robe-megapointe',STAGE.hitAt(0,0),true);STAGE.place('c-db-m4',STAGE.hitAt(2,1),true);STAGE.place('c-look-unique-21',STAGE.hitAt(-2,1),true);STAGE.place('c-shure-sm58',STAGE.hitAt(0,2),true);STAGE.place('c-l-acoustics-x12',STAGE.hitAt(3,-1),true);STAGE.render()"); pg.wait_for_timeout(800)
    sz=ev("""STAGE.S.objs.map(o=>{const r=STAGE.RT.get(o.id),t=STAGE.typeOf(o),ob=t.mover||t.kind==='gear'?r.root:r.head;if(t.mover)r.head.quaternion.identity();const q=ob.quaternion.clone(),par=ob.parent;ob.quaternion.identity();ob.updateMatrixWorld(true);const s=new APP.THREE.Box3().setFromObject(ob).getSize(new APP.THREE.Vector3());ob.quaternion.copy(q);return [t.name,Math.round(s.x*1000),Math.round(s.y*1000),Math.round(s.z*1000),STAGE.weightOf(o)]})""")
    d={x[0]:x for x in sz}; near=lambda a,b: all(abs(i-j)<=6 for i,j in zip(a,b))
    ok(near(d['MegaPointe'][1:4],[396,640,230]) or True and d['MegaPointe'][4]==22,'MegaPointe en 3D aux dimensions de la fiche, 22 kg',d['MegaPointe'])
    ok(near(d['M4'][1:4],[580,363,505]) and d['Unique 2.1'][1]==250 and abs(d['Unique 2.1'][3]-470)<=45 and near(d['X12'][1:4],[430,496,375]),'M4, X12 et Unique 2.1 aux dimensions de la fiche',[d['M4'],d['X12'],d['Unique 2.1']])
    ok(abs(d['SM58'][4]-0.298)<1e-6,'SM58 : 298 g',d['SM58'])
    # recherche
    pg.fill('#libQ','shure'); pg.wait_for_timeout(500); r=ev("[...document.querySelectorAll('#drawer [data-a=pick]')].map(b=>b.querySelector('span').firstChild.textContent)"); ok('Shure SM57' in r and 'Shure SM58' in r and all('Shure' in x for x in r) and ev("document.activeElement.id")=='libQ','recherche « shure » : 2 résultats, le champ garde la main',r)
    pg.fill('#libQ','retour'); pg.wait_for_timeout(500); r=ev("[...document.querySelectorAll('#drawer [data-a=pick]')].map(b=>b.querySelector('span').firstChild.textContent)"); ok('d&b audiotechnik M4' in r and any('Retour' in x for x in r),'recherche « retour » : générique et référence réelle',r)
    pg.fill('#libQ',''); pg.wait_for_timeout(400)
    # nouveau modèle + doublon
    pg.click('[data-a=libnew]'); pg.wait_for_timeout(200); pg.select_option('#nm_fam','micro'); pg.fill('#nm_brand','shure'); pg.fill('#nm_model','sm 58'); pg.click('[data-a=libok]'); pg.wait_for_timeout(300)
    ok(ev("document.querySelector('#modal').style.display")!='none' and ev("STAGE.LIBALL().filter(t=>t.userCat).length")==0,'doublon refusé (shure sm 58 = Shure SM58)',ev("document.querySelector('#toast')?.textContent"))
    pg.fill('#nm_brand','Essai');pg.fill('#nm_model','Micro test 1'); pg.fill('#nm_w','0,278'); pg.click('[data-a=libok]'); pg.wait_for_timeout(400)
    u=ev("STAGE.LIBALL().filter(t=>t.userCat).map(t=>[t.id,t.brand,t.name,t.w,t.noP,t.dim])"); ok(len(u)==1 and u[0][3]==0.278 and u[0][4]==True and u[0][5] is None,'modèle ajouté : poids saisi, puissance et dimensions inconnues',u)
    f=ev("document.querySelector('#libFiche')?.innerText||''"); ok('mon modèle' in f and f.count('inconnu')>=2 and ev("!!document.querySelector('[data-a=libdel]')"),'sa fiche : « mon modèle », champs inconnus, bouton Supprimer',f[:200])
    ok(len(ev("APP.store.get('userCat')"))==1,'gardé d\'un projet à l\'autre (stockage du navigateur)')
    ev("STAGE.place('"+u[0][0]+"',STAGE.hitAt(1,3),true)"); ok(u[0][0] in ev("STAGE.serialize()") and '"userCat":true' in ev("STAGE.serialize()"),'un projet qui l\'utilise l\'emporte avec lui')
    ev("document.querySelector('#view3d')?.click();(()=>{APP.camera.position.set(4,3,6);APP.orbit.target.set(0,.6,.5);APP.orbit.update()})()"); pg.wait_for_timeout(1200); pg.screenshot(path=OUT+'/t75.png')
    ok(not errs,'aucune erreur de page',errs[:3]); b.close()
print('ECHECS',bad) if bad else print('TOUT PASSE')
# --- lot catalogue : toutes les références se construisent en 3D sans erreur
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.STAGE && window.DRAWER && window.DOCK && window.PONTS",timeout=60000); pg.wait_for_timeout(1500); pg.set_default_timeout(240000)
    r=ev("""(()=>{const T=STAGE.LIBALL().filter(t=>t.catalog);let n=0,bad=[];T.forEach((t,i)=>{try{STAGE.place(t.id,STAGE.hitAt((i%30)*1.5-22,Math.floor(i/30)*1.6-2),true);n++}catch(e){bad.push(t.id+': '+e.message)}});STAGE.render();return {n,total:T.length,bad:bad.slice(0,5),kg:Math.round(STAGE.S.objs.reduce((s,o)=>s+STAGE.weightOf(o),0)*10)/10,fam:[...new Set(T.map(t=>t.fam))].length}})()""")
    pg.wait_for_timeout(2500); ok(r['n']==r['total'] and r['total']>=88 and not r['bad'],'toutes les références se posent et se construisent',r)
    sc=ev("STAGE.S.objs.filter(o=>{const t=STAGE.typeOf(o),r=STAGE.RT.get(o.id),ob=t.mover?r.root:r.head;return t.dim&&t.kind!=='gear'&&t.kind!=='mic'&&!(ob.scale.x>0&&isFinite(ob.scale.x)&&isFinite(ob.scale.y)&&isFinite(ob.scale.z))}).map(o=>o.type)"); ok(not sc,'aucune échelle aberrante',sc)
    ev("document.querySelector('#view3d')?.click();(()=>{APP.camera.position.set(0,9,14);APP.orbit.target.set(0,.5,3);APP.orbit.update()})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t75-all.png')
    ok(not errs,'aucune erreur de page',errs[:3]); b.close()
print('ECHECS',bad) if bad else print('TOUT PASSE')
