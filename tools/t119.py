# calques libres (ordre, masquer, plan seul, verrou, couleur), légende sur le plan, inspecteur (sections, valeurs à taper, sélection multiple)
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.DRAW && window.LAYERS && window.VIDEO && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    I=ev("""(()=>{const T=APP.THREE,at=(x,z)=>({point:new T.Vector3(x,0,z),object:{userData:{}},face:null});const cube=STAGE.place('prim-cube',at(0,0),true,{}),p1=STAGE.place('par-zoom',at(0,0),true,{}),p2=STAGE.place('par-zoom',at(2,0),true,{}),vp=STAGE.place('vp12',at(-3,3),true,{}),sp=STAGE.place('pt12',at(4,2),true,{});p2.pan=40;STAGE.touch();STAGE.select([]);if(!PLAN.P.on)PLAN.toggle(true);return {cube:cube.id,p1:p1.id,p2:p2.id,vp:vp.id,sp:sp&&sp.id}})()"""); pg.wait_for_timeout(900)
    W="([x,z])=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left+PLAN.P.ox+x*PLAN.P.s,r.top+PLAN.P.oy+z*PLAN.P.s]}"
    names=lambda: ev("LAYERS.order().map(LAYERS.name)")
    ordo=lambda: ev("LAYERS.sorted(STAGE.S.objs).map(o=>o.id)")
    ok(names()==['Structure et scène','Décor et personnages','Dessin','Ponts et structures','Son','Vidéo','Lumière','Cotes'] and ev("(id)=>LAYERS.ofObj(STAGE.byId(id))",I['p1'])=='lum' and ev("(id)=>LAYERS.ofObj(STAGE.byId(id))",I['cube'])=='str','rangement par défaut : chaque élément est dans le calque de son métier, le bâti dessous, les appareils dessus, les cotes tout en haut',names())
    o=ordo(); ok(o.index(I['cube'])<o.index(I['p1']),'le projecteur posé au même endroit que le cube est dessiné par-dessus lui')
    # panneau
    pg.click('#planLay'); pg.wait_for_timeout(400); n=ev("document.querySelectorAll('#lyPan .lyr').length"); first=ev("document.querySelector('#lyPan .lyr').dataset.id"); ok(n==8 and first=='cotes' and ev("document.querySelector('#planLay').classList.contains('on')"),'bouton « ☰ Calques » du plan : le panneau liste les 8 calques, celui du dessus en haut',[n,first])
    pg.click('#lyPan [data-lya=add]'); pg.wait_for_timeout(500); cid=ev("LAYERS.order().find(id=>!LAYERS.isAuto(id))"); pg.fill('#lyPan .lyr[data-id="%s"] [data-lyn]'%cid,'Décor volant'); pg.keyboard.press('Tab'); pg.wait_for_timeout(500)
    ok(cid and ev("(id)=>LAYERS.name(id)",cid)=='Décor volant' and names()[-2:]==['Décor volant','Cotes'],'« + Calque » puis un nom : le nouveau calque se place en haut, juste sous les cotes',names()[-3:])
    # ranger la sélection dedans
    ev("(id)=>STAGE.select([id])",I['cube']); pg.wait_for_timeout(300); pg.click('#lyPan .lyr[data-id="%s"] [data-lya=put]'%cid); pg.wait_for_timeout(500); o=ordo()
    ok(ev("(id)=>STAGE.byId(id).ly",I['cube'])==cid and o.index(I['cube'])>o.index(I['p1']) and ev("(id)=>LAYERS.count(id)",cid)==1,'le cube choisi est rangé dans ce calque (bouton ⤵) : il passe au premier plan, par-dessus le projecteur',o)
    pg.click('#lyPan .lyr[data-id="%s"] [data-lya=down]'%cid); pg.wait_for_timeout(300); pg.click('#lyPan .lyr[data-id="%s"] [data-lya=down]'%cid); pg.wait_for_timeout(400); o=ordo(); ok(o.index(I['cube'])<o.index(I['p1']) and names().index('Décor volant')<names().index('Lumière'),'deux fois ▼ : le calque descend sous la lumière, le cube repasse dessous',names())
    # couleur
    ev("(id)=>LAYERS.set(id,'col','#ff00aa')",'lum'); pg.wait_for_timeout(600); pg.screenshot(path=OUT+'/t119-p.png',clip={'x':545,'y':45,'width':620,'height':560}); ev("LAYERS.toggle(false)"); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'/t119-a.png'); im=Image.open(OUT+'/t119-a.png').convert('RGB'); x,y=ev(W,[2,0]); mag=sum(1 for i in range(-22,23) for j in range(-22,23) if (lambda q: q[0]>200 and q[1]<90 and q[2]>120)(im.getpixel((int(x)+i,int(y)+j))))
    ok(mag>20 and ev("(id)=>LAYERS.colObj(STAGE.byId(id))",I['p2'])=='#ff00aa','couleur magenta donnée au calque Lumière : le symbole du projecteur est tracé en magenta sur le plan',mag)
    ev("(id)=>{STAGE.select([id]);STAGE.UI.tab='prop';STAGE.render()}",I['p2']); pg.wait_for_timeout(600)
    # fiche : calque et couleur propre
    ok(ev("!!document.querySelector('#console [data-oly]') && !!document.querySelector('#console [data-opc]')"),'la fiche d\'un objet propose son calque et sa couleur sur le plan')
    ev("(()=>{const e=document.querySelector('#console [data-opc]');e.value='#00aa00';e.dispatchEvent(new Event('change',{bubbles:true}))})()"); pg.wait_for_timeout(500); ok(ev("(id)=>LAYERS.colObj(STAGE.byId(id))",I['p2'])=='#00aa00' and ev("(id)=>LAYERS.colObj(STAGE.byId(id))",I['p1'])=='#ff00aa','couleur propre verte sur un projecteur : elle passe avant celle de son calque, l\'autre projecteur reste magenta')
    pg.select_option('#console [data-oly]',cid); pg.wait_for_timeout(500); ok(ev("(id)=>STAGE.byId(id).ly",I['p2'])==cid,'« Calque » dans la fiche : le projecteur change de calque')
    pg.select_option('#console [data-oly]',''); pg.wait_for_timeout(400); ok(ev("(id)=>STAGE.byId(id).ly",I['p2']) is None,'retour au calque par défaut depuis la fiche')
    # plan seul / visible / verrou
    ev("LAYERS.set('son','plan',false)"); pg.wait_for_timeout(500); h=ev("(a)=>{const o=STAGE.byId(a);return [LAYERS.planHid(o),APP.layHid(o),!!PLAN.hit(o.pos[0],o.pos[2]),STAGE.RT.get(a).root.visible]}",I['sp'])
    ok(h==[True,False,False,True],'calque Son éteint « sur le plan » seulement : l\'enceinte disparaît du plan (et ne s\'y prend plus) mais reste dans la vue 3D',h)
    ev("LAYERS.set('son','plan',true);LAYERS.set('vid','vis',false)"); pg.wait_for_timeout(600); h=ev("(a)=>{const o=STAGE.byId(a);STAGE.tick(0);return [APP.layHid(o),STAGE.RT.get(a).root.visible,STAGE.S.layers.vid]}",I['vp']); ok(h==[True,False,False],'calque Vidéo éteint (👁) : le vidéoprojecteur disparaît partout, 3D comprise',h)
    ev("LAYERS.set('vid','vis',true);LAYERS.set('lum','lock',true)"); pg.wait_for_timeout(500); pg.mouse.click(*ev(W,[2,0])); pg.wait_for_timeout(300); s1=ev("STAGE.UI.sel.length"); ev("LAYERS.set('lum','lock',false)"); pg.wait_for_timeout(300); pg.mouse.click(*ev(W,[2,0])); pg.wait_for_timeout(300)
    ok(s1==0 and ev("STAGE.UI.sel")==[I['p2']],'calque Lumière verrouillé (🔒) : un clic sur le projecteur ne le prend plus ; déverrouillé, il se prend')
    # légende
    ev("LAYERS.toggle(true)"); pg.wait_for_timeout(300); pg.check('#lyPan [data-lyg]'); pg.wait_for_timeout(600); R=ev("LAYERS.legendRows().map(r=>[r.name,r.n])"); rect=ev("LAYERS.legendRect")
    ok(rect and rect[2]>80 and ['Vidéoprojecteur 12 000 lm',1] in R and any(r[1]==2 for r in R) and len(R)==4,'« Légende sur le plan » : un cadre apparaît avec chaque modèle présent et son nombre',R)
    pg.screenshot(path=OUT+'/t119-b.png',clip={'x':545,'y':45,'width':620,'height':560})
    ev("LAYERS.toggle(false)"); pg.wait_for_timeout(300); cv=ev("(()=>{const r=document.querySelector('#plan2d').getBoundingClientRect();return [r.left,r.top]})()"); a=[cv[0]+rect[0]+30,cv[1]+rect[1]+10]; pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(a[0]+90,a[1]+120,steps=8); pg.mouse.up(); pg.wait_for_timeout(500); r2=ev("LAYERS.legendRect"); g=ev("STAGE.S.layers._c.legend")
    ok(abs(r2[0]-rect[0]-90)<8 and abs(r2[1]-rect[1]-120)<8 and 'x' in g,'la légende se déplace en la glissant, et reste où on la pose',[rect[:2],r2[:2]])
    ev("LAYERS.set('vid','plan',false)"); pg.wait_for_timeout(400); ok(not any('Vidéoprojecteur' in r[0] for r in ev("LAYERS.legendRows().map(r=>[r.name,r.n])")),'ce qui est masqué sur le plan sort de la légende'); ev("LAYERS.set('vid','plan',true)")
    # inspecteur
    ev("(id)=>{STAGE.select([id]);STAGE.UI.tab='prop';STAGE.render()}",I['vp']); pg.wait_for_timeout(700); secs=ev("[...document.querySelectorAll('#console .pf .sech')].map(h=>h.dataset.sec)")
    ok(len(secs)>=5 and secs[0]=='Identité et position' and 'Optique' in secs and 'Image' in secs and 'Visée' in secs,'la fiche d\'un vidéoprojecteur est rangée en sections',secs)
    vis=lambda lab: ev("(l)=>{const e=[...document.querySelectorAll('#console .pf label')].find(x=>x.textContent.trim()===l);return e?getComputedStyle(e).display!=='none':null}",lab)
    v0=vis('Pan'); pg.click('#console .sech[data-sec="Visée"]'); pg.wait_for_timeout(300); v1=vis('Pan'); ev("STAGE.select([]);"); pg.wait_for_timeout(200); ev("(id)=>{STAGE.select([id]);STAGE.render()}",I['vp']); pg.wait_for_timeout(600); v2=vis('Pan')
    ok(v0 is True and v1 is False and v2 is False and vis('Mapping') is True,'un clic sur « Visée » la replie, et elle reste repliée quand on revient sur l\'objet ; les autres sections restent ouvertes',[v0,v1,v2])
    ev("(id)=>{STAGE.select([id]);STAGE.render()}",I['p1']); pg.wait_for_timeout(600); ok(vis('Effet') is False and vis('Zoom') is True,'sur un projecteur lumière, la section « Effets » est repliée au départ, le reste ouvert'); ev("(id)=>{STAGE.select([id]);STAGE.render()}",I['vp']); pg.wait_for_timeout(600)
    pg.click('#console .sech[data-sec="Visée"]'); pg.wait_for_timeout(300)
    wd=ev("(()=>{const rg=document.querySelector('#console [data-k=pan]'),n=rg.parentElement.querySelector('.rvn'),lb=[...document.querySelectorAll('#console .pf label')].every(l=>l.scrollWidth<=l.clientWidth+1&&l.getBoundingClientRect().left>=document.querySelector('#console').getBoundingClientRect().left);return [Math.round(rg.getBoundingClientRect().width),Math.round(n.getBoundingClientRect().width),lb]})()"); ok(wd[0]>=60 and wd[1]<=80 and wd[2],'le curseur garde sa place : case chiffrée étroite, libellés entiers',wd); pg.screenshot(path=OUT+'/t119_insp.png')
    nb=ev("(()=>{const rg=document.querySelector('#console [data-k=pan]'),n=rg.parentElement.querySelector('.rvn');return n?[n.value,rg.parentElement.querySelector('.rvu').textContent]:null})()"); pg.fill('#console [data-k=pan] ~ .rvn','-123.5'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    ok(nb and nb[1]=='°' and ev("(id)=>STAGE.byId(id).pan",I['vp'])==-123.5,'chaque curseur a sa case : taper -123,5 puis Entrée règle le pan exactement',[nb,ev("(id)=>STAGE.byId(id).pan",I['vp'])])
    pg.fill('#console [data-k=pan] ~ .rvn','999'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400); ok(ev("(id)=>STAGE.byId(id).pan",I['vp'])==180,'une valeur hors plage est ramenée à la limite du curseur',ev("(id)=>STAGE.byId(id).pan",I['vp']))
    # sélection multiple
    ev("(a)=>{STAGE.select(a);STAGE.render()}",[I['p1'],I['p2']]); pg.wait_for_timeout(700); mx=ev("(()=>{const rg=document.querySelector('#console [data-k=pan]'),n=rg&&rg.parentElement.querySelector('.rvn'),z=document.querySelector('#console [data-k=zoom]'),zn=z&&z.parentElement.querySelector('.rvn');return {pan:n&&[n.classList.contains('mix'),n.value,n.placeholder],zoom:zn&&[zn.classList.contains('mix'),zn.value],note:document.querySelector('#console .mixn')?.textContent}})()")
    ok(mx['pan']==[True,'','≠'] and mx['zoom'] and mx['zoom'][0] is False and '2 éléments' in (mx['note'] or ''),'deux projecteurs choisis : le pan, qui diffère, est encadré avec « ≠ » ; le zoom, identique, est affiché ; une ligne dit que la modification s\'applique aux deux',mx)
    pg.fill('#console [data-k=pan] ~ .rvn','15'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500); ok(ev("(a)=>a.map(id=>STAGE.byId(id).pan)",[I['p1'],I['p2']])==[15,15],'taper 15 : les deux projecteurs prennent le même pan')
    # enregistrement
    s=ev("STAGE.serialize()"); ev("(s)=>{STAGE.loadShow(JSON.parse(s));STAGE.tick(0)}",s); pg.wait_for_timeout(900)
    ok(ev("(id)=>LAYERS.name(id)",cid)=='Décor volant' and ev("(id)=>STAGE.byId(id).ly",I['cube'])==cid and ev("LAYERS.col('lum')")=='#ff00aa' and ev("STAGE.S.layers._c.legend.on") and ev("(id)=>STAGE.byId(id).planCol",I['p2'])=='#00aa00','projet rouvert : calques, ordre, couleurs, légende et rangement sont gardés')
    ev("(id)=>LAYERS.remove(id)",cid); pg.wait_for_timeout(500); ok(ev("(id)=>STAGE.byId(id).ly",I['cube']) is None and ev("(id)=>LAYERS.ofObj(STAGE.byId(id))",I['cube'])=='str','calque supprimé : son contenu retourne dans le calque par défaut')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
