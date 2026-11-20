import sys,json; sys.path.insert(0,'/home/claude/tools')
from h import *
def P(*a): print(*a, flush=True)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1400,860,'basse'); ev=pg.evaluate
    pg.wait_for_function("window.WS && window.DESK && window.ENG && window.AI && window.AUDIO && window.RIG && window.DMX && STAGE.LED",timeout=120000)
    ev("APP.renderer.setAnimationLoop(null)")
    ev("window.__e=[];window.addEventListener('error',e=>__e.push('ERR '+e.message));window.addEventListener('unhandledrejection',e=>__e.push('REJ '+(e.reason&&e.reason.message||e.reason)))")
    ev("window.T=(s=1)=>{for(let k=0;k<Math.round(s*30);k++){ENG.frame(1/30);STAGE.tick(1/30);}}; window.mk=(n)=>{const S=STAGE.S;STAGE.loadShow({name:'t',objs:[],cues:[],follow:false});const t=STAGE.LIBALL().find(q=>q.cat==='lum'&&q.mover);for(let i=0;i<n;i++){const o=STAGE.defaults(t);o.n=i+1;o.pos=[i-2,6,-3];o.hang='fixe';o.dim=0;o.color='#ffffff';o.grp=i<3?'A':'B';S.objs.push(o);STAGE.build(o);}STAGE.touch();T(.1);return S.objs.map(o=>o.id)}; window.O=n=>STAGE.S.objs.find(o=>o.n===n); window.cmd=c=>{DESK.command(c);T(.1);return DESK.D.msg}")
    def step(name, js, expect=None):
        try: r=ev("(async()=>{try{return await (async()=>{%s})()}catch(e){return 'EXC '+e.message+' | '+(e.stack||'').split('\\n').slice(1,3).join(' ')}})()"%js)
        except Exception as e: r='PY '+str(e)[:200]
        e2=ev("window.__e.splice(0)") if not str(r).startswith('PY') else []
        ok = (expect is None or r==expect) and not (isinstance(r,str) and r.startswith(('EXC','PY'))) and not e2 and not errs
        P('OK ' if ok else '!! ',name,'->',json.dumps(r,ensure_ascii=False)[:300], '' if ok else ('attendu '+json.dumps(expect,ensure_ascii=False)), e2, errs[:3]); errs.clear(); return r
    step('ouvre pupitre',"DESK.toggle(true);return !!document.querySelector('#dkCmd')",True)
    step('prog capte', "mk(6);cmd('fixture 1 thru 3 at 50');const c=ENG.progCount();return [c.f,c.v,O(1).dim,O(4).dim]",[3,3,.5,0])
    step('store partiel', "cmd('couleur rouge');const m=cmd('store');const c=STAGE.S.cues[0];return [m.includes('enregistrée'),Object.keys(c.s).length,Object.keys(c.s[O(1).id]).sort().join()]",[True,3,'color,dim'])
    step('clear 2 temps', "const a=ENG.clear();T(.1);const b=ENG.clear();T(.1);return [a,b,ENG.progCount().v,O(1).dim,O(1).color]",['sel','prog',0,.5,'#ff1e1e'])
    step('cue 2 tracking', "cmd('fixture 4 thru 6 at 80');cmd('store');cmd('clearall');return [STAGE.S.cues.length,Object.keys(STAGE.S.cues[1].s).length,O(1).dim,O(4).dim,ENG.cueOf(0)]",[2,3,.5,.8,1])
    step('goto cue 1 relâche', "cmd('goto cue 1');T(3);return [O(1).dim,O(4).dim,ENG.cueOf(0)]",[.5,0,0])
    step('go fondu', "cmd('go');T(1);const mid=O(4).dim;T(2);return [mid>0&&mid<.8,O(4).dim,O(1).dim]",[True,.8,.5])
    step('prog prioritaire', "cmd('fixture 1 at 10');cmd('goto cue 1');T(3);const a=O(1).dim;cmd('clearall');return [a,O(1).dim]",[.1,.5])
    step('seq 2 LTP', "cmd('store sequence \"Spe\"');cmd('fixture 1 at full');cmd('couleur bleu');cmd('store');cmd('clearall');const a=[ENG.sel,ENG.seqs()[1].cues.length,O(1).dim,O(1).color];cmd('go executor 1');T(3);a.push(O(1).dim);cmd('go executor 2');T(3);a.push(O(1).dim,O(1).color);return a",[1,1,1,'#2a4dff',.5,1,'#2a4dff'])
    step('master exec', "cmd('executor 2 at 50');return O(1).dim",.5)
    step('off exec 2', "cmd('executor 2 at full');cmd('off executor 2');T(.2);return [O(1).dim,O(1).color,ENG.cueOf(1)]",[.5,'#ff1e1e',-1])
    step('off exec 1', "cmd('select executor 1');cmd('goto cue 2');T(3);cmd('off');T(.2);return [O(1).dim,O(4).dim,ENG.cueOf(0),STAGE.UI.cue]",[0,0,-1,-1])
    step('update', "cmd('goto cue 1');T(3);cmd('fixture 2 at 20');const m=cmd('update');cmd('clearall');return [m.includes('mise à jour'),STAGE.S.cues[0].s[O(2).id].dim,O(2).dim]",[True,.2,.2])
    step('undo store', "const n=STAGE.S.cues.length;cmd('fixture 5 at 33');cmd('store cue 3');const a=STAGE.S.cues.length;STAGE.undo();T(.1);return [n,a,STAGE.S.cues.length,ENG.progCount().v>0]",[2,3,2,True])
    step('store vide', "cmd('clearall');return cmd('store').includes('Programmeur vide')",True)
    step('store look', "cmd('store look Tout');const c=STAGE.S.cues[STAGE.S.cues.length-1];return [c.name,Object.keys(c.s).length]",['Tout',6])
    step('label fade delete', "cmd('label cue 1 \"Intro\"');cmd('cue 1 fade 3');const a=[STAGE.S.cues[0].name,STAGE.S.cues[0].fade];cmd('delete cue 3');a.push(STAGE.S.cues.length);return a",['Intro',3,2])
    step('highlight', "cmd('fixture 6');cmd('highlight');T(.1);const a=STAGE.HIL.has(O(6).id);cmd('highlight');T(.1);return [a,STAGE.HIL.size,ENG.progCount().v]",[True,0,0])
    step('preset', "cmd('fixture 1 thru 3');cmd('preset 4.9');return [O(1).color,ENG.inProg(O(1).id,'color')]",['#2a4dff',True])
    step('group num', "cmd('clearall');cmd('group 2 at 40');return [O(4).dim,O(1).dim!==.4, STAGE.UI.sel.length]",[.4,True,3])
    step('store group', "cmd('fixture 1 + 6');cmd('store group \"Duo\"');return [O(1).grp,O(6).grp]",['Duo','Duo'])
    step('serialise', "const a=STAGE.serialize();const d=JSON.parse(a);STAGE.loadShow(JSON.parse(a));T(.1);return [d.xseq.length,!!d.prog,a===STAGE.serialize(),ENG.seqs().length,ENG.cueOf(0)]",[1,True,True,2,-1])
    step('atelier simple', "ENG.reset(true);mk(4);O(1).dim=.7;O(2).dim=.3;T(.1);STAGE.recCue(-1);T(.1);const a=[STAGE.S.cues.length,ENG.progCount().v,Object.keys(STAGE.S.cues[0].s).length];O(1).dim=.1;T(.1);STAGE.recCue(-1);O(1).dim=.9;T(.1);STAGE.goCue(0);T(3);a.push(O(1).dim,ENG.progCount().v);STAGE.goCue(1);T(3);a.push(O(1).dim);O(1).dim=.6;T(.1);STAGE.recCue(1);T(.1);a.push(STAGE.S.cues[1].s[O(1).id].dim,STAGE.S.cues.length);return a",[1,0,4,.7,0,.1,.6,2])
    step('auto', "STAGE.runAct('auto');T(.2);const a=STAGE.UI.cue;T(9);const b=STAGE.UI.cue;STAGE.runAct('auto');return [STAGE.UI.auto,a!==b]",[False,True])
    step('onglet console', "STAGE.UI.tab='con';O(1).dim=.2;T(.1);STAGE.render();const b=document.querySelector('[data-a=pclear]');const has=!!b;b&&b.click();T(.1);return [has,ENG.progCount().v]",[True,0])
    step('ancien projet', "ENG.reset(true);STAGE.loadShow(STAGE.demoShow());T(.2);const n=STAGE.S.cues.length;const r=[];for(let i=0;i<n;i++){STAGE.goCue(i);T(4);r.push(STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='lum'&&o.dim>.05).length)}return [n>2,r.every(x=>x>=0),r.some(x=>x>3),ENG.progCount().v]",[True,True,True,0])
    for c in ['oneman','danse','electro','diner','assisdb','debout']:
        step('config '+c, "APP.userConfig('%s');T(.3);STAGE.goCue(0);T(4);const a=STAGE.S.objs.filter(o=>STAGE.typeOf(o).cat==='lum'&&o.dim>.05).length;STAGE.goCue(1);T(4);return [STAGE.S.cues.length>1,a>0,ENG.progCount().v,STAGE.UI.cue]"%c,[True,True,0,1])
    step('rendu pupitre', "DESK.render();const d=document.querySelector('#desk');return [d.querySelectorAll('.ex').length>=1,d.querySelectorAll('[data-dc]').length>1,!!d.querySelector('[data-dk=clr]')]",[True,True,True])
    step('clic exec/go/off', "document.querySelector('[data-dxg=\"0\"]').click();T(.2);const a=ENG.cueOf(0);document.querySelector('[data-dxo=\"0\"]').click();T(.2);document.querySelector('[data-dk=addseq]').click();T(.1);const n=ENG.seqs().length;cmd('delete sequence 2');return [a>=0,ENG.cueOf(0),n,ENG.seqs().length]",[True,-1,2,1])
    step('IA record/go', "const t=AI.tools?AI.tools():null;return t?t.length:'n/a'")
    pg.screenshot(path='/home/claude/shots/desk_ma.png'); b.close()
