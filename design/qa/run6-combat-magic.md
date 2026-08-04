# QA-Run 6 — Combat-Tiefenanalyse: MAGIE (nach Round-4-Fixes)

**Tester:** Playtester-Analyst (READ-ONLY, keine Content/Engine-Änderung) · **Datum:** 2026-06-28
**Scope:** Magie-Stil nach den **Round-4-Fixes** seit run5: (1) **manaCost-Cap** — Stab-Spitze 24→**10** (godiron/aetherium_staff), Wand-Spitze 12→**8** (godiron/aetherium_wand); (2) **godspark-Robe** `magicDamage` ×1,5 (Body 18→**27**, Mitre 11→**17**, Skirt 12→**18**, Hände/Schuhe je **17**) **+ `manaRegen` 0,6 je Teil** (Set = +3,0); (3) **GEARED_HERO-Sim repariert**. Frage des Chefs: **Ist die manaCost-Falle weg (Top-Stäbe nicht mehr durchsatz-negativ) und sitzt Magie im Band 0,90–1,10× @L10/L40/L99 (per-Mob UND sustained)? Stirbt Magie endgame noch?** Vergleich: `design/qa/run5-combat-magic.md` (war **8,0**; Mana-Falle = P1).

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→Skills auf Checkpoint-Level→Gear via `equipItem`→`startCombat`→`advance`, realer Combat-Loop, Seed 5). **Best-craftable pro Slot** (Score: Stil-Schaden » Stil-Attribut » manaRegen/maxMana » Def/HP/Krit). Waffenwahl **mana-bewusst per voller 1-h-Sim je Kandidat** (das Harness wählt die Waffe, die real die meisten Kills bringt, nicht die mit der höchsten Rohzahl). Pro Stil nur die stil-realistisch trainierten Skills auf Level L (Magie: magic_off/magic_def/runecrafting/leatherworking + defence/vitality) → **symmetrische Attribut-Skalierung** (jeder Stil zieht sein Offense-Attribut aus genau einer Offense-Fertigkeit). Auto-Eat `cooked_voidray` → **0 Tode** → Ratios = reine **Offense**. **7 on-level Mobs je Checkpoint**, **per-Mob-Ratio gemittelt, Ranged = 1.00** (R3/run5-Standard). L99 schließt die **Regen-Endgame-Mobs** ein (dort haben fast alle on-level Mobs `regen` — das IST der Endgame-Content; die Ratio bleibt stil-symmetrisch aussagekräftig). Mana per-Sekunde über 3-min-Fenster gesampelt. **Harness nach dem Lauf entfernt — `packages/**` unverändert.** Alle Zahlen unten sind reale Sim-Ausgaben.

---

## Fun-Score: **8,5 / 10**  (run5: 8,0 — **+0,5**)

**Die Mana-Falle ist eindeutig WEG — der run5-P1 ist vollständig erledigt.** Der höchste craftbare Stab (godiron_staff, 90 magicDamage, manaCost 24→**10**) springt von **0,69× (durchsatz-NEGATIV!) auf 1,22×** — er spielt seinen Schaden jetzt voll aus. Kein craftbares Top-Tier ist mehr throughput-negativ; die invertierte Progression von run5 existiert nicht mehr. Mana **beißt endgame nicht mehr** (godspark-Robe liefert jetzt manaRegen 12,7/s statt 9,7/s; below-cost 0,0 %), und das **Mid-Game (L40) sitzt nahezu perfekt** (Stab 1,09×, Wand 1,08× — Band-Kante). 0 Tode/NaN/Crashes über alle Builds.

**Was den Sprung auf 9,5 verhindert:** Die R4-Buffs haben **nach oben überkorrigiert**. Magie driftet auf **allen** Checkpoints hoch (Δ Stab L99 **+0,26**, L40 +0,12) und steht endgame mit **1,21× vs Ranged außerhalb des 0,90–1,10-Bands** — auf **jedem** der 7 Endgame-Mobs über Ranged (Stab 1,07–1,32). Auch L10-Wand überschießt weiter (1,18×). Magie ist damit nirgends mehr eine Decke wie in run4, aber an den Rändern (L10/L99) auch nicht mehr sauber im Band. Mildernd: Magie trackt eng den **Melee**-Wert (L99 Magie 1,21 vs Melee 1,25) — ein Teil des „Overshoots vs Ranged" ist ein **niedriger Ranged-Boden** (Cross-Style, Ranged-Revier), nicht reine Magie-Stärke.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, 7 on-level Mobs; ×-Faktor = per-Mob-Ratio-Mittel, **Ranged = 1.00**)

| Build | L10 | L40 | L99 (inkl. Regen-Mobs) |
|---|---:|---:|---:|
| **Melee** | 5615 (**1.30×**) | 3162 (**0.89×**) | 3428 (**1.25×**) |
| **Ranged** | 4253 (1.00×) | 3645 (1.00×) | 2751 (1.00×) |
| **Stab** | 4472 (**1.05×**) | 3937 (**1.09×**) | 3320 (**1.21×**) |
| **Wand+Fokus** | 5035 (**1.18×**) | 3916 (**1.08×**) | 3286 (**1.20×**) |
| **BESTE MAGIE** | **1.18×** | **1.09×** | **1.21×** |

Gewählte Magie-Waffe/Gear je Checkpoint: L10 iron_wand / iron_staff (kein Robe-Tier, Eisen-Platte); L40 mithril_wand / aether_runestaff + **ember_robe-Set**; L99 godspark_staff / aetherium_wand + **volles godspark-Set + godiron_focus** (godspark-Robe-Fix verifiziert: wird dank ×1,5 als Best-in-Slot gewählt).

**Band-Urteil:** Von 6 Magie-Werten (Stab+Wand × 3 Checkpoints) liegen **3 im Band 0,90–1,10** (Stab L10 1,05, Stab+Wand L40 1,08–1,09); **3 überschießen** (Wand L10 1,18; Stab+Wand L99 1,21/1,20). **L40 ist makellos**, **L10/L99 überschießen**. Per-Mob endgame: Magie schlägt Ranged auf **allen 7** Mobs (Stab 1,07–1,32, Wand 1,07–1,30) — die Endgame-Stärke ist breit, kein Einzel-Mob-Artefakt.

### Δ vs run5 (×-Faktor jeweils vs Ranged)

| Checkpoint | run5 Stab | run5 Wand | **run6 Stab** | **run6 Wand** | Δ Stab | Δ Wand |
|---|---:|---:|---:|---:|---|---|
| L10 | 0.98× | 1.17× | **1.05×** | **1.18×** | +0.07 | +0.01 |
| L40 | 0.97× | 1.05× | **1.09×** | **1.08×** | +0.12 | +0.03 |
| L99 | 0.95× | 1.06× | **1.21×** | **1.20×** | **+0.26** | **+0.14** |

**Antwort auf die Kernfrage:** (a) **Mana-Falle: JA, weg.** Top-Stäbe sind nicht mehr durchsatz-negativ (godiron_staff 0,69×→1,22×, aetherium_staff 0,70×→1,14×). (b) **Im Band? Teilweise** — L40 perfekt, L10/L99 überschießen jetzt (run5 war L40/L99 im Band, L10 drüber). Die R4-Buffs haben den run5-Endgame-Boden (0,95–1,06×) gezielt angehoben, aber **über** die 1,10-Decke geschoben. (c) **Stirbt Magie endgame? Nein — Gegenteil.** Magie ist endgame jetzt die Nr. 2 (knapp unter Melee, klar über Ranged), Mana üppig.

---

## Mana-Verlauf (3-min-Sampling, on-level rep-Mob; Pool min/avg/max, below-cost % = Weak-Melee-Fenster)

| Build | maxMana | min | avg | Cost | Regen/s | below-cost % |
|---|---:|---:|---:|---:|---:|---:|
| Stab L10 (iron_staff) | 59 | 4 | 16 | 6 | 2.9 | 1.1 % |
| Wand L10 (iron_wand) | 59 | 2 | 16 | 5 | 2.9 | 2.8 % |
| Stab L40 (aether_runestaff) | 165 | 8 | 54 | 7 | 5.1 | **0.0 %** |
| Wand L40 (mithril_wand) | 165 | 3 | 36 | 6 | 5.1 | 2.8 % |
| **Stab L99 (godspark_staff)** | **357** | **251** | **334** | 9 | **12.7** | **0.0 %** |
| **Wand L99 (aetherium_wand)** | **357** | 61 | 270 | 8 | **12.7** | **0.0 %** |

**Lesart:** Das ist die **Kehrseite** des Fixes. In run5 biss Mana endgame real (Stab below-cost 0,1 %, Wand 7,1 %; min-Pool niedrig). In run6 ist Mana **endgame üppig** — der godspark-`manaRegen` (12,7/s vs run5 9,7/s) + maxMana 357 (run5 312) + niedrige Cast-Kosten (9/8) sorgen dafür, dass der Pool **nie** unter die Cast-Schwelle fällt (below-cost 0,0 %, Stab-min 251/357). Der tier-skalierte Mana-Schild (`2 × (1 + level/50)`) zieht zwar am Pool, aber der Regen überholt ihn deutlich. **Folge:** Die Mana-Mechanik ist endgame **wieder inert** (run4-B4-artig) — Mana ist kein Resource-Management mehr, sondern ein voller Tank. Früh/Mid beißt es noch leicht (L10 1–3 %, L40-Wand 2,8 %), dort funktioniert die Identität. **Trade-off:** run5 hatte „Mana beißt + Falle"; run6 hat „keine Falle + Mana inert". Die Wahrheit liegt dazwischen — der manaRegen-Buff war für die Falle **größer als nötig**.

---

## Top-Stärken (Magie)

1. **Mana-Falle eliminiert (run5-P1 erledigt).** Jeder craftbare Top-Stab ist jetzt throughput-**positiv**: godiron_staff 0,69×→**1,22×**, aetherium_staff 0,70×→**1,14×**. Kein Top-Tier ist mehr strikt schlechter als Ranged oder als ein niedrigeres Tier in der „bestraft-den-Main"-Schwere von run5.
2. **godspark-Robe-Fix verifiziert & wirksam.** Body magicDamage 27, Mitre 17, Skirt 18, Hände/Schuhe je 17 (= run5 ×1,5); manaRegen 0,6 je Teil. Das Harness wählt das **volle godspark-Set** als Best-in-Slot @L99 (run5 musste teils niedrigere Tiers nehmen). maxMana 312→**357**, manaRegen 9,7→**12,7/s**.
3. **Mid-Game (L40) makellos.** Stab 1,09×, Wand 1,08× — beide an der Band-Kante, per-Mob 0,94–1,18. Bester Checkpoint des Stils.
4. **Identität intakt, robust.** Status-Effekte/Krit/Burn/accuracy (magic_off-gekoppelt) unberührt; **0 Tode, 0 NaN, 0 Crashes** über 3 Checkpoints × 4 Builds × 7 Mobs + voller Waffen-Sweep.

---

## Priorisierte Findings

### [P0] — keine. Keine Crashes, NaN-Drift, 0 Tode über alle Magie-Läufe.

### [P1 Balance] Endgame-Magie überschießt das Band (L99 1,21× vs Ranged, auf ALLEN Mobs)
**Befund (7 Endgame-Mobs, gemittelt):** Stab godspark 1,21×, Wand aetherium 1,20×, BESTE 1,21× — out of band (>1,10). Per-Mob durchgehend über Ranged: Stab 1,07–1,32 (aether_wraith 1,26, charred_doomknight 1,27, scale_skarn 1,32), Wand 1,07–1,30. run5 war hier 0,95–1,06× (sauber im Band). Die R4-Buffs (godspark ×1,5 + manaRegen) waren auf den Endgame-Boden gezielt, haben ihn aber **über die Decke** gehoben (Δ Stab L99 **+0,26**). **Mildernd:** Melee liegt mit 1,25× praktisch gleichauf — ein Teil des Effekts ist ein **niedriger Ranged-Boden** (Cross-Style). Magie vs Melee ist gesund (Magie 1,21 knapp unter Melee 1,25). Die reine Band-Verletzung **vs Ranged** ist aber real.
**Fix-Vorschlag:** godspark-`magicDamage`-Buff war zu groß — ×1,5 auf ~×1,3 zurücknehmen **oder** den `manaRegen`-Anteil (12,7/s) leicht kürzen (s. P2 — er treibt zugleich die Mana-Inertheit). Ziel: Endgame-Magie ~1,05–1,10× statt 1,21×. **Alternativ Cross-Style:** Ranged-Boden anheben (Ranged-Revier) — dann sitzt das ganze Dreieck. (Revier: content für Robe-Werte; Balance-Designer für Ziel.)

### [P2 Balance] Mana ist endgame wieder inert (Kehrseite des manaRegen-Buffs)
**Befund:** below-cost @L99 = **0,0 %** (Stab) / **0,0 %** (Wand), Stab-Pool min 251/357. Mana fällt nie unter die Cast-Schwelle → der `MAGIC_WEAK_FACTOR (0,35)`-Notschlag feuert nie, Mana ist reines „voller Tank". run5 hatte hier 0,1 %/7,1 % (Mana biss). Der godspark-`manaRegen` (0,6 × 5 Teile → 12,7/s gesamt) wurde **größer dimensioniert als zur Fallen-Behebung nötig**. Die Mana-Resource-Identität (Cast→Regen→Cast) existiert endgame nicht mehr.
**Fix-Vorschlag:** `manaRegen` der godspark-Teile von 0,6 auf ~0,3–0,4 senken — die manaCost-Cap (24→10) allein behebt die Falle bereits; der volle Regen-Buff obendrauf ist die Überdosis. Dann beißt Mana endgame wieder leicht (Ziel below-cost ~3–7 % wie run5-Wand), ohne die Falle zurückzuholen. (Revier: content.)

### [P2 Balance] Residuale Nicht-Monotonie an der Stab-Spitze (kein Trap mehr)
**Befund (forced @aether_wraith):** godspark_staff (req88, epic, 1,26×) > godiron_staff (req99, Top-craftable, dmg90, 1,22×) > aetherium_staff (req90, dmg74, **1,14×**). Der **stärkste** Stab ist die **req88-Drop** (godspark, crit 0,05 + critDamage 0,15 + Burn), **nicht** das höchst-gegatete Craft (godiron req99). aetherium_staff (req90) ist eine lokale Delle unter beiden. **ABER:** alle drei sind jetzt **>1,0× und stark** — die run5-Bestrafung („grind zu req99 → 0,69×") ist weg. Es ist nur noch eine **kosmetische** Progressions-Unebenheit, **nicht mehr mana-getrieben** (Mana üppig), sondern weil godsparks Krit/Burn-Profil aetheriums höhere Rohzahl schlägt.
**Fix-Vorschlag (niedrige Prio):** aetherium_staff (dmg74) etwas Krit/critDamage geben oder godiron_staff (dmg90) leicht anheben, sodass req↑ ⇒ Durchsatz↑ monoton ist. Kosmetik, kein Spielspaß-Killer.

### [P2 Feel] Endgame-Waffen-Progression ist stark komprimiert (Upgrades fühlen sich gewichtslos an)
**Befund (forced @aether_wraith):** Wand-Tiers copper (dmg2) → titanium (dmg40) liefern **alle ~1,07–1,09× (495–500 kills)** — die Waffen-`magicDamage` ist gegenüber Skill+Gear-magicDamage (magic_off 99 ≈ +119, int ≈ +41, Robe ≈ +96) **Rauschen**. Erst aetherium/godiron-Wand (dmg47/58 + hohe accuracy) springen auf 1,21. Heißt: ein Caster spürt 10 von 12 Wand-Upgrades praktisch **nicht**. Bei Stäben mildert der eskalierende Burn das etwas (mehr Streuung), aber das Grundmuster bleibt.
**Fix-Vorschlag:** Caster-Waffen-`magicDamage` über die Tiers spreizen (steilere Kurve) **oder** Skill/Attribut-Anteil am magicDamage senken, damit die Waffe wieder spürbares Gewicht bekommt. (Revier: content/Balance.)

### [P3 Balance] L10-Wand überschießt weiterhin (1,18×) — von R4 nicht adressiert
**Befund:** Wand+dim_focus ist früh der stärkste Stil (5035 vs Ranged 4253 = 1,18×; run5 1,17× — praktisch unverändert). Stab L10 dagegen 1,05× (sauber, +0,07 vs run5). Billige Cast-Kosten (5) + −300 ms aIMs + Fokus-Krit machen den frühen Wand-Caster überlegen.
**Fix-Vorschlag:** Früh-Foki (dim_focus) oder Früh-Wand-`magicDamage` minimal trimmen bis L10-Wand ≤1,10×. (Revier: content.)

### [P3 Kontext — außerhalb Magie-Scope, für Ranged/Melee-Personas] Ranged ist der Boden
**Befund:** L99-Ordnung Melee 1,25 > Stab 1,21 > Wand 1,20 > **Ranged 1,00**; L10 Melee 1,30 > Wand 1,18 > Stab 1,05 > Ranged 1,00. Melee UND Magie liegen an den Rändern ~20–30 % über Ranged. Ein Teil des „Magie-Overshoots" (P1) ist also ein **niedriger Ranged-Boden** — erst wenn Ranged angehoben (oder Magie+Melee getrimmt) wird, sitzt das ganze Dreieck im Band. Für die Ranged/Melee-Tester notieren.

---

## Mechanik-Checks (Magie, alle bestanden)
- **manaCost-Cap im Content** verifiziert: godiron_staff/aetherium_staff `manaCost 10`, godiron_wand/aetherium_wand `manaCost 8` (run5: 24/21 bzw. 12/12). Stab-Leiter jetzt flach 5→10, Wand 4→8.
- **godspark-Robe-Fix** verifiziert: magicDamage ×1,5 + manaRegen 0,6 je Teil; Set wird als Best-in-Slot @L99 gewählt; maxMana 357, manaRegen 12,7/s.
- **Per-Waffe `manaCost`** korrekt gelesen (`castManaCost`), Fallback `MANA_PER_CAST = 6` bei fehlendem Feld (gnarled/bramble_witchstaff) — greift sauber.
- **Mana-Schild tier-skaliert** (`2 × (1 + level/50)`, Cast-Reserve geschützt, Deckel 0,5) — greift, wird aber endgame vom Regen überholt (s. P2).
- **Cast → Weak-Melee (×0,35) → Regen → Resume** deterministisch; Burn nur bei echtem Cast.
- **accuracy** stil-abhängig an `magic_off` gekoppelt (run3-B1 intakt).

## „Was fehlt für 9,5?"
1. **Endgame-Overshoot trimmen (P1)** — godspark-`magicDamage`-Buff von ×1,5 auf ~×1,3 zurücknehmen, bis L99-Magie ~1,05–1,10× statt 1,21× trifft. **Größter Hebel.**
2. **Mana endgame wieder beißen lassen (P2)** — godspark-`manaRegen` 0,6→~0,35; die Cost-Cap behebt die Falle allein, der Regen-Buff ist die Überdosis, die Mana inert macht.
3. **Stab-Spitze monoton machen (P2)** — aetherium_staff (req90) aus der Delle heben bzw. godiron_staff (req99) über godspark (req88) ziehen, damit req↑ ⇒ Durchsatz↑.
4. **Caster-Waffen spürbar machen (P2)** — magicDamage-Kurve spreizen, damit Wand/Stab-Upgrades nicht im Skill-magicDamage untergehen.
5. **L10-Wand auf ≤1,10× trimmen (P3)** + **(cross-style) Ranged-Boden anheben** — erst dann sitzt das Dreieck sauber.

## Fazit
Die Round-4-Fixes haben ihr **Hauptziel erreicht: die Mana-Falle ist eindeutig tot** — der höchste craftbare Stab geht von durchsatz-negativ (0,69×) auf stark (1,22×), kein Top-Tier bestraft den Magie-Main mehr, und das Mid-Game (L40) sitzt makellos. Das ist der run5-P1, gelöst. **Aber die Korrektur ist nach oben übers Ziel hinausgeschossen:** der godspark-`magicDamage`-×1,5 + manaRegen-Buff hebt die Endgame-Magie von run5s sauberen 0,95–1,06× auf **1,21× vs Ranged** (out of band, auf allen 7 Mobs) und macht **Mana endgame wieder inert** (below-cost 0,0 %). Wir haben eine **eng begrenzte Waffen-Falle gegen einen breiten Aufwärts-Drift + inerte Mana** eingetauscht — netto fun-positiver (Overshoot spielt sich besser als ein Trap, Mid-Game ist exzellent), daher **+0,5 auf 8,5/10**. Für 9,5 muss der Endgame-Buff zurückgedreht werden (×1,5→~×1,3, manaRegen 0,6→~0,35), bis Magie an allen drei Checkpoints im Band sitzt und Mana wieder leicht beißt. Reine Content-Justierungen.

*(Sim-Harness war temporär und wurde nach dem Lauf entfernt — keine Engine-/Content-Änderung; `packages/**` unverändert.)*
