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

## Umgesetzt 28.08.

`shared`: `ItemDef.magicTheme?: "arcane" | "fire" | "frost" | "shock" | "poison" | "void" | "aether"` (Dok-Kommentar bei `weaponEffects`/vor `manaCost`). `content`: die gefertigte Leiter (26 Items: cracked/gnarled_staff + 12 Stufen × Stab/Zauberstab) nach der Tabelle umgethemt, `magicTheme` auf allen 26 explizit gesetzt; zusätzlich auf drei Drops (Status passte nicht zum Bild): `aether_runestaff`, `godspark_staff` → `aether`, `voidcaller_staff` → `void`. Guard-Test `packages/content/src/element-ladder.test.ts` (7 Tests, bildet `combatFx.ts` `WEAPON_EFFECT_THEME` nach, kein Import).

**Verteilung Magie-Haupthände (57 gesamt) — vorher → nachher:**

| Element | vorher | nachher | Liste (nachher) |
|---|---|---|---|
| Feuer | 24 | 14 | copper_staff, iron_staff, bloodiron_staff, gnarled_staff, mithril_wand, godiron_wand + 8 Drops |
| Blitz | 14 | 9 | bronze_staff, adamantium_staff, steel_wand, titanium_wand + 5 Drops |
| Frost | 10 | 10 | copper_wand, iron_wand, mithril_staff, bloodiron_wand + 6 Drops |
| Arkan | 5 | 9 | cracked_staff, steel_staff, adamantium_wand, aetherium_wand + 5 Drops |
| Gift | 2 | 5 | bronze_wand, blacksteel_wand, runite_staff + 2 Drops |
| Leere | 2 | 6 | blacksteel_staff, godiron_staff, runite_wand + 3 Drops |
| Aether | 0 | 4 | titanium_staff, aetherium_staff + aether_runestaff, godspark_staff (Drops) |

Alle drei Phasen (≤30, 40–60, 70–99) zeigen alle sechs Basis-Elemente auf der gefertigten Leiter; Aether nur ≥80 (Titan/Aetherium). Magnituden: Gift↔Feuer-Swaps sind mechanisch identisch (beides Schaden/Sek-DoT) und 1:1 vom Vorgänger übernommen (DPS-neutral); Frost-Magnitude ist mechanisch ungenutzt (flach 1); Blitz (shock) folgt der Formel `0,22 + 0,02·(Tier-Index−5)`; Leere nutzt überall die Standardwerte `execute` (chance 1, magnitude 0,25, threshold 0,2, wie im übrigen Katalog); Aether nutzt `manaOnKill` (Flatwert 5/6, wie sorrow_staff/skarn_idol_staff). Arkan (kein Status) und Aether (`manaOnKill`, DurationMs 0) tragen keinen `coreStatScore`-Beitrag mehr — Parität zur jeweils vorherigen Craft-Stufe über eine höhere Grundspanne (steel_staff, bronze_staff, blacksteel_staff, adamantium_wand, titanium_staff, aetherium_staff, godiron_staff angehoben; Zahlen im Content-Bericht/Commit).

**Aether-Klippe geglättet (29.08., Chef-GO, Balance-Audit R5 (b)):** die Paritäts-Anhebung der beiden Aether-Stäbe war eine Klippe (Roh-DPS ×2,25 von R70 auf R80, Boss-Leiter R70→R90 flach, gegen Trash sprunghaft). Jetzt tragen `titanium_staff` **8,8–13,3** (war 11,4–17,2) und `aetherium_staff` **11,0–16,6** (war 12,5–18,8): einheitliche +36-%-Prämie auf die Spanne vor der Elementleiter, wie sie `godiron_staff` bekam; Tempo unverändert. Roh-DPS-Leiter bloodiron → titanium → aetherium → godiron jetzt 2,28 → 3,97 → 5,05 → 6,39 (×1,74 / ×1,27 / ×1,27 statt ×2,25 / ×1,11 / ×1,12). Pins neu gemessen: Balance-Envelope §5 (magic), `sim-consistency` Leiter-Fingerprints, `drop-gear-beats-craft`, `element-ladder`; Probe gegen die Ward-Bosse gravecliff_specter/aether_wraith im Bericht.

**Offen für den Chef:** die Renderer-Verdrahtung (`combatFx.ts` `magicThemeFor` liest `item.magicTheme` zuerst) ist noch nicht gelandet — Content-Seite ist fertig und getestet, `apps/**` bleibt content-dev-TABU.
