# Crafting-Margen-Audit — P1.2 Validierung (Realer Break-Even)

**Autor:** balance-designer · **Datum:** 2026-06-24
**Anlass:** Playtest-Finding P1.2 (`design/playtests/_synthesis.md`, `min-maxer.md`): Min-Maxer maß `forge_godiron_blade` ~2,27 Mio Gold/h **Marktwert** = ~28× bestes Combat-Gold — mit **unendlich verfügbaren Inputs**. Frage: Bleibt „craften → an NPC verkaufen" mit **realer Beschaffungskette** ein dominanter Geld-Loop?

**Daten-Quelle:** `packages/content/src/index.ts` (Werte/Dauer/Inputs), `packages/shared/src/index.ts` (`SELL_FRACTION = 0.5`), `packages/engine/src/shop.ts` (`sellPrice = max(1, round(value × 0.5))`).

---

## TL;DR — Verdikt: **P1.2 ist weitgehend ENTSCHÄRFT. Die 2,27 Mio sind ein doppelter Mess-Artefakt.**

Die Harness-Zahl überzählt aus **zwei** Gründen:

1. **„Marktwert" = voller `value`, NICHT der NPC-Verkaufspreis.** Der Spieler verkauft an den NPC für `value × SELL_FRACTION (0,5)` — also **die Hälfte**. Die 2,27 Mio sind bereits ~2× zu hoch.
2. **„Unendliche Inputs" misst nur die 26 s Schmiede-Dauer** — die vorgelagerte Beschaffung (10 Erz minen + 25 Kohle minen + 5 Smelten = **260 s pro Klinge**) wird ignoriert. Das ist der weitaus größere Faktor (~11× Zeit).

Realer, serieller Voll-Ketten-Netto (ein Charakter, ein Aktionsslot, NPC-Verkauf):

| Craft | Harness „Marktwert" | Realer Netto-Gold/h (volle Kette) | Faktor vs. bestes Combat (80k) |
|---|---|---|---|
| forge_godiron_blade | 2.266.800 | **~88.000** | ~1,1× |
| forge_aetherium_blade | 1.698.240 | **~75.000** | ~0,9× |
| craft_onyx_amulet | 1.140.000* | **~64.000** | ~0,8× |

\* min-maxer.md nennt 1,14 Mio fürs Onyx-Amulett (craft-only, voller value).

**Fazit:** Die reale Crafting-Marge liegt **auf Augenhöhe mit Combat (80k)**, **unter Thieving (132k)** und **deutlich unter dem Dungeon-Loop (highland_aerie 266k)**. Es ist **kein Gelddrucker** — die Beschaffungskette frisst ~90 % der vermeintlichen Marge. **Keine Notfall-Nerf nötig.**

Es gibt **einen echten, kleineren Befund** (Onyx-Kette ist *invertiert*, siehe §4) und eine optionale Politur-Empfehlung (§5).

---

## 1. Konstanten & Methode

- Verkaufspreis an NPC = `round(value × 0,5)`. Es gibt **kein** separates `SELL_FRACTION` pro Item — global 0,5.
- **Serielle Voll-Kette, ein Aktionsslot:** Der Spieler kann immer nur EINE Aktion gleichzeitig laufen lassen (idle-typisch). Also: Zeit(Mining Erz) + Zeit(Mining Kohle) + Zeit(Smelten) + Zeit(Schmieden), summiert für 1 fertiges Item. Das ist das ehrliche Idle-Modell.
- Mastery-Speed/Boosts ignoriert (Worst-Case = Untergrenze; mit Mastery steigen ALLE Loops proportional, die Rangfolge bleibt).

---

## 2. Godiron-Klinge — volle Kette

| Stufe | Aktion | Dauer | Menge pro Klinge | Zeit pro Klinge |
|---|---|---|---|---|
| Mining Erz | mine_godiron | 9.500 ms | 10 Erz (5 Barren × 2) | 95,0 s |
| Mining Kohle | mine_coal | 4.200 ms | 25 Kohle (5 × 5) | 105,0 s |
| Smelten | smelt_godiron | 12.000 ms | 5 Barren | 60,0 s |
| Schmieden | forge_godiron_blade | 26.000 ms | 1 Klinge | 26,0 s |
| **Summe** | | | | **286,0 s** |

- godiron_blade `value` 14.000 → **NPC-Verkauf 7.000**
- 3.600.000 / 286.000 = **12,59 Klingen/h** → **~88.112 Gold/h real**
- Harness (nur Schmiede-Dauer, voller value): 138,46/h × 14.000 = **1,94 Mio** (min-maxer maß 2,27 Mio, vermutlich inkl. Smithing-Mastery-Speed — Größenordnung passt).

**Beobachtung:** **Kohle minen ist der Flaschenhals** (105 s, mehr als Erz). 25 Kohle/Klinge bei 4,2 s/Kohle. Mining-Zeit gesamt 200 s = 70 % der Kette.

**Wertschöpfung des Schmiedens selbst:** 5 Barren roh verkauft = 5 × 240 = 1.200 g. Klinge verkauft = 7.000 g. Der Schmiede-Schritt addiert **+5.800 g über 26 s** — das ist fair (≈ der einzige Schritt mit gutem Marge-Hebel, aber er ist nur 1/11 der Gesamtzeit).

---

## 3. Aetherium-Klinge & Onyx-Amulett — volle Kette

**Aetherium-Klinge** (value 9.000 → Verkauf 4.500):
- forge 22.000 ms (4 Barren); smelt_aetherium 10.500 ms (2 Erz + 5 Kohle → 1 Barren); mine_aetherite 8.500 ms; mine_coal 4.200 ms
- Pro Klinge: 8 Erz (68 s) + 20 Kohle (84 s) + 4 Smelt (42 s) + 1 Forge (22 s) = **216 s**
- 16,67/h × 4.500 = **~75.000 Gold/h real**

**Onyx-Amulett** (value 3.200 → Verkauf 1.600):
- craft 8.000 ms (1 onyx + 2 runite_bar); cut_onyx 5.500 ms; mine_onyx_seam 8.800 ms; smelt_runite 8.500 ms (2 Erz + 3 Kohle); mine_runite 6.500 ms
- Pro Amulett: craft 8 s + Onyx(cut 5,5 + mine 8,8 = 14,3 s) + 2 Barren×(smelt 8,5 + 2×mine_runite 13 + 3×coal 12,6 = 34,1 s) = **90,5 s**
- 39,78/h × 1.600 = **~64.000 Gold/h real**

---

## 4. Echter Nebenbefund: Die Onyx-Kette ist *invertiert* (Beschaffung > Produkt)

Beim Durchrechnen fällt auf: **Rohonyx roh verkaufen schlägt das fertige Amulett.**

| Schritt | NPC-Verkauf | Gold/h wenn man hier stoppt |
|---|---|---|
| rough_onyx roh (mine_onyx_seam 8,8 s, value 560) | 280 | **114.545 g/h** |
| → cut_onyx → onyx (value 1.300) | 650 | — |
| → craft_onyx_amulet (value 3.200) | 1.600 | **64.000 g/h** (volle Kette) |

`rough_onyx` ist mit `value 560` (→ 280 Verkauf) bei nur 8,8 s Mining **überbepreist**: reines Onyx-Schürfen bringt **114k g/h** — besser als jedes Combat und fast Thieving-Niveau, und **fast 2× besser als das daraus gefertigte Amulett**. Das ist ein kleiner Skilling-Exploit *und* macht die Jewelcrafting-Kette ökonomisch sinnlos (man verschlechtert sich durchs Weiterverarbeiten). **Das ist der eigentliche kleine P1.2-Rest** — nicht das Schmieden.

---

## 5. Empfehlung

### 5a. Godiron/Aetherium-Schmieden: **KEINE Änderung nötig** (P1.2-Hauptteil entschärft)
Reale Marge 75–88k = Combat-Niveau, unter Thieving/Dungeon. Die min-maxer-Wahrnehmung „28× Combat" beruht 100 % auf dem Harness-Bias (voller value + infinite inputs). **Empfehlung: kein Nerf.** Stattdessen in `min-maxer.md`/Synthese vermerken, dass die Messung den NPC-`SELL_FRACTION` und die Beschaffungszeit ignorierte.

> Optionale Mikro-Politur (nur falls man die Schmiede-Marge bewusst *unter* den Dungeon-Loop drücken will — niedrige Prio): `rough_onyx`-artige Überbepreisung gibt es bei Metall **nicht** (ore→bar→blade steigt monoton sinnvoll). Hier ist nichts zu tun.

### 5b. Onyx-Kette glätten (echter, kleiner Befund — empfohlen, niedrige Prio)
Ziel: Rohonyx-Schürfen soll **nicht** das fertige Amulett dominieren, und die Jewelcrafting-Kette soll monoton aufwärts gehen (kein „Weiterverarbeiten verschlechtert").

**Sauberste Stellschraube: `rough_onyx.value` senken** (Output-Werte der Amulette unangetastet lassen — die sind als Gear fair).

| Item | Feld | Vorher | Nachher (Ziel) | Begründung |
|---|---|---|---|---|
| `rough_onyx` | value | 560 | **240** | Mining-only fällt von 114k auf ~49k g/h — in Linie mit mine_godiron (42k). Roh-Mat soll Roh-Mat-Niveau haben. |
| `onyx` (geschliffen) | value | 1.300 | **900** | hält cut_onyx als sinnvollen +Schritt (450 Verkauf > 120 roh), ohne den Roh-Sprung zu groß zu machen. Optional. |

Effekt auf die Amulett-**Kette** (Output-value 3.200 bleibt): Voll-Ketten-Netto bleibt ~64k g/h (Output unverändert), aber **Rohonyx-Schürfen fällt unter die Kette** → Weiterverarbeiten lohnt sich wieder, Monotonie hergestellt. Kein anderes Rezept nutzt `rough_onyx` außer cut_onyx (geprüft: nur mine-Drops + cut_onyx referenzieren es).

> Falls content-dev `onyx.value` senkt, prüfen ob `onyx` noch in anderen Rezepten als Input dient (z. B. craft_onyx_ring, soul_amulet-Kette ~Zeile 3110) — dort steigt dann der reale Netto leicht; unkritisch.

### 5c. Falls man Crafting *bewusst* unter Combat halten will (NICHT empfohlen, nur Referenz)
Wollte man die Schmiede-Marge halbieren, wäre **`SELL_FRACTION` global zu senken die falsche Stellschraube** (trifft auch Loot-Verkauf/Combat-Gold). Korrekt wäre dann ein **per-Item-Sell-Cap für High-Tier-Gear** (neues Feld, logic-dev) — aber dafür gibt es nach dieser Analyse **keinen Bedarf**.

---

## 6. Nebenbefund P2.6 — Combat-Gold zu flach (Richtgröße)

Sekundär, nur grobe Zielgröße (kein Voll-Audit hier):

- **Ist:** Lv14-Goblin ≈ Lv120-Boss, nur **~1,6× Gold/h-Spread** (min-maxer.md §4). Optimierung lohnt nicht → „warum aufsteigen?".
- **Ziel:** Top-Mob soll **~3–5× Gold/h** des Einstiegs-Mobs liefern (gestaffelt über `goldDrop`/Kill bzw. exklusive wertvolle Drops auf High-Tier-Mobs).
- **Konkret als Richtgröße:** Wenn Einstiegs-Mob ~X g/Kill bei gegebener Kill-Zeit liefert, soll der Top-Mob bei vergleichbarer Kill-Zeit ~3,5–4× X liefern. Das gehört in einen separaten **Combat-Gold-Spread-Audit** (eigenes Spec, da pro-Mob `goldDrop` × Kill-Rate über die ganze Mob-Leiter zu tabellieren ist). **Aktion: eigenes Folge-Ticket an balance-designer/content-dev**, nicht Teil dieses P1.2-Audits.

---

## 7. Apply-Liste für content-dev (geordnet)

1. **(empfohlen, niedrige Prio)** `packages/content/src/index.ts`, Item `rough_onyx`: `value: 560` → `value: 240`.
2. **(optional)** Item `onyx`: `value: 1300` → `value: 900` (nur wenn man die Onyx-Stufe glätten will; prüfe Folge-Effekt auf craft_onyx_ring / soul_amulet).
3. **(keine Code-Änderung)** Godiron-/Aetherium-Schmieden: **nichts ändern** — Marge ist fair. In `_synthesis.md` P1.2 als „validiert/entschärft" markieren (Harness-Bias: voller value statt ×0,5 + infinite inputs).
4. **(separates Ticket)** P2.6 Combat-Gold-Spread auf ~3–5× spreizen — eigener Folge-Audit.
