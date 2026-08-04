# Run 7 — UX/UI & Visuelle Kohärenz (Playtester-Review)

> READ-ONLY Sichtprüfung des Renderers (`apps/client/src/renderer`) + Belege aus
> `packages/engine`/`content` (nur zur Severity-Einstufung gelesen). Stand 2026-06-28.
> Run 7 ist ein **Bestätigungs-/Kontroll-Lauf**: seit run6 sind **keine großen UI-Änderungen**
> gelandet (die letzten Features — Suffix-Sichtbarkeit, Onboarding-Light, Bulk-Replant — waren run6).
> Auftrag-Kernfrage: Ist der verbleibende Weg zu **9,5** primär **Asset-Lieferung** (Emoji→PNG,
> Affix-Gem-PNG, Achievement-Embleme), also chef-gated über Icon-Generierung — oder steckt noch eine
> echte UX-Lücke drin? Plus gezielte Mini-Hypothese aus dem Auftrag (Achievements/`content`-Durchreichung).
> Vergleich gegen `design/qa/run6-ux-ui.md` (war 9,0 — Rest = Emoji-/Asset-Politur).

## Fun / Polish-Score: **9.0 / 10** (Δ ±0,0)

Kein Regress, kein Fortschritt — und genau das ist die ehrliche Bewertung eines Laufs ohne neue
Features. Der Build ist visuell deckungsgleich mit run6: Suffix-Loot-Kette (Drop-Toast → Grid-Badge →
Tooltip-Stats), Onboarding-Hinweise, Alle-Plots-Button und der PNG-saubere Stat-Block stehen alle
unverändert. **Die Kernfrage des Auftrags lässt sich klar bestätigen: der 9,5-Weg ist zu ~90 %
reine Asset-/Icon-Lieferung** (chef-gated). ABER: die im Auftrag genannte Mini-Hypothese stimmt und
ist **kein Politur-, sondern ein Korrektheits-Bug** — damit bleibt entgegen dem run6-Schlusssatz
(„keine P2") **eine echte, code-seitige UX-Lücke** offen, die nicht auf den Chef wartet. Sie war schon
in run6 latent vorhanden, nur unbemerkt. Deshalb halte ich die 9,0 (statt sie zu heben): die letzte
Meile ist nicht mehr *rein* kosmetisch.

---

## Bestätigung der Auftrags-Kernfrage

### Ja — der 9,5-Weg ist primär Asset-Lieferung (chef-gated). Verifiziert, alle run6-P3 stehen unverändert:

| run6-P3 | Datei:Zeile | Status run7 |
|---|---|---|
| Options-Audio `🔊🔇🎵` | `OptionsPage.tsx:139/158` | **unverändert** (rohe Emojis) |
| Tooltip Ammo `🏹` (Dmg/Typ) | `ItemTooltip.tsx:241/250` | **unverändert** (kein `statIcon`) |
| Tooltip Bag `🎒` | `ItemTooltip.tsx:307` | **unverändert** |
| Tooltip Manakosten `✦` | `ItemTooltip.tsx:329` | **unverändert** |
| Affix-Gem `✦` (Unicode statt PNG) | `ItemTooltip.tsx:633` + ItemCell-Badge + EnchantingPage | **unverändert** |
| Achievement-Kategorie-Embleme = Emoji | `AchievementsPage.tsx:24-35/144-147` | **unverändert** (Fallback exploration/meta) |
| Roll-Qualitäts-Indikator am Suffix | `ItemTooltip.tsx` SuffixBlock | **fehlt weiter** (Convenience) |
| Suffix-Badge optisch = Affix-Badge | `ItemCell.tsx:94` | **unverändert** (gleiches `✦`) |

Diese acht Punkte sind alle entweder **Asset-Beschaffung** (`getUiIcon`/`statIcon`-Muster steht schon,
es fehlt nur die PNG-Lieferung: `icon_sound_on/off`, `icon_music`, Köcher-/Beutel-/Mana-Icon, ein
zentrales Gem/Rune-PNG, Kategorie-Embleme) oder **reine Convenience** (Roll-%, zweite Badge-Farbe).
**Keiner davon ist ein UX-Loch im engeren Sinn** — die Information ist überall da, nur nicht final
vergoldet. Insofern: Bestätigung erteilt, die Politur-Liste ist korrekt eingeordnet.

**Teil-Hinweis (kein eigener Befund):** Das `statIcon`-Muster ist im Tooltip bereits aktiv für die
Attribut-Zeilen (`ItemTooltip.tsx:203/341/371` nutzen `statIcon("icon_attribute_rangedamage","🏹")`),
**nicht** aber für die Ammo-/Bag-/Mana-Zeilen (`:241/250/307/329`). Sobald die drei PNGs da sind, ist
das ein 4-Zeilen-Swap im exakt selben Muster — also wirklich nur Lieferung + Bind.

---

## Echte UX-Lücke (NICHT chef-gated) — Auftrags-Mini-Hypothese bestätigt

### [P2] AchievementsPage reicht `content` nicht an `achievementProgress` → `sets_completed`-Fortschritt zeigt dauerhaft 0
`AchievementsPage.tsx:137`:
```
const progress = unlocked ? def.condition.count : achievementProgress(state, def.condition);
```
Der dritte Parameter `content` fehlt. Die Engine ist **bewusst defensiv** gebaut
(`achievements.ts:34-36, 72-76`): nur `sets_completed` braucht den Content (Set-Defs via
`activeSets(state, content)`), und **ohne Content liefert dieser Zweig hart `return 0`**. Folge in der
UI: die Fortschrittsbalken/Zähler der drei „Set"-Achievements stehen fest auf 0 —
- `ach_sets_completed_1` „Set-Sucher" → **0 / 1**
- `ach_sets_completed_5` „Set-Sammler" → **0 / 5**
- `ach_sets_completed_10` „Set-Vollender" → **0 / 10**
(`content/src/index.ts:9786-9788`, Kategorie *collection*).

**Warum P2 und nicht P3:** Das ist keine Kosmetik, sondern **angezeigte Falschinformation** —
ein Spieler, der gerade ein vollständiges Set trägt, sieht trotzdem „0 / 5". Das untergräbt genau
das, was die Achievements-Seite leisten soll (Fortschritt lesbar machen). **Warum nicht P1:** Der
**Unlock-Pfad selbst ist korrekt** — `checkAchievements` (`achievements.ts:99`) reicht den Content
immer durch, der Erfolg schaltet also normal frei; nur die *Vorschau* auf der Karte ist falsch.
Betroffen sind 3 Karten von vielen, kein Blocker, kein Save-Risiko.

**Fix (1 Zeile, kein Asset nötig):** `content` ist in der Datei bereits importiert (`:2`) → Aufruf auf
`achievementProgress(state, def.condition, content)` ändern. `AchievementCard` müsste `content`
zusätzlich als Prop/Closure erhalten (es nutzt `useGameState`, aber nicht den Content). Trivialer,
risikoarmer UI-Fix.

> Hinweis am Rande (für content/balance, **nicht** UX): `sets_completed` zählt *gleichzeitig getragene*
> Sets (`activeSets`), nicht kumulativ. Ob 5 bzw. 10 Sets simultan überhaupt tragbar sind (Slot-Limit),
> ist eine Erreichbarkeitsfrage außerhalb dieses UX-Berichts — hier nur als Kontext erwähnt, warum die
> Karten ohne den Fix dauerhaft 0 zeigen und es niemandem auffällt.

---

## Re-Check Kern-Ziele (weiterhin erfüllt, deckungsgleich mit run6)
- **Suffix-Loot-Kette**: Drop-Toast → `✦`-Grid-Badge → SuffixBlock mit aufgelösten Stat-Zeilen. ✓
- **Item-Tooltip-Grundgerüst** (Crest, Raritätsfarbe, gerahmtes Bild, PNG-Stat-Block, Req met/unmet). ✓
- **Onboarding-Light** (Farm-/Enchant-Hinweise, Erst-Plant-Toast, Hilfe-Button), kein vorgezogener
  Tutorial-Flow → passt zur Memory-Note „großer Flow erst final". ✓
- **Monster-Grid / gekachelte BGs / Equip-Glow / globaler Cursor**. ✓
- **Citadel-Disziplin**: keine MMO-Halluzinationen, Hilfen bleiben in-context. ✓
- **i18n**: keine neuen Keys in run7 (keine neuen Features) → kein Roh-Key-Leak. ✓

---

## Findings (Übersicht)

- **[P2] `content` nicht durchgereicht → `sets_completed`-Fortschritt zeigt 0** — `AchievementsPage.tsx:137`.
  Einzige echte, **nicht** chef-gated UX-Lücke des Laufs. (Details oben.)
- **[P3] Options-Audio `🔊🔇🎵`** — `OptionsPage.tsx:139/158`. Asset-gated.
- **[P3] Tooltip Ammo/Bag/Mana `🏹🎒✦`** — `ItemTooltip.tsx:241/250/307/329`. Asset-gated (Muster steht).
- **[P3] Affix-Gem `✦` Unicode statt PNG** — Tooltip `:633` + ItemCell + EnchantingPage. Asset-gated, zentral.
- **[P3] Achievement-Kategorie-Embleme Emoji** (exploration/meta-Fallback) — `AchievementsPage.tsx:40-66`. Asset-gated.
- **[P3] Roll-Qualitäts-Indikator am Suffix fehlt** — Convenience, Werte sind bereits sichtbar.
- **[P3] Suffix-Badge optisch = Affix-Badge** (`ItemCell.tsx:94`) — Convenience, deckt sich mit Gem-PNG.
- **[P3] Carry:** Cursor-Dateiname-Typo `cusor_default.png` (`base.css`); UI-Scale-%-Labels ohne Relativ-Hinweis
  (`OptionsPage.tsx:101-110`).

**P0:** keine · **P1:** keine · **P2:** 1 (Achievements-`content`-Durchreichung) · **P3:** 7 (Asset/Convenience)

---

## Δ vs run6

| Punkt | run6 | run7 |
|---|---|---|
| Score | 9.0 / 10 | **9.0 / 10** (±0) |
| Neue UI-Features | 6 (Suffix/Onboarding/Plots …) | **0** (Kontroll-Lauf) |
| `sets_completed`-Fortschritt korrekt | (nicht geprüft → übersehen) | **P2 neu entdeckt** (zeigt 0, `content` fehlt) |
| „keine P2"-Aussage | behauptet | **korrigiert** (latente P2 war schon da) |
| Options `🔊🔇🎵` | P3 | P3 (unverändert) |
| Tooltip Ammo/Bag/Mana-Emoji | P3 | P3 (unverändert) |
| Affix-Gem `✦` Unicode | P3 | P3 (unverändert) |
| Achievement-Kategorie-Emblem | P3 | P3 (unverändert) |
| Roll-Qualitäts-Indikator | P3 | P3 (unverändert) |
| Suffix- vs Affix-Badge-Look | P3 | P3 (unverändert) |
| Cursor-Typo / UI-Scale-Labels | P3 | P3 (unverändert) |

---

## Was fehlt für 9,5?

**Bestätigung der Kernfrage: Ja, der Hauptweg ist Asset-Lieferung — mit EINER nicht-asset-Ausnahme vorab.**

0. **(NEU, Pflicht vor 9,5, kein Asset nötig)** Den P2 schließen: `content` in
   `AchievementsPage` an `achievementProgress` durchreichen, damit die drei „Set"-Achievements
   echten Fortschritt zeigen statt 0. Solange eine Achievements-Karte aktiv Falsches anzeigt, ist
   die 9,5 nicht ehrlich erreichbar — und dieser Fix wartet **nicht** auf den Chef.

Danach ist der Rest reine **Icon-/Asset-Lieferung (chef-gated)** + Mini-Convenience:
1. **Letzte Emoji-Fronten schließen** (größter Hebel, asset-gated): Options-Audio `🔊🔇🎵`,
   Tooltip-Ammo/Bag/Mana `🏹🎒✦`, Achievement-Kategorie-Embleme — alle ins
   `getUiIcon`/`statIcon`-Muster ziehen, sobald die PNGs da sind. Muster steht bereits.
2. **Affix-Gem `✦` als echtes PNG** (Tooltip + ItemCell-Badge + EnchantingPage zentral) — deckt
   automatisch den Suffix-Badge mit ab.
3. **Roll-Qualitäts-Indikator** am Suffix (Convenience): kleiner %-/Stern-Badge aus dem gespeicherten Roll.
4. **Suffix-Badge visuell vom Affix-Badge trennen** (Convenience): zweite Farbe/Variante.
5. **Mikro-Politur** (Carry): Cursor-Dateiname-Typo, UI-Scale-Labels relativ benennen.

---

## Schnell-Verdikt
Kontroll-Lauf ohne neue Features → Score bleibt ehrlich bei **9,0 (Δ ±0)**. Die Auftrags-Kernfrage
ist **bestätigt: der Weg zu 9,5 ist überwiegend Asset-/Icon-Lieferung** (chef-gated über
Icon-Generierung) — alle acht run6-P3 stehen unverändert und sind korrekt als Politur eingeordnet.
**ABER** die im Auftrag genannte Mini-Hypothese stimmt und ist substanzieller als „Mini": das
fehlende `content`-Durchreichen in `AchievementsPage` (`:137`) lässt die drei `sets_completed`-Karten
dauerhaft 0 anzeigen — eine echte, **nicht** chef-gated UX-Korrektheits-Lücke (P2, 1-Zeilen-Fix).
Damit war der run6-Schlusssatz „die 9,5 ist rein eine Asset-Frage" *fast* richtig: erst diesen einen
Code-Fix, **dann** ist es rein eine Asset-Frage.
