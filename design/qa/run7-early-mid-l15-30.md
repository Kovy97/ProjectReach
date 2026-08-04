# QA-Run 7 — Übergang Früh→Mid (Level 15–30)

**Tester:** Playtester-Analyst (READ-ONLY; nur diese Datei geschrieben, Temp-Harness nach dem Lauf entfernt) · **Datum:** 2026-06-28
**Persona:** Spieler im Übergang L15–30, Crypt-Grinder. **Kernfrage:** Ist die in Run6 gemeldete **L16-Melee-Überschuss-Regression (1,44×)** durch die „str-Doppelzählung weg" geschlossen, und ist **Suffix-Loot jetzt früh im Kampf sichtbar** (Crypt-Equipment-Drops)?
**Run-7-Kontext (laut Chef/R5):** (1) **str-Doppelzählung weg** → Melee @L16 nicht mehr 1,44×; (2) **Crypt-Mobs droppen jetzt Equipment** → Suffix früh sichtbar.

**Methode — echte Sim-Daten:** Temporäres Harness direkt auf der Engine (`createGame`→`startCombat`→`advance`, deterministischer Seed 5), je Checkpoint **drei stil-realistische, slot-vergleichbare Builds** gegen den on-level Crypt-Mob (skeleton_warrior L16 / skeleton_butcher L24 / skeleton_icemage L30) über je **1 h** Spielzeit. Stil-Skills auf das Checkpoint-Level inkl. Pflicht-Craft-Gates (melee: attack+power+defence+vitality+**smithing** · ranged: ranged+defence+vitality+fletching+leatherworking · magic: magic_off+magic_def+defence+vitality+runecrafting). Slot-symmetrische Rüstung (Helm/Body/Legs/Gloves/Boots; Melee zusätzlich Tropfenschild im offhand — legitimer 1H-Dolch-Vorteil), voller Köcher, Food cooked_anglerfish + Auto-Eat T2, voller HP-Eintritt. **Beide Nahkampf-Stile gemessen:** „power" (Wucht = DPS-optimal, identisch zur Run6-Primärmetrik) **und** „attack" (Default-Stance). Magie mit **stufengerechten Robes** (L16 apprentice, L24/L30 frost-set — die apprentice-Robe trägt **kein** magicDamage und verfälschte sonst die Mid-Werte). Zusätzlich: **5h-Drop-Scan** über alle Crypt-Mobs (Equipment-Drops + erzeugte Suffix-Instanzen), Code-Verifikation von `skills.smithing.trains`, Platten-`modifiers.str`/`bonus.meleeDamage`, Crypt-`loot`, `DEFAULT_DROP_SUFFIX_CHANCE`. **Harness nach dem Lauf entfernt.** Abgeglichen mit `run6-early-mid-l15-30.md`.

> **Methodik-Hinweis:** Absolute kills/h sind wegen Kit-Wahl nicht 1:1 mit Run6, das Parität-Maß ist das **Stil-Verhältnis innerhalb desselben Laufs**. Kalibrierung: mein Fernkampf-Kit (531/436/454) deckt sich mit Run6 (531/431/483), Magie mit fairem Frost-Kit (467/441) deckt sich mit Run6 (451/428) — die Builds sind also vergleichbar.

---

## Fun-Score: **8,5 / 10**  (Δ vs run6: **+0,5**)

Ein **echter Doppel-Gewinn** und ein **mis-getroffener Hebel.**

**Gewinn 1 — Suffix-Loot ist endlich im Kampf-Pfad angekommen (teilweise).** Die Run5/Run6-Dauerlücke „0 Crypt-Equipment-Drops" ist am **Crypt-Eingang aufgebrochen**: skeleton_warrior (L16) droppt `iron_sword` @2,5 %, skeleton_archer (L18) `iron_shortbow` @3 %, skeleton_spearman (L20) `iron_spear` @2,5 % — jeder mit `DEFAULT_DROP_SUFFIX_CHANCE` (8 %). Der 5h-Scan **erzeugt real Suffix-Instanzen** (warrior 2, archer 8, spearman 2 über 5h). Der Crypt-Grinder im unteren Band **erlebt** jetzt Random-Rolls aus dem Kampf, nicht nur aus der Schmiede. Das ist die erste echte Einlösung des „Suffix sichtbar"-Ziels im Combat-Loop.

**Gewinn 2 — Magie ist zurück im Band, kein Boden mehr.** Mit stufengerechtem Frost-Kit liegt Magie @L24 bei **0,90×** und @L30 bei **0,97×** — der **L30-Spread fällt auf 1,03×** (Run6: 1,13×), der engste Mid-Wert im ganzen Band. Die in run6-combat-melee gemeldete „Magie = neuer Boden" ist im L24–30-Übergang **nicht** mehr zu sehen.

**Der mis-getroffene Hebel — L16 ist weiter 1,44× (power-Stil).** Die „str-Doppelzählung weg" ist **im Code real umgesetzt** (smithing trainiert kein Attribut mehr → str L16 **18→14**, L24 23→17, L30 ~26→18; meleeDamage entsprechend −6 bis −12). **Aber sie bewegt die L16-Parität nicht:** der power-Stil-Nahkämpfer macht weiter **763 kills/h** (Run6: 766) vs ranged 531 / magic 539 → **Spread unverändert 1,44×**. Grund: Der L16-Überschuss hängt **nicht an str**, sondern am **melee-exklusiven Wucht-`dmgMult` (+12 % nur auf meleeDamage)**, der den Dolch über die **2-Schlag-Schwelle** gegen den 120-HP-Warrior hebt (attack-Stil dmg 64 → 3 Schläge → 541/h; power-Stil dmg 71 → 2 Schläge → 763/h). Die str-Reduktion senkte den power-dmg nur von ~77 auf 71 — **immer noch über** der 2-Schlag-Schwelle. Der Fix zielte auf den falschen Hebel; run6-combat-melee hatte den richtigen (Wucht-dmgMult) bereits benannt.

0 Tode über alle 24 Builds/Checkpoints/Stile, deterministisch, lückenlose Mob-Leiter. Zwei echte Gewinne (Suffix-im-Kampf + Magie-im-Band) heben den Score, aber der **marquee Run6-P1 (L16-Überschuss) bleibt offen** und die **Suffix-Drops fehlen genau an den zwei Kern-Grind-Mobs (butcher L24, icemage L30)** → **+0,5, nicht mehr.**

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, **0 Tode überall**)

### Power-Stil (Wucht = DPS-optimal; identisch zur Run6-Primärmetrik)
| Stil (Waffe) | L16 vs warrior | L24 vs butcher | L30 vs icemage |
|---|---:|---:|---:|
| **Melee (Dolch+Schild)** | **763 (1.00×)** | **518 (1.00×)** | 453 (1.00×) |
| **Ranged (Kurzbogen)** | 531 (0.70×) | 436 (0.84×) | **454 (1.00×)** |
| **Magic (Stab, Frost-Robe)** | 539 (0.71×)* | 467 (0.90×) | 441 (0.97×) |
| **Spread** | **1.44×** | **1.19×** | **1.03×** |

\* L16-Magie mit apprentice-Robe (frost req magic_off 22 @L16 nicht tragbar) — band-korrekt.

### Attack-Stil (Default-Stance eines neuen Spielers)
| Stil | L16 | L24 | L30 |
|---|---:|---:|---:|
| Melee | 541 (1.00×) | 487 (1.00×) | 443 (0.98×) |
| Ranged | 531 (0.98×) | 436 (0.90×) | 454 (1.00×) |
| Magic | 539 (1.00×) | 467 (0.96×) | 441 (0.97×) |
| **Spread** | **1.02×** | **1.12×** | **1.03×** |

**Lesart:** Der L16-Überschuss ist ein **reines power-Stil-Artefakt**. Im Default-Stil (attack) sitzt L16 bei **1,02×** — vollständig im Band; erst der DPS-Optimierer, der bewusst „Wucht" wählt, springt durch die 2-Schlag-Schwelle auf 1,44×. L24/L30 sind in **beiden** Stilen im Band (1,03–1,19×).

**Begleit-Stats @L24** (computeStats): Melee steel_dagger dmg 90/81 (power/attack), acc 172/193, aIMs 2435, str **17** (Run6: ~23 — Doppelzählung weg), eva 36, def 104, hp 487 · Ranged steel_shortbow dmg 54, acc 198, crit 0.18, eva 37, def 22, hp 289 · Magic steel_staff+frost dmg 89, acc 170, mana 107, manaCost 6, eva ~49.
**Begleit-Stats @L30:** Melee dmg 102/91, acc 202/226, str **18** (Run6: ~26) · Ranged dmg 67, acc 234, crit 0.18, eva 42 · Magic dmg 103, acc 196, mana 114.

---

## Suffix-Drop-Scan (5h Grind je Mob, Equipment-Drops + erzeugte Suffix-Instanzen)

| Mob | Lvl | kills/5h | Equipment-Drops | **Suffix-Instanzen/5h** |
|---|---:|---:|---|---:|
| skeleton_warrior | 16 | 2771 | iron_sword ×55 (2,5 %) | **2** |
| skeleton_archer | 18 | 3809 | iron_shortbow ×110 (3 %) | **8** |
| skeleton_spearman | 20 | 2789 | iron_spear ×63 (2,5 %) | **2** |
| **skeleton_butcher** | **24** | 2175 | **— (0)** | **0** |
| **skeleton_icemage** | **30** | 2376 | **— (0)** | **0** |

**Lesart:** Suffix-im-Kampf ist am **Crypt-Eingang (L16–20) real** — über einen typischen Multi-Stunden-Grind fallen mehrere verzauberte Waffen. **Aber die zwei Mobs, an denen die L24–30-Persona die meiste Zeit verbringt (butcher, icemage), droppen weiterhin NULL Equipment** → 0 Suffix. Der Kern-Grind des Bandes bleibt suffix-frei aus dem Kampf. Craft-Suffix-Pfad unverändert intakt (`tryCraftSuffix`, run6 verifiziert 21,4 %).

---

## Top-Stärken

1. **Suffix-Loot endlich im Combat-Loop (L16–20).** Erste Einlösung der seit Run5 offenen „Suffix sichtbar"-Lücke im Kampf; real erzeugte Instanzen im Scan. Δ vs run6: **0 → mehrere/5h**.
2. **Magie zurück im Band.** L30 0,97× / L24 0,90× (faires Frost-Kit) — die run6-Magie-Boden-Diagnose ist im Übergangsband geheilt. L30-Spread **1,03×** = engster Mid-Wert bisher.
3. **str-Doppelzählung sauber aus dem Code entfernt.** `smithing` trainiert kein Attribut mehr (`packages/content/src/index.ts:13`, Kommentar „trainieren kein Kampf-Attribut") → melee-str L16/24/30 von ~18/23/26 auf **14/17/18** gefallen. Korrekter, gezielter Eingriff — nur am L16-Symptom wirkungslos (s. P1).
4. **L24/L30 robust im Band in BEIDEN Stilen** (1,03–1,19×). Der Mid-Übergang ist parität-mäßig in gutem Zustand.
5. **0 Tode / 0 Walls / Determinismus.** 24 Builds × 0 Tode, monotone Skalierung, lückenlose Crypt-Leiter, Seed-5-stabil.

---

## Priorisierte Findings

### [P1 Balance] L16-Melee-Überschuss bleibt 1,44× (power-Stil) — der Fix traf den falschen Hebel
**Befund (Sim):** Power-Stil-Melee @L16 = **763 kills/h** (Run6 766, praktisch unverändert) vs ranged 531 (0,70×) / magic 539 (0,71×) → **Spread 1,44×**. Die str-Doppelzählung IST entfernt (str 18→14, dmg ~77→71), aber der dmg bleibt **über der 2-Schlag-Schwelle** gegen den 120-HP-Warrior (power 2 Schläge @71 = 142>120; attack 3 Schläge @64). Treiber ist der **melee-exklusive Wucht-`dmgMult`** (`character.ts:211/221` — `dmgMult` wirkt nur auf `meleeDamage`, ranged/magic bekommen 0 %), nicht die str-Quelle.
**Persona-Wirkung:** Der DPS-optimierende Schwertträger räumt L16 weiter ~44 % schneller; der Bogi/Magier fühlt sich am Bandeingang zweitklassig. Im Default-(attack-)Stil ist L16 dagegen 1,02× — das Problem trifft nur den Min-Maxer, ist aber genau die in Run6 als P1 markierte Regression.
**Fix-Vorschlag (combat/balance):** Den **Wucht-`dmgMult`** adressieren statt str — entweder den +12 % auf ranged/magic spiegeln (style-symmetrisch) ODER auf ~+6 % senken, sodass power-Melee @L16 unter die 2-Schlag-Schwelle (≤60 dmg/Hit nach Mitigation) fällt. **Gegenprobe-Pflicht:** 120-HP-Mob, beide Nahkampf-Stile, Ziel L16-power-Spread ≤1,15×.
**Δ vs run6:** **Unverändert (1,44× → 1,44×).** Der applizierte Hebel (str) war nicht der wirksame; run6-combat-melee-P1 („Wucht-dmgMult prüfen") bleibt der offene Punkt.

### [P2 Loot] Suffix-Drops fehlen an den zwei Kern-Checkpoint-Mobs (butcher L24, icemage L30)
**Befund (Scan):** L16–20-Crypt-Mobs droppen jetzt Equipment (+ reale Suffixe), aber **skeleton_butcher (L24) und skeleton_icemage (L30) droppen 0 Equipment** (nur crude_bone/scarred_hide/frost_essence) → 0 Suffix aus dem Kampf. Genau diese beiden Mobs sind der Haupt-Grind der L24–30-Persona.
**Persona-Wirkung:** Der „oh, das hat *des Bären*!"-Sog erreicht den Crypt-Eingang, aber nicht das Mid-Grind-Herz des Bandes — der Spieler verliert den Reiz beim Aufstieg, statt ihn mitzunehmen.
**Fix-Vorschlag (content):** butcher → seltener Knochen-Themen-Equipment-Drop (z. B. ein Bone-Cleaver @3 %); icemage → ein Frost-Themen-Item @3 % — analog zu warrior/archer/spearman, gern mit leicht erhöhter `loot.suffixChance`.
**Δ vs run6:** **Teilweise gefixt** — von „0 Crypt-Equipment-Drops überall" auf „L16–20 ja, L24/L30 nein".

### [P3 Balance] Fernkampf weiter ohne Glass-Cannon-Kehrseite (eva 37/42 vs Platten-Melee 36/40 — jetzt ~gleichauf)
**Befund (Sim):** Im L15–30-Band ist die Bogen-Evasion **nicht** mehr deutlich über dem Platten-Melee (L24 37 vs 36, L30 42 vs 40) — anders als run6 dort meldete (88 vs 36), weil mein studded-leather-Kit weniger Evasion trägt als run6s Leder-Kit. Die intendierte Stil-Identität (Fernkampf = hoher Schaden / geringe Defensive) entsteht damit weiterhin **nicht** — Fernkampf ist hier schlicht mid-pack ohne ausgeprägtes Risiko-Profil.
**Fix-Vorschlag:** Stil-Identität schärfen (Fernkampf-Evasion bewusst über Platten-Melee, dafür weniger def/hp) — reine Zahlen-Angleichung erzeugt keine spürbar unterschiedliche Spielweise.
**Δ vs run6:** Kit-abhängig; im getesteten Band keine Inversion sichtbar, aber das Identitäts-Ziel bleibt offen.

### [P3 Economy] Gold-Knappheit endet früh (bekannt/deferred)
**Befund:** Combat-Gold ungedämpft; on-level-Einkommen wächst über die Pflicht-Käufe. Identisch Run3–6. Per Chef an die City-Welle gekoppelt (**deferred**).
**Δ vs run6:** Unverändert (deferred).

---

## Persona-Antworten (kompakt)

- **Parität @L16/24/30 wieder im Band (Melee-Überschuss weg)?** 🟡 **Überwiegend, aber L16 hängt.** L24 1,12–1,19× ✅, L30 **1,03×** ✅ (Magie zurück). **L16 power-Stil weiter 1,44×** ❌ (Default-Stil 1,02× ✅). Der Überschuss lebt im Wucht-dmgMult, nicht in str.
- **str-Doppelzählung weg?** ✅ **Im Code real** (smithing trainiert kein Attribut; str spürbar gefallen) — aber am L16-Symptom **wirkungslos**, weil der falsche Hebel war.
- **Suffix-Loot früh im Kampf sichtbar?** 🟡 **Ja am Crypt-Eingang (L16–20)**, real erzeugte Instanzen — **nein an den Kern-Mobs L24/L30** (0 Equipment-Drops).
- **Magie gegen evasive Mobs (Icemage L30)?** ✅ **0,97×, Spread 1,03×** — bestens.
- **Pacing / Walls / Tode:** ✅ 0 / 0 / 0 über alle 24 Builds.

---

## Δ vs run6 — Status (Übersicht)

| Thema | run6 | run7 |
|---|---|---|
| 3-Stil-Spread @L16 (power) | 🔴 1,44× (Melee-Überschuss, P1) | 🔴 **1,44× unverändert** — str-Fix mis-getroffen (Wucht-dmgMult ist der Treiber) |
| 3-Stil-Spread @L16 (attack/default) | (nicht gemessen) | 🟢 **1,02×** — im Default-Stil voll im Band |
| 3-Stil-Spread @L24 | 🟡 1,23× | 🟢 **1,12–1,19×** (Magie erholt) |
| 3-Stil-Spread @L30 | 🟢 1,13× | 🟢 **1,03×** — engster Mid-Wert |
| Magie im Band | 🔴 neuer Boden (run6-melee P1) | 🟢 **L24 0,90× / L30 0,97×** (faires Frost-Kit) |
| str-Doppelzählung (smithing+Platte) | 🔴 doppelter str | 🟢 **entfernt** (smithing trainiert nichts) |
| Suffix im Kampf-Pfad (Crypt L16–20) | 🟡 0 Equipment-Drops | 🟢 **Drops + reale Suffix-Instanzen** |
| Suffix im Kampf-Pfad (Kern L24/L30) | 🟡 0 | 🔴 **weiter 0** (butcher/icemage) |
| Ranged Glass-Cannon-Kehrseite | 🟡 offen | 🟡 offen (Kit-abhängig, im Band ~gleichauf) |
| Gold-Sink mid | ⏸️ deferred | ⏸️ deferred |
| Tode / Walls | 0 / 0 | 0 / 0 |

---

## Was fehlt für 9,5?

1. **Den RICHTIGEN L16-Hebel ziehen: Wucht-`dmgMult` statt str (P1).** Der +12 % ist melee-exklusiv und hebt den Dolch über die 2-Schlag-Schwelle gegen 120-HP-Mobs — das ist die wahre Quelle des 1,44×. Entweder style-symmetrisch auf ranged/magic spiegeln oder auf ~+6 % senken, bis power-Melee @L16 ≤1,15× liegt. (str-Doppelzählung war korrekt, aber die falsche Stellschraube für dieses Symptom.)
2. **Suffix-Reiz auf die Kern-Mobs bringen (P2).** butcher (L24) + icemage (L30) brauchen seltene, themengerechte Equipment-Drops — sonst erlebt die Mid-Persona Random-Rolls nur am Bandeingang und verliert sie beim Aufstieg.
3. **Stil-Identität schärfen (P3).** Fernkampf eine echte Glass-Cannon-Kehrseite geben (eva > Platten-Melee, dafür weniger def/hp) statt nur Zahlen anzugleichen.
4. **Mitwachsender Gold-Sink** (deferred City-Welle).
5. **Politur:** Mob-Resistenzen (Frost/Burn) im UI sichtbar, damit die Element-Wahl gegen den frost-resistenten Icemage bewusst wird.

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice, großer Onboarding-Flow** — laut MEMORY spätere Meilensteine, nicht bewertet.
- **UI-Anzeige (Suffix-Name im Tooltip, Mob-Resist, Köcher-Munition)** — UI-Revier; reine Engine/Content-Linse hier.
- **Endgame-Skalierung (L75+), Slayer, Packaging** — außerhalb der L15–30-Persona.
- **Temp-Harness** (`_run7earlymid.test.ts`, `_run7suffixscan.test.ts`, `_run7magicfair.test.ts`) nach dem Lauf **entfernt** — kein Rückstand in `packages/engine/src/`. (Hinweis: ein fremdes `_run7harness.test.ts` (Endgame L84–120) eines parallelen Laufs liegt im Ordner und wurde **nicht** angefasst.)
