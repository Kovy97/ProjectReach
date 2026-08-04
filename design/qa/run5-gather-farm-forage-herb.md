# QA Run 5 — Gathering: Farming-Plots + Foraging + Herblore

> Playtest-Fokus: passiver/Idle-Gathering-Loop NACH dem Run-4-Crop-Ökonomie-Fix. Schwerpunkt: ist die
> in Run 4 als **[P2] irrational** markierte Crop-**Verarbeitungs-Ökonomie** jetzt break-even+ (lohnt
> Verarbeiten statt Rohware vendorn?), Korrektur der `gallows_apple`/`corpse_lily`-Preise, graywort +
> Seed-Fallbacks, sowie die Dauerbaustelle Run-3/4-P3 (kein „Alle Plots bepflanzen"-Button).
> Methode: READ-ONLY Code-/Daten-Audit gegen `packages/content/src/index.ts`,
> `packages/engine/src/farming.ts`, `character.ts`, `combat.ts`, `tick.ts`,
> `apps/client/src/renderer/pages/FarmPage.tsx`.
> Validierung: Inline-Grep/Wert-Audit (kein File hinterlassen) + `vitest run farming buffs`
> = **22 grün** (13 + 9). Stand 2026-06-28.

## Fun-Score: **9,5 / 10**  (Δ vs Run 4: **9 → 9,5**, +0,5)

Der einzige nennenswerte Run-4-Mangel — die **netto-negative Verarbeitungs-Ökonomie der High-Value-Crops**
— ist **vollständig behoben**: jedes der 8 Crop-Rezepte ist jetzt **gold-positiv (Δ ≥ +2g)** UND die
Heilwerte sind level-konkurrenzfähig. Der „pflanzen → ernten → verarbeiten → konsumieren"-Loop schließt
nicht mehr nur strukturell (Run 4), sondern auch **ökonomisch rational**: Verarbeiten schlägt Vendorn
durchgehend. Restabzug nur noch wegen **Komfort** (kein Bulk-Replant, seit Run 3 offen) und weil die
Margen bei Low-/Mid-Crops bewusst nur **break-even** statt belohnend sind — beides kein Strukturproblem.

---

## Verifikation des Run-4-Fixes (Zahlen)

### Run-4 [P2] — Verarbeitungs-Ökonomie irrational: GELÖST (8/8 Rezepte Δ ≥ +2g)
Voll-Audit aller 8 Crop-Verarbeitungs-Rezepte. Input-Gold = Σ(Mat-`value`), Output value = Consumable-
`value`. Inputpreise verifiziert: `vial_of_water` 2g · `clear_oil` 3g · `essence_divine` 220g.

| Rezept | Skill/Lvl | Input-Gold | Output value | Heilwert | Δ Gold (Run 4 → Run 5) |
|---|---|---|---|---|---|
| cook_ashroot_broth      | Cook 1  | 2×6+2 = 14   | 16  | 30        | −2  → **+2**   |
| cook_grimwheat_porridge | Cook 3  | 2×8+2 = 18   | 20  | 40        | —   → **+2**   |
| cook_gallows_preserve   | Cook 50 | 2×70+2 = 142 | 150 | 140       | **−472 → +8**  |
| brew_nightshade_extract | Herb 35 | 2×26+3 = 55  | 80  | def+8/90s | +25 → **+25**  |
| brew_mandrake_tincture  | Herb 30 | 2×90+2 = 182 | 200 | 130       | **−42 → +18**  |
| brew_emberroot_tonic    | Herb 65 | 2×85+3 = 173 | 185 | reg+3/120s| **−13 → +12**  |
| brew_corpse_lily_salve  | Herb 70 | 2×150+3+2=305| 320 | 290       | **−505 → +15** |
| brew_godbloom_infusion  | Herb 95 | 2×280+220+2=782| 900| 380       | +118 → **+118**|

**Kernkorrektur — die zwei Run-4-Ausreißer sind an der Wurzel gefixt (Rohware-Preis gesenkt, nicht nur
Output erhöht):**
- `gallows_apple` **280 → 70g**, `gallows_preserve` heal **60 → 140**, value **90 → 150**. Damit kostet die
  Konfitüre 142g Mats für ein 150g-Item → Verarbeiten ist **strikt besser als die Rohware (140g) zu vendorn**.
- `corpse_lily_bulb` **600 → 150g**, `corpse_lily_salve` heal **250 → 290**, value **700 → 320**, rarity `rare`.
  Aus −505g wird +15g; die teuerste Senke des Mid-Game läuft jetzt nicht mehr leer.
- `mandrake_root` **120 → 90g** (Tinktur jetzt +18 statt −42).

**Heil-Konkurrenzfähigkeit (Utility-Check, nicht nur Gold):**
- `gallows_preserve` heal 140 @ L50 — jetzt über `cooked_crypteel` (110), auf Höhe `cooked_wraithscale` (145).
  In Run 4 (60) noch schwächer als mittlere Fische; **behoben**. (Spitzenfisch `cooked_abyssal_crawler` 215
  bleibt stärker — siehe P3.)
- `corpse_lily_salve` heal 290 @ L70 — zwischen `cooked_soulfish` (270) und `potion_potent_heal` (240) /
  `elixir_renewal` (360). Konkurrenzfähig.
- `godbloom_infusion` heal 380 — weiter höchster Heilwert im Spiel.

Fazit: Verarbeiten ist jetzt **utility- UND gold-konkurrenzfähig**. Die in Run 4 (Fix A) geschlossene Senke
wird real bespielt statt umgangen. Run-4-[P2] **vollständig erledigt**.

### Keine Regression bei den Run-3/4-Fundamenten
- **Senken 29/29:** weiterhin keine senkenlose Crop. `graywort` → 2 Senken (`brew_minor_healing` /
  `brew_greater_healing`, je 2× Input, Z. 7402/7415). graywort-Doppelquelle (Shop 3g + Forage 0.6 / Seed 0.18) intakt.
- **Seed-Versorgung:** alle Saaten shop-kaufbar (graywort 3 · ashroot 6 · grimwheat 8 · mandrake 30 ·
  gallows_apple 75 · corpse_lily 180 · nightshade 28 · emberroot 90 · godbloom 320), zusätzlich Forage-Drops.
  Kein dauerhaftes Brachliegen möglich.
- **Plot/Offline/Auto-Replant:** `tickFarmPlots` reift deterministisch gegen `elapsedMs`, verrechnet
  Offline-Zyklen (`floor(elapsed/growMs)`), Rest-Fortschritt verlustfrei, Auto-Replant seed-limitiert,
  Überschuss → `readyYield`. `farming.test.ts` 13/13 grün. Buffs (def/hpRegen) real angewandt
  (`buffs.test.ts` 9/9). Keine „defined but never applied"-Felder.

---

## Findings (Run 5)

### [P2] Kein „Alle leeren Plots bepflanzen"-Button (seit Run 3 offen — hochgestuft P3→P2)
Die einzige verbleibende echte Loop-Friktion. Auto-Replant deckt den Dauerbetrieb, **nicht** das
Wieder-Bestücken nach einem Seed-Out oder nach dem Freischalten neuer Plots — dann muss der Spieler jeden
Plot einzeln pflanzen. Über 3 Runs unverändert; jetzt das gewichtigste Restproblem, daher P2 statt P3.
**Fix:** Ein „Alle bepflanzen (gewählte Saat)"-Button bzw. pro-Plot-Default-Saat in `FarmPage.tsx`.

### [P3] Verarbeitungs-Margen der Low-/Mid-Crops nur break-even (+2 bis +18g)
Außer godbloom (+118) liefert Verarbeiten kaum Goldgewinn — der Anreiz ist fast rein die Consumable-Nutzung
(Melvor-typisch, legitim). Wer kein Heil-Item braucht, hat keinen Gold-Grund zu verarbeiten. **Optional für
10/10:** ein paar Rezepte (z. B. gallows_preserve, mandrake_tincture) zu einer kleinen Gold-Engine machen
(Output value +10–20 %), damit Verarbeiten auch als reine Goldquelle attraktiv ist.

### [P3] gallows_preserve heal 140 unter dem besten L50-Fisch (abyssal_crawler 215)
Auf L50 ist der Top-Fisch heilstärker als die Galgenapfel-Konfitüre. Nicht blockierend (Konfitüre ist
gold-positiv + farmbar statt fischbar), aber Heil-Parität wäre bei ~170–190 sauberer.

### [P3] Catalogue-Senkenzeile weiter konditional (`FarmPage.tsx:233`, `sinks.length > 0`) — folgenlos
Da keine Crop senkenlos ist, greift der Discoverability-Mangel faktisch nicht. Defensiv: Zeile immer rendern.
Niedrigste Priorität, unverändert seit Run 3.

*(Out-of-focus, nur notiert: Mining-Erz-Ladder L55→L70 weiterhin lückenhaft — anderer Sweep.)*

---

## Δ vs Run 4 — Zusammenfassung
- **Fun-Score 9 → 9,5 (+0,5).**
- Run-4 **[P2]** *Verarbeitungs-Ökonomie irrational* → **GELÖST**: 8/8 Rezepte gold-positiv (Δ ≥ +2g),
  Heilwerte level-konkurrenzfähig; Wurzelfix über gesenkte Rohware-Preise (gallows_apple 280→70,
  corpse_lily_bulb 600→150) statt nur Output-Inflation.
- Run-4 [P3] *kein „Alle bepflanzen"* → **weiter offen, hochgestuft auf P2** (jetzt Haupt-Friktion).
- Run-4 [P3] *Senkenzeile konditional* → unverändert, weiter folgenlos.
- **NEU [P3]:** Margen nur break-even (kein Gold-Anreiz neben der Consumable-Nutzung).
- **NEU [P3]:** gallows_preserve heal 140 < bester L50-Fisch (215).
- Kein P0/P1. Senken 29/29 und Seed-Versorgung ohne Regression.

## Was fehlt für 9,5? → **erreicht.** Was fehlt für 10/10:
1. **„Alle Plots bepflanzen"-Button** (P2) — die einzige nennenswerte UX-Friktion im Farm-Loop, beseitigt
   das mühsame Einzel-Re-Seeding nach Seed-Out / Plot-Unlock.
2. **Verarbeiten zur echten Gold-Engine machen** (P3) — Margen über break-even heben, damit Verarbeiten
   nicht nur „für Heil-Items", sondern auch als Einkommensquelle lohnt.
3. **Heil-Parität feinjustieren** (P3) — gallows_preserve ~170–190 heal, damit Farm-Food bei seinem
   Level-Gate nicht klar hinter Fisch zurückfällt.

## Verdict
Der Run-4-Fix sitzt sauber und an der richtigen Stelle: Rohware-Preise korrigiert statt Output aufgebläht,
alle 8 Crop-Rezepte gold-positiv, Heilwerte konkurrenzfähig — der Gathering-Loop ist jetzt **strukturell
UND ökonomisch geschlossen**. Kein P0/P1. Was zwischen 9,5 und 10 steht, ist reiner Komfort/Feinschliff
(Bulk-Replant + optional belohnendere Margen), kein Designloch.
