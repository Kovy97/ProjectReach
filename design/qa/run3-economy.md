# QA-Run 3 — Economy & Progression-Pacing

**Tester:** Playtester / Balance-Reviewer (READ-ONLY, kein Code geändert) · **Datum:** 2026-06-27
**Scope:** Gold-Faucets vs. Sinks · XP-Kurven · Slayer-Punkte-Ökonomie · Shop-Nutzen · Motivations-/Belohnungs-Schleifen · Pacing Früh→Endgame. „Gibt es Gründe zu grinden?"
**Methode:** Direkt aus echten Daten gemessen/nachgerechnet — `packages/content/src/index.ts` (`shop`, `slayerShop`, `slayerMasters`, Tools, Mob-Gold), `packages/engine/src/` (`leveling.ts` XP-Tabelle, `slayer.ts` Punkte-Logik, `shop.ts` Sinks, `sim.ts` Harness, `bank.ts`), `packages/shared/src/index.ts` (Konstanten: `SELL_FRACTION`, `AUTO_EAT_TIERS`, `SLOT_UPGRADE_*`, `earlyXpMult`, `SLAYER_XP_KILL_FACTOR`). Abgeglichen mit `design/gold-economy.md` (2026-06-27) und `design/qa/run2-*`. Sim-g/h-Werte aus `gold-economy.md §1` (cache-frische Sim-Reports) übernommen, nicht neu erfunden.

---

## Fun-Score: **6 / 10** (Economy/Pacing-Linse)

Die **Progression** ist über weite Strecken gut getaktet — der frühe XP-Verstärker (`earlyXpMult` bis 3×) macht das Frühgame zügig und belohnend, die Skill-Dichte ist breit (13 Skills mit Mid-Game-Aktionen, run2), und Gear/Drops tragen die Endgame-Motivation. Das **ökonomische Rückgrat hat aber ein bekanntes, strukturelles Loch**, das den Fun-Score deckelt: **Gold ist ab Mid-Game ein totes Polster** (Faucets skalieren steil, Sinks nicht — `gold-economy.md` diagnostiziert das ausführlich; ich bestätige es an den echten Zahlen). Neu in dieser Linse: **Slayer-Punkte haben exakt dasselbe Problem in klein** — sie sind eine Währung fast ohne mitwachsende Senke. Beides ist per Chef-Verfügung **bewusst an das spätere City-Feature gekoppelt (deferred)**, blockiert kein Gameplay → kein P0. Aber genau die Frage des Auftrags — *„warum farmt man Gold?"* — hat ab L30 derzeit **keine überzeugende Antwort**. Deshalb 6/10 und nicht höher.

**Kurz:** Pacing solide, Carrot-Vielfalt gut, aber **zwei Währungen (Gold + Slayer-Punkte) laufen mid/late tot.** Das ist der dominante Spaß-Dämpfer in dieser Linse.

---

## Stärken

1. **Früh-Pacing ist exzellent kalibriert.** `earlyXpMult(level) = 1 + 2·max(0,(40−level)/39)` gibt L1 **3×**, L20 ~2×, ab L40 1× XP. Der zähste Teil jeder Idle-Progression (die ersten Levels) ist damit am schnellsten — Spieler sehen früh und oft Fortschritt. Sehr gesund.
2. **Gold ist im Frühgame echt knapp & bedeutsam.** Erst-Gear (rusty_sword 15 → steel_warblade 700 → iron_platebody 320 g) plus Spitzhacken (60–2.400 g) kosten mehr als man hat → echte Kauf-Entscheidungen (Waffe vs. Rüstung vs. Werkzeug). Genau das richtige Gefühl für L1–20.
3. **Geometrische Sink-Leitern existieren als Muster und funktionieren.** Slot-Upgrades (`60 × 1,5ⁿ`) und Auto-Eat (3 Stufen, 2k/8k/25k) beweisen, dass der Idle-Komfort-Sink greift — sie sind nur **zu kurz/gedeckelt** (Auto-Eat bei 35k total ausgereizt). Das Gerüst zum Ausbauen ist da.
4. **XP-Kurve ist eine bewährte RS/Melvor-Variante** (`acc += floor(n + 300·2^(n/7))`, `/4`) → ~3,26 Mio XP bis L99 je Skill. Glatt, monoton, vorhersehbar; keine künstlichen Walls in der Kurve selbst.
5. **Drop-/Gear-Treadmill trägt das Endgame.** Smithing-Tiers alle 10 Level, Jewelcrafting-Leiter bis L100 (run2-Fix), Slayer-Unique-Drops + kommendes Rarität/Affix-System → der *nicht-monetäre* Belohnungsmotor läuft. Gold ist nicht der einzige Carrot, was den toten Gold-Pool teilweise kaschiert.

---

## Priorisierte Findings

### [P1 Economy] Gold läuft ab Mid-Game strukturell tot — kein mitwachsender Sink (bekannt, deferred)
**Befund (an echten Zahlen bestätigt):** Faucets skalieren steil — Combat geared 13–20k (early) → 148–150k (mid) g/h; Gathering-Verkauf bis diamond_seam 192k g/h; **Smithing-Marge Sim 1,0–3,4 Mio g/h** (input-unlimited), real-seriell ~75–88k. Die **Sinks sind dagegen fast alle einmalig & früh**: der komplette `shop`-Block (gemessen) endet bei Stahl/L30-Gear (teuerstes Stück steel_warblade 700 g), Spitzhacken enden bei runite (2.400 g), Auto-Eat bei 35k total, Slot-Leiter ist endlich, **Bank ist gratis & unbegrenzt** (`bank.ts` hat kein Kapazitätsfeld — bestätigt). Der einzige mitwachsende Sink (Dungeon-Schlüssel, 4k–160k g) ist **optional** (Schlüssel sind farmbar). Geschätzte Lebenszeit-Pflicht-Ausgaben ~100–300k Gold — in **wenigen Stunden Endgame-Farming** erschöpft.
**Wirkung auf Spaß:** Ab ~L30 kauft Gold **keine Macht** mehr (bestes Gear kommt aus Smithing/Drops, nicht aus dem Shop). Gold wird zur Vanity-Zahl; die Auftrags-Kernfrage *„warum Gold farmen?"* hat late-game keine Antwort.
**Status:** Vollständig in `gold-economy.md` diagnostiziert; Umsetzung **per Chef an die City-Welle gekoppelt (deferred)**. Daher P1 (nicht P0): kein Blocker, aber der größte ökonomische Spaß-Dämpfer.
**Fix (bereits spezifiziert, `gold-economy.md §6-7`):** Minimal-Paket **S1 Werkzeug-Leiter (alle Gather-Skills, bis ~1,5 Mio) + S2 Bank-Erweiterung (∞) + S3 Auto-X-Komfort** schließt das Defizit über alle Phasen. Mindestens **ein ∞-Sink** (S2 Bank, später S6 Schrein / S7 Monument) ist Pflicht. **Kein Income-Nerf.**

### [P1 Economy] Slayer-Punkte sind eine zweite tote Währung — Faucet langsam, Sink endlich & winzig
**Befund (gemessen, NEU — nicht in `gold-economy.md`, das ist gold-only):**
- **Faucet:** `basePoints` pro abgeschlossenem Task = **2 / 5 / 10 / 20** (Master 1–4), bei `taskAmount` 15–50 / 30–80 / 40–100 / 50–120 Kills. Master 1 zahlt also **2 Punkte für 15–50 Kills** → Punkte-Einkommen ist sehr zäh.
- **Sink:** Der gesamte `slayerShop` (gemessen) sind **5 Items**: plague_mask 50 · ear_plugs 75 · mirror_ward 100 · soul_veil 250 · void_anchor 500 = **975 Punkte total**, und das sind **allesamt einmalige Slayer-Anforderungs-Unlocks** (Nasenklammer-Analoga). Dazu Skip (10–50 Pkt). **Es gibt keinen permanenten Upgrade-Kauf, keinen mitwachsenden/∞-Punkte-Sink.** `spendSlayerPoints()` existiert generisch, wird aber von nichts außer dem 5-Item-Shop genutzt.
- **Folge:** Hat ein Spieler die 5 Masken gekauft (~975 Pkt), sammeln sich Slayer-Punkte **für immer ohne Verwendung** an — exakt das Gold-Dead-Pool-Muster in klein. Der Punkt-Reward verliert seinen Zweck genau dann, wenn man am meisten davon bekommt (Master 4, 20/Task).
**Wirkung auf Spaß:** Slayer ist als Skill motiviert (XP, Unique-Drops, Helm), aber die **Punkte-Belohnung selbst ist kein Grund weiterzuspielen** — das verschenkt den klassischsten Slayer-Carrot (OSRS lebt vom Punkte-Shop).
**Fix-Vorschlag:** Punkte-Shop um **mitwachsende/wiederholbare Sinks** erweitern: (a) permanente Mini-Buffs gegen geometrisch steigende Punkte (∞-Sink, analog Schrein-Spende), (b) Task-Reroll/„bessere Task"-Kauf, (c) die in `slayer-overview-plan §4` schon geplanten **legendären Equip-Drops als Punkte-Kauf** (Sicherheitsnetz) — das wäre der erste echte mitwachsende Punkte-Sink. Phase-2-Material, aber heute die zweitgrößte Währungs-Lücke.

### [P2 Economy] Combat-Gold-Kurve ist flach/invertiert — kein Gold-Grund, Endgame-Mobs zu kämpfen
**Befund (aus `gold-economy.md §1` / `combat-gold-and-thieving-audit P2.6`, an Content stichprobenhaft bestätigt):** g/h-Maximum liegt im **Mid-Tier (L42–62)** (slag_kobold 148k, frost_hound 150k), der L120-Boss (last_idol ~74k) zahlt **weniger** als ein L14-Mob pro Stunde. Der vorgeschlagene Gold-Rebalance (P2.6) ist **noch nicht angewendet** (Stichprobe: `goblin_warlock.gold=26`).
**Wirkung auf Spaß:** Endgame-Mobs werden nur um XP/Drops gefarmt, **nie um Gold** — die Income-Kurve gibt dem schwersten Content keinen monetären Reiz. Zusammen mit P1 (totes Gold) doppelt entwertet.
**Fix-Vorschlag:** Combat-`gold` Richtung monoton mit Mob-Level ziehen (eigener Audit existiert: `combat-gold-and-thieving-audit.md`), damit „härter = lohnender" auch monetär gilt — relevant *erst* sobald ein Gold-Sink (P1) existiert, der das Mehr-Gold absorbiert.

### [P2 Economy/Gameplay] Werkzeug-Leiter fehlt für 3 von ~5 Gather-Skills — Gold kann keine Gather-Power kaufen
**Befund (gemessen):** Echte Gold-Werkzeuge im Shop gibt es **nur für Mining** (5 Spitzhacken, bronze→runite, endet bei **L55 / 2.400 g**, kein Endgame-Tier). Woodcutting-„Werkzeuge" sind in Wahrheit **Waffen-Äxte** (Doppelnutzen: `bonus.meleeDamage` + `tool.speedMult`), kommen aus Smithing/Drops, nicht gegen Gold. **Fishing, Foraging, Farming, Herblore haben gar kein Werkzeug** (`tool: { skill: … }`-Grep bestätigt: nur mining + woodcutting). Das generische `bestToolSpeed()`-System in `tools.ts` ist da — es fehlt nur der Content.
**Wirkung auf Spaß:** Doppelter Verlust — (a) Gold hat keinen „Macht-für-Geld"-Kauf im wichtigsten Loop (Gathering, das jeder spielt), und (b) drei Skills haben gar keine Speed-Progression über Werkzeuge.
**Fix-Vorschlag:** `gold-economy.md` **S1** — vollständige geometrische Werkzeug-Leiter für alle Gather-Skills bis Endgame (Top-Tier ~1,5 Mio g). Schließt zugleich Sink-Lücke **und** Gameplay-Lücke; höchster Hebel im Minimal-Paket.

### [P3 Pacing] Late-Game-Belohnungstakt wird ungleich/zäh — Gold tot + Stil-Gear-Dürren
**Befund:** Mit ~3,26 Mio XP/Skill bis L99 ist Late-Skilling ein langer Idle-Grind. Solange Gold tot ist (P1) und Magie/Fernkampf-Gear im Mid-Game seltener neue Tiers bekommt als Melee (`run2-mid-game` P1: Magie-Roben-Lücke L47–88 = 41 Level ohne Upgrade), **stützt sich die Late-Game-Motivation fast nur auf Gear-Crafting + XP-Zahlen** — und für Nicht-Melee-Builds ist selbst die Gear-Schleife ausgedünnt. Risiko: Late-Game fühlt sich „zäh" an, weil zwei der drei Belohnungs-Achsen (Gold, Stil-Gear) schwach sind und nur die XP-Achse trägt.
**Wirkung auf Spaß:** Kein harter Wall, aber abnehmender Belohnungs-Takt genau dort, wo Idle-Spieler am ehesten abspringen.
**Fix-Vorschlag:** P1-Sinks geben Gold late-game wieder Takt; parallel die Stil-Gear-Lücken (run2 P1/P2) füllen, damit alle 3 Achsen late-game liefern. Mastery/Achievement-Meilensteine als zusätzliche Mikro-Belohnung prüfen.

---

## Pacing-Bewertung Früh → Endgame (Zusammenfassung)

| Phase | Income g/h (on-level) | Gold-Gefühl | XP-Takt | Verdikt |
|---|---|---|---|---|
| **Früh L1–20** | ~5–20k | knapp & bedeutsam — echte Kaufentscheidungen | 3×→2× Verstärker, sehr zügig | ✅ **gesund** — bester Teil der Kurve |
| **Mid L20–50** | ~30–150k | lockert; Auto-Eat+Slots in 1–2 h abbezahlt, dann Stau | 1×, Skill-Vielfalt hoch | 🟡 **beginnende Inflation**, noch unterhaltsam |
| **Late L50–99** | 150k–3,4 Mio | **totes Polster** — Gold kauft keine Macht | langer Grind, Gear trägt | 🔴 **Gold/Punkte tot**; Gefahr „zäh" für Nicht-Melee |

**Gründe zu grinden, ehrlich bewertet:**
- **Gold:** früh stark ✅ · mid schwächer 🟡 · late **kein Grund** 🔴 (deferred-Fix bekannt).
- **XP:** durchgehend gültig ✅ (Levels gaten Gear/Aktionen/Zonen/Master) — die verlässlichste Carrot.
- **Slayer-Punkte:** schwach durchgehend 🔴 (nur 5 Einmal-Unlocks, kein mitwachsender Sink).
- **Drops/Gear:** der eigentliche Endgame-Motor ✅ (Smithing-Tiers, Unique-Drops, Rarität kommt) — trägt das Late-Game trotz toten Golds.

---

## Bottom Line
Das **Progressions-Pacing ist gut konstruiert** (früher XP-Verstärker, glatte Kurve, breite Skill-/Gear-Carrots), aber die **Economy hat zwei tote Währungen**: Gold ab L30 (bekannt, ausführlich spezifiziert, per Chef an City gekoppelt) **und Slayer-Punkte** (neu hier, gleiches Muster in klein, noch nicht adressiert). Beides blockiert kein Gameplay → kein P0, aber beides untergräbt direkt den Auftrags-Kern *„warum farmt man?"*. Höchster Hebel ohne tiefe Chef-Entscheidung bleibt das **Minimal-Sink-Paket S1+S2+S3** aus `gold-economy.md`; die **zweitgrößte ungenutzte Senke ist der Slayer-Punkte-Shop**.
