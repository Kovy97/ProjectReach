# Tester-Sweep 2026-06-30 — gesammelte Funde (20 Tester)

Status: Tester melden laufend. Triage + Fixes gebündelt durch CEO (Claude). 🔴 kritisch / 🟡 mittel / 🟢 minor.
Eingegangen: **20/20 KOMPLETT.**

### Nachtrag Tester 19 (Ökonomie) — keine 🔴, WALLS=0, geared schlägt alle 184 Monster
- 🟡 cook_shadowcarp NET −1920 g/h (cooked value 16 < raw 18, heilt nur 45) — Typo-Verdacht [Content].
- 🟡 Endgame-Crafting-Gold-Faucets sehr hoch (leatherworking/jewelcrafting ~455k g/h; Einzel bis 2.9M g/h
  craft_shadowhide_vambraces) — Inflationsrisiko [Balance/Chef].
- 🟡 mine_bloodstone_seam 79k g/h @ L25 (~4× Nachbarn) [Balance]; Vambraces/Boots > Body/Helm derselben Stufe.
- 🟡 cook_honey_cake −12.6k g/h, reforge_signet −18k (Thieving vernichtet Gold) [Content].
- ✅ Pfeil-Fletching/Runen/Tränke negativ = by-design (Use-Items, billige Munition). bull_boss L15 + goblin_warlock
  L30 = frühe nicht-monotone Gear-Gates [Balance-Notiz].

---

## 🛠️ FIX-STATUS (Batch 1 — ausgeliefert)
**ERLEDIGT + grün (Engine no-sim 453, Typecheck 5/5, Persistenz 58, Client-Build):**
- ✅ S1 deserialize null-Skill-Guard (persistence totalXp `skill?.xp ?? 0`)
- ✅ B1 Bank-Phantom: BankPage owned-Map filtert `!slot.instance`
- ✅ D1 stopCombat räumt dungeonId/encounterIndex auf
- ✅ SH1 Shock-Magnitude `Math.min(1, …)` beidseitig (kein Dauerstun)
- ✅ R1/R2 Equip/Tool/Unequip/Ammo: stowEquipped datenverlust-sicher + Pre-Flight-Kapazitätscheck +
  Munitions-Überlauf bleibt im Köcher + Ammo-Sorten-Wechsel revert-sicher. Guard-Test equip-dataloss.test.ts.
- ✅ R3 Quick-Sell: dragInvIdx IMMER gesetzt → Instanz korrekt via sellInventoryInstance (jede Sortierung)
- ✅ R4 Equip-per-Drag: nutzt equipInstance für Instanzen (Affixe bleiben). Umsortier-Drop bleibt newest-only.
- ✅ Hit-Range-Anzeige: DMG_ROLL_FLOOR aus shared exportiert + `minHit` in DerivedStats; UI zeigt minHit–maxHit.

**Batch 2 — TEILWEISE erledigt (grün, Engine no-sim 453, NOCH NICHT geZIPpt):**
- ✅ SL1 Slayer-Pool-Filter: assignTask wählt nur Tower-Monster mit erfüllter slayerRequirement (sonst Welt-
  Task/kein Task) — RNG im Normalfall unverändert. Kein Soft-Lock mehr.
- ✅ L1 autoBank-Stop: canHoldOutputs prüft Inventar UND Bank-Kapazität (canHoldAnywhere) → bei voll/voll +
  neue Art stoppt die Aktion mit inventory_full statt Inputs zu verbrennen.
- ⏳ ST1 Regen-Stalemate: bewusst verschoben (größerer Eingriff, reine Idle-Effizienz, braucht Sim).
- ⏳ diverse 🟢 (Logs/Tooltips/tote Felder/Doku-Kommentare) — niedrige Prio.

## ✅ FIX-PASS-REIHENFOLGE (CEO fixt CODE-Bugs; CONTENT/Balance → Chef/content-dev)
**CODE jetzt (Datenverlust/Crash/Soft-Lock, sicher):** S1 (Save-Crash) · B1 (Bank-Phantom) · D1 (stopCombat) ·
SH1 (Shock-Clamp) · R1/R2 (Equip/Unequip Platz-Guard) · R3/R4 (CharacterPage Instanz-Drag/Quick-Sell) ·
Hit-Range-Floor-Anzeige (meine Regression). Danach medium: SL1 (Slayer-Pool-Filter), L1 (autoBank-Stop),
ST1 (Regen-Stalemate). Alles GRÜN halten → ZIP.
**CONTENT/Balance → Chef-Entscheid (content/index.ts single-writer, sim-sensitiv):** cook_shadowcarp/honey_cake
Marge, Crafting-Gold-Skalierung, bloodstone_seam, ach_quests_100 (count≤88), ach_sets_all (29→30), Doppel-
Heiltränke, weaponType-Nutzung, Default-Melee-Stance, Dungeon-Balance-Inversionen, Set-minPieces/Capstones.

### Nachtrag Tester 18 (Achievements/Quests)
- 🔴 `ach_quests_100` unerreichbar: zählt distincte claimed Quests, es gibt nur 88 (content:11467) → count≤88 senken
  oder Quests ergänzen. Wurzel: „Complete N quest(s)" zählt distinct, nicht Abschlüsse [T18#1/3].
- 🟡 `ach_sets_all` count 29, aber 30 Sets existieren (content:11491) → auf 30 [T18#2].
- 🟡 canClaimQuest prüft bei Dailies nicht die Tagesauswahl (latent, UI-gated) [T18#4].
- 🟢 DE-Umlaut-Transliteration (Holzfaellen/Auftraege) inkonsistent zu Skill-Namen [T18#5].
- ✅ Zähler alle verdrahtet, Schwellen exakt, kein Doppel-Trigger, Quest-Ketten azyklisch.

---

## 🔴 KRITISCH — zuerst fixen (Datenverlust / Steam-Blocker)
- **R1 — Equip vernichtet getragenes Item** (equipment.ts stowEquipped:12-24, equipItem/equipInstance):
  `addItem`/`addInstance`-Rückgabe NICHT geprüft. Inventar voll (oder 2H verdrängt mainhand+shield = 2 Slots
  nötig) → ausgezogenes Item WEG. Leicht auslösbar (alles stapelt → Mehrfachbesitz Normalfall). [T11#1]
- **R2 — unequip Munition >999 + 1 Slot** verliert Pfeile (gleiche addItem-Overflow-Wurzel). [T11#3]
- **R3 — Quick-Sell-Slot verkauft falsche/keine Instanz** in Sortierung ≠ "newest" (dragInvIdx nur in
  newest gesetzt → sellItem(baseId) trifft Instanzen nicht). MEIN neues Feature. [T11#2]
- **WURZEL für R1/R2/R3-Daten:** ungeprüfter addItem/addInstance-Overflow → zentral fixen (Slots-Bedarf
  vor Tausch prüfen; bei 2H zwei Slots; sonst Equip/Unequip ablehnen statt löschen).
- **B1 — Bank zeigt Instanzen als Phantom-Einlagerung** (BankPage owned-Map ohne !slot.instance):
  Shift-Klick/Deposit tun nichts, Mengen irreführend. Instanzen aus der fungiblen Bank ausfiltern. [T12#1]
- **S1 — deserialize CRASHT bei korruptem Skill** (persistence index.ts:883 totalXp `skill.xp` ohne
  null-Guard, außerhalb migrate-try/catch) → bricht „nie werfen"-Vertrag. Fix: `skill?.xp ?? 0`. [T17#1]
- **SL1 — Slayer Soft-Lock** (slayer.ts:178-185 assignTask filtert NICHT nach slayerRequirementMet) →
  blockierter Tower-Mob als Task, kein Fortschritt, nur UI-Gratis-Abbruch rettet. Pool filtern. [T7#1]
- **L1 — Stiller Material-/Loot-Verlust bei autoBank** (tick.ts canHoldOutputs:65-69 = true bei autoBank,
  aber addItemOrBank wirft NEUE Art bei voller Bank weg → Input verbraucht, Produkt weg). Stop bei
  inv+bank voll. [T8#1, T9#2] — mid/late game.
- **D1 — stopCombat leakt Dungeon-State** (combat.ts:179-181 lässt dungeonId/encounterIndex stehen;
  andere Exits räumen auf; wird persistiert) → Geisterzustand. dungeonId=null+encounterIndex=0 mitziehen. [T6#1]
- **SH1 — Shock-Magnitude nicht auf ≤1 geklemmt** (combat.ts:665, Skip-Check :925/:942) → magnitude>1 =
  Dauer-Stun (Spieler unverwundbar ODER dauerbetäubt). Content aktuell diszipliniert, aber Item-Builder-
  Risiko. Fix billig: `Math.min(1, magnitude)`. [T4#1]
- **ST1 — Regen-Stalemate** (combat.ts:895-897 regen ≥ Spieler-DPS → Gegner stirbt nie, Spieler dank
  Food/Lifesteal auch nicht → Endlos-Idle ohne Fortschritt/Warnung). Stalemate-Erkennung + Stop. [T4#2]
- **R4 — Equip-per-Drag verliert Instanz-Affixe** (CharacterPage.tsx:558-566 Drop ruft IMMER equipItem(itemId),
  nie equipInstance) → verzaubertes/gesuffixtes Gear per Drag anlegen löscht Affixe. Klick-Pfad korrekt. [T20#1]
  → gleiche Stelle wie R3 (Quick-Sell): Drop/Drag müssen Instanzen am Slot-Index erkennen.

## 🟡/🟢 Nachträge Tester 14/16/20
- **Suffix-Roll-Varianz ist −15%..0% statt „±15%"** (shared:1407 0.85+0.15r) → Rolls fast deterministisch;
  Kommentar/Spec sagt ±15. Auto-Salvage (1/3) zerlegt zudem Beinahe-Best-Rolls (Varianz 0.85-0.90). [T14#1/2]
- **Instanz-Verkauf ignoriert Affix-/Suffix-Wert** (shop.ts:86-93 nur Basispreis) — mehrfach gemeldet [T13#3,T14#3].
- **Affix-Boni fehlen im Inventar-/Char-/Shop-Tooltip** (nur Name+Tier; EnchantingPage zeigt Zahlen) [T14#5];
  SuffixStatRows am hasStats-Gate (statloses Slot-Item verbirgt Suffix-Zeilen) [T14#6].
- **Set minPieces rückwärts** (copper/iron/steel=5, mithril..godiron=3 → frühe Tiers schwerer) [T16#1];
  voidweave magicDamage 13<godspark 17 (Capstone-Downgrade) [T16#2]; voidhide evasion 12<alle Vortiers [T16#3].
- **i18n SAUBER** (en=799/de=799 identisch, kein Roh-Key) [T20]. Verwaiste Keys combat.macroStyle*/meleeFocus*
  [T20#5]. Stance-Tooltip nur Melee-Text [T20#3]; hartkodiertes „Lv" CombatPage:1745 [T20#4]; Shop noSpace
  prüft nur 1 Stück (buyQty ignoriert; Engine deckelt aber partiell) [T20#6].
- **NEU latent:** negative künftige Suffix-/Roll-Stats würden via Math.max(1,…) im Vorzeichen kippen [T14#4];
  Skilling-Set-Boni (gather*) würden ignoriert, da Skilling-Tick nur Buffs liest (kein Live-Set) [T16#4].

## 🟡 MITTEL (gesammelt, gruppiert)
- **Kampf-XP/Stance:** Defensiv-Ranged trainiert geteilte `defence` ×1.2 (combat.ts:396-398 Faktor an style
  statt xpSkill) [T2#2]; Defensiv-Stances leveln Offense-Skill nie → Falle ohne Hinweis [T2#3]; vom Spieler
  ausgeteilter DoT gibt keine Offense-XP (Asymmetrie für Magier/Feuer) [T4#5]; magic-inflict-Mobs routen
  Def-XP auch für Melee/Ranged in (nutzloses) magic_def [T3#1].
- **Default-Melee-Stance „attack" = schwächste Progression** (power 2.15× Schaden); Default auf power? oder
  attack via dex/Crit/Tempo aufwerten? [T1#1/2] — Balance/Design-Call.
- **ammoDamage fehlt in computeStats** → Charakterblatt zeigt Köcher-Schaden/Pfeil-Upgrades nicht [T2#1].
- **Crit > angezeigter Max-Hit** seit DMG_MAX_HIT_MULT 1.4815 < critDamage 1.5 [T1#3] (zur Hit-Range-Fix-Runde).
- **Ranged 1000ms-Floor wird von Stance-speedMult unterlaufen** (character.ts:260 dann :263 ×0.85 → 850) [T15#3].
- **NaN-Durchlass:** computeStats guard-Kommentar überstellt (str=NaN → maxHit/maxHp NaN) [T15#1];
  persistence Attribut-Sanitizer nutzt typeof statt Number.isFinite [T15#2] (durch JSON NaN→null entschärft).
- **Dungeon-Balance:** idol_sanctum (Gate99) ist leichtester High-Tier (Boss-Dmg 125 vs wyvern 275) bei ~10×
  Belohnung → Difficulty-Inversion [T6#2]; crypt-Boss tankier als 2 höhere Dungeons [T6#3]; highland_aerie
  +2 Gate vor riesigem Sprung L120→222 [T6#4].
- **Auto-Eat i18n** „heal more"/„heilt mehr" falsch (healMult fix 1.0) [T5]; Frühgame-Tier0 + 3s-Lockout kann
  harte Treffer durchlassen (Tuning) [T5].
- **Slayer:** Helm-Crafting frisst Tower-Gate-Items (plague_mask etc.) [T7#2]; feste Task-Größe 15-50 grindig
  [T7#3]; Slayer-XP großzügig (~mob.xp×required) [T7#4].
- **Thieving-Risiko wirkt auf Fence-Kette** (kein successBase → bold +20% Gold risikolos) [T10#3].
- **Doppelte Heiltränke gleichen Anzeigenamens** unterschiedlicher Stärke (greater 70 vs 150; minor 30/30) [T10#1/2].
- **completeAction-Ordering:** Inputs vor successBase-Wurf verbraucht (latent, falls Craft je successBase) [T8#4,T10#4].
- **Woodcutting hat kein woodcutting-gegatetes Tool** (Tempo nur über attack-gegatete Äxte) [T9#1].

## 🟢 MINOR (gesammelt, später/Cleanup)
- Hit-Range-Floor-Anzeige 0.2 statt 0.35 [T2#6→FIX oben]; toter isFull-Import ShopPage [T13#4]; Kauf 1/5/10/50
  vs Verkauf 1/10/100 Asymmetrie [T13#5]; Teilkauf ohne Feedback [T13#6]; Instanz-Sell per Slot-Index statt
  instanceId [T13#2]; Instanz-Verkauf nur Basiswert [T13#3].
- Melee-Lifesteal ohne Log/Float [T1#4, T4#4]; bleed/poison-DoT ohne per-Tick-Log [T4#3]; Mana-leer-Schlag
  ohne Feedback [T3#5]; Cooldown ohne UI-Feedback [T5].
- Tote/vestigiale Felder: weaponType (264 Items, ungenutzt — schon bekannt); stackable (nur Sim) [T9#3];
  healMult (CombatPage „×1") [T5]; StatusEffect.magnitude frost [T4#7]; weaponEffects[] kein Live-Content [T4#8];
  SlayerMasterDef.taskPool/DEFAULT_TOWER_TASK_CHANCE [T7#7]; Beutel-locked-Pfad CharacterPage [T11#5].
- Doku/Kommentar-Fixe: combat.ts:234 Crit-Formel [T1#5], dungeon.ts:11 highland 65→92 [T6#7], content:10116
  Bridge-Monster-Kommentar [T6#8], offline „24h"→12h persistence:911 [T17#5], mana-shield.test Helfer [T3#3].
- Equip/Bank UX: equipAmmo prüft Munition↔Bogen nicht [T2#5]; Bank-Onboarding „100 Typen"→60 [T12#5];
  tote bank.* i18n-Keys [T12#6]; leeres Inventar keine Drop-Zone [T12#7]; Dungeon-Key-Tooltip Singular
  ignoriert keysPerRun=2 [T6#6]; slayer.req „nicht im Inventar" ignoriert Bank/Equip [T7#5].

## Offene Bereiche (ausstehend): 10✓ · 14 Instanzen/Suffix · 16 Sets · 18 Achievements/Quests · 19 Ökonomie · 20 UI/i18n

## CEO-Triage / Fix-Plan (wird gepflegt)
- **FIX (meine Regression):** Hit-Range-Anzeige nutzt `maxHit*0.2`, aber `DMG_ROLL_FLOOR=0.35` (Tester 2#6).
  → `DMG_ROLL_FLOOR` aus shared exportieren ODER `minHit` in DerivedStats (computeStats) + UI darauf umstellen.
- **FIX (Nebenwirkung meiner DPS-Änderung):** seit DMG_MAX_HIT_MULT 1.667→1.4815 ist `critDamage 1.5` >
  Mult → Crits übersteigen den angezeigten Max-Hit (Tester 1#3). Optionen: Max-Hit-Label „(Normaltreffer)"
  ODER critDamage/Anzeige angleichen. Min-Aufwand: minHit/maxHit-Fix oben gleich mit klären.
- **FIX (trivial):** toter Import `isFull` in ShopPage.tsx:9 (Tester 13#4).
- **DOC-FIX:** buyItem-Kommentar verspricht Teilkauf-by-Gold, UI sperrt ihn aber (WYSIWYG, bewusst). Doc an
  UI angleichen ODER disable lockern (Tester 13#1). Entscheid: WYSIWYG behalten → Doc anpassen.
- **PRÜFEN/Chef:** Default-Melee-Stance „attack" ist schwächste Progression (power 2.15× Schaden, Tester 1#1/2)
  — Default auf „power"? Oder attack (dex: Crit/Tempo) aufwerten? = Balance/Design-Call.

---

## Tester 2 — FERNKAMPF (Ranged)
- 🟡 **ammoDamage fehlt in computeStats** (character.ts:238,269): Köcher-Schaden wird nur zur Laufzeit in
  combat.ts:758 addiert → Charakterblatt (maxHit/rangedDamage/Hit-Range) zeigt Pfeil-Upgrades NICHT.
  Soll: ammoType.ammoDamage für ranged in abgeleitete Werte einrechnen (oder eigene „+X Munition"-Zeile).
- 🟡 **Defensiv-Ranged trainiert geteilte `defence` ×1.2** (combat.ts:396-398 styleFactor an style statt
  Ziel-Skill): Bogen-Defensiv levelt defence 20% schneller als Melee-Defensiv. Faktor an xpSkill koppeln.
- 🟡 **Defensiv-Ranged levelt `ranged` nie** (shared:73) → Offense friert ein. OSRS-artig, aber UI-Hinweis fehlt.
- 🟡 **RANGED_WEAK_FACTOR toter Zweig** (combat.ts:760 unerreichbar, da stopIfOutOfAmmo früher beendet).
  Toter Code → kommentieren oder entfernen.
- 🟢 **equipAmmo prüft Munition↔Bogen nicht** (equipment.ts:157): falsche Munition → stiller Kampf-Stopp.
  Soll: Hinweis/Warnung beim Ausrüsten/Start.
- 🟢 **Hit-Range-Floor falsch** (CombatPage.tsx:652,1668 nutzt 0.2 statt DMG_ROLL_FLOOR 0.35) → siehe FIX-KANDIDAT.
- ✅ sauber: Munitionsverbrauch/Köcher, i18n ammoHint, Stance-Mechanik, Persistenz rangedStance/ammoCount.
