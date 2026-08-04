# Shop-Rework-Plan (Hearthforge Idle)

**Datum:** 2026-06-27 · **Autor:** balance-designer (PLAN-ONLY) · **Scope:** NUR dieses Doc. Kein Code/Content.
**Bezug:** `design/gold-economy.md` (Sink-Diagnose + S1/S2/S3), `design/city-plan.md` (Shop wandert in die Stadt),
`design/skill-usage-audit-run2.md` (Werkzeug-Lücke Fishing/Foraging/Farming).
**Reviergrenze:** reine Spec. Zahlen = Vorschläge/Platzhalter (Chef/Balance-Domäne). content-dev/logic-dev/ui-dev übernehmen.

---

## 0. TL;DR

Der Shop ist heute ein **Frühgame-Schaufenster** (~60 Einträge, fast alle einmalig, Sortiment endet bei Stahl-Gear,
runite-Spitzhacke und Pfennig-Samen) und hört danach auf, relevant zu sein. Ziel: ein **mitwachsender Shop**, der über
das ganze Spiel etwas zu kaufen bietet und damit den **fehlenden Gold-Sink** (siehe `gold-economy.md`) teilweise füllt —
**ohne** die Wirtschaft zu brechen (kein Verkauf von Macht-Gear, kein Verkauf gatherbarer Rohstoffe).
**Sofort umsetzbar (City-unabhängig):** Werkzeug-Leiter für alle Gather-Skills, mehr Verbrauchsgüter, Preis-Normalisierung
relativ zu `value`. **An City gekoppelt:** Shop-Tiers/Freischaltungen, Restock-Mechanik, Premium-/Token-Sortiment.

---

## 1. Ist-Zustand (gemessen aus `content/src/index.ts` `shop: [...]`, Z. 7922–7996)

| Kategorie | Einträge (Beispiele) | Preis-Spanne | Befund |
|---|---|---|---|
| Starter-Gear (Melee/Range/Magie) | rusty_sword … steel_warblade, iron_platebody, iron_longbow, dim_focus | 12–700 g | **einmalig**, endet bei ~Stahl/L30 |
| Starter-Magie/Drop-Gear | apprentice_robe_*, boar_tusk_mace, mire_fang_dagger, chitin_bulwark | 85–240 g | einmalig |
| Spitzhacken | bronze … runite_pickaxe | 60–2.400 g | **einziges Tool-Sortiment**; endet bei runite (L55), kein Endgame-Tier; **nur Mining** |
| Samen | ~25 Sorten (ashroot … corpse_lily) | 6–380 g | wiederkehrend, aber **Pfennig**; Nachschub kommt gratis aus Foraging/Farming |
| Tränke | minor/greater_healing_potion | 36 / 90 g | wiederkehrend, aber **selbst-craftbar** (Herblore) |
| Gekochtes Essen | cooked_shrimp/trout | 6 / 15 g | trivial, nur Early |
| Grundstoffe Herblore | vial_of_water, clear_oil | 2 / 3 g | trivial |
| Inventar-Pouch | small_pouch | 100 g | einmalig |
| Dungeon-Schlüssel | warband … idolhall_key | 4k–160k g | wiederkehrend, **optional** (Schlüssel farmbar) |

**Diagnose:** Das Sortiment ist **breit aber flach** — viele Einträge, fast alle **einmalig + früh + billig**. Die
einzigen mitwachsenden Posten sind Spitzhacken (enden zu früh) und Dungeon-Schlüssel (optional). Es gibt **keine
Preis-Logik** (Kosten sind handgesetzt, lose an `value` angelehnt) und **kein** Restock-/Verfügbarkeits-Konzept
(unbegrenzter Bestand). Ergebnis: Der Shop ist **kein Gold-Sink** jenseits des Frühgames.

---

## 2. Designprinzipien (was der Shop führen DARF / NICHT darf)

**Darf führen (bricht die Wirtschaft nicht):**
- **Werkzeuge** (Tempo/Yield, gestaffelt bis Endgame) — Macht-für-Gold ohne Combat-Gear zu ersetzen.
- **Bequemlichkeit/Komfort** (Pouch, Bank-Tabs, Auto-X-Freischaltungen) — klassischer Idle-Sink.
- **Verbrauchsgüter, die NICHT trivial selbst-gefarmt werden** (Köder, Fertilizer, Vials/Parchment-Vorstufen,
  ggf. „Notfall"-Tränke teurer als Selbst-Craft) — wiederkehrender Mini-Sink, der das Crafting nicht ersetzt.
- **Basis-Materialien NUR als Bequemlichkeits-Aufpreis** (teurer als Selbst-Gathern) — Zeitersparnis, kein Profit.

**Darf NICHT führen (würde Systeme entwerten):**
- **Macht-Gear oberhalb Starter-Niveau** (zerstört Smithing/Drops/Leatherworking als Bezugsquelle).
- **Gatherbare Rohstoffe günstig** (entwertet Mining/WC/Fishing/Foraging — Gathering ist der AFK-Kern).
- **Billige Top-Tränke/Top-Food** (entwertet Herblore/Cooking).

**Preis-Logik (Leitlinie):**
- **Verkauf (Spielereverkauf an Shop):** `value × SELL_FRACTION` (=0,5) — bleibt global, unverändert.
- **Kauf (Shop an Spieler):** Vorschlag **`cost = round(value × BUY_MULT)`** mit `BUY_MULT ≈ 1,0–1,5` je Kategorie
  (Komfort/Tools höher, Verbrauch niedriger). Macht die heute handgesetzten Preise **systematisch** und konsistent.
- **Tool-/Komfort-Leiter:** **geometrisch** (~×3 je Stufe), bis Endgame-Top ~1–1,5 Mio (siehe gold-economy S1).

---

## 3. Vorgeschlagenes Sortiment, gestaffelt nach Fortschritt

> Preise = Platzhalter. „Phase" = wann es relevant wird. „Sink-Typ": einmalig / wiederkehrend / ∞ (geometrisch).

### 3.1 Werkzeug-Leiter für ALLE Gather-Skills — **(sofort, City-unabhängig)**

Heute nur Spitzhacken (Mining) + Äxte (über Smithing, nicht Shop). **Fishing/Foraging/Farming haben gar kein Tool**
(`skill-usage-audit-run2.md §3`). Vorschlag: vollständige, gold-gekaufte Leiter je Skill, jede Stufe gibt Speed/Yield.

| Skill | Tool-Leiter (Beispiel-Tiers) | Preis-Kurve (Platzhalter) | Sink-Typ |
|---|---|---|---|
| Mining | Spitzhacke T1–T8 (heute T1–5, **+ Endgame-Tiers**) | 60 → 2,4k → … → ~1,5 Mio | gestaffelt |
| Woodcutting | **Sammel-Axt** als Shop-Tool (entkoppelt von Waffe) T1–T8 | dito | gestaffelt |
| Fishing | **Angel** T1–T8 (neu) | dito | gestaffelt |
| Foraging | **Sammelmesser/Sichel** T1–T8 (neu) | dito | gestaffelt |
| Farming | **Harke/Gießkanne** T1–T8 (neu, koordiniert mit Plot-System) | dito | gestaffelt |

→ Stärkster sofort-machbarer Sink: jeder Skiller *will* das nächste Tempo-Tier. Top-Stufen ~1,5 Mio absorbieren
Mid/Late-Income. (Engine-Hook `bestToolSpeed` existiert bereits; braucht nur neue Tool-Items + Shop-Einträge +
ggf. Yield-Hook je Skill — Detail in gold-economy S1.)

### 3.2 Verbrauchsgüter (wiederkehrender Mini-Sink) — **(größtenteils sofort)**

| Posten | Zweck | Phase | Preis (Platzhalter) | Sink-Typ |
|---|---|---|---|---|
| **Köder** (Fishing) | optionaler Yield/Speed-Boost je Zyklus | alle | 2–50 g/Stk | wiederkehrend |
| **Fertilizer** (Farming, koordiniert Plot-System) | −Wachszeit / +1 Ertrag je Zyklus | mid+ | 200–2.000 g/Zyklus | wiederkehrend (skaliert mit Plot-Zahl) |
| **Vials/Parchment-Vorstufen** (Herblore/Inscription) | Bequemlichkeit, falls Selbst-Craft fummelig | alle | leicht über Craft-Wert | wiederkehrend |
| **Notfall-Tränke** (teurer als Selbst-Craft) | „kein Herblore-Level"-Brücke | early–mid | 1,5× Craft-Wert | wiederkehrend |
| Samen (bestehend) | Farming-Start | alle | unverändert | wiederkehrend (winzig) |

### 3.3 Bequemlichkeit / Komfort — **(teils sofort, teils logic-Bedarf)**

| Posten | Zweck | Preis (Platzhalter) | Sink-Typ | Abhängigkeit |
|---|---|---|---|---|
| Inventar-Slot-Upgrades (bestehend) | mehr Taschenplatz | 60 × 1,5ⁿ | gestaffelt | da |
| **Bank-Tab/Slot-Pakete** (neu) | Stauraum (Bank heute gratis/∞) | 1k × 1,6ⁿ, **∞** | ∞ | logic (gold-economy S2) |
| Auto-Eat-Stufen (bestehend, **+2 Stufen**) | AFK-Heilung | +50k, +120k | gestaffelt | logic |
| **Auto-Bank / Auto-Junk-Sell / Auto-Replant** Freischaltungen | Idle-Komfort | 25k–250k einmalig | einmalig | logic (gold-economy S3) |
| Dungeon-Schlüssel (bestehend) | Komfort-Kauf statt farmen | 4k–160k | wiederkehrend (optional) | da |

---

## 4. Restock / Verfügbarkeit

**Heute:** unbegrenzter Bestand, alles sofort kaufbar. Für einen Idle-Shop ist **unbegrenzter Bestand der
Standard-Default** und für Tools/Komfort genau richtig (man will nicht auf Restock warten). Restock-Mechanik nur dort,
wo bewusst **Verknappung als Reiz** gewünscht ist:

| Verfügbarkeits-Modell | Wofür | Wann | Abhängigkeit |
|---|---|---|---|
| **Unbegrenzt** (Default) | Tools, Komfort, Standard-Verbrauch, Schlüssel | sofort | keine |
| **Level-/Fortschritt-Gating** | höhere Tool-Tiers erscheinen erst ab Skill-Level X | sofort (Content-Filter, UI zeigt „ab Lv X") | ui |
| **Daily-Restock (limitierter Premium-Posten)** | 1 rotierender „Angebot des Tages" (z. B. rabattierter Tool-Tier oder seltenes Verbrauchsgut) | **an City gekoppelt** (Daily-Reset-Logik existiert dort) | logic + city |
| **Building-/City-gegatetes Sortiment** | Premium-/Token-Stock schaltet frei, wenn Stadt ausgebaut wird | **an City gekoppelt** | city |

> Empfehlung: **sofort** mit „unbegrenzt + Level-Gating" starten (deckt 90 % ab). Daily-Restock & City-Stock erst mit
> dem City-Feature — sie hängen ohnehin an dessen Daily-Reset/Building-System.

---

## 5. Der Shop als Gold-Sink — ohne die Wirtschaft zu brechen

Bezug `gold-economy.md`: Income skaliert steil (bis Mio/h Smithing), Sinks nicht. Der Shop kann **zwei** der drei
Sofort-Sinks (S1 Tools, S3 Komfort; S2 Bank teils über Shop-UI) tragen:

| Hebel | Wie er Gold zieht | Warum er NICHT bricht |
|---|---|---|
| **Tool-Leiter (S1)** | geometrische Top-Stufen (~1,5 Mio) × 5 Skills = breite, mitwachsende Senke | gibt nur **Speed/Yield**, keine Combat-Macht; man *will* es, muss aber nicht |
| **Komfort (S3)** | gestaffelte Einmal-/Stufen-Käufe (Auto-X, Bank-Tabs ∞) | reine Bequemlichkeit; AFK-Zielgruppe zahlt gern, Power-Balance unberührt |
| **Verbrauch (Köder/Fertilizer)** | wiederkehrend, skaliert mit Aktivität/Plot-Zahl | optionaler Boost, ersetzt kein gefarmtes Mat |
| **Preis-Normalisierung** | `cost = value × BUY_MULT` zieht Komfort-Käufe konsistent hoch | Verkauf bleibt 0,5× → kein Wasch-Arbitrage (kaufen→verkaufen ist immer Verlust) |

**Anti-Bruch-Leitplanken:**
1. **Kein** Shop-Posten gibt Combat-Power oberhalb Starter. 2. **Kein** gatherbarer Rohstoff billiger als Selbst-Gathern.
3. Kauf > Verkauf **immer** (BUY_MULT ≥ 1 > SELL_FRACTION 0,5) → keine Geld-Druck-Schleife. 4. Top-Sinks **geometrisch
oben offen**, damit der Smithing-Overflow ein Ziel hat (vgl. gold-economy „∞-Sink Pflicht").

---

## 6. Verhältnis zum City-Feature (Staffelung)

`city-plan.md` v1 = **Hub + Quests**; Shop/Bank **wandern in die Stadt-Sektion** (gleiche IDs/Views → keine
Save-Auswirkung), aber **Gebäude-Ausbau / Stadt-Wirtschaft / Token-Shop sind explizit NICHT v1** (bewusst später).

| Shop-Ausbau | Sofort (City-unabhängig) | An City gekoppelt (deferred) |
|---|---|---|
| Werkzeug-Leiter alle Skills (S1) | ✅ | — |
| Mehr Verbrauchsgüter (Köder, Notfall-Tränke, Vials) | ✅ | Fertilizer koordiniert mit Plot-System |
| Preis-Normalisierung `value × BUY_MULT` | ✅ | — |
| Level-Gating höherer Tiers | ✅ (Content-Filter + UI-Label) | — |
| Bank-Tabs / Auto-X-Komfort (S2/S3) | ✅ (logic, City-unabhängig) | UI-Heimat ggf. im City-Hub |
| **Daily-Restock / „Angebot des Tages"** | — | ✅ (nutzt City-Daily-Reset) |
| **City-/Building-gegatetes Premium-Stock** | — | ✅ (Stadt-Ausbau ist Post-v1) |
| **Token-Shop (Quest-Token-Währung)** | — | ✅ (Hook in `city-plan §6`, Inhalt später) |

> **Wichtig:** Die *Sofort*-Posten überholen das City-Feature **nicht** — sie sind reine Sortiment-/Tool-/Komfort-
> Erweiterungen, die unabhängig vom Stadt-Ausbau-System leben. Die *gold-sink-tragenden City-Bausteine*
> (Building-Ausbau gegen Gold) bleiben wie vom Chef verfügt **deferred** (siehe `gold-economy.md` §6).

---

## 7. Apply-Liste (für CEO → content-dev / logic-dev / ui-dev)

**Sofort (City-unabhängig):**
1. **[content] Werkzeug-Leiter** — Tool-Items (Axt/Angel/Sichel/Harke + Endgame-Spitzhacke) mit
   `tool: { skill, speedMult }` + geometrische `shop`-Kosten bis ~1,5 Mio. (Engine `bestToolSpeed` existiert.)
2. **[content] Verbrauchsgüter** — Köder, Notfall-Tränke (1,5× Craft-Wert), Vials/Parchment-Vorstufen in `shop`.
3. **[content] Preis-Normalisierung** — `cost = round(value × BUY_MULT)` je Kategorie konsistent setzen (BUY_MULT ~1,0–1,5).
4. **[ui] Level-Gating-Anzeige** — höhere Tool-Tiers mit „ab Lv X" labeln; Shop nach Kategorie/Phase gruppieren.
5. **[logic+content+ui] Bank-Tabs + Auto-X-Komfort** — sofern Chef die gold-economy-Sinks S2/S3 freigibt
   (City-unabhängig baubar; UI kann später in den City-Hub ziehen).

**An City gekoppelt (deferred — erst mit Stadt-Feature):**
6. **[city] Daily-Restock / „Angebot des Tages"** (nutzt City-Daily-Reset).
7. **[city] Building-gegatetes Premium-Sortiment + Token-Shop** (Stadt-Ausbau Post-v1).

---

## 8. Offene Chef-Entscheidungen

- **BUY_MULT-Politik:** Soll der Kaufpreis systematisch `value × BUY_MULT` werden (konsistent, empfohlen) oder weiter
  handgesetzt bleiben? Welcher Multiplikator je Kategorie (Tools/Komfort höher, Verbrauch niedriger)?
- **Werkzeug-Leiter-Identität:** eigene Sammel-Tools für WC (Axt entkoppelt von Waffe) und neu Angel/Sichel/Harke —
  oder bei WC weiter die Waffen-Axt als Tool doppeln? (Empfehlung: eigene Sammel-Tools für klare Shop-Leiter.)
- **Restock überhaupt gewünscht?** Reicht „unbegrenzt + Level-Gating" (empfohlen, idle-üblich), oder will der Chef
  bewusste Verknappung (Daily-Limit) als Reiz — dann an City-Daily-Reset koppeln.
- **Bank-Tabs/Auto-X als Shop-Posten jetzt** (City-unabhängig baubar) **oder** bewusst auf den City-Hub warten?
- **Token-Währung:** Quest-Token-Shop später gewünscht? (Hook liegt in `city-plan §6` bereit.)
</content>
