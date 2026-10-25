# claude:2026-10-25T10:15:00+01:00 — Monster-Asset-Audit 25.10.: read-only Alpha-Messung aller Monsterbilder.
"""Misst Alpha-Qualitaet aller Monster-Bilder (read-only, ein Prozess).

Aufruf:  python -I measure.py <ausgabe-ordner> [<eingangs-ordner>]

Je Datei: Maße, Alpha-Histogramm, Canvas-Randberuehrung, RGB unter alpha=0 (nur Prozesshinweis,
im Browser unsichtbar), sichtbare Kantenkontamination (Farbe der halbtransparenten Kantenpixel
gegen das naechste deckende Motivpixel), deckender Fremdsaum, harte Treppenkanten,
halbtransparente Koerperflaechen, Bodenplatte/Schlagschatten, Schachbrett, Kruemel.
Basismethode aus CODEX/work/2026-08-28-asset-fehler-audit (Matte-Modell, Hidden-RGB) uebernommen
und um die sichtbaren Kantenwerte erweitert.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(r"G:\GameDev")
MONSTERS = ROOT / "apps/client/src/renderer/assets/monsters"


def luma(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def chroma_axes(rgb: np.ndarray) -> dict[str, np.ndarray]:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return {
        "magenta": (r + b) / 2 - g,
        "green": g - (r + b) / 2,
        "cyan": (g + b) / 2 - r,
        "blue": b - (r + g) / 2,
    }


def hue_name(r: float, g: float, b: float) -> str:
    mx, mn = max(r, g, b), min(r, g, b)
    if mx < 40:
        return "schwarz"
    if mx - mn < 30:
        return "weiss" if mn > 200 else "grau"
    ax = {"magenta": (r + b) / 2 - g, "gruen": g - (r + b) / 2, "cyan": (g + b) / 2 - r, "blau": b - (r + g) / 2,
          "rot": r - (g + b) / 2, "gelb": (r + g) / 2 - b}
    return max(ax, key=ax.get)


def analyze(path: Path) -> dict[str, object]:
    with Image.open(path) as im:
        fmt, mode, (W, H) = im.format, im.mode, im.size
        rgba = np.asarray(im.convert("RGBA"))
    a = rgba[..., 3].astype(np.int16)
    rgb = rgba[..., :3].astype(np.float32)
    row: dict[str, object] = {"file": path.name, "id": path.stem, "format": fmt, "mode": mode, "w": W, "h": H,
                              "bytes": path.stat().st_size}
    n = a.size
    row["alpha_min"], row["alpha_max"] = int(a.min()), int(a.max())
    row["pct_a0"] = round(100 * float((a == 0).mean()), 2)
    row["pct_a255"] = round(100 * float((a == 255).mean()), 2)
    row["pct_partial"] = round(100 * float(((a > 0) & (a < 255)).mean()), 3)
    row["alpha_levels"] = int(len(np.unique(a)))

    vis = a > 16
    ys, xs = np.nonzero(vis)
    if len(xs) == 0:
        row["empty"] = True
        return row
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    row.update({"bbox": f"{x0},{y0},{x1},{y1}", "m_left": x0, "m_right": W - 1 - x1, "m_top": y0, "m_bottom": H - 1 - y1,
                "fill_w_pct": round(100 * bw / W, 1), "fill_h_pct": round(100 * bh / H, 1)})
    # Canvas-Rand: sichtbare Pixel in den aeussersten 2 px
    row["edge_top"] = int((a[:2, :] > 16).sum())
    row["edge_bottom"] = int((a[-2:, :] > 16).sum())
    row["edge_left"] = int((a[:, :2] > 16).sum())
    row["edge_right"] = int((a[:, -2:] > 16).sum())

    # RGB unter alpha = 0 (nur Prozesshinweis)
    hidden = rgb[a == 0]
    if len(hidden):
        q = hidden.astype(np.int32) // 16
        packed = q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]
        counts = np.bincount(packed, minlength=4096)
        dom = int(counts.argmax())
        dr, dg, db = (dom // 256) * 16 + 8, ((dom // 16) % 16) * 16 + 8, (dom % 16) * 16 + 8
        row["hidden_rgb"] = f"{dr},{dg},{db}"
        row["hidden_name"] = hue_name(dr, dg, db)
        row["hidden_dom_pct"] = round(100 * counts[dom] / len(hidden), 1)
    else:
        row["hidden_rgb"], row["hidden_name"], row["hidden_dom_pct"] = "", "", 0.0

    transparent = a < 8
    opaque = a >= 250
    dist_t = ndimage.distance_transform_edt(~transparent)
    dist_o, idx = ndimage.distance_transform_edt(~opaque, return_indices=True)
    ref = rgb[idx[0], idx[1]]
    lum, lum_ref = luma(rgb), luma(ref)
    ax, ax_ref = chroma_axes(rgb), chroma_axes(ref)

    solid = a >= 128
    contour = solid & ~ndimage.binary_erosion(solid)
    contour_len = max(1, int(contour.sum()))
    row["contour_len"] = contour_len

    # Sichtbare Kantenkontamination: halbtransparente Pixel nahe Rand, mind. alpha 40 (sichtbar)
    band = (a >= 40) & (a <= 245) & (dist_o <= 10) & (dist_t <= 12)
    nb = max(1, int(band.sum()))
    row["band_px"] = int(band.sum())
    w = a.astype(np.float32) / 255.0
    dl = lum - lum_ref
    bright = band & (dl > 55)
    dark = band & (dl < -55)
    row["fringe_bright_pct"] = round(100 * bright.sum() / nb, 2)
    row["fringe_dark_pct"] = round(100 * dark.sum() / nb, 2)
    row["fringe_bright_w"] = round(float((w * bright).sum()) / contour_len, 4)
    row["fringe_dark_w"] = round(float((w * dark).sum()) / contour_len, 4)
    for name in ("magenta", "green", "cyan", "blue"):
        hit = band & (ax[name] > 45) & (ax[name] - ax_ref[name] > 40)
        row[f"fringe_{name}_pct"] = round(100 * hit.sum() / nb, 2)
        row[f"fringe_{name}_w"] = round(float((w * hit).sum()) / contour_len, 4)
    # neutral-weiss an dunklem Motiv (Weissmatte)
    whiteish = band & (rgb.min(axis=2) > 185) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 40) & (lum_ref < 120)
    row["fringe_white_pct"] = round(100 * whiteish.sum() / nb, 2)
    row["fringe_white_w"] = round(float((w * whiteish).sum()) / contour_len, 4)

    # Deckender Fremdsaum: 1-2 px deckender Rand, der sich vom Inneren (6-10 px) stark abhebt
    rim = opaque & (dist_t <= 2.5)
    inner = opaque & (dist_t >= 6) & (dist_t <= 10)
    if inner.any() and rim.any():
        _, idx_i = ndimage.distance_transform_edt(~inner, return_indices=True)
        inner_ref = rgb[idx_i[0], idx_i[1]]
        dli = lum - luma(inner_ref)
        nr = max(1, int(rim.sum()))
        rim_bright = rim & (dli > 60) & (rgb.min(axis=2) > 160)
        rim_dark = rim & (dli < -70) & (lum < 45)
        row["rim_bright_pct"] = round(100 * rim_bright.sum() / nr, 2)
        row["rim_dark_pct"] = round(100 * rim_dark.sum() / nr, 2)
        axi = chroma_axes(inner_ref)
        rim_chroma = np.zeros_like(rim)
        for name in ("magenta", "green", "cyan", "blue"):
            rim_chroma |= rim & (ax[name] > 50) & (ax[name] - axi[name] > 45)
        row["rim_chroma_pct"] = round(100 * rim_chroma.sum() / nr, 2)
    else:
        row["rim_bright_pct"] = row["rim_dark_pct"] = row["rim_chroma_pct"] = 0.0

    # Harte Treppenkanten: Anteil direkter Spruenge transparent(<16) -> deckend(>240) an allen Uebergaengen
    def jumps(p: np.ndarray, q: np.ndarray) -> tuple[int, int]:
        trans = ((p < 16) & (q >= 128)) | ((q < 16) & (p >= 128))
        hard = ((p < 16) & (q > 240)) | ((q < 16) & (p > 240))
        return int(hard.sum()), int(trans.sum())
    h1, t1 = jumps(a[:, :-1], a[:, 1:])
    h2, t2 = jumps(a[:-1, :], a[1:, :])
    row["hard_step_pct"] = round(100 * (h1 + h2) / max(1, t1 + t2), 1)
    row["partial_per_contour"] = round(int(((a > 8) & (a < 247)).sum()) / contour_len, 2)

    # Halbtransparente Koerperflaechen tief im Motiv
    deep = dist_t >= 18
    deep_vis = deep & (a >= 20)
    row["deep_translucent_pct"] = round(100 * int((deep_vis & (a <= 200)).sum()) / max(1, int(deep_vis.sum())), 2)

    # Bodenplatte / Schlagschatten
    band_h = max(3, int(round(bh * 0.04)))
    cols = np.arange(x0, x1 + 1)
    sub = solid[y0:y1 + 1, x0:x1 + 1]
    has = sub.any(axis=0)
    lowest = np.where(has, bh - 1 - np.argmax(sub[::-1, :], axis=0), -1)
    row["ground_cols_pct"] = round(100 * float(((lowest >= bh - band_h) & has).sum()) / max(1, bw), 1)
    bottom = slice(y1 - max(3, int(bh * 0.15)), y1 + 1)
    sh = (a[bottom] >= 20) & (a[bottom] <= 210) & (lum[bottom] < 70)
    row["shadow_pct"] = round(100 * float(sh.mean()), 2)
    # breiteste deckende Zeile im unteren 6 %-Streifen relativ zur Bbox-Breite
    bot = solid[y1 - max(3, int(bh * 0.06)):y1 + 1, x0:x1 + 1]
    row["bottom_row_span_pct"] = round(100 * float(bot.any(axis=0).mean()), 1)

    # Schachbrett: neutral-helle deckende Pixel, Paritaetsdifferenz in Rasterzellen
    neutral = (a > 200) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 14) & (lum > 140)
    row["neutral_light_px"] = int(neutral.sum())
    best = 0.0
    if neutral.sum() > 1500:
        yy, xx = np.nonzero(neutral)
        lv = lum[yy, xx]
        for b in (8, 10, 12, 16, 20, 24, 32):
            for off in (0, b // 2):
                par = (((xx + off) // b) + ((yy + off) // b)) % 2
                g0, g1 = lv[par == 0], lv[par == 1]
                if len(g0) > 400 and len(g1) > 400:
                    best = max(best, abs(float(g0.mean()) - float(g1.mean())))
    row["checker_score"] = round(best, 1)

    # Kruemel: kleine sichtbare Inseln abseits der Hauptsilhouette
    lab, nlab = ndimage.label(a > 24)
    if nlab > 1:
        sizes = ndimage.sum_labels(np.ones_like(a), lab, index=np.arange(1, nlab + 1))
        main = int(np.argmax(sizes)) + 1
        small = (sizes < 60)
        row["specks"] = int(small.sum())
        row["islands_big"] = int(((sizes >= 60) & (np.arange(1, nlab + 1) != main)).sum())
    else:
        row["specks"], row["islands_big"] = 0, 0
    return row


def main() -> None:
    # claude:2026-10-25T10:31:00+01:00 — optionaler 2. Parameter: anderer Eingangsordner (z. B. Mira-Lieferung).
    out = Path(sys.argv[1])
    src = Path(sys.argv[2]) if len(sys.argv) > 2 else MONSTERS
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for path in sorted(src.iterdir()):
        if path.suffix.lower() in {".webp", ".png"}:
            rows.append(analyze(path))
            print(path.name, flush=True)
    keys: list[str] = []
    for r in rows:
        for k in r:
            if k not in keys:
                keys.append(k)
    with (out / "metrics.csv").open("w", newline="", encoding="utf-8-sig") as fh:
        wr = csv.DictWriter(fh, fieldnames=keys)
        wr.writeheader()
        wr.writerows(rows)
    (out / "metrics.json").write_text(json.dumps(rows, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
