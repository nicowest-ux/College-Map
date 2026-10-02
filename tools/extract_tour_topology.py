#!/usr/bin/env python3
from urllib.request import Request,urlopen
from pathlib import Path
import re,json
BASE='https://storage.net-fs.com/hosting/8161072/19/'
URL=BASE+'script_general.js?v=1763492747210'
req=Request(URL,headers={'User-Agent':'Mozilla/5.0 CampusNavigatorAudit/1.0'})
with urlopen(req,timeout=45) as r:data=r.read().decode('utf-8','replace')
out=Path('audit/tour-topology');out.mkdir(parents=True,exist_ok=True)
(out/'script_general.js').write_text(data,encoding='utf-8')
print('script_general bytes',len(data))
needles=['Panorama','HotspotPanorama','media-name','The FYi','Reception','The Quad','Sports Hall','Relish','The Frame','Cafe Six','Back foyer','Front foyer']
for n in needles:print(n, data.lower().count(n.lower()))
# Save useful snippets around panorama/hotspot constructors and target-like properties.
hits=[]
for pat in [r'HotspotPanorama',r'Panorama',r'playList',r'mediaName',r'media-name',r'target',r'toolTip']:
 for m in re.finditer(pat,data,re.I):
  hits.append({'pattern':pat,'offset':m.start(),'context':data[max(0,m.start()-240):m.start()+700]})
  if len(hits)>=400:break
 if len(hits)>=400:break
(out/'hits.json').write_text(json.dumps(hits,indent=2),encoding='utf-8')
# Extract quoted strings that look like human scene labels.
strings=re.findall(r'''["']([^"'\\]{3,90})["']''',data)
interesting=sorted(set(s for s in strings if any(k.lower() in s.lower() for k in ['foyer','fyi','reception','quad','sports','frame','relish','cafe','theatre','hall','link','gym','deli','focus'])))
print('interesting strings',len(interesting))
for s in interesting[:150]:print('STR',s)
