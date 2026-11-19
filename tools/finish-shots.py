#!/usr/bin/env python3
"""Scale the raw CDP captures into screenshots/ as JPEGs and check the
gate's screenshot limits: 3-4 files, each <= 256 KiB, long side <= 1280,
short side >= 480."""
import json
import os
import sys

from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = "/tmp/gta-shots"
OUT = os.path.join(REPO, "screenshots")

with open(os.path.join(REPO, "shots.json")) as fh:
    shots = json.load(fh)

os.makedirs(OUT, exist_ok=True)
ok = True
for shot in shots:
    raw_path = os.path.join(RAW, shot["name"].replace(".jpg", ".png"))
    img = Image.open(raw_path).convert("RGB")
    target = tuple(shot["out"])
    if img.size != target:
        img = img.resize(target, Image.LANCZOS)
    dest = os.path.join(OUT, shot["name"])
    quality = 88
    while True:
        img.save(dest, "JPEG", quality=quality)
        size = os.path.getsize(dest)
        if size <= 262144 or quality <= 60:
            break
        quality -= 8
    w, h = img.size
    valid = size <= 262144 and max(w, h) <= 1280 and min(w, h) >= 480
    ok = ok and valid
    print(f"{shot['name']}: {w}x{h}, {size} bytes, quality {quality}, {'OK' if valid else 'INVALID'}")

print("ALL OK" if ok else "SOME INVALID")
sys.exit(0 if ok else 1)
