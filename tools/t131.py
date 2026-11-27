# 4.53.2 — secousse des panneaux : opérations au hasard (fermer, rouvrir, tirer, détacher, placer, vues, tailles d'écran) et, après chacune, contrôle que rien ne traîne (contenu sans panneau, panneau vide ou hors écran, vue 3D partagée). Usage : SF_DV=1 python3 tools/t131.py <graine> <nombre d'opérations>
import sys,os,random,json; sys.path.insert(0,'/home/claude/tools')
os.environ['SF_DV']='1'; os.environ['SF_BLANK']='1'
from h import *
SEED=int(sys.argv[1]) if len(sys.argv)>1 else 1; N=int(sys.argv[2]) if len(sys.argv)>2 else 60
random.seed(SEED)
INV="""(()=>{const bad=[];const api=PANELS.api;if(DOCK.D.pfull||PANELS.isSolo())return bad;const ids=['plan','insp','env','patch','lib','objs','rig','secu','con','warn','desk','ai','aud','led','flib','help','hud'];const sel={insp:'#console',env:'#side',plan:'#planWin',lib:'#libWin',objs:'#olWin',desk:'#desk',ai:'#aiPanel',aud:'#audPanel',led:'#ledPanel',flib:'#libPanel',help:'#help',hud:'#hud'};
 const vis=e=>{if(!e||!e.isConnected)return false;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return false;const r=e.getBoundingClientRect();return r.width>2&&r.height>2};
 for(const id of ids){const el=sel[id]?document.querySelector(sel[id]):document.querySelector('.drp[data-dt='+id+']');const p=api.getPanel(id);const inH=el&&el.closest('.dvp');
  if(!p&&vis(el))bad.push(id+' : contenu visible sans panneau ('+(inH?'dans un support':'hors support')+')');
  if(p&&el&&!inH)bad.push(id+' : panneau présent mais contenu hors de son support');
  if(p&&inH&&inH.dataset.p!==id)bad.push(id+' : contenu dans le support de '+inH.dataset.p);
  if(p){let v=false;try{v=p.api.isVisible}catch(_){ }const h=PANELS.holder(id).getBoundingClientRect();if(v&&(h.width<40||h.height<30))bad.push(id+' : panneau affiché mais de taille nulle '+Math.round(h.width)+'x'+Math.round(h.height));
   if(v&&(h.left<-2||h.top<40||h.right>innerWidth+2||h.bottom>innerHeight+2))bad.push(id+' : panneau hors de la fenêtre '+[h.left,h.top,h.right,h.bottom].map(Math.round));
   if(v&&!vis(el))bad.push(id+' : panneau affiché mais contenu invisible');}}
 const v=api.getPanel('v3d');if(!v)bad.push('vue 3D absente');else{if(v.group.panels.length!==1)bad.push('vue 3D partagée avec '+v.group.panels.map(q=>q.id));if(v.group.api.location.type!=='grid')bad.push('vue 3D pas dans la grille');const r=PANELS.holder('v3d').getBoundingClientRect();if(r.width<120||r.height<120)bad.push('vue 3D trop petite '+Math.round(r.width)+'x'+Math.round(r.height));}
 for(const g of api.groups){if(!g.panels.length)bad.push('groupe vide '+g.id);}
 for(const o of document.querySelectorAll('#dvRoot .dv-render-overlay')){ /* supports orphelins */ const h=o.querySelector('.dvp');if(h&&!api.getPanel(h.dataset.p)&&vis(o)&&h.children.length)bad.push('support orphelin visible : '+h.dataset.p);}
 return bad})()"""
with sync_playwright() as p:
    b,pg,errs=open_app(p,1600,900); ev=pg.evaluate
    pg.wait_for_function("window.PANELS && PANELS.ready",timeout=90000); pg.wait_for_timeout(2000)
    BOT=['patch','lib','objs','rig','secu','con','warn']; ALL=['plan','insp','env']+BOT+['desk','ai','aud','led','flib','help','hud']
    def tabc(i): return ev("(i)=>{const e=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid===i);if(!e)return null;const t=e.getBoundingClientRect();if(t.width<5)return null;const h=document.elementFromPoint(t.left+12,t.top+t.height/2);return h&&e.contains(h)?[t.left+12,t.top+t.height/2]:null}",i)
    def rect(i): return ev("(i)=>{const r=PANELS.holder(i).getBoundingClientRect();return [r.left,r.top,r.width,r.height]}",i)
    def drag(i,tx,ty):
        c=tabc(i)
        if not c: return 'pas saisissable'
        x,y=c; pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move(x+6,y-10,steps=3); pg.mouse.move(tx,ty,steps=10); pg.wait_for_timeout(250); pg.mouse.move(tx+1,ty+1); pg.wait_for_timeout(150); pg.mouse.up(); return 'ok'
    found={}; hist=[]
    for k in range(N):
        op=random.choice(['close','show','show','float3d','dragtab','dragedge','home','place','dbl','detachbtn','view','toggleTop','reset' if random.random()<.15 else 'show','layoutsave','resize','solo','dom','domsave'])
        i=random.choice(ALL); d=''
        try:
            if op=='close':
                c=tabc(i)
                if c: 
                    x=ev("(i)=>{const e=[...document.querySelectorAll('#dvRoot .dvtab')].find(e=>e.dataset.pid===i).querySelector('[data-tb=close]').getBoundingClientRect();return [e.left+e.width/2,e.top+e.height/2]}",i); pg.mouse.click(*x)
            elif op=='show': ev("(i)=>PANELS.show(i)",i)
            elif op=='float3d': v=rect('v3d'); d=drag(i,v[0]+v[2]*random.uniform(.3,.7),v[1]+v[3]*random.uniform(.3,.7))
            elif op=='dragtab':
                j=random.choice([a for a in ALL if a!=i]); c=tabc(j)
                if c: d=drag(i,c[0]+25,c[1])
            elif op=='dragedge':
                j=random.choice(['v3d']+ALL); 
                if ev("(j)=>PANELS.has(j)",j):
                    r=rect(j); side=random.choice('lrtb'); tx=r[0]+(12 if side=='l' else r[2]-12 if side=='r' else r[2]/2); ty=r[1]+(12 if side=='t' else r[3]-12 if side=='b' else r[3]/2); d=j+side+' '+drag(i,tx,ty)
            elif op=='home': ev("(i)=>PANELS.has(i)&&PANELS.home([i])",i)
            elif op=='place': w=random.choice(['bas','gauche','droite']); d=w; ev("([i,w])=>PANELS.has(i)&&PANELS.place([i],w)",[i,w])
            elif op=='dbl':
                c=tabc(i)
                if c: pg.mouse.dblclick(*c)
            elif op=='detachbtn':
                x=ev("(i)=>{const p=PANELS.api.getPanel(i);if(!p)return null;const a=p.group.element.querySelector('[data-dva=float],[data-dva=dock]');if(!a)return null;const e=a.getBoundingClientRect();const h=document.elementFromPoint(e.left+e.width/2,e.top+e.height/2);return h===a?[e.left+e.width/2,e.top+e.height/2]:null}",i)
                if x: pg.mouse.click(*x)
            elif op=='view': w=random.choice(['3d','split','plan']); d=w; ev("(w)=>DOCK.view(w)",w)
            elif op=='toggleTop': w=random.choice(['#olBtn','#conBtn','#planBtn','#deskBtn','#helpBtn']); d=w; ev("(w)=>{const e=document.querySelector(w);e&&e.offsetParent&&e.click()}",w)
            elif op=='reset': ev("PANELS.reset()")
            elif op=='layoutsave': ev("PANELS.save('m');PANELS.load(JSON.parse(localStorage.getItem('onex.dvLayouts')).m)")
            elif op=='solo': ev("PANELS.solo()"); pg.wait_for_timeout(500); ev("PANELS.solo(false)") if random.random()<.8 else None
            elif op=='dom': w=random.choice(['des','sce','rig','lum','son','vid']); d=w; ev("(w)=>DOCK.setDomain(w)",w)
            elif op=='domsave': ev("(()=>{const M=JSON.parse(localStorage.getItem('onex.dvDom')||'{}');M[DOCK.D.dom]=PANELS.toJSON();localStorage.setItem('onex.dvDom',JSON.stringify(M))})()")
            elif op=='resize': pg.set_viewport_size({'width':random.choice([1366,1600,1920]),'height':random.choice([768,900,1040])})
        except Exception as e: d+=' EXC '+str(e)[:120]
        pg.wait_for_timeout(650)
        if op=='view' and d=='plan' and random.random()<.7: pg.wait_for_timeout(300); ev("DOCK.view(random_w)".replace('random_w',"'split'")); pg.wait_for_timeout(500)
        hist.append(f'{k}:{op}:{i}:{d}')
        bad=ev(INV)
        new=[x for x in bad if x not in found]
        for x in new: found[x]=k
        if new:
            print('APRES',hist[-4:]); [print('   !!',x) for x in new]; pg.screenshot(path=f'/home/claude/shots/m1-{SEED}-{k}.png')
            ev("PANELS.reset()"); pg.wait_for_timeout(900); still=ev(INV)
            if still: print('   (reste apres remise a zero :',still,')') 
            if ev("DOCK.D.pfull"): ev("DOCK.view('split')")
    print('graine',SEED,'fin : ',len(found),'défauts distincts ; erreurs script :',errs[:4])
    b.close()
