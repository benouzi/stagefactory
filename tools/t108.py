# vidéo : projecteurs réels du catalogue, optiques interchangeables, zoom et décalage limités à l'optique montée
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:600],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.VIDEO",timeout=60000); pg.wait_for_timeout(1500)
    T=ev("['c-barco-udx-4k32','c-panasonic-pt-rz21k','c-christie-m-4k25-rgb'].map(id=>{const t=STAGE.LIBALL().find(x=>x.id===id);return t&&{name:t.name,brand:t.brand,lm:t.lumens,res:t.res,n:t.lenses.length,w:t.w,p:t.p,src:t.src,noThrow:!!t.noThrow,cat:t.cat}})")
    ok(all(T) and [t['n'] for t in T]==[9,11,11] and [t['lm'] for t in T]==[29000,20000,22500] and [t['w'] for t in T]==[92,49,41.7] and not any(t['noThrow'] for t in T) and all(t['src'].startswith('https://') for t in T),'trois projecteurs réels au catalogue (Barco UDX-4K32, Panasonic PT-RZ21K, Christie M 4K25 RGB) avec flux, poids, source et optiques',[(t['brand'],t['name'],t['n']) for t in T if t])
    sid,vid=ev("""(()=>{const T=APP.THREE,at=(x,y,z)=>({point:new T.Vector3(x,y,z),object:{userData:{}},face:null});
      const s=STAGE.place('ecran',at(0,0,-3),true,{}); s.pos=[0,1,-3]; const v=STAGE.place('c-barco-udx-4k32',at(0,0,9),true,{}); v.pos=[0,1.5,9]; v.hang=null;
      for(const o of [s,v]){STAGE.unbuild(o.id);STAGE.build(o)} STAGE.setLive(true); STAGE.touch(); STAGE.tick(0); STAGE.select([v.id]); return [s.id,v.id]})()""")
    pg.wait_for_timeout(500)
    G="(id)=>{STAGE.tick(0);const o=STAGE.byId(id),t=STAGE.typeOf(o),g=STAGE.RT.get(id).geom,r=v=>+v.toFixed(3);return {lens:o.lens,th:o.throw,gth:g.th,lsh:o.lsh||0,lsv:o.lsv||0,olsv:g.op.lsv,olsh:g.op.lsh,W:r(g.W),D:r(g.D),TR:STAGE.vpThrow(o,t),SH:STAGE.vpShift(o,t),ctr:g.ctr.toArray().map(r),lux:Math.round(g.lux)}}"
    g=ev(G,vid); ok(g['lens']=='R9862005' and g['TR']==[1.25,1.6] and 1.25<=g['th']<=1.6 and g['SH']['v']==[-50,65] and g['SH']['h']==[-20,20],'Barco posé : optique TLD+ 1,25–1,6 montée, zoom borné à 1,25–1,6, décalage V -50…+65 % et H ±20 % (la demi-image de la fiche ramenée à l\'image entière)',[g['lens'],g['th'],g['SH']])
    ev("STAGE.UI.tab='prop';STAGE.render()"); pg.wait_for_timeout(300)
    F="()=>{const q=s=>document.querySelector('#console '+s);return {lens:q('[data-k=lens]')?[...q('[data-k=lens]').options].map(o=>o.textContent):null,th:q('[data-k=throw]')?[+q('[data-k=throw]').min,+q('[data-k=throw]').max]:null,lsv:q('[data-k=lsv]')?[+q('[data-k=lsv]').min,+q('[data-k=lsv]').max]:null,lsh:q('[data-k=lsh]')?[+q('[data-k=lsh]').min,+q('[data-k=lsh]').max]:null,txt:(q('')||document.querySelector('#console')).innerText.replace(/\\n/g,' ')}}"
    f=ev(F); ok(f['lens'] and len(f['lens'])==9 and f['th']==[1.25,1.6] and f['lsv']==[-50,65] and f['lsh']==[-20,20] and 'Optique TLD+ 1,25–1,6:1' in f['txt'],'la fiche propose les 9 optiques, et ses curseurs s\'arrêtent aux limites de l\'optique',[f['th'],f['lsv'],f['lsh']])
    pg.select_option('#console [data-k=lens]','R9862020'); pg.wait_for_timeout(600); g2=ev(G,vid); f2=ev(F)
    ok(g2['lens']=='R9862020' and g2['th']==2.02 and f2['th']==[2.02,2.73] and abs(g2['W']-g2['D']/2.02)<.02 and g2['W']<g['W'],'changer d\'optique dans la fiche (TLD+ 2,0–2,8) : le rapport passe dans sa plage, l\'image rétrécit',[g2['th'],g2['W'],g['W']])
    ev("(id)=>{const o=STAGE.byId(id);o.lsv=90;o.lsh=-40;STAGE.touch()}",vid); g3=ev(G,vid); ok(g3['olsv']==65 and g3['olsh']==-20,'un décalage demandé au-delà de la plage est ramené à la limite de l\'optique',[g3['olsv'],g3['olsh']])
    ev("(id)=>{const o=STAGE.byId(id);o.lsv=0;o.lsh=0;o.hang='fixe';STAGE.touch()}",vid); g4=ev(G,vid); ok(g4['SH']['v']==[-65,50] and g4['SH'].get('hung'),'projecteur suspendu (tête en bas) : la plage verticale se retourne',g4['SH'])
    # viser en décalant l'optique : dans la plage / hors plage
    ev("(id)=>{const o=STAGE.byId(id);o.hang=null;o.lens='R9862005';o.pos=[.5,2,5];STAGE.select([]);STAGE.unbuild(id);STAGE.build(o);STAGE.touch();STAGE.tick(0);STAGE.select([id]);VIDEO.aim(o,STAGE.byId('%s'),'shift')}"%sid,vid); pg.wait_for_timeout(300); g5=ev(G,vid); tt=ev("document.querySelector('#toast')?.innerText||document.body.innerText.slice(-600)")
    ok(g5['lsv']>0 and g5['lsv']<=65 and abs(g5['ctr'][0])<.05 and abs(g5['ctr'][1]-2.688)<.05 and 'dans la plage' in tt,'« Décaler l\'optique » depuis une position raisonnable : l\'image est centrée, et il est dit que c\'est dans la plage',[g5['lsh'],g5['lsv'],g5['ctr'],tt[-160:]])
    ev("(id)=>{const o=STAGE.byId(id);o.pos=[5,.3,5];STAGE.select([]);STAGE.unbuild(id);STAGE.build(o);STAGE.touch();STAGE.tick(0);STAGE.select([id]);VIDEO.aim(o,STAGE.byId('%s'),'shift')}"%sid,vid); pg.wait_for_timeout(300); g6=ev(G,vid); tt=ev("document.querySelector('#toast')?.innerText||''")
    ok(g6['lsh']==-20 and g6['lsv']<=65 and 's\'arrête' in tt and abs(g6['ctr'][0])>.5,'projecteur trop désaxé : le décalage bute sur la limite, l\'image n\'atteint pas le centre et le message donne ce qu\'il faudrait',[g6['lsh'],g6['lsv'],g6['ctr'],tt[:230]])
    # Panasonic : optique fixe sans décalage, optique à plage propre
    pid=ev("""(()=>{const T=APP.THREE,v=STAGE.place('c-panasonic-pt-rz21k',{point:new T.Vector3(-2,0,4),object:{userData:{}},face:null},true,{});v.pos=[-2,1.5,4];v.hang=null;v.lens='ET-D75LE50';STAGE.select([]);STAGE.unbuild(v.id);STAGE.build(v);STAGE.touch();STAGE.tick(0);STAGE.select([v.id]);return v.id})()"""); pg.wait_for_timeout(400)
    ev("STAGE.UI.tab='prop';STAGE.render()"); pg.wait_for_timeout(300); g7=ev(G,pid); f7=ev(F)
    ok(g7['TR']==[.694,.694] and g7['gth']==.694 and g7['SH'].get('none') and f7['th'] is None and f7['lsv'] is None and 'optique fixe' in f7['txt'] and 'ne se décale pas' in f7['txt'],'Panasonic avec ET-D75LE50 : rapport fixe 0,694 sans curseur, et la fiche dit que cette optique ne se décale pas',[g7['gth'],g7['SH']])
    ev("(id)=>{const o=STAGE.byId(id);o.lens='ET-D75LE6';STAGE.touch()}",pid); g8=ev(G,pid); ev("(id)=>{STAGE.byId(id).lens='ET-D3LEU100';STAGE.touch();STAGE.render()}",pid); g9=ev(G,pid); f9=ev(F)
    ok(g8['SH']['v']==[-44,44] and g8['SH']['h']==[-15,15] and g9['SH'] is None and 'non relevé' in f9['txt'] and f9['lsv']==[-150,150],'ET-D75LE6 : sa plage propre (±44 % / ±15 %) ; ET-D3LEU100 : plage non relevée, annoncée comme telle et rien n\'est limité',[g8['SH'],g9['SH']])
    cid=ev("""(()=>{const T=APP.THREE,v=STAGE.place('c-christie-m-4k25-rgb',{point:new T.Vector3(2,0,4),object:{userData:{}},face:null},true,{});STAGE.touch();STAGE.tick(0);return v.id})()"""); g10=ev(G,cid)
    ok(g10['lens']=='118-100111' and g10['TR']==[1.158,1.495] and g10['SH']['v']==[-64,64] and g10['SH']['h']==[-36,36],'Christie : optique 1,16–1,49 montée, décalage ±64 % / ±36 % (±128 / ±72 % de la demi-image)',[g10['TR'],g10['SH']])
    js=ev("JSON.parse(STAGE.serialize())"); ok(any(o.get('lens')=='R9862005' for o in js['objs']),'l\'optique montée est enregistrée dans le fichier')
    ev("(s)=>{STAGE.loadShow(JSON.parse(s));STAGE.tick(0)}",ev("STAGE.serialize()")); pg.wait_for_timeout(800); n=ev("STAGE.S.objs.filter(o=>STAGE.typeOf(o).lenses).length"); ok(n==3,'après rechargement du projet, les trois projecteurs retrouvent leurs optiques',n)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
