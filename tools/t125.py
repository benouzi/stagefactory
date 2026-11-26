# fenêtre « Objets » : bouton permanent, touche O, flottante, compacte ou tableau selon la largeur, centrer au clic
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:400],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.PLAN && window.OBJLIST && window.LAYERS && window.DRAWER && !!PLAN.world",timeout=60000); pg.wait_for_timeout(1500)
    ev("localStorage.removeItem('onex.olwin')")
    I=ev("""(()=>{const T=APP.THREE,at=(x,z)=>({point:new T.Vector3(x,0,z),object:{userData:{}},face:null}),id=o=>(o&&o.id)||o,r={};['par-zoom','par-zoom','par-zoom'].forEach((t,i)=>r['p'+i]=id(STAGE.place(t,at(-2+i*2,1),true,{})));r.cube=id(STAGE.place('prim-cube',at(3,-2),true,{}));STAGE.select([]);STAGE.render();return r})()"""); pg.wait_for_timeout(600)
    if ev("OBJLIST.winOn"): ev("OBJLIST.win(false)")
    ok(ev("(()=>{const b=document.querySelector('#olBtn');return !!b&&b.offsetParent!==null&&b.textContent.includes('Objets')})()"),'un bouton « Objets » est toujours là, en haut, à côté de l\'Inspecteur')
    pg.click('#olBtn'); pg.wait_for_timeout(500); W='#olWin '
    s=ev("(()=>{const w=document.querySelector('#olWin'),r=w.getBoundingClientRect();return [w.classList.contains('on'),w.querySelectorAll('tr.olr').length,Math.round(r.width),!!w.querySelector('.olmini'),document.querySelector('#olBtn').classList.contains('on')]})()")
    ok(s[0] and s[1]==4 and s[3] and s[4],'un clic : la fenêtre « Objets du projet » s\'ouvre, sans rien avoir à choisir, en version compacte',s)
    ok(ev("!document.querySelector('#console .olmini')"),'la liste n\'est plus répétée dans l\'inspecteur tant que la fenêtre est ouverte')
    row=lambda i: W+'tr[data-olr="o:%s"]'%i
    pg.click(row(I['p1'])+' td.nm'); pg.wait_for_timeout(600); ok(ev("STAGE.UI.sel")==[I['p1']] and ev("!!document.querySelector('#olWin tr.olr.on')") and ev("!!document.querySelector('#console [data-k=pan]')"),'clic sur une ligne : l\'objet est choisi, l\'inspecteur montre ses réglages, la fenêtre reste ouverte')
    y0=ev("document.querySelector('#olWin tr[data-olr=\"o:%s\"]').getBoundingClientRect().top"%I['cube']); pg.click(row(I['cube'])+' td.nm'); pg.wait_for_timeout(500); y1=ev("document.querySelector('#olWin tr[data-olr=\"o:%s\"]').getBoundingClientRect().top"%I['cube']); ok(abs(y0-y1)<1,'la liste ne bouge pas quand on choisit',[y0,y1])
    pg.dblclick(row(I['cube'])+' [data-olc=name]'); pg.wait_for_timeout(400); pg.fill(W+'.oled','Régie'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500); ok(ev("(id)=>STAGE.byId(id).name",I['cube'])=='Régie','ici le double-clic sur le nom renomme')
    # objet ajouté ailleurs : la fenêtre suit
    ev("(()=>{const T=APP.THREE;STAGE.place('decoupe',{point:new T.Vector3(0,0,4),object:{userData:{}},face:null},true,{});STAGE.select([]);STAGE.render()})()"); pg.wait_for_timeout(1300); ok(ev("document.querySelectorAll('#olWin tr.olr').length")==5,'un objet posé dans la vue apparaît dans la fenêtre')
    # centrer au clic
    t0=ev("APP.orbit.target.toArray()"); pg.check(W+'[data-ow=follow]'); pg.click(row(I['cube'])+' td.nm'); pg.wait_for_timeout(700); t1=ev("APP.orbit.target.toArray()"); ok(abs(t1[0]-3)<.01 and abs(t1[2]+2)<.01 and t0!=t1,'« centrer au clic » coché : un clic sur une ligne amène la vue 3D sur l\'objet',t1)
    # déplacer, élargir → tableau complet
    bb=pg.locator('#olWin .ow-bar span').bounding_box(); pg.mouse.move(bb['x']+20,bb['y']+8); pg.mouse.down(); pg.mouse.move(bb['x']+120,bb['y']+48,steps=5); pg.mouse.up(); pg.wait_for_timeout(300)
    r1=ev("(()=>{const r=document.querySelector('#olWin').getBoundingClientRect();return [Math.round(r.left),Math.round(r.top)]})()"); ok(r1==[164,136],'la fenêtre se déplace par sa barre',r1)
    rs=pg.locator('#olWin .ow-rs').bounding_box(); pg.mouse.move(rs['x']+8,rs['y']+8); pg.mouse.down(); pg.mouse.move(rs['x']+408,rs['y']+48,steps=6); pg.mouse.up(); pg.wait_for_timeout(500)
    ok(ev("!!document.querySelector('#olWin #olx th[data-ols=w]') && !document.querySelector('#olWin .olmini')"),'élargie : elle passe au tableau complet (modèle, calque, accroche, hauteur, poids, filtres, actions groupées)')
    ev("DRAWER.open('list')"); pg.wait_for_timeout(400); ok(ev("!document.querySelector('#drBody #olx') && !!document.querySelector('#drBody [data-olw=back]')"),'l\'onglet du tiroir signale que la liste est dans sa fenêtre'); pg.screenshot(path=OUT+'/t125.png')
    # touche O, et retour
    pg.mouse.click(300,300); pg.keyboard.press('o'); pg.wait_for_timeout(500); ok(not ev("OBJLIST.winOn") and ev("!!document.querySelector('#drBody #olx')"),'touche O : la fenêtre se ferme, la liste revient dans le tiroir'); pg.keyboard.press('o'); pg.wait_for_timeout(500); ok(ev("OBJLIST.winOn"),'touche O : elle se rouvre')
    st=ev("JSON.parse(localStorage.getItem('onex.olwin')||'null')"); ok(st and st.get('on') is True and st.get('w')>700,'sa place, sa taille et son état sont gardés pour la prochaine ouverture',st)
    pg.click(W+'[data-ow=x]'); pg.wait_for_timeout(400); ok(not ev("OBJLIST.winOn") and ev("STAGE.select([]),STAGE.render(),!!document.querySelector('#console .olmini')"),'✕ : fermée, la liste compacte revient dans l\'inspecteur')
    ok(not errs,'aucune erreur dans la console',errs[:3])
    print('fin','tout passe' if not bad else bad); b.close()
