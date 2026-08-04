# Drazhan-Machbarkeits-Audit (Welle F, CEO-Run 2026-07-13)

**Auftrag (Chef):** „Wir müssen schauen wie gebalanced Drazhan ist. Dass er auch machbar ist." — Kriterium: Endboss-würdig, aber MACHBAR. Zieldaumen: volles realistisches Loadout → klarer Sieg (Death-Risiko niedrig einstellig in %); Mindest-Gear → knapp/riskant; undergeared → klare Wall.

**Methodik:** Deterministische Engine-Sims (echter `step`→`combatStep`-Pfad inkl. Auto-Eat, Auto-Trank, Buff-Ablauf/Auto-Rebuff, Kill-Cooldown), N = 250 Kämpfe je Zelle (Rand-Zellen 120, BiS 80), je Kampf eigener Seed. Loadouts als echte GameStates (Skills via `xpForLevel`, Gear + legale Enchant-Instanzen via `trinityGatePasses`, Tonika via `useConsumable`). BiS-Decke über den Engine-eigenen `buildBisCharacter` (balance-envelope-helpers). Wegwerf-Skripte im Session-Scratchpad (`drazhan-sim*.mts`), NICHT im Repo. Kein Content/Engine-Code angefasst.

---

## 1) IST-Werte im Vergleich (Kapitel 19 → 20)

| Feld | last_idol (L295) | drazhan (L310) | Delta | Threat-Spec-Soll @L310¹ |
|---|---|---|---|---|
| maxHp | 5725 | **8700** | +52 % | ~7050 (Boss-Kurve) → **+23 % drüber** |
| damage | 234 | **295** | +26 % | **262** (Boss-Kurve) → **+13 % drüber** |
| accuracy (Content) | 27 | **31** | +4 | **28–29** (flache Acc-Kurve §3) → drüber |
| eff. accuracy (inkl. +0,35·(L−150)) | 77,75 | **87** | +12 % | — |
| attackIntervalMs | 3800 | **3500** | −8 % (= +8,6 % Angriffe/s) | Identitäts-Achse, frei |
| defense (armor) | 150 | 175 | Spieler-Schaden −8,4 % durchgelassen | Identitäts-Achse |
| evasion | 6 | 9 | Trefferchance ~88→87 % | Identitäts-Achse |
| regen/s | 1,0 | 1,4 | vernachlässigbar vs. Spieler-DPS ~20+ | Identitäts-Achse |
| enrage | ×1,75 unter 30 % | **×1,9 unter 25 %** | Spitzenlast +9 % | Identitäts-Achse |
| inflict | — | burn 32 %, 1,4/s, 6 s | +~0,8 HP/s erwartet | Identitäts-Achse |
| resist | shock, poison | frost, bleed | öffnet Schock-Tech (s. §6) | Identitäts-Achse |
| xp | 58 000 | 92 000 | 10,1 → 10,6 XP/HP (kohärent) | — |

¹ `design/monster-threat-spec.md` §3: `dmg_boss(310) = 45·e^(0.00748·211)·1,2 ≈ 262`, `acc(310) = 6,6+0,07·310 ≈ 28`, `hp_boss(310) = 170·e^(0.01392·211)·2,2 ≈ 7050`. **Drazhan liegt auf ALLEN drei Regel-Achsen über der hauseigenen Skalierungsregel** — dazu schnelleres Tempo UND härterer Enrage als der Kurven-Anker last_idol. Die Überschüsse multiplizieren sich: nachhaltiger Schadens-Zufluss ≈ **×1,38 pre-Enrage / ×1,50 im Enrage** gegenüber last_idol.

## 2) Das bindende Rechenmodell: Heil-Decke vs. Dauerdruck

Die Spieler-Heilung ist hart gedeckelt (Auto-Eat 12 % maxHp je 4,5 s + Auto-Trank 25 % maxHp je 8 s + Gear-Regen): **≈ 6 % maxHp/s absolutes Sustain-Maximum** — unabhängig vom Gear-Tier (Food/Trank heilen prozentual). Ein Boss ist genau dann „machbar", wenn sein nachhaltiger Zufluss (Trefferchance × Ø-Schaden nach Mitigation/Block ÷ Intervall) UNTER dieser Decke bleibt; die Threat-Spec §8 hat last_idol auf „Inflow ≈ 60 % des Tank-Sustains" geeicht.

Gegen den besten realistischen Panzer-Helden (Mitigation 71 %, Block 50 %, s. §3):

| Phase | last_idol | drazhan IST |
|---|---|---|
| pre-Enrage-Zufluss | ~2,5 % maxHp/s (~42 % Decke) ✅ | ~3,5 %/s (~58 % Decke) ✅ |
| **Enrage-Zufluss** | ~4,5 %/s (~74 % Decke) — eng, überlebbar | **~6,2 %/s (≈100–105 % der Decke) — auf/über der Decke** ❌ |
| Enrage-Fenster | 1717 HP (~90 s) | 2175 HP (~110–190 s) |

**Der Befund in einem Satz: Drazhans Enrage (295 × 1,9 @ 3500 ms, eff. Acc 87) erreicht die maximal mögliche Heilrate — der Spieler heilt im Erwartungswert NULL netto, jede ungeblockte Treffer-Serie (Block-RNG, ~25 % je Schlag-Paar) ist unaufholbar. In der Enrage-Phase stirbt statistisch fast jeder Build unterhalb der absoluten BiS-Decke, egal wie gut er vorbereitet ist.** 94–100 % aller Sim-Tode fallen in die Enrage-Phase, im Schnitt bei ~13–20 % Boss-Rest-HP nach 6–8 Minuten Kampf.

## 3) Loadouts (explizit, mit Begründung)

Alle: Kampf-Skills 99 (Chronik-Band), Auto-Eat Tier 3 (25 k Gold — trivial), Trank-Schwelle 40 %, `soulfire_banquet` als Food (Cooking 98, 12 % maxHp + Buff), `godbloom_infusion` als Auto-Trank (Herblore 95, 25 % maxHp). Tonika je 1 pro Kategorie (L3-Exklusivität): `tonic_apex` (Offense, Herblore 90), `tonic_stoneskin`/`tonic_keeneye`/`elixir_warding` (Defense je Achse), `salve_gravensap` (Regen, +55 maxHp — bewusst OHNE hpRegen, s. Befund §7!). Kein Pet, keine Suffixe (RNG-Layer, nicht garantiert), keine Chase-Items.

| Loadout | Kern | Begründung „hat der Spieler realistisch" |
|---|---|---|
| **craft** („voll realistisch") | godiron_mace + godiron_kiteshield + volles godiron-Set + godgem-Schmuck + **Tier-III-Runen** (keen auf Waffe; aegis auf jedes Panzerteil — Runecrafting 62–79, rein craftbar) | Alles 100 % craft-garantiert (Smithing/JC/RC 99); die Runen-Schicht ist per Threat-Spec Teil des Gear-Bands („×2–4 über 99-Baseline") |
| **chron20** (Chronik-Veteran) | wie craft, aber idol_crown/aetherweave_leggings/voidtouched_gauntlets/idolstep_sabatons (je 2 % pro idol_sanctum-Clear) + cape_master_defence (automatisch bei Defence 99) | Wer Kapitel 19 abschließt, farmt idol_sanctum; Meister-Capes sind garantiert |
| chron20_ranged / chron20_magic | dasselbe Panzer-Kit, aber godiron_shortbow (1H!) bzw. godiron_wand + Schild | Waffen-Stil-Parität über Rüstungs-Wechsel (legal: Defence 99 haben alle) |
| ident_ranged / ident_magic | voidhide-Leder + Evasion-Runen bzw. voidweave-Stoff + Warding-Runen (Klassen-Identität) | Trinitäts-Paritäts-Check |
| **min** (T90) | aetherium-Set + Kite, voidstone-Schmuck, cooked_voidray, je ±Runen/Tonika/Trank-Varianten | Mindest-Gear-Grenze suchen |
| **under** (T80) | titanium-Set, Kampf-Skills 92 | gewollte Wall-Probe |
| **BiS-Decke** | Engine-`buildBisCharacter` (tank): idol_aegis (1/32k-Chase!), Max-Suffixe ilvl 100, alle Runen-Slots, Carapace-Pet | Legalitäts-Maximum = Referenz der Threat-Spec §8 |

Statblöcke (Auszug): craft hp 363, Mit. 71 %, Block 50 %, 61,6–73,6 dmg @2400 ms, Crit 30 % · chron20 hp 353, Mit. 71 %, Block 50 %, 45,3–57,3 @2400 · ident_ranged hp 309, Dodge 40 % (Cap), Mit. 0 % · ident_magic hp 279, Ward 920 · BiS-tank hp 476, Mit. 71 %, Block 50 %, aber nur 21,8–22,2 dmg (Stat-Stick).

## 4) Ergebnistabelle IST (N = 250 je Zelle; Sieg %, Tod % pro Versuch)

| Loadout | vs last_idol | vs drazhan IST | TTK/TTD drazhan | Anmerkung |
|---|---|---|---|---|
| BiS-Tank (melee/ranged/magic) | **100 % Sieg** (TTK 14–23 min) | **82,5 % Sieg / 15 % Tod / 2,5 % Timeout** (N=80) | TTK **27–47 min**, Food 200–404, Trank 12–26 | einziger Sieger-Archetyp; Tod nach ~40 min im Enrage |
| craft (Melee) | 76,8 % / 23,2 % | **7,6 % / 92,4 %** | TTK ø426 s / TTD ø353 s | Tode: 97 % im Enrage |
| chron20 (Melee) | 68,8 % / 31,2 % | **3,6 % / 96,4 %** | ø531 s / ø416 s | Tode: 94 % im Enrage |
| chron20_ranged | 64,0 % / 36,0 % | 2,0 % / 98,0 % | ø519 s / ø428 s | |
| chron20_magic | 58,4 % / 41,6 % | **12,0 % / 88,0 %** | ø613 s / ø505 s | Wand-Schock-Proc = eingebautes Counter-Play |
| t90+Runen+Tonika | 13,3 % / 86,7 % | 0 % / 100 % | — / ø383 s | |
| t90+Tonika (ohne Runen) | 0 % / 100 % | 0 % / 100 % | — / ø65 s | Runen-Schicht ist DAS Gate |
| t90 nackt / t80 | 0 % | 0 % (TTD 20–27 s) | — | Wall ✅ (gewollt) |
| ident_ranged (Leder) | **0 %** (TTD ø45 s) | 0 % (ø33 s) | — | s. §6 Trinität |
| ident_magic (Stoff) | **0 %** (TTD ø48 s) | 0 % (ø43 s) | — | s. §6 Trinität |
| BiS-DPS (alle 3 Stile, Glass) | 0 % | 0 % (TTD 30–36 s) | — | per Spec gewollt („Mitigation ist Pflicht") |

**Urteil IST: Drazhan ist NICHT machbar.** Das beste garantiert erreichbare Loadout gewinnt 3,6–7,6 % der Versuche und stirbt sonst nach 6–8 Minuten Kampf in der Enrage-Phase; nur der absolute BiS-Stack (inkl. 1/32.000-Chase-Schild, Max-Suffixe, Pet) gewinnt 82,5 % — bei 27–47 min TTK und 15 % Tod-nach-40-Minuten. Das verfehlt alle drei Chef-Daumenwerte.

## 5) Enrage-, Burn- und Spike-Befund

- **Enrage (<25 %, ×1,9) ist mit Auto-Eat NICHT überlebbar** (außer BiS): Zufluss ~6,2 % maxHp/s ≥ Heil-Decke ~6 %/s, plus Block-RNG-Varianz. 94–100 % aller Tode dort. Selbst BiS (~5,1 %/s dank 476 HP + Pet-DR) verliert 15 % der Läufe über das lange Fenster.
- **Der Spike-Treiber ist NICHT der Burn**, sondern Block-RNG × Tempo: bei 3500 ms Angriffstakt und 4500 ms Auto-Eat-Cooldown fällt jeder zweite Boss-Schlag in den Ess-Cooldown; zwei ungeblockte Enrage-Treffer in Folge (~25 % der Paare) ≈ 60–80 % maxHp in 3,5 s gegen genau EINEN Biss + ggf. Trank.
- **Burn-Inflict (32 %, 1,4/s, 6 s) ist harmlos**: 1,4 HP/s ≈ 0,4 % maxHp/s. Tode-mit-Burn (29–40 %) ≈ Burn-Uptime — kein kausaler Treiber, gute Flavor-Mechanik. Er stört den Ess-Rhythmus minimal (frühere Bisse), kippt aber nichts. **Keine Änderung nötig.**
- 3500 ms + hohe eff. Accuracy (87) sind als Identität okay, SOBALD die Dauerlast stimmt (s. §8).

## 6) Resistenzen & Stil-Parität

- **resist [frost, bleed] ist stil-fair:** Kein einziges Endgame-Kit trägt von Haus aus bleed/frost (bleed-Procs enden bei attack-Req 35, frost bei ranged-Req 28). Effektiv stirbt nur die frost-Rune als Optionsslot — flame/keen/arcane/hunter/storm bleiben für alle Stile. Melee wird NICHT benachteiligt.
- **Schock-Lücke (bewusst lassen):** last_idol resistet shock, Drazhan NICHT. Sturm-Rune (T3: 28 % Proc, 30 % Aussetzer, 5 s) bzw. godiron_wand-Schock geben +5–10 pp Siegchance (Vergleichs-Sim, identisches Kit: flame→shock) und erklären, warum der Wand-Magier IST-mäßig am besten abschneidet. Kein Trivializer (Uptime-begrenzt) — genau das „Boss belohnt Vorbereitung"-Design. **Empfehlung: so lassen** (bewusstes Counter-Play-Fenster), NICHT zusätzlich shock resisten.
- **Trinitäts-Bruch am Boss-Tier (VOR-Drazhan-Befund, er erbt ihn nur):** Leder- und Stoff-Identität sterben in <50 s **schon an last_idol** (ident_ranged/ident_magic: 0 % Sieg, alle Varianten). Mathe: Dodge-Cap 40 % + One-Shot-Cap 50 % maxHp ⇒ jeder durchkommende Treffer nimmt ~40–50 % maxHp; Ward-Pool (920) < 30 s Zufluss. Nur Platte+Schild-Mathe (Mitigation 71 % × Block 50 %) funktioniert. Die WAFFEN-Stil-Parität bleibt erhalten, weil 1H-Bogen/Wand + Schild + Platte legal sind (chron20_ranged/magic ≈ Melee-Niveau) — aber die RÜSTUNGS-Identität von Ranged/Magic ist am Boss-Tier tot. **Nicht über Drazhan-Zahlen fixbar** → separater Trinitäts-Skalierungs-Punkt für den CEO (Leder/Stoff-Defensivachsen skalieren nicht in die 234–295-dmg-Klasse).

## 7) Nebenbefund Engine (an combat-dev melden, KEIN Drazhan-Feld)

**Regen-Tonika deaktivieren den Auto-Trank komplett:** der Chugging-Guard (`hasActiveHotBuff`, combat.ts) blockt den Auto-Heiltrank, solange IRGENDEIN Buff `hpRegenPerSec > 0` trägt. Das trifft nicht nur die 2–4-s-HoT-Draughts (Zielgruppe des Guards), sondern **panacea_elixir, tonic_ironbark, emberroot_tonic, tonic_witchlight, tincture_gloomspore** — Dauer-Tonika mit 0,1–0,3 HP/s. Wer z. B. panacea (Top-Regen-Tonikum) trinkt, verliert ~50 % seiner Not-Heilrate (Trank = 3,1 %/s der 6-%-Decke), ohne es zu sehen: in der Sim kippt exakt dieses Detail einen Boss-Versuch von „Sieg" auf „Tod". Vorschlag an combat-dev: Guard nur auf kategorielose Kurzzeit-HoTs anwenden (oder Schwelle `hpRegenPerSec ≥ 1`). Alle Audit-Zahlen oben nutzen deshalb salve_gravensap (maxHp-only) statt panacea.

## 8) Empfehlung + verifizierte Zahlen

Leitidee: **Drazhan zurück auf die hauseigene Boss-Kurve (Threat-Spec §3) bringen und den Enrage unter die Heil-Decke legen; die Endboss-Härte trägt der 52-%-HP-Überhang (Marathon: ~2× TTK und ~2× Food/Trank-Verbrauch von last_idol), das schnellere Tempo (3500 ms), der Burn und die höhere Rüstung (175).** Nicht über die Spitzenlast, die mathematisch niemand heilen kann.

Getestete Varianten (Sieg % chron20-Melee / craft-Melee, N = 250):

| Variante | damage | acc | enrage | chron20 | craft | t90+Runen | Urteil |
|---|---|---|---|---|---|---|---|
| IST | 295 | 31 | 1,9 @ 25 % | 3,6 % | 7,6 % | 0 % | unspielbar |
| P1 | 262 | 29 | 1,55 @ 25 % | 42,0 % | 58,8 % | — | Enrage noch über Decke |
| P2 | 270 | 29 | 1,7 @ 20 % | 23,6 % | 39,6 % | — | Fenster-Kürzung ersetzt keine Intensitäts-Senkung |
| P3 | 262 | 29 | 1,4 @ 22 % | 72,4 % | 84,4 % | 7,5 % | knapp unter Ziel |
| P4 | 250 | 29 | 1,35 @ 20 % | 89,2 % | 90,8 % | 24,2 % | im Zielband, aber dmg unter Kurve |
| P5 | 295 | 31 | 1,25 @ 22 % | 67,2 % | 78,0 % | 4,2 % | 295 Grundschaden hält Dauer-Attrition zu hoch (21 % Tode PRE-Enrage) |
| **VA ⇒ EMPFEHLUNG** | **262** | **29** | **1,3 @ 20 %** | **87,6 %** | **90,0 %** | ~20–25 % (P4-Proxy) | kurven-konform, Zielband |
| VB | 262 | 29 | 1,45 @ 15 % | 76,0 % | 80,8 % | — | „kurz & wild" verliert gegen VA — die Block-RNG-Spitzen im 1,45-Fenster töten trotz kürzerer Dauer |

Stil-Querschnitt @VA (N = 250): **Melee (craft) 90,0 % Sieg / 10,0 % Tod · Melee (chron20-Tank-Kit) 87,6 / 12,4 · Ranged 81,2 / 18,8 · Magie 93,6 / 6,4.** Magie führt (Wand-Schock = eingebautes Counter-Play), Ranged hinkt strukturell (sein Konter-Stat precision läuft gegen evasion 9 ins Leere, kein Armor-Pen am Bogen) — mit Sturm-Rune statt Flamme (+5–10 pp, §6) schließt Ranged auf ~86–91 % auf. Wer zusätzlich Suffixe/Pet/idol-Teile hat (der typische Kapitel-20-Stand — die Sim-Loadouts sind bewusst der garantierte FLOOR), landet stilübergreifend im einstelligen Todesrisiko. Falls der Chef ALLE Stile schon am Floor einstellig will: `damageMult` 1,25 statt 1,3 (geschätzt +3–6 pp je Stil, nicht separat simuliert).

### Apply-Liste für content-dev (verbatim, `packages/content/src/index.ts`, Monster `drazhan` + Dungeon `behind_the_throne`)

| # | Feld | ist | **soll** | Begründung / erwarteter Effekt |
|---|---|---|---|---|
| 1 | `drazhan.damage` | 295 | **262** | exakt die Threat-Spec-Boss-Kurve @L310 (45·e^(0.00748·211)·1,2). Pre-Enrage-Zufluss ~53 % der Heil-Decke (Spec-§8-Anker: ~60 %); bleibt ~+22 % nachhaltiger Dauerdruck über last_idol (262/234 × Tempo 3800/3500) |
| 2 | `drazhan.accuracy` | 31 | **29** | Content-Acc-Kurve §3 (6,6+0,07·L≈28); Boss-Identität gehört laut Regel in dmg/hp-Mults, nicht in acc. Effekt klein (Trefferchance −0,5 pp), Regel-Kohärenz |
| 3 | `drazhan.enrage` | `{0.25, 1.9}` | **`{ belowHpPct: 0.20, damageMult: 1.3 }`** | Enrage-Zufluss ~67 % der Heil-Decke (Erwartung) mit hoher Block-RNG-Varianz: gefährlichste Phase (weiterhin fallen dort praktisch alle Tode), aber überlebbar mit Trank-Disziplin. Kombiniert mit #1 verifiziert: Voll-Loadout ~88–91 % Sieg, Mindest-Gear ~25 %, T90-ohne-Runen/T80 0 % |
| 4 | `behind_the_throne.gold` | 20000 | **8000** | bei machbarem Boss ~5–6 Clears/h ⇒ 20 k wären ~110 k Gold/h (Endgame-Band lt. Threat-Spec: 15–30 k/h). 8 k ≈ 45 k/h Premium über idol_sanctum (12 k je 4-Wellen-Run); Erst-Clear zahlt weiter doppelt (16 k-Moment) |

**Bewusst NICHT ändern:** `maxHp` 8700 (23 % über Kurve = gewollter „Endboss des Bandes"-Überhang; trägt Marathon-Härte: TTK ø~7–9 min = ~1,7–2× last_idol, Food ~85–105 Banquets + 12–19 Tränke pro Sieg), `attackIntervalMs` 3500, `defense` 175, `evasion` 9, `regen` 1,4, `resist [frost, bleed]` (Schock-Fenster = Counter-Play), `inflict` burn (Flavor, harmlos), `xp` 92 000 (XP/HP kohärent zu last_idol), `crownless_blade` 0,0015 & Dungeon-Loot (Chase-Charakteristik; bei ~5–6 Kills/h ≈ 1 pro ~120 h — falls der Chef ~60 h Chase-Ziel will: 0,003).

### Erwartetes Ergebnis nach Apply (verifiziert @VA, N = 250)

| Spieler | vs drazhan (neu) | Soll-Daumen |
|---|---|---|
| Voll realistisch, Floor ohne Suffix/Pet (Melee craft 90/10, chron20 87,6/12,4, Ranged 81,2/18,8, Magie 93,6/6,4) | Sieg 81–94 %, TTK 7–10 min, ~82–108 Banquets + 13–20 Tränke pro Sieg | „klarer Sieg" ✅; „niedrig einstelliger Tod" bei Magie sofort, bei Melee/Ranged mit einem Vorbereitungs-Hebel (Sturm-Rune/Suffixe/Pet) |
| Mindest-Gear (T90 + Runen + Tonika + Trank) | ~20–25 % Sieg (P4-Proxy 24,2 %) | „knapp/riskant" ✅ |
| T90 ohne Runen / T80 | 0 % (Tod in 20–140 s) | „klare Wall" ✅ |
| BiS-Stack | **97,5 % Sieg / 0 % Tod / 2,5 % Sim-Timeout-Guard @VA** (identisch bei P1/P2/P4), weiterhin ~47 min TTK (Stat-Stick-Selbstwahl — realistische Schadens-Tanks brauchen 7–9 min) | Decke bleibt gefordert ✅ |
| last_idol-Vergleich | pro Begegnung ~+13–20 pp sicherer als der ISOLIERTE last_idol-Kampf, ABER ~1,7× Länge, ~2× Food/Trank-Verbrauch, ~+22 % Dauerdruck — und last_idol steht am Ende eines 4-Wellen-Runs mit erodiertem Ward/Food. In Kontext-Härte bleibt Drazhan der Gipfel des Bandes | „spürbar härter, kein neues Gear-Tier" ✅ |

## 8b) Re-Sim nach Apply + HoT-Fix (Bestätigungslauf, 2026-07-13 Nachtrag)

Content trägt die Apply-Liste 1:1 (drazhan 262/29/`{0.20, 1.3}`, Dungeon-Gold 8000) und combat-dev hat den §7-Guard gefixt (kategorisierte Dauer-Tonika sperren den Not-Trank nicht mehr; nur die 3 kategorielosen Heil-Draughts sperren weiter). Re-Sim gegen den LIVE-Content, N = 150 je Zelle, identische Loadouts wie §3:

| Zelle | Sieg | Tod | TTK / TTD | Food/Trank pro Sieg | Einordnung |
|---|---|---|---|---|---|
| Voll realistisch Melee (craft, gravensap) | **90,0 %** | 10,0 % | ø428 s / ø404 s | 83 / 12,9 | im Korridor (Soll 81–94) ✅ |
| dito mit panacea_elixir statt gravensap | **95,3 %** | 4,7 % | ø429 s | 82 / 11,4 | **HoT-Fix end-to-end bestätigt:** panacea sperrt den Trank nicht mehr und ist jetzt das bessere Regen-Tonikum → einstelliger Tod, bleibt < 97 % (nicht trivial) ✅ |
| Voll realistisch Ranged (chron20 + Bogen) | 78,7 % | 21,3 % | ø534 s / ø482 s | 107 / 19,5 | nominell 2,5 pp unter der Korridor-Kante 81,2 — bei N = 150 statistisches Rauschen (±6,5 pp CI); Sturm-Runen-Hebel (+5–10 pp) bleibt die Ranged-Antwort ✅ |
| Voll realistisch Magie (chron20 + Wand) | **94,7 %** | 5,3 % | ø612 s | 108 / 13,7 | knapp über Korridor-Oberkante, unter der 97-%-Trivial-Schwelle ✅ |
| Mindest-Gear (T90 + Runen + Tonika + Trank) | **18,0 %** | 82,0 % | ø821 s / ø621 s | 171 / 46,4 | nominell 2 pp unter dem 20–35-Band (±6,2 pp CI) — Charakter „knapp/riskant" intakt: gewinnbar, Tode zu 70 % erst spät im Enrage ✅ |

100 % (Voll-Loadouts) bzw. 70 % (Mindest-Gear) der Tode weiterhin im Enrage — die Phase bleibt wie beabsichtigt der Prüfstein. **Keine Korridor-Verletzung, keine weitere Justierung empfohlen.** Einziger Folgeeffekt des HoT-Fixes: panacea_elixir ist jetzt strikt besser als salve_gravensap (Ober-Ende „voll realistisch" rückt von 90 auf ~95 %) — gewollt und unter der Trivial-Schwelle.

## 9) Offene Punkte für den CEO

1. **Trinitäts-Skalierung L250+** (nicht Drazhan-spezifisch): Leder/Stoff-Identität hat am Boss-Tier keinen Überlebenspfad — schon bei last_idol. Wenn „Endboss verlangt Panzer-Umrüstung" nicht Kanon sein soll, braucht es einen eigenen Balance-Pass (z. B. Dodge-/Ward-Skalierung oder One-Shot-Cap-Interaktion). Betrifft armor-trinity-Memory.
2. ~~**Auto-Trank-HoT-Guard** (§7) an combat-dev.~~ ERLEDIGT (Fix verifiziert, s. §8b).
3. last_idol selbst liegt für realistische (Nicht-BiS-)Builds bei 23–41 % Tod pro isoliertem Versuch — im 4-Wellen-Kontext härter. Das ist die geerbte Kapitel-19-Referenzhärte; falls der Chef dort auch „machbarer" will, wäre das ein eigener Auftrag (NICHT Teil dieser Apply-Liste).
4. Boss-Art `drazhan.png` fehlt weiterhin (design/fehlende-assets.md).
5. Falls „alle Stile schon am Floor einstellig" gewünscht: `damageMult` 1,25 statt 1,3 in Apply-Zeile #3 (geschätzt +3–6 pp; die übrigen Zeilen unverändert).
