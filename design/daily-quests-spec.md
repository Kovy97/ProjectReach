# Daily-Quests — Spec (Chef, 2026-06-25)

Daily Quests aus einem **zufälligen, sehr großen Pool**. Aufbauend auf der Repeatable-Quest-Engine.

## Schwierigkeitsgrade (5)
`very_easy` · `easy` · `medium` · `hard` · `master`
- Jede Pool-Quest ist genau einer Schwierigkeit zugeordnet.
- Rewards (Gold + Items) skalieren mit der Schwierigkeit (very_easy klein → master groß).
- Objective-Umfang skaliert mit (z. B. very_easy „töte 5 X" → master „töte 60 X" / „crafte 20 Tier-Items").

## Tägliche Auswahl
- Jeden Tag **genau 6 Dailies**, gezogen aus dem Pool.
- **Constraint: keine Schwierigkeit darf mehr als 2× erscheinen** (die 6 verteilen sich also über ≥3 Schwierigkeiten; z. B. 2+2+2 oder 2+2+1+1).
- Auswahl **deterministisch pro Kalendertag geseedet** (gleicher Tag → gleiche 6; neuer Tag → neue 6).
- Pool soll **sehr groß** sein (content-dev füllt; Start z. B. 40+, wachsend), damit sich Dailies selten wiederholen.

## Reset
- Bei Tageswechsel (lokales Datum) werden die 6 neu gezogen; nicht abgeschlossene Dailies verfallen, Fortschritt der alten Dailies wird zurückgesetzt.
- Pro Daily 1× claimbar pro Tag (Reward Gold + Items).

## State
- `state.quests.daily`: aktueller Tag-Stempel + die 6 ausgewählten Quest-IDs + pro-Daily Fortschritt/claimed.
- Objectives nutzen bestehende Typen (kill_monster, gather_items, reach_skill_level, **craft_items** etc.).

## UI
- Jetzt **funktional**: die 6 Dailies mit Schwierigkeits-Badge, Fortschrittsbalken, Claim-Button, Reset-Countdown.
- **Verschönerung kommt später** (Chef) — kein Over-Investment in Optik jetzt.
