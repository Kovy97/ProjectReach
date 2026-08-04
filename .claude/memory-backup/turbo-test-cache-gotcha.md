---
name: turbo-test-cache-gotcha
description: "Beim Verifizieren kann `pnpm test` ein altes (kaputtes) Ergebnis aus dem Turbo/Vite-Cache replayen — Cache leeren oder direkt per --filter laufen."
metadata: 
  node_type: memory
  type: reference
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-22T17:07:57.208Z
---

Das Monorepo cached Test-Läufe (Turborepo + Vite/Vitest-Transform-Cache). Ein **fehlgeschlagener `pnpm test`** (z.B. aus einem transienten kaputten Zwischenzustand wie einem `\`-statt-`//`-Tippfehler, der den Transpile vergiftet) wird bei Folge-Läufen **aus dem Cache replayed** — selbst nachdem die Quelle gefixt ist. Verräter: **identische Test-Dauer** (z.B. exakt 518,82s) bei wiederholtem Lauf.

Symptom 2026-06-25: `ReferenceError: safeInterval is not defined` blieb rot in `pnpm test`, obwohl typecheck+build grün und die Quelle korrekt war.

**How to apply:** Bei widersprüchlichem Verifikations-Ergebnis (typecheck/build grün, aber `pnpm test` rot — oder verdächtig identische Dauer) zuerst Cache leeren: `rm -rf .turbo node_modules/.cache/turbo node_modules/.vite packages/*/node_modules/.vite`, und/oder direkt `pnpm --filter @hearthforge/engine test` (umgeht den Turbo-Replay). Erst dann dem Ergebnis trauen.

**Zweite Falle (gefunden 2026-07-22): `pnpm test --force` ist ein STILLER NO-OP.** pnpm reicht `--force` ans Test-Skript weiter (nicht an Turbo), druckt „ERROR Unknown option: 'force'" — und **beendet sich trotzdem mit Exit 0, ohne einen einzigen Test zu laufen**. In einer `&&`-Kette läuft der Folgeschritt weiter und der Gesamtlauf sieht grün aus. Korrekt ist **`pnpm exec turbo run test --force`**. Generell: Exit-Codes verketteter Verifikations-Läufe NIE ohne Blick in die tatsächliche Ausgabe glauben (Task-Zeilen „X successful, 0 cached" müssen sichtbar sein).
