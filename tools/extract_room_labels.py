#!/usr/bin/env python3
import csv, io, json, re, subprocess
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
IMG=ROOT/'floorplan.png'
DATA=ROOT/'data.js'
OUT=ROOT/'audit'
OUT.mkdir(exist_ok=True)

img=Image.open(IMG).convert('RGB')
W,H=img.size

# Current floor diagram bounds from data.js. Coordinates are [y,x].
FLOORS={
 'Ribble|G':[[255,430],[1090,700]],'Ribble|1':[[610,125],[1320,460]],'Ribble|2':[[900,0],[1527,250]],
 'Calder|G':[[750,430],[1125,1130]],'Calder|1':[[1070,180],[1415,930]],'Calder|2':[[1300,170],[1527,780]],
 'Medlock|G':[[760,1040],[1130,1610]],'Medlock|1':[[1060,900],[1410,1420]],'Medlock|2':[[1300,700],[1527,1165]],
 'Alt|G':[[400,800],[850,1380]],'Alt|1':[[200,760],[650,970]],
 'Brock|G':[[380,1080],[880,1810]],'Brock|1':[[0,1450],[550,2020]],
 'Holland|LG':[[0,1200],[240,1510]],'Holland|G':[[40,950],[390,1510]],
 'Wyre|G':[[500,1500],[1120,1870]],'Wyre|1':[[0,1740],[790,2145]],'Wyre|2':[[0,1930],[520,2260]],
 'Sports Hall|G':[[760,1880],[1320,2260]],'Sports Hall|1':[[760,1870],[1320,2040]]
}

data=DATA.read_text(encoding='utf-8')
defs_block=data[data.index("const defs="):data.index("const verified=")]
known=set(re.findall(r"'([A-Z]\d{3}[a-zA-Z]?)'",defs_block))
known_upper={x.upper():x for x in known}

def ocr(im, psm=11):
    proc=subprocess.run(
        ['tesseract','stdin','stdout','--psm',str(psm),'tsv'],
        input=im.tobytes(), capture_output=True
    )
    # tesseract stdin needs an encoded image; retry using temp image below if this fails.
    return proc

def ocr_file(im, name, psm=11):
    tmp=OUT/f'{name}.png'
    im.save(tmp)
    proc=subprocess.run(['tesseract',str(tmp),'stdout','--psm',str(psm),'tsv'],text=True,capture_output=True,check=True)
    return list(csv.DictReader(io.StringIO(proc.stdout),delimiter='\t'))

def prep(crop, scale=3):
    g=ImageOps.grayscale(crop)
    g=ImageOps.autocontrast(g)
    g=ImageEnhance.Contrast(g).enhance(1.7)
    g=g.resize((g.width*scale,g.height*scale),Image.Resampling.LANCZOS)
    g=g.filter(ImageFilter.SHARPEN)
    return g

room_pat=re.compile(r'\b([A-Z])\s*[- ]?\s*(\d{3})([A-Z]?)\b',re.I)
candidates=[]

def collect(rows, floor_key, ox, oy, scale, source):
    # exact-token matches
    for row in rows:
        txt=(row.get('text') or '').strip().upper()
        if not txt: continue
        try:
            conf=float(row.get('conf') or -1)
            left=float(row.get('left') or 0); top=float(row.get('top') or 0)
            wid=float(row.get('width') or 0); hei=float(row.get('height') or 0)
        except Exception:
            continue
        m=room_pat.search(txt)
        if not m: continue
        raw=(m.group(1)+m.group(2)+m.group(3)).upper()
        if raw not in known_upper: continue
        code=known_upper[raw]
        cx=ox+(left+wid/2)/scale; cy=oy+(top+hei/2)/scale
        candidates.append(dict(code=code,floor=floor_key,x=round(cx,1),y=round(cy,1),conf=round(conf,1),source=source,text=txt))

    # split tokens like "C" + "112" on the same OCR line
    lines={}
    for row in rows:
        txt=(row.get('text') or '').strip().upper()
        if not txt: continue
        key=(row.get('block_num'),row.get('par_num'),row.get('line_num'))
        lines.setdefault(key,[]).append(row)
    for line in lines.values():
        line.sort(key=lambda r:float(r.get('left') or 0))
        for i in range(len(line)-1):
            a,b=line[i],line[i+1]
            ta=(a.get('text') or '').strip().upper(); tb=(b.get('text') or '').strip().upper()
            raw=None
            if re.fullmatch(r'[A-Z]',ta) and re.fullmatch(r'\d{3}[A-Z]?',tb): raw=ta+tb
            elif re.fullmatch(r'[A-Z]\d?',ta) and re.fullmatch(r'\d{2,3}[A-Z]?',tb): raw=ta+tb
            if not raw or raw not in known_upper: continue
            code=known_upper[raw]
            try:
                conf=min(float(a.get('conf') or -1),float(b.get('conf') or -1))
                l=min(float(a['left']),float(b['left'])); t=min(float(a['top']),float(b['top']))
                r=max(float(a['left'])+float(a['width']),float(b['left'])+float(b['width']))
                bot=max(float(a['top'])+float(a['height']),float(b['top'])+float(b['height']))
            except Exception: continue
            cx=ox+((l+r)/2)/scale; cy=oy+((t+bot)/2)/scale
            candidates.append(dict(code=code,floor=floor_key,x=round(cx,1),y=round(cy,1),conf=round(conf,1),source=source+'-split',text=ta+' '+tb))

# OCR every floor crop at multiple preprocessing variants.
for key,bounds in FLOORS.items():
    (y1,x1),(y2,x2)=bounds
    crop=img.crop((x1,y1,x2,y2))
    for scale,variant in [(3,'contrast'),(4,'large')]:
        prepared=prep(crop,scale)
        rows=ocr_file(prepared,key.replace('|','_')+'_'+variant,11)
        collect(rows,key,x1,y1,scale,'crop-'+variant)

# Whole sheet OCR catches labels near the edges of floorView bounds.
whole=prep(img,2)
rows=ocr_file(whole,'whole',11)
collect(rows,'whole',0,0,2,'whole')

# Score and select best candidate that lies inside the room's expected floor diagram.
room_floor={}
for key in FLOORS:
    bldg,floor=key.split('|')
    m=re.search(re.escape("'"+key+"'")+r":\[([^\]]+)\]",defs_block)
    if m:
        for code in re.findall(r"'([^']+)'",m.group(1)): room_floor[code]=key

def inside(c,key,pad=28):
    if key not in FLOORS:return True
    (y1,x1),(y2,x2)=FLOORS[key]
    return y1-pad<=c['y']<=y2+pad and x1-pad<=c['x']<=x2+pad

best={}
all_by={}
for c in candidates:
    expected=room_floor.get(c['code'])
    if expected and not inside(c,expected): continue
    # Reward crop OCR in the expected floor and confidence.
    score=c['conf']+(22 if c['floor']==expected else 0)+(5 if c['source'].startswith('crop') else 0)
    c['score']=round(score,1);c['expectedFloor']=expected
    all_by.setdefault(c['code'],[]).append(c)
    if c['code'] not in best or score>best[c['code']]['score']:best[c['code']]=c

# Flag ambiguous detections when another candidate is similarly strong but far away.
for code,c in best.items():
    alts=sorted(all_by.get(code,[]),key=lambda x:x['score'],reverse=True)
    ambiguous=False
    if len(alts)>1 and alts[1]['score']>=c['score']-6:
        dist=((alts[1]['x']-c['x'])**2+(alts[1]['y']-c['y'])**2)**0.5
        if dist>45: ambiguous=True
    c['ambiguous']=ambiguous
    c['usable']=c['score']>=45 and not ambiguous

payload={
 'image':{'width':W,'height':H},
 'knownRooms':len(known),
 'detected':len(best),
 'usable':sum(1 for c in best.values() if c['usable']),
 'positions':{code:best[code] for code in sorted(best)},
}
(OUT/'room-label-positions.json').write_text(json.dumps(payload,indent=2),encoding='utf-8')
print(json.dumps({k:payload[k] for k in ['knownRooms','detected','usable']},indent=2))
for code,c in payload['positions'].items():
    if c['usable']: print(f"{code}\t{c['expectedFloor']}\t[{c['y']},{c['x']}]\tconf={c['conf']} score={c['score']} {c['source']}")
