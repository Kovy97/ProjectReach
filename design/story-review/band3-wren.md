# Story-Review Band 3 — Aschechronik Kap. 9–12

**Persona:** Wren Weitwald, die Weltenbummlerin · **Archetyp:** Explorer
**Revier:** `chronicle_09`–`chronicle_12` (Schwarzdornwald → Krypta → Krypta-Dungeon → Wildwald)
**Datum:** 2026-07-14 · Content-Stand `packages/content/src/index.ts`

## 1. Persona-Steckbrief

Ich bleibe wegen der Welt, nicht wegen der Zahlen. Ein Gebiet muss sich eigen anfühlen — eigener Ton, eigene Gegner, eigene Regeln. Ich probiere gern Stile durch und will, dass die Reise mich weiterzieht, statt mich dasselbe fünfzehnmal töten zu lassen. Wiederholung langweilt mich schneller als schwere Kämpfe. Meine Kernfrage an jedes Kapitel: *Fühlt sich das hier anders an als das davor — und gibt mir das Ziel einen Grund, das ganze Gebiet zu sehen, statt nur einen Mob zu farmen?*

**Machbarkeit (headless belegt):** Eigener Devserver Port 5266, read-only gegen echten Content über `window.__hfDebug` (`apps/client/ui-audit/review-c3-wren.mjs`, Wegwerf, wieder entfernt). Alle Checks grün: requires-Kette 08→09→10→11→12 lückenlos, jedes Ziel-Monster existiert, Gate-Kette sequenziell begehbar, `dg_skeleton_nekro`→`skeleton_nekro`-Kill-Credit bestätigt. Zonen-Kennzahlen (offenes Feld, ohne dungeonOnly/dg_):

| Zone | Mobs | Familien | Defense-Typen | Statuseffekte |
|---|---|---|---|---|
| Schwarzdornwald (L45–65) | 10 | Pflanze 6 / Bestie / Untot / Konstrukt / Humanoid | armor 6, evasion 2, ward 2 | poison |
| Krypta (L65–90) | 9 | Untot 8 / Konstrukt 1 | armor 4, ward 4, evasion 1 | bleed, frost, burn, poison |
| Wildwald (L90–120) | 4 | Bestie 4 | evasion 4 | bleed |

Das ist die Kernbeobachtung meines Reviers in einer Tabelle: Schwarzdorn ist bunt, die Krypta ist mechanisch am reichsten, der Wildwald ist eine Monokultur.

## 2. Kapitel

### chronicle_09 — Der Chor unter den Hügeln / The Choir Beneath the Barrows
- Spaß: 7/10
- Einfallsreichtum: 8/10
- Machbarkeit: 10/10
- Notiz: Der Schwarzdorn ist die eigenwilligste Zone des ganzen Bands — Wurzlinge, Baumriese, Moosgolem, Geisterhirsch, Rankenhexe, und mittendrin der Hügelgrab-Chorist als untoter Fremdkörper, der schon kryptenwärts singt. Als Entdeckerin liebe ich diese Brücke: Ein Untoter in der Lebender-Wald-Zone kündigt das nächste Gebiet an, bevor ich es betrete. Wermutstropfen: Das Ziel schickt mich auf *einen* Mob (15× Chorist) + Boss, während die Zone zehn distinkte Gegner hätte. Ein Gebiet mit dieser Vielfalt verdient ein Ziel, das mich durch mehr als eine Grabreihe führt.
- Bug/Blocker: keiner. Beide Ziele in `blackthorn` (seit ch7 offen), Abschluss öffnet die Krypta — verifiziert.

### chronicle_10 — Das gebrochene Siegel / The Broken Seal
- Spaß: 8/10
- Einfallsreichtum: 8/10
- Machbarkeit: 10/10
- Notiz: Mein Lieblingskapitel des Bands, und zwar genau aus Explorer-Gründen. Das Ziel „40 Skelette (aus sechs Typen) + 10 Hohler Chor" zwingt mich, die *ganze* Garnison zu treffen statt einen Mob zu grinden — Krieger, Schütze, Speer, Schlächter, Eismagier, Pyroklast, dazu der Ward-Wall des Hohlen Chors. Die Krypta ist mechanisch das dichteste Gebiet: alle drei Defense-Typen, alle vier Statuseffekte an einem Ort. „Die gebrochene Ordnung besichtigen" ist keine Farm-Phrase, sondern beschreibt exakt, was ich tue. So sieht Anti-Monotonie aus.
- Bug/Blocker: keiner. Krypta seit ch9 offen, alle 7 Ziele präsent, Abschluss öffnet `crypt_depths` — verifiziert.

### chronicle_11 — Der Fürst der Tiefe / The Lord of the Depths
- Spaß: 7/10
- Einfallsreichtum: 8/10
- Machbarkeit: 10/10
- Notiz: Erzählerisch der Höhepunkt — der letzte Kastellan, „müde geflüstert" von einer fremden Stimme, der Sieg, der sich nicht wie einer anfühlt. Als Spielerin trägt mich dieser Zweifel weiter als jeder Loot. Der Explorer-Haken: Es ist ein reiner Einzelboss und bleibt in derselben Krypta — kein neues Land, zwei Kapitel in Folge im selben Gebiet. Der Nekromantenfürst ist mechanisch solide (Ward + Gift + Regen + Enrage), aber ich betrete nichts Neues. Die Story rettet das Kapitel; die Geografie tritt auf der Stelle.
- Bug/Blocker: keiner. `skeleton_nekro` offen im Krypta-Feld *und* als `dg_`-Dungeonboss; Kill-Credit-Alias `dg_skeleton_nekro`→`skeleton_nekro` bestätigt. Abschluss öffnet den Wildwald — verifiziert.

### chronicle_12 — Die Riesen / The Giants
- Spaß: 6/10
- Einfallsreichtum: 6/10
- Machbarkeit: 10/10
- Notiz: Der ehrliche Schwachpunkt des Bands aus meiner Sicht. Ein neues Gebiet — das begrüße ich —, aber der Wildwald ist mechanisch die dünnste Zone: vier Bestien, alle auf Ausweichen, nur Blutung. Das Ziel verlangt 30 aus nur zwei davon (Grauwolf + Wildhirsch), also „töte-N-von-zwei". Nach der reichen Krypta-Garnison fühlt sich „Riesenwolf, Riesenhirsch" für eine Entdeckerin, die in den Weiden schon Wolf und Vieh gesehen hat, nah an einer Vergrößerungs-Reskin an. Das Konzept „gesunde Natur, der Mensch als Acker statt Krone" ist ein starker Gedanke und schöne Drazhan-Vorbereitung — aber der Gedanke ist besser als das, was ich dabei bekämpfe. Kanonisch ist die Monokultur gewollt; mein Explorer-Bauch bleibt trotzdem hungrig.
- Bug/Blocker: keiner. Wildwald seit ch11 offen, beide Ziele präsent, Abschluss öffnet `wildwood_hunt` — verifiziert.

## 3. Fazit (Band-Bogen)

Die Reise selbst stimmt: Schwarzdorn → Krypta → Krypta-Tiefe → Wildwald ist ein sauberer, sequenziell erreichbarer Weg, und die *Form* der Ziele variiert wohltuend (15+Boss / 40-aus-6 + 10 / 1-Boss / 30-aus-2) — echte „töte-N-von-X"-Monotonie über den ganzen Band gibt es nicht. Die Krypta (ch10/11) ist der Glanzpunkt an Zonen-Identität. Die zwei Dellen für eine Weltenbummlerin: **ch11 tritt geografisch auf der Stelle** (zweites Krypta-Kapitel ohne neues Land, nur durch die Story getragen), und **ch12 landet in der ärmsten Zone** mit dem am wenigsten abwechslungsreichen Ziel. Wenn irgendwo nachgeschärft wird, dann dort: dem Wildwald ein, zwei mechanisch andersartige Gegner geben (ein nicht-Ausweichen-Riese, ein anderer Statuseffekt) und ch12s Ziel auf drei Zieltypen öffnen — dann fühlt sich das letzte satte Land auch so an.
