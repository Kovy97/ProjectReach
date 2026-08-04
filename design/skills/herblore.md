# Herblore — Ausbau-Plan (Trank-/Tonika-Brauen)

> **Status:** PLAN-ONLY (balance-designer). Kein Content-/Code-Edit. Zahlen sind
> balance-konservative Platzhalter, an bestehenden Buff-/Heil-Items geeicht.
> Umsetzung: content-dev (Items + Actions), ggf. logic-dev (siehe Engine-Abhängigkeiten).

## 1. Rolle im Utility-Modell
Chef-Kette: **Foraging/Farming → Herblore/Inscription → Power.**
Herblore ist der **Haupt-Konsum-Sink der Kräuter**: es verbraucht Kräuter (A, primär),
Essenzen (B) und Pilze (E) und produziert **Consumables, die im Kampf/Idle wirklich
gebraucht werden** — Heiltränke, Kampf-Tonika, Antidote/Schutz und Skilling-Tonika.

**Identitäts-Abgrenzung zu Inscription (Glyphen):**
| Achse | Inscription-Glyphe | Herblore-Tonikum |
|---|---|---|
| Dauer | **300 s** (sustain, „set & forget") | **60–120 s** (burst, vor Boss/Welle nachlegen) |
| Magnitude | moderat, dauerhaft | **höher pro Stufe**, aber kurz → häufiges Nachbrauen = Kräuter-Sink |
| Extra-Rollen | nur Buffs | **Heilung, Antidot/Ward, Skilling** (Glyphen können das nicht) |

Buffs stapeln engine-seitig pro `itemId` (`character.buffs[]`), d.h. eine Glyphe **und** ein
Tonikum dürfen gleichzeitig aktiv sein — gewollte Inscription×Herblore-Synergie.

---

## 2. Cross-Skill-Vertrag — konsumierte Input-IDs
Tiers: T1 (Lv 1–20) … T5 (Lv 81–99). Herblore konsumiert **A primär**, B/E sekundär.

**A) Kräuter (Foraging + Farming) — voll spezifiziert, Rückgrat jedes Rezepts:**
`herb_marshroot`(T1) · `herb_bloodthistle`(T2) · `herb_gravemoss`(T3) · `herb_nightbloom`(T4) · `herb_godsbreath`(T5)

**B) Essenzen (Foraging):** Endpunkte `essence_ash`(T1) … `essence_divine`(T5) spezifiziert.
**E) Pilze (Foraging):** Endpunkte `fungus_soot`(T1) … `fungus_god`(T5) spezifiziert.

> ⚠️ **ANNAHME (mit Foraging-Owner abgleichen):** Für T2–T4 fehlen die mittleren
> Essenz-/Pilz-IDs im Vertrag. Dieser Plan nimmt folgende Leiter an und **markiert sie
> als zu bestätigen**. Falls Foraging andere IDs vergibt, nur die Sekundär-Inputs
> umbenennen — Mengen/Balance bleiben:
> - Essenzen: `essence_ash`(T1) · `essence_ember`(T2) · `essence_storm`(T3) · `essence_void`(T4) · `essence_divine`(T5)
> - Pilze: `fungus_soot`(T1) · `fungus_blight`(T2) · `fungus_grave`(T3) · `fungus_pale`(T4) · `fungus_god`(T5)

**Basis-Items (NEU — content-dev anlegen, billig, Shop-kaufbar):**
- `vial_of_water` (`material`, value 2) — Lösungsmittel für Tränke/Heilung.
- `clear_oil` (`material`, value 3) — Träger für Kampf-Tonika (öliger Buff-Träger).

---

## 3. XP-Eichung (Zielkurve)
Modell: `target_xph(L) = 90·sqrt(xpForLevel(L+1) − xpForLevel(L))`,
`xp = round(target_xph(level)·durationMs/3_600_000)`, min 1.
Referenz erreicht: L1 ≈ 820/h, L50 ≈ 9,3k/h, L99 ≈ 105k/h. Alle XP-Werte unten sind
**exakt aus dieser Formel** für die jeweilige (Level, Dauer)-Kombination berechnet.

---

## 4. Master-Rezeptliste (23 Rezepte, T1–T5)

Spalten: Action-`id` · Output-Item · Lv · Dauer(ms) · XP · Inputs(Vertrags-ID ×Menge) · Effektwerte.
Sekundär-Inputs T2–T4 = angenommene IDs (siehe §2).

### T1 — Lv 1–20 (`herb_marshroot`, `essence_ash`, `fungus_soot`)
| action id | output item | Lv | Dauer | XP | Inputs | Effekt |
|---|---|---|---|---|---|---|
| `brew_minor_heal` | `potion_minor_heal` | 1 | 3500 | 1 | marshroot×2, vial_of_water×1 | **Heal 30** (sofort) |
| `brew_forager_tonic_i` | `tonic_forager_i` | 3 | 4000 | 1 | marshroot×1, fungus_soot×1, vial_of_water×1 | **Skilling-Tonikum** +5 % Sammel-XP, 300 s ⚠️ENGINE |
| `brew_oxblood_tonic` | `tonic_oxblood` | 5 | 4500 | 1 | marshroot×2, essence_ash×1, clear_oil×1 | **Buff** dmg(all)+4, 90 s |
| `brew_antidote` | `potion_antidote` | 8 | 5000 | 2 | marshroot×2, fungus_soot×1, vial_of_water×1 | **curesPoison** + Heal 20 |
| `brew_lesser_heal` | `potion_lesser_heal` | 12 | 5500 | 2 | marshroot×2, vial_of_water×1 | **Heal 55** |
| `brew_stoneskin_tonic` | `tonic_stoneskin` | 16 | 6000 | 3 | marshroot×2, essence_ash×1, clear_oil×1 | **Buff** def+10, maxHp+30, 90 s |

### T2 — Lv 21–40 (`herb_bloodthistle`, `essence_ember`*, `fungus_blight`*)
| action id | output item | Lv | Dauer | XP | Inputs | Effekt |
|---|---|---|---|---|---|---|
| `brew_heal` | `potion_heal` | 21 | 6500 | 4 | bloodthistle×2, vial_of_water×1 | **Heal 90** |
| `brew_keeneye_tonic` | `tonic_keeneye` | 26 | 7000 | 6 | bloodthistle×2, essence_ember×1, clear_oil×1 | **Buff** accuracy+14, critChance+0.05, evasion+6, 90 s (Ranged-Profil) |
| `brew_forager_tonic_ii` | `tonic_forager_ii` | 32 | 7500 | 8 | bloodthistle×1, fungus_blight×1, vial_of_water×1 | **Skilling** +8 % Sammel-XP, 300 s ⚠️ENGINE |
| `brew_bloodrage_tonic` | `tonic_bloodrage` | 38 | 8000 | 11 | bloodthistle×2, essence_ember×1, clear_oil×1 | **Buff** dmg(all)+12, 75 s (Burst) |

### T3 — Lv 41–60 (`herb_gravemoss`, `essence_storm`*, `fungus_grave`*)
| action id | output item | Lv | Dauer | XP | Inputs | Effekt |
|---|---|---|---|---|---|---|
| `brew_greater_heal` | `potion_greater_heal` | 41 | 9000 | 15 | gravemoss×2, vial_of_water×1 | **Heal 150** |
| `brew_greater_antidote` | `potion_greater_antidote` | 46 | 9500 | 20 | gravemoss×2, fungus_grave×1, vial_of_water×1 | **curesPoison** + Buff def+12, 90 s |
| `brew_arcane_surge` | `tonic_arcane_surge` | 52 | 10000 | 28 | gravemoss×2, essence_storm×1, clear_oil×1 | **Buff** magicDamage+16, maxMana+30, manaRegen+2, 90 s (Magie-Profil) |
| `brew_harvest_tonic` | `tonic_harvest` | 58 | 11000 | 42 | gravemoss×1, fungus_grave×1, vial_of_water×1 | **Skilling** +10 % Sammel-XP, 300 s ⚠️ENGINE |

### T4 — Lv 61–80 (`herb_nightbloom`, `essence_void`*, `fungus_pale`*)
| action id | output item | Lv | Dauer | XP | Inputs | Effekt |
|---|---|---|---|---|---|---|
| `brew_potent_heal` | `potion_potent_heal` | 61 | 12000 | 53 | nightbloom×2, vial_of_water×1 | **Heal 240** |
| `brew_ironbark_tonic` | `tonic_ironbark` | 66 | 12500 | 71 | nightbloom×2, essence_void×1, clear_oil×1 | **Buff** def+18, maxHp+60, evasion+8, 90 s |
| `brew_warding_elixir` | `elixir_warding` | 72 | 13000 | 99 | nightbloom×2, fungus_pale×1, vial_of_water×1 | **curesPoison** + Buff def+16, maxHp+50, 120 s (DoT-Überleben) |
| `brew_warpath_tonic` | `tonic_warpath` | 78 | 14000 | 144 | nightbloom×2, essence_void×1, clear_oil×1 | **Buff** dmg(all)+18, critChance+0.05, 75 s (Burst) |

### T5 — Lv 81–99 (`herb_godsbreath`, `essence_divine`, `fungus_god`)
| action id | output item | Lv | Dauer | XP | Inputs | Effekt |
|---|---|---|---|---|---|---|
| `brew_elixir_renewal` | `elixir_renewal` | 81 | 15000 | 179 | godsbreath×2, essence_divine×1, vial_of_water×1 | **Heal 360** |
| `brew_godharvest_tonic` | `tonic_godharvest` | 86 | 16000 | 245 | godsbreath×1, fungus_god×1, vial_of_water×1 | **Skilling** +12 % Sammel-XP, 300 s ⚠️ENGINE |
| `brew_apex_tonic` | `tonic_apex` | 90 | 17000 | 317 | godsbreath×2, essence_divine×1, clear_oil×1 | **Buff** dmg(all)+16, critChance+0.06, accuracy+12, 90 s |
| `brew_panacea_elixir` | `panacea_elixir` | 94 | 18000 | 409 | godsbreath×2, fungus_god×1, vial_of_water×1 | **curesPoison** + Buff def+22, maxHp+80, evasion+10, 120 s |
| `brew_godsbreath_elixir` | `godsbreath_elixir` | 99 | 20000 | 582 | godsbreath×3, essence_divine×1, fungus_god×1 | **Capstone-Buff** dmg(all)+22, critChance+0.08, critDamage+0.25, **60 s** (ultimativer Burst) |

**Zählung:** Heilung 6 · Kampf-Buffs 8 + Capstone 1 · Antidot/Ward 4 · Skilling 4 = **23**.

---

## 5. Output-Items — Felder für content-dev

**Heiltränke** (`type:"consumable"`, `stackable:true`, `healAmount:N`). Stärker & sofort
(1 Tick) als Cooking-Food (Food-Top = `cooked_soulfish` heal 270); Tränke = Panik-Burst.
| item id | healAmount | rarity | value |
|---|---|---|---|
| `potion_minor_heal` | 30 | common | 20 |
| `potion_lesser_heal` | 55 | common | 35 |
| `potion_heal` | 90 | magic | 60 |
| `potion_greater_heal` | 150 | magic | 110 |
| `potion_potent_heal` | 240 | rare | 200 |
| `elixir_renewal` | 360 | epic | 380 |

**Kampf-Tonika** (`buff:{ durationMs, bonus:EquipBonus }`). Nur `EquipBonus`-Felder:
`meleeDamage,rangedDamage,magicDamage,defense,accuracy,evasion,maxHp,maxMana,manaRegen,critChance,critDamage,attackIntervalMs`.
„dmg(all)" = identischer Wert auf melee/ranged/magic (stil-neutral, vgl. `glyph_of_might`).
| item id | durationMs | bonus | rarity | value |
|---|---|---|---|---|
| `tonic_oxblood` | 90 000 | melee/ranged/magicDamage +4 | common | 25 |
| `tonic_stoneskin` | 90 000 | defense +10, maxHp +30 | common | 30 |
| `tonic_keeneye` | 90 000 | accuracy +14, critChance +0.05, evasion +6 | magic | 70 |
| `tonic_bloodrage` | 75 000 | melee/ranged/magicDamage +12 | magic | 110 |
| `tonic_arcane_surge` | 90 000 | magicDamage +16, maxMana +30, manaRegen +2 | rare | 150 |
| `tonic_ironbark` | 90 000 | defense +18, maxHp +60, evasion +8 | rare | 180 |
| `tonic_warpath` | 75 000 | melee/ranged/magicDamage +18, critChance +0.05 | epic | 280 |
| `tonic_apex` | 90 000 | melee/ranged/magicDamage +16, critChance +0.06, accuracy +12 | epic | 360 |
| `godsbreath_elixir` | 60 000 | melee/ranged/magicDamage +22, critChance +0.08, critDamage +0.25 | legendary | 600 |

**Antidot/Ward** (`curesPoison:true` + optional `buff`). ⚠️ Engine-Regel (`useConsumable`):
hat ein Item ein `buff`-Feld, wird **nur der Buff** angewandt, `healAmount` ignoriert.
Antidot+Ward koppeln daher `curesPoison` mit einem `buff` (kein `healAmount`).
Ausnahme `potion_antidote`: nur `curesPoison`+`healAmount` (kein Buff → Heal greift).
| item id | curesPoison | buff (bonus / durationMs) | healAmount | rarity | value |
|---|---|---|---|---|---|
| `potion_antidote` | ✓ | – | 20 | common | 25 |
| `potion_greater_antidote` | ✓ | defense +12 / 90 000 | – | magic | 80 |
| `elixir_warding` | ✓ | defense +16, maxHp +50 / 120 000 | – | rare | 190 |
| `panacea_elixir` | ✓ | defense +22, maxHp +80, evasion +10 / 120 000 | – | epic | 420 |

**Skilling-Tonika** — siehe §7 (Engine-Abhängigkeit). Items/Effektwerte oben gelistet,
aber **bis zum Engine-Support geparkt**.

---

## 6. Sink-Matrix — welcher Trank bedient welche Senke (inkl. Zonen-Gating)

| Trank | Senke | Konkretes Gating / Pflicht-Bedarf |
|---|---|---|
| Heiltränke (`potion_*_heal`, `elixir_renewal`) | Auto-Eat / Panik-Heal in jedem Kampf | **Pflicht** in Enrage-Fights, wo Schaden spät hochschießt: `roc_storm` (L75, enrage 1.7×), `forest_bear` (L45), `deep_kraken` (L60, enrage 1.6×), `last_idol` (L120, enrage 1.75×). Tier ≈ Zonen-Level. |
| `potion_antidote` (T1) | Gift-Cleanse | **Borderlands:** `goblin_felmagician` (L11, poison 0.25). Früheste Gift-Senke. |
| `potion_greater_antidote` (T3) | Gift-Cleanse + Def | **Blackthorn:** Dornen-Wurzlinge & Spinnen (L16–30, poison bis mag 4–6). **Slagpit:** Gift-Spinne (~L30, poison mag 6). |
| `elixir_warding` (T4) | Gift-Cleanse + DoT-Überleben | **Crypt:** `skeleton_nekro` / Nekromantenfürst (L45, poison mag 6 + regen 5). maxHp/def-Puffer trägt durch die DoT-Phase. |
| `panacea_elixir` (T5) | Gift-Cleanse + maximaler Ward | **Idolhall / Endgame** (L92–120): allgemeiner DoT-/Burst-Puffer für `idol_warden`, `last_idol`. |
| `tonic_keeneye` (Ranged-Profil) | DPS-Buff Ranged | Stil-Parität: gibt Ranged crit+acc+eva (Identität laut Kampfkonzept), damit etwas niedrigerer Roh-Schaden ausgeglichen wird. |
| `tonic_arcane_surge` (Magie) | DPS + Mana-Sustain | Magie-Identität: maxMana/manaRegen halten lange Casts am Laufen. |
| `tonic_oxblood/bloodrage/warpath/apex`, `godsbreath_elixir` | Roh-DPS-Burst (alle Stile) | Boss-/Dungeon-Burst; kurze Dauer ⇒ vor jedem Run nachbrauen = Kräuter-Sink. |
| `tonic_stoneskin/ironbark` | Tank-Buff | Überleben in hohen Zonen, ergänzt Heiltränke. |
| Skilling-Tonika | +Sammel-XP | Selbst-Beschleunigung der Foraging/Farming-Schleife (⚠️ Engine, §7). |

**Resistenz-Hinweis:** `curesPoison` reinigt **nur Gift**, nicht bleed/burn/frost/shock.
Für diese DoTs gibt es heute **keinen Resist-Stat** — Mitigation läuft über die
maxHp/defense-Ward-Tonika (überleben statt cleanen). Echte Element-Resistenz wäre eine
neue Mechanik → §7.

---

## 7. Engine-Abhängigkeiten (für CEO → logic-dev, NICHT balance)

1. **Skilling-Tonika brauchen ein neues Buff-Feld.** `EquipBonus` (`packages/shared`)
   kennt nur Kampfwerte; Skill-XP/Ausbeute kommen aus `ActionDef` und sind nicht
   buff-bewusst. **Ohne Erweiterung sind die 4 Skilling-Tonika nicht umsetzbar.**
   Vorschlag: `gatherXpMult?: number` (z.B. 0.05–0.12) in `EquipBonus` ODER separates
   `consumableEffect`, das der Skilling-Tick liest. Bis dahin: 4 Skilling-Rezepte
   **parken**; restliche 19 sind sofort umsetzbar.
2. **`buff` schließt `healAmount` aus.** `useConsumable` wendet bei vorhandenem `buff`
   nur den Buff an (heal wird ignoriert). Darum kombiniert **kein** Item Heilung+Buff;
   Antidot+Ward nutzen `curesPoison`+`buff` ohne `healAmount` (siehe §5). Kein Engine-Fix
   nötig — nur Content-Disziplin.
3. **Optional/Zukunft — Element-Resistenz.** Kein Resist-Stat vorhanden. Falls später
   gewünscht (echte Pflicht-Tränke gegen burn/frost/shock-Zonen), bräuchte es ein
   Status-Resist-/Immunitäts-Feld. Dieser Plan umgeht das via maxHp/def-Ward.

---

## 8. Apply-Liste für content-dev (Reihenfolge)

1. **Basis-Items anlegen:** `vial_of_water` (value 2), `clear_oil` (value 3) in `items`.
2. **Mit Foraging-Owner abgleichen:** mittlere Essenz-/Pilz-IDs T2–T4 (§2-Annahme
   bestätigen oder umbenennen). Kräuter A + Endpunkt-Essenzen/-Pilze müssen existieren.
3. **Output-Items anlegen** (§5): 6 Heiltränke, 9 Kampf-Tonika, 4 Antidot/Ward.
   (Bestehende `minor_/greater_healing_potion`, `antivenom_tonic`, `salve_of_mending`,
   `bloodmend_draught`, `revenant_elixir` sind Alt-Tränke auf Legacy-Kräutern — **nicht
   Teil dieses Vertrags**; entweder belassen oder später auf die neue Leiter migrieren.)
4. **Brew-Actions anlegen** (§4): 19 sofort umsetzbar; **4 Skilling-Tonika erst nach
   Engine-Support (§7-1) — vorerst weglassen.**
5. XP/Dauer **exakt aus §4 übernehmen** (Zielkurve bereits eingerechnet).
6. **Skilling-Tonika** erst nach logic-dev-Erweiterung nachziehen.

> Geprüft gegen: `packages/content/src/index.ts` (Items 242–401, Glyphen 346–353,
> Herblore-Actions 5306–5369, Monster/Zonen 5480–6246), `packages/shared/src/index.ts`
> (`ItemDef` 804–862, `EquipBonus` 432–450), `packages/engine/src/consumable.ts`
> (Buff-/Heal-Logik), `packages/engine/src/leveling.ts` (XP-Tabelle).
