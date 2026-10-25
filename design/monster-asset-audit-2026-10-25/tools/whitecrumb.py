# claude:2026-10-25T10:30:19+01:00 — Monster-Asset-Audit 25.10.: read-only Zusatzmessung (aus dem Arbeitsstand übernommen).
import numpy as np
from pathlib import Path
from PIL import Image
from scipy import ndimage
D = Path(r"G:\GameDev\apps\client\src\renderer\assets\monsters")
out = []
for p in sorted(D.glob("*.webp")):
    a = np.asarray(Image.open(p).convert("RGBA")).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3]
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    dist_t = ndimage.distance_transform_edt(~(al < 8))
    # lokale Motivhelligkeit: Mittel ueber 15x15 nur deckender Pixel
    op = (al >= 230).astype(np.float32)
    s = ndimage.uniform_filter(lum * op, 15); n = ndimage.uniform_filter(op, 15) + 1e-6
    local = s / n
    white = (al >= 96) & (rgb.min(axis=2) >= 190) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 40) & (dist_t <= 4)
    crumb = white & (local < 100)
    lab, nl = ndimage.label(crumb)
    # sichtbarkeitsgewichtet: Anteil an der Konturlaenge
    solid = al >= 128
    contour = int((solid & ~ndimage.binary_erosion(solid)).sum())
    out.append((p.stem, int(crumb.sum()), nl, round(1000 * crumb.sum() / max(1, contour), 1)))
out.sort(key=lambda t: -t[3])
print("id\tcrumb_px\tcomponents\tper_1000_contour")
import sys
for t in (out if len(sys.argv)<2 else [o for o in out if o[0] in sys.argv[1].split(",")]):
    print("\t".join(map(str, t)))
