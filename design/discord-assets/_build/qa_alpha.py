# Alpha-QA der Emoji-/Rollen-/Sticker-Quellen (read-only auf den Spiel-Assets).
# claude:2026-10-25T13:08:00+01:00 - Discord-Grafiken: jede Quelle vor Verwendung auf Saum, Halo, Mattenreste,
# Magenta-Key und Schachbrettreste pruefen. Messungen angelehnt an design/monster-asset-audit-2026-10-25/tools.
# Aufruf: python -I qa_alpha.py  ->  ../_qa/alpha-qa.csv + ../_qa/alpha-qa-sheet.jpg (Sichtpruefung hell/dunkel)
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sources import A, F, EMOJIS, ROLES, ROLE_ALTS, HEADER_ICONS, STICKERS  # noqa: E402

STICKER_CANDIDATES = dict(STICKERS, **{
    "st_warking": "monsters/gk_warking.webp",
    "st_hoarspite": "pets/hoarspite.webp", "x_mana": "icons/icon_mana.webp", "x_wealth": "icons/icon_wealth.webp", "x_paw": "icons/icon_paw.webp",
})
OUT = os.path.join(HERE, "..", "_qa")
os.makedirs(OUT, exist_ok=True)


def measure(rel):
    im = Image.open(A + rel).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3]
    levels = len(np.unique(al))
    solid = al >= 128
    contour = solid & ~ndimage.binary_erosion(solid)
    nc = max(1, int(contour.sum()))
    # harte Spruenge: Konturpixel ohne Zwischenstufe im 3x3-Umfeld (binaere Keying-Kante)
    partial = (al > 20) & (al < 235)
    near_partial = ndimage.binary_dilation(partial, iterations=1)
    hard = round(100 * (contour & ~near_partial).sum() / nc, 1)
    # Bildschirm-Halo bei 128 px: Kantenband deutlich heller als das Innere (auf Schwarz) bzw. dunkler (auf Hell)
    H = 128
    s = im.convert("RGBa").resize((H, H), Image.Resampling.LANCZOS)
    p = np.asarray(s).astype(np.float32)
    pm, sa = p[..., :3], p[..., 3] / 255.0
    on_black = pm @ np.array([0.299, 0.587, 0.114], np.float32)
    on_light = on_black + (1 - sa) * 235.0
    dist = ndimage.distance_transform_edt(~(sa < 0.05))
    band = (sa > 0.15) & (dist <= 2)
    core = (sa > 0.95).astype(np.float32)
    loc = ndimage.uniform_filter(on_black * core, 9) / (ndimage.uniform_filter(core, 9) + 1e-6)
    nb = max(1, int(band.sum()))
    halo_b = round(100 * (band & (on_black > 115) & (on_black > loc + 45)).sum() / nb, 2)
    halo_d = round(100 * (band & (on_light < 90) & (on_light < loc - 45)).sum() / nb, 2)
    # Mattenkruemel (weiss, deckend, direkt an der Kante, in dunkler Umgebung)
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    dist_t = ndimage.distance_transform_edt(~(al < 8))
    op = (al >= 230).astype(np.float32)
    local = ndimage.uniform_filter(lum * op, 15) / (ndimage.uniform_filter(op, 15) + 1e-6)
    white = (al >= 96) & (rgb.min(axis=2) >= 190) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 40) & (dist_t <= 4)
    crumbs = round(1000 * (white & (local < 100)).sum() / nc, 1)
    # Magenta-Saum (alter Chroma-Key)
    edge = (al > 8) & (dist_t <= 3)
    mag = (rgb[..., 0] > 140) & (rgb[..., 2] > 140) & (rgb[..., 1] < 0.6 * np.minimum(rgb[..., 0], rgb[..., 2]))
    magenta = round(100 * (edge & mag).sum() / max(1, int(edge.sum())), 2)
    # Schachbrett-/Hintergrundreste: deckende, neutrale helle/graue Pixel am Bildrand (aeussere 4 %)
    h, w = al.shape
    m = max(4, int(0.04 * min(h, w)))
    border = np.zeros_like(solid)
    border[:m, :] = border[-m:, :] = True
    border[:, :m] = border[:, -m:] = True
    neutral = (rgb.max(axis=2) - rgb.min(axis=2) < 14) & (rgb.min(axis=2) > 150)
    checker = round(100 * (border & (al > 200) & neutral).sum() / border.sum(), 2)
    border_opaque = round(100 * (border & (al > 40)).sum() / border.sum(), 2)
    return dict(levels=levels, hard=hard, halo_black=halo_b, dark_on_light=halo_d, crumbs=crumbs,
                magenta=magenta, checker=checker, border_opaque=border_opaque, size=f"{im.width}x{im.height}")


def verdict(m):
    bad = []
    if m["levels"] < 24 or m["hard"] > 40:
        bad.append("binaere Kante")
    if m["halo_black"] > 6:
        bad.append("heller Saum")
    if m["dark_on_light"] > 12:
        bad.append("dunkler Saum")
    if m["crumbs"] > 8:
        bad.append("Mattenkruemel")
    if m["magenta"] > 1.0:
        bad.append("Magenta-Saum")
    if m["checker"] > 0.5 or m["border_opaque"] > 15:
        bad.append("Rand/Schachbrett")
    return "ok" if not bad else "PRUEFEN: " + ", ".join(bad)


def sheet(items, path, cols=8, cw=128):
    font = ImageFont.truetype(F + "Cinzel-Regular.ttf", 11)
    rows = (len(items) + cols - 1) // cols
    cellw, cellh = cw * 2 + 8, cw + 64
    out = Image.new("RGB", (cols * cellw, rows * cellh), (20, 20, 20))
    d = ImageDraw.Draw(out)
    for i, (name, rel) in enumerate(items):
        im = Image.open(A + rel).convert("RGBA")
        bb = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        im = im.crop(bb)
        s = cw / max(im.size)
        im = im.convert("RGBa").resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.Resampling.LANCZOS).convert("RGBA")
        x, y = (i % cols) * cellw, (i // cols) * cellh
        for k, bgc in enumerate([(49, 51, 56), (255, 255, 255)]):
            tile = Image.new("RGBA", (cw, cw + 40), bgc + (255,))
            tile.alpha_composite(im, ((cw - im.width) // 2, (cw - im.height) // 2))
            for j, sz in enumerate((22, 32)):
                sm = im.resize((max(1, round(im.width * sz / cw)), max(1, round(im.height * sz / cw))), Image.Resampling.LANCZOS)
                tile.alpha_composite(sm, (8 + j * 44, cw + 4))
            out.paste(tile.convert("RGB"), (x + k * (cw + 4), y))
        d.text((x + 4, y + cw + 46), name, fill=(240, 210, 140), font=font)
    out.save(path, quality=86)


if __name__ == "__main__":
    groups = [("emoji", EMOJIS), ("role", ROLES), ("role-alt", ROLE_ALTS), ("header", HEADER_ICONS), ("sticker", STICKER_CANDIDATES)]
    seen = {}
    lines = ["gruppe;name;quelle;groesse;alpha_stufen;harte_kante_pct;heller_saum_pct;dunkler_saum_pct;kruemel_pro_1000;magenta_pct;schachbrett_pct;rand_deckend_pct;urteil"]
    for g, mapping in groups:
        for name, rel in mapping.items():
            m = seen.get(rel) or measure(rel)
            seen[rel] = m
            v = verdict(m)
            lines.append(f"{g};{name};{rel};{m['size']};{m['levels']};{m['hard']};{m['halo_black']};{m['dark_on_light']};{m['crumbs']};{m['magenta']};{m['checker']};{m['border_opaque']};{v}")
            print(f"{g:8} {name:22} {v:40} {m}")
    with open(os.path.join(OUT, "alpha-qa.csv"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    items = list(EMOJIS.items()) + list(ROLES.items()) + list(ROLE_ALTS.items()) + list(HEADER_ICONS.items()) + list(STICKER_CANDIDATES.items())
    for n in range(0, len(items), 24):
        sheet(items[n:n + 24], os.path.join(OUT, f"alpha-qa-sheet-{n // 24 + 1}.jpg"))
