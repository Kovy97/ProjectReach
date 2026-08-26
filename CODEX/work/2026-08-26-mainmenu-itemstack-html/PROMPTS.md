<!-- codex:2026-08-26T17:08:00+02:00 -->
# Generierte Ergänzungsassets — Promptprotokoll

Erzeugungsweg: eingebautes ImageGen-Werkzeug im Standardmodus.

## `ashen-gate-overlay-v1.png`

- Verwendungszweck: transparentes 16:9-Foreground-Overlay für Main-Menü 01.
- Referenzen: originales `mainmenu_hero.webp` und abgenommenes Mockup `main-menu-01-ashen-gate.png`.
- Inhalt: monumentaler schwarzer Stein-/Eisenbogen, zwei Pfeiler, rote Banner, Ketten,
  Feuerschalen; große freie Mitte für Panorama, Logo und HTML-Bedienung.
- Ausschlüsse: kein Hintergrund, Logo, Text, Button oder Panel.
- Ergebnis: RGBA 1672 × 941, Alpha min 0 / max 255 / Mittel 121,36.

## `mainmenu-war-table-background-v1.png`

- Verwendungszweck: vollständiger deckender 16:9-Hintergrund für Main-Menü 02.
- Referenzen: originales `mainmenu_hero.webp`, War-Table-Propentwurf und abgenommenes
  `main-menu-02-war-table.png`.
- Inhalt: Grim-Reach-Panorama im oberen Bereich, breiter dunkler Eichentisch im unteren Bereich,
  Kampagnenkarte, Helm, Kerze, Münzen, Kompass, Siegelrolle und Schwert.
- Ausschlüsse: kein Logo, Text, Button, Panel, Charakter oder Schachbrett.
- Ergebnis: absichtlich deckendes RGB 1672 × 941.

## `itemstack-war-table-shell-v1.png`

- Verwendungszweck: deckende taktische Hintergrundschale für das interaktive Item-Stack-Modal.
- Referenzen: aktuelles Stack-Modal und abgenommenes Mockup `item-stack-02-war-table.png`.
- Inhalt: breite leere Kopfzone mit dezenter Kartengravur, Filterrail und drei eingelassene
  Arbeitszonen im Verhältnis 24/49/27; dunkle Eiche, schwarzes Leder, Eisenrahmen, Kompass,
  Siegel und leere Pergamenttitel.
- Ausschlüsse: kein Text, Helm, Item, Buttonlabel, Logo, Charakter oder Schachbrett.
- Ergebnis: absichtlich deckendes RGB 1672 × 941. Die dynamischen Inhalte bleiben HTML.

## Verworfene Zwischenstände

Zwei Main-Menü-War-Table-Freisteller lieferten trotz Alpha-Vorgabe ein gemaltes Schachbrett und RGB ohne
Alpha. Sie liegen ausschließlich unter `generated-raw/` im Work-Ordner und werden vom HTML nicht
referenziert. Es wurde kein Keying oder nachträgliches Freistellen verwendet. Stattdessen entstand
der Tisch als sauberer deckender Szenenhintergrund, für den kein Alpha erforderlich ist.
