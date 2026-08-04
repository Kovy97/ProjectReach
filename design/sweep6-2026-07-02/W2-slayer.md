# W2 — Slayer-System end-to-end — Sweep 6 Welle 2, 2026-07-03

Tester: Kontrolleur (W2-Slayer). Methode: Code-Audit (`slayer.ts` / `combat.ts` / `SlayerPage.tsx` /
Content 14332–14413 / Guard-Tests) + Wegwerf-Harness `_tmp_s6w2d_slayer.test.ts` (7 Proben, alle grün,
danach gelöscht). Ehrlicher Lauf Seed 66 (20 Sim-h) + BiS-Raten-Proben MID/END + 12.000-Assign-Verteilung.
Kein Fix vorgenommen. Fremde `_tmp_s6w2a/b/c/f`-Harnesse unangetastet.

**Gesamtbild: Die Slayer-MECHANIK ist sauber verdrahtet — Vergabe, Gates, XP-Fluss, Skip, Shop-Kaufpfad
halten allen Proben stand (0 Mechanik-Bugs).** Die ÖKONOMIE dagegen hat zwei strukturelle Probleme:
die Punkte-Preise stammen aus der 4-Master-Ära und sind gegen die heutige Flat-5-Rate um Faktor ~3–4
zu teuer (P2), und der Früh-Slayer kann in eine Skip-unbezahlbare Task-Wand laufen (P2). Dazu 4×P3, 4×P4.

## Verifikations-Gates (headless)

| Gate | Ergebnis |
|---|---|
| typecheck (shared/content/engine/persistence) | ✅ 0 Fehler |
| engine-Tests (ohne fremde `_tmp_*`-Harnesse der parallelen W2-Tester) | ✅ 90 Dateien / 635 Tests |
| Balance-Sim | ✅ ECHTE WALLS (0); ℹ Bronze-Baseline-Auffälligkeiten (15) = bekannte/akzeptierte Baseline-Anomalie — deckungsgleich mit den Wall-Mobs aus Lauf F (s. P2-2) |
| persistence-Tests | ✅ 99/99 |
| client build | ✅ built in 6.64s |
| Harness-Proben A–G | ✅ 7/7 |

---

## Was VERIFIZIERT GUT ist (Auftragspunkte 1/3/4)

- **(1) Welt-Task-Fenster hält lückenlos:** `worldTaskMonsters` (slayer.ts:121–140) liefert für ALLE
  CL 1–99 einen nicht-leeren Pool strikt in [CL+1 .. CL+8] — **kein einziger Fallback-Fall**, kein
  L10-Spieler mit L60-Welt-Task möglich (99-CL-Sweep, Harness A1).
- **(1) Reroll/Skip:** kostet exakt `skipCost` 20 Pkt, scheitert sauber bei <20, sofortiger Neu-Assign
  möglich, kein Streak-/Cooldown-Nebeneffekt (Harness A3). Kein kostenloser Engine-Abbruch (bewusst);
  UI-Gratis-Abbruch existiert NUR bei unerfüllter Item-Anforderung (SlayerPage.tsx:107–111) — korrekt,
  da `assignTask` blockierte Monster gar nicht erst vergibt.
- **(3) Slayer-Gates / Doppel-Bezug intakt:** alle **10** `slayerRequirement`-Monster geprüft — jedes
  Gate-Item hat BEIDE Quellen: Slayer-Shop-Eintrag (50–500 Pkt, content:14388–14392) UND Craft-Aktion
  (`craft_plague_mask/ear_plugs/mirror_ward/soul_veil/void_anchor`, content:9531–9565). Ohne Item:
  `canFightMonster=false` UND `startCombat=false` (Hard-Block combat.ts:211). Mit Item: kämpfbar und
  mit BiS-Gear killbar (26–81 Kills/10 min, Harness B). `assignTask` filtert unerfüllte Gates auf
  Turm- (slayer.ts:184–193) UND Welt-Pfad (slayer.ts:129) → nie ein hart-blockierter Task.
- **(4) Slayer-XP-Fluss exakt:** 0 Slayer-XP ohne Task (3-min-Kampf-Probe); Task-Kill =
  `round(monster.xp·0.5)·earlyXpMult` (ashfield_wraith: 39×1.512→59 ✓); falsches Monster zählt nicht;
  Abschluss: Bonus-XP + exakt +5 Pkt + `slayerTasksCompleted++`; granulare Kampf-Skills bekommen beim
  Task-Kampf parallel normale XP. Einziger Grant-Pfad ist `grantSlayerXp` ← `recordKillForSlayer` ←
  combat.ts:689 (onEnemyDefeated) — kein zweiter Schreiber auf `skills["slayer"]` im ganzen Engine-Code.
- **Shop-Items alle existent & funktional** (Harness G): 3× Equipment mit Slot, 3× Consumable mit echtem
  `buff` (→ computeStats, run7-verifiziert), 5× Gate-Item, 3× Helm-Craft-Mat. Kaufpfad
  (`spendSlayerPoints`+`addItem`, SlayerPage.tsx:417–420) im Lauf F real benutzt.
- **i18n:** alle `slayer.*`-Keys EN/DE paritätisch (translations.ts:842–881 / 1885–1924).
- **UI-Crash-Gate:** SlayerPage nur innerhalb MainLayout gemountet (App.tsx:88); `Toasts` liegt in
  MainLayout (App.tsx:343); `ItemTooltipOverlay` am App-Root nutzt `useGameStateMaybe`
  (ItemTooltip.tsx:988) — kein Menü-Crash-Pfad.

---

## Findings

### P2-1 · Punkte-Ökonomie: Shop-Preise stammen aus der 4-Master-Ära — bei Flat-5-Rate ~3–4× zu teuer
Die Master wurden auf EINEN konsolidiert (`brenna_ashwick`, `basePoints: 5`, content:14339–14350);
die früheren Master gaben 2/5/10/20 Pkt (s. design/qa/run7-slayer.md §3, bewertete den Endgame-Sink
bei 20 Pkt/Task). Die Shop-Preise (bis 3000) und der Consumable-Sink wurden dabei NICHT nachgezogen —
der Kommentar content:14409 rechnet noch mit „25 **Varek**-Tasks = 1 War Brew"; real sind es **100**
Brenna-Tasks. Punkte sind zudem schwierigkeits-unabhängig: rot_rat×28 zahlt wie abyssal_devourer×50.

**Ehrliche Messung** (BiS-Gear, alle Gates, Null-Leerlauf, Seed 71): MID CL45/S40 = 4,0 Tasks/h =
**20 Pkt/h**; END CL95/S85 = 7,0 Tasks/h = **35 Pkt/h**. Frischer ehrlicher Spieler (Lauf F): **2 Pkt/h**.
Damit in SPIELZEIT (reine Task-Zeit, best case):

| Belohnung | Pkt | Tasks | ≈ Stunden |
|---|---|---|---|
| plague_mask (erste Belohnung) | 50 | 10 | 2,5 (MID-Rate; ehrlich früh: NICHT in 20h erreicht) |
| soul_veil / void_anchor | 250 / 500 | 50 / 100 | 12,5 / 14,3 |
| slayer_vambraces / greaves / amulet | 1200/1500/1800 | 240/300/360 | 34 / 43 / 51 |
| slayer_helm (Shop-Fallback) | 3000 | 600 | **86** |
| Katalog 1× leerkaufen | 9530 | 1906 | **~272** |
| Draught-VOLL-Uptime | 300 Pkt/h | — | braucht 8,6× der END-Rate → real ~12 % Uptime |
| War Brew (60-min-Buff) | 500 | 100 | 14,3h Grind für 1h Buff |

Der Craft-Pfad bleibt als Primärweg intakt (Gates + Gear craftbar) — aber der Shop-Fallback und der
run7-„wiederkehrende Sink" verfehlen ihre Rolle deutlich. **Owner: balance-designer + content-dev**
(Optionen: basePoints nach Task-Monster-Level/Etage skalieren ODER Preise ÷3–4 ODER Bonus-Punkte
pro Turm-Etage). Kein Blocker — Mechanik korrekt, Zahlen schief.

### P2-2 · Früh-Slayer-Wand: Turm-Tasks ohne CL-Filter (bis +16 Level) × Skip unbezahlbar = Sackgasse auf Zeit
Der Turm-Pfad von `assignTask` (slayer.ts:180–195) wählt gleichverteilt über freigeschaltete Etagen
und filtert NUR nach Item-Gate — **nicht nach Combat-Level**. Floor-1-Band ist L3–19; Verteilungsprobe
(2000 Assigns, frisch CL3/S1): 50 % Turm-Quote, ΔLevel p90 = **+16** (tower_goblin_rogue L19), N bis 50.
Das Welt-Fenster ist dagegen sauber (+1..+8, med +3–5).
Dazu die Struktur-Falle: Skip kostet 20 Pkt, Punkte gibt es NUR aus Abschlüssen (5/Task), Engine kennt
keinen kostenlosen Abbruch → wer früh eine Wand zieht, muss sie über-leveln.
**Ehrlicher Lauf Seed 66** (frischer Melee, starterKit, Gear nur aus Drops/Starter-Shop, 20 Sim-h,
slayer-fokussiert): **8 Tasks in 20h**, 17,3h an unschaffbaren Tasks „geparkt" (CL-Grind zum
Über-Leveln), 2 Skips (sobald je 20 Pkt da waren), ein Task blockierte den Slot ~10h (3,2h→13,4h),
plague_mask (50 Pkt) **nie** erreicht, 609 Gratis-Tode (Tod-Zerg, da Tod kostenlos).
Caveat: der Bot ist dümmer als ein Mensch (kein Crafting/Smithing-Gear, keine Taktik) — aber die
Struktur (Ziel IMMER über dem Spieler + Turm ohne CL-Plausibilität + Skip-Gate) ist engine-seitig echt.
Korroboration: die Wall-Mobs des Laufs (bull_boss, goblin_warlock, dust_vulture, tower_skeleton_*)
sind exakt die 15 „Bronze-Baseline unbesiegbar"-Einträge des Balance-Sim-Reports — der Slayer verteilt
also genau die bekannten Undergeared-Walls als Pflicht-Tasks an Frisch-Spieler.
**Owner: logic-dev (slayer.ts) + Chef-Entscheid** (Progressions-Druck ist per Memory gewollt —
combat-is-fundamental). Milde Optionen, die den Druck erhalten: (a) Turm-Kandidaten zusätzlich auf
`level ≤ CL+8` filtern (Fallback-Mechanik existiert schon), (b) Skip unter Slayer-Level ~10 gratis
oder 5 Pkt, (c) nichts tun und als Early-Wall dokumentieren.

### P3-1 · Endgame-Task-Monotonie: Welt-Pool kollabiert auf 1 Monster
Die Welt-Level-Liste hat Lücken (…71,75,80,85,90,90,97,104,112…, Harness G): bei CL80 & CL90 hat das
Fenster [+1..+8] genau **1** Kandidaten; bei CL95/S85 sind **50,0 % ALLER Tasks gray_wolf** (Probe
über 2000 Assigns; Rest verteilt sich auf 26 Turm-Mobs). Auch mittig: CL45 → rootling_gimp+gimp2 =
50 % aller Welt-Tasks. Kein Bug, aber ein Abwechslungs-Loch genau dort, wo Slayer Dauer-Loop sein soll.
**Owner: content-dev** (Level-Dichte 71–120 erhöhen) oder logic-dev (Fenster adaptiv weiten, z. B.
mindestens 3 Kandidaten).

### P3-2 · tower_*-Kopien: Loot-Parität + gesenkte Stats = 51×-Farm-Shortcut (Design-Frage)
Zu Auftragspunkt (5): XP/Gold-Abweichung ist BEABSICHTIGT und dokumentiert (tower-monsters.test.ts:5–15,
balance-pass2), Loot-1:1 ist per Guard ERZWUNGEN (loot ∉ ALLOWED_DIFF_KEYS). Die KOMBINATION seit dem
Stats-Retier bedeutet aber: identische Drop-Tabelle bei einem Bruchteil der Monster-Stärke.
Messung (END-Profil, gleicher Spieler): `tower_roc_void` **153 Kills/h** vs `roc_void` (L233) **3 Kills/h**
→ **51×** schnellere Rolls auf highland_key (1 %), aetherscale_cuirass/aetherband_ring, soulopal,
raw_dragonhide. `tower_ember_elemental` (Slayer 40!) = 2,3× schneller als das L168-Slagpit-Original —
Slagpit-Chase-Loot ~120 Monster-Level früher. Gegenrechnung: XP/Gold der Kopien sind ÷3 (korrekt),
und die Slayer-Gates (S40/S80) sind teuer. Kein Exploit — aber für Chase-Items dominiert der Turm die
Originale klar, und `slayer.tower.intro` verspricht „unique drops", was Kopien gerade nicht sind.
**Owner: Chef/balance-designer** — bewusst absegnen (Slayer-Belohnung) oder Kopien-Loot ausdünnen
(z. B. superRare-Chancen anteilig zur HP senken). Caveat zur 51×-Zahl: der BiS-Bot stirbt am L233-Roc
wiederholt (gratis) — ein besserer Spieler drückt den Faktor, die Richtung bleibt.

### P3-3 · Slayer-Consumable-Beschreibungen 10× neben den echten Werten (Stat-Squish-Drift)
`slayer_combat_draught` (content:4317): Buff **+1** Dmg, Text „**+10** to all combat damage";
`slayer_hunters_elixir` (content:4327): **+1.8** vs „+18"; `slayer_war_brew` (content:4424): **+3.5**
vs „+35" und accuracy **2** vs „+20 accuracy" — EN und DE. Der Tooltip rendert die ECHTEN Buff-Zahlen
direkt daneben (ItemTooltip.tsx:585–588) → sichtbarer Selbst-Widerspruch auf allen drei Karten.
**Owner: content-dev** (Texte auf Squish-Skala; auch Effizienz-Kommentar content:14406–14409 gleich mit).

### P3-4 · „nicht im Inventar!"-Wording — jetzt der 5. Run offen
`slayer.req.missing` (translations.ts:858/1901) sagt „not in inventory!", aber `slayerRequirementMet`
akzeptiert auch Bank & Ausrüstung (slayer.ts:74–79). Seit run4 in jeder QA-Runde notiert. Ein-Zeiler.
**Owner: ui-dev.**

### P4 · Kleinkram
- **`SlayerShopEntry.maxPurchases` (shared:2024) = defined-but-never-applied:** von keinem Content
  gesetzt, von Engine UND UI ungelesen — exakt unser bekanntes Bug-Muster als gestellte Falle: ein
  künftiger Eintrag mit `maxPurchases: 1` würde still ignoriert (∞ kaufbar). Implementieren (Kauf-Zähler
  + UI-Gate; erledigt nebenbei run7-P3 „Buy-Once-Schutz") oder Feld entfernen. Owner: logic-dev.
- **SlayerPage dupliziert Engine-Logik:** `executeCancelTask` (SlayerPage.tsx:115–120) = manuelles
  `spendSlayerPoints` + `state.slayerTask = null` statt `skipTask()`; daneben ein zweiter Button, der
  `skipTask` direkt ruft (Zeile 331) — zwei Pfade, gleiche Wirkung. Und der Fallback `skipCost ?? 30`
  (SlayerPage.tsx:84–86) ≠ Content-Wert 20 (toter Zweig). Owner: ui-dev, kosmetisch.
- **Turm-Etagen-Gate nur UI-seitig:** `startCombat` prüft nur das Item-Gate; das Slayer-Level-Gate der
  Etagen lebt allein in der Anzeige (CombatPage `unlockedTowerFloors`). Headless/Save-Edit könnte Floor 5
  bei S1 farmen — kein realer Spielerpfad, nur Doku-Notiz. Owner: combat-dev, optional.
- **Stale Kommentar** content:14409 („25 Varek-Tasks") — mit P2-1 erledigen.

---

## Ehrlicher Lauf Seed 66 (20 Sim-h, Rohdaten-Auszug)

Stundenverlauf (CL/Slayer/Tasks/Punkte/Tode): h1: 14/9/3/15/17 · h4: 23/27/5/5/46 · h10: 28/28/5/5/213 ·
h16: 31/33/8/0(+40 ausgegeben)/451 · h20: **32/34/8 Tasks/40 Pkt verdient/609 Tode**.
Tasks: rot_rat×41(4min) · plague_grub×42(10min) · rot_rat×28(6min) · bull_boss×31(18min) ·
goblin_butcher×20(12min) · SKIP tower_skeleton_warrior (28/33, †2) · goblin_warlock×31 (Slot ~10h
blockiert, bis CL reichte) · tower_skeleton_archer×27 · tower_goblin×49 · SKIP dust_vulture (6/40, †2).
→ Tasks/h 0,4 · Pkt/h 2,0 · Friction: 17,3h geparkt, plague_mask nie erreicht.
(Bot-Artefakt zur Ehrlichkeit: der 28/33-SKIP war eine dumme Bot-Heuristik — ein Mensch hätte fertig
gekämpft; reale Rate liegt also etwas höher, ändert die Größenordnung nicht.)

## Empfehlung

**Ship für die Mechanik** — Vergabe/Gates/XP/Skip/Shop sind korrekt und doppelt abgesichert.
**Fix-then-ship für die Ökonomie:** P2-1 (Preis/Rate-Rekalibrierung nach Master-Konsolidierung) und
P2-2 (Turm-CL-Filter ODER Früh-Skip-Gnade) vor dem EA-Release einplanen; P3-1/P3-2 als bewusste
Design-Entscheide zum Chef-Morgenreport; P3-3/P3-4 sind schnelle Content/UI-Einzeiler.
