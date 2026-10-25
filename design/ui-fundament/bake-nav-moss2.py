# claude:2026-10-25 — Chef-Knopf "sidebar-moos-holz" (Knopf-Editor, 25.10.): Moos-Textur mit Farbfiltern und Toenung
# eingebacken, um 270 Grad gedreht (Vielfaches von 90 = nahtlos kachelbar). Ausgabe: texture-nav-moss2.webp
import sys
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float64) / 255.0
cl = lambda x: np.clip(x, 0.0, 1.0)
a = cl(a * 1.08)                      # brightness(1.08)
a = cl((a - 0.5) * 1.07 + 0.5)        # contrast(1.07)
s = 1.67                              # saturate(1.67), Matrix laut Filter-Effects-Spec (sRGB wie Chromium)
m = np.array([[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
              [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
              [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]])
a = cl(a @ m.T)
tint = np.array([0x3a, 0x2a, 0x14]) / 255.0  # #3a2a14, multiply, Deckkraft 0,26
a = cl(a * (1 - 0.26) + a * tint * 0.26)
n = a.shape[0]
# CSS rotate(270deg) im Uhrzeigersinn: B(x, y) = tex(-y mod N, x)  ->  B[y, x] = tex[x, (-y) mod N]
ys, xs = np.mgrid[0:n, 0:n]
b = a[xs, (-ys) % n]
Image.fromarray((b * 255 + 0.5).astype(np.uint8)).save(out, "WEBP", quality=92, method=6)
print("ok", out)
