# Textpass 1.4 „Feder und Stahl“ · Inventar und Paketplan

**Status:** Entwurf zur Chef-Abnahme (Lore-Dev, 2026-10-24). Reine Bestandsaufnahme; keine Datei des Spiels wurde verändert.
**Methode:** Ein Wegwerf-Skript hat `translations.ts` (alle sieben UI-Tabellen über `UI_TEXT`) und den Content-Katalog (nach `applyContentLocales`, also mit allen Overlays) in eine Tabelle gezogen und Wörter, Satzzeichen, Längen und Sprachpaare ausgezählt. Die Skripte liegen nur im Sitzungs-Scratchpad und sind nicht Teil des Repos; die Zählung ist mit `tools/extract-content-strings.mjs` plus einem kleinen UI-Dump jederzeit reproduzierbar (Empfehlung § 4.4).

---

## § 1 Umfang in Zahlen

### 1.1 Gesamt

| Quelle | Texte je Sprache | Sprachen | Texte gesamt | Zeichen EN | Zeichen DE |
|---|---|---|---|---|---|
| UI (`translations.ts` + 5 `locales/*.ts`) | 2.721 Schlüssel | 7 | 19.047 | 87.700 | 98.400 |
| Content (`index.ts` EN/DE inline + 5 Overlays `locales/*.ts`) | 4.581 Felder | 7 | 32.067 | 150.400 | 169.700 |
| Raid-Inline (`raid-text.ts`: 5 Bosse × 3 Phasen × Name+Ansage, Raid-Name, 5 Räume, 5 Boss-Intros) | 41 | 7 (inline) | 287 | | |
| **Summe** | **7.343** | | **≈ 51.400** | ≈ 238k | ≈ 268k |

Alle fünf Overlays sind **vollständig** (0 fehlende Schlüssel in es/fr/pt-BR/ru/zh), die UI-Tabellen ebenfalls (Guard `apps/client/src/renderer/qa2-ui-i18n.test.ts` erzwingt Schlüsselparität und Platzhaltergleichheit). Der Textpass ist also ein Qualitäts- und Konsistenzpass, keine Lückenfüllung.

### 1.2 UI nach Bereich (Schlüssel je Sprache)

| Bereich (Präfix) | Schlüssel | Textsorte überwiegend |
|---|---|---|
| combat | 233 | Labels, HUD, Hinweise, Log |
| pet | 149 | Effektzeilen, Fähigkeiten, Flavor-Kurzzeilen |
| onboarding | 133 | Erklärtexte (lang) |
| newhaven | 133 | Labels, Gründe, Gebäude-UI |
| raid | 113 | Labels, Regeln, Modifikatoren, Intro |
| prestige | 112 | Labels, Gründe, Wächter-Rede |
| options | 83 | Labels, Hinweise |
| hunting | 78 | Labels, Gründe |
| itip / item / itemwiki | 64 / 44 / 26 | Tooltip-Labels |
| queue | 60 | Hinweise, Gründe |
| mail / slayer / shop / mastery / skill / enchant / farm | 59 / 59 / 58 / 55 / 55 / 51 / 50 | gemischt |
| char / quests / tavern / nav / offline / achievements / weaponEffect | 45 / 44 / 44 / 41 / 40 / 40 / 39 | gemischt; weaponEffect = Effektzeilen |
| toast / bugReport / companions / npc / stat / menu / creation / archetype | 36 / 36 / 35 / 35 / 33 / 32 / 32 / 30 | kurz |
| orders / skillguide / events / bank / paragon / dungeon / blessing / bestiary / storage / estates / statdesc | 28 / 27 / 27 / 26 / 25 / 23 / 23 / 22 / 22 / 21 / 20 | gemischt |
| übrige 25 Präfixe (sidebar, rune, stats, salvage, death, pouch, status, inv, kit, style, talent, header, updateNotice, skilldesc, chronicle …) | ≈ 230 | kurz |

Lange Fließtexte (> 300 Zeichen DE): 12 Schlüssel (onboarding 5, raid 5, updateNotice 2).

### 1.3 Content nach Sammlung (Felder, je in EN+DE inline und 5 Overlays)

| Sammlung | Namen | Beschreibungen / weitere Felder | Bemerkung |
|---|---|---|---|
| items | 1.439 | 465 `description` | **974 Items ohne Beschreibung** (599 Ausrüstung, 265 Material, 93 Verbrauch, 17 Werkzeug; davon 183 selten, 164 episch, 163 sehr selten, 17 legendär, 2 göttlich) |
| actions | 910 | – | Rezept-/Aktionsnamen („Forge …“, „Craft …“) |
| achievements | 363 | 363 `description` | 9 Kategorien (skilling 130, combat 94, quests 44, exploration 38, collection 24, crafting 12, wealth 12, meta 5, gathering 4) |
| quests | 125 | 125 `description`, 27 `loreText` | 27 Chronik-Kapitel, 5 Skiller, ≈ 20 Zonen-Aufgaben, ≈ 70 Tagesaufgaben |
| monsters / elites | 148 / 29 | – | Kanon-Namen |
| categories / crops / sets | 84 / 35 / 42 | – | Namen |
| zones / dungeons | 11 / 14 | 30 Wellen-Namen | Kanon |
| pets | 23 | 23 `description`, 23 Fähigkeit, 23 Fertigkeitswirkung | 92 Felder |
| talents (2 Bäume) | 2 + 7 Äste + 18 Knoten | 2 + 18 `description` | Jägerkodex, Narbenbuch |
| tavernGuests / tavernTasks | 19 Namen, 19 Rollen, 19 Begrüßungen | 49 Auftragszeilen | 1.2-Taverne |
| campBuildings | 16 | 16 `description` | New Haven |
| tokenShopShelves / slayerTower / slayerMasters | 6 / 8 / 1 (+1 desc) | | |
| affixes / suffixes | 26 Präfixe / 29 Suffixe | | Verzauberungs-Namen |
| **Summe** | | **4.581** | |

Nicht über das Overlay lokalisiert, aber bereits in sieben Sprachen inline: `orderCustomers` (2 Werkstatt-Kunden, Name + Rolle), Raid-Phasen/Räume/Intros (`raid-text.ts`). Nicht lokalisiert (bewusst, keine Textfelder): shop, slayerShop, tokenShop, huntingZones, paragon, petTierLadders.

### 1.4 Sonstige Textquellen
- `packages/content/src/talents.ts`: 47 Felder (in 1.3 enthalten).
- Ein hart codierter Text in einer Komponente: `apps/client/src/renderer/pages/ItemBrowserPage.tsx:206` „Skill Boost“ (englisch, nicht lokalisiert). Sonst keine Literale mit Spielwörtern in TSX gefunden (grobe Suche).
- `design/content-strings-en.json` (Übersetzer-Quellliste) ist vom 18.07. mit 3.528 Schlüsseln; der Katalog hat heute 4.581. Die Kopfzeile aller fünf Content-Overlays („3528 von 3528 Keys“) ist entsprechend veraltet (Kosmetik, aber irreführend).

---

## § 2 Problemklassen mit Belegen

### A · Anglizismen im Deutschen
121 UI-Schlüssel treffen die Anglizismen-Suche; nach Wort: Item/Items 52, Skill/Skills 23, Buff 14, Drop/Drops 13, Slot 9, Auto-Eat 6, Loot 3, Upgrade 3, Tier 2, Quest 2, Idle 2, Gear 2. Dazu Einzelgänger: „Mitigation“, „Kills“, „Checkpoint“, „Pool“, „Trash“, „Story“, „Raid“, „Ward“, „Kit“, „Reset“, „Enchant-Slots“, „Tower-Aufgaben“, „Shop“ (neben „Laden“).
- `combat.dock.skills` DE „Skills“; `mastery.poolHint` „Der Meisterschafts-Pool eines Skills … Checkpoints … skillweite Boni“.
- `quests.obj.gatherItems` „Items gesammelt“; `bank.full` „Bank voll — gib einen Slot frei, um neue Item-Arten einzulagern.“
- `slayer.tower.intro` „Tower-Aufgaben gewähren einzigartige Drops.“; `enchant.reason.no_affix_slots` „Keine Enchant-Slots frei.“; `stat.mitigation` „Mitigation“.
- Content: `apprentice_robe_hat` „Magie-Boost“; `soul_flayer_fang` „Seltener Drop“; `q_gatherer` „50 beliebige Items“; `talentNodes:slayer.spoils` „Seltene Drops“.

### B · Uneinheitliche Begriffe (dieselbe Sache, mehrere Wörter)
| Sache | Varianten DE (UI / Content) | Belege |
|---|---|---|
| Level | Stufe 59/133 · Level 32/8 · Lv 7/0 | `sidebar.combatLevel` „Kampf Lv“ gegen `combat.level` „Stufe {n}“; `q_woodcutter_1` „Holzfällen-Level 5“ gegen `ach_skill_woodcutting_25` „Holzfällen Stufe 25“; `ach_total_level_1980` nutzt beide im selben Satz |
| Stufe (zweite Bedeutung) | Köder-Stufen, Faser-Stufen, Max-Stufe (Auto-Essen), Item-Stufe, „eine Stufe höher“ (Güte) | `updateNotice.point1/5`, `combat.autoEatMax`, `item.tier`, `pet.passive.tierUp` |
| Skill | Fertigkeit 39/6 · Skill 19/0 · Beruf 2 | `nav.section.skills` „Fertigkeiten“ gegen `combat.dock.skills` „Skills“ |
| Leben | HP 17 · Lebenspunkte 17 · Leben 14 · LP 1 | `stat.hp` „HP“, `raid.rest.healed` „Lebenspunkte“, `weaponEffect.healOnKill` „Leben“, `slayer_vambraces` „+4 LP je Kill“ |
| EP | XP 30 · EP 3 | `skill.xp` „{n} XP“ gegen `blessing.effect.xp` „+{pct}% EP“ |
| Gegenstand | Item 52 · Gegenstand 10 | `shop.counter.notEnoughGold` „diesen Gegenstand“ gegen `inv.filter.noMatches` „Keine Items gefunden.“ |
| Angriffstempo | Angriffstempo 5 · Angriffsgeschwindigkeit 1 | `stat.attackSpeed` gegen `itip.attackSpeed` |
| Kampfstufe | Kampfstufe · Kampflevel | `weaponEffect.giantSlayer` gegen `slayer_greaves` |
| Ward | Ward 35/7 · Schutzschild 0/5 · Schild 0/1; Ward-Durchbruch · Ward-Bruch | `stat.wardBreak` gegen `ring_master_magic` |
| Slayer | Slayer 23/45 · Monsterjäger 0/17 | `nav.slayer` gegen `skills:slayer:name`; `tavernGuests:viktor:role` DE „Slayer“ |
| Dungeon | Dungeon 16/6 · Verlies 0/6 | `ach_dungeons_total_5` „Verlies-Läufer / Schließe 5 Verliese ab.“ gegen `ach_dungeons_distinct_1` „einen Dungeon“ |
| Lager | Bank (10) · Vorrat/Storage (5) · New Haven (4 + Content) | `bank.empty` „Das Lager ist leer.“, `nav.storage` „Lager“, `offline.camp.buildsTitle` „Dein Lager hat gebaut“ |
| Aufgaben | Aufgaben 11 · Aufträge 23 · Arbeitsaufträge 1 · Tagesaufgaben · Quest-Marken/Aufgabenmarken | `nav.quests` „Aufgaben“, `quests.daily.title` „Tägliche Aufträge“, `ach_quests_50` „50 Aufträge“, `prestige.goes.tokens` „Quest-Marken“ |
| Kill | Kills · besiegte Gegner · Abschuss · Tötungen | `combat.kills`, `pet.passive.killHeal`, `slayer_vambraces`, `weaponEffect.healOnKill` |
| Auto-Essen | Auto-Eat 6 · Auto-Essen 4 | `shop.autoEatUpgrade` gegen `onboarding.guide.cooking` |
| Reach | Reach · Reich | `daily_e_gather_40` „im Reich“, `daily_ma_gather_250` „Reichtum des Reiches“ |
| Beute | Beute 40 · Drop 13 · Loot 3 · Fund 7 | `combat.drops` „Beute:“ gegen `zone.progress.drops` „Drops {pct}%“ gegen `toast.dropRate` „Dropchance“ |

Englisch ist nicht frei davon: „Lv“ 18 / „Lvl“ 2 / „Level“ 18; „pet“ in drei Erfolgen gegen „companion“ überall sonst; Slayer „task“ 16 / „contract“ 5; „Defense“ (Stat) gegen „Defence“ (Skill); „Block chance“ gegen „Block Chance“; „the realm“ gegen „the Reach“.

Andere Sprachen (gemessen je EN-Begriff, Details in `glossar.md`): PT-BR *perícia* 32 / *habilidade* 30 für Skill und *saque* 39 / *espólio* 9 / „drop“ 4 für Beute; ES/FR/PT-BR *cazador/chasseur/caçador* für Slayer und zugleich *caza/chasse/caça* für Jagen; RU 9 Slayer-Texte mit *охотник* (Jäger); RU und ZH benutzen für Quest und Slayer-Auftrag dasselbe Wort (*задание* / *任务*); ES *encargo* für Slayer-Auftrag und Arbeitsauftrag; FR *tâche/mission/contrat* für den Slayer-Auftrag; alle fünf tragen das EN-„pet“ in Erfolgen und einem Onboarding-Text mit (*mascota/familier/mascote/питомец/宠物*). Ward, Set, Level und Meisterschaft sind in allen fünf im Kern einheitlich (je wenige Ausreißer in denselben Schlüsseln).

### C · Zu lang für die UI
- 25 label-artige DE-Schlüssel über 22 Zeichen; 113 DE-Labels länger als das 1,6-fache des englischen Textes. Beispiele: `stat.armorPen` „Rüstungsdurchdringung“ (21), `itip.attackSpeed` „Angriffsgeschwindigkeit“ (23), `skillguide.modal.gearHeading` „Ausrüstungs-Freischaltungen“ (27), `sidebar.expandCombatSkills` „Kampffertigkeiten ausklappen“ (28), `queue.moveDown` „Nach unten verschieben“ (22, Knopf).
- Die Kurzformen „Kampf Lv“ / „Ges. Lv“ in der Kopfzeile sind die Folge: Weil „Stufe“ nicht abgekürzt wurde, hat jemand die englische Abkürzung übernommen. Lösung ist Layout (ui-dev prüft Breite für „Kampfstufe 96“), nicht Abkürzung.
- Kapitälchen verschärfen das: Knöpfe über 24 Zeichen DE sind in der neuen Typografie zu prüfen.

### D · Gedankenstrich-Ketten und Muster
- Ketten (≥ 2 Striche): DE-UI 3, EN-UI 4, Content 0. Belege: `onboarding.equip.body` („Deine Waffe bestimmt den Kampfstil — Nah-, Fern- oder Magiekampf — und …“), `onboarding.guide.combat.intro`, `onboarding.guide.achievements.body`, EN `statdesc.attackDamage`.
- Einzelstriche: 154 DE-UI-Schlüssel, 154 EN-UI, 65 Content-DE, 66 Content-EN. Darunter das Hinweis-Muster „Signalwort — Rest“ in 65 DE-Schlüsseln (`skill.stoppedNoMaterials` „Gestoppt — Material leer.“, `bank.full`, `quests.shop.noSpace`, `queue.skip.*`). Nicht verboten, aber ein erkennbarer Bauplan; Doppelpunkt ist der natürliche Ersatz.
- Flavor-Pointe mit Strich als Standard: `thornfang_blade`, `duskfang_ripper`, `mossheart_crusher`, `chorus_impaler`, `choirbound_relic`, `soulflayer_snapbow`, `spectral_coif` (je einer, aber alle nach demselben Schema „X — Adjektivreihe“).
- ZH: 194 Texte mit „——“, sichtlich 1:1 aus den EN/DE-Strichen übernommen.
- Semikolons: DE-UI 32, Content DE 75 / EN 78 (Raid-Loot und Meisterringe fast durchgehend).

### E · Unklare oder entwicklernahe Effektzeilen
- `pet.passive.skillBoost` „+{value} effektive Stufen in {skill} für Kampfformeln (kein XP, schaltet nichts frei).“
- `pet.passive.craftSuffixChance` „+{pct} Prozentpunkte Chance, dass … ein Zufalls-Suffix erhält.“
- `pet.passive.wardCapacityPct` „+{pct} % Ward-Kapazität. Ohne Stoff-Ward ohne Wirkung.“
- `weaponEffect.frost` / `.shock` / `.poison`: drei Mechaniken in einem Satz mit Klammern.
- `pet.passive.bonusAmmo` „Ohne Wirkung (Munition wurde aus dem Spiel entfernt).“ – widerspricht 1.4 (Pfeile und `weaponEffect.ammoSaver` existieren). Content-/logic-dev prüfen, ob der Effekt tot ist.
- Mechanik im Flavor ohne Trennung: `slayer_helm` (54 Wörter mit „+20% …“), `slayer_hunters_elixir` „Überlegene Dauerversorgung gegenüber dem Kampftrank“, `ring_master_warding` „Erhöht die effektive Abwehr-Stufe um 5“.
- „Gewährt“ in 20 von 22 Meisterring-Texten.

### F · Fehlende, veraltete oder sachlich abweichende Übersetzungen
- Lücken: keine (siehe § 1.1). Unübersetzte DE-Reste im Content: `tavernGuests:viktor:role` „Slayer“ (müsste Monsterjäger/Slayer je Entscheid), sonst nur legitime Eigennamen (Onyx, Goblin, Bronze, Mithril, Adamantium, Aetherium, Sefra Windring). UI-Identitäten EN = Fremdsprache sind nach Durchsicht legitime Gleichwörter (FR „Combat“, „Options“) bis auf `toast.slayerTaskDoneDetail` („pts“ in ES/PT-BR stehen geblieben) und `mastery.bonus.line` (Formatzeile).
- Sachabweichungen DE gegen EN: `apprentice_robe_hat` („Magie-Boost“ statt Intelligenz), `thornfang_blade` („Dornenkranz“ statt Zahnkranz), `gk_king_shortbow` („bevor er saß“, der Thron fehlt), `sevenfold_crown_chain` ok, `slayer_greaves` („Kampflevel“).
- Veraltet: `updateNotice.point1–5` beschreiben 1.2er-Features („Jagen ist ein neuer Beruf“, „Fasern und Stoffe sind neu“); `design/i18n-glossary.md` § 6 (Raritäten) weicht von `RARITY_LABEL` ab (PT-BR, RU, ZH); Overlay-Kopfzeilen „3528 von 3528“; `design/content-strings-en.json` 18.07.
- Register-Bruch: RU und FR mischen Höflichkeitsform und Du (RU 57 : 68 UI-Schlüssel, FR 148 : 88; FR-Begleitertexte „votre“, FR-UI „ta“). Die 27 Chronik-Lore-Texte stehen im v1-Register (Feder/Akte als Handelnde in `chronicle_18`), alle späteren Wächter-Zeilen in v2.
- Erfolge EN „Own your first pet“ (`ach_pets_1`, `_5`, `_10`) gegen „companion“ überall sonst.

### G · Platzhalter- und Resttexte
- Keine TODO/TBD/Lorem-Reste in sieben Sprachen. `achievements.hidden.name` „???“ ist Absicht.
- `pet.passive.bonusAmmo` ist faktisch ein Platzhalter (siehe E).
- Ein hart codiertes englisches Label in `ItemBrowserPage.tsx:206`.

### H · Schreibweise und Typografie
- DE Prozent: 119 Schlüssel „{x} %“, 21 „{x}%“ (`blessing.effect.*`, `combat.autoEatEatsAt`, `zone.progress.drops`, `weaponEffect.frostbite`).
- DE Bindestriche: „Krit-Chance“ neben „Blockchance“/„Ausweichchance“; „Kampf-Fertigkeit“ neben „Kampffertigkeiten“.
- EN Title Case gegen sentence case in `stat.*` (sechs Title-Case-Ausreißer: Armor Rating, Evasion Rating, Ward Capacity, Block Chance, Armor Pen, Ward Break).
- Erfolgsnamen mit Partizip-Konstrukten: „Hortender“, „Holzfällen-Maximiert“ (× 22 Fertigkeiten).

---

## § 3 Abarbeitung in Paketen (nach Sichtbarkeit sortiert)

Jedes Paket läuft in zwei Wellen: **Welle 1 EN/DE** (Quelle und Hauptmarkt; ein Schreiber je Hot File) und **Welle 2 fünf Sprachen** (je Sprache ein Agent, der die Overlay-/Locale-Datei dieser Sprache besitzt). Aufwand in Agenten-Sitzungen (eine Sitzung ≈ 400–600 Texte prüfen und umschreiben; Flavor/Lore langsamer, Labels schneller). Modelle: Lore- und Flavor-Pakete in Fable-Klasse, Label-/Mechanik-Pakete in Opus-Klasse; Prüfungen nur Fable (Studio-Regel).

| # | Paket | Inhalt | Texte je Sprache | Welle 1 (EN/DE) | Welle 2 (5 Sprachen) | Vorbedingung |
|---|---|---|---|---|---|---|
| **P1** | **Kernbegriffe und Chrome** | nav, sidebar, header, stat, statdesc, skill, queue, combat-HUD/Labels, toast, inv, bank, storage, shop, item/itip/itemwiki, char, kit, status, style, menu, common, options, salvage, rune, enchant-Labels | ≈ 950 | 1 Agent, 2 Sitzungen (translations.ts) | 5 Agenten, je 1–2 Sitzungen | Glossar abgenommen |
| **P2** | **Hinweise, Fehler, Gründe, Erklärtexte** | alle `*.reason.*`, `*.locked*`, `*.blocked*`, `skill.stopped*`, `queue.skip.*`, onboarding (133), skillguide (27), guide, updateNotice, bugReport | ≈ 450 | 1 Agent, 1–2 Sitzungen (nach P1, gleiche Datei) | 5 Agenten, je 1 Sitzung | Stilregeln § 3.3; Grund-Hook für „Herstellbar: 0×“ (ui-dev) |
| **P3** | **Effektzeilen** | weaponEffect (39), pet.* (149), blessing (23), itip.masterPerk, talent (11), enchant (51), affixes/suffixes (55, Content), talentNodes (36, Content) | ≈ 370 | 1 Agent, 1 Sitzung UI + 1 Agent Content (zwei Dateien, parallel) | 5 Agenten, je 1 Sitzung | Ward-/Kill-/EP-Entscheid; content-dev prüft tote Effekte |
| **P4** | **Items** | 465 Beschreibungen + Namensdurchsicht 1.439 (nur Glossar-Treffer wie „Slayer-Helm“, „-Set“) | ≈ 520 (+ Namensliste) | 1 Agent Fable, 2 Sitzungen (index.ts) | 5 Agenten, je 1–2 Sitzungen | Entscheid zu Mechanik-im-Flavor; ggf. Zusatzpaket P4b für 974 fehlende Beschreibungen (neuer Inhalt, Lore-Dev, ≈ 4 Sitzungen EN/DE + 5 × 2) |
| **P5** | **Aufgaben, Chronik, Erfolge** | quests 125 × 2 + 27 Lore, achievements 363 × 2, chronicle-UI (9), quests-UI (44) | ≈ 1.060 | 1 Agent Fable, 2–3 Sitzungen (index.ts, nach P4) | 5 Agenten, je 2 Sitzungen | Aufgaben-Familie entschieden; Chronik-Register entschieden |
| **P6** | **Figuren und Orte 1.3/1.4** | pets 92 (Content) + companions (35), tavern 106 + 44, campBuildings 32 + newhaven (133), prestige (112) + Narbenbuch, raid (113) + raid-text 41, orders (28) + events (27) + estates (21), hunting (78), slayer (59) + mail (59) + npc (35) + offline (40) + death (13), paragon (25), bestiary (22) | ≈ 1.200 | 2 Agenten (UI-Datei / Content-Datei), je 2 Sitzungen | 5 Agenten, je 2 Sitzungen | Lager/Vorrat-, Raid-, Slayer-Entscheid |
| **P7** | **Übrige Namen (Durchsicht)** | actions 910, monsters 148, elites 29, categories 84, crops 35, sets 42, zones/dungeons 55, slayerTower 8, tokenShopShelves 6 | ≈ 1.320 | 1 Agent, 1 Sitzung (nur Glossar-Treffer ändern; Kanon-Namen unangetastet) | 5 Agenten, je 1 Sitzung (Stichproben, Kollisionswörter) | Kanon-Liste Bibel § 9 |
| **P8** | **Patchnotes 1.4 und Update-Hinweis** | neue Texte nach Stilregeln § 3.9 | ≈ 15 | Lore-Dev, 1 Sitzung | 5 Agenten, je ½ Sitzung | Changelog final |

Summen: Welle 1 ≈ 14 Agenten-Sitzungen (davon ≈ 7 Fable), Welle 2 ≈ 5 × 10 = 50 Sitzungen (Opus-Klasse, mechanischer), Prüfung ≈ 4 Sitzungen Fable (eine je Welle und Datei-Gruppe). Ohne P4b. Grobe Schätzung; die reale Zahl hängt an der Zahl der Chef-Entscheide, die vorher fallen.

Parallelität: Welle 1 ist durch die Hot Files begrenzt (`translations.ts` ein Schreiber, `index.ts` ein Schreiber); P1→P2→P3-UI laufen also nacheinander in `translations.ts`, P3-Content→P4→P5 nacheinander in `index.ts`, P6 teilt sich auf beide. Welle 2 kann mit fünf Agenten gleichzeitig laufen (je einer pro Sprachdatei), sobald Welle 1 eines Pakets gelandet ist.

---

## § 4 Prozess-Hinweise (Empfehlungen an den Hauptagenten)

1. **Reihenfolge:** Glossar und Stilregeln vom Chef abnehmen → Proben abnehmen → P1 EN/DE → Sichtprüfung im Spiel (Kopfzeile, Statblatt, Kampfseite) → P2/P3 → danach Content-Pakete. Erst wenn EN/DE eines Pakets steht, die fünf Sprachen.
2. **Quelle aktualisieren:** vor Welle 2 `node tools/extract-content-strings.mjs` laufen lassen (content-dev), damit `design/content-strings-en.json` wieder 4.581 Schlüssel hat; Overlay-Kopfzeilen korrigieren.
3. **Guards:** `qa2-ui-i18n.test.ts` (Parität, Platzhalter, keine deutschen Reste in Fremdsprachen) nach jedem Paket laufen lassen. Zusätzlich empfehlen: eine Glossar-Lint (Liste verbotener Wörter je Sprache: DE „Lv“, „Level“ außerhalb Eigennamen, „Skill“, „Item“, „Drop“, „Mitigation“ …; RU „питомец“, „лут“; PT-BR „raide“, „drop“; FR „drop“) als `it.fails`-Beleg oder Skript unter `tools/`. Nicht mein Revier; Vorschlag an ui-dev/kontrolleur.
4. **Reproduzierbare Zählung:** derselbe Dump (UI_TEXT + Content nach `applyContentLocales`) als kleines Werkzeug im Repo wäre sinnvoll, damit die Zahlen in diesem Dokument nach dem Pass neu gezogen werden können.
5. **Kanon-Schutz:** Zonen-, Dungeon-, Boss-, Figuren-, Set- und Itemnamen aus Bibel § 9 werden nicht umbenannt. Betroffen von Glossar-Entscheiden sind nur Gattungswörter in Namen („Slayer-Helm“ bleibt in jeder Variante, weil „Slayer“ dort Teil des Eigennamens ist, außer der Chef entscheidet „Monsterjäger“).
6. **Save-Sicherheit:** Reine Anzeigetexte berühren keine IDs; ein Umbenennen des Skill-Anzeigenamens (`skills:slayer:name`) ist save-neutral. Trotzdem jeden Content-Diff durch content-dev gegenlesen lassen (Hot File).
7. **Proben zuerst:** Die 38 Vorher/Nachher-Proben in `proben.md` sind so gewählt, dass jede Problemklasse A–H einmal vorkommt. Wenn der Chef dort den Ton abnimmt, ist der Rest Fleißarbeit nach Regel.

---

## § 5 Die fünf wichtigsten Befunde (Kurzfassung)

1. **Drei Wörter für Level** im Deutschen (Stufe 192, Level 40, Lv 7 Fundstellen) und „Stufe“ zugleich für fünf andere Dinge. Ohne diesen Entscheid kann kein Paket starten.
2. **„Lager“ meint Bank, Vorrat und New Haven** zugleich; „Aufgaben/Aufträge“ meint Quests, Tagesaufgaben, Slayer-Aufträge und Werkstatt-Aufträge kreuz und quer. Das sind Verständnisfehler, keine Stilfragen.
3. **Slayer und Ward** sind im Deutschen uneinheitlich (Slayer/Monsterjäger; Ward/Schutzschild/Schild), und Slayer kollidiert in ES/FR/PT-BR (sowie in 9 RU-Texten) mit dem Skill Jagen. Die Ward-Wörter der fünf anderen Sprachen sind dagegen im Kern einheitlich und folgen dem DE-Entscheid mechanisch.
4. **RU und FR duzen und siezen gemischt** (RU 57 : 68, FR 148 : 88 UI-Schlüssel); die Begleitertexte FR widersprechen der FR-UI. Ein Entscheid je Sprache, dann mechanische Korrektur.
5. **Mechanik und Flavor vermischt, Effektzeilen entwicklernah:** 40 Item-Texte tragen Zahlen im Flavor-Satz, 149 pet-Zeilen und 39 Waffeneffekte brauchen die Bedingung→Wirkung-Form; ein toter Effekttext (`pet.passive.bonusAmmo`) ist spielersichtbar. Gedankenstrich-Ketten sind dagegen selten (7 UI-Texte, 0 Content) – das Muster „Signalwort — Rest“ (65) ist die eigentliche Gewohnheit.
