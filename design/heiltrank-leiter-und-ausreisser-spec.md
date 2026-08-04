# Heiltrank-Leiter-Restage + Material-Guard-Ausreißer (Task #320)

Balance-Spec, read-only erstellt am 2026-07-24. Apply durch content-dev (Teil 1, Teil 2a) und
kontrolleur/content-dev (Test-Anpassungen Teil 2b). Alle Ist-Werte gegen `packages/content/src/index.ts`
und die Engine-Guards verifiziert (Zeilenangaben = Stand heute).

---

## Teil 0 — Mechanik-Fakten (verifiziert, bindend für die Rechnung)

1. **Heilformel** (`packages/shared/src/index.ts:1288`):
   `consumableHeal = max(healAmount, round(maxHp · healPct))` — **Hybrid-MAX, nicht additiv.**
   Der Chef-Befund „3 + 12 %" liest sich additiv, ist aber `max(3, 12 %)`. Konsequenz: flach trägt
   nackt/früh, `healPct` trägt gerüstet/spät. Beide Felder sind eigenständige Stellschrauben.
2. **Auto-Trank** (`packages/engine/src/combat.ts:223-257`): trinkt bei `hp ≤ maxHp · healThreshold`.
   **Default-Schwelle = 40 %** (`AUTO_POTION_DEFAULT_THRESHOLD = 0.4`, shared:933), **nicht 75 %**
   (Korrektur zum Backlog-Eintrag; 75 % ist keine Konstante im Code). UI-Slider endet bei 90 %
   (`AUTO_POTION_MAX_THRESHOLD = 0.9`, shared:940). Cooldown 8 s (`AUTO_POTION_COOLDOWN_MS`, shared:931).
3. **Sustain-Deckel (Invariante, NICHT anfassen):** Top-Trank ≤ **25 % maxHp** pro Schluck →
   25 %/8 s ≈ 3,1 %/s Spitzendurchsatz, bewusst unter dem nackten on-level-Zufluss ~5 %/s
   (combat-feel-v2-spec.md „Tabelle B" + Kommentar shared:927-929). Jede Neustufung muss unter
   diesem Deckel bleiben → das Budget 12 %→25 % wird nur **umverteilt**, nicht erhöht.
4. **Überheilungs-Rechnung:** Bei Default-Schwelle 40 % fehlen beim Schluck ≥ 60 % maxHp — kein
   Trank der Leiter (≤ 25 %) überheilt. Erst ab Slider ≥ 75 % (Restlücke ≤ 25 %) können Top-Tränke
   überheilen; genau dort bleiben die niedrigen Stufen (12–17 %) die effizienten Picks. Diese
   Eigenschaft bleibt in der neuen Leiter erhalten (bewusst: kein Rung > 25 %).
5. **maxHp-Kurve** (nackt, `maxHp = 5 + con·2 + (vit−1)·0.3`, verifiziert in
   design/cooking-food-retune-spec.md §1): L1 = 11, L12 ≈ 29, L21 ≈ 42, L25 = 48, L30 = 56,
   L41 ≈ 74, L56 ≈ 97, L61 ≈ 105, L70 = 118, L81 ≈ 135, L85 = 142, L95 ≈ 157.
   **Gerüstet-Annahme** für die Tabellen unten: ×1,4 (typische con-Modifier + eq.maxHp im Band;
   z. B. Dragonhide-Set allein con 32 = +64 HP).

---

## Teil 1 — Heiltrank-Leiter neu stufen

### 1.1 Befund (bestätigt)

- `potion_minor_heal` (L1, 3 / 12 %, index.ts:720) und `potion_lesser_heal` (L12, 6 / 13 %, :721)
  brauen beide aus **2× herb_marshroot + 1× vial_of_water** (brew_minor_heal :10611-10616,
  brew_lesser_heal :10637-10644). Identische Materialidentität, +1 Prozentpunkt, +3 flach —
  als Upgrade unlesbar; minor ist ab L12 totes Rezept.
- Die pct-Leiter der 5er-Kernlinie (12/13/15/18/21 + renewal 23) hat ihre engsten Schritte
  **unten** (12→13→15), wo der Chef den Sprung vermisst, und die weiten (+3pp) oben.

### 1.2 Design-Entscheid

- **Flats bleiben unverändert** (3/6/9/15/24/36). Sie SIND die `heal_std`-Referenzleiter
  (consumables-enchantments-spec §1, Anker L1=3, L12=6, L21=9, L41=15, L61=24, L81=36) — eine
  Flat-Änderung würde jede Heil-Familie (Draughts ×1,5, Crop-Sinks, Cooking) neu eichen. Nackt
  bleibt die Leiter damit exakt wie heute (Sim-Worst-Case unberührt).
- **healPct wird neu gestuft:** Kernlinie von `12/13/15/18/21/23` auf **`12/15/17/20/22/24`** —
  jeder Schritt der Kernlinie ≥ 2pp (vorher min. 1pp), der beanstandete Schritt L1→L12 bekommt
  mit **+3pp** den größten Sprung. Die Crop-Sink-/Premium-Nachbarn rücken als echte Halbstufen
  dazwischen (+1–2pp), Familie bleibt streng monoton, Deckel 25 % bleibt allein bei
  `godbloom_infusion` (L95-Krone).
- **Materialidentität:** `potion_lesser_heal` bekommt eine eigene Zutat: **+1× essence_ash**
  (Ascheessenz, value 8, index.ts:625). Primärquelle `forage_ash_essence` ist **Foraging L12**
  (:8331-8342, 60 %) — exakt das Rezept-Band; Sekundärquelle sootcaps L6 (15 %). Kein neues Item,
  kampffreie Quelle (combatGate 0), Guard-neutral.

### 1.3 Apply-Tabelle Items (alt → neu je Feld, index.ts)

| id | Zeile | Herb-L (brew) | healPct alt → **neu** | healAmount | value alt → **neu** |
|---|---|---|---|---|---|
| potion_minor_heal | 720 | 1 | 0.12 → **0.12** (=) | 3 (=) | 20 (=) |
| potion_lesser_heal | 721 | 12 | 0.13 → **0.15** | 6 (=) | 35 → **45** |
| potion_heal | 722 | 21 | 0.15 → **0.17** | 9 (=) | 60 (=) |
| salve_of_mending | 507 | 25 | 0.16 → **0.18** | 10 (=) | 30 (=) |
| mandrake_tincture | 699 | 30 | 0.17 → **0.19** | 13 (=) | 140 (=) |
| potion_greater_heal | 723 | 41 | 0.18 → **0.20** | 15 (=) | 110 (=) |
| duskcap_tonic | 704 | 56 | 0.20 → **0.21** | 23 (=) | 245 (=) |
| potion_potent_heal | 724 | 61 | 0.21 → **0.22** | 24 (=) | 200 (=) |
| corpse_lily_salve | 711 | 70 | 0.22 → **0.23** | 30 (=) | 320 (=) |
| elixir_renewal | 725 | 81 | 0.23 → **0.24** | 36 (=) | 380 (=) |
| revenant_elixir | 516 | 85 | 0.24 → **0.24** (=) | 39 (=) | 400 (=) |
| godbloom_infusion | 713 | 95 | 0.25 → **0.25** (=) | 46 (=) | 900 (=) |

Familien-Leiter nach Level: 12, 15, 17, 18, 19, 20, 21, 22, 23, 24, 24, 25 — streng monoton;
einziges Tie renewal/revenant @24 ist dokumentiert ok (revenant differenziert über flach 39 > 36
und eigene voidbloom/wraithcap-Kette). Die HoT-Draughts (minor_healing_potion L1,
greater_healing_potion L16, bloodmend_draught L55) bleiben **unangetastet** (Task #244/#303,
kategorielose HoT-Mechanik, content-integrity §4.4).

- value-Begründung lesser 35→45: +1 Input (essence_ash 8) hebt die Inputkosten 14→22; Faktor
  Output/Input ≈ 2,0 = Familien-Norm (potion_heal: 60/30). Kein Shop-/Token-Listing betroffen (s. 1.6).

### 1.4 Apply-Tabelle Rezept (index.ts)

| Aktion | Zeile | Feld | alt | **neu** |
|---|---|---|---|---|
| brew_lesser_heal | 10642 | inputs | `[{herb_marshroot ×2}, {vial_of_water ×1}]` | `[{herb_marshroot ×2}, {essence_ash ×1}, {vial_of_water ×1}]` |

xp 14 / durationMs 5500 / levelRequired 12 bleiben (XP/h unverändert, Sweep4-P4-Kommentar :10639-10640 bleibt gültig).

Material-Quellen-Check aller 6 Kern-Rungs (Quelle ≤ Band + Toleranz, alle kampffrei → combatGate 0):

| Rung | Herb-L | Leitzutat | Quelle (Level) |
|---|---|---|---|
| minor | 1 | herb_marshroot | Foraging 1 (:8309) / Farming 8 |
| lesser | 12 | + essence_ash | **Foraging 12** (:8334) / Sekundär Foraging 6 |
| heal | 21 | herb_bloodthistle | Foraging 22 (:8358) / Farming 26 |
| greater | 41 | herb_gravemoss | Foraging 42 (:8404) / Farming 46 |
| potent | 61 | herb_nightbloom | Foraging 62 (:8458) / Farming 66 |
| renewal | 81 | herb_godsbreath + essence_divine | Foraging 82 (:8502); essence_divine Sekundär 87 (:8515) — ≤ 81+10, wie heute |

### 1.5 Effektive Heilung je Band (Beleg „jeder Sprung spürbar")

`eff = max(flach, round(pct·maxHp))`, jeweils am eigenen Unlock:

| Rung | maxHp nackt / gerüstet | eff ALT (nackt/ger.) | eff NEU (nackt/ger.) | Sprung ggü. Vorgänger (ger., NEU) |
|---|---|---|---|---|
| minor L1 | 11 / 15 | 3 / 3 | 3 / 3 | — |
| lesser L12 | 29 / 41 | 6 / 6 | 6 / 6 | +50 % nackt (4→6); pct-seitig zündet 15 % ab maxHp 40 statt 46 |
| heal L21 | 42 / 59 | 9 / 9 | 9 / **10** | +11 % ger., +50 % nackt (6→9) |
| greater L41 | 74 / 104 | 15 / 19 | 15 / **21** | +24 % ger. (17→21) |
| potent L61 | 105 / 147 | 24 / 31 | 24 / **32** | +10 % ger., +60 % nackt |
| renewal L81 | 135 / 189 | 36 / 43 | 36 / **45** | +18 % ger. |
| godbloom L95 | 157 / 220 | 46 / 55 | 46 / 55 | Krone, unverändert 25 % |

Break-even (ab welcher maxHp die % den Flat überholt) rückt überall vor: lesser 46→40,
heal 60→53, greater 83→75, potent 114→109, renewal 157→150 — d. h. gerüstete Spieler spüren die
%-Leiter deutlich früher; der nackte Sim-Worst-Case bleibt byte-identisch (Flats unverändert).
Sustain-Deckel: Top weiterhin 25 %/8 s ≈ 3,1 %/s ✔ (Invariante #3 hält).

### 1.6 Nebenwirkungen (geprüft)

- **Shop** (:12957 ff.): kein `potion_*`-Heiltrank gelistet; nur `vial_of_water` (2 g) ✔.
- **Token-Shop** (:15902 ff.): verkauft `minor_healing_potion`/`greater_healing_potion`
  (Draught-Linie) — von diesem Restage unberührt ✔.
- **Monster-/Quest-Loot:** keine Vorkommen der 6 potion_*-Ids außerhalb der Brau-Rezepte ✔.
- **Saves:** reine ContentDB-Felder, kein State → kein SAVE_VERSION-Bump ✔.
- **UI:** Tooltip zeigt healPct automatisch; keine UI-Arbeit.

---

## Teil 2 — Material-Guard-Ausreißer (G2-Allowlist, content-integrity.test.ts:377-418)

G2-Formel: `limit = max(req+10, req·1.3)`; Monster-Gate = `level`, Slayer = `max(level, slayerReq·1.6)`.

### 2.1 `dragonhide_*` (Ranged-Leder, req 82) — **Empfehlung: Quelle umhängen (Alternativ-Gerbrezept)**

**Ist:** 5 Teile req `ranged: 82` (:3309-3333), craftbar Leatherworking 82 (:9380-9408) aus
`dragonhide` ← `tan_dragonhide` (L78, raw_dragonhide ×2, :9356-9366). `raw_dragonhide`-Quellen:
tower_roc_void (Slayer-Etage 5, Gate = max(94, 80·1,6) = **128**, :12939), highland_wyvern L228
(:12107), roc_void L233 dungeonOnly (:12134), scale_skarn L275 dungeonOnly (:12344), wyvern_lair-
Clear-Loot 0,8×2-3 (req 95 + Quest, :13863 — zählt im Guard nicht). Gate 128 > limit 106,6.

**Warum kein Chase-Fall:** Rare-Drop-Philosophie schützt *seltene Drops* mit Next-Tier-Stats auf
aktuellem Req. Dragonhide ist ein **deterministisches Craft** und liegt statisch UNTER dem nächsten
Tier (body eva 32,24 < wraithhide 34,8 @L90, :3345) — es ist die reguläre 82er-Sprosse, kein Chase.
Der echte Leder-Chase (shadowhide_*, chitin_coif, frost_pelt_hood …) bleibt allowlisted. Chase bleibt Chase ✔.

**Warum nicht Requirement anheben:** Nur req ≥ 90 verließe den G2-Scope (bei 85/88 bleibt der Guard
rot: limit 110,5/114,4 < 128) — und req 90 kollidiert frontal mit wraithhide_* (das genau deshalb
als L90-Sprosse eingezogen wurde, armor-trinity-spec §11, :3335-3336). Redundante Doppel-Sprosse = schlechtere Leiter.

**Fix (band-gerechte Quelle, keine neuen Items):** neues Alternativ-Gerbrezept über die bestehende
Reptilien-Schiene — `basilisk_scale` (value 25, :4533, Beschreibung wörtlich „prized by
leatherworkers") von `gaze_basilisk` (Slayer-Etage 2, Drop 40 %, :12602; Gate = max(22, 20·1,6) = **32**)
plus `warhide` (combatGate 0 via cure_warhide ← scaled_leather, Thieving-Quelle L36 :8671):

| Neu: Aktion | Werte |
|---|---|
| `tan_dragonhide_scales` — EN „Tan Dragonhide (Basilisk Scales)" / DE „Drachenleder gerben (Basilisken-Schuppen)" | skill leatherworking, category `leather_dragonhide`, levelRequired **78**, durationMs **12000**, xp **824** (identisch zu tan_dragonhide → XP/h-neutral, kein neues Leveling-Optimum), inputs `basilisk_scale ×8 + warhide ×1`, loot `dragonhide ×1` |

- Ökonomie: Inputwert 8·25+180 = 380 > Output 320 (leicht negativ — On-Band-Zugang kostet Aufschlag;
  raw_dragonhide-Route bleibt mit 280→320 die effiziente Farm ab L95-Content). Body = 4 hides =
  32 Schuppen ≈ 80 Basilisk-Kills — spürbarer, aber fairer On-Level-Grind.
- Guard-Wirkung: `combatGate(dragonhide) = min(128, max(32, 0)) = 32` ≤ 106,6 → **G2 grün ohne Allowlist**.
  G3 gewinnt sogar eine gültige Leder-Sprosse @82 (bisher zählte dragonhide wegen Gate > Bandlimit nicht).
- Parität: Melee zieht sein L80-Band aus iron_sentinel L90 (titanium_ore, :12037), Magie seit F7 aus
  hollow_choir L80 (void_essence, :12023) — Ranged bekommt mit Basilisk/Warhide (≤ L36-Quellen +
  Leatherworking 82 als eigentlichem Gate) endlich das Äquivalent. Slayer-20-Nebengate der Etage 2 ist
  mit L82 trivial.

### 2.2 `void_focus` (Magie-Offhand, req 55) — **Empfehlung: Requirement anheben auf 65**

**Ist:** req `magic: 55` (:3843-3848), craftbar NUR via `enchant_void_focus` (**Runecrafting 65**,
void_rune ×6 + sapphire, :9821-9826). Kette: void_rune ← bind_void_rune RC65 (void_essence ×2,
:9802-9808); billigste void_essence-Quelle = hollow_choir **L80** Welt (:12023, F7-Fix); sapphire
kampffrei (rough_sapphire Foraging 27). → Gate **80** > limit(55) = 71,5.

**Begründung:** Kein Chase (deterministisches Craft, „bewusst schwächerer" Attribut-Nebenpfad laut
sim-consistency-Doku :85-88). Der eigentliche Konstruktionsfehler ist das Req/Craft-Mismatch: tragbar
mit Magie 55, craftbar erst mit RC 65, Material ab L80-Content — void_focus ist der einzige
void_rune-Verbraucher unter req 70 (bloodiron_staff 70, titanium 80 …). **req 55 → 65** heilt das:
limit(65) = max(75, 84,5) = 84,5 ≥ 80 → **G2 grün ohne Allowlist**; Träger-Level = RC-Rezept-Level.
Eine noch niedrigere void_essence-Quelle (≤ L71) einzuziehen würde dagegen die bewusste
„Void = Spät-Material"-Setzung des F7-Pakets unterlaufen — verworfen.

- Fokus-Nebenpfad liest sich danach 22 (frost) / 40 (aether_orb) / **65** (void) / 80 (god) — die
  Haupt-Craft-Leiter (Foki alle 10 Level bis 99) deckt jedes Band, G3 prüft Offhands nicht.
- Parität: kein Stil verliert eine Sprosse; Magie behält @55 den req-50-Craft-Fokus (adamantium, value 1050).
- Stats/value unverändert (int 2, lck 1, 1400) — als dokumentiert schwächerer Nebenpfad ok.

### 2.3 Allowlist-Schrumpfung (Ziel des Pakets)

`content-integrity.test.ts:384-387`: aus `isAllowlisted` **entfernen**:
`id.startsWith("dragonhide_") || id === "void_focus"`. Verbleibt exakt die Spec-dokumentierte
Chase-Liste: `voidweave_*`, `voidhide_*`, `shadowhide_*`, `chitin_coif`, `frost_pelt_hood`.
Kommentarblock :377-383 entsprechend kürzen (der „2 neu aufgedeckte Nebenlinien"-Absatz entfällt).

---

## Teil 3 — Guard-/Test-Auswirkungen (was beim Apply mitzuziehen ist)

| Test | Wirkung | Aktion |
|---|---|---|
| engine/content-integrity.test.ts G2 (:377-418) | dragonhide/void_focus fallen aus der Allowlist, rechnen neu grün (Gate 32 bzw. 80 ≤ 84,5) | Allowlist + Kommentar editieren (2.3) |
| engine/content-integrity.test.ts G3 | nur besser (neue gültige Leder-Sprosse @82) | keine |
| engine/content-integrity.test.ts §4.3/§4.4 | Heiltrank-Restage berührt keine Buffs/Kategorien; Zähler `tagged = 44` unverändert | keine |
| engine/sim-consistency.test.ts LADDER_BASELINE (:47-104) | void_focus req 65 ändert Leiter-Nachbarn: Pin `"adamantium_focus->void_focus"` (:89) wird stale → entfernen; erwartetes neues Paar `"runite_focus->void_focus"` pinnen (gleiches dokumentiertes „Nebenpfad schwächer"-Muster). Fingerprint nach Testlauf verifizieren | Pin-Tausch |
| engine/auto-potion / combatlog-source / kill-cooldown.test.ts | nutzen ausschließlich `potion_minor_heal` (bleibt byte-identisch) | keine |
| engine/food-hybrid.test.ts | synthetische Items, keine Content-Pins | keine |
| engine/tower-monsters.test.ts (Klon-Guard roc_void) | keine Loot-Änderung an roc_void/tower_roc_void | keine |
| sim.test / XP-Sim | keine xp/duration-Änderung (nur inputs/healPct/value + 1 neues Rezept auf Kurve) | Sichtprüfung XP/h |
| i18n (content/locales/*.ts) | neue Action `tan_dragonhide_scales` braucht Namens-Keys (EN/DE oben; ZH/RU/ES/PT-BR/FR über den Lokalisierungs-Overlay-Flow, Fallback EN bis dahin) | Keys nachziehen |

Kein SAVE_VERSION-Bump nötig (reine ContentDB-Änderungen; neues Rezept ist additiv).

---

## Teil 4 — Apply-Liste (geordnet, für content-dev)

1. index.ts:721 `potion_lesser_heal`: healPct 0.13→0.15, value 35→45.
2. index.ts:10642 `brew_lesser_heal.inputs`: `essence_ash ×1` ergänzen.
3. index.ts healPct-Restage: :722 potion_heal 0.17 · :507 salve_of_mending 0.18 · :699
   mandrake_tincture 0.19 · :723 potion_greater_heal 0.20 · :704 duskcap_tonic 0.21 · :724
   potion_potent_heal 0.22 · :711 corpse_lily_salve 0.23 · :725 elixir_renewal 0.24.
   (minor/revenant/godbloom unverändert.) Kommentare „Tabelle B" um Verweis auf diese Spec ergänzen.
4. index.ts nach :9366: neues Rezept `tan_dragonhide_scales` (Werte s. 2.1).
5. index.ts:3847 `void_focus.requirements`: magic 55→65.
6. content-integrity.test.ts:384-387: `dragonhide_`/`void_focus` aus Allowlist streichen, Kommentar kürzen.
7. sim-consistency.test.ts:89: Pin `adamantium_focus->void_focus` entfernen; nach Testlauf erwartetes
   neues Paar (voraussichtlich `runite_focus->void_focus`) mit Begründungskommentar pinnen.
8. Locale-Keys für `tan_dragonhide_scales` (actions:…:name) nachziehen.
9. `pnpm test` (Turbo-Cache beachten!) — erwartete Deltas exakt: Teil-3-Tabelle.

---

## Teil 5 — Patchnotes-Entwürfe (spielerlesbar)

EN:
- "Healing potions now step up in clearly bigger jumps: the Herblore ladder scales from 12% up to 25% of your max health, with each new tier a real upgrade."
- "Lesser Healing Potions have their own recipe now, fortified with Ash Essence instead of copying the Minor recipe."
- "Dragonhide can also be tanned from Basilisk Scales and Warhide, so the level 82 ranged set is craftable on-level. The Void Focus now requires Magic 65, matching its void-shard craft."

DE:
- "Heiltränke steigen jetzt in klar spürbaren Sprüngen: Die Kräuterkunde-Leiter skaliert von 12 % bis 25 % eurer maximalen Lebenspunkte, jede Stufe ist ein echtes Upgrade."
- "Schwache Heiltränke haben ein eigenes Rezept bekommen und werden mit Ascheessenz verstärkt, statt das Rezept des kleinen Heiltranks zu kopieren."
- "Drachenleder lässt sich nun auch aus Basilisken-Schuppen und Kriegsleder gerben, damit das 82er-Fernkampf-Set auf seinem Level herstellbar ist. Der Leeren-Fokus erfordert jetzt Magie 65, passend zu seinem Leerensplitter-Rezept."
