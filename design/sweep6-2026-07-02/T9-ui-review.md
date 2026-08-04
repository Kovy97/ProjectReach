# T9 — Multimodales UI-Review (Sweep 6, 2026-07-02→03)

**Basis:** `apps/client/ui-audit/shots/{midgame,endgame}/` (Stand 23:40–23:44) + `apps/client/ui-audit/report.md` (21:44Z).
**Gesichtet:** 50 von 54 Screenshots multimodal (alle 27 midgame, 23 endgame).
**Lücke:** endgame `shop/bank/quests/bestiary` — der Shots-Ordner wurde um 00:05 vom parallel laufenden Tour-Run eines ui-dev gelöscht/neu angelegt, während dieses Review lief. Auftragsgemäß notiert statt nachgeschossen; DOM-Daten aus report.md decken diese 4 Seiten ab, midgame-Pendants wurden visuell geprüft.

Koordinaten = Pixel im 1920×1080-Shot. Prioritäten: P1 Blocker · P2 deutlich sichtbarer Qualitätsmangel · P3 vor EA-Polish fixen · P4 Polish.

## Gesamtbild

Kein P1. Keine kaputten Bilder (0 naturalWidth=0 bestätigt), keine rohen i18n-Keys, keine Console-Errors, kein Font-Drift. Citadel-Look auf den Kernseiten (Kampf, Laden, Bestiarium, Aufgaben, Erfolge, Charakter) konsistent und hochwertig; Zonen-, Monster- und Aktions-Art durchgehend gebunden; Locked-Silhouetten (Bäume/Fische/Gems/Runen) einheitlich. Die Masse der 110 Overflow-Einträge ist unkritisch (Triage unten).

## Funde

### P2

1. **Slayer-Belohnungsshop zeigt nacktes Emoji statt Item-Art** — `slayer`, midgame + endgame, erste Shop-Kachel ~(563,1040): großes 😷 auf leerer Kachel; report.md flaggt zusätzlich 🪞 (unter dem Fold). Direkt daneben echte PNG-Items (Umhang, Haken, Stiefel) → sehr sichtbarer Stilbruch in einem Belohnungs-Kontext. Items ohne Icon-PNG (Masken-/Spiegel-Item). *Owner: asset-integrator/Chef-Icons; interim ui-dev-Platzhalterrahmen.*

2. **Mana-Bar-Füllstand verdächtig** — `character` midgame ~(625,664): Mana 268/268 (voll), aber nur ~10–15 % des Balkens blau gefüllt, Rest pergamentfarben; die HP-Bar direkt darüber füllt bei 87/93,7 korrekt ~93 %. Entweder falsche Fill-Breite oder missverständliches Gradient-Design. Endgame-Gegenprobe nicht mehr möglich (Shot weg). *Owner: ui-dev, `CharacterPage.tsx` (HP/Mana-Bars) prüfen. Herabstufen auf P4/invalid, falls Gradient by design.*

### P3

3. **Topbar-Nav „FERTIGKEITEN-…" mitten im Wort abgeschnitten** — alle 54 Shots, Button ~(694,45); zusätzlich der Seitentitel „FERTIGKEITEN-ÜBERSIC…" auf `skills-overview` ~(1160,143) (Report: span 528>503). Ein Nav-Label, das man nie lesen kann. Kürzeres Label („Fertigkeiten") oder mehr Breite. *Owner: ui-dev.*

4. **Charaktername im Header überall truncated** — endgame, alle Seiten ~(530,143): „KORVETH GRIMHOLL…" (`header-charinfo-name` 234>220, 27× im Report). Der eigene Name dauerhaft abgeschnitten wirkt lieblos; max-width erhöhen oder Font-Size stufen. *Owner: ui-dev.*

5. **Charakterblatt: Kernbegriffe truncated** — `character`, beide Fixtures: Attributkarten „KONSTITU…" ~(729,841) und „INTELLIGE…" ~(521,955) (`cs-attr-card-name` 87>68); Kampf-Panel „KRIT-CHA…" ~(940,1003) (`cs-stat-label` bis 119>101, endgame 3 Labels). Ellipsis-by-design, aber ausgerechnet die Attributsnamen. Vorschlag: offizielle Kurzformen (KON/INT/GES …) oder schmalere Schrift. *Owner: ui-dev.*

6. **„Heiltrank" vs. „Heiltrunk" — Verwechslung vorprogrammiert** — `herblore`, beide Fixtures, Karte 1 ~(600,610) und Karte 2 ~(975,610) direkt nebeneinander: „Kleinen Heiltrank brauen" (`potion_minor_heal`, `packages/content/src/index.ts:601`) vs. „Kleinen Heiltrunk brauen" (Minor Healing Draught, `index.ts:476/9223`). EN unterscheidet sauber Potion/Draught, DE nur durch einen Buchstaben. DE-Umbenennung der Draught-Familie (z. B. „Heilschluck"/„Heil-Elixier"). *Owner: content-dev.*

7. **Farm-Katalog: echter Hard-Clip ohne Ellipsis** — `farming`, beide Fixtures, unterhalb des Folds (visuell nicht im Shot; DOM-Daten): `.farm-catalogue-card`/`.farm-cat-header` scrollWidth bis 259 vs. clientWidth 220 → Text wird stumm abgeschnitten. `apps/client/src/renderer/pages/FarmPage.tsx:193-195`, `styles/skills.css:2003/2026`. Das sind **alle** 10 „spillover"- und 11 „hard-clip"-Einträge des Reports (ein Bauteil, 5–6 Karten × 2 Fixtures) — ein einziger CSS-Fix (min-width/ellipsis) räumt beide Report-Kategorien ab. *Owner: ui-dev.*

8. **BMP-Emoji-Blindspot des Audit-Scanners: ⚡-Items** — sichtbar in `bank` midgame ~(505,629), `character` midgame ~(1465,585), `shop`-Verkaufsgrid midgame ~(1251,519), `enchanting`-Runenliste ~(940,427): `storm_essence`, `shock_rune`, `rune_storm_i–iii` haben `icon:"⚡"` (`packages/content/src/index.ts:454,460,673-675`) und rendern als OS-Emoji. Der Unicode-Scan der Tour zählt nur Astral-Plane-Pictographs → ⚡ (U+26A1), ❄, ☠ u. ä. fehlen im Emoji-Census (99 ist eine Untergrenze). Zweiteiliger Fix: (a) Icons für die Sturm-/Schockrunen-Familie, (b) Tour-Scanner um BMP-Pictograph-Ranges erweitern. *Owner: (a) asset-Pipeline/content-dev, (b) ui-dev (tour.mjs).*

9. **Emoji-Fallback-Icons in Skill-Karten/Mat-Chips/Shop** (Sammelfund, deckt die 99 Census-Treffer ab): 🌱 Beet-Placeholder `farming` ~(663,700) (einziger im sichtbaren Bereich; wirkt dort fast wie Absicht, ist aber Emoji), 🪨 mining, 😷/🦷 leatherworking, 📿 jewelcrafting, 🌘/🟢 herblore, 🟧/💊/🧱/🪞 smithing (endgame), 🍗/🌱 shop, 🐡-Buff-Badge + 💰-Quicksell `character` ~(625,719)/(1465,955), 🗝️ Dungeon-Überschrift + Key-Zähler `combat` ~(816,851)/(1247,1022) (`CombatPage.tsx:1433` Fallback `?? "🗝️"`), 🧪 leerer Food-Slot `combat` ~(500,928), 🔊/🎵 options ~(1272,428)/(1054,620). Bekanntes Muster (Sweep-5 Finding 7); Icon-Nachschub läuft über Chef. Kein Einzel-Fix nötig, aber Liste als Icon-Bestellzettel verwenden. *Owner: Chef/asset-integrator.*

### P4

10. **„🔨 Herstellbar: N×"-Zeile** — alle Crafting-Skills, z. B. `smithing` midgame ~(601,996): Hammer-Emoji in sonst durchgestylter Karte. Mit Icon-Welle miterledigen. *Owner: ui-dev.*

11. **„DU: 30" kryptisch** — `combat`, Dungeon-Karten ~(1247,1022) midgame / „DU: 92" endgame: `combat.dungeonYourLevel` = `"du: {n}"` (`i18n/translations.ts:1520`), per CSS uppercased → liest sich wie eine Abkürzung statt „dein Level". Vorschlag „Dein Lv {n}". *Owner: ui-dev.*

12. **Dezimaltrennzeichen inkonsistent** — alle Skill-Karten, beide Fixtures: DAUER „2.8s" (Punkt) neben XP/H „2,6K" und Waffenstats „10,4–11,4" (Komma) im selben Kartenraster. DE-Format vereinheitlichen. *Owner: ui-dev.*

13. **Alte Button-/Toggle-Familie neben Citadel** — `mastery`-Filter ~(490–1075,368), `achievements`-Filterzeilen ~(447–757,410), `thieving`-Risiko-Toggle ~(497–688,413), `options` lang-btns: flache Alt-Buttons. Deckt sich mit dem Button-Census (Skill-Seiten: 20 Citadel vs. Rest Mengen-Buttons 1/5/10/Alle — letztere einheitlich und unauffällig, kein Bruch). Bekannter, gewollt gradueller Rollout (Memory: Sidebar-Stil = Design-System, spielweit später) — dokumentiert, kein Regressionsfund. *Owner: ui-dev, spätere Design-System-Welle.*

14. **`enchanting` Item-Namen-Ellipsis** — midgame ~(640,947): „SCHWARZSTAHL-PANZERHANDSC…" (282>252). Graceful, deutsche Komposita halt; nur beobachten. *Owner: —.*

## Triage der 110 Overflow-Einträge aus report.md

| Kategorie | Anzahl | Urteil |
| --- | --- | --- |
| `span.topbar-label` (250>157) | 58 | **Echt, 1 Ursache:** Nav-Label „Fertigkeiten-Übersicht" → Fund 3. Alle anderen Topbar-Buttons passen. |
| `span.header-charinfo-name` (234>220) | 27 | **Echt, 1 Ursache:** langer Charaktername endgame → Fund 4. Ellipsis by design, aber fixwürdig. |
| `.farm-cat-header` spillover + `.farm-catalogue-card` hard-clip | 10 + 11 | **Echt:** ein Bauteil ohne Ellipsis → Fund 7. |
| `cs-attr-card-name` / `cs-stat-label` | 6 | **Echt:** Charakterblatt-Kurznamen → Fund 5. |
| `enchant-item-name`, skills-overview-`span` (528>503) | 2 | Ellipsis by design (Fund 14) bzw. Seitentitel → Fund 3. |
| Rest | — | Ellipsis by design, kein Handlungsbedarf. |

## Nicht geprüft / Anmerkungen

- endgame `shop`/`bank`/`quests`/`bestiary`: Shots während des Reviews vom neuen Tour-Run überschrieben (00:05). Laut report.md dort keine zusätzlichen Findings-Klassen (Emoji-Liste identisch zu midgame; bestiary endgame nur mehr entdeckte Monster). Beim nächsten Sweep zuerst sichern oder Ordner versionieren.
- Kein eigener Tour-Lauf gestartet (Dev-Server-Port bei zwei parallelen ui-devs umkämpft, wie beauftragt).
