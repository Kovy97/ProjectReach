# claude:2026-10-25T12:37:00+01:00 — Kontaktbogen: Bilder eines Ordners/Globs mit Dateinamen, feste Zellgröße.
# Aufruf: python -I contact.py <out.png> <cellW> <cellH> <cols> <glob> [<glob> ...]
import sys, glob, os
from PIL import Image, ImageDraw
out, cw, ch, cols = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
files = []
for g in sys.argv[5:]:
    files += sorted(glob.glob(g))
files = [f for f in files if not f.endswith(".md") and not f.endswith(".json")]
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cw, rows * (ch + 18)), (24, 22, 20))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGBA")
    im.thumbnail((cw, ch), Image.LANCZOS)
    x, y = (i % cols) * cw, (i // cols) * (ch + 18)
    bg = Image.new("RGBA", (cw, ch), (58, 42, 30, 255))
    bg.alpha_composite(im, ((cw - im.size[0]) // 2, (ch - im.size[1]) // 2))
    sheet.paste(bg.convert("RGB"), (x, y))
    d.text((x + 3, y + ch + 2), os.path.basename(f)[:40], fill=(230, 220, 190))
sheet.save(out)
print(out, len(files))
