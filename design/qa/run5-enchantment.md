# QA Run 5 — Enchantment-System (Wave 3: Auto-Salvage verdrahtet, Shock-Profil, DoT-Tri-Garantie)

**Tester-Persona:** Enchantment-Spieler (Affix-Bench, tiered Runen inkl. Sturm, Disenchant/Salvage/Auto-Salvage/Gear-Vault, Save-Roundtrip)
**Datum:** 2026-06-28 · **Methode:** Code-Audit + Headless-Harness gegen echten Content (Harness `_run5_harness.test.ts` nach Lauf wieder entfernt) · **Read-only**

## Fun-Score 8,5/10

Run 5 macht aus dem soliden Fundament ein **rundes, ehrliches System**: Der in run4 tote Auto-Salvage-Toggle ist jetzt **echt verdrahtet**, das im Kampf längst vorhandene **Schock-Profil** hat endlich eine eigene Rune-Leiter, und die DoT-Runen sind keine Trap-Option mehr — sie tragen jetzt einen **garantierten Tri-Damage-Flat** zusätzlich zum Proc. Drei der vier run4-Findings sind damit substanziell erledigt. Punktabzug, weil ein **toter Wächter-Test fortbesteht** (run4-P2 unverändert), der Auto-Salvage-Filter **mehr tut als sein Hinweistext verspricht** (zerlegt ALLES bei „An", nicht „bei Überlauf" → Footgun) und die Salvage-Ökonomie weiter Platzhalter mit Verlustfalle ist.

## Δ vs run4

| Thema | run4 | run5 | Status |
|---|---|---|---|
| **Auto-Salvage-Toggle** | `shouldAutoSalvage` definiert, **nie aufgerufen** (P1, tot) | `intakeInstance` ruft ihn und wird aus `combat.ts:418` (Drop-Suffix), `tick.ts` (Craft-Suffix) & `suffix.ts:138` aufgerufen | **P1 behoben** (Wiring) |
| **Schock/Sturm** | `shock`-Status im Kampf, aber **kein** Affix/Rune (P3) | `affix_shock` + `rune_storm_i/ii/iii` + `craft_rune_storm_*`; magnitude 0.10→0.20 skaliert pro Tier (echte Aussetz-CC) | **P3 geschlossen** |
| **DoT vs Flat** | flame/frost `bonusByTier:[{},{},{}]` = null Garantie (P2) | flame/frost/shock geben jetzt **Tri-Flat** (flame +1/2/4, frost/shock +1/2/3 auf melee+ranged+magic) PLUS Proc | **P2 substanziell behoben** |
| **Vacuanter Frost-Test** | `ranged-vs-magic.test.ts:72` testet gelöschtes Item (P2) | **unverändert** — `frostbite_longbow` weiter in Zeile 72 + in `DISCARD_IDS` (persistence:621) | **NICHT behoben** |
| **Salvage-Ökonomie** | Platzhalter, kein Refund, kein Confirm (P3) | unverändert | offen |
| **Slot-Leiter Mittelband** | magic=rare=superRare=2 (P3) | unverändert | offen |

Netto: vom „korrekten, aber an drei Stellen leeren Fundament" zu „feature-komplett & konkurrenzfähig balanciert". Klarer Sprung.

---

## Kritische Prüfpunkte

**1. Auto-Salvage WIRKT jetzt? → JA (verdrahtet, belegt).**
`intakeInstance` (enchant.ts:307) ist der kanonische Eingang frischer Loot-/Craft-Instanzen und ruft `shouldAutoSalvage`. Call-Sites real: `combat.ts:418` (Drop-Suffix-Roll), `tick.ts:131` (Craft-Suffix), `suffix.ts:138`. Test-Sim grün: Flag AUS → Instanz landet im Inventar (`kept:true`); Flag AN → Instanz wird zerlegt (`kept:false`, Basis-Item + 2 Schrott + Gold), keine Instanz im Inventar. Sauber: ausgerüstete (`equippedInstances`) und gevaultete (`bankInstances`) Instanzen passieren diesen Eingang nie → kein versehentliches Auto-Salvage von Getragenem. **Kein Doppel-Salvage** (Instanz war nie eingelagert).

**2. Schock-Affix nutzt echte Kampf-Mechanik? → JA.**
`effectiveInstanceWeaponEffects` (shared:1310) mischt Basis- + Affix-`weaponEffectByTier` dedupliziert; `affix_shock` liefert `{type:"shock", chance, magnitude}`. Kampf liest es: `combat.ts:863` — `status.shock > 0 && rng < shock` → Gegner setzt aus („miss"). magnitude = Aussetz-Wahrscheinlichkeit pro Angriff, solange der Schock-Effekt aktiv ist. 0.20 @T3 = 20 % Turn-Loss über 5 s. Echte CC, kein Platzhalter.

**3. DoT-Runen jetzt konkurrenzfähig? → JA (Tri-Garantie).**
flame/frost/shock haben `appliesTo:["any_weapon"]` + garantierten Flat auf alle drei Schadensarten **plus** Proc. Beispiel 1-Slot-Melee @L30 (Harness: blacksteel_dagger ~82 dmg/Hit, ~2,38 s Intervall): `keen III` = +14 Melee garantiert (style-locked); `flame III` = +4 Tri + 25 % Burn (14/s über 5 s ≈ ~7 effektive DpS bei ~50 % Uptime) — grob gleichauf, dazu auf JEDER Waffe nutzbar. Die dedizierten Flat-Runen (keen/arcane/hunter, +14 single-type) bleiben für ihren Eigenstil die Spitze, die DoT-Runen gewinnen durch Flexibilität + Proc-Fantasy. Trap-Charakter ist weg.

**4. Save-Roundtrip Instanzen + `autoSalvage`-Flag → JA.**
`autoSalvage` wird in `deserialize` gehärtet (persistence:725, Default `false`). Instanz-Persistenz (Inventory/Equipment/Vault + `nextInstanceSeq`) wie in run4 belegt; `sanitizeInstance` bleibt die EINE Härtungsstelle. Affix-Overlay in computeStats unverändert über `instanceBonusDelta`.

**Test-Tally:** enchant.test (11) + ranged-vs-magic.test (3) = 14/14 grün; Harness 3/3 grün. (Persistence nicht erneut isoliert gefahren — Save-Logik unverändert ggü. run4.)

**Frost-magnitude-Hinweis (run4-P2-Teil):** dass `affix_frost` magnitude über alle Tiers = 1 bleibt, ist **mechanisch korrekt** — Kampf behandelt Frost binär (`frost = true`, `combat.ts:608/860`, fester `FROST_SLOW`), magnitude wird ignoriert. Skaliert werden Chance + Dauer, das ist die richtige Stellschraube. Kein Finding mehr.

---

## Findings

### [P2] Vacuanter Frost-Resist-Test besteht UNVERÄNDERT fort (run4-P2 nicht behoben)
`ranged-vs-magic.test.ts:72` setzt weiter `s.character.equipment.mainhand = "frostbite_longbow"`. Diese ID ist gelöscht (steht in `persistence/src/index.ts:621` `DISCARD_IDS`), `content.items["frostbite_longbow"]` ist `undefined` → die Waffe hat gar keinen Frost-Effekt → `sawFrost === false` ist **trivial wahr**. Der Test grünt aus dem falschen Grund und prüft die Frost-Immunität nicht. Toter Wächter — und er untergräbt das Vertrauen, dass Ranged/Magic-Frost (jetzt der eigentliche Weg über `rune_frost`-Instanz) überhaupt verifiziert ist.
**Fix:** Echte Bogen-Basis + `rune_frost`-Instanz an `equippedInstances.mainhand` hängen (so entsteht Ranged-Frost im neuen System) und gegen `skeleton_icemage` (frost-immun) testen. Bonus: analog ein `affix_shock`-Wächter gegen einen schock-immunen Mob.

### [P2] Auto-Salvage tut MEHR als der Hinweis verspricht — „bei Überlauf" ist gelogen (Footgun)
Hinweistext (DE `translations.ts:1513`): „Zerlegt Instanz-Items automatisch **bei Inventar-Überlauf**." Tatsächlich ist `shouldAutoSalvage` (enchant.ts:342) ein Phase-1-Stub: `void content; void inst; return state.settings.autoSalvage === true` — **kein Überlauf-Check, keine Rarity-/Affix-Granularität**. Ist das Flag an, wird **jede** eingehende Suffix-Roll-Instanz sofort zerlegt, auch eine wertvolle (der Test `enchant.test.ts:215` zerlegt selbst eine affix-tragende Instanz). Ein Spieler, der „nur bei vollem Inventar" erwartet, verliert dauerhaft jeden Drop-/Craft-Instanz-Gegenstand. Wiring ist korrekt — die Semantik ist es nicht.
**Fix:** Entweder echtes Overflow-Only-Verhalten implementieren (Instanz nur zerlegen, wenn `addInstance` keinen Platz findet), ODER Granularität (Schwellwert nach Rarity/Affix-Anzahl), ODER den Hinweistext ehrlich machen („Zerlegt JEDE neue Instanz-Beute automatisch"). Solange Phase 2 fehlt, ist Variante 3 das Minimum.

### [P3] UI-Toggle mutiert State direkt — kein Re-Render, kein Dirty-Signal (run4-Carryover)
`EnchantingPage.tsx:412` `onChange={(e) => { state.settings.autoSalvage = e.target.checked; }}` — keine `setState`/Tick-Auslösung, kein Save-Dirty-Mark. Die Checkbox (`checked={state.settings.autoSalvage === true}`) aktualisiert visuell nicht zuverlässig beim Klick, und ob die Einstellung vor dem nächsten regulären Save persistiert, hängt an Glück. Direkte State-Mutation aus dem Renderer ist hier der einzige Ort dieser Art.
**Fix:** Über den normalen State-Mutations-/Dirty-Pfad setzen und ein Re-Render auslösen.

### [P3] Salvage-Ökonomie weiter Platzhalter + Verlustfalle ohne Confirm (run4-Carryover)
`salvageGold` = 25 % des Basiswerts, **unabhängig** vom Enchant-Invest; `salvageScrap` = 1 + #Affixe (koppelt schon, Gold nicht); Runen verfallen restlos; **kein Bestätigungsdialog** beim Zerlegen affix-tragender Instanzen. Mildernd: die Salvage-Liste zeigt Affixe an. Ein versehentliches Zerlegen einer T3-verzauberten Waffe verliert den gesamten Invest.
**Fix:** Confirm bei Salvage von Items mit Affixen; `salvageGold` an Affix-Anzahl/Tier koppeln.

### [P3] Slot-Leiter Mittelband undifferenziert (run4-Carryover)
`enchantSlotsFor`: poor=common=1, **magic=rare=superRare=2**, epic=3. Drei Rarities teilen denselben Slot-Wert — eine Rare fühlt sich beim Verzaubern identisch zur Magic an. Feinerer Verlauf (magic 2 / rare 2 / superRare 3 / epic 3 / legendary 4 / godly 5) gäbe der Rarity-Jagd Enchant-Bedeutung.

### [P3] Style-Parität (Beobachtung aus Harness, NICHT Enchant-Domäne)
Harness @L30 (best-in-slot, ohne Enchants): Melee ~30,4k g/h vs Ranged ~19,3k vs Magic ~19,0k g/h — Melee führt durchgängig ~1,5×. Reine Combat/Content-Balance, gehört zu balance-designer/combat-dev; hier nur als Kontext vermerkt, da DoT-Runen via `any_weapon` allen drei Stilen offenstehen und die Lücke leicht abfedern.

---

## Was fehlt für 9,5?

1. **Den toten Frost-Wächter reparieren [P2]** — echter Bogen + `rune_frost`-Instanz gegen frost-immunen Mob; dazu ein `affix_shock`-Wächter. Erst dann ist „DoT/Effekt-Runen wirken im Kampf" tatsächlich verifiziert statt nur plausibel.
2. **Auto-Salvage ehrlich machen [P2]** — entweder Overflow-Only umsetzen (passend zum Hinweis) ODER Rarity/Affix-Schwellwert (damit „An" nicht alles frisst) UND Toggle über den Dirty/Re-Render-Pfad setzen. Aktuell ist es ein scharfer Footgun mit irreführendem Label.
3. **Salvage-Ökonomie aus dem Platzhalter holen [P3]** — Confirm bei affix-tragenden Items, `salvageGold` an Invest koppeln. Nimmt die Reue-Falle raus.
4. **Slot-Leiter über die Mittel-Rarities staffeln [P3]** — gibt dem Verzaubern Tiefe entlang der Rarity-Jagd.
5. **DoT-Runen ein eigenes Identitäts-Highlight geben (Politur)** — Tri-Flat hat die Balance gefixt; ein kleiner Tier-Proc-Bump oder eine fühlbare On-Proc-Fantasy (Schock = Pseudo-Stun-Moment, sichtbar im Log) macht die Rune-Wahl *aufregend*, nicht nur *rechnerisch fair*.

## Verdict
Run 5 erledigt drei der vier run4-Baustellen real: Auto-Salvage ist verdrahtet, das Schock-Profil ist geschlossen, DoT-Runen sind konkurrenzfähig. **Kein P0.** Gegen 9,5 stehen noch ein hartnäckiger toter Test [P2], eine unehrliche Auto-Salvage-Semantik mit Footgun-Potenzial [P2] und drei Politur-Punkte. Das System ist jetzt spaßig UND vollständig — es fehlt die letzte Ehrlichkeit (Test + Hinweistext) und etwas Loop-Reibung (Salvage-Reue, Slot-Staffelung).
</content>
</invoke>
