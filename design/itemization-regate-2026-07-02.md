# Itemization 2.0 FINAL — RE-GATE nach Paritäts-Fix + Waffen 2.0 — Messbericht

**Rolle:** Kontrolleur (QA) · **Datum:** 2026-07-02 · **Modus:** headless, read-only (Temp-Messskripte via SimPlayer/RealisticPlayer/Engine, danach gelöscht; `packages/**` netto unverändert)
**Gegenstand:** kompletter Apply von `design/itemization-parity-fix.md` (Waffen 2.0 min–max/Tempo absolut/Effekt-Palette, Rüstung=strikte Attribut-Leitern, Chase-Items, Affixe→modifiers, Skill-Boosts, kein Natur-Regen, 5s-Kill-Cooldown, Munitions-Entkopplung, Auto-Trank, SAVE_VERSION 49).
**Methodik:** EXAKT wie `design/itemization-gate-2026-07-02.md` / Fix-Spec §0 (SimPlayer, alle 7 Kampf-Skills = Tier-Level, on-tier craftbares Gear: Melee=Metall 6 Teile+Schwert · Ranged=Leder 5 Teile+Shortbow+Pfeile · Magie=Stoff 5 Teile+Stab; Craft-Skills nur fürs Equip-Requirement; cooked_soulfish/Auto-Eat T0; Default-Stances; 30 Sim-Min je Zelle, Seed 7; Stabilitätszellen 60 Min × Seeds 7/13/29). **effDPS = MonsterHP / (Ø s/Kill − 5 s)** — der Kill-Cooldown ist jetzt 5 000 ms (`KILL_COOLDOWN_MS`); die Spec-§0.1-Zahlen wurden mit −3 s gerechnet. Gegenprobe: unter der −3s-Arithmetik reproduziert dieser Harness die §0.1-Werte punktgenau (z. B. idol_warden melee 18.06 = exakt §0.1; L22 bull_boss 3.29/2.95/3.34 vs §0.1 3.34/2.90/3.39) → identische Methodik bestätigt. Alle Zeitangaben = SPIELZEIT.

## VERDIKT: **TRIM** — die Kern-Reparatur ist bestätigt (alle Paritäts-Zellen der Gate-Methodik im 0.90–1.10-Band, EHP-Anker exakt getroffen, 0 geared-Walls, Chase & Effekte funktionieren end-to-end). Drei gezielte Trims vor „fertig": (T1) Fast-Melee-Spitze (godiron/aetherium **dagger** +47 % über sword am BiS → Best-Weapon-Parität kippt auf melee 1.13–1.18 / magic 0.88), (T2) Enchant-Uplift-Schiefstand (ranged Ø 9.4 % vs magic Ø 3.2 %, Spread 6.2 pp > 5 pp-Ziel), (T3) Sim-Toolkit-gearScore blind für damageMin/Max (ehrliche Läufe tragen Starter-Waffen bis zum Schluss). KEIN neues Re-Spec nötig — die Gate-FAIL-Ursache (Stoff-DEX/LCK-Rider + Stab-Tempo-Doppelzählung) ist nachweislich beseitigt.

---

## Headless-Gates

| Gate | Ergebnis |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm exec turbo run test --force` | ✅ engine **89 Files / 614 Tests** + persistence, alle grün (Cache umgangen) |
| `pnpm --filter @hearthforge/client build` | ✅ exit 0 |
| Balance-Sim: ECHTE WALLS (geared) | ✅ **(0)** |
| Balance-Sim: AUFFÄLLIGKEITEN Bronze-Baseline | ⚠ **(15)** — Gate-Stand war (21), alter akzeptierter Snapshot (12). 2 bekannte Gold-only-Thieving-Aktionen + 13 undergeared kills=0-Mobs (bull_boss L15, goblin_butcher/felmagician/stormcaller/warlock L26–30, dust_vulture L34, mire_crawler L38, pitch_beetle L42, ash_tyrant L45, rootling_grunt/gimp L45–48, ashfield_wraith L38, tower_skeleton_archer L38). Alle per Chef-Prinzip akzeptierte Undergeared-Walls — Gegenprobe: dust_vulture/pitch_beetle etc. sind on-tier in den §0-Zellen klar killbar. **Neu pinnen (§8.2), Ziel ≤ 12** → T4. |
| Skilling-Aktionen 0 XP/h | ✅ keine (nur die 2 bekannten Gold-only-Thieving-Aktionen) |
| UI-Crash-Gate | ✅ App-Root rendert nur `Root` + `ItemTooltipOverlay` (safe `useGameStateMaybe`, `ItemTooltip.tsx:587,736,1005`); `GameStats`/`Toasts`/`PetCelebration`/`DeathPopup`/`OnboardingGuide` alle in `MainLayout` (`apps/client/src/renderer/App.tsx:301,308-311`); `EnchantingPage` nur als Page im Playing-Layout |
| Verdrahtung Effekt-System | ✅ ALLE 26 im Content genutzten Effekt-Kinds (execute, momentum, eagleEye, cooldownOnKill, thorns, giantSlayer, desperation, bounty, firstBlood, firstStrike, everyNth, critBurst, vengeance, mana/healOnKill, overkillCarry, antiRegen, manaDrain, plaguebearer, gutter, frostbite, catalyst, surplus, ammoSaver, luckyStrike, packLeader) werden von combat.ts gelesen (`fx.*`); doubleStrike-Hook liegt für späteren Content bereit; keine „defined but never read"-Felder gefunden |
| i18n | ✅ `weaponEffect.<kind>` 33 Templates × en+de (66 Einträge, inkl. fallback) in `translations.ts` |
| CHASE_ITEMS-Guard | ✅ Ausnahmeklasse existiert (`sim-consistency.ts`, `itemization-guards.test.ts`), Guards grün |
| Save-Migration | ✅ SAVE_VERSION 49 (Auto-Trank-Default + Natur-Regen-Entfernung ohne State-Feld, `shared/src/index.ts:46`); Waffen 2.0 bewusst OHNE Bump (Content-Shape, Ids stabil) — persistence-Tests grün |

---

## Kriterium 1 — Parität ±10 % (effDPS, Kill-Cooldown 5 s herausgerechnet): ✅ **confirmed**

Alle Zellen `deaths=0`. Ratio = Zelle / Stil-Ø je Mob.

| Bracket (Mob, HP) | melee | ranged | magic | Ratio m/r/g |
|---|---:|---:|---:|---|
| L22 Steel (bull_boss, 67) | 3.65 | 3.23 | 3.71 | 1.033 / 0.917 / 1.050 ✓ |
| L22 Steel (goblin_butcher, 39) | 3.52 | 3.08 | 3.52 | 1.043 / 0.913 / 1.043 ✓ |
| L40 Mithril (pitch_beetle, 67) | 5.52 | 4.74 | 5.37 | 1.059 / 0.909 / 1.031 ✓ |
| L40 Mithril (dust_vulture, 36) | 4.69 | 4.53 | 4.91 | 0.996 / 0.961 / 1.043 ✓ |
| L60 Runite (thorn_wolf, 67) | 9.14 | 8.63 | 9.46 | 1.007 / 0.950 / 1.042 ✓ |
| L60 Runite (bramble_witch, 85) | 8.71 | 8.82 | 9.61 | 0.963 / 0.975 / 1.062 ✓ |
| L90 Aetherium (wild_stag, 77) | 14.41 | 14.57 | 15.23 | 0.978 / 0.989 / 1.034 ✓ |
| L90 Aetherium (reef_drowned, 69) | 13.05 | 13.65 | 14.11 | 0.960 / 1.003 / 1.037 ✓ |
| **BiS L99** idol_warden (60 Min × 3 Seeds) | 27.24 | 32.56 | 29.10 | 0.919 / **1.099** / 0.982 ✓ knapp |
| BiS L99 aether_wraith | 29.60 | 31.25 | 31.13 | 0.965 / 1.019 / 1.015 ✓ |
| BiS L99 scale_skarn | 28.89 | 32.65 | 31.35 | 0.933 / 1.054 / 1.012 ✓ |
| BiS L99 last_idol | 27.92 | 28.63 | 29.12 | 0.978 / 1.002 / 1.020 ✓ |

**Alle 36 Zellen im 0.90–1.10-Band** (schlechteste: idol_warden ranged 1.099 am Band-Rand — bei HP 110 stark hit-quantisiert; die 5s-Arithmetik verbreitert Ratios gegenüber der §0.1-3s-Arithmetik, unter der dieselbe Zelle bei ~1.07 liegt). Die Gate-FAIL-Ursache (Tier-aufwärts wachsende Magie-Decke +33…+40 %, Melee-Boden −27…−38 %) ist **beseitigt** — Magie liegt jetzt überall bei 0.98–1.06.

⚠ **ABER — Best-Weapon-Decke (T1, über die definierte Methodik hinaus):** Die Parität oben ist gegen die REFERENZ-Waffen (sword/shortbow/staff) gemessen. Mit der tatsächlich besten Craft-Waffe je Stil (30 Min × 3 Seeds, BiS):

| Boss | melee best (godiron_dagger) | ranged best (godiron_longbow) | magic best (godiron_wand) | Best-Weapon-Ratio m/r/g |
|---|---:|---:|---:|---|
| idol_warden | **41.02** (sword 27.29, +50 %) | 35.95 | 31.88 | **1.131** / 0.991 / **0.879** ❌ |
| last_idol | **38.55** (sword 27.82, +39 %) | 30.59 | 29.12 | **1.176** / 0.933 / **0.892** ❌ |

Ursache (strukturell, wächst mit dem Tier): der CHARAKTER-Schadensanteil C (am BiS ~⅔ des Treffers) skaliert frei mit dem Waffentempo (C je Schlag), während die §3.1-M-Linien nur den WAFFEN-Anteil je Typ preisen — dagger 2.30 s bekommt +24 % Charakter-DPS gegenüber sword 2.85 s geschenkt (dazu lck 4). Dasselbe Muster war schon vor der Itemization dokumentiert (parity-final: „Melee nimmt ab L55 Dolch+Schild", L99 1.17×). **Hebel T1:** Spitzen-M/Tempo der schnellen Melee-Typen (dagger, sekundär scimitar) ab aetherium re-eichen (z. B. godiron_dagger Tempo 2.30→~2.50 s ODER M ×~0.8); **Sollwert: BiS-Best-Weapon je Stil 0.90–1.10×Ø** — das hebt zugleich den magic-Floor (0.88) an, weil der Ø sinkt. Owner: balance-designer (Zahlen) → content-dev.

## Kriterium 2 — „Voll verzaubert" (T3-Rune je Stil auf BiS-Waffe): ⚠ **teilweise** (Band hält, Spread-Ziel verfehlt)

60 Min × Seeds 7/13/29, Uplift = effDPS(T3)/effDPS(blank) − 1:

| | idol_warden | aether_wraith | scale_skarn | last_idol | **Ø je Stil** |
|---|---|---|---|---|---|
| melee (Scharf T3, str 10) | +12.8 % | +0.0 % | +9.7 % | +0.4 % | **+5.7 %** |
| ranged (Jägerisch T3, dex 1 + lck 4) | +3.1 % | +13.3 % | +8.5 % | +12.6 % | **+9.4 %** |
| magic (Arkan T3, int 10) | +3.1 % | +0.9 % | +3.4 % | +5.2 % | **+3.2 %** |

- ✅ Cap ~15 %: eingehalten (max. Einzelzelle 13.3 %).
- ✅ Parität verschiebt sich, bleibt aber im Band: T3-Ratios 0.921–**1.101** (aether_wraith ranged 1.101 marginal am Rand).
- ❌ **Uplift-Spread der Stil-Ø: 6.2 pp (9.4 − 3.2) > 5-pp-Ziel.** Die Einzel-Boss-Streuung (0–13 %) ist Hit-Quantisierung (BiS-Kills = 2–3 Schläge: +10 str spart einen Schlag oder nicht — aether_wraith melee blank/T3 identische Kill-Zahl), aber der Stil-Ø-Schiefstand ist seed-stabil: Jägerisch (dex-Tempo + lck-Krit wirken quantisierungs-unabhängig) schlägt Arkan (int-Flat versickert im Schlag-Raster). **Hebel T2:** affix_hunter T3 kühlen (lck 4→3 oder dex-Zeile streichen) und/oder affix_arcane T3 wärmen; **Sollwert: Stil-Ø-Spread < 5 pp.** Owner: balance-designer.

## Kriterium 3 — 0 geared-Walls: ✅ **confirmed**

- **boar L10, frischer Melee** (Skills 1, rusty_sword + leather_body + wooden_shield, cooked_trout): **24 Kills / 20 Sim-Min (72/h), 0 Tode** (50 s/Kill; Gate-Referenz 26/78 mit 3s-Cooldown — Delta = die 2 s Mehr-Cooldown je Kill). ✓
- **4 Endbosse × 3 Stile, BiS:** alle 12 Zellen killbar, **0 Tode** — blank UND voll verzaubert (24 Zellen), zusätzlich in allen 60-Min-Stabilitätsläufen (72 weitere Zellen). Kill-Zahlen 147–217 je 30 Min. ✓

## Kriterium 4 — EHP-Anker (kein Natur-Regen): ✅ **confirmed** (alle drei Anker exakt getroffen)

| Referenzpunkt | NEU (hp/def/eva → EHP) | Basis | **Ratio** | Anker (±15 %) |
|---|---|---|---:|---|
| L40 Mithril-Melee vs pitch_beetle | 88.7 / 15.6 / 6.9 → **324** | Gate 303 | **1.071** | 1.07 ✓ |
| L90 Aetherium-Melee vs wild_stag | 197.7 / 35.3 / 13.0 → **1575** | Gate 1575 | **1.000** | 1.00 ✓ |
| BiS-Melee vs idol_warden | 240.4 / 42.8 / 15.8 → **2264** | ALT-rekonstruiert 2180¹ | **1.039** | 1.04 ✓ |

¹ Gate-Referenz aus den ALT-Modifier-Spalten der Fix-Spec §4 rückgerechnet (Δ NEU−ALT am getragenen Melee-BiS: con +2, dex +1; def/eva/hp-Formeln sind von diesem Pass unberührt).

Empirie („realer Spieler bereitet sich vor"): Natur-Regen bestätigt ENTFERNT (hp 5 → 5 nach 10 Sim-Min idle); L40-Melee MIT Auto-Eat-Food 30 Min gegen pitch_beetle **0 Tode**; ohne Food trägt am L40-on-tier-Mob der intrinsische Melee-Lifesteal (kein Tod in 2 h — Stil-Identität, deckt sich mit Gate-Fußnote¹ dort).

## Kriterium 5 — Effekt-Stichproben (7 end-to-end): ✅ funktional · ⚠ Budget (Scimitar-Spitze → in T1 enthalten)

| Effekt | Messung | Ergebnis |
|---|---|---|
| momentum (aetherium_scimitar) | effectCounters tick-genau | ✅ Stapel +1 je Treffer (0 Sprünge >+1), Reset bei Gegnerwechsel beobachtet; max 2 Stapel (Mob stirbt in 2–3 Schlägen — Cap 10 bindet am Boss nicht) |
| eagleEye (aetherium_longbow) | Kampf-Log je Begegnung | ✅ **91/91** Begegnungen: 1. Treffer = Krit; spätere Krit-Rate 22.8 % (normal) — kein Doppel-Zünden |
| execute (boneblade) | Ø Non-Krit-Schaden <18 % vs >25 % Ziel-HP | ✅ Faktor **1.262** (Soll ~1.25; n=71/388) |
| thorns (thornmail_gauntlets) | Koinzidenz erlittener Treffer ↔ Rückschaden | ✅ **82/82** mit 2-Schaden-Rückzahlung im selben Tick; Kontrolle ohne Handschuhe 0/72 |
| cooldownOnKill (stagstride_longbow) | cooldownRemainingMs nach Kill | ✅ exakt **3000 ms** (n=35); Kontrolle steel_longbow 5000 ms (n=32) |
| Status- + Enchant-Proc-Stacking | enemyEffects tick-genau | ✅ Flamm-Rune T3 auf effektloser Waffe zündet end-to-end (burn 625 Ticks aktiv); burn-Stab + Flamm-Rune: max **1** gleichzeitige burn-Instanz (Refresh, kein Doppel-Ticken); frost-Wand + Flamm-Rune: burn+frost stapeln (169 Ticks beide aktiv) |
| DPS-Budget Effekt vs Füller (30 Min × 3 Seeds) | eagleEye-longbow vs shortbow **1.081/1.081** ✓ · wand vs staff **1.081** ✓ · momentum-scimitar vs sword L60 **1.063–1.092** ✓ — aber **L90 1.199–1.281 ❌** (wild_stag/reef_drowned/last_idol) | ⚠ Spitzen-Scimitar über ±10 %; gleiche Wurzel wie T1 (Tempo×C-Skalierung, Scimitar 2.55 s + lck 3 + momentum) — von T1 mit abgedeckt (Sollwert: Effekt-Typ vs GLEICH-Tempo-Füller ±10 %) |

## Kriterium 6 — Chase-Probe (>10 % Kampfwert bei gleicher Req): ✅ **confirmed**

| Chase-Item | On-Tier-Craft-Pendant (gleiche Req) | Kampfwert (effDPS × EHP) |
|---|---|---|
| gorehorn_cleaver (attack 8, 1/526) | bronze_sword (best craft ≤8) | effDPS **+67 %** (2.70 vs 1.62, je deaths=0) ✓ |
| bulls_heart_pendant (1/1351) | garnet_amulet | **×1.40** (DPS +18 %, EHP +19 %) ✓ |
| thornmail_gauntlets (def 28, 1/625) | steel_gauntlets (≤28) / blacksteel (30) | **×1.16** vs steel, ×1.12 sogar vs nächst-Tier blacksteel ✓ (Treiber: thorns-Rückschaden) |

## Kriterium 7 — Ehrliche Läufe (RealisticPlayer pursue, 60 Sim-h Budget): ⚠ **durchgekommen, aber Upgrade-Erkennung für Waffen nicht belegbar (T3)**

| Lauf | Ziele (CL30 · Skill30 · 25k Gold) | Endstand | Frictions |
|---|---|---|---|
| Seed 11 melee (smithing) | ◐ 93 % (CL 28) · ✅ 23 h 26 m · ✅ 28 h 38 m | CL28, total 189, 141 889 Gold, 4 590 Kills, 20 Tode; Gear: **copper_spear**, leather_helm, copper_platebody/-legs | 11 (9 Muster, dominant „wiederholt gestorben an Mobs unter CL" — vor-dokumentiert sweep5-P2) |
| Seed 22 ranged (fletching) | ✅ 51 h 53 m · ✅ 49 h 43 m · ✅ 38 h 26 m | CL30, total 161, 40 423 Gold, 1 405 Kills, 16 Tode; Gear: **cracked_bow** + iron_arrow, leather_helm, apprentice_robe_body | 15 (6 Muster; **„Munition leer" ×9** — Gate hatte ×25 → Munitions-Entkopplung wirkt) |
| **Bewertung** | Beide Läufe laufen ohne Deadlock/Wall; Seed 22 erreicht erstmals ALLE 3 Ziele (Gate: 1/3); Todesraten im sweep5-Korridor; **keine NEUEN Friction-×N-Muster** (alle Muster vor-dokumentiert; „cook_ashroot_broth-Zutaten unerreichbar" ×1 je Lauf, kein ×N). | | |

⚠ **T3 (P2, Toolkit, Owner logic-dev):** `RealisticPlayer.gearScore` (`sim-realistic.ts:1688-1717`) liest `bonus`-Flats + `modifiers` + `skillBoost` — aber **NICHT `damageMin/damageMax`/absolutes Waffentempo**. Nach Waffen 2.0 tragen Waffen keine bonus-Flats mehr → jede Füller-Waffe scored ~0, der ehrliche Spieler legt NIE eine bessere Waffe an (Seed 22: cracked_bow bei CL30 über 52 h; Seed 11: copper_spear, weil dex 1 > sword-Score 0). Das Gate-Teilkriterium „erkennen die neuen Items als Upgrades" ist damit für WAFFEN nicht beobachtbar (Rüstung/Schmuck: ja, attribut-basiert) und die „Tode unter CL"-Frictions sind durch die künstlich schwache Waffe überzeichnet. Fix: Waffen-DPS-Term ((min+max)/2 + ammoDamage)/tempo in den Score (analog §7.1-Tooltip, den der echte Spieler sieht); danach Honest-Kurzlauf wiederholen. **Exakt das bekannte Bug-Muster „Feld definiert, aber nie gelesen" — diesmal im Sim-Toolkit.**

---

## Findings (Severity · Fundstelle · Owner)

1. **P2 · T1 — Fast-Melee-Spitze bricht die Best-Weapon-Parität am BiS:** godiron_dagger effDPS +39–50 % über godiron_sword (41.02 vs 27.29 @idol_warden; 3 Seeds) → Best-Weapon-Ratios melee **1.131/1.176**, magic **0.879/0.892**. Gleiche Wurzel: aetherium/godiron_scimitar +20–28 % über sword (L60 noch ✓ +6–9 %). Struktur: Charakter-Anteil C skaliert frei mit Waffentempo, §3.1-M-Linien preisen nur den Waffen-Anteil. Hebel: Tempo/M-Rückeichung dagger (+scimitar) ab aetherium; Sollwert: BiS-Best-Weapon 0.90–1.10×Ø UND Effekt/Füller ±10 % je Tempo-Klasse. Owner: **balance-designer → content-dev**, Re-Messung Kontrolleur.
2. **P3 · T2 — Enchant-Uplift nicht stilgleich:** Stil-Ø ranged +9.4 % / melee +5.7 % / magic +3.2 % (Spread 6.2 pp > 5 pp; Cap 15 % ok; T3-Band hält 0.921–1.101). Hebel: affix_hunter T3 kühlen bzw. affix_arcane wärmen (`content/index.ts:14404,14419`). Owner: **balance-designer**.
3. **P2 · T3 — Sim-Toolkit: gearScore blind für Waffen 2.0** (`sim-realistic.ts:1688`): kein damageMin/Max-/Tempo-Term → Honest-Läufe tragen Starter-Waffen; Upgrade-Erkennungs-Beleg für Waffen steht aus. Owner: **logic-dev** (Toolkit), danach Honest-Kurzlauf.
4. **P3 · T4 — Bronze-Baseline neu pinnen:** 15 Auffälligkeiten (Gate 21, alter Snapshot 12; Ziel §8.2 ≤ 12). Alle 13 kills=0-Mobs sind on-tier killbar (Undergeared-only, Chef-Prinzip). Owner: **balance-designer** (Pin + Einzelfall-Gegenprobe).
5. **P4 — veralteter Kommentar** an `aetherium_staff` (`content/index.ts:3359`): erwähnt noch den alten −425-Tempo-Patch; Wert selbst korrekt (2 730 ms = Spec 2.73 s). Kosmetik, Owner content-dev bei Gelegenheit.
6. Verifiziert OK (keine Findings): Gate-Methodik-Parität 36/36 Zellen im Band, EHP-Anker 1.071/1.000/1.039 (Soll 1.07/1.00/1.04), 0 geared-Walls (boar + 96 Boss-Zellen, 0 Tode), Chase-Doktrin (×1.16–×1.40, +67 %), 6 Effekt-Stichproben funktional exakt (execute 1.262≈1.25, cooldownOnKill 3000 ms, thorns 82/82, eagleEye 91/91, Stacking/Refresh korrekt, kein Doppel-Zünden), Effekt-Kind-Verdrahtung 26/26, i18n en/de vollständig, UI-Crash-Gate, SAVE_VERSION 49 + persistence grün, Munitions-Entkopplung wirkt (Friction ×25→×9).

## Empfehlung (eine Zeile)

**TRIM, dann fertig melden:** Kern-Zusagen stehen (Parität in Gate-Methodik 36/36, EHP-Anker exakt, 0 Walls, Effekte/Chase/Enchant-Integration sauber) — vor „fertig" die zwei Balance-Trims T1 (Fast-Melee-Spitze, Sollwert Best-Weapon-BiS 0.90–1.10) + T2 (Hunter/Arkan-Rune, Spread < 5 pp) und den Toolkit-Fix T3 einplanen; T1/T2 sind eng umrissene Zahlen-Trims, kein Re-Spec.
