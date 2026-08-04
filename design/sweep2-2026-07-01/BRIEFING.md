# Sweep 2 — Briefing (Validierungs-Sweep nach großem Fix-Pass), 2026-07-01

**Projekt:** „Grim Reach" (G:\GameDev), dark-fantasy Idle-RPG in Steam-EA-Vorbereitung (Release 10.08).
**Auftrag:** Zweiter, breiterer QA-Sweep NACH einem großen Fix-Pass. Ihr validiert die Fixes **und** sucht
subtilere/neue Probleme in eurem Fokusbereich.

## Werkzeug — WIRKLICH spielen/inspizieren, nicht raten
- `packages/engine/src/sim-player.ts` — `SimPlayer` (echter headless Engine-Treiber). Schreibt ein kleines
  Vitest-Skript in `packages/engine/src/<name>.test.ts`, das SimPlayer nutzt, lasst es via
  `pnpm --filter @hearthforge/engine exec vitest run src/<name>.test.ts` laufen, **löscht es danach wieder**.
- `packages/engine/src/sim-personas.ts` (`runAllPersonas`), `sim-report.ts` (Finding-Format),
  `ui-audit-plan.md` (UI-Checkliste).

## GERADE GEFIXT — VERIFIZIEREN dass es wirkt (NICHT als neuen Bug melden)
Pfeil-Drops jetzt tier-nach-Monster-Level (kein iron_arrow auf Lv1; chicken→copper 3-8) · Magie-Waffen ohne
`runecrafting`-Equip-Gate (nur `magic_off`) · `dim_focus.value`=30 (Lv1-Gold-Loop zu) · `ach_quests_100`→75 ·
deutscher Achievement-Block echte Umlaute (ä/ö/ü/ß) · roher Pet-Token („gatherYield · onHitStatus") jetzt
übersetzt · Gift-Terminologie vereinheitlicht auf „Antigift" · Enchanting-Vorschau + Bestiarium lokalisiert/
echte Icons · Offline-Popup-Gold-Icon · Bank-Sortierung · Skilling-Rare-Toast · NaN-Guards auf Roh-Primitiven ·
Offline-Cap 8h · `activePlayMs` (Spielzeit ohne Offline) · toter `city`-Nav-Eintrag entfernt · tower_* slayerFloor.

## BEKANNT & AKZEPTIERT — NICHT melden
Offline-Farming-RNG-Divergenz (~0,05 %, für EA akzeptiert) · Onboarding-Schrittzahl (bewusst, Chef-Milestone) ·
Standard-Stance trainiert nur `attack` (Chef-Design-Entscheidung offen) · Endgame-Gold-Inflation (Chef-Balance) ·
9 „Bronze-Baseline"-Sim-Notes (7 zu-tanky Mid-Mobs + 2 Gold-only-Thieving — Chef-Balance-Domäne).

## Regeln
- NUR analysieren + berichten, **KEIN** Spiel-Code ändern (temporäres Test-Skript anlegen+löschen ist ok).
- Strukturierte Findings: `[Severity P0-P3][Kategorie bug|balance|ux|feel] Titel` + Repro-Schritte + erwartet vs.
  tatsächlich + Evidence (State-Dump/Datei:Zeile). Schwerste zuerst. „confirmed" vs „suspected" trennen.
- Balance/Design-Sachen sind Chef-Domäne → nur BERICHTEN, nicht fixen.
- Schreibe deinen Bericht nach `design/sweep2-2026-07-01/<deine Nummer+slug>.md`. Am Ende Kurz-Zusammenfassung
  (Findings je Severity + Top-3).
