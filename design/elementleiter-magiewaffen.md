# Elementleiter der Magiewaffen (Chef-GO 28.08.2026)

**Anlass:** Zählung 28.08.: 57 Magie-Haupthände, davon 24 Feuer (alle gefertigten Stäbe), 14 Blitz, 10 Frost, 5 Arkan (nur Drops), 2 Gift, 2 Leere, 0 Aether (Aether-Waffen tragen Brand). Zwei Drittel der Partikel-Bibliothek waren damit unsichtbar. Chef: „Es sollte alle Elementtypen im Early, Mid und Endgame geben, vielleicht mit Ausnahme von Void und Aether.“

## Regel

Jede Handwerks-Stufe hat einen Stab (zweihändig) und einen Zauberstab (einhändig) mit **verschiedenen** Elementen. Über die Leiter kommen alle Elemente in jeder Phase vor; Aether erst ab Titan (Endgame), Leere ab Schwarzstahl. Drops und Champion-Waffen bleiben, wie sie sind (sie füllen Arkan, Gift, Leere zusätzlich).

| Stufe | Req | Stab (2H) | Zauberstab (1H) |
|---|---|---|---|
| Rissig / Knorrig (Start) | 0 / 1 | Arkan (cracked_staff) · Feuer (gnarled_staff) | — |
| Kupfer | 1 | Feuer | Frost |
| Bronze | 5 | Blitz | Gift |
| Eisen | 10 | Feuer | Frost |
| Stahl | 20 | Arkan | Blitz |
| Schwarzstahl | 30 | Leere | Gift |
| Mithril | 40 | Frost | Feuer |
| Adamantium | 50 | Blitz | Arkan |
| Runit | 60 | Gift | Leere |
| Blutiron | 70 | Feuer | Frost |
| Titan | 80 | Aether | Blitz |
| Aetherium | 90 | Aether | Arkan |
| Götzeneisen | 99 | Leere | Feuer |

**Phasenprobe:** Early (≤30): Feuer, Frost, Blitz, Gift, Arkan, Leere (ab 30). Mid (40–60): Frost, Feuer, Blitz, Arkan, Gift, Leere. End (70–99): Feuer, Frost, Aether, Blitz, Arkan, Leere. Aether nur Endgame (Chef-Ausnahme).

## Mechanik je Element (bestehende Effekt-Typen, keine neuen Systeme)

| Element | Status/Effekt | Renderer-Thema |
|---|---|---|
| Feuer | `burn` | fire |
| Frost | `frost` / `frostbite` | frost |
| Blitz | `shock` | shock |
| Gift | `poison` / `plaguebearer` | poison |
| Leere | `bane` oder `execute` | void |
| Arkan | kein Status, dafür etwas höhere Grundspanne oder Crit-Chance (Parität) | arcane (Standard) |
| Aether | Ward-Bruch/Mana-Rückfluss (bestehender Typ, z. B. `manaOnKill` oder Ward-Pen) statt Brand | aether (ID-Präfix `aether`/`godspark`, künftig explizit `magicTheme`) |

Magnituden je Stufe: vom gleichstufigen Bestandsvertreter desselben Elements übernehmen (Beispiel: Frost-Stab Mithril nimmt die Frost-Werte des Mithril-Zauberstabs, skaliert auf 2H wie die Feuer-Stäbe gegenüber Feuer-Zauberstäben). DPS-Parität je Stufe bleibt Pflicht; Balance-Pins (balance-envelope §2/§5) danach neu messen und mit Chef-GO-Kommentar pinnen.

## Sichtbarkeit

`combatFx.ts` `magicThemeFor`: zusätzlich optionales `ItemDef.magicTheme` (shared) als expliziter Override, damit Aether-Waffen nicht mehr über Brand ins Feuer-Thema fallen; Status-Mapping bleibt Rückfall.

## Reihenfolge

Startet, sobald der Skill-Split (Schneidern) im Content gelandet ist (kein paralleler Agent in `content/index.ts`). Umsetzung: content-dev (Waffen, Locales unverändert, da Namen bleiben), Balance-Pins engine, Renderer-Override client.
