# QA Run 4 — Enchantment-System (Wave 2, generischer Verzauberungstisch)

**Tester-Persona:** Enchantment-Spieler (Affix-Bench, tiered Runen, Disenchant/Salvage/Gear-Vault)
**Datum:** 2026-06-27 · **SAVE_VERSION:** 39 · **Methode:** Code-Audit + Headless-Sim gegen echten Content (Harness danach entfernt)

## Fun-Score 7,5/10

Das Fundament trägt: ein generischer Tisch, an dem jede Basiswaffe deterministisch zur Affix-Instanz wird, mit nachvollziehbaren Slot-Regeln, sauberem Naming und — entscheidend — **vollem Save/Load-Überleben**. Das ist ein echtes ARPG-Loop-Versprechen und fühlt sich nach Substanz an. Punktabzug, weil zwei sichtbare Versprechen aktuell leer laufen (Auto-Salvage-Toggle ohne Funktion, ein vacuanter Frost-Test) und die Reiz-Tiefe noch dünn ist: DoT-Runen (Flamme/Frost) geben null Garantie-Stat, ein im Kampf existierender „shock"-Effekt hat gar keine Rune, und Salvage-Ökonomie ist Platzhalter.

## Δ vs run3

In **run3 (run3-crafting.md)** war Verzaubern Teil von Runecrafting als **per-Waffe-Festrezepte**: „6 Essenzen → 8 Runen; … dazu Waffen-Enchants" — d.h. Rezepte wie `enchant_flaming_steel_sword` → fertiges Festitem `flaming_steel_sword`. Statisch, eine Verzauberung pro Waffentyp, kein Wiederaufbrechen.

**run4** ersetzt das vollständig durch:
- **Generischen Tisch** (`applyEnchant`): beliebige Basiswaffe + Rune → Item-INSTANZ mit Affix, deterministisch (`mintInstanceId`, kein `Date.now`/uuid).
- **21 tiered Runen** (7 Affixe × i/ii/iii) statt fester Waffen, alle via Runecrafting craftbar.
- **Slots nach Rarity**, **Disenchant** (Affix raus, Rune verfällt, 50 % Gold), **Salvage**, **Gear-Vault** (3-Tab-UI).
- Die **11 alten Festitems** sind aus dem Content gelöscht (0 Referenzen) und werden bei Alt-Saves über `DISCARD_IDS` migrationssicher entfernt.

Netto: von „11 Sackgassen-Items" zu „1 wiederverwendbares System". Klarer Fortschritt.

---

## Kritische Prüfpunkte (alle bestanden)

**1. Überleben Item-Instanzen den Save/Load-Zyklus? → JA (belegt).**
Sim: `iron_sword` + `rune_keen_ii` → Instanz „Scharf Eisen-Schwert", ausgerüstet, `computeStats.attackDamage = 44,3`. Nach `serialize`→`deserialize` (SAVE 39): `equippedInstances.mainhand.affixes = [{affix_keen, tier:2}]` **identisch**, `attackDamage = 44,3` **identisch**. Persistence-Suite deckt zusätzlich explizit ab: Instanz auf `inventory.slots[]`, `equippedInstances[slot]`, `bankInstances[]` + `nextInstanceSeq` roundtrippen; Invarianten-Verletzung (`equipment[slot] ≠ baseItemId`) wird verworfen; modifikationslose Instanzen zerfallen zu plain. `sanitizeInstance` ist die EINE Härtungsstelle.

**2. effectiveInstanceWeaponEffects (burn/frost via Affix) → JA.**
Sim: `rune_flame_iii` auf Waffe → `effectiveInstanceWeaponEffects` liefert `{type:"burn", chance:0.25, magnitude:14, durationMs:5000}`. `combat.ts:505-508` liest die Instanz aus `equippedInstances.mainhand` (nur wenn `baseItemId === equipment.mainhand`) und mischt Basis- + Affix-Effekte dedupliziert. Frost analog (chance/dur skalieren je Tier).

**3. Alte per-Waffe-Rezepte + Festitems entfernt (0 Referenzen)? → JA.**
`grep` über `packages/*/src`, `apps/client/src`: 0 Treffer für die 11 IDs außer (a) `DISCARD_IDS` (gewollt, Migration) und (b) **ein Test-Rest, siehe P2**. Old per-Weapon-Rezept-IDs (`enchant_flaming_steel_sword` …) im Content: 0. (Hinweis: `enchant_*_focus/scepter/staff` im Content sind NICHT das alte System — das ist die Magiewaffen-Craft-Leiter, legit.)

**4. Affix-Stat-Overlay in computeStats → JA.**
`character.ts:171-175` iteriert `equippedInstances` und addiert `instanceBonusDelta` (shared) — die EINZIGE Auflösungsstelle von Affix/Suffix→Boni, aufgerufen nur aus computeStats. Defensiv ohne `content.affixes`.

**5. Slot-Leiter nach Rarity (Sim):** common 1 · magic/rare/superRare 2 · epic 3 · legendary/godly 4.

**Test-Tally:** enchant.test + instance-weapon-effect.test + ranged-effect.test + persistence index.test = **58/58 grün**.

---

## Findings

### [P1] „Auto-Salvage"-Toggle ist eine tote Funktion (sichtbares, leeres Versprechen)
`shouldAutoSalvage` (enchant.ts:308) ist definiert, liest nur `settings.autoSalvage` — und wird **nirgends aufgerufen** (grep: einzige Referenz ist die Doku-Erwähnung). Die Salvage-Tab-Checkbox (`EnchantingPage.tsx:409`) plus Hinweistext „Zerlegt Instanz-Items automatisch bei Inventar-Überlauf" suggeriert eine aktive Mechanik, die es nicht gibt. Der Spieler aktiviert sie und nichts passiert — klassisches „definiert, nie angewandt". Zusätzlich mutiert `onChange` `state.settings.autoSalvage` direkt ohne Dirty/Re-Render-Signal.
**Fix:** Entweder den Drop-/Overflow-Hook in Phase 2 wirklich verdrahten, ODER den Toggle bis dahin ausblenden/als „bald verfügbar" labeln. Mindestens den Hinweistext entschärfen.

### [P2] Vacuanter Frost-Resist-Test referenziert gelöschtes Item
`ranged-vs-magic.test.ts:72` setzt `equipment.mainhand = "frostbite_longbow"` — diese ID ist in run4 gelöscht. `content.items["frostbite_longbow"]` ist `undefined` → die Waffe hat gar keinen Frost-Effekt → `sawFrost === false` ist trivial wahr. Der Test grünt aus dem **falschen Grund** und prüft die Frost-Immunität nicht mehr. Toter Wächter.
**Fix:** Eine echte Bogen-Basis + `rune_frost`-Instanz an `equippedInstances.mainhand` hängen (so kommt Ranged-Frost in run4 zustande) und gegen `skeleton_icemage` testen.

### [P2] DoT-Runen (Flamme/Frost) geben null Garantie-Stat — Reiz vs. Flat-Runen schief
`affix_flame`/`affix_frost` haben `bonusByTier: [{},{},{}]` — **kein** flacher Stat, nur ein chance-basierter Effekt. Vergleich am selben Slot: `affix_keen III` = garantiert **+14 Melee**; `affix_flame III` = **25 %** Chance auf 14 Burn über 5 s; `affix_frost III` = 30 % Chance auf magnitude **1** (Mini-Slow), und die Frost-Magnitude bleibt über alle Tiers = 1. Für einen Single-Affix-Slot (common/poor = nur 1 Slot!) ist die garantierte Flat-Rune fast immer die rationale Wahl; die DoT-Runen wirken als „Trap-Option", besonders teuer (Flamme III ~310 g Material). Reine Balance-Domäne, aber es untergräbt die Wahl-Tiefe des Features.
**Fix (balance-designer):** DoT-Runen entweder mit kleinem Garantie-Stat ausstatten oder Frost-Magnitude/Slow-Tiefe je Tier skalieren, damit sie gegen Flat-Runen konkurrieren.

### [P3] Content-Lücke: „shock"-Status ohne Rune/Affix
Es gibt ein `shock_rune`-MATERIAL und der Kampf kennt den `shock`-Statustyp, aber **keinen** `affix_shock`/`affix_storm` und keine `rune_storm_*`. Das Affix-Set deckt keen/flame/frost/precise/swift/arcane/hunter ab — Blitz/Schock fehlt komplett. (Persona erwartete „rune_storm i/ii/iii" — existiert nicht.) Magie-Spieler haben damit nur `arcane` (flat) + `flame`/`frost` (any_weapon), aber kein eigenes Schock-Profil.
**Fix:** Optional `affix_shock` (weaponEffect type:"shock") + `rune_storm_i..iii` ergänzen, um die im Kampf vorhandene Mechanik zu nutzen.

### [P3] Salvage-Ökonomie = Platzhalter, Verlustfalle ohne Warnung
Sim: T3-Enchant kostet 600 g + Rune (~280 g); Salvage gibt nur Basis-Item + 2 Schrott + 30 g zurück (Gold = 25 % des Basiswerts, **unabhängig** vom Enchant-Invest), Runen verfallen restlos. Das ist die gewollte Chef-Entscheidung (kein Refund), aber ein Spieler kann ein wertvoll verzaubertes Item versehentlich „zerlegen" und alles verlieren. Mildernd: die Salvage-Liste zeigt die Affixe an.
**Fix:** Optional eine Bestätigung bei Salvage von Items mit Affixen; Salvage-Gold ggf. leicht an Affix-Anzahl koppeln (`salvageScrap` tut das schon, `salvageGold` nicht).

### [P3] Slot-Leiter ohne Differenzierung in den Mittelband-Rarities
`enchantSlotsFor`: poor=common=1 und magic=rare=superRare=2. Drei Rarities teilen sich denselben Slot-Wert — eine Rare fühlt sich beim Verzaubern identisch zur Magic an. Bewusster Platzhalter, aber ein feinerer Verlauf (z. B. magic 2 / rare 2 / superRare 3 / epic 3 / legendary 4 / godly 5) gäbe der Rarity-Jagd mehr Enchant-Bedeutung.

---

## Verdict
Das Enchantment-Fundament ist **spielbar, korrekt und persistenz-sicher** — die kritische Save/Load-Frage ist eindeutig mit JA belegt, das Altsystem ist sauber und migrationssicher entfernt. Vor „spaßig & sinnvoll" auf 9/10 stehen drei greifbare Schritte: (1) den toten Auto-Salvage-Toggle ehrlich machen [P1], (2) DoT-Runen gegen Flat-Runen konkurrenzfähig balancieren [P2], (3) das Schock-Profil schließen [P3]. Kein P0.
