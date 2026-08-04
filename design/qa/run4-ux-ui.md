# Run 4 — UX/UI & Visuelle Kohärenz (Playtester-Review)

> READ-ONLY Sichtprüfung des Renderers (`apps/client/src/renderer`).
> Stand 2026-06-27. Run 4 **nach** den run3-Fixes. Fokus: Verifikation der zwei
> Fix-Aufträge (Emoji-Reste, Slayer-Lauf-Hilfe) + Re-Check der Kern-Ziele.
> Vergleich gegen `design/qa/run3-ux-ui.md`.

## Fun / Polish-Score: **8.5 / 10**

Die zwei priorisierten run3-Aufträge sind sauber gelandet: die sichtbarsten Emoji-Reste sind auf
echte Citadel-PNGs gezogen, und die **Slayer-Lauf-Hilfe** ist nicht nur „erledigt", sondern richtig
gut — Auftragsziel-Glow + Gold-Badge konsequent in **allen drei** Auswahlflächen (Zonen-, Monster-,
Turm-Karten) plus „Zum Monster"-Button auf der SlayerPage. Dazu ist die tote 213-KB-`styles.css`
gelöscht. Übrig bleiben nur noch kleine, größtenteils bewusste P3-Restposten. Keine P0/P1-Blocker.

---

## Verifikation der run3-Fix-Aufträge

### (1) Emoji-Reste an sichtbaren Stellen — GRÖSSTENTEILS GEFIXT
- **Kampf-Status-Banderole** (`App.tsx:160-176`): `🛡`/`⚔`/`💀` → echte PNGs `icon_attribute_defense`
  (Spieler) + `icon_combat` (VS). Emoji nur noch als Fallback; `💀` komplett entfernt. Beide Assets
  existieren (`assets/icons/`), Fallback ist toter Code. **Erledigt.**
- **Achievement-Karten AP-Icon** (`AchievementsPage.tsx:158-163`): `🏆` auf *jeder* Karte → echtes
  `icon_achievments`-PNG. Header-Emblem (`:232`) + Stat-Panels (`:245` Trophy, `:256` `icon_achievement_unlocked`)
  ebenfalls auf PNG. Die in run3 als „sichtbarste Stelle" markierte 🏆-Pro-Karte ist weg. **Erledigt.**
- **Options Save-/Daten-Buttons** (`OptionsPage.tsx`): `📖 📋 📂 ⬇ ⬆` → reine Textlabels
  (`options.exportDownload` etc.). **Erledigt.**
- **Rest offen:** Audio-Buttons (`OptionsPage.tsx:139/158`) tragen weiterhin rohe `🔊 🔇 🎵`
  (kein Sound/Musik-PNG im Asset-Pack). Siehe P3.

### (2) Slayer-Lauf-Hilfe (Auftragsziel-Glow/Badge) — VOLL GEFIXT
- **Monster-Auswahl** (Welt: `CombatPage.tsx:1291/1301`; Turm-Etage: `:940/950`): aktives Zielmonster
  bekommt Klasse `slayer-target` + sichtbares `slayer-target-badge`.
- **Zonen-Auswahl** (`:1098/1112`): Ziel-Zone → `slayer-target-zone` + Badge.
- **Turm-Etagen** (`:1201/1213`): Ziel-Etage → `slayer-target-zone` + Badge.
- Quelle ist `getActiveTask(state)` (`:1071`), also dynamisch an den laufenden Auftrag gekoppelt.
- CSS (`combat.css:35-60`): Gold-Rahmen + Box-Shadow-Glow (`0 0 18px rgba(216,192,106,.3)`) und ein
  Cinzel-Gold-Badge, stilistisch sauber im Citadel-Look.
- Zusatz auf der SlayerPage selbst: Standort-Label (Welt/Zone/Turm-Etage) + „Zum Monster"-Button
  (`SlayerPage.tsx:242-249`). Der Spieler findet sein Ziel jetzt ohne Raten. **Sehr rund.**

---

## Re-Check Kern-Ziele (alle weiterhin erfüllt)
- **Globale Auto-Skalierung**: Main-Hook unverändert intakt (1920×1080 → ~0.80). ✓
- **Gekachelte Hintergründe** (Stein/Holz, `repeat`, kein Stretch). ✓
- **Item-Tooltip**: grauer Block, echte Attribut-/Status-/HP-Icons (`icon_attribute_hp`). ✓
- **Kataloge**: Crop 6-Spalten, Achievement-Grid 5-Spalten (`pages.css:1990`). ✓
- **Globaler Cursor** erzwungen (`base.css:99-103`). ✓ (Typo-Risiko siehe P3)
- **Equip-Raritäts-BG** pro besetztem Slot. ✓
- **EnchantingPage** sauber mit 3 Tabs (bench/vault/salvage, `role="tablist"`, `aria-selected`). ✓
- **Köcher/Ammo-Slot**: vorverdrahtet (`equipSlotIcons.ts:61`), aber bewusst noch nicht in
  `EQUIP_SLOTS` aktiv; Munition erscheint aktuell als Stat-Zeile (`CharacterPage.tsx:358-362`).
  Kein Regress — geplanter Zwischenstand.
- **Design-System-Kohärenz (Citadel)**: durchgängig, keine MMO-Halluzinationen. ✓
- **`styles.css` (tote 213 KB)**: gelöscht. ✓ (P2 aus run3 geschlossen)

---

## Offene Findings (alle P3, größtenteils bewusst)

### [P3] Options-Audio-Buttons noch roh: `🔊 🔇 🎵`
`OptionsPage.tsx:139/158`. Letzte rohe Emoji-Fläche im sichtbaren Optionsmenü; kein passendes
Sound/Musik-PNG im Pack. **Fix:** kleine Asset-Lücke listen (`icon_sound_on/off`, `icon_music`) und
nach Lieferung wie die anderen via `getUiIcon` binden, oder Text-Toggle wie bei den Save-Buttons.

### [P3] Achievement-Karten-Emblem weiterhin Emoji (pro Karte)
`AchievementsPage.tsx:146` rendert das runde Kategorie-Emblem via `categoryIcon()` (⚒️/⚔️/🏆/…),
`aria-hidden`, laut Kommentar bewusster Platzhalter „structured for future PNGs". Da auf *jeder*
Karte sichtbar, bleibt es der auffälligste verbliebene Emoji-Punkt. **Fix:** sobald Kategorie-Icons
existieren, denselben PNG-mit-Fallback-Pfad nutzen.

### [P3] Cursor-Dateiname-Typo eingefroren (unverändert aus run3)
`base.css:102` referenziert weiter `cusor_default.png` (fehlendes zweites „r"), Asset ebenso falsch
benannt. Kommentar dokumentiert die Falle. Risiko bleibt: korrekte Umbenennung killt den globalen
Cursor still. **Fix:** Asset + CSS gemeinsam auf `cursor_default.png` ziehen.

### [P3] Manueller UI-Scale: absolute %-Labels weiter irreführend (unverändert)
`uiScale.ts:5` → 90/100/110/125 %; multipliziert sich mit dem Main-`setZoomFactor` (~0.80).
Kein Relativ-Label/Hinweistext, keine Stufe <90 %. **Fix:** relativ benennen oder Hinweis „relativ
zur Auto-Anpassung".

### [P3] Achievement-Grid springt weiter 5 → 3 Spalten (unverändert)
`pages.css:1990/1995`: `repeat(5,…)` bis 900px, darunter direkt `repeat(3,…)`, kein 4er-Schritt.
**Fix:** `repeat(4,…)`-Zwischenstufe oder `auto-fill, minmax(280px,1fr)`.

### [P3] Stale-Kommentare verweisen auf gelöschte `styles.css`
`pages/FontPreview.tsx:14/26` erwähnen noch „styles.css" als Schrift-Quelle, obwohl die Datei weg
ist (live ist `styles/`-Split). Nur Kommentar — Debug-Verwirrung möglich. **Fix:** Kommentar auf
`styles/index.css` aktualisieren.

---

## Δ vs run3

| Punkt | run3 | run4 |
|---|---|---|
| Score | 8 / 10 | **8.5 / 10** |
| Combat-Banderole-Emojis (🛡⚔💀) | P2 offen | **gefixt** (PNG) |
| Achievement 🏆-pro-Karte (AP) | P2 offen | **gefixt** (PNG) |
| Options 📖📋📂⬇⬆ | P2 offen | **gefixt** (Text) |
| Options 🔊🔇🎵 | P2 offen | P3 offen (Asset-Lücke) |
| Achievement Kategorie-Emblem-Emoji | nicht separat | P3 offen (bewusster Platzhalter) |
| Slayer-Lauf-Hilfe (Glow/Badge) | als Ziel benannt | **voll umgesetzt** (Zone+Monster+Turm) |
| Tote `styles.css` (213 KB) | P2 | **gelöscht** |
| Cursor-Typo `cusor_default` | P3 | P3 (unverändert) |
| UI-Scale %-Labels | P3 | P3 (unverändert) |
| Achievement-Grid 5→3 | P3 | P3 (unverändert) |
| FontPreview Stale-Kommentar | — | P3 (neu, Folge der Löschung) |

**P0:** keine · **P1:** keine · **P2:** keine · **P3:** 6 (4 davon Alt-Bekannte, 2 davon bewusst)

## Schnell-Verdikt
Beide Fix-Aufträge erfüllt, die Slayer-Hilfe sogar vorbildlich (echter UX-Gewinn beim Navigieren zum
Ziel). Die laute Emoji-Front ist bereinigt; nur Audio-Buttons + das Kategorie-Emblem tragen noch
sichtbare Emojis, beide als Asset-Lücke/Platzhalter bekannt. Rest sind altbekannte Mini-Politur-P3s.
Release-tauglich.
