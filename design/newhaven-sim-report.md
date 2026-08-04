# New Haven — Sim-Testbericht (Task #362)

*Balance-Designer, 2026-07-27. Alle Zahlen aus ECHTEN Engine-Läufen (vitest-Wegwerf-Harness gegen
`packages/engine/src/{camp,refine,tick,shop,bank,slayer,sim,sim-realistic}.ts` und den Live-Katalog
`packages/content/src/index.ts`, Stand heute). Papier-Rechnungen sind als solche markiert.*

**ANKER-ÄNDERUNG mitten im Lauf (Chef-Entscheid 27.07.):** New Haven ist **ab Spielstart**
verfügbar, nicht ab Kapitel 4. §1 ist auf diesen Anker neu gerechnet; §2–§6 gelten unverändert.

---

## 0. Kurzfassung für den Chef

| Befund | Schwere |
|---|---|
| **Schmelzofen ist tot**: die 1-Input-Regel lässt nur `smelt_copper` + `smelt_iron` zu — 12 von 14 Schmelzrezepten brauchen Kohle als 2. Input. Die Anlage kann NUR Eisen-/Kupferbarren. | **P1 — Never-Build** |
| **Schrein der Stillen**: 108.545 g Gesamtkosten für **+0,56 % Durchsatz im Wochenmittel** (gemessen). Schlechtestes Nutzen-pro-Gold um Faktor 20–90. | **P1 — Never-Build** |
| **Vor-Kapitel-9-Loch**: Zentralhaus I gibt 4 Bauplätze; Stufe II jedes Gebäudes braucht Zentralhaus II (chronicle_09). Das komplette Lager eines Spielers vor K9 = **4 Gebäude, 1,67 h Bauzeit, 3.900 g** — danach ist der Bautrupp arbeitslos. Mit Start-Freischaltung klafft dieses Loch über K1–K9. | **P1 — Pacing** |
| **Wachturm + Schmelzofen Stufe I** brauchen `slag_carapace` — einzige Quelle: Slayer-Turm Etage 3 (**Slayer 40**). Zwei „Stufe-I"-Gebäude sind faktisch Midgame. | **P2** |
| Voll-Ausbau = **456 h Spielzeit** (Schreibzelt zuerst) = **41–57 Kalendertage** für die 1×/Tag-Zielgruppe. | **P2** |
| Material-/Gold-Senke ist zu klein: gesamtes Lager = **945.946 g ≈ 7–10 h Band-III-Einkommen**, Materialbeschaffung **14,3 h** gegen **456 h** Bauzeit (1 : 32). Die Senken-Absicht gegen den Bank-Druck wird verfehlt. | **P2** |
| Die 5 Sammel-/Diebeskunst-Gebäude amortisieren in **3–16 h** — sauber gebaut, klare Must-Builds. | ✓ |
| Räucherhaus funktioniert (27 von 46 Kochrezepten), liefert 480 Stück/8-h-Nacht. | ✓ |

---

## 1. Erreichbarkeit ab SPIELSTART (neu angekert)

### 1.1 Zeit von Level 1 bis zum jeweiligen Tor (gemessen, Bestfall-Grind)

| Tor | Zeit L1 → Ziel | Route (gemessen) |
|---|---|---|
| Holzfällen 10 (`oak_log`) | **0,25 h** | cut_normal_tree → cut_birchwood_tree |
| Diebeskunst 12 (`cutpurse_trinket`) | **0,50 h** | pickpocket_beggar → pickpocket_drunkard |
| Smithing 20 (`steel_bar`) | 0,58 h* | forge_copper_dagger → recycle_scrap → forge_iron_maul |
| Diebeskunst 20 (`ledger_page`) | 0,83 h | + fence_trinket |
| Sammeln 25 (`bloodbeet_seed`) | 0,83 h | forage_dim_essence → … → forage_umber_pods |
| Sammeln 27 (`essence_mire`) | 0,92 h | dito |
| **Holzfällen 30 (`blackwood_log`)** | **1,17 h** | … → cut_grimwood_tree |
| Fischen 30 (`raw_ironscale_bass`) | 1,17 h | catch_shrimp → … → catch_shadowcarp |
| Bergbau 15 (`coal`) | 0,42 h | mine_copper → mine_iron |

\* Verarbeitungs-Inputs geschenkt ⇒ untere Schranke; real kommt die Erz-Beschaffung obendrauf.

**Gold ist kein Tor.** Gemessene Früh-Einkommen: `pickpocket_beggar` (L1) **7.636 g/h**,
`pickpocket_merchant` (L12) 14.729 g/h, `mine_garnet_seam` (L15) 20.680 g/h.
⇒ Die 500 g fürs Zentralhaus sind in **3,9 Minuten** verdient; **alle 15 Stufe-I-Gebäude zusammen
(29.800 g) in 1,4–4 h**.

### 1.2 Erreichbarkeits-Tabelle je Gebäude, Stufe I (härtestes Tor, gemessen)

| Gebäude | Gold | Bauzeit | Härtestes Tor | ab Start erreichbar in |
|---|---|---|---|---|
| `camp_townhall` | 500 | 0,17 h | Holzfällen 10 (`oak_log`×20) | **~0,3 h** ✅ |
| `camp_fence_tent` | 1.000 | 0,50 h | Diebeskunst 12 (`cutpurse_trinket`×15) | ~0,5 h ✅ |
| `camp_seed_garden` | 600 | 0,25 h | Sammeln 25 (`bloodbeet_seed`×15) | ~0,9 h ✅ |
| `camp_trade_post` | 3.000 | 1,00 h | Diebeskunst 20 (`ledger_page`×10) | ~0,9 h ✅ |
| `camp_warden_shrine` | 4.000 | 2,00 h | Sammeln 27 (`essence_mire`×25) | ~1,0 h ✅ |
| `camp_sawpit` | 800 | 0,33 h | Holzfällen 30 (`blackwood_log`×80) | ~1,2 h ✅ |
| `camp_mine_adit` | 800 | 0,33 h | Holzfällen 30 (`blackwood_log`×60) | ~1,2 h ✅ |
| `camp_storehouse` | 1.500 | 0,50 h | Holzfällen 30 (`blackwood_log`×50) | ~1,2 h ✅ |
| `camp_scrivener_tent` | 2.000 | 1,00 h | Holzfällen 30 (`blackwood_log`×40) | ~1,2 h ✅ |
| `camp_smokehouse` | 1.800 | 0,75 h | Holzfällen 30 (`blackwood_log`×60) | ~1,2 h ✅ |
| `camp_fishing_hut` | 800 | 0,33 h | Holzfällen 30 + Fischen 30 | ~1,5 h ✅ |
| `camp_workyard` | 3.000 | 2,00 h | Smithing 20 + Bergbau 15 (`steel_bar`×20) | ~1,5 h ✅ |
| `camp_trophy_wall` | 5.000 | 4,00 h | **Slayer 20** (`basilisk_scale`×20, NUR `gaze_basilisk` L22, Turm-Etage 2) | Midgame ⚠️ |
| `camp_watchtower` | 2.500 | 1,00 h | **Slayer 40** (`slag_carapace`×15, NUR `slag_abomination` L44, Turm-Etage 3) | **Midgame** ❌ |
| `camp_smelter` | 2.500 | 1,00 h | **Slayer 40** (`slag_carapace`×12, dito) | **Midgame** ❌ |

**Urteil:** 12 von 15 Stufe-I-Gebäuden sind in **≤ 1,5 h ab Spielstart** leistbar — die Doc-Erwartung
„Stufe I ≈ 1–2 h" stimmt und passt sogar besser zum neuen Start-Anker als zum alten K4-Anker.
Die Klemme sitzt an genau **einem** Material: `slag_carapace` (Wachturm + Schmelzofen) und
abgeschwächt `basilisk_scale` (Trophäenwand).

**Die Ironie:** Der **Wachturm** (Offline-Cap +1 h/Stufe) ist das Gebäude, von dem ein NEUER Spieler
am meisten hat — und es ist als einziges hinter Slayer 40 verriegelt.

### 1.3 Das Vor-Kapitel-9-Loch (gemessen)

`campBuildSlots` liefert **4 / 9 / 14** Plätze bei Zentralhaus I / II / III, bei **14**
Nicht-Zentralhaus-Gebäuden. Zentralhaus II hängt an `chronicle_09`, III an `chronicle_14`.
Stufe II jedes anderen Gebäudes verlangt Zentralhaus II (`startCampBuild` → `townhall_required`).

Gemessener Vollausbau eines Spielers VOR Kapitel 9 (Zentralhaus I + 4 frei gewählte Gebäude I):

```
Früh-Lager gesamt: 1.67 h Bauzeit, 3.900 g
Ertrags-Gewinn:  Holzfällen +5,3 %  Bergbau +5,9 %  Fischen +6,8 %  Diebeskunst +3,1 %
                 Sammeln +0,0 %     Handwerk +0,0 %  (Saatgarten/Werkhof nicht in der 4er-Wahl)
danach ist der Bautrupp bis Kapitel 9 ARBEITSLOS
```

Das komplette Lager-Erlebnis vor K9 ist damit **eine gute Stunde Bauzeit und ~4 % mehr Durchsatz**,
danach ein totes Feature über viele Spielstunden. Mit dem alten K4-Anker war das ein Kapitel Wartezeit;
mit Start-Freischaltung ist es die gesamte Frühphase.

### 1.4 Empfehlung zum Frühstart

**(c) „alles lassen" ist falsch, (a) breite Kostensenkung ist unnötig — es braucht 3 gezielte Eingriffe:**

1. **Bauplätze umverteilen: Zentralhaus +4/+5/+5 → +6/+4/+4** (Σ bleibt 14). Der Spieler baut in der
   ersten Sitzung 6 statt 4 Hütten; die Endsumme und der Guard `campCatalogMaxBoost` ändern sich nicht.
2. **Zentralhaus II von `chronicle_09` auf `chronicle_04` ziehen** (III bleibt `chronicle_14`).
   Damit gibt es wieder einen Kapitel-Rhythmus (Start → K4 → K14) statt eines Lochs über K1–K9.
   *Ohne diesen Schritt bleibt Stufe II jedes Gebäudes bis K9 gesperrt — das ist der eigentliche Killer,
   nicht die Bauplätze.*
3. **Zwei Material-Tausche gegen die Slayer-Turm-Sperre** (Stufe I muss ohne Turmzugang gehen):
   - `camp_watchtower` I: `slag_carapace` ×15 → `blackwood_log` ×40 (Holzfällen 30, thematisch: Holzturm)
   - `camp_smelter` I: `slag_carapace` ×12 → `bronze_bar` ×20 (Smithing 5)
   - `camp_trophy_wall` I: `basilisk_scale` ×20 **bleibt** — Slayer 20 an der Slayer-Wand ist stimmig.

**Empfohlene erste Bauempfehlung im Spiel (für die UI):**
`camp_townhall` I — 500 g + `oak_log` ×20, Bauzeit 10 Min, **ab ~20 Minuten Spielzeit leistbar**.
Danach als erste freie Wahl `camp_fence_tent` (Diebeskunst ist mit 7.600–17.600 g/h die stärkste
Frühgame-Goldquelle, und das Hehlerzelt hat mit **3,0 h** die schnellste Amortisation im ganzen Lager).

---

## 2. Amortisations-Ranking (gemessen, isoliert je Gebäude)

Methode: Gold/h einer Referenz-Aktion mit **nur diesem einen Gebäude auf Stufe III** gegen einen
lagerlosen Spielstand, 1 h Spielzeit je Messung, Erträge zu `effectiveSellPrice`.
Kosten = Gold aller 3 Stufen + Material zum Verkaufswert (konservativ).

| # | Gebäude | Kosten gesamt | gemessener Nutzen | Amortisation | Urteil |
|---|---|---|---|---|---|
| 1 | `camp_fence_tent` | 30.210 g | +10.237 g/h (`pickpocket_noble`, +14,6 %) | **3,0 h** | **Must-Build** |
| 2 | `camp_mine_adit` | 39.900 g | +6.294 g/h (`mine_runite`, +21,5 %) | **6,3 h** | **Must-Build** |
| 3 | `camp_sawpit` | 40.540 g | +5.551 g/h (`cut_ironbark_tree`, +18,5 %) | **7,3 h** | **Must-Build** |
| 4 | `camp_seed_garden` | 20.175 g | +2.721 g/h (`forage_grave_essence`, +14,3 %) | **7,4 h** | **Must-Build** |
| 5 | `camp_fishing_hut` | 39.660 g | +2.484 g/h (`catch_lobster`, +22,3 %) | **16,0 h** | **Must-Build** |
| 6 | `camp_smokehouse` | 64.270 g | 480 Stück/8-h-Nacht = **28.800 g/Nacht** (`cook_anglerfish`) | **2,2 Nächte** | **Must-Build** |
| 7 | `camp_watchtower` | 83.690 g | +3 h Offline-Gutschrift/Tag ≈ +90.000 g/Tag im Band II | **< 1 Tag** (1×/Tag-Spieler) / **nie** (Dauerspieler) | **Must-Build** (Zielgruppe) |
| 8 | `camp_scrivener_tent` | 64.555 g | spart **160,1 h** Bauzeit (gemessen) | 403 g je gesparter Bau-Stunde | **Must-Build (zuerst)** |
| 9 | `camp_storehouse` | 46.445 g | +14 Bank-Plätze; Shop-Gegenwert **9.100 g** (0 gekauft) … **390.842 g** (80 gekauft) … **2,56 Mio** (120) | früh schwach, später zwingend | **situativ → Must** |
| 10 | `camp_townhall` | 30.025 g | keiner (schaltet Bauplätze frei) | — | **Pflicht** |
| 11 | `camp_trade_post` | 84.770 g | +6.368 g/h (Holz) / +2.259 g/h (Erz) / **+480 g/h (Diebeskunst!)** | 13 h … 176 h | **situativ** |
| 12 | `camp_workyard` | 87.740 g | +2.920 g/h (`smelt_titanium`, +13,0 %) — dafür über 6 Skills | 31,6 h je Skill | **situativ** |
| 13 | `camp_trophy_wall` | **133.435 g** | nur Slayer-Punkte (+30 %): ~12 → ~15,6 P/h; `slayer_helm` 650 P von ~50 h auf ~38 h | nur für Slayer-Spieler | **situativ** |
| 14 | `camp_smelter` | 71.986 g | **nur `smelt_copper`/`smelt_iron`** — 480 Eisenbarren/8-h-Nacht = 3.840 g brutto, ~1.700 g Marge | **19–42 Tage** | ❌ **NEVER-BUILD** |
| 15 | `camp_warden_shrine` | 108.545 g | **+0,56 % Durchsatz im Wochenmittel** (gemessen) | **174 h im Top-Band, 646 h im Band II** | ❌ **NEVER-BUILD** |

### 2.1 Never-Build #1 — Schmelzofen (`camp_smelter`)

Gemessen über `isRefineRecipe`:

```
SCHMELZOFEN:  2 von 14 smelt_*-Rezepten nutzbar
  JA   smelt_copper   L 1  inputs=copper_ore x1
  JA   smelt_iron     L10  inputs=iron_ore x1
  NEIN smelt_steel    L20  inputs=iron_ore x1 + coal x1
  NEIN smelt_runite   L55  inputs=runite_ore x2 + coal x3
  NEIN smelt_titanium L75  inputs=titanium_ore x2 + coal x4
  … (alle 12 übrigen scheitern an der 1-Input-Regel: sie brauchen Kohle)
```

**Ursache:** `refine.ts` `isRefineRecipe` verlangt `action.inputs.length === 1` — wörtlich aus
`encampment-balance.md` §4.1 („1-Input-Basisrezepte"). Die Spezifikation hat übersehen, dass in
diesem Katalog **jedes** Schmelzrezept ab Stahl Kohle als zweiten Input hat. Der Räucherhaus-Zweig
funktioniert nur deshalb, weil Fisch-/Fleischgerichte tatsächlich 1-Zutat-Rezepte sind
(27 von 46 nutzbar, inkl. `cook_soulfish` L97 und `cook_voidray` L85).

**Folge:** Ein Spieler baut für 65.000 Gold + 6.986 g Material eine Anlage, die ihm 480
**Eisenbarren** pro Nacht produziert — Material aus dem Level-10-Band. Für jeden Spieler, der das
Gebäude überhaupt bezahlen kann, ist der Ertrag wertlos. Das ist ein reiner Design-Fehler,
keine Balance-Frage.

**Empfehlung (Regel-Fix, logic-dev):** Eligibilität von „genau 1 Input" auf
**„genau 1 Nicht-Kohle-Hauptinput"** ändern (`coal` als zulässiger Zusatz-Input whitelisten).
Damit werden alle 14 Schmelzrezepte nutzbar, der Determinismus bleibt unberührt (kein RNG-Zug,
Output weiterhin `min === max`, `chance >= 1`). Der Envelope-Guard bleibt gültig.

### 2.2 Never-Build #2 — Schrein der Stillen (`camp_warden_shrine`)

Gemessen an einem `ashenstorm`-Dienstag (2026-07-28):

```
cut_shadowpine_tree   ohne Segen 7000 ms | Segen ohne Schrein 6087 ms (+15,0 %)
                      Schrein I 6009 ms | Schrein III 5858 ms
  ⇒ Schrein-III-Zugewinn NUR am Segenstag: +3,91 %
  ⇒ über die Woche gemittelt:              +0,558 %
```

Jeder Segen läuft **einen Wochentag von sieben** (`blessing.ts` `WEEKDAY_BLESSING`). Der Schrein
verstärkt den Bonus-ANTEIL um bis zu 30 % — bei einem 15-%-Segen sind das 4,5 Prozentpunkte, einen
Tag lang. Über alle sechs verstärkten Segen (wildhunt ist per Chef-Entscheid K2 ausgenommen) landet
man bei rund **+0,5 bis +0,7 % gemittelter Wirkung — für 108.545 g.**

Zum Vergleich: die Sägegrube kostet 40.540 g und liefert **+18,5 %, permanent**.
Das Nutzen-pro-Gold der Sägegrube ist ~90-mal besser.

**Empfehlung:** Der Effekt ist durch `CAMP_BLESSING_BOOST_CAP = 0.30` und den Envelope-Guard
gedeckelt — bleibt also nur der Preis. **Gold I/II/III: 4.000 / 20.000 / 80.000 → 1.500 / 7.500 / 30.000**
(Σ 104.000 → 39.000). Damit wird der Schrein ein günstiges Flavour-/Sammler-Gebäude statt einer Falle.
Alternative, falls der Chef den Preis behalten will: Schrein zusätzlich die Segens-DAUER verlängern
lassen (z. B. Stufe III = Segen wirkt 2 Tage) — das ist aber eine neue Mechanik, kein Zahlen-Edit.

---

## 3. Bauzeit-Pacing am EINEN Bautrupp

Gemessen mit dem echten `startCampBuild`/`tickCampBuild` (Gold + Material unbegrenzt, damit rein die
Bauzeit misst; Sprung exakt auf Job-Ende).

| Strategie | Voll-Ausbau (Spielzeit) | vom Schreibzelt gespart |
|---|---|---|
| Katalog-Basis, kein Schreibzelt | **616,2 h** | — |
| **Schreibzelt zuerst** | **456,1 h** | 160,1 h |
| Schreibzelt zuletzt | 523,6 h | 92,6 h |

Stufen-Summen (Katalog): Stufe I **15,16 h**, Stufe II **145 h**, Stufe III **456 h**.

### 3.1 Kalenderzeit — der eigentliche Befund

Der Bautrupp tickt in Spielzeit; offline zählt nur das Aufhol-Fenster
(`MAX_OFFLINE_MS` 8 h, mit Wachturm III 11 h — gemessen bestätigt: 8 → 9 → 11 h).

| Gutschrift/Kalendertag | Voll-Ausbau |
|---|---|
| 24 h (Dauerspieler) | 19,0 Tage |
| 16 h (2×/Tag) | 28,5 Tage |
| 11 h (1×/Tag **mit** Wachturm III) | **41,5 Tage** |
| 8 h (1×/Tag ohne Wachturm) | **57,0 Tage** |

Die Doc-Angabe „~19 Tage reine Bauzeit" gilt nur für den 24/7-Spieler. Für die Retention-Zielgruppe
(1×/Tag) sind es **8 Wochen** — und das parallel zu allem anderen Content.

### 3.2 Wie fühlt sich die erste Woche an?

Gemessene Timeline (Schreibzelt zuerst, Spielzeit-Stunden):

```
  0,00 →  0,17  camp_townhall        I     dicht getaktet:
  0,17 →  1,17  camp_scrivener_tent  I     10 Bauten in den ersten 13 h
  1,17 →  2,07  camp_watchtower      I
  2,07 →  2,52  camp_storehouse      I
  2,52 →  2,82  camp_fishing_hut     I
  2,82 → 10,02  camp_townhall        II   ← 7,2-h-Block, Bautrupp gebunden
 10,02 → 13,09  sawpit/mine/garden/fence/workyard I
 13,09 → 75,89  9× Stufe II, EINER nach dem anderen (4,8–12,8 h je Bau)
 75,89 → 95,09  camp_townhall        III  ← 19,2-h-Block, NICHTS anderes baubar
 95,09 → …      die letzten 5 Gebäude überhaupt erst auf Stufe I
```

**Urteil erste Woche: vorne zu dicht, hinten zu leer.**
- Die **gesamte Stufe I ist nach 13 Spielstunden durch** — bei einem 1×/Tag-Spieler also nach
  Tag 1–2. Der „Aufbau"-Moment des Features ist nach einer Sitzung vorbei.
- Ab Stunde 13 läuft **immer genau ein langer Bau**, ohne Entscheidung, ohne Stau, ohne Wahl.
  Kein Leerlauf im Sinne von „nichts zu tun", aber auch keine Interaktion mehr.
- Zwei echte Blockaden: Zentralhaus II (7,2 h) und Zentralhaus III (**19,2 h**), in denen der
  einzige Bautrupp gebunden ist und **fünf Gebäude noch nicht einmal existieren**
  (`camp_smelter`, `camp_smokehouse`, `camp_trophy_wall`, `camp_warden_shrine`, `camp_trade_post`
  starten erst nach Stunde 95).
- Unter dem NEUEN Start-Anker verschärft sich das: siehe §1.3 — vor K9 sind es 4 Gebäude und
  1,67 h Bauzeit, dann Stillstand.

### 3.3 Schreibzelt — Hauptgebäude-Falle?

**Ja, mathematisch strikt dominant.** Schreibzelt I kostet 2.000 g + 1 h Bauzeit und schneidet
10 % von den verbleibenden ~615 h ⇒ **~61 h gespart für 1 h Einsatz (Verhältnis 60 : 1).**
Über alle drei Stufen: 160,1 h gespart, Gesamt-Ausbau 523,6 h → 456,1 h (**−12,9 %**).

**Ist das ein Problem?** *Gemildert.* Es ist keine echte Falle, weil die „falsche" Wahl nicht
bestraft: Bauzeit ist in der Frühphase NICHT die bindende Ressource (das sind Kapitel-Tore und
Bauplätze), und wer stattdessen die Sägegrube zuerst baut, bekommt sofort +5 % Durchsatz. Der
Verlust ist erst im Endausbau spürbar.

**Empfehlung: so lassen, aber sichtbar machen.** Ein Hinweistext am Schreibzelt („verkürzt alle
künftigen Bauten") verwandelt eine versteckte Optimierungspflicht in eine bewusste Entscheidung.
Kein Zahlen-Eingriff nötig. (Korrekt umgesetzt ist bereits, dass `startCampBuild` die Verkürzung
nur auf NEUE Jobs anwendet — kein rückwirkender Exploit.)

---

## 4. Gemessener Gewinn

### 4.1 Fixes Verhalten — die belastbare Messung

Identische Aktion, identisches Skill-Level, 1 h Spielzeit, nur der Lager-Zustand variiert.
„Woche 1" = alle Kern-Gebäude Stufe II (setzt Zentralhaus II voraus, s. §1.3).

| Aktion | Skill | ohne | Woche 1 | Voll (III) | +Wo1 | +voll | Dauer ohne → voll |
|---|---|---|---|---|---|---|---|
| `cut_blackwood_tree` | Holzfällen | 866 | 967 | 1.031 | +11,7 % | **+19,1 %** | 4.555 → 3.860 ms |
| `cut_shadowpine_tree` | Holzfällen | 796 | 888 | 952 | +11,6 % | +19,6 % | 5.909 → 5.006 ms |
| `mine_coal` | Bergbau | 972 | 1.089 | 1.159 | +12,0 % | +19,2 % | 4.030 → 3.415 ms |
| `mine_murkvein` | Bergbau | 723 | 816 | 868 | +12,9 % | +20,1 % | 5.947 → 5.047 ms |
| `catch_lobster` | Fischen | 484 | 555 | 592 | +14,7 % | **+22,3 %** | 6.841 → 5.796 ms |
| `catch_anglerfish` | Fischen | 473 | 542 | 579 | +14,6 % | +22,4 % | 7.597 → 6.436 ms |
| `pickpocket_tax_collector` | Diebeskunst | 870 | 911 | 1.020 | +4,7 % | +17,2 % | 3.838 → 3.252 ms |
| `pickpocket_city_guard` | Diebeskunst | 59 | 60 | 63 | +1,7 % | **+6,8 %** | 3.986 → 3.247 ms |
| `forage_ashfields` | Sammeln | 714 | 751 | 826 | +5,2 % | +15,7 % | 3.099 → 2.723 ms |
| `forage_nightbloom` | Sammeln | 672 | 699 | 770 | +4,0 % | +14,6 % | 6.038 → 5.297 ms |
| `smelt_titanium` | Schmieden | 517 | 535 | 575 | +3,5 % | +11,2 % | 8.688 → 7.893 ms |
| `cook_anglerfish` | Kochen | 635 | 658 | 703 | +3,6 % | +10,7 % | 7.058 → 6.145 ms |

**Nebenbefund:** `pickpocket_city_guard` bekommt −18,5 % Dauer, aber nur **+6,8 % Ertrag** — bei
Diebeskunst-Aktionen mit `successBase`/`stunMs` frisst die unveränderte Betäubungszeit den Großteil
des Tempo-Bonus. Der Lager-Bonus ist bei riskanten Diebeskunst-Aktionen also spürbar schwächer, als
die Prozentzahl im Gebäude verspricht. Nicht falsch, aber erwähnenswert für die UI-Beschreibung.

Weitere gemessene Effekte (Voll-Lager):
- **Bank:** 60 → 74 Plätze (+14 ✓)
- **Offline-Fenster:** 8 h → 11 h ✓
- **Verkauf:** `runite_bar` 80 → 85 g, `titanium_bar` 130 → 138 g (+6,2 % ✓);
  `crude_bone` 2 → 2 g (Rundungsboden — Billig-Items profitieren gar nicht)
- **Reifezeit (Saatgarten):** ×0,88 auf alle Crops ✓

### 4.2 Adaptive Paar-Läufe — nur als Richtungssignal

`RealisticPlayer`, gleiche Seeds, melee, einmal ohne Lager / einmal mit Woche-1-Lager
(10 Gebäude Stufe II + Räucherhaus-Rezept):

| Lauf | Gold | Gesamt-XP | Gesamtlevel | Kills |
|---|---|---|---|---|
| 24 h Seed 7 | +148,0 % | +20,5 % | 169 → 159 | 801 → 5.128 |
| 24 h Seed 23 | +100,2 % | +411,1 % | 234 → 221 | 2.249 → 1.711 |
| 24 h Seed 41 | +63,1 % | +9,3 % | 226 → 248 | 784 → 720 |
| 72 h Seed 7 | +80,2 % | +115,3 % | 315 → 313 | 2.177 → 13.654 |
| 72 h Seed 23 | +43,0 % | +179,5 % | 335 → 350 | 5.626 → 2.355 |
| 72 h Seed 41 | +46,5 % | +79,8 % | 343 → 365 | 12.193 → 2.191 |

**Diese Zahlen taugen NICHT zur Bewertung der Lager-Stärke.** Die Kill-Zahlen kippen um Faktor 6 in
beide Richtungen und das Gesamtlevel sinkt in der Hälfte der Läufe trotz mehr Gold — der bekannte
Entscheidungsbaum-Drift. Verwertbar ist nur die Richtung: **Gold ist in 6 von 6 Paaren höher
(+43 % bis +148 %)**, was zum gemessenen Sell-Bonus + Durchsatz passt, aber überzeichnet.
**Maßgeblich bleibt §4.1: +10 % bis +22 % je nach Skill.**

---

## 5. Veredelung im Realitätscheck

### 5.1 Rate gegen aktives Handwerk (gemessene Aktiv-Raten)

| Stufe | Rate | Anteil an `smelt_godiron` (450/h) | Anteil an `cook_soulfish`-Klasse | Anteil an `smelt_iron` (1.260/h) |
|---|---|---|---|---|
| I | 20/h | 4,4 % | ~3 % | 1,6 % |
| II | 40/h | 8,9 % | ~6 % | 3,2 % |
| III | 60/h | **13,3 %** | ~9 % | 4,8 % |

Die ≤-30-%-Leitplanke aus `encampment-balance.md` §4 hält mit großem Abstand — **zu großem**:
die Doc rechnete mit `smelt_godiron` = 300/h, gemessen sind es 450/h, der Anteil ist also noch
kleiner als geplant.

### 5.2 Input-Hunger — die Doc-Annahme ist widerlegt

| Abbau-Aktion | gemessener Zufluss | deckt Stufe III (60/h) für |
|---|---|---|
| `mine_iron` | 1.136 Erz/h | **18,9 h** je Farm-Stunde |
| `mine_coal` | 972/h | 16,2 h |
| `mine_runite` | 739/h | 12,3 h |
| `mine_titanium` | 730/h | 12,2 h |

`encampment-balance.md` §4 behauptet: *„die Anlage ist input-limitiert und kann aktives Spiel nicht
ersetzen."* **Das stimmt nicht.** Eine einzige Stunde Bergbau füttert 12–19 Stunden Veredelung.
Da das Offline-Fenster maximal 11 h beträgt, kann die Anlage **nie mehr als ~660 Stück/Tag**
verarbeiten — weniger als eine Stunde Farmen liefert. Sie ist **raten-limitiert, nicht input-limitiert**.
Der Vorrat läuft also nie leer; die Anlage ist stattdessen einfach sehr langsam.

### 5.3 Echter Offline-Ertrag (gemessen über `tickCampRefine`)

| Rezept | Stufe I (8 h) | Stufe II (8 h) | Stufe III (8 h) | Stufe III (24 h) |
|---|---|---|---|---|
| `smelt_iron` | 160 Stk / 1.280 g | 320 / 2.560 g | 480 / **3.840 g** | 1.440 |
| `cook_crypteel` | 160 / 7.040 g | 320 / 14.080 g | 480 / **21.120 g** | 1.440 |
| `cook_anglerfish` | 160 / 9.600 g | 320 / 19.200 g | 480 / **28.800 g** | 1.440 |
| `smelt_runite` | — | — | **NICHT VEREDELBAR** | — |

**Urteil:**
- **Räucherhaus: spürbar, kein Deko.** 480 Stück Hochtier-Fisch pro Nacht sind ~28.800 g plus
  echtes Kampf-Essen, das man sonst aktiv kochen müsste. Amortisiert in 2,2 Nächten. ✅
- **Schmelzofen: reine Deko und schlimmer — eine Falle.** Er kann nur Eisen/Kupfer (§2.1).
  480 Eisenbarren pro Nacht sind für jeden Spieler, der 65.000 Gold übrig hat, wertlos. ❌

---

## 6. Ökonomie-Gesamtbild

| Stufe | Gold direkt | Material (Verkaufswert) | Summe |
|---|---|---|---|
| I | 29.800 g | 11.776 g | 41.576 g |
| II | 149.000 g | 43.790 g | 192.790 g |
| III | 601.000 g | 110.580 g | 711.580 g |
| **Gesamt** | **779.800 g** | **166.146 g** | **945.946 g** |

Gemessene Einkommen zum Vergleich: `raid_tax_vault` (Diebeskunst L85) **91.920 g/h**,
`cut_shadowpine_tree` (L70) **111.678 g/h**, `pickpocket_noble` (L65) 70.168 g/h.

⇒ **Das gesamte New Haven kostet 7–10 Stunden Band-III-Einkommen.** Als Gold-Senke gegen den
bekannten Bank-Druck ist das **zu klein**.

Die Material-Seite ist noch schwächer. Größte Mengen-Senken und ihre gemessene Beschaffungszeit:

| Material | Gesamtmenge | gemessener Ertrag | Beschaffungszeit |
|---|---|---|---|
| `ironbark_log` | 630 | 853/h | 44 min |
| `blackwood_log` | 330 | 866/h | 23 min |
| `shadowpine_log` | 310 | 796/h | 23 min |
| `coal` | 310 | 972/h | 19 min |
| `scarred_hide` | 180 | 108/h | 1 h 40 |
| `raw_hide` | 100 | 567/h | 11 min |
| `crude_bone` | 40 | 1.026/h | 2 min |

**Gesamte Materialbeschaffung für alle 45 Bau-Aufträge: 14,3 h** (Stufe I 2,3 h · II 6,4 h · III 5,7 h)
— gegen **456 h Bauzeit**. Verhältnis **1 : 32**.

**Urteil:** New Haven saugt praktisch nichts aus der Wirtschaft. Die im Konzept anvisierten
„Bank-Druck-Materialien" (`raw_hide`, `crude_bone`, `coal`, Niedrig-Logs, `stolen_coinpurse`) werden
in Mengen von 2–20 Minuten Farmzeit abgefragt — das entlastet keine Bank. Das Lager ist heute ein
reines **Warte**-Feature, kein **Wirtschafts**-Feature. Wenn die Senken-Wirkung gewollt ist, müssen
die MATERIALMENGEN steigen (Faktor 5–10 auf die Bank-Druck-Materialien), nicht das Gold.

---

## 7. Die 3 wichtigsten Zahlen-Korrekturen (2-Minuten-Chef-Entscheid)

| # | Was | Alt | Neu | Warum |
|---|---|---|---|---|
| **1** | **Schmelzofen-Rezept-Regel** (`refine.ts` `isRefineRecipe`) | „genau 1 Input" ⇒ 2 von 14 Rezepten | „genau 1 **Nicht-Kohle**-Input" ⇒ 14 von 14 | Ohne das ist ein 72.000-g-Gebäude tot (kann nur Eisen/Kupfer). Kein RNG, kein XP, Determinismus & Guards unberührt. |
| **2** | **Schrein-Gold** `camp_warden_shrine` I/II/III | 4.000 / 20.000 / 80.000 | **1.500 / 7.500 / 30.000** | Gemessen +0,56 % Wochenmittel für 108.545 g. Der Effekt ist vom Guard gedeckelt — nur der Preis kann sich bewegen. |
| **3** | **Frühstart-Paket** (Chef-Entscheid „ab Spielstart") | Zentralhaus-Slots +4/+5/+5 · Zentralhaus II an `chronicle_09` · `slag_carapace` in Wachturm I + Schmelzofen I | Slots **+6/+4/+4** (Σ 14 bleibt) · Zentralhaus II an **`chronicle_04`** · `slag_carapace` → **`blackwood_log` ×40** (Wachturm I) bzw. **`bronze_bar` ×20** (Schmelzofen I) | Sonst ist das Lager vor K9 nach 1,67 h Bauzeit fertig und tot, und zwei „Stufe-I"-Gebäude hängen hinter Slayer 40. |

**Nachrangig, aber empfohlen** (falls der Chef die Wirtschafts-Absicht ernst nimmt):
Mengen der Bank-Druck-Materialien ×5 (`raw_hide` 100→500, `crude_bone` 40→200, `coal` 310→1.500,
`stolen_coinpurse` 80→400, `essence_ash` 40→200). Das kostet den Spieler 1–2 h zusätzliche Farmzeit
über das gesamte Lager und macht die Senke erstmals spürbar.

---

## 8. Was NICHT zu beanstanden ist (Gegenprobe)

- Der Envelope-Guard `camp-envelope.test.ts` hält: kein Tempo-Kind über seiner Klemme, Kampf-Skills
  exakt 0, B2-Boden 0,6647, Verkaufs-Klemme +15 %, Slayer-Klemme ×1,5, Bank +14, Offline +3 h —
  alle gemessen bestätigt.
- Ohne Lager ist jeder Boost exakt 0; die Sim-Baseline bleibt unberührt.
- Die 5 Sammel-/Diebeskunst-Gebäude sind sauber gebaut (Amortisation 3–16 h, Gewinn +14 bis +22 %).
- Räucherhaus, Wachturm, Vorratsspeicher, Schreibzelt liefern alle messbaren, ehrlichen Nutzen.
- Materialkosten Stufe I sind für einen frischen Charakter **kein** Problem (12 von 15 in ≤ 1,5 h) —
  die Start-Freischaltung passt zu den Stücklisten, mit den drei Ausnahmen aus §1.2.
