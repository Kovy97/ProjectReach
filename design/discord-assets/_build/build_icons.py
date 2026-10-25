# Grim Reach Discord-Grafiken: Emojis (128), Rollen-Symbole (64), Sticker (320) und die Kronen-Freistellung
# fuer das Server-Symbol. Nur Bestandsbilder, Spiel-Assets werden nur gelesen.
# claude:2026-10-25T13:17:00+01:00 - Chef-Auftrag 25.10. (Discord-Server Heartforge Studios).
# Aufruf: python -I build_icons.py   (danach build_pages.py + render_pages.mjs fuer die HTML-Teile)
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sources import A, F, EMOJIS, ROLES, STICKERS  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, ".."))
TMP = os.path.join(HERE, "_tmp")
for d in ("emojis", "roles", "stickers"):
    os.makedirs(os.path.join(ROOT, d), exist_ok=True)
os.makedirs(TMP, exist_ok=True)
LANC = Image.Resampling.LANCZOS


def trimmed(rel):
    im = Image.open(A + rel).convert("RGBA")
    return im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())


def scale_pm(im, w, h):
    """Skalieren im vormultiplizierten Raum, damit keine dunklen/hellen Raender entstehen."""
    return im.convert("RGBa").resize((max(1, round(w)), max(1, round(h))), LANC).convert("RGBA")


def fit(im, size, margin):
    box = size - 2 * margin
    s = box / max(im.size)
    sm = scale_pm(im, im.width * s, im.height * s)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(sm, ((size - sm.width) // 2, (size - sm.height) // 2))
    return out


def gold_text(text, font_px, stroke=5, font="Cinzel-Regular.ttf"):
    """Gesetzter Schriftzug: Gold-Verlauf mit dunkler Kontur (fuer gr_gg und Sticker-Zeilen)."""
    f = ImageFont.truetype(F + font, font_px)
    l, t, r, b = f.getbbox(text, stroke_width=stroke)
    w, h = r - l + 4, b - t + 4
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text((2 - l, 2 - t), text, font=f, fill=255)
    outline = Image.new("L", (w, h), 0)
    ImageDraw.Draw(outline).text((2 - l, 2 - t), text, font=f, fill=255, stroke_width=stroke, stroke_fill=255)
    grad = Image.new("RGBA", (w, h))
    top, bot = (250, 236, 186), (196, 140, 58)
    gd = ImageDraw.Draw(grad)
    for y in range(h):
        k = y / max(1, h - 1)
        gd.line([(0, y), (w, y)], fill=tuple(round(top[i] + (bot[i] - top[i]) * k) for i in range(3)) + (255,))
    out = Image.new("RGBA", (w, h), (28, 17, 9, 0))
    dark = Image.new("RGBA", (w, h), (28, 17, 9, 255))
    out.paste(dark, (0, 0), outline)
    out.paste(grad, (0, 0), mask)
    return out


# ------------------------------------------------------------------ Emojis 128 x 128
for name, rel in EMOJIS.items():
    fit(trimmed(rel), 128, 2).save(os.path.join(ROOT, "emojis", name + ".png"), optimize=True)
gg = gold_text("GG", 120, stroke=7)
fit(gg, 128, 3).save(os.path.join(ROOT, "emojis", "gr_gg.png"), optimize=True)

# ------------------------------------------------------------------ Rollen-Symbole 64 x 64
for name, rel in ROLES.items():
    fit(trimmed(rel), 64, 1).save(os.path.join(ROOT, "roles", name + ".png"), optimize=True)


# ------------------------------------------------------------------ Sticker 320 x 320 (Stanzkontur)
def sticker(rel, caption, out_name, fig_h=214):
    canvas = Image.new("RGBA", (320, 320), (0, 0, 0, 0))
    fig = trimmed(rel)
    s = min(fig_h / fig.height, 276 / fig.width)
    fig = scale_pm(fig, fig.width * s, fig.height * s)
    canvas.alpha_composite(fig, ((320 - fig.width) // 2, 16 + (fig_h - fig.height)))
    txt = gold_text(caption, 74, stroke=6)
    if txt.width > 270:
        txt = scale_pm(txt, 270, txt.height * 270 / txt.width)
    canvas.alpha_composite(txt, ((320 - txt.width) // 2, 302 - txt.height))
    # Stanzkontur in Pergamentton um Figur und Schrift (Sticker-Optik, lesbar auf Hell und Dunkel)
    a = canvas.getchannel("A").point(lambda v: 255 if v > 70 else 0)
    # runde Dilatation (Unschaerfe + Schwelle) statt MaxFilter, sonst wird die Kontur treppig
    ring = a.filter(ImageFilter.GaussianBlur(5)).point(lambda v: 255 if v > 18 else 0).filter(ImageFilter.GaussianBlur(1.1))
    rim = a.filter(ImageFilter.GaussianBlur(7)).point(lambda v: 255 if v > 12 else 0).filter(ImageFilter.GaussianBlur(1.1))
    out = Image.new("RGBA", (320, 320), (0, 0, 0, 0))
    out.paste(Image.new("RGBA", (320, 320), (40, 26, 14, 255)), (0, 0), rim)
    out.paste(Image.new("RGBA", (320, 320), (239, 226, 194, 255)), (0, 0), ring)
    out.alpha_composite(canvas)
    out.save(os.path.join(ROOT, "stickers", out_name + ".png"), optimize=True)


sticker(STICKERS["sticker_gg"], "GG", "sticker_gg")
sticker(STICKERS["sticker_loot"], "LOOT!", "sticker_loot", fig_h=200)
sticker(STICKERS["sticker_afk"], "AFK", "sticker_afk")

# ------------------------------------------------------------------ Krone aus dem gemalten Logo (fuer server-icon_crown)
logo = Image.open(A + "ui/mainmenu_logo_painterly.webp").convert("RGBA")
X0, X1, Y1 = 690, 1280, 396
crown = logo.crop((X0, 0, X1, Y1))
alpha = crown.getchannel("A")
# Maske: Kronenzacken oben voll; Querband zu den Seiten weich ausblenden; unten nur die Kristall-Spitze
# (Dreieck) behalten, damit keine Buchstabenkanten des Schriftzugs als harte Linie mitkommen.
fade = Image.new("L", crown.size, 0)
fdraw = ImageDraw.Draw(fade)
fdraw.rectangle((0, 0, crown.width, 330), fill=255)
fdraw.polygon([(880 - X0, 330), (1090 - X0, 330), (985 - X0, 392)], fill=255)
side = Image.new("L", crown.size, 255)
sd = side.load()
for x in range(crown.width):
    gx = x + X0
    k = 1.0
    if gx < 830:
        k = max(0.0, (gx - 700) / 130)
    elif gx > 1140:
        k = max(0.0, (1270 - gx) / 130)
    v = round(255 * k * k * (3 - 2 * k))
    for y in range(250, crown.height):
        sd[x, y] = v
fade = fade.filter(ImageFilter.GaussianBlur(3))
m = np.minimum(np.minimum(np.asarray(alpha), np.asarray(fade)), np.asarray(side))
crown.putalpha(Image.fromarray(m))
crown = crown.crop(crown.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox())
crown.save(os.path.join(TMP, "crown.png"))
print("Icons gebaut:", len(EMOJIS) + 1, "Emojis,", len(ROLES), "Rollen, 3 Sticker, Krone", crown.size)
