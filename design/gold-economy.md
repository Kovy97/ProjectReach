# Gold-Ökonomie — Audit & Sink-Design (Grundsatz-Durchdenkung)

**Autor:** Balance-Designer (PLAN/ANALYSE-ONLY) · **Datum:** 2026-06-27
**Auftrag (Chef):** Gold grundsätzlich durchdenken — *Wie viel ist Gold wert, wofür braucht man es,
und warum farmt man es?* Schwerpunkt: **verlässliche Sinks + überzeugende Gründe, Gold zu farmen.**
**Reviergrenze:** Dies ist eine reine Spec. Keine `packages/**`/`apps/**`-Datei wurde geändert.
content-dev/logic-dev/ui-dev übernehmen die Zahlen.

**Datenquellen:**
- Sim: `pnpm --filter @hearthforge/engine exec vitest run sim` (cache-frisch, 1h-Report; Gold/h je Aktion/Mob).
- Bestehende Sim-Reports: `design/qa/tester-balance.md` (2026-06-27), `design/crafting-margin-audit.md`,
  `design/combat-gold-and-thieving-audit.md`, `design/sim-economy-snapshot.md`.
- Content: `packages/content/src/index.ts` (`shop`, Mob-`gold`, Aktions-`gold`, Item-`value`, Dungeons).
- Engine: `packages/engine/src/shop.ts` (Kauf/Verkauf, Slot-/Auto-Eat-Upgrade), `bank.ts` (Lager),
  `tick.ts` (Aktions-Gold), `combat.ts` (Kill-/Dungeon-Gold), `quests.ts` (Quest-Gold).
- Konstanten: `packages/shared/src/index.ts` (`SELL_FRACTION=0.5`, `SLOT_UPGRADE_*`, `AUTO_EAT_TIERS`).

---

## TL;DR — Diagnose in drei Sätzen

1. **Die Faucets skalieren steil** (Frühgame ~10k g/h → Endgame 150k–mehrere Mio g/h), v.a. High-Tier-Smithing
   und Gathering-Verkauf — Gold-**Einkommen** ist reichlich und wächst über das ganze Spiel.
2. **Die Sinks skalieren NICHT** — fast alle Gold-Ausgaben sind **einmalige Frühgame-Käufe** (Shop-Gear bis
   Stahl, Werkzeuge, 35k Auto-Eat, endliche Slot-Leiter). Der einzige mitwachsende Sink (Dungeon-Schlüssel)
   ist **optional** (Schlüssel sind farmbar).
3. **Folge:** Gold ist ab Mid-Game ein **totes Ressourcen-Polster** — man häuft Millionen an, hat aber nichts
   zu kaufen. Es fehlt **nicht an Faucets, sondern an verlässlichen, mitwachsenden Sinks** — und damit am
   Grund, Gold überhaupt zu farmen.

**Kernhebel (dieser Doc):** ein mitwachsendes Sink-Gerüst bauen (Werkzeug-Leiter, Bank-Erweiterung, Auto-X-
Komfort, Plot-/Greenhouse, Reroll-Treadmill, Monument-∞-Dump), kalibriert auf die Einkommens-Kurve je Phase.

---

## 1) FAUCETS — Quellen & Skalierung

> Lesehinweise zu den Zahlen: (a) **Sim-Combat-g/h sind mit einem *geared Endgame-Helden* gemessen** —
> ein On-Level-Spieler verdient deutlich weniger; die Werte sind die *Decke*. (b) **Processing/Crafting-g/h
> in der Sim sind „Input-unlimitiert"** (Sim-Inputs gratis) → Bruttowert, kein realer Profit; der reale,
> serielle Voll-Ketten-Netto steht daneben. (c) Gathering-g/h = echter Verkaufswert.

### 1.1 Faucet-Übersicht (g/h je Phase)

| Quelle | Early L1–20 | Mid L30–60 | Endgame L75–120 | Skaliert vernünftig? |
|---|---|---|---|---|
| **Combat** (Kill-Gold + Loot-Verkauf, geared) | ~13–20k | slag_kobold 148k · frost_hound 150k | ~55–150k (last_idol 74k) | ⚠️ **flach/leicht fallend** zum Endgame — Maximum bei L42–62, nicht beim Boss (P2.6 offen) |
| **Thieving** (Direkt-Gold + Fence) | beggar 6,8k → merchant 12,7k | tax_collector 23k → strongbox 44k | noble 50k · tax_vault 73k · idol_hoard 125k (+Fence) | ✅ steigt monoton (nach P2.4-Fix); ⚠️ low/mid-Fence +73–104 % über Guardrail |
| **Gathering-Verkauf** (Mining/Foraging/Woodcutting) | ~10–20k | ruby_seam 112k | diamond_seam 192k · forage_starcaps 134k · godfungus 132k | ✅ steigt; High-Tier-Verkaufswerte großzügig (bewusst, da Crafting-Inputs) |
| **Smithing/Crafting** (Verarbeitung → NPC-Verkauf) | – | hochfahrend | **Sim 1,0–3,4 Mio g/h** · **real seriell ~64–88k** | 🔴 **Sim explodiert** (input-unlimited); real erz-gated ~Combat-Niveau. **Größter unkontrollierter Faucet, wenn Erz gehortet wird** |
| **Quests/Dailies** | einmalig klein | klein | klein | vernachlässigbar als Strom |
| **Dungeon-Clear-Gold** | warband 320/Run | crypt 1200 · wildwood 900/Run | highland 3000 · idol_sanctum 8000/Run | ✅ skaliert mit Tier (Bonus zum Mob-Gold) |

### 1.2 Befunde Faucet-Seite

- **Smithing-Forge-Marge ist der dominante (und am wenigsten kontrollierte) Faucet.** Sim misst
  `forge_godiron_greatsword` **3,42 Mio g/h**, `forge_titanium_maul` 1,78 Mio, `forge_bloodiron_spear`
  1,04 Mio — input-unlimitiert. Der `crafting-margin-audit` zeigt: **real, serielle Voll-Kette** (Erz minen
  → Kohle → smelten → schmieden, ein Aktionsslot) fällt das auf **~75–88k g/h** = Combat-Niveau. **ABER:**
  ein Idle-Spieler, der **offline/parallel Erz hortet** (Farming-Plots-Mechanik, Offline-Mining), entkoppelt
  die Beschaffung von der Schmiede-Zeit — dann nähert sich der reale Durchsatz dem Sim-Bruttowert an. Die
  **Pro-Item-Marge** (godiron_blade: 5 Barren roh 1.200 g → Klinge 7.000 g NPC = +5.800 g je 26 s) ist enorm.
  → Smithing ist der **Haupt-Einkommens-Multiplikator** im Endgame und damit der wichtigste Grund, *warum die
  Sink-Seite mitwachsen muss*.
- **Combat-Gold ist zu flach** (vorbestehend, `combat-gold-and-thieving-audit.md` P2.6, **noch nicht
  angewendet** — Stichprobe: `goblin_warlock.gold=26`, nicht der vorgeschlagene Wert): ein L14-Mob liefert
  ~gleich viel g/h wie der L120-Boss; das g/h-Maximum liegt im Mid-Tier (L42–62). Endgame-Mobs werden um
  XP/Drops gefarmt, nicht um Gold. Das ist primär ein *Income-Curve-Thema* (eigener Audit existiert), berührt
  den Sink-Mangel aber nur indirekt.
- **Fence-Kette zahlt low/mid +73–104 % über dem dokumentierten +15–25 %-Guardrail** (Gem-Byprodukte;
  `tester-balance.md §3`). Ein zusätzlicher kleiner, unkontrollierter Faucet, aber **nicht das Ökonomie-
  Hauptproblem** (Fence/Thieving endgame ~150–200k vs. Smithing 1–3,4 Mio).

**Faucet-Fazit:** Es gibt **mehr als genug** Gold-Quellen, und sie wachsen über das Spiel. Das Problem liegt
nicht hier — es liegt darin, dass dem wachsenden Strom **kein wachsender Abfluss** gegenübersteht.

---

## 2) SINKS — Wofür man Gold AKTUELL ausgibt

Vollständige Liste der existierenden Gold-Abflüsse (Engine: `shop.ts`/`tick.ts`/`combat.ts` + Content `shop`):

| Sink | Kosten | Typ | Phase | Skaliert mit Income? |
|---|---|---|---|---|
| **Shop-Gear** (rusty_sword … steel_warblade) | 12–700 g | **einmalig** | early | 🔴 **NEIN** — Sortiment endet bei ~Stahl/L30-Gear; danach kommt alles aus Smithing/Drops |
| **Starter-Magie/Drop-Gear** (apprentice_robe, boar_tusk_mace …) | 85–240 g | einmalig | early | 🔴 NEIN |
| **Spitzhacken** (bronze … runite) | 60–2.400 g | einmalig (6 Stück) | early–mid | 🔴 NEIN — endet bei runite, kein Endgame-Tier; nur Mining (kein Axt/Rod/Sichel-Pendant) |
| **Samen** (ashroot … ambergrain) | 6–380 g/Stk | wiederkehrend (**winzig**) | alle | 🔴 NEIN — Pfennigbeträge; nach Erstkauf liefert Farming/Foraging Nachschub |
| **Tränke** (minor/greater_healing) | 36 / 90 g | wiederkehrend (winzig, **selbst-craftbar**) | alle | 🔴 NEIN — Herblore ersetzt den Kauf |
| **Gekochtes Essen** (shrimp/trout) | 6–15 g | wiederkehrend (trivial) | early | 🔴 NEIN |
| **Inventar-Slot-Upgrades** | 60 × 1,5ⁿ | einmalige **Leiter** | early–mid | 🟡 teilweise — geometrisch, aber **endlich** (man kauft bis zur gewünschten Taschengröße, dann Stopp) |
| **Auto-Eat-Upgrades** | 2k + 8k + 25k = **35k total** | einmalig (**3 Stufen, gedeckelt**) | mid | 🔴 NEIN — nach 35k ausgereizt |
| **Dungeon-Schlüssel** (warband … idolhall) | 4k · 12,5k · 14k · 48k · **160k** | wiederkehrend, **OPTIONAL** | mid–endgame | 🟡 **einziger mitwachsender Sink** — aber Schlüssel sind als Mob-Drop **farmbar**, also elective |
| **Bank/Lager** | **0 g (gratis, unbegrenzt)** | — | — | 🔴 **kein Sink** — verschenkte Hoarder-Senke |

### 2.1 Befunde Sink-Seite

- **Geschätzte „Pflicht"-Gold-Ausgaben über einen ganzen Run: grob 100–300k Gold** (Erst-Gear ~5k +
  Spitzhacken ~4k + viele Slot-Upgrades ~50–200k + Auto-Eat 35k + ein paar Schlüssel). Demgegenüber steht ein
  Endgame-Einkommen von **150k bis mehrere Mio g/h**. → Die gesamte Lebenszeit-Sink-Kapazität ist in **wenigen
  Stunden Endgame-Farming** erschöpft.
- **Alle „echten" Sinks sind einmalig und früh.** Ab dem Moment, in dem Gear aus Smithing/Drops statt aus dem
  Shop kommt (≈ L30), verliert Gold seine Kaufkraft für **Macht**. Es bleibt nur Komfort (Slots) und ein
  optionaler Convenience-Kauf (Schlüssel).
- **Bank ist gratis und unbegrenzt** — eine offensichtliche, ungenutzte Idle-Sink-Gelegenheit (Hoarder zahlen
  gern für Stauraum).
- **Es gibt keinen einzigen unendlich-skalierenden Sink** (Reroll, Monument, Prestige-Dump), der den
  Smithing-/Gathering-Overflow absorbieren könnte. Gold läuft daher zwangsläufig voll.

---

## 3) KAUFKRAFT / WERT über den Spielverlauf

| Phase | Gold-Einkommen (typisch, on-level) | Kaufkraft / Gefühl | Verdikt |
|---|---|---|---|
| **Early L1–20** | ~5–20k g/h | Gold ist **knapp & bedeutsam**: Erst-Gear (~3–5k) kostet mehr als man hat; man trifft echte Kauf-Entscheidungen (Schwert vs. Rüstung vs. Spitzhacke). | ✅ gesund |
| **Mid L20–50** | ~30–150k g/h | Gold **lockert spürbar**: Auto-Eat (35k) + Slot-Leiter + ein Schlüssel-Puffer sind in 1–2 h abbezahlt; danach staut es sich. | 🟡 beginnende Inflation |
| **Late L50–99** | ~150k – 1 Mio+ g/h (Smithing weit darüber) | Gold ist **effektiv unbegrenzt** relativ zu den Sinks. Bestes Gear kommt aus Smithing/Drops, **nicht kaufbar**. Gold wird zur **Vanity-Zahl**. | 🔴 totes Polster |

### 3.1 Interaktion mit den neuen Systemen (alle gold-neutral bis faucet-seitig)

- **Combo-Food-Inputs:** werden aus **gefarmten/gefischten/geforagten** Zutaten **gekocht**, nicht gekauft →
  **kein** Gold-Sink. (Verstärkt sogar das Problem: das beste Food umgeht den Shop komplett.)
- **Fence:** **konvertiert Diebesgut → Gold** = ein **Faucet**, kein Sink.
- **Crafting-Ketten** (Smithing/Jewelcrafting/Herblore/Inscription/Fletching): verbrauchen **Materialien +
  Zeit**, nicht Gold. Der einzige Gold-Input der Produktionsseite sind **Samen** (6–380 g, vernachlässigbar).
- **Farming-Plots** (geplant, `farming-plots-plan.md`): Plots werden **per Level gratis** freigeschaltet;
  Auto-Replant verbraucht **Samen** (winziger Gold-Sink). Hier steckt eine **ungenutzte Sink-Chance** (siehe
  Vorschlag S4: Plot-Kauf/Fertilizer/Greenhouse gegen Gold).

**Fazit Kaufkraft:** Inflation trivialisiert Gold spätestens ab Mid-Game. Die *neuen* Systeme haben die
Faucet-Seite verbreitert (Fence, Gathering-Verkauf), aber **keinen einzigen neuen Gold-Sink** geschaffen.

---

## 4) DIAGNOSE — das Kernproblem

> **Es fehlt nicht an Faucets, sondern an verlässlichen, mit dem Einkommen MITWACHSENDEN Sinks — und damit
> am Grund, Gold zu farmen.**

Im Detail:

1. **Sink-Defizit (primär):** Praktisch alle Gold-Ausgaben sind **einmalige Frühgame-Käufe**. Es gibt keinen
   Sink, dessen Kosten mit der steilen Einkommens-Kurve mitlaufen, und **keinen unendlich-skalierenden Sink**,
   der Overflow absorbiert. → Gold läuft strukturell voll.
2. **Kaufkraft-Knick bei ~L30 (sekundär):** Sobald Macht (Gear) aus Smithing/Drops statt Shop kommt, kann
   Gold **keine Stärke mehr kaufen**. Der einzige verbleibende Anreiz (Komfort) ist endlich.
3. **Kein „Geld-Treadmill":** In gesunden Idle-RPGs (Melvor: Gear-Upgrades, Pet-/Bank-/Skill-Käufe; Cookie-
   Clicker: eskalierende Gebäude) gibt es immer einen **nächsten teuren Kauf**. Hier endet die Kaufliste früh.

**Was NICHT das Problem ist:** Die Faucets (auch Fence/Thieving) sind nicht „kaputt" — sie sind reichlich,
aber das ist *erwünscht*, sobald es etwas zu kaufen gibt. Die Lösung ist **nicht**, Income zu nerfen
(das macht Idle-Progression zäh), sondern **die Sink-Seite aufzubauen**.

---

## 5) GOLD-WERT-LEITLINIE — „1 Gold ist wert…" + Income/Sink-Balance je Phase

### 5.1 Anker-Skala

Anker ist die Zeit: **1 Stunde phasentypischer Aktivität**. Daraus die Wert-Leitlinie:

| Bezug | Frühgame (L1–20) | Mid (L20–50) | Late (L50–99) |
|---|---|---|---|
| 1 Stunde Aktivität ≈ | ~10k Gold | ~80k Gold | ~300k–1 Mio Gold |
| **1.000 Gold** entspricht ~ | ~6 Min Arbeit | ~45 Sek | ~3–12 Sek |
| **Verkauf** (Faustregel) | Item-`value` × 0,5 (`SELL_FRACTION`) — gilt global | | |

**Leitsatz:** Ein „großer Kauf" einer Phase sollte **~3–10 Stunden** des *phasentypischen* Einkommens kosten
(genug, dass Gold-Farmen eine echte Entscheidung ist, ohne Grindwall), und es muss **immer ein nächster
sichtbarer Sink** existieren. Zusätzlich braucht es **mindestens einen unendlich-skalierenden Sink**, damit
Gold nie ganz tot wird.

### 5.2 Ziel-Income/Sink-Balance je Phase

| Phase | Income g/h (on-level) | Ziel „großer Sink"-Kosten | = Stunden | Sink-Quelle (Vorschläge §6) |
|---|---|---|---|---|
| Early L1–20 | 8–20k | **5–20k** | ~0,5–1 h | Erst-Gear, Werkzeug-Leiter T1–2, erste Slot-/Bank-Käufe |
| Mid L20–50 | 30–150k | **100k–500k** | ~2–5 h | Auto-X-Komfort, Werkzeug-Leiter T3–4, Bank-Tabs, Dungeon-Schlüssel-Komfort |
| Late L50–99 | 150k – 1 Mio+ | **1–10 Mio** | ~3–10 h | Top-Werkzeuge, Reroll-Treadmill, Plot/Greenhouse, Stadt-/Schrein-Unlocks |
| Endgame-∞ | beliebig hoch | **∞ (geometrisch)** | bottomless | Reroll, Bank-Tabs, Monument-Dump — absorbiert Smithing-Overflow |

> **Prinzip:** Income NICHT nerfen. Stattdessen die Sink-Kurve so legen, dass sie der Income-Kurve folgt und
> oben offen ist. Der Smithing-Faucet (bis Mio/h) darf bleiben — *solange* ein ∞-Sink existiert, der ihn
> aufnimmt (sonst bleibt Gold sinnlos).

---

## 6) VORSCHLÄGE — verlässliche, mitwachsende Gold-Sinks

Bewertet nach **„beste Ökonomie-Gesundheit pro Aufwand"**. Aufwand: **S** (Content-Zahlen/kleine Engine),
**M** (Engine-State + UI), **L** (neues System/Design-Identität). Jeder Sink: Zweck · Kosten-Kurve · Zugkraft
· Aufwand · betroffene Reviere.

### Priorität 1 — höchster Hebel, moderater Aufwand

#### S1 · Gold-Werkzeug-Leiter für ALLE Gathering-Skills (bis Endgame)
- **Zweck:** Macht-für-Gold zurückbringen. Aktuell gibt es nur **Spitzhacken** (bis runite, 2.400 g). Eine
  vollständige, gold-gekaufte Werkzeug-Leiter für **jeden** Gathering-Skill (Axt/Spitzhacke/Angel/Sichel/
  Forage-Sammelwerkzeug/Meißel …), jede Stufe gibt **Speed/Yield**.
- **Kosten-Kurve (geometrisch, je Skill):** ~60 g (T1) → ~2,5k → ~12k → ~60k → ~300k → **~1,5 Mio (Top-Tier)**.
  6 Tiers × ~6 Skills = **dauerhafte, breite Senke**, die ein Skiller *immer* kaufen will (schnelleres
  Gathering = mehr von allem).
- **Zugkraft:** Jeder spielt Gathering; Speed ist universell begehrt. Direkter, spürbarer Gegenwert für Gold.
- **Aufwand:** **M** — Tool-System existiert (`engine/tools.ts`); braucht neue Tool-Items + Shop-Einträge
  (content) + ggf. Speed-Hook je Skill (logic, falls noch nicht generisch).
- **Reviere:** content-dev (Tool-Items + `shop`-Kosten), logic-dev (Speed-Anwendung je Skill, falls nötig), ui-dev (Shop-Tab).

#### S2 · Bank-Erweiterung als Gold-Sink (Bank ist aktuell gratis/unbegrenzt)
- **Zweck:** Die offensichtlichste ungenutzte Idle-Senke. Hoarder zahlen gern für Stauraum.
- **Kosten-Kurve:** Bank startet mit Basis-Kapazität; weitere **Tabs/Slot-Pakete** geometrisch:
  ~1k → ~3k → ~8k → … × 1,6ⁿ, **nach oben offen** (bottomless ∞-Sink).
- **Zugkraft:** Mit wachsendem Item-Katalog (viele Skills) will jeder Sammler mehr Platz; nie „fertig".
- **Aufwand:** **S–M** — Bank ist aktuell unbegrenzt; braucht ein `bankCapacity`-Feld + Kauf-Funktion
  (analog `buySlotUpgrade`) + Kosten-Konstanten + SAVE_VERSION-Bump/Migration (Memo „always-update-save-logic").
- **Reviere:** logic-dev (Bank-Kapazität+State+Persistenz), content/shared (Kosten-Konstanten), ui-dev (Bank-UI).

### Priorität 2 — solide Sinks, moderater Aufwand

#### S3 · Auto-X-Komfort-Käufe (Idle-Kern-Sink)
- **Zweck:** Klassischer Idle-Gold-Sink = bezahlte Bequemlichkeit. Auto-Eat (3 Stufen/35k) ist der Beweis,
  dass das Muster greift — es ist nur **zu kurz**.
- **Konkrete Käufe (je einmalig oder gestaffelt):** Auto-Bank-Einlagern · Auto-Junk-Verkauf (Schwellwert) ·
  Auto-Replant-alle (Plots) · **Offline-Cap 24 h → 36 h → 48 h** (gestaffelt, teuer) · zusätzliche
  Aktions-Queue-Slots · Auto-Trank-Schwelle. Auto-Eat um **2 weitere Stufen** verlängern (50k, 120k).
- **Kosten-Kurve:** Einzelne Convenience 25k–250k; gestaffelte (Offline-Cap) bis ~1 Mio für die Top-Stufe.
- **Zugkraft:** Bequemlichkeit ist für Idle-Spieler **immer** kaufwürdig; trifft genau die AFK-Zielgruppe.
- **Aufwand:** **M** — je Feature ein Flag/Tier im `character`-State + Anwendung im Tick/Combat + UI.
- **Reviere:** logic-dev (Flags/Tiers + Anwendung + Persistenz), content/shared (Kosten), ui-dev (Shop).

#### S4 · Plot-Expansion + Fertilizer/Greenhouse (passt zu Farming-Plots)
- **Zweck:** Gold-Senke direkt in das geplante Plot-System einklinken (`farming-plots-plan.md` macht Plots
  aktuell **level-gratis** — verschenkte Senke).
- **Konkret:** (a) **Premium-Plots** über die 9 Level-Plots hinaus **per Gold** (geometrisch: 50k → 150k →
  450k …). (b) **Fertilizer** (Verbrauchsgut, Gold-Kauf) = −20 % Wachszeit oder +1 Ertrag für einen Zyklus →
  **wiederkehrender** Sink, skaliert mit Plot-Anzahl. (c) **Greenhouse-Upgrade** (einmalig teuer) = globaler
  Yield/Speed-Bonus.
- **Kosten-Kurve:** Premium-Plot 50k×3ⁿ; Fertilizer 200–2.000 g/Zyklus (× viele Plots × Stunden = stetiger
  Abfluss); Greenhouse ~500k–2 Mio.
- **Zugkraft:** Farming-Material speist Combo-Food/Herblore/Inscription; mehr/schnellere Plots = mehr von der
  begehrten Crafting-Pipeline. Fertilizer ist der seltene **echt wiederkehrende** Sink.
- **Aufwand:** **M** — koordiniert mit dem (noch ungebauten) Plot-System; Fertilizer = Item + Effekt-Hook.
- **Reviere:** logic-dev (Plot-Kauf/Fertilizer-Effekt), content-dev (Fertilizer-Item + Kosten), ui-dev (Farm-Seite).

### Priorität 3 — größter Ökonomie-Effekt im Endgame, aber Aufwand/Chef-Entscheidung

#### S5 · Reforge / Re-Roll von Gear-Stats gegen Gold (∞-Sink für Min-Maxer)
- **Zweck:** Bottomless-Sink, der genau die **goldreichste** Zielgruppe (Min-Maxer/Smithing-Millionäre) abholt.
- **Konkret:** an die `rarity-system-plan` koppeln — Gold zahlen, um Affixe/Rarität auf einem Item neu zu
  würfeln. Höher-Tier-Gear = teurer pro Roll. Da das Ergebnis RNG ist, wird **wiederholt** gerollt → praktisch
  unendlicher Abfluss.
- **Kosten-Kurve:** pro Roll skaliert mit Item-`value`/Tier: ~5k (low) → ~500k+ (Endgame-Gear) pro Versuch.
- **Zugkraft:** Perfekte Rolls sind das Endgame-Carrot der Optimierer — die mit Abstand meisten Gold farmen.
- **Aufwand:** **M–L** — hängt am Rarität/Affix-System (Chef-Entscheidung, ob/wann das kommt).
- **Reviere:** logic-dev (Reroll-Mechanik), content-dev (Kosten/Tier-Skalierung), ui-dev. **CHEF-ENTSCHEIDUNG** (Kopplung an Rarität-System).

#### S6 · Gold-gegatete Stadt-/Zonen-Unlocks + Schrein-Spenden (passt zu city-plan)
- **Zweck:** Große Einmal-Sinks an Meilensteinen + permanente Mini-Buffs gegen eskalierende Gold-Spenden.
- **Konkret:** (a) **Stadt-Ausbauten** (`city-plan.md`): Gebäude/Dienste per Gold freischalten (Einmal-Sinks
  100k–2 Mio). (b) **Schrein-Spende:** Gold → permanenter +0,5 %-Buff (z. B. Gathering-Speed), Kosten
  **geometrisch** je Stufe (∞-Sink). (c) Bestehende Dungeon-Schlüssel als Komfort-Kauf beibehalten/erweitern.
- **Kosten-Kurve:** Unlocks 100k–2 Mio einmalig; Schrein 10k×1,5ⁿ unendlich.
- **Zugkraft:** Sichtbarer Fortschritt (Stadt wächst) + dauerhafte Mini-Power = starker „weiter farmen"-Sog.
- **Aufwand:** **M** (Schrein) bis **L** (Stadt-System).
- **Reviere:** logic-dev (Unlock/Buff-State), content-dev (Kosten/Effekte), ui-dev (Stadt/Schrein-Seite). **CHEF-ENTSCHEIDUNG** (Scope city-plan).

#### S7 · Monument-/Prestige-Gold-Dump (reiner ∞-Sink fürs absolute Endgame)
- **Zweck:** Letzter Überlauf-Schlucker, der den Smithing-Millionär-Overflow garantiert absorbiert, damit Gold
  **nie** völlig wertlos wird.
- **Konkret:** „Dem Götzen Gold opfern" → account-weiter, winziger permanenter Bonus (z. B. +0,1 % alle XP
  oder Gold-Find) mit **geometrisch** wachsenden Kosten (1 Mio × 1,5ⁿ), praktisch unbegrenzt.
- **Kosten-Kurve:** 1 Mio → 1,5 Mio → 2,25 Mio … (∞).
- **Zugkraft:** Gibt der „Vanity-Zahl" Gold einen ewigen Zweck; Completionist-Bait.
- **Aufwand:** **L** — neues System + Design-Identität.
- **Reviere:** logic-dev, content-dev, ui-dev. **CHEF-ENTSCHEIDUNG** (passt zum dark-fantasy „Götzen"-Thema).

### Nicht empfohlen (zur Vollständigkeit)

#### S8 · Repair / Gear-Durability gegen Gold — **NICHT empfohlen**
- Wäre ein verlässlicher wiederkehrender Sink, ist aber **anti-idle Reibung** (AFK-Spieler hassen
  Verschleiß/„Gear kaputt während weg"). Falls überhaupt, nur als **optionaler, milder** Upkeep. **CHEF-
  ENTSCHEIDUNG**, Empfehlung: **dagegen** — S1/S2/S3 liefern den Sink ohne die Frustration.

---

## 7) Priorisierte Empfehlung (Ökonomie-Gesundheit pro Aufwand)

| Rang | Sink | Aufwand | Effekt | Typ | Chef-Entscheid? |
|---|---|---|---|---|---|
| **1** | **S2 Bank-Erweiterung** | S–M | mittel, sofort, ∞-fähig | ∞ | nein (klar) |
| **2** | **S1 Werkzeug-Leiter (alle Skills, bis Endgame)** | M | **hoch** — Macht-für-Gold zurück, breit | gestaffelt | nein (klar) |
| **3** | **S3 Auto-X-Komfort** | M | hoch — trifft Idle-Zielgruppe | gestaffelt | nein (klar) |
| **4** | **S4 Plot/Fertilizer/Greenhouse** | M | mittel-hoch, **echt wiederkehrend** | wiederkehrend | koordiniert mit Plot-System |
| **5** | **S6 Schrein-Spende** (Teil von city-plan) | M | hoch — ∞-Sink + Mini-Power | ∞ | ja (Scope) |
| **6** | **S5 Reroll-Treadmill** | M–L | **sehr hoch** im Endgame (∞) | ∞ | ja (Rarität-System) |
| **7** | **S7 Monument-Dump** | L | Overflow-Versicherung | ∞ | ja (Identität) |
| — | S8 Repair/Durability | — | — | — | ja — **Empfehlung dagegen** |

**Minimal-Paket für die größte Sofortwirkung (alle ohne tiefe Chef-Entscheidung):** **S1 + S2 + S3.**
Zusammen schließen sie das Sink-Defizit über alle Phasen (S2 ∞ + Bank-Hoarding, S1 Macht-für-Gold mit
geometrischer Top-Stufe ~1,5 Mio, S3 Idle-Komfort) und geben Gold über das ganze Spiel eine Kaufliste.
**Ein ∞-Sink ist Pflicht** (S2 erfüllt das bereits); S5/S7 später für die absolute Endgame-Überlauf-Absicherung.

---

## 8) Chef-Entscheidungen (klar markiert)

1. **∞-Sink-Identität:** Soll der Smithing-Faucet (Sim bis 3,4 Mio g/h) bleiben? → **Ja empfohlen**, *sofern*
   mind. ein ∞-Sink existiert (S2/S5/S7). Income-Nerf NICHT empfohlen (zäht Idle-Progression).
2. **Rarität/Reforge-System (S5):** ob/wann das Rarität-Affix-System kommt — Reroll ist der stärkste
   Endgame-∞-Sink, hängt aber daran.
3. **City-Plan-Scope (S6):** Stadt-Ausbauten + Schrein als Gold-Sink in den city-plan aufnehmen?
4. **Monument-Dump (S7):** dark-fantasy-„Götzen-Opfer" als reiner ∞-Sink — passt thematisch, aber neues System.
5. **Repair/Durability (S8):** Empfehlung **dagegen** (anti-idle). Nur falls der Chef bewusst Reibung will.
6. **Fence-Guardrail (vorbestehend, `tester-balance.md §3`):** low/mid-Fence +73–104 % über Ceiling — Gold-
   Ranges trimmen ODER Intent-Kommentar anpassen. Kleiner Faucet-Fix, unabhängig vom Sink-Aufbau.

---

## 9) Apply-Liste (für CEO → content-dev / logic-dev / ui-dev)

> Reine Spec. Konkrete Item-IDs/Kosten-Tabellen je Sink folgen in einem Detail-Spec, sobald der Chef das
> Sink-Paket (mind. S1+S2+S3) freigibt. Reihenfolge nach Ökonomie-Gesundheit pro Aufwand:

1. **[P1, logic+content+ui] S2 Bank-Erweiterung** — `bankCapacity`-Feld + Kauf-Funktion (analog
   `buySlotUpgrade`) + geometrische Kosten-Konstanten; SAVE_VERSION-Bump + Migration. Sofortiger ∞-Sink.
2. **[P1, content+logic+ui] S1 Werkzeug-Leiter** — Tool-Items für alle Gathering-Skills bis Endgame-Tier,
   geometrische `shop`-Kosten (Top ~1,5 Mio), Speed/Yield-Effekt via `engine/tools.ts`.
3. **[P2, logic+content+ui] S3 Auto-X-Komfort** — Auto-Bank/Auto-Sell/Offline-Cap-Staffel/Queue-Slots +
   Auto-Eat um 2 Stufen (50k/120k) verlängern.
4. **[P2, koordiniert] S4 Plot/Fertilizer/Greenhouse** — beim Bau des Farming-Plot-Systems Gold-Kosten +
   Fertilizer-Verbrauchsgut einplanen (nicht level-gratis).
5. **[P3, Chef] S5 Reroll · S6 Schrein/Stadt · S7 Monument** — nach Freigabe der jeweiligen Systeme.
6. **[unabhängig, P2] Fence-Guardrail** — Gold-Ranges der gem-tragenden low/mid-Fences trimmen (Tabelle in
   `tester-balance.md §3`) ODER Intent-Kommentar in `index.ts` anpassen.

**Kein Income-Nerf.** Der Hebel ist die Sink-Seite; die Faucets dürfen reichlich bleiben, sobald es eine
mitwachsende, oben offene Kaufliste gibt.

---

## 10) UPDATE 2026-06-27 — City als Sink-Träger, Phasen-Vision (Schärfung, NUR Planung)

> **Chef-Verfügung (fix):** Die **Implementierung** der Gold-Sinks ist bewusst **an das spätere City-Feature
> gekoppelt (deferred)**. Dieser Abschnitt liefert daher **nur Konzept/Phasen** und schlägt **keine** Sofort-
> Umsetzung vor, die das City-Feature überholt. Er schärft §6/§7 um die **City-Kopplung** und eine **Phasen-Vision**,
> ohne die S1–S8-Details zu duplizieren. Querverweise: `design/shop-rework-plan.md` (Tool-/Komfort-Sortiment),
> `design/skill-usage-audit-run2.md §3` (Werkzeug-Lücke), `design/city-plan.md` (v1 = Hub+Quests; Gebäude-Ausbau Post-v1).

### 10.1 Kernproblem in einem Satz (unverändert, geschärft)

Die **Faucets skalieren steil** (bis Mio/h Smithing), die **Sinks nicht** — es fehlt **kein** Gold, sondern ein
**mitwachsender, oben offener Grund, es auszugeben**. Die **City ist das natürliche Trägersystem** für genau diese
Sinks: sie bündelt Shop, Bank, Quests und (Post-v1) Gebäude-Ausbau — also fast alle Orte, an denen Gold sinnvoll abfließt.

### 10.2 City-Kopplungs-Matrix — was hängt woran (deferred-Status klar markiert)

| Sink (aus §6) | Technisch City-unabhängig baubar? | Trotzdem an City-Rollout gekoppelt (Chef-Deferral)? | Begründung |
|---|---|---|---|
| **S1 Werkzeug-Leiter** | ✅ ja (Shop + `tools.ts`) | landet im **Shop**, der in die City-Sektion wandert | Sortiment-Erweiterung; kann technisch vorab, gehört aber zur Shop-/City-Heimat |
| **S2 Bank-Erweiterung** | ✅ ja (`bankCapacity` + Migration) | Bank wandert ebenfalls in City-Sektion | reiner State+UI-Sink; City ist nur die UI-Heimat |
| **S3 Auto-X-Komfort** | ✅ ja (Flags im State) | UI-Heimat ggf. City-Hub | Komfort-Käufe; logic-seitig City-unabhängig |
| **S4 Plot/Fertilizer/Greenhouse** | ⏳ koordiniert mit Plot-System | teils — Plot-System läuft separat | Fertilizer = wiederkehrender Sink, an Plots gebunden |
| **S6 Stadt-Unlocks + Schrein-Spende** | ❌ nein | **JA — Kern des Post-v1-City-Ausbaus** | Gebäude-Ausbau/Schrein sind das City-Gebäude-System selbst |
| **S5 Reroll-Treadmill** | ❌ (braucht Rarität-System) | unabhängig von City, aber eigene Chef-Entscheidung | hängt am Affix/Rarität-System |
| **S7 Monument-Dump** | ❌ (neues System) | thematisch City/„Götzen"-nah | reiner ∞-Sink, eigenes System |

**Lesart:** S1/S2/S3 sind die **City-unabhängig baubaren** Sinks (das „Minimal-Paket" aus §7). Da der Chef die
Sink-**Umsetzung** aber an die City gekoppelt hat, werden auch sie **als Teil der City-Welle** ausgeliefert —
Shop und Bank sind dort ohnehin beheimatet (`city-plan §2`). **S6** (Gebäude-Ausbau/Schrein) ist der eigentliche
**mitwachsende + ∞-City-Sink** und damit das Herzstück, das den steilen Income endgame-relevant hält.

### 10.3 Phasen-Vision — wie Gold über den City-Rollout relevant wird

| Phase | City-Stand | Welche Sinks landen | Gold-Gefühl danach |
|---|---|---|---|
| **P0 — heute** | keine City | nur Frühgame-Käufe (§2) | Gold ab Mid tot — **Status quo, Problem** |
| **P1 — City v1 (Hub+Quests)** | Hub + Shop/Bank umgehängt + Quests | **Quest-Gold-Senke** (Reroll/Komfort klein) + Vorbereitung der Shop-Heimat | leichte Entlastung; Quests geben Gold *Mini*-Zweck |
| **P2 — Sink-Welle im City-Shop** | Shop-Rework live | **S1 Tool-Leiter** (geometrisch bis ~1,5 Mio) + **S2 Bank-Tabs (∞)** + **S3 Auto-X** | Gold kauft wieder **Tempo/Komfort** über das ganze Spiel — Knick bei L30 entschärft |
| **P3 — City-Ausbau (Post-v1)** | Gebäude/Schrein-System | **S6 Stadt-Unlocks (100k–2 Mio einmalig) + Schrein-Spende (∞, geometrisch)** | sichtbarer Stadt-Fortschritt + permanente Mini-Power = **„weiter farmen"-Sog** |
| **P4 — Endgame-Überlauf** | reife City | **S5 Reroll** (falls Rarität) **/ S7 Monument-Dump (∞)** | Smithing-Millionär-Overflow hat **garantiertes Ziel** → Gold nie ganz tot |

**Leitprinzip über alle Phasen:** Income **nicht** nerfen; die Sink-Kurve der Income-Kurve nachlegen und **oben
offen** halten. Mindestens **ein** ∞-Sink muss ab P2 existieren (S2 Bank erfüllt das schon; S6-Schrein/S7-Monument
sind die endgame-starken ∞-Sinks). Erst wenn ein ∞-Sink steht, darf der Smithing-Faucet (bis 3,4 Mio g/h) bleiben.

### 10.4 Was sich seit der Erst-Analyse bestätigt hat

- **Faucet-Seite hat sich verbreitert, Sink-Seite NICHT:** Thieving bekam die **Fence-Kette** (live, 9 Aktionen) —
  ein **zusätzlicher Faucet** (Wertsachen→Gold), kein Sink. Cooking-Combos/Leatherworking-Rework sind gold-neutral
  (gefarmte Inputs, kein Shop-Kauf). → Das Sink-Defizit aus §4 ist seither **eher größer** geworden.
- **Werkzeug-Lücke bestätigt (gemessen):** nur Mining (Spitzhacken) + WC (Waffen-Axt doppelt) haben Tools;
  **Fishing/Foraging/Farming haben keine** (`skill-usage-audit-run2.md §3`). S1 ist damit nicht nur Sink, sondern
  schließt zugleich eine echte Gameplay-Lücke — doppelter Nutzen, hohe Priorität innerhalb der City-Welle.

### 10.5 Offene Chef-Entscheidungen (City-spezifisch, ergänzend zu §8)

- **City als Sink-Heimat bestätigen:** Sollen S1/S2/S3 bewusst **mit der City-Welle** (P2) ausgeliefert werden
  (empfohlen, da Shop/Bank dort wohnen), oder darf das Minimal-Paket **vor** der City vorgezogen werden?
- **S6 als City-Kern-Sink:** Gebäude-Ausbau gegen Gold + Schrein-Spende (∞) in den **Post-v1-City-Plan** aufnehmen?
  Das ist der wichtigste *mitwachsende* Endgame-Sink — ohne ihn bleibt Gold endgame eine Vanity-Zahl.
- **∞-Sink-Wahl fürs Endgame:** S6-Schrein (passt in City) genügt, oder zusätzlich S7-Monument-Dump
  (dark-fantasy-„Götzen-Opfer", eigenes System) als Überlauf-Versicherung?
- **Quest-Gold-Kalibrierung (P1):** Daily-Quest-Rewards so legen, dass sie spürbar, aber kein Income-Brecher sind
  (`city-plan §6` Richtwerte) — frühe, City-v1-eigene Gold-Quelle, kein Sink.

