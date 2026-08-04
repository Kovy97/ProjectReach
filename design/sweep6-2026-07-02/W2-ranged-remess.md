# Sweep 6 — W2: Ranged-Ökonomie + Progression RE-MESSUNG (nach den Toolkit-Fixes)

**Tester:** Sweep-6-W2-Tester (Kontrolleur-Rolle, read-only) · **Datum:** 2026-07-03
**Auftrag:** T10-P2-2 (Ranged-Einkommens-Lücke) + T3-F3 (Bogen-Stall) neu messen, nachdem Batch B
die Toolkit-Verzerrungen gefixt hat (T3-F2 Ammo-Entkopplung, T4-#2 Craft-Route) und Batch C
copper_arrow auf 0.2 angehoben hat.
**Methode:** RealisticPlayer honest (kein give/setSkillLevel), **Seeds 74 + 85 (identisch zu T10)**,
je **30 Sim-h SPIELZEIT** in Stunden-Slices ab Spielstart; Ranged-Persona Bias 0.25 (wie T10-„Robin"),
zusätzlich Melee-Grinder Bias 0.15 (Seeds 74+85) als **frischer Korridor** — die Batch-B-Fixes
verschieben auch Melee-Messwerte, T10-Absolutzahlen sind daher nur als Verhältnis vergleichbar.
Instrumentierung per Instanz-Wrapper (Buy/Sell kategorisiert, Kampfzeit = Minuten mit
`combat.monsterId !== null`, 60-s-Auflösung) — **kein Engine-Eingriff**.
Wegwerf-Harness `_tmp_s6w2g_ranged.test.ts` (packages/engine/src), nach dem Lauf gelöscht.
Rohdaten: Scratchpad `w2-ranged-remess.json`. **Kein Fix vorgenommen.**

---

## TL;DR — die Entscheidung für den Chef

**Die Ranged-Einkommens-Lücke pro Kampfstunde war überwiegend Toolkit-Artefakt. KEINE
Balance-Aufgabe nötig.** Nach den Fixes liegt Ranged pro tatsächlicher Kampfstunde bei
**87–101 % des Melee-Nettoeinkommens** (T10-Stand: ~39 %) und bei **Kill-Tempo-Parität**
(217/254 vs. 211/213 Kills/Kampf-h). Was in der 30-h-Summe noch fehlt (~50–66 % des
Melee-Vermögens), ist **Kampf-Uptime** — und die frisst ein NEUES Toolkit-Loch (W2-F1:
Sim bevorratet Pfeile nicht idle-proportional; 200er-Puffer ≈ 10 Kampf-Minuten), kein
Spiel-Problem: Engine-seitig ist AFK-Ranged voll tragfähig (Köcher ohne Cap, Auto-Reload
aus dem Inventar). Der Bogen-Stall (T3-F3) besteht fort, ist aber **nicht ranged-spezifisch**
— Melee klebt in denselben Läufen genauso auf Copper/Bronze-Waffen (W2-F2: der ehrliche Sim
levelt Craft-Skills nicht als Gear-Route). → **2 Toolkit-Aufgaben für logic-dev, danach
T3-F3 erneut messen; Balance-seitig nur Beobachtung, kein Eingriff.**

---

## Vergleichstabelle alt → neu

| Metrik (30 Sim-h) | T10 ranged (74/85) | **W2 ranged (74/85)** | T10 melee (74/85) | **W2 melee (74/85)** |
|---|---|---|---|---|
| CL | 26 / 27 | **28 / 28** | 27 / 26 | 27 / 27 |
| Kills | 1083 / 1007 | **1194 / 1462** | 3537 / 3043 | 2411 / 3073 |
| Tode | 21 / 18 | **19 / 19** | 19 / 17 | 20 / 22 |
| verdient | 76,5k / 90,8k | **102,2k / 103,1k** | 221,7k / 176,4k | 156,7k / 184,0k |
| Endgold | 37,7k / 55,0k | **47,6k / 52,9k** | 186,4k / 136,1k | 129,3k / 132,0k |
| Bank-Hort (Sellwert) | 82,4k / 50,3k | **41,4k / 59,7k** | 32,6k / 72,1k | 47,5k / 37,6k |
| **Upkeep-Quote** | **51 % / 39 %** | **53,4 % / 48,7 %** | 16 % / 23 % | 17,5 % / 28,3 % |
| Munition-Spend | 16,7k / 15,5k (copper 4 g) | **28,0k / 27,8k (iron 6 g)** | – | – |
| Food-Spend | ~22–23k | 26,2k / 22,1k | ~19,5–39,8k | 27,2k / 51,6k |
| Kampfzeit (gemessen) | – (T10 andere Attribution) | **5,5 h / 5,7 h** | – | **11,4 h / 14,4 h** |
| Kills/Kampf-h | „48" (T10-Attribution) | **217 / 254** | „139" (T10) | **211 / 213** |
| Netto/Kampf-h (nach Food+Munition) | „~3,4k" | **8,7k / 9,3k** | „~8,7k" | **11,4k / 9,2k** |
| Endwaffe | copper_shortbow | copper_longbow / copper_shortbow | – | copper_maul / bronze_sword |
| Fletching-Level | – (T3 Seed 52: 29) | **1 / 1** | – | 1 / 1 |

**Methodik-Hinweis:** Kampf-h-Absolutwerte sind zwischen T10 und W2 NICHT direkt vergleichbar
(andere Zeit-Attribution). Vergleichbar ist das **Stil-VERHÄLTNIS innerhalb eines Sweeps**:
Einkommen/Kampf-h ranged÷melee = **0,39 (T10) → 0,87–1,01 (W2)**. Kills/Kampf-h-Verhältnis:
**0,35 (T10) → 1,03–1,19 (W2)**.

---

## Antworten auf die 5 Messfragen

### (1) Einkommen/Kampf-h netto — Lücke zu ~90–100 % geschlossen
Netto (verdient − Food − Munition) pro gemessener Kampfstunde: **ranged 8,7k/9,3k** vs.
**melee 11,4k/9,2k** (gleiche Instrumentierung, gleiche Seeds). Mit Bank-Hort eingerechnet
liegt Ranged sogar gleichauf bis vorn (16,2k/19,6k vs. 15,5k/11,8k pro Kampf-h). Treiber der
alten 3,4k-Zahl waren die 0.1-Schaden-Kupferpfeile + Sorten-Matching (T3-F2) — beides weg:
der Sim kauft jetzt durchgehend **iron_arrow (0.3)** und rüstet den besten tragbaren Pfeil.
Verdienst je Kill: ranged 85,6/70,6 g vs. melee 65,0/59,9 g.

### (2) Upkeep-Quote — unverändert hoch, aber KEIN Einkommens-Problem mehr
**48,7–53,4 %** (T10: 39–51 %) — nominell sogar leicht höher, weil die Munitions-Rechnung von
copper (4 g) auf iron (6 g, 4,6–4,7k Stück = 27,8–28,0k g) hochgerüstet ist. Die Doppel-Steuer
(Food ~4,3–4,8k + Munition ~4,9–5,1k pro Kampf-h vs. melee Food-only 2,4–3,6k) ist **real und
strukturell** — wird aber durch das höhere Brutto pro Kampfstunde voll kompensiert (s. (1)).
Einordnung gegen T10-P2-1 (Gold-Überschuss ohne Senken): Ranged ist der einzige Stil, dessen
Gold tatsächlich **zirkuliert** statt zu horten — im Licht des Überschuss-Befunds eher die
gesündeste der drei Ökonomien als ein Balance-Fehler. **Keine Preis-/Drop-Anpassung empfohlen.**

### (3) Bogen-Progression — Stall besteht, Ursache jetzt präzise (und stil-agnostisch)
- Robin74: cracked_bow → **copper_shortbow** (h2, Shop 120 g) → **copper_longbow** (h27,
  gecraftet mit dem L1-Rezept) @ CL 28, ranged 38. Robin85: **copper_shortbow** von h6 bis
  Ende @ CL 28, ranged 37. Angemessen wäre blacksteel (req 30), mindestens iron/steel.
- Die Craft-Route (T4-#2) läuft an — aber `craftWeaponUpgradeTask` betrachtet nur
  **FREIGESCHALTETE** Rezepte (`sim-realistic.ts:1838` `actionUnlocked`), und **Fletching bleibt
  30 h lang auf Level 1**, weil `manageAmmo` (sim-realistic.ts:1663-1675) Munition immer KAUFT,
  solange Gold da ist (iron @ 6 g ist ab h5 immer leistbar) — der Fletch-Fallback und damit jede
  Fletching-XP-Quelle wird nie erreicht. Beste craftbare Bögen sind daher für immer die
  copper-Rezepte (L1). Robin74s einziger „Fortschritt" (copper_longbow, 6× gecraftet) ist genau das.
- **Entscheidend: Melee klebt identisch** — Grinder74 endet auf copper_maul (ab h3!), Grinder85
  auf bronze_sword (ab h2), beide @ CL 27, smithing ungelevelt. Der Waffen-Stall ist also ein
  allgemeines Sim-Verhalten („Craft-Skill als Gear-Route wird nicht geplant"), **kein
  Ranged-Balance-Thema**. Ob ECHTE Spieler den Fletch-Pfad finden, bleibt die offene
  Signposting-Frage aus T3-F3 — messbar erst nach W2-F2.

### (4) Kills/h + Tode vs. Melee-Korridor — Parität pro Kampfstunde
Kills/Kampf-h **217/254 vs. 211/213** — Ranged tötet on-level jetzt genauso schnell bis
schneller. Tode **19/19 vs. 20/22** — identischer Korridor (beide Stile sterben an denselben
Lv-19-28-Goblins; „wiederholt gestorben"-Frictions 6-8× je Lauf, stil-unabhängig).
Wall-Clock-Kills (40-49/h vs. 80-102/h) hängen allein an der Uptime → W2-F1.

### (5) Fletching-Selbstversorgung — findet NICHT statt (0 Pfeile gefletcht)
`craftedById`: **0 gefletchte Pfeile in beiden Läufen**; 100 % Shop-Versorgung (4.730/4.643
Pfeile gekauft, davon 4.652/4.619 iron; 3,4–3,8 Pfeile/Kill). Fletching-Level nach 30 h: **1**.
Die Pfeil-Ökonomie ist im Fluss (kein Verlustgeschäft, keine harten Nachschub-Löcher mehr ab
h5), aber sie ist eine reine **Kauf-Ökonomie** — die Fletch-Selbstversorgung, die T3 Seed 52
noch zeigte (fletching 29), ist mit der Shop-first-Heuristik komplett verschwunden. Gleiche
Wurzel wie (3).

---

## Findings (priorisiert) — alle Toolkit/Sim, KEIN Spiel-Balance-Fund

| # | Sev | Finding | Zahlen/Beleg | Owner |
|---|---|---|---|---|
| W2-F1 | **P2** | **Sim bevorratet Munition nicht idle-proportional** — Food wird vor Idle-Strecken auf bis zu 300 aufgestockt (`stockFoodForIdle`, sim-realistic.ts:1526), Pfeile nur bis `AMMO_TOTAL_LOW` = **200** (sim-realistic.ts:107, 1662). 200 Pfeile ≈ **~10 Kampf-Minuten** (2,85-s-Takt) in 30–180-min-Idle-Strecken ⇒ 13/16 „Munition leer"-Stopps, Kampf-Uptime **5,5–5,7 h vs. melee 11,4–14,4 h** — halbiert das gemessene Ranged-30-h-Vermögen. Engine-seitig kein Hindernis: Köcher ohne Cap (equipment.ts:199, equip-dataloss.test.ts:43 nutzt 12.000), Auto-Reload aus dem Inventar (combat.ts:1388). Ein echter Spieler kauft 2–3k Pfeile (12–18k g, ab h10 locker flüssig) und AFKt durch. | Robin74/85-Läufe; Friction-Log | logic-dev (Sim-Toolkit): Ammo-Puffer analog `stockFoodForIdle` idle-skalieren |
| W2-F2 | **P2** | **Sim levelt Craft-Skills nie als Gear-Route** — `craftWeaponUpgradeTask` filtert auf freigeschaltete Rezepte (sim-realistic.ts:1838), `manageAmmo` kauft immer statt zu fletchen (:1663-1675) ⇒ fletching/smithing bleiben Level 1, beste craftbare Waffe bleibt ewig das L1-Rezept. Folge: Ranged klebt auf copper-Bögen @ CL 28 **und Melee identisch auf copper_maul/bronze_sword @ CL 27**. T3-F3 ist damit weiter NICHT messbar. | Endgear + fletching 1 in allen 4 Läufen; craftedAmmo = {} | logic-dev (Sim-Toolkit): „Rezept X würde Waffen-Upgrade liefern → Skill dorthin leveln" als Versorgungs-Task; danach T3-F3-Re-Test |
| W2-F3 | P4 | Früh-Spiel-Klemme: `bestShopArrow` verlangt Budget für ≥ 10 Pfeile (sim-realistic.ts:1778) — Robin85 stand bei Gold 65 (Reserve 60) vor crude à 1 g und konnte NICHTS kaufen ⇒ 4× „Munition komplett leer und nicht beschaffbar" (Sim-Min 240–242). Ein echter Spieler kauft auch 5 Pfeile. | Robin85-Friction-Log h4 | logic-dev (Mini-Nit, mit W2-F1 erledigt) |
| W2-F4 | P4 | „Inventar voll — Entlastung wirkungslos"-Friction feuert trotz T4-#3-Dedupe 8–11× je Melee-Lauf (je Wieder-Auftreten nach zwischenzeitlicher Entlastung) — verrauscht die Berichte weiter. | Grinder74: 11×, Grinder85: 8× | logic-dev (bei Gelegenheit) |

**Beobachtung (keine Aufgabe):** Munitionskosten-Anteil am Brutto liegt bei iron-Tier um
~27 % (21–23 g/Kill von 71–86 g/Kill) — konsistent mit T3-F5 (Anteil steigt in hohen Tiers auf
48–60 %). Im Auge behalten, wenn Endgame-Personas gemessen werden; heute kein Handlungsbedarf.
Der Batch-C-Fix (copper_arrow 0.2) ist wirksam-unauffällig: der Sim kauft copper nur noch in
Kleinstmengen (10–13 Stück), crude/copper-Falle aus T3-F1 tritt nicht mehr auf.

---

## Messdaten

### Gold-/Progressions-Kurven (Endgold je Sim-h · verdient kumulativ)
| Lauf | h5 | h15 | h30 | verdient h5→h15→h30 |
|---|---|---|---|---|
| Robin74 (ranged) | 1,0k | 18,2k | 47,6k | 8,2k → 39,7k → 102,2k |
| Robin85 (ranged) | 0,1k | 3,8k | 52,9k | 4,6k → 27,4k → 103,1k |
| Grinder74 (melee) | 4,9k | 54,3k | 129,3k | 8,7k → 67,9k → 156,7k |
| Grinder85 (melee) | 12,3k | 58,0k | 132,0k | 20,4k → 90,1k → 184,0k |

Früh (h1–5) bleibt Ranged der klamme Stil (Munition+Food fressen alles — wie T10), holt aber
ab h15 auf; die Spät-Kurve ist mit ~3–3,5k/Wall-Clock-h etwa halb so steil wie melee (~5k/h)
— exakt der Uptime-Faktor aus W2-F1.

### Gear-Timeline (mainhand)
- Robin74: cracked_bow → h2 copper_shortbow (Shop) → h27 **copper_longbow** (Craft-Route,
  6× gefertigt, fletching 1); Ende: iron_arrow×355 im Köcher, 566 gesamt.
- Robin85: cracked_bow → h6 copper_shortbow (Shop) → Ende (24 h auf dem Shop-L1-Bogen).
- Grinder74: rusty_sword → h2 copper_mace (Drop) → h3 **copper_maul** → Ende (27 h).
- Grinder85: rusty_sword → h2 **bronze_sword** (Shop, 130 g) → Ende (28 h).

### Skill-Stände nach 30 h (Kampf-relevant)
| Lauf | ranged | attack | power | defence | vitality | fletching |
|---|---|---|---|---|---|---|
| Robin74 | 38 | 1 | 1 | 1 | 36 | **1** |
| Robin85 | 37 | 1 | 1 | 1 | 35 | **1** |
| Grinder74 | 1 | 38 | 29 | 1 | 40 | 1 |
| Grinder85 | 1 | 37 | 28 | 1 | 41 | 1 |

### Friction-Bilanz
Robin74: 22 (13× Munition-leer-Stopp, 7× wiederholt gestorben, 1× Koch-Zutaten, 1× Food) ·
Robin85: 29 (16× Munition, 4× davon „nicht beschaffbar" = W2-F3, 8× gestorben) ·
Grinder74: 22 (11× Inventar-voll = W2-F4, 10× gestorben) · Grinder85: 21 (8× Inventar, 12× gestorben).

---

## Verdikt

**T10-P2-2 (Ranged-Einkommens-Lücke): überwiegend Toolkit-Artefakt — als Balance-Thema
SCHLIESSEN.** Pro Kampfstunde herrscht nach den Fixes Netto- und Kill-Tempo-Parität; die
Upkeep-Quote von ~50 % ist eine reale, aber kompensierte (und angesichts des
Gold-Überschuss-Befunds T10-P2-1 sogar wünschenswerte) Eigenschaft des Stils.
**T3-F3 (Bogen-Stall): weiter offen, aber als stil-agnostisches Sim-Loch reklassifiziert**
(W2-F2 — Melee klebt genauso). **Für den Chef morgen: keine Balance-Aufgabe.** Für logic-dev:
W2-F1 + W2-F2 (Sim-Toolkit), danach T3-F3-Re-Messung; erst wenn der Sim die Fletch-Route
GEHT und der Stall bleibt, wird daraus ein echtes Signposting-/Design-Thema.
