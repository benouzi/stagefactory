# Atelier élargi, détaché, fermé, ancré : jamais rogné par le bord de l'écran.
import sys; sys.path.insert(0,'/home/claude/tools')
from h import *
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,860,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.WINS && WINS.W.has('console')",timeout=120000); pg.add_style_tag(content='#modal{display:none!important}'); ev("APP.renderer.setAnimationLoop(null)")
    R="(()=>{const e=document.getElementById('console'),r=e.getBoundingClientRect(),v=getComputedStyle(e);return [Math.round(r.left),Math.round(r.right),v.visibility,v.display,e.classList.contains('hide')]})()"
    ev("document.documentElement.style.setProperty('--cw','720px');APP.toggleConsole(true)"); pg.wait_for_timeout(500); a=ev(R); print('ouvert large',a, 'OK' if a[1]<=1400 and a[0]>=0 else '!!')
    ev("WINS.detach('console')"); pg.wait_for_timeout(300); ev("APP.toggleConsole(false)"); pg.wait_for_timeout(400); c=ev(R); print('flottant fermé',c,'OK' if c[3]=='none' else '!!', ev("getComputedStyle(WINS.W.get('console').bar).display"))
    ev("WINS.attach('console')"); pg.wait_for_timeout(500); d=ev(R); print('ancré fermé',d,'OK' if d[0]>=1400 or d[2]=='hidden' else '!!', 'languette', ev("getComputedStyle(WINS.W.get('console').pill).display"))
    ev("APP.toggleConsole(true)"); pg.wait_for_timeout(500); e=ev(R); print('rouvert ancré',e,'OK' if e[1]<=1400 and e[2]=='visible' else '!!',errs[:2]); b.close()
