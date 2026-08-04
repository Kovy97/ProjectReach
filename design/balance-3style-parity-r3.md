# Balance-Spec — 3-Stil-Parität, Runde 3 (R3)

**Autor:** Balance-Designer · **Datum:** 2026-06-28 · **Status:** definitive Umsetzungs-Spec (konservativ/konvergierend)
**Quelle:** Eigene Best-Craftable-DPS-optimal-Sim (temporäres Engine-Harness, nach Lauf entfernt; `packages/**` unverändert, `int·1.7` revertiert) + Re-Analyse von `design/qa/parity-r2-gegenprobe.md`.
**Zielband:** alle 3 Stile **0,90–1,10×** paarweise (Referenz **ranged = 1.00**) bei L10 / L30 / L55 / L99.
**Hinweis:** Diese Datei legt nur die **Zahlen** fest. Umsetzung durch content-dev (Revier je Hebel ausgewiesen). Keine Code-/Content-Änderung durch den Balance-Designer.

---

## 0) Kernbefund: Das R2-Gegenprobe-Bild ist ein Loadout-/Stichproben-Artefakt — die echte Lücke ist nur EINE

Ich habe die Parität mit einem **best-craftable, DPS-optimalen** Loadout-Selektor neu gemessen (pro Slot das höchste craftbare Teil; Waffe per analytischem DPS-Proxy aus dem craftbaren Pool; volle 1-h-Sims gegen je 6–8 on-level Mobs; per-Mob-Ratio gemittelt, ranged = 1.00; alle Kampf- **und** Pflicht-Crafting-Skills auf L inkl. passiver Attribute — Modus A der Gegenprobe). Ergebnis:

### Ist-Zustand (R2 umgesetzt, best-craftable gemessen)

| Checkpoint | Melee | Ranged | Magie | im Band? |
|---|--:|--:|--:|---|
| **L10** | 1.09 | 1.00 | **1.49** | ✗ Magie-Decke |
| **L30** | 0.91 | 1.00 | **1.49** | ✗ Magie-Decke |
| **L55** | 1.00 | 1.00 | **1.43** | ✗ Magie-Decke |
| **L99** | 1.00 | 1.00 | **1.26** | ✗ Magie-Decke |

**Das robuste, in BEIDEN Harnessen reproduzierte Urteil: Magie ist die Decke auf ALLEN Checkpoints. Ranged ist die saubere Referenz, Melee ist im Band.** Die in der Gegenprobe gemeldeten Sekundärbefunde (Ranged-L99-Decke, Melee-Boden 0.62, Magie-L99 überkorrigiert 0.70) **reproduzieren nicht** — sie sind Artefakte der dortigen Loadout-/Mob-Wahl. Zwei harte Belege:

1. **Magie-Endgame-Set falsch gewählt.** Die Gegenprobe maß Magie-L99 mit **voidweave** (dem R2-getrimmten Set). Das tatsächliche **best-craftable** Magie-Endgame ist **`godspark`** (Robe-Set, craftbar via leatherworking lvl 88–90, gewöhnliche Inputs) — **stärker als voidweave und von R2 NIE getrimmt** (magicDamage Σ106 + int-Mods Σ49 + critDamage 0.12 + Set-Bonus). Mit godspark ist Magie-L99 = **1.26** (Decke), nicht 0.70.
2. **L99-Mob-Stichprobe zu schmal.** Reproduziere ich die Gegenprobe mit **voidweave**, messe ich **x1.13** (nicht 0.70) — bei **identischer** Magie-Roh-dmg (440 ≈ ihr „~432"). Die Differenz steckt allein in der **Ranged-Referenz/Mob-Auswahl**: die Gegenprobe nutzte nur **2** on-level L99-Mobs (sie kennzeichnet die L99-Konfidenz selbst als „niedriger"). Absolute L99-Ratios sind dadurch hochvolatil; meine 6-Mob-Mittelung ist robuster.

→ **Konsequenz:** Es gibt **keine** Melee-Bodenkrise, **keine** Ranged-Decke und **keine** Magie-L99-Überkorrektur. Es gibt **eine** Lücke: die **Magie-Decke über alle Tiers**, getrieben vom ungetrimmten mid-Roben-/godspark-`magicDamage`-Backbone, den Spezial-Foki und dem `int`-Doppelstapel (Roben-int-Mods × `int·1.7`).

---

## 1) Die konvergierende Lösung (validiert) — EIN Hebelbündel, Revier nur content-dev

Eine **uniforme Magie-Gear-Normalisierung** (keine Logik-/Combat-Änderung nötig) bringt alle drei Stile auf allen vier Checkpoints ins Band — **ohne** Melee oder Ranged anzufassen:

| Magie-Gear-Klasse | Faktor auf `magicDamage` | Faktor auf Roben-`int`-Mods | Begründung |
|---|--:|--:|---|
| **Roben (alle Tiers)** | **×0.60** | **×0.34, abgerundet** | flat-Backbone + Doppelstapel sind der Haupttreiber; Abrunden killt die winzigen Früh-int-Mods (1/2) → kein Früh-Doppelstapel mehr, behält bei High-Tier ~⅓ int als Token |
| **Foki (alle, inkl. Spezial-Foki)** | **×0.50** | — | `frost_focus`/`aether_orb`/`void_focus`/`god_focus`/`godiron_focus` spiken mid/late am stärksten |
| **Wände & Stäbe (alle Tiers)** | **×0.80** | — | moderater Waffen-Trim, hält die Stil-Identität (Status-Effekte unangetastet) |
| **Roben-Set-Boni (`magicDamage`)** | **×0.60** | — | analog zum Teile-Trim |

Status-Effekte (frost/shock/burn auf Wänden/Stäben), Krit, maxMana, manaRegen, `wis`-Mods, Evasion/Def der Roben bleiben **unberührt** — die Magie-Identität (Mana/Status) bleibt voll erhalten; nur der Roh-Schadensüberschuss verschwindet.

### Validierung — Vorher/Nachher (best-craftable, ranged = 1.00)

| Checkpoint | Melee | Ranged | **Magie vorher** | **Magie nachher** | Magie-Roh-dmg vorher→nachher |
|---|--:|--:|--:|--:|--:|
| **L10** | 1.09 | 1.00 | 1.49 | **1.04** | 67 → 41 |
| **L30** | 0.91 | 1.00 | 1.49 | **0.99** | 159 → 108 |
| **L55** | 1.00 | 1.00 | 1.43 | **1.09** | 275 → 191 |
| **L99** | 1.00 | 1.00 | 1.26 | **0.96** | 505 → 356 |

**Nachher-Band:** Melee 0.91–1.09 · Ranged 1.00 · Magie 0.96–1.09 → **alle 12 Stil×Checkpoint-Werte im Band 0,90–1,10.** Magie-Roh-dmg nachher clustert sauber mit Ranged (L99 346+Munition) und Melee (L99 396).

---

## 2) Antwort auf die 5 Aufgaben-Hebel (ehrlich, je mit Daten)

**Hebel 1 — Attribut-Asymmetrie str vs. dex (vermutete L99-Ursache): KEINE Änderung empfohlen.**
Die Asymmetrie ist real — `dex` speist 5 Werte (`rangedDamage` ·1.2, `critChance` ·0.2, `attackIntervalMs` −·20, `evasion` ·1, `accuracy` ·3), `str` nur `meleeDamage` ·1.5. **Aber** in der best-craftable-DPS-optimalen Messung ist Melee **bereits auf Parität** (0.91–1.09). `str` breiter wirken zu lassen würde Melee **über** die getrimmte Magie heben (L10 Melee schon 1.09) → Überkorrektur. Der gemeldete Melee-Boden 0.62 entstand durch eine **suboptimale (langsame) Waffenwahl** in der Gegenprobe; der DPS-optimale Build wählt die schnelle Klinge (godiron_dagger/scimitar) → Melee 1.00. **Empfehlung: Attribut-Hebel unverändert lassen.** (Optionale `str→meleeDamage`-Symmetrie ist höchstens ein kosmetischer Fairness-Fix für reine Melee-Mains ohne Nebenskills — **kein** Balance-Bedarf, nicht in R3.)

**Hebel 2 — Ranged-L99-Decke: KEINE Dämpfung empfohlen.**
Reproduziert nicht. Ranged ist die **saubere Referenz** (= 1.00) und liegt nach dem Magie-Trim genau zwischen Melee (1.00) und Magie (0.96). `ammoDamage`-Top-Tiers oder das Ranged-Intervall zu senken würde Ranged **unter** das Band drücken (Melee/Magie lägen dann ~1.04–1.09× über Ranged). **Empfehlung: `ammoDamage` und Ranged-Intervall unverändert lassen.**

**Hebel 3 — Magie mid (L30/L55): GELÖST durch §1.** L30 1.49→0.99, L55 1.43→1.09. Treiber waren mid-Roben-`magicDamage` (frost/ember/aether) + `frost_focus`/`aether_orb` + int-Doppelstapel — alle vom uniformen Trim erfasst.

**Hebel 4 — Magie L99 „überkorrigiert 0.70": FALSCHE Prämisse — NICHT zurückgeben.**
Mit dem echten best-craftable Set (godspark) ist Magie-L99 = **1.26 (Decke)**, nicht 0.70. Etwas zurückzugeben (voidweave hoch / Mana-Schild milder) wäre **genau verkehrt**. Der R3-Trim normalisiert godspark (das R2 übersehen hat) und landet L99 bei **0.96** — im Band, ohne Boden.

**Hebel 5 — Melee-Boden allgemein: KEINE Änderung empfohlen.** Melee ist im Band (0.91–1.09). L30 = 0.91 ist der untere Rand → **beobachten**, aber kein Eingriff (ein Melee-Schub würde nach dem Magie-Trim L30-Melee gegen die anderen kippen). Falls ein späterer Sweep L30-Melee unter 0.90 misst: minimaler Per-Hit-Flat auf mid-Platte, **nicht** Intervall (Intervall ist via Dolch-Wahl schon optimal).

---

## 3) Konkrete Soll-Werte (content-dev, `packages/content/src/index.ts`)

**Regel (autoritativ):** Auf **ALLE** Magie-Roben-, Foki- und Wand/Stab-Tiers anwenden (auch die hier nicht namentlich gelisteten Zwischen-Tiers — copper..godiron Foki, steel/mithril/runite/bloodiron/titanium Wände/Stäbe, arcane/runewoven/void Roben), damit die Skalierung glatt bleibt. Faktoren: Roben-`magicDamage` ×0.60, Roben-`int`-Mods ×0.34 **abgerundet**, Foki-`magicDamage` ×0.50, Wand/Stab-`magicDamage` ×0.80, Roben-Set-`magicDamage` ×0.60. `wis`-Mods, Krit, maxMana, Evasion, Status-Effekte **unverändert**.

### 3a) Roben — `magicDamage` (×0.60) / `int`-Mod (×0.34 abgerundet) pro Teil (Helm/Body/Legs/Gloves/Boots)

| Set (≈Checkpoint) | magicDamage vorher → **nachher** | int-Mod vorher → **nachher** |
|---|---|---|
| apprentice (L1–10) | 0/0/0/0/0 (keine) | 2/3/2/1/1 → **0/1/0/0/0** |
| frost (L20–30) | 4/8/5/5/4 → **2/5/3/3/2** | 4/5/3/3/2 → **1/1/1/1/0** |
| ember (≈L30) | 6/12/8/6/5 → **4/7/5/4/3** | 5/7/4/4/3 → **1/2/1/1/1** |
| aether (L40–55) | 9/16/11/10/10 → **5/10/7/6/6** | 6/8/5/5/4 → **2/2/1/1/1** |
| voidweave (L80er, sekundär) | 16/28/18/17/17 → **10/17/11/10/10** | 6/7/3/2/2 → **2/2/1/0/0** |
| **godspark (L85–99, L99-Treiber)** | 18/30/20/19/19 → **11/18/12/11/11** | 10/14/9/9/7 → **3/4/3/3/2** |

*(arcane/runewoven liegen zwischen aether und godspark — gleiche Faktoren anwenden.)*

### 3b) Foki — `magicDamage` ×0.50

| Fokus | vorher → **nachher** |
|---|---|
| dim_focus | 10 → **5** |
| frost_focus | 16 → **8** |
| aether_orb | 24 → **12** |
| void_focus | 32 → **16** |
| god_focus | 42 → **21** |
| godiron_focus | 40 → **20** |
| (copper..titanium/aetherium Tier-Foki) | je **×0.50** |

### 3c) Wände & Stäbe — `magicDamage` ×0.80 (Status-Effekte/accuracy/manaCost unverändert)

| Waffe | vorher → **nachher** |
|---|---|
| iron_wand | 8 → **6** |
| steel_wand | 11 → **9** |
| blacksteel_wand | 15 → **12** |
| mithril_wand | 21 → **17** |
| adamantium_wand | 26 → **21** |
| runite_wand | 33 → **26** |
| aetherium_wand | 59 → **47** |
| godiron_wand | 73 → **58** |
| frost_scepter / aether_runestaff | 22 → **18** / 34 → **27** |
| (bloodiron/titanium Wände + alle Stab-Tiers) | je **×0.80** |

### 3d) Roben-Set-Boni — `magicDamage` ×0.60 (übrige Bonus-Felder unverändert)

| Set | vorher → **nachher** |
|---|---|
| frost_robe_set | 10 → **6** |
| ember_robe_set | 14 → **8** |
| aether_robe_set | 18 → **11** |
| arcane_robe_set | 22 → **13** |
| runewoven_robe_set | 26 → **16** |
| voidweave_set | 22 → **13** |
| godspark_vestment_set | 28 → **17** (critDamage 0.15 **bleibt**) |

---

## 4) Geordnete Apply-Liste (content-dev)

1. **godspark-Set** (L99-Treiber) wie §3a + Set-Bonus §3d — höchste Priorität, schließt L99.
2. **aether-Robe + `aether_orb` + adamantium_wand** (§3a/3b/3c) — schließt L55.
3. **frost-/ember-Robe + `frost_focus` + blacksteel_wand** (§3a/3b/3c) — schließt L30.
4. **apprentice-Robe int-Mods + dim_focus + iron_wand** (§3a/3b/3c) — schließt L10.
5. **Alle übrigen Magie-Tiers** (Zwischen-Wände/Stäbe/Foki/Roben + arcane/runewoven/void/voidweave) per Regel §3 — Glättung.
6. **Set-Boni** aller Magie-Sets §3d.
7. **Nichts** an Melee-, Ranged-, Logic- oder Combat-Werten ändern (§2).

**Validierungsreihenfolge:** 1→2→3→4 deckt die vier Checkpoints; nach jedem Schritt der nächste Sweep sollte den jeweiligen Checkpoint bei Magie ≤1,10 / ≥0,90 sehen.

---

## 5) Erwartetes Ergebnis (Prognose-Tabelle)

| Checkpoint | Melee | Ranged | Magie | im Band 0,90–1,10? |
|---|--:|--:|--:|---|
| **L10** | 1.09 | 1.00 | **1.04** | ✓ |
| **L30** | 0.91 | 1.00 | **0.99** | ✓ |
| **L55** | 1.00 | 1.00 | **1.09** | ✓ |
| **L99** | 1.00 | 1.00 | **0.96** | ✓ |

Identitäten bleiben: Melee = raw/Tank (schnelle Klinge + Platte), Ranged = Krit+Tempo+Munitions-Flat (Referenz), Magie = Mana/Status (Status-Effekte, Krit, Mana voll erhalten — nur Roh-Schadens-Decke entfernt). Kein RPS-Dreieck berührt.

---

## Anhang — Methodik & Konfidenz

- **Harness:** temporäres Engine-Test-Skript; best-craftable Loadout pro Slot (Fitness-Score je Stil) + Waffe per analytischem DPS-Proxy aus dem craftbaren Pool; volle 1-h-Sims über 6–8 on-level Mobs (±8 Lvl), per-Mob-Ratio gemittelt (cancelt Einzel-Mob-HP-Sensitivität); cooked_voidray Auto-Eat für alle → 0 Tode → Faktoren = effektive **Offense**. Modus A (alle Kampf-Skills = L + Pflicht-Crafts inkl. passiver Attribute). Trims über geklontes Content getestet (`structuredClone`), **kein** Spiel-Code geändert; `int·1.7` nach Test revertiert, Harness entfernt.
- **Konfidenz:** L10/L30/L55 hoch (6–8 Mobs, beide Harnesse stimmen in der Richtung „Magie-Decke"). L99 mittel (6 Mobs; absolute Ratios mob-sensitiv — die Gegenprobe-2-Mob-Stichprobe ist die Hauptquelle der L99-Divergenz). Der R3-Trim ist **konservativ konvergierend** (er senkt nur die Decke, hebt nichts an) → robust gegen Stichproben-Rauschen.
- **Incidental (P2, nicht R3, anderes Revier):** `packages/engine/src/sim.ts` `GEARED_HERO` rüstet nicht existierende IDs aus (`godiron_blade/_helm/_body/_legs/_shield` statt `godiron_sword/_fullhelm/_platebody/_platelegs/_kiteshield`) → der „geared"-Held der `pnpm test`-Garde kämpft faktisch ohne Waffe/Rüstung. Untergräbt die Endgame-Wall-Garde; logic/content via CEO korrigieren lassen.
