# Sweep 6 — Welle 2: FIX-VERIFIKATION der Nacht-Batches (A/B/C)

**Tester:** W2-Fixverify (Kontrolleur-Rolle) · **Datum:** 2026-07-03 (Nacht-Loop) · **Modus:** headless, read-only
**Harness:** Wegwerf-Tests `packages/engine/src/_tmp_s6w2a_{core,sim}.test.ts` + `packages/persistence/src/_tmp_s6w2a_persist.test.ts` (19 Proben, nach dem Lauf GELÖSCHT — verifiziert, `packages/**` netto unverändert). Alle Zeitangaben = **SPIELZEIT**. Adversarial: NEUE Seeds (91/17/28/77/3/7/13/29/41), EIGENE Szenarien (keine Kopien der Welle-1-Tests). Kein Fix vorgenommen.

## Kurz-Verdikt

**6 von 7 Fix-Claims halten adversarialen Gegenproben stand — ship.** Ein Claim ist nur TEIL-erfüllt (Magier-Craft-Route: Mechanik ✅, aber der FRISCHE Free-Play-Magier bleibt weiterhin 30 h auf dem Starter-Stab, weil Runecrafting im Free-Play nie trainiert wird → W2-F1, P3, Sim-Toolkit, kein Spiel-Bug). Dazu 1× P4 und 3 Beobachtungen. **Kein Release-Blocker.**

## PASS/FAIL-Tabelle

| # | Fix-Claim (Batch) | Verdikt | Kern-Beleg |
| --- | --- | --- | --- |
| 1 | Grabstahl-Craft: `obtainItem(gravesteel_blade)` ehrlich ab mining 22/smithing 24, Seeds **91+17**, <10 Sim-h, Multi-Input balanciert (B) | ✅ PASS | Seed 91: ✅ nach **304 Sim-Min**; Seed 17: ✅ nach **197 Sim-Min**. Kohle-Pfad real benutzt (Barren+Klinge entstanden), frictions=0. Kein 32k-Erz-Berg (Restbestände s. W2-F2). |
| 2 | Ammo-Entkopplung: ehrlicher Ranged Seed **28** verbraucht vorhandene iron_arrows statt copper zu kaufen; bester tragbarer Pfeil im Köcher (20 Sim-h) (B) | ✅ PASS | 400 gegebene iron_arrows: Köcher ab h2 = iron_arrow(0.3), Bestand 400→302→174→**0** verschossen; **0 Munitions-Käufe im ganzen Lauf** (vorher: laufend copper); ab h18 via Fletching wieder 138→200 iron; Ende: Köcher = bester tragbarer Pfeil im Besitz. |
| 3 | Magier-Craft-Route Seed **77**: craftet+trägt iron/steel_staff zeitnah, kein gnarled-Kleben, kein Stab⇄Schild-Pendeln (equipBar) (B) | ◐ TEIL | **Mechanik ✅:** (3b) RC-20-Snapshot: gnarled→**iron_staff @h8** gecraftet+getragen, Schild sauber verdrängt, 0 Pendel, ≤3 Wechsel/12 h. (3c) T4-förmiger pursue (RC-Ziel, 40 h): endet **iron_staff**, rc 20, CL 28 — das Original-Repro (T4 Seed 63: 40 h gnarled trotz freiem Rezept) ist gefixt. **Lücke ❌ (W2-F1):** frischer Free-Play-Magier Seed 77 (playFor 30 h): **rc bleibt 1, gnarled_staff die GESAMTE Laufzeit** — Route strukturell unerreichbar. |
| 4 | Offline-Regen: Buff, der im Offline-Fenster abläuft, heilt bit-identisch zu live (A, T7-F2) | ✅ PASS | Eigenes Szenario (cooked_duskfin_carp 0.2 HP/s, 64 s Rest, hp 3, 25-min-Fenster): one-shot `advance` == 2 143 UNGLEICHE Live-Chunks — hp/mana/rng **bit-identisch**; Heilung real (+12,78 HP; alter Bug: 0); nach Buff-Ende kein Weiter-Regen. End-to-end via `deserialize`-Catch-up: identisch. |
| 5 | Cooldown-Reload: Save bei `cooldownRemainingMs>0` → Load → läuft WEITER; Save-Edit 999999 geklemmt (A, T7-F1) | ✅ PASS | Ehrlicher Kill → Rest 3 500 ms → serialize/deserialize: **3 500 ms erhalten**; Original+Reload ticken synchron herunter, **0 Kills im Restfenster**, beide enden `undefined`. Save-Edit: 999 999→**5 000** (KILL_COOLDOWN_MS-Klemme), −3/"999999"/null→undefined, 1 200→1 200 exakt (persistence index.ts:423-426, :842). |
| 6 | enchant-goldSpent bucht (Achievement zählt) + Auto-Trank-Schwelle >0.9 klemmt (A, T10#3/T8-P4-2) | ✅ PASS | `applyEnchant`: Gold-Abzug == `stats.goldSpent`-Delta; `ach_gold_spent_1000` schaltet über `checkAchievements` frei; `disenchant` bucht ebenfalls (enchant.ts:205/266). Auto-Trank: Save-Edit 0.97 → trinkt NICHT bei 0.93·maxHp, trinkt auf 0.9 (Deckel inklusive); Setter klemmt auf 0.9. |
| 7 | antiRegen: brennendes Ziel (nur burn) regeneriert nicht — inkl. Grabfeuer end-to-end am skeleton_nekro (A+C, T2-F2) | ✅ PASS | Chirurgisch: burn-only + Klinge → **enemyHp exakt unverändert** (Regen 0); frost-only → Regen läuft (kein DoT, korrekt); Waffe OHNE antiRegen + burn → Regen läuft. Grabfeuer **landet real** auf dem Nekro (300 erzwungene Hits: burn-Ticks >10, bleed/poison **0** — resist intakt). E2E Kills/2 h @S40 Seed 3: Klinge **29** vs. blacksteel_sword **13** (+123 %). antiRegen ISOLIERT (Klinge vs. Klon ohne antiRegen, Σ3 Seeds à 2 h): **107 vs. 91 Kills (+17,6 %)** — die Tooltip-Zeile ist am Kern-Ziel jetzt real wirksam. |

## Verifikations-Gates (nach Löschen der Harnesse, Cache umgangen)

| Gate | Ergebnis |
| --- | --- |
| `pnpm typecheck` | ✅ 5/5 Tasks |
| `pnpm test` (`turbo run test --force`, Cache umgangen) | ✅ 2/2 Tasks — engine **635/635** (90 Dateien), persistence **99/99** (2 Dateien) |
| Balance-Sim-Block | ✅ `AUFFÄLLIGKEITEN — Bronze-Baseline (15)` == exakt der **gepinnte akzeptierte Stand** (sim.test.ts:46-61, re-gepinnt 2026-07-02: 2× Gold-only-Thieving + 13× undergeared-only Frühgame-Mobs) · `ECHTE WALLS — auch geared unbesiegbar (0)` ✅ leer · kein Monster kills=0 außerhalb des Pins, keine Skilling-Aktion 0 XP/h |
| `pnpm --filter @hearthforge/client build` | ✅ built in 5.98s |

## Findings

### W2-F1 (P3, Owner: logic-dev — Sim-Toolkit, kein Spiel-Bug)
**Der FRISCHE Free-Play-Magier erreicht die neue Craft-Route strukturell nie.** `craftWeaponUpgradeTask` (sim-realistic.ts:1833) betrachtet nur FREIGESCHALTETE Rezepte (`actionUnlocked`, :1838); die Skilling-Fenster wählen via `pickGatherAction` (:1322-1338) ausschließlich Input-LOSE Gather-Aktionen — **Runecrafting hat keine** (alle RC-Aktionen haben Inputs; forage_dim_essence ist Foraging). Folge: RC bleibt im Free-Play für immer 1 → kein Stab-Rezept schaltet je frei → gnarled_staff klebt (Seed 77: 30 h, rc=1, CL 27, 15 Tode an On-Level-Mobs). Der Batch-Fix greift erst, wenn RC das Rezept-Tier erreicht hat (3b/3c ✅). Magie-Pacing in reinen playFor-Messungen bleibt damit unterzeichnet — genau der T4-#2-Schwanz. Fix-Skizze: Magie-Persona gewichtet RC in der Skilling-Wahl, ODER craftWeaponUpgradeTask leitet bei „Rezept 1-2 Tiers über RC-Level" einen „RC trainieren"-Task ab (Muster der pursue-Trainings-Route).
**Repro:** `new RealisticPlayer(content, {seed:77, style:"magic"})`, `playFor(30 h)` → `equipment.mainhand === "gnarled_staff"`, `level("runecrafting") === 1`.

### W2-F2 (P4, Owner: logic-dev — Sim-Toolkit, Beobachtung aus PASS #1)
**Ziel-Idle übererntet gedeckte Inputs und übercraftet das Ziel-Item.** Seed 91 endet mit **1 933 überschüssigem gravesteel_ore und 9 Klingen** (Ziel: 1); Seed 17 mit 1 475 ore + 1 306 coal + 17 Barren. Der 32k-Berg ist weg und das Ziel fällt schnell — aber lange Idle-Strecken fahren weiter die erste Quelle, obwohl der Bedarf längst gedeckt ist (Deckungs-Skip greift offenbar nur bei der Rekursions-WAHL, nicht als Idle-Stopp). Verzerrt Ökonomie-Ko-Messungen in Sweep-Läufen; Spiel unberührt. Beim nächsten Toolkit-Anfassen: Idle-Besitzer-Strecke beenden/rotieren, sobald `have ≥ qty×3` für ALLE Inputs bzw. das Ziel-Item vorliegt.

### Beobachtungen (kein Handlungsbedarf)
- **W2-O1:** Ehrlicher Ranged (Seed 28) schießt h6-h16 crude/leer, statt iron im Shop nachzukaufen — korrekt nach Heuristik (`AMMO_TOTAL_LOW` zählt ALLE Sorten; crude-Bestand hielt die Schwelle), Fletching füllt ab h18 iron nach. Verhalten, kein Fix-Defekt.
- **W2-O2:** Leergeschossener Köcher behält die Sorte bei `ammoCount 0` (h14-h16 „iron_arrow" mit 0) — engine-bekannt; die UI-Seite ist T8-P3-1 (bereits gefixt: Tooltip zählt nur bei ammoCount ≥ 1).
- **W2-O3 (positiv):** Der Grabfeuer-Burn (content index.ts:4923) + antiRegen-auf-jeden-DoT (combat.ts:1550-1561) lösen T2-F2 messbar: +17,6 % Kills isoliert am skeleton_nekro — das „tote Tooltip-Versprechen" ist behoben, ohne die resist-Liste des Nekro anzufassen.

## Empfehlung (eine Zeile)

Batches A/C vollständig verifiziert, Batch B zu 2,5/3 — ship; W2-F1 (Magie-Free-Play-RC) als P3 in die Toolkit-Queue, W2-F2 als P4-Notiz.
