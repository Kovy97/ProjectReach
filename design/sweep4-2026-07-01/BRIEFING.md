# Sweep 4 — Briefing (15 Agenten: 13 Skill-Deep-Dives + 2 neue Blickwinkel), 2026-07-01

**Projekt:** „Grim Reach" (G:\GameDev), Dark-Fantasy-Idle-RPG, Steam-EA (Release 10.08).
**Auftrag (Chef):** Weil tiefe Tests immer noch Fehler finden — neue Runde mit **neuen Zielen**, v.a.
**ein Agent pro Skill**, der **diesen einen Skill ausgiebig durchtestet UND benotet.** Combat wurde in
Sweep 3 schon tief abgedeckt → hier Fokus auf die 13 Nicht-Kampf-Skills + 2 unentdeckte Blickwinkel.

## SO TESTEN — WIRKLICH SPIELEN
- `packages/engine/src/sim-player.ts` — `SimPlayer` (echter headless Engine-Treiber). Schreib ein kleines
  Vitest-Skript in `packages/engine/src/<slug>.test.ts`, treibe deinen Skill L1→99 über echte Aktionen
  (Sammeln↔Verarbeiten, ausrüsten, `advanceTime`), miss echte Werte, **lösch das Skript danach wieder.**
- Harness-Footguns (aus Sweep 3, beachten!): food-Stack-Spill füllt Inventar (MAX_STACK 999);
  `fightFor().kills` war kumulativ (jetzt Delta); Tode via `state.stats.deaths`; Bogen akzeptiert nur
  eigenen `ammoType`. Inputs ggf. via `SimPlayer.give()` bereitstellen, dann ist die Verarbeitungs-Seite sauber.

## DEIN AUFTRAG (Skill-Agenten): diesen EINEN Skill L1→99 durchspielen und BEWERTEN
Miss + beurteile konkret:
1. **XP/h-Kurve** L1→99: monoton steigend auf der Level-Linie? Tote/regressive Tiers? Beste vs schlechteste Aktion je Band.
2. **Freischalt-Takt:** gibt es auf jedem Level-Abschnitt etwas Neues (Aktion/Item/Tier), oder lange Leerläufe?
3. **Werkzeug-/Upgrade-Progression:** Spitzhacke/Axt/Rute/… bzw. Tier-Materialien — sauber gestaffelt, spürbar?
4. **Drops + Skill-Pet:** droppt der zugehörige Pet wirklich über den echten Pfad? Bonus-Drops sinnvoll?
5. **Gold/Ökonomie:** lohnt sich der Skill (Gold/h, Materialwert, Sinks)? Exploit-frei?
6. **Mastery:** Mastery-XP/Level-Belohnungen des Skills spürbar/lohnend?
7. **Feel/„lohnt es sich?":** VERGIB EINE NOTE (A–F) für den Skill + 2–3 Sätze warum (Engagement, Klarheit, Reibung).
8. **Verbesserungs-Vorschläge** mit konkreten Zahlen (Balance ist Chef-freigegeben — Soll-Werte erwünscht).

## Neue Blickwinkel (2 Agenten)
- **Reiner Skiller ohne Kampf:** Spiele bewusst OHNE Kämpfen. Kommt man voran? Gibt es harte Combat-Gates
  (Mats/Gold/Freischaltungen, die Kämpfen erzwingen)? Ist es als „Idle-Skiller" befriedigend? Was fehlt?
- **Mastery-System-Tiefenprüfung:** Die Mastery-Ebene über ALLE Skills — Kurve, Belohnungs-Schwellen,
  spürbarer Nutzen, ob Mastery ein sinnvoller Langzeit-Anreiz ist oder unsichtbar verpufft.
- **Der „100 %-Completionist":** versucht das Spiel VOLL zu completen — **alle Skills auf 99, alle
  Achievements, alle Quests.** Ziel = jeden **100 %-Blocker** finden. Method-Mix (echtes Grinden aller
  Skills bis 99 sprengt die Sim-Zeit): (a) **statische Erreichbarkeit** — ist JEDE Achievement-Bedingung
  erfüllbar, JEDE Quest abschließbar, kann JEDER Skill (13 Nicht-Kampf + 7 Kampf) via verfügbarer Aktionen
  99 erreichen? (b) **Forced-State-Sim** — setze Skills/Flags auf Endzustand, prüfe dass nichts in eine
  Sackgasse führt (z.B. Achievement das ein entferntes Item/Feature verlangt, Quest die einen nicht mehr
  existierenden Gegner braucht, Skill ohne Aktionen für ein Level-Band). (c) **Spot-Sim** repräsentativer
  Pfade. Liste JEDEN Blocker (Achievement-ID/Quest-ID/Skill + Grund). Bestätigt zugleich ach_pets_all/
  ach_sets_all/witherling-Fixes. Owner-Tags für jeden Blocker.

## GERADE GEFIXT (Sweep 3) — falls berührt, bestätigen (nicht neu melden)
Balance-Parität ±10 % L1-90; witherling-Farming-Pet dropbar; dim_essence-Loop tot; aether_essence früher;
duskcap L56 + gemstone_amulet L26 Füller; Starter-Köcher 300; Pfeil-Ranged-Reqs.

## BEKANNT & AKZEPTIERT — NICHT melden
0 echte Walls; „Bronze-Baseline"-Anomalien (undergeared Worst-Case); endgame gold/XP-Inflation.

## Regeln
- NUR analysieren/spielen + berichten, **KEIN** Spiel-Code ändern (Test-Skript anlegen+löschen ok, sonst clean).
- Strukturierte Findings: `[Severity P0-P3][Kategorie bug|balance|ux|feel] Titel` + Repro + erwartet vs.
  tatsächlich + Evidence (Zahlen/Datei:Zeile). Schwerste zuerst. „confirmed" vs „suspected".
- **Am Ende: Skill-NOTE (A–F) + Top-3-Findings + Top-3-Verbesserungen.**
- Bericht → `design/sweep4-2026-07-01/<nr>-<skill>.md`.
