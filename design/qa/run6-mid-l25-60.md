# QA-Run 6 — Mid-Game Playtest (Level 25–60), nach Parität-R4 (manaCost-Cap, str-in-Platte, Ranged-Trim)

**Tester:** Playtester-Analyst (READ-ONLY, kein Spiel-Code geändert) · **Datum:** 2026-06-28
**Scope:** Mid-Game L25–60. Kern-Auftrag: **3-Stil-Parität nach R4** — ist Magie jetzt im Band 0,9–1,1× (nicht mehr Boden)? R4-Hebel: manaCost-Caps (Stab 24→10, Wand 12→8, Spezial-Caster gesetzt), str-in-Platte (Helm/Body/Legs `modifiers.str = round(meleeDamage)`), Ranged-Trim (voidhide ×0,5 + boots-Typo-Fix, Bögen ×0,85, Munition ×0,78, shadowhide ×0,6), godspark-Roben-Rebuff (nur L88+, mid-irrelevant). Plus: Gear-Progression, Suffix-Crafts, Combo-Food.
**Methode:** Temporäres Sim-Harness (`packages/engine/src/_run6tmp.test.ts`, **nach der Analyse entfernt**, `packages/**` unverändert). Identisch zur run5-Methodik für saubere Δ: pro Stil & Level **best-craftbares Gear** via effDPS-Greedy über ALLE Slots inkl. Waffe+Munition (3 Pässe → re-optimiert Waffe vs. Rüstung). Gleiche Skill-/Attributbasis für alle drei Stile (Kampf- **und** Gear-Crafting-Skills `smithing/fletching/leatherworking/jewelcrafting/runecrafting` auf L → einziger Unterschied = Gear + Stil-Formel + Mana/Munition). Gemessen: (a) analytische **effDPS** (Krit/Tempo/Munition/Mana-Sustain) und (b) ein realer **1h-Kampf-Sim der echten combat.ts** gegen je 3 on-level Mobs (identische run5-Mobs), ø der per-Mob-kills/h-Ratios (cancelt Einzel-Mob-HP). Uniformes `cooked_voidray` für alle → 0 Tode → Ratios = reine **Offense**. **Attack**-Stance (nicht power) → die Melee-Zahlen sind **Untergrenze** (power-Stance × STYLE_DAMAGE_MULT 1,12 wirkt nur auf Melee → echte Melee-Decke höher). Abgeglichen mit `design/qa/run5-mid-l25-60.md` und `design/balance-3style-parity-r4.md`.

---

## Fun-Score: **8.0 / 10** (run5: 6,5)

**Der explizite Kern-Auftrag ist erfüllt: Magie ist auf allen drei Mid-Checkpoints im Band** — real **1,051 / 1,017 / 0,985×** ranged @L30/L40/L55, gegenüber run5 **0,89 / 0,86 / 0,84×** (Boden). Der R4-manaCost-Cap war der richtige Dreh- und Angelpunkt: Magie war in run5 nie roh-schwach, sondern mana-gethrottelt — mit flacher manaCost-Kurve sitzt sie ohne jeden Roh-Buff im Korridor, und der **run5-Progressions-Bug (teurere `adamantium_wand` < billigere `mithril_wand`) ist behoben** (der Optimierer wählt jetzt korrekt das höhere Tier). Außerdem **kippt der Magie-Level-Trend nicht mehr** (run5: monoton fallend 0,89→0,84; run6: 1,05→1,02→0,99, praktisch flach). Die Stil-Spreizung ist auf das **beste Niveau aller Runs** gefallen: max. paarweise **1,14×** (L40) vs. run5 1,29× vs. run4 ~2×. 0 Tode, keine Walls, keine Trivialität in 3 Stilen × 3 Checkpoints × 3 Mobs.

**Warum nicht höher:** R4 hat die Decke von Magie genommen, aber durch das **Bündel Ranged-Trim + str-in-Platte gleichzeitig Melee mid nach oben gedrückt** — und damit **über** das eigene R4-Prognose-Ziel hinaus. Melee real **0,955 / 1,144 / 1,078×**: bei **L40 über dem Band (1,144×)**, bei L55 am oberen Rand (1,078×) — und das ist die **konservative Attack-Stance-Zahl** (power-Stance hebt Melee weiter). R4 prognostizierte Melee mid bei **0,86–0,90 (unten)** — gemessen ist es das **Gegenteil**. Die Decke ist also nur **von Magie zu Melee gewandert**, milder als in run5, aber sie existiert. Dazu bleiben die run5-P2/P3 (Combo-Food kosmetisch, Stil-Identität unter uniformem Food unsichtbar) unverändert, und R4 hat Endgame-Gear (godspark-Rebuff, voidhide-Trim) angefasst → ein L75/L99-Sweep steht noch aus. Netto: der größte Parität-Sprung der Serie und der Kern-Auftrag geliefert, aber noch ein letzter Glättungs-Pass (Melee mid) bis „alle drei sauber zentriert".

---

## Gemessene 3-Stil-Parität (Kern-Auftrag)

### Realer 1h-Kampf-Sim (echte combat.ts, ø per-Mob-kills/h-Ratio, ranged = 1.00) — Ground Truth
| Level | Melee | Ranged | **Magie** | Magie/Melee | Tode | im Band 0,9–1,1? |
|---|---|---|---|---|---|---|
| **L30** | 0,955 | 1,00 | **1,051** | 1,10 | 0/0/0 | ✓ alle drei im Band |
| **L40** | **1,144** | 1,00 | **1,017** | 0,89 | 0/0/0 | ✗ nur **Melee** über Band; Magie ✓ |
| **L55** | 1,078 | 1,00 | **0,985** | 0,91 | 0/0/0 | ✓ Magie/Ranged im Band, Melee oberer Rand |

**8 von 9 Stil-Checkpoints im Band — einziger Ausreißer: Melee L40 (1,144×).** Magie ist auf **allen drei** drin. Das Zielband „alle 3 Stile mid im Band" ist für **Magie und Ranged voll**, für Melee an 2 von 3 erfüllt (L30/L55), an L40 um +0,044 verfehlt.

### effDPS aus best-craftbarem Gear (analytisch, kein Mob, kein Food)
| Level | Melee | Ranged | Magie | Melee/Ranged | **Magie/Ranged** |
|---|---|---|---|---|---|
| **L30** | 61,0 | 50,5 | 54,2 | 1,21× | **1,07×** |
| **L40** | 90,2 | 73,3 | 78,0 | 1,23× | **1,06×** |
| **L55** | 139,7 | 121,4 | 121,1 | 1,15× | **1,00×** |

Gewählte Loadouts (Auszug): Melee = `blacksteel_maul`(L30, effDPS-Artefakt s.u.)/`mithril_dagger`(L40)/`adamantium_dagger`(L55) + Platte (str-Mods) + jewel-Ringe; Ranged = `*_shortbow` + Tier-Pfeil + warden_brigandine/studded_leather + ranger_cape; Magie = `blacksteel_wand`/`mithril_wand`/**`adamantium_wand`**(L55, höheres Tier gewinnt jetzt!) + frost/ember/aether-Robe + sapphire/spellbinder-Ringe.

**Die effDPS überschätzt Melee deutlich** (1,15–1,23× vs. ranged), der reale Sim korrigiert auf 0,96–1,14× — weil effDPS Mob-Evasion/Defense und die Langwaffen-Trägheit ignoriert (z.B. der L30-`blacksteel_maul` ist effDPS-„optimal", verliert real aber gegen `skeleton_icemage` 0,81×, weil sein 3490-ms-Schwung gegen evasive Mobs durchfällt). **Der reale Sim ist die Ground Truth**; effDPS bestätigt nur Richtung (Magie ≈ Ranged, Melee leicht drüber). Für Magie stimmen beide eng überein (effDPS 1,00–1,07 / real 0,99–1,05).

---

## Δ vs run5

| Checkpoint | **Magie run5 → run6** | Melee run5 → run6 | Bewertung |
|---|---|---|---|
| L30 | **0,89 → 1,051** (+0,16) | 0,99 → 0,955 | Magie von Boden ins Band ✓ |
| L40 | **0,86 → 1,017** (+0,16) | 1,11 → **1,144** | Magie gelöst; Melee von knapp-drüber → klar-drüber |
| L55 | **0,84 → 0,985** (+0,15) | 0,99 → 1,078 | Magie gelöst; Melee an oberen Rand gestiegen |

- **Magie-Kernproblem GELÖST.** run5: Magie auf allen 3 Checkpoints **unter** Band (Boden), fallender Trend. run6: Magie auf allen 3 Checkpoints **im** Band, flacher Trend. Der R4-manaCost-Cap (statt eines Roh-Buffs) war exakt richtig — bestätigt die R4-Diagnose „Magie war mana-gethrottelt, nicht roh-schwach".
- **run5-P1 manaCost-Inversion GELÖST.** run5: `adamantium_wand` (cost 9) lieferte **weniger** DPS als `mithril_wand` (cost 8). run6: cost-Caps (adamantium_wand 9→6) → der Optimierer wählt jetzt korrekt das höhere Tier `adamantium_wand` @L55. Höhere Runecrafting-Tiers sind wieder echte Upgrades.
- **Spreizung weiter halbiert:** max. paarweise run5 1,29× (L40) → run6 1,14× (L40). Bester Wert der Serie.
- **Nebenwirkung:** Melee ist mid **gestiegen** (L55 0,99 → 1,078; L40 1,11 → 1,144) — der Ranged-Trim + str-in-Platte haben Melee relativ zur Referenz angehoben. Die Decke ist von Magie zu Melee gewandert (milder als run5).

## Δ vs R4-Prognose (`balance-3style-parity-r4.md §4`)

R4 sagte für **L30/L55** voraus: Melee **0,86 / 0,90**, Magie **0,97 / 0,92** (Ranged=1,00).
Gemessen: Melee **0,955 / 1,078**, Magie **1,051 / 0,985**.

- **Magie: nahe Prognose, leicht drüber** (L30 0,97→1,05; L55 0,92→0,99) — R4 war hier konservativ (R4 vermerkte die Magie-Auto-Wahl als Unter-Optimum; mein voller Slot-Optimierer findet das echte Magie-Optimum → minimal höher). **Im Band, Auftrag erfüllt.**
- **Melee: deutlich ÜBER Prognose, Richtung verfehlt.** R4 erwartete Melee mid **unten** (0,86–0,90), real ist es **oben** (0,955–1,144). Ursache: R4 maß an L30/L55/L75/L99 (nicht L40) und mit einem Gear-Selektor, der das **Dolch-Optimum** (`mithril_dagger` −500 ms / crit 0,07, ab L40) und den **kombinierten** Effekt aus str-in-Platte **plus** Ranged-Trim unterschätzte. Beide R4-Melee-Hebel (str-Platte) und Anti-Ranged-Hebel (Trim) ziehen in dieselbe Richtung „Melee rel. hoch" → mid-Melee überschießt das R4-Ziel.

---

## Priorisierte Findings

### [P0] — keine
Keine Abstürze, keine Walls, keine Trivialität (alle Sims ≥3,1 s/Kill bei L55, ≥3,6 s mid), **0 Tode** in 3 Stilen × 3 Checkpoints × 3 Mobs. Stabilität einwandfrei.

### [P1 Balance] Melee mid leicht über Band — Decke von Magie zu Melee gewandert
**Befund (gemessen, Ground Truth):** Melee real **1,144× @L40** (über Band 1,10) und **1,078× @L55** (oberer Rand), konsistent über alle Mobs (L40: forest_warden 1,12× / pit_spider 1,10× / tide_siren 1,20×). **Konservativ:** gemessen mit Attack-Stance — die power-Stance (STYLE_DAMAGE_MULT 1,12, wirkt **nur** auf Melee) hebt die echte Melee-Decke auf ~1,28× @L40. Nicht dramatisch (kein No-Brainer wie run4-Magie ~1,9×), aber das einzige Band-Versagen und entgegen der R4-Prognose (die Melee mid **unten** erwartete).
**Fix-Richtung (content):** Den **kombinierten** Effekt aus Hebel 6 (Ranged-Trim) + Hebel 7 (str-in-Platte) hat Melee mid um ~+10–15 % zu hoch gehoben. Optionen, klein und zielgenau auf req 38–55: (a) den mid-Ranged-Munitions/Bogen-Trim (×0,78/×0,85) für req 38–55 **etwas zurücknehmen** (hebt die Referenz, senkt alle Melee/Magie-Ratios um den gleichen Faktor — Vorsicht: drückt dann auch Magie minimal), **oder** (b) den str-in-Platte-Backbone auf **mid**-Tiers (mithril/adamantium Helm/Body/Legs) leicht dämpfen, **oder** (c) `mithril_dagger`/`adamantium_dagger`-`critChance` (0,07) minimal trimmen. **Empfehlung (b)** — am chirurgischsten, lässt Ranged-Referenz und Magie unangetastet. **Erst Melee glätten, dann re-messen** (sonst kippt die Referenz).

### [P2 Balance] effDPS-Waffenprofile mid uneinheitlich — Langwaffen real schwächer als ihr effDPS
**Befund:** Der effDPS-Optimierer wählt @L30 für Melee den `blacksteel_maul` (effDPS-„optimal" via Krit/Schaden), real verliert der aber gegen evasive Mobs (`skeleton_icemage` 0,81× ranged) wegen seines 3490-ms-Intervalls — d.h. die analytische Decke und die reale Decke divergieren je nach Waffentyp. Das **understated Melee L30 (0,955×)**: mit einem schnellen blacksteel-Scimitar/Sword statt Maul läge Melee L30 real näher 1,0. Symptom: die 2H-Langwaffen sind weiter Trägheits-benachteiligt (R4-Hebel 7 „2H-Buff aIMs ×0,6" zielte auf **godiron**-Tier; die mid-2H-Tiers profitieren nur proportional und bleiben effDPS-Fallen). Kein Paritäts-Bruch, aber eine Waffen-Wahl-Falle, die naive effDPS-Optimierung mid bestraft.
**Fix-Richtung:** Den 2H-aIMs-`×0,6`-Buff (R4 Hebel 7) explizit auch auf die **mid**-2H-Tiers (steel/blacksteel/mithril Maul/Greatsword) ziehen, damit Langwaffen real ihrem effDPS folgen. Diversitäts-/Politur-Hebel, kein Band-Hebel.

### [P2 Balance] Combo-Food bleibt kosmetisch (unverändert seit run5)
**Befund:** R4 hat Combo-Food nicht angefasst. Die stil-spezifischen Buffs (`bloodgrain_stew` +4 meleeDamage, `spellwarden_bisque` +4 magicDamage, …) sind weiter **≈ +2 %** auf den mid-Roh-Schaden (~150–200) → kein Paritäts- oder Spielentscheidungs-Hebel. Greift korrekt im Auto-Eat-Pfad, 0 Tode (Heilung ausreichend).
**Fix-Richtung (unverändert run5):** Wenn Combo-Food ein echter Hebel sein soll, Stil-Schaden-Buffs mit dem Tier skalieren (mid +8/+12). Sonst bewusst kosmetisch lassen.

### [P3 Info] Suffix-System aktiv, paritäts-neutral (unverändert run5)
**Befund:** Gemessen mit Basis-Items ohne Suffix-Instanzen (alle Stile gleich). Suffixe sind WoW-Stil Random-Rolls, treffen alle Stile gleichverteilt → verschieben die strukturelle Parität nicht, erhöhen nur die Drop-Varianz. Korrekt verdrahtet, kein eigener Paritäts-Hebel. Gear-Progression mid sauber: jedes Tier ein Upgrade (manaCost-Inversion behoben).

### [P3 Balance] Endgame-Gegenprobe ausstehend — R4 hat Top-Tier-Gear angefasst
**Befund:** R4 hat godspark-Roben (`magicDamage` ×1,5 + manaRegen +0,6, wirkt L88+) gebufft und voidhide (`rangedDamage` ×0,5) getrimmt — beides **außerhalb** L25–60, aber es verschiebt die Endgame-Parität. Der mid-Befund (Magie im Band, Melee leicht heiß) sagt nichts über L75/L99.
**Fix-Richtung:** Nach dem Melee-mid-Glättungs-Fix einen **L75/L99-Sweep** fahren (R4-Prognose dort: Melee 1,01/0,89, Magie 0,99/0,88) — verifizieren, dass godspark-Rebuff + voidhide-Trim das Band auch endgame halten und Melee dort nicht ebenfalls überschießt.

---

## Erledigte run5-Punkte / positives Δ

1. **run5-P1 „Magie unter Band im gesamten Mid-Game" GELÖST.** Magie real 0,89/0,86/0,84 → **1,05/1,02/0,99**. Auf allen drei Checkpoints im Band, flacher Level-Trend statt fallend. Kern-Auftrag erfüllt — und **ohne** Roh-Buff, rein über den manaCost-Cap (R4-Diagnose bestätigt).
2. **run5-P1 „manaCost-Progressions-Inversion" GELÖST.** adamantium_wand cost 9→6 → höheres Tier ist wieder DPS-Upgrade; der Optimierer wählt es jetzt @L55 (statt mithril_wand). Magie-Waffenprogression nicht mehr invertiert.
3. **R4-Content sauber angekommen (verifiziert im Code):** manaCost-Kurve (Stab 5..10 / Wand 4..8, Spezial-Caster gesetzt), str-in-Platte (godiron body str+18 / mithril body str+4), voidhide-Trim (body rangedDamage 18→9, boots-Typo 1→6), Munition (mithril_arrow 9→7) — exakt wie `balance-3style-parity-r4.md §3`.
4. **Spreizung bester Wert der Serie** (max. 1,14× vs. run5 1,29× vs. run4 ~2×); 0 Tode/keine Walls bleiben.

## Walls / Stabilität
Kein Wall, keine Trivialität, keine Abstürze: realer 1h-Sim über L30/40/55 × 3 Stile × 3 Mobs → **0 Tode**. Einziges Kern-Restproblem ist die Melee-mid-Spitze (P1).

---

## Was fehlt für 9,5?
1. **Melee mid ins Band zentrieren (Kern-Rest):** L40 1,144× / L55 1,078× (konservativ, power-Stance höher) → chirurgisch ~−10–12 % auf den mid-Melee-Backbone (Empfehlung: str-in-Platte auf mithril/adamantium Helm/Body/Legs leicht dämpfen — lässt Ranged-Referenz und die frisch reparierte Magie unangetastet). Ziel: Melee real 0,95–1,05 an allen drei. **Pflicht** — danach sind alle 9 Stil-Checkpoints im Band.
2. **Re-Messen nach 1. mit power-Stance** für Melee (nicht nur attack), damit die echte Melee-Decke abgesichert ist, nicht nur die Untergrenze.
3. **L75/L99-Endgame-Sweep:** R4 hat godspark-Rebuff + voidhide-Trim eingebaut → verifizieren, dass das Band endgame hält und Melee dort nicht ebenfalls überschießt (R4-Prognose Melee 1,01/0,89).
4. **mid-2H-Waffen aus der effDPS-Falle holen:** R4-2H-aIMs-`×0,6`-Buff explizit auf steel/blacksteel/mithril-2H ziehen, damit Langwaffen real ihrem effDPS folgen (Diversität).
5. **Combo-Food zu echten Hebeln** (Stil-Schaden mit Tier skalieren) — sonst bewusst kosmetisch lassen.
6. **Stil-Identität jenseits der DPS erlebbar machen** (Magie-Mana-Schild/Status, Melee-Lifesteal/Tank, Ranged-Krit-Burst) — im Code da, unter uniformem Food unsichtbar; ein Content-/UX-Pass, der diese Identitäten mid spürbar macht, ohne die jetzt sehr gute DPS-Parität zu brechen.

---

### Methoden-Hinweis (Fairness & Konfidenz)
Alle drei Stile teilen **dieselbe Skill-/Attributbasis** (Kampf- + Gear-Crafting-Skills auf L); einziger Unterschied ist Gear + Stil-Formel + Mana/Munition. Der Optimierer wählt pro Slot **inkl. Waffe+Munition** das effDPS-Maximum (3 Greedy-Pässe). Realer 1h-Sim = echte combat.ts (Mana-Depletion/Weak-Cast, Köcher-Munition, Krit, Status, Mana-Schild, Auto-Eat real). **Melee mit Attack-Stance gemessen → Melee-Zahlen sind Untergrenze** (power-Stance hebt nur Melee → der P1-Befund „Melee heiß" verstärkt sich, kippt nicht). Konfidenz **hoch** für Magie/Ranged (effDPS und realer Sim eng übereinstimmend; 3 on-level Mobs/Checkpoint, per-Mob gemittelt). Konfidenz **mittel-hoch** für Melee-Absolutwerte (effDPS-Waffenwahl divergiert real bei Langwaffen, s. P2 — die L30-Maul-Wahl understated Melee L30; die L40/L55-Dolch-Werte sind robust). Das temporäre Harness (`packages/engine/src/_run6tmp.test.ts`) wurde nach der Messung **entfernt**; `packages/**` unverändert.
