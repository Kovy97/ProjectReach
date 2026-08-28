# Zauberfokus — Magiewaffen werden durch Intelligenz stärker (Chef-GO 28.08.2026)

**Auslöser:** Spieler-Feedback (RU) „Magieschaden 0, keine Skalierung"; der Chef findet, der Magier macht im Vergleich zu wenig Schaden, und will, dass INT die Magiewaffe sichtbar bekräftigt. **Bewusster Magier-Buff, kein paritätsneutrales Umverteilen** (Nachtrag in `design/stil-paritaet-2026-08-26.md`).

## 1. Mechanik

- `ItemDef.spellFocus?: number` (packages/shared): Anteil je INT-Punkt, um den die Waffenspanne wächst. 0.008 = +0,8 % je INT.
- `computeStats` (packages/engine/src/character.ts): bei aktivem Stil „magic" wird die Range-Form-Spanne der Haupthand mit `1 + spellFocus · int` multipliziert (min UND max), danach wie bisher `attackDamageMin/Max = Charakter-Anteil + Spanne`. Nur Magiewaffen, nur bei `spellFocus > 0`. Kein Sonderpfad in combat.ts (die rollt weiter uniform in `attackDamageMin/Max`).
- `spellFocusMult(item, int)` (exportiert aus engine/character.ts) ist die eine Rechnung für Engine, Tooltip und Item-Wiki.
- Kein neues State-Feld, kein Save-Bump: spellFocus ist reiner Content.

Formel (Range-Form, Stil magic):

```
mult            = 1 + spellFocus · int
attackDamageMin = max(0, C + damageMin · mult)
attackDamageMax = max(attackDamageMin, C + damageMax · mult)
C               = (int·0.34 + magic·0.12 + eq.magicDamage) · dmgMult   (unverändert)
```

## 2. INT je Stufe (gemessen, Magier, „damage"-Ziel des Envelope-Builders)

`buildBisCharacter(content, "magic", CL, "damage", { allBuffs: true })`, dann drei Varianten derselben Figur:

| CL | Voll-Stack (Runen + Suffixe + Tränke) | ohne Tränke | **Kit ohne Runen/Suffixe/Tränke** | nur Training | BiS-Haupthand |
|---:|---:|---:|---:|---:|---|
| 1 | 95 | 83 | **28** | 3 | copper_staff |
| 5 | 115 | 103 | **29** | 4 | hedgewitch_twig |
| 10 | 109 | 97 | **32** | 5 | iron_staff |
| 20 | 112 | 100 | **35** | 8 | warlock_felstaff |
| 25 | 148 | 136 | **42** | 9 | felmagician_rod |
| 30 | 123 | 111 | **46** | 10 | blacksteel_staff |
| 40 | 134 | 122 | **57** | 13 | mire_hexstaff |
| 50 | 168 | 156 | **62** | 15 | barrowsong_crook |
| 60 | 147 | 135 | **70** | 18 | bramble_witchstaff |
| 70 | 158 | 146 | **81** | 20 | pyre_staff |
| 80 | 174 | 162 | **87** | 23 | drowned_choirstaff |
| 90 | 182 | 170 | **95** | 25 | stormcrest_staff |
| 99 | 193 | 181 | **106** | 27 | godiron_staff |

**Entscheidung Kalibrierungs-INT:** Der Voll-Stack des Envelope-Builders hat schon auf CL 1 95 INT (Runen Tier III auf allen Rarity-Slots, Suffix-Max-Roll ilvl 100, requirement-freie Chase-Ringe, Tränke) — das ist der Worst-Case-Deckel, nicht der INT, „den ein Magier auf der Stufe realistisch hat". Kalibriert wurde deshalb auf die fett gedruckte Spalte (bestes legales Kit der Stufe, ohne Runen/Suffixe/Tränke): 46 / 70 / 95 INT auf CL 30 / 60 / 90. Das trifft auch das Beispiel des Auftrags („Mit deinem INT (42)"). Auf Voll-Stack-INT kalibriert läge der Satz bei 0,0012–0,0017 je INT (Tooltip „+0,12 % je INT") und ein normaler Spieler sähe +5 % — der Buff wäre unsichtbar. **Umkehrbar per Koeffizienten-Tabelle, wenn der Chef den Voll-Stack als Referenz will.**

## 3. Zielkurve und Herleitung der Koeffizienten

Ziel: Waffenspanne **+15 % (CL 30), +22 % (CL 60), +30 % (CL 90)**, ±3 Pp. Zwischen den Ankern linear, darunter/darüber mit derselben Steigung fortgesetzt (CL 1 ≈ +8 %, CL 99 ≈ +32 %).

`spellFocus(Stufe) = Zielbonus(Stufe) / INT(Stufe)`. Der gemessene Kit-INT wächst fast linear (≈ 27 + 0,75·CL), die Zielkurve auch — der Quotient ist deshalb beinahe konstant und steigt nur sanft mit der Stufe (0,0030 → 0,0032 für Stäbe). Rohwerte je Stufe schwanken durch Kit-Sprünge um ±0,0003 (z. B. 0,0036 bei R20, 0,0030 bei R40); sie wurden auf eine monotone Leiter geglättet, damit eine bessere Waffe nie weniger Fokus trägt.

- **Stab (2H):** 0,0030 (Kupfer–Mithril, R1–40), 0,0031 (Adamantium–Titan, R50–80), 0,0032 (Aetherium/Götzeneisen, R90–99).
- **Zauberstab/Zepter (1H):** ÷ 1,2 (≈ 20 % weniger, sie behalten den Fokus in der Nebenhand): 0,0025 / 0,0026 / 0,0027.
- **Drops/Champion-/Rare-Waffen:** Fokus der Craft-Stufe derselben Handklasse, deren mittlerer Schaden dem eigenen am nächsten liegt (Rare-Drop-Philosophie: Stats des nächsten Tiers ⇒ auch dessen Fokus). Foki/Orbs (offhand, keine Spanne) tragen NICHTS — ein Feld dort wäre „definiert, aber nie angewandt".

### Kontrolle an den Ankern (Waffe, die der Builder auf der Stufe wählt)

| CL | Waffe | spellFocus | Kit-INT | **Bonus** | Voll-Stack-INT | Bonus Voll-Stack |
|---:|---|---:|---:|---:|---:|---:|
| 30 | blacksteel_staff | 0,0030 | 46 | **+13,8 %** (Ziel 15) | 123 | +36,9 % |
| 60 | bramble_witchstaff | 0,0031 | 70 | **+21,7 %** (Ziel 22) | 147 | +45,6 % |
| 90 | stormcrest_staff | 0,0032 | 95 | **+30,4 %** (Ziel 30) | 182 | +58,2 % |

Gepinnt in `packages/engine/src/spell-focus.test.ts` §3 (±3 Pp).

Was das am GESAMT-Schaden ausmacht (Charakter-Anteil + Waffe): realistischer CL-30-Magier (INT 46, blacksteel_staff) 19,2 + 2,1–3,2 → Spanne +0,3–0,5 (≈ +2 %); CL-90-BiS-Magier (INT 182, stormcrest_staff) 85,5–91,2 → 92,1–101,1 (+9,3 % mittlerer Schaden). Der Magier-Charakter-Anteil (int·0.34) bleibt der größere Hebel; der Zauberfokus macht die WAFFE sichtbar INT-abhängig, so wie der Chef es wollte.

## 4. Tabelle aller 57 Magie-Haupthandwaffen

Spalten: Waffe · Typ · eigene Stufe (Requirement) · Spanne · Fokus-Stufe (craft = eigene Stufe, sonst Craft-Waffe mit dem nächsten Schaden) · Kit-INT dieser Stufe · spellFocus · resultierender Spannen-Bonus auf dieser Stufe.

| Waffe | Typ | Req | Spanne | Fokus-Stufe | Kit-INT | spellFocus | Bonus |
|---|---|---:|---|---|---:|---:|---:|
| copper_staff | staff 2H | 1 | 0.4–0.6 | craft (R1) | 28 | 0.003 | +8.4 % |
| copper_wand | wand 1H | 1 | 0.4–0.4 | craft (R1) | 28 | 0.0025 | +7.0 % |
| cracked_staff | staff 2H | 1 | 0.2–0.2 | ≈ copper_staff (R1) | 28 | 0.003 | +8.4 % |
| gnarled_staff | staff 2H | 1 | 0.4–0.6 | ≈ copper_staff (R1) | 28 | 0.003 | +8.4 % |
| bronze_staff | staff 2H | 5 | 0.9–1.3 | craft (R5) | 29 | 0.003 | +8.7 % |
| bronze_wand | wand 1H | 5 | 0.6–0.8 | craft (R5) | 29 | 0.0025 | +7.2 % |
| hedgewitch_twig | wand 1H | 5 | 1–1.5 | ≈ iron_wand (R10) | 32 | 0.0025 | +8.0 % |
| impbone_wand | wand 1H | 8 | 1.3–1.6 | ≈ steel_wand (R20) | 35 | 0.0025 | +8.8 % |
| impfire_wand | wand 1H | 10 | 1.3–1.6 | ≈ steel_wand (R20) | 35 | 0.0025 | +8.8 % |
| iron_staff | staff 2H | 10 | 1.4–2 | craft (R10) | 32 | 0.003 | +9.6 % |
| iron_wand | wand 1H | 10 | 1.1–1.3 | craft (R10) | 32 | 0.0025 | +8.0 % |
| shaman_gnarlstaff | staff 2H | 15 | 1.7–2.6 | ≈ steel_staff (R20) | 35 | 0.003 | +10.5 % |
| steel_staff | staff 2H | 20 | 1.7–2.6 | craft (R20) | 35 | 0.003 | +10.5 % |
| steel_wand | wand 1H | 20 | 1.3–1.6 | craft (R20) | 35 | 0.0025 | +8.8 % |
| warlock_felstaff | staff 2H | 20 | 2.1–3.2 | ≈ blacksteel_staff (R30) | 46 | 0.003 | +13.8 % |
| felmagician_rod | scepter 1H | 25 | 2.1–3.2 | ≈ adamantium_wand (R50) | 62 | 0.0026 | +16.1 % |
| frost_scepter | scepter 1H | 25 | 1.9–2.9 | ≈ mithril_wand (R40) | 57 | 0.0025 | +14.3 % |
| blacksteel_staff | staff 2H | 30 | 2.1–3.2 | craft (R30) | 46 | 0.003 | +13.8 % |
| blacksteel_wand | wand 1H | 30 | 1.6–2.1 | craft (R30) | 46 | 0.0025 | +11.5 % |
| stalker_bonewand | wand 1H | 30 | 2–2.6 | ≈ mithril_wand (R40) | 57 | 0.0025 | +14.3 % |
| wailing_wand | wand 1H | 30 | 2–2.6 | ≈ mithril_wand (R40) | 57 | 0.0025 | +14.3 % |
| aether_runestaff | staff 2H | 40 | 2.2–3.2 | ≈ blacksteel_staff (R30) | 46 | 0.003 | +13.8 % |
| chitinshell_sparker | wand 1H | 40 | 2.6–3.4 | ≈ adamantium_wand (R50) | 62 | 0.0026 | +16.1 % |
| mire_hexstaff | staff 2H | 40 | 3.2–5.1 | ≈ adamantium_staff (R50) | 62 | 0.0031 | +19.2 % |
| mithril_staff | staff 2H | 40 | 2.7–4.1 | craft (R40) | 57 | 0.003 | +17.1 % |
| mithril_wand | wand 1H | 40 | 2–2.6 | craft (R40) | 57 | 0.0025 | +14.3 % |
| wisp_kindled_bough | staff 2H | 40 | 3.4–4.9 | ≈ adamantium_staff (R50) | 62 | 0.0031 | +19.2 % |
| barrowsong_crook | scepter 1H | 47 | 3.6–5.4 | ≈ bloodiron_wand (R70) | 81 | 0.0026 | +21.1 % |
| adamantium_staff | staff 2H | 50 | 3.3–4.9 | craft (R50) | 62 | 0.0031 | +19.2 % |
| adamantium_wand | wand 1H | 50 | 2.6–3.3 | craft (R50) | 62 | 0.0026 | +16.1 % |
| stormcaller_rod | scepter 1H | 50 | 3.3–4.9 | ≈ bloodiron_wand (R70) | 81 | 0.0026 | +21.1 % |
| witchroot_wand | wand 1H | 50 | 3.2–4.3 | ≈ runite_wand (R60) | 70 | 0.0026 | +18.2 % |
| bramble_witchstaff | staff 2H | 52 | 4.4–6.5 | ≈ runite_staff (R60) | 70 | 0.0031 | +21.7 % |
| runite_staff | staff 2H | 60 | 4.2–6.2 | craft (R60) | 70 | 0.0031 | +21.7 % |
| runite_wand | wand 1H | 60 | 3.2–4.1 | craft (R60) | 70 | 0.0026 | +18.2 % |
| voidcaller_staff | staff 2H | 65 | 3.8–5.8 | ≈ runite_staff (R60) | 70 | 0.0031 | +21.7 % |
| bloodiron_staff | staff 2H | 70 | 5.2–7.7 | craft (R70) | 81 | 0.0031 | +25.1 % |
| bloodiron_wand | wand 1H | 70 | 4–5.2 | craft (R70) | 81 | 0.0026 | +21.1 % |
| frostbone_scepter | scepter 1H | 70 | 5.2–7.9 | ≈ aetherium_wand (R90) | 95 | 0.0027 | +25.7 % |
| hoargrim_scepter | scepter 1H | 70 | 5–6.5 | ≈ titanium_wand (R80) | 87 | 0.0026 | +22.6 % |
| pyre_staff | staff 2H | 70 | 7–10.6 | ≈ titanium_staff (R80) | 87 | 0.0031 | +27.0 % |
| choirbound_relic | staff 2H | 72 | 7.7–11.2 | ≈ aetherium_staff (R90) | 95 | 0.0032 | +30.4 % |
| sorrow_staff | staff 2H | 72 | 7.2–10.4 | ≈ titanium_staff (R80) | 87 | 0.0031 | +27.0 % |
| drowned_choirstaff | staff 2H | 80 | 8.1–12.2 | ≈ aetherium_staff (R90) | 95 | 0.0032 | +30.4 % |
| siren_shockstaff | staff 2H | 80 | 4.8–7.3 | ≈ bloodiron_staff (R70) | 81 | 0.0031 | +25.1 % |
| titanium_staff | staff 2H | 80 | 6.5–9.8 | craft (R80) | 87 | 0.0031 | +27.0 % |
| titanium_wand | wand 1H | 80 | 5.1–6.4 | craft (R80) | 87 | 0.0026 | +22.6 % |
| godspark_staff | staff 2H | 88 | 4.8–7.2 | ≈ bloodiron_staff (R70) | 81 | 0.0031 | +25.1 % |
| aetherium_staff | staff 2H | 90 | 8.1–12.2 | craft (R90) | 95 | 0.0032 | +30.4 % |
| aetherium_wand | wand 1H | 90 | 6.3–8 | craft (R90) | 95 | 0.0027 | +25.7 % |
| frosthex_wand | wand 1H | 90 | 8.1–10.6 | ≈ godiron_wand (R99) | 106 | 0.0027 | +28.6 % |
| sentinel_core_wand | wand 1H | 90 | 7.9–9.9 | ≈ godiron_wand (R99) | 106 | 0.0027 | +28.6 % |
| stormcrest_staff | staff 2H | 90 | 11.3–17 | ≈ godiron_staff (R99) | 106 | 0.0032 | +33.9 % |
| godiron_staff | staff 2H | 99 | 10.2–15.2 | craft (R99) | 106 | 0.0032 | +33.9 % |
| godiron_wand | wand 1H | 99 | 7.9–9.9 | craft (R99) | 106 | 0.0027 | +28.6 % |
| last_condemnation | staff 2H | 99 | 11.3–16.9 | ≈ godiron_staff (R99) | 106 | 0.0032 | +33.9 % |
| skarn_idol_staff | staff 2H | 99 | 11.3–17 | ≈ godiron_staff (R99) | 106 | 0.0032 | +33.9 % |

Nicht betroffen (bewusst): 22 Magie-Nebenhände (copper_focus … dreadfang_fetish, aether_orb, felglass_orb) — keine Spanne, kein Fokus. 230 Nahkampf-/Fernkampf-Haupthände tragen kein Feld; die Engine ignoriert es dort auch (Test).

## 5. Balance-Hülle — neu gepinnt

| Pin | vorher | nachher | Grund |
|---|---|---|---|
| §5 TTK magic → idol_warden (Spieler) | 71,22 s | **65,15 s** | CL-90-BiS-Magier: Spanne 85,54–91,24 → 92,12–101,14 (+9,3 % mittlerer Schaden) |
| §5 TTK magic → last_idol (Spieler) | 239,01 s | **218,63 s** | dito |
| §5 TTK idol_warden/last_idol → magic (Boss) | 28,03 / 30,12 s | unverändert | kein Defensiv-Wert berührt |
| §5 alle melee-/ranged-Paare | 55,96/20,76 · 183,02/14,70 · 78,23/19,78 · 258,94/13,67 | unverändert | kein Nicht-Magie-Item trägt spellFocus |
| §2 harte Caps CL 30/60/90 × 3 Stile | halten | halten | Zauberfokus berührt keinen gedeckelten Wert |
| §3/§4/§6/§7/§8 | — | unverändert | — |
| Sim-Guard `AUFFÄLLIGKEITEN — Bronze-Baseline` | 0 | **0** | — |

Kommentar im Pin: „Re-Messung 2026-08-28 — Zauberfokus (Chef-GO 28.08.2026): bewusster Magier-Buff +15/22/30 %".

## 6. Anzeige

- ItemTooltip (Offensiv-Gruppe, auch im Vergleichs-Tooltip): „Zauberfokus · +0,3 % Schaden je INT" und mit geladenem Charakter „Mit deinem INT (42) · 2,4–3,7" (Waffenspanne inkl. Affix-/Suffix-Delta × `spellFocusMult`). Die Schaden-/DPS-Kopfzeilen bleiben der reine Item-Wert.
- Item-Wiki: dieselben zwei Fakten-Kacheln (`SpellFocusTiles`, eigene Komponente, abonniert den Spielstand nur für sich).
- Charakterbogen: nichts zu tun — `attackDamageMin/Max` aus computeStats enthalten den Fokus automatisch.
- i18n: `itip.spellFocus`, `itip.spellFocus.perInt`, `itip.spellFocus.withInt` in en/de + es/fr/ptBR/ru/zh.

## 7. Tests

- `packages/engine/src/spell-focus.test.ts` (10): spellFocusMult, computeStats-Formel (min/max, linear in INT, 0/undefined, Nahkampf/Fernkampf unberührt, echter Content), Zielkurve ±3 Pp.
- `packages/content/src/spell-focus-content.test.ts` (6): jede Magie-Haupthand trägt spellFocus in (0, 0.01], kein anderes Item trägt es, 12 Stab/Zauberstab-Paare im Verhältnis 1,15–1,30, Leitern monoton, 1H immer unter dem Stab-Maximum.
- `balance-envelope.test.ts` §5 re-gepinnt (oben).

## 8. Offen / Chef-Entscheid

1. Kalibrierungs-Referenz: Kit-INT (umgesetzt) oder Voll-Stack-INT (dann ÷ 2,6 auf alle Koeffizienten, Buff für normale Spieler ≈ +5 %).
2. Ob der Zauberfokus auch in die Schaden-/DPS-Kopfzeile des Tooltips eingerechnet werden soll (heute nur die eigene INT-Zeile darunter).
