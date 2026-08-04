# Sweep 2 — 18 · UI Bestiarium (`pages/BestiaryPage.tsx`)

Fokus: echte Stat-/Status-Icons statt Emojis (frisch gefixt), Portraits/Fallbacks, Drops
(ItemChip + Chance), Task-Target-Badge, Layout, fehlende Art, Emoji-Reste.
Methode: statische Code-Review + Asset-Diff + i18n-Parität + Icon-PNG-Existenz.
Gates: `pnpm --filter @hearthforge/client typecheck` → grün.

## VERIFIZIERT — Fixes wirken (kein neuer Bug)
- **Echte Stat-/Status-Icons rendern wirklich.** `statIcon()` + `renderEffectIcon()`
  (`statIcons.tsx`) lösen über `getUiIcon()` auf PNG auf; ALLE 12 referenzierten Icon-PNGs
  existieren (`icon_status_{burn,frost,shock,poison,bleed}`, `icon_attribute_{hp,meeledamage,
  defense,accuracy,evasion,attack_speed}`, `icon_goldcoin`). Die Status-Legende und die
  hp/atk/def-Stats im Bestiarium zeigen also echte Art, keinen Emoji-Fallback. **confirmed.**
- **i18n-Parität vollständig.** Alle 23 vom Bestiarium genutzten Keys existieren in `en` UND
  `de` (je genau 2×): `bestiary.{title,discovered,legend,level,undiscovered}`,
  `combat.{regenHint,enrageHint,immuneHint,immune,inflictsHint,inflicts,drops,fight}`,
  `status.{burn,frost,shock,poison,bleed}` + `.desc`. **confirmed.**
- **Drops = ItemChip + Chance.** `BestiaryPage.tsx:110-127` rendert je Loot-Roll einen
  klickbaren `<ItemChip>` (PNG mit Emoji-Fallback, öffnet Item-Tooltip) plus Prozent mit
  adaptiven Nachkommastellen (`<0.01→2`, `<0.1→1`, sonst `0`). Korrekt. **confirmed.**
- **UI-Crash-Gate ok.** `BestiaryPage` wird ausschließlich über `PageContent` in `MainLayout`
  gerendert (`App.tsx:72-73`, `Root` zeigt `MainLayout` nur wenn `screen` ≠ menu/creating).
  `useGameState()` kann also nie vor einem aktiven Spiel laufen. **confirmed.**
- **„Emoji-Reste" sind by-design.** Verbleibende Emojis im Bestiarium (♻ Regen, 😡 Enrage,
  ☠ Kills, ⚔ Fight/Portrait-Fallback) sind in `statIcons.tsx` explizit als „ohne PNG-
  Entsprechung → bleiben Emoji" dokumentiert. Keine Regression.

## FINDINGS

### [P2][bug] Genau EIN Monster ohne Portrait: `scale_skarn`
- **Repro:** Asset-Diff aller 92 Monster-IDs gegen `apps/client/src/renderer/assets/monsters/*.png`
  (84 PNGs; `tower_*` fallen per `getMonsterSrc` auf ihr Basis-Art zurück).
- **Erwartet:** jedes reguläre Zonen-Monster hat Art.
- **Tatsächlich:** `scale_skarn` (Drachenhaut-Skarn, Lv 275, Zone `idolhall`) hat KEIN
  `scale_skarn.png`. Es ist ein echtes, erreichbares Boss-Monster (idolhall-Encounter +
  Dungeon `idol_sanctum` Welle 3) und droppt sogar den legendären `skarn_idol_staff`. Im
  Bestiarium zeigt es nach dem ersten Kill den `⚔`-Platzhalter.
- **Evidence:** Def `packages/content/src/index.ts:10397`; erwartete Datei
  `apps/client/src/renderer/assets/monsters/scale_skarn.png` fehlt.
- **Hinweis:** Die Briefing-Zahl „19 Monster ohne Portrait?" ist **veraltet** — der Gap ist
  auf **exakt 1** geschrumpft. (Alle 8 `tower_*`-Duplikate + 83 übrige haben Art.)
- **Owner:** asset-integrator / Chef (Art-Lieferung).

### [P3][ux] Bestiarium-„Kämpfen" ignoriert Slayer-Anforderung (stiller No-Op)
- **Repro:** `BestiaryPage.tsx:16-19` — `fight()` ruft `startCombat()` und navigiert danach
  **bedingungslos** nach `"combat"`. Für `slayer_tower`-Monster mit `slayerRequirement`, dessen
  Item der Spieler aktuell NICHT besitzt, gibt `startCombat()` `false` zurück (Hard-Block,
  `combat.ts:164`) — die UI springt trotzdem in den Combat-Screen (zeigt dort die Zonen-Auswahl),
  ohne jede Rückmeldung.
- **Erwartet:** entweder Button deaktivieren/„benötigt: <Item>" anzeigen (wie CombatPage) oder
  Navigation unterdrücken wenn `startCombat` `false` liefert.
- **Tatsächlich:** kein Requirement-Hinweis, kein Feedback; Klick = leere Navigation.
  CombatPage macht es richtig (`CombatPage.tsx:1029-1055`: Label + `disabled={!reqMet}`).
- **Edge-Case:** nur auslösbar, wenn Monster früher gekillt (→ „known") und Item danach
  verloren/verkauft. Kein Crash, aber verwirrend.
- **Owner:** ui-dev.

### [P3][ux] Kein Slayer-Task-Target-Badge im Bestiarium (Inkonsistenz zu Combat)
- CombatPage markiert das aktive Slayer-Auftragsziel per `slayer-target-badge`
  (`CombatPage.tsx:982-984`, Key `slayer.task.targetBadge`) und zeigt Slayer-Requirements.
  Das Bestiarium hat **weder** ein Target-Badge **noch** eine Requirement-Anzeige — obwohl das
  Briefing „Task-Target-Badge" als erwartetes Element listet.
- Vermutlich bewusst (Bestiarium = statisches Kompendium), aber inkonsistent. **suspected.**
- **Owner:** ui-dev / Chef-Entscheid.

### [P3][ux] Bestiarium spoilert ALLE Drops sofort — Collection-Log-Gate fehlt
- `BestiaryPage.tsx:110-127` zeigt beim ersten Kill sofort **alle** Loot-Items + exakte Chancen
  via `ItemChip`. CombatPage nutzt dagegen ein Collection-Log-Gate: `?` bis `hasDropSeen`
  (`CombatPage.tsx:224-257`, `DropIcon`). Das Bestiarium enthüllt also seltene Drops, die der
  Kampf-Drop-Log bewusst verbirgt. Widerspruch: soll das Bestiarium Voll-Reveal oder
  Collection-Log sein? **suspected/design.**
- **Owner:** Chef / ui-dev.

### [P3][ux] Bestiarium zeigt keine Belohnung (XP/Gold)
- `MonsterDef.xp` und `.gold` erscheinen in der CombatPage-MonsterCard-Belohnungszeile
  (`CombatPage.tsx:1005-1014`), fehlen aber in der Bestiarium-Karte. Ein Kompendium sollte
  Kill-XP/Gold plausibel anzeigen. Klein. **Owner:** ui-dev.

## Low / Info
- **Discovered-Nenner zählt Duplikate.** `BestiaryPage.tsx:25,44` — `defeatedCount / monsters.length`
  über alle 92 Monster inkl. 8 `tower_*`-Art-Duplikaten (z.B. `tower_goblin` = Anzeigename
  „Goblin", Lv 15) und der kompletten `slayer_tower`-Zone. Der gleichnamige „Goblin" taucht so
  in „Die Weiden" UND „Der Slayer-Turm" auf. Kein Bug (eigene Statblöcke), aber die
  Vollständigkeits-Zahl enthält namensgleiche Doppel-Einträge. CombatPage blendet `slayer_tower`
  aus der Zonenliste aus (`CombatPage.tsx:1148`) und zeigt den Turm separat — das Bestiarium
  listet ihn inline als normale Zone.

## Gate-Ergebnis
- `pnpm --filter @hearthforge/client typecheck` → **grün** (0 Fehler).

## Kurz-Zusammenfassung
- **P2:** 1 — `scale_skarn` ohne Portrait (einziger Art-Gap; Briefing-Zahl „19" veraltet).
- **P3:** 4 — Fight ignoriert Slayer-Req (stiller No-Op) · kein Task-Target-Badge · Drops
  ohne Collection-Log-Gate (Spoiler) · keine XP/Gold-Belohnung.
- **Low/Info:** 2 — Duplikat-Nenner bei „discovered" · slayer_tower inline vs. Combat separat.
- **Top-3:** (1) `scale_skarn`-Art nachliefern; (2) Fight-Button bei nicht erfüllter
  Slayer-Anforderung deaktivieren/erklären ODER Navigation nur bei erfolgreichem `startCombat`;
  (3) Drop-Reveal-Politik (Voll-Reveal vs. Collection-Log) zwischen Bestiarium und Combat
  vereinheitlichen (Chef-Entscheid).
