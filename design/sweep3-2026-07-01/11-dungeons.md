# Sweep 3 — 11 · Dungeons (Kontrolleur / QA)

**Ziel:** Alle Dungeons via `SimPlayer` clearen. Verifizieren: alle Keys droppen (keiner im Shop),
Encounter besiegbar mit passendem Gear, Dungeon-Loot/XP/Gold + `dungeonsCleared` korrekt.

**Ziel erreicht: JA.** Alle **6** Dungeons mit End-Gear (godiron) tot-sicher geräumt — 0 Tode, jede
Welle einmal besiegt, Run sauber beendet. Härtester (`idol_sanctum`, Gate 99) auch mit **allen drei
Stilen** (Melee/Ranged/Magic) geclearet. Keys droppen alle aus Mobs, **kein Key im Shop**. Belohnungen
(Gold/XP/Loot) und `dungeonsCleared` (+1 pro Clear, nicht pro Welle) korrekt.

## SO GESPIELT (headless, echte Engine)
Temporäres `packages/engine/src/dungeon-sweep.test.ts` via `SimPlayer` + echtem `startDungeon`/`advance`
(nach dem Sweep gelöscht). Held: alle 7 Kampf-Skills L99, Attribute 200, Food `cooked_soulfish` (Heal 270).
Gear pro Stil: Melee `godiron_greatsword` + volle godiron-Platte; Ranged `spectral_longbow` +
`godiron_arrow`; Magic `skarn_idol_staff`. Pro Dungeon frischer Held, `startDungeon` → `advance(5s)` bis
`combat.dungeonId === null`.

## Evidence — MELEE-Clear aller 6 Dungeons (confirmed)
| Dungeon | Gate | Wellen | Kills | Tode | Clear | clr+ | Key übrig | Gold (Reward) | Vit-XP (Reward) |
|---|---|---|---|---|---|---|---|---|---|
| goblin_warband | 20 | 5 | 5 | 0 | ✓ | +1 | 0/1 | 887 (320) | 1511 (180) |
| crypt_depths | 70 | 5 | 5 | 0 | ✓ | +1 | 0/1 | 3644 (1200) | 1738 (600) |
| wildwood_hunt | 90 | 4 | 4 | 0 | ✓ | +1 | 0/1 | 2161 (900) | 1837 (950) |
| highland_aerie | 92 | 4 | 4 | 0 | ✓ | +1 | 0/1 | 5889 (3000) | 3906 (3200) |
| wyvern_lair | 96 | 4 | 4 | 0 | ✓ | +1 | 0/2 | 8559 (5000) | 5157 (4500) |
| idol_sanctum | 99 | 4 | 4 | 0 | ✓ | +1 | 0/1 | 16762 (8000) | 9889 (9000) |

- `goldGain ≥ dungeon.gold` immer erfüllt (Reward + Monster-Gold obendrauf).
- `vitXpGain ≥ dungeon.xp` immer erfüllt (Dungeon-XP an `vitality` + Kampf-Vitality-XP).
- `wyvern_lair` verbraucht korrekt **2** `highland_key` (keysPerRun 2) → 0 übrig.
- Loot-Rolls feuern: z.B. crypt `grave_warden_sigil×1, ruby×1, runite_bar×3`; goblin `warband_seal×1`;
  wyvern `wyvern_scale×4`. (idol_sanctum Melee-Seed rollte 0 Completion-Loot = RNG-Pech; Ranged/Magic-Seeds
  droppten `idol_heart×1` → Loot-Pfad funktioniert.)

## Evidence — Stil-Parität am härtesten Dungeon (idol_sanctum, Gate 99)
| Stil | Waffe | Clear | Tode | clr+ | Gold |
|---|---|---|---|---|---|
| Melee | godiron_greatsword | ✓ | 0 | +1 | 16762 |
| Ranged | spectral_longbow + godiron_arrow | ✓ | 0 | +1 | 16479 |
| Magic | skarn_idol_staff | ✓ | 0 | +1 | 16414 |

Alle drei Stile räumen den Endgame-Dungeon sauber → im Praxis-Test besiegbar mit passendem Gear
(bestätigt den Balance-Pass; kein Wall).

## Keys — Drop-Quellen & Shop (confirmed)
| Key | Dungeon(s) | Drop-Quellen (Beispiele) | Im Shop? |
|---|---|---|---|
| warband_key | goblin_warband | borderlands-Goblins 0.005–0.05 (`index.ts:9475…9576`) | **Nein** |
| crypt_key | crypt_depths | crypt-Skelette 0.006–0.07 (`10087…10150`) | **Nein** |
| wildwood_key | wildwood_hunt | wildwood-Mobs 0.005–0.06 (`10307…10362`) | **Nein** |
| highland_key | highland_aerie, wyvern_lair | highlands-Mobs 0.006–0.10 (`10165…10573`) | **Nein** |
| idolhall_key | idol_sanctum | idolhall-Mobs 0.008–0.10 (`10391…10468`) | **Nein** |

Shop-Array (`index.ts:10983–11085`) enthält **keinen** Dungeon-Key; expliziter Kommentar
`index.ts:10030–10031` „Dungeon-Schlüssel bewusst NICHT im Shop (Chef #8)". ✓ Sink intakt: Completion-
Loot enthält keinen Key → Runs kosten echtes Farming (Endgame-Mobs können ihn per Normal-Loot droppen,
z.B. `last_idol` 0.10 → teilweise selbsttragend, gewollt).

## Mechanik-Korrektheit (Code-Review)
- `grantDungeonRewards` (combat.ts:544) wird **nur** bei der letzten Welle aufgerufen →
  `dungeonsCleared[id] += 1` genau 1× pro Clear (nicht pro Welle). Guard: dungeon.test.ts:66-85. ✓
- Tod im Dungeon = harter Run-Abbruch (`onPlayerDefeated`, combat.ts:593-598), kein Auto-Neustart,
  Key bleibt verbraucht = echtes Risiko. ✓
- Wellen-Progression (combat.ts:502-520): `encounterIndex++` bis letzte Welle, dann Reward + `endDungeon`. ✓

## Findings

### [P3][bug] Guard-Tests „gerüsteter Held" rüsten 5 nicht existierende Item-IDs = clearen NACKT
`dungeon.test.ts:45` und `idol-sanctum-clear.test.ts:25` equippen
`godiron_blade/godiron_helm/godiron_body/godiron_legs/godiron_shield` — diese IDs existieren **nicht** in
`content.items` (echte Namen: `godiron_greatsword`, `godiron_fullhelm`, `godiron_platebody`,
`godiron_platelegs`, `godiron_kiteshield`). `addItem` legt sie als **Phantom-Junk** ab (kein Existenz-Check),
`equipItem` (equipment.ts:67) lehnt sie ab — der Rückgabewert wird nicht geprüft → **es wird nichts
ausgerüstet**. Beide Tests bestehen, weil ein nackter L99/L120-Held die Dungeons ohnehin räumt.
**Auswirkung:** rein Test-Hygiene, kein Shipping-Bug — aber die Tests verifizieren NICHT, was ihr Name
behauptet („gerüstet"), tragen 5 tote Referenzen und würden eine Gear-Regression nicht fangen. Ein
Balance-Nerf an unarmed/Basisschaden würde sie als vermeintliches „Gear-Problem" rot färben (irreführend).
**Repro:** `grep godiron_blade packages/engine/src` → 2 Test-Treffer, 0 Content-Treffer.
**Fix:** echte godiron-IDs verwenden ODER Test explizit als „nackt-clearbar" benennen; Equip-Rückgabe
asserten. **Owner:** logic-dev (Engine-Tests).
**suspected-Nebenbefund:** `addItem` fügt unbekannte Item-IDs als Phantom-Stack hinzu statt sie
abzulehnen (inventory.ts:100-133, `maxStackFor` → MAX_STACK bei `undefined?.ammo`). Nur über Test-Code
mit bogus IDs erreichbar (echter Content ist integritätsgeprüft) → niedrige Priorität, aber ein
`content.items[id]`-Guard in `addItem` wäre robuster. **Owner:** logic-dev.

### Keine funktionalen Dungeon-Bugs
Keys, Encounter-Besiegbarkeit, Loot/XP/Gold, `dungeonsCleared`, Key-Verbrauch, Tod-Abbruch: alle korrekt.
Dungeons sind mit End-Gear trivial clearbar — das ist per BRIEFING „bekannt & akzeptiert" (0 echte Walls,
geared clear alles), daher **keine** Balance-Meldung.

## Top 3
1. **Alle 6 Dungeons geclearet, 0 Tode, alle 3 Stile räumen idol_sanctum** — Dungeon-System +
   Stil-Parität im Praxis-Test bestätigt (confirmed).
2. **Keys sauber:** alle 5 droppen aus Mobs, keiner im Shop, Completion-Loot refundet keinen Key
   (Sink intakt) — confirmed.
3. **[P3] Test-Hygiene:** zwei Guard-Tests equippen tote godiron-IDs → clearen nackt statt gerüstet;
   verifizieren die Gear-Aussage nicht. Fix an logic-dev.
