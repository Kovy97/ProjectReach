# Sweep 2 — 02 · Magie-Kampfstil (tief)

**Fokus:** Magie end-to-end via `SimPlayer` gespielt — Equip-Gate (kein `runecrafting` mehr, nur
`magic_off`), Tragbarkeit der kompletten Tier-Leiter, Mana-System (Depletion → Schwach-Nahkampf → Regen →
Resume), Magie-DPS über 12 Tiers, Cross-Stil-Parität, und die Kernfrage: **ist Magie ein vollwertiger dritter
Stil mit lootbarer/kaufbarer Waffenleiter — oder nur craftbar?**
Methode: temporäres Vitest-Skript mit echtem `SimPlayer` (angelegt, gelaufen, **wieder gelöscht**).

## Verifizierte Fixes — WIRKEN ✅ (nicht als Bug gemeldet)

- **Magie-Waffen ohne `runecrafting`-Equip-Gate** — CONFIRMED. Die **komplette** Leiter (12 Stäbe + 12 Wands)
  ist mit `magic_off` allein tragbar, `runecrafting` **untrainiert** (Level 1). SimPlayer: jeder Tier equipt bei
  `magic_off == req`, ein Tier UNTER der Anforderung ist gesperrt → Gate = rein `magic_off`. Item-Reqs sauber:
  `requirements: { magic_off: 1..99 }` (`content/index.ts:3163-3355`), `meetsRequirements` liest nur `magic_off`
  (`equipment.ts:42-49`). `dim_focus` (Offhand) equipt bei `magic_off 8`, `value` jetzt 30 (`index.ts:3453-3454`).
- **Mana-System (Depletion → Schwach-Nahkampf → Regen)** — CONFIRMED. Bei leerem Pool schlägt der Stab schwach
  zu (`MAGIC_WEAK_FACTOR 0.35`, `combat.ts:762-763`) und wendet **keinen** Spell-Status an (`combat.ts:815-817`);
  Regen läuft pro Tick nach (`combat.ts:933-936`). Gemessen (mithril_staff, pro Tick fixiert): **Cast 72.2 dps
  vs. Weak-Melee 22.6 dps → Weak = 31 % von Cast.** Mana ist bei Leere eine echte, spürbare Strafe.
  Kein Hänger bei `manaRegen`-Boden (degradiert sauber zum Dauer-Weak-Melee) — deckt `magic-loop.test.ts`.
- **Magie-DPS-Leiter steigt monoton** über alle 12 Staff-Tiers (effektiver dps über 60 s vs harmlosen Sandsack,
  `magic_off`+`int` an den Tier gekoppelt):
  ```
  copper 6.3 → iron 22.5 → blacksteel 54.3 → mithril 72.2 → runite 108.6 → titanium 149.9 → godiron 197.7
  ```
  **0 Regressionen**, Top-Tier ≈ 31× Bottom-Tier. Der DoT (burn) skaliert mit (`weaponEffect.magnitude` 1→31).

---

## Findings

### P2 · [balance/content] Magie-Tier-Leiter ist REIN craftbar — 0 Monster-Drops, anders als melee/ranged — CONFIRMED
Die Kernfrage des Briefings („lootbare/kaufbare Waffenleiter, nicht nur craftbar"): **Nein, für die Basis-Leiter
nicht.** Jeder `copper_staff … godiron_staff` / `copper_wand … godiron_wand` taucht als `itemId:` **genau einmal**
auf — ausschließlich in seiner `runecrafting`-Crafting-Aktion (`content/index.ts:8425-8450`). **Kein einziger**
liegt in einer Monster-`loot`-Tabelle oder im Shop.

Zum Vergleich — die **gleichnamige Basis-Leiter der anderen Stile droppt sehr wohl**:
```
iron_sword     Drop 0.05 (cutpurse index.ts:9759) · 0.025 (crypt 10062, 10870)
iron_shortbow  Drop 0.03 (index.ts:10073, 10886)
mithril_longbow Drop 0.04 (index.ts:9911)
```
Ein Fernkampf-/Nahkampf-Main erlebt also das „Upgrade gefunden!"-Loot-Moment für seine Kernwaffen — ein
Magie-Main **nie**; er MUSS `runecrafting` hochziehen und craften. Kaufbar sind je Stil nur die 2 Starter
(magic: `cracked_staff` 18 g, `gnarled_staff` 120 g — `index.ts:10964,10972`; Parität mit rusty/bronze_sword bzw.
cracked/copper_bow) — Shop ist also **fair**, der Bruch liegt bei den **Drops**.

Es gibt zwar **unikale** lootbare Magie-Waffen, aber sie schließen die Lücke nicht:
```
witchroot_wand  magic_off 26  Drop 0.0016 (index.ts:9891, 4616)
wailing_wand    magic_off 28  Drop 0.0016 (index.ts:10640, 5236)
pyre_staff      magic_off 36  Drop 0.00074 (index.ts:10118, 4685)
frosthex_wand   magic_off 68  Drop 0.00039 (index.ts:10050, 5126)
stormcrest_staff magic_off 75 Drop 0.00039 (index.ts:10177, 5028)
sorrow_staff    (mid/high)    Drop 0.00039 (index.ts:10752)
skarn_idol_staff magic_off 99 Drop 0.015 (index.ts:10416, 2506)
```
Zwei Löcher: **(a)** unterhalb `magic_off 26` gibt es **überhaupt keine** lootbare Magie-Waffe — das gesamte
Früh-Magie-Band hat NUR craft/starter-shop; **(b)** die Drop-Chancen (0.0004–0.0016) sind **20–100× seltener**
als die melee/ranged-Tier-Drops (0.03–0.05). **Owner: Content-Dev / Chef (Balance-Domäne).** Optionen: ein paar
Basis-Stäbe/Wands in level-passende Loot-Tabellen streuen (Parität zu iron_sword/iron_shortbow), ODER bewusst
als Design festhalten („Magie = Runecrafting-Ökonomie" analog „Ranged = Fletching-Ökonomie", vgl. 01-ranged.md).

### P3 · [balance/feel] „Mana-Depletion → Schwach-Nahkampf"-Loop ist faktisch nur Frühgame-Textur — SUSPECTED
Weil `magic_off` über den Hybrid `int`/`wis` mitzieht (`character.ts:147-148`), hat ein **mittlerer** Magier
schon genug Pool + Regen, um **dauerhaft** zu casten. Gemessen (`magic_off 40`, sonst Basis, mithril_staff):
`maxMana 115`, **minMana über 60 s = 99.5**, `castManaCost 7` → der Pool fällt **nie** unter die Kosten, es gibt
**keine** Weak-Melee-Phase. Grund: die Cast-Kadenz hängt am fixen `attackIntervalMs` (drain ~konstant), der
`wis`-getriebene Regen (`character.ts:285`) überholt ihn, und der Mana-Schild reserviert ohnehin 1 Cast
(`combat.ts:325-328`). Damit ist der im Briefing betonte Depletion-Loop ab ~L30 im Normalkampf **unsichtbar**.
Das deckt sich mit der bewussten Entglasung der Frühmagie (`character.ts:279`), ist also vermutlich **gewollt** —
nur zur Bestätigung: Soll Mana im Mid/Endgame als Ressource praktisch bedeutungslos sein? **Owner: Chef (Balance).**

### P3 · [balance] Cross-Stil-DPS: ranged am Endgame ~1,85× melee/magic (nur Kontext, Sandsack-Linse) — SUSPECTED
Gleiche Primär-Attr + Offense-Skill = Checkpoint-Level, tier-passende Waffe, 60 s vs harmlosen Sandsack:
```
L 1: magic 6.3   melee 7.9   ranged 4.8   (spread 39 %)
L40: magic 72.2  melee 70.0  ranged 89.2  (spread 22 %)
L99: magic 197.7 melee 201.0 ranged 369.9 (spread 47 %)
```
Magie liegt bei L1/L40 mitten im Feld und ist bei L99 **gleichauf mit Melee** — als dritter Stil klar
konkurrenzfähig. **Ranged** ist der Endgame-Ausreißer (~+85 %). WICHTIGE Linse-Warnung: Der Sandsack hat 0
Rüstung/Regen/Resist → er neutralisiert **genau** Magies Stärke (rüstungs-ignorierender, durch-Regen-tickender
burn-DoT, siehe `ranged-vs-magic.test.ts`) und begünstigt ranged-Krit/Ammo-Stacking. Gegen tanky/Regen-Mobs
schließt Magie real auf. Daher **nur Kontext**, kein Magie-Bug. **Owner: Chef (Balance-Domäne).**

---

## Notiz (kein Magie-Finding — Housekeeping / Gate-Status)
`pnpm typecheck` ist **aktuell rot**, aber ausschließlich wegen zweier **temporärer Sweep-Skripte eines parallel
laufenden Agenten**: `packages/engine/src/midgame-dump.test.ts` (TS2367, TS2783×2) und
`packages/engine/src/midgame-sweep.test.ts` (TS2532×6). **Produktions-Code + alle Magie-Checks sind sauber**
(Client-Build grün, 488 Tests grün, mein eigenes Sweep-Skript ist gelöscht). Der jeweilige Agent muss seine
Temp-Files noch löschen. **Owner: Midgame-Sweep-Agent.**

---

## Kurz-Zusammenfassung
- **P0:** 0 · **P1:** 0 · **P2:** 1 · **P3:** 2
- Alle drei explizit gefixten Magie-Punkte (Equip ohne runecrafting-Gate, Mana-Loop, DPS-Leiter)
  **verifiziert & wirksam** — keine Regressionen. Magie ist mechanisch ein vollwertiger dritter Stil.
- Gates: **typecheck** prod-clean (transient rot durch fremde Temp-Tests) · **tests 488 passed** ·
  **client build ok** · **sim** grün (9 akzeptierte Bronze-Baseline-Notes lt. Briefing).

**Top-3:**
1. **P2** Magie-Basis-Tier-Leiter ist 100 % craftbar (0 Drops), während iron_sword/iron_shortbow/mithril_longbow
   droppen → Magie-Main hat kein Loot-Upgrade-Erlebnis, unter `magic_off 26` gar keine lootbare Waffe.
   `content/index.ts:8425-8450` vs. `:9759/10062/10073/9911`.
2. **P3** Mana-Depletion-Loop verschwindet ab ~L30 (minMana 99.5/115, nie unter Cost 7) — Mana als Ressource
   bindet nur früh; Chef bestätigen ob gewollt. `character.ts:147-148,279,285`.
3. **P3** (Kontext) Endgame-Cross-DPS: ranged ~1,85× magic/melee am Sandsack; Magie ≈ melee, Ranged Ausreißer.

**Empfehlung:** **ship** für den Magie-Stil selbst (Fixes wirken, Stil ist vollwertig & konkurrenzfähig). Die
Loot-Leiter-Lücke (P2) ist eine **Chef-/Content-Balance-Entscheidung** (streuen vs. „Runecrafting-Ökonomie"),
kein Blocker. Housekeeping: fremde Temp-Test-Files entfernen, damit `pnpm typecheck` wieder grün ist.
