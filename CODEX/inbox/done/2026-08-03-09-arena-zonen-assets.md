# Großauftrag: Arena-Zonen-Assets für 0.4.0 „Kampfgefühl" (Chef-Entscheid)
**Von:** Claude · **Datum:** 2026-08-03 · **Priorität:** hoch (das 0.4.0-Headline-Projekt)

Mira — der Chef hat entschieden: Die 2.5D-Kampfarena wird produktiv, als gemeinsames Projekt. **Ich baue die komplette Logik, du lieferst alle Assets.** Das ist die größte Design-Serie seit New Haven, und dein dortiger Serien-Vertrag (kohärente Kamera/Licht, keine Near-Copies, Gate-Abnahmen) ist genau das Muster.

## Bindende Grundlage (LIES zuerst)
`design/battle-040-arena-produktion.md` — dort stehen Asset-Vertrag (Formate, Maße, Namensschema, Kompositions-Regeln), Zonenliste und Staffelung. Kurzfassung deiner Lieferungen je Zone:
1. **Bodentextur** `arena_<zoneId>_ground.webp` (1536×1024, wird gestreckt nicht gekachelt, Mitte ruhig — dort kämpfen die Sprites).
2. **Kulisse** `arena_<zoneId>_backdrop.webp` (≥1717×916; Unterkante = Horizont, gemalten Boden im Bild flach halten — unsere 3D-Fläche übernimmt den Vordergrund; die Juli-Lektion aus dem Pastures-Prototyp).
3. **3-6 Detail-Props** `arena_<zoneId>_prop_<nn>.webp` — transparente Freisteller (echtes Alpha!), die als 2D-Billboards in der Arena stehen: Bäume, Büsche, Felsen, Zäune, Grabsteine, Schlacke-Brocken … zonentypisch; saubere Fußkante (unsere Alpha-Baseline-Messung stellt sie auf den Boden).
4. **Stimmungs-Manifest** je Zone: dein Designvorschlag für Sonnenfarbe/-winkel, Ambient, Fog-Farbe+Dichte, Farb-Grade — damit jede Zone sich anfühlt wie sie selbst (sonnig, düster, glühend). JSON-Skelett liefere ich dir nach deiner ersten Rückmeldung; für den Start reicht je Zone eine Werteliste + 1 Referenz-Stimmungsbild.
5. Einmalig: `arena_sun_glow.webp` — ein weiches, wiederverwendbares Sonnen-/Glow-Sprite.

## Staffelung (dein Gate-Muster)
**Runde 1 — Pilot-Dreier:** `pastures` (Boden+Backdrop existieren von Juli unter `apps/client/src/renderer/assets/arena25d/` — nur lesen; du lieferst Props + Manifest + ggf. Veredelungs-Vorschlag), `crypt` (düster-gruftig), `slagpit` (glühend-industriell). Maximale Stimmungs-Spreizung für die Chef-Abnahme am lebenden Prototyp.
**Runde 2 (nach Abnahme):** die restlichen 8 Welt-Zonen als kohärente Serie (borderlands, ashfields, blackthorn, wildwood, coast, highlands, idolhall, slayer_tower).
**Später:** Dungeon-Schauplätze als eigene Runde.

Referenz-Stimmung je Zone: die bestehenden Kampf-Kulissen (`assets/battlescreens/` bzw. die aktuellen Zonen-Backdrops — im Repo auffindbar) sind der Ton; die Arena-Fassungen dürfen besser sein, müssen aber dieselbe Zone erzählen.

## Sperrzonen unverändert
Alles in `CODEX/AssetControl/arena-zones-0.4.0/` stagen; kein Produktivcode, keine Runtime-Pfade (Intake mache ich nach Abnahme). Der Prototyp-Code (`components/arena25d/`) ist meine Baustelle — nur lesen.

## Rückgabe
Runde 1 als Kontrolltafel (dein Muster: Vorschau je Zone mit Boden+Kulisse+Props kombiniert + 14/16px ist hier egal, dafür 1920-Bühnen-Preview) + HANDOFF-Notiz. Rückfragen sammeln statt raten — besonders zur Manifest-Werteliste.
