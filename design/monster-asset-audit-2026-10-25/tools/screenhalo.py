# claude:2026-10-25T10:30:19+01:00 — Monster-Asset-Audit 25.10.: read-only Zusatzmessung (aus dem Arbeitsstand übernommen).
import numpy as np
from pathlib import Path
from PIL import Image
from scipy import ndimage
D = Path(r"G:\GameDev\apps\client\src\renderer\assets\monsters")
def screen(p, H):
    im = Image.open(p).convert("RGBA")
    w = round(im.width * H / im.height)
    s = im.convert("RGBa").resize((w, H), Image.Resampling.LANCZOS)
    a = np.asarray(s).astype(np.float32)  # premultiplied
    return a[..., :3], a[..., 3] / 255.0
rows = []
for p in sorted(D.glob("*.webp")):
    res = [p.stem]
    for H in (420, 840):
        pm, al = screen(p, H)
        on_black = pm @ np.array([0.299, 0.587, 0.114], np.float32)          # premult = Komposit auf Schwarz
        on_light = on_black + (1 - al) * 210.0
        dist = ndimage.distance_transform_edt(~(al < 0.05))
        band = (al > 0.15) & (dist <= 2)
        core = (al > 0.95).astype(np.float32)
        loc = ndimage.uniform_filter(on_black * core, 9) / (ndimage.uniform_filter(core, 9) + 1e-6)
        halo_b = band & (on_black > 115) & (on_black > loc + 45)
        # dunkler Saum auf Hell: Kantenpixel auf Hell deutlich dunkler als das Innere
        loc_l = loc  # Inneres ist deckend -> gleich auf beiden Gruenden
        halo_d = band & (on_light < 90) & (on_light < loc_l - 45)
        nb = max(1, int(band.sum()))
        res += [round(100 * halo_b.sum() / nb, 2), round(100 * halo_d.sum() / nb, 2)]
    rows.append(res)
rows.sort(key=lambda r: -r[1])
print("id\thalo_black420%\tdark_on_light420%\thalo_black840%\tdark_on_light840%")
for r in rows:
    print("\t".join(map(str, r)))
