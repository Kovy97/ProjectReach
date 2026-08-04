# Sweep 2 — Bericht 13: UI Charakterblatt + Ausrüstung (`pages/CharacterPage.tsx`)

**Fokus:** Paperdoll, Equip-Slots (Werkzeuge/Köcher), Companion-Widget, Inventar-Grid + Sortierung,
Drag&Drop, Attribut-/Stat-Anzeige, Tooltips/Vergleich. Fehlende Icons, Overflow, Dev-Text.
**Verdikt:** fix-then-ship — 1 confirmed P1 (Köcher unbefüllbar) + Sortier-/i18n-Politur. Kein Crash-Risiko.

---

## Verifikations-Gates (Kontrolleur)

| Gate | Ergebnis |
| --- | --- |
| `pnpm typecheck` | ❌ exit 2 — **nur** wegen Leftover-Temp-File `packages/engine/src/midgame-dump.test.ts` (3 TS-Fehler). Client/Shared/Content typechecken sauber (`tsc --noEmit` client = exit 0). |
| `pnpm test` (engine) | ⚠ 524 committed Tests grün. 2 „Fehler" lagen in `src/magic-sweep.test.ts` — einem **transienten Temp-File eines Parallel-Agenten**, das inzwischen gelöscht ist. Die committed Magic/Mana-Tests (magic-loop/magic/magic-def-xp/ranged-vs-magic = 22) sind **alle grün** → kein Shipping-Bug. |
| `pnpm --filter @hearthforge/client build` | ✅ exit 0 (12,0 s). |
| Balance-Sim `AUFFÄLLIGKEITEN` | ✅ **(9)** = exakt die im Briefing akzeptierte Baseline (7 zu-tanky Mid-Mobs + 2 Gold-only-Thieving). „ECHTE WALLS — auch geared unbesiegbar **(0)**". Kein Monster mit `kills=0` außerhalb der akzeptierten Liste, keine Skilling-Aktion mit 0 XP/h. |

**Prozess-Findings aus den Gates** (nicht CharacterPage, aber Gate-blockierend):
- **[P1][process] Leftover-Temp-Test bricht das typecheck-Gate (confirmed).** `packages/engine/src/midgame-dump.test.ts`
  (heute 15:24, reines JSON-Dump-Skript ohne Assertions) → `src/midgame-dump.test.ts(67,69)` `i.type === "ammo"`
  hat kein Overlap (es gibt keinen Item-Typ „ammo"), `(88,45)/(88,63)` doppelte Keys `itemId`/`cost`. Blockiert
  `pnpm typecheck` für alle. Vermutlich vergessenes Cleanup eines Parallel-Sweep-Agenten (schreibt in den
  Session-Scratchpad). **Muss vor grünem Gate gelöscht werden.** (Weitere Jul-1-Temp-Files `midgame-sim`,
  `midgame-sweep`, `persona-sweep` laufen grün, sind aber ebenfalls Cleanup.) Owner: erzeugender Agent / Cleanup.

---

## Findings CharacterPage (schwerste zuerst)

### [P1][bug] Köcher/Quiver-Slot lässt sich über die UI nicht befüllen — confirmed
- **Repro:** Ranged spielen → Starter-150 `crude_arrow` verschießen → neue Pfeile ins Inventar holen (z.B.
  `copper_arrow` per Monster-Drop/Fletching) → versuchen, sie in den Köcher zu legen.
- **Erwartet:** Pfeile lassen sich per Drag oder „Ausrüsten" in den Köcher-Slot laden.
- **Tatsächlich:** Es gibt **keinen** UI-Weg, Munition auszurüsten:
  - Drag auf den Köcher-Slot ist ungültig: Validity ist `draggedItem.slot === slot` (`CharacterPage.tsx:548-549`),
    aber Pfeile sind `type:"material", ammo:true` **ohne** `slot`-Feld (`packages/content/src/index.ts:427-439`).
    → `valid=false` → weder `onDragOver` noch `onDrop` gebunden.
  - `invActions` gibt Pfeilen keine „Ausrüsten"-Aktion — nur `equipment`/`tool`/`consumable` erhalten Equip
    (`CharacterPage.tsx:341-364`); Material bekommt nur „Verkaufen".
- **Evidence:** Die Engine KANN Ammo ausrüsten (`equipItem`→`equipAmmo`, `packages/engine/src/equipment.ts:59-60`),
  die UI ruft `equipItem` für Munition aber nie auf. Combat degradiert bei leerem Köcher dauerhaft zu
  `RANGED_WEAK_FACTOR` und zieht **nicht** aus dem Inventar nach (`packages/engine/src/combat.ts:771-777`).
  Nach Verbrauch der Starter-150 ist Ranged-Progression damit tot.
- **Owner: UI-Dev.** Fix: in `invActions` bei `isAmmoItem(content, itemId)` eine Equip-Aktion (→`equipItem`)
  ergänzen; und/oder die Paperdoll-`valid`-Prüfung für den `ammo`-Slot auf `isAmmoItem(content, draggedItem.id)`
  umstellen (analog zum `isToolSlot`-Zweig).

### [P2][bug] Rarity-Sortierung platziert superRare/poor/godly falsch — confirmed
- **Evidence:** `RARITY_ORDER` (`CharacterPage.tsx:234-240`) kennt nur `common/magic/rare/epic/legendary`. Das
  Rarity-Enum hat **8** Tiers (`packages/shared/src/index.ts:979-987`): `poor, common, magic, rare, superRare,
  epic, legendary, godly`. `superRare` (ALLE Bögen + viel Mid-Gear), `poor` und `godly` fehlen → fallen über
  `?? 0` auf Common-Rang. **Derselbe Bug** steckt in der geteilten Helper `ITEM_RARITY_ORDER`
  (`apps/client/src/renderer/items.ts:39-45`) → betrifft zusätzlich die Bank-Sortierung.
- **Erwartet:** „Nach Seltenheit" ordnet superRare über rare, godly ganz oben, poor ganz unten.
- **Tatsächlich:** superRare/poor/godly sortieren wie Common (ganz unten).
- **Owner: UI-Dev** (bzw. Logic-Dev für die geteilte `items.ts`). Nebenbei: CharacterPage dupliziert die
  Sort-Logik inline statt `compareItemsBy` aus `items.ts` zu nutzen — beim Fix zusammenführen.

### [P3][ux/i18n] Item-Detail-Panel: Rarity-Label roh + unlokalisiert + ohne Farbe für 3 Tiers — confirmed
- **Evidence:** `CharacterPage.tsx:929-931` rendert `{selectedItem.rarity ?? "common"}` **roh** (zeigt
  „superRare"/„godly" statt „Sehr Selten"/„Göttlich"; das Tooltip macht es korrekt via
  `tr(RARITY_LABEL[rarity])`). Zudem existieren die CSS-Klassen `.rarity-*-text` nur für
  `common/magic/rare/epic/legendary` (`styles/character.css:2877-2881`) → `poor/superRare/godly` bleiben
  ungefärbt (Name **und** Label). `.rarity-rare-text` ist außerdem GOLD, während `RARITY_COLORS.rare` grün ist
  (Inkonsistenz zum Tooltip).
- **Owner: UI-Dev.**

### [P3][i18n] Detail-Panel „Quelle"/„Verwendet für" immer Englisch — confirmed
- **Evidence:** `buildIndices` (`CharacterPage.tsx:78-127`) backt Monster-/Aktions-/Output-Namen **einmalig beim
  Modul-Load** über `.en` (Zeilen 92, 99, 106-111). Im DE-Locale zeigt die Quelle-Liste (`:994`) und die
  Used-For-Liste (`:1017`) englische Namen; ändert sich auch bei Sprachwechsel nicht.
- **Owner: UI-Dev.**

### [P3][ux] Werkzeug-Drag landet nicht im gezielten Tool-Slot — confirmed (minor)
- Ein Werkzeug auf `tool2` gezogen ruft generisch `equipItem`→`equipTool`, das den **ersten freien** Tool-Slot
  belegt (`packages/engine/src/equipment.ts:117`) → landet in `tool1`, wenn frei. Der gezielte Slot wird
  ignoriert. Funktioniert (Item wird ausgerüstet), ist aber visuell irritierend. **Owner: UI-Dev / oder
  akzeptieren.**

### [P3][housekeeping] Toter/veralteter Code — confirmed (minor)
- Kommentar zum `ammo`-Placeholder (`CharacterPage.tsx:63-64`) „no-op until EQUIP_SLOTS includes ammo" ist
  veraltet — `ammo` IST jetzt in `EQUIP_SLOTS` (`shared:483-498`).
- Bag-Slot-Locked-Zweig ist toter Code: `isLocked = false` konstant (`CharacterPage.tsx:755`) → der
  `LOCKED_ICON`-Pfad ist unerreichbar. **Owner: UI-Dev.**

---

## Explizit VERIFIZIERT (gefixt / sauber — nicht als Bug melden)

- **Companion-Widget: roher Pet-Token WIRKLICH weg.** `CharacterPage.tsx:651-656` nutzt
  `t(pet.effect.skill.<kind>)` + `t(pet.effect.combat.<kind>)`; alle 12 Skill- und 16 Combat-Kinds haben EN+DE
  (`i18n/translations.ts:614-641` / `1490-1517`), Pet-Namen sind lokalisiert. Kein „gatherYield · onHitStatus".
- **UI-Crash-Gate ok.** `CharacterPage` (`useGameState()`, wirft ohne Spiel) wird ausschließlich unter
  `MainLayout` gemountet (`App.tsx:259-319`); `Toasts`/`PetCelebration`/`Onboarding`/`OfflinePopup` liegen
  ebenfalls in `MainLayout`, nicht am App-Root. `ItemTooltipOverlay` sitzt am Root, nutzt aber die sichere
  `useGameStateMaybe()`. Keine „leeres Hauptmenü"-Regression.
- **Paperdoll-Grid sauber.** 3×6-Grid, keine Zell-Kollisionen; Köcher (`ammo`) unter der Waffenhand
  (`character.css:2345-2360`); Mana-Vital nutzt Emoji „✦", weil `icon_attribute_mana.png` (noch) nicht existiert
  — korrekter Fallback, kein fehlendes Icon.

## Zusammenfassung
- **P0:** 0 · **P1:** 1 (Köcher unbefüllbar) + 1 Prozess (typecheck-Gate durch Leftover-Temp-File) · **P2:** 1
  (Rarity-Sort) · **P3:** 4.
- **Top-3:** (1) **P1** Köcher/Quiver lässt sich in der UI nicht befüllen → Ranged nach Starter-Ammo tot →
  UI-Dev. (2) **P1/Prozess** `midgame-dump.test.ts` bricht das typecheck-Gate → Cleanup. (3) **P2**
  Rarity-Sortierung ignoriert superRare/poor/godly (CharacterPage **und** Bank/`items.ts`) → UI-Dev.
- **Empfehlung:** fix-then-ship. Ship-Blocker ist der Köcher-P1 (Kern-Kampfstil betroffen). Build/Sim grün,
  kein Crash-Risiko.
