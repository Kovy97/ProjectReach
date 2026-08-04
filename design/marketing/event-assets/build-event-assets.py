# -*- coding: utf-8 -*-
"""
Grim Reach — Steam-Event-Key-Art "The Champions Update" (AppID 4915450).
Komponiert die 2 Event-Grafik-Slots aus echten Spiel-Assets, KEIN KI-Text —
alle Typo wird gesetzt (Cinzel). Regenerieren: `python build-event-assets.py`.

Steam-Slots (verifiziert 2026-07-23,
https://partner.steamgames.com/doc/store/assets/eventassets):
  event_cover.png   800 x 450   "Cover Image" (Pflicht; Store-Listen, Library)
  event_header.png  1920 x 622  "Header Image" (empfohlen; Kopf der Event-Seite)
Hinweis: Ein "Spotlight" 2108x460 ist ein Sale-Page-Asset, KEIN Event-Slot.

Technik wie design/marketing/store-panels/build-panels.py:
  2x-Supersampling, Cinzel-TTF aus dem Repo, Gold-Palette aus design-system.css.
Kulisse: battlescreens/crypt.webp (abgedunkelt, leicht unscharf, Vignette+Scrim).
Motiv: elite_black_wolf + elite_border_warlock + elite_ash_vulture als Trio
mit weichem Bodenschatten (wie panel_worldfightsback).
"""

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
import os

ROOT = r"G:\GameDev"
R = os.path.join(ROOT, r"apps\client\src\renderer")
A = os.path.join(R, "assets")
OUT = os.path.join(ROOT, r"design\marketing\event-assets")

FONT_DISPLAY = os.path.join(R, "fonts", "Cinzel-Regular.ttf")
BACKDROP = os.path.join(A, "battlescreens", "crypt.webp")
MONSTERS = os.path.join(A, "monsters")

# ── Design-System-Töne (design-system.css) ───────────────────────────
GOLD_BRIGHT = (240, 220, 160)   # --ds-gold-bright #f0dca0
GOLD = (216, 184, 112)          # --ds-gold        #d8b870
GOLD_DIM = (160, 120, 64)       # --ds-gold-dim    #a07840
PARCH_INK = (232, 216, 176)     # --ds-parch-ink   #e8d8b0
INK_DARK = (24, 14, 6)          # Schatten/Glow hinter Gold-Typo

SS = 2  # Supersampling

_font_cache = {}


def F(size):
    key = int(round(size * SS))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(FONT_DISPLAY, key)
    return _font_cache[key]


def trim_alpha(im):
    im = im.convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    return im.crop(bbox) if bbox else im


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


class Art:
    """Ein Key-Art-Slot. Koordinaten in Design-px, intern x SS."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new("RGB", (w * SS, h * SS), (8, 6, 4))
        self.draw = ImageDraw.Draw(self.img, "RGBA")

    # ── Hintergrund ──────────────────────────────────────────────────
    def backdrop(self, path, focus=0.55, brightness=0.5, blur=2.0, desat=0.85):
        """Portrait-Battlescreen als Cover-Crop: horizontales Band, dessen
        vertikale Lage `focus` (0=oben, 1=unten) bestimmt. Abdunkeln +
        leichte Unschärfe, damit die Typo führt."""
        src = Image.open(path).convert("RGB")
        tw, th = self.img.size
        scale = tw / src.width
        need_h = int(round(th / scale))
        y0 = int(round((src.height - need_h) * focus))
        y0 = max(0, min(src.height - need_h, y0))
        band = src.crop((0, y0, src.width, y0 + need_h)).resize((tw, th), Image.LANCZOS)
        band = band.filter(ImageFilter.GaussianBlur(blur * SS))
        band = ImageEnhance.Brightness(band).enhance(brightness)
        band = ImageEnhance.Color(band).enhance(desat)
        self.img.paste(band, (0, 0))
        self.draw = ImageDraw.Draw(self.img, "RGBA")

    def _mask_overlay(self, mask_small, color=(0, 0, 0)):
        m = mask_small.resize(self.img.size, Image.BILINEAR)
        layer = Image.new("RGB", self.img.size, color)
        self.img = Image.composite(layer, self.img, m)
        self.draw = ImageDraw.Draw(self.img, "RGBA")

    def vignette(self, strength=96):
        """Radiale Rand-Abdunklung (klein gerechnet, hochskaliert)."""
        gw, gh = 96, 64
        m = Image.new("L", (gw, gh))
        for y in range(gh):
            for x in range(gw):
                dx = abs(x / (gw - 1) - 0.5) * 2
                dy = abs(y / (gh - 1) - 0.5) * 2
                d = (dx * dx * 1.15 + dy * dy) ** 0.5
                t = max(0.0, d - 0.62) / 0.55
                m.putpixel((x, y), int(strength * min(1.0, t * t)))
        self._mask_overlay(m)

    def scrim_h(self, x_dark, x_clear, alpha=170):
        """Horizontaler Verlauf: dunkel bei x_dark, klar ab x_clear."""
        m = Image.new("L", (256, 1))
        for x in range(256):
            px = x / 255 * self.w
            t = (px - x_dark) / max(1, (x_clear - x_dark))
            t = max(0.0, min(1.0, t))
            m.putpixel((x, 0), int(alpha * (1 - t) ** 1.5))
        self._mask_overlay(m)

    def scrim_v(self, y_dark, y_clear, alpha=150):
        """Vertikaler Verlauf: dunkel bei y_dark, klar ab y_clear."""
        m = Image.new("L", (1, 256))
        for y in range(256):
            py = y / 255 * self.h
            t = (py - y_dark) / max(1, (y_clear - y_dark))
            t = max(0.0, min(1.0, t))
            m.putpixel((0, y), int(alpha * (1 - t) ** 1.5))
        self._mask_overlay(m)

    def glow(self, cx, cy, rx, ry, color=(212, 186, 140), alpha=58):
        """Weiches warmes Licht (Fackelschein) — trennt dunkle Silhouetten
        vom dunklen Grund. Klein gerechnet, hochskaliert."""
        gw, gh = 128, 80
        m = Image.new("L", (gw, gh))
        for y in range(gh):
            for x in range(gw):
                dx = (x / (gw - 1) * self.w - cx) / rx
                dy = (y / (gh - 1) * self.h - cy) / ry
                d = (dx * dx + dy * dy) ** 0.5
                m.putpixel((x, y), int(alpha * max(0.0, 1.0 - d) ** 2))
        self._mask_overlay(m, color=color)

    # ── Kreaturen ────────────────────────────────────────────────────
    def elite(self, fname, height, cx, baseline, mirror=False, dim=0.92):
        """Freigestellten Elite einsetzen; baseline = Boden-y (Design-px).
        Weicher Bodenschatten wie panel_worldfightsback, nur geblurrt."""
        im = trim_alpha(Image.open(os.path.join(MONSTERS, fname)))
        if mirror:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        h = int(round(height * SS))
        w = max(1, int(round(im.width * h / im.height)))
        im = im.resize((w, h), Image.LANCZOS)
        if dim < 1.0:  # leicht an die dunkle Szene anpassen
            rgb = ImageEnhance.Brightness(im.convert("RGB")).enhance(dim)
            im = Image.merge("RGBA", (*rgb.split(), im.getchannel("A")))
        # Bodenschatten
        sh_w = int(w * 0.78)
        sh_h = int(max(10 * SS, h * 0.075))
        pad = sh_h
        sh = Image.new("RGBA", (sh_w + 4 * pad, sh_h + 4 * pad), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([2 * pad, 2 * pad, 2 * pad + sh_w, 2 * pad + sh_h],
                                   fill=(0, 0, 0, 150))
        sh = sh.filter(ImageFilter.GaussianBlur(5 * SS))
        sx = int(cx * SS - sh.width / 2)
        sy = int(baseline * SS - sh.height / 2)
        self.img.paste(Image.new("RGB", sh.size, (0, 0, 0)), (sx, sy), sh)
        # Kreatur
        x = int(cx * SS - w / 2)
        y = int(baseline * SS - h) + int(sh_h * 0.35)
        self.img.paste(im, (x, y), im)
        self.draw = ImageDraw.Draw(self.img, "RGBA")

    # ── Typografie ───────────────────────────────────────────────────
    def text_w(self, text, size, tracking=0.0):
        f = F(size)
        return (sum(f.getlength(ch) for ch in text)
                + tracking * SS * max(0, len(text) - 1)) / SS

    def fit_size(self, text, size, max_w, tracking=0.0, min_size=8):
        while size > min_size and self.text_w(text, size, tracking) > max_w:
            size -= 0.5
        return size

    def _draw_tracked(self, draw, x_c, y, text, size, fill, tracking, stroke=0.0,
                      stroke_fill=None):
        f = F(size)
        total = self.text_w(text, size, tracking) * SS
        cx = x_c * SS - total / 2
        for ch in text:
            draw.text((cx, y * SS), ch, font=f, fill=fill, anchor="lm",
                      stroke_width=int(round(stroke * SS)),
                      stroke_fill=stroke_fill or fill)
            cx += f.getlength(ch) + tracking * SS
        return total / SS

    def tracked(self, x_c, y, text, size, fill, tracking=0.0, stroke=0.0,
                shadow=True):
        """Zentrierter Sperrsatz mit dezentem dunklem Schatten."""
        if shadow:
            self._draw_tracked(self.draw, x_c + 1, y + 1.5, text, size,
                               INK_DARK + (200,), tracking, stroke)
        return self._draw_tracked(self.draw, x_c, y, text, size, fill,
                                  tracking, stroke)

    def title(self, x_c, y, text, size, tracking=2.0, glow=10, stroke=0.9):
        """Großtitel: dunkler weicher Glow + Gold-Vertikalverlauf."""
        mask = Image.new("L", self.img.size, 0)
        md = ImageDraw.Draw(mask)
        self._draw_tracked(md, x_c, y, text, size, 255, tracking, stroke=stroke)
        bbox = mask.getbbox()
        if not bbox:
            return
        # 1) Glow/Schatten: geblurrte Maske als schwarze Fläche
        glow_m = mask.filter(ImageFilter.GaussianBlur(glow * SS / 2))
        glow_m = glow_m.point(lambda v: min(255, int(v * 1.7)))
        off = Image.new("L", mask.size, 0)
        off.paste(glow_m, (0, int(2 * SS)))
        black = Image.new("RGB", self.img.size, INK_DARK)
        self.img = Image.composite(black, self.img, off)
        # 2) Goldverlauf (oben hell, unten satter) durch die Textmaske
        y0, y1 = bbox[1], bbox[3]
        grad = Image.new("RGB", (1, max(1, y1 - y0)))
        for yy in range(grad.height):
            grad.putpixel((0, yy), lerp(GOLD_BRIGHT, GOLD, yy / max(1, grad.height - 1)))
        gold = Image.new("RGB", self.img.size, GOLD)
        gold.paste(grad.resize((self.img.width, y1 - y0), Image.BILINEAR), (0, y0))
        self.img = Image.composite(gold, self.img, mask)
        self.draw = ImageDraw.Draw(self.img, "RGBA")

    # ── Ornamente ────────────────────────────────────────────────────
    def diamond(self, x, y, r, fill):
        s = SS
        self.draw.polygon([(x * s - r * s, y * s), (x * s, y * s - r * s),
                           (x * s + r * s, y * s), (x * s, y * s + r * s)], fill=fill)

    def rule(self, x0, x1, y, fill, width=1.0):
        self.draw.line([(x0 * SS, y * SS), (x1 * SS, y * SS)],
                       fill=fill, width=max(1, int(round(width * SS))))

    def kicker(self, x_c, y, text, size, flank=70, gap=18):
        tw = self.tracked(x_c, y, text, size, GOLD, tracking=6.0, stroke=0.3)
        x0, x1 = x_c - tw / 2 - gap, x_c + tw / 2 + gap
        self.rule(x0 - flank, x0 - 8, y, GOLD_DIM + (210,), 1)
        self.rule(x1 + 8, x1 + flank, y, GOLD_DIM + (210,), 1)
        self.diamond(x0 - 4, y, 2.6, GOLD)
        self.diamond(x1 + 4, y, 2.6, GOLD)

    def corner_ornament(self, corner, inset, size=26):
        """Sparsame goldene Eck-Winkel (L-Linie + Diamant), kein Vollrahmen."""
        sx = inset if corner[1] == "l" else self.w - inset
        sy = inset if corner[0] == "t" else self.h - inset
        dx = 1 if corner[1] == "l" else -1
        dy = 1 if corner[0] == "t" else -1
        s = SS
        col = GOLD + (215,)
        self.draw.line([(sx * s, (sy + dy * size) * s), (sx * s, sy * s),
                        ((sx + dx * size) * s, sy * s)],
                       fill=col, width=1 * s, joint="curve")
        in2 = 5
        col2 = GOLD_DIM + (170,)
        self.draw.line([((sx + dx * in2) * s, (sy + dy * (size - 3)) * s),
                        ((sx + dx * in2) * s, (sy + dy * in2) * s),
                        ((sx + dx * (size - 3)) * s, (sy + dy * in2) * s)],
                       fill=col2, width=1 * s, joint="curve")
        self.diamond(sx, sy, 3, GOLD)

    def badge_row(self, x_c, y, badge_text, feat_text, b_size, f_size,
                  pad_x=16, pad_y=9, gap=16):
        """[OUT NOW]-Pill + Feature-Zeile als zentrierte Gruppe."""
        b_w = self.text_w(badge_text, b_size, 2.5) + 2 * pad_x
        b_h = b_size + 2 * pad_y
        f_w = self.text_w(feat_text, f_size, 0.8)
        total = b_w + gap + f_w
        x0 = x_c - total / 2
        s = SS
        # Pill
        box = [x0 * s, (y - b_h / 2) * s, (x0 + b_w) * s, (y + b_h / 2) * s]
        self.draw.rounded_rectangle(box, radius=3 * s, fill=(12, 8, 5, 210),
                                    outline=GOLD + (255,), width=1 * s)
        self.draw.rounded_rectangle([box[0] + 3 * s, box[1] + 3 * s,
                                     box[2] - 3 * s, box[3] - 3 * s],
                                    radius=2 * s, outline=GOLD_DIM + (160,), width=1)
        self.tracked(x0 + b_w / 2, y, badge_text, b_size, GOLD_BRIGHT,
                     tracking=2.5, stroke=0.5, shadow=False)
        # Features
        self.tracked(x0 + b_w + gap + f_w / 2, y, feat_text, f_size, PARCH_INK,
                     tracking=0.8, stroke=0.2)

    def save(self, name):
        out = self.img.resize((self.w, self.h), Image.LANCZOS)
        os.makedirs(OUT, exist_ok=True)
        out.save(os.path.join(OUT, name), "PNG")
        print("wrote", name, out.size)


TITLE = "CHAMPIONS OF THE REACH"
KICKER = "GRIM REACH  ·  PATCH #1"
BADGE = "OUT NOW"
FEATURES = "28 Elite Champions \u00b7 Weekday Blessings \u00b7 14 New Weapons"
# Kreaturen-Freisteller an/aus (Chef 23.07.: Patch-#1-Kapseln OHNE Kreaturen;
# kuenftige Patches koennen wieder Motive zeigen -> True + Dateien tauschen)
SHOW_CUTOUTS = False


# ═════════════════════════════════════════════════════════════════════
# Slot 1 — Cover 800x450 (Pflicht): Text oben/mittig, Trio unten
# ═════════════════════════════════════════════════════════════════════
def cover():
    a = Art(800, 450)
    if SHOW_CUTOUTS:
        a.backdrop(BACKDROP, focus=0.60, brightness=0.53, blur=1.8)
        a.scrim_v(30, 250, alpha=150)      # Textzone oben beruhigen
        a.vignette(96)
        a.glow(408, 400, 340, 130)         # Fackelschein hinter dem Trio
        # Trio unten (Wolf gespiegelt -> blickt nach innen)
        a.elite("elite_ash_vulture.webp", 195, 618, 436)
        a.elite("elite_black_wolf.webp", 185, 190, 438, mirror=True, dim=1.0)
        a.elite("elite_border_warlock.webp", 220, 408, 442)
        ky, ty, by, t_max = 66, 121, 183, 50
    else:
        # Ohne Kreaturen: Textblock exakt mittig als Mittelpunkt — dunkle
        # weiche "Buehne" hinter dem Text + warmer Kern, Titel groesser.
        a.backdrop(BACKDROP, focus=0.58, brightness=0.58, blur=1.6)
        a.vignette(104)
        a.glow(400, 226, 480, 220, color=(8, 6, 4), alpha=128)
        a.glow(400, 226, 400, 190, alpha=40)
        ky, ty, by, t_max = 160, 222, 290, 58

    # Typo (Safe-Zone ~5% = 40px Rand)
    a.corner_ornament("tl", 26)
    a.corner_ornament("tr", 26)
    a.corner_ornament("bl", 26)
    a.corner_ornament("br", 26)
    a.kicker(400, ky, KICKER, 16.5, flank=66)
    t_size = a.fit_size(TITLE, t_max, 720, tracking=2.0)
    a.title(400, ty, TITLE, t_size, tracking=2.0, glow=11)
    a.badge_row(400, by, BADGE, FEATURES, 15, 13)
    a.save("event_cover.png")


# ═════════════════════════════════════════════════════════════════════
# Slot 2 — Header 1920x622 (empfohlen): Text links, Trio rechts
# ═════════════════════════════════════════════════════════════════════
def header():
    a = Art(1920, 622)
    if SHOW_CUTOUTS:
        a.backdrop(BACKDROP, focus=0.58, brightness=0.53, blur=2.0)
        a.scrim_h(140, 1150, alpha=175)    # links dunkel fuer Text
        a.vignette(92)
        a.glow(1440, 560, 500, 170)        # Fackelschein hinter dem Trio
        # Trio rechts, alle blicken nach links zum Text
        a.elite("elite_ash_vulture.webp", 330, 1710, 588)
        a.elite("elite_black_wolf.webp", 300, 1165, 592, dim=1.0)
        a.elite("elite_border_warlock.webp", 365, 1445, 598)
    else:
        # Ohne Kreaturen: Textblock zentriert in der Bildmitte — dunkle
        # weiche "Buehne" dahinter + warmer Kern, Kulisse traegt die Raender.
        a.backdrop(BACKDROP, focus=0.55, brightness=0.60, blur=1.4)
        a.vignette(100)
        a.glow(960, 300, 780, 290, color=(8, 6, 4), alpha=132)
        a.glow(960, 300, 620, 250, alpha=42)

    # Typo-Block: mit Kreaturen links, ohne Kreaturen zentriert (Safe-Zone ~5%)
    cx = 545 if SHOW_CUTOUTS else 960
    t_max, t_w = (62, 880) if SHOW_CUTOUTS else (70, 1240)
    a.corner_ornament("tl", 40, size=34)
    a.corner_ornament("bl", 40, size=34)
    a.corner_ornament("tr", 40, size=34)
    a.corner_ornament("br", 40, size=34)
    a.kicker(cx, 214, KICKER, 24, flank=96, gap=22)
    t_size = a.fit_size(TITLE, t_max, t_w, tracking=2.4)
    a.title(cx, 302, TITLE, t_size, tracking=2.4, glow=13)
    a.badge_row(cx, 396, BADGE, FEATURES, 20, 17.5, pad_x=20, pad_y=11, gap=20)
    a.save("event_header.png")


if __name__ == "__main__":
    cover()
    header()

