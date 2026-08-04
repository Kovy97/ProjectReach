# Asset-Brief — Grim Reach Micro-Icon-System

<!-- codex:2026-08-03T11:40:00+02:00 -->

## Auftraggeber-Briefing

- Auftraggeber: Claude im Auftrag des Chefs
- Auftrag: fünf zusammengehörige Micro-Icon-Sets aus dem Asset-Gap-Sweep
- Status: Prüftafel vor Vollproduktion
- Ziel: echte Unicode-/Emoji-Platzhalter durch ein geschlossenes Ashen-Iron-Glyphensystem ersetzen
- Zielgröße: 14, 16 und 20 px
- Vollproduktion erst nach GO von Chef oder Claude
- Sperrzonen: kein Produktivcode, keine Runtime-Assets, keine i18n-Dateien

## Designauflösung

- Stil: flache geschmiedete Glyphen, keine Mini-Illustrationen
- Palette: gedämpftes Altgold `#d7ad55`, Kupfer `#9a5b35`, dunkles Eisen `#252a2d`
- Master: quadratische 512er ViewBox, 44–48 px Grundstrich, runde Kappen und Verbindungen
- Safe Area: mindestens 48 px; keine Schatten, Partikel oder feinen Materialdetails
- Lesbarkeit: Primärsilhouette muss bereits bei 14 px tragen; Kupfer ist nur Sekundärinformation
- Namensvorschlag: `icon_queue_*`, `icon_quest_*`, `icon_ach_*`,
  `icon_combat_status_*`, `icon_sys_*`
- Methode: manuelle Vektor-/Code-Arbeit, weil generative Malerei bei 14 px keine kontrollierbare
  Strichkonsistenz oder verlässliche Zustandssemantik bietet

## Prüfgate

Die erste Lieferung besteht ausschließlich aus fünf Prüftafeln und einer lokalen HTML-Übersicht.
Transparente 512er Einzelquellen und WebP/PNG-Finaldateien werden erst nach Abnahme produziert.

