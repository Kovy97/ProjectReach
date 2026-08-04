---
name: tester-sweep-budget-ok
description: 180€ Max-Abo aktiv → volle 10-Agent-Tester-Sweeps sind budget-OK
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-25T21:51:01.952Z
---

Chef (2026-06-27): Wir haben das **180€-Abo** → parallele **10-Tester-Agent-Sweeps** sind leistbar.

**How to apply:** Bei Tester-/QA-Loops ruhig die **volle Persona-Breite (~10 Agents parallel)** fahren statt aus Kostengründen auf wenige zu reduzieren (früher 4). **Timing:** nur an STABILEN Checkpoints (nach Feature-Landung, Build grün) — NICHT mitten in einem laufenden Engine/Content-Umbau, sonst fehlt den Testern ein konsistenter Stand. Siehe [[overnight-ceo-run]].

**Update 25.07. (Chef-Auftrag #351):** Tester-Bots laufen jetzt über das gekapselte Toolkit `apps/client/ui-audit/bot.mjs` (deklarative Kommandos, JSON-Ergebnis, Anleitung `ui-audit/BOT-GUIDE.md` — für schwächere Modelle geschrieben, Quickstart ~24s). Tester-Agenten dürfen deshalb auf **Opus-Klasse** laufen (Chef-Wunsch, spart massiv); Prompt-Regel: NUR bot.mjs + BOT-GUIDE.md, kein eigener Playwright-Code. Befund-URTEILE weiter Fable ([[tiering-urteil-nur-fable]]).
