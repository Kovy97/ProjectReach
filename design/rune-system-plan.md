# Runen-System & Verzauberungs-Plan (High-Level)

Stand: 2026-06-26 | Status: Planung — kein Code

---

## 1. Ist-Zustand (Bestandsaufnahme)

**Runen heute (3 Typen):**

| Item | RC-Lvl | Input | Heute genutzt als |
|------|--------|-------|-------------------|
| `frost_rune` | 10 | `frost_essence` × 1 | Zutat: Frostmagie-Items, Mage-Robes |
| `aether_rune` | 30 | `aether_essence` × 1 | Zutat: Aether-Stäbe, höhere Foki/Roben |
| `void_rune` | 50 | `aether_essence` × 3 | Zutat: Void/God-Tier Stäbe, Roben |

**Essenzen (Drops / Gathering-Beifang):** `dim_essence`, `frost_essence`, `aether_essence`

**Magie-Waffen-Tiers (Runecrafting erzeugt):** Gnarled Staff (Starter) → Frost Scepter (Lvl 20) → Aether Runestaff (Lvl 35) → Stormcaller Rod (Lvl 50) → Voidcaller Staff (Lvl 70) → Godspark Staff (Lvl 88)

**Weapon-Effects (Engine-seitig fertig):** `burn`, `bleed`, `frost`, `shock` (alle items nutzbar); `poison` nur bei Monstern.

**Problem:** Runen sind reine Zutat für Mage-Items. Kein Weg, Nahkampf-/Fernkampf-Waffen oder Rüstungen zu verzaubern. Runecrafting bleibt rein Mage-Pfad.

---

## 2. Ziel

> Runen werden universelles **Verzauberungs-Material**. Jede Waffenklasse und ausgewählte Rüstungen können mit der passenden Rune veredelt werden. Runecrafting ist nicht mehr nur ein Mage-Skill.

Beispiel-Flow: Schmied schmiedet `steel_sword` → Runenkundiger bindet `fire_rune` (aus `fire_essence`) → erzeugt `flaming_steel_sword` mit `weaponEffect: burn`.

---

## 3. Neue Runen-Typen

### 3a. Elementar-Runen (aktive Waffeneffekte)

| Rune | Effekt-Typ | RC-Lvl | Input | Tier |
|------|-----------|--------|-------|------|
| `fire_rune` | burn (DoT) | 15 | `fire_essence` × 1 | 2 |
| `frost_rune` | frost (slow) | 10 | `frost_essence` × 1 | 2 (existiert) |
| `shock_rune` | shock (skip-turn) | 40 | `aether_essence` × 2 | 3 |
| `aether_rune` | (magicDmg-Boost) | 30 | `aether_essence` × 1 | 3 (existiert) |
| `void_rune` | multi / endgame | 50 | `aether_essence` × 3 | 4 (existiert) |

`shock_rune` ist neu (heute fehlt). `fire_rune` ist neu.

### 3b. Utility-Runen (passive Stat-Boni)

| Rune | Bonus | RC-Lvl | Input | Tier |
|------|-------|--------|-------|------|
| `force_rune` | meleeDamage, rangedDamage | 1 | `dim_essence` × 2 | 1 |
| `ward_rune` | defense, maxHp | 20 | `frost_essence` × 2 | 2 |
| `swift_rune` | accuracy, evasion | 45 | `aether_essence` × 2 | 3 |

Utility-Runen für Rüstungs-Verzauberungen — kein Waffeneffekt, sondern Stat-Boost aufs Item.

### 3c. Neue Essenz: `fire_essence`

Benötigt als Input für `fire_rune`. Quelle: Drop von Feuer-Monstern (zukünftige Feuer-Zone, z.B. Vulkan-Bereich) oder seltener Beifang aus Mining (Lava-Erze). Tier 2, `value: 20`.

---

## 4. Verzauberungs-System

### 4a. Konzept

- Neue Runecrafting-Aktions-Kategorie: **`rune_enchanting`**
- Schema: Basis-Item (Waffe/Rüstung) + Rune(n) + optional Barren/Material → verzaubertes Item (neues Item-ID)
- Verzaubertes Item ist eigenständige `ItemDef` (unterschiedliches Icon, eigener `value`, `rarity: "magic"` oder höher)
- Keine "Overwrite"-Mechanik an bestehenden Items — immer klare neue IDs (kein Migrations-Aufwand)

### 4b. Beispiel-Rezepte (grob, Zahlen Finetuning später)

| Rezept-ID | Inputs | Output | RC-Lvl | Neuer Effekt |
|-----------|--------|--------|--------|--------------|
| `enchant_flaming_sword` | `iron_sword` + `fire_rune` × 3 | `flaming_iron_sword` | 18 | burn 25% / 6 / 4s |
| `enchant_frostbite_bow` | `oak_longbow` + `frost_rune` × 4 | `frostbite_bow` | 22 | frost 30% / 1 / 4s |
| `enchant_storm_blade` | `steel_sword` + `shock_rune` × 4 | `storm_blade` | 45 | shock 25% / 0.25 / 3s |
| `enchant_void_scythe` | `mithril_sword` + `void_rune` × 5 | `void_scythe` | 60 | burn 35% + bleed 20% |
| `enchant_force_helm` | `iron_helm` + `force_rune` × 3 | `force_helm` | 8 | +8 meleeDamage |
| `enchant_warded_body` | `steel_body` + `ward_rune` × 5 | `warded_plate_body` | 28 | +12 defense, +30 hp |

Kombinierte Effekte (z.B. `void_scythe` mit 2 Effekten) sind Endgame — brauchen u.U. neues Engine-Feld. Zunächst nur 1 Effect/Item (kein Typ-Änderungs-Bedarf).

### 4c. Station / Skill

Verzauberung läuft als **Runecrafting-Aktion** (Kategorie `rune_enchanting`). Keine extra "Enchanting Table"-Station nötig. Einfach, passt ins bestehende Crafting-Muster (wie `enchant_frost_scepter` heute).

---

## 5. Rune-Drops (Spieler ohne Runecrafting)

Runen sollen auch durch Kampf zugänglich sein — Anreiz, Zonen zu farmen:

| Rune | Monster-Quelle (Drops) | Chance |
|------|----------------------|--------|
| `force_rune` | Goblins, schwache Humanoide | 15-25% |
| `fire_rune` | Feuer-Monster (neue Zone) | 20-30% |
| `frost_rune` | Frost-Wolf, Frost-Elfen etc. | 20-30% (existiert) |
| `shock_rune` | Storm-/Luftwesen (neue Zone?) | 15-20% |
| `aether_rune` | Dungeon-Caster, Nekromanten | 25-40% (existiert) |
| `void_rune` | Endgame-Zonen, Dungeon-Loot | 5-15% (existiert) |

Drop-Runen lassen sich sofort in Verzauberungsrezepten verwenden — kein Runecrafting-Skill nötig. Hohe RC-Level erschließen stärkere/seltenere Runen selbst herzustellen.

---

## 6. Runecrafting-Progression (neu)

| Lvl | Freigeschaltet |
|-----|----------------|
| 1-10 | force_rune, ward_rune Tier 1, einfache Waffenverzauberung (force) |
| 10-20 | frost_rune, Frost-Waffenverzauberung, erste Mage-Items |
| 15-25 | fire_rune, Feuer-Waffenverzauberung |
| 20-35 | frost_focus, Frost-Magie-Robe, ward_rune Tier 2 |
| 30-45 | aether_rune, Aether-Magie-Items |
| 40-55 | shock_rune, Storm-Waffenverzauberung, swift_rune |
| 45-65 | Aether-Rüstung, höhere Foki/Stäbe |
| 50-70 | void_rune, Void-Waffenverzauberung (kombiniert) |
| 65-88 | Void-Magie-Gear, Endgame-Roben |
| 88-99 | God-Tier Stäbe, legendäre Verzauberungen |

**Motivations-Anker:** Ein Nahkampf-Spieler braucht RC 18 für das Feuerschwert → Anreiz, den Skill zu leveln, auch ohne Magie-Build.

---

## 7. Ausbau-Ideen (später, nicht jetzt)

- **Kombinierte Runen:** `fire_rune + shock_rune → storm_fire_rune` (Fusion, Lvl 70+) → noch stärkere Verzauberungen
- **Runen-Scrolls:** Temporäre Buff-Konsumiergüter aus Runen (z.B. 5-min Feuer-Aura) → Alternative zu Glyphen
- **Runen-Set-Boni:** Wenn 3+ verzauberte Items derselben Rune ausgerüstet → Set-Bonus
- **Rune Tinkering / Overcharge:** Seltenere Runen-Varianten (z.B. `scorching_fire_rune`) mit höherem Effekt-Wert

---

## 8. Cross-Revier-Bedarf

| Was | Warum | An wen |
|-----|-------|--------|
| Neue ItemDef-Felder nötig? | Kombinierte weaponEffects (2 effects/item) | CEO → Logic-Dev (shared types) |
| `fire_essence` Drops | Braucht Feuer-Monster / neue Zone | CEO entscheidet ob und wann Feuer-Zone |
| `shock_rune` in Drops | Braucht Storm-Monster | Gleiche Frage wie Feuer-Zone |
| UI-Anzeige verzauberter Items | Rarity-Label, Effect-Icon | CEO → UI-Dev |
| Persistenz-Migration | Nur wenn Item-IDs umbenannt werden (hier: nur neue IDs) | Kein Bedarf bei reinem Hinzufügen |

---

## 9. Kern-Empfehlung

**Kurz-Prio:**
1. `fire_rune` + `shock_rune` als neue Runen-Items + Crafting-Aktionen (RC Lvl 15 / 40)
2. Kategorie `rune_enchanting` + 3-5 initiale Verzauberungs-Rezepte (Feuer-Schwert, Frost-Bogen, Storm-Klinge)
3. `force_rune` als Einstieg (Lvl 1, dim_essence) → sofort nützlich für Nahkampf

**Langfristig:**
- `ward_rune` / `swift_rune` für Rüstungs-Verzauberung
- Feuer-Zone (eigenes Planning) liefert `fire_essence`-Drops
- Kombinierte Runen erst nach Feuer-Zone + Balance-Sim

Kein neuer Engine-Typ nötig — alles passt in bestehendes `weaponEffect` + `bonus`-Schema, solange wir bei 1 Effect/Item bleiben.
