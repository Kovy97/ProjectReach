# Taverne, technische Spezifikation (Phase 1, 1.2.0)

> Stand 27.08.2026, Claude. Bindende Vorlage für logic-dev (Engine/Persistenz), content-dev (Daten) und ui-dev (Client).
> Fachliche Quellen: `taverne-konzept.md`, `taverne-voelker-und-gaeste.md` (Fassung 2), Chef-Entscheide E1–E3 und 27.08.
> Typen-Vertrag: `packages/shared/src/index.ts`, Abschnitt „Taverne" (von Claude vorab angelegt, SAVE_VERSION 84).

## 0 Kurzfassung

Die Taverne ist ein New-Haven-Gebäude (`camp_tavern`). Ist sie gebaut, sitzen jeden Tag vier Gäste an vier Plätzen,
jeder mit EINER täglichen Aufgabe seines Berufs (Vorlage × Band). Annehmen, abgeben, ablehnen. Belohnung immer
Gold + passende Rohstoffe + Skill-XP; Fremder und Karawane zahlen stattdessen einen Schwarzmarktbehälter; jede Abgabe
hat 10 % Zusatzchance auf einen Behälter. Keine Story-Bögen, keine Reihenfolge, keine Strafe. Die 60 Dailies aus 1.1.0
bleiben unverändert und hängen als Anschlagtafel in der Taverne.

Die Engine erzeugt KEINE Zeit: der Tagesstempel (YYYYMMDD, lokal) kommt vom Client wie bei den Dailies
(`refreshDailyQuests`). Alle Zufälle der Taverne kommen aus einem reinen Hash (Charakter-Seed + Tag + Platz + Zähler),
NIE aus `state.rng`/`state.eliteRng` (Sequenz-Stabilität der bestehenden Würfe).

## 1 Gebäude (content-dev + logic-dev)

`campBuildings` bekommt `camp_tavern` (Name EN „The Tavern" / DE „Die Taverne", Flavor-Zeile aus der Lore, Overlays ×7):

| Stufe | Gold | Material | Bauzeit | Wirkung (`boost: { kind: "tavernPerks", value: 1 }` je Stufe) |
|---|---|---|---|---|
| I | 1 500 | oak_log ×100 | 15 min (900 000 ms) | Taverne offen, 4 Plätze, 1 Gratis-Wechsel/Tag |
| II | 7 500 | ironbark_log ×60, timber_brace ×8 | 8 h | +1 Gratis-Wechsel/Tag (=2) |
| III | 30 000 | shadowpine_log ×80, bloodiron_bar ×12, timber_anchor ×20 | 24 h | Gold-Belohnung ×1,15 |

Regeln: Stufe I braucht Zentralhaus I wie jedes Gebäude (K4-Kopplung bleibt), aber die Taverne belegt KEINEN
Bauplatz (Ausnahme wie `CAMP_TOWNHALL_ID` in `campUsedBuildSlots`; Konstante `CAMP_TAVERN_ID`). Alt-Saves
bekommen NICHTS geschenkt, sie bauen sie (Chef E1: baubar). Karten-Platzierung wie jedes Gebäude
(`camp.positions`, Footprint wie `camp_trade_post`); Sprites vorerst Platzhalter (ui-dev, s. § 6).

## 2 Zustand (shared, SAVE_VERSION 84)

Siehe `TavernState`, `TavernSeat`, `TavernTask`, `defaultTavernState()` in shared. Kern:

- `tavern.day`: Tagesstempel der letzten Besetzung (0 = nie).
- `tavern.seats[4]`: je `{ guestId, task, swaps }`; `task` = gewürfelte Aufgabe (`templateId`, `band`, `kind`,
  `targetId`, `count`, `accepted`, `baseline`, `rewardGold`, `rewardXp`, `rewardSkill`, `rewardItems`, `paysCrate`,
  `requiredLevel`). `swaps` = wie oft dieser Platz heute gewechselt wurde (Hash-Zutat).
- `tavern.swapsUsed`: Wechsel heute (Gratis-Kontingent = 1 + (Stufe ≥ 2 ? 1 : 0), danach Gold `100 × band`).
- `tavern.deliveredToday`, `tavern.totalDelivered`, `tavern.deliveredByGuest` (Stammgast-Vorbereitung Phase 2).
- `tavern.deliverSeq`: monoton, Zutat für den 10-%-Behälter-Wurf und Toast-Breadcrumb.
- `tavern.lastDelivery`: transienter Breadcrumb `{ seq, guestId, gold, xp, skill, items, crate }` fürs UI.
- `tavern.introSeen`: Halvards Erklärung beim ersten Besuch.
- Neue Zähler in `PlayerStats`: `actionRunsById: Record<ActionId, number>` (jede ERFOLGREICH abgeschlossene
  Aktion, tick.ts) und `producedById: Record<ItemId, number>` (jedes frisch erzeugte Item aus Aktionen UND
  Feld-Ernten, tick.ts + farming.ts). Beide additiv, Migration: `{}`.

Migration (< 84): `tavern = defaultTavernState()`, `stats.actionRunsById = {}`, `stats.producedById = {}`.
sanitizeState: Plätze nur mit bekanntem `guestId` und gültiger Vorlage, Zahlen geklemmt (count ≥ 1, band 1..5,
baseline ≥ 0), unbekannte Items in `rewardItems` gestrichen, Länge exakt `TAVERN_SEATS` (fehlende Plätze = Platz mit
`task: null` → nächster `tavernRefresh` besetzt neu). Vault-Fixture `v84-synthetic-1.2.0.json` (Präzedenz v83).

## 3 Gäste und Vorlagen (content-dev)

`content.tavernGuests: TavernGuestDef[]` = die 19 Gäste aus Fassung 2 (ID-Schlüssel: halvard, viktor, billy, grumm,
brakka, nessa, tamsin, ilvara, odo, dashk, merrit, kell, sefra, orin, wenna, pim, torvald, stranger, ashka).
Felder: `id`, `name` (EN/DE aus der Tabelle; Overlays ×7 dürfen den Namen lassen), `race` (human|elf|orc|goblin),
`sex`, `role` (LocalizedString), `skill` (der Skill, dessen Level das Band bestimmt; `stranger`/`ashka` = null →
Band aus dem Gesamtlevel: 1–199 / 200–499 / 500–899 / 900–1299 / 1300+), `givesTasks` (Halvard false),
`greeting` (LocalizedString, die Stimme aus der Tabelle), `rarity`: `"daily"` | `"rare"` (stranger: 1 von 12 Tagen,
ashka: 1 von 4 Tagen).

`content.tavernTasks: TavernTaskTemplateDef[]`, je Gast 2–4 Vorlagen (Tabelle „Aufgabentypen"). Felder:
- `id`, `guestId`, `kind`: `deliver` (aus dem Bestand abgeben) | `produce` (frisch erzeugen, Zähler
  `producedById`) | `run` (Aktionen erfolgreich abschließen, `actionRunsById`; Pim) | `kill` (monsterKills) |
  `dungeon` (dungeonsCleared) | `champion` (eliteCodex-Kills) | `assortment` (3 verschiedene Items abgeben; Ashka,
  Fremder).
- `select`: wie das Ziel gewählt wird: `{ skill, category?, hasInputs?: boolean, itemType?: "material"|"equipment"|
  "consumable", excludeCategories? }` → Kandidaten = Aktionen des Skills mit `levelRequired ≤ level + 5`
  (bevorzugt `≤ level`, das höchste erreichbare Tier gewichtet ×3; nie Tier < level − 25). Für `kill`:
  `{ zoneBand: true }` → Monster aus freigeschalteten Zonen, deren empfohlenes Level ≤ Kampflevel + 5.
  Für `dungeon`/`champion`: freigeschaltete Dungeons / bekannte Champion-Varianten (eliteCodex).
- `minutes: [b1..b5]` Arbeitsminuten je Band (Richtwerte: deliver 6/8/10/12/15, produce 8/10/12/15/18, run
  6/8/10/12/15). Menge `count = max(1, round(minutes × 60 000 / durationMs × outputQty))` der gewählten Aktion
  (Dauer OHNE Boni, deterministisch).
- `kill`: `count = [8, 12, 16, 20, 25][band]`; `dungeon`: 1; `champion`: 1 (nur Band ≥ 4); `assortment`: 3 Items
  × `count/3`.
- `minBand`/`maxBand` optional (z. B. Merrit „Stück des nächsten Tiers" nur Band ≥ 2; Viktor Champion nur Band ≥ 4).
- `line: LocalizedString` mit Platzhaltern `{count}`, `{target}`, `{zone}` (EN/DE; Overlays ×7 Pflicht wie Quests).

Bänder nach Skill-Level: 1–20 → 1, 21–40 → 2, 41–60 → 3, 61–80 → 4, 81–99 → 5.

## 4 Belohnung (logic-dev, Zahlen hier bindend)

- **Gold** = `TAVERN_GOLD_BY_BAND[band]` × Art-Faktor × (Taverne III ? 1,15 : 1).
  `TAVERN_GOLD_BY_BAND = [0, 150, 400, 900, 1800, 3200]`; Faktor deliver 1,0 / produce 1,2 / run 1,2 / kill 1,3 /
  assortment 1,5 / dungeon 2,0 / champion 3,0.
- **Skill-XP** = `minutes × 1,5 × bestXpPerMinute(skill, level)`; `bestXpPerMinute` = Maximum über alle Aktionen des
  Skills mit `levelRequired ≤ level` von `xp / (durationMs / 60 000)` (reine Content-Rechnung, Boni ignoriert).
  Kampf-Aufgaben (Viktor, Fremder-Kills): `rewardSkill = "slayer"`, XP `= [0, 300, 1200, 3000, 6000, 12000][band]`;
  Dungeon/Champion ×2. Vergabe über den normalen Skill-XP-Pfad (Level-up-Toasts, Achievements zählen mit).
- **Rohstoffe**: deliver/produce/run → das Ziel-Item (bzw. Haupt-Output) × `ceil(count × 0,4)`, plus bei
  Handwerks-Aufgaben (Aktion mit inputs) zusätzlich die Inputs für `ceil(count / 2)` weitere Durchläufe.
  kill → häufigster Drop des Monsters (höchste Tabellenchance, Material) × `band × 3`. Über `addItemOrBank`
  (Überlauf ins Lager, wie Quests).
- **Schwarzmarktbehälter**: Fremder und Ashka zahlen `black_market_crate_<i..v>` (Tier = Band) statt Gold +
  Rohstoffe (Skill-XP bleibt). Jede Abgabe: Hash-Wurf `< 0,10` → ein zusätzlicher Behälter des Bands.
- Alles Feste pro Abgabe wird bei der VERGABE gewürfelt und in `TavernTask` gespeichert (UI zeigt die Belohnung vorab).

## 5 Engine-API (`packages/engine/src/tavern.ts`, logic-dev)

```ts
export function tavernBuilt(state, content): boolean                  // camp_tavern ≥ 1
export function tavernLevel(state): number
export function tavernRefresh(state, content, day: number): boolean   // idempotent; neuer Tag → freie Plätze neu
                                                                      // besetzen (angenommene bleiben), swapsUsed=0,
                                                                      // deliveredToday=0; true wenn Gäste wechselten
export function tavernFreeSwaps(state, content): number               // 1 + (Stufe ≥ 2 ? 1 : 0)
export function tavernSwapCost(state, content, seat): number          // 0 solange Gratis, sonst 100 × band
export function swapTavernGuest(state, content, seat, day): TavernSwapReason // "ok"|"accepted"|"no_gold"|"not_built"
export function acceptTavernTask(state, content, seat): boolean       // setzt accepted + baseline aus dem Zähler
export function tavernTaskProgress(state, content, task): { have: number; need: number; deliverable: boolean }
                                                                      // deliver/assortment: Bestand Inventar+Bank
export function deliverTavernTask(state, content, seat, day): TavernDeliverReason // "ok"|"incomplete"|"level"|...
                                                                      // verbraucht Items (Inventar, dann Bank), zahlt,
                                                                      // setzt lastDelivery, besetzt den Platz sofort neu
                                                                      // (Hash mit seat.swaps+1, nicht erst morgen)
export function openBlackMarketCrate(state, content, itemId): CrateResult | null // s. § 7
export function tavernHash(...parts: number[]): number                // mulberry32-artig, rein
```

Besetzungs-Regeln in `tavernRefresh`: 4 verschiedene Gäste aus `givesTasks`; höchstens 1 Viktor, höchstens 2
Sammler (grumm, brakka, nessa, tamsin); `stranger` nur wenn `hash(seed, day, 7) % 12 === 0`, `ashka` nur wenn
`% 4 === 0`; ein Gast ist vom Tag ausgeschlossen, wenn sein Skill keine Vorlage mit gültigem Ziel liefert.
Angenommene Aufgaben überleben den Tageswechsel. Seed = `character.createdAt` (ganzzahlig) — nicht `state.rng`.

Zähler-Baseline: `accepted` speichert `baseline` = aktueller Zähler (`producedById[target]`, `actionRunsById[target]`,
`monsterKills[target]`, `dungeonsCleared[target]`, `eliteCodex[target].kills`); Fortschritt = Zähler − baseline
(Muster `repeatBaseline`). `deliver`/`assortment` haben keine Baseline (Bestand zählt).

Hooks: `tick.ts` erhöht `actionRunsById[action.id]` bei jedem erfolgreichen Abschluss und `producedById[itemId]`
je erzeugtem Item; `farming.ts` erhöht `producedById` bei der Ernte. Offline identisch (gleicher Pfad).
Achievements (optional, wenn Zeit): `tavern_deliveries` als neuer Condition-Typ; NICHT ins Steam-Set (eingefroren).

## 6 Client (ui-dev)

- `NavView` + Seite `tavern` (id `tavern`, Label `nav.tavern`, direkt unter `newhaven`, Emoji 🍺 bis Miras Icon
  `sidebaricon_tavern.webp` liegt — Auto-Discovery). Ohne gebaute Taverne zeigt die Seite die Baustelle: Text
  „Halvard sucht noch Holz" + Knopf `.btn-iron` „Zum Bauplatz" (→ newhaven). New-Haven-Gebäudekarte
  `camp_tavern` bekommt bei Stufe ≥ 1 den Knopf „Betreten" (→ tavern).
- `TavernPage`: Kulisse `assets/tavern/tavern_interior.webp` (Platzhalter: `bg_tileable_wood.webp` gekachelt +
  dunkle Vignette; Datei-Slot so anlegen, dass Miras Bild nur eingelegt wird). Vier Plätze absolut positioniert
  (Koordinaten-Tabelle `TAVERN_SEAT_POS` im Client, Platzhalter-Werte, kommen von Miras QA-Blatt). Je Platz die
  Gast-Figur `assets/tavern/tavern_<id>_idle.webp` (Platzhalter: passendes Spieler-Roster-Porträt, z. B. viktor →
  human_slayer_m, grumm → human_miner_m; Fallback Silhouette), Klick öffnet die **Gäste-Karte** (Modal im
  Stahl-9-Slice, Muster BuildingPopup): Gesichtskarte `tavern_<id>_face.webp` (Platzhalter = Idle-Bild), Name,
  Rolle, Ansprache (`line` mit Zahlen), Fortschritt „12 / 40", Belohnung (Gold, XP, Items, Behälter),
  Knöpfe `.btn-iron`: Annehmen / Abgeben (aktiv wenn deliverable) / Ablehnen („Wechsel: gratis" bzw. „100 Gold"),
  bei `produce`/`run` zusätzlich Sekundärknopf „In die Warteschlange" (enqueue der Aktion mit `count` als Ziel,
  bestehender Warteschlangen-Pfad).
- Objekte: **Anschlagtafel** (→ Quests-Seite, Reiter Daily), **Tresen/Halvard** (Zeile: Begrüßung; beim ersten
  Besuch Erklärung in 3 Sätzen, setzt `introSeen`), **Kamin** (Chronik-Zeile: Segen des Tages), **Tür**
  (→ newhaven), **Sack des Fremden** (nur wenn Behälter im Inventar/Lager: öffnet den Behälter-Dialog).
- Behälter: Item `black_market_crate_*` in der Tasche → Klick „Öffnen" (Consumable-Pfad `blackMarketCrate`) →
  kleine Zeremonie (Modal: Inhalt als Item-Karten, Rare-Toast-Regeln gelten).
- Tageswechsel: App-weiter Hook (nicht nur auf der Seite): beim Start + Mitternacht `tavernRefresh(state, content,
  todayStamp())`; wechselten Gäste → Toast „Neue Gäste in der Taverne" (nur wenn gebaut). `todayStamp`/
  `msUntilMidnight` aus QuestsPage in ein `util/dayStamp.ts` ziehen (beide Aufrufer).
- i18n: alle UI-Keys (`tavern.*`) in EN + DE + 5 Overlays. Gast-Namen/Zeilen kommen aus dem Content.
- Größen-Floor + Umbruch, nie clip; 1366×768 muss ohne Scrollen gehen (Kulisse `cover` erlaubt).

## 7 Schwarzmarktbehälter (content-dev Item, logic-dev Öffnen)

Items `black_market_crate_i` … `_v` (type `consumable`, `effect: { kind: "blackMarketCrate", tier: 1..5 }`,
stapelbar, Bank-fähig, Verkaufswert 0, kein Shop). Inhalt (`openBlackMarketCrate`, Hash-Würfe aus
`tavern.deliverSeq` + `state.stats.itemsGathered` + tier, verbraucht 1 Stück):
1. sicheres Bündel: 2 Materialien des Bands (häufigste Drops/Outputs des Bands) × 3–8,
2. ein Ausrüstungsstück aus den Monster-Drops des Bands (Zonen mit Empfehlung im Band; Rare-Drop-Regel: mit 5 %
   ein Stück des nächsten Bands),
3. 10 %: ein Champion-Unikat aus dem Pool der bereits besiegten Varianten (`eliteCodex[*].kills ≥ 1`, sonst entfällt),
4. 5 %: eine Rune des Band-Tiers (I–II Band 1–2, III Band 3–4, IV Band 5),
5. 2 %: ein zweites Ausrüstungsstück.
Kein Gold, keine Marken.

## 8 Grenzen dieser Phase

Keine Getränke, keine Stammgäste (nur der Zähler), keine Konversationen (Gesichtskarten liegen vor), keine
Raben-Post, keine Ereignisse. Rona fehlt. Kein Steam-Erfolg. Keine Änderung an den 60 Dailies.

## 9 Abnahme (Claude)

Typecheck 0, Engine/Content/Persistence/Client-Tests grün, Vault-Guard mit v84-Fixture, Kompat-Test v83 → v84,
Screenshots 1920×1080 + 1366×768 (de, ru) der Taverne mit vier Gästen, Karte, Behälter-Dialog; Alt-Save: Taverne
ungebaut → Baustelle sichtbar, Bau 15 min, danach Gäste.
