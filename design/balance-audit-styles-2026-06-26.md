# Balance- & Spaß-Audit: Ranged / Magie / Runen / Enchants

**Autor:** Balance-Designer · **Datum:** 2026-06-26 · **Status:** Audit-Report. Reine Zahlen-Empfehlungen für content-dev / Cross-Revier-Tickets. Ich ändere keinen Content/Code selbst.

**Methode:** Da `sim.test.ts` im Kampf nur `bronze_sword` ausrüstet, ist Ranged/Magie nicht sim-getestet. Ich habe `computeStats` (character.ts) + die Kampf-Loop (combat.ts) 1:1 nachgerechnet und **effektive DPS** = `Schaden × Trefferchance × Krit-Faktor / Intervall (+ DoT)` für jeden Stil mit tier-passender Waffe bei L10 / L50 / L99 modelliert. Attribute aus realistischem Skill-Routing (Ranged trainiert NUR `ranged`→dex, Magie `magic_off`→int + `magic_def`→wis, Melee `power`+`attack`). Gegner-Evasion level-skaliert (40/120/220).

## Effektive DPS (Modell, weapon-only worst case)

| Checkpoint | Melee (sword/dagger) | Ranged (short/long) | Magie (staff cast / wand+focus) | Magie ohne Mana |
|---|---:|---:|---:|---:|
| **L10 (iron)** | 8.8 | **11.7 / 10.8** | 9.7 / – | 3.1 |
| **L50 (adam.)** | 30.8 | **39.5 / 36.0** | 27.3 / 27.9 | – |
| **L99 (godiron)** | 78 / **86** | **102.6 / 95.3** | 63.5 / 62.3 | 17.9 |

Trefferchance (hit): Melee ~0.71, Ranged ~0.59–0.73, **Magie nur ~0.49–0.67** (sinkt mit Gegner-Evasion).

---

## ✅ POST-FIX-VERIFIKATION (2026-06-26, nach Anwendung)

Fixes angewandt (durch combat-dev/content-dev), Engine 317/317 grün, Sim-Auffälligkeiten 0. Konkret verifiziert im Code/Content:
- **Engine `character.ts`:** Accuracy-Skillanteil ist jetzt **stil-abhängig** — `offenseSkill = ranged?sRanged : magic?sMagicOff : sAttack`, Gewicht ·2 (= mein B1-Fix B). Nebenfix: Ranged nutzte vorher fälschlich `attack`, jetzt korrekt `ranged`.
- **Content `index.ts`:** Staff acc = `round(1.4·D)` (godiron 185), Wand = `round(1.5·D)` (godiron 198); Shortbow rangedDamage `0.52·D` (godiron 69) + aIMs **−300**; Longbow `0.70·D` (godiron 92); Arrow ammoDamage `0.27·D` (godiron 36); Enchant-DoT-Floor `0.30·D_basis` (flaming_steel_sword burn 4→6).

**Neu nachgerechnete effektive DPS (gleiche Methode):**

| Checkpoint | Melee sword / dagger | Ranged short / long | Magie staff / wand+focus | Magie ohne Mana |
|---|---:|---:|---:|---:|
| **L10 (iron)** | 8.8 | 11.1 / 10.8 | **10.5** / – | – |
| **L50 (adam.)** | 30.8 | 42.5 / 40.4 | **35.1 / 36.2** | – |
| **L99 (godiron)** | 78.1 / 86.0 | 108.4 / 104.1 | **82.6 / 82.6** | 24.6 |

**Trefferchance jetzt:** Melee 0.69–0.74 · Ranged 0.69–0.74 · **Magie 0.66–0.72** — alle drei Stile innerhalb ~0.03–0.05. **B1 strukturell gelöst.**

| Stil | Verdikt | Begründung |
|---|---|---|
| **Magie** | 🟢 **GRÜN** | Trifft jetzt zuverlässig (≈ Melee). DPS L99 **82.6** liegt **über** Melee-Sword (78) und ≈ Melee-Dagger (86). Magie ist **nicht mehr Schlusslicht** — an jedem Checkpoint ≥ Melee-Sword. Viabel und lohnend. |
| **Melee** | 🟢 **GRÜN** | Unverändert (Referenz). Sword (78) ist endgame knapp das untere Ende, aber Dagger (86) ist die Melee-DPS-Wahl — Stil insgesamt gesund, Lebensraub-Identität intakt. |
| **Ranged** | 🟡 **GELB** | Verbessert, aber **noch klarer Spitzenreiter:** L99 Shortbow **108.4** = +26 % über Dagger, +31 % über Magie; L50 +38 % über Melee. Grund: der Accuracy-Fix hob Ranged-Hit (0.59→0.70) und kompensierte den Schadens-Trim fast ganz. „Moderat" ist es noch **nicht**. |
| **Tiers / Inversionen** | 🟢 **GRÜN** | Alle Trims sind **uniforme Faktoren** auf der monotonen D-Kurve → keine neuen Flatstretches/Cliffs, keine Inversionen. Shortbow (−300, schneller) vs. Longbow (0) bleibt unterscheidbar. Munitions-Kurve 1→36 monoton. |

### 🟡 Offener nächster Tweak (Ranged, P1) — nur falls „moderat" das Ziel ist
Der Schadens-Trim wurde vom Accuracy-Fix aufgefressen; der **dominante Hebel ist das Shortbow-Tempo**, nicht der Rohschaden. Validierte Optionen (L99-Ziel ~95–100 = +10–15 % über dem 82–86-Feld):

| id | level | current | recommended | Effekt L99 |
|---|---:|---|---|---|
| `<tier>_shortbow` aIMs | alle | −300 | **−150** | 108 → ~101 |
| `<tier>_arrow` ammoDamage | alle | `0.27·D` (godiron 36) | **`0.24·D`** (godiron 32) | zusätzlich → ~97 |
| `<tier>_longbow` rangedDamage | alle | `0.70·D` (godiron 92) | **`0.62·D`** (godiron 82) | 104 → ~98 |

Reine Schadens-Trims (rangedDamage `0.52→0.46·D`) bringen kaum etwas (108→103), weil Tempo+Krit+dex-Basis dominieren — **das Intervall (aIMs) ist der wirksame Hebel.** Alternativ: Ranged bewusst als DPS-König (+26 %) belassen — vertretbar **nur**, wenn Ranged spürbar squishier bleibt; aktuell gibt der Bogen aber zusätzlich `evasion` (auch Survivability), daher tendiere ich zum Tempo-Trim. **Chef-Entscheid.**

---

## KRITISCHE SPAẞ-BLOCKER (zuerst) — *Status: B1 nach Post-Fix RESOLVED, s. o.*

### 🔴 B1 — Magie ist endgame der schwächste Stil und trifft nur ~50 %
Bei L99 liegt der Stab inkl. Burn-DoT bei **63.5 DPS** gegen Melee **78–86** und Ranged **95–103** — also **25–40 % unter** den anderen Stilen. Ursache ist **strukturell**: Der Trefferwert kommt aus `accuracy = 50 + dex·3 + sAttack·2 + eq.accuracy`. Magie trainiert weder `dex` noch `attack` → der **einzige** Accuracy-Beitrag ist die Waffe, und die Spec hat Magie-Accuracy **niedriger** angesetzt als Melee/Ranged (Staff `1.1·D`, Wand `0.9·D` vs. Sword `1.5·D`, Longbow `1.6·D`). Ergebnis: der Zauberer trifft den Endgame-Gegner nur knapp zur Hälfte — das fühlt sich schwach und unbelohnend an und verletzt „drei Stile vergleichbar".

**Fix A (Content, sofort — höchste Wirkung): Magie-Waffen-Accuracy anheben.** Staff `1.1·D → 1.8·D`, Wand `0.9·D → 1.5·D`. Validiert: hebt Staff-Hit L99 von 0.49 auf 0.58 und Staff-DPS auf **73** (≈ Melee-sword 78) — schließt die Lücke fast allein.

| id | level | current acc | target hit | recommended acc |
|---|---:|---:|---:|---:|
| copper_staff | 1 | 6 | ~melee | **8** (1.8·5) |
| iron_staff | 10 | 15 | ~melee | **25** |
| steel_staff | 20 | 22 | ~melee | **36** |
| blacksteel_staff | 30 | 31 | ~melee | **50** |
| mithril_staff | 40 | 42 | ~melee | **68** |
| adamantium_staff | 50 | 53 | ~melee | **86** |
| runite_staff | 60 | 66 | ~melee | **108** |
| bloodiron_staff | 70 | 81 | ~melee | **133** |
| titanium_staff | 80 | 99 | ~melee | **162** |
| aetherium_staff | 90 | 119 | ~melee | **194** |
| godiron_staff | 100 | 145 | ~melee | **238** |
| (Wand-Linie analog) | 1–105 | 0.9·D | — | **1.5·D** (copper 8 … godiron 198) |

**Fix B (Cross-Revier-Ticket → combat-dev/logic-dev, sauberere Strukturlösung):** In `computeStats` den Accuracy-Term um den Magie-Offensiv-Skill ergänzen, spiegelbildlich zu `sAttack` beim Melee, z. B. `+ sMagicOff·2` wenn `style==='magic'`. Dann kann Fix A milder ausfallen (Staff `1.1·D → 1.4·D`). **Empfehlung: Fix B umsetzen UND Accuracy moderat anheben** — Fix A allein als Sofort-Patch, falls B nicht zeitnah kommt.

---

## WEITERE BEFUNDE

### 🟡 B2 — Ranged ist durchgehend Top-DPS (Munitionskosten rechtfertigen den Vorsprung nicht ganz)
Ranged liegt bei jedem Checkpoint vorn: L50 +28 % über Melee, L99 Shortbow **102.6** vs. Melee-best (dagger) 86 = +19 %, vs. Magie +60 %. Treiber: `dex` ist Super-Stat (Schaden **+** Intervall **+** Krit **+** Evasion), der Shortbow stapelt schnelles Intervall (1.29–1.72 s) mit Krit. Der laufende Pfeilverbrauch ist nur ein **Material**-Aufwand (kein Gold), der einen 19–30 % DPS-Bonus nicht trägt. Nicht spielzerstörend (Ranged = squishiger Glass-DPS-Identität), aber das obere Ende ist zu weit oben.

**Empfehlung (optional, P1 — nach B1):** Shortbow leicht trimmen, damit das Band schließt. Validiert: mit den u. g. Werten fällt Shortbow L99 auf **91.6**, Longbow auf **89.4** → Band 73–92 statt 63–103.

| id | level | current | recommended |
|---|---:|---|---|
| `<tier>_shortbow` rangedDamage | alle | `0.60·D` | **`0.52·D`** |
| `<tier>_shortbow` aIMs | alle | −400 | **−300** |
| `<tier>_arrow` ammoDamage | alle | `0.32·D` | **`0.27·D`** (z. B. godiron 42→36) |
| `<tier>_longbow` rangedDamage | alle | `0.78·D` | **`0.70·D`** |

> Alternativ B1 voll umsetzen und Ranged so lassen — dann bleibt Ranged der klare DPS-König (+30 %), was als „Identität: höchster Schaden, geringste Defensive" vertretbar ist. Chef-Entscheid: Band straffen (Trim) vs. Ranged-als-DPS-König (kein Trim).

### 🟢 B3 — Keine toten Tiers
Roh-Schaden, Accuracy, Krit, Burn-Magnitude und ammoDamage steigen über alle 12 Tiers streng monoton (D 5→132, Schritt ~×1.35/Tier). Effektiver Schuss/Cast wächst glatt, keine Flatstretches/Cliffs. Jedes Tier-Upgrade lohnt spürbar. **Grün.**

### 🟢/🟡 B4 — Mana-Ökonomie: nachhaltig, aber die geplante „Burst→Bash"-Spannung existiert nicht
Nachgerechnet: `manaRegen = 1 + wis·0.3` (pro Sek) × Cast-Intervall **übersteigt** die `manaCost` in **jedem** Tier, weil der Stab langsam (2.9 s) und wis-getrieben ist.

| Build | maxMana | regen/Cast (Intervall) | manaCost | Urteil |
|---|---:|---:|---:|---|
| L10 iron_staff (int/wis 7) | 59 | 9.0 (2.9 s) | 6 | Netto **+3** → nie leer |
| L50 adamantium_staff (17/17) | 129 | 17.7 | 10 | Netto **+8** → nie leer |
| L99 godiron_staff (29/29) | 213 | 28 | 16 | Netto **+12** → nie leer |

**Konsequenz:** Der Weak-Melee-Fallback (×0.35) feuert im Dauerkampf praktisch **nie** → Magie ist zuverlässig (kein Frust, **grün** für Fairness). Aber: die `manaCost`-Tier-Kurve und das designte „3–6 Casts dann Bash" sind damit **inert** — Mana ist kein Gameplay-Hebel. Spec §5.4 (Casts/Pool 9–23) hat den Pool-Drain betrachtet, aber den Regen-pro-Cast übersehen.
**Einzige echte Gefahr (🟡):** Ein Glass-Cannon mit untrainiertem `magic_def` (wis≈5, Regen ~2.5/s) kann bei schnellem Cast Mana leeren → DPS bricht auf ~18 (L99 weak-melee) ein. **Empfehlung:** entweder so lassen (zuverlässig = idle-fair) ODER, wenn der Chef echte Mana-Spannung will, `manaCost` ~×1.5 schärfen (Cross-Revier nicht nötig, reiner Content-Wert) — dann greift der Bash-Rhythmus. Default: **keine Änderung**, da Zuverlässigkeit für ein Idle-Game besser ist.

### 🟢 B5 — Essenz-/Runen-Gating ist korrekt gestaffelt
Verifiziert im Content: alle `aether_essence`-Drops von Monstern **L45+** (nekro 45, forest_bear 45, deep_kraken 60, roc_elder 65, frost_hexer 68, roc_storm 75, idol_warden 92, aether_wraith 98, last_idol 120) — Floor-45 hält. `void_essence` nur **L98+** (aether_wraith, scale_skarn 104, last_idol 120). `void_rune` craftet aus `void_essence ×2` (nicht aether-recycelt). Runen-RC-Leiter 1→65 sauber. Aether=vorletztes, Void=Endgame korrekt platziert. **Grün.**

### 🟡 B6 — Frühe Enchants zu marginal, Endgame-Fusionen stark (Skalierung okay, Floor zu niedrig)
Enchant-Mehrwert skaliert mit `D_basis`: `flaming_steel_sword` burn `0.20·D=4`, chance .30 → ~1.2 DoT-DPS auf einem Build mit ~25–30 DPS = **~4 %**. Für 3 `fire_rune` (= 3 `ember_essence`, Hauptquelle pyroclast L36) ist das mager **und** das Material kommt aus höher-leveligen Mobs als die Enchant-Req (RC18). Endgame dagegen: `void_greatsword` burn22+bleed18 ≈ bis +40 DoT-DPS auf ~80 DPS = **~50 %** (sehr lohnend).
**Empfehlung:** Reine-DoT-Enchant-Magnitude `0.20·D_basis → 0.30·D_basis` (frühe Enchants spürbarer; Endgame-Fusion unverändert lassen, ist gut). Optional `fire_rune` zusätzlich aus `goblin_warlock`-Drop (L14) zugänglicher machen, damit RC15–20-Enchants ohne Über-Level-Farm craftbar sind.

| id | current burn mag | recommended |
|---|---|---|
| `enchant_flaming_steel_sword` | 4 (0.20·D) | **6 (0.30·D)** |
| `enchant_*` reine-DoT-Rezepte (fire/frost) | `0.20·D_basis` | **`0.30·D_basis`** |
| void-Fusionen (`void_greatsword`, `voidstorm_staff`) | unverändert | unverändert |

---

## Geordnete Apply-Liste für content-dev

1. **(P0, B1-Fix A) Magie-Accuracy anheben:** alle 12 `<tier>_staff` auf `acc = round(1.8·D)`, alle 12 `<tier>_wand` auf `acc = round(1.5·D)` (Tabelle oben). Höchste Spaß-Wirkung.
2. **(P1, B2 — Chef-Entscheid) Ranged-Trim:** falls Band gestrafft werden soll: `<tier>_shortbow` rangedDamage `0.52·D` + aIMs −300; `<tier>_longbow` rangedDamage `0.70·D`; `<tier>_arrow` ammoDamage `0.27·D`.
3. **(P2, B6) Enchant-Floor:** reine-DoT-Enchant-Magnitude `0.20·D_basis → 0.30·D_basis`; ggf. `fire_rune`-Zugang via goblin_warlock.
4. **(Cross-Revier-Ticket → combat-dev/logic-dev, B1-Fix B):** `computeStats` Accuracy um `+ sMagicOff·2` (style magic) erweitern — strukturell sauberer als reine Waffen-Boni; danach kann Schritt 1 milder ausfallen (`1.4·D`).

**Kein Handlungsbedarf:** B3 (Tiers monoton), B4 (Mana nachhaltig — bewusst so lassen), B5 (Gating korrekt). Arrow-Rezept 1:1 (arrowhead→arrow) weicht von Spec-§3.3 (15:1) ab, ist aber sinnvoller — belassen.
