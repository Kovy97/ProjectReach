# Hearthforge Idle

Ein RPG-Idle-Spiel (Working Title), inspiriert von Melvor Idle. Ziel: Steam-Release
über Electron, mit perspektivisch optionalen Multiplayer-Elementen.

## Architektur-Prinzip

**Engine und UI sind strikt getrennt.** Die Spiel-Logik (`packages/engine`) ist reines,
deterministisches TypeScript ohne DOM- oder Electron-Abhängigkeit. Das ermöglicht:

- **Offline-Fortschritt** durch schnelles Durchlaufen derselben Tick-Funktion
- **Determinismus** via serialisierbarem, geseedetem RNG → reproduzierbar & testbar
- **Multiplayer** später: dieselbe Engine läuft server-autoritativ im Node-Backend
- **Balance-Tests** durch automatisierte Simulation

## Struktur (pnpm-Monorepo)

```
packages/
  shared/       Gemeinsame Typen & Konstanten (TICK_MS, GameState, ContentDB …)
  content/      Spieldaten: Skills, Items, Aktionen (data-driven)
  engine/       Pure-TS Engine: Tick-Loop, RNG, Leveling, Combat …
  persistence/  Save/Load-Format, Offline-Berechnung, Migrationen
apps/
  client/       Electron + React (Steam-Build & Web-Build aus demselben Code)
  server/       (später) Multiplayer-Backend — importiert dieselbe Engine
```

Interne Pakete werden als TypeScript-Quelle eingebunden (kein Build-Schritt im Dev).

## Befehle

```bash
pnpm install        # Abhängigkeiten installieren
pnpm dev            # Electron-Client im Dev-Modus starten
pnpm test           # Engine-Tests (Vitest)
pnpm typecheck      # Typprüfung über alle Pakete
pnpm build          # Produktions-Build
```

## Stack

TypeScript · pnpm + Turborepo · Vite · Electron (electron-vite) · React · Vitest

Steam-Anbindung später über `steamworks.js` (Achievements, Cloud Saves).
