---
name: chroma-key-tool
description: Wiederverwendbares Python-Chroma-Key-Tool für Chef-Assets liegt in Downloads\ASSETS\chroma-key.py
metadata: 
  node_type: memory
  type: reference
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef generiert Assets jetzt auf vollfarbigem Chroma-Hintergrund (grün/blau/cyan/magenta/violett; Erze auf Weiß) statt transparent — siehe [[chatgpt-prompt-chroma-key]]. Zum sauberen Freistellen liegt ein erprobtes Tool:

**`C:\Users\MSchu\Downloads\ASSETS\chroma-key.py`** (Python 3.12 + Pillow + numpy + scipy, alle vorhanden).
CLI: `python chroma-key.py <src_folder> [<dst_folder>]` → keyed/-Unterordner mit transparenten RGBA-PNGs; erkennt Hintergrundfarbe/-typ je Bild automatisch.

**Methode (falls neu bauen/anpassen nötig):** Rand-Ring-Modalfarbe = bg-Farbe C; Basis = randverbundene Flood-Fill von (Abstand<42) entfernen → schützt Motiv-Inneres (grüne Goblin-Haut, olive NPC-Töne, weiße Erz-Glanzlichter). Enge Taschen (Abstand<24) auch bei mittlerem Grün entfernen (reine BG-Reste zwischen Stofffetzen), Weiß-BG (sat<40) ausgenommen. Weiche Kanten-Feder + Farb-Entmischung F=(px−(1−a)·C)/a gegen Säume; Spill-Regate + gerichtete Kanten-Entspillung (nur Key-Kanal im 2px-Silhouetten-Ring). Verifikation IMMER über Magenta-Composite (Halos/Löcher schreien gegen Magenta) UND Kontaktbogen auf Schachbrett.

**Grenzfall dokumentiert:** Wenn grüne Energie TEIL des Motivs ist (Ausweich-Runen: grüner Wirbel) — bleibt erhalten, weil nicht randverbunden. Speisen mit dünnen Flammenspitzen (abyssal_feast, soulfire_banquet, voidray_banquet) hatten grüne Chroma-Reste an Sub-Pixel-Spitzen → OVERRIDE-Liste mit `extra_kill`. Deckende hellgrüne Flammen-Kerne sind Motiv-Pixel, nicht Halo → NICHT wegschneiden (wäre Retusche). Siehe auch [[asset-bind-all-references]], [[archive-integrated-assets]].

**WICHTIG — Schritt 2 Pflicht (Lehre 2026-07-17, Chef fand grüne Artefakte):** Keying allein reicht NICHT. GPT-Bilder tragen Key-Farb-SPILL auf deckenden Motiv-Pixeln (Reflexe auf Metallklingen/Ketten, Schein in Haaren, teils in Key-Farbe gemalte Flammen) — unsichtbar gegen Magenta, deutlich vor Weiß und in 1:1-Zoom. Darum nach dem Keyen IMMER `chroma-despill.py` (liegt daneben) laufen lassen: globale klassenbasierte Spill-Unterdrückung — green_strict (Goblin-Haut schützen, R<0,5·G), green_normal (R<0,7·G), blue/cyan analog, recolor_flame (Restgrün→Blau verschieben bei Seelenfeuer-Speisen), keep (Runen, icon_regen, Erze). Kappwert exakt max(andere Kanäle), KEIN Offset (+6 ließ Grünstich auf Stahlklingen). Verifikation: Weiß-Composite-Kontaktbogen + automatischer Zoom auf die „grünste Kantenstelle" je Bild (g_excess-Peak), nie nur Magenta/Schachbrett in Übersichtsgröße.
