# Textpass 1.4 „Feder und Stahl“ · Stilregeln je Textsorte

**Status:** Entwurf zur Chef-Abnahme (Lore-Dev, 2026-10-24).
**Gilt für:** alle spielersichtbaren Texte in sieben Sprachen (UI, Items, Aufgaben/Chronik, Begleiter, Erfolge, Lore im Spiel, Patchnotes). Die Begriffe selbst stehen in `glossar.md`; hier steht, wie man sie in Sätze setzt.
**Grundlage:** Lore-Bibel § 2 (der Wächter) und § 8 (Sprachfarbe), Wächter-Stimmen-Paket v2 (gesprochenes Register, `waechter-stimme-pack.md`), Chef-Direktive „Natürliche Spieltexte“ (2026-07-13).

---

## § 1 Grundton

Grim Reach ist eine sterbende Welt, erzählt von einem wortkargen Mann, der Buch führt. Daraus folgt für jede Textsorte dasselbe Maß: **knapp, konkret, würdevoll, trocken.** Kein Pathos, keine Ausrufezeichen-Freude, keine Werbesprache, keine Komik auf Kosten der Welt. Ein kleiner trockener Witz ist erlaubt, wenn er vom Sprecher kommt (Brenna, Mux, der Wächter), nicht vom Spiel.

Die drei Register:

| Register | Wer spricht | Wo | Merkmale |
|---|---|---|---|
| **Spiel** (neutral) | niemand; das Interface | Labels, Knöpfe, Werte, Hinweise, Fehler, Effektzeilen | kürzester Weg zur Information, Du-Form, keine Bilder |
| **Wächter** (gesprochen, v2) | der Wächter, Brenna, Mux, Voss, die Gäste | Offline-Bericht, Tod, NPC-Zeilen, Aufgabentexte, Begleiter, Erfolge, Patchnotes-Einleitung | kurze Sätze, Alltagswörter, Laut-Lese-Test, nie Aphorismen |
| **Chronik** (geschrieben) | der Wächter als Schreiber | `loreText` der Kapitel, Item-Flavor, Gebäude-Zeilen, Raid-Intros | darf einen Halbton förmlicher sein; aber: keine Feder, keine Tinte, keine Akte als handelndes Subjekt (v2-Regel gilt auch hier, siehe Frage 2 unten) |

---

## § 2 Allgemeine Regeln (alle Textsorten, alle Sprachen)

### 2.1 Anrede
- **Du-Form**, immer, in jeder Sprache: DE du · EN you · ES tú · PT-BR você · ZH 你. **RU und FR sind heute gemischt** (RU: 57 UI-Schlüssel mit „Вы“, 68 mit „ты“; FR: 148 „vous“, 88 „tu“; Begleitertexte FR „votre“, UI FR „ta“). Entscheid je Sprache, Empfehlung ты / tu: der Wächter duzt, und das Interface spricht mit seiner Stimme.
- Das „Sie“ in deutschen Texten ist heute nur das Pronomen für „die Fertigkeit/die Statistik“ (7 Treffer), kein Höflichkeits-Sie. So bleibt es.
- Der Spieler wird nie „Held“, „Abenteurer“ oder „Spieler“ genannt, außer in bestehenden Erfolgs- und Aufgabentiteln. In der Chronik heißt er „der Namenlose“.

### 2.2 Gedankenstriche, Parallelismen, Satzzeichen (Studio-Regel)
- **Höchstens ein Gedankenstrich pro Text**, und nur, wo ein Mensch beim Sprechen atmen würde. Nie zwei, nie als Einschub-Klammer („X — Y — Z“). Heute: 3 DE- und 4 EN-UI-Texte mit Ketten (`onboarding.equip.body`, `onboarding.guide.combat.intro`, `onboarding.guide.achievements.body`, `statdesc.attackDamage`), 0 im Content.
- Das Hinweis-Muster „Gestoppt — Material leer.“ (65 DE-Schlüssel beginnen so) wird zu Doppelpunkt oder Punkt: „Gestoppt: kein Material mehr.“
- Bereichsstriche in Zahlen („Stufe 5–10“, „min–max“) sind keine Gedankenstriche und bleiben (Halbgeviertstrich ohne Leerzeichen).
- **Keine Dreier-Parallelismen** als Stilmittel („kurz, hart, endgültig“), keine seriellen „nicht X, sondern Y“-Ketten, keine Aphorismus-Kadenz am Satzende.
- **Semikolon:** in gesprochenem Register verboten (v2). In Item-Flavor und Chronik heute 75 DE / 78 EN Fundstellen; Regel: durch Punkt ersetzen, es sei denn, der Satz bricht sonst. Doppelpunkt ist erlaubt und oft die beste Wahl („Vorbehalten den Veteranen: …“).
- **Ausrufezeichen:** nur in Toasts, die ein Ereignis melden („Seltener Fund!“, „Stufenaufstieg!“) und in NPC-Rede. Nie in Hinweisen, Fehlern, Beschreibungen.
- **Auslassungspunkte:** ein Zeichen „…“, sparsam, nur in Rede.
- **Anführungszeichen:** DE „…“ · EN “…” · FR « … » (mit geschützten Leerzeichen) · ES «…» · PT-BR “…” · RU «…» · ZH “…”. Raid-Intros halten das bereits ein.
- **Klammern:** nur für Einheiten und Kurzerklärungen in Effektzeilen („(max.)“, „(nach Rüstung, Barriere und Block)“). Nie in Flavor, nie in Rede.

### 2.3 Anglizismen und Lehnwörter (DE)
- Wer im Glossar ein deutsches Wort hat, bekommt es: Fertigkeit, Stufe, Beute, Gegenstand, Platz, Stärkung, Ausbau, Vorrat, Schlachtzug (falls so entschieden), Schadensminderung.
- Erlaubt bleiben: Set, Dungeon, Boss, Champion, Elite, Update, Echo (deutsch), Slayer (falls Eigenname), Krit (Abkürzung), Auto-Essen.
- Genre-Englisch in Fließtext („Dark-Fantasy-Idle-RPG“ in `onboarding.welcome.body`) ist einmalig erlaubt, wo es das Genre benennt.

### 2.4 Zahlen und Einheiten
| | DE | EN | Übrige |
|---|---|---|---|
| Prozent | **12 %** (geschütztes Leerzeichen; heute 119 Schlüssel mit, 21 ohne Leerzeichen) | **12%** | ES/PT-BR/RU „12 %“, FR „12 %“, ZH „12%“ |
| Tausender | 5.000 | 5,000 | ES/PT-BR 5.000 · FR 5 000 · RU 5 000 · ZH 5000 |
| Dezimal | 0,4 s | 0.4 s | ES/PT-BR/FR/RU Komma · ZH Punkt |
| Einheiten | Leerzeichen vor der Einheit: „450 ms“, „{sec} s“, „10 Minuten“ | „450 ms“, „10 minutes“ | gleich |
| Minuszeichen | „−450 ms“ (echtes Minus U+2212) in Effektzeilen; Bindestrich nur, wenn die Eingabe es erzwingt | gleich | gleich |
| Zähler | „{n}×“ ohne Leerzeichen, „Besiegt: {n}“ | „{n}×“, „Kills: {n}“ | gleich |
| Pfeile/Trenner | „Stufe {from} → {to}“, „{a} · {b}“ in Kompaktzeilen | gleich | gleich |
| Zeit | im Label „30 min“, „2 h 10 min“; im Satz „30 Minuten“ | „30 min“ / „30 minutes“ | lokal |

Zahlen in Flavor-Texten: nur, wenn sie die Mechanik tragen (Meisterringe, Tränke, Slayer-Rüstung). Dann stehen sie am **Ende** des Textes, hinter einem Doppelpunkt, in Stat-Vokabular (siehe § 3.5).

### 2.5 Abkürzungen
- DE: nur „Krit-“, „max.“, „inkl.“, „ca.“. Nie „Lv“, „St.“, „Ges.“, „Pkt.“ („+{points} Pkt.“ → „{points} Punkte“ oder nur die Zahl mit Symbol).
- EN: „Lv“ (nur in engen Zahlenfeldern), „HP“, „XP“, „AP“, „max“, „min“. Nie „Lvl“.
- ES „Nvl“, FR „Niv“, PT-BR „Nv“, RU „ур.“ sind die eingeführten Kurzformen und bleiben, aber nur dort, wo EN „Lv“ steht.

### 2.6 Groß- und Kleinschreibung
- **DE:** normale deutsche Schreibung, auch in Titeln und auf Knöpfen („Neuen Helden erschaffen“, nicht „Neuen Helden Erschaffen“). Komposita zusammen oder mit Bindestrich, nie getrennt („Kampffertigkeit“, „Krit-Chance“, „Slayer-Auftrag“).
- **EN:** Title Case für Seitentitel, Navigation, Knöpfe, Toast-Titel, Erfolgs- und Itemnamen („Main Menu“, „Quit Game“, „Achievements Unlocked!“). **Sentence case** für Stat-Labels, Hinweise, Effektzeilen, Beschreibungen. Heute gemischt: `stat.armorRating` „Armor Rating“ neben `stat.critChance` „Crit chance“, `stat.block` „Block chance“ neben `stat.blockChance` „Block Chance“. Entscheid: alle `stat.*` sentence case.
- **Kapitälchen-Hinweis:** Titel und Knöpfe werden in Kapitälchen gesetzt, Fließtext bekommt demnächst eine Schrift mit echten Kleinbuchstaben. Folgen: Titel/Knöpfe dürfen nicht auf Groß/Klein als Bedeutungsträger bauen (kein „AP“ neben „Ap“), sollen kurz sein (Kapitälchen laufen breit: DE-Knöpfe ≤ 24 Zeichen, Titel ≤ 32), und Eigennamen mit Apostroph („Gobkha'raz“) sind in Kapitälchen zu prüfen. Fließtext darf wieder normale Satzlänge haben; die Kleinbuchstaben tragen.

### 2.7 Platzhalter
- Platzhalter `{n}`, `{skill}`, `{zone}` bleiben in allen Sprachen wörtlich gleich (Guard `qa2-ui-i18n.test.ts` prüft das).
- Satzbau um Platzhalter herum so wählen, dass Genus und Kasus nicht kippen: „Stufe {n} in {skill}“ statt „{skill}-Stufe {n}“ (vermeidet „Angeln-Stufe“); „Beute von {monster}“ statt „{monster}s Beute“.
- Plural-Logik, wo das Spiel sie hat, nutzen (`combat.dungeonWaveSingular`); sonst Formulierung wählen, die Singular und Plural trägt („{n} besiegt“).

---

## § 3 Regeln je Textsorte

### 3.1 UI-Label (Überschrift, Spaltenkopf, Statzeile, Reiter)
- **Länge:** DE ≤ 20 Zeichen für Spalten und Statzeilen, ≤ 28 für Reiter und Abschnittstitel. EN entsprechend kürzer. Heute zu lang: „Rüstungsdurchdringung“ (21), „Angriffsgeschwindigkeit“ (23), „Ausrüstungs-Freischaltungen“ (27), „Kampffertigkeiten ausklappen“ (28).
- **Form:** Substantiv oder Substantivgruppe, kein Verb, kein Punkt. Keine Abkürzung im DE.
- **Ein Wort je Sache** (Glossar). Dieselbe Sache heißt auf jeder Seite gleich: Kopfzeile, Karte, Tooltip, Statistik.
- Beispiel: „Kampf Lv“ → „Kampfstufe“; „Ges. Lv“ → „Gesamtstufe“; „Mitigation“ → „Schadensminderung“; „Kills“ → „Besiegt“.

### 3.2 Knopf
- **Länge:** DE ≤ 24 Zeichen, EN ≤ 20 (Kapitälchen!). Ein bis drei Wörter.
- **Form:** Infinitiv ohne „zu“ (DE: „Ausrüsten“, „Alles verkaufen“, „Jetzt kämpfen“), Imperativ in EN („Equip“, „Sell all“, „Fight now“). Keine Höflichkeitsfloskel, kein „Bitte“.
- Bestätigungsknöpfe nennen die Tat, nicht „OK“: „Roden“, „Abbrechen“; „Verlassen“, „Bleiben“.
- Gefährliche Aktionen tragen das Objekt: „Spielstand überschreiben“, nicht „Fortfahren“.
- Beispiel: „Nach oben verschieben“ (20) ist die Obergrenze; „Vorhandenes einlagern“ (21) geht gerade noch.

### 3.3 Hinweis, Fehler, Grund (warum etwas nicht geht)
- **Pflichtinhalt:** Was ist los, und was tut der Spieler jetzt. In dieser Reihenfolge. Ein Satz Zustand, ein Satz Handlung. Beispiel: „Die Bank ist voll. Räume einen Platz frei, bevor du neue Gegenstandsarten einlagerst.“
- **Immer den Grund nennen.** „Herstellbar: 0×“ allein ist verboten; es heißt „Herstellbar: 0× · Material fehlt“ oder „… · ab Stufe {n}“ oder „… · Inventar voll“. (Braucht einen Grund-Hook von ui-dev; die Textvarianten stehen in `proben.md` § 5.)
- **Form:** Doppelpunkt statt Gedankenstrich nach dem Signalwort („Gestoppt: …“). Keine Klammern mit Nebenbedingungen, lieber zweiter Satz.
- **Länge:** Toast-Detail ≤ 90 Zeichen DE; Inline-Hinweis ≤ 120; Modal-Text ≤ 240.
- **Ton:** sachlich, nie vorwurfsvoll, nie entschuldigend. Technische Fehler (Speichern, Sicherung) sagen zusätzlich, dass nichts verloren ist, wenn das stimmt (`prestige.reason.*` machen das richtig).
- **Sperrhinweise** nennen die Bedingung, nicht nur „Gesperrt“: „Öffnet sich ab Slayer-Stufe {n}.“

### 3.4 Effektzeile (Waffeneffekt, Begleiterwirkung, Meisterring, Rune, Segen, Talent)
- **Form:** Bedingung → Wirkung, in einem Satz, Zahlen in Stat-Vokabular aus `stat.*`. „Bei Treffern: {chance} % Chance, das Ziel in Brand zu setzen ({flat} Schaden pro Sekunde, {duration} s).“
- Eine Mechanik je Zeile. Drei Nebenwirkungen in einem Satz (heute `weaponEffect.frost`, `weaponEffect.shock`, `weaponEffect.poison`) werden zu zwei Sätzen oder zwei Zeilen; ui-dev prüft, ob die Komponente zwei Zeilen trägt.
- Verben: „bringt“, „gibt“, „heilt“, „verkürzt“, „füllt auf“. „Gewährt“ nur noch, wo Würde gemeint ist (Meisterringe), nicht zwanzigmal hintereinander.
- Keine Erklärungen in Klammern, die nur Entwickler verstehen: `pet.passive.skillBoost` „für Kampfformeln (kein XP, schaltet nichts frei)“ → „Zählt im Kampf wie {value} Stufen mehr in {skill}; bringt keine EP und schaltet nichts frei.“
- Tote Effekte dürfen nicht als Text überleben: `pet.passive.bonusAmmo` „Ohne Wirkung (Munition wurde aus dem Spiel entfernt)“ ist entweder zu entfernen (content-dev) oder korrekt zu beschreiben; Pfeile existieren seit 1.4 wieder.
- **Länge:** ≤ 140 Zeichen DE je Zeile, sonst zwei Zeilen.

### 3.5 Item-Flavor (Beschreibung)
- **Länge:** ein bis zwei Sätze, 60–180 Zeichen DE. Raid- und Unikat-Texte dürfen drei Sätze haben.
- **Inhalt:** Das Ding, nicht der Spieler. Herkunft, Material, eine Eigenheit. Die Welt spricht mit (Bibel § 8: Materialkunde, Asche, alte Götter). Kein „Du fühlst…“, kein Werbeton („hervorragend“, „mächtig“).
- **Mechanik im Flavor:** Nur, wenn das Item einen Effekt hat, der nirgends sonst angezeigt wird. Dann: Flavor zuerst, Doppelpunkt, dann die Wirkung in Stat-Vokabular und mit exakten Werten. „Destilliert aus der Essenz des Slayer-Turms. Für 10 Minuten: Angriffsintervall −450 ms, Krit-Chance +8 %.“ Keine Mechanik-Sätze wie „Überlegene Dauerversorgung gegenüber dem Kampftrank“.
- **Verboten:** Gedankenstrich-Pointe als Standardbauplan („…geschmiedet — leicht, schnell und grausam“). Heute 65 Content-Texte mit Gedankenstrich; jeder darf höchstens einen behalten, die meisten brauchen keinen. Semikolon durch Punkt.
- **Übersetzungstreue:** EN ist Quelle. DE-Abweichungen in der Sache (`apprentice_robe_hat` „Magie-Boost“ für „int boost“, `thornfang_blade` „Dornenkranz“ für „fang-crown“, `gk_king_shortbow` „bevor er saß“ für „before he sat a throne“) werden korrigiert.
- **974 Items ohne Beschreibung** (599 Ausrüstung, 265 Material, 93 Verbrauchsgüter, 17 Werkzeuge): Der Textpass poliert nur Bestand; ob neue Beschreibungen kommen, ist eine Chef-Frage (Umfang!).

### 3.6 Aufgabe und Chronik
- **Aufgabentext (`description`):** erster Satz die Tat mit Zahl und Ort, zweiter Satz die Welt. „Erreiche Stufe 5 in Holzfällen. Eine scharfe Axt und ein festes Herz reichen aus. Mehr verlangt die Glutfeste nicht.“ Keine Listen hinter Gedankenstrich; Aufzählung nach Doppelpunkt.
- **Zahlen** stehen als Ziffern, exakt wie im Content; Ortsnamen in Kanonform; Monsternamen wie im Bestiarium.
- **Chronik-Lore (`loreText`, 27 Kapitel):** Register „Chronik“ (§ 1). Der Wächter berichtet, was er sah und was er einträgt. Erlaubt: „Ich trage ein“, „Verzeichnet ist“. Verboten (v2): Feder, Tinte, Akte, Buch als Handelnde („Die Feder hat ihn trotzdem gekonnt“, „die Akte will ihr Ende“, Kapitel 18). Länge bleibt (90–140 Wörter), Gedankenstrich höchstens einer.
- **Tagesaufgaben:** ein Satz Tat, höchstens ein Halbsatz Farbe. Keine zweite Pointe.
- Alle Aufgabentexte sprechen den Spieler mit du an; der Wächter ist der Sprecher der Tafel.

### 3.7 Begleiter
- **Beschreibung:** drei Sätze, feste Reihenfolge: (1) Erscheinung, (2) Wirkung beim Beruf, (3) Wirkung im Kampf. Die Zahlen stehen **nicht** hier, sondern in den Effektzeilen (`pet.passive.*`), außer die Beschreibung ist die einzige Stelle (Leon: „zehn Beutewürfe statt fünf“ bleibt).
- Das Wesen ist „es“, außer es hat einen Namen (Leon: „er“). Keine Niedlichkeit, keine Haustier-Wörter (Glossar § 10).
- Fähigkeits- und Wirkungsnamen: zwei Wörter, Substantiv, Kapitälchen-tauglich („Wurzelschlinge“, „Doppelnaht“).
- Verb-Doppelungen vermeiden („speit … speit“, `glyphmaw`).

### 3.8 Erfolg
- **Name:** zwei bis drei Wörter, trägt die Welt oder ein trockenes Wort („Ein Freund in der Asche“, „Gelegenheitsarbeiten“). Englisch Title Case, deutsch normal. Keine Partizip-Monster („Hortender“, „Holzfällen-Maximiert“).
- **Leiter-Namen** je Fertigkeit (25/50/75/90/99): Geselle / Veteran / Meister / Legende / **Meisterweihe** (99; Kanon-Name der Zeremonie, statt „Maximiert“). EN: Journeyman / Veteran / Master / Legend / Maxed.
- **Beschreibung:** ein Satz, Imperativ, exakte Zahl, Glossar-Wörter: „Erreiche Stufe 99 in Holzfällen.“ Nie zwei Begriffe für dasselbe im selben Satz (`ach_total_level_1980`: „Gesamtlevel“ und „Stufe“).
- Versteckte Erfolge: Name „???“ bleibt; Beschreibung verrät nichts.

### 3.9 Patchnotes und Update-Hinweis
- **Struktur:** Titel mit Versionsname („1.4.0 Feder und Stahl“), zwei Sätze Einleitung in Wächter-Stimme (gesprochen, trocken), dann Blöcke **Neu / Geändert / Behoben**, je Punkt ein Satz mit Spielernutzen zuerst.
- Spielerbegriffe nach Glossar, keine Schlüssel, keine internen Namen (nie „Prestige“, „Alive“, „Reforged“), keine Marketing-Adjektive.
- Entwickler-Entschuldigungen sind erlaubt (Vorbild `updateNotice.point2`), kurz und sachlich, ohne „leider“ doppelt.
- Der In-Game-Update-Hinweis (`updateNotice.*`, heute noch 1.2er-Inhalte „Jagen ist neu“, „Fasern sind neu“) wird je Release neu geschrieben oder bleibt leer; alte Punkte dürfen nicht stehen bleiben.
- **Länge:** Einleitung ≤ 60 Wörter; Punkte ≤ 25 Wörter DE.

---

## § 4 Sprachspezifische Regeln (Kurzfassung für die Übersetzer-Agenten)

| | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| Anrede | tú (ist so) | **tu** (Entscheid nötig; heute gemischt) | você (ist so) | **ты** (Entscheid nötig; heute gemischt, besonders `death.*`) | 你 (ist so) |
| Satzzeichen | ¿…? ¡…! nur in Toasts | geschütztes Leerzeichen vor : ; ! ? und in « » | wie EN | «…», Gedankenstrich „—“ sparsam | Vollbreite Zeichen ，。：！？ ; **„——“ (194 Fundstellen) ist dieselbe Gedankenstrich-Regel: höchstens einer, besser keiner** |
| Prozent | 12 % | 12 % | 12 % | 12 % | 12% |
| Kurzform Level | Nvl | Niv | Nv | ур. | 级 |
| Register | neutral-duzend, keine Verkleinerungen | tu durchgängig, keine „vous“-Reste in Begleitern/Quests | você, kein tu-Rest | ты; Wächter-Zeilen im Du; kein „Вы“ im Todes-Popup | 简体, kein Spielerjargon (打本) |
| Bekannte Fallen | *cazador* (Slayer) ↔ *caza* (Jagen); *encargo* für Slayer-Auftrag und Arbeitsauftrag; *tarea/encargo/contrato* mischen | *chasseur* (Slayer) ↔ *chasse* (Jagen); *tâche/mission/contrat* für den Slayer-Auftrag mischen; „drop“ in `toast.dropRate` | *saque/espólio/drop*; *perícia/habilidade*; *raide/raid* (→ *raide*); *caçador* (Slayer) ↔ *caça* (Jagen) | *задание* für Quest und Slayer-Auftrag; 9 Slayer-Texte mit *охотник*; *питомец*; *щит* in 4 Ward-Texten | *任务* für Quest und Slayer-Auftrag; *精通/熟练*; lateinisches „Lv“ in sechs Texten; *护盾/守护* in 7 Ward-Texten |

---

## § 5 Prüfliste vor Abgabe eines Textes

1. Laut gelesen: Würde ein Mensch das so sagen?
2. Glossarwort benutzt, kein Zweitwort für dieselbe Sache?
3. Höchstens ein Gedankenstrich, kein Semikolon in Rede, keine Dreierliste als Pointe?
4. Zahlen, Namen, Werte exakt wie im Content; EN-Sachinhalt gewahrt?
5. Hinweis nennt Zustand **und** nächste Handlung?
6. Länge im Rahmen der Textsorte, Kapitälchen-tauglich, Platzhalter unverändert?
7. Keine internen Wörter (Prestige, Key, Slot-ID, Tier-Zahl, „Trash“)?

---

## Offene Fragen an den Chef (Stil)

1. **Anrede RU/FR:** ты und tu durchgängig (Empfehlung), oder höfliche Form im Interface und Du nur in der Wächter-Rede?
2. **Chronik-Register:** Die 27 Kapitel-Lore-Texte stammen aus dem v1-Register (Juli, „geschriebene Literatur“); alle späteren Wächter-Zeilen sind v2 (gesprochen). Soll die Chronik als geschriebenes Buch einen Halbton förmlicher bleiben (Empfehlung: ja, aber ohne Feder/Akte als Handelnde), oder komplett auf v2 umgestellt werden?
3. **HP/XP, Prozent-Leerzeichen, Minuszeichen:** typografische Linie wie in § 2.4 freigeben?
4. **EN Sentence case** für alle Stat-Labels und Hinweise, Title Case nur für Titel/Knöpfe/Namen: freigeben?
5. **Mechanik im Flavor:** Soll ui-dev ein eigenes Effektfeld für Items bekommen (dann wandern Zahlen aus 40 Flavor-Texten dorthin), oder bleibt die Doppelpunkt-Form im Flavor (kein Code nötig)?
