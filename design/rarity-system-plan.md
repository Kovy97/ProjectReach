# Rarity-System — Plan (zur Chef-Abnahme)

Status: **Design-Entwurf, kein Code/Content geändert.** Reines Konzept. Nach Abnahme
Umsetzung über shared (Enum/Farben) → content-dev (Regel je Item) → ui-dev (Tint + „Material"-Label) → Guard-Test.

Ziel: **7 Seltenheitsstufen mit Farben, JEDES Item bekommt genau eine Rarity nach einer
ableitbaren Regel, Hauptzweck = visuelle Differenzierung** über eine je Rarity getönte
Item-Detail-Hintergrundtextur.

---

## 0) IST-Zustand (Belege)

- `ItemRarity` heute (5 Stufen, `packages/shared/src/index.ts:753`):
  `"common" | "magic" | "rare" | "epic" | "legendary"` + `ITEM_RARITIES`.
- `"uncommon"` ist **kein** Item-Wert — gehört zu `AchievementRarity` (eigener Typ, Zeilen ~909/6200ff.). Bleibt unangetastet.
- CSS-Tokens: `components.css:55-61` → `--rar-common #9aa6ad`, `--rar-magic #5b8fd6`,
  `--rar-rare #d8c06a`, `--rar-epic #b07fd8`, `--rar-legendary #d98a4a`.
- Tooltip-Hintergrund ist **fix dunkel** (`components.css:466-480`, `linear-gradient(#131a18 → #0c1210)`);
  pro Rarity wird heute nur **Rahmen/Outline/Name** gefärbt (`components.css:482-485`, `:346-356`).
- `rarityClass()` (`apps/client/src/renderer/items.ts:28`) → CSS-Klasse `rarity-<token>`.
- **Materials sind heute inkonsistent gefärbt**: viele `type:"material"` tragen `magic/rare/epic`
  (z. B. `ironbark_log`=magic, `shadowpine_log`=rare, `godwood_log`=epic). Das widerspricht der
  neuen Vorgabe „Material = immer Common" und wird beim Pass plattgezogen.
- Verfügbare ItemDef-Felder für die Regel (`ItemDef`, `packages/shared/src/index.ts:757`):
  `type`, `bonus` (meleeDamage/rangedDamage/magicDamage/defense/accuracy/evasion/maxHp/maxMana/
  manaRegen/critChance/critDamage/attackIntervalMs), `modifiers` (Attribut-Boni),
  `weaponEffect` + `weaponEffects[]` (→ `effectiveWeaponEffects(item)`), `requirements`,
  `value`, `healAmount`, `buff`, `tool`, `bagCapacity`, `ammoDamage`. Set-Zugehörigkeit aus
  `content.sets[*].pieces`.

---

## 1) Die 7-Stufen-Skala (Tokens + Farben + Bedeutung)

Reihenfolge = aufsteigende Wertigkeit. **Token** = neuer `ItemRarity`-String (Enum + CSS-Klasse `rarity-<token>`).

| # | Token         | Name (en / de)            | Akzent-Hex (Rahmen/Name/Text) | Detail-BG-Tint-Hex (dunkel) | Bedeutung (1 Satz) |
|---|---------------|---------------------------|-------------------------------|-----------------------------|--------------------|
| 1 | `poor`        | Poor / Dürftig            | `#6b7280` (Grau)              | `#121417`                   | Reiner Vendor-Trash — bedenkenlos verkaufen, kein Nutzen. |
| 2 | `common`      | Common / Gewöhnlich       | `#cfd6db` (weißlich-grau)     | `#16191c`                   | Standard-Item; Materials sind immer hier. |
| 3 | `rare`        | Rare / Selten             | `#57c06f` (Grün)              | `#0f1a13`                   | Schon mit Extra-Stats über dem Standard. |
| 4 | `super_rare`  | Super Rare / Superselten  | `#4f8fe0` (Blau)              | `#0e1620`                   | Noch mehr Stats / erster Effekt. |
| 5 | `epic`        | Epic / Episch             | `#b07fd8` (Lila)              | `#170f1d`                   | Viele Stats und/oder Waffeneffekt / Set-Teil. |
| 6 | `legendary`   | Legendary / Legendär      | `#e0852f` (Orange)            | `#1c150c`                   | Set-Kapstein, Dual-Status-Fusion, Endgame-Stärke. |
| 7 | `godly`       | Godly / Göttlich          | `#ffe66b` (helles Gelb)       | `#1d1a0b`                   | Einzigartige Best-in-Slot-Spitze; kuratiert, sehr selten. |

Hinweise:
- **Akzent-Hex** färbt Rahmen, Outline, Item-Name und `.rarity-<token>-text`.
- **BG-Tint-Hex** ist ein **dunkler, entsättigter** Farbstich der dunklen Textur — nicht grell
  (siehe §5). Als Gradient von Tint → bestehendes Beinahe-Schwarz (`#0c1210`).
- `common` wird ggü. heute (`#9aa6ad`) etwas **heller** gewählt (weißlich-grau, wie vom Chef gewünscht).
- `epic`/`legendary` Akzente bleiben praktisch wie heute (Lila/Orange) → wenig UI-Bruch.

---

## 2) Logische Zuweisungs-Regel (ableitbar, auf ALLE Items anwendbar)

Ein **deterministischer Kaskaden-Algorithmus** `deriveRarity(item, content)`. Liefert für jedes
Item genau einen der 7 Tokens. Die ersten beiden Schritte sind harte Typ-Gates; danach ein
**Power-Score** aus echten Feldern; die zwei Extreme (Poor/Godly) brauchen je eine kleine,
kuratierte Liste (semantisch nicht aus Stats ableitbar — siehe Begründung).

### Hilfsgrößen (aus echten Feldern)
```
statCount(item) = Anzahl der Felder ≠ 0 in item.bonus
                + Anzahl der Attribut-Einträge ≠ 0 in item.modifiers
                + (item.ammoDamage ? 1 : 0)
effectCount(item) = effectiveWeaponEffects(item).length          // weaponEffect + weaponEffects[]
inSet(item)       = es existiert content.sets[s] mit item.id ∈ s.pieces
isJunk(item)      = item.id ∈ JUNK_IDS  (kuratierte Trash-Liste, siehe §7-Frage-1)
isGodly(item)     = item.id ∈ GODLY_IDS (kuratierte Best-in-Slot-Liste, siehe §7-Frage-2)
```

### Kaskade
```
deriveRarity(item):
  1. if item.type === "material"            → "common"        // Chef-Vorgabe: Material immer Common
  2. if isJunk(item)                        → "poor"
  3. if item.type ∈ {consumable, tool, bag}:
        if item.buff and statCount(buff.bonus) >= 2 → "rare"   // potente Tränke/Glyphen
        else                                         → "common" // Essen, Standard-Tools, Beutel
  4. // ab hier: equipment / Waffen / effektbehaftete Items
     n = statCount(item);  e = effectCount(item);  set = inSet(item)
     if isGodly(item)                        → "godly"
     if e >= 2                               → "legendary"     // Dual-Status-Fusion = Top-End
     if set and (n >= 5 or e >= 1)           → "legendary"     // Set-Kapstein
     if n >= 5 or set or (e >= 1 and n >= 4) → "epic"
     if n == 4 or (n == 3 and e >= 1)        → "super_rare"
     if n == 3 and e == 0 and not set        → "rare"
     else (n <= 2, e == 0, not set)          → "common"        // Standard-Ausrüstung
```

### Warum diese Schwellen (an echten Items geeicht)
- `rusty_sword` (`bonus{meleeDamage,accuracy}` = **2 Stats**) → **Common**. ✔ (Standard-Startwaffe)
- `wooden_shield` / `leather_body` (je **2 Stats**) → **Common**. ✔
- Ein Stück mit **3 Stats** (z. B. +dmg/+acc/+crit) hebt sich ab → **Rare (Grün)**. ✔ „schon mit Extra-Stats"
- **4 Stats** oder **3 Stats + Waffeneffekt** → **Super Rare (Blau)**. ✔ „noch mehr Stats"
- **5+ Stats**, **Set-Teil** oder **starker Effekt + viele Stats** → **Epic**.
- **Set-Kapstein** oder **2 Status-Effekte (Void-Fusion-Klasse)** → **Legendary**.
- **Einzigartige Spitze** (kuratiert) → **Godly**.

Damit ist die **Mitte (Common→Legendary) vollständig aus Feldern ableitbar** und per Skript auf
ALLE Items anwendbar. Nur die zwei Ränder sind kuratiert, weil sie semantisch sind:
- **Poor** = „kein Nutzen, nur Verkauf" ist keine Stat-Eigenschaft (ein 0-Stat-Item kann ein
  Crafting-Input sein). Heutiger Trash (`goblin_ear`, `crude_bone`, `birds_nest`) ist sogar als
  `type:"material"` getaggt → fiele sonst fälschlich auf Common. Daher explizite `JUNK_IDS`
  (oder ein neues `junk?: true`-Flag, §7-Frage-1).
- **Godly** = „das eine Beste" ist eine Kurations-Entscheidung, kein Schwellenwert.

---

## 3) Mapping der heutigen rarity-Werte → neue Skala

Die alte 5er-Skala schiebt sich sauber in die **mittleren 5** der neuen 7er-Skala; **Poor** und
**Godly** sind neue Randstufen.

| heute (Token/Farbe) | neu (Token/Farbe) | Anmerkung |
|---------------------|-------------------|-----------|
| `common` (grau/weiß) | `common` (weißlich-grau) | bleibt |
| `magic` (blau, „erster Step-up") | `rare` (**grün**) | erste Aufwertungsstufe rückt auf Grün |
| `rare` (gold) | `super_rare` (**blau**) | Achtung: Token-String `rare` bedeutet **neu Grün** (§7-Frage-3) |
| `epic` (lila) | `epic` (lila) | bleibt |
| `legendary` (orange) | `legendary` (orange) | bleibt |
| — | `poor` | NEU (Vendor-Trash) |
| — | `godly` | NEU (kuratierte Spitze) |

**Wichtig:** Dieses Mapping ist nur die **konzeptionelle Brücke / der Sanity-Check**. Quelle der
Wahrheit ist der Algorithmus aus §2 — content-dev **re-derived** jeden Wert neu, weil die alten
Tokens lose vergeben wurden (z. B. Materials mit `magic/rare/epic`, die jetzt platt auf `common`
gehen). Nach dem Pass darf es keinen `magic`-Token mehr geben.

---

## 4) „Material"-Kennzeichnung

- **Rarity:** `type === "material"` ⇒ immer `common` (Algorithmus-Schritt 1). Alle heutigen
  Material-Rarities (`magic/rare/epic` auf Logs/Fischen/Totems) werden auf `common` gesetzt.
- **Label „Material":** Es ist **keine Datenänderung nötig** — der Tooltip-Typ-Untertitel rendert
  bereits `t("item.type.material")` (`ItemTooltip.tsx:96`, `buildItemTypeLine`). ui-dev muss nur:
  1. sicherstellen, dass die i18n-Strings `item.type.material` = „Material" (en) / „Material" (de) sind,
  2. zusätzlich ein kleines, dezent weißliches **„MATERIAL"-Badge** in Item-Zelle/Tooltip zeigen
     (Signal „nützlich, nicht verkaufen"), gespeist aus `item.type === "material"`.
- Abgrenzung zu Poor: Echter Trash darf **nicht** mehr `type:"material"` sein bzw. muss in
  `JUNK_IDS` (§7-Frage-1), sonst landet er per Schritt 1 fälschlich auf Common.

---

## 5) Visuelle Umsetzung — Detail-Hintergrund je Rarity tönen

Heute: `.item-tooltip.itip-panel` hat einen **festen** dunklen Gradient. Neu: derselbe dunkle
Look, aber mit **sanftem Rarity-Farbstich** in der Textur (nicht grell). Umsetzung über
zusätzliche CSS-Tokens + eine Klassen-Regel pro Rarity.

**Tokens (in `:root`, `components.css`):** Akzent **und** dunkler BG-Tint je Stufe.
```css
:root {
  /* Akzent (Rahmen/Name/Text) */
  --rar-poor: #6b7280;  --rar-common: #cfd6db; --rar-rare: #57c06f;
  --rar-super-rare: #4f8fe0; --rar-epic: #b07fd8; --rar-legendary: #e0852f; --rar-godly: #ffe66b;
  /* Dunkler Hintergrund-Tint (Detail-Textur) */
  --rar-bg-poor: #121417;  --rar-bg-common: #16191c; --rar-bg-rare: #0f1a13;
  --rar-bg-super-rare: #0e1620; --rar-bg-epic: #170f1d; --rar-bg-legendary: #1c150c;
  --rar-bg-godly: #1d1a0b;
}
```

**Hintergrund-Regel** — Tint→Beinahe-Schwarz, identische Form wie heute, nur Startfarbe tauscht:
```css
.item-tooltip.itip-panel.rarity-rare {
  background: linear-gradient(180deg, var(--rar-bg-rare) 0%, #0c1210 55%, #0f1614 100%);
  border-color: var(--rar-rare);
}
/* analog für poor/common/super_rare/epic/legendary/godly mit --rar-bg-* / --rar-* */
```
- Intensität bewusst niedrig (Tint nur in den oberen ~0–55 %, Rest bleibt das vorhandene
  Schwarz) → **dezenter Schimmer, kein bunter Kasten**. Alternativ implementierbar via
  `color-mix(in srgb, var(--rar-<t>) 10%, #0c1210)`, falls ui-dev lieber prozentual mischt.
- Gleiche Tint-Logik optional leicht auf Inventar-Zellen (`.inv-slot.rarity-<t>.filled`) — heute
  nur Glow (`components.css:194-204`); Glow um `poor`/`common`/`rare`/`super_rare`/`godly` ergänzen.
- Text/Name: `.rarity-<token>-text` und `.item-tooltip.rarity-<token> .it-name` auf 7 Tokens
  erweitern (`character.css:2178-2182` + `components.css:346-356`).

---

## 6) Implementierungs-Pfad (nach Abnahme)

1. **shared** (`packages/shared/src/index.ts`)
   - `ItemRarity` → `"poor" | "common" | "rare" | "super_rare" | "epic" | "legendary" | "godly"`.
   - `ITEM_RARITIES` entsprechend (Reihenfolge = Wertigkeit).
   - `AchievementRarity` **unverändert** lassen (separater Typ).
   - Optional `junk?: boolean` (oder `unique?: boolean`) zu `ItemDef`, falls Chef Flags statt
     Listen will (§7).
   - Reine Helper `deriveRarity(item, content)` (Algorithmus §2) als **einzige Quelle der Wahrheit**.
   - Persistenz: Item-Rarity steht in den **Content-Defs, nicht im Save** → **kein** SAVE_VERSION-
     Bump / keine Migration nötig.
2. **content-dev** (`packages/content/src/index.ts`)
   - `rarity` jedes Items per `deriveRarity` setzen (bzw. bei Authoring 1:1 angleichen).
   - Alle Material-Rarities auf `common` plattziehen; `magic`-Token verschwindet komplett.
   - `JUNK_IDS` + `GODLY_IDS` (oder Flags) pflegen.
3. **ui-dev** (`apps/client/src/renderer/...`)
   - 7 `--rar-*` + 7 `--rar-bg-*` Tokens; Detail-Hintergrund-Tint je Rarity (§5).
   - Text-/Glow-Klassen auf 7 Stufen erweitern; `rarityClass()` deckt neue Tokens automatisch ab.
   - „MATERIAL"-Badge bei `type==="material"`; i18n `item.type.material` prüfen.
4. **Guard-Test** (Kontrolleur / content-Test)
   - „Jedes Item hat eine gültige Rarity": `∀ item: item.rarity === undefined || ITEM_RARITIES.includes(item.rarity)`.
   - „Material ⇒ common": `∀ item.type==="material": effectiveRarity === "common"`.
   - Optional Parität: `∀ item: authoredRarity === deriveRarity(item, content)` (verhindert Drift).

---

## 7) Offene Chef-Entscheidungen

1. **Poor erkennen:** Neues `junk?: true`-Flag an `ItemDef` **oder** kuratierte `JUNK_IDS`-Liste?
   Und: Welche heutigen Trash-Drops werden Poor (`goblin_ear`, `crude_bone`, `birds_nest` …) — und
   verlieren sie dafür `type:"material"` (sonst greift „Material=Common")?
2. **Godly kuratieren:** Welche Items sind „göttlich"/Best-in-Slot-Unikate (die heutige
   Endgame-Spitze)? Liste/Flag festlegen — sonst bleibt Godly leer.
3. **Token-Namen:** OK mit `super_rare` (CSS-Klasse `rarity-super_rare`)? Und Achtung: der String
   `rare` bedeutet **neu Grün** statt alt Gold — bewusst akzeptiert?
4. **Consumables/Tools/Bags:** Dürfen sie über Common steigen (Top-Trank/Top-Tool = Rare), oder
   strikt Common außer Equipment?
5. **Materials plattziehen bestätigen:** Heute farbige Mats (`ironbark`/`godwood`/`voidray` …)
   verlieren ihre Tier-Farbe und werden alle Common — visuell gewollt?
6. **Farb-Hex final:** Besonders `common` (helleres Weiß-Grau) und `godly` (`#ffe66b`-Helligkeit)
   abnehmen; BG-Tint-Intensität (dezent vs. deutlicher).
