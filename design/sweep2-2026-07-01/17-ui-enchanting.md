# 17 — UI Enchanting / Runen / Suffixe

**Fokus:** `apps/client/src/renderer/pages/EnchantingPage.tsx` — Vorschau-Lokalisierung, Verzauberungs-Flow,
Disenchant-Feedback, Affix-/Suffix-Werte im Tooltip, Runen-Rezepte.
**Methode:** Code-Review von EnchantingPage + `engine/src/enchant.ts` + `shared/src/index.ts` (Helper) +
`components/ItemTooltip.tsx` + Content-Katalog (affixes/suffixes/runes) + i18n-Parität. Headless, kein Electron.

## Verifikation der GEFIXTEN Punkte
- **Vorschau lokalisiert (kein hartes EN)?** — TEILWEISE bestätigt. Der Preview-Block
  (`enchant-preview-affix`, EnchantingPage.tsx:289–309) nutzt durchgehend `tr(previewAffixDef.prefix)`,
  `formatBonusLines(..., t)` und `t("enchant.cost")` — die **Flach-Boni + Kosten sind sauber lokalisiert**,
  kein hartes EN mehr. ABER: die Vorschau lässt den Waffeneffekt-Proc weg (siehe F1).
- **Affix-/Suffix-Werte im Tooltip** — bestätigt lokalisiert. `affixEffectSummary` (ItemTooltip.tsx:164–202)
  und `SuffixStatRows` (410–469) nutzen `t()/tr()` für alle Stat-Labels; `instanceDisplayName`
  (shared:1499) löst Prefix+Suffix über `resolveText(..., locale)` auf. Korrekt.
- **Runen-Rezepte** — bestätigt sauber. Enchant-Runen (`rune_keen_i` …) haben Crafting-Recipes
  (`craft_rune_keen_i` …, content:8470ff) mit korrekten deutschen Umlauten ("Schärfe-Rune I herstellen").
- **Crash-Gate** — EnchantingPage wird nur in `MainLayout` (Spiel-Layout) via `PageContent` gerendert
  (App.tsx:84, 299); `useGameState()` (Zeile 85) kann dort nie vor Spielstart feuern. Kein Root-Mount. OK.

---

## Findings (schwerste zuerst)

### F1 [P2][bug] Vorschau & „Verzauberungen"-Liste verschweigen den Waffeneffekt-Proc (Feuer/Frost/Sturm)
**confirmed.** `formatBonusLines` (EnchantingPage.tsx:32–53) liest NUR die flachen `EquipBonus`-Felder,
NICHT `weaponEffectByTier`. Damit zeigt die Enchant-Vorschau für eine Flammen-/Frost-/Sturm-Rune nur den
winzigen Flat-Bonus (z.B. "+1 Nahkampf, +1 Fernkampf, +1 Magie") und **verschweigt den eigentlichen Kaufgrund**
— den Proc "15% Verbrennen · 4/s". Dasselbe gilt für die bereits angebrachten Affixe in der Bench-Liste
(`previewBonusLines` :131–132; `bonuses` :329–330).
- Kontrast: der Item-Tooltip macht es richtig (`affixEffectSummary`, ItemTooltip.tsx:197–200 zeigt
  `${chance}% ${status} · ${magnitude}/s`). Nur im Enchant-Screen fehlt der Wert.
- Betroffen: `affix_flame`, `affix_frost`, `affix_shock` (Runen `rune_flame/frost/storm`, alle 3 Tiers) —
  content:14079/14094/14150 haben `weaponEffectByTier`.
- Erwartet: Preview/Affix-Zeile zeigt den Proc analog zum Tooltip. Tatsächlich: fehlt komplett → elementare
  Runen wirken im Enchant-UI fast wertlos.
- **Owner: UI-Dev** (formatBonusLines um weaponEffectByTier erweitern bzw. `affixEffectSummary` mitnutzen).

### F2 [P2][bug/i18n] Fehlschlag-Feedback zeigt rohe deutsche Engine-Strings (Sprach-Mix in EN-Locale)
**confirmed.** `handleEnchant`/`handleDisenchant` schreiben `r.reason` unverändert ins Feedback-Banner
(EnchantingPage.tsx:145, 152 → gerendert roh bei :286). Die Engine liefert `reason` als **hartkodiertes
Deutsch**: "Nicht genug Gold", "Affix passt nicht zum Item", "Keine Enchant-Slots frei", "Rune nicht im
Inventar", "Nicht verzauberbar", "Inventar voll" u.a. (enchant.ts:104,113,123,158,159,162,168,172,179,
233,236,241). Im **EN-Locale** sieht der Spieler diese deutschen Dev-Strings. Zusätzlich ist der Fallback
`"Failed"` (:145, :152) hartkodiertes Englisch.
- Real erreichbar (nicht nur theoretisch):
  1. **Disenchant ohne Gold:** der Entfernen-Button (:339–342) hat KEIN Gold-Gate → Klick bei zu wenig Gold →
     rohes "Nicht genug Gold".
  2. **Enchant mit unpassender Rune:** `canEnchant` (:134–137) prüft KEINE Affix-Anwendbarkeit → eine
     restriktive Rune auf falschem Item-Typ aktiviert den Button; Klick → rohes "Affix passt nicht zum Item".
     Restriktive Affixe existieren real: `affix_keen`=weapon_melee (content:14077), `affix_arcane`=weapon_magic
     (:14137), `affix_hunter`=weapon_ranged (:14147).
- Erwartet: lokalisierte Meldungen (beide Locales) via i18n-Keys. Tatsächlich: rohe DE-Prosa + EN-Fallback.
- **Owner: UI-Dev + Logic-Dev** (Engine sollte stabile Reason-*Codes* statt Prosa liefern; UI mappt auf i18n).

### F3 [P3][ux] Keine Vorab-Prüfung: Enchant-Button aktiv für unpassende Rune, Disenchant ohne Gold-Gate
**confirmed.** Wurzel identisch zu F2, aber auch ein reines UX-Problem: die Runenliste wird NICHT nach
Anwendbarkeit auf das gewählte Item gefiltert/ausgegraut, und `canEnchant` gated die Anwendbarkeit nicht
(:134–137). Der Spieler wählt z.B. "Scharf" (Nahkampf) für einen Stab, sieht einen **aktiven** „Verzaubern"-
Button und bekommt den Fehler erst NACH dem Klick. Analog fehlt dem Disenchant-Button jedes Gold-Gate.
- Erwartet: unpassende Runen ausgrauen / Button deaktivieren mit klarem Grund; Disenchant bei zu wenig Gold
  deaktivieren. **Owner: UI-Dev.**

### F4 [P3][ux] Manuelles Salvage/Disenchant/Enchant ohne Erfolgs-Feedback
**confirmed.** `salvageInstance` liefert `{baseItemId, scrap, gold}` (enchant.ts:262), doch der UI-Handler
verwirft den Rückgabewert (EnchantingPage.tsx:481–483) — der Spieler sieht das Item verschwinden, aber KEINE
Rückmeldung über erhaltenes Gold/Schrott. Ebenso setzt Enchant-Erfolg (:144) und Disenchant-Erfolg (:150)
das Feedback nur auf `null` — keine positive Bestätigung (der neue/entfernte Affix in der Liste ist die einzige
implizite Rückmeldung). Vault Ein-/Auslagern ist ebenfalls still, dort reicht die Spaltenaktualisierung aber.
- Erwartet: kurzer Toast/Banner ("+X Gold, +Y Schrott" bzw. "Verzaubert"). **Owner: UI-Dev.**

### F5 [P3][i18n-DE] Deutsche Affix-/Suffix-Namen mit ASCII-Digraphen statt echten Umlauten
**confirmed.** Rendern direkt in der Enchant-Runenliste (Sub-Label `tr(affDef.prefix)`, EnchantingPage.tsx:245),
in Vorschau/Affix-Namen und in Item-Namen/Tooltips (DE-Locale):
- `affix_hunter` → "Jaegerisch" (content:14141) statt "Jägerisch"
- `suffix_bear` → "des Baeren" (:14174) statt "des Bären"
- `suffix_tortoise` → "der Schildkroete" (:14315) statt "der Schildkröte"
- `suffix_sentinel` → "des Waechters" (:14324) statt "des Wächters"
- (niedriger: `aether_rune` "Aetherrune" :454 / Rezepte "Aetherrune binden" :8344 — evtl. "Äther…", aber
  konsistent als Element genutzt → Chef-Naming-Entscheidung.)
Inkonsistent mit dem gerade gefixten Umlaut-Standard des Achievement-Blocks. **Owner: Content-Dev.**

### F6 [P3][i18n-DE] `salvage.autoSalvageHint` (DE) nutzt „Gear-Vault" statt „Ausrüstungstresor"
**confirmed.** translations.ts:1693 (DE) endet mit "…wandern wertvolle Stücke in den Gear-Vault." — der Tab/
Abschnitt heißt aber "Ausrüstungstresor" (translations.ts:1666, `enchant.tab.vault`). Sprach-Mix innerhalb der
deutschen Hilfe. **Owner: UI-Dev.**

---

## Zusammenfassung
- **P0:** 0 · **P1:** 0 · **P2:** 2 (F1, F2) · **P3:** 4 (F3–F6)
- **Top-3:**
  1. **F1** — Enchant-Vorschau/Affix-Liste verschweigt den Feuer/Frost/Sturm-Proc; elementare Runen wirken
     im Enchant-UI wertlos (nur `formatBonusLines` erweitern, `affixEffectSummary` existiert schon).
  2. **F2** — Fehlschlag-Feedback zeigt rohe deutsche Engine-Strings in EN-Locale (+ EN-Fallback "Failed");
     erreichbar via Disenchant-ohne-Gold und Enchant-mit-unpassender-Rune.
  3. **F3** — keine Vorab-Prüfung: aktiver Enchant-Button für unpassende Rune, Disenchant ohne Gold-Gate
     → Fehler erst nach Klick.
- **Positiv bestätigt:** Preview-Flachboni+Kosten, Tooltip-Affix/Suffix-Werte, `instanceDisplayName`,
  Runen-Rezepte und Crash-Gate sind sauber/lokalisiert.
