# Playtest-Feedback: „Der AFK-Skiller"

**Persona & Spielstil:** Ich hasse Kämpfen. Ich lebe für Sammeln (Mining/Woodcutting/Fishing/Foraging/Farming)
und Verarbeitung (Smithing/Cooking/Fletching/…). Ich will Skills auf 99 ziehen, Mastery maxen und in langen,
ruhigen Idle-Loops versinken. Bewertet wird hier rein non-combat.

**Was ich gespielt habe:** Reiner Engine-Sim, kein Kampf. Mining von L1→L99 (immer beste freigeschaltete
Aktion, ~168h Sim-Zeit). Einen 90-Tage-Single-Action-Grind (`mine_copper`) zum Mastery-Test. Processing-Läufe
für Smithing/Cooking/Fletching mit frei verfügbarem Material. Gold-Stichproben für alle 5 Gathering-Skills auf
~L76. Determinismus-Seed fix (12345/999/4242).

---

## Pacing-Messungen (konkrete Zahlen)

### XP-Kurve (kumuliert, geteilte Melvor-Kurve)
| Level | Gesamt-XP |
|------:|----------:|
| L10 | 1.154 |
| L20 | 4.470 |
| L30 | 13.363 |
| L50 | 101.333 |
| L80 | 1.986.068 |
| L99 | 13.034.431 |
| L120 | 104.273.167 |

### Mining: Zeit bis Meilenstein (immer beste Aktion)
| Meilenstein | Sim-Zeit |
|---|---|
| L20 | **1,0 h** |
| L50 | **9,0 h** |
| L80 | **61,0 h** |
| L99 | **168 h** (7 Tage) |

### Mining XP/h pro Tier (skaliert stark mit dem Tier!)
| ~Level | Aktion | XP/h |
|---:|---|---:|
| L1 | mine_tin | 9.984 |
| L37 | mine_sapphire_seam | 12.582 |
| L55 | mine_ruby_seam | 24.187 |
| L70 | mine_bloodiron | 45.287 |
| L80 | mine_titanium | 76.805 |
| L90 | mine_onyx_seam | **123.179** |

→ XP/h ver-12-facht sich von L1 zu L90. Jeder Tier-Sprung fühlt sich wie ein echter Schub an. **Sehr gut.**

### Cooking (1 Input → 1 Output, saubere Kette)
- L20 nach 1h, L50 nach 5h, L70 nach 720h-Lauf erreicht.
- cook_shrimp 13.930 → cook_lobster 37.947 XP/h. Tier-Skalierung wie beim Sammeln. Rund.

### Gold/h (Skiller verkauft Ertrag, ~L76)
| Skill | Aktion | Verkaufswert/h |
|---|---|---:|
| Mining | mine_diamond_seam | **189.120 g** |
| Woodcutting | cut_shadowpine_tree | **180.376 g** |
| Foraging | forage_gloomfen | 36.587 g |
| Fishing | catch_anglerfish | 32.400 g |
| Farming | gather_graywort | 6.888 g (nur L28) |

→ Reines Skilling ist **ökonomisch absolut tragfähig**. Mining/WC werfen End-Tier ~180k g/h ab — non-combat ist
keine Sackgasse, sondern eine vollwertige Gold-Quelle.

---

## Was sich gut anfühlt ✅
- **Tier-Progression beim Sammeln.** XP/h und Gold/h steigen massiv mit dem Tier (12× XP, Mining L1→L90). Das ist
  genau der „endlich das nächste Erz freigeschaltet"-Lohn, für den ich lebe.
- **Frühgame ist nicht zäh.** `earlyXpMult` zieht L1→L20 auf 1h. Kein Tutorial-Slog. L1→L50 in 9h Sim ist eine
  knackige, lohnende erste Woche.
- **Content-Breite.** 16 Mining-, 92 Smithing-, 22 Jewelcrafting-Aktionen, 13 Skills mit LvlReq bis ~105. Da ist
  Stoff für hunderte Stunden.
- **Verarbeitungs-Tiefe (ore→bar→component→item).** `forge_steel_body` will 5× `steel_bar` (Zwischenprodukt),
  `fletch_grimoak_longbow` will Logs **und** Bowstring. Echte Produktionsketten statt 1:1-Tausch. Konzeptionell stark.
- **Gold-Ökonomie trägt non-combat.** ~180k g/h aus reinem Sammeln. Ich brauche keinen einzigen Kampf.

## Was sich zu langsam / zäh anfühlt ⚠️
- **MASTERY GIBT MIR KEINE XP-BELOHNUNG — und das ist mein Kern-Frust.** Single-Action-Grind `mine_copper`:
  Interval-XP/h bleibt über **Mastery L51 → L98** praktisch konstant (5.559 → 5.568). Mastery wirkt nur auf
  Doppel-Ertrag (Loot/Gold) und max. 15% Tempo. XP/Aktion ist fix → meine XP/h bewegt sich nicht. Als Skiller, der
  „Mastery maxen" als Ziel hat, sehe ich am Fortschrittsbalken **nichts** passieren. Der spürbarste Loop fehlt.
- **Mastery-Pool ist quasi unerreichbar.** Selbst nach **2160h (90 Tagen!)** auf einer Aktion: Pool nur **5,7%**.
  Der komplette Mining-Grind auf L99 (alle Aktionen) landet bei **6,3%**. Der **erste** Checkpoint (10% → +3%
  Doppelertrag) ist im Normalspiel **nie** erreichbar. Capstone (95%) ist reine Fiktion. Das ganze Pool-System ist
  für meine Persona praktisch toter Content.
- **15% Tempo-Cap bei Mastery 99 ist mau.** 90 Tage Grind für „14,7% schneller" fühlt sich nicht nach Meisterschaft
  an. Melvor gibt mir spürbarere, sichtbare Mastery-Perks (Preservation/Doubling-Sprünge an festen Levels).
- **Preservation ist unsichtbar.** 0,4%/Level, Cap 40% bei Mastery 99 — ich merke es nie, weil ich nie Mastery 99
  auf einer Verarbeitungs-Aktion erreiche (siehe Pool-Problem).

## Reibungspunkte & Frust (konkret)
- **Inventar = 10 Basis-Slots.** Sammeln eines Erztyps stackt (ok), aber Mehr-Output-Aktionen + Edelstein-Drops
  füllen schnell. Für „echtes AFK über Nacht" zu klein ohne Bank-Auto-Deposit oder größere Säcke früh.
- **Verarbeitung erfordert Mikromanagement der Vorprodukte.** Steel-Body will Steel-Bars, nicht Erz. Als
  reiner Skiller muss ich also Mine→Smelt→Forge in Etappen fahren und Zwischenstapel managen — gegen das „ruhige
  Idle"-Versprechen. Kein sichtbarer „Auto-Craft-Chain"-Komfort.
- **Mastery-XP = Skill-XP (1:1, gleiche Kurve).** Dadurch ist Mastery nur ein Schatten des Skill-Levels und liefert
  keinen eigenen Spannungsbogen. Ich grinde nicht „für Mastery", Mastery passiert nebenbei und tut fast nichts.

## Was fehlt für ein vollwertiges Spiel (Persona-Sicht)
1. **Mastery muss sich SPÜRBAR lohnen** — der wichtigste Punkt. Aktuell ist es kosmetisch.
2. **Erreichbare Pool-Checkpoints** — sonst ist das ganze Langzeit-Anker-System unsichtbar.
3. **AFK-Komfort:** Auto-Bank-Deposit / Auto-Sell / Auto-Craft-Chain, damit „über Nacht laufen lassen" wirklich geht.
4. **Mastery-Meilenstein-Perks** an festen Leveln (z.B. „bei Mastery 20: −10% Materialkosten"), nicht nur linear.
5. **Skiller-Identität:** keine combat-only Belohnungen für mich (Skill-Capes/Titel/Idle-Boni rein übers Skillen).

## Konkrete Verbesserungs-Vorschläge (priorisiert)
1. **(P0) Pool-Schwellen drastisch senken** (z.B. 1% / 5% / 15% / 50%) ODER Pool-XP entkoppeln/höher gewichten.
   Aktuell: 90 Tage = 5,7%. Ziel: erster Checkpoint in ~1–2 Tagen erreichbar, Capstone als realistisches Endgame.
2. **(P0) Mastery sichtbar machen:** Mastery-Tempo-Cap von 15% → ~30–50% anheben, und/oder Mastery-Meilenstein-Perks
   an L10/25/50/75/99 (sichtbare Sprünge), damit „Mastery hochziehen" ein echtes Ziel mit Feedback ist.
3. **(P1) Auto-Bank-Deposit + größere/frühe Säcke** für echtes Über-Nacht-AFK (10 Slots reichen nicht).
4. **(P1) Auto-Craft-Chain / Material-Pull aus Bank** für mehrstufige Rezepte (Erz→Barren→Item ohne Babysitting).
5. **(P2) Eigene Mastery-XP-Kurve** (langsamer/anders als Skill-XP), damit Mastery ein paralleler Langzeit-Loop wird
   statt 1:1-Schatten des Skill-Levels.
6. **(P2) Preservation/Doubling-Anzeige** im Loop (Toast „bewahrt!"/„doppelt!"), damit der Spieler die Mastery-Effekte
   überhaupt wahrnimmt.

---

## Spaß-Bewertung: **6 / 10**
Das Sammeln selbst ist hervorragend getuned — steile, lohnende Tier-Kurve, tragfähige Gold-Ökonomie, kein
Frühgame-Slog; non-combat ist eindeutig ein vollwertiger Spielstil. Aber das Herzstück meiner Persona — **Mastery
maxen** — gibt fast kein Feedback (XP/h flach über 47 Mastery-Level) und die Pool-Checkpoints sind nach 90 Tagen
bei 6% praktisch unerreichbar; dazu fehlt AFK-Komfort (10 Slots, kein Auto-Chain). Fix Mastery + Pool + AFK-QoL und
das wird eine glatte 9.

> *Hinweis Mess-Methodik:* Die „0 XP/h"-Werte bei Smithing-/Fletching-Top-Tiers im Rohlog sind ein
> Test-Fütterungs-Artefakt (mehrstufige Rezepte brauchen Zwischenprodukte wie `steel_bar`/`bowstring`, mein
> Auto-Feeder lieferte nur Rohstoffe). Cooking (1:1-Kette) lief sauber durch und validiert die Processing-XP/h-Methode;
> die Gathering- und Mastery-Zahlen sind davon unberührt.
