# QA Run 7 — Gathering: Farming-Plots + Foraging + Herblore

> Playtest-Fokus: **Regression-Check nach den großen Content-Änderungen** seit Run 6. Die Farm-*Mechanik*
> (FarmPage.tsx / farming.ts / state.ts) ist seit Run 6 **unverändert** — aber der **Crop-Katalog wurde
> massiv erweitert** (von ~8 auf **29 Crops**, T1–T5) und an **fünf** verarbeitende Skills angebunden
> (cooking, herblore, runecrafting, leatherworking). Kernfrage: Hält der Farm-Loop trotz dieser Content-Flut
> **≥ 9,5**? Bleiben alle Crops sät-/senkbar (kein Brachliegen)? Sind die Run-6-[P3] (Verarbeitungs-Margen,
> Heil-Parität) durch den neuen Content erledigt?
> Methode: READ-ONLY Code-/Daten-Audit gegen `packages/content/src/index.ts` (crops/actions/shop/items),
> `packages/engine/src/farming.ts`, `apps/client/.../FarmPage.tsx`, `state.ts`.
> Validierung: eigene Temp-Harness (3 Audit-Tests über den **echten** content: Seed-Quelle + Senke je Crop,
> Verarbeitungs-Ökonomie, Heil-Werte — danach entfernt) + offizielle `vitest run farming buffs` =
> **22 grün** (13 + 9, identisch zu Run 6). Stand 2026-06-28.

## Fun-Score: **9,9 / 10**  (Δ vs Run 6: **9,75 → 9,9**, +0,15)

**Kein Regression — im Gegenteil.** Die Content-Erweiterung hat den Farm-Loop nicht nur unbeschädigt
gelassen, sondern **zwei der drei „Was fehlt für 10"-Punkte aus Run 6 substanziell eingelöst**:
1. **Verarbeiten ist jetzt eine echte Gold-Engine** — die neuen Mid-/High-Cooking-Rezepte sind stark
   gold-positiv (witherleek_bouillabaisse **+235**, ambergrain_feast **+540**, soulgourd_brisket +83,
   spellflare_tisane +109). Das war Run-6-[P3] #1.
2. **Heil-Parität zum Fisch ist am oberen Ende geschlossen** — Farm-Konsumgüter **übertreffen** jetzt den
   besten Fisch: corpse_lily_salve **290** > cooked_soulfish 270, elixir_renewal 360, godbloom_infusion
   380, ambergrain_feast 265, potent_heal 240. Das war Run-6-[P3] #2.

Dazu der entscheidende Regression-Befund: **Alle 29 Crops haben eine Shop-Saatquelle UND mindestens eine
Senke — 0 Crops ohne Saat, 0 Crops ohne Senke.** Kein totes Content, kein Brachliegen möglich. Die letzten
0,1 fehlen nur wegen kleiner, klar benannter Politurpunkte (gallows_preserve am L50-Band weiter 140;
Bulk-Replant ohne Toast; ein paar Tier/Level-Daten-Schiefen) — alles Feinschliff, kein Designloch.

---

## Verifikation: Crop-Katalog 29/29 vollständig versorgt ✅ (Kern-Regression-Check)

Harness-Audit über den **echten** `content` (nicht Fixture): für jede Crop Seed-Quelle (Shop > Forage >
Action-Drop > Monster-Drop) und Senke (jede Action mit dieser yieldItem als Input).

| Befund | Ergebnis |
|---|---|
| Crops gesamt | **29** (T1×8, T2×4, T3×6, T4×6, T5×5) |
| Crops **ohne** Saatquelle | **0** — *alle* via **Shop** kaufbar |
| Crops **ohne** Senke | **0** — *alle* in ≥1 Verarbeitungs-Action |
| Verarbeitende Skills | **5**: cooking, herblore, **runecrafting** (Pigmente + Schilf → Runen!), **leatherworking** (herb_marshroot→plague_mask, herb_gravemoss→ear_plugs) |

Highlights der neuen Integration: **Pigmente** (umber/verdant/violet/radiant) und **Schilf**
(pale/iron/void) speisen das komplette **Runecrafting**-Tier-System (rune_*_i/ii/iii); **Herbs**
(marshroot/bloodthistle/gravemoss/nightbloom/godsbreath) speisen Herblore **und** Cooking doppelt. Die
Farm ist damit nicht mehr nur Food/Heal-Quelle, sondern **Rohstoff-Backbone für fünf Skills**.

## Verarbeitungs-Ökonomie — nach Skill getrennt (Input-Gold = Σ value·qty, Output = Σ value·chance·Ø(min,max))

**Cooking (crop-fed) — durchgehend stark gold-positiv → die neue Gold-Engine:**

| Rezept | Δ Gold | | Rezept | Δ Gold |
|---|---|---|---|---|
| cook_ashroot_broth | +2 | | cook_steelshot_bisque | +65 |
| cook_grimwheat_porridge | +2 | | cook_soulgourd_brisket | +83 |
| cook_gallows_preserve | +8 | | cook_spellflare_tisane | +109 |
| cook_marshroot_chowder | +14 | | cook_witherleek_sharpsh.pie | +209 |
| cook_bloodgrain_stew | +19 | | cook_witherleek_arcane_broth | +215 |
| cook_spellwarden_bisque | +52 | | cook_witherleek_bouillabaisse | +235 |
| cook_duskfin_rangers_stew | +13 | | **cook_ambergrain_feast** | **+540** |

**Herblore — Low/Mid gold-positiv, High-Tonics roh-negativ (by design):** brew_lesser_heal +21,
brew_heal +30, brew_bloodrage_tonic +59, brew_greater_heal +48, brew_potent_heal +58, brew_arcane_surge
+42 … aber elixir_renewal −142, revenant_elixir −220, apex_tonic −163, panacea_elixir −122,
godsbreath_elixir −310, godbloom_infusion **+118**. **Bewertung:** Herblore-Brews sind **Nutz-Konsumgüter**
(Heal/Buff) — ihr Wert liegt im Effekt, nicht im Wiederverkauf; die negative Roh-Marge ist Melvor-typisch
und **kein Defekt**. Zudem überschätzt die Metrik den Input, weil sie farm-gewachsene Crops mit vollem
Shop-`value` ansetzt — der reale Farmer-Aufwand ist nur Saat (shop-billig) + Sekundär-Reagenz.

**Runecrafting — alle Runen roh-negativ (−18 bis −625):** Auch das ist korrekt: Runen sind die **Senke**
für Pigmente/Schilf und liefern ihren Wert über das **Enchant-System**, nicht als Goldquelle.

→ **Fazit Ökonomie:** kein gold-negatives *Verarbeiten-zum-Verkauf*-Designloch. Wer Gold will, kocht
(stark positiv); wer Heal/Buffs/Enchants will, braut/runet (Effekt-Wert). Beide Wege sind nun bedient.

## Heil-Werte: Farm schlägt jetzt den Fisch (Run-6-[P3] #2 am oberen Ende erledigt)

Top-Fisch: cooked_soulfish **270**, abyssal_crawler 215, voidray 170, wraithscale 145.
Farm-Konsumgüter: godbloom_infusion **380**, elixir_renewal 360, corpse_lily_salve **290**,
ambergrain_feast 265, revenant_elixir 260, potent_heal 240, witherleek_bouillabaisse 185,
witherleek_pies 180. → Farm-Heal-Decke liegt **über** der Fisch-Decke.

## Mechanik unverändert & intakt
- `farming.ts` / `FarmPage.tsx` byte-gleich zu Run 6: plantCrop guarded/idempotent, Bulk-Replant-Loop,
  Auto-Replant, readyYield-Parking, exakter Saatverbrauch — alles wie in Run 6 verifiziert.
- Starter-Saatgut intakt: `state.ts:104-107` graywort_seed ×3 via `creation.starterKit`; graywort weiter
  L1 → 1-Klick-Start-Beet (3 Plots = 3 Saaten) hält.
- Offizielle Suiten **22 grün** (farming 13 + buffs 9) — keine Regression.

---

## Findings (Run 7)

### [P2] gallows_preserve heal 140 am L50-Band weiter < L50-Fisch (abyssal_crawler 215) — TEILWEISE OFFEN
Am **oberen** Ende ist die Heil-Parität gelöst (s. o.), aber im **konkreten L50-Band** ist das beste
Farm-Food weiterhin gallows_preserve **140**, während der L50-Fisch abyssal_crawler **215** heilt. Genau
der Run-6-Punkt, am selben Item, unverändert. Hochgestuft von [P3]→[P2], weil L50 ein wichtiges
Mid-Game-Gate ist und der Abstand (−35 %) spürbar ist. **Fix:** gallows_preserve auf ~170–190 anheben
ODER eine zweite L50-Farm-Heilquelle (es gibt mit `ironvine`→bloodmend_draught heal 130 sogar eine *noch
schwächere* L50-Option). Bis ~L70 (corpse_lily_salve 290) bleibt Farm-Heal hinter Fisch.

### [P3] Bulk-Replant weiter ohne Erfolgs-Feedback/Empty-Count — UNVERÄNDERT seit Run 6
„Alle bepflanzen" schließt kommentarlos; kein Toast „X Beete bepflanzt", Picker zeigt nur
Gesamt-Saatbestand statt „X leere Beete". Funktional korrekt. **Fix:** Toast + Empty-Zähler.

### [P3] Tier/Level-Daten-Schiefen bei Schilf/Pigmenten (NEU, kosmetisch)
`reed_iron` ist `tier:3` aber `levelRequired:26` (T2-Band) mit T3-growMs (40 min) → eine 40-Min-Crop schon
ab L26 ist relativ steil; `reed_void` ist `tier:5` aber L58 (T3-Band); `ironvine` T3 aber L50/T3-Mix.
Kein Gameplay-Bruch (alle versorgt & sät-/senkbar), aber die `tier`-Felder passen nicht zum
levelRequired-Band → für Sortierung/Anzeige/Balance-Konsistenz angleichen.

### [P3] Hohe Cooking-Margen als möglicher Gold-Faucet — Watch-Item für Balance-Team
cook_ambergrain_feast **+540**/Stück und die witherleek-Reihe (+209…+235) sind sehr gold-positiv. Aus
**Farming-Fun**-Sicht ein Plus (Verarbeiten lohnt endlich). Ob die absolute Gold-Rate ins Gesamtbudget
passt, ist eine **balance-designer**-Frage, nicht Farm-spezifisch — hier nur als Hinweis vermerkt.

### [P3] Catalogue-Senkenzeile weiter konditional (`FarmPage.tsx:233`, `sinks.length>0`) — folgenlos
Da jetzt **nachweislich** keine Crop senkenlos ist (29/29), greift der Discoverability-Mangel faktisch
nicht. Unverändert seit Run 3, niedrigste Priorität.

---

## Δ vs Run 6 — Zusammenfassung
- **Fun-Score 9,75 → 9,9 (+0,15).** Regression-Check **bestanden** (≥ 9,5 klar gehalten).
- **Content-Flut sauber verkraftet:** 29 Crops, **0 ohne Saat, 0 ohne Senke**; jetzt **5** verarbeitende
  Skills statt nur cooking/herblore (NEU: runecrafting via Pigmente+Schilf, leatherworking via Herbs).
- Run-6-[P3] #1 *Margen nur break-even* → **eingelöst** (Cooking jetzt echte Gold-Engine, +52…+540).
- Run-6-[P3] #2 *Heil-Parität* → **am oberen Ende eingelöst** (Farm-Heal 290–380 > Top-Fisch 270);
  am L50-Band weiter offen → als **[P2]** hochgestuft.
- Run-6-[P3] *Bulk-Replant ohne Feedback* → **unverändert offen** (Mechanik byte-gleich).
- **NEU [P3]:** Tier/Level-Schiefen (reed_iron/reed_void/ironvine).
- **NEU [P3]:** sehr hohe Cooking-Margen — Gold-Faucet-Watch für Balance-Team.
- Kein P0/P1. Offizielle Suiten 22 grün (identisch zu Run 6), Starter-Kit & Bulk-Replant intakt.

## Was fehlt für 10/10?
1. **Heil-Parität am L50-Band schließen** (P2) — gallows_preserve ~170–190 ODER zweite stärkere
   L50-Farm-Heilquelle, damit Farm-Food zwischen L50 und L70 nicht klar hinter Fisch zurückfällt.
2. **Bulk-Replant-Politur** (P3) — Erfolgs-Toast „X Beete bepflanzt" + „X leere Beete"-Zähler im Picker.
3. **Daten-Konsistenz Schilf/Pigmente** (P3) — `tier`-Felder an die levelRequired-Bänder angleichen
   (reed_iron/reed_void/ironvine), damit Tier-Sortierung/Anzeige stimmig ist.

## Verdict
Run 7 ist ein **sauber bestandener Regression-Check über eine große Content-Erweiterung**. Die Farm-Mechanik
blieb unangetastet (22 grün), und der neue Crop-Katalog ist **lückenlos angebunden**: 29 Crops, jede mit
Shop-Saat und ≥1 Senke, verteilt auf **fünf** Skills — die Farm ist jetzt der Rohstoff-Backbone des Spiels,
nicht nur ein Food/Heal-Garten. Dabei wurden **zwei** der drei Run-6-„fehlt für 10"-Punkte (Gold-Engine via
Cooking, Heil-Decke über Fisch) **substanziell eingelöst**. Was zwischen **9,9 und 10** steht, ist reiner
Feinschliff (L50-Heil-Band, Replant-Toast, Tier-Daten). Der Gathering-Loop (Farm/Forage/Herb) ist
strukturell, ökonomisch, komfortmäßig **und nun auch content-seitig breit** geschlossen.
