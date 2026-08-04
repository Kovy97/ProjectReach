# QA-Sweep 2026-07-01 — Fokus: Crafting & Skilling-Progression

**Tester:** Kontrolleur (QA). **Methode:** echte Skilling-/Craft-Sitzungen über `SimPlayer`
(`packages/engine/src/sim-player.ts`) + programmatischer Katalog-Audit, headless, seeded RNG.
Temporäres Test-Skript `packages/engine/src/zz-crafting-sweep.test.ts` angelegt, ausgeführt,
wieder gelöscht. Zusätzlich die volle Suite gelesen (Balance-Sim-Block).

## Verifikations-Gates
- ✅ `pnpm typecheck` — 5/5 Pakete grün.
- ✅ `pnpm test` — 79 Dateien / **478 Tests grün** (engine), 58 grün (persistence).
- ✅ `pnpm --filter @hearthforge/client build` — grün (5.9 s).
- ⚠️ Balance-Sim: `AUFFÄLLIGKEITEN — Bronze-Baseline (9)`, aber `ECHTE WALLS — auch geared
  unbesiegbar (0)`. Die (9) sind **informativ** (nur `console.log`, keine Assertion; die Sim
  asserted nur Nichtleere/Endlichkeit, `sim.test.ts:97-99`). 2 davon betreffen Crafting/Skilling
  (Thieving, siehe P3-03), 7 sind Kampf-Stat-Walls (Owner Combat/Content-Dev, außer Fokus).
  **Kein Skilling-Action mit 0 XP/h.**

## Gesamturteil
Crafting- & Skilling-Progression ist in der PRAXIS solide. Die kürzlich groß angelegten
1-XP-/Tote-Tier-Fixes sind **bestätigt**: alle 13 Nicht-Kampf-Skills liefern über ALLE Tiers
positive XP/h (Ø 18,6k–54,4k XP/h je Skill), **kein** Dead-Tier, **kein** 0-XP/h-Fall. **Kein
einziger Crafting-Input ist unbeschaffbar** — jede Rezept-Kette ist über Aktion/Shop/Mob-Loot/
Dungeon/Farm-Ernte gedeckt (0 gebrochene Ketten). **Runenkunst ist aus dem Stand startbar
(bestätigt).** Zwei Balance-/Konsistenz-Themen (P2) und ein Feel-Hinweis (P3). **Empfehlung:
ship — die zwei P2 sind Balance-Feinschliff, kein Blocker.**

---

## Verifiziert (funktioniert in der Praxis)

| Bereich | Evidence (Sim/Katalog, seed-fest) |
|---|---|
| Runenkunst aus dem Stand | Frischer Held: `dim_essence` per Shop 8 g (`content:11021`) **und** L1-Forage `forage_dim_essence` (`content:6777`, kein Req). `craft_force_rune` (L1, 2×dim_essence, `content:8305`) startet sofort → in 10 Sim-Min **runecrafting L1→L2, 186 force_rune**. Auch `enchant_dim_focus` (L1) & `craft_copper_staff` (L1) offen. |
| Keine toten Tiers | Alle 13 Skills: XP/h steigt monoton pro gewählter Best-Aktion je Tier (z.B. Smithing 2,8k→70k, Runecrafting 2,4k→304k, Fletching 1,4k→203k, Jewelcrafting 2,7k→110k). |
| Keine 1-XP-Falle mehr | Rest-„1-XP"-Aktionen (`cook_shrimp`, `fletch_shafts`, `fletch_bowstring`, `fence_coinpurse`, `brew_minor_heal`, `cook_ashroot_broth`) sind kurze L1/Zwischen-Aktionen mit **gesunden 1.200–2.400 XP/h** — kein Dead-Case. |
| Keine gebrochenen Ketten | Katalog-Audit über ALLE Quellen (action.loot, shop, monster.loot, dungeon.loot, crops.yieldItem, quest-rewards): **0 unbeschaffbare & 0 unbekannte Inputs**. (Die essences/hides/raw-meats sind Mob-Loot, `frost/ember/storm/void_essence` bestätigt beziehbar.) |
| Material-Fluss beim Craften | `SimPlayer`: Craft-Aktion zieht Inputs korrekt aus Inventar **und Bank**, verbraucht sie, erzeugt Output, füttert `itemsCrafted`. |
| Farming | 0 Einträge in `content.actions` ist **korrekt** — Farming läuft passiv über `content.crops`/Plots (nicht über den `activeAction`-Slot). Seeds aus Foraging beziehbar. |

---

## Findings

### P2-01 — [Balance/Progression] `ember_essence` ist Single-Source und blockiert die ganze „Feuer"-Linie der Runenkunst
**Repro (Katalog-Trace über alle Quellen):** `ember_essence` (`content:446`) hat **genau eine**
Bezugsquelle: Mob `goblin_warlock` (Lv30, Drop-Chance **15 %**, `content:9544`/`9549`). Kein
Forage, kein Shop, kein zweiter Mob.
**Erwartet:** Analog zu den Geschwister-Essenzen — `frost_essence` (6+ Mobs), `storm_essence`
(6+ Mobs), `void_essence` (mehrere Mobs **+** `forage_void_essence`) — sollte `ember_essence`
mehrere Quellen haben.
**Tatsächlich:** `ember_essence` ist der Ausreißer mit nur **einer** Quelle. Es speist die
komplette Feuer-Progression der Runenkunst: `craft_fire_rune` (L15) → und darüber
`craft_steel_staff` (L20), `craft_blacksteel_staff` (L30), `craft_glyph_of_might` (L20),
`craft_glyph_of_precision` (L25) sowie Leatherworking-Ember-Robe (L30-32). **Verschärfend:** die
Balance-Sim flaggt **genau diesen** `goblin_warlock` (Lv30) als „unbesiegbar (Stat-Wall ohne
Regen)" für einen Bronze-Baseline-Helden (Test-Output Zeile 1113). D. h. ein Mid-Game-Runenschmied
braucht ein Material, dessen einzige Quelle ein für sein Level zu tanky Monster ist.
**Evidence:** `content:446` (Item), `content:9544-9552` (einziger Dropper), Balance-Sim
`AUFFÄLLIGKEITEN`-Block. Gegenprobe frost/storm/void: mehrere Quellen im selben Trace.
**Owner:** content-dev — `ember_essence` auf 2–3 Quellen verteilen (weiterer Mid-Level-Mob im
Feuer-Thema **oder** ein `forage_ember_essence` analog `forage_void_essence` **oder** Shop-Eintrag),
symmetrisch zu frost/storm/void. (Der `goblin_warlock`-Stat-Wall selbst ist ein separates
Combat-Finding, Owner Combat-Dev.)

### P2-02 — [Konsistenz/Balance] Magie ist der einzige Stil ohne Nicht-Craft-Waffenleiter (bestätigt „bekannt offen")
**Vom Chef explizit angefragt — bestätigt.** Ergänzt die bereits von `02-combat-ranged.md` P2-01
gefilmte Sicht um den CRAFTING-Blickwinkel.
**Befund (Katalog):** **57 von 62** Magie-Waffen verlangen zusätzlich zu `magic_off` auch
`runecrafting` zum Ausrüsten. Zum Vergleich: **0/41** Bögen verlangen `fletching`, **0/158**
Nahkampfwaffen verlangen `smithing`. Melee/Ranged gaten also NUR ihren Kampf-Skill; Magie nicht.
**Crafting-Nuance (neu):** Für den Selbst-Craftenden ist das Equip-Gate *redundant-aber-konsistent*
(die Craft-Aktion `craft_steel_staff` L20 erzeugt einen `steel_staff` mit rc20 — man hat rc20
zwangsläufig). Das eigentliche Paritäts-Problem liegt in der **Beschaffung**: die 5 rune-freien
Magie-Waffen sind `cracked_staff`/`gnarled_staff` (Shop, L1), `hedgewitch_twig` (Boar-Drop, L3) und
2 Endgame-Drops (`magic_off 99`). **Zwischen L3 und L99 existiert KEINE lootbare/kaufbare
Magie-Waffe, die man mit nur `magic_off` tragen kann** — der Magier MUSS Runenkunst hochziehen, um
überhaupt eine Waffenprogression zu haben. Ein reiner Melee-/Ranged-Kämpfer kann seine komplette
Leiter looten/kaufen, ohne je Smithing/Fletching zu leveln.
**Evidence:** Magie-Waffen `content:3162 ff.` (getierte Stäbe mit `magic_off + runecrafting`),
Gegenprobe Bögen (nur `ranged`) / Melee (nur `attack`); Craft-Aktionen `content:8419-8455`.
**Owner:** content-dev + CEO/Chef-Design-Freigabe. Zwei saubere Optionen: (a) `runecrafting` aus den
Magie-Waffen-Requirements streichen (nur `magic_off` gaten, exakt wie #10 für Bögen) und Runenkunst
als reines *Craft*-Gate belassen; **oder** (b) eine lootbare/kaufbare Magie-Waffenleiter ergänzen,
die nur `magic_off` verlangt. Optional logic-dev: Guard-Test „Magie-Waffen gaten nur Kampf-Skills"
(Pendant zum Bogen-Guard in `ammo-quiver.test.ts`).

### P3-03 — [Feel/Klarheit, kein Bug] Zwei Thieving-Aktionen „keine Ausgabe-Items" in der Sim
**Befund:** Die Balance-Sim listet `pickpocket_city_guard` (L45) und `crack_strongbox` (L55) unter
`AUFFÄLLIGKEITEN` mit „keine Ausgabe-Items". **Das ist erwartbar:** beide sind Gold-/XP-Aktionen —
`pickpocket_city_guard` liefert **3.085 XP/h, 27.210 g/h**, `crack_strongbox` **6.375 XP/h,
46.200 g/h**; ihre Item-Drops (`guard_insignia` 12 %, `smugglers_key` 6 % bzw. `cut_gemstone` 10 %,
`rough_ruby` 8 %) sind seltene Boni, die im Messfenster einfach nicht fielen. **Kein Dead-Action,
kein 0-XP/h.**
**Owner:** niemand zwingend — optional content-dev (kleiner garantierter Item-Drop, damit sie sich
nicht „leer" anfühlen) oder UI-Dev (Tooltip „primär Gold/XP"). Rein kosmetisch.

---

## Nicht reproduziert / sauber
- **Alle 13 Skilling-/Craft-Skills** in der Sim mit positivem, mit Level skalierendem XP/h; keine
  Aktion bei 0 XP/h; keine tote Tier-Lücke (Best-je-Tier steigt monoton).
- **Rezept-Integrität:** kein unbekanntes Item als Input/Output; jeder Input ist irgendwo
  beziehbar (0 gebrochene Ketten über alle 13 Craft-Skills + 6 Gather-Skills).
- **Negative g/h bei Pfeilen/Trank-Aktionen** (z.B. `fletch_godiron_arrows` −27k g/h, Herblore
  Ø 3,3k g/h) ist **kein Bug**: Pfeile = Munition (verschossen, nicht verkauft), Tränke =
  Consumables. XP/h bleibt positiv und sauber skalierend.
- `dim_essence` doppelt beziehbar (Shop 8 g + L1-Forage) → Runenkunst-Einstieg reibungslos.
- Farming korrekt entkoppelt (Plots/`crops`, nicht `activeAction`); Seeds aus Foraging gedeckt.

## Hinweis zu den restlichen 7 Sim-`AUFFÄLLIGKEITEN`
Außerhalb des Crafting-Fokus (Combat-Stat-Walls: `goblin_warlock` Lv30, `bull_boss` Lv15,
`dust_vulture`, `mire_crawler`, `pitch_beetle`, `bone_stalker`, `ashfield_wraith`). Owner
Combat-/Content-Dev. **Cross-Ref:** der `goblin_warlock`-Wall verschärft P2-01 direkt (einzige
`ember_essence`-Quelle).
