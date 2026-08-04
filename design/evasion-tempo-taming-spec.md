# Evasion-Tempo-Taming-Spec — Unsichtbarkeit & 800-ms-Boden zähmen

**Autor:** balance-designer · **Datum:** 2026-07-09 · **Status:** ✅ CHEF-GO 2026-07-09 mit zwei Änderungen (bindend, s.u.)

> **CHEF-ENTSCHEID (2026-07-09, überschreibt die betroffenen Stellen unten):**
> 1. **T1 relatives Tempo-Cap: −20 % statt −30 %** vom Waffen-Basisintervall — Zitat: „ich möchte
>    nicht dass man zu schnell angreift mit den stärkeren Waffen." Alle T1-Beispielwerte/Guards
>    beim Apply auf −20 % neu rechnen (voidwarden_blade: min. 2800·0,8 = 2240 ms).
> 2. **KEIN Endgame-Kampf-XP-Retune** — das §6-Follow-up (Punkt 7) ist gestrichen; die durch
>    weniger Kills/h sinkende Endgame-XP-Rate ist akzeptiert (Chef: „Wir brauchen kein Endgame
>    Kampf XP Retune").
> 3. Alles Übrige (E1–E4, T1-Kurve, Apply-Reihenfolge) unverändert GO.

> **NACHTRAG aus dem Red-Team-Audit (design/balance-redteam-2026-07-09.md, Fund L5, beim
> Apply MIT umsetzen):** Contest-Floor (10 %) und Dodge-Cap multiplizieren sich heute zu einem
> kombinierten Boden von nur 2,5 % Trefferchance — der MIN_HIT_CHANCE-Schutz deckt nur EINE
> Schicht. Beim Apply sicherstellen, dass die Mindest-Trefferchance auf die KOMBINIERTE
> Vermeidung (Contest × Dodge) geklemmt wird, nicht nur auf eine Ebene; Guard-Test dazu.
**Schwester-Spec:** `design/crit-taming-spec.md` (#294) — deren §6-Follow-up „Tempo-Stacking auf den
800-ms-Boden" ist hiermit fällig, PLUS der neue Evasion-Befund.

**Chef-Fund (2026-07-09, verifiziert):** CL-90/99-Char zerstört den L245-Götzenwächter ohne Food und
ohne eingehenden Schaden — „der Gegner verfehlt einfach IMMER".
- **Dodge 57 % reproduziert:** BiS-Melee-Mix mit 2 Voidhide-Lederteilen (body+gloves, Σevr 59,4)
  ⇒ `dodgeChance = 59,4/(59,4+45) = 56,9 %`. **Exakt Chefs Messwert.**
- **Tempo 2,8 s → 0,8 s reproduziert:** `attackIntervalMs = clamp(base − dex·40 + Δ, 800, 5000)`.
  Bei Chefs dex ≈ 105 ist der DEX-Term allein **−4200 ms** — JEDE Waffe im Spiel (max. Basis 3700)
  klebt am 800er-Boden. Der Waffen-Tooltip zeigt nur Basis+Suffix-Delta (ItemTooltip.tsx:507), der
  DEX-Term ist unsichtbar ⇒ Anzeige/Realität klaffen bis ×4,6 auseinander.
- **Live-Sim-Beleg (10 min, BiS-Evasion-Stack vs idol_warden):** 89 Gegner-Schwünge, **3 Treffer
  (3,4 %)**, 55 Schaden gesamt (5,5/min bei 328 maxHp) — praktisch unverwundbar; 81 Kills.

Messgrundlage: Scratchpad-Harness `evasion-tempo-audit.test.ts` (headless vitest gegen die echten
Quellen: `computeStats`, `startCombat`/`combatStep`, Content-Katalog). Kein Code angefasst.

---

## 1) Quellen-Zerlegung — warum der Boss nie trifft

Die Vermeidung hat **zwei multiplizierende Schichten**, beide laufen dem Gegner davon:

1. **Leder-Dodge (Voll-Vermeidung, Schicht 1):** `dodge = min(0.75, Σevr/(Σevr+45))`
   (character.ts:387, combat.ts:1711 — wird VOR dem Contest gezogen). `DODGE_CAP = 0.75` ist als
   Deckel absurd hoch — Block (nur −85 % Schaden!) cappt bei 0.5, Dodge (−100 %) bei 0.75. Schon das
   R10-Leder-Set (Σevr 32,6) gibt heute **42 %**, Voll-Voidhide (Σ135) exakt **75 % = Cap**.
2. **Accuracy-Contest (Schicht 2):** `hit = max(0.1, acc/(acc+eva))` (combat.ts:544) mit
   `eva = 1 + dex·0.3 + eq.evasion` (character.ts:479). Der DEX-Term ist **linear und ungecappt**;
   dex wächst Endgame auf 90–105+ (Gear-Mods + Suffixe) ⇒ eva ~28–33.
3. **Gegner-Accuracy skaliert nicht mit** (Content-Zensus, alle 99 Monster):

   | Level-Band | n | accuracy min/Ø/max |
   |---|---|---|
   | 1–20 | 16 | 2 / 6,5 / 9 |
   | 21–50 | 24 | 8 / 9,6 / 12 |
   | 51–90 | 28 | 9 / 11,8 / 15 |
   | 91–150 | 10 | 11 / 12,3 / 14 |
   | 151–295 | 21 | 12 / 15,4 / 19 |

   Spieler-Contest-Evasion wächst L1→BiS von ~2 auf ~29 (×14), Monster-Accuracy von ~6,5 auf ~15
   (×2,3). Obendrein ist die Leiter am Ende **invertiert**: Openworld-Trash L237–242 trägt acc 18–19,
   die Idol-Hall-„Bosse" L245–295 nur **acc 14–16**.
4. **Tempo:** `base − dex·40` (character.ts:474) — ein 4×-zu-heißer Linear-Term wie beim Crit
   (lck·0.04). Floor-Schwellen heute: dex 40 floort den Dolch (2400), dex 55 das Schwert (3000),
   **dex 71 die schwerste 2H (3650)** — d.h. ab Endgame-dex schlagen ALLE Waffen identisch mit
   0,8 s; Waffen-Tempo-Identität (Dolch vs Maul) ist komplett wegnivelliert. Suffixe („Wolf"/„Viper"
   −60…−250 ms) und Tonika (−300…−750 ms) stapeln zusätzlich auf denselben Boden.

**Gemessene Eskalation (Harness, alle Skills 99, voidwarden_blade, vs idol_warden L245 acc 14):**

| Stufe | Quellen | dex | Σevr | eva | dodge | Gegner-Land¹ | Intervall | eingehende DPS² |
|---|---|---|---|---|---|---|---|---|
| A | nur Skills + Waffe | 27 | 0 | 9,1 | 0 % | 60,6 % | 2570 ms | 4,81 |
| B1 | + BiS-Platte (godiron) + Schmuck | 33 | 0 | 10,9 | 0 % | 56,2 % | 2330 ms | 2,36 |
| B2 | + BiS-**Leder** (voidhide 5tlg) + Schmuck | 45 | 135 | 14,5 | **75 % (Cap)** | 12,3 % | 1850 ms | 0,86 |
| C | + Suffixe (Wolf/Lynx/Phantom/6× Tiger) + 5× Evasion-Rune T3 | 92 | 215 | 28,6 | **75 % (Cap)** | **8,2 %** | **800 ms (Boden)** | **0,57** |
| D | + tonic_keeneye + slayer_war_brew | 92 | 235 | 28,6 | 75 % | 8,2 % | 800 ms | 0,57 |

¹ `(1−dodge) · max(0.1, 14/(14+eva))` — Wahrscheinlichkeit, dass ein Boss-Schwung überhaupt landet.
² inkl. Mitigation + Leder-Floor; idol_warden Ø-Roh-Hit 27,0, Schwung alle 3,4 s. Zum Vergleich:
maxHp der Stufe C = 328, Melee-Lifesteal heilt nebenbei — 0,57 eingehende DPS ist Rauschen.

**Die 4 Wurzelursachen (Muster identisch zum Crit-Leck):**
1. Linear ohne abnehmende Erträge (dex·0.3 auf eva, dex·40 auf Tempo) gegen Caps, die real erreicht
   werden (DODGE_CAP 0.75, Floor 800) — der „Deckel" ist der Normalzustand, kein Ausnahme-Rail.
2. Zwei Vermeidungs-Schichten multiplizieren (0,25 Rest-Land × 0,33 hit ⇒ 8 %); jede ist einzeln
   schon großzügig.
3. Gegner-Accuracy ist ein statischer Flavor-Wert ohne Level-Skalierung — ein L245-Boss bringt
   dieselben ~14 Punkte in den Contest wie ein L120-Bär.
4. Der absolute 800-ms-Boden ist der EINZIGE Tempo-Schutz — er nivelliert statt zu begrenzen
   (alle Waffen konvergieren auf denselben Wert; schwere 2H verliert ihre Identität „langsam+hart").

*Anzeige-Leck (Neben-Befund):* Der Waffen-Tooltip zeigt `item.attackIntervalMs + Suffix-Delta`
(ItemTooltip.tsx:504–523), das reale `stats.attackIntervalMs` steht nur im Charakter-/Kampf-Panel.
Der unsichtbare DEX-Term erklärt Chefs „zeigt 2,8 s, schlägt 0,8 s". Zweiter Stale-Fund:
ItemTooltip.tsx:645–647 rendert `evasionRating` als „+X %" mit dem Kommentar „dodgeChance =
Σ evasionRating/100" — diese Linear-Formel ist seit Armor-Iteration 2 falsch (Sättigungskurve).

---

## 2) Der Idol-Befund konkret

- **Chef-Repro (Harness):** BiS-Mix, voidhide_body+vambraces auf einem Melee: Σevr 59,4 ⇒
  **dodge 56,9 %**, Land-Chance des L245-Wächters 21,6 %; mit Chefs vollem dex-105-Suffix-Stack
  (Stufe C/D) fällt sie auf 8,2 % — und real (Live-Sim) auf **3,4 %** gemessen, weil der Boss bei
  TTK ~4 s pro Fight meist nur einen Schwung bekommt und die Kill-Cooldowns die Schwünge weiter
  ausdünnen. 55 Schaden in 10 Minuten = de-facto unverwundbar, Food/Auto-Eat komplett tot.
- **Tempo:** Stufe C/D schlägt mit der schwersten 2H-Klinge des Spiels (3650 ms Basis) alle 800 ms
  — schneller als jeder Dolch es je laut Katalog dürfte (Dolch-Basis min. 2400).
- Beides zusammen macht die frisch retunete Idol-Halle (HP 320/360/480, crit-taming §2) wieder zur
  Farm-Wiese: 81 Kills / 10 min im Sim, XP ~2,7 M/h — und der Enrage/Regen der Bosse greift nie.

---

## 3) Zähmungs-Vorschlag (konkrete Zahlen)

Fünf unabhängig anwendbare Hebel, gleiche Bauform wie die Crit-Zähmung (Sättigungskurve + harter
Cap + benannte Konstanten). E1–E4 = Evasion, T1 = Tempo.

### 3.1 (E1) Leder-Dodge: Kurve strecken + Cap 75 % → 40 %

- **`DODGE_CAP = 0.40`** (war 0.75) — Chef-Vorgabe „on-level ~30–40 % max"; Dodge ist
  Voll-Vermeidung (−100 %), darf also nie über Block (0.5 Cap bei nur −85 %) liegen.
- **`dodge = min(DODGE_CAP, DODGE_EFF_MAX · Σevr / (Σevr + K_DODGE))`** mit
  **`DODGE_EFF_MAX = 0.5`**, **`K_DODGE = 60`** (war 45). Asymptote 50 % > Cap 40 % ⇒ der Cap ist
  mit Investment (Runen + Tonikum) ERREICHBAR, aber nur so (Crit-Spec-Philosophie).

Kalibrierung (Σevr aus echtem Content):

| Σevr (Quelle) | heute `x/(x+45)`, Cap 0.75 | **neu `0.5·x/(x+60)`, Cap 0.40** |
|---|---|---|
| 32,6 (R10-Leder-Set) | 42 % | **17,6 %** |
| 59,4 (Chef-Szenario, 2 Teile R99) | **56,9 %** | **24,9 %** |
| 82 (R70-Set) | 65 % | 28,9 % |
| 135 (R99 voidhide 5tlg) | **75 % (Cap)** | **34,6 %** |
| 215 (+ 5× Evasion-Rune T3) | 75 % | 39,1 % |
| 235 (+ tonic_keeneye) | 75 % | **39,8 % ≈ Cap** |

Viele Sprossen statt Cap-Plateau ab R15; die `evasionRating`-Werte im Content bleiben unangetastet
(die Kurve reeicht global — keine Einzelwert-Flickerei).

### 3.2 (E2) Level-Gap: Monster-Accuracy skaliert ab L150 mit dem Level

- **`enemyAccuracy = (monster.accuracy + MONSTER_ACC_PER_LEVEL · max(0, monster.level − MONSTER_ACC_LEVEL_START)) · (1 − accDown)`**
  mit **`MONSTER_ACC_PER_LEVEL = 0.35`**, **`MONSTER_ACC_LEVEL_START = 150`** (combat.ts:1719).
- Das IST der geforderte Level-Gap-Malus, nur auf der richtigen Seite des Contests: ein 245er bringt
  effektiv `14 + 0.35·95 = 47,3` Accuracy gegen eva ~10–15 ⇒ **er TRIFFT einen 90er** (76–86 %),
  während alles ≤ L150 (das gesamte Low/Mid-Game, 78 von 99 Monstern) **bit-identisch** bleibt.
- **Bewusst verworfen:** ein CL-vs-Monster-Level-Malus direkt auf die Spieler-Evasion (analog
  `combatXpLevelMult`). Grund: die Monster-Level-Skala läuft bis 295, das CL-Cap ist 99 — am
  Endgame wäre der „Gap" konstruktionsbedingt immer maximal, der Malus würde Leder ausgerechnet in
  seinem eigenen BiS-Tier (voidhide = ranged 99) pauschal halbieren. Die Accuracy-Skalierung erzielt
  denselben Effekt kontinuierlich, ohne die Klassen-Identität zu brechen, und gilt automatisch für
  jedes künftige Monster (Skalierungsregel statt Einzelwert-Flickerei).
- Content-Option obendrauf (klein, optional): die invertierte Spitze glätten — idol_warden 14→18,
  aether_wraith 15→18, scale_skarn 15→19, last_idol 16→20 (≥ Openworld-Trash 18–19). Kosmetik,
  E2 trägt die Last.

### 3.3 (E3) Contest-Evasion: DEX-Beitrag auf Sättigungskurve

- **`eva = 1 + EVASION_ATTR_MAX · dex / (dex + EVASION_ATTR_K) + eq.evasion`** mit
  **`EVASION_ATTR_MAX = 25`**, **`EVASION_ATTR_K = 75`** (ersetzt `dex·0.3`, character.ts:479).
- Kalibrierung: dex 5 → 1,6 (heute 1,5 — Frühspiel identisch), dex 20 → 5,3 (6,0), dex 45 → 9,4
  (13,5), dex 92 → 13,8 (27,6), dex 150 → 16,7 (45). Asymptote 26 — Endgame-dex-Stacking kann den
  Contest nie mehr ersticken; `MIN_HIT_CHANCE = 0.1` bleibt als Degenerate-Rail und bindet im
  Normalspiel weiterhin nie.

### 3.4 (E4) Leder-Floor als EHP-Ausgleich: 0.12 → 0.18

`LEATHER_HIT_FLOOR = 0.18` (war 0.12): ein landender Treffer gegen Leder verliert −18 %. Gleicht
einen Teil der Dodge-Senkung aus und hält die Trinitäts-Parität (Rechnung §4.2) — Leder bleibt die
Vermeidungs-Schiene (vermeidet auch On-Hit-Effekte/Spikes komplett), Platte die Planbarkeits-Schiene.

### 3.5 (T1) Tempo: DEX-Sättigung + RELATIVES Cap −30 % vom Waffen-Basisintervall

- **DEX-Term auf Sättigungskurve:** `dexTempoMs = TEMPO_DEX_MS_MAX · dex / (dex + TEMPO_DEX_K)` mit
  **`TEMPO_DEX_MS_MAX = 1800`**, **`TEMPO_DEX_K = 55`** (ersetzt `dex·40`). Frühspiel fast identisch
  (dex 5: −150 statt −200 ms), Endgame gedeckelt (dex 105: −1181 statt −4200 ms).
- **Relativer Boden statt nur absolutem:** Flat-Quellen (DEX + Suffixe + Tonika/Buffs via
  `eq.attackIntervalMs`) können das Intervall um **max. `TEMPO_REDUCTION_CAP = 0.30`** unter die
  Waffen-Basis drücken: `interval = max(base·0.7, base − dexTempoMs + eq.attackIntervalMs)`.
  **Eine 2H mit 3650 ms bleibt ≥ 2555 ms — 2H bleibt spürbar 2H.**
- Die **Stance-/Stil-Multiplikatoren bleiben AUSSERHALB** des relativen Bodens (Ranged ×0.90,
  Fast-Stance ×0.85 — bewusste Spielentscheidungen mit Accuracy-Tradeoff, kein Stat-Stacking); der
  absolute Boden 800 ms (Ranged 1000 ms) und Deckel 5000 ms bleiben als letzte Rails bestehen.
- **Waffen-Identität wiederhergestellt** (heute → neu, ohne/mit Voll-Stack −1000 ms):

| Waffe (Basis) | dex 12 | dex 25 | dex 40 | dex 105 | dex 105 + Stack |
|---|---|---|---|---|---|
| Dolch 2400 | 1920→2078 | 1400→1838 | **800**→1680 | **800**→**1680** | 800→1680 |
| Schwert 3000 | 2520→2678 | 2000→2438 | 1400→2242 | **800**→**2100** | 800→2100 |
| Kurzbogen 2400 (ranged ×0.9) | 1728→1870 | 1260→1654 | **1000**→1512 | **1000**→**1512** | 1000→1512 |
| voidwarden_blade 3650 | 3170→3328 | 2650→3088 | 2050→2892 | **800**→**2555** | 800→2555 |
| Maul 3700 | 3220→3378 | 2700→3138 | 2100→2942 | **800**→**2590** | 800→2590 |

  Dolch (1680) ist wieder ~1,5× schneller als die schwere 2H (2555), Fast-Stance-Bogen (×0.85 →
  1285) bleibt der Tempo-König — „schnelle Dolche/Bögen"-Identität intakt, nur der gemeinsame
  800er-Einheitsbrei ist weg. Suffix „Wolf/Viper" und Tempo-Tonika kaufen bei hohem dex den Rest
  zum relativen Cap (Über-Stack wird absorbiert — Caps sind erreichbar, by design; exakt die
  Brew-Logik der Crit-Spec §3.3).

---

## 4) Gegenrechnung vorher/nachher

### 4.1 Stufen A–D vs idol_warden (E1+E2+E3+E4+T1 kombiniert, Harness-verifiziert)

| Stufe | dodge v→n | eva v→n | Boss-Land¹ v→n | Intervall v→n | eingehende DPS² v→n |
|---|---|---|---|---|---|
| A (Skills+Waffe) | 0 % → 0 % | 9,1 → 7,6 | 60,6 % → **86,1 %** | 2570 → 3057 | 4,81 → 6,84 |
| B1 (BiS-Platte) | 0 % → 0 % | 10,9 → 8,6 | 56,2 % → **84,5 %** | 2330 → 2975 | 2,36 → 3,55 |
| B2 (BiS-Leder) | 75 % → **34,6 %** | 14,5 → 10,4 | 12,3 % → **53,6 %** | 1850 → 2840 | 0,86 → 3,49 |
| C (+ Suffixe/Runen) | 75 % → **39,1 %** | 28,6 → 14,8 | 8,2 % → **46,4 %** | **800 → 2555** | 0,57 → 3,02 |
| D (+ Tonika) | 75 % → **39,8 % (≈Cap)** | 28,6 → 14,8 | 8,2 % → **45,8 %** | **800 → 2555** | 0,57 → 2,98 |
| CHEF-Repro (Mix, 2 Lederteile) | **56,9 % → 24,9 %** | 13,9 → 10,1 | 21,6 % → **61,9 %** | 1930 → 2860 | 1,04 → 2,98 |

¹ pro Boss-Schwung; ² gegen maxHp 264–328 — der Boss LANDET jetzt etwa jeden zweiten Schwung
(~1 Treffer/7,4 s, ~22 Schaden) statt 3,4 % im Live-Sim: Food/Auto-Eat/Enrage werden real, aber ein
BiS-Char stirbt nicht grundlos (eingehende ~3 DPS vs 300+ HP + Heilung). Der UNGEGEARTE Char
(Stufe A / Sim-Char) wird in der Idol-Halle weiterhin — jetzt erst recht — zerlegt (6,8 DPS auf
162 HP ⇒ tot in ~24 s): gewollter Progressions-Druck, kein Regressions-Risiko.

### 4.2 Trinitäts-Parität (R99, gleicher Char, Harness)

| Schiene | heute | neu |
|---|---|---|
| Platte (godiron, Σ AR 125) | Mitigation 50 % ⇒ EHP ×2,00 | unverändert ×2,00 |
| Leder (voidhide, Σevr 135) | dodge 75 % + Floor 12 % ⇒ **EHP ×4,55** | dodge 34,6 % + Floor 18 % ⇒ **EHP ×1,87** |

Leder rückt von „2,3× besser als Platte UND unsichtbar" auf knapp unter Platten-Parität — fair, weil
Dodge zusätzlich On-Hit-Effekte/Status komplett vermeidet und Leder die dex-Offensiv-Schiene trägt
(Stoff/Ward ist von diesem Pass unberührt). Leder wird NICHT nutzlos: 35–40 % Voll-Vermeidung
bleibt die beste Anti-Spike-Verteidigung des Spiels.

### 4.3 On-Level-Progression (E2-Schwelle 150 schützt Low/Mid)

| Matchup | hit heute → neu |
|---|---|
| L99-Skills ungegeart vs forest_bear (L120, acc 14) | 72 % → 73 % (≈ unverändert, unter der Schwelle) |
| L70-Skills vs roc_storm (L222) — Undergeared-Wall | 80 % → 91 % (Wall wird härter — gewollt) |
| L99 ungegeart vs idol_warden (L245) | 72 % → 90 % |

### 4.4 Sim-Impact-Schranke (Guard für kontrolleur)

- **Sim-/Progressions-Char L20–80 (ungegeart, kein Leder, dex ≤ 12):** dodge 0 (unverändert), eva
  Δ < 0,5 Punkte, Monster ≤ L150 acc-identisch ⇒ Verteidigungs-Seite praktisch bit-gleich. Tempo:
  Intervall +2…+6 % (dex 5–12) ⇒ **Kill-Raten/XP-h im Sim-Block dürfen max. ~6 % sinken; keine
  einzige neue `kills=0`- oder `0 XP/h`-Zeile.** Die frische Waffen-Kurve (#287) verschiebt sich
  nicht (alle Waffen erhalten dieselbe DEX-Kurve; Tier-Verhältnisse konstant).
- **Endgame-Zonen (L>150):** eingehender Schaden steigt gewollt (Food-Pflicht); Kills/h der
  Idol-Halle sinken durch T1 auf ~30–40 % (800→2555 ms; Kampfzeit/Kill ~4 s → ~13 s — genau das
  Boss-TTK-Band 13–21 s, das die Crit-Spec §2 anpeilte). **XP/h der Endzonen sinkt entsprechend**;
  wenn gewünscht, liefere ich danach einen eigenen Endgame-XP-Retune-Pass (gleiche Ansage wie
  crit-taming §2).

---

## 5) Implementierungs-Notizen

### 5.1 Shared-Konstanten (packages/shared/src/index.ts)

Ändern (bei den bestehenden Defs, ~Z.646–669):
```ts
export const DODGE_CAP = 0.40;          // war 0.75 — Voll-Vermeidung < BLOCK_CAP (0.5 bei nur −85 %)
export const K_DODGE = 60;              // war 45 — Kurve gestreckt (mit DODGE_EFF_MAX kalibriert)
export const LEATHER_HIT_FLOOR = 0.18;  // war 0.12 — EHP-Ausgleich für die Dodge-Senkung (§4.2)
```
Neu (daneben):
```ts
export const DODGE_EFF_MAX = 0.5;             // Asymptote der Dodge-Kurve (> Cap ⇒ Cap erreichbar)
export const EVASION_ATTR_MAX = 25;           // Asymptote des DEX-Beitrags zur Contest-Evasion
export const EVASION_ATTR_K = 75;             // Halbwertskonstante (dex 75 ⇒ halbe Asymptote)
export const MONSTER_ACC_PER_LEVEL = 0.35;    // Gegner-Accuracy-Zuwachs je Level über der Schwelle
export const MONSTER_ACC_LEVEL_START = 150;   // darunter bit-identisch (Low/Mid-Game unberührt)
export const TEMPO_DEX_MS_MAX = 1800;         // Asymptote des DEX-Tempo-Beitrags (ms)
export const TEMPO_DEX_K = 55;                // Halbwertskonstante
export const TEMPO_REDUCTION_CAP = 0.30;      // max. relative Beschleunigung unter das Waffen-Basisintervall
export const ATTACK_INTERVAL_FLOOR_MS = 800;  // benannt (war inline in character.ts:474/488)
export const ATTACK_INTERVAL_CEIL_MS = 5000;  // benannt
export const RANGED_INTERVAL_FLOOR_MS = 1000; // benannt (war inline in character.ts:485)
```

### 5.2 Formel-Ersetzungen (packages/engine/src/character.ts) — logic-dev

**Z.387** (heute `Math.min(DODGE_CAP, eq.evasionRating / (eq.evasionRating + K_DODGE))`):
```ts
const dodgeChance = Math.min(
  DODGE_CAP,
  (DODGE_EFF_MAX * eq.evasionRating) / (eq.evasionRating + K_DODGE),
);
```
**Z.473–479** (heute `clamp(weaponBaseMs - attr.dex * 40 + eq.attackIntervalMs, 800, 5000)` und
`1 + attr.dex * 0.3 + eq.evasion`):
```ts
const weaponBaseMs = weaponRange ? (mainhandItem?.attackIntervalMs ?? 3000) : 3000;
const dexTempoMs = (TEMPO_DEX_MS_MAX * attr.dex) / (attr.dex + TEMPO_DEX_K);
let attackIntervalMs = clamp(
  Math.max(weaponBaseMs * (1 - TEMPO_REDUCTION_CAP), weaponBaseMs - dexTempoMs + eq.attackIntervalMs),
  ATTACK_INTERVAL_FLOOR_MS,
  ATTACK_INTERVAL_CEIL_MS,
);
const evasion = 1 + (EVASION_ATTR_MAX * attr.dex) / (attr.dex + EVASION_ATTR_K) + eq.evasion;
```
**Z.485/488:** nur die Magic-Numbers durch `RANGED_INTERVAL_FLOOR_MS` / `ATTACK_INTERVAL_FLOOR_MS` /
`ATTACK_INTERVAL_CEIL_MS` ersetzen — Ranged-×0.90- und Stance-Mults bleiben AUSSERHALB des relativen
Bodens (bewusst, §3.5).

### 5.3 Gegner-Accuracy (packages/engine/src/combat.ts) — combat-dev

**Z.1719** (heute `const enemyAccuracy = monster.accuracy * (1 - accDown);`):
```ts
const enemyAccuracy =
  (monster.accuracy +
    MONSTER_ACC_PER_LEVEL * Math.max(0, monster.level - MONSTER_ACC_LEVEL_START)) *
  (1 - accDown);
```
Sonst nichts in combat.ts: Resolve-Order (Dodge → Contest → Mitigation → Leder-Floor → Block →
Cap → Ward), `MIN_HIT_CHANCE = 0.1` und die Spieler-Angriffsseite (`monster.evasion`, Precision)
bleiben unverändert.

### 5.4 Anzeige (ui-dev, klein)

- **EquipmentOverview.tsx:265** (Dodge-Zeile) und **:262** (Tempo-Zeile): am Cap „40 % (max)" bzw.
  am relativen Boden „X,Xs (max)" rendern — dasselbe „(max)"-Muster wie bei der Crit-Zähmung.
- **ItemTooltip.tsx:645–647:** `evasionRating` nicht mehr als „+X %" ausgeben (die zugrunde gelegte
  Linear-Formel `Σevr/100` ist stale) — als Wertung anzeigen („+27 Ausweichwertung"), analog
  armorRating.
- Optional (P3): im Waffen-Tooltip unter dem Basistempo das EFFEKTIVE Intervall des Charakters
  zeigen („Effektiv: 2,6 s") — schließt Chefs Anzeige-Diskrepanz sichtbar; nach T1 ist die maximale
  Abweichung ohnehin auf −30 % begrenzt.
- Tonika-/Suffix-Texte brauchen KEINE Änderung (Boni wirken unverändert, nur gedeckelt).

### 5.5 Guard-Tests (logic-dev/kontrolleur)

- NEU pinnen: „Dodge saturiert unterm Cap" (Σevr 10 000 ⇒ dodge ≤ 0.40); „Tempo-Flats capp'en
  relativ" (dex 200 + eq −2000 auf 3650er-Waffe ⇒ interval == 2555); „2H bleibt 2H"
  (greatsword-Intervall ≥ base·0.7 für jeden Flat-Stack); „Gegner-Accuracy-Schwelle"
  (L120 ⇒ acc unverändert; idol_warden ⇒ 47,25).
- Re-pinnen (Werte verschieben sich): `stats.test.ts` (eva/interval-Pins),
  `armor-trinity-combat.test.ts` / `armor-iteration2-combat.test.ts` (Dodge-Raten),
  geseedete Kampf-Fixtures (`combatlog-source`, `endgame-danger`, Sim-Goldraten) — Treffer-Outcomes
  ändern sich, RNG-DRAW-Sequenzen nicht (Dodge-Draw weiterhin nur bei dodgeChance > 0).
- Achtung Turbo-Cache: `pnpm test --filter` direkt laufen lassen (bekannte Falle).
- **Baseline ist GRÜN (verifiziert 2026-07-09, nach der Crit-Zähmung):** engine-Suite 100 Dateien /
  715 Tests passed — die Ammo-Testschuld aus crit-spec §5.3 ist abgeräumt; jeder Rot-Diff nach dem
  Apply ist damit sauber diesem Pass attribuierbar.

---

## 6) Apply-Liste (geordnet)

1. **logic-dev:** Shared-Konstanten §5.1 + character.ts-Ersetzungen §5.2 (ein PR, engine-only).
2. **combat-dev:** enemyAccuracy-Zeile §5.3 (mini-PR; kann mit 1 zusammen).
3. **logic-dev:** Guard-Tests §5.5 (4 neue Pins + Re-Pins).
4. **kontrolleur:** `pnpm test` (Cache umgehen) gegen die Sim-Impact-Schranke §4.4: L20–80-Kill-Raten
   Δ ≤ ~6 %, keine neue `kills=0`/`0 XP/h`-Zeile; Idol-Halle für Sim-Char weiterhin tödlich;
   Live-Verhalten Stufe C: Boss-Land ~45 % statt 3 %, Intervall 2555 ms statt 800 ms.
5. **ui-dev:** „(max)"-Kennzeichnungen + evasionRating-Anzeige-Fix §5.4.
6. **Chef-Entscheid, dann content-dev (optional, klein):** Idol-Hall-Accuracy-Glättung §3.2
   (idol_warden 14→18, aether_wraith 15→18, scale_skarn 15→19, last_idol 16→20).
7. **Follow-up-Ticket (nicht dieser PR):** Endgame-XP/h-Nachmessung nach T1 (Kills/h der L>150-Zonen
   sinken auf ~30–40 %) — auf Wunsch eigener Retune-Pass von mir.

---

## 7) Kohärenz-Check

- **Rüstungs-Trinität:** Platte unberührt (×2,00 EHP), Leder landet mit E1+E4 bei ×1,87 EHP knapp
  darunter, behält aber Voll-Vermeidung als Qualitäts-Vorteil (Spikes/On-Hit-Status) plus die
  dex-Offense — Leder bleibt die beste Glass-Cannon-Verteidigung, wird nur nicht mehr unsichtbar.
  Stoff/Ward ist von diesem Pass komplett unberührt. `evasionRating`-Content bleibt unangetastet.
- **Crit-Zähmung (#294):** E3/T1 fassen dieselbe dex-Inflation an anderen Termen an — die
  Crit-Formeln (S = 0.4·dex+0.6·lck) bleiben unverändert. EINE Aussage der Crit-Spec ist zu
  revidieren: §3.3 „der Tempo-Teil [der Tonika] wirkt immer" — nach T1 wirkt er bis zum relativen
  Cap (bei BiS-dex absorbiert, wie die Krit-Zeilen am Krit-Cap). Kombinierter Endgame-Effekt beider
  Specs: BiS-DPS ≈ ×0,36 (Crit) × ×0,31 (Tempo) — die Idol-Bosse (HP 320/360/480) landen dadurch
  exakt im geplanten Boss-TTK-Band ~13–21 s; **kein weiterer HP-Retune nötig.**
- **Idol-HP (320/360/480):** bleiben. Enrage (<30 % HP) und Regen bekommen durch die längere TTK
  erstmals Spielzeit; gleichzeitig trifft der Boss wieder ⇒ Food/Tank-Stats in der Endzone relevant.
- **Stil-Parität:** Ranged behält Tempo-Identität (Fast-Stance-Bogen 1285 ms vs Melee-2H 2555 ms)
  und Crit-Bonus; der Ranged-Glass-Cannon-Tradeoff (kein eva-Stil-Bonus) bleibt. Magie: Stab 3000
  → min 2100 ms; langsameres Casten schont den Mana-Pool, Ward-Schiene unberührt. Dolch/Scimitar
  („Fast · High Crit") sind wieder messbar die schnellsten Melees (1680/1855 vs 2555/2590).
- **Pets:** `accuracyDownEnemy` skaliert jetzt mit der höheren Boss-Accuracy mit (multiplikativ) —
  wird in Endzonen wieder wertvoll statt redundant; gemwraith-Garantie-Krit alle 4,5 s bei 2,5er-
  Intervall ≈ jeder 2. Schlag — unkritisch (Power-Budget #276 hält).
- **Save-Kompatibilität:** reine Formel-/Konstanten-Änderung, keine State-/Content-Struktur-Änderung
  ⇒ kein SAVE_VERSION-Bump nötig.
