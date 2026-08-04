# Kampf-Dramaturgie 0.4.0 — den reichen Kampf SICHTBAR machen

Autor: Combat-Dev · Stand: 2026-08-03 · Status: DESIGN-BRAINSTORM (kein Code)

> **Chef-Entscheid 2026-08-03:** Präsentations-Paket (P) + additives Event-Paket (E+) sind
> FREIGEGEBEN („das kann man alles fixen"). Abschnitt 7 „Mechanik-Ideen" ist ABGELEHNT —
> keine neuen Kampf-Mechaniken in 0.4.0.

## 0. Grundsatz und eiserne Grenzen

Der Kampf ist mechanisch bereits reich: 5 Statuseffekte, Ward auf beiden Seiten, Enrage/Regen/
Inflict-Traits, Auto-Eat/Auto-Trank, Lifesteal, Mana-Depletion-Loop, Dungeon-Wellen mit
Boss-Atempause, Elites, Paragonturm, 20+ Spezial-Waffeneffekte mit Zählern (momentum, everyNth,
vengeance ...). Auf der Bühne sieht man davon fast nichts außer Log-Zeilen und Schadenszahlen.

Dieses Doc listet Präsentations-Dramaturgie, die BESTEHENDE Mechanik lesbar macht. Regeln:

1. **Determinismus unantastbar.** Die Bühne liest nur `state.combat` + `CombatEvent`-Log +
   Content-Daten. Kein einziger zusätzlicher Engine-RNG-Draw für Optik. Kosmetischer Zufall
   (Partikel-Jitter) darf im Renderer mit `Math.random` laufen, weil er nie in den Save fließt.
2. **Idle-Natur unantastbar.** Nichts erfordert Input, nichts pausiert die Engine, nichts wird
   verpasst, wenn man wegschaut. Die Simulation läuft identisch, ob das Fenster offen ist oder nicht.
3. **Kein VFX-Vergolden.** Chef-Entscheid steht: echte VFX/Juice sind ein späterer Meilenstein.
   0.4.0-Dramaturgie heißt darum: billige, robuste Bühnen-Signale (CSS-Overlays, Badges,
   Balken-Marker, Banner, Log-Story), nicht Partikel-Engine. Alles respektiert das bestehende
   `fxLevel`-Setting.
4. **Drei Kategorien, sauber getrennt:**
   - **[P]** reine Präsentation auf vorhandenem Event/State (ui-dev, sofort machbar),
   - **[E+]** kleine ADDITIVE Log-/Event-Anreicherung in combat.ts (combat-dev; deterministisch,
     kein RNG, kein Mechanik-Entscheid — dieselbe Klasse wie das `absorbed`-Feld oder die
     Block-Log-Zeile, beides bereits Präzedenzfall),
   - **[M]** echte neue Mechanik → Abschnitt 7, Chef-Entscheid, NICHT 0.4.0-Default.

Aufwand: S = Stunden, M = 1-2 Tage, L = mehr.

---

## 1. Status-Effekte als Bühnen-Sprache

Was die Engine heute schon trägt: `cs.enemyEffects` / `cs.playerEffects` sind LIVE-State
(`{type, magnitude, remainingMs}` je Effekt, eine Instanz pro Typ, Refresh per max-merge).
Die ANWENDUNG wird geloggt (`kind:"status"`, by player/enemy, mit `status`-Typ) und hat bereits
einen lila Proc-Floater ("Bleed!"). Burn tickt zusätzlich ~1×/s als `kind:"dot"`-Event.
Was fehlt, ist die DAUER-Präsenz am Sprite: aktive Effekte sind nur ein winziges Debuff-Badge.

| Idee | Sichtbarer Mechanik-Wert | Quelle | Kat. | Aufwand |
|---|---|---|---|---|
| **Glut-Overlay** am Sprite solange burn aktiv (orangenes Flacker-Overlay via CSS-Animation, Intensität grob nach `magnitude`-Stufe) | Burn-DoT als Zustand, nicht nur als Proc-Moment | `enemyEffects`/`playerEffects` type "burn" | P | S |
| **Vereisungs-Look + Verlangsamungs-Gefühl**: Sprite bläulich einfärben UND den Angriffs-Fortschrittsbalken sichtbar langsamer füllen (die Balken existieren; Frost streckt real den Timer via FROST_SLOW) | Frost = Tempo-Kontrolle; der Spieler SIEHT, dass der Gegner seltener dran ist | Effekt-State "frost" + `playerTimerMs`/`enemyTimerMs` vs. `attackIntervalMs` | P | S |
| **Blut-Tropfen** bei bleed (2-3 fallende rote Punkte, CSS) | Bleed-DoT als Zustand | Effekt-State "bleed" | P | S |
| **Schock-Zuckung**: kurzes Ruckeln/weißes Flackern des Sprites solange shock anliegt; ausgesetzte Angriffe eigenes Signal (s.u.) | Shock = Aussetz-Chance sichtbar | Effekt-State "shock" | P | S |
| **Gift-Färbung**: grünlicher Tint solange poison aktiv | Poison-DoT als Zustand | Effekt-State "poison" | P | S |
| **Effekt-Leiste statt Mini-Badge**: pro aktivem Effekt Icon + Rest-Dauer-Ring + Magnitude-Zahl, an BEIDEN Figuren (Symmetrie wie in der Engine) | remainingMs/magnitude, die die Engine exakt führt | Effekt-State beider Seiten | P | M |
| **"Stack-Anzeige" ehrlich**: die Engine STACKT Status NICHT (eine Instanz je Typ, Refresh = max). Was stapelt, sind **momentumStacks** und **hitCount** der Spezial-Effekte → als Pips am Spieler zeigen ("Momentum ×7") | momentum/everyNth-Zähler, die heute komplett unsichtbar wirken | `cs.effectCounters.momentumStacks`, `.hitCount` (transienter State, lesbar) | P | S |
| **DoT-Ticks im Log für bleed/poison**: `emitBurnTick` feuert heute NUR für burn; bleed/poison ticken stumm | DoT-Schaden pro Sekunde aller drei DoTs | kleine Erweiterung von `emitBurnTick` auf alle DoT-Typen (Log-only, kein RNG) | E+ | S |
| **Shock-Aussetzer vom echten Miss trennen**: der Schock-Skip loggt heute `kind:"miss"` und ist vom Fehlschlag ununterscheidbar. Additives Feld (z.B. `reason:"shock"`) → Bühne zeigt "Gelähmt!" statt "Verfehlt" | Shock-Kontrolle wird als eigener Sieg lesbar | additives Event-Feld an beiden Schock-Zweigen in combatStep | E+ | S |

## 2. Gegner-Persönlichkeit

| Idee | Sichtbarer Mechanik-Wert | Quelle | Kat. | Aufwand |
|---|---|---|---|---|
| **Enrage sichtbar**: Marker auf dem Gegner-HP-Balken bei `enrage.belowHpPct`; unterschreitet die HP die Schwelle → rote Aura + kurzes Aufbäumen + Log-Zeile "X gerät in Rage!". Die Engine loggt Enrage NICHT, aber die Bedingung ist rein ableitbar: `enemyHp/maxHp <= monster.enrage.belowHpPct` | Der plötzlich härtere Schaden bekommt eine Ursache; heute wirkt er wie Zufall | `cs.enemyHp` + `monster.maxHp` + `monster.enrage` (Content) | P | S |
| **Regen als grüne Pulse**: pulsierender grüner Schimmer solange `monster.regen > 0` und HP < max; dazu ein "+X/s"-Label am Balken. Bonus: Puls ERLISCHT, wenn antiRegen greift (Gegner hat burn/bleed/poison und Spieler trägt antiRegen) → "Regeneration unterdrückt" | Der DPS-Check wird lesbar; antiRegen-Waffen fühlen sich endlich an | `monster.regen`, `cs.enemyHp`, `cs.enemyEffects`, Gear-Effekte (Content) | P | S-M |
| **Inflict telegraphiert**: permanentes Trait-Badge an der Gegner-Karte ("Giftig", "Versengt ...") aus `monster.inflict` — VOR dem ersten Proc sichtbar, damit man Gegenmittel/Food einpacken kann. Der Proc selbst loggt bereits (`status`, by enemy) | Vorbereitung wird belohnt statt Überraschungs-Gift | `monster.inflict` (Content), Proc via Log | P | S |
| **Trait-Zeile komplett**: dieselbe Badge-Leiste zeigt enrage ("Wütet unter 30 %"), regen, resist (Immunitäten!), wardCapacity ("Gewarded") — alles reine Content-Reads. Resist-Anzeige erspart Frust ("warum brennt der nie?") | Monster-Identität aus 5 vorhandenen Datenfeldern | `MonsterDef` (Content) | P | M |
| **Wellen-Ansage im Dungeon**: Banner "Welle 2 / 4 — <Monstername>" beim Wellenwechsel | Dungeon-Struktur | `cs.dungeonId`, `cs.encounterIndex`, `dungeon.encounters` | P | S |
| **Boss-Intro nutzt die Atempause**: der Übergang zur letzten Welle setzt real `PRE_BOSS_BREATHER_MS` als Cooldown (im Code explizit als "Boss-Intro-Fenster fürs UI, §5.1.5" markiert, bewusst nicht verkürzbar) — GENAU dieses Fenster als Boss-Banner mit Namen, Portrait-Zoom, dunkler Bühne inszenieren. Das Fenster existiert; niemand bespielt es | Die designte Dramaturgie-Pause wird endlich Dramaturgie | `cs.encounterIndex === letzte Welle` + `cs.cooldownRemainingMs` | P | M |
| **Elite-AUFTRITT**: die Sieg-Zeremonie existiert (ChampionDefeatCeremony), der Auftritt fehlt. Bei Kampfstart mit gesetztem `eliteVariantId`: kurzes Entrance-Banner (Variantenname, Titel), Bühnen-Vignette, danach normaler Kampf. Kein Timer-Eingriff nötig, rein über die ersten ~2 s des laufenden Kampfs gelegt (Kampf läuft darunter ehrlich weiter) | Elite-Kills fühlen sich schon gut an; Elite-BEGINN ist aktuell ein stummer Schnitt | `cs.eliteVariantId`, `cs.eliteFightStartMs`, Varianten-Def (Content) | P | M |
| **Paragonturm-Etagen-Stempel**: Etagen-Nummer groß auf der Bühne, bei Meilenstein-Etagen goldener Rahmen | Turm-Progression | `cs.paragonFloor` | P | S |

## 3. Spieler-Kompetenz sichtbar

| Idee | Sichtbarer Mechanik-Wert | Quelle | Kat. | Aufwand |
|---|---|---|---|---|
| **Biss-Moment**: bei heal-Event mit `source:"food"` fliegt das Food-Icon (`itemId` steckt im Event) zur Figur, kurzer "Mampf"-Bounce. Der grüne Floater existiert; der Moment am Sprite fehlt | Auto-Eat als aktive Rettung statt stiller HP-Sprung | `CombatEvent kind:"heal", source:"food", itemId` | P | S |
| **Potion-Schluck**: analog für `source:"potion"` — Flaschen-Kipp-Animation am Sprite, Trank-Icon | Auto-Trank-Timing (der "seltene große Schluck") | `kind:"heal", source:"potion", itemId` | P | S |
| **Ward als Schild-Visual**: Schild-Ring/Schimmer um die Figur, Deckkraft an `ward/maxWard` gekoppelt; bei `kind:"shield", source:"ward"` kurzes Aufblitzen; bei Pool→0 ein "Schild-Bruch" (Splitter-Flash + Log "Ward gebrochen!"). Gleiches Visual am GEGNER für `cs.enemyWard` (der "I miss 9/10"-Report war genau diese Unlesbarkeit; das `absorbed`-Feld existiert seitdem) | Die komplette Ward-Ökonomie: Aufbau durch Casts, Erosion über die Farm-Session, Bruch | `character.ward`, `stats.maxWard`, `cs.enemyWard`, shield-Events, hit-Events mit `absorbed` | P | M |
| **Lifesteal-Funken**: rote Funken vom Gegner zur Spieler-Figur bei `kind:"lifesteal"` (Gear-Lifesteal loggt bereits). ACHTUNG Lücke: der Stil-Lifesteal von Melee (MELEE_LIFESTEAL) heilt STUMM ohne Event — für exakte Zahlen bräuchte es ein additives Log (E+, S); fürs reine Funken-Visual reicht ableitbar "Stil melee + gelandeter Treffer" | Melee-Identität ("Kämpfen heilt") endlich auf der Bühne | `kind:"lifesteal"`; Melee-Anteil: E+ Log oder Ableitung | P / E+ | S |
| **Stil-Pose + Stance-Wechsel**: beim Wechsel von combatStyle/Waffe kurze Umgreif-Pose + Banner "Defensiv-Haltung". Magie-Casts haben schon eine eigene Animation; Melee/Ranged verdienen unterscheidbare Grund-Silhouetten (Haltungs-Frame reicht, keine neue Art) | Die drei Stile als Kern-Pillar, XP-Routing der Stances | `stats.style`, `character.combatStyle` (Wechsel-Erkennung im Renderer) | P | M |
| **Block/Dodge-Sprache**: Block loggt bereits (`kind:"block"`), Leder-Dodge loggt als miss. Block → Schild-Klirren-Flash; für Dodge ein additives Feld (`reason:"dodge"`) analog zum Schock-Fall, dann Ausweich-Sidestep statt generischem "Verfehlt" | Rüstungs-Trinität wird fühlbar: Platte schluckt, Leder weicht aus, Stoff schirmt | block-Event; Dodge: E+ Feld | P / E+ | S |
| **Mana-Not sichtbar**: fällt Magie in den Weak-Melee (Mana < Kosten), Stab-Glühen erlischt + "Erschöpft"-Badge, bis wieder gecastet wird | Der Mana-Depletion-Loop, heute nur als plötzlich kleine Zahlen erkennbar | `character.mana`, `castManaCost` (Content), Stil magic | P | S |

## 4. Kampf-Verlauf lesbar (Momentum und Wendepunkte)

| Idee | Sichtbarer Mechanik-Wert | Quelle | Kat. | Aufwand |
|---|---|---|---|---|
| **Momentum-Gefühl ohne Zahlen**: Bühnen-Licht kippt subtil — Verhältnis aus (eigene HP+Ward-Quote) vs. (Gegner HP+Ward-Quote), träge geglättet im Renderer. Gewinnt der Spieler klar: warmes Licht; kippt es: kühler/dunkler Rand. KEIN Balken, kein Prozentwert — nur Atmosphäre | Netto-Fortschritt, exakt die Größe, die auch trackStalemate misst | `hp/maxHp`, `ward/maxWard`, `enemyHp/maxHp`, `enemyWard/wardCapacity` | P | M |
| **Patt-Vorwarnung**: `noProgressMs` wächst sichtbar Richtung Stalemate — ab ~50 % ein dezentes "Kein Fortschritt..."-Signal (Staub legt sich, Musik-Dämpfung), damit der Auto-Stopp (StalematePopup existiert) nicht aus dem Nichts kommt | Stalemate-Erkennung | `cs.noProgressMs` vs. STALEMATE_NO_PROGRESS_MS | P | S |
| **Low-HP-Rettung als Mini-Story**: Renderer erkennt die Sequenz "HP unter ~20 % → heal-Event (food/potion)" und macht daraus EINEN verdichteten Log-Satz ("Mit letzter Kraft: <Food> rettet bei 34 HP!") + Herzschlag-Vignette auf der Bühne, die mit dem Heal aufreißt | Der Auto-Eat-Cooldown-Nervenkitzel (mehrere harte Treffer können durchschlagen — Chef-Design) | HP-Verlauf + heal-Events, reine Renderer-Sequenz-Erkennung | P | M |
| **Nahtod-Zustand**: unter Auto-Eat-Schwelle dauerhaft leichte Rot-Vignette + schnellerer Herzschlag-Puls des HP-Balkens | effectiveAutoEatThreshold als gefühlte Gefahrenlinie | `character.hp`, Schwelle aus Character-State | P | S |
| **Kill-Cooldown als Verschnaufpause inszenieren**: die 5 s nach dem Kill (Kill-Karte existiert) — Figur wischt sich den Schweiß ab, Regen-/DoT-Ticks bleiben sichtbar (Gift tickt in der Pause real weiter und KANN töten — genau das zeigen!) | KILL_COOLDOWN_MS, DoT-in-der-Pause-Regel | `cs.cooldownRemainingMs`, `cs.playerEffects` | P | S |
| **Erster-Treffer-Momente**: eagleEye-Garantie-Krit und firstStrike als "Eröffnungs"-Blitz beim ersten gelandeten Treffer der Begegnung | Spezial-Effekt-Openings, heute unsichtbar | `cs.effectCounters.firstHitDone` + crit-Event + Gear (Content) | P | S |

## 5. Session-Dramaturgie

| Idee | Sichtbarer Mechanik-Wert | Quelle | Kat. | Aufwand |
|---|---|---|---|---|
| **Kill-Zähler der Sitzung**: dezenter "Kills: 23"-Zähler an der Bühne, der bei jedem Kill kurz pulst; Meilensteine (10/25/50/100 am selben Monster) mit kleinem Aufleuchten. KEIN Streak mit Verfall (siehe Nicht-tun) | `cs.kills` (Session am Gegner), `state.monsterKills` (lebenszeit) | State vorhanden | P | S |
| **Erst-Kill als Discovery-Moment auf der Bühne**: wird `monsterKills[creditId]` 1, kurzes "Neu erlegt!"-Siegel über dem sterbenden Gegner + Bestiariums-Buchstempel-Animation; heute passiert das nur still im Bestiarium | Discovery-System / Kill-Credit (inkl. dg_-Alias, den die Engine schon korrekt auf die Basis-Id bucht) | `state.monsterKills` Delta im Renderer | P | S-M |
| **Rare-Drop-Moment am Sprite**: loot-Event, dessen `roll.chance` unter Schwelle (~1/50) liegt → Item leuchtet AM Gegner auf und fliegt zur Tasche; bei Chase-Tier (1/350+) goldener Strahl + eigener Log-Satz. Suffix-Instanzen (Drop wurde zur Item-Instanz) sind der Jackpot-Fall | Rare-Drop-Philosophie: der 1/1000-Moment ist der Kern-Payoff des Genres und aktuell eine normale Log-Zeile | `kind:"loot"` + `monster.loot`-Chance (Content); Instanz via lastKill/Inventar-Delta | P | M |
| **Blutmond-Jackpot inszenieren**: `lastKill.bloodMoonProc` existiert bereits als Flag — rote Doppel-Beute-Explosion auf der Kill-Karte + Bühnen-Rotstich für die Cooldown-Dauer | Samstags-Segen-Verdopplung | `lastKill.bloodMoonProc` | P | S |
| **Pet-Drop-Fanfare**: `kind:"pet"`-Event existiert; verdient den größten Moment unterhalb der Elite-Zeremonie (Pet-Sprite hüpft ins Bild) | Pet-Drops (kein Pity, purer Glücksmoment) | `kind:"pet"`, `state.lastPetDrop` | P | S-M |
| **Levelup mitten im Kampf**: Renderer vergleicht `levelFromXp` je Skill zwischen Ticks; Level-Sprung → goldene Säule an der Spieler-Figur + "Attack 43!" Banner, OHNE den Kampf zu berühren | Kampf-XP-Fluss (addXp-Beträge stehen im Log mit Skill-Tag) | `state.skills` + xp-Events | P | S-M |
| **Erst-Clear-Doppelgold zeigen**: der Dungeon-Erstabschluss zahlt real doppelt (zweite Gold-Zeile im Log) — als "Erstbezwingung!"-Badge auf dem Abschluss-Screen ausweisen | `dungeonsCleared === 1`-Bonus | `state.dungeonsCleared` + doppeltes gold-Event | P | S |

---

## 6. Event-Quellen-Tabelle (Idee → vorhandene Quelle)

| Idee | Event/State-Feld | Status |
|---|---|---|
| Status-Overlays (burn/frost/bleed/shock/poison) | `cs.enemyEffects` / `cs.playerEffects` (type, magnitude, remainingMs) | vorhanden |
| Status-Proc-Moment | `CombatEvent kind:"status"` (+ bestehender lila Floater) | vorhanden |
| Burn-Tick-Zahlen | `kind:"dot"` (~1×/s) | vorhanden (nur burn) |
| Bleed/Poison-Tick-Zahlen | — | fehlt → E+ (emitBurnTick verallgemeinern) |
| Shock-Aussetzer vs. Miss | `kind:"miss"` (ununterscheidbar) | teilweise → E+ (`reason`-Feld) |
| Momentum-/Hit-Zähler-Pips | `cs.effectCounters.momentumStacks/.hitCount/.firstHitDone` | vorhanden (transient) |
| Enrage-Schwelle/-Zustand | `cs.enemyHp` + `monster.enrage` (Content) | ableitbar (kein Event) |
| Gegner-Regen | `monster.regen` + `cs.enemyHp` | ableitbar (kein Event) |
| Inflict-Telegraph | `monster.inflict` (Content); Proc: `kind:"status"` by enemy | vorhanden |
| Resistenzen/Traits | `monster.resist`, `wardCapacity` (Content) | vorhanden |
| Wellen-Ansage | `cs.dungeonId`, `cs.encounterIndex`, `dungeon.encounters` | vorhanden |
| Boss-Intro-Fenster | `cs.cooldownRemainingMs` = PRE_BOSS_BREATHER_MS vor letzter Welle | vorhanden (ungenutzt) |
| Elite-Auftritt | `cs.eliteVariantId`, `cs.eliteFightStartMs` | vorhanden |
| Auto-Eat/Potion-Moment | `kind:"heal"` + `source:"food"/"potion"` + `itemId` | vorhanden |
| Ward-Visual Spieler | `character.ward`, `stats.maxWard`, `kind:"shield" source:"ward"` | vorhanden |
| Ward-Visual Gegner | `cs.enemyWard`, hit-Event-Feld `absorbed` | vorhanden |
| Gear-Lifesteal | `kind:"lifesteal"` | vorhanden |
| Melee-Stil-Lifesteal | — (heilt stumm) | fehlt → E+ oder Ableitung |
| Block / Pet-Schild | `kind:"block"` / `kind:"shield" source:"effect"` | vorhanden |
| Leder-Dodge vs. Miss | `kind:"miss"` (ununterscheidbar) | teilweise → E+ |
| Mana-Not (Weak-Melee) | `character.mana` + `castManaCost` | ableitbar |
| Momentum-Licht / Patt-Warnung | HP/Ward-Quoten, `cs.noProgressMs` | vorhanden |
| Kill / Niederlage / Stopp-Grund | `kind:"kill"/"defeat"`, `cs.stopReason`, `stats.deaths` | vorhanden |
| Kill-Karte (XP/Loot/Gold/Blutmond) | `cs.lastKill` inkl. `bloodMoonProc` | vorhanden |
| Erst-Kill | `state.monsterKills` (Delta) | vorhanden |
| Rare-Drop | `kind:"loot"` + `monster.loot`-Chancen (Content) | vorhanden |
| Pet-Drop | `kind:"pet"`, `state.lastPetDrop` | vorhanden |
| Pet-Ability | `kind:"petAbility"` (petId, ability, amount) + bestehende Sprite-FX | vorhanden |
| Levelup im Kampf | `state.skills` + `kind:"xp"` (skill) | ableitbar |
| Mitigation/Raw-Schaden | hit/crit-Felder `rawDamage`/`mitigated` | vorhanden |

Fazit der Tabelle: ~90 % der Dramaturgie braucht NULL Engine-Arbeit. Die drei ehrlichen Lücken
(bleed/poison-Ticks, miss-Unterscheidung shock/dodge, Melee-Lifesteal-Log) sind additive
Log-Anreicherungen der bestehenden Bug-Klasse-Prävention "definiert, aber nie gezeigt" —
je S-Aufwand bei mir, mit Regressionstest, ohne RNG-Draw, ohne Mechanik-Entscheid.

---

## 7. Mechanik-Ideen (Chef-Entscheid nötig — NICHT als 0.4.0-Default empfohlen)

Beim Lesen aufgefallene strukturelle Watchability-Lücken. Alle wären deterministisch baubar,
aber alle verändern Balance/TTK und brauchen Content-Daten (Content-Dev) — getrennt entscheiden:

1. **Monster-Spezial-Angriff auf Timer.** Das Pet-Ability-Framework (Intervall-Timer, feste
   Wirkungs-Kinds, Log-Event) existiert spiegelbar für Monster: alle X s ein telegraphierter
   schwerer Schlag / Selbst-Buff / Flächen-DoT, 1-2 s vorher als Aufladen sichtbar. Größter
   struktureller Watchability-Hebel ("gleich kommt was"). Determinismus: unkritisch (Timer wie
   petAbility). Balance: JEDES Monster wird härter; TTK-Envelope und Sim müssten neu gepinnt
   werden; Auto-Eat-Schwellen geraten unter Druck. Content: neues MonsterDef-Feld + Daten für
   ~100 Monster. Aufwand L. Ehrlich: der Telegraph belohnt niemanden, der nicht zuschaut —
   er ist reine Schau, das ist okay, muss aber bewusst so gewollt sein.
2. **Echte Boss-Phasen** (bei 50 % Verhaltenswechsel statt nur enrage-Multiplikator): sichtbar
   dramatisch, aber ein neues Zustandsfeld im CombatState (Save-Thema, Logic-Dev) + Content je
   Boss. Enrage-Sichtbarmachung (Abschnitt 2) liefert 70 % des Gefühls für 5 % der Kosten — erst
   die, dann neu bewerten.
3. **Overkill-Finisher.** `overkill` wird bereits berechnet (overkillCarry). Ein "Zerschmettert!"-
   Label ab z.B. Overkill > 50 % maxHp wäre sogar reine Präsentation (P, ableitbar aus letztem
   hit-Event vs. Rest-HP im Vor-Tick) — nur falls der Chef daraus MECHANIK machen will
   (Bonus-Loot bei Finisher o.ä.): das wäre neuer RNG im Kill-Pfad → Sequenz-Bruch aller
   geseedeten Fixtures, dagegen.
4. **Kill-Streak-Bonus** (Mechanik-Belohnung für ununterbrochene Kills): erzeugt Verlust-Angst
   beim Weglegen → verletzt die Idle-Natur. Als reine Anzeige ja (Abschnitt 5), als Mechanik nein.

## 8. Priorisierung — Top 10 für 0.4.0 (Wirkung ÷ Aufwand)

| # | Idee | Kat. | Aufwand | Begründung |
|---|---|---|---|---|
| 1 | Status-Overlays am Sprite (alle 5 Typen, ein System) | P | M gesamt | Kern-These des Docs; macht die halbe Engine sichtbar |
| 2 | Enrage-Schwelle + Rage-Zustand | P | S | Größter Aha-Effekt pro Stunde; erklärt "plötzlich tut alles weh" |
| 3 | Boss-Intro im vorhandenen Breather-Fenster | P | M | Das Fenster wurde DAFÜR gebaut und liegt brach |
| 4 | Ward-Schild-Visual beidseitig + Bruch-Moment | P | M | Behebt die dokumentierte Verwechslungs-Klasse ("miss 9/10") endgültig |
| 5 | Biss- + Schluck-Moment (Auto-Eat/Potion) | P | S | Idle-Kompetenz wird Fürsorge-Moment; Events komplett vorhanden |
| 6 | Erst-Kill-Discovery auf der Bühne | P | S-M | Session-Belohnung, reines State-Delta |
| 7 | Rare-Drop-Moment am Sprite | P | M | Genre-Kern-Payoff; Chase-Philosophie verdient die Bühne |
| 8 | Trait-Badges (inflict/resist/regen/ward) an der Gegner-Karte | P | M | Informations-Dramaturgie: Vorbereitung wird belohnt |
| 9 | Low-HP-Rettungs-Story (Vignette + verdichtete Log-Zeile) | P | M | Wendepunkte sind das, was man nacherzählt |
| 10 | E+-Paket in einem Rutsch: bleed/poison-Dot-Ticks, miss-`reason` (shock/dodge), Melee-Lifesteal-Log | E+ | S-M | Ein combat-dev-Durchgang, drei Lücken zu, alles Log-additiv + Regressionstests |
| Reserve | Levelup-Säule, Blutmond-Rot, Patt-Vorwarnung, Momentum-Licht, Kill-Zähler | P | je S | Nachschieben, wenn Top 10 sitzt |

## 9. Nicht tun (erzeugt FOMO, Anstrengung oder bricht Gesetze)

- **Keine Streaks mit Verfall / Zeitdruck-Boni**: nichts, was beim Tab-Wechsel oder Offline-Gehen
  "verloren" geht. Anzeige ja, Belohnung nein.
- **Kein Input im Kampf** (QTE, Dodge-Klick, Finisher-Button): bricht Auto-Battle und die
  Offline-Parität. Der Kampf läuft identisch, ob man zuschaut oder nicht — die Bühne ist Kino,
  nie Cockpit.
- **Keine Slow-Motion / Engine-Pausen für Effekte**: die Präsentation legt sich ÜBER den laufenden
  Kampf (Elite-Intro-Muster), sie hält nie Ticks an. Sonst divergiert online/offline sofort.
- **Kein Engine-RNG für Optik**: jeder zusätzliche nextFloat-Draw verschiebt die gesamte Sequenz
  und bricht geseedete Fixtures und Save-Sim-Parität. Kosmetik-Zufall nur renderer-seitig.
- **Kein 10-Hz-Spam**: der 100-ms-Tick darf nie 1:1 auf die Bühne (Vorbild: emitBurnTick drosselt
  auf 1/s). Alles Neue drosselt oder verdichtet.
- **Keine Effekt-Eskalation über fxLevel hinweg**: alles respektiert das bestehende FX-Setting;
  reduzierte Stufe = Badges/Text statt Overlays.
- **Kein VFX-Vergolden** (Chef-Entscheid steht): keine Partikel-Systeme, keine Spritesheets, kein
  Vergolden des Spell-Platzhalters. 0.4.0 = Lesbarkeit, nicht Juice.
- **Keine Fake-Momente**: nichts anzeigen, was die Engine nicht wirklich getan hat (kein
  "knapp entkommen!"-Theater, wenn die HP nie kritisch waren). Die Bühne darf verdichten,
  nie erfinden — sonst untergräbt sie das Vertrauen in den Log.
- **Keine Sichtbarkeit als Balance-Hintertür**: kein Vorschlag hier ändert TTK, XP, Loot oder
  RNG. Wo eine Idee das doch bräuchte, steht sie in Abschnitt 7 beim Chef.
