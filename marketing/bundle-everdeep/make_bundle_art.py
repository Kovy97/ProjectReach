# claude:2026-10-31T21:00:50+01:00 Bundle-Capsules Grim Reach + Everdeep Idle: zwei Hälften, gerader Trenner (Chef 31.10.).
# Aufruf aus G:\GameDev:  python -I -X utf8 marketing/bundle-everdeep/make_bundle_art.py
# Quellen: grim-reach/ (grüner Store-Seitenhintergrund + Store-Logo, freigestellt per extract_store_logo.py),
# everdeep/ (deren Capsules).
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "fertig")
LZ = Image.LANCZOS

GR_BG = Image.open(os.path.join(HERE, "grim-reach", "store_page_background_1438x810.jpg")).convert("RGB")
GR_LOGO = Image.open(os.path.join(HERE, "grim-reach", "logo_store_cutout.png")).convert("RGBA")
ED = {k: Image.open(os.path.join(HERE, "everdeep", f)).convert("RGB") for k, f in {
    "header": "header_capsule_920x430.png", "small": "small_capsule_462x174.png",
    "main": "main_capsule_1232x706.png", "vertical": "vertical_capsule_748x896.png"}.items()}


def cover(img, w, h, fx=0.5, fy=0.5):
    s = max(w / img.width, h / img.height)
    im = img.resize((max(w, round(img.width * s)), max(h, round(img.height * s))), LZ)
    x = round((im.width - w) * fx)
    y = round((im.height - h) * fy)
    return im.crop((x, y, x + w, y + h))


def gr_panel(w, h, cx, cy, logo_w, fx=0.6, fy=0.6):
    """Grüne Store-Landschaft + Store-Logo (Seitenverhältnis unverändert) mit Schatten und Abdunklung dahinter."""
    bg = cover(GR_BG, w, h, fx, fy).convert("RGBA")
    lw = round(logo_w)
    lh = round(GR_LOGO.height * lw / GR_LOGO.width)
    logo = GR_LOGO.resize((lw, lh), LZ)
    x, y = round(cx - lw / 2), round(cy - lh / 2)
    halo = Image.new("L", (w, h), 0)
    ImageDraw.Draw(halo).ellipse((x - lw * 0.06, y - lh * 0.25, x + lw * 1.06, y + lh * 1.2), fill=150)
    halo = halo.filter(ImageFilter.GaussianBlur(max(6, lw * 0.1)))
    bg = Image.composite(Image.new("RGBA", (w, h), (8, 10, 14, 255)), bg, halo)
    sa = Image.new("L", (w, h), 0)
    sa.paste(logo.getchannel("A"), (x, y + max(2, lh // 30)))
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow.putalpha(sa.filter(ImageFilter.GaussianBlur(max(2, lw // 70))).point(lambda v: v * 0.8))
    bg.alpha_composite(shadow)
    bg.alpha_composite(logo, (x, y))
    return bg.convert("RGB")


def ed_panel(w, h, src, fx, fy, pad=0):
    """Everdeep-Capsule als Füllung; `pad` Pixel am Trenner bleiben frei, damit das Logo nicht unter dem
    Trenner verschwindet. Der Streifen wird mit der verwischten Bildkante gefüllt."""
    if pad <= 0:
        return cover(src, w, h, fx, fy)
    out = Image.new("RGB", (w, h))
    art = cover(src, w - pad, h, fx, fy)
    out.paste(art, (pad, 0))
    out.paste(art.crop((0, 0, 3, h)).resize((pad, h)).filter(ImageFilter.GaussianBlur(4)), (0, 0))
    return out


def draw_divider(img, pos, vertical, scale):
    """Gerader, pixelgenauer Trenner: weicher Schatten beidseitig, Messingkanten, dunkler Eisenkern."""
    W, H = img.size
    t = max(4, round(8 * scale))       # Kernbreite
    e = max(1, round(1.5 * scale))     # Messingkante
    sh = max(6, round(16 * scale))     # Schattenbreite je Seite
    a = round(pos - t / 2)
    img = img.convert("RGBA")
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(shadow)
    for i in range(sh):
        alpha = round(170 * (1 - i / sh) ** 2)
        if vertical:
            d.line([(a - e - 1 - i, 0), (a - e - 1 - i, H)], fill=(0, 0, 0, alpha))
            d.line([(a + t + e + i, 0), (a + t + e + i, H)], fill=(0, 0, 0, alpha))
        else:
            d.line([(0, a - e - 1 - i), (W, a - e - 1 - i)], fill=(0, 0, 0, alpha))
            d.line([(0, a + t + e + i), (W, a + t + e + i)], fill=(0, 0, 0, alpha))
    img.alpha_composite(shadow)
    d = ImageDraw.Draw(img)
    brass, iron, hi = (196, 160, 98, 255), (24, 20, 18, 255), (70, 60, 52, 255)
    if vertical:
        d.rectangle((a - e, 0, a + t + e - 1, H), fill=brass)
        d.rectangle((a, 0, a + t - 1, H), fill=iron)
        d.line([(a + 1, 0), (a + 1, H)], fill=hi)
    else:
        d.rectangle((0, a - e, W, a + t + e - 1), fill=brass)
        d.rectangle((0, a, W, a + t - 1), fill=iron)
        d.line([(0, a + 1), (W, a + 1)], fill=hi)
    return img.convert("RGB")


def side_by_side(W, H, gr, ed, name):
    mid = W // 2
    img = Image.new("RGB", (W, H))
    img.paste(gr_panel(mid, H, **gr), (0, 0))
    img.paste(ed_panel(W - mid, H, **ed), (mid, 0))
    out = draw_divider(img, mid, True, W / 920)
    out.save(os.path.join(OUT, name), optimize=True)
    return out


def stacked(W, H, gr, ed, name):
    mid = H // 2
    img = Image.new("RGB", (W, H))
    img.paste(gr_panel(W, mid, **gr), (0, 0))
    img.paste(ed_panel(W, H - mid, **ed), (0, mid))
    out = draw_divider(img, mid, False, W / 920)
    out.save(os.path.join(OUT, name), optimize=True)
    return out


def build():
    os.makedirs(OUT, exist_ok=True)
    res = {}
    # Header 920x430: Everdeep-Vertikal oben verankert (Logo, Drache, Held)
    W, H = 920, 430
    res["header"] = side_by_side(W, H, dict(cx=W * 0.25, cy=H * 0.42, logo_w=W * 0.44, fx=0.62, fy=0.6),
                                 dict(src=ED["vertical"], fx=0.5, fy=0.0, pad=8), "bundle_header_capsule_920x430.png")
    # Small 462x174: Everdeep-Header links verankert, Logo ganz im Bild
    W, H = 462, 174
    res["small"] = side_by_side(W, H, dict(cx=W * 0.25, cy=H * 0.5, logo_w=W * 0.45, fx=0.62, fy=0.6),
                                dict(src=ED["header"], fx=0.0, fy=0.5, pad=8), "bundle_small_capsule_462x174.png")
    # Main 1232x706: Everdeep-Vertikal passt fast exakt in die Hälfte
    W, H = 1232, 706
    res["main"] = side_by_side(W, H, dict(cx=W * 0.25, cy=H * 0.38, logo_w=W * 0.43, fx=0.62, fy=0.6),
                               dict(src=ED["vertical"], fx=0.5, fy=0.05, pad=10), "bundle_main_capsule_1232x706.png")
    # Vertical 748x896: übereinander, unten Everdeep-Main links verankert
    W, H = 748, 896
    res["vertical"] = stacked(W, H, dict(cx=W * 0.5, cy=H * 0.21, logo_w=W * 0.8, fx=0.6, fy=0.5),
                              dict(src=ED["main"], fx=0.0, fy=0.5, pad=0), "bundle_vertical_capsule_748x896.png")
    # Titelbild des Pakets 1414x464 (Kopf der Bündelseite; Steamworks verlangt die doppelte Größe von 707x232)
    W, H = 1414, 464
    res["bundleheader"] = side_by_side(W, H, dict(cx=W * 0.25, cy=H * 0.5, logo_w=W * 0.44, fx=0.62, fy=0.6),
                                       dict(src=ED["main"], fx=0.0, fy=0.5, pad=18), "bundle_page_header_1414x464.png")
    return res


if __name__ == "__main__":
    for k, v in build().items():
        print(k, v.size)
