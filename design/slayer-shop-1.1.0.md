# Slayer-Shop 1.1.0 — Audit & Vorschlag (Angebot, Rüstungen, Punkte-Ökonomie, UI)

**balance-designer, 2026-08-25 · Chef-Auftrag (Live-Test 1.1.0): „Kontrollier den Slayer Shop, Design und Inhalt, und die Belohnungen, vor allem die Rüstungen scheinen mir zu schlecht."**
**Reine Spec. Nichts davon ist angewendet. Zahlen werden nach Chef-Freigabe von content-dev 1:1 übernommen (Apply-Liste §4.6).**

Datenbasis: Content `packages/content/src/index.ts` (slayerShop Z. 17787 ff., Slayer-Items Z. 4652–4870, Rezepte Z. 11553–11621, Sets Z. 15048 ff.) · Engine `slayer.ts` (Punkte-Vergabe, Streak, Skip), `character.ts` computeStats (Trinity, tote Terme), `combat.ts` collectSpecialEffects (Slot-Effekte, `bounty`) · Wegwerf-Sim (`_slayer.test.ts`, gelöscht): Craft-Leitern aller Slots, Drop-Quellen, Kills/h je Kampfstufe · Messberichte `design/sweep6-2026-07-02/W2-slayer.md` (ehrliche Pkt/h) und `design/fun-review/*slayer-vesna.md`.

---

## 0. Kurzfassung

1. **Die drei Slayer-Rüstungsteile haben KEINEN Rüstungswert.** Slayer-Helm, Slayer-Beinschienen und Slayer-Armschienen tragen weder `armorRating` noch `evasionRating` noch `wardCapacity`. Seit der Rüstungs-Trinität (Itemization 2.5) kommt Mitigation AUSSCHLIESSLICH aus armorRating, Ausweichen nur aus evasionRating, Ward nur aus wardCapacity. Ein Titan-Vollhelm (Schmieden 80, AR 21,99) schlägt den Slayer-Helm (650 Pkt ≈ 19 h Slaying oder Schmieden 80 plus 5 Abyssale Kerne) in jedem Kampfwert außer +1 Konstitution. Der Chef hat recht.
2. **Der einzige Skill-Bonus der Rüstung ist tot.** `skillBoost: { defence: 3 }` auf Helm, Beinschienen und dem 4-Teile-Set speist seit der Trinität keinen Kampfterm mehr (computeStats: der Defence-Term ist aus defense UND evasion entfernt; der Skill ist nur noch Requirement-Gate). Die UI zeigt „(+3)", der Kampf rechnet 0.
3. **Zwei Angebote sind tot, eines ein Notnagel:** Pestiges Knochenfragment (8 Pkt) und Schmiedeglut (20 Pkt) fallen zu 25–40 % je Kill auf Etage 1/3; ein einziger Auftrag liefert 9–13 Stück gratis, der Shop verlangt dafür 70–260 Pkt. Der Abyssale Kern (70 Pkt ≈ 2 h) ist 25–40× teurer als Farmen (4–8 % auf Etage 5, ≈ 3–5 min je Kern) und bleibt nur als Notfall-Sicherheitsnetz sinnvoll.
4. **Die Punkte-Ökonomie selbst ist gesund.** 5 Pkt/Auftrag (skaliert ×0,73–×1,27 nach Größe), jeder 10. Auftrag zahlt doppelt (Streak), Meisterring +10 %, Trophäenwand bis +30 %. Ehrlich gemessen 20–35 Pkt/h (W2), mit vollem Craft-Kit und ohne Leerlauf 34–55 Pkt/h (Sim heute). Der Katalog (1.910 Pkt Ausrüstung) kostet 50–60 h, der erste Ausrüstungskauf (Armschienen, 320 Pkt) ~11 h. Das ist die richtige Größenordnung, nur die Ware dahinter lohnt sich nicht.
5. **Das Sortiment hat eine Lücke von Slayer 15 bis 50:** dort gibt es nur Schlüssel und einen 10-Minuten-Trank, der bei 2–10 Pkt/h eines Anfängers eine Falle ist (12 Pkt = 1–6 h Slaying für 10 min Buff) und als erstes Angebot in der Liste steht.

**Top-Empfehlung (Rüstungen):** Jedes Slayer-Rüstungsteil bekommt den Trinity-Wert der NÄCHSTEN Craft-Stufe seines Slots bei unverändertem Slayer-Requirement (Rare-Drop-Philosophie) plus einen Slayer-Effekt aus dem bestehenden Baukasten: **Slayer-Helm AR 24,41 + `bounty` 0,20** (+20 % Schaden gegen das aktive Auftragsziel; die OSRS-Helm-Identität), **Slayer-Beinschienen AR 21,78 + `giantSlayer` 0,20** (Aufträge liegen immer über dem eigenen Level), **Slayer-Armschienen EV 11,76 + `healOnKill` 4** (Kettenjagd-Sustain). Tote Defence-Boosts raus, 4-Teile-Set bekommt 0,15 LP/s Regeneration. Kein Engine-Umbau, kein SAVE-Bump, keine Hüllen-Pins bewegen sich (§5).

---

## 1. Punkte-Ökonomie: Was kostet ein Kauf in Spielzeit?

### 1.1 Mechanik (Engine-Stand, `slayer.ts`)

| Größe | Wert | Quelle |
|---|---|---|
| Punkte je Auftrag | `basePoints` 5 × (0,5 + 0,5 · N/32,5), N = 15–50 Kills → 4–6 Pkt, Ø exakt 5 | `scaledTaskPoints`, brenna_ashwick |
| Streak | jeder 10. Auftrag zahlt den Auftrag doppelt (+10 % Ø); jeder 5. Auftrag +2 Quest-Tokens | `SLAYER_STREAK_*` |
| Meisterring (Slayer 99) | +10 % Punkte | ring_master_slayer |
| Trophäenwand I–III (Lager) | +10/+20/+30 % Punkte, Stufe III zusätzlich 1 Gratis-Skip/Kalendertag | campBuildings |
| Gesamt-Klemme Boni | ×1,5 (heute erreichbar ×1,4) | `SLAYER_POINTS_TOTAL_BONUS_CAP` |
| Skip | 20 Pkt; gratis unter Slayer 10 | `effectiveSkipCost` |
| Auftragsfenster | Welt: CL+1 … CL+8 (50 %) · Turm: CL−20 … CL+8 (50 %), Mindestpool 4 | `worldTaskMonsters`, `assignTask` |

### 1.2 Gemessene Raten

| Quelle | Charakter | Aufträge/h | Pkt/h (inkl. Streak) |
|---|---|---|---|
| W2-slayer (ehrlich, alle Gates, Seed 71) | frischer Spieler, erste 20 h | 0,4 | **2** |
| W2-slayer | MID CL 45 / SL 40 | 4,0 | **22** |
| W2-slayer | END CL 95 / SL 85 | 7,0 | **38** |
| Sim heute (Craft-Kit exakt auf CL, Endgame-Essen, kein Leerlauf) | CL 20 | 11,2 | 61 |
| " | CL 35 | 7,5 | 41 |
| " | CL 50 | 7,9 | 44 |
| " | CL 65 | 8,3 | 46 |
| " | CL 80 | 6,1 | 34 |
| " | CL 95 | 10,0 | 55 |

Sim-Methode: je Kampfstufe alle Welt-Monster im Fenster CL+1…+8 und alle Turm-Kandidaten im Fenster, 3 min Dauerkampf je Monster, Kills/h → Ø Sekunden je Kill (Welt 10–26 s, Turm 7–12 s), 32,5 Kills je Auftrag, 5,5 Pkt je Auftrag. Keine Todesfälle im gesamten Lauf. Der Unterschied zur ehrlichen W2-Messung ist Leerlauf (Auftrag abholen, Ziel wechseln, Essen, Skips).

**Planungsrate für dieses Dokument:** 30 Pkt/h (Slayer 40–69), 35 Pkt/h (70–89), 40 Pkt/h (90+); mit Trophäenwand III und Meisterring bis 56 Pkt/h.

### 1.3 Preis → Aufträge → Stunden (Ist-Preise)

| Angebot (EN / DE) | Pkt | Slayer | Aufträge (5,5 Pkt) | Stunden (Planungsrate) | Stunden (ehrlich W2) |
|---|---|---|---|---|---|
| Plague Mask / Seuchenmaske | 12 | 1 | 2 | 0,4 (früh real 1–6 h bei 2–10 Pkt/h) | bis 6 |
| Ear Plugs / Ohrenstopfen | 18 | 15 | 3 | 0,6 | 0,8 |
| Mirror Ward / Spiegelschutz | 25 | 15 | 5 | 0,8 | 1,1 |
| Soul Veil / Seelenvorhang | 55 | 40 | 10 | 1,8 | 2,5 |
| Void Anchor / Leerenstabilisator | 100 | 60 | 18 | 3,3 | 4,5 |
| Blighted Bone / Pestiges Knochenfragment | 8 | 30 | 1,5 je Stück (20 für den Helm = 160 Pkt) | 5,3 für 20 Stück | 7,3 |
| Forge Ember / Schmiedeglut | 20 | 50 | 3,6 je Stück (10 für den Helm = 200 Pkt) | 6,7 für 10 Stück | 9,1 |
| Abyssal Core / Abyssaler Kern | 70 | 80 | 13 je Stück (5 für den Helm = 350 Pkt) | 2,0 je Stück | 1,8 |
| Slayer Vambraces / Slayer-Armschienen | 320 | 50 | 58 | 10,7 | 14,5 |
| Slayer Greaves / Slayer-Beinschienen | 420 | 65 | 76 | 14,0 | 19,1 |
| Slayer Amulet / Slayer-Amulett | 520 | 70 | 95 | 14,9 | 17,3 |
| Slayer Helm / Slayer-Helm | 650 | 80 | 118 | 18,6 | 16,9 |
| Slayer's Combat Draught / Monsterjäger-Kampftrank | 12 | 1 | 2,2 (≈ 24 min Slaying) je 10-min-Buff | max. ~40 % Uptime | ~12 % früh |
| Slayer's Hunter Elixir / Monsterjäger-Jagdelixier | 28 | 40 | 5,1 (≈ 55 min) je 30-min-Buff | max. ~55 % Uptime | ~45 % |
| Slayer's War Brew / Monsterjäger-Kriegsgebräu | 110 | 70 | 20 (≈ 3,3 h) je 60-min-Buff | max. ~30 % Uptime | ~25 % |
| **Ausrüstung komplett (4 Teile)** | **1.910** | | **347** | **55–60** | **68** |

Urteil: Die Preisleiter der Ausrüstung (11 → 14 → 15 → 19 h) ist als Sparziel-Rhythmus gut; ein Katalog von ~60 h Slaying für ein 4-Teile-Set liegt im Rahmen eines Langzeit-Skills. Die Konsumgüter sind als Dauer-Senke nach dem Kit-Out korrekt kalibriert (keine 100-%-Uptime möglich, keine Trap-Stufe). Das Problem ist nicht der Preis, sondern was man dafür bekommt (§2, §3).

---

## 2. Ist-Tabelle aller 15 Angebote

Kernwert je Klasse wie in Rezension #8 (Platte = armorRating, Leder = evasionRating, Stoff = wardCapacity, Schmuck = Attributsumme + 2 × Skill-Boost). „Craft gleich/nächst" = Craft-Stufe mit Requirement ≤ Slayer-Requirement des Items bzw. die Stufe darüber, im selben Slot. Drops = Kampf-Uniques im selben Slot und Requirement-Band.

| # | Angebot (EN / DE) | Pkt | SL | Typ | Kern-Stats heute | Craft gleiche Stufe | Craft nächste Stufe | Drop-Unique gleiche Stufe | Urteil |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Plague Mask / Seuchenmaske | 12 | 1 | Schlüssel (Etage 1) | — | Lederverarbeitung 15: 2 Rohhaut + 3 Sumpfwurzel | — | — | OK. Bequemer als Craft, erster Kauf nach 2–3 Aufträgen. |
| 2 | Ear Plugs / Ohrenstopfen | 18 | 15 | Schlüssel (Etage 2) | — | Lederverarbeitung 20 | — | — | OK. |
| 3 | Mirror Ward / Spiegelschutz | 25 | 15 | Schlüssel (Etage 2) | — | Schmieden 30: 5 Eisenbarren + 2 Frostessenz | — | — | OK. |
| 4 | Soul Veil / Seelenvorhang | 55 | 40 | Schlüssel (Etage 3–5) | — | Runenkunst 50: 3 Aetheressenz + 2 Leerenrune | — | — | OK, Gate SL 40 = Etage 3. |
| 5 | Void Anchor / Leerenstabilisator | 100 | 60 | Schlüssel (Etage 4–5) | — | Juwelierskunst 70: 2 Seelenopal + 3 Leerenessenz | — | — | OK, Gate SL 60 = Etage 4. |
| 6 | Slayer Vambraces / Slayer-Armschienen | 320 | 50 | Handschuhe, epic, req slayer 50 | **kein Trinity-Wert**; str 2, dex 1, con 3, int 2, lck 3; +Angriff 3 | Leder: Genietete Armschützer (Fernkampf 50) EV 10,22, dex 1, con 3 · Platte: Adamantium-Panzerhandschuhe (Vert. 50) AR 11,19, str 5, con 2 · Stoff: Arkane Fäustlinge (Magie 55) WD 30,24 | Leder: Eisenleder-Armschützer (60) EV 11,76 · Platte: Runit (60) AR 12,47 | Himmelsgriff-Stulpen (50): EV 11,76, dex 2, con 4, lck 3, +Fernkampf 1, desperation 0,3 · Faust des Kriegshäuptlings (50): AR 12,5, str 5, con 3, firstStrike | **Schlecht.** 0 Ausweichen / 0 Rüstung; für Nahkampf −11 AR und −3 str gegenüber Adamantium, dafür +3 Angriff (≈ +1 Treffsicherheit) und +6 LP. Niemand tauscht das. Craft-Pfad (Seelenschinder-Reißzahn, Etage 5 = SL 80) ist 30 Level lang unerreichbar, der Shop ist die einzige Quelle. |
| 7 | Slayer Greaves / Slayer-Beinschienen | 420 | 65 | Beine, epic, req slayer 65 | **kein Trinity-Wert**; str 3, dex 1, con 4, int 3; +Verteidigung 3 (**tot**) | Platte: Runit-Plattenbeinlinge (60) AR 19,59, str 5, con 4 · Leder: Eisenleder-Beinschienen (61) EV 18,71 · Stoff: Dämmergewebe (64) WD 52 | Platte: Bluteisen (70) AR 21,78, str 7, con 5 · Leder: Kriegsleder (70) EV 20,83 · Stoff: Runenwirk (70) WD 73,85 | Grabplatten-Beinschienen (70): AR 24,19, con 4, giantSlayer 0,2 · Moosgewebe/Schmiedeplatten (50): AR 19,59 + giantSlayer 0,2 | **Schlecht.** 0 Rüstung, toter Boost. Gegen Runit: −19,6 AR (≈ −4 Prozentpunkte Mitigation im Vollkit), −2 str. |
| 8 | Slayer Amulet / Slayer-Amulett | 520 | 70 | Amulett, epic, req slayer 70 | str 3, dex 1, con 4, int 3, lck 5; +Angriff 3 → Kern 22 | Sturmrufer-Amulett (65): dex 1, int 5, lck 4, +Magie 3 → 16 | Onyxamulett (75): dex 2, con 4, lck 5, +Vert. 3 (tot) → 17 nominell, 11 real | Kette der Sieben Zerbrochenen Kronen (godly, 99): 32 Attribute + Regen 0,3 | **Gut.** Bestes Amulett seines Bandes für Nahkampf (Angriff-Boost ist der einzige lebende Boost der Amulett-Leiter). Für Fernkampf/Magie ist +Angriff 3 wirkungslos (Treffsicherheit liest den Stil-Skill). Kein eigener Slayer-Effekt. |
| 9 | Blighted Bone / Pestiges Knochenfragment | 8 | 30 | Material (Helm-Input ×20) | Wert 15 Gold | — | — | Drop 30–40 % je Kill auf Etage 1 (L3–34) | **Totes Angebot.** Ein Etage-1-Auftrag (32 Kills) liefert ≈ 10–13 Stück gratis; der Shop verlangt dafür 80–104 Pkt = 15–19 Aufträge. |
| 10 | Forge Ember / Schmiedeglut | 20 | 50 | Material (Helm-Input ×10) | Wert 40 Gold | — | — | Drop 25–30 % je Kill auf Etage 3 (L44–54) | **Totes Angebot.** Ein Etage-3-Auftrag liefert ≈ 9 Stück; der Shop: 180 Pkt. |
| 11 | Abyssal Core / Abyssaler Kern | 70 | 80 | Material (Helm-Input ×5), superRare | Wert 500 Gold | — | — | Drop 4–8 % auf Etage 5 (L86–96) | **Notnagel.** Farmen: 12–25 Kills ≈ 3–5 min je Kern; Shop: 2 h je Kern. Nur als Sicherheitsnetz für den fünften Kern vertretbar. |
| 12 | Slayer Helm / Slayer-Helm | 650 | 80 | Helm, epic, req slayer 80, `slayerHelm` (ersetzt alle 5 Schlüssel) | **kein Trinity-Wert**; str 4, dex 2, con 7, int 4; +Verteidigung 3 (**tot**) | Platte: Titan-Vollhelm (80) AR 21,99, str 7, con 6 · Leder: Drachenleder-Haube (82) EV 21,49 · Stoff: Götzenfunken-Mitra (85) WD 95,23 | Platte: Aetherium-Vollhelm (90) AR 24,41, str 9, con 7 · Leder: Geisterleder (90) EV 23,2 | Riffschuppen-Helm / Wolfsfell-Kapuze (80): AR 24,41, con 3, healOnKill 6 · Krone des Götzen (legendary, 99): AR 25, 19 Attribute, Regen 0,3 | **Schlecht als Rüstung, gut als Schlüssel.** Gegen Titan-Vollhelm: −22 AR (im ~130-AR-Titan-Vollkit fällt die Mitigation von 51 % auf 46 %, ≈ +9 % erlittener Schaden), −3 str, +1 con. Sein einziger Wert ist die Schlüsselfunktion (Gegenwert aller Schlüssel: 210 Pkt, einmalig). |
| 13 | Slayer's Combat Draught / Monsterjäger-Kampftrank | 12 | 1 | Trank 10 min: −450 ms Intervall, +8 % Krit | — | Gold-Tonika: Kriegspfad (Kräuterkunde 78) 75 s, Apex (90) 90 s | — | — | Gut kalibriert ab Mittelspiel; **als SL-1-Angebot eine Falle** (2–10 Pkt/h früh = 1–6 h Slaying für 10 min Buff) und steht in der levelsortierten Liste ganz oben. |
| 14 | Slayer's Hunter Elixir / Monsterjäger-Jagdelixier | 28 | 40 | Trank 30 min: −600 ms, +12 % Krit, +20 % Krit-Schaden | — | — | — | — | OK (Uptime-Buff, keine Inversion zum Trank). |
| 15 | Slayer's War Brew / Monsterjäger-Kriegsgebräu | 110 | 70 | Trank 60 min: −750 ms, +20 % Krit, +30 % Krit-Schaden | — | — | — | — | OK (Prestige-Buff, stärkste Tempo/Krit-Kombination, exklusiv in Kategorie „offense"). |

**Lücken:** Slayer 15–49 hat kein einziges Ausrüstungs- oder Identitäts-Angebot; kein Angebot für Stoff-Träger (die drei Rüstungsteile sind nach Craft-Skill Platte/Platte/Leder); kein Slayer-Effekt (`bounty`) im Shop, obwohl die Engine ihn kennt und vier Drops ihn tragen.
**Endgame-Zeug, das nicht hingehört:** keines. Kampf-gegatete Materialien werden nicht umgangen (die Turm-Materialien kommen selbst aus dem Turm; die Schlüssel sind zusätzlich craftbar). Kein Gold-Bezug, kein `luckyStrike`.

---

## 3. Rüstungs-Vergleich im Detail (warum es sich heute nie lohnt)

Zahlen aus computeStats (`character.ts`):
- `defense = Σ armorRating · defMult`, Mitigation = `def / (def + 125)`, Deckel 80 %. **Attribute und der Defence-Skill tragen NICHTS mehr zur Mitigation bei.**
- `dodgeChance = 0,5 · Σ evasionRating / (Σ evasionRating + 60)`, Deckel 40 %.
- `maxWard = Σ wardCapacity`.
- Attribute wirken nur offensiv/auf LP: str → Nahkampfschaden (0,3/Pkt), dex → Fernkampfschaden (0,24/Pkt) + Krit + Tempo + Treffsicherheit (0,6/Pkt), int → Magieschaden (0,34/Pkt) + Mana, con → +2 LP, lck → Krit.
- `skillBoost.attack` → Treffsicherheit +0,35 je Punkt, NUR im Nahkampf (Fernkampf liest `ranged`, Magie liest `magic`). `skillBoost.defence` → **kein Kampfterm** (nur Anzeige).

| Slot | Slayer-Teil heute | Craft-Alternative der Stufe | Delta im Kampf (Nahkampf-Träger) |
|---|---|---|---|
| Helm (SL 80) | 0 AR · str 4, dex 2, con 7, int 4 · +Vert. 3 (tot) | Titan-Vollhelm: AR 21,99 · str 7, con 6 | −21,99 AR (Vollkit ~130 AR: 51,0 % → 46,4 % Mitigation), −0,9 Nahkampfschaden, +2 LP |
| Beine (SL 65) | 0 AR · str 3, dex 1, con 4, int 3 · +Vert. 3 (tot) | Runit-Plattenbeinlinge: AR 19,59 · str 5, con 4 | −19,59 AR, −0,6 Schaden, ±0 LP |
| Handschuhe (SL 50) | 0 EV/AR · str 2, dex 1, con 3, int 2, lck 3 · +Angriff 3 | Adamantium-Panzerhandschuhe: AR 11,19 · str 5, con 2 | −11,19 AR, −0,9 Schaden, +2 LP, +1,05 Treffsicherheit, +~1,5 Prozentpunkte Krit |
| 4-Teile-Set | 2pc: str 3, dex 1, con 3, int 2, lck 2, +Angriff 2 · 4pc: str 3, dex 1, con 4, int 3, lck 2, +Vert. 3 (tot) | — | Set-Krönung 4pc ist tot; der Set-Kommentar im Content („defense +45, maxHp +140, dmg +18 …") stammt aus der Vor-Trinity-Ära und stimmt nicht mehr. |

Fazit: Ein Spieler, der 1.910 Pkt (~60 h) in das Ornat steckt, verliert im Vollkit rund 53 AR (≈ 10 Prozentpunkte Mitigation) gegenüber Craft-Platte derselben Stufen und gewinnt ~35 Attributpunkte, die zu zwei Dritteln auf Stile entfallen, die er nicht spielt. Die Rare-Drop-Regel „Kampf-Ausrüstung ist immer besser als Craft derselben Stufe" (Rezension #8) gilt für den Slayer-Shop nicht, weil `drop-gear-beats-craft` nur Loot-Tabellen prüft; die Shop-Ware ist durchgerutscht.

---

## 4. Vorschlag

Leitregeln: (a) Slayer-Ausrüstung = Trinity-Wert der NÄCHSTEN Craft-Stufe des Slots bei aktuellem Slayer-Requirement (Rare-Drop-Philosophie, exakt die #8-Regel), plus ein Effekt aus dem bestehenden Baukasten; (b) kein Shop-Wert über dem Chase-Drop desselben Slots/Bands (die Chase-Zeilen behalten die Spitze); (c) Attribute bleiben unverändert (kein BiS-Pin bewegt sich, §5); (d) tote Felder raus; (e) kein Engine-Umbau, kein neues State-Feld.

### 4.1 Item-Änderungen (content-dev, Z. 4774–4822)

**slayer_helm — Slayer Helm / Slayer-Helm** (Helm, epic, req slayer 80, `slayerHelm: true` bleibt)
```ts
armorRating: 24.41,                       // NEU = Aetherium-Vollhelm (Vert. 90), nächste Platten-Stufe über Titan (80)
weaponEffect: { type: "bounty", chance: 1, magnitude: 0.20, durationMs: 0 },  // NEU: +20 % Schaden gegen das aktive Auftragsziel
modifiers: { str: 4, dex: 2, con: 7, int: 4 },   // unverändert
// skillBoost: { defence: 3 }  → ENTFERNEN (tot)
description: {
  en: "A masterwork helm forged from the essence of the Slayer Tower's worst horrors. It marks its bearer's contract: +20% damage against the current slayer target, and no ward items are needed against any tower threat while worn.",
  de: "Ein Meisterwerk-Helm, geschmiedet aus dem Wesen der schlimmsten Schrecken des Slayer-Turms. Er zeichnet den Auftrag seines Trägers: +20 % Schaden gegen das aktuelle Auftragsziel, und im Turm sind keine Schutzgegenstände mehr nötig, solange er getragen wird.",
},
```
Begründung: `bounty` ist der einzige auftragsbezogene Effekt der Engine (combat.ts Z. 1736) und exakt die OSRS-Slayer-Helm-Identität. Träger heute: Glutschlaufe-Ring, Glutherz-Amulett, Jagdmesser, Geisterjäger-Bogen (alle 0,20) und Rune des Kopfgelds (Tier IV, 0,20). Gleiche Kinds stapeln NICHT (stärkste Magnitude gewinnt), der Gesamtdeckel bleibt also bei 0,20; der Helm ersetzt für alle drei Stile den Zwang zu einer Kopfgeld-Waffe. AR 24,41 = exakt Riffschuppen-Helm/Wolfsfell-Kapuze (Chase, req 80), aber ohne deren healOnKill 6 und mit Attributen statt con 3. Krone des Götzen (legendary, 99: AR 25, 19 Attribute, +Vert. 4, Regen 0,3) bleibt klar darüber.

**slayer_greaves — Slayer Greaves / Slayer-Beinschienen** (Beine, epic, req slayer 65)
```ts
armorRating: 21.78,                       // NEU = Bluteisen-Plattenbeinlinge (Vert. 70), nächste Stufe über Runit (60)
weaponEffect: { type: "giantSlayer", chance: 1, magnitude: 0.20, durationMs: 0 },  // NEU: +20 % gegen Monster über dem eigenen Kampflevel
modifiers: { str: 3, dex: 1, con: 4, int: 3 },   // unverändert
// skillBoost: { defence: 3 }  → ENTFERNEN (tot)
description: {
  en: "Greaves reinforced with the fractured shards of dreadfang teeth. Built for prey above your station: +20% damage against monsters of higher level than you.",
  de: "Beinschienen, mit zersplitterten Schreckenzahn-Zähnen verstärkt. Gebaut für Beute über deinem Stand: +20 % Schaden gegen Monster, die über deinem Kampflevel liegen.",
},
```
Begründung: Welt-Aufträge liegen IMMER 1–8 Level über dem Spieler, Turm-Aufträge zur Hälfte; giantSlayer ist damit der Slayer-Effekt für die Beine (Beinschienen-Konvention im Katalog: Moosgewebe, Schmiedeplatten, Grabplatten, Gezeitengewebe, Frostplatten tragen alle giantSlayer 0,15–0,20). AR 21,78 bleibt unter Grabplatten-Beinschienen (Chase, req 70: AR 24,19).

**slayer_vambraces — Slayer Vambraces / Slayer-Armschienen** (Handschuhe, epic, req slayer 50)
```ts
evasionRating: 11.76,                     // NEU = Eisenleder-Armschützer (Fernkampf 60), nächste Leder-Stufe über Genietet (50)
weaponEffect: { type: "healOnKill", chance: 1, magnitude: 4, durationMs: 0 },  // NEU: +4 LP je Kill
modifiers: { str: 2, dex: 1, con: 3, int: 2, lck: 3 },   // unverändert
skillBoost: { attack: 3 },                // unverändert (s. Nebenbefund 7.3)
description: {
  en: "Vambraces fashioned from the fang of a soul flayer and hardened tower leather. Every kill on the hunt knits the hunter's wounds: +4 HP per kill.",
  de: "Armschienen aus dem Reißzahn eines Seelenschinders und gehärtetem Turm-Leder. Jeder Abschuss auf der Jagd schließt die Wunden des Jägers: +4 LP je Kill.",
},
```
Begründung: Leder (Rezept ist Lederverarbeitung 75 mit Turm-Leder), EV 11,76 = exakt Himmelsgriff-Stulpen (Chase, req 50), aber ohne deren +Fernkampf 1 und desperation 0,3. healOnKill 4 entspricht dem Band (Chitin-Helm req 40 / Glutschmiede-Helm req 50: 4; Riffschuppen req 80: 6) und ist der Sustain-Effekt für 30–50-Kill-Ketten ohne Essen. Ausweichen wirkt für alle Stile (Vollvermeidung); ein Platten-Nahkämpfer bekommt aus 11,76 EV ≈ 8 % Dodge, was im Vollkit mehr wert ist als die 11 AR der Adamantium-Handschuhe.

**slayer_amulet — Slayer Amulet / Slayer-Amulett:** unverändert (Stats, Preis 520, Gate 70). Es ist heute bereits das beste Amulett seines Bandes und trägt mit +Angriff 3 den einzigen lebenden Boost der Amulett-Leiter. Eine eigene Slayer-Signatur ist nicht nötig, weil Helm und Beinschienen sie tragen; ein weiteres `bounty` würde ohnehin nicht stapeln.

### 4.2 Set-Änderungen (Z. 15048–15060)

```ts
{ id: "slayer_set", ...  // 2pc: UNVERÄNDERT (str 3, dex 1, con 3, int 2, lck 2; +Angriff 2)
{ id: "slayer_set_4pc", ...
  modifiers: { str: 3, dex: 1, con: 4, int: 3, lck: 2 },   // unverändert
  bonus: { hpRegenPerSec: 0.15 },          // NEU: Kettenjagd-Sustain; unter jeder Chase-Regen (0,2–0,3)
  // skillBoost: { defence: 3 }  → ENTFERNEN (tot; Set-Guard verlangt sonst genau 1 lebenden Boost-Key)
}
```
Set-Kommentar im Content („kombiniert 2pc+4pc = defense +45, maxHp +140 …") ersetzen durch: „2pc: +11 Attribute, +Angriff 2 · 4pc zusätzlich: +13 Attribute, 0,15 LP/s Regeneration". Falls ein Guard `set.bonus` leer erzwingt (itemization-guards prüft heute nur skillBoost/modifiers der Sets, content-dev bitte Lauf abwarten): Fallback = Regen weglassen, 4pc-modifiers con 4 → 6.

### 4.3 Shop-Liste (Z. 17787–17816, komplett ersetzen)

```ts
slayerShop: [
  // ── Schlüssel (Turm-Gates) ─────────────────────────────────────────────
  { itemId: "plague_mask",  cost: 12,  slayerLevelRequired: 1  },
  { itemId: "ear_plugs",    cost: 18,  slayerLevelRequired: 15 },
  { itemId: "mirror_ward",  cost: 25,  slayerLevelRequired: 15 },
  { itemId: "soul_veil",    cost: 55,  slayerLevelRequired: 40 },
  { itemId: "void_anchor",  cost: 100, slayerLevelRequired: 60 },
  // ── Ausrüstung (Slayers Ornat) ─────────────────────────────────────────
  { itemId: "slayer_vambraces", cost: 260, slayerLevelRequired: 50 },   // war 320 (erster Ausrüstungskauf: ~9 h statt ~11 h)
  { itemId: "slayer_greaves",   cost: 420, slayerLevelRequired: 65 },
  { itemId: "slayer_amulet",    cost: 520, slayerLevelRequired: 70 },
  { itemId: "slayer_helm",      cost: 650, slayerLevelRequired: 80 },
  // ── Notfall-Material (Helm-Rezept) ─────────────────────────────────────
  { itemId: "abyssal_core",     cost: 70,  slayerLevelRequired: 80 },   // bleibt: Sicherheitsnetz für den 5. Kern (Farmen ist 25–40× günstiger, bewusst)
  // blighted_bone (8) und forge_ember (20): GESTRICHEN (tote Angebote, 25–40 % Drop je Kill)
  // ── Tränke (wiederkehrende Senke) ──────────────────────────────────────
  { itemId: "slayer_combat_draught",  cost: 12,  slayerLevelRequired: 20 },  // war SL 1 (Anfänger-Falle, s. §2 #13)
  { itemId: "slayer_hunters_elixir",  cost: 28,  slayerLevelRequired: 40 },
  { itemId: "slayer_war_brew",        cost: 110, slayerLevelRequired: 70 },
],
```
Neue Stundenleiter (Planungsrate, inkl. Streak): Schlüssel 0,4 / 0,6 / 0,8 / 1,8 / 3,3 h · Armschienen 8,7 h · Beinschienen 14 h · Amulett 14,9 h · Helm 18,6 h · Ornat gesamt 1.850 Pkt ≈ 53–58 h (ehrliche W2-Rate: ~66 h). Preise der drei teuren Teile bewusst unverändert: mit lebenden Werten sind 14–19 h je Teil der richtige Sparziel-Takt (Vorgabe sweep6-batchE: Helm 15–20 h, Katalog 60–80 h, jetzt eher 55–65 h wegen Streak und Trophäenwand).

Shop-Kommentar im Content aktualisieren: „Punkte-Ökonomie: 5 Pkt/Task (Ø), Streak +10 %, Meisterring +10 %, Trophäenwand bis +30 %; Planungsrate 30–40 Pkt/h; Helm ≈ 19 h, Ornat ≈ 55 h. Slayer-Gear = nächste Craft-Stufe + Slayer-Effekt (design/slayer-shop-1.1.0.md §4)."

### 4.4 Optional (Phase 2, braucht 1 Asset): Jägerumhang für die Lücke Slayer 30–50

```ts
slayer_hunters_cape: {
  id: "slayer_hunters_cape",
  name: { en: "Hunter's Cape", de: "Jägerumhang" },
  type: "equipment", stackable: false, slot: "cape", rarity: "superRare",
  modifiers: { str: 2, dex: 2, con: 3, int: 2 },
  weaponEffect: { type: "firstBlood", chance: 1, magnitude: 0.15, durationMs: 0 },  // +15 % auf Treffer gegen ein unverletztes Ziel
  requirements: { slayer: 30 }, value: 1200,
  description: {
    en: "A weathered cape issued by Brenna to hunters who have earned their first thirty contracts. The opening strike of every hunt bites deeper: +15% damage against an unwounded target.",
    de: "Ein verwitterter Umhang, den Brenna an Jäger ausgibt, die sich ihre ersten dreißig Aufträge verdient haben. Der erste Schlag jeder Jagd beißt tiefer: +15 % Schaden gegen ein unverletztes Ziel.",
  },
},
// Shop: { itemId: "slayer_hunters_cape", cost: 150, slayerLevelRequired: 30 },   // ≈ 27 Aufträge, 4–5 h
```
Einordnung: Umhang-Leiter ist dünn (Spinnenseiden-Mantel, Fernkampf 30: Kern 3 · Leeren-Umhang, Magie 65: Kern 19). Kern 9 liegt darüber und unter der nächsten Craft-Stufe; der Chase-Umhang des Bandes (Seefahrer-Umhang, req 30: dex 10, con 10, cooldownOnKill) bleibt klar besser. `firstBlood` kollidiert mit keinem Set-Effekt (kein Max-Konflikt beim späteren Ornat). NICHT ins Set aufnehmen (achievements.test pinnt die identische pieces-Liste beider Set-Einträge).

### 4.5 Bewusst NICHT vorgeschlagen

- **Klassen-Varianten (Platte/Leder/Stoff je Slot):** 12 Items + 12 Assets + Set-Umbau; für 1.1.x zu teuer. Das gemischte Ornat (Platte-Helm, Platte-Beine, Leder-Handschuhe) ist für alle Stile tragbar, weil Mitigation und Dodge stilneutral wirken. Später als „Ornat je Klasse" denkbar.
- **Task-Block, Task-Erweitern, Slayer-XP-Schriftrolle** (Ur-Spec §7): brauchen State/Engine (SAVE-Bump) bzw. ein verbotenes XP-Buff-Kind. Nicht in diesem Zug.
- **Shop-Chase-Etage** (Turm-Rework-Spec §4.4: Stiefel 1.500 / Cape 2.500 / Amulett 4.000 Pkt): das Turm-Rework (7 Etagen, Wächter-Elites) ist bis heute NICHT umgesetzt (Content hat 5 Etagen); die Chase-Etage sollte mit ihm kommen, nicht davor.
- **Preise senken über die Armschienen hinaus:** Die Ökonomie ist gesund; die Ware wird gut, nicht billig.
- **`maxPurchases`:** Engine setzt es nicht durch (kein persistierter Zähler). Doppelkauf ist sinnlos (nicht stapelbar); Punkte→Gold über Verkauf (Helm 8.000 Gold Wert für 650 Pkt) liegt bei ~200 Gold/h und ist kein Loop.

### 4.6 Apply-Liste (geordnet, content-dev)

1. `slayer_helm`: `armorRating: 24.41`, `weaponEffect bounty 0.20`, `skillBoost` entfernen, Beschreibung EN/DE (§4.1).
2. `slayer_greaves`: `armorRating: 21.78`, `weaponEffect giantSlayer 0.20`, `skillBoost` entfernen, Beschreibung (§4.1).
3. `slayer_vambraces`: `evasionRating: 11.76`, `weaponEffect healOnKill 4`, Beschreibung (§4.1).
4. `slayer_set_4pc`: `skillBoost` entfernen, `bonus: { hpRegenPerSec: 0.15 }`, Kommentar neu (§4.2).
5. `slayerShop`: Liste aus §4.3 (Armschienen 260, Draught-Gate 20, blighted_bone/forge_ember raus), Kommentarblock neu.
6. Locale-Overlays (`content/locales/*`) für die drei geänderten Beschreibungen und ggf. den Set-Namen unverändert lassen; die übrigen 5 Sprachen nach dem Glossar nachziehen.
7. Volle Suite laufen lassen (`pnpm test`, Cache-Falle beachten); erwartete Berührungen s. §5.
8. Optional (Chef-GO + Asset): `slayer_hunters_cape` + Shop-Zeile (§4.4).

---

## 5. Auswirkungen auf Guards und Balance-Hülle

**balance-envelope.test.ts §2 (harte Kappen):** Die drei Effekte (`bounty`, `giantSlayer`, `healOnKill`) sind Kampf-Multiplikatoren in combat.ts und tauchen in computeStats nicht auf; die Trinity-Werte sind exakt die Craft-Anker der nächsten Stufe, die der Voll-Stack ohnehin schon trägt. Kein Deckel (Krit, Tempo, Dodge 0,40, Block, Mitigation 0,80, Lifesteal, Pet-DR, Konter-Caps) kann dadurch reißen.

**§3/§4/§5 (gepinnte Werte):** `buildBisCharacter` wählt je Slot per argmax über Score; Gleichstand → kleinere Id. Prüfung mit den vorgeschlagenen Werten:
- Tank CL 90, Helm: Aetherium-Vollhelm (AR 24,41, con 7) vs. Slayer-Helm (AR 24,41, con 7) → Gleichstand, `aetherium_fullhelm` < `slayer_helm` → unverändert. **Pin 552,07 bleibt.** Beine: Frostplatten 27,5 > 21,78 → unverändert. CL 30/60: Slayer-Helm/-Beine sind mit req 80/65 nicht legal (CL 60 < 65).
- Dodge CL 60, Handschuhe: Himmelsgriff (EV 11,76, dex 2) schlägt heute schon Eisenleder (dex 1) und damit auch die Slayer-Armschienen (dex 1) → unverändert; CL 90: Geisterleder 16,24 → unverändert. **§3 „Dodge-Cap bindet ab CL 60" und §5-Matrix bleiben.**
- Ward, Lifesteal, Krit, Haste, Damage: keine Attribut-, Bonus- oder wardCapacity-Änderung an einem Item → Auswahl und Pins identisch. Das Set wird vom Bauer nicht gezielt zusammengestellt (Slot-argmax), die 4pc-Regen erscheint in keinem Pin.
- **Rote Linie für content-dev:** Helm-AR > 24,41 oder con > 7 verschiebt den Tank-Pin CL 90; Armschienen-EV > 11,76 oder dex > 2 verschiebt die Dodge-Pins CL 60/90. Bei exakter Übernahme bewegt sich nichts.

**§4 Buff-Exklusivität, §7 Shop-Ökonomie, §8 Meister-Perks:** unberührt (keine neuen Buffs, kein Gold-Shop, kein masterPerk).

**Weitere Guards:**
- `drop-gear-beats-craft.test.ts` (content): prüft nur Kampf-Loot; Shop-Ware ist nicht betroffen. Die Werte halten die #8-Regel trotzdem ein (≥ nächste Craft-Stufe, Effekt vorhanden, Requirement ≤ Quelle).
- `sim-consistency` Leiter-Monotonie: Familienschlüssel enthält den Requirement-Skill (`slayer`) → die Slayer-Teile sind Einzelfamilien, keine Leiter-Aussage. Boost-Platzierungs-Guard: `slayer_`-Präfix ist Signatur-Ausnahme.
- `sim-consistency` Erreichbarkeit / `wiring-audit` / `enchant.test` (Shop-Items müssen existieren und produzierbar sein): Streichen von blighted_bone/forge_ember ist sicher, beide bleiben Monster-Loot; abyssal_core bleibt im Shop, die Helm-Rezeptkette (`forge_tower_compound`) bleibt erreichbar.
- `itemization-guards` Set-Krönung („genau 1 Boost-Key je Set, falls skillBoost"): erfüllt durch Entfernen des 4pc-Boosts (2pc behält `attack: 2`).
- `achievements.test` (identische pieces-Liste slayer_set/slayer_set_4pc): unverändert.
- `content-integrity` / Locale-Overlay: Beschreibungen zweisprachig, ≤ 1 Gedankenstrich je Text (Hausregel), Effekt-Felder im Vertrag `{ type, chance: 1, magnitude, durationMs: 0 }`.
- Enchant-Klassen-Gate: die Teile werden mit Trinity-Runen verzauberbar (Rüstungs-Rune auf Helm/Beine, Ausweich-Rune auf Armschienen) wie jede Rüstung ihrer Klasse.
- **SAVE:** kein State-Feld, kein Bump; Bestands-Saves mit getragenem Ornat bekommen die neuen Werte beim nächsten computeStats.

**Sim-Block:** Turm-TTK und Bronze-Baseline unverändert (der Sim-Held trägt kein Slayer-Gear). Erwartete Sim-Flags: keine neuen.

---

## 6. UI-Empfehlung für den Shop (an ui-dev)

Die Stufensortierung ist in `SlayerPage.tsx` bereits gelandet (`slayerShopSorted` nach `slayerLevelRequired`); darauf aufbauend drei Dinge:

1. **Drei Regale statt einer Wand:** Karten unter Zwischenüberschriften „Schlüssel", „Ornat" (Ausrüstung), „Tränke" (Reihenfolge so), innerhalb nach Stufe; die Schlüsselzeile klein, das Ornat groß mit sichtbarer Effektzeile („+20 % gegen dein Auftragsziel") direkt auf der Karte, denn der Effekt ist jetzt der Kaufgrund.
2. **„Reicht" sichtbar machen:** Karten, die man sich leisten kann und deren Stufe erreicht ist, bekommen eine grüne Kante und den aktiven Kaufen-Knopf; alle anderen zeigen statt des Preises den Restwert als Auftragszähler („noch 23 Aufträge", Preis minus Punkte, geteilt durch die letzte Auftragsvergütung, mindestens 5), damit der Spieler ein Sparziel sieht statt einer Zahl.
3. **Punktestand und Bezugsgröße oben am Regal** („Deine Slayer-Punkte: 187 · zuletzt 5 je Auftrag · Serie 7"), gesperrte Stufen bleiben gedimmt mit Schloss, aber lesbar (Vorfreude), und der Set-Fortschritt („Ornat 2/4, nächster Bonus bei 4") gehört als Leiste über die Ornat-Karten.

---

## 7. Nebenbefunde (außerhalb des Auftrags, an den CEO)

7.1 **`skillBoost: { defence: N }` ist im ganzen Katalog tot.** Betroffen mindestens: die Amulett-Leiter (Blutstein 2, Diamant 2, Onyx 3, Herzgeschmiedet 3, Leerenstein 3, Göttenstein 5), Umhänge (Rauchgewebe 2, Sturm-Mantel 3, Leerenpirscher 4, Schlackengewebe 4, Mantel des Letzten Götzen 5), Stiefel/Handschuhe/Beine mit +Vert. 1–4 (Frostschutz, Pfotenschritt, Rußschuppen, Chitin, Gezeitengewebe, Frostplatten, Leerenberührte Stulpen, Krone des Götzen, Aethergewebe, Götzenschritt). Alle zeigen „(+N)" auf einen Skill, der keinen Kampfterm mehr speist. Entweder computeStats bekommt einen Defence-Term zurück (Konzeptfrage Trinity) oder die Boosts werden auf lebende Skills/Attribute umgeschlüsselt. Eigener Auftrag.
7.2 **Craft-Pfad der Armschienen ist 30 Level zu spät:** Item-Requirement Slayer 50, Rezept braucht Seelenschinder-Reißzahn (Etage 5, Slayer 80). Vorschlag für später: Input `soul_flayer_fang ×3` → `basilisk_scale ×8 + dread_fang_shard ×3` (Etage 2/4).
7.3 **„Über alle Kampfstile" stimmt nur halb:** +Angriff auf Armschienen/Amulett/2pc-Set wirkt nur im Nahkampf. Mehrfach-Boost (attack/ranged/magic) ist für Sets per Guard verboten und für Items ungeprüft; belassen, aber Beschreibungen sollten nicht „alle Stile" versprechen.

---

## 8. Update 26.08.2026 (Chef-Entscheid „Slayer omnifunktional", löst 7.3)

Chef-Befund: Helm/Beinschienen/Armschienen hatten kein int, Armschienen/Amulett-`skillBoost` boostete nur
`attack`. Chef-Entscheid: „Slayer-Helm sollte Stats haben für alle 3 Kampfrichtungen, ist ja ein
omnifunktionaler Gegenstand, genau so wie die restlichen Slayer-Items." Das Slayer-Set ist damit die
EINZIGE benannte Ausnahme der Trinity-Klassenregel #p14 (`suffix-class-fit.test.ts` `SLAYER_OMNI_SET`, nur
feste `modifiers`; Suffix-Rollen folgen weiter der Klasse) und des 1-Boost-Guards
(`itemization-guards.test.ts` §8.3: Omni-Boost attack = ranged = magic zählt als ein Boost, weil ein
Kampf nur einen Stil nutzt). Alle Tabellen oben (§3–4) sind Zustand **vor** diesem Update.

| Item (Slot, Klasse) | Vorher | Nachher |
|---|---|---|
| Slayer Helm (Helm, Platte) | str 4, dex 2, con 11 | str 4, dex 4, int 4, con 7 (Budget 17 → 19) |
| Slayer Beinschienen (Beine, Platte) | str 3, dex 1, con 7 | str 3, dex 3, int 3, con 7 |
| Slayer Armschienen (Handschuhe, Leder) | dex 1, con 7, lck 3 · skillBoost `{attack:3}` | str 2, dex 2, int 2, con 7, lck 3 · skillBoost `{attack:3, ranged:3, magic:3}` |
| Slayer Amulett (Schmuck) | str 3, dex 1, con 4, int 3, lck 5 · skillBoost `{attack:3}` | str 3, dex 3, con 4, int 3, lck 5 · skillBoost `{attack:3, ranged:3, magic:3}` |
| Jägerumhang (Cape, Schmuck) | str 2, dex 2, con 3, int 2 | unverändert (schon ausgeglichen); Beschreibung neutral („Treffer" statt „Schlag") |

Hüllen-Pins (`balance-envelope.test.ts` §5) neu gemessen, Begründung im Testkopf; §2-Kappen unberührt.

7.4 **Turm-Rework-Spec vom 17.07.** (7 Etagen, Wächter, Shop-Chase-Etage) ist offen; der heutige Endgame-Pool-Kollaps (Bone Colossus) besteht weiter. Dieser Shop-Vorschlag ist damit kompatibel und ersetzt ihn nicht.
