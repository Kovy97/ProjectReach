# Sweep 3 — 06 Slayer (Tower-Etagen & Tasks), 2026-07-01

**Spieler/Rolle:** Kontrolleur (QA) als ziel-gerichteter Sim-Spieler.
**Ziel:** Slayer-Aufgaben inkl. Tower-Etagen via `SimPlayer` grinden. Speziell verifizieren:
1. Sind die zurückgetierten Tower-Skelette (`tower_skeleton_warrior` L36, `tower_skeleton_archer` L38)
   auf ihrem Freischalt-Niveau mit **floor-passendem** Gear (nicht Bronze-Baseline) über alle 3 Stile besiegbar?
2. Sind **alle** Tower-Etagen-Tasks killbar?
3. Slayer-XP / Belohnung.

**Methode:** Temporäres Vitest-Skript über `SimPlayer` (echte Engine: `startCombat`/`fightFor`/`advance`,
`equipItem`, `assignTask`/`recordKillForSlayer`). Auto-Gearing: bestes ausrüstbares Best-in-Slot pro
Stil/Level (via echtem `equip()` verifiziert), Metallrüstung, Floor-passende Nahrung. Kills auf 1h normiert,
Tode über `state.stats.deaths`-Delta. Skript nach dem Lauf gelöscht. Seed-deterministisch, headless.

---

## VERDICT (Ziel erreicht: JA)

- ✅ **Retier bestätigt (nicht als Bug melden):** Beide Skelette sind mit floor-passendem On-Level-Gear in
  **allen 3 Stilen** komfortabel besiegbar, **0 Tode**. Stil-Parität ist eng (~10–15 % Spread). Selbst
  12–14 Level **unter** Monsterlevel (aber gerüstet) noch sauber killbar (0 Tode).
- ✅ **Alle 27 Tower-Monster** (Etage 1–5, inkl. regen/enrage & aller Slayer-Anforderungs-Mobs) mit
  On-Level-Gear killbar, **0 Tode**, 3,5–7,7 s/Kill.
- ✅ **Slayer-XP/Belohnung** funktioniert end-to-end: Pro-Kill-XP `round(xp·0,5)`, Abschluss-Bonus
  `round(xp·0,5·N)`, `pointReward = basePoints (5)`; Hard-Block/Gate sauber.
- ⚠️ **Ein echter Neben-Bug gefunden (nicht Tower-spezifisch, beim Ranged-Verifizieren aufgetaucht):**
  9 Bögen mit **unfütterbarer Munition** (ammoType-Level > Bogen-Level) → Bogen ausrüstbar, aber nie
  benutzbar. Betrifft u. a. `spectral_hunter_bow` (das „beste" Ranged-Drop im L36-Band).

---

## A) Zurückgetierte Tower-Skelette — 3 Stile, floor-passendes Gear

`tower_skeleton_warrior` L36 (hp275, dmg48, acc88, def22, ev14, xp68) · `tower_skeleton_archer` L38
(hp260, dmg54, acc94, def14, ev26, xp78). Kills/h @ 0 Tode:

| Setup | Waffe | warrior L36 | archer L38 |
| --- | --- | --- | --- |
| melee on-level | blacksteel_maul | **586** | **608** |
| ranged on-level | blacksteel_longbow | **522** | **606** |
| magic on-level | pyre_staff | **574** | **666** |
| melee under-level 30 | blacksteel_maul | 585 | 564 |
| ranged under-level 30 | blacksteel_longbow | 495 | 495 |
| magic under-level 30 | blacksteel_staff | 492 | 513 |
| melee under-level 24 | steel_maul | 528 | 504 |
| ranged under-level 24 | steel_longbow | 465 | 453 |
| magic under-level 24 | steel_staff | 456 | 468 |
| **bronze-baseline (combat L1)** | bronze_sword | 30 (13 Tode) | 12 (25 Tode) |

**Befund:** Mit floor-passendem Gear (Stahl→Schwarzstahl-Band) sind beide Skelette trivial und
todesfrei in **allen** Stilen — sogar deutlich unter Monsterlevel. Der **Bronze-Baseline** (combat L1,
Bronze) ist der *einzige* Fall, der scheitert — genau die im Briefing als „bekannt & akzeptiert"
markierte Worst-Case-Anomalie. **Das Retier (balance-pass2) sitzt: bestätigt, kein Bug.** Stil-Parität
in der Praxis eng (Magie minimal vorne bei L38, Nahkampf minimal vorne bei niedrigem Level).

## B) Alle Tower-Etagen killbar (melee, on-level geared, 0 Tode durchweg)

| Floor | Monster (Level) | kills/h | s/Kill |
| --- | --- | --- | --- |
| 1 | rot_rat 3 / plague_grub 7 / shambling_carcass 12(req) / tower_goblin 15 / hollow_marrow 16(req) / tower_goblin_rogue 19 | 640–1024 | 3,5–5,6 |
| 2 | gaze_basilisk 22(req) / wailing_shade 28(req) / bone_stalker 34 / **skeleton_warrior 36** / ashfield_wraith 38 / **skeleton_archer 38** | 560–680 | 5,3–6,4 |
| 3 | slag_abomination 44 / cinder_wretch 48(regen) / ember_elemental 50 / forge_demon 54(req) / iron_revenant 56(regen) | 644–796 | 4,5–5,6 |
| 4 | dreadfang 62 / void_stalker 66(req) / sorrow_wraith 72(req) / frost_hound 74(regen) / bone_colossus 76(regen,enrage) | 548–772 | 4,7–6,6 |
| 5 | dread_knight 82(regen) / soul_flayer 86(req) / void_herald 90(regen,req) / roc_void 94(regen,enrage) / abyssal_devourer 96(regen,enrage,req) | 468–560 | 6,4–7,7 |

**Befund:** 27/27 killbar, 0 Tode. Alle Slayer-Anforderungs-Mobs (plague_mask/mirror_ward/ear_plugs/
soul_veil/void_anchor) laufen sobald das Anforderungs-Item im Besitz ist; ohne Item greift der Hard-Block
korrekt (in der Sim reproduziert). Regen-/Enrage-Endgame-Mobs (roc_void, abyssal_devourer) klar
besiegbar. **Alle Tower-Tasks sind killbar.**

## C) Slayer-XP & Belohnung (end-to-end)

- Pro-Kill-Slayer-XP = `round(monster.xp · 0,5)` → warrior **34**/Kill, archer **39**/Kill (bestätigt).
- Abschluss-Bonus `task.xpReward = round(monster.xp · 0,5 · N)` — verifiziert (z. B. ashfield_wraith
  N=32 → 1248 = 78·0,5·32; tower_goblin N=22 → 264 = 24·0,5·22). `pointReward = basePoints = 5`/Task.
- End-to-end (assign→N Kills→Abschluss): Slayer-XP wird pro Kill gutgeschrieben, Abschluss-Bonus obendrauf,
  +5 Punkte, `slayerTasksCompleted++`. Master `brenna_ashwick` mixt ~50/50 Welt-/Tower-Tasks (towerTaskChance 0,5).
- Hinweis (kein Bug): Unter Slayer-40 verstärkt `earlyXpMult` (bis ×3) die Slayer-XP kräftig — frühes
  Slayer-Leveln ist bewusst schnell.

---

## FINDINGS

### [P2][bug] Bögen mit unfütterbarer Munition — ammoType verlangt höheres Ranged-Level als der Bogen  (confirmed)
Mehrere Bögen sind bei ihrem eigenen `requirements.ranged` ausrüstbar, aber ihr fixer `ammoType` verlangt
ein **höheres** Ranged-Level. Da Kampf nur die exakte `ammoType`-Munition verbraucht (combat.ts:787) und
Ammo-Equip das Ranged-Level prüft, ist der Bogen im Zwischenfenster **wieldbar, aber nie feuerbar** →
`stopReason: "outOfAmmo"`, 0 DPS.
- **Repro:** ranged=28, `equip(spectral_hunter_bow)` (req 28) ok → `equip(mithril_arrow)` scheitert (req 40)
  → `startCombat`/`fightFor` → sofort outOfAmmo, 0 Kills. (Genau das trat im Ranged-Lauf auf, bis der Test
  auf einen fütterbaren Bogen auswich.)
- **Betroffen (unbenutzbares Fenster):**
  - `stagstride_longbow` r24 → mithril_arrow r40 → **Fenster 24–39** (16 Lvl)
  - `spectral_hunter_bow` r28 → mithril_arrow r40 → **Fenster 28–39** (12 Lvl) — superRare Drop, „bestes"
    Mid-Ranged-Gear im Skelett-Band, aber im Band unbenutzbar
  - `skytalon_recurve` r50 → runite_arrow r60 → 50–59 (10 Lvl)
  - `abyssal_tide_bow` r90 → godiron_arrow r99 → 90–98 (9 Lvl)
  - klein (P3): `stolen_shortbow` r7→iron r10; `ashwood_longbow` r14→steel r20;
    `ashfall_recurve`/`skeletal_longbow`/`antler_warbow` r18→steel r20 (18–19)
- **Erwartet:** Bogen-`requirements.ranged` ≥ Munitions-`requirements.ranged` (oder ammoType eine Stufe tiefer).
- **Empfehlung (konkret, content-dev):** je Bogen entweder `ammoType` auf die passende Band-Stufe senken
  ODER `requirements.ranged` auf die Munitionsstufe heben. Z. B. `spectral_hunter_bow` → `ammoType:
  "blacksteel_arrow"` (r30) **oder** `requirements.ranged: 40`; `stagstride_longbow` → `blacksteel_arrow`;
  `skytalon_recurve` → `adamantium_arrow` (r50); `abyssal_tide_bow` → `aetherium_arrow` (r90).
- **Owner:** content-dev. (Ein Guard-Test „ammoReq ≤ bowReq für alle Bögen" wäre die dauerhafte Absicherung.)

### [P3][feel] Tower-Skelette am oberen Rand des Floor-2-Bands  (suspected, kein Handlungsbedarf)
Floor 2 (Slayer-L20) hat Mob-Band L20–39; die Skelette liegen bei L36/38, also am Apex. Für einen Spieler,
der Slayer 20 rusht aber combat ~20 ist, sind sie die härtesten Floor-2-Mobs — die Sim zeigt aber, dass
schon mit Stahl-Gear bei combat 24 alles todesfrei fällt. Kein Balance-Problem; nur zur Info.

---

## Top-3
1. **[P2 bug]** 9 Bögen mit unfütterbarer Munition (ammoReq > bowReq) — u. a. `spectral_hunter_bow`,
   `stagstride_longbow`: im eigenen Level-Band wieldbar, aber nie feuerbar (outOfAmmo). → content-dev.
2. **[bestätigt]** Retier der Tower-Skelette (L36/L38) wirkt: alle 3 Stile todesfrei, enge Stil-Parität,
   nur der akzeptierte Bronze-Baseline scheitert. Alle 27 Tower-Mobs killbar.
3. **[bestätigt]** Slayer-XP/Belohnung korrekt (perKill `round(xp·0,5)`, Abschluss `·N`, +5 Punkte),
   Gate/Hard-Block sauber, Welt/Tower-Mix funktioniert.

**Ziel erreicht:** Ja — Tower vollständig grindbar, Skelett-Retier verifiziert, ein echter Content-Bug (Bogen-Munition) mitgenommen.
