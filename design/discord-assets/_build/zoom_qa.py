# Zoom-Sichtpruefung markierter Quellen: 256 px auf Discord-Dunkel und Weiss (read-only).
# claude:2026-10-25T13:16:00+01:00 - Discord-Grafiken Alpha-QA, zweite Stufe (Augenschein der Messauffaelligkeiten).
import sys, os
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sources import A  # noqa: E402
names = sys.argv[2:]
out = sys.argv[1]
cw = 256
cols = 4
rows = (len(names) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (2 * cw + 6), rows * (cw + 6)), (0, 0, 0))
for i, rel in enumerate(names):
    im = Image.open(A + rel).convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    s = cw / max(im.size)
    im = im.convert("RGBa").resize((round(im.width * s), round(im.height * s)), Image.Resampling.LANCZOS).convert("RGBA")
    x, y = (i % cols) * (2 * cw + 6), (i // cols) * (cw + 6)
    for k, c in enumerate([(49, 51, 56), (255, 255, 255)]):
        t = Image.new("RGBA", (cw, cw), c + (255,))
        t.alpha_composite(im, ((cw - im.width) // 2, (cw - im.height) // 2))
        sheet.paste(t.convert("RGB"), (x + k * cw, y))
sheet.save(out, quality=90)
