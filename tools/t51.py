import sys,json; sys.path.insert(0,'/home/claude/tools')
from h import *
with sync_playwright() as p:
    b,pg,errs=open_app(p,900,600,'basse'); pg.wait_for_function("window.AI && AI.MCPDEFS && window.VENUE",timeout=120000)
    T=pg.evaluate("AI.MCPDEFS()"); json.dump(T,open('/home/claude/local/mcp-tools.json','w'),ensure_ascii=False); print(len(T),[t['name'] for t in T][-8:],errs[:2]); b.close()
