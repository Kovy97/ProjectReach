# Balance-Audit Magie 28.08.2026 — „Ist der Magier jetzt zu overpowered?"

**balance-designer, 28.08.2026, reines Audit, nichts geändert.** Gemessen wurde der **committete Stand `5236ea0`** (HEAD) über `git archive` (die Arbeitskopie von engine/shared/content war während der Messung durch die laufende Zauberreserve-Arbeit eines anderen Agenten verändert und wurde bewusst NICHT gemessen). Vorgänger-Stände ebenfalls per Archiv: `75a1806` (vor Zauberfokus, 00:18), `351f6f7` (+Zauberfokus), `3bb1361` (+Elementleiter), `75d4962`/HEAD (+Elementar-Effekte, +Esthar).

## 0. Urteil

1. **Nein, der Magier ist im Schaden nicht overpowered.** Kit-Charakter (bestes Kit der Stufe ohne Runen/Suffixe/Tränke, INT 46/70/96) gegen Bosse: Stab/Nahkampf-Craft **1,13 (CL 30) · 0,86–1,01 (CL 60) · 1,21 (CL 90)**, Zauberstab 0,95 / 1,04 / 1,12 — also bei CL 30 und CL 90 noch 12–21 % HINTER dem Nahkampf, bei CL 60 gleichauf bis 14 % davor (nur der Gift-Craft-Stab).
2. Die Hülle (§5, Voll-Stack) zeigt dasselbe: Magie/Nahkampf gegen die Idol-Bosse **1,27 → 0,98** über den Tag, aber die 0,98 entsteht zur Hälfte durch **Esthar** (neue legendäre Großaxt, hebt den Nahkampf-Schätzer um 6 %); gegen den Craft-Maul liegt die Magie im Kit bei 1,21.
3. **Einzelquellen:** Zauberfokus trägt im Kit +1 % (CL 30), +1–3 % (CL 60), **+5–11 % (CL 90)** — im angekündigten Rahmen. Die Grundspannen-Anhebung der Aether-Leiter trägt bei CL 90 weitere **+10 %**. Elementar-Effekte tragen bei den BiS-Kits **0 %** (Leere/Aether haben keinen Schadenseffekt), maximal 2–8 % (Gift-Stapel), 3–9 % (Schock-Überspringen), ≤ 6 % (Glut), 13–16 % (Resonanz am Arkan-Zauberstab gegen Bosse).
4. **Wo die Magie wirklich vorne liegt:** (a) **Nachhaltigkeit** — Lichtsegen verdreifacht den Ward-Zuwachs gegen Bosse (12,6k → 43,3k/h), Tode/h gegen Idol-Bosse 91–106 → 65 (Nahkampf 150–260, Fernkampf 160–220); auf Standardgegnern stirbt der Kit-Magier praktisch nie (0–1/h, Nahkampf 1–33, Fernkampf 30–43). (b) **Trash-Farmen bei CL 90** 12–21 % schneller als der Craft-Maul — das ist Waffentempo (2,18 s vs 2,97 s) und Überkill, keine DPS-Differenz; Fernkampf bei CL 30 ist genauso schnell wie der Stab.
5. **Die eigentliche Fehlstelle der Elementleiter:** die Spannen-Kompensation (Titan-Stab 6,5–9,8 → 11,4–17,2 = +75 %, Aetherium +54 %) hat den Brand-DoT gegen Rüstungs-Bosse UNTER-, gegen Trash ÜBER-kompensiert: gegen den Götzenwächter ist der R70-Blutiron-Brandstab (94,0 s) schneller als der R90-Aether-Stab (96,6 s); die alte Brand-Version des Aetherium-Stabs wäre unter der neuen Engine 19–25 % schneller. Die Roh-DPS-Leiter der Stäbe springt bei R80 um ×2,25 (Nahkampf/Fernkampf: ×1,2–1,3 je Stufe).
6. **Der Parität-Ausreißer ist der Fernkampf**, nicht die Magie: 1,19–1,39 langsamer als Nahkampf bei CL 60/90-Bossen, dazu 30–64 Tode/h.
7. **Empfehlung:** Zauberfokus und Elementar-Konstanten unverändert lassen; **Lichtsegen 4 % → 2 %** (einziger echter Vorsprung von heute); Aether-Leiter nach Chef-Entscheid glätten (Optionen in §8); Fernkampf-Plan aus `stil-paritaet-2026-08-26.md` vorziehen.
8. **Vorbehalt Zauberreserve (in Arbeit):** die geplante Fokus-Haltung „+1 % je 40 Reserve, Deckel +30 %, CL-90-Kit ≈ +20 %" würde den CL-90-Stab von 1,21 auf ≈ 1,0 (Bosse) und von 0,79 auf ≈ 0,66 (Trash) schieben — dann wäre der Magier auf Trash klar über ±10 %. Nach Landung neu messen; Deckel +15 % oder 1 %/60 Reserve als Vorschlag.
9. Die Suite auf `5236ea0` ist grün (balance-envelope 31, spell-focus 10, elemental-status 24, sim 4; Sim-Guard 0 Auffälligkeiten). Der Sim-Report kennt weiterhin nur Nahkampf-Helden (kein Kills/s je Stil — B8 „Sim-Stil-Parität" offen).
10. Mana war in keiner Messung bindend (Ø 100 %, Casts ≈ Angriffe) — der Wegfall der Manakosten durch die Zauberreserve ändert an diesen Zahlen nichts, nur der Fokus-Haltungs-Bonus.

## 1. Hülle: balance-envelope §2/§5, Pin-Historie heute

§2 (harte Caps CL 30/60/90 × 3 Stile) sind reine Deckel-Asserts (Crit/Tempo/Dodge/Block/Mitigation/Lebensraub/Pet-DR/ArmorPen/Precision/WardBreak) ohne gepinnte Zahlen — halten auf HEAD. §5-TTK-Matrix (CL-90-Voll-Stack „damage", Spieler→Boss s / Boss→Spieler s, analytische Formel ohne Waffeneffekte):

| Stand | Nahkampf | Fernkampf | Magie | Mag/Nah | Fern/Nah |
|---|---|---|---|---|---|
| vorher `75a1806` | 55,96 / 183,02 (aetherium_maul) | 78,23 / 258,94 | 71,22 / 239,01 (stormcrest_staff) | 1,27 / 1,31 | 1,40 / 1,41 |
| +Zauberfokus `351f6f7` | = | = | **65,15 / 218,63** (Spanne ×1,58 bei INT 182) | 1,16 / 1,19 | = |
| +Elementleiter `3bb1361` | = | = | **58,05 / 194,82** (Wechsel auf aetherium_staff 12,5–18,8) | 1,04 / 1,06 | = |
| +Elementar/Esthar `75d4962` = HEAD | **59,39 / 199,15** (esthar, ohne armorPen — Schätzer-Artefakt) | = | = | **0,98 / 0,98** | 1,32 / 1,30 |

Boss→Spieler unverändert: Nahkampf 20,65 / 14,63 · Fernkampf 19,78 / 13,67 · Magie 28,03 / 30,12 (Magie hält am längsten). Elementar-Effekte verschieben in dieser Formel nichts (sie kennt keine Waffeneffekte) — deshalb misst dieses Audit die echte Kampfschleife.

## 2. Messmethode

- **Kit-Charakter** = `buildBisCharacter(content, stil, CL, "damage", {allBuffs:true})`, danach Buffs und Instanzen (Runen/Suffixe) gelöscht — exakt die Zauberfokus-Kalibrierung (INT 46/70/96). Waffenvarianten über Requirement-Sperre der übrigen Waffen; der Builder wählt Nebenhand/Rüstung selbst.
- **Echte Kampfschleife** (`startCombat`/`combatStep`, Tick 100 ms) statt Papierformel: Statuseffekte, Glut, Einfrieren, Schock-Verzögerung/Überspringen, Gift-Stapel, Resonanz, Lichtsegen, Mana-Schleife, Kill-Cooldown (aus der Kampfzeit herausgerechnet).
- **Unsterblich** (HP je Tick auf Max) für TTK/DPS; **sterblich** ohne Food und mit Phasen-Food (Lachs/Hummer/Gruftaal) für Tode/h, Ø HP, Ø Ward, Ward-Zuwachs, Lebensraub, Food-Verbrauch.
- **Gegner je Phase** (alle drei Verteidigungsarten + Bosse): CL 30 goblin_butcher (Rüstung) · dust_vulture (Ausweichen) · goblin_warlock (Ward) · Boss ash_tyrant L45; CL 60 skeleton_warrior · spectral_stag · bramble_witch · Bosse goblin_warchief L60, forest_warden L65; CL 90 iron_sentinel · gray_wolf · skeleton_nekro · Bosse roc L200, roc_elder L215, idol_warden L245, last_idol L295 (Direktstart der Dungeon-Bosse im Klon erlaubt). `blackthorn_wolf` aus dem Auftrag existiert nicht im Content.
- Fenster 1 Sim-Stunde je Standardgegner, 2 je Boss; deterministischer Seed; TTK = Kampfzeit / Kills (Überkill inklusive, wie der Spieler es erlebt). Papier-TTK (Hüllenformel) je Zeile zur Kontrolle in den Rohdaten.

## 3. Ergebnis je Stufe (HEAD, unsterblich, Kit)

DPS eff = Gegner-Pool / TTK (geometrisches Mittel über die Bosse), TTK Std = geometrisches Mittel der drei Standardgegner, Verhältnis = TTK Stil / TTK Nahkampf-Craft (< 1 = schneller).

**CL 30** (Referenz blacksteel_maul, 3,3 s Intervall)

| Stil | Waffe | DPS eff Boss | TTK Std | TTK Boss | Std/Nah | Boss/Nah |
|---|---|---:|---:|---:|---:|---:|
| Nahkampf Craft = BiS | blacksteel_maul | 9,0 | 6,7 | 12,4 | 1,00 | 1,00 |
| Fernkampf BiS | skeletal_longbow | 7,9 | 5,3 | 14,2 | 0,79 | 1,14 |
| Magie Stab (Leere) | blacksteel_staff | 8,0 | 5,3 | 14,0 | 0,79 | **1,13** |
| Magie Zauberstab (Gift) | blacksteel_wand + ashtongue_fetish | 9,5 | 4,9 | 11,8 | 0,73 | **0,95** |

**CL 60** (Referenz runite_maul)

| Stil | Waffe | DPS eff Boss | TTK Std | TTK Boss | Std/Nah | Boss/Nah |
|---|---|---:|---:|---:|---:|---:|
| Nahkampf Craft = BiS | runite_maul | 14,4 | 7,4 | 14,0 | 1,00 | 1,00 |
| Fernkampf BiS | spectral_hunter_bow | 10,3 | 10,1 | 19,4 | 1,38 | 1,39 |
| Fernkampf Craft | runite_shortbow | 12,1 | 8,8 | 16,7 | 1,20 | 1,19 |
| Magie BiS (Gift-Drop) | bramble_witchstaff | 14,3 | 8,5 | 14,0 | 1,16 | **1,01** |
| Magie Craft-Stab (Gift) | runite_staff | 16,7 | 7,8 | 12,0 | 1,06 | **0,86** |
| Magie Zauberstab (Leere) | runite_wand + dreadfang_fetish | 13,8 | 7,9 | 14,6 | 1,07 | **1,04** |

**CL 90** (Referenz aetherium_maul; Esthar = neuer Champion-Drop von heute)

| Stil | Waffe | DPS eff Boss | TTK Std | TTK Boss | Std/Nah | Boss/Nah |
|---|---|---:|---:|---:|---:|---:|
| Nahkampf Craft | aetherium_maul | 16,2 | 7,6 | 120,9 | 1,00 | 1,00 |
| Nahkampf BiS | esthar | 20,9 | 6,9 | 93,7 | 0,91 | 0,78 |
| Fernkampf BiS | skytalon_recurve | 13,0 | 8,8 | 151,1 | 1,15 | 1,25 |
| Fernkampf Craft | aetherium_shortbow | 12,3 | 9,6 | 159,3 | 1,26 | 1,32 |
| Magie Stab (Aether) = BiS | aetherium_staff | 13,4 | 6,0 | 146,3 | **0,79** | **1,21** |
| Magie Zauberstab (Arkan) | aetherium_wand + furnaceheart_core | 14,5 | 7,9 | 135,6 | 1,04 | **1,12** |

Einzelbosse CL 90 (Stab / Craft-Maul / Esthar): roc 103,9 / 84,8 / 65,3 · roc_elder 133,8 / 112,3 / 88,0 · idol_warden 96,6 / 81,7 / 64,1 · last_idol 340,9 / 274,9 / 209,8. Standardgegner CL 90: gray_wolf 2,9 / 3,9 / 3,8 (Ein-Treffer-Kill, Differenz = Intervall 2,18 s vs 2,97 s), iron_sentinel 6,1 / 6,8 / 6,4, skeleton_nekro 12,6 / 16,9 / 13,4.

## 4. Verlauf über die Commits (Kit, Magie/Nahkampf-Craft, Ø Standard | Ø Bosse)

| CL | vorher `75a1806` | +Zauberfokus | +Elementleiter | HEAD | Magie-TTK Boss (Beispiel) |
|---|---|---|---|---|---|
| 30 | 0,80 \| 1,17 | 0,79 \| 1,15 | 0,79 \| 1,12 | 0,79 \| 1,13 | ash_tyrant 14,6 → 14,3 → 14,0 → 14,0 |
| 60 | 1,16 \| 1,07 | 1,16 \| 1,04 | 1,16 \| 1,04 | 1,16 \| 1,01 | forest_warden 16,7 → 16,2 → 16,2 → 15,5 |
| 90 | 1,09 \| 1,47 | 0,98 \| 1,37 | 0,82 \| 1,21 | 0,82 \| 1,21 (vs Esthar 0,88 \| 1,56) | idol_warden 116,0 → 108,8 → 96,6 → 96,6; last_idol 421,5 → 398,0 → 340,9 → 340,9 |

Nahkampf und Fernkampf sind über alle vier Stände identisch (bis auf Esthar bei HEAD). Der Elementar-Commit ändert für die BiS-Magiekits nichts (CL 30 Leere, CL 90 Aether — beide ohne Schadenseffekt), bei CL 60 +2–4 % durch Gift-Stapel.

## 5. Attribution — welche Quelle treibt

TTK-Änderung, wenn die Quelle entfernt wird (HEAD, Magie, unsterblich; positiv = Quelle hat Schaden beigetragen):

| CL | Kit | ohne Zauberfokus | alte Grundspanne (vor Elementleiter) | ohne Waffeneffekte | altes Item (alte Spanne + alter Brand, HEAD-Engine mit Glut) |
|---|---|---|---|---|---|
| 30 | blacksteel_staff | +0…+1 % | +0…+2 % | −1…+2 % | −1…+2 % |
| 60 | bramble_witchstaff (BiS) | +0…+3 % | 0 % | **+10…+18 %** (Gift-DoT) | 0 % |
| 60 | runite_staff (Craft) | — | 0 % | **+22…+34 %** (Gift 45 %×5/s, Stapel) | 0 % |
| 90 | aetherium_staff | **+5…+11 %** (Bosse +5–8 %, last_idol +11 %) | **+10…+11 %** | 0 % (Lichtsegen = kein Schaden) | **−19…−25 %** (schneller!) |

Anteile der Elementar-Mechaniken am Gesamtschaden (Treffer + Überspringen + DoT), Maximalwerte der Messung: **Glut** ≤ 6,1 % (godspark_staff, Brand-Uptime 61–64 % an Idol-Bossen) · **Überspringen** 3–9 % (Blitz-Stäbe/-Zauberstäbe: 19 % Krit × 30 %, umgeht Ward) · **Gift-Stapel** 2,3–7,8 % (runite_staff; Ø 1,2–1,5 Stapel, Deckel 5 nie relevant) · **Resonanz** 13–16 % (aetherium_wand gegen Bosse, 10 Stapel × 2 %) · **Schock-Verzögerung** 70–250 s Gegner-Angriffszeit je Stunde (≈ 2–7 % der Angriffe) · **Einfrieren** frosthex_wand 191–197 Aussetzer/h gegen Idol-Bosse = **18 % ihrer Angriffe** (+40 % Slow) — stärkste Defensiv-Mechanik · **Entzug** (Leere) −15 % Gegnerschaden während Uptime (nur Sustain-Seite).

## 6. Die Aether-Klippe: effektive Stab-Leiter R70 → R99 (CL-90-Kit, TTK s)

| Waffe | Spanne | Effekt | idol_warden | last_idol | iron_sentinel | gray_wolf |
|---|---|---|---:|---:|---:|---:|
| R70 bloodiron_staff | 5,2–7,7 | Brand 5/s | 94,0 | 311,0 | 6,8 | 4,3 |
| R80 titanium_staff ALT | 6,5–9,8 | Brand 6/s | 85,8 | 286,0 | 6,4 | 4,1 |
| R80 titanium_staff HEAD | **11,4–17,2** | Lichtsegen | **100,9** | **376,9** | 6,2 | 3,2 |
| R90 aetherium_staff ALT | 8,1–12,2 | Brand 7/s | 78,0 | 255,1 | 6,0 | 3,8 |
| R90 aetherium_staff HEAD | **12,5–18,8** | Lichtsegen | **96,6** | **340,9** | 6,1 | 2,9 |
| R88 godspark_staff (Drop) | 4,8–7,2 | Brand 6/s + Lichtsegen + critBurst | 96,6 | 311,0 | 7,0 | 4,9 |
| Nahkampf aetherium_maul | 24,3–56,4 | — | 81,7 | 274,9 | 6,8 | 3,9 |

Roh-DPS der Craft-Stäbe (Mittel/Intervall): bloodiron 2,28 → titanium **5,14** → aetherium 5,73 → godiron 6,39 (vorher 2,93 → 3,72 → 4,70, ×1,26 je Stufe); Nahkampf-2H 7,30 → 8,95 → 10,91 → 13,41, Fernkampf 2,85 → 3,51 → 4,38 → 5,70. Der `coreStatScore`-Abgleich bewertet Spanne (mitigiert, gewürfelt) und DoT (unmitigiert, +Glut) gleich — gegen Rüstungs-Bosse ist der DoT ~2× so viel wert, gegen Trash die Spanne. Ergebnis: gegen Bosse steigt der Stab von R70 bis R90 effektiv nicht (94 → 101 → 97 s), gegen Trash springt er (4,3 → 3,2 → 2,9 s). Nicht gemessen: Ward-Bosse mit großem Pool (gravecliff_specter 926, aether_wraith 1654), wo die 50-%-Ward-Durchdringung des Aethers 20–35 % TTK wert sein dürfte — das ist die gewollte Aether-Identität.

## 7. Nachhaltigkeit (sterblich, Kit, ohne Food; in Klammern mit Phasen-Food)

| CL | Gegner | Nahkampf Tode/h | Fernkampf | Magie | Magie Ø Ward | Ward-Zuwachs/h Magie | Lebensraub/h Nahkampf |
|---|---|---:|---:|---:|---:|---:|---:|
| 30 | Standard ×3 | 0 / 0 / 0 | 0 / 0 / 2 | 0 / 0 / 4 | 92–99 % | 3,3–5,5k | 350–690 |
| 30 | ash_tyrant | 37,5 (2,0) | 24,0 (1,5) | 25,5 (11,5) | 42 % | 8,3k | 1,3k |
| 60 | Standard ×3 | 1 / 5 / 19 | 41 / 35 / 43 | 1 / 1 / 7 | 70–81 % | 14–15k | 870–980 |
| 60 | goblin_warchief · forest_warden | 36,5 · 36,0 (0 · 0) | 59 · 63,5 (15 · 14,5) | 22,5 · 24,5 (9,5 · 12,5) | 37–42 % | 13–14k | 1,45k |
| 90 | Standard ×3 | 11 / 1 / 33 | 32 / 30 / 43 | **0 / 0 / 1** | 97–99 % | 5,6–25k | 670–1180 |
| 90 | roc · roc_elder | 153,5 · 177,5 | 159 · 182 | 88,5 · 102 | 39–40 % | 25–27k | 1,1k |
| 90 | idol_warden · last_idol | 183 · 262,5 (149 · 238,5) | 181 · 220,5 (158,5 · 194) | **66,5 · 64,5** (62 · 57,5) | 39 % | **43–44k** | 2,0–2,1k |

Lichtsegen-Effekt (Magie CL 90 vs Idol-Bosse, vorher → `3bb1361` → HEAD): Ward-Zuwachs 12,6k → 13,0k → **43,3k/h** (×3,4; 22 Ward je Zauber gegen 1,6 aus dem Cast-Recharge), Tode/h 91 → 103 → **66,5** bzw. 106 → 101,5 → **64,5**. Kein Kit-Stil killt die Rocs/Idole ohne Runen/Food (0 Kills/h) — Gear-Band, gewollt. Auto-Eat mit Phasen-Food macht Nahkampf/Fernkampf auf CL-60-Bossen tod-frei bzw. 15/h, Magie behält 9–12/h (kein Lebensraub, Food heilt nur HP, nicht Ward).

## 8. Empfehlung (Zahlen; nichts angewendet, Apply nur nach Chef-GO durch content-dev/combat-dev)

| # | Quelle | ist | Vorschlag | Wirkung (gemessen/erwartet) |
|---|---|---|---|---|
| R1 | Zauberfokus-Leiter (0,0030–0,0032 / 0,0025–0,0027) | +5…+11 % Kit-Schaden CL 90 | **unverändert** | im erwarteten Rahmen (+2…+9 %, nur last_idol +11 %) |
| R2 | Glut 10 %, Überspringen 30 %, Gift-Stapel 5, Schock 400/1200 ms | ≤ 6 % / ≤ 9 % / ≤ 8 % Schaden | **unverändert** | keine Quelle treibt; Einfrieren (18 % Boss-Angriffe) beobachten, ggf. `FREEZE_IMMUNITY_MS` 6000 → 9000 (≈ 13 %) |
| R3 | Lichtsegen `AETHER_WARD_ON_HIT` 0,04 und `lightblessing.magnitude 0.04` auf titanium_staff, aetherium_staff, aether_runestaff, godspark_staff | Ward-Zuwachs ×3,4, Tode −37 % | **0,04 → 0,02** (beide Stellen; sonst greift der Content-Wert) | halbiert den Sustain-Sprung: ≈ 80–85 Tode/h vs Idol-Bosse statt 65 (Nah/Fern 150–260); Aether-Identität bleibt |
| R4 | runite_staff Gift `magnitude 5` | Craft-Stab CL 60 Bosse 0,86 | optional **5 → 4**, nur bei striktem ±10 % | 0,86 → ≈ 0,91; einzige Magie-Zeile > 10 % vor dem Nahkampf bei Bossen |
| R5 | Aether-Spannen titanium 11,4–17,2 / aetherium 12,5–18,8 | Leiter-Klippe ×2,25 bei R80; Boss-Leiter R70→R90 flach | **Chef-Entscheid:** (a) belassen, Identität „Burst + Ward-Brecher" auf der Karte benennen; (b) einheitliche Prämie +36 % wie godiron: **titanium 8,8–13,3, aetherium 11,0–16,6** | (b): Trash 0,79 → ≈ 0,85, Bosse 1,21 → ≈ 1,30 (weiter vom Nahkampf weg, dafür Leiter ×1,78/×1,27/×1,24); vorher gravecliff_specter/aether_wraith messen |
| R6 | Zauberreserve Fokus-Haltung (in Arbeit: +1 %/40 Reserve, Deckel +30 %) | CL-90-Kit ≈ +20 % | Deckel **+15 %** oder **1 %/60 Reserve** | sonst CL-90-Stab Bosse ≈ 1,0, Trash ≈ 0,66 → über ±10 %; nach Landung neu messen |
| R7 | Fernkampf | 1,19–1,39 hinter Nahkampf, 30–64 Tode/h | Plan §4a/§5 aus `stil-paritaet-2026-08-26.md` (Bogen-Leiter, Jägerisch-Rune) vorziehen | eigentlicher Parität-Ausreißer |

**Apply-Liste (Reihenfolge, nur nach GO):** 1) R3 — shared `AETHER_WARD_ON_HIT` 0,02 + vier Content-Magnituden 0,02, combat-dev pinnt `elemental-status.test.ts` (Lichtsegen-Füllung) neu; §5-Pins bleiben (Formel kennt keinen Ward-Regen). 2) R6 in die laufende Zauberreserve-Arbeit geben. 3) R4/R5 nur nach Chef-Entscheid; nach R5 Envelope §5 Magie-Zeilen und `element-ladder.test.ts` neu pinnen.

## 9. Vorbehalte

- Esthar (heute, Champion Ossric, legendär) ist der größte Einzel-Sprung des Tages: Nahkampf-BiS gegen Bosse −22 % TTK gegen den Craft-Maul — nach Rare-Drop-Philosophie gewollt, aber beim Lesen der §5-Zeile „Magie/Nahkampf 0,98" mitzudenken.
- Kit-Charaktere tragen keine Runen/Suffixe/Tränke; der Voll-Stack (Hülle §5) verschiebt die Verhältnisse zugunsten der Magie (INT 182 → Zauberfokus ×1,58 statt ×1,31).
- Standardgegner-TTK bei CL 30/90 ist Tempo/Überkill-dominiert (1–2 Treffer je Kill); Bosse sind das DPS-Maß.
- Sim-Report (`sim.test.ts`) misst nur Nahkampf-Helden; Kills/s je Stil gibt es nicht (B8 offen).

## Anhang: Skripte und Rohdaten (nicht committen)

- `design/audit-magie-2026-08-28/magie.audit.test.ts` — Mess-Skript (Vitest, pinnt nichts), `vitest.config.mts` — Alias-Config auf Archiv-Stände, `auswertung.py` — Tabellen, `auswertung.txt` — vollständige Auswertung (Abschnitte A–G).
- Rohdaten (TSV, 55 Spalten je Lauf): `rohdaten-head-5236ea0.tsv` (429 Zeilen: BiS/Craft/Varianten/alle Alternativwaffen, unsterblich + sterblich), `rohdaten-head-5236ea0-extra.tsv` (Aether-Leiter R70–R90), `rohdaten-old-75a1806.tsv`, `rohdaten-old-351f6f7.tsv`, `rohdaten-old-3bb1361.tsv` (je 208 Zeilen, Kernkits); Laufprotokolle `lauf-*.log` mit den Kit-Beschreibungen.
- Lauf: `cd packages/engine && AUDIT_TREE=<archiv> AUDIT_SCOPE=full pnpm exec vitest run --root G:/GameDev/design/audit-magie-2026-08-28 --config G:/GameDev/design/audit-magie-2026-08-28/vitest.config.mts` (Archive der Stände liegen im Session-Scratchpad; für einen erneuten Lauf `git archive <commit> packages/shared/src packages/content/src packages/engine/src` an den in der Config genannten Pfad entpacken).
