# claude:2026-10-24T13:08:29+02:00 — Asset-Katalog: Bildmetriken und Vorschaubilder (nur lesend auf den Quellen).
# Aufruf: python metrics.py <jobs.json> <ergebnis.json> [worker]
# jobs.json: [{"key": "items/x", "src": "<abs>", "thumb": "<abs .webp oder null>"}]
# Ergebnis: {key: {w, h, mode, alpha, ..., veil, checker, thumb}}; Fehler je Datei als {"error": "..."}.
# Benötigt Pillow und numpy. Die Schwellen für die QA-Markierungen liegen in build-index.mjs,
# hier werden nur Rohwerte gemessen, damit ein Nachjustieren keinen neuen Bildlauf braucht.
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = 80_000_000
THUMB = 256
LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def box_mean(x, r):
    # claude:2026-10-24T13:08:29+02:00 — gleitender Mittelwert (Fenster 2r+1) über Integralbild, ohne scipy
    p = np.pad(x, r + 1, mode="edge").astype(np.float64)
    c = p.cumsum(0).cumsum(1)
    k = 2 * r + 1
    s = c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]
    return (s / (k * k))[: x.shape[0], : x.shape[1]].astype(np.float32)


def label4(mask):
    # claude:2026-10-24T13:08:29+02:00 — größte 4-zusammenhängende Fläche (kleine Auflösung, daher reicht eine Flutfüllung)
    h, w = mask.shape
    seen = np.zeros(mask.shape, bool)
    best = None
    best_n = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        pts = []
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            if y > 0 and mask[y - 1, x] and not seen[y - 1, x]:
                seen[y - 1, x] = True
                stack.append((y - 1, x))
            if y + 1 < h and mask[y + 1, x] and not seen[y + 1, x]:
                seen[y + 1, x] = True
                stack.append((y + 1, x))
            if x > 0 and mask[y, x - 1] and not seen[y, x - 1]:
                seen[y, x - 1] = True
                stack.append((y, x - 1))
            if x + 1 < w and mask[y, x + 1] and not seen[y, x + 1]:
                seen[y, x + 1] = True
                stack.append((y, x + 1))
        if len(pts) > best_n:
            best_n = len(pts)
            best = pts
    return best or []


def veil_metric(rgba):
    # claude:2026-10-24T13:08:29+02:00 — „heller Schleier“: größte zusammenhängende, fast weiße, entsättigte und
    # glatte Fläche im Objekt, relativ zur Objektfläche, plus ihr Helligkeitsabstand zum Objekt-Median.
    # Abgestimmt an items/godgem_ring (milchig-weißer Rest im Ring): frac ≈ 0.037, con ≈ 164.
    im = rgba.copy()
    im.thumbnail((160, 160), Image.BOX)
    a = np.asarray(im).astype(np.float32)
    rgb = a[..., :3]
    al = a[..., 3]
    L = rgb @ LUMA
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    std = np.sqrt(np.maximum(box_mean(L * L, 2) - box_mean(L, 2) ** 2, 0))
    obj = al >= 32
    objn = int(obj.sum())
    if objn < 50:
        return {"frac": 0.0, "con": 0.0, "semi": 0.0}
    medL = float(np.median(L[obj]))
    mask = (al >= 24) & (L >= 228) & (sat <= 0.12) & (std <= 9)
    pts = label4(mask)
    if not pts:
        return {"frac": 0.0, "con": 0.0, "semi": 0.0}
    ys = np.array([p[0] for p in pts])
    xs = np.array([p[1] for p in pts])
    return {
        "frac": round(len(pts) / objn, 5),
        "con": round(float(L[ys, xs].mean()) - medL, 1),
        "semi": round(float((al[ys, xs] < 200).mean()), 3),
    }


def checker_metric(rgba):
    # claude:2026-10-24T13:08:29+02:00 — eingebackenes Schachbrett (Transparenz-Attrappe): in hellen, deckenden,
    # entsättigten Flächen kippt die Helligkeit bei Versatz um eine Feldbreite s, bei 2s nicht. Gemessen wird das
    # Verhältnis |L - L(+s)| / |L - L(+2s)| in beiden Achsen; ein Schachbrett zeigt einen klaren Gipfel über s.
    im = rgba
    if max(im.size) > 1024:
        im = im.copy()
        im.thumbnail((1024, 1024), Image.BOX)
    a = np.asarray(im).astype(np.float32)
    rgb = a[..., :3]
    al = a[..., 3]
    L = rgb @ LUMA
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    m = (al >= 200) & (L >= 225) & (sat <= 0.12)
    n = int(m.sum())
    if n < 300:
        return {"peak": 0.0, "s": 0, "prom": 0.0, "n": n}
    curve = {}
    for s in range(4, 33):
        sc = []
        for ax in (0, 1):
            if ax:
                A, B, C = L[:, : -2 * s], L[:, s:-s], L[:, 2 * s :]
                M = m[:, : -2 * s] & m[:, s:-s] & m[:, 2 * s :]
            else:
                A, B, C = L[: -2 * s], L[s:-s], L[2 * s :]
                M = m[: -2 * s] & m[s:-s] & m[2 * s :]
            if M.sum() < 100:
                sc.append(0.0)
                continue
            d1 = float(np.abs(A - B)[M].mean())
            d2 = float(np.abs(A - C)[M].mean())
            sc.append(d1 / (d2 + 0.5) if d1 >= 2.5 else 0.0)
        curve[s] = min(sc)
    s_best = max(curve, key=lambda k: curve[k])
    peak = curve[s_best]
    side = [curve.get(s_best - 4), curve.get(s_best + 4)]
    side = [v for v in side if v is not None]
    prom = peak / max(max(side), 0.05) if side else 0.0
    # claude:2026-10-24T13:15:11+02:00 — Gegenprobe über die Diagonalen: im Schachbrett hat das Feld (s, s)
    # dieselbe Farbe, natürliche Streifen/Glanzkanten (Klingen, Helme, Blitze) dagegen nicht.
    diag = 0.0
    if peak > 0:
        axis = [_shift_diff(L, m, 0, s_best), _shift_diff(L, m, s_best, 0)]
        dg = [_shift_diff(L, m, s_best, s_best), _shift_diff(L, m, s_best, -s_best)]
        if None not in axis and None not in dg:
            diag = (sum(axis) / 2) / (max(dg) + 0.5)
    return {"peak": round(peak, 3), "s": s_best, "prom": round(prom, 3), "diag": round(diag, 3), "n": n}


def _shift_diff(L, m, dy, dx):
    h, w = L.shape
    y0, y1 = max(0, -dy), h - max(0, dy)
    x0, x1 = max(0, -dx), w - max(0, dx)
    if y1 <= y0 or x1 <= x0:
        return None
    A = L[y0:y1, x0:x1]
    B = L[y0 + dy : y1 + dy, x0 + dx : x1 + dx]
    M = m[y0:y1, x0:x1] & m[y0 + dy : y1 + dy, x0 + dx : x1 + dx]
    if M.sum() < 50:
        return None
    return float(np.abs(A - B)[M].mean())


def alpha_metric(rgba):
    # claude:2026-10-24T13:08:29+02:00 — Freistellung: Anteil transparenter Pixel, deckende Randpixel und Ecken
    im = rgba.copy()
    im.thumbnail((256, 256), Image.BOX)
    al = np.asarray(im.getchannel("A")).astype(np.float32)
    h, w = al.shape
    ring = np.zeros(al.shape, bool)
    ring[:2, :] = True
    ring[-2:, :] = True
    ring[:, :2] = True
    ring[:, -2:] = True
    cs = max(3, int(round(min(h, w) * 0.06)))
    corners = [al[:cs, :cs], al[:cs, -cs:], al[-cs:, :cs], al[-cs:, -cs:]]
    return {
        "transparent": round(float((al < 16).mean()), 4),
        "opaque": round(float((al >= 250).mean()), 4),
        "edgeOpaque": round(float((al[ring] >= 250).mean()), 4),
        "cornersOpaque": int(sum(1 for c in corners if c.mean() >= 240)),
        "minA": int(al.min()),
    }


def process(job):
    key = job["key"]
    try:
        im = Image.open(job["src"])
        im.load()
        res = {"w": im.width, "h": im.height, "mode": im.mode, "format": im.format}
        has_channel = im.mode in ("RGBA", "LA", "PA", "RGBa", "La") or "transparency" in im.info
        rgba = im.convert("RGBA")
        res["alphaChannel"] = bool(has_channel)
        if has_channel:
            res["alpha"] = alpha_metric(rgba)
            used = res["alpha"]["minA"] < 250
            res["alphaUsed"] = bool(used)
            if used:
                res["veil"] = veil_metric(rgba)
                res["checker"] = checker_metric(rgba)
        else:
            res["alphaUsed"] = False
        if job.get("thumb"):
            t = rgba if has_channel else im.convert("RGB")
            t = t.copy()
            t.thumbnail((THUMB, THUMB), Image.LANCZOS)
            os.makedirs(os.path.dirname(job["thumb"]), exist_ok=True)
            t.save(job["thumb"], "WEBP", quality=82, method=4)
            res["thumb"] = True
        return key, res
    except Exception as e:  # noqa: BLE001 — einzelne kaputte Dateien dürfen den Lauf nicht abbrechen
        return key, {"error": f"{type(e).__name__}: {e}"}


def main():
    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    out_file = sys.argv[2]
    workers = int(sys.argv[3]) if len(sys.argv) > 3 else max(1, min(6, (os.cpu_count() or 2) - 2))
    results = {}
    total = len(jobs)
    if total:
        with ProcessPoolExecutor(workers) as ex:
            for i, (key, res) in enumerate(ex.map(process, jobs, chunksize=8), 1):
                results[key] = res
                if i % 200 == 0 or i == total:
                    print(f"  Bildmetriken {i}/{total}", flush=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f)


if __name__ == "__main__":
    main()
