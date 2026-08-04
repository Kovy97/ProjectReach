# Playtest-Feedback: „Der Completionist"

## Persona & Spielstil
Der Completionist will **100 %**: jeden Skill auf Max, das komplette Bestiarium (alle Monster besiegt),
den Collection-Log/alle Drops, Mastery überall, alle Achievements, alle Dungeons. Langzeit-Sammler,
lebt von klaren „X/Y geschafft"-Zielen und Belohnungen fürs Komplettieren.

## Was ich gespielt habe
Engine-Sim, ~9 Sim-Tage gemischt: (1) Scope-Inventur des gesamten Content-Katalogs, (2) 1 h Idle-Woodcutting
zum XP/h- und Mastery-Messen, (3) 1 h Goblin-Grind als frischer Char fürs Bestiarium/Collection-Log,
(4) Dungeon-Gates inspiziert, (5) 1 Woche reines Idle-Woodcutting, um Langzeit-Caps zu prüfen.
Wegwerf-Test danach gelöscht.

## Completion-Scope (das „Y" in X/Y)
| Sammelziel | Menge |
|---|---|
| Skills | **21** |
| Aktionen (für Mastery) | **250** |
| Monster (Bestiarium) | **58** |
| Monster-Drop-Einträge (Collection-Log) | **138** |
| Items gesamt | 296 |
| Dungeons | **5** |
| Sets | 10 |
| **Achievements** | **nur 10** |

## Pacing-Messungen (konkret)
- **Skill auf Max:** XP bis L99 = **13.034.431**; bis L120 (Cap) = **104.273.167**.
  Bei Normal-Tree-Rate (~5.143 XP/h) wären das **~2.535 h** (L99) bzw. **~20.275 h** (L120) — *pro Skill*.
  Naiv für alle 21 Skills auf L99: **~53.000 h**. (Mit höheren Tiers schneller, aber Größenordnung bleibt brutal.)
- **1 h Idle-Woodcutting (gemessen):** 10.577 XP → **L27**, Action-Mastery **L21**, Mastery-**Pool 0,004 %**, 1.412 Items.
- **Mastery-Pool:** Eine Aktion auf Mastery-L99 = **13.034.431 XP**. Es gibt **250** Aktionen.
  Nach 7 Tagen Idle auf *einer* Aktion: Pool des Skills erst **0,81 %** voll, Aktion auf Mastery-L72.
- **Bestiarium (1 h frischer Char vs. Goblin):** nur **15 Kills/h**, 1 Tod, **1/58** Monster, 3 Drops gesehen.
  → früher Combat ist zäh; 58 Monster „durchsammeln" ist viel Reiserei + Level-Gating.
- **Dungeons:** 5 Stück, Combat-Level-Gates **12 / 30 / 34 / 65 / 100**. Höchstes Gate L100 ist weit weg.
- **Achievements:** Nach 1 h Goblin-Grind **1/10** (`ach_kills_10`). Die übrigen 9 sind reine Schwellen
  (totalLevel, kills, itemsGathered, gold).

## Was sich gut anfühlt ✅
- **Tracking-Infrastruktur ist da:** `monsterKills` (Bestiarium), `seenDrops` (Collection-Log pro Monster),
  `masteryLevel`/`masteryPool` und `seenDropCount(seen/total)` — genau die Datenbasis, die ein Completionist liebt.
- **Riesiger Grind-Korpus:** 21 Skills × 250 Aktionen × Mastery bis L99 ergibt quasi unendlichen Langzeit-Inhalt.
  Mir geht so schnell die Beschäftigung nicht aus.
- **Idle skaliert sauber:** 7 Tage Offline → 313.300 Items, L72 — keine Caps/Bugs, fühlt sich verlässlich an.
- **Klare Gates** (Dungeon requiredLevel) geben mittelfristige Zwischenziele.

## Was sich zu langsam/zäh anfühlt ⚠️
- **Mastery ist effektiv uferlos statt „abschließbar".** Pool nach einer Woche Vollzeit-Grind = **0,81 %**.
  Bei 250 Aktionen × 13 Mio XP fühlt sich „Mastery überall" nicht wie ein erreichbares 100 %-Ziel an,
  sondern wie ein Fass ohne Boden. Für einen Completionist ist „nie fertig" eher frustrierend als motivierend.
- **Früher Combat zu langsam fürs Bestiarium:** 15 Kills/h + Tode beim Einstieg. 58 Monster zu „erstbesiegen"
  bedeutet viel Hochleveln, bevor ich überhaupt anfange zu sammeln.
- **L120-Cap vs. L99-Mastery-Skala:** 104 Mio XP für L120 *pro Skill* ist Größenordnungen über allem anderen —
  realistisch nie 100 %, also kein echtes Ziel, sondern Deko.

## Reibungspunkte & Frust (Kern-Problem für DIESE Persona)
1. **KEINE Completion-Belohnungen.** Grep über engine/shared/content findet *nichts* zu
   `completionReward`/`bestiaryReward`/`collectionReward`/`fullClear`. Bestiarium komplett, Collection-Log voll,
   Skill gemaxt, alle Dungeons gecleart → **es passiert nichts**. Kein Titel, kein Item, kein Buff, kein Achievement.
   Das ist für einen Completionist der größte Killer: Sammeln ohne Auszahlung.
2. **Achievements decken Completion-Ziele NICHT ab.** Nur 10, alle reine Schwellen (totalLevel/kills/gathered/gold).
   Es gibt **kein** „Besiege alle 58 Monster", „Vervollständige den Collection-Log", „Maxe einen Skill",
   „Clear alle 5 Dungeons", „Sammle alle 10 Sets". Die offensichtlichen 100 %-Achievements fehlen komplett.
3. **Kein sichtbarer Gesamt-Fortschritt.** `seenDropCount` liefert seen/total pro Monster, aber es gibt keinen
   aggregierten „Bestiarium 12/58", „Collection-Log 41/138", „Sets 3/10"-Zähler. Ich kann mein 100 % nicht messen.
4. **`checkAchievements` ist hart auf 4 condition.types verdrahtet** (switch in `achievements.ts`) — neue Completion-
   Bedingungen lassen sich nicht per Content hinzufügen, ohne die Engine anzufassen.

## Was fehlt für ein vollwertiges Spiel (Persona-Sicht) + Vorschläge (priorisiert)
1. **[HOCH] Completion-Achievements + Belohnungen.** Neue condition.types: `bestiaryComplete`, `collectionLogComplete`,
   `skillMaxed`, `allDungeonsCleared`, `setCollected`. Jede mit greifbarer Belohnung (Gold-Bonus, exklusives Cosmetic/Set,
   permanenter %-Buff). Das ist *die* Kernmotivation dieser Persona.
2. **[HOCH] Aggregierte Completion-Counter im State + abrufbar:** `bestiarySeen/total`, `collectionLog seen/total`,
   `dungeonsCleared/total`, `setsCollected/total`. Ohne Zähler kein 100 %-Gefühl.
3. **[MITTEL] Mastery „abschließbar" machen.** Entweder Mastery-Cap deutlich senken oder pro Skill ein klares
   „Pool 100 %"-Milestone mit fetter Belohnung — sodass „Mastery überall" ein realistisches Lebensziel statt Asymptote ist.
4. **[MITTEL] Bestiarium-Einstieg entschärfen:** früher Combat etwas schneller / weniger Tode, damit „alle 58 erstbesiegen"
   nicht erst nach Stunden Hochleveln beginnt. Optional: Kill-Counter-Stufen pro Monster (10/100/1000) als Mini-Sammelziele.
5. **[NIEDRIG] Mehr Dungeons (aktuell nur 5).** Für „alle Dungeons" als Dauerziel sind 5 dünn; 10–15 mit gestaffelten
   Gates + je einem Unique-Drop fürs Collection-Log wären lohnender.

## Spaß-Bewertung: **6/10**
Die Daten-Fundamente (Bestiarium, Collection-Log, Mastery, 250 Aktionen) sind goldrichtig für einen Completionist,
aber ohne **Completion-Belohnungen, 100 %-Achievements und sichtbare X/Y-Zähler** sammle ich ins Leere — und die
uferlose Mastery-Skala nimmt dem „endlich fertig"-Moment die Luft, der diese Persona antreibt.
