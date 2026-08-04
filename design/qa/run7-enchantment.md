# QA Run 7 — Enchantment-System (R5: Auto-Salvage Top-Roll-Schutz im Overflow, toter Frost-Test echt repariert, flame-Flat=+3)

**Tester-Persona:** Enchantment-Spieler (Affix-Bench, tiered Runen inkl. Sturm, Disenchant/Salvage/Auto-Salvage/Gear-Vault, Save-Roundtrip)
**Datum:** 2026-06-28 · **Methode:** Code-Audit + bestehende Vitest-Suite **direkt im Paket** gefahren (`npx vitest run` in `packages/engine`, kein Turbo-Cache; kein Temp-Harness nötig) · **Read-only**

## Fun-Score 9,3/10

Run 7 räumt **beide** offenen run6-P2 ab — und zwar genau dort, wo der Auftrag sie verlangt hat.

**1. Der hartnäckige tote Frost-Wächter lebt jetzt wirklich.** `ranged-vs-magic.test.ts:68` testet nicht mehr das gelöschte `frostbite_longbow`, sondern den **modernen Instanz-Pfad**: echte Bogen-Basis `mithril_longbow` + ausgerüstete `affix_frost`-T3-Instanz an `equippedInstances.mainhand`, gegen den frost-immunen `skeleton_icemage` (`resist: ["poison","frost"]`) → `expect(sawFrost).toBe(false)`. Entscheidend ist die **neue Gegenprobe** (`:94`): identisches Setup gegen `ash_tyrant` (`resist: ["burn"]`, **nicht** frost) → `expect(sawFrost).toBe(true)`. Damit ist bewiesen, dass der Immun-Test **echte Frost-Logik** prüft und nicht aus dem falschen Grund grünt. Der Combat-Pfad trägt das auch wirklich: `applyWeaponEffects` (combat.ts:579) liest bei einer Instanz mit `baseItemId === mainhand` über `effectiveInstanceWeaponEffects` die Affix-`weaponEffectByTier` aus — der Frost-Effekt der Rune wirkt im Kampf. **Erstmals seit run4 ist „Effekt-Runen wirken im Kampf" verifiziert statt nur plausibel.**

**2. Auto-Salvage ist jetzt durchgängig verlustfrei für gute Items.** `shouldAutoSalvage` (enchant.ts:362) hat den in run6 kritisierten `isFull → return true`-Zweig **verloren** und gibt bei Flag AN nur noch `isLowQualityInstance(inst)` zurück. Die Overflow-Entscheidung liegt jetzt allein in `intakeInstance`: schwache Instanz → zerlegt; **starke Instanz bei vollem Inventar → in den Gear-Vault** (`bankInstances`), `kept:true, vaulted:true`. Ein Top-Roll wird damit **nie** mehr zerlegt — auch nicht beim vollen Rucksack. Das war die letzte scharfe Kante an „an und vergessen"; sie ist weg.

**3. Flat-Parität hergestellt.** `affix_flame` T3 ist von `+4` auf `+3` gezogen (Kommentar `run6-fix` an Ort und Stelle), damit flame/frost/shock auf **identischem Flat (+3/+3/+3)** sitzen. Die Unterscheidung läuft jetzt sauber über die Sekundär-Effekte (DoT vs. Slow vs. Skip), nicht über einen versteckten Flat-Vorteil.

Punktabzug bleibt **nur noch P3-Politur** — kein P2 mehr. Am sichtbarsten: der Hinweistext ist durch die (bessere) Mechanik jetzt sogar **noch unehrlicher** geworden (er verspricht „bei Überlauf zerlegen", obwohl Overflow nun **vaultet** und stattdessen **schwache Drops jederzeit** zerlegt werden). Dazu die bekannten Carryover (Toggle mutiert State direkt, Salvage-Ökonomie/Confirm, Slot-Leiter-Mittelband, stilles Drop-Feedback).

## Δ vs run6

| Thema | run6 | run7 | Status |
|---|---|---|---|
| **Toter Frost-Test** | `frostbite_longbow` (gelöscht) → `sawFrost=false` trivial wahr (P2) | Instanz-Pfad: `mithril_longbow` + `affix_frost` T3 vs. frost-immun **+ Gegenprobe** vs. `ash_tyrant` | **P2 behoben & verifiziert** |
| **Auto-Salvage An frisst Top-Roll im Overflow** | `isFull → return true` vor Qualitätsprüfung zerlegt auch Top-Rolls (P2) | `shouldAutoSalvage` = nur `isLowQualityInstance`; Overflow vaultet starke Instanzen | **P2 behoben** |
| **flame T3-Flat** | `+4` (asymmetrisch zu frost/shock `+3`) | `+3` — flame=frost=shock T3 Flat-Parität | **angeglichen** |
| **Auto-Salvage-Hinweistext** | „bei Überlauf", Hälfte unehrlich (P3) | **unverändert** — jetzt *doppelt* falsch (Overflow vaultet; schwache Drops jederzeit zerlegt) | **offen, verschärft (P3)** |
| **Toggle mutiert State direkt** | kein setState/Dirty (P3) | unverändert (`EnchantingPage.tsx:416`) | offen |
| **Salvage-Ökonomie / Confirm** | Platzhalter, kein Confirm (P3) | unverändert (enchant.ts:47, 25 %) | offen |
| **Slot-Leiter Mittelband** | magic=rare=superRare=2 (P3) | unverändert (`shared:1138-1141`) | offen |
| **Drop-Feedback (kept/vaulted/salvage)** | stille `instanceMade`-Zählung (P3) | unverändert (`combat.ts:425`) | offen |

**Netto:** Die zwei run6-P2 sind **erledigt und getestet**, dazu die Flat-Parität. Es bleibt ausschließlich P3-Politur — Schwerpunkt Ehrlichkeit des Labels und Loop-Komfort. Klarer Schritt nach oben (9,0 → 9,3).

---

## Kernfragen (Chef)

**1. Schützt Auto-Salvage Top-Rolls jetzt ÜBERALL (auch Overflow)? → JA.**
`shouldAutoSalvage` (enchant.ts:362): `autoSalvage !== true → false`; sonst **ausschließlich** `isLowQualityInstance(inst)`. Der pauschale `isFull → true` ist raus. Die Overflow-Logik sitzt jetzt allein in `intakeInstance` (enchant.ts:317): kein Auto-Salvage **oder** starke Instanz → `addInstance`; schlägt das fehl (volles Inventar) → `bankInstances.push` mit `kept:true, vaulted:true`. Konsequenz: Schwache Instanz wird (Flag AN) zerlegt — egal ob Platz da ist; **starke Instanz wird NIE zerlegt** und landet bei vollem Inventar verlustfrei im Vault. Der Vault ist unbegrenzt; ausgerüstete Instanzen passieren diesen Eingang nie → kein Doppel-Salvage. **„An und vergessen" ist jetzt wirklich verlustfrei für gute Items.**

**2. Ist der tote Test echt repariert? → JA, und doppelt abgesichert.**
Der Immun-Test (`:68`) nutzt eine **existierende** Basis (`mithril_longbow`, ranged, line 2640) plus eine **ausgerüstete** `affix_frost`-T3-Instanz — exakt der Pfad, den `applyWeaponEffects`→`effectiveInstanceWeaponEffects` im Kampf liest. Mob `skeleton_icemage` resistiert frost → kein Stack erwartet. Die **Gegenprobe** (`:94`) feuert dasselbe Setup auf `ash_tyrant` (frost NICHT resistiert) und verlangt `sawFrost=true`; sie ist grün → der Frost-Pfad **feuert nachweislich**, also ist der Immun-Test nicht vakuant. Damit ist der run4→run6-Dauerbrenner gelöst und „Effekt-Runen wirken im Kampf" erstmals belegt.

**3. DoT-vs-Flat fair (flame=frost=shock T3)? → Flat ja (jetzt symmetrisch); Effekte bewusst unterschiedlich.**
T3-**Flat** ist nach dem `4→3`-Fix bei allen drei identisch (`+3` melee/ranged/magic, content:12333/12348/12404). Alle drei sind `appliesTo: ["any_weapon"]` → für alle drei Stile nutzbar (Tri-Garantie steht). Die **Sekundär-Effekte** liegen bewusst auf verschiedenen Achsen: flame = burn-DoT (T3 magnitude 14/s, 5 s, 25 % → ~17,5 Roh-DPS-Beitrag pro Proc, ignoriert Rüstung, tickt durch Regen), frost = Slow (magnitude 1), shock = Skip (magnitude 0,20). Das ist **kein Flat-Ungleichgewicht** mehr, sondern eine Profil-Differenzierung: flame schiebt Schaden, frost/shock schieben Mitigation/Tempo. In einem AFK-Idle zählen beide Achsen (DPS vs. eingehender Schaden/Auto-Eat), darum ist „fair" hier eine Design-Wahl, kein Rechenfehler. Keine Regression; nur als Beobachtung notiert (s. P3 unten).

**4. Disenchant/Vault/Salvage rund? → Fundament rund, Ränder weiter Platzhalter.**
Unverändert solide aus run6: Disenchant (enchant.ts:226) zieht 1 Affix, degradiert bei leerer Instanz sauber zum plain Item; Vault Deposit/Withdraw verlustfrei; Salvage ohne Doppel-Salvage. Offene Kante bleibt die **Ökonomie**: `salvageGold` = pauschal 25 % Basiswert, unabhängig vom Enchant-Invest; **kein Confirm** beim manuellen Zerlegen affix-tragender Instanzen.

**Test-Tally:** `enchant.test` (17) + `ranged-vs-magic.test` (4) + `instance-weapon-effect.test` (1) = **22/22 grün**, direkt im Paket gefahren. ranged-vs-magic wuchs 3→4 (neue Frost-Gegenprobe), enchant 16→17.

---

## Findings

### [P3] Auto-Salvage-Hinweistext ist durch den Fix jetzt *doppelt* falsch
`apps/client/src/renderer/i18n/translations.ts:1522` (DE) / `:752` (EN): „Zerlegt Instanz-Items automatisch **bei Inventar-Überlauf**." Nach run7 stimmt das gleich zweifach nicht: (a) Bei Überlauf werden starke Instanzen jetzt **gevaultet, nicht zerlegt**; (b) zerlegt wird stattdessen **jeder schwache Drop — auch bei freiem Platz**. Der Spieler liest also genau das Gegenteil der (besseren) Realität. Das ist die einzige echte „Ehrlichkeits"-Lücke, die zwischen Run 7 und einer 9,5 steht.
**Fix:** z. B. DE „Zerlegt **schwache** Instanz-Drops automatisch (Tier ≤ 1, kein starker Suffix); **starke** Drops bleiben erhalten und wandern bei vollem Inventar in den Gear-Vault. Gibt Basis-Item + Schrott zurück." — analog EN. Optional die Low-Quality-Schwelle im UI andeuten.

### [P3] UI-Toggle mutiert State direkt — kein Re-Render, kein Dirty-Signal (run5-Carryover, unverändert)
`EnchantingPage.tsx:416` `onChange={(e) => { state.settings.autoSalvage = e.target.checked; }}` — kein `setState`/Tick, kein Save-Dirty-Mark. Checkbox aktualisiert visuell nicht zuverlässig; Persistenz hängt am nächsten regulären Save. Einziger State-Mutations-Ort dieser Art im Renderer.
**Fix:** Über den normalen Mutations-/Dirty-Pfad setzen und Re-Render auslösen.

### [P3] Salvage-Ökonomie weiter Platzhalter + Verlustfalle ohne Confirm (run5-Carryover, unverändert)
`salvageGold` (enchant.ts:47) = 25 % Basiswert, **unabhängig** vom Enchant-Invest; Runen verfallen restlos; **kein Confirm** beim manuellen Zerlegen affix-tragender Instanzen. Ein versehentliches Salvage einer T3-Waffe verliert den ganzen Invest.
**Fix:** Confirm bei affix-/suffix-tragenden Items; `salvageGold` an Affix-Anzahl/Tier koppeln (`salvageScrap` koppelt bereits mit `1 + #Affixe`).

### [P3] Slot-Leiter Mittelband undifferenziert (run5-Carryover, unverändert)
`enchantSlotsFor` (shared:1133): poor=common=1, **magic=rare=superRare=2**, epic=3, legendary=godly=4. Drei Rarities teilen denselben Slot-Wert — eine Rare verzaubert sich identisch zur Magic. Feinerer Verlauf gäbe der Rarity-Jagd Enchant-Bedeutung.

### [P3] Auto-Salvage/Vault weiter ohne Spieler-Feedback an der Drop-Stelle (run6-Carryover, unverändert)
`combat.ts:425` zählt `instanceMade` immer als gesammelt (`itemsGathered`), egal ob die Instanz behalten, gevaultet oder zerlegt wurde; `tryCraftSuffix` (`:418`) wird nur als `if (res)` ausgewertet. Es gibt kein Toast/Log, das „auto-zerlegt" vs „in den Vault" unterscheidet. Gerade jetzt, wo Overflow je nach Qualität *unterschiedlich* reagiert, kann stiller Komfort sich wie ein Bug anfühlen.
**Fix:** Aus `IntakeResult` (`kept`/`vaulted`/`salvage`) ein kurzes Log/Toast ableiten.

### [P3] (Beobachtung) DoT-Achse strukturell stärker als Slow/Skip im AFK-Mob-Stomp
Bei equal Flat (+3) liefert flame zusätzlich rohen Schaden (DoT, rüstungs- und regen-ignorierend), während frost/shock nur Mitigation/Tempo liefern. Beim AFK-Zerlegen von Mobs, die ohnehin schnell sterben, zahlt sich DoT (= schnellerer Kill) oft direkter aus als Slow/Skip (= weniger eingehender Schaden, der bei Überlegenheit kaum wirkt). Kein Bug — die drei sind bewusst verschieden —, aber falls die drei „gleich attraktiv" sein sollen, lohnt ein Blick auf frost/shock-Uptime gegen Trash-Mobs.

---

## Was fehlt für 9,5?

1. **Hinweistext ehrlich machen [P3] — der einzige verbliebene „Ehrlichkeits"-Punkt.** Text auf die tatsächliche (bessere) Semantik umschreiben: schwache Drops werden jederzeit zerlegt, starke bleiben und vaulten bei Überlauf. Das ist der direkteste Hebel von 9,3 auf 9,5, weil das Label sonst aktiv gegen die gute Mechanik arbeitet.
2. **Toggle über Dirty/Re-Render-Pfad setzen [P3].** Damit die Einstellung visuell sofort greift und sicher persistiert — kleine Korrektheits-Kante, aber sie betrifft genau das Feature, das jetzt rund ist.
3. **Salvage-Ökonomie aus dem Platzhalter holen [P3].** Confirm bei affix-/suffix-Items + `salvageGold` an Invest koppeln; nimmt die letzte Reue-Falle raus.
4. **Drop-Feedback differenzieren [P3].** Kurzes Log/Toast für zerlegt vs. gevaultet — macht das jetzt qualitätsabhängige Verhalten sichtbar.
5. **Politur: Slot-Leiter staffeln [P3]** + optional frost/shock-Attraktivität gegen flame prüfen — das ist die Feinpolitur, die „rechnerisch fair" in „fühlt sich gut an" verwandelt.

## Verdict
Run 7 (R5) erledigt **beide** zentral beauftragten Punkte: Der **tote Frost-Wächter ist echt repariert und doppelt abgesichert** (Instanz-Pfad + Gegenprobe; Kampfwirkung der Effekt-Runen erstmals verifiziert), und **Auto-Salvage schützt Top-Rolls jetzt überall** — auch im Overflow wandern starke Instanzen verlustfrei in den Vault, nur Schwaches wird zerlegt. Dazu sitzt die **Flat-Parität flame=frost=shock (+3)**. **Kein P0, kein P1, kein P2 mehr.** Gegen 9,5 steht nur noch P3-Politur — angeführt vom Hinweistext, der durch die bessere Mechanik ironischerweise *unehrlicher* geworden ist, plus Toggle-Sauberkeit, Salvage-Ökonomie/Confirm und Drop-Feedback. Das System ist jetzt sicher, getestet und spaßig; es fehlt die letzte Ehrlichkeit am Label und etwas Loop-Komfort. **9,3/10.**
