# QA-Run 4 — Aggregat (20 Tester) · 2026-06-27

**Gesamtschnitt: 7,7/10** (run3: 7,3 · 9 Tester). Trotz Parität-Regression netto **+0,4**, weil die Nicht-Combat-Säulen stark gestiegen sind und die Combat-Bänder durch die Magie-Decke gedrückt werden.

## Scorecard
| Linse | Run4 | Δ run3 |
|------|:----:|:----:|
| Save/Migration/Offline | 9 | +? (neu) |
| Gathering (Mine/Wood/Fish) | 9 | +1 |
| Gathering (Farm/Forage/Herb) | 9 | +1 |
| Crafting (Smith/Jewel) | 9 | +1 |
| Crafting (Fletch/Rune/Leather) | 8.5 | +0.5 |
| UX/UI | 8.5 | +0.5 |
| Endgame L75–99 | 8.5 | +1.5 |
| Slayer | 8 | +2 |
| Meta-Goals | 8 | +1 |
| Combat-Status/Systeme | 8 | +1 |
| Combat-Melee | 7.5 | (run3 combat 7) |
| Early L1–15 | 7.5 | = |
| Enchantment | 7.5 | (neu) |
| Early-Mid L15–30 | 7 | — |
| Idle/AFK | 7 | — |
| Economy/Pacing | 7 | +1 |
| Combat-Magie | 6 | −1 |
| Mid L25–60 | 6 | −2 |
| Late-Mid L50–75 | 6 | −2 |

**P0: keine** (über alle 20). 0 Tode / 0 Walls bestätigt.

## Verifizierte run3-Fixes (gelandet)
- Slayer: Welt-Pools ohne Turm-Mobs, Lauf-Hilfe, Cancel kostet → +2.
- Endgame: 5 neue Mobs L84–110 füllen Vakuum, gold/xp monoton; Voidhide/Voidweave L99 für alle Stile.
- Gathering: 4 tote Hölzer → Schilde; 8 tote Crops → Rezepte; Seed-Shop-Fallbacks.
- Persistenz: Instanz-Roundtrip behoben (SAVE 39), 11 Enchant-Items migrationssicher geräumt.
- Enchant: generischer Tisch + tiered Runen; alte per-Waffe-Rezepte 0 Refs.
- UX: Emoji-Cleanup, Slayer-Glow, tote styles.css weg.
- tide_siren xp 90; ember-Robe L30.

## P1-Cluster A — 3-Stil-Parität REGREDIERT (Top-Priorität)
Konsistent über Mid/Late-Mid/Magie/Ranged/Melee/Early(-Mid):
- **Magie-Decke (Hauptproblem):** mid 1,8–1,95× Melee, L99 1,5–1,74×. Ursachen: (a) Roben stapeln magicDamage über 5 Slots, (b) `int·2` doppelter Beitrag, (c) `manaCost ×1.5` wirkungslos (manaRegen ≥ Kosten, nie Weak-Cast), (d) Wand+Fokus umgehen Mana komplett (Fokus +maxMana/+regen), (e) **voidweave** überschießt L99 (dmg 391→599).
- **Magie L10 überkorrigiert** (jetzt schwächster Stil früh).
- **Melee strukturell hinten (mid/late):** Platte gibt 0 Offense + verlangsamt (+attackIntervalMs); Pflicht-Smithing trainiert KEIN Attribut (vs leatherworking→dex, runecrafting passiv → Ranged/Magie bekommen Offensiv-Attribut gratis mit); Melee-Tankstats wertlos bei 0 Toden.
- **Ranged:** früh vorn (1,40–1,74× L10–30); Evasion weiter > Platte (Treiber = dex+Gear, NICHT der entfernte +5-Bonus); voidhide stapelt Tank+Offense statt Glass; Ranged-Leder-Wall L52→L72.

## P1 — diskret
- **Early-Ammo-Starvation:** Ranged-Starter nach 2,5 min trocken; `crude_arrow` nicht craftbar; Pfeil-Ökonomie netto negativ → Ranged-Frühspiel praktisch kaputt (60-min: Melee 405 / Magie 1111 / **Ranged 23 dann Stopp**).
- **Auto-Salvage toter Toggle:** `shouldAutoSalvage` definiert, nie aufgerufen (UI ohne Wirkung).
- **Overnight-Combat ohne Auto-Neustart nach Tod:** Starter stirbt → 7,84/8 h brach.

## P2 (Politur)
- Offline-„Während weg"-Popup zählt Bank nicht (autoBank=true → Erträge fehlen).
- Crop-Verarbeitung netto-negativ Gold (gallows_preserve −472g, corpse_lily_salve −505g) → Senke droht leer.
- Reed-Farming-Gates (L6/46/84) weit über Runen-Bedarf; fertige Reeds nicht im Shop.
- Mana-Schild quasi-gratis; Auto-Eat-Tiers wirkungsloser Gold-Sink (T0–T3 identisch).
- Meta: Slayer-Turm (19 Mobs) 0 Kill-Achievements; 2 verwaiste Hochland-Mobs; Pet-Vollsammlung achievement-unsichtbar.
- DoT-Runen vs Flat-Runen schief; kein Schock-Affix trotz `shock_rune`.

## P3 (Auswahl)
- `curesPoison` im Auto-Eat-Pfad ignoriert; toter `inflict.magnitude` bei Frost.
- ember_robe-Craft xp 15–18 (Tippfehler?); Endgame-Quest-Bogen fehlt; Smelt 5 Level vor Erz; Cursor-Typo; Achievement-Grid 5→3-Sprung.

## Empfohlene Reihenfolge
1. **Parität-Runde 2** (balance-designer Spec → content+logic): Magie-Decke senken + L10 entkorrigieren + Melee strukturell stützen + Ranged-Evasion/voidhide/L52-72.
2. **Diskrete P1** parallel: Early-Ammo (content), Auto-Salvage (logic/ui), Overnight-Tod-Neustart (logic).
3. P2-Politur danach.
