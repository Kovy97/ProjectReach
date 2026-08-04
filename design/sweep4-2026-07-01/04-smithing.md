# Sweep 4 — 04 Smithing (L1→99 Deep-Dive + Note)

**Agent:** Kontrolleur (QA)  **Datum:** 2026-07-01  **Methode:** headless SimPlayer, echte Engine-Aktionen (smelt/forge via `setActiveAction`+`advance`), Ore/Coal via `state.bank`-Flood, `autoBank`. Test-Skript `smithing-sweep.test.ts` angelegt, ausgeführt (7/7 grün), wieder gelöscht. Repo clean.

**NOTE: B** — Tiefes, sauber verdrahtetes Verarbeitungs-Skill (14 Smelt-Tiers, ~19 Gear-Items je Tier, 250+ Aktionen), exploit-frei, kein Combat-Gate, spürbare Mastery, Pet dropbar. Mittleres→spätes Band exzellent. Gebremst durch einen flachen/fallenreichen Einstieg (Bronze/Eisen langsamer als Kupfer), eine kosmetische Barren-Wert-Inversion und die Füller-Stufe Blacksteel.

---

## 1. XP/h-Kurve L1→99

**Smelt-Leiter (Basis, Mastery L1, keine Boni) — empirisch bestätigt (±<1%):**

| Aktion | Lvl | Dauer | XP | XP/h | Input |
|---|---|---|---|---|---|
| smelt_copper | 1 | 2600 | 2 | **2769** | 1 copper_ore |
| smelt_bronze | 5 | 3000 | 2 | 2400 ⬇ | 1 copper+1 tin |
| smelt_iron | 10 | 3200 | 2 | 2250 ⬇ | 1 iron_ore |
| smelt_steel | 20 | 4500 | 4 | 3200 | 1 iron+1 coal |
| smelt_gravesteel | 22 | 4800 | 5 | 3750 | 1 gravesteel+1 coal |
| smelt_blacksteel | 30 | 6000 | 7 | 4200* | **1 steel_bar**+2 coal |
| smelt_mithril | 35 | 6500 | 10 | 5538 | 2 mithril+2 coal |
| smelt_adamantium | 45 | 7500 | 19 | 9120 | 2 adamantite+3 coal |
| smelt_runite | 55 | 8500 | 36 | 15247 | 2 runite+3 coal |
| smelt_murkvein | 62 | 5500 | 37 | 24218 | 2 murkvein+3 coal |
| smelt_bloodiron | 65 | 9000 | 62 | 24800 | 2 bloodiron+4 coal |
| smelt_titanium | 75 | 9500 | 110 | 41684 | 2 titanium+4 coal |
| smelt_aetherium | 85 | 10500 | 195 | 66857 | 2 aetherite+5 coal |
| smelt_godiron | 95 | 12000 | 365 | 109500 | 2 godiron+5 coal |

\* Blacksteel-Face 4200, aber Alloy aus **steel_bar** → effektiv ~3771/h wenn man das Stahl-Schmelzen mitrechnet.

**Beste verfügbare Aktion je Level-Band (Optimalpfad):** monoton nicht-fallend —
`copper(2769) → steel(L20 3200) → gravesteel(L22 3750) → blacksteel(L30 4200) → mithril(L35 5538) → adamantium(L45 9120) → runite(L55 15247) → murkvein(L62 24218) → bloodiron(L65 24800) → titanium(L75 41684) → aetherium(L85 66857) → godiron(L95 109500)`.

**Auf der Level-LINIE keine Regression** — Kupfer dominiert bis L20, danach steigt jede Stufe. **Aber:** die zwei frühesten *neuen* Unlocks (Bronze L5, Eisen L10) sind **strikt langsamer als Kupfer** → wer instinktiv „die nächste Stufe schmelzt", trainiert langsamer. Das ist die von Sweep3 gemeldete Smelt-Bar-Regression, **weiterhin present am unteren Ende** (Kupfers Bump 1→2 hat den Abstand sogar vergrößert). `confirmed`.

**Greedy-L1→99-Run (echte Engine, seed 42, inkl. Mastery-Speedup):**
```
t=  2h L22   t=  9h L40   t= 25h L55   t= 50h L70   t=133h L90
t=  4h L29   t= 18h L50   t= 32h L60   t= 82h L80   t=174h L95
t=  6h L34   ...          t= 40h L65   t=107h L85   t=206h L99
```
**~206 aktive Spielstunden bis 99** (Best-Smelt-Pfad, ~8,6 Tage). xpForLevel(99)=13.034.431. Idle-typisch; kein Wall.

## 2. Freischalt-Takt
- **Ab L20 sehr gut:** neue beste Aktion alle 5–13 Level; zusätzlich pro Tier eine volle Forge-Linie (Waffen+Rüstung+Pfeilspitzen) → immer „etwas Neues zum Bauen".
- **L1–19 flach:** nur Kupfer lohnt; Bronze/Eisen sind XP-Fallen. In absoluter Zeit nur ~1,6 h, daher mild — aber die erste Stunde bietet keine echte Progressions-Variante.

## 3. Werkzeug/Upgrade-Progression
- **Smithing hat KEIN Tempo-Werkzeug.** Alle Sammel-Skills haben eine Tool-Leiter (Spitzhacke/Rute/Axt/Sichel); Smithing nicht. Upgrade-Achse = Tier-Materialien + Mastery. Konsistent mit anderen Verarbeitungs-Skills (kein Bug), aber der einzige frühe Tempo-Hebel ist Mastery.
- **Hinweis:** `emberforge_hammer` existiert, ist aber eine **Nahkampf-Waffe** (mace, `weaponEffect: burn`), KEIN Smithing-Tool — potenziell verwirrend für Spieler, die einen „Schmiedehammer" erwarten. `confirmed`, P3.

## 4. Drops + Skill-Pet
- **slagfiend** (`source: {kind:"skill", skill:"smithing"}`, `dropChance 1/85000` pro Aktion). Empirisch bestätigt: 25 Drops / 2.000.000 Smelts = 1,25e-5 ✓. Effekt `refundMaterial 5%` ist **korrekt verdrahtet** (`petPreserveBonus` → tick.ts `completeAction`). Über den echten Pfad dropbar (~61 h Kupfer/Pet; über einen L1→99-Run praktisch sicher). `confirmed`.
- **Bonus-Drops:** Mastery-Doppelertrag (bis +50% Chance auf 2× Barren/Gear), Pool-Checkpoints. Sinnvoll.
- **Cross-Skill:** alle 11 `*_arrowheads`-Outputs werden von Fletching als Input konsumiert — **keine verwaisten Smithing-Outputs**. `confirmed`.

## 5. Gold/Ökonomie
- Verkauf = **0,5 × value**. **Keine Erze/Barren im Shop kaufbar** → **kein Smelt-and-Sell-Exploit**. Exploit-frei. `confirmed`.
- Smithing ist **kein Gold-Farm**, sondern Gear-Produktion (equippen + WoW-Suffix-Rolls + Salvage). Kupfer-Barren ≈ 4 g/Stück verkauft; Erz kommt gratis aus Mining.
- **Anomalie (P3):** ab Mithril **invertiert der Barren-Nennwert gegen die Input-Werte** — mithril_bar 70 < Inputs 72; runite/murkvein/bloodiron/titanium/aetherium alle negativ. Nur kosmetisch (Erz wird nicht ge-/verkauft), liest sich aber als „Schmelzen vernichtet Wert". 

## 6. Mastery
- Pro Aktion: Speed bis −15% (M99), Preserve bis +40%, Doppelertrag bis +50%. Gemessen: **gemeistertes Kupfer = +27,4% XP/h** (3528 vs 2769). Spürbar.
- Pool (skillweit, Ref-Level 20): Checkpoints 5/25/50/95% → +double/+speed/+preserve. Guter Langzeit-Anker.

## 7. Feel / „lohnt es sich?"
Ja. Breit, tief, funktional; nach L20 ein befriedigender Tier-Rhythmus mit echtem Mastery-Payoff und einem verdrahteten Pet. Reibung: der flache Einstieg mit zwei Trap-Unlocks (Bronze/Eisen < Kupfer), die kosmetische Wert-Inversion, und Blacksteel als quasi wertloser Füller.

---

## TOP-3 FINDINGS
1. **[P3][balance] Smelt-Bar-Regression unten** (`confirmed`): Bronze L5 (2400) & Eisen L10 (2250) langsamer als Kupfer L1 (2769). `content/src/index.ts:5759, 6400` vs `:5636`. Owner: **content-dev**.
2. **[P3][feel] Blacksteel-Füller** (`confirmed`): Alloy aus `steel_bar` → real ~3771/h, kaum über Gravesteel (3750, Roherz, 8 Level früher). `index.ts:6484-6496`. Owner: **content-dev**.
3. **[P3][balance] Barren-Wert-Inversion ab Mithril** (`confirmed`): bar value < Σ Input-value (mithril 70<72 … aetherium 340<350). `index.ts` item values. Owner: **content-dev**.

## TOP-3 VERBESSERUNGEN (Soll-Zahlen)
1. **Bronze xp 2→3 (→3600/h), Eisen xp 2→3 (→3375/h)** — killt die Low-End-Regression; jede neue Stufe wird ein echter (kleiner) XP-Schritt über Kupfer. Belebt zugleich L1–19.
2. **Barren-Werte fixen: bar.value ≥ Σ(Input-values)×~1,3** (v.a. Mithril→Aetherium) — Nennwert-Inversion weg.
3. **Blacksteel reparieren:** entweder aus Roherz (`blacksteel_ore`) schmelzen ODER xp 7→9, damit die Zwei-Stufen-Kette (Stahl→Blacksteel) sich lohnt und L30–34 eine Existenzberechtigung bekommt.

## Bestätigt (nicht als neu melden)
- „Smelt-Aktion je Tier vorne" — **umgesetzt** (`SkillPage.tsx:60 smithingOrderKey` → `*_bar`=0, ganz oben).
- murkvein-XP-Fix (26→37) present, jetzt echter Upgrade über runite.
- Pet über echten Pfad dropbar; kein Combat-Gate (alle 14 Inputs minebar); exploit-frei.

**Empfehlung:** ship — die 3 P3-Balance-Nits sind polish, kein Blocker.
