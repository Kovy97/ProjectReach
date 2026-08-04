# QA Run 3 — Frühes Spiel (Level 1–25, Neuer-Spieler-Erfahrung)

**Datum:** 2026-06-27 · **Rolle:** Playtester-Analyst (Spieler-Sicht, READ-ONLY — kein Code geändert)
**Scope:** Erste Stunde / L1–25. Onboarding, Skill-/Combat-Flow, Pacing, Fun. Fokus auf die neuen Systeme:
**Start-Köcher (60 Pfeile), Start-Nahrung, Farming-Plots + Wachstums-Effekt.**

**Quellen (im Code/Daten verifiziert):**
- `packages/engine/src/state.ts` (createGame: Starterkit/Köcher/Nahrung 65–107), `equipment.ts` (Köcher `equipAmmo`/`unequipItem` 123–158, `EQUIP_SLOTS` enthält `ammo`), `combat.ts` (Munitions-Stopp `stopIfOutOfAmmo` 689–698 + Aufruf 716; Ammo-Verbrauch 605–618), `farming.ts` (Plot-Tick/Plant/Harvest), `shared/src/index.ts` (`PLOT_UNLOCK` 1472, `plotsUnlocked`, `AUTO_EAT_TIERS` 152).
- `packages/content/src/index.ts` — Starter-Items (rusty_sword 203, cracked_bow 261, crude_arrow 279, cracked_staff 288, cooked_shrimp 91), Monster/Warband (7606–7697), Crops (11188+), Seed-Items (313–530), Shop-Seeds (8686–8743), Foraging (forage_ashfields 5274).
- `apps/client/src/renderer/` — `game/GameContext.tsx` (`starterKit:true` 110–111), `pages/CombatPage.tsx` (Ammo-Display 398–401/617–619, `monsterDiffTier` 887), `pages/CharacterPage.tsx` (Ammo-Statzeile 343–347, Paperdoll-Köcher 495–545), `components/Toasts.tsx` (Ammo-Toast 83–183), `pages/FarmPage.tsx`, `i18n/translations.ts` (Onboarding/Combat/Farm-Strings).

---

## Fun-Score: **7.5 / 10**

Das Frühspiel ist weiterhin ungewöhnlich breit und gut gelenkt, und **alle drei großen run2-Findings sind sauber gefixt** (Warband-XP angeglichen, Gefahren-Indikator auf den Monsterkarten, Start-Nahrung + Auto-Eat-Vorbelegung). Der Köcher gibt dem Fernkampf-Start sofort scharfe Schüsse. **Punktabzug** ausschließlich wegen eines neuen, echten Regressions-Clusters: die UI zeigt die **Köcher-Munition nirgends an** und meldet dem Fernkampf-Neuling auf der Kampfseite fälschlich „Munition: 0 · Keine Munition!", während der Bogen einwandfrei feuert. Das trifft ~1/3 aller neuen Spieler (Fernkampf-Start) in der ersten Minute und lässt den Build „kaputt" wirken — sonst wäre der Score höher.

---

## Top-Stärken

1. **run2-Findings nachweislich behoben:**
   - *Warband-Goblin-XP* an die Kurve angeglichen: goblin_rogue L5 **xp 5**, spearman L6 **6**, archer L7 **7**, crossbower L9 **9**, butcher L10 **10**, felmagician L11 **11**, stormcaller L12 **12**, warlock L14 **13** (vorher ~2× der Kurve). (`index.ts` 7647–7697)
   - *Gefahren-Indikator* da: `monsterDiffTier(monsterLevel, playerLevel)` → easy/close/danger auf den Monsterkarten (`CombatPage.tsx` 887–892).
   - *Start-Nahrung + Auto-Eat*: `starterKit:true` (real gesetzt im Renderer, `GameContext.tsx` 111) gibt 10× `cooked_shrimp` (Heilung 8) UND belegt `character.food` vor → Auto-Eat Stufe 0 (50 %) greift sofort (`state.ts` 95–101).
2. **Start-Köcher funktioniert mechanisch:** Fernkampf-Start legt `equipment.ammo="crude_arrow"` + `ammoCount=60` direkt in den Köcher; Combat feuert ab Tick 1 scharf und verbraucht pro Schuss (`combat.ts` 611–613). Geht der Köcher leer, **stoppt** der Kampf sauber statt leise weiterzulaufen (716).
3. **Farming als ruhiges Nebensystem:** 3 Plots ab Farming L1 frei (`PLOT_UNLOCK`), Offline-Wachstum rein arithmetisch, Auto-Replant per Default an. Crop-Katalog zeigt **Saatquelle** („Samen: Sammeln/Laden") und **Senke-Skill** → gute Discoverability ohne Tutorial.
4. **Wachstums-Effekt ist ein hübsches Detail:** der reifende Crop füllt sich visuell per `clip-path inset(...)` von unten nach oben mit Farbe (`FarmPage.tsx` 530–560), plus Fortschrittsbalken/Restzeit — fühlt sich lebendig an, ohne zu vergolden.
5. **Bewährtes aus run2 hält:** 6-Schritt-Onboarding deckt den Kern-Loop ab, dichte Quest-Linie ab Sekunde 1, alle Skills mit L1-Erstaktion, ~100 HP Startpuffer, drei spielbare Startstile.

---

## Priorisierte Findings

### [P1 Bug] Köcher-Munition wird in der UI nie angezeigt — Kampfseite meldet dem Fernkampf-Starter fälschlich „Munition: 0 · Keine Munition!"
Der neue OSRS-Köcher hält die Pfeile in **`state.ammoCount` (+ `equipment.ammo`)**, NICHT im Inventar (`state.ts` 81–84; combat verbraucht `state.ammoCount`, `combat.ts` 611–613). Die UI liest die Munition aber an **zwei** Stellen aus dem **Inventar**:
- `CombatPage.tsx:401` — `const ammoCount = ammoType ? itemCount(state.inventory, ammoType) : 0;` → für den Starter (60 im Köcher, **0 im Inventar**) = **0** → das Ammo-Display (617–619) zeigt rot **„Munition: 0 · Keine Munition!"**, obwohl der Bogen normal feuert.
- `CharacterPage.tsx:345` — `const n = itemCount(inv, mainWeapon.ammoType);` → die Statzeile „Munition" zeigt **„0 Grobe Pfeile"**.

Der echte Köcherstand `state.ammoCount` wird **nirgends** dargestellt (auch das Paperdoll-Köcherfeld zeigt nur das Pfeil-Icon, keine Menge; ItemTooltip zeigt nur den Munitionstyp). Für einen neuen Fernkampf-Spieler wirkt der Charakter dadurch in der ersten Minute defekt: rote „Keine Munition"-Warnung bei voll funktionierendem Bogen.
**Fix:** Munitionsanzeige aus dem Köcher speisen — `state.character.equipment.ammo === ammoType ? state.ammoCount : 0` (ggf. + Inventarbestand) statt `itemCount(inventory, …)`. Betrifft `CombatPage.tsx:401` und `CharacterPage.tsx:345`. (Revier: ui-dev.)

### [P1 Bug] „Munition leer"-Toast feuert nie, wenn der Köcher tatsächlich leerläuft (gleiche Ursache)
`Toasts.tsx:163` löst den hilfreichen Restock-Toast bei `prev.ammoCount>0 && ammoCount===0 && wasInCombat` aus — aber `ammoCount` wird wieder aus dem **Inventar** berechnet (`Toasts.tsx:83–86`). Beim Starter sind die Pfeile im Köcher, der Inventarbestand ist **dauerhaft 0**, also gibt es nie den Übergang `>0 → 0`. Folge: genau in dem Moment, in dem der Köcher leerläuft und der Kampf **still stoppt** (`stopIfOutOfAmmo`), erscheint der erklärende Toast **nicht**. Der Spieler steht ohne Hinweis vor einem grundlos gestoppten Kampf.
**Fix:** Snapshot-Munition im Toast ebenfalls aus dem Köcher (`state.ammoCount`) ziehen; dann triggert der `toast.ammoEmpty`-Pfad korrekt. (Revier: ui-dev.)

### [P2 UX] Inline-Tooltip widerspricht dem echten Verhalten („schwächer" vs. „Kampf stoppt")
`combat.ammoHint` (translations 414/1126): *„Ohne Munition sind deine Schüsse deutlich schwächer."* Tatsächlich **stoppt** der Kampf bei leerem Köcher komplett — `stopIfOutOfAmmo` läuft VOR jeder Aktion (`combat.ts:716`), der `RANGED_WEAK_FACTOR`-Notschlag (615) ist für Köcher-Bögen **unerreichbar**. Der neuere `toast.ammoEmpty.body` sagt korrekt „Combat stops" → die beiden Texte widersprechen sich.
**Fix:** `combat.ammoHint` auf „…ohne Munition stoppt der Kampf — Pfeile nachlegen." umtexten (EN+DE). (Revier: ui-dev/i18n.)

### [P2 UX] Verwaiste Saat: `graywort_seed` ist der häufigste L1-Sammel-Drop (18 %), aber nicht pflanzbar
`forage_ashfields` (die L1-Foraging-Aktion, ohne `levelRequired` = ab L1) dropt `graywort_seed` mit **18 %** — häufiger als die pflanzbaren `grimwheat_seed` (15 %) und `ashroot_seed` (12 %). Aber: **kein Crop** in `content.crops` nutzt `seedItem:"graywort_seed"`, und die Saat steht **nicht im Shop** (`graywort_seed` existiert nur als Item, Z. 313). Ein Neuling sammelt also am wahrscheinlichsten genau die Saat, die er im Crop-Picker **nirgends** einsetzen kann → Verwirrung beim ersten Farm-Besuch.
**Fix:** Entweder einen `graywort`-Crop (T1, L1/2) ergänzen, der `graywort_seed` verwendet, ODER `graywort_seed` aus der `forage_ashfields`-Loot entfernen (das Kraut `graywort` selbst dropt dort bereits mit 60 %). (Revier: content-dev/balance.)

### [P2 UX] Erster Farm-Besuch ist leer: 3 Plots frei, aber 0 Saat & 0 Gold
`createGame` gibt Starter-Nahrung + (bei Fernkampf) Köcher, aber **keine Saat** und **0 Gold**. Auf der Farm sieht der Neuling 3 freie Plots, doch im Picker ist **jeder** Crop deaktiviert („Keine Saat"). Die erste Saat muss erst per 12-%-Forage-Roll fallen ODER für 6 Gold (`ashroot_seed`) im Shop gekauft werden. Discoverable (Katalog nennt „Samen: Sammeln/Laden"), aber der allererste Farm-Besuch fühlt sich wie eine Sackgasse an.
**Fix (klein, analog zu Start-Nahrung/Köcher):** dem `starterKit` eine Mini-Saat-Stack mitgeben (z. B. 3× `ashroot_seed`), damit das erste Pflanzen sofort möglich ist — gleicher „direkt loslegen"-Effekt wie Köcher/Nahrung. (Revier: logic-dev/content.)

### [P3 Politur] Köcher-Onboarding fehlt
Es gibt einen guten `toast.onboarding.ranged`-Hinweis („Pfeile werden pro Schuss verbraucht — halte Munition bereit!"), aber nichts erklärt das **Köcher-Konzept** (Pfeile müssen in den Köcher-Slot, Inventar-Pfeile feuern nicht). In Kombination mit dem falschen „Munition: 0"-Display (s. o.) kann ein Spieler, der Pfeile im Inventar hat, nicht verstehen, warum sie „nicht zählen". Nach Fix der P1-Bugs weitgehend entschärft; ein kurzer Tooltip am Köcher-Slot wäre dennoch nett.

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice, großer Tutorial-Flow** — laut Memory spätere Meilensteine, nicht bewertet.
- **Balance L1–25:** keine neuen Walls gefunden; die zuletzt committeten Sim-Ergebnisse (0 Auffälligkeiten/0 Walls) plus die jetzt korrigierte Warband-XP-Kurve sind stimmig. Eigener Vollsim nicht neu gelaufen (Zeit/Cache); Aussagen auf Code/Daten gegründet.
- **Köcher-Engine selbst** ist korrekt (Tests `ammo-quiver.test.ts` vorhanden); die Findings betreffen ausschließlich die **UI-Anzeige**, nicht die Mechanik.
