# inspecteur : « Objets du projet » utilise la nouvelle liste (version étroite)
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
    I=ev("""(()=>{const T=APP.THREE,at=(x,z)=>({point:new T.Vector3(x,0,z),object:{userData:{}},face:null}),id=o=>(o&&o.id)||o,r={};['par-zoom','par-zoom','par-zoom'].forEach((t,i)=>r['p'+i]=id(STAGE.place(t,at(-2+i*2,1),true,{})));r.cube=id(STAGE.place('prim-cube',at(3,-2),true,{}));STAGE.select([]);STAGE.UI.tab='prop';APP.toggleConsole(true);STAGE.render();return r})()"""); pg.wait_for_timeout(700)
    C='#console .olmini '
    s=ev("(()=>{const c=document.querySelector('#console');return [!!c.querySelector('.olmini'),!c.querySelector('.olist'),[...c.querySelectorAll('.olmini tr.olg b')].map(b=>b.textContent),c.querySelectorAll('.olmini tr.olr').length,c.querySelector('.olmini').getBoundingClientRect().right<=c.getBoundingClientRect().right+1]})()")
    ok(s[0] and s[1] and s[2]==['Lumière','Structure et scène'] and s[3]==4 and s[4],'rien de choisi : l\'inspecteur montre la nouvelle liste, rangée par calque, sans déborder',s)
    row=lambda i: C+'tr[data-olr="o:%s"]'%i
    pg.click(row(I['p0'])+' td.nm'); pg.wait_for_timeout(500); ok(ev("STAGE.UI.sel")==[I['p0']] and ev("!!document.querySelector('#console .olmini tr.olr.on')") and ev("!!document.querySelector('#console [data-k=pan]')"),'clic sur une ligne : l\'objet est choisi, ses réglages s\'ouvrent, la liste reste dessous')
    pg.click(row(I['p2'])+' td.nm',modifiers=['Shift']); pg.wait_for_timeout(500); ok(len(ev("STAGE.UI.sel"))==3,'Maj + clic : de l\'un à l\'autre')
    ev("STAGE.select([])"); pg.wait_for_timeout(400); pg.click(row(I['cube'])+' [data-olk=ren]'); pg.wait_for_timeout(600); pg.fill('#console .olmini .oled','Flight case'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500); ok(ev("(id)=>STAGE.byId(id).name",I['cube'])=='Flight case','crayon ✎ : renommer dans la ligne, même si l\'objet n\'était pas choisi')
    ev("STAGE.select([])"); pg.wait_for_timeout(400); pg.click(row(I['p1'])+' [data-olk=hide]'); pg.wait_for_timeout(400); ok(ev("(id)=>!!STAGE.byId(id).hidden",I['p1']),'pastille ● : masquer depuis la liste'); pg.click(row(I['p1'])+' [data-olk=hide]'); pg.wait_for_timeout(300)
    pg.select_option(C+'[data-olo=grp]','metier'); pg.wait_for_timeout(400); ok(ev("[...document.querySelectorAll('#console .olmini tr.olg b')].map(b=>b.textContent)")[0]=='Lumière' and ev("OBJLIST.O.grp")=='metier','grouper « par métier » depuis l\'inspecteur'); pg.select_option(C+'[data-olo=grp]','calque'); pg.wait_for_timeout(300)
    pg.fill(C+'input[type=search]','flight'); pg.wait_for_timeout(500); ok(ev("document.querySelectorAll('#console .olmini tr.olr').length")==1,'recherche'); pg.fill(C+'input[type=search]',''); pg.wait_for_timeout(300)
    pg.click(row(I['p0'])+' td.nm',button='right'); pg.wait_for_timeout(400); ok(ev("[...document.querySelectorAll('.mh')].some(x=>x.offsetParent)"),'clic droit : le menu de la vue 3D'); pg.keyboard.press('Escape'); pg.mouse.click(700,300); pg.wait_for_timeout(300)
    ev("STAGE.select([])"); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'/t124.png'); pg.click(C+'[data-olk=full]'); pg.wait_for_timeout(500); ok(ev("DRAWER.is('list') && !!document.querySelector('#drBody #olx')"),'« liste complète » ouvre le tableau du tiroir')
    ok(not errs,'aucune erreur dans la console',errs[:3])
    print('fin','tout passe' if not bad else bad); b.close()
