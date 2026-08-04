# Sweep 4 — Neuer Blickwinkel: Mastery-System-Tiefenprüfung (über ALLE Skills)

**Agent:** Blickwinkel #15 (Mastery) · **Datum:** 2026-07-01 · **Methode:** Statische Wiring-Prüfung
(Engine `tick.ts` gegen `shared` + `mastery.ts`), echter `SimPlayer`-Treiber (headless) für empirische
Ertrag-/Kurven-Messung, UI-Surfacing-Audit (`MasteryPage`/`SkillPage`/`StatsPage`), Persistenz-Check.
Temp-Skript `zzmastery-analysis.test.ts` nach dem Lauf gelöscht — Baum sauber (keine Prod-Code-Änderung).

**NOTE: A−** — Mastery ist **vollständig verdrahtet** (alle sechs Bonus-Kanäle werden in der Engine
wirklich angewandt — KEIN „defined but never applied"), an drei Stellen der UI sichtbar, save-sicher
migriert und liefert einen **spürbaren, monotonen Langzeit-Anreiz** (empirisch ~+90 % Ertrag bei
Aktions-Mastery 99 + vollem Pool). Kurve ist Melvor-korrekt front-loaded (früh sichtbare Boni, langer
Endgame-Schwanz). Abzüge nur für Politur: ein Off-by-Text im Pool-Hinweis (sagt 10 % statt echten 5 %),
ein UI-Badge das den Pool-Anteil unterschlägt, und die grundsätzliche Design-Lücke, dass **Kampf 0
Mastery** bekommt. Keine P0/P1 — ship-tauglich.

---

## 1) Wiring-Audit: werden die Boni WIRKLICH angewandt? — JA, alle sechs Kanäle (confirmed)

Das ist die Kernfrage dieses Blickwinkels („defined but never applied?"). Ergebnis: **alles live.**
Es gibt zwei Bonus-Ebenen — pro Aktion (Aktions-Mastery) und pro Skill (Pool-Checkpoints) — mit je drei
Effekten. Alle sechs sind in `packages/engine/src/tick.ts` verdrahtet:

| Ebene | Effekt | Formel-Quelle (`shared`) | Anwendung (`tick.ts`) |
|---|---|---|---|
| Aktion | Preservation (Input sparen) | `masteryPreserveChance` | `completeAction` `:90–98` (Input-Verbrauch) |
| Aktion | Doppel-Ertrag | `masteryDoubleChance` | `:136–158` (`qty *= 2`) |
| Aktion | Tempo (Dauer ↓) | `masterySpeedMult` | `effectiveActionDurationMs` `:203` |
| Pool | +Doppel/+Tempo/+Preserve | `poolCheckpointBonus` | `pb = masteryPoolBonus(...)` `:84`, additiv in `:91/:138/:204` |

- Mastery-XP wird pro Abschluss vergeben: `mastery.xp += action.xp` (`:143`) — bewusst **Basis-`action.xp`
  ohne Pet-/Buff-/Thieving-Multiplikatoren (Kommentar `:120–123`). Mastery = reine Wiederholungs-Zählung.
- Determinismus-sauber: `nextFloat` wird für Preserve/Double nur gezogen, wenn die Chance > 0 ist — bei
  frischem State (Pool < 1. Checkpoint) exakt 0 zusätzliche Würfe. Bestätigt durch `mastery.test.ts`
  („frischer State liefert keine Boni").
- UI liest dieselben Reader (`masteryLevel/Progress/BonusChance/SpeedFor/PreserveFor`, `masteryPoolBonus/Pct`)
  aus `packages/engine/src/mastery.ts` — kein toter Export. Save/Load klemmt `state.mastery[*].xp` gegen den
  XP-Deckel (`packages/persistence/src/index.ts:184–187`) → migrations-sicher.

**Fazit:** Mastery verpufft NICHT unsichtbar. Es ist das am saubersten verdrahtete Meta-System im Spiel.

## 2) Mastery-XP-Kurve — identisch zur Skill-Kurve, front-loaded, monoton

Mastery nutzt exakt die gemeinsame `xpForLevel`-Tabelle (`leveling.ts`), d. h. Mastery-99 einer EINZELNEN
Aktion = 13.034.431 XP auf genau dieser Aktion. Boni pro Mastery-Level (gemessen):

| m-Lvl | XP-Schwelle | Doppel | Tempo | Preserve |
|---|---|---|---|---|
| 2 | 83 | 0,5 % | −0,1 % | 0,4 % |
| 10 | 1.154 | 4,5 % | −1,3 % | 3,6 % |
| 20 | 4.470 | 9,5 % | −2,8 % | 7,6 % |
| 50 | 101.333 | 24,5 % | −7,4 % | 19,6 % |
| 90 | 5.346.332 | 44,5 % | −13,3 % | 35,6 % |
| 99 | 13.034.431 | 49,0 % | −14,7 % | 39,2 % |

Alle drei Kurven **monoton steigend, sauber gekappt** (Double 50 %, Speed 15 %, Preserve 40 %). Empirisch
(cut_normal_tree @ WC45, 1 h reales Antreiben): 2.604 Mastery-XP → **Mastery 15 in ~1 h**. Zeit bis Meilenstein
auf EINER Low-Tier-Aktion: m30 ~5 h · m50 ~39 h · m70 ~283 h · m90 ~2.053 h · m99 ~5.005 h.

Das ist die **richtige** Melvor-Form: früh viel sichtbarer Fortschritt (m1→m30 in Stunden), danach
asymptotischer Endgame-Schwanz. Wichtig: Einzel-Aktions-m99 ist praktisch unerreichbar für Low-Tier —
**aber das ist Absicht**, denn der praktische Langzeit-Anker ist der Pool (Abschnitt 3), nicht m99 je Aktion.

## 3) Belohnungs-Schwellen — Pool-Checkpoints (der eigentliche Langzeit-Anker)

Der skillweite Pool referenziert `MASTERY_POOL_REFERENCE_LEVEL = 20` (nicht L99 — sonst >270M/Skill,
1. Checkpoint praktisch unerreichbar; Kommentar `shared:2636–2641`). Pool-Kapazität = nAktionen ×
`xpForLevel(20)` (= nAktionen × 4.470). Checkpoints `[0.05, 0.25, 0.5, 0.95]`:

| Schwelle | Bonus | Zweck |
|---|---|---|
| 5 % | +3 % Doppel | **früh erreichbar**, sichtbarer erster Payoff |
| 25 % | +4 % Tempo | |
| 50 % | +5 % Preserve | |
| 95 % | +5 % Doppel, +4 % Tempo | Capstone |

Voll gefüllt: +8 % Doppel, +8 % Tempo, +5 % Preserve **skillweit** — additiv oben auf die Aktions-Mastery.
Der 5 %-Checkpoint ist im Frühgame realistisch (Cooking-Pool 5 % = ~9.610 Mastery-XP gesamt → ~1–7 h je nach
Tier, mit steigendem Tier deutlich schneller). Voller Pool bleibt korrekt ein Mehrtages-Ziel. Alle vier
Checkpoints sind erreichbar (Pool cappt bei 1,0 ≥ 0,95). Bestätigt durch `mastery.test.ts` (poolCheckpointBonus
0/0,05/0,3/1,0).

## 4) Empirischer Payoff — „lohnt es sich?": ja, ~verdoppelter Ertrag

`SimPlayer`, gleiche Aktion, 1 h, isolierter Mastery-Effekt:

- **cut_normal_tree Logs/h:** m1 = 1.349 → m99 (+voller WC-Pool) = **2.560** = **+89,8 %**. Zerlegt: ~+49 %
  Doppel (Aktion) + ~+8 % Doppel (Pool) auf ~+22 % mehr Abschlüsse (Speed Aktion+Pool). Das ist ein
  massiver, klar fühlbarer Endgame-Multiplikator für Idle-Ertrag/Std.
- **Preservation (Cooking):** durch `mastery.test.ts` bestätigt — auf m99 (~39 % + Pool) liegt der
  Roh-Verbrauch klar unter dem Ertrag (Material-Ersparnis greift), bei m1 exakt 1:1 (kein Gratis-Craft).

Damit ist Mastery ein **echter** Grund, nach Skill-99 weiterzumachen (mehr Ertrag/Std, weniger Material) —
kein kosmetischer Zähler.

## 5) Sichtbarkeit — Mastery ist an DREI Stellen präsent (spürbar, nicht versteckt)

- **`SkillPage.tsx` (inline auf JEDER Aktionskarte):** `★ Mastery {lvl}` + Fortschrittsbalken + `+X % ×2`-Badge
  + Tooltip (`skill.masteryTip`, Doppel-% & Tempo-%). Mastery ist genau dort, wo man skillt.
- **`MasteryPage.tsx` (eigene Seite):** Gesamt-Ring, pro-Skill-Pool-Bar mit Checkpoint-Markern + Perk-Chips,
  aufklappbare Aktions-Zeilen mit Level/Bar/Perks, Tabs. Sauber hinter `MainLayout` gemountet (nutzt
  `useGameState()` → würde vor Spielstart werfen; ist korrekt nur im Playing-Layout erreichbar, `App.tsx:302`).
- **`StatsPage.tsx`:** Gesamt-Mastery-Aggregat + „Maxed Actions"-Completion-Zeile. Plus Onboarding-Guide-Eintrag.

## 6) Findings

**[P3][ux][confirmed] Pool-Hinweistext nennt falschen 1. Checkpoint (10 % statt 5 %).**
`translations.ts:93` (EN) / `:985` (DE): „Checkpoints at **10**/25/50/95%". Echt ist `MASTERY_POOL_CHECKPOINTS
= [0.05, …]` → die `MasteryPage`-Pool-Bar rendert den ersten Marker bei **5 %** und die Engine schaltet den
+3 %-Doppel-Bonus bei 5 % frei. Text vs. Marker/Engine widersprechen sich; der Text **unterverkauft**, wie
früh der erste Payoff kommt. Stale-Kommentar dazu in `tick.ts:82–84` („Pool < 10 %"). — **Owner: UI-Dev**
(beide Translation-Strings), Kommentar-Owner: Logic-Dev.

**[P3][ux][confirmed] Aktionskarten-Badge unterschlägt den Pool-Doppel-Anteil.**
`SkillPage.tsx:288/505`: das inline `+X % ×2`-Badge zeigt nur `masteryBonusChance` (Aktions-Ebene), nicht die
aktiven **Pool**-Doppel-Checkpoints (+3…8 %), die die Engine sehr wohl anwendet (`tick.ts:138`). Die
Rate-Kacheln stimmen (nutzen `effDur` inkl. Pool-Speed), aber die tatsächliche Doppel-Chance ist höher als das
Badge/Tooltip behauptet. Transparenz-Lücke, kein Balance-Bug. — **Owner: UI-Dev.**

**[P3][feel][suspected/by-design] Kampf bekommt 0 Mastery.**
Die 9 Kampf-Skills haben keine `actions` → `completeAction` läuft nie → null Mastery-XP. Das größte
Meta-Progressions-System des Spiels gibt einem reinen Kampf-Spieler **nichts**. Die `MasteryPage` hat dafür
tote i18n-Keys (`mastery.tab.combat`) und einen per `hasCombatActions` ausgeblendeten Combat-Tab (kein Crash,
nur toter Pfad). Entspricht Melvor-Konvention, ist aber ein bewusst zu bestätigender Design-Punkt: Kampf-Mains
haben kein Mastery-Äquivalent. — **Owner: Chef/Design-Entscheidung** (kein Code-Bug).

**Housekeeping (nicht Mastery, nur Beobachtung):** neun `*-sweep.test.ts` von Parallel-Agenten liegen noch in
`packages/engine/src/` (u. a. `fletching-sweep.test.ts` ~166 s Laufzeit) und blähen die Suite auf — sollten von
den jeweiligen Agenten wieder gelöscht werden. Nicht meins zum Entfernen (evtl. gerade in Benutzung).

## 7) Verbesserungs-Vorschläge (konkret)

1. **Text-Fix (P3):** `mastery.poolHint` EN+DE „10/25/50/95%" → **„5/25/50/95%"**; Stale-Kommentar
   `tick.ts:82` „Pool < 10 %" → „Pool < 5 %". Null Balance-Risiko, macht den früh-erreichbaren ersten
   Checkpoint ehrlich sichtbar (was Mastery gerade im Frühgame „lebendig" wirken lässt).
2. **Badge inkl. Pool (P3):** Aktions-Badge/Tooltip die **effektive** Doppel-Chance zeigen lassen
   (`masteryBonusChance + masteryPoolBonus(...).double`) — analog zur Tempo-Kachel, die den Pool bereits via
   `effDur` einrechnet. Dann deckt sich das angezeigte „×2 %" mit dem echten Ertrag.
3. **Optional Combat-Mastery-Entscheidung (P3/feel):** Entweder bewusst dokumentieren „Mastery ist
   Skilling-only" (und die toten `mastery.tab.combat`-Keys + Combat-Tab-Zweig entfernen), ODER einen kleinen
   Kampf-Mastery-Track (z. B. pro Monster/pro Waffenstil, +Kill-XP/+Drop) andenken, damit Kampf-Mains am
   Langzeit-Meta teilhaben. Soll-Wert für einen minimalen Anfang: Pool-analog +3 % Loot-Doppel bei 5 %.

---

### Gate-Status (headless)
- `mastery.test.ts` + `buffs.test.ts` + `action-duration.test.ts`: **28/28 passed** (Aktions-Boni,
  Pool-Checkpoints, Determinismus, Preservation, Speed alle grün).
- Kein Prod-Code geändert; Temp-Analyse-Test gelöscht. Empfehlung: **ship** (Mastery), mit den zwei
  P3-Text/Badge-Politur-Fixes bei Gelegenheit.
