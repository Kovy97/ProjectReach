---
name: stack-and-architecture
description: Tech stack and core architecture for the Hearthforge Idle game project
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

**Hearthforge Idle** (working title) — ein RPG-Idle-Spiel à la Melvor Idle, aber bewusst "besser"/anders gestaltet. Ziel: Steam-Release über Electron. Multiplayer-Elemente sollen perspektivisch möglich bleiben (server-autoritativ).

**Kern-Architektur-Prinzip:** Engine und UI strikt getrennt. `packages/engine` ist reines, deterministisches TypeScript ohne DOM/Electron. Deterministischer, serialisierbarer RNG (mulberry32). Feste Tick-Schrittweite (`TICK_MS = 100`, 10 Ticks/s) über `advance(state, content, dtMs)` — dieselbe Funktion treibt Live-Loop UND Offline-Fortschritt. Das ermöglicht Offline-Progress, Reproduzierbarkeit/Tests, und späteren MP ohne Rewrite.

**Stack:** TypeScript (strict, verbatimModuleSyntax, noUncheckedIndexedAccess) · pnpm-Monorepo + Turborepo · Vite · Electron via electron-vite · React 18 · Vitest. pnpm wurde per `npm i -g pnpm@9` installiert (Corepack scheiterte an Admin-Rechten für `C:\Program Files\nodejs`). Node v22.

**Monorepo-Struktur:** `packages/{shared,content,engine,persistence}` + `apps/client` (+ später `apps/server`). Interne Pakete werden als TS-Quelle eingebunden (`exports: "./src/index.ts"`, kein Build-Schritt im Dev). engine importiert nur shared (bekommt ContentDB als Argument, importiert content NICHT zur Laufzeit → bleibt pure).

**Entscheidungen des Users:** UI-Framework = React (gegen Svelte/Vue/Solid). Content data-driven. Steam-Anbindung später via `steamworks.js`. Electron-Client-Package hat bewusst KEIN `"type": "module"`, damit main/preload als CJS bauen und `__dirname` funktioniert; Renderer-`build.outDir` ist explizit auf `out/renderer` gesetzt (sonst landet er fälschlich im Repo-Root).

Status (Stand 2026-06-22): Gerüst steht und ist verifiziert — Tests grün, typecheck sauber, Electron-Build erfolgreich. Spiel-Design (Skills, Combat, Loot, Abgrenzung zu Melvor) ist noch NICHT besprochen. Aktueller Demo-Content: nur Woodcutting mit 2 Aktionen. Siehe [[game-design]].
