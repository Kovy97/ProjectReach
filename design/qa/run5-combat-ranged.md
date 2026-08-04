# QA-Run 5 — Combat-Tiefenanalyse FERNKAMPF (Parität-R3: voidhide=Glass-Cannon, ironhide L60 neu)

**Tester:** Playtester-Analyst (READ-ONLY) · **Datum:** 2026-06-28 · **Fokus:** Fernkampf
**Scope:** `combat.ts`, `computeStats` (`character.ts`), Bögen/Pfeile/Köcher/Leder/ironhide/voidhide aus `packages/content/src/index.ts`, `shared/src/index.ts`.
**Leitfrage (Chef):** Nach dem R3-Content-Umbau (voidhide als echte Glass-Cannon ausgelegt, neue ironhide-L60-Lederstufe füllt die L52→72-Lücke) — ist Fernkampf jetzt im ±15 %-Band? Ist die „höchster Schaden, geringste Defensive"-Identität endlich da? Ist Ranged nicht mehr ~3× tankier (Evasion) als Platten-Melee?

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`advance`, Seed 5), je Checkpoint **drei tier-gleiche Builds** (melee / ranged / magic) gegen denselben **on-level Mob** über **1 h** Spielzeit. **Stil-realistische Skill-Investition** (melee: attack+power+defence+vitality+smithing → str/dex/con · ranged: ranged+defence+vitality+leatherworking+fletching → dex/con · magic: magic_off+magic_def+defence+vitality → int/wis/con), **auto-gewähltes, stil-passendes Gear pro Slot** (Score: melee=def/hp, ranged=rangedDamage/evasion, magic=magicDamage/mana) und die **Waffe per echter DPS** (jeden Kandidaten testweise anlegen → `computeStats` → crit-gewichtete dmg/Intervall → beste). Köcher voll, Auto-Eat Tier 3 (`cooked_voidray`, 170 HP). Gemessen: **kills/h** + Begleit-Stats aus `computeStats`. Harness nach dem Lauf **entfernt** (inkl. eines im Repo liegen gebliebenen Fremd-Harness `_run5harness.test.ts` — sauber aufgeräumt). Alle Zahlen unten sind reale Sim-Ausgaben.

> Hinweis: Melee-Referenz = bester DPS-Melee (godiron_dagger etc., **nicht** der langsame Maul) → faire 1.00×-Basis. Magie ist nur Kontext (mana-sensitiv im Kaltstart, hier plausibel 0.81–1.17×).

---

## Fun-Score: **7.0 / 10**

Echter Fortschritt gegenüber Run4 (6.5), aber die zwei Kern-Probleme leben weiter. **Wins:** (1) Der voidhide-Umbau zur Glass-Cannon ist im Content **real angekommen** — 5-Teile jetzt **def 149 / eva 95 / hp 350 / rangedDamage 57** (R4 war 224/190/485/37): Evasion exakt halbiert, def/hp deutlich unter Platte, Schaden hoch. (2) **ironhide L60** füllt die L52→72-Leder-Lücke sauber und stilgerecht (def/eva/hp + rangedDamage). (3) **Low-Level-Parität ist gelöst** (L10 ranged 1.01× statt R4 1.41×). (4) Mechanik (Köcher, Out-of-Ammo, 12-Tier-Pfeile, Bogen↔Pfeil-Kopplung) weiterhin **bugfrei, 0 Tode**.

**Aber:** Der Glass-Cannon-Umbau hat die **Throughput-Parität nicht gebracht — am Endgame sogar leicht verschärft.** Der voidhide-`rangedDamage`-Buff (37→57) hob den Ranged-Endgame-Schaden (259→318) und damit kills/h (L99 1.30×→**1.39×**), während der def/hp-Cut unter Auto-Eat **nichts kostet (0 Tode überall)**. Aus „mehr Schaden, weniger Defensive" wurde faktisch „mehr Schaden, **gratis**". Und die **Evasion-Halbierung von voidhide ist — wie schon der Engine-Fix in R4 — weitgehend inert**: Ranged out-evadet Platten-Melee endgame **3.14×** (270 vs 86), weil der Treiber dex (ranged+leatherworking) + das **gesamte** Leder/Spezial/Offhand/Cape-Evasion-Budget ist, nicht die voidhide-Eva allein. Halber Punkt rauf für die echten Content-Fortschritte; nicht mehr, weil das Paritäts- **und** das Evasion-Ziel weiter verfehlt sind.

---

## Durchsatz (kills/h, 1 h Sim, on-level Mob, melee = 1.00×)

| Build | L10 vs goblin_butcher | L40 vs forest_warden | L65 vs roc_elder¹ | L99 vs aether_wraith |
|---|---:|---:|---:|---:|
| melee  | 727 (1.00×) | 357 (1.00×) | 413 (1.00×) | 488 (1.00×) |
| **ranged** | **732 (1.01×)** | **473 (1.32×)** | **461 (1.12×)** | **676 (1.39×)** |
| magic (Kontext) | 621 (0.85×) | 418 (1.17×) | 335 (0.81×) | 412 (0.84×) |

¹ *roc_elder hat `regen 4` (DPS-Check) → staucht alle Ratios nach unten; L65 ist daher konservativ.*

**Begleit-Stats L99** (dmg / acc / aIMs / crit / **eva / def / hp** / Tode):
- melee:  dmg 359, acc 660, aIMs 2075, crit 0.23, **eva 86, def 499, hp 1995**, 0 Tode
- ranged: dmg 318, acc 670, aIMs 1575, crit 0.33, **eva 270, def 294, hp 1377**, 0 Tode (~2.285 Pfeile/h)
- magic:  dmg 371, acc 608, aIMs 2880, crit 0.24, **eva 172, def 233, hp 1230**, 0 Tode

Ranged liegt an jedem ungestauchten Checkpoint **über** dem ±15 %-Band (1.32–1.39×); nur L10 ist im Band (Früh-Trim wirkt), L65 nur dank `regen`-Stauchung scheinbar nah.

---

## Evasion / Survivability — die Kernfrage

| Checkpoint | melee eva | ranged eva | **ranged/melee** | melee def/hp | ranged def/hp | Tode |
|---|---:|---:|---:|---:|---:|---:|
| L10 | 28 | 79 | **2.82×** | 73 / 341 | 50 / 277 | 0 |
| L40 | 48 | 143 | **2.98×** | 162 / 749 | 118 / 573 | 0 |
| L65 | 64 | 196 | **3.06×** | 246 / 1127 | 178 / 881 | 0 |
| L99 | 86 | 270 | **3.14×** | 499 / 1995 | 294 / 1377 | 0 |

**Lesart / Decompose L99** (Formel `evasion = 10 + dex·1 + sDefence·0.4 + eq.evasion`, Divisor 4):
- ranged eva 270 ≈ 10 + **dex 54** (base 5 + ⌊(ranged 99 + leatherworking 99)/4⌋ = 49) + sDefence 99·0.4 + **eq.eva ~166** (voidhide 4-Tlg 83 + shadowhide_boots 20 + ranger_cape 14 + voidwood_pavise 36 + Ring).
- melee eva 86 ≈ 10 + **dex 29** (base 5 + ⌊attack 99/4⌋ = 24) + sDefence 99·0.4 + **eq.eva ~6** (Platte trägt quasi keine Evasion).
- **Der Gap (~184) ist zu ~160 Gear-Evasion und ~25 dex** — die voidhide-Eva-Halbierung (−95) hat den Gap nur von ~3.0× auf ~3.1× **nicht** gesenkt, weil Cape/Offhand/Spezial-Leder + dex den Wegfall auffangen. **Defensiv ist Ranged „glass" auf dem Papier** (hp 69 %, def 59 % von Melee) — aber mit Auto-Eat (0 Tode) ist das **folgenlos**, und die Evasion macht Ranged trotzdem zum besten Ausweicher.

---

## Δ vs Run4

| Metrik | Run4 | Run5 | Δ |
|---|---:|---:|---|
| **Fun-Score** | 6.5 | **7.0** | **+0.5** (voidhide-Umbau + ironhide + Low-Level-Parität) |
| ranged kills/h L10 | 1.41× | **1.01×** | **gelöst** (im Band) |
| ranged kills/h L99 | 1.30× | **1.39×** | **leicht schlechter** (rangedDamage-Buff hebt Durchsatz) |
| ranged eva L99 | 300 | **270** | minimal besser (Gear-Cut wirkt nur ~30) |
| ranged eva/melee L99 | 2.9× | **3.14×** | **schlechter** (dex+Gear fangen Eva-Cut auf) |
| ranged dmg L99 | 259 | **318** | höher (voidhide rangedDamage 37→57 + godiron-Pfeil) |
| voidhide 5-Tlg (def/eva/hp/rd) | 224/190/485/37 | **149/95/350/57** | **Glass-Cannon-Umbau ✓** (eva halbiert, def/hp −, dmg +) |
| ironhide L60 | — | **neu, füllt L52–72 sauber** | ✓ |
| Ammo/Out-of-Ammo/Tiers/Kopplung | sauber | **sauber** | unverändert gut |

*(Methodik nicht 1:1 zu Run4 — R5 wählt Cape/Ring/Spezial-Items auto und nutzt L40 forest_warden / L65 roc_elder; absolute kills daher höher, aber Ratios + Stat-Decompose sind robust.)*

**Fazit Δ:** R3 hat die **Content-Identität** vorangebracht (voidhide wirklich squishig+harthitting, ironhide-Lücke zu, Früh-Parität gelöst) — aber das **Paritäts- und Evasion-Ziel verfehlt** und den Endgame-Durchsatz durch den rangedDamage-Buff sogar leicht nach oben gedrückt.

---

## Priorisierte Findings

### P0 — keine
Keine blockierenden/kaputten Befunde. Alle Mechaniken laufen, 0 Tode, kein Soft-Brick.

### [P1 Balance] Evasion-Tank lebt weiter — Ranged out-evadet Platten-Melee ~3× (3.14× @L99); voidhide-Eva-Cut weitgehend inert
**Befund:** Die voidhide-Eva-Halbierung (190→95) war korrekt umgesetzt, senkt das eva/melee-Verhältnis aber **nicht** (R4 2.9× → R5 3.14×). Treiber (s. Decompose): ~160 von ~184 eva-Gap sind **Gear** (alle Leder-/Spezial-Stücke, Cape `ranger_cape`+14, Offhand `voidwood_pavise`+36), ~25 sind **dex** (ranged trainiert dex über **zwei** Skills: ranged + leatherworking). Platte trägt strukturell ~0 Evasion. Mit Auto-Eat (0 Tode) ist die hohe Evasion ein reiner Gratis-Vorteil ohne Kehrseite.
**Fix-Vorschlag:** Am echten Hebel ansetzen — **Gesamt-Leder-Evasion-Budget** kürzen (nicht nur voidhide), Plattenträger etwas Evasion geben **und** den `leatherworking→dex`-Doppel-Feeder kappen (s. P2). Ziel: ranged eva/melee ≤ ~1.5×.

### [P1 Balance] Glass-Cannon-Umbau verfehlt Throughput-Parität — backfire am Endgame
**Befund:** voidhide-`rangedDamage` wurde 37→57 angehoben → Ranged-L99-Schaden 259→318, kills/h 1.30×→**1.39×**. Der gleichzeitige def/hp-Cut (def 224→149, hp 485→350) **kostet unter Auto-Eat nichts** (0 Tode). Ergebnis: Die „mehr Schaden / weniger Defensive"-Identität wurde zu „mehr Schaden / **gratis**" — Ranged ist endgame **dominanter** statt im Band.
**Fix-Vorschlag:** Top-`ammoDamage` (godiron_arrow 32) **und/oder** godiron-Bogen-`rangedDamage` **und/oder** voidhide-`rangedDamage` (57 ist jetzt größter Einzeltreiber) trimmen, bis L99 ranged ≤ ~1.15×. Den def/hp-Cut behalten — aber ihm Zähne geben (s. P2-Auto-Eat).

### [P2 Balance] Glass-Cannon-Kehrseite ist unsichtbar (Auto-Eat trivialisiert niedrige hp/def)
**Befund:** Ranged ist defensiv jetzt echt „glass" (hp 1377 = 69 % Melee, def 294 = 59 %) — aber `cooked_voidray` (170 HP) + Auto-Eat → **0 Tode an allen Checkpoints**. Es gibt keinen Slot, an dem Ranged für seinen Durchsatz bezahlt; der einzige Nominal-Nachteil ist folgenlos.
**Fix-Vorschlag:** Der squishy-Identität Zähne geben — Food-/Auto-Eat-Druck (höherer Verbrauch bei vielen Treffern), Dungeon-/Boss-Kontexte ohne Auto-Eat, oder Spike-Damage-Mobs, die niedrige hp wirklich bestrafen. Erst dann ist „weniger Defensive" eine echte Kehrseite statt Kosmetik.

### [P2 Balance/Identität] `leatherworking → dex` ist ein 5-Stat-Doppelfeeder für Ranged
**Befund:** Ranged zieht dex aus **ranged + leatherworking** (2 Skills, Divisor 4 → dex 54 @L99), Melee dex nur aus **attack** (1 Skill → dex 29). dex speist **fünf** Ranged-Stats: rangedDamage, critChance, attackIntervalMs, accuracy, evasion. Das ist der strukturelle Treiber hinter Eva-Vorsprung **und** Tempo (aIMs 1575 vs Melee 2075) — derselbe Befund wie in `parity-r2-gegenprobe.md`.
**Fix-Vorschlag:** `leatherworking.trains` entfernen (→ nichts, analog fletching/runecrafting) **oder** auf ein anderes Attribut legen, damit die ranged-dex nicht doppelt gefüttert wird.

### [P3 Content-Bug] `voidhide_boots` rangedDamage = 1 (Tippfehler)
**Befund:** `voidhide_boots` hat `{ defense 17, evasion 12, maxHp 47, rangedDamage 1 }` — **rangedDamage 1**, während `voidhide_vambraces` mit **identischen** def/eva/hp (17/12/47) `rangedDamage 12` trägt. Klar ein Tippfehler (alle anderen voidhide-Teile 12–18). Folge: Der DPS-Optimizer weicht am L99-Boot-Slot auf `shadowhide_boots` aus — der voidhide-Stiefel ist faktisch tot.
**Fix-Vorschlag:** `voidhide_boots.rangedDamage` auf ~11–12 setzen.

### [P3 Abdeckung] Suffix-/Random-Roll-Ranged-Items nicht getestet
**Befund:** Das Harness nutzt **plain** Gear (keine `equippedInstances`). Affix-/Suffix-Rolls (Memory: WoW-Stil Random-Rolls) sind damit **nicht** abgedeckt. Risiko: Suffixe könnten Evasion erneut stapeln und P1 verschärfen.
**Fix-Vorschlag:** Separat verifizieren, dass Ranged-Suffix-Pools **kein** Evasion-Restacking erlauben (eher rangedDamage/crit/Tempo).

---

## Mechanik-Checks Fernkampf (alle bestanden)
- **Köcher/Ammo:** Munition im `ammo`-Slot (`equipment.ammo` + `state.ammoCount`); nur passende, nicht-leere Munition feuert scharf und addiert `ammoDamage` (combat.ts:687–700). Verbrauch nie negativ.
- **Out-of-Ammo-Stopp:** greift sauber (combat.ts:777) — kein lautloser Notschlag, kein AFK-Loot-Verlust.
- **Pfeil-Tiers:** lückenlose 12-Tier-Leiter copper→godiron mit monoton steigendem `ammoDamage` (1 … 32); Top-Bogen schießt Top-Pfeil.
- **Bogen↔Pfeil-Kopplung:** jeder Tier-Bogen referenziert seinen Tier-Pfeil; `requirements.ranged/fletching` steigen tier-gerecht. Kein Top-Bogen→Low-Pfeil-Schlupf.
- **Krit/Tempo-Identität:** Ranged-Boni greifen (critChance +0.06 ≤0.85; aIMs ×0.90). L99 ranged crit 0.33, aIMs 1575 — schnellster Stil.
- **Munitionssenke real:** ~1.466 (L10) bis ~2.285 (L99) Pfeile/h → fühlbare Fletching/Schmiede-Senke; der einzige echte Ranged-Kostenfaktor. Beim Balancing **nicht** entwerten.
- **ironhide L60 (neu):** craftbar lw60–62, Stats (def 9–29 / eva 9–25 / hp 24–65 / rangedDamage 0–4) fügen sich monoton zwischen warhide (lw70) und studded (lw50) ein und füllen die L52→72-Lücke korrekt.
- **0 Tode** über alle 12 Läufe.

---

## Was fehlt für 9,5?
1. **Endgame-Durchsatz ins ±15 %-Band** (L99 1.39× → ≤1.15×): top-`ammoDamage`, godiron-Bogen-`rangedDamage` und/oder voidhide-`rangedDamage` (57) trimmen.
2. **Evasion-Tank auflösen** — Ranged darf nicht der beste Ausweicher sein: Gesamt-Leder-Evasion-Budget kürzen, Platte etwas Evasion geben, und den `leatherworking→dex`-Doppelfeeder kappen. Ziel eva/melee ≤ ~1.5×.
3. **Glass-Cannon-Kehrseite mit Zähnen** — unter Auto-Eat ist niedrige hp/def gratis. Food-/Auto-Eat-Druck, Auto-Eat-lose Boss-/Dungeon-Kontexte oder Spike-Damage, damit „weniger Defensive" wirklich wehtut.
4. **`voidhide_boots` rangedDamage** von 1 → ~11–12 fixen.
5. **Suffix-Ranged-Items** gegen Evasion-Restacking verifizieren (Random-Roll-Pools auf rangedDamage/crit/Tempo statt Evasion).

Erst wenn Durchsatz **und** Evasion gleichzeitig im Band sitzen und die geringere Defensive eine echte Kehrseite ist, ist Fernkampf bei 9,5 — die Mechanik trägt es längst.
