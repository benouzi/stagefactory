# Parc de matériel par salle : recette de l'import d'une fiche technique (salle communale d'Onex) en trois passes, telle que Claude la fait par le connecteur.
import sys,json; sys.path.insert(0,'/home/claude/tools')
from h import *
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:300],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,860,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.PLAN && window.RIG && window.AI && window.VENUE && window.PARC && PARC.ready && window.WINS",timeout=120000); ev("APP.renderer.setAnimationLoop(null)")
    hide=pg.add_style_tag(content='#modal{display:none!important}')
    T=lambda n,a={}: json.loads(ev("async(a)=>(await VENUE.tool(a[0],a[1])).content[0].text",[n,a]))
    tick="for(let k=0;k<6;k++){for(const f of APP.hooks.update)f(1/30)}"
    a0=ev("STAGE.serialize()")
    # ---- défaut 4 : pas de projet remplacé sans accord
    r=T('regler_salle',{'plateauLargeurM':14}); ok('erreur' in r and 'creer_salle' in r['erreur'] and ev("APP.venue.type")=='onex','regler_salle ne remplace plus le projet ouvert',r.get('erreur','')[:90])
    r=T('creer_salle',{'nom':'Salle communale d\'Onex'}); ok('erreur' in r and ev("APP.venue.type")=='onex','creer_salle demande confirmation',r.get('erreur','')[:60])
    r=T('creer_salle',{'nom':'Salle communale d\'Onex','confirme':True}); ok(r.get('ok') and ev("APP.store.get('backups',[]).length")==1 and ev("APP.store.get('backups')[0].objs")==37,'salle créée, projet précédent mis de côté',r)
    vid=ev("APP.venue.vid")
    # ---- défaut 1 : aucune perche d'office
    r=T('regler_salle',{'plateauLargeurM':14,'plateauProfondeurM':9,'cadreOuvertureM':10,'cadreHauteurM':5.5,'hauteurSceneM':1.2,'hauteurSalleM':8,'salleLargeurM':18,'salleProfondeurM':22}); ev(tick)
    ok(ev("APP.PERCHES.filter(p=>!p.off).length")==0 and ev("APP.venue.noPipes")==True and len(r['perches'])==0,'aucune perche posée d\'office',r['salle'].get('stageH'))
    ev("PLAN.toggle(true);PLAN.draw();PLAN.setView('coupe');PLAN.draw();PLAN.setView('plan');RIG.changed();RIG.all();PLAN.toggle(false)"); ok(not errs,'salle sans perche : plan, coupe et charges sans erreur',errs[:2])
    # ---- passe 1 : les 9 perches, circuits et charges lues ; défaut 2 : référence des hauteurs
    for k in range(7): T('poser_perche',{'nom':'Perche %d'%(k+1),'y':1+k*1.1,'longueurM':12,'hauteurM':6.5,'circuits':12,'chargeRepartieLueKg':250,'chargePonctuelleLueKg':80})
    r=T('poser_perche',{'nom':'Face 1','y':-3,'longueurM':10,'hauteurM':7.2,'reference':'sol','circuits':18,'chargeRepartieLueKg':300})
    ok(abs(r['hauteurDepuisLePlateauM']-6.0)<1e-6 and abs(r['hauteurDepuisLeSolDeSalleM']-7.2)<1e-6 and 'valider' in r['charges'],'hauteur depuis le sol de la salle convertie (1,20 m d\'écart)',r)
    r=T('poser_perche',{'nom':'Face 2','y':-6,'longueurM':10,'hauteurM':6.0}); ev(tick)
    ps=ev("APP.PERCHES.filter(p=>!p.off).map(p=>[p.name,+p.y.toFixed(2),p.c,p.wllP,p.wllPt])"); ok(len(ps)==9 and ps[7]==['Face 1',6,18,300,0] and ps[0]==['Perche 1',6.5,12,250,80] and ps[8][1]==6,'neuf perches, circuits préremplis, charges proposées',ps[7])
    ok('PLATEAU' in next(t for t in ev("VENUE.mcpTools()") if t['name']=='poser_perche')['description'],'la description de poser_perche dit la référence')
    # ---- défaut 3 : charge proposée, validée à la main dans le plan de charge
    pg.evaluate("h=>h.remove()",hide); ev("RIG.open(0)"); pg.wait_for_selector('#rigProp [data-wl=wllTotal]')
    ok(ev("(STAGE.S.rig.per[0]||{}).wllTotal")==None and '250' in pg.inner_text('#rigProp') and '12 circuits' in pg.inner_text('#rigRoot'),'charge lue proposée, pas appliquée',pg.inner_text('#rigProp')[:90])
    pg.click('#rigProp [data-wl=wllTotal]'); ok(ev("STAGE.S.rig.per[0].wllTotal")==250 and pg.locator('#rigProp [data-wl=wllTotal]').count()==0 and pg.locator('#rigProp [data-wl=wllPoint]').count()==1,'validée par un clic, perche par perche',ev("STAGE.S.rig.per[0]"))
    ev("document.querySelector('#modal').style.display='none'"); hide=pg.add_style_tag(content='#modal{display:none!important}')
    # ---- passe 2 : types créés à la volée, puis le parc avec les quantités de la fiche
    TY=[('PAR 64 CP62','lum','par',None,1,'halogene'),('ETC Source Four 750','lum','decoupe',8.1,1,'halogene'),('Juliat 613SX','lum','decoupe',None,1,'halogene'),('Juliat 306LPC','lum','pc',None,1,'halogene'),('ADB ACP 1001','lum','par',None,1,'halogene'),('PC 1 kW','lum','pc',None,1,'halogene'),('Barre ACL','lum','barre',None,1,'halogene'),
        ('Astera AX5','lum','par',2.8,9,'led'),('Martin ELP','lum','decoupe',None,7,'led'),('Clay Paky Mini-B','lum','lyre_wash',7.3,16,'led'),('Ayrton Arolla Profile MP','lum','lyre_spot',None,38,'led'),('Showtec Sunstrip T10','lum','barre',None,10,'halogene'),('Showtec Phantom 1220','lum','lyre_beam',None,18,'led'),
        ('Nexo GEO S8','son','line_array',None,None,None),('Nexo CD12','son','sub',None,None,None),('Nexo Alpha S2','son','sub',None,None,None),('Nexo PS8','son','enceinte',None,None,None),('Nexo PS10','son','enceinte',None,None,None),('Nexo PS15','son','enceinte',None,None,None),('Nexo LS18','son','sub',None,None,None)]
    ids={}
    for n,c,f,w,ch,src in TY:
        a={'nom':n,'categorie':c,'forme':f}
        if w is not None: a['poidsKg']=w
        if ch: a['canaux']=ch
        if ch and ch>1: a['sansDmx']=True
        if src: a['source']=src
        if n=='Nexo GEO S8': a['boites']=6
        r=T('creer_type',a); ids[n]=r.get('type')
    ok(all(ids.values()) and len(set(ids.values()))==20 and ev("STAGE.S.lib.filter(t=>t.user).length")==20,'vingt types créés à la volée (ceux de la fiche introuvables dans Titan)',list(ids.values())[:4])
    t=ev("STAGE.S.lib.find(t=>t.id==='u-etc-source-four-750')"); t2=ev("STAGE.S.lib.find(t=>t.id==='u-juliat-613sx')"); t3=ev("STAGE.S.lib.find(t=>t.id==='u-nexo-geo-s8')")
    ok(t['w']==8.1 and t['modes']==[['Gradateur',1]] and t['kind']=='prof' and t2['w']==0 and t2.get('noW')==True and t3['boxes']==6 and t3['cat']=='son','forme, canaux, poids : un poids inconnu reste inconnu',[t['w'],t2.get('noW'),t3['boxes']])
    Q={'PAR 64 CP62':36,'ETC Source Four 750':12,'Juliat 613SX':8,'Juliat 306LPC':20,'ADB ACP 1001':10,'PC 1 kW':16,'Barre ACL':4,'Astera AX5':24,'Martin ELP':8,'Clay Paky Mini-B':6,'Ayrton Arolla Profile MP':4,'Showtec Sunstrip T10':8,'Showtec Phantom 1220':8,'Nexo GEO S8':12,'Nexo CD12':4,'Nexo Alpha S2':2,'Nexo PS8':4,'Nexo PS10':6,'Nexo PS15':10,'Nexo LS18':2}
    L=[{'libelle':('2 x 6 Nexo GEO S8' if n=='Nexo GEO S8' else '%d x %s'%(q,n)),'quantite':q,'categorie':next(c for m,c,*_ in TY if m==n),'type':ids[n]} for n,q in Q.items()]
    L+=[{'libelle':'Shure SM58','quantite':8,'categorie':'micros'},{'libelle':'Praticables 2 x 1 m','quantite':20,'categorie':'plateau','type':'prat'},{'libelle':'Vidéoprojecteur 12 000 lm','quantite':1,'categorie':'vid','type':'vp12'},{'libelle':'Lampe inconnue','quantite':2,'categorie':'lum','type':'nexiste-pas'}]
    r=T('ecrire_parc',{'lignes':L}); ok(r['references']==24 and r['pieces']==sum(Q.values())+8+20+1+2 and r.get('typesInconnus')==['nexiste-pas'] and r['sansType']==2,'parc écrit, type inconnu signalé',r)
    P=T('lire_parc'); got={l['libelle']:l['quantite'] for l in P['lignes']}
    want={'36 x PAR 64 CP62':36,'24 x Astera AX5':24,'8 x Martin ELP':8,'6 x Clay Paky Mini-B':6,'4 x Ayrton Arolla Profile MP':4,'8 x Showtec Sunstrip T10':8,'8 x Showtec Phantom 1220':8,'2 x 6 Nexo GEO S8':12,'10 x Nexo PS15':10}
    ok(all(got.get(k)==v for k,v in want.items()),'RECETTE : quantités de la fiche (36 PAR 64, 24 AX5, 8 ELP, 6 Mini-B, 4 Arolla, 8 Sunstrip, 8 Phantom, 2x6 GEO S8, 10 PS15)',{k:got.get(k) for k in want})
    # ---- passe 3 : matériel fixe
    r=T('poser_materiel_fixe',{'elements':[{'genre':'rideau_fond','perche':7},{'genre':'pendrillons','perches':[2,4,6]},{'genre':'frise','perche':1,'largeurM':12,'hauteurM':1.2},{'genre':'cyclo','y':8.6,'largeurM':11,'hauteurM':6},
        {'genre':'appareil','type':ids['Nexo GEO S8'],'nom':'Façade jardin','x':-6,'y':-.5,'hauteurM':5.5},{'genre':'appareil','type':ids['Nexo GEO S8'],'nom':'Façade cour','x':6,'y':-.5,'hauteurM':5.5},{'genre':'appareil','type':'vp12','nom':'VP régie','x':0,'y':-20,'hauteurM':4},{'genre':'appareil','type':'inconnu'},
        {'genre':'gradateurs','modele':'ADB Eurodim','circuitsTotal':120,'parPerche':[{'perche':2,'circuits':24}]}]}); ev(tick)
    v=ev("APP.venue"); fx=ev("STAGE.S.objs.filter(o=>o.fix).map(o=>[o.type,o.name,o.pos.map(x=>+x.toFixed(2)),o.locked])")
    ok(len(r['poses'])==8 and len(r['refuses'])==1 and v['curt']==[6,1,3,5] and v['dimmers']=={'label':'ADB Eurodim','total':120} and v['pipes'][1]['c']==24 and len(fx)==5,'matériel fixe posé : rideaux, frise, cyclo, diffusion, VP, gradateurs',[r['poses'],r.get('refuses')])
    ok(ev("APP.planState().curtains.length")>=1 and fx[0][0]=='frise' and abs(fx[0][2][1]-5.3)<.01 and fx[1][2][2]==-8.6,'rideau de fond et pendrillons visibles, frise sous sa perche',fx[0])
    # ---- bibliothèque filtrée, compteur, alerte
    LL=ev("(()=>{const l=PARC.libList();return [l.types.length,l.other.length,l.types.find(q=>q.t.id==='u-nexo-geo-s8'),l.types.find(q=>q.t.id==='u-astera-ax5')]})()")
    ok(LL[0]==22 and LL[1]==2 and LL[2]['placed']==12 and LL[2]['qty']==12 and LL[3]['placed']==0,'onglet Salle : 2 grappes de 6 GEO S8 = 12 posés sur 12',[LL[0],LL[1],LL[2]['placed']])
    ev("AI.run('add_objects',{items:Array.from({length:6},(_,k)=>({type:'u-astera-ax5',perche:3,x:-5+k*2}))})"); ev("APP.toggleConsole(true);STAGE.UI.tab='lib';STAGE.UI.libCat='salle';STAGE.render()"); pg.wait_for_timeout(300)
    txt=pg.inner_text('body'); ok('6 posés sur 24' in txt and 'SM58' in txt,'compteur « Astera AX5 : 6 posés sur 24 »',[l for l in txt.split('\n') if 'AX5' in l or 'posés sur' in l][:6])
    ev("AI.run('add_objects',{items:Array.from({length:19},(_,k)=>({type:'u-astera-ax5',perche:4,x:-5+k*.5}))})"); pg.wait_for_function("document.querySelector('#toast').textContent.includes('Stock dépassé')",timeout=8000); ev("STAGE.render()")
    ok('25 Astera AX5' in pg.inner_text('#toast') and 'stock dépassé' in pg.inner_text('body'),'alerte quand on dépasse le stock',pg.inner_text('#toast'))
    pg.screenshot(path='/home/claude/shots/t59_biblio.png')
    # ---- fenêtre « Parc de la salle » : voir et modifier à la main
    ev("PARC.open(true)"); pg.wait_for_selector('#parcWin table'); n0=pg.locator('#parcWin tbody tr').count(); pg.screenshot(path='/home/claude/shots/t59_parc.png')
    pg.fill('#parcWin [data-pl="0"][data-f=qty]','40'); pg.dispatch_event('#parcWin [data-pl="0"][data-f=qty]','change'); pg.click('#parcWin [data-p=form]'); pg.fill('#ptNom','Robe Pointe'); pg.select_option('#ptForme','lyre_beam'); pg.fill('#ptW','15'); pg.fill('#ptCh','24'); pg.click('#parcWin [data-p=mk]'); pg.wait_for_selector('#dxTxt',state='attached'); ok('autre, autre' in pg.input_value('#dxTxt'),'type créé à la main : la description du DMX est demandée aussitôt'); ev("document.querySelector('#modal').style.display='none'")
    ok(n0==24 and ev("PARC.lines()[0].qty")==40 and ev("PARC.lines().length")==25 and ev("PARC.lines()[24].type")=='u-robe-pointe' and ev("STAGE.S.lib.find(t=>t.id==='u-robe-pointe').modes[0][1]")==24,'parc modifié à la main, type créé depuis la fenêtre',ev("PARC.lines()[24]"))
    pg.click('#parcWin [data-pd="24"]'); pg.fill('#parcWin [data-pl="0"][data-f=qty]','36'); pg.dispatch_event('#parcWin [data-pl="0"][data-f=qty]','change'); ev("PARC.open(false)")
    # ---- enregistré avec la salle : un nouveau projet la retrouve entière
    ev("PARC.sync()"); R=ev("(v=>{const r=PARC.REC[v];return [r.name,r.parc.length,r.fixed.length,r.types.length,r.salle.pipes.length,PARC.list().length]})",vid)
    ok(R[0]=="Salle communale d'Onex" and R[1]==24 and R[2]==5 and R[3]>=20 and R[4]==9 and R[5]==1,'fiche de la salle enregistrée (dimensions, perches, parc, types, matériel fixe)',R)
    ev("STAGE.loadShow(JSON.parse(%s));%s"%(json.dumps(a0),tick)); ok(ev("APP.venue.type")=='onex' and ev("PARC.lines().length")==0 and ev("STAGE.serialize()")==a0,'retour à Onex : son projet est intact, son parc est distinct')
    pg.evaluate("h=>h.remove()",hide); ev("WS.run&&0"); pg.keyboard.press('Control+n'); pg.wait_for_selector('#npRoom'); opts=ev("[...document.querySelectorAll('#npRoom option')].map(o=>o.textContent)")
    pg.select_option('#npRoom','v:'+vid); pg.fill('#npName','Concert de printemps'); pg.click('[data-a=wsNewOk]'); pg.wait_for_timeout(500); ev(tick)
    N=ev("[STAGE.S.name,APP.venue.vid,APP.venue.name,APP.PERCHES.filter(p=>!p.off).length,STAGE.S.objs.length,STAGE.S.objs.every(o=>o.fix),PARC.lines().length,PARC.libList().types.find(q=>q.t.id==='u-astera-ax5').placed,STAGE.S.lib.filter(t=>t.user).length,APP.venue.curt,APP.PERCHES[1].c,APP.PERCHES[0].wllP]")
    ok(any('Salle communale' in o for o in opts) and N==['Concert de printemps',vid,"Salle communale d'Onex",9,5,True,24,0,N[8],[6,1,3,5],24,250] and N[8]>=20,'nouveau projet dans la salle : perches, matériel fixe, parc et types retrouvés',N)
    ok(ev("(STAGE.S.rig.per[0]||{}).wllTotal")==None,'les charges restent à valider dans chaque projet')
    # ---- projets mis de côté ; aide
    ev("PARC.restoreDialog()"); pg.wait_for_selector('#modal [data-bk]'); nb=pg.locator('#modal [data-bk]').count(); pg.locator('#modal [data-bk]').last.click(); pg.wait_for_timeout(300)
    ok(nb>=2 and ev("STAGE.S.objs.length")==37 and ev("APP.venue.type")=='onex','projet mis de côté repris',nb)
    ev("document.querySelector('#menus [data-m=Aide]').click()"); pg.click('#menuPop [data-c=helpSalle]'); ok('trois passes' in pg.inner_text('#modal') and 'Seulement sur la version PC' in pg.inner_text('#modal'),'aide intégrée à jour')
    ok(len(ev("AI.MCPDEFS()"))==36 and not errs,'36 outils publiés au connecteur, aucune erreur',errs[:3]); b.close()
print('ÉCHECS :',bad or 'aucun')
