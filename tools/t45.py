import sys,json,glob; sys.path.insert(0,'/home/claude/tools')
from h import *
with sync_playwright() as p:
    b,pg,errs=open_app(p,1000,600,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.WS && window.DESK && window.ENG && window.DMX",timeout=120000)
    ev("APP.renderer.setAnimationLoop(null)")
    for f in sorted(glob.glob('/mnt/user-data/uploads/*.d4')):
        txt=open(f,encoding='utf-8-sig').read()
        r=pg.evaluate("(t)=>{try{const ty=STAGE.parseD4(t,'x.d4');return {id:ty.id,name:ty.name,kind:ty.kind,mover:ty.mover,color:ty.color,zoom:ty.zoom,rng:ty.rng,sh:ty.sh,modes:ty.modes,chs:ty.chs.map(a=>a.map((k,i)=>k==='-'?'':(i+1)+k).filter(Boolean).join(' '))}}catch(e){return 'EXC '+e.message}}",txt)
        if isinstance(r,str): print(r); continue
        print('==',r['name'],r['kind'],'mover',r['mover'],r['color'],'zoom',r['zoom'],'rng',r['rng']); print('  sh',r['sh'])
        for m,c in zip(r['modes'],r['chs']): print('  ',m,'|',c)
    # import réel par fichier + pilotage DMX
    pg.evaluate("""async (t)=>{const f=new File([t],'Clay_Paky_MINI_B.d4');await STAGE.importFiles([f]);}""",open('/mnt/user-data/uploads/4d4b01e3-Clay_Paky_MINI_B.d4',encoding='utf-8-sig').read())
    r=ev("""(()=>{const S=STAGE.S;const t=S.lib.find(q=>q.id.startsWith('d4-'));if(!t)return 'type absent';STAGE.loadShow({name:'t',objs:[],cues:[],lib:S.lib,follow:false});const o=STAGE.defaults(t);o.n=1;o.pos=[0,6,-3];o.hang='fixe';o.uni=1;o.addr=1;o.mode=0;S.objs.push(o);STAGE.build(o);STAGE.touch();
      const u=new Uint8Array(512);u[0]=255;u[1]=0;u[2]=128;u[6]=255;u[7]=255;u[8]=255;u[9]=128;u[11]=64;u[13]=255;DMX.inject(1,u);DMX.force(true);
      const c=new APP.THREE.Color();const R=DMX.read(o,t,c);const a=R&&{dim:R.dim,pan:R.pan,tilt:R.tilt,zoom:R.zoom,col:c.getHexString()};
      u[6]=0;DMX.inject(1,u);const R2=DMX.read(o,t,c);return [a,R2&&R2.dim,STAGE.serialize().includes('"d4"')]})()""")
    print(r, errs[:3]); b.close()
