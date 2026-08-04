# Itemization-Paritäts-Fix + Waffen 2.0 — Reparatur- & Umbau-Spec (EIN Content-Pass)

**Autor:** balance-designer · **Datum:** 2026-07-02 · **Status:** FINAL zur Umsetzung
**Anlass:** Itemization-Gate BLOCK (`design/itemization-gate-2026-07-02.md`: 3-Stile-Parität ±10 % gerissen,
Magie bis +40 % über Ø am BiS, Melee −38 %) + fünf Chef-Scope-Erweiterungen: **Waffen 2.0** (WoW-Stil
Schadensspannen, ersetzt die H2/H5-Tempo-Patches), **Effekt-Palette 40** (`design/weapon-effects-palette.md`),
**Enchant-Integration**, **Chase-Doktrin** (sehr rare Drops schlagen über ihr Tier), **Strikte-Leiter-Respread**
(Chef-Go). **Owner-Legende:** `[C]`=content-dev · `[L]`=logic-dev · `[K]`=combat-dev · `[U]`=ui-dev.

**Messgrundlage:** Alle Paritäts-/EHP-Zahlen dieser Spec sind SIM-VERIFIZIERT mit exakt der Gate-Methodik
(SimPlayer, alle 7 Kampf-Skills = Tier-Level, on-tier craftbares Gear, cooked_soulfish/Auto-Eat T0,
Default-Stances, 30 Sim-Min je Zelle, effDPS = MonsterHP/(Ø s/Kill − 3 s), Seed 7). Die Waffen-2.0-Spannen
wurden dafür erwartungstreu als Flat = Range-MITTEL emuliert (der Uniform-Roll ist im Erwartungswert
DPS-identisch, §1.3) — das Re-Gate nach dem Apply misst das echte Modell. Temporäres Harness in
`packages/engine/src/_tmp_parity_probe.test.ts` gefahren und wieder GELÖSCHT (packages/** netto unverändert).

---

## §0 Ergebnis vorab — Parität & Wächter-Metriken (SIM-GEMESSEN)

### 0.1 Ziel-effDPS je Zelle (identische Gate-Methodik; Band 0.90–1.10 vs Ø)

| Zelle (Referenz-Mob) | melee | ranged | magic | Ratio m/r/g | Gate-Ist (vorher) |
|---|---:|---:|---:|---|---|
| L22 Steel (bull_boss) | 3.34 | 2.90 | 3.39 | 1.04 / 0.90 / 1.06 ✓ | 0.96 / 0.96 / 1.09 |
| L22 Steel (goblin_butcher) | 2.76 | 2.60 | 2.89 | 1.00 / 0.95 / 1.05 ✓ | 0.95 / 0.96 / 1.09 |
| L40 Mithril (pitch_beetle) | 4.63 | 4.90 | 5.13 | 0.95 / 1.00 / 1.05 ✓ | 0.88 / 0.91 / **1.21** |
| L40 Mithril (dust_vulture) | 3.96 | 4.18 | 4.36 | 0.95 / 1.00 / 1.05 ✓ | 0.87 / 0.92 / **1.21** |
| L60 Runite (thorn_wolf) | 6.86 | 6.92 | 7.18 | 0.98 / 0.99 / 1.03 ✓ | **0.82** / 1.04 / **1.14** |
| L60 Runite (bramble_witch) | 7.23 | 7.16 | 7.84 | 0.98 / 0.97 / 1.06 ✓ | **0.82** / 1.03 / **1.14** |
| L90 Aetherium (wild_stag) | 11.09 | 10.48 | 11.26 | 1.01 / 0.96 / 1.03 ✓ | **0.73** / 0.94 / **1.33** |
| L90 Aetherium (reef_drowned) | 10.01 | 9.09 | 10.33 | 1.02 / 0.93 / 1.05 ✓ | **0.76** / 0.93 / **1.31** |
| BiS L99 (idol_warden) | 18.06 | 20.18 | 18.75 | 0.95 / 1.06 / 0.99 ✓ | **0.62** / 0.98 / **1.40** (Ø 4 Bosse) |
| BiS L99 (aether_wraith) | 20.21 | 20.83 | 20.37 | 0.99 / 1.02 / 0.99 ✓ | — |
| BiS L99 (scale_skarn) | 21.27 | 23.03 | 22.14 | 0.96 / 1.04 / 1.00 ✓ | — |
| BiS L99 (last_idol) | 21.83 | 23.02 | 22.02 | 0.98 / 1.03 / 0.99 ✓ | — |

**Alle 20 Mess-Zellen im Band** (schlechteste: L22 ranged 0.90 am Band-Rand, BiS ranged 1.06). Die
Tier-aufwärts-Kippung (Magie-Decke wächst, Melee-Boden sinkt) ist beseitigt — die Ursache (DEX/LCK-Rider
auf Stoff + doppelt zählende Stab-Tempo-Patches) ist entfernt, nicht übertüncht.

### 0.2 „Voll verzaubert"-Gegenrechnung (T3-Rune je Stil auf der BiS-Waffe, §6)

| Boss | melee (+Scharf T3) | ranged (+Jägerisch T3) | magic (+Arkan T3) |
|---|---|---|---|
| idol_warden | 19.60 (0.97) | 20.93 (1.04) | 20.03 (0.99) |
| aether_wraith | 20.52 (0.97) | 22.27 (1.05) | 20.83 (0.98) |
| scale_skarn | 21.79 (0.93) | 24.50 (1.05) | 23.76 (1.02) |
| last_idol | 22.62 (0.98) | 23.63 (1.02) | 23.22 (1.00) |

Band bleibt 0.93–1.05; Uplift je Stil +4.2–5.7 % (symmetrisch, weit unter dem +10–15 %-Cap, §6.2).
Kein Stil profitiert überproportional durch Enchants.

### 0.3 EHP-Wächter (analytisch aus Sim-Snapshots; ×NEU = vs. Gate-Referenzzustand)

| Zelle | melee | ranged | magic | Einordnung |
|---|---|---|---|---|
| L22 | ×1.26 | ×1.18 | ×1.00 | **gewollt**: Früh-/Undergeared-Softening (Bronze-Wall-Gegenmittel, §8.2) |
| L40 | ×1.07 | ×1.26 | ×0.97 | melee-Anker: vs ALT ≈ 1.11·1.07 = **1.19 ✓** (±20-Fenster) |
| L60 | ×1.05 | ×1.15 | ×0.98 | — |
| L90 | ×1.00 | ×1.19 | ×0.95 | melee-Anker: vs ALT = **1.00 ✓** |
| BiS | ×1.04 | ×1.21 | ×0.99 | — |
| L10 (analytisch) | ~×1.30–1.35 | — | — | **gewollte Anker-Verschiebung** (strikte Leiter + Chef-Prinzip „früh weicher"; neu pinnen, §8) |

Ranged +15–26 % ist die bewusste Kompensation für den dokumentierten Eva-Identitätsverlust der Itemization
(Gate: eva 16 statt alt ~24) — Glass-Cannon wird zu „beweglich, aber ledergepanzert"; Trim-Hebel falls der
Kontrolleur widerspricht: Leder-body/legs con −1 ab ironhide (bricht die strikte Leiter NICHT).

### 0.4 Die minimale Hebel-Kombination (Ursache statt Symmetrie-Schieberei)

1. **H1 voll** — Stoff-DEX → INT 1:1 (Teile + Sets): das ¾-Rider-Leck der acc÷4-Konversion ist zu.
2. **H3 halbiert** — Stoff-LCK: Teile+Sets behalten ~die Hälfte, Rest → WIS (Mana-Identität statt Doppel-Krit).
3. **H2 via Waffen 2.0** — Stab-Tempo wird ABSOLUT neu geeicht (runite 2.88 s … godiron 2.70 s statt der
   −195…−465-Patches) und die Stab-cc/cd-Flats entfallen UNKOMPENSIERT (Teil des Magie-Fixes).
4. **H4 sanft** — Leder-DEX-Trim ab ironhide (worn −1 bis −3 + voidhide-Set dex 2→1); Bogen-Spitze: das
   godiron_shortbow-Budget bleibt, der überdimensionierte godiron_arrow trägt den Trim (ammoDamage 3.8 → **3.2**).
5. **H5 via Waffen 2.0** — Melee-Spitzentempo an der WAFFE (Schwert-Referenz 3.0 s → 2.80 s @godiron,
   §3.1-Regel für alle Melee-Craft-Typen) statt Set-Tempo-Kranz; dazu tragen der Rüstungs-STR-Respread (§4)
   und die Metall-Set-Spitze (aetherium str 10→12, godiron str 13→16) den BiS-Schluss.
   **Befund aus der Messung:** am BiS ist Melee hit-quantisiert (2–3 Schläge je Boss-Kill) — Roh-Schaden
   wirkt dort sublinear, TEMPO linear; darum Waffentempo statt noch mehr Flat.

---

## §1 [L]/[K] Waffen 2.0 — Modell & Engine-Pflichtenheft

### 1.1 Datenmodell (shared) — Koordinationspunkt logic-dev
```ts
// ItemDef (nur Waffen / weaponStyle-Träger):
//   damageMin?: number;  damageMax?: number;   // ersetzt bonus.meleeDamage/rangedDamage/magicDamage
//   attackIntervalMs (auf WAFFEN künftig ABSOLUT, §1.4) · manaCost · weaponEffect(s) · modifiers bleiben
```
- **Reine Content-Shape-Änderung, KEIN SAVE_VERSION-Bump** (keine Id-Umbenennungen; equipment speichert Ids).
- **EquipBonus-Pruning für Waffen:** Waffen tragen danach KEINE `bonus.*`-Kampf-Flats mehr
  (kein damage/accuracy/critChance/critDamage/defense/evasion/maxHp/maxMana/manaRegen auf Waffen;
  `lifesteal` nur noch als Signatur-Effektzeile analog Rüstungs-Whitelist §5.4-alt). Der Verbotene-Werte-Guard
  (itemization-guards) wird auf Waffen AUSGEWEITET: erlaubt sind `damageMin/damageMax`,
  `attackIntervalMs` (absolut), `manaCost`, `weaponEffect(s)`, `modifiers`, Whitelist-Effekte.
  EquipBonus bleibt als Typ unverändert (Buffs/Suffixe/Instanzen nutzen ihn weiter).
- Offhand-„Waffen" (focus/Totems) werden reine Attribut-Träger (§3.5) — kein damageMin/Max auf Offhands.

### 1.2 computeStats-Vertrag [L]
```ts
// Charakter-Anteil C wie heute (Formeln UNVERÄNDERT, nur ohne eq-Waffen-Flat):
//   C_melee = (0.1 + str·0.3 + powerEff·0.08 + eqNichtWaffe.meleeDamage) · dmgMult   (rng/mag analog)
// NEU in DerivedStats:
//   attackDamageMin = C + weapon.damageMin + ammoDamage      // Magie/Melee: ohne ammo
//   attackDamageMax = C + weapon.damageMax + ammoDamage
//   attackDamage    = (attackDamageMin + attackDamageMax) / 2   // Mittel — einzige Budget-/Anzeige-Quelle
//   maxHit = attackDamageMax (UNGERUNDET intern; Anzeige §7) · minHit = attackDamageMin
// DMG_MAX_HIT_MULT / DMG_ROLL_FLOOR entfallen als Schadens-Mechanik.
```
**Accuracy-Umbau (ersetzt die wegfallenden Waffen-acc-Flats UND fixt P3 „Rundungs-Schlucker"):**
```ts
// heute:  accuracy = round((5 + dex·0.6 + offenseSkill·0.2 + eq.accuracy) · accMult)
// NEU:    accuracy =        (5 + dex·0.6 + offenseSkill·0.35 + eq.accuracy) · accMult   // UNGERUNDET
```
Der Koeffizient 0.2→0.35 gibt exakt die Größenordnung der bisherigen Waffen-acc-Leitern zurück
(Waffen-acc wuchs ~0.15·req: steel_sword 3 → godiron 19.8); ungerundet macht +1-Attack-Boosts immer sichtbar.
Anzeige rundet (§7.3). Sim-verifiziert: alle §0.1-Zellen wurden mit acc = 0.15·req je Waffe gemessen.

### 1.3 combat.ts-Vertrag [K]
```ts
// resolveAttack: NON-Crit rollt UNIFORM in [effMin..effMax] (mitigiert):
//   effMin = attackDamageMin·(1−reduction), effMax = attackDamageMax·(1−reduction)
//   damage = nextInt(rng, max(1,round(effMin)), max(1,round(effMax)))
// CRIT bleibt erwartungs-verankert am MITTEL (wie heute effBase·critDamage — Krit-Stile nicht umbalancieren):
//   damage = max(1, round(((effMin+effMax)/2) · atk.critDamage))
```
- **RNG-Disziplin:** der Uniform-Roll konsumiert die STATE-RNG — der bisherige Kleinstschaden-Kurzschluss
  (`floor >= maxHit` rollte NICHT) entfällt, d. h. je Angriff kommt bis zu EIN Draw dazu. **Alle geseedeten
  Kampf-/Sim-Fixtures werden re-gepinnt** (combat.test, styles, ranged/magic-Fixtures, sim.test-Snapshots,
  endgame-danger …) — Pflichtpunkt im Apply.
- DPS-Erwartung ist identisch zum Mittelwert-Modell (Mittel des Uniform = (min+max)/2) — darum ist die
  §0-Messung per Äquivalent-Flat erwartungstreu.
- Hit-VARIANZ wird enger als der heutige 0.52–1.48-Wurf (der Charakter-Anteil liegt fix auf beiden Enden) —
  bewusstes WoW-Gefühl: die WAFFE definiert die Spanne. Schwere Waffen breit (±32–35 %), schnelle eng (±12 %).

### 1.4 Tempo-Modell [L]/[K]
```ts
// Waffen-attackIntervalMs wird ABSOLUT (Waffentempo, UI-tauglich „Tempo 2.8 s"):
//   base = weapon?.attackIntervalMs ?? 3000        // unbewaffnet weiterhin 3000
//   attackIntervalMs = clamp(base − dex·40 + eqDelta, 800, 5000)
//   eqDelta = NICHT-Waffen-Quellen (Suffix „Wolf"-softStat, Buffs) — bleiben Deltas
//   ranged ×0.90 und Stance-speedMult bleiben unverändert
```
Migration im Content: neuer Absolutwert = 3000 + bisheriges Delta (Tabellen §3); Stäbe NEU geeicht (§0.4).

### 1.5 DPS-Formel (Budget + UI, verbindlich)
```
WaffenDPS  = ((damageMin+damageMax)/2 + ammoDamage) / tempoS          // Waffenkarte §7.1
EffektDPS  = Σ EV(Effekt)  (Pricing §2.2) → im Budget vom Roh-Mittel abgezogen
CharDPS    = hitChance · effBase · (1 + cc·(cd−1)) / intervalS        // Balancing-Rechnung
```

---

## §2 [K] Effekt-System — Pflichtenheft & Pricing

### 2.1 Neue Effekt-Kinds (Daten auf `weaponEffect`, 1 Bedingung + 1 Wirkung, transiente Zähler im CombatState)
Von den §3-Tabellen KONKRET benötigt (Phase 1; alle non-persistent, State-RNG-Disziplin):

| kind | Bedingung → Wirkung | Parameter |
|---|---|---|
| `execute` | Ziel-HP < threshold → +magnitude Schaden | threshold 0.2 · magnitude 0.25 |
| `giantSlayer` | Monster-CL > Spieler-CL → +magnitude | magnitude 0.15 |
| `desperation` | eigene HP < threshold → +magnitude | threshold 0.3 · magnitude 0.3 |
| `bounty` | Ziel = Slayer-Task → +magnitude | magnitude 0.2 |
| `firstBlood` | Ziel unverletzt (HP = max) → +magnitude | magnitude 0.25 |
| `momentum` | je Treffer +magnitude Schaden, max stacks; Reset bei Kampfende | magnitude 0.02 · stacks §3 |
| `firstStrike` | erster Treffer des Kampfes ×2 | — |
| `eagleEye` | erster SCHUSS des Kampfes ist automatisch Krit | — |
| `everyNth` | jeder n-te Treffer +magnitude | n 5 · magnitude 1.0 |
| `critBurst` | bei Krit +flat Zusatzschaden (Blitz) | flat §3 |
| `vengeance` | nach erlittenem Treffer: nächster Schlag +magnitude | magnitude 0.4 |
| `cooldownOnKill` | Kill: Kill-Cooldown −ms | ms 2000 |
| `manaOnKill` / `healOnKill` | Kill: +X Mana / +X HP | X §3 |
| `overkillCarry` | Überschuss-Schaden des Todesstoßes trifft den nächsten Gegner | — |
| `antiRegen` | blutende/vergiftete Ziele regenerieren nicht | — |
| `manaDrain` | Treffer: +X Mana (Zermürbungs-Prosa) | X 2–3 |
| `plaguebearer` | Kill: nächster Gegner startet vergiftet | Magnitude der Basiswaffe |
| `gutter` | eigene Bleed-/DoT-Ticks +magnitude | magnitude 0.5 |
| `frostbite` | Ziel verlangsamt (frost) → +magnitude | magnitude 0.25 |
| `catalyst` | eigene Statuseffekte +ms Dauer | ms 3000 |
| `surplus` | eigenes Mana > 80 % → +magnitude Zauberschaden | magnitude 0.2 |
| `ammoSaver` | Chance, keine Munition zu verbrauchen | chance 0.2 |
| `luckyStrike` | +magnitude Gold von Kills | magnitude 0.15 |
| `packLeader` | Pet-Fähigkeit löst +25 % häufiger aus | magnitude 0.25 |
| `thorns` | NUR Rüstungs-Chase-Ausnahme (§5): Angreifer erleidet X Schaden | X §5 |

Status-Kinds (burn/bleed/poison/frost/shock) und `lifesteal` bleiben unverändert. Nicht belegte
Palette-Kinds (doubleStrike, Ausdauer/Berserkerlied/Kurzer Prozess, Blutzoll, Sparsamkeit, Trophäenjäger,
Gelehrten-/Sammlerklinge) sind SPÄTERE Drops — Engine-Hooks dürfen gleich mit entstehen, Content folgt.

### 2.2 Pricing-Formel je Archetyp (EV als DPS-Äquivalent; vom Roh-Budget der Waffe ABGEZOGEN)
`EV = Uptime × Magnitude`, konservative Uptime-Annahmen (idle-typische Kills 5–15 s):

| Archetyp | Uptime-Annahme | EV → M-Abzug |
|---|---|---|
| execute 0.25/0.2 | ~20 % der Kampfzeit | **5 %** |
| giantSlayer 0.15 | ~⅓ der Kämpfe über-CL | **5 %** |
| desperation 0.3 | ~10 % (Auto-Eat hält hoch) | **3 %** |
| bounty 0.2 | ~25 % Task-Uptime | **5 %** |
| firstBlood 0.25 | 1. Hit ≈ 20 % eines Kills | **5 %** |
| momentum 0.02×k | Ø-Stapel ≈ k/2 über den Kill | **7 %** (k = 10) |
| firstStrike ×2 | 1 Hit/Kill | **6 %** |
| eagleEye | 1 Garantie-Krit/Kill ≈ (1−cc)·(cd−1)/hits | **5 %** |
| everyNth (5, +100 %) | +20 % theoretisch, ~½ der Kills erreichen Hit 5 | **6 %** |
| critBurst X | cc·X/Mittel | **4 %** |
| vengeance 0.4 | ~1 Gegenschlag je 3 eigene | **4 %** |
| cooldownOnKill 2 s | 2 s von ~10 s Kill+CD | **6 %** |
| mana/healOnKill, manaDrain, plaguebearer, catalyst | Sustain/Utility | **4 %** |
| gutter 0.5 | DoT-Anteil ~12 % × 0.5 | **6 %** |
| frostbite 0.25 | Frost-Uptime ~25 % | **6 %** |
| surplus 0.2 | Mana > 80 % ~25 % (Schild zehrt) | **5 %** |
| ammoSaver / luckyStrike / packLeader | Ökonomie, kein Direkt-DPS | **4 %** |
| Boss/godly-Kombis (2–3 Effekte) | — | **8 %** pauschal |
| Status-DoTs (bestehend) | historisch eingepreist (in §0-Messung enthalten) | **0 %** (kein Doppel-Abzug) |

### 2.3 Stacking-Regel (Basis-Effekt + Enchant-Proc + Suffix) — verbindlich
1. Eine Waffe: max. 1 BASIS-Effektpaket (weaponEffect/weaponEffects) + max. 1 AFFIX (Enchant-Proc, §6)
   + max. 1 SUFFIX (Random-Roll; rollt weiterhin nur Stats/Boosts, keine Procs).
2. GLEICHER Status-Typ aus mehreren Quellen (burn-Stab + Flamm-Rune): bestehende Refresh-Semantik —
   stärkere/zuletzt applizierte Instanz refresht, KEIN Doppel-Ticken (gegen status-refresh.test verifizieren).
3. VERSCHIEDENE Kinds stapeln frei; konditionale Schadens-Mods (execute/giantSlayer/…) wirken
   MULTIPLIKATIV auf den Einzelschlag (kommutativ, Reihenfolge egal — so dokumentieren und testen).
4. Transiente Zähler (momentum/everyNth/firstStrike/eagleEye/vengeance) leben im CombatState, resetten
   bei Kampfende/Tod/Gegnerwechsel und werden NICHT persistiert.

---

## §3 [C] Waffen-Tabelle — id → {damageMin, damageMax, tempoS, modifiers, Effekt}

### 3.1 Konversionsregeln (gelten für JEDE Zeile; Tabellen sind das Apply-Artefakt)
1. **Spannen-Mittel M** = Budget der Waffe (sim-verifizierte Linien §0). `damageMin = M·(1−w)`,
   `damageMax = M·(1+w)` mit Typ-Breite w: dagger/wand ±12 % · scimitar ±18 % · sword/mace/axe/shortbow/
   staff/scepter ±20 % · spear/battleaxe/longbow ±25 % · greataxe/greatsword ±32 % · maul ±35 %.
2. **Tempo absolut** (§1.4): Typ-Basis = 3000 + bisheriges Typ-Delta (dagger 2.50 s, scimitar 2.70 s,
   sword/mace 3.00 s, axe 3.15 s, battleaxe 3.20 s, spear 3.04 s, greataxe 3.40 s, greatsword 3.48 s,
   maul 3.56 s, shortbow 2.85 s, longbow 3.00 s, wand 2.70 s). **Melee-Craft-Spitze** (H5-Ersatz):
   runite −50 · bloodiron −80 · titanium −120 · aetherium −150 · godiron −200 ms auf die Typ-Basis;
   Spitzen-M-Trim aetherium ×0.971 / godiron ×0.959 zahlt einen Teil zurück (Netto = gemessener Schluss).
   **Stab-Linie NEU:** 3.00 s bis adamantium, dann 2.88/2.83/2.78/2.73/2.70 s (ersetzt −195…−465-Patches).
3. **acc-Flats entfallen ersatzlos** — kompensiert global durch den Formel-Umbau §1.2 (0.2→0.35).
4. **cc/cd-Flats → kleine LCK-Leitern** (wert-diskontiert, Rest steckt im M): s. Tabellen. AUSNAHME Stäbe:
   cc/cd entfallen unkompensiert (Magie-Paritäts-Fix, §0.4).
5. **def/eva/hp/mana-Flats → Attribute**: mace def→CON · spear eva→DEX · maul behält STR (§6.7-alt) ·
   Stab-Spitze +WIS · focus/Totems: mag-Flat→INT (÷3 Offhand-Discount), maxMana→WIS (÷8), cc→LCK.
6. **Effekte:** Status-Procs der Craft-Linien BLEIBEN wertidentisch (Stab-burn = Magie-Identität,
   Wand-frost/shock = Kontroll-Identität — beide sind in der §0-Messung enthalten). NEUE Effekte werden
   nach §2.2 vom M abgezogen (in den Tabellen als „−X % M" ausgewiesen).
7. **Charakter-Zweige der Craft-Leiter** (Palette-Regel „1 Zweig pro Band"): melee = **Scimitar/Blutrausch**
   (momentum, Stapel 3→10 über die Tiers) · ranged = **Langbogen/Adlerauge** (eagleEye) · magic = **Wand**
   (bestehende frost/shock-Kontrolle). Alle übrigen Craft-Linien sind bewusst effektlose Füller.
8. **Chase-Doktrin (Waffen):** Drop ≤ 1/200 → M der Craft-Linie des Typs am NÄCHSTHÖHEREN Tier
   (Requirements bleiben!); legendary/godly sind bereits Über-Tier-Signaturen (keine Doppel-Inflation).
   In der Unique-Tabelle als „+1 Tier"-Spalte ausgewiesen.
9. **Munition:** `ammoDamage` bleibt Flat und addiert auf min UND max (§1.2). Einzige Wertänderung:
   **godiron_arrow 3.8 → 3.2** (H4-Trim, §0.4); alle anderen Pfeile unverändert.

### 3.2 Craft-Waffen-Leitern (Füller effektlos — Charakter-Zweige §3.1.7; Werte = Apply-Artefakt)

#### sword-Linie (Füller-Referenz)
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_sword | 1 | D 1 · acc 0.8 | **0.8–1.2** | 3.00 | — | — |
| bronze_sword | 5 | D 1.6 · acc 1.2 | **1.3–1.9** | 3.00 | — | — |
| iron_sword | 10 | D 2.8 · acc 2.1 | **2.2–3.4** | 3.00 | — | — |
| steel_sword | 20 | D 3.6 · acc 3 | **2.9–4.3** | 3.00 | — | — |
| blacksteel_sword | 30 | D 5 · acc 4.2 | **4–6** | 3.00 | — | — |
| mithril_sword | 40 | D 5.7 · acc 5.7 | **4.6–6.8** | 3.00 | — | — |
| adamantium_sword | 50 | D 7.2 · acc 7.2 | **5.8–8.6** | 3.00 | — | — |
| runite_sword | 60 | D 8.4 · acc 9 | **6.7–10.1** | 2.95 | — | — |
| bloodiron_sword | 70 | D 9.6 · acc 11.1 | **7.7–11.5** | 2.92 | — | — |
| titanium_sword | 80 | D 11.7 · acc 13.5 | **9.4–14** | 2.88 | — | — |
| aetherium_sword | 90 | D 14 · acc 16.2 | **10.9–16.3** | 2.85 | — | — |
| godiron_sword | 99 | D 17.2 · acc 19.8 | **13.2–19.8** | 2.80 | — | — |

#### scimitar-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_scimitar | 1 | D 0.8 · acc 0.8 · cc 0.05 · spd -300 | **0.6–0.9** | 2.70 | — | NEU **Blutrausch** (momentum): +2 %/Treffer, max 3 Stapel |
| bronze_scimitar | 5 | D 1.4 · acc 1.3 · cc 0.05 · spd -300 | **1.1–1.5** | 2.70 | — | NEU **Blutrausch** (momentum): +2 %/Treffer, max 3 Stapel |
| iron_scimitar | 10 | D 2.4 · acc 2.2 · cc 0.05 · spd -300 | **1.8–2.6** | 2.70 | — | NEU **Blutrausch** (momentum): +2 %/Treffer, max 4 Stapel |
| steel_scimitar | 20 | D 3.1 · acc 3.2 · cc 0.06 · spd -300 | **2.4–3.4** | 2.70 | lck 1 | NEU **Blutrausch** (momentum): +2 %/Treffer, max 4 Stapel |
| blacksteel_scimitar | 30 | D 4.3 · acc 4.5 · cc 0.06 · spd -300 | **3.3–4.7** | 2.70 | lck 1 | NEU **Blutrausch** (momentum): +2 %/Treffer, max 5 Stapel |
| mithril_scimitar | 40 | D 4.8 · acc 6.1 · cc 0.06 · spd -300 | **3.7–5.3** | 2.70 | lck 1 | NEU **Blutrausch** (momentum): +2 %/Treffer, max 5 Stapel |
| adamantium_scimitar | 50 | D 6.2 · acc 7.7 · cc 0.06 · spd -300 | **4.7–6.8** | 2.70 | lck 1 | NEU **Blutrausch** (momentum): +2 %/Treffer, max 6 Stapel |
| runite_scimitar | 60 | D 7.2 · acc 9.6 · cc 0.07 · spd -300 | **5.5–7.9** | 2.65 | lck 2 | NEU **Blutrausch** (momentum): +2 %/Treffer, max 6 Stapel |
| bloodiron_scimitar | 70 | D 8.2 · acc 11.8 · cc 0.07 · spd -300 | **6.3–9** | 2.62 | lck 2 | NEU **Blutrausch** (momentum): +2 %/Treffer, max 8 Stapel |
| titanium_scimitar | 80 | D 9.9 · acc 14.4 · cc 0.07 · spd -300 | **7.5–10.9** | 2.58 | lck 2 | NEU **Blutrausch** (momentum): +2 %/Treffer, max 8 Stapel |
| aetherium_scimitar | 90 | D 12 · acc 17.3 · cc 0.08 · spd -300 | **8.9–12.8** | 2.55 | lck 3 | NEU **Blutrausch** (momentum): +2 %/Treffer, max 10 Stapel |
| godiron_scimitar | 99 | D 14.6 · acc 21.1 · cc 0.08 · spd -300 | **10.7–15.4** | 2.50 | lck 3 | NEU **Blutrausch** (momentum): +2 %/Treffer, max 10 Stapel |

#### dagger-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_dagger | 1 | D 0.6 · acc 1 · cc 0.06 · spd -500 | **0.5–0.7** | 2.50 | — | — |
| bronze_dagger | 5 | D 1 · acc 1.5 · cc 0.06 · spd -500 | **0.9–1.1** | 2.50 | — | — |
| iron_dagger | 10 | D 1.8 · acc 2.7 · cc 0.07 · spd -500 | **1.6–2** | 2.50 | lck 1 | — |
| steel_dagger | 20 | D 2.2 · acc 3.8 · cc 0.07 · spd -500 | **1.9–2.5** | 2.50 | lck 1 | — |
| blacksteel_dagger | 30 | D 3.1 · acc 5.3 · cc 0.07 · spd -500 | **2.7–3.5** | 2.50 | lck 1 | — |
| mithril_dagger | 40 | D 3.6 · acc 7.2 · cc 0.07 · spd -500 | **3.2–4** | 2.50 | lck 1 | — |
| adamantium_dagger | 50 | D 4.5 · acc 9.1 · cc 0.08 · spd -500 | **4–5** | 2.50 | lck 2 | — |
| runite_dagger | 60 | D 5.2 · acc 11.4 · cc 0.08 · spd -500 | **4.6–5.8** | 2.45 | lck 2 | — |
| bloodiron_dagger | 70 | D 6 · acc 14.1 · cc 0.08 · spd -500 | **5.3–6.7** | 2.42 | lck 2 | — |
| titanium_dagger | 80 | D 7.3 · acc 17.1 · cc 0.09 · spd -500 | **6.4–8.2** | 2.38 | lck 3 | — |
| aetherium_dagger | 90 | D 8.7 · acc 20.5 · cc 0.09 · spd -500 | **7.4–9.4** | 2.35 | lck 3 | — |
| godiron_dagger | 99 | D 10.7 · acc 25.1 · cc 0.1 · spd -500 | **9.1–11.5** | 2.30 | lck 4 | — |

#### mace-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_mace | 1 | D 1 · acc 0.6 · def 0.2 | **0.8–1.2** | 3.00 | con 1 | — |
| bronze_mace | 5 | D 1.6 · acc 0.9 · def 0.2 | **1.3–1.9** | 3.00 | con 1 | — |
| iron_mace | 10 | D 2.8 · acc 1.5 · def 0.4 | **2.2–3.4** | 3.00 | con 1 | — |
| steel_mace | 20 | D 3.6 · acc 2.2 · def 0.6 | **2.9–4.3** | 3.00 | con 1 | — |
| blacksteel_mace | 30 | D 5 · acc 3.1 · def 0.8 | **4–6** | 3.00 | con 2 | — |
| mithril_mace | 40 | D 5.7 · acc 4.2 · def 1.1 | **4.6–6.8** | 3.00 | con 2 | — |
| adamantium_mace | 50 | D 7.2 · acc 5.3 · def 1.4 | **5.8–8.6** | 3.00 | con 2 | — |
| runite_mace | 60 | D 8.4 · acc 6.6 · def 1.8 | **6.7–10.1** | 2.95 | con 3 | — |
| bloodiron_mace | 70 | D 9.6 · acc 8.1 · def 2.2 | **7.7–11.5** | 2.92 | con 3 | — |
| titanium_mace | 80 | D 11.7 · acc 9.9 · def 2.7 | **9.4–14** | 2.88 | con 3 | — |
| aetherium_mace | 90 | D 14 · acc 11.9 · def 3.2 | **10.9–16.3** | 2.85 | con 4 | — |
| godiron_mace | 99 | D 17.2 · acc 14.5 · def 4 | **13.2–19.8** | 2.80 | con 4 | — |

#### axe-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_axe | 1 | D 1 · acc 0.6 · spd 150 | **0.8–1.2** | 3.15 | — | — |
| bronze_axe | 5 | D 1.6 · acc 1 · spd 150 | **1.3–1.9** | 3.15 | — | — |
| iron_axe | 10 | D 3 · acc 1.7 · spd 150 | **2.4–3.6** | 3.15 | — | — |
| steel_axe | 20 | D 3.8 · acc 2.4 · spd 150 | **3–4.6** | 3.15 | — | — |
| blacksteel_axe | 30 | D 5.2 · acc 3.4 · spd 150 | **4.2–6.2** | 3.15 | — | — |
| mithril_axe | 40 | D 6 · acc 4.6 · spd 150 | **4.8–7.2** | 3.15 | — | — |
| adamantium_axe | 50 | D 7.5 · acc 5.8 · spd 150 | **6–9** | 3.15 | — | — |
| runite_axe | 60 | D 8.7 · acc 7.2 · spd 150 | **7–10.4** | 3.10 | — | — |
| bloodiron_axe | 70 | D 10.1 · acc 8.9 · spd 150 | **8.1–12.1** | 3.07 | — | — |
| titanium_axe | 80 | D 12.2 · acc 10.8 · spd 150 | **9.8–14.6** | 3.03 | — | — |
| aetherium_axe | 90 | D 14.7 · acc 13 · spd 150 | **11.4–17.2** | 3.00 | — | — |
| godiron_axe | 99 | D 18.1 · acc 15.8 · spd 150 | **13.9–20.9** | 2.95 | — | — |

#### battleaxe-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_battleaxe | 1 | D 1.2 · acc 0.6 · cd 0.25 · spd 200 | **0.9–1.5** | 3.20 | — | — |
| bronze_battleaxe | 5 | D 1.8 · acc 1 · cd 0.26 · spd 200 | **1.4–2.3** | 3.20 | — | — |
| iron_battleaxe | 10 | D 3.2 · acc 1.7 · cd 0.28 · spd 200 | **2.4–4** | 3.20 | lck 1 | — |
| steel_battleaxe | 20 | D 4.1 · acc 2.4 · cd 0.3 · spd 200 | **3.1–5.1** | 3.20 | lck 1 | — |
| blacksteel_battleaxe | 30 | D 5.8 · acc 3.4 · cd 0.31 · spd 200 | **4.4–7.3** | 3.20 | lck 1 | — |
| mithril_battleaxe | 40 | D 6.6 · acc 4.6 · cd 0.32 · spd 200 | **4.9–8.3** | 3.20 | lck 1 | — |
| adamantium_battleaxe | 50 | D 8.3 · acc 5.8 · cd 0.33 · spd 200 | **6.2–10.4** | 3.20 | lck 1 | — |
| runite_battleaxe | 60 | D 9.7 · acc 7.2 · cd 0.34 · spd 200 | **7.3–12.1** | 3.15 | lck 2 | — |
| bloodiron_battleaxe | 70 | D 11.1 · acc 8.9 · cd 0.36 · spd 200 | **8.3–13.9** | 3.12 | lck 2 | — |
| titanium_battleaxe | 80 | D 13.4 · acc 10.8 · cd 0.37 · spd 200 | **10.1–16.8** | 3.08 | lck 2 | — |
| aetherium_battleaxe | 90 | D 16.1 · acc 13 · cd 0.38 · spd 200 | **11.7–19.5** | 3.05 | lck 2 | — |
| godiron_battleaxe | 99 | D 19.8 · acc 15.8 · cd 0.4 · spd 200 | **14.3–23.8** | 3.00 | lck 3 | — |

#### spear-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_spear | 1 | D 1.4 · acc 0.8 · spd 40 · ev 0.5 | **1–1.8** | 3.04 | dex 1 | — |
| bronze_spear | 5 | D 2.1 · acc 1.4 · spd 40 · ev 0.8 | **1.6–2.6** | 3.04 | dex 1 | — |
| iron_spear | 10 | D 3.8 · acc 2.4 · spd 40 · ev 1.4 | **2.8–4.8** | 3.04 | dex 1 | — |
| steel_spear | 20 | D 4.7 · acc 3.4 · spd 40 · ev 2 | **3.5–5.9** | 3.04 | dex 2 | — |
| blacksteel_spear | 30 | D 6.6 · acc 4.8 · spd 40 · ev 2.8 | **4.9–8.3** | 3.04 | dex 2 | — |
| mithril_spear | 40 | D 7.7 · acc 6.5 · spd 40 · ev 3.8 | **5.8–9.6** | 3.04 | dex 2 | — |
| adamantium_spear | 50 | D 9.6 · acc 8.2 · spd 40 · ev 4.8 | **7.2–12** | 3.04 | dex 3 | — |
| runite_spear | 60 | D 11.1 · acc 10.2 · spd 40 · ev 6 | **8.3–13.9** | 2.99 | dex 3 | — |
| bloodiron_spear | 70 | D 12.7 · acc 12.6 · spd 40 · ev 7.4 | **9.5–15.9** | 2.96 | dex 3 | — |
| titanium_spear | 80 | D 15.5 · acc 15.3 · spd 40 · ev 9 | **11.6–19.4** | 2.92 | dex 4 | — |
| aetherium_spear | 90 | D 18.5 · acc 18.4 · spd 40 · ev 10.8 | **13.5–22.5** | 2.89 | dex 4 | — |
| godiron_spear | 99 | D 22.7 · acc 22.4 · spd 40 · ev 13.2 | **16.4–27.3** | 2.84 | dex 5 | — |

#### greataxe-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_greataxe | 1 | D 2 · acc 0.6 · cd 0.4 · spd 400 | **1.4–2.6** | 3.40 | lck 1 | — |
| bronze_greataxe | 5 | D 3.2 · acc 1 · cd 0.41 · spd 400 | **2.2–4.2** | 3.40 | lck 1 | — |
| iron_greataxe | 10 | D 5.6 · acc 1.8 · cd 0.45 · spd 400 | **3.8–7.4** | 3.40 | lck 1 | — |
| steel_greataxe | 20 | D 7.1 · acc 2.6 · cd 0.46 · spd 400 | **4.8–9.4** | 3.40 | lck 2 | — |
| blacksteel_greataxe | 30 | D 9.9 · acc 3.6 · cd 0.47 · spd 400 | **6.7–13.1** | 3.40 | lck 2 | — |
| mithril_greataxe | 40 | D 11.3 · acc 4.9 · cd 0.48 · spd 400 | **7.7–14.9** | 3.40 | lck 2 | — |
| adamantium_greataxe | 50 | D 14.3 · acc 6.2 · cd 0.49 · spd 400 | **9.7–18.9** | 3.40 | lck 2 | — |
| runite_greataxe | 60 | D 16.6 · acc 7.8 · cd 0.5 · spd 400 | **11.3–21.9** | 3.35 | lck 3 | — |
| bloodiron_greataxe | 70 | D 19 · acc 9.6 · cd 0.52 · spd 400 | **12.9–25.1** | 3.32 | lck 3 | — |
| titanium_greataxe | 80 | D 23.2 · acc 11.7 · cc 0.02 · cd 0.53 · spd 400 | **15.8–30.6** | 3.28 | lck 3 | — |
| aetherium_greataxe | 90 | D 27.8 · acc 14 · cc 0.03 · cd 0.54 · spd 400 | **18.4–35.6** | 3.25 | lck 4 | — |
| godiron_greataxe | 99 | D 33.9 · acc 17.2 · cc 0.04 · cd 0.55 · spd 400 | **22.1–42.9** | 3.20 | lck 4 | — |

#### greatsword-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_greatsword | 1 | D 2.2 · acc 0.6 · cd 0.3 · spd 480 | **1.5–2.9** | 3.48 | lck 1 | — |
| bronze_greatsword | 5 | D 3.7 · acc 1 · cd 0.3 · spd 480 | **2.5–4.9** | 3.48 | lck 1 | — |
| iron_greatsword | 10 | D 6.3 · acc 1.8 · cd 0.3 · spd 480 | **4.3–8.3** | 3.48 | lck 1 | — |
| steel_greatsword | 20 | D 8.2 · acc 2.5 · cd 0.3 · spd 480 | **5.6–10.8** | 3.48 | lck 1 | — |
| blacksteel_greatsword | 30 | D 11.5 · acc 3.5 · cd 0.3 · spd 480 | **7.8–15.2** | 3.48 | lck 2 | — |
| mithril_greatsword | 40 | D 12.8 · acc 4.8 · cd 0.3 · spd 480 | **8.7–16.9** | 3.48 | lck 2 | — |
| adamantium_greatsword | 50 | D 16.3 · acc 6 · cd 0.3 · spd 480 | **11.1–21.5** | 3.48 | lck 2 | — |
| runite_greatsword | 60 | D 19 · acc 7.5 · cd 0.3 · spd 480 | **12.9–25.1** | 3.43 | lck 2 | — |
| bloodiron_greatsword | 70 | D 21.7 · acc 9.2 · cd 0.3 · spd 480 | **14.8–28.6** | 3.40 | lck 3 | — |
| titanium_greatsword | 80 | D 26.4 · acc 11.2 · cc 0.02 · cd 0.3 · spd 480 | **18–34.8** | 3.36 | lck 3 | — |
| aetherium_greatsword | 90 | D 31.7 · acc 13.5 · cc 0.03 · cd 0.3 · spd 480 | **20.9–40.7** | 3.33 | lck 3 | — |
| godiron_greatsword | 99 | D 38.7 · acc 16.5 · cc 0.04 · cd 0.3 · spd 480 | **25.2–49** | 3.28 | lck 4 | — |

#### maul-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_maul | 1 | D 2.4 · acc 0.5 · spd 560 | **1.6–3.2** | 3.56 | str 1 | — |
| bronze_maul | 5 | D 3.7 · acc 0.8 · spd 560 | **2.4–5** | 3.56 | str 1 | — |
| iron_maul | 10 | D 6.5 · acc 1.4 · spd 560 | **4.2–8.8** | 3.56 | str 2 | — |
| steel_maul | 20 | D 8.3 · acc 2 · spd 560 | **5.4–11.2** | 3.56 | str 2 | — |
| blacksteel_maul | 30 | D 11.7 · acc 2.8 · spd 560 | **7.6–15.8** | 3.56 | str 3 | — |
| mithril_maul | 40 | D 13.3 · acc 3.8 · spd 560 | **8.6–18** | 3.56 | str 3 | — |
| adamantium_maul | 50 | D 16.7 · acc 4.8 · spd 560 | **10.9–22.5** | 3.56 | str 4 | — |
| runite_maul | 60 | D 19.5 · acc 6 · spd 560 | **12.7–26.3** | 3.51 | str 4 | — |
| bloodiron_maul | 70 | D 22.4 · acc 7.4 · spd 560 | **14.6–30.2** | 3.48 | str 5 | — |
| titanium_maul | 80 | D 27.2 · acc 9 · spd 560 | **17.7–36.7** | 3.44 | str 5 | — |
| aetherium_maul | 90 | D 32.6 · acc 10.8 · spd 560 | **20.6–42.8** | 3.41 | str 6 | — |
| godiron_maul | 99 | D 39.9 · acc 13.2 · spd 560 | **24.9–51.7** | 3.36 | str 6 | — |

#### shortbow-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_shortbow | 1 | D 0.5 · acc 0.7 · cc 0.06 · spd -150 | **0.4–0.6** | 2.85 | — | — |
| bronze_shortbow | 5 | D 0.9 · acc 1.1 · cc 0.06 · spd -150 | **0.8–1.1** | 2.85 | — | — |
| iron_shortbow | 10 | D 1.5 · acc 2 · cc 0.07 · spd -150 | **1.3–1.9** | 2.85 | — | — |
| steel_shortbow | 20 | D 2.2 · acc 2.8 · cc 0.07 · spd -150 | **2–3** | 2.85 | lck 1 | — |
| blacksteel_shortbow | 30 | D 2.8 · acc 3.9 · cc 0.07 · spd -150 | **2.4–3.6** | 2.85 | lck 1 | — |
| mithril_shortbow | 40 | D 3.5 · acc 5.3 · cc 0.07 · spd -150 | **3–4.4** | 2.85 | lck 1 | — |
| adamantium_shortbow | 50 | D 4.2 · acc 6.7 · cc 0.08 · spd -150 | **3.6–5.4** | 2.85 | lck 1 | — |
| runite_shortbow | 60 | D 5.5 · acc 8.4 · cc 0.08 · spd -150 | **4.5–6.7** | 2.85 | lck 2 | — |
| bloodiron_shortbow | 70 | D 6.3 · acc 10.4 · cc 0.08 · spd -150 | **5.2–7.8** | 2.85 | lck 2 | — |
| titanium_shortbow | 80 | D 7.2 · acc 12.6 · cc 0.09 · spd -150 | **6–9** | 2.85 | lck 2 | — |
| aetherium_shortbow | 90 | D 8 · acc 15.1 · cc 0.09 · spd -150 | **6.5–9.7** | 2.85 | lck 3 | — |
| godiron_shortbow | 99 | D 8.6 · acc 18.5 · cc 0.1 · spd -150 | **6.7–10.1** | 2.85 | lck 3 | — |

#### longbow-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_longbow | 1 | D 0.6 · acc 0.8 · cd 0.1 | **0.4–0.7** | 3.00 | — | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| bronze_longbow | 5 | D 1 · acc 1.3 · cd 0.1 | **0.7–1.2** | 3.00 | — | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| iron_longbow | 10 | D 1.7 · acc 2.2 · cd 0.12 | **1.3–2.1** | 3.00 | lck 1 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| steel_longbow | 20 | D 2.5 · acc 3.2 · cd 0.13 | **1.9–3.1** | 3.00 | lck 1 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| blacksteel_longbow | 30 | D 3.3 · acc 4.5 · cd 0.14 | **2.5–4.2** | 3.00 | lck 1 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| mithril_longbow | 40 | D 4.1 · acc 6.1 · cd 0.15 | **3.1–5.1** | 3.00 | lck 1 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| adamantium_longbow | 50 | D 4.9 · acc 7.7 · cd 0.16 | **3.6–6.1** | 3.00 | lck 2 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| runite_longbow | 60 | D 6.4 · acc 9.6 · cd 0.17 | **4.7–7.8** | 3.00 | lck 2 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| bloodiron_longbow | 70 | D 7.4 · acc 11.8 · cd 0.18 | **5.4–9** | 3.00 | lck 2 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| titanium_longbow | 80 | D 8.4 · acc 14.4 · cd 0.2 | **6.2–10.3** | 3.00 | lck 3 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| aetherium_longbow | 90 | D 9.4 · acc 17.3 · cd 0.22 | **6.9–11.5** | 3.00 | lck 3 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |
| godiron_longbow | 99 | D 10.2 · acc 21.1 · cd 0.25 | **7.5–12.5** | 3.00 | lck 4 | NEU **Adlerauge** (eagleEye): erster Schuss des Kampfes kritisch |

#### staff-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_staff | 1 | D 0.5 · acc 0.7 | **0.4–0.6** | 3.00 · Mana 5 | — | burn 25% · 0.1/s · 3.5s (BLEIBT) |
| bronze_staff | 5 | D 1.1 · acc 1.1 | **0.9–1.3** | 3.00 · Mana 5 | — | burn 26% · 0.2/s · 3.8s (BLEIBT) |
| iron_staff | 10 | D 1.7 · acc 2 | **1.4–2** | 3.00 · Mana 6 | — | burn 28% · 0.3/s · 4s (BLEIBT) |
| steel_staff | 20 | D 2.5 · acc 2.8 | **2–3** | 3.00 · Mana 6 | — | burn 30% · 0.5/s · 4.3s (BLEIBT) |
| blacksteel_staff | 30 | D 3.3 · acc 3.9 | **2.6–4** | 3.00 · Mana 7 | — | burn 31% · 0.7/s · 4.6s (BLEIBT) |
| mithril_staff | 40 | D 4.2 · acc 5.3 · cc 0.02 | **3.2–4.8** | 3.00 · Mana 7 | — | burn 32% · 0.9/s · 4.9s (BLEIBT) |
| adamantium_staff | 50 | D 5.2 · acc 6.7 · cc 0.02 | **4–6** | 3.00 · Mana 8 | — | burn 33% · 1.1/s · 5.2s (BLEIBT) |
| runite_staff | 60 | D 6.2 · acc 8.4 · cc 0.03 · spd -195 | **5–7.4** | 2.88 · Mana 8 | — | burn 34% · 1.4/s · 5.5s (BLEIBT) |
| bloodiron_staff | 70 | D 7.2 · acc 10.4 · cc 0.03 · spd -270 | **5.8–8.6** | 2.83 · Mana 9 | — | burn 36% · 1.8/s · 5.8s (BLEIBT) |
| titanium_staff | 80 | D 8.4 · acc 12.6 · cc 0.04 · spd -350 | **6.7–10.1** | 2.78 · Mana 9 | — | burn 37% · 2.2/s · 6.1s (BLEIBT) |
| aetherium_staff | 90 | D 9.4 · acc 15.1 · cc 0.05 · cd 0.15 · spd -425 | **7.1–10.7** | 2.73 · Mana 8 | wis 1 | burn 38% · 2.6/s · 6.3s (BLEIBT) |
| godiron_staff | 99 | D 10 · acc 18.5 · cc 0.06 · cd 0.2 · spd -465 | **7.8–11.6** | 2.70 · Mana 8 | wis 2 | burn 40% · 3.1/s · 6.5s (BLEIBT) |

#### wand-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_wand | 1 | D 0.4 · acc 0.8 · spd -300 | **0.4–0.4** | 2.70 · Mana 4 | — | frost 18% · 1/s · 3s (BLEIBT) |
| bronze_wand | 5 | D 0.7 · acc 1.2 · spd -300 | **0.6–0.8** | 2.70 · Mana 4 | — | frost 20% · 1/s · 3.2s (BLEIBT) |
| iron_wand | 10 | D 1.2 · acc 2.1 · spd -300 | **1.1–1.3** | 2.70 · Mana 5 | — | frost 22% · 1/s · 3.4s (BLEIBT) |
| steel_wand | 20 | D 1.8 · acc 3 · spd -300 | **1.6–2** | 2.70 · Mana 5 | — | frost 25% · 1/s · 3.6s (BLEIBT) |
| blacksteel_wand | 30 | D 2.4 · acc 4.2 · spd -300 | **2.1–2.7** | 2.70 · Mana 5 | — | shock 20% · 0.22/s · 3.5s (BLEIBT) |
| mithril_wand | 40 | D 3.1 · acc 5.7 · spd -300 | **2.7–3.5** | 2.70 · Mana 6 | — | shock 22% · 0.24/s · 3.8s (BLEIBT) |
| adamantium_wand | 50 | D 4 · acc 7.2 · spd -300 | **3.5–4.5** | 2.70 · Mana 6 | — | shock 24% · 0.26/s · 4s (BLEIBT) |
| runite_wand | 60 | D 4.8 · acc 9 · spd -330 | **4.2–5.4** | 2.67 · Mana 6 | — | shock 26% · 0.28/s · 4.2s (BLEIBT) |
| bloodiron_wand | 70 | D 5.5 · acc 11.1 · spd -360 | **4.8–6.2** | 2.64 · Mana 7 | — | shock 28% · 0.3/s · 4.4s (BLEIBT) |
| titanium_wand | 80 | D 6.2 · acc 13.5 · spd -375 | **5.5–6.9** | 2.63 · Mana 7 | — | shock 30% · 0.32/s · 4.6s (BLEIBT) |
| aetherium_wand | 90 | D 6.7 · acc 16.2 · spd -395 | **5.9–7.5** | 2.60 · Mana 7 | — | shock 32% · 0.34/s · 4.8s (BLEIBT) |
| godiron_wand | 99 | D 7 · acc 19.8 · spd -415 | **6.2–7.8** | 2.58 · Mana 7 | — | shock 34% · 0.36/s · 5s (BLEIBT) |

#### focus-Linie
| id | req | ALT (D · acc · cc/cd · spd) | **min–max** | **Tempo s** | **modifiers** | Effekt |
|---|---|---|---|---|---|---|
| copper_focus | 1 | D 0.1 · acc 0.3 · mm 3 | — (Offhand) | — | wis 1 | — |
| bronze_focus | 5 | D 0.1 · acc 0.4 · mm 4 | — (Offhand) | — | wis 1 | — |
| iron_focus | 10 | D 0.2 · acc 0.7 · mm 6 | — (Offhand) | — | int 1 · wis 1 | — |
| steel_focus | 20 | D 0.3 · acc 1 · cc 0.02 · mm 8 | — (Offhand) | — | int 1 · wis 2 · lck 1 | — |
| blacksteel_focus | 30 | D 0.4 · acc 1.4 · cc 0.02 · mm 11 | — (Offhand) | — | int 1 · wis 2 · lck 1 | — |
| mithril_focus | 40 | D 0.6 · acc 1.9 · cc 0.03 · mm 14 | — (Offhand) | — | int 2 · wis 3 · lck 1 | — |
| adamantium_focus | 50 | D 0.7 · acc 2.4 · cc 0.03 · mm 17 | — (Offhand) | — | int 2 · wis 3 · lck 1 | — |
| runite_focus | 60 | D 0.9 · acc 3 · cc 0.04 · mm 21 | — (Offhand) | — | int 3 · wis 4 · lck 1 | — |
| bloodiron_focus | 70 | D 1.1 · acc 3.7 · cc 0.04 · mm 26 | — (Offhand) | — | int 3 · wis 5 · lck 2 | — |
| titanium_focus | 80 | D 1.4 · acc 4.5 · cc 0.05 · mm 31 | — (Offhand) | — | int 4 · wis 6 · lck 2 | — |
| aetherium_focus | 90 | D 1.6 · acc 5.4 · cc 0.05 · mm 37 | — (Offhand) | — | int 5 · wis 7 · lck 2 | — |
| godiron_focus | 99 | D 2 · acc 6.6 · cc 0.06 · mm 45 | — (Offhand) | — | int 6 · wis 8 · lck 2 | — |

### 3.3 Unique-/Drop-/Boss-Waffen (Effekt-Zuteilung + Pricing-Abzug + Chase)

Regeln §3.1. „(bleibt)" = bestehender Status-Proc unverändert (0 % Abzug, historisch eingepreist); „−X % M" = Pricing-Abzug §2.2 bereits in min–max eingerechnet. Drop-Spalte = beste Quelle.

| id | req | Drop | ALT (Kurz) | **min–max** | **Tempo s** | **modifiers** | Effekt (Archetyp) | chase |
|---|---|---|---|---|---|---|---|---|
| rusty_sword | — | — | D 0.3 · acc 0.5 | **0.2–0.4** | 3.00 | — | — — *Starter-Füller* | — |
| gnarled_staff | magic_off 1 | — | D 0.5 | **0.4–0.6** | 3.00 | — | burn (bleibt) | — |
| cracked_bow | — | — | D 0.2 · acc 0.4 | **0.2–0.2** | 2.85 | — | — — *Starter-Füller* | — |
| cracked_staff | — | — | D 0.2 | **0.2–0.2** | 3.00 · Mana 5 | — | burn (bleibt) — *Glimmender Ast* | — |
| murkvein_longsword | attack 63 | — | D 8.8 · acc 9.6 | **6.7–10.1** | 3.00 | — | giantSlayer +15 % — *Underdog-Klinge aus dem Morast* (−5 % M) | — |
| steel_warblade | attack 20 | — | D 4 · acc 2.8 | **3.2–4.8** | 3.00 | — | bleed (bleibt) | — |
| voidwarden_blade | attack 99 | idol_warden | D 36 · cc 0.05 · cd 0.35 · spd 650 · acc 18.5 | **23.3–45.1** | 3.65 | lck 4 | bleed (bleibt) + vengeance +40 % — *Rache des Wächters (legendary, 2 Effekte)* (−5 % M) | Signatur (über Tier by design) |
| spectral_longbow | ranged 99 | aether_wraith | D 10.8 · cc 0.04 · cd 0.33 · acc 24 | **7.7–12.9** | 3.00 | lck 4 | bleed (bleibt) + eagleEye — *Geisterschütze (legendary)* (−5 % M) | Signatur (über Tier by design) |
| skarn_idol_staff | magic_off 99 | scale_skarn | D 10.5 · cc 0.07 · cd 0.25 · acc 21 | **8–12** | 3.00 · Mana 10 | lck 4 | burn (bleibt) + surplus +20 % — *Arkaner Überfluss (legendary)* (−5 % M) | Signatur (über Tier by design) |
| last_judgement | attack 99 | last_idol | D 40 · cc 0.07 · cd 0.4 · spd 700 · acc 21 | **25–48.6** | 3.70 | lck 5 | bleed (bleibt) + execute +25 % + healOnKill 4 — *GODLY: Henker + Kriegshunger* (−8 % M) | Signatur (über Tier by design) |
| last_vengeance | ranged 99 | last_idol | D 13 · cc 0.06 · cd 0.46 · acc 26.5 | **9–15** | 3.00 | lck 5 | bleed (bleibt) + eagleEye + cooldownOnKill −2 s — *GODLY: Adlerauge + Jagdrausch* (−8 % M) | Signatur (über Tier by design) |
| last_condemnation | magic_off 99 | last_idol | D 11.5 · cc 0.08 · cd 0.32 · mm 35 · mr 1.5 · acc 23.5 | **8.5–12.7** | 3.00 · Mana 10 | lck 5 · wis 7 | burn (bleibt) + surplus +20 % + manaOnKill 6 — *GODLY: Überfluss + Seelenernte* (−8 % M) | Signatur (über Tier by design) |
| dim_focus | magic_off 8 | — | D 0.5 · acc 0.8 | — (Offhand) | — | int 1 | — — *Offhand → Attribut-Träger* | — |
| frost_scepter | magic_off 25 | — | D 1.8 · acc 1.8 | **1.4–2.2** | 3.00 · Mana 6 | — | frost (bleibt) | — |
| aether_runestaff | magic_off 40 | last_idol | D 2.7 · acc 2.8 | **2.2–3.2** | 3.00 · Mana 7 | — | burn (bleibt) | — (1/20) |
| frost_focus | magic_off 22 | — | D 0.8 · acc 1.2 | — (Offhand) | — | int 1 | — — *Offhand → Attribut-Träger* | — |
| aether_orb | magic_off 40 | — | D 1.2 · hp 2 · acc 1.8 | — (Offhand) | — | con 1 · int 1 | — — *Offhand → Attribut-Träger* | — |
| void_focus | magic_off 55 | — | D 1.6 · cc 0.03 · acc 2.4 | — (Offhand) | — | lck 1 · int 2 | — — *Offhand → Attribut-Träger* | — |
| god_focus | magic_off 80 | — | D 2.1 · cc 0.04 · acc 3 | — (Offhand) | — | lck 2 · int 2 | — — *Offhand → Attribut-Träger* | — |
| stormcaller_rod | magic_off 50 | — | D 3.7 · acc 3.6 | **3–4.4** | 3.00 · Mana 7 | — | shock (bleibt) | — |
| voidcaller_staff | magic_off 65 | — | D 4.8 · cc 0.03 · acc 4.6 | **3.8–5.8** | 3.00 · Mana 8 | lck 1 | shock (bleibt) | — |
| godspark_staff | magic_off 88 | — | D 6.2 · cc 0.05 · cd 0.12 · acc 5.8 | **4.8–7.2** | 3.00 · Mana 9 | lck 3 | burn (bleibt) + critBurst 10 — *Funkenschlag* (−4 % M) | — |
| thornfang_blade | attack 46 | thorn_wolf | D 3.2 · cc 0.05 · acc 2.2 | **2.7–3.5** | 3.00 | lck 2 | bleed (bleibt) + antiRegen — *Dornen, die nicht heilen lassen (Wundbrand)* (−4 % M) | — (1/50) |
| bramble_witchstaff | magic_off 52 | bramble_witch | D 2.2 · cc 0.03 · acc 2.2 | **1.7–2.5** | 3.00 | lck 1 | frost (bleibt) + antiRegen — *Wundbrand: Dornen heilen nicht* (−4 % M) | — (1/50) |
| ashen_reaper | attack 38 | ash_tyrant | D 6 · cc 0.04 · acc 3.8 | **4.6–7** | 3.00 | lck 2 | burn (bleibt) + healOnKill 2 — *Kriegshunger des Schnitters* (−4 % M) | — (1/50) |
| mire_fang_dagger | attack 30 | mire_crawler | D 1.6 · cc 0.08 · spd -400 · acc 1.8 | **1.4–1.8** | 2.60 | lck 3 | bleed (bleibt) | — (1/40) |
| boar_tusk_mace | attack 4 | boar | D 1.2 · def 0.3 · hp 0.8 · acc 0.8 | **0.9–1.3** | 3.00 | con 1 | firstStrike ×2 — *Hinterhalt des Keilers (ersetzt def/hp-Krümel)* (−6 % M) | — (1/33) |
| pitchfork_spear | attack 3 | cow | D 1.4 · acc 1 | **1.5–2.5** | 3.00 | — | giantSlayer +15 % — *Bauernaufstand* (−5 % M) | **+1 Tier** (1/435) |
| sickle_shiv | attack 2 | cow | D 1.2 · spd -200 · acc 1.2 | **1.8–2.4** | 2.80 | — | execute +25 % <20 % HP — *Erntemesser (Henker)* (−5 % M) | **+1 Tier** (1/435) |
| farmhand_sling | ranged 3 | chicken | D 0.5 · cc 0.05 · acc 1 | **0.7–1.1** | 2.85 | lck 2 | luckyStrike +15 % Gold — *Glücksklinge des Feldknechts* (−4 % M) | **+1 Tier** (1/526) |
| hedgewitch_twig | magic_off 3 | boar | D 0.4 · spd -300 · acc 0.8 | **0.6–0.8** | 2.70 · Mana 6 | — | manaOnKill 3 — *Seelenernte der Heckenhexe* (−4 % M) | **+1 Tier** (1/357) |
| gorehorn_cleaver | attack 8 | bull_boss | D 3.4 · hp 1.2 · acc 1.8 | **4–6** | 3.00 | con 1 | bleed (bleibt) | **+1 Tier** (1/526) |
| goblin_shank | attack 2 | goblin | D 1.1 · cc 0.04 · spd -250 · acc 1.2 | **1.8–2.4** | 2.75 | lck 2 | firstStrike ×2 — *Hinterhältiger Stich* (−6 % M) | **+1 Tier** (1/526) |
| crude_waraxe | attack 5 | goblin_spearman | D 1.8 · cd 0.1 · acc 0.8 | **3–4.4** | 3.00 | lck 1 | desperation +30 % <30 % HP — *Verzweiflung des Plünderers* (−3 % M) | **+1 Tier** (1/357) |
| stolen_shortbow | ranged 7 | goblin_archer | D 0.7 · cc 0.06 · acc 1.4 | **1.2–1.8** | 2.85 | lck 2 | luckyStrike +15 % Gold — *Diebesgut* (−4 % M) | **+1 Tier** (1/357) |
| goblin_cleaver | attack 9 | goblin_butcher | D 2.4 · cc 0.05 · spd -200 · acc 1.4 | **2.9–4.3** | 2.80 | lck 2 | bleed (bleibt) | **+1 Tier** (1/1075) |
| warlock_felstaff | magic_off 12 | goblin_warlock | D 1.6 · acc 2.4 | **1.9–2.9** | 3.00 · Mana 8 | — | burn (bleibt) + manaDrain 2 — *Aetherfresser* (−4 % M) | **+1 Tier** (1/526) |
| dustblade | attack 6 | ash_rat | D 2 · acc 1.2 | **2.7–4.1** | 3.00 | — | firstBlood +25 % vs. unverletzt — *Erstes Blut im Staub* (−5 % M) | **+1 Tier** (1/435) |
| cinder_spike | attack 14 | pitch_beetle | D 3 · acc 1.8 | **3.5–5.9** | 3.00 | — | burn (bleibt) | **+1 Tier** (1/1000) |
| ashwood_longbow | ranged 14 | dust_vulture | D 1.2 · cd 0.13 · acc 3 | **1.9–3.1** | 3.00 | lck 1 | eagleEye — *Adlerauge (Linien-Zweig)* (−5 % M) | **+1 Tier** (1/1449) |
| mire_hexstaff | magic_off 14 | mire_crawler | D 1.4 · acc 2.4 | **1.9–2.9** | 3.00 · Mana 8 | — | poison (bleibt) + antiRegen — *Wundbrand-Hexerei* (−4 % M) | **+1 Tier** (1/1235) |
| ashfall_recurve | ranged 18 | ash_tyrant | D 1.3 · cc 0.08 · spd -150 · acc 3.2 | **2–3** | 2.85 | lck 3 | burn (bleibt) | **+1 Tier** (1/1075) |
| rootling_club | attack 8 | rootling_grunt | D 2.2 · hp 0.8 · acc 1 | **2.7–4.1** | 3.00 | con 1 | momentum +2 %×5 — *Wachsender Zorn (ersetzt hp-Krümel)* (−6 % M) | **+1 Tier** (1/313) |
| thornvine_whip | attack 20 | thorn_wolf | D 3.6 · spd -100 · acc 2.4 | **3.8–5.8** | 2.90 | — | bleed (bleibt) + catalyst +3 s — *Katalysator: Ranken halten länger* (−4 % M) | **+1 Tier** (1/833) |
| spectral_hunter_bow | ranged 28 | spectral_stag | D 4.2 · cd 0.16 · ev 0.6 · acc 5.6 | **3.6–6** | 3.00 | lck 1 · dex 1 | bounty +20 % vs. Slayer-Ziel — *Kopfgeldklinge des Jägers (eva-Flat → dex 1)* (−5 % M) | **+1 Tier** (1/1786) |
| witchroot_wand | magic_off 26 | bramble_witch | D 2.9 · spd -300 · acc 3.6 | **3.3–4.3** | 2.70 · Mana 8 | — | frost (bleibt) + frostbite +25 % vs. verlangsamt — *Frostbiss-Kombo* (−6 % M) | **+1 Tier** (1/625) |
| boneblade | attack 16 | skeleton_warrior | D 3 · acc 1.8 | **3.8–5.8** | 3.00 | — | execute +25 % <20 % HP — *Knochenharter Henker* (−5 % M) | **+1 Tier** (1/217) |
| bonewrought_spear | attack 20 | skeleton_spearman | D 4 · acc 2.4 | **4.7–7.9** | 3.00 | — | firstBlood +25 % — *Speer des ersten Blutes* (−5 % M) | **+1 Tier** (1/833) |
| skeletal_longbow | ranged 18 | skeleton_archer | D 1.5 · cd 0.14 · acc 4 | **1.9–3.1** | 3.00 | lck 1 | eagleEye — *Totenauge* (−5 % M) | **+1 Tier** (1/833) |
| pyre_staff | magic_off 36 | skeleton_pyroclasp | D 4.9 · acc 4.2 | **4.8–7.2** | 3.00 · Mana 9 | — | burn (bleibt) + critBurst 4 — *Funkenschlag des Scheiterhaufens* (−4 % M) | **+1 Tier** (1/1351) |
| frostbone_scepter | magic_off 28 | skeleton_icemage | D 2.4 · cc 0.03 · acc 3.6 | **2.7–4.1** | 3.00 · Mana 9 | lck 1 | frost (bleibt) + frostbite +25 % — *Frostbiss* (−6 % M) | **+1 Tier** (1/1538) |
| nekro_reaperblade | attack 40 | skeleton_nekro | D 7.4 · cc 0.05 · spd 300 · ls 0.05 · acc 4.8 | **7.8–15.2** | 3.30 | lck 2 | poison (bleibt) + lifesteal 5 % (bleibt) | **+1 Tier** (1/2222) |
| coral_shiv | attack 8 | mud_crab | D 1.2 · spd -250 · acc 1.4 | **1.8–2.4** | 2.75 | — | firstStrike ×2 — *Riff-Hinterhalt* (−6 % M) | **+1 Tier** (1/313) |
| driftwood_bow | ranged 10 | mud_crab | D 0.8 · cc 0.06 · acc 1.6 | **1.2–1.8** | 2.85 | lck 2 | ammoSaver 20 % — *Durchschuss: Treibholz splittert nicht* (−4 % M) | **+1 Tier** (1/313) |
| drowned_cutlass | attack 20 | reef_drowned | D 3.8 · acc 3 | **4.6–6.8** | 3.00 | — | bleed (bleibt) | **+1 Tier** (1/833) |
| siren_shockstaff | magic_off 36 | tide_siren | D 3 · mm 15 · acc 4.8 | **3–4.6** | 3.00 · Mana 10 | wis 2 | shock (bleibt) + manaOnKill 4 — *Seelenernte der Sirene* (−4 % M) | **+1 Tier** (1/1205) |
| abyssal_tide_bow | ranged 90 | abyssal_tide_serpent | D 9.6 · cc 0.06 · cd 0.22 · acc 17.5 | **7.4–12.4** | 3.00 | lck 4 | frost (bleibt) + frostbite +25 % — *Gezeiten-Nuke* (−6 % M) | **+1 Tier** (1/1923) |
| kraken_maw | attack 60 | deep_kraken | D 10.5 · cc 0.05 · spd 100 · acc 9.6 | **8.3–16.1** | 3.10 | lck 2 | bleed (bleibt) + overkillCarry — *Nachhall: das Maul frisst weiter* (−5 % M) | **+1 Tier** (1/1408) |
| hunting_knife | attack 12 | forest_hare | D 1.6 · cc 0.05 · spd -200 · acc 1.4 | **1.8–2.4** | 2.80 | lck 2 | bounty +20 % — *Jagdmesser (Slayer)* (−5 % M) | **+1 Tier** (1/270) |
| wolffang_spear | attack 18 | gray_wolf | D 3.4 · acc 2.2 | **3.4–5.6** | 3.00 | — | bleed (bleibt) + packLeader +25 % — *Rudelführer* (−4 % M) | **+1 Tier** (1/833) |
| antler_warbow | ranged 18 | wild_stag | D 1.4 · cd 0.14 · acc 3.6 | **1.9–3.1** | 3.00 | lck 1 | eagleEye — *Adlerauge* (−5 % M) | **+1 Tier** (1/714) |
| stagstride_longbow | ranged 24 | wild_stag | D 3.8 · cd 0.16 · spd -100 · acc 4.6 | **3.6–6** | 2.90 | lck 1 | cooldownOnKill −2 s — *Jagdrausch des Hirschschritts* (−6 % M) | **+1 Tier** (1/1786) |
| direfang_maul | attack 34 | dire_wolf | D 6 · cc 0.05 · acc 4 | **6.3–9.5** | 3.00 | lck 2 | bleed (bleibt) + everyNth 5→+100 % — *Wucht des Schreckensfangs* (−6 % M) | **+1 Tier** (1/1351) |
| talon_dagger | attack 35 | roc | D 4.8 · cc 0.06 · spd -300 · acc 3.6 | **5.3–6.7** | 2.70 | lck 2 | bleed (bleibt) | **+1 Tier** (1/526) |
| skybreaker_greatsword | attack 65 | roc_elder | D 13 · cd 0.2 · spd 200 · acc 10 | **12.4–24** | 3.20 | lck 1 | shock (bleibt) + critBurst 8 — *Funkenschlag des Himmelsbrechers* (−4 % M) | **+1 Tier** (1/2778) |
| skytalon_recurve | ranged 50 | roc_hunter | D 5.2 · cc 0.09 · spd -150 · acc 7 | **5.2–7.8** | 2.85 | lck 4 | shock (bleibt) | **+1 Tier** (1/1205) |
| stormcrest_staff | magic_off 75 | roc_storm | D 6.6 · cc 0.04 · mm 20 · acc 12 | **6.4–9.6** | 3.00 · Mana 10 | lck 2 · wis 3 | shock (bleibt) + surplus +20 % >80 % Mana — *Arkaner Überfluss* (−5 % M) | **+1 Tier** (1/2564) |
| voidwing_greatbow | ranged 99 | void_titan | D 11.2 · cc 0.05 · cd 0.35 · acc 24.5 | **8–13.3** | 3.00 | lck 4 | burn (bleibt) + eagleEye — *Boss-Bogen: 2 Effekte (legendary)* (−5 % M) | Signatur (über Tier by design) |
| slagforged_sword | attack 45 | slag_kobold | D 7 · acc 5 | **6.5–9.7** | 3.00 | — | desperation +30 % <30 % HP — *Verzweiflung aus der Schlacke* (−3 % M) | **+1 Tier** (1/476) |
| cinderfang_dagger | attack 50 | ember_elemental | D 5.8 · cc 0.08 · spd -350 · acc 6 | **6.4–8.2** | 2.65 | lck 3 | burn (bleibt) | **+1 Tier** (1/1075) |
| frostcaverns_bow | ranged 62 | frost_hound | D 7.4 · cd 0.2 · acc 12 | **6.1–10.3** | 3.00 | lck 1 | frost (bleibt) + frostbite +25 % — *Frostbiss* (−6 % M) | **+1 Tier** (1/2778) |
| emberforge_hammer | attack 52 | ember_elemental | D 8.8 · spd 150 · acc 7 | **8.8–13.2** | 3.15 | — | burn (bleibt) + everyNth 5→+100 % — *Wucht des Schmiedehammers* (−6 % M) | **+1 Tier** (1/3125) |
| frosthex_wand | magic_off 68 | frost_hexer | D 6.4 · spd -300 · mm 20 · acc 11 | **5.9–7.5** | 2.70 · Mana 8 | wis 3 | frost (bleibt) + catalyst +3 s — *Katalysator* (−4 % M) | **+1 Tier** (1/2564) |
| doomknight_cinderblade | attack 99 | charred_doomknight | D 30 · cc 0.05 · cd 0.3 · spd 600 · ls 0.07 · acc 17.5 | **19.4–37.6** | 3.60 | lck 4 | burn + lifesteal (bleiben) + execute +25 % — *Boss-Klinge: Henker (legendary, 2+)* (−5 % M) | Signatur (über Tier by design) |
| rotfang_dagger | attack 5 | rot_rat | D 1.4 · acc 1.4 | **1.8–2.4** | 3.00 | — | poison (bleibt) + plaguebearer — *Seuchenträger: Tötungen vergiften den nächsten* (−4 % M) | **+1 Tier** (1/435) |
| mirrorglass_bow | ranged 28 | gaze_basilisk | D 3.3 · cd 0.15 · acc 4.4 | **3.2–5.4** | 3.00 | lck 1 | frost (bleibt) | **+1 Tier** (1/714) |
| wailing_wand | magic_off 28 | wailing_shade | D 3.1 · spd -300 · acc 3.9 | **3.5–4.5** | 2.70 · Mana 8 | — | shock (bleibt) | **+1 Tier** (1/625) |
| cinderwretch_maul | attack 50 | forge_demon | D 7.6 · spd 150 · acc 5.6 | **7.2–10.8** | 3.15 | — | burn (bleibt) + everyNth 5→+100 % — *Wucht* (−6 % M) | **+1 Tier** (1/1075) |
| dreadfang_glaive | attack 70 | dreadfang | D 10 · cc 0.05 · acc 9 | **8.9–14.9** | 3.00 | lck 2 | bleed (bleibt) + gutter +50 % Blutungsschaden — *Ausweider* (−6 % M) | **+1 Tier** (1/2778) |
| sorrow_staff | magic_off 72 | sorrow_wraith | D 5.5 · mm 20 · acc 11 | **5.5–8.3** | 3.00 · Mana 10 | wis 3 | burn (bleibt) + manaOnKill 5 — *Seelenernte* (−4 % M) | **+1 Tier** (1/2564) |
| abyssal_devourer_fang | attack 90 | abyssal_devourer | D 9.5 · cc 0.1 · spd -400 · acc 15 | **9.2–11.8** | 2.60 | lck 4 | poison (bleibt) + gutter +50 % DoT — *Ausweider der Tiefe* (−6 % M) | **+1 Tier** (1/1724) |

### 3.4 Munition
Alle Pfeil-Werte unverändert außer **godiron_arrow: ammoDamage 3.8 → 3.2** (H4-Spitzen-Trim; bleibt klar
über aetherium_arrow 2.0, der Sprung 2.0→3.2 statt 2.0→3.8 entschärft die BiS-Ranged-Decke).

### 3.5 Offhand-„Waffen" (focus/Totems) — reine Attribut-Träger
Die focus-Linie (Tabelle §3.2) und die drei Beschwörer-Totems verlieren ihre Damage-/acc-/Mana-Flats
zugunsten Attributen (INT/WIS/LCK; Konversion §3.1.5). Damit gilt die strikte Item-Philosophie auch hier —
der Range-Träger ist IMMER die Mainhand.

| id | ALT | **NEU modifiers** | Effekt |
|---|---|---|---|
| stormcaller_totem | mag 0.5 · acc 0.8 · mm 12 · mr 0.4 · wis 0.5 | **int 1 · wis 3** | — |
| tidecaller_focus | mag 0.8 · acc 1.4 · mm 18 · mr 0.5 | **int 1 · wis 3** | — |
| beastcaller_totem | mag 0.6 · acc 1.2 · mm 16 · mr 0.4 | **int 1 · wis 2 · lck 1** | packLeader 25 % — *Rudelführer* |

---

## §4 [C] Teil B — Strikte-Leiter-Respread (Rüstung + Schmuck, ALLE Slots)

### 4.1 Regeln (Chef-Go liegt vor) + Guard-Verschärfung [L]/[K]
1. **Streng steigend:** innerhalb jeder Craft-Leiter (Metall/Leder/Stoff/Schmuck) steigt die
   Attribut-SUMME je Slot mit JEDEM Tier-Schritt um ≥ +1 Punkt. Kein Gleichstand, keine Duplikate mehr
   (vorher: 16 Metall-Duplikate, u. a. gauntlets iron→bloodiron 7× identisch `str1 con1`).
2. **Kumulative Rundung:** die Leitern unten sind gegen das ALT-Budget respreadet — Reste wandern aufwärts;
   die erzwungene Anhebung der Klein-Slots (gloves/boots/shields, Σ ≥ Tier-Index) wird über den
   STR/DEX/INT-Anteil absorbiert und war Teil der §0-Paritätsmessung (Waffen-M-Linien sind dagegen geeicht).
   Worn-Set-Verschiebungen (6 Teile Metall): str +1…+21 tier-progressiv, con +2 (mittel) bis +13 (BiS) —
   EHP-Wirkung in §0.3 gemessen und im Fenster.
3. **Kein Stück mit 0 Attributen** (copper/bronze_gauntlets+sabatons, worn_workgloves, wooden_shield,
   leather_cape, cutpurse_ring, garnet_ring/amulet — alle gefixt; Einzelstücke §4.6).
4. **Monotonie-Guard verschärfen [L]:** für die vier Craft-Leitern gilt künftig STRENG STEIGEND
   (Σ modifiers + Boost-Äquivalent je Tier-Schritt ≥ +1) statt „nicht-fallend"; übrige Familien bleiben
   nicht-fallend. **Chase-Items (§5) sind dokumentierte Ausnahme-Klasse:** über-Tier ist GEWOLLT — der
   Leiter-Vergleich gegen ihr Anforderungs-Tier darf überschießen (ladderExceptions = Chase-Liste §5).
5. Alle Boost-Zeilen (`skillBoost`) bleiben UNVERÄNDERT wie in itemization-2-spec §6 — nur `modifiers` ändern sich.

### 4.2–4.5 Leitern (id → ALT → NEU; Σ in Klammern — Apply-Artefakt)

#### Metall — medhelm
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| copper_medhelm | con 1 (1) | **con 1** (1) |
| bronze_medhelm | str 1 · con 1 (2) | **str 1 · con 1** (2) |
| iron_medhelm | str 1 · con 1 (2) | **str 1 · con 2** (3) |
| steel_medhelm | str 1 · con 1 (2) | **str 2 · con 2** (4) |
| blacksteel_medhelm | str 1 · con 1 (2) | **str 2 · con 3** (5) |
| mithril_medhelm | str 1 · con 2 (3) | **str 3 · con 3** (6) |
| adamantium_medhelm | str 2 · con 2 (4) | **str 3 · con 4** (7) |
| runite_medhelm | str 3 · con 3 (6) | **str 4 · con 4** (8) |
| bloodiron_medhelm | str 3 · con 3 (6) | **str 5 · con 4** (9) |
| titanium_medhelm | str 4 · con 4 (8) | **str 6 · con 5** (11) |
| aetherium_medhelm | str 5 · con 5 (10) | **str 8 · con 6** (14) |
| godiron_medhelm | str 7 · con 6 (13) | **str 10 · con 7** (17) |

#### Metall — fullhelm
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| copper_fullhelm | con 1 (1) | **str 1 · con 1** (2) |
| bronze_fullhelm | str 1 · con 1 (2) | **str 1 · con 2** (3) |
| iron_fullhelm | str 1 · con 1 (2) | **str 1 · con 3** (4) |
| steel_fullhelm | str 1 · con 2 (3) | **str 2 · con 3** (5) |
| blacksteel_fullhelm | str 1 · con 2 (3) | **str 2 · con 4** (6) |
| mithril_fullhelm | str 1 · con 3 (4) | **str 3 · con 4** (7) |
| adamantium_fullhelm | str 2 · con 4 (6) | **str 4 · con 4** (8) |
| runite_fullhelm | str 3 · con 4 (7) | **str 5 · con 4** (9) |
| bloodiron_fullhelm | str 3 · con 5 (8) | **str 6 · con 5** (11) |
| titanium_fullhelm | str 4 · con 6 (10) | **str 7 · con 6** (13) |
| aetherium_fullhelm | str 5 · con 8 (13) | **str 9 · con 7** (16) |
| godiron_fullhelm | str 7 · con 9 (16) | **str 11 · con 8** (19) |

#### Metall — platebody
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| copper_platebody | str 1 · con 1 (2) | **str 1 · con 1** (2) |
| bronze_platebody | str 1 · con 2 (3) | **str 1 · con 2** (3) |
| iron_platebody | str 2 · con 2 (4) | **str 2 · con 3** (5) |
| steel_platebody | str 3 · con 4 (7) | **str 3 · con 4** (7) |
| blacksteel_platebody | str 3 · con 5 (8) | **str 4 · con 4** (8) |
| mithril_platebody | str 3 · con 6 (9) | **str 6 · con 3** (9) |
| adamantium_platebody | str 4 · con 8 (12) | **str 7 · con 4** (11) |
| runite_platebody | str 6 · con 9 (15) | **str 8 · con 5** (13) |
| bloodiron_platebody | str 8 · con 11 (19) | **str 10 · con 7** (17) |
| titanium_platebody | str 10 · con 14 (24) | **str 13 · con 9** (22) |
| aetherium_platebody | str 13 · con 16 (29) | **str 18 · con 12** (30) |
| godiron_platebody | str 15 · con 20 (35) | **str 22 · con 16** (38) |

#### Metall — chainbody
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| copper_chainbody | con 1 (1) | **con 1** (1) |
| bronze_chainbody | con 1 (1) | **con 2** (2) |
| iron_chainbody | con 2 (2) | **con 3** (3) |
| steel_chainbody | con 2 (2) | **con 4** (4) |
| blacksteel_chainbody | con 3 (3) | **con 5** (5) |
| mithril_chainbody | con 4 (4) | **con 6** (6) |
| adamantium_chainbody | con 5 (5) | **con 7** (7) |
| runite_chainbody | con 6 (6) | **con 8** (8) |
| bloodiron_chainbody | con 7 (7) | **con 9** (9) |
| titanium_chainbody | con 8 (8) | **con 10** (10) |
| aetherium_chainbody | con 10 (10) | **con 11** (11) |
| godiron_chainbody | con 12 (12) | **con 12** (12) |

#### Metall — platelegs
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| copper_platelegs | str 1 · con 1 (2) | **str 1 · con 1** (2) |
| bronze_platelegs | str 1 · con 1 (2) | **str 1 · con 2** (3) |
| iron_platelegs | str 2 · con 1 (3) | **str 2 · con 2** (4) |
| steel_platelegs | str 2 · con 2 (4) | **str 2 · con 3** (5) |
| blacksteel_platelegs | str 2 · con 3 (5) | **str 3 · con 3** (6) |
| mithril_platelegs | str 3 · con 4 (7) | **str 4 · con 3** (7) |
| adamantium_platelegs | str 3 · con 4 (7) | **str 4 · con 4** (8) |
| runite_platelegs | str 4 · con 5 (9) | **str 5 · con 4** (9) |
| bloodiron_platelegs | str 6 · con 7 (13) | **str 7 · con 5** (12) |
| titanium_platelegs | str 7 · con 8 (15) | **str 8 · con 7** (15) |
| aetherium_platelegs | str 8 · con 10 (18) | **str 11 · con 8** (19) |
| godiron_platelegs | str 10 · con 12 (22) | **str 14 · con 10** (24) |

#### Metall — gauntlets
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| copper_gauntlets | — (0) | **con 1** (1) |
| bronze_gauntlets | — (0) | **str 1 · con 1** (2) |
| iron_gauntlets | str 1 · con 1 (2) | **str 2 · con 1** (3) |
| steel_gauntlets | str 1 · con 1 (2) | **str 3 · con 1** (4) |
| blacksteel_gauntlets | str 1 · con 1 (2) | **str 3 · con 2** (5) |
| mithril_gauntlets | str 1 · con 1 (2) | **str 4 · con 2** (6) |
| adamantium_gauntlets | str 1 · con 1 (2) | **str 5 · con 2** (7) |
| runite_gauntlets | str 1 · con 1 (2) | **str 6 · con 2** (8) |
| bloodiron_gauntlets | str 1 · con 1 (2) | **str 6 · con 3** (9) |
| titanium_gauntlets | str 1 · con 2 (3) | **str 7 · con 3** (10) |
| aetherium_gauntlets | str 2 · con 2 (4) | **str 8 · con 3** (11) |
| godiron_gauntlets | str 2 · con 2 (4) | **str 9 · con 4** (13) |

#### Metall — sabatons
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| copper_sabatons | — (0) | **con 1** (1) |
| bronze_sabatons | — (0) | **str 1 · con 1** (2) |
| iron_sabatons | con 1 (1) | **str 1 · con 2** (3) |
| steel_sabatons | con 1 (1) | **str 2 · con 2** (4) |
| blacksteel_sabatons | str 1 · con 1 (2) | **str 3 · con 2** (5) |
| mithril_sabatons | str 1 · con 1 (2) | **str 4 · con 2** (6) |
| adamantium_sabatons | str 1 · con 1 (2) | **str 4 · con 3** (7) |
| runite_sabatons | str 1 · con 1 (2) | **str 5 · con 3** (8) |
| bloodiron_sabatons | str 1 · con 1 (2) | **str 6 · con 3** (9) |
| titanium_sabatons | str 1 · con 2 (3) | **str 6 · con 4** (10) |
| aetherium_sabatons | str 1 · con 2 (3) | **str 8 · con 4** (12) |
| godiron_sabatons | str 1 · con 2 (3) | **str 9 · con 4** (13) |

#### Metall — kiteshield
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| copper_kiteshield | con 1 (1) | **con 1** (1) |
| bronze_kiteshield | con 1 (1) | **con 2** (2) |
| iron_kiteshield | con 1 (1) | **con 3** (3) |
| steel_kiteshield | con 2 (2) | **con 4** (4) |
| blacksteel_kiteshield | con 2 (2) | **con 5** (5) |
| mithril_kiteshield | con 3 (3) | **con 6** (6) |
| adamantium_kiteshield | con 3 (3) | **con 7** (7) |
| runite_kiteshield | con 4 (4) | **con 8** (8) |
| bloodiron_kiteshield | con 5 (5) | **con 9** (9) |
| titanium_kiteshield | con 6 (6) | **con 10** (10) |
| aetherium_kiteshield | con 7 (7) | **con 11** (11) |
| godiron_kiteshield | con 8 (8) | **con 12** (12) |

#### Metall — towershield
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| copper_towershield | con 1 (1) | **con 2** (2) |
| bronze_towershield | con 1 (1) | **con 3** (3) |
| iron_towershield | con 1 (1) | **con 4** (4) |
| steel_towershield | con 2 (2) | **con 5** (5) |
| blacksteel_towershield | con 2 (2) | **con 6** (6) |
| mithril_towershield | con 3 (3) | **con 7** (7) |
| adamantium_towershield | con 4 (4) | **con 8** (8) |
| runite_towershield | con 4 (4) | **con 9** (9) |
| bloodiron_towershield | con 5 (5) | **con 10** (10) |
| titanium_towershield | con 6 (6) | **con 11** (11) |
| aetherium_towershield | con 8 (8) | **con 12** (12) |
| godiron_towershield | con 9 (9) | **con 13** (13) |

#### Leder — Helm
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| cured_leather_cap | con 1 (1) | **con 1** (1) |
| hardened_leather_helm | con 1 (1) | **con 2** (2) |
| scaled_leather_helm | con 2 (2) | **dex 1 · con 2** (3) |
| studded_leather_helm | dex 1 · con 2 (3) | **dex 1 · con 3** (4) |
| ironhide_helm | dex 1 · con 3 (4) | **dex 1 · con 4** (5) |
| warhide_helm | dex 1 · con 3 (4) | **dex 1 · con 5** (6) |
| dragonhide_helm | dex 1 · con 4 (5) | **dex 1 · con 6** (7) |
| shadowhide_helm | dex 2 · con 6 (8) | **dex 2 · con 6** (8) |
| voidhide_helm | dex 2 · con 6 (8) | **dex 2 · con 7** (9) |

#### Leder — Body
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| cured_leather_body | con 2 (2) | **con 2** (2) |
| hardened_leather_body | con 3 (3) | **con 3** (3) |
| scaled_leather_body | con 3 (3) | **con 4** (4) |
| studded_leather_body | dex 1 · con 4 (5) | **dex 1 · con 4** (5) |
| ironhide_body | dex 2 · con 5 (7) | **dex 1 · con 5** (6) |
| warhide_body | dex 2 · con 6 (8) | **dex 2 · con 6** (8) |
| dragonhide_body | dex 3 · con 7 (10) | **dex 2 · con 8** (10) |
| shadowhide_body | dex 4 · con 10 (14) | **dex 3 · con 10** (13) |
| voidhide_body | dex 4 · con 11 (15) | **dex 3 · con 12** (15) |

#### Leder — Legs
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| cured_leather_legs | con 1 (1) | **con 1** (1) |
| hardened_leather_legs | con 2 (2) | **con 2** (2) |
| scaled_leather_legs | con 2 (2) | **con 3** (3) |
| studded_leather_legs | dex 1 · con 3 (4) | **dex 1 · con 3** (4) |
| ironhide_legs | dex 1 · con 4 (5) | **dex 1 · con 4** (5) |
| warhide_legs | dex 1 · con 4 (5) | **dex 1 · con 5** (6) |
| dragonhide_legs | dex 2 · con 6 (8) | **dex 2 · con 6** (8) |
| shadowhide_legs | dex 2 · con 8 (10) | **dex 2 · con 8** (10) |
| voidhide_legs | dex 2 · con 8 (10) | **dex 2 · con 9** (11) |

#### Leder — Vambraces
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| cured_leather_vambraces | con 1 (1) | **con 1** (1) |
| hardened_leather_vambraces | con 1 (1) | **con 2** (2) |
| scaled_leather_vambraces | con 1 (1) | **con 3** (3) |
| studded_leather_vambraces | con 1 (1) | **dex 1 · con 3** (4) |
| ironhide_vambraces | dex 1 · con 2 (3) | **dex 1 · con 4** (5) |
| warhide_vambraces | dex 1 · con 2 (3) | **dex 1 · con 5** (6) |
| dragonhide_vambraces | dex 2 · con 3 (5) | **dex 1 · con 6** (7) |
| shadowhide_vambraces | dex 2 · con 4 (6) | **dex 2 · con 6** (8) |
| voidhide_vambraces | dex 2 · con 4 (6) | **dex 2 · con 7** (9) |

#### Leder — Boots
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| cured_leather_boots | con 1 (1) | **con 1** (1) |
| hardened_leather_boots | con 1 (1) | **con 2** (2) |
| scaled_leather_boots | con 1 (1) | **con 3** (3) |
| studded_leather_boots | con 1 (1) | **dex 1 · con 3** (4) |
| ironhide_boots | dex 1 · con 2 (3) | **dex 1 · con 4** (5) |
| warhide_boots | dex 1 · con 2 (3) | **dex 1 · con 5** (6) |
| dragonhide_boots | dex 1 · con 3 (4) | **dex 1 · con 6** (7) |
| shadowhide_boots | dex 1 · con 4 (5) | **dex 2 · con 6** (8) |
| voidhide_boots | dex 2 · con 4 (6) | **dex 2 · con 7** (9) |

#### Stoff — Helm
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| apprentice_robe_hat | con 1 (1) | **con 1** (1) |
| frost_circlet | con 1 · int 1 (2) | **con 1 · int 1** (2) |
| ember_robe_hood | con 2 · int 2 · wis 1 (5) | **con 2 · int 2 · wis 1** (5) |
| aether_hood | con 2 · int 2 · wis 1 (5) | **con 2 · int 3 · wis 1** (6) |
| arcane_cowl | con 3 · int 3 · wis 1 (7) | **con 3 · int 3 · wis 1** (7) |
| runewoven_cowl | dex 1 · con 3 · int 4 · wis 2 (10) | **con 3 · int 5 · wis 2** (10) |
| godspark_mitre | dex 1 · con 4 · int 6 · wis 3 · lck 2 (16) | **con 4 · int 7 · wis 4 · lck 1** (16) |
| voidweave_mitre | dex 1 · con 5 · int 8 · wis 4 · lck 2 (20) | **con 5 · int 9 · wis 5 · lck 1** (20) |

#### Stoff — Body
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| apprentice_robe_body | con 1 · int 1 (2) | **con 1 · int 1** (2) |
| frost_robe_body | con 2 · int 2 (4) | **con 2 · int 2** (4) |
| ember_robe_body | con 3 · int 3 · wis 1 (7) | **con 3 · int 3 · wis 1** (7) |
| aether_robe_body | dex 1 · con 4 · int 4 · wis 2 (11) | **con 4 · int 5 · wis 2** (11) |
| arcane_robe_body | dex 1 · con 4 · int 5 · wis 2 (12) | **con 4 · int 6 · wis 2** (12) |
| runewoven_robe_body | dex 1 · con 5 · int 7 · wis 2 (15) | **con 5 · int 8 · wis 2** (15) |
| godspark_vestment | dex 1 · con 6 · int 9 · wis 3 · lck 4 (23) | **con 6 · int 10 · wis 5 · lck 2** (23) |
| voidweave_vestment | dex 1 · con 8 · int 12 · wis 4 · lck 5 (30) | **con 8 · int 13 · wis 7 · lck 2** (30) |

#### Stoff — Legs
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| apprentice_robe_legs | con 1 (1) | **con 1** (1) |
| frost_robe_legs | con 2 · int 1 (3) | **con 2 · int 1** (3) |
| ember_robe_legs | con 2 · int 2 (4) | **con 2 · int 2** (4) |
| aether_robe_legs | con 3 · int 3 (6) | **con 3 · int 4** (7) |
| arcane_robe_legs | con 3 · int 3 (6) | **con 3 · int 4 · wis 1** (8) |
| runewoven_robe_legs | con 4 · int 5 (9) | **con 4 · int 6** (10) |
| godspark_skirt | dex 1 · con 5 · int 6 · wis 1 (13) | **con 5 · int 7 · wis 2** (14) |
| voidweave_skirt | dex 1 · con 6 · int 8 · wis 2 (17) | **con 6 · int 9 · wis 3** (18) |

#### Stoff — Gloves
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| apprentice_mitts | con 1 (1) | **con 1** (1) |
| frost_handwraps | con 1 · int 1 (2) | **con 1 · int 1** (2) |
| ember_handwraps | con 2 · int 2 (4) | **con 2 · int 2** (4) |
| aether_gloves | con 2 · int 2 · wis 1 (5) | **con 2 · int 2 · wis 1** (5) |
| arcane_mitts | con 3 · int 3 · wis 1 (7) | **con 3 · int 3 · wis 1** (7) |
| runewoven_handwraps | dex 1 · con 4 · int 4 · wis 1 (10) | **con 4 · int 5 · wis 1** (10) |
| godspark_handwraps | dex 1 · con 4 · int 6 · wis 2 · lck 1 (14) | **con 4 · int 7 · wis 3** (14) |
| voidweave_handwraps | dex 1 · con 5 · int 8 · wis 3 · lck 2 (19) | **con 5 · int 9 · wis 4 · lck 1** (19) |

#### Stoff — Boots
| id | ALT modifiers (Σ) | **NEU modifiers** (Σ) |
|---|---|---|
| apprentice_slippers | con 1 (1) | **con 1** (1) |
| frost_treads | con 1 · int 1 (2) | **con 1 · int 1** (2) |
| ember_sandals | con 2 · int 1 (3) | **con 2 · int 1** (3) |
| aether_slippers | con 2 · int 2 (4) | **con 2 · int 2** (4) |
| arcane_slippers | con 3 · int 3 (6) | **con 3 · int 3** (6) |
| runewoven_treads | dex 1 · con 4 · int 4 (9) | **con 4 · int 5** (9) |
| godspark_sandals | dex 1 · con 4 · int 5 · wis 1 · lck 1 (12) | **con 4 · int 6 · wis 2** (12) |
| voidweave_sandals | dex 1 · con 5 · int 7 · wis 2 · lck 2 (17) | **con 5 · int 8 · wis 3 · lck 1** (17) |

#### Schmuck — jc-Ring-Leiter (Boosts UNVERÄNDERT)
| id | req jc | ALT modifiers (Σ) | **NEU modifiers** (Σ) | Boost (bleibt) |
|---|---|---|---|---|
| garnet_ring | 1 | — (0) | **str 1** (1) | power+1 |
| sapphire_ring | 15 | int 1 (1) | **int 2** (2) | attack+1 |
| gemstone_ring | 20 | lck 1 (1) | **con 1 · lck 2** (3) | attack+1 |
| ruby_ring | 34 | str 1 · lck 1 (2) | **str 2 · lck 2** (4) | power+1 |
| bloodstone_ring | 44 | str 2 · dex 1 · lck 2 (5) | **str 2 · dex 1 · lck 2** (5) | power+1 |
| spellbinder_ring | 46 | int 2 (2) | **int 4 · lck 2** (6) | magic_off+2 |
| diamond_ring | 55 | con 1 (1) | **dex 1 · con 4 · lck 2** (7) | attack+2 |
| onyx_ring | 70 | str 2 · dex 1 · int 2 · lck 2 (7) | **str 2 · dex 1 · int 2 · lck 3** (8) | power+3 |
| voidstone_ring | 85 | str 3 · dex 1 · int 4 · lck 3 (11) | **str 3 · dex 1 · int 4 · lck 3** (11) | power+3 |
| godgem_ring | 95 | str 4 · dex 2 · int 5 · lck 6 (17) | **str 4 · dex 2 · int 5 · lck 6** (17) | power+4 |

#### Schmuck — jc-Amulett-Leiter (Boosts UNVERÄNDERT)
| id | req jc | ALT modifiers (Σ) | **NEU modifiers** (Σ) | Boost (bleibt) |
|---|---|---|---|---|
| garnet_amulet | 3 | — (0) | **con 1** (1) | defence+1 |
| soul_amulet | 15 | con 1 · int 1 (2) | **con 1 · int 1** (2) | magic_off+1 |
| sapphire_amulet | 18 | con 1 · int 1 (2) | **con 1 · int 2** (3) | magic_off+1 |
| gemstone_amulet | 26 | con 1 · lck 1 (2) | **con 2 · lck 2** (4) | attack+1 |
| alpha_fang_amulet | 36 | str 3 · lck 3 (6) | **str 3 · lck 3** (6) | power+1 |
| ruby_amulet | 38 | str 2 · con 1 · lck 1 (4) | **str 3 · con 2 · lck 2** (7) | power+1 |
| bloodstone_amulet | 48 | str 2 · con 1 · lck 2 (5) | **str 3 · con 2 · lck 3** (8) | defence+2 |
| diamond_amulet | 60 | con 1 · lck 1 (2) | **dex 2 · con 4 · lck 3** (9) | defence+2 |
| stormcaller_amulet | 65 | dex 1 · int 3 · lck 3 (7) | **dex 1 · int 5 · lck 4** (10) | magic_off+3 |
| onyx_amulet | 75 | dex 1 · con 2 · lck 2 (5) | **dex 2 · con 4 · lck 5** (11) | defence+3 |
| voidstone_amulet | 88 | dex 1 · con 3 · lck 3 (7) | **dex 2 · con 5 · lck 5** (12) | defence+3 |
| godgem_amulet | 99 | dex 1 · con 3 · lck 6 (10) | **dex 2 · con 4 · lck 7** (13) | defence+5 |

### 4.6 Sets (nur die 10 GEÄNDERTEN; alle anderen 20 unverändert) & Einzelstück-Fixes

| Set-id | ALT modifiers | **NEU modifiers** | skillBoost |
|---|---|---|---|
| ember_robe_set | dex 1 · int 2 · lck 1 | **int 3 · wis 1** | bleibt (MagieOff +2) |
| aether_robe_set | dex 1 · int 3 · lck 2 | **int 4 · wis 1 · lck 1** | bleibt |
| arcane_robe_set | dex 1 · int 3 · lck 2 | **int 4 · wis 1 · lck 1** | bleibt |
| runewoven_robe_set | dex 1 · int 4 · lck 3 | **int 5 · wis 2 · lck 1** | bleibt |
| godspark_vestment_set | dex 1 · int 4 · lck 5 | **int 5 · wis 3 · lck 2** | bleibt |
| voidweave_set | dex 1 · int 5 · lck 6 | **int 6 · wis 3 · lck 3** | bleibt |
| frost_robe_set | int 1 | **int 1** (unverändert, nur zur Vollständigkeit) | bleibt |
| voidhide_set | dex 2 · con 1 · lck 6 | **dex 1 · con 2 · lck 6** | bleibt (Ranged +5) |
| aetherium_set | str 10 · con 13 · lck 6 | **str 12 · con 13 · lck 6** | bleibt (Power +4) |
| godiron_set | str 13 · con 17 · lck 7 | **str 16 · con 17 · lck 7** | bleibt (Power +5) |

Kein Set erhält Tempo-Boni — der frühere H5-Vorschlag (Set-`attackIntervalMs`) ist durch das
Waffen-2.0-Spitzentempo (§3.1.2) ERSETZT; `SetDef.bonus` bleibt leer/legacy.

**Einzelstück-Fixes (0-Attribut-Verbot, §4.1.3):** wooden_shield → `con 1` · worn_workgloves → `con 1` ·
leather_cape → `con 1` · cutpurse_ring → `lck 1` (+Chase §5) · garnet_ring → `str 1` · garnet_amulet → `con 1`
(beide in der Schmuck-Leiter §4.5 enthalten). fang_necklace/warband_signet/grave_warden_band/
heartforged_pendant sind eigene Familien (kein Leiter-Zwang) und bleiben unverändert.

---

## §5 [C] Chase-Doktrin — sehr rare Drops schlagen über ihr Tier

### 5.1 Regeln (Chef-Philosophie, verbindlich)
- **Drop ≤ 1/200:** Stat-Budget des NÄCHSTEN Tiers (Attribut-Paket bzw. Waffen-Spanne der nächsthöheren
  Stufe), Requirements bleiben die der Drop-Quelle. Umsetzung Rüstung/Schmuck: je Attribut
  `max(alt+1, round(alt·1.3))`; Waffen: §3.1.8.
- **Drop ≤ ~1/1000:** zusätzlich eine Effekt-Stufe: bestehender Skill-Boost +1 (Cap 5) bzw. ein NEUER
  thematischer +1-Boost; Waffen bekommen einen Palette-Effekt (§3.3). `reg`/`ls`-Effektzeilen bleiben erhalten.
- **Signaturen (idol_*/slayer_*, legendary/godly) sind bereits Über-Tier by design** — KEINE Doppel-Inflation.
- **Guard-Ausnahmeklasse [L]:** die Chase-Liste (= alle Zeilen unten + §3.3-„+1 Tier"-Waffen) wird als
  `CHASE_ITEMS` gepflegt: (a) Monotonie-Leitern überspringen sie, (b) der Boost-Platzierungs-Guard erlaubt
  ihnen Boosts wie Signaturen, (c) `thorns` ist NUR hier auf Rüstung erlaubt.
- Sonderfall **thornmail_gauntlets** (1/625, rootling_treemonster): statt Attribut-Inflation bekommt es
  die Palette-Nr. 35 — `thorns 1.5` („Spiegelhaut: Angreifer erleiden 1.5 Schaden") + NEU-Werte laut Tabelle.

### 5.2 Chase- & Fix-Tabelle Rüstung/Schmuck (Nicht-Leiter-Equipment; nur GEÄNDERTE Zeilen gelistet —
alle nicht gelisteten Nicht-Leiter-Stücke bleiben exakt wie sie sind)

| id | slot | Drop | ALT modifiers | ALT boost | **NEU modifiers** | **NEU boost/Effekt** | chase |
|---|---|---|---|---|---|---|---|
| wooden_shield | offhand | goblin_shaman | — | — | con 1 | — | — (1/13) |
| leather_cape | cape | — | — | defence+1 | con 1 | defence+1 | — (0-Attribut-Fix) |
| wattle_shield | offhand | cow | con 1 | — | con 2 | — | **+1 Tier** (1/435) |
| cowhide_cap | helmet | chicken | con 1 | — | con 2 | — | **+1 Tier** (1/526) |
| cowhide_jerkin | body | boar | con 2 | — | con 3 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/1449) |
| hide_leggings | legs | boar | con 1 | — | con 2 | — | **+1 Tier** (1/357) |
| worn_workgloves | gloves | chicken | — | — | con 2 | — | **+1 Tier** (1/526) |
| muckboots | boots | cow | con 1 | — | con 2 | — | **+1 Tier** (1/435) |
| field_cape | cape | boar | con 1 | defence+1 | con 2 | defence+1 | **+1 Tier** (1/357) |
| boartusk_ring | ring1 | bull_boss | str 1 · con 1 | power+1 | str 2 · con 2 | power+1 | **+1 Tier** (1/526) |
| drovers_charm | amulet | boar | con 1 | defence+1 | con 2 | defence+2 (Chase-Stufe) | **+1 Tier** (1/1449) |
| bulls_heart_pendant | amulet | bull_boss | str 2 · con 3 | defence+1 | str 3 · con 4 | defence+2 (Chase-Stufe) | **+1 Tier** (1/1351) |
| goblin_buckler | offhand | goblin_spearman | con 1 | — | con 2 | — | **+1 Tier** (1/357) |
| bonepatch_helm | helmet | goblin | con 1 | — | con 2 | — | **+1 Tier** (1/526) |
| warband_hauberk | body | goblin_crossbower | con 2 | — | con 3 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/1235) |
| goblin_warkilt | legs | goblin_butcher | con 2 | — | con 3 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/1075) |
| rivetfist_gloves | gloves | goblin_spearman | str 1 · con 1 | — | str 2 · con 2 | — | **+1 Tier** (1/357) |
| scavenger_boots | boots | goblin_rogue | con 1 | — | con 2 | — | **+1 Tier** (1/357) |
| warbanner_cape | cape | goblin_warlock | con 1 | defence+1 | con 2 | defence+1 | **+1 Tier** (1/526) |
| cutpurse_ring | ring1 | goblin_rogue | — | attack+1 | lck 2 | attack+1 | **+1 Tier** (1/357) |
| felmagician_eye | amulet | goblin_felmagician | int 3 · wis 4 | attack+1 | int 4 · wis 5 | attack+2 (Chase-Stufe) | **+1 Tier** (1/2703) |
| chitin_helm | helmet | pitch_beetle | con 1 | — | con 2 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/1000) |
| ashplate_cuirass | body | ash_tyrant | str 1 · con 3 | — | str 2 · con 4 | — | **+1 Tier** (1/435) |
| sootscale_greaves | legs | pitch_beetle | con 2 | — | con 3 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/1000) |
| ashen_gauntlets | gloves | ash_rat | str 1 · con 1 | — | str 2 · con 2 | — | **+1 Tier** (1/435) |
| dustwalker_boots | boots | dust_vulture | con 1 | — | con 2 | — | **+1 Tier** (1/357) |
| smokeweave_cape | cape | mire_crawler | con 1 · int 1 | defence+1 | con 2 · int 2 | defence+2 (Chase-Stufe) | **+1 Tier** (1/1235) |
| cinderloop_ring | ring1 | ash_tyrant | str 1 · con 1 · lck 3 | power+1 | str 2 · con 2 · lck 4 | power+1 | **+1 Tier** (1/435) |
| ash_tyrant_crown | helmet | ash_tyrant | str 3 · con 3 · lck 5 | — | str 4 · con 4 · lck 7 | NEU power+1 (Chase-Stufe) | **+1 Tier** (1/3125) |
| bark_bulwark | offhand | moss_golem | con 3 | — | con 4 | — | **+1 Tier** (1/714) |
| mossweave_leggings | legs | moss_golem | con 3 | — | con 4 | — | **+1 Tier** (1/714) |
| thornmail_gauntlets | gloves | rootling_treemonster | str 1 · con 1 | — | str 2 · con 2 | — | **+1 Tier** (1/625) |
| wildwood_treads | boots | spectral_stag | con 1 | — | con 2 | — | **+1 Tier** (1/714) |
| soulopal_band | ring1 | forest_warden | str 1 · dex 1 · int 1 · lck 2 | power+1 | str 2 · dex 2 · int 2 · lck 3 | power+1 | **+1 Tier** (1/357) |
| soulthorn_pendant | amulet | forest_warden | str 1 · dex 1 · con 1 · int 1 · lck 1 | power+1 | str 2 · dex 2 · con 2 · int 2 · lck 2 | power+2 (Chase-Stufe) | **+1 Tier** (1/909) |
| warden_greatcloak | cape | forest_warden | dex 1 · int 2 | defence+3 | dex 2 · int 3 | defence+4 (Chase-Stufe) | **+1 Tier** (1/2564) |
| cryptguard_helm | helmet | skeleton_warrior | con 2 | — | con 3 | — | **+1 Tier** (1/833) |
| gravesteel_cuirass | body | skeleton_pyroclasp | str 1 · con 5 | — | str 2 · con 7 | NEU power+1 (Chase-Stufe) | **+1 Tier** (1/1351) |
| tombplate_greaves | legs | skeleton_butcher | con 3 | — | con 4 | — | **+1 Tier** (1/714) |
| boneknuckle_gauntlets | gloves | skeleton_warrior | str 1 · con 1 | — | str 2 · con 2 | — | **+1 Tier** (1/833) |
| gravetread_sabatons | boots | skeleton_spearman | con 1 | — | con 2 | — | **+1 Tier** (1/833) |
| shroud_of_the_dead | cape | skeleton_icemage | con 1 · int 2 · wis 3 | defence+1 | con 2 · int 3 · wis 4 | defence+2 (Chase-Stufe) | **+1 Tier** (1/1538) |
| bonecharm_amulet | amulet | skeleton_butcher | str 1 · con 1 | power+1 | str 2 · con 2 | power+1 | **+1 Tier** (1/714) |
| gravewarden_greatshield | offhand | skeleton_spearman | con 3 | — | con 4 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/2174) |
| necrosignet_ring | ring1 | skeleton_nekro | str 2 · con 1 · int 2 · lck 3 | power+1 | str 3 · con 2 · int 3 · lck 4 | power+1 | **+1 Tier** (1/769) |
| reefscale_helm | helmet | reef_drowned | con 2 | — | con 3 | — | **+1 Tier** (1/833) |
| tidewoven_leggings | legs | tide_siren | con 5 · int 1 | — | con 7 · int 2 | NEU magic_off+1 (Chase-Stufe) | **+1 Tier** (1/1205) |
| barnacle_gauntlets | gloves | reef_drowned | con 1 | — | con 2 | — | **+1 Tier** (1/833) |
| tidewalker_boots | boots | tide_siren | dex 1 · con 3 | — | dex 2 · con 4 | NEU ranged+1 (Chase-Stufe) | **+1 Tier** (1/1205) |
| mariner_cloak | cape | tide_siren | dex 1 · con 1 | defence+1 | dex 2 · con 2 | defence+1 | **+1 Tier** (1/476) |
| krakenhide_cuirass | body | deep_kraken | con 9 | — | con 12 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/1408) |
| abyssal_signet | ring1 | abyssal_tide_serpent | dex 1 · con 2 · int 2 · lck 3 | magic_off+3 | dex 2 · con 3 · int 3 · lck 4 | magic_off+4 (Chase-Stufe) | **+1 Tier** (1/1923) |
| crabshell_bulwark | offhand | mud_crab | con 2 | — | con 3 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/1235) |
| pearl_of_the_deep | amulet | deep_kraken | con 5 · int 4 · wis 7 | defence+3 | con 7 · int 5 · wis 9 | defence+4 (Chase-Stufe) | **+1 Tier** (1/1408) |
| wolfpelt_hood | helmet | gray_wolf | con 2 | — | con 3 | — | **+1 Tier** (1/833) |
| stagleather_chaps | legs | wild_stag | con 3 | — | con 4 | — | **+1 Tier** (1/714) |
| clawguard_gloves | gloves | dire_wolf | str 1 · con 1 | — | str 2 · con 2 | — | **+1 Tier** (1/526) |
| padfoot_boots | boots | forest_hare | con 1 | — | con 2 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/1075) |
| pelt_mantle | cape | wild_stag | con 1 | defence+1 | con 2 | defence+1 | **+1 Tier** (1/714) |
| fang_pendant | amulet | dire_wolf | str 1 · con 1 · lck 3 | power+1 | str 2 · con 2 · lck 4 | power+1 | **+1 Tier** (1/526) |
| direhide_jerkin | body | dire_wolf | con 5 | — | con 7 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/1351) |
| bearhide_cuirass | body | forest_bear | con 9 | — | con 12 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/2222) |
| alphas_heart_ring | ring1 | forest_bear | str 3 · con 3 · lck 3 | power+3 | str 4 · con 4 · lck 4 | power+4 (Chase-Stufe) | **+1 Tier** (1/2222) |
| stormhide_helm | helmet | roc_hunter | dex 1 · con 4 | — | dex 2 · con 5 | NEU ranged+1 (Chase-Stufe) | **+1 Tier** (1/1205) |
| skygrip_gauntlets | gloves | roc_hunter | dex 1 · con 3 · lck 2 | — | dex 2 · con 4 · lck 3 | NEU ranged+1 (Chase-Stufe) | **+1 Tier** (1/1205) |
| storm_mantle | cape | roc_storm | dex 1 · con 1 · int 2 · wis 1 | defence+2 | dex 2 · con 2 · int 3 · wis 2 | defence+3 (Chase-Stufe) | **+1 Tier** (1/909) |
| aetherscale_cuirass | body | roc_void | con 14 · int 2 | — | con 18 · int 3 | NEU magic_off+1 (Chase-Stufe) | **+1 Tier** (1/2381) |
| wyvernscale_greaves | legs | highland_wyvern | dex 1 · con 9 | — | dex 2 · con 12 | NEU ranged+1 (Chase-Stufe) | **+1 Tier** (1/2381) |
| cloudwalker_boots | boots | gravecliff_specter | dex 1 · con 4 | — | dex 2 · con 5 | NEU ranged+1 (Chase-Stufe) | **+1 Tier** (1/2222) |
| stormcore_pendant | amulet | roc_storm | dex 1 · con 3 · int 2 · wis 4 · lck 3 | magic_off+3 | dex 2 · con 4 · int 3 · wis 5 · lck 4 | magic_off+4 (Chase-Stufe) | **+1 Tier** (1/2564) |
| aetherband_ring | ring1 | roc_void | str 3 · dex 1 · con 2 · int 3 · lck 3 | power+3 | str 4 · dex 2 · con 3 · int 4 · lck 4 | power+4 (Chase-Stufe) | **+1 Tier** (1/2381) |
| wyvernscale_aegis | body | highland_wyvern | dex 1 · con 15 · lck 2 | — | dex 2 · con 20 · lck 3 | NEU ranged+1 (Chase-Stufe) | **+1 Tier** (1/2381) |
| revenant_greatshield | offhand | iron_revenant | con 9 | — | con 12 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/2778) |
| emberforge_helm | helmet | ember_elemental | str 1 · con 5 | — | str 2 · con 7 | NEU power+1 (Chase-Stufe) | **+1 Tier** (1/1075) |
| frostplate_greaves | legs | frost_hexer | con 8 | — | con 10 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/2564) |
| moltengrip_gauntlets | gloves | ember_elemental | str 1 · con 2 · lck 2 | — | str 2 · con 3 · lck 3 | NEU power+1 (Chase-Stufe) | **+1 Tier** (1/1075) |
| frostward_treads | boots | frost_hound | con 4 | — | con 5 | NEU defence+1 (Chase-Stufe) | **+1 Tier** (1/2778) |
| slagweave_cape | cape | voidhusk_crusher | str 2 | defence+3 | str 3 | defence+4 (Chase-Stufe) | **+1 Tier** (1/1923) |
| emberheart_amulet | amulet | voidhusk_crusher | str 3 · con 3 · lck 6 | power+3 | str 4 · con 4 · lck 8 | power+4 (Chase-Stufe) | **+1 Tier** (1/1923) |
| slagcarapace_plate | body | iron_revenant | str 2 · con 12 | — | str 3 · con 16 | NEU power+1 (Chase-Stufe) | **+1 Tier** (1/2778) |
| plaguebone_buckler | offhand | shambling_carcass | con 1 | — | con 2 | — | **+1 Tier** (1/270) |
| marrow_cap | helmet | hollow_marrow | con 1 | — | con 2 | — | **+1 Tier** (1/217) |
| basilisk_scale_shield | offhand | gaze_basilisk | con 2 | — | con 3 | — | **+1 Tier** (1/714) |
| shadestalker_hood | helmet | wailing_shade | con 2 | — | con 3 | — | **+1 Tier** (1/625) |
| slagheart_cuirass | body | slag_abomination | str 1 · con 6 | — | str 2 · con 8 | NEU power+1 (Chase-Stufe) | **+1 Tier** (1/1205) |
| forgeplate_greaves | legs | forge_demon | str 1 · con 4 | — | str 2 · con 5 | NEU power+1 (Chase-Stufe) | **+1 Tier** (1/1075) |
| voidstalker_cloak | cape | void_stalker | dex 1 · int 2 | defence+3 | dex 2 · int 3 | defence+4 (Chase-Stufe) | **+1 Tier** (1/2564) |
| soulflayer_amulet | amulet | soul_flayer | str 3 · con 4 · int 4 · lck 7 | power+3 | str 4 · con 5 · int 5 · lck 9 | power+4 (Chase-Stufe) | **+1 Tier** (1/2041) |

---

## §6 [C]/[L] Enchant-Integration (Affixe = Verzauberungen)

### 6.1 Affix-Umbau: `bonusByTier` (Kampf-Flats) → `modifiersByTier`/`skillBoostByTier`
Die Item-Philosophie gilt auch für Verzauberungs-Flats. Affix-PROCS (`weaponEffectByTier`) bleiben als
Effekt-Schicht erhalten (bereits ÷10-skaliert). Typ-Erweiterung [L]: `AffixDef.modifiersByTier?:
Partial<Record<AttributeId, number>>[]` (+ optional `skillBoostByTier`); `instanceBonusDelta`/enchant.ts
aggregieren Attribute statt EquipBonus-Flats. Rider-Lektion aus dem Gate ist eingepreist: **keine
DEX-lastigen Enchants** (DEX-Tempo-Marginalwert explodiert am hohen Ende — gemessen +18–21 % DPS je 6 DEX
am Ranged-BiS; darum trägt „Jägerisch" fast alles in LCK).

| Affix (Rune T1/T2/T3, rc 15–75) | ALT bonusByTier | **NEU modifiersByTier** | Proc (bleibt) |
|---|---|---|---|
| affix_keen „Scharf" (melee) | mel 0.3/0.7/1.4 | **str 3 / 6 / 10** | — |
| affix_arcane „Arkan" (magic) | mag 0.3/0.7/1.4 | **int 3 / 6 / 10** | — |
| affix_hunter „Jägerisch" (ranged) | rng 0.3/0.7/1.4 | **lck 2 / (dex 1 + lck 3) / (dex 1 + lck 4)** | — |
| affix_precise „Präzise" (any) | acc 0.6/1.4/2.5 · cc 0.02/0.03/0.05 | **lck 2 / 4 / 6** | — |
| affix_swift „Flink" (any) | spd −150/−300/−500 | **dex 1 / 2 / 3** | — |
| affix_flame „Flammend" (any) | mel/rng/mag 0.1/0.2/0.3 | **— (Proc ist der Wert)** | burn 15/20/25 % |
| affix_frost „Eisig" (any) | mel/rng/mag 0.1/0.2/0.3 | **— (Proc ist der Wert)** | frost 15/22/30 % |
| affix_shock „Sturm" (any) | mel/rng/mag 0.1/0.2/0.3 | **— (Proc ist der Wert)** | shock 12/16/20 % |

Das alte „Flink" T3 (−500 ms) war mit bis zu +42 % DPS ein Band-Brecher — dex 3 (≈ −120 ms + Rider)
liegt bei +7–10 % je Stil und bleibt unter dem Cap.

### 6.2 Budget-Band (verbindlich)
Verzauberung = sanktionierte On-Top-Power, **max ~+10–15 % DPS-Äquivalent auf Höchststufe**.
Gemessen (§0.2): Scharf/Jägerisch/Arkan T3 am BiS = +4.2–5.7 % je Stil (symmetrisch); Flink T3 analytisch
+7–10 %; Procs (Flamm/Frost/Sturm T3) ≈ +5–8 % EV. Alles im Band; die Paritäts-Zellen verschieben sich
stilgleich (0.93–1.05 voll verzaubert).

### 6.3 Stacking
Regeln in §2.3 (Basis-Effekt + max. 1 Enchant-Proc + Suffix-Rolls); gleicher Status-Typ refresht statt stapelt.

### 6.4 [L] Typ-/Engine-Punkte
1. `AffixDef.bonusByTier` → deprecaten (leer lassen), `modifiersByTier` einführen; Leser: enchant.ts,
   instanceBonusDelta, EnchantingPage-Vorschau [U].
2. Guard-Erweiterung: Affixe dürfen keine EquipBonus-Kampf-Flats mehr tragen (Whitelist: weaponEffectByTier).
3. Keine Save-Migration (Instanzen speichern affixId+Tier; Werte werden live abgeleitet).

---

## §7 [U] UI-Vertrag

### 7.1 Waffenkarte (Tooltip + Vergleich)
```
{damageMin}–{damageMax} Schaden · Tempo {tempoS} s        // z. B. „13.2–19.8 Schaden · Tempo 2.8 s"
({weaponDps} Schaden pro Sekunde)                          // weaponDps = ((min+max)/2 + ammoDamage)/tempoS, 1 Dezimale
```
- Bögen zeigen den DPS-Wert MIT eingelegter Munition (Quiver-ammoDamage), sonst ohne Ammo-Anteil + Hinweis.
- Attribut-Zeilen wie Rüstung („+3 Stärke"); manaCost als eigene Zeile („Kostet 8 Mana je Zauber").
- Charakterblatt: `minHit–maxHit` ersetzt die bisherige maxHit-Ableitung; **Anzeige mit 1 Dezimale**
  (intern ungerundet, §1.2) — damit ist jeder +1-Boost/Punkt sichtbar (P3-Fix, §8.1).

### 7.2 Effekt-Fließtext (WoW-Stil; gilt für Basis-Effekte UND Enchant-Procs — Tooltip + EnchantingPage-Vorschau)
i18n-Template je kind (`weaponEffect.<kind>`, en+de), Platzhalter {chance},{magnitude},{duration},{stacks},
{threshold},{flat}:
- burn/bleed/poison: „{chance} % Chance, das Ziel zu verbrennen: {magnitude} Schaden/s für {duration} s."
- execute: „+{magnitude} % Schaden gegen Ziele unter {threshold} % Leben."
- momentum: „Jeder Treffer steigert deinen Schaden um {magnitude} %, bis zu {stacks}-mal (bis Kampfende)."
- eagleEye: „Dein erster Schuss eines Kampfes trifft immer kritisch."
- cooldownOnKill: „Tötungen verkürzen deine Erholungspause um {magnitude} s."
- … (je §2.1-Zeile ein Template; Prosa-Vorlagen in `design/weapon-effects-palette.md`)
Enchant-Procs rendern mit Runen-Präfix: „[Flammend] {Template}". Alle Effekt-Zeilen in eigener Farbe
(wie Boost-Zeilen), max. 2 Zeilen je Waffe + 1 Enchant-Zeile.

### 7.3 Anzeige-Rundung
`accuracy` wird intern ungerundet geführt (§1.2) — UI rundet auf ganze Zahl; Tooltips der 6 Kampf-Skills
zeigen weiter „42/99 (+2)". Keine weiteren Anzeige-Änderungen.

---

## §8 Teil C — P3-Empfehlungen (kurz)

### 8.1 Boost-Rundungs-Granularität („kleine Boosts verschwinden")
**Entscheid (in dieser Spec bereits verbaut):** accuracy ungerundet + offenseSkill-Koeffizient 0.2→0.35
(§1.2) → +1 Attack-Boost ist ab sofort messbar (+0.35 acc statt im round() verschluckt). maxHit-Sichtbarkeit:
min/max mit 1 Dezimale anzeigen (§7.1) → power+1 (= +0.12 max) ist sichtbar. Damit ist KEINE
Mindest-Boost-Anhebung (+2) nötig — Boost-Budgets §4.4-alt bleiben. Falls der Chef trotzdem „+2 min"
will: nur die req<20-Zeile der Budget-Tabelle anheben, Rest lassen.

### 8.2 Bronze-Baseline neu pinnen (12 → 21 → erwartet deutlich < 21)
Die +9 neuen kills=0-Undergeared-Walls stammen aus dem „früh weicher"-Effekt der Itemization (L10-Mitigation
0.39→0.33). Dieser Pass DREHT das zurück: iron-worn-con +7, L10-EHP ×~1.3, L22 ×1.26 (§0.3) — per
Chef-Prinzip gewollt (undergeared-ok, aber die Leiter trägt wieder). **Empfehlung:** nach dem Apply den
Sim-Baseline-Snapshot NEU pinnen und als Erwartung „≤ 12 Auffälligkeiten" (alter Stand) ansetzen; jede
verbleibende kills=0-Zelle gegen die §0-Zellen gegenprüfen, bevor sie akzeptiert wird. EHP-Anker fürs
nächste Gate ebenfalls neu dokumentieren: L10 ×~1.3 (gewollt), L40 ≤ 1.20 vs ALT, L90 ≈ 1.0.

---

## §9 Apply-Reihenfolge (EIN Content-Pass) + Re-Gate

1. **[L] shared:** `damageMin/damageMax` auf ItemDef; Waffen-Guard-Whitelist; `AffixDef.modifiersByTier`;
   `CHASE_ITEMS`-Liste (Guard-Ausnahmeklasse §4.1.4/§5.1); KEIN SAVE_VERSION-Bump.
2. **[L] computeStats:** attackDamageMin/Max + Mittel (§1.2); accuracy 0.35 & ungerundet; Waffen-Tempo
   absolut (§1.4); DMG_MAX_HIT_MULT/DMG_ROLL_FLOOR-Pfad stilllegen.
3. **[K] combat.ts:** Uniform-Roll + Krit am Mittel (§1.3); neue Effekt-Kinds (§2.1); Stacking (§2.3);
   geseedete Fixtures re-pinnen (RNG-Draw-Änderung!).
4. **[C] Waffen:** §3.2-Craft-Tabellen + §3.3-Uniques + §3.4-Munition + §3.5-Offhands 1:1 einpflegen
   (bonus-Blöcke der Waffen komplett ersetzen durch damageMin/Max + modifiers + Effekte).
5. **[C] Rüstung/Schmuck:** §4.2–4.5-Leitern + §4.6-Sets/Singles + §5.2-Chase-Tabelle 1:1.
6. **[C/L] Affixe:** §6.1-Tabelle; enchant.ts/instanceBonusDelta auf modifiersByTier.
7. **[K/L] Guards:** Monotonie „streng steigend" für die 4 Craft-Leitern (+ Chase-Ausnahme), Waffen-Guard,
   Affix-Guard; content-integrity/wiring-audit re-baselinen.
8. **[U] UI:** §7 (Waffenkarte, Effekt-Fließtexte inkl. EnchantingPage, Anzeige-Rundungen).
9. **RE-GATE (Kontrolleur, identische Methodik):** §0.1-Zellen (Erwartung: Band 0.90–1.10, Werte ≈ §0.1
   ±Sim-Rauschen), §0.2 voll verzaubert, 0-geared-Walls (boar L10 + 4 Endbosse × 3 Stile), EHP-Stichproben
   gegen die NEUEN Anker (§8.2), ehrliche RealisticPlayer-Läufe, `pnpm exec turbo run test --force` grün.
   Bronze-Baseline-Snapshot neu pinnen (§8.2).

**Nicht enthalten (bewusst):** Trophäenjäger/doubleStrike/Blutzoll-Waffen (spätere Content-Drops auf den
neuen Engine-Hooks) · §9-alt-Lesbarkeits-Reskalierung ×5 · gearScore-Toolkit-P3s (logic-dev-Backlog).
