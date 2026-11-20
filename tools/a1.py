# Audit 1 : chaque commande de menu, chaque outil du rail, chaque onglet, sur projet vierge puis sur la démonstration. On relève les erreurs de script.
import os, sys, json
os.environ['SF_BLANK']='1'
sys.path.insert(0,'/home/claude/tools'); from h import open_app, OUT
from playwright.sync_api import sync_playwright
SKIP={'parc','desk','music','led','dmx','new','open','reload','full','ext3d','cine','import','xproj','xmvr','xpatch','xgear','xplan','shot','save','backups','rename','demo','resume','pubPdf','secuPdf','mcp','flib','venue','ai'}
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate
    pg.wait_for_function("window.PONTS && window.DRAWER && window.DOCK && window.PLAN && window.PUB && window.DECOR && window.LARRAY && window.WS",timeout=60000)
    ev("APP.renderer.setAnimationLoop(null)"); ev("window.__dl=[];STAGE.saveFile=async(n,d)=>{__dl.push(n)}")
    def sweep(tag):
        print('--',tag,flush=True); ids=ev("Object.keys(WS.C)")
        for k in ids:
            if k in SKIP or k.startswith('cfg_'): continue
            n0=len(errs)
            r=ev("""async(k)=>{try{await WS.C[k].run();await new Promise(r=>setTimeout(r,120));const m=document.querySelector('#modal');const open=m.style.display==='flex';m.style.display='none';window.PONTS?.tool(false);window.PUB?.tool(null);STAGE.UI.placing=null;STAGE.UI.aiming=false;return open?'modal':'ok'}catch(e){return 'EXC '+e.message+' '+(e.stack||'').split('\\n')[1]}}""",k)
            pg.wait_for_timeout(60)
            if r.startswith('EXC') or len(errs)>n0: print(tag,'CMD',k,r,errs[n0:][:2],flush=True)
        for dom in ['lum','rig','vid','son','sce']:
            ev("(d)=>document.querySelector('[data-dom='+d+']').click()",dom); pg.wait_for_timeout(80)
            for t in ev("[...document.querySelectorAll('#rail [data-t]')].map(b=>b.dataset.t)"):
                n0=len(errs); ev("(t)=>document.querySelector('#rail [data-t='+t+']').click()",t); pg.wait_for_timeout(120)
                ev("document.querySelector('#modal').style.display='none'")
                if len(errs)>n0: print(tag,'TOOL',dom,t,errs[n0:][:2],flush=True)
                pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
        for t in ['patch','lib','list','rig','secu','con','warn']:
            n0=len(errs); ev("(t)=>DRAWER.open(t)",t); pg.wait_for_timeout(150); h=ev("document.querySelector('#drBody').innerText.length")
            if len(errs)>n0 or h<20: print(tag,'TAB',t,h,errs[n0:][:2],flush=True)
        for c in ['lum','vid','son','str','dec','imp','salle']:
            n0=len(errs); ev("(c)=>{STAGE.UI.libCat=c;DRAWER.open('lib')}",c); pg.wait_for_timeout(200)
            if len(errs)>n0: print(tag,'LIBCAT',c,errs[n0:][:2],flush=True)
    sweep('VIERGE')
    ev("STAGE.loadShow(STAGE.demoShow())"); pg.wait_for_timeout(1500); ev("STAGE.select([STAGE.S.objs[0].id,STAGE.S.objs[1].id])")
    sweep('DEMO')
    # sélection de chaque type d'objet : l'Inspecteur s'affiche-t-il ?
    for tid in ev("STAGE.LIBALL().map(t=>t.id)"):
        n0=len(errs)
        r=ev("""(tid)=>{try{const o=STAGE.place(tid,STAGE.hitAt(1,-2),true);if(!o)return 'no';STAGE.select([o.id]);STAGE.UI.tab='prop';STAGE.render();const n=document.querySelector('#console').innerText.length;STAGE.tick(.05);STAGE.unbuild(o.id);STAGE.S.objs=STAGE.S.objs.filter(q=>q!==o);STAGE.select([]);return n<80?'vide '+n:'ok'}catch(e){return 'EXC '+e.message+' '+(e.stack||'').split('\\n')[1]}}""",tid)
        if r!='ok' or len(errs)>n0: print('TYPE',tid,r,errs[n0:][:2],flush=True)
    print('exports',ev("__dl")); print('ERREURS',len(errs)); [print(' ',e[:300]) for e in dict.fromkeys(errs)]
    b.close()
