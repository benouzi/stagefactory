# Création de salle depuis des plans : modèle de salle étendu, lecture DXF / DWG / PDF / image, calage, murs, perches une à une, outils du créateur.
import sys,json,time,base64,os; sys.path.insert(0,'/home/claude/tools')
from h import *
SAMP='/home/claude/src/sceno/ScenoFactory-0.45.0-sources/app/test/'
def P(*a): print(*a, flush=True)
def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
with sync_playwright() as p:
    b,pg,errs=open_app(p,1300,800,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.WS && window.DESK && window.ENG && window.PLAN && window.RIG && window.AI && window.VENUE",timeout=120000)
    pg.add_style_tag(content='#modal{display:none!important}'); ev("APP.renderer.setAnimationLoop(null)")
    ev("window.__e=[];window.addEventListener('error',e=>__e.push('ERR '+e.message));window.addEventListener('unhandledrejection',e=>__e.push('REJ '+(e.reason&&e.reason.message||e.reason)))")
    bad=[]
    def step(name, js, arg=None):
        try: r=ev("(async(arg)=>{try{return await (async()=>{%s})()}catch(e){return 'EXC '+e.message+' | '+(e.stack||'').split('\\n').slice(1,3).join(' ')}})"%js, arg)
        except Exception as e: r='PY '+str(e)[:300]
        e2=ev("window.__e.splice(0)") if not str(r).startswith('PY') else []
        ko=(isinstance(r,str) and r.startswith(('EXC','PY'))) or e2 or errs
        if ko: bad.append(name)
        P(('!! ' if ko else 'OK '),name,'->',json.dumps(r,ensure_ascii=False)[:420],e2,errs[:2]); errs.clear(); return r
    tick="for(let k=0;k<6;k++){for(const f of APP.hooks.update)f(1/30)}"
    FILE="const mk=(n,b)=>new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],n);"
    a0=ev("STAGE.serialize()")
    # ---- modèle de salle étendu
    step('salle riche',"const r=AI.run('new_project',{name:'Théâtre',room:{w:20,d:24,h:11,stageW:18,stageD:12,stageH:1.1,prosW:12,prosH:7,cageH:18,gridH:17,rows:14,rowD:.9,rowH:.14,rowHLast:.3,rowStart:4,pitD:3,pitY:-2.4,galHs:[8,12],backGalH:8}});%s const v=APP.venue,B=APP.venueBounds();return [v.prosW,v.rows,v.cageH,B,APP.pickMeshes.filter(m=>m.userData.gid==='gradin').length,APP.pickMeshes.filter(m=>m.userData.gid==='passerelle').length,APP.pickMeshes.some(m=>m.userData.gid==='gril')]"%tick)
    step('sols',"return [APP.floorAt(0,2,-3,3),APP.floorAt(0,0,1.5,1),APP.floorAt(8,0,1.5,1),APP.floorAt(0,3,10,3),APP.floorAt(0,6,16,6)].map(x=>x===null?null:+x.toFixed(2))")
    step('perches une à une',"await VENUE.tool('poser_perches',{prefixe:'Perche',premierNumero:1,nombre:30,yPremiereM:.4,pasM:.2,longueurM:16,hauteurM:9});await VENUE.tool('poser_perche',{nom:'Face 1',y:-4,longueurM:10,hauteurM:8.5});%s const ps=APP.PERCHES.filter(p=>!p.off);return [ps.length,APP.venue.pipes.length,ps[0].name,+ps[0].z.toFixed(2),+ps[29].z.toFixed(2),ps[30].name,ps[30].z,ps[30].len,APP.percheLen(30),APP.percheLen(0),ps[0].y,document.querySelectorAll('#perchesUI .row').length]"%tick)
    step('accroche + charge',"const r=AI.run('add_objects',{items:[{type:'wash',perche:31,x:-9},{type:'wash',perche:31,x:2},{type:'wash',perche:5,x:0}]});%s const o=STAGE.S.objs;RIG.changed();const R=RIG.all();return [r,o.map(q=>[q.pi,+q.pos[0].toFixed(2),+STAGE.posOf(q).y.toFixed(2),+q.pos[2].toFixed(2)]),R.length,Math.round(R[30].total),Math.round(R[4].total),R[30].warn.length]"%tick)
    step('plan+coupe',"PLAN.toggle(true);await new Promise(r=>setTimeout(r,400));PLAN.fit();PLAN.draw();PLAN.setView('coupe');PLAN.draw();const n=APP.sectionPoints().length/2;PLAN.setView('plan');PLAN.fit();PLAN.draw();return [n,APP.planState().perches.length,APP.planState().perches[30]]")
    pg.wait_for_timeout(300); pg.locator('#planWin').screenshot(path='/home/claude/shots/t52_plan_riche.png'); ev("PLAN.setView('coupe');PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300); pg.locator('#planWin').screenshot(path='/home/claude/shots/t52_coupe_riche.png'); ev("PLAN.setView('plan')")
    step('aller-retour',"const a=STAGE.serialize();STAGE.loadShow(JSON.parse(a));%s const b=STAGE.serialize();return [a===b,JSON.parse(a).salle.pipes.length,APP.PERCHES.filter(p=>!p.off).length]"%tick)
    step('retirer perches vides',"const r=await VENUE.tool('retirer_perches',{});%s return [JSON.parse(r.content[0].text),APP.venue.pipes.map(q=>q.n),STAGE.S.objs.map(o=>o.pi)]"%tick)
    # ---- DXF : lecture, pose, calage, murs
    step('dxf lu',FILE+"const f=await VENUE.readFile(mk('salle.dxf',arg));VENUE.K.files=[f];return [f.kind,f.note,f.cad.w,f.cad.h,f.cad.mm,f.cad.calibrated,f.cad.vector.layers]",b64(SAMP+'samples/salle.dxf'))
    step('dxf vu par l\'IA',"const r=await VENUE.tool('voir_document',{fichier:'salle.dxf'});window.__dg=r.content[0].source.data;return [r.content[0].type,r.content[0].source.data.length>5000,r.content[1].text.slice(0,600)]")
    open('/home/claude/shots/t52_digest.jpg','wb').write(base64.b64decode(ev("window.__dg")))
    lay=ev("VENUE.K.files[0].cad.vector.layers")
    step('dxf calé (outil)',"const f=VENUE.K.files[0].cad,W=f.w*f.mm/1000,H=f.h*f.mm/1000;const r=await VENUE.tool('caler_plan_cao',{fichier:'salle.dxf',nezDeScene:{x:W/2,y:H*.6},directionLointainDeg:90,calquesMurs:arg.slice(0,2),hauteurMursM:7});%s const v=APP.venue;return [JSON.parse(r.content[0].text),v.plan.walls,v.shell,v.w,v.d,v.stageD,APP.pickMeshes.filter(m=>m.userData.planWalls).map(m=>m.userData.planWalls),APP.PLANS.size]"%tick,lay)
    step('plan 2D + 3D',"PLAN.fit();PLAN.draw();APP.renderer.render(APP.scene,APP.persp);let sheets=0;APP.scene.traverse(o=>{if(o.userData.planSheet)sheets++});return [sheets,APP.venue.plan.show3d,APP.planBounds(APP.venue.plan)]")
    pg.wait_for_timeout(300); pg.locator('#planWin').screenshot(path='/home/claude/shots/t52_plan_dxf.png')
    step('calage à la main',"const pl0={...APP.venue.plan};VENUE.calib(true);await new Promise(r=>setTimeout(r,200));const pk=(x,z)=>PLAN.P.picker.cb(x,z);document.querySelector('#calibBar [data-c=scale]').click();pk(0,0);pk(2,0);document.querySelector('#calD').value='4';document.querySelector('#calibBar [data-c=okd]').click();const k1=APP.venue.plan.k/pl0.k;document.querySelector('#calibBar [data-c=zero]').click();pk(1,1);const T=APP.planXf(APP.venue.plan),T0=APP.planXf({...pl0,k:pl0.k*2});const inv0=T0.inv(1,1);const z=[+T.x(inv0[0],inv0[1]).toFixed(6),+T.z(inv0[0],inv0[1]).toFixed(6)];document.querySelector('#calibBar [data-c=r90]').click();const rot=APP.venue.plan.rot-pl0.rot;document.querySelector('#calibBar [data-c=done]').click();return [k1,z,+rot.toFixed(4),APP.venue.plan.calibrated,document.querySelector('#calibBar').style.display]")
    step('undo regroupé',"const n=STAGE.hist().undo.length;STAGE.undo();STAGE.undo();STAGE.undo();%s return [n,APP.venue.plan.rot,APP.venue.plan.k]"%tick)
    # ---- export / réouverture avec le plan
    step('projet exporté avec son plan',"const d=JSON.parse(STAGE.serialize());d.planData=VENUE.planData();const t=JSON.stringify(d);const id=APP.venue.plan.id;APP.PLANS.clear();STAGE.loadShow(JSON.parse(%s));STAGE.loadShow(JSON.parse(t));%s return [t.length,APP.venue.plan.id===id,APP.PLANS.has(id),APP.pickMeshes.filter(m=>m.userData.planWalls).length]"%(json.dumps(a0),tick))
    # ---- PDF
    step('pdf lu',FILE+"const f=await VENUE.readFile(mk('salle.pdf',arg));VENUE.K.files.push(f);return [f.kind,f.note,f.pages]",b64(SAMP+'salle.pdf'))
    step('pdf vu',"const r=await VENUE.tool('voir_document',{fichier:'salle.pdf',zone:{x0:0,y0:0,x1:.5,y1:.5}});window.__pg=r.content[0].source.data;return [r.content[0].source.data.length>3000,r.content[1].text]")
    open('/home/claude/shots/t52_pdf.jpg','wb').write(base64.b64decode(ev("window.__pg")))
    step('pdf texte',"const r=await VENUE.tool('lire_texte_pdf',{fichier:'salle.pdf'});const j=JSON.parse(r.content[0].text);return [j.papierMm,j.textes,j.liste.slice(0,6)]")
    step('pdf calé',"const r=await VENUE.tool('caler_plan',{fichier:'salle.pdf',largeurReelleM:30,axeX:.5,zeroY:.6});await new Promise(r=>setTimeout(r,500));%s const pl=APP.venue.plan,D=APP.PLANS.get(pl.id);APP.renderer.render(APP.scene,APP.persp);let sheets=0;APP.scene.traverse(o=>{if(o.userData.planSheet)sheets++});return [JSON.parse(r.content[0].text),pl.kind,+(pl.k*pl.w).toFixed(3),!!D.img,sheets]"%tick)
    ev("PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300); pg.locator('#planWin').screenshot(path='/home/claude/shots/t52_plan_pdf.png')
    step('régler la salle',"const r=await VENUE.tool('regler_salle',{nomSalle:'Grande salle',plateauLargeurM:16,plateauProfondeurM:10,cadreOuvertureM:11,cadreHauteurM:7,hauteurCageM:16,hauteurSalleM:10,hauteurSceneM:1,salleLargeurM:18,salleProfondeurM:20,gradinDebutM:3,gradinRangs:12,gradinProfondeurRangM:.9,gradinHauteurRangM:.15,hauteurGrilM:15,passerellesLateralesHauteursM:[7,11],fosseProfondeurM:2.5,fosseNiveauM:-2});%s const v=APP.venue;return [v.name,v.w,v.stageW,v.prosW,v.rows,v.cageH,v.galHs,v.pitY,!!v.plan]"%tick)
    step('faits',"const r=await VENUE.tool('noter_faits',{nomSalle:'Grande salle',faits:[{sujet:'Ouverture du cadre',valeur:'11,00 m',source:'salle.pdf p.1, cote',confiance:'lu'},{sujet:'Hauteur du gril',valeur:'15 m',source:'valeur d\\'usage',confiance:'supposé'}],questions:['Quelle est la charge admissible des perches ?']});return [JSON.parse(r.content[0].text),APP.venue.facts.length,APP.venue.questions,JSON.parse((await VENUE.tool('lire_salle',{})).content[0].text).plan.fichier]")
    step('connecteur',"const T=AI.MCPDEFS().map(t=>t.name);const r=await VENUE.mcpRun('voir_document',{fichier:'salle.pdf'});return [T.length,T.filter(n=>VENUE.isTool(n)),r.__mcp,r.images.length,r.text.slice(0,60)]")
    # ---- image
    step('image',FILE+"const f=await VENUE.readFile(mk('plan.webp',arg));VENUE.K.files.push(f);const p=await VENUE.planFromFile(f);return [f.kind,f.note,p.light.kind,p.light.w,p.heavy.url.slice(0,22)]",b64(SAMP+'samples/plan.webp'))
    # ---- DWG
    for n in ['example_2000.dwg','example_2018.dwg','example_r14.dwg']:
        step('dwg '+n,FILE+"const t=performance.now();const f=await VENUE.readFile(mk(arg[0],arg[1]));return [f.kind,f.note,f.cad&&[Math.round(f.cad.w),Math.round(f.cad.h),f.cad.mm,f.cad.vector.layers.length],Math.round(performance.now()-t)+' ms']",[n,b64(SAMP+'samples/'+n)])
    step('dxf r12',FILE+"const f=await VENUE.readFile(mk('example_r12.dxf',arg));return [f.kind,f.note]",b64(SAMP+'samples/example_r12.dxf'))
    # ---- fenêtre
    step('fenêtre',"VENUE.open(true);await new Promise(r=>setTimeout(r,300));const w=document.querySelector('#venueWin');const t=w.innerText;VENUE.open(false);return [w.querySelectorAll('.fl li').length,/Construire avec l.IA/.test(t),VENUE.aiMode(),t.slice(0,80)]")
    ev("VENUE.open(true)"); pg.wait_for_timeout(300); pg.screenshot(path='/home/claude/shots/t52_fenetre.png'); ev("VENUE.open(false)")
    # ---- retour à Onex, intact
    step('onex intact',"STAGE.loadShow(JSON.parse(%s));%s return [STAGE.serialize()===%s,APP.venue.type,APP.PERCHES.filter(p=>!p.off).length,APP.PERCHES.length,APP.pickMeshes.length]"%(json.dumps(a0),tick,json.dumps(a0)))
    ev("PLAN.toggle(false);AI.run('new_project',{name:'Théâtre',room:{w:20,d:24,h:11,stageW:18,stageD:12,stageH:1.1,prosW:12,prosH:7,cageH:16,rows:14,rowD:.9,rowH:.14,rowHLast:.3,rowStart:4,pitD:3,pitY:-2.4,galHs:[8,12]}});AI.run('add_objects',{items:[{type:'wash',perche:3,x:-3,color:'#2affd0',dim:1},{type:'wash',perche:3,x:3,color:'#ff9a1f',dim:1},{type:'perso',x:0,z:-3}]});for(let k=0;k<20;k++){for(const f of APP.hooks.update)f(1/30)}APP.persp.position.set(16,20,34);APP.orbit.target.set(0,3,2);APP.orbit.update();APP.renderer.render(APP.scene,APP.persp)")
    pg.screenshot(path='/home/claude/shots/t52_3d.png')
    P('ÉCHECS :',bad or 'aucun'); b.close()
