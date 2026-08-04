# QA-Run 6 — Economy & Progression-Pacing (Slayer-Punkte-Shop-Erweiterung + Material-Senken)

**Tester:** Playtester / Economy- & Pacing-Reviewer (STRIKT READ-ONLY, kein Code geändert) · **Datum:** 2026-06-28
**Scope (Chef):** Hebt die **erweiterte Slayer-Punkte-Senke** (Shop jetzt 10 Einträge bis 3000 Pkt) + die neuen **Material-Senken** (`item_scrap`, `cut_gemstone`) den ehrlichen City-losen Deckel (~8 aus run5)? Was ist OHNE City das realistische Max jetzt, und was bräuchte 9,5? Vergleich zu `design/qa/run5-economy-pacing.md` (war **7,5/10**, ehrlicher City-loser Deckel ~8).
**Methode:** Direkt aus echten Daten — `packages/content/src/index.ts` (Slayer-Shop L12206–12220, Slayer-Master/basePoints L12102–12171, Slayer-Tower L12173–12204, `cut_gemstone`-Item L391 + Edelstein-Ring L216–221 + Ring-Rezept L6864–6869 + Gem-Drops L5904/5922/5991, `item_scrap`-Item L612 + Recycle-Rezept L4345–4354), `packages/engine/src/slayer.ts` (`assignTask`/`pointReward = master.basePoints` L145, `completeTask` `slayerPoints += task.pointReward` L176, `spendSlayerPoints` L204). Punkte-Pool & Task-Zahlen **per Hand nachgerechnet** (reine Arithmetik). **Kein Temp-Harness nötig/erstellt; es wurde keine Datei außer dieser angelegt.**
**Wichtig (Chef-Status):** Gold-Makrosenke (Gold ab Mid/Late tot) ist **bewusst an das City-Feature gekoppelt (deferred)** → hier **nur im Status bestätigt**, NICHT als Blocker gewertet. Bewertet wird, was die Slayer- + Material-Senken **ohne City** leisten.

---

## Fun-Score: **8,0 / 10** (Economy/Pacing-Linse) — **Δ vs run5: +0,5**

Run 5 stand bei 7,5 — **unter** seinem eigenen ehrlich benannten City-losen Deckel (~8,0). Run 6 liefert genau die Arbeit, die run5 als „8,0-Liste ohne City" und als **halben Teil der 9,5-Anforderung** ausgewiesen hatte: die **Slayer-Punkte-Senke** ist von einer nach 975 Pkt toten Währung zu einer Senke gewachsen, die **über das gesamte Endgame** Funktion hat. Damit erreicht Run 6 den City-losen Deckel — **nicht weil der Deckel steigt, sondern weil das Spiel jetzt an ihm ankommt**:

- **Slayer-Punkte: von „tot nach 975" zu „relevant über das ganze Endgame".** Der Shop wuchs von 5 auf **10 Einträge**; der Gesamt-Kaufpreis von **975 → 10.475 Pkt** (≈ **10,7×**). Bei M4-Rate (20 Pkt/Task) sind das **≈ 524 Tasks**, um alles zu kaufen — d. h. Punkte sammeln sich für praktisch die gesamte Endgame-Laufzeit sinnvoll an statt sofort zu inerten. Das ist die ökonomisch wertvollste Einzeländerung seit run4.
- **Zwei tote Mats bekommen Senken (run5-P2 geschlossen):** `item_scrap` → `recycle_scrap` (4 Scrap → 1 Kupferbarren) und `cut_gemstone` → `craft_gemstone_ring` (rare Ring, +6 Acc/+2 % Crit). „Nichts ist Müll" greift jetzt auch für diese zwei Reste.

**Warum nur +0,5 und nicht +1:** Die Slayer-Senke ist immer noch **terminal** — 10 **Einmal**-Unlocks, keine *wiederkehrende* Senke. Nach Vollkauf sind Punkte erneut tot (nur viel später). Und der **Deckel selbst bewegt sich nicht**: Gold — die **Primärwährung** — bleibt über das gesamte Endgame (= 59 % der Skill-XP) inert (deferred, City). Ein Economy-Score wird primär von der Hauptwährung getragen; solange die tot ist, ist > ~8,0–8,5 nicht ehrlich vergebbar. Run 6 ist also ein sauberer, **ehrlicher +0,5, der den City-losen Deckel ausschöpft**, ihn aber bewusst nicht anhebt.

---

## Δ vs run5 — was die Run-6-Senken ökonomisch bewirken

| run5-Befund (Economy/Pacing) | Status in run6 | Beleg |
|---|---|---|
| **P1 Slayer-Punkte tote Währung** (5 Einmal-Unlocks, **975 Pkt** total, danach inert) | **stark entschärft** — 10 Einträge, **10.475 Pkt** total (Phase 2: Slayer-Gear 1200–3000); Punkte über ~524 M4-Tasks sammelnswert → **P1→P2** | `index.ts:12206–12220` |
| **P2 `item_scrap` ohne Senke** | **geschlossen** — `recycle_scrap` (4 Scrap → 1 Kupferbarren, smithing L5) | `index.ts:4345–4354` |
| **P2 `cut_gemstone`-Senke fehlt** | **geschlossen** — `craft_gemstone_ring` (1 Gem + 1 Eisenbarren → rare Ring, jewelcrafting L20) | `index.ts:6864–6869, 216–221` |
| **P1 Gold ab Mid/Late tot / kein mitwachsender Makro-Sink** | **unverändert — deferred (City)**; Run-6-Senken adressieren das **nicht** (Slayer-Pkt + Mats, kein Gold) | `shop`/`bank.ts` |
| Reed-Senke „weich" (P2), last_idol-g/h (P2), Tool-Leiter 3/5 Gather (P2) | **nicht Teil von Run 6 — unverändert/deferred** (in diesem Pass nicht re-verifiziert, aus run5 bekannt) | run5 §5 |
| XP-Kurve 13,03 Mio/Skill bis L99 (90→99 = 59 %) | **unverändert** (keine Curve-Änderung in Run 6) | `leveling.ts` |

---

## 1) Die erweiterte Slayer-Punkte-Senke im Detail (die Kern-Änderung)

**Vorher (run5):** `slayerShop` = 5 Gate-Items, Summe **975 Pkt**. M4 zahlt 20 Pkt/Task → nach ~49 Tasks alles gekauft, danach Punkte tot.

**Jetzt (run6):** 10 Einträge, zweiphasig.

| Phase | Einträge | Kosten (Pkt) | Charakter |
|---|---|---|---|
| Phase 1 (Gate-Items für Turm) | plague_mask 50 · ear_plugs 75 · mirror_ward 100 · soul_veil 250 · void_anchor 500 | **975** | Pflicht-Progression |
| Phase 2 (Slayer-Gear, Craft-Alternative) | slayer_vambraces 1200 · slayer_greaves 1500 · slayer_amulet 1800 · abyssal_core 2000 · **slayer_helm 3000** | **9.500** | optionaler Long-Tail |
| **Summe** | **10 Items** | **10.475** | — |

**Punkte-Ökonomie (per Hand, `basePoints` je Master):** M1 = 2 · M2 = 5 · M3 = 10 · M4 = 20 Pkt/Task (`completeTask` L176). Vollkauf bei reiner M4-Rate ≈ **524 Tasks**; bei je 50–120 Kills/Task = **grob 30k–60k Kills**. → Die Senke ist **groß genug, dass Punkte über den gesamten realistischen Endgame-Verlauf ein Ziel bleiben**, und nicht so groß, dass sie als Wall wirkt (Phase 2 ist optionales Fallback-Gear, kein Pflicht-Pfad — Craft bleibt parallel möglich).

**Bewertung:** Das ist exakt die in run5 §7 als „9,5-nötig" markierte Slayer-Achse — **aber nur zur Hälfte geliefert**: run5 forderte eine **wiederkehrende** Senke (laufende Käufe/Upgrades statt Einmal-Unlocks). Run 6 liefert **größere & teurere Einmal-Unlocks**. Das verschiebt den toten Punkt von 975 auf 10.475 (für die meisten Spieldurchläufe faktisch „nie erreicht"), macht ihn aber **nicht** strukturell endlos. Für einen Completionisten / Dauer-Idle-Spieler sind Punkte nach Vollkauf wieder inert. Trotzdem: massiver, ehrlicher Fortschritt auf der Sekundärwährung.

---

## 2) Die neuen Material-Senken (Anti-Müll, gold-neutral)

- **`item_scrap` → `recycle_scrap`** (4 Scrap → 1 Kupferbarren, smithing L5, xp 1). Scrap (value 3) war run5-P2 senkenlos. Jetzt verwertbar — aber **schwach**: mündet in den **untersten** Barren-Tier, also reine Anti-Müll-Politur ohne nennenswerten Wert-Pull. Korrekt als „nichts ist Müll", **nicht** als spürbare Senke verbuchen.
- **`cut_gemstone` → `craft_gemstone_ring`** (1 Gem + 1 Eisenbarren → rare Ring, +6 Acc/+2 % Crit, jewelcrafting L20). Gems droppen aus Mining-nahen Quellen (L5904/5922/5991). Diese Senke ist **wertiger** als Scrap: liefert ein real nutzbares Early/Mid-Gear-Teil und dockt die Gem-Drops an Jewelcrafting an. **Eng** (genau ein Rezept) — Ausbaupotenzial Richtung mehrerer Gem-Gear-Tiers, aber als Lückenschluss sauber.

Beide sind **gold-neutral** und ändern den Makro-Gold-Befund nicht (korrekt so, City-Sache).

---

## 3) Kernfrage: Hebt das den City-losen Deckel (~8)?

**Nein — aber Run 6 erreicht ihn jetzt.** Sauber getrennt:

- **Deckel-Höhe (City-los): unverändert ~8,0–8,5.** Sie wird von der **Primärwährung** bestimmt: Gold ist über das gesamte Endgame (59 % der Skill-XP, der längste Abschnitt) inert. Eine Wirtschaft, deren Hauptwährung den Großteil der Laufzeit nutzlos akkumuliert, kann ein Economy-Reviewer nicht über ~8,5 bewerten — egal wie gut die Sekundär-Loops sind. Das ist deferred (City), kein Blocker, aber es ist der Deckel.
- **Ist-Stand: von 7,5 (unter Deckel) auf 8,0 (am Deckel).** Run 6 hat die billiger-ohne-City-erreichbare Hälfte der run5-„9,5-Liste" abgearbeitet (Slayer-Punkte-Achse) plus zwei P2-Mat-Senken. Damit sitzt das Spiel nun **am** ehrlichen City-losen Maximum statt darunter.

**Realistisches Max OHNE City jetzt: ~8,0 (knapp 8,5 mit der Restliste unten).** Run 6 hat den günstigsten verbleibenden Hebel gezogen. Was den City-losen Deckel noch bis ~8,5 ausreizt (kein 9,5):
- Slayer-Senke **wiederkehrend** machen (laufende Käufe/Verbrauchs-Upgrades) statt nur teurer Einmal-Unlocks → Punkte nie wieder vollständig tot;
- Tool-Leiter für die fehlenden 3/5 Gather-Skills;
- Mastery/Achievement-Mikro-Meilensteine im 90→99-Band (XP-Takt back-end);
- Reed-Senke schärfen, last_idol-g/h-Fix, item_scrap/cut_gemstone-Senken über Anti-Müll hinaus erweitern.

---

## 4) Priorisierte Findings

> Gold-Makrosenke ist per Chef **deferred (City)** → als **[DEFERRED-STATUS]** geführt, **nicht** als Blocker.

### [P0] — keine.
Nichts in dieser Linse blockiert Gameplay. 0 Walls.

### [P1 — DEFERRED-STATUS, bekannt] Gold ab Mid/Late tot — kein mitwachsender Makro-Sink
**Unverändert.** Die einzige mitwachsende Gold-Senke (Enchant ~12k g/Gear-Gen, run5) bleibt zu klein gegen 150k–1 Mio g/h. Run-6-Senken sind Slayer-Punkte + Mats, **kein** Gold. **Status bestätigt, deferred, kein Blocker.** Dies ist der alleinige Grund, warum der City-lose Deckel bei ~8 bleibt. Keine neue Empfehlung über `gold-economy.md` hinaus.

### [P2 — von run5-P1 herabgestuft] Slayer-Senke ist groß, aber **terminal** (keine wiederkehrende Senke)
Pool 975 → 10.475 Pkt entschärft die tote Währung enorm (Punkte über ~524 M4-Tasks relevant). **Aber:** 10 Einmal-Unlocks → nach Vollkauf sind Punkte erneut inert (nur viel später; für Completionisten/Dauer-Idle real erreichbar). **Fix für 9,5 (City-Welle):** mind. **eine wiederkehrende** Slayer-Senke — z. B. verbrauchbare Slayer-Consumables, Reroll/Skip-Rabatte, skalierende Upgrades — damit Punkte nie vollständig tot werden.

### [P2] `item_scrap`-Senke ist „weich" (Anti-Müll, kein Wert-Pull)
`recycle_scrap` mündet in den untersten Barren-Tier → schließt die Müll-Lücke, zieht aber keinen Wert aus der Wirtschaft. Korrekt als „nichts ist Müll", **nicht** als spürbare Senke verbuchen. **Optional:** Scrap zusätzlich als minor Input höherer Recycling-Tiers / Gold-Rückgewinn.

### [P2] `cut_gemstone`-Senke ist eng (genau ein Rezept)
`craft_gemstone_ring` ist wertiger als Scrap (nutzbarer rare Ring), aber single-point. **Optional:** weitere Gem-Gear-Tiers (Amulett/höhere Ringe) für eine mitwachsende Gem-Senke.

### [P2 — DEFERRED/aus run5, in diesem Pass nicht re-verifiziert] Reed-Senke weich · last_idol-g/h · Tool-Leiter 3/5 Gather
Nicht Teil von Run 6; aus run5 bekannt, Status unverändert/deferred. Gehören zur City-losen 8,5-Restliste.

### [P3] Slayer-Punkte-Verdienst vs. Sink-Größe — Balance-Hinweis
Phase 2 (9.500 Pkt) ist bewusst Long-Tail-Fallback-Gear. Bei früheren Mastern (2–10 Pkt/Task) ist Phase 2 quasi unerreichbar → das ist **gewollt** (M4-Gating), sollte aber im UI als „Endgame-Ziel" klar sein, damit kein Spieler den Pool als blockiert missversteht. Reine Erwartungs-Hygiene.

### [P3 — aus run5, unverändert] Late-Pacing lang (13,03 Mio/Skill, 90→99 = 59 %)
Keine Curve-Änderung in Run 6. **Fix (Post-1.0):** Mastery/Achievement-Mikro-Meilensteine im 90→99-Band.

---

## 5) Pacing-Bewertung Früh → Endgame (aktualisiert)

| Phase | Income g/h | Gold-Gefühl | Sekundärwährung | Belohnungs-Vielfalt | Verdikt |
|---|---|---|---|---|---|
| **Früh L1–20** | ~5–20k | knapp & bedeutsam | Slayer-Pkt sammeln (Gate-Items) | Gear + Crops/Reeds + erste Scrap/Gem-Verwertung | ✅ gesund (bester Teil) |
| **Mid L20–50** | ~30–150k | lockert, dann Stau | Slayer-Pkt fließen in Phase-1-Unlocks | breit; Crop-Kreislauf + Enchants + Gem-Ring | 🟡 Gold-Inflation beginnt, sonst gut |
| **Late L50–99** | 150k–Mio | **Gold totes Polster** (deferred) | **Slayer-Pkt jetzt langfristiges Ziel** (Phase 2 bis 3000) | rund: Mobs + L99-Parität + Enchant + Slayer-Gear-Pfad | 🟢→🟡 alles außer Gold trägt |

**„Gründe zu grinden" (Δ vs run5):**
- **Gold:** früh ✅ · mid 🟡 · late kein Grund 🔴 *(unverändert, deferred)*
- **XP:** durchgehend ✅ *(unverändert)*
- **Drops/Gear:** stark ✅✅ *(unverändert)*
- **Slayer-Punkte:** **schwach 🔴 → solide 🟢** *(Δ: Pool ×10,7, über gesamtes Endgame relevant; nur Terminal-Charakter offen)*
- **Material-Verwertung:** **runder 🟢** *(Δ: Scrap + Gem-Reste nicht mehr Müll)*

---

## 6) „Was fehlt für 9,5?"

Run 6 hat die **günstigste** der zwei 9,5-Achsen (Slayer-Punkte) zur Hälfte erschlagen. Für 9,5 bleibt im Kern die **City-Welle**:

1. **Mitwachsende/∞ Gold-Makrosenke (der entscheidende Hebel).** Primärwährung muss über das gesamte Endgame (59 % der Skill-XP) Funktion haben: Rarität-/Suffix-Reroll als ∞-Sink (`gold-economy.md` S5), mit dem Income skalierende City-Upgrades/Services. **Ohne das ist > ~8,5 nicht ehrlich vergebbar** — egal wie poliert der Rest ist.
2. **Wiederkehrende** Slayer-Punkte-Senke. Run 6 lieferte größere Einmal-Unlocks (gut!), aber keine laufende Senke → Punkte nach Vollkauf erneut tot. Verbrauchs-/Upgrade-Käufe ergänzen, damit Punkte dauerhaft sammelnswert bleiben.
3. **+ die City-lose 8,5-Restliste:** Tool-Leiter 3/5 Gather, Mastery/Achievement-Takt 90→99, last_idol-g/h, Reed-Senke schärfen, Scrap/Gem-Senken über Anti-Müll hinaus.

**Bottom Line:** Run 6 ist ein sauberer, ehrlicher **+0,5 (7,5 → 8,0)**. Die Slayer-Punkte-Senke ist von einer nach 975 Pkt toten Währung zu einer über das gesamte Endgame relevanten Senke (10.475 Pkt) gereift, und `item_scrap`/`cut_gemstone` haben jetzt Senken. Damit **erreicht** das Spiel den in run5 benannten ehrlichen City-losen Deckel — **der Deckel selbst bleibt aber bei ~8,0–8,5**, weil die **Primärwährung Gold** über das gesamte Endgame inert ist (deferred, City). **9,5 verlangt zwingend eine mitwachsende Gold-Makrosenke + eine *wiederkehrende* Slayer-Punkte-Senke — genau das, was die City liefern soll.**
