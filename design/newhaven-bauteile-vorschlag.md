# Vorschlag: Bauteile statt Quest-Gates (New Haven)

*Chef-Idee 27.07.: „Vielleicht kann man das mit dem Woodcutting-Skill verbinden — dass man da
Hausteile aus Holz und Drop-Items herstellen muss. So können wir auch Housing-Items spezifisch
in die Gebiete verteilen auf dem Level, wo sie sein wollen, und so den Progress gaten."*
*Status: UMGESETZT (Task #366, 27.07.2026; Status-Korrektur 03.08.2026 nach Engine-Audit) — Bauteile + Stücklisten sind live im Content, die Zentralhaus-Quest-Gates sind gestrichen. Details: Nachtrag oben in `encampment-balance.md`; Wahrheit ist der Katalog `packages/content/src/index.ts`.*

## Das Problem, das die Idee löst

Der Sim-Report (`newhaven-sim-report.md`) hat ein Loch gemessen: Zentralhaus I gibt 4 Bauplätze,
und JEDE Stufe II hängt an Zentralhaus II, das an `chronicle_09` klebt. Ein Spieler vor Kapitel 9
baut sein komplettes Lager in **1,67 h** und hat dann einen arbeitslosen Bautrupp. Seit New Haven
ab Spielstart offen ist, klafft dieses Loch über die ganze Frühphase.

Quest-Gates sind hier das falsche Werkzeug: Sie sind eine **Erlaubnis**, keine **Aufgabe**. Der
Spieler wartet, statt zu arbeiten. Genau das ist die Beschwerde, die wir bei den Dungeon-Level-Locks
schon abgeräumt haben („so hart locken finde ich albern").

## Der Vorschlag

**Drei Bauteil-Stufen, hergestellt im Holzfällen-Skill, jede mit einem zonen-typischen Drop.**

| Bauteil | Skill-Level | Rezept (Beispiel-Anker) | Gatet |
|---|---|---|---|
| **Balken** (Beam) | Holzfällen ~15 | Eichenholz ×5 + früher Zonen-Drop | Stufe I aller Gebäude |
| **Verstrebung** (Brace) | Holzfällen ~45 | Schwarzholz ×5 + Mittel-Zonen-Drop | Stufe II |
| **Verankerung** (Anchor) | Holzfällen ~75 | Blutlärche/Schattenkiefer ×5 + Spät-Zonen-Drop | Stufe III |

Die Stufe eines Gebäudes verlangt dann N Bauteile der passenden Stufe — die Quest-Gates
(`chronicle_09`/`chronicle_14` am Zentralhaus) entfallen ersatzlos.

### Warum das besser ist als Quest-Gates
1. **Aufgabe statt Wartezeit.** Der Bautrupp steht nie still: Wer weiterbauen will, geht Holz
   schlagen und in die passende Zone kämpfen. Das ist Spielzeit statt Kalenderzeit.
2. **Die Zonen-Leiter gatet von selbst.** Ein Spät-Zonen-Drop ist erst erreichbar, wenn man dort
   überleben kann — Level-Gating ohne ein einziges Schloss.
3. **Holzfällen bekommt endlich eine Identität.** Heute ist der Skill ein reiner Zulieferer.
   Mit Bauteilen wird er der „Baumeister-Skill" — und das erklärt sich selbst.
4. **Die Zonen werden wichtiger.** Jede Zone bekommt einen Grund, wiederbesucht zu werden.
5. **Freies Tempo.** Ein Spieler, der New Haven liebt, kann vorziehen; wer die Story jagt,
   baut später — beides ist gültig.

### Der Kniff, der es billig macht: KEINE neuen Drops
Wir erfinden **keine** neuen Drop-Items und brauchen **keine** Loot-Table-Umbauten. Die
Item-Drop-Welle (0.2.2/0.3.0) hat bereits zonen-typische Materialien überall verteilt —
`shaman_totem`, `basilisk_scale`, `frost_pelt`, `dread_fang_shard`, `spider_silk` usw. Die
Bauteil-Rezepte konsumieren genau diese. Damit sind die einzigen NEUEN Dinge:

- **3 neue Items** (Balken / Verstrebung / Verankerung) → 3 Icons vom Chef
- **3 neue Holzfällen-Rezepte**
- **45 Stücklisten** um die Bauteil-Anforderung ergänzt (Zahlen-Edit, kein Struktur-Umbau)
- **2 Quest-Gates entfernt**

## Ehrliche Scope-Einschätzung (Release-Woche!)

| | |
|---|---|
| Aufwand | ~1 Agenten-Tag (Content + Balance-Kalibrierung + Tests) + Chef: 3 Icons |
| Risiko | mittel — greift in die 45 Stücklisten UND die XP-Ökonomie des Holzfällen-Skills ein |
| Feature-Freeze | Mi 30.07. 20:00 (Zielsetzung §5) — machbar, aber es ist der letzte große Einschnitt |
| Alternative bei Zeitnot | Nur die drei Sim-Korrekturen umsetzen (Zentralhaus-Slots, Zentralhaus II auf K4, Material-Tausch) und die Bauteile als **0.3.1-Feature** nachliefern |

## Offene Detailfragen (vor Umsetzung zu klären)
1. **XP-Ausschüttung:** Geben Bauteil-Rezepte Holzfällen-XP? (Empfehlung: ja, moderat — sonst
   fühlt sich der Skill-Level-Bedarf wie eine reine Steuer an.)
2. **Mengen:** Wie viele Bauteile je Gebäude/Stufe? (Empfehlung: 2–5 für Stufe I, 8–12 für
   Stufe II, 15–25 für Stufe III — so bleibt Bauzeit der Takt, nicht Materialfarmen.)
3. **Zentralhaus-Sonderrolle:** Braucht es eigene, teurere Bauteil-Mengen als die Nebengebäude?
4. **Rückwirkung:** Der Sim-Report empfiehlt Zentralhaus-Slots +6/+4/+4 — gilt weiter, die
   Bauteile ersetzen nur die QUEST-Gates, nicht die Slot-Ökonomie.
