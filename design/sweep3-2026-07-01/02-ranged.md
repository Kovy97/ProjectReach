# Sweep 3 — 02 Ranged-Jäger (Stil-Parität Fernkampf)

**Persona:** Reiner Ranged-Jäger. **Ziel:** Kampf-Level 30 nur mit Bogen erreichen (via `SimPlayer`).
**Fokus:** Stil-Parität verifizieren — Ranged-DPS vs. Melee (früh+mittig), Pfeil-Ranged-Reqs, Munitions-Management (Köcher/Nachschub), Kills/h.
**Methode:** Headless `SimPlayer`-Skript (`packages/engine/src/*.test.ts`, angelegt → gemessen → gelöscht). Echte Engine-Funktionen (createGame/equipItem/startCombat/fightFor/advanceTime). Deterministisch (seeded). Guard-Tests (styles/ranged/ranged-vs-magic/ammo-quiver/style-xp-parity/ranged-xp) laufen **36/36 grün**.

## ZIEL ERREICHT — ✅ ja
Reiner Ranged-Jäger erreicht **CL30 in 1,67 Sim-h** (511 Kills, **0 Tode**, Ranged L34). Kein Wall, keine Munitions-Sackgasse. Melee-Referenz identischer Grind: CL30 in 2,83 Sim-h (889 Kills). Ranged war **schneller** am Ziel.

---

## HEADLINE: Stil-Parität ist da (Balance-Pass wirkt) — confirmed
Matched-Tier-DPS (gleiche Skill-Level = gleiches Kampf-Niveau, gleicher Waffen-Tier, **keine Rüstung** → isoliert reine Waffen-/Stil-DPS), 1 Sim-Stunde je Setup gegen einen Mob des jeweiligen Levels:

| CL | Mob | Melee k/h | Shortbow k/h | Longbow k/h | short:melee | long:melee |
|----|-----|-----------|--------------|-------------|-------------|------------|
| 5  | cow             | 341 | 392 | 367 | **1.15** | 1.08 |
| 10 | boar            | 246 | 271 | 260 | **1.10** | 1.06 |
| 15 | goblin          | 380 | 426 | 399 | **1.12** | 1.05 |
| 20 | goblin_spearman | 276 | 316 | 293 | **1.14** | 1.06 |
| 30 | ash_rat         | 336 | 350 | 343 | **1.04** | 1.02 |

**Ergebnis:** Ranged liegt jetzt auf **jedem** Tier auf Melee-Niveau — sogar leicht darüber (Shortbow +4…+15 %, Longbow +2…+8 %). Das alte „Melee +40–60 % im Midgame" ist **weg**. Die Waffenschaden-Anhebung (steel_longbow 12→25 etc.) trifft genau ins Ziel. Shortbow > Longbow im DPS (Tempo −150 aIMs + Krit schlägt den Longbow-Direktschaden gegen niedrige Rüstung) — das ist konsistent gewollt (Longbow = Krit-Damage/Burst-Profil).

## Pfeil-Ranged-Reqs greifen — confirmed
- `steel_arrow` (req ranged 20): Equip @ranged **19 → abgelehnt** („Skill-Anforderung nicht erfüllt"), @ranged **20 → ok** (Köcher gefüllt). Ammo-Gate `meetsRequirements` zieht.
- Jeder Bogen-Tier verlangt sein Ranged-Level (copper_shortbow r1 … godiron r99), Pfeil-Tier = Bogen-Tier (iron_arrow r10 == iron bows r10 …). Bögen verlangen **keinen** Fletching/Verarbeitungs-Skill (nur `ranged`) — Guard `ammo-quiver.test.ts` hält.

## Munitions-Management (Köcher) — confirmed
- Kampf verbraucht aus dem **Köcher** (`ammoCount`), nicht aus dem Inventar. Falsche/leere Munition feuert **nicht** scharf (RANGED_WEAK_FACTOR 0.4).
- Köcher leerläuft → Kampf **stoppt sauber**: `combat.monsterId=null`, `combat.stopReason="outOfAmmo"` (40 Pfeile → 0, dann Stopp, kein lautloser Notschlag im AFK). Nachfüllen (give+equip) → Köcher voll, Kampf sofort wieder aufnehmbar.
- Stances: precise (default) 316 k/h vs. **fast 410 k/h** @CL20 (steel_shortbow vs goblin_spearman) — die Fast-Stance ist gegen rüstungsarme Mobs stark (schnellere Schüsse schlagen den kleinen Accuracy-Malus).

---

## FINDINGS

### [P3][balance] Ranged klettert schneller aufs Kampf-Niveau als Melee (mildes Ranged-Lean) — confirmed
- **Repro:** Gleicher Grind-Loop, gleicher Seed, Tier-Waffen an denselben Schwellen, `pickMob(≤CL)`, fightFor bis CL30.
- **Erwartet:** Beide Stile ~gleiche Zeit/Kills bis CL30 (DPS ist ja auf Parität).
- **Tatsächlich:** Ranged CL30 in **511 Kills / 1,67 h**, Melee in **889 Kills / 2,83 h** → Ranged braucht nur **~57 % der Kills** und **~59 % der Zeit**. Kills/h sind fast gleich (Ranged 307, Melee 314) — der Unterschied ist reine **Kampf-Level-XP pro Kill**.
- **Ursache (2 addierte Design-Effekte, beide gewollt, Summe evtl. zu stark):** (1) `RANGED_XP_FACTOR = 1.2` (combat.ts:365) → +20 % Offense-XP. (2) `combatLevel`-Formel (dungeon.ts:19-24): `rangedOffense = lvl("ranged")` (ein Skill) vs. `meleeOffense = (attack+power)/2` (zwei Skills, auf superlinearer XP-Kurve niedriger). Ein Single-Skill-Ranged wandelt jede XP direkt in Kampf-Niveau; Melee muss dieselbe XP auf zwei Skills verteilen.
- **Bewertung:** Bei GLEICHEM Kampf-Niveau ist die DPS auf Parität (s.o.) — es ist also kein Power-Wall, nur schnellere Progression. Da der Chef Ranged bewusst von „−40 % DPS" hochgezogen hat, ist der Pendel nun leicht auf Ranged (schneller + ~10 % mehr DPS default). Nicht dringend, aber im Blick behalten.
- **Zahlen-Empfehlung (falls anfassen):** `RANGED_XP_FACTOR` 1.2 → **1.1** (näher an Melee-Kills/CL, DPS-Parität bleibt unberührt). MAGIC analog prüfen (`MAGIC_XP_FACTOR` teilt sich auf magic_off/magic_def, also weniger betroffen). Owner: **Combat-Dev** (Konstante) — Chef-Freigabe, da Balance offen.

### [P3][balance] Fast-Stance-Ranged zieht gegen rüstungsarme Mobs deutlich an Melee vorbei — suspected
- **Repro:** CL20 steel_shortbow, `rangedStance="fast"`, vs goblin_spearman, 1 Sim-h.
- **Erwartet/Tatsächlich:** precise 316 k/h → **fast 410 k/h** = **1,49× Melee** (276). Der Accuracy-Malus (accMult 0.9) kostet gegen niedrige Evasion fast nichts, der Speed-Gewinn (speedMult 0.85) schlägt voll durch. Melee hat kein „schneller schießen"-Pendant (nur power=mehr Schaden).
- **Bewertung:** Gegen tanky/high-eva-Mobs kippt das wieder (Miss-Rate steigt). Nur ein Randfall-Lean; erwähnt fürs Gesamtbild, keine Aktion nötig, solange der Default (precise) auf Parität bleibt. Owner: **Combat-Dev**/**Balance** (nur beobachten).

### [P3][feel] Ranged ist reine Glass-Cannon ohne Rüstung — by design, bestätigt
- Im ungerüsteten Matched-Tier-Test @CL30 (ash_rat, dmg 31): Melee **0 Tode**, Ranged Shortbow/Longbow je **1 Tod** über 1 Sim-h. Erwartet — Fernkampf hat keinen Stil-Evasion-Bonus mehr (bewusst, `styles.test.ts`), Melee trägt seine Tank-Identität über Gear. Kein Bug; nur die Bestätigung, dass die Glass-Cannon-Kehrseite existiert (mit realem Leder-/Rüst-Gear im echten Spiel entschärft).

---

## Top 3
1. **✅ Stil-Parität erreicht** — Ranged-DPS ist jetzt auf jedem Tier (früh CL5 bis mittig CL30) 1.02–1.15× Melee. Der Midgame-Rückstand ist weg. Balance-Pass **wirkt**.
2. **✅ Pfeil-Reqs + Köcher-Management solide** — Ammo-Gate (steel_arrow r20) greift, Köcher verbraucht/stoppt (`outOfAmmo`)/füllt sauber, kein lautloser Notschlag.
3. **[P3] Mildes Ranged-Lean in der Progression** — Ranged erreicht CL30 mit ~57 % der Kills/Zeit von Melee (RANGED_XP_FACTOR 1.2 + Single-Skill-combatLevel). DPS-neutral, nur schnelleres Leveln; ggf. XP-Faktor 1.2→1.1.

*Balance-Änderungen wurden VERIFIZIERT, kein Spiel-Code angefasst. Test-Harness angelegt→gemessen→gelöscht.*
