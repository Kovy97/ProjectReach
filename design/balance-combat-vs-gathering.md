# Balance-Spec — Combat-XP vs. Gathering-XP

**Stand:** 2026-06-23 · **Rolle:** Balance-Designer
**Quelle:** Sim-Messung (`packages/engine/src/sim.ts`, eigene Mess-Probe), `packages/engine/src/combat.ts`, `packages/shared/src/index.ts`, `packages/engine/src/leveling.ts`, `packages/content/src/index.ts`

> **Read-only Empfehlung.** Diese Datei ändert **keinen** Quellcode. Sie nennt konkrete neue Zahlenwerte; der CEO trägt sie ein.
> **Scope-Abgrenzung zu `design/balance-xp-table.md`:** Jene Datei justiert nur `monster.xp` (Kill-Bonus) und `action.xp` an die Kurve. Sie übersieht die **eigentliche Ursache**: die *schadensbasierte* Kampf-XP (`*_XP_PER_DAMAGE`), die ~99,9 % der Kampf-XP ausmacht. **Diese Spec hier ist die fehlende Hälfte** und hat Vorrang bei der Kampf-XP-Frage.

---

## 1. Messung (reproduziert die Beschwerde des Küchenchefs)

`pnpm --filter @hearthforge/engine test sim` druckt den Balance-Report. Der gedruckte Combat-Block zeigt nur Kills/Gold, **nicht** XP/h. Ich habe daher die effektive Kampf-XP/h direkt gemessen (frischer Charakter, Dauer-Farm, 1 h Spielzeit), parallel zur Ziel-Kurve.

**Ziel-Sammelkurve** `ziel_xph(L) = 90·sqrt(xpForLevel(L+1) − xpForLevel(L))`:

| L | 1 | 5 | 10 | 15 | 20 | 25 | 30 | 50 | 70 | 99 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| ziel_xph | **820** | 1.002 | 1.285 | 1.647 | 2.107 | **2.697** | 3.451 | 9.271 | 24.944 | 104.831 |

Gemessene **Sammel-XP/h** stimmen damit überein (Report: `catch_shrimp` 904, `catch_trout` 601 — „auf Kurve" für L1, aber gefühlt langsam).

**Gemessene Kampf-XP/h** (Skill `attack`; `power` identisch, `vitality` ≈ 0,57×, `defence` vernachlässigbar):

| Monster (Lv) | frischer Held, nur `bronze_sword` | Baseline-Held (STR5/CON5, Schwert+Body+Schild, Food) |
|---|--:|--:|
| chicken (1) | **92.644** XP/h | 112.958 XP/h |
| cow (3) | 92.709 | 113.390 |
| goblin (1) | 91.041 | 112.169 |
| boar (6) | 85.827 | 107.622 |

**Zeit bis Level** (frischer Held auf chicken, schadensbasierte XP, IST-Stand):

| Ziel | gemessen IST | „gefühlt" laut Chef |
|---|--:|---|
| L15 | **~5 min** | — |
| L25 | **~11 min** | „~10 min" ✓ bestätigt |
| L50 | **~65 min** | — |
| L49 | **in 1 h erreicht** (nur durch Hühner!) | — |

---

## 2. Diagnose (quantitativ)

- **Kampf vs. Ziel-Kurve am selben Level:**
  - L1: 92.644 / 820 ≈ **113× zu schnell**.
  - Der Charakter rast in Minuten auf L25; selbst dort (Ziel 2.697 XP/h) ist Kampf mit ~93k XP/h noch **~34× zu schnell**.
- **Ursache:** Kampf-XP ist **schadensbasiert**, nicht pro Kill. Jeder ausgeteilte Schadenspunkt → `MELEE_XP_PER_DAMAGE` (1,4) XP auf *je* `attack` UND `power`, plus `VITALITY_XP_PER_DAMAGE` (0,8) auf `vitality`. Schnelles Töten vieler Niedrig-HP-Gegner ⇒ enorme Schadensmenge/h ⇒ enorme XP/h, **ungebremst von der Sammelkurve**.
- **Kill-Bonus (`monster.xp`) ist irrelevant:** chicken `xp=1`. Bei ~1.270 Kills/h sind das +1.270 XP/h gegenüber **92.644** XP/h aus Schaden — **~1,4 %**. Das Retuning in `balance-xp-table.md` (z. B. chicken `xp: 8→1`) bewegt also faktisch nichts an der Kampfgeschwindigkeit, solange `MELEE_XP_PER_DAMAGE` unverändert bleibt.
- **Sammeln vs. Kampf gesamt:** Kampf ~92k/h vs. Sammeln ~0,6–0,9k/h früh ⇒ **~100–150× Faktor**. Deckt sich mit der Beschwerde („10–50×", real eher noch schlimmer).

**Warum schadensbasiert grundsätzlich richtig ist:** Es skaliert automatisch mit der Spielerstärke und belohnt härtere Gegner (mehr HP = mehr Schaden = mehr XP). Wir wollen das *Modell* behalten, nur die **Konstante** kalibrieren.

---

## 3. Kalibrierung der schadensbasierten Konstanten

**Zielband:** Kampf darf **modest** schneller bleiben als reines Sammeln (Kampf hat Risiko/Food-Kosten), aber **nicht** 10×. Anvisiert: früh ~1,2–2× der Sammelkurve, mit derselben Wachstumsform (die XP wächst weiter mit der Spielerstärke).

**Skalierungs-Sweep** (frischer Held, chicken; Zeit bis Level; konservativ, da der Held intern weiter mit Roh-Rate hochlevelt → echte Zeiten eher etwas langsamer):

| Faktor auf XP/dmg | L10 | L15 | L25 | L50 |
|---|--:|--:|--:|--:|
| 1,0 (IST) | 3 min | 5 min | 11 min | 65 min |
| 0,25 | 8 | 13 | 28 | 188 |
| 0,12 | 13 | 21 | 47 | >240 |
| **0,06 (Empfehlung)** | **20** | **33** | **78** | >240 |
| 0,03 | 32 | 55 | 134 | >240 |

**Gewählt: Faktor ≈ 0,06.** Begründung:
- **L1→15 in ~33 min** — genau im Zielfenster „~30–45 min aktiv".
- L25 in ~78 min, L50 jenseits weniger Stunden — gesundes Idle-Tempo statt 10-Minuten-Trivialisierung.
- Kampf bleibt damit am unteren Levelbereich grob **1,3–2×** der Sammelkurve (Risiko-Prämie), reißt die High-Level-Form aber nicht auf, weil es ein **linearer Skalar** auf das bestehende Modell ist — Endgame-Pacing (L50/L99) bleibt **relativ** intakt.

### 3.1 Konkrete neue Werte

`neu = alt × 0,06` (gerundet auf saubere Zahlen):

| Konstante | aktuell | empfohlen | Rechnung |
|---|--:|--:|---|
| `MELEE_XP_PER_DAMAGE` | 1,4 | **0,085** | 1,4 × 0,06 ≈ 0,084 → 0,085 |
| `VITALITY_XP_PER_DAMAGE` | 0,8 | **0,05** | 0,8 × 0,06 = 0,048 → 0,05 |
| `DEFENCE_XP_PER_DAMAGE` | 1,8 | **0,11** | 1,8 × 0,06 ≈ 0,108 → 0,11 |

**Ranged/Magic-Routing (×2 in `grantOffenseXp`):** unverändert lassen. Es bleibt `damage × MELEE_XP_PER_DAMAGE × 2`, d. h. der ×2-Faktor bleibt als Stil-Ausgleich (Ranged/Magic trainieren nur **einen** Offensiv-Skill statt `attack`+`power` gemeinsam). Mit der neuen Konstante ergibt das `damage × 0,17` pro Treffer — proportional korrekt mitskaliert, kein eigener Eingriff nötig.

> Verhältnis der drei Konstanten **bewusst beibehalten** (1,4 : 0,8 : 1,8 → 0,085 : 0,05 : 0,11). `defence`/`vitality` sind ohnehin schon langsam (Defence skaliert nur mit *eingestecktem* Schaden, der bei dominanten Kämpfen klein ist — siehe Report: 38–814 def-XP/h). Sie nicht extra anheben, sonst überholen sie wieder das Sammeln.

### 3.2 Kill-Bonus (`monster.xp`)
Folge der separaten Empfehlung in `design/balance-xp-table.md` (Abschnitt 4.2, Werte an `ziel_xph(level)·TTK/3600`). Mit den neuen Konstanten ist der Kill-Bonus jetzt **anteilig spürbar** (vorher 1,4 %, nach −94 % Schadens-XP nun ~20 % der Kampf-XP) und gibt der Tier-Progression von Monstern wieder Sinn. **Keine Doppel-Korrektur**: die Per-Damage-Senkung hier und das Kill-Bonus-Retuning dort sind komplementär, nicht additiv gemeint.

---

## 4. Früh-Game-Lift (gegen den L1→15-Slog) — beide Ökonomien

Die Messung zeigt: **reines Sammeln** ist von sich aus ein Slog (L15 ≈ 2 h bei ~820–1.100 XP/h). Sobald Kampf auf Sammel-Tempo gebremst ist, gilt dieser Slog für **beide**. Daher ein **gemeinsamer, sanft auslaufender Früh-Level-Multiplikator** auf *gewährte* XP (Sammeln **und** Kampf), nicht auf die Kurve selbst — so bleibt Endgame unberührt.

**Vorschlag `earlyXpMult(level)`** (anzuwenden in `tick.ts` Z. 47 bei `skill.xp += action.xp` und in `combat.ts` `addXp`):

```
earlyXpMult(L) = 1 + 1,5 · max(0, (20 − L) / 19)      // L1: ×2,5  ·  L10: ×1,79  ·  L20+: ×1,0
```

- Verdoppelt bis ver-2,5-facht das Tempo nur unter L20, **null Effekt ab L20** → High-Level-Kurve (L50/L99) bleibt exakt wie geplant.
- `L` = Level **des jeweils trainierten Skills** (jeder Skill hat seinen eigenen Frühbonus), nicht Gesamtlevel.

**Ziel-Zeiten L1→15 (aktiv) nach allen Änderungen:**

| Pfad | vor (IST) | nach (Konstanten 0,06 + earlyMult) |
|---|--:|--:|
| Kampf (chicken, frisch) | ~5 min | **~25–35 min** |
| Sammeln (catch_shrimp etc.) | ~120 min | **~45–60 min** |

Beide landen im Zielband „angenehme erste Sitzung", Kampf bleibt knapp voraus.

> **Alternative (falls kein Code-Hook erwünscht):** statt `earlyXpMult` die `action.xp` der **L1-Tier-Aktionen** moderat anheben (z. B. `catch_shrimp` 1→3, `catch_trout` 1→4, `cut_normal_tree` 1→3). Wirkt nur auf Sammeln, nicht auf Kampf, und beult die Kurve bei höheren Tiers nicht aus. Schwächer, aber rein datengetrieben. **Empfehlung: der Multiplikator**, weil er Sammeln **und** Kampf symmetrisch trifft.

---

## 5. Apply-Liste (für den CEO)

### 5.1 Schadensbasierte Kampf-Konstanten — `packages/shared/src/index.ts`

| constant / value | current | recommended | rationale |
|---|--:|--:|---|
| `MELEE_XP_PER_DAMAGE` | `1.4` | **`0.085`** | Kampf ist ~113× zu schnell (92,6k vs. 820 XP/h@L1). ×0,06 bringt L1→15 auf ~33 min, Kampf bleibt ~1,3–2× Sammeln statt 100×. |
| `VITALITY_XP_PER_DAMAGE` | `0.8` | **`0.05`** | Gleicher Skalar (×0,06), Verhältnis zu den anderen beibehalten. |
| `DEFENCE_XP_PER_DAMAGE` | `1.8` | **`0.11`** | Gleicher Skalar (×0,06); Defence bleibt naturgemäß langsam (nur eingesteckter Schaden). |
| Ranged/Magic ×2-Routing (`grantOffenseXp`) | `×2` | **unverändert** | Stil-Ausgleich (1 Offensiv-Skill statt 2). Skaliert automatisch mit der neuen Konstante mit. |

### 5.2 Früh-Game-Tempo (eine der beiden Varianten)

| value | current | recommended | rationale |
|---|--:|--:|---|
| `earlyXpMult(L)` in `tick.ts` (Sammeln) + `combat.ts addXp` | — (kein Mult) | **`1 + 1.5·max(0,(20−L)/19)`** | Hebt nur L<20 (L1 ×2,5 → L20 ×1,0). Beseitigt den L1→15-Slog für **beide** Ökonomien, lässt Endgame-Kurve unberührt. |
| *Alt.:* `catch_shrimp.xp` | `1` | `3` | Falls kein Code-Hook: gezielter Lift der L1-Sammel-Aktionen statt Multiplikator. |
| *Alt.:* `catch_trout.xp` | `1` | `4` | dito |
| *Alt.:* `cut_normal_tree.xp` | `1`* | `3` | dito (*nach balance-xp-table.md). |

### 5.3 Kill-Bonus `monster.xp`
→ Werte aus `design/balance-xp-table.md` §4.2 übernehmen (komplementär, nicht zusätzlich kürzen).

---

## 6. Ziel-Zeit-Schätzungen vor/nach (Headline)

| Meilenstein | vor (IST) | nach (5.1 + 5.2) | Sammeln nach |
|---|--:|--:|--:|
| Combat L15 | ~5 min | **~25–35 min** | — |
| Combat L25 | ~11 min | ~60–80 min | — |
| Combat L50 | ~65 min | mehrere Stunden | — |
| Gathering L15 | ~120 min | — | **~45–60 min** |
| Verhältnis Kampf:Sammeln (früh) | **~100–150×** | **~1,3–2×** | — |

**Endgame (L50/L99) bleibt relativ erhalten:** Beide Eingriffe sind ein linearer Skalar (5.1) bzw. wirken nur unter L20 (5.2) — die Form der RuneScape-Kurve oberhalb bleibt unangetastet.
