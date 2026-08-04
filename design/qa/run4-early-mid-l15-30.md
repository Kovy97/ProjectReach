# QA-Run 4 — Übergang Früh→Mid (Level 15–30)

**Tester:** Playtester-Analyst (READ-ONLY, kein Spiel-Code/Content geändert) · **Datum:** 2026-06-27
**Persona:** Spieler im Übergang L15–30. Fokus: Skill-Freischaltungen, erste Gear-Tiers (Bronze/Iron/Steel), Gold-Knappheits-Gefühl, Kauf-Entscheidungen im Shop, Skill-Vielfalt, Leerlauf/Walls, ob alle 3 Stile mithalten. Neue Seed-Shop-Fallbacks prüfen.
**Methode — echte Daten:** Direkt aus `packages/content/src/index.ts` (Items/Waffen/Monster/Crops/Shop) + `packages/engine/src/` (`character.ts` computeStats, `combat.ts` XP-/Kill-Logik, `equipment.ts`, `shared` Konstanten). Temporäres Sim-Harness in der Engine gefahren (`createGame`→`advance`-Ticks, deterministischer Seed, Auto-Armor-Best-Pick je Stil/Level, Auto-Eat T2) und **3 tier-gleiche Builds gegen die on-level Crypt-Mob-Leiter** (skeleton_warrior L16 / skeleton_butcher L24 / skeleton_icemage L30) über je 1 h gemessen, plus XP/h-Sweep über **alle** on-level Mobs L12–30. Harness nach dem Lauf **entfernt**. Alle Zahlen unten sind reale Sim-Ausgaben oder direkt aus den Daten gerechnet. Abgeglichen mit `run3-combat.md`, `run3-mid-game.md`, `run3-economy.md`, `run3-early-game.md`.

---

## Fun-Score: **7 / 10**

Das L15–30-Band ist **mechanisch sehr rund**: saubere, gleichmäßige Gear-Leitern (Bronze→Iron→Steel→Blacksteel je 10 Level für Melee/Ranged/Magie), breite Skill-Vielfalt, **0 Tode** über alle Sim-Läufe, **keine Walls, kein Leerlauf**, und — neu nachgewiesen — **keine XP-Trichter** mehr (das Per-Schaden-XP-Modell neutralisiert die `monster.xp`-Dichte; gleichstufige Mobs liefern nahezu identische XP/h, s. u.). Mehrere Run3-Fixes sind gelandet (ember-Robe schließt die Magie-Kadenz, tide_siren-XP entschärft, Seed-Shop-Fallbacks). **Der eine echte Dämpfer ist die 3-Stil-Parität:** Nahkampf ist an **jedem** Checkpoint der langsamste Stil (−37 bis −43 % Durchsatz ggü. Fernkampf), Fernkampf dominiert mit **1.59–1.74×**, Magie überschießt mid-band (**1.56×** bei L24). Genau die Persona-Frage *„halten alle 3 Stile mit?"* lautet im Band: **nein** — und der „Default"-Stil (Nahkampf/Schwert) ist die schwächste Wahl. Run3 hat das als P1 erkannt; der empfohlene Melee-Buff ist **nicht** gelandet. Deshalb 7/10 (sauberes, motivierendes Band, das eine bekannte Balance-Baustelle weiterträgt).

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, on-level Crypt-Mob, 0 Tode überall)

| Stil (Waffe) | L16 vs skeleton_warrior | L24 vs skeleton_butcher | L30 vs skeleton_icemage |
|---|---:|---:|---:|
| **Melee (dagger)** | 547 (1.00×) | 455 (1.00×) | 589 (1.00×) |
| Ranged (shortbow) | **916 (1.67×)** | **790 (1.74×)** | **937 (1.59×)** |
| Magic (staff) | 631 (1.15×) | **708 (1.56×)** | 687 (1.17×) |

Melee-Waffe = jeweils best-equippbarer Dolch (iron/steel/blacksteel, schon der run3-„beste Melee"-Build), Ranged = best Shortbow + Munition, Magic = best Stab; je Stil best-passende Auto-Armor (Platte/Leder/Robe). Begleit-Stats zeigen das Muster:
- **L24** Melee-Dolch: dmg 74, aIMs 2250, crit 0.19, **eva 61, def 121, hp 665**
- **L24** Ranged-Bogen: dmg 80, aIMs 1828, crit 0.27, **eva 122, def 93, hp 591**
- **L24** Magic-Stab: dmg 134, aIMs 2300, crit 0.10, **eva 102, def 71, hp 561**

Lesart: Nahkampf zahlt den DPS-Aufpreis für Tankigkeit (def 121, hp 665), die er **nicht braucht** (alle Stile 0 Tode mit Auto-Eat). Fernkampf hat **höhere Evasion als der Tank** (122 vs 61) **und** den schnellsten Takt (aIMs 1828 dank ×0.85-Bonus) **und** vergleichbaren Schaden — high-DPS ohne Glass-Cannon-Kehrseite. Magies dmg ist nominell am höchsten (int·2-Koeffizient), wird aber durch den langsameren Takt teils ausgeglichen — außer mid-band, wo es überschießt.

---

## Top-Stärken

1. **Gear-Leiter Bronze/Iron/Steel ist mustergültig getaktet.** Smithing: iron (L10) → steel (L20) → blacksteel (L30), exakt alle 10 Level (`forge_*` 4886/4922/4977). Identische Kadenz für Bögen (iron/steel/blacksteel shortbow, `ranged`/`fletching` 10/20/30) und Stäbe (iron/steel/blacksteel staff, magic_off-getiert). Im Band bekommt jeder Stil **zwei** klare Waffen-Upgrades — ein verlässlicher Craft-Dopamin-Takt.
2. **Keine XP-Trichter mehr — das XP-System balanciert sich selbst.** Gemessene ranged-XP/h, on-level, je Mob-Level: L16 ≈12.1k → L18 ≈14.7k → L20 ≈17.9k → L24 ≈25.3k → L26 ≈31.1k → L30 ≈41.6k — **monoton mit Mob-LEVEL, nicht mit `monster.xp`**. Gleichstufige Mobs mit völlig verschiedener `monster.xp` liefern **nahezu identische** XP/h: gray_wolf (L18, xp 72, dens 0.48) **14.733** vs skeleton_archer (L18, xp 13, dens 0.13) **14.726**; skeleton_spearman (L20, xp 18) **17.937** vs reef_drowned (L20, xp 35) **17.938**. Grund: Kampf-XP kommt primär aus **ausgeteiltem Schaden** (`damage·MELEE_XP_PER_DAMAGE 0.13·styleFactor`, `combat.ts:329`), `monster.xp` ist nur ein gedämpfter Kill-Bonus (`combat.ts:352`). Hoch-XP/hoch-Evasion-Mobs töten langsamer und kompensieren ihren Bonus exakt. → Die in run3 (P2 tide_siren) befürchtete Dichte-Trichter-Klasse ist im Spielverhalten **kein Problem**.
3. **Keine Walls, kein Leerlauf.** 1 h-Sim über die gesamte on-level L12–30-Leiter: 0 Tode, kontinuierlicher Durchsatz, monotone HP/Damage-Skalierung. Crypt bietet eine lückenlose Mob-Leiter L16/18/20/24/30 als roter Faden; Wildwood/Coast/Blackthorn ergänzen parallel.
4. **Skill-Vielfalt bleibt breit und mit intakten Ketten.** Im Band greifen Smithing/Mining (iron/steel-Pickaxe-Gates), Fletching (Pfeile + Bögen), Runecrafting (Robe-Gate), Leatherworking, Cooking/Fishing, Farming/Herblore, Thieving — alle mit on-level-Aktionen. Kein „Skill steht still"-Gefühl.
5. **Run3-Fixes nachweislich gelandet:** (a) **ember-Robe** (`ember_robe_*`, magic_off 30) schließt die run3-mid-P2-Lücke frost(22)→aether(40) — Kommentar „QA-Run3 Fix F" Z.3481; (b) **tide_siren.xp 340 → 90** (Z.8267) — run3-mid-P2 erledigt; (c) **Fernkampf-`evasion += 5` entfernt** (`character.ts:234-238`, run3-combat-P1); (d) **Seed-Shop-Fallbacks** bloodbeet/nightshade/ironvine (+ graywort/emberroot/wraithcap/godbloom) im Shop (Z.8854-8862) — schließt run3-early-P2 „verwaiste/unkaufbare Saat".

---

## Priorisierte Findings

### [P1 Balance] Nahkampf bleibt im ganzen L15–30-Band der Durchsatz-Boden — Run3-Melee-Buff nicht gelandet
**Befund (Sim oben):** Best-Melee (Dolch) ist an **jedem** Checkpoint der langsamste Stil: L16 547 / L24 455 / L30 589 kills/h = 1.00×; Fernkampf 1.67×/1.74×/1.59×, Magie 1.15×/1.56×/1.17×. Die Lücke zu Fernkampf ist im Band **groß und stabil (−37 bis −43 %)** — und damit nicht enger als die run3-combat-Messung (dort ranged 1.30–1.47×), eher breiter. Treiber unverändert: `meleeDamage = (1 + str·1.5 + power·0.8 + eq)` (`character.ts:221`) liefert keinen Tempo-/Krit-Vorteil; Nahkampf-Platte gibt def/hp statt Offense, was gegen on-level Mobs mit Auto-Eat (0 Tode) wertlos ist. Der run3-P1-Fixvorschlag („moderater Melee-Schadens-/Tempo-Bump im Mid-Game") ist im Code **nicht sichtbar** — die Waffenstats (iron_dagger meleeDamage 18 / steel 22 / blacksteel … bei aIMs −500) und die Formel sind unverändert.
**Persona-Wirkung:** Der Neuling, der intuitiv Nahkampf/Schwert wählt (der „Default"), spielt ~40 % langsamer als ein Bogenschütze — genau im Band, in dem man seinen Stil festlegt. Das untergräbt die freie Stilwahl.
**Fix-Vorschlag (content/combat):** Melee-Offense leicht anheben, bis der Dolch-Build im Band grob auf Bogen-Niveau liegt (z. B. `power`-Koeffizient 0.8→1.0 ODER Dolch-Linie aIMs schneller / Krit höher). Ziel-Band: alle Stile ±15 % über L16/24/30.
**Δ vs run3:** **Nicht verbessert.** evasion+5-Entfernung gelandet, aber wirkungslos auf den Durchsatz (Auto-Eat trivialisiert Survivability — wie run3 selbst vorhersagte); der eigentliche Hebel (Melee-Offense rauf) fehlt weiterhin.

### [P2 Balance] Magie überschießt mid-band (L24 1.56×) — `int·2` + inertes Mana unverändert
**Befund (Sim):** Bei L24 clearts Magie **1.56×** den besten Nahkampf — der höchste Einzelwert im Band, exakt das run3-combat-P2-Muster. magicDamage L24 = 134 vs Dolch 74 / Bogen 80. Ursache: `magicDamage = int·2 + magic_off·1.2 + eq` (`character.ts:223`, höchster Attribut-Koeffizient aller Stile) + Staff-magicDamage + zuverlässiger Burn-DoT je Cast; die intendierte Mana-Bremse ist inert (manaRegen ≥ manaCost im Dauerkampf). An L16/L30 ist Magie mit 1.15×/1.17× dagegen im Band — das Überschießen ist mid-spezifisch (frost-Robe + steel-Stab-Spitze).
**Fix-Vorschlag:** Erst Melee anheben (P1), dann Magie-Mid leicht glätten — z. B. `int·2 → int·1.7` ODER manaCost ~×1.5 (macht Mana im Dauerkampf real knapp und gibt Magies Überschuss eine Kehrseite). Nicht überkorrigieren — nur der Mid-Buckel.
**Δ vs run3:** **Nicht verbessert.** `int·2` und Mana-Ökonomie identisch zu run3.

### [P2 Balance] Fernkampf hat im Band keine Glass-Cannon-Kehrseite — Evasion weiter über Melee
**Befund (Sim):** Trotz Entfernung des `evasion += 5`-Stil-Bonus ist die Bogen-Evasion im Band **höher als die des „Tanks"**: L16 90 vs 47, L24 122 vs 61, L30 137 vs 70. Quelle: `evasion = 10 + dex·1 + sDefence·0.4 + eq` (`character.ts:238`) — dex ist Super-Stat (Schaden+Tempo+Krit+Evasion) und Leder trägt zusätzlich Evasion. Fernkampf ist damit Top-DPS **und** schwerer zu treffen; nur hp/def liegen tiefer, was Auto-Eat ausgleicht (0 Tode). Die intendierte „höchster Schaden, geringste Defensive"-Identität existiert auch nach dem Fix nicht.
**Fix-Vorschlag:** Bogen-/Leder-Evasion senken ODER `dex`-Evasion-Koeffizient für Fernkampf dämpfen, damit der Durchsatz-Vorsprung (P1) eine echte Kehrseite bekommt. Speist denselben Parität-Hebel wie P1.
**Δ vs run3:** evasion+5 **entfernt** (Symptom-Zahl korrigiert), aber die **Identität** ist unverändert — Fernkampf bleibt das rundeste Paket.

### [P3 Gear] Magie-Rüstungs-Kadenz im Band sparsamer als Melee/Ranged (L1–21 nur Apprentice-Robe)
**Befund:** In L15–30 bekommt Melee zwei Armor-Tiers (iron L10 → steel L20 → … blacksteel L30), Ranged analog Leder. Magie trägt von **magic_off 1 bis 22** durchgehend dieselbe **Apprentice-Robe** (Shop, `magic_off:1`), dann frost (magic_off 22, +runecrafting 20), dann ember (magic_off 30). Im Persona-Fenster **L15–21 also kein neuer Robe-Tier**, während die anderen Stile in derselben Spanne aufrüsten. ember (Z.3481, Run3-Fix F) hat die spätere Lücke geschlossen — die **frühe** L1–22-Spanne bleibt aber dünn.
**Fix-Vorschlag:** Eine Zwischen-Robe ~L10–12 (magic_off 10, Body magicDamage ~5, maxHp ~20) einschieben, analog zur iron/steel-Kadenz. Niedrige Priorität — Magie ist im Band ohnehin nicht schwach (P2), die fehlenden Robe-Stufen sind eher ein Fortschritts-Takt- als ein Power-Problem.
**Δ vs run3:** **Verbessert** (ember-Robe eingezogen); Rest-Lücke L1–22 unverändert.

### [P3 Economy] Gold-Knappheit endet früh — im L15–30-Band kaum echte Kaufspannung (bekannt/deferred)
**Befund (gerechnet):** Combat-Gold ist ungedämpft (CEO #113). On-level-Einkommen aus der Sim: L16 ~916 Kills × 31 g ≈ **28k g/h**, L24 ~790 × 55 ≈ **43k g/h**, L30 ~937 × 68 ≈ **64k g/h**. Demgegenüber die Pflicht-Käufe im Band: iron_platebody 320, iron_longbow 280, dim_focus 240, steel_warblade 700, Pickaxes iron 180 / steel 450, Auto-Eat T1/T2 2.000/8.000. → Selbst der teuerste Einzelposten ist in **Minuten** verdient; die in run3-economy für L1–12 gelobte „echte Kauf-Entscheidung"-Spannung ist bei L15–18 bereits am Abklingen, ab ~L25 praktisch weg. Die neuen Seed-Fallbacks (bloodbeet 18, nightshade 28, ironvine 55) sind Cent-Beträge — kein nennenswerter Sink.
**Persona-Wirkung:** „Warum farme ich Gold?" hat im Band noch eine schwache Antwort (Auto-Eat/Pickaxes), verliert sie aber gegen Bandende. Kein Blocker — Gear kommt aus Crafting/Drops, nicht aus Gold.
**Status:** Identisch zur run3-economy-Diagnose (Gold läuft mid tot, mitwachsender Sink fehlt) — **per Chef an die City-Welle gekoppelt (deferred)**. Hier nur als Band-spezifische Bestätigung.
**Δ vs run3:** Unverändert (deferred).

### [P3 Politur] Seed-Shop-Fallbacks weit vor Pflanzbarkeit kaufbar
**Befund:** nightshade_seed (Shop 28 g) und ironvine_seed (55 g) sind ab L1 kaufbar, ihre Crops aber erst bei Farming **L35** bzw. **L50** pflanzbar (bloodbeet L20 ist in-band ok). Funktional harmlos (Fallback erfüllt seinen Zweck — Saat ist nie unbeschaffbar), aber ein Spieler kann Saat horten, die er lange nicht nutzen kann; ein Levelhinweis am Shop-Eintrag oder die Crops nach Farming-Level gaten wäre sauberer.
**Fix-Vorschlag (optional, ui/content):** Pflanz-Level im Shop-Tooltip anzeigen.
**Δ vs run3:** **Neu** (Fallbacks sind die run3-Antwort auf „verwaiste Saat"; funktionieren, kleine Politur offen).

---

## Persona-Antworten (kompakt)

- **Skill-Freischaltungen / -Vielfalt:** Breit und gut getaktet; Crafting-/Gather-Ketten greifen on-level, kein Skill steht still. ✅
- **Erste Gear-Tiers (Bronze/Iron/Steel):** Mustergültige 10-Level-Kadenz für alle 3 Stile (Magie-Robe-Frühteil ausgenommen, P3). ✅
- **Gold-Knappheits-Gefühl:** Früh im Band noch spürbar, klingt bis ~L25 ab; danach Polster (bekannt/deferred). 🟡
- **Kauf-Entscheidungen im Shop:** Vorhanden (Platte vs. Bogen vs. Focus, Auto-Eat, Pickaxes, Glyphen 200–300 g als Timed-Buffs), aber durch das schnell lockernde Gold entwertet sich die Spannung. 🟡
- **Leerlauf / Walls:** Keine. 0 Tode, monotone Kurve, lückenlose Crypt-Mob-Leiter, keine XP-Trichter. ✅
- **Halten alle 3 Stile mit?** **Nein** — Melee ist Durchsatz-Boden (−37…−43 %), Fernkampf dominiert, Magie überschießt mid. Das ist der zentrale Befund (P1/P2). 🔴
- **Neue Seed-Shop-Fallbacks:** Vorhanden und funktionsfähig (bloodbeet/nightshade/ironvine + weitere), Preise sinnvoll über Forage-Wert; kleine Politur (Pflanz-Level-Anzeige). ✅

---

## Δ vs run3 — Fix-Status (Übersicht)

| run3-Finding | Status in run4 |
|---|---|
| run3-combat P1: Melee Durchsatz-Boden | 🔴 **nicht gefixt** — Melee weiter Boden, Lücke eher breiter |
| run3-combat P1: Ranged Glass-Cannon fehlt (evasion+5) | 🟡 evasion+5 **entfernt**, Identität/Durchsatz aber unverändert |
| run3-combat P2: Magie überschießt mid (`int·2`/Mana) | 🔴 **nicht gefixt** — L24 1.56×, `int·2` & Mana identisch |
| run3-mid P2: Magie-Robe-Kadenz-Lücke | 🟢 **gefixt** (ember-Robe magic_off 30); Frührest L1–22 offen |
| run3-mid P2: tide_siren XP-Trichter | 🟢 **gefixt** (340→90); XP-Modell macht Dichte ohnehin unkritisch |
| run3-early P2: verwaiste/unkaufbare Saat | 🟢 **gefixt** (Seed-Shop-Fallbacks inkl. graywort) |
| run3-economy P1: Gold läuft mid tot | ⏸️ **deferred** (City-Welle) — im Band bestätigt |

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice, großer Onboarding-Flow** — laut MEMORY spätere Meilensteine, nicht bewertet.
- **UI-Anzeige-Bugs (Köcher-Munition)** — run3-early-P1, UI-Revier; hier nicht erneut geprüft (reine Engine/Content-Linse).
- **Endgame-Skalierung, Slayer-Punkte-Ökonomie** — außerhalb der L15–30-Persona.
- **Sim-Harness** wurde nach den Läufen wieder **entfernt** (kein Datei-Rückstand in `packages/engine/src/`).
