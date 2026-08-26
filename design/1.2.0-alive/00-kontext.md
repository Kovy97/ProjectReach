# 1.2.0 „Alive" — Brainstorm-Kontext (26.08.2026)

> Chef-Auftrag (wörtlich): „Fangen wir mit 1.2.0 an! Wir wollen mit diesem Update die Welt lebendiger
> machen, besseres Aufgabensystem, bessere/mehr Quests und Daily-Vielfalt. Einfach Ideen, wie die Welt
> lebendiger sein könnte." Mira (Designerin) kümmert sich parallel um neue Start-Charakter-Assets.

## Was das Spiel ist

Grim Reach, Dark-Fantasy-Idle-RPG auf Steam (1.1.0 gerade veröffentlicht). Tick-basierte Engine,
Offline-Fortschritt (8 h Cap), eine Aktion zur Zeit plus Warteschlange (Skills, Monster, Dungeons
1×/25×/50×/∞, New-Haven-Bauten). Drei Kampfstile (Nahkampf/Fernkampf/Magie), 16 Skills, Slayer-Turm
mit Aufträgen von Brenna, Verzauberung (Runen/Suffixe), Begleiter, Meisterschaft, Erfolge, Bank,
Läden (Gold, Slayer-Punkte, Quest-Tokens), Bestiarium, Item-Wiki, New Haven (Stadt-Ausbau).

## Was heute an „Welt" existiert (Fakten aus dem Code)

- **Quests:** 38 statische Quests (`QuestDef` in packages/shared: objectives, rewards, tokenReward,
  requires-Ketten, optional `loreText` = Chronik-Erzähltext des Wächters, `repeatable`). Chronik-
  Kapitel schalten Zonen, Dungeons und Regale des Belohnungsladens frei. Anzeige: `pages/QuestsPage.tsx`.
- **Dailies:** 60 Daily-Defs (Pool, Deckel `maxTotalLevel`; leicht 150–300, mittlere Kill-Dailies 600),
  Belohnung Quest-Tokens; Token-Shop mit sechs Kapitel-Regalen (47 Angebote, 7 Kapitel-Andenken).
- **NPCs:** faktisch nur Brenna (Slayer-Meisterin) und „der Wächter" (Erzählstimme der Chronik). Keine
  NPC-Definitionen im Content, keine Dialoge, keine Schauplätze für NPCs außer Slayer-Seite/Chronik.
- **Zeit/Ereignisse:** Wochentags-Segen (`packages/engine/src/blessing.ts`, z. B. Samstag Blutmond:
  15 % Doppelbeute). Sonst keine Weltereignisse, kein Tag/Nacht, kein Wetter, keine Jahreszeiten.
- **New Haven:** Gebäude mit Bauwarteschlange, Boni; keine Bewohner, keine Besucher, keine Vorfälle.
- **Lore:** `design/lore/` (weltlore-grim-reach.md, aschechronik-spec.md, encampment-lore.md,
  newhaven-ausbau-erzaehlung.md, player-character-codex.md, slayer-tower-lore.md, waechter-stimme-pack.md).
- **Begleiter:** `companions` (Sammel-/Kampfhelfer mit Bildern), passiv.
- **Elite-Kodex:** Champions je Zone (Bestiarium-Tab), Erstfund-Flip.

## Harte Regeln für Ideen

1. Idle bleibt Idle: alles muss offline und in der Warteschlange funktionieren; kein Echtzeit-Zwang.
2. Keine MMO-Features (kein Chat, keine Minimap, keine Party/Freunde; Citadel-Regel).
3. Kampf ist fundamental: kampf-gegatete Materialien nicht über Shop/Sammeln umgehen.
4. Saves bleiben kompatibel (Migration ja, Bruch nie). Neue Systeme additiv.
5. Texte natürlich, max. ein Gedankenstrich je spielersichtbarem Text; 7 Sprachen (EN/DE + 5 Overlays).
6. Art-Kapazität: Mira ist auf Start-Charaktere gebucht. Ideen dürfen Bilder brauchen, aber je Idee
   angeben: geht mit Bestands-Assets (Porträts, Embleme, Zonenbilder, Item-Bilder) oder braucht Neues.
7. Umfang: ein Update, grob 4–6 Wochen mit parallelen Agenten. Lieber wenige Systeme, die zusammen
   „leben", als zwanzig Mini-Features.
8. Knopf-Familie und Stil bleiben (Stahlrahmen, Leder/Basalt); Vorschläge dürfen neue Seiten/Modale
   skizzieren.

## Was der Chef hören will

- Wie fühlt sich „lebendig" in einem Idle-Spiel an, das man stundenlang nebenbei laufen lässt?
- Ein Aufgabensystem, das besser ist als „Tafel mit 60 Zufallszetteln": Vielfalt, Rhythmus, Sinn.
- Mehr und bessere Quests: Ketten, Figuren, Orte, Entscheidungen, Wiederkehr.
- Daily-Vielfalt: nicht nur „töte 20 X", sondern Tageslaunen der Welt.
- Alles mit Blick auf Idle-Rhythmus: morgens reinschauen, abends ernten.

## Ausgabe je Agent

Datei `design/1.2.0-alive/brainstorm-<perspektive>.md`, Deutsch, Struktur:
1. Drei Leitgedanken (je 2–3 Sätze), was „Alive" aus deiner Perspektive bedeutet.
2. 8–12 konkrete Ideen, je: Name, Spielererlebnis in 3 Sätzen, wie es mit Engine/Idle-Rhythmus
   funktioniert, Art-Bedarf (Bestand/neu), Aufwand (S/M/L), Risiko, Abhängigkeiten.
3. Ein „Tag im Leben" eines Spielers mit deinen Ideen (morgens/mittags/abends, 10 Sätze).
4. Drei Fragen an den Chef, die die Richtung entscheiden.
5. Was du an den Ideen der anderen Perspektiven gern kritisch prüfen würdest (Vorabliste).
