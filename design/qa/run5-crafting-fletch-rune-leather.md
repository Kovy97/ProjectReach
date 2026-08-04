# QA Run 5 — Crafting: Fletching · Runecrafting · Leatherworking

Playtester-Persona: Crafting-Säule (Fletching, Runecrafting, Crafting/Leder).
Methode: READ-ONLY Datenanalyse von `packages/content/src/index.ts` + Wiring-Gegencheck gegen `packages/engine/src/{enchant,suffix}.ts`. Engine-Tests real ausgeführt (kein angelegtes Temp-Harness — nur bestehende Specs): `enchant.test.ts`/`suffix.test.ts`/`drop-suffix.test.ts`/`instance-weapon-effect.test.ts` → **27/27 grün**. Zahlen = Zeilen-/Level-/Wert-Belege aus der Quelle.
Vergleichsbasis: `design/qa/run4-crafting-fletch-rune-leather.md` (Fun-Score 8.5/10).

## Fun-Score: 9.0 / 10
## Δ vs run4: +0.5

Run 5 räumt den **einzigen echten run4-Mangel** (Reed-Gates) sauber UND doppelt ab, schließt die run4-[Info]-Lücke (`affix_shock`/`rune_storm` existiert jetzt — volle Elementar-Trias), gibt den Status-Runen eine garantierte Flat-Tri-Damage-Basis (kein "totes" Utility-Item mehr), füllt das L52→L70-Leder-Loch on-curve (ironhide) und liefert das Suffix-System engine-verdrahtet + getestet. Was unter 9.5 hält: die DoT-vs-Flat-Konkurrenzfähigkeit ist per Daten **nicht beweisbar** (braucht Combat-Sim), plus zwei kleine ironhide-Substat-Dellen und die zähen P3-Carryovers.

---

## Verifikation der Run-5-Neuerungen

### ✅ Reed-Gates gefixt — DOPPELT (war run4-[P2], das Headline-Problem)
Beide run4-Fix-Vorschläge wurden umgesetzt:
1. **Farming-Level gesenkt, folgen jetzt dem Bedarf:** reed_pale Farming **L6** (Z. 11558), reed_iron **L26** (war L46, Z. 11683), reed_void **L58** (war L84, Z. 11797).
2. **Fertige Reeds zusätzlich im Shop kaufbar** (Z. 8933–8935): reed_pale 8 g / reed_iron 30 g / reed_void 120 g — vorher nur Samen.

Gate-vs-Bedarf-Gegenprobe (niedrigster konsumierender Rune-Craft, Runecrafting-Level):
- `reed_iron` Farming L26 ↔ niedrigster Konsument `craft_rune_hunter_i` **RC L28** (Z. 6972) → Farming-Gate liegt **unter** dem Bedarf (run4 war +18 darüber).
- `reed_void` Farming L58 ↔ niedrigster Konsument `craft_rune_keen_iii` **RC L62** (Z. 7031) → wieder **unter** Bedarf (run4 war +22 darüber).

Effekt: Der selbstversorgende Runecrafter erreicht jedes Reed rechtzeitig durch normales Farming-Mitleveln, und wer nicht farmt, kauft fertig zu. Die run4-Stil-Paritäts-Delle (Ranged-Tier-I `hunter_i` hing allein an Farming L46) ist weg. **Vollständig erledigt.**

### ✅ `affix_shock` + `rune_storm_i/ii/iii` neu — Elementar-Trias komplett (war run4-[Info])
- 3 Runen-Items (Z. 619–621, `rune:{affixId:"affix_shock",tier}`) + 3 Craft-Rezepte `craft_rune_storm_i/ii/iii` (Z. 7071–7088) bei RC **L20/L42/L68**, sauber in `category:"rune_affixes"`.
- Affix-Registry `affix_shock` (Z. 12040–12054): `appliesTo:["any_weapon"]`, Flat-Tri-Damage `1/2/3` je Tier + `weaponEffectByTier` shock `chance 0.12→0.20 / magnitude 0.10→0.20 / dur 3000→5000`.
- **Reed-frei** (Inputs: essence_ash/grave/void + pigment + storm_essence) — bewusst nicht ans Farming gekoppelt, gut. storm_essence (Z. 408) ist eine bestehende, versorgte Essenz (bereits in Mithril/Adamantium-Staff-Rezepten genutzt).
- Engine: Anwendung läuft über dieselbe enchant.ts-Mechanik; `instance-weapon-effect.test.ts` + `enchant.test.ts` grün → **kein "definiert-aber-nie-genutzt".**

Damit gibt es jetzt **24 Runen = 8 Affixe × 3 Tiers**, lückenlos 1:1 craftbar.

### ✅ DoT-Runen-Tri-Damage-Garantie
Alle drei Universal-Status-Runen tragen nun eine garantierte Flat-Damage-Basis in `bonusByTier` (zusätzlich zum Effekt):
- `affix_flame` (Z. 11969): melee/ranged/magic **1/2/4** + burn 4/8/14.
- `affix_frost` (Z. 11984): **1/2/3** + frost-slow.
- `affix_shock` (Z. 12043): **1/2/3** + shock.

Dadurch ist keine Status-Rune mehr ein "totes" Pure-Utility-Item auf Waffen, wo der Effekt selten proct — sie bringt immer Schaden. Sehr gute Design-Entscheidung, adressiert direkt die "DoT vs Flat fair?"-Frage **dem Prinzip nach** (Restbedenken s. [P2]).

### ✅ ironhide-Leder-Tier (T5.5, rare, L60–62) — on-curve, füllt L52→L70
5-teilig (Z. 2751–2774), Set `ironhide_set` (Z. 9838) + Kategorie `leather_ironhide` (Z. 9652) registriert, 5 Crafts L60–62 (Z. 6367–6395). Body-Slot-Monotonie gegen die Nachbarn bestätigt:

| Slot body | studded (L50) | **ironhide (L62)** | warhide (L70) |
|---|---|---|---|
| defense | 24 | **29** | 34 |
| evasion | 22 | **25** | 28 |
| maxHp | 55 | **65** | 75 |
| Wert | 820 | **1400** | 1900 |

Sauber dazwischen, monoton steigend. Schließt das in run4 noch klaffende L52→L70-Loch der Ranged-Leder-Linie.

### ✅ Suffix-System (WoW-Stil Random Rolls) live & engine-getestet
`packages/engine/src/suffix.ts` voll verdrahtet: `suffixPool` (typ-/ilvl-gefiltert, deterministisch sortiert), gewichteter `pickWeighted`, lck-Chance-Mod (+0.0015·lck, Cap 0.15), Gesamt-Cap 0.95, Apply-Hook. Pool `content.suffixes` (Z. 12060 ff., melee/ranged/magic-affine Suffixe mit `appliesTo`/`weight`/`minIlvl`). `suffix.test.ts` (12) + `drop-suffix.test.ts` (3) grün. Determinismus-Disziplin dokumentiert (RNG zieht erst am echten Roll-Trigger → save-/fixture-stabil).

### ✅ Carryover-Bestand intakt
Holz-Schilde (willowbark/grimwood/ashfen/voidwood, 20 Referenzen) und das tiered Affix-Runen-Fundament aus run4 unverändert vorhanden.

---

## Verbleibende / neue Findings

### [P2] DoT-vs-Flat-Konkurrenzfähigkeit per Daten NICHT beweisbar — Combat-Sim nötig
Die Status-Runen geben +3–4 Flat (effektiv +3–4 auf den eigenen Stil) **+ Effekt**; die dedizierten Stil-Runen geben pur **+14** (keen→melee, arcane→magic, hunter→ranged je T3). Ob ein DoT-Build damit konkurrenzfähig ist, hängt komplett an der Combat-Mathematik (Wert von burn 14 @25%/5 s bzw. shock magnitude 0.20, frost-slow-Uptime) und an der Slot-/Stacking-Logik. `enchant.test.ts` testet Affix-Stacking — kann man mehrere Runen stapeln, sind DoT-Runen reine Add-ons (dann zu stark?); ist es 1 Slot, rechnet der Spieler den Single-Best aus (dann evtl. DoT tot oder dominant). **Aus Content-Daten allein unentscheidbar.** Das ist die zentrale offene Frage dieses Runs und der Hauptgrund für <9.5.
**Fix:** Combat-Sim-Pass (DPS keen_iii vs flame_iii/shock_iii bei realistischen Proc-Raten, 1 vs N Slots) als Beleg, dann Score-Nachzug möglich.

### [P3] Universal-Rune-Flat-Asymmetrie: flame T3 +4 vs frost/shock T3 +3
`affix_flame` T3 gibt **+4** Tri-Damage, `affix_frost`/`affix_shock` T3 nur **+3** — und flame trägt obendrein den stärksten DoT (burn 14). Flame ist damit im Universal-Slot die strikt höchste Flat-Wahl ohne Gegengewicht. Klein, aber ein freier Daumen auf der Waage.
**Fix:** flame T3 auf +3 angleichen (oder frost/shock auf +4), damit die Wahl rein über den Effekt-Charakter (Burst-DoT vs Slow vs Shock) läuft.

### [P3] ironhide-Substat-Dellen (ranged)
- **Helm-Inversion:** `ironhide_helm` rangedDamage **2** (L60) > `warhide_helm` rangedDamage **1** (L70). Auf dem Ranged-Substat schlägt das niedrigere Tier das höhere; ein Ranged-Build könnte den ironhide-Helm dem warhide-Helm vorziehen (Z. 2754 vs 2677). Def/eva/hp sind monoton, nur rngDmg dippt.
- **boots ohne rangedDamage:** `ironhide_boots` (Z. 2772) hat als einziges Set-Teil kein `rangedDamage`, während helm/body/legs/vambraces 2/4/2/2 tragen.
**Fix:** warhide_helm rngDmg auf ≥2 anheben (oder ironhide_helm auf 1) und ironhide_boots ein rangedDamage:1 geben.

### [P3] Carryover NICHT behoben (3. Run): `craft_scaled_body` levelRequired **14**
Unverändert seit run3/run4 (Z. 6265): Body schnitzbar @ L14, aber `scaled_leather_body` braucht zum **Anlegen** leatherworking 28, und der Rest des Sets craftet L28–30. Funktional folgenlos (man kann es eh nicht tragen), aber eine zähe Schönheits-Altlast.
**Fix:** auf ~L26–28 anheben.

### [P3] Carryover: `enchant_*`-Rezepte-Namenskollision (z. B. `enchant_stormcaller_rod`, Z. 7089)
Magiewaffen-/Fokus-Crafts heißen weiter "Enchant …", obwohl "Verzauberung" jetzt exklusiv das Runen-Apply meint. Rein kosmetisch/irreführend (run4-[P3], unverändert).
**Fix:** auf "Craft/Forge X" umbenennen.

### [Info] voidweave-Doppel-Cap (magic_off 99 + runecrafting 99) unverändert — bewusste Design-Wahl.

---

## „Was fehlt für 9,5?"
1. **Combat-Sim-Beleg für DoT-vs-Flat** ([P2]): nachweisen, dass flame/frost/shock-Runen (+3–4 Flat + Effekt) gegen die +14-Stil-Runen konkurrenzfähig sind — die einzige nicht aus Daten verifizierbare Kernaussage dieses Runs. Dazu die Universal-Flat-Symmetrie herstellen (flame T3 +4 → +3, [P3]).
2. **ironhide-Substat-Monotonie bereinigen** ([P3]): helm-rngDmg ≤ warhide, boots-rngDmg ergänzen — dann ist das neue Tier auch substat-sauber.
3. **Die P3-Carryovers endlich abräumen** ([P3]): scaled_body L14→~26 und `enchant_*`→`craft/forge`-Rename. Zwei Mini-Edits, die seit drei Runs offen sind.

## Fazit
Der einzige substanzielle run4-Vorwurf (Reed-Gates) ist **doppelt und sauber** behoben, die Elementar-Runen-Trias ist mit `affix_shock`/`rune_storm` komplett, die DoT-Runen haben eine garantierte Flat-Basis, ironhide füllt das Leder-Loch on-curve und das Suffix-System ist engine-verdrahtet + getestet (27/27 grün). Was bleibt: eine echte, aber daten-unbeweisbare DoT-vs-Flat-Balancefrage (P2, braucht Sim) und ein Häufchen Substat-/Carryover-P3s. Klarer, gut abgelieferter Aufwärtsschritt: **9.0/10 (Δ +0.5)**.
