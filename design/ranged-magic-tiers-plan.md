# Ranged- & Magie-Tier-Leitern — Grobe Übersicht (high-level)

**Autor:** Balance-Designer · **Datum:** 2026-06-26 · **Status:** Reine Planung/Design — KEIN Code, KEINE Content-Änderung. Vorlage für Chef-Freigabe, danach content-dev.
**Vorlage:** `design/smithing-stats-spec.md` (12-Tier-Metall-Leiter, 20 Typen). Diese Leitern spiegeln deren **Level-Anker** und **Progressions-Tempo**, damit Melee / Ranged / Magie paritätisch denselben Level-Bereich (1→100/105) erreichen.
**Querverweis (nur erwähnt, eigene Docs):** Magie-Waffen-Mechanik (Mana/Status-Zauber) = *Magie-System-Plan*. Runen/Verzauberungs-Effekte = *Runen-Plan*. Beide existieren noch nicht — hier nur die **Tier-/Stat-Leiter**, nicht die Mechanik.

---

## 0. Gemeinsamer Level-Anker (Parität zu Smithing)

Alle drei Stile teilen dieselben 12 Tier-Level wie die Smithing-Leiter:

| # | Tier-Lvl-Anker | 1 | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100/105 |
|---|---|--|--|--|--|--|--|--|--|--|--|--|--|
| | **`D`-Index (Melee-Sword-mDmg)** | 5 | 8 | 14 | 20 | 28 | 38 | 48 | 60 | 74 | 90 | 108 | 132 |

`D` ist der Anker-Schaden-Index aus der Smithing-Spec (×≈1,35/Tier). Ranged & Magie skalieren als **Faktoren von `D`**, mit Stil-Identität (Ranged etwas niedriger Roh + crit/speed/evasion + Munitions-Bonus obendrauf; Magie etwas niedriger Roh + Status-DoT/Mana).

**Trage-Req** = Tier-Lvl-Anker (Waffe: `ranged` bzw. `magic_off`). **Craft-Req** = Tier-Lvl-Anker **+5** (Fletching bzw. Runecrafting), analog zum heutigen Bestand (z.B. Ashbark: ranged 20 / fletching 25; Frost-Fokus: magic 22 / rune 25).

---

## 1. RANGED — Bogen-/Armbrust-Leiter + Munition

**Quelle:** **Fletching** schnitzt die Waffe aus Holz (Logs aus Woodcutting + `bowstring`). **Smithing** liefert Metall-Munition (`*_arrowheads`, alle 12 Tiers existieren). **Fletching** montiert daraus Pfeile/Bolzen (Shaft + Arrowhead → Arrow/Bolt). Keine neue Skill — Fletching trägt die ganze Linie, Smithing nur die Spitzen.

### 1.1 Bestand (heute, ad-hoc)
- Bögen sind **holz-thematisch** (~9 Stück: grimoak, ashbark L25, blackthorn L18, composite L40, ironbark L45, runed L60, shadowpine L65, bonewood L80, godwood L88) — `rangedDamage` 6→116, kein sauberer 12-Rung-Ladder, Level unregelmäßig.
- **Pfeile nur 5 Tiers** (copper 1, iron 2→ammo5, steel 4, mithril 7, runite 11) — obwohl **Arrowheads für alle 12 Tiers** existieren (ammoDamage 2→42). **→ Größte Ranged-Lücke: Munition hinkt 7 Tiers hinterher.** Top-Bögen schießen heute mit Runit-Pfeil (ammo 11) statt Godiron-Spitze (42).
- Keine Armbrüste / Bolzen.

### 1.2 Empfohlene Bogen-Archetypen (gelten in **jedem** der 12 Tiers)
Analog zur Melee-Tempo-Leiter (schnell/niedrig-Roh ↔ langsam/hoch-Roh). Munitions-`ammoDamage` addiert sich pro Schuss auf den `rangedDamage` der Waffe.

| Archetyp | Slot | `rangedDamage` (×D) | aIMs (tier-fix) | Sonder | Identität |
|---|---|---:|---:|---|---|
| **Shortbow** | mainhand | `0.60·D` | **−400** | +`critChance` (.06→.10) | schnellster, niedrigster Roh, DEX-Burst |
| **Longbow** | mainhand | `0.78·D` | **0** | — | Baseline-Bogen |
| **Crossbow** | mainhand | `0.95·D` | **+300** | +`critDamage`, hohe `accuracy`, nutzt **Bolzen** | langsam, schwer, präzise |
| **Greatbow (2H)** | mainhand 2H | `1.12·D` | **+600** | höchster Roh, +`critDamage` | Top-Burst-Option |

> **DPS-Parität (Ranged ↔ Melee):** effektiver Schuss ≈ `rangedDamage + ammoDamage`. Mit Longbow `0.78·D` + Arrowhead `0.32·D` ≈ **1,10·D** pro Schuss — minimal über Sword-`D`, gerechtfertigt durch Munitionsverbrauch (laufende Kosten) und fehlende Lifesteal/Rohwucht. Ranged tauscht Rohschaden gegen **crit + Tempo (negatives aIMs) + evasion**.

### 1.3 Munitions-Leiter (Pfeile **und** Bolzen, 12 Tiers)
`ammoDamage` = übernimmt die **bereits gelockte Arrowhead-Kurve** aus der Smithing-Spec §4.20.

| Tier-Lvl | 1 | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100 |
|---|--|--|--|--|--|--|--|--|--|--|--|--|
| `ammoDamage` (= `0.32·D`) | 2 | 3 | 5 | 7 | 9 | 12 | 15 | 19 | 24 | 29 | 35 | 42 |

- **Pfeile (Bows):** `*_arrow` — Fletching aus `shaft` + `*_arrowheads` (+ ggf. `feather`). **Auf alle 12 Tiers auffüllen** (heute nur 5). `ammoDamage`-Kurve wie oben.
- **Bolzen (Crossbow):** `*_bolt` — neue Linie, 12 Tiers, gleiche `ammoDamage`-Kurve, aus `*_arrowheads` + `bolt_shaft` (oder Reuse Shaft). Bolzen können +`critDamage`-Flavor tragen (Armbrust-Identität).
- Holz-Tier-Bindung: Bögen aus Logs (Woodcutting hat 9 Log-Tiers → für 12 Bogen-Rungs entweder 3 Logs ergänzen ODER untere Logs für mehrere frühe Tiers teilen; **Finetuning später**).

---

## 2. MAGIE — Stab-/Wand-Leiter + Zauber

**Quelle-Empfehlung: Runecrafting bleibt die EINZIGE Magie-Craft-Skill — KEINE separate „Inscription".** Runecrafting existiert bereits und verzaubert heute Stäbe/Foki/Roben (Essenz → Rune → `enchant_*`). Eine zweite Skill würde nur splitten. (Falls der Chef später „Inscription" als Flavor-Rename von Runecrafting will, ist das ein reiner Namens-Entscheid, keine Mechanik.) Optional **Drop-Quelle** für 1 Signatur-Stab pro Top-Tier (Bloodiron+) als Prestige-Belohnung — Crafting bleibt der Haupt-Pfad.

### 2.1 Bestand (heute, ad-hoc)
- Stäbe (mainhand, mit eingebautem `weaponEffect`/Status): gnarled(6), bramble(28), frost(22/frost), aether_runestaff(34/burn), stormcaller_rod(46/shock L50), voidcaller(60/shock L70), godspark(78/burn L88). `magicDamage` 6→78.
- Foki (offhand, reiner `magicDamage`): dim(10), frost(16), aether_orb(24), void(32), god(42).
- **Quell-Material sehr dünn: nur 3 Essenz-Tiers (dim/frost/aether) + 3 Runen (frost/aether/void)** für eine 12-Tier-Leiter. **→ Größte Magie-Lücke: Essenz-/Runen-Leiter muss auf ~6+ Tiers wachsen, sonst kein glatter Ladder.**

### 2.2 Empfohlene Magie-Archetypen (in **jedem** der 12 Tiers)

| Archetyp | Slot | `magicDamage` (×D) | aIMs | Zauber/Status | Identität |
|---|---|---:|---:|---|---|
| **Wand** | mainhand 1H | `0.55·D` | **−300** | leichter Status, paart mit Focus-Offhand | schnell, niedrig Roh, Focus-Synergie |
| **Staff** | mainhand (2H-Gefühl) | `0.85·D` | **0** | **eingebauter `weaponEffect`** (Status-DoT, steigt je Tier) | Haupt-Magie-Waffe |
| **Focus** | offhand | `+0.30·D` (`magicDamage`) | — | +Mana/maxHp/critChance (high) | Wand-Begleiter, kein Offhand für Staff |

> **DPS-Parität (Magie ↔ Melee):** Staff-Roh `0.85·D` liegt bewusst unter Sword-`D`; die Differenz holt der **Status-DoT** (burn/shock) + **Mana-Sustain** wieder rein. Effektiv ≈ `D`. Wand+Focus = `0.55·D + 0.30·D = 0.85·D` Roh + Status, gleiche Klasse wie Staff, nur als 1H+Offhand-Variante (mehr Mana/Defense statt Roh).

### 2.3 Zauber-/Status-Eskalation je Tier (grob, Detail = Magie-System-Plan)
- **T1–3 (Lvl 1–10):** kleiner Frost-Slow / schwacher Burn (magnitude niedrig).
- **T4–6 (Lvl 20–40):** Frost → Burn-DoT (mittlere magnitude/Dauer).
- **T7–9 (Lvl 50–70):** Shock (accuracy/speed-Debuff) / stärkerer Burn, +`critChance`.
- **T10–12 (Lvl 80–100):** Void/Signatur-Effekt, höchster DoT, +`critChance`/`critDamage`.
- Status-`magnitude` & `chance` skalieren mit Tier; konkrete Werte im Magie-System-Plan (Mana-Kosten, Stack-Regeln). Hier nur: **je Tier stärker, monoton, kein Cliff** — wie bei Smithing.

### 2.4 `magicDamage`-Leiter (grob)
| Tier-Lvl | 1 | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100 |
|---|--|--|--|--|--|--|--|--|--|--|--|--|
| Staff (`0.85·D`) | 4 | 7 | 12 | 17 | 24 | 32 | 41 | 51 | 63 | 77 | 92 | 112 |
| Wand (`0.55·D`) | 3 | 4 | 8 | 11 | 15 | 21 | 26 | 33 | 41 | 50 | 59 | 73 |
| Focus offhand (`+0.30·D`) | 2 | 2 | 4 | 6 | 8 | 11 | 14 | 18 | 22 | 27 | 32 | 40 |

---

## 3. XP-/Level-Staffel (Parität-Tempo)

- **Craft-XP** (Fletching-Bögen, Runecrafting-Stäbe) folgt demselben Tempo wie die Smithing-`forge_*`-XP-Kurve pro Tier (Anker `Sword-xp@Basis`: 3 · 5 · 6 · 15 · 28 · 36 · 68 · 128 · 240 · 555 · 870 · 1690). Schwerere/teurere Stücke (Greatbow, Staff) ≈ 1,5–2,5× den Tier-Anker, leichte (Shortbow, Wand, Munition) ≈ 0,5×. Konkret = Folge-Finetuning.
- **Action-`durationMs`** wie bei Smithing nach Schwere skalieren (Munition kurz ~3–6 s, Waffen 6–22 s, steigend je Tier).
- **Munitions-`xp`** (Pfeile/Bolzen) ≈ Arrowhead-XP-Kurve (2→365) gespiegelt — verhindert XP-Cliffs im Fletching gegenüber Smithing.

---

## 4. Parität-Kontrolle (Melee ↔ Ranged ↔ Magie)

- **Gleicher Level-Bereich:** alle drei laufen über dieselben 12 Anker 1→100/105. Top-Waffe jeder Linie verlangt Lvl 100 (Craft) / 105 (Trage), wie Godiron.
- **Effektive DPS vergleichbar, Identität verschieden:**
  - **Melee** = roher `D` + Lifesteal/Rohwucht (Smithing).
  - **Ranged** = `~0.78·D` Bogen + `0.32·D` Munition + crit/Tempo/evasion (Fletching + Smithing-Spitzen).
  - **Magie** = `~0.85·D` Stab + Status-DoT + Mana (Runecrafting).
- **Kein neuer Sim-Lauf nötig für die Leiter selbst** — Werte interpolieren aus den sim-validierten Smithing-Ankern. **Sim-Check fällig**, sobald content-dev die Zahlen einsetzt (Ranged-Action `0 XP/h`? Stab-Monster `kills 0`?) — dann eigener Balance-Pass.

---

## 5. Kern-Empfehlung & Apply-Reihenfolge (für Chef → content-dev)

**Kern:** Zwei 12-Rung-Leitern, an die Smithing-Level-Anker (1·5·10·20·30·40·50·60·70·80·90·100) geheftet, Roh-Schaden als Faktor von `D`, Stil-Identität über crit/Tempo (Ranged) bzw. Status/Mana (Magie). Quelle: **Fletching** (Ranged-Waffen + Munition, Smithing nur Spitzen) und **Runecrafting** (Magie, keine neue „Inscription"-Skill).

**Ordered apply-list (nach Freigabe, content-dev):**
1. **Munition zuerst (kleinste Mühe, größte Lücke):** `*_arrow` auf alle 12 Tiers auffüllen (heute 5) mit `ammoDamage`-Kurve §1.3. Spitzen existieren schon.
2. **Bolzen-Linie** `*_bolt` (12 Tiers) + Armbrust-Archetyp, falls Crossbow gewünscht.
3. **Bogen-Archetypen** (Shortbow/Longbow/Crossbow/Greatbow) je Tier auf den `rangedDamage`-Faktoren §1.2, aIMs tier-fix.
4. **Magie Quell-Material:** Essenz-/Runen-Leiter von 3 auf ~6–12 Tiers erweitern (sonst kein glatter Stab-Ladder).
5. **Stab/Wand/Focus** je Tier nach §2.2/§2.4, `weaponEffect` je Tier eskalierend (§2.3, Detail aus Magie-System-Plan).
6. **balance-designer Folge-Pass:** konkrete Stat-/XP-Endzahlen je Item (Voll-Tabellen analog Smithing-Spec §4) + Sim-Validierung.

**Doc-Pfad:** `G:\GameDev\design\ranged-magic-tiers-plan.md`
