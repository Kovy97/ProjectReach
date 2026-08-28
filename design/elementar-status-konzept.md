# Elementar-Effekte im Kampf (Konzept, Chef-GO 28.08.2026: „machen wir so“)

**Anlass:** Mit der Elementleiter gibt es Magiewaffen aller sieben Themen in jeder Phase. Chef: „Die Effekte müssen alle was Eigenes machen; Schock zum Beispiel verzögert den Angriff eines Gegners um 0,x s.“

## Ist-Stand (engine/combat.ts, shared)

| Status | heute |
|---|---|
| burn, bleed, poison | Schaden über Zeit (DoT), gleiche Mechanik mit anderer Zahl |
| frost | Gegner schlägt 40 % langsamer (`FROST_SLOW`), `frostbite`-Waffen: Zusatzschaden gegen gefrostete Ziele |
| shock | Chance, dass ein Angriff des Gegners fehlschlägt (`missReason: "shock"`) |
| Leere (bane/execute) | Zusatzschaden gegen Familie / unter HP-Schwelle, kein Status |
| Arkan, Aether | kein Status, keine eigene Mechanik |

Drei Elemente sind heute dieselbe Mechanik (DoT), zwei haben gar keine.

## Vorschlag: eine Identität je Element

| Element | Name im Spiel | Mechanik | Gefühl |
|---|---|---|---|
| **Feuer** | Brand | DoT bleibt; **Glut**: ein brennendes Ziel nimmt 10 % mehr Schaden aus allen Quellen (Rüstung wird weich) | Feuer = Druck aufbauen, Burst vorbereiten |
| **Frost** | Frost | 40 % langsamer bleibt; **dritte Frost-Anwendung friert ein**: der Gegner lässt genau einen Angriff aus, danach 6 s immun gegen Einfrieren | Frost = Tempo nehmen, Atempause |
| **Blitz** | Schock | **verzögert den nächsten Angriff des Gegners um 0,4 s je Anwendung** (Deckel 1,2 s), Chef-Idee; die alte Fehlschlag-Chance entfällt; bei Crit springt der Schock über und trifft ein zweites Mal für 30 % | Blitz = Unterbrechen, Kettenblitz |
| **Gift** | Gift | DoT, der **stapelt** (bis 5 Stapel, Schaden je Tick × Stapel), halbiert Regeneration und Lebensraub des Ziels | Gift = Langstrecke, gegen Regenerierer |
| **Leere** | Entzug | neuer Status: Ziel macht **15 % weniger Schaden** für die Dauer; `bane`/`execute` bleiben als Waffeneffekte der Leere-Waffen | Leere = Entkräften, sicherer Kampf |
| **Arkan** | Resonanz | kein Status auf dem Ziel; jeder Treffer gibt dem Zauberer **+2 % Zauberschaden je Stapel bis 10** (bestehender Effekt-Typ `momentum`, nur auf Arkan-Waffen) | Arkan = reiner Schaden, wird im langen Kampf stark |
| **Aether** | Lichtsegen | jeder Treffer **füllt 4 % des eigenen Wards** auf und **durchdringt 50 % des Gegner-Wards** | Aether = Schutz und Ward-Brecher |

Blut (bleed) bleibt die Nahkampf-DoT (Schnitt/Stoß), Brand/Gift bleiben Verzauberungen für alle Stile.

## Regeln

- Jede Mechanik muss auf der Item-Karte in einem Satz stehen (z. B. „Schock: verzögert den nächsten Angriff um 0,4 s“) und im Kampfprotokoll sichtbar sein; die Partikel-Schicht spielt das Status-Aufflammen und den Ambient-Loop.
- DPS-Parität je Stufe bleibt Pflicht (Balance-Envelope): Sekundärnutzen (Verzögern, Entkräften) wird gegen DoT-Schaden gewertet, Pins danach neu gemessen.
- Save-Kompat: Status ist Kampf-Zustand; neuer Status-Typ `void` (Entzug) braucht Sanitize-Toleranz für unbekannte Typen (bereits vorhanden: unbekannte Effekte werden verworfen), kein SAVE-Bump.
- Gegner-Elemente (Monster mit Brand/Frost/Schock) bekommen dieselben Mechaniken gegen den Spieler, damit die Regeln symmetrisch sind.

## Umsetzung (nach GO)

combat-dev: Status-Semantik (shock → Verzögerung, frost → Freeze-Zähler, poison → Stapel, burn → Glut-Malus, neuer Status `void`), Effekt-Typen für Arkan/Aether auf den Waffen (content), Item-Karten-Texte ×7, Balance-Pins; ui: Status-Icons im Kampf bekommen den Mechanik-Tooltip. Partikel-Rezepte für den neuen Status `void` (Entzug: dunkle Schlieren am Körper) ergänzen.
