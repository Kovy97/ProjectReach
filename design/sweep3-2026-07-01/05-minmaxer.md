# Sweep 3 — 05 Min-Maxer: Stärkster Stil/Build + Stil-Parität (Kontrolleur)

**Ziel:** Den stärksten Stil/Build über L20/40/60/90 finden und verifizieren, ob nach dem
balance-pass2 (Stil-Parität) noch ein Stil dominiert oder Parität erreicht ist — mit **realistischem
Gear je Stil** (Melee=Metall, Ranged=Leder, Magie=Stoff).

**Methode:** headless SimPlayer (`packages/engine/src/sim-player.ts`) + echte `computeStats`/`combat`.
Temporäres Vitest-Skript angelegt, ausgeführt, **wieder gelöscht** (Briefing-Regel).
Deterministisch (seed 7). Kein Spiel-Code geändert.

**Loadout je Stil/Tier (symmetrisch):** Offense-Skill + „Gear-Beruf" (str→woodcutting, dex→fletching,
int→runecrafting) + defence/vitality/mining alle = Tier-Level; Survivability via Auto-Eat normalisiert
(0 Tode überall → reiner Offense-Vergleich).
- **Melee** = Metall (fullhelm/platebody/platelegs/gauntlets/sabatons) + scimitar+kiteshield (1H) bzw. greatsword (2H)
- **Ranged** = Leder/Hide (helm/body/legs/vambraces/boots) + longbow + Tier-Pfeile
- **Magie** = Stoff (frost→aether→arcane→godspark) + staff bzw. wand
- Tiers: **steel(20) · mithril(40) · runite(60) · aetherium(90)** (craftbares On-Tier-Gear, VOR den godly/legendären Drops)

**balance-pass2 eingepflegt? JA** (Stichprobe der Waffen-Flats bestätigt): longbow 25/41/57/78,
staff 25/42/62/94, scimitar 31/48/72/120, greatsword 82/128/190/317.

---

## Kern-Ergebnis: Parität NICHT erreicht. **Melee bleibt der stärkste Stil auf jedem Tier.**

Stärkster Build = **Melee**: 1H-Scimitar+Schild ist der konstanteste Real-Performer, 2H-Greatsword die
leicht höhere „Glass-Cannon"-Analytic-DPS. Ranged ist auf **jedem** Tier der schwächste Stil; Magie
liegt früh/mittig nah an Parität, bricht aber im Endgame weg.

### Analytische effektive DPS (mob-HP-unabhängig, sauberstes Paritäts-Signal) — relativ zu melee1h
| Tier | melee1h | melee2h | ranged | magic (staff) | magic (wand) |
|---|---|---|---|---|---|
| L20 | 32.5 (Basis) | **+14 %** | **−16 %** | −8 % | −5 % |
| L40 | 53.8 | +13 % | −9 % | +1 % | +5 % |
| L60 | 82.8 | +9 % | **−16 %** | **−16 %** | −13 % |
| L90 | 154.4 | +9 % | **−26 %** | **−22 %** | −24 % |

### Echte avg kills/h (repräsentative on-level Mobs, 0 Tode) — relativ zu melee1h
| Tier | Mob-Band | melee2h | ranged | magic |
|---|---|---|---|---|
| L20 | goblins L18–20 | +2 % | **−11 %** | −5 % |
| L40 | pitch_beetle/ash_tyrant L38–45 | +8 % | **−12 %** | +5 % |
| L60 | bramble_witch/skeleton_warrior L58–65 | +3 % | **−14 %** | −8 % |
| L90 | skeleton_pyroclasp L85 (tanky) | mob-abh. | **−23 %** | **−25 %** |

### Regen-Mobs (wo Magie-DoT die Rüstung/Regen ignorieren soll)
| Tier | Regen-Mob | melee2h | ranged | magic |
|---|---|---|---|---|
| L60 | rootling_treemonster L62 regen4, moss_golem L56 regen3 | +1 % | **−20 %** | −12 % |
| L90 | skeleton_nekro L90 regen5 | +8 % | **−27 %** | −23 % |

*Magie schlägt Ranged an Regen-Mobs (Identität „DoT ignoriert Regen" wirkt) — aber beide bleiben klar hinter Melee.*

---

## Findings (schwerste zuerst)

### [P2][balance] confirmed — Ranged ist auf JEDEM Tier der schwächste Stil; die Lücke WÄCHST mit dem Level
**Erwartet:** ±10 % effektive DPS pro Tier (Chef-Pfeiler „3 gleichwertige Stile").
**Tatsächlich:** real kills/h −11 % (L20) → −12 % (L40) → −14 % (L60) → **−23 % (L90)**; analytisch
−16 %/−9 %/−16 %/**−26 %**. An Regen-Mobs sogar −20 % (L60) / −27 % (L90).
**Root cause (confirmed, structurell):** Leder/Hide-Rüstung gibt als **einzige** Waffenklasse **KEINEN
Attribut-Modifier** — Metall gibt `str` (→ meleeDamage ×1.5), Stoff gibt `int` (→ magicDamage ×1.7),
**Leder gibt 0 `dex`** (Grep: kein einziges Item mit `dex`-Modifier, `packages/content/src/index.ts`).
Damit fehlt Ranged der Gear-Attribut-Hebel, den Melee/Magie haben. Der balance-pass2-Waffen-Buff
(longbow-Flats) hat früh geholfen, ist aber „oben getapert" (aetherium_longbow **78** vs
aetherium_scimitar **120** vs greatsword **317**) → am L90-Tier klafft der Roh-`attackDamage`:
**ranged 264 vs melee1h 387 (68 %)**, nur teilweise durch schnelleres Intervall/Crit ausgeglichen (netto −23 %).
**Evidence:** L90 ranged atk=264 int=2016 crit0.20 aDPS=114 vs melee1h atk=387 int=2025 aDPS=154.
**Owner:** balance-designer (Ziel-Werte) + content-dev (Einpflegen).

### [P2][balance] confirmed — Endgame-Parität am craftbaren L90-Tier gebrochen (widerspricht der pass2-Annahme)
**Erwartet:** balance-pass2 nahm an „Endgame ist bereits paritätisch" (Beleg 06, gemessen mit **BiS-godly-Drops**
spectral_longbow/last_vengeance/skarn_idol_staff).
**Tatsächlich:** Auf dem **craftbaren aetherium(L90)-Tier** — also dem realistischen Gear-Stand VOR den
godly-Drops — dominiert Melee: ranged −23…−26 %, magic −22…−25 %. Die „natürliche Konvergenz" durch den
Nicht-Waffen-Term greift NICHT, weil Ranged kein Gear-`dex` bekommt und Magie am 2H-Intervall hängt.
**Owner:** balance-designer.

### [P3][balance] confirmed — Magie-Endgame-Defizit ist NICHT waffenwahl-bedingt (Staff ≈ Wand)
**Beobachtung:** L90 Magie Staff −25 % ≈ Wand −24 %. Magie-Roh-`attackDamage` ist am L90 sogar der **höchste**
aller Stile (staff **410** > melee1h 387), aber das **langsame Magie-Intervall** (staff 2900 / wand 2600 ms
vs melee 2025) + **Mana-Downtime** (Weak-Cast ×0.35 wenn Pool leer) + fehlender Früh-Crit fressen den Vorsprung.
→ Magie braucht am Endgame einen **Intervall-/Uptime-Hebel**, NICHT mehr magicDamage-Flat.
**Owner:** combat-dev / balance-designer.

### [P3][balance] validated — 2H-Melee viabel (balance-pass2 #2 wirkt)
**Beobachtung:** Greatsword analytisch **+9…+14 %** über 1H+Schild auf allen Tiers → echte Glass-Cannon-
Alternative (verzichtet auf Schild-def/hp). In echten Kämpfen mob-HP-abhängig (an Trash-Mobs gewinnt das
schnelle 1H per Overkill-Vermeidung, an tanky Mobs führt 2H) — genau die gewollte Nische. **Kein Fix nötig.**

### Bestätigt (kein Bug): Magie früh/mittig ~paritätisch
L20 −5 %, L40 **+5 %**, L60 −8 %. Der pass2-Magie-Buff (staff-Flats + int-aus-Stoff + burn-DoT) **wirkt**
früh/mittig. Erst ab L60 (analytisch) und deutlich am L90 kippt es.

---

## Konkrete Ziel-Werte (Empfehlung — Chef-freigegeben laut Briefing)

**Paritäts-Ziel:** alle Stile ±10 % effektive DPS pro Tier; distinkte Identität erhalten
(melee=roh/Lifesteal + 2H-Burst · ranged=Krit/Tempo · magic=DoT/Status/Mana).

**A) Ranged — zwei Hebel kombinieren (schwerste Lücke):**
1. **Hide-Rüstung `dex`-Modifikatoren geben** (Spiegel zu Stoff-`int` / Metall-`str`) — behebt die
   strukturelle 0-dex-Asymmetrie. Vorschlag Set-Summe: studded ≈ +4 dex · ironhide ≈ +6 · warhide ≈ +8 ·
   dragonhide ≈ +12 · shadow/void ≈ +14 (analog godspark int-Summe 15).
2. **Obere Longbow/Shortbow-Flat-Leiter un-tapern.** Ziel-`attackDamage` für −10 %-Parität:
   L60 187→~200 (`runite_longbow` 57→~68), **L90 264→~322** (`aetherium_longbow` 78→~104;
   godiron 82→~112; spectral/last entsprechend nachziehen, Hierarchie halten). L20/L40 nur kleiner Nudge
   (longbow 25→~28 / 41→~44) — dort ist die Real-Lücke −11/−12 % grenzwertig.

**B) Magie L60+ — Intervall/Uptime statt Flat:**
- Magie-Waffen einen `attackIntervalMs`-Bonus geben (z.B. staff −200, wand −350) **und/oder** `manaCost`
  am Endgame senken, damit der Cast-Uptime am L90 nicht in den Weak-Melee kippt. Ziel `attackDamage`
  bleibt ~gleich (410 ist genug) — nur schneller/zuverlässiger auslösen. Zielband: L60 magic aDPS
  69→~76, L90 120→~140.

**C) Melee:** unverändert lassen (2H bereits viabel; 1H ist die Referenz). *Hinweis:* Melee wurde in der
Default-„attack"-Stance gemessen — mit „power"-Stance würde Melee noch weiter davonziehen, d.h. die
gemessene Lücke ist **konservativ**.

**Nach Einpflegen:** dieselbe geared-Sim je Stil L20/40/60/90 erneut fahren; Abbruch, wenn alle drei
Stile ±10 % liegen.

---

## Ziel erreicht?
**Teilweise.** Der stärkste Stil/Build ist eindeutig identifiziert: **Melee (1H+Schild bzw. 2H-Greatsword)**.
Parität ist **nicht** erreicht — Melee dominiert auf jedem Tier, mit wachsender Lücke zum Endgame.

**Findings je Severity:** P0 0 · P1 0 · **P2 2** (confirmed) · **P3 2** (1 confirmed, 1 validated/kein Bug).

**Top-3:**
1. **[P2] Ranged überall der schwächste Stil, Lücke wächst (−11 %→−23 % real, bis −27 % an Regen-Mobs).**
   Root cause: Leder-Rüstung gibt 0 `dex` (Metall→str, Stoff→int). → Hide-`dex`-Mods + obere Longbow-Flats.
2. **[P2] Endgame-Parität am craftbaren L90-Tier gebrochen (ranged/magic ~−24 %)** — die pass2-Annahme
   „Endgame paritätisch" galt nur für BiS-godly-Drops, nicht für craftbares aetherium-Gear.
3. **[P3] Magie-Endgame-Lag ist strukturell (Staff ≈ Wand):** höchster Roh-Schaden, aber langsames
   Intervall + Mana-Downtime → braucht Intervall/Uptime-Hebel, nicht mehr Flat. **2H-Melee ist viabel (validiert).**
