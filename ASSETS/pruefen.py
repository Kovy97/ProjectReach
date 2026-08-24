"""Abnahme gelieferter Freisteller — Grim Reach.

Prueft, was sich messen laesst, und zwar in BEIDE Richtungen:

  1. ZU VIEL FARBE — Keyfarbe unter dem Alpha, Farbsaum an der Silhouette.
     Das war der Fehler der Magenta-Altlast.

  2. ZU WENIG MOTIV — die Silhouette ist in getrennte Inseln zerfallen.
     Das war der Fehler bei `mire_wisp`: technisch makellos (echtes Alpha, kein
     Saum, 86 % transparent) und trotzdem kaputt, weil der gruene Key die halbe
     Figur mitgenommen hatte. Zwei Messungen an einem Tag haben gruen gemeldet,
     waehrend das Bild zerrissen war — deshalb steht dieser Test hier.

  3. Format, Alphakanal, weiche Kanten, Silhouette im Kleinen.

Aufruf:  python ASSETS/pruefen.py <ordner> [<vergleichsordner>]
"""
import os
import sys
from collections import deque

from PIL import Image

MONSTER = r"G:\GameDev\apps\client\src\renderer\assets\monsters"


def inseln(alpha, w, h, schwelle=40):
    """Zusammenhaengende deckende Flaechen finden (4-Nachbarschaft, iterativ)."""
    gesehen = bytearray(w * h)
    gefunden = []
    for start in range(w * h):
        if gesehen[start] or alpha[start] < schwelle:
            continue
        groesse = 0
        q = deque([start])
        gesehen[start] = 1
        while q:
            i = q.popleft()
            groesse += 1
            x, y = i % w, i // w
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if not gesehen[j] and alpha[j] >= schwelle:
                        gesehen[j] = 1
                        q.append(j)
        gefunden.append(groesse)
    gefunden.sort(reverse=True)
    return gefunden


def pruefe(pfad):
    orig = Image.open(pfad)
    im = orig.convert("RGBA")
    # Fuer die Inselsuche verkleinern: haelt die Laufzeit im Rahmen, ohne feine
    # Verbindungen zu zerreissen (NEAREST wuerde duenne Braecken kappen).
    klein = im.copy()
    klein.thumbnail((300, 300), Image.LANCZOS)
    kw, kh = klein.size
    a = [p[3] for p in klein.getdata()]
    teile = inseln(a, kw, kh)
    gesamt_deckend = sum(teile) or 1
    groesste = teile[0] / gesamt_deckend if teile else 0
    # Nur Inseln ab 2 % zaehlen als eigenstaendige Bruchstuecke; alles darunter sind
    # gewollte Partikel (Glut, Funken, Tropfen).
    bruchstuecke = [t for t in teile if t / gesamt_deckend > 0.02]

    w, h = im.size
    px = im.load()
    schritt = max(1, max(w, h) // 400)
    tr = weich = deck = 0
    key_m = key_g = 0
    saum_m = saum_g = rand = 0
    for y in range(0, h, schritt):
        for x in range(0, w, schritt):
            r, g, b, al = px[x, y]
            if al < 16:
                tr += 1
                if r > 100 and b > 100 and g < min(r, b) * 0.7:
                    key_m += 1
                elif g > 100 and r < g * 0.7 and b < g * 0.7:
                    key_g += 1
                continue
            if al < 240:
                weich += 1
            else:
                deck += 1
            for dx, dy in ((schritt, 0), (-schritt, 0), (0, schritt), (0, -schritt)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] < 40:
                    rand += 1
                    if r > 90 and b > 90 and g < min(r, b) * 0.62 and (r + b) - 2 * g > 70:
                        saum_m += 1
                    elif g > 90 and r < g * 0.75 and b < g * 0.75 and 2 * g - (r + b) > 40:
                        saum_g += 1
                    break

    sicht = weich + deck or 1
    name = os.path.basename(pfad)
    kennung = name.rsplit(".", 1)[0]

    fehler, hinweise = [], []
    if orig.mode not in ("RGBA", "LA"):
        fehler.append("kein Alphakanal")
    if tr == 0:
        fehler.append("keine Transparenz")
    if max(orig.size) < 1024:
        fehler.append(f"zu klein ({orig.size[0]}x{orig.size[1]})")
    if key_m or key_g:
        fehler.append(f"Keyfarbe unter Alpha (m {key_m} / g {key_g})")
    if rand and saum_m / rand > 0.01:
        fehler.append(f"Magenta-Saum {saum_m}/{rand}")
    if rand and saum_g / rand > 0.01:
        fehler.append(f"Gruen-Saum {saum_g}/{rand}")
    if len(bruchstuecke) > 1:
        fehler.append(f"MOTIV ZERRISSEN: {len(bruchstuecke)} getrennte Teile, groesstes {groesste*100:.0f} %")
    if weich / sicht < 0.02:
        hinweise.append("sehr harte Kante (unter 2 % weiche Pixel)")

    vergleich = os.path.join(MONSTER, kennung + ".webp")
    if os.path.exists(vergleich):
        alt = Image.open(vergleich).convert("RGBA")
        alt.thumbnail((300, 300), Image.LANCZOS)
        alt_teile = inseln([p[3] for p in alt.getdata()], alt.size[0], alt.size[1])
        alt_ges = sum(alt_teile) or 1
        alt_bruch = len([t for t in alt_teile if t / alt_ges > 0.02])
        if len(bruchstuecke) > alt_bruch:
            hinweise.append(f"alte Fassung war {alt_bruch}-teilig, neue {len(bruchstuecke)}-teilig")

    zustand = "FEHLER" if fehler else ("Hinweis" if hinweise else "OK")
    print(f"\n{name}  [{zustand}]")
    print(f"  {orig.size[0]}x{orig.size[1]} {orig.mode} | transparent {tr*100/(tr+sicht):.0f} % | weiche Kanten {weich*100/sicht:.0f} %")
    print(f"  Silhouette: {len(bruchstuecke)} Teil(e), groesstes {groesste*100:.0f} % der Flaeche")
    for f in fehler:
        print(f"  FEHLER   {f}")
    for hw in hinweise:
        print(f"  Hinweis  {hw}")
    return not fehler


ordner = sys.argv[1] if len(sys.argv) > 1 else "."
dateien = sorted(f for f in os.listdir(ordner) if f.lower().endswith((".png", ".webp")))
ok = sum(pruefe(os.path.join(ordner, f)) for f in dateien)
print(f"\n{ok} von {len(dateien)} ohne Fehler.")
