# Rüstungs-Trinität — Bau & Test (Task #218, 6h-Loop, Start 2026-07-03)

Spec: `design/armor-trinity-spec.md` (fertig, inkl. Block). Plan: `design/armor-system-plan.md`.

## PHASE (immer aktuell halten für den nächsten Loop-Tick)
**AKTUELL: A2 (combat) + A3 (content) + A4 (ui) parallel.** A1 ✅ grün (SAVE 50, Defence raus, Ward-Helfer bereit).

Ablauf:
- [ ] A1 logic-dev: shared-Typen (ItemDef.armorRating/evasionRating/wardCapacity/blockChance,
      MonsterDef.armor/defenseType, DerivedStats.maxWard+mitigation/dodge/block, CharacterState.ward)
      + SAVE_VERSION 49→50 + Migration + computeStats (defenceEff RAUS, neue Formeln). ✅ (86/590 engine, 101 persistence)
- [~] A2 combat-dev: combat.ts (Ward absorbiert vor HP, Recharge bei Mana-Verbrauch, Dodge-Roll,
      Block-Roll −75 %, One-Shot-Floor 50 %, applyManaShield ersetzt). NACH A1.
- [~] A3 content-dev (seriell): ~215 Rüstungsteile Klassen-Schicht (Tabellen §5 der Spec) +
      Gegner-Armor-Floor + defenseType-Tags + Gegner-Schaden-Rescale + Leder/Stoff-Ladder-Lücken.
- [x] A4 ui-dev ✅ (Ward-Leiste Kampf+Character, Recharge-Puls; bei maxWard>0) (parallel ab A1-Typen): 3. Ward-Leiste (Kampf-UI + Character-UI, Recharge-Feedback).
- [x] B Gate ✅ TRIM (R90 exakt ±10%, 0 echte Walls, Ward/Dodge/Block/Suizid/Food ✅; offen: Leder/Stoff low-band unter-spec, WARD_CORE_PER_INT→0, Harness ✅ gefixt). Phase C freigegeben. — [alt]: EHP-Parität 3 Stile ±10 %, unarmored L10-15=Suizid, Food-nötig,
      0 falsche Walls (sim.test-Harness ggf. für Armor/Ward anpassen).
- [~] C 12 Combat-Tester (Phase C, dispatched) (4 Melee/4 Range/4 Mage) → Triage → Fixes → nächste Welle → bis 6h/stabil.

## Chef-offene-Punkte (Spec §11 — Defaults nehmen, außer Chef entscheidet)
Dodge-Cap 75 % vs 65 % · Ward-Recharge auch bei Weak-Melee · 2H-Offense-Prämie exakt beziffern.


## GATE-FLAGS (fürs Kontrolleur-Gate B, nicht vergessen)
- **Ward-Sockel aus INT (A4-Fund):** `WARD_CORE_PER_INT=1.0` → JEDER Char (auch Melee/Ranged) hat
  int≥3 ⇒ maxWard≥3 ⇒ zeigt eine kleine Ward-Leiste. Chef wollte Ward als MAGIER-Mechanik (bei
  Nicht-Stoff verborgen). Gate prüfen: WARD_CORE_PER_INT auf 0 (Ward NUR aus wardCapacity-Stoffgear)?
  → dann verschwindet die Leiste bei Melee/Ranged automatisch (UI gatet schon auf maxWard>0).

## ARMOR-ITERATION 2 (Chef-Refinements 2026-07-03, NACH 1. Gate/Tester)
1. **Evasion:** LINEAR (evasionRating/100) → diminishing-Formel wie Armor (Chef: „genau das gleiche").
2. **Warding-Skill = ersetzt magic_def** (nicht neuer 7. Skill); **magic_off → „Magic"**.
   - shared: COMBAT_SKILL_IDS/BOOSTABLE/SkillId (magic_off→magic, magic_def→warding) + SAVE-Migration.
   - content: Skill-Defs (131× magic_off, 11× magic_def), Namen/Desc/Icon (skills/warding.png liegt).
   - engine: computeStats (magic-Damage← „magic"; warding→Ward-Regen-%-Formel, treibt rechargeWard/Zeit).
   - UI: Combat-Sub-Skills (Warding-Icon).
   → balance-designer Spec-Update für Warding-Regen-Formel + Evasion-Kurve, dann logic/combat/content/ui.


## Nach Gate-B (2026-07-03 ~20:30)
- [x] Lever 3 (Harness): sim.ts Bronze-Fixture → echte Bronze-Platte+CL12; 0 echte Walls bleibt.
- [x] Tooltip zeigt Armor/Evasion/Ward/Block + Item-Bild 2× (Chef-Fund behoben).
- [x] Consumables: 39 Buffs Flat-Kampf→Tempo/Krit/HP. FLAG: Buff-Typ (EquipBonus) kann KEINE Attribute/Trinity-Stats → Typ-Erweiterung nötig für Chef-Wunsch „Buffs stärken Attribute/Evasion/Block" (logic-dev, Iteration 2). Guard für Consumable-Flats fehlt (logic-dev).
- [ ] Lever 1 (content): Leder/Stoff low/mid auf Spec §4.1 (band-10 Leder dodge 42%, Stoff maxWard 31; Zwischen-Tiers). NACH Tester-Welle mit Iteration 2 bündeln.
- [ ] Lever 2 (logic+content): WARD_CORE_PER_INT→0 + INT in wardCapacity einfalten.

## Phase-C-Tester-Ergebnisse (eintrudelnd)
- **C-Melee-L90:** ✅ SHIP. Rüstung bedeutsam (1H+Schild 57%Mit+43%Block EHP1004; 2H 72%Mit EHP948, −5.6% fair). 4 Bosse 0-Tode mit Food. **P2 balance:** Food im Melee-Endgame ~vestigial (Lifesteal deckt DPS-in bei hoher Mitigation; 3/4 Bosse foodless 0-Tod) — Spec-Constraint-2 rechnet Lifesteal nicht ein → Chef-Entscheid: Melee-Sustain-Identität akzeptieren ODER Lifesteal-Deckel. P3: WARD_CORE_PER_INT=1 gibt Melee maxWard 15 (bekannt→0). P4: 2H-defensive 74% näher am 80%-Cap.
- **C-Melee-L60:** FIX-THEN-SHIP. Rüstung bedeutsam (1H EHP 5.24×), 1H+Schild vs 2H fair (2H 89.7%). **P2 BUG (combat-dev): twoHandMeleeArmorBonus (character.ts:316-318) UNBEDINGT vergeben — nackter 2H-Held tankt 50%, stirbt nie → „unarmored=Suizid" bricht für 2H. Fix: 2H-Bonus an getragene Platte koppeln.** P3: Food-Druck L60 on-tier zu großzügig (Sustain 2.3× DPS-in). P4: runite_towershield dominiert kiteshield strikt (kein Kite/Tower-Tradeoff — content). P3 Ward-INT-Leak (maxWard 10 Melee, bekannt→0).
- **C-Melee-L10:** FIX-THEN-SHIP. Rüstung dramatisch bedeutsam (4.8× EHP), unarmored=Tod. **P2 balance: 2H am Band-10 zu glasig (82.5% statt 90% EHP — Schild-con-Verlust am kleinen HP-Pool, Waffen-AR deckt's nicht) + Offense verpufft an Low-HP-Mobs → 1H+Schild dominiert früh.** P3: Food on-level vestigial (Constraint-2 hält nicht — Spiegel zu L90-Lifesteal). P4: unarmored-2H trägt 18% Mitigation (=L60-P2). Ward-INT-Leak maxWard 3.
### KONVERGENTE MELEE-THEMEN (3/4 Bänder)
1. **2H-armorRating bedingungslos (ohne Platte)** → unarmored-2H tankt (L60-P2, L10-P4). BUG combat-dev: an getragene Platte koppeln.
2. **2H-EHP low-band zu niedrig** (L10 82.5%), L90 fair — Band-10/30-2H-AR anheben.
3. **Food on-tier vestigial** (L10 Low-Mob-Kills, L90 Lifesteal) — balance: Food-Heal runter ODER Mob-Damage/Enrage rauf.
4. **Ward-INT-Leak** alle Bänder (→ WARD_CORE_PER_INT 0).
- **C-Ranged-L30:** FIX-THEN-SHIP. **P2 KERNBEFUND: Leders „+18% Papier-EHP" INVERTIERT im echten Kampf — Leder ist der SQUISHIGSTE Stil** (Dodge=reine Vermeidung, die 41% landenden Treffer treffen VOLL auf 71 HP; leather stirbt 1.3-3.5× schneller als Platte trotz höherer Papier-EHP). Fix: diminishing-Evasion ALLEIN reicht nicht → +DODGE_CAP 0.65 + kleiner Leder-Schadens-Floor/per-Hit-Reduktion (NICHT die +18% trimmen — bringt keine Haltbarkeit). Food wirkt bei Ranged (kein Self-Sustain). P3: Ward-INT-Leak maxWard 6. **P4→Mage-Thema: Magier self-sustained 900s+ OHNE Food (Ward-Recharge 1.3/s > Burn 0.3/s) — Food für Magier trivial.**
### KONVERGENTES STIL-THEMA (Food-Sustain-Asymmetrie)
Food ist TRIVIAL für Melee (Lifesteal) UND Magier (Ward-Recharge), aber NÖTIG für Ranged (kein Sustain).
→ Ranged ist der Außenseiter: muss Food nutzen UND ist via Dodge-Varianz am squishigsten. Iteration-2:
Ranged/Leder braucht Kompensation (Schadens-Floor gegen Dodge-Varianz), Food-Constraint stil-abhängig
neu denken (balance-designer).
- **C-Mage-L30:** SHIP-WITH-TRIMS. **P2: kill-Ward-Refill (combat.ts:785) macht Food trivial auf Nicht-DoT** (ash_rat 137 Kills, 0 Tode, 0 HP-Schaden, HP 100% — Ward füllt bei jedem Kill voll). Nur DoT/Burn übt Druck aus. Food-Säule für Magier auf Nicht-DoT defeated → balance: Ward nicht voll auf Respawn refillen (Rest tragen + cast-recharge). P3: Cloth-Ladder-Gap −25% EHP L30 (keine req23-30-Robe = Lever 1). P3 content-gap: kein Monster L31-33.
- **C-Ranged-L60:** ✅ SHIP. Ranged +3% vs 1H+Schild (on-spec ✓). Dodge-Varianz L60 NIEDRIG (One-Shot-Cap 51 >> Max-Hit 31/49 → keine Burst-Kills; L30-Squishiness ist LOW-BAND-Problem). **⚠️ KRITISCHE KOPPLUNG: WARD_CORE_PER_INT-Leak hebt Ranged EHP −6%→+3%; wenn Lever 2 (Leak→0) landet, fällt Ranged UNTER +5%-Ziel AUSSER Lever 1 (Leder evasionRating rauf) landet GLEICHZEITIG. Lever 1+2 für Ranged GEKOPPELT — zusammen anwenden!** P4: stale shortbow-Kommentar.
- **C-Ranged-L10:** FIX-THEN-SHIP. **P2 CHEF-ENTSCHEID: Leder ist `leatherworking`-gegatet, NICHT `ranged`** — reiner Archer levelt `ranged`, kann Dodge-Schicht nicht anlegen ohne Crafting-Grind (Melee/Magier gaten über Kampf-Skills defence/magic_off). Spec §0 will Leder `ranged`-gegatet. → Chef: Leder auf `ranged` umgaten ODER Crafting-Gate bestätigen + leatherworking früh trivial erreichbar. P2: Leder band-10 dodge 34% statt 42% (Lever 1). P3: gelootete Leder (leather_helm/body) haben 0 evasionRating = unarmored auf Avoidance-Achse.
- **C-Mage-L10:** FIX-THEN-SHIP, **Parität-BLOCK. P1 content: Apprentice-Stoff wardCapacity ~90% unter Spec (Σ1.91 vs 19), maxWard 8 statt 31 (−74%); + Ladder-Gap magic_off 1→22.** Stoff schlechtester Stil L10 (EHP 35.6 vs Platte 86.2, −59%; auch CON-Budget zu niedrig maxHp 27.7 vs 49.7). Ward-Mechanik korrekt, Pool zu klein. P3 content-gap: Roster-Lücke L11-14.
- **C-Ranged-L90:** ✅ SHIP. Ranged-Endgame sauber (dodge 73%, One-Shot-Cap bindet, 4 Bosse 0-Tode mit BiS-Food). Food MANDATORY für Ranged (kein Lifesteal/Mitigation — Constraint hält, anders als Melee!). Parität Leder −3.5% (on-spec). **P3 content: L90-Lückenfüller wraithhide(Leder)/starweave(Stoff) NICHT in content.sets registriert → kein Set-Bonus (aetherium_set gibt +26 maxHp) = Treiber der Leder-Unterparität. Fix: wraithhide_set + starweave_set anlegen (auf +5% getunt).** Guard-Gap: kein Test erzwingt „jede Armor-Familie hat ein Set". P3 Ward-INT-Leak maxWard 14.
- **C-Melee-L30:** fix-then-ship. Alle 4 Constraints PASS (Rüstung 4×, unarmored=Tod, Food nötig, 1H/2H −14% EHP fair). **P2 balance: 2H DOMINIERT 1H+Schild im Normalspiel (+22% Kills bei gleicher Sicherheit) — 2H hat höhere Flat-Mitigation (51.7% vs 42.5%+Block) UND schnellere Kills; Block cuttet nur 18% Ø (24%·0.75) → Sword-and-Board unbelohnt.** Kombiniert mit Leder +18%: die defensive Melee-Linie (1H+Schild) ist die SCHWÄCHSTE der drei → Fix: Block-Wumms rauf ODER 2H-AR runter (balance-designer). P3 spekulativ: cross-class-Layer-Stacking (2H-Melee könnte off-class Leder/Stoff in freien Slots tragen — Guard-Check). P3 Ward-INT-Leak maxWard 3.
- **C-Mage-L90:** ✅ SHIP. Endgame-Parität Stoff −7.4% (im Band), maxWard 414, 4 Bosse 0-Tode sogar ohne Food (One-Shot-Cap→Ward). **P3: per-Kill-Ward-Voll-Reset (combat.ts:785) + Pool → Stoff HP-schadensfrei im Kurz-TTK-Endgame (minHP 100%/0 Food vs Platte 78%/Leder 60%). Food-Constraint gilt nur noch Platte/Leder.** Lever: Reset auf X% statt 100% ODER Ward encounter-übergreifend tragen. Keine Bugs, kein Exploit, Ward-Cap hält. P4: reiner Offensiv-Magier trainiert defence nie → CL~68 (Methodik-Note).
- **C-Mage-L60:** ✅ SHIP. Ward-Loop robust (Mana-Überschuss +5/s, ward avg 92%). Parität −12% nominal, Recharge über-schließt in Feel (Stoff ≳ Platte in Dauerkampf). P2: Platte +14% über Spec-Target L60 (über-tuned) + Stoff −6% (unter-tiered). P3: mana-empty-Valve inert, Food optional. P4: Magic-Defensiv-Stance gibt Stoff 0 Nutzen (defMult×armorRating=0); Ladder-Gap magic_off 58→70 (12 leer).

## ═══ PHASE-C-GESAMTBILANZ (12/12 Tester + Gate-B) ═══
**MECHANIK: 0 Bugs im Kampf-Kern.** Ward/Dodge/Block/Mitigation/One-Shot-Cap alle spec-korrekt verdrahtet.
System ist EA-SHIP-tauglich; die Arbeit ist Balance-Kalibrierung (nicht release-kritisch laut Testern).
Höchster echter Bug: 2H-armorRating bedingungslos (combat-dev, unten).

**ITERATION-2-FIXLISTE (konsolidiert, Owner):**
1. **Low-Band Stoff/Leder unter-spec [content, P1]:** Stoff maxWard 8→31, Leder dodge 34%→42%; Stoff-CON-Budget rauf; Ladder-Gaps (magic_off 22/58→70, Leder-Zwischen-Tiers). Platte L60 +14% über-tuned → leicht runter.
2. **WARD_CORE_PER_INT 1.0→0 [logic, P3]** — Ward nur aus Stoffgear (Chef-Wunsch). ⚠️ GEKOPPELT mit #1 für Ranged (zusammen anwenden, sonst Ranged unter +5%).
3. **1H+Schild = schwächste Melee-Linie [balance/combat, P2]:** 2H dominiert (+22% Kills), Block nur 18% Ø. → Block-Wumms rauf ODER 2H-AR runter.
4. **2H-armorRating bedingungslos [combat, P2 BUG]:** nackter 2H tankt 34-50%, bricht unarmored=Suizid → an getragene Platte koppeln.
5. **Dodge-Varianz Leder low/mid [combat/balance]:** Evasion LINEAR→diminishing + DODGE_CAP 0.65 + kleiner Leder-Schadens-Floor (nur low/mid; high-band via One-Shot-Cap ok).
6. **Food-Sustain-Asymmetrie [balance]:** trivial für Melee (Lifesteal) + Magier (Ward-per-Kill-Reset), MANDATORY für Ranged. → Ward-Reset auf X% statt 100% + Lifesteal-Deckel + stil-abhängige Food-Balance.
7. **L90-Sets wraithhide/starweave nicht in content.sets [content]** + „jede Armor-Familie hat Set"-Guard.
8. **CHEF-ENTSCHEID: Leder `leatherworking`- statt `ranged`-gegatet** — Archer kann Rüstung nicht durchs Kämpfen freischalten. Umgaten auf `ranged`? + gelootete Leder 0 evasionRating.
9. **CHEF-Design: magic_def→Warding (Ward-Regen-Skill), magic_off→Magic** — löst zugleich P4 (Magic-Defensiv-Stance nutzlos → Warding wird die Magie-Defensiv-Fertigkeit). + Buff-Typ-Erweiterung (Attribute/Trinity-Stats). + Consumable-Forbidden-Guard.
10. Content-gaps: Monster L11-14, L31-33.

## CHEF-ERGÄNZUNG (armor ×10)
- **armorRating ×10-Skala** (Chef: Werte zu niedrig, iron_platelegs 1.11→11.1). DEFENSE_MITIGATION_K ×10
  (12.5→125) hält Mitigation-% invariant (reine Anzeige-Skala, Parität-Gate bleibt gültig). Betrifft
  alle Rüstungsteile-armorRating + 2H-Waffen-Bonus + Monster-armor + K. In Iteration-2-Spec eingearbeitet
  (armorRating-Werte direkt in ×10 definiert, nicht doppelt). evasion/ward-Skalierung = Spec-Entscheid.

## CHEF-FOLGEAUFTRAG #219: Consumables + ENCHANTMENTS komplett überarbeiten (nach Armor-It2)
Minor Healing Potion hat gleiche Heilwirkung wie Draught (Kräutersud) — Heilwert-Leiter kaputt.
→ content-dev (NACH dem laufenden It2-Content-Pass, Single-Writer): ALLE Heil-Consumables
(Potions + Draughts/Kräutersude + Food-healAmount) auditieren und zu einer sauberen streng
steigenden Leiter machen (Minor < Lesser < Greater < …; Draughts vs Potions klar differenziert —
z.B. Draughts = Herblore-Craft mit stärkerer/anderer Wirkung als Basis-Potions). Effekte/Beschreibungen
(en+de) an die neuen Werte angleichen. Budget/Progression-konsistent (Tier-gebunden). Guard optional:
Heil-Leiter monoton je Familie.
ERWEITERT (Chef): auch ALLE **Enchantments** (Affixe/Runen + Suffixe) trinität-tauglich machen —
verbotene Flat-Kampfwerte raus, stattdessen Attribute + die 4 Trinity-Stats (Schutz-/Ausweich-/
Ward-/Block-Runen) + weiter erlaubte (crit/attackSpeed/Procs); Power-Budget je Tier konsistent,
jede Enchantment begehrenswert. Ablauf: balance-designer-Spec (Consumable+Enchantment-System unter
Trinität) → content-dev Apply → Guards. Kommt NACH Armor-Iteration-2 (stabile Basis).
ZUSATZ (Chef): auch **Cooked Food** — degenerierte Buff-Anzeigen wie cooked_beef „Attack speed −0s"
(Artefakt der ersten Flat→Tempo-Konvertierung: winzige/Null-attackIntervalMs → „-0s"). Food-Buffs
sinnvoll neu setzen (echte spürbare Werte ODER Buff ganz weg wenn Füller); keine „-0s"/0-Anzeigen.
