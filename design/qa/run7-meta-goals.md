# QA Run 7 — Meta-Goals & Long-Term Motivation (nach R5-Capstone-/Set-/Ember-Fixes)

**Playtester:** read-only Daten-Audit + temporäres Sim-Harness (Content live gegen die echte Engine-Logik transpiliert & kreuzgeprüft; Harness `packages/engine/src/_run7metascan.test.ts` nach dem Lauf wieder entfernt — `packages/**` unverändert)
**Datum:** 2026-06-28
**Fokus (Chef-Auftrag):** Wirken die R5-Meta-Fixes? Konkret: (a) `ach_total_level_2079` „Vollender" als echter Schlussstein da + 2000 umbenannt? (b) Schließen die 3 neuen `sets_completed`-Achievements die Set-Completion-Lücke (0/29 → hakbar)? (c) 0 tote Referenzen über den gewachsenen Katalog? (d) ember_robe-XP gefixt (30/36/42)?
**Methode:** Direkt-Verifikation im Code (`packages/content/src/index.ts`, `packages/engine/src/achievements.ts`, `character.ts`, `packages/shared/src/index.ts`) + Harness-Cross-Check (alle Set-Teile↔Items, alle Achievement-Targets↔Entitäten, **Solver für „max. gleichzeitig aktive Sets"**).

> **Hinweis Vergleichsbasis:** Eine `run6-meta-goals.md` existiert nicht — Run 6 lief als Holistik-Linse (`run6-progression-overall.md`, 8,5). Direkter Meta-Goals-Vorgänger ist **`run5-meta-goals.md` (9,0)**. Chef-Framing „war 9,0" = diese Linie. Δ-Tabelle unten gegen run5 + run6-Holistik-Befunde.

## Fun-Score: **9,0 / 10**

Netto **flach** zu run5 (9,0) — aber aus einem bemerkenswerten Grund: Der **größte run5-Blocker ist sauber weg**, gleichzeitig ist an exakt der Headline-Stelle ein **neuer, gleich schwerer Defekt** entstanden. Beides hebt sich auf.

**Was glänzt (verifiziert gelandet):**
- **Total-Level-Schlussstein komplett.** `ach_total_level_2079` „True Completionist / Vollender" (legendary, 🏆, Bedingung `total_level ≥ 2079` = 21×99) existiert; das alte 2000er ist zu „Nigh Complete / Beinahe Vollständig" **umbenannt** (nicht doppelt). Die Kette ist jetzt **perfekt gestaffelt: 1500 → 1750 → 2000 → 2079** — der run5-P2-Hauptgap („kein Ziel im letzten Skilling-Drittel") ist **vollständig** geschlossen, inkl. des in run5/run6 gewünschten Halbschritts (1750).
- **0 tote Referenzen** über den **gewachsenen** Katalog (Harness-Cross-Check): **827 Items · 84 Monster · 21 Skills · 29 Sets · 21 Pets · 538 Achievements · 6 Dungeons**. Kein Set-Teil, kein `monster_kills`/`skill_level`/`dungeons_cleared`/`items_crafted`-Target zeigt ins Leere. **0 Set-Teile ohne gültigen Slot.**
- **ember_robe-XP gefixt** (`craft_ember_robe_hood/legs/body`): **30 / 36 / 42** XP, Zutaten von `aether_rune` auf tier-konformes `ember_essence + fire_rune + scaled_leather` (L30–32) umgestellt. run5/run6-P3 erledigt.
- **`ach_pets_5` „Tierbegleiter"** (uncommon) ergänzt → Pet-Reise jetzt **5/10/21** statt 10/21. run5-P3 erledigt.
- **`sets_completed`-Typ ist real engine-verdrahtet** — in `shared` (`AchievementConditionType`) deklariert **und** in `achievements.ts` ausgewertet (`activeSets(state, content).length`, mit defensivem `content`-Durchreichen). **Kein Daten-Dummy.**

**Was die 9,5 verhindert (der eine Haken):** Die `sets_completed`-Achievements sind zwar verdrahtet, aber **falsch semantisiert** — 2 von 3 sind **mathematisch unerreichbar** (Details P1). Die Set-Completion-Lücke ist damit **nur zu ⅓** geschlossen.

---

## Daten-Snapshot (echter Katalog, Harness-gezählt)

- **538 Achievements** (run5: 531 → **+7**: +3 `sets_completed`, +1 `ach_pets_5`, +1 `ach_total_level_2079`, +1 `ach_total_level_1750`, +1 weiteres additiv). Kein Achievement-Schwund.
- Bedingungstypen (14): total_level · skill_level · monster_kills · total_kills · items_gathered · items_crafted · gold_reached · gold_spent · quests_completed · daily_streak · items_discovered · dungeons_cleared · pets_owned · **sets_completed (NEU, wirksam-aber-fehljustiert)**
- total_level-Kette: **25 · 100 · 250 · 500 · 1000 · 1500 · 1750 · 2000 · 2079** — lückenarm, mit echtem Maximum.
- pets_owned: **5 · 10 · 21** (`ach_pets_all`=21 deckt Pet-Katalog exakt).
- sets_completed: **1 · 5 · 10** (von 29 Sets).
- **Max. gleichzeitig aktive Sets (Solver, alle 12 Slots, alle 29 Sets): 3** — Bestkombination `frost_robe + ember_robe + godgem_jewel`.

---

## Findings

### [P0] — keine
Kein Blocker, kein Crash, keine Save-Korruption, **0 tote Referenzen**. Der gesamte gewachsene Katalog ist referenz-sauber.

### [P1] `ach_sets_completed_5` und `_10` sind UNERREICHBAR — Set-Completion nur zu ⅓ geschlossen
**Befund (Solver-bewiesen):** `sets_completed` wird in `achievements.ts:72-76` als **`activeSets(state, content).length`** ausgewertet — also „**wie viele vollständige Sets trägt der Spieler GERADE gleichzeitig**", nicht „wie viele Sets hat er je vervollständigt". `activeSets` (`character.ts:269`) zählt Sets mit `≥ minPieces` **aktuell ausgerüsteter** Teile. Es gibt nur **12 Equip-Slots**, und **fast alle 29 Sets konkurrieren um dieselben 5 Slots** (helmet/body/legs/gloves/boots; Metall-Sets zusätzlich offhand). Einzige Ausnahme: `godgem_jewel_set` (ring+amulet). Ergebnis des erschöpfenden Solvers über alle Sets/Slots:

> **Maximal 3 Sets können je gleichzeitig aktiv sein** (z. B. `frost_robe` [helmet+body] + `ember_robe` [legs+gloves] + `godgem_jewel` [ring+amulet]).

Damit:
- `ach_sets_completed_1` (count 1) → **erreichbar** ✓
- `ach_sets_completed_5` (count 5) → **unerreichbar** (max 3) ✗
- `ach_sets_completed_10` (count 10) → **unerreichbar** (max 3) ✗

Das ist **schlimmer als eine fehlende Achievement**: Ein Completionist sieht in der UI dauerhaft „Set-Vollender 3/10", das sich **nie** bewegen kann → ein **permanenter 100 %-Completion-Blocker** und ein sichtbar gebrochenes Versprechen. Die Achievement-Namen („**Complete** 5/10 full equipment sets" / „Vervollständige 5/10 Sets") meinen klar **kumulatives Sammeln**, nicht „gleichzeitig tragen" — der Engine-Kommentar gibt sogar offen zu, die „einfachste valide Definition" gewählt zu haben; genau die ist hier falsch. **Headline-R5-Ziel „0/29 → hakbar" ist nur für die 1er-Stufe erfüllt.**

**Fix-Richtung (logic/content, außerhalb Read-only-Scope):** `sets_completed` auf **echte Sammel-Semantik** umstellen — „Anzahl distinkter Sets, von denen der Spieler **alle Teile besitzt** (Equip + Inventar + Bank/Vault)", analog zum Collection-Log/`items_discovered`. Damit reichbar bis 29. **Dann Counts neu staffeln** (z. B. 1/5/10/15/**29**) und die unten genannte Capstone (P2) ergänzen. Alternativ ein persistenter State-Zähler „je vervollständigte Sets". (Heutige `activeSets`-Logik bleibt für Set-**Boni** korrekt — nur die Achievement-Bedingung braucht die andere Quelle.)

### [P2] Kein Set-Vollsammlungs-Capstone (29/29) — Asymmetrie zu Pets/Bestiarium
Selbst **nach** dem P1-Fix endet die Set-Leiter bei 10 von **29** Sets. Pets haben `ach_pets_all` (21/21, legendary), das Bestiarium hat die volle 84/84-Kette — Sets aber keinen „alle 29"-Schlussstein. Für eine kohärente Completionist-Schicht fehlt das Pendant.
**Fix:** `ach_sets_all` (29, legendary) als Set-Krönung, gekoppelt an den P1-Semantik-Fix.

### [P3] `sets_completed` Doku/Intent-Mismatch + `pets_owned`-Robustheit (run5-Carry)
- Der Engine-Kommentar zu `sets_completed` ist ehrlich, beschreibt aber bewusst eine Definition, die **nicht** zu den Achievement-Namen passt — nach dem P1-Fix Kommentar an die Sammel-Semantik angleichen.
- `pets_owned` zählt weiter **roh** `Object.keys(ownedPets).length` ungefiltert gegen `content.pets` (run5-P3 unverändert). Heute irrelevant (21/21 passt, 0 tote Refs), aber würde ein Pet je aus dem Content entfernt, könnte ein Altsave `ach_pets_all` zu leicht triggern. Zählung gegen `content.pets` schneiden. (logic-dev.)

---

## Δ vs Run 5 (meta-goals) / Run 6 (Holistik)

| Aspekt | Run 5 (meta, 9,0) | Run 6 (Holistik-Notiz) | **Run 7 (meta)** |
|---|---|---|---|
| Fun (Meta-Lens) | 9,0 | (8,5 holistisch) | **9,0** (flach: 1 Gap zu, 1 neu) |
| Total-Level-Schlussstein 2079 | **P2 (Hauptgap)** | als `…_2000` da | **gelöst** — 2079 „Vollender" + 2000 umbenannt + 1750-Halbschritt → 1500/1750/2000/2079 |
| `ach_pets_5` (frühe Pet-Reise) | P3 offen | — | **gelöst** — 5/10/21 |
| ember_robe-Craft-XP | P3 (15/17/18) | P3 | **gelöst** — 30/36/42, Zutaten tier-konform |
| Set-Completion (0/29) | „Kür", `sets_completed` angedacht | — | **Typ verdrahtet, aber ⅔ unerreichbar** (NEU P1) |
| Tote Referenzen | 0 | — | **0** (bei 538 Ach / 29 Sets / 827 Items) |
| Achievements gesamt | 531 | — | **538** (+7) |
| Sets / Items | 28 / 813 | — | 29 / 827 (additiv) |

**Netto:** Der run5-**Haupthebel** (2079-Schlussstein) ist mustergültig umgesetzt (gestaffelte Kette inkl. Halbschritt) — plus zwei saubere P3-Erledigungen (pets_5, ember). Dem steht **ein neuer P1** gegenüber: die `sets_completed`-Achievements sind verdrahtet, aber 2/3 unerreichbar. Score bleibt deshalb bei 9,0 statt der erhofften 9,5 — kein Rückschritt, aber der Gap wurde nur **getauscht**, nicht netto reduziert.

## Was fehlt für 9,5?

**Genau eine Sache: P1 fixen.** `sets_completed` von „gleichzeitig getragen" (`activeSets`) auf „distinkte Sets vollständig **besessen**" umstellen und Counts neu staffeln (1/5/10/15/29). Das macht alle drei Achievements erreichbar, schließt die Set-Completion-Lücke **echt** (0/29 → bis 29 hakbar) und holt den halben Punkt — denn alles andere der Meta-Schicht (Total-Level-Krönung, Pet-Reise, Bestiarium, 0 tote Refs) ist jetzt vollständig.

Für die Politur Richtung **10/10** zusätzlich: `ach_sets_all` (29, legendary) als Set-Capstone (P2) — spiegelt `ach_pets_all`/das Bestiarium und gibt der größten verbleibenden Sammeljagd ihren Schlussstein.

## Verdikt
Die Total-Level-Krönung ist **erledigt und elegant gestaffelt**, ember/pets-Politur sitzt, der Katalog bleibt **referenz-sauber** (538 Ach, 0 tote Refs). Der Score klebt bei **9,0**, weil die Headline-Set-Achievements zwar engine-echt verdrahtet, aber **fehljustiert** sind: maximal 3 Sets sind je gleichzeitig tragbar, also sind die 5er- und 10er-Stufe **dauerhaft unerreichbar**. Ein einzelner Semantik-Fix (Besitz statt Tragen) hebt diese Domäne direkt auf 9,5.
