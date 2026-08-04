# QA Run 4 — Endgame L75–99 (Re-Test nach Fixes)

**Playtester:** read-only Daten-Audit (packages/content/src/index.ts; Kurven-/Funnel-Mathe aus Katalogzahlen)
**Datum:** 2026-06-27
**Fokus:** Verifikation der run3-P1-Fixes — Combat-Vakuum L84–91 + Trichter (4 Mobs/1 Zone). Plus: Skilling-Fülle bis 99, Top-Gear-Tiers, Capstone, Dungeons, Meta-Goals.
**Vergleich:** `design/qa/run3-endgame.md` (Fun 7/10).

## Fun-Score: 8.5 / 10

Die beiden run3-P1-Killer sind **strukturell behoben**: Der L84→92-Leerlauf ist mit zwei Open-World-Mobs überbrückt, und der 59%-XP-Endgrind (90→99) hat statt 4 Mobs in 1 Zone jetzt eine **Rotation über 4 Zonen**. Zusätzlich ist die run3-P2-Stilparität (L99-Rüstung für alle drei Stile) geschlossen. Damit greift exakt der run3-Satz „Fix the L85–99 monster variety and this is an 8.5+". Was die 9+ noch verhindert: kein Endgame-Quest-Bogen (run3-P2 #2, offen), Slayer-Shop stagniert weiter ab Slayer 60 (run3-P3, offen), und ein paar kleine Kurven-Schönheitsfehler.

---

## Verifikation der 5 neuen Open-World-Mobs

Alle 5 existieren (index.ts L8426–8508), korrekt verteilt, jeder mit eigener Resist-/Inflict-/Enrage-Signatur — kein Reskin-Klon:

| Mob | Lvl | Zone | HP | dmg/Intervall → DPS | Resist | Inflict | Enrage | XP | Schlüssel-Loot |
|---|---|---|---|---|---|---|---|---|---|
| gravecliff_specter | 87 | **highlands** | 880 | 100 / 2600 → 38.5 | bleed, poison | frost 28% | – | 1500 | feather ×10–20, aether/void ess. |
| voidhusk_crusher | 90 | **slagpit** | 960 | 112 / 3600 → 31.1 | shock, burn | burn 30% | <30% ×1.65 | 1750 | godiron_ore, slag_carapace, forge_ember |
| abyssal_tide_serpent | 96 | **coast** | 1020 | 108 / 2800 → 38.6 | burn, bleed | frost 32% | – | 2300 | raw_lobster, scaled_leather, aether ess. |
| charred_doomknight | 101 | **slagpit** | 1100 | 120 / 3400 → 35.3 | frost, bleed | burn 35% | <25% ×1.80 | 2900 | godiron_ore+bar, forge_ember |
| void_titan | 110 | **highlands** | 1280 | 130 / 3200 → 40.6 | shock, poison | shock 30% | <30% ×1.75 | 5000 | void/aether ess., godiron_ore, **idolhall_key 4%** |

**On-Curve?** Ja. HP steigt monoton (roc_void 860@84 → … → void_titan 1280@110 → last_idol 1400@120). DPS liegt im Band der bestehenden Endgame-Mobs (roc_void 43.3, scale_skarn 21.7) — void_titans „rohe" 130 dmg sehen hoch aus, normalisieren über 3200 ms aber auf 40.6 DPS, **unter** roc_void. Defense/Evasion/Accuracy ebenfalls in der Reihe.

**Killbar geared?** Ja. Ein BiS-L99-Char (Godiron-Platebody 136 def/340 HP + Set + Auto-Eat) farmt diese im Auto-Battle erwartbar durch; die höchsten (charred 101, void_titan 110) sind bewusst zäh, aber das ist Endgame-gewollt — sie liegen unter dem Capstone last_idol (120).

**Abwechslung für alle Stile?** Ja, klarer Fortschritt:
- **Verteilung:** highlands ×2, slagpit ×2, coast ×1 — der Endgrind ist nicht mehr auf Idol Hall als einzige Stube beschränkt.
- **Loot füttert den Gear-Loop direkt:** godiron_ore/bar (Melee-Smithing), feather (→ godiron_arrow, Ranged), scaled_leather + raw_shadowhide-Kette (→ voidhide, Ranged), aether/void_essence (→ voidweave, Magie). Combat speist erstmals spürbar das Top-Crafting.
- **idolhall_key** dropt jetzt open-world (void_titan 4%, zusätzlich zum Boss), d.h. der Capstone-Zugang ist nicht mehr allein boss-gegated.
- Alle 5 sind im Endgame-Slayer-Master **Varek** (unlock CL80/Slayer60) Taskpool (L11734) → Doppelnutzung als Slayer-Ziele.
- 15 neue Kill-Achievements (10/100/1000 je Mob, L9258–9272).

---

## Funnel-Mathe: Δ vs run3 (belegt)

Combat-XP-Dämpfung (unverändert): volle XP solange Skill ≤ Mob+5, linear auf 0 ab Skill ≥ Mob+15. Bei **Skill 99** → volle XP ab Mob-Lvl **≥ 94**, anteilig 85–93.

**Open-World-Mobs mit voller XP bei Skill 99 (Lvl ≥ 94):**
- **run3:** 3 — aether_wraith (98), scale_skarn (104), last_idol (120) — **alle in idolhall**.
- **run4:** 6 — + abyssal_tide_serpent (96, coast), charred_doomknight (101, slagpit), void_titan (110, highlands) → **verdoppelt, über 4 Zonen.**

**Open-World-Mobs mit voller XP bei Skill 90 (Lvl ≥ 85):**
- **run3:** 4 (idol_warden 92, aether_wraith 98, scale_skarn 104, last_idol 120).
- **run4:** 9 (+ gravecliff_specter 87, voidhusk_crusher 90, abyssal_tide_serpent 96, charred_doomknight 101, void_titan 110).

**Vakuum L84→92:** run3 hatte zwischen roc_void (84) und idol_warden (92) **nur** Slayer-Tower-Mobs (RNG-gated). run4: gravecliff_specter (87, highlands) + voidhusk_crusher (90, slagpit) → **geschlossen, ohne Slayer-Gate.**

**Grind-Durchsatz 98→99 (1,23 M XP):** void_titan gibt ~5000 Kill-XP + Dmg-XP → ≈ **238 Kills** statt run3 ≈ 553 Kills auf aether_wraith (~2225 XP/Kill) — und das jetzt wahlweise verteilt über 6 Mobs/4 Zonen statt monoton ein Farmspot. Beide run3-P1 sind damit gelöst.

---

## Top-Gear bis 99 — Stilparität (run3-P2 #1: BEHOBEN)

| Slot-Familie | Melee | Ranged | Magie |
|---|---|---|---|
| L99-Rüstung | Godiron 9-tlg (smithing 95–99) | **Voidhide 5-tlg (leatherworking 99)** ← NEU | **Voidweave 5-tlg (magic_off 99 + runecrafting 99)** ← NEU |
| Vorgänger | Aetherium 90 | Shadowhide 95 | Godspark 88 |

- **Voidhide** (L2802–2826) hebt Ranged sauber über Shadowhide: Body 72 def / 56 eva / 150 HP / +12 rangedDmg (vs Shadowhide 62/48/130/+9). Set-Bonus eva+30, rangedDmg+18, crit 0.04/0.18 (L9695).
- **Voidweave** (L3712–3756) hebt Magie über Godspark: Vestment 42 def / 40 magicDmg / +17 int / crit 0.05/0.18 (vs Godspark 34/30/+14/0.04/0.12). Set-Bonus magicDmg+36, crit 0.05/0.20 (L9638).
- Beide **craftbar** (craft_voidhide_body L7246, craft_voidweave_vestment L7280) und als Sets definiert → real erreichbar, kein Geist-Item.
- Alle drei Stile haben nun L99-Waffen **und** L99-Rüstung → die run3-Asymmetrie (Ranged stoppt 95, Magie 88) ist weg.

## Skilling-Endgame & Capstone (Snapshot bestätigt)

- Skilling weiterhin voll bis 99: z.B. Godiron-Schmieden levelRequired 95–99 (forge_godiron_* L5223+, smelt_godiron L5210), runecrafting/leatherworking/fletching/jewelcrafting mit 90/95/99-Tiers. Kein Skill „läuft vor 99 leer" (unverändert ggü. run3).
- Capstone **last_idol** L120 (1400 HP, Enrage <30% ×1.75, regen 14, Resist shock+poison) intakt; Idol-Sanctum-Dungeon (req 99) + 6 Dungeons, 24 Sets, Slayer-Turm 5 Etagen, Pets, Total-Level-Goals — Meta-Schicht unverändert reich.
- Quests: 88 gesamt (38 q_ + 50 daily); **kein** Eintrag referenziert last_idol/godiron/idol_sanctum (Bereich L9722+) → Endgame-Quest-Bogen weiterhin nicht vorhanden.

---

## Findings

### [P2] Kein Endgame-Quest-Bogen (run3-P2 #2 — weiterhin offen)
Quests bleiben front-/mid-loaded; 0 von 88 zielen auf last_idol / Godiron-Forge / Idol-Sanctum. Der Endgrind hat narrativ keinen Pull, nur Achievements + Collection tragen L75–99.
**Fix:** kurzer L70/85/99-Bogen (Last Idol erlegen, Godiron-Teil schmieden, Idol-Sanctum clearen).

### [P3] Slayer-Shop stagniert weiter ab Slayer 60 (run3-P3 #1 — weiterhin offen)
`slayerShop` (L11776) ist unverändert: letztes Item `void_anchor` bei Slayer 60 / 500 Pkt. Slayer 60–99 hat keinen neuen Punkte-Sink, obwohl Floor 5 Slayer 80 verlangt. (Die 5 neuen Mobs landeten zwar in Vareks Taskpool, aber der Shop wuchs nicht mit.)
**Fix:** 2–3 Einträge bei Slayer 75/90 (XP/Drop-Boost, Pet/Cosmetic, Gear-Unlock).

### [P3] Kleine Endgame-Kurven-Schönheitsfehler
- XP-Inversion: abyssal_tide_serpent (L96) gibt 2300 XP, aether_wraith (L98) nur 2100 — niedrigerer Mob, mehr XP.
- void_titan roh-dmg 130 ist der höchste aller Endgame-Mobs (über Capstone last_idol 110); DPS ist via Intervall on-curve, aber der nackte Tooltip-Wert kann „über-Boss" wirken.
**Fix:** abyssal-XP auf ~2000 senken oder aether anheben; void_titan dmg ~118–122 (DPS bleibt im Band).

### [P3] Kein Post-99-/Post-Max-Loop (run3-P3 #2 — bewusster Design-Cap)
Nach 99-Cap + sobald Mobs ≥15 Lvl unter dem Char liegen (XP→0) bleibt nur Loot. Bekannte Design-Entscheidung (Hard-Cap gewollt) — als späterer Meilenstein vermerkt (Mastery-Currency/Prestige/Relic-Track).

---

## Δ vs run3 — Zusammenfassung

| run3-Finding | Status run4 |
|---|---|
| **[P1]** Combat-XP trichtert in 4 Mobs / 1 Zone (hintere 59%) | **BEHOBEN** — 6 Voll-XP-Open-World-Mobs @99 über 4 Zonen (war 3/1 Zone) |
| **[P1]** Open-World-Vakuum L84→92 (Nicht-Slayer) | **BEHOBEN** — gravecliff (87) + voidhusk (90), open-world |
| **[P2]** Stilparität: nur Melee hat L99-Rüstung | **BEHOBEN** — Voidhide (Ranged L99) + Voidweave (Magie L99) |
| **[P2]** Kein Endgame-Quest-Bogen | **offen** → bleibt P2 |
| **[P3]** Slayer-Shop stoppt bei Slayer 60 | **offen** → bleibt P3 |
| **[P3]** Kein Post-99-Loop | **offen** (bewusst, später) |
| — | **NEU [P3]** kleine XP-/dmg-Kurven-Schönheitsfehler |

**Fun: 7 → 8.5 (+1.5).** Beide P1-Combat-Blocker und die P2-Rüstungsparität sind weg; Combat speist jetzt zudem den Top-Gear-Loop und den Capstone-Zugang. Reststeigerung zur 9+ liegt am fehlenden Endgame-Quest-Bogen und am stagnierenden Slayer-Sink.
