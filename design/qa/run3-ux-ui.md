# Run 3 — UX/UI & Visuelle Kohärenz (Playtester-Review)

> READ-ONLY Sichtprüfung des Renderers (`apps/client/src/renderer`) + relevanter Main-Scaling-Hook.
> Stand 2026-06-27. Fokus: globale Skalierung, Hintergründe, Tooltips, Kataloge, Achievement-Karten,
> `icon_locked`, globaler Cursor, Slayer-UI, Charakter-Screen, Citadel-Kohärenz.

## Fun / Polish-Score: **8 / 10**

Das UI ist erstaunlich kohärent und durchdacht: ein echtes Design-System (Citadel-9-slice-Holzrahmen,
gekachelte Texturen, Cinzel/Pergament), konsequent echte PNG-Icons in den Kern-Flächen, ein
ornamentales Item-Tooltip mit Raritäts-Glow, und — wichtig — eine **korrekt umgesetzte globale
Auto-Skalierung** (1920×1080 → ~0.80 via `webContents.setZoomFactor`, Floor 0.65 / Cap 0.95). Das
Kernziel des Reviews ist sauber erfüllt. Punktabzug nur für ein paar Kohärenz-Lücken (Emoji-Reste an
sichtbaren Stellen), eine tote 213-KB-CSS-Datei und kleine Klarheits-Stolperer beim manuellen UI-Scale.

---

## Stärken

- **Globale Skalierung sauber gelöst** (`src/main/index.ts:39-45`): Referenz 2400×1350, `min(w/2400, h/1350)`,
  clamped 0.65–0.95, re-applied auf `resize` + `did-finish-load`. 1920×1080 → 0.80 exakt wie gefordert.
  Nutzt Zoom statt fixer px → vh/vw/clamp/fr bleiben korrekt.
- **Globaler Cursor erzwungen** (`styles/base.css:99-103`): `*,*::before,*::after { cursor: ... !important }`
  überschreibt zuverlässig alle komponenten-eigenen `cursor:pointer` — Citadel-Cursor wirklich überall.
- **Hintergründe stimmig**: App = Steinwand gekachelt+abgedunkelt (`base.css:112-120`), Character/Creation/
  Menü = Holz (`character.css:23/144/1579`). Kein Stretch, alles `repeat`.
- **Item-Tooltip** (`components/ItemTooltip.tsx`): grauer Info-Block, echte Attribut-/Status-/HP-Icons
  (`icon_attribute_hp` für HP & Heal & Regen), Raritäts-Label + -Glow, Waffen-Specialty-Zeile, sauberes
  Viewport-Clamping, Esc/Outside-Click schließt gepinnte Tooltips. Sehr rund.
- **Kataloge exakt nach Vorgabe**: Crop-Catalogue 6 Spalten + Name oben (`skills.css:1953 .farm-overview-grid`),
  Achievement-Grid 5 Spalten (`pages.css:1987 .ach2-grid`).
- **Equip-Raritäts-BG** (`character.css:2188-2202`): Slot-Tönung pro Rarität, nur wenn besetzt (`data-rarity`
  in `CharacterPage.tsx:506`), leere Slots neutral. Dezent & lesbar.
- **`icon_locked` durchgezogen**: CharacterPage, SkillPage, SlayerPage, StatsPage, FarmPage nutzen alle das
  PNG mit 🔒 nur als Fallback.

---

## Findings

### [P2] Tote, monolithische `styles.css` (213 KB) — Kohärenz-/Wartungsfalle
`apps/client/src/renderer/styles.css` (10k+ Zeilen) wird **nirgends importiert** — live ist ausschließlich
`styles/index.css` (Modular-Split). Nur ein veralteter Kommentar in `FontPreview.tsx` verweist noch darauf.
Risiko: Künftige Edits an `styles.css` haben **null Wirkung** und kosten Debug-Zeit; zwei divergierende
Wahrheiten desselben Stylings.
**Fix:** Datei löschen (oder nach `archive/` verschieben) und den `FontPreview`-Kommentar aktualisieren.

### [P2] Emoji-Reste an sichtbaren Stellen vs. Citadel-Look
Trotz Echt-Icon-Offensive bleiben prominente Flächen bei rohen Emojis (OS-abhängiges Rendering, bricht den
mittelalterlichen Stil):
- Kampf-Status-Banderole (`App.tsx:154/163/166`): `🛡`, `⚔`, `💀` neben Spieler-/Gegnernamen.
- Achievement-Karten: `🏆`-AP-Icon auf **jeder** Karte (`AchievementsPage.tsx:156`) + Header-/Stat-Embleme
  (`🏆`/`🛡️` Zeilen 224/235/244) hartkodiert.
- Options-Buttons (`OptionsPage.tsx`): `📖 📋 📂 ⬇ ⬆ 🔊 🔇 🎵`.
(Hinweis: Slayer-Punkte `★`/`💀` ist als noch-nicht-verdrahtet bekannt → nicht gezählt.)
**Fix:** AP-/Banner-/Options-Emojis durch vorhandene `getUiIcon`-PNGs ersetzen bzw. fehlende Icons als
kleine Asset-Lücke listen. Das 🏆-pro-Karte ist die sichtbarste Stelle → höchste Priorität.

### [P3] Manueller UI-Scale kompoundiert mit Auto-Zoom → irreführende %-Labels
`util/uiScale.ts` setzt CSS `zoom` auf `documentElement` (Optionen 90/100/110/125 %, Default 100 %).
Das **multipliziert** sich mit dem Main-`setZoomFactor` (≈0.80 @1080p). „100 %" rendert real ~80 %.
Als *relativer* Regler ok, aber die absolute %-Beschriftung suggeriert eine echte Größe, die nicht stimmt;
es gibt zudem keine Stufe unter 90 % für Nutzer, die zusätzlich verkleinern wollen.
**Fix:** Labels relativ benennen („−10 % / Standard / +10 % / +25 %") oder Hinweistext „relativ zur
Auto-Anpassung"; optional eine 80-%-Stufe ergänzen.

### [P3] Cursor-Dateiname als Tippfehler eingefroren — fragil
`base.css:102` referenziert `cusor_default.png` (fehlendes zweites „r"). Funktioniert nur, weil das Asset
**ebenfalls** falsch heißt. Wird die Datei je korrekt umbenannt, fällt der globale Cursor still auf `auto`
zurück.
**Fix:** Asset auf `cursor_default.png` korrigieren und CSS gleichziehen (Kommentar dokumentiert die Falle
bereits — also bewusst, aber Risiko bleibt).

### [P3] Achievement-Grid springt 5 → 3 Spalten (überspringt 4)
`pages.css:1990/1995`: `repeat(5,…)` bis 900px, darunter direkt `repeat(3,…)`. Auf mittleren Breiten
(~700–900px, real durch Auto-Zoom häufiger als man denkt) werden die horizontalen Karten eng, Name/Badge/
Beschreibung gedrängt. Lesbarkeit grenzwertig statt komfortabel.
**Fix:** Zwischenschritt `repeat(4,…)` einziehen oder auf `repeat(auto-fill, minmax(280px,1fr))` umstellen,
damit die Spaltenzahl fließend mit der Breite mitgeht.

---

## Schnell-Verdikt
Visuell sehr kohärent und release-tauglich; die Kern-Review-Ziele (Auto-Scale, Backgrounds, Tooltip,
Kataloge, icon_locked, Cursor, Equip-Rarity, Slayer-Layout) sind umgesetzt. Aufräum-Schulden: tote
`styles.css` killen + Emoji-Reste auf Citadel-Icons ziehen. Keine P0/P1-Blocker gefunden.
