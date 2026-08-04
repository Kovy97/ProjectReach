# Encampment „New Haven" — Balance-Ausarbeitung Phase 1 (Task #357)

*Nachtrag 2026-08-03 (Chef-Entscheid, Release-Checkpoint): Zentralhaus I kostet wieder 500 g +
oak_log ×20 OHNE timber_beam — der #366-Bauteil-Zusatz machte den ersten Bau zum 35-60-min-Grind
und brach den dokumentierten „zeremoniell billig"-Intent (§ Zentralhaus). Alle übrigen 44
Stücklisten behalten ihre Bauteile unverändert. Content ist die Wahrheit.*

*Namens-Update 27.07. (Task #360): „Herzfeuer" heißt jetzt **Zentralhaus** (`camp_townhall`), „Vorratslager/Erdgewölbe" heißt **Vorratsspeicher** (`camp_storehouse`). ALLE Zahlen dieses Dokuments bleiben unverändert.*

*Balance-Designer, 2026-07-26. Bindende Grundlage: `design/encampment-konzept.md` (Chef-abgenommen 26.07.).*
*Datenbasis: echter Katalog `packages/content/src/index.ts` (Stand heute, 770 Aktionen / 1112 Items / 110 Monster), Engine-Konstanten aus `packages/shared/src/index.ts` + `packages/engine/src/*`, Sim-Report (sim.test) vom 26.07. Alle Item-IDs zitiert und gegen den Katalog verifiziert.*

> **Nachtrag 03.08.2026 (logic-dev, nach Engine-Audit — die Historie unten bleibt unverändert):**
> Task #366 (Bauteil-System, 27.07.) hat die §2-Stücklisten nachträglich ERWEITERT: jede Stufe
> verlangt zusätzlich Bauteile aus dem Holzfällen-Skill (`timber_beam` Stufe I, `timber_brace`
> Stufe II, `timber_anchor` Stufe III — Σ über alle 45 Aufträge: 47 Balken / 140 Verstrebungen /
> 285 Verankerungen). Weitere Abweichungen vom Stand dieses Dokuments: Wachturm I tauschte
> `slag_carapace` gegen `blackwood_log` ×40, Schmelzofen I tauschte `slag_carapace` gegen
> `bronze_bar` ×20 (beide: Quelle war Slayer-40/K14-gebunden, unpassend für Stufe I); Schrein-Gold
> wurde auf **1 500 / 7 500 / 30 000** gesenkt; die Zentralhaus-Quest-Gates (`chronicle_09`/`14`
> für Stufe II/III) sind ERSATZLOS gestrichen — die Bauteil-Level-Gates sind das alleinige Pacing.
> Maßgebliche Wahrheit für alle Zahlen ist der Katalog `packages/content/src/index.ts`
> (campBuildings-Block); Konzept dazu: `design/newhaven-bauteile-vorschlag.md`.
> **Schrein-Erweiterung (Chef-Entscheid 03.08., combat-dev):** die #359-Auslassung „Kampf-Callsites
> bleiben auf dem Basis-Wert" ist AUFGEHOBEN — der Schrein verstärkt jetzt auch die Kampf-BEUTE-Segen
> (Kill-/Dungeon-XP mistvigil 1.10→1.13, Kill-/Clear-Gold greed 1.20→1.26, Rare-Drop-Chance rotmist
> 1.10→1.13 bei Stufe III; gleicher `shrineAmplifiedMult`-Pfad in `combat.ts`). `wildhunt` bleibt
> gemäß K2/Eiserner Regel 3 vollständig ausgenommen. Guard: `engine/src/shrine-combat-loot.test.ts`.

---

## 0. Band-Definitionen (Grundlage aller Stücklisten)

Kapitel-Tore laut Katalog (`zones[].requiresQuest`): Borderlands=K3, **Aschfelder=K4**, Schwarzdorn=K7, **Krypta=K9**, Wildwald=K11, Küste=K13, **Schlackengrube=K14**, Hochland=K15.

| Band | Kapitel/Zonen | Kampf-Level | Skilling-Level (typ.) | Durchsatz-Referenz (Basis-EV, o. Boosts) |
|---|---|---|---|---|
| **I** | K4: Borderlands/Aschfelder | CL 30–45 | ~L25–40 | Holz 720–800/h (`cut_blackwood_tree` L30), Erz/Barren 800–1100/h, Fisch ~510/h (`catch_ironscale_bass` L30), Kills ~60–100/h |
| **II** | K9: Schwarzdorn/Krypta | CL 45–96 | ~L45–60 | `ironbark_log` 654/h, `runite_ore` 554/h, `raw_lobster` 360/h, `raw_crypteel` 347/h, `essence_grave` 497/h |
| **III** | K14: Wildwald/Küste/Schlackengrube | CL 90–190 | ~L60–80 | `ashfen_log` 533/h, `shadowpine_log` 514/h, `essence_void` 409/h, `raw_anglerfish` 320/h, Titan-Kette L75–80 |

Gold-Einkommen (Verkaufswert/h laut Sim, Verkauf = 50 % Wert): Band I ~5–15 k g/h, Band II ~20–40 k g/h, Band III ~50–100 k g/h.

**Bank-Druck-Materialien** (Quellen mit hoher/garantierter Chance, in denen Spieler schwimmen): `raw_hide` (Kuh 70 %, Aschratte/Schakal 50 %), `crude_bone`, `coal`, Niedrig-Logs, `stolen_coinpurse` (600–1350/h Diebeskunst), `essence_ash`/`dim_essence` (720–850/h), `raw_ironscale_bass`. Die Stücklisten senken gezielt GENAU diese Bestände.

---

## 1. Korrekturen an den Chef-Ankern (VOR der Umsetzung entscheiden)

| # | Anker | Problem | Empfehlung |
|---|---|---|---|
| K1 | Kommandozelt „Queue +1/+1/+1 Slot" | **No-op**: die Action-Queue hat heute KEINE Slot-Grenze (`engine/actions.ts`, `enqueueAction` ohne Kapazität; nur `QUEUE_TARGET_CAP` je Eintrag). Eine neue Kappe einzuführen wäre eine Feature-Regression. | Umwidmung: **Bautrupp-Tempo −10/−20/−30 % Bauzeit** (klassisches Hauptgebäude im „Die Stämme"-Stil, wirkt nur auf künftige Bauten, kein Skill-/Kampfwert). |
| K2 | Schrein „Effekt +10/20/30 %" auf ALLE Segen | `wildhunt` = **+10 % Angriffstempo im Kampf** (`engine/blessing.ts`). Ein Schrein-Multiplikator darauf verletzt Eiserne Regel 3 (Kampf unberührt). | `wildhunt` vom Schrein AUSNEHMEN. Ersatz an wildhunt-Tagen: Elite-Ruhe-Cooldown-Tick `ELITE_WILDHUNT_COOLDOWN_SPEED_MULT` 1.25 → 1.275/1.30/1.325 (Spawn-Frequenz, kein Kampfwert). Chef-Entscheid. |
| K3 | Material-Namen ohne Katalog-Deckung | „Stein", „Stoff", „Stützbalken" existieren NICHT als Items. „Trübessenz" (`dim_essence`, L1, v=6) ist für Zentralhaus III absurd billig. „Aetherium" (`aetherium_bar` L85 / `aetherite_ore` L90) liegt ÜBER dem K14-Band. „Leerenessenz" heißt im Spiel „Hohle Essenz" (`essence_void`). | Substitutionen (in den Stücklisten unten eingearbeitet): Stein→`slag_carapace`/`iron_bar`; Stoff→Häute bzw. `void_thread` („seltene Stoffe"); Stützbalken→Holz+`iron_bar`; Zentralhaus III→`essence_void`; Kommandozelt III→`titanium_bar`; `dim_essence` wandert thematisch in Schrein I. |
| K4 | Zentralhaus „+2/+4/+6 Bauplätze" | Σ = 12 Plätze, aber es gibt **14** Nicht-Zentralhaus-Gebäude. Zwei wären nie baubar. | **+4/+5/+5** (Σ 14). Zusätzlich strukturell: Gebäude-Stufe II erfordert Zentralhaus II, Stufe III erfordert Zentralhaus III. |
| K5 | Kosten-Anker Stufe III (Gold) | Alle 15 Anker-III-Goldwerte liegen UNTER der Eisernen Regel 5 (II≈5×I, III≈4×II; z. B. Händlerposten 25 000 statt 60 000, Trophäenhalle 50 000 statt 100 000). | Regel anwenden (Tabellen unten rechnen ×5/×4 vom Anker-I-Wert; einzige bewusste Ausnahme Zentralhaus III = 15 000 statt 10 000, Story-Flaggschiff). Will der Chef die Anker-III-Zahlen behalten, muss stattdessen II=III/4 gesenkt werden — bitte EINE der beiden Leitern wählen. |
| K6 | Bauzeit über Tick-Zeit + Offline-Cap | Technische Leitplanke sagt „deterministische Spielzeit". Damit streckt der 8-h-Offline-Cap einen 48-h-Bau für 1×-täglich-Spieler auf ~4+ Kalendertage (11 h/Tag Gutschrift mit Wachturm III). | Bewusst SO lassen (Determinismus-Gesetz; Wachturm beschleunigt dann auch den Bau = schöne Synergie). Die 24–48-h-Anker NICHT zusätzlich verlängern; 48 h ist als Endstufen-Maximum genau richtig. |

---

## 2. Stücklisten — alle 45 Bau-Aufträge

Regeln: Gold I = Chef-Anker; II = 5×I; III = 4×II (Ausnahme Zentralhaus, s. K5). Materialien wandern mit der Zonen-Leiter (Regel 5). „≈Aufwand" = reine Beschaffungszeit der Materialien im Band (Basis-EV, ohne Boosts); Gold kommt obendrauf. Alle IDs existieren im Katalog (verifiziert).

### Zentralhaus (Zentrum; Stufen an K4/K9/K14)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 500 | `oak_log` ×20 | ~2 min (bewusst zeremoniell billig, erster Bau) |
| II | 2 500 | `ironbark_log` ×40, `essence_grave` ×15 | ~6 min |
| III | **15 000** (Anker; Regel ergäbe 10 000) | `ashfen_log` ×80, `essence_void` ×20, `bloodiron_bar` ×12 | ~25 min |

### Wachturm (Offline-Cap +1 h je Stufe)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 2 500 | `iron_bar` ×30, `slag_carapace` ×15 | ~40 min (Kampf-Mat: Schlacken-Scheusal L44, 35 %) |
| II | 12 500 | `runite_bar` ×25, `ironbark_log` ×60, `scarred_hide` ×20 | ~50 min |
| III | 50 000 (Anker 40 000) | `titanium_bar` ×20, `shadowpine_log` ×80, `frost_pelt` ×12 | ~1,5 h (Frostpelz = Frosthund, Schlackengrube — Wachturm III ist SPÄT, gewollt) |

### Vorratsspeicher (Bank +4/+4/+6 Plätze)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 1 500 | `blackwood_log` ×50, `raw_hide` ×25 | ~25 min |
| II | 7 500 | `ironbark_log` ×80, `scarred_hide` ×40 | ~1 h |
| III | 30 000 (Anker 25 000) | `warhide` ×15, `bloodiron_bar` ×20 | ~1,5 h (Kriegsleder = Gerber-Kette L70) |

### Kommandozelt (Effekt s. K1: Bautrupp −10/−20/−30 %)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 2 000 | `blackwood_log` ×40, `raw_hide` ×20 | ~20 min |
| II | 10 000 | `ironbark_log` ×60, `scarred_hide` ×30, `witchlight_dust` ×20 | ~50 min |
| III | 40 000 (Anker 30 000) | `titanium_bar` ×10, `void_thread` ×15, `shadowpine_log` ×50 | ~1,5 h (Leeren-Faden = Leerenpirscher 20 %) |

### Fischerhütte (Angeln +5/10/15 %)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 800 | `blackwood_log` ×40, `raw_ironscale_bass` ×60 | ~15 min |
| II | 4 000 | `ironbark_log` ×60, `raw_lobster` ×80 | ~20 min |
| III | 16 000 (Anker 12 000) | `raw_crypteel` ×100 (Anker „Krypta-Aal" ✓), `raw_anglerfish` ×60, `shadowpine_log` ×60 | ~45 min |

### Sägeplatz (Holzfällen +5/10/15 %)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 800 | `bronze_bar` ×25 (Anker ✓), `blackwood_log` ×80 | ~10 min |
| II | 4 000 | `adamantium_bar` ×15, `ironbark_log` ×150 | ~25 min |
| III | 16 000 (Anker 12 000) | `bloodoak_log` ×150 (Anker ✓), `bloodiron_bar` ×15 | ~30 min |

### Stollenmund (Bergbau +5/10/15 %)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 800 | `blackwood_log` ×60, `iron_bar` ×20 („Stützbalken", s. K3) | ~10 min |
| II | 4 000 | `ironbark_log` ×100, `adamantium_bar` ×15, `coal` ×100 | ~30 min |
| III | 16 000 (Anker 12 000) | `runite_bar` ×30 (Anker ✓), `murkvein_ore` ×120, `shadowpine_log` ×40 | ~45 min |

### Feldgarten (Anbau + Sammeln +4/8/12 %)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 600 | `grimwheat_seed` ×20, `bloodbeet_seed` ×15, `graywort` ×60 | ~20 min |
| II | 3 000 | `soulgourd_seed` ×15, `gallows_apple_seed` ×10, `witchlight_dust` ×15 | ~40 min |
| III | 12 000 (Anker 10 000) | `herb_nightbloom` ×60 (Anker „Wildwald-Kräuter" ✓), `gloomspore` ×40, `wraithcap_seed` ×10 | ~35 min |

### Hehlerzelt (Diebeskunst +5/10/15 %)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 1 000 | `raw_hide` ×25, `cutpurse_trinket` ×15, `stolen_coinpurse` ×40 | ~15 min |
| II | 5 000 | `guard_insignia` ×25, `smugglers_key` ×15, `scarred_hide` ×20 | ~45 min |
| III | 20 000 (Anker 14 000) | `void_thread` ×15 („seltene Stoffe", s. K3), `signet_ring` ×12, `cut_gemstone` ×10 | ~1,5 h |

### Werkhof (alle 6 Handwerks-Skills +3/6/9 %)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 3 000 | `bronze_bar` ×20, `iron_bar` ×20, `steel_bar` ×20 (Barren-Mix ✓) | ~10 min |
| II | 15 000 | `adamantium_bar` ×25, `runite_bar` ×20, `witchlight_dust` ×20 | ~40 min |
| III | 60 000 (Anker 35 000; breiteste Wirkung → teuerstes Skilling-Gebäude, s. K5) | `titanium_bar` ×20 (Anker ✓), `bloodiron_bar` ×20, `essence_void` ×20 | ~1 h |

### Schmelzofen (Offline-Veredelung Erz→Barren, 20/40/60 pro h)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 2 500 | `iron_bar` ×30, `coal` ×60, `slag_carapace` ×12 („Stein", s. K3) | ~35 min |
| II | 12 500 | `runite_bar` ×20, `forge_ember` ×20, `coal` ×150 | ~1,2 h |
| III | 50 000 (Anker 30 000) | `titanium_bar` ×25, `frost_essence` ×25 (Anker „Slagpit-Material" ✓: Glut-Elementar 40 %, Frost-Hexer 50 %), `slag_carapace` ×25 | ~1,5 h |

### Räucherhaus (Offline-Veredelung Fisch/Fleisch, 20/40/60 pro h)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 1 800 | `blackwood_log` ×60, `raw_hide` ×30 | ~25 min |
| II | 9 000 | `ironbark_log` ×80, `scarred_hide` ×40, `raw_lobster` ×60 | ~1 h |
| III | 36 000 (Anker 20 000) | `raw_venison` ×60 (Anker „Wildwald-Fleisch" ✓, Wildwald-Hirsch 70 %), `raw_bear_shank` ×60 (Altbär 80 % ×2–3), `shadowpine_log` ×80 | ~1,5 h |

### Trophäenhalle (Slayer-Punkte +10/20/30 %; III: 1 Gratis-Skip/Tag)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 5 000 | `shaman_totem` ×15 (Anker ✓, Goblin-Kaster 10–20 %), `basilisk_scale` ×20 (Anker ✓, 40 %), `crude_bone` ×40 | ~1,5 h (Trophäen SOLLEN erjagt sein) |
| II | 25 000 | `dread_fang_shard` ×25 (Schreckensfang L62, 35 %), `fang` ×40 (Dornwolf 40 %), `scarred_hide` ×30 | ~2 h |
| III | 100 000 (Anker 50 000, s. K5) | `soul_flayer_fang` ×10 (Seelenschinder L86, 12 %), `frost_pelt` ×15, `spider_silk` ×20 (Grubenspinne 60 % ×1–3) | ~2,5 h (Elite-Mats ✓) |

### Schrein des Wächters (Wochensegen sichtbar + Effekt, s. K2)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 4 000 | `essence_ash` ×40, `essence_mire` ×25, `dim_essence` ×30 (Trübessenz hierhin verschoben, s. K3) | ~15 min |
| II | 20 000 | `essence_grave` ×40, `witchlight_dust` ×25 | ~15 min |
| III | 80 000 (Anker 45 000) | `essence_void` ×40 („Leerenessenz" = Hohle Essenz ✓), `aether_essence` ×15, `storm_essence` ×20 | ~2 h (Aetheressenz: Frost-Hexer 20 %, Altbär 10 %, `desecrate_reliquary` L85) |

### Händlerposten (Verkauf +2/4/6 %)
| Stufe | Gold | Materialien | ≈Aufwand |
|---|---|---|---|
| I | 3 000 | `stolen_coinpurse` ×40, `cutpurse_trinket` ×15, `ledger_page` ×10 | ~20 min |
| II | 15 000 | `guard_insignia` ×20, `cut_gemstone` ×12, `smugglers_key` ×15 | ~45 min |
| III | 60 000 (Anker 25 000 „Gold-lastig" — der Regel-Wert IST die Gold-Lastigkeit) | `ornate_goblet` ×12 (`raid_tax_vault` L85, ~40/h), `signet_ring` ×15, `reliquary_shard` ×8 | ~1,5 h |

### Gesamtrechnung (Pacing-Nachweis)
- **Gold:** Stufe I gesamt 29 800 (≈2–4 h Band-I-Einkommen für ALLE 15) · Stufe II gesamt 149 000 · Stufe III gesamt 601 000. Summe ~780 k = kräftige, gestreckte Gold-Senke.
- **Bauzeiten (Anker, EIN Bautrupp):** Stufe I Σ ≈ 15 h · Stufe II Σ ≈ 145 h (~6 Tage) · Stufe III Σ ≈ 452 h (~19 Tage). Der Bautrupp ist der eigentliche Wochen-Takt — genau deshalb dürfen die Material-Aufwände pro Auftrag bei 0,5–2,5 h liegen. Eine Stufe-I-Hütte ist nach 1–2 h im Band leistbar ✓; das Voll-Lager Stufe III ist ein Mehr-Wochen-Projekt ✓ (mit Kommandozelt III −30 %: ~13 Tage reine III-Bauzeit).

---

## 3. Boost-Budget-Nachweis (Tempo)

**Bestandsaufnahme permanenter Tempo-Quellen** (Engine, verifiziert):
- Aktions-Mastery: bis −15 % Dauer (`MASTERY_SPEED_CAP = 0.15`, pro Aktion)
- Mastery-Pool: bis −8 % skillweit (Checkpoints 0.25/0.95: je +0.04)
- Werkzeuge: ×0.5–0.93 (nur Sammel-Skills; das ist die Gear-Leiter selbst, kein „Bonus" — aus dem Budget ausgenommen, aber im Mindestdauer-Check enthalten)
- Pets: KEIN Tempo (nur Doppelertrag/Yield ≤5 %; `rotbark` instantAction 5 % ≈ Durchsatz, keine Dauer-Verkürzung)
- 99er-Meisterringe: KEIN Tempo (Perk-Arten laut `MasterPerkKind`: doubleYield/inputSaver/cropSpeed/alwaysSucceed/buffDuration/stunReduction/successBoost/slayerPoints — kein Speed-Kind; `cropSpeed` 8 % wirkt nur auf Beet-Reifezeit)
- Tages-Segen (transient, 1 Tag/Woche): Sammeln ÷1.15 bzw. Handwerk ÷1.10

**Budget-Definition (empfohlen, als Guard pinnen):**
- **B1 — skillweit permanent** (Pool + Lager): Dauer-Reduktion ≤ 25 % ⇒ Durchsatz ≤ +33 % (unter der +40-%-Empfehlung)
- **B2 — Gesamt-Multiplikator inkl. Aktions-Mastery** (ohne Werkzeug/Segen): nie unter **0.60**

| Skill | Mastery (Aktion) | Pool | Lager (max) | B1: Pool+Lager | B2: Gesamt-Mult | Durchsatz gesamt |
|---|---|---|---|---|---|---|
| Holzfällen | 15 % | 8 % | Sägeplatz 15 % | 23 % → +29,9 % ✓ | 0.85·0.92·0.85 = **0.664** ✓ | +50,4 % |
| Bergbau | 15 % | 8 % | Stollenmund 15 % | 23 % ✓ | 0.664 ✓ | +50,4 % |
| Angeln | 15 % | 8 % | Fischerhütte 15 % | 23 % ✓ | 0.664 ✓ | +50,4 % |
| Diebeskunst | 15 % | 8 % | Hehlerzelt 15 % | 23 % ✓ | 0.664 ✓ | +50,4 % |
| Sammeln (Foraging) | 15 % | 8 % | Feldgarten 12 % | 20 % → +25 % ✓ | 0.85·0.92·0.88 = 0.688 ✓ | +45,3 % |
| Anbau (Farming) | — (Reifezeit) | — | Feldgarten 12 % auf `growMs` | Reifezeit ×0.88; mit Ring-`cropSpeed` 8 %: ×0.81 | n/a (kein Aktions-Pfad) | −19 % Reifezeit, harmlos (Crops 10–160 min) |
| Schmieden/Kochen/Handwerk/Juwelen/Runen/Kräuter | 15 % | 8 % | Werkhof 9 % | 17 % → +20,5 % ✓ | 0.85·0.92·0.91 = 0.712 ✓ | +40,5 % |
| Slayer | — | — | Trophäenhalle: nur PUNKTE | 0 Tempo ✓ | — | — |
| Kampf-Skills/Warding/Vitality | — | — | **kein Gebäude** | 0 ✓ (Eiserne Regel 3) | — | — |

**Mindestdauer-/Tick-Raster-Check** (`TICK_MS = 100`; Formel `effectiveActionDurationMs` = Basis × Werkzeug × Mastery × Pool × Lager ÷ Segen, min 1 ms):
- Kürzeste Sammel-Aktion mit bestem Werkzeug: `cut_normal_tree` 2,8 s × 0.5 (`godiron_axe`) × 0.664 ÷ 1.15 = **0,81 s = 8 Ticks** ✓
- Bergbau: 3,0 × 0.6 × 0.664 ÷ 1.15 = 1,04 s ✓ · Angeln: 3,0 × 0.58 × 0.664 ÷ 1.15 = 1,00 s ✓ · Foraging: 3,0 × 0.58 × 0.688 ÷ 1.15 = 1,04 s ✓
- Handwerk (ohne Werkzeug): `cook_shrimp` 2,5 s × 0.712 ÷ 1.10 = 1,62 s ✓ · `smelt_copper` 2,6 s → 1,68 s ✓
- Fazit: nichts fällt unter ~8 Ticks; kein Raster-/Rundungsproblem, keine Aktion nähert sich dem 1-Tick-Boden.

**Yield-Budget unberührt:** Das Lager gibt KEINEN Doppelertrag/Preservation — die „Worst-Case-Doppelertrag-Kette bleibt < 1"-Rechnung (balance-envelope §8) ändert sich nicht.

---

## 4. Offline-Veredelung (Schmelzofen / Räucherhaus)

Aktive Referenz-Raten (Basis, ohne Boosts): `smelt_steel` 800/h · `smelt_runite` 424/h · `smelt_bloodiron` 400/h · `smelt_titanium` 379/h · `smelt_godiron` 300/h; Kochen: `cook_crypteel` 545/h · `cook_anglerfish` 450/h · `cook_soulfish` 313/h.

| Stufe | Rate | Anteil an LANGSAMSTER aktiver Rate | Anteil an Band-Rate (Mitte) |
|---|---|---|---|
| I | 20/h | 6,7 % | ~2–4 % |
| II | 40/h | 13,3 % | ~5–9 % |
| III | 60/h | **20 %** (godiron) bzw. 15,8 % (Titan) | ~8–14 % |

**Urteil: 20/40/60 halten die ≤-30-%-Leitplanke überall — Anker unverändert übernehmen.** Absolut betrachtet liefert ein 1×-täglich-Spieler mit Wachturm III max. ~690 Barren/Tag, die aber ~2–3 h eigenes Erz+Kohle-Farmen als Input kosten — die Anlage ist input-limitiert und kann aktives Spiel nicht ersetzen.

Spezifikation (bindend für die Umsetzung, hält Balance UND Guards sauber):
1. **Nur 1-Input-Basisrezepte:** Schmelzofen nur `smelt_*` (Erz→Barren), Räucherhaus nur 1-Zutat-Rezepte (`cook_<fisch/fleisch>`). KEINE Mehr-Zutaten-Gerichte (Bankette/Eintöpfe bleiben aktives Kochen — das beste Essen bleibt handgemacht).
2. Spieler wählt EIN aktives Rezept je Gebäude; Level-Anforderung des Rezepts muss erfüllt sein („beherrschte Rezepte").
3. **Kein XP, kein Mastery-XP, keine Preservation, kein Doppelertrag, KEIN RNG-Zug** — strikt deterministisch 1 Output je Rezeptdurchlauf, Inputs zu exakten Rezeptmengen aus Bank/Inventar (Normalpfade). RNG-Sequenz bleibt bit-identisch → bestehende Determinismus-Fixtures unberührt.
4. Läuft in getickter Spielzeit (online + Offline-Fenster bis Cap), Ergebnis in den Offline-Report.

---

## 5. Wachturm — Offline-Cap-Quantifizierung

`MAX_OFFLINE_MS = 8 h` (shared). Raten ändern sich NICHT, nur das Gutschrift-Fenster:

| Spieler-Kadenz | heute (8 h) | Wachturm III (11 h) | Delta |
|---|---|---|---|
| 2×/Tag (morgens+abends, Fenster ≤ 9–10 h) | verliert 1–2 h/Nacht | Nacht voll gutgeschrieben | +10–20 %/Tag |
| 1×/Tag | 8 h/Tag | 11 h/Tag | **+37,5 % Offline-Gutschrift** |
| Dauerspieler | 0 | 0 | 0 |

**Urteil: harmlos.** Es entsteht keine neue XP/h-Spitze (Kurven unverändert), nur mehr eingefangene Zeit für Gelegenheitsspieler — exakt die Retention-Zielgruppe des Features. Ein zusätzliches Story-Tor für Stufe III ist NICHT nötig: die Materialien (Titan L75, Frostpelz aus der Schlackengrube K14) + Zentralhaus-III-Kopplung (K14) + 48 h Bauzeit gaten spät genug. Synergie beachten: der höhere Cap beschleunigt auch Bautrupp und Veredelung offline — gewollt, im Pacing oben eingerechnet.

---

## 6. Trophäenhalle · Schrein · Händlerposten (gegen die echten Systeme gerechnet)

### Trophäenhalle (Slayer-Punkte)
Ökonomie heute (`slayerMasters[0]` Brenna): `basePoints` 5, Task 15–50 Kills (skaliert ×0.73–1.27), Streak: jeder 10. Task +1 Task-Äquivalent Punkte, jeder 5. +2 Tokens; `skipCost` 20 P. Realistisch ~2 Tasks/h im Band ⇒ **~11–14 P/h**. Shop-Spanne 8–650 P (`slayer_helm` 650 ≈ 47–59 h Grind).
- Halle +30 % und Meisterring `slayerPoints` +10 % **additiv in EINEM Multiplikator** auf die Task-Gutschrift (bestehende Callsite `recordKillForSlayer`, eine Rundung): ×1.40 max ⇒ Helm ≈ 34–42 h. Gesund; **Empfehlung: Gesamt-Punkte-Multiplikator hart ≤ ×1.5 klemmen** (Guard), damit spätere Quellen nicht stapeln.
- Streak-Bonuspunkte (jeder 10. Task) bewusst OHNE Multiplikator lassen (Präzedenz: Meisterring wird dort heute schon nicht angewandt).
- Gratis-Skip/Tag (III) = 20 P Gegenwert ≈ 1,5–2 Task-Stunden Ersparnis bei schlechtem Task; gleiche Semantik wie bezahlter Skip (Streak bleibt erhalten, Präzedenz `SLAYER_SKIP_FREE_BELOW_LEVEL`). Unkritisch.

### Schrein des Wächters (Wochensegen, `engine/blessing.ts`)
Formel: Bonus-Anteil × (1 + 0.10 × Stufe). Exakte Zielwerte:

| Segen (Art) | Basis | I | II | III |
|---|---|---|---|---|
| bloodmoon (Loot-Verdopplungs-CHANCE je Kill) | 15 % | 16,5 % | 18 % | 19,5 % |
| ashenstorm (Sammel-Tempo ÷) | 1.15 | 1.165 | 1.18 | 1.195 |
| silence (Handwerks-Tempo ÷) | 1.10 | 1.11 | 1.12 | 1.13 |
| rotmist (Rare-Drop-Chance ×, Cap 1 je Roll bleibt) | 1.10 | 1.11 | 1.12 | 1.13 |
| mistvigil (XP ×) | 1.10 | 1.11 | 1.12 | 1.13 |
| greed (Gold-Vergabe ×) | 1.20 | 1.22 | 1.24 | 1.26 |
| wildhunt (Angriffstempo) | 1.10 | **ausgenommen** (s. K2) | — | — |

Budget-Wechselwirkung: am ashenstorm-Tag sinkt der Gesamt-Dauer-Multiplikator transient auf 0.664÷1.195 = 0.556 an EINEM Wochentag — bewusst außerhalb des permanenten Budgets, Mindestdauer-Check hält (0,81 s → 0,78 s, 7–8 Ticks ✓). Alles milde Verstärkung bestehender, bereits additiv gedachter Weltboni; keine Kappe nötig außer der bestehenden Rare-Drop-Klemme.

### Händlerposten (Verkauf +2/4/6 %)
Sell-Pfad heute: `effectiveSellPrice = max(1, round(value × SELL_FRACTION(0.5) × (1 + petSellBonus ≤ 0.05)))`; der Segen `greed` greift NICHT im Sell-Pfad (nur an Gold-Vergabe-Punkten). Stacking neu: ×(1 + Pet 0.05 + Posten 0.06) = **max +11 %** ⇒ effektiv 0.555 × Wert. 
- Arbitrage-Check: Shop-Kaufpreise liegen ≥ Item-Wert, Buy-Back ist symmetrisch zum effektiven Preis — kein Gold-Pump möglich. ✓
- **Empfehlung: additive Stapelung + harte Klemme des Gesamt-Verkaufsbonus auf +15 %** in `effectiveSellPrice` (eine Zeile, schützt vor künftigen Quellen).
- Wirkung: Band III ~50–100 k Verkaufswert/h ⇒ +6 % ≈ +1,5–3 k g/h. Amortisation der 60 k Gold in ~20–40 Verkaufsstunden — korrektes Langzeit-Gebäude.

---

## 7. Sim-Impact & Guard-Liste (für die Implementierungs-Welle)

Vom Lager berührte Pfade und die betroffenen Pins/Guards:

1. **`effectiveActionDurationMs` (tick.ts):** neuer Lager-Faktor. MUSS ohne Lager exakt 1 sein (Muster `blessingMult` ohne `nowMs`) ⇒ Sim-Charaktere/Fixtures ohne Lager bleiben **bit-identisch**; `action-duration.test.ts` um Lager-Fall erweitern. Per-Tick-Aufruf ⇒ Faktor billig cachen (Muster Blessing-Tages-Cache / WeakMap).
2. **SAVE_VERSION 75→76** + Migration + Kompat-Vault-Fixture (GESETZ). Neue Felder: Gebäudestufen, Bautrupp-Job, je Veredelungs-Gebäude gewähltes Rezept + Fortschritts-Akkumulator. Defaults = neutral.
3. **`MAX_OFFLINE_MS`-Konsumenten:** persistence clampt `accumulatorMs`/`actionProgressMs`/`stunMs` auf `MAX_OFFLINE_MS` (persistence/index.ts:673–675, 2669) und `index.test.ts:1005` pinnt den Cap ⇒ auf effektiven Cap (bis 11 h) umstellen bzw. Klemmen auf das MAXIMAL mögliche Cap heben.
4. **Offline-Veredelung:** kein RNG-Zug (Spezifikation §4.3) ⇒ RNG-Sequenz-Pins (Determinismus-Fixtures, sim-consistency-Läufe) unberührt. Neues Modul mit eigenen Tests.
5. **`effectiveBankCapacity` (shared):** einzige Kapazitätsquelle — Lager-Term dort addieren, `bank.test`/UI ziehen automatisch nach.
6. **Slayer-Gutschrift (`recordKillForSlayer`):** Multiplikator-Stelle existiert (Meisterring-Pfad) — Halle additiv im selben Ausdruck, EINE Rundung; `slayer.test.ts` erweitern (inkl. ≤×1.5-Klemme).
7. **`effectiveSellPrice` (shop.ts):** Posten-Bonus + Gesamt-Klemme +15 %; `shop.test.ts` erweitern; Buy-Back-Symmetrie-Test bleibt grün (symmetrische Formel).
8. **Blessing-Verstärkung:** Schrein-Faktor an den `blessingMult`/`blessingChance`-Callsites (state-abhängig ⇒ Signatur bekommt state oder der Faktor wird am Callsite multipliziert). wildhunt ausnehmen (K2). `blessing.test.ts` erweitern.
9. **Farming:** Feldgarten auf `effectiveGrowMs` (Muster `masterCropSpeedBonus`, multiplikativ) + Foraging über den Aktions-Pfad (Punkt 1). `farming.test.ts` erweitern.
10. **NICHT berührt:** balance-envelope §2–6 (reine Kampf-Caps — kein Gebäude liefert Kampfwerte), Doppelertrag-Ketten-Guard §8 (Lager gibt keinen Yield), style-xp-parity, progression-band Guard A/B (Zentralhaus-Gates als `requiresQuest`-Muster AUSSERHALB der Zonen-Liste modellieren; seit Task #365 nur noch chronicle_09/14 — Stufe I ist ab Spielstart frei), XP/h-Bänder des Sim-Reports (Sim-Baseline ohne Lager ⇒ Zahlen unverändert).
11. **Neuer Guard (empfohlen): `camp-envelope.test.ts`** — pinnt: max. Lager-Tempo je Skill ≤ 0.15 (Werkhof-Gruppe ≤ 0.09), Kampf-Skills exakt 0, B2-Boden 0.60, Verkaufsbonus-Klemme, Punkte-Klemme, „ohne Lager bit-identisch".
12. **sim-consistency `checkReferenceCompleteness`:** alle 45 Stücklisten-IDs sind erreichbar (oben verifiziert); Waisen-Baseline kann sich VERBESSERN (Items bekommen Senken) — Pin-Liste ggf. neu ausrichten, niemals rot.

---

## 8. Geordnete Apply-Liste (content-dev / logic-dev, nach CEO-Freigabe)

1. **Chef-Entscheide einholen:** K1 (Kommandozelt-Umwidmung), K2 (wildhunt-Ausnahme), K5 (Gold-Leiter: Regel-Werte vs. Anker-III).
2. logic-dev: State/SAVE 76 + Migration + Vault-Fixture; Bauplatz-/Zentralhaus-Kopplung (K4: +4/+5/+5).
3. logic-dev: Tempo-Hook in `effectiveActionDurationMs` (neutral ohne Lager) + `camp-envelope`-Guard (Punkt 7.11).
4. content-dev: 45 Stücklisten EXAKT wie §2 (IDs+Mengen+Gold), Bauzeiten aus dem Konzept unverändert.
5. logic-dev: Wachturm-Cap (Punkt 7.3), Vorratsspeicher-Bank-Term (7.5).
6. logic-dev: Offline-Veredelung nach Spezifikation §4 (Rezeptwahl, kein RNG/XP, Offline-Report).
7. logic-dev: Trophäenhalle (7.6), Händlerposten (7.7), Schrein (7.8), Feldgarten (7.9).
8. kontrolleur: voller Guard-Lauf + Vault; Sim-Report-Diff MUSS leer sein (Baseline ohne Lager).
