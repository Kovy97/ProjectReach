# -*- coding: utf-8 -*-
"""
Grim Reach — Steam-Store-About-Panels (616px breit) aus echten Spiel-Assets.
Komponiert 4 Infografik-PNGs im Citadel-Design-System (Holz + 9-Slice-Rahmen
+ Gold/Pergament-Töne + Cinzel). Regenerieren: `python build-panels.py`.

Assets/Quellen:
  Holz:    apps/client/src/renderer/assets/bg_tileable_wood.webp   (gekachelt, abgedunkelt)
  Rahmen:  .../assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners.webp (Slice 28px, wie design-system.css .ds-frame)
  Fonts:   .../fonts/Cinzel-Regular.ttf (Display) + Cormorant-Regular.ttf (Fließtext)
  Farben:  styles/design-system.css (--ds-gold*, --ds-parch-ink, rote Akzente aus combat.css)
  Icons:   .../assets/skills/*.webp + .../assets/sidebar/sidebaricon_*.webp (wie getSkillIcon/getSidebarIcon)
  Elites:  .../assets/monsters/elite_*.webp

Zahlen (Stand 2026-07-23, gezählt in packages/content/src/index.ts):
  skills=20, items=1044 (weitere in Arbeit -> "1,000+"), monsters=110 -> "100+",
  zones=11 + dungeons=8 -> 19, elites=28, blessings=7 (Asset-Ordner blessings/).
"""

from PIL import Image, ImageDraw, ImageEnhance, ImageFont
import os

ROOT = r"G:\GameDev"
R = os.path.join(ROOT, r"apps\client\src\renderer")
A = os.path.join(R, "assets")
OUT = os.path.join(ROOT, r"design\marketing\store-panels")

FONT_DISPLAY = os.path.join(R, "fonts", "Cinzel-Regular.ttf")


def _resolve_body_font():
    """Fließtext-Serif aus den Spiel-Fonts. Achtung, geprüft am 2026-07-23:
    `Cormorant-Regular.ttf` im Repo ist ein Dummy (Newline-Bytes) und die
    `CormorantGaramond-Regular.woff2` ein Nicht-Latin-Subset (139 Glyphen,
    keine lat. Kleinbuchstaben) — beide fallen durch die Glyph-Probe.
    Nächstbester gebundelter Spielfont: Marcellus SC. Notnagel: Georgia."""
    from PIL import ImageFont as _IF

    def has_latin(path):
        try:
            f = _IF.truetype(path, 16)
            # Tofu-Erkennung: 'a' darf nicht wie .notdef (U+FFFF) rendern
            ma, mn = f.getmask("a"), f.getmask("\uffff")
            return (ma.size, bytes(ma)) != (mn.size, bytes(mn))
        except OSError:
            return False

    candidates = [
        os.path.join(R, "fonts", "Cormorant-Regular.ttf"),
        os.path.join(R, "fonts", "MarcellusSC-Regular.ttf"),
        r"C:\Windows\Fonts\georgia.ttf",
    ]
    for c in candidates:
        if has_latin(c):
            return c
    return FONT_DISPLAY


FONT_BODY = _resolve_body_font()

WOOD = os.path.join(A, "bg_tileable_wood.webp")
FRAME = os.path.join(A, "ui", "citadel", "9-slice-box-3", "wooden_frame_with_corners.webp")

# ── Design-System-Töne (design-system.css) ───────────────────────────
GOLD_BRIGHT = (240, 220, 160)   # --ds-gold-bright #f0dca0
GOLD = (216, 184, 112)          # --ds-gold        #d8b870
GOLD_DIM = (160, 120, 64)       # --ds-gold-dim    #a07840
PARCH_INK = (232, 216, 176)     # --ds-parch-ink   #e8d8b0
PARCH_MUTED = (128, 104, 64)    # --ds-parch-muted #806840
RED = (200, 74, 58)             # #c84a3a (Kampf-/Warnakzent)
RED_DEEP = (196, 60, 40)        # #c43c28
TILE_FILL = (10, 7, 5, 196)     # dunkles Metall/Holz-Inlay
TILE_FILL_SOFT = (10, 7, 5, 150)

W = 616          # Steam-About-Standardbreite
SS = 2           # Supersampling für knackige Schrift
FRAME_PX = 28    # Slice/Border wie .ds-frame

_font_cache = {}


def F(path, size):
    key = (path, int(round(size * SS)))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(path, key[1])
    return _font_cache[key]


def trim_alpha(im):
    im = im.convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    return im.crop(bbox) if bbox else im


def load_icon(path, height):
    im = trim_alpha(Image.open(path))
    h = int(round(height * SS))
    w = max(1, int(round(im.width * h / im.height)))
    return im.resize((w, h), Image.LANCZOS)


class Panel:
    def __init__(self, height):
        self.h = height
        self.img = Image.new("RGB", (W * SS, height * SS), (8, 6, 4))
        self._wood_base()
        self.draw = ImageDraw.Draw(self.img, "RGBA")

    # ── Grund: gekacheltes, abgedunkeltes Holz + Vignette + 9-Slice ──
    def _wood_base(self):
        wood = Image.open(WOOD).convert("RGB")
        tile = wood.resize((int(560 * SS), int(560 * SS)), Image.LANCZOS)
        tile = ImageEnhance.Brightness(tile).enhance(0.42)
        tile = ImageEnhance.Color(tile).enhance(0.9)
        for y in range(0, self.img.height, tile.height):
            for x in range(0, self.img.width, tile.width):
                self.img.paste(tile, (x, y))
        # sanfte Vignette oben/unten
        vig = Image.new("L", (1, self.img.height))
        h = self.img.height
        for y in range(h):
            t = y / max(1, h - 1)
            edge = max(0.0, (abs(t - 0.5) - 0.28)) / 0.22
            vig.putpixel((0, y), int(70 * min(1.0, edge)))
        vig = vig.resize(self.img.size)
        black = Image.new("RGB", self.img.size, (0, 0, 0))
        self.img = Image.composite(black, self.img, vig)
        self._frame()

    def _frame(self):
        fr = Image.open(FRAME).convert("RGBA")
        s = FRAME_PX  # Quell-Slice in Frame-Pixeln (284x166)
        d = FRAME_PX * SS  # Ziel-Randbreite
        fw, fh = fr.size
        iw, ih = self.img.size

        def part(box, size):
            p = fr.crop(box).resize(size, Image.LANCZOS)
            return p

        # Ecken
        self.img.paste(part((0, 0, s, s), (d, d)), (0, 0), part((0, 0, s, s), (d, d)))
        self.img.paste(part((fw - s, 0, fw, s), (d, d)), (iw - d, 0), part((fw - s, 0, fw, s), (d, d)))
        self.img.paste(part((0, fh - s, s, fh), (d, d)), (0, ih - d), part((0, fh - s, s, fh), (d, d)))
        self.img.paste(part((fw - s, fh - s, fw, fh), (d, d)), (iw - d, ih - d), part((fw - s, fh - s, fw, fh), (d, d)))
        # Kanten (gestreckt, wie border-image-repeat: stretch)
        top = part((s, 0, fw - s, s), (iw - 2 * d, d))
        self.img.paste(top, (d, 0), top)
        bot = part((s, fh - s, fw - s, fh), (iw - 2 * d, d))
        self.img.paste(bot, (d, ih - d), bot)
        left = part((0, s, s, fh - s), (d, ih - 2 * d))
        self.img.paste(left, (0, d), left)
        right = part((fw - s, s, fw, fh - s), (d, ih - 2 * d))
        self.img.paste(right, (iw - d, d), right)

    # ── Text-Helfer (Koordinaten in Design-px, intern skaliert) ──────
    def text_w(self, text, size, tracking=0.0, path=FONT_DISPLAY):
        f = F(path, size)
        wpx = sum(f.getlength(ch) for ch in text) + tracking * SS * max(0, len(text) - 1)
        return wpx / SS

    def tracked(self, x, y, text, size, fill, tracking=0.0, anchor="center",
                path=FONT_DISPLAY, stroke=0):
        f = F(path, size)
        total = self.text_w(text, size, tracking, path) * SS
        if anchor == "center":
            cx = x * SS - total / 2
        elif anchor == "right":
            cx = x * SS - total
        else:
            cx = x * SS
        for ch in text:
            self.draw.text((cx, y * SS), ch, font=f, fill=fill, anchor="lm",
                           stroke_width=int(stroke * SS), stroke_fill=fill)
            cx += f.getlength(ch) + tracking * SS
        return total / SS

    def fit_size(self, text, size, max_w, tracking=0.0, path=FONT_DISPLAY, min_size=8):
        while size > min_size and self.text_w(text, size, tracking, path) > max_w:
            size -= 0.5
        return size

    def wrap_body(self, text, size, max_w, path=FONT_BODY):
        words, lines, cur = text.split(), [], ""
        for wd in words:
            cand = (cur + " " + wd).strip()
            if self.text_w(cand, size, 0, path) <= max_w or not cur:
                cur = cand
            else:
                lines.append(cur)
                cur = wd
        if cur:
            lines.append(cur)
        return lines

    # ── Ornamente ────────────────────────────────────────────────────
    def diamond(self, x, y, r, fill):
        s = SS
        self.draw.polygon([(x * s - r * s, y * s), (x * s, y * s - r * s),
                           (x * s + r * s, y * s), (x * s, y * s + r * s)], fill=fill)

    def rule(self, x0, x1, y, fill, width=1):
        self.draw.line([(x0 * SS, y * SS), (x1 * SS, y * SS)], fill=fill, width=int(width * SS))

    def title(self, y, text, size=24, color=GOLD_BRIGHT):
        tw = self.tracked(W / 2, y, text, size, color, tracking=2.6, stroke=0.5)
        gap = 16
        x0, x1 = W / 2 - tw / 2 - gap, W / 2 + tw / 2 + gap
        margin = FRAME_PX + 16
        self.rule(margin + 8, x0 - 8, y, GOLD_DIM + (200,), 1)
        self.rule(x1 + 8, W - margin - 8, y, GOLD_DIM + (200,), 1)
        self.diamond(x0 - 4, y, 3, GOLD)
        self.diamond(x1 + 4, y, 3, GOLD)

    def tile(self, x, y, w, h, accent=None, fill=TILE_FILL):
        s = SS
        box = [x * s, y * s, (x + w) * s, (y + h) * s]
        self.draw.rounded_rectangle(box, radius=3 * s, fill=fill)
        oc = accent if accent else GOLD_DIM + (230,)
        self.draw.rounded_rectangle(box, radius=3 * s, outline=oc, width=1 * s)
        # innere Lichtkante oben
        self.draw.line([(x * s + 3 * s, y * s + 1.5 * s), ((x + w) * s - 3 * s, y * s + 1.5 * s)],
                       fill=(255, 240, 200, 26), width=s)

    def paste_icon(self, icon, cx, cy):
        self.img.paste(icon, (int(cx * SS - icon.width / 2), int(cy * SS - icon.height / 2)), icon)
        self.draw = ImageDraw.Draw(self.img, "RGBA")

    def check(self, x, y, size, color=GOLD, width=2.4):
        s = SS
        pts = [(x * s, (y + 0.10 * size) * s),
               ((x + 0.36 * size) * s, (y + 0.42 * size) * s),
               ((x + size) * s, (y - 0.52 * size) * s)]
        self.draw.line(pts, fill=color, width=int(width * s), joint="curve")

    def save(self, name):
        out = self.img.resize((W, self.h), Image.LANCZOS)
        os.makedirs(OUT, exist_ok=True)
        out.save(os.path.join(OUT, name), "PNG")
        print("wrote", name, out.size)


# ═════════════════════════════════════════════════════════════════════
# Panel 1 — BY THE NUMBERS
# ═════════════════════════════════════════════════════════════════════
def panel_numbers():
    p = Panel(392)
    p.title(56, "GRIM REACH BY THE NUMBERS", size=23)

    tiles_r1 = [("20", "SKILLS", None), ("1,000+", "ITEMS", None),
                ("100+", "MONSTERS", None), ("19", "ZONES & DUNGEONS", None)]
    tiles_r2 = [("28", "ELITE CHAMPIONS", None),
                ("0", "MICROTRANSACTIONS", "red"),
                ("\u221e", "OFFLINE PROGRESS", None)]

    inner_x0, inner_x1 = 46, W - 46
    gap = 10
    tw = (inner_x1 - inner_x0 - 3 * gap) / 4
    th = 92
    # einheitliche Labelgröße: kleinste, die alle Labels fasst
    lbl_size = 12.0
    for _, lbl, _a in tiles_r1 + tiles_r2:
        lbl_size = min(lbl_size, p.fit_size(lbl, 12.0, tw - 18, tracking=0.6))

    def draw_tile(x, y, num, lbl, accent):
        red_mode = accent == "red"
        p.tile(x, y, tw, th,
               accent=(RED_DEEP + (255,)) if red_mode else None)
        num_col = RED if red_mode else GOLD_BRIGHT
        lbl_col = RED if red_mode else PARCH_INK
        nsize = 30 if num != "\u221e" else 46
        ny = y + 34 if num != "\u221e" else y + 36
        p.tracked(x + tw / 2, ny, num, nsize, num_col, tracking=0.5, stroke=0.5)
        p.tracked(x + tw / 2, y + th - 22, lbl, lbl_size, lbl_col, tracking=0.6)

    y1 = 88
    for i, (num, lbl, acc) in enumerate(tiles_r1):
        draw_tile(inner_x0 + i * (tw + gap), y1, num, lbl, acc)
    y2 = y1 + th + gap
    row2_w = 3 * tw + 2 * gap
    x2 = (W - row2_w) / 2
    for i, (num, lbl, acc) in enumerate(tiles_r2):
        draw_tile(x2 + i * (tw + gap), y2, num, lbl, acc)

    sub_y = y2 + th + 34
    swidth = p.tracked(W / 2, sub_y, "ONE PURCHASE.  NO ADS.  NO ENERGY BARS.",
                       13.5, GOLD, tracking=1.6)
    p.diamond(W / 2 - swidth / 2 - 14, sub_y, 2.5, GOLD_DIM)
    p.diamond(W / 2 + swidth / 2 + 14, sub_y, 2.5, GOLD_DIM)
    p.save("panel_numbers.png")


# ═════════════════════════════════════════════════════════════════════
# Panel 2 — THE WORLD FIGHTS BACK
# ═════════════════════════════════════════════════════════════════════
def panel_worldfightsback():
    p = Panel(436)
    p.title(56, "THE WORLD FIGHTS BACK", size=24)

    col_w = 240
    lx, rx = W / 2 - 20 - col_w / 2 - 128 + 128, 0  # centers below
    lcx, rcx = 168, W - 168
    top = 108

    def column(cx, num, label, body):
        p.tracked(cx, top, num, 46, GOLD_BRIGHT, tracking=1, stroke=0.6)
        p.tracked(cx, top + 38, label, 15.5, GOLD, tracking=1.8)
        lines = p.wrap_body(body, 16.5, col_w - 18)
        yy = top + 66
        for ln in lines:
            p.tracked(cx, yy, ln, 16.5, PARCH_INK, tracking=0.2, path=FONT_BODY)
            yy += 20

    column(lcx, "28", "ELITE CHAMPIONS",
           "World spawns hunt on a timer, each with a unique trophy.")
    column(rcx, "7", "WEEKDAY BLESSINGS",
           "The Reach shifts every real-world day.")

    # vertikaler Trenner
    p.rule(0, 0, 0, (0, 0, 0, 0))  # no-op, hält Struktur lesbar
    p.draw.line([(W / 2 * SS, 86 * SS), (W / 2 * SS, 232 * SS)],
                fill=GOLD_DIM + (170,), width=1 * SS)
    p.diamond(W / 2, 86, 3, GOLD_DIM)
    p.diamond(W / 2, 232, 3, GOLD_DIM)

    # Elite-Kreaturen als Bodentruppe
    creatures = [("elite_black_wolf.webp", 128), ("elite_border_warlock.webp", 148),
                 ("elite_ash_vulture.webp", 132)]
    xs = [176, 308, 440]
    base_y = 358
    for (fname, hgt), cx in zip(creatures, xs):
        icon = load_icon(os.path.join(A, "monsters", fname), hgt)
        # Bodenschatten
        sh_w, sh_h = icon.width / SS * 0.72, 14
        p.draw.ellipse([(cx - sh_w / 2) * SS, (base_y + hgt / 2 - sh_h / 2) * SS,
                        (cx + sh_w / 2) * SS, (base_y + hgt / 2 + sh_h / 2) * SS],
                       fill=(0, 0, 0, 110))
        p.paste_icon(icon, cx, base_y)

    p.tracked(W / 2, 258, "NO IDLE PARADISE. THE REACH HUNTS YOU BACK.",
              12.5, GOLD, tracking=1.4)
    p.save("panel_worldfightsback.png")


# ═════════════════════════════════════════════════════════════════════
# Panel 3 — MASTER 20 SKILLS
# ═════════════════════════════════════════════════════════════════════
SKILLS = [
    ("Woodcutting", ("sidebar", "woodcutting")), ("Mining", ("sidebar", "mining")),
    ("Fishing", ("sidebar", "fishing")), ("Farming", ("sidebar", "farming")),
    ("Foraging", ("sidebar", "foraging")), ("Thieving", ("sidebar", "thieving")),
    ("Smithing", ("sidebar", "smithing")), ("Cooking", ("sidebar", "cooking")),
    ("Crafting", ("sidebar", "leatherworking")), ("Jewelcrafting", ("sidebar", "jewelcrafting")),
    ("Runecrafting", ("sidebar", "runecrafting")), ("Herblore", ("sidebar", "herblore")),
    ("Attack", ("skills", "attack")), ("Power", ("skills", "power")),
    ("Defence", ("skills", "defence")), ("Ranged", ("skills", "ranged")),
    ("Magic", ("skills", "magic")), ("Warding", ("skills", "warding")),
    ("Vitality", ("skills", "vitality")), ("Slayer", ("skills", "slayer")),
]


def skill_icon_path(kind, name):
    if kind == "skills":
        return os.path.join(A, "skills", name + ".webp")
    return os.path.join(A, "sidebar", "sidebaricon_" + name + ".webp")


def panel_skills():
    p = Panel(538)
    p.title(54, "MASTER 20 SKILLS", size=24)

    cols, gap = 5, 7
    inner_x0, inner_x1 = 44, W - 44
    tw = (inner_x1 - inner_x0 - (cols - 1) * gap) / cols
    th = 92
    y0 = 82
    for i, (label, (kind, name)) in enumerate(SKILLS):
        row, col = divmod(i, cols)
        x = inner_x0 + col * (tw + gap)
        y = y0 + row * (th + gap)
        p.tile(x, y, tw, th, fill=TILE_FILL_SOFT)
        icon = load_icon(skill_icon_path(kind, name), 52)
        if icon.width > 56 * SS:
            icon = load_icon(skill_icon_path(kind, name), 52 * 56 * SS / icon.width / SS)
        p.paste_icon(icon, x + tw / 2, y + 36)
        lsize = p.fit_size(label.upper(), 10.5, tw - 10, tracking=0.5)
        p.tracked(x + tw / 2, y + th - 15, label.upper(), lsize, PARCH_INK, tracking=0.5)

    p.tracked(W / 2, y0 + 4 * th + 3 * gap + 30,
              "EVERY SKILL FEEDS YOUR COMBAT ATTRIBUTES.", 12.5, GOLD, tracking=1.4)
    p.save("panel_skills.png")


# ═════════════════════════════════════════════════════════════════════
# Panel 4 — A LIVING GAME
# ═════════════════════════════════════════════════════════════════════
def panel_promise():
    p = Panel(348)
    p.title(56, "A LIVING GAME", size=24)

    rows = ["Free content updates",
            "Your saves stay compatible \u2014 forever",
            "Built with our community in Early Access"]
    size = 17.5
    max_w = max(p.text_w(t, size, 0.4) for t in rows)
    block_x = W / 2 - (max_w + 34) / 2
    yy = 104
    for t in rows:
        p.check(block_x, yy, 15, GOLD)
        p.tracked(block_x + 34, yy, t, size, PARCH_INK, tracking=0.4, anchor="left")
        yy += 40

    # 7-LANGUAGES-Badge
    by = 258
    btxt = "7 LANGUAGES"
    btw = p.text_w(btxt, 16, 2.2)
    bw, bh = btw + 56, 42
    bx = W / 2 - bw / 2
    s = SS
    p.draw.rounded_rectangle([bx * s, (by - bh / 2) * s, (bx + bw) * s, (by + bh / 2) * s],
                             radius=3 * s, fill=(10, 7, 5, 190),
                             outline=GOLD_DIM + (255,), width=1 * s)
    p.draw.rounded_rectangle([(bx + 4) * s, (by - bh / 2 + 4) * s,
                              (bx + bw - 4) * s, (by + bh / 2 - 4) * s],
                             radius=2 * s, outline=GOLD + (140,), width=1)
    p.tracked(W / 2, by, btxt, 16, GOLD_BRIGHT, tracking=2.2, stroke=0.4)
    p.tracked(W / 2, by + 36, "EN \u00b7 DE \u00b7 FR \u00b7 ES \u00b7 PT-BR \u00b7 RU \u00b7 ZH",
              11.5, PARCH_MUTED, tracking=1.2)
    p.save("panel_promise.png")


if __name__ == "__main__":
    panel_numbers()
    panel_worldfightsback()
    panel_skills()
    panel_promise()
