# Magier-Material-Paritäts-Audit — Steam-Review-Claim, Kurven, Fix-Spez, Guard-Spez

**Datum:** 2026-07-23 (nach Patch #1 / 0.2.0) · **Autor:** balance-designer · **Status:** SPEC — content-dev wendet an, KEINE Änderungen durch balance-designer.

**Review-Claim (Steam):** „Der Magier ist lächerlich viel schwächer als der Krieger. Die Ressourcen für grundlegende Magier-Ausrüstung stammen von Monstern, denen man erst viel später begegnet, während der Krieger Ausrüstung erhält, die mit seinem Kampffortschritt Schritt hält."

**Urteil: BESTÄTIGT — und quantifiziert.** Das Muster des Waffen-Drop-Audits existiert 1:1 in den Crafting-Material-Ketten. Zusätzlich betroffen: Ranged (Bowstring-Gate). Melee/Platte ist über ALLE 99 Level komplett kampf-frei craftbar; Stoff/Magie hängt im Band L1–L30 an Monstern L50+ bzw. Slayer-Tower Etage 3 (Slayer 40).

---

## 1. Material-Quellen-Kurve: die drei Stile nebeneinander

**Metrik „Kampf-Gate":** minimales Monster-Level, das für die Material-Kette eines craftbaren Items nötig ist (rekursiv über alle Inputs; 0 = ohne Kampf beschaffbar via Sammeln/Shop/Farming). Delta = Gate − Item-Requirement.

### 1.1 Waffen-Kernlinien (craftbar)

| Band (Req) | Melee (smithing) | Gate | Ranged (Bögen) | Gate | Magie Stab | Gate | Magie Wand/Fokus | Gate |
|---|---|---|---|---|---|---|---|---|
| L1 | copper_* (10 Typen) | **0** | copper_shortbow/longbow | **15** (+14) | copper_staff | 0 | copper_wand / copper_focus | **50 (+49)** / 0 |
| L5 | bronze_* | **0** | bronze_* | **15** (+10) | bronze_staff | 0 | bronze_wand | **50 (+45)** |
| L10 | iron_* | **0** | iron_* | **15** (+5) | iron_staff | 0 | iron_wand | **50 (+40)** |
| L20 | steel_* | **0** | steel_* | 15 (−5) | steel_staff | **30 (+10)** | steel_wand / steel_focus | **50 (+30)** |
| L22–25 | — | — | — | — | (frost_scepter L25) | **50 (+25)** | frost_focus L22 | **50 (+28)** |
| L30 | blacksteel_* | **0** | blacksteel_* | 15 | blacksteel_staff | 30 (+0) | blacksteel_wand/focus | **50 (+20)** |
| L40 | mithril_* | **0** | mithril_* | 15 | mithril_staff | 0 | mithril_wand/focus | 0 |
| L50–99 | adamantium→godiron | **0** | dito | 15 | adamantium→godiron | 0/66¹ | dito | 0/66¹ |

¹ ab L70/80 via void_rune/void_essence: nominell L66 (void_stalker), aber **Tower Etage 4 = Slayer 60**; Welt-Alternative erst L155+ (slagpit). Für L80+-Items tolerierbar, für L64–70-Stoff (s.u.) nicht.

**Quellen-Detail der Sprengsätze:**
- `frost_essence` (Schlüssel der gesamten L20–30-Magie-Linie): billigste Quelle `tower_ember_elemental` **L50, Slayer-Tower Etage 3 = Slayer 40**, 40 % ×1–2; sonst `barrow_chanter` **L55** (blackthorn, Quest chronicle_07) 12 %, `skeleton_icemage` L80 20 %. Kein Sammel-/Shop-Weg.
- `frost_rune` = craft_frost_rune@RC10 aus frost_essence (1→3) ⇒ vererbt das L50-Gate bis in die **L1-Wand-Rezepte** (craft_copper_wand verlangt frost_rune ×2).
- `ember_essence` (steel/blacksteel_staff, ember-Set): `goblin_warlock` L30 15 %, `ash_rat` L30 12 %, `mire_wisp` L30 10 % — Band-fair (+10/+0), aber grindig.
- `dim_essence`: Foraging L1 (60 %) — sauber. `storm_essence`: forage_gravemoss@Foraging 42 + goblin_stormcaller L28 — sauber. `aether_essence`: ash_tyrant L45 15 % — für L40+-Items Band-fair.
- Melee-Vergleich: **jede** Waffe/Platte L1–L99 = Erz→Barren→Schmieden, Kampf-Gate 0.
- Ranged-Vergleich: `bowstring` ← `scarred_hide` ← `bull_boss` **L15-Boss** (20 %) — gated die L1/L5-Bögen (+14/+10); danach sauber.

### 1.2 Rüstungs-Trinität (Sets, Body-Referenz; Ward/Armor/Evasion = Set-Summe über 5 Teile)

| Band | Platte (Krieger) | Σarmor | Gate | Leder (Ranged) | Σeva | Gate | Stoff (Magier) | Σward | Gate |
|---|---|---|---|---|---|---|---|---|---|
| L1 | copper-Set (7 Teile) | 44.5 | **0** | leather (L0) | ~25 | 5 | apprentice-Set | 45 | 5 (Kuh) |
| L5–10 | bronze/iron-Set | 50.1 | **0** | cured_leather (L5) | 32.7 | 5 | **— LÜCKE (kein Stoff L2–L21!)** | — | — |
| L20–22 | steel-Set | 56.7 | **0** | hardened (L20) | 45 | 15 | frost-Set (L22) | 75 | **50 / Slayer 40 (+28)** |
| L28–30 | blacksteel-Set | 63.8 | **0** | scaled (L28) | 51.8 | 0² | ember-Set (L30) | 103 | 30, aber 2 Teile **50 (+20)** |
| L40 | mithril-Set | 71.6 | **0** | duskhide (L40) | — | 0 | aether-Set | 138 | 45 (+5) ✓ |
| L55–64 | adamantium/runite | — | **0** | studded (L50) | — | 0 | arcane (L55) / duskweave (L64) | 216 / — | 0 ✓ / 66-Tower-F4³ |
| L70–92 | bloodiron→aetherium | — | **0** | warhide→wraithhide | — | 0…94 | runewoven (L70)→starweave (L92) | — | 66³ |
| L95–99 | godiron-Set | — | **0** | shadowhide/voidhide | — | **245⁴ (+150)** | voidweave (L99) | — | **245⁴ (+146)** |

² scaled_leather via burgle_warehouse@Thieving 36 (Neben-Skill-Gate, kein Kampf) — auch Input im ember-Set.
³ void_rune ← void_stalker L66 = **Tower Etage 4 = Slayer 60**; Welt-Alternative erst slagpit L155+.
⁴ idol_shard / raw_shadowhide ← idol_warden L245+ (idolhall, dungeonOnly) — Endgame-Chase, per Rare-Drop-Philosophie vertretbar, aber asymmetrisch zu Platte (godiron L99 = reines Mining).

**Stoff-Drops von normalen Monstern: exakt 0 Teile im GANZEN Spiel** (nur 4 Elite-Unique-Stoffteile L45/58/88/92 aus 15-Min-Fenster-Elites). Platte/Leder droppen ab L1 laufend (worn_workgloves, muckboots, leather_helm 4 %, bronze_sword 5 % @goblin_shaman L18 …).

### 1.3 Konkret belegte Claim-Zahlen

- **22 Magie-Items** haben Craft-Ketten mit Delta > +10 über ihrem Band (10 Waffen/Offhands, 12 Stoffteile). **Melee: 0.** Platte-Ausreißer: nur 2 Spezialteile (chitin_coif L14 ← pitch_beetle L42; frost_pelt_hood L55 ← Tower F4), Kernlinie 0.
- Die komplette Frost-Linie (Set + Szepter + Fokus + steel_wand/focus) kostet **≈48 frost_essence** ≈ 80 Kills tower_ember_elemental (Slayer 40!) bzw. ≈ 400 Kills barrow_chanter L55 — für **L20–25-Ausrüstung**.
- Stoff hat zwischen L1 und L22 **keine einzige Sprosse** (Platte: L1/5/10/20; Leder: L0/5/20). Und die L22-Sprosse ist de facto L50+.
- Magier-Aufstieg braucht **2 Neben-Skills** (Runecrafting für Waffen + Leatherworking für Roben, gefüttert von Foraging+Mining); Krieger braucht 1 (Smithing aus Mining). Nicht-offensichtlich und teurer.

---

## 2. Magier-Durchlauf-Simulation (RealisticPlayer, honest, seeds 7/21, 240 Sim-h)

| Stil/Seed | CL @12h | CL @48h | CL @240h | Kills | Tode | Waffe am Ende | Befund |
|---|---|---|---|---|---|---|---|
| melee/7 | 13 | 17 | **27** | 5 658 | 83 | crude_waraxe + Platte | stetiger Fortschritt |
| melee/21 | 12 | 16 | **28** | 19 224 | 75 | goblin_shank + Platte | stetiger Fortschritt |
| ranged/7 | 4 | 4 | **4** | 35 | 0 | cracked_bow (Starter!) | **WALL ab h1**, 239 h kein Kampf |
| ranged/21 | 9 | 9 | **9** | 161 | 1 | cracked_bow | **WALL ab h6** |
| magic/7 | 9 | 9 | **9** | 104 | 1 | gnarled_staff (Shop-Starter) + apprentice | **WALL ab h9**, 231 h kein Kampf |
| magic/21 | 13 | 28 | **35** | 24 615 | 7 | **KEINE (Faustkampf!)** | Magie aufgegeben: magic bleibt L4, attack 41/power 31 |

Der „erfolgreiche" Magier-Lauf ist ein Pyrrhus-Beleg: der Sim-Spieler levelt **waffenlos prügelnd** (Stil-Abbruch), weil kein Magie-Upgrade erreichbar war. Ward-Mechanik einbezogen: maxWard = Σ Stoff-wardCapacity (WARD_CORE_PER_INT=0) — der Magier sitzt real von L1 bis ~L40 auf **45 Ward** (apprentice), während Platte in denselben Bändern 44.5→71.6 Armor MIT Nachschub an jeder Sprosse bekommt. „Casting lädt Ward" läuft ins Leere, wenn der Pool 40 Level lang nicht wächst.

Kanonischer `pnpm test`-Sim: 1085/1085 grün — der Balance-Sim fährt nur den **Melee-Bronze-Baseline-Helden**, deshalb war das Loch unsichtbar (Guard-Lücke, §5).

---

## 3. Patch-#1-Wirkung (14 Drop-Waffen + Elite-Uniques)

**Teilweise geschlossen:** wisp_kindled_bough (R22, mire_wisp L30, 2 % — gut), chitinshell_sparker (R34 ← L42, 1.5 %), barrowsong_crook (R47 ← L55, 1 %), briarbound_conduit (R52 ← L60, 0.9 %), choirbound_relic (R72) geben Magie erstmals eine Drop-Waffenleiter ab Band 22+. Elite-Uniques ergänzen 4 Magie-Waffen (impbone_wand R8, ashtongue_fetish R18, hoargrim_scepter R58, furnaceheart_core R90) + 4 Stoff-Chase-Teile — aber Elites sind 15-Min-Fenster mit ~1–2 h Cooldown: Ergänzung, kein deterministischer Pfad.

**Offen bleibt:**
1. **L1–L20-Waffen-Craft** (Wand-Linie frost-gated; einziger Weg = Stab-Linie via Runecrafting, das der Spieler erst entdecken muss).
2. **Die komplette Stoff-/Rüstungs-Kette** (frost/ember-Sets, 0 Drops, L1→L22-Lücke).
3. Fokus-Offhands L20–30 (frost-gated).
4. duskweave L64 am Slayer-60-Tower.

---

## 4. Fix-Spezifikation (Apply-Liste für content-dev, in dieser Reihenfolge)

Alle Änderungen reine ContentDB (Rezept-Inputs/Loot/neue Items) — **kein Save-Belang** außer F4 (neue Item-IDs: rein additiv, kein Migrationszweig nötig).

### P0 — Magier-Kern (der Review-Fix)

**F1 — Wand-Rezepte L1–10 ent-frosten** (runecrafting-Aktionen, Input-Tausch 1:1):
| Aktion | vorher | nachher |
|---|---|---|
| craft_copper_wand | force_rune 2 + **frost_rune 2** | force_rune **4** |
| craft_bronze_wand | force_rune 2 + **frost_rune 2** | force_rune **4** |
| craft_iron_wand | **frost_rune 3** | **force_rune 3** |
Effekt: Kampf-Gate 50→0 (dim_essence = Foraging L1). Rest der Rezepte unverändert.

**F2 — frost_essence Band-gerecht sourcen** (Loot-Ergänzungen, bestehende Quellen bleiben):
| Monster | Level/Zone | neuer Loot-Eintrag |
|---|---|---|
| goblin_felmagician | L27, borderlands (Welt) | `{ itemId: "frost_essence", chance: 0.20, min: 1, max: 2 }` |
| wailing_shade | L28, Tower F2 (Slayer 20) | `{ itemId: "frost_essence", chance: 0.25, min: 1, max: 1 }` |
Effekt: Frost-Linie (≈48 Essenz) farmbar ab ~CL 25 im Welt-Content (~160 Kills L27 statt 80 Kills Slayer-40-Tower / 400 Kills L55). Thematik: Felmagier/Schatten-Schemen als Frost-Träger — Namens-/Flavor-Feinheit liegt bei content-dev (Kreative Item-Lizenz).

**F3 — Ember-Set-Ausreißer angleichen** (2 Rezepte, Input-Tausch 1:1):
| Aktion | vorher | nachher |
|---|---|---|
| craft_ember_handwraps | **frost_essence 3 + aether_rune 2** + scaled_leather 1 | **ember_essence 3 + fire_rune 2** + scaled_leather 1 |
| craft_ember_sandals | dito | dito |
Effekt: L30-Set einheitlich L30-gated (goblin_warlock/ash_rat/mire_wisp); Runecrafting-Anforderung 50→15.

**F4 — Neue Stoff-Sprosse „Dimweave" L10** (3 Items + 3 Rezepte + 1 Set; schließt die L2–L21-Lücke):
| Item-ID | Slot | ward | modifiers | req | value |
|---|---|---|---|---|---|
| dimweave_cowl | helmet | 11 | { con: 1, int: 1 } | { magic: 10 } | 120 |
| dimweave_robe | body | 17 | { con: 1, int: 1 } | { magic: 10 } | 190 |
| dimweave_leggings | legs | 13 | { con: 1 } | { magic: 10 } | 150 |
(Σ 41; kombiniert mit apprentice_mitts/slippers → 53 Gesamt-Ward. Staffel: 45 → **53** → 75 → 103 → 138 — glatte Leiter, kein Cliff.)
| Rezept | Skill@Level | Dauer | XP | Inputs |
|---|---|---|---|---|
| craft_dimweave_cowl | leatherworking@8 | 5000 ms | 12 | dim_essence 4, force_rune 2, cured_leather 2 |
| craft_dimweave_leggings | leatherworking@10 | 6000 ms | 16 | dim_essence 5, force_rune 2, cured_leather 2 |
| craft_dimweave_robe | leatherworking@12 | 7000 ms | 20 | dim_essence 6, force_rune 3, cured_leather 3 |
Set: `dimweave_set { pieces: [die 3], minPieces: 2, bonus: {}, modifiers: { int: 1, con: 1 }, skillBoost: { magic: 1 } }`.
Art nötig (Chef): 3 Stoff-Icons, **ohne Glow** (Prompt-Regel). Suffix: `suffixChance 0.04` analog Frost-Rezepten (Wert prüfen, was dort steht — Konsistenz vor Zahl).

**F5 — Ranged-Beifang: Bowstring-Gate L15→L5** (dasselbe Muster, gleicher Fix-Typ):
- Neue Aktion `twist_rawhide_cord` leatherworking@1, 3000 ms, XP 5: `raw_hide 3 → bowstring 1` (raw_hide: Kuh L5 70 %). `fletch_bowstring` (scarred_hide 1:1) bleibt als effizienter Weg.
- Shop-Ergänzung für Starter-Parität mit gnarled_staff (120 g): `hunting_bow` 120 g, ranged-mainhand, req { ranged: 1 }, dmg 0.4–0.6 @2650 ms (cracked_bow bleibt 18 g Starter).

### P1 — Mid-Game-Tower-Entkopplung

**F6 — duskweave L64 vom Slayer-60-Tower lösen** (5 Rezepte, Input-Tausch 1:1):
- craft_duskweave_cowl/_robe_body/_robe_legs/_handwraps/_treads: `void_rune 2` → `shade_rune 2`.
- shade_rune = bind_shade_rune@RC30 (shade_wisp: wailing_shade L28 25 % / ashfield_wraith L38 20 % / sorrow_wraith L72 22 %; essence_grave: Foraging 47+). Effektives Gate 96→38. runewoven L70+ bleibt bewusst void-gebunden (Tower-F4-Identität).

**F7 — void_essence Welt-Quelle (Crypt) für die L70–80-Bänder** (Loot-Ergänzungen):
| Monster | Level/Zone | neuer Loot-Eintrag |
|---|---|---|
| hollow_choir | L80, crypt | `{ itemId: "void_essence", chance: 0.08, min: 1, max: 1 }` |
| skeleton_nekro | L90, crypt | `{ itemId: "void_essence", chance: 0.10, min: 1, max: 1 }` |
Effekt: runewoven/bloodiron/titanium-Ketten ohne Slayer-60-Pflicht; Tower F4/F5 bleibt die effizienteste Farm (25–40 %).

### P2 — dokumentierte Ausnahmen (KEINE Änderung)
- voidweave L99 / shadowhide+voidhide L95–99 / idol_aegis: bleiben idolhall-Chase (Rare-Drop-Philosophie; jeder L99 kämpft dort ohnehin). In die Guard-Allowlist.
- chitin_coif L14 (+28) & frost_pelt_hood L55 (eff. +41): Chase-artige Einzelteile → Allowlist ODER content-dev senkt Preis-Delta später; kein Blocker.
- Sim-Heuristik-Notiz (kein Content-Fix): RealisticPlayer levelt Runecrafting nicht als Waffen-Route (magic/7 blieb trotz freiem iron_staff-Rezept auf dem Shop-Stab). Nach F1–F4 erneut prüfen; ggf. sim-dev-Task. Der zugrundeliegende UX-Punkt (Magie-Progression = 2 Neben-Skills, nicht sichtbar) gehört in den Onboarding-Meilenstein (final), nicht jetzt.

---

## 5. Guard-Spezifikation: „Drei-Stile-Material-Paritäts-Check" (test-/content-dev)

Neuer Guard in `packages/engine/src/content-integrity.test.ts` (describe „Material-Parität der drei Stile"), rein lesend auf der ContentDB:

**G1 — Kampf-Gate-Funktion (Referenz-Implementierung = dieses Audit):**
`combatGate(itemId)` = Minimum über alle Quellen; rekursiv über Rezept-Inputs (Memo + Zyklus-Schutz):
- Aktion ohne Inputs (Sammeln/Thieving), Shop, Crop (inkl. Seed-Gate) ⇒ 0.
- Verarbeitungs-Aktion ⇒ max über Input-Gates.
- Monster-Drop ⇒ **effektives Monster-Gate**:
  - Welt-Monster: `monster.level`.
  - slayer_tower-Monster: `max(monster.level, slayerLevelRequired(floor) · 1.6)` (F2=32, F3=64, F4=96, F5=128 — kodiert, dass Slayer nur über Kampf-Umwege levelt).
  - dungeonOnly-Monster: `max(monster.level, dungeon.requiredLevel)`.

**G2 — Band-Assertion (hart):** für jedes craftbare Equipment mit `maxReq = max(requirements)` und `maxReq < 90`:
`combatGate(item) ≤ max(maxReq + 10, maxReq · 1.3)` — sonst FAIL mit Item-ID + schuldigem Material-Pfad. Allowlist (explizit, mit Kommentar): voidweave_*, voidhide_*, shadowhide_*, chitin_coif, frost_pelt_hood.
Nach Apply von F1–F7 ist die Fail-Liste leer (heutige Verstöße: 22 Magie-Items, 2 Bögen-Bänder, 2 Platten-Sonderteile).

**G3 — Sprossen-Existenz je Stil (hart):** für jedes 10er-Band b ∈ {1–10, 11–20, …, 71–80}:
- je Stil ≥ 1 **craft- oder ≥2 %-drop-erreichbare** Waffe mit Req im Band und `combatGate ≤ Bandende + 10`;
- je Rüstungsklasse (armorRating/evasionRating/wardCapacity) ≥ 1 body-Teil analog.
(Heutiger Verstoß, der den Guard rot machen MUSS, bis F4 da ist: Stoff-Body im Band 11–20.)

**G4 — Sim-Stil-Parität (weich, Report):** der Balance-Report (sim.test.ts) fährt die Bronze-Baseline zusätzlich als Ranged- und Magie-Variante (nur bestes Gate-0-Gear des Bandes) und druckt CL-Fortschritt/Kills nebeneinander; Warnung bei > 30 % CL-Rückstand eines Stils. Kein Hard-Fail (Heuristik-Rauschen), aber sichtbar in jedem `pnpm test`.

---

## 6. Evidenz / Repro

- Material-Gate-Tabelle: Scratchpad-Skripte (audit.ts/audit2/5/7) gegen `packages/content/src/index.ts`, 2026-07-23.
- Sim-Läufe: `RealisticPlayer` (packages/engine/src/sim-realistic.ts), seeds 7/21, styles melee/ranged/magic, 240 Sim-h, Checkpoints 12/24/48/96/168/240 h.
- `pnpm --filter @hearthforge/engine test`: 120 Dateien / 1085 Tests grün; Balance-Report nur Melee-Baseline (daher Guard §5).
