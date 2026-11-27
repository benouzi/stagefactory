# 4.64.0 — vidéo : rapport (tableau de tous les projecteurs) et gabarits de mapping (un PNG + un SVG par projecteur, à sa définition), dans un zip.
import sys,os,io,zipfile; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:500],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.VIDEO",timeout=60000); pg.wait_for_timeout(1500)
    vid=ev("""(()=>{const T=APP.THREE,at=(x,y,z)=>({point:new T.Vector3(x,y,z),object:{userData:{}},face:null});STAGE.loadShow({name:'Essai rapport',objs:[],cues:[],lib:STAGE.S.lib,follow:false});
      const s=STAGE.place('ecran',at(0,0,-3),true,{}); s.pos=[0,1,-3]; const v=STAGE.place('vp12',at(0,0,6),true,{}); v.pos=[0,2.5,6]; v.hang=null; v.content='blanc'; v.bright=.5;
      for(const o of [s,v]){STAGE.unbuild(o.id);STAGE.build(o)} STAGE.setLive(true); STAGE.touch(); STAGE.tick(0); VIDEO.grid(v,VIDEO.scrOf(v),3,1,15); STAGE.select([v.id]); return v.id})()""")
    pg.wait_for_timeout(1200)
    R=ev("async()=>{const r=await VIDEO.report({save:false});return {rows:r.rows,files:r.files,sizes:r.sizes,templates:r.templates,html:r.html.length,warp:STAGE.S.objs.filter(o=>o.bg).map(o=>({id:o.id,warp:o.warp,res:STAGE.typeOf(o).res,bl:[o.bll,o.blr]}))}}")
    rows=R['rows']; ok(len(rows)==3 and all(q['raccord'].startswith('3 × 1') and q['ovl']==15 for q in rows),'trois lignes, une par projecteur du raccord',[q['raccord'] for q in rows])
    q=rows[0]; res=R['warp'][0]['res']; w0=R['warp'][0]['warp']; span=(abs(w0[1][0]-w0[0][0])+abs(w0[2][0]-w0[3][0]))/2*res[0]; ok(abs(q['px']-q['W']/span*1000)<.03 and q['px']>q['W']/res[0]*1000*1.2 and q['lux']>50 and 5<q['dist']<12 and q['lum']==50 and abs(q['lux']-12000*.5*q['used']/100/(q['W']*q['H']))<3,'mesures : distance, taille d\'image, lux, taille du pixel (largeur d\'image ÷ pixels réellement utilisés)',{k:q[k] for k in ('dist','W','H','lux','px','rapport','used')})
    f=R['files']; ok('rapport-video.html' in f and 'rapport-video.csv' in f and sum(1 for x in f if x.endswith('.png'))==3 and sum(1 for x in f if x.endswith('.svg'))==3,'fichiers : rapport HTML, tableau CSV, trois gabarits PNG et SVG',f)
    T={t['id']:t for t in R['templates']}; e=[]
    for w in R['warp']:
        t=T[w['id']]; scr=[z for z in t['pts'] if not z['name'].startswith('fondu')][0]['px']; exp=[[round(c[0]*w['res'][0]),round((1-c[1])*w['res'][1])] for c in w['warp']]; e.append(max(abs(a-b2) for P,Q in zip(scr,exp) for a,b2 in zip(P,Q)))
        nf=sum(1 for z in t['pts'] if z['name'].startswith('fondu')); e.append(0 if nf==sum(1 for v in w['bl'] if v) else 99)
    ok(max(e)<=1 and all(t['W']==res[0] and t['H']==res[1] for t in T.values()),'gabarits à la définition du projecteur : coins de sa case en pixels (= réglage 4 coins), autant de zones de fondu que de côtés intérieurs',e)
    # geste réel : bouton de la fiche, fichier téléchargé
    ev("(id)=>{STAGE.select([id]);APP.toggleConsole(true);STAGE.UI.tab='prop';STAGE.render()}",vid); pg.wait_for_timeout(600)
    with pg.expect_download(timeout=60000) as d: pg.click('#console button[data-vp=report]')
    path=OUT+'/t145-rapport.zip'; d.value.save_as(path); z=zipfile.ZipFile(path); names=z.namelist()
    ok(d.value.suggested_filename=='StageFactory-rapport-video.zip' and len(names)==8,'bouton « Rapport vidéo et gabarits (zip) » : le zip se télécharge avec ses 8 fichiers',names)
    png=[n for n in names if n.endswith('.png')][1]; im=Image.open(io.BytesIO(z.read(png))); im.save(OUT+'/t145-gabarit.png'); ok(list(im.size)==res,'le PNG du gabarit a la définition du projecteur',im.size)
    px=im.convert('RGB'); cols=px.getcolors(maxcolors=1<<20); has=lambda c:any(abs(k[0]-c[0])<40 and abs(k[1]-c[1])<40 and abs(k[2]-c[2])<40 and n>50 for n,k in cols); ok(has((53,208,255)) and has((0,0,0)),'on y voit le contour bleu de la case sur fond noir',len(cols))
    html=z.read('rapport-video.html').decode(); open(OUT+'/t145-rapport.html','w').write(html); csv=z.read('rapport-video.csv').decode('utf-8-sig')
    ok('Rapport vidéo — Essai rapport' in html and html.count('<img ')==3 and 'Définition du contenu' in html and csv.count('\n')==3 and 'Pixel (mm)' in csv,'rapport lisible : titre du projet, tableau des écrans, trois gabarits ; CSV de 3 lignes',[html.count('<tr>'),csv[:80]])
    for n in names: z.extract(n,OUT+'/t145')
    pg2=b.new_page(viewport={'width':1300,'height':1500}); pg2.goto('file://'+OUT+'/t145/rapport-video.html'); pg2.wait_for_timeout(1500); pg2.screenshot(path=OUT+'/t145-rapport.png'); bro=pg2.evaluate("[...document.images].filter(i=>!i.naturalWidth).length"); ok(bro==0,'le rapport ouvert dans un navigateur affiche ses gabarits',bro)
    ok(not errs,'aucune erreur de console',errs[:3]); b.close()
print('\nt145 :', 'TOUT BON' if not bad else str(len(bad))+' échec(s) : '+' | '.join(bad))
