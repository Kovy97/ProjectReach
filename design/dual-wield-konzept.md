# Dual Wield für Einhandwaffen — Machbarkeitskonzept

**Auftrag:** Chef, 29.08.2026 — „Dual Wield für Einhand Waffen einführen/Planen". Machbarkeitsurteil
vor dem Bau, kein Code.
**Autor:** combat-dev. **Stand:** Branch `feat-1.0.1-ui-skalierung`, SAVE_VERSION 86.

**Lesehilfe zur Belegqualität.** Jede Aussage ist markiert:
`[Code]` = im Repo nachgesehen, mit Datei und Zeile. `[Rechnung]` = aus Katalogzahlen ausgerechnet,
Rechenweg steht dabei. `[Einschätzung]` = mein Urteil, nicht messbar belegt.

---

## (a) Kurzurteil in fünf Sätzen

1. **Ja, es geht** — und zwar deutlich billiger als erwartet, weil der `offhand`-Slot schon existiert
   und mit dem `ring1→ring2`-Routing bereits ein erprobtes Vorbild für „ein Item, zwei mögliche
   Plätze" im Code steht `[Code]`.
2. **Die teure Stelle ist nicht die Mechanik, sondern die Eichung:** zwei Einhandwaffen, die beide
   voll zuschlagen, landen bei **rund dem doppelten Netto-Schaden** eines Einhänders mit Schild und
   sprengen damit den seit `#231` gehaltenen Deckel von ×1.25 gegenüber 1H+Schild `[Rechnung]`.
3. **Es gibt genau eine Bauform, die nichts an der Kampfschleife anfasst:** die Nebenhand fließt
   anteilig in die Schadensspanne und ins Angriffstempo ein (`computeStats`), statt einen zweiten
   Schlag auszulösen — dann bleiben `combatStep`/`strikeEnemy` und damit alle geseedeten Fixtures
   unberührt `[Code]`.
4. **Das echte Risiko sind die Statuseffekte und die Waffen-Signaturen:** Gift-Stapel, Frost-Einfrieren
   und die Schock-Verzögerung hängen an der *Anwendungsrate*, nicht an der Magnitude — zwei Quellen
   verdoppeln sie, und zwei Götzeneisen-Dolche erreichen mit `precision` 0.30 + 0.30 **exakt den
   `PRECISION_CAP` von 0.60**, den kein Zweihänder erreicht `[Code]`.
5. **Empfehlung:** bauen, aber als eigenes Update nach 1.2.0 und nur für **Nahkampf und Magie** —
   Fernkampf hat null Content-Basis (0 von 57 Fernkampfwaffen ist einhändig, per Guard-Test
   festgeschrieben) `[Code]`.

---

## Ist-Stand: was der Code heute wirklich tut

Vier Befunde vorweg, weil sie die Aufgabenstellung korrigieren:

| Annahme im Auftrag | Wirklichkeit im Code | Fundstelle |
|---|---|---|
| „Zweihänder bekommen dafür einen `armorRating`-Bonus (Trinität §5)" | **Falsch, seit `#221` entfernt.** Kein einziges `mainhand`-Item im Katalog trägt `armorRating`; `computeStats` überspringt die Mainhand generell. 2H ist heute reine Glaskanone. | `packages/engine/src/character.ts:435`, `:540-547`; Guard `packages/engine/src/content-integrity.test.ts:168-173` |
| Die Typ-Doku behauptet den Bonus weiter | `ItemDef.armorRating` sagt noch „…den computeStats NUR bei `weaponStyle==="melee" && twoHanded` addiert" — **veralteter Kommentar**, sollte bei Gelegenheit korrigiert werden (logic-dev) | `packages/shared/src/index.ts:2881-2886` |
| `blockChance` als MAXIMUM | Stimmt, und es löst sich für Dual Wield **von selbst**: eine Waffe trägt kein `blockChance`, das MAX bleibt bei 0 | `packages/engine/src/character.ts:438`, `:557` |
| Der Offhand-Slot ist frei belegbar | **Nein.** `slotAccepts` in der Persistenz akzeptiert im Offhand nur Items mit `item.slot === "offhand"`. Eine Einhandwaffe (`slot: "mainhand"`) dort würde **bei jedem Laden in die Bank „gerettet"** — stiller Datenverlust aus Spielersicht | `packages/persistence/src/index.ts:518-523`, angewandt `:530-548` |

Weitere Ist-Fakten, die das Konzept trägt:

- **Ein Timer, ein Schlag.** `combatStep` addiert `TICK_MS` auf `cs.playerTimerMs` und löst bei
  `>= stats.attackIntervalMs` genau ein `performPlayerAttack` aus `[Code: combat.ts:2467-2483]`.
- **Die Mainhand ist die einzige Waffenquelle.** Schadensspanne (`weaponRange`), Tempo
  (`weaponBaseMs`), Stil (`style`) und Zauberfokus lesen ausschließlich `equipment.mainhand`
  `[Code: character.ts:377-388, 518, 638, 672]`.
- **Waffen-Status ebenfalls nur Mainhand.** `mainhandStatusEffects` und `weaponHasShock` sehen den
  Offhand gar nicht `[Code: combat.ts:793-807]`.
- **Aber: Spezialeffekte und Signaturfelder lesen schon heute ALLE Slots.** `collectSpecialEffects`
  läuft über `EQUIP_SLOTS` `[Code: combat.ts:596]`, und `armorPen`/`precision`/`wardBreak` werden
  über alle Slots **summiert** `[Code: character.ts:441-444, 765-767]`.
- **Ein Präzedenzfall für einen Zweitschlag existiert:** `doubleStrike` ruft `strikeEnemy` rekursiv,
  mit `allowDoubleStrike: false` gegen Kaskaden `[Code: combat.ts:2172-2182]`.
- **RNG-Züge je Spielerangriff:** 2–3 in `resolveAttack` (Treffer, Krit, Schadenswurf) plus je einen
  pro Waffen-Status plus einen bedingten für `doubleStrike` `[Code: combat.ts:884, 888, 904, 1691, 2179]`.

---

## (b) Die acht Punkte

### 1. Was ersetzt den Schild?

**Ist-Stand `[Code]`.** Die Rüstungs-Trinität hat vier Defensivschienen: Platte → Mitigation
(`armorRating`), Leder → Ausweichen (`evasionRating`), Stoff → Ward (`wardCapacity`), Schild → Block
(`blockChance`). Block ist mit `BLOCK_CAP = 0.5` und `BLOCK_DAMAGE_REDUCTION = 0.85` die stärkste
Einzelschiene `[shared/index.ts:1416, 1423]`; der beste Schild im Katalog (`idol_aegis`) erreicht
`blockChance` 0.500 — der Cap ist bereits ausgereizt. Ein Götzeneisen-Turmschild bringt zusätzlich
`armorRating` 21.74 und `con` 13.

**Was der Zweihänder bekommt: nichts.** `#221` hat den Waffen-`armorRating` ersatzlos gestrichen; 2H
trägt bewusst 71 % (R10) bis 50 % (R99) der EHP eines 1H+Schild-Melees und bezahlt das mit einer
DPS-Prämie von ~+22 % `[design/combat-depth-spec.md §1.1-1.3]`.

**Empfehlung: Dual Wield bekommt ebenfalls keine vierte Defensivschiene — sein Gegenstück zum Schild
ist die zweite Wirkungsquelle, und dafür bekommt es ein *kleineres* Offensivbudget als 2H.**

Begründung aus der Trinität heraus `[Einschätzung, gestützt auf die Spec-Logik]`: Die Trinität ist an
die **Rüstungsklasse** gebunden, nicht an die Waffenhand. Der Schild ist ihr einziges Mitglied im
Waffenslot, und `#221` hat für den Waffenslot bereits entschieden, dass er keine Verteidigung liefert.
Eine fünfte Schiene „Parieren" (Chance × Reduktion) wäre strukturell nur ein schwächerer Block — eine
Dublette, kein eigenes Gefühl, und sie bräuchte ein neues Feld, eine neue Log-Zeile, eine neue
UI-Zeile und sieben Sprachen. Dual Wield unterscheidet sich vom Zweihänder ohnehin schon deutlich
genug, ohne dass die Verteidigung angefasst wird:

| | Verteidigung | Offensive Identität |
|---|---|---|
| 1H + Schild | Block bis 50 % × −85 % + Schild-`armorRating` + `con` | Anker (×1.00) |
| 2H | keine (Glaskanone) | roher Schaden, ×1.22 |
| **Dual Wield** | **keine** | **zwei Effektquellen, zwei Signaturfelder, zwei Verzauberungsträger — bei ×1.13–1.19** |

Der Preis dafür, dass die zweite Hand *wirkt* statt *schützt*, ist ein um ~5 Prozentpunkte niedrigeres
DPS-Budget als 2H. Das ist ein Regler (eine Konstante), keine neue Mechanik.

**Falls der Chef ein spürbares Verteidigungsgefühl will** (Option, nicht Empfehlung): flaches
**Parieren** — eine feste Chance aus der Nebenhandwaffe mit −50 % Schaden statt der −85 % des Schilds,
eingebaut als Schritt 5b direkt neben dem Block in `strikeEnemy` `[Code: combat.ts:2577-2588]`. Kostet
eine Konstante, eine Log-Zeile, eine Tooltip-Zeile und 7 Sprachen — und das Offensivbudget müsste dann
noch etwas weiter runter. Eigene Welle, nicht Teil des Kerns.

---

### 2. Angriffsformel — welche Variante greift am wenigsten ein?

**Grundlage der Rechnung `[Rechnung]`.** Ein Treffer ist `charDamage + Waffenspanne`; der
Charakteranteil zählt bei **jedem** Schlag mit und dominiert am Endgame. Die genaue Größe von
`charDamage` (im Folgenden `C`) leite ich aus der gepinnten Eichung ab: „kein schwerer 2H-Netto-DPS
> ×1.25 vs. 1H+Schild", Zielwert Maul ×1.15–1.22 `[design/weapon-dps-rc-xp-spec.md §1.1, §4]`. Mit den
echten Katalogwerten (godiron, `[Code: content/src/index.ts:3281-3362]`):

| Waffe | Hand | Spanne (Ø) | Tempo | Waffen-DPS |
|---|---|---|---|---|
| godiron_dagger | 1H | 10.2–15.2 (12.7) | 2400 | 5.29 |
| godiron_sword | 1H | 13.6–25.2 (19.4) | 2900 | 6.69 |
| godiron_battleaxe | 1H | 16.1–30.1 (23.1) | 3250 | 7.11 |
| godiron_greatsword | 2H | 23.7–44.0 (33.85) | 3150 | 10.75 |
| godiron_maul | 2H | 29.8–69.4 (49.6) | 3700 | 13.41 |

Löst man `(C+49.6)/3.7 = 1.22 · (C+W)/T` für den besten 1H-Anker, ergibt sich **C ≈ 29–35** (je
nachdem, ob Dolch oder Schwert der Anker ist). Der Charakteranteil macht damit **60–70 % eines
Treffers** aus — deckungsgleich mit der Spec-Aussage „~60 % am Endgame". Alle folgenden Indizes sind
mit **beiden** Randwerten gerechnet und als Band angegeben; 1.00 = bester 1H + Schild.

| Variante | Netto-DPS-Index | Urteil |
|---|---|---|
| **A — Abwechselnd**, ein Timer, Hände wechseln sich ab | **0.96 – 1.00** | **Nutzlos.** Zwei gleiche Waffen ergeben exakt den Einhänder; gemischte Waffen sind sogar schlechter. Der Spieler gibt den Schild auf und bekommt null. |
| **B — Voller Zweitschlag**, beide Waffen schlagen unabhängig | **≈ 2.00** | **Sprengt alles.** Der Charakteranteil wird doppelt gezählt. 64 % über dem Zweihänder, 60 % über dem `#231`-Deckel. |
| **C — Zweitschlag mit Anteil `s`** | 1.00 + `s` | Um im Fenster zu landen, müsste `s ≈ 0.22` sein — die Nebenhandwaffe wäre praktisch Deko, ihre Werte kaum sichtbar. |
| **D — Nebenhand-Anteil in der Spanne** (Empfehlung) | **1.13 – 1.23** | Trifft das 2H-Fenster, und die Nebenhandwaffe darf **60 % ihrer Spanne** beisteuern — sie ist sichtbar relevant. |

**Empfehlung: Variante D.** Konkret in `computeStats`:

```
Schadensspanne = Mainhand-Spanne + DUAL_OFFHAND_SHARE · Nebenhand-Spanne
Angriffsintervall = Mittel(Mainhand-Tempo, Nebenhand-Tempo)
DUAL_OFFHAND_SHARE ≈ 0.55 – 0.60
```

Vier Gründe, warum D die anderen schlägt:

1. **Kein Eingriff in die Kampfschleife.** `combatStep`, `performPlayerAttack` und `strikeEnemy`
   bleiben unverändert; die Zahl der RNG-Züge je Angriff bleibt gleich. Alle geseedeten Fixtures und
   die 154 Engine-Tests bleiben bit-identisch, solange keine Nebenhandwaffe angelegt ist
   `[Code: combat.ts:2467-2483]`.
2. **Kein neuer Kampf-State.** Variante A bräuchte „welche Hand ist als Nächstes dran" — persistiert,
   also ein Save-Feld und eine Sanitize-Regel. D braucht null neuen Zustand.
3. **Der Charakteranteil wird nicht doppelt gezählt**, deshalb darf die Nebenhand 60 % statt 22 %
   beisteuern. Die Waffenwahl in der zweiten Hand bleibt eine echte Entscheidung.
4. **Das gemittelte Tempo ist selbstregulierend.** Ohne es entsteht sofort ein Exploit: schnelle
   Mainhand (Dolch, 2400 ms) + schwere Nebenhand (Kampfaxt, Ø 23.1) landet bei **×1.29–1.37** und
   reißt den Deckel `[Rechnung]`. Mit dem Mittel fällt dieselbe Kombination auf ×1.13–1.16 — Mischen
   wird leicht bestraft, gleichartige Paare sind am besten.

Nachrechnung mit `DUAL_OFFHAND_SHARE = 0.6` (Band aus C ≈ 29–35) `[Rechnung]`:

| Kombination | Index | im Fenster? |
|---|---|---|
| 2× godiron_dagger | 1.18 – 1.23 | ja |
| 2× godiron_sword | 1.19 – 1.22 | ja |
| 2× godiron_battleaxe | 1.17 – 1.18 | ja |
| dagger + battleaxe (Mischform) | 1.13 – 1.16 | ja |
| *Referenz* 2H Hammer | 1.22 | — |
| *Referenz* Deckel `#231` | 1.25 | — |

Ehrlicher Vorbehalt `[Einschätzung]`: Der Index driftet mit dem Tier, weil der Charakteranteil mit dem
Tier wächst. Bei Bronze liegt derselbe Anteil bei ~×1.15, bei Götzeneisen bei ~×1.22. Die Richtung
stimmt (Dual Wield wird stärker, je mehr die Waffen zählen), aber `DUAL_OFFHAND_SHARE` ist ein
**einziger** Regler für zwölf Tiers — wer das exakt haben will, braucht eine Kurve statt einer
Konstanten. Ich würde mit der Konstanten starten.

---

### 3. Kampfstil-Konflikt

**Ist-Stand `[Code]`.** `const style: WeaponStyle = mainhandItem?.weaponStyle || "melee"`
(`character.ts:518`) — die Mainhand entscheidet, punkt. Ein Zauberstab in der Nebenhand würde heute
schlicht ignoriert.

**Was der Katalog hergibt `[Code, gezählt über `packages/content/src/index.ts`]`:**

| Stil | Einhandwaffen | Typen | Zweihand |
|---|---|---|---|
| melee | **109** | sword 27, dagger 25, mace 14, axe 13, scimitar 13, battleaxe 13, spear 4 | 65 |
| magic | **27** | wand 21, scepter 6 | 30 (alle staff) |
| **ranged** | **0** | — | 57 |

- **Nahkampf-Paare:** 109 × 109 Kombinationen — reichlich.
- **Magie-Paare:** 27 × 27. Alle 27 einhändigen Magiewaffen tragen `spellFocus` (0.0025–0.0027),
  Stäbe 0.0030–0.0032 — die 2H-Prämie ist also nur ~+20 % Fokus bei ~2× Waffenschaden.
- **Fernkampf: null.** `weapon-hands.test.ts` schreibt fest: „jede Fernkampfwaffe ist zweihändig",
  nachdem 1.0.2 den Exploit „Bogen + Schild" rückwirkend samt Save-Migration und Spielerbrief
  aufgeräumt hat `[Code: packages/engine/src/weapon-hands.test.ts:20-27;
  packages/persistence/src/index.ts:575-601]`. `WeaponType` kennt überhaupt nur `shortbow | longbow`.

**Empfehlung: gemischte Stile verbieten, Fernkampf ausschließen.**

- **Verbieten** statt „Haupthand entscheidet". Ein Zauberstab in der Nahkampf-Nebenhand wäre ein
  reiner Stat-Stick: seine Spanne ist für Magie geeicht (mit Zauberfokus und Reserve-Bonus), sein
  Zauberfokus griffe nicht, seine XP flösse zu 100 % in den Nahkampf-Skill. Das untergräbt die drei
  Stile als Kernsäule für einen Gewinn, den niemand verlangt hat. Die Regel ist eine Zeile in
  `equipItem` plus dieselbe Zeile in der Sanitize-Kette (sonst schleust ein Save-Edit sie ein).
  Kosten: ein Ablehnungsgrund + eine i18n-Zeile in 7 Sprachen.
- **Fernkampf** bräuchte eine komplett neue Waffenklasse (Wurfwaffen/Armbrüste): `WeaponType`
  erweitern, Content-Leiter über 12 Tiers bauen, `weapon-hands.test.ts` umschreiben. Das ist ein
  eigenes Update, kein Nebeneffekt. **Ausschließen.**

---

### 4. Waffeneffekte — der gefährlichste Punkt

**Was heute bei zwei Quellen desselben Effekts passiert `[Code, geprüft]`:**

| Ebene | Regel | Fundstelle |
|---|---|---|
| Status-Magnitude/Dauer | **MAXIMUM**, nicht Summe: `existing.magnitude = Math.max(...)`, `remainingMs = Math.max(...)` | `combat.ts:1651-1670` |
| Spezial-Kinds (`momentum`, `execute`, `catalyst` …) | **MAXIMUM** je Kind über alle Slots | `combat.ts:593-622` |
| `healOnKill` / `wardOnKill` / `cooldownOnKill` | **SUMME** (bewusst, Chef-GO 28.08.) | `combat.ts:590, 613-619` |
| `armorPen` / `precision` / `wardBreak` | **SUMME** über alle Slots, geklemmt auf 0.60 / 0.60 / 0.75 | `character.ts:441-444, 765-767` |
| Elementar-Nachlauf | läuft bei **jeder** Anwendung, auch beim Refresh | `combat.ts:741-767` |

Der letzte Punkt ist der Haken. `applyEnemyStatus` verhindert zwar, dass sich Schaden pro Tick
addiert — aber `onStatusApplied` feuert trotzdem, und dort hängen die drei Mechaniken, die an der
**Anwendungsrate** hängen, nicht an der Magnitude:

| Status | Was an der Rate hängt | Konstante | Wirkung bei zwei Quellen `[Rechnung]` |
|---|---|---|---|
| **Gift** | Stapel +1 je Anwendung, Schaden je Tick × Stapel | `POISON_MAX_STACKS = 5` | 5 Stapel in der **halben** Zeit. `abyssal_devourer_fang` hat `chance 0.35, magnitude 7` — zwei davon: ~0.58 Anwendungen je Schlag statt 0.35. **Echter, unbeschränkter DPS-Gewinn.** |
| **Frost** | die 3. Anwendung friert ein (ein Angriff fällt aus), dann 6 s immun | `FROST_FREEZE_STACKS = 3`, `FREEZE_IMMUNITY_MS = 6000` | Einfrier-Takt von ~25 s auf ~12,5 s — beide über der Immunität, also **verdoppelt sich die Einfrier-Häufigkeit real.** |
| **Schock** | je Anwendung +400 ms Verzögerung, Kette bis 1200 ms, Reset beim ausgeführten Angriff | `SHOCK_DELAY_MS = 400`, `SHOCK_DELAY_CAP_MS = 1200` | Der Deckel wird nach ~2 statt ~4 Procs erreicht. Heute erreicht eine 0.30-Waffe ihn selten, zwei fast immer: bis zu **−40 % Gegner-Angriffsrate.** Hart gedeckelt, aber der Deckel wird erst durch Dual Wield real. |
| **Brand / Blutung** | nur Magnitude und Dauer, beide per MAX | `BURN_VULNERABILITY = 0.1` | Praktisch **kostenlos** — höhere Uptime, gleicher Tickschaden. |
| **Entzug (void)** | passiver Multiplikator, MAX | — | kostenlos |
| `momentum` (Scimitar-Signatur der ganzen Leiter) | Spezial-Kind, MAX | — | **stapelt nicht.** Zwei Götzeneisen-Scimitare bleiben bei magnitude 0.02 / stacks 10. |

**Der zweite, stillere Leck: die Signaturfelder.** Sie summieren schon heute über alle Slots. Zwei
`godiron_dagger` mit je `precision: 0.30` ergeben **exakt `PRECISION_CAP` 0.60** — 60 % der
Gegner-Evasion ignoriert. Kein Zweihänder kommt in die Nähe (Speer 0.20, Maul `armorPen` 0.40). Zwei
`godiron_mace` ergeben `armorPen` 0.50 gegen die 0.40 des Mauls `[Code + Rechnung]`.

**Empfehlungen:**

1. **Nebenhand-Procs mit eigener, gedrosselter Chance.** Ein separater Regler
   `DUAL_OFFHAND_PROC_SHARE` (Vorschlag 0.5), mit dem die Anwendungschance der Nebenhandeffekte
   multipliziert wird. Damit steigt die Anwendungsrate um ~50 % statt um 100 % — Gift/Frost/Schock
   bleiben spürbar besser, aber nicht doppelt. Ein Regler, eine Zeile.
2. **Die Signaturfelder der Nebenhand halbieren**, bevor sie in die Summe gehen — sonst ist der
   `precision`-Cap mit zwei Standard-Dolchen erreicht und der ganze Konter-Achsen-Entwurf aus
   `combat-depth-spec` §2.4/§2.5 verliert seine Abstufung. Das gehört in `computeStats` (logic-dev).
3. **Reihenfolge festnageln:** Mainhand-Effekte zuerst, dann Nebenhand, jeweils in Katalogreihenfolge
   — damit bleibt die RNG-Sequenz reproduzierbar. Und: **ohne angelegte Nebenhandwaffe darf kein
   einziger zusätzlicher RNG-Zug gezogen werden**, sonst kippen alle geseedeten Bestandstests. Das
   Muster dafür steht schon im Code („Alt-Content sequenz-identisch", `combat.ts:2577`).
4. **Symmetrie bleibt unberührt.** Monster tragen genau ein `inflict`; auf der Gegnerseite ändert sich
   nichts, `status-coverage.test.ts` bleibt grün `[Code: combat.ts:1829-1856]`.

---

### 5. Zauberfokus und Spanne

**Ist-Stand `[Code]`.** `spellFocusMult(mainhandItem, attr.int)` — ausschließlich die Mainhand, und
nur bei aktivem Stil `magic` (`character.ts:638`, `:301-306`). Kein Offhand-Item im Katalog trägt
`spellFocus`; die 22 Magie-Foki tragen nur `modifiers` `[Code, Katalog-Zählung]`. Der Guard
`packages/content/src/spell-focus-content.test.ts` schreibt fest, dass 1H-Fokuswerte strikt unter dem
Stab-Maximum liegen.

**Empfehlung: Zauberfokus wirkt je Hand auf die eigene Spanne, nie global.**

```
Spanne = Mainhand-Spanne · (1 + focus_main · int)
       + SHARE · Nebenhand-Spanne · (1 + focus_off · int)
```

Warum nicht summieren `[Rechnung]`: Zwei `godiron_wand` (je 0.0027) ergäben summiert 0.0054. Bei
`int` 90 wäre das ein Faktor 1.486 statt 1.243 — **+20 % auf die gesamte Waffenspanne**, obendrauf auf
den Anteil aus Punkt 2. Weil die 2H-Stäbe nur ~+20 % Zauberfokus als ihre gesamte Prämie haben
(0.0032 vs 0.0027), wäre der Stab damit auf einen Schlag obsolet — die Elementleiter und der
Zauberfokus-Entscheid vom 28.08. wären ausgehebelt.

Zwei Zauberstäbe sind mit der Je-Hand-Regel unproblematisch: die Nebenhand bringt 60 % ihrer
fokussierten Spanne, exakt wie eine Nahkampf-Nebenhand — dieselbe Formel, kein Sonderpfad.

Hinweis für content-dev `[Einschätzung]`: Wenn Dual-Wield-Magie kommt, sollte der bestehende
Magie-Fokus (Offhand, 22 Stück, nur `modifiers`) **nicht** verlieren. Er ist heute schon die
schwächste Offhand-Kategorie; ein Zauberstab in der zweiten Hand würde ihn vermutlich sofort
verdrängen. Das ist eine Content-Frage, keine Engine-Frage.

---

### 6. Zustand und Speicherstand

**Ist-Stand `[Code]`.** `EQUIP_SLOTS` hat 14 Einträge, `offhand` ist dabei `[shared/index.ts:2032-2047]`.
Der `ring1 → ring2`-Umweg lebt in `equipItem` (`equipment.ts:86-89`) und `equipInstance`
(`:199-202`), gespiegelt in der Persistenz-Sanitize (`slotAccepts`, `persistence/index.ts:521`) und in
der Vergleichsansicht der UI (`ItemTooltip.tsx:1890-1911`).

**Zwei Wege:**

| | **A — `offhand` wiederverwenden (Empfehlung)** | B — neuer Slot `offhand2` |
|---|---|---|
| `EQUIP_SLOTS` | unverändert | +1 Eintrag |
| `EQUIP_SLOT_LABELS` | unverändert | +1 × 7 Sprachen |
| Migration | **keine** — die Struktur ändert sich nicht, ein Alt-Save hat schlicht nie eine Waffe im Offhand | generischer Fill greift bereits (`persistence/index.ts:2118`), aber `SAVE_VERSION`-Bump + v87-Fixture |
| Paperdoll | unverändert | `DOLL_SLOTS` (`EquipmentOverview.tsx:126-141`) + **zwei** CSS-Blöcke (`character.css:598-607`, `:1943-1959`) + zwei Icon-Maps |
| Test-Bruch | keiner | `characterExportPrompt.test.ts:44` erwartet **hart** `EQUIP_SLOTS.length === 14` |
| Physisches Modell | stimmig: die linke Hand hält Schild **oder** Fokus **oder** Waffe | zwei linke Hände |

**Empfehlung: A.** Kein neuer Slot, keine Migration, kein `SAVE_VERSION`-Bump nötig. Nach dem
Save-Kompatibilitäts-Gesetz würde ich trotzdem eine **v87-Fixture mit angelegter Zweitwaffe** ablegen,
damit der Zustand ab jetzt gegen künftige Sanitize-Änderungen abgesichert ist.

**Was A zwingend braucht — hier liegt die Falle:**

1. `equipItem` / `equipInstance`: eine Einhandwaffe (`slot: "mainhand"`, `weaponStyle` gesetzt) darf in
   den Offhand, wenn die Mainhand belegt und der Offhand frei ist — **exakt das ring2-Muster**
   `[equipment.ts:86-89, 199-202]`. Ablehnen bei: Mainhand ist 2H, Stile verschieden, Mainhand leer.
2. **`slotAccepts` in `packages/persistence/src/index.ts:518-523` MUSS mitgezogen werden.** Ohne das
   räumt jeder Ladevorgang die Zweitwaffe in die Bank — kein Absturz, keine Fehlermeldung, nur ein
   Spieler, der morgens einhändig aufwacht. Dieselbe Funktion wird für die **Ausrüstungs-Kits**
   nochmals aufgerufen (`:654`), also für alle drei Kits mit.
3. Die 2H-verdrängt-Offhand-Regel greift automatisch weiter und ist sogar erwünscht: legt der Spieler
   einen Zweihänder an, wandert die Zweitwaffe verlustfrei über den Grant-Pfad zurück
   `[persistence/index.ts:575-601]`.
4. **Achtung, Semantik-Bruch:** Danach liegt im Offhand-Slot ein Item mit `item.slot === "mainhand"`.
   Jede Stelle, die aus `item.slot` auf die Art schließt, muss geprüft werden — genau der Bug, der bei
   den Dual-Use-Äxten im Werkzeugslot schon einmal auftrat und dort ausführlich dokumentiert ist
   `[persistence/index.ts:503-509]`.

---

### 7. Oberfläche (grob)

Bestandsaufnahme durch einen Client-Sweep `[Code, alle Fundstellen verifiziert]`. Mit Weg A entfallen
Paperdoll-Layout, CSS, Icon-Maps, Slot-Labels und der Export-Test — es bleiben:

| Datei | Was |
|---|---|
| `components/EquipmentOverview.tsx:240` | Drop-Prüfung ist ein **exakter Namensvergleich** `draggedItem.slot === slot`; braucht einen Waffen-Sonderfall analog zum Ring-Zweig (`:230, 239`) |
| `components/EquipmentOverview.tsx:331, 514` | Tempo-Baseline liest zweimal `equipment.mainhand` — bei zwei Waffen ist unklar, welches Intervall die Referenz ist |
| `components/ItemTooltip.tsx:1890-1911` | Vergleichsansicht auf das Doppelslot-Modell umstellen (ring2-Muster: gegen die *schwächere* der beiden Hände vergleichen, `slotFreeHint` bei freier Hand). `dualSlotWeight` (`:600-607`) kennt heute keine Schadensspanne und müsste waffentauglich werden. **Teuerster Einzelposten im Client.** |
| `components/ItemTooltip.tsx:793-800` | Hinweis „Zweihänder verdrängt Offhand" hängt hart an `equipment.offhand` |
| `components/ItemTooltip.tsx` | neue Zeile „Nebenhand: 60 % Beitrag" — sonst versteht niemand, warum die Zweitwaffe nicht voll zählt |
| `components/EquipKitBar.tsx:70` | Kit-Zusammenfassung zeigt nur `equipment.mainhand`; die zweite Waffe wäre im Kit-Tooltip unsichtbar |
| `pages/CombatPage.tsx:2278-2290` | Kampf-FX (Einschlagsfarbe, Magie-Thema, Schlag-Familie) lesen ausnahmslos die Mainhand — **es gibt keine Regel für zwei Waffen.** Vorschlag: Mainhand gewinnt, die Nebenhand liefert nur dann das Thema, wenn die Mainhand keines hat |
| `pages/EnchantingPage.tsx:275` | `def.slot === "offhand"` setzt das Abzeichen „Schild" — eine Zweitwaffe bekäme das falsche Etikett |
| i18n (7 Dateien) | neue Ablehnungsgründe, Nebenhand-Zeile, ggf. Kit-Text |

**Grobe Summe:** ~7 Client-Dateien mit echter Logikänderung plus 7 i18n-Dateien.

---

### 8. Balance

**Ist-Stand `[Code]`.** `balance-envelope.test.ts` misst über `STYLES = ["melee","ranged","magic"]`
× `TIERS = [30,60,90]` × sieben `BisTarget`s und pinnt reale Messwerte als Regressionsdetektor
(`:75-77`). Der BiS-Bauer wählt die Mainhand aus `it.slot === "mainhand" && it.weaponStyle === style`
(`balance-envelope-helpers.ts:353`) und füllt den Offhand danach mit dem bestbewerteten
`it.slot === "offhand"`-Item (`:403-410`) — nur wenn die Waffe nicht zweihändig ist. Für das
`tank`-Ziel bekommt 2H bereits einen expliziten Malus (`:359`).

**Zwei Konsequenzen:**

1. **Die bestehenden Pins bleiben zunächst stabil.** Weil der Offhand-Filter auf `slot === "offhand"`
   prüft und eine Einhandwaffe `slot: "mainhand"` deklariert, würde der Bauer sie nicht von allein
   greifen — die gepinnten §4/§5-Werte kippen nicht. `[Code]`
2. **Genau deshalb wäre Dual Wield unsichtbar.** Ohne eigenen Eintrag misst die Hülle die neue Bauform
   nie, und die Parität verschiebt sich lautlos — exakt das Szenario, vor dem der Auftrag warnt.

**Empfehlung:**

- Einen vierten Build-Zweig aufnehmen — sauberer als ein vierter „Stil" (Dual Wield **ist** kein
  vierter Stil) ist ein **Build-Variantenflag** `dual: true` neben `style`, das den Offhand-Filter auf
  1H-Waffen desselben Stils umstellt. Zwei Zweige: `melee+dual` und `magic+dual`, über dieselben drei
  Bänder. Neue Pins: Schadensspanne, Intervall, `precision`/`armorPen`/`wardBreak` (die
  Cap-Bindungsdetektoren aus §3 sind hier das Wichtigste) und eine TTK-Zeile.
- **`sim-realistic.ts` mitziehen.** Der Sim-Spieler hat eine ausgebaute Offhand-Heuristik
  (`:2146, 2169, 2255-2263, 2299-2330`), die nur Schilde/Foki kennt. Ohne Erweiterung spielt der
  Balance-Sim nie einen Dual-Wielder — und `AUFFÄLLIGKEITEN (0)` sagt dann über Dual Wield nichts aus.
- **Zusatzrisiko, das die Hülle finden wird `[Einschätzung]`:** Die zweite Waffe ist ein weiterer
  Verzauberungsträger — je nach Seltenheit **1 bis 4 zusätzliche Runenplätze**
  (`enchantSlotsFor`, `shared/index.ts:3308-3320`) plus ein zusätzlicher Suffix-Roll. Seit dem
  Stapel-Entscheid vom 25.08. summieren gleiche Stat-Runen. Der BiS-Bauer wird das sofort finden. Die
  Trinity-Runen sind unkritisch (das `trinityGatePasses`-Gate lässt sie nicht auf eine Waffe,
  `enchant.ts:422-430`) — die reinen Stat-Runen aber schon.

**Zusammenfassung der Balance-Schätzung `[Rechnung, godiron]`:**

| Bauform | Netto-DPS-Index | Verteidigung |
|---|---|---|
| 1H + Schild | 1.00 (Anker) | Block bis 0.50 × −85 %, +21.7 `armorRating`, +13 `con` |
| Zweihänder | 1.15 – 1.22 | keine |
| **Dual Wield, Variante D, SHARE 0.6** | **1.13 – 1.23** | **keine** |
| Dual Wield, voller Zweitschlag | ≈ 2.00 | keine |
| Dual Wield, abwechselnd | 0.96 – 1.00 | keine |

Plus die nicht in dieser Zahl steckenden Vorteile: doppelte Statusrate, `precision`-Cap mit zwei
Standard-Dolchen, zusätzliche Runenplätze. **Die reine DPS-Zahl unterschätzt Dual Wield** — deshalb
der Vorschlag, `DUAL_OFFHAND_SHARE` eher bei 0.55 zu starten und nach der Hülle nachzuziehen.

---

## (c) Umsetzung in Wellen

Aufwände sind Arbeitstage-Schätzungen `[Einschätzung]`, jeweils inklusive Tests.

| Welle | Inhalt | Rolle | Aufwand |
|---|---|---|---|
| **0 — Entscheid** | Chef beantwortet E1–E6 unten. Ohne E1 und E2 kann keine Welle starten. | Chef | — |
| **1 — Ausrüsten & Persistenz** | `equipItem`/`equipInstance` mit ring2-Muster für 1H-Waffen; Ablehnungsgründe (2H-Mainhand, Stilkonflikt); `slotAccepts` in Persistenz + Kit-Sanitize; v87-Kompat-Fixture. **Ohne Welle 1 ist alles danach wertlos** — die Waffe würde bei jedem Laden gebankt. | logic-dev | **1–1,5 T** |
| **2 — Stats** | `computeStats`: Nebenhand-Spanne × `DUAL_OFFHAND_SHARE`, Tempo = Mittel, Zauberfokus je Hand, Signaturfelder der Nebenhand halbiert. Neue Konstanten in `shared`. | logic-dev | **1,5 T** |
| **3 — Kampf** | `mainhandStatusEffects` → beidhändig (stabile Reihenfolge, gedrosselte Nebenhand-Chance); `weaponHasShock` beidhändig; `plaguebearer`-Quelle klären. Neuer `dual-wield.test.ts`: (1) ohne Zweitwaffe RNG-Sequenz bit-identisch, (2) Nebenhand-Status landet wirklich, (3) Gift erreicht 5 Stapel schneller, (4) Schock-Kette erreicht den 1200er-Deckel, (5) Frost-Einfrier-Takt, (6) Stilkonflikt abgelehnt, (7) 2H-Mainhand lehnt Zweitwaffe ab. | **combat-dev** | **1,5 T** |
| **4 — Oberfläche** | die 7 Client-Dateien aus Punkt 7 + 7 i18n. | ui-dev | **1,5–2 T** |
| **5 — Eichung** | Hüllen-Zweig `dual` + Pins; `sim-realistic`-Heuristik; `DUAL_OFFHAND_SHARE` gegen den ×1.25-Deckel ziehen; Vollsim gegenprüfen. | balance-designer + content-dev | **1,5–2 T** |
| **6 — optional** | Parieren (Punkt 1), falls der Chef ein Verteidigungsgefühl will. | combat-dev + ui-dev | **1 T** |

**Summe Kern (1–5): 7–8,5 Arbeitstage über vier Rollen.** Welle 5 ist die einzige, deren Dauer ich
nicht seriös schätzen kann — Neu-Eichungen laufen erfahrungsgemäß über mehrere Messrunden.

**Reihenfolge ist nicht verhandelbar:** 1 → 2 → 3, danach 4 und 5 parallel. Welle 3 ohne Welle 2
hätte keine Nebenhandwerte zu lesen; Welle 5 ohne 2 und 3 misst nichts.

---

## (d) Offene Chef-Entscheide

| # | Frage | Meine Empfehlung |
|---|---|---|
| **E1** | **Kommt Dual Wield überhaupt — und wann?** Es steht nicht auf der 1.0-Liste und ist kein Kandidat für „bewusst NICHT in 1.0" (`design/plan-1.0-vollrelease.md`). | **Ja, aber nach 1.2.0** als eigenes kleines Update. Es ist ein Itemization-Feature, kein Blocker. |
| **E2** | **Schild-Gegenstück: gar keines (Dual Wield = zweite Wirkung, dafür weniger DPS als 2H) oder Parieren als vierte Schiene?** | **Keines.** Die Trinität hängt an der Rüstungsklasse; `#221` hat für den Waffenslot bereits entschieden. Parieren wäre eine Block-Dublette. |
| **E3** | **Gemischte Stile (Schwert + Zauberstab) verbieten oder erlauben?** | **Verbieten.** Die drei Stile sind Kernsäule; die Regel kostet eine Zeile. |
| **E4** | **Fernkampf-Dual-Wield?** Es gibt 0 einhändige Fernkampfwaffen, und der Guard schreibt „jede Fernkampfwaffe ist zweihändig" fest. | **Nein.** Eigenes Update, wenn überhaupt (neue Waffenklasse Wurfwaffen/Armbrüste über 12 Tiers). |
| **E5** | **`DUAL_OFFHAND_SHARE`: Startwert und Form.** Ein fester Wert driftet von ~×1.15 (Bronze) auf ~×1.22 (Götzeneisen). | Start **0.55**, feste Konstante. Kurve nur, wenn die Hülle zeigt, dass die Drift stört. |
| **E6** | **Was passiert mit den 22 Magie-Foki?** Ein Zauberstab in der zweiten Hand könnte sie verdrängen — sie tragen heute nur `modifiers`. | Content-Frage für content-dev: entweder Foki aufwerten oder Dual-Wield-Magie bewusst als „Schaden statt Attribute" positionieren. |
| **E7** | **Nebenschauplatz, unabhängig von Dual Wield:** Die Doku zu `ItemDef.armorRating` (`shared/index.ts:2881-2886`) behauptet noch den 2H-Rüstungsbonus, den `#221` gestrichen hat. | Bei Gelegenheit von logic-dev korrigieren — reiner Kommentar, keine Wirkung. |

---

## Anhang: alle geprüften Fundstellen

**Engine — Kampf** (`packages/engine/src/combat.ts`): Angriffstimer `2467-2483` · `resolveAttack`
`881-907` · `playerProfile` `909-919` · `performPlayerAttack` `1861-1899` · `strikeEnemy` `1915-2182` ·
Lebensraub `2054-2075` · `doubleStrike` `2172-2182` · Block-Schritt `2577-2588` ·
`collectSpecialEffects` `593-622` · `ADDITIVE_KILL_FLATS` `590` · `mainhandStatusEffects` `793-803` ·
`weaponHasShock` `805-807` · `applyEnemyStatus` `1651-1670` · `applyWeaponEffects` `1681-1704` ·
`onStatusApplied` `741-767` · `delayNextAttack` `713-722` · `applyMonsterInflict` `1829-1856` ·
`grantOffenseXp` `976-1003`.

**Engine — Stats** (`character.ts`): Mainhand-Spanne `377-388` · Slot-Schleife `404-445` ·
`armorRating`-Auslassung `435` · `blockChance` als MAX `438` · Signaturfelder `441-444, 765-767` ·
Stil `518` · 2H-Bonus entfernt `540-547` · Block bei 2H `557` · Zauberfokus `301-306, 638` ·
Tempo `672-682` · Fernkampf-Modifikatoren `694-699`.

**Engine — Ausrüstung** (`equipment.ts`): ring2-Routing `86-89, 199-202` · 2H-Verdrängung `91-94,
203-206` · Werkzeug-Slots `138, 147-176`.

**Engine — Eichung**: `balance-envelope.test.ts:75-77, 337-420, 592-607` ·
`balance-envelope-helpers.ts:306, 353-359, 379-383, 403-410` · `sim-realistic.ts:2146, 2169,
2255-2263, 2299-2330` · `weapon-hands.test.ts:20-34` · `status-coverage.test.ts:13-35` ·
`content-integrity.test.ts:150, 168-186` · `enchant.ts:219, 422-430`.

**Shared** (`packages/shared/src/index.ts`): `SAVE_VERSION` `684` · `EQUIP_SLOTS` `2032-2047` ·
`EQUIP_SLOT_LABELS` `2089-2104` · `EquipKit` `2069-2085` · `ItemDef`-Waffenfelder `2836-2935` ·
`WeaponType` `2126-2142` · `enchantSlotsFor` `3308-3320` · Konstanten `882-900` (Elementar),
`1142-1173` (Lebensraub/Block-Heilung), `1416-1431` (Block/Dodge), `1475` (One-Shot),
`1534-1608` (Fernkampf/Tempo/Signatur-Caps).

**Persistenz** (`packages/persistence/src/index.ts`): `slotAccepts` `518-523` · Slot-Härtung `530-548`
· Instanz-Härtung `551-560` · 2H-verdrängt-Offhand `575-601` · Kit-Sanitize `640-671` ·
`migrateState`-Slot-Fill `2114-2119` · 19 Kompat-Fixturen unter `packages/persistence/fixtures/save-compat/`.

**Client**: `EquipmentOverview.tsx:126-141, 229-264, 331-359, 514-544` ·
`ItemTooltip.tsx:239, 670-738, 793-800, 808-833, 885-920, 1334-1352, 1844-1965` ·
`EquipKitBar.tsx:70-77` · `CombatPage.tsx:2278-2290, 6261` · `EnchantingPage.tsx:275` ·
`characterExportPrompt.test.ts:44` · `styles/character.css:598-607, 1943-1959` ·
`equipSlotIcons.ts:24-36` · `equipSlotEmptyIcons.ts:17-29`.

**Content** (`packages/content/src/index.ts`): godiron-Waffenblock `3281-3362` ·
Zauberstab-Leiter `4404-4520` · Fokus-Block um `4608` · Schild-Leiter `1856-3599` ·
`idol_aegis` `6962`.

**Design-Vorlagen**: `design/armor-trinity-spec.md` §1.2, §5 · `design/combat-depth-spec.md` §1.1-1.3 ·
`design/weapon-dps-rc-xp-spec.md` §1.1, §4 · `design/weapon-damage-scaling-spec.md` §3.2, §3.3 ·
`design/elementar-status-konzept.md`.
