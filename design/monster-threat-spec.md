# Monster-Threat-Spec L100–295 — Skalierungsregel, Abweichungstabelle, Apply-Liste (2026-07-09)

**Auftrag:** L2 aus `design/balance-redteam-2026-07-09.md` — die Monster-Level↔Bedrohungs-Inkohärenz („Papier-Monster") als SKALIERUNGS-REGEL beheben, nicht als Einzelwert-Flickerei. Read-only-Spec; content-dev appliziert Abschnitt 6 verbatim.

**Verifikation:** alle Zahlen unten sind mit dem Red-Team-Harness gegen die echten Engine-Pfade gerechnet und simuliert (Scratchpad `threat-fit.ts`, `threat-verify.ts`, `threat-v4b.ts`; Sims = `combatStep`-Loops, 30 min Spielzeit je Zelle). Die Evasion-/Tempo-Spec-Änderungen (CHEF-GO: Gegner-Accuracy **+0,35·(level−150)**, Dodge-Cap 0,40, Tempo-Cap −20 %) sind in allen Soll-Rechnungen **emuliert und eingepreist** (§7).

---

## 1) Befund (Kurzfassung)

Die Kampfwerte der Monster folgen ab ~L100 dem Level nicht mehr: `reef_drowned` (L128) schlägt mit 14 Schaden, `skeleton_icemage` (L80) mit 38. Gleichzeitig skaliert die Kill-XP mit dem Level-Label weiter. Folgen (Red-Team-Report L2): L10-Char farmt L245 mit 0 Toden bei 171× Ziel-XP; Kampf-L1-Skiller tötet den Finalboss; BiS-99 tötet den Finalboss 552×/h.

## 2) Modell: L1–99 = Skill-Band, L100–295 = Gear-Band

Die Spieler-Kampfkraft hat zwei Phasen: bis Combat-Level 99 (CL-Formel cappt bei 99, `dungeon.ts`) wächst sie exponentiell mit den Skills; darüber wächst NUR noch Gear (Tiers, Suffixe ilvl→99, Enchants: ~×2–4 über die 99-Baseline). Die Monster-Threat-Kurve muss dieselbe Form haben:

- **L ≤ 99:** heutige Kurve ist gesund (deskriptiver Fit §4) — **nicht anfassen.**
- **L 100–295:** eigene, FLACHERE Exponential-Kurve, verankert an der 99er-Basis und an der BiS-99-Referenz am L295-Ende. Die naive Fortschreibung der ≤99-Steigung wäre der Doppel-Nerf-Overkill (sie liefert 18 801 Schaden am L295 — unspielbar für alle; im Harness nachgewiesen und verworfen).

## 3) DIE REGEL (für alle bestehenden UND künftigen Monster L ≥ 100)

Trash-Basiskurven (L = Monster-Level; `exp`-Basis e):

```
dmg_trash(L) = 45  · e^(0.00748 · (L − 99))     // 45 @L99 → 195 @L295;  ×1.078 je +10 Level
hp_trash(L)  = 170 · e^(0.01392 · (L − 99))     // 170 @L99 → 2600 @L295; ×1.149 je +10 Level
acc_base(L)  = 6.6 + 0.07 · L                    // flach! Die Treffsicherheits-Schärfe ab L150
                                                 // liefert der Engine-Surcharge der Evasion-Spec
                                                 // (+0.35·(L−150)) — NICHT doppelt in Content legen.
```

Familien-Multiplikatoren (auf dmg/hp, NICHT auf acc):

| Klasse | Kriterium | dmg | hp |
|---|---|---|---|
| Trash | Standard-Zonenmob | ×1,0 | ×1,0 |
| Elite | Dungeon-Welle (nicht final) ODER Slayer-Tower ODER `regen > 0` | ×1,15 | ×1,5 |
| Boss | `enrage` gesetzt ODER finaler Dungeon-Encounter | ×1,2 | ×2,2 |

Anwendungsregeln:
1. **Nie senken:** `soll = max(ist, Kurvenwert)` je Feld (kein Monster wird schwächer; ein bereits über der Kurve liegender Wert bleibt).
2. **Ward zählt als HP:** Soll-HP-Budget = `hp_trash(L)·Mult`; bei Caster-Gegnern (`wardCapacity`) werden maxHp und Ward **proportional** auf das Budget skaliert (Ward-Anteil bleibt erhalten).
3. **Identitäts-Achsen unangetastet:** `attackIntervalMs`, `evasion`, `defense`, `resist`, `inflict`, `regen`, `enrage` bleiben wie sie sind (die Identität des Mobs; kein Doppel-Nerf mit den spielerseitigen Dodge-/Tempo-Caps).
4. **XP/Gold/Loot unangetastet** (Chef-Vorgabe: kein Endgame-XP-Retune). Angenehmer Nebeneffekt: die XP-Effizienz normalisiert sich über die Soll-HP von selbst (idol_warden: 17 → 2,8 XP/HP — zurück im gesunden Band 2–6).
5. Rundung: ganzzahlig (Tabelle §6 ist fertig gerundet).

## 4) Herkunft der Anker (deskriptiver Fit der gesunden Bahn)

OLS auf allen Trash/Elite-Monstern L5–99 (n=61): `ln(dmg) = 1.678 + 0.0267·L` (r²=0,91), `ln(hp) = 2.617 + 0.0249·L` (r²=0,61), `acc = 6.62 + 0.0702·L` (r²=0,68). Der 99er-Anker (dmg 45 / hp 170) ist das reale Top des gesunden Bandes (gray_wolf L97: 46 dmg; icemage L80: 161+48 HP) — bewusst NICHT der Fit-Extrapolationswert (74,9), der am Bandende überschießt. Der 295er-Anker (Trash 195 / 2600) ist an der BiS-99-Referenz kalibriert (§8: Boss-Inflow ≈ 60 % des Tank-Sustains; Boss-TTK 3–6 min).

Boss-Normierung ≤99 (zur Mult-Wahl): bestehende Bosse liegen bei dmg ×0,9–1,4 / hp ×2,4–3,4 über ihrer Trash-Kurve → dmg ×1,2 / hp ×2,2 ist die konservative Mitte (×3 HP scheiterte in der Verifikation: Tank-TTK > 3 min UND Tode, §8-Iteration).

## 5) Klassifikation der L≥100-Monster

Boss: dire_wolf, forest_bear, deep_kraken, voidhusk_crusher, charred_doomknight, roc_storm, highland_wyvern, roc_void, void_titan, last_idol. Elite: wild_stag, tide_siren, abyssal_tide_serpent, iron_revenant, frost_hound, frost_hexer, roc, roc_hunter, roc_elder, gravecliff_specter, idol_warden, aether_wraith, scale_skarn. Trash: mud_crab, reef_drowned, pit_spider, slag_kobold, ember_elemental.

## 6) APPLY-LISTE (content-dev: verbatim; nur die 4 genannten Felder je Monster)

| id | Klasse | L | damage ist→soll | maxHp ist→soll | wardCapacity ist→soll | accuracy ist→soll |
|---|---|---|---|---|---|---|
| wild_stag | Elite | 104 | 11→**54** | 77→**273** | — | 12→**14** |
| dire_wolf | Boss | 112 | 14→**60** | 100→**448** | — | 12→**14** |
| mud_crab | Trash | 120 | 13→**53** | 52→**228** | — | 11→**15** |
| forest_bear | Boss | 120 | 17→**63** | 152→**501** | — | 14→**15** |
| reef_drowned | Trash | 128 | 14→**56** | 69→**255** | — | 12→**16** |
| tide_siren | Elite | 138 | 15→**69** | 92→**337** | 28→**102** | 12→**16** |
| deep_kraken | Boss | 150 | 19→**79** | 147→**761** | — | 14→**17** |
| pit_spider | Trash | 155 | 17→**68** | 80→**371** | — | 12→**17** |
| abyssal_tide_serpent | Elite | 155 | 21→**79** | 192→**556** | — | 15→**17** |
| slag_kobold | Trash | 162 | 18→**72** | 90→**409** | — | 12→**18** |
| ember_elemental | Trash | 168 | 18→**75** | 100→**342** | 30→**102** | 13→**18** |
| iron_revenant | Elite | 175 | 19→**91** | 123→**734** | — | 13→**19** |
| frost_hound | Elite | 182 | 20→**96** | 137→**810** | — | 14→**19** |
| frost_hexer | Elite | 188 | 21→**101** | 152→**676** | 46→**204** | 15→**20** |
| voidhusk_crusher | Boss | 195 | 24→**111** | 224→**1423** | — | 16→**20** |
| roc | Elite | 200 | 22→**110** | 112→**1040** | — | 15→**21** |
| charred_doomknight | Boss | 200 | 26→**115** | 268→**1526** | — | 17→**21** |
| roc_hunter | Elite | 208 | 23→**117** | 138→**1163** | — | 16→**21** |
| roc_elder | Elite | 215 | 24→**123** | 164→**1282** | — | 16→**22** |
| roc_storm | Boss | 222 | 24→**136** | 208→**2072** | — | 17→**22** |
| highland_wyvern | Boss | 228 | 26→**142** | 245→**2253** | — | 18→**23** |
| roc_void | Boss | 233 | 28→**147** | 288→**2415** | — | 18→**23** |
| gravecliff_specter | Elite | 237 | 29→**145** | 308→**815** | 350→**926** | 18→**23** |
| void_titan | Boss | 242 | 31→**157** | 358→**2738** | — | 19→**24** |
| idol_warden | Elite | 245 | 27→**154** | 320→**1946** | — | 14→**24** |
| aether_wraith | Elite | 260 | 29→**173** | 180→**744** | 400→**1654** | 15→**25** |
| scale_skarn | Elite | 275 | 30→**193** | 360→**2955** | — | 15→**26** |
| last_idol | Boss | 295 | 32→**234** | 480→**5725** | — | 16→**27** |

(28 Monster; alle anderen Felder unverändert. Monster < L100: NICHTS ändern.)

## 7) Wechselwirkung mit der Evasion-/Tempo-Spec (kein Doppel-Nerf)

Arbeitsteilung: Die Evasion-Spec liefert die **Treffsicherheit** (Engine-Surcharge acc +0,35·(L−150); am L295 effektiv ~+51) und deckelt spielerseitig Dodge (0,40) und Tempo (−20 %). Diese Spec liefert NUR **Schaden + HP**; die Content-`accuracy` bleibt auf der flachen Basiskurve (§3), damit der Surcharge nicht doppelt zählt. Dodge-/Tempo-Cap betreffen Spieler-Stats und kollidieren mit keiner Soll-Zahl.

Nachgerechnet (beide Red-Team-Szenarien, 30-min-Sims, Auto-Eat mit passendem Food; „heute" = aktueller Content):

| Szenario | heute | NUR Evasion-Spec | Evasion-Spec + Threat-Soll |
|---|---|---|---|
| L10-Basisgear vs idol_warden (L245) | 15 Kills / **0 Tode** / 220 513 XP/h | 15 / **0** / 220 546 XP/h | **0 Kills / 122 Tode** / 26 265 XP/h |
| Skiller-Twink (Kampf L1) vs last_idol (L295) | 5 Kills / **0 Tode** / 760 706 XP/h | 5 / **0** / 778 329 XP/h | **0 Kills / 82 Tode** / 29 896 XP/h |

Die Evasion-Spec allein ändert am Bypass **nichts** (beide Twinks tragen Platte — Accuracy-Surcharge erhöht nur die Trefferquote, aber 27–32 Schaden töten durch Auto-Eat nicht durch). Erst die Threat-Werte schließen ihn. Umgekehrt ist der Surcharge in den Soll-Ankern eingepreist — OHNE ihn müsste die Content-Accuracy steigen; MIT ihm bleibt sie flach. Zusammen = geschlossen, ohne dass eine Achse doppelt bestraft.

Rest-XP-Leck (26–30k XP/h): reines Chip-Damage-XP beim Sterben im Sekundentakt (122 Tode/30 min) — real erfordert JEDER Tod einen manuellen Neustart (Tod = harter Stopp, kein Auto-Respawn). Als Idle-Strategie tot; Optionen dagegen in §9.

## 8) Verifikation der Soll-Werte (Referenz-Builds, echte Sims)

Referenzen laufen in der „Post-Fix-Welt": Regen-Fix L1 emuliert (Gear-hpRegen ÷10), Buff-Stacking-Fix L3 emuliert (max. EIN Sustain-Tonikum). 30-min-Sims:

| Check | Build | Ergebnis | Zielband |
|---|---|---|---|
| Finalboss tötbar, mit Druck | BiS-Block-Tank (1H godiron + idol_aegis, Runen unique, Suffix 99, 1 Tonikum, Carapace-Pet, Top-Food+Trank) | **5 Kills / 0 Tode**, TTK ~5–6 min, Food 66/h | Kills > 0, Tode ≤ 2, TTK 3–6 min ✓ |
| Kein Face-Tank für Glass | BiS-DPS (ohne Rüstungsfokus) vs last_idol | 0 Kills / 24 Tode | stirbt ✓ (Mitigation ist Pflicht am Endboss) |
| Kein-Food-Tank stirbt | BiS-Tank ohne Food (Regen-Fix aktiv) vs last_idol | 0 Kills / 74 Tode | stirbt ✓ (Food-Druck zurück) |
| Einstiegs-Band offen | Frisch-99 (Rarity ≤ rare, keine Instanzen, Lobster+Trank) vs wild_stag/mud_crab/reef_drowned (Soll) | 50–66 Kills / **0 Tode**, Food ~314–380/h | farmbar mit Food-Druck ✓ |
| Rüstungspflicht | Nackter 99er vs reef_drowned (Soll) | 1 Kill / 48 Tode (15 min) | stirbt ✓ |

Ökonomie-Nebeneffekt: Endboss-Farmrate fällt von 552/h auf ~10–20/h → Loot-Erlös von ~1,4 Mio auf ~15–30k g/h, Chase-Waffen (1/110–1/125) von 4–5/h auf ~1 pro 6–10 h — die Rare-Drop-Philosophie trägt wieder, ohne dass eine Drop-Chance angefasst wird (Red-Team L6 erledigt sich hierüber weitgehend).

## 9) Aufwärts-XP-Dämpfung — OPTIONEN (getrennter Entscheid, liegt beim Chef)

Explizit getrennt von jedem Endgame-XP-Retune (abgelehnt): Es geht NUR um den Fall „Monster-Level ≫ eigenes Kampf-Skill-Level" (Anti-Bypass), nicht um die XP-Höhe für on-level Endgame-Spieler. Nach §6-Apply ist der Bypass mechanisch tot (0 Kills); übrig bleibt das Chip-XP-Leck (~26k XP/h bei Insta-Restart-Verhalten, §7).

- **Option A — symmetrische Bandbreite:** `combatXpLevelMult` bekommt eine zweite Flanke: volle XP bis Monster ≤ 30 Level ÜBER dem empfangenden Skill, linear auf 0 bei ≥ 80 drüber. Wirkung: L10 vs L245 → 0 XP (auch Chip-XP); L80-Skill vs L110-Mob → voll (legales Über-Level-Pushen unberührt); L50 vs L100 → 60 %. Risiko: bestraft extrem gear-getragenes, aber legitimes Hochkämpfen; eine Regel mehr im XP-System.
- **Option B — Kill-XP-Deckel:** Kill-Bonus-XP je Kill ≤ 25 % der XP-Distanz zum nächsten Level des empfangenden Skills (`monster.xp`-Anteil; Schadens-XP unberührt). Wirkung: L10 am 5 500-XP-Mob → ~27 XP/Kill (statt 5 500·earlyMult); bindet ab ~L40 praktisch nie. Schließt NUR die Kill-Bonus-Schiene, das Chip-XP-Leck bleibt (klein).
- **Option C — keine XP-Regel-Änderung (Empfehlung für den Launch):** Threat-Fix allein. Das Rest-Leck erfordert 122 manuelle Kampf-Neustarts pro 30 min für ~26k XP/h auf einem Low-Level — kein Idle-Pfad, schlechter als on-level spielen ab ~L25. Beobachten (Live-Telemetrie: Tode-pro-Stunde-Ausreißer), Option A als vorbereitete Nachrüstung.

## 10) Sim-Impact-Schranke & betroffene Tests

1. **Sim-Block (`pnpm test`) bleibt für L < 100 bit-identisch** — der Apply fasst ausschließlich die 28 Monster L ≥ 100 an; alle Persona-/Tower-Zeilen des Berichts (L7–94) sind unberührt.
2. **Kein `kills=0`-Fehlalarm:** der ungeared Sim-Char STIRBT ab L100 per Design (V6). Für L≥100-Zeilen gilt als Guard nicht der nackte Sim-Char, sondern: (a) Frisch-99 mit ≤rare-Gear farmt L104–128 mit 0–2 Toden (V5), (b) der V4b-Referenz-Tank tötet den härtesten Fall last_idol (5/30 min, 0 Tode). Beide Checks sind im Harness reproduzierbar.
3. **Testdateien, die L≥100-Monster referenzieren** (kontrolleur nach Apply prüfen/re-pinnen): `endgame-danger.test.ts` (pinnt Mechanik-Konstanten, wird durch HÖHERE Boss-Werte nicht falsch), `enrage.test.ts`, `bleed.test.ts`, `resistances.test.ts`, `sim-consistency.test.ts`, sowie die neue `balance-envelope.test.ts` (logic-dev-Revier — dort NICHT selbst ändern, logic-dev re-pinnt seine Envelope gegen die Soll-Werte).
4. Reihenfolge: NACH dem Regen-Fix (Red-Team L1) applizieren oder gemeinsam — die Verifikation (§8) gilt für die Post-Fix-Welt. Der Evasion-Spec-Apply (läuft) ist Voraussetzung für die Accuracy-Arbeitsteilung (§7).
