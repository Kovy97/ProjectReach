# Item-Drop-Audit: Monster-Level vs. Item-Power vs. Anforderungen (Task #339)

**Datum:** 2026-07-25 · **Autor:** Balance-Designer · **Status:** Analyse + Vorschlag, KEINE Content-Edits — Chef-Entscheid ausstehend.
**Datenquelle:** ausschließlich `packages/content/src/index.ts` (Live-Katalog, per Skript vollständig extrahiert: 713 Equipment-Items, 110 Monster, 28 Elite-Varianten, 8 Dungeons, Paragonturm). Zonen-Bänder und CL-Reise übernommen aus `design/dungeon-level-ladder-analyse.md` (Task #338, §1.1/§5) — keine eigenen Bänder erfunden.
**Tabu laut Auftrag:** Kreaturen-HP/-Schaden. Stellschrauben hier: Item-Stats, Requirements, Loot-Tabellen-Zuordnung, Drop-Chancen.

---

## 0. Der Chef-Fall, beim Namen genannt

Der Fund ist der **Aschfelder-Elite `elite_ash_beetle`** („Cinderhusk", Basis: pitch_beetle **L42** — die drei Aschfelder-Elites liegen bei L34/38/42, das ist der „~35er-Elite"). Er trägt gleich ZWEI Items, auf die die Beschreibung passt:

| Item | Rolle am Elite | Req | Stats | Vergleich Craft-Anker |
|---|---|---|---|---|
| `cinderhusk_bulwark` (Unique, **20 %** Chance/Kill) | DIE Elite-Belohnung | **defence 16** | AR 11.5, Block 28 % | zwischen **Steel-Schild** (def 20: 11.22/27.6 %) und Blacksteel (def 30: 12.14/30.4 %) |
| `sootscale_greaves` (extraLoot 2.5 %) | aufgewerteter Zonen-Drop | **defence 16** | AR 11.88 | zwischen **Iron-Beinen** (def 10: 11.02) und Steel (def 20: 12.47) |

Der Skandal daran, quantifiziert: das 20-%-Unique `cinderhusk_bulwark` ist **strikt schwächer als der 2.5-%-NORMAL-Drop desselben Basis-Monsters** — `chitin_bulwark` (def 34, AR 12.55, Block 31.5 %). Der Belohnungsmoment eines Elite-Kills liefert weniger als der gewöhnliche Zonen-Loot daneben. Der Chef hat also keinen Einzelausrutscher gefunden, sondern das einzige Elite-Unique, das die dokumentierte Elite-Philosophie („Next-Tier-Stats beim aktuellen Req-Fenster") komplett verfehlt — die Nachbar-Elites derselben Zone machen es richtig (`mireclutch_fang`: exakte Mithril-Dolch-Stats bei att 26 = Lehrbuch).

**Wichtig zur Einordnung (Rare-Drop-Philosophie, Chef-Entscheid):** „Niedrige Req an raren Drops" ist NICHT der Befund — das ist bei ~1/1000-Chase-Items gewollt (Stats des NÄCHSTEN Tiers bei Req des AKTUELLEN). Der Befund ist das Gegenteil: Stats UNTER dem, was das Quellen-Level verspricht. Genau das liegt hier vor.

---

## 1. Tier-Anker (aus den regulären Craft-Reihen — der Maßstab)

Alle Werte aus dem Live-Katalog. „Schwert" = 1H-Referenzwaffe (dmgMin–Max @ Tempo ms); Rüstung = Body-Slot je Familie (Trinität: Platte AR / Leder EVR / Stoff WARD); Schild = Kiteshield AR/Block.

| Tier | Req-Level | Schwert (att) | Platte-Body (def) | Kite-Schild (def) | Leder-Body (ran) | Stoff-Body (mag) |
|---|---|---|---|---|---|---|
| Copper | 1 | 0.7–1.2 @2900 | 13.35 | 9.72 / 22.3 % | leather 6.43 (–) | apprentice 14 (1) |
| Bronze | 5 | 1.0–2.0 | 14.08 | 10.01 / 23.4 % | cured 9.8 (5) | — |
| Iron | 10 | 1.8–3.4 | 15.02 | 10.39 / 24.8 % | — | dimweave 17 (10) |
| Steel | 20 | 2.3–4.2 | 17.01 | 11.22 / 27.6 % | hardened 13.5 (20), scaled 15.54 (28) | frost 22.5 (22) |
| Blacksteel | 30 | 2.9–5.4 | 19.15 | 12.14 / 30.4 % | — | ember 30.9 (30) |
| Mithril | 40 | 3.5–6.5 | 21.46 | 13.19 / 33.2 % | duskhide 18.6 (40) | aether 41.4 (40) |
| Adamantium | 50 | 4.4–8.2 | 23.98 | 14.38 / 36 % | studded 21.9 (50) | arcane 64.8 (55) |
| Runite | 60 | 5.6–10.4 | 26.71 | 15.74 / 38.8 % | ironhide 25.84 (62) | duskweave 72 (64) |
| Bloodiron | 70 | 6.9–12.8 | 29.7 | 17.3 / 41.6 % | warhide 28.4 (70) | runewoven 100.7 (70) |
| Titanium | 80 | 8.7–16.2 | 32.99 | 19.1 / 44.4 % | dragonhide 32.24 (82) | godspark 142.9 (85) |
| Aetherium | 90 | 10.8–20.1 | 36.61 | 21.2 / 47.2 % | wraithhide 34.8 (90), shadowhide 37.97 (95) | starweave 164.7 (92) |
| Godiron | 99 | 13.6–25.2 | 37.5 | 21.74 / 49.7 % | voidhide 40.5 (99) | voidweave 192 (99) |

Diese Leiter ist in sich sauber (glatt steigend, keine Klippen) — sie ist NICHT das Problem. Das Problem ist, welche Sprosse an welcher Kampf-Quelle hängt.

## 2. Zonen-Fenster (übernommen aus #338)

Erwartetes Spieler-Fenster (Kampfskill-Level) je Zone, aus der CL-Reise §5 der Leiter-Analyse + Dungeon-Gates:

| Zone (Monster-Band) | Spieler-Fenster | erwarteter Gear-Anker |
|---|---|---|
| pastures (1–15) | 1–15 | Copper–Iron |
| borderlands (15–30) | 15–30(→45 Wand) | Iron–Steel |
| ashfields (30–45) | 30–50 („Trivial-Tal" dokumentiert) | Steel–Mithril |
| blackthorn (45–65) | 50–62 | Mithril–Runite |
| crypt (65–90) | 62–80 | Runite–Bloodiron |
| wildwood (90–112) | 78–83 | Bloodiron–Titanium |
| coast (120–155) | 83–88 | Titanium |
| slagpit (155–200) | 88–92 | Titanium–Aetherium |
| highlands (200–242) | 92–95 | Aetherium–Godiron |
| idolhall (245–310) | 95–99 | Godiron |
| slayer_tower F1–F5 (3–96) | F1 5–15 · F2 20–40 · F3 45–60 · F4 60–75 · F5 75–95 | analog |

Elite-Mechanik (engine/elites.ts): Unique-Chance **20 %**/Kill (+5 % bloodmoon), dazu rollt der Elite die UNVERÄNDERTE Basis-Loot-Tabelle plus extraLoot (aufgewertete Zonen-Chase-Chancen, Konzept §3.3). Elite-Uniques sind also verlässliche Belohnungsmomente, keine 1/1000-Chase-Items — sie MÜSSEN sich lohnen.

---

## 3. Befunde

### A. Unterperformer (Stats deutlich unter Quellen-Anker) — 11 Befunde (5 Einzel-Items, 6 System-Blöcke, ~22 Loot-Tabellen)

**Einzel-Items (alle Elite-Uniques, die das Muster ihrer gesunden Geschwister brechen):**

| # | Item | Quelle | IST | SOLL-Anker |
|---|---|---|---|---|
| A1 | `cinderhusk_bulwark` | elite_ash_beetle L42 (**Chef-Fall**) | def 16, AR 11.5/28 % ≈ Steel | Mithril-Schild (13.19/33.2 %) bei def ~30 |
| A2 | `morvane_warplate` | elite_slag_revenant L175 (Zone CL 88–92) | def 62, AR 27.5 ≈ Runite+ | Titanium+ (AR ~34.5) bei def 80 — Zonen-Geschwister furnaceheart (mag 90) & rimebound (mag 92) sitzen korrekt |
| A3 | `shellfather_aegis` | elite_coast_crab L120 (Zone CL 83–88) | def 55, AR 16.5/40 % ≈ Bloodiron− | Titanium+ (19.6/45 %) bei def 82 — Geschwister saltgrave (att 90) & tideterror (mag 88) sitzen korrekt |
| A4 | `palemourn_shroud` | elite_high_specter L237, **legendär** | Cape int4/wis3 — schwächer als das L65-CRAFT-Cape void_shroud (dex1/con1/int4/wis7) | int6/wis6/lck3 (antiRegen bleibt der Kicker) |
| A5 | `ashtongue_fetish` | elite_border_warlock L30 | Offhand mag 18, int1/wis1 — unter steel_focus (mag 20: int1/wis2/lck1) | knapp ÜBER steel_focus: int2/wis2/lck1 (catalyst bleibt) |

**System-Blöcke (ganze Loot-Tabellen unter Fenster):**

| # | Block | Quellen | Befund |
|---|---|---|---|
| A6 | **Krypta-Skelette** | skeleton_warrior/archer/spearman/butcher/icemage/pyroclasp L65–85 (+3 dg_-Twins) | Equipment-Rows sind die **Slayer-Turm-F2-Tabelle** (iron/steel, req 10–30): iron_sword, boneblade att16, cryptguard def16, tombplate def24, frostbone mag28, gravesteel def30. Für das CL-62–80-Publikum wertlos; on-band liefern nur hollow_choir L80 (att63/mag72) und iron_sentinel L90 (att82). Auf den Turm-Twins (L36/38, Fenster 20–40) sitzt dieselbe Tabelle KORREKT. |
| A7 | **Wildwood-Weltmonster** | forest_hare L90, gray_wolf L97, wild_stag L104, dire_wolf L112 | Drops att12–34/def18–26/ran18–30 fürs CL-78–83-Fenster; die thematische Jäger-Zone droppt **null on-band-Leder** (warhide-Ära). Einzige Ausnahmen: Elite blackantler_warbow ran82 ✓, direfang_maul (Chase ✓). |
| A8 | **Coast-Weltmonster** | mud_crab L120, reef_drowned L128, tide_siren L138 | Drops req 8–36 (coral_shiv att8, reefscale def20, siren_shockstaff mag36) fürs CL-83–88-Fenster. Nur deep_kraken/abyssal_tide_serpent (att60/ran90) + Elites zahlen aus. |
| A9 | **Slagpit-Turm-Twins** | ember_elemental L168, iron_revenant L175, frost_hound L182, frost_hexer L188 | Teilen die Loot-Tabellen ihrer Slayer-Turm-F3/F4-Twins (def 50–62, dort KORREKT). Zonen-Fenster wäre 88–92. |
| A10 | **Highlands-Früh-Monster** | roc L200 (talon_dagger att35), roc_hunter L208 (def50/55, ran50) | 2 von 6 Weltmonstern zahlen nur 40er/50er-Ware ins 92+-Fenster; Rest der Zone (cloudwalker def80, wyvernscale, void_titan) ist gesund. |
| A11 | **Dungeon-Clear-Tabellen unter Gate** | goblin_warband (Gate 45): Clear = con2-Cape + mag-12-Stab (Boss-Drops warchief att50/def50 sind ok!) · crypt_depths (70→75): bestes Clear-Item = att-40-Chase-Klinge · wildwood_hunt (82): att34/ran38 · wyvern_lair (95): ran70/def75 · highland_aerie (90): teils (storm_mantle ran50) | Die „Abschlussprüfung" zahlt unter ihrem eigenen Gate. Gegenbeispiel idol_sanctum (95): komplett on-Gate ✓. |

### B. Req-Inversionen (Req verlangt eine Ära, Stats liefern eine andere — passt weder zu Quelle noch Philosophie) — 4 Befunde

| # | Item | Quelle | IST | Diagnose |
|---|---|---|---|---|
| B1 | `thornfang_blade` | thorn_wolf L54, 2 % | att **46**, dmg 2.7–3.5 @3000 | DPS unter Steel-Schwert (att 20!); Adamant-Req, Steel-Leistung |
| B2 | `bramble_witchstaff` | bramble_witch L60, 2 % | mag **52**, dmg 1.7–2.5 @3000 | exakt Steel-Stab-Schaden bei Adamant-Req |
| B3 | `mire_fang_dagger` | mire_crawler L38, 2.5 % | att **30**, dmg 1.4–1.8 @2600 | DPS unter IRON-Dolch (att 10) bei Blacksteel-Req |
| B4 | `spectral_coif` | spectral_stag L58, 2 % | ran **50**, **EVR 0** (nur mods dex1/con1/lck3) | Leder-Helm OHNE evasionRating = Trinity-Datenfehler; das Craft-Pendant studded_leather_helm (ran 50) hat EVR 14.6 UND mods — Drop strikt schlechter als Craft bei gleicher Req |

(Beobachtet, aber kein harter Befund: `skybreaker_greatsword` att 65 von roc_elder L215 — philosophie-förmig gebaut, nur die Quelle ist 2 Zonen zu spät; wird vom A10-Fix miterledigt.)

### C. Tote Slots (Level-Bereiche ohne relevante Kampf-Drops) — 2 Löcher + 1 Beobachtung

| # | Loch | Detail |
|---|---|---|
| C1 | **Platte def 55–75 aus Welt-Zonen** | Zwischen moss_plate_body (def 48, blackthorn) und tidewoven (def 50, coast-Filler) droppt keine Welt-Zone on-band-Platte der Runite/Bloodiron-Ära — die Krypta (der natürliche Ort) ist voll mit Iron/Steel (A6). Nur der Slayer-Turm F3/F4 (def 50–62) und Elites decken es. Der A6-Fix schließt das Loch. |
| C2 | **Leder ran 60–80 aus Drops** | Zwischen warden_brigandine (ran 56) und wyvernscale (ran 70, erst highlands L228/wyvern_lair!) existiert kein Leder-Drop — genau das Fenster, in dem der Spieler durch die Jäger-Zone Wildwood läuft (A7-Fix schließt es). |
| C3 | Beobachtung, kein Handlungsbedarf: **Stoff/Ward < mag 45** kommt praktisch nur aus Craft (frost/ember-Reihen); erster Welt-Stoff-Drop ist das Elite-Unique thorncrown (mag 45). Per „Combat ist fundamental"-Doktrin ok — Craft darf Familien tragen. |

### D. Korrekt per Philosophie — NICHT anfassen (damit sie nicht als Fehler gelesen werden)

**18 von 23 Elite-Uniques sitzen sauber** im Muster „Next-Tier-Stats beim aktuellen Req-Fenster + Signatur-Effekt", teils punktgenau auf den Craft-Anker der übernächsten Stufe:

- `hungerfang_tusk` att 8 = exakte Steel-Dolch-Stats · `impbone_wand` mag 8 > Iron-Wand · `blackhoof_charm`, `carrion_talisman` (Schmuck, über Juwelier-Anker) · `quietstep_boots` ran 12 = Duskhide-Niveau (ran 40!) · `flayers_hook` att 15 = exakte Blacksteel-Schwert-Stats · `mireclutch_fang` att 26 = exakte Mithril-Dolch-Stats · `briarfang_blade` att 42 = exakte Adamant-Schwert-Stats · `oldgrowth_plate` def 40 > Adamant-Body · `thorncrown` mag 45 = Duskweave-Ward (mag 64!) · `marrowcleaver` att 62 > Bloodiron-Greataxe · `hoargrim_scepter` mag 58 = exakte Bloodiron-Wand-Stats · `pyrebound_vestment` mag 58 = Runewoven-Body-Ward · `greytooth_mantle` (Unikat-Effekt Lifesteal-Cape) · `blackantler_warbow` ran 82 > Titanium-Longbow · `saltgrave_cutlass` att 90 = exakte GODIRON-Schwert-Stats · `tideterror_grip` mag 88 > Godspark-Handschuhe · `furnaceheart_core` mag 90 (= Aetherium-Focus + surplus-FX) · `rimebound_leggings` mag 92 = exakte Voidweave-Skirt-Ward · `skyfather_recurve` ran 92 > Godiron-Shortbow · `ridgetyrant_greaves` ran 72 mit EVR 31 > Voidhide-Beine (ran 99!) · `ninth_wardens_signet`, `hollowveil_locket` (Schmuck, godiron-würdig).

**Chase-Drops nach Rare-Drop-Philosophie (niedrige Req + Next-Tier-Stats bei ≤0.1 % — GEWOLLT):** `ash_tyrant_crown` (0.03 %), `nekro_reaperblade` (0.02 %, Adamant+-Stats@att 40 + Lifesteal), `direfang_maul` (0.04 %), `emberforge_hammer` (0.03 %), `colossus_marrowaxe` (0.15 %), `doomknight_cinderblade`/`doomforged_band` (0.01 %), `voidwing_greatbow`/`void_titan_mantle` (0.02 %), `cinder_spike`, `mire_hexstaff`, `ashfall_recurve`, `ashwood_longbow`, `stagstride_longbow`, `gorehorn_cleaver`, `bulls_heart_pendant`, `soulflayer_amulet`, `sevenfold_crown_chain` u.a. — alle korrekt.

**Ebenfalls gesund:** Slayer-Turm F1–F5 komplett (die Tabellen passen auf die TURM-Level — deshalb bricht es erst, wenn Zonen-Twins sie erben, s. A6/A9) · idol_sanctum/behind_the_throne/Paragon-Truhen (godiron-konsistent) · warchief-Boss-Drops (on-Gate) · pastures/borderlands/blackthorn-Weltloot · Elite-extraLoot-MECHANIK (aufgewertete Zonen-Chancen — richtig so; nur die dahinterliegenden Zonen-Items sind teils die A-Befunde).

---

## 4. Warum es „willkürlich" wirkt — zwei Wurzelursachen

1. **Geteilte Loot-Tabellen zwischen Slayer-Turm-Twins und Welt-Zonen-Versionen.** Die Skelette (Turm F2 L36/38 = Krypta L65–85) und Elementare (Turm F3/F4 L50–74 = Slagpit L168–188) tragen identische Tabellen, getunt für die TURM-Inkarnation. Auf der Zonen-Seite wirken sie 3–5 Tiers zu schwach.
2. **Endgame-Re-Tiering der Monster-Level ohne Loot-Nachzug.** Die Monsterskala wurde bis L310 gestreckt (CL-Cap bleibt 99, #338 A1), die Loot-Reqs/Stats der frühen Item-Generation (wildwood/coast/highlands-Frühmonster, Dungeon-Clear-Tabellen) blieben auf dem alten Stand. Alles bis Blackthorn + der ganze Turm sind sauber; ab der Krypta klafft es.
3. Dazu 5 Elite-Uniques (von 23), die ohne den Next-Tier-Anker bepreist wurden — der Chef hat mit dem Käfer exakt den schlimmsten erwischt.

---

## 5. Soll-Prinzip (einfache Zuordnungsregel Quelle → Item)

Gear-Anker = Tier-Tabelle §1, Zonen-Fenster = §2.

| Quellen-Typ | Stat-Anker | Req-Fenster | gesundes Beispiel |
|---|---|---|---|
| **Normal-Drop** (0.1–3 %) | Tier des Zonen-Fensters (±1 Tier); Flavor-/Gold-Rows darunter erlaubt, aber **mind. 1 on-band-Equipment-Row pro Monster-Trio** | Fenster-Mitte ±8 | chitin_bulwark, moss_plate_body, warden_brigandine |
| **Chase-Drop** (≤0.05 %) | **NÄCHSTES** Tier (+Spezialeffekt ab ~1/1000) | AKTUELLES Fenster — niedrige Req ist hier Feature | nekro_reaperblade, ash_tyrant_crown |
| **Elite-Unique** (20 %/Kill) | nächstes Tier + Signatur-FX; **nie schwächer als der beste Normal-Drop der Zone in derselben Familie** | Zonen-Fenster-ANFANG | thorncrown, briarfang, saltgrave |
| **Elite-extraLoot** | = aufgewertete Zonen-Chase-Chancen (folgt automatisch Normal/Chase) | — | überall ✓ |
| **Dungeon-Clear/Chest** | ≥ Zonen-Top-Anker (Abschlussprüfung); mind. 1 Rüstungs-/Waffen-Row **on-Gate** | Gate ±5 | idol_sanctum |
| **Slayer-Turm** | Etagen-Fenster (F1 5–15 … F5 75–95) | dito | F3/F4 ✓ |
| **Turm-Twin ↔ Zonen-Version** | Tabellen TRENNEN: Turm behält die heutige, die Zonen-Version bekommt eigene on-band-Rows | — | (der A6/A9-Fix) |

---

## 6. Alt → Neu (Vorschlagstabelle für den Chef-Entscheid)

**P1 — Elite-Uniques (reine Zahlenänderung, 5 Items):**

| Item | Feld | Alt | Neu | Begründung (1 Zeile) | Power-Impact |
|---|---|---|---|---|---|
| cinderhusk_bulwark | req / AR / Block | def 16 / 11.5 / 28 % | **def 30 / 13.4 / 33.5 %** | Chef-Fall: Elite-Belohnung muss den 2.5-%-Normal-Drop (chitin_bulwark) schlagen; Mithril-Anker = Next-Tier zum Zonen-Fenster, Req = Fenster-Anfang (Muster thorncrown/briarfang) | bester Schild der Ära bis Adamant-Craft (L50); +1 AR/+2 pp Block über chitin_bulwark — spürbar, nicht brechend |
| morvane_warplate | req / AR | def 62 / 27.5 | **def 80 / 34.5** | Slagpit-Geschwister (furnaceheart 90, rimebound 92) sitzen im Fenster, morvane 3 Tiers drunter | zwischen Titanium- und Aetherium-Body — Elite-würdig für CL 88–92 |
| shellfather_aegis | req / AR / Block | def 55 / 16.5 / 40 % | **def 82 / 19.6 / 45 %** | Coast-Geschwister (saltgrave 90, tideterror 88) korrekt; Titanium+-Anker | Schild knapp über Titanium-Kite — passend |
| palemourn_shroud | modifiers | int4/wis3 | **int6/wis6/lck3** | Legendär vom L237-Elite darf nicht unter dem L65-Craft-Cape (void_shroud) liegen | Cape-Slot, moderat |
| ashtongue_fetish | modifiers | int1/wis1 | **int2/wis2/lck1** | Elite-Unique knapp ÜBER steel_focus statt drunter; catalyst-FX bleibt der Kicker | minimal |

Lockout-Hinweis (Save-Kompat-Gesetz): Req-Erhöhungen können Bestandsbesitzer aussperren (Besitzer mit def < 30 bzw. < 80/82). Die Items sind seit 0.2.0 (23.07.) live, Elite-Uniques = 20 %-Drops eines Neu-Features → Betroffenenkreis winzig, und alle Änderungen sind Buffs. Variante B, falls der Chef 0 Lockout will: Reqs lassen, nur Stats heben — dann sind es aber „zu früh zu starke" 20-%-Drops (nicht empfohlen; die 5 Items wären stärker als alles Craftbare ihrer Req-Stufe bei verlässlicher Chance).

**P2 — Req-Inversionen (4 Items, Stats hoch auf die Req-Ära):**

| Item | Feld | Alt | Neu | Begründung | Power-Impact |
|---|---|---|---|---|---|
| thornfang_blade (att 46) | dmg | 2.7–3.5 @3000 | **4.2–6.4 @3000** | 2-%-Zonen-Row liefert Steel-DPS bei Adamant-Req | ≈ Adamant-1H mit lck2+bleed — on-band |
| bramble_witchstaff (mag 52) | dmg | 1.7–2.5 @3000 | **3.4–5.0 @3000** | exakt Steel-Stab bei mag-52-Req | ≈ Adamant-Stab + poison |
| mire_fang_dagger (att 30) | dmg | 1.4–1.8 @2600 | **2.2–3.3 @2600** | liegt unter dem Iron-Dolch; ist aber die tragende 2.5-%-Row der Aschfelder | ≈ Blacksteel-Dolch (tempobereinigt) |
| spectral_coif (ran 50) | evasionRating | 0 | **15.0** | Leder-Helm ohne EVR = Trinity-Datenfehler; studded-Anker 14.6 | gleichauf mit Craft + lck-Bonus — fairer Drop |

Dazu Kleinteil (optional, hängt prominent im Chef-Fall-extraLoot): `sootscale_greaves` def 16→30, AR 11.88→**14.0** und `chitin_helm` def 12→30, AR 10.27→**12.8** (Blacksteel-Anker — macht die 2.5-%-Elite-extraRows der Aschfelder fühlbar).

**P3 — Block-Fixes per „Beikost-Rows"** (bestehende CRAFT-Items als Drops — etabliertes Muster: ash_tyrant droppt iron_sword 5 %, forest_warden mithril_longbow 4 %; null neue Assets, null neue Items, kein Power-Creep, nur Beschaffungsweg + Gold-Wert). Turm-Twins bleiben UNVERÄNDERT — nur Zonen-/dg_-Versionen bekommen Zusatz-Rows:

| Quelle | neue Row(s) | Begründung |
|---|---|---|
| skeleton_warrior (+dg_) | +1 % runite_sword | Krypta zahlt erstmals on-band (CL 62–80 = Runite/Bloodiron) |
| skeleton_archer (+dg_) | +1 % runite_shortbow | dito |
| skeleton_spearman | +0.8 % runite_spear | dito |
| skeleton_butcher (+dg_) | +0.6 % runite_platelegs | dito, schließt Loch C1 |
| skeleton_icemage (+dg_) | +0.7 % runite_wand | dito |
| skeleton_pyroclasp | +0.5 % bloodiron_medhelm | Zonen-Top → Bloodiron-Einstieg |
| gray_wolf | +0.5 % warhide_vambraces | Jäger-Zone droppt endlich Leder ihrer Ära (Loch C2) |
| wild_stag | +0.5 % bloodiron_longbow, +0.3 % warhide_legs | dito |
| dire_wolf | +0.25 % warhide_body | dito |
| mud_crab | +0.3 % titanium_towershield | Coast = Titanium-Fenster |
| reef_drowned | +0.4 % titanium_kiteshield | dito |
| tide_siren | +0.4 % titanium_wand | dito (Caster-Thema) |
| ember_elemental (nur Zone) | +0.25 % aetherium_gauntlets | Slagpit = Aetherium-Fenster |
| iron_revenant (nur Zone) | +0.2 % aetherium_platelegs | dito |
| frost_hound (nur Zone) | +0.25 % aetherium_sabatons | dito |
| frost_hexer | +0.3 % aetherium_wand | dito |
| roc / roc_hunter | +0.2 % aetherium_medhelm / +0.25 % aetherium_shortbow | Highlands-Frühmonster zahlen ins 92+-Fenster (niedrigste Prio) |

**P4 — Dungeon-Clear-Tabellen (je +1 on-Gate-Row):**

| Dungeon (Gate) | neue Clear-Row | Begründung |
|---|---|---|
| goblin_warband (45) | +1.5 % mithril_platebody | Abschlussprüfung zahlt on-Gate (Boss-Drops sind schon ok) |
| crypt_depths (70→75 per #338) | +1.2 % bloodiron_platelegs | dito |
| wildwood_hunt (82) | +1 % warhide_body | dito, Leder-Thema |
| highland_aerie (90) | +1 % aetherium_fullhelm | dito |
| wyvern_lair (95) | +0.8 % aetherium_platebody | dito |

Später darf content-dev einzelne Beikost-Rows per kreativer Item-Lizenz durch thematische Uniques ersetzen (z.B. „Grabwacht-Platte" statt runite_platelegs) — P3/P4 ist der sofort wirksame Null-Asset-Fix.

---

## 7. Leitplanken für die Umsetzung

- **KEINE Änderungen an Kreaturen-HP/-Schaden/-Level** (Tabu, parallel zu #338 A9).
- **Turm-Tabellen (F1–F5) nicht anfassen** — sie sind der Beweis, dass die Tuning-Methode funktioniert.
- **Alle D-Liste-Items (§3) nicht anfassen** — 18 gesunde Elite-Uniques + Chase-Items sind Philosophie, keine Fehler.
- Alle P1/P2-Änderungen sind reine ItemDef-Zahlen, alle P3/P4 reine LootRoll-Zeilen → **kein neuer State, kein SAVE_VERSION-Bump** (Loot/Items sind Content, nicht Save). Einzige Kompat-Frage ist der P1-Lockout-Hinweis oben (Patchnote-Zeile genügt).
- Guards: content-integrity-Tests prüfen Trinity-Felder je Rüstungsklasse („streng steigend je Tier") — die P2-Werte sind auf die Anker gelegt; kontrolleur soll `pnpm test` FRISCH laufen lassen (Turbo-Cache-Falle).
- Drop-Chancen der neuen Rows (0.2–1.5 %) liegen im Korridor der bestehenden rare-Rows; kein Gold-Ökonomie-Effekt > Rauschen (Item-values der Beikost = Craft-Werte, Verkauf über SELL_FRACTION wie gehabt).

## Apply-Liste (geordnet, für content-dev nach Chef-GO)

1. **P1** cinderhusk_bulwark (Chef-Fall) + morvane_warplate + shellfather_aegis + palemourn_shroud + ashtongue_fetish — 5 ItemDef-Zahlenänderungen exakt nach §6-Tabelle.
2. **P2** thornfang_blade, bramble_witchstaff, mire_fang_dagger, spectral_coif (+optional sootscale_greaves, chitin_helm) — Stats nach §6.
3. **P3** Beikost-Rows Krypta (6 Monster + dg_-Twins) → Wildwood (3) → Coast (3) → Slagpit (4, NUR Zonen-Versionen) → Highlands (2, niedrigste Prio); Turm-Monster explizit unangetastet lassen.
4. **P4** 5 Dungeon-Clear-Rows.
5. kontrolleur: frisches `pnpm test`, Stichprobe Turm-F2/F3-Tabellen unverändert, Patchnote-Zeile P1-Lockout.
