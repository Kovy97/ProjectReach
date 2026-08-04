# Melvor-Idle-Studie — Balancing, XP-Raten & Economy für Hearthforge Idle

> Recherche-Auftrag CEO, 2026-06-24. **Reines Notizen-/Empfehlungs-Dokument — keine Code-Änderung.**
> Erstellt von Balance-Designer. Zahlen aus Melvor-Wiki (z. T. nur via Such-Snippets, da die
> Wiki-Server direkte Fetches/Archive mit HTTP 403 blocken). Wo das Wiki eine Zahl **nicht**
> hergab, ist das explizit als „(Wiki gab keine Detailzahl her)" markiert statt geraten.
> Hearthforge-„Ist"-Zahlen sind direkt aus dem Code zitiert (Datei:Zeile).

---

## Zusammenfassung

**Top-Erkenntnisse**
1. **Unsere XP-Kurve IST schon Melvor.** Der Brief sprach von einer „K=150-Variante" — der Code nutzt
   aber die **exakte RuneScape/Melvor-Formel** `floor(n + 300·2^(n/7))`, kumuliert, `/4`
   (`packages/engine/src/leveling.ts:13`). L99 = **13.034.431 XP**, L120 = **104.273.167 XP** —
   bit-identisch zu Melvor. Hier gibt es **nichts zu ändern**; die Fundamente stimmen.
2. **Melvors Standard-Aktionsdauer ist kurz und konstant (3 s Mining, 2 s Smithing), die XP/Aktion
   steigt steil.** Wir machen das Gegenteil: Dauer steigt mit Tier (3,5 s → 9 s) UND XP steigt.
   Das ist eine legitime Design-Wahl, aber unsere XP/h-Größenordnung (Sim ~4–8k/h) liegt unter
   dem Melvor-Gefühl. Der Hebel ist **XP/Aktion**, nicht die Dauer.
3. **Melvors Mastery skaliert kräftiger als unsere.** Melvor: bis ~49 % Doppel-Ertrag + Preservation +
   Tempo + Pool-Checkpoints (10/25/50/95 %). Wir: Doppel-Ertrag bis 49 % (gut), Tempo nur **11,8 %**,
   **keine Preservation, keine Pool-Checkpoints**. Hier ist der größte fehlende „Grind-Anker".
4. **Combat-Mitigation: wir liegen richtig.** Melvor nutzt zwar *flache* Damage Reduction in %
   (cap ~95 %), wir nutzen `def/(def+100)`. Unser Modell ist sauberer (nullt nie, kein harter Cliff),
   passt zum grittigen Scope. Beibehalten.
5. **Gold-Economy:** Melvor hat klar getrennte „Geld-Skills" (Thieving als Top-Quelle) und massive
   Multiplikatoren. Unsere Gold/h-Kurve und Gold-Senken sind im Sim nicht ausgewiesen — **Lücke**,
   muss separat vermessen werden.

**Top-Empfehlungen (Kurzform, Details in §Empfehlungen)**
- **P1**: XP/Aktion der Gathering-Skills um Faktor ~1,5–2 anheben (Ziel ~10–15k XP/h früh statt 4–8k),
  ohne die Dauer-Progression anzufassen.
- **P1**: Mastery um **Preservation** (Material-Ersparnis bei Processing) + **Pool-Checkpoints**
  erweitern — der zentrale Langzeit-Anker, den wir noch nicht haben.
- **P2**: Gold/h pro Skill und Gold-Senken im Sim ausweisen; Verkaufswerte gegen Crafting-Kosten prüfen.
- **P2**: Aktionsdauern früh kürzen (Mining/WC/Fishing Start bei ~2,5–3 s statt 3,5–4 s), damit
  Frühgame „snappy" wird wie bei Melvor.
- **P3**: Mastery-Tempo-Cap von 11,8 % auf ~15 % anheben; pro-Item-Mastery-Belohnungen ab L99 prüfen.

---

## 1. XP-Kurve & Level-Cap

| | Melvor (Quelle) | Hearthforge (Ist, Code) | Erkenntnis/Empfehlung |
|---|---|---|---|
| Formel | `XP(L)=⌊¼·Σ ⌊ℓ+300·2^(ℓ/7)⌋⌋` (RuneScape/OSRS) — [Experience_Table](https://wiki.melvoridle.com/w/Experience_Table) | **Identisch**: `acc+=floor(n+300·2^(n/7)); table=floor(acc/4)` (`leveling.ts:13`) | **Deckungsgleich. Nicht ändern.** |
| XP bis L50 | 101.333 | 101.333 (berechnet) | identisch |
| XP bis L92 | 6.517.253 (= halbe Strecke L1→99) | 6.517.253 | identisch — „L1→92 = L92→99" gilt auch bei uns |
| XP bis L99 | 13.034.431 | 13.034.431 | identisch |
| Level-Cap | 99 Basis, **120** mit „Throne of the Herald" — [Experience_Table](https://wiki.melvoridle.com/w/Experience_Table) | **120** (`leveling.ts:1`, `MAX_LEVEL=120`) | identisch; L120 = 104.273.167 XP. Sinnvoller Endgame-Horizont. |
| Doppelung | XP verdoppelt sich ~alle 7 Level | identisch (gleiche Formel) | — |
| Frühgame-Boost | Melvor hat **keinen** expliziten XP-Multiplikator; nur kurze Aktionen | `earlyXpMult(L)=1+2·max(0,(40−L)/39)` → L1 ×3,0 … L40 ×1,0 (`shared:113`) | **Unsere Eigenheit, gut.** Glättet den frühen Slog, den Melvor über kurze Aktionen löst. Beibehalten. |

**Pacing-Größenordnung (Melvor-Referenz, [What_to_level_first](https://wiki.melvoridle.com/w/What_to_level_first)):**
Ein einzelner Skill auf 99 ist in Melvor ein Vielstunden- bis Mehrtage-Grind; 120 ein „Endgame-Projekt".
Unsere identische Kurve erbt dasselbe Pacing — gut, solange die **XP/h** stimmt (s. §2).

---

## 2. Action-XP-Raten & Aktionsdauern + Mastery

### Aktionsdauern & XP/Aktion

| | Melvor (Quelle) | Hearthforge (Ist, Code) | Erkenntnis/Empfehlung |
|---|---|---|---|
| Mining-Dauer | **3 s konstant**, alle Erze — [Mining](https://wiki.melvoridle.com/w/Mining) | 3,5 s (Kupfer) → steigend, andere Tiers länger (`index.ts:1213`) | Melvor: Dauer fix, XP/Aktion steigt. Wir: beides steigt → langsamere XP/h-Kurve. |
| Smithing-Dauer | **2 s konstant** — [Smithing](https://wiki.melvoridle.com/w/Smithing) | 2,6 s smelt, 3–6,5 s forge (`index.ts:1271+`) | unsere Crafting-Dauer höher → niedrigere Throughput |
| Cooking-Dauer | 7 s (Topf) / 8 s (Ofen) — [Cooking](https://wiki.melvoridle.com/w/Cooking) | (analog, Processing) | vergleichbar |
| Woodcutting-XP-Kurve | XP/Aktion steigt steil pro Baum-Tier | L1→2, L10→5, L20→12, L30→22, L45→38, L55→70, L70→130, L85→240, L100→480 (`index.ts:1100–1207`) | unsere Stufung ist sauber (kein Cliff), aber absolute XP niedrig → s. u. |
| XP/h früh | Melvor fühlt sich „flott" an (3 s/Aktion) | Sim misst **~4.000–8.000 XP/h** früh | **Unsere XP/h ist zu niedrig fürs Gefühl.** |

**Rechnung (warum XP/h niedrig ist):** L20-WC = 12 XP / 4,5 s = **9.600 XP/h** brutto, mit
`earlyXpMult(20)=1,51` → ~14.500 effektiv. Aber spätere Tiers fallen ab: L70 = 130 XP / 7,0 s =
**66.857 XP/h** — das klingt viel, ist aber gegen 737k XP für L70→71 nur ~11 Aktionen/Level-Sprung
bei wachsender Kurve, fühlt sich also langsam an. Der Sim-Wert 4–8k bezieht sich auf **ungeskillte
Frühaktionen** und ist der ehrliche Worst-Case.

**Empfehlung:** Nicht die Dauer-Progression abschaffen (sie ist ein nettes Identitätsmerkmal), sondern
die **XP/Aktion-Konstante anheben**, sodass früh ~10–15k XP/h erreicht wird (s. P1).

### Mastery-System

| | Melvor (Quelle) | Hearthforge (Ist, Code) | Erkenntnis/Empfehlung |
|---|---|---|---|
| Doppel-Ertrag | skaliert mit Mastery-Level, hoch (Bsp. ~20 % @ L85) — [Mastery](https://wiki.melvoridle.com/w/Mastery) | `0,5 %/Level`, Cap **49 %** @ L99 (`shared:647`) | **vergleichbar/stark genug.** OK. |
| Preservation | **Ja** — Chance, Material **nicht zu verbrauchen** | **Fehlt komplett** | **Größte Lücke.** Processing-Skills brauchen das als Mastery-Belohnung. |
| Tempo | Mastery + Pool-Checkpoints senken Intervall (Bsp. Thieving −0,2 s je Quelle) | `0,12 %/Level`, Cap **11,8 %** @ L99 (`shared:657`) | **etwas schwach.** Auf ~15 % anheben. |
| Mastery-Pool | XP-Pool füllt sich passiv; **Checkpoints @ 10/25/50/95 %** geben skillweite Boni; Pool-XP kann 1:1 in Item-Mastery investiert werden — [Mastery](https://wiki.melvoridle.com/w/Mastery) | **Kein Pool, keine Checkpoints** | **Fehlt.** Starker Langzeit-Anker + „Knopf zum Drücken". |
| Pro-Item-Reward @ L99 | z. B. Cooking: 50 % Perfect + +20 % Heilung | (nicht im Code gesichtet) | Prüfen, ob wir pro-Item-99-Boni haben; falls nein, ergänzen |

---

## 3. Gold-Economy

| | Melvor (Quelle) | Hearthforge (Ist) | Erkenntnis/Empfehlung |
|---|---|---|---|
| Top-Gold-Quelle | **Thieving** — bis 12 Mio/h (Knight + Synergie), absurder Endgame-Peak ~70 Mio/h — [Money_Making](https://wiki.melvoridle.com/w/Money_Making) | Thieving existiert (gathering) | Melvor macht Thieving bewusst zur Geld-Säule. Wir können das spiegeln. |
| Frühe Quelle | Gems aus Mining (Gem Gloves 750–900k/Nutzung) — [Money_Making](https://wiki.melvoridle.com/w/Money_Making) | Gem-Drops 1 % (`rough_garnet`, `index.ts:1218`) | Gems als frühe Cash-Quelle ist erprobt — passt zu unserem Mining. |
| Crafting-Verkauf | Cooked Fish ~4,4 Mio/h Endgame | (Shop/Verkauf existiert) | Verkaufswerte sollten knapp über Crafting-Kosten liegen (Anreiz, nicht Exploit) |
| Geld-Senken | Shop-Upgrades, Auto-Eat-Tiers, Slayer, Bank-Slots | Shop + Gold vorhanden | **Senken müssen mit Gold/h skalieren** — sonst Inflation |
| **Gold/h im Sim** | — | **Wird im Sim nicht ausgewiesen** | **Lücke: Gold/h pro Skill + Gold-pro-Stunde pro Monster vermessen.** |

**Ehrlich:** Das Wiki nennt **keine** sauberen „Item-Verkaufswert vs. Crafting-Kosten"-Tabellen in den
abrufbaren Snippets; die genauen Verhältnisse sind nicht extrahierbar. Empfehlung deshalb prozeduraler
Natur: erst messen (Sim erweitern), dann tunen.

---

## 4. Drop-Rates & Loot

| | Melvor (Quelle) | Hearthforge (Ist, Code) | Erkenntnis/Empfehlung |
|---|---|---|---|
| Gem-Drop (Mining) | **1 % pro Aktion** für Normal-Gem; Gem-Vein 0,533 % — [Mining](https://wiki.melvoridle.com/w/Mining) | **1 %** (`rough_garnet`/`rough_garnet` chance 0.01, `index.ts:1218`) | **Identisch. Gut kalibriert.** |
| Vogelnest (WC) | analoges seltenes Bonus-Drop | 1 %→5 % steigend mit Tier (`birds_nest`, `index.ts:1109+`) | unsere steigende Nest-Chance ist ein nettes Tier-Reward — beibehalten |
| Doppel-Ertrag | über Mastery + Boosts, nicht Basis-Drop | Mastery `masteryDoubleChance` bis 49 % (`shared:652`) | vergleichbar |
| Seltene Unique-Drops | sehr niedrige %, oft 1/1000-Bereich (Pets etc.) | (Monster-Loot-Tabellen vorhanden) | **Prüfen:** haben unsere seltensten Drops eine „1/x"-Spannweite, die sich lohnt? Wiki gab keine Einzelzahl her. |

---

## 5. Combat-Balance

| | Melvor (Quelle) | Hearthforge (Ist, Code) | Erkenntnis/Empfehlung |
|---|---|---|---|
| Accuracy | `floor((EffLvl+9)·(BaseAcc+64)·(1+AccMod/100))` vs. Evasion — [Combat](https://wiki.melvoridle.com/w/Combat) | `acc/(acc+evasion)` (Brief; combat.ts) | Melvor: zwei getrennte Ratings, Vergleich → Wahrscheinlichkeit. Unser Verhältnis-Modell ist simpler & gut lesbar. **Beibehalten.** |
| Hit-Chance-Roll | Vergleich Accuracy-Rating ↔ Evasion-Rating (komplexe Kurve) | `acc/(acc+evasion)` | unser Modell ist transparenter; OK |
| Mitigation | **Flache % Damage Reduction**, Cap ~95 %; aus Gear/Shield/Cape/Amulet/Potion/Prayer — [DR-Compendium](https://github.com/gridster2/Melvor/blob/main/Documents/Compendium%20of%20Damage%20Reduction.md) | **`raw·(1−def/(def+100))`** (`shared:98`, `DEFENSE_MITIGATION_K=100`) | **Unser Modell ist besser für unseren Scope**: nullt nie, kein 95-%-Cliff, glatte Kurve. Beibehalten. |
| DR-Quellen (Melvor) | Rune 5 %/Teil, Dragon 6 %/Teil, Shield bis 12 %, Amulet 5 %, Potion bis 10 % | def fließt aus Gear/Set zusammen | Größenordnung als Sanity-Check für Gear-Tiers brauchbar |
| Survivability-Regel | `HP · AutoEat-Schwelle > MaxHit · (1−DR)` — [DR-Compendium] | Auto-Eat bei **<50 % HP** (`FOOD_AUTO_EAT_THRESHOLD=0.5`, `shared:90`) | **Unsere Schwelle (50 %) ist großzügiger** als Melvor (20–30 %). Macht Combat verzeihender — passt zu Single-Auto-Eat (kein Tier-System). OK, ggf. später Tiers. |
| Lifesteal | nicht Kern (eher Effekte/Prayer) | Nahkampf **12 %** (`MELEE_LIFESTEAL=0.12`, `shared:86`) | unsere Stil-Identität (Melee=Lifesteal) — gut, kein Melvor-Pendant nötig |
| HP-Skalierung | HP skaliert mit Combat-Skills + Gear (Wiki gab keine Formel-Zahl her) | Vitality=HP-Skill | vergleichbares Prinzip |
| Auto-Eat-Tiers | Tier I/II/III (Schwellen 10/20/30 %, steigende Heil-Effizienz) | **ein** fester Wert | **P3-Idee:** Auto-Eat als Shop-Upgrade-Linie (Gold-Senke!) statt Konstante |
| Offline-Combat | nur nach Toggle; Thieving offline „gefährlich" (Tod möglich) — [Offline_Progression](https://wiki.melvoridle.com/w/Offline_Progression) | (Offline-Logik vorhanden) | Prinzip „gefährliche Skills offline mit Todesrisiko" ist gutes Pacing-Werkzeug |

**Über-Level-Letalität:** Melvor-Guides setzen Auto-Eat-Tier-III für „Hard"-Dungeons voraus
([Hall_of_Wizards/Guide](https://wiki.melvoridle.com/w/Hall_of_Wizards/Guide),
[Spider_Forest/Guide](https://wiki.melvoridle.com/w/Spider_Forest/Guide)) — d. h. Über-Level-Content
ist **bewusst tödlich ohne Vorbereitung**. Unsere Sim-Regel (kills=0 = Red Flag) ist der richtige
Worst-Case-Test; ein Monster, das den **ungeskillten** Char killt, ist OK, solange geskillt+gefüttert
machbar.

---

## 6. Gear-Progression

| | Melvor (Quelle) | Hearthforge (Ist, Code) | Erkenntnis/Empfehlung |
|---|---|---|---|
| Tier-Anzahl | ~8 Melee-Metalltiers Bronze→Dragon (+Ancient/Throne-Erw.) — [Smithing](https://wiki.melvoridle.com/w/Smithing) | **12 Metall-Tiers** (Brief) | **Wir haben mehr Sprossen** — gut für „Leiter-Gefühl", solange kein Tier flach ist. |
| DR-Sprung/Tier | Rune 5 %→Dragon 6 % pro Teil (kleine, glatte Schritte) — [DR-Compendium] | Set-/Gear-Boni steigen pro Tier (`index.ts:416+`) | Melvor-Lehre: **kleine, gleichmäßige Schritte** statt Cliffs. Prüfen, dass kein Tier doppelten Sprung macht. |
| Waffen-Tempo | Basis-Intervall pro Waffentyp fix (Dagger schnell, 2H langsam); Wiki gab keine ms-Tabelle her | **Basis 3000 ms**, `−dex·20 + Waffen-Delta`, clamp [800, 5000] (`character.ts:180`) | Unser Modell: Waffe verschiebt Intervall als Delta (Dolch −500, schwere Waffe +1500, `index.ts:416/453`). Sauber, deckt „schnell vs. langsam" ab. |
| Speed vs. Damage | langsame Waffen = höherer Max-Hit, schnelle = mehr DPS-Konsistenz | Delta-System spiegelt das (z. B. 2H: +meleeDamage 30, +1500 ms; `index.ts:453`) | **Konzeptionell deckungsgleich. Gut.** |
| Drei Stile | Combat-Triangle (Melee/Ranged/Magic mit Vorteil 0,5×–1,25×) | **kein Dreieck** (Brief), Stile via DPS-Parität + Identität | bewusste Abweichung — s. §„NICHT übernehmen" |

**Stil-Parität (unser Modell):** Ranged bekommt +0,1 Crit-Chance (`character.ts:183`) als Identität —
konsistent mit „Ranged etwas weniger Raw, dafür Crit/Speed". Melvor löst Identität übers Dreieck; wir
über Stat-Profile. Unser Weg passt besser zum fokussierten Scope.

---

## 7. Idle-Pacing-Philosophie

| | Melvor (Quelle) | Hearthforge (Ist) | Erkenntnis/Empfehlung |
|---|---|---|---|
| Offline-Cap | **24 h**; bei Rückkehr wird Zeit simuliert (kein echtes Hintergrund-Ticken) — [Offline_Progression](https://wiki.melvoridle.com/w/Offline_Progression) | (Offline-Logik vorhanden, deterministisch) | 24 h ist der bewährte Standard. Falls wir abweichen, bewusst dokumentieren. |
| Offline-Combat | nur nach Opt-in; gefährliche Skills mit Todesrisiko | (prüfen) | gutes Spannungs-Werkzeug |
| „Zu schnell"-Bremse | steile XP-Kurve + lange 99/120-Strecke; Mastery-Grind obendrauf | gleiche XP-Kurve | Kurve bremst von selbst; **Mastery-Pool fehlt als zweite Bremse/Anker** |
| „Zu langsam"-Schutz | kurze Aktionen (3 s) + Boosts/Mastery-Tempo | early-XP-Boost + Mastery-Tempo (schwächer) | unser Frühgame-Boost ist gut; Tempo-Cap erhöhen |
| Langzeit-Bindung | **Mastery-Grind + Completion Log** (alle Items/Drops sammeln) | `seenDrops`/Collection-Log existiert (`shared:640`) | **Completion-Log haben wir — gut.** Mastery-Tiefe nachziehen. |

---

## Konkrete, priorisierte Empfehlungen

> Richtwerte sind aus Melvor + unserem Ist abgeleitet, nicht erfunden. Umsetzung durch content-dev.

### P1 — Frühgame-XP/h auf Melvor-Gefühl heben
- **Ziel:** ungeskillte Frühaktionen ~10–15k XP/h statt 4–8k (Sim-gemessen).
- **Hebel:** XP/Aktion der Gathering-Aktionen × ~1,5–2,0 **anheben**, Dauer-Progression **unverändert**
  lassen. Z. B. WC: L1 2→3, L10 5→8, L20 12→18, L30 22→33, L45 38→57, L70 130→195, L100 480→720.
  (Faktor ~1,5; konsistent über alle Gathering-Skills anwenden, damit Parität bleibt.)
- **Begründung:** Melvor erreicht „flott" über 3-s-Aktionen; da wir längere Aktionen wollen, muss die
  XP/Aktion höher sein, um dieselbe XP/h zu treffen. Kurve & Tier-Stufung bleiben sauber.
- **Verifikation:** Sim erneut laufen lassen, XP/h pro Aktion gegen Ziel ~10–15k (früh) prüfen.

### P1 — Mastery: Preservation + Pool-Checkpoints ergänzen
- **Preservation** (nur Processing-Skills): Chance, Eingangsmaterial nicht zu verbrauchen.
  Richtwert analog Doppel-Ertrag: `~0,4 %/Mastery-Level`, Cap **~40 %** @ L99.
- **Mastery-Pool + Checkpoints** (alle Mastery-Skills): passiver Pool, Checkpoints bei
  **10/25/50/95 %** mit skillweiten Boni (z. B. +5 % Skill-XP @ 95 %, +Tempo @ 25/50 %).
  Pool-XP 1:1 in Item-Mastery investierbar.
- **Begründung:** Das ist Melvors zentraler Langzeit-Anker und fehlt uns komplett. Größter „Bang for
  the buck" für Retention. (Erfordert Engine-Arbeit logic-dev + SAVE_VERSION-Migration — vormerken.)

### P2 — Gold-Economy vermessen & kalibrieren
- Sim erweitern: **Gold/h pro Skill** und **Gold/h pro Monster** ausweisen (analog zu XP/h, kills/deaths).
- Dann: Item-Verkaufswerte so setzen, dass sie **knapp über** den reinen Crafting-Materialkosten liegen
  (Anreiz ja, Exploit nein). Thieving als bewusste Geld-Säule positionieren (Melvor-Lehre).
- Gold-Senken an Gold/h koppeln (Auto-Eat-Tiers, Shop-Upgrades, Bank-Slots).

### P2 — Frühe Aktionsdauern leicht kürzen
- Mining/WC/Fishing Start-Tier von 3,5–4,0 s → **~2,5–3,0 s**, damit das Frühgame „snappy" wirkt
  (Melvor 3 s). Spätere Tiers dürfen weiter steigen.
- Begründung: senkt Frust in den ersten Minuten ohne die Tier-Identität zu opfern.

### P3 — Feinschliff
- Mastery-**Tempo-Cap** 11,8 % → **~15 %** (`MASTERY_SPEED_CAP` 0,12→0,15) — näher an Melvors spürbarem Tempo-Gewinn.
- **Auto-Eat als Shop-Upgrade-Linie** (Tier I/II/III, steigende Effizienz) statt fester 50-%-Konstante
  → zusätzliche Gold-Senke + Combat-Progression.
- **Pro-Item-Mastery-99-Belohnungen** prüfen/ergänzen (Melvor: z. B. Cooking 50 % Perfect + 20 % Heilung).
- Seltenste Monster-Unique-Drops auf eine motivierende „1/x"-Spanne prüfen.

---

## Was wir bewusst NICHT übernehmen

- **Combat-Triangle (Melee/Ranged/Magic-Vorteil 0,5×–1,25×):** Unser Konzept hat bewusst kein Dreieck
  (MEMORY: combat-concept). Wir lösen Stil-Identität über Stat-Profile (Melee=Lifesteal/Raw,
  Ranged=Crit/Speed/Evasion, Magic=Mana/Status). Dreieck würde Komplexität ohne Mehrwert bringen.
- **Flache %-Damage-Reduction mit 95-%-Cap:** Unser `def/(def+100)` ist glatter und cliff-frei — besser
  für unseren grittigen, fokussierten Scope. Nicht zurückwechseln.
- **Slayer / Prayer / Summoning als eigene Systeme:** Außerhalb Roadmap-1.0-Scope. Höchstens als
  Inspirations-Quelle für Pacing, nicht als Feature.
- **Riesige Endgame-Multiplikatoren (70 Mio Gold/h):** Melvors Synergie-Stacking ist Expansion-Bloat.
  Wir halten die Economy enger und lesbarer.
- **Abyssal-/Expansion-Level (>120):** Kein Bedarf; 120 ist unser sauberer Horizont.

---

## Quellen

- Experience Table — https://wiki.melvoridle.com/w/Experience_Table
- What to level first — https://wiki.melvoridle.com/w/What_to_level_first
- Mastery — https://wiki.melvoridle.com/w/Mastery
- Mining — https://wiki.melvoridle.com/w/Mining
- Smithing — https://wiki.melvoridle.com/w/Smithing
- Cooking — https://wiki.melvoridle.com/w/Cooking
- Combat — https://wiki.melvoridle.com/w/Combat
- Defence — https://wiki.melvoridle.com/w/Defence
- Combat Guide — https://wiki.melvoridle.com/w/Combat_Guide
- Damage Reduction Compendium (gridster2) — https://github.com/gridster2/Melvor/blob/main/Documents/Compendium%20of%20Damage%20Reduction.md
- Money Making — https://wiki.melvoridle.com/w/Money_Making
- Weapons — https://wiki.melvoridle.com/w/Weapons
- Attack Interval — https://wiki.melvoridle.com/w/Attack_Interval
- Offline Progression — https://wiki.melvoridle.com/w/Offline_Progression
- Hall of Wizards / Guide — https://wiki.melvoridle.com/w/Hall_of_Wizards/Guide
- Spider Forest / Guide — https://wiki.melvoridle.com/w/Spider_Forest/Guide

**Methodik-Hinweis:** Die Melvor-Wiki-Server liefern bei direktem Fetch HTTP 403 (Bot-Schutz);
Archive.org/testwiki waren nicht erreichbar. Zahlen stammen daher aus Such-Snippets der genannten
Seiten sowie dem fetchbaren GitHub-DR-Compendium. Wo eine Detailzahl nicht im Snippet stand, ist das
oben explizit vermerkt — es wurde nichts geraten.
