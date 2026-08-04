# Sweep 2 — Bericht 03: Melee-Kampfstil (tief)

**Fokus:** Waffentypen (dagger…maul), Rüstungsstufen, Melee-DPS/Survivability über Tiers,
Waffen-Equip-Gates, Schild/Offhand, innater Lifesteal.
**Methode:** `SimPlayer` (echte Engine, headless, deterministisch) + direkte `computeStats`-Inspektion.
Temporäre Test-Skripte angelegt, ausgeführt, wieder gelöscht. **Nur berichtet, kein Spiel-Code geändert.**

---

## Kurz-Zusammenfassung

- **P2 (1×):** Zweihandwaffen + langsame Waffen sind im gegearten Spiel von „1H-schnell + Schild"
  **doppelt dominiert** (weniger DPS **und** weniger Defense/HP). Der Maul („Max Damage") ist die
  schlechteste Melee-Waffe im Endgame.
- **P3 (1×):** Melee-Survivability extrem hoch — 0 Tode über ALLE Tiers, sogar OHNE Food. Food/Auto-Eat
  für Melee faktisch bedeutungslos (Chef-Balance-Domäne, teils gewollte Tank-Identität).
- **Validierungen bestanden:** Equip-Gates nur `attack` (kein Smithing) ✓ · innater Lifesteal wirkt ✓ ·
  Schild/Offhand-Mechanik korrekt ✓ · Rüstungs-Tiers skalieren sauber ✓.

Top-3: (1) 2H-Waffen mechanisch tot, (2) Melee unsterblich ohne Food, (3) alle Kern-Mechaniken korrekt verdrahtet.

---

## P2 [balance] Zweihand- & Langsam-Waffen sind von „1H-schnell + Schild" doppelt dominiert — `confirmed`

**Repro (headless, deterministisch):**
1. Godiron-Held, `attack/power/defence/vitality = 99`, volle Godiron-Plattenrüstung.
2. 20 Sim-Min Dauerkampf gegen `reef_drowned` (L128, hp 692, def 58, dmg 114), mit Food.
3. Nur die Mainhand/Offhand variiert; Kill-Rate + Defense/HP gemessen.

**Erwartet:** Ein Zweihänder (kein Schild-Slot, „Raw Damage / Max Damage" laut `WEAPON_TYPE_SPECIALTY`)
sollte den 1H+Schild-Build in Offensive schlagen und so den Verlust der Schild-Defense aufwiegen —
ein echter Trade-off (Burst vs. Tankiness).

**Tatsächlich:** 1H-schnell + Schild gewinnt auf BEIDEN Achsen. Reale Kills/h (Evidence):

| Build | DPS≈ | def | hp | **kills/h** | deaths |
|---|---|---|---|---|---|
| dagger + kiteshield | 317 | **572** | **2336** | **816** | 0 |
| scimitar + kiteshield | 306 | **572** | **2336** | 720 | 0 |
| greatsword (2H) | 287 | 504 | 2211 | 642 | 0 |
| sword + towershield | 250 | 613 | 2333 | 636 | 0 |
| greataxe (2H) | 291 | 504 | 2211 | 627 | 0 |
| **maul (2H, „Max Damage")** | 269 | 504 | 2211 | **579** | 0 |

- **dagger+Schild schlägt den besten 2H (greatsword) um +27 % kills/h UND hat +68 def / +125 hp.**
- Der **Maul** — laut Tooltip „Zweihändig · Max. Schaden" — ist die **schlechteste** Melee-Waffe
  überhaupt (−29 % kills/h vs. dagger+Schild) und verzichtet zusätzlich auf den Schild.
- Keine der vier 2H-Klassen (spear/greataxe/greatsword/maul) hat im gegearten Endgame eine Nische.

**Root Cause (Mechanik, `packages/engine/src/character.ts:238`):**
`meleeDamage = (1 + str*1.5 + power*0.8 + eq.meleeDamage) * dmgMult`, pro Treffer aufgelöst und
durch `attackIntervalMs` geteilt (DPS = Schaden/Treffer ÷ Intervall). Jeder **flache** Bonus
(Rüstungs-`str`-Modifier, `eq.meleeDamage`) addiert allen Waffen denselben ABSOLUTEN Schaden pro
Treffer — aber schnelle (niedriges Intervall) Waffen setzen ihn in mehr DPS um. Godiron-Vollrüstung
liefert massig flache `str`-Mods (platebody `str:18` etc.), also überholen schnelle 1H-Waffen die
2H-Waffen, sobald man sich einrüstet. Da 1H zusätzlich den Offhand-Schild nutzen kann, bleibt für 2H
kein kompensierender Vorteil. Verschärfend: die Accuracy-Boni skalieren mit der Geschwindigkeit
(godiron dagger acc-Bonus **251** vs. maul **132**) — die ohnehin überlegenen schnellen Waffen treffen
auch noch öfter.

**Kontrast — die ROHEN Waffenwerte sind isoliert balanciert:** Ohne Rüstung/Gear-Mods liegen alle
Godiron-Typen binnen ~3 % (greatsword 221 ≈ dagger 221 ≈ scimitar 220 ≈ maul 214). Das Problem
entsteht ERST durch die Wechselwirkung mit flachen Gear-Boni — d.h. es ist im echten Spielzustand
(man trägt immer Rüstung) real, in der Item-Tabelle allein aber unsichtbar.

**Owner:** balance-designer / Chef (Balance-Domäne). Lösungsrichtungen (nur Vorschlag, nicht umgesetzt):
2H-Waffen ~15–20 % mehr Roh-`meleeDamage` geben ODER 2H einen Damage-`multiplier` statt flachem Bonus,
ODER schnellen 1H-Waffen die Accuracy-Boni kürzen. Betrifft ~48 Items (4 Typen × 12 Tiers).

---

## P3 [balance] Melee stirbt nie — Food/Auto-Eat für Melee bedeutungslos — `suspected` (Chef-Domäne)

**Repro:** Voll-Melee-Held (sword + kiteshield + volle Plattenrüstung) je Tier gegen ein
tier-passendes Monster, 30 Sim-Min, **ohne** Food.
**Tatsächlich:** **0 Tode über alle 12 Tiers.** Selbst im Endgame-Test MIT Food (reef_drowned, 20 Min)
verbraucht Melee praktisch kein Essen (`foodLeft 4971/5000`). Die Kombi aus innatem Lifesteal (8 %),
hoher `def`-Mitigation (Cap 80 %) und hoher `maxHp` macht den gegearten Nahkämpfer quasi unsterblich →
die Gold-Senke Auto-Eat-Upgrade und der ganze Food-Loop sind für Melee irrelevant.

**Einordnung:** Teils gewollte Tank-Identität (Memory: „Melee = einziger Stil mit Selbstheilung");
der Lifesteal wurde bereits 0.12→0.08 genau deswegen gesenkt. Richtung ist ENTGEGENGESETZT zur
akzeptierten „7 zu-tanky Mid-Mobs"-Note. Rein Chef-Balance — **nur gemeldet, nicht bewertet als Bug.**

---

## Validierungen (bestanden — als „gefixt/korrekt verdrahtet" bestätigt)

- **Equip-Gates nur Kampf-Attribut (kein Smithing):** Alle 158 Melee-Waffen gaten ausschließlich auf
  `attack` (0 Non-Attack-Gates). Skaliert sauber copper `attack:1` → godiron `attack:99`. Smithing-Level
  gatet nur das CRAFTEN (`forge_*`-Rezepte), nie das Ausrüsten. ✓
- **Innater Melee-Lifesteal wirkt:** `MELEE_LIFESTEAL=0.08` (`shared/src/index.ts:181`), pro Treffer
  gedeckelt auf `min(5%·maxHp, 12)`. Sim (steel_sword, goblin): 22 Heil-Ticks, `maxJump 11` genau am
  Cap `12`. Kein toter „defined-but-never-applied"-Wert — combat.ts:792–801 wendet ihn an. ✓
- **Schild/Offhand-Mechanik korrekt:** Zweihandwaffe verdrängt den Offhand-Schild (`equipment.offhand`
  → `null`), 1H+Schild trägt beide; Schild-`defense`/`maxHp`/`evasion` fließen in `computeStats` ein
  (kiteshield def+4/hp+7/eva+2, towershield def+6/hp+7/interval+100). ✓
- **Rüstungs-Tiers skalieren monoton:** platebody def 8→136, hp 20→340, `str`-Mod 1→18, alle nur auf
  `defence` gegatet. Kein Sprung/Regression. ✓
- **Waffentyp-DPS-Reihung plausibel früh:** copper-Spread nur +35 % (dagger 34 vs maul 25), verengt
  sich über die Tiers (mithril +22 %, godiron roh +3 %) — Grunddesign ok; das Problem ist die
  Gear-Wechselwirkung (siehe P2).

## Nebenbeobachtung (kein Bug)

- `weaponType: "axe"` ist auf jedem Tier die schwächste 1H-DPS (Interval-Malus +150 + Holzfäll-Utility,
  kein Offensiv-Ausgleich). Passt zum Tooltip „Vielseitig · Holzfällen" (bewusster Trade-off), daher
  nur notiert.

---

## Verdict

Melee-Kern ist **korrekt verdrahtet** (Gates, Lifesteal, Schild, Rüstung — alle live und wirksam, keine
toten Felder). Ein **echtes, gut belegtes Balance-Problem**: Zweihand-/Langsam-Waffen (~48 Items) sind im
gegearten Spiel mechanisch tot, weil 1H-schnell + Schild sie auf Offense UND Defense schlägt — untergräbt
die Waffenvielfalt eines Sammel-Idle-RPGs. **Empfehlung: an Chef/balance-designer melden (P2), Rest ship.**
