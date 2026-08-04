# W2 — Multimodales UI-Review (Sweep 6, Welle 2)

**Reviewer:** Sweep-6-W2-Tester (UI) · **Datum:** 2026-07-03
**Grundlage:** Alle 54 frischen Screenshots in `apps/client/ui-audit/shots/{midgame,endgame}/` (Stand 2026-07-03 ~00:52) einzeln angesehen; `report.md` (2026-07-02T22:54Z) für Overflow-/Emoji-Tabellen; Code-Gegenchecks read-only. Kein eigener Tour-Lauf, kein Fix.

---

## 1. Regression-Check der heutigen Umbauten — **PASS**

| Umbau | Verdict | Beleg |
|---|---|---|
| Attribut-Medaillon-Zeilen (character) | ✅ PASS | midgame + endgame character.png: Medaillons rendern korrekt, Werte lesbar |
| Rote Button-Familie | ✅ PASS | Auf ALLEN 27 Seiten × 2 Fixtures konsistent (Sidebar, Topbar, Bestiary, Combat, Skill-Karten-STARTEN): gleiche Optik, keine weißen Kanten, Text lesbar |
| Bestiary-Zonen-Karten | ✅ PASS | bestiary.png beide Fixtures: Zonen-Zeilen + Monster-Karten sauber |
| Sidebar-Logo/Stein | ✅ PASS | Grim-Reach-Logo + Stein-Textur auf allen Shots korrekt |
| bg_topbar-Kopfzeile | ✅ PASS | Kopfzeile (Name, Kampf-Lv, Ges.-Lv, Inventar, Gold) überall einheitlich |
| Inventar-Bags/Citadel-Controls | ✅ PASS | character.png: Bags-Reihe + Sell/Sort-Controls im Citadel-Stil |
| Neues Tooltip | ⚪ NICHT PRÜFBAR | Tour hovert nicht — auf keinem Shot sichtbar |

Automatik-Gates aus report.md: 0 rohe i18n-Tokens, 0 broken images, 0 Font-Drift, 0 Console-Errors.

---

## 2. Overflow-Triage (29 Funde → 4 echt, 25 by-design)

Alle 29 sind Ellipsis-Typ (0 hard-clip, 0 spillover).

### ECHT — P3 (ui-dev)
- **4× `span.cs-stat-label`** — Seite: character, Fixture: endgame (3×) + midgame (1×). Im KAMPF-Panel abgeschnitten: „VERTEIDIGU…", „GENAUIGKE…", „KRIT-CHA…" (midgame nur „KRIT-CHA…"). Client 119/110/76px vs Scroll 101/95/56px Überhang. Stat-Labels sind Kern-Info und dürfen nicht ellipsieren → Spaltenbreite/Font-Size/kürzere Label-Strings.

### BY-DESIGN — P4 (kein Handlungsbedarf)
- **24× `span.farm-cat-name`** (`FarmPage.tsx:196`) — Katalog-Karten Farming, beide Fixtures. Namen ellipsieren bei 83–95px vs 96–138px; Karten bewusst kompakt, Name im Tooltip/Detail vollständig. Akzeptiert.
- **1× `span.enchant-item-name`** (282/252px) — Enchanting-Picker, lange Item-Namen; Ellipsis hier gewollt. Akzeptiert.

---

## 3. Emoji-Cluster (107 Treffer) → konsolidierte Icon-Bestellliste für den Chef

Die Selektoren `skillcard-emoji`/`item-chip-emoji`/`mat-emoji`/`item-cell-emoji` zählen **dasselbe fehlende Item-Art mehrfach** (Rezeptkarte + Material-Chip + Inventarzelle). Unique Icon-Bedarf: **~20–25 Assets**, nicht 107.

### A) Fehlende Item-Art (Emoji-Fallback in Item-Zellen) — Bestellung an Chef / asset-integrator
| Emoji | Item/Linie | Sichtbar auf | Prio |
|---|---|---|---|
| 😷 | Slayer-Maske (Belohnungsshop-Karte, RIESIG) | slayer beide Fixtures | **P2** |
| 🪞 | Spiegel-Item (Belohnungsshop-Karte, RIESIG) | slayer beide Fixtures | **P2** |
| ⚡ | Sturm-Runen-Linie | runecrafting, Inventar midgame | P3 |
| 🌱 | Saatgut/Samen | farming, Inventar | P3 |
| 📿 | Amulett/Kette | jewelcrafting | P3 |
| 🌘 🟢 | Herblore-Kräuter | herblore | P3 |
| 🟧 💊 🧱 | Schmiede-Mats/Barren (endgame-Tier) | smithing endgame | P3 |
| 🦷 🪨 | Zahn, Stein (Drops) | bestiary/inventar | P4 |
| 🏹 | Bogenbau-Produkte | fletching | P4 |
| 🍗 | Shop-Hühnchen (Food) | shop | P4 |
| 🐡 | Fisch (Buff-Badge) | character/topbar | P4 |

### B) UI-Glyphen (kleine Interface-Icons, kein Item-Art) — Sammelbestellung
| Emoji | Stelle | Selektor |
|---|---|---|
| 🔨 | „Herstellbar"-Zeile auf Skill-Karten | `div.craftable` |
| 🗝 | Dungeon-Schlüssel auf Zonen-Karten | `div.zone-card-meta.dungeon-keys` |
| 🪙 | Coin im „UPGRADE · 🪙 8.000"-Button | combat midgame |
| 🧪 | Leerer Food-Slot | `span.cl-food-empty` |
| 💊 | Auto-Eat-Upgrade-Button | `button.cl-autoeat-upgrade` |
| 💰 | Quicksell | `span.cs-quicksell-icon` |
| 🔊 🎵 | Options-Sound-Buttons | options beide Fixtures |
| 🌱 | Farm-Plot-Status | `span.plot-state-icon` |

**Code-Note (ui-dev, P4):** `MasteryPage.tsx:29–50` hält eine hartkodierte Skill-Emoji-Map (🔨🍳🌾…) — widerspricht der Regel „Skill-Icons via getSkillIcon statt Emojis"; die echten Icons existieren bereits.

---

## 4. Neue Funde (Stil / Inhalt / Verhalten)

### P2 — Slayer-Belohnungsshop zeigt riesige OS-Emojis als Karten-Art
Seite: slayer · Fixture: beide. 😷 und 🪞 füllen die komplette Item-Karte — prominenteste Emoji-Stelle im Spiel. → Chef-Icon-Bestellung (siehe 3A), Einbindung asset-integrator.

### P3 — Herblore-Namens-Kollision Heiltrank/Heiltrunk/Kräutersud (CODE-BESTÄTIGT)
Seite: herblore · Fixture: beide · Owner: **content-dev**.
- `packages/content/src/index.ts:9237` — Aktion `brew_minor_healing` heißt DE **„Kleinen Heiltrunk brauen"**, produziert aber `minor_healing_potion` = **„Kleiner Kräutersud"** (Z. 476).
- Direkt daneben `brew_minor_heal` (Z. 9303) **„Kleinen Heiltrank brauen"** → „Kleiner Heiltrank".
- Analog `brew_greater_healing` (Z. 9249) „Großen Heiltrunk brauen" → „Großer Kräutersud" (Z. 485) neben `brew_greater_heal` (Z. 9371) „Großen Heiltrank brauen".
Drei fast identische Begriffe; Aktionsname ≠ Produktname. Vorschlag: `brew_*_healing` DE in „Kleinen/Großen **Kräutersud** brauen" umbenennen.

### P3 — Dezimaltrenner-Inkonsistenz (Punkt vs Komma im deutschen UI)
Owner: **ui-dev** (zentraler Formatter).
- DAUER mit Punkt: „2.6s"/„2.5s" (smithing/mining midgame), „1.7s" (fishing endgame), „3.1s/2.9s/4.0s" (foraging endgame), „2.8s/3.2s/3.6s" (woodcutting endgame).
- XP/H mit Komma auf DENSELBEN Karten: „2,8k", „2,6k", „4,0k".
- Combat nutzt Komma („2,2s"), Bestiary-Dropchancen Punkt („0.28%", „3.0%", „0.19%").

### P3 — Locked-Recipe-Silhouetten sind konturlose schwarze Kleckse
Seite: jewelcrafting + runecrafting · Fixture: midgame · Owner: **ui-dev**. Gesperrte Rezepte (Rubin, Blutstein, Schattenrune) rendern via brightness-0 als formlose Blobs statt erkennbarer Silhouette. Endgame (freigeschaltet) zeigt korrektes Art. Polish: Outline/Opacity statt Vollschwarz.

### P4 — Mastery-Badge „LEGENDÄR" überall (CODE-BESTÄTIGT, by-design aber irreführend)
Seite: mastery · Fixture: beide · Owner: **ui-dev** (Design-Frage an Chef). `MasteryPage.tsx:52–65`: Rarity ist rein kosmetisch aus der **Aktions-Anzahl** des Skills abgeleitet (11+ Aktionen → „legendary"). Da fast jeder Skill 11+ Aktionen hat, trägt jede Zeile ein oranges LEGENDÄR-Badge — neben 1–3 % Mastery liest sich das wie eine falsche Fortschritts-/Seltenheitsaussage.

### P4 — Kryptische Kurztexte
- „**DU: 30**" / „DU: 92" auf Dungeon-Karten (combat, beide Fixtures) = `combat.dungeonYourLevel` „du: {n}" (`translations.ts:1539`), per CSS uppercased. Vorschlag „Dein Lv {n}". Owner ui-dev.
- „**★ 4**" im Preisfeld der Zeile „AUTO-EAT 3 (MAX)" (shop endgame) — Bedeutung unklar. Owner ui-dev.

### P4 — Fixture-Artefakt (kein Produkt-Bug)
stats endgame: „Gesammelte Items 0" / „Items im Lager 0" trotz 20/20 Inventar + 482k Gold — Statistik-Zähler werden vom Fixture-Seeding nicht mitgesetzt. Owner: fixture-gen (ui-audit-Tooling), niedrig.

---

## 5. Saubere Seiten (Regression-frei, keine Funde)
bank, shop (midgame), enchanting, cooking, fletching, leatherworking/Handwerk, thieving, woodcutting, fishing, foraging, quests, skills-overview, achievements, companions — Layout, Buttons, Texte, Kontrast in Ordnung. Zonen-Karten in 4 Spalten sind KEIN Verstoß gegen die „max 3 Spalten"-Regel (die gilt für Monster-Auswahlkarten).

---

## Gesamturteil
**Regression-Check der Umbauten: PASS. Keine P1.** Auffälligste Punkte: Slayer-Shop-Emojis (P2, Chef-Icons), Herblore-Namens-Kollision (P3, content-dev), Stat-Label-Trunkierung + Dezimaltrenner (P3, ui-dev). UI-seitig ship-fähig; Icon-Bestellliste (Abschnitt 3) an den Chef.
