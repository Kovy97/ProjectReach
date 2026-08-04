# Balance-Spec — Skilling-XP zu klein & demotivierend

**Stand:** 2026-06-23 · **Rolle:** Balance-Designer
**Scope:** Per-Action-XP **aller** ausgebauten Nicht-Kampf-Skills (woodcutting, mining, fishing, cooking, smithing, fletching, jewelcrafting, leatherworking, herblore, runecrafting, inscription, farming, foraging, **thieving**).
**Quellen:** Sim-Report (`packages/engine/src/sim.test.ts`), `packages/content/src/index.ts`, `packages/engine/src/leveling.ts`, `packages/shared/src/index.ts` (`earlyXpMult`), `packages/engine/src/tick.ts`.

> **Read-only Empfehlung.** Diese Datei ändert **keinen** Quellcode. Sie nennt die exakten neuen Zahlen/Formeln; der CEO trägt sie ein. Ich editiere ausschließlich `design/*.md`.

---

## 0. TL;DR (Headline-Apply-Liste)

Die Skilling-Aktionen geben heute **1–2 XP** im Frühgame und selbst um L20 nur **+2–3 XP** — kurvenrichtig, aber gefühlt erbärmlich. Drei komplementäre Eingriffe, zusammen ein sauberer **~×1,7** auf die absolute Per-Action-XP plus ein längerer Frühgame-Lift:

| # | Was | aktuell | **neu** | Datei |
|---|---|---|---|---|
| **A** | Kurven-Konstante `K` in der Ableitung `action.xp = round(K·sqrt(ΔXP)·dur/3.6e6)` | `90` | **`150`** | (Doku-Konstante; alle `action.xp` in `content/src/index.ts` neu berechnen) |
| **B** | `earlyXpMult(L)` — Lift weiter hochziehen | `1 + 1.5·max(0,(20−L)/19)` | **`1 + 2.0·max(0,(40−L)/39)`** | `packages/shared/src/index.ts` |
| **C** | Per-Action-Mindest-XP (statt hartem `max(1,…)`) | `1` | **`max(2, ceil(durationMs/2500))`** | Ableitungsregel in `content/src/index.ts` |

Effekt (aktive Spielzeit, Beispiel Mining mit Tier-Wechsel):

| Meilenstein | vorher (IST) | **nachher (A+B+C)** | Ziel-Korridor |
|---|--:|--:|--:|
| L15 | 1,4 h | **0,5 h** | ~1 h |
| L30 | 8,0 h | **3,0 h** | ~6 h |
| L50 | 28,3 h | **14,3 h** | ~20 h |
| L70 | 86,4 h | **48,5 h** | ~60 h |
| L99 | 331,9 h | **196,4 h** | ~250 h |

Frühgame fliegt, Midgame ist stetig und belohnend, Endgame bleibt ein echter, fairer Grind — und keine Aktion fühlt sich mehr nach „+1 XP" an.

---

## 1. Befund (reproduziert die Beschwerde des Küchenchefs)

`pnpm --filter @hearthforge/engine exec vitest run src/sim.test.ts` druckt pro Aktion die effektive XP/h (Sim läuft durch `advance` → enthält `earlyXpMult`). Gemessene **IST-Werte** (Auszug, 1 h):

| Aktion | Skill | Lv (Start) | XP/h IST | `action.xp` IST |
|---|---|--:|--:|--:|
| cut_normal_tree | woodcutting | 1 | 2.234 | **1** |
| mine_copper | mining | 1 | 1.970 | **1** |
| catch_shrimp | fishing | 1 | 1.767 | **1** |
| smelt_copper | smithing | 1 | 2.503 | **1** |
| pickpocket_beggar | thieving | 1 | 1.417 | **1** |
| mine_iron | mining | 10 | 1.428 | **1** |
| mine_coal | mining | 15 | 1.963 | **2** |
| mine_mithril | mining | 35 | 4.380 | **6** |
| mine_runite | mining | 55 | 11.886 | **21** |
| mine_bloodiron | mining | 70 | 25.970 | **49** |
| mine_aetherite | mining | 90 | 70.278 | **159** |
| mine_godiron | mining | 105 | 148.428 | **372** |
| pickpocket_noble | thieving | 65 | 5.150 | **25** |
| heist_idol_hoard | thieving | 115 | 72.568 | **772** |

> **Die XP/h ist nicht das Problem — die *Stückzahl pro Aktion* ist es.** Eine 3-Sekunden-Aktion, die `+1 XP` gibt, gefolgt vom nächsten `+1 XP`, gibt **null Belohnungs-Feedback**, obwohl sie kurvenrichtig 2.000 XP/h liefert. Genau das meint der Chef mit „demotivierend".

### 1.1 Ursachenkette

Die letzte Balance-Runde (`design/balance-xp-table.md`) hat `action.xp` korrekt an die Ziel-Kurve `ziel_xph(L)=90·sqrt(xpForLevel(L+1)−xpForLevel(L))` angepasst und mit `max(1,…)` gedeckelt. Bei kurzen Frühgame-Aktionen kollabiert das auf **1**:

```
action.xp = round( 90·sqrt(ΔXP_L) · durationMs / 3.600.000 )
          → L1, dur=3500ms: round(820·3500/3.6e6) = round(0,8) = 1
```

Zwei Schmerzpunkte:
1. **Absolute Winzigkeit** (L1–~L20: `action.xp ∈ {1,2,3}`) — kein Erfolgserlebnis pro Klick.
2. **Post-L20-Cliff:** `earlyXpMult` hebt nur bis L20 (L1 ×2,5 → L20 ×1,0). Ab L20 fällt das Tempo schlagartig auf die nackte (langsame) Kurve zurück — genau wenn der Spieler die ersten Tier-Aktionen freischaltet, wird's spürbar zäher.

### 1.2 Zeit-bis-Level IST (Mining, Tier-Wechsel-Modell)

| Ziel | IST aktiv | Bewertung |
|---|--:|---|
| L15 | 1,4 h | ok |
| L30 | 8,0 h | grenzwertig |
| L50 | 28,3 h | zu zäh (Ziel ~20 h) |
| L70 | 86,4 h | zäh |
| L99 | **331,9 h** | **deutlich über** Ziel ~250 h |

Der Slog ist also **doppelt**: kleine Zahlen *und* objektiv zu lange Zeiten ab Midgame.

---

## 2. Optionen — bewertet

| Option | Wirkung | Bewertung |
|---|---|---|
| **(a) Kurven-Konstante `K` anheben (90→~150)** | Skaliert **alle** `action.xp` uniform hoch (×1,67). XP/h & Stückzahl steigen proportional, Kurvenform bleibt exakt erhalten. | **Kern-Fix.** Einfach, konsistent, risikoarm. |
| **(b) Flacher globaler `action.xp`-Multiplikator** | Identisch zu (a) im Effekt, aber als Runtime-Mult statt in den Daten. | Gleichwertig; (a) ist datengetriebener und in der Sim sofort sichtbar. **Empfehlung: (a).** |
| **(c) `earlyXpMult` verbreitern/höher** | Beseitigt den Post-L20-Cliff; hebt L20–40 an, **ohne** Endgame zu berühren (Mult=1,0 ab L40). | **Nötig gegen den Cliff.** Kombiniert mit (a). |
| **(d) Sinnvolles, skaliertes Minimum** | Verhindert „+1 XP"-Aktionen; koppelt Mindest-XP an Aktionsdauer. | **Politur, hohe Gefühlswirkung.** Macht jede Aktion ≥2 (lange ≥3–4). |
| **(e) Kurve abflachen / L99 senken** | — | **Verworfen:** Kurve ist gut (klassisch), soll bleiben. |

**Gewählt: (a) + (c) + (d).** Begründung über den Sweep (§3).

---

## 3. Kalibrierung

### 3.1 Konstanten-Sweep (Mining, Tier-Wechsel-Modell, aktive Stunden)

| Combo | L10 | L15 | L30 | L50 | L70 | L99 |
|---|--:|--:|--:|--:|--:|--:|
| IST: `K90` + earlyAlt | 0,5 h | 1,4 h | 8,0 h | 28,3 h | 86,4 h | 331,9 h |
| `K140` + earlyNeu + min | 0,2 h | 0,5 h | 3,0 h | 14,5 h | 51,6 h | 210,2 h |
| **`K150` + earlyNeu + min** | **0,2 h** | **0,5 h** | **3,0 h** | **14,3 h** | **48,5 h** | **196,4 h** |
| `K160` + earlyNeu + min | 0,2 h | 0,4 h | 2,3 h | 12,1 h | 44,2 h | 182,9 h |
| `K150` + earlyAlt + min | 0,3 h | 0,7 h | 5,1 h | 17,7 h | 51,9 h | 199,8 h |

`earlyNeu(L) = 1 + 2,0·max(0,(40−L)/39)` · `min = max(2, ceil(dur/2500))`.

**Gewählt: `K=150`, `earlyNeu` (Lift bis L40), skaliertes Minimum.**
- L15 in ~0,5 h, L30 in 3 h, L50 in ~14 h → Frühgame fliegt, Midgame stetig & rewarding.
- L99 in **196 h** statt 332 h — fairer, aber immer noch ein echter Mastery-Grind (Ziel ~250 h ist eine weiche Obergrenze; 196 h ist im gesunden Band und v.a. **besser als der demotivierende IST**).
- Kurvenform oberhalb L40 bleibt **exakt** erhalten (linearer Skalar `K`, earlyMult=1,0 ab L40).

### 3.2 Effektive XP/h unter der neuen Kalibrierung (mit Mult)

| Tier-Lv | xph(K150) | ×earlyNeu | **effektiv XP/h** |
|---:|--:|--:|--:|
| 1 | 1.367 | ×3,00 | **4.100** |
| 10 | 2.142 | ×2,54 | **5.438** |
| 20 | 3.511 | ×2,03 | **7.113** |
| 30 | 5.752 | ×1,51 | **8.700** |
| 40 | 9.424 | ×1,00 | **9.424** |
| 50 | 15.452 | ×1,00 | **15.452** |
| 70 | 41.574 | ×1,00 | 41.574 |
| 99 | 174.718 | ×1,00 | 174.718 |

Gleichmäßiger, monoton steigender Verlauf ohne Cliff bei L20.

---

## 4. Apply-Liste (für den CEO)

### 4.1 Kurven-Konstante (Quelle aller `action.xp`)

> Die Konstante `90` aus `ziel_xph(L)=90·sqrt(ΔXP)` ist die Single-Source-of-Truth, aus der **jeder** `action.xp`-Wert in `content/src/index.ts` abgeleitet wurde. Wert anheben und **alle** Skilling-`action.xp` neu berechnen:

```
K:  90  ->  150
action.xp = max( max(2, ceil(durationMs/2500)),  round( 150 · sqrt(xpForLevel(L+1)−xpForLevel(L)) · durationMs / 3.600.000 ) )
            mit L = levelRequired ?? 1
```

### 4.2 `earlyXpMult` — `packages/shared/src/index.ts` (Z. 98–100)

```ts
// vorher:
export function earlyXpMult(level: number): number {
  return 1 + 1.5 * Math.max(0, (20 - level) / 19);
}
// nachher:
export function earlyXpMult(level: number): number {
  return 1 + 2.0 * Math.max(0, (40 - level) / 39); // L1 ×3,0 → L40 ×1,0, darüber wirkungslos
}
```

Gilt automatisch für Skilling (`tick.ts` Z. 47) **und** Kampf (`combat.ts addXp`) — der Post-L20-Cliff verschwindet in beiden Ökonomien. **Endgame (L40+) bleibt exakt unberührt** (Mult = 1,0).

> Hinweis Kombination mit Kampf: Die Kampf-XP-Konstanten (`MELEE_XP_PER_DAMAGE` etc.) wurden bereits in `design/balance-combat-vs-gathering.md` auf ×0,06 kalibriert. Der breitere `earlyXpMult` hebt Kampf **nur** L20–40 leicht an (vorher schon L<20), beult die obere Kurve nicht aus und hält das Verhältnis Kampf:Sammeln (~1,3–2× früh) intakt. **Keine weitere Kampf-Anpassung nötig.**

### 4.3 Per-Action-`xp` — neue Werte (repräsentativ, ×1,7-Schema)

Vollständige Ableitung pro Aktion über §4.1. Repräsentative Stützpunkte über alle Tiers/Skills:

| Action | Skill | Lv | durMs | xp IST | **xp NEU** | ×Faktor |
|---|---|--:|--:|--:|--:|--:|
| cut_normal_tree | woodcutting | 1 | 3000 | 1 | **2** | ×2,0 |
| cut_oak_tree | woodcutting | 1 | 5000 | 1 | **2** | ×2,0 |
| mine_copper | mining | 1 | 3500 | 1 | **2** | ×2,0 |
| mine_iron | mining | 10 | 4000 | 1 | **2** | ×2,0 |
| mine_coal | mining | 15 | 4500 | 2 | **3** | ×1,5 |
| mine_mithril | mining | 35 | 5000 | 6 | **10** | ×1,7 |
| mine_adamantite | mining | 45 | 5500 | 11 | **18** | ×1,6 |
| mine_runite | mining | 55 | 6500 | 21 | **36** | ×1,7 |
| mine_bloodiron | mining | 70 | 7000 | 49 | **81** | ×1,7 |
| mine_titanium | mining | 80 | 7800 | 89 | **148** | ×1,7 |
| mine_aetherite | mining | 90 | 8500 | 159 | **264** | ×1,7 |
| mine_godiron | mining | 105 | 9500 | 372 | **621** | ×1,7 |
| catch_shrimp | fishing | 1 | 4000 | 1 | **2** | ×2,0 |
| catch_trout | fishing | 1 | 6000 | 1 | **3** | ×3,0 |
| smelt_copper | smithing | 1 | 2600 | 1 | **2** | ×2,0 |
| smelt_iron | smithing | 10 | 3200 | 1 | **2** | ×2,0 |
| smelt_steel | smithing | 20 | 4500 | 3 | **4** | ×1,3 |
| smelt_mithril | smithing | 35 | 6500 | 8 | **13** | ×1,6 |
| smelt_runite | smithing | 55 | 8500 | 28 | **47** | ×1,7 |
| smelt_titanium | smithing | 75 | 9500 | 84 | **141** | ×1,7 |
| smelt_godiron | smithing | 95 | 12000 | 287 | **478** | ×1,7 |
| cook_shrimp | cooking | 1 | 2500 | 1 | **2** | ×2,0 |
| brew_minor_healing | herblore | 1 | 3500 | 1 | **2** | ×2,0 |
| pickpocket_beggar | thieving | 1 | 3000 | 1 | **2** | ×2,0 |
| pickpocket_merchant | thieving | 12 | 3600 | 1 | **2** | ×2,0 |
| loot_market_stall | thieving | 20 | 4200 | 2 | **4** | ×2,0 |
| pickpocket_tax_collector | thieving | 28 | 4000 | 3 | **6** | ×2,0 |
| pickpocket_city_guard | thieving | 45 | 4200 | 8 | **14** | ×1,8 |
| pickpocket_noble | thieving | 65 | 4600 | 25 | **41** | ×1,6 |
| raid_tax_vault | thieving | 85 | 9000 | 131 | **218** | ×1,7 |
| heist_idol_hoard | thieving | 115 | 12000 | 772 | **1.286** | ×1,7 |

> **Regel statt vollständiger Liste:** Da der Effekt ein uniformer Skalar ist, kann der CEO **jeden** `action.xp` in `content/src/index.ts` mit der Formel aus §4.1 neu berechnen (oder pragmatisch alle bestehenden Werte ×1,667 und auf das Minimum `max(2, ceil(dur/2500))` anheben). Gleiche Logik **1:1** für die Skills woodcutting, mining, fishing, cooking, smithing, fletching, jewelcrafting, leatherworking, herblore, runecrafting, inscription, farming, foraging, thieving. Die `loot_reliquary`/`plunder`/`heist`-Top-Thieving-Aktionen folgen demselben Schema (kein Sonderfall mehr nötig, da die Kurve bereits passt).

### 4.4 Was **nicht** geändert wird

- **`durationMs`** aller Aktionen — Pacing/Animation-Gefühl bleibt.
- **`xpForLevel`-Kurve** in `leveling.ts` — bleibt (gute klassische Idle-Kurve).
- **`monster.xp`** — die Kill-Bonus-Werte aus `balance-xp-table.md` §4.2 bleiben; der breitere `earlyXpMult` reicht für Kampf-Frühtempo.

---

## 5. Vorher/Nachher — Ziel-Zeiten (3 Skills)

Tier-Wechsel-Modell, aktive Stunden. Mining real gemessen; Smithing/Thieving analog (gleiche Konstanten, ähnliche Tier-Dauern → ±10 %).

| Skill | Ziel | vorher (IST) | **nachher (A+B+C)** |
|---|---|--:|--:|
| **Mining** | L15 | 1,4 h | **0,5 h** |
| | L30 | 8,0 h | **3,0 h** |
| | L50 | 28,3 h | **14,3 h** |
| | L99 | 331,9 h | **196,4 h** |
| **Smithing** | L30 | ~7,5 h | **~2,9 h** |
| | L50 | ~27 h | **~14 h** |
| | L99 | ~320 h | **~195 h** |
| **Thieving** | L30 | ~8 h | **~3 h** |
| | L50 | ~28 h | **~14 h** |
| | L99 | ~330 h | **~196 h** |

**Gefühl nachher:** L1-Aktion gibt **+2 XP** (statt +1), L15-Aktion ~+3, L35-Tier +10–13, L70-Tier +80 — jede Aktion liefert sichtbares Feedback, das mit dem Tier wächst. Der L20-Cliff ist weg (Lift läuft bis L40 sanft aus). Endgame (L40+) skaliert linear hoch, ohne dass die obere Kurvenform trivialisiert wird.

---

## 6. Verifikation (für den CEO nach dem Eintragen)

1. `pnpm --filter @hearthforge/engine exec vitest run src/sim.test.ts` — headless, **nie** Electron starten.
2. Prüfen: Frühgame-Aktionen zeigen `action.xp ≥ 2`; XP/h-Spalte ~1,7× der heutigen Werte; keine neuen `findIssues`-Auffälligkeiten.
3. `design/always-update-save-logic.md` beachten: reine Content-/Konstanten-Anpassung → kein State-Schema-Change, **keine** SAVE_VERSION-Migration nötig (XP-Werte sind abgeleitet, nicht persistiert).
