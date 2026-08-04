# Inscription — Ausbau-Plan (Glyphen / Schriftrollen / Runen)

> PLAN-ONLY. Dieses Doc liefert die NUMMERN + die exakte Andock-Mechanik.
> Content-dev setzt es 1:1 in `packages/content/src/index.ts` um. Kein Code/Content wird hier editiert.

## 1. Rolle im Utility-Modell

Chef-Kette: **Foraging/Farming → Herblore/Inscription → Power**.

Inscription ist der **Gear-Verzauberungs-Pfad** und koppelt an das bestehende
**Enchant/Rune-System (#63)**. Inscription verbraucht die Cross-Skill-Vertrags-Outputs
von Farming + Foraging (Pigmente C, Schilf/Faser D, Essenzen B) und produziert in
einer **2-stufigen Kette**:

1. **Zwischenprodukte** — Tinten (`ink_*`) aus Pigmenten, Pergament/Vellum aus Schilf.
2. **Endprodukte** — drei Senken:
   - **Gear-Verzauberungen** (Glyphen-Sigille → andocken an #63, beschichten Ausrüstung mit +Stats/weaponEffect),
   - **Kampf-Schriftrollen** (Buff-Consumables),
   - **Utility-Rollen** (XP/Recall — als Vorschlag markiert, brauchen Engine-Support).

---

## 2. Bestandsaufnahme — was HEUTE existiert

### 2.1 Inscription aktuell (`packages/content/src/index.ts`)
**Items** (`items`):
- `soot_ink` (Tinte, aus `ashen_dust`), `ether_ink` (Tinte, aus `aether_essence`)
- `blank_parchment` (Pergament, aus `grimwheat`)
- 7 Buff-Glyphen (consumable, `buff: {durationMs, bonus}`):
  `glyph_of_might`, `glyph_of_warding`, `glyph_of_precision`, `glyph_of_the_zealot`,
  `glyph_of_the_bulwark`, `glyph_of_alacrity`, `glyph_of_ruin`

**Recipes** (`actions`, `skill: "inscription"`):
- Kat. `ink_paper`: `grind_soot_ink`, `press_parchment`, `grind_ether_ink`
- Kat. `glyphs`: `scribe_glyph_might/warding/precision/zealot/bulwark/alacrity/ruin`

**Categories** vorhanden: `ink_paper`, `glyphs`. Achievements (L10…99) existieren.

**Lücken:** Springt direkt von Tinte zu Buff-Glyphe. **Keine** Gear-Verzauberung (die
eigentliche Skill-Identität laut #63). Inputs sind heute Skilling-Reste (`ashen_dust`,
`grimwheat`, RC-Essenzen) statt der Vertrags-IDs (Pigmente/Schilf/Foraging-Essenzen).

### 2.2 Enchant/Rune-System #63 — die Andock-Stelle (HEUTE in `runecrafting`)
Das #63-„Enchanting" ist **kein Socket/Laufzeit-System**, sondern ein **Crafting-Rezept-Muster**:

> **Rezept** (`category: "rune_enchanting"`) konsumiert ein **Basis-Gear-Item (qty 1, nicht
> stapelbar)** + **Runen (stapelbar, qty N)** → erzeugt eine **neue, eigenständige `ItemDef`**
> (die „verzauberte" Variante) mit höherem `bonus` und optional `weaponEffect` / `weaponEffects[]`.

Beispiel (Vorlage, exakt so andocken):
```
// Rezept (runecrafting → rune_enchanting)
enchant_flaming_steel_sword: {
  skill: "runecrafting", category: "rune_enchanting",
  inputs: [{ itemId: "steel_sword", qty: 1 }, { itemId: "fire_rune", qty: 3 }],
  loot:   [{ itemId: "flaming_steel_sword", chance: 1, min: 1, max: 1 }],
}
// Output-ItemDef
flaming_steel_sword: {
  type: "equipment", slot: "mainhand", weaponStyle: "melee", weaponType: "sword",
  bonus: { meleeDamage: 20, accuracy: 30 },
  weaponEffect: { type: "burn", chance: 0.30, magnitude: 6, durationMs: 4000 },
  requirements: { attack: 20, runecrafting: 18 }, rarity: "magic",
}
```
Relevante Felder (`packages/shared/src/index.ts`):
- `WeaponEffect = { type: StatusType; chance: 0..1; magnitude; durationMs }`,
  `StatusType = "burn" | "frost" | "shock" | "poison" | "bleed"`.
- Eine Waffe trägt `weaponEffect?` UND/ODER `weaponEffects?[]`; combat-dev iteriert über
  `effectiveWeaponEffects(item)` → Fusionen (z.B. void = burn+bleed) funktionieren automatisch.
- `EquipBonus`: `meleeDamage, rangedDamage, magicDamage, defense, accuracy, evasion, maxHp,
  maxMana, manaRegen, critChance, critDamage, attackIntervalMs` (alle additiv).
- Buff-Consumable: `buff: { durationMs: number; bonus: EquipBonus }` (nur EquipBonus, kein skillXp).
- Runen sind reine **stapelbare `material`-Items**; ihre einzige Funktion ist „Input einer
  Enchant-Recipe". Genau hier dockt Inscription an.

**Andock-Entscheidung:** Inscription bekommt eine **eigene Enchant-Recipe-Familie**
(`category: "inscription_enchanting"`), die exakt dem Muster oben folgt, aber statt
RC-Runen die **Inscription-Sigille** (`sigil_*`, neue stapelbare `material`-Items) +
Basis-Gear verbraucht und eine **inscribed `ItemDef`** mit `bonus`/`weaponEffect` ausgibt.
So nutzt Inscription **denselben Mechanismus, dieselben Felder, dieselbe combat-Pipeline** —
keine Parallel-Engine. (Vertrag „ERWEITERE Rune-Quelle = Inscription": die Sigille SIND
Inscriptions Runen; die Enchant-Recipes sind Inscriptions Pendant zu RCs `rune_enchanting`.)

---

## 3. Cross-Skill-Vertrag — konsumierte Input-IDs

| Gruppe | T1 | T2 | T3 | T4 | T5 | Herkunft |
|---|---|---|---|---|---|---|
| C Pigment | `pigment_umber` | `pigment_umber` | `pigment_verdant` | `pigment_violet` | `pigment_radiant` | Farming+Foraging |
| D Schilf/Faser | `reed_pale` | `reed_pale` | `reed_iron` | `reed_iron` | `reed_void` | Farming |
| B Essenz | `essence_ash` | `essence_gloom`¹ | `essence_storm`¹ | `essence_astral`¹ | `essence_divine` | Foraging (sekundär) |

¹ Vertrag fixiert nur Endpunkte `essence_ash`(T1) … `essence_divine`(T5). Mittel-IDs
`essence_gloom/storm/astral` sind mein VORSCHLAG für T2–T4 — final mit Foraging-Designer
abstimmen. Falls Foraging andere Namen liefert: 1:1 in den Rezepten unten ersetzen.

Tier-Levelbänder: **T1 = 1–20, T2 = 21–40, T3 = 41–60, T4 = 61–80, T5 = 81–99.**

---

## 4. Stufe 1 — Zwischenprodukte (Tinte + Pergament)

### 4.1 Neue / re-sourcte Items (`items`)
```
ink_umber:   { type:"material", stackable:true, icon:"🖤", value:7  }   // T1–2 Basistinte
ink_verdant: { type:"material", stackable:true, icon:"💚", value:22, rarity:"magic" }      // T3
ink_violet:  { type:"material", stackable:true, icon:"🟣", value:60, rarity:"magic" }      // T4
ink_radiant: { type:"material", stackable:true, icon:"✨", value:140, rarity:"rare" }      // T5
vellum:      { type:"material", stackable:true, icon:"📜", value:30, rarity:"magic" }      // T3–4 Pergament
void_vellum: { type:"material", stackable:true, icon:"📜", value:120, rarity:"rare" }      // T5 Pergament
```
**Reuse:** `blank_parchment` bleibt das T1–2-Pergament (nur Quelle ändern → `reed_pale`).
`soot_ink` und `ether_ink` werden durch `ink_umber`/`ink_violet` ersetzt — siehe Migration §8.

### 4.2 Rezepte (`actions`, `category: "ink_paper"`)
| id | output | level | durMs | xp | inputs (Vertrags-ID × qty) |
|---|---|---|---|---|---|
| `grind_ink_umber` | `ink_umber` ×2 | 1 | 2500 | 1 | `pigment_umber` ×1 |
| `press_parchment`¹ | `blank_parchment` ×2 | 1 | 3000 | 1 | `reed_pale` ×2 |
| `grind_ink_verdant` | `ink_verdant` ×1 | 30 | 3500 | 3 | `pigment_verdant` ×2 |
| `mill_vellum` | `vellum` ×2 | 40 | 4000 | 6 | `reed_iron` ×2 |
| `grind_ink_violet` | `ink_violet` ×1 | 55 | 5000 | 16 | `pigment_violet` ×2 |
| `grind_ink_radiant` | `ink_radiant` ×1 | 82 | 7000 | 88 | `pigment_radiant` ×2 |
| `press_void_vellum` | `void_vellum` ×2 | 82 | 6000 | 75 | `reed_void` ×2 |

¹ `press_parchment` existiert — nur `inputs` von `grimwheat` → `reed_pale` umstellen, `xp` 2→1.

---

## 5. Stufe 2a — Gear-Verzauberungen (ANDOCK an #63)

Zwei Schritte, beide echtes #63-Muster:

**(i) Sigil schreiben** → stapelbares `material` (= Inscriptions „Rune").
**(ii) Gear inschreiben** → Basis-Gear + Sigil → inscribed `ItemDef` mit `bonus`/`weaponEffect`.

### 5.1 Sigil-Items (`items`, `type:"material"`, stapelbar)
Jedes Sigil trägt eine Element-/Effekt-Identität (Mapping → `weaponEffect.type` bzw. Stat).
```
sigil_might:  { icon:"💢", value:12,  rarity:"common" }   // → +meleeDamage/+accuracy (kein Status)
sigil_ember:  { icon:"🔥", value:20,  rarity:"magic"  }   // → burn
sigil_frost:  { icon:"🧊", value:26,  rarity:"magic"  }   // → frost
sigil_ward:   { icon:"🛡️", value:24,  rarity:"magic"  }   // → +defense/+maxHp (kein Status)
sigil_storm:  { icon:"⚡", value:40,  rarity:"rare"   }   // → shock
sigil_swift:  { icon:"💨", value:44,  rarity:"rare"   }   // → +evasion/-attackInterval (kein Status)
sigil_void:   { icon:"🌌", value:130, rarity:"epic"   }   // → burn+bleed (Fusion via weaponEffects[])
```

### 5.2 Sigil-Rezepte (`actions`, `category: "glyphs"` — Sigil-Schreiben)
Rezept-Form = `ink_* + parchment/vellum + essence_*` → Sigil. (Inks/Pergament aus §4, Essenz aus Vertrag B.)

| id | output | level | durMs | xp | inputs |
|---|---|---|---|---|---|
| `scribe_sigil_might` | `sigil_might` | 8 | 4000 | 1 | `ink_umber`×2, `blank_parchment`×1, `essence_ash`×1 |
| `scribe_sigil_ember` | `sigil_ember` | 16 | 4500 | 2 | `ink_umber`×2, `blank_parchment`×1, `essence_ash`×2 |
| `scribe_sigil_frost` | `sigil_frost` | 30 | 5000 | 5 | `ink_verdant`×2, `blank_parchment`×2, `essence_gloom`×2 |
| `scribe_sigil_ward` | `sigil_ward` | 36 | 5000 | 6 | `ink_verdant`×2, `vellum`×1, `essence_gloom`×2 |
| `scribe_sigil_storm` | `sigil_storm` | 52 | 6000 | 17 | `ink_violet`×2, `vellum`×2, `essence_storm`×2 |
| `scribe_sigil_swift` | `sigil_swift` | 58 | 6500 | 25 | `ink_violet`×2, `vellum`×2, `essence_storm`×3 |
| `scribe_sigil_void` | `sigil_void` | 84 | 9000 | 125 | `ink_radiant`×3, `void_vellum`×2, `essence_divine`×3 |

### 5.3 Inschreib-Rezepte (`actions`, `category: "inscription_enchanting"`)
Muster identisch zu RC `rune_enchanting`: **Basis-Gear ×1 (nicht stapelbar) + Sigil ×N → inscribed ItemDef.**
Drei Stile parallel pro Band, plus Rüstung. Basis-Gear-IDs = Platzhalter: content-dev wählt
ein **existierendes, von RC NICHT bereits verzaubertes** Basis-Item des passenden Tiers.

| id | output (neu) | level | durMs | xp | inputs (Basis ×1 + Sigil ×N) | Stil |
|---|---|---|---|---|---|---|
| `inscribe_keen_dagger` | `keen_bronze_dagger` | 10 | 7000 | 2 | `bronze_dagger`×1, `sigil_might`×3 | melee |
| `inscribe_umber_wand` | `umber_apprentice_wand` | 14 | 8000 | 3 | `apprentice_wand`×1, `sigil_might`×2, `sigil_ember`×1 | magic |
| `inscribe_ember_shortbow` | `ember_oak_shortbow` | 18 | 9000 | 5 | `oak_shortbow`×1, `sigil_ember`×3 | ranged |
| `inscribe_warding_body` | `warding_leather_body` | 36 | 12000 | 15 | `hard_leather_body`×1, `sigil_ward`×4 | armor |
| `inscribe_frost_mace` | `frost_steel_mace` | 42 | 13000 | 23 | `steel_mace`×1, `sigil_frost`×4 | melee |
| `inscribe_storm_longbow` | `storm_mithril_longbow` | 58 | 16000 | 61 | `mithril_longbow`×1, `sigil_storm`×4, `sigil_swift`×2 | ranged |
| `inscribe_verdant_staff` | `verdant_runite_staff` | 60 | 16000 | 68 | `runite_staff`×1, `sigil_frost`×3, `sigil_swift`×2 | magic |
| `inscribe_void_greatblade` | `void_inscribed_greatblade` | 86 | 24000 | 367 | `titanium_greatsword`×1, `sigil_void`×4 | melee |
| `inscribe_radiant_crossbow` | `radiant_bloodiron_crossbow` | 88 | 22000 | 372 | `bloodiron_crossbow`×1, `sigil_void`×3, `sigil_swift`×3 | ranged |
| `inscribe_astral_runestaff` | `astral_godiron_staff` | 90 | 24000 | 448 | `godiron_staff`×1, `sigil_void`×3, `sigil_storm`×3 | magic |

> Hinweis (Sim/Inventar): nicht-stapelbare Basis-Inputs belegen je 1 Slot — `sim.ts` behandelt
> `inscription_enchanting` wie `rune_enchanting` (nur 1 Basis im Inventar). Kategorie-Name daher
> bewusst analog. Falls die Sim-Heuristik per Kategorie-Whitelist läuft: `inscription_enchanting`
> dort ergänzen (logic-/engine-dev), sonst stallt die Aktion fälschlich.

### 5.4 Output-ItemDefs der Gear-Verzauberungen (exakte Felder)
Stat-Höhen folgen der bestehenden RC-Enchant-Ladder (siehe `forceful_iron_sword` … `void_greatsword`),
damit Inscription-Gear **nicht** stärker/schwächer als RC-Gear gleichen Tiers ist (Power-Parität).
Drei-Stile-Parität: melee = roh + lifesteal-tauglich; ranged = etwas weniger roh, dafür
`critChance`/`evasion`/`-attackIntervalMs`; magic = `magicDamage` + `manaCost` + burn-DoT.
Platzhalter-Werte (content-dev darf an die jeweilige Basis-Tier-Kurve anpassen):

```
keen_bronze_dagger:   { type:"equipment", slot:"mainhand", weaponStyle:"melee", weaponType:"dagger",
  bonus:{ meleeDamage:9, accuracy:12, critChance:0.04, attackIntervalMs:-200 },
  requirements:{ attack:5, inscription:10 }, rarity:"magic", value:180 }

umber_apprentice_wand: { type:"equipment", slot:"mainhand", weaponStyle:"magic", weaponType:"wand",
  bonus:{ magicDamage:10, accuracy:14, maxMana:8 }, manaCost:6,
  weaponEffect:{ type:"burn", chance:0.25, magnitude:3, durationMs:4000 },
  requirements:{ magic_off:8, inscription:14 }, rarity:"magic", value:220 }

ember_oak_shortbow:   { type:"equipment", slot:"mainhand", weaponStyle:"ranged", weaponType:"shortbow",
  bonus:{ rangedDamage:11, accuracy:18, critChance:0.05, evasion:4, attackIntervalMs:-200 },
  ammoType:"bronze_arrow",
  weaponEffect:{ type:"burn", chance:0.25, magnitude:3, durationMs:4000 },
  requirements:{ ranged:12, inscription:18 }, rarity:"magic", value:260 }

warding_leather_body: { type:"equipment", slot:"body",
  bonus:{ defense:18, maxHp:55, evasion:6 },
  requirements:{ defence:25, inscription:36 }, rarity:"rare", value:820 }

frost_steel_mace:     { type:"equipment", slot:"mainhand", weaponStyle:"melee", weaponType:"mace",
  bonus:{ meleeDamage:34, accuracy:52 },
  weaponEffect:{ type:"frost", chance:0.30, magnitude:1, durationMs:4000 },
  requirements:{ attack:40, inscription:42 }, rarity:"rare", value:1500 }

storm_mithril_longbow:{ type:"equipment", slot:"mainhand", weaponStyle:"ranged", weaponType:"longbow",
  bonus:{ rangedDamage:48, accuracy:100, critChance:0.08, evasion:11, attackIntervalMs:-300 },
  ammoType:"mithril_arrow",
  weaponEffect:{ type:"shock", chance:0.24, magnitude:0.25, durationMs:3000 },
  requirements:{ ranged:60, inscription:58 }, rarity:"epic", value:4400 }

verdant_runite_staff: { type:"equipment", slot:"mainhand", weaponStyle:"magic", weaponType:"staff",
  twoHanded:true, bonus:{ magicDamage:60, accuracy:84, critChance:0.03, maxMana:25, manaRegen:1 }, manaCost:11,
  weaponEffect:{ type:"frost", chance:0.30, magnitude:1, durationMs:5000 },
  requirements:{ magic_off:60, inscription:60 }, rarity:"epic", value:6200 }

void_inscribed_greatblade: { type:"equipment", slot:"mainhand", weaponStyle:"melee", weaponType:"greatsword",
  twoHanded:true, bonus:{ meleeDamage:166, accuracy:112, attackIntervalMs:1100 },
  weaponEffects:[ { type:"burn", chance:0.25, magnitude:22, durationMs:4000 },
                  { type:"bleed", chance:0.25, magnitude:18, durationMs:4000 } ],
  requirements:{ attack:80, inscription:86 }, rarity:"legendary", value:14500 }

radiant_bloodiron_crossbow:{ type:"equipment", slot:"mainhand", weaponStyle:"ranged", weaponType:"crossbow",
  bonus:{ rangedDamage:120, accuracy:150, critChance:0.12, critDamage:0.25, evasion:14, attackIntervalMs:-400 },
  ammoType:"bloodiron_bolt",
  weaponEffect:{ type:"burn", chance:0.30, magnitude:20, durationMs:5000 },
  requirements:{ ranged:88, inscription:88 }, rarity:"legendary", value:13500 }

astral_godiron_staff: { type:"equipment", slot:"mainhand", weaponStyle:"magic", weaponType:"staff",
  twoHanded:true, bonus:{ magicDamage:150, accuracy:150, critChance:0.06, maxMana:60, manaRegen:2 }, manaCost:16,
  weaponEffects:[ { type:"burn", chance:0.33, magnitude:33, durationMs:5500 },
                  { type:"shock", chance:0.24, magnitude:0.3, durationMs:3000 } ],
  requirements:{ magic_off:90, inscription:90 }, rarity:"legendary", value:15500 }
```
> `requirements` nutzt die Kampf-Stil-Keys wie bei RC (`attack`/`ranged`/`magic_off`/`defence`)
> PLUS `inscription: <level>` — exakt wie RC dort `runecrafting: <level>` setzt. Das ist der
> sichtbare „Andock"-Vertrag im Item: Gear ist nur tragbar, wenn Inscription hoch genug ist.

---

## 6. Stufe 2b — Kampf-Schriftrollen (Buff-Consumables)

Nutzt das bestehende `buff: {durationMs, bonus: EquipBonus}`-Modell (wie die 7 Glyphen heute).
Die **7 vorhandenen Glyphen bleiben** — nur ihre Rezept-Inputs werden auf die Vertrags-Kette
umgestellt (§8). Neu kommen 3 hochstufige Schriftrollen oben drauf (T4–T5 Senke für `ink_radiant`/`essence_divine`):

| id (action) | output (neu, consumable) | level | durMs | xp | inputs | buff (`durationMs` 300000) |
|---|---|---|---|---|---|---|
| `scribe_scroll_overload` | `scroll_of_overload` | 75 | 11000 | 98 | `ink_violet`×2, `vellum`×2, `essence_storm`×2 | `{ meleeDamage:16, rangedDamage:16, magicDamage:16, critChance:0.05 }` |
| `scribe_scroll_aegis` | `scroll_of_aegis` | 78 | 11000 | 113 | `ink_violet`×2, `vellum`×2, `essence_astral`×2 | `{ defense:22, maxHp:80, evasion:12 }` |
| `scribe_scroll_cataclysm` | `scroll_of_cataclysm` | 95 | 14000 | 334 | `ink_radiant`×3, `void_vellum`×2, `essence_divine`×3 | `{ meleeDamage:24, rangedDamage:24, magicDamage:24, critChance:0.08, critDamage:0.25 }` |

Output-ItemDef-Form (wie `glyph_of_ruin`):
```
scroll_of_overload: { type:"consumable", stackable:true, icon:"📜", value:300, rarity:"epic",
  buff:{ durationMs:300000, bonus:{ meleeDamage:16, rangedDamage:16, magicDamage:16, critChance:0.05 } } }
```

### 6.1 VORSCHLAG — echte Einmal-Schaden-Schriftrolle (braucht Engine-Feld)
Eine „wirf-Schriftrolle-für-Sofortschaden"-Senke existiert mechanisch noch **nicht**:
`consumable` kennt nur `buff` (timed EquipBonus) + `healAmount`. Für eine offensive
Verbrauchs-Rolle (z.B. „Schriftrolle der Verbrennung: 40 Sofortschaden + burn") müsste
combat-/logic-dev ein Feld wie `combatConsumable?: { directDamage?: number; applyEffect?: WeaponEffect }`
einführen. **Nicht** Teil dieses Plans — als separates Ticket markieren, falls gewünscht.

---

## 7. Stufe 2c — Utility-Rollen (VORSCHLÄGE, Engine-Support nötig)

Beide passen thematisch, sind aber mit dem heutigen `consumable`-Modell **nicht** abbildbar
(`buff.bonus` ist reines `EquipBonus`, kein skillXp; Zonen-Teleport ist kein Consumable-Pfad).
Daher als Vorschlag mit Zahlen geparkt — erst umsetzen, wenn logic-dev das Feld liefert:

| id (action) | output | level | durMs | xp | inputs | Effekt-Vorschlag | benötigt |
|---|---|---|---|---|---|---|---|
| `scribe_scroll_insight_xp` | `scroll_of_insight` | 50 | 9000 | 23 | `ink_violet`×1, `vellum`×1, `essence_storm`×1 | +5 % Skilling-XP, 30 min | neues `buff.skillXp` o. `skillBuff`-Feld (vgl. Pet `skillEffect`) |
| `scribe_scroll_recall` | `scroll_of_recall` | 40 | 8000 | 13 | `ink_verdant`×1, `vellum`×1 | Direkt-Wechsel in bereits freigeschaltete Kampfzone | Zonen-/Travel-System-Hook (existiert heute nicht) |

---

## 8. Migration / Re-Sourcing der bestehenden Inscription-Inhalte

Damit alles an der Vertragskette hängt (statt an Skilling-Resten):

1. **`grind_soot_ink`** → ersetzen durch `grind_ink_umber` (Input `ashen_dust` → `pigment_umber`).
   `soot_ink`-Item → `ink_umber` umbenennen ODER `soot_ink` als Alias behalten und Quelle ändern.
2. **`grind_ether_ink`** → ersetzen durch `grind_ink_violet` (Input `aether_essence` → `pigment_violet`).
   `ether_ink` → `ink_violet`.
3. **`press_parchment`** → Input `grimwheat` → `reed_pale`.
4. **Bestehende 7 Glyph-Rezepte** (`scribe_glyph_*`): Inputs auf neue Kette umstellen —
   `soot_ink`→`ink_umber`, `ether_ink`→`ink_violet`, `blank_parchment` bleibt,
   RC-Essenzen (`dim_/frost_/aether_essence`) → Vertrags-`essence_*` desselben Tiers.
   Level/durMs/xp/`buff` der Glyphen **unverändert** lassen (die sind ok).
5. **Categories ergänzen** (`actionCategories`): neu `inscription_enchanting`
   (`{ en:"Inscribe Gear", de:"Gear inschreiben" }`). `ink_paper` + `glyphs` bleiben.

> SAVE/Persistenz: Wenn Items umbenannt werden (soot_ink→ink_umber etc.), Migration in
> `packages/persistence` mitziehen (Memory-Regel „Save-Logik immer mitziehen"): alte Item-IDs
> in Inventar/Bank auf neue mappen, `SAVE_VERSION` erhöhen. Sicherer Weg: alte IDs als
> Alias-Items behalten und nur die **Rezept-Inputs** umstellen → keine Save-Migration nötig.

---

## 9. XP-Kurven-Check (alle Rezepte gegen `target_xph`)

`xp = round(target_xph(level) · durMs / 3_600_000)`, min 1. Resultierende XP/h vs. Ziel:

| Recipe | Lvl | xp | XP/h | target/h | Δ |
|---|---|---|---|---|---|
| grind_ink_umber | 1 | 1 | 1440 | 820 | +Floor (min-1) |
| press_parchment | 1 | 1 | 1200 | 820 | +Floor |
| grind_ink_verdant | 30 | 3 | 3086 | 3451 | −11 % |
| mill_vellum | 40 | 6 | 5400 | 5654 | −4 % |
| grind_ink_violet | 55 | 16 | 11520 | 11873 | −3 % |
| grind_ink_radiant | 82 | 88 | 45257 | 45182 | ~0 |
| press_void_vellum | 82 | 75 | 45000 | 45182 | ~0 |
| scribe_sigil_might | 8 | 1 | 900 | 1167 | −23 % (min-1) |
| scribe_sigil_ember | 16 | 2 | 1600 | 1729 | −7 % |
| scribe_sigil_frost | 30 | 5 | 3600 | 3451 | +4 % |
| scribe_sigil_ward | 36 | 6 | 4320 | 4640 | −7 % |
| scribe_sigil_storm | 52 | 17 | 10200 | 10235 | ~0 |
| scribe_sigil_swift | 58 | 25 | 13846 | 13773 | +1 % |
| scribe_sigil_void | 84 | 125 | 50000 | 49885 | ~0 |
| inscribe_keen_dagger | 10 | 2 | 1029 | 1285 | −20 % (Sink-Rabatt ok) |
| inscribe_ember_shortbow | 18 | 5 | 2000 | 1909 | +5 % |
| inscribe_warding_body | 36 | 15 | 4500 | 4640 | −3 % |
| inscribe_frost_mace | 42 | 23 | 6369 | 6242 | +2 % |
| inscribe_storm_longbow | 58 | 61 | 13725 | 13773 | ~0 |
| inscribe_verdant_staff | 60 | 68 | 15300 | 15206 | +1 % |
| inscribe_void_greatblade | 86 | 367 | 55050 | 55077 | ~0 |
| inscribe_radiant_crossbow | 88 | 372 | 60873 | 60810 | ~0 |
| inscribe_astral_runestaff | 90 | 448 | 67200 | 67139 | ~0 |
| scribe_scroll_overload | 75 | 98 | 32073 | 31950 | ~0 |
| scribe_scroll_aegis | 78 | 113 | 36982 | 37065 | ~0 |
| scribe_scroll_cataclysm | 95 | 334 | 85886 | 85997 | ~0 |

Alle Werte ≤ ~10 % vom Ziel ab L16 aufwärts; die kleinen Minus-Abweichungen ganz unten sind
der `min 1 xp`-Floor bzw. ein bewusster Mini-Rabatt auf Gear-Inschreib-Rezepte (sie sind eine
Senke, kein XP-Grind). Keine Nullen, keine Cliffs — glatte Leiter über alle 5 Tiers.

---

## 10. Apply-Liste für content-dev (geordnet)

1. **Items hinzufügen:** `ink_umber, ink_verdant, ink_violet, ink_radiant, vellum, void_vellum`;
   Sigille `sigil_might/ember/frost/ward/storm/swift/void`; inscribed Gear (10 ItemDefs §5.4);
   Scrolls `scroll_of_overload/aegis/cataclysm` (§6).
2. **Category** `inscription_enchanting` in `actionCategories` ergänzen.
3. **Ink/Parchment-Rezepte** (§4.2) — inkl. `press_parchment` re-source.
4. **Sigil-Rezepte** (§5.2).
5. **Inschreib-Rezepte** (§5.3, `category:"inscription_enchanting"`).
6. **Scroll-Rezepte** (§6).
7. **Migration** (§8): alte Tinten/Glyph-Rezepte auf Vertrags-Inputs umstellen
   (sicherste Variante: alte Item-IDs als Alias behalten → keine Save-Migration).
8. **Sim-Check anstoßen** (engine/logic-dev): `inscription_enchanting` in der
   nicht-stapelbar-Input-Heuristik von `sim.ts` wie `rune_enchanting` behandeln.
9. **Vorschläge NICHT umsetzen** ohne Engine-Feld: offensive Schaden-Schriftrolle (§6.1),
   Utility-Rollen `insight`/`recall` (§7) — als separate Tickets an logic-/combat-dev.

## 11. Offene Abstimmungen
- **Essenz-Mittel-IDs** (`essence_gloom/storm/astral`, T2–T4) mit Foraging-Designer finalisieren.
- **Basis-Gear-IDs** der Inschreib-Rezepte (§5.3): content-dev wählt existierende Tier-Basen,
  die RC nicht schon verzaubert, um Doppelung zu vermeiden.
- **Power-Parität:** inscribed-Gear-Stats final gegen die RC-Enchant-Ladder + den nächsten
  `pnpm test`-Sim-Block prüfen (drei Stile sollen im selben Levelband vergleichbare effektive DPS erreichen).
