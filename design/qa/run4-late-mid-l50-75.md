# QA-Run 4 — Late-Mid Playtest (Level 50–75, „nach den Fixes")

**Tester:** Playtester-Analyst (READ-ONLY, kein Code/Content geändert) · **Datum:** 2026-06-27
**Persona:** Spät-Mid-Spieler L50–75 auf dem Weg ins Endgame.
**Fokus:** Grind-/Wall-Gefühl, Gear-Kadenz pro Stil, Magie-/Range-Rüstungs-Verfügbarkeit, Endgame-Übergang, XP-Dichte der Zonen L50–75, Skill-Aktionsdichte, 3-Stil-Balance, Status-Effekte/Auto-Eat gegen tanky Mobs (regen/enrage).
**Methode — echte Zahlen, kein Hand-Wedeln:** Temporäres Sim-Harness direkt auf der Engine gefahren und nach dem Lauf wieder **entfernt**. Gemessen: (a) vollständiger Equipment-Dump mit Craft-Level + Ausrüst-Anforderungen (`requirements`) aller Items; (b) Monster L46–80 (Level/HP/XP/xp-pro-HP/regen/enrage/inflict/Zone); (c) 1h-Dauerkampf-Sim **pro Stil mit best-craftbarem Gear** an drei Checkpoints (L55/L65/L75), **mit stil-realistischer Skill-Investition** (Kampf-Skills + die zum *Ausrüsten* nötigen Crafting-Skills, da Gear `requirements` prüft); (d) Tank-Mob-Stresstest (regen/enrage/inflict). Alle Zahlen unten sind reale Sim-Ausgaben. Abgeglichen mit `run3-combat.md` und `run3-mid-game.md`.

> **Methoden-Warnung dokumentiert (für künftige Tester):** Ranged-/Magie-Waffen *und* -Rüstung haben harte `requirements` auf **zwei** Skills (Kampf-Skill **und** Crafting-Skill, z. B. `bloodiron_staff {magic_off:70, runecrafting:70}`, `runewoven_robe_body {magic_off:70, runecrafting:72}`). Melee-Gear verlangt nur den Kampf-Skill (`bloodiron_scimitar {attack:70}`, Platte `{defence:70}`). Wer im Sim nur die Kampf-Skills hochsetzt (`COMBAT_SKILL_IDS`), bei dem **scheitert das Ausrüsten von Bogen/Stab/Robe lautlos** → der Charakter fällt auf die Starter-Melee-Waffe zurück und Melee wirkt fälschlich dominant. Genau diese Falle erklärt vermutlich die abweichende „Parität/Melee-führt"-Aussage in `run3-mid-game.md`. Diese Auswertung setzt die Crafting-Skills korrekt → die Zahlen unten sind die echten.

---

## Fun-Score: **6 / 10** (run3-mid: 8 · run3-combat: 7)

Der Kampf bleibt **mechanisch grundsolide**: über den gesamten Bereich L55–75 und gegen jeden Tank-Mob (regen bis 5/s, enrage, inflict shock/burn/bleed) sterben **alle drei Stile 0×** mit zeitgemäßem Food — Auto-Eat, prozentuale Mitigation, Mana-Schild und die Status-Effekte greifen sauber. Drei alte run3-Befunde sind **wirklich gelandet** (Ranged-Flat-Evasion-Bonus raus, `tide_siren`-XP-Trichter gefixt, Magie-Robenleiter um eine Zwischenstufe ergänzt). **Aber die 3-Stil-Balance hält im Spät-Mid nicht:** mit korrekt ausgerüsteten Builds ist **Nahkampf an jedem Checkpoint ~⅓ langsamer** als Fernkampf/Magie (gemessen 0.63–0.69× Durchsatz). Dazu eine echte **Ranged-Rüstungs-Wall L52→L72** (18–20 Level ohne craftbares Leder-Upgrade) und eine asymmetrische Ausrüst-Gating-Last für die Nicht-Melee-Stile. Das sind keine Bugs, aber sie drücken das Spätgame-Gefühl für mindestens ein Drittel der Builds.

---

## Top-Stärken

1. **Kampf-Robustheit hält bis an die Endgame-Schwelle.** 1h-Sim mit L75-Gear gegen die tanky Premium-Elites — `deep_kraken` (L60, regen3 + enrage), `roc_elder` (L65, regen4), `bone_colossus` (L76, regen5 + enrage), `roc_storm`/`highland_wyvern` (enrage + inflict) — ergibt **0 Tode in allen 15 Läufen**. Regen wird von jedem Stil überwunden (kein „unbesiegbar"), Auto-Eat fängt die Enrage-Spitzen + inflict-DoTs ab. Status-/Auto-Eat-System gegen tanky Mobs = **bestanden**.
2. **Drei run3-Fixes sind real gelandet** (Δ-Beleg, s. u.): Ranged-`evasion += 5` aus `character.ts` entfernt; `tide_siren` von xp **340→90** (xp/hp 1.06→0.28) getrimmt; Magie-Robe `ember_robe_*` **@L30–32** als Zwischenstufe eingezogen (genau der run3-Vorschlag).
3. **Magie-Robenleiter in-band lückenlos & voll-slotted.** L50–75: aether (lw45–47) → arcane (lw57–58) → runewoven (lw71–72) — je Helm+Body+Beine+Handschuhe+Stiefel. magicDamage steigt monoton; der Magier hat in meinem Bereich drei volle Robentiers.
4. **Melee-Platten-Kadenz vorbildlich.** Smithing alle ~10 Level: adamantium (50–52) → runite (60–62) → bloodiron (72) — alle Slots. Sauber.
5. **XP-Dichte-Kurve monoton, kein Dead-Zone.** xp/hp steigt stetig 0.41 (L46) → 1.54 (L79); gemessene XP/h ~160k (iron_revenant L58, ranged) → ~238k (void_stalker L66) → ~516k (sorrow_wraith L72, magic). Höhere Mobs lohnen sich spürbar mehr, der Übergang Richtung Endgame zieht sauber an.
6. **Skill-Aktionsdichte L50–75 breit.** Aktionen mit Req in 50–75: smithing 63, runecrafting 24, leatherworking 23, fletching 10, jewelcrafting 9, cooking 9, herblore 8, foraging 8, thieving 5; Gathering dünner (fishing/mining 4, woodcutting 3), aber durchgehend versorgt. Genug Mid-High-Aktionen.

---

## Priorisierte Findings

### [P1 Balance] 3-Stil-Parität bricht im Spät-Mid: Nahkampf ist ~⅓ hinten
**Befund (Sim, best-craftbares Gear pro Stil, on-level Mob, 0 Tode überall):**

| Checkpoint | melee kills/h | ranged kills/h | magic kills/h | relativ (melee / ranged / magic) |
|---|---:|---:|---:|---|
| **L55** vs iron_revenant (L58) | 506 | 730 | 702 | **0.69×** / 1.00× / 0.96× |
| **L65** vs void_stalker (L66) | 478 | 756 | 717 | **0.63×** / 1.00× / 0.95× |
| **L75** vs sorrow_wraith (L72) | 512 | 697 | 759 | **0.67×** / 0.92× / 1.00× |

Nahkampf ist an **jedem** Checkpoint der Durchsatz-Boden — ~31–37 % hinter dem Spitzenstil; Fernkampf und Magie liegen untereinander eng (~5–8 %). Verifiziert mit **allen** Bluteisen-Melee-Waffen (kills/h vs sorrow_wraith): scimitar 512 (best), greatsword 432, sword 434, dagger 423, maul 422, axe 412, battleaxe 405 — Melee ist also **optimal** ausgerüstet (Scimitar = beste Wahl, run3-„Maul-Falle" bestätigt) und trotzdem ⅓ zurück. **Drei strukturelle Treiber, alle gemessen:**
- **Rüstung trägt nur bei Magie Offense.** Magie-Roben stapeln magicDamage über **5** Slots (runewoven Body26+Cowl15+Beine18+Hände17+Füße17 = +93 nur aus Rüstung) → magic attackDamage **289/365/438** vs melee **163/173/209** — fast 2×. Melee-Platte (und Ranged-Leder) gibt **0** Offense.
- **Platte verlangsamt Melee.** Bluteisen-Platte addiert +350 ms `attackIntervalMs` (Body200/Helm50/Beine100) → melee aIMs ~2570 vs ranged ~1700 vs magic ~2520. (Leder statt Platte hilft Melee **nicht** — 534 < 619 kills/h, Leder gibt auch keine Offense.)
- **Melees Pflicht-Craft trainiert kein Attribut.** Ranged/Magie *müssen* `leatherworking` leveln, um Leder/Roben zu tragen — leatherworking trainiert **dex** (= schnellere Angriffe + Crit + Evasion, gratis dazu). Melees Pflicht-Craft `smithing` trainiert **nichts**. Magie/Ranged bekommen so passiv dex, das Melee fehlt.
- **Melees Tank-Identität ist wertlos:** def 211–320 / hp 964–1360 (vs ranged def 145–224 / magic def 96–141) — bei **0 Toden für alle** zahlt Melee einen DPS-Aufpreis für Überleben, das niemand braucht.

→ Das ist die **Fortsetzung von run3-combat P1** (Melee an jedem Checkpoint am langsamsten), im Spät-Mid eher verschärft als entschärft, weil die Magie-Roben-Offense mit dem Level mitskaliert. **Fix-Vorschlag (content/combat):** Melee-Offense im Spät-Mid anheben (z. B. Scimitar-Linie meleeDamage +12–18 % **oder** Platten-`attackIntervalMs`-Strafe halbieren) und/oder Melee einen dex-/str-trainierenden Pflicht-Pfad geben; alternativ Magie-Roben-magicDamage pro Slot leicht trimmen. Zielband: alle Stile ±15 % über L50–75.

### [P1 Balance] Ranged-Rüstungs-Wall L52 → L72 (18–20 Level ohne craftbares Upgrade)
**Befund (Equipment-Dump):** Die craftbare Leder-Leiter springt von **studded_leather** (req leatherworking 50–52) direkt auf **warhide** (req leatherworking 70–72) — **kein** craftbares Leder-Body/Helm/Beine/Hände/Füße dazwischen. Ein Fernkämpfer trägt von ~L52 bis ~L69 **dieselbe studded-Rüstung** (~18 Level Stillstand), während im selben Fenster Melee 2× neu schmiedet (adamantium→runite→bloodiron) und Magie 1–2× neue Roben webt (arcane→runewoven). Zum Vergleich die in-band-Tiers pro Stil:
| Stil | Rüstungs-Tiers in L50–75 |
|---|---|
| Melee (Platte) | adamantium (50–52), runite (60–62), bloodiron (72) — **3** |
| Magie (Robe) | aether (45–47), arcane (57–58), runewoven (71–72) — **3** |
| **Ranged (Leder)** | studded (50–52), warhide (70–72) — **2, mit 18–20-Level-Loch** |

Verschärft run3-P3 (dort L28→L50): das Loch ist mit den verschobenen Tiers jetzt **mitten im Spät-Mid**. Zusätzlich gibt **kein** in-band-Leder rangedDamage (nur Handschuhe: studded +2, warhide +3); echtes Ranged-Offense-Leder (dragonhide) startet erst @82. **Fix-Vorschlag (content-dev):** ein craftbares Leder-Tier ~L60–62 (zwischen studded und warhide) einziehen, Slots analog — schließt die Wall und bringt Ranged auf die ~10-Level-Kadenz der anderen Stile.

### [P2 Balance] Asymmetrisches Ausrüst-Gating: Nicht-Melee zahlt eine Crafting-Steuer
**Befund (`requirements`-Dump):** Zum **Tragen** der Gear:
- **Melee:** Waffe `{attack}`, Platte `{defence}` — **nur Kampf-Skills** (wächst durchs Kämpfen).
- **Ranged:** Bogen `{ranged, fletching}` + Leder `{leatherworking}` — **zwei** Crafting-Skills extra.
- **Magie:** Stab `{magic_off, runecrafting}` + Robe `{magic_off, runecrafting}` — `runecrafting` gatet **alles**.

Ein fokussierter Bogen-/Magie-Spieler muss also 1–2 Crafting-Skills **bis aufs Gear-Level** mitziehen, nur um seine Ausrüstung anzulegen; Melee rüstet allein durchs Kämpfen voll aus. Für einen Self-Crafter geht das im Fluss auf, aber es ist eine reale, **stil-asymmetrische Grind-Last** (und genau die Falle, die Sims kippt). **Hinweis:** evtl. bewusst (man baut seine eigene Waffe) — dann zumindest im UI klarer kommunizieren („zum Tragen: Runenkunst 72"). Falls nicht beabsichtigt: Melee-Platte ebenfalls an `smithing` koppeln **oder** die Crafting-Req von Ranged/Magie streichen, damit alle drei symmetrisch nur am Kampf-Skill hängen.

### [P2 Balance] Magie ist top-DPS UND ausreichend zäh (kaum Glass-Cannon-Kehrseite)
**Befund:** Magie liefert die **höchste** rohe attackDamage aller Stile (438 @L75, ~2× Melee) und ist an 2 von 3 Checkpoints Spitzen-Durchsatz — bei gleichzeitig **mana 414** + Mana-Schild und 0 Toden. maxHp ist zwar am niedrigsten (794), aber def 141 / eva 126 + Mana-Schild machen den Magier nicht wirklich glasig. Die in run3-combat gemeldete Magie-Überhöhung (L50 1.57×) ist im Band **enger** geworden (jetzt ~5 % über Ranged), aber zusammen mit P1 heißt das: Magie + Ranged teilen sich die Spitze, Melee fällt ab. **Fix-Vorschlag:** primär über P1 lösen (Melee anheben); falls Magie danach übersteht, magicDamage-pro-Robenslot leicht trimmen statt Burst+Sustain weiter zu stapeln.

### [P3 Balance] `sorrow_wraith` (L72) ist ein milder XP-Dichte-Ausreißer
**Befund (Monster-Dump):** `sorrow_wraith` hat **xp 680 / hp 500 → xp/hp 1.36**, deutlich über den gleichstufigen Nachbarn ohne Tank-Mechanik (frost_hexer L68 1.06, void_stalker L66 0.90) — und trägt **kein** regen/enrage (nur inflict burn), wird im Sim genauso schnell gelegt (4.7–7 s/Kill). Die hoch-xp/hp-Mobs daneben (roc_storm 1.46, bone_colossus 1.48, highland_wyvern 1.54) rechtfertigen ihre Dichte über enrage/regen — `sorrow_wraith` nicht ganz. Weit harmloser als der alte `tide_siren` (1.06 vs 0.27-Nachbarn), daher P3. **Fix-Vorschlag:** xp ~680 → ~520 (Linie void_stalker/frost_hexer), oder ein leichtes regen/enrage spendieren, wenn die Dichte gewollt ist.

### [P3 Content] Combat-XP-Vielfalt im Spät-Mid ist dünn (besonders für Nicht-Slayer)
**Befund:** Nur ~13 Mobs decken L50–75 ab, verteilt auf highlands (3: roc_hunter L50, roc_elder L65, roc_storm L75 — große Lücken 50→65→75), slagpit (5), coast (1: deep_kraken) und slayer_tower (6, slayer-gegatet). Ein Nicht-Slayer-Spieler stützt sich faktisch auf highlands + slagpit; zwischen roc_hunter (L50) und roc_elder (L65) klafft in den highlands eine 15-Level-Lücke. Kein Wall (slagpit füllt auf), aber die On-Level-Auswahl ist enger als im Mid-Game. **Fix-Vorschlag:** 1–2 Nicht-Slayer-Mobs im Fenster L55–62 (z. B. highlands/coast) ergänzen.

---

## Δ vs Run 3 (Beleg)

| run3-Befund | Status in Run 4 | Beleg |
|---|---|---|
| ranged `evasion += 5` Flat-Bonus (run3-combat P1) | **GEFIXT** | aus `character.ts` entfernt (Kommentar Z. 234–238); kein Flat-Bonus mehr. *Aber:* Ranged-Evasion bleibt strukturell am höchsten (169–221 vs melee 56–75) über dex + Leder-Evasion. |
| `tide_siren` XP-Trichter (run3-mid P2) | **GEFIXT** | xp 340→**90**, xp/hp 1.06→**0.28**. |
| Magie-Robe-Kadenz-Lücke L22–45 (run3-mid P2) | **GEFIXT** | `ember_robe_*` @L30–32 eingezogen (genau der Vorschlag). |
| Magie überschießt (run3-combat P2, L50 1.57×) | **TEILS** | Band enger (~1.0× zu Ranged), aber Magie bleibt top-DPS; jetzt eher Melee-Problem. |
| Nahkampf an jedem Checkpoint am langsamsten (run3-combat P1) | **NICHT GEFIXT** | im Spät-Mid 0.63–0.69× — die zentrale offene Balance-Baustelle (s. P1). |
| Ranged-Leder-Lücke (run3-combat/mid P3, L28→L50) | **VERSCHOBEN, NICHT GESCHLOSSEN** | jetzt L52→L72 mitten im Spät-Mid (s. P1-Ranged). |

---

## Fazit
Der Kampf ist **bug- und wallfrei** und trägt den Spieler robust bis an die Endgame-Schwelle (0 Tode, regen/enrage/inflict/Auto-Eat alle sauber, XP-Dichte zieht monoton an). Die Spät-Mid-Erfahrung wird **nicht von Mechanik-Defekten** gebremst, sondern von **Balance-Asymmetrien**: Nahkampf ist ~⅓ hinter Fern-/Magie-Durchsatz (P1), Fernkampf-Rüstung steht 18–20 Level still (P1), und die Nicht-Melee-Stile tragen eine Crafting-Ausrüst-Steuer (P2). Eine Melee-Offense-Anhebung + ein Leder-Zwischen-Tier ~L60 würden den Score zügig Richtung 8 heben.
