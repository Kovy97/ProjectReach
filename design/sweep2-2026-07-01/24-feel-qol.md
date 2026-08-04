# Sweep 2 — Feel / QoL / Pacing (Runde 2, Kontrolleur)

Fokus: Fortschritts-Taktung, Feedback-Momente (Level/Drop/Achievement/**Skilling-Rare neu**),
QoL-Lücken (Sortierung/Filter/Mengen), Reibung/Verwirrung. Methodik: headless Real-Play über
`SimPlayer` (deterministisch) + statische Toast-/Content-Analyse. Alle Zahlen aus echten Sim-Läufen,
temporärer Probe-Test danach gelöscht (Repo unverändert).

---

## VERIFIKATION der „gerade gefixt"-Punkte (mein Fokus)

| Fix | Status | Beleg |
| --- | --- | --- |
| Skilling-Rare-Toast (Nest/Roh-Gems bekommen Feedback) | ✅ **wirkt** für echte Bonus-Funde | Vogelnest `cut_normal_tree` 30 Sim-Min: **7 Toasts / ~642 Gathers** (1 %) — dezent & korrekt |
| Bank-Sortierung | ✅ **wirkt** | `BankPage.tsx:35-51,71-82` nutzt `compareItemsBy`/`ITEM_SORT_MODES` (Neueste/Name/Wert/Seltenheit) für beide Spalten |
| Toasts nicht am App-Root (Menü-Crash-Regression) | ✅ weiterhin sauber | `App.tsx:303` — `<Toasts />` liegt in `MainLayout` (def. `:259`), nur im Playing-Layout gemountet |

**ABER:** derselbe Skilling-Rare-Fix erzeugt einen neuen Feel-Regress bei Edelstein-Adern (siehe P2 unten).

---

## Findings

### P2 — [feel] „Rare Find!"-Toast-Spam beim gezielten Edelstein-Schürfen (Regress aus dem Skilling-Rare-Fix) — **confirmed**
- **Repro (SimPlayer, seed 7):** Miner mit `mining` 20, `mine_garnet_seam` 5 Sim-Min dauerhaft.
  **Ergebnis: 70 „Rare Find!"-Toasts bei ≈66 Gathers** → praktisch **jeder** Abbau feuert einen Toast.
- **Ursache:** `Toasts.tsx:65-69 isSkillRareItem()` erkennt Skilling-Raritäten allein über
  `itemId.startsWith("rough_")` bzw. `rarity === "poor"`. Die Gem-Seam-Aktionen liefern das rohe Gem aber als
  **garantiertes Primärprodukt** (`chance: 1`), nicht als seltenen Bonus:
  `mine_garnet_seam` (`index.ts:6325`), `mine_sapphire_seam` (`:6333`), `mine_ruby_seam` (`:6341`),
  `mine_diamond_seam` (`:6349`), `mine_onyx_seam` (`:6357`), `mine_voidstone_seam` (`:6366`),
  `mine_godgem_seam` (`:6375`), + `rough_bloodstone` (`:6219`). → 8 Aktionen betroffen.
- **Erwartet:** „Rare Find!" markiert einen **Überraschungs**-Fund (Nest 1 %, Roh-Gem als Neben-Drop beim Erz-Abbau).
- **Tatsächlich:** Beim dedizierten Gem-Farmen (Jewelcrafting-Zulieferung) meldet das Spiel das erwartete Hauptprodukt
  alle ~4,5 s (Garnet) bis ~9 s (Godgem) als „seltenen Fund". Bei `MAX_TOASTS 4` / `TOAST_MS 4000` (`Toasts.tsx:55-56`)
  liegt praktisch **dauerhaft** ein „Rare Find!" im Stack → der Moment wird entwertet + visuelles Rauschen + der
  Titel ist schlicht falsch (das garantierte Produkt ist kein rarer Fund).
- **Owner Fix:** **UI-Dev** (`Toasts.tsx`). Vorschlag: einen Fund nur dann als Skilling-Rare toasten, wenn er
  **nicht** das garantierte Primärprodukt der aktiven Aktion ist — z. B. Loot-Eintrag der `state.activeActionId`
  mit `chance >= 1` (bzw. der höchste-chance-Eintrag) vom Skilling-Rare-Pfad ausnehmen. Alternativ Detektion auf
  „Bonus-Drop mit `chance < 0.5`" statt auf den `rough_`-Präfix stützen. Fence-Byprodukt-Gems (`fence_*`,
  `chance 0.08-0.10`, `index.ts:7362/7375/7389`) bleiben dann korrekt als echter Bonus-Fund.

### P3 — [feel] Skilling-Erstfeedback bleibt deutlich später als Combat (unverändert, Chef-Balance) — confirmed
- **Repro (SimPlayer, seed 11):** Frischer Char.
  - Combat vs. `chicken` (L1): **erster Kill 9 s**, `attack` L2 nach **41 s** — gute frühe Dopamin-Taktung.
  - `cut_normal_tree` dauerhaft: **erstes Woodcutting-Level (L2) erst nach 118 s** (~2 Min, nur XP-Leiste als Feedback).
- **Einordnung:** Deckt sich mit Runde-1-Report (`sweep-2026-07-01/10-feel-qol.md`). Rein **Balance-Domäne (Chef)** —
  nur berichtet, kein Fix. Nennenswert, weil der neue Skilling-Rare-Toast (Nest ab 1 %) diesen 2-Minuten-Durchhänger
  im Frühgame kaum abfedert (erster Nest-Fund statistisch nach ~4,7 Min Holzfällen).

### P3 — [ux] Inventar/Bank haben Sortierung, aber weiterhin keine Text-Suche/Filter — suspected (Rest-Lücke, kein Regress)
- **Kontext:** Bank-Sortierung ist jetzt da (Fix ✅), aber weder Bank noch Inventar bieten Suche/Typ-Filter.
- **Tatsächlich:** Bei ausbaubaren 60+ Slots bleibt gezieltes Wiederfinden mühsam; Sortierung mildert, ersetzt Suche
  aber nicht. War in Runde 1 als P3 notiert, nur Sort wurde zugesagt/geliefert — daher weiterhin offene Rest-QoL, **kein** Regress.
- **Owner Fix:** UI-Dev (optional, niedrig) — schlankes Textsuch-Feld, die Sort-Komponente ist bereits geteilt.

---

## Was gut ist (verifiziert, kein Fix nötig)
- Feedback-Momente vollständig & mit SFX: Skill-Level (`Toasts.tsx:181-193`), Gesamtlevel (`:196-204`),
  Achievement + AP + Steam-Sync (`:164-179`), Combat-Rare-Drop (`:210-222`), Enchanted-Drop (`:283-300`),
  Slayer-Task (`:314-327`), Pet, Munitions-Leer-Warnung, einmalige Onboarding-Nudges (Ranged/Magic/Fence/Farm).
- Skilling-Rare-Toast wirkt für die **eigentlich** gedachten Fälle: Vogelnest (1-6 %) und Roh-Gem-**Neben**-Drops
  beim Erz-Abbau lösen dezent aus — der in Runde 1 gemeldete „verpuffte Jackpot-Moment" ist damit geschlossen.
- Combat-Frühtaktung stark: erster Kill < 10 s, erstes Skill-Level < 45 s, 0 Tode gegen L1-Mob.
- Rare-Drop-Combat-Toast korrekt auf Kampf gegatet (`fromCombat`, `:209`) → kein Toast beim Verarbeiten/Crafting.

---

## Friction-Log (chronologisch, neuer Spieler)
1. **Combat-Einstieg (0-1 Min):** sehr gut getaktet — Kill @9 s, Level @41 s, klare Toasts. (kein Fix)
2. **Skilling-Einstieg (0-2 Min):** erstes Level erst @118 s, dazwischen nur XP-Leiste — Combat↔Skilling-Asymmetrie
   prägt den ersten Eindruck. (P3, Chef-Balance)
3. **Gem-Farmen (ab Mining L15):** **Dauer-„Rare Find!"** alle 4,5-9 s beim Adern-Abbau — entwertet das Feedback,
   verwirrt („warum ist mein Hauptprodukt selten?"). (**P2, Haupt-Finding**)
4. **Bankwachstum:** Sortierung jetzt vorhanden (Fix ✅), Suche fehlt weiterhin — nur milde Reibung. (P3)

## Kurz-Zusammenfassung
- **Findings:** P0 0 · P1 0 · **P2 1** · **P3 2**
- **Top-3:**
  1. **[P2 feel] Gem-Seam-„Rare Find!"-Spam** — 8 Adern-Aktionen toasten ihr garantiertes Primärprodukt als seltenen
     Fund (70 Toasts/5 Min gemessen). Fix: Primärprodukt der aktiven Aktion vom Skilling-Rare-Pfad ausnehmen (UI-Dev).
  2. **[Verifiziert ✅]** Skilling-Rare-Toast (Nest/Bonus-Gems), Bank-Sortierung, Toasts-Mount im MainLayout — alle
     drei wirken wie beabsichtigt.
  3. **[P3]** Skilling-Frühfeedback (2 Min bis L2) + fehlende Inventar/Bank-Suche — beides bekannte Rest-Lücken,
     Chef-Balance bzw. optionale QoL, kein Blocker.
- **Empfehlung:** fix-then-ship für das P2-Toast-Spam (kleiner, lokaler UI-Dev-Fix in `Toasts.tsx`); alles andere ship.

*Verifikations-Notiz: temporärer `_feelqol_probe.test.ts` nur zum Messen genutzt und wieder gelöscht — Repo unverändert.*
