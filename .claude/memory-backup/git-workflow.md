---
name: git-workflow
description: "Seit 04.08. Git-Verwaltung über GitHub Kovy97/ProjectReach — Commit-Ritual nach verifizierten Wellen, Branches für Großbaustellen, gh-Keyring-Auth"
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-08-04T16:56:48.751Z
---

Seit 2026-08-04 wird G:\GameDev über Git verwaltet: Remote `https://github.com/Kovy97/ProjectReach.git`, Branch `main`, Auth über den eingeloggten gh-CLI-Keyring (Kovy97) — NIE Passwörter/Tokens in URLs oder Configs.

**Why:** Chef-Wunsch „Datensicherheit + Branches"; löst die bisherige Sicherungs-Krücke (CODEX/outbox-Prechange-Backups, codex:-Marker als Diff-Ersatz) ab.

**How to apply:**
- **Commit-Ritual:** Nach jeder VERIFIZIERTEN Welle (Typecheck/Suiten grün) committen + pushen — nicht mitten in kaputten Zwischenständen. Releases bekommen zusätzlich ein Tag (`v0.3.0` …). Commit-Fußzeile: Co-Authored-By Claude.
- **Branches:** `main` = stabiler/veröffentlichter Stand. Großbaustellen (z.B. 0.4.0-Arena) auf Feature-Branches (`feat/arena-040`), Merge nach Chef-Abnahme. Depot-Uploads nur von einem grünen Stand.
- **.gitignore-Schnitt (bewusst):** Builds (apps/client/release, out, out-verify), Testlauf-Ausgaben (ui-audit bot-runs/_shots/PNGs/WebMs), SDK/, steam/*.zip+output, .turbo, node_modules, und die schweren CODEX-Binär-Staging-Ordner (assets/AssetControl/CityAssets/NEW-HAVEN-*/backups/outbox — deren Sicherungszweck Git jetzt übernimmt; CODEX-DOKUMENTE inkl. inbox/HANDOFF/notes/work sind versioniert).
- **Mira/Codex:** committet selbst NICHT (Sandbox); ihre codex:-Marker bleiben als Urheber-Kennzeichnung, Claude committet ihre gelandeten Stände mit. Bei Wiederaufnahmen gilt: `git status/diff` ist jetzt die erste Integritätsquelle.
