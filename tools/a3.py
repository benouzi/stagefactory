# Audit 3 : gestes à la souris et enchaînements (3D, plan, clavier, annulation, copie).
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:380],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1366,768); ev=pg.evaluate
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && window.PUB && window.DECOR && window.LARRAY && window.WS",timeout=60000); pg.wait_for_timeout(1200)
    ok(ev("(()=>{const t=document.querySelector('#top');return t.scrollWidth<=t.clientWidth+1})()"),'barre du haut entière à 1366 px',ev("[document.querySelector('#top').scrollWidth,document.querySelector('#top').clientWidth]"))
    # écran → sol de la vue 3D
    S3=lambda x,z,y=0: ev("([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.canvas.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}",[x,y,z])
    def P(x,z): return ev("([x,z])=>{const cv=document.querySelector('#plan2d'),r=cv.getBoundingClientRect(),P=PLAN.P;return [r.left+P.ox+x*P.s,r.top+P.oy+z*P.s]}",[x,z])
    # ---- pont tracé dans la vue 3D
    ev("document.querySelector('[data-dom=rig]').click();document.querySelector('#rail [data-t=truss]').click()"); pg.wait_for_timeout(200)
    pg.mouse.click(*S3(-3,-3)); pg.wait_for_timeout(150); pg.mouse.move(*S3(3,-3)); pg.wait_for_timeout(150); pg.mouse.click(*S3(3,-3)); pg.wait_for_timeout(300)
    s=ev("STAGE.S.sups.map(s=>[s.a,s.b])"); ok(len(s)==1 and abs(s[0][0]['x']+3000)<=250 and abs(s[0][1]['x']-3000)<=250 and abs(s[0][0]['y']-3000)<=250,'pont tracé dans la vue 3D',s)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); ok(ev("!PONTS.tl"),'outil terminé')
    sid=ev("STAGE.S.sups[0].id"); y=ev("STAGE.S.sups[0].zMm/1000")
    # ---- clic sur le pont en 3D : sélection ; Suppr ; annuler
    ev("PONTS.select(null)"); c=ev("(()=>{const s=STAGE.S.sups[0];return [(s.a.x+s.b.x)/2000,-(s.a.y+s.b.y)/2000]})()"); pg.mouse.click(*S3(c[0],c[1],y+.15)); pg.wait_for_timeout(250)
    ok(ev("PONTS.sel")==sid,'clic sur le pont dans la vue 3D : sélectionné',ev("PONTS.sel"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); ok(ev("PONTS.st===true"),'Échap : de la pièce on remonte au pont entier'); pg.keyboard.press('Delete'); pg.wait_for_timeout(400); ok(ev("STAGE.S.sups.length")==0,'Suppr retire le pont sélectionné')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(400); ok(ev("STAGE.S.sups.length")==1,'Ctrl+Z le ramène'); sid=ev("STAGE.S.sups[0].id")
    # ---- projecteur posé d'un clic sur le pont en 3D
    ev("PONTS.select(null);STAGE.UI.serie=1;STAGE.UI.serieStep=0;STAGE.UI.placing='par-led';STAGE.render()"); pg.mouse.click(*S3(c[0]-1,c[1],y+.15)); pg.wait_for_timeout(300)
    o=ev("STAGE.S.objs.map(o=>({h:o.hang,sid:o.sid,y:o.pos[1],x:o.pos[0],z:o.pos[2]}))"); ok(len(o)==1 and o[0]['h']=='pont' and abs(o[0]['y']-(y-.03))<.01,'clic sur le pont en 3D avec un projecteur : accroché dessous',o)
    oid=ev("STAGE.S.objs[0]?.id")
    # ---- dupliquer, copier-coller : restent accrochés
    ev("(id)=>STAGE.select([id])",oid); pg.keyboard.press('Control+d'); pg.wait_for_timeout(300)
    o=ev("STAGE.S.objs.map(o=>({h:o.hang,sid:o.sid,x:o.pos[0],z:o.pos[2],y:o.pos[1]}))"); ok(len(o)==2 and o[1]['h']=='pont' and o[1]['sid']==ev("STAGE.S.sups[0].id") and abs(o[1]['z']-o[0]['z'])<.01,'dupliqué : la copie reste sur le pont, décalée le long',o)
    ok(ev("PONTS.resOf(STAGE.S.sups[0].id).count")==2,'le calcul compte les deux')
    # ---- sélectionner un objet désélectionne le pont, et inversement
    ev("(id)=>PONTS.select(id)",ev("STAGE.S.sups[0].id")); ok(ev("STAGE.UI.sel.length")==0,'pont sélectionné : objets désélectionnés')
    ev("(id)=>STAGE.select([id])",oid); ok(ev("PONTS.sel")==None,'objet sélectionné : pont désélectionné')
    # ---- glisser le pont dans le plan : appareils suivent ; annuler
    ev("STAGE.select([]);PLAN.fit();PLAN.draw()"); s0=ev("STAGE.S.sups[0].a"); a=P(c[0]+0.6,c[1]); pg.mouse.move(*a); pg.mouse.down(); t=P(c[0]+0.6,c[1]-2); pg.mouse.move(a[0],(a[1]+t[1])/2,steps=3); pg.mouse.move(*t,steps=3); pg.mouse.up(); pg.wait_for_timeout(300)
    s1=ev("STAGE.S.sups[0].a"); o=ev("STAGE.S.objs.map(o=>o.pos[2])"); ok(abs(s1['y']-s0['y']-2000)<=60 and all(abs(z-(-s1['y']/1000))<.01 for z in o),'pont glissé de 2 m dans le plan, projecteurs emmenés',[s0,s1,o])
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(400); ok(ev("STAGE.S.sups[0].a")==s0,'un seul Ctrl+Z annule le déplacement',ev("STAGE.S.sups[0].a"))
    # ---- saisie au clavier dans l'Inspecteur : Tab garde la main dans le champ suivant
    ev("(id)=>PONTS.select(id)",ev("STAGE.S.sups[0].id")); pg.wait_for_timeout(200); pg.click('#console [data-pk=lenM]'); pg.keyboard.press('Control+a'); pg.keyboard.type('8'); pg.keyboard.press('Tab'); pg.wait_for_timeout(250)
    ok(ev("PONTS.len(STAGE.S.sups[0])")==8000 and ev("document.activeElement.dataset.pk")=='zM','Tab après la longueur : le champ suivant garde la main',ev("[document.activeElement.tagName,document.activeElement.dataset.pk]"))
    pg.keyboard.type('6'); pg.keyboard.press('Tab'); pg.wait_for_timeout(250); ok(ev("STAGE.S.sups[0].zMm")==6000 and ev("document.activeElement.dataset.pk")=='cx','saisie enchaînée : hauteur 6 m',ev("STAGE.S.sups[0].zMm"))
    # ---- patch : Tab d'adresse en adresse
    ev("DRAWER.open('patch')"); pg.wait_for_timeout(200); pg.click('#drBody tr:nth-child(2) [data-dp=addr]'); pg.keyboard.press('Control+a'); pg.keyboard.type('101'); pg.keyboard.press('Tab'); pg.wait_for_timeout(250)
    ok(101 in ev("STAGE.S.objs.map(o=>o.addr)") and ev("!!document.activeElement.dataset.dp"),'patch : adresse saisie, Tab reste dans le tableau',ev("[STAGE.S.objs.map(o=>o.addr),document.activeElement.dataset.dp||document.activeElement.tagName]"))
    # ---- projecteur accroché, déplacé à la main loin du pont : il revient sur l'axe
    ev("(id)=>{const o=STAGE.byId(id);o.pos[2]+=1.2;o.pos[1]=1;STAGE.touch()}",oid); o=ev("(id)=>STAGE.byId(id).pos",oid); ok(abs(o[1]-5.97)<.01 and abs(o[2]-(-ev("STAGE.S.sups[0].a.y")/1000))<.01,'objet accroché : toujours ramené sous son pont',o)
    # ---- décrocher : accroche « au sol »
    ev("(id)=>{STAGE.select([id]);STAGE.UI.tab='prop';STAGE.render()}",oid); pg.select_option('#console [data-k=hang]',''); pg.wait_for_timeout(250); ok(ev("(id)=>{const o=STAGE.byId(id);return !o.hang&&!o.sid}",oid),'décroché par le menu Accroche')
    pg.select_option('#console [data-k=hang]','pont'); pg.wait_for_timeout(250); ok(ev("(id)=>STAGE.byId(id).hang",oid)=='pont','raccroché au pont le plus proche')
    # ---- calque Ponts décoché
    ev("STAGE.select([]);PONTS.select(null);STAGE.UI.tab='doc';STAGE.render()"); pg.uncheck('#console [data-ly=ponts]'); pg.wait_for_timeout(300)
    ok(ev("PONTS.near(0,-3)")==None,'calque Ponts décoché : plus d\'accroche dessus'); pg.check('#console [data-ly=ponts]'); pg.wait_for_timeout(200)
    # ---- coupe : cadrée sur le contenu
    ev("PLAN.setView('coupe');PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300); ok(ev("PLAN.P.s")>15,'coupe d\'un espace ouvert : cadrée sur le matériel',ev("PLAN.P.s")); pg.screenshot(path=OUT+'/a3-coupe.png'); ev("PLAN.setView('plan')")
    # ---- pupitre : le rail et l'Inspecteur s'arrêtent au-dessus
    ev("WS.C.desk.run()"); pg.wait_for_timeout(500); r=ev("(()=>{const d=document.querySelector('#desk').getBoundingClientRect(),q=s=>document.querySelector(s).getBoundingClientRect().bottom;return [d.top,q('#rail'),q('#console')]})()"); ok(r[1]<=r[0]+1 and r[2]<=r[0]+1,'pupitre ouvert : rail et Inspecteur ne le recouvrent pas',r); pg.screenshot(path=OUT+'/a3-pupitre.png'); ev("WS.C.desk.run()")
    # ---- nouveau projet : tout est vidé
    ev("STAGE.loadShow(STAGE.blankShow())"); pg.wait_for_timeout(300); ok(ev("STAGE.S.sups.length+STAGE.S.dims.length+STAGE.S.arrays.length")==0 and ev("PONTS.sel")==None,'projet vierge : ponts, cotes et line arrays vidés')
    # ---- line array : visée auto sans boîte devant le premier rang
    r=ev("(()=>{const a=LARRAY.fresh();LARRAY.autoAim(a);const R=LARRAY.solve(a);return R.boxes.map(b=>b.hit?+b.hit.u.toFixed(1):null)})()"); ok(all(x is not None and 4<=x<=30 for x in r),'visée automatique : toutes les boîtes dans le public',r)
    # ---- petite fenêtre
    pg.set_viewport_size({'width':1180,'height':700}); pg.wait_for_timeout(700); pg.screenshot(path=OUT+'/a3-1180.png')
    ok(not errs,'aucune erreur de script',errs[:4]); b.close()
print('ÉCHECS :',bad if bad else 'aucun')
