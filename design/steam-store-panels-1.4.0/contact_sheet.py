# claude:2026-10-25T10:19:00+01:00 - Kontaktbogen der sieben Store-Panels (zwei Spalten, wie 1.2.0).
# Aufruf: python -I contact_sheet.py  ->  _contact.jpg
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
names = ["01_skills", "02_combat", "03_world", "04_companions", "05_raid", "06_heroes", "07_idle"]
W, GAP = 585, 10
tiles = []
for n in names:
    im = Image.open(os.path.join(HERE, f"panel_{n}.png")).convert("RGB")
    tiles.append(im.resize((W, round(im.height * W / im.width)), Image.LANCZOS))
h = tiles[0].height
rows = (len(tiles) + 1) // 2
sheet = Image.new("RGB", (2 * W + 3 * GAP, rows * h + (rows + 1) * GAP), (28, 26, 30))
for i, t in enumerate(tiles):
    sheet.paste(t, (GAP + (i % 2) * (W + GAP), GAP + (i // 2) * (h + GAP)))
sheet.save(os.path.join(HERE, "_contact.jpg"), quality=90)
print("_contact.jpg", sheet.size)
