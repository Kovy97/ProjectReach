# Textpass 1.4 · P1 Änderungen (EN/DE)

**Stand:** 2026-10-24, nur `apps/client/src/renderer/i18n/translations.ts` (Blöcke en und de). Marker `claude:2026-10-24T18:45:00+02:00 Textpass P1 (Glossar 24.10.)` am Anfang beider Blöcke.
**Zählung:** 151 Schlüssel angefasst, davon **127 in DE** und **46 in EN**. Rund 1.040 Schlüssel der P1-Bereiche geprüft. Der Rest war nach Glossar und Chef-Entscheiden bereits in Ordnung oder gehört zu P2 (Hinweise, Gründe) und P3 (Effektzeilen). In den Tabellen steht „·“ für „unverändert“.
**Prüfung:** `npx tsc --noEmit` grün; `npx vitest run` in apps/client 19/19 Dateien, 271/271 Tests grün (inkl. `qa2-ui-i18n`: Parität und Platzhalter).

## Die wichtigsten Muster

1. **Level (Chef-Entscheid):** „Stufe“ als Fortschritt wird zu „Level“, im engen Feld zu „Lv“: `toast.levelUp` Levelaufstieg!, `nav.totalLevel` Gesamtlevel, `queue.amount.level`, `combat.level`, `combat.dungeonLevel` Kampflevel, `combat.zoneLevels`/`combat.levelShort`/`skill.levelShort` „Lv“. Kopfzeile: „Kampf-Lv“ / „Gesamt-Lv“ statt „Kampf Lv“ / „Ges. Lv“ (Abkürzung „Ges.“ ist nach Stilregeln § 2.5 verboten). „Stufe“ bleibt bei Abstufungen (Item-Stufe, Auto-Essen S{n}, Max-Stufe, Runen).
2. **Entwicklerwörter deutsch:** Mitigation → Schadensminderung, Rüstungsdurchdringung → Rüstungsbruch, Ward-Durchbruch → Ward-Bruch (ein Wort statt zwei), „INT“ → Intelligenz, Skilling-XP → Fertigkeits-XP, „Skill“ → Fertigkeit (Dock, Stat-Beschreibungen, Fertigkeitslevel), Upgrade → Ausbau, Auto-Eat → Auto-Essen, Backup → Sicherung, Idle → im Hintergrund, Enchant-Wörter in Labels.
3. **Lager-Trennung:** Die Bank heißt nur noch „Bank“ (`bank.empty`, `bank.expandTitle`, `bank.stackAll.tip`, `options.autoBank`, `options.autoBankHint`, `combat.noFood`). „Lager“ bleibt allein die Materialseite (`nav.storage`, Materialien ins Lager, Pfeile im Lager).
4. **Schild ≠ Ward:** `combat.shield` (Protokollzeile, im Code ein Ward-Absorb) „Schild absorbiert“ → „Absorbiert“; `combat.defenseType.ward` „Beschildet“ → „Mit Ward“; `statdesc.wardBreak` „Ward-Schild“ → „Ward“ (EN „ward shield“ → „ward“).
5. **Item → Gegenstand:** wo der Platz es zulässt (Inventarfilter, Bank, Laden, Altar, Zerlegen, Charakterseite). „Item-Wiki“ bleibt (Feature-Name, siehe Fragen). Item/Items in `*.reason.*`-Schlüsseln blieben für P2 stehen.
6. **Gedankenstriche und Semikolons:** keine Ketten gefunden (P1 hat keine mit zwei oder mehr Strichen). Wo ich einen Text ohnehin anfasste, wurde der Strich zum Doppelpunkt (`statdesc.style`, `statdesc.speed`, `statdesc.attackDamage`, `toast.onboarding.rangedBody`, `combat.inflictsHint.bleed`). Zwei Semikolons in EN/DE-Hinweisen (Frost-Hinweis, Fenstermodus) sind Punkt bzw. Komma. Das Muster „Signalwort — Rest“ wurde bewusst nicht angefasst (P2).
7. **Kills → Besiegt**, „Pkt.“ → Punkte, „Dropchance“/„Drop“ bleiben (Chef duldet Drop), Percent-Leerzeichen im DE („{pct} %“), Einheit mit Leerzeichen („{v} s“), Komposita zusammen (Kampffertigkeiten, Kampfeffekte, Waffenrunen, Exportdateien).
8. **EN:** stat-artige Labels in Sentence case (Armor rating, Block chance, Attack speed, Used for …), „Lvl“ → „Lv“, Defense → Defence (Stat wie Skill), britisch/amerikanisch vereinheitlicht in `rune.target.*` und `storage.shelf.fibers` (Armor, Jewelry, Fibers), `bank.expandTitle` „Expand Bank Storage“ → „Expand Bank“ (Verwechslung mit der neuen Storage-Seite).

## nav (1)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `nav.totalLevel` | Gesamtstufe | Gesamtlevel | · | · |

## sidebar (4)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `sidebar.combatStyleHint` | Bestimmt, welche Kampf-Fertigkeit deine Kämpfe trainieren. Klicken zum Ändern. | Bestimmt, welche Kampffertigkeit deine Kämpfe trainieren. Klicken zum Ändern. | · | · |
| `sidebar.resizeLabel` | Sidebar-Breite | Breite der Seitenleiste | · | · |
| `sidebar.totalLevel` | Ges. Lv | Gesamt-Lv | · | · |
| `sidebar.combatLevel` | Kampf Lv | Kampf-Lv | · | · |

## stat (11)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `stat.defense` | · | · | Defense | Defence |
| `stat.mitigation` | Mitigation | Schadensminderung | · | · |
| `stat.armorRating` | · | · | Armor Rating | Armor rating |
| `stat.evasionRating` | · | · | Evasion Rating | Evasion rating |
| `stat.wardCapacity` | · | · | Ward Capacity | Ward capacity |
| `stat.blockChance` | · | · | Block Chance | Block chance |
| `stat.armorPen` | Rüstungsdurchdringung | Rüstungsbruch | Armor Pen | Armor pen |
| `stat.wardBreak` | Ward-Durchbruch | Ward-Bruch | Ward Break | Ward break |
| `stat.hpRegen` | · | · | HP Regen | HP regen |
| `stat.gatherXpMult` | Skilling-XP | Fertigkeits-XP | · | · |
| `stat.gatherYieldMult` | Extra-Ertrag-Chance | Mehrertragschance | · | · |

## statdesc (14)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `statdesc.style` | Dein aktiver Kampfstil — bestimmt durch deine Waffe. Legt Schadensart & genutzte Skills fest. | Dein aktiver Kampfstil, bestimmt durch deine Waffe. Legt Schadensart und genutzte Fertigkeiten fest. | Your active combat style — set by your equipped weapon. Decides which damage type & skills are used. | Your active combat style, set by your equipped weapon. Decides which damage type and skills are used. |
| `statdesc.attackDamage` | Deine effektive Schadensspanne mit der ausgerüsteten Waffe — die Min-Max-Trefferspanne im Kampf. | Deine Schadensspanne mit der ausgerüsteten Waffe: kleinster bis größter Treffer im Kampf. | Your effective damage range with the equipped weapon — the min–max hit spread used in combat. | Your damage range with the equipped weapon: the min–max spread of a hit in combat. |
| `statdesc.meleeDamage` | Basis-Nahkampfschaden pro Treffer. Steigt durch Stärke (Wucht-Skill) und deine Waffe. | Grundschaden im Nahkampf pro Treffer. Steigt durch Stärke (Fertigkeit Wucht) und deine Waffe. | · | · |
| `statdesc.rangedDamage` | Basis-Fernkampfschaden pro Schuss. Steigt durch Geschick (Fernkampf-Skill) und deinen Bogen. | Grundschaden im Fernkampf pro Schuss. Steigt durch Geschick (Fertigkeit Fernkampf) und deinen Bogen. | · | · |
| `statdesc.magicDamage` | Basis-Magieschaden pro Zauber. Steigt durch Intelligenz und deinen Stab. | Grundschaden der Magie pro Zauber. Steigt durch Intelligenz und deinen Stab. | · | · |
| `statdesc.accuracy` | Deine Chance, einen Treffer zu landen. Steigt durch Geschick (Angriff-Skill) und Ausrüstung. | Deine Chance, einen Treffer zu landen. Steigt durch Geschick (Fertigkeit Angriff) und Ausrüstung. | · | · |
| `statdesc.mitigation` | Schadensreduktion durch Platten-Rüstung. Mit abnehmendem Ertrag, gedeckelt bei 80 %. | Schadensminderung durch Plattenrüstung. Mit abnehmendem Ertrag, gedeckelt bei 80 %. | · | · |
| `statdesc.dodge` | Flache Chance, einen Treffer komplett zu vermeiden (Leder-Rüstung). Mit abnehmendem Ertrag, gedeckelt bei 40 %. | Feste Chance, einen Treffer ganz zu vermeiden (Lederrüstung). Mit abnehmendem Ertrag, gedeckelt bei 40 %. | · | · |
| `statdesc.block` | Chance, einen Treffer um -85 % Schaden zu blocken (Schild, nur Einhand-Nahkampf). Gedeckelt bei 50 %. | Chance, einen Treffer um −85 % Schaden zu blocken (Schild, nur Einhand-Nahkampf). Gedeckelt bei 50 %. | Chance to block a hit for -85% damage (Shield, one-handed melee only). Capped at 50%. | Chance to block a hit for −85% damage (Shield, one-handed melee only). Capped at 50%. |
| `statdesc.wardPool` | Absorbiert Schaden vor dem Leben, auch Blutung, Brand und Gift (Stoff-Rüstung). Was der Ward von einem Treffer abfängt, ist um 30 % gedämpft. Jeder Zauber lädt 4 % deines maximalen Wards auf. | Absorbiert Schaden vor den HP, auch Blutung, Brand und Gift (Stoffrüstung). Was der Ward von einem Treffer abfängt, ist um 30 % gedämpft. Jeder Zauber lädt 4 % deines maximalen Wards auf. | · | · |
| `statdesc.wardRegen` | Ward lädt sich automatisch über Zeit durch deine Abwehr-Fertigkeit auf. Zaubern in der Abwehr-Haltung erhöht dies um 50 %. | Der Ward lädt sich mit der Zeit selbst auf, abhängig von deiner Fertigkeit Abwehr. Zaubern in der Abwehr-Haltung erhöht dies um 50 %. | · | · |
| `statdesc.wardBreak` | Ein Teil deines Schadens umgeht den Ward-Schild eines Gegners und trifft direkt die Lebenspunkte. | Ein Teil deines Schadens umgeht den Ward eines Gegners und trifft direkt die HP. | A portion of your damage bypasses an enemy's ward shield, hitting HP directly. | A portion of your damage bypasses an enemy's ward and hits HP directly. |
| `statdesc.critChance` | Chance, dass ein Treffer kritischen (Bonus-)Schaden macht. | Chance, dass ein Treffer kritisch ist und Bonusschaden macht. | · | · |
| `statdesc.speed` | Zeit zwischen deinen Angriffen — kleiner ist schneller (Geschick & leichte Waffen). | Zeit zwischen deinen Angriffen: kleiner ist schneller (Geschick und leichte Waffen). | Time between your attacks — lower is faster (Dexterity & light weapons). | Time between your attacks: lower is faster (Dexterity and light weapons). |

## skill (7)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `skill.levelShort` | Stufe {n} | Lv {n} | · | · |
| `skill.actionSub` | {seconds}s · {xp} XP | {seconds} s · {xp} XP | · | · |
| `skill.masteryTip` | Die Meisterschaft einer Aktion wächst durch Wiederholung. Doppelertrag-Chance: {pct}% · Tempo-Bonus: {spd}%. | Die Meisterschaft einer Aktion wächst durch Wiederholung. Chance auf Doppelertrag: {pct} % · Tempo-Bonus: {spd} %. | · | · |
| `skill.t.success.tip.base` | Basis {base}% + {lvl}% durch Skill-Level. | Basis {base} % + {lvl} % durch Fertigkeitslevel. | · | · |
| `skill.t.success.tip.risk` | {mode}: {sign}{pct}%. | {mode}: {sign}{pct} %. | · | · |
| `skill.t.success.tip.otherBonus` | +{pct}% durch Begleiter- und Ring-Boni. | +{pct} % durch Begleiter- und Ring-Boni. | · | · |
| `skill.t.success.tip.cap` | Maximal {cap}%. | Maximal {cap} %. | · | · |

## queue (1)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `queue.amount.level` | Stufe {from} → {to} | Level {from} → {to} | · | · |

## toast (8)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `toast.levelUp` | Stufenaufstieg! | Levelaufstieg! | · | · |
| `toast.achievement` | Meilenstein erreicht! | Erfolg freigeschaltet! | · | · |
| `toast.saveRecovered.body` | Dein Spielstand war beschädigt — ein Backup vom {date} wurde wiederhergestellt. | Dein Spielstand war beschädigt. Eine Sicherung vom {date} wurde wiederhergestellt. | · | · |
| `toast.slayerTaskDoneDetail` | +{xp} XP · +{points} Pkt. | +{xp} XP · +{points} Punkte | +{xp} XP · +{points} pts | +{xp} XP · +{points} points |
| `toast.slayerStreak.points` | +{n} Pkt. | +{n} Punkte | +{n} pts | +{n} points |
| `toast.onboarding.rangedBody` | Dein Bogen bestimmt den Kampfstil — Fernkampfangriffe treffen aus der Distanz. | Dein Bogen bestimmt den Kampfstil: Fernkampfangriffe treffen aus der Distanz. | Your bow sets the combat style — ranged attacks strike from a distance. | Your bow sets the combat style: ranged attacks strike from a distance. |
| `toast.enchanted.title` | Verzaubertes Item! | Verzauberter Gegenstand! | · | · |
| `toast.apMilestone.detail` | · | · | {pct}% reached — +{tokens} Quest Tokens | {pct}% reached — +{tokens} quest tokens |

## inv (1)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `inv.filter.noMatches` | Keine Items gefunden. | Keine Gegenstände gefunden. | · | · |

## bank (7)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `bank.intro` | Lagere hier Items — jeder Slot ist ein unbegrenzter Stapel und entlastet dein Inventar. | Lagere hier Gegenstände ein. Jeder Platz fasst einen unbegrenzten Stapel und entlastet dein Inventar. | · | · |
| `bank.kinds` | {n} Item-Arten eingelagert | {n} Arten eingelagert | · | · |
| `bank.full` | Bank voll — gib einen Slot frei, um neue Item-Arten einzulagern. | Bank voll — gib einen Platz frei, um neue Gegenstandsarten einzulagern. | · | · |
| `bank.stackAll.tip` | Legt alle Gegenstände ins Lager, die dort schon liegen | Legt jeden Gegenstand aus dem Inventar, der schon in der Bank liegt, auf seinen Stapel | · | · |
| `bank.empty` | Das Lager ist leer. | Die Bank ist leer. | · | · |
| `bank.expandTitle` | Lager erweitern | Bank erweitern | Expand Bank Storage | Expand Bank |
| `bank.sortFiltered` | Erst den Filter leeren — sortiert werden alle Fächer, nicht nur die sichtbaren. | Erst den Filter leeren — sortiert werden alle Plätze, nicht nur die sichtbaren. | · | · |

## storage (1)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `storage.shelf.fibers` | · | · | Fibres & Cloth | Fibers & Cloth |

## shop (6)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `shop.counter.inventoryFull` | Inventar voll — schaffe Platz oder kaufe ein Inventar-Upgrade. | Inventar voll — schaffe Platz oder erweitere dein Inventar. | · | · |
| `shop.slotUpgrade` | Inventar-Slot-Upgrade (+{n}) | Inventar-Erweiterung (+{n}) | · | · |
| `shop.autoEatUpgrade` | Auto-Eat {tier} — isst bei {pct}% HP | Auto-Essen {tier}: isst bei {pct} % HP | · | · |
| `shop.autoEatMaxed` | Auto-Eat {tier} (max) | Auto-Essen {tier} (max) | · | · |
| `shop.autoEatHint` | Verbessert das Kampf-Auto-Essen dauerhaft: löst bei höherem HP-Schwellwert aus (Heilmenge bleibt der Food-Wert). | Verbessert das Auto-Essen im Kampf dauerhaft: Es springt bei einer höheren HP-Schwelle an, die Heilmenge bleibt der Wert der Nahrung. | · | · |
| `shop.sellSelectHint` | Wähle ein Item aus deinem Inventar zum Verkaufen aus. | Wähle einen Gegenstand aus deinem Inventar zum Verkaufen aus. | · | · |

## item (2)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `item.attackSlower` | {v}s langsamer | {v} s langsamer | · | · |
| `item.attackFaster` | {v}s schneller | {v} s schneller | · | · |

## itip (10)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `itip.attackSpeed` | Angriffsgeschwindigkeit | Angriffstempo | Attack Speed | Attack speed |
| `itip.usedFor` | · | · | Used For | Used for |
| `itip.buff` | · | · | Timed Buff | Timed buff |
| `itip.buffReplace.defense` | · | · | Replaces your active defense buff. | Replaces your active defence buff. |
| `itip.buffReplace.utility` | Ersetzt deinen aktiven Skilling-Buff. | Ersetzt deinen aktiven Fertigkeits-Buff. | · | · |
| `itip.group.defense` | · | · | Defense | Defence |
| `itip.group.runeEffect` | Runen-Effekt | Runeneffekt | Rune Effect | Rune effect |
| `itip.spellFocus` | · | · | Spell Focus | Spell focus |
| `itip.spellFocus.perInt` | +{pct} % Schaden je INT | +{pct} % Schaden je Intelligenz | · | · |
| `itip.spellFocus.withInt` | Mit deinem INT ({int}) | Mit deiner Intelligenz ({int}) | · | · |

## char (8)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `char.tab.stats` | Stats | Werte | · | · |
| `char.tabs.ariaLabel` | Ausrüstungs- und Statuswerte-Reiter | Reiter Ausrüstung und Werte | · | · |
| `char.combatSkills` | Kampf-Fertigkeiten | Kampffertigkeiten | · | · |
| `char.noSelection` | Item anklicken zum Betrachten | Gegenstand anklicken zum Betrachten | · | · |
| `char.export.tooltip` | Speichert Ausrüstungs-Blatt, Portrait und ein fertiges Prompt für Bildgeneratoren. | Speichert ein Ausrüstungsblatt, ein Portrait und ein fertiges Prompt für Bildgeneratoren. | · | · |
| `char.export.error.noBridge` | Charakter-Export funktioniert nur in der Desktop-App. | Der Charakterexport funktioniert nur in der Desktop-App. | · | · |
| `char.export.error.writeFailed` | Die Export-Dateien konnten nicht geschrieben werden. | Die Exportdateien konnten nicht geschrieben werden. | · | · |
| `char.export.error.render` | Die Export-Bilder konnten nicht erstellt werden. | Die Exportbilder konnten nicht erstellt werden. | · | · |

## combat (35)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `combat.dock.skills` | Skills | Fertigkeiten | · | · |
| `combat.dungeonLevel` | Empfohlen: Kampfstufe {n} | Empfohlen: Kampflevel {n} | · | · |
| `combat.dungeonLevelWarn` | Empfohlen: Kampfstufe {n} · Deine: {lvl} | Empfohlen: Kampflevel {n} · Dein Level: {lvl} | · | · |
| `combat.zoneLevels` | Stufe {min}–{max} | Lv {min}–{max} | · | · |
| `combat.elite.uniqueLabel` | Jagdbeute | Unikat | · | · |
| `combat.level` | Stufe {n} | Level {n} | · | · |
| `combat.hud.level` | Stufe | Level | Lvl | Lv |
| `combat.hud.kills` | Kills | Besiegt | · | · |
| `combat.levelShort` | Stufe {n} | Lv {n} | · | · |
| `combat.kills` | Kills: {n} | Besiegt: {n} | · | · |
| `combat.session.killsShort` | Kills | Besiegt | · | · |
| `combat.healSource.kill` | bei Kill | bei Sieg | · | · |
| `combat.dock.toggleHint` | Ausrüstungs-Panel ein-/ausklappen | Ausrüstungspanel ein-/ausklappen | · | · |
| `combat.styleHint` | Dein Nahkampfstil bestimmt, welcher Skill XP erhält und einen passiven Bonus gibt: Angriff = Genauigkeit, Wucht = Schaden, Defensiv = Block/Verteidigung. | Dein Nahkampfstil bestimmt, welche Fertigkeit XP erhält und einen passiven Bonus gibt: Angriff = Genauigkeit, Wucht = Schaden, Defensiv = Block/Verteidigung. | · | · |
| `combat.noFood` | Keine Nahrung im Inventar — koche oder kaufe welche (Nahrung im Lager wird nicht genutzt). | Keine Nahrung im Inventar — koche oder kaufe welche (Nahrung in der Bank wird nicht genutzt). | · | · |
| `combat.foodAutoEat` | Nahrung & Auto-Eat | Nahrung & Auto-Essen | · | · |
| `combat.autoEatTier` | Auto-Eat S{n} | Auto-Essen S{n} | · | · |
| `combat.autoEatEatsAt` | isst bei {p}% HP | isst bei {p} % HP | · | · |
| `combat.autoEatUpgrade` | Upgrade | Ausbau | · | · |
| `combat.autoPotion.threshold` | Trinken unter {p}% HP | Trinken unter {p} % HP | · | · |
| `combat.autoEat.threshold` | Isst unter {p}% HP | Isst unter {p} % HP | · | · |
| `combat.autoPotion.cooldownHint` | {n}s Abklingzeit zwischen Auto-Schlucken | {n} s Abklingzeit zwischen automatischen Schlucken | · | · |
| `combat.inflictsHint.bleed` | Dieser Gegner kann dich bluten lassen — Schaden über Zeit, ignoriert Rüstung. | Dieser Gegner kann dich bluten lassen: Schaden über Zeit, ignoriert Rüstung. | This enemy can make you bleed — damage over time that ignores armor. | This enemy can make you bleed: damage over time that ignores armor. |
| `combat.inflictsHint.frost` | Dieser Gegner kann dich unterkühlen und deine Angriffe verlangsamen; der dritte Frost in Folge friert dich für einen Angriff ein. | Dieser Gegner kann dich unterkühlen und deine Angriffe verlangsamen. Der dritte Frost in Folge friert dich für einen Angriff ein. | This enemy can chill you, slowing your attacks; a third chill in a row freezes you for one attack. | This enemy can chill you and slow your attacks. A third chill in a row freezes you for one attack. |
| `combat.regenHint` | Dieser Gegner regeneriert Lebenspunkte. Überbiete seine Heilung, um zu gewinnen. | Dieser Gegner regeneriert HP. Überbiete seine Heilung, um zu gewinnen. | · | · |
| `combat.shield` | Schild absorbiert {amount} | Absorbiert {amount} | Shield absorbs {amount} | Absorbs {amount} |
| `combat.wardEmptyHint` | Ward erschöpft — casten zum Aufladen | Ward erschöpft — zaubern zum Aufladen | · | · |
| `combat.defenseType.ward` | Beschildet | Mit Ward | · | · |
| `combat.defenseType.armor.desc` | Mindert Schaden durch Rüstung. Gekontert durch Rüstungsdurchdringung. | Mindert Schaden durch Rüstung. Gekontert durch Rüstungsbruch. | Mitigates damage with armor. Countered by Armor Pen. | Mitigates damage with armor. Countered by Armor pen. |
| `combat.defenseType.ward.desc` | Schützt Lebenspunkte mit einem Ward-Pool, bevor er durchbricht. Gekontert durch Ward-Durchbruch. | Schützt die HP mit einem Ward-Pool, bevor er durchbricht. Gekontert durch Ward-Bruch. | Shields HP with a ward pool before it breaks through. Countered by Ward Break. | Shields HP with a ward pool before it breaks through. Countered by Ward break. |
| `combat.defenseType.ward.statusHint` | Wardgeschützt — schwach gegen Status-Effekte (Gift, Blutung, Feuer: +20 % Schaden). | Wardgeschützt: schwach gegen Statuseffekte (Gift, Blutung, Brand: +20 % Schaden). | · | · |
| `combat.xpNone` | Kein XP | Keine XP | · | · |
| `combat.meleeFocusLabel` | · | · | Melee Focus: | Melee focus: |
| `combat.rangedFocusLabel` | · | · | Range Focus: | Ranged focus: |
| `combat.magicFocusLabel` | · | · | Magic Focus: | Magic focus: |

## options (16)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `options.windowModeHint` | · | · | Applies on your next game start. Fullscreen and Windowed switch immediately; Borderless Window needs a restart. | Applies on your next game start. Fullscreen and Windowed switch immediately, Borderless Window needs a restart. |
| `options.autoBank` | Auto-Lager bei vollem Inventar | Auto-Bank bei vollem Inventar | · | · |
| `options.autoBankHint` | Items wandern ins Lager statt den Idle-Fortschritt zu stoppen. | Gegenstände wandern in die Bank, statt den Fortschritt im Hintergrund zu stoppen. | · | · |
| `options.tooltipImagePopupHint` | Item-Bilder kippen und treten beim Überfahren aus dem Tooltip heraus. Aus = statische Bilder. | Bilder von Gegenständen kippen und treten beim Überfahren aus dem Tooltip heraus. Aus = statische Bilder. | · | · |
| `options.combatFx` | Kampf-Effekte | Kampfeffekte | · | · |
| `options.uiStyleHint` | Klassisch bringt Seitenleiste, Reiterleiste und Kopfzeile von vor 1.3 zurück. Beide Stile wachsen mit dem Griff der Seitenleiste und dem Höhenregler der Kopfleiste. | Klassisch bringt Seitenleiste, Reiterleiste und Kopfzeile von vor 1.3 zurück. Beide Stile wachsen mit dem Griff der Seitenleiste und dem Höhenregler der Kopfzeile. | · | · |
| `options.music` | Ambient-Musik (subtiler Hintergrund-Drone): | Ambient-Musik (leiser Dauerton im Hintergrund): | · | · |
| `options.hotkeys.digitsLabel` | Zur Sidebar-Seite springen | Seite aus der Seitenleiste öffnen | · | · |
| `options.hotkeys.shopTabLabel` | Kaufen-/Verkaufen-Tab wechseln (Shop) | Reiter Kaufen/Verkaufen wechseln (Laden) | · | · |
| `options.ambient.vignetteHint` | · | · | Darkens the screen edges to draw focus to the centre. | Darkens the screen edges to draw focus to the center. |
| `options.saveData` | Spielstand-Daten | Spielstanddaten | · | · |
| `options.saveHint` | Exportiere ein Backup deines aktuellen Spielstands oder importiere eines, um diesen Slot zu überschreiben. | Exportiere eine Sicherung deines aktuellen Spielstands oder importiere eine, um diesen Speicherplatz zu überschreiben. | · | · |
| `options.exportDownload` | Backup herunterladen | Sicherung speichern | · | · |
| `options.importError` | Ungültige Spielstand-Daten. | Ungültige Spielstanddaten. | · | · |
| `options.openBackups` | Backup-Ordner öffnen | Sicherungen öffnen | · | · |
| `options.openBackupsHint` | Das Spiel legt automatisch lokale Backups deiner Spielstände an (rollierend, täglich und vor dem Löschen oder Überschreiben). | Das Spiel legt automatisch lokale Sicherungen deiner Spielstände an (rollierend, täglich und vor dem Löschen oder Überschreiben). | · | · |

## salvage (2)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `salvage.batchLead` | Zerlegen lässt sich nur erbeutete Ausrüstung. Hergestelltes, Shop-Ware, gesperrte Teile und Teile mit Runen bleiben liegen. | Zerlegen lässt sich nur erbeutete Ausrüstung. Hergestelltes, Ware aus dem Laden, gesperrte Teile und Teile mit Runen bleiben liegen. | · | · |
| `salvage.batchNothing` | Bis zu dieser Rarität liegt nichts Zerlegbares im Inventar. | Bis zu dieser Seltenheit liegt nichts Zerlegbares im Inventar. | · | · |

## rune (6)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `rune.target.armor` | · | · | Armour | Armor |
| `rune.target.jewelry` | · | · | Jewellery | Jewelry |
| `rune.target.plate` | · | · | Plate armour | Plate armor |
| `rune.target.leather` | · | · | Leather armour | Leather armor |
| `rune.target.cloth` | · | · | Cloth armour | Cloth armor |
| `rune.target.hint.armorRating` | · | · | Only on pieces that already carry an armour rating. | Only on pieces that already carry an armor rating. |

## enchant (9)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `enchant.altar.empty` | Lege ein Item auf den Altar, um zu beginnen. | Lege einen Gegenstand auf den Altar, um zu beginnen. | · | · |
| `enchant.selectItem` | Item auswählen | Gegenstand wählen | · | · |
| `enchant.noPreview` | Item und Rune auswählen zur Vorschau. | Wähle Gegenstand und Rune für die Vorschau. | · | · |
| `enchant.noRunes` | Keine Verzauber-Runen im Inventar. Stelle sie mit Runenkunst her (Runen-Rezepte ab Stufe 15). | Keine Verzauberungsrunen im Inventar. Stelle sie mit Runenkunst her (Rezepte ab Level 15). | · | · |
| `enchant.weaponRunes` | Waffen-Runen | Waffenrunen | · | · |
| `enchant.armorRunes` | Rüstungs-Runen | Rüstungsrunen | · | · |
| `enchant.runeBadge.weapon` | Waffen-Rune | Waffenrune | · | · |
| `enchant.runeBadge.armor` | Rüstungs-Rune | Rüstungsrune | · | · |
| `enchant.suffixHint` | Gecraftete und gedroppte Ausrüstung kann einen zufälligen Suffix tragen — z.B. '+8 Verteidigung des Bären'. Suffixe entstehen automatisch und sind im Item-Tooltip sichtbar. | Hergestellte und erbeutete Ausrüstung kann einen zufälligen Suffix tragen, zum Beispiel „des Bären“, der Attributboni gibt. Suffixe entstehen automatisch und stehen im Tooltip des Gegenstands. | Crafted and dropped equipment can carry a random Suffix — a stat bonus like '+8 Defense of the Bear'. Suffixes appear automatically and are shown on the item tooltip. | Crafted and dropped equipment can carry a random suffix such as “of the Bear”, which adds attribute bonuses. Suffixes appear automatically and show on the item tooltip. |

## pet (2)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `pet.effect.skill.bonusAmmo` | Ohne Wirkung | Pfeilertrag | No effect | Arrow yield |
| `pet.passive.bonusAmmo` | Ohne Wirkung (Munition wurde aus dem Spiel entfernt). | Erhöht die Chance auf doppelten Ertrag beim Befiedern von Pfeilen. | No effect (ammunition was removed from the game). | Better odds of a doubled yield when fletching arrows. |

## Befunde (Sachfehler, im Code gegengeprüft)

1. `pet.passive.bonusAmmo` / `pet.effect.skill.bonusAmmo`: Text behauptete „Munition wurde aus dem Spiel entfernt, ohne Wirkung“. Der Haken lebt: `petBonusAmmoChance` (engine/pets.ts, tick.ts:241) erhöht die Doppelertrag-Chance beim Befiedern von Pfeilen. Heute trägt kein Begleiter dieses Kind, der Schlüssel ist also nur über künftigen Content erreichbar. Neu: „Better odds of a doubled yield when fletching arrows.“ / „Erhöht die Chance auf doppelten Ertrag beim Befiedern von Pfeilen.“, Galerie-Label „Arrow yield“ / „Pfeilertrag“. **Ohne `{pct}`**, weil der Guard `qa2-ui-i18n` Platzhalter-Gleichheit in allen sieben Sprachen verlangt und die fünf anderen Sprachen noch den alten Text tragen. In Welle 2 (oder P3) auf „+{pct} % Chance …“ in allen sieben Sprachen umstellen.
2. `toast.achievement` DE „Meilenstein erreicht!“ übersetzte „Achievement unlocked!“ falsch und kollidierte mit `toast.apMilestone.title` („Erfolgs-Meilenstein!“). Neu „Erfolg freigeschaltet!“.
3. `combat.shield` meinte im Code immer Ward-Absorb (combat.ts: kind "shield", source ward/effect), nicht den Schild der Nebenhand.
4. `enchant.suffixHint`: Beispiel „+8 Defense of the Bear“ stimmte nicht, der Bär-Suffix gibt Stärke und Konstitution (`suffix_bear`, attrPerIlvl str/con). Beispiel jetzt ohne falsche Zahl und Wertangabe.
5. `enchant.noRunes`: „ab Stufe 15“ ist ein Runenkunst-Level (kleinstes `levelRequired` der Verzauberungsrunen ist 15, geprüft), jetzt „ab Level 15“.
6. `bank.expandTitle` EN „Expand Bank Storage“ (Bank), kollidiert mit der neuen Seite „Storage“.
7. Zahlen in `statdesc.*`, `status.*` und `combat.styleEffect.*` gegen `packages/shared` geprüft (Deckel 80/40/50 %, Block −85 %, Ward 30 %/4 % je Zauber/+50 % Abwehr-Haltung, Frost 40 %, Schock 0,4/1,2 s, Gift 5 Stapel, Entzug 15 %, Brand +10 %, Ward-schwach +20 %, Stil +12/+15 %): stimmen.

## Texte, die nur mit Layout-Änderung passen würden (für ui-dev)

- `sidebar.combatLevel` „Kampf-Lv“ / `sidebar.totalLevel` „Gesamt-Lv“ (Kopfzeile, Seitenleiste): „Kampf-Lv“ ist so lang wie vorher, „Gesamt-Lv“ zwei Zeichen länger als „Ges. Lv“. Wunsch wäre „Kampflevel“ / „Gesamtlevel“; die Beschriftung wandert laut App.tsx bei Enge ohnehin in den Tooltip, bitte bei 1366×768 prüfen.
- `stat.mitigation` „Schadensminderung“ (17 statt 10 Zeichen) in der Statzeile; Chef-Entscheid, daher gesetzt. Reicht der Platz nicht, wäre „Minderung“ die kurze Variante.
- `combat.dock.skills` „Fertigkeiten“ (12 statt 6), gleich lang wie „Ausrüstung“ und „Vorbereitung“ im selben Dock.
- `combat.hud.kills` „Besiegt“ (7 statt 5, Kampf-HUD) und `combat.session.killsShort` „Besiegt“.
- `combat.dungeonLevelWarn` ist um „Dein Level:“ länger als vorher („Deine:“).
- `combat.meleeSub` nutzt weiter die Kürzel „Angr. / Vert.“ (nicht angefasst, nur mit Layout zu ersetzen).
- `shop.slotUpgrade` „Inventar-Erweiterung (+{n})“ ist 3 Zeichen länger.

## Offene Begriffsfragen

1. **„Item“:** Der Chef-Entscheid nennt Item nicht unter den geduldeten Wörtern; ich habe der Glossar-Empfehlung „Gegenstand“ gefolgt. Wenn Item wie Slot/Drop geduldet sein soll, wäre das ein Rückbau von rund 25 Schlüsseln (Tabelle oben). „Item-Wiki“ habe ich als Feature-Namen stehen lassen.
2. **„Ward-Pool“:** bleibt (Pool als Gamer-Wort geduldet); Glossar § 15 nennt „Vorrat“ nur für den Meisterschafts-Pool. Falls auch hier „Vorrat“ gewünscht ist, wären es `stat.wardPool`, `combat.defenseType.ward.desc`, `skilldesc.warding`, `skillguide.warding`.
3. **„Drop“ vs. „Beute“:** Drop bleibt geduldet; so stehen `zone.progress.drops`, `toast.dropRate`, `combat.session.raresShort` weiter neben „Beute“. Einheitslinie gewünscht?
4. **Kopfzeile:** „Lv“ (kurz) oder „Level“ (lang) in `sidebar.*Level`, siehe Layout.
5. **`combat.diffLegend.danger`** „Rot — Selbstmord“ ist grob für ein Hinweis-Register; nicht angefasst.
6. **EN „Defence“:** gesetzt für Stat und Gruppenlabels (britisch wie der Skill); im Rest der UI steht sonst amerikanisch („armor“).

## Nicht in P1 angefasst, aber aufgefallen (für P2/P3/Tests)

- `apps/client/src/renderer/runeTargets.test.ts:51` prüft den Wortlaut „Schutzwert“ in `rune.target.hint.armorRating` (DE). Ich habe den DE-Text deshalb **unverändert** gelassen. „Rüstungswert“ wäre korrekt (Stat heißt so); dann Test mitziehen.
- P2-Reste mit P1-Vokabular: `enchant.reason.*` und `enchant.preview.blocked.*` (Item, „Enchant-Slots“), `skill.stoppedInventoryFull` („Shop“, „Slots“), `queue.skip.raid_locked` („Diese Stufe“ meint Schwierigkeit), `queue.duration.materialEstimateHint`, `itip.setfx.*` und `itip.masterPerk.*` („Gewährt“, „Zins“ …, P3).
- Das Hinweis-Muster „Signalwort — Rest“ (rund 65 DE-Schlüssel) blieb für P2 stehen.
