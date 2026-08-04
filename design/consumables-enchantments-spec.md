# Consumables- & Enchantments-Spec (Task #219)

Stand 2026-07-04 · Autor: balance-designer · Status: **Spec fertig, wartet auf content/ui/logic-Apply**

Grundlage: `design/armor-iteration2-spec.md` (§10 Buff-Typ) + `design/armor-iteration2.1-spec.md`
(§5 Buff-Guard-Ranges) + `design/item-instance-affix-suffix-spec.md` + `design/suffix-pool-spec.md`.
Alle Zahlen sind am **Ist-Content** geerdet (`packages/content/src/index.ts`, direkt gelesen) und an der
**Rüstungs-Trinität** (armorRating≤35 / evasionRating / wardCapacity / blockChance) ausgerichtet.

**Ich wende nichts an.** Geordnete Apply-List §9, Gate-Kriterien §10, offene Chef-Fragen §11.

Ziel: ALLE Tränke/Consumables UND Verzauberungen passen zum Trinität-System, ohne Relevanz zu verlieren —
mit **monotonen Heil-Leitern je Familie**, **trinität-bewussten Buff-Währungen** und **klaren Effekt-Texten**
für jede Rune.

---

## 0. TL;DR — die 6 Kernbefunde

| # | Befund (Ist) | Fix | Owner |
|---|---|---|---|
| A | **Minor-Potion == Draught-Heilwert** (`potion_minor_heal` L1 heal 3 **==** `minor_healing_potion`/„Kräutersud" L1 heal 3) — zwei parallele Heil-Leitern kollidieren am Startwert | Draught/Kräutersud-Linie zur **Premium-Leiter** (≈1.5× Basis-Potion) + entkollidierende Namen (§2.2) | content |
| B | **Kaputte „Attack Speed −0s"-Food-Buffs:** `attackIntervalMs: -45` rendert als `formatStat(-0.045)s` = **„−0.0s"** (Tooltip Z. 655-658) — unsichtbar UND mechanisch 1.5 % | −45-Tempo raus → Sustain-Währung; Tempo-Floor **≤ −120 ms** (§3) | content + logic (Guard) |
| C | **Heil-Inversionen** in den Crop-Sink-Linien: `salve_of_mending` L25 heilt 6 (= L12-Potion); `godbloom_infusion` L95 heilt 38 (< std-Kurve 46) | auf std-Heil-Kurve heben (§2.4) | content |
| D | **Buff-Guard prüft KEINE verbotenen Flats** in `buff.bonus` (nur modifiers/trinity-Ranges) + evasionRating/blockChance-Ranges nicht auf It2.1-Stand | Guard erweitern: Flat-Verbot + Tempo-Floor + Range-Tightening (§4.3) | logic |
| E | **Enchant-Runen sind ALLE waffen-only** — 8 Affixe (keen/flame/frost/precise/swift/arcane/hunter/shock), **0 Rüstungs-/Trinity-Runen** (keine Schutz-/Ausweich-/Ward-/Block-Rune) | 4 Trinity-Rüstungs-Affixe + 12 Runen (§6) | logic (Typ) + content |
| F | **Runen sagen NICHT, was sie tun:** das Runen-Item (`item.rune`) zeigt im Inventar nur den Namen — `ItemTooltip` rendert `item.rune` nicht; `AffixDef` hat keine Beschreibung | Rune-Tooltip-Template (en+de) surface'n; `affixEffectParts` um Trinity ergänzen (§8) | ui + logic |

**Gut (bereits konform, nur verifizieren):** KEIN Consumable-Buff trägt noch verbotene Flats
(melee/ranged/magicDamage/defense/accuracy/evasion — grep bestätigt 0 Treffer); alle Affix-`bonusByTier`
sind `{}` (keine Flats); Suffixe nutzen nur `attrPerIlvl`/`softStats`/`boostPerIlvl` (Sanierung 2026-07-02).
Die Trinität-Anschlüsse (`buff.trinity`, Guard 0..35 armorRating) existieren schon aus It2/It2.1.

### 0.1 Chef-Nachtrag (nach Spec-v1) — Glyphs & Scrolls raus, Runen ersichtlicher

| # | Chef-Entscheid | Fix | Owner |
|---|---|---|---|
| G | **Glyphs KOMPLETT entfernen** (7 Items) — Tränke + Buff-Food reichen als balancebare Buffs | 10 Items/Aktionen/Refs raus; **Block-Buff-Lücke** mit `tonic_bulwark` schließen (§4.4) | content + logic |
| H | **Scrolls entfernen — FOR NOW** (3 Items) — evtl. später wieder | raus + Migration; Design-Notiz „deferred" behalten (§4.4) | content + logic |
| I | **Runen ERSICHTLICHER:** Vorher/Nachher-Item-Vorschau mit Stat-Delta | Enchant-Preview-Panel + Engine-Datenvertrag (§8) | ui + logic |

Diese drei ersetzen/erweitern §4.2 (glyph-Umwidmungen entfallen — Items gelöscht) und §8 (Tooltip → Preview-Panel).

---

## 1. Referenz-Kurve: instant-Heil je Craft-Level

Alle Heil-Consumables (Herblore-Tränke, Koch-Gerichte) werden an **eine** glatte Referenz geeicht — den
Sofort-Heilwert einer „Standard-Potion" auf Craft-Level `L`. Verankert an der Ist-Basis-Potion-Leiter
(L1=3, L12=6, L21=9, L41=15, L61=24, L81=36) + geglättete Interpolation:

| L | 1 | 5 | 10 | 15 | 20 | 25 | 30 | 40 | 50 | 55 | 60 | 70 | 80 | 90 | 95 | 99 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **heal_std** | 3 | 4 | 5 | 7 | 8 | 10 | 12 | 15 | 20 | 22 | 24 | 30 | 36 | 43 | 46 | 50 |

Rollen relativ zur Referenz:
- **Basis-Potions** = `heal_std` (die Referenz selbst).
- **Draughts/Kräutersude** = **~1.5× `heal_std`** (Premium, rarere Kräuter).
- **Crop-Sink-Brews / Salben / Elixiere** = `heal_std` (Standard-Heil, sinkt aber Farming-Crops) — **monoton je Familie**, keine Inversion.
- **Koch-Fisch/-Fleisch/-Gerichte** = `heal_std`, oft **plus** Sustain-/Kampf-Buff (Cooking-Identität).

---

## 2. Consumables — Heil-Leitern je Familie

### 2.1 FAMILIE 1 — Basis-Heiltränke (Herblore) — REFERENZ, unverändert

Die saubere Sofort-Heil-Rückgrat-Leiter (marshroot→godsbreath-Kräuter, billig). Bereits streng monoton & auf Kurve — **keine Änderung**, dient als Anker.

| id | L (brew) | heal Ist | heal Ziel |
|---|--:|--:|--:|
| `potion_minor_heal` | 1 | 3 | 3 |
| `potion_lesser_heal` | 12 | 6 | 6 |
| `potion_heal` | 21 | 9 | 9 |
| `potion_greater_heal` | 41 | 15 | 15 |
| `potion_potent_heal` | 61 | 24 | 24 |
| `elixir_renewal` | 81 | 36 | 36 |

### 2.2 FAMILIE 2 — Kräutersude / Draughts (Herblore) — PREMIUM (Befund A-Fix)

**Kern-Kollision:** `minor_healing_potion` (L1, „Kleiner Kräutersud", heal **3**) == `potion_minor_heal`
(L1, heal **3**). Beide L1, gleicher Heilwert = redundant/verwirrend. Der Chef will die Draughts **klar
stärker/anders**. → Premium-Sofort-Heil = **round(1.5 · heal_std@L)**, rarere graywort/frostvine-Kräuter
(anderer Supply-Chain als die marshroot-Contract-Potions). **Namen entkollidieren** (kein „Klein/Groß"
mehr, das mit der Potion-Leiter clasht) → Konzentrations-Thema.

| id | L (brew) | heal Ist | heal_std@L | **heal Ziel** | Name EN Ziel | Name DE Ziel |
|---|--:|--:|--:|--:|---|---|
| `minor_healing_potion` | 1 | 3 | 3 | **5** | Herbal Draught | Heilkräutersud |
| `greater_healing_potion` | 16 | 7 | 7 | **11** | Concentrated Draught | Konzentrierter Kräutersud |

- Trade-off ist **rarere Kräuter für mehr Heilung pro Schluck** (weniger Auto-Eat-Ticks, weniger Inventar-Slots) — die Berechtigung der Premium-Linie. Bei L1 ist +2 heal absolut klein (Start-HP ~10-13), skaliert aber sauber.
- **Nur 2 Items** → bewusst ein Low-Band-Premium-Paar, kein voller Ladder. Optionaler Chef-Ausbau (§11).
- ⚠ Namens-Notiz: `bloodmend_draught` (Familie 4) heißt ebenfalls „Draught", ist aber ein Crop-Sink-Heil — **kein** Teil dieser Kräutersud-Linie (Namens-Überladung, §2.4-Notiz).

### 2.3 FAMILIE 3 — Koch-Heil (Cooking: Fisch / Fleisch / Kombi-Gerichte)

**Fisch & Fleisch (reines Heil bzw. Heil+Sustain):** die Heil-Leitern sind streng monoton (mehrfach
balance-gepasst) — **keine Heilwert-Änderung nötig**. Betroffen sind nur die **kaputten Buffs** (§3):

| Item | heal | Buff Ist | Buff Ziel | Grund |
|---|--:|---|---|---|
| `cooked_beef` | 4 | `attackIntervalMs: -45` | `{ hpRegenPerSec: 0.1 }` | **−0.0s-Bug** raus → Early-Sustain |
| `roc_drumstick_grilled` | 10 | `{ attackIntervalMs: -45, critChance: 0.01 }` | `{ critChance: 0.02, hpRegenPerSec: 0.1 }` | **−0.0s-Bug** raus, Krit behalten+heben |
| `wolf_steak` | 7 | `modifiers: { dex: 4 }` | `modifiers: { dex: 2 }` | Food-Attribut-Budget ≤ +2 (dex 4 == superRare-Tonic) |
| `wyvern_steak` | 14 | `{ attackIntervalMs: -60, critChance: 0.02 }` | `{ attackIntervalMs: -150, critChance: 0.02 }` | Tempo unter Floor → auf −150 (rendert „−0.2s", ~6 %) |
| `venison_roast` | 8 | `{ hpRegenPerSec: 0.1, maxHp: 0.3 }` | `{ hpRegenPerSec: 0.1, maxHp: 1 }` | maxHp 0.3 = Squish-Residue (< 1 = wertlos) |
| `bear_haunch` | 11 | `{ maxHp: 2.5 }` | `{ maxHp: 3 }` | ganzzahlig, Budget T2 |

**Kombi-Gerichte (Stews, Kampf-Buff-Food, Stil-Parität):** Tempo-Floor **≤ −120** anwenden (§3). Die sub-120-Tempos heben, Krit/Heil lassen:

| Item | Tempo Ist | Tempo Ziel | (übrige Buffs unverändert) |
|---|--:|--:|---|
| `bloodgrain_stew` | −60 | **−120** | hpRegen 0.2, maxHp→1 |
| `duskfin_rangers_stew` | −60 | **−120** | hpRegen 0.2, crit 0.02 |
| `spellwarden_bisque` | −60 | **−120** | hpRegen 0.2, crit 0.02 |
| `steelshot_bisque` | −90 | **−150** | hpRegen 0.4, crit 0.03 |
| `spellflare_tisane` | −90 | **−150** | hpRegen 0.4, crit 0.02 |
| `witherleek_*` (L75-77) | −120 | −120 (ok) | — |
| `ambergrain_feast` (L90) | −210 | −210 (ok) | — |

*(Alle sub-1-maxHp-Werte in Kombi-Gerichten [0.4/0.6/1.0/1.2/1.5/2.2] auf ganzzahlig ≥1 runden — Squish-Residue-Aufräumen, gleiche Klasse wie das −0.0s. „SHOULD", nicht Parität-blockend.)*

### 2.4 FAMILIE 4 — Crop-Sink-Heil (Herblore + 2 Cooking) — auf Kurve (Befund C-Fix)

Diese Heil-Consumables existieren, um Farming-Crops einen Sink zu geben. Auf `heal_std` eichen, Inversionen fixen:

| id | Skill L | heal Ist | heal_std@L | **heal Ziel** | Verdikt |
|---|---|--:|--:|--:|---|
| `ashroot_broth` | Cook 1 | 3 | 3 | 3 | ok |
| `grimwheat_porridge` | Cook 3 | 4 | 4 | 4 | ok |
| `mandrake_tincture` | Herb 30 | 13 | 12 | 13 | ok |
| `salve_of_mending` | Herb 25 | 6 | 10 | **10** | **UNTER** (heilte wie L12) → 10 |
| `gallows_preserve` | Cook 50 | 19 | 20 | 20 | ok (→20) |
| `bloodmend_draught` | Herb 55 | 22 | 22 | 22 | ok |
| `duskcap_tonic` | Herb 56 | 24 | 22 | 23 | ok (leicht → 23) |
| `corpse_lily_salve` | Herb 70 | 29 | 30 | 30 | ok (→30) |
| `revenant_elixir` | Herb 85 | 35 | 39 | **39** | leicht unter → 39 |
| `godbloom_infusion` | Herb 95 | 38 | 46 | **46** | **UNTER** (Top-Crop-Sink < elixir_renewal-nah) → 46 |

Buff-only Crop-Sinks (kein heal): `nightshade_extract` (maxHp 0.8 → **1**), `emberroot_tonic` (hpRegen 0.3, ok). maxHp 0.8 < 1 = Residue → 1.

**Monotonie-Nachweis (alle Heil-Consumables, nach Fix, sortiert nach Wert):** 3 → 4 → 5(Draught) → 6 → 7 → 8 → 9 → 10 → 11(Draught) → 12 → 13 → 15 → 17 → 19 → 20 → 22 → 23 → 24 → 27 → 29/30 → 36 → 39 → 46. Kein höherlevliges Item heilt weniger als ein niederlevligeres **derselben Familie** (Gate §10.1).

---

## 3. Cooked-Food — die „−0s"-Buffs (Befund B)

**Mechanik des Bugs:** `ItemTooltip.tsx` Z. 655-658 rendert Buff-Tempo als
`${sign}${formatStat(v / 1000)}s`. `formatStat` rundet auf **max. 1 Dezimale**. Also:
`attackIntervalMs: -45` → `formatStat(-0.045)` → **„−0.0s"** (unsichtbar) und mechanisch nur
`45/3000 = 1.5 %` schneller (wertlos). Artefakt der Itemization-2.5-Flat→Tempo-Konversion (ein kleiner
`meleeDamage`-Flat wurde in ein Token-Tempo umgerechnet).

**Design-Regel (dauerhaft, wird Guard §4.3):**
> Jeder `buff.bonus.attackIntervalMs` muss **≤ −120 ms** sein (rendert sauber „−0.1s"+, ≥ ~4 % Tempo) —
> **oder fehlen.** Werte mit Magnitude < 120 werden entfernt und die Speise/das Tonikum bekommt eine
> andere Währung (Sustain/Krit/Attribut) oder keinen Buff.

**Rollen-Klärung (Food vs. Tonikum):** Food (Cooking, abundant) = **Heil + Sustain** (hpRegen/maxHp) + höchstens ein **meaningful** Krit/Tempo. Dedizierte Kampf-Tempo/Attribut-Bursts gehören zu **Tonika** (Herblore, rarere Kräuter). Food-Budget bewusst **unter** Tonikum-Budget (§4.2). Die konkreten Item-Fixes stehen in §2.3.

**Betroffene Tonika (gleiche Regel, „SHOULD"):** `tonic_oxblood` (−60 → **−120**). T1-Tempo-Buff; auf den Floor heben macht ihn sichtbar UND spürbar, ohne Balance-Bruch (billigstes Tempo-Tonikum). *(Die glyph-Tempos werden mit den Glyphs entfernt, §4.4.)*

---

## 4. Consumables — trinität-bewusste Buff-Währungen + Power-Budget

### 4.1 Erlaubte Buff-„Währungen"

| Klasse | Feld | erlaubt? | Notiz |
|---|---|:--:|---|
| Attribute | `buff.modifiers.{str,dex,con,int,wis,lck}` | ✅ | ganzzahlig 1..6 |
| Tempo | `buff.bonus.attackIntervalMs` | ✅ | nur ≤ −120 (Floor, §3) |
| Krit | `buff.bonus.{critChance,critDamage}` | ✅ | — |
| Sustain | `buff.bonus.{hpRegenPerSec,maxHp}` | ✅ | maxHp ganzzahlig ≥1 |
| Mana | `buff.bonus.{maxMana,manaRegen}` | ✅ | Magier-Utility |
| Trinity | `buff.trinity.{armorRating,evasionRating,wardCapacity,blockChance}` | ✅ | Ranges §4.3 |
| Lebensraub | `buff.bonus.lifesteal` | ⚠ | nur als bewusster Chase-Buff, sonst meiden |
| **Roh-Kampf-Flats** | `buff.bonus.{meleeDamage,rangedDamage,magicDamage,defense,accuracy,evasion}` | ❌ | **VERBOTEN** (Guard §4.3) |
| Skilling-Mults | `buff.bonus.{gatherXpMult,gatherYieldMult}` | ✅ | nur Sammel-Tonika (kein Kampfwert) |

### 4.2 Power-Budget je Buff-Tier

Buff-Tier folgt der Rarity (common → superRare → epic ≈ T1 → T2 → T3). **Regel:** T1 gibt ~1 Währung, T2 bis 2, T3 bis 3 (Premium-Multi-Stat). Food-Buffs liegen **eine halbe Stufe unter** dem Tonikum gleicher Machart (abundant).

| Währung | T1 (common) | T2 (superRare) | T3 (epic) | Guard-Max |
|---|--:|--:|--:|--:|
| Attribut (str/dex/con/int/wis/lck) | +2 | +4 | +6 | 1..6 |
| attackIntervalMs (Tempo) | −120 | −180 | −270 | ≤ −120 (Floor) |
| critChance | +0.02 | +0.05 | +0.08 | — |
| critDamage | — | +0.15 | +0.25 | — |
| hpRegenPerSec | +0.1 | +0.2 | +0.4 | — |
| maxHp | +2 | +5 | +10 | ganzzahlig ≥1 |
| maxMana / manaRegen | +15 / +1 | +30 / +2 | +50 / +3 | — |
| trinity.armorRating | +20 | +30 | +35 | **0..35** |
| trinity.evasionRating | +12 | +16 | +20 | **0..20** |
| trinity.wardCapacity | +30 | +55 | +80 | **0..80** |
| trinity.blockChance | +0.05 | +0.08 | +0.10 | **0..0.10** |

**Ist-Bestand ist bereits konform** (Stichprobe): `tonic_stoneskin` armorRating 35 (T3-Max ✅),
`tonic_keeneye` evasionRating 20 (T3-Max ✅), `elixir_warding` wardCapacity 40 (T2 ✅),
`tonic_bloodrage` str 4 (T2 ✅), `tonic_apex` crit 0.10 (T3 ✅). Nach der Glyph/Scroll-Entfernung (§4.4)
tragen die **Tonika die Trinity-Buff-Quartett-Rolle allein** — die einzige Lücke ist **Block** (bisher nur
`glyph_of_the_bulwark`) → neues `tonic_bulwark` (§4.4).

### 4.3 Guard-Erweiterung (logic-dev, `content-integrity.test.ts`)

Der bestehende `consumable-buff`-Guard (Z. 191-223) prüft **nur** modifiers/trinity-Ranges. **Drei Lücken:**

1. **Roh-Kampf-Flats verbieten (NEU):** für jedes Consumable-`buff.bonus` müssen
   `meleeDamage / rangedDamage / magicDamage / defense / accuracy / evasion` **fehlen oder 0** sein
   (die Itemization-2.5-Konversion war reine Politik ohne Guard — jetzt festnageln).
2. **Tempo-Floor (NEU):** `buff.bonus.attackIntervalMs`, falls gesetzt, muss **≤ −120** sein (verhindert „−0.0s").
3. **Ranges auf It2.1-Stand tighten:** `evasionRating` **40 → 20**, `blockChance` **0.15 → 0.10**
   (armorRating 35 & wardCapacity 80 bleiben; modifiers 1..6 bleibt). Kein Ist-Item bricht (max genutzt: eva 20, block 0.10).

*(Optional maxHp-Floor `≥1`: fängt die Squish-Residue-`0.3/0.4/0.8`-Werte. „SHOULD".)*

### 4.4 Glyphs KOMPLETT + Scrolls (for now) entfernen (Chef-Entscheid G/H)

Chef: Tränke + Buff-Food reichen als **balancebare** Buff-Quelle; Glyphs raus, Scrolls „deferred" (später evtl. mit neuem Update wieder). Beide sind reine Buff-Consumables → sie überlappen den Tonikum-Buff-Raum.

**Zu entfernen (content-dev):**

| Klasse | IDs |
|---|---|
| **7 Glyph-Items** | `glyph_of_might`, `glyph_of_warding`, `glyph_of_precision`, `glyph_of_the_zealot`, `glyph_of_the_bulwark`, `glyph_of_alacrity`, `glyph_of_ruin` |
| **3 Scroll-Items** | `scroll_of_overload`, `scroll_of_aegis`, `scroll_of_cataclysm` |
| **10 Craft-Aktionen** | `craft_glyph_of_*` (7) + `craft_scroll_of_*` (3) — Skill `runecrafting`, Kategorien `rune_glyphs`/`rune_scrolls` |
| **2 Kategorie-Defs** | `rune_glyphs`, `rune_scrolls` |
| **Quest-Reward-Refs (~19)** | Glyphs in Quest-`rewards.items` (Z. 13057–14084: q_skiller_2, q_slayer_*, …). Scrolls: **keine** Reward-Refs. |

- **Referenz-Audit (grep-bestätigt):** Glyphs/Scrolls erscheinen **nicht** in Monster-Loot, Shop, Sets, Dungeons — nur Item-Defs + Craft-Aktionen + (Glyphs) Quest-Rewards. Sauber entfernbar.
- **Quest-Rewards ersetzen:** jede Glyph-Reward-Position durch ein gleichwertiges balancebares Consumable (Tonikum/Heiltrank on-tier) oder Gold ersetzen — **content-dev-Entscheid je Quest** (kein leerer Reward-Slot). Vorschlag: Glyph → on-level `tonic_*`/`potion_*` gleicher Gold-Wert, damit die Quest-Belohnung ihren Buff-Charakter behält.
- **Runecrafting-XP-Loch:** die 10 Craft-Aktionen waren RC-XP-Content (L20–L75). Deren Wegfall reißt eine RC-Leveling-Lücke → content-dev deckt sie mit den **neuen Trinity-Runen-Craft-Aktionen** (§6.3, gleiche RC-Bänder) ab. Kopplung: §6 und §4.4 in **einer** Content-Welle.

**Buff-Raum-Deckung nach Entfernung (KEINE Lücke lassen, Chef-Vorgabe):** die entfernten Buffs vs. Ersatz aus Tonika/Food:

| Verlorene Währung | Bisher (Glyph/Scroll) | Deckung nach Entfernung |
|---|---|---|
| Tempo T1–T3 | might/zealot/alacrity/ruin/overload/cataclysm | `tonic_oxblood`(T1, →−120), `tonic_warpath`(−270), `tonic_apex`(−240), `godsbreath_elixir`(−330), Kombi-Food ✅ |
| Krit | precision(0.08), ruin, overload, cataclysm | `tonic_warpath`(0.05), `tonic_apex`(0.10), `godsbreath_elixir`(0.08+cd0.25) ✅ |
| maxHp/Sustain | warding(3.3), aegis(10.2) | `tonic_ironbark`(7.8), `panacea_elixir`(10.2) ✅ |
| Ward (Trinity) | — (warding war nur maxHp) | `elixir_warding`(wardCapacity 40) ✅ |
| **Block (Trinity)** | **bulwark(0.10) — EINZIGE Quelle** | **LÜCKE → neues `tonic_bulwark`** |

**Neu (content-dev): `tonic_bulwark`** — schließt die Block-Lücke UND komplettiert das Trinity-Buff-Quartett
(stoneskin=Armor / keeneye=Ausweich / warding=Ward / **bulwark=Block**):

```
tonic_bulwark: { name: EN "Bulwark Tonic" / DE "Bollwerk-Tonikum", type consumable, rarity superRare,
                 value ~150, buff: { durationMs 90_000, bonus: {}, trinity: { blockChance: 0.10 } } }
brew_bulwark_tonic: skill herblore, levelRequired ~40, inputs herb_gravemoss ×2 + essence_grave ×1 + clear_oil ×1
```

*(Optional: `tonic_precision` [crit 0.08, superRare] als reiner Krit-Buff-Ersatz für glyph_of_precision — Krit ist über warpath/apex aber schon gedeckt, daher „nice-to-have", §11.)*

**Migration (logic/persistence-dev) — Spieler-Saves säubern:**
- **Generisch in `sanitizeState`** (empfohlen, kein SAVE_VERSION-Bump): entferne aus jedem Item-Träger jede ID, die **nicht** in `content.items` existiert — `inventory.slots`, `inventory.bagSlots`, `bank`, **aktive `character.buffs`** (`buff.itemId ∉ content.items` → Buff droppen) und **`character.food`** (falls == entfernte ID → null). Das fängt die 10 Glyph/Scroll-IDs UND künftige Entfernungen generisch.
- **Kompensation (pre-release, unkritisch):** optional Gold-Refund = Σ `value` der entfernten Stacks beim ersten Load (Migration-Branch). Default: **einfacher Strip ohne Refund** (kein Live-Player-Base).
- **`seenDrops`/Collection-Log/`craftedById`:** tote IDs werden ignoriert (kein aktiver Schritt).

**Scroll-Design-Notiz (deferred, NICHT löschen):** Die 3 Scrolls waren die epischen Top-Burst-Buffs
(overload −240/crit; aegis maxHp/regen; cataclysm −360/crit/critDmg). Falls der Chef sie später als
Update wieder aufnimmt: als **rare Drop-/Reward-only-Buffs** (nicht craftbar) am T3-Budget (§4.2)
wieder einführen — der Effekt-Raum ist heute durch die epischen Tonika (`godsbreath_elixir` etc.) gedeckt,
ein Comeback wäre also reiner Content-Zusatz, keine Balance-Lücke.

---

## 5. Enchantments — Audit des Ist-Systems

Das Instanz-/Affix-/Suffix-Fundament ist **gebaut** (`shared`: `AffixDef`/`SuffixDef`/`ItemInstance`/
`RuneAffix`; `content.affixes`/`content.suffixes`; `instanceBonusDelta` in `shared` aggregiert Affix+Suffix).

### 5.1 Waffen-Affixe (8 × 3 Tiers = 24 Runen) — bereits flat-frei

Alle `bonusByTier` sind `{}` (keine Flats); Effekt kommt aus `modifiersByTier` (Attribute) oder `weaponEffectByTier` (Procs):

| Affix | Rune-Familie | appliesTo | T1 | T2 | T3 | Währungsklasse |
|---|---|---|---|---|---|---|
| `affix_keen` | Rune of Keen | weapon_melee | str +3 | str +6 | str +10 | Roh-Attribut |
| `affix_arcane` | Rune of Arcane | weapon_magic | int +3 | int +6 | int +10 | Roh-Attribut |
| `affix_precise` | Rune of Precision | any_weapon | lck +2 | lck +4 | lck +6 | Effizienz-Attribut |
| `affix_swift` | Rune of Swiftness | any_weapon | dex +1 | dex +2 | dex +3 | Effizienz-Attribut |
| `affix_hunter` | Rune of the Hunt | weapon_ranged | lck +2 | dex +1, lck +3 | lck +4 | Effizienz-Attribut |
| `affix_flame` | Rune of Flame | any_weapon | burn 15% 0.4/3s | burn 20% 0.8/4s | burn 25% 1.4/5s | Proc |
| `affix_frost` | Rune of Frost | any_weapon | frost 15% 2.5s | frost 22% 3.5s | frost 30% 5s | Proc |
| `affix_shock` | Rune of Storm | any_weapon | shock 12% 0.10/3s | shock 16% 0.15/4s | shock 20% 0.20/5s | Proc |

### 5.2 Power-Budget der Waffen-Affixe — begehrenswert-Check

Die Roh-Attribute (keen/arcane) tragen **größere Zahlen** (+10) als die Effizienz-Attribute (swift +3, precise +6),
weil dex/lck **doppelt** wirken (dex → Krit UND −40 ms/dex-Tempo via computeStats; lck → Krit-Chance UND Loot).
Das ist die **Effizienz-Korrektur**, keine Imbalance — genau der Grund, warum die itemization-regate den
`affix_hunter`-T3-dex trimmte (Stil-Ø-Spread auf ~5 pp gehalten). **Verdikt: alle 8 liegen im Budget.**
Der einzige „fühlt sich klein an"-Kandidat ist **`affix_swift` (dex +1/2/3)** — numerisch das kleinste, aber
dex +3 = ~+1.5 % Krit + −120 ms Tempo (ein echter „Swift"-Boost). **Kein Zahlen-Change** — der CLARITY-Fix
(§8, klarer Tooltip) behebt die *Wahrnehmung*. *(Chef-Option: falls swift nach Tooltips noch schwach wirkt, T1 dex 1→2; §11.)*

### 5.3 Suffixe — bereits trinität-konform

Suffixe (`content.suffixes`) nutzen ausschließlich `attrPerIlvl` (Attribute) + `softStats` (crit/Tempo) +
`boostPerIlvl` (nur Schmuck). Roh-Kampf-Flats via `statsPerIlvl` wurden 2026-07-02 vollständig saniert
(Kommentar Z. 14978). **Rüstungs-Suffixe rollen Attribute (con/dex/…)** — das speist maxHp/Terme, NICHT
Roh-Defense-Flats → passt zur Trinität. **Keine Änderung nötig.**

---

## 6. Enchantments — NEUE Trinity-Rüstungs-Runen (Befund E)

Heute kann **nur Waffe** verzaubert werden. Für Trinität-Vollständigkeit: 4 Rüstungs-/Schild-Affixe, je I/II/III.

### 6.1 Shared-Typ-Erweiterung (logic-dev, Voraussetzung)

`AffixDef` braucht ein Trinity-Feld (analog zu `buff.trinity`), und `instanceBonusDelta` muss es falten:

```ts
// shared: AffixDef ergänzen
trinityByTier?: Array<{ armorRating?: number; evasionRating?: number; wardCapacity?: number; blockChance?: number }>;

// shared: instanceBonusDelta — pro Affix zusätzlich zu bonus/mods:
//   armorRating/evasionRating/wardCapacity ADDITIV zurückgeben (computeStats addiert auf eq.*),
//   blockChance als MAX (wie Gear/Buff). computeStats faltet es in den Trinity-Aggregat-Pass ein.
```

### 6.2 Klassen-Gating ohne neue Tags (empfohlen)

Trinität-Identität (Ward NUR aus Stoff, §It2 WARD_CORE_PER_INT=0) darf nicht durch Runen aufgeweicht
werden (kein Ward-Pool auf Platte etc.). **Statt neuer ItemTypeTags:** der Verzauberungstisch/`applyAffix`
(equipment.ts, logic-dev) erlaubt eine Trinity-Rune nur auf einem Teil, das **denselben Trinity-Stat
bereits > 0** trägt:

| Rune-Trinity-Stat | anbringbar nur wenn Basis-Teil … |
|---|---|
| armorRating | `armorRating > 0` (= Platte) |
| evasionRating | `evasionRating > 0` (= Leder) |
| wardCapacity | `wardCapacity > 0` (= Stoff) |
| blockChance | `blockChance > 0` (= Schild) |

Das hält die Klassen-Identität **ohne** neue Tags/`itemTypeTags`-Änderung. `appliesTo` der Affixe kann
generisch `["armor"]` bzw. `["shield"]` bleiben (der Gate-Check ist der eigentliche Filter).

### 6.3 Die 4 Trinity-Affixe + 12 Runen (content-dev)

Werte als **~15-30 % Sekundär-Boost** eines on-tier-Slot-Teils (permanent → unter dem Temp-Buff-Cap):

| Affix (neu) | Rune EN / DE | Trinity-Stat | T1 | T2 | T3 | appliesTo |
|---|---|---|--:|--:|--:|---|
| `affix_aegis` | Rune of the Aegis / Rune der Ägide | armorRating | +6 | +12 | +20 | armor (Gate: armorRating>0) |
| `affix_evasion` | Rune of Evasion / Rune des Ausweichens | evasionRating | +5 | +10 | +16 | armor (Gate: evasionRating>0) |
| `affix_warding` | Rune of Warding / Rune der Abwehr | wardCapacity | +12 | +25 | +40 | armor (Gate: wardCapacity>0) |
| `affix_bulwark` | Rune of the Bulwark / Rune des Bollwerks | blockChance | +0.03 | +0.05 | +0.08 | shield |

Runen-Items (12): `rune_aegis_i/ii/iii`, `rune_evasion_i/ii/iii`, `rune_warding_i/ii/iii`,
`rune_bulwark_i/ii/iii` — Runecrafting, gestaffelt wie die Waffen-Runen (T1 ~L15-30 / T2 ~L38-55 /
T3 ~L62-80), Essenz-/Pigment-Inputs analog.

**Budget-Nachweis (T3 vs on-tier R40-Gear):** armorRating +20 ≈ 28 % der 5pc-Σ 72 (< Buff-Cap 35);
evasionRating +16 ≈ 26 % der Σ 62 (< Cap 20); wardCapacity +40 ≈ 29 % der Σ 138 (Ward hat keinen %-Cap);
blockChance +0.08 ≈ 24 % von Schild-Block 0.33 (< Cap 0.10, weit unter BLOCK_CAP 0.50). Am High-Band
(R90) tapern alle auf < 10 % → sauberer „früh stark, spät sekundär"-Verlauf, wie bei Suffixen. ✅

**Ladder-Guard-Kopplung:** Der bestehende Trinity-Ladder-Guard (`content-integrity.test.ts`) prüft
Gear-Teile je Slot streng steigend. Die Runen-Trinity läuft über `instanceBonusDelta` (Overlay), **nicht**
über die Gear-Teile — der Ladder-Guard bleibt unberührt (Runen sind additiver Overlay, keine Basis-Werte).

---

## 7. Konsolidierte Rune-Übersicht nach dem Ausbau

8 Waffen-Affixe + 4 Rüstungs-Affixe = **12 Affix-Familien × 3 Tiers = 36 Runen**. Jede „begehrenswert"
in ihrer Nische: 2 Roh-Damage-Attribut (melee/magic), 3 Effizienz-Attribut (dex/lck), 3 Waffen-Proc
(burn/frost/shock), 4 Trinity-Defensiv (Schutz/Ausweich/Ward/Block). Kein Stil/Rüstungsklasse ohne
mindestens eine sinnvolle Rune.

---

## 8. CLARITY — Runen ersichtlich machen (Befund F + Chef-Entscheid I)

**Problem:** Ein Runen-Item (z. B. „Rune of Keen II") zeigt im Inventar **nur den Namen** — `ItemTooltip.tsx`
rendert `item.rune` nicht, und `AffixDef` hat kein Beschreibungsfeld. Der Spieler weiß weder, was die Rune tut,
NOCH wie das Item **mit** der Rune aussähe. Die Effekt-Text-Logik `affixEffectParts(def, tier, …)` **existiert
bereits** (Tooltip Z. 195-235) — sie muss surface'd + um Trinity erweitert werden. Der Chef will darüber hinaus
eine **Vorher/Nachher-Item-Vorschau** (Stat-Delta) beim Betrachten/Anwenden.

Zwei Ebenen: **(A) Preview-Panel** am Verzauberungstisch (reich, Chef-Entscheid I) + **(B) Rune-Item-Tooltip**
(leichtgewichtig, immer im Inventar). Beide speisen aus **einer** Quelle (`affixEffectParts` + neuer `enchantPreview`).

### 8.1 Enchant-Preview-Panel (Chef-Entscheid I) — Vorher/Nachher am Tisch

Beim Auswählen einer Rune für ein Ziel-Item zeigt der Verzauberungstisch das **resultierende Item** mit
hervorgehobenem Delta — der Spieler sieht exakt, wie sein Item danach dasteht:

```
┌─ Vorschau: {ItemName}  +  {RuneName} T{tier} ─────────────┐
│  Stat            vorher  →  nachher     Δ                  │
│  Stärke            12    →    22       +10  ✦              │  ← geändert = hervorgehoben
│  Rüstung           21    →    41       +20  ✦              │  ← Trinity-Stat
│  Krit-Chance       5%    →    5%         —                 │  ← unverändert = gedimmt
│  ── Neuer Effekt ──                                        │
│  25% Chance: Brand 1,4/s über 5s                           │  ← Proc (weaponEffectProse)
│                                                            │
│  [Verzaubern — 1× Rune of Flame III  +  {gold} g]         │
│  (⚠ falls blockiert: „Slot voll (2/2)" / „nur Stoff")     │
└────────────────────────────────────────────────────────────┘
```

- **Delta-Hervorhebung:** geänderte Zeilen fett/farbig + `+Δ`; unveränderte gedimmt. Trinity-Stats
  (Rüstung/Ausweichen/Ward/Block) und Attribute erscheinen als normale Stat-Zeilen; **Procs** (burn/frost/shock)
  als separate „Neuer Effekt"-Zeile (kein Zahlen-Delta — additive Fähigkeit).
- **Blockiert-Fall:** ist der Enchant nicht anwendbar (Slot voll nach `enchantSlotsFor(rarity)` ODER Klassen-Gate
  §6.2 verletzt), zeigt das Panel `canApply=false` + `blockedReason` statt des Buttons.
- **Überschreiben:** ersetzt eine Rune einen belegten Slot, zeigt die Vorschau das Delta **gegen den aktuell
  belegten** Affix (nicht gegen leer) — der Spieler sieht Netto-Gewinn/-Verlust.

### 8.2 Engine-Datenvertrag: `enchantPreview` (logic-dev, reiner Helfer)

Damit ui-dev das Panel rein deklarativ rendert, liefert die Engine **einen** Preview-Wert (keine UI-Rechen-Logik):

```ts
// shared/engine — rein, deterministisch, kein State-Mutieren:
export function enchantPreview(
  content: ContentDB,
  target: ItemInstance | ItemDef,   // Ziel: bestehende Instanz ODER plain Item
  runeItemId: ItemId,               // die gewählte Rune (trägt item.rune = {affixId, tier})
  overrideSlotIndex?: number,       // gesetzt = Überschreiben dieses Affix-Slots
): EnchantPreview;

export interface EnchantPreview {
  before: ItemStatView;   // Item-EIGEN-Beitrag VOR der Rune (Basis + vorhandene Affixe/Suffix)
  after:  ItemStatView;   // … NACH Anwendung/Überschreiben der Rune
  changedKeys: string[];  // welche Stat-Keys sich ändern → ui hebt genau diese hervor
  addedProcs: WeaponEffect[];   // neue Waffeneffekte durch die Rune (für „Neuer Effekt"-Zeilen)
  effectParts: string[];        // Klartext-Effekt der Rune allein (= affixEffectParts, §8.4)
  canApply: boolean;
  blockedReason?: "slot_full" | "class_mismatch" | "wrong_item_type";
}

// ItemStatView = das Item-EIGEN-Stat-Aggregat (NICHT der ganze Character):
//   base.bonus + base.modifiers + base-Trinity (armorRating/evasionRating/wardCapacity/blockChance)
//   + Σ instanceBonusDelta(vorhandene Affixe/Suffix)  [+ Kandidat-Affix bei `after`]
export interface ItemStatView {
  bonus: EquipBonus;
  modifiers: Partial<Record<AttributeId, number>>;
  trinity: { armorRating: number; evasionRating: number; wardCapacity: number; blockChance: number };
  procs: WeaponEffect[];
}
```

- Baut auf dem **vorhandenen** `instanceBonusDelta` (shared, aggregiert Affix `bonusByTier`+`modifiersByTier`
  +Suffix) auf — `enchantPreview` erweitert es um den **Trinity-Overlay** (§6.1) und den **Kandidat-Affix**
  und diff't `before`/`after`. Eine Quelle, konsistent mit computeStats (Chef-Hardrule „computeStats bleibt die
  einzige Stat-Aggregation" bleibt gewahrt — dies ist ein reiner *Preview*-Diff, keine zweite Live-Aggregation).
- `canApply`/`blockedReason` kapselt die Regeln (Rarity-Slot-Cap §3.3 Instanz-Spec, Klassen-Gate §6.2,
  appliesTo-Typ-Match) → ui muss keine Enchant-Regel kennen.

### 8.3 Rune-Item-Tooltip (leichtgewichtig, immer im Inventar)

Wenn `item.rune` gesetzt: `content.affixes[rune.affixId]` auflösen und rendern (self-describing Rune):

```
{RuneName} {T-röm}                     ← Item-Name + Tier
── Verzauberung ──                     ← Gruppen-Label (itip.group.enchantment)
{Effekt-Zeile}                         ← affixEffectParts(def, rune.tier)  (§8.4)
Anwendbar auf: {Typ-Label}             ← aus appliesTo (+ Klassen-Gate §6.2)
```

EN-Spiegel: `── Enchantment ──` / `Applies to: {type}`.

### 8.4 Effekt-Zeilen-Regeln (kanonisch, von `affixEffectParts` erzeugt)

| Rune-Art | Template EN | Template DE | Beispiel (T3) |
|---|---|---|---|
| Attribut | `+{N} {Stat}` | `+{N} {Stat}` | `+10 Strength` / `+10 Stärke` |
| Trinity (flach) | `+{N} {Stat}` | `+{N} {Stat}` | `+20 Armour` / `+20 Rüstung` · `+40 Ward` / `+40 Bannschild` · `+16 Evasion` / `+16 Ausweichen` |
| Trinity (Block) | `+{P}% Block Chance` | `+{P}% Blockchance` | `+8% Block Chance` / `+8% Blockchance` |
| Proc | `{C}% chance: {Status} {M}/s for {D}s` | `{C}% Chance: {Status} {M}/s über {D}s` | `25% chance: Burn 1.4/s for 5s` / `25% Chance: Brand 1,4/s über 5s` |

*(Die Proc-Zeile kommt schon aus `weaponEffectProse` — nicht am inneren „ · " splitten, Z. 193.)*

### 8.5 Benötigte i18n-Stat-Namen (en/de) — ui-dev/content-dev

Attribute existieren (`ATTR_NAME`). **Neu für Trinity** (Keys + Text):

| Key | EN | DE |
|---|---|---|
| `stat.armorRating` | Armour | Rüstung |
| `stat.evasionRating` | Evasion | Ausweichen |
| `stat.wardCapacity` | Ward | Bannschild |
| `stat.blockChance` | Block Chance | Blockchance |

Typ-Labels für `appliesTo` (+ Klassen-Gate):

| Tag / Gate | EN | DE |
|---|---|---|
| weapon_melee | Melee Weapons | Nahkampfwaffen |
| weapon_ranged | Ranged Weapons | Fernkampfwaffen |
| weapon_magic | Magic Weapons | Magiewaffen |
| any_weapon | Any Weapon | Alle Waffen |
| armor + armorRating-Gate | Plate Armour | Plattenrüstung |
| armor + evasionRating-Gate | Leather Armour | Lederrüstung |
| armor + wardCapacity-Gate | Cloth Armour | Stoffrüstung |
| shield | Shields | Schilde |

### 8.6 `affixEffectParts`-Erweiterung (ui/shared)

`affixEffectParts` muss `def.trinityByTier?.[tier-1]` mit-rendern (die 4 Stats nach obigem Template).
Damit tragen sowohl das Runen-Item, die Enchant-Vorschau ALS AUCH das ausgerüstete Teil identische,
präzise Effekt-Texte — eine Quelle, konsistent (Chef-Kern-Wunsch „Runen sagen klar, was sie tun").

---

## 9. Apply-List (geordnet, Single-Writer je Datei)

**Reihenfolge:** A (logic, shared/guard) zuerst — definiert Trinity-Affix-Typ + Guard, die B/C lesen.

### A — logic-dev (`shared` + `engine` + `persistence` + `content-integrity.test.ts`) — ZUERST
1. `AffixDef.trinityByTier?` + `instanceBonusDelta`-Faltung (armorRating/eva/ward additiv, block MAX) (§6.1).
2. `applyAffix`/Verzauberungstisch-Gate: Trinity-Rune nur auf Teil mit demselben Trinity-Stat > 0 (§6.2).
3. Guard-Erweiterung (§4.3): (a) Roh-Flat-Verbot in `buff.bonus`; (b) Tempo-Floor ≤ −120; (c) Ranges eva 40→20, block 0.15→0.10. *(opt.: maxHp-Floor ≥1.)*
4. **`enchantPreview`-Helfer** (§8.2): reiner Vorher/Nachher-Diff (before/after/changedKeys/addedProcs/effectParts/canApply/blockedReason) — Basis für das Chef-Preview-Panel.
5. **Migration Glyphs/Scrolls (§4.4):** `sanitizeState` generisch erweitern — Item-IDs ∉ `content.items` aus `inventory.slots`/`bagSlots`/`bank`/aktiven `character.buffs`/`character.food` strippen (fängt die 10 Glyph/Scroll-IDs; **kein** SAVE_VERSION-Bump). *(Opt. Gold-Refund-Branch.)*

### B — content-dev (`packages/content/src/index.ts`) — NACH A
4. **Heil-Fixes (§2.2/§2.4):** Draughts `minor_healing_potion` heal 3→**5** + Rename (Herbal Draught / Heilkräutersud); `greater_healing_potion` heal 7→**11** + Rename (Concentrated Draught / Konzentrierter Kräutersud). Crop-Sink: `salve_of_mending` 6→**10**, `gallows_preserve` 19→**20**, `duskcap_tonic` 24→**23**, `corpse_lily_salve` 29→**30**, `revenant_elixir` 35→**39**, `godbloom_infusion` 38→**46**, `nightshade_extract` maxHp 0.8→**1**.
5. **Food-Buff-Fixes (§2.3/§3):** `cooked_beef` Tempo→`{hpRegenPerSec:0.1}`; `roc_drumstick_grilled`→`{critChance:0.02,hpRegenPerSec:0.1}`; `wolf_steak` dex 4→**2**; `wyvern_steak` Tempo −60→**−150**; `venison_roast` maxHp 0.3→**1**; `bear_haunch` maxHp 2.5→**3**. Kombi-Stew-Tempo auf Floor: `bloodgrain_stew`/`duskfin_rangers_stew`/`spellwarden_bisque` −60→**−120**, `steelshot_bisque`/`spellflare_tisane` −90→**−150**. *(SHOULD: `tonic_oxblood` −60→−120, `glyph_of_might` −90→−120; sub-1-maxHp-Stews → ganzzahlig.)*
6. **Trinity-Runen (§6.3):** 4 Affix-Defs (`affix_aegis/evasion/warding/bulwark` mit `trinityByTier`) + 12 Runen-Items (`rune_aegis/evasion/warding/bulwark _i/ii/iii`) + Runecrafting-Craft-Aktionen (Tier-Staffel wie Waffen-Runen; decken das RC-XP-Loch der entfernten Glyph/Scroll-Crafts ab).
7. **Glyphs+Scrolls entfernen (§4.4):** 10 Items + 10 `craft_*`-Aktionen + 2 Kategorie-Defs (`rune_glyphs`/`rune_scrolls`) löschen; ~19 Glyph-Quest-`rewards.items`-Refs durch on-tier `tonic_*`/`potion_*` (gleicher Gold-Wert) oder Gold ersetzen.
8. **`tonic_bulwark` NEU (§4.4):** trinity.blockChance 0.10 (superRare) + `brew_bulwark_tonic` (herblore ~L40) — schließt die Block-Buff-Lücke.
9. *(Optional §11):* `tonic_precision` (crit 0.08) als reiner Krit-Buff-Ersatz.

### C — ui-dev (renderer)
10. **Enchant-Preview-Panel (Chef-Entscheid I, §8.1/§8.2):** am Verzauberungstisch `enchantPreview` konsumieren → Vorher/Nachher-Stat-Block mit hervorgehobenem Delta, „Neuer Effekt"-Zeilen für Procs, `blockedReason`-Anzeige.
11. **Rune-Item-Tooltip (§8.3):** `item.rune` → `affixEffectParts` rendern (Effekt-Zeile + „Anwendbar auf").
12. `affixEffectParts` um `trinityByTier` erweitern (§8.6); i18n-Keys `stat.armorRating/evasionRating/wardCapacity/blockChance` + Typ-Labels (§8.5, en+de).
13. Buff-Tooltip: Tempo rendert nach Fix ≥ „−0.1s" (kein −0.0s mehr) — verifizieren.

### D — kontrolleur — Re-Gate (§10)

---

## 10. Gate-Kriterien (kontrolleur, headless, echter Content/computeStats)

1. **Heil-Leiter monoton je Familie:** in jeder Familie (Basis-Potion / Draught / Crop-Sink / Koch-Fisch /
   -Fleisch) steigt `healAmount` **streng** mit dem Craft-Level. Kein L-höheres Item heilt ≤ ein L-niedrigeres
   derselben Familie. (Guard: sort by level, assert strictly increasing heal per family.)
2. **Keine Kollision Draught==Potion:** `minor_healing_potion.healAmount != potion_minor_heal.healAmount`
   (bzw. Draught > Basis-Potion auf jedem geteilten Level).
3. **Kein „−0s"-Buff:** kein `buff.bonus.attackIntervalMs > -120` (Guard §4.3 grün).
4. **Keine verbotenen Buff-Flats:** kein Consumable-`buff.bonus` trägt melee/ranged/magicDamage/defense/
   accuracy/evasion (Guard §4.3 grün).
5. **Buff-Trinity-Ranges:** armorRating ≤35, evasionRating ≤20, wardCapacity ≤80, blockChance ≤0.10,
   modifiers 1..6 (Guard grün; kein Ist-Item bricht).
6. **Trinity-Runen wirken + gated:** eine `rune_warding_iii` auf ein Stoff-Teil hebt `computeStats.wardCapacity`
   um +40; dieselbe Rune ist auf Platte **nicht** anbringbar (Gate §6.2). Analog aegis/evasion/bulwark.
7. **Jede Rune mit klarer Beschreibung:** für jeden Affix in `content.affixes` liefert `affixEffectParts`
   für Tier 1..3 eine **nicht-leere** Effekt-Zeile; jedes Runen-Item mit `item.rune` rendert sie im Tooltip
   (+ „Anwendbar auf"). (Test: kein Affix ohne modifiersByTier/weaponEffectByTier/trinityByTier-Inhalt.)
8. **Power-Budget:** kein Buff/keine Rune überschreitet die §4.2/§6.3-Tier-Caps.
9. **Glyphs/Scrolls entfernt + keine toten Refs:** kein `glyph_of_*`/`scroll_of_*` in `content.items`,
   `content.actions`, `content.categories`, Quest-`rewards` mehr; `wiring-audit` grün. Alt-Save mit Glyph/Scroll
   im Inventar/Bank/aktiven Buffs/food lädt sauber (sanitize strippt) → **0 tote IDs**.
10. **Buff-Raum ohne Lücke:** jede der 4 Trinity-Buff-Achsen hat ≥1 Consumable (armor=stoneskin, eva=keeneye,
    ward=elixir_warding, **block=`tonic_bulwark`**); Tempo/Krit/Sustain über Tonika/Food gedeckt (§4.4-Tabelle).
11. **Enchant-Preview korrekt (Chef-Entscheid I):** `enchantPreview` liefert für (Rune × Ziel-Item) ein `after`,
    das exakt dem `computeStats`-Beitrag nach echtem `applyAffix` entspricht; `changedKeys` markiert genau die
    veränderten Stats; `canApply=false` + `blockedReason` bei vollem Slot / Klassen-Mismatch.
12. **Regression:** `content-integrity` / `enchant` / `suffix` / `ward` / `mitigation` / `wiring-audit`-Guards grün;
    `pnpm typecheck` + Engine/Persistence-Tests + client-build grün. **Kein SAVE_VERSION-Bump** (Content-Werte
    + additives `trinityByTier`-Feld + generisches sanitize; Instanzen/Alt-Saves lesen defensiv, unberührt).

---

## 11. Offene Chef-Entscheide (Defaults gesetzt)

- **Draught-Differenzierung:** Premium-Sofort-Heil ≈1.5× (empfohlen, Default) **vs.** „anders" = Heil + hpRegen-Tail
  (Heil-over-Time, überlappt aber mit Kombi-Food). Default: **Premium-Instant**.
- **Draught-Ausbau:** die 2 Kräutersude als Low-Band-Premium-Paar belassen (Default) **vs.** zu voller
  Premium-Leiter (L1–L80, neue rare Kräuter) ausbauen. Default: **belassen**.
- **Trinity-Runen-Gating:** Stat-Präsenz-Gate (§6.2, empfohlen, keine neuen Tags) **vs.** neue Armor-Klassen-
  Tags in `itemTypeTags`. Default: **Präsenz-Gate**.
- **`affix_swift`-Buff:** dex 1/2/3 belassen (Default, balanciert via Effizienz) **vs.** T1 1→2, falls nach
  Preview/Tooltip-Fix noch schwach empfunden.
- **Glyph-Quest-Rewards-Ersatz:** Glyph-Positionen durch on-tier `tonic_*`/`potion_*` (gleicher Gold-Wert, Default)
  **vs.** durch reines Gold ersetzen — content-dev je Quest.
- **`tonic_precision` (optional):** reinen Krit-Buff (0.08) als Precision-Glyph-Ersatz anlegen **vs.** weglassen
  (Krit ist über warpath/apex gedeckt). Default: **weglassen**.
- **Scrolls-Comeback (deferred):** die 3 Scrolls später als rare Drop-/Reward-only-Buffs (nicht craftbar)
  wieder aufnehmen **vs.** dauerhaft raus. Default jetzt: **raus**, Design-Notiz behalten (§4.4).
- **Endgame-Heil vs. geartes maxHp (Balance-Frage, nicht #219-blockend):** `healAmount` ist ein **Flat** —
  ein 46er-Top-Heil deckt bei ungeartem L95 ~70 % HP, bei voll-geartem Tank aber < 20 %. Flat-Heals fallen
  am High-Band ab. Chef-Frage für später: Top-Heil-Consumables auf **% maxHp** umstellen (relevanz-stabil)
  **vs.** Flat lassen (idle-simpel). Default: **Flat lassen**, als eigenes Balance-Thema flaggen.

---

**Doc-Pfad:** `G:\GameDev\design\consumables-enchantments-spec.md`
