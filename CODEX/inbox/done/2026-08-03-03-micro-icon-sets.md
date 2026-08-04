# Auftrag: Fünf Micro-Icon-Sets (aus deinem Gap-Sweep)
**Von:** Claude · **Datum:** 2026-08-03 · **Priorität:** normal (nach aktuellem Release-Fenster einsetzbar)

Mira — dein Emblem ist abgenommen und bereits produktiv: einmal als `assets/ui/icon_newhaven.webp` (Verdrahtung in die Boost-Zeilen folgt durch mich) und einmal im Auto-Discovery-Slot `assets/sidebar/sidebaricon_newhaven.webp`, wo es das geerbte Stadt-Icon ersetzt — genau wie du es in deinem Sweep als Kandidat markiert hattest. Sauber bei 14 px, gute Arbeit.

Dein Gap-Sweep ist die Grundlage dieses Auftrags: Wir beauftragen deine fünf empfohlenen Sets, in genau deiner Priorisierung.

## Auftrag (je Set: erst Prüftafel, dann Vollproduktion)
1. **Action-Queue-Micro-Set** (4–6 Icons: Queue/Liste, Warnung, Zeitblock/Blockiert, Priorität/Start, Pfeile) — ersetzt 📋 ⚠ ⏳ ⚡ in `ActionQueuePanel`.
2. **Quest-Semantik-Set** (Ticket, Orts-Pin, Sprechblase/Dialog, Kalender, Journal/Buch, Münze) — für die Contract Wall.
3. **Achievement-Kategorien** als geschlossenes 10er-Set (Trophäe, Schmieden, Kampf, Natur, Handwerk, Schriftrolle, Gold, Geschenk, Kompass, Stern) + Milestone-Trophäe + Lupe.
4. **Combat-Status-Micro-Set** (Heilquelle Blut/Tod/Zauber, Kill, Immunität, Boss/Dungeon, Regeneration).
5. **System/Empty-State-Set** (Warnung, Schlaf/Idle, Brief/Mail, Ordner, Checkbox an/aus als echte Grafikzustände).

## Verbindliche Spezifikation (deine eigene Empfehlung, jetzt Vertrag)
- Gemeinsames Strichgewicht/Stil über ALLE fünf Sets — monochrom/duoton in der Ashen-Iron-Palette (gedämpftes Gold/Kupfer auf transparent), damit sie wie EIN System lesen.
- Je Set zuerst eine **14/16/20-px-Prüftafel** (wie deine Emblem-Preview) zur Abnahme durch Chef/mich — erst nach GO die Vollproduktion. Eine hübsche 512er-Quelle allein gilt nicht als Nachweis (dein Satz, er ist jetzt Gesetz).
- Transparentes Alpha, quadratisch, Quelle 512 px; Benennung nach Absprache bei Lieferung (ich schlage `icon_q_*`/`icon_quest_*`/`icon_ach_*`/`icon_cs_*`/`icon_sys_*` vor — Gegenvorschlag willkommen, du hast den besseren Namensüberblick).
- Staging wie üblich unter `CODEX/AssetControl/`; Verdrahtung mache ich pro Set, sobald es abgenommen ist.

## Sperrzonen
Unverändert: kein Produktivcode, keine Runtime-Asset-Pfade, keine i18n-Dateien (dort läuft gerade ein Claude-Lokalisierungs-Pass).

## Rückgabe
Pro Set eine HANDOFF-Notiz mit Prüftafel-Pfad; nach allen fünf diese Datei nach `inbox/done/`.
