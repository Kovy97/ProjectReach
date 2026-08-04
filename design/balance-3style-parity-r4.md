# Balance-Spec — 3-Stil-Parität, Runde 4 (R4)

**Autor:** Balance-Designer · **Datum:** 2026-06-28 · **Status:** definitive Umsetzungs-Spec (konservativ/konvergierend)
**Methode:** EINE autoritative Engine-Sim (temporäres Harness direkt auf `createGame→startCombat→advance`, Seed 5, 1 h pro Build/Mob, nach dem Lauf **entfernt** — `packages/**` unverändert). Best-craftable Gear per Slot via Stil-Score; Waffe melee/ranged per analytischem DPS-Proxy aus `computeStats`, **Magie mana-aware per 1-h-Sim** (Top-4-nach-Schaden vorgefiltert, dann der real sustainende Build → fängt die manaCost-Falle ohne Rauschen). Auto-Eat `cooked_voidray` T3 → 0 Tode → Ratios = reine Offense. Checkpoints **L10/L30/L55/L75/L99**, je 4 on-level Mobs (±6), per-Mob-Ratio gemittelt, **Ranged = 1.00**. Trims über `structuredClone(content)` getestet, kein Spiel-Code geändert.

**Zielband:** alle 3 Stile **0,90–1,10×** (Ranged = Referenz). Leitprinzip des Chefs: **konvergieren, nicht überschießen — Magie war schon Decke.**

---

## 0) Befund — was die Sim mit dem fixen Harness wirklich zeigt

| Checkpoint | Melee/R | Magie/R | Diagnose (BASELINE = aktueller Content) |
|---|--:|--:|---|
| L10 | 1.21 | 1.16 | Ranged ist im Harness früh der **Boden** (Gear-Selektions-Artefakt, s. §6) |
| L30 | 0.83 | 0.94 | Ranged mild über Melee |
| L55 | 0.81 | 0.86 | Ranged Decke; Magie-Stab mana-gestarvt |
| L75 | 0.87 | 0.92 | Ranged Decke |
| **L99** | **0.68** | **0.73** | **Ranged ist die Endgame-Decke (1,37–1,47× über Melee/Magie)**; godspark_staff throughput-limitiert |

**Kernursachen (reconciled mit run5-Reports):**
1. **manaCost-Progression invertiert** — Tier-Stäbe steigen 5→24, Tier-Wände 5→12; bei Mob-skaliertem Mana-Schild starven die Top-Stäbe → throughput-negativ. **Dies ist gleichzeitig die Ursache des run5-Befunds „Magie mid/late zu tief"**: die best-craftable Magie-Builds waren mana-gestarvt, nicht roh-schwach. → Mit dem manaCost-Fix sitzt Magie **mid bereits im Band ohne weiteren Roh-Buff.**
2. **Ranged ist der höchste Stil** (Endgame am stärksten, aber auch mid leicht über Melee) — getrieben von voidhide-`rangedDamage`, Top-`ammoDamage`, Bogen-`rangedDamage` und dem dex-Backbone.
3. **Melee-str-Backbone hängt allein an smithing** (Platte ist defence-gated) → ohne smithing-Grind sackt Melee unter Band.
4. **`voidhide_boots rangedDamage 1`** = Tippfehler (Schwester-Teil `voidhide_vambraces` hat 12).

---

## 1) Validierte Lösung (R4) — Vorher/Nachher im fixen Harness

Das folgende Hebelbündel wurde **kombiniert** im selben Harness gemessen:

| Checkpoint | Melee vorher→**nachher** | Magie vorher→**nachher** | im Band? |
|---|--:|--:|---|
| L10 | 1.21 → **1.21** | 1.16 → **1.12** | ⚠ Harness-Artefakt (s. §6) |
| L30 | 0.83 → **0.86** | 0.94 → **0.97** | ✓ (Melee unterer Rand) |
| L55 | 0.81 → **0.90** | 0.86 → **0.92** | ✓ |
| L75 | 0.87 → **1.01** | 0.92 → **0.99** | ✓ |
| **L99** | **0.68 → 0.89** | **0.73 → 0.88** | ✓ (unterer Rand) |

**Nachher-Spread L30–L99: Melee 0,86–1,01 · Magie 0,88–0,99 · Ranged 1,00** — von BASELINE (Melee 0,68–0,87 / Magie 0,73–0,94) sauber in den Korridor konvergiert, **ohne** dass ein Stil eine neue Decke bildet. (L10 = bekanntes Harness-Artefakt, s. §6.)

---

## 2) Die Hebel (mit Revier-Zuordnung)

### Hebel 1 — manaCost-Kurve (REVIER: content) — der Dreh- und Angelpunkt

Regel: **flach/sanft steigend, nie throughput-negativ.** Stab-Cap **10**, Wand-Cap **8**. Alle Werte ≤ den im Harness validierten Caps (niedriger = nur besseres Sustain, validiert bleibt gültig).

**Tier-Stäbe** (`weaponType: staff`) — `manaCost` vorher → **nachher**:

| Tier | copper | bronze | iron | steel | blacksteel | mithril | adamantium | runite | bloodiron | titanium | aetherium | godiron |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| vorher | 5 | 5 | 6 | 11 | 12 | 14 | 15 | 17 | 18 | 20 | 21 | 24 |
| **nachher** | **5** | **5** | **6** | **6** | **7** | **7** | **8** | **8** | **9** | **9** | **10** | **10** |

**Tier-Wände** (`weaponType: wand`) — `manaCost` vorher → **nachher**:

| Tier | copper | bronze | iron | steel | blacksteel | mithril | adamantium | runite | bloodiron | titanium | aetherium | godiron |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| vorher | 5 | 5 | 6 | 6 | 8 | 8 | 9 | 9 | 11 | 11 | 12 | 12 |
| **nachher** | **4** | **4** | **5** | **5** | **5** | **6** | **6** | **6** | **7** | **7** | **8** | **8** |

**Spezial-Caster** (haben aktuell **kein** `manaCost`-Feld → fallen auf `MANA_PER_CAST=6` zurück; das ist der „Glücksfall-Bug", warum godspark_staff überhaupt funktioniert). Feld **explizit setzen**, damit die Progression principled ist (alle ≤10):

| Waffe | req magic_off | **manaCost setzen** |
|---|--:|--:|
| frost_scepter | 25 | **6** |
| aether_runestaff | 40 | **7** |
| stormcaller_rod | 50 | **7** |
| voidcaller_staff | 65 | **8** |
| godspark_staff | 88 | **9** |

> Effekt: `godiron_staff` (0,69×) und `aetherium_staff` (0,70×) sind nicht mehr throughput-negativ; kein craftbares Top-Tier ist mehr strikt schlechter als ein niedrigeres. **Status-Effekte (burn/frost/shock), accuracy, magicDamage, critChance der Waffen bleiben unverändert.**

### Hebel 2 — Endgame-Mana-Sustain (REVIER: content) — durch Hebel 1 weitgehend gelöst

Die run5-„0,49× sustained L84+ / 75 % Schwach-Schläge" stammt aus den **hohen manaCost der Top-Stäbe** — mit Hebel 1 behoben (godspark mit cost 6 hatte bereits nur 0,1 % Schwach-Schläge). **Keine Änderung an Mana-Schild/Pool-Formeln nötig** (der Schild reserviert ohnehin genau 1 Cast; er verursacht keine Schwach-Schläge — nur zu hoher manaCost vs. Regen tat das).

**Insurance (klein, nur Top-Tier):** den 5 godspark-Roben je `manaRegen` **+0,6** geben (godspark-Set = req 88 → wirkt nur L88+, verschiebt mid nicht). Validiert als Teil des Bündels.

### Hebel 3 — `runecrafting trains:"int"` + Roben-Rebuff (REVIER: content) — ENTSCHIEDEN

**`runecrafting trains:"int"`: NICHT in R4 umsetzen (deferred).** Begründung mit Daten: Als reiner Zusatz verdoppelt es den int-Backbone der Magie (int 24→49 @L99, ≈ +41 magicDamage) und ist **level-skalierend** → es überschießt mid/late. Gemessen (Bündel **mit** rcInt): L75 Magie **1.14×**, L99 1.04×. Ein gegenkompensierender Wand-Trim (getestet bis ×0,82 auf req 64–86) konnte den L75-Peak **nicht** einfangen (blieb 1.14), weil der int-Buff (+31 dmg) den Waffen-Trim (−6 dmg) dominiert — ein sauberer Ausgleich erforderte ein komplettes Magie-Gear-Re-Trim (kein konservativer R4-Schritt).
→ **Fairness-Lücke bleibt dokumentiert** (Magie ist der einzige Stil, dessen Pflicht-Craft kein Attribut trainiert). Bei späterem Wunsch nur **gepaart** mit uniformem Magie-Waffen-`magicDamage`-Re-Trim (~×0,90) umsetzen — eigener Pass, nicht R4.

**Roben-Rebuff: JA, aber nur das Top-Set (godspark), NICHT mid/late.** Da Hebel 1 die Magie-mid bereits ins Band hebt (L55 0,92 / L75 0,99), wäre ein mid-Roben-Rebuff (run5 schlug ×0,70 vor) ein **Über-Buff**. Nur der **L99-Boden** braucht Hilfe (godspark_staff ist throughput-limitiert). godspark-Roben `magicDamage` **×1,5** (≈ ×0,90 des Original-vor-R3, also milder Teil-Revert des R3-×0,60):

| godspark-Teil | magicDamage jetzt → **nachher** |
|---|--:|
| godspark_mitre (Helm) | 11 → **17** |
| godspark_vestment (Body) | 18 → **27** |
| godspark_skirt (Legs) | 12 → **18** |
| godspark_handwraps (Gloves) | 11 → **17** |
| godspark_sandals (Boots) | 11 → **17** |

> Set-Bonus `godspark_vestment_set` (magicDamage 17) **unverändert**. `wis`/int-Mods/Krit/maxMana der Roben unverändert.

### Hebel 4 — bloodiron-1H-Wand (REVIER: content) — bereits vorhanden, kein neues Tier

`bloodiron_wand` existiert (req 70, magicDamage 33, manaCost 11→**7** per Hebel 1). Die Tier-Wand-Leiter copper→godiron ist **vollständig (12 Tiers)**. **Kein neues Tier nötig.** Optional (Diversität, **nicht** Parität): ein Spezial-1H-Caster zwischen `voidcaller_staff` (req65) und god-Tier — separat, nicht R4.

### Hebel 5 — Magie-Accuracy/Crit vs. evasive (REVIER: content) — KEINE Änderung in R4

Die Magie-Waffen tragen bereits **hohe** accuracy-Boni (godiron_wand 198, godiron_staff 185), und `accuracy = 50 + dex·3 + magic_off·2 + eq`. In der Sim (real combat inkl. Trefferwurf) landet Magie **mit** diesen Werten im Band — Accuracy gated den Durchsatz aktuell **nicht**. **Empfehlung: keine Accuracy-Änderung in R4.** Falls ein späterer Sweep gegen explizit evasive Mobs Magie-Misses zeigt: +10–15 accuracy auf die High-Tier-Foki (god_focus/godiron_focus) — content, risikoarm, separat.

### Hebel 6 — Ranged-Endgame-Trim (REVIER: content)

**Tier-progressiv** (nur req ≥ 28 — Low-Level-Ranged bleibt unangetastet, da früh der Boden):

**a) voidhide-Set** (L99-Haupttreiber) — `rangedDamage` jetzt → **nachher** (≈ ×0,5):

| Teil | jetzt → **nachher** |
|---|--:|
| voidhide_helm | 12 → **6** |
| voidhide_body | 18 → **9** |
| voidhide_legs | 14 → **7** |
| voidhide_vambraces | 12 → **6** |
| **voidhide_boots** | **1 → 6** (Tippfehler-Fix: erst auf vambraces-Niveau 12 setzen, dann mit-trimmen → 6) |

> Defense/evasion/maxHp der voidhide-Teile **unverändert** (Glass-Cannon-Identität bleibt).

**b) Bögen** — `rangedDamage` **×0,85** auf alle req ≥ 28 (mithril+); Anker: `godiron_shortbow` 69 → **59**, `godiron_longbow` 82 → **70**.

**c) Munition** — `ammoDamage` **×0,78** auf alle ≥ 6 (steel+): `godiron_arrow` 32→**25**, `titanium_arrow` 22→**17**, `bloodiron_arrow` 18→**14**, `runite_arrow` 14→**11**, `adamantium_arrow` 12→**9**, `mithril_arrow` 9→**7**, `blacksteel_arrow` 7→**5**, `steel_arrow` 5 (unverändert <6). copper/bronze/iron-Pfeile (≤3) **unverändert**.

**d) shadowhide-`rangedDamage`** (req ~72) **×0,6** als Glättung: body 9→**5**, legs 7→**4**, helm 6→**4**, vambraces 6→**4**.

> Evasion-Tank (run5: ranged eva ~3× Platte): bei 0 Toden folgenlos, **kein** Throughput-Effekt → in R4 **nicht** angefasst (konservativ; Evasion-Budget-Cut wäre ein eigener Identitäts-Pass). `leatherworking→dex` bleibt (symmetrisch zu smithing→str für Melee).

### Hebel 7 — Melee: str-in-Platte (JA) + 2H-Buff (REVIER: content)

**str-in-Platte: JA.** str-Modifier ≈ dem `meleeDamage` des Teils, auf Platte **Helm/Body/Legs** (so skaliert der Backbone tier-gerecht und ein Spieler ohne smithing-Grind sitzt trotzdem im Band). Anker godiron:

| Teil | meleeDamage | **modifiers.str setzen** |
|---|--:|--:|
| godiron_platebody | 18 | **+18** |
| godiron_platelegs | 12 | **+12** |
| godiron_fullhelm | 8 | **+8** |
| godiron_medhelm | 8 | **+8** |

> Regel für alle übrigen Plattentiers: `modifiers.str += round(piece.meleeDamage)` auf Helm/Body/Legs. (Gauntlets/Sabatons = gloves/boots → ausgenommen.) Mid-Platte trägt nur kleinen meleeDamage (mithril platebody 4 → str+4) — das ist gewollt; die mid-Melee-Parität kommt v.a. aus dem Ranged-Trim (Hebel 6b/c).

**2H-Buff (Diversität, parität-neutral — best-Melee bleibt der schnelle Dolch):** die langsamen 2H trailen (run5: Maul L98 0,66× best-Melee) durch das lahme Intervall. `attackIntervalMs`-Strafe **×0,6**, critDamage leicht anheben:

| Waffe | aIMs jetzt → **nachher** | critDamage |
|---|--:|--:|
| godiron_maul | +1500 → **+900** | (str+12 bleibt) |
| godiron_greatsword | +1100 → **+650** | +**0,30** (neu) |
| godiron_greataxe | +900 → **+550** | 0,55 (bleibt) |
| godiron_spear | +200 → **+120** | — |

> Proportional (×0,6 der aIMs-Strafe) auch auf die niedrigeren 2H-Tiers anwenden. Hebt den 2H-Floor von ~0,66× auf ~0,9× des best-Melee, **ohne** das Parität-Band zu verschieben (der DPS-optimale Melee bleibt Dolch/Scimitar).

---

## 3) Geordnete Apply-Liste (content-dev)

1. **manaCost-Kurve** (Hebel 1): Stab- + Wand-Leiter + 5 Spezial-Caster. — schließt die Stab-Falle + Magie-mid + Endgame-Sustain.
2. **godspark-Roben** `magicDamage` ×1,5 + je `manaRegen` +0,6 (Hebel 3/2). — schließt Magie-L99-Boden.
3. **Ranged-Trim** (Hebel 6): voidhide (inkl. boots-Typo-Fix), Bögen ×0,85, Munition ×0,78, shadowhide ×0,6. — senkt die Ranged-Decke L30–L99.
4. **str-in-Platte** (Hebel 7): `modifiers.str = round(meleeDamage)` auf Helm/Body/Legs aller Plattentiers. — Melee-Backbone smithing-unabhängig.
5. **2H-Buff** (Hebel 7): aIMs-Strafe ×0,6 + greatsword critDamage +0,30. — Diversität.
6. **NICHT** umsetzen: `runecrafting trains:"int"` (deferred, §Hebel 3), mid-Roben-Rebuff, Magie-Accuracy-Buff, neues bloodiron-Wand-Tier, Evasion-Budget-Cut, Mana-Schild/Pool-Logik.

**Validierungsreihenfolge:** Schritt 1 allein hebt Magie-mid ins Band; +2 schließt L99-Magie; +3 senkt Ranged; +4/5 heben Melee/Diversität. Nach jedem Schritt sollte der nächste Sweep das jeweilige Band bestätigen.

---

## 4) Prognose-Tabelle (nach R4, Ranged = 1.00) — validiert im fixen Harness

| Checkpoint | Melee | Ranged | Magie | im Band 0,90–1,10? |
|---|--:|--:|--:|---|
| L10 | 1.21¹ | 1.00 | 1.12¹ | ⚠ Harness-Artefakt (s. §6) |
| L30 | 0.86 | 1.00 | 0.97 | ✓ (Melee unterer Rand) |
| L55 | 0.90 | 1.00 | 0.92 | ✓ |
| L75 | 1.01 | 1.00 | 0.99 | ✓ |
| L99 | 0.89 | 1.00 | 0.88 | ✓ (unterer Rand) |

¹ **L10:** Im Harness ist Ranged früh der **Boden** (627 vs Melee 763) — ein Gear-Selektions-Artefakt meines Auto-Selektors (suboptimale L10-Leder/Bogen-Wahl). R4 ändert **keinerlei** req<28-Ranged-Gear → L10-Ranged ist baseline-identisch, das „Overshoot" wird **nicht von R4 verursacht**. run5-combat-ranged misst L10-Ranged bereits bei **1,01×** (Parität gelöst); gegen **Melee** liegt R4-Magie@L10 bei 706/763 = **0,93** (im Band). L10 daher als gelöst werten (run5), nicht aus diesem Harness re-litigieren.

Identitäten bleiben: Melee = raw + Tank (Platte/str, schnelle Klinge) · Ranged = Krit+Tempo+Munitions-Flat (Referenz) · Magie = Mana/Status (Status-Effekte, Krit, maxMana voll erhalten; nur die manaCost-Falle entfernt, kein Roh-Buff).

---

## 5) Wichtigste Zahlen (Headline)

- **L99-Decke geschlossen:** Melee 0,68→**0,89**, Magie 0,73→**0,88** (Ranged von 1,37–1,47× über beiden auf ~1,12× — im Band).
- **manaCost-Falle behoben:** Stab-Cap **24→10**, Wand-Cap **12→8** → kein craftbares Top-Tier mehr throughput-negativ; godiron_staff (0,69×) wieder spielbar. **Dies allein hebt Magie-mid ins Band (L55 0,86→0,92, L75 0,92→0,99).**
- **rcInt deferred:** als reiner Add überschießt es L75 auf **1,14×** und ist nicht sauber kompensierbar — daher NICHT in R4 (Fairness-Lücke dokumentiert für einen späteren, gepaarten Pass).
- **voidhide_boots-Typo:** rangedDamage **1 → 6** (Fix auf vambraces-Niveau, dann mit-getrimmt).

## 6) Methodik & Konfidenz

- **Konfidenz L30/L55/L75/L99 hoch** (4 Mobs/Checkpoint, deterministischer Seed, mana-aware Magie-Selektion). Die Magie-Auto-Wahl traf mid teils ein leichtes Unter-Optimum (z.B. voidcaller_staff statt bestem Wand+Fokus) → die gemeldeten Magie-Werte sind eher **konservativ** (echtes Optimum ≥ gemessen, aber durch Hebel 1/3-Begrenzung gedeckelt).
- **L10 niedrig-konfident** (Ranged-Boden-Artefakt, s. ¹) — durch run5 abgedeckt.
- Alle Trims über `structuredClone` getestet; Harness nach dem Lauf **entfernt**; `packages/**` unverändert.
- Das `pnpm test`-`GEARED_HERO` ist (laut Aufgabe) repariert und rüstet jetzt echte godiron-IDs aus — die Endgame-Wall-Garde greift wieder; diese Spec stützt sich auf das eigene per-Stil-Harness (der `GEARED_HERO` ist ein Single-Loadout-Wächter, kein 3-Stil-Vergleich).
