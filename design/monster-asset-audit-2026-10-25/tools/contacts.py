# claude:2026-10-25T10:30:00+01:00 — Monster-Asset-Audit 25.10.: Kontaktbögen (read-only, ein Prozess).
"""Kontaktbögen für die Sichtprüfung der Monsterbilder.

  python -I contacts.py overview <out_dir> [height]          alle Bilder, je 3 Hintergründe
  python -I contacts.py detail <out_dir> <id> [<id> ...]      je Bild: Spielgröße + 2 Zoom-Ausschnitte
  python -I contacts.py zoom <out_dir> <id> x0 y0 size [scale] [tag]   gezielter Ausschnitt

Skalierung immer über vormultipliziertes Alpha (RGBa), wie Chromium/Skia filtert; RGB unter
alpha=0 hat damit keinen Einfluss auf das Bild. Die Hintergründe: Schwarz, Mittelbraun #3a2a1e
(Spielkarten), Hell #d8cfbf.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = Path(r"G:\GameDev")
MONSTERS = ROOT / "apps/client/src/renderer/assets/monsters"
BGS = [(0, 0, 0), (0x3A, 0x2A, 0x1E), (0xD8, 0xCF, 0xBF)]
FONT = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 15)
FONT_S = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 12)


def load(mid: str) -> Image.Image:
    with Image.open(MONSTERS / f"{mid}.webp") as im:
        return im.convert("RGBA")


def scaled(img: Image.Image, height: int) -> Image.Image:
    w = max(1, round(img.width * height / img.height))
    return img.convert("RGBa").resize((w, height), Image.Resampling.LANCZOS).convert("RGBA")


def on_bg(img: Image.Image, bg: tuple[int, int, int], size: tuple[int, int] | None = None) -> Image.Image:
    size = size or img.size
    canvas = Image.new("RGBA", size, (*bg, 255))
    canvas.alpha_composite(img, ((size[0] - img.width) // 2, size[1] - img.height))
    return canvas.convert("RGB")


def overview(out: Path, height: int = 230) -> None:
    ids = sorted(p.stem for p in MONSTERS.glob("*.webp"))
    per_row, rows_per = 2, 4
    cell_w = 3 * height + 2 * 4
    cell_h = height + 24
    sheet_w = per_row * cell_w + (per_row + 1) * 10
    for page, start in enumerate(range(0, len(ids), per_row * rows_per), 1):
        chunk = ids[start:start + per_row * rows_per]
        rows = (len(chunk) + per_row - 1) // per_row
        sheet = Image.new("RGB", (sheet_w, rows * (cell_h + 8) + 8), (20, 20, 22))
        d = ImageDraw.Draw(sheet)
        for i, mid in enumerate(chunk):
            img = scaled(load(mid), height)
            x = 10 + (i % per_row) * (cell_w + 10)
            y = 8 + (i // per_row) * (cell_h + 8)
            d.text((x, y), mid, font=FONT, fill=(240, 225, 190))
            for k, bg in enumerate(BGS):
                sheet.paste(on_bg(img, bg, (height, height)), (x + k * (height + 4), y + 22))
        sheet.save(out / f"overview-{page:02d}.jpg", quality=88)
        print(out / f"overview-{page:02d}.jpg")


def defect_map(img: Image.Image) -> np.ndarray:
    """Dichte sichtbarer Kanten-Auffälligkeiten (hell, farbig, deckender Saum) für die Ausschnittwahl."""
    arr = np.asarray(img).astype(np.float32)
    a, rgb = arr[..., 3], arr[..., :3]
    transparent = a < 8
    opaque = a >= 250
    dist_t = ndimage.distance_transform_edt(~transparent)
    _, idx = ndimage.distance_transform_edt(~opaque, return_indices=True)
    ref = rgb[idx[0], idx[1]]
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    lref = ref @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    band = (a >= 40) & (dist_t <= 12) & (a <= 252)
    mag = (rgb[..., 0] + rgb[..., 2]) / 2 - rgb[..., 1]
    magr = (ref[..., 0] + ref[..., 2]) / 2 - ref[..., 1]
    score = (band & (np.abs(lum - lref) > 55)).astype(np.float32) + 3 * (band & (mag > 45) & (mag - magr > 40))
    rim = opaque & (dist_t <= 2.5)
    score += 2 * (rim & ((mag > 50) | (lum < 40)))
    return score


def best_windows(score: np.ndarray, size: int, n: int = 2) -> list[tuple[int, int]]:
    dens = ndimage.uniform_filter(score, size=size, mode="constant")
    out: list[tuple[int, int]] = []
    h, w = score.shape
    for _ in range(n):
        y, x = np.unravel_index(int(np.argmax(dens)), dens.shape)
        x0 = int(min(max(0, x - size // 2), w - size))
        y0 = int(min(max(0, y - size // 2), h - size))
        out.append((x0, y0))
        dens[max(0, y0 - size):y0 + 2 * size, max(0, x0 - size):x0 + 2 * size] = -1
    return out


def crop_zoom(img: Image.Image, x0: int, y0: int, size: int, scale: int) -> Image.Image:
    c = img.crop((x0, y0, x0 + size, y0 + size))
    return c.resize((size * scale, size * scale), Image.Resampling.NEAREST)


def detail(out: Path, ids: list[str], game_h: int = 240, battle_h: int = 420, crop: int = 150, scale: int = 3,
           wins_override: dict[str, list[tuple[int, int]]] | None = None) -> None:
    """Zeile 1: Karte 240 px auf 3 Gründen. Zeile 2: Kampf ~420 px Schwarz/Hell. Je Fundstelle:
    Bildschirm-Zoom (erst auf 420 px skaliert, dann Bildschirmpixel 3x) auf 3 Gründen und
    Quell-Zoom (Originalpixel 3x) auf Schwarz/Hell."""
    for mid in ids:
        img = load(mid)
        g = scaled(img, game_h)
        b = scaled(img, battle_h)
        f = battle_h / img.height
        wins = (wins_override or {}).get(mid) or best_windows(defect_map(img), crop)
        zw = crop * scale
        sc = 96                                # Bildschirmausschnitt in Kampfgröße (Pixel)
        sw = sc * 4                            # 4x vergrößert
        width = max(3 * (game_h + 6), 2 * (battle_h + 6), 3 * (sw + 6), 2 * (zw + 6)) + 20
        top_h = 26 + game_h + 10 + battle_h + 10
        row_h = sw + 20 + zw + 30
        sheet = Image.new("RGB", (width, top_h + len(wins) * row_h + 10), (20, 20, 22))
        d = ImageDraw.Draw(sheet)
        d.text((10, 4), f"{mid}  ({img.width}x{img.height})  Karte {game_h}px | Kampf ~{battle_h}px | Bildschirm-Zoom 4x | Quell-Zoom {scale}x",
               font=FONT, fill=(240, 225, 190))
        for k, bg in enumerate(BGS):
            sheet.paste(on_bg(g, bg, (game_h, game_h)), (10 + k * (game_h + 6), 26))
        y = 26 + game_h + 10
        for k, bg in enumerate([BGS[0], BGS[2]]):
            sheet.paste(on_bg(b, bg, (battle_h, battle_h)), (10 + k * (battle_h + 6), y))
        y += battle_h + 10
        for j, (x0, y0) in enumerate(wins):
            cx, cy = (x0 + crop / 2) * f, (y0 + crop / 2) * f
            bx0 = int(min(max(0, cx - sc / 2), b.width - sc))
            by0 = int(min(max(0, cy - sc / 2), b.height - sc))
            d.text((10, y), f"Fundstelle {j + 1}: Bildschirm-Zoom 4x der Kampfgroesse ({sc}px um Quelle x={x0 + crop // 2} y={y0 + crop // 2})",
                   font=FONT_S, fill=(200, 190, 170))
            sz = b.crop((bx0, by0, bx0 + sc, by0 + sc)).resize((sw, sw), Image.Resampling.NEAREST)
            for k, bg in enumerate(BGS):
                sheet.paste(on_bg(sz, bg), (10 + k * (sw + 6), y + 16))
            y += sw + 20
            d.text((10, y), f"Quellpixel {scale}x: x={x0} y={y0} {crop}px", font=FONT_S, fill=(200, 190, 170))
            z = crop_zoom(img, x0, y0, crop, scale)
            for k, bg in enumerate([BGS[0], BGS[2]]):
                sheet.paste(on_bg(z, bg), (10 + k * (zw + 6), y + 16))
            y += zw + 30
        sheet.save(out / f"detail-{mid}.jpg", quality=88)
        print(out / f"detail-{mid}.jpg")


def zoom(out: Path, mid: str, x0: int, y0: int, size: int, scale: int = 3, tag: str = "z") -> None:
    img = load(mid)
    z = crop_zoom(img, x0, y0, size, scale)
    zw = size * scale
    sheet = Image.new("RGB", (3 * (zw + 6) + 14, zw + 30), (20, 20, 22))
    d = ImageDraw.Draw(sheet)
    d.text((8, 4), f"{mid} x={x0} y={y0} {size}px x{scale}", font=FONT_S, fill=(240, 225, 190))
    for k, bg in enumerate(BGS):
        sheet.paste(on_bg(z, bg), (8 + k * (zw + 6), 24))
    sheet.save(out / f"zoom-{mid}-{tag}.jpg", quality=90)
    print(out / f"zoom-{mid}-{tag}.jpg")


def evidence(out: Path, mid: str, x0: int, y0: int, label: str, battle_h: int = 420) -> None:
    """Kompakter Beleg: Karte 240 px (3 Gründe), Bildschirm-Zoom 4x der Kampfgröße, Quellpixel 2x."""
    img = load(mid)
    g = scaled(img, 240)
    b = scaled(img, battle_h)
    f = battle_h / img.height
    crop, sc = 150, 72
    cell = 300
    width = 3 * (cell + 6) + 14
    sheet = Image.new("RGB", (width, 30 + 246 + 3 * 22 + 2 * (cell + 6) + 8), (20, 20, 22))
    d = ImageDraw.Draw(sheet)
    d.text((8, 6), f"{mid}  -  {label}", font=FONT, fill=(240, 225, 190))
    y = 30
    for k, bg in enumerate(BGS):
        sheet.paste(on_bg(g, bg, (240, 240)), (8 + k * (cell + 6) + 30, y))
    y += 246
    d.text((8, y), f"Bildschirm-Zoom 4x bei Kampfgroesse {battle_h}px (Schwarz | Braun #3a2a1e | Hell)", font=FONT_S, fill=(200, 190, 170))
    cx, cy = (x0 + crop / 2) * f, (y0 + crop / 2) * f
    bx0 = int(min(max(0, cx - sc / 2), b.width - sc))
    by0 = int(min(max(0, cy - sc / 2), b.height - sc))
    sz = b.crop((bx0, by0, bx0 + sc, by0 + sc)).resize((sc * 4, sc * 4), Image.Resampling.NEAREST)
    y += 18
    for k, bg in enumerate(BGS):
        sheet.paste(on_bg(sz, bg), (8 + k * (cell + 6) + 6, y))
    y += cell + 4
    d.text((8, y), f"Quellpixel 2x: x={x0} y={y0} ({crop}px)", font=FONT_S, fill=(200, 190, 170))
    y += 18
    z = crop_zoom(img, x0, y0, crop, 2)
    for k, bg in enumerate(BGS):
        sheet.paste(on_bg(z, bg), (8 + k * (cell + 6), y))
    sheet.save(out / f"{mid}.jpg", quality=84)
    print(out / f"{mid}.jpg")


def main() -> None:
    mode, out = sys.argv[1], Path(sys.argv[2])
    if mode == "evidence":
        out.mkdir(parents=True, exist_ok=True)
        mid, xy, label = sys.argv[3], sys.argv[4], sys.argv[5]
        x0, y0 = (int(v) for v in xy.split(","))
        evidence(out, mid, x0, y0, label)
        return
    out.mkdir(parents=True, exist_ok=True)
    if mode == "overview":
        overview(out, int(sys.argv[3]) if len(sys.argv) > 3 else 230)
    elif mode == "detail":
        # Optional: id@x,y;x,y  erzwingt Fundstellen statt automatischer Wahl
        ids, over = [], {}
        for arg in sys.argv[3:]:
            if "@" in arg:
                mid, spec = arg.split("@", 1)
                over[mid] = [tuple(int(v) for v in p.split(",")) for p in spec.split(";")]
                ids.append(mid)
            else:
                ids.append(arg)
        detail(out, ids, wins_override=over)
    elif mode == "zoom":
        mid, x0, y0, size = sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
        scale = int(sys.argv[7]) if len(sys.argv) > 7 else 3
        tag = sys.argv[8] if len(sys.argv) > 8 else "z"
        zoom(out, mid, x0, y0, size, scale, tag)


if __name__ == "__main__":
    main()
