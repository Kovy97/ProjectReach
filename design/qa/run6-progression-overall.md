# QA Run 6 — Gesamt-Progression L1→99 (Holistik-Linse: Neuspieler-bis-Endgame-Bogen)

**Playtester:** Progressions-/Holistik-Analyst (READ-ONLY — kein Spiel-Code/Content geändert)
**Datum:** 2026-06-28
**Linse:** Der **rote Faden** von Charaktererstellung bis 21×99. Fühlen sich die **Phasen-Übergänge** rund an? Gibt es **tote Stunden**, **unklare nächste Ziele**, **Motivations-Brüche**? Bewertet wird der **Gesamt-Spielfluss**, nicht eine Einzeldomäne (ergänzend zu den Phasen-/System-Linsen).
**Kontext Run 6:** nach Round-4-Parität + Slayer Phase 2 + Suffix-Sichtbarkeit + Instanz-Overflow-Fix.
**Methode:** Code-/Daten-Audit gegen die echte Engine (`packages/engine`, `packages/content`) + Quer-Lesung aller Run-5-Phasen-/System-Reports als Zeitachse + **gezielte Direkt-Verifikation** der vier Run-6-Prämissen-Fixes im Code. Ein Engine-Sim-Harness (`packages/engine/src/_progscan.test.ts`) wurde gebaut, lief im Sandbox-Umfeld aber zu langsam zum Abschluss (konkurrierende Last) → **nach dem Lauf wieder entfernt**, `packages/**` unverändert. Die Combat-Kette/Wall-Aussagen stützen sich daher auf die committete `sim.ts`-Logik + die belastbaren Run-5-Sim-Zahlen (Geared-Harness ist seit run5 auf `combatLevel:99` korrigiert, Zeile 167 — die run5-Fehlkalibrierung ist behoben).

---

## Fun-Score: **8,5 / 10**

Der Bogen ist **vollständig, stabil und über weite Strecken flüssig** — und Run 6 hat die zwei tiefsten Täler der run5-Zeitachse spürbar angehoben. Aber als **Gesamterlebnis** zerfällt der rote Faden klar in zwei Hälften: eine **dicht geführte, runde erste Hälfte** (L1→~50) und eine **goal-dünne, abflachende zweite Hälfte** (L50→99), an deren Ende ein **gerüsteter Held jeden Inhalt facerollt**. Das ist kein Defekt-Problem (0 P0, 0 Walls, 0 Crashes), sondern ein **Kurven-Problem der Motivation**: Das Spiel zieht einen stark hinein und lässt einen oben allein.

**Verifiziert gelandet (Run-6-Prämisse):**
- **Instanz-Overflow → Vault:** `intakeInstance` (enchant.ts 314+) leitet Overflow verlustfrei nach `bankInstances`, `vaulted`-Flag, **kein Phantom-Count**, Auto-Salvage-Filter aktiv. Der run5-Datenverlust ist zu. ✅
- **Suffix-Sichtbarkeit:** `SuffixBlock` (ItemTooltip.tsx 355+) rendert Suffix-Name **+ berechnete Stat-Zeilen**; Cell-Badge + Drop-Toast referenziert. ✅
- **Slayer Phase 2:** 4 Master (L1/30/55/80), 5 Turm-Etagen (L1–80), Shop bis **3000 Pkt** inkl. `slayer_helm` — die run5-Sackgasse (Shop endet 975/Slayer 60) ist geschlossen. ✅
- **manaCost-Kurve (Magie-Kern):** Top-Stab `manaCost 10` (run5: **24**), Wände monoton **4→8** — die run5-**Inversion** (teurere Wand = weniger DPS) und der Endgame-Mana-Choke (0,5× Melee) sind an der **Hauptursache** entschärft. ✅ (In-Band-Bestätigung steht noch aus — siehe P1.)
- **Meta-Capstone:** `ach_total_level_2000` „Vollständiger" existiert (run5-Hauptlücke „kein Ziel im letzten Skilling-Drittel" weitgehend geschlossen). ✅

**Nicht gelandet / weiterhin offen (die Score-Bremsen):** Endgame-Quest-Bogen fehlt, Endgame hat keine Wall, Quest-Führung endet zur Bogenmitte, `runecrafting` trainiert weiter kein Attribut. Details unten.

---

## Die Zeitachse als roter Faden (Synthese aus Run-5-Linsen + Run-6-Verifikation)

| Phase | Level | Run5-Score | Holistik-Befund Run 6 |
|---|---|---|---|
| **Start / Früh** | L1–15 | 8,0 | Rund: 3 Stile ab Sek. 1 spielbar, sofortige Quest-Kette. Reibung: Fernkampf-Köcher hart-stopp 155 s, Suffix-Drop unsichtbar, **erster Farm-Besuch leer** (0 Saat/Gold). |
| **Früh-Mitte** | L15–30 | 8,5 | Bester Übergang des Spiels — Skills + Dungeons (Goblin-Warband L12) + erste Sets greifen ineinander. |
| **Mitte** | L25–60 | **6,5** (Tiefpunkt) | **Run 6 angehoben:** Mana-Inversion + steiler manaCost waren der Haupt-Frust; beides gefixt. Magie-Roh-Schaden-Rebuff aber **nicht voll sim-bestätigt**. |
| **Spät-Mitte** | L50–75 | 7,5 | Solide, aber hier **versiegt die Quest-Führung** (s. P1) — der Spieler navigiert ab hier nur noch über Achievements. |
| **Endgame** | L75–99(+) | 7,5 | Reicher Content, **0 Walls** → Capstone `last_idol` (L120) fällt geared in **2,4 s**. Kein narrativer Pull, kein Gipfel. |

**Holistik-Diagnose:** Die **erste Hälfte ist eine 9** (geführt, dichte Übergänge, klare nächste Ziele), die **zweite Hälfte eine 7** (goal-dünn, abflachend). Der Score ist das Gewicht beider — und der Knick liegt **genau in der Bogenmitte (~L50)**, dort wo Quest-Scaffolding **und** Stil-Identität gleichzeitig nachlassen.

---

## Findings

### [P0] — keine
Kein blockierender Progressions-Defekt. 0 Walls (geared), 0 Crashes, 0 tote Stunden im Sinne von „Inhalt fehlt" — alle Phasen haben Content. Die Probleme sind **Motivations-/Führungs-Kurven**, keine Lücken.

### [P1 Holistik] Quest-Führung endet zur Bogenmitte — die hintere Hälfte ist „nächstes-Ziel"-still
**Befund (verifiziert):** Die höchsten level-zielenden Quest-Objectives im gesamten Katalog sind **`reach_skill_level` ≤ 50** und **`reach_total_level` ≤ 150** (alle reach_*-Objectives liegen in den frühen/mittleren Quest-Blöcken, index.ts 10194–10818). **Kein** Quest-Objective referenziert das Endgame (`last_idol`, Idol-Sanktum, Godiron-Forge — bestätigt: 0 Treffer in der `quests`-Sektion). Damit hat die **gesamte zweite Bogenhälfte (L50→99, der Rückweg jeder Skill-Leiste)** keinerlei quest-getriebenes „tu-dies-als-Nächstes". Der Spieler fällt zur Mitte aus dem geführten Korridor in reines Selbst-Setzen von Zielen (nur Achievements bleiben). Das ist der **größte einzelne Holistik-Bruch**: nicht fehlender Content, sondern fehlende **Führung** dort, wo die Sessions am längsten und am AFK-lastigsten werden.
**Fix-Richtung (content):** Quest-Kette über die hintere Hälfte ziehen — `reach_*`-Etappen bei total 300/600/1000/1500 + skill-L70/L90-Meilensteine, und ein **Endgame-Bogen** (s. P2) als narrativer Schlusspunkt.

### [P1 Balance/Identität] Magie-Reise über den ganzen Bogen — Ursache gefixt, In-Band-Stand unbestätigt + Attribut-Lücke bleibt
**Befund:** Run 5 maß Magie über die **gesamte** Achse monoton fallend (0,90 → 0,86 → 0,84 mid → **0,49× im Endgame**) — ein Stil, dessen Reise sich *verschlechtert*, das Gegenteil von Progressionsgefühl. Run 6 entschärft die **belegte Hauptursache** (manaCost-Top 24→10, Inversion weg). **Aber:** (a) die mid-game Roh-Schaden-Rückgabe (Roben/Wand-`magicDamage`-Teil-Rebuff) konnte ich **nicht** sim-bestätigen (Sim lief nicht durch), und (b) **`runecrafting` trainiert weiterhin kein Attribut** (skills-Def index.ts:31, kein `trains` — verifiziert), während `smithing→str` und `leatherworking→dex` ihren Kampfstil mit-pushen. Der Magier bleibt damit strukturell **int-untertrainiert** ggü. Melee/Ranged. Run-4-Reconciliation hatte `runecrafting trains:"int"` explizit als Hebel gelistet — **nicht gelandet**.
**Fix-Richtung:** `runecrafting trains:"int"` setzen (logic/content) + **Gegenprobe-Sweep** L30/55/75/99 fahren, sobald die Sim-Umgebung trägt, um zu bestätigen, dass Magie jetzt durchgängig ≥0,90× liegt und der **Level-Trend flach** ist (nicht weiter fällt).

### [P2 Holistik] Kein Endgame-Gipfel: gerüsteter Held facerollt alles, kein narrativer Pull
**Befund (run5-Sim bestätigt, in Run 6 unverändert):** Im gesamten Band L84–120 gibt es **0 Walls**; der Capstone `last_idol` (L120, regen 14, enrage ×1,75) stirbt geared in **2,4 s** wie ein Trash-Mob. Die `regen`-DPS-Checks (3–14/s) sind gegen 300–600 Spieler-DPS wirkungslos. Kombiniert mit P1 (keine Endgame-Quest): Der Höhepunkt eines ~100-h-Aufstiegs ist ein **führungsloses Faceroll-Plateau**. Das ist der Motivations-Bruch *am Gipfel* — der Moment, der den Aufstieg krönen müsste, hat weder Gate noch Story.
**Fix-Richtung:** ≥1 echter Wall-Encounter (max-HP-skalierter Schild/regen, DPS-Soft-Enrage-Timer, oder Stil-Resist) **plus** ein kurzer L70/85/99-Quest-Bogen, der auf Forge/Sanktum/Capstone zeigt. (Combat-FX bleibt laut Memory späterer Meilenstein — hier nur als Struktur-Gate, nicht als VFX.)

### [P2 Onboarding/Start] Frühspiel-Sackgassen am Einstieg (Farm leer, Köcher-Stopp, Suffix-Wow verpufft)
**Befund (run5 carry-over, unverändert):** `starterKit` gibt nur Nahrung → **erster Farm-Besuch zeigt 3 leere Plots, „keine Saat", 0 Gold** (state.ts 95–101, character.ts:89). Fernkampf-Köcher startet mit 60 Pfeilen, harter Combat-Stopp nach 155 s; renewable Pfeil-Quelle existiert, aber nur per Kampf-Unterbrechung (eine Aktion gleichzeitig). Erster Suffix-Drop ~1/375 Kills + kein Erst-Kontakt-Signal. Das sind kleine, aber **erste-Stunde**-Reibungen, die überproportional auf den Gesamteindruck wirken.
**Fix-Richtung (klein, content/logic/ui):** 3× `graywort_seed` (+ Mini-Gold) ins Starterkit; Start-Köcher 250–500 oder passives Pfeil-Bergen; früher garantierter Suffix-Drop + Toast/Highlight.

### [P2 Holistik] Spät-Skilling- & Suffix-Endgame-Belohnung dünn
**Befund:** `ach_total_level_2000` ist gelandet (gut) — der „Vollender"-Gipfel existiert jetzt. Offen bleibt eine **Belohnungs-Glättung** im letzten Drittel (zwischen 1500 und 2000 nur ein Sprung) und das **Suffix-Endgame ohne Oberfläche**: Endgame-Mobs droppen fast nur Material, höchster Suffix-`minIlvl=50` → ein L84- und ein L120-Drop ziehen aus demselben Pool, keine capstone-exklusive Identität. Der 8 %-Drop-Suffix-Pfad hat im Endgame faktisch keine Bühne.
**Fix-Richtung:** Halbschritt-Achievement (z. B. total 1800) + 3–4 capstone-Suffixe (`minIlvl 80/100`) + 1–2 low-chance Endgame-Equip-Drops in L96–120.

### [P3 Politur] Pet-Erstmeilenstein spät, 2H-Waffen Endgame-Durchsatzfalle, ember_robe-Craft-XP
**Befund (run5 carry-over):** Erstes `pets_owned`-Achievement erst bei 10/21 (frühe Pet-Jagd unbelohnt). 2H-Melee bei gemaxtem dex aIMs-Floor 800 ms → 2H ~0,58× von 1H trotz höherem Roh-Schaden (Build-Diversität bricht weg). `craft_ember_robe_*`-XP 15/17/18 (vermutl. Tippfehler, sollte ~150/170/180).
**Fix-Richtung:** `ach_pets_5`; 2H-Schadens-Premium oder separater 1H/2H-aIMs-Floor; ember_robe-XP an Tier-Kurve.

---

## Was fehlt für 9,5? — die 3 größten Hebel zu einem durchgängig ≥9,5-Bogen

1. **Die hintere Bogenhälfte führen (P1 Holistik) — größter Einzelhebel.** Quest-Scaffolding über L50→99 ziehen (`reach_*`-Etappen bis total ~1500 + skill-L70/L90) **und** einen narrativen **Endgame-Bogen** (L70/85/99 → Forge/Sanktum/Capstone). Heute fällt der Spieler zur Bogenmitte aus dem geführten Korridor — das ist die Quelle der „toten Stunden / unklaren nächsten Ziele" in genau den längsten Sessions. Dieser Hebel hebt Spät-Mitte **und** Endgame gleichzeitig.

2. **Einen echten Endgame-Gipfel bauen (P2).** Mindestens der Capstone muss einen gerüsteten Helden **fordern** (max-HP-skalierter Schild/regen, DPS-Timer oder Stil-Resist), gekoppelt an den Quest-Bogen aus Hebel 1. „Endgame" ohne jedes Gate ist ein gelöstes Spiel — der Aufstieg braucht eine Krönung, kein Faceroll-Plateau.

3. **Die Magie-Reise gleichwertig machen (P1 Balance).** Die manaCost-Inversion ist gefixt — jetzt `runecrafting trains:"int"` nachziehen und per Gegenprobe-Sweep bestätigen, dass Magie über **alle** Checkpoints ≥0,90× liegt und der Level-Trend **flach** ist. Solange ein Drittel der Spieler einen Stil spielt, dessen Reise sich verschlechtert, ist der Gesamt-Bogen nicht für alle ein 9,5.

> Hebel 1+2 schließen den „abflachende zweite Hälfte"-Knick (8,5 → ~9,2); Hebel 3 + die P2/P3-Politur (Starterkit-Sackgassen, Suffix-Endgame, Pet-/2H-Feinheiten) tragen auf durchgängig ≥9,5.

---

## Kein-Befund / bewusst nicht bewertet
- **Combat-FX/Juice, großer geführter Tutorial-Flow, Sidebar-Design-Rollout** — laut Memory bewusst spätere Meilensteine, hier nicht bewertet (Endgame-Wall oben ist als **Struktur-Gate**, nicht als VFX gemeint).
- **Economy-City-Deckel (~8)** — bekannt/ehrlich deferred (run5), kein neuer Holistik-Befund.
- **Stabilität/Defekte:** Die vier Run-6-Prämissen-Fixes sind im Code verifiziert gelandet; keine Regression im geprüften Pfad gefunden.
- **Methoden-Limit (Konfidenz):** Combat-Durchsatz-/Wall-Aussagen stützen sich auf run5-Sim-Zahlen + committete `sim.ts`-Logik, **nicht** auf einen frischen Voll-Sim (Umgebung lief nicht durch). Die Magie-In-Band-Bestätigung nach den Run-6-manaCost-Fixes steht damit aus (P1) — die *Richtung* (deutliche Verbesserung) ist über die direkt verifizierten manaCost-Werte aber belegt.
