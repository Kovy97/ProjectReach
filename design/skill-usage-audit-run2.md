# Skill-Nutzungs- & Aktionsdichte-Audit (RUN 2 / Refresh)

**Datum:** 2026-06-27 · **Autor:** balance-designer (PLAN/ANALYSE-ONLY) · **Scope:** NUR dieses Doc.
**Vorgänger:** `design/skill-interaction-audit.md` (Run 1, Interaktions-Fokus), `design/skill-rework-spec.md`.
**Frage:** Welche Skills haben *genug* Aktionen, sauberen Levelbereich und eine klare Output→Senke-Kette —
und welche sind die nächsten Ausbau-Kandidaten, nachdem seither Woodcutting, Cooking (Fleisch+Combos),
Leatherworking (Range/Mage-Rüstung + Capes + Dragon/Shadowhide) und Thieving (Hehler-Kette) erweitert wurden?

**Reviergrenze:** reine Spec. Kein `packages/**`/`apps/**` geändert. Zahlen = Vorschläge (Chef/Balance-Domäne).

**Datenquellen (frisch gemessen beim Schreiben):**
- Aktions-Zählung & Levelbereiche aus `packages/content/src/index.ts`, Actions-Block (Z. 3549–7113),
  gezählt je `skill:` + `levelRequired:`.
- Tool-Abdeckung aus `tool: { skill, speedMult }`-Feldern (Items-Block) + `engine/src/tools.ts` (`bestToolSpeed`).
- Output→Senke-Ketten aus Run-1-Audit + Stichproben im Content.

---

## 0. Was sich seit Run 1 geändert hat (Delta)

| Skill | Run 1 (Aktionen) | Jetzt | Was kam dazu |
|---|---|---|---|
| **woodcutting** | 9 | **16** | mehr Baum-Tiers bis L99; Axt = WC-Tool (12 Forge-Äxte tragen `tool: woodcutting`) |
| **leatherworking** | 19 | **58** | Leder/Range-Rüstung, **Capes** (leather/ranger/warcape/arcane), **Dragonhide/Shadowhide**-Sets, Studded/Warhide |
| **cooking** | 17 | **30** | essbare **Fleisch-Vielfalt** + **Combo-Food** (16 Combo-/Hearty-Rezepte) |
| **thieving** | 14 | **23** | **Hehler-Kette** (`category: "fence"`, 9 Aktionen) — Run-1/Spec-Vorschlag P1-C ist **umgesetzt** |
| **farming** | 29 | **29** | Crops/Pigment/Schilf vorhanden; **Plot-System** weiter in Arbeit |
| übrige | — | unverändert | smithing 252, runecrafting 63, fletching 38, inscription 36, foraging 32, herblore 26, jewelcrafting 22, mining 16, fishing 15 |

**Headline:** Die Ausbauten haben die früheren Dünnstellen (WC 9, Thieving 14-nur-Gold, LW 19) **geschlossen**.
Die *neuen* Dünnstellen sind jetzt **jewelcrafting** (Output-Leiter endet zu früh) und ein **Mining-Dichte-Cliff**
(L15→L35 ohne neue Ader). Fishing bleibt der aktionsärmste Skill, ist aber als AFK-Baseline funktional.

---

## 1. Skill-Übersichtstabelle

Aktionen = Karten im Skill. Levelbereich = `levelRequired` min–max. Größter Gap = größter Lücken-Sprung
zwischen aufeinanderfolgenden Aktions-Leveln (Indikator für „Dichte-Cliffs"). Urteil-Skala:
**solide** · **dünn** (wenig Aktionen, aber funktional) · **zu wenig Aktionen** · **Output ohne/zu-früh-endende Senke**.

### Sammel-Skills (gather)

| Skill | Aktionen | Levelbereich | Größter Gap | Output → Senke (Nutzen-Kette) | Urteil |
|---|---|---|---|---|---|
| **woodcutting** | 16 | L1–99 | 10 (45→55) | Logs → **Fletching** (Bögen/Pfeil-Schäfte) · Holz-Tool = Axt | **solide** (war dünn, jetzt ok) |
| **mining** | 16 (11 Erz + 5 Gem) | L1–105 | **20 (Coal 15 → Mithril 35)** | Erz → **Smithing** · Gems → **Jewelcrafting/Fence** | **solide, aber 1 Dichte-Cliff** |
| **fishing** | 15 | L5–97 | 10 (20→30) | Roh-Fisch → **Cooking** (jetzt mit Combos) | **dünn** (aktionsärmster Skill; AFK-Baseline ok) |
| **foraging** | 32 | L1–97 | 6 | Kräuter/Essenz/**Samen** → Herblore/Inscription/Farming | **solide** |
| **farming** | 29 | L4–95 | 12 (50→62) | Crops/Kräuter/Schilf/Pigment → Cooking/Herblore/Inscription | **solide** (Plots in Arbeit) |
| **thieving** | 23 (14 Steal + 9 Fence) | L1–115 | 10 | Gold + Wertsachen → **Fence** → Gold/Gems/Enchant-Mats | **solide** (frisch reworked) |

### Verarbeitungs-Skills (crafting)

| Skill | Aktionen | Levelbereich | Größter Gap | Output → Senke (Nutzen-Kette) | Urteil |
|---|---|---|---|---|---|
| **smithing** | 252 | L1–102 | 8 | Barren/Gear → Equip + NPC-Verkauf | **solide** (Volumen; nur UX-Thema) |
| **runecrafting** | 63 | L1–105 | 10 | Runen → Magie-Munition + Gear-Enchant | **solide** |
| **leatherworking** | 58 | L1–95 | **18 (52→70)** | Leder → Range/Mage-Rüstung + Capes + Dragon/Shadowhide | **solide** (Gap 52–70 beobachten) |
| **fletching** | 38 | L1–100 | 10 | Pfeile/Bögen → **Ranged**-Kampf | **solide** |
| **inscription** | 36 | L8–95 | 10 (60→70) | Tinten/Sigil → Gear-Enchant + Schriftrollen | **solide** |
| **herblore** | 26 | L1–99 | 6 | Tränke → Heilung/Buff/Antidot (Zonen-Gating) | **solide** |
| **cooking** | 30 | L2–97 | 7 (48→55) | Essen → Kampf-Heilung/Buff (Combo-Food) | **solide** (frisch erweitert) |
| **jewelcrafting** | **22** | **L1–82** | **17 (38→55)** | Ringe/Amulette → Equip-Slot | **Output-Leiter endet zu früh** |

### Kampf-Skills (kein eigenes SkillPage-Aktionsfeld)

| Skill | „Aktionen" | Senke | Urteil |
|---|---|---|---|
| attack / power / defence | via Kampf (3 Stile) | XP/Loot | **solide** (interaktivster Bereich) |
| ranged | via Kampf (Munition) | XP/Loot | **solide** |
| magic_off / magic_def | via Kampf (Mana/Stab) | XP/Loot | **solide** (In-Fight-Texture = combat-dev-Scope) |
| vitality | passiv | max-HP | n/a (Derived) |

---

## 2. Die dünnsten Skills — konkret + Ausbau-Vorschlag

### 🥇 JEWELCRAFTING — „Output-Leiter endet bei L82" — **Top-Ausbau-Kandidat**

**Befund (gemessen):** Nur **22 Aktionen**, höchste bei **L82** (Heartforged Pendant). Alle anderen Crafting-Skills
reichen L95–105. Dazu eine **17-Level-Lücke L38→L55** (zwischen Ruby-Amulett und Diamond-Ring keine neue Schmuck-Stufe).
Top-Gem ist **Onyx (L70)**; oberhalb gibt es **keine** Schmuck-Stufe, obwohl Mining bis **Godiron L105** und Gem-Seams
bis **Onyx L90** liefern. → Endgame-Spieler haben **kein** craftbares High-Tier-Schmuckstück; der Skill „läuft leer".

**Konkreter Vorschlag (content-dev, Zahlen = Platzhalter):**
1. **Mittel-Tier-Füllung (L38–55):** je 1 Ring + 1 Amulett auf ~L44 und ~L50 (z. B. ein vorhandener Gem-Tier oder
   ein neues „Bloodgem"/„Sapphire-II"-Motiv), schließt den 17-Level-Sprung.
2. **Endgame-Leiter (L82→~100):** 2–3 neue Tiers oberhalb Onyx — z. B. **Voidgem-Ring/Amulett (L88)** und
   **Godgem/Heartcore-Set (L96–100)**, gespeist aus den existierenden High-Gem-Seams (Diamond L75, Onyx L90).
   Bringt Jewelcrafting auf dieselbe Endgame-Reichweite wie Smithing/Runecrafting.
3. **Set-Anbindung:** das neue Endgame-Schmuck als 2er-Set (Ring+Amulett) mit kleinem Bonus → Sink-Identität
   neben reinem Slot-Equip. **CHEF-ENTSCHEIDUNG:** neue Gem-Motive erfinden vs. vorhandene Gems hochskalieren.

### 🥈 MINING — „Coal-to-Mithril-Totzone L15→35" — **gezielter Dichte-Fix**

**Befund (gemessen):** Erz-Leiter Copper/Tin L1 → Iron L10 → **Coal L15 → Mithril L35** (20 Level ohne neue Ader)
→ Adamantite L45 → Runite L55 → Bloodiron L70 → Titanium L80 → Aetherite L90 → Godiron L105.
Die **L15–35-Lücke** ist der einzige echte Dichte-Cliff im Gather-Bereich: 20 Level lang baut man Coal/Iron weiter,
ohne Progression — fühlt sich nach „Stillstand" an (Run-1 nannte Gather AFK-gewollt, aber 20 Level Leerlauf ist zu viel).

**Konkreter Vorschlag (content-dev):**
1. **1 Erz-Stufe bei ~L22–25 einschieben** (z. B. **Steel-/Blacksteel-Ore** oder ein Dark-Fantasy-Motiv wie
   „Gravesteel Vein") → halbiert die Totzone und gibt Smithing einen mittleren Barren-Input.
2. Optional **1 Gem-Seam bei ~L25** (zwischen Garnet L15 und Sapphire L35), damit auch die Gem-Leiter glatter wird.
3. Mining ist sonst **solide** — kein Vollumbau, nur diese 1–2 Einschübe.

### 🥉 FISHING — „aktionsärmster Skill, kaum Würze" — **leichter Sparkle-Pass**

**Befund:** **15 Aktionen** (wenigste aller Skills), L5–97, Gap 10 (L20→30). Reine Einzel-Node-AFK; Output geht
sauber in **Cooking** (jetzt mit Combos — Senke ist gesund). Kein **Output-ohne-Senke**, nur **dünn**.

**Konkreter Vorschlag (klein halten — AFK-Grundpfeiler):**
1. **2 Fisch-Stufen einschieben** (um L25 und L60), schließt Gap und gibt der Leiter mehr Sprossen.
2. **1 seltener „Schwarm"-Bonus-Drop** je Node (Premium-Fisch → Combo-Food-Input) — reiner Content-Loot-Roll,
   analog `birds_nest` beim WC. Erzeugt „oh nice"-Momente ohne Engine-Bedarf (vgl. `skill-rework-spec.md` P2-A Stufe S).
3. **KEIN** Tool-Mangel-Fix hier nötig — separat als Gold-Sink (siehe `shop-rework-plan.md` + gold-economy S1).

---

## 3. Werkzeug-Abdeckung (Quer-Befund, betrifft mehrere Gather-Skills)

Gemessen aus `tool: { skill }`-Feldern: **nur Mining (5 Spitzhacken) und Woodcutting (12 Äxte, die als Waffe
doppeln)** haben Tempo-Werkzeuge. **Fishing, Foraging, Farming haben KEIN Werkzeug** — `bestToolSpeed` gibt dort
immer 1 zurück. Das ist **kein Dichte-, sondern ein Gameplay-/Gold-Sink-Thema** und gehört in den Shop-/Gold-Plan
(`design/shop-rework-plan.md` + `gold-economy.md` S1: Werkzeug-Leiter für ALLE Gather-Skills). Hier nur als
Querverweis vermerkt, damit es nicht durchs Raster fällt.

---

## 4. Kleinere Dichte-Lücken (kein Rework, nur „bei Gelegenheit füllen")

| Skill | Lücke | Empfehlung |
|---|---|---|
| **leatherworking** | L52→70 (18) | 1 Tier-Einschub um L60 (zwischen Studded und Dragonhide-Bereich) |
| **farming** | L50→62 (12) | 1 Crop/Kräuter-Stufe um L56 (koordiniert mit Plot-System) |
| **cooking** | L48→55 (7) | tolerierbar; bei Bedarf 1 Combo-Rezept um L51 |
| **woodcutting** | L45→55 (10) | tolerierbar; 1 Baum-Stufe um L50 optional |

---

## 5. Priorisierte „nächste Rework-Kandidaten" (Apply-Liste für CEO → content-dev)

| Rang | Skill | Maßnahme (Kern) | Aufwand | Reviere | Migration? |
|---|---|---|---|---|---|
| **1** | **jewelcrafting** | Mittel-Tier-Füllung L38–55 **+** Endgame-Leiter L82→~100 (2–3 Tiers) + optional 2er-Set | **S–M** (Content) | content-dev (+ggf. sets) | nein |
| **2** | **mining** | 1 Erz-Stufe @~L22–25 (Coal→Mithril-Totzone halbieren) + optional 1 Gem-Seam @~L25 | **S** (Content) | content-dev | nein |
| **3** | **fishing** | 2 Fisch-Stufen (~L25/~L60) + 1 seltener Schwarm-Bonus-Drop | **S** (Content) | content-dev | nein |
| 4 | leatherworking / farming | je 1 Tier-Einschub in der genannten Lücke | S | content-dev | nein |
| — | thieving | **erledigt** (Fence-Kette live) — keine Aktion | — | — | — |

**Empfehlung:** #1 zuerst (jewelcrafting ist das einzige *echte* „Output endet zu früh"-Problem — Endgame-Spieler
haben aktuell keinen Grund, den Skill über L82 zu trainieren). #2/#3 als günstiger Dichte-/Sparkle-Pass danach
(reine Content-Zahlen, keine Engine, keine Migration). Alle Maßnahmen sind `ActionDef`/Item-Content → seriell in
`index.ts`, kein logic/ui-Bedarf außer ggf. Set-Definition.

---

## 6. Offene Chef-Entscheidungen

- **Jewelcrafting-Endgame-Identität:** neue High-Gem-Motive erfinden (Voidgem/Godgem, passt zu Dark-Fantasy)
  **oder** vorhandene Gems (Onyx/Diamond) zu höheren Item-Tiers hochskalieren? (Empfehlung: 1–2 neue Motive +
  2er-Set-Bonus für Identität.)
- **Mining-Einschub-Name/Tier:** soll die neue L22–25-Ader an einen existierenden Smithing-Barren (Steel) andocken
  oder ein eigenes Dark-Fantasy-Material („Gravesteel") werden?
- **Fishing-Scope:** reicht der leichte Sparkle-Pass (2 Stufen + 1 Event-Drop), oder soll Fishing wie Foraging eine
  eigene Sink-Identität bekommen (z. B. seltene Köder/Essenzen für eine andere Kette)? (Empfehlung: klein halten.)
- **Werkzeug-Leiter** (Fishing/Foraging/Farming ohne Tool): gehört in den Gold-Sink-Plan — Freigabe dort, nicht hier.
</content>
</invoke>
