---
name: overnight-ceo-run
description: Aktiver autonomer CEO-Loop — Status/Masterplan im Repo
metadata:
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Aktiver Abwesenheits-CEO-Loop (gestartet **2026-06-29**, ~12 h, bis ~21:00). Chef abwesend, hat volle
CEO-Entscheidungsgewalt erteilt: 10-Tester-Sweeps fahren + Feedback eigenständig in Fixes umsetzen,
immer grün halten, periodisch Playtest-ZIP bauen, keine Rückfragen — sichere Defaults + dokumentieren.

Masterplan + Iterations-Log + Backlog = SOURCE OF TRUTH in `G:\GameDev\design\overnight-ceo-plan.md`
(Tester-Funde in `design/tester-sweep-2026-06-28.md`). Bei zusammengefasstem Kontext dort weiterlesen.

content/index.ts = EINE Datei → Content-Edits SERIELL (nur ein content-dev). Jede Welle grün
verifizieren (typecheck alle + engine[ohne sim]/persistence + build), Save-Logik mitziehen.
Verknüpft mit [[turbo-test-cache-gotcha]], [[always-update-save-logic]], [[tester-sweep-budget-ok]].
