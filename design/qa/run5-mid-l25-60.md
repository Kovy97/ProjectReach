# QA-Run 5 — Mid-Game Playtest (Level 25–60), nach Parität-R3 (Magie-Gear-Normalisierung)

**Tester:** Playtester-Analyst (READ-ONLY, kein Spiel-Code geändert) · **Datum:** 2026-06-28
**Scope:** Mid-Game L25–60. Kern-Auftrag: **3-Stil-Parität nach R3** (Magie-Gear ×0.5–0.8 normalisiert: Roben-`magicDamage` ×0.60 / Roben-`int`-Mods ×0.34, Foki ×0.50, Wände/Stäbe ×0.80, Robe-Set-Boni ×0.60). Zielband effektive DPS **0.9–1.1×** (Referenz ranged = 1.00). Plus: Suffix-System aktiv, Combo-Food, Jewelcrafting, ember-Robe, Gear-Progression.
**Methode:** Temporäres Sim-Harness in der Engine (`packages/engine/src/_run5tmp.test.ts`, **nach der Analyse wieder entfernt**, `packages/**` unverändert). Es wählt pro Stil & Level **best-craftbares Gear** via **effDPS-Greedy über ALLE Slots inkl. Waffe** (3 Pässe → re-optimiert Waffe vs. Rüstung, fängt Set-Boni). Identische Skill-/Attributbasis für alle drei Stile (alle Kampf- **und** Crafting-Skills auf L → einziger Unterschied ist Gear + Stil-Formel + Mana/Munition). Gemessen: (a) analytische **effDPS** (Krit/Tempo/Munition/Mana-Sustain) und (b) ein realer **1h-Kampf-Sim** der **echten combat.ts** gegen je 3 on-level Mobs, ø der per-Mob-kills/h-Ratios (cancelt Einzel-Mob-HP). Uniformes Food (`cooked_voidray`) für alle → 0 Tode → Faktoren spiegeln **Offense**. Abgeglichen mit `design/qa/run4-mid-l25-60.md` und der Prognose in `design/balance-3style-parity-r3.md`.

---

## Fun-Score: **6.5 / 10** (run4: 6)

R3 hat das run4-Problem (Magie-**Decke** ~1.8–1.95×) beseitigt — aber **überkorrigiert**: Magie ist jetzt der **Boden**, nicht die Decke. Im realen 1h-Sim sind **Melee und Fernkampf praktisch auf Parität** (0.99–1.11×), während **Magie auf ALLEN drei Checkpoints unter dem Band liegt (0.84–0.89× ranged, 0.76–0.85× melee) — und sich mit dem Level VERSCHLECHTERT** (0.89 → 0.86 → 0.84). Das Zielband 0.9–1.1× für **alle drei** Stile ist damit weiterhin **an keinem** Checkpoint getroffen, nur ist die Spreizung halbiert (max. paarweise 1.29× bei L40 statt run4 ~2×). Zusätzlich neu: eine **Mana-Kosten-Progressions-Inversion** — das teurere `adamantium_wand` liefert bei L55 **weniger** DPS als das billigere `mithril_wand` (höhere `manaCost` drückt den Sustain unter 1). Positiv: keine Abstürze, keine Walls, 0 Tode aller Stile; die strukturelle run4-P1 („nur Roben skalieren Offensive") ist **gelöst** — Melee/Ranged ziehen ihre Offensive jetzt über schnelle Waffen (Dolch -500 ms), Munition, Jewelcrafting und themed-Offensiv-Teile. Netto: deutlicher Fortschritt gegenüber run4, aber der explizite Paritäts-Auftrag (Magie ins Band) ist **gekippt statt erfüllt**, plus ein neuer Progressions-Bug. Für ein Idle-Spiel, in dem man sich auf einen Stil festlegt, ist „Magie = durchgehend ~15–25 % langsamer, Tendenz fallend" wieder eine Stil-Falle — diesmal trifft sie den Magier.

---

## Gemessene 3-Stil-Parität (Kern-Auftrag)

### effDPS aus best-craftbarem Gear (analytisch, kein Food)
| Level | Melee | Ranged | Magie | Melee/Ranged | **Magie/Ranged** | im Band 0.9–1.1? |
|---|---|---|---|---|---|---|
| **L30** | 84.6 | 77.5 | 69.8 | 1.09× | **0.90×** | Melee leicht drüber, Magie am unteren Rand |
| **L40** | 142.6 | 129.1 | 113.3 | 1.10× | **0.88×** | ✗ Melee drüber, Magie drunter |
| **L55** | 264.6 | 248.9 | 201.1 | 1.06× | **0.81×** | ✗ Magie klar drunter |

### Realer 1h-Kampf-Sim (echte combat.ts, ø per-Mob-kills/h-Ratio, ranged = 1.00)
| Level | Melee | Ranged | Magie | **Magie/Melee** | Tode |
|---|---|---|---|---|---|
| **L30** | 0.99 | 1.00 | **0.89** | 0.90 | 0/0/0 |
| **L40** | 1.11 | 1.00 | **0.86** | 0.77 | 0/0/0 |
| **L55** | 0.99 | 1.00 | **0.84** | 0.85 | 0/0/0 |

Verwendete Mobs: L30 = skeleton_icemage(30)/rootling_treemonster(32, regen4)/spectral_stag(28); L40 = forest_warden(40)/pit_spider(42)/tide_siren(38); L55 = forge_demon(54)/ember_elemental(52)/iron_revenant(58). Gewählte Loadouts (Auszug): Melee = `mithril_dagger`/`adamantium_dagger` + moss_plate/adamantium_chainbody + Jewelcrafting-Ringe; Ranged = `*_shortbow` + bestes Pfeil-Tier + warden_brigandine/studded_leather; Magie = `mithril_wand`(!) + frost/ember/aether-Robe + frost_focus/aether_orb.

**Der reale Sim ist die Ground Truth (er fährt die echte combat.ts) und bestätigt die effDPS-Richtung: Melee/Ranged im Band, Magie durchweg darunter und fallend.** Die effDPS überschätzt Melee minimal (ignoriert Mob-Evasion/Defense), real pendelt Melee um ranged ≈ 1.00 (L40-Ausreißer 1.11).

**Δ vs run4:** Run 4 maß **Magie dominant 1.8–1.95×**, Melee Schlusslicht. Run 5 misst das **Gegenteil**: Magie 0.84–0.89× (Boden), Melee/Ranged auf Parität. Die Spreizung ist von ~2× auf ~1.29× (L40) gesunken — **echter Fortschritt** —, aber die Decke wurde nur **von Magie zu Melee/Ranged verlagert und Magie unter das Band gedrückt**. Zur Ehrlichkeit: Ein Teil des Melee-Sprungs (run4 effDPS L40 63 → run5 143) ist **Methodik**: run4 wählte den Scimitar, mein Optimierer findet den **effDPS-optimalen Dolch** (`mithril_dagger`: meleeDamage 36, crit 0.07, **attackIntervalMs −500**) — run4 hat Melee unterschätzt. Die **Magie-effDPS dagegen ist gegenüber run4 fast unverändert** (L40 113.7 → 113.3): Der R3-Trim wurde durch die höhere `int·1.7`-Basis (untrimmt) und die Optimierer-Kompensation netto weitgehend aufgefangen — die eigentliche Verschiebung ist, dass **Melee/Ranged aufgeholt haben**, nicht dass Magie eingebrochen wäre.

**Δ vs R3-Prognose:** `balance-3style-parity-r3.md` sagte Magie **0.99 / 1.09 / 0.96** voraus (alle im Band). Gemessen: **0.90 / 0.88 / 0.81** (effDPS) bzw. **0.89 / 0.86 / 0.84** (real) — durchgehend **~10–25 % unter** der Prognose. Wahrscheinliche Ursachen: (1) die R3-Sim verglich gegen ein **schwächeres Melee** (kein Dolch-Optimum), (2) Magie **mana-throttelt** bei hoher Kadenz (s. P1-Inversion) stärker als modelliert.

---

## Priorisierte Findings

### [P0] — keine
Keine Abstürze, keine Walls, keine Trivialität (alle Sims 1.5 s+/Kill), 0 Tode in allen Stilen/Stufen. Stabilität einwandfrei.

### [P1 Balance] Magie unter Band im gesamten Mid-Game — R3 überkorrigiert (Decke → Boden)
**Befund (gemessen):** Magie real 0.89/0.86/0.84× ranged und 0.90/0.77/0.85× melee über L30/40/55, **mit fallender Tendenz** (Lücke wächst Richtung L55). effDPS bestätigt: 0.90/0.88/0.81×. Magie ist auf **keinem** Checkpoint im Band und der einzige Stil außerhalb (außer Melee L40 knapp drüber). Mana-Sustain ist dabei **p ≈ 1.0** — Magie ist **nicht** mana-verhungert; der Rückstand ist reiner Roh-Schaden nach dem R3-Trim relativ zum aufgeholten Melee/Ranged.
**Fix-Richtung (balance/content):** Magie-Roh-Schaden mid-game **~+15–25 % zurückgeben** — am sinnvollsten **teilweise Rücknahme** des Wand/Stab-`magicDamage`-Trims (×0.80 → ~×0.90) und/oder des Roben-`magicDamage`-Trims (×0.60 → ~×0.72), NICHT die int-Mods (deren Doppelstapel war der run4-Treiber, der zu Recht weg ist). Ziel: Magie real auf 0.95–1.05 **und** den Level-Trend flach bekommen (sonst kippt Magie bis L99 noch tiefer).

### [P1 Balance] Mana-Kosten-Progressions-Inversion: teurere Wand = weniger DPS
**Befund (gemessen):** Bei L55 liefert `adamantium_wand` (magicDamage 21, **manaCost 9**) effDPS **190.3** — **weniger** als das billigere, niederstufigere `mithril_wand` (magicDamage 17, **manaCost 8**) mit effDPS **201.1**. Grund: Bei hoher Kadenz (Intervall ~1240 ms durch hohen dex) ist die Mana-Regeneration/Schlag knapp; die höhere `manaCost` drückt den Sustain-Faktor unter 1 (mithril p=0.98 vs. adamantium p≈0.87) und frisst den +4-Schadensvorteil auf. Der DPS-optimale Magier **craftet also bewusst die SCHWÄCHERE, billigere Wand** — die Magie-Waffenprogression invertiert ab dem Punkt, an dem die Kadenz die manaRegen überholt. Verwirrend und entwertet höhere Runecrafting-Tiers.
**Fix-Richtung:** Entweder `manaCost` über die Wand-Tiers **flach halten** (alle ~8) oder leicht **senken** statt steigen, **oder** manaRegen mit dem Tier mitskalieren. (combat.ts/Engine unverändert lassen; das ist ein reines Content-`manaCost`-Tuning.)

### [P2 Balance] Melee L40 leicht über Band (1.10–1.12×), getrieben vom Dolch
**Befund (gemessen):** Melee real 1.11× ranged bei L40 (effDPS 1.10), an L30/L55 aber ~0.99–1.06 → kein durchgängiges Melee-Übergewicht, sondern eine **L40-Delle bei Ranged/Spitze bei Melee**. Treiber: `mithril_dagger` (−500 ms, crit 0.07) ist deutlich effDPS-stärker als Scimitar/Schwert; mit `power`-Stance (STYLE_DAMAGE_MULT, wirkt **nur** auf Melee) läge Melee noch höher — meine Messung mit `attack`-Stance ist also **konservativ** für Melee. Nicht dramatisch, aber knapp über 1.10.
**Fix-Richtung:** Beobachten. Falls geglättet werden soll: Dolch-`critChance`/`attackIntervalMs` minimal trimmen ODER mid-Ranged (L38–42) einen Hauch anheben — **erst nach** dem Magie-Fix neu messen (Reihenfolge wichtig, sonst kippt die Referenz).

### [P2 Balance] Combo-Food-Buffs zu klein, um die Magie-Lücke zu schließen
**Befund:** Combo-Food existiert vollständig und stil-spezifisch (`bloodgrain_stew` L38 meleeDamage+4/def+6, `duskfin_rangers_stew` L48 rangedDamage+4/crit+0.02, `spellwarden_bisque` L52 magicDamage+4/acc+5, `soulgourd_brisket` L58 neutral). Greift im Auto-Eat-Pfad. Aber **+4 Stil-Schaden ≈ +2 %** auf den mid-game-Roh-Schaden (~200) — schließt die ~15 %-Magie-Lücke **nicht** und ändert die Parität nicht (unverändert seit run4). Heilung ausreichend (0 Tode).
**Fix-Richtung:** Wenn Combo-Food ein echter Hebel sein soll, Stil-Schaden-Buffs mit dem Tier skalieren (mid +8/+12, late +16). Sonst kosmetisch.

### [P3 Balance] Magie-Skalierung über Level negativ — Endgame-Risiko
**Befund:** Magie-Ratio fällt monoton 0.89 → 0.86 → 0.84 (real) bzw. 0.90 → 0.88 → 0.81 (effDPS) von L30→L55. Der Trend deutet darauf, dass Magie im Endgame (L75–99) **noch tiefer** rutschen könnte — die Mana-Throttle (P1-Inversion) verschärft sich mit der Kadenz. Außerhalb des L25–60-Scopes, aber Flag für den nächsten Endgame-Sweep.
**Fix-Richtung:** Nach dem Magie-Roh-Schaden-Fix einen L75/L99-Gegenprobe-Sweep fahren (godspark-Set wurde von R3 ebenfalls getrimmt).

### [P3 Info] Suffix-System aktiv, paritäts-neutral in der Basismessung
**Befund:** `content.suffixes` existiert und der Drop-/Craft-Suffix-Pfad ist verdrahtet (combat.ts `tryCraftSuffix`, `DEFAULT_DROP_SUFFIX_CHANCE`). Für die saubere Stil-Parität habe ich **Basis-Items ohne Suffix-Instanzen** gemessen (alle Stile gleich) → Suffixe sind WoW-Stil Random-Rolls und treffen alle Stile gleichverteilt, verschieben die strukturelle Parität also nicht, erhöhen nur die Varianz einzelner Drops. Kein eigener Paritäts-Hebel, aber korrekt aktiv.

---

## Erledigte run4-Punkte / positives Δ

1. **Strukturursache „nur Roben skalieren Offensive" (run4 P1) GELÖST.** Melee/Ranged ziehen ihre Offensive jetzt aus schnellen Waffen (Dolch −500 ms / Shortbow), **Munition** (`*_arrow` ammoDamage), **Jewelcrafting** (warband_signet/ruby/bloodstone-Ringe) und themed-Offensiv-Teilen (spectral_coif rangedDamage+crit, warden_brigandine rangedDamage). Ergebnis: Melee/Ranged auf Parität statt Schlusslicht. (Hinweis: Platten-Body bleibt offensiv-neutral — der Optimierer **meidet** Platten-`meleeDamage`-Backbone-Teile bewusst wegen ihrer `attackIntervalMs`-Strafe und nimmt schnellere leichte Teile; die Melee-Parität kommt **nicht** aus der Platte.)
2. **Magie-Decke (run4 P1) beseitigt** — kein 1.8–1.95×-No-Brainer mehr; Spreizung von ~2× auf ~1.29× halbiert.
3. **R3-Trims sauber im Content angekommen** (verifiziert): ember_robe_body magicDamage 12→7 / int 7→2, aether_robe_body 16→10 / int 8→2, frost_focus 16→8, aether_orb 24→12, adamantium_wand 26→21, Robe-Set-Boni getrimmt. Exakt wie `balance-3style-parity-r3.md §3` spezifiziert.
4. **Jewelcrafting/ember-Robe/Combo-Food** alle integriert und in den Loadouts aktiv (ember-Robe schließt die Magie-Kadenz L30–40 wie geplant).

## Walls / Stabilität
Kein Wall, keine Trivialität, keine Abstürze: realer 1h-Sim über L30/40/55 × 3 Stile × 3 Mobs → **0 Tode**. Einziges Kern-Problem bleibt die Stil-Parität (P1).

---

## Was fehlt für 9,5?
1. **Magie ins Band heben (Kern):** mid-game Magie-Roh-Schaden ~+15–25 % zurückgeben (teilweise Rücknahme des Wand/Stab- und Roben-`magicDamage`-Trims, **nicht** der int-Mods) → real 0.95–1.05 an L30/40/55. **Pflicht.**
2. **Mana-Kosten-Inversion fixen:** Wand-`manaCost` über die Tiers flach/fallend statt steigend → höhere Wände sind wieder ein Upgrade; entfernt den Progressions-Trap und stabilisiert den Magie-Level-Trend.
3. **Level-Trend flach machen:** nach 1.+2. einen **L75/L99-Sweep** fahren (godspark-Set wurde getrimmt) — Magie darf nicht weiter abfallen.
4. **Melee-L40-Spitze glätten** (1.11×) — erst nach dem Magie-Fix neu messen; ggf. Dolch-Krit/Tempo minimal trimmen oder mid-Ranged leicht anheben.
5. **Combo-Food zu echten Hebeln** machen (Stil-Schaden mit Tier skalieren), sonst bleibt es kosmetisch.
6. **Politur, die einen Idle-Stil 9,5 macht:** spürbare Stil-Identität jenseits der DPS (Magie-Mana-Schild/Status, Melee-Lifesteal/Tank, Ranged-Krit-Burst) ist im Code da, aber unter uniformem Food unsichtbar — ein Content-/UX-Pass, der diese Identitäten im Mid-Game erlebbar macht, ohne die DPS-Parität zu brechen.

---

### Methoden-Hinweis (Fairness & Konfidenz)
Alle drei Stile teilen **dieselbe Skill-/Attributbasis** (alle Kampf- + Crafting-Skills auf L); einziger Unterschied ist Gear + Stil-Formel. Der Optimierer wählt pro Slot **inkl. Waffe** das effDPS-Maximum (3 Greedy-Pässe) — Magie bekam damit explizit ihr **bestes craftbares Setup** (inkl. der Erkenntnis, dass `mithril_wand` das teurere `adamantium_wand` schlägt, s. P1). Die Messung ist damit **konservativ zugunsten Magie**. Realer 1h-Sim = echte combat.ts (Mana-Depletion/Weak-Cast, Munition, Krit, Status, Auto-Eat real). Konfidenz **hoch** (effDPS und realer Sim stimmen in Richtung & Größenordnung überein; 3 on-level Mobs je Checkpoint, per-Mob gemittelt). Einschränkung: `power`-Stance (nur Melee-Boost) wurde nicht genutzt → Melee real eher untergrenzig; das **verstärkt** den Befund „Magie hinten". Das temporäre Harness (`packages/engine/src/_run5tmp.test.ts`) wurde nach der Messung **entfernt**; `packages/**` unverändert.
