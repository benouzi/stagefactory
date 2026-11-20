# Assemble les fichiers des agents de recherche (research/*.json) en app/catalog-data.js, après contrôle : famille connue, types, bornes plausibles, pas de doublon.
import json, glob, re, sys, unicodedata, os
FAMS={'micro','enceinte','retour','sub','line','lyre-wash','lyre-spot','par','decoupe','fresnel','barre','fumee','videoproj','dalle-led','boitier','praticable'}
key=lambda b,m: re.sub(r'[^a-z0-9]+','',unicodedata.normalize('NFD',(b+' '+m)).encode('ascii','ignore').decode().lower())
num=lambda v: isinstance(v,(int,float)) and not isinstance(v,bool)
existing=set(sys.argv[1:])            # clés déjà dans catalog.js
out=[]; seen=set(existing); rej=[]; stats={}
for f in sorted(glob.glob('/home/claude/research/*.json')):
    try: rows=json.load(open(f,encoding='utf-8'))
    except Exception as e: rej.append((os.path.basename(f),'fichier illisible: '+str(e)[:80])); continue
    for r in rows if isinstance(rows,list) else []:
        why=None; b=str(r.get('brand') or '').strip(); m=str(r.get('model') or '').strip(); k=key(b,m)
        if not b or not m: why='sans marque ou modèle'
        elif r.get('fam') not in FAMS: why='famille inconnue '+str(r.get('fam'))
        elif k in seen: why='doublon'
        elif not str(r.get('src') or '').startswith('http'): why='sans source'
        if why: rej.append((b+' '+m,why)); continue
        c={'id':re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFD',(b+' '+m)).encode('ascii','ignore').decode().lower()).strip('-'),'brand':b,'model':m,'fam':r['fam'],'src':r['src'],'srcKind':r.get('srcKind') if r.get('srcKind') in ('fabricant','catalogue','copie','revendeur') else 'revendeur'}
        notes=[]
        w=r.get('w'); c['w']=w if num(w) and 0<w<5000 else None
        if w is not None and c['w'] is None: notes.append('poids écarté (valeur hors bornes)')
        d=r.get('dim'); c['dim']=[round(x,1) for x in d] if isinstance(d,list) and len(d)==3 and all(num(x) and 1<=x<=6000 for x in d) else None
        if d and c['dim'] is None: notes.append('dimensions écartées (incomplètes ou hors bornes)')
        if r['fam']=='praticable' and isinstance(d,list) and len(d)==3 and num(d[0]) and num(d[2]) and c['dim'] is None: c['plat']=[d[0],d[2]]; notes=[n for n in notes if not n.startswith('dimensions')]
        p=r.get('p'); c['p']=p if num(p) and 0<=p<=60000 else None
        o=r.get('over') if isinstance(r.get('over'),dict) else {}; ov={}
        if num(o.get('lumens')) and 10<=o['lumens']<=200000: ov['lumens']=o['lumens']
        z=o.get('zoom')
        if isinstance(z,list) and len(z)==2 and all(num(x) and 0.2<=x<=180 for x in z): ov['zoom']=[min(z),max(z)]
        md=o.get('modes')
        if isinstance(md,list):
            mm=[[str(x[0])[:40],int(x[1])] for x in md if isinstance(x,list) and len(x)==2 and num(x[1]) and 0<x[1]<=512]
            if mm: ov['modes']=mm[:12]
        for kk,lo,hi in (('spl',80,160),('hd',1,360),('vd',1,360)):
            if num(o.get(kk)) and lo<=o[kk]<=hi: ov[kk]=o[kk]
        rs=o.get('res')
        if isinstance(rs,list) and len(rs)==2 and all(num(x) and 300<=x<=10000 for x in rs): ov['res']=[int(rs[0]),int(rs[1])]
        th=o.get('throw')
        if isinstance(th,list) and len(th)==2 and all(num(x) and 0.1<=x<=30 for x in th): ov['throw']=[min(th),max(th)]
        if ov: c['over']=ov
        lum=r['fam'] in ('lyre-wash','lyre-spot','par','decoupe','fresnel','barre')
        if lum and 'zoom' not in ov: c['noZoom']=True
        if lum and 'lumens' not in ov: c['noLm']=True
        sp={str(a)[:40]:str(v)[:260] for a,v in (r.get('spec') or {}).items() if v not in (None,'')} if isinstance(r.get('spec'),dict) else {}
        if notes: sp['Remarque']=((sp.get('Remarque','')+' ') if sp.get('Remarque') else '')+' ; '.join(notes).capitalize()+'.'
        c['spec']=sp; out.append(c); seen.add(k); stats[b]=stats.get(b,0)+1
open('/home/claude/app/catalog-data.js','w',encoding='utf-8').write('// Fabriqué par tools/ingest.py depuis research/*.json (recherches des agents, valeurs lues sur des documents de fabricants). Ne pas modifier à la main.\nexport const DATA = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(out),'références gardées,',len(rej),'écartées'); print(dict(sorted(stats.items(),key=lambda x:-x[1])))
for x in rej[:40]: print('  écarté :',x)
