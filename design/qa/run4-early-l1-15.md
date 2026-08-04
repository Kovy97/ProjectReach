# QA Run 4 — Frühes Spiel (Level 1–15, Neuer-Spieler-Erfahrung)

**Datum:** 2026-06-27 · **Rolle:** Playtester-Analyst (Spieler-Sicht, READ-ONLY — kein Spiel-Code/Content geändert)
**Scope:** Erste Stunde / L1–15. Onboarding, Starterkit, Köcher + Ammo-UI (run3-Regression verifizieren), Start-Nahrung/Auto-Eat, Farming-Intro, Pacing, drei Startstile, Discoverability.
**Vergleichsbasis:** `design/qa/run3-early-game.md` (Score 7.5).

**Methode:** Temporäres Sim-Harness gebaut (`createGame` mit echtem Renderer-Pfad `startingStyle` + `starterKit:true`, dann `startCombat`/`advance`, deterministische Seeds 42/5), echte Zahlen gemessen, **Harness danach wieder entfernt**. Zahlen unten sind gemessen, nicht geschätzt.

**Quellen (im Code/Daten verifiziert):**
- `packages/engine/src/state.ts` (createGame: Köcher 81–84, Start-Nahrung 95–101), `character.ts:89` (Start-Gold = 0), `equipment.ts` (equipAmmo 129–145), `combat.ts` (Ammo-Verbrauch 617–623, `stopIfOutOfAmmo` 697–724), `farming.ts`.
- `packages/content/src/index.ts` — crude_arrow 278–285 (KEIN Crafting-Rezept), cracked_bow 260–277, cracked_staff 287–299 (manaCost 5), goblin 7614–7631 (gold 2), fletch_copper_arrows ~5962 (niedrigstes fletchbares = copper_arrow, braucht copper_bar+Feder), forage_feathers 5330–5342 (foraging L5), Shop crude_arrow 8770 (1 Gold), graywort-Crop 11337–11347, Shop graywort_seed 8856, forage_ashfields-Saat 5256–5258.
- `packages/shared/src/index.ts` — AUTO_EAT_TIERS 152–157 (Stufe 0 = 50 %, Kosten 0), PLOT_UNLOCK 1472 (3 Plots ab L1).
- `apps/client/src/renderer/` — CombatPage.tsx:402/620–624, CharacterPage.tsx:360, components/Toasts.tsx:82/157, i18n/translations.ts:413/1165 (ammoHint) + 1351–1352 (ammoEmpty), components/Onboarding.tsx:13 (7-Schritt-Modal).

---

## Fun-Score: **7.5 / 10**

Gleicher Zahlenwert wie run3, aber ein **gesünderer Build**: der run3-Regressions-Cluster (Köcher-Munition wurde in der UI nie angezeigt, Kampfseite log dem Fernkämpfer in der ersten Minute fälschlich „Munition: 0 · Keine Munition!") ist **sauber behoben** — die UI liest die Munition jetzt überall aus dem Köcher (`state.ammoCount`), und der „Munition leer"-Toast triggert korrekt. Melee und Magie sind im Frühspiel hervorragend, wartungsfrei und tödlich. **Kein Punktgewinn** trotz der Fixes, weil der Sim einen tieferen, systemischen Befund freigelegt hat, den run3 übersehen hatte: der **Fernkampf-Starter läuft nach 2,5 Minuten trocken** (60 Pfeile), es gibt **kein craftbares crude_arrow**, der Restock ist ein idle-feindlicher Shop-Mikro-Loop und die Pfeil-Ökonomie ist gegen den Erstmob knapp **negativ**. Das trifft dieselbe ~1/3-Population (Fernkampf-Start) wie der run3-Bug — nur subtiler und erst nach den ersten Minuten spürbar.

---

## Δ vs run3 — alle gemeldeten Findings nachgeprüft

| run3-Finding | Status run4 | Beleg |
|---|---|---|
| **[P1] Köcher-Munition nirgends in UI / „Munition: 0" bei vollem Köcher** | ✅ **BEHOBEN** | `CombatPage.tsx:402` `const ammoCount = ammoType ? state.ammoCount : 0;` (vorher `itemCount(inventory)`); `CharacterPage.tsx:360` `const n = state.ammoCount;` |
| **[P1] „Munition leer"-Toast feuert nie** | ✅ **BEHOBEN** | `Toasts.tsx:82` Snapshot aus `state.ammoCount`; Trigger `Toasts.tsx:157` `prev.ammoCount>0 && ammoCount===0 && prev.wasInCombat` |
| **[P2] ammoHint widerspricht Verhalten („schwächer" vs. Stopp)** | ✅ **BEHOBEN** | `translations.ts:413/1165` „…Ist der Köcher leer, stoppt der Kampf." (EN+DE) |
| **[P2] Verwaiste Saat graywort_seed (häufigster Drop, nicht pflanzbar)** | ✅ **BEHOBEN** | graywort-Crop `index.ts:11337–11347` nutzt `seedItem:"graywort_seed"`; zusätzlich im Shop `index.ts:8856` (3 Gold) |
| **[P2] Leerer erster Farm-Besuch (3 Plots, 0 Saat, 0 Gold)** | 🟡 **TEILWEISE** | graywort jetzt pflanzbar, aber Starterkit gibt weiter **keine Saat** (`state.ts` nur Nahrung) und Start-Gold = **0** (`character.ts:89`) → erste Saat nur per Forage-Roll |
| **[P3] Köcher-Onboarding fehlt** | 🟡 **OFFEN** | Onboarding-Modal (`Onboarding.tsx:13`) hat 7 Schritte, **kein** Köcher-/Munition- und kein Farming-Schritt; nur In-Combat-Toast erklärt es |

---

## Gemessene Startwerte (Seed 42, echter Renderer-Pfad `starterKit:true`)

| Stil | Mainhand | Munition/Mana | Nahrung | Gold | maxHp | Schaden | Genauigkeit | Speed |
|---|---|---|---|---|---|---|---|---|
| melee | rusty_sword | — | cooked_shrimp ×10 | 0 | 110 | melee 12.3 | 84 | 2.88 s |
| ranged | cracked_bow | **crude_arrow ×60 im Köcher** | cooked_shrimp ×10 | 0 | 110 | ranged 10.2 | 83 | 2.45 s |
| magic | cracked_staff | maxMana 45, manaCost 5 | cooked_shrimp ×10 | 0 | 110 | magic 14.2 | 78 | 2.88 s |

**Stärken bestätigt:** Köcher mechanisch korrekt (60 Pfeile direkt im ammo-Slot, feuert ab Tick 1, stoppt sauber bei leer). Start-Nahrung ×10 + `character.food` vorbelegt → Auto-Eat Stufe 0 (50 %, Kosten 0) greift sofort. Drei Stile sind alle ab Sekunde 1 spielbar. 3 Farming-Plots ab L1.

---

## Pacing/Parität — 60-min-Dauerkampf vs Goblin (L1), **ohne** manuellen Restock

| Stil | Kills | Tode | totalLevel erreicht | Limit |
|---|---|---|---|---|
| melee | **405** | 0 | 53 | unbegrenzt (Nahrung gegen Goblin nicht nötig) |
| **ranged** | **23** | 0 | 26 | **HARTER STOPP bei 2,5 min** (60 Pfeile leer, `ammoLeft=0`) |
| magic | **1111** | 0 | 56 | unbegrenzt (Mana regeneriert: 62/65 am Ende) |

Drei Mobs, identisches Bild beim Trockenlaufen: **60 Pfeile reichen exakt ~2,5 Minuten** gegen jeden Frühmob (goblin 23k / ash_rat 30k / cow 17k → alle `firstStall = 2,5 min`). Magie verbraucht 5 Mana/Zauber, regeneriert aber schneller als sie ausgibt → **gegen langsame Frühmobs faktisch gratis**. Melee greift ohnehin kostenlos an.

**Warband-Leiter (je 10 min, nur Starterausrüstung, 0 Tode bei allen):** Combat selbst ist für alle drei Stile sauber — melee/magic räumen die ganze Goblin-Warband L1–14 (magic warlock 11k/54 s·Kill, melee warlock 3k/200 s·Kill); die ranged-Leiterzahlen sind durchweg von den 2,5-Minuten-Pfeilfenstern gedeckelt, nicht von Tödlichkeit. **Kein Balance-Wall, keine Todesfalle** — der einzige Limiter im Fernkampf ist die Munition.

---

## Priorisierte Findings

### [P1 Balance/Parität/Onboarding] Fernkampf-Starter läuft nach 2,5 min trocken — crude_arrow nicht craftbar, idle-feindlicher Restock, knapp negative Pfeil-Ökonomie  *(NEU in run4)*
Der run3-Fix „60 Pfeile mitgeben" macht den Bogen *startfähig*, aber nicht *spielbar im Idle-Sinn*. Gemessen:
- **60 Pfeile = ~2,5 aktive Minuten** gegen jeden Frühmob; danach `stopIfOutOfAmmo` → Kampf stoppt komplett (`combat.ts:697/724`). Melee/Magie laufen im selben Fenster unbegrenzt.
- **crude_arrow hat KEIN Crafting-Rezept** (`index.ts:278–285`). Das niedrigste fletchbare Geschoss ist `copper_arrow` (`fletch_copper_arrows` ~5962) und braucht `copper_arrowheads` (Smithing aus copper_bar → Mining) **plus** `feather` (forage_feathers ist **foraging L5**, `index.ts:5330–5342`). Für einen frischen L1-Fernkämpfer alles unerreichbar.
- **Einzige reale Quelle = Shop, crude_arrow @ 1 Gold** (`index.ts:8770`) — bei **Start-Gold 0** (`character.ts:89`). Gemessene Ökonomie im 2,5-min-Fenster (Seed 42): 46 Kills, **+55 Gold**, **60 Pfeile verbraucht**; Rückkauf 60 Pfeile = 60 Gold → **netto −5 Gold allein für Pfeile**. Erst der Verkauf von Loot (~76 Gold Inventarwert) macht es positiv. D.h. der Fernkämpfer muss in einem **Idle-Spiel** alle ~2,5 Minuten in den Shop, Pfeile kaufen, in den Köcher umrüsten und Loot verkaufen, nur um weiterzukämpfen — während Melee/Magie nichts dergleichen brauchen.

**Wirkung:** Trifft ~1/3 aller Neuen (Fernkampf-Start). Combat-Gefühl in den ersten 2,5 min ist gut (~6,5 s/Kill aktiv), aber direkt danach Vollbremsung mit unklarem, mühsamem Recovery-Pfad — das Gegenteil von „idle".
**Fix-Optionen (Revier: balance/content + logic):** (a) **crude_arrow als L1-Fletching-Rezept** (Schaft + Feder, fletching/ranged 1) zur freien Selbstversorgung; und/oder (b) Starterkit-Pfeilstack deutlich größer (z. B. 250–500) als Idle-Polster; und/oder (c) OSRS-typisches **Pfeil-Bergen** (Chance, verschossene Pfeile aus dem Kill zurückzubekommen); und/oder (d) crude_arrow als billigen Bulk-Stack im Shop. Mindestens **eine** renewable, gold-freie Quelle ist nötig, damit der Stil idle-tauglich ist.

### [P2 UX/Content] Erster Farm-Besuch weiterhin leer — kein Start-Saat, 0 Gold  *(run3-Carry-over, abgemildert)*
graywort ist jetzt pflanzbar (`index.ts:11337`) und im Shop (8856) — das verwaiste-Saat-Problem von run3 ist weg. Aber `starterKit` gibt nach wie vor **nur Nahrung**, keine Saat (`state.ts:95–101`), und Start-Gold ist **0**. Der allererste Farm-Besuch zeigt 3 freie Plots, im Picker ist jeder Crop „Keine Saat". Erste Saat nur per Forage-Roll (forage_ashfields: graywort_seed 18 %, `index.ts:5256`). Discoverable, aber fühlt sich wie eine Sackgasse an — analog zum Pfeil-Problem ein „Werkzeug ohne Verbrauchsmaterial"-Muster.
**Fix (klein):** dem Starterkit eine Mini-Saat-Stack mitgeben (z. B. 3× graywort_seed) — gleicher „direkt loslegen"-Effekt wie Nahrung/Köcher. (Revier: logic/content.)

### [P3 Onboarding] Onboarding-Modal deckt weder Köcher/Munition noch Farming ab  *(run3-P3-Carry-over)*
Das Erst-Start-Modal hat 7 Schritte (`Onboarding.tsx:13`: welcome/gather/process/equip/fight/economy/idle) — **kein** Schritt zu Munition/Köcher und **keiner** zu Farming-Plots. Der Fernkämpfer erfährt nur per In-Combat-Toast (`toast.onboarding.rangedBody`) und beim Leerlaufen (`toast.ammoEmpty`, jetzt korrekt feuernd), dass Pfeile verbraucht werden — aber nicht **woher** Nachschub kommt. In Kombination mit P1 (kein craftbarer Pfeil, 0 Gold) bleibt der Recovery-Pfad für Neue unklar. Großer Tutorial-Flow ist laut Memory ein finaler Meilenstein; ein kurzer Köcher-Slot-Tooltip („Pfeile im Shop nachkaufen / fletchen") + ein Farming-Hinweis wären die billige Zwischenlösung.

### [P3 Politur] Köcher-Paperdoll ohne Mengenanzeige
Die Statzeile (CharacterPage) und das Combat-Display zeigen die Pfeilmenge jetzt korrekt; das Paperdoll-Köcherfeld selbst zeigt weiterhin nur das Icon ohne Zahl. Nice-to-have, nach den P1-Fixes nicht mehr verwirrend.

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice, großer geführter Tutorial-Flow** — laut Memory spätere Meilensteine, nicht bewertet.
- **Balance L1–15:** kein Wall, keine Todesfalle. Alle drei Stile räumen die Goblin-Warband L1–14 mit 0 Toden; einziger Limiter ist die Fernkampf-Munition (P1).
- **Köcher-/Auto-Eat-/Farming-Engine** mechanisch korrekt (Tests vorhanden, im Sim bestätigt). Die Findings betreffen Balance/Starterkit/Onboarding, nicht die Mechanik.
- **Andere `*run4*harness*`-Testdateien** im engine/src liegen vom Sweep noch herum (nicht von mir); mein eigenes Harness `_run4_harness.test.ts` wurde wieder entfernt.
