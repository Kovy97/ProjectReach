# Sweep 3 — 10 Completionist (Sets / Pets / Achievements)

**Rolle:** Kontrolleur (QA) · **Ziel:** Completionist-Pfad verifizieren (SimPlayer + Content-Audit)
**Datum:** 2026-07-01 · **Methode:** Content-Audit + eigenes Engine-Treiber-Testskript (angelegt, ausgeführt, gelöscht)

## Ziel erreicht? — JA (mit 1 P3-Nit)

Alle vier expliziten Verifikationsziele **confirmed**:

| Ziel | Ergebnis | Evidence |
|---|---|---|
| witherling dropt über Ernte-Pfad (ach_pets_all erreichbar) | ✅ confirmed | `farming.ts:115` `tryPetDrop(skill:"farming")`; `pet-integrity.test.ts:284/298` (2 dedizierte Ernte-Pfad-Tests grün) |
| Alle 21 Pets vorhanden + erhältlich | ✅ confirmed | 21 Pet-Defs; 3 Drop-Pfade verdrahtet; `ach_pets_all` count=21 |
| 30 Set-Einträge (29 distinkte Sets) vollständig + Boni | ✅ confirmed | `content.sets.length=30`, distinct=29; jeder Eintrag hat non-empty bonus + echte Pieces |
| voidweave = bestes Magie-Set (>godspark) | ✅ confirmed | full-loadout `magicDamage` **181.40 vs 133.20**; Set-Bonus auf jeder Achse > godspark |

## Verifikations-Gates (headless)

- **Guard-Tests grün:** pet-integrity (21), set-bonus (3), achievements (11), content-integrity (4), wiring-audit (2), status-coverage (3) + eigenes Completionist-Audit (10). Alle passed.
- **client build:** ✅ `built in 4.92s`.
- **typecheck:** ❌ ABER **fremd-verursacht** — ausschließlich verwaiste Scratch-Test-Dateien anderer, parallel laufender Sweep-Agenten (`zz-catalog-dump.test.ts`, `zz-gear-sweep.test.ts`, u.a., erstellt 18:16–18:19). Kein Produkt-/Completionist-Code betroffen; nicht meine Dateien, unangetastet gelassen. Koordinations-Artefakt, kein Spiel-Bug. **CEO-Aktion:** Sweep-Agenten müssen ihre `zz-*.test.ts`/`*-sweep.test.ts` nach dem Lauf löschen (Briefing-Regel „lösch es danach wieder").

## Detail-Belege

### Pets (21) — alle erreichbar
- 6 Gather/Thieving (woodcutting/mining/fishing/**farming**/foraging/thieving), 8 Craft (smithing/cooking/fletching/leatherworking/jewelcrafting/runecrafting×2/herblore), 7 Combat.
- **Drei Drop-Pfade verdrahtet** (keine „defined-but-never-applied"-Lücke):
  - Skilling-Aktionen → `tick.ts:193`
  - Farming-Ernte → `farming.ts:115` (witherling; Farming hat KEINE ActionDef → nur dieser Pfad kann es droppen)
  - Monster-Kill → `combat.ts:497`
- `ach_pets_all` count=21 = exakt erreichbar (kein Slack; nur mit allen 21).

### Sets (30 Einträge / 29 distinkt)
- 10 Metall + 7 Magie-Roben + 9 Leder + 1 Apprentice + 1 Godgem-Schmuck + Slayer (2pc + 4pc = 2 Einträge, geteilte 4 Pieces).
- Jeder Eintrag: non-empty `bonus`, alle `pieces` existieren als echte Items (set-bonus.test + eigenes Audit).
- `ownedSetsCount(alle Pieces)=30` (Slayer zählt doppelt, 2pc+4pc). `ach_sets_all` count=29 → **erreichbar**.

### voidweave > godspark (bestes Magie-Set) — confirmed
- Pro-Piece `magicDamage`: voidweave 20/32/22/20/20 vs godspark 14/23/16/14/14 (jede Position höher).
- Set-Bonus voidweave `{magicDamage 22, accuracy 22, critChance .05, critDamage .18}` **strikt > ** godspark `{17, 18, .04, .15}` auf JEDER Achse.
- Voller Loadout via `computeStats` (inkl. Set-Bonus + int/wis-Modifikatoren): **magicDamage 181.40 vs 133.20 (+36 %)**, maxHp 508 vs 442, crit 0.215 vs 0.175.
- Magie-Roben-Leiter monoton: `2 < 6 < 8 < 11 < 13 < 16 < 17 < 22` (apprentice→voidweave). Inversion sauber raus.

## Findings

### [P3][bug] `ach_sets_all` (count 29) durch Slayer-Doppelzählung 1 Set zu locker — suspected/minor
- **Repro:** `ownedSetsCount` (`achievements.ts:53`) iteriert über 30 Set-Einträge; `slayer_set` und `slayer_set_4pc` teilen dieselben 4 Pieces → Besitz der 4 Slayer-Teile gibt **+2**. Max-Wert = 30, aber es gibt nur 29 distinkte physische Sets.
- **Erwartet:** „Meister aller Sets" verlangt ALLE Sets. **Tatsächlich:** count=29 ist erreichbar mit Slayer (+2) + 27 anderen distinkten Sets = 29 → man kann das Achievement freischalten, während **1 nicht-Slayer-Set fehlt**.
- **Evidence:** eigenes Audit-Log `SETS ownedSetsCount(all pieces)=30 achReq=29`; `distinctPhysical=29`.
- **Empfehlung (Zahl):** `ach_sets_all.condition.count: 30` (= Max, erzwingt echte Voll-Sammlung inkl. Slayer). Beschreibungstext ggf. „all sets" statt „29" belassen. Alternativ Slayer-Breakpoints in `ownedSetsCount` deduplizieren (dann count 29 korrekt). **Owner:** Logic-Dev (Achievement-Condition) bzw. Content-Dev.
- **Hinweis:** Blockiert Completionist NICHT — Achievement ist erreichbar und verlangt Beinah-Voll-Sammlung. Reines Genauigkeits-Nit.

### [Info] typecheck-Gate rot durch parallele Sweep-Scratch-Dateien
- Siehe Gates oben. Kein Produkt-Bug; CEO-Hinweis zur Sweep-Hygiene.

## Top-3
1. **Completionist-Pfad ist geschlossen & erreichbar** — 21 Pets (3 Drop-Pfade live), 29 Sets, alle Sammel-Achievements freischaltbar. Ship-tauglich.
2. **voidweave ist eindeutig das beste Magie-Set** (+36 % magicDamage vs godspark, jede Achse dominiert) — Inversion sauber gefixt.
3. **1 P3-Nit:** `ach_sets_all` count 29 → auf 30 setzen (Slayer-Doppelzählung), sonst 1 Set „gratis".

## Empfehlung: **ship** (P3-Nit optional als fix-then-ship, nicht blockierend)
