# Sweep 2 — 14 · UI Kampf (CombatPage + combat.css)

**Fokus:** `apps/client/src/renderer/pages/CombatPage.tsx` + `apps/client/src/renderer/styles/combat.css`
(Gegnerauswahl/Karten, HP-Banderole, Fighter-Bilder/Skalierung, Stance-Leiste, Drops-Anzeige,
Floating-Damage/Status-Icons, Mana-Bar, Loadout-Sidebar).
**Methode:** Vollständige Code-Inspektion beider Dateien + i18n-Key-Verifikation (beide Locales) +
Cross-Grep der CSS-Klassen gegen tatsächliche TSX-Nutzung. Reine Analyse, kein Code geändert.

---

## Findings (schwerste zuerst)

### P2 · [bug/ux] Roher Enum-Token im Pet-Tooltip der Kampf-Fußzeile — **confirmed**
- **Datei:** `CombatPage.tsx:616` (`playerFooter` → `.fighter-pet`)
- **Code:** ``title={`${tr(activePet.name)} — ⚔ ${activePet.combatAbility.kind} · ${(activePet.combatAbility.intervalMs / 1000).toFixed(0)}s`}``
- **Erwartet:** lokalisierter Fähigkeitsname (z. B. „Rüstungsdurchschlag").
- **Tatsächlich:** roher camelCase-Token aus `PetAbilityKind`, z. B. `armorPierceHit`, `burstDamage`,
  `lifestealBurst`, `onHitStatus`, `multiHit` (Definition `packages/shared/src/index.ts:776–792`).
- **Beweis:** Passende Übersetzung existiert bereits unter `pet.effect.combat.<kind>` (in **beiden**
  Locales verifiziert für stun/burstDamage/armorPierceHit/multiHit/lifestealBurst/onHitStatus) und
  wird im Kampf-Log schon korrekt genutzt (`CombatPage.tsx:148`). Der Tooltip greift sie nur nicht ab.
- **Fix:** `t(\`pet.effect.combat.${activePet.combatAbility.kind}\`)` statt `.kind` einsetzen.
- **Owner:** UI-Dev.

### P2 · [bug/ux] Roher Status-Token im Effekt-Badge-Overlay auf der Kämpfer-Figur — **confirmed**
- **Datei:** `CombatPage.tsx:340` (`Fighter` → `.fighter-effects-overlay .effect-badge`)
- **Code:** `<span key={i} className="effect-badge" title={e.type}> … </span>`
- **Erwartet:** beim Hover über ein Buff/Debuff-Badge der lokalisierte Statusname (DE: „Gift", „Brand" …).
- **Tatsächlich:** roher englischer `StatusType`-Token („poison", „burn", „bleed", „frost", „shock").
- **Beweis:** `t(\`status.${e.type}\`)` existiert in beiden Locales und wird an anderen Stellen der
  gleichen Datei verwendet (`CombatPage.tsx:132`, `1434`, `1439`). Passt außerdem zum gerade
  gefixten Thema „Gift-Terminologie vereinheitlicht" — dieser Tooltip leakt noch das rohe Enum.
- **Fix:** `title={t(\`status.${e.type}\`)}`.
- **Owner:** UI-Dev.

### P3 · [ux/feel] Inkonsistente Gold-/XP-Ikonografie (rohe Emojis statt echter Icons) — **confirmed**
- **Auto-Eat-Upgrade-Kosten:** `CombatPage.tsx:1575` nutzt rohes `🪙`, während der Rest der Seite den
  echten Münz-PNG über `statIcon("gold")` rendert (`icon_goldcoin`). Passt nicht zum gerade
  gefixten „Offline-Popup-Gold-Icon"-Thema.
- **XP-Belohnung uneinheitlich:** `MonsterModal` zeigt `⭐ {monster.xp}` (`CombatPage.tsx:1412`),
  die `MonsterCard` dagegen nur `{m.xp} XP` ohne Icon (`CombatPage.tsx:1010`). Zwei Darstellungen
  desselben Werts, plus reines Emoji statt Design-System-Icon.
- **Owner:** UI-Dev.

### P3 · [ux] Gegner-Level im Kampf doppelt angezeigt — **confirmed**
- **Datei:** `CombatPage.tsx:721` (sub) + `:725` (level-badge).
- Der Gegner-`Fighter` zeigt sein Level einmal im goldenen `fighter-level-badge`
  (`level={monster.level}`) und ein zweites Mal in der Sub-Zeile „Level N · Kills N". Redundant —
  der Spieler-`Fighter` nutzt das Badge dagegen fürs *Combat-Level* und die Sub-Zeile für
  Attack/Power/Defence, dort keine Doppelung. Vorschlag: Gegner-Sub auf „Kills N" reduzieren.
- **Owner:** UI-Dev.

### P3 · [code/hygiene] Große Menge toter Combat-CSS + nie gerenderte `ZoneMapView` — **confirmed**
- **Nie gemountete Komponenten:** `ZoneMapView` / `ZoneMapTokenModal` / `computeGridPositions`
  (`CombatPage.tsx:762–929`) werden nirgends gerendert — Map-Ansicht ist deaktiviert
  (Kommentar `CombatPage.tsx:1135`, `<ZoneMapView` kommt in keinem TSX vor). Dadurch ist der
  komplette `.zonemap-*`-Block in `combat.css:1535–1791` verwaist.
- **Weitere tote CSS-Blöcke (per Grep in keinem `.tsx` referenziert):** `.battle-controls`,
  `.combat-quick`/`.cq-*`, `.style-picker`/`.style-cards`/`.style-card`, `.macro-style-*`,
  `.battle-stance-*`, `.food-picker`/`.food-btn`, `.ammo-display`/`.ammo-warn`, `.fighter-drops`,
  `.melee-only-note`, `.action-inputs`/`.input-mat`. (Die Stance-/Food-Steuerung wanderte in die
  Loadout-Sidebar `.cl-*`; die alten Leisten sind Reste davon.)
- **Wirkung:** nicht spieler-sichtbar, aber „nichts totes/verwaist" — reine Aufräumempfehlung
  (~250+ CSS-Zeilen + 3 Funktionen entfernbar).
- **Owner:** UI-Dev.

### P3 · [ux] Battle-Arena bricht auf schmalen Fenstern nicht um — **suspected**
- **Datei:** `combat.css:979–980` (`.battle-main { grid-template-columns: 1fr 1fr 1.05fr }`) +
  `combat.css:2683` (`.combat-sidebar { width: 340px }`).
- Die drei Arena-Spalten (Spieler / Gegner / Log) bleiben fix, die linke Loadout-Sidebar bricht erst
  bei `<720px` um (`combat.css:2727`). Zwischen ~720–1000px Fensterbreite bleibt neben der 340-px-
  Sidebar zu wenig übrig → Kämpferfiguren + Log stark gequetscht. `min-width:0` verhindert nur den
  Overflow, nicht die Enge. Empfehlung: `.battle-main` bei schmalem Viewport auf 1–2 Spalten /
  Log unter die Figuren umbrechen.
- **Verifikation offen:** live bei ~800×600 gegenprüfen.
- **Owner:** UI-Dev.

### P3 · [ux] Monster-Kartenname wird bei langen Namen abgeschnitten — **suspected**
- **Datei:** `combat.css:405–415` (Basis) vs. Redesign-Override `combat.css:2611`.
- Die Redesign-Regel setzt nur `font-size/clamp` + Border, setzt aber `white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis` der Basisregel **nicht** zurück. Lange DE-Namen
  (z. B. mehrgliedrige Kreaturennamen) werden mit „…" abgeschnitten statt umzubrechen.
- **Owner:** UI-Dev (ggf. Content-Dev bei Namenslänge).

### P3 · [bug] DropIcon-Tooltip zeigt rohe Item-ID als Fallback — **confirmed, Edge**
- **Datei:** `CombatPage.tsx:248` — ``title={`${item ? tr(item.name) : roll.itemId} · …`}``.
  Greift nur, wenn ein `loot.itemId` auf kein `content.items`-Objekt zeigt (Content-Bug). Dann
  erscheint die rohe ID im Tooltip. Niedrig — nur als Wachhund gegen verwaiste Loot-Referenzen.
- **Owner:** UI-Dev (Guard) / Content-Dev (falls je eine ID verwaist).

---

## Verifiziert in Ordnung (Stichproben)
- Alle in der Combat-UI genutzten `combat.*` / `style.*` / `slayer.*` i18n-Keys existieren in **beiden**
  Locales (en+de) — kein roher Key auf dem Bildschirm (25 Keys geprüft, je Count 2).
- Status-DoT/Lebensraub-Icons im Kampf-Log und in den Floatern nutzen echte PNGs via
  `renderEffectIcon` (`CombatPage.tsx:745–747`, `362`, `374`), nicht mehr Emoji-im-String.
- Pet-Log-Zeilen sind lokalisiert inkl. Flavor-Fallback (`CombatPage.tsx:143–172`) — der gerade
  gefixte „gatherYield · onHitStatus"-Rohtoken taucht im Log **nicht** mehr auf (nur noch im
  Pet-Tooltip, siehe P2).
- `renderEffectIcon`-Fallback (`✦`) kann für gültige `StatusType`-Werte nicht auftreten: die 5
  StatusTypes (`shared:135`) sind exakt die 5 mit PNG/Emoji hinterlegten — keine „fehlenden" Status-Icons.
- `CombatPage` rendert nur innerhalb des Live-Game-Layouts (`App.tsx:59`, im `PageContent`-Switch) —
  `useGameState()` an der Komponentenwurzel ist sicher, kein Menü-/Creation-Crash-Risiko.

## Nicht getestet
- Headless-Gates (typecheck/`pnpm test`/build) — außerhalb dieses fokussierten Visual-Sweeps; der
  Code ist unverändert ausgelieferter Bestand. Keine Compile-verdächtigen Konstrukte in den zwei Dateien gefunden.

---

## Kurz-Zusammenfassung
- **P0:** 0 · **P1:** 0 · **P2:** 2 · **P3:** 6
- **Top 3:**
  1. **P2** Pet-Tooltip zeigt rohen Ability-Enum-Token statt `pet.effect.combat.*` (`CombatPage.tsx:616`).
  2. **P2** Effekt-Badge-Overlay-Tooltip zeigt rohen `StatusType`-Token statt `status.*` (`CombatPage.tsx:340`).
  3. **P3** Viel tote Combat-CSS + nie gerenderte `ZoneMapView` (Aufräumen: `combat.css:1535–1791` u. a.).
- **Empfehlung:** Zwei kleine UI-Dev-Fixes (P2, je eine Zeile) vor EA einplanen; Rest ist Politur/Hygiene.
