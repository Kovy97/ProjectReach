# claude:2026-10-31T20:59:51+01:00 Store-Logo (breite Fassung) aus dem Store-Header 920x430 freistellen.
# Platte und Schrift per GrabCut; die Krone steht vor dunklem Wald, dort weiche Hülle statt harter Kante.
# Aufruf aus G:\GameDev:  python -I -X utf8 marketing/bundle-everdeep/extract_store_logo.py
import os
import cv2
import numpy as np
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "grim-reach", "store_header_920x430.jpg")
OUT = os.path.join(HERE, "grim-reach", "logo_store_cutout.png")


def main():
    img = cv2.imread(SRC)
    m = np.zeros(img.shape[:2], np.uint8)
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(img, m, (22, 88, 610, 220), bgd, fgd, 10, cv2.GC_INIT_WITH_RECT)
    g = ((m == 1) | (m == 3)).astype(np.uint8) * 255
    # zweite Runde mit Maske: sicherer Kern, Wald-Türkis in der Kronenzone als Hintergrund
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(int)
    m2 = np.full(g.shape, cv2.GC_BGD, np.uint8)
    m2[cv2.dilate(g, np.ones((9, 9), np.uint8)) > 0] = cv2.GC_PR_BGD
    m2[g > 0] = cv2.GC_PR_FGD
    m2[cv2.erode(g, np.ones((7, 7), np.uint8)) > 0] = cv2.GC_FGD
    cz = np.zeros(g.shape, bool)
    cz[95:166, 197:473] = True
    tree = (hsv[..., 0] >= 84) & (hsv[..., 0] <= 102) & (hsv[..., 1] > 110) & (hsv[..., 2] >= 36)
    m2[cz & tree & (m2 != cv2.GC_FGD)] = cv2.GC_PR_BGD
    cv2.grabCut(img, m2, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
    fg = ndimage.binary_fill_holes((m2 == 1) | (m2 == 3))
    lab, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, lab, range(1, n + 1))
    fg = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 300])
    hard = cv2.erode(cv2.medianBlur((fg * 255).astype(np.uint8), 3), np.ones((2, 2), np.uint8))
    alpha = cv2.GaussianBlur(hard, (0, 0), 0.7).astype(np.float32)
    # Krone: vor dunklem Wald. Pixelweise trennen: Wald = gesättigtes Türkis mit V >= 34, alles andere in der
    # Hülle der Krone ist Metall (helle Hörner, sehr dunkle Basis, rotes Juwel).
    crown = hard.copy()
    crown[~cz] = 0
    hull = np.zeros(g.shape, np.uint8)
    cv2.fillConvexPoly(hull, cv2.convexHull(cv2.findNonZero(crown)), 255)
    hull = cv2.dilate(hull, np.ones((5, 5), np.uint8))
    teal = (hsv[..., 0] >= 80) & (hsv[..., 0] <= 106) & (hsv[..., 1] > 90) & (hsv[..., 2] >= 34)
    # dunkle Pixel oberhalb der Kronenbasis nur dicht an hellen Hörnern behalten (sonst Waldschatten)
    bright = ((hsv[..., 2] > 70) & ~teal).astype(np.uint8) * 255
    near_bright = cv2.dilate(bright, np.ones((5, 5), np.uint8)) > 0
    below_base = np.zeros(g.shape, bool)
    below_base[130:, :] = True
    keep = ((hull > 0) & ~teal & (near_bright | below_base)).astype(np.uint8) * 255
    keep = cv2.morphologyEx(keep, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    keep = cv2.medianBlur(keep, 3)
    lab2, n2 = ndimage.label(keep > 0)
    sizes2 = ndimage.sum(keep > 0, lab2, range(1, n2 + 1))
    keep = np.isin(lab2, [i + 1 for i, s in enumerate(sizes2) if s > 60]).astype(np.uint8) * 255
    crown_alpha = cv2.GaussianBlur(keep, (0, 0), 0.7).astype(np.float32)
    zone = np.zeros(g.shape, np.float32)
    zone[95:150, 197:473] = 1.0
    zone = cv2.GaussianBlur(zone, (0, 0), 3)
    alpha = alpha * (1 - zone) + crown_alpha * zone
    alpha = np.maximum(alpha, cv2.GaussianBlur(cv2.erode(hard, np.ones((5, 5), np.uint8)), (0, 0), 0.7).astype(np.float32))
    a8 = np.clip(alpha, 0, 255).astype(np.uint8)
    x, y, w, h = cv2.boundingRect((a8 > 8).astype(np.uint8))
    # Waldtürkis, das in der Krone hängen bleibt, zu neutralem Eisen entsättigen
    hsv8 = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    tealish = (hsv8[..., 0] >= 78) & (hsv8[..., 0] <= 108) & (hsv8[..., 1] > 50)
    fix = tealish & (zone > 0.05)
    hsv8[..., 1] = np.where(fix, (hsv8[..., 1] * 0.15).astype(np.uint8), hsv8[..., 1])
    hsv8[..., 2] = np.where(fix, (hsv8[..., 2] * 0.75).astype(np.uint8), hsv8[..., 2])
    img = cv2.cvtColor(hsv8, cv2.COLOR_HSV2BGR)
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = a8
    cv2.imwrite(OUT, rgba[y:y + h, x:x + w])
    print("logo", w, h, round(w / h, 2), "->", OUT)


if __name__ == "__main__":
    main()
