# chaque onglet du bas se détache seul (bouton « ⇱ Détacher » du groupe pour l'onglet affiché, double-clic sur l'onglet, clic droit) — depuis la 4.53 il n'y a plus d'icône ⇱ répétée sur chaque onglet et se remet à sa place (⇲)
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'; os.environ['SF_DV']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:420],flush=True)
    if not c: bad.append(m)
BOT=['patch','lib','objs','rig','secu','con','warn']
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.PANELS && PANELS.ready && window.OBJLIST && window.LIBWIN && !!PLAN.world",timeout=90000); pg.wait_for_timeout(2500)
    loc=lambda i: ev("(i)=>{const p=PANELS.api.getPanel(i);return p?p.group.api.location.type:null}",i)
    tab=lambda t: '#dvRoot .dv-tab:has-text("%s")'%t
    n=ev("[...document.querySelectorAll('#dvRoot .dv-tab')].filter(t=>t.querySelector('[data-tb=swap]')).length"); ok(n==0,'plus d\'icône ⇱ répétée sur chaque onglet (un seul « Détacher » par groupe)',n)
    vis=ev("(()=>{const a=[...document.querySelectorAll('#dvRoot .dv-groupview')].find(g=>g.textContent.includes('Patch')).querySelector('.dvact a[data-dva=float]');if(!a)return null;const r=a.getBoundingClientRect();return [a.textContent,Math.round(r.right),Math.round(r.width)]})()"); ok(vis and 'Détacher' in vis[0] and vis[1]<=1500 and vis[2]>40,'à droite des onglets, un bouton écrit « Détacher » est visible à l\'écran',vis)
    pg.click(tab('Console')); pg.wait_for_timeout(400); pg.click('#dvRoot .dv-groupview:has(.dv-tab:has-text("Patch")) .dvact a[data-dva=float]'); pg.wait_for_timeout(700)
    ok(loc('con')=='floating' and all(loc(i)=='grid' for i in BOT if i!='con'),'Console affichée puis « ⇱ Détacher » : seule la Console part en fenêtre, les six autres restent en bas',[loc(i) for i in BOT])
    r=ev("(()=>{const r=PANELS.holder('con').getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]})()"); ok(r[2]>300 and r[3]>200 and r[1]>50 and r[1]+r[3]<900,'la fenêtre détachée est entière à l\'écran',r)
    pg.screenshot(path=OUT+'/t128-a.png')
    pg.dblclick(tab('Rigging')+' .dv-default-tab-content'); pg.wait_for_timeout(700)
    ok(loc('rig')=='floating' and loc('con')=='floating','double-clic sur l\'onglet Rigging : il se détache aussi',[loc('rig'),loc('con')])
    ok(ev("PANELS.holder('rig').querySelector('.drp,[data-dt]')!==null || PANELS.holder('rig').textContent.length>20"),'la fenêtre Rigging détachée a son contenu')
    pg.click('#dvRoot .dv-groupview:has(.dv-tab:has-text("Console")) .dvact a[data-dva=dock]'); pg.wait_for_timeout(700)
    ok(loc('con')=='grid' and loc('rig')=='floating','⇲ Ancrer sur la Console flottante : elle retourne en bas, Rigging reste détaché',[loc('con'),loc('rig')])
    pg.click('#dvRoot .dv-groupview:has(.dv-tab:has-text("Patch")) .dvact a[data-dva=float]'); pg.wait_for_timeout(700)
    fl=[i for i in BOT if loc(i)=='floating']; ok(len(fl)==2,'le bouton « Détacher » ne détache que l\'onglet affiché',fl)
    for i in fl: ev("(i)=>PANELS.home([i])",i)
    pg.wait_for_timeout(700); ok(all(loc(i)=='grid' for i in BOT),'tout se remet en bas',[loc(i) for i in BOT])
    pg.click(tab('Sécurité')+' [data-tb=close]'); pg.wait_for_timeout(500); ok(not ev("!!PANELS.has('secu')"),'× ferme l\'onglet')
    ev("PANELS.show('secu')"); pg.wait_for_timeout(500); ok(ev("!!PANELS.has('secu')"),'et on le rouvre')
    ok(not errs,'aucune erreur',errs)
    b.close()
print('fin',('ÉCHECS : '+' | '.join(bad)) if bad else 'tout passe')
