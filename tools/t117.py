# à l'ouverture, l'écran de chargement ne se retire qu'une fois le projet vierge en place : la salle d'origine n'est jamais montrée
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
os.environ['SF_INIT']="""window.__seen=[];new MutationObserver(()=>{const l=document.querySelector('#loader');if(l&&l.style.display==='none'&&!window.__done){window.__done=1;const A=window.APP;window.__seen.push({stage:!!window.STAGE,objs:window.STAGE?STAGE.S.objs.length:-1,venue:A&&A.venue?{type:A.venue.type,open:!!A.venue.open}:null,name:window.STAGE?STAGE.S.name:null})}}).observe(document,{subtree:true,attributes:true,attributeFilter:['style']});"""
from h import open_app, OUT
from playwright.sync_api import sync_playwright
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:560],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1300,800); ev=pg.evaluate; pg.wait_for_timeout(800)
    s=ev("window.__seen"); now=ev("({venue:{type:APP.venue.type,open:!!APP.venue.open},objs:STAGE.S.objs.length})")
    ok(len(s)==1 and s[0]['stage'] and s[0]['venue']==now['venue'] and s[0]['objs']==0,'au moment précis où l\'écran de chargement se retire, le projet vierge et son espace sont déjà en place (ce qu\'on voit alors est ce qu\'on verra ensuite)',[s,now])
    ok(now['venue']['open'] or now['venue']['type']!='onex','et cet espace n\'est pas la salle d\'Onex',now)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3]); b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
