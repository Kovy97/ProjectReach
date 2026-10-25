# claude:2026-10-25T12:37:00+01:00 — Rahmen-Ausschnitte aus den 1920er-Screenshots: echte Größe + 3x vergrößert (nearest),
# nebeneinander in einer Tafel. Aufruf: python -I crops.py
from PIL import Image, ImageDraw
import os
B = r"G:\GameDev\design\painterly-assets-2026-10-25"
S = os.path.join(B, "shots", "1920x1080")
O = os.path.join(B, "crops")
jobs = [
  ("f01_skillkarte_holzrahmen_ecke", "04-sidebar.woodcutting.png", (258, 272, 418, 392)),
  ("f02_uebersicht_holzrahmen_ecke", "01-sidebar.skills-overview.png", (276, 292, 436, 412)),
  ("f03_eisenknopf_kaempfen", "s01-kampf-zone-weiden.png", (748, 848, 1072, 968)),
  ("f04_eisenknopf_zonen", "s03-kampf-laeuft.png", (272, 152, 576, 214)),
  ("f05_topbar_reiter", "01-sidebar.skills-overview.png", (246, 0, 646, 54)),
  ("f06_sidebar_knopf", "04-sidebar.woodcutting.png", (4, 156, 236, 290)),
  ("f07_ausruestungsslots", "25-topbar.character.png", (780, 252, 1040, 512)),
  ("f08_itemkarte_kopf", "s07-itemkarte-inventar.png", (1296, 466, 1600, 620)),
  ("f09_itemkarte_ecke_unten", "s07-itemkarte-inventar.png", (1660, 860, 1884, 980)),
  ("f10_dialog_ecke", "s09-dialog-beute-zerlegen.png", (594, 362, 834, 470)),
  ("f11_dialog_schliessen_knopf", "s09-dialog-beute-zerlegen.png", (1250, 372, 1324, 430)),
  ("f12_bankslots", "28-topbar.bank.png", (1076, 452, 1364, 640)),
  ("f13_kampf_beutefenster", "s03-kampf-laeuft.png", (1106, 576, 1484, 812)),
  ("f14_xp_balken_topbar", "04-sidebar.woodcutting.png", (1056, 62, 1650, 106)),
  ("f15_inventar_slots", "25-topbar.character.png", (1236, 378, 1520, 570)),
  ("f16_seitenhintergrund_holz", "16-sidebar.herblore.png", (700, 560, 1880, 1076)),
  ("f17_newhaven_listenkarte", "03-sidebar.newhaven.png", (278, 226, 836, 382)),
  ("f18_sidebar_segen_karte", "04-sidebar.woodcutting.png", (0, 0, 240, 156)),
]
for name, shot, box in jobs:
    p = os.path.join(S, shot)
    if not os.path.exists(p): print("fehlt", p); continue
    im = Image.open(p).convert("RGB").crop(box)
    z = 3 if im.size[0] < 450 else 2
    big = im.resize((im.size[0] * z, im.size[1] * z), Image.NEAREST)
    W = im.size[0] + 12 + big.size[0]; H = max(im.size[1], big.size[1]) + 20
    sheet = Image.new("RGB", (W, H), (20, 20, 20))
    sheet.paste(im, (0, 20)); sheet.paste(big, (im.size[0] + 12, 20))
    ImageDraw.Draw(sheet).text((4, 4), f"{name}  |  {shot} {box}  |  links 1:1, rechts {z}x", fill=(240, 220, 160))
    sheet.save(os.path.join(O, name + ".png"))
    print(name)
