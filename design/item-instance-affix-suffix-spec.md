# Item-Instanzen: Affixe (Verzauberungen) + Suffixe (Random Rolls) — Spec

**Stand:** 2026-06-27 | **Status:** PLAN (kein Code bearbeitet) | **Autor:** Logic-Dev
**Ersetzt** die Architektur-Empfehlung aus `enchantment-system-rework-spec.md` (dort Option A empfohlen).
**Chef-Entscheidung:** **Architektur B = echte Item-Instanzen** + neues **Suffix-System** (Random Rolls) + Inscription **ganz raus**.

> Zahlen sind durchweg **Platzhalter** (Balance-Domäne). Diese Spec definiert Struktur, Datenfluss, Save-Disziplin und Datei-Impact.

---

## 1. Audit — wie Items heute gespeichert werden

Quellen: `shared/src/index.ts`, `engine/src/{inventory,equipment,character}.ts`, `persistence/src/index.ts`, `content/src/index.ts`.

| Träger | Heutiger Typ | Stelle |
|---|---|---|
| Inventar-Slot | `InventorySlot = { itemId: ItemId; qty: number }` | `shared` 1751 |
| Inventar | `InventoryState = { baseCapacity, bagSlots: (ItemId\|null)[], slots: (InventorySlot\|null)[] }` | `shared` 1762 |
| Ausrüstung | `equipment: Record<EquipSlot, ItemId \| null>` | `shared` 1597 |
| Köcher | `equipment.ammo: ItemId\|null` + `ammoCount: number` | `shared` 1874 |
| Essen / Buffs | `food: ItemId\|null`, `buffs: ActiveBuff[]` (`buff.itemId`) | `shared` 1599/1607 |
| Bank | `bank: Record<ItemId, number>` | `shared` 1844 |
| Abgeleitete Stats | `computeStats(state, content)` aggregiert Attribute + `item.bonus`/`modifiers` + Set-Boni + Buffs + Stil-Mods | `engine/character.ts` 116 |
| Waffeneffekte | `effectiveWeaponEffects(item)` = `[weaponEffect, ...weaponEffects]` dedupliziert | `shared` 967 |
| SAVE_VERSION | **37** | `shared` 29 |

**Kerneigenschaft heute:** Items sind **rein ID-basiert**. Es gibt **keine** Instanz-Identität — zwei „Kupferschwerter" sind ununterscheidbar und stapeln (Equipment ist nicht stackable, aber trotzdem nur eine ID). Alle „verzauberten" Items existieren heute als **eigene statische Item-IDs** (`flaming_steel_sword`, …) — generiert von Craft-Aktionen, kein dynamisches Modifizieren.

**Was sich ändern MUSS für Instanzen:**
1. `InventorySlot` muss optional eine **Instanz** tragen (Affixe/Suffix + eigene Identität).
2. `equipment[slot]` muss die **Instanz mitführen**, nicht nur die Basis-ID (sonst geht die Modifikation beim Ausrüsten verloren).
3. `computeStats` braucht einen **Instanz-Overlay-Pass** (Basis-`bonus` + Affix-Boni + Suffix-Boni).
4. Bank (`Record<ItemId,number>`) kann **keine** non-stackable Instanzen halten → separater Instanz-Speicher (Gear Vault).
5. Persistenz: Instanzen serialisieren, **SAVE_VERSION-Bump + Migration** (alte Stacks bleiben unverändert ladbar).
6. Naming/Tooltip: abgeleiteter Anzeigename aus Präfix (Affix) + Basis + Suffix.

**Leitprinzip (Chef-konform, hält Ripple klein):**
> **Unmodifizierte Items bleiben exakt wie heute stapelbare Stacks `{itemId, qty}`.** Eine **Instanz** entsteht ERST, wenn ein Affix ODER ein Suffix angebracht wird. Nur Instanzen sind non-stackable. So bleibt das gesamte bestehende Stack-/Bank-/Mengen-System für 99 % der Items unangetastet.

---

## 2. A) Item-Instanz-Modell

### 2.1 Neue Shared-Typen (Logic-Dev-Revier)

```ts
// packages/shared/src/index.ts

export type InstanceId = string;          // z.B. "inst_000123" (deterministisch vergeben, s.u.)
export type AffixId   = string;           // z.B. "affix_flame"  (deterministische Verzauberung)
export type SuffixId  = string;           // z.B. "suffix_tiger" (Random Roll)

/** Ein konkret angebrachter Affix (Verzauberung) auf einer Instanz. */
export interface AffixInstance {
  affixId: AffixId;
  tier: 1 | 2 | 3;        // Runen-Tier → Effektstärke
}

/** Ein konkret gerollter Suffix (Random Roll) auf einer Instanz. */
export interface SuffixInstance {
  suffixId: SuffixId;
  /** Item-Level beim Roll (= Craft-Skill-Level bzw. Monster-Level). Skaliert die Stat-Höhe. */
  ilvl: number;
  /** Gerollte Stärkestufe innerhalb des ilvl-Bandes (0..1 oder 1..N, Platzhalter). */
  roll: number;
}

/** Eine echte Item-Instanz: Basis-Item + angebrachte Modifikationen + eigene Identität. */
export interface ItemInstance {
  instanceId: InstanceId;
  baseItemId: ItemId;          // verweist auf die statische ItemDef (Icon/Typ/Slot/Basis-bonus)
  affixes: AffixInstance[];    // 0..N (N = enchantSlots der Rarity)
  suffix?: SuffixInstance;     // 0..1
}
```

### 2.2 Slot trägt ENTWEDER Stack ODER Instanz

```ts
export interface InventorySlot {
  itemId: ItemId;        // bei Instanzen: == instance.baseItemId (bestehender Code liest weiter die Basis-ItemDef)
  qty: number;           // bei Instanzen IMMER 1
  /** Vorhanden ⇒ dieser Slot hält eine non-stackable Instanz. Fehlt ⇒ klassischer Stack. */
  instance?: ItemInstance;
}
```

**Warum `itemId` gespiegelt bleibt:** Sämtlicher bestehender Code (Icon-Lookup, `item.type`, `item.slot`, Verkaufswert, Wiring-Audit, UI) liest `slot.itemId` → resolved die Basis-`ItemDef`. Mit der Spiegelung **läuft dieser Code unverändert weiter**; nur stat-relevante und namensrelevante Pfade lesen zusätzlich `slot.instance`.

**Stacking-Regel (zentral, `engine/inventory.ts`):** Ein Slot mit `instance` **stapelt nie** und wird beim Stack-Merge nie als Ziel/Quelle gewählt. `addItem(...)` für eine Instanz sucht immer einen **freien** Slot. Das ist die einzige invasive Stelle in `inventory.ts`.

### 2.3 Equipment trägt die Instanz mit

Bestehend bleibt `equipment: Record<EquipSlot, ItemId | null>` (Basis-ID — hält allen Equipment-lesenden Code am Laufen). **Neu** parallel:

```ts
// in CharacterState:
/** Instanz-Detail je Slot, wenn das ausgerüstete Item modifiziert ist. Sonst Slot fehlt = plain Item. */
equippedInstances: Partial<Record<EquipSlot, ItemInstance>>;
```

- **Equip:** plain Item → `equipment[slot]=itemId`, kein Eintrag in `equippedInstances`. Instanz → `equipment[slot]=instance.baseItemId` **und** `equippedInstances[slot]=instance`; der Inventar-Slot wird geleert.
- **Unequip:** Instanz wandert zurück in einen freien Inventar-Slot als `{itemId: base, qty:1, instance}`; `equippedInstances[slot]` wird gelöscht. **Die Modifikation reist mit** (Architektur-B-Kern).
- **Invariante** (von `sanitizeState` erzwungen): `equippedInstances[slot]` existiert nur, wenn `equipment[slot] === equippedInstances[slot].baseItemId`.

### 2.4 computeStats-Integration

Genau **eine** neue Aggregations-Quelle, eingehängt im bestehenden `addBonus`-Fluss (`character.ts` ~163, nach `item.bonus`):

```ts
// Pseudo — im Equipment-Loop, NACH item.bonus / item.modifiers:
const inst = c.equippedInstances?.[slot];
if (inst) addInstanceBonus(inst, content, addBonus, attr);
```

`addInstanceBonus` (neuer reiner Helfer in `shared` oder `character.ts`):
- Für jeden `AffixInstance`: `content.affixes[affixId]` → `affixBonusAtTier(def, tier)` → `addBonus(...)`; Attribut-Mods analog auf `attr`.
- Für den `SuffixInstance`: `content.suffixes[suffixId]` → `suffixBonusAtIlvl(def, ilvl, roll)` → `addBonus(...)` / Attribut-Mods.

`computeStats` bleibt **die einzige Stat-Aggregations-Stelle** (Chef-Hardrule). Affix-/Suffix-Stärke wird ausschließlich hier zu Boni aufgelöst.

**Waffeneffekte (Combat-Dev-Revier, Andockpunkt):** `effectiveWeaponEffects(item)` allein reicht nicht mehr — Affixe können Effekte tragen (Flamme=burn). Neuer reiner Helfer:

```ts
// shared: liefert die GESAMTE Effektliste eines ausgerüsteten Mainhand-Items inkl. Affixe.
export function effectiveInstanceWeaponEffects(
  inst: ItemInstance | null, base: ItemDef | null, content: ContentDB
): WeaponEffect[];
```

Combat-Dev ruft das in `resolveAttack()` statt/zusätzlich zu `effectiveWeaponEffects(base)` auf. **STOP-Punkt an CEO:** Combat-Dev muss diese Quelle einhängen (combat.ts ist nicht Logic-Dev-Revier).

### 2.5 Abgeleitete Stats = Basis + Affix + Suffix (Modell)

```
instanceStats = base.bonus
              + Σ affixBonusAtTier(affix.def, affix.tier)        // deterministisch (Rune-Tier)
              + suffixBonusAtIlvl(suffix.def, suffix.ilvl, roll) // einmal gerollt, dann fix gespeichert
```
Affix-Werte werden **aus dem Tier live berechnet** (nur `affixId+tier` im Save). Suffix-Werte werden **beim Roll fixiert** über `ilvl+roll` (kein Re-Roll bei Content-Tweaks; die Formel ist deterministisch reproduzierbar).

### 2.6 Namens-Logik

Reiner Helfer in `shared` (i18n über `Locale`, niemals hardcoded):

```ts
export function instanceDisplayName(inst, content, locale): string;
// Präfix (erster Affix) + Basisname + Suffixphrase
// "Feuriges " + "Kupferschwert" + " des Tigers"
```

- **Präfix** kommt aus `AffixDef.prefix: LocalizedString` (z.B. „Feuriges"). Bei mehreren Affixen: nur der höchstwertige liefert das Präfix (Rest nur im Tooltip), damit Namen kurz bleiben.
- **Suffixphrase** aus `SuffixDef.suffix: LocalizedString` (z.B. „des Tigers").
- Plain Items (keine Instanz) → unverändert `ItemDef.name`.
- **Rarity-Färbung:** Instanz-Rarity = max(base.rarity, durch Affix/Suffix angehobene Stufe) — Platzhalter-Regel, ui-dev/content entscheidet Anhebung.

### 2.7 SAVE_VERSION-Bump + Migration

- **SAVE_VERSION 37 → 38.**
- Migration ist **rein additiv** — alte Stacks bleiben gültig (`instance` fehlt = klassischer Stack):
  ```ts
  // migrateState (persistence), idempotenter Default-Zweig:
  if (!state.character.equippedInstances || typeof … !== "object")
    state.character.equippedInstances = {};
  if (!Array.isArray(state.bankInstances)) state.bankInstances = []; // s. Abschnitt D
  // InventorySlot.instance: KEIN Eingriff nötig — fehlendes Feld = Stack.
  ```
- `sanitizeState` erweitern: Instanzen mit unbekanntem `baseItemId`/`affixId`/`suffixId` bereinigen (Affix/Suffix droppen, Instanz ggf. auf plain Item zurückfallen lassen). Invariante aus 2.3 erzwingen.
- **Persistence-Test erweitern:** Round-Trip eines Saves mit (a) Instanz im Inventar, (b) Instanz ausgerüstet, (c) Instanz im Gear Vault, (d) reiner Alt-Save ohne Instanzen.

**InstanceId-Vergabe (deterministisch, Engine-Hardrule):** Kein UUID/`Date.now`. Ein monoton steigender Zähler im State:
```ts
// GameState: nextInstanceSeq: number;  → instanceId = "inst_" + (seq++).toString(36)
```
Migration: `if (typeof state.nextInstanceSeq !== "number") state.nextInstanceSeq = 0;`

---

## 3. B) Affix-/Enchant-System (deterministisch)

Trägt die Chef-Vorgaben: tiered Runen + Essenzen, früh (~L20) möglich, höheres Level → stärker, Enchant-Slots nach Rarity, Disenchant (Rune weg + Gold), Verzauberungskosten Rune+Gold, deterministischer Erfolg, Rüstung Phase 2.

### 3.1 AffixDef (Content-Katalog, content-dev füllt)

```ts
export interface AffixDef {
  id: AffixId;
  prefix: LocalizedString;             // „Feuriges", „Wuchtiges", …
  /** Flat-Boni pro Tier (Index 0=T1). Aggregiert in computeStats via addBonus. */
  bonusByTier: [EquipBonus, EquipBonus, EquipBonus];
  /** Optionaler Waffeneffekt pro Tier (z.B. burn). */
  weaponEffectByTier?: [WeaponEffect, WeaponEffect, WeaponEffect];
  /** Für welche Item-Typen/Stile anwendbar (s. Tagging 3.4). */
  appliesTo: ItemTypeTag[];
  /** Runecrafting-Level pro Tier zum Anwenden. */
  levelByTier: [number, number, number];
}
```
`ContentDB.affixes: Record<AffixId, AffixDef>` (neu in `ContentDB`).

### 3.2 Tiered Runen + Essenzen (content-dev)

Pro Affix gibt es **Runen-Items als Tier** (z.B. `rune_flame_i/ii/iii`), gecraftet vom Skill **Runecrafting** aus gestaffelten Essenzen. Die Rune ist der **Träger des Affix** am Verzauberungstisch — Tier der Rune = Tier des Affix.

| Rune-Item | Affix | Tier | RC-Level (Platzhalter) | Essenz-Input (Platzhalter) |
|---|---|---|---|---|
| `rune_flame_i` | `affix_flame` | 1 | ~L20 | `ember_essence ×N` |
| `rune_flame_ii` | `affix_flame` | 2 | ~L45 | `ember_essence ×N` + `aether_essence ×M` |
| `rune_flame_iii` | `affix_flame` | 3 | ~L70 | `void_essence ×N` |
| `rune_force_i…iii` | `affix_force` (+meleeDamage) | 1–3 | … | … |
| `rune_frost_i…iii` | `affix_frost` (slow) | 1–3 | … | … |
| `rune_precision_i…iii` | `affix_precision` (+acc/+crit) | 1–3 | … | … |

> Chef-Vorgabe erfüllt: Feuer früh (~L20, T1), stärkere Versionen auf höherem Level (T2/T3).

### 3.3 Enchant-Slots pro Item nach RARITY

`ItemInstance.affixes.length` ist gekappt durch die **Rarity der Basis** (Chef: „Enchant-Slots pro Item nach Rarity"):

| Rarity | Enchant-Slots (Platzhalter) |
|---|---|
| poor / common | 1 |
| rare / superRare | 2 |
| epic | 3 |
| legendary / godly | 3–4 |

Helfer (reine Funktion): `enchantSlotsFor(rarity): number` in `shared`. Der Verzauberungstisch blockt das Anbringen, wenn `affixes.length >= enchantSlotsFor(...)`.

### 3.4 Item-Typ-Tagging (Affix UND Suffix nutzen es)

Ein Schwert darf keinen Magier-Affix/-Suffix bekommen. Gemeinsames Tag-System:

```ts
export type ItemTypeTag =
  | "weapon_melee" | "weapon_ranged" | "weapon_magic"
  | "armor" | "shield" | "any_weapon" | "any";
```
Ableitung rein aus der `ItemDef` (reiner Helfer `itemTypeTags(item): ItemTypeTag[]` aus `weaponStyle`/`slot`/`type`). Affix/Suffix-Pools filtern darüber. **Kein** neues Datenfeld auf bestehenden Items nötig (aus vorhandenen Feldern ableitbar) — hält Content-Aufwand klein.

### 3.5 Verzauberungstisch-Flow (deterministisch, Phase 1: Mainhand)

1. Item-Picker (Instanzen + plain Equipment-Items aus Inventar/ausgerüstet).
2. Rune-Picker (nur Runen, deren `affix.appliesTo` zum Item-Tag passt; Bestand aus Inventar).
3. Vorschau: Stat-Delta + neuer Name.
4. **„Verbinden"**: verbraucht **1 Rune + Gold** (Endgame-Gold-Sink, skaliert mit Tier/Rarity — Platzhalter `enchantGoldCost(tier, rarity)`).
   - War das Ziel ein **plain Item** → es wird zur **Instanz** promotet (`instanceId` vergeben, aus Stack ausgelöst falls qty>1).
   - Affix wird angehängt (deterministischer Erfolg = immer, Phase 1).
5. Belegter Slot kann **überschrieben** werden (alte Rune verbraucht, kein Refund) — UI-Warnung.

**Disenchant:** Button entfernt **einen** Affix → Rune ist **weg** (kein Refund) **+ Gold-Kosten**. Hat die Instanz danach keine Affixe und keinen Suffix mehr → sie **degradiert zurück zum plain Stack** (re-stackable). Reiner Engine-Helfer `disenchant(state, content, ref, affixIndex)`.

**Engine-Aktionen (actions.ts/equipment.ts-Revier, KEINE Tick-Rezepte):** `applyAffix(state, content, instRef, runeItemId)` und `disenchant(...)` sind **direkte State-Mutationen** (wie Equip), kein `successBase`-Skilling-Tick → keine Sim-Heuristik nötig.

---

## 4. C) Suffix-System (Random Rolls, WoW-Stil) — NEU

### 4.1 Roll-Mechanik

Beim **Craften** (Phase 2) und später bei **Drops**:
- **Roll 1 — `hasSuffix`:** Chance, dass das Item überhaupt einen Suffix bekommt. Quelle: `ActionDef.suffixChance?` (Craft) bzw. `LootRoll.suffixChance?` (Drop). Seeded RNG (`state.rng`).
- **Roll 2 — `whichSuffix`:** gewichtete Auswahl aus dem **gefilterten Pool** (nur Suffixe, deren `appliesTo` zum Item-Tag passt). Seeded.
- **Roll 3 — `roll` (Stärke):** Wert innerhalb des ilvl-Bandes. Seeded.

`ilvl` = Craft-Skill-Level der Aktion (bzw. Monster-Level beim Drop). **Level-Scaling:** L1-Craft → niedriger ilvl → schwächere Suffix-Werte; höheres Level → stärker. Formel: `suffixBonusAtIlvl(def, ilvl, roll)` (linear/treppen, Platzhalter).

Ein gecraftetes Item, das einen Suffix rollt, wird **sofort zur Instanz** promotet (sonst plain Stack wie bisher).

### 4.2 SuffixDef (Content)

```ts
export interface SuffixDef {
  id: SuffixId;
  suffix: LocalizedString;          // „des Tigers", „des Bären", …
  appliesTo: ItemTypeTag[];
  /** Stat-Template: welche Stats, Basiswert pro ilvl-Punkt (Platzhalter-Skalierung). */
  statsPerIlvl: Partial<EquipBonus>;
  attrPerIlvl?: Partial<Record<AttributeId, number>>;
  /** Pool-Gewicht für Roll 2. */
  weight: number;
  /** Min-ilvl, ab dem dieser Suffix im Pool ist (Gating starker Suffixe). */
  minIlvl?: number;
}
```
`ContentDB.suffixes: Record<SuffixId, SuffixDef>`.

### 4.3 Starter-Suffix-Set (Platzhalter-Werte, content-dev finalisiert)

| Suffix | Phrase | Stats (skaliert mit ilvl) | Anwendbar auf |
|---|---|---|---|
| `suffix_tiger` | des Tigers | `dex` + `vitality` | weapon_ranged, weapon_melee, armor |
| `suffix_bear` | des Bären | `str` + `maxHp` | weapon_melee, armor, shield |
| `suffix_eagle` | des Adlers | `accuracy` + `critChance` | any_weapon |
| `suffix_magus` | des Magus | `magicDamage` + `int` | weapon_magic |
| `suffix_wolf` | des Wolfes | `meleeDamage` + `attackIntervalMs` (−) | weapon_melee |
| `suffix_hawk` | des Falken | `rangedDamage` + `evasion` | weapon_ranged |
| `suffix_owl` | der Eule | `maxMana` + `manaRegen` | weapon_magic, armor |
| `suffix_boar` | des Ebers | `defense` + `maxHp` | armor, shield |

**Logik-Garantie:** Schwert (`weapon_melee`) zieht nie `suffix_magus` (nur `weapon_magic`). Filter rein über `appliesTo` ∩ `itemTypeTags(item)`.

### 4.4 Ziel

Variantenreiche Crafts: dasselbe Rezept liefert mal ein plain Item, mal „… des Bären", mal „… des Tigers" in unterschiedlicher Stärke → Anreiz weiterzucraften / Drops zu prüfen.

---

## 5. D) Inventar-Overflow-Lösung (Chef-Wunsch — WICHTIG)

**Problem:** Instanzen sind non-stackable. Suffix-Rolls + Affixe erzeugen viele Varianten → Inventar (20 + Taschen-Slots) läuft über, und Instanzen passen **nicht** in die stackbare `bank: Record<ItemId,number>`.

### Bewertete Optionen

| Option | Nutzen | Kosten/Risiko |
|---|---|---|
| **1. Salvage/Disenchant** (Instanz → Basis-Item zurück [re-stackable] + Scrap-Material/Gold; Affix-Rune ggf. teilweise zurück) | Räumt aktiv auf, speist Material-Loop, idle-fair | Spieler muss klicken (außer Auto-Salvage) |
| **2. Auto-Vergleich „nur behalten wenn besser"** (beim Drop/Craft: Score vs. aktuell ausgerüstet; schlechtere automatisch salvagen) | Kein Overflow ohne Micro | Braucht Item-Score-Heuristik; „besser" ist subjektiv |
| **3. Gear Vault** (separater Instanz-Bank-Bereich `bankInstances: ItemInstance[]` mit Filtern) | Unbegrenztes Lagern von Instanzen, sauber getrennt vom Stack-Bank | Neues State-Feld + UI-Tab; löst Overflow nur, verschiebt ihn |
| **4. Quick-Salvage-UI** (Multi-Select „alles unter Schwelle salvagen") | Schnelles Batch-Aufräumen | Reine UI-Politur über Option 1 |

### EMPFEHLUNG: **Salvage-first** (Option 1) als Fundament **+ Gear Vault** (Option 3) als Lager **+ opt-in Auto-Salvage-Filter** (leichtgewichtige Option 2)

**Begründung:** Salvage ist der einzige Mechanismus, der das Overflow-Problem **wirklich reduziert** (Instanz-Anzahl sinkt), statt es nur zu verlagern. Es ist idle-fair (deterministisch, kein Verlust von Fortschritt — Basis-Item kommt zurück) und speist den Material-Kreislauf (Scrap → später Crafting/Reroll). Der **Gear Vault** (`bankInstances`) gibt Sammlern Platz für Keeper ohne das Inventar zu belasten. Der **Auto-Salvage-Filter** (z.B. „auto-salvage Suffix-Items unter ilvl X / ohne Affix") hält den Idle-Loop am Laufen, ohne dass der Spieler Drops manuell sichten muss — **opt-in**, Default aus (kein versehentlicher Verlust).

**Konkret (Logic-Dev-Revier):**
- `bankInstances: ItemInstance[]` neu in `GameState` (Gear Vault). Migration: `[]` für Alt-Saves. `sanitizeState` validiert baseItemId/affix/suffix.
- `salvage(state, content, ref): { baseItemId, scrap, goldRefund }` — reiner Engine-Helfer. Instanz wird zerstört; Basis-Item geht (stackable) ins Inventar/Bank zurück; Scrap-Material (`item_scrap`, neues Content-Item) + Gold gutgeschrieben; bei Affixen optional anteilige Rune-Rückgabe (Chef-Entscheidung G).
- Settings-Flag `autoSalvage?: { enabled: boolean; maxIlvl: number; keepWithAffix: boolean }` in `GameSettings` (Migration defaultet `{enabled:false,…}`). Greift im Drop-/Craft-Pfad bei vollem Inventar **statt** `lastStop="inventory_full"`.
- Auto-Bank-Logik (`settings.autoBank`) wird für Instanzen so erweitert: volle Bag → Instanz wandert in den **Gear Vault** (nicht in die Stack-Bank).

---

## 6. E) Inscription-Abwicklung (Chef: GANZ raus)

Audit aus `content/src/index.ts`. Inscription hat **keine** Engine-Referenz außer der `sim.ts`-Heuristik — alles andere ist Content.

### 6.1 Zu entfernen

**Skill:**
- `skills.inscription` (`content` ~33).

**Aktionen (alle `skill: "inscription"`):**
- Tinte/Pergament (`ink_paper`): `grind_soot_ink`, `press_parchment`, `grind_ether_ink`, `grind_ink_umber`, `grind_ink_verdant`, `grind_ink_violet`, `grind_ink_radiant`, `mill_vellum`, `press_void_vellum`.
- Glyphen (`glyphs`): `scribe_glyph_might/warding/precision/zealot/bulwark/alacrity/ruin`.
- Sigille (`glyphs`): `scribe_sigil_might/ember/frost/ward/storm/swift/void`.
- Schriftrollen (`glyphs`): `scribe_scroll_overload/aegis/cataclysm`.
- Gear-Beschriftung (`inscription_enchanting`): die 10 `inscribe_*` (siehe Liste unten) — werden durch das neue Affix-/Suffix-System ersetzt.

**NUR-Inscription-Materialien** (existieren ausschließlich für Inscription):
- Tinten: `soot_ink`, `ink_umber`, `ink_verdant`, `ink_violet`, `ink_radiant`, `ether_ink`.
- Pergament: `blank_parchment`, `vellum`, `void_vellum`.
- Sigille: `sigil_might`, `sigil_ember`, `sigil_frost`, `sigil_ward`, `sigil_storm`, `sigil_swift`, `sigil_void`.

**10 Legacy-Inscription-Enchant-Items** (self-contained, kein Loot/Shop/Set/Dungeon-Ref):
`keen_bronze_dagger`, `ember_iron_wand`, `ember_iron_shortbow`, `warding_leather_body`, `frost_steel_mace`, `storm_adamantium_longbow`, `verdant_adamantium_staff`, `void_inscribed_greatblade`, `radiant_bloodiron_longbow`, `astral_titanium_staff`.

**Kategorie-Defs:** `inscription_enchanting`; `ink_paper` + `glyphs` nur falls keine anderen Skills sie nutzen (prüfen — vermutlich Inscription-exklusiv).

**Achievements:** `ach_skill_inscription_10/20/30/40/50/60/70/80/90` (9 Stück, `content` ~8955-8963).

**Sim-Heuristik (vermerkt — content-dev darf engine/sim.ts NICHT anfassen → Logic-Dev erledigt):**
`engine/sim.ts` Zeile ~47: `isEnchantRecipe = category === "rune_enchanting" || category === "inscription_enchanting"`. Nach Entfernen der Kategorie muss der `inscription_enchanting`-Zweig raus. **Logic-Dev-Aufgabe** (sim.ts ist Engine). Falls Runecrafting-`rune_enchanting` ebenfalls verschwindet (separater Enchant-Rework), fällt die ganze `isEnchantRecipe`-Sonderbehandlung weg.

### 6.2 Cross-Check: werden Inscription-OUTPUTS woanders gebraucht? (NICHT brechen)

| Output | Auch verwendet als | Konsequenz |
|---|---|---|
| **Glyphen** `glyph_of_*` (7 Buff-Consumables) | **Quest-Rewards + Dungeon-Rewards** (`content` 9834–10861, 10667–10861) | ⚠ **NICHT inscription-only.** Werden vom Spieler als Buff genutzt **und** sind in Belohnungstabellen verdrahtet. Entfernen würde Reward-Refs verwaisen (Wiring-Audit-Bruch). → **Glyphen als Buff-Items BEHALTEN**, nur ihre Inscription-**Craft-Aktionen** entfernen ⇒ Glyphen werden reward-/drop-only (uncraftbar). **Chef-Entscheidung G.** |
| **Schriftrollen** `scroll_of_overload/aegis/cataclysm` (Buff-Consumables) | Vom Spieler genutzt; Reward-Refs prüfen | Wie Glyphen: Items behalten, Craft-Aktionen raus → reward-/drop-only. |
| **Sigille** `sigil_*` | Nur `scribe_sigil_*` (Craft) + `inscribe_*` (Verbrauch) | ✅ Inscription-exklusiv → sicher entfernbar. |
| **Tinten/Pergament** | Nur Inscription-Aktionen | ✅ Sicher entfernbar. |
| **Pigmente** `pigment_umber/verdant/violet/radiant` | **Monster-Loot** (5396–5555) + **Farming** (`farmCrops`, 11245+) — Sink ist **nur** Inscription-Tinte | ⚠ Nach Entfernen **toter Gathering-Output** (gefarmt/gelootet, aber kein Verbraucher). → Pigment-Loot-Einträge + Farming-Defs ebenfalls bereinigen ODER Pigmente an neues System andocken. **Content/Farming-Revier → CEO-Routing.** |
| **Reeds** `reed_pale/iron/void` (+ Seeds `palereed_seed/ironreed_seed/voidreed_seed`) | **Shop** (Seeds, 8731–8733) + **Farming** (11223+) — Sink ist **nur** Inscription-Pergament | ⚠ Wie Pigmente: toter Loop. Reed-Seeds aus Shop, Reed-Farming-Defs bereinigen. **Content/Farming-Revier → CEO.** |
| **Essenzen** `essence_ash/mire/grave/void/divine` | Mit Runecrafting/Alchemy **geteilt** | ✅ Nicht anfassen (shared). |

> **Wichtig für CEO:** Reine „Skill + Sigille/Tinten/Pergament/inscribe_* raus" ist sauber. Aber **Glyphen/Schriftrollen** hängen in Quest/Dungeon-Rewards und **Pigmente/Reeds** sind sonst toter Gathering-Loop. Diese Ränder brauchen eine **Content-Entscheidung** (behalten als drop-only vs. komplett aus Reward/Farming/Loot ziehen).

### 6.3 Save: verwaiste `skills.inscription`-XP → sanitize

`skills` ist `Record<SkillId, SkillState>`. Nach Skill-Entfernung bleibt ein verwaister `skills.inscription`-Eintrag im Save. Harmlos (überall via `?? 0` gelesen), aber unsauber. **sanitize:** in `sanitizeState` verwaiste Skill-Keys (nicht in `content.skills`) löschen — generisch, fängt auch zukünftige entfernte Skills. **Kein** SAVE_VERSION-Bump nötig (sanitize läuft bei jedem Load). Optional: im 37→38-Branch explizit `delete state.skills.inscription`.

---

## 7. F) Datei-Impact & Phasen

### Phase 1 — Instanz-Fundament + Affix-Enchants + Inscription-Abwicklung

**Logic-Dev (`shared`, `engine` außer combat.ts, `persistence`):**
- `shared/src/index.ts`: `InstanceId/AffixId/SuffixId`, `AffixInstance/SuffixInstance/ItemInstance`, `AffixDef`(+`SuffixDef` schon hier definieren), `InventorySlot.instance?`, `CharacterState.equippedInstances`, `GameState.bankInstances` + `nextInstanceSeq`, `ContentDB.affixes`(+`suffixes`), `ItemTypeTag` + `itemTypeTags()`, `enchantSlotsFor()`, `instanceDisplayName()`, `effectiveInstanceWeaponEffects()`, **SAVE_VERSION 37→38**.
- `engine/inventory.ts`: Instanz-Handling in `addItem`/Stack-Merge (Instanzen stapeln nie, brauchen freien Slot); Promote-to-Instance / Degrade-to-Stack-Helfer.
- `engine/equipment.ts`: Equip/Unequip führt `equippedInstances` mit; `applyAffix`/`disenchant`/`salvage`-Helfer.
- `engine/character.ts`: `computeStats` Instanz-Overlay-Pass (`addInstanceBonus`).
- `engine/state.ts`/`createCharacter`: `equippedInstances:{}`, `bankInstances:[]`, `nextInstanceSeq:0`.
- `engine/sim.ts`: `inscription_enchanting`-Zweig der `isEnchantRecipe`-Heuristik entfernen.
- `persistence/src/index.ts`: Migration 37→38 (additive Defaults), `sanitizeState` (Instanz-Validierung + verwaiste Skill-Keys löschen), Persistence-Test erweitern.

**Content-Dev (`content`):** Inscription entfernen (6.1); tiered Runen-Items + RC-Craft-Aktionen; `ContentDB.affixes` füllen; `item_scrap` (Salvage-Output); Glyphen/Schriftrollen/Pigment/Reed-Randentscheidungen umsetzen (nach Chef-Entscheidung).

**Combat-Dev (`combat.ts`):** `effectiveInstanceWeaponEffects()` in `resolveAttack()` einhängen (Affix-Waffeneffekte).

**UI-Dev (renderer):** Verzauberungstisch-Seite (Item-/Rune-Picker, Vorschau, Verbinden/Disenchant); Instanz-Namen/-Tooltips (Präfix+Suffix, Affix-Liste, Rarity-Färbung); Gear-Vault-Tab + Salvage-/Quick-Salvage-UI; Auto-Salvage-Settings.

### Phase 2 — Suffixe + Drops + Rüstungs-Enchants + Overflow-Politur

- **Logic-Dev:** Suffix-Roll-Engine (`rollSuffix(state, content, item, ilvl)` seeded) im **Craft-Abschluss-Pfad** (actions/tick) + **Drop-Pfad**-Hook; `suffixBonusAtIlvl`; Auto-Salvage-Filter im Drop/Craft-Overflow; Rüstungs-Affix-Slots aktivieren.
- **Content-Dev:** `ContentDB.suffixes` (Starter-Set 4.3); `ActionDef.suffixChance`/`LootRoll.suffixChance`; Rüstungs-Runen.
- **Combat-Dev:** ggf. Suffix-getriebene Effekte (falls Suffixe je Waffeneffekte tragen — Phase-2-Scope).

---

## 8. G) Offene Chef-Entscheidungen

1. **Overflow-Lösung (Hauptfrage):** Empfehlung = **Salvage-first + Gear Vault + opt-in Auto-Salvage**. Bestätigen? Soll Salvage **anteilig die Affix-Rune** zurückgeben (mild) oder nur Scrap+Gold (strenger Sink)?
2. **Suffix-Chance & -Scaling-Rahmen:** Wie hoch die Roll-1-Chance beim Craft (z.B. 15–30 %)? Drop-Chance niedriger? Wie stark koppelt ilvl an Stat-Höhe (linear vs. Treppen)? Min-ilvl-Gating für starke Suffixe?
3. **Enchant-Slots:** feste Tabelle (3.3) bestätigen oder andere Rarity→Slots-Staffel?
4. **Disenchant-Kosten:** Gold-Betrag pro Tier/Rarity (`enchantGoldCost`)? Rune immer weg (kein Refund) bestätigen?
5. **Inscription-Ränder:** **Glyphen + Schriftrollen** — als **drop-/reward-only** behalten (sie hängen in Quest/Dungeon-Rewards) oder komplett aus allen Reward-Tabellen ziehen? **Pigmente + Reeds (+ Seeds/Farming)** — bereinigen (toter Loop) oder an neues System andocken (z.B. Pigment → Affix-Reroll-Material)?
6. **Suffix vs. Affix gleichzeitig:** Darf ein Item **beides** tragen (Plan: ja — Präfix von der Rune, Suffix vom Roll)? Bestätigen.
7. **InstanceId/Save-Größe:** Instanzen blähen den Save leicht auf (Array statt Mengen-Map). Bei vielen Keepern OK? (Empfehlung: ja, vernachlässigbar; Gear Vault begrenzt sich faktisch über Salvage.)
8. **Rüstungs-Enchants:** Phase 2 bestätigen (Phase 1 nur Mainhand)?
```
