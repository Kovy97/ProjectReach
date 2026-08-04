# QA-Run 5 — Economy & Progression-Pacing (Crop-Ökonomie + Reed-Shop)

**Tester:** Playtester / Economy- & Pacing-Reviewer (STRIKT READ-ONLY, kein Code geändert) · **Datum:** 2026-06-28
**Scope (Chef):** XP-Kurven-Gesundheit · Pacing früh→endgame · Endgame-Mob-g/h-Kurve · **neue Mini-Senken: Crop-Ökonomie + Reed-Shop** · trägt die Gear-Treadmill das Endgame? · „Warum grinden?". Vergleich zu `design/qa/run4-economy-pacing.md` (war **7/10**).
**Methode:** Direkt aus echten Daten — `packages/content/src/index.ts` (Crop-/Reed-Items L483–536, Crop-Consumables L538–547, Combo-Food L4612–4697, Crop-Verarbeitung L7607–7660, Affix-Runen-Rezepte L6935–7069, Shop L8857–8957, Crops L11540–11795), `packages/engine/src/leveling.ts` (**XP-Tabelle per Node nachgerechnet, unverändert**), `enchant.ts` (`applyEnchant` zieht **1 Rune + Gold pro Slot, kein Refund**) + `packages/shared/src/index.ts` (`enchantGoldCost`, `enchantSlotsFor`). Temp-Harness verwendet und wieder **entfernt**; es wurde **keine** Datei außer dieser angelegt.
**Wichtig (Chef-Status):** Gold-Makrosenke (Gold ab Mid tot) + Slayer-Punkte-Senke sind **bewusst an das City-Feature gekoppelt (deferred)** → hier **nur im Status bestätigt**, NICHT als Blocker gewertet. Bewertet wird, was die **Mini-Senken ohne City** leisten.

---

## Fun-Score: **7,5 / 10** (Economy/Pacing-Linse) — **Δ vs run4: +0,5**

Run 4 stand bei 7/10. Run 5 liefert **keine neue Belohnungsachse**, sondern **schließt die bestehenden Material-Loops zu einem zusammenhängenden Kreislauf** und verbindet die Farming-Material-Senke erstmals **direkt mit der einzigen mitwachsenden Senke (Enchant)**. Das ist ein echter, aber **inkrementeller** Gewinn auf der Nicht-Gold-Achse — daher +0,5, nicht +1:

- **Crop-Ökonomie ist jetzt ein geschlossener Kreislauf:** Jeder Crop-Typ hat eine verarbeitende Senke und mündet in kampfrelevanten Output — Kochzutaten→Combo-Food (Regen+Buff, T1–T5 L18–90), Kräuter→Herblore (Heiltränke/Tonika), Pigmente+Reeds→Runecrafting. „Nichts ist Müll" ist von einzelnen Patch-Senken (run4 Fix C/D) zu einem **durchgehenden Gather→Craft→Combat-Netz** geworden.
- **Reed-Shop + Reed→Rune→Enchant-Kette:** Reeds (vormals tote „Inscription-Pergament"-Mats nach Inscription-Removal) sind jetzt **Pflicht-Input für Affix-Runen**, die **dauerhaft** beim Verzaubern verbraucht werden (1 Rune/Slot, kein Refund). Damit ist die Farming-Material-Senke erstmals an die **Gear-/Enchant-Treadmill** angedockt — die einzige Senke, die mit dem Fortschritt mitwächst. Der Reed-Shop (Saat + Fertig-Reeds als Fallback) garantiert, dass diese Kette **nie an Material-Mangel stockt** und ist nebenbei eine *winzige* wiederkehrende Gold-Senke.

Der Deckel ist **unverändert**: die zwei toten Währungen (**Gold mid/late · Slayer-Punkte**) sind die Mini-Senken bewusst **nicht** angegangen — sie sind **Material-Senken plus vernachlässigbare Gold-Senken**, keine Makro-Gold-Senke. Per Chef ist das **deferred (City)** und damit **kein Blocker**, aber es ist exakt der Grund, warum der Score bei 7,5 bleibt und ohne City strukturell **nicht über ~8** kommt (s.u.).

---

## Δ vs run4 — was die Run-5-Senken ökonomisch bewirken

| run4-Befund (Economy/Pacing) | Status in run5 | Beleg |
|---|---|---|
| Crop-Consumables = **isolierte** Patch-Senken (Fix D), Holzschilde (Fix C) | **zu geschlossenem Kreislauf ausgebaut** — jeder Crop-Tier hat Senke; Cooking/Herblore/Runecrafting greifen ineinander | `index.ts:4612,7607,6935` |
| Reeds als Material vorhanden, aber **nicht als Senke betont** (Alt-Zweck Inscription tot) | **Reed→Rune→Enchant-Kette aktiv** — Reeds sind Pflicht-Input für Affix-Runen, dauerhaft verbraucht beim Enchant | `index.ts:6943ff` + `enchant.ts:181` |
| Reed-Versorgung unklar | **Reed-Shop** ergänzt — 3 Schilf-Saaten (10/60/380 g) + 3 Fertig-Reeds (8/30/120 g) als Komfort-Fallback | `index.ts:8929–8935` |
| Enchant = einzige mitwachsende Gold-Senke, aber „freistehend" | **jetzt an Farming-Loop gekoppelt** — Reeds machen die Runen-Vorstufe zur farmbaren Material-Senke | s. §3 |
| **XP-Kurve real 13,03 Mio/Skill bis L99** | **unverändert** (per Node bestätigt: 13.034.431; 90→99 = 59,0 %) | `leveling.ts`, Harness |
| Endgame-Mob-g/h monoton (Fix A) | **unverändert stabil** (kein Regress; Reeds speisen Crafting-Inputs zusätzlich) | `index.ts` Mob-Band |
| **P1 Gold ab Mid tot / kein mitwachsender Makro-Sink** | **unverändert — deferred (City)**; Mini-Senken adressieren das **nicht** | `shop`/`bank.ts` |
| **P1 Slayer-Punkte tot** (975 Pkt total) | **unverändert — deferred** | `slayerShop` |
| **P2 Werkzeug-Leiter fehlt 3/5 Gather-Skills** | **unverändert — deferred (City/S1)** | nur Mining+WC |

---

## 1) XP-Kurven-Gesundheit (per Node nachgerechnet — unverändert ggü. run4)

`buildXpTable()`: `acc += floor(n + 300·2^(n/7))`, `table = floor(acc/4)` — Standard-RS/Melvor-Kurve, L99-gedeckelt. Nachgerechnet:

| Meilenstein | Gesamt-XP/Skill | Anteil |
|---|---|---|
| bis L20 | 4.470 | 0,03 % |
| bis L50 | 101.333 | 0,8 % |
| bis L80 | 1.986.068 | 15,2 % |
| bis L90 | 5.346.332 | 41,0 % |
| **bis L99** | **13.034.431** | 100 % |
| **60→99** | 12.760.689 | 97,9 % |
| **90→99** | 7.688.099 | **59,0 %** |

**Bewertung:** Kurve unverändert gesund und bewusst back-loaded (90→99 = 59 %). **Kein Curve-Bug.** Die Run-5-Senken ändern die Kurve nicht — sie erhöhen aber die Belohnungs-*Dichte* im back-end leicht, weil im Late-Grind jetzt zusätzlich Reeds/Crops als verwertbarer Nebenertrag mitlaufen (Farming/Herblore/Runecrafting parallel zum Combat-Grind). Marginal, aber in die richtige Richtung.

---

## 2) Endgame-Mob-g/h-Kurve — stabil aus run4, jetzt stärker verzahnt

Das L87→L110-Open-World-Band (gravecliff_specter→void_titan, gold/Kill 270→700 monoton, run4 Fix A) ist **unverändert** und weiterhin der korrekt steigende Endgame-Treiber. **Δ in run5:** die neuen Mobs speisen über godiron/void/aether-Drops nicht nur Smithing, sondern indirekt auch die **Enchant-Kette** (Top-Essenzen sind Runen-Input neben den Reeds) → die Mob-Kurve und die Enchant-Treadmill sind durch run5 enger gekoppelt. **L120-Capstone `last_idol` (gold 794)** bleibt knapp über void_titan, aber boss-typisch niedrige g/h — siehe P2 (unverändert aus run4).

---

## 3) Die neuen Mini-Senken im Detail

### 3a) Crop-Ökonomie — geschlossener Kreislauf (Material-Senke, gold-neutral)
Jeder gefarmte Crop-Typ mündet jetzt in einen kampfrelevanten Output:

| Crop-Gruppe | Senke (Skill) | Output | Level-Band |
|---|---|---|---|
| Kochzutaten (gravetato→ambergrain) | **Cooking** → Combo-Food | Premium-Regen+Buff-Food | L18–90 |
| Kräuter (marshroot→godsbreath) | **Herblore** | Heiltränke/Kampf-Tonika | L1–99 |
| Flavor-Crops (ashroot, grimwheat, mandrake, gallows, corpse_lily, godbloom) | **Cooking/Herblore** | Crop-Consumables (run4 Fix D) | L1–95 |
| Pigmente (umber→radiant) | **Runecrafting** | Affix-Runen | L15–75 |
| **Reeds (pale/iron/void)** | **Runecrafting** | Affix-Runen → Enchant | L15–75 |

**Bewertung:** Sehr gut für Loop-Verzahnung und „nichts ist Müll" — alle drei Kampfstile profitieren (Combo-Food/Tonika sind stil-neutral, Affix-Runen decken keen/precise/arcane/hunter etc.). **Aber gold-neutral:** löst die Makro-Gold-Frage nicht (korrekt so, City-Sache).

### 3b) Reed-Shop + Reed→Rune→Enchant — die ökonomisch interessanteste Senke
- **Mechanik:** Affix-Runen-Rezepte verlangen reed_pale/iron/void (1–3 Stk) + Pigment + Essenz. `applyEnchant` verbraucht **1 Rune pro Slot, dauerhaft, ohne Refund** (auch Disenchant gibt die Rune nicht zurück). Slots nach Rarität: common 1 → rare/superRare 2 → epic 3 → legendary/godly mehr.
- **Damit ist es eine wiederkehrende Material-Senke, die mit der Gear-Progression skaliert:** Jede neue Gear-Generation (alle ~10 Level neuer Tier) = neu verzaubern = neue Runen = neue Reeds.
- **Reed-Shop** garantiert Versorgung: Saat (10/60/380 g) + Fertig-Reeds (8/30/120 g). Die Fertig-Reeds sind eine *winzige wiederkehrende Gold-Senke* — vernachlässigbar als Strom, aber real.

**Größenordnung (Harness):**
- reed-Plot-Ertrag ≈ 7,5/10 min; ein volles rare-Set (~20 Runen × ~2 Reeds) ≈ **40 Reeds ≈ 5–6 Ernten** → Reeds sind **reichlich** verfügbar, also eine **weiche** Material-Senke (bindendes Constraint sind eher Essenzen + Gold, nicht Reeds).
- Gold-Seite: volle Enchant-Generation ≈ 12k g (20× ~600 g) — gegen late-Income **150k–1 Mio g/h** sind das **<8 % einer Stunde, einmalig je Gear-Tier**. → Enchant bleibt die einzige mitwachsende Gold-Senke, ist aber **zu klein**, um das Late-Gold-Loch zu schließen (unverändert aus run4).

---

## 4) Trägt die Gear-Treadmill das Endgame? — Ja, jetzt mit farmbarem Enchant-Feeder

Die vier Treadmill-Achsen aus run4 (Smithing-Tiers, Drops, Enchant, Stil-Parität bis L99) tragen unverändert. **Δ in run5:** die Enchant-Achse hat jetzt eine **farmbare Material-Vorstufe** (Reeds/Pigmente via Farming/Runecrafting) statt nur Gold + Drop-Essenzen — das macht Enchant zu einem **aktiven Crafting-Ziel** statt einem reinen Gold-Knopf und verzahnt Farming↔Combat↔Enchant. Die Treadmill ist damit **runder**, ihre Tragkraft aber qualitativ wie run4 (kein neuer Tier, keine neue Power-Achse).

---

## 5) Priorisierte Findings

> Gold-/Slayer-Punkte-Senken sind per Chef **deferred (City)** → als **[DEFERRED-STATUS]** geführt, **nicht** als Blocker.

### [P0] — keine.
Nichts in dieser Linse blockiert Gameplay.

### [P1 — DEFERRED-STATUS, bekannt] Gold ab Mid/Late tot — kein mitwachsender Makro-Sink
Unverändert. Reed-Shop + Crop-Ökonomie sind Material-Senken + vernachlässigbare Gold-Senken; die einzige mitwachsende Gold-Senke (Enchant ~12k g/Gear-Gen) ist zu klein gegen 150k–1 Mio g/h. **Status bestätigt, deferred, kein Blocker.** Daten geliefert; keine neue Empfehlung über `gold-economy.md §6-7` (S1+S2+S3) hinaus.

### [P1 — DEFERRED-STATUS, bekannt] Slayer-Punkte tote Währung
`slayerShop` unverändert (5 Einmal-Unlocks, 975 Pkt total). Master-4 zahlt 20 Pkt/Task → danach sammeln Punkte zwecklos an. **Deferred, kein Blocker.**

### [P2] Reed-Senke ist „weich" — Reeds sind nicht das bindende Constraint
Reed-Ertrag (7,5/10 min) deutlich über dem Enchant-Bedarf (~40 Reeds/Gear-Gen). Reeds ziehen daher **wenig Wert aus der Wirtschaft** — sie sind eher Anti-Müll-Politur als echte Senke. Korrekt als „nichts ist Müll", aber **nicht** als spürbare Senke verbuchen. **Optional (erst sobald Reroll/City existiert):** Reed-Bedarf der höheren Runen-Tiers anheben (Tier III auf 3–4 Reeds), damit late wirklich gefarmt werden muss.

### [P2] L120-Capstone-Boss-g/h bleibt unter dem Open-World-Band
Unverändert aus run4: `last_idol` (gold 794) ist Endpunkt mit boss-typisch niedriger g/h. Boss ≠ Farm-Spot → gering. **Fix (optional, erst mit Gold-Sink):** last_idol-gold leicht über void_titan ziehen.

### [P3] Combo-Food untergräbt die (kleine) Shop-Food-Gold-Senke (Erwartungs-Hygiene)
Combo-Food (T5 quasi-BiS-Regen, design-intended) ersetzt gekaufte Heiltränke → die ohnehin triviale Shop-Food-Gold-Senke entfällt faktisch. Kein Handlungsbedarf, nur Klarstellung: Crop-Ökonomie ist **netto gold-neutral bis -negativ**, kein Gold-Sink-Fortschritt.

### [P3] Stale-Kommentar: Reed-Definition nennt noch „Inscription Pergament"
`index.ts:483` kommentiert Reeds als „Farming allein → Inscription Pergament" — Inscription ist entfernt, Reeds gehen real in Runecrafting/Enchant. Reiner Doc-Hygiene-Hinweis (irreführender Kommentar), kein Gameplay-Effekt.

### [P3] Late-Pacing weiterhin lang (13,03 Mio/Skill bis 99)
Unverändert. 90→99 = 59 % aller Skill-XP; jetzt minimal besser abgefedert durch parallel mitlaufende Crop-/Reed-Erträge. **Fix (Post-1.0):** Mastery/Achievement-Mikro-Meilensteine im 90→99-Band.

---

## 6) Pacing-Bewertung Früh → Endgame (aktualisiert)

| Phase | Income g/h | Gold-Gefühl | XP-Takt | Belohnungs-Vielfalt | Verdikt |
|---|---|---|---|---|---|
| **Früh L1–20** | ~5–20k | knapp & bedeutsam | 3×→2× Verstärker | Gear + erste Crops/Combo-Food/Reeds | ✅ gesund (bester Teil) |
| **Mid L20–50** | ~30–150k | lockert, dann Stau | 1× | breit; Crop-Kreislauf + erste Enchants greifen | 🟡 Gold-Inflation beginnt, sonst gut |
| **Late L50–99** | 150k–Mio | **Gold totes Polster** (deferred) | langer Grind (90→99 = 59 %) | **rund:** Mobs + L99-Parität + Enchant mit farmbarem Reed-Feeder | 🟢→🟡 Gear/XP/Crafting tragen; nur Gold/Punkte tot |

**„Gründe zu grinden" (Δ vs run4):**
- **Gold:** früh ✅ · mid 🟡 · late kein Grund 🔴 *(unverändert, deferred)*
- **XP:** durchgehend ✅ *(unverändert)*
- **Drops/Gear:** stark ✅✅ *(unverändert; jetzt + Enchant-Material-Feeder)*
- **Slayer-Punkte:** schwach 🔴 *(unverändert, deferred)*
- **Crop-/Reed-Verwertung:** **runder** 🟢 — geschlossener Kreislauf, Farming↔Craft↔Enchant verzahnt *(Δ: run4 isolierte Patch-Senken)*

---

## 7) Was wäre OHNE City das Max — und was bräuchte 9,5?

**Realistischer Deckel ohne City: ~8,0/10.** Begründung (ehrlich, damit der CEO den deferred-Deckel dokumentieren kann):

Auf der **Material-/Gear-/XP-Achse** ist das Spiel schon nahe am Optimum für ein Idle-RPG. Mit den noch offenen *nicht-City*-Verbesserungen ließe sich 8,0 erreichen:
- Werkzeug-Leiter für die fehlenden 3/5 Gather-Skills (Farming/Foraging/Herblore),
- Mastery/Achievement-Mikro-Meilensteine im 90→99-Band (XP-Takt im back-end),
- last_idol-g/h-Fix + Reed-Bedarf-Anhebung (P2),
- letzte Loop-Politur (z. B. Reed als spürbarere Senke).

**Aber > ~8,5 ist ohne City strukturell nicht ehrlich vergebbar.** Ein Economy/Pacing-Score misst u. a., ob die **Primärwährung über die gesamte Spielzeit Funktion hat**. Hier ist **Gold für das gesamte Endgame (= 59 % der Skill-XP, der längste Spielabschnitt) inert** und **Slayer-Punkte nach ~975 Pkt tot**. Eine Wirtschaft, in der die Hauptwährung den größten Teil der Laufzeit nutzlos akkumuliert, kann ein Economy-Reviewer **nicht** mit 9,5 bewerten — egal wie poliert die Material-Loops sind. Die Mini-Senken (run5) sind die richtige Arbeit an der *Nicht*-Gold-Achse, verschieben diesen Deckel aber **bewusst nicht**.

**Was 9,5 konkret bräuchte (= im Wesentlichen die City-Welle):**
1. **Mitwachsende/∞-Gold-Senke** — der entscheidende Hebel: Rarität-/Suffix-Reroll als ∞-Sink (`gold-economy.md` S5), City-Upgrades/Services, die mit dem Income skalieren → Gold late wieder ein Ziel.
2. **Wiederkehrende Slayer-Punkte-Senke** — laufende Käufe/Upgrades statt 5 Einmal-Unlocks → Punkte bleiben sammelnswert.
3. **+ die 8,0-Liste oben** (Tool-Leitern, Mastery-Takt, Boss-g/h, Reed-Senke schärfen).

**Bottom Line:** Run 5 ist ein sauberer, ehrlicher **+0,5** — die Crop-Ökonomie ist zum geschlossenen Kreislauf gereift und Reeds speisen erstmals farmbar die Enchant-Treadmill. Das hebt die Loop-Gesundheit, lässt den Makro-Geld-Deckel aber (gewollt) unangetastet. **Ohne City ist ~8,0 das ehrliche Maximum; 9,5 verlangt zwingend eine mitwachsende Gold-Senke + eine wiederkehrende Slayer-Punkte-Senke — genau das, was die City liefern soll.**
</content>
</invoke>
