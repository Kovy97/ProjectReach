# Schmuck-Audit und Rework-Plan

**Datum:** 2026-08-29 · **Stand:** `0249b88`, Branch `feat-1.0.1-ui-skalierung`
**Autor:** balance-designer · **Status:** PLANUNG — keine Content-Änderung, `packages/**` nur gelesen
**Anlass:** Chef-Auftrag „Warum hat der Sapphire ring auch 1 Attack? Schmuck macht aktuell überhaupt keinen Sinn" + „Plane ein Rework, craftbar und findbar, wir brauchen mehr Variierung" + „Darfst auch gerne mehr Ringe erstellen"

> **Methodik.** Alle Zahlen stammen aus dem echten Katalog, nicht aus Regex-Schätzung: `packages/content/src/index.ts` wurde per `ts.transpileModule` transpiliert und als Objekt geladen (1215 Items, 810 Aktionen). Die Craft-Erkennung der Vorarbeit scheiterte an zwei Dingen — Slots stehen in **doppelten** Anführungszeichen (`slot: "ring1"`), und Rezept-Ergebnisse stehen im Feld **`loot`**, nicht `outputs`. Beides ist hier korrigiert.

---

# Teil 0 — Kurzfassung

Der Chef hat recht, und die Ursache ist struktureller als der eine Ring.

1. **Fernkampf hat null craftbare Unterstützung.** Von 81 Schmuckstücken trägt genau **eines** einen `ranged`-Boost (`slayer_amulet`) — und das boostet alle drei Stile gleichzeitig, ist also kein Fernkampf-Schmuck, sondern Slayer-Schmuck. Ein Bogenschütze kann in der Juwelierskunst **kein einziges Stück** herstellen, das seinen Stil unterstützt.
2. **Craftbar = Zahlenstange, findbar = Charakter.** 27 Schmuckstücke tragen einen echten Sondereffekt (`weaponEffect`) — und **alle 27 sind Fundstücke**. Von den 27 craftbaren Stücken trägt **kein einziges** einen Sondereffekt, einen `bonus`, einen `masterPerk` oder auch nur einen Trinity-Wert. Die gesamte Variation des Systems liegt außerhalb des Handwerks.
3. **Die craftbare Ring-Leiter sackt im Mittelspiel um 30–40 % durch** und macht dann bei L95 einen Sprung. Zwischen L20 und L85 liegt jeder Ring 3 bis 5 Attributpunkte unter der glatten Linie zwischen seinen eigenen Endpunkten.

**Lohnt Schmuck heute?** Für Nahkämpfer ja, für Magier halb, für Fernkämpfer nein. Drei Schmuckslots (`ring1`, `ring2`, `amulet`) liefern zusammen rund 3,4 Rüstungsteile an Attributen — das ist an sich fair. Aber ein Viertel dieses Budgets (25,7 %) steckt in `lck`, das nachweislich **nur** Krit und Suffix-Chance speist, im Endgame-Vollstack **exakt 0 %** Schaden bringt, und dessen Suffix-Anteil ab lck 50 tot ist, während der BiS-Charakter bei lck 82 liegt.

---

# Teil 1 — Bestandsaufnahme

## 1.1 Die Zahlen

| Kennzahl | Wert |
|---|---|
| Schmuckstücke gesamt | **81** |
| davon Slot `ring1` | 49 |
| davon Slot `amulet` | 32 |
| davon Slot `ring2` | **0** (siehe §1.9 — Ringe routen automatisch) |
| craftbar (Juwelierskunst) | **26** + `slayer_amulet` |
| aus Kampfquellen (Monster/Elite/Dungeon/Paragon) | 22 |
| aus Token-Laden | 5 |
| Meisterringe (Skill 99) | 21 |
| Elite-Signaturen (`uniqueItemId`) | 4 |
| Anteil `lck` an allen Attributpunkten | **25,7 %** (186 von 723) |
| Schmuck in einem Set | **0** von 36 Sets |

## 1.2 Quellen-Matrix

| Quelle | Anzahl | Stücke |
|---|---|---|
| Juwelierskunst-Rezept | 26 | garnet/sapphire/gemstone/ruby/bloodstone/diamond/onyx/voidstone/godgem × Ring+Amulett, fang_necklace, soul_amulet, warband_signet, alpha_fang_amulet, spellbinder_ring, stormcaller_amulet, grave_warden_band, heartforged_pendant |
| Monster-Loot | 11 | eye_of_the_idol, felmagician_eye, cinderloop_ring, soulopal_band, soulthorn_pendant, abyssal_signet, pearl_of_the_deep, fang_pendant, emberheart_amulet, doomforged_band, soulflayer_amulet |
| Monster + Elite | 5 | boartusk_ring, drovers_charm, bulls_heart_pendant, cutpurse_ring, bonecharm_amulet |
| Monster + Dungeon | 4 | necrosignet_ring, alphas_heart_ring, stormcore_pendant, aetherband_ring |
| Elite-Signatur | 4 | blackhoof_charm, carrion_talisman, ninth_wardens_signet, hollowveil_locket |
| Token-Laden (Chronik) | 5 | chronicle_wanderers_seal, chronicle_ash_mark, chronicle_tide_chain, chronicle_idol_eye_ring, chronicle_chronicler_signet |
| Dungeon | 1 | sevenfold_crown_chain |
| Paragon + Dungeon + Elite | 1 | idolbound_signet |
| Skill-99-Belohnung | 21 | `ring_master_*` |
| Slayer-Laden + Craft | 1 | slayer_amulet |

## 1.3 Stil-Deckung — der Kern der Chef-Frage

Gezählt über `skillBoost`: Nahkampf = `attack`/`power`, Fernkampf = `ranged`, Magie = `magic`/`warding`.

| Stil | alle 81 | **craftbar (26)** | findbar/sonstige |
|---|---|---|---|
| Nahkampf | **31** | **15** | 16 |
| Magie | 10 | **5** | 5 |
| **Fernkampf** | **1** | **1** | 0 |
| ohne jeden Boost | 41 | 8 | 33 |

Das eine Fernkampf-Stück ist `slayer_amulet` (`attack 3, ranged 3, magic 3`) — ein stil-neutrales Slayer-Item, kein Fernkampf-Schmuck. **Gezielten Fernkampf-Schmuck gibt es im Spiel nicht, auf keiner Stufe, aus keiner Quelle.**

Für Magie ist die Lage weniger dramatisch, aber löchrig: die craftbaren Magie-Stücke sind `soul_amulet` (L15), `sapphire_amulet` (L18), `spellbinder_ring` (L46) und `stormcaller_amulet` (L65). **Oberhalb Juwelierskunst 65 kann ein Magier kein Schmuckstück mehr herstellen, das Magie unterstützt.** Die vier Top-Rezepte der Fertigkeit (onyx/voidstone/godgem, L70–L99) sind Nahkampf oder boostlos.

## 1.4 Die craftbare Leiter, vollständig

| Stufe | id | Slot | Attribute | Skill-Boost | Pkt | Wert |
|---|---|---|---|---|---|---|
| 1 | garnet_ring | Ring | str 1 | power 1 | 1 | 160 |
| 3 | garnet_amulet | Amulett | con 2 | — | 2 | 200 |
| 5 | fang_necklace | Amulett | str 1, lck 2 | power 1 | 3 | 90 |
| 15 | sapphire_ring | Ring | **int 2** | **attack 1** | 2 | 360 |
| 15 | soul_amulet | Amulett | con 1, int 1 | magic 1 | 2 | 200 |
| 15 | warband_signet | Ring | str 2, lck 1 | attack 1 | 3 | 280 |
| 18 | sapphire_amulet | Amulett | con 1, int 2 | magic 1 | 3 | 440 |
| 20 | gemstone_ring | Ring | con 1, lck 2 | attack 1 | 3 | 400 |
| 26 | gemstone_amulet | Amulett | con 2, lck 2 | attack 1 | 4 | 480 |
| 34 | ruby_ring | Ring | str 2, lck 2 | power 1 | 4 | 640 |
| 36 | alpha_fang_amulet | Amulett | str 3, lck 3 | power 1 | 6 | 900 |
| 38 | ruby_amulet | Amulett | str 3, con 2, lck 2 | power 1 | 7 | 760 |
| 44 | bloodstone_ring | Ring | str 2, dex 1, lck 2 | power 1 | 5 | 1000 |
| 46 | spellbinder_ring | Ring | int 4, lck 2 | magic 2 | 6 | 1200 |
| 48 | bloodstone_amulet | Amulett | str 3, con 4, lck 3 | — | 10 | 1200 |
| 55 | diamond_ring | Ring | dex 1, con 4, lck 2 | attack 2 | 7 | 1200 |
| 55 | **grave_warden_band** | Ring | con 4 | — | 4 | **2200** |
| 60 | diamond_amulet | Amulett | dex 2, con 6, lck 3 | — | 11 | 1500 |
| 65 | stormcaller_amulet | Amulett | dex 1, int 5, lck 4 | magic 3 | 10 | 2800 |
| 70 | onyx_ring | Ring | str 2, dex 1, **int 2**, lck 3 | power 3 | 8 | 2600 |
| 75 | onyx_amulet | Amulett | dex 2, con 7, lck 5 | — | 14 | 3200 |
| 82 | heartforged_pendant | Amulett | str 3, dex 1, con 5, int 2, lck 2 | — | 13 | 5000 |
| 85 | voidstone_ring | Ring | str 3, dex 1, **int 4**, lck 3 | power 3 | 11 | 4200 |
| 88 | voidstone_amulet | Amulett | dex 2, con 8, lck 5 | — | 15 | 5500 |
| 95 | godgem_ring | Ring | str 4, dex 2, **int 5**, lck 6 | power 4 | 17 | 7800 |
| 99 | godgem_amulet | Amulett | dex 2, con 9, lck 7 | — | 18 | 9800 |

Fett = Richtungskonflikt (Magie-Attribut, Nahkampf-Boost) bzw. Preisbruch.

## 1.5 Progression — die Ring-Leiter sackt durch

Ziel-Linie = glatte Gerade zwischen den eigenen Endpunkten der Leiter (L1 = 1 Punkt, L95 = 17 Punkte), also `Punkte(L) = 0,8 + 0,17·L`.

| Stufe | Ring | ist | Ziel | Δ |
|---|---|---|---|---|
| 1 | garnet_ring | 1 | 1 | 0 |
| 15 | warband_signet | 3 | 3 | 0 |
| 20 | gemstone_ring | 3 | 4 | −1 |
| 34 | ruby_ring | 4 | 7 | **−3** |
| 44 | bloodstone_ring | 5 | 8 | **−3** |
| 55 | diamond_ring | 7 | 10 | **−3** |
| 70 | onyx_ring | 8 | 13 | **−5** |
| 85 | voidstone_ring | 11 | 15 | **−4** |
| 95 | godgem_ring | 17 | 17 | 0 |

Anders gerechnet: von L1 bis L70 wächst die Leiter um 7 Punkte in 69 Stufen (**0,10 Punkte je Stufe**). Von L70 bis L95 um 9 Punkte in 25 Stufen (**0,36 Punkte je Stufe**). Das letzte Viertel der Fertigkeit liefert mehr Zuwachs als die ersten drei Viertel zusammen — genau die „wenige große Sprünge statt vieler Sprossen"-Form, die wir vermeiden wollen.

**Die Amulett-Leiter ist dagegen in Ordnung.** Gegen `Punkte(L) = 1,7 + 0,17·L` liegen L48 (10 vs 10), L60 (11 vs 12), L75 (14 vs 14), L88 (15 vs 17) und L99 (18 vs 18) sauber auf der Linie. Das Problem sind die Ringe, nicht die Amulette.

### Konkrete Inversionen und Preisbrüche

| # | Fund | Schwere |
|---|---|---|
| P1 | `grave_warden_band` (L55): 4 Punkte, kein Boost, **Wert 2200** — gegen `diamond_ring` derselben Stufe mit 7 Punkten, `attack +2`, Wert 1200. **Strikt schlechter bei 1,8-fachem Preis.** Das Rezept kostet zusätzlich ein `grave_warden_sigil`. | **S1** |
| P2 | `fang_necklace` (L5): Wert **90** — unter `garnet_amulet` (L3, Wert 200), obwohl statistisch stärker (3 vs 2 Punkte). | S3 |
| P3 | `ruby_amulet` (L38, 7 Pkt): Wert **760** — unter `alpha_fang_amulet` (L36, 6 Pkt, Wert 900). Höhere Stufe, mehr Punkte, weniger wert. | S3 |
| P4 | `soul_amulet` (L15): 2 Punkte — weniger als `fang_necklace` (L5, 3 Punkte). Zehn Stufen später, schwächer. | S3 |
| P5 | `heartforged_pendant` (L82, 13 Pkt, Wert 5000) gegen `onyx_amulet` (L75, 14 Pkt, Wert 3200). Sieben Stufen höher, ein Punkt weniger, 56 % teurer. | S2 |
| P6 | `stormcaller_amulet` (L65, 10 Pkt) gegen `diamond_amulet` (L60, 11 Pkt). Vertretbar, weil Stormcaller `magic 3` trägt — aber es ist die einzige Magie-Option und sollte nicht auch noch Punkte verlieren. | S3 |
| P7 | Wert-Plateau `spellbinder_ring` (L46) = `diamond_ring` (L55) = 1200, danach Sprung auf 2600 (L70). Flachstelle plus Klippe. | S3 |

## 1.6 Vergleich zu anderen Slots — lohnt Schmuck?

Median der Attributpunkte je Item und Anforderungsband:

| Band | Rüstungsteil | Ring | Amulett |
|---|---|---|---|
| L0–9 | 2 | 1 | 3 |
| L10–19 | 2 | 3 | 3 |
| L20–29 | 3 | 3 | 4 |
| L30–39 | 5 | 4 | 7 |
| L40–49 | 6 | 6 | 10 |
| L50–59 | 7 | 7 | — |
| L60–69 | 8 | — | 11 |
| L70–79 | 9 | 8 | 18 |
| L80–89 | 10 | 11 | 15 |
| L90–99 | 14 | 4 * | 37 |

\* verzerrt durch die 21 Meisterringe, die bewusst wenige Attribute tragen.

**Urteil:** Ein Ring entspricht ungefähr einem Rüstungsteil, ein Amulett rund dem 1,4-Fachen. Drei Schmuckslots liefern damit etwa **3,4 Rüstungsteile an Attributen** — das ist ein fairer Anteil und rechtfertigt den Aufwand grundsätzlich. Der Schmuck ist **nicht zu schwach in der Summe**, er ist **falsch verteilt**: zu viel `lck`, zu wenig Stil-Ausrichtung, keine Effekte auf der craftbaren Seite.

## 1.7 Glück (`lck`) — was es wirklich tut

Vollständige Auswertung des Engine-Codes. `lck` hat **genau drei Leser**:

| Ort | Formel | Wirkung |
|---|---|---|
| `packages/engine/src/character.ts:663` | `critAttr = dex·0,4 + lck·0,6`; `critChance = 0,45·S/(S+75)`, Cap **0,50** | Krit-Chance, gesättigt |
| `packages/engine/src/character.ts:754` | `critDamage = 1,5 + lck·0,01`, Cap **2,50** | +1 Prozentpunkt Krit-Schaden je Punkt |
| `packages/engine/src/suffix.ts:46` | `+0,003·lck`, gedeckelt bei **+0,15** | Suffix-Chance beim Craft/Drop |

**`lck` beeinflusst KEINE Drop-Chance, KEIN Gold, KEINEN Sammel-Ertrag.** Die einzige Kill-Loot-Rolle (`packages/engine/src/combat.ts:1153`) multipliziert nur mit `rareDropMult` (Segen + Camp-Schrein) und `lootChanceMult` (Rune der Nachlese). Die Doppelertrag-Kette in `tick.ts:193` besteht aus Mastery, Pool, Pet, Buff und `masterPerk` — kein `lck`.

Was **+10 lck aus Schmuck** wirklich bringen:

| Charakter | Krit-Chance | Krit-Schaden | Suffix | **Gesamtschaden** |
|---|---|---|---|---|
| Früh (dex 10, lck 5→15) | 3,84 → 6,65 % | 1,55 → 1,65 | +1,5 → +4,5 Pp | **+2,16 %** |
| Mitte (dex 25, lck 20→30) | 10,21 → 12,23 % | 1,70 → 1,80 | +6,0 → +9,0 Pp | **+2,47 %** |
| Endgame (dex 45, lck 82→92) | 21,27 → 22,23 % | 2,32 → 2,42 | +15 → +15 Pp (Cap) | **+2,73 %** |
| Endgame Vollstack | 50 % (Cap) | 2,50 (Cap) | Cap | **0,00 %** |

**Urteil:** `lck` ist nicht tot, aber **flach und gedeckelt**. Rund 2,5 % Gesamtschaden je 10 Punkte über die gesamte Progression, und im BiS-Vollstack exakt null. Der Suffix-Anteil ist ab lck 50 wertlos, während der BiS-Charakter laut `crit-taming.test.ts:116` bei lck **82** liegt — 32 Punkte ohne jede Wirkung auf Suffixe.

Dass **25,7 % des gesamten Schmuck-Attributbudgets** in diesen Stat fließt, ist damit **nicht gerechtfertigt**. `lck` ist der Grund, warum Schmuck sich „nach nichts" anfühlt: der Spieler legt ein Stück an, sieht eine große Zahl, und merkt keinen Unterschied.

> **Nebenbefund:** `effectiveSuffixChance` ist als „Pure-Funktion für die UI (Live-Prozent-Chip)" dokumentiert (`suffix.ts:38`), wird aber **nirgends im Client aufgerufen**. Der einzige Weg, die Suffix-Wirkung von `lck` überhaupt zu sehen, existiert nicht.

## 1.8 Meisterringe — wird `masterPerk` angezeigt?

**Die Anzeige funktioniert. Der Spielerreport hat trotzdem eine reale Ursache.**

- **Engine:** vollständig verdrahtet. `masterPerkValue` (`packages/engine/src/capes.ts:63`) scannt alle `EQUIP_SLOTS` inklusive `ring2`, additiv, gedeckelt auf `MASTER_PERK_CAP`. Alle 8 Kinds haben einen echten Callsite (`doubleYield` → `tick.ts:199` und `hunting.ts:294`, `inputSaver` → `tick.ts:100`, `cropSpeed` → `farming.ts:163`, `buffDuration` → `consumable.ts:71`, `slayerPoints` → `slayer.ts:456`, usw.). Kein totes Feld.
- **Client:** die Item-Karte zeigt den Perk. `apps/client/src/renderer/components/ItemTooltip.tsx:1333` (`EffectBlock`), eingebunden ohne Ansichts-Bedingung in `ItemTooltipCard`, getriggert aus Inventar, Bank, Shop, Charakterblatt und allen Skill-Seiten. i18n vollständig in 7/7 Sprachen.
- **Der echte Fehler (S1):** `masterDoubleYieldBonus` **fehlt in der Client-Ertragsvorschau**. `apps/client/src/renderer/util/actionRate.ts:113` summiert Mastery, Pool, Pet, Buff — aber nicht den Meisterring-Doppelertrag, den die Engine an derselben Stelle (`tick.ts:193`) sehr wohl addiert. Ergebnis: Der Spieler legt den Meisterring an, die angezeigte Doppelertrag-Chance und „Items/Stunde" ändern sich um **exakt 0**, obwohl der Perk wirkt. Genau das dürfte der Spieler gemeldet haben. Analog fehlt `masterPreserveBonus` in der Material-Spar-Anzeige (`util/masteryRank.ts:71`).
- **Zweite Lücke (S2):** `ItemWikiModal.tsx` zeigt `masterPerk` nicht — die Fakten-Kacheln listen armorRating, evasionRating, wardCapacity, blockChance, Wert und Stapelbarkeit, lassen den Perk aber aus.
- **Kosmetisch (S3):** `packages/engine/src/balance-envelope.test.ts:863` heißt „GENAU 14 tragen einen masterPerk", die Liste darunter hat 15 Einträge (`ring_master_tailoring` kam mit SAVE 86 dazu, der Titel wurde nicht nachgezogen).

## 1.9 Zwei Ringplätze — ja, beide bespielbar

`ring2` steht in `EQUIP_SLOTS` (`packages/shared/src/index.ts:2043`). Kein Item trägt `slot: "ring2"` — stattdessen routet die Engine automatisch: `packages/engine/src/equipment.ts:87` legt einen zweiten Ring in `ring2`, wenn `ring1` belegt ist. Zwei Ringe plus ein Amulett sind also real tragbar.

**Wichtige, bisher ungenutzte Mechanik:** `collectSpecialEffects` (`packages/engine/src/combat.ts:592`) sammelt Effekte über **alle** Slots. Dabei gilt:
- `healOnKill`, `wardOnKill`, `cooldownOnKill` **addieren** sich über alle Quellen,
- **alle anderen Effekt-Kinds nehmen das Maximum**, nicht die Summe.

Zwei Ringe mit demselben `bounty`-Effekt bringen also **nichts**. Das Spiel belohnt bereits heute das Kombinieren **verschiedener** Effekte — nur weiß das kein Spieler, und der craftbare Schmuck bietet gar keine Effekte zum Kombinieren.

---

# Teil 2 — Fehler nach Schwere

## S1 — muss in 1.2.1

| # | Fund | Detail | Empfehlung |
|---|---|---|---|
| **S1-a** | **Fernkampf hat null craftbaren Schmuck** | 1 von 81 Stücken trägt `ranged`, und das ist das stil-neutrale `slayer_amulet` | Fernkampf-Reihe anlegen (Teil 3, Welle 2) |
| **S1-b** | `sapphire_ring` | `int 2` + `skillBoost { attack: 1 }` — Intelligenz plus Nahkampf-Treffsicherheit auf demselben Ring. Das Gegenstück `sapphire_amulet` ist stimmig. | `skillBoost` → `{ magic: 1 }`, `int 2` → `int 2, wis 1` |
| **S1-c** | `grave_warden_band` | L55, 4 Punkte, kein Boost, Wert 2200 vs `diamond_ring` (L55, 7 Punkte, attack 2, Wert 1200). Strikt schlechter, 1,8-fach teurer, verbraucht zusätzlich ein `grave_warden_sigil`. | Wert 2200 → 1300; Attribute auf 10 Punkte heben und Boost geben |
| **S1-d** | Meisterring-Doppelertrag unsichtbar | `masterDoubleYieldBonus` fehlt in `apps/client/src/renderer/util/actionRate.ts:113` | ui-dev: Term ergänzen, analog `masterPreserveBonus` in `masteryRank.ts:71` |

## S2 — nächstes Update

| # | Fund | Detail |
|---|---|---|
| **S2-a** | **Magie-Deckel bei L65** | Oberhalb `stormcaller_amulet` gibt es keinen craftbaren Magie-Schmuck. Die vier Top-Rezepte (L70–L99) sind Nahkampf oder boostlos. |
| **S2-b** | **Ring-Leiter sackt durch** | −3 bis −5 Punkte zwischen L20 und L85, dann Sprung von 11 auf 17 Punkte in den letzten 10 Stufen |
| **S2-c** | **Richtungskonflikte** (13 Stück, s. Tabelle unten) | Magie-Attribut plus Nahkampf-Boost auf demselben Stück |
| **S2-d** | **`lck`-Übergewicht** | 25,7 % des Attributbudgets in einem Stat, der ~2,5 % Schaden je 10 Punkte bringt und im BiS-Stack 0 % |
| **S2-e** | **Craftbarer Schmuck hat keine Effekte** | **0 von 27** craftbaren Stücken tragen `weaponEffect`, `bonus`, `masterPerk` oder einen Trinity-Wert. Alle 27 Effekt-Träger im Schmuck sind Fundstücke. |
| **S2-f** | `heartforged_pendant` | L82, 13 Punkte, 5000 Gold gegen `onyx_amulet` L75, 14 Punkte, 3200 Gold |
| **S2-g** | `ItemWikiModal` zeigt `masterPerk` nicht | Fakten-Kacheln lassen den Perk aus |

### Die 13 Richtungskonflikte im Detail

| Stück | Quelle | Attribute | Boost | Konflikt |
|---|---|---|---|---|
| `sapphire_ring` | Craft L15 | int 2 | attack 1 | INT → Nahkampf |
| `onyx_ring` | Craft L70 | str 2, dex 1, **int 2**, lck 3 | power 3 | 2 tote INT-Punkte |
| `voidstone_ring` | Craft L85 | str 3, dex 1, **int 4**, lck 3 | power 3 | 4 tote INT-Punkte |
| `godgem_ring` | Craft L95 | str 4, dex 2, **int 5**, lck 6 | power 4 | 5 tote INT-Punkte |
| `diamond_ring` | Craft L55 | dex 1, con 4, lck 2 | attack 2 | DEX ohne `ranged` |
| `felmagician_eye` | Drop | int 4, wis 5 | attack 2 | 9 Magie-Punkte, Nahkampf-Boost |
| `soulopal_band` | Drop | str 3, dex 3, int 3, lck 3 | power 1 | Gießkanne, kein Profil |
| `soulthorn_pendant` | Drop | str/dex/con/int/lck je 2 | power 2 | Gießkanne |
| `necrosignet_ring` | Drop | str 4, con 3, int 4, lck 4 | power 1 | 4 tote INT |
| `aetherband_ring` | Drop | str 4, dex 2, con 3, int 4, lck 4 | power 4 | 4 tote INT |
| `doomforged_band` | Drop | str 4, con 3, int 4, **lck 8** | power 3 | 4 tote INT, lck-Klumpen |
| `idolbound_signet` | Paragon | str 5, dex 2, con 6, int 4, lck 6 | attack 3 | 4 tote INT |
| `soulflayer_amulet` | Drop | str 4, con 5, int 5, **lck 9** | power 4 | 5 tote INT, lck-Klumpen |

> **Zur Bewertung nach Thema:** Saphir = blau, kühl → Magie. Der Ring widerspricht seinem eigenen Amulett. Rubin = rot, Blut → Kraft, stimmig. Blutstein → Kraft, stimmig. Onyx = schwarz, hat **kein** eigenes Thema und wird deshalb zum Gießkannen-Item. Diamant/Godgem sind neutral. Empfehlung: die Edelsteinfarbe legt den Stil fest, wo sie eine hat (Saphir→Magie, Rubin→Kraft), und die **Fassung** legt ihn bei den neutralen Steinen fest (Metall→Nahkampf, Leder→Fernkampf, Rune→Magie). Siehe §3.4.

## S3 — Sammelposten

P2 (`fang_necklace` Wert 90), P3 (`ruby_amulet` 760 < `alpha_fang_amulet` 900), P4 (`soul_amulet` 2 Punkte auf L15), P6, P7 (Wert-Plateau L46–L55), Testtitel `balance-envelope.test.ts:863`, `effectiveSuffixChance` ohne Aufrufer, `ring_master_completion` mit nur 12 Punkten für 22×99 Fertigkeiten.

---

# Teil 3 — Das Rework

## 3.1 Die Achse der Variation

Heute unterscheiden sich zwei Ringe derselben Stufe nur durch die Höhe derselben Zahlen. Künftig sollen sie sich durch **drei** Achsen unterscheiden:

| Achse | Was sie leistet | Getragen von (existiert bereits) |
|---|---|---|
| **1. Stil** | Für welchen Kampfstil ist das Stück? | `skillBoost` + Attributprofil |
| **2. Trinity-Wert** | Wie kämpfst du innerhalb des Stils? | `armorPen` (Nahkampf), `precision`/`evasionRating` (Fernkampf), `wardBreak`/`wardCapacity` (Magie), `blockChance` |
| **3. Sondereffekt** | Was passiert im Kampf Besonderes? | `weaponEffect` (31 Typen), `bonus.{hpRegenPerSec, lifesteal, critDamage}`, `masterPerk` (8 Kinds) |

**Nichts davon muss erfunden werden.** Die Engine kann alle drei Achsen bereits:

- `collectSpecialEffects` (`packages/engine/src/combat.ts:592`) liest `weaponEffect` über **alle** `EQUIP_SLOTS` — Ringe und Amulette tragen Effekte heute schon (27 Stück tun es, alle davon Fundstücke). Es ist also **keine Engine-Arbeit** nötig, um craftbaren Schmuck interessant zu machen; die Fähigkeit liegt ungenutzt herum.
- Die Trinity-Werte sind bereits auf den Meisterringen etabliert: `ring_master_attack` → `armorPen 0.02`, `ring_master_ranged` → `precision 0.02`, `ring_master_magic` → `wardBreak 0.03`, `ring_master_defence` → `blockChance 0.02`. Das ist exakt das Muster, das nach unten auf die Craft-Leiter verlängert werden soll.
- `masterPerk` mit 8 Kinds (`doubleYield`, `inputSaver`, `alwaysSucceed`, `cropSpeed`, `buffDuration`, `slayerPoints`, `successBoost`, `stunReduction`) ist voll verdrahtet und additiv über alle Slots.

Effekt-Typen, die es gibt und die auf Schmuck **noch gar nicht** vorkommen — der Fundus für die findbare Reihe:
`execute`, `firstStrike`, `firstBlood`, `momentum`, `desperation`, `surplus`, `frostbite`, `thorns`, `critBurst`, `gutter`, `plaguebearer`, `lightblessing`, `giantSlayer`, `eagleEye`, `vengeance`, `packLeader`.

## 3.2 Craftbar gegen findbar — die Rollen

Der Vorschlag des Koordinators trägt, mit einer Schärfung. Prüfung gegen die bestehende Wächter-Regel `packages/content/src/drop-gear-beats-craft.test.ts`: sie verlangt für jedes Kampfquellen-Unique (1) Kernwert ≥ Craft-Gegenstück der **nächsten** Stufe, (2) **Effekt vorhanden**, (3) Dropchance unter dem Deckel, (4) Requirement ≤ Quellen-Level.

Punkt (2) ist der Hebel: **die Regel verlangt Effekte von Drops, verbietet sie dem Handwerk aber nicht.** Würde man craftbaren Stücken dieselben `weaponEffect`-Typen geben, verwischt der Unterschied und die Drops verlieren ihre Rolle. Deshalb die **saubere Trennung nach Effekt-Familie**:

| | **Craftbar (Juwelierskunst)** | **Findbar (Drop/Elite/Dungeon)** |
|---|---|---|
| **Versprechen** | Verlässlich, planbar, gezielt wählbar | Überraschung, Signatur, Chase |
| **Stil** | Der Spieler wählt ihn beim Craften | Vom Fundort vorgegeben |
| **Effekt-Familie** | **Trinity-Werte** (`armorPen`/`precision`/`evasionRating`/`wardBreak`/`wardCapacity`) — passiv, planbar, additiv | **`weaponEffect`** (31 Typen) — situativ, überraschend |
| **Attributbudget** | Auf der Kurve (§3.3) | Kurve der **nächsten** Stufe (bestehende Chase-Regel) |
| **Wert** | Rezeptkosten + Material, Wertkurve §3.3 | 1,5- bis 2-fach über dem Craft-Gegenstück derselben Stufe |
| **Verfügbarkeit** | Jederzeit, planbar, wiederholbar | Chance ≤ 15 %, Chase ≤ 0,1 %, Elite-Signatur 20 % |

Diese Trennung ist **regelkonform** (die Wächter-Regel bleibt grün, weil Craft-Stücke keine `weaponEffect` bekommen und beim Kernwert unter den Drops bleiben), **erklärbar** („geschmiedet gibt dir Präzision, gefunden gibt dir Magie") und **erweitert die Kombinationstiefe**: ein Spieler trägt einen Craft-Ring für den verlässlichen Trinity-Wert und einen Fund-Ring für den Effekt.

> **Chef-Entscheid nötig (E-1):** Soll craftbarer Schmuck grundsätzlich **keine** `weaponEffect` tragen? Die Alternative wäre, den Top-Rezepten (L85/L95) je einen schwachen Effekt zu erlauben, damit das Fertigkeits-Ende sich besonders anfühlt. Meine Empfehlung: **nein, sauber trennen** — sonst verliert die findbare Reihe ihren einzigen Alleinstellungspunkt.

## 3.3 Die Kurven, auf die gebaut wird

Alle neuen und überarbeiteten Stücke folgen diesen Formeln. Sie sind aus den bestehenden Endpunkten abgeleitet, nicht neu erfunden.

| Größe | Formel | Beispielwerte |
|---|---|---|
| **Ring-Attributpunkte** | `round(0,8 + 0,17·L)` | L15 → 3, L34 → 7, L55 → 10, L70 → 13, L85 → 15, L95 → 17 |
| **Amulett-Attributpunkte** | `round(1,7 + 0,17·L)` | L18 → 5, L38 → 8, L48 → 10, L60 → 12, L75 → 14, L88 → 17, L99 → 18 |
| **Skill-Boost** | `ceil(L / 24)`, max 4 | L1–24 → 1, L25–48 → 2, L49–72 → 3, L73–99 → 4 |
| **`lck`-Anteil** | **höchstens 15 %** des Budgets (heute 25,7 %) | L70-Ring: max 2 von 13 Punkten |

Die Formeln treffen die bestehenden Endpunkte exakt (`garnet_ring` L1 = 1 Punkt, `godgem_ring` L95 = 17 Punkte, `godgem_amulet` L99 = 18 Punkte), heben also **nur die durchhängende Mitte** und erfinden kein neues Machtniveau.

**Trinity-Werte auf Schmuck** — Obergrenze ist jeweils der Meisterring, der als 99er-Belohnung die Krone behält:

| Wert | Craft-Leiter L15 → L95/99 | Deckel (Meisterring) |
|---|---|---|
| `armorPen` (Nahkampf) | 0,004 → 0,018 | 0,02 (`ring_master_attack`) |
| `precision` (Fernkampf) | 0,004 → 0,018 | 0,02 (`ring_master_ranged`) |
| `wardBreak` (Magie) | 0,006 → 0,026 | 0,03 (`ring_master_magic`) |
| `evasionRating` (Fernkampf-Amulett) | 1 → 10 | Rüstung liegt bei 9,8–40,5; Schmuck bleibt klar darunter |
| `wardCapacity` (Magie-Amulett) | 6 → 40 | Roben liegen bei 17–192; Schmuck bleibt klar darunter |

**Wertkurve** (bereinigt um die Brüche P2/P3/P7):
Ringe: L1 160 · L15 360 · L20 400 · L34 640 · L44 1000 · L46 1200 · **L55 1400** · **L70 2400** · L85 4200 · L95 7800
Amulette: L3 200 · **L5 240** · L15 200 · L18 440 · L26 480 · L36 900 · **L38 980** · L48 1200 · L60 1600 · L65 2800 · L75 3200 · L88 5500 · L99 9800

## 3.4 Die drei Linien — die eine Aufbauregel

**Der Edelstein bestimmt die Stufe, die Fassung bestimmt den Stil.** Das ist die eine Regel, die ein Spieler lernen muss, und sie nutzt ausschließlich vorhandene Materialien:

| Fassung | Stil | Material (Stufenleiter vorhanden) |
|---|---|---|
| **Metallband** | Nahkampf | `copper_bar` L1 … `godiron_bar` L95 (14 Stufen) |
| **Lederschnur / Sehne** | Fernkampf | `cured_leather` … `hardened_leather` L22 … `scaled_leather` L36 … `studded_leather` L50 … `warhide` L70 … `dragonhide` L78 … `shadowhide` L90 |
| **Runen-/Essenz-Einfassung** | Magie | `force_rune` L1 … `void_rune` L65 · `essence_ash` L6 … `essence_divine` L87 · `cloth_thornlinen` L40 … `cloth_starweave` L80 |

Damit entstehen drei parallele Leitern **ohne ein einziges neues Material und ohne Engine-Arbeit**.

## 3.5 Neue Items — Reihe FERNKAMPF (komplett neu)

Die größte Lücke. Sieben Ringe, sieben Amulette. `rarity: "rare"`, die beiden 95/99er `epic`.

### Ringe

| JC | EN | DE | Attribute | Boost | Trinity | Wert | Zutaten | Warum es existiert |
|---|---|---|---|---|---|---|---|---|
| 15 | Kestrel Loop | Turmfalken-Reif | dex 2, lck 1 | ranged 1 | precision 0,004 · evasion 1 | 360 | 1 sapphire + 1 cured_leather + 1 iron_bar | Der erste Ring, der einem Bogenschützen überhaupt gehört |
| 34 | Hawkeye Band | Falkenaugen-Band | dex 4, con 2, lck 1 | ranged 2 | precision 0,008 · evasion 2 | 640 | 1 ruby + 1 scaled_leather + 1 steel_bar | Treffsicherheit statt Rohschaden — die Fernkampf-Identität |
| 44 | Sinewbound Ring | Sehnenbund-Ring | dex 5, con 2, lck 1 | ranged 2 | precision 0,010 · evasion 3 | 1000 | 1 bloodstone + 1 studded_leather + 1 gravesteel_bar | Erster Ring mit spürbarem Ausweichen: leben statt heilen |
| 55 | Windwidow Signet | Windwitwen-Siegel | dex 6, con 2, lck 2 | ranged 3 | precision 0,012 · evasion 4 | 1400 | 1 diamond + 1 studded_leather + 1 mithril_bar | Die Wahl gegen `diamond_ring`: Tempo statt Zähigkeit |
| 70 | Blackfletch Ring | Schwarzfeder-Ring | dex 7, con 4, lck 2 | ranged 3 | precision 0,014 · evasion 5 | 2400 | 1 onyx + 1 warhide + 1 runite_bar | Das Fernkampf-Gegenstück zum `onyx_ring`, das es nie gab |
| 85 | Ghostquiver Band | Geisterköcher-Band | dex 8, con 4, lck 3 | ranged 4 | precision 0,016 · evasion 6 | 4200 | 1 voidstone + 1 dragonhide + 1 bloodiron_bar | Endgame-Fernkampf ohne Drop-Glück |
| 95 | Worldpiercer Ring | Weltendurchbohrer-Ring | dex 9, con 5, lck 3 | ranged 4 | precision 0,018 · evasion 7 | 7800 | 1 godgem + 1 shadowhide + 1 aetherium_bar | Krone der Fernkampf-Leiter, gleichauf mit `godgem_ring` |

### Amulette

| JC | EN | DE | Attribute | Boost | Trinity | Wert | Zutaten | Warum es existiert |
|---|---|---|---|---|---|---|---|---|
| 18 | Longsight Cord | Weitblick-Band | dex 3, con 1, lck 1 | ranged 1 | evasion 2 | 440 | 1 sapphire + 2 cured_leather | Fernkampf-Gegenstück zu `sapphire_amulet` |
| 38 | Windwhisper Torc | Windflüster-Reif | dex 4, con 2, lck 2 | ranged 2 | evasion 3 | 980 | 1 ruby + 2 scaled_leather | Hält die Fernkampf-Leiter im Mittelspiel geschlossen |
| 48 | Harrier's Chain | Kette des Würgfalken | dex 5, con 3, lck 2 | ranged 2 | evasion 5 | 1200 | 1 bloodstone + 2 studded_leather | Ausweichen wird zur echten Verteidigungslinie |
| 60 | Kite-Hunter Pendant | Anhänger des Weihenjägers | dex 6, con 4, lck 2 | ranged 3 | evasion 6 | 1600 | 1 diamond + 2 studded_leather + 1 mithril_bar | Die Wahl gegen `diamond_amulet`: Ausweichen statt Leben |
| 75 | Gloomfletch Amulet | Düsterfeder-Amulett | dex 7, con 4, lck 3 | ranged 3 | evasion 8 | 3200 | 1 onyx + 2 warhide + 1 runite_bar | Fernkampf-Gegenstück zum `onyx_amulet` |
| 88 | Nightquarry Chain | Nachtbeute-Kette | dex 8, con 6, lck 3 | ranged 4 | evasion 9 | 5500 | 1 voidstone + 2 dragonhide + 1 bloodiron_bar | Schließt die Lücke, in der Fernkampf bisher nackt war |
| 99 | Deadeye Reliquary | Reliquiar des Todesauges | dex 9, con 6, lck 3 | ranged 4 | evasion 10 | 9800 | 1 godgem + 2 shadowhide + 1 aetherium_bar | 99er-Ziel für Fernkämpfer, gleichauf mit `godgem_amulet` |

## 3.6 Neue Items — Reihe MAGIE (Lücke oberhalb L65)

| JC | EN | DE | Slot | Attribute | Boost | Trinity | Wert | Zutaten | Warum es existiert |
|---|---|---|---|---|---|---|---|---|---|
| 34 | Emberglass Ring | Glutglas-Ring | Ring | int 4, wis 2, lck 1 | magic 2 | wardBreak 0,010 · ward 7 | 640 | 1 ruby + 1 fire_rune + 1 steel_bar | Schließt die Magie-Lücke L18→L46 |
| 55 | Hollowlight Signet | Hohllicht-Siegel | Ring | int 6, wis 3, lck 1 | magic 3 | wardBreak 0,014 · ward 12 | 1400 | 1 diamond + 1 aether_rune + 1 mithril_bar | Die Wahl gegen `diamond_ring` für Magier |
| 70 | Nightwell Ring | Nachtquell-Ring | Ring | int 7, wis 4, lck 2 | magic 3 | wardBreak 0,018 · ward 15 | 2400 | 1 onyx + 1 void_rune + 1 runite_bar | Erster Magie-Ring über L46 überhaupt |
| 85 | Voidscribe Band | Leerenschreiber-Band | Ring | int 8, wis 5, lck 2 | magic 4 | wardBreak 0,022 · ward 18 | 4200 | 1 voidstone + 2 void_rune + 1 bloodiron_bar | Endgame-Magie ohne Drop-Glück |
| 95 | Godsight Ring | Gottblick-Ring | Ring | int 9, wis 5, lck 3 | magic 4 | wardBreak 0,026 · ward 20 | 7800 | 1 godgem + 1 essence_divine + 1 aetherium_bar | Krone der Magie-Leiter |
| 38 | Ashcant Pendant | Aschgesang-Anhänger | Amulett | int 4, wis 2, con 2 | magic 2 | ward 14 | 980 | 1 ruby + 2 iron_bar + 1 cloth_thornlinen | Erstes Magie-Amulett nach L18 |
| 48 | Gravecall Amulet | Grabruf-Amulett | Amulett | int 5, wis 3, con 2 | magic 2 | ward 20 | 1200 | 1 bloodstone + 2 gravesteel_bar + 1 essence_grave | Ward als tragende Verteidigung statt Rüstung |
| 75 | Duskveil Chain | Dämmerschleier-Kette | Amulett | int 7, wis 4, con 3 | magic 3 | ward 30 | 3200 | 1 onyx + 2 runite_bar + 1 cloth_ghostweave | Magie-Gegenstück zum `onyx_amulet` |
| 88 | Voidsong Amulet | Leerengesang-Amulett | Amulett | int 8, wis 5, con 4 | magic 4 | ward 36 | 5500 | 1 voidstone + 2 bloodiron_bar + 1 essence_void | Schließt das Magie-Endgame |
| 99 | Godgem Reliquary | Gottstein-Reliquiar | Amulett | int 9, wis 5, con 4 | magic 4 | ward 40 | 9800 | 1 godgem + 2 aetherium_bar + 1 cloth_starweave | 99er-Ziel für Magier |

## 3.7 Neue Items — Reihe NAHKAMPF-AMULETTE (Lücke oberhalb L38)

Die vorhandenen Edelstein-Amulette (`bloodstone`/`diamond`/`onyx`/`voidstone`/`godgem_amulet`) bleiben **unangetastet** als neutrale Zähigkeits-Linie (siehe Migration §3.11). Der Nahkampf bekommt eigene, offensive Amulette daneben.

| JC | EN | DE | Attribute | Boost | Trinity/Bonus | Wert | Zutaten | Warum es existiert |
|---|---|---|---|---|---|---|---|---|
| 48 | Gorecrown Pendant | Blutkron-Anhänger | str 5, con 4, lck 1 | power 2 | hpRegenPerSec 0,10 | 1200 | 1 bloodstone + 2 gravesteel_bar + 1 warhide | Erstes offensives Nahkampf-Amulett seit L38 |
| 60 | Ironvow Chain | Eisenschwur-Kette | str 6, con 4, lck 2 | power 3 | hpRegenPerSec 0,15 · armorPen 0,010 | 1600 | 1 diamond + 2 mithril_bar | Die Wahl gegen `diamond_amulet`: Schaden statt Leben |
| 75 | Reaver's Torc | Räuber-Reif | str 7, con 5, lck 2 | power 3 | hpRegenPerSec 0,20 · armorPen 0,014 | 3200 | 1 onyx + 2 runite_bar | Nahkampf-Gegenstück zum `onyx_amulet` |
| 88 | Bloodiron Locket | Bluteisen-Medaillon | str 8, con 6, lck 3 | power 4 | hpRegenPerSec 0,25 · armorPen 0,016 | 5500 | 1 voidstone + 2 bloodiron_bar | Endgame-Nahkampf mit Rüstungsdurchdringung |
| 99 | Warcrown Reliquary | Kriegskron-Reliquiar | str 9, con 6, lck 3 | power 4 | hpRegenPerSec 0,30 · armorPen 0,018 | 9800 | 1 godgem + 2 godiron_bar | 99er-Ziel für Nahkämpfer |

## 3.8 Neue Items — Reihe FINDBAR (Variation durch Effekt)

Acht neue Fundstücke, jedes mit einem `weaponEffect`-Typ, der auf Schmuck **bisher nicht vorkommt**. Regelkonform zu `drop-gear-beats-craft`: Kernwert ≥ Craft-Gegenstück der nächsten Stufe, Effekt vorhanden, Chance unter dem Deckel.

| Quelle/Stufe | EN | DE | Slot | Attribute | Boost | Effekt (bestehender Typ) | Selt. | Wert | Warum es existiert |
|---|---|---|---|---|---|---|---|---|---|
| ~L30 Monster, 8 % | Cutthroat Loop | Kehlschnitt-Reif | Ring | dex 5, lck 2 | ranged 1 | `execute` (mag. 0,15) | rare | 900 | Belohnt das Abräumen angeschlagener Ziele — erstes Fernkampf-Fundstück |
| ~L40 Elite, 20 % | Firstlight Signet | Erstlicht-Siegel | Ring | str 4, con 3 | attack 2 | `firstStrike` (mag. 0,25) | superRare | 1400 | Macht kurze Kämpfe stark — belohnt Wechseln statt Dauergrind |
| ~L50 Monster, 6 % | Tidewrack Chain | Flutbruch-Kette | Amulett | int 6, wis 3 | magic 2 | `wardSiphon` (mag. 0,12) | rare | 1800 | Ward aus Schaden — Magier-Verteidigung ohne Rüstung |
| ~L60 Dungeon | Hollowmarch Band | Hohlmarsch-Band | Ring | dex 7, con 3, lck 2 | ranged 3 | `momentum` (mag. 0,08) | epic | 3000 | Belohnt langes Dranbleiben — das Gegenteil von `firstStrike` |
| ~L70 Monster, 4 % | Ashen Vow Pendant | Aschenschwur-Anhänger | Amulett | str 8, con 5 | power 3 | `desperation` (mag. 0,30) | epic | 3800 | Stark bei wenig Leben — belohnt Risiko statt Auto-Essen |
| ~L80 Elite, 20 % | Rimeheart Locket | Reifherz-Medaillon | Amulett | int 8, wis 4, con 3 | magic 3 | `frostbite` (mag. 0,20) | epic | 5200 | Kontrolle statt Schaden — Magie-Identität über Status |
| ~L88 Dungeon | Thornwarden Signet | Dornwächter-Siegel | Ring | str 7, con 7, lck 2 | attack 3 | `thorns` (mag. 0,18) | epic | 5800 | Der einzige Ring, der Schaden zurückgibt — die Tank-Antwort |
| ~L95 Chase, 0,1 % | Sunder Crown | Splitterkrone | Amulett | str 6, dex 6, int 6, con 6, lck 3 | attack 2, ranged 2, magic 2 | `critBurst` (mag. 0,25) | legendary | 15000 | Chase für Hybrid-Builds: Stats der nächsten Stufe bei aktueller Anforderung |

> **Chef-Entscheid nötig (E-2):** Die genauen Fundorte (welches Monster, welcher Dungeon, welche Elite) sind bewusst offen — die soll content-dev an vorhandene Zonen hängen, damit Requirement ≤ Quellen-Level bleibt (Wächter-Regel Punkt 4).

## 3.9 Skilling-Schmuck — lohnt eine eigene kleine Linie?

**Ja, und die Mechanik existiert vollständig.** `masterPerk` ist additiv über alle Slots und auf `MASTER_PERK_CAP` gedeckelt. Heute tragen ihn nur 15 der 21 Meisterringe, also ausschließlich 99er-Belohnungen. Eine kleine craftbare Linie mit **schwächeren Werten** gibt Schmuck eine Rolle außerhalb des Kampfes, ohne die 99er-Krone zu entwerten.

| JC | EN | DE | Slot | Attribute | `masterPerk` | Wert | Zutaten | Warum es existiert |
|---|---|---|---|---|---|---|---|---|
| 25 | Gatherer's Knot | Sammlerknoten | Ring | con 2, lck 2 | `doubleYield`, Skill **wählbar über 3 Rezeptvarianten** (woodcutting / mining / fishing), value **0,02** | 700 | 1 sapphire + 1 iron_bar + 1 cloth_linen | Der erste Grund, Schmuck außerhalb des Kampfes anzulegen |
| 50 | Thrifthand Ring | Sparhand-Ring | Ring | con 3, lck 2 | `inputSaver` (smithing / leatherworking / tailoring), value **0,02** | 1500 | 1 diamond + 1 mithril_bar + 1 hardened_leather | Materialsorgen im Handwerk lindern, lange vor 99 |
| 65 | Steadhand Band | Stetighand-Band | Ring | con 3, wis 2, lck 2 | `successBoost` (thieving), value **0,015** | 2400 | 1 onyx + 1 runite_bar + 1 essence_void | Diebeskunst ist die einzige Fertigkeit mit Fehlschlägen — hier zählt es |
| 80 | Harvestward Chain | Erntehut-Kette | Amulett | con 5, wis 3, lck 3 | `cropSpeed` (farming), value **0,04** | 4000 | 1 voidstone + 2 titanium_bar + 1 cloth_starweave | Anbau ist Wartezeit; hier kauft man sie ab |

> **Chef-Entscheid nötig (E-3):** Eine craftbare `doubleYield`-Quelle bei 0,02 hebt die Sammel-Einkommen leicht an, bevor 99 erreicht ist. Gewollt? Konservative Alternative: die Linie auf `inputSaver`/`cropSpeed` beschränken (kosten- statt ertragsseitig) und `doubleYield` der 99er-Belohnung vorbehalten.

## 3.10 Zwei Ringplätze und Set-Boni

Beide Ringplätze sind bespielbar (§1.9). Daraus entsteht echter Kombinationsspielraum, sobald die drei Achsen aus §3.1 gefüllt sind:

- **Zwei Craft-Ringe:** Trinity-Werte addieren sich (`precision` 0,014 + 0,016 = 0,030). Verlässlich, aber langweilig.
- **Craft + Fund:** der planbare Trinity-Wert plus ein Sondereffekt. Das ist die interessante Kombination.
- **Zwei Fund-Ringe:** hier greift die Engine-Regel — `healOnKill`/`wardOnKill`/`cooldownOnKill` **addieren**, alle anderen Kinds nehmen das **Maximum**. Zwei `bounty`-Ringe bringen nichts, ein `bounty` plus ein `execute` schon.

> **Wichtig für ui-dev:** Diese Max-statt-Summe-Regel ist heute nirgends sichtbar. Ein Spieler mit zwei gleichen Effekt-Ringen wird annehmen, sie stapeln. Empfehlung: Die Item-Karte sollte bei doppelt getragenem Effekt-Kind einen Hinweis zeigen („wirkt nicht doppelt"). Eigener kleiner ui-dev-Auftrag.

**Set-Boni:** Von 36 Sets enthält **keines** ein Schmuckstück, obwohl die Set-Definition `ring1` und `amulet` bereits als gültige Slots kennt (`pieces` + `minPieces` + `modifiers`/`bonus`). Vorschlag: drei kleine Zwei-Teile-Sets, je Ring + Amulett derselben Stufe und desselben Stils.

| Set | Teile | `minPieces` | Bonus |
|---|---|---|---|
| Jägerbund / Hunter's Accord | Blackfletch Ring + Gloomfletch Amulet | 2 | dex +3, `precision` +0,006 |
| Leerengelübde / Void Vow | Nightwell Ring + Duskveil Chain | 2 | int +3, `wardBreak` +0,008 |
| Kriegsbund / Warbound | onyx_ring + Reaver's Torc | 2 | str +3, `armorPen` +0,006 |

> **Chef-Entscheid nötig (E-4):** Set-Boni auf Schmuck sind neu. Zwei-Teile-Sets sind leicht zu erreichen und damit faktisch ein Attribut-Aufschlag auf die Leiter (+3 Punkte). Rein oder nicht?

## 3.11 Migration — was passiert mit getragenem Schmuck

Nach dem Save-Kompatibilitäts-Gesetz und der Regel „alte Assets nie entfernen": **kein Schmuckstück wird gelöscht, keine ID verschwindet.** Alle 81 bleiben im Katalog.

| Stück | Änderung | Spürbare Verschlechterung? |
|---|---|---|
| Alle neuen Items (41) | Neu angelegt | Nein |
| `ruby_ring`, `bloodstone_ring`, `diamond_ring`, `onyx_ring`, `voidstone_ring`, `gemstone_ring` | Attributpunkte **angehoben** auf die Kurve, `armorPen` ergänzt | **Nein — reiner Gewinn** |
| `onyx_ring`, `voidstone_ring`, `godgem_ring` | `int` (2/4/5) wird zu `str`/`con` umgewidmet | **Ja, für den seltenen Magier, der sie trägt.** Aber: der `int` war dort ohnehin ohne passenden Boost. Wer sie als Magier trägt, bekommt mit `Nightwell`/`Voidscribe`/`Godsight` ein besseres Stück auf derselben Stufe. |
| `sapphire_ring` | `attack 1` → `magic 1`, `wis 1` ergänzt | **Ja, für Nahkämpfer auf L15.** Ersatz auf derselben Stufe vorhanden: `warband_signet` (str 2, lck 1, attack 1). Mildernd: L15-Schmuck wird ohnehin schnell ersetzt. |
| `grave_warden_band` | Punkte 4 → 10, Wert 2200 → 1300 | Statistisch besser; nur der **Verkaufserlös** sinkt. Betrifft Spieler, die es horten. |
| Edelstein-Amulette (`bloodstone`/`diamond`/`onyx`/`voidstone`/`godgem_amulet`) | **Attribute unverändert**, nur `bonus.hpRegenPerSec` ergänzt | **Nein — reiner Gewinn.** Bewusst so gewählt, damit niemand `dex`/`con` verliert. |
| `spellbinder_ring`, `stormcaller_amulet` | Punkte auf die Kurve gehoben | Nein |
| `fang_necklace`, `ruby_amulet` | nur `value` korrigiert | Verkaufserlös steigt |
| Meisterringe | unverändert | Nein |

**Ergebnis: genau zwei Stellen mit spürbarer Verschlechterung** (`sapphire_ring` für Nahkämpfer, die drei Top-Ringe für Magier), beide mit gleichstufigem Ersatz. Kein SAVE_VERSION-Sprung nötig, weil keine ID und kein Slot sich ändert — nur Zahlen in bestehenden Item-Definitionen.

> **Chef-Entscheid nötig (E-5):** Soll `sapphire_ring` überhaupt umgewidmet werden, oder bleibt er Nahkampf und bekommt stattdessen `str` statt `int`? Letzteres wäre migrationsfrei, widerspricht aber der Farbe des Steins und seinem eigenen Amulett.

## 3.12 Wellen — Umfang und Reihenfolge

| Welle | Inhalt | Neue Items | Neue Rezepte | Item-Änderungen | Ziel |
|---|---|---|---|---|---|
| **W1 — Fehlerkorrektur** | S1-b `sapphire_ring`, S1-c `grave_warden_band`, Wertbrüche P2/P3/P7, S1-d Client-Vorschau | 0 | 0 | 6 Items + 2 Client-Fixes | **1.2.1** |
| **W2 — Fernkampf-Lücke** | Komplette Fernkampf-Reihe, Ringe und Amulette | **14** | 14 | 0 | **1.2.1**, wenn Zeit — sonst 1.3.0 |
| **W3 — Magie schließen + Ring-Kurve** | 10 Magie-Stücke, Ring-Leiter auf die Kurve, `int`-Konflikte auflösen, Trinity-Werte auf alle Craft-Ringe | **10** | 10 | 12 Items | 1.3.0 |
| **W4 — Nahkampf-Amulette + Fundstücke** | 5 Nahkampf-Amulette, 8 neue Drops mit ungenutzten Effekt-Typen, `hpRegenPerSec` auf die Edelstein-Amulette | **13** | 5 | 5 Items + 8 Loot-Zeilen | 1.3.0 |
| **W5 — Kür** | Skilling-Linie (4), Set-Boni (3 Sets), `lck`-Anteil katalogweit auf 15 %, ui-dev-Hinweis „wirkt nicht doppelt" | **4** | 6 | ~40 Items (lck-Pass) | später, Chef-Entscheid |

**Gesamt-Umfang des vollen Reworks: 41 neue Items, 35 neue Rezepte, rund 65 geänderte Item-Definitionen.**

W1 und W2 zusammen sind die wichtigste Hälfte: sie beseitigen den vom Chef gemeldeten Fehler **und** schließen die Lücke, die einen ganzen Kampfstil vom Handwerk ausschließt.

---

# Teil 4 — Was zuerst für 1.2.1

Geordnete Anwendungsliste für content-dev / ui-dev. Nichts davon ist hier angewendet.

| # | Datei | Änderung |
|---|---|---|
| 1 | `packages/content/src/index.ts` | `sapphire_ring`: `skillBoost { attack: 1 }` → `{ magic: 1 }`; `modifiers { int: 2 }` → `{ int: 2, wis: 1 }` |
| 2 | `packages/content/src/index.ts` | `grave_warden_band`: `value 2200` → `1300`; `modifiers { con: 4 }` → `{ str: 4, con: 4, lck: 2 }`; `skillBoost { power: 3 }` ergänzen |
| 3 | `packages/content/src/index.ts` | `fang_necklace`: `value 90` → `240` |
| 4 | `packages/content/src/index.ts` | `ruby_amulet`: `value 760` → `980` |
| 5 | `packages/content/src/index.ts` | `diamond_ring`: `value 1200` → `1400`; `onyx_ring`: `value 2600` → `2400` |
| 6 | `apps/client/src/renderer/util/actionRate.ts:113` | `masterDoubleYieldBonus(...)` in die `bonusChance`-Summe aufnehmen (ui-dev) |
| 7 | `apps/client/src/renderer/util/masteryRank.ts:71` | `masterPreserveBonus` in die Material-Spar-Anzeige aufnehmen (ui-dev) |
| 8 | `packages/engine/src/balance-envelope.test.ts:863` | Testtitel „GENAU 14" → „GENAU 15" |

Danach, falls die Zeit in 1.2.1 reicht: **Welle 2 vollständig** (14 Fernkampf-Items + 14 Rezepte aus §3.5).

**Vor dem Anwenden zu prüfen:** `packages/content/src/drop-gear-beats-craft.test.ts` muss nach jeder Welle grün bleiben — sie vergleicht Drop-Kernwerte gegen das Craft-Gegenstück der nächsten Stufe, und das Anheben der Ring-Leiter (W3) verschiebt genau diesen Anker.

---

## Offene Chef-Entscheide

| # | Frage |
|---|---|
| **E-1** | Bleibt craftbarer Schmuck grundsätzlich ohne `weaponEffect` (klare Trennung craftbar = Trinity-Werte, findbar = Effekte)? Empfehlung: ja. |
| **E-2** | Fundorte für die 8 neuen Drop-Stücke — an welche Zonen/Elites/Dungeons? |
| **E-3** | Darf die Skilling-Linie `doubleYield` tragen (hebt Sammel-Einkommen vor 99), oder nur `inputSaver`/`cropSpeed`? |
| **E-4** | Set-Boni auf Ring + Amulett: rein oder nicht? |
| **E-5** | `sapphire_ring` auf Magie umwidmen (thematisch richtig, kleine Verschlechterung für Nahkämpfer) oder auf Nahkampf festnageln (`int` → `str`, migrationsfrei)? |
| **E-6** | `lck`-Anteil katalogweit von 25,7 % auf 15 % senken? Berührt rund 40 Bestandsitems und ist für die Betroffenen eine Verschlechterung, macht Schmuck aber spürbar. |
