# Pet-/Begleiter-System — Design-Doc (Planung)

**Status:** Entwurf zur Chef-Freigabe. KEIN Code/Content geändert.
**Autor:** Logic-Dev. **Datum:** 2026-06-25.
**Scope:** Engine-Slot + Effekt-Anwendung (Logic-Dev), Content-Pets + Drops (Content-Dev),
UI Combat/Character/Collection (UI-Dev). Combat-Hooks an der Kill-Loot-Stelle berührt
`combat.ts` → **Combat-Dev**.

---

## 0. Bestandsaufnahme (wie Slots, Boni & Drops heute funktionieren)

### Equipment-Slots & Boni
- `EQUIP_SLOTS` (shared `index.ts:327`) ist ein `as const`-Array mit 11 Slots: `helmet, amulet,
  mainhand, offhand, body, legs, gloves, boots, cape, ring1, ring2`. `EquipSlot` ist daraus
  abgeleitet. `EQUIP_SLOT_LABELS` liefert die i18n-Labels (en/de).
- `CharacterState.equipment: Record<EquipSlot, ItemId | null>` (shared `index.ts:882`).
  `createCharacter` initialisiert jeden Slot auf `null` über `EQUIP_SLOTS` (character.ts:51).
- **`computeStats(state, content)` ist die einzige Aggregationsstelle** (character.ts:92). Sie
  iteriert `EQUIP_SLOTS`, addiert `item.modifiers` (Attribute) und `item.bonus` (`EquipBonus`:
  flache Kampfwerte), danach Buffs (`c.buffs[].itemId → item.buff.bonus`) und Set-Boni. Alle
  flachen Boni laufen durch den lokalen `addBonus(b: EquipBonus)`-Akkumulator.
- `EquipBonus` (shared `index.ts:372`) deckt: meleeDamage, rangedDamage, magicDamage, defense,
  accuracy, evasion, maxHp, critChance, critDamage, attackIntervalMs. **Es gibt heute KEINE
  Skilling-/Drop-/XP-Bonus-Felder** — Pets brauchen also eine eigene Effekt-Spezifikation.
- `equipItem`/`unequipItem` (equipment.ts) prüfen `item.type === "equipment"` + `item.slot` +
  Skill-Requirements und tauschen Inventar↔Slot. Ringe haben Sonderlogik (ring1→ring2).

### Drop-/Loot-System
- **Skilling-Drops:** `completeAction` (tick.ts:81) iteriert `action.loot: LootRoll[]`. Pro Roll:
  `nextFloat(state.rng) <= roll.chance` → Menge `nextInt(min,max)`, Mastery-Doppelertrag,
  dann `addItemOrBank`. `LootRoll` = `{ itemId, chance, min, max }`.
- **Combat-Drops:** `combat.ts:318` iteriert `monster.loot` identisch und ruft zusätzlich
  `markDropSeen(state, monster.id, roll.itemId)` (drops.ts) → Collection-Log.
- **Dungeon-Drops:** `combat.ts:377`, gleiches Muster über `dungeon.loot`.
- **Collection-Log:** `state.seenDrops: Record<MonsterId, ItemId[]>` (shared `index.ts:1058`),
  Helfer in `drops.ts` (`hasDropSeen`, `markDropSeen`, `seenDropCount`). Heute **nur monster-
  basiert** — Skilling-Drops werden nicht in `seenDrops` vermerkt.
- **RNG:** seeded, serialisierbar (`state.rng`), via `nextFloat`/`nextInt`/`nextIntInclusive`.
  Reihenfolge der Würfe ist determinismus-kritisch (Tests prüfen bit-identische Läufe).

### Vollständige Skill-Liste (21 Skills, aus content `index.ts:8`)
| # | Skill-ID | Typ | trains |
|---|---|---|---|
| 1 | woodcutting | Gather | str |
| 2 | mining | Gather | con |
| 3 | fishing | Gather | dex |
| 4 | farming | Gather | con |
| 5 | foraging | Gather | lck |
| 6 | thieving | Gather (active) | dex |
| 7 | smithing | Craft | — |
| 8 | cooking | Craft | — |
| 9 | fletching | Craft | — |
| 10 | leatherworking | Craft | — |
| 11 | jewelcrafting | Craft | — |
| 12 | runecrafting | Craft | — |
| 13 | herblore | Craft | — |
| 14 | inscription | Craft | — |
| 15 | attack | Combat | dex |
| 16 | power | Combat | str |
| 17 | defence | Combat | con |
| 18 | ranged | Combat | dex |
| 19 | magic_off | Combat | int |
| 20 | magic_def | Combat | wis |
| 21 | vitality | Combat | con |

→ **21 Skills.** Die 7 Combat-Skills teilen sich eine gemeinsame Drop-Quelle (Monster-Kills).
Statt 7 fast identischer Combat-Pets schlage ich **1 generisches Combat-Pet** (aus Kills) +
**Roster für alle Nicht-Combat-Skills (14)** vor. Das erfüllt „mind. 1 Pet pro Skill" sinnvoll,
ohne 7 redundante Kill-Pets. Optional erweiterbar auf style-spezifische Combat-Pets später.
→ **Empfohlenes Start-Roster: 15 Pets** (14 Skilling/Crafting + 1 Combat). Siehe §2.

---

## 1. Begleiter-Equipment-Slot

### Slot-Modell
- Neuer `EquipSlot` **`"companion"`** ans Ende von `EQUIP_SLOTS` anhängen (shared). Label:
  `companion: { en: "Companion", de: "Begleiter" }` in `EQUIP_SLOT_LABELS`.
- **Wichtig:** Pets sind **eigene Items mit `slot: "companion"`**, ABER ihr Effekt ist NICHT über
  `EquipBonus` modellierbar (Skill-/Drop-/XP-Boni existieren dort nicht). Zwei Optionen:

  **Option A (empfohlen): Pets sind KEINE normalen `equipment`-Items, sondern eine eigene
  Datenklasse `PetDef` + dedizierter State-Slot `character.companionPetId`.**
  Begründung: Pet-Effekte sind eine andere Effekt-Taxonomie als Gear (multiplikative
  Skill-Boni, QoL-Flags, Drop-Rate). Sie in `EquipBonus` zu pressen würde `computeStats`
  und das Item-Modell verwässern. Ein eigener Slot hält die Verantwortung sauber getrennt und
  vermeidet, dass Pets versehentlich verkauft/in Taschen gelegt/von Set-Logik erfasst werden.

  **Option B (verworfen): Pets als `equipment`-Items im `companion`-Slot + `EquipBonus` um
  Pet-Felder erweitern.** Bläht `EquipBonus`/`computeStats` mit Nicht-Kampf-Feldern auf und
  mischt Sammel-Tempo in die Kampf-Stat-Aggregation. Nur sinnvoll, wenn Pets ausschließlich
  Stat-Boni hätten — sie haben aber QoL/Drop/XP-Effekte.

**→ Empfehlung: Option A.** Pets sind eigene `PetDef`-Daten, besessene Pets als Set, genau ein
ausgerüstetes Pet in `character.companionPetId`. Der „Slot" ist UI-seitig sichtbar (im
Equipment-Raster), technisch aber ein eigenes Feld — `EQUIP_SLOTS` bleibt rein für Gear.

> Hinweis: Falls der Chef die UI-Konsistenz „Pet liegt im Equipment-Raster wie jedes andere Teil"
> höher gewichtet, ist Option B umsetzbar — dann MUSS `EquipBonus` eine optionale `pet?`-Sub-
> spezifikation tragen und `computeStats` einen separaten Pet-Pfad bekommen. Default-Empfehlung
> bleibt A wegen sauberer Trennung von Kampf- und Sammel-Effekten.

### Wo der Effekt greift
Ein ausgerüstetes Pet wirkt an genau definierten Hook-Punkten (siehe §3/§4):
- **computeStats** (character.ts): Pets mit Stat-Effekt addieren auf den `addBonus`-Akkumulator
  ODER setzen Multiplikatoren am Ende. Einzige Stat-Aggregationsstelle bleibt erhalten.
- **Skilling** (tick.ts `completeAction`/`step`): Sammel-/Craft-Tempo, +XP, +Doppelertrag,
  Material-Preservation, Pet-eigene Drop-Rate.
- **Combat** (combat.ts): Combat-Passive (z.B. Auto-Loot-Komfort, +Kill-XP, +Drop-Glück) —
  Combat-Dev-Revier.

### Anzeige (UI-Dev, hier nur Verortung geplant)
- **Character-Screen:** Pet-Slot als zusätzliche Kachel im Equipment-Raster (eigene Zeile/Box
  „Begleiter"), mit Pet-Icon/Art, Name und kompakter Effekt-Zeile. Klick → Pet-Auswahl-Popup
  (nur besessene Pets, eines aktiv). Bei leerem Slot Platzhalter „Kein Begleiter".
- **Combat-Screen:** ausgerüstetes Pet als kleines Begleiter-Sprite neben dem Spieler-Portrait
  (Art liefert der Chef später → vorerst Icon/Emoji-Platzhalter aus `PetDef.icon`). Tooltip
  zeigt den aktiven Effekt. Erscheint nur, wenn ein Pet ausgerüstet ist.
- Art-Pfad-Konvention: `PetDef.art` (z.B. `pets/<id>.png`) für späteres Auto-Discovery durch den
  asset-integrator; bis dahin `PetDef.icon` (Emoji) als Fallback.

---

## 2. Pet-Roster (Tabelle: Skill → Pet → Effekt → Quelle → Rate)

Effekte sind bewusst **gedeckelt** und thematisch. Raten als „pro Aktions-Abschluss / pro Kill"-
Wahrscheinlichkeit, unabhängig vom normalen Loot (eigener RNG-Wurf, siehe §4). „Pity/Scaling"
optional (siehe §4). Erfundene Namen — Chef hat kreative Freiheit erteilt.

### Skilling- & Crafting-Pets (14)

| Skill | Pet (Name) | Effekt (gedeckelt) | Drop-Quelle | Basis-Rate |
|---|---|---|---|---|
| woodcutting | **Borki, das Rindenkätzchen** | +5 % Holzfäll-Tempo | jede Woodcutting-Aktion (Baum fällen) | 1/100 000 |
| mining | **Klötzchen, der Geröllgolem** | +5 % Bergbau-Tempo | jede Mining-Aktion (Erz abbauen) | 1/100 000 |
| fishing | **Plitsch, der Reiher** | +4 % Doppelfang-Chance | jede Fishing-Aktion | 1/100 000 |
| farming | **Knolle, das Wurzelschwein** | +5 % Farming-Ertrag-Doppelchance | jede Farming-Aktion (Ernte) | 1/90 000 |
| foraging | **Glücksfuchs Filu** | +3 % globale Pet-Drop-Glück (siehe Hinweis) | jede Foraging-Aktion | 1/120 000 |
| thieving | **Mausebart, die Beutelmaus** | +3 % Thieving-Erfolgschance (additiv, Cap bleibt 0.95) | jeder Thieving-Versuch (auch Fehlschlag zählt) | 1/80 000 |
| smithing | **Funki, der Ambosskobold** | +4 % Smithing-XP | jede Smithing-Aktion | 1/100 000 |
| cooking | **Brutzel, der Herdgeist** | +5 % Cooking-Tempo | jede Cooking-Aktion | 1/100 000 |
| fletching | **Spänchen, der Schnitzspecht** | +4 % Fletching-Material-Preservation | jede Fletching-Aktion | 1/100 000 |
| leatherworking | **Nähnadel, der Gerbermarder** | +4 % Leatherworking-XP | jede Leatherworking-Aktion | 1/100 000 |
| jewelcrafting | **Glimmer, die Edelsteindrossel** | +4 % Jewelcrafting-Doppelertrag | jede Jewelcrafting-Aktion | 1/110 000 |
| runecrafting | **Runi, der Etzelwicht** | +5 % Runecrafting-Tempo | jede Runecrafting-Aktion | 1/110 000 |
| herblore | **Sproß, das Moosfäulchen** | +4 % Herblore-Material-Preservation | jede Herblore-Aktion | 1/100 000 |
| inscription | **Tintling, der Federkrake** | +4 % Inscription-XP | jede Inscription-Aktion | 1/100 000 |

### Combat-Pet (1)

| Quelle | Pet (Name) | Effekt (gedeckelt) | Drop-Quelle | Basis-Rate |
|---|---|---|---|---|
| Combat (alle 7 Skills) | **Schädelchen, der Grabwicht** | +3 % Kampf-XP UND Auto-Loot-Komfort (loggt entdeckte Drops, kein Stat-Vorteil) | jeder Monster-Kill | 1/75 000 |

**Balance-Hinweis Foraging-Pet (Glücksfuchs):** „+Pet-Drop-Glück" ist potenziell zirkulär
(Pet, das Pet-Drops verbessert). Deckel: max +3 % **multiplikativ auf die Pet-Drop-Rate** und nur
für die jeweils laufende Skill-Aktion, NICHT auf normalen Loot. Alternativ (sicherer, empfohlen
falls Zirkularität stört): Effekt auf **+2 % Foraging-Doppelertrag** ändern. Chef-Entscheidung.

**Rate-Charakter:** Alle Raten liegen im geforderten 1/75 000–1/120 000-Band (sehr-sehr-selten,
echte „Idle-Trophäen"). Mit Pity (§4) ist der Erwartungswert garantiert, ohne dass die Basis-
Rate spürbar steigt.

---

## 3. Effekt-Taxonomie

Eine geschlossene, typsichere Menge von Effekt-Arten (`PetEffectKind`). Jedes Pet hat **genau
einen** primären Effekt (optional ein QoL-Flag dazu), damit kein Pet alles dominiert.

| Kind | Wirkung | Anwendungs-Punkt | Deckel-Leitplanke |
|---|---|---|---|
| `skillSpeed` | −% Aktionsdauer eines Skills | tick.ts `step` (dur-Berechnung) | ≤ 5 % |
| `skillXp` | +% XP eines Skills | tick.ts `completeAction` (skill.xp) | ≤ 5 % |
| `skillDoubleYield` | +% Doppelertrag-Chance eines Skills | tick.ts `completeAction` (bonusChance) | ≤ 5 % |
| `skillPreserve` | +% Material-Preservation eines Crafts | tick.ts `completeAction` (preserveChance) | ≤ 5 % |
| `thievingSuccess` | +Erfolgschance (additiv) | tick.ts `completeAction` (actionSuccessChance bonus) | ≤ 3 %, Cap 0.95 bleibt |
| `combatXp` | +% Kampf-XP | combat.ts (addXp-Pfad) | ≤ 3 % |
| `statBonus` | flacher/`%`-Kampf-Stat-Bonus | computeStats (addBonus) | klein, nie Best-in-Slot-Pflicht |
| `dropLuck` | +% Pet-Drop-Chance (NICHT normaler Loot) | §4 Pet-Roll | ≤ 3 % |
| `autoLootQol` | reiner Komfort (Collection-Log-Sync) | combat.ts | kein Stat-Vorteil |
| `autoEatQol` | (reserviert) leichte Auto-Eat-Schwellen-QoL | combat.ts | optional, nicht im Start-Roster |

**Globale Balance-Leitplanken:**
- Kein Pet-Effekt > 5 %. Combat-relevante Effekte (combatXp, statBonus, dropLuck) ≤ 3 %.
- Pets sind **additive Komfort-Beschleuniger**, kein Pflicht-Must-Have. Ein Spieler ohne Pet
  ist nie „kaputt" — Pets verkürzen Grind marginal / geben Sammel-Stolz.
- Effekte gelten **nur für den eigenen Skill** (Mining-Pet beschleunigt nur Mining), außer
  explizit global (dropLuck/Combat-QoL).
- Stapeln nicht möglich: nur **ein** Pet aktiv. Kein Pet-Set, keine Multi-Pet-Synergien (kein
  Power-Creep).

---

## 4. Architektur

### 4.1 Datenmodell `PetDef` (shared, neue Datenklasse)
```ts
export type PetEffectKind =
  | "skillSpeed" | "skillXp" | "skillDoubleYield" | "skillPreserve"
  | "thievingSuccess" | "combatXp" | "statBonus" | "dropLuck"
  | "autoLootQol" | "autoEatQol";

export interface PetEffect {
  kind: PetEffectKind;
  /** Betroffener Skill (für skill*-Kinds). Fehlt → global (dropLuck/combat/QoL). */
  skill?: SkillId;
  /** Magnitude: bei %-Kinds als Bruch (0.05 = 5 %); bei statBonus eine EquipBonus-Teilmenge. */
  value?: number;
  /** Nur statBonus: flache Kampfwerte (wird in computeStats über addBonus angewandt). */
  bonus?: EquipBonus;
}

export interface PetDef {
  id: PetId;                 // PetId = string
  name: LocalizedString;
  description?: LocalizedString;
  effect: PetEffect;
  /** Welcher Skill droppt dieses Pet (für Guard-Test „Quelle existiert"). */
  sourceSkill: SkillId;
  /** Drop-Chance pro Aktions-Abschluss / Kill (z.B. 1/100000 = 0.00001). */
  dropChance: number;
  /** Optional: Pity-Schwelle in Aktionen → garantierter Drop. 0/fehlt = aus. */
  pityThreshold?: number;
  /** Emoji-Fallback bis Pixelart da ist. */
  icon?: string;
  /** Art-Pfad-Konvention pets/<id>.png (Auto-Discovery). */
  art?: string;
}
```
- `ContentDB` bekommt `pets: Record<PetId, PetDef>`. Content-Dev füllt das Roster aus §2.

### 4.2 State (GameState / CharacterState)
- `CharacterState.companionPetId: PetId | null` — das aktuell ausgerüstete Pet.
- `GameState.ownedPets: Record<PetId, true>` (oder `PetId[]`) — Set der besessenen Pets.
  Record bevorzugt (O(1)-Lookup, JSON-stabil).
- Optional Pity: `GameState.petProgress: Record<SkillId, number>` — Aktions-/Kill-Zähler seit
  letztem Pet-Drop pro Skill, für `pityThreshold`. Nur nötig, wenn Pity aktiviert wird.

### 4.3 Effekt-Anwendungs-Punkte (genau hier, nirgends sonst)
- **computeStats** (character.ts): nach Buffs/Sets ein Pet-Pfad — ist ein `statBonus`-Pet
  ausgerüstet, `addBonus(pet.effect.bonus)`. Bleibt die einzige Stat-Aggregationsstelle.
- **tick.ts `step` (Dauer):** `skillSpeed`-Pet → zusätzlicher Multiplikator `(1 - value)` in die
  `dur`-Formel, neben Tool/Mastery/Pool-Speed. Nur wenn `pet.effect.skill === action.skill`.
- **tick.ts `completeAction`:** `skillXp` (auf `skill.xp`), `skillDoubleYield` (auf `bonusChance`),
  `skillPreserve` (auf `preserveChance`), `thievingSuccess` (als `bonus`-Arg in
  `actionSuccessChance`). **Determinismus-kritisch:** Effekte, die eine bestehende Chance erhöhen,
  ziehen KEINEN neuen RNG-Wurf (sie modifizieren nur den Schwellenwert). Reihenfolge unverändert.
- **combat.ts (Combat-Dev):** `combatXp` auf Kill-XP, `autoLootQol`/`dropLuck` an der
  Kill-Loot-Stelle (`combat.ts:318`). Diese Hooks erfordern eine kleine Erweiterung in
  `combat.ts` → **Combat-Dev muss das umsetzen** (Logic-Dev liefert die reine Helper-Funktion in
  einem Logic-Modul, die Combat nur aufruft, z.B. `petCombatXpMult(state, content)`).

**Helper-Modul (Logic-Dev):** neues `packages/engine/src/pets.ts` mit reinen Funktionen:
`equippedPet(state, content): PetDef | null`, `equipPet/unequipPet`, `grantPet(state, petId)`,
`petSkillSpeedMult(state, content, skill)`, `petSkillXpMult`, `petDoubleYieldBonus`,
`petPreserveBonus`, `petThievingBonus`, `petStatBonus`, `petCombatXpMult`. tick.ts und
combat.ts rufen nur diese Helper — keine Pet-Logik wird dupliziert.

### 4.4 Rare-Drop-Mechanik (unabhängig vom normalen Loot)
- **Eigener RNG-Wurf** am Ende von `completeAction` (Skilling) bzw. am Kill-Pfad (Combat),
  **NUR wenn das Skill-Pet noch nicht besessen ist** (`!ownedPets[pet.id]`). Kein Wurf, wenn
  bereits besessen → Determinismus bleibt und kein verschwendeter RNG-Konsum.
  ```
  for (pet where pet.sourceSkill === action.skill && !owned):
      if nextFloat(rng) <= effectiveChance(pet, state):
          grantPet(state, pet.id); log "Pet erhalten!"
  ```
- **`effectiveChance`** = `pet.dropChance` × (1 + globaler dropLuck eines ausgerüsteten
  Foraging-Pets, gedeckelt). Per Skilling-Skill gibt es genau 1 Pet → max. 1 zusätzlicher Wurf
  pro Abschluss; pro Kill genau 1 Wurf fürs Combat-Pet.
- **Determinismus-Vorsicht:** Der zusätzliche Wurf verschiebt die RNG-Sequenz. Daher **nach**
  allen Loot-/Mastery-Würfen platzieren und nur ziehen, wenn ein noch-nicht-besessenes Pet für
  diesen Skill existiert. Bestehende Determinismus-Tests bleiben grün, solange frische States
  ohne Pet-fähige Aktion keinen Wurf auslösen — daher: Wurf nur, wenn `content.pets` ein
  passendes, noch nicht besessenes Pet hat. (Sobald Pets im Content sind, müssen die betroffenen
  Engine-Determinismus-Fixtures einmalig neu aufgenommen werden — als Test-Update einplanen.)
- **Pity (optional, empfohlen):** `pityThreshold` Aktionen ohne Drop → garantierter Drop beim
  nächsten Abschluss. Zähler `petProgress[skill]`++ pro Abschluss, Reset bei Drop. Verhindert
  Extrem-Pech bei 1/100k. Empfehlung Schwelle ≈ 2× Erwartungswert (z.B. 200 000 Aktionen) —
  bewusst hoch, damit der Glücks-Drop die Regel bleibt und Pity nur die Härtefälle abfängt.

### 4.5 Persistenz (SAVE_VERSION + Migration) — kritisch
**SAVE_VERSION: 28 → 29.**

Migration in `persistence/index.ts migrateState` (idempotent):
- `character.companionPetId`: fehlt → `null` setzen.
- `ownedPets`: fehlt/kein Objekt → `{}`.
- (falls Pity) `petProgress`: fehlt → `{}`.
- **Rename-Disziplin:** Pets sind eigene IDs (kein `equipment`-Item). Wird je eine Pet-ID
  umbenannt, gehört sie in eine Pet-Rename-Map, die `companionPetId` UND die `ownedPets`-Keys
  remappt — analog zur bestehenden Item-`RENAME`. Da Pets NICHT in `inventory.slots`, `bagSlots`,
  `equipment`, `food`, `buffs[].itemId` oder `bank` liegen (eigener Slot/Set), sind diese fünf
  bestehenden Rename-Pfade von Pet-Renames unberührt — Pets brauchen ihren eigenen Pfad.
- Persistenz-Test erweitern: Alt-Save (v28) ohne Pet-Felder lädt → Felder default-initialisiert;
  Round-Trip mit ausgerüstetem + besessenem Pet bleibt erhalten; (falls Rename) Pet-Rename mappt
  `companionPetId` + `ownedPets`-Keys.

### 4.6 Collection-Log / Pet-Übersicht
- Pets erweitern das Collection-Konzept um eine **Pet-Galerie** (eigene Seite/Tab): alle
  `content.pets`, besessene farbig + Effekt sichtbar, fehlende als „???"/silhouettiert mit
  Quelle-Hinweis („Drop aus <Skill>"). State-Quelle: `ownedPets`.
- `seenDrops` bleibt monster-only; Pet-Besitz wird separat über `ownedPets` getrackt (sauberer,
  da Pets auch aus Skilling kommen, das heute gar kein `seenDrops` schreibt).
- Helper (Logic-Dev): `ownsPet(state, petId)`, `ownedPetCount(state, content)` für den
  Galerie-Fortschritt („7/15 Begleiter gefunden").

---

## 5. Umsetzungs-Phasen & Guard-Tests

### Phase 1 — Engine-Slot + Effekt (Logic-Dev)
1. shared: `companion` in `EQUIP_SLOTS` + Label; `PetDef`/`PetEffect`/`PetId`/`PetEffectKind`;
   `ContentDB.pets`; `CharacterState.companionPetId`; `GameState.ownedPets` (+ optional
   `petProgress`); **SAVE_VERSION 28→29**.
2. engine: `pets.ts` (equip/unequip/grant + alle Effekt-Helper); Verdrahtung in `computeStats`
   (statBonus) und `tick.ts` (speed/xp/double/preserve/thieving + Pet-Drop-Wurf).
3. persistence: Migration (companionPetId/ownedPets default, Pet-Rename-Pfad-Gerüst) + Tests.
4. `createCharacter` initialisiert `companionPetId: null`; `createGame`/State-Init setzt
   `ownedPets: {}`.

### Phase 2 — Content-Pets + Drops (Content-Dev)
5. `content.pets` mit dem 15er-Roster aus §2 (Namen, Effekte, sourceSkill, dropChance, icon,
   art-Pfad). Sicherstellen: jeder Skill mit Skilling-Aktionen hat genau 1 Pet; Combat-Pet 1×.

### Phase 3 — Combat-Hooks (Combat-Dev)
6. `combat.ts`: am Kill-Pfad `petCombatXpMult` auf Kill-XP, Pet-Drop-Wurf fürs Combat-Pet,
   `autoLootQol`/`dropLuck` — ruft nur Logic-Helper aus `pets.ts`.

### Phase 4 — UI (UI-Dev)
7. Character-Screen: Pet-Slot-Kachel + Pet-Auswahl-Popup (nur besessene).
8. Combat-Screen: Begleiter-Sprite neben Spieler (Icon-Fallback bis Art da).
9. Pet-Galerie-Seite (Collection): besessen/fehlend + Effekt + Quelle, Fortschrittszähler.
10. i18n: alle Strings über `LocalizedString` (Pet-Namen/Effekte/Labels) — nichts hartkodieren.

### Guard-Tests (Logic-Dev / kontrolleur)
- **Jedes Pet erhältlich:** für jedes `content.pets[p]` existiert eine Aktion/Quelle mit
  `action.skill === p.sourceSkill` (bzw. Combat-Pet → mind. 1 Monster mit Loot/Kill). Verhindert
  „Pet ohne Drop-Quelle". (analog zu bestehenden `content-refs`/`wiring-audit`-Tests)
- **Effekt angewandt, nicht „defined-but-never-applied":** Test mappt jeden `PetEffectKind` auf
  seinen Anwendungs-Hook und prüft, dass ein Pet jedes Kinds eine messbare Wirkung hat
  (z.B. ausgerüstetes skillSpeed-Pet → `dur` sinkt; statBonus-Pet → `computeStats`-Diff;
  combatXp-Pet → mehr Kill-XP). Jeder im Content genutzte Kind MUSS einen aktiven Hook haben.
- **Drop-Mechanik deterministisch & gedeckelt:** seeded Lauf droppt das Pet reproduzierbar;
  kein RNG-Wurf, wenn Pet bereits besessen; effektive Chance ≤ Cap; Pity (falls an) garantiert
  Drop an der Schwelle.
- **Save-Migration:** v28-Round-Trip lädt mit Default-Pet-Feldern; v29-Round-Trip mit
  ausgerüstetem + besessenem Pet erhält State; Pet-Rename mappt korrekt.
- **Balance-Cap-Test:** kein `pet.effect.value` über dem Kind-Deckel (5 % bzw. 3 %).

### Verifikation vor „fertig"
1. `pnpm typecheck` (shared-Änderungen rippeln in engine/persistence/content/ui).
2. `pnpm --filter @hearthforge/persistence test` (Migration-Round-Trips).
3. `pnpm test` (Engine-Suite + sim `AUFFÄLLIGKEITEN (0)`). Bei Determinismus-Fixture-Updates
   wegen des Pet-Wurfs: einmalig neu aufnehmen und im Commit begründen.

---

## Kern-Empfehlung (Zusammenfassung für den Chef)

- **Slot-Modell:** Pet als **eigene Datenklasse `PetDef`** mit dediziertem
  `character.companionPetId` + `ownedPets`-Set (Option A), NICHT als normales Gear-Item. Saubere
  Trennung von Kampf- und Sammel-Effekten; `computeStats` bleibt einzige Stat-Aggregation. UI
  zeigt den Slot im Equipment-Raster (Character) und ein Begleiter-Sprite im Combat.
- **Roster-Umfang:** **15 Pets** — je 1 für die 14 Nicht-Combat-Skills (woodcutting … inscription)
  + 1 generisches Combat-Pet aus Kills (statt 7 redundanter Kill-Pets). Erfüllt „mind. 1 pro
  Skill"; erweiterbar auf style-spezifische Combat-Pets später.
- **Effekt-/Drop-Konzept:** geschlossene `PetEffectKind`-Taxonomie, **jeder Effekt ≤ 5 %**
  (Combat ≤ 3 %), nur 1 Pet aktiv, kein Stacking → bewusst kein Must-Have. Drops über
  **eigenen, vom Loot unabhängigen RNG-Wurf** pro Aktion/Kill bei 1/75k–1/120k, Wurf nur wenn
  Pet noch nicht besessen; **optionales Pity** fängt Extrem-Pech ab.
- **Save-Disziplin:** **SAVE_VERSION 28 → 29**, Migration default-initialisiert
  `companionPetId`/`ownedPets`(/`petProgress`) und bietet einen eigenen Pet-Rename-Pfad
  (companionPetId + ownedPets-Keys); Persistenz-Test erweitert.

### Offene Chef-/Routing-Entscheidungen
- A vs. B Slot-Modell (Empfehlung A).
- 15-Pet-Roster vs. volle 21 (7 style-spezifische Combat-Pets) — Empfehlung 15.
- Foraging-Pet „dropLuck" (zirkulär) vs. „Foraging-Doppelertrag" (sicherer) — §2-Hinweis.
- Pity an/aus + Schwelle.
- **Content-Dev** erfindet/balanciert finale Raten & Pet-Icons; **Combat-Dev** baut die
  Combat-Hooks (Kill-XP/Pet-Wurf); **UI-Dev** Character-Slot + Combat-Sprite + Pet-Galerie;
  **asset-integrator** bindet später die Pet-PNGs (`pets/<id>.png`).

**Doc-Pfad:** `G:\GameDev\design\pet-system-plan.md`
