---
name: armor-trinity
description: "Rüstungs-Trinität (Itemization 2.5) — Mitigation/Evasion/Ward, locked Chef-Entscheidungen"
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-GO 2026-07-03: neues Rüstungs-System, weil Rüstung nach Itemization 2.0 keinen defensiven Wert
mehr hatte (nur Attribute). **Survival-Trinität ZUERST**, Konter-Waffen (Armor-Pen) später.

**Locked-Entscheidungen:**
- **HYBRID**: Attribute bleiben Kern + explizite Klassen-Defense-Schicht obendrauf.
- **Platte (Melee) = Mitigation** (echte Armor, reduziert Treffer). **Leder (Ranged) = Evasion**
  (evasionRating, als % auf den Teilen). **Stoff (Magic) = Ward/Energy-Shield** — eine 3. LEISTE im
  Kampf-UI UND Char-UI (HP/Mana/Ward), absorbiert Treffer, wird durch **Mana-Verbrauch/Casting wieder
  aufgeladen** (Chef-Idee, gutgeheißen: koppelt Offense an Defense, Sustain-Identität für Magier).
- **Block-Chance = NUR auf SCHILDEN** (ItemDef.blockChance, kein anderes Slot). Melee-1H+Schild =
  Mitigation+Block; 2H-Melee = kein Block, dafür Ausgleich (mehr Mitigation/Offense). Block MUSS ins
  Melee-EHP-Budget → 1H+Schild ≈ 2H ≈ Evasion ≈ Ward. Ranged/Magic tragen keine Schilde (Block =
  reine Melee-1H-Schiene).
- **Defence-Skill hat KEINEN Einfluss** mehr auf Block-/Evasion-Qualität — komplett über Rüstungsteile
  gesteuert. Defence gatet nur noch Armor-Requirements indirekt (raus aus den Mitigation-/Evasion-
  Formeln in computeStats).
- **Constraints**: Kämpfen OHNE Rüstung ab L10-15 ≈ Selbstmord; **Food NICHT trivial**. Lever:
  Mitigation-Kurve + Gegner-Schaden hochpumpen (ohne Gegner zu tanky zu machen).
- **EHP-Parität** der 3 Stile je Band (Gate wie Itemization 2.0).
- **Gegner brauchen Armor/Defense-Werte** (auch die ohne getragene Rüstung) — Groundwork, damit
  Spieler-**Armor-Penetration** später Sinn macht.

**Formel-Präzisierung (Chef 2026-07-03, nach dem ersten Build):**
- **Armor → Mitigation %:** diminishing Formel `min(0.80, armorRating/(armorRating+K))` — schon so (K=12.5).
  Niedrig-Band niedrig, Endgame hoch (armorRating skaliert mit Tier). ✓
- **Evasion → Evasion %:** aktuell LINEAR (`min(0.75, evasionRating/100)`) — Chef will „genau das gleiche"
  wie Armor = diminishing Formel. TODO: auf diminishing-Kurve umstellen.
- **Ward:** wardCapacity → 1:1 in den Pool (maxWard) ✓. NEU: **Warding-SKILL** → Formel →
  Ward-Regeneration % → treibt die Ward-Regen. Chef-Entscheid 2026-07-03: Warding ist KEIN neuer 7.
  Skill, sondern **ersetzt `magic_def`** (defensive Magie — deren alte Rolle fiel mit der Rüstungs-
  Trinität eh weg). UND **`magic_off` → umbenannt zu „Magic"** (Offense). Magie-Seite danach:
  **Magic** (Offense) + **Warding** (Defense/Ward-Regen). Skill-Icon liegt: `assets/skills/warding.png`
  + `icons/icon_attribute_ward.png`.
  UMSETZUNG (Armor-Iteration 2, nach 1. Gate/Tester): shared COMBAT_SKILL_IDS/BOOSTABLE/SkillId
  (magic_off→magic, magic_def→warding) + SAVE-Migration (skill-XP-Keys umbenennen) · content Skill-Defs
  (131× magic_off, 11× magic_def refs, Namen/Desc/Icon) · engine computeStats (magic-Damage liest jetzt
  `magic`; `warding`→Ward-Regen-Formel) · UI Combat-Sub-Skills. Evasion parallel: LINEAR→diminishing.

**STATUS 2026-07-03:** Iteration 1 gebaut+gegatet (TRIM) + 12 Combat-Tester ausgewertet → **Iteration 2
GEBAUT** (typecheck 5/5, Engine 664/664, sim 0 Walls, Persistenz 103/103, Client-Build; Re-Gate läuft).
Iteration-2-Spec: `design/armor-iteration2-spec.md`. ERLEDIGT in It2: Evasion LINEAR→diminishing
(`min(0.75, Σevr/(Σevr+45))`) ✓ · Warding-Skill (magic_def→warding, magic_off→magic, SAVE 50→51,
wardRegenPerSec = min(2.0, warding·0.02)×stance, XP via Ward-Absorb) ✓ · **armorRating ×10 + K=125**
(Chef, mitigation-invariant) ✓ · Buff-Typ trägt jetzt Attribute+Trinity (Consumables geben echte Werte) ✓ ·
2H-armorRating an getragene Platte gekoppelt (nackter 2H=0 Mitigation, Bugfix) ✓ · Block 0.85, Lifesteal
0.06, Ward-Kill-Refill 20% (Food-Asymmetrie), Leder-Floor 0.12, Leder→`ranged`-gegatet ✓. Konstanten in
`packages/shared` (DEFENSE_MITIGATION_K=125, K_DODGE=45, WARD_KILL_REFILL_PCT=0.20, WARDING_*).
**It2.1 GEBAUT+kompiliert (2026-07-04, typecheck 5/5, Guards grün — Chef schaltete PC aus, OFFEN: finales Gate+Report+ZIP morgen):** Magier-Frühgame-Food-Fix (WARD_PER_MANA 0.5→0.20 + WARD_KILL_REFILL_PCT 0.20→0.10, gekoppelt — Cast-Recharge war die Sustain-Engine) · Stoff runecrafting-Co-Req ENTFERNT → nur noch `magic`-gegatet (Spiegel Leder→ranged) · R10-Parität finalisiert (apprentice maxWard 45, cured-Leder dodge 42%, iron-Platte maxHp~42, Leder-CON-Guardrail, neuer Duskweave-Stoff-Tier magic 64) · Magie-Defensiv-Stance dmgMult 0.85 (−15%, war ungewirkt) · Buff-Guard armorRating max 35 (tonic_stoneskin 80→35) · Nits (towershield-Tempo-Malus, wraithhide/ironhide con). Spec: `design/armor-iteration2.1-spec.md`. Doku aller Tester: `design/armor-sweep2-2026-07-03/`.
CHEF-ANWEISUNG: nach 2.1 NICHTS Neues starten. Warteschlange für morgen: #221 (2H ohne Armor), #222 (Waffen-Archetypen+Armor-Pen), #223 (Gegner-Verteidigungs-Trinität defenseType), #219 (Consumables+Enchantments+klare Runen-Texte), #220 (Combat-Log Heil-Quelle+Mitigation-Anzeige), #224 (Nav-Umbau Shop/Bank↑Stats/Options↓).

**How to apply:** Spec (balance-designer) → Engine → Content → UI → Gate → Test-Loop. Plan:
`design/armor-system-plan.md`, Specs: `design/armor-trinity-spec.md` + `design/armor-iteration2-spec.md`.
Vgl. [[game-design]] [[combat-concept]] [[combat-is-fundamental]] [[rare-drop-philosophy]].
