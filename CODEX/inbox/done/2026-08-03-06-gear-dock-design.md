# Design-Auftrag: Gear-Dock auf Battle-Record-Niveau bringen
**Von:** Claude (auf direkten Chef-Wunsch) · **Datum:** 2026-08-03 · **Priorität:** hoch

Mira — das Kampf-Layout, das du am 02.08. gebaut hast, hat vom Chef heute gezieltes Feedback bekommen. Chef-Zitat: „Das einklappbare Element ist gut, aber sieht designtechnisch noch nicht aus wie der Rest. Der Gear-Container soll genauso gut designed sein wie der Battle-Record-Container."

## Ist-Zustand (Referenz ANSEHEN)
`CODEX/inbox/ref/2026-08-03-gear-dock-ist-zustand.png` — der GEAR-Tab des linken Frontline-Docks. Probleme aus Designer-Sicht:
- Die Slot-Kacheln schweben als lose Inseln auf flachem Schwarz — keine Fläche, keine Struktur, kein Paperdoll-Gefühl (man erkennt die Körper-Logik der Anordnung kaum).
- Der Innenraum hat keinerlei Materialsprache (verglichen mit dem Battle Record rechts: Umber-Fläche, klare Sektionen, Rahmenhierarchie).
- Die vier Tabs oben wirken karger als der Rest der Bronze-Lipped-Iron-Familie.
- Viel toter vertikaler Leerraum zwischen den Slot-Reihen.
Der Battle-Record-Container rechts ist die Qualitäts-Messlatte — dieselbe Reife soll links stehen.

## Auftrag (dein Revier: Konzept + Assets, KEIN Produktivcode)
1. **Konzept-Mockups (2-3 Varianten, dein bewährtes HTML- oder Tafel-Muster)** für den Dock-Innenraum, mindestens für den GEAR-Tab: Wie wird aus dem Slot-Grid eine echte Paperdoll-Bühne? Denkbar (deine Entscheidung): angedeutete Körper-Silhouette/Rüstungsständer hinter den Slots, Sektions-Flächen (Waffen/Rüstung/Schmuck) auf Umber/Leder, verbindende Zierlinien zwischen den Slots, dezenter Vignette-Boden. Bestehende Slot-Assets (slot_universal-Familie) dürfen bleiben oder einen Rahmen-Aufsatz bekommen.
2. **Tabs GEAR/SKILLS/STYLE/PREP:** Vorschlag, wie die Tab-Leiste die volle Bronze-Lipped-Iron-Reife bekommt (aktiver Zustand, Hover) — konsistent mit Topbar-Tabs.
3. **Eingeklappte 44px-Leiste:** kleiner Design-Pass — die Leiste existiert funktional (rotiertes Label + Chevron), darf aber hübscher werden (schmale Zierleiste/Niete im Stil der Nachbarn).
4. **Benötigte Assets produzieren** (nach Chef-/Claude-Wahl der Variante): Flächen/Zierleisten/ggf. Silhouetten-Grafik als transparente WebP-Quellen, tile-/9-slice-tauglich nach deinen eigenen V2-Invarianten (keine Details in Stretchzonen). Staging wie üblich `CODEX/AssetControl/gear-dock-2026-08-03/`.
5. Die Skills/Style/Prep-Tabs müssen mit derselben Flächensprache funktionieren (kein Gear-Sonderweg) — im Konzept kurz zeigen.

## Rahmenbedingungen
- Layout-/Funktionsvertrag bleibt: 4 Tabs, Slot-Anordnung (3-Spalten-Paperdoll), Collapse-Leiste — es geht um Material, Fläche, Hierarchie, nicht um neue Features.
- Referenz-Qualität: der Battle Record rechts im Kampf (gleiches Spiel, `pages/CombatPage.tsx` + combat.css — nur LESEN) und deine eigenen Bank-/Shop-/Quest-Umbauten.
- Abnahme: Chef wählt aus deinen Varianten, ICH verdrahte danach (Rollenteilung wie vereinbart).

## Rückgabe
HANDOFF-Notiz mit Mockup-Pfaden (Vergleichsansicht Ist vs. Varianten wäre ideal), danach diese Datei nach `inbox/done/`.
