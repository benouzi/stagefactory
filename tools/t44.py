import sys,json,time; sys.path.insert(0,'/home/claude/tools')
from h import *
def P(*a): print(*a, flush=True)
with sync_playwright() as p:
    b,pg,errs=open_app(p,960,540,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.WS && window.DESK && window.ENG && window.CINE",timeout=120000)
    ev("document.querySelector('#modal').style.display='none'")
    ev("APP.renderer.setAnimationLoop(null)")
    before=ev("STAGE.serialize().length")
    t=time.time(); r=ev("(async()=>{try{const b=await CINE.makeMusic();let pk=0;const d=b.getChannelData(0);for(let i=0;i<d.length;i+=7)pk=Math.max(pk,Math.abs(d[i]));return [b.duration,pk]}catch(e){return 'EXC '+e.message}})()"); P('musique',r,round(time.time()-t,1),'s')
    t=time.time(); r=ev("(async()=>{try{await CINE.start();return [CINE.C.on,CINE.C.crowd.pts.length,STAGE.S.objs.length,STAGE.S.cues.length,document.body.classList.contains('cine'),APP.canvas.clientWidth]}catch(e){return 'EXC '+e.message+(e.stack||'').split('\\n').slice(0,3).join('|')}})()"); P('start',r,round(time.time()-t,1),'s',errs[:3])
    ev("window.FR=(bar,n=40)=>{const C=CINE.C;const BAR=60/126*4;for(let k=n;k>=0;k--){C.p0=performance.now()/1000-(bar*BAR-k/30);for(const f of APP.hooks.update)f(1/30);}APP.renderer.render(APP.scene,APP.persp);return [CINE.C.sec,STAGE.UI.cue,STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='lum'&&o.dim>.05).length]}")
    for bar in [15.5]:
        t=time.time(); r=ev("FR(%s)"%bar); pg.screenshot(path='/home/claude/shots/cine_%s.png'%str(bar).replace('.','_')); P('bar',bar,r,round(time.time()-t,1),'s',errs[:2]); errs.clear()
    r=ev("(()=>{CINE.stop();return [CINE.C.on,document.body.classList.contains('cine'),STAGE.serialize().length,APP.orbit.enabled,!!STAGE.FXHOOK.mod,APP.live]})()"); P('stop',r,'avant',before,errs[:3])
    b.close()
