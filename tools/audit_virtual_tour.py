#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen
import re, json, html

BASE='https://storage.net-fs.com/hosting/8161072/19/'
OUT=Path('audit/tour')
OUT.mkdir(parents=True,exist_ok=True)

def get(url):
    req=Request(url,headers={'User-Agent':'Mozilla/5.0 CampusNavigatorAudit/1.0'})
    with urlopen(req,timeout=30) as r:
        return r.read(), dict(r.headers), r.geturl()

body,headers,final=get(BASE)
(OUT/'index.html').write_bytes(body)
text=body.decode('utf-8','replace')
(OUT/'meta.json').write_text(json.dumps({'base':BASE,'final':final,'headers':headers},indent=2))

# Collect referenced JS/XML/JSON/config-like assets from the page.
refs=set()
for pat in [r'''(?:src|href)=["']([^"']+)["']''',r'''["']([^"']+\.(?:js|xml|json|txt|css))(?:\?[^"']*)?["']''']:
    for m in re.finditer(pat,text,re.I):
        u=urljoin(final,html.unescape(m.group(1)))
        if u.startswith('http'): refs.add(u)

manifest=[]
for i,u in enumerate(sorted(refs)):
    rec={'url':u}
    try:
        data,h,f=get(u); rec.update({'final':f,'size':len(data),'content_type':h.get('Content-Type','')})
        ext=Path(f.split('?',1)[0]).suffix.lower()
        if ext in {'.js','.xml','.json','.txt','.css','.html',''} and len(data)<5_000_000:
            name=f'{i:03d}_{Path(f.split("?",1)[0]).name or "asset.txt"}'
            (OUT/name).write_bytes(data)
            rec['file']=name
    except Exception as e:
        rec['error']=repr(e)
    manifest.append(rec)
(OUT/'assets.json').write_text(json.dumps(manifest,indent=2))

# Search downloaded textual assets for room/scene/deeplink clues.
needles=['B007','B014','EXAMS','TECH SUPPORT','FYi','FUTURES','TOILET','panorama','scene','node','startnode','startscene','deeplink','hash','tour.xml','pano']
hits=[]
for p in OUT.iterdir():
    if not p.is_file() or p.suffix.lower() not in {'.html','.js','.xml','.json','.txt','.css'}: continue
    s=p.read_text(errors='replace')
    for n in needles:
        for m in re.finditer(re.escape(n),s,re.I):
            hits.append({'file':p.name,'needle':n,'offset':m.start(),'context':s[max(0,m.start()-160):m.start()+360]})
            if len(hits)>500: break
        if len(hits)>500: break
    if len(hits)>500: break
(OUT/'hits.json').write_text(json.dumps(hits,indent=2))

# Pull likely tour config URLs embedded in scripts/index even if not normal refs.
urls=set(re.findall(r'''https?://[^"'\s)]+''',text))
for p in list(OUT.glob('*')):
    if p.suffix.lower() in {'.js','.html','.json'}:
        s=p.read_text(errors='replace')
        for m in re.finditer(r'''["']([^"']*(?:tour|skin|config|data)[^"']*\.(?:xml|json|js))["']''',s,re.I):
            urls.add(urljoin(BASE,m.group(1)))
(OUT/'candidate_urls.json').write_text(json.dumps(sorted(urls),indent=2))

print(json.dumps({
    'final':final,
    'refs':len(refs),
    'downloaded':sum(1 for x in manifest if 'file' in x),
    'hits':len(hits),
    'files':[x['file'] for x in manifest if 'file' in x][:30]
},indent=2))
