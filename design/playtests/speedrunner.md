# Playtest: „Der Speedrunner / Rusher"

**Persona & Spielstil:** Ich will auf dem schnellsten Pfad ins Endgame (combat L90+, godiron-Gear,
`idol_sanctum`). Ich skippe alles „Unnötige", wechsle Mob/Aktion sobald sich's lohnt, und werde
sofort genervt von Bottlenecks, Grind-Walls und Gating, das mich künstlich aufhält.

**Methodik:** Engine direkt angesteuert (deterministisch, kein UI). Wegwerf-Tests
`_playtest_speedrunner*.test.ts`. Gemessen: XP/h, Gold/h, Zeit bis combatLevel-Meilensteinen,
Gating-Quellen (Keys/Gear) per Content-Audit. Alle Zahlen unten sind aus der echten Engine
(XP-Tabelle, combatLevel-Formel, Drop-/Shop-Tabellen) oder kurzen Sim-Läufen.

---

## Was ich gespielt habe (Verlauf)
1. Start → 1–2h Holz fällen → logs verkaufen → bronze_sword + Essen (das ist der einzige sinnvolle Startpfad, Gold kommt sonst nirgends her).
2. Goblin-Dauergrind (power-Stil), Hochrechnung Richtung combat L90/100.
3. Content-Audit: Wer dropt die Dungeon-Keys? Welche Gear-Tiers sind erreichbar? Wo sitzt `idol_sanctum`?

---

## Pacing-Messungen (konkret)

### XP-Kurve (aus `leveling.ts`, MAX_LEVEL 120)
| Level | Gesamt-XP | Level | Gesamt-XP |
|------|-----------|------|-----------|
| L10  | 1.154     | L90  | 5.346.332 |
| L30  | 13.363    | L100 | 14.391.160 |
| L50  | 101.333   | L105 | 23.611.006 |
| L65  | 449.428   | L120 | 104.273.167 |

### Goblin-Grind, power-Stil (gemessen, 100h-Lauf, Seed 7)
- **Kills:** ~1.152/h · **power-XP:** ~20.845/h · **Gold:** ~6.911/h · Deaths: 0
- Hochrechnung **ein** Skill: power **L90 ≈ 256h (11d)**, power **L100 ≈ 690h (29d)** reines Idle.
- Aber: nach 101h Grind ist `combatLevel` erst **25** — obwohl power schon **L80** ist!

### combatLevel-Decke (mathematisch, aus `combatLevel = round(avg der 7 Kampf-Skills)`)
Die 7 Skills: `attack, power, defence, ranged, magic_off, magic_def, vitality`.
Melee-XP routet **nur an EINEN** der drei Melee-Skills (aktiver Stil) + vitality. ranged/magic bleiben bei L1.

| Build | erreichbarer max combatLevel |
|------|------------------------------|
| Reiner 1-Stil-Melee (1 Skill + vit hoch, 5 @ L1) | **avg = (120·2+5)/7 = 35** |
| Melee, alle 3 Melee-Skills + vit auf 120 (ranged/magic tot) | **avg = (120·4+3)/7 = 69** |
| 6 Skills auf 120, nur magic_def @ L1 | avg = (120·6+1)/7 = 103 |
| Alle 7 auf 120 | 120 |

➡️ **combatLevel 100 (= `idol_sanctum`-Gate) ist als reiner Melee/Ranged/Magic-Spieler MATHEMATISCH UNMÖGLICH.**
Mit 3 toten Skills @ L1 müssten die 4 aktiven im Schnitt **174** sein — über dem Cap 120.

---

## Was sich gut anfühlt ✅
- **Rohe XP/Gold-Rate stimmt** für einen Einzel-Skill: 20k XP/h + 7k Gold/h auf einem L1-Mob ist großzügig und macht den Einstieg flott (L30 in ~Stunden, nicht Tagen).
- **Deterministisch & idle-freundlich** — ich kann lange Blöcke vorspulen, kein Mikromanagement-Zwang im Kampf.
- **Mob- und Skill-Vielfalt** ist da (free-world bis L75, viele Crafting-Tiers) — Material für ein echtes Endgame existiert.

## Was sich zu zäh / kaputt anfühlt ⚠️ (mit Zahlen)

### 🟥 WALL #1 — combatLevel-Formel killt den Speedrun komplett
`combatLevel` ist der **Durchschnitt aller 7 Kampf-Skills**, aber Kampf gibt XP nur an **einen** Stil-Skill
(+vitality). Als Rusher, der EINEN Stil pusht, bin ich bei **combatLevel ~35 hart-gewallt** — egal wie
lange ich grinde. Um auf das `idol_sanctum`-Gate (combatL100) zu kommen, muss ich **melee UND ranged UND
magic** auf je ~L100 bringen. Das ist das Gegenteil von „schnellster Pfad": es ist ~**6× die Grind-Zeit**.
Grobe Rechnung: 6 Skills × ~690h = **~4.140h ≈ 172 Tage** reines Idle — nur um die Tür zu erreichen.
Für den Rusher fühlt sich das wie ein Bug an, nicht wie Design.

### 🟥 WALL #2 — `idol_sanctum` Schlüssel ist ein Henne/Ei-Deadlock (engine-bestätigt)
- `idol_sanctum` braucht `idolhall_key`.
- **Einzige** Quelle von `idolhall_key`: Drop (6 %) von **`last_idol` (L120)**.
- `last_idol` spawnt **NUR als letzter Encounter INNERHALB `idol_sanctum`**.
- Nicht im Shop, nicht craftbar, **kein** freier-Welt-Mob L90+ existiert (Audit: „Freie-Welt-Mobs L90+: KEINE").
➡️ Man braucht den Key, um den Dungeon zu betreten, in dem der einzige Key-Dropper steckt. **Der finale
Dungeon ist aktuell unbetretbar.** Das ist ein echter Soft-Lock, kein Balance-Thema.

### 🟧 WALL #3 — Gear-Sprung: Shop endet bei Iron, Endgame nur über Crafting-Grind
Der Shop endet bei **iron_sword (240g) / iron_breastplate (320g)**. Alles darüber (steel → … → **godiron**)
ist NUR craftbar:
- `godiron`: `mine_godiron` braucht **Mining L105**, Schmieden braucht **Smithing L100–105**, Waffe braucht **attack 105**.
- Mining L105 = **23,6 Mio XP**. Zwischen Iron-Gear und godiron klafft eine riesige reine-Crafting-Grind-Lücke,
  die mit dem Kampf-Fortschritt **nicht** mitwächst. Der Rusher hat ab ~combatL40 nichts Kaufbares mehr und
  muss zwei weitere Skills (Mining+Smithing) auf ~L105 prügeln, bevor sich „bestes Gear" überhaupt bewegt.

### 🟧 Tote Wartezeit / Inventar-Stopp
Sammel-Aktionen (Mining etc.) stoppen bei vollem Inventar (`lastStop = inventory_full`). Für einen Rusher,
der lange Crafting-Blöcke vorspulen will, ist das ein stiller Hard-Stop, der den Idle-Fortschritt kappt,
ohne dass „etwas passiert" — pure Wartezeit ohne Belohnung, bis man manuell eingreift.

---

## Reibungspunkte & Frust (Speedrunner-Sicht)
- Mein Kern-Versprechen („such den effizientesten Pfad") wird von der combatLevel-Formel **bestraft**:
  Spezialisierung ist langsamer als Generalisierung. Das ist anti-idle und anti-rush.
- Ich kann das Endgame-Gate (combatL100) erreichen **wollen**, aber es ist als 1-Stil-Build **unerreichbar** — und das Spiel sagt es mir nicht.
- Selbst wenn ich combatL100 hätte: der Key existiert nicht beschaffbar ⇒ Endgame-Dungeon = Sackgasse.
- Gear-Progression entkoppelt von Kampf: ab Iron muss ich „das Spiel wechseln" (Gathering/Crafting), obwohl ich kämpfen will.

## Was fehlt für ein vollwertiges Spiel (Persona-Sicht)
- Ein **erreichbarer, lesbarer Endgame-Pfad**: „mach X, dann Y, dann Dungeon Z".
- **Free-world L90+ Mobs** als Key-/Material-Quelle außerhalb der gegateten Dungeons.
- Ein **Gear-Treadmill, der mit Kampf mitwächst** (Drops aus den Zwischen-Dungeons crypt/wildwood/highland statt nur Crafting).

---

## Konkrete Verbesserungs-Vorschläge (priorisiert)

**P0 — combatLevel-Definition fixen (blockiert das ganze Endgame).** Optionen:
   (a) `combatLevel` = Durchschnitt nur der **trainierten/relevanten** Skills (max(attack,power,defence) + ranged + magic_off + vitality), ODER
   (b) gewichteter Wert, der einen reinen 1-Stil-Build bis ~L100+ kommen lässt, ODER
   (c) Kampf-XP an **mehrere** Skills verteilen.
   Ohne das ist combatL100 unmöglich → `idol_sanctum` (req 100) tot.

**P0 — `idolhall_key` Henne/Ei auflösen.** Key auch außerhalb `idol_sanctum` droppen lassen
   (free-world L90+ Mob, z.B. ein neuer Boss in `idolhall`-Zone), ODER craftbar/kaufbar machen, ODER
   `idol_warden`/`aether_wraith` als freie Welt-Mobs mit Key-Chance einführen. (Gleiches Muster bei anderen
   Dungeons prüfen — generell: der einzige Key-Dropper darf nicht hinter seinem eigenen Key sitzen.)

**P1 — Gear-Lücke Iron→Endgame schließen.** Zwischen-Gear-Tiers über **Dungeon-Drops** liefern
   (crypt L30 → mithril, wildwood L34, highland L65 → adamantium/runite), damit Kampf-Fortschritt direkt
   Gear-Fortschritt bringt — nicht nur ein separater Crafting-Grind.

**P2 — `idol_sanctum` requiredLevel** an die tatsächlich erreichbare combatLevel-Decke anpassen (nach P0-Fix
   neu kalibrieren; aktuell req 100, aber selbst Generalisten kommen rechnerisch nur knapp drüber).

**P2 — Idle-Komfort:** Auto-Bank/Auto-Sell oder Verwerfen bei vollem Inventar während Sammeln, damit lange
   Crafting-/Mining-Blöcke nicht still abbrechen (tote Wartezeit eliminieren).

---

## Spaß-Bewertung: **3 / 10**
Die Sekunde-zu-Sekunde-Rate ist gut, aber als Speedrunner laufe ich in **zwei harte Walls** (combatLevel-Mathe
macht Spezialisierung unmöglich; Endgame-Key existiert nicht beschaffbar) und eine Gear-Lücke — das Endgame ist
aktuell schlicht **nicht erreichbar**, und genau das ist mein einziges Ziel.
