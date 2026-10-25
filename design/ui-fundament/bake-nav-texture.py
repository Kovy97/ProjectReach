# claude:2026-10-25T18:03:00+01:00 — Chef-Knöpfe aus dem Knopf-Editor (design/ui-fundament/button-editor.html) als Kachel-Textur backen:
# Helligkeit, Kontrast, Sättigung und Tönung (multiply) werden eingerechnet (wie CSS filter in Chromium, sRGB),
# die Drehung nur in Vielfachen von 90° (sonst kachelt die Textur nicht nahtlos).
# Aufruf: python -I bake-nav-texture.py <quelle> <ziel.webp> <drehung> <helligkeit> <kontrast> <saettigung> <toenung_hex> <toenung_staerke>
# Beispiel 25.10. (Basalt): ... texture-basalt.webp texture-nav-basalt2.webp 180 1.03 1.04 1.67 3a2a14 0.26
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
rot = int(sys.argv[3]) % 360
br, ct, sa = (float(v) for v in sys.argv[4:7])
tint = np.array([int(sys.argv[7][i:i + 2], 16) for i in (0, 2, 4)]) / 255.0
ta = float(sys.argv[8])
assert rot % 90 == 0, "nur Vielfache von 90 Grad kacheln nahtlos"

a = np.asarray(Image.open(src).convert("RGB")).astype(np.float64) / 255.0
cl = lambda x: np.clip(x, 0.0, 1.0)
a = cl(a * br)
a = cl((a - 0.5) * ct + 0.5)
m = np.array([[0.213 + 0.787 * sa, 0.715 - 0.715 * sa, 0.072 - 0.072 * sa],
              [0.213 - 0.213 * sa, 0.715 + 0.285 * sa, 0.072 - 0.072 * sa],
              [0.213 - 0.213 * sa, 0.715 - 0.715 * sa, 0.072 + 0.928 * sa]])
a = cl(a @ m.T)
a = cl(a * (1 - ta) + a * tint * ta)
n = a.shape[0]
ys, xs = np.mgrid[0:n, 0:n]
# CSS rotate(θ) im Uhrzeigersinn: B(p) = tex(Rot(-θ) p)
if rot == 0:
    b = a
elif rot == 90:   # Rot(-90): (x, y) -> (y, -x)
    b = a[(-xs) % n, ys]
elif rot == 180:  # (x, y) -> (-x, -y)
    b = a[(-ys) % n, (-xs) % n]
else:             # 270: Rot(90): (x, y) -> (-y, x)
    b = a[xs, (-ys) % n]
Image.fromarray((b * 255 + 0.5).astype(np.uint8)).save(out, "WEBP", quality=92, method=6)
print("ok", out)
