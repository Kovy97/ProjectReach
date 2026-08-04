# QA Run 4 — Gathering: Farming-Plots + Foraging + Herblore

> Playtest-Fokus: passiver/Idle-Gathering-Loop NACH den Run-3-Fixes. Schwerpunkt: die **8 toten
> Vendor-Crops** aus Run 3 (Verarbeitungs-Senke jetzt vorhanden?), die neue **graywort-Crop**,
> die **Seed-Versorgung** (Forage-only-Lücke) sowie Plot-Mechanik / Auto-Replant / Offline-Reife.
> Methode: READ-ONLY Code-/Daten-Audit gegen `packages/content/src/index.ts`,
> `packages/engine/src/farming.ts`, `character.ts`, `combat.ts`, `tick.ts`,
> `apps/client/src/renderer/pages/FarmPage.tsx`.
> Validierung: temporäres Grep-/Wert-Harness (kein File hinterlassen) + `vitest run farming.test.ts
> buffs.test.ts` = **22 grün** (13 + 9). Stand 2026-06-27.

## Fun-Score: **9 / 10**  (Δ vs Run 3: **8 → 9**, +1)

Die beiden Run-3-Hauptmängel sind **vollständig geschlossen**: keine einzige Crop ist mehr eine
Vendor-Sackgasse, und jede Saat ist im Shop beschaffbar. Der Sammel-/Idle-Loop schließt jetzt
sauber „pflanzen → ernten → verarbeiten → konsumieren". Restabzug nur noch wegen **uneinheitlicher
Verarbeitungs-Ökonomie** bei 2–3 High-Value-Crops (Senke da, aber Vendorn der Rohware bleibt rational).

---

## Verifikation der Run-3-Fixes (Zahlen)

### Fix A — 8 tote Vendor-Crops: GELÖST (0/29 ohne Senke)
Crop→Rezept-Input-Audit über alle **29** yieldItems (Run 3: 28; +graywort). Jeder yieldItem wird von
≥1 Rezept als `input` verbraucht. Die 8 Run-3-Sackgassen sind jetzt durchgehend angebunden:

| Crop (yieldItem) | neue Senke | Skill / Lvl | Crop-Lvl | passt? |
|---|---|---|---|---|
| ashroot | cook_ashroot_broth | Cooking 1 | Farm 1 | ✓ |
| grimwheat | cook_grimwheat_porridge | Cooking 3 | Farm 3 | ✓ |
| gallows_apple | cook_gallows_preserve | Cooking 50 | Farm 50 | ✓ |
| nightshade | brew_nightshade_extract | Herblore 35 | Farm 35 | ✓ |
| mandrake_root | brew_mandrake_tincture | Herblore 30 | Farm 30 | ✓ |
| emberroot | brew_emberroot_tonic | Herblore 65 | Farm 65 | ✓ |
| corpse_lily_bulb | brew_corpse_lily_salve | Herblore 70 | Farm 70 | ✓ |
| godbloom | brew_godbloom_infusion | Herblore 95 | Farm 95 | ✓ |

Alle Rezept-Inputs existieren (`vial_of_water` 2g, `clear_oil` 3g, `essence_divine` 220g), und die
Rezept-Level decken sich exakt mit den Crop-Freischalt-Leveln (keine unerreichbaren Rezepte).
Die Buff-Consumables sind **echt wirksam, nicht nur deklariert**: `nightshade_extract`
(defense +8/60s) und `emberroot_tonic` (hpRegenPerSec +2/120s) werden in `character.ts` (eq.defense /
eq.hpRegenPerSec) bzw. `combat.ts`+`tick.ts` (Regen pro Tick) angewandt — abgesichert durch
Guard-Tests in `buffs.test.ts` (hpRegenPerSec idle + Kampf). Kein „defined but never applied".

### Fix B — godbloom doppelt marginal: GELÖST
`godbloom_seed` jetzt im Shop (320g, teuerste Saat) UND `godbloom_infusion` als Endgame-Senke
(heal 380 — höchster Heilwert im Spiel, über elixir_renewal 360). Endgame-Crop hat Zweck + Bezug.

### Fix C — 6 Forage-only-Saaten ohne Shop-Fallback: GELÖST
Saat-Beschaffung über alle **29** Crops geprüft: **jede Saat ist jetzt im Shop kaufbar.** Die 6
Run-3-Sorgenkinder + godbloom haben einen Shop-Fallback bekommen:
`bloodbeet_seed` 18g · `nightshade_seed` 28g · `ironvine_seed` 55g · `emberroot_seed` 90g ·
`wraithcap_seed` 160g · `godbloom_seed` 320g (zusätzlich weiter als Forage-Drop erhältlich).
Kein dauerhaftes Brachliegen mehr möglich, falls der Spieler nicht foragt.

### Fix D — neue graywort-Crop: sauber integriert
T1 / Farm-Lvl 1 / growMs 600 000 (10 min) / Ertrag 6–9 / xp 18. Saat `graywort_seed` 3g im Shop
**und** Forage-Drop (`graywort_seed` 0.18, `graywort` 0.6 aus Foraging) — robuste Doppelquelle.
Senke = **2** (brew_minor_healing + brew_greater_healing), d.h. der Herblore-Heiltrank-Einstieg
hängt jetzt an einer farmbaren Crop. Gut verdrahtet.

### Plot-Mechanik / Offline / Grau→Farbe: unverändert solide (keine Regression)
`tickFarmPlots` reift weiter deterministisch gegen `state.elapsedMs`, verrechnet offline mehrere
Zyklen arithmetisch (`floor(elapsed/growMs)`), übernimmt Rest-Fortschritt verlustfrei, Auto-Replant
ist seed-limitiert (Inventar+Lager), Überschuss parkt als `readyYield`. `farming.test.ts` 13/13 grün.

---

## Findings (Run 4)

### [P2] Verarbeitungs-Ökonomie der High-Value-Crops ist irrational — Senke existiert, wird aber umgangen
Die Senken sind vorhanden (Fix A erfüllt), aber für die teuren Crops **vernichtet das Verarbeiten
massiv Goldwert**, sodass der rationale Zug „Rohware vendorn" bleibt — die neue Senke läuft dann leer:

| Rezept | Input-Gold | Output value | Heilwert | Δ Gold |
|---|---|---|---|---|
| cook_gallows_preserve | 2×280+2 = **562** | 90 | **60** | **−472** |
| brew_corpse_lily_salve | 2×600+3+2 = **1205** | 700 | 250 | −505 |
| brew_mandrake_tincture | 2×120+2 = 242 | 200 | 100 | −42 |
| brew_emberroot_tonic | 2×85+3 = 173 | 160 | (regen+2) | −13 |
| cook_ashroot_broth | 14 | 12 | 15 | −2 |
| brew_nightshade_extract | 55 | 80 | (def+8) | **+25** |
| brew_godbloom_infusion | 782 | 900 | 380 | **+118** |

`gallows_preserve` ist der klare Ausreißer: heilt mit **60 auf Lvl 50 schwächer als mittlere Fische**
(cooked_crypteel 110, cooked_abyssal_crawler 215) und kostet 562g Mats — niemand wird Galgenäpfel
(280g/Stück) dafür opfern statt sie zu verkaufen. `corpse_lily_salve` heilt zwar konkurrenzfähig
(250 ≈ potion_potent_heal 240), frisst aber ~1200g Rohware. **Fix:** Galgenapfel-Konfitüre auf
heal ~120–140 anheben (oder gallows_apple-Vendorwert senken); corpse_lily_salve heal/value leicht
anziehen. Ziel: Verarbeiten soll mindestens utility-, idealerweise gold-konkurrenzfähig sein, damit
die in Fix A geschlossene Senke real bespielt wird.

### [P3] Komfort: weiterhin keine „Alle leeren Plots bepflanzen"-Funktion (Run-3-P3 offen)
Nach einem Seed-Out alle freigeschalteten Plots einzeln neu zu bestücken bleibt zäh. Auto-Replant
deckt den Normalfall, das Re-Seeding nach Leerlauf nicht. Unverändert seit Run 3.

### [P3] Catalogue-Senkenzeile weiter konditional (jetzt praktisch folgenlos)
`FarmPage.tsx:233` rendert die Senken-Zeile nur bei `sinks.length > 0`. Da nun **keine** Crop mehr
senkenlos ist, greift der Run-3-Discoverability-Mangel faktisch nicht mehr — defensiv könnte man die
Zeile dennoch immer rendern. Niedrigste Priorität.

### [P3 / out-of-focus] Mining-Erz-Ladder L55→L70 (Run-3-P3) unverändert
Liegt außerhalb dieses Farm/Forage/Herb-Sweeps (Mining), nur zur Vollständigkeit notiert: kein
Zwischenerz ergänzt. Kein Gathering-Blocker.

---

## Δ vs Run 3 — Zusammenfassung
- **Fun-Score 8 → 9 (+1).**
- Run-3 [P2] *8 tote Vendor-Crops* → **GELÖST** (0/29 senkenlos; 8 Consumables + 8 Rezepte verifiziert).
- Run-3 [P2] *godbloom doppelt marginal* → **GELÖST** (Seed im Shop 320g + gold-positive Endgame-Senke).
- Run-3 [P2/P3] *6 Forage-only-Saaten* → **GELÖST** (alle 29 Saaten shop-kaufbar).
- Run-3 [P3] *Catalogue blendet fehlende Senke aus* → **gegenstandslos** (keine senkenlosen Crops mehr).
- Run-3 [P3] *kein „Alle bepflanzen"* → **weiter offen**.
- **NEU [P2]:** Verarbeitungs-Ökonomie der High-Value-Crops irrational (gallows_preserve > corpse_lily_salve).
- **NEU:** graywort-Crop (T1) hinzugekommen und sauber an die Heiltrank-Kette angebunden.

## Verdict
Die Run-3-Fixes sitzen: der Gathering-Loop ist jetzt geschlossen — jede Crop fließt in Verarbeitung,
jede Saat ist beschaffbar, graywort verankert den Herblore-Einstieg. Kein P0/P1. Der letzte Schritt
Richtung 10/10 ist **Balancing, kein Strukturproblem**: die teuren Crop-Rezepte (v.a.
Galgenapfel-Konfitüre) so anziehen, dass Verarbeiten lohnt statt zu vendorn.
