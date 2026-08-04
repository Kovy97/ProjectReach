# Sweep 6 · T4 — Magie-Pfad + Runecrafting/Enchanting

**Tester:** Sweep-6-T4 (Kontrolleur-Rolle, headless) · **Datum:** 2026-07-03 (Nacht-Loop) · **Modus:** read-only, Wegwerf-Harness `_tmp_s6t4_*` (SimPlayer/RealisticPlayer/Engine direkt; nach dem Sweep gelöscht, `packages/**` netto unverändert)
**Auftrag:** RealisticPlayer Seed 63 magic-Persona, 40 Sim-h, `pursue(combatLevel 40 + runecrafting 35 + obtainItem rune_arcane_ii)`; Mana-Ökonomie ohne Natur-Regen; Runen-Kette craft→enchant→Proc end-to-end; Enchant-Uplift-Symmetrie nach dem T2-Trim; Affix-Instanzen im Save-Roundtrip; Suffix-Sanierung („nur wirksame Werte").
**Alle Zeitangaben = SPIELZEIT** (Sim läuft ~4.000–17.000× Echtzeit).

## Kurz-Verdikt

Alle fünf Prüf-Systeme sind **funktional sauber verdrahtet** (Mana trägt, Runen-Kette end-to-end grün, Uplift-Spread nach Trim 4,6 pp < 5-pp-Ziel, Save-Roundtrip bit-genau, Suffixe ohne tote Werte). Der **ehrliche 40-h-Lauf erreicht aber 0/3 Ziele** — die Reibung liegt nicht in den Mechaniken, sondern im Magie-*Pfad*: T2-Arkan-Rune erst bei RC 52 (Melee: 38), und der ehrliche Magier hängt 40 h auf dem Shop-Starter-Stab fest. Findings unten, alles P3/P4 — **kein Blocker**.

---

## 1) Ehrlicher Lauf — Seed 63, magic, 40 Sim-h (skillingBias 0.35)

| Ziel | Status | Stand |
| --- | --- | --- |
| Kampf-Niveau 40 | ◐ 68 % | CL **27**/40 |
| runecrafting 35 | ◐ 65 % | RC **30**/35 |
| 1× rune_arcane_ii (T2) | ◐ 0 % | 0/1 (Rezept braucht RC 52) |

Endstand: total 161, 32.385 Gold, **1.168 Kills / 11 Tode**, Skills > 1: magic_off 37, vitality 34, foraging 43, runecrafting 30. Gear am Ende: **gnarled_staff** (Shop-Starter-Tier!) + dim_focus, leather_helm, apprentice_robe_body. 3 Frictions, alle das vor-dokumentierte Muster „wiederholt gestorben an Mob ≤ CL" (sweep5-P2; boar/goblin_spearman/goblin_butcher) — **keine neuen Friction-Muster**.

Einordnung Pacing: CL 27 nach 40 h liegt im Korridor der Melee-/Ranged-Referenzläufe (Re-Gate Seed 11 melee: CL 28 bei 60-h-Budget) → **XP-seitig keine Stil-Wand**. Die Ziel-Verfehlungen sind Gear- und Zugangs-Themen (Findings 1–3).

## 2) Mana-Ökonomie ohne Natur-Regen: ✅ **trägt**

Mana-Regen ist als eigener Kanal verdrahtet (`character.ts:394`: `manaRegen = (1.5 + wis·0.4 + eq.manaRegen) · petMult`, Regen im Kampf `combat.ts:1422` und außerhalb `tick.ts:364-368`) — die Natur-HP-Regen-Entfernung (v49) berührt ihn nicht.

| Messpunkt | Casts / Angriffe | Weak-Hits | Ticks unter Cast-Kosten | Mana min/avg |
| --- | --- | --- | --- | --- |
| Frisch-Magier (cracked_staff, chicken, 20 min) | **192/192** | 0 | 0/12.000 | 42,9 / 76,4 (max 72+Puffer) |
| Nach 40 h (gnarled_staff cost 6, goblin_felmagician, 20 min) | **308/308** | 0 | 2/12.000 | 5,9 / 14,7 (max 172) |

Der Mana-Schild drückt den Pool im On-Level-Kampf nahe an die Cast-Kosten, aber die **Cast-Reserve (Hebel C, `combat.ts:518-521`) hält exakt**: nie Weak-Cast-Spirale, `manaMin ≈ castCost`. Basis-Regen 2,7/s deckt Stab-Kosten 5–9 je 2,7–3,0 s überall; die beiden cost-10-Legendaries (skarn_idol_staff, last_condemnation) bringen wis+7/manaOnKill-Rider selbst mit. **Kein Finding.**

## 3) Runen-Kette craft→enchant→Proc: ✅ end-to-end grün

- **Craft:** `craft_rune_flame_ii` (RC 40) produziert ehrlich über die Aktion: 3 Runen, +57 RC-XP, Inputs verbraucht.
- **Enchant:** `applyEnchant` auf den AUSGERÜSTETEN Stab: ok, Rune verbraucht, Gold abgezogen, Instanz `[{affix_flame, tier 2}]`, Name „Flaming Aether Runestaff".
- **Effektliste:** `effectiveInstanceWeaponEffects` führt Basis-burn (0.30) UND Runen-burn (0.20) — kein Verschlucken, kein Doppeln.
- **Proc im Kampf:** 20 min vs. goblin: **58 burn-Anwendungen / 181 Angriffe**, 48 DoT-Ticks, 135 Kills, 0 Tode.
- **Stat-Pfad:** Arkan-Rune II auf Stab → int 18→24, magicDamage 13,3→15,4, maxMana 222→282, Schadensspanne hebt sich — Affix-`modifiers` fließen durch `computeStats`.
- **Guard:** Arkan-Rune auf Melee-Waffe → `affix_mismatch`, Rune NICHT verbraucht, keine Instanz-Leiche (Rollback sauber, `enchant.ts:211-219`).

## 4) Enchant-Uplift nach dem Symmetrie-Trim: ✅ **Ziel erreicht (knapp)**

Re-Messung mit exakt der Re-Gate-Methodik (BiS L99: godiron-Waffe + Metall/voidhide/voidweave + godgem-Schmuck; 4 Endbosse × Seeds 7/13/29 × 60 Sim-Min; effDPS = HP/(s/Kill − 5); Uplift = T3/blank − 1):

| Stil (T3-Rune) | idol_warden | aether_wraith | scale_skarn | last_idol | **Ø** |
| --- | ---: | ---: | ---: | ---: | ---: |
| melee (Scharf, str 10) | +12,8 % | +0,0 % | +9,7 % | +0,4 % | **+5,7 pp** |
| ranged (Jägerisch, lck 4 — dex-Zeile gestrichen) | +3,7 % | +8,8 % | +8,1 % | +9,5 % | **+7,6 pp** |
| magic (Arkan, int 10) | +3,1 % | −0,0 % | +3,8 % | +4,8 % | **+2,9 pp** |

**Spread 4,6 pp < 5-pp-Ziel** (vor dem Trim 6,2 pp; ranged 9,4→7,6 pp — der Trim `content/index.ts:14499-14508` wirkt messbar). Cap 15 % gehalten (max. Zelle 12,8 %), alle 72 Zellen deaths=0. Beobachtung ohne Findings-Rang: magic bleibt mit ~3 pp der schwächste Enchant-Payoff (int-Flat versickert im Schlag-Raster, bekannte Hit-Quantisierung — melee zeigt dieselbe Streuung 0–12,8 %); innerhalb des Ziels, kein Handlungsbedarf vor EA.

## 5) Affix-Instanzen im Save-Roundtrip: ✅ verlustfrei

serialize → deserialize (migrate + sanitize) mit Instanzen an allen drei Trägern (equipped Stab mit 2 Affixen, Inventar-Wand mit Affix+Suffix ilvl 77/roll 0.618…, Vault-Bogen mit Affix+Suffix):
- **Aktuelle Version:** bit-gleich (Affix-Reihenfolge, exakte ilvl/roll-Floats, `nextInstanceSeq`, `computeStats` vor==nach).
- **Migrations-Pfad** (version=48 → 49): Instanzen unversehrt.
- **Sanitize-Härtung:** NaN-Tier-Affix wird gefiltert, NaN-ilvl-Suffix verworfen — legale Instanzen daneben bleiben vollständig, kein Crash (`persistence/src/index.ts:76-105`).

## 6) Suffix-Sanierung „of the Bull/Wolf/Eagle/Viper/Magus": ✅ nur wirksame Werte

- **Katalog-Audit (28 Suffixe × ilvl min/50/100 × roll 0/1):** kein einziger 0-Wert-Kanal in `instanceBonusDelta`; verbotene rohe Kampf-Flats (melee/ranged/magicDamage, accuracy, evasion, defense, maxHp) kommen auf keinem Suffix mehr vor (Whitelist: softStats + Mana + hpRegen intakt, z. B. Phoenix).
- **Die 5 genannten:** Bull→`{str}`, Wolf→`{str, attackIntervalMs}`, Eagle→`{dex, critChance}`, Viper→`{dex, attackIntervalMs}`, Magus→`{int}` — exakt die sanierten Kanäle, und JEDER Kanal bewegt die richtigen `computeStats`-Outputs (Bull: meleeDmg 6,8→9,2; Wolf: Intervall 1960→1745 ms; Eagle: crit 10,2→15,3 %; Viper: 1773→1543,5 ms; Magus: magicDmg 17,3→19,7 + maxMana 230→300).
- **Konversions-Anhebungen wirken:** Viper (dex 0.075) und Eagle (dex 0.15) runden dank Min-1-Klausel/angehobener k-Werte nie auf 0 — „toter Roll" ist weg.
- **Pool & Drops:** Pools stil-sauber (kein Bull auf Bogen/Stab, kein Magus/Viper auf Schwert); 3×300 Drop-Rolls (Chance 1) alle pool-legal, Chance-Cap 0,95 greift (292/300).
- **UI:** Tooltip rendert aus derselben `instanceBonusDelta` mit 0-Guards (`ItemTooltip.tsx:630-680`) — tote Flats sind dort nicht mehr darstellbar.

---

## Findings

1. **P3 · balance/content — T2-Runen-Zugang stil-asymmetrisch:** Die Schadens-Rune des eigenen Stils schaltet frei bei RC **38 (melee keen_ii) / 50 (ranged hunter_ii) / 52 (magic arcane_ii)**; T1 analog 15/28/30 (`content/index.ts:8791-8831`). Die Runen-*Stärke* ist nach dem Trim symmetrisch, der *Zugang* nicht — ausgerechnet der Stil, dessen gesamte Waffenleiter schon in RC lebt, bekommt seine Rune ~14 Level später als Melee. Im Auftrag-Zielset (RC 35 + T2-Rune) ist das Rune-Ziel dadurch strukturell unerreichbar. Vorschlag: arcane_i/ii auf ~25/40 ziehen (oder keen anheben), Sollwert: Stil-Δ ≤ ~4 RC-Level je Tier. Owner: **balance-designer → content-dev**.
2. **P3 · Sim-Toolkit (bekanntes Muster, Magie-Ausprägung) — ehrlicher Magier klebt 40 h auf dem Starter-Stab:** Seed 63 endet bei CL 27 mit **gnarled_staff** (Shop, Tier 2/13), obwohl craft_blacksteel_staff (RC 30) freigeschaltet war. Der RealisticPlayer hat keine „eigene Waffe craften"-Route (Material ember_essence = reiner Kampf-Drop 12–18 %, wird nie gezielt gefarmt) — Magie-Waffen sind aber zu ~100 % craft-/drop-gebunden (Shop endet bei gnarled_staff). Folge: Tode an On-Level-Mobs, CL-40-Ziel verfehlt, Magie-Pacing in Honest-Läufen systematisch unterzeichnet. Das ist der Magie-Schwanz von Re-Gate-T3 (gearScore-Fix allein reicht nicht — man muss die Waffe erst BESITZEN). Owner: **logic-dev** (`sim-realistic.ts`, Task-Ableitung „Gear-Craft für Upgrade").
3. **P3 · Sim-Toolkit — Inventar-Thrash durch nicht-stapelbare Craft-Outputs:** RC-Training via enchant_dim_focus füllte 18/20 Slots mit dim_focus-Offhands; das Entlasten-Protokoll loggt stundenlang **„Inventar entlastet (20/20 → 20/20)"** als No-op — die Heuristik verkauft/vaultet überzähliges Equipment nicht. Log-Rauschen + permanenter Slot-Druck im ganzen Lauf. Owner: **logic-dev** (`sim-realistic.ts`, Entlasten-Heuristik).
4. **P3 · balance/pacing — RC-Mittelspiel hängt an der L1-Schleife:** RC 30 nach 40 h trotz viel Aufmerksamkeit: Der Lauf grindet enchant_dim_focus (≈0,6 XP/s inkl. forage_dim_essence-Nachschub), weil die besseren Rezepte (steel/blacksteel_staff, 1,5–2,5 XP/s; Affix-Runen) Essenzen brauchen, die nur als Kampf-Drops existieren (ember_essence: 3 Mob-Quellen). Teils gewollt („Combat ist fundamental"), aber es gibt KEINE Skilling-Quelle zwischen dim_essence (L1) und den Kampf-Essenzen → RC-XP/h-Kurve knickt für Skiller-Phasen bei ~L20-50 ab. Gegencheck erwünscht (balance-designer): ist der dim→ember-Sprung so gemeint?
5. **P4 · i18n/kosmetisch — deutscher Instanz-Name undekliniert:** `instanceDisplayName` verkettet das Affix-Präfix roh: **„Flammend Aether-Runenstab"** (statt „Flammender …"); EN korrekt. `shared/src/index.ts:1861-1879` + Präfix-Strings im Affix-Katalog. Betrifft alle DE-Instanznamen. Owner: content-dev/ui-dev (Entscheidung: deklinierte Präfix-Strings oder Name-Schema „Aether-Runenstab (Flammend)").
6. **P4 · Sim-Toolkit kosmetisch — obtainItem-Ziel zeigt „◐ 0 %" trotz echter Route-Arbeit:** Der Fortschritts-% zählt nur Besitz; die (korrekt laufende) Trainings-Route („runecrafting trainieren für rune_arcane_ii") ist im Bericht unsichtbar — liest sich fälschlich wie eine Wall. `sim-goals.ts` checkGoal/obtainItem. Owner: logic-dev, nice-to-have.

**Verifiziert OK (keine Findings):** Mana-Ökonomie (§2), Runen-Kette end-to-end inkl. Rollback-Guard (§3), Uplift-Trim-Wirkung + Spread-Ziel (§4), Save-Roundtrip/Migration/Sanitize für Affix- UND Suffix-Instanzen (§5), Suffix-Katalog 28/28 ohne tote Werte + UI-Single-Source (§6), keine neuen Friction-Muster, Todesquote im Korridor (11/1.168 über 40 h).

## Empfehlung (eine Zeile)

Mechanik-Fundament Magie/Enchanting/Suffix ist ship-fähig; vor EA nur die zwei P3-Zugangs-Themen einplanen (T2-Runen-Leiter angleichen, Sim-Toolkit „Gear-Craft"-Route für ehrliche Magie-Messungen) — nichts davon blockt den Nacht-Loop.
