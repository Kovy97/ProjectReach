# New Haven als Ökonomie-Rückgrat — Ausbau-Brainstorm (Post-Vollausbau)

*Balance-Designer, 2026-08-03. Reines Design-Doc, kein Code, keine Änderung an bestehenden Docs.*
*Grundlagen: `design/encampment-konzept.md` (Eiserne Regeln), `design/encampment-balance.md` inkl. Nachtrag 03.08. (Bauteil-System), Katalog-Realität `packages/content/src/index.ts` (campBuildings-Block = maßgebliche Wahrheit; alle zitierten IDs verifiziert).*

---

## 0. Ausgangslage: Was der Vollausbau heute kostet und was danach passiert

Implementierter Stand (Katalog, nicht mehr das §2-Papier):

- **Gold-Senke gesamt:** Stufe I Σ 27 300 · Stufe II Σ 136 500 · Stufe III Σ 551 000 → **≈ 715 000 Gold** (Schrein wurde auf 1 500/7 500/30 000 gesenkt, Trophäenwand 100 000 blieb).
- **Bauteil-Senke obendrauf:** Σ 47 `timber_beam` / 140 `timber_brace` / 285 `timber_anchor`. Allein die Verankerungen ziehen `shadowpine_log` ×1 425 + `frost_pelt` ×570 + ~1,3 h reine Zimmer-Zeit — eine mehrstündige Kampf+Sammel-Kette.
- **Bauzeit:** Σ ≈ 26 Tage seriell (mit Schreibzelt III −30 % ≈ 18).
- **Einkommen dagegen:** Band III verdient **50–100 k Gold/h** (Verkaufswert, Sim). Ein Band-III-Spieler finanziert den kompletten Gold-Anteil in ~7–14 Spielstunden; der eigentliche Takt ist der Bautrupp.

**Das Loch danach:** Nach dem 15/15-Vollausbau versiegen drei Dinge gleichzeitig: (a) die einzige große wiederkehrende Gold-Senke, (b) die Nachfrage nach den Bank-Druck-Materialien (Häute, Logs, Essenzen, Diebesgut), (c) der „Komm-morgen-wieder"-Anker des Bautrupps. Gold und Materialien laufen dann ungebremst auf. Genau dieses Loch stopfen die folgenden Richtungen.

**Rahmen für alles Folgende (Eiserne Regeln, unverändert bindend):** kein neuer Wasserhahn, null neue Währungen, Boost-Budget hart (Tempo-Budget ist mit 23 von max. 25 Punkten B1 praktisch **erschöpft**), ein Bautrupp, Kosten = Senken, Kampf-Werte unberührt.

---

## 1. Richtung 1 — Veredelungs-Ausbau (dritter und vierter Offline-Veredler)

### 1a. Gerberei (Häute → Leder) — EMPFOHLEN

**Kernidee:** Drittes Offline-Veredelungs-Gebäude nach exakt dem Schmelzofen/Räucherhaus-Muster (Spezifikation encampment-balance §4 gilt 1:1): ein gewähltes, beherrschtes 1-Input-`tan_*`-Rezept, kein XP, kein RNG, Rate-gedeckelt. Damit ist die Trias der großen Materialströme komplett: Erz (Schmelzofen), Nahrung (Räucherhaus), **Häute (Gerberei)**.

**Nachfrage-Deckung ist REAL (Katalog-verifiziert):**
- Die `tan_*`-Familie existiert als aktive Leatherworking-Kette: cured (L5, `raw_hide`), `tan_hardened_leather` (L22, `scarred_hide` ×2), `tan_wyvern_scale` (L75, → `warhide` ×2). Die 2-Input-Elite-Gerbungen (`tan_dragonhide`: `basilisk_scale` ×8 + `warhide`) fallen durch die 1-Input-Regel automatisch raus — das beste Leder bleibt handgemacht, wie beim Kochen.
- Leder wird von ~30 Leatherworking-Ausrüstungs-Rezepten verbraucht (cured/hardened/scaled/studded-Sets, Warhide-Serie, Runewoven-Roben mit `warhide` ×2–4) plus von New Havens eigenen Stücklisten. Der Abnehmer ist die XP-Leiter selbst: Leatherworking 1→99 frisst Leder in Tausenden.
- `raw_hide` ist DAS Bank-Druck-Material Nr. 1 (Kuh 70 %, Aschratte/Schakal 50 %) — die Gerberei macht aus totem Bestand Vorprodukt für aktives Spiel.

**Zahlenskizze:**

| Stufe | Rate | Gold | Materialien (Vorschlag, IDs verifiziert) | Bauzeit |
|---|---|---|---|---|
| I | 20/h | 2 000 | `raw_hide` ×40, `blackwood_log` ×40, `timber_beam` ×3 | 45 min |
| II | 40/h | 10 000 | `scarred_hide` ×50, `ironbark_log` ×80, `timber_brace` ×9 | 8 h |
| III | 60/h | 40 000 | `warhide` ×12, `wyvern_scale` ×20, `shadowpine_log` ×60, `timber_anchor` ×18 | 24 h |

- Guard-Check Rate: langsamstes zulässiges 1-Input-Rezept ist `tan_wyvern_scale` (14 s = 257/h) → 60/h = **23 %** ≤ 30-%-Leitplanke ✓ (`tan_hardened_leather` 600/h → 10 %).
- Wasserhahn-Check: input-limitiert wie der Schmelzofen; konkurriert sogar bewusst mit der Bauteil-Kette um dieselben Häute — der Spieler priorisiert, nichts entsteht aus dem Nichts. ✓

**Eiserne Regeln:** 1 ✓ (veredelt Bestehendes), 2 ✓, 3 ✓ (kein Tempo, kein Kampf), 4 ✓ (Bautrupp), 5 ✓ (Leiter ×5/×4), 7 ✓ (Gerber-Zelt passt in den Weiler).
**Aufwand: S–M** (Engine-Modul existiert zweifach; drittes Gebäude = Content + 1 Gebäude-Art Tag/Nacht). **Risiken:** gering; einzig die Rate-Leitplanke bei künftigen langsameren tan-Rezepten im Auge behalten.

### 1b. Mühle (Crops → Mehl/Teig) — VERWERFEN

**Befund:** `flour`/`dough`/`grind_*`/`mill_*` existieren im Katalog **nicht**. Crops (`grimwheat`, `bloodbeet`, `soulgourd`, `gallows_apple`, `wraithcap`) fließen heute direkt in 2–3-Zutaten-Kochrezepte (Porridge, Brisket, Honigkuchen …) — die per §4.1 ohnehin aktiv bleiben.

Eine Mühle bräuchte: neue Zwischen-Items + Umbau bestehender Rezepte oder neue Rezepte, die Mehl nachfragen. Das ist genau das Muster „Zwischenprodukt ohne Nachfrage" = toter Wasserhahn oder Rezept-Churn kurz nach der großen Speisen-Heilwert-Spec. Kein Loch, das gestopft werden müsste: Crop-Senken existieren, und das Räucherhaus deckt die 1-Input-Offline-Küche bereits ab. **Nicht bauen.**

### 1c. Essenzbrenner / Destille (Essenz-Kondensation) — BEDINGT, ALS ZWEITE WELLE

**Kernidee:** `dim_essence` ist praktisch senkenlos (Einkommen 720–850/h aus Diebeskunst/Sammeln; einzige Senke: Schrein I ×30). Eine verlustreiche Kondensations-Kette gibt totem Bestand Zweck, OHNE die Band-Knappheit zu kippen:

- 4 neue **aktive** Runecrafting-Aktionen (erst aktiv, dann offline — sonst bricht das „beherrschte Rezepte"-Muster): `destill_ash` 8× `dim_essence` → 1× `essence_ash` (RC L10) · `destill_mire` 6× ash → 1 mire (L30) · `destill_grave` 6× mire → 1 grave (L50) · `destill_void` 6× grave → 1 void (L70). XP nach Standard-Zielkurve, klein.
- Gebäude „Essenzbrenner" als vierter Offline-Veredler, Rate in **Inputs/h**: 20/40/60. Stufe I kann nur ash, II +mire/grave, III +void.

**Faucet-Check:** volle Kette 1 728 dim → 1 void; bei Rate III sind das max. 10 `essence_void`/h = **2,4 %** der aktiven Rate (409/h) — vernachlässigbarer Hahn, echte Senke für die unteren Stufen. Wertvernichtend (8× Wert 6 → 1× niedrigerer Stückwert-Zuwachs), kein Gold-Pump. Band-Gate hält: `destill_void` verlangt RC 70 UND Brenner III (dessen Stückliste selbst Band-III-Material verlangt).

**Eiserne Regeln:** alle ✓ (Konversion bestehender Materialien, kein Kampf, kein Tempo). **Aufwand: M** (4 neue Aktionen + Gebäude + Art). **Risiken:** mittel — jede künftige Rate-Erhöhung oder ein billigeres Rezept kann das Band-Gate aufweichen; Guard empfohlen: „Kondensat-Output je Essenz-Stufe ≤ 3 % der aktiven Band-Rate" in `camp-envelope.test.ts` pinnen.

---

## 2. Richtung 2 — Wahrzeichen / Monumente (die eigentliche Antwort auf die Leitfrage)

**Kernidee:** 1–3 Prestige-Großbauten als ultimative Gold- und Material-Senken im Wochen-Maßstab. Wirkung primär ideell/kosmetisch (Karten-Präsenz, Tag/Nacht-Licht — direkte Synergie mit der 0.4-„Die Stämme"-Karte), plus je **ein** regelkonformer Dauerbonus, der ausschließlich in bestehende, bereits geklemmte Nicht-Kampf-Pfade greift. Monumente sind KEINE Gebäude im Slot-Sinn: eigene Wahrzeichen-Plätze auf der Karte, damit das Zentralhaus-Slot-Budget (14) unangetastet bleibt.

**Kostenrahmen gegen Band-III-Einkommen (50–100 k/h):** Ziel je Monument = mehrere Tage Gold + mehrere Stunden Material + lange Bauzeit. Gesamtprojekt ≈ 4–8 Wochen für einen 1–2-h/Tag-Spieler.

| Monument | Gold | Material-Skizze (alle IDs verifiziert) | Bauzeit | Dauerbonus (regelkonform) |
|---|---|---|---|---|
| **M1 Glockenturm der Wegstation** (die Straße lebt wieder) | 250 000 (≈ 2,5–5 h Band III) | `ironbark_log` ×500, `runite_bar` ×100, `essence_grave` ×150, `scarred_hide` ×200, `timber_brace` ×40, `timber_anchor` ×10 (Materialaufwand ≈ 3–4 h Band II/III) | 72 h | **Verkauf +3 %** — Gesamt-Klemme hält: Pet 5 + Posten 6 + M1 3 = 14 % ≤ 15 % |
| **M2 Statue des Wächters** (sie wacht, wenn du fort bist) | 750 000 (≈ 7,5–15 h) | `titanium_bar` ×60, `essence_void` ×200, `soul_flayer_fang` ×20, `frost_pelt` ×30, `slag_carapace` ×40, `timber_anchor` ×40 (≈ 5–6 h inkl. Elite-Jagd) | 120 h | **Offline-Cap +1 h** (11 → 12 h; §5-Logik der Balance-Doc: Raten unverändert, nur Fenster — harmlos) |
| **M3 Leuchtfeuer des Reachs** (Chronik-Stückliste: JEDE Zone liefert) | 2 000 000 (≈ 20–40 h) | `oak_log` ×1 000, `blackwood_log` ×800, `ironbark_log` ×600, `shadowpine_log` ×400, `bloodoak_log` ×300, je ×50 `iron_bar`/`steel_bar`/`runite_bar`/`bloodiron_bar`/`titanium_bar`, je ×200 `essence_ash`/`essence_mire`/`essence_grave`/`essence_void`, `raw_hide` ×500, `scarred_hide` ×300, `warhide` ×60, `timber_anchor` ×60 | 168 h | Variante A: **Veredelungs-Rate +10/h** auf alle Offline-Veredler (60→70/h = 23,3 % der langsamsten aktiven Rate, ≤ 30-%-Guard). Variante B: rein ideell (Kartenlicht + Titel). Chef-Entscheid. |

Summe: **3 M Gold** (≈ 30–60 reine Band-III-Farmstunden) + Material quer durch ALLE Bänder (die M3-Liste holt Spieler bewusst in alte Zonen zurück und zieht die Bank-Druck-Bestände flächig ab) + **360 h Bauzeit seriell** (mit Schreibzelt III ≈ 10,5 Tage). Der Bautrupp hat wieder wochenlang Arbeit.

**Warum diese drei Boni und keine anderen:** Das Tempo-Budget ist voll (23/25 B1) — Monumente dürfen NIE Skill-Tempo geben. Verkauf, Offline-Fenster und Veredelungs-Rate sind die drei Pfade, die bereits eigene Klemmen/Leitplanken haben; jeder Bonus bleibt sichtbar UNTER seiner Klemme. Kampf, XP, Yield: tabu.

**Eiserne Regeln:** 1 ✓ (reine Senke, Bonus veredelt Bestehendes), 2 ✓, 3 ✓, 4 ✓ (derselbe eine Bautrupp — Monumente konkurrieren bewusst mit nichts mehr), 5 ✓ (Leiter 250 k → ×3 → ×2,7 grob weitergeführt; bei Monumenten zählt der Absolutrahmen, nicht die ×5/×4-Gebäuderegel), 7 ✓ (Lore: Wegstation/Wächter/Leuchtfeuer sind exakt die Stufe-III-Erzählung weitergedacht — Abstimmung mit lore-dev nötig).
**Aufwand: M** (Engine: Bautrupp-Pfad + bestehende Boost-Kinds `sellBonus`/`offlineCapMs` wiederverwendbar; nur M3-Variante A braucht ein neues Boost-Kind. Haupt-Kosten: 3 Wahrzeichen-Assets in Tag- UND Nachtfassung).
**Risiken:** Nach M3 ist wieder Schluss (das Loch verschiebt sich nur — deshalb Langfrist-Erweiterung in §5); Gold-Zahlen ggf. nach echtem Post-Vollausbau-Einkommen nachziehen (wenn 0.3.0-Telemetrie/Sim zeigt, dass Band III mit Vollausbau-Boni eher 120 k/h verdient, M3 auf 3 M heben).

---

## 3. Richtung 3 — Gebäude-Stufe IV? EHRLICHE ANTWORT: NEIN. Breite statt Höhe.

Die Analyse in drei Zahlen:

1. **Das Boost-Budget ist erschöpft.** Sammel-Skills stehen bei B1 = 23 von max. 25 Punkten (Pool 8 + Lager 15); die Werkhof-Gruppe ist per Eiserner Regel 3 hart auf +9 % gedeckelt und liegt dort. Eine Stufe IV mit +5 % Tempo bricht das Budget (28 %), eine mit +2 % ist bei ×4-Kosten ein fühlbarer Betrugs-Rung („Cliff" in der wahrgenommenen Leiter — genau was die Gear-Regel verbietet).
2. **Die ×4-Leiter explodiert ohne Gegenwert.** Stufe IV Σ ≈ 4 × 551 k ≈ **2,2 M Gold** für 15 Gebäude, deren Effekte nicht mehr wachsen dürfen. Dieselben 2,2 M in Monumente gesteckt kaufen drei NEUE Erlebnisse statt fünfzehnmal „+0 bis +2 %".
3. **Asset-Kosten verdoppeln sich real:** 15 neue Ausbaustufen-Grafiken × Tag/Nacht = 30 Assets für Nummern-Kosmetik; die Breite-Alternative (Gerberei, Essenzbrenner, 3 Monumente) kostet 5 × 2 = 10 Assets für fünf neue Funktionen.

Einzige Kandidaten, die OHNE Budget-Bruch eine IV vertragen würden, sind die reinen Kapazitäts-Gebäude (Wachturm +1 h, Vorratsspeicher +Plätze) — und genau diese Effekte sind oben bereits eleganter als Monument-Boni untergebracht (M2) bzw. bleiben als Reserve.

**Empfehlung: Keine Stufe IV. Neue Gebäude und Wahrzeichen sind der gesündere Wachstumspfad.** (Sollte je eine IV kommen, dann NUR als kosmetische „Prachtstufe" ohne jeden Zahlenwert — ehrlicherweise ist das aber ein Monument mit Umweg.)

---

## 4. Richtung 4 — Lager-Bedürfnisse als Senken-Loop: WEITGEHEND VERWERFEN

Kritische Prüfung, wie beauftragt:

- **Malus-Modelle (Feuerholz-Pflicht, Proviant-Verbrauch, Decay) sind für einen Idle raus.** Jede wiederkehrende Abgabe, an der ein Zustand hängt, liest sich nach 3 Tagen Abwesenheit als Strafe — das Gegenteil des „Komm-morgen-wieder"-Ankers und ein Refund-Risiko bei genau unserer Retention-Zielgruppe.
- **Auch das Opt-in-MIT-Bonus-Modell fällt durch die Hintertür:** Sobald der Bonus spürbar ist, ist Nicht-Füttern ein empfundener Malus — de facto Steuer. Und ein spürbarer Bonus hätte im erschöpften Tempo-Budget ohnehin keinen legalen Platz.
- **Was bleibt (klein, sauber): das kosmetische Wachfeuer.** Opt-in „Feuerholz nachlegen": beliebige Logs (Band-egal, z. B. 20 Logs = 24 h Glut) halten das Gründungs-Wachfeuer sichtbar brennend — reine Licht-/Stimmungs-Wirkung auf der 0.4-Tag/Nacht-Karte, exakt null Zahlenwirkung. Das ist eine ehrliche Mini-Senke aus Spielerliebe (dasselbe Motiv, warum Leute in anderen Spielen Trophäen polieren), kostet fast nichts (S) und verletzt keine Regel. Kein Ökonomie-Pfeiler, nur Flavor — und nur bündeln, wenn die 0.4-Karte ohnehin kommt.

**Eiserne Regeln:** Wachfeuer-Variante ✓ überall (Regel 1 trivially: es erzeugt nichts). **Aufwand: S** (mit 0.4-Karte). **Risiko:** null, solange NIE ein Zahlenbonus drangehängt wird — das als Design-Invariante festschreiben.

---

## 5. Eigene Ideen (jeweils gegen die Eisernen Regeln geprüft)

### 5a. Design-Prinzip „Bauteile bleiben am Leben" — EMPFOHLEN, KOSTENLOS
Nach dem Vollausbau stirbt die frisch gebaute `timber_beam`/`brace`/`anchor`-Kette (Holzfällen L15/45/75). **Jede** künftige New-Haven-Stückliste (Gerberei, Essenzbrenner, alle Monumente — oben bereits so skizziert) führt Bauteile weiter. Damit bleibt die einzige Skilling-Handwerkskette des Lagers dauerhaft nachgefragt. Regeln: alle ✓. Aufwand: 0 (Prinzip, keine Feature-Arbeit).

### 5b. Wiederaufbau der Wegstationen (Langfrist-Rahmen NACH den Monumenten) — VORMERKEN
Wenn M1–M3 stehen, verschiebt sich das Loch nur. Der natürliche nächste Rahmen: New Haven schickt den Bautrupp HINAUS — je Zone eine ruinierte Wegstation restaurieren (Stückliste strikt aus dem Band der Zone + Gold + Bauteile, Wirkung kosmetisch auf der Zonen-Art + Lore-Eintrag). 8 Zonen = 8 weitere Wochen-Projekte, die alte Bänder dauerhaft relevant halten. Regeln: ✓ (reine Senken, keine Boni nötig — bewusst boni-frei planen, das Budget ist voll). Aufwand: L (8 × Zonen-Art-Varianten) — deshalb nur als Nordstern notieren, nicht beauftragen.

### 5c. „Chronik der Lieferungen" (wöchentliche Abgabe-Aufträge) — NUR IN DER KOSMETIK-VARIANTE, SONST VERWERFEN
Wochenauftrag am Zentralhaus: „New Haven braucht `raw_hide` ×200 / `coal` ×300 / …" (rotierend aus der Bank-Druck-Liste); Abgabe VERNICHTET die Items und füllt eine sichtbare Chronik (Lore-Einträge, Meilenstein-Vignetten). Harte Kanten: **kein Gold, keine Items, kein XP als Belohnung** (Gold ≥ Verkaufswert wäre ein Wasserhahn, darunter sinnlos), **keine Zähler-Währung mit Shop** (Regel 2). Nur Completionismus als Motor — das trägt erfahrungsgemäß eine kleine, treue Gruppe, mehr nicht. Ehrliches Urteil: nice-to-have hinter allem anderen; wenn die Kosmetik-Belohnung nicht überzeugt, ersatzlos streichen.

---

## 6. Priorisierung (Impact × Aufwand)

| Prio | Vorhaben | Impact auf die Leitfrage | Aufwand | Ziel-Release |
|---|---|---|---|---|
| **P1** | Monumente M1–M3 (§2) | SEHR HOCH — Gold-Senke 3 M + Bautrupp-Wochen + Karten-Prestige | M | 0.4 (mit der Karte, Assets Tag/Nacht) |
| **P2** | Gerberei (§1a) | HOCH — Häute sind der größte tote Bestand; komplettiert die Veredler-Trias | S–M | 0.3.x möglich (Engine-Muster existiert) |
| **P3** | Essenzbrenner (§1c) | MITTEL — dim_essence-Senke, kleiner sauberer Loop | M | 0.4 |
| **P4** | Wachfeuer kosmetisch (§4) | NIEDRIG (Flavor, Bindung) | S | nur gebündelt mit 0.4-Karte |
| **P5** | Chronik der Lieferungen (§5c) | NIEDRIG–MITTEL | M | später, ggf. streichen |
| Nordstern | Wegstationen-Wiederaufbau (§5b) | HOCH (Langfrist) | L | nach M3, eigener Beschluss |

## 7. Nicht-tun-Liste (mit Begründung, kurz)

1. **Keine Gebäude-Stufe IV** — Tempo-Budget erschöpft, ×4-Kosten ohne Gegenwert, 30 Assets für Nummern-Kosmetik (§3).
2. **Keine Mühle / keine neuen Zwischen-Items ohne bestehende Nachfrage** — flour/dough haben null Katalog-Unterbau; „Zwischenprodukt ohne Abnehmer" ist der klassische neue Wasserhahn (§1b).
3. **Kein Verbrauchs-/Decay-Modell, auch nicht „Opt-in mit Bonus"** — liest sich immer als Steuer; einzig das zahlenfreie kosmetische Wachfeuer ist zulässig (§4).
4. **Keine weiteren Tempo-Boosts aus irgendeiner neuen Quelle** — B1 steht bei 23/25, Werkhof-Gruppe am Regel-Deckel. Gilt auch für Monumente, Events, Ringe.
5. **Keine XP- oder Kampf-Boni an Monumenten** — Eiserne Regel 3 plus mistvigil-Präzedenz nicht aufweichen.
6. **Keine gold- oder item-belohnten Lieferaufträge** — jede Belohnung über Verkaufswert ist ein Faucet, darunter Beschäftigungstherapie (§5c).
7. **Keine neue Währung, auch nicht als „Ansehen"/„Baumarken"-Zähler mit Einlöse-Shop** — Regel 2; ein rein kosmetischer Fortschrittsbalken ist die Grenze des Erlaubten.

## 8. Offene Chef-Entscheide

1. **M3-Bonus:** Variante A (Veredler-Rate +10/h, braucht ein neues Boost-Kind) oder B (rein ideell)? Empfehlung: A — es adelt die Veredler-Identität des Lagers und bleibt unter dem 30-%-Guard.
2. **Monument-Anzahl:** alle drei fest einplanen oder M1 als Pilot in 0.4 und M2/M3 nachziehen? Empfehlung: M1 als Pilot mit der Karte, M2/M3 im Folgepatch (verlängert den Anker).
3. **Gerberei-GO** für 0.3.x (einziges Vorhaben, das ohne die 0.4-Karte voll trägt).
4. **Essenzbrenner:** GO oder auf Halde bis nach 0.4?
5. **Slot-Frage bestätigen:** Monumente außerhalb der Zentralhaus-Slot-Logik (eigene Wahrzeichen-Plätze); neue Gebäude (Gerberei/Brenner) erhöhen `buildSlots` an Zentralhaus II/III um je +1 (kleiner content-Fix, KEINE neue Zentralhaus-Stufe).

*Umsetzung wie immer: dieses Doc liefert die Zahlen; content-dev/logic-dev wenden an, `camp-envelope`-Guard wird um die neuen Klemmen (Kondensat ≤ 3 %, Verkauf ≤ 15 % inkl. M1, Rate ≤ 30 % inkl. M3-A) erweitert.*
