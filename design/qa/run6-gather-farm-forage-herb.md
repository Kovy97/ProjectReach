# QA Run 6 — Gathering: Farming-Plots + Foraging + Herblore

> Playtest-Fokus: schließt der **neue „Alle Plots bepflanzen"-Button** die letzte Loop-Friktion aus Run 5
> ([P2], seit Run 3 offen)? Dazu der Run-5-#3-Fix **Starter-Saatgut** (graywort ×3). Bleibt die in Run 4/5
> gefixte **Crop-Verarbeitungs-Ökonomie** gold-positiv? Hält/übertrifft es die 9,5?
> Methode: READ-ONLY Code-/Daten-Audit gegen `apps/client/src/renderer/pages/FarmPage.tsx`,
> `packages/engine/src/farming.ts`, `state.ts`, `packages/content/src/index.ts`,
> `packages/shared/src/index.ts`, `apps/client/.../i18n/translations.ts`,
> `apps/client/.../game/GameContext.tsx`.
> Validierung: eigene Temp-Harness (5 Tests, bulk-replant + Ökonomie, danach entfernt) + offizielle
> `vitest run farming buffs` = **22 grün** (13 + 9). Stand 2026-06-28.

## Fun-Score: **9,75 / 10**  (Δ vs Run 5: **9,5 → 9,75**, +0,25)

Die **einzige nennenswerte Restfriktion** des Farm-Loops aus Run 5 — kein Bulk-Replant — ist **gebaut und
funktional verifiziert**. Damit ist der „pflanzen → ernten → verarbeiten → konsumieren"-Loop nun auch im
**Wieder-Bestücken nach Seed-Out / Plot-Unlock** komfortabel, nicht nur im Dauerbetrieb (Auto-Replant).
Zusätzlich beseitigt das Starter-Saatgut (graywort ×3) den leeren ersten Farm-Besuch — und zwar mit einer
sauberen Synergie: **Level 1 = 3 Plots, Starter-Kit = 3 Saaten → ein Klick auf „Alle bepflanzen" füllt das
komplette Startbeet**. Kein P0/P1, keine Regression. Die letzten 0,25 fehlen, weil die zwei Run-5-[P3]-
Politurpunkte (Verarbeitungs-Margen nur break-even, gallows_preserve-Heilparität) **unverändert offen** sind
und der neue Button noch ohne Erfolgs-Feedback auskommt — alles Feinschliff, kein Designloch.

---

## Verifikation der Run-6-Änderungen

### Run-5 [P2] — „Alle Plots bepflanzen"-Button: GEBAUT & VERIFIZIERT ✅
- **UI:** `FarmPage.tsx:425-431` neuer CTA „Alle bepflanzen" in der Plot-Statusleiste → öffnet den
  `CropPicker` mit `plotIndex={null}` (`farm.plantAll` / Titel `farm.plantAllTitle`, **EN+DE vorhanden**,
  translations.ts 771-772 / 1541-1542). Onboarding-Light-Hinweis `farm.hint.plots` direkt darunter.
- **Logik:** `handlePick` (Z. 272-283) loopt bei `plotIndex===null` über alle freigeschalteten Plots und
  ruft je `plantCrop(state, content, i, cropId)`. `plantCrop` (farming.ts:182) ist sauber **idempotent/
  guarded**: Noop bei belegtem Slot, wartender Ernte (`readyYield>0`), zu niedrigem Level oder fehlender
  Saat — zieht die Saat erst **nach** allen Checks. Kein „Gratis-Pflanzen", kein Doppelverbrauch.
- **Harness-Messung (5/5 grün, danach entfernt):**
  - Starter: `seeds=3`, `plotsL1=3`.
  - Bulk voll: 3 leere Plots → **planted=3, Saat 3→0** (exakter Verbrauch).
  - Saatmangel (2 Saaten, 3 Plots): **planted=2, 1 Plot bleibt leer** (graceful, kein Crash/Negativbestand).
  - Re-Klick mit 1 belegtem Plot: **planted=2** (belegte Plots übersprungen).
- **Verdict:** Die seit Run 3 offene Dauerbaustelle ist erledigt. Re-Seeding nach Seed-Out und nach
  Plot-Unlock ist jetzt **ein Klick** statt Einzel-Pflanzen pro Beet.

### Run-5 #3 — Starter-Saatgut: GELÖST ✅
- `state.ts:104-108`: `creation.starterKit` → `addItem(..., "graywort_seed", 3)`. Flag wird von der echten
  Charaktererstellung gesetzt (`GameContext.tsx:111 createGame({...input, starterKit:true})`) → erreicht
  **reale neue Spieler** (Sim/Tests bleiben bewusst auf leerer Baseline → Determinismus intakt).
- graywort: `levelRequired 1`, growMs 10 min, Ertrag 6-9, XP 18 — passt exakt aufs L1-Plotbudget (3).
  Doppelte Senke (`brew_minor_healing` / `brew_greater_healing`) + Doppelquelle (Shop 3g / Forage 0.6 /
  Seed-Drop 0.18) aus Run 5 unverändert.

### Crop-Verarbeitungs-Ökonomie — weiter gold-positiv (8/8, identisch zu Run 5) ✅
Voll-Audit (Input-Gold = Σ Mat-`value`, Output = Consumable-`value`); Preise unverändert:

| Rezept | Input-Gold | Output | Δ Gold |
|---|---|---|---|
| cook_ashroot_broth      | 14  | 16  | **+2**   |
| cook_grimwheat_porridge | 18  | 20  | **+2**   |
| cook_gallows_preserve   | 142 | 150 | **+8**   |
| brew_nightshade_extract | 55  | 80  | **+25**  |
| brew_mandrake_tincture  | 182 | 200 | **+18**  |
| brew_emberroot_tonic    | 173 | 185 | **+12**  |
| brew_corpse_lily_salve  | 305 | 320 | **+15**  |
| brew_godbloom_infusion  | 782 | 900 | **+118** |

Wurzelpreise intakt (gallows_apple 70 · corpse_lily_bulb 150 · mandrake_root 90). **Keine Regression.**
Senken 29/29, Seed-Versorgung shop-kaufbar + Forage — kein Brachliegen möglich.

---

## Findings (Run 6)

### [P3] Bulk-Replant ohne Erfolgs-Feedback (NEU, kleiner Politurpunkt)
Nach „Alle bepflanzen" schließt das Modal kommentarlos; es gibt **keinen Toast** („3 Beete bepflanzt") und
der Picker zeigt vorab **nur den Gesamt-Saatbestand**, nicht „X leere Beete". Funktional korrekt, aber der
Spieler bekommt kein Quittungssignal, wie viel passiert ist. **Fix:** Toast mit Anzahl + optional
„X leere Beete"-Zähler im Plant-All-Titel.

### [P3] Bulk-Replant pflanzt dieselbe Crop in alle Beete (kein Per-Plot-Memory)
Deckt den Haupt-Use-Case (eine Crop nach Seed-Out neu setzen) perfekt ab. Wer **gemischte** Beete hatte und
nur Lücken „mit dem, was vorher drinstand" füllen will, muss weiter pro Beet pflanzen. Bewusst akzeptabel
für eine Idle-Farm; optionales „Letzte Saat je Plot wiederherstellen" wäre die Kür. Niedrige Priorität.

### [P3] Verarbeitungs-Margen der Low-/Mid-Crops nur break-even (+2 bis +18g) — UNVERÄNDERT seit Run 5
Außer godbloom (+118) liefert Verarbeiten kaum Goldgewinn; Anreiz ist fast rein die Consumable-Nutzung
(Melvor-typisch, legitim). **Optional für 10/10:** ein paar Rezepte (gallows_preserve, mandrake_tincture)
um +10-20 % Output zu einer kleinen Gold-Engine machen.

### [P3] gallows_preserve heal 140 < bester L50-Fisch (abyssal_crawler 215) — UNVERÄNDERT seit Run 5
Auf L50 ist der Top-Fisch heilstärker als die Galgenapfel-Konfitüre. Nicht blockierend (Konfitüre
gold-positiv + farmbar). Heil-Parität bei ~170-190 wäre sauberer.

### [P3] Catalogue-Senkenzeile weiter konditional (`FarmPage.tsx:233`, `sinks.length>0`) — folgenlos
Da keine Crop senkenlos ist, greift der Discoverability-Mangel faktisch nicht. Unverändert seit Run 3,
niedrigste Priorität.

*(Notiz, out-of-focus: in `packages/engine/src/` liegen mehrere fremde Temp-Harness-Dateien anderer
paralleler Run-6-Sweeps — `_run6_early_mine.test.ts`, `_run6harness.test.ts`, `run6-idle.tmp.test.ts`,
`zzrun6harness.test.ts`, `zzz_run6_harness.test.ts`. Nicht aus diesem Sweep; sollten von den jeweiligen
Agenten nach ihrem Run entfernt werden.)*

---

## Δ vs Run 5 — Zusammenfassung
- **Fun-Score 9,5 → 9,75 (+0,25).**
- Run-5 **[P2]** *kein „Alle Plots bepflanzen"-Button* → **GELÖST & verifiziert** (füllt alle leeren Beete,
  exakter Saatverbrauch, robust bei Saatmangel, überspringt belegte Beete; EN+DE-Strings vorhanden).
- Run-5 #3 *Starter-Saatgut* → **GELÖST** (3× graywort via starterKit; L1=3 Plots = 3 Saaten, 1-Klick-Start).
- Run-5 [P3] *Margen nur break-even* → **unverändert offen.**
- Run-5 [P3] *gallows_preserve heal 140 < L50-Fisch* → **unverändert offen.**
- Run-5 [P3] *Senkenzeile konditional* → unverändert, folgenlos.
- **NEU [P3]:** Bulk-Replant ohne Erfolgs-Feedback/Empty-Count.
- **NEU [P3]:** Bulk-Replant single-crop (kein Per-Plot-Memory).
- Kein P0/P1. Senken 29/29 & Crop-Ökonomie 8/8 gold-positiv ohne Regression (farming 13 + buffs 9 = 22 grün).

## Was fehlt für 10/10?
1. **Verarbeiten zur echten Gold-Engine machen** (P3) — Low-/Mid-Margen über break-even (Output +10-20 %),
   damit Verarbeiten nicht nur „für Heil-Items", sondern auch als Einkommensquelle lohnt.
2. **Heil-Parität feinjustieren** (P3) — gallows_preserve ~170-190 heal, damit Farm-Food an seinem
   Level-Gate nicht klar hinter Fisch zurückfällt.
3. **Bulk-Replant-Politur** (P3) — Erfolgs-Toast („X Beete bepflanzt") + „X leere Beete"-Zähler im Picker;
   optional „letzte Saat je Plot wiederherstellen" für gemischte Beete.

## Verdict
Run 6 schließt die **letzte echte Loop-Friktion** des Farm-Moduls: der Bulk-Replant-Button ist gebaut,
zweisprachig und sauber geguarded (idempotent, exakter Saatverbrauch, graceful bei Mangel), und das
Starter-Saatgut greift mit hübscher 3-Plots-=-3-Saaten-Synergie. Crop-Ökonomie bleibt 8/8 gold-positiv,
keine Regression. Was zwischen **9,75 und 10** steht, ist reiner Feinschliff (belohnendere Margen,
Heil-Parität, Replant-Feedback) — kein Strukturproblem. Der Gathering-Loop (Farm/Forage/Herb) ist
strukturell, ökonomisch **und jetzt auch komfortmäßig** geschlossen.
