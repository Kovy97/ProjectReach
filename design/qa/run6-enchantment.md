# QA Run 6 — Enchantment-System (Wave 4: Auto-Salvage entschärft, Overflow→Vault, Frost-Test-Check)

**Tester-Persona:** Enchantment-Spieler (Affix-Bench, tiered Runen inkl. Sturm, Disenchant/Salvage/Auto-Salvage/Gear-Vault, Save-Roundtrip)
**Datum:** 2026-06-28 · **Methode:** Code-Audit + bestehende Vitest-Suite direkt im Paket gefahren (kein Turbo-Cache; kein Temp-Harness nötig) · **Read-only**

## Fun-Score 9,0/10

Run 6 nimmt dem System seinen schärfsten Zahn: Der in run5 als **Footgun** kritisierte Auto-Salvage zerlegt nicht länger alles bei „An". `shouldAutoSalvage` ist von einem Phase-1-Stub (`return autoSalvage === true`) zu einer **ehrlichen Drei-Fall-Regel** gereift: AUS → nie; AN → nur bei (a) vollem Inventar (Overflow) oder (b) „schwacher" Instanz (`isLowQualityInstance`: Affixe ≤ Tier 1 UND kein/nur schwacher Suffix). Top-Rolls bei freiem Platz bleiben erhalten — sauber per Konstanten (`AUTO_SALVAGE_MAX_AFFIX_TIER`, `AUTO_SALVAGE_SUFFIX_ROLL = 1/3`) und **fünf neuen Tests** abgesichert. Dazu der zweite run5-Fix: Instanz-**Overflow geht jetzt verlustfrei in den Gear-Vault** (`bankInstances`) statt still verloren zu gehen (20/20-Test belegt es). Das ist genau das, was den Loop „an und vergessen"-tauglich macht.

Punktabzug, weil **der explizit zu prüfende tote Frost-Test unverändert tot ist** (run4/run5-P2, hartnäckig), der **Hinweistext nicht zur neuen Doppel-Semantik passt** (verspricht weiter „nur bei Überlauf", verschweigt das proaktive Zerlegen schwacher Drops) und — neu sichtbar — **das Einschalten von Auto-Salvage das Vault-Sicherheitsnetz beim Overflow aufhebt** (dann werden auch Top-Rolls bei vollem Inventar zerlegt, ohne Warnung). Plus die bekannten Politur-Carryover (Toggle-Mutation, Salvage-Ökonomie, Slot-Leiter).

## Δ vs run5

| Thema | run5 | run6 | Status |
|---|---|---|---|
| **Auto-Salvage-Footgun** | Phase-1-Stub zerlegt ALLES bei „An" (P2) | Drei-Fall-Regel: nur Overflow ODER Low-Quality; Top-Rolls geschützt (`isLowQualityInstance`, 2 Konstanten) | **P2 behoben (Mechanik)** |
| **Instanz-Overflow** | ging zur Diskussion, run5-Bug 19/20 | `intakeInstance` → bei vollem Inventar in den Gear-Vault, `kept:true, vaulted:true`; 20/20-Test | **behoben & getestet** |
| **Toter Frost-Test** | `ranged-vs-magic.test.ts:72` testet gelöschtes Item (P2) | **unverändert** — `frostbite_longbow` weiter in Z. 72, **nicht in `content`**, weiter in `DISCARD_IDS` (persistence:633) | **NICHT behoben** |
| **Auto-Salvage-Hinweistext** | „bei Überlauf" = unehrlich (P2-Teil) | Text unverändert; passt jetzt nur noch zur Hälfte (verschweigt Low-Quality-Zerlegen) | **Teil-offen (P3)** |
| **Toggle direkt mutiert State** | kein setState/Dirty (P3) | unverändert (`EnchantingPage.tsx:416`) | offen |
| **Salvage-Ökonomie / Confirm** | Platzhalter, kein Confirm (P3) | unverändert | offen |
| **Slot-Leiter Mittelband** | magic=rare=superRare=2 (P3) | unverändert (`shared:1138-1141`) | offen |

Netto: Die beiden run5-P2 sind **mechanisch erledigt** (Footgun entschärft, Overflow sicher) — der zentrale Wunsch des Chefs ist getroffen. Was bleibt, ist ein zäher toter Test und Ehrlichkeit/Politur am Rand. Klarer Halbschritt nach oben.

---

## Kernfragen (Chef)

**1. Auto-Salvage jetzt ehrlich (nur Overflow/Low-Quality)? → JA, mechanisch — aber das Label hinkt nach.**
`shouldAutoSalvage` (enchant.ts:357): `autoSalvage !== true → false`; `isFull(inventory) → true`; sonst `isLowQualityInstance(inst)`. `isLowQualityInstance` (shared:1171) schützt jede Instanz mit Affix-Tier > 1 ODER Suffix-Roll ≥ 1/3. Belegt durch Tests: starker Suffix-Drop (roll 0.95) bei Platz → behalten (enchant.test:274); T1-Junk → zerlegt (:291); Overflow zerlegt auch Top-Roll (:306). Die **Mechanik ist ehrlich**. Aber der DE-Hinweis (`translations.ts:1522`) sagt weiter „Zerlegt Instanz-Items automatisch **bei Inventar-Überlauf**" — er verschweigt, dass bei freiem Platz **schwache Drops proaktiv** zerlegt werden. Die Unehrlichkeit ist kleiner als in run5 (es trifft nur Schrott), aber sie besteht fort und in umgekehrter Richtung (Label under-promised).

**2. Instanz-Overflow sicher (kein Verlust)? → JA.**
`intakeInstance` (enchant.ts:314): kein Auto-Salvage + `addInstance` schlägt fehl → `bankInstances.push(instance)`, Rückgabe `kept:true, vaulted:true`. Tests: Einzel-Overflow → Vault (:241), 20 Drops bei vollem Inventar → **20/20 behalten** (:257). Der Vault ist unbegrenzt; ausgerüstete/gevaultete Instanzen passieren diesen Eingang nie → kein Doppel-Salvage. Sicher.

**3. affix_shock / DoT-Balance? → unverändert gut (aus run5).**
Schock-Profil (`affix_shock` + `rune_storm_i/ii/iii`, magnitude 0.10→0.20) und die DoT-Tri-Garantie (flame/frost/shock: Flat auf melee+ranged+magic PLUS Proc) sind seit run5 ausbalanciert und an `any_weapon` für alle drei Stile nutzbar. In Run 6 keine Änderung an dieser Achse — kein neues Finding, kein Regress. (Hinweis: Die *Verifikation* dieser Kampfwirkung im Test hängt weiter am toten Frost-Wächter, s. P2 unten.)

**4. Disenchant/Vault/Salvage rund? → Fundament rund, Ränder Platzhalter.**
Disenchant (enchant.ts:226) zieht 1 Affix, degradiert bei leerer Instanz sauber zum plain Item (Vault-Pfad re-stackt via `addItemOrBank`). Vault Deposit/Withdraw (:329/:338) korrekt (Withdraw lässt bei vollem Inventar die Instanz im Vault — kein Verlust). Salvage selbst ist mechanisch sauber (kein Doppel-Salvage, re-stackable Basis), aber **ökonomisch weiter Platzhalter** (Gold = pauschal 25 % Basiswert, unabhängig vom Enchant-Invest; **kein Confirm** beim manuellen Zerlegen affix-tragender Instanzen). Reue-Falle besteht.

**Test-Tally:** `enchant.test` (16) + `ranged-vs-magic.test` (3) = **19/19 grün**, direkt im Paket gefahren (Cache-Falle umgangen). enchant wuchs 11→16 (fünf neue Auto-Salvage/Overflow-Tests).

---

## Findings

### [P2] Der zu prüfende Frost-Wächter ist UNVERÄNDERT tot (run4→run6 nicht behoben)
`ranged-vs-magic.test.ts:72` setzt weiter `s.character.equipment.mainhand = "frostbite_longbow"`. Diese ID existiert **nicht** in `@hearthforge/content` (grep über `packages/content/src` = 0 Treffer) und steht weiter in `DISCARD_IDS` (persistence:633). `content.items["frostbite_longbow"]` ist `undefined` → die Waffe hat gar keinen Frost-Effekt → `expect(sawFrost).toBe(false)` ist **trivial wahr**. Der Test grünt aus dem falschen Grund; Frost-Immunität wird NICHT geprüft. Damit ist „Effekt-Runen wirken im Kampf" weiterhin nur plausibel, nicht verifiziert. Genau der Punkt, den der Auftrag ausdrücklich prüfen ließ — Befund: **noch immer tot**.
**Fix:** Echte Bogen-Basis + `rune_frost`-Instanz an `equippedInstances.mainhand` hängen (so entsteht Ranged-Frost im neuen System) und gegen `skeleton_icemage` (frost-immun) testen; analog ein `affix_shock`-Wächter gegen einen schock-immunen Mob.

### [P2] Auto-Salvage „An" hebt das Overflow-Vault-Sicherheitsnetz auf — auch für Top-Rolls (ohne Warnung)
Bei `autoSalvage === false` ist ein voller Inventar harmlos: jede Instanz wandert verlustfrei in den Vault. Schaltet der Spieler Auto-Salvage **an**, greift in `shouldAutoSalvage` aber `isFull → return true` **vor** der Qualitätsprüfung — d. h. bei vollem Inventar wird **jede** eingehende Instanz zerlegt, **inkl. Top-Rolls** (bewusst getestet: enchant.test:306 zerlegt einen Suffix-Roll 0.95). Das ist by-design dokumentiert („lieber zerlegen als die Aktion blockieren"), aber der Spieler erlebt es als Falle: „Ich räume mit Auto-Salvage nur Schrott weg" — und verliert beim nächsten vollen Inventar seinen besten Drop, während die *sicherere* Variante (Auto-Salvage AUS) ihn gevaultet hätte. Das Label warnt davor nicht.
**Fix:** Im Overflow-Zweig ebenfalls `isLowQualityInstance` respektieren (Top-Roll → trotz vollem Inventar in den Vault, nur Schwaches zerlegen) — dann ist „An" durchgängig verlustfrei für gute Items. Mindestens aber den Hinweistext um diese Konsequenz ergänzen.

### [P3] Hinweistext deckt die neue Doppel-Semantik nicht ab
`translations.ts:1522` (DE) / `:752` (EN): „Zerlegt Instanz-Items automatisch bei Inventar-Überlauf." Das neue Verhalten zerlegt zusätzlich **schwache Drops bei freiem Platz**. Der Text müsste das nennen, sonst wundert sich der Spieler, warum bei halbleerem Inventar Drops verschwinden.
**Fix:** z. B. „Zerlegt schwache Instanz-Drops automatisch (und alle bei vollem Inventar). Gibt Basis-Item + Schrott zurück." — und die Low-Quality-Schwelle (Tier ≤ 1, kein starker Suffix) im UI andeuten.

### [P3] UI-Toggle mutiert State direkt — kein Re-Render, kein Dirty-Signal (run5-Carryover, unverändert)
`EnchantingPage.tsx:416` `onChange={(e) => { state.settings.autoSalvage = e.target.checked; }}` — kein `setState`/Tick, kein Save-Dirty-Mark. Checkbox aktualisiert visuell nicht zuverlässig; Persistenz hängt am nächsten regulären Save. Einziger State-Mutations-Ort dieser Art im Renderer.
**Fix:** Über den normalen Mutations-/Dirty-Pfad setzen und Re-Render auslösen.

### [P3] Salvage-Ökonomie weiter Platzhalter + Verlustfalle ohne Confirm (run5-Carryover, unverändert)
`salvageGold` = 25 % Basiswert, **unabhängig** vom Enchant-Invest; Runen verfallen restlos; **kein Confirm** beim manuellen Zerlegen affix-tragender Instanzen. Ein versehentliches Salvage einer T3-Waffe verliert den ganzen Invest.
**Fix:** Confirm bei Affix-tragenden Items; `salvageGold` an Affix-Anzahl/Tier koppeln (`salvageScrap` koppelt bereits mit `1 + #Affixe`).

### [P3] Slot-Leiter Mittelband undifferenziert (run5-Carryover, unverändert)
`enchantSlotsFor` (shared:1133): poor=common=1, **magic=rare=superRare=2**, epic=3. Drei Rarities teilen denselben Slot-Wert — eine Rare verzaubert sich identisch zur Magic. Feinerer Verlauf gäbe der Rarity-Jagd Enchant-Bedeutung.

### [P3] Auto-Salvage/Vault ohne Spieler-Feedback an der Drop-Stelle
`combat.ts:418` wertet `tryCraftSuffix` nur als `if (res)` aus und zählt `instanceMade` immer als gesammelt (`itemsGathered`), egal ob die Instanz behalten, gevaultet oder zerlegt wurde. Es gibt kein Toast/Log, das „auto-zerlegt" vs „in den Vault" unterscheidet. Stiller Komfort kann sich wie ein Bug anfühlen.
**Fix:** Aus `IntakeResult` (`kept`/`vaulted`/`salvage`) ein kurzes Log/Toast ableiten.

---

## Was fehlt für 9,5?

1. **Den toten Frost-Wächter endlich reparieren [P2]** — echter Bogen + `rune_frost`-Instanz gegen frost-immunen Mob, dazu ein `affix_shock`-Wächter. Erst dann ist die Kampfwirkung der Effekt-Runen *verifiziert* statt nur plausibel. (Der explizit beauftragte Check: weiterhin tot.)
2. **Auto-Salvage durchgängig verlustfrei für gute Items [P2]** — den Overflow-Zweig die Qualitätsprüfung respektieren lassen (Top-Roll → Vault auch bei vollem Inventar). Dann ist „An" wirklich „an und vergessen", ohne dass ein voller Rucksack den besten Drop frisst.
3. **Hinweistext + Toggle ehrlich/sauber machen [P3]** — Text um die Low-Quality-Logik ergänzen UND den Toggle über den Dirty/Re-Render-Pfad setzen.
4. **Salvage-Ökonomie aus dem Platzhalter holen [P3]** — Confirm bei Affix-Items, `salvageGold` an Invest koppeln; nimmt die Reue-Falle raus.
5. **Slot-Leiter staffeln + Drop-Feedback [P3]** — Mittel-Rarities differenzieren und Auto-Salvage/Vault sichtbar machen; das ist die Politur, die „rechnerisch fair" in „fühlt sich gut an" verwandelt.

## Verdict
Run 6 erledigt die zwei run5-P2 dort, wo es zählt: **der Auto-Salvage-Footgun ist mechanisch entschärft** (Overflow ODER Low-Quality, Top-Rolls geschützt, 5 neue Tests) und **Instanz-Overflow geht verlustfrei in den Vault** (20/20). **Kein P0, kein P1.** Gegen 9,5 stehen noch der hartnäckige tote Frost-Test [P2] — der Punkt, den der Auftrag prüfen ließ, ist *unverändert tot* —, eine Restkante am Overflow-Verhalten von „Auto-Salvage An" [P2] und vier Politur-Carryover [P3]. Das System ist jetzt sicher, ehrlich (fast) und spaßig; es fehlt die letzte Ehrlichkeit (Test + Label) und etwas Loop-Politur.
