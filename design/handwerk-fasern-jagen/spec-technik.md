# Fasern, Stoff und Jagen: technische Spezifikation (1.2.0)

> Stand 27.08.2026, bindend für content-dev, logic-dev, ui-dev. Fachliche Quelle `konzept.md` (J1–J7 entschieden).
> Typen-Vertrag in `packages/shared/src/index.ts`, Abschnitt „Jagen" (von Claude vorab angelegt, SAVE_VERSION 85).
> IDs sind zugleich Dateinamen der Mira-Assets (`CODEX/work/2026-08-27-fasern-jagen-assets/`).

## 1 Content (content-dev)

### 1.1 Items (type material, stackable, icon 🧵 bzw. 🌱/🪱)

| ID | EN / DE | value |
|---|---|---|
| `fiber_nettle` | Nettle Fiber / Nesselfaser | 4 |
| `fiber_flax` | Flax / Flachs | 9 |
| `fiber_thornhemp` | Thornhemp / Dornhanf | 18 |
| `fiber_ghostsilk` | Ghostsilk / Geisterseide | 36 |
| `fiber_starflax` | Starflax / Sternflachs | 70 |
| `nettle_seed`, `flax_seed`, `thornhemp_seed`, `ghostsilk_seed`, `starflax_seed` | Nettle Seed / Nesselsaat … | 2 / 5 / 10 / 20 / 40 |
| `cloth_nettle` | Nettlecloth / Nesselstoff | 15 |
| `cloth_linen` | Linen / Leinen | 32 |
| `cloth_thornlinen` | Thornlinen / Dornleinen | 65 |
| `cloth_ghostweave` | Ghostweave / Geistertuch | 130 |
| `cloth_starweave` | Starweave / Sternweb | 250 |
| `bait_worm` | Worm Bait / Wurmköder | 1 |

Beschreibungen ein Satz, Ashen-Iron-Ton, ≤ 1 Gedankenstrich. Overlays ×5 für alle Namen/Beschreibungen.

### 1.2 Sammeln: Kategorie `forage_fibers` (EN "Fibers" / DE "Fasern")

| Aktion | Stufe | Loot |
|---|---|---|
| `forage_nettle` | 1 | fiber_nettle 0.65 (1–2), nettle_seed 0.15 |
| `forage_flax` | 20 | fiber_flax 0.65 (1–2), flax_seed 0.14 |
| `forage_thornhemp` | 40 | fiber_thornhemp 0.62 (1–2), thornhemp_seed 0.13 |
| `forage_ghostsilk` | 60 | fiber_ghostsilk 0.60 (1–2), ghostsilk_seed 0.12 |
| `forage_starflax` | 80 | fiber_starflax 0.58 (1–2), starflax_seed 0.12 |

Dauer und XP wie der Kräuter-Knoten derselben Stufe (C-600-Kurve, Muster `forage_marshroot` … `forage_voidheath`).

### 1.3 Anbau (crops)

`nettle` T1 L2 (600 000 ms), `flax` T2 L22 (1 200 000), `thornhemp` T3 L44 (2 400 000), `ghostsilk` T4 L64 (4 800 000),
`starflax` T5 L84 (9 600 000); seedItem = jeweilige Saat, yieldItem = jeweilige Faser, Ertrag 6–9, XP wie die Pflanze
derselben Stufe (Muster ashroot/bloodgrain/verdantcap/violetbloom/voidreed).

### 1.4 Handwerk: Kategorie `weave` (EN "Weaving" / DE "Weben")

`weave_nettle` L1 (3 fiber_nettle → cloth_nettle), `weave_linen` L20, `weave_thornlinen` L40, `weave_ghostweave` L60,
`weave_starweave` L80; Dauer/XP wie `tan_leather`/`cure_leather`/… derselben Stufe. Dazu `twist_nettle_cord` L1
(2 fiber_nettle → bowstring ×1, Kategorie der bisherigen Sehne, XP wie `twist_rawhide_cord`).

### 1.5 Roben auf Stoff (26 Rezepte, Mengen wie heute)

| Rezepte | Leder heute → Stoff neu |
|---|---|
| craft_apprentice_robe, _legs, craft_dimweave_hood, craft_dimweave_robe | cured_leather → cloth_nettle |
| craft_frost_robe_body (hardened_leather), craft_frost_robe_legs (cured_leather), craft_ember_robe_hood/_body/_legs (scaled_leather), craft_silk_mantle (cured_leather) | → cloth_linen |
| craft_aether_hood/_robe_body/_robe_legs, craft_arcane_cowl/_robe_body/_robe_legs (scaled_leather) | → cloth_thornlinen |
| craft_duskweave_cowl/_robe_body/_robe_legs (studded_leather), craft_runewoven_cowl/_robe_body/_robe_legs (warhide) | → cloth_ghostweave |
| craft_godspark_vestment, craft_starweave_vestment, craft_voidweave_vestment (warhide) | → cloth_starweave |

`craft_frost_pelt_hood` bleibt (Pelz). Die Lehrlings-Hut-Rezeptur (`craft_apprentice_hat`, cured_leather) ebenfalls auf cloth_nettle.

### 1.6 Angeln

`dig_bait` L1, 2 500 ms, xp 1, Kategorie der Stufe-1-Fische, loot bait_worm 1.0 (1) + bait_worm 0.2 (1). Kein Werkzeug-Bonus nötig.

### 1.7 Skill Jagen und Gebiete

`skills.hunting = { id: "hunting", name: { en: "Hunting", de: "Jagen" }, trains: "dex" }`.
`huntingZones` (Typ `HuntZoneDef[]`): zoneId, levelRequired, trapMs, xp je Fang (C-600: Ziel-XP/h(levelRequired) × trapMs / 3 600 000):

| zoneId | Stufe | trapMs |
|---|---|---|
| pastures | 1 | 300 000 |
| borderlands | 10 | 480 000 |
| ashfields | 20 | 600 000 |
| blackthorn | 30 | 900 000 |
| crypt | 40 | 1 200 000 |
| wildwood | 50 | 1 500 000 |
| coast | 60 | 2 100 000 |
| slagpit | 70 | 2 700 000 |
| highlands | 80 | 3 300 000 |
| idolhall | 90 | 3 600 000 |

Content-Guard: jede zoneId existiert, Stufen aufsteigend, trapMs aufsteigend, xp > 0; die Tabelle deckt alle Zonen außer slayer_tower.

## 2 Shared (liegt vor)

`HUNT_TRAP_SLOTS = 6`, `HUNT_SLOT_LEVELS = [1, 10, 25, 45, 65, 85]`, `HUNT_LOOT_ROLLS = 5`, `HUNT_CATCH_BASE = 0.7`,
`HUNT_CATCH_PER_LEVEL = 0.005`, `HUNT_CATCH_CAP = 0.95`, `HUNT_TRAPPABLE_FAMILIES = ["beast", "humanoid"]`,
`BAIT_ITEM_ID = "bait_worm"`, `HuntTrap`, `HuntCatch`, `HuntZoneDef`, `GameState.huntTraps: HuntTrap[]`, `GameState.huntCatchSeq`,
`PlayerStats.huntCatches`, `ContentDB.huntingZones?`, `OfflineSummary.huntCatches?`, `defaultHuntTraps()`, `huntTrapSlotsForLevel(level)`.

## 3 Engine (logic-dev), `packages/engine/src/hunting.ts`

```ts
huntTrapSlots(state): number                                   // nach Jagen-Level (HUNT_SLOT_LEVELS)
huntZoneDef(content, zoneId): HuntZoneDef | null
huntableMonsters(state, content, zoneId): MonsterId[]         // Familie in HUNT_TRAPPABLE_FAMILIES, !dungeonOnly, kein Boss/Champion,
                                                              // zone === zoneId, state.monsterKills[id] ≥ 1
type HuntSetReason = "ok"|"no_slot"|"zone_locked"|"level"|"nothing_huntable"|"no_bait"|"busy"
huntSetReason(state, content, slot, zoneId): HuntSetReason
setHuntTrap(state, content, slot, zoneId, autoRebait): HuntSetReason   // zieht 1 Köder (Inventar, sonst Lager), remainingMs = trapMs
clearHuntTrap(state, slot): void                              // Köder verfällt (wie Beet leeren)
setHuntAutoRebait(state, slot, on): void
huntCatchChance(state, content, zoneId): number               // clamp(HUNT_CATCH_BASE + (lvl - zoneLevel) * HUNT_CATCH_PER_LEVEL, 0, HUNT_CATCH_CAP)
tickHuntTraps(state, content, dtMs): void                     // in tick.ts direkt nach tickFarmPlots; offline == online; je Falle:
                                                              // remainingMs -= dt; bei ≤ 0: Wurf Chance (nextFloat), bei Erfolg Monster
                                                              // gleichverteilt aus huntableMonsters (nextInt), HUNT_LOOT_ROLLS Beute-Würfe
                                                              // über den normalen Monster-Loot-Pfad (rollMonsterLoot o.ä., Rare-Drop-Regel,
                                                              // KEINE Champion-Uniques, KEIN Pet-Wurf, KEINE Kill-Zähler/Slayer/Achievements
                                                              // außer stats.huntCatches), Gold 5×, XP-Gutschrift hunting (Level-up-Pfad),
                                                              // lastCatch mit seq, dann Auto-Rebait (Köder da → neu, sonst leer).
                                                              // Rest-Übertrag wie tickFarmPlots (Schleife "solange remaining ≤ 0").
```

RNG: Würfe über `state.rng` in fester Reihenfolge (Chance, dann Monster, dann Beute). Ohne `content.huntingZones` inert.
Tests: Determinismus/Offline == Online (Muster farming), Slots nach Level, Zone-Gates, Köder-Verbrauch, 5 Würfe, keine Kill-Zähler,
Sanitize/Migration 84→85 (persistence), Vault-Fixture `v85-synthetic-1.2.0.json`, OfflineSummary.huntCatches.

## 4 Client (ui-dev)

- NavView/Seite `hunting` (Sidebar hinter Angeln, Label nav.hunting „Jagen", Emoji 🪤 bis `sidebaricon_hunting.webp`), `HuntingPage`
  nach dem Muster `FarmPage`: 6 Plätze als Karten (gesperrte mit „ab Stufe X"), je Karte Gebiet-Auswahl (nur freigeschaltete Zonen
  mit huntableMonsters > 0, Zonen-Kulisse `.card.webp` als Hintergrund), Restzeit-Balken, Köder-Zähler, Auto-Erneuern-Schalter,
  letzter Fang (Monster-Art + Beute-Chips), Knöpfe `.btn-iron` „Falle stellen" / „Leeren". Zustand-Bilder `assets/ui/hunting/trap_empty|set|caught.webp`.
- Jagdbuch (rechte Spalte): je Gebiet die fangbaren Monster mit Häkchen „besiegt" (monsterKills), Fangchance, Fallenzeit, Beutezeilen (Wiki-Daten).
- Offline-Bericht: Zeile „Jagd: Eber ×3, Ziege ×1" aus OfflineSummary.huntCatches; Toast bei Fang online (Rare-Toast-Regeln).
- Skills-Übersicht/Statistik/Charakterbogen: neuer Skill erscheint überall, wo Skills aufgezählt werden (prüfen: skills-overview, Statistik, Meisterschaft, Erfolge-Filter).
- i18n ×7 (`hunting.*`, `nav.hunting`), Größen-Floor + Umbruch, 1366×768 ohne Überlauf.

## 5 Abnahme (Claude)

Typecheck 0, alle Suiten grün, Vault-Guard v85, Sim-Läufe (Personas mit Jagen), Screenshots Jagen-Seite 1920/1366 de+ru,
Handwerk-Seite Weben, Sammeln-Seite Fasern; Alt-Save 84 lädt mit leeren Fallen.
