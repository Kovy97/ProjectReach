# Sweep 2 — Bericht 19: UI Meta-Seiten (Achievements / Mastery / Skills-Overview / Stats)

**Fokus:** Layout, echte Icons, Fortschrittsanzeigen, Spielzeit (`activePlayMs`, ohne Offline),
deutsche Umlaute auf Achievement-Karten, Overflow, Emoji-Reste, i18n-Parität.
**Methode:** Read/Grep der 4 Seiten + i18n + Icon-Loader + Assets; temporäres Engine-Probe-Skript
(`_meta_ui_probe.test.ts`, gelaufen & wieder gelöscht) für harte Zahlen. Headless, kein Electron.

---

## Verifizierung der „GERADE GEFIXT"-Punkte (wirken — NICHT als neue Bugs gemeldet)

- **`activePlayMs` (Spielzeit ohne Offline): solide.** Init `state.ts:27` = 0; Migration
  `persistence/index.ts:829-830` (fehlend → `elapsedMs` best-effort); Härtung `index.ts:302`
  `finiteNonNeg(...)`; Tests `robustness-sweep.test.ts` F1–F3 decken Migration + NaN/negativ ab.
  Tick zählt nur bei `!offline` hoch (`tick.ts:220`). `StatsPage.tsx:33` zeigt
  `formatPlaytime(state.activePlayMs)` → keine `NaNm`-Gefahr. **Confirmed OK.**
- **Deutsche Umlaute auf Achievement-Karten: echt.** Karten zeigen `tr(def.name)`/`tr(def.description)`
  aus dem Content. Kein Mojibake in `content/src/index.ts` oder `i18n/translations.ts` (Grep auf
  `Ã|Â|â€|\uXXXX` = 0). Stichproben korrekt (`Meister der Künste`, `Gewöhnlich`, `Legendär`,
  `Vermächtnis`, `Nächster Meilenstein`). „Hohle/Toten" sind korrektes Deutsch (hollow/die Toten),
  kein fehlender Umlaut. **Confirmed OK.**
- **i18n-Parität:** `de` ist als `Record<keyof typeof en, string>` typisiert (`translations.ts:885`) →
  fehlende/zusätzliche Keys sind tsc-Fehler. Alle 21 `skillguide.<id>` in en+de vorhanden. **Confirmed OK.**
- **Echte Icons:** Alle Kategorie-PNGs (`icon_skilling/combat/gathering/crafting/quests/wealth/collection`)
  + `icon_achievments`/`icon_achievement_unlocked`/`icon_locked` existieren. Alle 7 Combat-Skill-PNGs
  (`assets/skills/*.png`) + alle Sidebar-Skill-PNGs vorhanden → in SkillsOverview/Mastery greift die
  Emoji-Fallback-Kette in der Praxis nie. Kategorien `exploration`/`meta` (ohne PNG) haben **0**
  Achievements → deren Emoji-Tabs rendern nie. **Confirmed OK.**
- **Mount-Gate (UI-Crash):** Alle 4 Seiten + `Toasts`/`OfflinePopup`/`PetCelebration`/`Onboarding`
  hängen unter `MainLayout` (`App.tsx:302-305`), das nur im Spiel-Screen rendert (`Root`, `App.tsx:318`).
  Kein `useGameState()`-Consumer an der App-Wurzel / im Menü. **Confirmed OK** (alte „Toasts an Wurzel"-
  Regression ist zu.)

---

## Findings

### [P2][ux] StatsPage trägt eine komplette, redundante „alte" Achievements-Sektion (540 Karten, Emoji-Icons) — confirmed
- **Datei:** `apps/client/src/renderer/pages/StatsPage.tsx:87-118`; CSS-Kommentar bestätigt es:
  `styles/pages.css:308` „**Alte** Achievements-Sektion (kompaktes Grid, innerhalb stats-page)".
- **Repro:** Nav → Stats. Unter „Gesamtfortschritt" folgt ein Grid mit **allen 540** Achievements.
- **Erwartet:** Achievements haben eine eigene, polierte, gefilterte Seite (`achievements`, eigener
  Topbar-Eintrag, PNG-Emblems, Rarität, Ringe). Die Stats-Seite sollte höchstens den Zähler/Balken
  zeigen (tut sie bereits im `completion`-Block, Zeile 50-85).
- **Tatsächlich:** Stats rendert die volle Liste ein zweites Mal, unvirtualisiert → sehr lange Seite
  (Overflow/Scroll-Wall), und mit **Emoji-Icons** (`a.icon ?? "🏆"`). Laut Probe haben nur **52 von 540**
  Achievements ein `icon`-Feld → **488** Karten zeigen das generische 🏆, freigeschaltete mischen dann
  Custom-Emoji + 🏆, gesperrte das `icon_locked`-PNG. Inkonsistent mit der polierten Achievements-Seite.
- **Evidence:** Probe: `ACH_COUNT=540, WITH_ICON=52`. `StatsPage.tsx:95` `achievements.map(...)` ohne
  Slice/Filter. **Owner: UI-Dev** (Sektion entfernen bzw. auf reinen Zähler reduzieren).

### [P3][ux] Leere-Zustand-Platzhalter benutzen Button/Tab-Label als Meldungstext — confirmed
- **Dateien:** `AchievementsPage.tsx:328` und `MasteryPage.tsx:334`.
- **Repro A:** Achievements → Filter „Freigeschaltet" bei frischem Char (nichts unlocked) → das leere
  Grid zeigt als Meldung schlicht **„Gesperrt"** (`t("achievements.filter.locked")` — das ist das
  Filter-Button-Label, keine Leer-Meldung).
- **Repro B:** Mastery → Tab „Abgeschlossen" ohne maximierte Aktion → Meldung ist schlicht
  **„Abgeschlossen"** (`t("mastery.tab.completed")` — das Tab-Label).
- **Erwartet:** Ein erklärender Satz („Keine Erfolge in diesem Filter." / „Noch keine Aktion maximiert.").
- **Tatsächlich:** Einzelwort, das den Zustand nicht erklärt. **Owner: UI-Dev** (je ein neuer i18n-Key,
  en+de — Parität ist tsc-erzwungen).

### [P3][ux] StatsPage: uneinheitliche Tausender-Trennung (Gold/Kills roh) — confirmed
- **Datei:** `StatsPage.tsx:34` (`String(state.character.gold)`) und `:35` (`String(state.stats.kills)`).
- **Erwartet:** konsistent mit den Nachbarzeilen, die `.toLocaleString()` nutzen (totalXp `:32`,
  totalMastery, itemsGathered `:37`).
- **Tatsächlich:** Gold/Kills ohne Trennzeichen → im Endgame `1234567` statt `1.234.567` (schwer lesbar);
  auf **derselben** Seite steht direkt daneben lokalisiertes XP. (Nebenbei: `String(Math.floor(totalXp)
  .toLocaleString())` in `:32` ist ein redundantes `String()` um einen bereits-String.) **Owner: UI-Dev.**

---

## Nachrangig / geringes Vertrauen (kein Handlungsdruck)

- **[P3][feel] Mastery-Perk-Glyphen sind Emoji/Unicode statt PNG:** `⏱`/`♻`/`×2`/`★` in
  `MasteryPage.tsx:114,119-121,195-197` (auch `▸`-Chevron). Funktional, aber gegen den Studio-Trend
  „echte Icons". Suspected — bewusst kompakt gehalten; nur falls Icon-Politik streng gilt. **Owner: UI-Dev.**
- **[P3][bug] Toter COMBAT_SKILLS-Zweig in Mastery:** `MasteryPage.tsx:27-30` listet `strength`/`magic`
  (keine echten Skill-IDs; echt sind `power`/`magic_off`/`magic_def`) und `SKILL_ICONS` (`:36-50`) hat
  keine Combat-Einträge. **Ohne sichtbaren Effekt**, weil Combat-Skills **0** Mastery-Aktionen haben
  (Probe: `COMBAT_ACTIONS={}`) → Combat-Tab rendert nie, „•"-Fallback greift nie. Nur Aufräum-Notiz.

---

## Kurz-Zusammenfassung

- **P0:** 0 · **P1:** 0 · **P2:** 1 · **P3:** 3 (+2 nachrangig)
- **Top-3:**
  1. **[P2]** StatsPage rendert die volle 540-Achievement-Liste ein zweites Mal (Emoji-Icons, Overflow) —
     redundant zur polierten Achievements-Seite. `StatsPage.tsx:87-118`.
  2. **[P3]** Leere-Zustände zeigen Button/Tab-Label statt Erklärtext. `AchievementsPage.tsx:328`,
     `MasteryPage.tsx:334`.
  3. **[P3]** StatsPage Gold/Kills ohne Tausender-Trennung, inkonsistent zu XP/Mastery daneben.
     `StatsPage.tsx:34-35`.
- **Verifiziert & gut:** `activePlayMs`-Spielzeit, deutsche Umlaute/kein Mojibake, i18n-Parität,
  echte Kategorie-/Skill-Icons, Mount-Gate (keine Menü-Crash-Gefahr). Keine P0/P1 im Fokusbereich.
