# QA-Run 2 — Mid-Game Playtest (Level 25–60)

**Tester:** Playtester-Agent (Analyse/QA, kein Code geändert) · **Datum:** 2026-06-27
**Scope:** Mid-Game L25–60. Fokus: kürzlich überarbeitete Systeme (Crafting/Leder/Roben/Capes, Farming-Plots, Thieving-Toggle, Jewelcrafting-Lücke L38–55, Combo-Food, Fleisch-Varianten) + Skill-Vielfalt, Gear-Progression, Combat-Balance, Fun.
**Methode:** Direkt aus `packages/content/src/index.ts` (Items/Actions/Monsters/Crops) + Engine (`character.ts` computeStats, `combat.ts`, `tick.ts`) gemessen/nachgerechnet; abgeglichen mit den jüngsten Balance-Docs (`balance-audit-styles-2026-06-26.md`, `combat-economy-rebalance.md`, `skill-usage-audit-run2.md`). Alle Zahlen unten sind aus dem aktuellen Content gezogen.

---

## Fun-Score: **7 / 10**

Solides, erstaunlich vollständiges Mid-Game. Die Run-2-Reworks sind **alle gelandet und sauber**: Jewelcrafting reicht jetzt bis L100 (Lücke L38–55 mit Bloodstone gefüllt), Mining hat die L22/25-Einschübe, Fishing die neuen Stufen (L25/L60), Farming-Plots P1–P3 stehen, Combo-Food (heal+timed buff) ist eine echte Bereicherung, der Thieving-Toggle ist voll verdrahtet. Die Hauptbremse fürs Spielgefühl ist **Stil-Parität**: Melee bekommt im Mid-Game ständig neue Rüstung und beiläufige Boni, Magie/Fernkampf deutlich seltener — der Build-Spaß ist ungleich verteilt. Keine P0-Bugs gefunden.

---

## Top-Stärken

1. **Jewelcrafting-Rework ist top.** Lückenlose Leiter Garnet(1)→Sapphire(15/18)→Ruby(34/38)→**Bloodstone(44/48, NEU)**→Diamond(55/60)→Stormcaller(65)→Onyx(70/75)→Heartforged(82)→Voidstone(85/88)→Godgem(95/100). Boni steigen monoton, Endgame-Reichweite jetzt = Smithing/Runecrafting. Die im Audit gemeldete Totlauf-Stelle ist geschlossen.
2. **Combo-Food** (`bloodgrain_stew` L38: heal 70 + 120 s Buff hpRegen2/melee4/def6; `soulgourd_brisket` L58: heal 115 + 180 s Buff hpRegen4/def10/crit3 %) verbindet Heilung **und** Timed-Buff aus mehreren Crop/Meat-Inputs → echte Koch→Kampf-Senke, „nice to have"-Gefühl. Geschlossener Loop mit Farming-Crops.
3. **Skill-Dichte im Mid-Game ist breit:** 13 Skills mit Aktionen in L25–60 (smithing 73, runecrafting 23, leatherworking 16, inscription 15, fletching 12, cooking 11, foraging 11, jewelcrafting 11, herblore 9, thieving 7, fishing 6, mining 6, woodcutting 5). Output→Senke-Ketten sind durchgängig intakt.
4. **Thieving careful/bold-Toggle ist sauber verdrahtet** (`tick.ts`): wirkt auf Erfolgschance (±5 Pp), Stun (0.5×/1.5×), **und** Gold/Loot/XP-Belohnung (0.85×/1.2×). Kein „Schein-Toggle" — EV kippt real je nach Erfolgsquote.
5. **Farming-Plots + 27 Crops (L1–95)** mit guter Mid-Game-Verteilung (26/30/35/42/44/46/50) speisen Cooking/Herblore/Inscription. Plot-UI P1–P3 steht.

---

## Priorisierte Findings

### [P1 Balance] Magie-Rüstung verhungert im Mid-Game (Body/Helm/Legs)
**Befund (gemessen):** Tragbare Magie-Rüstungstiers: Apprentice(L1) → Frost(L22) → **Aether(L45–47)** → Godspark(L88). Im gesamten Bereich **L47–88 (41 Level!) gibt es kein neues Roben-Body/Helm/Legs**. Zum Vergleich dieselbe Spanne:
- **Melee-Plate (Smithing):** L20/30/40/50/60/70/80 → Upgrade **alle 10 Level** (steel→blacksteel→mithril→adamantium→runite→bloodiron→titanium), Boni def 24→94 / maxHp 60→235.
- **Ranged-Leder:** L24/30/52/72 (hardened→scaled→studded→warhide), Lücken 22 & 20.
- **Magie-Roben:** L22/47/88, Lücken **25 & 41**.

Ein L55-Magier trägt also seit L47 dieselbe Aether-Robe und kriegt erst bei L88 ein Upgrade — während der Melee-Spieler 4× neu craftet. Das untergräbt „drei Stile gleichwertig versorgt" und nimmt dem Magier die Crafting-Dopamin-Schleife.
**Fix-Vorschlag (content-dev):** 1–2 Zwischen-Roben-Tiers einschieben, z. B. ~L58 und ~L72 (runecrafting-gegated, Motive vorhanden: zwischen Aether und Godspark). Magnitude linear interpolieren (Body magicDamage ~22/~26, maxHp ~68/~80).

### [P1 Balance] Ranged bleibt der stärkste Stil im Mid-Game
**Befund:** Auch nach den angewandten Trims (`*_shortbow` aIMs jetzt **−150**, Arrow 0.27·D) liegt Ranged bei L50 laut nachgerechneter Effektiv-DPS klar vorn (`balance-audit-styles`: L50 Ranged ~40–42 vs Melee 30.8 vs Magie 35–36). Treiber ist der **dex-Super-Stat** (Schaden + Intervall + Krit + Evasion in einem). Der Bogen gibt zusätzlich `evasion` (z. B. mithril_shortbow +5) → Ranged ist nicht einmal squishier als Ausgleich.
**Fix-Vorschlag:** Entweder Shortbow-Intervall-Bonus weiter entschärfen (−150→−100) **oder** den evasion-Bonus von Bögen streichen, damit „Glass-Cannon"-Identität echt wird. Chef-Entscheid: Ranged bewusst als DPS-König (dann evasion weg) vs. Band straffen.

### [P2 Balance] Combat-XP-Trichter: Coast/Wildwood entwerten andere Zonen (L20–45)
**Befund (gemessen, XP pro Monster-HP):**
| Monster | Lvl | maxHp | xp | xp/hp | Zone |
|---|---|---|---|---|---|
| reef_drowned | 20 | 180 | **90** | 0.50 | coast |
| ash_tyrant | 20 | 180 | 28 | 0.16 | ashfields |
| skeleton_spearman | 20 | 130 | 18 | 0.14 | crypt |
| wild_stag | 26 | 240 | **160** | 0.67 | wildwood |
| spectral_stag | 28 | 140 | 26 | 0.19 | blackthorn |
| dire_wolf | 34 | 330 | **290** | 0.88 | wildwood |
| skeleton_pyroclasp | 36 | 280 | 70 | 0.25 | crypt |

Coast/Wildwood-Mobs geben **2,5–4× die XP-Dichte** gleichstufiger Crypt/Ashfields/Blackthorn-Mobs. Für echte Bosse (forest_bear, deep_kraken, dire_wolf) ist das per Doc gewollt (tanky Premium), aber **normale Mobs** wie `reef_drowned` (L20) und `wild_stag` (L26) sind keine Bosse und machen Crypt/Ashfields/Blackthorn fürs Combat-Leveling faktisch obsolet. (Bekannt: `balance-combat-2.md` Z. 161 notiert „Coast/Wildwood-Mobs durchweg höhere xp" — aber die Magnitude bei Nicht-Bossen ist zu hoch.)
**Fix-Vorschlag:** Nicht-Boss-Coast/Wildwood-`xp` Richtung `xp ≈ level·k` der übrigen Zonen ziehen (reef_drowned 90→~35, wild_stag 160→~55); Boss-Premium (forest_bear/deep_kraken/dire_wolf) bewusst behalten.

### [P2 Balance] Jewelcrafting unterversorgt Magie im Mid-Game
**Befund:** Zwischen Sapphire-Amulett (L18, magicDamage 5) und Stormcaller (L65) / Onyx (L70) gibt es **kein magie-spezifisches Schmuckstück**. Die neuen/mittleren Tiers sind melee/ranged-lastig: Ruby (L34/38) = nur meleeDamage, **Bloodstone (L44/48) = melee+ranged, kein magicDamage**, Diamond (L55/60) = defensiv. Ein Magier L40–60 hat also keinen sinnvollen Damage-Ring/-Amulett-Craft.
**Fix-Vorschlag:** Ein Magie-Schmuckstück ~L46 ergänzen (z. B. „Spellbinder Ring" magicDamage 8 / accuracy 6), analog zu Bloodstone für die anderen Stile.

### [P2 UX/Balance] Mid-Game-Combo-Food buffd nur Melee-Schaden
**Befund:** `bloodgrain_stew` (L38) Buff = meleeDamage 4; `witherleek_bouillabaisse` (L75) = meleeDamage 8. Erst `ambergrain_feast` (L90) gibt ranged/magicDamage. Ranged/Magie-Spieler bekommen im Mid-Game aus Combo-Food nur Heal+Def+Crit, nie ihren Schadensstat.
**Fix-Vorschlag:** Eine ranged/magie-orientierte Combo-Food-Variante ~L48–55 (z. B. Buff rangedDamage/magicDamage statt melee), damit der Cooking-Buff allen Stilen dient.

### [P3 Politur] Thieving-Toggle: Wahl wirkt subtil
**Befund:** careful/bold sind voll funktional und EV-relevant, aber der ±5-Pp-Erfolgsdelta ist klein, während der Reward-Delta groß ist (0.85× vs 1.2×). Bei hohen Erfolgsquoten (spätere Levels) dominiert **bold** für XP/Gold; bei Frisch-Freischaltung (sb ~0.5) ist careful knapp vorn. Die Wahl „kippt", fühlt sich aber wegen der kleinen Erfolgsspanne wenig konsequent an.
**Fix-Vorschlag:** Spanne schärfen (z. B. ±8–10 Pp Erfolg, Reward 0.8×/1.3×, Stun 0.4×/1.6×), damit „dreist vs. vorsichtig" sich nach echter Entscheidung anfühlt; erwartete Erfolg-% pro Modus im UI anzeigen.

### [P3 Politur] Mining-Rest-Lücke L25→35
**Befund:** Nach den Einschüben Steel(L22)/Gravesteel(L25) bleibt bis Mithril(L35) eine 10-Level-Erz-Pause. Tolerierbar (deutlich besser als die alte 20-Level-Totzone), aber noch der größte Gather-Gap im Mid-Game.
**Fix-Vorschlag:** Optional 1 Gem-Seam oder Erz-Stufe ~L30; kein Muss.

---

## Combat-Kurve L25–60: kein Wall, keine Trivialität
Monster-HP/Damage skalieren glatt und monoton (z. B. L24 moss_golem 160hp/16dmg → L45 forest_bear 520hp/70dmg → L60 deep_kraken 620hp/78dmg). Defense-Mitigation (`def/(def+125)`, Cap 80 %) und Auto-Eat fangen die DPS-Spitzen ab; die jüngsten Sim-Läufe (`combat-economy-rebalance`, `balance-combat-2`) bestätigen ~4000–8000 XP/h ohne `kills=0`-Walls. Die einzigen Balance-Themen sind die **Stil-Parität** (oben) und der **Zonen-XP-Trichter** — keine Schwierigkeits-Mauer.

## Skill-Vielfalt: abwechslungsreich, leicht melee-gefärbt
Genug sinnvolle Aktionen + klare Senken pro Skill in L25–60. Wiederkehrendes Muster über mehrere Systeme: **beiläufige Boni sind melee-lastig** (Mid-Tier-Jewelcrafting, Combo-Food-Buffs, Ruby/Bloodstone). Einzeln je P2/P3, in Summe der Grund, warum sich ein Magier/Bogen-Build im Mid-Game weniger „belohnt" anfühlt als ein Melee-Build. Das ist die wichtigste übergreifende Stellschraube für den nächsten Balance-Pass.
