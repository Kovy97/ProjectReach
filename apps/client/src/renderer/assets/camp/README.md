# Lager-Gebäudebilder (New Haven, 0.3.0)

Ablage für die Gebäude-Art des New-Haven-Screens. Auto-Discovery über `src/renderer/campArt.ts` —
Datei hier ablegen genügt, es ist KEIN Code-Eintrag nötig.

## Dateiname

```
<buildingId>_<stufe>.webp
<buildingId>_<stufe>_night.webp
```

- `<buildingId>` = die ID aus `content.campBuildings` (siehe Liste unten).
- `<stufe>` = `1` bis `3` (Stufe I bis III).
- `.png` funktioniert auch; liegen beide Formate zur selben Stufe, gewinnt `.webp`.
- Die Tagfassung hat keinen Zusatz, die deckungsgleiche Nachtfassung endet auf `_night`.

## Fallback-Verhalten

- Fehlt die exakte Stufe, sucht die UI abwärts zur nächstniedrigeren VORHANDENEN Stufe ≥ 1.
  Wer also nur `_1` liefert, dessen Gebäude sieht auf II und III noch aus wie auf I.
- Stufe `0` greift bewusst NICHT auf die gebauten Bilder zurück — ein leerer Bauplatz darf nie
  wie ein fertiges Haus aussehen.
- Fehlt alles, zeichnet die Karte ihren Platzhalter (Silhouette im gestrichelten Rahmen). Nie ein Emoji.
- Fehlt eine Nachtfassung, nutzt die UI zuerst die Tagfassung derselben Stufe und erst danach die
  übliche Stufen-Fallback-Treppe.

## Bildformat

Die Gebäudequellen sind quadratische RGBA-Sprites. Die Dorfkarte setzt sie mit
`object-fit: contain` und `object-position: center bottom` auf ihre Grundfläche; die Listenansicht
zeigt denselben Sprite in ihrem 16:9-Bildfenster.

<!-- codex:2026-07-30T22:30:00+02:00 — produktiver Vertrag für die freigegebene Tag-/Nacht-Art. -->
## Erwartete Dateien (15 Gebäude × 3 Stufen × Tag/Nacht)

```
camp_townhall_1.webp        camp_townhall_1_night.webp
camp_townhall_2.webp        camp_townhall_2_night.webp
camp_townhall_3.webp        camp_townhall_3_night.webp

…dasselbe Paarmuster für alle 15 IDs aus `content.campBuildings`.
```

Gebäude besitzen keine eigene Stufe-0-Grafik. Dafür sind die generischen, deckungsgleichen Paare
`camp_slot_empty_<day|night>.webp`, `camp_site_<day|night>.webp` und
`camp_scaffold_<day|night>.webp` zuständig. Der Kartengrund liegt als
`camp_map_<day|night>.webp` daneben.

Der Renderer wählt die lokale, rein kosmetische Lichtphase zwischen 07:00 und 19:00 Uhr als Tag;
die Engine und der Save-State bleiben davon unberührt.

<!-- codex:2026-08-02T22:31:00+02:00 — produktiver Encampment-V3-Vertrag nach Chef-GO. -->
Seit Encampment V3 liegen produktive Gebäudesprites und generische Bauzustände als transparente
1536 × 1536 WebP-Dateien vor. Die 1672:941-Kartengründe werden in 3344 × 1882 ausgeliefert. Der
vorherige vollständige Runtime-Satz liegt rückrollbar unter
`CODEX/backups/new-haven-runtime-before-encampment-v3-2026-08-02/`.

## Zusätzlich (optional)

`src/renderer/assets/sidebar/sidebaricon_newhaven.webp` — eigenes Sidebar-Icon. Solange es fehlt,
erbt der Eintrag `sidebaricon_city.webp` von der stillgelegten Stadt-Seite; ein abgelegtes
`sidebaricon_newhaven.webp` übernimmt automatisch.
