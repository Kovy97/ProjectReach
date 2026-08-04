# TRIAGE Runde 2 — Armor-Iteration-2 Combat-Tester (It1→It2-Vergleich)
Gate-C: TRIM (Parität mid/high ±8%, nackter 2H=Suizid ✅, Food alle Stile ✅, 1H+Schild≈2H ✅).
Bekannter offener Trim: R10-Frühband-Leiterlücke (content, wird nach Runde 2 geschlossen).

## Tester-Ergebnisse
- **C2-Melee-L60:** ✅ SHIP. It1-P2 (nackter 2H tankt 50%) FIXED (EHP 138→69, jetzt 18-216 Tode/h nackt).
  It1-P3 (Food trivial) FIXED (armored NOFOOD 22-43 T/h on-tier vs It1 ~1/h). 1H+Schild≈2H: Pro-Treffer-Lücke
  ~2%→0.05%, Block-Spike-Schutz kippt Defensiv-Vorteil korrekt zu 1H vs harte Schläger. Platte-Mid-Übertunung
  an der Quelle korrigiert (5pc-mit 50→41.6%). KALIBRIER-NOTIZEN: (a) MELEE_LIFESTEAL 0.08→0.06 an L60 inert
  (CAP_ABS 1.2 bindet eh) — Food-Druck kommt real aus Ward-INT-Leak-Weg + Platte-Trim; nofood evtl. etwas
  hoch geschwungen (balance-designer). (b) P4 content-nit: runite_towershield dominiert kiteshield weiter
  (con 9 vs 8, kein Tempo-Malus — content-dev, ganze Kite/Tower-Leiter).
- **C2-Melee-L10:** ✅ SHIP. It1-Frühband-Befunde geschlossen: nackter 2H = EHP 18 (armorRating 0, 100% Tod 11-26s), Food on-level nötig (2.25-2.38 Tode/600s vs It1 ~0), 1H+Schild 86.7% von 2H (It1 82.5%, echter Sidegrade). Nuance: L10-Food-Druck kommt aus Ward-Leak-Weg + Platte-Mit-Trim, NICHT Lifesteal-Cut (der bindet erst high-band). NEUE BALANCE-NOTIZ (P3, mit L60 konsistent): Block stochastisch → unblockte Treffer (0.674) spitzer als 2H-Flat (0.532); an Über-Level-Mobs 1H+Schild niedrigere minHP als 2H (Feel gegen Spec-„Block glättet Spikes"). Optional: etwas Schild-Budget von Block zurück auf Flat-AR (balance-designer, kein Blocker).
- **C2-Melee-L30:** fix-then-ship. It1-P2 (nackter 2H) FIXED (mit 34%→0%, TTD 27-46s→9-20s). Food strikter (Lifesteal 0.06 killt „foodless-forever": stormcaller ∞→136s). 1H+Schild SAFETY geflippt (übersteht 2H no-food auf 2/3 Mobs — Defensiv-Identität real). ABER **2H behält +17-20% Kills/h (wie It1 +22%) — 2H-Waffen-DPS wurde NICHT getrimmt (Spec §3/§13 verschiebt es bewusst in die WAFFEN-SPEC). = balance-designer-Ticket, KEIN Armor-Bug.** P4: mit Food erreicht 1H+Schild niedrigere minHP (Block=Varianz + langsamere Kills=mehr DoT).
- **C2-Ranged-L90:** ✅ SHIP. It1-P3a (wraithhide/starweave NICHT in content.sets) FIXED → Leder-Parität −3.5%→≈paritätisch (Spanne 15.8%→~4pp). It1-P3b (Ward-INT-Leak) FIXED (maxWard 14→0). Dodge-Varianz NIEDRIGER (Leder-Floor + Set-CON hebt One-Shot-Cap über void_titan-enrage). 4 Bosse 0-Tode, sicherer als It1. Optional: wraithhide_set con 8→10 für exaktes +2% Paper-Target (nicht-blockend).
### RECURRING THEME (Melee): 2H-Throughput-Vorteil = WAFFEN-SPEC-Ticket
Armor-Achse (Suizid/Food/Safety) über alle Melee-Bänder gefixt; 2H behält Kills/h-Vorteil (Waffen-DPS
ungetrimmt, bewusst deferred). → Chef-Entscheid für künftige Waffen-Spec: 2H-DPS-Prämie +22→+12% (Spec §3/§13).
- **C2-Ranged-L30:** fix-then-ship. It1-KERNBEFUND (Leder „+18% invertiert") BEHOBEN: dodge 59.2→53.5% (diminishing), maxWard 6→0, Leder-Floor wirkt → Überlebens-Ratio Leder/Platte 0.29-0.77×→0.59-0.98×. Leder `ranged`-gegatet ✅. unarmored=Suizid ✅. **⚠️ P2 NEU: Parität VERSCHOBEN — Stoff/Magie neuer Ausreißer-Tank L30: maxWard 103, no-food ~900s vs non-DoT (minHp 96% — WARD_KILL_REFILL_PCT 0.20 erzeugt IMMER NOCH keinen Food-Druck, Refill ≈ Verbrauch), Top-Durchsatz. GATE-#5 (Food ALLE Stile) für Magie L30 NICHT erfüllt.** → Cross-Check Mage-Tester; evtl. stärkerer Lever nötig (Refill <20% ODER kein Kill-Refill). P3: Ember-Stoff dual-gegatet (magic 30 + runecrafting 32 — Gating-Asymmetrie #2 für Stoff offen, mehrfach geflaggt). P4: Ranged nicht mehr Durchsatz-Führer (Glass-Cannon-Identität verwässert).
- **C2-Ranged-L60:** ✅ SHIP. KRITISCHE KOPPLUNG verifiziert: WARD_CORE_PER_INT→0 (maxWard 10→0) + Leder-evasionRating-Bump (Σ67→85, dodge 65%) GLEICHZEITIG appliziert → Ranged EHP +3%→+0.1% (on-parity; ohne Bump wäre Ranged auf −6% gerutscht). Stoff −20%→−8.9% (im Band). **Food ALLE Stile nötig (Fixliste #6 greift): foodless-Tode/30min Ranged 11.4/1H+Schild 7.9[It1:0!]/2H 10.1[It1:0]/Stoff 1.3.** unarmored=Suizid härter. P4 content (nicht-blockend): ironhide-con leicht unter Guardrail (+0.1% statt +5%, optional +1-2 con); kein on-band L60-Stoff (Lücke L58→72). Hinweis: Stoff-Food L60 nur 1.3 Tode (marginal) — L30-Mage-Overhang bleibt der Prüfstein.
- **C2-Ranged-L10:** fix-then-ship. Beide It1-Ranged-Blocker gelöst: Dodge-Varianz gedämpft (worst-case TTD 12→26.2s, Floor hebt min-HP-Dip 24.4→38.4%), Leder `ranged`-gegatet ✅ + gelootete leather_helm/body mit evasionRating. Bleibt NUR der bekannte R10-Trim, PRÄZISE BEZIFFERT: cured-Set Σevasion 26.4→32.6 (dodge 37→42%; Werte cap 6.5/body 9.8/legs 7.2/gloves 4.6/boots 4.6). R10-Spanne 48% (Platte-maxHp über 45.7 vs 42 [iron-con weiter runter], Stoff-maxWard unter 24.3 vs 45). = der R10-Content-Fix.
### R10-FIX PRÄZISIERT (content-dev, eine Welle):
1. cured-Leder evasionRating → §11.4 (cap 6.5/body 9.8/legs 7.2/gloves 4.6/boots 4.6) → dodge 42%.
2. iron-Platte con weiter runter (maxHp 45.7→~42, §1.1).
3. apprentice-Stoff wardCapacity rauf → maxWard 24.3→45 (§11.5).
- **C2-Mage-L10:** ⛔ BLOCK (fix-then-ship). It1-P2(CON) ✅, P3(INT-Kern) ✅ (naked maxWard 0, 13 Tode/300s), P4(L11-14) ✅. maxWard 8→24.3 (Warding-Loop funktioniert, XP via Absorb, Regen ×1.5 defensiv korrekt). **⛔ F1 BLOCKER: Magier bei L10 EINZIGER food-freier Stil (0 Tode/0 Food/h vs Platte 12·10, 2H 15·30, Leder 32·37). ROOT: Cast-Recharge (~1.3/s Ward aus Mana) trägt den Sustain — der WARD_KILL_REFILL 100→20%-Trim berührt ihn NICHT; bei niedriger L10-DPS-in füllt Recharge schneller als Mob leert. §6.1-Erosion beißt bei L10 nicht. VERSCHÄRFEND: Pool→45 (R10-Parität-Fix) macht es food-FREIER → Parität-Fix und Food-Druck laufen GEGENEINANDER. §13-Kill-Refill-0.10 hilft NICHT (Recharge, nicht Kill-Refill, trägt Sustain).** Owner balance-designer+combat-dev: Cast-Recharge/Warding-Regen relativ zur DPS-in deckeln ODER WARD_PER_MANA senken. ⛔ F2: R10-Parität-Spanne 39.5% (bekannter Content-Trim, F2=R10-Fix oben). F3 Methodik: Papier-EHP unterschätzt Magie (ignoriert Recharge-Sustain) → Re-Gate über simulateCombat-Food-Bedarf, nicht nur statische EHP.
### ⛔ F1 = HAUPT-RESTPROBLEM It2: Magier Low/Mid-Band food-frei (Cast-Recharge-Sustain)
Ward-Refill-20%-Fix adressierte KILL-Refill, aber CAST-Recharge (Mana→Ward, WARD_PER_MANA) ist die eigentliche
Sustain-Engine — bei niedriger DPS-in unerschöpflich. Bestätigt von C2-Ranged-L30 (Mage ~900s no-food). Fix:
WARD_PER_MANA senken ODER Recharge/DPS-in-Deckel (balance-designer-Spec → combat-dev). Band-Gradient via
Mage-L30/L60/L90 abwarten. NICHT-blockend für EA-Mechanik, aber Gate-#5 (Food alle Stile) verletzt.
- **C2-Mage-L90:** ✅ SHIP. It1-P3 (per-Kill-Voll-Reset → Stoff HP-schadensfrei) BEHOBEN: last_idol foodless 7 Tode (Ward erodiert über Session), 3 leichtere Bosse ward-gepuffert (§6.1-Farm-Buffer intakt). maxWard 414→476 (gear-only). Sustain Cast 1.46 + Warding 1.80 ≈ 3.26/s ≪ Boss-DPS 7.5/s → kein unendlicher Sustain, kein Exploit. Parität CL90-Methodik −7.7% (im Band); realistischer CL68-Caster −10.3% (knapp drüber, weil andere Stile via block 0.85 + wraithhide_set EHP GEWANNEN). P4: „härtere Food" → WARD_KILL_REFILL 0.20→0.10.
### BAND-GRADIENT MAGIER-FOOD (F1) KLAR:
L10 food-FREI (0 Tode) → L30 ~food-frei (~900s) → L60 marginal (1.3 T/30min) → L90 food-nötig (7 T/last_idol).
= Cast-Recharge (flacher Sustain) übersteuert bei niedriger DPS-in, verliert gegen Boss-DPS. F1-Fix zielt
NUR auf Low/Mid-Band: WARD_PER_MANA senken (High-Band-Sustain ist eh ≪ DPS-in, unbeschadet). balance-designer.
- **C2-Mage-L60:** ✅ ship. Parität L60 KORRIGIERT (Platte +14%→+6%, Stoff −18%→−9%, alle 4 Stile ±10%). Warding-Defensiv-Stance wirkt (Regen 1.20→1.80/s ×1.5, TTK +14%) → It1-P4a „Defensiv-Stance nutzlos" GELÖST. unarmored=Suizid schärfer (naked TTK 14s, maxWard 0). Food: on-tier marginal (5-6 T/h no-food aber Pool erodiert nicht; +2-Über-Level ist wo 20%-Refill beißt: 38-63 Food/h). **P3 (balance/combat): Magie-Defensiv-Stance hat KEINE Offense-Kosten (acc/dmg/speed alle 1) → Dauer-Defensiv = free survival + ×1.5 Ward-Regen ohne Nachteil.** P2: Stoff-Ladder-Gap magic 55→70 unbesetzt (−4% Rest). **⚠️ Gate-C-#2 ERNEUT (jetzt 3× geflaggt): reiner Kampf-Magier kann KEINEN Stoff über apprentice anlegen (arcane = magic 55/rc 58, rc bindet) — gleiche Asymmetrie wie Leder→ranged, NICHT für Stoff appliziert. → Stoff auf `magic` umgaten (CHEF-Entscheid).**
- **C2-Mage-L30:** fix-then-ship. It1-Defekte behoben (INT-Leak zu, CON-Budget, Ladder-Gap → mit ember-Tier Parität −25%→+2%). **⛔ P1 STRUKTURELLER BLOCKER (4× bestätigt): reiner Kampf-Magier kann On-Tier-Stoff NICHT anlegen — jede Robe > apprentice dual-gegatet auf runecrafting (frost rc20, ember rc32…voidweave rc99). Gleiche Asymmetrie wie Leder (§8 für Leder gefixt, für Stoff NICHT). Der anlegbare Magier (apprentice, Ward 24) ist GLAS: 3 Tode/30min sogar non-DoT, EHP 74 (−53%). Der Gate invertiert Parität UND Food in der Praxis (Parität misst ember, das der Magier nicht tragen kann).** F1-Food: 20%-Refill stellt Food-Druck non-DoT NICHT her (ash_rat 141 Kills/0 HP-Schaden/0 Food; Ward-Regen ~4.1/s > per-Fight-Verlust; selbst 0.10-Variante erodiert on-level-non-DoT nicht). P3: Leder-CON-Guardrail unter-appliziert (leather-body maxHp == plate maxHp).
### ⛔ ZWEI VERKNÜPFTE KERN-FIXES (Runde-2-Pass):
1. **Stoff-Gating: runecrafting-Co-Req raus, Stoff auf `magic` umgaten** (Spiegel zu Leder→ranged, 4 Tester).
   OHNE das ist der Magier-Playstyle kaputt. MIT das → Magier kriegt Ward-Pool → wird food-frei → braucht F2.
2. **F1 Food: WARD_PER_MANA (Cast-Recharge) senken** — die eigentliche Sustain-Engine; Kill-Refill-Trim
   reicht nicht. Gekoppelt mit #1 (erst wenn Magier den Pool trägt, greift der Food-Druck).
- **C2-Melee-L90:** ✅ SHIP. **It1-Food-Problem GELÖST: Food jetzt auf ALLEN 4 Bossen nötig** (foodless 12-55 Tode/6h; It1 nur last_idol), mit Food 0 Tode überall. 1H+Schild≈2H (EHP 1101 vs 1015, −7.8%; Kills ±4%). Ward-Leak weg (maxWard 0). P2 balance-watch: 2H-defensive 76.2% mit; §10-Trinity-Buff (armorRating bis 150) könnte 2H-def →79.7%≈Cap pushen (Buff-Range zu großzügig für 2H) — vor Consumable-Buffs (#219) tightenen. P3: MELEE_LIFESTEAL 0.08→0.06 inert@L90 (abs-cap 1.2 bindet) — Food-Treiber ist Ward-Leak-Fix; Food-Marge dünn (maxWard=0), künftige Melee-Sustain-Quelle könnte foodless zurückkippen.

## ═══ GESAMTBILANZ RUNDE 2 (12/12, It1→It2) ═══
**RIESENERFOLG auf der Armor-Achse — alle 4 It1-Kernprobleme über alle Bänder BEHOBEN:**
1. nackter 2H=Suizid ✅ (alle Bänder, EHP →unarmored-Niveau)
2. Food ALLE Stile nötig ✅ (Melee alle Bänder, Ranged Referenz, Magier @high-band; @low/mid-band offen=F1)
3. 1H+Schild≈2H ✅ (EHP-fair; Rest-2H-Throughput = Waffen-Spec)
4. Frühband-Parität ✅ dramatisch (R10 121%→~40%, mid/high ±8%)
PLUS: Leder-Inversion behoben, Ward-INT-Leak weg, wraithhide/starweave-Sets registriert, Warding-Skill+
Defensiv-Stance wirken, ×10-Invarianz, alle Mechanik bugfrei (0 P1, kein Exploit).

**ZWEI VERKNÜPFTE REST-THEMEN (Magier, 4× konvergiert) + CONTENT-POLISH + DECISIONS:**
- ⛔ Stoff-Runecrafting-Gating: reiner Magier kann On-Tier-Stoff nicht anlegen (Spiegel Leder→ranged). [CHEF]
- ⛔ F1: Magier @low/mid-band food-frei (Cast-Recharge-Sustain, WARD_PER_MANA); gekoppelt mit Gating. [CHEF: Food-Härte]
- R10-Content (decoupled, klar): Leder-evasion→32.6, Platte-con→17.
- Decisions/Watches: 2H-Throughput-Trim (Waffen-Spec), Magie-Defensiv-Stance ohne Offense-Kosten, §10-Buff-armorRating-Range (2H→Cap), Food-Philosophie-Härte.
