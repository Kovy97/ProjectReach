# Crit-Taming-Spec (Task #294) — One-Hits auf End-Bosse zähmen

**Autor:** balance-designer · **Datum:** 2026-07-08 · **Status:** Spec, bereit für logic-dev/content-dev
**Chef-Fund (verifiziert):** Combat-L90-Char (DEX 105, LCK 83, BiS Melee) one-hittet Idol-Hall-Monster.
Rechnerische Repro: `critChance = (105·0.4 + 83·0.6)/100 = 91.8 % → Clamp 90 %`, `critDamage = 1.5 + 83·0.04 = 482 %`
(Chefs 474 % ≈ LCK 81 — identisches Bild). **Beides bestätigt.**

Messgrundlage: Scratchpad-Harness `crit-audit.mts` (headless, `computeStats` + Monster-Mitigation
`def/(def+125)`, Cap 0.8 — identisch zu `combat.ts:resolveAttack`). Kein Code angefasst.

---

## 1) Quellen-Zerlegung — wo die Crit-Chance herkommt

Gemessener Eskalations-Pfad eines Endgame-Chars (**alle Skills 99**, Melee, `last_judgement`):

| Stufe | Quellen | DEX | LCK | S=0.4·dex+0.6·lck | critChance | critDamage | eff. DPS-Mult¹ |
|---|---|---|---|---|---|---|---|
| A | nur Skills + Waffe | 40 | 45 | 43 | **43.0 %** | **330 %** | ×1.99 |
| B | + BiS-Krit-Gear (8 Slots) | 47 | 82 | 68 | **68.0 %** | **478 %** | ×3.57 |
| C | + Suffixe (Executioner + 5× Phantom, ilvl 100) | 72 | 82 | 78 | **90 % (Cap)** | **503 %** | ×4.63 |
| D | + Slayer's War Brew | 72 | 82 | 78 | **90 % (Cap)** | **533 %** | ×4.90 |

¹ `1 + critChance·(critDamage−1)` — der Faktor, um den Krits die erwartete DPS multiplizieren.

Beiträge im Einzelnen (heutige Maximalwerte):

| Quelle | critChance heute | critDamage heute | Beleg |
|---|---|---|---|
| Attribute nur aus Skills (alle 99) | 40 pp (S=40) | +148 pp (lck 40·0.04) | attack/ranged/fletching→dex; fishing/foraging/thieving→lck |
| Gear-Attribut-Mods (8 Slots BiS) | +25 pp (S 43→68) | +148 pp (lck +37) | z. B. `eye_of_the_idol` lck 8, `ash_tyrant_crown` lck 7, `last_idol_mantle` lck 7, `godgem_ring`/`doomforged_band` lck 6–7 |
| Waffen-Mods (godly) | +3 pp | +20 pp | `last_judgement`/`last_vengeance`/`last_condemnation` je lck 5 |
| Suffixe (softStats) | **+30 pp** (Executioner 5 + 5× Phantom à 5) | +25 pp (Executioner) | `SUFFIX_SOFT_STATS`: critChance 0.01–0.05, critDamage 0.05–0.25 je Instanz; Phantom rollt auf **jedem Rüstungsteil** |
| Suffix-Attribute (5× Phantom) | +10 pp (dex +25) | — | `attrPerIlvl dex 0.25·20` |
| Tränke/Buffs | +10–20 pp | +20–30 pp | `tonic_warpath` 0.10, `tonic_apex` 0.12, `godsbreath_elixir` 0.15/+0.30, `slayer_war_brew` 0.20/+0.30 (60 min!) |
| Ranged-Specialty | +6 pp | — | `character.ts:466` |
| Pet `gemwraith` | Garantie-Krit alle 4.5 s (forceCrit) | — | „Prismatic Lance" — unter heutigem cd 5.0 ein weiterer One-Hit-Kanal |

**Warum so viel? — die 4 Wurzelursachen:**
1. **Linear ohne abnehmende Erträge:** `S/100` — jeder dex/lck-Punkt = ~1 pp Chance. Die Hybrid-
   Progression schenkt S≈40 fürs bloße Skill-Leveln (6 Skills trainieren dex/lck); der 0.9-Cap ist
   keine Bremse, sondern wird real erreicht.
2. **LCK double-dippt, Koeffizient 0.04 ist 4× zu heiß:** lck speist Chance (0.6 pp) UND Schaden
   (+4 pp je Punkt, **ungecappt**). 25 lck = +100 % Krit-Schaden. Itemization 2.5 hat zudem alte
   accuracy/crit-Flats in lck-Mods gefaltet → Endgame-Gear trägt 6–8 lck pro Slot.
3. **Suffix-Stacking über 6 Instanzen:** `suffix_phantom` gilt für `armor` → 5 Rüstungsteile à
   +5 pp + Waffe (Executioner) = +30 pp aus einer „weichen Zusatzwährung".
4. **critDamage hat gar keinen Cap** (`character.ts:517`).

*Adjazenter Befund (out of scope, separat betrachten):* Tempo-Stacking drückt das Angriffsintervall
auf den 800-ms-Boden (Suffix „Wolf/Viper" + Brew −750 ms) — Stufe C/D schlägt mit 0.82 s zu.

---

## 2) Der Idol-Befund: Crit-Leck UND zu weiche Idol-Halle

Beides ist wahr, das Crit-Leck ist die Hauptursache:

| Monster | Level | HP | Def (Mitig.) | eff. Ø-Hit BiS² | Krit heute | Ergebnis heute | non-crit Hits |
|---|---|---|---|---|---|---|---|
| gravecliff_specter (Openworld!) | 237 | **308** | 120 (49 %) | 36.5 | 183 | 2 Krits | 9 |
| idol_warden | 245 | **110** | 123 (50 %) | 36.0 | 181 | **ONE-HIT** | 4 |
| aether_wraith | 260 | 180 (+400 Ward) | 130 (51 %) | 35.0 | 176 | 2 Krits (mit Brew ONE-HIT) | 6 |
| scale_skarn | 275 | **155** | 140 (53 %) | 33.7 | 170 | **ONE-HIT** | 5 |
| last_idol | 295 | **200** | 150 (55 %) | 32.5 | 163 | 2 Krits | 7 |

² Stufe C (BiS + Suffixe), Ø-Schaden 71.4 × (1−Mitigation).

- **Crit-Leck:** Schon Stufe A (nur Skills + Waffe, kein einziges Rüstungsteil!) krittet den
  idol_warden mit 111 ≥ 110 HP weg. Der ×4.6–4.9-Multiplikator ist der Täter.
- **Aber die Idol-Halle ist AUCH zu weich:** der Openworld-Trash-Mob gravecliff_specter (L237) hat
  ~604 effektive HP, die Zonen-„Bosse" L245–295 nur 218–440 EHP — die Leiter ist invertiert. Selbst
  ohne jeden Krit fällt der Endboss `last_idol` in 7 Hits (~9 s); sein Enrage (<30 % HP) und Regen
  kommen nie ins Spiel.

**Sekundär-Empfehlung (Chef-Entscheid, NACH dem Crit-Fix separat anwendbar):** Idol-Hall-HP auf die
Specter-EHP-Linie heben — `idol_warden 110→320`, `scale_skarn 155→360`, `last_idol 200→480`
(`aether_wraith` 180 belassen, sein 400er-Ward-Pool trägt ihn). Ergibt post-Fix TTK ~13 s (Warden)
bis ~21 s (Last Idol) für einen BiS-Char ohne Brew — Boss-Gefühl statt Farm-Klick, Enrage wird real.
XP/h der Zone sinkt entsprechend; wenn gewünscht, liefere ich dazu einen eigenen XP-Retune-Pass.

---

## 3) Zähmungs-Vorschlag (konkrete Zahlen)

### 3.1 Crit-Chance: harter Cap 50 % + Attribut-Soft-Kurve

- **`CRIT_CHANCE_CAP = 0.5`** (Präzedenz: `BLOCK_CAP = 0.5`, shared/index.ts:646).
- **Attribut-Beitrag auf Sättigungskurve** (gleiche Form wie Dodge/Mitigation `x/(x+K)`):
  `attrCrit = 0.45 · S / (S + 75)` mit `S = max(0, dex·0.4 + lck·0.6)` (S-Definition unverändert).
- Gear-Flats gibt es nicht mehr (Itemization 2.5) — **Suffixe/Tränke/Specialty kaufen den Rest zum
  Cap**, additiv wie bisher über `eq.critChance`, dann Clamp auf `[0, CRIT_CHANCE_CAP]`.

Kalibrierung (geprüfte Kandidaten; CEO-Vorschlag 0.35/150 war zu hart — 13 % am Endgame-S):

| S | heute (S/100) | 0.35/150 | **0.45/75 (Wahl)** | 0.40/60 |
|---|---|---|---|---|
| 10 (früh) | 10 % | 2.2 % | **5.3 %** | 5.7 % |
| 40 (Skills 99, ungegeart) | 40 % | 7.4 % | **15.7 %** | 16.0 % |
| 68 (BiS-Gear) | 68 % | 11.4 % | **21.4 %** | 21.3 % |
| 92 (Chef-Char) | 90 % (Cap) | 13.3 % | **24.8 %** | 24.2 % |
| 150 (theoret. Max) | 90 % (Cap) | 17.5 % | **30.0 %** | 28.6 % |

→ Ziel erfüllt: **Attribute allein ≤ ~30 %** (Asymptote 45 % ist unerreichbar), Gear/Suffixe/Tonika
liefern die restlichen ~25 pp bis zum 50-%-Cap. 0.45/75 gewinnt gegen 0.40/60 durch die etwas
flachere Frühkurve bei identischem Endgame-Verhalten.

### 3.2 Crit-Schaden: Cap 250 % + LCK-Faktor 0.04 → 0.01

- **`CRIT_DAMAGE_CAP = 2.5`** (250 % total). Bei cc=50 % ergibt das den eff. Multiplikator
  `1 + 0.5·1.5 = ×1.75` — Zielband ×1.5–1.8 getroffen. (Cap 3.0 ergäbe ×2.0 → drüber, verworfen.)
- **`critDamage = clamp(1.5 + lck·0.01 + eq.critDamage, 1, 2.5)`** — lck 82 → Basis 232 %,
  Suffix/Brew füllen zum Cap. LCK behält damit seine Krit-Schaden-Identität (Longbows/godly Waffen
  tragen lck), kann aber nie mehr ×4.8 kaufen. Untergrenze 1: ein „Krit" darf nie schwächer als
  ein Normal-Hit werden (negative eq.critChance-Test-Offhands existieren; analoge Hygiene).

### 3.3 Specialty & Tonika bleiben innerhalb der Caps — und lohnen sich

- **Ranged-Specialty:** `critChance = min(CRIT_CHANCE_CAP, critChance + 0.06)` — unter dem Cap
  (Normalfall ohne Voll-Suffix-Stack) bleiben die +6 pp voll wirksam; Ranged-Identität intakt
  (`styles.test.ts:21` bleibt grün, solange Melee < Cap).
- **Tonik-Rechenbeispiel (post-Fix, BiS-Char Stufe B, cc 21.4 %, cd 232 %):**
  - `tonic_warpath` (+10 pp): cc → 31.4 %, Mult ×1.28 → ×1.41 = **+10 % DPS** (+ Tempo −600 ms).
  - `slayer_war_brew` (+20 pp/+30 pp): cc → 41.4 %, cd → 250 % (Cap), Mult ×1.28 → ×1.62 =
    **+27 % DPS** (+ Tempo −750 ms) — der Brew bleibt das stärkste Kampf-Konsumable.
  - Nur ein Char, der bereits per Suffix-Stack am Cap klebt (Stufe C: attr 22.9 + Suffix 30 > 50),
    verschenkt die Krit-Zeilen — Caps sind dazu da, erreicht zu werden; der Tempo-Teil wirkt immer.
- **Pet gemwraith:** unverändert lassen — der Garantie-Krit ist unter cd ≤ 2.5 ein ×2.5-Burst alle
  4.5 s statt eines ×5-One-Hit-Kanals; das Power-Budget (#276) stimmt wieder.
- **Suffixe:** keine Content-Änderung nötig — der 30-pp-Stack wird vom 50-%-Cap absorbiert
  (attr 23 + 30 → 50 statt 90). `SUFFIX_SOFT_STATS` bleibt unangetastet.

---

## 4) Gegenrechnung vorher/nachher

Gleiche Chars wie §1, neue Formeln (Harness-verifiziert):

| Stufe | cc vorher → nachher | cd vorher → nachher | Mult vorher → nachher | idol_warden (110 HP) | last_idol (200 HP) |
|---|---|---|---|---|---|
| A (nur Skills+Waffe) | 43 % → 16.4 % | 330 % → 195 % | ×1.99 → **×1.16** | ONE-HIT → 2 Krits (Krit 65) | 2 Krits → 4 Krits |
| B (+ BiS-Gear) | 68 % → 21.4 % | 478 % → 232 % | ×3.57 → **×1.28** | ONE-HIT → 2 Krits (Krit 84) | 2 Krits → 3 Krits |
| C (+ Suffixe) | 90 % → **50 % (Cap)** | 503 % → **250 % (Cap)** | ×4.63 → **×1.75** | ONE-HIT → 2 Krits (Krit 90) | 2 Krits → 3 Krits |
| D (+ Brew) | 90 % → 50 % (Cap) | 533 % → 250 % (Cap) | ×4.90 → **×1.75**³ | ONE-HIT → 2 Krits | 2 Krits → 3 Krits |

³ Brew-Wert lebt bei Voll-Stack im Tempo (−750 ms); für alle Nicht-Voll-Stack-Chars siehe §3.3.

- **Kein One-Hit mehr, nirgends** — max. Krit vs. idol_warden: 90 von 110 HP.
- **Endgame-Krit-Faktor ×4.6–4.9 → ×1.16–1.75** — genau das Zielband (~×1.5–1.8 am Voll-Ausbau).
- **Frische Waffen-Kurve (#287) bleibt unberührt:** der Sim-/Progressions-Char hat winziges S
  (L20–80 Melee: S 4–7). Heute ×1.02–1.04 → neu ×1.01–1.02, Δ ≤ 2.2 % — die gerade retuneten
  Tier-Sprünge und Monster-Kill-Raten verschieben sich nicht messbar. Ein realistischer Mid-Game-
  Spieler mit Neben-Skills (S≈20–25) fällt von ~22 % auf ~10 % Chance bei cd ~155 % — spürbar,
  aber proportional; Krits bleiben als Würze sichtbar (jeder ~10. Schlag, ×~1.5).

---

## 5) Implementierungs-Notizen (logic-dev)

### 5.1 Neue shared-Konstanten (packages/shared/src/index.ts, neben BLOCK_CAP ~Z.646)

```ts
export const CRIT_CHANCE_CAP = 0.5;      // harter Deckel (Präzedenz BLOCK_CAP)
export const CRIT_CHANCE_ATTR_MAX = 0.45; // Asymptote der Attribut-Kurve (< Cap!)
export const CRIT_CHANCE_ATTR_K = 75;    // Halbwertskonstante der Sättigungskurve
export const CRIT_DAMAGE_BASE = 1.5;     // unverändert, jetzt benannt
export const CRIT_DAMAGE_PER_LCK = 0.01; // war 0.04 inline
export const CRIT_DAMAGE_CAP = 2.5;      // 250 % total, NEU (vorher uncapped)
export const RANGED_CRIT_BONUS = 0.06;   // war 0.06 inline (character.ts:466)
```

### 5.2 Formel-Ersetzungen (packages/engine/src/character.ts)

**Z.451** (heute `clamp((attr.dex*0.4+attr.lck*0.6)/100 + eq.critChance, 0, 0.9)`):
```ts
const critAttr = Math.max(0, attr.dex * 0.4 + attr.lck * 0.6); // S unverändert definiert
let critChance = clamp(
  (CRIT_CHANCE_ATTR_MAX * critAttr) / (critAttr + CRIT_CHANCE_ATTR_K) + eq.critChance,
  0,
  CRIT_CHANCE_CAP,
);
```
**Z.466** (Ranged-Specialty): `critChance = Math.min(CRIT_CHANCE_CAP, critChance + RANGED_CRIT_BONUS);`

**Z.517** (heute `critDamage: 1.5 + attr.lck * 0.04 + eq.critDamage`):
```ts
critDamage: clamp(CRIT_DAMAGE_BASE + attr.lck * CRIT_DAMAGE_PER_LCK + eq.critDamage, 1, CRIT_DAMAGE_CAP),
```

Sonst nichts: `combat.ts:resolveAttack` (Krit am Spannen-Mittel), `guaranteedCrit`-Pet-Pfad
(combat.ts:1904) und `instanceBonusDelta` bleiben unverändert — sie konsumieren die gedeckelten
Stats automatisch.

### 5.3 Guard-Tests neu pinnen / prüfen

- `styles.test.ts:21` (ranged > melee cc): bleibt grün — nur verifizieren.
- `weapon-effects-2.test.ts:296/321` (eagleEye: `critVal = round(min · critDamage)`): Erwartungs-
  werte neu pinnen (cd des L60-Fixtures sinkt von 1.5+lck·0.04 auf 1.5+lck·0.01).
- Anti-Krit-Offhands (`bane.test.ts:59`, `weapon-range.test.ts:49`, `weapon-effects-2.test.ts:58`,
  `critChance: -1`): funktionieren weiter (Clamp-Untergrenze 0).
- Geseedete Kampf-Fixtures re-pinnen, wo Krit-Ergebnisse eingefroren sind:
  `combatlog-source.test.ts`, `endgame-danger.test.ts`, ggf. Sim-Goldraten (Krits ändern TTK).
  Achtung Turbo-Cache: `pnpm test --filter` direkt laufen lassen (bekannte Falle).
- **Baseline ist HEUTE schon rot (Stand 2026-07-08, vor jedem Crit-Change):** 6 Failures in
  `sim-realistic.test.ts` (`manageAmmo is not a function`, Köcher-Erwartungen) und
  `weapon-range.test.ts:327` (Munitions-Spanne) — Altlasten des #286-Ammo-Removals, NICHT vom
  Crit-Fix. Vor dem Re-Pinnen zuerst diese Ammo-Testschuld separat abräumen, sonst ist der
  Crit-Diff nicht sauber attribuierbar.
- NEU pinnen (Guard): ein Test „Attribut-Krit saturiert unter dem Cap" — S=1000 ⇒ cc < 0.45; und
  „cd-Cap hält" — lck 200 + Brew ⇒ cd == 2.5.

### 5.4 Anzeige (ui-dev, klein)

- Fighter-Card/Stats: `CombatPage.tsx:1119–1120` (✦ Chance, ✦✦ Schaden) und
  `EquipmentOverview.tsx:259–260` lesen `stats.critChance/critDamage` direkt → zeigen die neuen
  Werte automatisch. Optional: am Cap „50 % (max)" rendern, analog bestehender Cap-Anzeigen.
- Tooltips der Krit-Tonika brauchen KEINE Textänderung (Boni wirken unverändert, nur gedeckelt).

---

## 6) Apply-Liste (geordnet)

1. **logic-dev:** shared-Konstanten §5.1 + drei Formel-Ersetzungen §5.2 (ein PR, engine-only).
2. **logic-dev:** Guard-Tests §5.3 re-pinnen + zwei neue Cap-Guards.
3. **kontrolleur:** `pnpm test` (Cache umgehen) — Sim-Block: Progressions-Kurve L20–80 darf sich
   nicht messbar bewegen (Δ Mult ≤ 2.2 %, §4); Idol-Halle bleibt für den ungegearten Sim-Char
   weiterhin tödlich (erwartet).
4. **ui-dev (optional):** Cap-Kennzeichnung „(max)" an ✦/✦✦ (§5.4).
5. **Chef-Entscheid, dann content-dev:** Idol-Hall-HP-Retune (§2): `idol_warden 110→320`,
   `scale_skarn 155→360`, `last_idol 200→480`, `aether_wraith` unverändert. Danach auf Wunsch
   XP/h-Nachmessung durch mich.
6. **Follow-up-Ticket (nicht dieser PR):** Tempo-Stacking auf den 800-ms-Boden (Suffix Wolf/Viper
   + Brew −750 ms) — gleicher Mechanismus „linear + kein Budget", separat balancieren.
