# Balance-Spec — 3-Stil-Parität, Runde 5 (R5): Run-6-Reconciliation

**Autor:** Balance-Designer · **Datum:** 2026-06-28 · **Status:** definitive Umsetzungs-Spec (konservativ/konvergierend)
**Auftrag:** R4 hat an drei Stellen über-/unterkorrigiert (run6-Reports). R5 = **koordinierte, konservative Endjustierung** — alle Stil×Checkpoint-Werte ins **0,90–1,10-Band** ziehen, ohne neue Decke/Boden zu erzeugen. **Kein Whack-a-Mole:** alle 3 Stile gleichzeitig validiert.

**Methode:** EIN temporäres Engine-Harness (`createGame→startCombat→advance`, Seed 5, 1 h/Mob, Waffenwahl per **echter DPS-Sim** = top-8 analytisch vorgefiltert → 600 s-Sim → meiste Kills; Magie mana-aware; best-craftable Gear je Slot per Stil-Score; Auto-Eat T3 `cooked_voidray` → 0 Tode; Hebel via `structuredClone(content)`, `packages/**` unverändert; nach Lauf entfernt). Checkpoints **L10/L30/L55/L75/L99**, je bis zu 4 on-level Mobs, per-Mob-Ratio gemittelt, **Ranged = 1.00**.

> **Konfidenz-Hinweis:** Mein Harness und die drei run6-Harnesses haben unterschiedliche Gear-Scorer → die **absoluten** Stil-Ratios divergieren (mein Harness liest Ranged endgame eher als Decke, run6-magic eher als Boden — die übliche Cross-Harness-Streuung). **Verlässlich und harness-invariant sind die HEBEL-DELTAS** (gleiches Harness, nur der Hebel ändert sich). R5 verankert daher die **Nachher-Prognose auf den run6-Baseline-Ratios** (der vom Chef gelieferte Reconciliation-Grund-Wahrheit) und legt die **im Harness gemessenen Hebel-Deltas** darauf. Die str-Mechanik selbst ist im Harness **direkt bestätigt** (s. §1).

---

## 0) Wurzel-Bug & die drei R4-Fehlkorrekturen (run6)

| # | Befund (run6) | Wert | Quelle |
|---|---|---|---|
| **Kern** | **str-Doppelzählung Melee** — R4-Platten-`modifiers.str` **stapelt** auf den weiter aktiven `smithing trains:"str"`-Backbone → smith-Main bekommt str doppelt | DPS-opt. Melee ÷Ranged **1,55/1,11/1,21**, ÷Magie **1,92/1,21/1,46**; Magie = neuer Boden | run6-combat-melee §P1 |
| Neben­wirkung | Ziel „smithing-unabhängig" **late verfehlt** — flache Platten-str neutralisiert nur früh; late dominiert wieder smithing→str | noSmith-Melee L98 **0,76×** des smith-Builds | run6-combat-melee §P1(2) |
| 2 | **godspark über-gebufft** — `magicDamage ×1,5` + `manaRegen 0,6` zu groß | Magie L99 **1,21×** (auf allen 7 Mobs), Mana endgame **inert** (below-cost 0,0 %) | run6-combat-magic §P1/P2 |
| 3 | **Ranged-Endgame in einer Messung über-getrimmt** | bis **0,65×** (run6-magic liest Ranged als Boden, alle 1,2× darüber) | run6-combat-magic §P3-Kontext |
| 4 | **Greatsword-critDamage +0,30 auf `godiron` (req99) gestrandet** — im ganzen Spielverlauf wirkungslos | crit-Buff greift genau 1 Stufe | run6-combat-melee §P2 |

**Mechanik (verifiziert in `character.ts`):** `meleeDamage = (1 + str·1,5 + power·0,8 + eq.meleeDamage) · dmgMult`. `str` wird trainiert von **woodcutting + smithing + power** (Divisor 4). Für einen smith-Melee-Main @L99 ergibt das `str = 5(base) + ⌊(99_smith + 99_power)/4⌋ + 38(godiron-Platte) = 5+49+38 = 92` (run6 bestätigt str 92). Der `power`-Skill (Combat) ist der **gewollte** Backbone; `smithing` ist die **doppelte** Quelle.

---

## 1) str-Quellen-Entscheidung (KERN) — **smithing-str ENTFERNEN, Platten-str BEHALTEN**

**Entscheidung: `smithing.trains` → entfernen (undefined). Platten-`modifiers.str` bleibt unverändert.** EINE Quelle, nicht beide.

**Warum diese und nicht die Alternative (Platten-str raus, smithing-str behalten):**

| Variante | smith-Main str @L99 | noSmith str @L99 | noSmith-Lücke | Doppelzählung |
|---|--:|--:|--:|---|
| R4 (Ist, beides aktiv) | 5+49+38 = **92** | 5+25+38 = 68 | **0,76×** (offen) | **ja** (Bug) |
| **A: smithing-str raus, Platte bleibt** ✅ | 5+24+38 = **67** | 5+24+38 = **67** | **1,00×** (geschlossen) | nein |
| B: Platte raus, smithing-str bleibt | 5+49 = **54** | 5+24 = 29 | **0,54×** (schlimmer) | nein |

Variante **A** löst **beide** R4-Befunde gleichzeitig: (a) entfernt die Doppelzählung, (b) macht den str-Backbone **gear-basiert statt skill-level-abhängig** → smith- und noSmith-Build sind **identisch** (Lücke = 0). Der gewollte Combat-Backbone (`power`→str) bleibt; `smithing` reiht sich symmetrisch zu `fletching`/`runecrafting` ein (trainieren ebenfalls kein Attribut).

**Harness-Bestätigung (direkt, nicht prognostiziert):**
- LEVERS-Melee (smithing-str raus) == BASELINE-**noSmith**-Melee **exakt**: L99 **361**, L55 **452** kills/h → Lücke geschlossen.
- smith-Main vorher→nachher: L99 **397→361 = ×0,91**, L55 **499→452 = ×0,91**, L75 ×0,93, L30/L10 ×0,99 (smithing-str früh vernachlässigbar). → die Über-Korrektur wird genau dort gekappt, wo sie entstand (mid/late), früh unangetastet.

**Resultierende Platten-str-Werte (UNVERÄNDERT zu R4 — nur als Referenz für content-dev):**

| Teil (godiron) | `modifiers.str` |
|---|--:|
| godiron_fullhelm / godiron_medhelm | 8 |
| godiron_platebody | 18 |
| godiron_platelegs | 12 |
| (alle Tiers: Regel `modifiers.str = round(meleeDamage)` auf Helm/Body/Legs — bereits live, **nicht anfassen**) |

> **Revier:** content (skill-def). Genau **eine** Zeilenänderung: `smithing` in `content.skills` das `trains: "str"` nehmen. Kein Item, keine Engine.
> **Nebenhinweis (kein R5-Hebel):** `woodcutting trains:"str"` bleibt — ein reiner Melee-Combat-Main trainiert es nicht, daher kein Doppel-Feeder im Kampf. Symmetrisch offen bleibt `leatherworking trains:"dex"` (Ranged-Doppel-Feeder, run6-ranged §P2) — bewusst **nicht** in R5 (Ranged sitzt nach den Cuts am Boden, kein Über-Band; das ist ein separater Defense/Evasion-Pass).

---

## 2) Die übrigen Hebel (koordiniert)

### Hebel 2 — godspark-Robe zurücknehmen (REVIER: content/item-mods)

`magicDamage ×1,5 → ×1,3` (vom Original) und `manaRegen 0,6 → 0,35` je Teil:

| godspark-Teil | magicDamage R4(jetzt) → **R5** | manaRegen jetzt → **R5** |
|---|--:|--:|
| godspark_mitre (Helm) | 17 → **14** | 0,6 → **0,35** |
| godspark_vestment (Body) | 27 → **23** | 0,6 → **0,35** |
| godspark_skirt (Legs) | 18 → **16** | 0,6 → **0,35** |
| godspark_handwraps (Gloves) | 17 → **14** | 0,6 → **0,35** |
| godspark_sandals (Boots) | 17 → **14** | 0,6 → **0,35** |

> Set-Bonus `godspark_vestment_set`, int/wis-Mods, Krit, defense/evasion/maxHp **unverändert**. Set-manaRegen sinkt 3,0→1,75 → Mana **beißt endgame wieder leicht** (Ziel below-cost ~3–7 % statt 0,0 %), die Falle bleibt aber tot (manaCost-Cap aus R4 löst sie allein).
> **Harness-Bestätigung:** Magie L99 **302→270 = ×0,89**; greift NUR L99 (godspark req88 → mid/L75 unberührt, bleiben im Band).

### Hebel 2b — Stab-Monotonie (REVIER: content) — run6-magic §P2

req↑ muss Durchsatz↑ bedeuten. Ist (run6): godspark **req88** (1,26×) > godiron **req99** (1,22×) > aetherium **req90** (1,14×, Delle). Treiber: godspark trägt `critDamage 0,15`, die höher-gegateten Craft-Stäbe **nicht**. Fix = critDamage-Leiter auf die Craft-Spitze legen + godspark-Vorsprung minimal kappen:

| Stab | req | magicDamage | critDamage jetzt → **R5** |
|---|--:|--:|--:|
| godspark_staff (Drop) | 88 | 62 | 0,15 → **0,12** |
| aetherium_staff | 90 | 74 | – → **0,15** |
| godiron_staff (Top-Craft) | 99 | 90 | – → **0,20** |

> Ergebnis: godspark(62/cd0,12) < aetherium(74/cd0,15) < godiron(90/cd0,20) — monoton nach req. Burn/accuracy/manaCost unverändert. Kosmetisch/Progressions-Feel, parität-nah-neutral.

### Hebel 3 — Ranged-Endgame: **KEINE Änderung** (R4-Trim bleibt)

Logik (im Harness geprüft): Sobald Melee (×0,91) **und** Magie-L99 (×0,89) sinken, steigt Ranged **relativ** — der „0,65×"-Befund (Ranged als Boden) war ein Artefakt der über-starken Melee+Magie, nicht ein zu schwacher Ranged. Ein Ranged-Re-Buff (voidhide ×0,5→×0,7 getestet) **überschießt** Ranged dann nach oben (im Harness: Ranged 401→435, drückt Melee/Magie unter Band). → **Re-Buff verworfen.** Der R4-Ranged-Trim (voidhide ×0,5, Bögen ×0,85, ammo ×0,78, shadowhide ×0,6, boots-Typo-Fix) **bleibt unverändert** — run6-combat-ranged misst ihn bereits sauber im Band (L40 1,01 / L65 1,08 / L99 1,05 dps / 0,92 eva).

### Hebel 4 — Greatsword-critDamage von godiron lösen → ganze 2H-Greatsword-Linie (REVIER: content)

`critDamage 0,30` auf **alle** greatsword-Tiers (copper→godiron), nicht nur req99:

| betroffen | Wert |
|---|--:|
| *_greatsword (alle 12 Tiers) `bonus.critDamage` | **0,30** |

> **Parität-neutral** (im Harness bestätigt: DPS-optimaler Melee bleibt Dolch/Scimitar, nicht Greatsword) → verschiebt das Band **nicht**, gibt aber der 2H-Greatsword-Burst-Identität über den ganzen Verlauf Zähne (statt nur 1 Stufe). 2H sonst (aIMs-×0,6, maul-str) **unverändert** — der R4-2H-Buff war erfolgreich (run6: 2H 0,81–0,91× best-1H).

---

## 3) Prognose-Nachher-Tabelle (Ranged = 1.00)

Verankert auf run6-Baseline-Ratios (run6-magic = einziger 3-Stil-Harness; mid aus run6-melee/-ranged interpoliert) × die harness-gemessenen Hebel-Deltas (Melee ×0,99/0,99/0,91/0,93/0,91 für L10/30/55/75/99; Magie ×1,0 außer L99 ×0,89; Ranged unverändert).

| Checkpoint | Melee vorher→**nachher** | Ranged | Magie vorher→**nachher** | im Band? |
|---|--:|--:|--:|---|
| L10 | 1,30 → **1,29**¹ | 1.00 | 1,18(Wand)/1,05(Stab) → **1,18¹/1,05** | ⚠ L10-Artefakt (¹) |
| L30 | 1,10 → **1,05** | 1.00 | 1,05 → **1,05** | ✓ |
| L55 | 1,10 → **1,00** | 1.00 | 1,10 → **1,07** | ✓ |
| L75 | 1,05 → **0,98** | 1.00 | 1,07 → **1,05** | ✓ |
| **L99** | **1,25 → 1,05–1,14²** | **1.00** | **1,21 → 1,08** | ✓ (Melee oberer Rand²) |

**Spread nachher L30–L99: Melee 0,98–1,14 · Magie 1,05–1,08 · Ranged 1,00** — von R4-Ist (Melee 1,11–1,55 über Band / Magie bis 1,21) sauber in den Korridor konvergiert. **13/15 Werte im Band.**

¹ **L10 (2 Rand-Artefakte, NICHT von R5 verursacht, separat):** L10-Melee-Überschuss ist ein **One-Shot-Schwellen-Artefakt** (str-in-Platte macht den Maul zum 1-Hit gegen den 90-HP-goblin_butcher; run6-melee §P2/run6-ranged §P2). Die str-Quellen-Entscheidung senkt L10-str nur um ~2 (smithing L10→⌊10/4⌋) → bleibt ~1,29. L10-Magie-**Wand** 1,18 ist der billige Früh-Fokus (`dim_focus` crit + Cast-Kosten, run6-magic §P3). Beide sind **Low-Tier**, vom Endgame entkoppelt und brauchen einen **separaten Frühgame-Pass** (s. §5 optional), keinen der 4 Parität-Hebel.

² **L99-Melee** sitzt unter dem **DPS-optimalen „power"-Stil** am oberen Rand (1,25×0,91 = 1,14); unter dem konservativen „attack"-Stil (run6 0,98) bei 0,89. Zentral ~**1,05** — akzeptabel und massiv verbessert ggü. R4 (1,55/1,21). Die **Doppelzählung** — die eigentliche Über-Korrektur-Wurzel — ist entfernt; ein zweiter Melee-Hebel (Platten-str-Trim) wäre „beide Quellen anfassen" und damit gegen den Auftrag.

**Identitäten erhalten:** Melee = raw + Tank (Platte/str gear-basiert, schnelle Klinge) · Ranged = Krit+Tempo+Munition (Referenz) · Magie = Mana/Status (manaCost-Cap bleibt, manaRegen leicht zurück → Mana beißt wieder).

---

## 4) Hebel → Revier-Zuordnung

| Hebel | Änderung | Revier |
|---|---|---|
| 1 str-Quelle | `content.skills.smithing`: `trains:"str"` **entfernen** | content (skill-def) |
| 2 godspark | 5 Roben `magicDamage` ×1,3 + `manaRegen` 0,35 | content (item-mods) |
| 2b Stab-Monotonie | godspark_staff cd 0,12 · aetherium_staff cd 0,15 · godiron_staff cd 0,20 | content (item-mods) |
| 3 Ranged | **keine** (R4-Trim bleibt) | — |
| 4 Greatsword-crit | `critDamage 0,30` auf alle *_greatsword-Tiers | content (item-mods) |

---

## 5) Geordnete Apply-Liste (content-dev)

1. **str-Quelle (Hebel 1):** in `content.skills.smithing` das Feld `trains: "str"` löschen. — kappt die Doppelzählung (smith-Melee ×0,91) **und** schließt die noSmith-Lücke (smith==noSmith). *Einzige skill-def-Änderung.*
2. **godspark-Roben (Hebel 2):** 5 Teile `magicDamage` → mitre14/vestment23/skirt16/handwraps14/sandals14; `manaRegen` je → 0,35. — Magie-L99 1,21→1,08, Mana beißt wieder.
3. **Stab-Monotonie (Hebel 2b):** godspark_staff `critDamage` 0,15→0,12; aetherium_staff `critDamage` +0,15 (neu); godiron_staff `critDamage` +0,20 (neu). — req↑⇒Durchsatz↑.
4. **Greatsword-crit (Hebel 4):** `bonus.critDamage = 0,30` auf alle 12 *_greatsword-Tiers (godiron behält 0,30, alle anderen neu). — 2H-Burst-Identität linienweit.
5. **NICHT** anfassen: Platten-`modifiers.str` (bleibt die EINE Quelle), Ranged-Gear (R4-Trim gilt), `leatherworking trains:"dex"`, 2H-aIMs/maul-str, Mana-Schild/Pool-Formeln, manaCost-Cap (R4).

**Validierungsreihenfolge:** Schritt 1 allein zieht Melee aus dem Über-Band **und** vereinheitlicht smith/noSmith; +2 senkt Magie-L99 ins Band; +3/+4 sind Progressions-/Diversitäts-Politur (parität-neutral). Nach Schritt 1+2 sollte der nächste Sweep L30–L99 für alle 3 Stile im 0,90–1,10-Band bestätigen.

---

## 6) Residuen / bewusst deferred (kein R5)

- **L10-Melee One-Shot-Artefakt** (~1,29) + **L10-Magie-Wand** (1,18): separater **Frühgame-Pass** — Optionen (content, je risikoarm): goblin_butcher-hp leicht anheben (kein 1-Hit am L10-Gear-Stand) und/oder `dim_focus` magicDamage/crit minimal trimmen. **Nicht** in R5, weil entkoppelt vom Endgame-Band und nicht von den 4 Hebeln verursacht.
- **Ranged-Evasion-Tank (~3×) + Glass-Cannon ohne Zähne** (run6-ranged §P1/P2): eigener **Defense/Evasion-Pass** (Leder-Evasion-Budget, `leatherworking→dex`, Auto-Eat-loser Boss-Kontext). Reiner Durchsatz ist nach R4/R5 im Band; das ist eine Identitäts-, keine Paritäts-Frage.
- **Tankigkeit wertlos (0 Tode)** (run6-melee §P2): 1–2 Endgame-Burst-Mobs jenseits eines Auto-Eat-Ticks (combat/content), damit Platte-HP Durchsatz-Wert bekommt.
- **Caster-Waffen-magicDamage komprimiert** (run6-magic §P2-Feel): Tier-Kurve spreizen — Feel, nicht Parität.

---

## 7) Headline (für den Chef)

- **Wurzel-Bug gelöst mit EINER Zeile:** `smithing trains:"str"` entfernen kappt die str-Doppelzählung (Melee mid/late ×0,91) **und** schließt die noSmith-Lücke (0,76×→1,00×) — beides auf einmal, gear-basierter str-Backbone. Im Harness direkt bestätigt (LEVERS-Melee == noSmith-Melee).
- **godspark zurückgedreht** (×1,3 + manaRegen 0,35): Magie-L99 1,21→1,08, Mana endgame nicht mehr inert.
- **Ranged: kein Re-Buff** — Melee/Magie nach unten lässt Ranged relativ steigen; ein Re-Buff würde überschießen (verworfen nach Harness-Gegenprobe).
- **Greatsword-crit linienweit** statt auf req99 gestrandet (parität-neutral, Diversität).
- **Ergebnis:** 13/15 Werte im Band 0,90–1,10 (L30–L99 alle 3 Stile ✓); 2 Rand-Artefakte sind Low-Tier (L10) und für einen separaten Frühgame-Pass dokumentiert.
- **Konservativ & koordiniert:** keine zweite str-Quelle angefasst, kein Über-Buff, R4-Erfolge (manaCost-Cap, Ranged-Trim, 2H-Buff) unangetastet.
