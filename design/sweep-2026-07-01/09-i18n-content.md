# Sweep 2026-07-01 — 09 · i18n & Content-Kohärenz

QA-Fokus: en/de-Parität, Dev-Text/Quell-Tags in sichtbaren Strings, Tippfehler,
uneinheitliche Terminologie, verwirrende Item-/Aktionsnamen.

Dateien:
- `apps/client/src/renderer/i18n/translations.ts` (UI-Chrome)
- `packages/content/src/index.ts` (Item-/Monster-/Zonen-/Achievement-Namen & -Beschreibungen)

Rendering-Nachweis: Achievement-Namen und `description` sind spielersichtbar via
`apps/client/src/renderer/pages/AchievementsPage.tsx:168` → `tr(def.description)`.

---

## P1

### [P1][ux] Alle deutschen Achievement-Texte nutzen ASCII-Umlaut-Ersatz (ae/oe/ue/ss) statt ä/ö/ü/ß
- **Fundstelle:** `packages/content/src/index.ts` — gesamter `achievements`-Block `L11045–11621` (540 Einträge).
- **Erwartet:** Deutsche Umlaute wie im gesamten Restspiel (Skill-Namen, Nav, Items nutzen ä/ö/ü/ß).
- **Tatsächlich:** 181 String-Werte im Block enthalten ae/oe/ue/ss; **0** Achievement-Strings nutzen einen echten Umlaut (Restdatei: 619 echte Umlaut-Strings). Beispiele:
  - `Holzfaellen` → `Holzfällen` (L11062+), `Kraeuterkunde` → `Kräuterkunde`, `Grossmeister` → `Großmeister`, `Kuenste` → `Künste` (L11049), `Vollstaendig` → `Vollständig` (L11055), `Goetzenwachter` → `Götzenwächter` (L11433), `Toeter` → `Töter`, `Meisterjaeger` → `Meisterjäger` (L11485), `Goetzensanktum` → `Götzensanktum` (L11494), `Schliesse` → `Schließe`, `Auftraeg…` → `Aufträg…`.
- **Sichtbarer Widerspruch:** Skills-Seite zeigt „Holzfällen“/„Kräuterkunde“, die zugehörige Achievement-Karte „Holzfaellen“/„Kraeuterkunde“.
- **Owner:** Content-Dev.

---

## P2

### [P2][ux] Dev-Pluralnotation „(s)“ in 22 englischen Achievement-Beschreibungen
- **Fundstelle:** `packages/content/src/index.ts` — Dungeon-Clears `L11479–11496`, Quests `L11527–11530`.
- **Erwartet:** Sauberer Fließtext (Singular/Plural korrekt oder neutral formuliert).
- **Tatsächlich:** `"Clear the Goblin Warband 1 time(s)."`, `"Complete 1 quest(s)."` — Klammer-Notation ist spielersichtbar.
- **Zusätzlich DE-Grammatik falsch:** `"Schliesse 1 Auftraege ab."` (L11527) — „1 Auftraege“ statt „1 Auftrag“; alle vier `ach_quests`-Stufen nutzen Plural „Auftraege“ unabhängig von der Zahl (+ ASCII-Umlaut, s. P1).
- **Owner:** Content-Dev.

### [P2][ux] „First Clear“ als „Erste Leerung“ fehlübersetzt
- **Fundstelle:** Dungeon-„First Clear“-Achievements `L11479, 11482, 11485, 11488, 11491, 11494`.
- **Erwartet:** „Erster Durchgang“ / „Zum ersten Mal geschafft“ / „Erste Räumung“.
- **Tatsächlich:** `"… - Erste Leerung"`. „Leerung“ = Entleeren (Briefkasten/Mülltonne); liest sich als „First Emptying“.
- **Owner:** Content-Dev.

### [P2][ux] Drei deutsche Begriffe für „Gift heilen“ — inkonsistent, teils widersprüchlich zum produzierten Item
- **Fundstellen:**
  - Kampf-/Status-UI verweist auf **„Antigift“ / „Antigift-Tonikum“**: `translations.ts` `status.poison.desc` (L963), `combat.inflictsHint` (L1336); Item `antivenom_tonic` „Antigift-Tonikum“ (`content/index.ts:487`).
  - Herblore-Items nutzen **„Antidot“**: `potion_antidote` „Antidot-Trank“ (L610), `potion_greater_antidote` „Großes Antidot“ (L612).
  - Herblore-Aktionen nutzen **„Gegengift“**: `brew_antidote` „Gegengift brauen“ (L9023) → erzeugt „Antidot-Trank“; `brew_greater_antidote` „Großes Gegengift brauen“ (L9075). Zusätzlich existiert `brew_antivenom`/„Antigift-Tonikum brauen“ (L8962).
- **Problem:** Innerhalb der Herblore-Aktionsliste stehen „Antigift-Tonikum“, „Gegengift“ und „Antidot“ nebeneinander. Die Aktion „Gegengift brauen“ produziert ein Item namens „Antidot-Trank“ (Name der Aktion ≠ Name des Produkts). Und der Kampf-Hinweis nennt „Antigift“, das ein Spieler in Herblore so nicht wiederfindet.
- **Erwartet:** Ein Kanon-Begriff (Empfehlung: „Antigift“, passend zum Kampf-Hinweis) oder mindestens Aktion↔Item angleichen. Englisch ist sauberer, aber splittet ebenfalls „Antivenom Tonic“ vs „Antidote Potion“ (dort ist Aktion→Item aber konsistent).
- **Owner:** Content-Dev (Kanon-Begriff mit Combat-Dev/UI-Dev abstimmen).

---

## P3

### [P3][bug] Item- vs. Craft-Aktions-Name: „Scharfaugen-Tonikum“ vs. „Scharfauge-Tonikum brauen“
- **Fundstelle:** Item `tonic_keeneye` „Scharfaugen-Tonikum“ (`content/index.ts:600`) vs. Aktion `brew_keeneye_tonic` „Scharfauge-Tonikum brauen“ (L9049).
- **Erwartet:** Aktion „Scharfaugen-Tonikum brauen“ (mit ‑n‑, wie das Item).
- **Owner:** Content-Dev.

### [P3][ux] Slayer-Skill heißt intern „Monsterjäger“, überall sonst „Slayer“
- **Fundstelle:** Skill-Def `slayer` de = „Monsterjäger“ (`content/index.ts:34`). Gegen: `nav.slayer` de = „Slayer“ (`translations.ts:1623`), gesamte Slayer-Seite/‑Guide („Slayer-Meister“, „Slayer-Punkte“, „Slayer-Turm“, „Slayer-Level“).
- **Tatsächlich:** Skills-Übersicht/Charakter zeigt „Monsterjäger“, Sidebar zeigt „Slayer“.
- **Erwartet:** Einheitlich „Slayer“ (passend zur eigenen Seite & Englisch „Slayer“).
- **Owner:** Content-Dev / UI-Dev.

### [P3][ux] Englische Wörter in deutschen Farm-Strings + fragmentierte Saat-/Crop-Begriffe
- **Fundstellen (`translations.ts`, de):**
  - L1607 `farm.cropPicker.empty`: „Noch keine **Crops** auf deinem Level verfügbar.“ (englisch)
  - L1716 `farm.hint.plots`: „**Crops** wachsen passiv …“ (englisch)
  - L1613 `farm.section.plots`: „**Plots**“ — englisch, während Beete sonst „Beet“/„Beete“ heißen (L1592 „Beet {n}“, L1590 „… Beete aktiv“).
  - Saat vs. Samen gemischt: „Saat“ (`farm.plant` L1596, `farm.seedCount` L1611, `farm.noSeed` L1612) gegen „Samen“ (`farm.seed.*` L1617–1620).
  - „Crop“ mal „Pflanze“ (`farm.section.overview` „Pflanzenübersicht“ L1614) mal „Saat“ (`farm.cropPicker.title` „Saat wählen“ L1606).
- **Owner:** UI-Dev.

### [P3][ux] `nav.city` in Deutsch unübersetzt: „City“
- **Fundstelle:** `translations.ts:917` de `nav.city`: „City“.
- **Hinweis:** City ist stillgelegt (Memory: city-shelved). Falls der Nav-Eintrag tot ist → entfernen statt englisch stehen lassen.
- **Owner:** UI-Dev.

### [P3][ux/style] Zweiwort-Skillnamen ergeben holprige Achievement-Komposita
- **Fundstelle:** z.B. „Offensive Magie-Neuling“, „Defensive Magie-Neuling“ (`magic_off`/`magic_def`-Achievements im Block L11045+).
- **Erwartet:** z.B. „Neuling der Offensiven Magie“ o.ä. Kosmetisch.
- **Owner:** Content-Dev.

---

## Saubere Ergebnisse (kein Handlungsbedarf)

- **UI-Chrome-Key-Parität ist compile-erzwungen:** `de` ist `Record<keyof typeof en, string>` typisiert → fehlende/zusätzliche Keys sind ein tsc-Fehler. Keine Key-Lücken möglich.
- **Kein Quell-Tag-Leak à la „(Foraging)“** in Item-Strings; der Chef-Fix ist drin: `essence_void` = „Hollow Essence“ / „Hohle Essenz“ (`content/index.ts:511`).
- **Keine** TODO/placeholder/undefined/NaN/[object] in sichtbaren Strings; keine Doppel-Leerzeichen/Rand-Whitespace; keine Umlaute in englischen Strings; keine englischen Funktionswörter in deutschen Content-Strings.
- Content außerhalb Achievements nutzt durchgängig echte Umlaute (619 Vorkommen). Pet-/Zonen-/Dungeon-/Item-Namen sauber lokalisiert (z.B. „Kiemenfäule“, „Düsterratte“, „Götzenhalle“, „Wildwald-Jagdgründe“).

---

## Kurz-Zusammenfassung

Ein großer, klar umrissener Treffer: der **komplette Achievement-Block (540 Einträge)**
nutzt ASCII-Umlaut-Ersatz statt echter Umlaute — betrifft nur diesen Block, sonst ist
die Datei sauber. Dazu **22 „(s)“-Dev-Notationen** in englischen Achievement-Texten und
eine falsche DE-Pluralform („1 Auftraege“). Terminologisch fragmentiert: **Gift-Heilung**
(Antigift/Antidot/Gegengift, Aktion≠Produkt) und **Slayer/Monsterjäger**. Kleinere UI-Leaks
(„Crops“/„Plots“/„City“ englisch, Saat/Samen gemischt). Der bereits gemeldete „(Foraging)“-Typ
Leak ist nicht wieder aufgetreten. Empfehlung: **fix-then-ship** — P1/P2 vor EA-0.1 beheben
(überschaubarer, mechanischer Umlaut-/String-Fix im Achievement-Block), P3 danach.
