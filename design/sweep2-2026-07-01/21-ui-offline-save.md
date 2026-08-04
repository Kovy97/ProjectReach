# Sweep 2 — Offline-/Save-UI (Bereich 21)

**Fokus:** Offline-Popup · Save-Übersicht (Hauptmenü) · Optionen (Sprache/Scale/Export-Import).
**Modus:** headless — Typecheck/Build/Persistenz-Tests + Code-Audit (kein Electron, kein Code geändert).
**Verdikt:** **ship** für den Fokusbereich. Keine P0–P2. Nur 3 P3-Kosmetik/Edge-Notizen.

---

## Gate-Status
| Gate | Ergebnis |
|---|---|
| Client-Typecheck (`tsc --noEmit`, apps/client) | ✅ PASS (exit 0) |
| Persistenz-Tests (save/offline, `@hearthforge/persistence`) | ✅ 70 passed (inkl. `mid-gather-8h`-Roundtrip) |
| Client-Build (`@hearthforge/client build`) | ✅ built in 9.76s (exit 0) |
| Repo-weiter `pnpm typecheck` | ⚠️ ROT — **aber nur** durch fremde, gerade laufende Sweep-Scratch-Tests |

**Zur roten Repo-Typecheck (WICHTIG, nicht mein Bereich, kein Ship-Blocker für die UI):**
`pnpm typecheck` bricht in `@hearthforge/engine` ab, ausschließlich in **temporären `*.test.ts`-Scratch-
Dateien**, die andere Sweep-Agenten JETZT parallel schreiben (Zeitstempel 15:24–15:27 = diese Session):
`_droptable_audit.test.ts`, `_kontrolleur_slayer_dungeon.test.ts`, `midgame-dump.test.ts`,
`zz-ranged-sweep.test.ts` (+ weitere `*-sweep`/`*probe`/`_naming_audit`). Kein Shipping-Code betroffen.
→ Prozess-Hinweis an die CEO: die verantwortlichen Agenten müssen ihre Test-Skripte laut Briefing wieder
löschen; sonst bleibt die Typecheck-Gate rot. **Combat-/Logic-Dev-Domäne, nicht Offline/Save-UI.**

---

## Verifizierte Fixes (wirken — NICHT als neue Bugs melden)

- **Offline-Popup Gold-Icon** — `icon_goldcoin.png` existiert unter `assets/icons/`, `getUiIcon("icon_goldcoin")`
  löst auf. Gold-Zeile: `OfflinePopup.tsx:50-60`, Emoji-Fallback 🪙 vorhanden.
- **Skill-Icons inkl. Kampf** — alle 7 Kampf-Skills haben ein `assets/skills/*.png`
  (attack, power, defence, ranged, magic_off, magic_def, vitality). Sammel-/Verarbeitungs-Skills fallen sauber
  auf `getSidebarIcon` zurück. **Alle 21 Content-Skills sind abgedeckt** — kein leeres Icon im Popup.
  Auflösung: `OfflinePopup.tsx:34` `getSkillIcon(id) ?? getSidebarIcon(id)`.
- **Korrekte Erträge** — `deserialize` (persistence/index.ts:958-993) bildet die Differenz vor/nach dem
  Offline-Catch-up: `gold`, `xp` (gesamt), `skillXp` je Skill (mit `levels`) und `items`. `inventoryCounts`
  zählt Inventar **+ Bank + bankInstances** → auto-gebankte Idle-Erträge & Gear-Vault-Drops gehen nicht verloren.
- **8h-Cap** — `MAX_OFFLINE_MS = 8h` (shared/index.ts:26). Gedeckelt in `deserialize` (`Math.min(now-savedAt,
  MAX_OFFLINE_MS)`) UND im Live-Loop nach OS-Sleep (`GameContext.tsx:192`). Popup zeigt `formatPlaytime(o.ms)`
  mit der bereits gedeckelten Zeit → konsistent, nie > „8h 0m".
- **`activePlayMs` (Spielzeit ohne Offline)** — Live-Loop zählt hoch (`step` mit `offline=false`),
  Offline-Catch-up NICHT (`advance(..., {offline:true})`, tick.ts:216-220). Summary speist die „played"-Zeile
  (`summarize` persistence:851; `MainMenu.tsx:92` mit `?? elapsedMs`-Fallback für Alt-Saves).
- **Save-Übersicht breiter** — `.menu-panel` max-width 780px (character.css:650), Slot-Meta einzeilig
  (`white-space:nowrap` + ellipsis), Portrait/Level/Datum vorhanden (`MainMenu.tsx:75-96`); fehlt das Portrait,
  greift der Slot-Index als Fallback.
- **Toasts-„leeres-Hauptmenü"-Regression** — behoben: `Toasts` (nutzt `useGameState()`, wirft ohne Spiel) ist
  jetzt **innerhalb** `MainLayout` gemountet (`App.tsx:303`), nicht mehr an der App-Wurzel.

## i18n-Parität (Fokus-Screens)
Alle verwendeten Keys existieren in **en UND de**: `offline.*` (title/duration/xpShort/lvlShort/items/collect),
`sidebar.gold`, `menu.*` (fontBtn/deleteConfirm/totalLevel/played/last/load/delete/empty/new),
`options.*` (display/fullscreen/uiScale/language/audio/gameplay/help/saveData/export*/import*),
`about.*`. Keine fehlende Übersetzung, keine roher Token im Fokusbereich.

## UI-Crash-Gate (Fokus)
Alle 21 `useGameState()`-Verbraucher rendern nur unter `MainLayout` (Seiten über `PageContent`, plus
`Toasts`/`PetCelebration`/`Sidebar`/`GameStats`). Einzige App-Wurzel-Overlay ist `ItemTooltipOverlay` →
nutzt das null-tolerante `useGameStateMaybe`. `MainMenu`/`CharacterCreation` (Menü/Creation) rufen `useGameState`
NICHT auf. `OptionsPage` (`useGameState()` für `settings.autoBank`) läuft nur im Playing-Layout. → sauber.

---

## Findings

### [P3][ux] `activePlayMs` zählt OS-Sleep-Zeit als aktive Spielzeit (suspected)
`GameContext.tsx:188-201`: Der Live-Loop ruft `advance(state, content, dt)` mit `dt = min(now-last,
MAX_OFFLINE_MS)` und **ohne** `offline`-Flag. Bleibt das Spiel offen, während das OS suspendiert, springt
`now-last` beim Aufwachen hoch → bis zu 8h werden mit `offline=false` nachsimuliert und in `activePlayMs`
gezählt. Damit überzählt die „played"-Zeit im Menü genau die Sleep-Zeit (gedeckelt auf 8h/Aufwachen).
Erwartet: Sleep-Aufholzeit ist keine aktive Spielzeit. Tatsächlich: wird als aktive Zeit gebucht.
Trade-off-Notiz: derselbe dt-Cap verhindert korrekt die Endlos-Aufhol-Sim/Cap-Umgehung — ein Fix müsste den
Überschuss im Live-Loop als offline behandeln. **Owner: Logic-Dev.** Geringe Auswirkung, kosmetisch.

### [P3][ux] Tote i18n-Keys `offline.xpGained` / `offline.goldGained` (confirmed)
`translations.ts:27-28` (en) / `903-904` (de). Vom aktuellen `OfflinePopup` nicht mehr benutzt (ersetzt durch
die Pro-Skill-Aufschlüsselung + `xpShort`/`lvlShort`). Harmlos, nur Aufräumen. **Owner: UI-Dev.**

### [P3][ux] Tote CSS-Klassen `.offline-stats` / `.offline-stat` (confirmed)
`modals.css:347-357`. Vom aktuellen `OfflinePopup`-Markup nicht referenziert (Popup nutzt `.offline-skill-*`).
Harmlos, nur Aufräumen. **Owner: UI-Dev.**

---

## Kurz-Zusammenfassung
- **P0:** 0 · **P1:** 0 · **P2:** 0 · **P3:** 3 (2 confirmed Kosmetik, 1 suspected Edge).
- **Top-3:**
  1. (Prozess, nicht Fokus) Repo-`pnpm typecheck` ist ROT durch fremde, laufende Sweep-Scratch-`*.test.ts`
     in `packages/engine` — die betreffenden Agenten müssen aufräumen; Client-Typecheck/Build sind grün.
  2. `activePlayMs` überzählt OS-Sleep-Zeit (P3, Logic-Dev).
  3. Tote i18n-Keys + tote CSS im Offline-Popup (P3, UI-Dev, reines Cleanup).
- **Empfehlung Fokusbereich:** **ship** — Offline-Popup, Save-Übersicht und Optionen sind funktional,
  ikonografisch vollständig, i18n-paritätisch und crash-sicher gemountet.
