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
