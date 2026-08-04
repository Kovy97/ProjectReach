# QA-Run 3 — Combat & 3-Stil-Balance (melee / ranged / magic)

**Tester:** Playtester-Agent (READ-ONLY, keine Content/Engine-Änderung) · **Datum:** 2026-06-27
**Scope:** Kampf-Engine (`combat.ts`), `computeStats` (`character.ts`), Waffen/Munition/Monster aus `packages/content/src/index.ts`, geteilte Konstanten (`shared/src/index.ts`).
**Fokus:** Stil-Parität melee/ranged/magic über Level · Status-Effekte (burn/bleed/frost/poison/shock) · Crit/Accuracy/Evasion · Ammo-Köcher-Slot (OSRS) · Auto-Eat · Mana-Schild.

**Methode — echte Daten, kein Hand-Wedeln:** Ich habe ein temporäres Sim-Harness direkt auf der Engine laufen lassen (`createGame`→`advance`-Ticks, deterministischer Seed) und **drei tier-gleiche Builds gegen denselben on-level Mob** über 1 h Spielzeit gemessen — mit **realistischer, stil-eigener Skill-Investition** (Nahkampf trainiert attack+power+defence+vitality → str/dex/con; Fernkampf ranged+defence+vitality → dex/con; Magie magic_off+magic_def+vitality → int/wis/con), passender Rüstung pro Stil (Platte / Leder / Robe inkl. Set-Bonus), gefülltem Köcher und Auto-Eat T3. Gemessen wurde **kills/h** (Durchsatz). Harness nach dem Lauf wieder entfernt. Zahlen unten sind reale Sim-Ausgaben, keine Modellrechnung.

---

## Fun-Score: **7 / 10**

Der Kampf ist mechanisch **erstaunlich rund**: keine Walls, keine Trivialität, glatte HP/Schadens-Kurve, alle Status-Effekte funktionieren, Köcher/Munition und der Out-of-Ammo-Stopp sind sauber, Auto-Eat und die prozentuale Defense-Mitigation verhindern Death-Loops (0 Tode über alle Builds/Checkpoints). Die Magie-Aufwertung (struktureller Accuracy-Fix + Stab-Treffer + Burn-DoT) ist **gelandet** — Magie ist kein Schlusslicht mehr. **Aber die Stil-Parität ist noch nicht da:** im Früh-/Mid-Game clearen Fernkampf und Magie deutlich schneller als Nahkampf, und Nahkampf ist an jedem Checkpoint der langsamste Durchsatz-Stil. Endgame (L99) konvergieren die drei sauber (~15 %), die Lücke sitzt in L10–L60.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, on-level Mob)

| Build (Waffe) | Stil | L10 vs goblin_butcher | L50 vs skeleton_nekro | L99 vs aether_wraith |
|---|---|---:|---:|---:|
| Schwert (sword) | melee | 448 (0.83×) | 251 (0.93×) | 350 (0.92×) |
| **Dolch (dagger)** | melee | **538 (1.00×)** | **270 (1.00×)** | **382 (1.00×)** |
| Kurzbogen (shortbow) | ranged | 793 (**1.47×**) | 351 (**1.30×**) | 439 (**1.15×**) |
| Stab (staff) | magic | 718 (**1.33×**) | 424 (**1.57×**) | 423 (1.11×) |

*(×-Faktor = kills/h relativ zum besten Nahkampf-Build = Dolch. 0 Tode in allen Läufen.)*

**Begleit-Stats am Checkpoint L99** (dmg / acc / aIMs / crit / evasion / def / maxHp):
- melee-Dolch: dmg 257, acc 676, aIMs 2150, crit 0.24, **eva 94, def 518, hp 2060**
- ranged-Bogen: dmg 216, acc 603, aIMs 1828, crit 0.30, **eva 156, def 135, hp 1071**
- magic-Stab: dmg 391, acc 553, aIMs 2780, crit 0.13, **eva 66, def 95, hp 814**

Lesart: Nahkampf zahlt einen **DPS-Aufpreis für Tankigkeit** (HP 2060, def 518), die er gegen diese Mobs **gar nicht braucht** (0 Tode auch bei Bogen/Stab). Mit Auto-Eat ist Überleben für alle Stile gelöst → der Tank-Vorteil verpufft, der Durchsatz-Nachteil bleibt. Fernkampf ist dabei **nicht** der squishige Ausgleich: seine Evasion (156) ist **höher** als die des Nahkämpfers (94).

---

## Top-Stärken

1. **Keine Walls, keine Trivialität.** Über alle Checkpoints 5–14 s/Kill, 0 Tode; der Geared-Endgame-Held der Bestands-Sim besiegt jeden Mob. Die HP/Schadens-Kurve skaliert monoton.
2. **Magie-Reparatur ist echt gelandet.** Der strukturelle Accuracy-Fix (`offenseSkill` stil-abhängig in `computeStats`, `+sMagicOff·2`) **plus** Stab-Accuracy `≈1.4·D` schließen das alte „Magier trifft nur 50 %"-Loch — Magie trifft jetzt zuverlässig und ist mid-game sogar der **stärkste** Durchsatz-Stil.
3. **Status-Effekt-System ist vollständig & symmetrisch.** burn/bleed/poison = DoT (ignoriert Rüstung), frost = −40 % Angriffstempo, shock = Aussetzer; wirkt in **beide** Richtungen (Spieler↔Gegner), mit `resist`-Immunitäten. Gut über Monster verteilt (inflict: poison 8, burn 8, bleed 7, shock 6, frost 2) und Fusions-Waffen wenden via `effectiveWeaponEffects` wirklich beide Effekte an.
4. **Ammo-Köcher (OSRS) ist sauber.** Munition lebt im `ammo`-Slot (`equipment.ammo` + `ammoCount`), nur passende Munition feuert scharf (+`ammoDamage`), und der **Out-of-Ammo-Stopp** (`stopIfOutOfAmmo`) beendet den Kampf statt im AFK mit −60 %-Notschlag Loot zu verschwenden. Magie-„kein-Mana" degradiert bewusst zum Weak-Melee (kein Stopp, Mana regeneriert nach) — richtige Asymmetrie.
5. **Robuste Engine-Guards.** `FALLBACK_HIT_CHANCE`, `safeInterval`, NaN-feste `clamp` und die gedeckelten Lifesteal/Mitigation/Mana-Schild-Terme verhindern Save-Soft-Bricks und Endgame-Unverwundbarkeit. Solide Idle-Fairness.

---

## Priorisierte Findings

### [P1 Balance] Nahkampf ist an JEDEM Checkpoint der langsamste Stil
**Befund (Sim oben):** Bester Nahkampf-Build (Dolch) = Durchsatz-Boden. Fernkampf +15–47 %, Magie +11–57 %. Am stärksten klafft es **Früh-/Mid-Game** (L10: ranged 1.47×, magic 1.33× / L50: magic 1.57×, ranged 1.30×). Treiber: Nahkampf-Rüstung ist Platte (def/HP statt Offense), und seine Tankigkeit ist gegen on-level Mobs mit Auto-Eat **wertlos** (alle Stile 0 Tode). Der einzige Stil-Nachteil (geringere Survivability von Bogen/Stab) wird durch Auto-Eat + Mitigation neutralisiert, der DPS-Nachteil von Nahkampf bleibt aber bestehen.
**Fix-Vorschlag (content/combat):** Nahkampf-Offense leicht anheben **oder** der Tankigkeit echten Wert geben. Da Auto-Eat Survivability trivialisiert, ist der saubere Hebel ein moderater Melee-Schadens-/Tempo-Bump im Mid-Game (z. B. Dolch-Linie `attackIntervalMs` schneller, oder Schwert-Linie meleeDamage +10–15 %), bis der Dolch-Build mid-game grob auf Bogen-Niveau liegt. Ziel-Band: alle Stile innerhalb ~±15 % über alle Checkpoints (bei L99 bereits erreicht).

### [P1 Balance] Fernkampf hat keine echte Glass-Cannon-Schwäche (Evasion zu hoch)
**Befund:** Der Bogen-Build hat bei L99 **eva 156 vs. Nahkampf 94** — also **höhere** Ausweichrate als der „Tank". Quelle: `dex` ist Super-Stat (Schaden + Tempo + Krit + Evasion in einem) **plus** der Stil-Bonus `evasion += 5` in `computeStats` (Z. 238) **plus** Evasion auf Leder-Rüstung. Fernkampf ist damit High-DPS **und** schwer zu treffen; nur HP/def liegen tiefer — was Auto-Eat ausgleicht. Die intendierte „höchster Schaden, geringste Defensive"-Identität existiert nicht.
**Fix-Vorschlag:** Den `evasion += 5`-Stil-Bonus für Fernkampf streichen (Audit 2026-06-26 schlug dasselbe vor) und/oder Evasion von Bögen/Leder reduzieren, damit Fernkampf real squishier wird und sein Durchsatz-Vorsprung eine Kehrseite bekommt.

### [P2 Balance] Magie überschießt im Mid-Game (L50 stärkster Stil, +57 %)
**Befund:** Bei L50 clearts Magie **1.57×** den besten Nahkampf — der höchste Einzelwert der ganzen Messung. Ursache ist ein Stapel aus lauter Upside ohne Downside: `magicDamage = int·2 + …` (höchster Attribut-Koeffizient aller Stile), voller Aether-Set-Bonus (+magicDamage), zuverlässiger Burn-DoT je Cast **und** der Accuracy-Fix — während die intendierte Mana-Bremse **inert** ist (s. nächstes Finding). magicDamage erreicht L50 **237** gegen Dolch 116 / Bogen 109.
**Fix-Vorschlag:** Magie-Mid-Tier leicht entschärfen, sobald Nahkampf (P1) angehoben ist — z. B. `int·2 → int·1.7` ODER Aether-Set-magicDamage-Bonus trimmen ODER manaCost schärfen (s. u.). Nicht überkorrigieren: bei L99 ist Magie mit 1.11× schon im Band.

### [P2 Balance] Mana ist kein Gameplay-Hebel (Weak-Melee-Fallback feuert nie)
**Befund (verifiziert):** `manaRegen` pro Cast-Intervall übersteigt `manaCost` in **jedem** Tier (L50: Pool 269, Kosten 10, hoher wis-Regen). Im Dauerkampf läuft Mana nie leer → der `MAGIC_WEAK_FACTOR (0.35)`-Notschlag und der geplante „3–6 Casts, dann Bash"-Rhythmus sind **tot**. Zusätzlich ist der **Mana-Schild** dadurch eine quasi-gratis Dauer-Defensivschicht (Mana füllt schneller nach als er verbraucht wird). Magie hat damit Burst + Sustain + Defense ohne Ressourcen-Spannung. (Bekannt als B4 im Audit 2026-06-26 — weiterhin so.)
**Fix-Vorschlag:** Entweder bewusst so lassen (idle-fair, zuverlässig) ODER `manaCost` ~×1.5 schärfen, damit Mana im Dauerkampf real knapp wird und Magies Schadensüberschuss (P2 oben) eine echte Kehrseite bekommt. Eine Änderung adressiert beide Magie-Findings auf einmal.

### [P3 Balance] Nahkampf-Schwert ist die Trap-Option
**Befund:** Die Basis-Schwertlinie liegt bei gleichem Tier **7–17 % unter** dem Dolch (L10 0.83× vs 1.00×, L99 0.92× vs 1.00×) — langsameres Intervall, kein Krit-Bonus, höhere Accuracy gleicht das nicht aus. Das „Default"-Nahkampf-Bild (Schwert) ist ausgerechnet die schwächste Wahl, was den P1-Eindruck verstärkt.
**Fix-Vorschlag:** Schwertlinie eine eigene Nische geben (z. B. spürbar mehr meleeDamage als Ausgleich für das langsamere Intervall) oder als bewusste „Accuracy/Allround"-Wahl klar kommunizieren.

### [P3 Politur] Status-Effekt-Quellen leicht burn-lastig; poison/bleed spielerseitig dünn
**Befund:** Von 49 Waffen-`weaponEffect`s sind 25 burn, 12 shock, 9 frost, nur 3 bleed, **0 poison**. Spieler können poison/bleed kaum aktiv ausspielen, obwohl Monster sie häufig einsetzen (poison 8, bleed 7 inflict). Thematisch okay (Feuer-Enchants dominieren), aber die Effekt-Vielfalt auf der Spielerseite ist enger als das System hergibt.
**Fix-Vorschlag (optional):** 2–3 Waffen/Enchants mit poison- oder bleed-Effekt im Mid-Tier ergänzen (z. B. der in MEMORY genehmigte „Dornenschwert"-bleed / „Goblin-Gift"-poison), damit Spieler die volle Status-Palette nutzen können.

---

## Mechanik-Checks (alle bestanden)
- **Crit/Accuracy/Evasion:** Trefferformel `acc/(acc+eva)` mit endlichem Fallback; stil-abhängige Accuracy korrekt (melee→attack, ranged→ranged, magic→magic_off). Crit & Krit-Schaden greifen, Fernkampf-Krit-Bonus (+0.1, gedeckelt 0.85) ist wirksam.
- **Defense-Mitigation:** `def/(def+125)`, Deckel 0.80 — dämpft, nullt nie, kein Unverwundbar-Drift. Symmetrisch für Spieler & Gegner.
- **Auto-Eat:** Schwelle/Heilung je Tier (0.5→0.8 / ×1.0→×1.5), feuert auch auf DoT-Schaden, Combo-Food-Buff wird im Auto-Eat-Pfad identisch angewandt. 0 Tode = wirkt.
- **Lifesteal (Nahkampf):** doppelt gedeckelt (%maxHp UND absolut 12) — kein Burst-Vollheal, kein Endgame-Skalierungs-Exploit.
- **Köcher/Out-of-Ammo & Mana-Schild:** wie unter „Stärken" beschrieben — sauber implementiert.

## Fazit
Mechanisch sehr gesund (Fun-Score gebremst nur durch Parität, nicht durch Bugs). Die **eine** große Stellschraube: **Nahkampf im Früh-/Mid-Game anheben** (P1) und gleichzeitig **Fernkampf-Evasion** (P1) + **Magie-Mid-Tier/Mana** (P2) leicht entschärfen — dann liegt das schon bei L99 erreichte ~15 %-Band über die gesamte Kurve.
