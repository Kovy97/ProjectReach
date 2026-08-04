# Smithing Tier Items — Plan (OSRS-style, alle 12 Metall-Tiers)

> **Status:** Reine Planung/Design. KEINE Code- oder Content-Änderung. Vorlage für Chef-Freigabe; danach setzt content-dev um.
> **Autor:** Logic-Dev · **Datum:** 2026-06-24

## 1. Ziel

Eine konsistente, mit dem Tier skalierende **Item-Palette pro Schmiede-Metall-Tier** — wie OSRS, wo jedes Barren-Tier dieselben Item-Typen schmiedet (Dagger, Sword, Mace, Axe, 2H, Med/Full Helm, Platebody, Platelegs, Shields, Arrowheads …), nur stärker. Aktuell ist die Palette **inkonsistent**: die unteren Tiers (Copper/Iron) haben ein volles 17-teiliges Set, ab Mithril gibt es nur noch ein 5-teiliges Rumpf-Set („blade/helm/body/legs/shield"). Dieses Doc legt **eine** einheitliche Palette über alle 12 Tiers fest.

Berücksichtigt unser Kampfsystem (3 Stile **Melee / Ranged / Magic**): Schmieden liefert **Melee-Waffen + Metall-Rüstung + Fernkampf-Munition (Arrowheads/Bolt-Tips)**. Magie = Runecrafting (kaum Schmieden). Ranged-Bögen = Fletching; Schmieden steuert nur die Metall-Munition bei.

## 2. Die 12 Metall-Tiers (unsere Leiter)

| # | Tier | `*_bar` Item | Smelt-Lvl (ist) | Rarity | Bar-Wert (ist) |
|---|------|--------------|-----------------|--------|----------------|
| 1 | Copper | `copper_bar` | 1 | common | 8 |
| 2 | Bronze | `bronze_bar` | 5 | common | 12 |
| 3 | Iron | `iron_bar` | 10 | common | 16 |
| 4 | Steel | `steel_bar` | 20 | common | 30 |
| 5 | Blacksteel | `blacksteel_bar` | 30 | magic | 52 |
| 6 | Mithril | `mithril_bar` | 35 | magic | 70 |
| 7 | Adamantium | `adamantium_bar` | 45 | rare | 120 |
| 8 | Runite | `runite_bar` | 55 | rare | 160 |
| 9 | Bloodiron | `bloodiron_bar` | 65 | epic | 200 |
| 10 | Titanium | `titanium_bar` | 75 | epic | 260 |
| 11 | Aetherium | `aetherium_bar` | 85 | legendary | 340 |
| 12 | Godiron | `godiron_bar` | 95 | legendary | 480 |

> Smelt-Aktion existiert für **alle 12 Tiers**. Die Lücke ist nur das **Gear** je Tier.

## 3. Bestandsaufnahme — was existiert heute?

Aus `packages/content/src/index.ts` (Items + `forge_*`-Aktionen, Kategorie = `category`):

| Tier | Vorhandene geschmiedete Items (forge_*) | Vollständigkeit |
|------|------------------------------------------|-----------------|
| **Copper** | dagger, sword, mace, axe, warhammer, spear, 2haxe, 2hmace, medhelm, fullhelm, breastplate, legguards, gloves, boots, kiteshield, squareshield, arrowheads | **VOLL** (17, „Master-Vorlage") |
| **Bronze** | nur `bronze_sword` | **fast leer** (1) |
| **Iron** | dagger, sword, mace, axe, warhammer, spear, 2haxe, 2hmace, medhelm, fullhelm, breastplate, legguards, gloves, boots, kiteshield, squareshield, arrowheads | **VOLL** (17) |
| **Steel** | warblade, helm, body, arrowheads | Teilset (4) |
| **Blacksteel** | warblade, helm, legs, body | Teilset (4) |
| **Mithril** | blade, helm, body, legs, shield, arrowheads | 5-Set + Ammo (6) |
| **Adamantium** | blade, helm, body, legs, shield | 5-Set (5) |
| **Runite** | blade, helm, body, legs, shield, arrowheads | 5-Set + Ammo (6) |
| **Bloodiron** | blade, helm, body, legs, shield | 5-Set (5) |
| **Titanium** | blade, helm, body, legs, shield | 5-Set (5) |
| **Aetherium** | blade, helm, body, legs, shield | 5-Set (5) |
| **Godiron** | blade, helm, body, legs, shield | 5-Set (5) |

**Item-Schema** (aus `shared`): `slot` (helmet/body/legs/offhand/gloves/boots/mainhand…), `weaponStyle` (melee/ranged/magic), `twoHanded`, `bonus` (`meleeDamage`, `accuracy`, `defense`, `evasion`, `maxHp`, `critChance`, `critDamage`, `attackIntervalMs`), `modifiers` (Attribute), `requirements` (`attack`/`defence`-Level), `value`, optional `weaponEffect` (Status). Munition (Arrowheads) ist `type: "material"`, `stackable`, **kein** Gear (Input für Fletching-Pfeile).

## 4. Empfohlene EINHEITLICHE Tier-Palette (gilt für alle 12 Tiers)

Wir standardisieren auf die **Copper/Iron-Master-Vorlage** = **17 Items pro Tier**. Jedes Tier schmiedet exakt diese Typen, nur skaliert. Das macht die Smithing-Seite vorhersehbar (jede Kategorie sieht gleich aus) und stützt **Tier-Sets** (Set-Bonus ab `minPieces`).

### 4.1 Die 17 Item-Typen pro Tier

**Waffen (8) — alle `weaponStyle: "melee"`, `slot: "mainhand"`:**

| # | Typ | 2H? | Tempo-Nische (`attackIntervalMs`) | Stat-Charakter | Bar-Kosten | Attack-Lvl-Offset* |
|---|-----|-----|-----------------------------------|----------------|-----------|--------------------|
| 1 | **Dagger** | nein | sehr schnell (−500) | wenig Schaden, hohe `critChance` (~0.06), +accuracy | 1 | +0 |
| 2 | **Sword** | nein | normal (0) | ausgewogen, leicht +accuracy | 1 | +0 |
| 3 | **Mace** | nein | normal (0) | Schaden + etwas `defense` (Anti-Magie-Flavor) | 1 | +0 |
| 4 | **Axe** | nein | leicht langsam (+100) | hoher Schaden; zugleich `tool: woodcutting` (Doppelnutzen) | 2 | +0 |
| 5 | **Warhammer** | nein | langsam (+500) | hohe `accuracy`, hoher Schaden | 2 | +1 |
| 6 | **Spear** | **ja** | leicht langsam (+200) | +`evasion`, +accuracy, mittlerer Schaden | 2 | +1 |
| 7 | **Greataxe (2H)** | **ja** | sehr langsam (+900) | hoher Schaden, +`critDamage` (~0.4) | 3 | +2 |
| 8 | **Maul (2H)** | **ja** | extrem langsam (+1500) | höchster Einzel-Schaden, +`str`-Modifier | 3 | +2 |

\* Offset relativ zum **Tier-Basislevel** (siehe 4.3). Dagger/Sword/Mace = Basislevel; schwerere/2H-Stücke verlangen +1/+2.

**Rüstung (8):**

| # | Typ | Slot | Stat-Charakter | Bar-Kosten | Defence-Lvl-Offset |
|---|-----|------|----------------|-----------|--------------------|
| 9 | **Med Helm** | helmet | leicht: +defense, +maxHp | 1 | +0 |
| 10 | **Full Helm** | helmet | mehr defense/maxHp, klein +`attackIntervalMs` | 2 | +1 |
| 11 | **Platebody** | body | höchste defense + maxHp, +`attackIntervalMs` (träge) | 5 | +2 |
| 12 | **Platelegs** | legs | hohe defense + maxHp, +`attackIntervalMs` | 3 | +1 |
| 13 | **Gauntlets** | gloves | klein: +defense, +maxHp | 1 | +0 |
| 14 | **Sabatons (Boots)** | boots | klein: +defense, +maxHp | 1 | +0 |
| 15 | **Kiteshield** | offhand | defense + etwas `evasion` (mobiler) | 2 | +1 |
| 16 | **Square Shield** | offhand | mehr defense, +`attackIntervalMs` (träger Block) | 2 | +1 |

**Munition (1):**

| # | Typ | Item-Typ | Verwendung | Bar-Kosten | Smithing-Lvl-Offset |
|---|-----|----------|-----------|-----------|---------------------|
| 17 | **Arrowheads** | material/stackable | Input für Fletching → `*_arrows`; pro Bar 15 Stück | 1 | +0 |

> **Shield-Konvention:** OSRS unterscheidet Sq/Kite. Wir haben in `EquipSlot` nur **einen** `offhand`. Beide Shields belegen `offhand` und sind alternative Profile (Kite = mobiler/Evasion, Square = mehr Defense/träger). Beide bleiben in der Palette, weil sie sich im Stat-Profil sinnvoll unterscheiden.

### 4.2 Item-×-Tier-Matrix (was existiert ✓ / was neu wäre ✗)

Legende: **✓** existiert · **✗** neu · **~** als Variante vorhanden (Naming/Form weicht ab).

| Item-Typ \ Tier | Cu | Br | Fe | St | Bl | Mi | Ad | Ru | Bd | Ti | Ae | Go |
|-----------------|----|----|----|----|----|----|----|----|----|----|----|----|
| Dagger          | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Sword           | ✓  | ✓  | ✓  | ~  | ~  | ~  | ~  | ~  | ~  | ~  | ~  | ~  |
| Mace            | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Axe             | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Warhammer       | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Spear           | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Greataxe (2H)   | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Maul (2H)       | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Med Helm        | ✓  | ✗  | ✓  | ~  | ~  | ~  | ~  | ~  | ~  | ~  | ~  | ~  |
| Full Helm       | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Platebody       | ✓  | ✗  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  |
| Platelegs       | ✓  | ✗  | ✓  | ✗  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  |
| Gauntlets       | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Sabatons        | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Kiteshield      | ✓  | ✗  | ✓  | ✗  | ✗  | ~  | ~  | ~  | ~  | ~  | ~  | ~  |
| Square Shield   | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  | ✗  |
| Arrowheads      | ✓  | ✗  | ✓  | ✓  | ✗  | ✓  | ✗  | ✓  | ✗  | ✗  | ✗  | ✗  |

**Lesart der `~`-Spalten (Steel … Godiron):** Statt Dagger/Sword/Mace/Axe/… gibt es heute nur **eine** Sammelwaffe (`*_warblade` bzw. `*_blade`), **ein** Helm (`*_helm`), **ein** Body (`*_body`), **ein** Legs (`*_legs`), **ein** Shield (`*_shield`). Diese 5er-Sets decken die Slots ab, aber **nicht die Waffen-Vielfalt**. Konsistenz-Ziel: pro Tier auf 17 Items auffüllen.

### 4.3 Level- & Kosten-Staffel (OSRS-artig)

**Tier-Basislevel** = Smelt-Level des Tiers als Untergrenze; das schwerste Stück (Maul/Platebody) liegt etwas darüber. Konkrete Staffel pro Tier (abgeleitet aus den bestehenden Werten — Copper/Iron sind die Referenz, höhere Tiers folgen den vorhandenen `forge_*_blade`-Levels):

| Tier | Smelt-Lvl | Gear-Lvl-Spanne (leicht → schwer) | Beispiel-Bar-Kosten (Dagger / Sword / Body / Maul) |
|------|-----------|-----------------------------------|----------------------------------------------------|
| Copper | 1 | 1 – 4 | 1 / 1 / 5 / 3 |
| Bronze | 5 | 5 – 9 | 1 / 2 / 5 / 3 |
| Iron | 10 | 10 – 15 | 1 / 3 / 4 / 5 |
| Steel | 20 | 20 – 27 | 2 / 4 / 5 / 5 |
| Blacksteel | 30 | 30 – 37 | 2 / 4 / 5 / 5 |
| Mithril | 35 | 35 – 43 | 2 / 4 / 5 / 5 |
| Adamantium | 45 | 45 – 53 | 2 / 4 / 5 / 5 |
| Runite | 55 | 55 – 63 | 2 / 4 / 5 / 5 |
| Bloodiron | 65 | 65 – 73 | 3 / 4 / 5 / 6 |
| Titanium | 75 | 75 – 87 | 3 / 4 / 5 / 6 |
| Aetherium | 85 | 85 – 94 | 3 / 5 / 5 / 6 |
| Godiron | 95 | 100 – 105 | 4 / 5 / 6 / 6 |

> **Bar-Kosten-Regel (einheitlich pro Item-Typ, alle Tiers gleich):** Dagger/Mace/Gauntlets/Sabatons/MedHelm/Arrowheads = 1 Bar · Sword = 1–3 (steigt leicht mit Tier) · Axe/Warhammer/Spear/FullHelm/Kite/Square = 2 · Greataxe/Maul/Platelegs = 3 (oben 5) · Platebody = 5 (Godiron 6). Bei den höchsten Tiers (Bloodiron+) leicht angehoben, wie bereits in den bestehenden 5-Sets (Body = 5, Godiron Body = 6).

> **Smithing-XP** skaliert mit Tier (Copper Body 5 XP → Godiron Body 1350 XP, wie heute). Die neuen Items folgen der bereits etablierten XP-Progression ihres Tiers (proportional zu Bar-Zahl × Tier-Faktor).

## 5. Stat-Skalierung über die Tiers (Logik, keine Endzahlen)

Pro Item-Typ gilt **dasselbe relative Profil** in jedem Tier; nur die absoluten Zahlen wachsen mit dem Tier. Verankert an den vorhandenen Endpunkten Copper → Godiron:

- **Schaden (`meleeDamage`)** wächst grob exponentiell mit dem Tier (Copper Sword 5 → Godiron Blade 132). Relativ-Ordnung **innerhalb** eines Tiers bleibt fix:
  `Dagger < Sword ≈ Mace < Axe ≈ Warhammer ≈ Spear < Greataxe < Maul`.
- **Tempo (`attackIntervalMs`)** ist **tier-unabhängig** Teil des Waffen-Typs (Dagger −500 … Maul +1500 in jedem Tier). So bleibt die Waffenwahl in jedem Tier eine echte DPS-vs-Burst-Entscheidung.
- **Krit:** Dagger trägt `critChance` (~0.06), Greataxe trägt `critDamage` (~0.4) — in jedem Tier, ggf. leicht steigend.
- **Rüstung:** `defense` & `maxHp` skalieren mit Tier (Copper Body def 8/hp 20 → Godiron Body def 116/hp 290). Slot-Ordnung fix: `Body > Legs > FullHelm > Shield > MedHelm > Gauntlets ≈ Sabatons`. Schwere Teile behalten ihren `attackIntervalMs`-Malus.
- **Requirements:** `attack`-Level (Waffen) bzw. `defence`-Level (Rüstung) ≈ **Smithing-Smelt-Level des Tiers** (Tragen ≈ Herstellen), wie bei den vorhandenen Items (Godiron req attack/defence 105). Faustregel: Trage-Req ≈ Gear-Schmiede-Level.
- **Munition (`ammoDamage`)** der späteren Fletching-Pfeile skaliert mit dem Arrowhead-Tier (Tier-Schadensbonus pro Schuss).

> **Top-Tier-Sonderflavor (optional, Chef-Entscheidung):** Bloodiron/Aetherium/Godiron-Waffen dürfen einen `weaponEffect` (z. B. Godiron Blade = bleed) tragen — bereits im Bestand. Empfehlung: nur **eine** Signatur-Waffe pro Top-Tier mit Effekt, nicht alle 8, um Magie/Status nicht zu verwässern.

## 6. Set-Boni-Konsequenz

Tier-Sets (`ContentDB.sets`) gewähren ab `minPieces` getragener Teile einen Zusatzbonus (heute existiert `copper_set` mit 8 Rüstungsteilen, `minPieces: 5`). Mit der vollen 8-Rüstungs-Palette pro Tier kann **jedes** Tier ein eigenes Set bekommen (gleiche Struktur wie `copper_set`, skaliert). Das ist ein **Folge-Auftrag** (content-dev + balance-designer), kein Teil dieser Item-Liste — hier nur als Konsequenz vermerkt.

## 7. Umsetzungs-Lücken — konkrete Gap-Liste (für content-dev nach Freigabe)

Pro Tier die **fehlenden** Items, um auf die 17er-Vollpalette zu kommen:

- **Bronze (heute 1/17):** +16 Items (alles außer Sword) — größte Lücke, blockiert sonst die frühe Progression nach Copper.
- **Steel (4/17):** +Dagger, Mace, Axe, Warhammer, Spear, Greataxe, Maul, FullHelm (statt nur „helm" → med+full), Legs, Gauntlets, Sabatons, Kite, Square. (Bestehende `warblade`/`helm`/`body` ggf. als Sword/MedHelm/Platebody umetikettieren oder zusätzlich anbieten.)
- **Blacksteel (4/17):** +Dagger, Sword, Mace, Axe, Warhammer, Spear, Greataxe, Maul, MedHelm, FullHelm, Gauntlets, Sabatons, Kite, Square, Arrowheads.
- **Mithril/Adamantium/Runite/Bloodiron/Titanium/Aetherium/Godiron (5–6/17):** je +Dagger, Mace, Axe, Warhammer, Spear, Greataxe, Maul, MedHelm (vorh. `helm` → Full oder Med), FullHelm, Gauntlets, Sabatons, Square Shield (+Arrowheads, wo fehlend: Adamantium, Bloodiron, Titanium, Aetherium, Godiron).
- **Iron:** komplett ✓ (Referenz).
- **Copper:** komplett ✓ (Master-Vorlage).

**Naming-Hinweis:** Vorhandene 5-Set-IDs (`*_blade`, `*_warblade`, `*_helm`, `*_body`, `*_legs`, `*_shield`) **nicht umbenennen** (würde `SAVE_VERSION`-Bump + Migration auf bank/inventory/equipment erfordern). Stattdessen die neuen Items mit konsistenten neuen IDs (`<tier>_dagger`, `<tier>_sword`, `<tier>_medhelm`, …) ergänzen und die bestehenden IDs als die jeweilige Palette-Position weiterführen (z. B. `mithril_blade` = die „Sword"-Position; `mithril_shield` = „Kiteshield"). So bleiben alte Saves kompatibel.

## 8. Kern-Empfehlung (auf einen Blick)

**Jedes der 12 Tiers soll dieselben 17 Items schmieden können:**

> **8 Melee-Waffen:** Dagger (schnell/Crit) · Sword (ausgewogen) · Mace (+Def) · Axe (+Woodcutting-Tool) · Warhammer (langsam/Accuracy) · Spear (2H/+Evasion) · Greataxe (2H/+CritDmg) · Maul (2H/höchster Schaden).
> **8 Rüstung:** Med Helm · Full Helm · Platebody · Platelegs · Gauntlets · Sabatons · Kiteshield (mobil) · Square Shield (defensiv).
> **1 Munition:** Arrowheads (→ Fletching-Pfeile).

- Gleiche Bar-Kosten je Item-Typ über alle Tiers (Dagger 1 Bar … Platebody 5–6 Bars).
- Gleiches Stat-Profil je Item-Typ, absolute Werte skalieren mit Tier (verankert Copper → Godiron).
- Trage-Requirement ≈ Schmiede-Level des Items; Level-Spanne = Smelt-Level des Tiers … +~10.
- **Heute voll:** Copper, Iron. **Größte Lücke:** Bronze (nur Sword). **Mittlere Tiers** haben 5er-Rumpf-Sets → auf 17 auffüllen, ohne bestehende IDs umzubenennen (Save-Kompatibilität).

**Folge-Aufträge für den Chef zu routen:**
1. **content-dev:** Items + `forge_*`-Aktionen für die Gap-Liste (§7) ergänzen, IDs konsistent, bestehende IDs unangetastet.
2. **balance-designer:** konkrete Stat- & XP-Zahlen je neuem Item (verankert an Copper→Godiron-Endpunkten) + Tier-Set-Boni.
3. **asset-integrator (später):** Icons/PNGs für die neuen Item-IDs.

---

**Doc-Pfad:** `G:\GameDev\design\smithing-tier-items.md`
