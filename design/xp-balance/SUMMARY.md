# XP-Balance Nicht-Combat-Skills — Gesamtübersicht (13 Skills)

> Stand 2026-07-01. Quelle: je ein balance-designer-Agent pro Skill, deterministisch gegen den
> Katalog (`packages/content/src/index.ts`) + die XP-Kurve (`packages/engine/src/leveling.ts`)
> gerechnet (`xp × 3.600.000 / durationMs` vs. Zielkurve). Einzelberichte: `design/xp-balance/<skill>.md`.
> **Kein Content-Code wurde angefasst** — dies ist reine Analyse; Einpflegen = separater content-dev-Pass mit Chef-Freigabe.

## Kernaussage (überraschend deutlich, in ALLEN 13 gleich)
Die pauschale These „Nicht-Combat-XP zu brutal" trifft **auf der XP/Stunde-Ebene NICHT zu**. Praktisch
jeder Skill sitzt an oder über der Zielkurve; die Teams haben die Raten sauber gebalanced. Das
„diabolische" Gefühl kommt aus **drei konkreten Defektklassen**, nicht aus zu langsamen Raten:

- **A) 1-XP-Böden / winzige Absolutzahlen** an frühen Aktionen (runden optisch/echt auf 1 ab).
  → Der Chef-Anker „1 XP bei Level 8" = wörtlich `cook_boar_loin` (L8, 1 XP).
- **B) Tote Tiers / Durchsatz-Inversionen**: eine neu freigeschaltete Aktion gibt WENIGER XP/h als eine
  längst offene → kein Fortschrittsgefühl, man klebt Level-lang auf einer alten Aktion.
- **C) Struktur-/Input-Lücken** (brauchen Content, nicht nur `xp`): fehlende Tiers/Quellen.

## Brutalitäts-Noten (1 = exzellent … 5 = kaputt)
| Skill | Note | Kernproblem |
|---|:--:|---|
| Bergbau | 2 | nur `mine_godiron`-Spike (L95) |
| Holzfällen | 2 | Late-Game-Sägezahn (3 Tiers) |
| Angeln | 2 | totes Band L20–35 + 3 Klippen |
| Anbau | 2 | 2 `levelRequired`-Tippfehler |
| Sammeln | 2 | 20-Level-Plateau L18–38 |
| Juwelierskunst | 2 | Absolutzahl-Böden + Lücke L20–34 |
| Schmieden | 2 | `recycle_scrap` 1-XP-Trap + 2 Mini |
| Diebeskunst | 3 | **totes Tier L12–35** + `fence_trinket` 1 XP |
| Kochen | 3 | `boar_loin` L8=1 XP + tote Zone L1–14 + 1 Falle |
| Bogenbau | 3 | totes Eisen-Tier L10 + frühe Wall |
| Handwerk | 3 | Glut-Robe 3× übertunt → tote Tiers L33–58 |
| Runenkunst | 3 | **nicht startbar** (dim_essence-Input-Wall) |
| Kräuterkunde | 3 | Legacy-Trio ohne Level → 14 Inversionen |

Keiner ist „kaputt" (4–5). Alle Fixes sind fast ausschließlich reine `xp`-Bumps — **keine Nerfs außer
einem** (Glut-Robe), **keine Dauer-Änderungen außer einer** (steel_longbow), **keine Save-Migration**.

## Die 2 höchstwertigen Fixes (skillübergreifend)
1. **Universeller Min-2-XP-Boden (Politik-Fix).** Jeder Agent empfahl unabhängig einen Ganzzahl-Boden
   von 2 XP pro Aktion. Das killt das „1 XP fühlt sich diabolisch an"-Problem überall auf einen Schlag.
   Bergbau/Angeln/Holzfällen/Sammeln haben ihn schon → dort keine 1-XP-Fälle. **WARNUNG:** die rohe
   Ziel-Formel NICHT blind auf frühe Tiers anwenden — sie rundet `xp` auf 1 ab und ERZEUGT das Problem
   erst. Der Min-2-Boden ist die Schutzmaßnahme.
2. **dim_essence-Frühquelle (Struktur-Fix, Runenkunst).** Runenkunst ist aus dem Stand **nicht startbar**:
   L1-Rezepte (Kupfer-Stab/Wand/Fokus, Kraftrune) verlangen `dim_essence`, dessen früheste Quelle aber
   L20+ ist (Warband-Dungeon; Caster-Goblins L28/30; Thieving `launder_ledger` L30) — und kein Shop-Eintrag.
   Ein frischer Magier hat keinen Nachschub. **Fix:** Shop-Eintrag `{ itemId: "dim_essence", cost: 8 }`
   und/oder Foraging-Aktion `forage_dim_essence` (L1). (Betrifft direkt die Chef-Frage von heute.)

## Priorisierte P1-Apply-Liste (Muss-Fixes, nur `xp` außer markiert)
Vollständige Listen inkl. P2/P3 in den Einzelberichten. Reihenfolge = Wirkung.

**Tote Tiers / Inversionen (Fortschrittsgefühl):**
- Kochen: `cook_gallows_preserve` 16→34 (0,48× Ziel, schlimmste Falle)
- Handwerk: Glut-Spike runter — `craft_ember_robe_hood` 30→10, `_robe_legs` 36→12, `_robe_body` 42→14, `_handwraps`/`_sandals` 13→9
- Diebeskunst: `loot_market_stall` 4→6, `pickpocket_tax_collector` 4→7, `burgle_warehouse` 12→14
- Bogenbau: `fletch_iron_arrows` 2→4, `fletch_iron_shortbow` 3→6, `fletch_iron_longbow` 6→9, `fletch_steel_longbow` **durationMs 11000→8000** + xp 15→14
- Angeln (totes Band L20–35): `catch_salmon` 10→24, `catch_ironscale_bass` 9→17, `catch_shadowcarp` 8→13, `catch_ghostfin_pike` 7→10, `catch_cod` 6→7
- Sammeln (Plateau L18–38): `forage_deepwood` 4→6, `bloodthistle` 4→6, `blightmarsh` 5→7, `palefungus` 5→8, `mire_essence` 6→9, `umber_thickets` 8→11
- Runenkunst: `craft_aether_rune` 3→13
- Kräuterkunde: `brew_emberroot_tonic` 50→65; Spikes glätten `brew_mandrake_tincture` 16→9, `brew_bloodmend_draught` 34→26, `brew_revenant_elixir` 205→160, `brew_godbloom_infusion` 535→454, `brew_corpse_lily_salve` 130→104
- Bergbau: `mine_godiron` 475→295
- Holzfällen: `cut_ashfen_tree` 33→38, `cut_wraithwood_tree` 77→90, `cut_voidwood_tree` 177→205
- Schmieden: `smelt_murkvein` 26→37

**1-XP-Böden (Feel) — durch Min-2-Politik abgedeckt, sonst explizit:**
- Kochen: `cook_boar_loin` 1→2, `cook_bog_fowl` 1→2, `cook_hare` 1→2, `cook_murk_perch` 1→2, `cook_grimwheat_porridge` 1→2, `cook_honey_cake` 1→2
- Schmieden: `recycle_scrap` 1→3, `smelt_copper` 1→2
- Diebeskunst: `fence_trinket` 1→2
- Handwerk: `craft_cured_boots` 1→2, `craft_cured_vambraces` 1→2, `craft_apprentice_robe_legs` 1→2
- Bogenbau: `fletch_crude_arrows` 1→2
- Juwelierskunst: `cut_garnet`→2 (+ craft_garnet_ring/amulet/fang_necklace→3, cut_sapphire→3)

**`levelRequired`-Korrekturen (Tippfehler/Legacy):**
- Anbau: `reed_iron` 26→46, `reed_void` 58→84
- Kräuterkunde: `brew_antivenom` +levelRequired 8 (xp 3→2), `brew_greater_healing` +levelRequired 16, `brew_minor_healing` xp 2→1
- Runenkunst: `enchant_frost_scepter` +levelRequired 25, `enchant_aether_runestaff` levelRequired 20→45

## Struktur-Fixes (brauchen Content = größer, optional/nachrangig)
- **dim_essence-Frühquelle** (s. o., höchste Prio dieser Klasse).
- Juwelierskunst: Zwischen-Tier L24–28 (Lücke L20–34).
- Holzfällen: Füller `cut_duskwood_tree` @L50 (halbiert Lücke L45–55) — braucht neues Log-Item.
- Bogenbau: Holzschild-Linie hat nur 4 Rezepte (L15/25/63/92) → große Löcher.
- Handwerk: `scaled_leather` hat keine Gerb-Aktion (nur Verbrauch).

## Offene Chef-Entscheidungen
- **Kräuterkunde-Legacy-Trio** (`brew_antivenom/minor_healing/greater_healing`): nur re-tiern (minimal-invasiv,
  oben) ODER ganz auflösen (Aktion streichen, Item als Loot der neuen Vertragsrezepte)?
- **Schmieden/Handwerk-Endgame optional trimmen** (Forge/Void-Tiers laufen 2–8× heiß): bei „zu-brutal"-
  Richtung bewusst NICHT nerfen — nur falls exaktes Pinnen auf Ziel gewünscht.
- Angeln ist der gold-ärmste Skill (~18k g/h) — evtl. separater Loot-Pass (kein XP-Thema).

## Umsetzung
Alle P1/P2-`xp`-Änderungen = ein einziger content-dev-Pass (serieller Single-Writer), keine Migration,
danach volle Sim + Guard-Tests grün. Struktur-Fixes (neue Aktionen/Quellen) als separater, kleinerer Pass.
