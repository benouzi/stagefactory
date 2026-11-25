# import de modèles 3D (.obj + .mtl, .stl, .glb) : unité demandée, axe du haut, couleurs, gardé dans le projet, mapping vidéo dessus
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ['SF_BLANK']='1'
from h import open_app, OUT
from playwright.sync_api import sync_playwright
from PIL import Image
bad=[]
def ok(c,m,x=''):
    print(('OK  ' if c else '!!  ')+m,str(x)[:600],flush=True)
    if not c: bad.append(m)
with sync_playwright() as p:
    b,pg,errs=open_app(p,1500,900); ev=pg.evaluate; pg.on('pageerror',lambda e:errs.append('pageerror '+str(e)[:300]))
    pg.wait_for_function("window.STAGE && window.DOCK && window.VIDEO && window.IMPORT3D",timeout=60000); pg.wait_for_timeout(1500)
    with pg.expect_file_chooser() as fc: ev("STAGE.runAct('import')")
    fc.value.set_files(['/tmp/m3/decor.obj','/tmp/m3/decor.mtl']); pg.wait_for_selector('#modal [data-i3=ok]',timeout=30000); pg.wait_for_timeout(300)
    tx=ev("document.querySelector('#modal').innerText").replace('\n',' ')
    ok('12 triangles' in tx and '2 couleurs' in tx and 'decor.mtl' in tx and ev("document.querySelector('#modal [data-i3=ok]').disabled") and '200,00 × 300,00 × 100,00 m' in tx and '2,00 × 3,00 × 1,00 m' in tx,'la fenêtre d\'import lit 12 triangles et 2 couleurs, montre la taille selon l\'unité (200 m en mètres, 2 m en centimètres) et n\'importe rien tant que l\'unité n\'est pas choisie',tx[:330])
    pg.check('#modal input[name=i3up][value=z]'); pg.wait_for_timeout(200); tx=ev("document.querySelector('#modal').innerText").replace('\n',' '); ok('2,00 × 1,00 × 3,00 m' in tx,'haut = axe Z : la taille en centimètres devient 2 × 1 × 3 m (largeur × profondeur × hauteur)',tx[tx.find('centimètres'):][:60])
    pg.check('#modal input[name=i3u][value=cm]'); pg.wait_for_timeout(200); pg.click('#modal [data-i3=ok]'); pg.wait_for_timeout(1500)
    Q="()=>{const o=STAGE.S.objs.find(o=>STAGE.typeOf(o).kind==='mesh3d'&&STAGE.typeOf(o).name==='decor');if(!o)return null;const t=STAGE.typeOf(o),r=STAGE.RT.get(o.id),bx=new APP.THREE.Box3().setFromObject(r.head),cols=[];r.head.traverse(m=>{if(m.isMesh&&m.material?.color)cols.push('#'+m.material.color.getHexString())});const z=v=>+v.toFixed(2);return {id:o.id,tid:t.id,size:t.size,noW:t.noW,src:t.model.src,tri:t.model.tri,min:bx.min.toArray().map(z),max:bx.max.toArray().map(z),cols:[...new Set(cols)].sort(),sel:STAGE.UI.sel.includes(o.id),sc:o.sc||1}}"
    q=ev(Q); ok(q and q['size']==[2,1,3] and q['min']==[-1,0,-.5] and q['max']==[1,3,.5] and q['noW'] and q['src']=={'file':'decor.obj','fmt':'obj','unit':'cm','up':'z'} and q['sel'],'le décor est posé au centre, debout (3 m de haut), sur sa base, à sa vraie taille ; poids inconnu ; l\'unité et l\'axe choisis sont gardés',q)
    ok(len(q['cols'])==2 and any(c.startswith('#1') or c[5:]>'c0' for c in q['cols']),'les deux couleurs du .mtl sont reprises (rouge et bleu)',q['cols'])
    ev("(()=>{STAGE.select([]);APP.camera.position.set(5,4,6);APP.orbit.target.set(0,1.5,0);APP.orbit.update()})()"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+'/t110-a.png',clip={'x':60,'y':45,'width':485,'height':515})
    # mapping vidéo dessus
    vid=ev("""(()=>{const T=APP.THREE,v=STAGE.place('vp12',{point:new T.Vector3(3,0,6),object:{userData:{}},face:null},true,{});v.pos=[3,2.5,6];v.hang=null;v.content='blanc';v.bright=.3;STAGE.unbuild(v.id);STAGE.build(v);STAGE.setLive(true);STAGE.touch();STAGE.tick(0);return v.id})()""")
    ev("(a)=>VIDEO.mapSet(STAGE.byId(a[0]),a[1])",[vid,q['id']]); m=ev("(a)=>{STAGE.tick(0);return {map:STAGE.byId(a[0]).map,n:(VIDEO.planes(a[1])||[]).length,info:STAGE.RT.get(a[0]).mapInfo}}",[vid,q['id']])
    ok(m['map']['mode']=='faces' and m['n']==6 and m['info']['faces']==2 and m['info']['box']==0,'mapping sur le modèle importé : ses 6 faces sont lues sur le .obj, les 2 tournées vers le projecteur reçoivent l\'image',m)
    S3="([x,y,z])=>{const v=new APP.THREE.Vector3(x,y,z).project(APP.camera),r=APP.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]}"
    pg.wait_for_timeout(1800); pg.screenshot(path=OUT+'/t110-b.png'); im=Image.open(OUT+'/t110-b.png').convert('L'); L=[im.getpixel(tuple(int(v) for v in ev(S3,q_))) for q_ in ([0,1.5,.5],[1,1.5,0],[1.6,0,1.2])]
    ok(min(L[:2])>60 and L[2]<min(L[:2])-40,'ses faces avant et cour sont éclairées, le sol à côté reste noir',L)
    # échelle, annulation légère, enregistrement
    ev("(id)=>{STAGE.select([id]);STAGE.UI.tab='prop';STAGE.render()}",q['id']); pg.wait_for_timeout(300); pg.fill('#console [data-k=sc]','0.5'); pg.dispatch_event('#console [data-k=sc]','input'); pg.wait_for_timeout(600); q2=ev(Q)
    ok(q2['sc']==.5 and q2['max']==[.5,1.5,.25],'échelle 0,5 dans la fiche : le décor fait 1 × 0,5 × 1,5 m',[q2['min'],q2['max']])
    h=ev("(()=>{const U=STAGE.hist().undo,full=STAGE.serialize().length;return {n:U.length,last:U[U.length-1].s.length,full,ref:U[U.length-1].s.includes('\"ref\"')}})()"); ok(h['ref'] and h['last']<h['full'],'un pas d\'annulation ne recopie pas le modèle (référence seulement), le fichier du projet, lui, le contient',h)
    pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); pg.keyboard.press('Control+z'); pg.wait_for_timeout(1000); q3=ev(Q); ok(q3 and q3['sc']==1 and q3['max']==[1,3,.5],'Ctrl+Z : l\'échelle revient à 1 et le modèle est toujours là, entier',[q3 and q3['max']])
    s=ev("STAGE.serialize()"); ev("(s)=>{STAGE.loadShow(JSON.parse(s));STAGE.tick(0)}",s); pg.wait_for_timeout(1200); q4=ev(Q); m4=ev("()=>{const v=STAGE.S.objs.find(o=>o.map);STAGE.tick(0);return v&&{ids:v.map.ids,info:STAGE.RT.get(v.id).mapInfo}}")
    ok(q4 and q4['max']==[1,3,.5] and len(q4['cols'])==2 and m4 and m4['info']['faces']==2,'projet enregistré puis rouvert : le décor importé revient avec ses couleurs, et le mapping dessus aussi',[q4 and q4['max'],m4])
    # .stl (millimètres, Z en haut) et .glb (mètres par sa norme), sans fenêtre
    st=ev("""async()=>{const t=await (await fetch('data:text/plain,')).text();return 0}""")
    import base64; stl=base64.b64encode(open('/tmp/m3/tetra.stl','rb').read()).decode()
    r=ev("async(b)=>{const f=new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],'tetra.stl');const t=await IMPORT3D.importFile(f,[f],{unit:'mm',up:'z'});return {size:t.size,tri:t.model.tri,planes:null}}",stl); pg.wait_for_timeout(600)
    ok(r['size']==[1,1,1.5] and r['tri']==4,'.stl d\'un tétraèdre de 1000 × 1000 × 1500 en millimètres, Z en haut : 1 × 1 × 1,5 m, 4 triangles',r)
    g=ev("""async()=>{const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js'),T=APP.THREE,m=new T.Mesh(new T.BoxGeometry(1,2,.5),new T.MeshStandardMaterial({color:0x22aa44}));m.position.set(5,1,0);const s=new T.Scene();s.add(m);s.updateMatrixWorld(true);
      const buf=await new Promise((res,rej)=>new GLTFExporter().parse(s,res,rej,{binary:true}));const f=new File([buf],'totem.glb');const p=IMPORT3D.importFile(f,[f]);await new Promise(r=>setTimeout(r,600));const tx=document.querySelector('#modal').innerText,dis=document.querySelector('#modal [data-i3=ok]').disabled,radios=document.querySelectorAll('#modal input[type=radio]').length;document.querySelector('#modal [data-i3=ok]').click();const t=await p;return {tx:tx.replace(/\\n/g,' ').slice(0,260),dis,radios,size:t.size,col:t.model.groups.map(g=>g.col)}}""")
    ok(g['size']==[1,.5,2] and not g['dis'] and g['radios']==0 and 'en mètres' in g['tx'] and g['col']==['#22aa44'],'.glb : en mètres par sa norme, donc aucune question — la fenêtre annonce 1 × 0,5 × 2 m et sa couleur est reprise',g)
    n=ev("STAGE.S.lib.filter(t=>t.kind==='mesh3d').length"); ok(n==3,'les trois modèles sont dans la bibliothèque du projet',n)
    # annuler la fenêtre n'importe rien
    r=ev("async(b)=>{const f=new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],'tetra2.stl');const p=IMPORT3D.importFile(f,[f]);await new Promise(r=>setTimeout(r,500));document.querySelector('#modal [data-i3=no]').click();return (await p)===null&&STAGE.S.lib.filter(t=>t.kind==='mesh3d').length}",stl); ok(r==3,'« Annuler » dans la fenêtre : rien n\'est importé',r)
    e=[x for x in errs if 'favicon' not in x]; ok(not e,'aucune erreur dans la console',e[:3])
    b.close()
print('fin', 'ECHECS: '+' | '.join(bad) if bad else 'tout passe')
