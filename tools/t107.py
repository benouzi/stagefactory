# vidéo : empiler deux projecteurs, raccord à deux avec fondu de bord (lumière égale dans le recouvrement)
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:600],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.VIDEO",timeout=60000); pg.wait_for_timeout(1500)
    sid,vid=ev("""(()=>{const T=APP.THREE,at=(x,y,z)=>({point:new T.Vector3(x,y,z),object:{userData:{}},face:null});
      const s=STAGE.place('ecran',at(0,0,-3),true,{}); s.pos=[0,1,-3]; const v=STAGE.place('vp12',at(0,0,6),true,{}); v.pos=[0,2.5,6]; v.hang=null; v.content='blanc'; v.bright=.1;
      for(const o of [s,v]){STAGE.unbuild(o.id);STAGE.build(o)} STAGE.setLive(true); STAGE.touch(); STAGE.tick(0); STAGE.select([v.id]); return [s.id,v.id]})()""")
    pg.wait_for_timeout(600)
    VP="()=>{STAGE.tick(0);const r=v=>+v.toFixed(3);return STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='vid').map(o=>{const g=STAGE.RT.get(o.id).geom;return {id:o.id,pos:o.pos.map(r),th:o.throw,stk:o.stk||null,pair:o.pair||null,ovl:o.ovl||null,crop:o.crop||null,bll:o.bll||0,blr:o.blr||0,warp:!!o.warp,lux:Math.round(g.lux),pl:g.pl.map(p=>p.toArray().map(r)),content:o.content,bright:o.bright}})}"
    dist=lambda a,b:sum((x-y)**2 for x,y in zip(a,b))**.5
    SC=[[-3,1,-3],[3,1,-3],[3,4.375,-3],[-3,4.375,-3]]
    S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    def lum(tag,pts):
        pg.wait_for_timeout(1800); f=OUT+'/t107-'+tag+'.png'; pg.screenshot(path=f); im=Image.open(f).convert('L'); out=[]
        for q in pts:
            x,y=ev(S3,q); out.append(round(sum(im.getpixel((int(x)+i,int(y)+j)) for i in (-2,0,2) for j in (-2,0,2))/9))
        return out
    cam="(()=>{STAGE.select([]);APP.camera.position.set(0,3,8);APP.orbit.target.set(0,2.7,-3);APP.orbit.update()})()"
    pts=[[x,2.7,-3] for x in (-2.2,-1.2,-.3,0,.3,1.2,2.2)]
    ev("(id)=>{const o=STAGE.byId(id);VIDEO.aim(o,VIDEO.scrOf(o),'tilt');VIDEO.pin(o,VIDEO.scrOf(o))}",vid); ev(cam); l1=lum('a',pts); v1=ev(VP)
    ok(len(v1)==1 and 20<min(l1) and max(l1)<200,'un projecteur à 10 % calé sur l\'écran : niveau de référence lisible (ni noir ni saturé)',[l1,v1[0]['lux']])
    # empiler
    ev("(id)=>{STAGE.select([id]);const o=STAGE.byId(id);VIDEO.stack(o,VIDEO.scrOf(o))}",vid); v2=ev(VP); ev(cam); l2=lum('b',pts)
    e=[max(dist(v['pl'][i],SC[i]) for i in range(4)) for v in v2]
    ok(len(v2)==2 and v2[0]['stk'] and v2[0]['stk']==v2[1]['stk'] and max(e)<.03 and abs(dist(v2[0]['pos'],v2[1]['pos'])-.65)<.01 and v2[1]['content']=='blanc' and v2[1]['bright']==.1,'« Empiler un 2e » : un second projecteur identique à 65 cm, les deux calés sur les 4 coins de l\'écran',[e,[v['pos'] for v in v2]])
    ok(min(l2[i]-l1[i] for i in range(7))>15,'l\'écran est nettement plus lumineux à deux',[l1,l2])
    ev("(id)=>{STAGE.select([id]);STAGE.UI.tab='prop';STAGE.render()}",vid); pg.wait_for_timeout(300); inf=ev("document.querySelector('#console')?.innerText||''").replace('\n',' ')
    ok('Empilé (2 projecteurs)' in inf and str(f"{v2[0]['lux']+v2[1]['lux']:,}".replace(',',' ')) in inf.replace('\xa0',' '),'la fiche additionne les lux des deux',inf[inf.find('Empilé'):][:70])
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(900); v3=ev(VP); ok(len(v3)==1 and not v3[0]['stk'],'Ctrl+Z : le second projecteur repart, un seul pas',len(v3))
    # raccord à deux
    ev("(id)=>{STAGE.select([id]);const o=STAGE.byId(id);VIDEO.edge(o,VIDEO.scrOf(o),20)}",vid); v4=ev(VP); v4.sort(key=lambda v:v['pos'][0]); L,R=v4
    ok(len(v4)==2 and abs(L['pos'][0]+1.5)<.01 and abs(R['pos'][0]-1.5)<.01 and L['pair']==R['id'] and R['pair']==L['id'],'« Raccord à 2 » avec un projecteur dans l\'axe : il se décale d\'un quart d\'écran, le second est posé en symétrie',[L['pos'],R['pos']])
    RL=[[-3,1,-3],[.6,1,-3],[.6,4.375,-3],[-3,4.375,-3]]; RR=[[-.6,1,-3],[3,1,-3],[3,4.375,-3],[-.6,4.375,-3]]
    eL=max(dist(L['pl'][i],RL[i]) for i in range(4)); eR=max(dist(R['pl'][i],RR[i]) for i in range(4))
    ok(eL<.03 and eR<.03 and L['crop']==[0,0,.6,1] and R['crop']==[.4,0,1,1],'recouvrement 20 % : chacun éclaire 60 % de la largeur (jardin de -3 à +0,6 m, cour de -0,6 à +3 m) et montre sa part du contenu',[eL,eR,L['crop'],R['crop']])
    ok(abs(L['blr']-33.3)<.1 and L['bll']==0 and abs(R['bll']-33.3)<.1 and R['blr']==0,'fondu de bord côté intérieur seulement : 33,3 % de chaque image (= les 1,20 m communs)',[L['bll'],L['blr'],R['bll'],R['blr']])
    ev(cam); l4=lum('c',pts); ref=(l4[0]+l4[1]+l4[5]+l4[6])/4; mid=l4[2:5]
    ok(all(abs(m-ref)<=max(12,ref*.12) for m in mid),'dans le recouvrement la lumière est la même qu\'ailleurs (pas de bande claire ni sombre)',[l4,round(ref)])
    ev("()=>{for(const o of STAGE.S.objs){o.bll=0;o.blr=0}STAGE.touch()}"); l5=lum('d',pts); ok(min(l5[2:5])>ref+15,'contre-épreuve sans fondu : le recouvrement est bien plus clair',l5)
    ev("(id)=>{STAGE.select([id]);VIDEO.reedge(STAGE.byId(id),10)}",vid); v6=ev(VP); v6.sort(key=lambda v:v['pos'][0]); ok(v6[0]['crop']==[0,0,.55,1] and abs(v6[0]['blr']-18.2)<.1 and abs(v6[0]['pl'][1][0]-.3)<.03,'recouvrement ramené à 10 % : les deux images et les fondus sont recalés',[v6[0]['crop'],v6[0]['blr'],v6[0]['pl'][1]])
    ev("STAGE.UI.tab='prop';STAGE.render()"); pg.wait_for_timeout(300); inf=ev("document.querySelector('#console')?.innerText||''").replace('\n',' '); ok('Raccord avec' in inf and '10 %' in inf and ev("!!document.querySelector('#console [data-vpov]')"),'la fiche dit le raccord et propose le recouvrement',inf[inf.find('Raccord avec'):][:90])
    pg.click('#console [data-vp=unedge]'); pg.wait_for_timeout(700); v7=ev(VP); ok(all(not v['pair'] and not v['crop'] and v['bll']==0 and v['blr']==0 for v in v7) and len(v7)==2,'« Défaire le raccord » : plus de recadrage ni de fondu, les deux projecteurs restent')
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
