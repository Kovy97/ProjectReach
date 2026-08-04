# Auftrag: 0.3.0-Event-Artwork + Icon-Nachschlag + NH-Ausbau-Konzepttafeln
**Von:** Claude · **Datum:** 2026-08-03 · **Priorität:** 1 hoch, 2-3 normal

Mira — die 37 Icons sind in der Verdrahtung (sauberes QA-Paket, die SHA-Dedupe-Doku war vorbildlich). Drei neue Pakete, nach Priorität:

## 1. Event-Artwork für den 0.3.0-Launch (HOCH — fürs Sichtbarkeits-Event)
Für die Steam-Event-Ankündigung „New Haven" brauchen wir im etablierten Patch-Vorlagen-Look (dunkles Pergament/Ashen Iron, zentrierter Titel — Referenz: das Event-Artwork der 0.2.0-„Champions of the Reach"-Kapseln, im Workspace unter den Steam-/Marketing-Ablagen auffindbar; falls du sie nicht findest: Rückfrage statt raten):
- **Kapsel 800×450** und **Header 1920×622**
- Motiv: New Haven — Wachfeuer/Lager-Silhouette bei Abendlicht, Palisaden-Andeutung, KEINE Kreaturen-Assets (bewährte Kapsel-Regel), Titeltext „New Haven" prominent, Platz für kleine Unterzeile.
- Ziel: screenshot-stark neben echten Spiel-Screenshots bestehen (die liefere ich aus der App).
- Staging: `CODEX/AssetControl/event-0.3.0/` mit Vorschau in Zielgröße.

## 2. Icon-Nachschlag (KLEIN — aus deinem eigenen Sweep, Punkt 8)
Für den Footer-Text/Icon-Split (💾/↩ raus aus den lokalisierten Strings): **`icon_sys_save`** und **`icon_sys_back`** im exakten Stilvertrag der 37 (gleiches Strichgewicht, Flat-Gold/Kupfer, transparent, 512² PNG+WebP, 14/16/20-px-Prüfstreifen). Ablage zu den anderen: `micro-icon-sets-2026-08-03/05-system-empty/production/`. Kein separates GO nötig — Stilvertrag ist abgenommen, direkt produzieren.

## 3. Konzepttafeln: New Havens sichtbares Wachstum (KONZEPT, nicht bindend)
Wir planen gerade den New-Haven-Ausbau (drei Design-Docs entstehen parallel). Die Lore gibt den Bogen vor: **Wachfeuer → Zeltring → Palisade → wiederhergestellte Wegstation mit Glockenturm** (`design/lore/encampment-lore.md`). Erarbeite 2-3 **Konzepttafeln**, wie der KARTENGRUND (die Lagerfläche selbst, nicht die Gebäude) diese Stufen sichtbar erzählen könnte — z. B. Zeltring-Spuren, Palisadenring am Rand, Wegstation/Glockenturm als festes Landmark. Zweck: Entscheidungsgrundlage für den Chef, ob „sichtbares Wachstum" in die Ausbau-Roadmap kommt. Reine Konzeptarbeit in `CODEX/work/newhaven-growth-concepts/`, Format frei (Tafeln/Mockups über dem echten Kartengrund `assets/camp/camp_map_day.webp` als Basis erlaubt — nur lesen, nicht verändern).

## Sperrzonen unverändert
Kein Produktivcode, keine Runtime-Pfade, keine i18n. Rückgabe je Paket via HANDOFF; diese Datei nach `inbox/done/`, wenn alle drei geliefert sind.
