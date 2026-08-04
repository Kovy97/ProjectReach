# Slayer Skill — Content-Spezifikation
**Status:** Design / Plan (kein Code)
**Autor:** Content-Dev
**Datum:** 2026-06-27
**Scope:** Tower-Struktur, Monster, Drops, Anforderungs-Items, Slayer-Helm, Belohnungen, Master-Roster

---

## 1. Überblick

Der Slayer-Skill (L1–99) wird über eine eigene UI-Seite gesteuert: **Dialog mit dem Slayer-Master**, der Tasks zuweist. Tasks können entweder normale Welt-Monster betreffen oder (50 % Chance) Mobs aus dem **Slayer Tower**, einem neuen einzigartigen Gebiet. Nach Abschluss eines Tasks erhält der Spieler Slayer-XP (und Slayer-Punkte als optionale Währung).

Dieses Dokument legt den **Content-Teil** fest: Zonen-ID, Etagen, Monster, Drops, Anforderungs-Items, Helm-Rezept, Slayer-Punkte-Shop, Master-Roster und ein optionales Equip-Set.

---

## 2. Slayer Tower — Zone

**Zone-ID:** `slayer_tower`
**Namen:** `{ en: "The Slayer Tower", de: "Der Slayer-Turm" }`
**Ton:** verfallener Obsidianturm am Rande der bekannten Welt, fünf Etagen aus modrig feuchtem Stein, Pestqualm, rätselhafte Runenschriften, jede Etage thematisch eigene Gefahr.

Die Zone zerfällt intern in fünf Etagen, die über das **Slayer-Level** gegattet sind. Im Code wäre das ein Unterbereich je Etage (z. B. via `subZone` oder `floor`-Feld — Typ-Erweiterung nach Abklärung mit Logic-Dev). Für die Planung beschreiben wir sie als fünf Monster-Pools mit ihrem Gating-Level.

---

## 3. Etagen, Gating und Monster-Roster

### Etage 1 — "Die Pestkammern" (Slayer L1 | Mob L1–19)
**Namen:** `{ en: "The Plague Chambers", de: "Die Pestkammern" }`
**Thema:** Verseuchte Untiefen, Pestqualm, Verrottung. Kleine, eklige Kreaturen.

| Monster-ID | Name {en / de} | Level | Typ | Besonderheit |
|---|---|---|---|---|
| `rot_rat` | Rot Rat / Seuchenkratte | 3 | Tier (tower-exklusiv) | inflict: poison |
| `plague_grub` | Plague Grub / Pestmade | 7 | Insekt (tower-exklusiv) | inflict: poison, kein Anforderungs-Item |
| `shambling_carcass` | Shambling Carcass / Taumelnde Leiche | 12 | Untoter (tower-exklusiv) | resist: poison |
| `hollow_marrow` | Hollow Marrow / Hohles Mark | 16 | Untoter (tower-exklusiv) | — |
| `goblin` (Welt-Mob) | Goblin / Goblin | 1 | — | Standard |
| `goblin_rogue` (Welt-Mob) | Goblin Rogue / Goblin-Schurke | 5 | — | Standard |

**Anforderungs-Item:** `plague_mask` für `shambling_carcass` und `hollow_marrow` (übler Pestgestank).

**Exklusive Drops (Tower-only):**
- `blighted_bone` — Pestiges Knochen-Fragment (Material, Schmiedekomponente)
- `rot_gland` — Verfaulte Drüse (Material, Herblore-Input)

---

### Etage 2 — "Die Spiegelhallen" (Slayer L20 | Mob L20–39)
**Namen:** `{ en: "The Mirror Halls", de: "Die Spiegelhallen" }`
**Thema:** Steinerne Korridore mit polierten Obsidianspiegeln. Versteinernde Kreaturen lauern hinter jedem Winkel.

| Monster-ID | Name {en / de} | Level | Typ | Besonderheit |
|---|---|---|---|---|
| `gaze_basilisk` | Gaze Basilisk / Blick-Basilisk | 22 | Reptil (tower-exklusiv) | inflict: frost (Versteinerungs-Analog: slow); **braucht `mirror_ward`** |
| `wailing_shade` | Wailing Shade / Klagender Schatten | 28 | Geist (tower-exklusiv) | inflict: shock; **braucht `ear_plugs`** |
| `bone_stalker` | Bone Stalker / Knochenschleicher | 34 | Untoter (tower-exklusiv) | resist: poison, bleed |
| `ashfield_wraith` | Ashfield Wraith / Aschefeld-Wraith | 38 | Geist (tower-exklusiv) | resist: bleed, poison; inflict: burn |
| `skeleton_warrior` (Welt-Mob) | — | 16 | — | Standard |
| `skeleton_archer` (Welt-Mob) | — | 18 | — | Standard |

**Anforderungs-Items:** `mirror_ward` (gegen Basilisken), `ear_plugs` (gegen Klagenden Schatten)

**Exklusive Drops:**
- `basilisk_scale` — Basilisken-Schuppe (Material → Leatherworking / Helm-Komponente)
- `shade_wisp` — Klag-Licht (Material → Runecrafting)

---

### Etage 3 — "Die Schmiedeabgründe" (Slayer L40 | Mob L40–59)
**Namen:** `{ en: "The Forge Abyss", de: "Die Schmiedeabgründe" }`
**Thema:** Unterirdische, von Lava erhitzte Kammern. Schwere, gepanzerte Wesen aus Schlacke und toten Metallen.

| Monster-ID | Name {en / de} | Level | Typ | Besonderheit |
|---|---|---|---|---|
| `slag_abomination` | Slag Abomination / Schlacken-Abomination | 44 | Konstrukt (tower-exklusiv) | resist: burn; inflict: burn |
| `cinder_wretch` | Cinder Wretch / Aschenelend | 48 | Kreatur (tower-exklusiv) | inflict: bleed; regen: 2 |
| `iron_revenant` (Welt-Mob) | Iron Revenant / Eisenrevenant | 58 | — | Standard (aus Slagpit) |
| `forge_demon` | Forge Demon / Schmiededämon | 54 | Dämon (tower-exklusiv) | resist: burn, bleed; inflict: burn; **braucht `soul_veil`** |
| `ember_elemental` (Welt-Mob) | Ember Elemental / Glutelementar | 52 | — | Standard (aus Slagpit) |

**Anforderungs-Item:** `soul_veil` gegen `forge_demon` (seine wahre Form ist unkörperlich, physische Angriffe bleiben ohne Seelenvorhang wirkungslos).

**Exklusive Drops:**
- `forge_ember` — Schmiedeglut (Material → Smithing/Helm-Komponente)
- `slag_carapace` — Schlackenpanzer (Material → Smithing)

---

### Etage 4 — "Die Flüsterende Leere" (Slayer L60 | Mob L60–79)
**Namen:** `{ en: "The Whispering Void", de: "Die Flüsternde Leere" }`
**Thema:** Fast vollständige Dunkelheit, Leerenrisse in der Wand. Schnelle, körperlose Jäger.

| Monster-ID | Name {en / de} | Level | Typ | Besonderheit |
|---|---|---|---|---|
| `dreadfang` | Dreadfang / Schreckenzahn | 62 | Bestie (tower-exklusiv) | inflict: bleed; evasion hoch |
| `void_stalker` | Void Stalker / Leerenjäger | 66 | Leerenwesen (tower-exklusiv) | resist: poison; inflict: shock; **braucht `void_anchor`** |
| `sorrow_wraith` | Sorrow Wraith / Kummer-Wraith | 72 | Geist (tower-exklusiv) | resist: bleed, poison; inflict: burn; **braucht `soul_veil`** |
| `bone_colossus` | Bone Colossus / Knochenkoloss | 76 | Untoter (tower-exklusiv) | regen: 5; enrage < 30 % |
| `frost_hound` (Welt-Mob) | Frost Hound / Frosthund | 62 | — | Standard (aus Slagpit) |

**Anforderungs-Items:** `void_anchor` gegen `void_stalker`, `soul_veil` gegen `sorrow_wraith`

**Exklusive Drops:**
- `dread_fang_shard` — Schreckenzahn-Splitter (Material → Helm-Komponente)
- `void_thread` — Leeren-Faden (Material → Runecrafting / Inscription)

---

### Etage 5 — "Der Abyssale Thron" (Slayer L80 | Mob L80–99)
**Namen:** `{ en: "The Abyssal Throne", de: "Der Abyssale Thron" }`
**Thema:** Das oberste Stockwerk, Kristallsäulen aus verfestigter Leere, ein steinerner Thron den niemand besetzt. Die stärksten Wesen, die der Turm kennt.

| Monster-ID | Name {en / de} | Level | Typ | Besonderheit |
|---|---|---|---|---|
| `dread_knight` | Dread Knight / Schreckensritter | 82 | Untoter (tower-exklusiv) | resist: frost, poison; inflict: bleed; regen: 4 |
| `soul_flayer` | Soul Flayer / Seelenschinder | 86 | Dämon (tower-exklusiv) | resist: bleed; inflict: burn + shock; **braucht `soul_veil`** |
| `void_herald` | Void Herald / Leeren-Herold | 90 | Leerenwesen (tower-exklusiv) | resist: burn, frost; inflict: shock; **braucht `void_anchor`** |
| `abyssal_devourer` | Abyssal Devourer / Abyssaler Verschlinger | 96 | Boss (tower-exklusiv) | resist: alle; regen: 8; enrage < 25 %; **braucht `soul_veil` + `void_anchor`** |
| `roc_void` (Welt-Mob) | Void Roc / Leerenroc | 84 | — | Standard (aus Highlands) |

**Exklusive Drops:**
- `abyssal_core` — Abyssaler Kern (seltene Mat → Helm + Epic-Waffe)
- `soul_flayer_fang` — Seelenschinder-Reißzahn (Mat → Epic-Helm)
- `void_herald_shard` — Leeren-Herold-Splitter (Mat → Epic-Ranged-Waffe)
- Slayer-exklusive Equip-Pieces (Etage-5-Drops, nicht craftbar; Rarity darf epic überschreiten — legendär)

---

## 4. Anforderungs-Items (5 Stück)

Jedes Item verhindert einen negativen Mechanic eines bestimmten Mob-Typs. Ohne das Item ist das Monster zwar bekämpfbar, aber mit starkem Debuff (deutlich höherer Schaden eingehend oder kein XP-Gewinn — Implementierungsentscheidung für Logic-Dev/Combat-Dev).

| Item-ID | Name {en / de} | Gegen | Quelle | Senke |
|---|---|---|---|---|
| `plague_mask` | Plague Mask / Seuchenmaske | Pest-Kreaturen (Etage 1: `shambling_carcass`, `hollow_marrow`) | Slayer-Punkte-Shop (billig, früh erreichbar) oder Crafting (Leatherworking L15: `raw_hide` × 2 + `herb_marshroot` × 3) | Wird in Slayer-Helm aufgenommen (Rezept-Input) |
| `mirror_ward` | Mirror Ward / Spiegelschutz | Versteinerungs-Wesen (Etage 2: `gaze_basilisk`) | Slayer-Punkte-Shop oder Smithing L30 (`iron_bar` × 5 + `frost_essence` × 2) | Helm-Input |
| `ear_plugs` | Ear Plugs / Ohrenstopfen | Schreiende Geister (Etage 2: `wailing_shade`) | Slayer-Punkte-Shop oder Crafting L20 (`cured_leather` × 1 + `herb_gravemoss` × 2) | Helm-Input |
| `soul_veil` | Soul Veil / Seelenvorhang | Unkörperliche/Dämonen (Etage 3–5: `forge_demon`, `sorrow_wraith`, `soul_flayer`, `abyssal_devourer`) | Slayer-Punkte-Shop (mittelteuer) oder Runecrafting L50 (`aether_essence` × 3 + `void_rune` × 2) | Helm-Input |
| `void_anchor` | Void Anchor / Leerenstabilisator | Leerenwesen (Etage 4–5: `void_stalker`, `void_herald`, `abyssal_devourer`) | Slayer-Punkte-Shop (teuer) oder Jewelcrafting L70 (`soulopal` × 2 + `void_essence` × 3) | Helm-Input |

**Anmerkung:** Alle fünf Items haben `value > 0` (Verkauf als Senke) und mindestens eine Crafting- oder Shop-Quelle. Der Slayer-Punkte-Shop ist die bequeme, den Crafting-Pfad der F2P/Progression-Pfad.

---

## 5. Slayer-Helm

### Design-Ziel
Ein einzigartiges Endgame-Helm, der alle fünf Anforderungs-Item-Effekte permanent kombiniert. Trägt man ihn, braucht man kein einzelnes Anforderungs-Item mehr. Zusätzlich gewährt er passive Slayer-Boni.

### Rezept
**Skill:** Smithing (Level 80 empfohlen — höchster Smithing-Tier, der noch nicht Godiron ist)
**Inputs:**
- `plague_mask` × 1
- `mirror_ward` × 1
- `ear_plugs` × 1
- `soul_veil` × 1
- `void_anchor` × 1
- `blighted_bone` × 20 (Tower-exklusive Mat, Etage 1)
- `forge_ember` × 10 (Tower-exklusive Mat, Etage 3)
- `abyssal_core` × 5 (Tower-exklusive Mat, Etage 5 — selten)
- `titanium_bar` × 10 (normales Metall, Smithing-Aufwand)

**Output:** `slayer_helm` × 1

### Item-Definition

```
id: "slayer_helm"
name: { en: "Slayer Helm", de: "Slayer-Helm" }
type: "equipment"
slot: "helmet"
rarity: "epic"          // craftbar → max. epic (Regel eingehalten)
requirements: { slayer: 80 }
stackable: false
value: 8000             // Senke: Verkaufen oder Weiterverwenden
bonus:
  defense: 45
  maxHp: 150
  accuracy: 15
  meleeDamage: 10
  rangedDamage: 10
  magicDamage: 10
  slayerXpMult: 0.10    // +10 % Slayer-XP auf alle Tasks — NEUES BONUS-FELD (CEO/Logic-Dev klären)
// Implizit: kombiniert Effekte aller 5 Anforderungs-Items (Implementierung Logic-Dev)
description:
  en: "A masterwork helm forged from the essence of the Slayer Tower's worst horrors. Grants the bearer protection against every known tower threat."
  de: "Ein Meisterwerk-Helm, geschmiedet aus dem Wesen der schlimmsten Schrecken des Slayer-Turms. Gewährt dem Träger Schutz gegen jede bekannte Turmbedrohung."
```

**Offene Frage:** Das Feld `slayerXpMult` ist ein neues Bonus-Feld — braucht Typ-Erweiterung in `shared/src/index.ts` und Anwendung in `engine`. CEO-Entscheidung / Logic-Dev-Revier.

---

## 6. Unique Tower Drops (Drop-Tabelle Übersicht)

### Gemeinsame Tower-Materialien (alle Etagen)
| Item-ID | Name {en / de} | Herkunft | Senke | Rarity |
|---|---|---|---|---|
| `blighted_bone` | Blighted Bone / Pestiges Knochenfragment | Etage 1 (alle Mobs ~30 % Chance) | Helm-Rezept, Herblore (Gifttrank-Ersatz), Verkauf | common |
| `rot_gland` | Rot Gland / Verfaulte Drüse | Etage 1 Pest-Mobs ~20 % | Herblore (Seuchenresistenz-Trank — zukünftiger Content) | common |
| `basilisk_scale` | Basilisk Scale / Basilisken-Schuppe | Etage 2 `gaze_basilisk` ~40 % | Leatherworking (Tower-exklusive Leder-Rüstung), Helm | common |
| `shade_wisp` | Shade Wisp / Klag-Licht | Etage 2 Geister ~25 % | Runecrafting (void_rune Ersatz), Inscription | common |
| `forge_ember` | Forge Ember / Schmiedeglut | Etage 3 ~30 % | Helm-Rezept, Smithing (Spezialwaffe), Verkauf | common |
| `slag_carapace` | Slag Carapace / Schlackenpanzer | Etage 3 Konstrukte ~35 % | Smithing (Tower-Rüstungs-Teile) | common |
| `dread_fang_shard` | Dread Fang Shard / Schreckenzahn-Splitter | Etage 4 `dreadfang` ~35 % | Helm, Jewelcrafting (Halsband) | common |
| `void_thread` | Void Thread / Leeren-Faden | Etage 4 Leerenwesen ~20 % | Runecrafting, Inscription-Enchanting | superRare |
| `abyssal_core` | Abyssal Core / Abyssaler Kern | Etage 5 `abyssal_devourer` ~8 %; `void_herald` ~4 % | Helm-Rezept (selten), Legendäre Waffe | superRare |
| `soul_flayer_fang` | Soul Flayer Fang / Seelenschinder-Reißzahn | Etage 5 `soul_flayer` ~12 % | Helm (alternative Route), Epic Amulett | superRare |
| `void_herald_shard` | Void Herald Shard / Leeren-Herold-Splitter | Etage 5 `void_herald` ~10 % | Legendärer Ranged-Gegenstand | superRare |

### Slayer-Tower-Exklusive Ausrüstung (Nicht-craftbar → darf über epic gehen)

| Item-ID | Name {en / de} | Etage | Slot | Rarity | Grob-Bonus |
|---|---|---|---|---|---|
| `slayer_shroud` | Slayer Shroud / Slayer-Umhang | 3 Boss-Drop (`forge_demon`, 2 %) | body | legendary | defense 50, evasion 20, alle Stilschäden +15 |
| `void_stalker_blade` | Void Stalker Blade / Leerenjäger-Klinge | 4 (`void_stalker`, 1.5 %) | mainhand (melee) | legendary | meleeDamage 55, critChance +0.08, weaponEffect: shock |
| `abyssal_longbow` | Abyssal Longbow / Abyssaler Langbogen | 5 (`void_herald_shard` + `abyssal_core` via NPC — alternativ: direkter Drop `abyssal_devourer` 1 %) | mainhand (ranged) | legendary | rangedDamage 50, accuracy +20, weaponEffect: burn |
| `soul_reaver_staff` | Soul Reaver Staff / Seelenrauber-Stab | 5 (`soul_flayer_fang` + `abyssal_core` via NPC) | mainhand (magic) | legendary | magicDamage 55, critChance +0.07, weaponEffect: bleed (Seelenverletzung) |

**Anmerkung Rarity:** Items die nicht craftbar sind dürfen legendary sein. Diese Tower-Waffen/Rüstung sind ausschließlich über Drop oder NPC-Tausch (Slayer-Punkte) erhältlich.

**Offene Chef-Entscheidung:** NPC-Tausch-System (Punkte gegen legendäre Items) vs. reiner Drop — beide Wege sind im OSRS-Stil etabliert. Empfehlung: NPC-Tausch als Fallback nach ~500 h ohne Drop.

---

## 7. Slayer-Punkte-Belohnungen (Shop-Liste, Platzhalter-Preise)

Slayer-Punkte erhält man nach jedem abgeschlossenen Task (Menge nach Task-Schwierigkeit skaliert, Bonus-Punkte für Streak). Im Slayer-Punkte-Shop kaufbar:

| Unlock / Item | Punkte | Kategorie |
|---|---|---|
| `plague_mask` | 50 | Anforderungs-Item |
| `ear_plugs` | 75 | Anforderungs-Item |
| `mirror_ward` | 100 | Anforderungs-Item |
| `soul_veil` | 250 | Anforderungs-Item |
| `void_anchor` | 500 | Anforderungs-Item |
| Task-Skip (aktuellen Task überspringen) | 30 | Komfort |
| Task-Block (Monstertyp für immer sperren) | 100 | Komfort |
| Task-Erweitern (Task N % größer) | 20 | Komfort |
| Slayer-Helm-Blueprint (Rezept freischalten) | 750 | Progression |
| Slayer-XP-Boost Schriftrolle (×1.5 für 30 min) | 150 | Boost |
| `abyssal_core` (garantiert 1×) | 2000 | Seltene Mat (Notfall-Sicherheitsnetz) |
| `void_stalker_blade` (direkter Kauf) | 5000 | Legendäre Waffe |
| `abyssal_longbow` | 5000 | Legendäre Waffe |
| `soul_reaver_staff` | 5000 | Legendäre Waffe |
| `slayer_shroud` | 4000 | Legendäre Rüstung |
| Cosmetic: Slayer-Task-Rahmen (UI) | 200 | Kosmetik |

**Offene Chef-Entscheidung:** Sind Slayer-Punkte eine eigenständige Währung (neues Persistenz-Feld) oder wird Gold als Proxy benutzt? Empfehlung: eigenständig, damit der Slayer-Loop klar vom Goldmarkt getrennt bleibt. Das ist ein Logic-Dev + Persistenz-Revier.

---

## 8. Slayer-Master-Roster

Vier Master, jeder mit eigenem Unlock-Band und Task-Pool. Die Master werden per Dialog erreicht (UI-Revier für die Dialogseite).

### Master 1 — Brenna Ashwick
**Unlock:** Combat L1 / Slayer L1 (sofort verfügbar)
**Ton:** Alte Dorfwächterin, pragmatisch, wenig Geduld.
**Task-Pool (Welt-Mobs):**

| Monster | Zone |
|---|---|
| `goblin`, `goblin_rogue`, `goblin_spearman` | borderlands |
| `chicken`, `cow`, `boar` | pastures |
| `ash_rat`, `dust_vulture` | ashfields |
| `rot_rat`, `plague_grub` | slayer_tower Etage 1 |

**Slayer-Tower-Chance:** 50 % auf Etage 1 bei Tower-fähigen Tasks.
**Task-Größe:** 15–50 Mobs.

---

### Master 2 — Davorin Coldgrasp
**Unlock:** Combat L30 / Slayer L20
**Ton:** Narben-bedeckter Ex-Söldner, spricht in kurzen Sätzen.
**Task-Pool (Welt-Mobs):**

| Monster | Zone |
|---|---|
| `skeleton_warrior`, `skeleton_archer`, `skeleton_spearman` | crypt |
| `rootling_grunt`, `rootling_gimp`, `thorn_wolf` | blackthorn |
| `mud_crab`, `reef_drowned` | coast |
| `forest_hare`, `gray_wolf` | wildwood |
| `gaze_basilisk`, `wailing_shade`, `bone_stalker`, `ashfield_wraith` | slayer_tower Etage 2 |

**Task-Größe:** 30–80 Mobs.

---

### Master 3 — Seraphel Mournbane
**Unlock:** Combat L55 / Slayer L40
**Ton:** Geistliche einer vergessenen Ordnung, gestelzte Sprache, verbirgt Wissen.
**Task-Pool (Welt-Mobs):**

| Monster | Zone |
|---|---|
| `pit_spider`, `slag_kobold`, `ember_elemental`, `iron_revenant` | slagpit |
| `tide_siren` | coast |
| `wild_stag`, `dire_wolf` | wildwood |
| `moss_golem`, `bramble_witch` | blackthorn |
| `slag_abomination`, `cinder_wretch`, `forge_demon` | slayer_tower Etage 3 |
| `dreadfang`, `void_stalker`, `sorrow_wraith` | slayer_tower Etage 4 |

**Task-Größe:** 40–100 Mobs.

---

### Master 4 — Varek der Namenlose
**Unlock:** Combat L80 / Slayer L60
**Ton:** Kein Name, kein Gesicht unter der Kapuze. Kommuniziert nur über Handzeichen und ein verstaubtes Notizbuch.
**Task-Pool (Welt-Mobs):**

| Monster | Zone |
|---|---|
| `roc_elder`, `roc_storm`, `highland_wyvern`, `roc_void` | highlands |
| `frost_hound`, `frost_hexer` | slagpit |
| `deep_kraken` | coast |
| `idol_warden`, `aether_wraith` | idolhall |
| `dread_knight`, `soul_flayer`, `void_herald`, `abyssal_devourer` | slayer_tower Etage 5 |

**Task-Größe:** 50–120 Mobs.

---

## 9. Optionales Slayer-Equip-Set

Ein cosmetically und mechanisch kohärentes Set für Spieler, die sich als "Slayer" identifizieren möchten. Kein Pflicht-Grind, aber attraktiver Meilenstein.

**Set-ID:** `slayer_set`
**Namen:** `{ en: "Slayer's Regalia", de: "Slayers Ornat" }`

| Piece | Item-ID | Quelle |
|---|---|---|
| Helm | `slayer_helm` | Smithing L80 (Rezept oben) |
| Körper | `slayer_shroud` | Etage-3/5-Drop oder Punkte-Shop |
| Beine | `slayer_greaves` | Etage-4-Drop oder Punkte-Shop (neue Item-Definition nötig) |
| Handschuhe | `slayer_vambraces` | Etage-2-Drop oder Punkte-Shop (neue Item-Definition nötig) |

**Set-Bonus (min. 3 Teile):**
```
bonus: {
  defense: 30,
  maxHp: 100,
  accuracy: 20,
  slayerXpMult: 0.15,  // +15 % Slayer-XP (stackt mit Helm-Bonus)
  meleeDamage: 12,
  rangedDamage: 12,
  magicDamage: 12,
}
```

**Offene Chef-Entscheidung:** `slayerXpMult` braucht ein neues Typ-Feld in `EquipBonus` (shared) und Auswertung in der Engine. Das Slayer-Set-Konzept ist optional — CEO soll entscheiden, ob dieses Set Teil von Meilenstein M3 oder M4 wird.

---

## 10. Bilinguale Kurzliste — alle neuen IDs mit Namen

Für den Content-Dev als Referenz beim späteren Einpflegen:

### Neue Monster
| ID | en | de |
|---|---|---|
| `rot_rat` | Rot Rat | Seuchenkratte |
| `plague_grub` | Plague Grub | Pestmade |
| `shambling_carcass` | Shambling Carcass | Taumelnde Leiche |
| `hollow_marrow` | Hollow Marrow | Hohles Mark |
| `gaze_basilisk` | Gaze Basilisk | Blick-Basilisk |
| `wailing_shade` | Wailing Shade | Klagender Schatten |
| `bone_stalker` | Bone Stalker | Knochenschleicher |
| `ashfield_wraith` | Ashfield Wraith | Aschefeld-Wraith |
| `slag_abomination` | Slag Abomination | Schlacken-Abomination |
| `cinder_wretch` | Cinder Wretch | Aschenelend |
| `forge_demon` | Forge Demon | Schmiededämon |
| `dreadfang` | Dreadfang | Schreckenzahn |
| `void_stalker` | Void Stalker | Leerenjäger |
| `sorrow_wraith` | Sorrow Wraith | Kummer-Wraith |
| `bone_colossus` | Bone Colossus | Knochenkoloss |
| `dread_knight` | Dread Knight | Schreckensritter |
| `soul_flayer` | Soul Flayer | Seelenschinder |
| `void_herald` | Void Herald | Leeren-Herold |
| `abyssal_devourer` | Abyssal Devourer | Abyssaler Verschlinger |

### Neue Items (Anforderungs-Items)
| ID | en | de |
|---|---|---|
| `plague_mask` | Plague Mask | Seuchenmaske |
| `mirror_ward` | Mirror Ward | Spiegelschutz |
| `ear_plugs` | Ear Plugs | Ohrenstopfen |
| `soul_veil` | Soul Veil | Seelenvorhang |
| `void_anchor` | Void Anchor | Leerenstabilisator |

### Neue Items (Tower-Materialien)
| ID | en | de |
|---|---|---|
| `blighted_bone` | Blighted Bone | Pestiges Knochenfragment |
| `rot_gland` | Rot Gland | Verfaulte Drüse |
| `basilisk_scale` | Basilisk Scale | Basilisken-Schuppe |
| `shade_wisp` | Shade Wisp | Klag-Licht |
| `forge_ember` | Forge Ember | Schmiedeglut |
| `slag_carapace` | Slag Carapace | Schlackenpanzer |
| `dread_fang_shard` | Dread Fang Shard | Schreckenzahn-Splitter |
| `void_thread` | Void Thread | Leeren-Faden |
| `abyssal_core` | Abyssal Core | Abyssaler Kern |
| `soul_flayer_fang` | Soul Flayer Fang | Seelenschinder-Reißzahn |
| `void_herald_shard` | Void Herald Shard | Leeren-Herold-Splitter |

### Neue Items (Equip)
| ID | en | de |
|---|---|---|
| `slayer_helm` | Slayer Helm | Slayer-Helm |
| `slayer_shroud` | Slayer Shroud | Slayer-Umhang |
| `void_stalker_blade` | Void Stalker Blade | Leerenjäger-Klinge |
| `abyssal_longbow` | Abyssal Longbow | Abyssaler Langbogen |
| `soul_reaver_staff` | Soul Reaver Staff | Seelenrauber-Stab |
| `slayer_greaves` | Slayer Greaves | Slayer-Beinschienen |
| `slayer_vambraces` | Slayer Vambraces | Slayer-Armschienen |

### Neue Zone
| ID | en | de |
|---|---|---|
| `slayer_tower` | The Slayer Tower | Der Slayer-Turm |

---

## 11. Offene Chef-Entscheidungen (Bullet-Liste)

- **Slayer-Punkte als eigenständige Währung?** Braucht neues Persistenz-Feld (Logic-Dev + Persistence-Dev). Alternative: Gold als Proxy (einfacher, aber thematisch schwächer).

- **`slayerXpMult` Bonus-Feld in `EquipBonus`?** Typ-Erweiterung `shared/src/index.ts` + Engine-Auswertung. Falls nicht gewünscht: Helm ohne XP-Mult-Effekt, nur Defensivbonus.

- **Tower-Gating als Subzone oder eigene Zonen-IDs?** Optionen: (a) 5 separate Zonen (`slayer_tower_1` bis `slayer_tower_5`), (b) eine Zone mit `floor`-Attribut am Monster, (c) über Slayer-Level dynamisch gefilterter Pool. Entscheidung beeinflusst `ContentDB`-Typ (Logic-Dev/CEO).

- **Anforderungs-Item-Mechanik in der Engine:** Wie wird "kein Item vorhanden" bestraft? Optionen: (a) 50 % mehr eingehender Schaden, (b) kein Slayer-XP für diese Kills, (c) Monster-Treffer-Bonus (+accuracy). Combat-Dev-Revier.

- **NPC-Tausch (Punkte → legendäre Items) oder reiner Drop?** Empfehlung: beide Wege, NPC als Sicherheitsnetz. UI-Revier für Tausch-Dialog.

- **Slayer-Master-UI:** Ist der Dialog eine neue Seite oder ein Overlay? UI-Dev-Revier.

- **Slayer-Skill in `skills`-Map:** Braucht eigenen Eintrag (`slayer: { id: "slayer", name: { en: "Slayer", de: "Slayer" } }`). Trainiert welches Attribut? Empfehlung: `trains: "con"` (Zähigkeit durch brutales Töten) — CEO-Entscheidung.

- **Dungeon-Modus für Tower-Bosses?** Etage 5 `abyssal_devourer` wäre ein starker Dungeon-Kandidat (Schlüssel-System analog zu bestehenden Dungeons). Sprengt den Scope von M2/M3 eventuell — CEO-Priorisierung.

- **Set-Stücke `slayer_greaves` + `slayer_vambraces`:** Sind das eigenständige neue Item-Definitionen (separat zu entwerfen) oder wird das Set zunächst nur Helm + Shroud (2-Piece-Set)?

- **Bilingual-Konvention "Slayer":** Das Wort "Slayer" bleibt im Deutschen üblicherweise auf Englisch (wie in OSRS-DE-Übersetzungen). Alternativ: "Totjäger-Turm" / "Totjäger-Helm". Chef-Entscheidung.
