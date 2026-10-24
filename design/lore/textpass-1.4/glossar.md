# Textpass 1.4 „Feder und Stahl“ · Glossar der Kernbegriffe

**Status:** Entwurf zur Chef-Abnahme (Lore-Dev, 2026-10-24). Nichts hiervon ist umgesetzt; kein Code, kein Content, keine i18n-Datei wurde angefasst.
**Zweck:** Ein verbindliches Wort je Begriff und Sprache, bevor jemand ~51.000 Texte anfasst. Jede Zeile nennt den Ist-Zustand mit ungefährer Fundstellenzahl, einen Vorschlag für EN/DE und die heute schon verwendeten Wörter der fünf übrigen Sprachen. Wo eine Sprache heute mehrere Wörter für dieselbe Sache benutzt, steht **uneinheitlich**.
**Quellen (gelesen, nicht verändert):** `apps/client/src/renderer/i18n/translations.ts` (EN/DE, 2.721 Schlüssel) · `apps/client/src/renderer/i18n/locales/{es,fr,ptBR,ru,zh}.ts` · `packages/content/src/index.ts` (4.581 lokalisierbare Felder EN/DE) · `packages/content/src/locales/*.ts` · `packages/content/src/raid-text.ts` · `packages/shared/src/index.ts` (`RARITY_LABEL`) · `design/i18n-glossary.md` (Aug 2026) · `design/lore/weltlore-grim-reach.md` § 9.
**Zählweise:** „UI 59 / Content 133“ = Zahl der UI-Schlüssel bzw. Content-Felder, in deren deutschem Text das Wort vorkommt. Die Zahlen sind gerundet brauchbar, nicht buchhalterisch.

**Rangfolge bei Widersprüchen:** Chef-Entscheid → Kanon-Namen der Lore-Bibel (§ 9, Zonen/Dungeons/Figuren/Items) → dieses Glossar → `design/i18n-glossary.md` (teilweise veraltet, siehe § 14). Eigennamen aus der Bibel werden hier nicht wiederholt.

---

<!-- claude:2026-10-24T18:38:00+02:00 -->
## Chef-Entscheide 24.10.2026 (bindend, gehen allen Empfehlungen unten vor)

| Frage | Entscheid |
|---|---|
| Level im Deutschen | **„Level“** (Abkürzung „Lv“ erlaubt, wo Platz knapp ist). „Stufe“ bleibt frei für Abstufungen (Köder, Fasern, Auto-Essen, Runen-Stufen); keine Umbenennung in Klasse/Ausbau/Rang nötig. Meisterschaft behält „Rang“, wo es schon so heißt. |
| Slayer | **„Slayer“ als Eigenname in allen 7 Sprachen** (Skill, Turm, Sets, Aufträge). DE-Skillanzeige „Monsterjäger“ → „Slayer“. ES/FR/PT-BR nie „Jäger/cazador/chasseur/caçador“ für Slayer (Kollision mit Jagen). |
| Ward | **„Ward“ bleibt** (DE und alle Sprachen, wo es heute einheitlich ist). „Schutzschild/Schild“ als Synonym für Ward entfällt. |
| Raid | **„Raid“ bleibt** (kein „Schlachtzug“). |
| Schrift Fließtext | Alegreya (eingebaut, Welle 1). |
| Lager | Die neue Materialseite bleibt **„Lager“**. Bank heißt nur „Bank“, New Haven nur „New Haven“; „Lager“ steht nirgends sonst für diese beiden. |
| Gamer-Wörter | **Gängige dulden:** HP, XP, Buff, Slot, Drop, Kit, Level, Raid, Ward bleiben. Entwicklerwörter werden deutsch: Mitigation → Schadensminderung, Armor Pen → Rüstungsbruch, Boost/int → ausgeschrieben (z. B. Intelligenz). |
| Items ohne Beschreibung (974) | **Neu schreiben** (Paket P4b), kurz, nach Stilregeln, mit Faktencheck gegen die Daten, 7 Sprachen. |

Übernommene Empfehlungen (Chef kann widersprechen): RU/FR durchgehend ты/tu; DE-Aufgaben-Familie Aufgabe / Tagesaufgabe /
Slayer-Auftrag / Arbeitsauftrag / Kopfgeld / Kapitel, EN behält „Slayer task“; Chronik-Lore als geschriebenes Buch einen Halbton
förmlicher; Mechanik im Flavor als Doppelpunkt-Form im Text (kein neues Datenfeld); DE „12 %“ mit schmalem Leerzeichen, wie
bisher. Keine neue Erfolgsleiter-Benennung („Meisterweihe“ entfällt).

**Faktenpflicht:** Jede umgeschriebene Beschreibung wird gegen die Daten geprüft (Rezept, Quelle, Werte). Probe 1.1 „Balken“
war sachlich falsch (Balken werden gezimmert, sie fallen nicht nebenbei ab) und zeigt, warum.

## § 1 Fortschritt: Level, Stufe, Rang, Klasse

Das ist die auffälligste Baustelle. Im deutschen Spiel stehen drei Wörter für dieselbe Zahl nebeneinander, und „Stufe“ ist zusätzlich für Materialleitern, Köder, Fasern, Auto-Essen-Ausbau und das (seit heute ausgeblendete) Item-Stufensystem belegt.

| Begriff | Ist DE (Fundstellen) | Ist EN | Vorschlag EN | Vorschlag DE |
|---|---|---|---|---|
| **Level** (Fertigkeits-, Kampf-, Gesamt-, Monsterstufe) | „Stufe“ UI 59 / Content 133 · „Level“ UI 32 / Content 8 (z. B. `q_woodcutter_1` „Holzfällen-Level 5“, `skill.requiresLevel`, `slayer.master.locked` „Slayer-Level“) · „Lv“ UI 7 (`sidebar.combatLevel` „Kampf Lv“, `sidebar.totalLevel` „Ges. Lv“, `skill.level` „Lv {n}“, `combat.dungeonCreatureLevels`) | „Level“ 18 · „Lv“ 18 · „Lvl“ 2 (`combat.hud.level`, `offline.lvlShort`) | **level** (Fließtext, Labels); **Lv** nur als Kurzform in engen Zahlenfeldern; „Lvl“ fällt weg | **Stufe**, immer ausgeschrieben. Keine deutsche Abkürzung. Zusammensetzungen: **Kampfstufe**, **Gesamtstufe**, **Monsterstufe**. Muster im Satz: „Stufe 5 in Holzfällen“; im Label: „Holzfällen · Stufe 5“ |
| **Tier** (Materialleitern Kupfer→Bronze…, Köderstufen, Faserstufen) | „Stufe“ (`updateNotice.point1` „Köder-Stufen“, `.point5` „Faser-Stufen“, `pet.passive.tierUp` „eine Stufe höher“) | „tier“, „grade“ | **grade** (pet.tierUp bereits „one grade higher“), **tier** nur für Auto-Essen | **Klasse** (Materialklasse, Köderklasse, Faserklasse: „ein Ergebnis fällt eine Klasse besser aus“) |
| **Item-Tier** (`item.tier` „Stufe {n}“, `char.sortTier` „Stufe“; seit 24.10. ausgeblendet) | „Stufe“ | „Tier“ | tier | **Klasse** (falls je wieder sichtbar), nie „Stufe“ |
| **Auto-Essen-Stufen** (`combat.autoEatMax` „Max-Stufe“, `combat.autoEatUpgradeHint` „Höhere Stufen essen…“) | „Stufe“ | „tier“ | tier | **Ausbau** („Auto-Essen: Ausbau III“, „voll ausgebaut“) |
| **Gebäudestufe** New Haven (`newhaven.reason.townhall_required` „auf Stufe {level}“) | „Stufe“ | „level“ | level | **Ausbaustufe** oder „Ausbau {level}“ (einzige erlaubte Zusammensetzung mit „-stufe“ außerhalb von Fortschritt) |
| **Rank** (Meisterschaft Bronze…Diamant, Talentränge) | „Rang“ UI 5 (`talent.rank`, `mastery.nextRank`) | „rank“ | rank | **Rang** (bleibt exklusiv für Meisterschaft und Talente) |
| **Mastery level** (`ach_mastery_1` „Meisterschaftsstufe 99“) | „Meisterschaftsstufe“ | „mastery level“ | mastery level | **Meisterschaftsstufe** (ist ein echtes Level, darum „Stufe“ korrekt) |

Andere Sprachen (Level): ES *nivel* (259, Kurzform „Nvl“ 14) · FR *niveau* (288, Kurzform „Niv“ 12) · PT-BR *nível* (268, „Nv“ 13) · RU *уровень* (204, „ур.“ 16) · ZH *等级/级* (331). Alle fünf sind in sich einheitlich und behalten je eine Kurzform. Nur ZH hat sechs Texte mit lateinischem „Lv“ (z. B. `combat.dungeonLevelWarn`), die auf 级 umgestellt werden.
Andere Sprachen (Tier): ES *rango* · FR *rang* · PT-BR *nível* (kollidiert mit Level!) · RU *ступень* · ZH *阶级*. PT-BR braucht ein eigenes Wort (Vorschlag *classe*).

---

## § 2 Fertigkeiten und Meisterschaft

| Begriff | Ist DE | Ist EN | Vorschlag EN | Vorschlag DE | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|---|---|---|---|
| **Skill** | „Fertigkeit“ UI 39 / Content 6 · „Skill“ UI 19 (`combat.dock.skills` „Skills“, `mastery.poolHint` „eines Skills“, `statdesc.*` „Wucht-Skill“, `onboarding.guide.topbar.skillsOverview.body` „deine Skills“) · „Beruf“ 2 (`updateNotice.point1`, `creation.group.profession`) · „Kunst“ in Skillnamen (Juwelierskunst, Runenkunst, Diebeskunst) und in Wächter-Rede („vier Künste gemeistert“) | skill (20) | **skill** | **Fertigkeit**. „Kunst“ nur innerhalb bestehender Skillnamen und in der Wächter-Stimme. „Beruf“ und „Skill“ fallen weg | *habilidad* (einheitlich; *destreza* bleibt dem Attribut Geschick vorbehalten) | *compétence* (einheitlich; *métier* nur in den alten Update-Hinweisen) | *perícia* 32 · *habilidade* 30 (**uneinheitlich**: `nav.section.skills` „Perícias“, `sidebar.expandCombatSkills` „habilidades de combate“) | *навык* (einheitlich; *ремесло/профессия* nur in den alten Update-Hinweisen) | *技能* |
| **Combat skill** | „Kampf-Fertigkeit“, „Kampffertigkeiten“, „Kampf-Skills“ | combat skill | combat skill | **Kampffertigkeit** (ein Wort, kein Bindestrich) | *habilidad de combate* | *compétence de combat* | *habilidade de combate* | *боевой навык* | *战斗技能* |
| **Mastery** | „Meisterschaft“ UI 26 / Content 7 · „Mastery“ 1 (`mastery.ceremony.stat.masteryPool` „Mastery-Pool“) | mastery (22) | mastery | **Meisterschaft** | *maestría* | *maîtrise* | *maestria* | *мастерство* | *精通* 34 · *熟练* 4 (`mastery.toast.levelUp` u. a., → *精通*) |
| **Mastery pool** | „Meisterschafts-Pool“, „Mastery-Pool“ | mastery pool | mastery pool | **Meisterschaftsvorrat** | *reserva de maestría* | *réserve de maîtrise* | *reserva de maestria* | *запас мастерства* | *精通池* |
| **Checkpoint** (5/25/50/95 %) | „Checkpoint“ (`mastery.poolHint`, `mastery.pool.nextCheckpointNoEta`) | checkpoint | checkpoint | **Schwelle** | *umbral* | *palier* | *marco* | *рубеж* | *节点* |
| **Level 99 ceremony** | „Meisterweihe“ (2) | Mastery Ceremony | mastery ceremony | **Meisterweihe** (Kanon, Bibel § 8) | | | | | |
| **Skilling XP** (`stat.gatherXpMult` „Skilling-XP“) | „Skilling-XP“ | Skilling XP | skilling XP | **Fertigkeits-EP** (siehe EP unter § 15) | | | | | |
| **Rang-Namen** (`mastery.rank.*`) | Bronze/Silber/Gold/Platin/Diamant | Bronze…Diamond | unverändert | unverändert | einheitlich | einheitlich | einheitlich | einheitlich | einheitlich |

---

## § 3 Beute, Drop, Fund, Loot

| Begriff | Ist DE | Ist EN | Vorschlag EN | Vorschlag DE |
|---|---|---|---|---|
| **Loot** (was Gegner hinterlassen) | „Beute“ UI 40 / Content 13 · „Loot“ 3 (`pet.effect.skill.doubleLoot`, `onboarding.tour.combat.enemySelect.body`, `raid.rest.lastLoot`) | loot (9), drops | **loot** (Substantiv); „drop“ nur als Verb („drops loot“) und in „drop rate“ | **Beute**. Verb: „hinterlassen“, „fallen lassen“ |
| **Drop** (Substantiv) | „Drop/Drops“ UI 13 / Content 2 (`zone.progress.drops` „Drops {pct}%“, `combat.session.raresShort` „Seltene Drops“, `combat.undiscovered` „um den Drop aufzudecken“, `soul_flayer_fang` „Seltener Drop“, `talentNodes:slayer.spoils` „Seltene Drops“) | drop (7) | drop (Verb, „drop rate“) | **fällt weg.** „Drops {pct}%“ → „Beute {pct} %“; „Seltene Drops“ → „Seltene Beute“ |
| **Drop rate / drop chance** | „Dropchance“ (`toast.dropRate`), „Beutechance“ (`weaponEffect.lootChance`, `chronicle_wanderers_seal`) | drop rate, loot chance | drop rate (Toast), loot chance (Effekt) | **Beutechance** (Kampf), **Fundchance** (Sammeln; der Toast heißt schon „Seltener Fund!“) |
| **Rare find** (Sammeln) | „Seltener Fund“ (`toast.rareFind`), „Seltenster Fund“ (`hunting.book.tile.rarest`) | rare find | rare find | **Fund** (für alles, was beim Sammeln/Jagen/Angeln auftaucht) |
| **Chase drop / unique** | „Jagdbeute“ (`combat.elite.uniqueLabel`), „Unikat/Unikate“ (`mail.transfer.uniqueItem`, `bestiary.champion.uniques`) | Chase Drop, Unique(s) | chase item, unique | **Unikat**; `combat.elite.uniqueLabel` „Jagdbeute“ kollidiert mit dem Skill Jagen → „Unikat“ |
| **Yield** (Sammelertrag) | „Ertrag“ 17 | yield | yield | **Ertrag** (bleibt) |

Andere Sprachen (gemessen an den 70 EN-Texten mit „loot/drop“): ES *botín* 55 (einheitlich) · FR *butin* 56, **„drop“ 2** (`toast.dropRate` „Taux de drop“, raus) · PT-BR *saque* 39, *espólio* 9, **„drop“ 4** (**uneinheitlich**, Vorschlag *saque* für Beute, *achado* für Fund) · RU *добыча* 52, *выпадение* 9 (als Verb ok), *трофей* 4 · ZH *战利品* 34, *掉落* 29 (als Verb/Rate ok).

---

## § 4 Set

| Begriff | Ist DE | Ist EN | Vorschlag EN | Vorschlag DE |
|---|---|---|---|---|
| **Set** (Ausrüstungsset, Set-Bonus) | „Set“ UI 4 / Content 42 (Setnamen „Kupfer-Set“, `char.setBonus` „Set-Bonus“, `ach_sets_completed_1` „Ausrüstungs-Set“) | set, Set Bonus | **set**, set bonus | **Set** bleibt (eingebürgert). Schreibung: „Set-Bonus“, „Kupfer-Set“ (Bindestrich bei Eigennamen), „Ausrüstungsset“ (Gattungswort zusammen) |

Andere Sprachen (gemessen an den 92 EN-Texten mit „set“): ES *conjunto* 45 (einheitlich) · FR *panoplie* 43, *set* 2, *ensemble* 1 (→ *panoplie*) · PT-BR *conjunto* 47 (einheitlich) · RU *комплект* 47, *набор* 2 (→ *комплект*) · ZH *套装* (einheitlich). Hier ist wenig zu tun.

---

## § 5 Ward-Familie (Stoff-Zauberschild)

Heute drei deutsche Wörter für eine Mechanik: „Ward“ (UI 35 / Content 7, z. B. `stat.wardPool` „Ward-Pool“, `stat.wardBreak` „Ward-Durchbruch“, `ring_master_magic` „Ward-Bruch“), „Schutzschild“ (Content 5, `ring_master_magic`, `gravecall_sigil`, `godgem_reliquary`), „Schild“ (`dreadfang_fetish`). Dazu der Skill **Warding = „Abwehr“** (Content 18, Kanon-Skillname).

| Begriff | Ist DE | Vorschlag EN | Vorschlag DE (Empfehlung **Barriere**) | Alternative A: „Ward“ behalten | Alternative B: „Bann“ |
|---|---|---|---|---|---|
| Ward (Pool/Mechanik) | Ward, Schutzschild, Schild | ward | **Barriere** | Ward | Bann |
| Ward pool | Ward-Pool | ward pool | **Barrierevorrat** | Ward-Vorrat | Bannvorrat |
| Ward regen /s | Ward-Regen /s | ward regen /s | **Barriere-Regeneration /s** | Ward-Regeneration | Bann-Regeneration |
| Ward capacity | Ward-Kapazität | ward capacity | **Barrierekapazität** | Ward-Kapazität | Bannkapazität |
| Ward break | Ward-Durchbruch, Ward-Bruch | ward break | **Barrierebruch** | Ward-Bruch | Bannbruch |
| Warded (Rüstungsklasse) | (Ward) | warded | **barrierend** / Spalte „Barriere“ | | |
| Warding (Skill) | Abwehr | Warding | **Abwehr** (Kanon, bleibt in allen Varianten) | | |

Warum Barriere: deutsches Wort, in RPGs für Absorb-Schilde eingeführt (Diablo, Final Fantasy), kollidiert nicht mit „Schild“ (Blocken, Nebenhand) und nicht mit „Abwehr“ (Skill). FR nutzt bereits *barrière*.
Andere Sprachen (gemessen an den 59 EN-Texten mit „ward“): ES *guarda* 52, *escudo* 4 · FR *barrière* 50, *bouclier* 2, *protection* 2 · PT-BR *guarda* 53, *escudo* 4 · RU *оберег* 51, *щит* 4 · ZH *结界* 52, *护盾* 4, *守护* 3. Alle fünf sind im Kern einheitlich; die Ausreißer sitzen in denselben Schlüsseln (`statdesc.wardBreak`, `rune.target.hint.wardCapacity`, drei Item-Texte) und lassen sich mechanisch nachziehen. Nur die Schild-Wörter (*escudo/bouclier/щит/护盾*) dürfen dort nicht stehen, weil sie den Nebenhand-Schild meinen.

---

## § 6 Echo

| Begriff | Ist DE | Ist EN | Vorschlag | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|---|---|---|
| **Echo** (gefundene Begleiter wirken anteilig weiter; `companions.echo.*`, 3 Schlüssel) | Echo | Echo | **Echo / Echo** (deutsches Wort, bleibt) | *eco* | *écho* | *eco* | *эхо* | *回响* |

Einheitlich in allen Sprachen. Nur die Erklärzeile `companions.echo.locked` braucht den Stilpass (siehe `stilregeln.md` § 3.4).

---

## § 7 Slayer-Familie

Hier kollidieren zwei Dinge: Der **Skill** heißt im Content „Monsterjäger“ (`skills:slayer:name`, dazu „Monsterjäger-Kampftrank“ u. a., 17 Fundstellen), die **UI** sagt überall „Slayer“ (23 Schlüssel: `nav.slayer`, `slayer.master.locked` „Slayer-Level“, `slayer.book.locked` „Slayer-Stufe“, `header.slayerTask` „Slayer: …“, `itip.masterPerk.slayerPoints` „Slayer-Punkte“), und die **Kanon-Namen** tragen ihn ebenfalls (Zone „Der Slayer-Turm“, Sets „Slayers Ornat“, Items „Slayer-Helm“, 45 Content-Felder). Der Tavernengast `viktor` hat als DE-Rolle das unübersetzte „Slayer“.

| Begriff | Ist | Vorschlag (Empfehlung: **Slayer als Eigenname**) | Alternative: durchgehend deutsch |
|---|---|---|---|
| Slayer (Skill) | DE „Monsterjäger“ / UI „Slayer“ | **Slayer** (Skill-Anzeigename ändern: Chef-Entscheid, da ausgelieferter Name) | Monsterjäger (dann UI 23 Schlüssel + Zone/Sets/Items umbenennen) |
| Slayer level | „Slayer-Level“, „Slayer-Stufe“ | **Slayer-Stufe** | Monsterjäger-Stufe |
| Slayer task / contract | EN „task“ 16, „contract“ 5 · DE „Slayer-Auftrag“, „Auftrag“ | EN **Slayer contract** (Brennas Rahmung, Erfolge heißen schon „First Contract“) · DE **Slayer-Auftrag** | Jagdauftrag (kollidiert mit Skill Jagen) |
| Slayer points | „Slayer-Punkte“ | **Slayer-Punkte** | Jägerpunkte |
| Slayer's Book (Talentbaum) | „Jägerkodex“ (Kanon) | **Jägerkodex** bleibt | |
| Slayer Master (Brenna) | „Slayer-Meisterin“ (Lore), „Monsterjäger“ (Taverne) | **Slayer-Meisterin** | |
| Bounty / Bounty Board | „Kopfgeld“, „Kopfgeld-Brett“ | **Kopfgeld**, **Kopfgeldtafel** | |

Andere Sprachen (gemessen an den 96 EN-Texten mit „Slayer“): ES *cazador* 92 · FR *chasseur* 80 (*pourfendeur* 7, *tueur* 6) · PT-BR *caçador* 87 → alle drei **kollidieren mit dem Skill Jagen** (*caza* 53 / *chasse* 69 / *caça* 63 Texte), der seit 1.2 existiert. RU *истребление/истребитель* 91 ist eigenständig, aber 9 Slayer-Texte sagen *охотник* (z. B. `slayer.book.locked`) und rutschen so in Jagen (*охота*). ZH *猎魔* 88 ist sauber. Empfehlung für ES/FR/PT-BR: „Slayer“ unübersetzt wie im Deutschen, oder ein eigenes Wort (FR *pourfendeur*, ES *exterminador*, PT *exterminador*). Chef-Frage.

---

## § 8 Raid und Hallen

| Begriff | Ist DE | Ist EN | Vorschlag EN | Vorschlag DE |
|---|---|---|---|---|
| **Raid** (Spielmodus, UI-Abschnitt `raid.*`, 17 Fundstellen „Raid“) | „Raid“ | Raid | **raid** | **Schlachtzug** (Empfehlung, deutsches Standardwort) · Alternative: „Raid“ behalten |
| **Halls of Gobkha'raz** (der konkrete Raid) | „Die Hallen von Gobkha'raz“, „die Hallen“ (Content 24) | Halls | Halls | **Die Hallen** (Eigenname, bleibt in jeder Variante) |
| Difficulty Normal/Heroic/Mythic | Normal/Heroisch/Mythisch | | | bleibt; Hinweis `raid.start.locked` „Diese Stufe ist noch gesperrt“ → „Diese Schwierigkeit…“ („Stufe“ hier falsch) |
| Weekly modifier | „Modifikator“ (`raid.weekly.title`) | modifier | weekly modifier | **Wochenregel** oder „Modifikator“ (Chef) |

Andere Sprachen (gemessen an den 18 EN-Texten mit „raid“): ES *incursión* 16, *raid* 4, *banda* 1 (→ *incursión*; *banda* ist die Kriegsbande) · FR *raid* 17 (einheitlich) · PT-BR *raide* 16, *raid* 4, *incursão* 1 (→ *raide*, die eingeführte PT-BR-Form) · RU *рейд* 17 (einheitlich) · ZH *团队副本* 15 (einheitlich; *大厅* ist „die Hallen“).

---

## § 9 Prestige-Familie

„Prestige“ kommt in **keiner** Sprache spielersichtbar vor (0 Fundstellen); es ist nur das Schlüssel-Präfix `prestige.*` (112 Schlüssel). Spielerbegriffe:

| Begriff | EN | DE | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|---|---|
| Der Neustart | Cinderfall | Aschesturz | Caída de Ceniza | Chute des Cendres | Queda das Cinzas | Пеплопад | 烬落 |
| Der Ort | Shard Altar | Scherbenaltar | Altar de los Fragmentos | Autel des Éclats | Altar dos Fragmentos | Алтарь осколков | 碎片祭坛 |
| Der Talentbaum | The Book of Scars | Das Narbenbuch | Libro de las Cicatrices | Livre des Cicatrices | Livro das Cicatrizes | Книга шрамов | 伤痕之书 |
| Durchgang | run | Durchgang (`prestige.bilanz.title` „Chronik dieses Durchgangs“) | partida | partie | partida | прохождение | 周目 |
| Erbstück | heirloom | Erbstück | | | | | |

Alles einheitlich. Regel: „Prestige“ bleibt ein internes Wort und erscheint nie in Spielertexten oder Patchnotes.

---

## § 10 Begleiter

| Begriff | Ist DE | Ist EN | Vorschlag EN | Vorschlag DE |
|---|---|---|---|---|
| **Companion** | „Begleiter“ UI 26 / Content 8, einheitlich | „companion“ in der UI, aber **„pet“** in Erfolgen (`ach_pets_1` „Own your first pet“, `ach_pets_5`, `ach_pets_10`) und in `prestige.history.tally`, `skill.activePet.tooltip` | **companion**, nie „pet“ | **Begleiter** |
| Companion ability (Kampf) | „Fähigkeit“ | ability | ability | **Fähigkeit** (Begleiter haben Fähigkeiten, Spieler haben Fertigkeiten; die Trennung ist nützlich) |
| Skill effect (Beruf) | „Fertigkeitswirkung“? (`pet.effect.*`) | skill effect | skill effect | **Berufswirkung** → nein, „Beruf“ fällt weg: **Fertigkeitswirkung** |

Andere Sprachen: ES *compañero* 33, *mascota* 5 · FR *compagnon* 58, *familier* 6 · PT-BR *companheiro* 33, *mascote* 5 · RU *спутник* 32, **питомец** 7 (`companions.slot.label` „Питомец“ neben `combat.log.cat.companion` „Спутник“) · ZH *伙伴* 37, *宠物* 1. Überall das Tierwort streichen.

---

## § 11 Ländereien, New Haven, Lager, Bank, Vorrat

„Lager“ steht im deutschen Spiel für **drei verschiedene Dinge**: die Bank (`bank.empty` „Das Lager ist leer“, `stats.bankKinds` „Items im Lager“, `options.autoBank` „Auto-Lager“, 10 Schlüssel), den Materialvorrat (`nav.storage` „Lager“, `options.materialsToStorage` „direkt ins Lager“, `combat.quiver.noArrows` „Keine Pfeile im Lager“, 5 Schlüssel) und New Haven (`newhaven.subtitle` „Das Lager an der Furt“, `offline.camp.buildsTitle` „Dein Lager hat gebaut“, `prestige.goes.world` „Lager, Farm, Fallen…“, `daily_m_gather_80` „ins Lager zurückkehrst“, 4 + Content). Im Englischen sind es drei Wörter (bank, storage, camp).

| Begriff | Ist DE | Ist EN | Vorschlag EN | Vorschlag DE |
|---|---|---|---|---|
| **Bank** | Bank / Lager / Gewölbe (Erfolge „Gewölbewart“, Lore „das Gewölbe“) | Bank, Vault (Erfolge) | bank; „vault“ nur in Erfolgsnamen | **Bank** in jeder UI-Zeile. „Gewölbe“ nur in Lore und Erfolgsnamen |
| **Storage** (Materialvorrat, 1.4) | Lager | Storage | storage | **Vorrat** (`nav.storage` „Vorrat“, „Materialien direkt in den Vorrat“, „Keine Pfeile im Vorrat“) |
| **Camp** (= New Haven) | Lager, New Haven | camp, New Haven | New Haven; „camp“ nur in Erzählsätzen | **New Haven** als Name; „Lager“ nur noch in Erzählsätzen („das Lager an der Furt“) und nie allein als UI-Wort |
| **Estates** (Bereich mit New Haven, Farm, Fallen) | Ländereien (5) | Estates | estates | **Ländereien** (bleibt) |
| **Emberhold** | Glutfeste (Content 15, Kanon) | Emberhold | Emberhold | **Glutfeste** (Kanon). Nicht mit New Haven verwechseln: Glutfeste = Feste der Völker, New Haven = das eigene Lager an der Furt |
| **The Reach** | „das Reach“ (Kanon), aber „im Reich“ in Tagesaufgaben (`daily_e_gather_40`, `daily_h_gather_150`, `daily_ma_gather_250/400` „schöpfe den Reichtum des Reiches aus“) | the realm | **the Reach** statt „the realm“ | **das Reach**; „Reich“ fällt weg |

Andere Sprachen (Storage/Bank/Camp): ES *almacén/banco/campamento* · FR *entrepôt/banque/camp* · PT-BR *depósito/banco/acampamento* · RU *склад/банк/лагерь* · ZH *仓库/银行/营地*. Dort sauber getrennt; nur DE ist betroffen. „New Haven“ bleibt in allen Sprachen unübersetzt (Ist-Zustand).

---

## § 12 Aufgaben-Familie

Englisch kennt fünf Dinge, Deutsch benutzt dafür heute vier Wörter kreuz und quer: „Aufgaben“ (`nav.quests`, `quests.title` „Aufgabentafel“, `quests.tokens.label` „Aufgabenmarken“), „Aufträge“ (`quests.daily.tab.story` für *Contracts*, `quests.daily.title` „Tägliche Aufträge“ für *Daily Quests*, `ach_quests_50` „Schließe 50 Aufträge ab“ für *quests*, `slayer.task.*` „Slayer-Auftrag“), „Arbeitsaufträge“ (`orders.tab`), „Tagesaufgaben“ (`ach_dailies_10`), „Quest-Marken“ (`prestige.goes.tokens`) neben „Aufgabenmarken“.

| Ding | Vorschlag EN | Vorschlag DE | ES (Ist) | FR (Ist) | PT-BR (Ist) | RU (Ist) | ZH (Ist) |
|---|---|---|---|---|---|---|---|
| Quest (Aufgabentafel, allgemein) | quest | **Aufgabe** (Aufgabentafel, Aufgabenmarke, „50 Aufgaben“) | *misión* 24 | *quête* 26 | *missão* 24 | *задание* 57 | *任务* 66 |
| Chronicle chapter | chapter | **Kapitel** (15, bleibt) | capítulo | chapitre | capítulo | глава | 章 |
| Daily quest | daily quest | **Tagesaufgabe** | *tarea* 25 (**uneinheitlich** mit *misión*) | *tâche* 29 / *mission* 9 (**uneinheitlich**) | *tarefa* 36 | *задание* | *任务* |
| Slayer task/contract | Slayer contract | **Slayer-Auftrag** (das Wort „Auftrag“ gehört Brenna) | *tarea* 20 / *encargo* 12 / *contrato* 9 (**uneinheitlich**, spiegelt EN task/contract) | *tâche* 22 / *mission* 8 / *contrat* 11 (**uneinheitlich**) | *tarefa* 30 / *contrato* 11 | *задание* 30 (**= Quest-Wort**) / *контракт* 11 | *任务* 30 (**= Quest-Wort**) / *契约* 11 |
| Work order (Werkstatt, 1.4) | work order | **Arbeitsauftrag** (bleibt, ist durch „Arbeits-“ eindeutig) | *encargo* 8 (**Kollision** mit Slayer-*encargo*) | *commande* 9 | *encomenda* 8 | *заказ* 8 | *订单* 7 |
| Bounty (Champion-Kopfgeld) | bounty | **Kopfgeld** | recompensa | prime | recompensa | награда | 赏金 |
| Objective (Zeile im Auftrag) | objective | **Ziel** | objetivo | objectif | objetivo | цель | 目标 |
| Quest token | quest token | **Aufgabenmarke** (nicht „Quest-Marke“) | ficha | jeton | ficha | жетон | 代币 |
| Rewards Shop (`quests.daily.tab.shop` „Belohnungs-Shop“) | rewards shop | **Belohnungsladen** | | | | | |

Nach dem EN/DE-Entscheid bekommt jede Sprache eine eigene Fünferzeile (Quest / Daily / Slayer / Work order / Bounty) und die Übersetzer-Agenten ersetzen mechanisch.

---

## § 13 Raritäten

Quelle der Wahrheit ist `RARITY_LABEL` in `packages/shared/src/index.ts` (zehn Stufen, alle sieben Sprachen). Sie ist in sich einheitlich; **`design/i18n-glossary.md` § 6 ist dagegen veraltet** (PT-BR dort „Ruim/Super-raro“, im Code „Precário/Muito Raro“; RU dort „Скверный“, im Code „Низкое“; ZH „Godly“ dort 神器, im Code 神圣). Code gewinnt.

| EN | DE | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|---|
| Poor | Minderwertig | Pobre | Médiocre | Precário | Низкое | 劣质 |
| Common | Gewöhnlich | Común | Commun | Comum | Обычное | 普通 |
| Magic | Magisch | Mágico | Magique | Mágico | Магическое | 魔法 |
| Rare | Selten | Raro | Rare | Raro | Редкое | 稀有 |
| Super Rare | Sehr Selten | Muy raro | Très rare | Muito Raro | Очень редкое | 超稀有 |
| Epic | Episch | Épico | Épique | Épico | Эпическое | 史诗 |
| Legendary | Legendär | Legendario | Légendaire | Lendário | Легендарное | 传说 |
| Godly | Göttlich | Divino | Divin | Divino | Божественное | 神圣 |
| Heroic (Raid) | Heroisch | Heroico | Héroïque | Heroico | Героическое | 英雄 |
| Mythic (Raid) | Mythisch | Mítico | Mythique | Mítico | Мифическое | 神话 |

Hinweise: „Sehr Selten“ ist als Adjektivpaar groß geschrieben, im Fließtext müsste es „sehr selten“ heißen; als Label vertretbar, im Tooltip-Kopf bleibt es. Die Erfolge haben eine **eigene** Leiter (`achievements.rarity.*`: Gewöhnlich/Ungewöhnlich/Selten/Episch/Legendär), das ist beabsichtigt und bleibt. Raritätswörter tauchen in Item-Flavor bewusst nicht auf (0 Fundstellen) und sollen es auch nicht.

---

## § 14 Kampfwerte

Die Stat-Labels (`stat.*`, 33 Schlüssel) sind in allen Sprachen weitgehend sauber; Probleme liegen in Doppelwörtern, Anglizismen und Schreibweise.

| EN (Ist) | Vorschlag EN | DE (Ist) | Vorschlag DE | Bemerkung |
|---|---|---|---|---|
| HP (33) / health (2) | **HP** als Label, **health** im Satz | HP 17 · Lebenspunkte 17 · Leben 14 · LP 1 (`pet.effect.combat.currentHpStrike`, `slayer_vambraces`) | **Leben** als Label und im Satz („+4 Leben je besiegtem Gegner“, „heilt dich um 20 Leben“); „Lebenspunkte“ nur, wo „Leben“ missverständlich wäre; „HP/LP“ fallen weg | Chef-Frage (HP ist eingebürgert) |
| XP (33) | XP | XP 30 · EP 3 (`blessing.effect.xp`, `tavern.reward.xp`, `newhaven.refine.noXp`) | **EP** (deutsche Norm) oder XP durchgängig; heute gemischt | Chef-Frage |
| Attack speed / Attack Speed | **Attack speed** | Angriffstempo 5 · Angriffsgeschwindigkeit 1 (`itip.attackSpeed`) | **Angriffstempo** | Groß-/Kleinschreibung in EN uneinheitlich (siehe `stilregeln.md` § 2.6) |
| Mitigation | Mitigation | **„Mitigation“** (unübersetzt) | **Schadensminderung** | |
| Armor Pen | Armor penetration | Rüstungsdurchdringung (21 Zeichen) | **Rüstungsbruch** (kurz, passt zu Barrierebruch) | Alternative: Durchdringung |
| Crit chance / Crit damage | crit chance, crit damage | Krit-Chance, Krit-Schaden; im Satz „kritische Treffer“ | **Krit-Chance / Krit-Schaden** (Label), „kritische Treffer“ (Satz) | einzige erlaubte DE-Abkürzung neben „max.“ |
| Block chance / Block Chance | **Block chance** | Blockchance | **Blockchance** | EN hat zwei Schreibweisen für denselben Wert (`stat.block`, `stat.blockChance`) |
| Dodge chance / Evasion / Evasion Rating | unverändert | Ausweichchance / Ausweichen / Ausweichwert | unverändert | Schreibung: „Krit-Chance“ mit, „Blockchance/Ausweichchance“ ohne Bindestrich → vereinheitlichen auf **ohne** Bindestrich bei deutschen Erstgliedern, **mit** bei Abkürzung (Krit-) |
| Accuracy / Precision | unverändert | Genauigkeit / Präzision | unverändert | getrennte Werte, nie zusammenlegen (i18n-glossary Note 4 bleibt gültig) |
| Defense (Stat) / Defence (Skill) | **Defence** (eine Schreibung, britisch wie der Skill) | Verteidigung / Verteidigung | unverändert | EN uneinheitlich: `stat.defense` „Defense“, Skill „Defence“ |
| Spell reserve | spell reserve | Zauberreserve (9) · Mana 1 (`updateNotice.point4`) | **Zauberreserve** | |
| Lifesteal | lifesteal | Lebensraub | **Lebensraub** | |
| Hit range (min–max) | hit range | Trefferspanne | **Trefferspanne** | |
| Kills (`combat.kills` „Kills: {n}“, `combat.hud.kills`, `bestiary.champion.kills`) | kills | **„Kills“** 11 UI / 5 Content („Jeder Abschuss“, „Tötungen heilen dich“ in `weaponEffect.healOnKill`, „je Kill“) | **Besiegt: {n}** (Zähler), **„je besiegtem Gegner“** (Effekt), „Sieg“ im Satz | |
| Combat level | combat level | Kampfstufe (`weaponEffect.giantSlayer`) · Kampflevel (`slayer_greaves`) | **Kampfstufe** | |
| Style: Melee/Ranged/Magic | unverändert | Nahkampf/Fernkampf/Magie | unverändert | |
| Status: Burn/Frost/Shock/Poison/Bleed/Void | unverändert | Brand/Frost/Schock/Gift/Blutung/Entzug | unverändert | `status.frost` DE = „Frost“ (gleich EN, korrekt) |

Andere Sprachen: Die Stat-Tabelle in `design/i18n-glossary.md` § 4 stimmt mit dem Code überein und bleibt Referenz; einzige Nacharbeit sind die Ward-Zeilen nach dem Entscheid in § 5.

---

## § 15 Weitere Anglizismen und Streuwörter (DE)

| Ist DE (Fundstellen) | Vorschlag DE | Beispiel-Schlüssel |
|---|---|---|
| Item / Items (UI 52, Content 10) | **Gegenstand / Gegenstände**; in engen Labels nur die Zahl („{n} Arten“, „Gesammelt: {n}“) | `quests.obj.gatherItems` „Items gesammelt“, `bank.kinds` „{n} Item-Arten“, `q_gatherer` „50 beliebige Items“ |
| Buff / Buffs (14) | **Stärkung** (Debuff: **Schwächung**); „Zeitlicher Buff“ → „Wirkt für kurze Zeit“ | `itip.buff`, `itip.buffReplace.*` |
| Slot (9) | **Platz** (Bankplatz, Runenplatz, Werkzeugplatz) | `bank.full`, `enchant.reason.no_affix_slots` „Enchant-Slots“, `item.toolHint` |
| Upgrade (3) | **Ausbau** / **Verbesserung** | `combat.autoEatUpgrade`, `shop.slotUpgrade` |
| Idle (2) | **im Hintergrund** („Fortschritt im Hintergrund“) | `options.autoBankHint` „Idle-Fortschritt“, `onboarding.welcome.body` „Idle-RPG“ (hier ok, Genrename) |
| Kit (3) | **Garnitur** („Garnitur 1“) oder „Ausrüstungssatz“ | `kit.label`, `kit.hint` |
| Auto-Eat (6) neben Auto-Essen (4) | **Auto-Essen** | `combat.foodAutoEat`, `shop.autoEatUpgrade` |
| Shop (7) neben Laden (9) | **Laden** (nav), „Belohnungsladen“ | `quests.daily.tab.shop`, `skill.stoppedInventoryFull` |
| Trash (`dungeon.waveKind.trash` DE „Trash“, EN „Trash“) | **Fußvolk** (EN-Vorschlag: minions; alle fünf anderen Sprachen sagen bereits „Handlanger“) | |
| Story (`quests.daily.tab.chronicle` DE „Story“) | **Chronik** | |
| Pool (Meisterschafts-Pool) | **Vorrat** | `mastery.poolHint` |
| Checkpoint | **Schwelle** | `mastery.pool.nextCheckpointNoEta` |
| Reset (`quests.daily.resetIn` „Reset in {time}“) | **Neu in {time}** | |
| Enchant-Slot | **Runenplatz** | `enchant.reason.no_affix_slots` |
| Dungeon (16) neben Verlies (Content 6: `ach_dungeons_total_5` „Verlies-Läufer“, „Schließe 5 Verliese ab“) | **Dungeon** (Glossar-Entscheid Aug 2026 bleibt) | |
| Tower-Aufgaben (`slayer.tower.intro`) | **Aufträge im Turm** | |
| Champion / Elite | bleiben (Eigenname „Champions des Reach“; Welle „Elite“) | |
| Boss | bleibt (kein brauchbares deutsches Wort) | |
| Sidebar / Hotkeys / Backup / Bug | Seitenleiste / Tastenkürzel / Sicherung / Fehler | `sidebar.resizeLabel`, `options.hotkeys.*`, `options.saveHint`, `bugReport.title` |
| Update (`updateNotice.title`) | bleibt | |
| „Gewährt“ als Effektverb (Meisterringe, 20×) | abwechseln: „bringt“, „gibt“, Doppelpunkt-Form | `ring_master_*` |

---

## § 16 Orte und Eigennamen (Kurzverweis)

Alle Zonen, Dungeons, Figuren, Raid-Räume, Bosse, Sets und Items stehen in `weltlore-grim-reach.md` § 9 (inkl. Nachträge 1.4.0) und werden **nicht** angefasst. Für den Textpass relevant sind nur die Gattungs- und Umgebungswörter:

| EN | DE | Regel |
|---|---|---|
| the Reach | das Reach | nie „das Reich“; „realm“ in EN-Tagesaufgaben → „the Reach“ |
| Emberhold | die Glutfeste | Heimstatt der Völker; Artikel im Satz („vor der Glutfeste“) |
| New Haven | New Haven | das eigene Lager an der Furt; unübersetzt in allen Sprachen |
| the Warden | der Wächter | Erzählerstimme, nie „Warden“ im DE |
| the Nameless | der Namenlose | Spieler in der Chronik |
| the Chronicle | die Chronik / Aschechronik | „Story“ fällt weg |
| Brenna Ashwick | Brenna Aschenweide | Slayer-Meisterin |
| chapter | Kapitel | |
| volume | Band | („den ersten Band zu Ende gebracht“) |

---

## § 17 Offene Chef-Fragen zum Glossar

1. **Level:** „Stufe“ (Empfehlung) oder „Level“ im Deutschen? Beides ist möglich; „Stufe“ ist schon die Mehrheit (59 : 32 : 7) und erlaubt die Kopfzeile „Kampfstufe 96 · Gesamtstufe 1918“ ohne Abkürzung.
2. **Tier-Wörter:** „Klasse“ (Material/Köder/Faser), „Ausbau“ (Auto-Essen, Gebäude), „Rang“ (Meisterschaft/Talente) akzeptiert? Damit ist „Stufe“ nur noch Fortschritt.
3. **Slayer:** Als Eigenname in allen Sprachen führen (dann Skill-Anzeige „Monsterjäger“ → „Slayer“, drei Trank-Namen und Viktors Rolle anpassen) oder durchgehend deutsch (dann 23 UI-Schlüssel plus Slayer-Turm, Slayers Ornat, Slayer-Helm umbenennen)? Dazu: ES/FR/PT-BR nutzen heute „Jäger“ und kollidieren mit dem Skill Jagen.
4. **Ward:** „Barriere“ (Empfehlung), „Ward“ behalten oder „Bann“? Skill „Abwehr“ bleibt in jedem Fall.
5. **Raid:** „Schlachtzug“ (Empfehlung) oder „Raid“ im Deutschen?
6. **Lager-Dreifachbelegung:** Bank = „Bank“, Vorrat (Storage) = „Vorrat“, New Haven = „New Haven“; „Lager“ nur noch als Erzählwort. Einverstanden, oder anderes Wort für Storage (z. B. „Speicher“, „Magazin“)?
7. **Aufgaben-Familie:** Aufgabe (Quest) / Tagesaufgabe / Slayer-Auftrag / Arbeitsauftrag / Kopfgeld / Kapitel. EN: „Slayer contract“ statt „task“?
8. **HP und XP im Deutschen:** „Leben“ und „EP“ (Empfehlung) oder die eingebürgerten „HP“/„XP“ behalten?
9. **Gamer-Wörter:** Buff → Stärkung, Slot → Platz, Upgrade → Ausbau, Kit → Garnitur, Idle → im Hintergrund. Alles ersetzen, oder einzelne (Buff?) als Genre-Wörter dulden?
10. **„Trash“-Welle und „Story“-Tab:** Fußvolk/Minions und Chronik?
11. **Armor Pen:** „Rüstungsbruch“ (Empfehlung) oder „Rüstungsdurchdringung“ lassen?
12. **Anrede in RU und FR** (gehört zu den Stilregeln, betrifft aber jedes Glossarwort): je Sprache eine Form festlegen; Empfehlung ты / tu, wie ES, PT-BR und ZH es schon tun.
