# Grim Reach — technische Landkarte

<!-- codex:2026-09-09T20:12:15+02:00 -->
Architektur am 09.09.2026 gegen Paketdateien, Exporte und zentrale Verträge geprüft.
Versions-/Prüfstand steht in CURRENT; hier keine Releasefreigabe.

## Produkt

Veröffentlichtes Dark-Fantasy-Idle-RPG mit sichtbarem Auto-Kampf, drei Kampfstilen,
Skill-/Handwerksfortschritt, Offline-Erträgen, Instanzloot, Pets, Slayer, Dungeons,
Chronik/Quests und New Haven. Taverne ist im Code vorhanden, aber derzeit per
`TAVERN_ENABLED = false` deaktiviert. Vorhandener Code ist nicht gleich freigegebenes Feature.

`passion-project/**` (Kreidestadt) ist separat. Historische Paketnamen
`@hearthforge/*` bleiben bestehen.

## Architektur und Zuständigkeit

| Bereich | Zentrale Einstiege | Fachrolle |
| --- | --- | --- |
| Gemeinsame Verträge | `packages/shared/src/index.ts`: GameState, IDs, Locale, SAVE_VERSION, TICK_MS | logic-dev |
| Spielmechanik | `packages/engine/src/index.ts`, `tick.ts`, `state.ts`, `character.ts` | logic-dev |
| Kampf | `packages/engine/src/combat.ts`, Kampf-/Status-/Stiltests | combat-dev |
| Datenkatalog | `packages/content/src/index.ts`, `locales/` | content-dev |
| Save-Kompatibilität | `packages/persistence/src/index.ts`, `fixtures/save-compat/` | logic-dev |
| UI und Game-Adapter | `apps/client/src/renderer/App.tsx`, `game/GameContext.tsx`, `pages/` | ui-dev |
| Windows/IPC/Steam/Savedateien | `apps/client/src/main/`, `preload/`, `renderer/saves.ts` | platform-dev |
| Bildbestand/Loader | `apps/client/src/renderer/assets/`, Consumer/Resolver im Renderer | asset-integrator + ui-dev |
| Balance, Kanon, Gestaltung | jeweils relevante Quellen unter `design/`, `CODEX/work/` | balance-designer, lore-dev, art-director |

Engine nimmt Content als Parameter; keine Runtime-Abhängigkeit auf den konkreten Katalog.
Live- und Offline-Fortschritt laufen durch `advance` mit 100-ms-Ticks und serialisiertem RNG.
Plattform-I/O gehört nicht in die Engine. `computeStats` bündelt abgeleitete Werte.
Inventar und Bank besitzen aktuelle Slot-/Platzierungslogik; die alte Claude-Beschreibung
„Bank = Record<ItemId, number>“ ist kein gültiger Vertrag mehr.

## Toolchain und Prüfwege

- pnpm-Workspace: `packages/*` und `apps/*`, fünf Pakete über Turborepo.
- Root-Paket pinnt pnpm 9.15.9 und Node >=20.
- TypeScript, React 18, Electron 32, Vite 5/electron-vite 2, Vitest 2 laut Paketmanifesten.
  Installierte Versionen/Verfügbarkeit vor einer Änderung separat prüfen.
- `pnpm typecheck`: alle fünf Pakete.
- `pnpm --filter @hearthforge/engine test -- <testdatei>`: gezielter Engine-Test.
- `pnpm --filter @hearthforge/persistence test -- src/save-compat-vault.test.ts`: Save-Vault.
- `pnpm --filter @hearthforge/client build`: headless Build, kein App-Start.
- `apps/client/ui-audit/`: Fixture-/Browser-Prüfwerkzeuge; Isolation vor Ausführung prüfen.
- Vollsuite/Simulationen gezielt planen; nicht jede kleine Aufgabe mit Langläufen belasten.

## UI und Inhalte

Sieben Locales: en, de, zh, ru, es, pt-BR, fr. UI: `renderer/i18n/`; Content:
`packages/content/src/locales/`; Begriffe: `design/i18n-glossary.md`.
Spieltexte nicht in UI-Code hart codieren.

Ashen Iron und Bestandskomponenten sind maßgeblich. Rahmen, Slice-Werte und Hintergründe
am aktuellen Consumer prüfen. Die alte PROJECT-Aussage, Gravewood werde global zuletzt
importiert, ist nicht mehr zuverlässig und wurde entfernt.
Item-/Monster-/Petbilder werden vielfach per `import.meta.glob` und exakter ID aufgelöst;
zulässige Formate/Fallbacks immer am jeweiligen Loader prüfen.

## Quellen gezielt finden

- Jüngere Branch-Themen: `design/steam-post-1.2.4.txt` (Ankündigungstext, keine Freigabe).
- Frühere Rückkehransicht: `design/steam-post-1.2.3.txt`.
- Offene/verschobene Ideen: `design/offen-1.2.1.md` (historisch, gegen Code prüfen).
- Save-Gesetz: Vault-Tests und Migrationskette; historische Begründung in
  `.claude/memory-backup/save-compat-law.md`.
- Assets: `design/asset-anforderungen.md`, konkrete Briefs und die Konfliktregel in RULES.
- Kanon: `design/lore/`; frühere Rollen in `.claude/agents/` nur als Wissensarchiv.
