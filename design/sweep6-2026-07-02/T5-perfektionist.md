# Sweep 6 — T5: 100%-Completion-Erreichbarkeit (Perfektionist)

**Tester:** Kontrolleur (Sweep-6-Agent T5) · **Datum:** 2026-07-02/03 · **Scope:** headless, read-only
**Methode:** Wegwerf-Harness `_tmp_s6t5_completion.test.ts` (vitest, nach dem Lauf gelöscht) —
Obtainability-Fixpoint über die gesamte ContentDB (Aktionen/Monster/Shop/Quests/Dungeons/Slayer-Shop/Crops,
inkl. Slayer-Gate-Auflösung), Achievement-Bedingungs-Audit (alle 14 Condition-Typen gegen die echten
Engine-Zähler aus `achievements.ts`/`quests.ts`), Quest-Ketten-Fixpoint, Skill-99-Zeitintegration
(Level-für-Level beste XP/h inkl. `actionSuccessChance`), und **BiS-Kampfproben**: pro Stil ein
voll-99er-Charakter mit greedy-optimiertem, NUR-beschaffbarem Gear, jedes der 92 Monster mit allen
3 Stilen bis Kill/Tod/30-Sim-Min simuliert (`startCombat`/`combatStep`, echte Engine). Alle Zeiten
SPIELZEIT. Kein Fix vorgenommen.

## Ergebnis-Überblick

| Prüfpunkt | Ergebnis |
| --- | --- |
| (e) Items beschaffbar (1019 definiert) | ✅ **1019/1019** erreichbar; **0 Waisen, 0 kaputte Craft-/Drop-Ketten** |
| (a) Achievements erfüllbar (540 definiert) | ✅ **540/540** — kein Verweis auf entfernte Items/Aktionen/Monster/Dungeons/Skills; alle Schwellen unter den Caps |
| (b) Quests abschließbar (88 definiert: 37 Story + 51 Daily-Pool) | ✅ **88/88** — requires-Ketten zyklenfrei & auflösbar, alle Objective-Targets existieren, alle Reward-Items existieren |
| (c) Alle 21 Skills bis 99 trainierbar | ✅ jede Skilling-Leiter reicht bis Req 95–99; kein Skill „endet" vor der 99-Kurve; Kampf-Skills via Kill-/Stance-/Slayer-XP unbegrenzt |
| (d) Alle Monster besiegbar mit BiS | ✅ **92/92**, und zwar mit **jedem der 3 Stile** (0 Teilausfälle, 0 Tode, kein Kill > 5 min); 10 Slayer-Gates alle erfüllbar (Item craftbar UND im Slayer-Shop) |
| Pets 21/21 beschaffbar | ✅ inkl. Farming-Pet (expliziter Harvest-Hook `farming.ts:115`) und Slayer-/Kampf-Pets (`kind:"combat"` je Kill) |
| Sets 29/29 (distinkte Signaturen) voll beschaffbar | ✅ `ach_sets_all` (count 29) erreichbar |

**Empfehlung:** Content-seitig ist 100 % Completion vollständig erreichbar — **ship**. Zwei
Design-Hinweise an den Chef (F1 Echtzeit-Wall, F2 Endgame-Trivialisierung), kein Blocker.

---

## Findings

### F1 (P3, Design/Chef-Entscheidung): `daily_streak 100` ist eine fragile 100-Tage-ECHTZEIT-Wall
Das höchste Streak-Achievement verlangt **100 aufeinanderfolgende reale Kalendertage**
(`quests.ts:289–300`: Lücke ⇒ Reset auf 1; Rückwärts-Uhr wird abgewiesen). Für den Perfektionisten
heißt das: minimal 100 reale Tage, und **ein einziger verpasster Tag wirft ihn auf Tag 1 zurück** —
der einzige Completion-Baustein, der weder durch Spielzeit noch Skill beschleunigbar oder
fehlertolerant ist. Idle-typisch vertretbar, aber bewusst absegnen lassen (Alternativen: 1 Gnaden-Tag
Puffer, oder Cap 30/50). Zusatz: `quests_completed 75` > 37 Story-Quests ⇒ zwingt in den Daily-Pool
(6/Tag) ⇒ ebenfalls ≥ ~7 reale Tage — unkritisch, aber gleiche Kategorie.
**Owner:** content-dev (Zahl) bzw. logic-dev (Gnaden-Puffer) nach Chef-Entscheid.

### F2 (P4, Balance-Info): BiS trivialisiert das Endgame — Einschlags-One-Shot auf den Endboss
Der greedy-BiS-Melee (godiron_spear, alles beschaffbares Gear, Skills 99) erreicht **800 ms
Angriffsintervall (= hartes Engine-Floor), 71 % Crit, ~2,9× Crit-Schaden** → Crit-Hit 220 vs
`last_idol` maxHp 200 (`content/src/index.ts:10733`): **der Endboss stirbt in einem Treffer** (0,8 s
+ 5 s Kill-Cooldown), alle 92 Monster fallen mit allen 3 Stilen ohne einen einzigen Tod. Erreichbarkeit
ist damit über-erfüllt; Kehrseite: mit echtem BiS existiert null Endgame-Risiko (Auto-Eat/Enrage
komplett wirkungslos). Bekannte Philosophie „BiS darf dominieren", daher nur P4 — aber als Datenpunkt
für einen späteren Uber-Boss/NG+-Meilenstein festgehalten.
**Owner:** balance-designer (Kenntnisnahme).

### F3 (P4, Balance-Info): Kampf-XP-Endkurve macht Kampf-99er zu Minuten, Skilling-99er zu Wochen
`last_idol.xp = 58000` (`content/src/index.ts:10741`) bei BiS-Killzeit 0,8 s + 5 s Cooldown ⇒
**~36 Mio. Kampf-XP/h** — 99 in einem Offense-Skill (13,03 Mio. XP) in **~22 Minuten** Boss-Farming;
Slayer (0,5×, nur auf Task) ~1 h. Zum Vergleich Skilling-Endband: 86k–468k XP/h ⇒ 66–332 h pro Skill.
Das Level-Range-Damping (CEO #113) nullt nur ÜBER-levelte Mobs, nicht den Fall „Spieler unter
Mob-Level" — gewollt, aber die letzte XP-Stufe (34k → 58k) ist steil. Kein Completion-Problem
(Richtung „zu schnell" blockiert nichts); nur als Asymmetrie dokumentiert.
**Owner:** balance-designer (Kenntnisnahme).

### F4 (P4, Balance-Info): Skilling-Stundenspreizung 66 h … 332 h bis 99
Zeitintegration Level 1→99, beste verfügbare Aktion je Level, Erfolgschance eingerechnet, OHNE
Tools/Mastery/Pets/Buffs (alles verkürzt real) und OHNE Material-Beschaffungszeit (verlängert
Verarbeitung real):

| Skill | ~h bis 99 | Endband-Quelle (XP/h @98) |
| --- | --- | --- |
| thieving | **332** | appraise_idol @85.680 |
| herblore | 248 | brew_godbloom_infusion @101.368 |
| jewelcrafting | 246 | craft_godgem_ring @86.040 |
| woodcutting | 244 | cut_voidwood_tree @85.814 |
| foraging / leatherworking | je 240 | ~86k–110k |
| cooking | 224 | cook_soulfish @115.200 |
| farming (passiv, parallel!) | 218 | Crops, 9 Plots @116.097 |
| fishing / mining | 212 / 210 | 116k / 180k |
| fletching | 154 | fletch_voidwood_pavise @142.364 |
| runecrafting | 115 | craft_godiron_wand @320.211 |
| smithing | **66** | forge_godiron_chainbody @468.000 (Brutto — real dominiert die Erz-/Barren-Kette) |

Σ aktives Skilling ≈ **2.700–2.800 h** (Farming läuft parallel) — der eigentliche 100 %-Umfang.
Thieving ist der längste Solo-Grind (4× Smithing-Brutto); falls unerwünscht, Endband-Aktion anheben.
**Owner:** balance-designer / content-dev (nur falls Spreizung stört).

### Geprüfte Ausnahmen / Absicherungen (kein Finding)
- **CHASE_ITEMS** (`sim-consistency.ts:47`): alle Chase-Drops haben reale Drop-Quellen und sind im
  Fixpoint erreichbar — keine Waise trägt das Chase-Flag.
- **10 Slayer-Gates** (plague_mask, mirror_ward, ear_plugs, soul_veil, void_anchor): jedes
  Requirement-Item ist **doppelt** bezogen (Craft-Aktion + Slayer-Shop) — kein Henne-Ei
  (Punkte kommen aus Tasks gegen ungegatete Mobs).
- **items_crafted-Achievements mit Target:** jedes Target wird von einer Aktion MIT `inputs`
  produziert (nur die zählen in `craftedById`, `tick.ts:169/198–200`) und deren Inputs sind erreichbar.
- **`gather_items`-Objectives:** kein Quest-Content setzt ein `target` — die Engine-Eigenheit, dass
  das Target ignoriert würde (`quests.ts:29–30`), ist aktuell latent und trifft nichts.
- **items_discovered max 200** von 1019 erreichbaren; **pets_owned 21/21**; **sets 29/29**;
  **total_level-Cap** und alle `skill_level ≤ 99` eingehalten; Dungeons: alle Keys droppen,
  alle Encounter kämpfbar.

## Verdikt
✅ (a) 540/540 · ✅ (b) 88/88 · ✅ (c) 21/21 Skills · ✅ (d) 92/92 Monster (3/3 Stile) · ✅ (e) 1019/1019 Items —
**100 % Completion ist vollständig erreichbar. Ship.** Einzige echte Perfektionisten-Härte ist die
100-Tage-Echtzeit-Streak (F1, Chef-Entscheid), Rest sind Balance-Kenntnisnahmen.
