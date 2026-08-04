# Playtest-Feedback: „Die Magierin" (Lyra)

**Persona & Spielstil:** Reine Magierin — will NUR mit Magie kämpfen (Stäbe/Foki, Mana, Statuseffekte
burn/frost/shock), zieht Runecrafting für Magie-Gear hoch, liebt Glass-Cannon/Burst. Wird genervt,
wenn Magie sich schwach/umständlich anfühlt oder der Mana-/Runen-Loop nervt.

**Was ich gespielt habe:** Start mit int 6 / wis 4, Knorriger Stab (`gnarled_staff`) ab Sekunde 1.
Mana-Verlauf im Dauerkampf gemessen, Magie-DPS sauber (log-basiert, unsterblicher Dummy) gegen Nahkampf
verglichen, Runecrafting-Gear-Loop angetestet (Essenzen farmen → craften), DPS über alle 6 Magie-Gear-Tiers
gemessen, Statuseffekte & magic_def geprüft. Sim-Zeit grob 30–240 min in Häppchen, Seeds 5/7/11.

---

## Pacing-Messungen (konkrete Zahlen)

### Mana — KEIN Engpass (eher zu großzügig)
- maxMana bei int6/wis4 = **83**, manaRegen **3,70/s**, `MANA_PER_CAST = 6`.
- Im Dauerkampf gegen Goblin (Stab-Intervall 2880 ms → ~1 Cast/2,9 s = 2,08 Mana/s Verbrauch):
  Mana pendelt zwischen **79–83**, regeneriert (3,7/s) **schneller als der Verbrauch (2,08/s)**.
- → Mana läuft im normalen Kampf **nie leer**. Der „kein Mana = schwacher Schlag" (`MAGIC_WEAK_FACTOR 0.35`)
  greift praktisch nie. Mana ist aktuell ein **Dekorationswert ohne Entscheidung**.

### DPS Magie vs. Nahkampf (sauber, log-basiert, identische Kampfzeit)
| Setup | Magie-DPS | Nahkampf-DPS | Ratio |
|---|---|---|---|
| Starter-Waffe (frischer Char) | **5,9** | 3,2 | **1,86x** |
| Endgame (godspark_staff+god_focus, magic_off 90) | **92,4** | – | – |

→ Magie schlägt **pro Treffer härter** (magicDmg = `int*2 + magic_off*1.2 + Gear`). Glass-Cannon-Burst
funktioniert auf dem Papier: Starter-Magie ist **~1,9x** so stark wie Starter-Nahkampf. Gut!

### Magie-Gear-Progression (Raw-magicDamage über die Tiers)
| Tier | Waffe+Fokus | magicDmg | maxMana |
|---|---|---|---|
| Starter | gnarled_staff | 29 | 83 |
| dim_focus (rc6) | gnarled+dim_focus | 64 | 123 |
| frost | frost_scepter+frost_focus | 130 | 183 |
| aether | aether_runestaff+aether_orb | 214 | 283 |
| stormcaller | stormcaller_rod+void_focus | 298 | 383 |
| godspark | godspark_staff+god_focus | 422 | 513 |

→ Sauberes, monoton steigendes Power-Band (29 → 422, ~14x). Skaliert ordentlich.

### Runecrafting-Loop (Zeit bis erstes Gear)
- `dim_focus` braucht **magic_off 8 + runecrafting 6** (Input: 4× `dim_essence`).
- Essenzen sind **Monster-Drops**, kein Gather-Skill. Gegen `goblin_stormcaller` (hp78, 20% dim-Drop):
  **4× dim_essence nach ~3 min, magic_off 8 nach ~2 min** — also extrem schnell. Schön!
- **ABER:** runecrafting levelt **nur durchs Craften selbst**. Nach 3 min Farmen ist rc immer noch **Level 1**.
  Um rc6 zu erreichen braucht man `xpForLevel(6) = 512` XP, und die Crafts geben **2 XP** (Rune/3 s) bis
  **4 XP** (Stab/8 s). Das sind grob **130–250 Crafts** nur für rc6 — und für `frost_scepter` (rc20,
  `xpForLevel(20)=4470`) bzw. `aether` (rc35, `xpForLevel(35)=22406`) explodiert das.

---

## ✅ Was sich gut anfühlt
- **Magie ist ab Sekunde 1 spielbar** (Starter-Stab equip OK, style=magic sofort korrekt erkannt).
- **Burst-Fantasie stimmt rechnerisch:** Magie-DPS > Nahkampf-DPS bei gleichem Investment (1,86x Starter).
- **Essenzen droppen früh & häufig** — der „kämpfen → Material → craften"-Kreis ist konzeptionell schön
  (Magier muss kämpfen, um Magie-Gear zu bauen) und das Farmen selbst ist schnell (4 Essenzen in 3 min).
- **Gear-Band sauber gestaffelt** (6 Tiers, magicDmg 29→422), Foki als Offhand geben eine zweite Achse.

## ⚠️ Was sich zäh/kaputt anfühlt (mit Zahlen)
- **Magie ist im ECHTEN Kampf fragiler als die Rohwerte suggerieren.** In der realistischen Sim
  (Tier-Test gegen last_idol, ohne con-Cheese) **stirbt der Magier in jedem Tier genau 1×** und die DPS
  kollabiert auf 58→89 (statt 92 bei voller Uptime). Grund: **Nahkampf hat 12% Lebensraub
  (`MELEE_LIFESTEAL`), Magie hat NICHTS Defensives.** Glass Cannon ohne Glas = nur Cannon, die zerbricht.
- **Runecrafting-XP ist der echte Flaschenhals, nicht die Essenzen.** rc6 = ~130–250 Crafts, rc35 = 22.406 XP
  bei 2–11 XP/Craft → das ist ein **massiver Grind**, der völlig vom Kampf entkoppelt ist. Der Magier muss
  stundenlang Runen binden, die er gar nicht haben will, nur um an die Waffe zu kommen.

## Reibungspunkte & Frust (konkret)
1. **`magic_def` ist ein totes Skill.** Es geht in `defense` ein (`sMagicDef*0.2` in computeStats), wird aber
   in `combat.ts` **nie mit XP versorgt** (nur attack/power/defence/ranged/magic_off/vitality bekommen addXp).
   Ein reiner Magier kann seine „Magie-Verteidigung" also **niemals trainieren** — der Skill existiert nur als
   Karteileiche. Sehr frustrierend für jemanden, der „defensive Magie" spielen will.
2. **Statuseffekte verschwinden nach dem Starter-Stab.** Nur `gnarled_staff` hat einen `weaponEffect`
   (burn). **Alle** Runecrafting-Stäbe (frost_scepter, aether_runestaff, stormcaller_rod, voidcaller_staff,
   godspark_staff) haben **`weaponEffect: ❌ KEINER`**. Eine „Frost-Zepter" heißt Frost und friert nichts ein.
   Die ganze burn/frost/shock-Fantasie wird mit dem ersten Upgrade **weggeworfen**.
3. **Mana ist belanglos.** Regen > Verbrauch → nie ein Engpass, nie eine Entscheidung. Es gibt keine teuren
   „großen" Zauber, kein Mana-Management, keinen Burst-vs-Sustain-Trade-off.
4. **Keine INT-Rüstung.** Es gibt nur 6 Items mit magicDmg außerhalb der Waffen (Ringe/Amulette), und
   **0 Items mit einem `int`-Modifier**. Ein Magier kann seinen Kern-Stat (int) über Gear gar nicht erhöhen —
   nur über magic_off-Level. Magier-Roben/Hüte als eigene Rüstungslinie fehlen komplett.

## Was fehlt für ein vollwertiges Spiel (Magier-Sicht) — priorisiert

1. **[HOCH] Magier-Überlebensmechanik.** Magie braucht ein Gegenstück zum Nahkampf-Lebensraub. Optionen:
   Mana-Schild (Mana absorbiert Schaden), Frost-Slow als echte Defensive (`FROST_SLOW` existiert schon —
   nur auf Magie-Waffen legen!), oder ein „Spell-Vamp" über magic_def. **Ohne das ist Glass-Cannon-Magie im
   Idle-Dauerkampf strikt schlechter als Nahkampf trotz höherer Rohwerte.**
2. **[HOCH] `magic_def` mit XP versorgen ODER entfernen.** Wenn es ein Magie-Verteidigungs-Skill sein soll:
   beim Einstecken von (magischem) Schaden XP geben, analog zu `defence`. Sonst ist es ein Bug/Karteileiche.
3. **[HOCH] weaponEffect auf die Runecrafting-Stäbe legen.** frost_scepter→frost, stormcaller→shock,
   godspark→burn/shock-Mix. Das ist 5 Zeilen Content und macht jede Waffe spürbar magisch (skaliert
   `magnitude` mit Tier). Aktuell fühlt sich Magie ab Tier 2 wie „Nahkampf, der int benutzt" an.
4. **[MITTEL] Mana zu einer echten Ressource machen.** Z.B. ein starker „Burst-Cast" (2–3× MANA_PER_CAST,
   2–3× Schaden) — dann lohnt sich Mana-Pool/Regen-Investment (wis/int) und es entsteht Burst-vs-Sustain.
5. **[MITTEL] Magier-Rüstungslinie + INT-Gear.** Roben/Zirkel mit `modifiers.int` und/oder magicDmg+maxMana
   als eigener Rüstungs-Tech-Tree (parallel zu Platte/Leder). Gibt dem Magier eine Gear-Achse außerhalb der Waffe.
6. **[NIEDRIG] Runecrafting-XP vom Stab-Craften entkoppeln/anheben.** rc35 für aether ist ein 22k-XP-Grind an
   Runen, die man nicht braucht. Entweder die Enchant-Aktionen geben deutlich mehr XP, oder Magie-Gear hängt
   stärker an magic_off (das man ohnehin durchs Kämpfen levelt) statt an einem entkoppelten Craft-Skill.

---

## Spaß-Bewertung: **5 / 10**

Die Rohwerte stimmen (Magie-Burst > Nahkampf, Gear skaliert sauber, Essenzen droppen schnell), aber die
**Magie-Identität zerfällt beim ersten Upgrade**: Statuseffekte verschwinden, Mana ist belanglos, magic_def
ist tot, es gibt keine INT-Rüstung und keine Überlebensmechanik — am Ende spielt sich der Magier wie ein
zerbrechlicher Nahkämpfer, der zufällig int statt str benutzt. Mit Punkten 1–3 oben wäre das schnell eine 8.
