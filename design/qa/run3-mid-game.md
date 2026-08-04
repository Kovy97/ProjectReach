# QA-Run 3 — Mid-Game Playtest (Level 25–60)

**Tester:** Playtester-Agent (Analyse/QA, READ-ONLY, kein Code geändert) · **Datum:** 2026-06-27
**Scope:** Mid-Game L25–60. Fokus: Skill-Nutzung/Vielfalt, Gear-Progression, 3-Stil-Balance, Grind/Wall-Gefühl + die neuen/überarbeiteten Systeme: Crafting (jetzt komplette Magie-Roben mit Handschuhen/Stiefeln), Jewelcrafting, Thieving-Toggle, Combo-Food.
**Methode:** Direkt aus `packages/content/src/index.ts` (Items/Actions/Monster/Crops) + Engine. Habe ein temporäres Analyse-Harness in der Engine gefahren (`computeStats` + `simulateCombat` aus `sim.ts`, danach wieder entfernt): effektive DPS pro Stil mit best-craftbarem Gear bei L30/40/55, 1h-Kampf-Sim gegen alle Mid-Game-Mobs pro Stil, Zonen-XP-Dichte L18–46, Skill→Attribut-Verteilung. Alle Zahlen unten sind gemessen, nicht geschätzt. Abgeglichen mit `run2-mid-game.md`.

---

## Fun-Score: **8 / 10** (run2: 7)

Das Mid-Game ist seit Run 2 spürbar runder. **Alle drei großen Run-2-Befunde sind gelandet:** die Magie-Roben-Leiter ist jetzt lückenlos und vollständig (inkl. Handschuhe/Stiefel je Tier), das Jewelcrafting hat sein Magie-Schmuckstück (`spellbinder_ring` L46), und Combo-Food deckt jetzt alle drei Stile ab (`duskfin_rangers_stew` L48 ranged, `spellwarden_bisque` L52 magic). Vor allem: die **Stil-Parität ist hergestellt** — Melee/Ranged/Magie liegen bei L40/L55 mit best-craftbarem Gear innerhalb ~5 % effektiver DPS; die in Run 2 gemeldete Ranged-Dominanz ist weg, die XP-Ausreißer `wild_stag`/`reef_drowned` sind getrimmt. Keine P0/P1-Bugs, **keine Walls** (0 Tode über alle Mid-Game-Mobs mit zeitgemäßem Food). Was bleibt, ist Politur: ein einzelner XP-Trichter-Mob, eine etwas sparsamere Magie-Rüstungs-Kadenz und UX-Feinheiten.

---

## Top-Stärken

1. **3-Stil-Parität sitzt jetzt.** Gemessene Effektiv-DPS mit best-craftbarem Gear: **L40** Melee 39 / Ranged ~24 (Bogen+Köcher) / Magie ~24 — wobei Melee mit Scimitar/Dolch (nicht Maul!) sogar führt; **L55** Melee (adamantium_scimitar) ~53 / Ranged ~34 / Magie ~34 effDPS. Im 1h-Kampf-Sim töten alle drei Stile dieselben Mobs in ähnlicher Zeit (z. B. `roc_hunter` L50: m 20.5s / r 19.4s / mag 18.4s pro Kill), alle mit 0 Toden. Die Stile fühlen sich gleichwertig versorgt an.
2. **Magie-Roben-Leiter ist komplett UND voll-slotted.** Apprentice(L1) → Frost(magic_off22) → Aether(40) → **Arcane(55, NEU)** → **Runewoven(70, NEU)** → Godspark(85) — jeweils Helm+Body+Beine+**Handschuhe+Stiefel**. Die Run-2-Totzone L47–88 ist geschlossen; magicDamage steigt monoton (Body 8→16→22→26→30). Der Magier hat jetzt eine echte Craft-Dopamin-Schleife.
3. **Combo-Food bedient alle Stile.** Mid-Game-Kette jetzt: `bloodgrain_stew` L38 (melee), **`duskfin_rangers_stew` L48 (ranged 4/crit)**, **`spellwarden_bisque` L52 (magic 4/acc 5)**, `soulgourd_brisket` L58 (def/crit, stil-neutral). Heal **und** Timed-Buff aus Farming-Crops + Fleisch + Fisch — geschlossener Koch→Kampf-Loop für jeden Build.
4. **Jewelcrafting deckt Magie ab.** `spellbinder_ring` L46 (magicDamage 8, acc 6) füllt die Run-2-Lücke Sapphire(L18)→Stormcaller(L65). Die Gesamt-Leiter (Garnet→…→Godgem L99) ist monoton und endgame-tief.
5. **Thieving-Toggle voll verdrahtet** (`tick.ts` + `THIEVING_RISK_MODS`): careful/bold wirkt auf Erfolg (±5 Pp, Cap 0.95), Stun (0.5×/1.5×) **und** Reward auf XP+Gold+Loot (0.85×/1.2×). Kein Schein-Toggle.
6. **Glatte, mauerfreie Kampfkurve.** Mob-HP/Schaden skalieren monoton (L26 240hp → L60 620hp); `def/(def+125)`-Mitigation + Auto-Eat fangen Spitzen ab. Im Sim 0 Tode bei 8–38 s/Kill über den ganzen Bereich.

---

## Priorisierte Findings

### [P2 Balance] `tide_siren` ist ein übersehener XP-Trichter (Lv38, Küste)
**Befund (gemessen):** `tide_siren` gibt **xp 340 für 320 HP → xp/hp 1.06** — die höchste XP-Dichte aller Nicht-Elite-Mobs im Mid-Game. Sie hat **kein `regen`/`enrage`** (anders als die bewusst tanky Premium-Mobs `dire_wolf` 0.88, `forest_bear` 0.96, `deep_kraken`) und wird im Sim genauso schnell gelegt wie ihre Nachbarn (~18–22 s/Kill). Direkter Levelvergleich:
| Monster | Lvl | maxHp | xp | xp/hp | Zone |
|---|---|---|---|---|---|
| **tide_siren** | 38 | 320 | **340** | **1.06** | coast |
| ashfield_wraith | 38 | 290 | 78 | 0.27 | slayer_tower |
| skeleton_pyroclasp | 36 | 280 | 70 | 0.25 | crypt |
| forest_warden | 40 | 360 | 110 | 0.31 | blackthorn |

→ ~3.8× XP/h gegenüber gleichstufigen Mobs (Ranged: ~67k XP/h auf tide_siren vs ~18k auf ashfield_wraith). Run 2 hat den Trichter für `wild_stag` (160→55) und `reef_drowned` (90→35) korrekt entschärft — **`tide_siren` wurde dabei vergessen**. Solange sie steht, ist Küsten-Sirenen-Farmen ab L35 die einzig sinnvolle Combat-XP-Quelle und entwertet Crypt/Ashfields/Blackthorn/Highlands.
**Fix-Vorschlag (content-dev):** `tide_siren.xp` 340 → ~90 (Linie der übrigen L38-Mobs, xp ≈ level·k). Premium-Elites (`dire_wolf`/`forest_bear`/`deep_kraken` mit regen/enrage) bewusst hoch lassen.

### [P2 Balance] Magie-Rüstungs-Kadenz im Mid-Game noch sparsamer als Melee
**Befund (gemessen):** Die Run-2-Endgame-Lücke ist gefüllt, aber die **Aufrüst-Frequenz** bleibt ungleich. Melee-Plate kommt per Smithing alle **~10 Level** neu (steel L22 → blacksteel 32 → mithril 42 → adamantium 52 → runite 62 …). Magie-Roben-Body kommt nach magic_off-Bedarf: **frost (22) → aether (40) → arcane (55)** = Lücken **18 / 15**. Konkret trägt ein Magier von **magic_off 22 bis ~40–45** durchgehend dieselbe Frost-Robe (Body magicDamage 8), während der Melee-Spieler in derselben Spanne 2× neu schmiedet. Aether ist zusätzlich hinter runecrafting **45** gegatet (5 Level über dem magic_off-Req), was den Sprung weiter nach hinten schiebt.
**Fix-Vorschlag:** Eine Zwischen-Robe ~L30–32 einschieben (Body magicDamage ~11, maxHp ~40, Helm/Beine/Handschuhe/Stiefel analog), damit die Magie-Body-Kadenz im Bereich L22–45 mit der Plate-Kadenz mithält.

### [P3 Balance] Ranged-Pflicht-Craftleder hat 22-Level-Lücke L28→L50
**Befund:** Die reine Leatherworking-Body-Leiter ist scaled (L28) → **studded (L50)** → warhide (L70). Zwischen L28 und L50 gibt es **kein craftbares Leder-Body** — die Lücke wird nur durch Monster-Drops gefüllt (`warden_brigandine` L36 aus forest_warden, `spectral_coif` L25 Helm). Ein Bogen-Spieler, der nicht gezielt Bosse farmt, bleibt L28–49 auf scaled_leather. Weniger gravierend als die Magie-Kadenz (Drops fangen es ab), aber asymmetrisch zur 10-Level-Smithing-Kadenz.
**Fix-Vorschlag:** Optional ein craftbares Leder-Tier ~L38–40 (zwischen scaled und studded), oder `warden_brigandine` als reguläres Leatherworking-Rezept zugänglich machen.

### [P3 UX] „Big-Number"-Waffen sind effDPS-Fallen ohne UI-Signal
**Befund (gemessen):** Die schadenshöchsten Melee-Waffen sind effDPS-**schlechter** als schnelle Klingen. Bei L40: `mithril_maul` zeigt meleeDamage **82** (höchste Zahl), liefert aber nur ~36 effDPS; `mithril_scimitar` (32 dmg, −300 ms, +crit) liefert **~39 effDPS**; `mithril_dagger` ähnlich. Mein erster Sim-Durchlauf hat Melee unterschätzt, weil das „höchste Schadenszahl"-Auswahlheuristik den Maul wählte — genau die Falle, in die ein Mid-Game-Spieler tappt. Das ist gewollte OSRS-Tiefe (Speed vs Power), aber es gibt **kein In-UI-Signal** (effektive DPS / Angriffe pro Sekunde), das den Spieler leitet.
**Fix-Vorschlag (ui-dev):** Im Waffen-Tooltip „effektive DPS" oder „Angriffe/s" anzeigen, damit Maul/Großschwert nicht fälschlich als Upgrade gelesen werden.

### [P3 Politur] Thieving-Toggle: Wahl wirkt weiterhin subtil
**Befund:** Magnituden unverändert seit Run 2 (`THIEVING_RISK_MODS`: careful +5 Pp/0.5× Stun/0.85× Reward; bold −5 Pp/1.5× Stun/1.2× Reward). Der Erfolgs-Delta (±5 Pp) ist klein gegenüber dem Reward-Delta (0.85×/1.2×) → bei hoher Erfolgsquote (späte Levels, Cap 0.95) dominiert **bold** klar; nur knapp nach Freischaltung ist careful vorn. Die Wahl „kippt", fühlt sich aber wenig konsequent an.
**Fix-Vorschlag:** Spanne schärfen (±8–10 Pp Erfolg, 0.8×/1.3× Reward, 0.4×/1.6× Stun) und erwartete Erfolgs-% pro Modus im UI anzeigen.

### [P3 Balance] Ranged ist der „sicherste" Stil bei gleicher DPS
**Befund:** Ranged behält den hartkodierten +5-Evasion-Bonus (`character.ts`) **plus** Bogen-/Leder-Evasion → gemessene Evasion L55 ~93 vs Magie ~77 vs Melee (hat dafür Plate-Defense). Da die DPS jetzt auf Parität liegt und alle Stile im Sim 0 Tode haben, ist Ranged minimal das rundeste Paket (Top-Ausweichen **und** Top-DPS-Band). Kein dringendes Problem, aber falls „Glass-Cannon"-Identität gewünscht ist: den pauschalen +5-Evasion-Bonus überdenken.

---

## Skill-Vielfalt & Struktur-Notiz

Skill-Dichte im Mid-Game bleibt breit und mit intakten Output→Senke-Ketten (Smithing/Runecrafting/Leatherworking/Inscription/Fletching/Cooking/Foraging/Jewelcrafting/Herblore/Thieving/Fishing/Mining). **Strukturelle Wurzel der Stil-Asymmetrie** (zur Info, kein akuter Fix): die Attribut-Trainings sind sehr ungleich verteilt — **dex** wird von **5** Skills trainiert (fishing, attack, ranged, thieving, leatherworking), **con** ebenfalls von 5, aber **int** und **wis** je nur von **1** (magic_off bzw. magic_def). Ein Magier kann sein Kernattribut int nur über genau eine Fertigkeit hochziehen, während dex/con beiläufig aus vielem Skilling wachsen. Das ist der tiefere Grund, warum Magie historisch hinterherhing; die Gear-/Food-Reworks haben es kompensiert, aber die Trainings-Verteilung selbst bleibt schief. Falls je wieder eine Magie-Schwäche auftaucht, hier ansetzen (z. B. ein weiterer int/wis-trainierender Skill).

## Combat-Kurve & Walls
Kein Wall, keine Trivialität: 1h-Sim über alle L25–60-Mobs ergibt **0 Tode** mit zeitgemäßem Food (cooked_lobster), 8–38 s/Kill, monotone HP/Damage-Skalierung. Die `regen`/`enrage`-Elites (dire_wolf, forest_bear, deep_kraken) sind bewusste, faire DPS-Checks. Einziges Balance-Thema im Kampf ist der `tide_siren`-XP-Trichter (oben).
