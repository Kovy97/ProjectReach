# Run 6 — UX/UI & Visuelle Kohärenz (Playtester-Review)

> READ-ONLY Sichtprüfung des Renderers (`apps/client/src/renderer`) + Belege aus
> `packages/shared`/`content` (nur zur Severity-Einstufung gelesen). Stand 2026-06-28.
> Run 6 **nach** dem run5-P1 „Suffix-Tooltip". Fokus laut Auftrag: **Suffix-Sichtbarkeit**
> (Tooltip-Stat-Zeilen via `SuffixBlock`, Grid-Badge für Suffix-Items, „Verzaubertes Item!"-
> Drop-Toast), **Onboarding-Light** (Farm/Enchant-Hinweise), **Alle-Plots-Button**,
> **Ammo-PNG-Fallback**, **About-Buttons disabled**, restliche Emoji-/Politur-Lücken.
> Vergleich gegen `design/qa/run5-ux-ui.md` (war 8,5 — Suffix-Tooltip-P1 offen).

## Fun / Polish-Score: **9.0 / 10** (Δ +0,5)

Der Lauf, der die offene run5-Rechnung sauber begleicht. **Alle drei run5-Befunde sind zu —**
das teure P1 (Suffix-Rolls im Tooltip unsichtbar) und beide P2 (Grid-Badge, tote About-Links).
Dazu kommen vier sichtbare, gut gemachte Mini-Features (Drop-Toast, Farm-/Enchant-Hinweise,
Alle-Plots, Ammo-PNG im Kampf), die das Loot- und Onboarding-Gefühl direkt anheben. Es bleibt
**keine P0/P1, faktisch keine P2** — der Rest ist die „letzte Meile" Emoji-/Asset-Politur, genau
das, was die 9,5 noch trennt. Der Sprung um +0,5 ist verdient: Random-Roll-Loot ist jetzt
**lesbar, vergleichbar und beim Droppen spürbar**.

---

## Verifikation der Run-6-Änderungen

### (1) Suffix als vollwertige Tooltip-Sektion — GELANDET (run5-P1 geschlossen)
`ItemTooltip.tsx:357-410` (`SuffixBlock`), eingehängt `:643`. Eigener Block analog zum Affix-Block:
Label `instance.suffix` („Suffix:"), Suffix-Phrase (`tr(sdef.suffix)`) und — der eigentliche Fix —
**aufgelöste Stat-Zeilen**. Sauber isoliert über eine Fake-Instanz (`affixes:[], suffix`) +
`instanceBonusDelta(fakeInst, content)` (`:364-365`), sodass nur der Suffix-Anteil gezeigt wird,
nie der Affix-Delta. Alle Bonus-Typen + Attribut-Modifier werden gerendert (`:368-401`), mit
denselben PNG-Stat-Icons wie der Hauptblock. **Damit ist das zentrale run5-Loch zu:** zwei
„des Bären"-Items zeigen jetzt ihre konkreten Werte (+4 vs +3 STR direkt ablesbar) → vergleichbar.

### (2) Grid-Badge für Suffix-Items — GELANDET (run5-P2 geschlossen)
`ItemCell.tsx:93-95`: Badge-Bedingung jetzt `instance.affixes.length > 0 || !!instance.suffix`.
Suffix-only-Loot bekommt im Inventar/Bank/Vault sein `✦`-Eck-Badge und ist beim Überfliegen
erkennbar. (Hinweis: gleiches `✦` für Affix wie Suffix — kein eigener Look. Siehe P3.)

### (3) „Verzaubertes Item!"-Drop-Toast — NEU, funktional
`Toasts.tsx:94-100` (Snapshot der Instanz-IDs mit Affix **oder** Suffix) + `:192-208` (Diff →
Toast). Feuert pro neuer Instanz im Inventar, Titel `toast.enchanted.title` („Verzaubertes Item!"),
Detail = Basis-Itemname. i18n EN+DE vorhanden (`translations.ts:770/1540`). Schließt den Loop:
Suffix entsteht → Spieler wird benachrichtigt → Tooltip zeigt die Werte.

### (4) Onboarding-Light (Farm + Enchant) — GELANDET
- **Farm:** Inline-Hinweis fest unter der Plot-Section (`FarmPage.tsx:434-436`, `farm.hint.plots`)
  **plus** einmaliger Toast beim ersten gepflanzten Crop (`Toasts.tsx:103/211-219`).
- **Enchant:** Hinweistext `enchant.suffixHint` (`EnchantingPage.tsx:171`) erklärt Random-Suffixe
  explizit inkl. Beispiel „+8 Verteidigung des Bären".
- **Tutorial-Wiederaufruf:** neue Options-Sektion „Hilfe" mit Button → `reopenOnboarding`
  (`OptionsPage.tsx:113-120`).
i18n EN+DE für alle neuen Keys belegt (`translations.ts:773-774 / 1543-1544`). Bleibt bewusst
leichtgewichtig — passt zur Memory-Note „großer geführter Flow erst als finaler Meilenstein".

### (5) Alle-Plots-Button — GELANDET
`FarmPage.tsx:425-431` (CTA „Alle bepflanzen") öffnet `CropPicker` mit `plotIndex={null}`
(`:712-719`); `handlePick` bepflanzt dann alle freigeschalteten leeren Plots (`:273-278`,
intern Noop bei belegtem Slot). Eigener Modal-Titel `farm.plantAllTitle`. Spart das Plot-für-Plot-
Klicken — echter QoL-Gewinn fürs Idle-Gefühl.

### (6) Ammo-PNG-Fallback — GELANDET (im Kampf)
`CombatPage.tsx:620-628`: der Munitions-Zähler nutzt jetzt `getItemImage(ammoType)` → echtes
Köcher/Pfeil-PNG, sonst `ammoItem.icon`, sonst `🪶`. Tooltip `combat.ammoHint`, Leer-Warnung
`combat.ammoEmpty`. **Hinweis:** Das betrifft den Kampf-Counter; die Tooltip-**Stat-Zeilen** für
Ammo sind weiterhin rohe Emojis (siehe P3) — die run5-P3-Notiz ist hier nur teilweise abgearbeitet.

### (7) About-Buttons disabled — GELANDET (run5-P2 geschlossen)
`OptionsPage.tsx:211-216`: „Report a Bug" und „Discord" sind jetzt `disabled` mit `opacity:0.5`
und `title={t("about.comingSoon")}` („Demnächst"). Keine toten `href="#"`-Klickflächen mehr —
wirkt im Build absichtlich statt kaputt. i18n `about.comingSoon` EN+DE (`:775/1545`).

---

## Re-Check Kern-Ziele (weiterhin erfüllt)
- **Item-Tooltip-Grundgerüst**: Crest, Raritäts-Label in Farbe, Typ-/Specialty-Zeile, gerahmtes
  Bild, PNG-Stat-Block, Requirements met/unmet, Wert+Gold-PNG. ✓ (jetzt + Affix- **und** Suffix-Block)
- **Monster-Grid / gekachelte BGs / Equip-Raritäts-Glow / globaler Cursor**: unverändert. ✓
- **Design-System-Kohärenz (Citadel)**: keine MMO-Halluzinationen, Onboarding bleibt in-context. ✓
- **i18n-Disziplin**: alle neuen Keys EN+DE doppelt belegt — kein Roh-Key-Leak. ✓

---

## Findings

### [P3] SuffixBlock ohne Roll-Qualitäts-Indikator
`ItemTooltip.tsx:357-410`. Die gerollten Werte sind jetzt sichtbar (Hauptfix erledigt), aber es
fehlt der in run5 als optional vorgeschlagene Qualitäts-Hinweis (z. B. „87 %" oder Sterne aus dem
0,85…1,0-Roll). Folge: man sieht *was* der Suffix gibt und kann zwei Items zahlenmäßig vergleichen,
aber nicht *wie nah am Maximum* ein einzelner Roll liegt. Reine Convenience, da die Vergleichbarkeit
über die Absolutwerte schon gegeben ist. **Fix:** kleinen %-/Stern-Badge aus dem gespeicherten Roll
ableiten und neben die Suffix-Phrase setzen.

### [P3] Suffix-only-Badge optisch identisch zum Affix-Badge
`ItemCell.tsx:94`. Suffix- und Affix-Items tragen beide dasselbe `✦`-Eck-Badge. Beim Überfliegen
unterscheidet man Verzauberung (Rune) nicht von Random-Roll-Loot. Akzeptabel (beide signalisieren
„besonders"), aber eine zweite Variante/Farbe für „nur Suffix" wäre sauberer. **Fix:** zweite
Badge-Klasse/Farbe, sobald gewünscht.

### [P3] Tooltip-Stat-Icons ohne PNG-Fallback: `🏹` (Ammo), `🎒` (Bag), `✦` (Manakosten)
`ItemTooltip.tsx:241/250` (Ammo-Dmg/-Typ), `:307` (Bag-Kapazität), `:329` (Manakosten). Weiterhin
**rohe Emojis ohne `statIcon`-Muster** — fallen im sonst PNG-sauberen Stat-Block auf. Der Kampf-
Ammo-Counter wurde in Run 6 auf PNG gezogen (CombatPage), die Tooltip-Zeilen aber nicht.
**Fix:** in das `statIcon(getUiIcon, emoji)`-Muster ziehen (Köcher-/Beutel-/Mana-Icon mappen).

### [P3] Options-Audio-Buttons noch roh: `🔊 🔇 🎵` (unverändert aus run5)
`OptionsPage.tsx:139/158`. Drei Emojis mitten im Settings-Panel — auffälligste rohe Emoji-Fläche
im Hauptmenü-Bereich, weil das übrige Optionen-UI textbasiert/PNG ist. **Fix:** `icon_sound_on/off`
+ `icon_music` liefern und via `getUiIcon` binden, oder reiner Text-Toggle wie bei den Save-Buttons.

### [P3] Affix-„Gem" `✦` ist Unicode, kein PNG — an mehreren Stellen (unverändert)
Tooltip-Affixblock (`ItemTooltip.tsx:633`), ItemCell-Badge (`:94`), EnchantingPage. Konsistent
eingesetzt, aber kein echtes Citadel-Gem-Asset. **Fix:** sobald ein Gem/Rune-Icon existiert,
zentral als PNG ersetzen (deckt automatisch auch den neuen Suffix-Badge mit ab).

### [P3] Achievement-Karten-Kategorie-Emblem weiterhin Emoji (Carry aus run4/5)
Bewusster Platzhalter „structured for future PNGs". Verbliebener Emoji-Punkt außerhalb der
Audio-Buttons.

### [P3] Alt-Bekannte (Carry, nicht erneut tief geprüft)
- Cursor-Dateiname-Typo `cusor_default.png` (`base.css`) — Umbenennung würde Cursor still killen.
- Manueller UI-Scale: absolute %-Labels (90/100/110/125 %) multiplizieren sich mit dem Auto-Zoom
  ohne Relativ-Hinweis (`OptionsPage.tsx:101-110`, `uiScale.ts`).

---

## Δ vs run5

| Punkt | run5 | run6 |
|---|---|---|
| Score | 8.5 / 10 | **9.0 / 10** |
| Suffix-Stats im Tooltip | **P1 offen** | **gefixt** (`SuffixBlock`, aufgelöste Stat-Zeilen) |
| Suffix-Badge im Grid | **P2 offen** | **gefixt** (`\|\| !!instance.suffix`) |
| About Bug-/Discord-Links | **P2 offen** (`href="#"`) | **gefixt** (`disabled` + „Demnächst") |
| „Verzaubertes Item!"-Drop-Toast | — | **neu** (Affix+Suffix) |
| Onboarding-Light Farm/Enchant | — | **neu** (Inline-Hinweise + Erst-Plant-Toast + Hilfe-Button) |
| Alle-Plots-Button | — | **neu** (Plant-All-Modal) |
| Ammo-PNG (Kampf-Counter) | P3 (kein Fallback) | **gefixt im Kampf** (Tooltip-Zeilen offen) |
| Roll-Qualitäts-Indikator | (optional in P1) | **P3 neu** (Werte sichtbar, %/Sterne fehlen) |
| Suffix- vs Affix-Badge-Look | — | **P3 neu** (identisches `✦`) |
| Tooltip Ammo/Bag/Mana-Emoji | P3 | P3 (unverändert) |
| Options 🔊🔇🎵 | P3 | P3 (unverändert) |
| Affix-Gem `✦` Unicode | P3 | P3 (unverändert) |
| Achievement-Kategorie-Emblem | P3 | P3 (unverändert) |
| Cursor-Typo / UI-Scale-Labels | P3 | P3 (unverändert) |

**P0:** keine · **P1:** keine · **P2:** keine · **P3:** 7 (alle Emoji-/Asset-/Convenience-Politur)

---

## Was fehlt für 9,5?
1. **Letzte Emoji-Fronten schließen** (P3-Bündel, größter Hebel): Options-Audio `🔊🔇🎵`,
   Tooltip-Ammo/Bag/Mana `🏹🎒✦`, Achievement-Kategorie-Embleme — alle ins `getUiIcon`/`statIcon`-
   Muster ziehen, sobald die Assets da sind. Damit ist der sichtbare Emoji-Anteil praktisch null
   und der Stat-Block durchgängig PNG-sauber.
2. **Affix-Gem `✦` als echtes PNG** ersetzen (Tooltip + ItemCell-Badge + EnchantingPage zentral).
   Deckt automatisch auch den Suffix-Badge mit ab.
3. **Roll-Qualitäts-Indikator** am Suffix (P3): kleiner %-/Stern-Badge aus dem gespeicherten Roll —
   hebt „lesbar/vergleichbar" auf „auf einen Blick gut/schlecht erkennbar".
4. **Suffix-Badge visuell vom Affix-Badge trennen** (P3): zweite Farbe/Variante für „nur Suffix",
   damit Rune-Verzauberung und Random-Roll im Grid unterscheidbar sind.
5. **Mikro-Politur** (P3-Carry): Cursor-Dateiname-Typo sauber ziehen, UI-Scale-Labels relativ benennen.

## Schnell-Verdikt
Pflicht-Run mustergültig erledigt: das run5-Suffix-Loch (P1) und beide P2 sind zu, und Suffix-Loot
ist über die ganze Kette — Drop-Toast → Grid-Badge → Tooltip-Stats — durchgängig sichtbar und
vergleichbar. Plus echte QoL (Alle-Plots) und gute In-Kontext-Hilfen ohne den finalen Tutorial-Flow
vorwegzunehmen. Es bleibt **keine P0/P1/P2** — nur die kosmetische letzte Meile. **9,0 ist solide;
die 9,5 ist jetzt rein eine Asset-/Icon-Lieferfrage** (Emoji-Fronten + Gem-PNG), nicht mehr ein
Mechanik-/UX-Loch. Build bleibt klar release-tauglicher als in Run 5.
