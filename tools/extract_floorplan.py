#!/usr/bin/env python3
import csv, io, json, re, subprocess, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE = ROOT / "floorplan.png"
OUT = ROOT / "audit"
OUT.mkdir(exist_ok=True)

img = Image.open(IMAGE)
width, height = img.size

cmd = ["tesseract", str(IMAGE), "stdout", "--psm", "11", "tsv"]
proc = subprocess.run(cmd, check=True, text=True, capture_output=True)
rows = list(csv.DictReader(io.StringIO(proc.stdout), delimiter="\t"))

room_re = re.compile(r"\b([A-Z])\s*[- ]?\s*(\d{3})\b", re.I)
tokens = []
rooms = []
for row in rows:
    text = (row.get("text") or "").strip()
    if not text:
        continue
    try:
        conf = float(row.get("conf") or -1)
        left = int(row.get("left") or 0)
        top = int(row.get("top") or 0)
        w = int(row.get("width") or 0)
        h = int(row.get("height") or 0)
    except ValueError:
        continue
    item = {"text": text, "conf": conf, "left": left, "top": top, "width": w, "height": h,
            "cx": left + w / 2, "cy": top + h / 2}
    tokens.append(item)
    m = room_re.search(text.upper())
    if m:
        code = f"{m.group(1).upper()}{m.group(2)}"
        rooms.append({**item, "code": code})

# Catch split OCR tokens such as "B" + "014" on the same text line.
by_line = {}
for row in rows:
    text = (row.get("text") or "").strip()
    if not text:
        continue
    key = (row.get("block_num"), row.get("par_num"), row.get("line_num"))
    by_line.setdefault(key, []).append(row)

for line in by_line.values():
    line.sort(key=lambda r: int(r.get("left") or 0))
    for a, b in zip(line, line[1:]):
        ta = (a.get("text") or "").strip().upper()
        tb = (b.get("text") or "").strip().upper()
        if re.fullmatch(r"[A-Z]", ta) and re.fullmatch(r"\d{3}", tb):
            left = min(int(a["left"]), int(b["left"]))
            top = min(int(a["top"]), int(b["top"]))
            right = max(int(a["left"])+int(a["width"]), int(b["left"])+int(b["width"]))
            bottom = max(int(a["top"])+int(a["height"]), int(b["top"])+int(b["height"]))
            rooms.append({
                "code": ta + tb,
                "text": ta + " " + tb,
                "conf": min(float(a.get("conf") or -1), float(b.get("conf") or -1)),
                "left": left, "top": top, "width": right-left, "height": bottom-top,
                "cx": (left+right)/2, "cy": (top+bottom)/2
            })

# De-duplicate room candidates, favour higher confidence.
best = {}
for r in rooms:
    code = r["code"]
    cur = best.get(code)
    if cur is None or r["conf"] > cur["conf"]:
        best[code] = r

payload = {
    "image": {"width": width, "height": height},
    "room_candidates": sorted(best.values(), key=lambda r: (r["code"], -r["conf"])),
    "all_tokens": tokens,
}
(OUT / "floorplan-ocr.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
print(f"image={width}x{height} room_candidates={len(best)} tokens={len(tokens)}")
for r in payload["room_candidates"]:
    print(f'{r["code"]}\tconf={r["conf"]:.1f}\tcx={r["cx"]:.1f}\tcy={r["cy"]:.1f}')
