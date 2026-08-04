# Wächter-Stimmen-Paket (Warden Voice Pack) — Identitäts-Update

**Status:** **v2** (Lore-Dev, 2026-07-22) — kompletter Register-Umbau nach Chef-Feedback: v1 klang wie geschriebene Literatur, gebraucht wird GESPROCHENE Sprache. Keys, Bedingungen und Struktur sind unverändert gegenüber v1; alle EN/DE-Texte sind ersetzt. Teil des Persönlichkeits-Pakets „Das Reach führt Buch" (`design/identity-strategy.md`, Maßnahme A).
**Fiktion:** Der Wächter führt die Aschechronik. Jede Tat wird verzeichnet — auch die, bei denen der Spieler nicht zusah.
**Kanon-Quellen (geprüft):** `packages/content/src/index.ts` (family-Werte, Monster, Zonen) · `apps/client/src/renderer/i18n/translations.ts` (bestehende `npc.*`-Greetings, `blessing.*`, `offline.*`, `death.*`) · `design/lore/weltlore-grim-reach.md` §2, §3.5 · `design/elite-spawns-concept.md` · `design/lore/aschechronik-spec.md`.

**Stimm-Regeln v2 (verbindlich, auch für die Übersetzungen in die 5 weiteren Sprachen):**
1. **Laut-Lese-Test:** Jede Zeile muss klingen, als würde ein echter Mensch sie in einem Gespräch sagen.
2. **Verboten:** Aphorismen und Epigramm-Kadenzen, Semikolons, die Chronik/Tinte/Feder/Seiten als Bild oder handelndes Subjekt, Erzähler-Pathos, Parallelismen als Stilmittel.
3. **Erlaubt und erwünscht:** kurze direkte Sätze, trockener Humor, Alltagswörter. Die Figuren bleiben sie selbst: Brenna ruppig, der Händler geschäftig, die Verwalterin nüchtern, der Wächter knapp und sachlich. Der Wächter berichtet wie ein wortkarger Mensch, nicht wie ein Poet. Er darf sagen, dass ER etwas aufschreibt oder eine Liste führt — aber das Buch tut nie selbst etwas.
4. **Weiter gültig:** maximal EIN Gedankenstrich pro Zeile (die Zeilen unten kommen ohne aus), keine modernen Idiome, keine vierte Wand.

**Platzhalter-Konvention** (Stil der bestehenden Keys, ui-dev mappt):
`{time}` = formatierte Dauer · `{kills}` = Offline-Kills · `{gold}` = Offline-Gold · `{monster}` = lokalisierter Monster-Name · `{zone}` = lokalisierter Zonen-Name · `{streak}` = aktuelle Slayer-Serie · `{chapter}` = lokalisierter Kapitel-Titel der Aschechronik.

---

## § A Offline-Bericht — „Der Wächter berichtet, was in deiner Abwesenheit geschah"

Der Wächter erzählt mündlich, was passiert ist. Bedingungs-gewählte Bausteine für das Offline-Popup, gespeist aus `OfflineSummary` (`ms`, `gold`, `kills`, `deaths`, `diedAgainst`, `petDrops`, `items`, `combatStopReason`).

**Empfohlene Auswahl-Logik (Empfehlung, ui-dev entscheidet):** `frame` immer als Kopfzeile; darunter höchstens zwei Ereigniszeilen, Tod hat Vorrang vor allem, Pet vor Beute/Gold/Kills. Ruhe-/Dauer-Zeilen nur, wenn keine Ereigniszeile greift. Schwellwerte („viele Kills", „große Beute", „sehr lang") setzt ui-dev/balance — keine Zahlen aus der Lore.

**Hinweis Tod offline:** Laut `OfflineSummary`-Doku ist `deaths` offline maximal 1 (Niederlage beendet den Kampf hart). Die Todeszeile ist deshalb im Singular geschrieben; `offline.died.count` existiert bereits als Absicherung.

| Key | EN | DE | Wahl-Bedingung |
|---|---|---|---|
| `offline.warden.frame` | You were gone {time}. Here's what happened while you were away. | Du warst {time} weg. Das hier ist in der Zeit passiert. | immer (Kopfzeile) |
| `offline.warden.quiet1` | A quiet night. Nothing much happened. We still get those sometimes. | Eine ruhige Nacht. Nichts Besonderes. Die gibt es auch noch. | nichts Nennenswertes (Variante 1) |
| `offline.warden.quiet2` | Not much to report. It stayed quiet while you were gone. Don't complain. | Nicht viel zu berichten. Es blieb still, solange du weg warst. Beklag dich nicht. | nichts Nennenswertes (Variante 2) |
| `offline.warden.short` | That was quick. You didn't miss much. | Das war kurz. Viel verpasst hast du nicht. | sehr kurze Abwesenheit |
| `offline.warden.long` | {time}. That's a while. Best I start from the beginning. | {time}. Das ist eine Weile. Ich fange am besten vorn an. | sehr lange Abwesenheit (z. B. Cap erreicht) |
| `offline.warden.kills1` | {kills} enemies went down while you were away. I kept count. | {kills} Gegner sind gefallen, während du weg warst. Ich habe mitgezählt. | viele Kills (Variante 1) |
| `offline.warden.kills2` | {kills} enemies slain. Not bad for someone who wasn't even here. | {kills} erlegte Gegner. Nicht schlecht für jemanden, der gar nicht da war. | viele Kills (Variante 2) |
| `offline.warden.gold` | {gold} gold. That goes a long way out here. | {gold} Gold. Damit kann man hier draußen etwas anfangen. | hoher Gold-Ertrag |
| `offline.warden.loot` | The loot's piling up. Go through it before it gathers dust. | Die Beute stapelt sich inzwischen. Sieh sie durch, bevor sie Staub ansetzt. | große Item-Beute |
| `offline.warden.death` | Bad news: {monster} got you. That was the end of the fight. | Eine schlechte Nachricht: {monster} hat dich erwischt. Der Kampf war damit vorbei. | `deaths` ≥ 1 und `diedAgainst` bekannt |
| `offline.warden.stalemate` | Hours, and neither of you landed a single hit. At some point I stopped watching. | Stundenlang hat keiner von euch beiden getroffen. Irgendwann habe ich aufgehört zuzusehen. | `combatStopReason == "stalemate"` |
| `offline.warden.pet` | Something followed you home. It's still here. I think it's staying. | Dir ist unterwegs etwas zugelaufen. Es ist noch da. Ich glaube, es bleibt. | `petDrops` vorhanden |

*(12 Zeilen)*

---

## § B Todes-Chronik — Eintrags-Zeilen für das Todes-Popup

Der Wächter kommentiert den Tod, wie ein wortkarger Mensch es täte. Gewählt wird nach `MonsterDef.family` des Gegners; dazu ein generischer Fallback und drei Eskalationsstufen nach **Gesamt-Todeszahl** (keine Per-Monster-Zählung — abgelehnt; nur family + Gesamt-Tode).

**Existierende family-Werte (vollständig, aus `packages/content/src/index.ts` geprüft):** `humanoid`, `beast`, `undead`, `demon`, `construct`, `dragonkin`. Andere Werte gibt es nicht; NUR diese sind gekeyt.

**Empfohlene Anzeige (Empfehlung):** eine family-Zeile plus, falls eine Schwelle greift, eine Eskalationszeile darunter. Schwellen für „mehrfach"/„oft" setzt ui-dev/balance; `first` greift exakt beim ersten Tod des Spielstands.

| Key | EN | DE | Wahl-Bedingung |
|---|---|---|---|
| `death.chronicle.beast` | A beast got you. That happens faster out here than you'd think. | Ein Tier hat dich erwischt. Das geht hier draußen schneller, als man denkt. | family `beast` |
| `death.chronicle.humanoid` | Your enemy could think and had a weapon. This time that was enough. | Dein Gegner konnte denken und hatte eine Waffe. Diesmal hat das gereicht. | family `humanoid` |
| `death.chronicle.undead` | Killed by something that was already dead. Don't dwell on it too long. | Erschlagen von etwas, das selbst schon tot war. Häng dem nicht zu lange nach. | family `undead` |
| `death.chronicle.demon` | That was a demon. Their fire is borrowed, but it burns all the same. Be more careful next time. | Ein Dämon war das. Ihr Feuer ist geliehen, aber es brennt trotzdem. Sei nächstes Mal vorsichtiger. | family `demon` |
| `death.chronicle.construct` | It does what it was built for. Unfortunately, today you were in the way. | Es tut, wofür man es gebaut hat. Leider warst du heute im Weg. | family `construct` |
| `death.chronicle.dragonkin` | That was dragonkin. No shame in losing to one of those. Still, don't make a habit of it. | Das war ein Drachenwesen. Gegen so etwas zu verlieren ist keine Schande. Gewöhn es dir trotzdem nicht an. | family `dragonkin` |
| `death.chronicle.generic` | You fell. Nobody could tell me exactly how. Eat something and go again. | Du bist gefallen. Wie genau, konnte mir keiner sagen. Iss etwas und versuch es noch einmal. | Fallback (family unbekannt/fehlt) |
| `death.chronicle.first` | Your first death. Happens to everyone out here. Get back up. | Dein erster Tod. Passiert hier draußen jedem. Steh wieder auf. | erster Tod des Spielstands |
| `death.chronicle.several` | Another one. I'm not saying anything. I'm just writing it down. | Wieder einer. Ich sage ja nichts. Ich schreibe es nur auf. | mehrere Gesamt-Tode (Schwelle ui-dev) |
| `death.chronicle.many` | You die too often. I'm allowed to say that. I keep the list. | Du stirbst zu oft. Das darf ich sagen. Ich führe die Liste. | viele Gesamt-Tode (Schwelle ui-dev) |

*(10 Zeilen: 6 family + 1 Fallback + 3 Eskalation)*

---

## § C NPC-Weltkommentare — bedingte Zusatz-Begrüßungen

Zusätzliche Greeting-Zeilen für die vier bestehenden NPC-Köpfe, gewählt nach Weltzustand. Sie ERGÄNZEN die bestehenden `greet1–3` (Rotation bleibt); greift eine Bedingung, hat die bedingte Zeile Vorrang. Die Persönlichkeiten folgen den ausgelieferten Greetings: die Verwalterin zählt und versichert nichts, der Händler wittert Geschäft, Brenna will Köpfe, der Wächter ist knapp und sachlich.

**Segens-IDs** (aus `blessing.name.*`): `bloodmoon`, `ashenstorm`, `silence`, `rotmist`, `mistvigil`, `greed`, `wildhunt`. Verteilung: 8 Segens-Zeilen über vier NPCs (`greed` doppelt, weil Bank und Händler gegensätzlich darauf reagieren — das ist der Witz).

### C.1 Bank — Die Verwalterin (The Quartermaster)

| Key | EN | DE | Wahl-Bedingung |
|---|---|---|---|
| `npc.bank.blessing.silence` | Dead quiet out there. Work goes quicker in calm like this. Make use of it. | Totenstille draußen. Bei so einer Ruhe geht die Arbeit schneller von der Hand. Nutz das. | Segen `silence` aktiv |
| `npc.bank.blessing.greed` | Coin sits loose today, they say. Bring it here before somebody else picks it up. | Heute liegt das Gold locker, heißt es. Bring es her, bevor es jemand anderes einsammelt. | Segen `greed` aktiv |
| `npc.bank.elite` | There's a champion loose in {zone}. So there's no confusion: whatever you carry out there, I don't insure. | In {zone} läuft ein Champion herum. Damit das klar ist: Was du da draußen bei dir trägst, versichere ich nicht. | Elite-Spawn aktiv |
| `npc.bank.deaths` | I hear you die a lot. Your vault doesn't mind. Apparently neither do you. | Man hört, du stirbst häufig. Deinem Gewölbe macht das nichts aus. Dir anscheinend auch nicht. | hohe Gesamt-Todeszahl |

### C.2 Händler — Der Händler (The Merchant)

| Key | EN | DE | Wahl-Bedingung |
|---|---|---|---|
| `npc.shop.blessing.rotmist` | Rotmist today. Strange goods turn up in weather like this. If you find any, I'm buying. | Moderluft heute. Bei dem Wetter taucht seltsames Zeug auf. Wenn du etwas findest: Ich kaufe es. | Segen `rotmist` aktiv |
| `npc.shop.blessing.greed` | Gold sits loose today, they say. So does my stock. That works out nicely. | Heute sitzt das Gold locker, sagt man. Meine Ware sitzt auch locker. Das trifft sich gut. | Segen `greed` aktiv |
| `npc.shop.elite` | A champion in {zone}, I hear. If you bring it down, I'll take the spoils off your hands. For good coin, of course. | Ein Champion in {zone}, habe ich gehört. Wenn du ihn erlegst, nehme ich dir die Beute gern ab. Gegen gutes Geld, versteht sich. | Elite-Spawn aktiv |
| `npc.shop.chapter` | I hear you closed another chapter. Congratulations. In my experience, heroes spend more. | Man erzählt, du hast wieder ein Kapitel abgeschlossen. Glückwunsch. Helden geben erfahrungsgemäß mehr aus. | Chronik-Kapitel frisch abgeschlossen |

### C.3 Slayer-Meisterin — Brenna Aschenweide (Brenna Ashwick)

| Key | EN | DE | Wahl-Bedingung |
|---|---|---|---|
| `npc.slayer.blessing.bloodmoon` | Blood Moon. The beasts are bold tonight and their hides are worth more. What are you waiting for? | Blutmond. Die Bestien sind heute Nacht dreist, und ihre Bälge sind mehr wert. Worauf wartest du? | Segen `bloodmoon` aktiv |
| `npc.slayer.blessing.wildhunt` | Hear the horns? On a night like this, the beasts practically kill themselves. Practically. | Hörst du die Hörner? In so einer Nacht töten sich die Viecher fast von selbst. Fast. | Segen `wildhunt` aktiv |
| `npc.slayer.elite` | There's a champion running around {zone}. Bring me the head before it disappears again. | In {zone} läuft ein Champion rum. Bring mir den Kopf, bevor er wieder verschwindet. | Elite-Spawn aktiv |
| `npc.slayer.streak` | {streak} marks in a row. Not bad. Don't break the streak now. | {streak} Aufträge am Stück. Nicht schlecht. Verdirb mir die Serie nicht. | aktive Slayer-Serie |
| `npc.slayer.deaths` | Word is you keep ending up on the ground. Break the habit. Dead hunters bring me no heads. | Man erzählt, du gehst öfter zu Boden. Gewöhn dir das ab. Tote Jäger bringen mir keine Köpfe. | hohe Gesamt-Todeszahl |

### C.4 Questseite — Der Wächter (The Warden)

| Key | EN | DE | Wahl-Bedingung |
|---|---|---|---|
| `npc.quests.blessing.ashenstorm` | Ashen Storm today. Sounds worse than it is: gathering comes easier while it blows. Use the day. | Aschesturm heute. Klingt schlimmer, als es ist: Sammeln geht dabei leichter von der Hand. Nutz den Tag. | Segen `ashenstorm` aktiv |
| `npc.quests.blessing.mistvigil` | Mist Vigil. You learn faster on nights like this. Don't ask me why. You just do. | Nebelwacht. In solchen Nächten lernt es sich schneller. Frag mich nicht, warum. Es ist einfach so. | Segen `mistvigil` aktiv |
| `npc.quests.elite` | A champion turned up in {zone}. One with a name. If you take it down, I want that name for the book. | In {zone} ist ein Champion aufgetaucht. Einer mit Namen. Wenn du ihn erlegst, will ich den Namen für das Buch. | Elite-Spawn aktiv |
| `npc.quests.chapter` | The chapter's done. Good work. The next one is ready when you are. | Das Kapitel ist abgeschlossen. Gute Arbeit. Das nächste liegt schon bereit. | Chronik-Kapitel frisch abgeschlossen |
| `npc.quests.deaths` | You've died a lot lately. I'm not judging. I just notice these things. | Du bist in letzter Zeit oft gestorben. Ich urteile nicht darüber. Aber mir fällt so etwas auf. | hohe Gesamt-Todeszahl |

*(18 Zeilen: Bank 4 · Händler 4 · Brenna 5 · Wächter 5 — davon 8 Segens-Zeilen, 4 Elite, 6 Spielerzustand)*

---

## § D Hinweise an ui-dev (Integration)

1. **Keys sind Vorschläge**, aber bitte Struktur beibehalten (`offline.warden.*`, `death.chronicle.*`, `npc.<npc>.blessing.<blessingId>` / `.elite` / `.deaths` / `.streak` / `.chapter`) — das Glossar und die 5 weiteren Sprachen hängen daran.
2. **Übersetzung in ZH/RU/ES/PT-BR/FR:** Das gesprochene Register mitübersetzen, nicht nur den Inhalt — kurze Sätze, Alltagswörter, trockener Humor. Die Verbote aus den Stimm-Regeln v2 (Aphorismen, Semikolons, Buch-Poesie) gelten in allen Sprachen, ebenso die Ein-Gedankenstrich-Regel.
3. **Eigennamen:** „the Reach / das Reach" bleibt unübersetzt-konsistent wie in den bestehenden Zeilen; Segen-Namen aus `blessing.name.*` wiederverwenden, Zonen-Namen aus dem Zonen-Katalog, Kapitel-Titel aus den Chronik-Quests.
4. **Priorisierung bei Mehrfach-Bedingungen** (Empfehlung): NPC-Zeilen: Elite > Spielerzustand > Segen. Offline: Tod > Pet > Beute/Gold/Kills > Dauer/Ruhe.
5. Alle Schwellwerte (viele Kills, große Beute, „mehrfach"/„oft" gestorben, hohe Todeszahl) sind bewusst NICHT beziffert — Zahlen liegen bei ui-dev/balance.

---

## § E Raben-Post & Spuren (v1)

**Status:** v1 (Lore-Dev, 2026-07-22) — Ergänzung zum v2-Paket. Die Stimm-Regeln v2 aus dem Dokumentkopf gelten voll (Laut-Lese-Test, keine Aphorismen, keine Semikolons, keine Buch-Poesie, maximal ein Gedankenstrich — die Texte unten kommen ohne aus).
**Kontext:** Die Raben-Post ist laut `design/identity-strategy.md` Reservoir für ein späteres Update; die Briefe hier liegen abrufbereit, sobald das Feature GO bekommt. Die Spuren-Zeilen gehören zur Elite-Ankündigung (`design/elite-spawns-concept.md` § 2) — ob es eine Vor-Spawn-Telegraphie („Spuren") mechanisch gibt, entscheiden logic-dev/ui-dev, die Lore liefert nur den Text.
**Fiktion (ein Satz, falls die UI eine Rahmung braucht):** Die Glutfeste hält Raben. Wer draußen unterwegs ist, bekommt Nachrichten auf schwarzen Flügeln.
**Zusätzlicher Platzhalter:** `{name}` = lokalisierter Anzeigename des Champions (Titel aus dem Elite-Namens-Pool).

### E.1 Raben-Post — zwei Briefe

Briefe dürfen minimal förmlicher sein als Gesprochenes, bleiben aber Gebrauchstext: So schreibt jemand, der selten schreibt. Auslöser jeweils einmal pro Spielstand.

**`mail.letter.brenna.firstChampion`** — nach dem ersten erlegten Champion. Brenna legt eine Kleinigkeit bei (ui-dev: Anhang, z. B. Proviant — Auswahl liegt bei content-dev/balance).

> **EN:**
> So the champion's down. I'll admit it just this once: clean work. There's a small something in with this letter, for the road. And don't go saying I never give you anything. The next one is already out there somewhere, and I want its head too.
> Brenna

> **DE:**
> Der Champion ist also erledigt. Ich gebe es nur dieses eine Mal zu: saubere Arbeit. Ich lege dir eine Kleinigkeit bei, für unterwegs. Und sag nicht, ich hätte dir nie etwas geschenkt. Der Nächste läuft schon irgendwo da draußen herum, und seinen Kopf will ich auch.
> Brenna

**`mail.letter.warden.firstUnique`** — nach dem ersten Unique-Fund. Der dritte Satz trägt die Suffix-Fiktion (jedes Stück fällt anders aus) ohne Technik-Sprech.

> **EN:**
> You found something out there that doesn't turn up often. I've seen a few pieces like it over the years, and not many. No two of them ever came out the same, so yours is one of a kind. I've put it in the book. Keep it close.
> The Warden

> **DE:**
> Du hast da draußen etwas gefunden, das nicht oft auftaucht. Ich habe über die Jahre ein paar solcher Stücke gesehen, viele waren es nicht. Keine zwei davon sind je gleich ausgefallen, deins gibt es also nur einmal. Ich habe es ins Buch eingetragen. Behalt es bei dir.
> Der Wächter

### E.2 Spuren-Zeilen

| Key | EN | DE | Verwendung |
|---|---|---|---|
| `combat.tracks.tooltip` | Fresh tracks. Something big will be prowling here soon. | Frische Spuren. Hier treibt sich bald etwas Großes herum. | Tooltip auf der Zonen-Karte, wenn dort ein Spawn bevorsteht |
| `npc.slayer.tracks` | Fresh tracks in {zone}. Something's brewing out there, I can smell it from here. Keep your blade sharp. | Frische Spuren in {zone}. Da braut sich etwas zusammen, das rieche ich bis hierher. Halt deine Klinge scharf. | Brenna-Begrüßung/Brett, wenn irgendwo Spuren sind (Priorität unter `npc.slayer.elite`) |
| `slayer.bounty.line` | {name}, last seen in {zone}. Bring the head. Paid at the gate. | {name}, zuletzt gesehen in {zone}. Bring den Kopf. Bezahlt wird am Tor. | Brett-Zeile je aktivem Kopfgeld („Bezahlt wird am Tor" ist Brennas Kanon-Formel, § 2.2 Slayer-Turm-Lore) |

*(5 Texte: 2 Briefe + 3 Zeilen)*

**Abnahme-Kandidaten für den Chef (Ton-Abnahme VOR der Übersetzungsrunde):**
1. `slayer.bounty.line` (DE): „{name}, zuletzt gesehen in {zone}. Bring den Kopf. Bezahlt wird am Tor."
2. Aus `mail.letter.warden.firstUnique` (DE): „Keine zwei davon sind je gleich ausgefallen, deins gibt es also nur einmal."

---

## Offene Fragen an den Chef

1. **Bank-NPC-Identität:** Im Spiel heißt der Bank-Kopf „Die Verwalterin (The Quartermaster)", die Lore-Bibel führt das Gewölbe unter Voss dem Zähler (§ 3.5). Sollen die Glutfeste-Namen (Voss, Mux, Urga, Shairi) irgendwann die generischen Amtstitel ersetzen? Die Zeilen oben sind so geschrieben, dass sie mit beiden Schildern funktionieren.
2. **Doppelter Greed-Kommentar:** Bank und Händler reagieren beide auf „Gier des Reach" (gegensätzlich, als kleiner Charakter-Kontrast). Falls nur eine Zeile pro Segen gewünscht ist: welche behalten?
