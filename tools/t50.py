import sys,json,time; sys.path.insert(0,'/home/claude/tools')
from h import *
def P(*a): print(*a, flush=True)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1300,800,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.WS && window.DESK && window.ENG && window.PLAN && window.RIG && window.AI",timeout=120000)
    pg.add_style_tag(content='#modal{display:none!important}'); ev("APP.renderer.setAnimationLoop(null)")
    ev("window.__e=[];window.addEventListener('error',e=>__e.push('ERR '+e.message))")
    def step(name, js):
        try: r=ev("(async()=>{try{return await (async()=>{%s})()}catch(e){return 'EXC '+e.message+' | '+(e.stack||'').split('\\n').slice(1,3).join(' ')}})()"%js)
        except Exception as e: r='PY '+str(e)[:200]
        e2=ev("window.__e.splice(0)") if not str(r).startswith('PY') else []
        P(('!! ' if (isinstance(r,str) and r.startswith(('EXC','PY'))) or e2 or errs else 'OK '),name,'->',json.dumps(r,ensure_ascii=False)[:330],e2,errs[:2]); errs.clear(); return r
    tick="for(let k=0;k<6;k++){for(const f of APP.hooks.update)f(1/30)}"
    step('onex départ',"return [APP.venue.type,APP.pickMeshes.length,APP.PERCHES.length,STAGE.S.objs.length]")
    a0=ev("STAGE.serialize()")
    step('nouvelle salle',"const r=AI.run('new_project',{name:'Salle des fêtes',room:{w:12,d:14,h:6,stageW:8,stageD:5,stageH:.8,perches:5,percheLen:8,percheY:4.5}});%s return [r.salle.type,APP.venue.w,document.body.classList.contains('ven-param'),APP.pickMeshes.length,APP.PERCHES.filter(p=>!p.off).map(p=>+p.z.toFixed(2)),APP.PERCHES[0].y,APP.roomState().curt,APP.venueBounds()]"%tick)
    step('sol',"return [APP.floorAt(0,2,-2,3),APP.floorAt(0,2,5,3),APP.floorAt(20,2,5,3)]")
    step('pose',"const r=AI.run('add_objects',{items:[{type:'wash',perche:2,x:-2},{type:'wash',perche:2,x:2},{type:'par-led',x:30,z:50},{type:'perso',x:0,z:-2}]});%s const o=STAGE.S.objs;return [r,o.map(q=>[q.type,+q.pos[0].toFixed(2),+STAGE.posOf(q).y.toFixed(2),+q.pos[2].toFixed(2)])]"%tick)
    step('plan+coupe',"PLAN.toggle(true);await new Promise(r=>setTimeout(r,400));PLAN.fit();PLAN.draw();PLAN.setView('coupe');PLAN.draw();const n=APP.sectionPoints().length/2;return [PLAN.P.view,n,APP.planState().perches.length]")
    pg.wait_for_timeout(300); pg.locator('#planWin').screenshot(path='/home/claude/shots/param_coupe.png'); ev("PLAN.setView('plan');PLAN.fit();PLAN.draw()"); pg.wait_for_timeout(300); pg.locator('#planWin').screenshot(path='/home/claude/shots/param_plan.png')
    step('charge',"RIG.open(0);const r=RIG.all().map(x=>Math.round(x.total));document.querySelector('#modal [data-a=close]')?.click();return [r.length,APP.percheLen()]")
    step('dimensions',"const r=AI.run('set_room_geometry',{w:20,perches:7});%s return [r.salle.w,APP.PERCHES.filter(p=>!p.off).length,STAGE.S.objs.filter(o=>o.hang==='perche').map(o=>o.pi)]"%tick)
    step('aller-retour',"const a=STAGE.serialize();STAGE.loadShow(JSON.parse(a));%s const b=STAGE.serialize();return [a===b,JSON.parse(a).salle.name,APP.venue.w]"%tick)
    step('undo → onex',"STAGE.undoTo(0);%s return [APP.venue.type,APP.pickMeshes.length,APP.PERCHES.map(p=>+p.z.toFixed(2)).slice(0,3),STAGE.S.objs.length,document.body.classList.contains('ven-param')]"%tick)
    step('onex intact',"STAGE.loadShow(JSON.parse(%s));%s return [STAGE.serialize()===%s, APP.floorAt(0,2,-2,3), APP.onexOk]"%(json.dumps(a0),tick,json.dumps(a0)))
    step('config onex',"APP.userConfig('danse');%s return [APP.config,STAGE.S.objs.length>5]"%tick)
    ev("PLAN.toggle(false);AI.run('new_project',{name:'Club',room:{w:10,d:12,h:5,stageW:6,stageD:4,stageH:.6,perches:4,percheLen:6,percheY:4}});AI.run('add_objects',{items:[{type:'beam',perche:2,x:-1.5,color:'#2affd0',dim:1},{type:'beam',perche:2,x:1.5,color:'#b04bff',dim:1},{type:'wash',perche:4,x:0,color:'#ff9a1f',dim:1},{type:'perso',x:0,z:-2}]});STAGE.setLive(true);for(let k=0;k<20;k++){for(const f of APP.hooks.update)f(1/30)}APP.renderer.render(APP.scene,APP.persp)")
    pg.screenshot(path='/home/claude/shots/param_3d.png'); b.close()
