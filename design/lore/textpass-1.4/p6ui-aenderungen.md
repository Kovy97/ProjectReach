# Textpass 1.4 · P6-UI Änderungen (EN/DE)

**Stand:** 2026-10-24, nur `apps/client/src/renderer/i18n/translations.ts` (Blöcke en und de). Marker `claude:2026-10-24T20:27:00+02:00 Textpass P6-UI (…)` am Anfang beider Blöcke, neben den P1- und P2/P3-Markern.
**Umfang:** 993 Schlüssel der P6-Bereiche gelesen (companions 35, pet 149, tavern 44, newhaven 133, prestige 112, raid 113, orders 28, events 27, estates 21, hunting 78, slayer 59, mail 59, npc 35, offline 40, death 13, paragon 25, bestiary 22).
**Zählung:** 111 Schlüssel angefasst, davon **105 in DE** und **56 in EN**. In den Tabellen steht „·“ für „unverändert“. Keine Schlüssel umbenannt, gelöscht oder hinzugefügt; das Anwendungsskript hat je Text die Platzhaltermenge alt gegen neu geprüft. Die fünf anderen Sprachen sind unberührt.
**Prüfung:** `npx tsc --noEmit` grün; `npx vitest run` in apps/client 20/20 Dateien, 275/275 Tests grün (inkl. `qa2-ui-i18n`, `petText`). `pnpm --filter @hearthforge/client build` grün (electron-vite, 25 s). Keine visuelle Abnahme. Kein Test pinnte einen Wortlaut aus den P6-Bereichen; `petText.test.ts` prüft nur, dass die `pet.effect.*`-Labels existieren.

## Die wichtigsten Muster

1. **Glossar-Nachzüge aus P1/P2:** „Gesamtstufe“ → „Gesamtlevel“ (Altar-Vorschau, Punkteliste, Bilanz, Verlauf, Rabenpost), „Kampfstufe 99“ → „Kampflevel 99“ (Raid-Empfehlung), Monsterlevel im Bestiarium „Stufe {n}“ → „Lv {n}“, `offline.lvlShort` „Lvl“ → „Lv“ in beiden Sprachen, „Leben“ → „HP“ (Raid-Phasenmarke), „EP“ → „XP“ (Taverne, Veredelung), „Kills“ → „besiegt“/„Sieg“ (Bestiarium, Champion-Kodex), „Pkt.“ → „Punkte“ und EN „pts“ → „points“ (Slayer-Chips, Belohnungsladen), „Quest-Marken“ → „Aufgabenmarken“, „Kopfgeld-Brett“ → „Kopfgeldtafel“, „den Reach“ → „das Reach“. Komposita zusammen (Kampfrolle, Turmetagen, Kampfbereich, Ereignisprotokoll, Galerie-Labels der Begleiter).
2. **Lager-Trennung (Chef 24.10.):** „Lager“ meint nur noch die Materialseite. New Haven heißt New Haven (`prestige.goes.world`, `offline.camp.buildsTitle`, `newhaven.view.ariaLabel`); „das Lager an der Furt“ bleibt als Erzählsatz in `newhaven.subtitle`.
3. **Wächter-Stimme v2:** Keine Feder und keine Chronik als Handelnde. `prestige.awakening.text` sprach von der Feder, die den Spieler kennt, und der Chronik, die eine Seite aufschlägt; jetzt tut es der Wächter selbst. Semikolons in Wächter- und Chronik-Zeilen werden Punkte (`prestige.greeting`, `raid.invite`, `raid.room.4.desc`, vier Modifikator-Zeilen). Brennas Sprechblasen am Slayer-Brett (`slayer.speech.*`) klingen jetzt nach Brenna statt nach einem Questgeber-Automaten.
4. **Zustand und Handlung, ohne Floskeln:** „Bitte wähle neu“ → „Wähle neu“, „Oh nein, du bist gestorben gegen“ → „{monster} hat dich besiegt“, Ausrufezeichen aus Hinweisen (`offline.died.body`, `paragon.preview.chest`), „…“ als ein Zeichen (Post-Suche, Versand).
5. **Begriffe getrennt:** „Unikat“ bleibt dem Chase-Drop vorbehalten; die Instanz mit Suffix oder Runen heißt in Post und Aufträgen „Einzelstück“ (EN „individual piece“). „Fertigkeitswirkung“ für den Beruf-Effekt der Begleiter (Glossar § 10) in den Echo-Zeilen.
6. **Typografie:** „{pct} %“ mit Leerzeichen (Fangchance), „{sec} s“ (Begleiter-Intervall), Zeitlabel „{min} min“ statt „Min.“ (Ländereien).

## Sachbefunde (Text gegen Engine, Content und Renderer geprüft)

| # | Schlüssel | Befund | Maßnahme |
|---|---|---|---|
| 1 | `raid.rec.mythic` (DE) | „Heroisch empfohlen“. Mythisch öffnet erst nach einem Abschluss auf Heroisch (`raid.ts` `raidDifficultyUnlocked`, `clears.heroic > 0`); EN sagte es richtig („Heroic cleared first“). | DE korrigiert: „Heroisch zuerst abgeschlossen“. |
| 2 | `newhaven.boost.farmingSpeed` | „schnelleres Wachsen und Sammeln“ / „faster growing and foraging“. Der Saatgarten-Bonus `farmingSpeed` wird nur in `farming.ts` gelesen und beschleunigt die Beete; Sammeln bleibt unberührt. | Beide Sprachen auf die Beete beschränkt. Hinweis an content-dev: Beschreibung des Saatgartens (`campBuildings`) gegenprüfen. |
| 3 | `estates.farm.blocked` | EN „{n} harvest stuck“ war unklar (P2-Frage 5). `readyYield` parkt Ernte, die nicht ins Inventar oder die Bank passt (`farming.ts`). | „{n} harvest waiting for space“ / „{n} Ernte wartet auf Platz“. |
| 4 | `orders.lead` | Chef-Regel 1.4 „Aufträge zählen nur Ware aus dem Skill des Auftrags“ (`orders.ts` `producedFor`, SAVE 95) fehlte im Einleitungstext. Das Schloss schützt auch bei Abgabe (`takeFromStock`, `deliverableInstances`); `orders.deliverInstances.body` „Gesperrte Teile bleiben“ stimmt. | Regel ergänzt: „mit der Fertigkeit des Auftrags“. |
| 5 | `hunting.book.neverCaught` | „Erstfang zählt doppelt“ ließ offen, was doppelt zählt. `HUNT_FIRST_CATCH_MULT` wirkt nur auf die XP des Fangs (`hunting.ts`). | „Erstfang bringt doppelte XP“. |
| 6 | `mail.transfer.uniqueItem` | „Unique item · Unikat“ meinte die Item-Instanz (Suffix/Runen), nicht das Unikat des Champions (`combat.elite.uniqueLabel`, `bestiary.champion.uniques`). | „Einzelstück“ / „Individual piece“, auch in `orders.deliverInstances.*` (EN). |
| 7 | `prestige.awakening.text` | „die Feder kennt dich schon“, „die Chronik schlägt eine neue Seite auf“: Feder und Chronik als Handelnde (v2-Verbot). | Der Wächter spricht selbst: „Ich habe eine neue Seite angefangen. Deinen Namen kenne ich schon.“ |
| 8 | `raid.deathRule.mythic`, `raid.abandon.confirmBodyMythic`, `raid.over.*` | Geprüft: der Renderer setzt in der Todesregel `{pct}` = 100 − 25 = 75 (Verlust) und im Aufgeben-Dialog 25 (Rückgabe). `abandonRaid` erstattet auf Mythisch in Rast und Kampf 25 % (`mythicRefundPct` 0,25). Normal gratis, Heroisch gegen `heroicRestartCost`, Rast 3 s (`RAID_REST_AUTO_MS`), Wochentruhe je Boss und Schwierigkeit, Verlassen zählt wie Tod. | Stimmen, unverändert. |
| 9 | `raid.mod.*.desc` | Gegen `raid.ts`/`combat.ts`: Zahltag Gebühr ×0,8 und Gegner-HP ×1,1; Geliehenes Feuer Brand ×1,1 auch für den Spieler; Giftküche Giftdauer ×1,5; Blutfest Blutung ×1,5 beidseitig; Offenes Zeughaus Rüstung ×1,25 und Rüstungsbruch ×2; Bestienhunger Boss heilt je Treffer. Die Bildsätze passen. | Nur Semikolons zu Punkt bzw. Doppelpunkt. |
| 10 | `prestige.*` Fakten | 4 Fertigkeiten auf 99 und Kapitel 21 (`PRESTIGE_REQUIRED_99`, `PRESTIGE_UNLOCK_QUEST_ID`), Erbstück ab Anforderung 80, Truhe bis 50 je Stapel, Rückblick halbes Gold bis Kapitel 18, Post-Sperre bis wieder 4×99 (`prestigeFreightLocked`), Jägerkodex ab Slayer 85 (Kommentar `PRESTIGE_STATE_FIELDS`). | Stimmen, unverändert. |
| 11 | `death.reassurance`, `paragon.death.*`, `paragon.stalemate.reset` | `onPlayerDefeated`: volle Heilung, kein Gold- oder Itemverlust; Dungeon-Schlüssel verfällt (eigene Zeile `dungeon.death.reset`), Raid hat eigenen Dialog. Paragon: Tod → Etage 1, Rekord bleibt; Patt → Checkpoint bleibt (`paragon.ts`). | Stimmen; nur Ton (DE). |
| 12 | `companions.echo.*` | `pets.ts`: Echo mit 25 % der Fertigkeitswirkung, je Effektart zählt der größte Einzelwert aus Platz 1, Platz 2 und Echo. | Stimmt; Wortwahl nach Glossar. |
| 13 | `events.*.card` | Zahlen laufen über Platzhalter. Wilder Garten: Nebenwürfe mit Chance ≤ 25 % werden sicher (`tick.ts`, `WILD_GARDEN_MAX_CHANCE`), „jeden seltenen Nebenfund sicher“ passt. Wachwechsel 5 min, kein Stun, +10 Punkte; Fischschwarm 3 min, +50 %; Sparsame Hand 25 Herstellungen, höchstens 6 min. | Stimmen, unverändert. |
| 14 | `slayer.freeSkip.*`, `slayer.task.streakSkipWarning` | Trophäenwand: ein Gratis-Überspringen je Kalendertag (`campFreeSkipAvailable`); bezahltes Überspringen bricht die Serie (`skipTask`). `slayer.streak.chip` DE „Bonus beim {next}.“ ist eine Ordnungszahl („beim 5.“), der Punkt bleibt bewusst. | Stimmen; nur Anglizismus „Skip“ raus. |
| 15 | `slayer.master.title`, `slayer.task.noneHint` | Der Content führt genau eine Slayer-Meisterin (Brenna, `slayerMasters` 1). | „Slayer-Meisterin“ / „the Slayer Master“. |
| 16 | Köcher 1000 Pfeile | Kein Schlüssel der P6-Bereiche nennt den Köcherdeckel (`QUIVER_CAPACITY` 1000). | Nichts zu tun. |

## Texte mit Layout-Risiko

- **Slayer-Chips und Knöpfe:** `slayer.task.rewardPoints` „+{n} Punkte“ (+3), `slayer.shop.cost` „{n} Punkte“ (+3, Preis-Chip im Belohnungsladen), `slayer.task.skipCost` „Auftrag überspringen ({n} Punkte)“ und `slayer.task.cancelYes` „Bestätigen ({n} Punkte)“ (+3; der Überspringen-Knopf lag schon vorher über 24 Zeichen). Stilregel § 2.5 verbietet „Pkt.“; P1 hat die Toasts bereits umgestellt. Bei Enge: Zahl mit Slayer-Punkte-Symbol.
- **Ländereien-Kachel:** `estates.farm.blocked` „{n} Ernte wartet auf Platz“ (+9 Zeichen) in der Statuszeile; bitte bei 1366×768 prüfen.
- **Kürzer oder gleich lang:** Galerie-Labels der Begleiter (`pet.effect.*`), `mail.transfer.title`, `companions.source.combat`, `slayer.bountyBoard.title`, `paragon.stalemate.reset`.
- **Etwas länger in Hinweiszeilen:** `raid.rec.normal` (+6), `hunting.picker.undefeatedHint` (+6), `slayer.freeSkip.available` (+12), `companions.echo.hint` (+10, Tooltip). Alle unter 120 Zeichen.

## Offene Fragen

1. **Slayer-Meisterin:** Der generische Titel „Slayer-Meister“ wurde auf Brenna festgelegt. Kommt später ein zweiter Meister, zurück auf eine neutrale Form.
2. **`raid.weekly.title`** „Modifikator der Woche“ belassen; Glossar § 8 nennt „Wochenregel“ als Alternative (Chef-Frage offen).
3. **Gebäudestufen in New Haven:** „Stufe {n}“ belassen (Ausbaustufe, kein Fortschrittslevel; Glossar § 1 erlaubt „Ausbau {n}“). Wenn „Ausbau 2“ gewünscht ist, sind es acht kurze Labels (`newhaven.level.label`, `header.hall`, `build.inProgress`, `header.crewBusy`, `cancel.body`, `demolish.body`, `offline.camp.buildLevel`, `tavern.level.label`).
4. **Raid-Lore-Texte** (`raid.intro`, `raid.room.1/2/3/5.desc`, `raid.rest.line.*`, Set-Stufen-Namen) stehen im Chronik-Register und wurden nicht angefasst. In `raid.invite`, `raid.room.4.desc` und vier Modifikator-Zeilen sind nur Semikolons zu Punkten geworden (Stilregel § 2.2). Falls der Chef die Lore-Texte als abgenommen betrachtet, ist das rückbaubar.
5. **`npc.*`** unverändert: alle Zeilen stammen aus dem Stimmen-Paket v2; die zwei Einzelstriche in `npc.bank.greet1` und `npc.quests.greet1` hat P2 bewusst gelassen. Die Frage „Verwalterin oder Voss der Zähler“ aus dem Paket bleibt offen.
6. **EN „task“** für den Slayer-Auftrag bleibt (übernommene Empfehlung im Glossar-Kopf); `slayer.tower.intro` EN sagt entsprechend „Tower tasks“.

## Nicht angefasst

- `pet.passive.*`, `pet.ability.*`, `pet.flavor.*` (Effektzeilen und Kampflog, P3; die Flavor-Zeilen behalten ihren einen Strich und das Ausrufezeichen als Ereignismeldung).
- `newhaven.debug.*` (Entwicklerknöpfe), `paragon.noContent` (Entwicklerhinweis).
- Inhaltsdaten in `packages/content` (Gästetexte der Taverne, Gebäudebeschreibungen, `raid-text.ts`): Content-Agent.

## Begleiter (companions) (9)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `companions.source.combat` | Kampf-Drops | Kampfbeute | Combat drops | · |
| `companions.dropChance` | Drop-Chance: {pct} | Dropchance: {pct} | Drop chance: {pct} | · |
| `companions.interval` | alle {sec}s | alle {sec} s | every {sec}s | every {sec} s |
| `companions.slot2.hint` | Nur passiver Effekt | Nur passive Wirkung | Passive effect only | · |
| `companions.role.hint` | Kampf-Rolle: was dieser Begleiter im Kampf leistet. | Kampfrolle: Das macht dieser Begleiter im Kampf. | Combat role: what this companion does in a fight. | · |
| `companions.echo.active` | Wirkt gerade: mit {pct} % seiner Fertigkeit, solange er nicht ausgerüstet ist. | Wirkt gerade: {pct} % seiner Fertigkeitswirkung, solange er nicht ausgerüstet ist. | Active now: works with {pct}% of its skill while it is not equipped. | Working now: {pct}% of its skill effect while it is not equipped. |
| `companions.echo.idle` | Wirkt gerade nicht: ausgerüstete Begleiter wirken stattdessen voll. | Wirkt gerade nicht: Ausgerüstete Begleiter wirken stattdessen voll. | Not active right now: equipped companions work at full strength instead. | · |
| `companions.echo.locked` | Einmal gefunden, wirkt er als Echo mit {pct} % seiner Fertigkeit, auch wenn er nicht ausgerüstet ist. | Einmal gefunden, wirkt er als Echo mit {pct} % seiner Fertigkeitswirkung, auch wenn er nicht ausgerüstet ist. | Once found, it works as an echo with {pct}% of its skill, even when it is not equipped. | Once found, it works as an echo with {pct}% of its skill effect, even when it is not equipped. |
| `companions.echo.hint` | Jeder besessene, nicht ausgerüstete Begleiter gibt {pct} % seines Fertigkeits-Effekts, ohne Kampf-Fähigkeit. Bei gleicher Effektart zählt der stärkere, sie addieren sich nicht. | Jeder Begleiter, den du hast, aber nicht trägst, gibt {pct} % seiner Fertigkeitswirkung, ohne seine Kampffähigkeit. Gleiche Wirkungen addieren sich nicht, es zählt nur die stärkere. | Every companion you own but have not equipped gives {pct}% of its skill effect, without its combat ability. For effects of the same kind the stronger one counts, they do not add up. | Every companion you own but have not equipped gives {pct}% of its skill effect, without its combat ability. Effects of the same kind do not add up, only the stronger one counts. |

## Begleiter-Galerie (pet, nur Labels) (9)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `pet.effect.skill.flawlessGem` | Doppel-Edelstein-Chance | Doppelter Edelstein | Double gem chance | · |
| `pet.effect.skill.bonusRunes` | Bonus-Runen | Bonusrunen | Bonus runes | · |
| `pet.effect.skill.refundMaterial` | Material-Rückerstattung | Materialrückgabe | Refund material | · |
| `pet.effect.skill.potionPreserve` | Trank-Bewahrung | Trankbewahrung | Potion preserve | · |
| `pet.effect.skill.thievingFinesse` | Diebes-Finesse | Diebesfinesse | Thieving finesse | · |
| `pet.effect.skill.craftSuffixChance` | Suffix-Chance | Suffixchance | Suffix chance | · |
| `pet.effect.combat.onHitStatus` | Treffer-Status | Trefferstatus | On-hit status | · |
| `pet.effect.combat.accuracyDownEnemy` | Gegner-Genauigkeit senken | Genauigkeit senken | Enemy accuracy down | · |
| `pet.effect.combat.enemyAttackDelay` | Gegner-Angriff verzögern | Angriff verzögern | Enemy attack delay | · |

## Taverne (4)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `tavern.construction.body` | Halvard sucht noch Holz, bevor er die Türen öffnen kann. | Halvard wartet noch auf Holz, bevor er die Türen öffnen kann. | Halvard is still waiting on lumber before he can open the doors. | · |
| `tavern.card.queue` | In die Warteschlange | · | Queue It Up | Add to Queue |
| `tavern.reward.xp` | EP | XP | XP | · |
| `tavern.alert.accepted` | Du hast die Aufgabe schon angenommen, jetzt kannst du sie nicht mehr wegschicken. | Du hast die Aufgabe schon angenommen, diesen Gast kannst du jetzt nicht mehr wegschicken. | You've already taken on this task, you can't send them off now. | You have already taken on this task, you cannot send this guest away now. |

## New Haven (7)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `newhaven.view.ariaLabel` | Ansicht des Lagers | Ansicht von New Haven | New Haven view | · |
| `newhaven.move.hint` | Verschiebemodus: Wähle ein Gebäude zum Kalibrieren oder ziehe es an eine neue Position. Verschieben ist kostenlos. | Verschiebemodus: Wähle ein Gebäude, um seine Darstellung anzupassen, oder ziehe es an einen neuen Platz. Verschieben ist kostenlos. | Move mode: select a building to calibrate it, or drag it to a new position. Moving is free. | Move mode: select a building to adjust how it looks, or drag it to a new spot. Moving is free. |
| `newhaven.move.effectiveScale` | Effektiver Sprite-Maßstab: {value}× | Effektiver Maßstab: {value}× | Effective sprite scale: {value}× | Effective scale: {value}× |
| `newhaven.refine.noXp` | Kein EP-Gewinn. Die Anlage verbraucht exakte Rezeptmengen. | Keine XP. Die Anlage verbraucht genau die Rezeptmengen. | No XP gain. The facility consumes exact recipe quantities. | No XP. The works consume the exact recipe quantities. |
| `newhaven.refineReason.recipe_not_known` | Dein Können reicht für dieses Rezept noch nicht. | Dein Level reicht für dieses Rezept noch nicht. | Your skill is not high enough for that recipe. | Your level is not high enough for that recipe. |
| `newhaven.boost.farmingSpeed` | {v} schnelleres Wachsen und Sammeln | {v} schnelleres Wachstum auf den Beeten | {v} faster growing and foraging | {v} faster crop growth |
| `newhaven.boost.slayerPoints` | +{v} Slayer-Punkte | · | +{v} slayer points | +{v} Slayer points |

## Scherbenaltar und Narbenbuch (prestige) (12)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `prestige.greeting` | Unter diesem Stein liegen die Scherben aller Bildnisse, die das Reach je zerschlug. Das Reach hat seinen Sturz überstanden, weil es nichts behielt außer dem, was es gelernt hatte. Leg hier nieder, was du bist, und ich trage ein, was du warst; den Rest bekommt die Asche. | Unter diesem Stein liegen die Scherben aller Bildnisse, die das Reach je zerschlug. Das Reach hat seinen Sturz überstanden, weil es nichts behielt außer dem, was es gelernt hatte. Leg hier nieder, was du bist, und ich trage ein, was du warst. Den Rest bekommt die Asche. | Beneath this stone lie the shards of every image the Reach ever broke. The Reach outlived its fall because it kept nothing but what it had learned. Lay down here what you are, and I will record what you were; the ash gets the rest. | Beneath this stone lie the shards of every image the Reach ever broke. The Reach outlived its fall because it kept nothing but what it had learned. Lay down here what you are, and I will record what you were. The ash gets the rest. |
| `prestige.awakening.text` | Du bist durch die Asche gegangen, und die Asche hat dich nicht behalten. Was sie dir ließ, trägst du als Narben. Die Chronik schlägt eine neue Seite auf; die Feder kennt dich schon. | Du bist durch die Asche gegangen, und die Asche hat dich nicht behalten. Was sie dir ließ, trägst du als Narben. Ich habe eine neue Seite angefangen. Deinen Namen kenne ich schon. | You went through the ash, and the ash did not keep you. What it left you, you wear as scars. The Chronicle opens a new page; the pen already knows you. | You went through the ash, and the ash did not keep you. What it left you, you wear as scars. I have started a new page. Your name I already know. |
| `prestige.preview.totalLevel` | Gesamtstufe {n} | Gesamtlevel {n} | Total level {n} | · |
| `prestige.goes.levels` | Alle Fertigkeitsstufen (Gesamtstufe {n}) | Alle Fertigkeitslevel (Gesamtlevel {n}) | All skill levels (total level {n}) | · |
| `prestige.goes.tokens` | {n} Quest-Marken | {n} Aufgabenmarken | {n} quest tokens | · |
| `prestige.goes.gear` | {eq} getragene Teile und {kinds} Arten von Gegenständen | {eq} getragene Teile und {kinds} Item-Arten | {eq} worn pieces and {kinds} kinds of items | · |
| `prestige.goes.world` | Lager, Farm, Fallen, Paragon-Fortschritt und geräumte Dungeons | New Haven, Beete, Fallen, Paragon-Fortschritt und geräumte Dungeons | Camp, farm, traps, Paragon progress and cleared dungeons | New Haven, plots, traps, Paragon progress and cleared dungeons |
| `prestige.points.totalLevel` | Gesamtstufe {n} | Gesamtlevel {n} | Total level {n} | · |
| `prestige.bilanz.tile.totalLevel` | Gesamtstufe | Gesamtlevel | Total level | · |
| `prestige.history.row` | Nr. {n}: +{points} Narben, Gesamtstufe {level}, {skills} Fertigkeiten auf 99, {time} gespielt | Nr. {n}: +{points} Narben, Gesamtlevel {level}, {skills} Fertigkeiten auf 99, {time} gespielt | No. {n}: +{points} scars, total level {level}, {skills} skills at 99, {time} played | · |
| `prestige.reason.heirloom_invalid` | Ein gewähltes Erbstück ist nicht mehr verfügbar. Bitte wähle neu. | Ein gewähltes Erbstück ist nicht mehr verfügbar. Wähle neu. | A chosen heirloom is no longer available. Please choose again. | A chosen heirloom is no longer available. Choose again. |
| `prestige.reason.stash_invalid` | Ein gewählter Stapel ist nicht mehr verfügbar. Bitte wähle neu. | Ein gewählter Stapel ist nicht mehr verfügbar. Wähle neu. | A chosen stack is no longer available. Please choose again. | A chosen stack is no longer available. Choose again. |

## Raid (11)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `raid.rec.normal` | Kampfstufe 99 · Götzenhallen-Ausrüstung mit vollen Runen und Tränken | Kampflevel 99 · Sanktum-Ausrüstung mit vollen Runen und Tränken | Combat level 99 · Idol Sanctum gear with full runes and potions | Combat level 99 · Sanctum gear with full runes and potions |
| `raid.rec.mythic` | Volles Raid-Set (5/5) und Raid-Waffe, Heroisch empfohlen | Volles Raid-Set (5/5) und Raid-Waffe, Heroisch zuerst abgeschlossen | Full raid set (5/5) and a raid weapon, Heroic cleared first | · |
| `raid.hud.phaseMark` | Phasenwechsel bei {pct} % Leben | Phasenwechsel bei {pct} % HP | Phase change at {pct}% health | · |
| `raid.rest.paused` | Pausiert, solange deine eigene Aktion läuft. | Pausiert, solange deine eigene Aktion oder dein eigener Kampf läuft. | Paused while your own action is running. | Paused while your own action or fight is running. |
| `raid.complete.fee` | Gebühr | Gezahlte Gebühr | Fee paid | · |
| `raid.mod.borrowed_fire.desc` | Das Heiligtum hat diese Woche weit ausgeliehen; jede Klinge brennt, auch deine. | Das Heiligtum hat diese Woche weit ausgeliehen. Jede Klinge brennt, auch deine. | The shrine has lent widely this week; every blade burns, yours included. | The shrine has lent widely this week. Every blade burns, yours included. |
| `raid.mod.beast_hunger.desc` | Die Gruben wurden nicht gefüttert; was dich trifft, frisst mit. | Die Gruben wurden nicht gefüttert. Was dich trifft, frisst mit. | The pits have not been fed; whatever hits you feeds on it. | The pits have not been fed. Whatever hits you feeds on it. |
| `raid.mod.open_armory.desc` | Krogg gibt die Mark-Platte an jeden aus; Eisen auf allen, und jeder Spalt darin zählt doppelt. | Krogg gibt die Mark-Platte an jeden aus: Eisen auf allen, und jeder Spalt darin zählt doppelt. | Krogg issues march-plate to everyone; iron on all of them, and every gap in it counts double. | Krogg issues march-plate to everyone: iron on all of them, and every gap in it counts double. |
| `raid.mod.blood_feast.desc` | Die Kronwache erneuert den Schwur; die Wunden dieser Woche schließen sich langsam, auf beiden Seiten. | Die Kronwache erneuert den Schwur. Die Wunden dieser Woche schließen sich langsam, auf beiden Seiten. | The Crownguard renews the oath; this week's wounds close slowly, on both sides. | The Crownguard renews the oath. This week's wounds close slowly, on both sides. |
| `raid.invite` | Drazhan wich, und das Feuer in der Mark erlosch nicht; es wurde heller. Unter dem, was er zurückließ, lag die Gläubigerhälfte eines Kerbholzes, und darauf ein Name, den Mux mir erst beim dritten Fragen bestätigte: Gobkha'raz, die Hauptstadt der Goblins, in der die Schuld für das geliehene Feuer geführt wird. Ihr Kriegskönig hält den Gläubiger für fort und sich selbst für dessen Erben, und er baut aus dem Nachlass der Mark das Heer, von dem der Häuptling nur träumte. Ich habe einmal geschrieben, dass die Mark kein zweites Mal aufgegeben wird. Es ist Zeit, das zu belegen. | Drazhan wich, und das Feuer in der Mark erlosch nicht. Es wurde heller. Unter dem, was er zurückließ, lag die Gläubigerhälfte eines Kerbholzes, und darauf ein Name, den Mux mir erst beim dritten Fragen bestätigte: Gobkha'raz, die Hauptstadt der Goblins, in der die Schuld für das geliehene Feuer geführt wird. Ihr Kriegskönig hält den Gläubiger für fort und sich selbst für dessen Erben, und er baut aus dem Nachlass der Mark das Heer, von dem der Häuptling nur träumte. Ich habe einmal geschrieben, dass die Mark kein zweites Mal aufgegeben wird. Es ist Zeit, das zu belegen. | Drazhan withdrew, and the fire in the march did not go out; it grew brighter. Among what he left behind lay the creditor's half of a tally stick, and on it a name Mux confirmed only the third time I asked: Gobkha'raz, the capital of the goblins, where the debt for the borrowed fire is kept. Its War-King holds the Creditor gone and himself the Creditor's heir, and out of the estate of the march he is building the army the Warchief only dreamed of. I once wrote that the march would not be abandoned a second time. It is time to prove it. | Drazhan withdrew, and the fire in the march did not go out. It grew brighter. Among what he left behind lay the creditor's half of a tally stick, and on it a name Mux confirmed only the third time I asked: Gobkha'raz, the capital of the goblins, where the debt for the borrowed fire is kept. Its War-King holds the Creditor gone and himself the Creditor's heir, and out of the estate of the march he is building the army the Warchief only dreamed of. I once wrote that the march would not be abandoned a second time. It is time to prove it. |
| `raid.room.4.desc` | Die Torkapelle der Mark, einst Vhel geweiht, der Torhüterin; wo ihr Bildnis stand, brennt jetzt in einem Becken aus Götzeneisen das geliehene Feuer. Es ist bleich, wirft keinen Rauch, und die Schatten im Raum bewegen sich nicht mit ihm; an den schwarzen Wänden sind die Namen der Sippen eingebrannt, Zeile um Zeile, wie Posten. | Die Torkapelle der Mark, einst Vhel geweiht, der Torhüterin. Wo ihr Bildnis stand, brennt jetzt in einem Becken aus Götzeneisen das geliehene Feuer. Es ist bleich, wirft keinen Rauch, und die Schatten im Raum bewegen sich nicht mit ihm. An den schwarzen Wänden sind die Namen der Sippen eingebrannt, Zeile um Zeile, wie Posten. | The gate chapel of the march, once consecrated to Vhel the Gatekeeper; where her image stood, the borrowed fire now burns in a basin of god-iron. It is pale, gives no smoke, and the shadows in the room do not move with it; on the black walls the names of the clans are burned in, line by line, like entries. | The gate chapel of the march, once consecrated to Vhel the Gatekeeper. Where her image stood, the borrowed fire now burns in a basin of god-iron. It is pale, gives no smoke, and the shadows in the room do not move with it. On the black walls the names of the clans are burned in, line by line, like entries. |

## Arbeitsaufträge (4)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `orders.lead` | Kunden kommen, während du arbeitest. Es zählt nur, was du nach der Annahme herstellst oder sammelst. Kein Zeitlimit, höchstens drei zugleich. | Kunden kommen, während du arbeitest. Es zählt nur, was du nach der Annahme mit der Fertigkeit des Auftrags herstellst oder sammelst. Kein Zeitlimit, höchstens drei zugleich. | Customers turn up while you work. Only what you make or gather after accepting counts. No time limit, up to three at once. | Customers turn up while you work. Only what you make or gather with the order's skill after accepting counts. No time limit, up to three at once. |
| `orders.crate` | dazu eine {item} | dazu eine {item} als Dank | a {item} as thanks | · |
| `orders.deliverInstances.title` | Einzelstücke abgeben? | · | Hand over unique pieces? | Hand over individual pieces? |
| `orders.deliverInstances.body` | Es fehlen gewöhnliche Stücke. {n} Einzelstücke (mit Suffix oder Runen) gehen mit, die schwächsten zuerst. Gesperrte Teile bleiben. | Es gibt nicht genug einfache Stücke. {n} Einzelstücke (mit Suffix oder Runen) gehen mit, die schwächsten zuerst. Gesperrte Teile bleiben. | There are not enough plain pieces. {n} unique pieces (with suffix or runes) go with the order, weakest first. Locked pieces stay. | There are not enough plain pieces. {n} individual pieces (with suffix or runes) go with the order, weakest first. Locked pieces stay. |

## Ereignisse (1)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `events.log.title` | Ereignis-Logbuch | Ereignisprotokoll | Event log | · |

## Ländereien (3)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `estates.farm.next` | {min} Min. | {min} min | {min} min | · |
| `estates.hunt.next` | {min} Min. | {min} min | {min} min | · |
| `estates.farm.blocked` | {n} Ernte wartet | {n} Ernte wartet auf Platz | {n} harvest stuck | {n} harvest waiting for space |

## Jagen (7)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `hunting.catchChance` | Fangchance {pct}% | Fangchance {pct} % | Catch chance {pct}% | · |
| `hunting.picker.undefeatedHint` | Noch nicht besiegt: erst nach dem ersten Sieg fangbar | Noch nicht besiegt: erst nach dem ersten Sieg hier fangbar. | Not defeated yet: trappable after your first kill here. | · |
| `hunting.picker.family.dragonkin` | Drache | Drachenwesen | Dragon | Dragonkin |
| `hunting.book.neverCaught` | Noch nie gefangen · Erstfang zählt doppelt | Noch nie gefangen · Erstfang bringt doppelte XP | Never caught yet · First catch counts double | Never caught yet · First catch gives double XP |
| `hunting.zone.bait` | Köder: {bait} · {n} im Vorrat | Köder: {bait} · {n} vorrätig | Bait: {bait} · {n} in stock | · |
| `hunting.zone.baitValue` | {bait} · {n} im Vorrat | {bait} · {n} vorrätig | {bait} · {n} in stock | · |
| `hunting.picker.baitValue` | 1 je Falle · Vorrat {n} | 1 je Falle · {n} vorrätig | 1 per trap · {n} in stock | · |

## Slayer (18)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `slayer.master.title` | Slayer-Meister | Slayer-Meisterin | Slayer Master | · |
| `slayer.speech.noTask` | Sprich mit mir, {name}, um einen Auftrag zu erhalten. | Willst du Arbeit, {name}? Dann rede mit mir. | Speak with me to receive a task, {name}. | Want work, {name}? Talk to me. |
| `slayer.speech.taskActive` | Dein Ziel wartet, {name}. Weiter. | Dein Ziel läuft noch herum, {name}. Beweg dich. | Your target awaits, {name}. Push on. | Your mark is still out there, {name}. Get moving. |
| `slayer.speech.taskDone` | Gut gemacht, {name}. Komm wieder. | Saubere Arbeit, {name}. Davon gibt es noch mehr. | Well done, {name}. Come back for more. | Clean work, {name}. There is more where that came from. |
| `slayer.task.noneHint` | Sprich mit einem Slayer-Meister für einen neuen Auftrag. | Sprich mit der Slayer-Meisterin für deinen nächsten Auftrag. | Speak with a Slayer Master to receive your next task. | Speak with the Slayer Master to receive your next task. |
| `slayer.task.rewardPoints` | +{n} Pkt. | +{n} Punkte | +{n} pts | +{n} points |
| `slayer.task.skipCost` | Auftrag überspringen ({n} Pkt.) | Auftrag überspringen ({n} Punkte) | Skip Task ({n} pts) | Skip Task ({n} points) |
| `slayer.task.cancelConfirm` | Diesen Auftrag für {n} Punkte abbrechen? Es wird kein neuer Auftrag vergeben. | Diesen Auftrag für {n} Slayer-Punkte abbrechen? Es wird kein neuer Auftrag vergeben. | Cancel this task for {n} Slayer Points? No new task will be assigned. | · |
| `slayer.task.cancelYes` | Bestätigen ({n} Pkt.) | Bestätigen ({n} Punkte) | Confirm ({n} pts) | Confirm ({n} points) |
| `slayer.shop.cost` | {n} Pkt. | {n} Punkte | {n} pts | {n} points |
| `slayer.master.locked` | Benötigt Slayer-Level {n} | · | Requires Slayer Level {n} | Requires Slayer level {n} |
| `slayer.shop.reason.level_locked` | Benötigt Slayer-Level {n} | Benötigt Slayer-Level {n}. | Requires Slayer Level {n} | Requires Slayer level {n}. |
| `slayer.tower.intro` | Fünf Etagen mit steigender Schwierigkeit, je nach Slayer-Level freigeschaltet. Tower-Aufgaben gewähren einzigartige Drops. | Fünf Etagen, jede gefährlicher als die davor, und jede öffnet sich erst ab einem bestimmten Slayer-Level. Aufträge im Turm bringen Beute, die es nirgends sonst gibt. | Five floors of escalating danger, each gated by Slayer level. Tower tasks grant unique drops. | Five floors, each more dangerous than the last, and each opens only at a certain Slayer level. Tower tasks drop loot found nowhere else. |
| `slayer.bountyBoard.title` | Kopfgeld-Brett | Kopfgeldtafel | Bounty Board | · |
| `slayer.tower.combatHint` | Turm-Etagen findest du im Kampf-Bereich. | Die Turmetagen betrittst du im Kampfbereich. | Tower floors are accessible in the Combat area. | Tower floors are entered from the Combat area. |
| `slayer.shop.empty` | Keine Belohnungs-Items verfügbar. | Keine Belohnungen verfügbar. | No reward items available. | No rewards available. |
| `slayer.freeSkip.available` | Heute ist noch ein Gratis-Skip frei, dank der Trophäenwand. | Heute kannst du noch einmal gratis überspringen, dank der Trophäenwand. | One free skip left today, courtesy of the Trophy Wall. | · |
| `slayer.freeSkip.used` | Der Gratis-Skip für heute ist verbraucht. | Das Gratis-Überspringen für heute ist verbraucht. | Today's free skip is used up. | · |

## Post (8)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `mail.transfer.title` | Itemsendung vorbereiten | Sendung vorbereiten | Prepare Item Shipment | · |
| `mail.transfer.search` | Inventar durchsuchen ... | Inventar durchsuchen… | Search inventory... | Search inventory… |
| `mail.transfer.sending` | Wird versandt ... | Wird versandt… | Sending... | Sending… |
| `mail.transfer.uniqueItem` | Unikat · Verzauberungen bleiben erhalten | Einzelstück · Verzauberungen bleiben erhalten | Unique item · enchantments retained | Individual piece · enchantments kept |
| `mail.transfer.targetOption` | {name} · Gesamtstufe {level} | {name} · Gesamtlevel {level} | {name} · Total Level {level} | {name} · Total level {level} |
| `mail.transfer.confirmKicker` | Verbindlicher Transfer | Verbindliche Sendung | Binding transfer | · |
| `mail.transfer.error.not_transferable` | Schlüssel, Meisterringe und Quest-Items lassen sich nicht an einen anderen Spielstand senden. | Schlüssel, Meisterringe und Aufgabengegenstände lassen sich nicht an einen anderen Spielstand senden. | Keys, master rings and quest items cannot be sent to another save. | · |
| `mail.transfer.error.invalid_source` | Das Quellinventar hat sich geändert. Bitte prüfe das Paket erneut. | Das Quellinventar hat sich geändert. Prüfe das Paket noch einmal. | The source inventory changed. Please review the parcel. | The source inventory changed. Review the parcel. |

## Offline-Bericht (4)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `offline.lvlShort` | Lvl | Lv | Lvl | Lv |
| `offline.items` | Erbeutete Items | Erhaltene Items | Items gained | · |
| `offline.died.body` | Du wurdest während deiner Abwesenheit von {monster} besiegt! Dein Kampf wurde abgebrochen. | {monster} hat dich in deiner Abwesenheit besiegt. Der Kampf endete damit. | You were slain by {monster} while you were away! Your fight was interrupted. | {monster} got you while you were away. The fight ended there. |
| `offline.camp.buildsTitle` | Dein Lager hat gebaut | New Haven hat gebaut | Your camp has built | New Haven has built |

## Tod (2)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `death.body` | Oh nein, du bist gestorben gegen: {monster} | {monster} hat dich besiegt. | Oh no, you died against: {monster} | {monster} brought you down. |
| `death.reassurance` | Kein Verlust: Du behältst alles. Iss dich stark und versuch es erneut. | Kein Verlust: Du behältst alles. Iss gut und versuch es noch einmal. | No loss: you keep everything you have. Eat well and try again. | · |

## Paragonturm (5)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `paragon.autoAscend.hint` | Klettert nach jedem Sieg weiter, bis der Tod eintritt oder du selbst aufhörst. | Klettert nach jedem Sieg weiter, bis du fällst oder selbst aufhörst. | Climbs onward after every victory, until you die or stop it yourself. | · |
| `paragon.preview.chest` | Meilenstein-Truhe bei dieser Etage! | Meilenstein-Truhe auf dieser Etage. | Milestone chest on this floor! | Milestone chest on this floor. |
| `paragon.floorBadge` | Paragonetage {n} | Paragon-Etage {n} | Paragon Floor {n} | · |
| `paragon.statsLabel` | Höchste Paragonetage | Höchste Paragon-Etage | Highest Paragon Floor | · |
| `paragon.stalemate.reset` | Dein Checkpoint bleibt erhalten. Keine Etage verloren. | Dein Fortschritt bleibt. Keine Etage verloren. | Your checkpoint holds. No floor lost. | · |

## Bestiarium (7)

| Schlüssel | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `bestiary.journeyTitle` | Reise durch den Reach | Reise durch das Reach | Journey Through the Reach | · |
| `bestiary.itemsProgress` | Entdeckt: {n}/{total} Items | · | Discovered: {n}/{total} Items | Discovered: {n}/{total} items |
| `bestiary.monstersProgress` | Bezwungen: {n}/{total} Monster | · | Defeated: {n}/{total} Monsters | Defeated: {n}/{total} monsters |
| `bestiary.killLadder.title` | {cur} / {n} Kills | {cur} / {n} besiegt | {cur} / {n} kills | · |
| `bestiary.level` | Stufe {n} | Lv {n} | Lv {n} | · |
| `bestiary.champion.kills` | Kills | Besiegt | Kills | · |
| `bestiary.champion.fastest` | Schnellster Kill | Schnellster Sieg | Fastest Kill | · |
