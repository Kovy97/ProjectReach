# Konzeptplan: Random Elite Spawns („Die Champions des Reach")

*Stand 2026-07-21. Konzept, noch nicht implementiert. Baut auf bestehenden Systemen auf — Referenzen unten sind real geprüft.*

## Idee in einem Satz
In jedem freigeschalteten Kampf-Gebiet können zufällig **benannte Elite-Gegner** erscheinen — stärkere, betitelte Varianten der Zonen-Monster, die für ein begrenztes Zeitfenster verfügbar sind, einen **einzigartigen Chase-Loot** fallen lassen und per Toast unten rechts angekündigt werden („Ein mächtiger Gegner wurde in X gesichtet…").

Das ist unser Alleinstellungs-Feature gegen „nur noch ein Melvor": es bringt Spannung, Überraschung und persönliche Jagd-Momente, die ein reines Zahlen-Idle nicht hat — und baut fast komplett auf Fundamenten auf, die schon stehen.

---

## 1. Wie das System funktioniert (Mechanik)

### 1.1 Der Elite ist ein skalierter Basis-Mob, kein neuer Content-Berg
Ein Elite wird zur Laufzeit **synthetisch** aus einem vorhandenen Zonen-Monster erzeugt — exakt das Muster, das `paragonScaledMonster` (`packages/engine/src/paragon.ts:173`) für den Paragon-Turm schon nutzt: `{ ...baseMonster, maxHp×M, damage×M, …, loot: <eigene Elite-Tabelle> }`, deterministisch rekonstruierbar aus wenigen Feldern. Dazu kommt:
- ein **Titel** (z. B. „Grauzahn, der Ausgehungerte"), aus einem Namens-/Epitheta-Pool je Zone,
- ein **Modifikator** (Affix-artig): z. B. *Ausgehungert* (+Schaden), *Gepanzert* (+Armor), *Giftig* (`inflict` poison), *Rasend* (`enrage`). Diese Felder existieren alle schon in `MonsterDef` (`shared/src/index.ts:2935`).

Damit ist ein Elite **kein** handgepflegtes 111. Monster, sondern Basis-Mob × Multiplikatoren × Modifikator × Loot-Tabelle. Content-Aufwand pro Elite ≈ eine Tabellenzeile.

### 1.2 Spawn-Zyklus — pro Zone, versetzt rotierend (Chef 2026-07-21)
Alle Zeit läuft über feste Ticks (`TICK_MS = 100`), aller Zufall über den seedbaren PRNG. Für Elites führen wir einen **eigenen RNG-Strom** `state.eliteRng` ein (zweiter mulberry32-Seed), damit Elite-Würfe die Grind-Loot-Sequenz (`state.rng`) **nie verschieben** — die normale Progression bleibt bit-identisch.

**Jede Zone hat ihren eigenen, unabhängigen Zyklus** (`state.eliteSpawns: Record<ZoneId, { variantId, remainingMs } | null>` + `eliteCooldownMs: Record<ZoneId, number>`), bewusst **versetzt**, sodass die Zonen durchrotieren und selten mehrere Elites gleichzeitig aktiv sind:
1. **Ruhe** — pro Zone ein eigener Cooldown-Timer, Richtwert **60–120 Min** Spielzeit, randomisiert über `eliteRng`. Die Anfangs-Cooldowns werden **gestaffelt** initialisiert (Zone *i* mit einem Grund-Offset), damit sie sich von Beginn an über die Zeit verteilen statt zu clustern.
2. **Spawn** (Timer der Zone fällig) — nur wenn die Zone freigeschaltet ist (`isZoneUnlocked`, `zones.ts:25`): `eliteRng` wählt eine der 2–3 Elite-Varianten der Zone. Setzt den Zonen-Eintrag + Toast-Breadcrumb (§2.1).
3. **Aktiv** — der Elite ist in seiner Zone jagdbar, ein **Verfügbarkeitsfenster von max. ~15 Min** (`remainingMs`) tickt herunter.
4. **Ende** — bei **Kill** oder **Ablauf** zurück zu *Ruhe* (neuer, randomisierter Cooldown). So rotiert jede Zone unabhängig weiter.

Netto: Über den Tag „wandert" die Elite-Aktivität durch die Gebiete — meist ist 0–1 Zone aktiv, gelegentlich zwei, nie ein Dauerzustand.

### 1.3 Offline-Verhalten — ENTSCHIEDEN (Chef 2026-07-21): Aktiv-/Online-Feature
Der Elite-Zyklus tickt **nur bei aktivem Spiel** (in `step` mit `offline`-Guard, nicht in der Offline-Catch-up-Sim). Man verpasst offline nichts „Wartendes", weil offline gar keiner spawnt — Elites sind bewusst eine Belohnung fürs Dabeisein und ein Grund, aktiv reinzuschauen. Der eigene `eliteRng`-Strom garantiert, dass die **Kern-Progression trotzdem bit-identisch** offline==online bleibt (der Grind läuft komplett über `state.rng`, unberührt).

### 1.4 Früh-Haken (Vorschlag, braucht GO — Kontext Refund-Rate)
Der **allererste Elite** eines neuen Spielstands spawnt **garantiert innerhalb der ersten ~20–30 Min** in den Pastures (danach greift die normale Rotation). Ein früher „Whoa, was ist DAS?"-Moment mit einem spürbaren Unique als Belohnung — genau in dem Fenster, in dem Refund-Entscheidungen fallen (< 2 h Spielzeit). Billig zu bauen (Erst-Cooldown der Startzone kurz initialisieren), großer Ersteindrucks-Hebel.

### 1.5 Kill-Belohnung
Läuft durch den bestehenden `onEnemyDefeated`-Pfad (`combat.ts:819`): die Elite-Loot-Tabelle wird über `rollLootTable` abgerollt. Der **Unique droppt mit ~20 % Chance** (Chef 2026-07-22 — bewusst KEINE Garantie: der Elite selbst bleibt das Ereignis, der Unique die Jagd); fällt er, wird er als **Item-Instanz mit garantiertem Suffix** erzeugt (`createSuffixInstance`/`intakeInstance`) und via `grantLoot` sicher zugestellt (Inventar → Bank → Postfach). Nach dem Kill: Zyklus zurück auf *Ruhe*.

---

## 2. Wie es visuell dargestellt wird

### 2.1 Ankündigung — Toast unten rechts (Chef-Wunsch)
Über das bestehende Engine-Breadcrumb-Muster (`Toasts.tsx`, Vorbild `lastParagonChest` `:398`): neues Feld `state.lastEliteSpawn = { zoneId, variantId, seq } | null` + monotoner `eliteSpawnSeq`. Die UI liest es pro Tick, zeigt einen **besonders gestylten** Toast (episch/rot, evtl. eigener Sound) — „**Ein mächtiger Gegner wurde in den Aschefeldern gesichtet…**" — und quittiert mit `null`. Klick auf den Toast springt direkt in die Zone (bestehendes Monster-Card-Jump-Muster).

### 2.2 Zonen-Auswahl (Stufe 1)
Auf der betroffenen `.zone-card` ein auffälliges **Elite-Banner/Badge** (pulsierender Rand + „⚔ ELITE"), analog zum vorhandenen `slayer-target-badge` (`CombatPage.tsx:3124`). So sieht man auf einen Blick, wo der Champion steckt.

### 2.3 Monster-Grid der Zone (Stufe 2)
Eine hervorgehobene **Elite-Variante der `MonsterCard`** (`CombatPage.tsx:2459`), fest **ganz oben** im Grid:
- größerer Rahmen in Rarity-/Episch-Farbe (`RARITY_COLORS` existiert), Porträt mit Modifikator-Tönung,
- **Titel** statt nur Mob-Name („Grauzahn, der Ausgehungerte"),
- Modifikator-Chip („Ausgehungert · +40 % Schaden"),
- **Countdown-Timer** „Verschwindet in 18:42" (aus `remainingMs`),
- Unique-Loot-Vorschau (das Chase-Item hervorgehoben).

### 2.4 Optional (später)
Ein dezenter globaler Indikator (Sidebar/Topbar): „Elite aktiv · Aschefelder". Nicht MVP.

---

## 3. Uniques & Loot

### 3.1 Grundsatz
Jeder Elite lässt **einen garantierten, thematischen Unique** fallen (plus erhöhte Chance auf die regulären Zonen-Chase-Items, Bonus-Gold, Mats). Der Unique folgt unserer **Rare-Drop-Philosophie**: Stats etwa auf dem Niveau des *nächsten* Tiers, aber mit den Anforderungen des *aktuellen* — und ab und an ein besonderer Effekt.

### 3.2 Einzigartigkeit über Instanzen (WoW-Stil)
Der Unique wird als **`ItemInstance` mit garantiertem Suffix** gedroppt (`rollSuffix` mit `ilvl = Elite-Level`, hoher/garantierter `suffixChance`). Dadurch ist **jeder Elite-Drop leicht anders gerollt** — zwei „Hunger-Reißzähne" haben unterschiedliche Suffix-Stärken. Das ist das Chase-Gefühl („noch mal, für den besseren Roll"), das Melvor komplett fehlt.

**ENTSCHIEDEN (Chef 2026-07-21): Uniques tragen von Anfang an besondere Procs/Passiva**, nicht nur Stats. Kosten-Disziplin dabei: Effekte bevorzugt aus **bestehenden Engine-Familien** komponieren (Lifesteal, Status-Inflict beim Treffer, Gold-/Lucky-Procs, Regen, Enrage-artige Schwellen — alles vorhanden), nur vereinzelt echte neue Mechaniken (die kosten je eigenen combat-dev-Hook). Beispiele: „Hunger-Reißzahn — Treffer gegen Gegner unter 30 % HP heilen 2 % Max-HP" · „Aschelunge-Talisman — dein Burn hält 50 % länger" · „Dornenkrone — Angreifer erleiden 5 % Rückschaden".

### 3.3 Loot-Paket pro Elite
- **1 Unique mit ~20 % Dropchance** (benannt; wenn er fällt: Instanz + garantierter Suffix + eigener Proc/Passiv-Effekt).
- **↑ Chance** auf die regulären Chase-Items der Zone.
- **Bonus-Gold** + Zonen-Mats in erhöhter Menge.
- Optional: eine **„Champion-Essenz"** (exklusives Mat) — Sammelwährung für ein späteres System (Elite-Craft/Upgrade). Erst später, nicht MVP.

### 3.4 Content-Umfang
**10 Kampf-Zonen × 2–3 Elite-Varianten = ~20–30 Elites**, dazu **~20–30 Unique-Items**. Die Zonen und ihre Level-Bänder stehen fest:

| Zone | Level | Elite-Thema (Beispiel) |
|---|---|---|
| The Pastures | 1–15 | Bestien-Champions (Wolf/Ratte/Goblin) |
| The Borderlands | 15–60 | Räuber-/Bestien-Anführer |
| The Ashfields | 30–45 | Asche-Verseuchte |
| The Blackthorn Wood | 45–65 | Dornen-/Waldschrecken |
| The Crypt | 65–90 | Untote Fürsten |
| Wildwood Hunting Grounds | 90–120 | Urwild-Alphatiere |
| Tidewater Shoals | 120–155 | Tiefen-Schrecken |
| Slag Pit & Frost Caverns | 155–200 | Schlacke-/Frost-Titanen |
| The Highlands | 200–242 | Hochland-Berserker |
| The Idol Hall | 245–310 | Götzen-Erwachte |

Beispiel-Uniques (im Rahmen der kreativen Item-Lizenz frei erfindbar): „Hunger-Reißzahn" (Dolch, Pastures), „Aschelunge-Talisman" (Ashfields), „Dornenkrone" (Blackthorn), „Griff des Gezeitenschreckens" (Coast).

---

## 4. Umsetzung — Phasen & Owner

1. **Datenmodell + Engine** (logic-dev + combat-dev): `eliteRng`, `state.eliteSpawn`, `lastEliteSpawn`/`eliteSpawnSeq`, Zyklus in `step`/`combatStep`, Elite-Skalierung nach `paragonScaledMonster`-Muster, Kill→Unique-Instanz. **SAVE_VERSION 71→72** + Migration + `sanitizeState`-Härtung + v72-Vault-Pin (Save-Compat-Gesetz). Determinismus-/offline==online-Test wie bei Blessings.
2. **Content + Balance** (content-dev + balance-designer): 2–3 Elite-Varianten je Zone (Skalierungs-Multiplikatoren, Modifikator, Namens-Pool, Loot-Tabelle) + ~20–30 Unique-Item-Defs (Stats nach Rare-Drop-Philosophie, **je ein Proc/Passiv** — bevorzugt aus bestehenden Effekt-Familien). Balance der Spawn-Intervalle/Fenster/Stat-Multiplikatoren; neue Proc-Hooks, wo nötig, an combat-dev.
3. **UI** (ui-dev): Elite-Toast, Zonen-Badge, Elite-`MonsterCard` mit Countdown; alles in 7 Sprachen.
4. **Assets** (Chef + asset-integrator): **volle eigene Elite-Art wie bei allen anderen Kreaturen** (Chef-Entscheid 2026-07-21 — keine eingefärbten Varianten) über die ChatGPT-Prompt-Pipeline (Chroma-Key-Klausel) + Unique-Item-Icons (ohne Glow, Standing Rule).
   **Dateinamens-Konvention (Phase 3 verdrahtet):** Elite-Porträts nach `apps/client/src/renderer/assets/monsters/<variantId>.png` — die UI (`getEliteMonsterSrc`) greift sie automatisch und fällt bis dahin auf die Art des Basis-Monsters zurück. Unique-Icons wie üblich über die Item-Id.

**Reihenfolge:** 1 zuerst (Fundament neutral, kein sichtbares Verhalten), dann 2+3 parallel, dann 4 einbinden.

---

## 5. Entschieden (Chef 2026-07-21)
1. **Online-/Aktiv-Feature** — Zyklus tickt nur bei aktivem Spiel (§1.3). ✓
2. **Elite-Art wie normale Kreaturen** — volle eigene Monster-Art, keine Einfärbungen. ✓
3. **Uniques mit Procs/Passiva** von Anfang an (§3.2). ✓
4. **Per-Zone-Timer, versetzt rotierend**, Verweildauer max. ~15 Min (§1.2). ✓

## 6. Entschieden (2026-07-22, Balance-Details s. `elite-balance-spec.md`)
1. **Cooldowns/Stärke:** nach Balance-Spec (28 Varianten, gestaffelte CD-Bänder 55–120 Min, Stärke je Basis-Typ validiert statt pauschal ×5).
2. **Früh-Haken: GO (Chef)** — Pastures-Erst-Fenster fällt in die ersten ~15–25 Min eines neuen Saves (über die Staffel-Formel der Spec).
3. **KEIN Gold-Bounty (Chef):** Elite-Belohnung = mehr Items (Mats ~×4, deutlich erhöhte Zonen-Chase-Chancen) + der Unique. Gold bleibt auf normalem Monster-Niveau (`goldMult` neutral).
4. **Enrage-Override: GO (Chef)** — die Elite-Synthese darf Enrage-Werte des Basis-Mobs dämpfen (Spike-Kill-Schutz).
5. **Idol Hall:** Ausnahme zugelassen (dungeon-only-Basen als reine Stat-Vorlagen; last_idol/drazhan tabu) — per Fokus-Delegation.
6. **Champion-Essenz:** später (geparkt). **Toast-Sound:** vorerst stumm (kein neues Audio-Asset nötig); Sound später mit Combat-FX-Meilenstein.
7. **Unique-Drop: ~20 % Chance, KEINE Garantie (Chef)** — überschreibt die „Unique @1.0"-Zeile der Balance-Spec; Suffix auf dem gefallenen Unique bleibt garantiert.
