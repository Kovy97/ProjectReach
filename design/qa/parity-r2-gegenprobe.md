# Parität-Gegenprobe R2 — 3-Stil-Messung (Verifikation)

**Autor:** Combat-Dev · **Datum:** 2026-06-28 · **Typ:** Verifikation (read-only Messung, kein Code-Change)
**Quelle der Soll-Vorgaben:** `design/balance-3style-parity-r2.md`
**Methodik:** best-craftbares Gear pro Stil (DPS-optimal aus dem craftbaren Pool gewählt), stil-eigene
Kampf-Skills **inkl. der zum Herstellen nötigen Crafting-Skills und ihrer passiven Attribut-Gewinne**
(`smithing→str`, `leatherworking→dex`, `fletching/runecrafting→nichts`), on-level Mobs, 1 h Sim,
kills/h. Normiert auf **ranged = 1.00** (wie r2-Spec). Faktor = ø der **per-Mob-Ratios** über mehrere
on-level Mobs (±8 Level, bis zu 10 Mobs) → cancelt die HP-Skalierung einzelner Mobs.

Engine-Hebel der R2 im Code **bestätigt vorhanden** (`character.ts`): `int·1.7` (Z.223),
`manaRegen wis·0.2` (Z.252), Ranged-Krit `+0.06` / Intervall `×0.90` (Z.240–241);
Mana-Schild Tier-Skalierung + Cast-Reserve-Floor (`combat.ts:249–294`). Content-Trims sichtbar
(voidweave int-Mods 7/7/3/2/2, magicDamage 28er-Reihe; Fokus `maxMana 45`, kein manaRegen mehr;
Platten-meleeDamage-Backbone body18/legs12/gloves6/boots4).

Robustheit: zwei Skill-Modi gemessen — **A** = alle Kampf-Skills auf L (Repo-`sim.ts`-Konvention,
gibt jedem Build attack+ranged-dex), **B** = strikt nur stil-eigene Kampf-Skills. Beide liefern dasselbe
qualitative Urteil.

---

## Ergebnis — ×-Faktoren (ranged = 1.00)

### Modus A (alle Kampf-Skills = L)

| Checkpoint | Melee | Ranged | Magie | im Band 0,90–1,10? |
|---|--:|--:|--:|---|
| **L10** | 1.05 | 1.00 | **1.11** | grenzwertig (Magie knapp drüber) |
| **L30** | 0.93 | 1.00 | **1.37** | ✗ Magie-Decke |
| **L55** | 0.90 | 1.00 | **1.29** | ✗ Magie-Decke, Melee am Rand |
| **L99** | **0.62** | 1.00 | **0.70** | ✗ Ranged-Decke, Melee-Boden |

### Modus B (strikt stil-eigene Kampf-Skills)

| Checkpoint | Melee | Ranged | Magie | im Band? |
|---|--:|--:|--:|---|
| **L10** | 1.07 | 1.00 | **1.11** | grenzwertig |
| **L30** | 0.98 | 1.00 | **1.38** | ✗ Magie-Decke |
| **L55** | 0.87 | 1.00 | 1.05 | ✗ Melee am Rand (Magie hier im Band) |
| **L99** | **0.71** | 1.00 | **0.66** | ✗ Ranged-Decke, Melee+Magie-Boden |

**Paarweise Spannweite (Modus A):** L10 1.00–1.11, L30 0.93–1.37, L55 0.90–1.29, L99 0.62–1.00.

---

## Urteil: Die Parität SITZT NICHT (3 von 4 Checkpoints außerhalb des Bandes)

Die R2-Hebel haben das Bild **verschoben, nicht geschlossen** — und an einer Stelle die Decke nur
**von Magie zu Ranged verlagert**:

1. **L10 — weitgehend gelöst.** Die frühere Ranged-Früh-Dominanz (BEFORE 1.40× melee) ist weg:
   Ranged ist früh eher das untere Ende, Melee ≈ Ranged, Magie ~1.11 (haarscharf über Band).
   Hebel E2 (Ranged-Krit/Tempo-Trim, Früh-Bogen-Malus) **wirkt**. ✅ (bis auf Magie-1.11-Randwert)

2. **L30 — UNGELÖST: Magie-Decke ~1.37–1.38×.** Praktisch **unverändert** zum BEFORE (1.41).
   Der `int·2→1.7`-Trim ist für die Mitte zu sanft, und Hebel A hat nur die **L99-voidweave**
   getrimmt — die **mid-Roben + Wand+Spezial-Fokus** (z. B. `frost_focus` 16, `aether_orb` 24,
   `steel/blacksteel_wand` −300 ms) spiken weiter. Magie-`attackDamage` L30 = 148–152 vs.
   Ranged 76–86 bei vergleichbarer Trefferchance → Decke.

3. **L55 — Magie-Decke (Modus A 1.29) bzw. Melee-Boden (beide Modi 0.87–0.90).**
   Mode-abhängig, aber nie alle drei im Band. Magie zieht hier aus `adamantium_wand+aether_orb`
   (atk 268) bzw. `stormcaller_rod+aether_orb`.

4. **L99 — UNGELÖST, Decke gekippt: jetzt RANGED dominant.** Magie wurde von 1.45 auf **0.66–0.70
   überkorrigiert** (voidweave-/Fokus-/int-Trims + Mana-Schild-Tier-Skalierung schneiden im Endgame
   jetzt zu tief). **Ranged ist die neue Decke**, **Melee der Boden (0.62–0.71)**. Treiber Ranged-L99:
   schnellstes Intervall (1278 ms Modus A / 1575 ms strikt vs. Melee 1575–2075, Magie 1600–2580),
   `+rangedDamage`-Backbone (voidhide) **plus** `ammoDamage +32`/Schuss **plus** der `leatherworking→dex`,
   der **fünf** Ranged-Stats speist (dmg/crit/Tempo/Eva/Acc). Melee bleibt trotz Platten-Backbone +
   `smithing→str` (atk 358 ist konkurrenzfähig!) hinten, weil es **kein** schnelles Intervall und
   **keinen** Per-Schuss-Flat wie Munition hat.

### Zusatz-Checks aus der Aufgabe

- **„Magie L99 nicht mehr 1,5×+"?** ✅ erfüllt — sogar **überkorrigiert** (jetzt 0.66–0.70, unter Band).
- **„Melee mid/late nicht mehr ~0,7×"?** ❌ **nicht** erfüllt — Melee L99 = **0.62–0.71**, mid L55 = 0.87–0.90.
  Melee ist weiterhin der strukturelle Boden im Endgame (early L10 1.05 ist dagegen okay).
- **„Ranged nicht mehr 2,9× tankiger (Evasion)"?** ⚠️ nur **teilweise**. L99-Evasion best-gear:
  Melee **105** (Modus A) / **80** (strikt) vs. Ranged **236 / 212** → **2,2–2,65×**. Verbessert
  gegenüber 2,9×, aber **nicht** auf Parität. Hinweis: Melee tankt real über def (489–516) + HP
  (1961) statt Evasion — die reine Evasion-Lücke bleibt aber bestehen (dex-getrieben + voidhide-eva
  noch ~112 pro 5 Teile).

---

## Rest-Hebel (für CEO-Entscheidung — NICHT gefixt, nur benannt)

| Befund | Zahl | Vermuteter Hebel | Revier |
|---|---|---|---|
| Magie mid-Decke L30 | 1.37–1.38× | mid-Roben-`magicDamage` + Spezial-Foki (`frost_focus`/`aether_orb`/`void_focus`) trimmen **oder** `int`-Koeff./Wand-`magicDamage` weiter senken (Hebel A wirkte nur auf L99-voidweave) | content / logic |
| Magie L99 unter Band | 0.66–0.70× | Überkorrektur: etwas voidweave-`magicDamage` zurückgeben **oder** Mana-Schild-Tier-Skalierung (`MANA_SHIELD_TIER_DIVISOR`) milder | content / combat |
| Ranged L99-Decke | ranged = Decke | top-Tier `ammoDamage` senken **oder** Ranged-Intervall-Bonus bei hohem dex weiter dämpfen **oder** `leatherworking→dex`-Beitrag reduzieren (speist 5 Stats) | content / logic |
| Melee Endgame-Boden | 0.62–0.71× | effektives Melee-Intervall senken (Platten-`attackIntervalMs`-Malus weiter runter) **oder** Melee-Per-Hit-Flat (Munitions-Äquivalent) | content |
| Ranged-Evasion 2,2–2,65× Melee | eva 236 vs 105 | voidhide-Evasion weiter kürzen (Hebel E1 nur teil-gewirkt) **oder** Plattenträger etwas Evasion geben | content |

---

## Incidental-Befund (außerhalb dieser Aufgabe, P2 — Messhygiene)

`packages/engine/src/sim.ts` `GEARED_HERO` rüstet **nicht existierende** Item-IDs aus:
`godiron_blade / godiron_helm / godiron_body / godiron_legs / godiron_shield` — im Content existieren
nur `godiron_sword / godiron_fullhelm / godiron_platebody / godiron_platelegs / godiron_kiteshield`.
`equipItem` no-opt't auf unbekannte IDs → der „geared Endgame-Held" der Balance-Sim kämpft faktisch
**ohne Rüstung/Waffe** (nur `str10/con10` + combatLevel 90). Das untergräbt die Aussagekraft der
`pnpm test`-Wall-/AUFFÄLLIGKEITEN-Garde im Endgame. **Empfehlung:** IDs in `sim.ts` korrigieren
(logic-/content-Revier-Abstimmung via CEO). Nicht im Rahmen dieser read-only-Messung gefixt.

---

## Methodik-Notizen / Konfidenz

- **Loadout-Wahl** je Stil/Level: DPS-Proxy-Top-8 aus dem craftbaren Pool, dann **10-min-Kurz-Sim**
  (Status/Mana/Munition real) → bestes; danach volle 1-h-Messung. So fließen Burn/Frost/Shock-DoT,
  Mana-Depletion und Munition korrekt ein (nicht nur ein Roh-DPS-Proxy).
- **Mob-Mittelung** glättet die starke Stat-Sensitivität einzelner Mobs (z. B. niedrig-def-Mobs
  bevorzugen schnelle Stile). Konfidenz **L10/L30 hoch** (10 Mobs), **L55 mittel** (5),
  **L99 niedriger** (nur 2 craftbar-on-level Mobs: aether_wraith 98, idol_warden 92) — die L99-Richtung
  (Ranged-Decke, Melee-Boden) ist aber in **beiden** Mobs und **beiden** Skill-Modi konsistent.
- Essen/Auto-Eat für alle Stile identisch (cooked_voidray, Tier 3) → 0 Tode in allen Läufen,
  d. h. die Faktoren spiegeln **Offense/effektive DPS**, nicht Überlebens-Glück.
- Harness war ein **temporäres** Sim-Skript in der Engine; nach dem Lauf **entfernt**
  (`packages/**` unverändert, `pnpm typecheck` grün). Es wurde **kein Spiel-Code geändert**.
