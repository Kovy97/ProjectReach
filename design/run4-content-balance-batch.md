# Run-4 P2 Content-Balance-Batch — Zielzahlen für eine content-dev-Welle

> **Balance-Designer-Spec.** Bündelt die drei Run-4-P2-Balance-Findings aus
> `design/qa/run4-gather-farm-forage-herb.md`, `design/qa/run4-crafting-fletch-rune-leather.md`,
> `design/qa/run4-enchantment.md` zu **einem** Apply-Paket, das content-dev verbatim umsetzen kann.
> Revier: **alles `packages/content/src/index.ts`** (Items / Recipes / Affixes / Farming-Defs / Shop).
> Kein Engine-Code nötig — Shock liest die Engine bereits (`combat.ts:826/843` Spieler+Gegner-Skip,
> `effectiveInstanceWeaponEffects` mischt `weaponEffectByTier`). Stand 2026-06-27.
>
> Grounding = reiner Datenaudit gegen die o.g. Quelle (Zeilen-/Wert-Belege inline). Kein Sim-Harness
> angelegt; die Heil-/DoT-Mathematik unten ist aus den vorhandenen Content-Zahlen ableitbar.

---

## Punkt 1 — Crop-Verarbeitungs-Ökonomie (8 neue Crop-Consumables)

**Befund (run4-gather-farm-forage-herb [P2]):** Senken existieren, aber `cook_gallows_preserve`
(−472 g) und `brew_corpse_lily_salve` (−505 g) vernichten massiv Goldwert → rationaler Zug bleibt
„Rohware vendorn", die Senke läuft leer. Ursache sind **drei fehlbepreiste Roh-Crops**, deren
Vendorwert über dem plausiblen Heiltrank-Output liegt:
`gallows_apple` **280 g** (= godbloom-L95-Niveau, aber L50-Crop), `corpse_lily_bulb` **600 g** (L70),
`mandrake_root` **120 g** (L30). Output-Heilung auf deren Niveau zu heben würde Gold-Wäsche-Items
erzeugen → der saubere Hebel ist **Roh-Crop runterpreisen** (an die Tier-Nachbarn: emberroot L65 = 85 g),
dann Output = Break-even + kleine positive Marge, Heilung level-angemessen.

### 1a) Roh-Crop-Repreisung (Voraussetzung für Break-even)
| item | level (Farm) | value current | value **target** | Begründung |
|---|---|---|---|---|
| `gallows_apple`   | 50 | 280 | **70**  | L50-Crop; Nachbar emberroot(L65)=85, nightshade(L35)=26. 280 war Endgame-Niveau → Gold-Faucet. |
| `corpse_lily_bulb`| 70 | 600 | **150** | L70-Crop; höchste reguläre Crop unter godbloom(280, L95). 600 unbegründet. |
| `mandrake_root`   | 30 | 120 | **90**  | L30-Crop; leichte Korrektur, macht die Tinktur sauber positiv. |

> **Ökonomie-Hinweis (CEO):** Die `gallows_apple`-Senkung (280→70) reduziert eine wahrscheinlich
> unbeabsichtigte Gold-Quelle des Farmings deutlich (Ertrag 6–9/Ernte × 280 g war ein Faucet). Das ist
> beabsichtigt und Teil des Fixes — Farming-Gold fließt künftig über das *verarbeitete* Item statt über
> Roh-Vendor. Falls der CEO den Faucet behalten will: Alternative wäre, die Konfitüre auf heal ~140 /
> value ~150 zu lassen und `gallows_apple` bei ~140 zu halten (dann bleibt Verarbeiten leicht negativ,
> aber utility-attraktiv). **Empfehlung: repreisen.**

### 1b) Consumable-Zielwerte (heal/buff + value)
Heil-Benchmarks (vorhandener Content, je Level erreichbar):
potion_greater_heal 150 · cooked_crypteel 110 · cooked_wraithscale 145 · potion_potent_heal 240 ·
cooked_soulfish 270 · elixir_renewal 360. Input-Kosten **nach** 1a (je Rezept 2 Crops → 1 Output).

| id | recipe / skill·Lvl | feld current | feld **target** | value cur→**tgt** | input (nach 1a) | Δ Gold |
|---|---|---|---|---|---|---|
| `ashroot_broth`      | cook_ashroot_broth · Cook 1   | heal 15 | **heal 30**  | 12 → **16**  | 2×6+2 = 14  | **+2** |
| `grimwheat_porridge` | cook_grimwheat_porridge · Cook 3 | heal 20 | **heal 40** | 16 → **20**  | 2×8+2 = 18  | **+2** |
| `mandrake_tincture`  | brew_mandrake_tincture · Herb 30 | heal 100 | **heal 130** | 200 → **200** (keep) | 2×90+2 = 182 | **+18** |
| `nightshade_extract` | brew_nightshade_extract · Herb 35 | buff def+8 / 60 s | **def+8 / 90 s** | 80 → **80** (keep) | 2×26+3 = 55 | **+25** (schon ok) |
| `gallows_preserve`   | cook_gallows_preserve · Cook 50 | heal 60 | **heal 140** | 90 → **150** | 2×70+2 = 142 | **+8** |
| `emberroot_tonic`    | brew_emberroot_tonic · Herb 65 | buff hpRegen+2 / 120 s | **hpRegen+3 / 120 s** | 160 → **185** | 2×85+3 = 173 | **+12** |
| `corpse_lily_salve`  | brew_corpse_lily_salve · Herb 70 | heal 250 | **heal 290** | 700 → **320** | 2×150+3+2 = 305 | **+15** |
| `godbloom_infusion`  | brew_godbloom_infusion · Herb 95 | heal 380 | **heal 380** (keep) | 900 → **900** (keep) | 2×280+220+2 = 782 | **+118** (schon ok) |

Ergebnis: **alle 8 Verarbeitungen netto ≥ Break-even** (+2 … +118), Heilung trifft die
Level-Kurve (Konfitüre 140 statt 60 ≈ cooked_crypteel/wraithscale; Salbe 290 ≈ cooked_soulfish 270).
nightshade/godbloom bleiben unverändert (waren bereits positiv) — nur als „nicht anfassen" gelistet.

### Apply-Liste Punkt 1 (Revier: content-dev, `index.ts`)
1. `gallows_apple.value` 280 → **70**; `corpse_lily_bulb.value` 600 → **150**; `mandrake_root.value` 120 → **90**.
2. `ashroot_broth`: healAmount 15 → **30**, value 12 → **16**.
3. `grimwheat_porridge`: healAmount 20 → **40**, value 16 → **20**.
4. `mandrake_tincture`: healAmount 100 → **130** (value 200 unverändert).
5. `gallows_preserve`: healAmount 60 → **140**, value 90 → **150**.
6. `corpse_lily_salve`: healAmount 250 → **290**, value 700 → **320**.
7. `emberroot_tonic`: buff.bonus.hpRegenPerSec 2 → **3**, value 160 → **185**.
8. `nightshade_extract`: buff.durationMs 60_000 → **90_000** (kosmetische Parität; optional).
9. `godbloom_infusion`: **unverändert**.

---

## Punkt 2 — Reed-Farming-Gates an Runen-Bedarf angleichen

**Befund (run4-crafting [P2]):** Reed-Farming-Level liegen weit über dem erstkonsumierenden Runen-Level;
fertige Reeds sind **nicht** im Shop. Niedrigster Runecrafting-Konsument je Reed (Quelle: `index.ts`):

| Reed | yieldItem-Farm-Lvl (cur) | niedrigste konsumierende Rune | Runecrafting-Lvl | Cross-Skill-Gap (cur) |
|---|---|---|---|---|
| `reed_pale` | 6  | `craft_rune_keen_i`   | 15 | — (Reed früh genug) |
| `reed_iron` | **46** | `craft_rune_hunter_i` | **28** | **+18** (Ranged-Tier-I hängt allein an Farm 46) |
| `reed_void` | **84** | `craft_rune_keen_iii` | **62** | **+22** |

### 2a) Reed-Farming-Level retunen (Farm-Lvl ≈ knapp unter niedrigstem Konsument)
| Farming-Def | levelRequired cur → **target** | growMs | Begründung |
|---|---|---|---|
| `reed_pale` | 6 → **6** (keep) | 600_000 | bereits vor keen_i (L15) verfügbar, kein Gap |
| `reed_iron` | 46 → **26** | 2_400_000 (keep) | knapp unter hunter_i (L28) → Ranged-Tier-I sofort selbstversorgbar |
| `reed_void` | 84 → **58** | 9_600_000 (keep) | knapp unter keen_iii (L62); deckt alle Tier-III-Konsumenten (L62–74) |

growMs/yield unverändert — nur das Gate bewegt sich. Das schließt die Stil-Parität-Delle
(Ranged-Tier-I war als einzige Tier-I-Rune hinter Farm 46 versteckt).

### 2b) Fertige Reeds im Shop als Komfort-Fallback (Nicht-Farmer)
Vendorwerte: reed_pale 5 / reed_iron 18 / reed_void 80. Shop-Kaufpreis = ~1,5× Vendor → Farming bleibt
günstiger (Samen→Mehrfachertrag), Zukauf ist bezahlte Bequemlichkeit:

| neuer Shop-Eintrag | cost (Buy) | Quervergleich |
|---|---|---|
| `reed_pale` | **8**   | Samen palereed_seed 10 (Ertrag 6–9 → farmen billiger) |
| `reed_iron` | **30**  | Samen ironreed_seed 60 (Ertrag 8–12) |
| `reed_void` | **120** | Samen voidreed_seed 380 (Ertrag 12–18) |

### Apply-Liste Punkt 2 (Revier: content-dev, `index.ts`)
1. `farming` def `reed_iron.levelRequired` 46 → **26**; `reed_void.levelRequired` 84 → **58**.
2. Shop-Liste (bei den bestehenden Samen-Einträgen ~Z. 8912–8914): drei Buy-Einträge ergänzen
   `{ itemId: "reed_pale", cost: 8 }`, `{ itemId: "reed_iron", cost: 30 }`, `{ itemId: "reed_void", cost: 120 }`.

---

## Punkt 3 — Enchant-Runen-Balance: DoT-Garantie-Stat + neues Shock-Affix

### 3a) DoT-Runen (Flamme/Frost) vs Flat-Runen
**Befund (run4-enchantment [P2]):** `affix_flame`/`affix_frost` haben `bonusByTier: [{},{},{}]` —
**kein** Garantie-Stat, nur ein Chance-Effekt; gegen z. B. `affix_keen III` (+14 garantiert) sind sie
am 1-Slot-Item (common/poor) die rationale Niete, obwohl der reine DoT-DPS grob konkurrenzfähig ist
(Burn III = 14 dmg/s × 5 s = 70 pro Proc @25 % ≈ ~5–6 DPS ≈ keen III ~4,7 DPS bei 3 s-Intervall).
Das Problem ist **„garantiert vs. nichts"** plus DoT-Schwächen: Overkill an Trash, von `monsterResists`
negierbar, keine Crit-Synergie. Frost-magnitude ist zudem irrelevant (Slow ist binär, `FROST_SLOW = 0.4`),
skaliert also nur über chance/duration — korrekt, **nicht** anfassen.

**Empfehlung (primär = Option A): kleiner Garantie-Flat-Stat je Tier.** Da beide Affixe `any_weapon`
sind, gibt es keine universelle Damage-Stat → **Tri-Damage** ({meleeDamage, rangedDamage, magicDamage}
gleich), denn `computeStats` zieht nur den stil-relevanten Wert → effektiv „+X Waffenschaden, egal
welcher Stil". Flat bewusst **kleiner** als die reinen Flat-Runen (keen III = 14), weil der DoT/Slow
den Rest des Werts trägt — DoT bleibt die Identität, ist aber nie mehr strikt schlechter:

| Affix | bonusByTier T1 / T2 / T3 (je Feld m/r/m) | weaponEffectByTier (unverändert) |
|---|---|---|
| `affix_flame` | `{1,1,1}` / `{2,2,2}` / `{4,4,4}` | burn 0.15·4·3000 / 0.20·8·4000 / 0.25·14·5000 |
| `affix_frost` | `{1,1,1}` / `{2,2,2}` / `{3,3,3}` | frost 0.15·1·2500 / 0.22·1·3500 / 0.30·1·5000 |

(Schreibweise `{a,b,c}` = `{ meleeDamage: a, rangedDamage: b, magicDamage: c }`.) Frost minimal kleiner
flat als Flamme, da der 40 %-Slow defensiv stark ist. *Alternative B (falls kein Flat gewünscht):* Burn-
Chance je Tier auf 0.20/0.28/0.38 anheben — schließt aber die „garantiert"-Lücke nicht und lässt
Resist-Mobs die Rune wertlos machen; **A ist die saubere Lösung.**

### 3b) Neues Shock-Affix (`affix_shock`) — füllt die vorhandene Combat-Mechanik
**Befund (run4-enchantment [P3]):** `shock`-Status existiert in der Engine (Spieler+Gegner setzen bei
`nextFloat < magnitude` einen Angriff aus, `combat.ts:826/843`), Material `shock_rune`/`storm_essence`
existiert — aber **kein** Affix/Rune nutzt es. `shock`-`magnitude` = Aussetz-Chance 0..1 pro Gegner-Zug.
Schließt das fehlende vierte Element-Profil (neben flame/frost) als universelles Control-Affix.

**Affix-Eintrag** (Revier: content-dev — *ein* `affixes`-Eintrag, analog flame/frost; appliesTo `any_weapon`):
```
affix_shock: {
  id: "affix_shock",
  prefix: { en: "Storm", de: "Sturm" },
  bonusByTier: [
    { meleeDamage: 1, rangedDamage: 1, magicDamage: 1 },
    { meleeDamage: 2, rangedDamage: 2, magicDamage: 2 },
    { meleeDamage: 3, rangedDamage: 3, magicDamage: 3 },
  ],
  weaponEffectByTier: [
    { type: "shock", chance: 0.12, magnitude: 0.10, durationMs: 3000 },
    { type: "shock", chance: 0.16, magnitude: 0.15, durationMs: 4000 },
    { type: "shock", chance: 0.20, magnitude: 0.20, durationMs: 5000 },
  ],
  appliesTo: ["any_weapon"],
}
```
Zahlen-Begründung: `chance` = On-Hit-Apply (wie flame/frost-Reihe 0.15→0.30, hier minimal niedriger,
weil Shock = harte Angriffs-Negierung, stärker als ein Burn-Tick). `magnitude` = 10→20 % Aussetz-Chance
pro Gegner-Zug während Shock aktiv (defensives Pendant zum 40 %-Frost-Slow; bewusst < Frost, da Shock
volle Schläge streicht statt nur zu verlangsamen). Flat-Garantie identisch zu frost (Control-Profil).

**Begleit-Runen + Rezepte** (damit das Affix craftbar ist — 3 Tiers, 1:1 wie flame/frost):
| neue Rune-Items | value | rune-Feld | | neue Rezepte (skill runecrafting, cat rune_affixes) | Lvl | xp | dur | inputs |
|---|---|---|---|---|---|---|---|---|
| `rune_storm_i`   | 22  | `{ affixId:"affix_shock", tier:1 }` | | `craft_rune_storm_i`   | 20 | 5  | 8000  | essence_ash 2 · pigment_umber 1 · storm_essence 1 |
| `rune_storm_ii`  | 95  | `{ affixId:"affix_shock", tier:2 }` | | `craft_rune_storm_ii`  | 42 | 21 | 12000 | essence_grave 2 · pigment_verdant 2 · storm_essence 2 |
| `rune_storm_iii` | 320 | `{ affixId:"affix_shock", tier:3 }` | | `craft_rune_storm_iii` | 68 | 113| 18000 | essence_void 2 · pigment_radiant 2 · storm_essence 3 |

Werte/Level **exakt an der frost-Reihe gespiegelt** (frost_i value 22 @L20, frost_ii 95 @L42,
frost_iii 320 @L68) — hält die 7→8-Affix-Erweiterung in Stil-Parität. `storm_essence` (value 28, als
Drop+craftbar vorhanden) ist das Element-Input analog ember_essence (flame) / frost_essence (frost).

### Apply-Liste Punkt 3 (Revier: content-dev, `index.ts`)
1. `affix_flame.bonusByTier` `[{},{},{}]` → `[{m:1,r:1,a:1},{m:2,r:2,a:2},{m:4,r:4,a:4}]` (weaponEffectByTier unverändert).
2. `affix_frost.bonusByTier` `[{},{},{}]` → `[{1,1,1},{2,2,2},{3,3,3}]` (weaponEffectByTier + magnitude unverändert).
3. Neues `affix_shock` (Block oben) in `affixes` ergänzen.
4. Drei Rune-Items `rune_storm_i/ii/iii` (Werte/rune-Feld oben) ergänzen.
5. Drei Rezepte `craft_rune_storm_i/ii/iii` (cat `rune_affixes`, Werte oben) ergänzen.
6. **Kein Engine-Change** — `combat.ts` verarbeitet `shock` + `weaponEffectByTier` bereits; nur ein
   neuer Affix-/Content-Eintrag ist nötig.

---

## Kern-Zielzahlen (Kurzfassung für content-dev)
- **Crops:** `gallows_apple` 280→**70**, `corpse_lily_bulb` 600→**150**, `mandrake_root` 120→**90**;
  dann heal/value: ashroot_broth 30/16 · grimwheat_porridge 40/20 · mandrake_tincture **130**/200 ·
  gallows_preserve **140**/150 · corpse_lily_salve **290**/320 · emberroot_tonic regen**3**/185.
  Alle 8 Verarbeitungen netto **≥ Break-even** (+2 … +118).
- **Reeds:** Farm-Gate `reed_iron` 46→**26**, `reed_void` 84→**58**; Shop-Buy reed_pale **8** /
  reed_iron **30** / reed_void **120**.
- **Enchant:** Flat-Garantie auf flame/frost (Tri-Damage 1/2/4 bzw. 1/2/3); neues `affix_shock`
  (chance 0.12/0.16/0.20 · magnitude 0.10/0.15/0.20) + `rune_storm_i/ii/iii` (22/95/320, L20/42/68) +
  3 Rezepte. Engine bleibt unangetastet.
