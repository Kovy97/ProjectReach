# Run 5 — UX/UI & Visuelle Kohärenz (Playtester-Review)

> READ-ONLY Sichtprüfung des Renderers (`apps/client/src/renderer`) + Belege aus
> `packages/shared` & `packages/content`/`packages/engine` (nur zur Severity-Einstufung gelesen).
> Stand 2026-06-28. Run 5 **nach** den run4-Fixes. Fokus: Achievement-Grid-Stufe,
> neuer About-/v0.1.0-Screen, EnchantingPage, Slayer-Glow, **Suffix-Anzeige am Item**,
> verbliebene Emoji-/Asset-Lücken. Vergleich gegen `design/qa/run4-ux-ui.md` (war 8,5).

## Fun / Polish-Score: **8.5 / 10** (Δ 0,0)

Solider Lauf mit echtem Fortschritt in der Breite — und genau einer neuen, sichtbaren Lücke, die
den Score exakt hält statt anhebt. **Positiv:** Das run4-P3 „Achievement-Grid springt 5→3" ist
sauber geschlossen (jetzt 5→**4**→3, `pages.css:1990/1995/1999`). Der **About-/Version-Screen** ist
neu, zweisprachig und korrekt verdrahtet (`__APP_VERSION__` ← `pkg.version` = `0.1.0`, zeigt
„Hearthforge Idle — v0.1.0 (Early Access)"). EnchantingPage und Slayer-Glow sind unverändert rund.
**Dagegen:** Das Suffix-System ist seit Run 5 *live* (16 Suffixe, gerollt bei Combat-Drops
`combat.ts:418` und Crafting `tick.ts:137`) — aber im Item-Tooltip wird ein Suffix **nur als
Namensphrase** sichtbar; seine gerollten Stats erscheinen nirgends. Das ist die teuerste sichtbare
Politur-Lücke des Builds. Keine P0; ein neues P1.

---

## Verifikation der Run-5-Änderungen

### (1) Achievement-Grid 5→4→3 — GEFIXT
`pages.css:1990` `repeat(5,…)`; `@max-width:1350px → repeat(4,…)`; `@max-width:1100px → repeat(3,…)`.
Die in run4 bemängelte 5→3-Sprungstufe hat jetzt die fehlende 4er-Zwischenstufe. **Erledigt.**

### (2) About-/v0.1.0-Screen — NEU, funktional, mit Link-Platzhaltern
`OptionsPage.tsx:202-229`. Eigene Panel-Sektion: Versionszeile in Gold/Cinzel
(`about.version` mit `{version}`→`__APP_VERSION__`), Build-Note, Credits, Copyright. i18n EN+DE
vollständig (`translations.ts:760-766 / 1521-1523`). `__APP_VERSION__` per `electron.vite.config.ts:26`
aus `pkg.version` injiziert → kein „undefined"-Risiko. **Funktional erledigt** — aber zwei sichtbare
Buttons („Report a Bug", „Discord", `:211-224`) tragen `href="#"` mit `TODO(urls)`-Kommentar:
sie sind klickbar und tun nichts. Siehe P2.

### (3) EnchantingPage — STABIL (keine Regression)
`EnchantingPage.tsx`. 3 Tabs (`bench/vault/salvage`, `role="tablist"` + `aria-selected`, `:463-474`),
Item-/Runen-Auswahl mit Live-Preview, Kosten, Disenchant-Reihe, Auto-Salvage-Toggle. Instanz-Namen
mit Affix/Suffix korrekt (`instanceDisplayName`). Bonus-Zeilen werden hier ausformuliert
(`formatBonusLines`). Sauber. (Affix-„Gem" = Unicode-`✦`, kein PNG — siehe P3.)

### (4) Slayer-Lauf-Hilfe / Glow — UNVERÄNDERT VORHANDEN
`combat.css:35/52/57` (`.slayer-target-badge`, `.monster-card.slayer-target`,
`.zone-card.slayer-target-zone`) weiterhin aktiv. Kein Regress.

---

## Re-Check Kern-Ziele (weiterhin erfüllt)
- **1080p-Auto-Skalierung**: Main-Zoom-Hook unverändert (run4 verifiziert, ~0.80). ✓
- **Gekachelte BGs / Equip-Raritäts-BG / globaler Cursor**: unverändert. ✓
- **Item-Tooltip Grundgerüst**: Crest, Raritäts-Label in Raritätsfarbe, Typ-Zeile, gerahmtes Bild,
  Stat-Block mit **PNG-Stat-Icons** (`statIcon` + `getUiIcon`), Requirements met/unmet, Wert+Gold-PNG. ✓
- **Monster-Karten-Grid** max. 4 Spalten (`combat.css:98`, `auto-fill minmax`). ✓
- **Design-System-Kohärenz (Citadel)**: keine MMO-Halluzinationen. ✓

---

## Findings

### [P1] Suffix-Rolls im Tooltip unsichtbar — nur als Namensphrase
**Das zentrale neue UX-Loch.** Suffixe sind live und droppen/craften (16 Stück, WoW-Stil Random
Rolls inkl. ±15 % Varianz, `shared/src/index.ts:1286`). Im Item-Tooltip (`ItemTooltip.tsx`) passiert
mit dem Suffix aber **nur eines**: `instanceDisplayName` hängt die Phrase an den Namen
(„Schwert **des Bären**", `:456-458`). Danach:
- Der Stat-Block `StatRows` rendert ausschließlich `item.bonus` der **Basis-`ItemDef`** (`:194-353`),
  also *nicht* den Instanz-Delta. Die gerollten +STR/+CON/+Melee des Suffix erscheinen als **keine
  einzige Zeile**.
- Der Instanz-Affix-Block (`:568-583`) listet ausdrücklich nur `inst.affixes` (Verzauberungs-Runen),
  **niemals `inst.suffix`**.

Folge: Der Spieler liest einen Namen, der einen Bonus verspricht, sieht aber nirgends *was* oder
*wie viel*. Zwei „des Bären"-Items sind nicht vergleichbar; die Roll-Qualität (das ganze Random-Roll-
Feature) ist im Item selbst nicht ablesbar. Die Werte fließen zwar via `computeStats`/`instanceStatDelta`
(`shared/src/index.ts:1189-1218`) korrekt ins Charakterblatt — aber genau die *Item-zentrierte*
Lesbarkeit, von der ein Loot-Spiel lebt, fehlt. **Fix:** eigener Suffix-Block analog zum Affix-Block
(Phrase + aufgelöste Stat-Zeilen aus `instanceStatDelta`/`SuffixDef`) + optional ein Roll-Qualitäts-
Indikator (0,85…1,0 → z. B. %-Badge oder Sterne).

### [P2] Inventar-Grid markiert Suffix-only-Items nicht
`ItemCell.tsx:93-95`: das `✦`-Eck-Badge erscheint **nur** bei `instance.affixes.length > 0`. Ein Item
mit ausschließlich gerolltem Suffix (kein Enchant) bekommt **kein** Badge und sieht im Inventar/Bank/
Vault-Grid identisch zu einem schmucklosen Stück aus (Phase 1: Instanz-Rarity == Basis-Rarity, hebt
den Rahmen also auch nicht an). Spieler erkennen ihren Random-Roll-Loot beim Überfliegen nicht.
**Fix:** Badge-Bedingung auf `instance.affixes.length > 0 || instance.suffix` erweitern (ggf. zweite
Badge-Variante/Farbe für „nur Suffix").

### [P2] About-Screen: Bug-Report- & Discord-Links sind tote `href="#"`
`OptionsPage.tsx:210-224`, `TODO(urls)`. Zwei prominente, klickbare Buttons ohne Ziel. Im fertigen
Build wirkt das kaputt. **Fix:** echte URLs einsetzen oder die Buttons bis dahin ausblenden/deaktivieren.

### [P3] Options-Audio-Buttons noch roh: `🔊 🔇 🎵` (unverändert aus run4)
`OptionsPage.tsx:139/158`. Letzte rohe Emoji-Fläche im Optionsmenü; Asset-Lücke
(`icon_sound_on/off`, `icon_music`) bleibt offen. **Fix:** Icons liefern + via `getUiIcon` binden,
oder Text-Toggle wie bei den Save-Buttons.

### [P3] Affix-„Gem" `✦` ist Unicode, kein PNG — an 3 Stellen
Tooltip (`ItemTooltip.tsx:576`), EnchantingPage (Preview/Current/Rune, `:273/311`) und ItemCell-Badge
(`:94`). Konsistent eingesetzt, aber kein echtes Citadel-Gem-Asset. **Fix:** sobald ein Gem/Rune-Icon
existiert, zentral als PNG ersetzen.

### [P3] Tooltip-Stat-Icons ohne PNG-Fallback: `🏹` (Ammo), `🎒` (Bag), `✦` (Manakosten)
`ItemTooltip.tsx:241/250` (Ammo-Dmg/-Typ), `:307` (Bag-Kapazität), `:329` (Manakosten). Die meisten
Stat-Zeilen laufen über `statIcon(getUiIcon, emoji-fallback)` — diese drei sind **reine Emojis ohne
PNG-Pfad** und fallen im sonst PNG-sauberen Stat-Block auf. **Fix:** in das `statIcon`-Muster ziehen,
sobald Icons da sind (oder bestehende Köcher-/Beutel-Icons mappen).

### [P3] Achievement-Karten-Kategorie-Emblem weiterhin Emoji (unverändert aus run4)
Pro Karte sichtbar; bewusster Platzhalter „structured for future PNGs". Auffälligster verbliebener
Emoji-Punkt außerhalb der Audio-Buttons.

### [P3] Alt-Bekannte aus run4 (unverändert, hier nicht erneut tief geprüft)
- Cursor-Dateiname-Typo `cusor_default.png` (`base.css`) — Umbenennung würde Cursor still killen.
- Manueller UI-Scale: absolute %-Labels (90/100/110/125 %) multiplizieren sich mit dem Auto-Zoom,
  ohne Relativ-Hinweis (`OptionsPage.tsx:107`, `uiScale.ts`).

---

## Δ vs run4

| Punkt | run4 | run5 |
|---|---|---|
| Score | 8.5 / 10 | **8.5 / 10** |
| Achievement-Grid 5→3 | P3 offen | **gefixt** (5→4→3) |
| About-/v0.1.0-Screen | — | **neu & funktional** (Links P2) |
| Suffix-Anzeige im Tooltip | nicht geprüft | **P1 neu** (nur Namensphrase, keine Stats) |
| Suffix-Badge im Grid | nicht geprüft | **P2 neu** (nur Affixe badgen) |
| About Bug-/Discord-Links | — | **P2 neu** (`href="#"`) |
| EnchantingPage / Slayer-Glow | ✓ | ✓ (unverändert) |
| Options 🔊🔇🎵 | P3 offen | P3 offen (unverändert) |
| Affix-Gem `✦` Unicode | nicht separat | P3 (3 Stellen) |
| Tooltip Ammo/Bag/Mana-Emoji | nicht separat | P3 (kein PNG-Fallback) |
| Achievement-Kategorie-Emblem | P3 | P3 (unverändert) |
| Cursor-Typo / UI-Scale-Labels | P3 | P3 (unverändert) |

**P0:** keine · **P1:** 1 (Suffix-Tooltip) · **P2:** 2 (Grid-Badge, About-Links) · **P3:** 6

---

## Was fehlt für 9,5?
1. **Suffix als vollwertige Tooltip-Sektion** (P1): eigener Block mit Phrase + aufgelösten Stat-Zeilen
   (aus `instanceStatDelta`/`SuffixDef`) + Roll-Qualitäts-Indikator. Das hebt das gesamte
   Random-Roll-Feature von „unsichtbar" auf „lesbar/vergleichbar" — der größte Einzel-Hebel.
2. **Suffix-only-Items im Grid markieren** (P2): Badge-Bedingung um `|| instance.suffix` erweitern,
   damit Loot beim Überfliegen erkennbar ist.
3. **About-Links echt machen** (P2): reale Bug-Tracker-/Discord-URL statt `href="#"`, sonst vor
   Release ausblenden.
4. **Letzte Emoji-Fronten schließen** (P3-Bündel): Audio-Buttons, Achievement-Kategorie-Embleme,
   Affix-Gem `✦`, Tooltip-Ammo/Bag/Mana — alles als Asset-Lücke listen und via `getUiIcon`/`statIcon`
   binden. Damit ist der UI-Emoji-Anteil im sichtbaren Spiel praktisch null.
5. **Mikro-Politur** (P3-Carry): Cursor-Dateiname-Typo sauber ziehen, UI-Scale-Labels relativ benennen.

## Schnell-Verdikt
Breiten-Fortschritt (Grid-Stufe, About/v0.1.0) trifft auf eine frisch live geschaltete Mechanik mit
unfertiger Oberfläche: Suffix-Loot existiert, ist aber im Item selbst nicht ablesbar. Sobald die
Suffix-/Grid-Anzeige (P1+P2) und die About-Links (P2) sitzen, ist 9,0+ realistisch; die 9,5 verlangt
zusätzlich das Schließen der letzten Emoji-/Asset-Lücken. Build bleibt release-tauglich, aber das
Suffix-Tooltip-Loch ist der nächste Pflicht-Fix.
