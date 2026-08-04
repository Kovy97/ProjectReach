# QA Run 7 — Crafting: Fletching · Runecrafting · Leatherworking

Playtester-Persona: Crafting-Säule (Fletching, Runecrafting, Crafting/Leder).
Methode: READ-ONLY Datenanalyse von `packages/content/src/index.ts` + Wiring-Gegencheck. Guard-Specs real ausgeführt (vitest direkt, Turbo-Cache umgangen): `enchant`/`suffix`/`drop-suffix`/`instance-weapon-effect`/`weapon-type`/`ranged`/`content-integrity` → **49/49 grün** (run6 waren 48; +1 enchant-Test). Combat-Harness aus run6 wurde **nicht** neu gefahren — die einzige Combat-relevante Änderung ist ein reiner Flat-Abzug von 1 bei flame, dessen Wirkung sich analytisch aus den run6-Harness-Zahlen exakt eingrenzen lässt (s.u.); ein Re-Run hätte keinen neuen Erkenntniswert. Hinweis: im Repo liegen bereits fremde Harness-Dateien (`packages/engine/src/_run7harness.test.ts`, `_run7_farm_audit.test.ts`) eines anderen Agenten — read-only nicht angefasst.
Vergleichsbasis: `design/qa/run6-crafting-fletch-rune-leather.md` (Fun-Score 9.3/10).

## Fun-Score: 9.4 / 10
## Δ vs run6: +0.1

Run 7 liefert **beide** zugesagten Fixes datentechnisch korrekt: flame-T3-Flat ist **+4 → +3** (jetzt symmetrisch zu frost/shock), und die ironhide/warhide-rangedDamage-Inversionen sind über **alle 5 Slots** behoben (warhide > ironhide durchgängig). Das räumt run6-[P2]#1 (flame strikt bester Slot, sim-belegt) und die ironhide/warhide-Sorge ab — die direkten Kernfragen sind mit Ja beantwortet. Warum nur +0.1: Der ironhide/warhide-Bump wurde **nicht gegen die Tiers oberhalb warhide validiert** und **überschießt** jetzt in body & boots in dragonhide/shadowhide hinein (L70-warhide schlägt L95-shadowhide im Signatur-Stat rangedDamage) — exakt das run6-Muster „ein Fix, eine neue Delle eine Etage höher", diesmal größer. Und: die flame-**Flat**-Asymmetrie ist weg, aber flame bleibt der beste Offensiv-any_weapon-Slot, weil sein burn-DoT >> frost-Slow / shock-Magnitude — der Wurzelgrund (schwache frost/shock-Effekte) ist unangetastet. Plus die zähen P3-Carryovers.

---

## Verifikation der Run-7-Neuerungen

### ✅ flame-T3-Flat +4 → +3 (war run6-[P2]) — Flat-Symmetrie hergestellt
`affix_flame.bonusByTier[2]` ist jetzt `{ meleeDamage: 3, rangedDamage: 3, magicDamage: 3 }` (Z. 12333, Kommentar „T3 4→3"). Damit ist der Flat-Anteil **identisch** zu `affix_frost` und `affix_shock` (beide T3 = +3, Z. 12348/12404):

| any_weapon-Rune T3 | Flat (tri) | Effekt T3 |
|---|---|---|
| flame | **3** (war 4) | burn chance 0.25, mag 14, 5 s |
| frost | 3 | frost chance 0.30, mag 1 (Slow), 5 s |
| shock | 3 | shock chance 0.20, mag 0.20, 5 s |

Der „Gratis-Flat-Daumen" auf flame ist **weg**. Die any_weapon-Wahl wird im Flat ehrlich. **Erledigt** — aber s. [P2] zur verbleibenden Effekt-Dominanz.

### ✅ ironhide/warhide-rangedDamage-Inversionen behoben — warhide > ironhide über ALLE 5 Slots
Jeder warhide-Slot (L70-72) trägt jetzt mehr rangedDamage als sein ironhide-Pendant (L60-62):

| Slot | ironhide | warhide | run7-Edit |
|---|---|---|---|
| helm | 1 | **2** | 1→2 ✓ |
| body | 7 | **8** | ironhide 4→7, warhide 4→8 ✓ |
| legs | 2 | **3** | 2→3 ✓ |
| gloves (vambraces) | 2 | **4** | 3→4 ✓ |
| boots | 1 | **2** | 0→2 ✓ |

Die in run6 genannte ironhide-boots>warhide-boots-Inversion ist zu, und der ganze ironhide→warhide-Übergang ist im Signatur-Stat monoton. **Promise erfüllt.** *(Nebenwirkung eine Etage höher → [P2] unten.)*
Doc-Nit: alle fünf Inline-Kommentare sagen „run6-fix", obwohl es die run7-Edits sind — kosmetisch.

### ✅ Guard-Specs regressionsfrei (49/49)
enchant 17 · suffix 12 · drop-suffix 3 · instance-weapon-effect 1 · weapon-type 3 · ranged 9 · content-integrity 4 = **49/49 grün**. Keine Wiring-/Integritäts-Regression durch die Edits.

---

## Findings

### [P0] — keine.

### [P1] — keine.
Kein strikter Downgrade, nichts spielbrechend: dragonhide/shadowhide bleiben trotz [P2]#2 über def/eva/hp klare Gesamt-Upgrades. Aber die Substat-Inversion ist real (s. [P2]#2).

### [P2] ironhide/warhide-Bump überschießt → neue rangedDamage-Inversionen in body & boots
Der Fix hob ironhide_body 4→7 und warhide_body 4→8, validierte aber nicht gegen die **höheren** Hide-Tiers. Volle rangedDamage-Leiter pro Slot (Level aufsteigend):

| Slot | ironhide L60-62 | warhide L70-72 | dragonhide L82 | shadowhide L95 | voidhide L99 | Status |
|---|---|---|---|---|---|---|
| helm | 1 | 2 | 4 | 4 | 6 | monoton ✓ |
| **body** | **7** | **8** | **6** | **5** | 9 | **INVERSION** |
| legs | 2 | 3 | 5 | 4 | 7 | dragon>shadow ([P3]) |
| gloves | 2 | 4 | 4 | 4 | 6 | monoton ✓ |
| **boots** | **1** | **2** | **0** | **0** | 6 | **INVERSION** |

- **Body:** warhide (L70, 8) und ironhide (L62, 7) schlagen dragonhide (L82, 6) **und** shadowhide (L95, 5). Ein Ranged-Build behält im rngDmg-Stat seinen L70-Kürass bis zum L99-voidhide — 25+ Level lang ist das „Upgrade" im Signatur-Stat ein Rückschritt (−2 bzw. −3 rngDmg).
- **Boots:** warhide (L70, 2) und ironhide (L60, 1) schlagen dragonhide (L82, 0) und shadowhide (L95, 0).

Das ist exakt das run6-Muster (Helm-Inversion gefixt, Boots-Delle eingeführt) — nur diesmal eine Etage höher und mit 2-3-Punkt-Lücken statt 1. Run6 stufte seinen Analog als [P3]; ich stufe **hoch auf [P2]**, weil (a) es eine **diesem Run frisch eingehandelte** Inversion ist, (b) im **Signatur-Stat** der Ranged-Linie, (c) über mehr Slots/Level/größere Magnitude. Kein strikter Downgrade (Def/Eva/HP tragen die Höher-Tiers), daher kein [P1].
**Fix:** dragonhide/shadowhide-rngDmg über warhide anheben — z. B. body dragonhide 6→9, shadowhide 5→11 (vor voidhide 9? → dann voidhide_body anpassen); boots dragonhide 0→3, shadowhide 0→4. Generell: rngDmg-Leiter über ALLE Hide-Tiers in einem Zug monoton ziehen, nicht slot-/tier-lokal patchen.

### [P2] flame-Flat-Asymmetrie behoben, aber flame bleibt bester Offensiv-any_weapon-Slot (Effekt-Dominanz)
Der +4→+3-Edit beseitigt den Flat-Vorteil, **nicht** die Dominanz. Mit jetzt **gleichem** Flat entscheidet der Effekt — und da gewinnt flame: burn (mag 14, 0.25) ist purer Zusatzschaden, der Kills beschleunigt; frost ist Slow (defensiv, beschleunigt Kills nicht — run6-Harness: gegen Mobs ±1 %), shock-mag 0.20 bewegt das Kill-Tempo kaum. Run6-Harness on-level idol_warden: flame +16.5 % (mit +4 Flat) vs. frost +11.8 % vs. shock +13.4 %. Der jetzt entfernte +1 Flat war analytisch nur ~1-1.5 % dieses Vorsprungs wert — flame führt also weiter ~+3 % über shock und ~+4 % über frost auf Boss-HP. **Antwort auf die Kernfrage „flame-Asymmetrie weg?":** Flat-Asymmetrie ja, Offensiv-Dominanz nein. Der Wurzelgrund ist nicht flames Flat, sondern dass frost/shock-Effekte als Kill-Tempo-Runen unterliefern.
**Fix (combat-dev):** frost/shock-Effekte aufwerten, damit sie offensiv mit burn konkurrieren (z. B. shock-mag rauf, frost-Slow auch offensiv via Angriffs-/Cast-Tempo-Reduktion am Gegner), ODER flame-burn dämpfen. Erst dann differenziert die any_weapon-Wahl wirklich über Charakter statt „flame ist immer ≥".

### [P2] Carryover (run6): Runen außerhalb Boss-HP-Ziele quasi wirkungslos
Unverändert (combat-dev-Thema, kein Content-Edit in run7). Per run6-Harness liegt **jede** Rune gegen Normal-Mobs bei ±1 % Kill-Tempo (One-Shot-/Intervall-gedeckelt); Runen „schalten sich erst" gegen Boss-HP ein. Direkt relevant für „macht Runecrafting Spaß?": der gecraftete Belohnungsbogen fühlt sich im Alltag leer an.
**Fix-Richtung:** Runen-Effekte als %-vom-Treffer skalieren ODER bewusst als „Boss-Tech" kommunizieren.

### [P3] Pre-existing rngDmg-Inversion dragonhide > shadowhide (legs & body)
Unabhängig von run7: dragonhide_legs (L82, 5) > shadowhide_legs (L95, 4); ebenso im body-Block (dragon 6 > shadow 5). shadowhide ist das höhere Tier, trägt aber weniger rngDmg. Sauber gleich mit [P2]#2 in einem monotonen Re-Tiering der ganzen Hide-Linie mitlösen.

### [P3] Carryover: Munitions-Flatspot steel_arrow = blacksteel_arrow (ammoDamage 5)
Unverändert (Z. 430/431): steel_arrow und das höhere blacksteel_arrow haben beide ammoDamage **5** — toter Upgrade-Schritt. Run6-Fix-Vorschlag (blacksteel→6) nicht umgesetzt.

### [P3] Carryover (5. Run): `craft_scaled_body` levelRequired 14
Unverändert (Z. 6524): Body @ L14 schnitzbar, Anlegen braucht leatherworking 28. Zähe Schönheits-Altlast seit run3.
**Fix:** auf ~L26-28 anheben.

### [P3] Carryover: `enchant_*`-Magiewaffen-Crafts-Naming
`enchant_dim_focus`/`enchant_frost_scepter`/… (Z. 7090 ff.) heißen weiter „Enchant", obwohl „Verzauberung" exklusiv das Runen-Apply meint. Kosmetisch/irreführend (seit run4).
**Fix:** auf „Craft/Forge X" umbenennen.

---

## „Was fehlt für 9,5?"
1. **rngDmg-Leiter der ganzen Hide-Linie monoton ziehen** ([P2]#2): die diesem Run eingehandelte body/boots-Überschuss-Inversion schließen — dragonhide/shadowhide über warhide heben. Der entscheidende Schritt; ohne ihn hat run7 (wie run6) eine Inversion gefixt und eine größere höher eingeführt. **Diesmal Leiter komplett prüfen, nicht slot-lokal.**
2. **frost/shock-Effekte offensiv konkurrenzfähig machen** ([P2]): der flame-Flat-Fix war nötig, reicht aber nicht — solange burn das einzige Kill-Tempo-Effekt ist, bleibt flame faktisch bester any_weapon-Slot. Combat-dev.
3. **Runen im Normal-Content spürbar** ([P2]-Carryover): %-Skalierung oder klare Boss-Tech-Kommunikation.
4. **P3-Carryovers endlich abräumen**: blacksteel_arrow ammoDmg 5→6, scaled_body L14→~26, `enchant_*`→`craft/forge`-Rename, dragonhide/shadowhide-legs-Inversion. Mehrere seit 3-5 Runs offen.

## Fazit
Run 7 setzt **beide** Zusagen datensauber um: flame-T3-Flat ist symmetrisch (+3), und warhide > ironhide gilt über alle fünf Slots — die wörtlichen Kernfragen sind mit Ja beantwortet, Guard-Specs 49/49 grün. Der Wermutstropfen ist doppelt: (1) der ironhide/warhide-Bump wurde nur lokal geprüft und **überschießt** jetzt in dragonhide/shadowhide (L70-warhide schlägt L95-shadowhide im rngDmg von body & boots) — dieselbe „Fix-erzeugt-Delle"-Falle wie run6, eine Etage höher und größer; und (2) die flame-Korrektur behebt die **Flat**-Asymmetrie, aber nicht die **Effekt**-Dominanz — flame bleibt der beste Offensiv-Slot, weil frost/shock-Effekte als Kill-Tempo unterliefern. Solide, korrekt umgesetzte Edits mit einer selbst eingehandelten, größeren rngDmg-Delle: **9.4/10 (Δ +0.1)**. Ohne die Überschuss-Inversion läge es bei ~9.5-9.6.
