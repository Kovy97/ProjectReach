# Crafting Rework Spec — Design Plan

**Datum:** 2026-06-27  
**Autor:** Content-Dev (PLAN-ONLY — kein Produktivcode, kein Edit an content/index.ts)  
**Auftraggeber:** Chef  
**Scope:** Leatherworking → "Crafting" Umbenennung + drei neue Inhalts-Linien + Cape-Slot füllen  
**Status:** Implementierungsreif nach Chef-Freigabe der offenen Entscheidungen (Abschnitt G)

---

## Audit-Ergebnis (Basis für diesen Plan)

### Aktueller Leatherworking-Skill

**Skill-Eintrag:** `leatherworking: { id: "leatherworking", name: { en: "Leatherworking", de: "Gerberei" } }`  
Kein `trains`-Attribut. 5 Kategorien bereits definiert: `leather_cured`, `leather_hardened`, `leather_scaled`, `leather_studded`, `leather_warhide`.

**Bestehende Items (Leatherworking):** 5 Material-Tiers, je 3 Slots (helmet/body/legs) — FEHLT überall: gloves, boots, cape.

| Tier | Material | Craft-Lvl (Ausrüstung) | Vorhandene Slots | Fehlende Slots |
|------|----------|------------------------|-----------------|----------------|
| T1 Cured | `cured_leather` (2× raw_hide → 1) | Lvl 1–5 | helmet, body, legs | gloves, boots |
| T2 Hardened | `hardened_leather` (2× scarred_hide → 1) | Lvl 22–24 | helmet, body, legs | gloves, boots |
| T3 Scaled | `scaled_leather` (Monster-Drop) | Lvl 28–30 | helmet, body, legs | gloves, boots |
| T4 Studded | `studded_leather` (2× scaled + 1× steel_bar → 1) | Lvl 50–52 | helmet, body, legs | gloves, boots |
| T5 Warhide | `warhide` (2× scaled + 1× mithril_bar → 1) | Lvl 70–72 | helmet, body, legs | gloves, boots |

**Bestehende Aktionen:** ~20 (5 Gerb-/Materialaktionen + je 3 Craft-Aktionen pro Tier)

**Kein Tier über Warhide (Lvl 70)** — die Leiter hört dort auf, während Smithing bis Lvl 105 (Godiron) geht.

### Magie-Roben (aktuell unter Runecrafting)

Die 4 bestehenden Robiertiers leben unter `skill: "runecrafting"` mit `category: "rune_staves"` — gemischt mit Waffencrafting. Kein eigenes Set-Feedback.

| Tier | Items | Craft-Lvl | Inputs | Lücken |
|------|-------|-----------|--------|--------|
| T1 Apprentice | hat + body (2pc) | Lvl 1 | dim_essence + cured_leather | fehlt: legs |
| T2 Frost | circlet + body + legs (3pc) | Lvl 20–22 | frost_essence + frost_rune + cured/hardened_leather | vollständig |
| T3 Aether | hood + body + legs (3pc) | Lvl 45–47 | aether_essence + aether_rune + scaled_leather | vollständig |
| T4 Godspark | mitre + vestment + skirt (3pc) | Lvl 88–90 | void_rune + aether_essence + warhide | vollständig |

### Cape-Slot

`cape` existiert in `EQUIP_SLOTS` und `EQUIP_SLOT_LABELS` (`shared/src/index.ts` Z. 378/394). **Kein einziges Item nutzt diesen Slot** — bestätigte Lücke im gesamten Content.

### Essenzen und Runecrafting-Supplies

Zwei getrennte Essenz-Familien:

| Familie | Items | Quelle | Wert |
|---------|-------|--------|------|
| **Runecrafting-Essenzen** | dim_essence, frost_essence, storm_essence, aether_essence, void_essence | Monster-Drops (Goblins/Shamanen/High-Mobs) | 6–80 |
| **Foraging-Essenzen** | essence_ash, essence_mire, essence_grave, essence_void, essence_divine | Foraging-Aktionen | 8–220 |
| **Runen** | force_rune, frost_rune, ward_rune, shock_rune, swift_rune, aether_rune, void_rune | Runecrafting (essence → rune) | 12–55 |

Foraging-Essenzen haben aktuell KEINEN Crafting-Input-Einsatz — potenzielle Stärkungs-Quelle für die Robe-Linie.

### Equip-Slots und Stat-Modell

Für Crafting relevante `EquipBonus`-Felder:
- **Leder/Range**: `defense`, `evasion` (Kern-Identity), `maxHp`, `rangedDamage` (kleiner Bonus)
- **Magie-Roben**: `defense` (schwach), `evasion` (moderat), `maxHp`, `magicDamage` (Kern), `modifiers.int`, `modifiers.wis`
- **Capes**: klein; Range-Cape = `evasion + rangedDamage`; Arcane-Cape = `magicDamage + manaRegen` o. `modifiers.int`

### Kategorie-Infrastruktur

`ActionDef.category?: string` und `ContentDB.categories: CategoryDef[]` **existieren bereits** und sind aktiv genutzt (Leatherworking + Smithing + Runecrafting). **Keine neue Infra nötig** — nur neue Kategorien-Einträge in content.

---

## A) Drei Crafting-Linien

### Linie 1 — Leder/Range-Rüstung (5 Slots pro Tier)

**Ziel-Palette:** helmet, body, legs, gloves (Vambraces), boots — 5 Items pro Tier. Cape kommt aus Linie 3. Kein Offhand (das ist Smithing).

**Stat-Identität:** `defense` ~50–60 % äquivalenter Smithing-Wert · `evasion` (DEX-skalierend, Smithing hat null) · `maxHp` ~70–80 % Smithing · optional `rangedDamage` +2–8 je nach Tier.

**Tabelle: Vollständige Tier-Palette** (`[EXIST]` = vorhandene 3 Items; `[NEU]` = neuer Slot oder neues Tier)

| Tier | Mat-Quelle | Craft-Lvl (body) | helmet | body | legs | gloves `[NEU]` | boots `[NEU]` |
|------|-----------|------------------|--------|------|------|----------------|--------------|
| T1 **Cured** | `tan_leather`: 2× raw_hide → cured_leather | Lvl 5 `[EXIST]` | `[EXIST]` | `[EXIST]` | `[EXIST]` | Craft Lvl 3 | Craft Lvl 2 |
| T2 **Hardened** | `tan_hardened_leather`: 2× scarred_hide → hardened_leather | Lvl 24 `[EXIST]` | `[EXIST]` | `[EXIST]` | `[EXIST]` | Craft Lvl 22 | Craft Lvl 22 |
| T3 **Scaled** | Monster-Drop direkt | Lvl 28–30 `[EXIST]` | `[EXIST]` | `[EXIST]` | `[EXIST]` | Craft Lvl 28 | Craft Lvl 28 |
| T4 **Studded** | `reinforce_studded_leather`: 2× scaled + 1× steel_bar → studded_leather | Lvl 52 `[EXIST]` | `[EXIST]` | `[EXIST]` | `[EXIST]` | Craft Lvl 50 | Craft Lvl 50 |
| T5 **Warhide** | `cure_warhide`: 2× scaled + 1× mithril_bar → warhide | Lvl 72 `[EXIST]` | `[EXIST]` | `[EXIST]` | `[EXIST]` | Craft Lvl 70 | Craft Lvl 70 |
| T6 **Dragonhide** `[NEU]` | `[CHEF]` — neue Hide-Quelle (Monster-Drop) | Lvl [BALANCE] ~82 | `[NEU]` | `[NEU]` | `[NEU]` | `[NEU]` | `[NEU]` |
| T7 **Shadowhide** `[NEU]` (optional) | `[CHEF]` — neue high-tier Hide | Lvl [BALANCE] ~95 | `[NEU]` | `[NEU]` | `[NEU]` | `[NEU]` | `[NEU]` |

**Input-Mengen-Konvention (Vorschlag, angelehnt an bestehende Werte):**

| Slot | Leather-Input qty | Craft-Duration | XP |
|------|-------------------|---------------|-----|
| gloves (vambraces) | 1 Leder-Mat | ~4 000 ms | [BALANCE] |
| boots (hide boots) | 1 Leder-Mat | ~4 000 ms | [BALANCE] |
| helmet | 2–3 Leder-Mat | ~6 000–8 000 ms | [BALANCE] |
| body | 4–6 Leder-Mat | ~8 000–14 000 ms | [BALANCE] |
| legs | 3–5 Leder-Mat | ~7 000–12 000 ms | [BALANCE] |

Alle XP via Standardformel `xp = round(target_xph(levelRequired) · durationMs / 3 600 000)`, min 1. [BALANCE-Domäne]

**Neue Item-IDs** (Namenskonvention `<tier>_leather_<slot>`):

Gloves: `cured_leather_vambraces`, `hardened_leather_vambraces`, `scaled_leather_vambraces`, `studded_leather_vambraces`, `warhide_vambraces`, `dragonhide_vambraces`

Boots: `cured_leather_boots`, `hardened_leather_boots`, `scaled_leather_boots`, `studded_leather_boots`, `warhide_boots`, `dragonhide_boots`

T6-Items: `dragonhide_helm`, `dragonhide_body`, `dragonhide_legs`, `dragonhide_vambraces`, `dragonhide_boots`

---

### Linie 2 — Magie-Roben (Migration + Erweiterung)

**Design-Empfehlung:** Die 4 bestehenden Robe-Tier-Aktionen **von Runecrafting nach Crafting migrieren** (`skill: "runecrafting"` → `skill: "leatherworking"` pending Umbenennung). Begründung: Roben brauchen Leder als Basis — das passt semantisch zu Crafting, nicht zu Runecrafting (Runen/Magie-Primär). Runecrafting bleibt zuständig für Waffen (Stäbe/Wands/Foki) und Runen-Herstellung.

Inputs bleiben identisch (keine Änderung an Materialien), nur der `skill`-Key ändert sich → **keine Save-Migration** (Skill-XP in Runecrafting wird zukünftig in Crafting verdient; bereits bestehende Runecrafting-XP bleibt erhalten). Das ist ein Tradeoff den der Chef kennen sollte (Punkt G7).

**Neue Kategorien** (ersetzen `rune_staves` für Robe-Actions):

| Kategorie-ID | Name (en / de) |
|---|---|
| `robe_apprentice` | "Apprentice Robes" / "Lehrlings-Roben" |
| `robe_frost` | "Frost Robes" / "Frost-Roben" |
| `robe_aether` | "Aether Robes" / "Aether-Roben" |
| `robe_godspark` | "Godspark Vestments" / "Götzenfunken-Ornat" |

**Vollständige Robe-Tier-Tabelle:**

| Tier | Items | Craft-Lvl | Primär-Input (Essenzen) | Sekundär-Input (Runen/Leder) | Rarity | Status |
|------|-------|-----------|------------------------|------------------------------|--------|--------|
| T1 **Apprentice** | hat, body, legs `[NEU: legs]` | Lvl 1–3 | 2–4× `dim_essence` | 1–2× `cured_leather` | superRare | legs ist neu |
| T2 **Frost** | circlet, body, legs | Lvl 20–22 | 4–6× `frost_essence` | 4–6× `frost_rune` + hardened_leather | epic | [EXIST] |
| T3 **Aether** | hood, body, legs | Lvl 45–47 | 4–6× `aether_essence` | 6–8× `aether_rune` + scaled_leather | epic | [EXIST] |
| T4 **Godspark** | mitre, vestment, skirt | Lvl 88–90 | 4–6× `aether_essence` | 8–12× `void_rune` + warhide | epic | [EXIST] |

**Ergänzung Apprentice-Legs (neues Item):**

```
apprentice_robe_legs:
  id: "apprentice_robe_legs"
  name: { en: "Apprentice Skirt", de: "Lehrlings-Gewand (Beine)" }
  slot: "legs"
  bonus: { defense: 2, evasion: 5, maxHp: 10 }
  modifiers: { int: 2 }
  requirements: { magic_off: 1 }
  value: [BALANCE]
  rarity: "superRare"
```

Craft-Aktion: `craft_apprentice_robe_legs` (Lvl 2, 4 000 ms, 3× dim_essence + 1× cured_leather)

**Stat-Identität der Roben vs Leder-Rüstung:**

| Wert | Leder (gleicher Lvl) | Robe (gleicher Lvl) |
|------|---------------------|---------------------|
| defense | Basis | ~35 % der Leder-Defense |
| evasion | Basis | ~80 % der Leder-Evasion |
| maxHp | Basis | ~65 % der Leder-HP |
| magicDamage | 0 | Kern-Bonus |
| modifiers.int | 0 | 2–14 je Tier |
| rangedDamage | +2–8 je Tier | 0 |

---

### Linie 3 — Capes (komplett neu, slot `cape`)

**Hintergrund:** Der `cape`-Slot ist im Spiel seit Engine-Beginn definiert, wird aber durch null Items gefüllt. Crafting ist die natürlichste Quelle. Zwei Stil-Linien: Range (Leder) und Arcane (Leder + Essenzen).

**Cape-Kategorie:** `capes` — Name: "Capes" / "Umhänge" (eine Kategorie, beide Stile darin)

**Tabelle: Alle Cape-Items (8 neue Items)**

| ID | Name (en / de) | Craft-Lvl | Inputs | Stat-Profil | Rarity |
|----|----------------|-----------|--------|-------------|--------|
| `leather_cape` | Leather Cape / Leder-Umhang | Lvl 8 | 2× cured_leather | defense +3, evasion +6 | common |
| `ranger_cape` | Ranger's Cape / Waldläufer-Umhang | Lvl 35 | 3× hardened_leather | defense +8, evasion +14, rangedDamage +3 | rare |
| `warden_cape` | Warden's Cape / Vogt-Umhang | Lvl 58 | 3× studded_leather | defense +14, evasion +20, rangedDamage +6, critChance +0.02 | rare |
| `warhide_cape` | Warhide Cape / Kriegsleder-Umhang | Lvl 73 | 3× warhide | defense +20, evasion +28, rangedDamage +9, critChance +0.02 | rare |
| `arcane_cape` | Arcane Cape / Arkan-Umhang | Lvl 12 | 2× cured_leather + 3× dim_essence | defense +2, evasion +5, magicDamage +3 | superRare |
| `frost_shroud` | Frost Shroud / Frost-Überwurf | Lvl 38 | 3× hardened_leather + 4× frost_essence | defense +6, evasion +12, magicDamage +7, manaRegen +0.5 | epic |
| `aether_mantle` | Aether Mantle / Aether-Mantel | Lvl 58 | 3× scaled_leather + 5× aether_essence | defense +11, evasion +16, magicDamage +12, modifiers.int +2 | epic |
| `void_cloak` | Void Cloak / Leerenmantel | Lvl 88 | 3× warhide + 6× void_essence | defense +16, evasion +20, magicDamage +18, modifiers.int +4, manaRegen +1 | epic |

> Alle Stat-Zahlen sind `[BALANCE-Platzhalter]` — balance-designer soll diese an die Tier-Kurven der anderen Slots ankoppeln. Capes sind ein "kleiner Slot" (analog zu Gloves/Boots), nicht body-äquivalent.

> Rarity: craftbar = max. **epic**, keine legendary/godly (Chef-Regel).

**Craft-Aktionen (alle `skill: "leatherworking"`, `category: "capes"`):**

```
craft_leather_cape:    Lvl 8,  durationMs ~5 000, xp [BALANCE]
craft_ranger_cape:     Lvl 35, durationMs ~8 000
craft_warden_cape:     Lvl 58, durationMs ~11 000
craft_warhide_cape:    Lvl 73, durationMs ~14 000
craft_arcane_cape:     Lvl 12, durationMs ~6 000
craft_frost_shroud:    Lvl 38, durationMs ~9 000
craft_frost_shroud:    Lvl 58, durationMs ~12 000
craft_void_cloak:      Lvl 88, durationMs ~18 000
```

---

## B) Neue Items (Volliste)

### B1 — Leder-Gloves (5 bestehende Tiers + 1 neuer Tier):

| Item-ID | Name (en) | Slot | Typ-Profil | Craft-Lvl |
|---------|-----------|------|-----------|-----------|
| `cured_leather_vambraces` | Cured Leather Vambraces | gloves | defense +2, evasion +4, maxHp +8 | 3 |
| `hardened_leather_vambraces` | Hardened Leather Vambraces | gloves | defense +4, evasion +5, maxHp +12 | 22 |
| `scaled_leather_vambraces` | Scaled Leather Vambraces | gloves | defense +5, evasion +7, maxHp +14 | 28 |
| `studded_leather_vambraces` | Studded Vambraces | gloves | defense +8, evasion +8, maxHp +20, rangedDamage +2 | 50 |
| `warhide_vambraces` | Warhide Vambraces | gloves | defense +11, evasion +10, maxHp +28, rangedDamage +3 | 70 |
| `dragonhide_vambraces` `[NEU-Tier]` | Dragonhide Vambraces | gloves | [BALANCE] | [BALANCE] ~82 |

### B2 — Leder-Boots (5 bestehende Tiers + 1 neuer Tier):

| Item-ID | Name (en) | Slot | Typ-Profil | Craft-Lvl |
|---------|-----------|------|-----------|-----------|
| `cured_leather_boots` | Cured Leather Boots | boots | defense +2, evasion +4, maxHp +8 | 2 |
| `hardened_leather_boots` | Hardened Leather Boots | boots | defense +4, evasion +5, maxHp +12 | 22 |
| `scaled_leather_boots` | Scaled Leather Boots | boots | defense +5, evasion +7, maxHp +14 | 28 |
| `studded_leather_boots` | Studded Leather Sabatons | boots | defense +8, evasion +8, maxHp +20 | 50 |
| `warhide_boots` | Warhide Treads | boots | defense +11, evasion +10, maxHp +28 | 70 |
| `dragonhide_boots` `[NEU-Tier]` | Dragonhide Boots | boots | [BALANCE] | [BALANCE] ~82 |

> Alle Werte `[BALANCE-Platzhalter]`. Profil: Gloves/Boots sind kleiner als Helm (Gloves ~Helm-Werte × 0.7, vergleiche Smithing §4.16/4.17 mit Gauntlets/Sabatons = 0.16 × B).

### B3 — Dragonhide-Tier (T6, komplett neu, 5 Items):

Material-Vorschlag: `dragonhide` (neues Material; Quelle: neue Monster-Drops oder als Gerbung aus einem neuen `raw_dragon_hide`). Alle Stats `[BALANCE]`.

| Item-ID | Slot | Rarity |
|---------|------|--------|
| `dragonhide_helm` | helmet | epic |
| `dragonhide_body` | body | epic |
| `dragonhide_legs` | legs | epic |
| `dragonhide_vambraces` | gloves | epic |
| `dragonhide_boots` | boots | epic |

Craft-Lvl: ~80–88. Set-Bonus: `dragonhide_set` (+rangedDamage +critChance).

### B4 — Capes (8 neue Items):
Bereits vollständig in Abschnitt A/Linie 3 tabelliert.

### B5 — Apprentice Robe Legs (1 neues Item):
Bereits in Abschnitt A/Linie 2 definiert: `apprentice_robe_legs`.

### B6 — Neue Tier-Sets (ContentDB.sets):

| Set-ID | Pieces | minPieces | Bonus-Profil |
|--------|--------|-----------|-------------|
| `cured_set` | cured_leather_cap, cured_leather_body, cured_leather_legs, cured_leather_vambraces, cured_leather_boots | 3 | evasion +5, maxHp +10 |
| `hardened_set` | hardened_leather_helm + body + legs + vambraces + boots | 3 | defense +5, evasion +8 |
| `scaled_set` | scaled_leather_helm + body + legs + vambraces + boots | 3 | evasion +10, rangedDamage +4 |
| `studded_set` | studded_leather_helm + body + legs + vambraces + boots | 3 | evasion +12, rangedDamage +6, critChance +0.01 |
| `warhide_set` | warhide_helm + body + legs + vambraces + boots | 3 | defense +12, evasion +14, rangedDamage +8 |
| `dragonhide_set` | dragonhide_helm + body + legs + vambraces + boots | 3 | [BALANCE] |
| `apprentice_robe_set` | apprentice_robe_hat + body + legs | 3 | magicDamage +3, modifiers.int +1 |

> Alle Set-Bonus-Zahlen `[BALANCE-Platzhalter]`. frost_robe_set und aether_robe_set existieren bereits.

---

## C) Materialversorgung

### C1 — Bestandsanalyse bestehender Materialien

| Material | Quellen | Bewertung |
|----------|---------|-----------|
| `raw_hide` | Mehrere frühe Monster (Wölfe, Hasen, Goblins 0.3–0.8 Chance) | AUSREICHEND |
| `scarred_hide` | Mehrere mittlere Monster (Bären, Ogres, Rocs 0.2–0.7 Chance) | AUSREICHEND |
| `scaled_leather` | 4+ Monster-Drop-Quellen (0.05–0.5 Chance), plus Thieving (0.05) | OK |
| `wyvern_scale` | Highland Wyvern (0.20 Chance, 1–2) → `tan_wyvern_scale` → warhide (2×) | BEGRENZT aber OK |
| `dim_essence` | Monster-Drops (Goblin-Schamanen etc., 0.2–0.5 Chance) | OK |
| `frost_essence` | Monster-Drops + mittlere Quellen | OK |
| `aether_essence` | Monster-Drops höherer Zonen + Foraging-Seitenprodukt | PRÜFEN bei höherem Bedarf |
| `void_essence` | High-Level-Monster + Foraging (forage_void_essence) | OK für Top-Tier |

### C2 — Neu benötigte Materialien für T6/T7

Wenn Dragonhide-Tier und optionaler Shadowhide-Tier hinzukommen:

| Neues Material | Vorschlag-ID | Vorschlag-Quellen | Tier |
|----------------|-------------|-------------------|------|
| Dragonhide | `dragonhide` | Neue High-Level-Drachen-Monster (Lvl 80+ Zone) ODER als Verarbeitung: `raw_dragon_hide` → `dragonhide` (neue Gerb-Aktion) | T6, Crafting Lvl ~80 |
| Shadowhide (optional) | `shadowhide` | Void/Shadow-Bereich-Monster (Lvl 90+ Zone) | T7, Crafting Lvl ~95 |

> Empfehlung: Dragonhide als Monster-Drop-Material ohne extra Gerb-Stufe (einfacher). Shadowhide nur wenn Chef T7 will. Diese neuen Hides brauchen **neue Monster in neuen Zonen** — Cross-Revier-Auftrag für content-dev (Monsters/Zones) nach Chef-Freigabe.

### C3 — Cape-Material-Deckung

Range-Capes: nur vorhandene Leder-Materialien (cured/hardened/studded/warhide) → KEIN neues Material nötig.

Arcane-Capes: `dim_essence`, `frost_essence`, `aether_essence`, `void_essence` → alle vorhanden. Supply ausreichend.

---

## D) Kategorie-Gruppen

### D1 — Infrastruktur

`ContentDB.categories: CategoryDef[]` und `ActionDef.category?: string` **existieren bereits** und sind live in content/index.ts. **Keine neue Engine- oder UI-Infra nötig.**

Die SkillPage gruppiert Aktionen automatisch per `category`. Ob Kategorien einklappbar sind, hängt von der UI-Implementierung ab — das ist eine ui-dev-Frage (s. `design/skill-rework-spec.md` P3-Notiz für Smithing). Für Crafting gilt dieselbe Infra.

### D2 — Neue Kategorien (alle in ContentDB.categories hinzufügen)

**Bestehende Leder-Kategorien beibehalten:**

| Kategorie-ID | Name (en / de) | Default-Zustand |
|---|---|---|
| `leather_cured` | "Cured" / "Gegerbt" | [EXIST] |
| `leather_hardened` | "Hardened" / "Gehärtet" | [EXIST] |
| `leather_scaled` | "Scaled" / "Schuppen" | [EXIST] |
| `leather_studded` | "Studded" / "Genietet" | [EXIST] |
| `leather_warhide` | "Warhide" / "Kriegsleder" | [EXIST] |

**Neue Kategorien:**

| Kategorie-ID | Name (en / de) | Inhalt |
|---|---|---|
| `leather_dragonhide` | "Dragonhide" / "Drachenleder" | T6-Dragonhide-Gear |
| `leather_shadowhide` | "Shadowhide" / "Schattenleder" | T7-Shadowhide-Gear (optional) |
| `robe_apprentice` | "Apprentice Robes" / "Lehrlings-Roben" | Apprentice-Robe-Aktionen |
| `robe_frost` | "Frost Robes" / "Frost-Roben" | Frost-Robe-Aktionen |
| `robe_aether` | "Aether Robes" / "Aether-Roben" | Aether-Robe-Aktionen |
| `robe_godspark` | "Godspark Vestments" / "Götzenfunken-Ornat" | Godspark-Aktionen |
| `capes` | "Capes" / "Umhänge" | Alle Cape-Aktionen |

**Robe-Aktionen-Rekategorisierung:** Bestehende Robe-Aktionen (z.B. `craft_frost_robe_body`) haben derzeit `category: "rune_staves"` und sollen auf die neuen `robe_*`-Kategorien umgestellt werden.

---

## E) Umbenennung und Migration

### E1 — Empfehlung: Nur Anzeigename ändern (keine ID-Änderung)

**Empfehlung: Interne ID `"leatherworking"` beibehalten, Anzeigename ändern.**

Änderung in `content/index.ts`:
```typescript
leatherworking: {
  id: "leatherworking",
  name: { en: "Crafting", de: "Handwerk" }   // war: "Leatherworking" / "Gerberei"
}
```

**Vorteile:** Keine Save-Migration, keine Änderung an Item-`requirements`, keine Änderung an Action-`skill`-Feldern, keine Persistence-Änderung, keine Engine-Änderung, kein SAVE_VERSION-Bump. Rein kosmetisch.

**Nachteile:** Interne IDs wie `achievements.ach_skill_leatherworking_10` bleiben `leatherworking`-bezogen (aber das ist für den Spieler unsichtbar). Sidebar-Icon wird aus `leatherworking.png` geladen (kein Bruch, aber das Icon zeigt ggf. "Gerberei"-Symbolik statt breiteres Handwerk-Bild).

### E2 — Alternative: ID auf `"crafting"` umbenennen (vollständige Migration)

**Wenn Chef ID-Umbenennung will:**

| Datei | Was ändern | Revier |
|-------|-----------|--------|
| `packages/shared/src/index.ts` | SAVE_VERSION `34 → 35`, ggf. SKILL_IDs-Update | logic-dev |
| `packages/persistence/src/index.ts` | Migration: `state.skills.leatherworking → state.skills.crafting`, alle Inventory-Item-Requirements | logic-dev |
| `packages/content/src/index.ts` | Skill-Key `leatherworking` → `crafting`, alle `skill: "leatherworking"` → `"crafting"`, alle `requirements: { leatherworking: N }` → `{ crafting: N }`, Achievement-IDs | content-dev |
| `apps/client/src/**` | Sidebar-Icon-Referenz (falls nach Skill-ID gebunden), i18n-Strings | ui-dev |

**Scope der Item-Requirements-Änderungen:** Betroffen sind alle Items mit `requirements: { leatherworking: N }`. Aus dem Audit: cured_leather_cap/body/legs, alle hardened/scaled/studded/warhide-Gear, warden_brigandine — ca. 15 bestehende Items.

**Empfehlung Zeitpunkt:** Wenn ID-Umbenennung, dann als ersten Schritt vor allen neuen Items, um spätere Re-Arbeit zu vermeiden.

### E3 — Robe-Migration: Runecrafting → Crafting

Für die 11 Robe-Craft-Aktionen (craft_apprentice_hat, craft_apprentice_robe, craft_frost_circlet, craft_frost_robe_body, craft_frost_robe_legs, craft_aether_hood, craft_aether_robe_body, craft_aether_robe_legs, craft_godspark_mitre, craft_godspark_vestment, craft_godspark_skirt):

- `skill: "runecrafting"` → `skill: "leatherworking"` (oder `"crafting"` nach Umbenennung)
- `category: "rune_staves"` → jeweilige neue Robe-Kategorie (`robe_apprentice` etc.)
- **Inputs und Loot bleiben unverändert**

**Save-Impact:** Kein SAVE_VERSION-Bump nötig — Skill-XP-Tracking ist per Skill-ID. Die Aktionen werden einfach einem anderen Skill zugeordnet. Spieler, die bisher Runecrafting-XP durch Roben-Crafting sammelten, werden ab Patch keine neue RC-XP dafür bekommen — stattdessen Crafting-XP. Akzeptabler Tradeoff (normale Progression-Anpassung), kein Save-Bruch.

> **Hinweis für Chef:** Spieler mit laufendem Robe-Crafting im `activeActionId` bekommen beim nächsten Tick `null` als aktive Aktion, da sich der Skill ändert — engine macht auto-stop bei Unknown-Actions. Das ist ein einmaliger, geplanter Abbruch, kein Datenverlust.

### E4 — Achievement-Updates

Die bestehenden Leatherworking-Achievements (ach_skill_leatherworking_10 … ach_skill_leatherworking_99) referenzieren `target: "leatherworking"` in ihrer Condition. Bei reiner Display-Umbenennung (E1) funktionieren diese weiter ohne Änderung. Bei ID-Umbenennung (E2) müssen alle `target: "leatherworking"` → `target: "crafting"` geändert werden (content-only, kein Save-Impact da Achievement-IDs nicht persistiert werden bei Level-Check).

---

## F) Datei-Impact und Reihenfolge

### F1 — Was jetzt angefasst wird (in Reihenfolge)

| Schritt | Datei | Was | Revier |
|---------|-------|-----|--------|
| 1 | `packages/content/src/index.ts` | Skill-Anzeigename ändern | content-dev |
| 2 | `packages/content/src/index.ts` | Robe-Aktionen: `skill` + `category` umstellen | content-dev |
| 3 | `packages/content/src/index.ts` | Neue Kategorien (robe_*, capes, ggf. dragonhide) eintragen | content-dev |
| 4 | `packages/content/src/index.ts` | Neue Cape-Items + Craft-Aktionen (8 Items, 8 Aktionen) | content-dev |
| 5 | `packages/content/src/index.ts` | Neue Gloves+Boots je T1–T5 (10 Items, 10 Aktionen) | content-dev |
| 6 | `packages/content/src/index.ts` | Apprentice-Robe-Legs (1 Item, 1 Aktion) | content-dev |
| 7 | `packages/content/src/index.ts` | Neue Tier-Sets (cured_set bis warhide_set, apprentice_robe_set) | content-dev |
| 8 | Balance-Pass | XP/Duration/Stats kalibrieren (via balance-designer) | balance-designer |

**Nach Chef-Freigabe (neue Tiers):**

| Schritt | Datei | Was | Revier |
|---------|-------|-----|--------|
| 9 | `packages/content/src/index.ts` | Dragonhide-Material + Dragonhide-Gear (T6, 5+1 Items, 5 Aktionen) + Monster-Drop-Sources | content-dev |
| 10 | (optional) `packages/content/src/index.ts` | Shadowhide T7 analog | content-dev |
| 11 (bei ID-Rename) | `packages/shared/src/index.ts` | SAVE_VERSION bump | logic-dev |
| 11 (bei ID-Rename) | `packages/persistence/src/index.ts` | Migration | logic-dev |
| 12 | `apps/client/src/**` | i18n-Strings für neuen Skill-Namen + ggf. Icon-Binding | ui-dev |

### F2 — Was bewusst NICHT jetzt gemacht wird

- **Smithing-Vollpalette** (240 Items): separater Auftrag, eigene Spec in `design/smithing-stats-spec.md`
- **Neue Monster/Zonen** für Dragonhide: content-dev muss nach Freigabe Monster + Zone in content/index.ts anlegen
- **UI-Einklapp-Funktion** für Kategorien: ui-dev, wenn Chef P3-Smithing-UX-Notiz umsetzt (gilt dann für alle Skills inkl. Crafting automatisch)
- **Ranged-Waffen / Bögen** aus Crafting: bleibt Fletching (kein Scope-Creep)
- **Legendary/Godly Capes**: Chef-Regel (craftbar max. epic) — keine Legendary-Capes
- **Cape für Melee (STR)**: wäre Smithing-Domäne (z.B. Towershield-Klasse); bewusst nicht in Crafting

---

## G) Offene Chef-Entscheidungen

1. **Skill-Anzeigename:** "Crafting" + "Handwerk" oder eine andere deutsche Übersetzung ("Fertigung", "Kunsthandwerk")?

2. **Interne Skill-ID umbenennen (`leatherworking` → `crafting`)?** Ja = SAVE_VERSION-Bump + logic-dev-Auftrag + alle Requirements in content anpassen. Nein = nur Name, sofort umsetzbar, keine Migration.

3. **Robe-Migration aus Runecrafting?** Ja = Roben-Crafting zieht von Runecrafting zu Crafting um (empfohlen). Nein = Roben bleiben unter Runecrafting, Crafting bekommt einen separaten neuen Robe-Zweig (Duplikat-Risiko, nicht empfohlen).

4. **Wie viele Leather-Tiers über Warhide?** Option A: 1 neuer Tier (Dragonhide, Lvl ~82, 5 Items). Option B: 2 neue Tiers (Dragonhide + Shadowhide, bis Lvl ~95). Option C: bei Warhide stoppen (dann endet Crafting bei Lvl 72 — Lücke bis Lvl 95 Endgame).

5. **Neue Hides via neue Monster oder via Gerb-Aktion aus neuem Raw-Material?** Monster-Drop = einfacher. Gerb-Kette (raw_dragon_hide → dragonhide) = mehr Progression-Tiefe, aber mehr Content-Aufwand.

6. **Neue Namen für T6/T7:** Dragonhide und Shadowhide (Vorschläge) oder andere Tier-Namen?

7. **Apprentice-Robe-Legs hinzufügen?** Kleine Änderung (1 Item + 1 Aktion), vervollständigt das frühe Mage-Set. Empfohlen: Ja.

8. **Robe-Gloves und Robe-Boots?** Derzeit nicht geplant (Roben enden bei Legs). Wenn Chef eine vollständigere Mage-Ausrüstung will: je 4 weitere Items + Aktionen (Arcane Gloves, Arcane Boots pro Tier). Aufwand: mittel. Empfehlung: erstmal ohne, im Folge-Pass ergänzen.

9. **`trains`-Attribut für Crafting?** Aktuell fehlt es. Vorschläge: `dex` (Fingergeschick), `lck` (Materialglück), oder weglassen (Verarbeitungs-Skills haben oft kein `trains`). Empfehlung: `dex` (passt zur Range-Identität).

10. **Cape-Anzahl je Tier: 2 Stile (Leather + Arcane) oder 1?** Plan hat beide (8 Capes total). Wenn Chef weniger will: nur Leather-Capes (4 Capes) und Arcane-Capes in separatem Folge-Pass.

---

## Anhang: Item-Wiring-Checkliste (für content-dev nach Freigabe)

Jedes neue Item muss:
- **Quelle:** via Craft-Aktion aus Crafting-Skill erreichbar ✓ (alle Items oben craftbar)
- **Senke:** `value > 0` (verkaufbar) ✓ — alle Equipment-Items haben positiven Wert; ODER equippable (Equipment) ✓
- **Bilingual:** `name: { en: "...", de: "..." }` ✓ (alle Items oben mit en+de)

Keine neuen Item-IDs überschneiden sich mit bestehenden IDs (geprüft gegen Audit-Ergebnis). Neue Material-Items (dragonhide, shadowhide) brauchen zusätzlich mindestens eine Quelle (Monster-Drop ODER Craft-Aktion).
