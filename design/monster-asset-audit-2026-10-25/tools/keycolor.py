# claude:2026-10-25T10:30:19+01:00 — Monster-Asset-Audit 25.10.: read-only Zusatzmessung (aus dem Arbeitsstand übernommen).
import sys, numpy as np
from pathlib import Path
from PIL import Image
D = Path(r"G:\GameDev\apps\client\src\renderer\assets\monsters")
rows = []
for p in sorted(D.glob("*.webp")):
    a = np.asarray(Image.open(p).convert("RGBA")).astype(np.int16)
    r, g, b, al = a[...,0], a[...,1], a[...,2], a[...,3]
    vis = al > 128
    mag = vis & (r > 170) & (b > 170) & (g < 100)
    grn = vis & (g > 170) & (r < 110) & (b < 110)
    cya = vis & (g > 160) & (b > 160) & (r < 90)
    wht = vis & (r > 235) & (g > 235) & (b > 235)
    # Schwach sichtbarer Dunst weit weg vom Motiv: alpha 6..60 in Pixeln > 40 px von deckendem Motiv
    from scipy import ndimage
    dist = ndimage.distance_transform_edt(~(al >= 128))
    haze = (al >= 6) & (al <= 60) & (dist > 40)
    rows.append((p.stem, int(mag.sum()), int(grn.sum()), int(cya.sum()), int(wht.sum()), int(haze.sum()), int(al[dist > 40].max()) if (dist > 40).any() else 0))
rows.sort(key=lambda t: -t[1])
print("id\tmagenta\tgreen\tcyan\twhite\thaze40\tmaxA_far")
for t in rows:
    if t[1] > 30 or t[2] > 30 or t[3] > 30 or t[4] > 300 or t[5] > 500 or t[6] > 40:
        print("\t".join(map(str, t)))
