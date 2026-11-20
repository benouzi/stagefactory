# Recette sur la vraie fiche technique de la salle communale d'Onex (juin 2026) : l'import en trois passes, tel que Claude doit le faire,
# avec les valeurs lues dans la fiche. Fiche : FICHE=/chemin/fiche.pdf (sinon /tmp/fiche/f.pdf).
import sys,json,base64,os; sys.path.insert(0,'/home/claude/tools')
from h import *
FICHE=os.environ.get('FICHE','/tmp/fiche/f.pdf'); bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:330],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.PLAN && window.RIG && window.AI && window.VENUE && window.PARC && PARC.ready && window.WINS && window.VIEW3D",timeout=120000); ev("APP.renderer.setAnimationLoop(null)"); pg.add_style_tag(content='#modal{display:none!important}')
    T=lambda n,a={}: json.loads(ev("async(a)=>(await VENUE.tool(a[0],a[1])).content[0].text",[n,a]))
    tick="for(let k=0;k<8;k++){for(const f of APP.hooks.update)f(1/30)}"
    # ---- la fiche est déposée ; ce que l'IA peut y lire
    r=ev("""async(a)=>{const f=new File([Uint8Array.from(atob(a),c=>c.charCodeAt(0))],'fiche_tech_salle_communale.pdf');await VENUE.addFiles([f]);return VENUE.K.files.map(f=>[f.kind,f.pages])}""",base64.b64encode(open(FICHE,'rb').read()).decode())
    ok(r==[['pdf',15]],'fiche déposée : 15 pages',r)
    t5=T('lire_texte_pdf',{'fichier':'fiche_tech','page':5,'contient':'cadre'}); t8=T('lire_texte_pdf',{'fichier':'fiche_tech','page':8,'contient':'Astera'}); t9=T('lire_texte_pdf',{'fichier':'fiche_tech','page':9,'contient':'Perche'})
    ok(t5['textes']>=2 and t8['textes']==1,'textes lus : cadre de scène, parc lumière',[t5['liste'][:2],t8['liste']])
    print('    page 9 (circuits et charges par perche), textes « Perche » lus par le lecteur PDF :',t9['textes'],t9['liste'][:3])
    r=ev("async()=>{const r=await VENUE.tool('voir_document',{fichier:'fiche_tech',page:9,zone:{x0:.42,y0:.72,x1:.9,y1:.94}});window.__p9=r.content[0].source.data;return r.content[1].text}"); open('/home/claude/shots/t60_p9.jpg','wb').write(base64.b64decode(ev("window.__p9")))
    # ---- PASSE 1 : la salle et ses neuf perches motorisées (ponts)
    T('creer_salle',{'nom':'Salle communale d\'Onex','confirme':True})
    T('regler_salle',{'plateauLargeurM':10.8,'plateauProfondeurM':8.4,'cadreOuvertureM':9.57,'cadreHauteurM':3.64,'cadreReculM':1.6,'hauteurSceneM':1.2,'hauteurSalleM':6.5,'salleLargeurM':16,'salleProfondeurM':20})
    FACE=[(1,-5.80,8.7,5.1,'sol',10,250),(2,-1.80,8.7,5.1,'sol',8,250),(3,0.50,9.3,3.95,'plateau',6,125)]
    CONTRE=[(4,2.55,10,200),(5,4.10,6,200),(6,4.75,6,200),(7,5.40,10,200),(8,6.35,6,200),(9,7.15,10,200)]
    for n,y,L,h,ref,c,kg in FACE: r=T('poser_perche',{'nom':'Perche %d'%n,'y':y,'longueurM':L,'hauteurM':h,'reference':ref,'circuits':c,'chargeRepartieLueKg':kg,'structure':'pont','moteurs':2})
    for n,y,c,kg in CONTRE: r=T('poser_perche',{'nom':'Perche %d'%n,'y':y,'longueurM':9.3,'hauteurM':4.34,'circuits':c,'chargeRepartieLueKg':kg,'structure':'pont','moteurs':2})
    ev(tick); ps=ev("APP.PERCHES.filter(p=>!p.off).map(p=>[p.name,+(-p.z).toFixed(2),+p.y.toFixed(2),p.c,p.wllP,p.truss,p.mot])")
    ok(len(ps)==9 and ps[0]==['Perche 1',-5.8,3.9,10,250,True,2] and ps[2]==['Perche 3',0.5,3.95,6,125,True,2] and ps[8]==['Perche 9',7.15,4.34,10,200,True,2] and sum(q[3] for q in ps)==72,'9 perches : distances, hauteurs (5,10 m du sol = 3,90 m du plateau), circuits, charges lues',ps[0])
    ok(ev("APP.PERCHES[0].grp.children[0].geometry.attributes.position.count")>500 and ev("APP.PERCHES[0].motG.children.length")==4 and ev("APP.pickMeshes.filter(m=>m.userData.gid==='perches').length")==9,'les perches sont des ponts, avec leurs moteurs',ev("APP.PERCHES[0].mxs"))
    # ---- PASSE 2 : le parc. Types : gradateur 1 canal pour le traditionnel ; DMX décrit pour ce qui n'est pas dans Titan (ici, faute de Titan, mode d'essai)
    ids={}
    def mk(nom,cat,forme,**kw): ids[nom]=T('creer_type',dict(nom=nom,categorie=cat,forme=forme,**kw))['type']
    for nom,forme in [('PAR 64 1000 W','par'),('Juliat 306 LPC','pc'),('ADB PC 1000 W','pc'),('Juliat PC 1000 W','pc'),('ETC Source Four 750','decoupe'),('Juliat 614 SX','decoupe'),('Juliat 613 SX','decoupe'),('ADB ACP 1001','par'),('Barre ACL','barre')]: mk(nom,'lum',forme,canaux=1,source='halogene')
    mk('Astera AX5','lum','par',modesDmx=[{'nom':'essai RGBW','canaux':['dimmer','rouge','vert','bleu','blanc','strobe','autre','autre','autre']}])
    for nom,forme,n in [('Martin ELP RGBW Zoom','decoupe',7),('Clay Paky Mini-B','lyre_wash',16),('Clay Paky Arolla Profile MP','lyre_spot',38),('Showtec Sunstrip T10','barre',10),('Showtec Phantom 1220','lyre_beam',18)]: mk(nom,'lum',forme,canaux=n,source='led',sansDmx=True)   # ici seulement, faute de Titan : chez Benjamin ils viennent de Titan avec leurs vrais modes
    mk('Nexo GEO S8','son','line_array',boites=6); mk('Nexo CD12','son','sub'); mk('Nexo Alpha S2','son','sub'); mk('Nexo PS8','son','enceinte'); mk('Nexo PS15','son','retour'); mk('Nexo PS10','son','retour'); mk('Nexo LS18','son','sub')
    mk('Christie LWU501i','vid','videoprojecteur',lumens=5000,resolution=[1920,1200])
    lum=[(36,'PAR 64 1000 W','36x Projecteurs PAR 64 /1000 W'),(10,'Juliat 306 LPC','10x Juliat 306LPC avec volets'),(12,'ADB PC 1000 W','12x Projecteurs PC 1000W ADB avec volets'),(16,'Juliat PC 1000 W','16x Projecteur PC 1000W Juliat'),(6,'ETC Source Four 750','6x Découpes ETC (750) Source FOUR avec Iris'),(8,'Juliat 614 SX','8x Découpes RJ 614 SX avec IRIS'),(4,'Juliat 613 SX','4x Découpes RJ 613 SX avec IRIS'),(12,'ADB ACP 1001','12x Projecteurs ADB ACP 1001 (Horiziode ASS)'),(4,'Barre ACL','4x barre ACL'),
         (24,'Astera AX5','24x PAR LED Astera AX5 (3x15w)'),(8,'Martin ELP RGBW Zoom','8x Martin ELP RGBWZoom'),(6,'Clay Paky Mini-B','6x Clay Paky Mini-B RGBW'),(4,'Clay Paky Arolla Profile MP','4x Clay Paky AROLLA PROFILE MP'),(8,'Showtec Sunstrip T10','8x Showtec Sunstrip T10'),(8,'Showtec Phantom 1220','8x Showtec Phantom 1220')]
    son=[(12,'Nexo GEO S8','Line Array: 2x6 Nexo GEO S8'),(4,'Nexo CD12','Flown Subs : 2x2 Nexo CD12'),(2,'Nexo Alpha S2','Floor Subs : 2x Nexo Alpha S2'),(4,'Nexo PS8','Front Field: 4x Nexo PS8'),(10,'Nexo PS15','10x Nexo PS15'),(4,'Nexo PS10','4x Nexo PS10'),(1,'Nexo LS18','1x Nexo LS18')]
    L=[{'libelle':l,'quantite':q,'categorie':'lum','type':ids[n]} for q,n,l in lum]+[{'libelle':l,'quantite':q,'categorie':'son','type':ids[n]} for q,n,l in son]
    L+=[{'libelle':'Christie LWU501i - 5000 AL Full HD','quantite':1,'categorie':'vid','type':ids['Christie LWU501i']},{'libelle':'15 praticables 1m sur 2m','quantite':15,'categorie':'plateau','type':'prat'},{'libelle':'8 pendrillons de 2m x 4.30m','quantite':8,'categorie':'plateau','type':'rideau-n'},{'libelle':'2 frises','quantite':2,'categorie':'plateau','type':'frise'},
        {'libelle':'11x Shure SM58','quantite':11,'categorie':'micros'},{'libelle':'6x Shure SM57','quantite':6,'categorie':'micros'},{'libelle':'6x BSS AR 133','quantite':6,'categorie':'micros'},{'libelle':'6x Guitar stand Hercules','quantite':6,'categorie':'backline'},{'libelle':'2x Keyboard stand (+ 2 extensions)','quantite':2,'categorie':'backline'},{'libelle':'MDG ATMe','quantite':1,'categorie':'lum'},{'libelle':'Yamaha CL5','quantite':1,'categorie':'son'}]
    r=T('ecrire_parc',{'lignes':L}); P=T('lire_parc'); got={l['libelle']:l['quantite'] for l in P['lignes']}
    want={'36x Projecteurs PAR 64 /1000 W':36,'24x PAR LED Astera AX5 (3x15w)':24,'8x Martin ELP RGBWZoom':8,'6x Clay Paky Mini-B RGBW':6,'4x Clay Paky AROLLA PROFILE MP':4,'8x Showtec Sunstrip T10':8,'8x Showtec Phantom 1220':8,'Line Array: 2x6 Nexo GEO S8':12,'10x Nexo PS15':10}
    ok(all(got.get(k)==v for k,v in want.items()) and r['references']==len(L) and not r.get('typesInconnus'),'RECETTE : le parc porte les quantités de la fiche',{k.split(' ',1)[1][:14]:v for k,v in got.items() if k in want})
    lib=ev("STAGE.S.lib.filter(t=>t.user).map(t=>[t.name,t.modes?t.modes[0][1]:null,(t.chs||[[]])[0].join(','),!!t.noDmx])"); d=dict((x[0],x) for x in lib)
    ok(d['PAR 64 1000 W'][1:]==[1,'dim',False] and d['Astera AX5'][1:]==[9,'dim,r,g,b,w,strobe,-,-,-',False] and d['Clay Paky Mini-B'][1]==16 and d['Clay Paky Mini-B'][3]==True,'DMX : gradateur 1 canal ; ordre des canaux décrit = pilotable ; non décrit = signalé',[d['Astera AX5'][2],d['Clay Paky Mini-B'][3]])
    # ---- PASSE 3 : le matériel installé à demeure
    r=T('poser_materiel_fixe',{'elements':[{'genre':'rideau_fond','perche':9},{'genre':'pendrillons','perches':[4,6,8]},{'genre':'frise','perche':5,'largeurM':11,'hauteurM':1},{'genre':'frise','perche':8,'largeurM':11,'hauteurM':1},{'genre':'cyclo','y':7.8,'largeurM':10,'hauteurM':4,'nom':'Cyclo PVC 10 × 4 m sur rouleau'},
        {'genre':'appareil','type':ids['Nexo GEO S8'],'nom':'Line array jardin (6 GEO S8)','x':-5.6,'y':-.3,'hauteurM':4.2,'pan':0,'tilt':95},{'genre':'appareil','type':ids['Nexo GEO S8'],'nom':'Line array cour (6 GEO S8)','x':5.6,'y':-.3,'hauteurM':4.2,'pan':0,'tilt':95},
        {'genre':'appareil','type':ids['Nexo CD12'],'nom':'Subs accrochés jardin (2 CD12)','x':-4.9,'y':-.3,'hauteurM':4.4,'quantite':2},{'genre':'appareil','type':ids['Nexo CD12'],'nom':'Subs accrochés cour (2 CD12)','x':4.9,'y':-.3,'hauteurM':4.4,'quantite':2},
        {'genre':'appareil','type':ids['Nexo Alpha S2'],'nom':'Sub Alpha S2 jardin','x':-5.8,'y':.3},{'genre':'appareil','type':ids['Nexo Alpha S2'],'nom':'Sub Alpha S2 cour','x':5.8,'y':.3}]+[{'genre':'appareil','type':ids['Nexo PS8'],'nom':'Front fill %d'%(k+1),'x':x,'y':.1,'hauteurM':0,'pan':0,'tilt':80} for k,x in enumerate([-3.6,-1.2,1.2,3.6])]+
        [{'genre':'appareil','type':ids['Christie LWU501i'],'nom':'Christie LWU501i','perche':2,'x':0},{'genre':'gradateurs','modele':'5 blocs MA Lighting digital 12 x 2,3 kW (socapex)','circuitsTotal':60}]}); ev(tick)
    ok(len(r['poses'])==17 and not r.get('refuses') and ev("APP.venue.curt")==[8,3,5,7] and ev("APP.venue.dimmers.total")==60,'matériel fixe : rideau de fond, pendrillons, 2 frises, cyclo, diffusion, vidéoprojecteur, gradateurs',r.get('refuses') or len(r['poses']))
    st=ev("(()=>{const l=PARC.libList().types;const g=n=>{const q=l.find(q=>q.t.name===n);return [q.placed,q.qty]};return [g('Nexo GEO S8'),g('Nexo CD12'),g('Nexo Alpha S2'),g('Nexo PS8'),g('Astera AX5')]})()")
    ok(st==[[12,12],[4,4],[2,2],[4,4],[0,24]],'stock : la diffusion fixe est décomptée du parc',st)
    # ---- recouvrement sonore
    c=T('couverture_son',{'afficher':True}); ok(c.get('affichee') and c['niveauMaxDb']>90 and 'niveauxSupposes' in c and ev("STAGE.UI.spl")==True,'carte de recouvrement sonore affichée ; niveaux signalés comme supposés tant que le fabricant n\'est pas renseigné',c)
    ev("APP.toggleSide(true);VIEW3D.goView('persp');APP.persp.position.set(13,13,24);APP.orbit.target.set(0,1,4);APP.orbit.update();"+tick+"APP.renderer.render(APP.scene,APP.persp)"); pg.wait_for_timeout(400); pg.screenshot(path='/home/claude/shots/t60_son.png'); T('couverture_son',{'afficher':False})
    # ---- un plan de feu avec le matériel de la salle, patché, sans dépasser le stock
    r=ev("AI.run('add_objects',{items:[...Array.from({length:8},(_,k)=>({type:arg.par,perche:4,x:-3.5+k,group:'Contres',color:'#2a4dff',dim:.8})),...Array.from({length:6},(_,k)=>({type:arg.ax5,perche:7,x:-3.75+k*1.5,group:'AX5',color:'#ff9a1f',dim:1})),...Array.from({length:6},(_,k)=>({type:arg.s4,perche:2,x:-3.75+k*1.5,group:'Face',dim:.9}))]})".replace('arg.par',json.dumps(ids['PAR 64 1000 W'])).replace('arg.ax5',json.dumps(ids['Astera AX5'])).replace('arg.s4',json.dumps(ids['ETC Source Four 750'])))
    ok(r['ajoutés']==20 and any('8 posé(s) sur 36' in s for s in r['stock']) and any('6 posé(s) sur 6' in s for s in r['stock']),'plan de feu posé : le stock restant est rendu à chaque pose',r['stock'])
    r=ev("AI.run('patch_objects',{select:{group:'AX5'},universe:1,start:101})"); pa=ev("STAGE.S.objs.filter(o=>o.grp==='AX5').map(o=>o.addr)"); ok(pa==[101,110,119,128,137,146],'patch : 9 canaux par Astera AX5',pa)
    ev("RIG.changed()"); R=ev("RIG.all().slice(0,9).map(r=>[r.truss,r.supX.length,Math.round(r.pay),+r.util.toFixed(2),r.warn.length])"); ok(all(x[0] and x[1]==2 for x in R) and R[3][2]>0,'plan de charge : ponts sur leurs moteurs',R[3])
    ev("STAGE.setLive(true);PLAN.toggle(true)"); pg.wait_for_timeout(500); ev("PLAN.fit();PLAN.draw();"+tick+"APP.persp.position.set(11,8,17);APP.orbit.target.set(0,2,-2);APP.orbit.update();APP.renderer.render(APP.scene,APP.persp)"); pg.wait_for_timeout(400); pg.screenshot(path='/home/claude/shots/t60_salle.png')
    T('noter_faits',{'nomSalle':'Salle communale d\'Onex','faits':[{'sujet':'Cadre de scène','valeur':'9,57 × 3,64 m','source':'fiche p. 5 et 9','confiance':'lu'},{'sujet':'Perche 1','valeur':'10 circuits, 250 kg, à 5,80 m du nez de scène','source':'fiche p. 9','confiance':'lu'},{'sujet':'Largeur et profondeur de la salle','valeur':'16 × 20 m','source':'aucun document','confiance':'supposé'},{'sujet':'Moteurs par perche','valeur':'2','source':'dessin p. 9, peu lisible','confiance':'supposé'}],'questions':['Combien de moteurs par perche, et quelle charge par moteur ?','Quelles sont les dimensions de la salle et du gradin ?']})
    ok(not errs,'aucune erreur',errs[:3]); b.close()
print('ÉCHECS :',bad or 'aucun')
