# bouton « Étiquettes » de la vue 3D : masque / montre les charges aux points d'accroche et les numéros des appareils
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.PONTS && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("document.querySelector('[data-dom=rig]').click();PONTS.O.series='prolyte-h30v';PONTS.O.corner='weld';PONTS.structOpen()"); pg.wait_for_timeout(400)
    ev("[...document.querySelectorAll('[data-pa=stype]')].find(b=>b.dataset.id==='gril').click()"); pg.wait_for_timeout(300); pg.click('[data-pa=sok]'); pg.wait_for_timeout(1500)
    # un projecteur accroché au gril, pour qu'il y ait des charges à afficher
    ev("""(()=>{const T=APP.THREE,o=STAGE.place('par-zoom',{point:new T.Vector3(0,0,0),object:{userData:{}},face:null},true,{});o.hang='pont';if(!PONTS.attachNearest(o))o.hang=null;STAGE.touch();PONTS.select(null,true);STAGE.select([]);STAGE.tick(0)})()"""); pg.wait_for_timeout(1500)
    C="()=>{let n=0,v=0;APP.scene.traverse(o=>{if(o.isSprite&&o.userData.info){n++;let q=o,vis=true;while(q){if(!q.visible)vis=false;q=q.parent}if(vis)v++}});const L=document.querySelector('#labels');return {n,v,btn:document.querySelector('[data-vi]')?.classList.contains('on'),off:!!APP.infoOff,lab:L?getComputedStyle(L).display:null}}"
    G="()=>{let n=0,v=0;APP.scene.traverse(o=>{if((o.isLine||o.isInstancedMesh)&&o.parent&&o.parent.userData.infoG){n++;let q=o,vis=true;while(q){if(!q.visible)vis=false;q=q.parent}if(vis)v++}});return [n,v]}"
    g0=ev(G); ok(g0[0]>0 and g0[1]==g0[0],'flèches de charge et courbe du moment affichées',g0)
    c0=ev(C); ok(c0['n']>0 and c0['v']>0 and c0['btn'] and not c0['off'],'un gril chargé : ses étiquettes de charge sont affichées, le bouton « Étiquettes » est allumé',c0)
    pg.screenshot(path=OUT+'/t118-a.png',clip={'x':60,'y':0,'width':485,'height':560})
    pg.click('[data-vi]'); pg.wait_for_timeout(500); c1=ev(C); ok(c1['v']==0 and c1['n']==c0['n'] and not c1['btn'] and c1['off'],'un clic sur « Étiquettes » : plus aucune étiquette dans la vue 3D, le bouton s\'éteint',c1)
    g1=ev(G); ok(g1[0]>0 and g1[1]==0,'… et les flèches de charge et la courbe du moment des ponts disparaissent aussi',g1)
    pg.screenshot(path=OUT+'/t118-b.png',clip={'x':60,'y':0,'width':485,'height':560})
    ev("""(()=>{const T=APP.THREE,o=STAGE.place('par-zoom',{point:new T.Vector3(1,0,0),object:{userData:{}},face:null},true,{});o.hang='pont';if(!PONTS.attachNearest(o))o.hang=null;STAGE.touch();STAGE.select([]);STAGE.tick(0)})()"""); pg.wait_for_timeout(1500); c2=ev(C)
    g2=ev(G); ok(g2[0]>0 and g2[1]==0,'charges redessinées après un changement : toujours masquées',g2)
    ok(c2['v']==0 and c2['n']>0,'un appareil de plus accroché pendant qu\'elles sont masquées : les étiquettes refaites restent masquées',c2)
    ev("STAGE.UI.labels=true"); pg.wait_for_timeout(700); lab=ev("getComputedStyle(document.querySelector('#labels')).display+'|'+document.querySelectorAll('#labels > *').length"); 
    st=ev("JSON.parse(localStorage.getItem('onex.view3d')||'{}').info"); ok(st is False,'le choix est gardé pour la prochaine ouverture',st)
    pg.click('[data-vi]'); pg.wait_for_timeout(500); c3=ev(C); ok(c3['v']>0 and c3['btn'],'re-clic : elles reviennent',c3); g3=ev(G); ok(g3[1]==g3[0] and g3[0]>0,'les flèches et la courbe reviennent aussi',g3)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3]); b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
