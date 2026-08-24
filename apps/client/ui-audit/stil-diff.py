"""Pixelvergleich zweier stil-vergleich.mjs-Laeufe.

Der Schatten- und Rahmen-Umbau fuer 1.1.0 fasst Dateien an, die fast jeden Bildschirm
betreffen. Eine Aussage wie "sieht noch gut aus" ist ohne diesen Vergleich geraten — und
in diesem Projekt hat "gruen gemessen" schon mehrfach gelogen, waehrend das Bild kaputt war.
Darum: fuer jede Szene den Anteil geaenderter Pixel, dazu ein Differenzbild, das die
Aenderung sichtbar macht. Die Zahl sagt WO man hinsehen muss; hinsehen muss man trotzdem.

Aufruf:  python ui-audit/stil-diff.py [vorher] [nachher]
"""
import os
import sys

from PIL import Image, ImageChops

WURZEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_stilvergleich")
A = sys.argv[1] if len(sys.argv) > 1 else "vorher"
B = sys.argv[2] if len(sys.argv) > 2 else "nachher"


def bilder(label):
    """Screenshots eines Laufs einsammeln, egal in welchem shots-<breite>-Unterordner."""
    raus = {}
    wurzel = os.path.join(WURZEL, label)
    for ordner, _, dateien in os.walk(wurzel):
        for d in dateien:
            if d.lower().endswith(".png"):
                raus[d] = os.path.join(ordner, d)
    return raus


va, na = bilder(A), bilder(B)
if not va or not na:
    print(f"Fehlt: {A}={len(va)} Bilder, {B}={len(na)} Bilder")
    sys.exit(1)

ziel = os.path.join(WURZEL, "diff")
os.makedirs(ziel, exist_ok=True)

gemeinsam = sorted(set(va) & set(na))
nur_a = sorted(set(va) - set(na))
nur_b = sorted(set(na) - set(va))

zeilen = []
for name in gemeinsam:
    x = Image.open(va[name]).convert("RGB")
    y = Image.open(na[name]).convert("RGB")
    if x.size != y.size:
        zeilen.append((100.0, name, f"GROESSE {x.size} -> {y.size}"))
        continue
    d = ImageChops.difference(x, y)
    # Ein Pixel gilt als geaendert, wenn irgendein Kanal um mehr als 2 abweicht —
    # darunter liegt Kompressions- und Antialiasing-Rauschen.
    maske = d.convert("L").point(lambda v: 255 if v > 2 else 0)
    geaendert = sum(maske.histogram()[255:])
    anteil = geaendert * 100.0 / (x.width * x.height)
    if geaendert:
        # Differenz aufhellen, sonst sieht man feine Schattenaenderungen nicht.
        ImageChops.multiply(d, d).point(lambda v: min(255, v * 8)).save(
            os.path.join(ziel, f"diff-{name}")
        )
    zeilen.append((anteil, name, f"{anteil:6.3f} % geaendert"))

zeilen.sort(reverse=True)
print(f"{len(gemeinsam)} Szenen verglichen ({A} -> {B})\n")
for anteil, name, text in zeilen:
    marke = "   " if anteil == 0 else (" ! " if anteil < 1 else " !!")
    print(f"{marke}{text:24}  {name}")

unveraendert = sum(1 for a, _, _ in zeilen if a == 0)
print(f"\n{unveraendert} von {len(gemeinsam)} Szenen unveraendert.")
if nur_a:
    print(f"nur in {A}: {nur_a}")
if nur_b:
    print(f"nur in {B}: {nur_b}")
print(f"Differenzbilder: {ziel}")
