# Offen für 1.2.1 (Stand 29.08.2026, nach dem 1.2.0-Release)

Alles hier ist bewusst **nach** 1.2.0 verschoben. Nichts davon ist spielerkritisch.

## 1. Auto-Flucht (Chef-Auftrag 29.08., am selben Tag auf 1.2.1 verschoben)

Chef wörtlich: „Mach einfach einen Button rein den man ankreuzen kann. ‚Flee when HP is lower than x%'
In die Prep Sektion, mit Slider wo spieler die HP hin und her schieben können. Also wenn jemand auf 20 %
dann flieht der Charakter mit 20 % HP."

**Anlass:** Seit 1.2.0 überspringt die Warteschlange nach einem Tod den laufenden Eintrag. Messung im
Engine-Lauf: geht nachts das Futter aus, stirbt der Held auch in gewinnbaren Kämpfen — eine
20-Einträge-Queue ist nach 4 Minuten leer (20 Einträge, 10 Tode). Die Auto-Flucht ist die Antwort darauf.

**Spec (aus dem abgebrochenen Bau, Stand war: shared/engine/persistence angefangen):**

- Zustand `character.autoFlee = { enabled: boolean; hpThreshold: number }`, Default `{ false, 0.2 }`.
  Vorlage in allem: `character.autoPotion` (shared `ItemDef`-Nachbarschaft, Setter `engine/combat.ts`,
  Sanitize `persistence/index.ts`, UI-Komponente `CombatAutoPotion` in `CombatPage.tsx`).
- **SAVE_VERSION 86 → 87** mit Migration (Alt-Saves bekommen den Default) und Kompat-Vault-Fixtures.
- Engine: im Kampf-Tick **nach** Auto-Eat und Auto-Trank prüfen (solange Futter da ist, wird gegessen);
  bei `hp / maxHp <= hpThreshold` den Kampf wie eine Flucht beenden — kein Tod, keine Todes-Statistik.
- **Warteschlange (der knifflige Teil):** Der Eintrag bleibt mit Rest-Ziel an der Front, und ein
  Kampf-Eintrag **startet nicht**, solange die HP auf/unter der Schwelle liegen. Ohne dieses Start-Gate
  entsteht eine Sofort-Wiederflucht-Schleife: fliehen bei 20 %, Queue startet neu, sofort wieder fliehen.
  Der Held regeneriert außerhalb des Kampfes (1 % Max-HP/s) und nimmt von selbst wieder auf. Gilt auch
  für Dungeon-Läufe und im Offline-Nachholen.
- Client: dritter Block in der Prep-Sektion unter Auto-Eat und Auto-Trank, Ankreuzfeld + Regler
  (5 % bis 90 %, 5er-Schritte, Regler ausgegraut wenn nicht angekreuzt), Hinweistext, Protokollzeile
  bei Auslösung. Texte in allen 7 Sprachen.
- Fertige Ankündigungstexte für Patchnotes und die vier Steam-Fassungen liegen im Scratchpad
  (`flee_texts.py`) — nur noch einsetzen.

## 2. Aus den Prüfberichten vom 29.08. (P2, alle nicht spielerkritisch)

- **Toter Pause-Block im Warteschlangen-Panel** (`ActionQueuePanel.tsx` ~752–768): Seit dem
  Überspringen-Umbau setzt keine Engine-Stelle mehr `queuePaused = true`; der Block samt
  „Fortsetzen"-Knopf und die Schlüssel `queue.paused`/`queue.resume` sind nur noch über Alt-Saves
  erreichbar. Entweder mit dem nächsten SAVE-Bump entfernen oder einen echten Pause-Knopf nachrüsten.
  Der Kommentar ist bereits auf „Legacy-Pfad" korrigiert.
- **Kein Sammelzähler für übersprungene Einträge:** `lastQueueSkip` hält nur den letzten. Nach einer
  Nacht mit 20 Skips sieht der Spieler eine einzige Zeile, und das Todes-Popup schluckt den
  Offline-Batch ganz (`DeathPopup.tsx` diffed gegen einen leeren Start-Schnappschuss). Vorschlag:
  Zähler statt Einzel-Breadcrumb oder ein Abschnitt im Offline-Bericht („x Einträge übersprungen, y Tode").
- **Steam-Statistiken werden pro Erfolg einzeln gespeichert:** `steam.ts` ruft `activate()` in einer
  Schleife, jedes davon löst `StoreStats` aus — beim ersten Start nach dem Update leicht 30 bis 40 Stück
  am Stück. Geht praktisch durch, ein Bündeln wäre sauberer.
- **Attributkarten brechen hässlich um** bei 1366×768 und 1600×900: „KON-STI-TU-TION", „GLÜC-K"
  (`.cs-attr-card`, 47 px). Nicht neu, passt aber ins Thema des Branches.
- **Abwehr-Knopf 16 px höher als der Fokus-Knopf** bei 1366×768 auf Deutsch, weil die Wirkungszeile
  dort umbricht. Rein kosmetisch; Kürzen der Wirkungszeile wäre der Fix.
- **`NEW_HAVEN_RISES` sitzt auf der Decke:** verlangt 45 Gebäudestufen, erreichbar sind genau 45
  (16 Gebäude × 3, minus die deaktivierte Taverne). Jede weitere Gatterung macht den Steam-Erfolg
  unmöglich — beim Taverne-Update (1.3.0) mitdenken.

## 3. Aus 1.2.0 bewusst vertagt

- **Götzenhalle als Kampfgebiet** → 1.3.0 (Chef-Entscheid). Dann `ach_elite_uniques_all` von 27 zurück
  auf 29 und `THE_NINTH_WARDEN` wird erreichbar. Details im Patchnotes-Abschnitt 1.3.0.
- **Fernkampf-Rework** → späteres Update (Chef 28.08.).

## 4. Chef-Merkliste 29.08.2026

### 4.1 Dual Wield für Einhandwaffen (einführen/planen)

Zwei Einhandwaffen gleichzeitig führen. Bewusst als **Planung zuerst**, nicht als Schnellschuss —
die Entscheidungen davor:

- Was ersetzt das Schild? Heute hängt `blockChance` am Schild und wird als MAX genommen (nicht summiert),
  Zweihänder haben `blockChance` 0 und bekommen dafür einen armorRating-Bonus (Rüstungs-Trinität §5).
  Dual Wield ist die dritte Variante und braucht ein eigenes Gegenstück (z. B. mehr Angriffstempo oder
  Trefferchance statt Block).
- Angriffsformel: eine Waffe pro Schlag abwechselnd, oder Haupthand + anteilige Nebenhand? Die
  Waffe bestimmt heute den Kampfstil (`weaponStyle`) — zwei Waffen mit verschiedenen Stilen müssen
  geregelt sein.
- Waffeneffekte: Beide Waffen tragen `weaponEffect` (Brand, Frost …). Beide anwenden wäre doppelte
  Statusrate, das trifft direkt die Elementar-Mechanik aus 1.2.0.
- Zauberfokus/Spanne: gilt nur für die Haupthand?
- UI: zweiter Waffen-Steckplatz auf dem Charakterbogen, Kit-System und Item-Karten ziehen mit.
- Balance-Pins: `balance-envelope` misst je Stil; Dual Wield braucht einen eigenen Eintrag, sonst
  verschiebt es die Parität lautlos.

### 4.2 Ringe und Halsketten kontrollieren (Spielerfeedback)

**Spieler:** „Lvl 55 rings — Diamond ring have 7 atributes and 2 skills, but Grave Warden Band have
only 4 atributes and nothing else. Is it a bug with displaying some special abilities (like with
legendary cape) or I miss something?"

**Befund (geprüft am Katalog 29.08.): kein Anzeigefehler, ein echter Balance-Fehler.**

| Item | Stufe | Attributpunkte | Skill-Boost | Wert | Seltenheit |
|---|---|---|---|---|---|
| `diamond_ring` | Juwelierskunst 55 | **7** (dex 1, con 4, lck 2) | attack +2 | 1200 | rare |
| `grave_warden_band` | Juwelierskunst 55 | **4** (con 4) | keiner | **2200** | rare |

Gleiche Anforderung, gleiche Seltenheit, strikt schlechter — und fast der doppelte Preis. Der Ring
trägt auch sonst nichts (kein Waffeneffekt, kein Sondereffekt). Ursache ist vermutlich die Umstellung
vom 25.08. („toter defence-Boost → +2 con", Kommentar steht an beiden Items): der Grabwächter-Reif
lebte von seinem Verteidigungswert und wurde beim Ersetzen nicht neu bewertet.

**Aufgabe:** kompletter Durchgang durch Ringe und Amulette, nicht nur diese beiden. Weitere
Auffälligkeiten aus derselben Auswertung:

- `bloodstone_amulet` (48, 10 Punkte, Wert 1200) gegen `diamond_amulet` (60, 11 Punkte, Wert 1500):
  zwölf Stufen Unterschied für einen einzigen Attributpunkt.
- Amulette tragen ab Stufe 48 fast nie einen Skill-Boost, Ringe fast immer — gewollt oder Zufall?
- `ring_master_jewelcrafting` (99, legendär) hat nur 4 Attributpunkte, lebt also von seinem
  `masterPerk`. Genau hier setzt die Rückfrage des Spielers an: **prüfen, ob `masterPerk` und
  vergleichbare Sondereffekte auf der Item-Karte überhaupt angezeigt werden.** Wenn nicht, sieht ein
  legendärer Meisterring auf der Karte schwächer aus als ein Ring der Stufe 55 — dann ist es
  zusätzlich ein Anzeigefehler, und der Spieler hat mit seiner Vermutung teilweise recht.

Danach: Balance-Pins neu messen und mit Chef-GO-Kommentar setzen.

### 4.3 Schriftumschaltung (Chef 29.08.2026, für 1.2.1)

Chef: „Font switching. Es wurde bemängelt, dass der Font an Stellen schlecht zu lesen ist."

**Ausgangslage (geprüft):** Die Hausschrift hängt an zwei CSS-Variablen in
`apps/client/src/renderer/styles/base.css:90-91`:

- `--font-head` = **IM Fell English SC** (Georgia als Rückfall) — erbt der Body und **sämtliche
  Controls**, gilt also appweit. Das ist die Schrift, die bemängelt wird: eine historisierende
  Kapitälchen-Antiqua mit unruhiger Grundlinie, die in kleinen Größen und bei langen Zahlenreihen
  schwer zu lesen ist.
- `--font-info` = **Cinzel** für Überschriften und Werte.
- Die Ziffernschicht **Grim Reach Numerals** liegt bereits als eigene Familie davor und deckt nur
  Ziffern und Rechenzeichen ab (`base.css:19-30`).

Beide Variablen werden über alle Stylesheets hinweg konsequent benutzt (über 30 Dateien greifen auf
`var(--font-head)` zu). **Die Umschaltung ist deshalb billig:** eine Option, die auf dem Wurzelelement
eine Klasse oder ein `data-font`-Attribut setzt, das die beiden Variablen neu definiert. Kein einziges
Stylesheet muss angefasst werden.

Für Chinesisch, Russisch und die übrigen Sprachen gibt es bereits eigene Stacks
(`base.css:98-104`) — die Umschaltung muss diese Sprachregeln respektieren und darf sie nicht
überschreiben.

**Vorschlag:**

| Modus | `--font-head` | Wofür |
|---|---|---|
| **Atmosphäre** (Vorgabe) | IM Fell English SC | wie heute |
| **Klar** | eine ruhige Serifenschrift ohne Kapitälchen | bessere Lesbarkeit, Stimmung bleibt |
| **Maximal lesbar** | eine Grotesk mit hoher x-Höhe | Barrierefreiheit, bewusst ohne Stimmung |

Zu klären: (a) Welche zwei Schriften kommen dazu — sie müssen gebündelt werden, das Spiel lädt keine
Schriften aus dem Netz (`fonts/`-Ordner, OFL-Lizenz Pflicht). (b) Wird nur `--font-head` umgeschaltet
oder auch `--font-info`? (c) Gehört eine getrennte Schriftgrößen-Stufe dazu, oder reicht die Schriftwahl?
Der Branch heißt nicht ohne Grund `feat-1.0.1-ui-skalierung` — Größe und Schrift sind dasselbe Thema.

**Aufwand:** gering, sofern die Schriften feststehen. Option, Zustand im Spielstand oder in den
lokalen Einstellungen, drei Zeilen CSS je Modus, Texte in 7 Sprachen.
