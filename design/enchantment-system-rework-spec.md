# Enchantment System Rework — Spec

**Stand:** 2026-06-27 | **Status:** PLAN (kein Code bearbeitet)

---

## 0. Audit: Aktueller Zustand

### Was existiert heute

**Runecrafting** ist ein aktiver Crafting-Skill mit drei Aufgaben:

1. **Runen binden** (`rune_runes`-Kategorie): 8 Runen-Typen, die durch Essenzen hergestellt werden.
   - `force_rune` ← `dim_essence` (L1)
   - `frost_rune` ← `frost_essence` (L15)
   - `fire_rune` ← `ember_essence` (L20)
   - `ward_rune` ← `frost_essence` (L25)
   - `shock_rune` / `swift_rune` ← `storm_essence` (L35/L40)
   - `aether_rune` ← `aether_essence` (L50)
   - `void_rune` ← `void_essence` (L65)

2. **Magische Waffen / Stäbe / Wands / Foki craften** (`rune_staves`, `rune_wands`, `rune_foci`): produziert fertige Magic-Gear-Items direkt aus Essenzen + Runen — ohne ein „Basis-Item" zu konsumieren.

3. **Gear verzaubern — WIRD ABGELÖST** (`rune_enchanting`-Kategorie): Basis-Gear-Item + Rune(n) → enchanted Item mit eigener ID. 11 waffenspezifische Rezepte (L5–L88), deterministisch.

**Inscription** ist ein zweiter Crafting-Skill mit:

1. **Tinten / Vellum / Sigillen** herstellen (`inks`, `vellums`, `glyphs`): Glyphen (Sigille) sind konsumierbare Materialien in 7 Typen (`sigil_might`, `sigil_ember`, `sigil_frost`, `sigil_storm`, `sigil_swift`, `sigil_ward`, `sigil_void`).

2. **Gear beschriften — WIRD ABGELÖST** (`inscription_enchanting`-Kategorie): ebenfalls Basis-Gear + Sigil(le) → neues Item mit anderer ID. 10 Rezepte (L10–L90). Auch deterministisch.

3. **Schriftrollen** scrieben (`glyphs`): `scroll_of_overload`, `scroll_of_aegis`, `scroll_of_cataclysm` — zeitlich begrenzte Buff-Consumables.

**Kein bestehendes Enchant-Interface:** Die Verzauberung läuft heute wie jede andere Crafting-Aktion (select action → tickt ab → Output im Inventar). Es gibt keine separate UI-Seite, keine Enchant-Slots am Item.

**Nicht vorhanden:** Runecrafting hat *keine* `successBase`/`successPerLevel` — die Inscription-Sim-Heuristik in `sim.ts` deutet auf eine frühere (nie vollendete) Intention hin; aktuell sind alle enchant/inscribe-Aktionen deterministisch.

---

### Vollständige Liste: Abzulösende waffenspezifische Enchant-Rezepte

#### Runecrafting `rune_enchanting` — 11 Aktionen + 11 Output-Items

| Aktion-ID | Basis-Item | Input-Runen | Output-Item | Level |
|---|---|---|---|---|
| `enchant_forceful_iron_sword` | `iron_sword` | `force_rune ×3` | `forceful_iron_sword` | L5 |
| `enchant_flaming_steel_sword` | `steel_sword` | `fire_rune ×3` | `flaming_steel_sword` | L18 |
| `enchant_emberforce_sword` | `steel_sword` | `fire_rune ×2, force_rune ×2` | `emberforce_sword` | L22 |
| `enchant_frostbite_longbow` | `mithril_longbow` | `frost_rune ×4` | `frostbite_longbow` | L24 |
| `enchant_warded_platebody` | `steel_platebody` | `ward_rune ×5` | `warded_platebody` | L28 |
| `enchant_swift_chainbody` | `mithril_chainbody` | `swift_rune ×4` | `swift_chainbody` | L45 |
| `enchant_storm_scimitar` | `runite_scimitar` | `shock_rune ×4` | `storm_scimitar` | L48 |
| `enchant_aether_runite_staff` | `runite_staff` | `aether_rune ×3` | `aether_runite_staff` | L55 |
| `enchant_swiftflame_shortbow` | `bloodiron_shortbow` | `fire_rune ×3, swift_rune ×2` | `swiftflame_shortbow` | L60 |
| `enchant_void_greatsword` | `titanium_greatsword` | `void_rune ×5` | `void_greatsword` | L70 |
| `enchant_voidstorm_staff` | `godiron_staff` | `void_rune ×4, aether_rune ×4` | `voidstorm_staff` | L88 |

#### Inscription `inscription_enchanting` — 10 Aktionen + 10 Output-Items

| Aktion-ID | Basis-Item | Input-Sigille | Output-Item | Level |
|---|---|---|---|---|
| `inscribe_keen_dagger` | `bronze_dagger` | `sigil_might ×3` | `keen_bronze_dagger` | L10 |
| `inscribe_ember_wand` | `iron_wand` | `sigil_might ×2, sigil_ember ×1` | `ember_iron_wand` | L14 |
| `inscribe_ember_shortbow` | `iron_shortbow` | `sigil_ember ×3` | `ember_iron_shortbow` | L18 |
| `inscribe_warding_body` | `hardened_leather_body` | `sigil_ward ×4` | `warding_leather_body` | L36 |
| `inscribe_frost_mace` | `steel_mace` | `sigil_frost ×4` | `frost_steel_mace` | L42 |
| `inscribe_storm_longbow` | `adamantium_longbow` | `sigil_storm ×4, sigil_swift ×2` | `storm_adamantium_longbow` | L58 |
| `inscribe_verdant_staff` | `adamantium_staff` | `sigil_frost ×3, sigil_swift ×2` | `verdant_adamantium_staff` | L60 |
| `inscribe_void_greatblade` | `bloodiron_greatsword` | `sigil_void ×4` | `void_inscribed_greatblade` | L86 |
| `inscribe_radiant_longbow` | `bloodiron_longbow` | `sigil_void ×3, sigil_swift ×3` | `radiant_bloodiron_longbow` | L88 |
| `inscribe_astral_staff` | `titanium_staff` | `sigil_void ×3, sigil_storm ×3` | `astral_titanium_staff` | L90 |

**Externe Referenzen der alten Enchant-Items (Audit-Ergebnis):**
- Keine der 21 Output-Items erscheint in Monster-Loot-Tabellen.
- Keine erscheint in Shop-Einträgen.
- Keine erscheint in Set-Definitionen.
- Keine erscheint in Dungeon-Encounters.

**Fazit:** Die 21 Items und ihre 21 Craft-Aktionen sind vollständig self-contained — nur Item-Definition + Craft-Aktion. Keine externen Abhängigkeiten. Das ermöglicht eine saubere Entfernung ohne Wiring-Audit-Fehler (kein Orphan-Loot-Ref, kein tote Set-Ref).

**Simulations-Heuristik** (`sim.ts` Zeile 47): `isEnchantRecipe` erkennt `category === "rune_enchanting" || category === "inscription_enchanting"` und behandelt non-stackable Inputs moderat. Diese Heuristik fällt weg, wenn die Kategorien aus dem Content verschwinden — kein Ersatz nötig (das neue Binding-Interface ist kein Skilling-Tick-Rezept).

---

### Runecrafting nach dem Umbau: Neue Scope-Definition

Nach der Ablösung der waffenspezifischen `rune_enchanting`-Aktionen hat Runecrafting drei klar getrennte Rollen:

1. **Enchanting-Runen craften** (neue Tier-Items `rune_flame_i` etc.) — Hauptzweck des Umbaus, eigene Kategorie `enchanting_runes`.
2. **Basis-Runen binden** (bestehend, bleibt): `force_rune`, `frost_rune`, `fire_rune`, `ward_rune`, `shock_rune`, `swift_rune`, `aether_rune`, `void_rune` als Zutat für Schritt 3.
3. **Magic-Gear craften** (bestehend, bleibt): Stäbe (`rune_staves`), Wands (`rune_wands`), Foki (`rune_foci`) — großer Anteil des Skill-XP-Fortschritts.

Runecrafting wird **schlanker** (−11 Aktionen + −11 Items) und **thematisch klarer** (Runen binden + Magic-Gear + jetzt das Binding-Interface als UI-Erweiterung des Skills). Die alten `rune_enchanting`-Aktionen werden **ersatzlos gelöscht** — ihr Effekt wird durch das generische Binding-Interface mit den neuen Runen abgedeckt.

### Item-Architektur: Inventar-Modell

Das Inventar ist **stack-basiert**: jeder `InventorySlot` = `{ itemId: string, qty: number }`. Ausrüstung: `CharacterState.equipment: Record<EquipSlot, ItemId | null>` — nur eine Item-ID pro Slot, kein Instanz-Objekt.

Es gibt **keine Item-Instanzen** im Spiel. Alle enchanted Items heute existieren als **separate Static Item-IDs** in `ContentDB.items` (z.B. `forceful_iron_sword`). „Enchanting" ist heute ein Crafting-Rezept, kein dynamisches Modifizieren von Items.

---

## A) Architektur-Entscheidung: Enchant-Datenmodell

### Option A — Enchants am Equipment-Slot

State: `CharacterState.equipment` bleibt `Record<EquipSlot, ItemId | null>`, ergänzt um:

```typescript
// Neues Feld in CharacterState (logic-dev):
enchantments: Partial<Record<EquipSlot, EnchantId[]>>;
```

Beim Ausrüsten: Item ID bleibt plain `iron_sword`. Enchants leben parallel am Slot. Beim Ablegen: Enchants wandern mit dem Item in eine transienten Zuordnung **oder werden verworfen** (Variante A1) / bleiben am Slot (Variante A2, aber dann verliert man sie beim Umrüsten).

**Vorteile:** Kleiner State-Umbau, keine Inventar-Änderungen, keine Stacking-Komplexität.

**Nachteile:** Enchants sind nicht am Item selbst gespeichert — die verzauberte Waffe im Inventar ist identisch mit der Basis-Waffe. Wechselt der Spieler das Item aus, sind Enchants weg (oder an einen leeren Slot gebunden). Lagern, handeln, bankieren von enchanted Items: unmöglich.

**Risiko:** Mittel. SAVE_VERSION bump + 1 Feld in CharacterState. computeStats muss Enchants am Slot lesen.

### Option B — Echte Item-Instanzen

Neuer Typ `InventorySlot = { itemId, qty } | { instanceId, itemId, qty: 1, enchantments: EnchantId[] }`. `CharacterState.equipment` speichert `instanceId | ItemId`. Alle Inventory-Funktionen (addItem, removeItem, stackCheck, persistence.serialize) müssen Instanzen kennen.

**Vorteile:** Vollständig korrekte Semantik. Enchanted Items lager-/handelbar.

**Nachteile:** Massiver Umbau aller Inventory/Equipment/Persistence-Funktionen. Erhöht Serialisierungs-Komplexität erheblich (Instanz-IDs im Save). Migrations-Risiko. Alle wiring/inventory-Tests müssen angepasst werden. Schätzung: 3–4× mehr Aufwand als Option A.

**Risiko:** Hoch. Betrifft engine/inventory.ts, engine/equipment.ts, shared/types, persistence.

### Option C — Hybrid: Enchant am Slot + gebundenes Carry

State: `enchantments: Partial<Record<EquipSlot, EnchantId[]>>` (wie A). Beim Ablegen eines enchanted Items ins Inventar: ein neues „Enchant-Binding-Item" folgt mit (oder ein einfaches Flag). Faktisch: Enchants werden beim Unequip **verworfen** (oder disenchant-fähig gegen Material), was tatsächlich die einfachste und idle-fairste Lösung ist.

**Vorteile:** Implementierbar ohne Inventar-Umbau. Item im Inventar bleibt plain. Disenchant ist der Mechanismus, um Enchants zu „sparen" (→ Rune/Sigil zurück).

**Nachteile:** Für den Spieler überraschend, dass das Item beim Ablegen seinen Enchant verliert. Bedarf klarer UI-Warnung.

---

### EMPFEHLUNG: Option A (Enchants am Equipment-Slot)

**Begründung:** Hearthforge Idle ist ein Idle-Spiel mit einem aktiven Ausrüstungs-Slot pro Position — der Spieler trägt typischerweise 1 Waffe aktiv. Ein verlagertes Enchant-System, das Items im Lager enchanten lässt oder Dutzende enchanted Varianten vorhält, ist für diesen Scope überengineered. Option A ist in 1–2 Tagen implementierbar, hält alle Tests grün und erlaubt later migration zu Option B wenn Handel / Mehrfach-Waffen-Management ein Wunsch wird.

**Konkret:**
- `CharacterState.equipment` bleibt unverändert.
- Neues Feld `enchantments: Partial<Record<EquipSlot, string[]>>` in `CharacterState` (array von `EnchantId`-Strings).
- Enchants sind **slot-gebunden, nicht item-gebunden**: Beim Ausrüsten eines neuen Items wird `enchantments[slot]` geleert (ggf. nach Bestätigung). Beim Unequip werden Enchants verworfen (mit Disenchant-Option, s.u.).
- `computeStats` summiert Enchant-Effekte über alle Slots in `addBonus()`-Logik.
- SAVE_VERSION bump erforderlich; Migration: `enchantments = {}` für alle Alt-Saves.

**Scope-Grenze (bewusst NICHT jetzt):** Übergang zu echten Instanzen (Option B) ist eine spätere Breaking-Migration mit eigenem Meilenstein.

---

## B) Verzauberungs-Runen (neue craftbare Items)

### Welcher Skill craftet die Runen?

**Empfehlung: Runecrafting wird vollständig umgewidmet zum Enchanting-Skill.**

**Begründung:** Runecrafting hat heute zwei Rollen (Runen binden + Magic-Gear craften) und einen dritten Aufgabenbereich (`rune_enchanting`-Kategorie). Inscription macht dasselbe mit Sigillen. Diese Dopplung ist unnötig. Konsolidierung auf Runecrafting als „Enchanting-Skill" ist thematisch kohärent (Runen = Verzauberungszeichen), gibt Inscription eine klare Abgrenzung (Schriftrollen/Buffs bleiben Inscription-Domäne), und vermeidet einen weiteren neuen Skill.

Das **neue Runecrafting** hat drei klare Säulen:
1. **Enchanting-Runen craften** (neue Tier-Items, s.u.) — ersetzt die alten `craft_*_rune`-Aktionen teilweise.
2. **Enchanting-Interface nutzen** (Runen auf Waffe anwenden, eigene UI-Seite).
3. **Magic-Gear-Items craften** (Stäbe/Wands/Foki, bleibt bestehen).

Die alten `rune_enchanting`-Aktionen (`enchant_forceful_iron_sword` etc.) werden **entfernt** und durch das neue Interface ersetzt. Die alten static-enchanted Items (`forceful_iron_sword` etc.) brauchen eine Content-Entscheidung des Chefs (Scope: in Phase 1 raushalten oder Werte-Migration).

### Enchanting-Runen-Leiter (neue Items, 8 Stufen)

Runen werden durch Runecrafting aus Essenzen hergestellt. Jede Rune trägt **einen** Effekt. Stufe 1–8 korrespondiert mit der Metal-Leiter (Copper→Godiron).

| Rune-ID | Name DE | Effekt | Tier | Level RC | Input |
|---|---|---|---|---|---|
| `rune_flame` | Flammenrune | burn DoT (WeaponEffect) | 1 | L5 | 2× `dim_essence` + 1× `ember_essence` |
| `rune_frost` | Frostrune | frost slow (WeaponEffect) | 2 | L15 | 3× `frost_essence` |
| `rune_force` | Kraftrune | +meleeDamage (flat) | 2 | L15 | 2× `dim_essence` + 1× `frost_essence` |
| `rune_shock` | Schockrune | shock DoT (WeaponEffect) | 3 | L30 | 3× `storm_essence` |
| `rune_swift` | Schnellrune | -attackIntervalMs (speed) | 3 | L30 | 2× `storm_essence` |
| `rune_precision` | Präzisionsrune | +accuracy / +critChance | 4 | L45 | 3× `aether_essence` |
| `rune_sanguine` | Blutrune | lifesteal (combatFlag) | 5 | L60 | 2× `aether_essence` + 1× `void_essence` |
| `rune_void` | Leerenrune | burn+bleed Fusion (2× WeaponEffect) | 6 | L75 | 3× `void_essence` |
| `rune_warding` | Schutzrune | +defense / +maxHp | 3 | L28 | 3× `frost_essence` + 1× `ward_rune` |
| `rune_divine` | Göttliche Rune | +manaRegen / +maxMana (Magic) | 5 | L65 | 2× `essence_divine` |

> **Chef-Hinweis (Platzhalter):** Genaue XP-Werte, Input-Mengen und Level-Staffelung sind Balance-Domäne. Tabelleneinträge sind Richtwerte.

**Abgrenzung zu bestehenden Runen:** Die alten `force_rune`, `frost_rune`, `fire_rune` etc. bleiben als Zutaten für Magic-Gear-Crafting (Stäbe/Wands). Die **neuen** `rune_*`-Items sind dedizierte Enchanting-Runen — andere Item-ID-Familie, anderes visuelles Konzept (größere Sigil-Runen vs. Crafting-Komponenten-Runen).

---

## C) Effekt-Katalog

Jede Enchanting-Rune dockt an ein bestehendes Engine-Feld an. Kein neues Combat-Subsystem nötig.

| Rune | Effekt-Typ | Engine-Andockpunkt | Stil-Eignung | Waffe/Rüstung |
|---|---|---|---|---|
| `rune_flame` | burn DoT | `ItemDef.weaponEffect` → `combat.ts` ApplyStatus | Melee, Magic | Waffe |
| `rune_frost` | frost slow | `ItemDef.weaponEffect` → `FROST_SLOW` in combat.ts | Ranged, Magic | Waffe |
| `rune_shock` | shock (skip-chance) | `ItemDef.weaponEffect` → shock-Handler in combat.ts | Magic, Ranged | Waffe |
| `rune_force` | +meleeDamage flat | `EnchantBonus.meleeDamage` → `computeStats addBonus` | Melee | Waffe/Rüstung |
| `rune_swift` | -attackIntervalMs | `EnchantBonus.attackIntervalMs` (negativ) → `computeStats` | Ranged, Melee | Waffe |
| `rune_precision` | +accuracy +critChance | `EnchantBonus.accuracy` + `EnchantBonus.critChance` → `computeStats` | Alle | Waffe |
| `rune_sanguine` | lifesteal-Flag | neues `EnchantEffect.lifestealBonus` → combat.ts Lifesteal-Term | Melee | Waffe |
| `rune_void` | burn+bleed Fusion | `ItemDef.weaponEffects[]` (2 Einträge) → `effectiveWeaponEffects` | Magic, Melee | Waffe |
| `rune_warding` | +defense +maxHp | `EnchantBonus.defense` + `EnchantBonus.maxHp` → `computeStats` | Alle | Rüstung (Phase 2) |
| `rune_divine` | +maxMana +manaRegen | `EnchantBonus.maxMana` + `EnchantBonus.manaRegen` → `computeStats` | Magic | Waffe/Rüstung |

### Tier-Skalierung (Platzhalter, Chef-Domäne)

Jede Rune kommt in 3 Stärken (I/II/III, entspricht Early/Mid/Late-Game). Tier wird über separate Item-IDs repräsentiert (`rune_flame_i`, `rune_flame_ii`, `rune_flame_iii`) oder über ein gemeinsames Tier-Feld im Enchant-Def. Effektstärke skaliert linear: T1=Basis, T2=×1.6, T3=×2.5 (Platzhalter).

**Status-Effekt-Beispiel `rune_flame_i`:**
```
weaponEffect: { type: "burn", chance: 0.20, magnitude: 8, durationMs: 3000 }
```
**Tier III:**
```
weaponEffect: { type: "burn", chance: 0.30, magnitude: 18, durationMs: 4000 }
```

### Nicht implementiert (bewusster Scope-Ausschluss Phase 1)

- Rüstungs-Enchants (`rune_warding` etc.): Phase 2.
- Schmuck-Enchants (Ringe, Amulett): Phase 3.
- Mehrstapel-Enchants (gleiche Rune × 2 auf selbes Item): gesperrt (Wiring-Guard).

---

## D) Verzauberungs-Interface (Minecraft-Style)

### Flow (deterministisch, kein RNG)

1. Spieler öffnet die neue Seite „Verzauberungstisch" (eigener Nav-Eintrag oder Tab im Runecrafting-Skill-Panel).
2. **Waffe wählen:** Links ein Item-Picker (nur `type === "equipment"`, `slot === "mainhand"` oder `slot === "offhand"`, Phase 1 nur Mainhand). Der Picker zeigt das aktuell ausgerüstete Item vorausgewählt.
3. **Rune wählen:** Mittels Drop-Target (oder Liste). Nur Runen aus dem Inventar, die mit dem Item-Typ kompatibel sind. Anzeige: Name, Effekt-Beschreibung, verfügbare Menge.
4. **Vorschau:** Rechts erscheint das Item mit dem neuen Enchant-Effekt (Stat-Delta vs. aktuell).
5. **„Einschreiben / Verbinden":** Rune wird verbraucht, `state.enchantments[slot]` erhält den Enchant-Eintrag.

### Enchant-Slots pro Item

| Kategorie | Slots Phase 1 | Slots Phase 2 (Rarity-abhängig) |
|---|---|---|
| Mainhand (alle) | 1 | 1–2 (common=1, rare=2, epic+=3) |
| Offhand (Phase 2) | — | 1 |
| Rüstung (Phase 2) | — | 1–2 |

**Chef-Entscheidung nötig:** Feste 1 Slot-Regel (einfacher) oder Rarity-Skalierung (mehr Progression)?

### Überschreiben / Ersetzen

Ein belegter Slot kann mit einer neuen Rune überschrieben werden. Die alte Rune ist **verbraucht** (kein Refund). UI zeigt Warnung: „Diese Rune überschreibt [Effekt]. Fortfahren?"

### Disenchant (Rune entfernen)

Optional (Chef-Entscheidung): Disenchant-Button entfernt alle Enchants eines Slots gegen einen Goldkostenbetrag (z.B. 20 % des Rune-Wertes). Die Rune wird dabei **verbraucht** (nicht zurückgegeben). Verhindert exploit-freies Wechseln.

Alternative: Disenchant gibt die halbe Rune zurück (1 Tier-I-Rune), kostet aber zusätzlich `dim_essence × 5`.

### Kosten-Modell (Chef-Entscheidung)

- **Nur Runen-Verbrauch (empfohlen):** Deterministisch, Ressourcen-Sink = die Rune selbst. Kein RNG, kein Gold, idle-fair.
- **Runen + Gold-Kosten:** Zusätzliche Gold-Senke (z.B. 50–500 Gold je Tier). Wäre konsistent mit Auto-Eat-Upgrades.
- **Erfolgs-Chance (nicht empfohlen):** Die bestehende `inscription_enchanting`-Logik hatte keine Erfolgschance; Runecrafting auch nicht. Das neue System soll deterministisch sein (Idle-Fairness: der Spieler weiß genau, was er bekommt).

### Erfolgschance vs. Deterministisch

**Empfehlung: Deterministisch.** Idle-Spiele brauchen verlässliche Progression; Fehlschläge bei seltenen Ressourcen wären frustrierend ohne aktive Teilnahme. Falls der Chef trotzdem Spannung will: optionaler „Riskant einschreiben"-Modus (+20 % Effektstärke, 30 % Fehlschlagchance → Rune verbraucht, kein Enchant). Chef-Entscheidung.

### UI-Layout-Skizze (ASCII, Sidebar-/Citadel-Stil)

```
┌────────────────────────── Verzauberungstisch ──────────────────────────┐
│                                                                          │
│  [Item wählen]                [Rune wählen]              [Vorschau]     │
│  ┌──────────────────┐         ┌──────────────────┐    ┌──────────────┐ │
│  │  🗡 Stahl-Schwert │         │ 🔥 Flammenrune I  │    │ Stahl-Schwert│ │
│  │  Enchant-Slot: — │    →    │ burn 20% 8/s 3s  │  = │ + BURN 20%  │ │
│  │                  │         │ Bestand: 4       │    │ + 8 Schaden/s│ │
│  └──────────────────┘         └──────────────────┘    │ [3s Dauer]  │ │
│                                                        └──────────────┘ │
│                         [Einschreiben — 1× Flammenrune I verbraucht]    │
│                                                                          │
│  (Falls Slot belegt) Aktuell: FROST → wird ersetzt. ⚠ Kein Refund.     │
│  [Disenchant] (entfernt Enchant, Rune verbraucht, 150 Gold)             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## D2) Datenmodell & Save

### Neue Shared-Typen (logic-dev's Revier)

```typescript
// packages/shared/src/index.ts

export type EnchantId = string; // z.B. "rune_flame_i", "rune_force_ii"

/**
 * Definition eines Enchant-Effekts (rein aus dem Content-Katalog abgeleitet).
 * Kein Save-State — wird durch EnchantId + ContentDB aufgelöst.
 */
export interface EnchantDef {
  id: EnchantId;
  name: LocalizedString;
  /** Flat stat-boni (wie EquipBonus, additiv in computeStats). */
  bonus?: EquipBonus;
  /** Waffen-Status (wie WeaponEffect), wird in ItemDef.weaponEffect injiziert zur Laufzeit. */
  weaponEffect?: WeaponEffect;
  /** Mehrfach-Status (z.B. void_rune burn+bleed). */
  weaponEffects?: WeaponEffect[];
  /** Tier (1–3). */
  tier: 1 | 2 | 3;
  /** Für welche Slots anwendbar. */
  applicableSlots: EquipSlot[];
  /** Runecrafting-Level zum Anwenden (Andock-Punkt im UI). */
  levelRequired: number;
}

// Erweiterung CharacterState:
// enchantments: Partial<Record<EquipSlot, EnchantId[]>>;
// (logic-dev ergänzt das in shared + state.ts + createCharacter)
```

**ContentDB** erhält `enchants: Record<EnchantId, EnchantDef>` — content-dev füllt die Enchant-Definitionen.

### SAVE_VERSION

Aktuell: **35**. Neuer Wert: **36**. Migration (persistence-dev):

```typescript
// Migration 35 → 36:
if (save.version < 36) {
  save.character.enchantments = {};
}
```

### computeStats Integration (logic-dev / character.ts)

Im bestehenden `addBonus`-Block in `computeStats`:

```typescript
// Nach Set-Boni (logic-dev implementiert):
for (const slot of EQUIP_SLOTS) {
  const enchantIds = c.enchantments?.[slot] ?? [];
  for (const eid of enchantIds) {
    const ench = content.enchants?.[eid];
    if (ench?.bonus) addBonus(ench.bonus);
  }
}
```

### Combat Integration (combat-dev)

`effectiveWeaponEffects` (shared/index.ts) muss um Enchant-Effekte erweitert werden:

```typescript
// Entweder: combat-dev erweitert die Funktion oder fügt eine neue
// `effectiveEnchantWeaponEffects(state, content)` hinzu, die
// state.character.enchantments["mainhand"] → EnchantDef → weaponEffect auflöst.
// Diese wird dann in resolveAttack() neben effectiveWeaponEffects() aufgerufen.
```

Der lifesteal-Enchant (`rune_sanguine`) braucht ein neues Flag im EnchantDef oder dockt an `EquipBonus` mit einem neuen Feld `lifestealBonus?: number` an — combat-dev liest es im Lifesteal-Term.

> **STOP-Punkt für Content-Dev:** Felder `EquipBonus.lifestealBonus` oder `EnchantDef.combatFlag` wären neue Typen in `shared/index.ts` — das ist logic-dev's Revier. Content-Dev kann `rune_sanguine` erst definieren, wenn logic-dev das Feld ergänzt hat. An CEO melden.

---

## E) Cross-Revier-Impact, Migration & Reihenfolge

### Migration: Alte waffenspezifische Enchant-Items entfernen

**Bereinigung in Content** (content-dev's Revier):

Was gelöscht wird:
- 11 Aktionen: alle `enchant_*`-Einträge in `content.actions` (Kategorie `rune_enchanting`)
- 10 Aktionen: alle `inscribe_*`-Einträge in `content.actions` (Kategorie `inscription_enchanting`)
- 11 Items: `forceful_iron_sword`, `flaming_steel_sword`, `emberforce_sword`, `frostbite_longbow`, `warded_platebody`, `swift_chainbody`, `storm_scimitar`, `aether_runite_staff`, `swiftflame_shortbow`, `void_greatsword`, `voidstorm_staff`
- 10 Items: `keen_bronze_dagger`, `ember_iron_wand`, `ember_iron_shortbow`, `warding_leather_body`, `frost_steel_mace`, `storm_adamantium_longbow`, `verdant_adamantium_staff`, `void_inscribed_greatblade`, `radiant_bloodiron_longbow`, `astral_titanium_staff`
- 2 Kategorie-Defs: `rune_enchanting`, `inscription_enchanting`

**Wiring-Audit nach Entfernung:** Da keines der 21 Items in Monster-Loot, Shop, Sets oder Dungeons referenziert ist (Audit oben), löst das Entfernen keine wiring-audit.test.ts-Fehler aus. Einzige verbleibende Abhängigkeit: die `sim.ts`-Heuristik (Zeile 47) muss die Kategorien-Prüfung verlieren — die betreffenden Kategorien gibt es dann nicht mehr.

**Save-Migration für Spieler, die alte enchanted Items besitzen:**

Spieler, die aktuell `forceful_iron_sword`, `void_greatsword` etc. im Inventar oder ausgerüstet haben, verlieren diese nach der Migration. Da es sich um Pre-Release handelt (kein Live-Player-Base), ist die einfachste Option korrekt: Items werden in der Migration in ihre Basis-Waffe zurückgewandelt.

Migrations-Skizze (persistence-dev, SAVE_VERSION 35 → 36):

```typescript
// Migration 35 → 36
const LEGACY_ENCHANT_MAP: Record<string, string> = {
  forceful_iron_sword:     "iron_sword",
  flaming_steel_sword:     "steel_sword",
  emberforce_sword:        "steel_sword",
  frostbite_longbow:       "mithril_longbow",
  warded_platebody:        "steel_platebody",
  swift_chainbody:         "mithril_chainbody",
  storm_scimitar:          "runite_scimitar",
  aether_runite_staff:     "runite_staff",
  swiftflame_shortbow:     "bloodiron_shortbow",
  void_greatsword:         "titanium_greatsword",
  voidstorm_staff:         "godiron_staff",
  keen_bronze_dagger:      "bronze_dagger",
  ember_iron_wand:         "iron_wand",
  ember_iron_shortbow:     "iron_shortbow",
  warding_leather_body:    "hardened_leather_body",
  frost_steel_mace:        "steel_mace",
  storm_adamantium_longbow:"adamantium_longbow",
  verdant_adamantium_staff:"adamantium_staff",
  void_inscribed_greatblade:"bloodiron_greatsword",
  radiant_bloodiron_longbow:"bloodiron_longbow",
  astral_titanium_staff:   "titanium_staff",
};

// In migrate(save):
if (save.version < 36) {
  // Inventar-Slots: enchanted → Basis-Item
  for (const slot of save.inventory.slots) {
    if (slot && LEGACY_ENCHANT_MAP[slot.itemId]) {
      slot.itemId = LEGACY_ENCHANT_MAP[slot.itemId]!;
    }
  }
  // Ausrüstung: enchanted → Basis-Item (alle Slots prüfen)
  for (const eSlot of Object.keys(save.character.equipment)) {
    const id = save.character.equipment[eSlot];
    if (id && LEGACY_ENCHANT_MAP[id]) {
      save.character.equipment[eSlot] = LEGACY_ENCHANT_MAP[id]!;
    }
  }
  // Bank: enchanted → Basis-Item
  for (const [id, qty] of Object.entries(save.bank ?? {})) {
    if (LEGACY_ENCHANT_MAP[id]) {
      const base = LEGACY_ENCHANT_MAP[id]!;
      save.bank[base] = (save.bank[base] ?? 0) + qty;
      delete save.bank[id];
    }
  }
  // Neues Feld initialisieren
  save.character.enchantments = {};
  save.version = 36;
}
```

**seenDrops / Collection-Log:** Alte enchanted Item-IDs in `save.seenDrops` werden beim nächsten Öffnen automatisch bereinigt, da die Items nicht mehr im Content-Katalog referenziert sind — kein aktiver Migrations-Schritt nötig (tote IDs werden ignoriert).

**monsterKills / craftedById:** Nicht betroffen (Items waren nie Monster-Drops, `craftedById` enthält die enchanted Item-IDs falls der Spieler über das Crafting-System hatte — aber das ist pre-release disposable data).

---

### Reihenfolge der Implementierung

1. **shared (logic-dev):** `EnchantDef`, `EnchantId`, `CharacterState.enchantments`, SAVE_VERSION 36 (auf 36 bumpen), `ContentDB.enchants`. Optionale neue EquipBonus-Felder (`lifestealBonus`, `enchantSlots`).

2. **engine/persistence (logic-dev):** Migration 35→36 nach obiger Skizze. `state.ts` / `createCharacter` erweitern (`enchantments: {}`). `computeStats` um Enchant-Bonus-Pass ergänzen. `sim.ts`-Heuristik um entfernte Kategorien bereinigen.

3. **content (content-dev):** Alte `enchant_*` / `inscribe_*`-Aktionen + 21 Legacy-Items entfernen. Neue Enchanting-Runen-Items + Craft-Aktionen einfügen. `ContentDB.enchants`-Einträge füllen. Kategorien `rune_enchanting`, `inscription_enchanting` aus `categories` entfernen.

4. **engine/combat (combat-dev):** `effectiveEnchantWeaponEffects()` in `resolveAttack()` einhängen; `rune_sanguine`-lifesteal-Term.

5. **ui (ui-dev):** Neue „Enchanting"-Seite (Tab oder eigener Sidebar-Eintrag), Item-Picker, Rune-Picker, Vorschau, Einschreiben-Button, Disenchant-Button.

### Was NICHT in Phase 1

- Rüstungs-/Schmuck-Enchants (nur Mainhand Phase 1).
- Übergang zu Item-Instanzen (Option B) — bewusst Phase 3+.
- Enchanting-XP für das Anwenden der Runen (kein XP-Gain aus dem Interface — Runecrafting-XP kommt aus den Rune-Craft-Aktionen).

---

## F) Offene Chef-Entscheidungen

- **Architektur:** Option A (Enchants am Slot, empfohlen) oder B (Item-Instanzen, hoher Aufwand) oder C (Hybrid)?

- **Welcher Skill craftet Enchanting-Runen:** Runecrafting (umwidmen, empfohlen) oder neuer Skill „Enchanting"?
  **ENTSCHIEDEN (Chef, 2026-07-18, Welle TT): Runecrafting.** „Enchanting geht in Runecrafting mit rein" — es kommt KEIN eigener Enchanting-Skill. Umsetzungsstand: alle 36 `craft_rune_*`-Aktionen (12 Affix-Familien × 3 Tiers) laufen unter `skill: "runecrafting"` mit Level-Gate (T1 L15–30, T2 L38–53, T3 L62–79); das Anwenden am Verzauberungstisch vergibt spec-konform KEINE XP (§E „Was NICHT in Phase 1") und braucht keinen zweiten Level-Gate, weil Runecrafting-Crafting der einzige Runen-Beschaffungspfad ist (Guard: engine/enchant.test.ts „Runecrafting-Integration"). Der geparkte `ring_master_enchanting` wurde damit gegenstandslos und ist ersatzlos entfernt.

- **Enchant-Slots pro Item:** Feste 1 Slot für Phase 1 (einfacher), oder Rarity-Skalierung (common=1, rare=2, epic+=3)?

- **Disenchant:** Ja oder nein? Falls ja: Rune weg + Gold-Kosten, oder halbe Rune zurück?

- **Kosten-Modell:** Nur Rune verbrauchen (empfohlen, idle-fair), oder zusätzlich Gold-Kosten?

- **Erfolgschance:** Deterministisch (empfohlen) oder optionaler Risiko-Modus mit Chance?

- **Scope Rüstungs-Enchants:** Erst in Phase 2, oder sofort mit reindenken (Typen vorbereiten)?

- **Alte static-enchanted Items** (`forceful_iron_sword`, `flaming_steel_sword` etc., ~20 Items + ~11+10 Aktionen): Behalten (legacy, zwei Systeme parallel) oder Entfernen (requires persistence-Migration da Spieler diese Items im Save haben könnten)?

- **Inscription abgrenzen:** Inscription-Enchanting (`inscription_enchanting`-Kategorie) ebenfalls vollständig entfernen (empfohlen: sauber, beide Systeme weg) — oder soll Inscription ein paralleles zweites Enchant-System mit Sigillen bleiben (zwei Skill-Kanäle für denselben Zweck)?

- **Inscription generell:** Da beide `inscription_enchanting` und `rune_enchanting` abgelöst werden: Was bleibt Inscription noch? (Schriftrollen, Sigillen, Tinten/Vellum) — ist das genug für einen eigenen Skill, oder Inscription mit Runecrafting verschmelzen?

- **Alte enchanted Items (legacy save):** Migration auf Basis-Item (empfohlen, Pre-Release unkritisch) oder Beibehalt als „poor"-Wert-Items ohne Crafting-Quelle (verwirrend)?

---

## Notizen für Chef

Die `inscription_enchanting`-Heuristik in `sim.ts` (Zeile 47) ist bereits vorhanden, weil das alte System non-stackable Gear-Items als Inputs verbraucht. Diese Logik bleibt unverändert, solange die alten Aktionen bestehen. Das neue Enchanting-Interface braucht **keine sim-Heuristik** (die Runen sind stackable, der Craft-Schritt ist die Rune-Herstellung, das Applizieren passiert außerhalb der Aktions-Loop).

Die bestehenden Runen (`force_rune`, `frost_rune` etc.) und die neuen Enchanting-Runen (`rune_flame`, `rune_frost` etc.) können **parallel koexistieren** — unterschiedliche ID-Namespaces, unterschiedliche Verwendungszwecke. Kein Breaking Change an bestehendem Content nötig für Phase 1.
