# Kontaktbogen aller Discord-Grafiken auf Discord-Dunkel (#313338) und Discord-Hell (#ffffff).
# claude:2026-10-25T13:17:00+01:00 - Chef-Auftrag 25.10. Aufruf: python -I contact_sheet.py -> ../_contact.jpg
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sources import F  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, ".."))
LANC = Image.Resampling.LANCZOS
W = 1240


def load(rel):
    return Image.open(os.path.join(ROOT, rel)).convert("RGBA")


def small(im, w, h=None):
    h = h or round(im.height * w / im.width)
    return im.convert("RGBa").resize((w, h), LANC).convert("RGBA")


def circle(im, d):
    im = small(im, d, d)
    m = Image.new("L", (d * 4, d * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=255)
    out = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    out.paste(im, (0, 0), m.resize((d, d), LANC))
    return out


def block(bgc, ink):
    title = ImageFont.truetype(F + "Cinzel-Regular.ttf", 26)
    lab = ImageFont.truetype(F + "Cinzel-Regular.ttf", 15)
    H = 3020
    img = Image.new("RGBA", (W, H), bgc + (255,))
    d = ImageDraw.Draw(img)
    y = 20

    def head(t):
        nonlocal y
        d.text((24, y), t, font=title, fill=ink)
        y += 42

    head("Server-Symbol (rund beschnitten, 160 / 48 / 32 px)")
    for i, n in enumerate(["crown", "logo", "hearth"]):
        im = load(f"server/server-icon_{n}.png")
        x = 24 + i * 300
        img.alpha_composite(circle(im, 160), (x, y))
        img.alpha_composite(circle(im, 48), (x + 175, y + 20))
        img.alpha_composite(circle(im, 32), (x + 235, y + 28))
        d.text((x, y + 166), f"server-icon_{n}", font=lab, fill=ink)
    y += 200
    head("Server-Banner 960x540 und Einladungs-Hintergrund 1920x1080")
    for i, f in enumerate(["server/server-banner_highlands.png", "server/server-banner_dusk.png"]):
        img.alpha_composite(small(load(f), 580), (24 + i * 600, y))
        d.text((24 + i * 600, y + 330), os.path.basename(f), font=lab, fill=ink)
    y += 360
    for i, f in enumerate(["server/invite-background_highlands.png", "server/invite-background_war-table.png"]):
        img.alpha_composite(small(load(f), 580), (24 + i * 600, y))
        d.text((24 + i * 600, y + 330), os.path.basename(f), font=lab, fill=ink)
    y += 360
    head("Kanal-Kopfbilder 1200x300 (hier 580 px breit, wie im Chat)")
    hs = sorted(glob.glob(os.path.join(ROOT, "headers", "*.png")))
    for i, f in enumerate(hs):
        x, yy = 24 + (i % 2) * 600, y + (i // 2) * 175
        img.alpha_composite(small(Image.open(f).convert("RGBA"), 580), (x, yy))
    y += 5 * 175 + 10
    head("Rollen-Symbole 64x64 (und 20 px neben dem Namen)")
    rs = sorted(glob.glob(os.path.join(ROOT, "roles", "*.png")))
    for i, f in enumerate(rs):
        im = Image.open(f).convert("RGBA")
        x, yy = 24 + (i % 4) * 300, y + (i // 4) * 90
        img.alpha_composite(im, (x, yy))
        name = os.path.basename(f)[5:-4].replace("_", " ").title()
        d.text((x + 74, yy + 22), name, font=lab, fill=ink)
        img.alpha_composite(small(im, 20, 20), (x + 74 + int(d.textlength(name, font=lab)) + 6, yy + 21))
    y += 190
    head("Emojis 128x128 (gezeigt in 48 px und 22 px)")
    es = sorted(glob.glob(os.path.join(ROOT, "emojis", "*.png")))
    for i, f in enumerate(es):
        im = Image.open(f).convert("RGBA")
        x, yy = 24 + (i % 5) * 240, y + (i // 5) * 78
        img.alpha_composite(small(im, 48, 48), (x, yy))
        img.alpha_composite(small(im, 22, 22), (x + 54, yy + 13))
        d.text((x + 82, yy + 15), ":" + os.path.basename(f)[:-4] + ":", font=lab, fill=ink)
    y += ((len(es) + 4) // 5) * 78 + 14
    head("Sticker 320x320 (hier 200 px)")
    ss = sorted(glob.glob(os.path.join(ROOT, "stickers", "*.png")))
    for i, f in enumerate(ss):
        img.alpha_composite(small(Image.open(f).convert("RGBA"), 200, 200), (24 + i * 260, y))
        d.text((24 + i * 260, y + 204), os.path.basename(f)[:-4], font=lab, fill=ink)
    y += 240
    return img.crop((0, 0, W, y))


dark = block((49, 51, 56), (235, 222, 190))
light = block((255, 255, 255), (60, 40, 22))
sheet = Image.new("RGB", (W * 2, max(dark.height, light.height)), (0, 0, 0))
sheet.paste(dark.convert("RGB"), (0, 0))
sheet.paste(light.convert("RGB"), (W, 0))
sheet.save(os.path.join(ROOT, "_contact.jpg"), quality=86)
print("_contact.jpg", sheet.size)
