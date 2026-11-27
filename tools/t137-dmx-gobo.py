import sys,os; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_BLANK']='1'
from h import *
with sync_playwright() as p:
    b,pg,errs=open_app(p,1200,800); ev=pg.evaluate; pg.wait_for_function("window.DMX",timeout=60000); pg.wait_for_timeout(800)
    print(ev("Object.keys(window.DMX)"))
    r=ev("""(()=>{STAGE.place('spot',{point:new APP.THREE.Vector3(0,0,0),object:{userData:{}}});const o=STAGE.S.objs.at(-1),t=STAGE.typeOf(o);o.uni=1;o.addr=1;o.mode=0;const lay=DMX.layout(t,0);const buf=new Uint8Array(512);const set=(n,v)=>{buf[lay.indexOf(n)]=v};
      set('dim',255);set('gobo',Math.floor(256*3/12)+2);set('gobor',64);set('iris',255);set('b1',128);set('b1r',255);set('b3r',1);
      const IN=DMX.IN||DMX.in||null;const U=(IN&&IN.universes)||DMX.universes||DMX.U;U.set(1,buf);const rd=(IN&&IN.read)||DMX.read;const out=rd(o,t,new APP.THREE.Color());return {lay:lay.slice(5),out:{gobo:out.gobo,gobor:Math.round(out.gobor),gobos:out.gobos,iris:+out.iris.toFixed(3),b1:+out.b1.toFixed(3),b1r:Math.round(out.b1r),b3r:Math.round(out.b3r),b2:out.b2}}})()""")
    print(r)
    r2=ev("""(()=>{const o=STAGE.S.objs.at(-1),t=STAGE.typeOf(o),lay=DMX.layout(t,0),IN=DMX.IN||DMX.in||null,U=(IN&&IN.universes)||DMX.universes||DMX.U,buf=U.get(1),rd=(IN&&IN.read)||DMX.read;const g=v=>{buf[lay.indexOf('gobor')]=v;const out=rd(o,t,new APP.THREE.Color());return [Math.round(out.gobor),+out.gobos.toFixed(2)]};return [g(0),g(127),g(128),g(190),g(191),g(193),g(255)]})()""")
    print(r2, errs[:2]); b.close()
