# QA-Run 4 — Combat-Tiefenanalyse: MAGIE (nach Fixes)

**Tester:** Playtester-Analyst (READ-ONLY, keine Content/Engine-Änderung) · **Datum:** 2026-06-27
**Scope:** Magie-Stil nach `manaCost ×1.5` (27 Magie-Waffen), Mana-Schild, MAGIC_WEAK_FACTOR, Burn-DoT, Stab/Wand/Fokus, Robe-Leiter inkl. neuer ember(L30)/voidweave(L99). Vergleich: `design/qa/run3-combat.md`.
**Fokus-Fragen (vom Chef):** Läuft Mana im Dauerkampf jetzt real knapp? Bekommt Mana-Schild/Weak-Factor echte Opportunitätskosten? Ist Magie mid-game nicht mehr überlegen (run3 L50 1.57×)? L99 noch im Band?

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`combatStep`, deterministischer Seed 12345), **1 h Spielzeit (36 000 Ticks)** je Build gegen den **on-level Mob** (Level-nächster Mob automatisch gewählt). **Stil-eigene Skill-Investition wie run3** (Magie: magic_off+magic_def+vitality → int/wis/con; Melee: attack+power+defence+vitality; Ranged: ranged+defence+vitality), **best-in-slot Gear pro Slot** per Score-Selektion (Magie→Roben/Foki, Melee→Platte, Ranged→Leder), Auto-Eat T3, voller Köcher, Melee im DPS-optimalen `power`-Stil (+12 %). Mana zu Kampfbeginn = max. Harness nach dem Lauf **entfernt**. Alle Zahlen unten sind reale Sim-Ausgaben.

> Hinweis zur Vergleichbarkeit: run4 nutzt den **aktuellen Content inkl. der neuen Fix-F-Roben** (ember L30, voidweave L99), die es in run3 nicht gab. Absolute kills/h weichen daher vom run3-Harness ab; relevant ist der **×-Faktor** (intern konsistent, gleicher Mob/gleiche Methode) und der **Mana-Verlauf**.

---

## Fun-Score: **6 / 10**  (run3: 7/10 — **−1**)

Die Magie-**Mechanik** ist tiefer geworden: der `manaCost ×1.5`-Nerf **plus** der Mana-Schild geben dem Mana endlich echtes Gewicht — aber **nur beim 2H-Stab und nur im Früh-/Mid-Game** (s. P2). Das erzeugt eine **echte Stab-vs-Wand-Identität** (Stab = Burn + Mana-Spannung, Wand+Fokus = Kontrolle + mana-satt + schneller) — ein klarer Depth-Gewinn. **Aber:** die **Parität ist gegenüber run3 regressiert.** Die bei L99 in run3 schön konvergierte Lücke (1.11×) ist durch die neue **voidweave-Robe (Fix F)** wieder aufgerissen (1.54–1.74×, **raus aus dem ±15 %-Band**), der Wand+Fokus-Build umgeht die Mana-Bremse komplett und ist mid+late der dominante Stil (1.74–1.84×), und am ganz unteren Ende (L10) ist Magie jetzt **überkorrigiert** und schwächster Stil (0.92×). Mechanisch reicher, balance-technisch an beiden Enden schlechter — netto leicht unter run3.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, on-level Mob; ×-Faktor relativ zum besten Nahkampf = Dolch/power)

| Build | L10 (goblin_butcher L10) | L40 (forest_warden L40) | L50 (roc_hunter L50) | L99 (aether_wraith L98) |
|---|---:|---:|---:|---:|
| **Dolch (melee/power)** | 709 (1.00×) | 353 (1.00×) | 362 (1.00×) | 443 (1.00×) |
| Kurzbogen (ranged) | 754 (1.06×) | 336 (0.95×) | 347 (0.96×) | 376 (0.85×) |
| **Stab (magic)** | 653 (**0.92×**) | 579 (**1.64×**) | 463 (**1.28×**) | 682 (**1.54×**) |
| **Wand+Fokus (magic)** | 682 (**0.96×**) | 650 (**1.84×**) | 634 (**1.75×**) | 772 (**1.74×**) |

**Magie-Begleitstats (Stab):** L10 dmg66/acc121/crit0.03/eva53/def29/hp219/aIMs2880 · L50 dmg272/acc308/crit0.08/eva107/def113/hp629 · L99 dmg599/acc637/crit0.29/eva176/def235/hp1176/aIMs2880. (Wand: gleiche Roh-Stats, aber aIMs −300 → 2580 und +Fokus-Mana/Crit.)

### Δ vs run3 (Magie-×-Faktor)
| Checkpoint | run3 magic | run4 Stab | run4 Wand+Fokus | Δ |
|---|---:|---:|---:|---|
| L10 | **1.33×** | 0.92× | 0.96× | **−0.4** (Magie jetzt unter Melee — Überkorrektur) |
| L50 | **1.57×** | 1.28× | 1.75× | Stab −0.29 (besser), Wand +0.18 (**schlechter**) |
| L99 | **1.11×** | 1.54× | 1.74× | **+0.4…+0.6** (raus aus dem Band — Regression) |

**Antwort auf die Kernfragen:** (1) „Mid-game nicht mehr überlegen?" — **Stab ja** (1.57×→1.28×), **Wand nein** (1.75×, sogar schlimmer). (2) „L99 noch im Band?" — **Nein**, regressiert von 1.11× auf 1.54–1.74×.

---

## Mana-Verlauf (1 h Dauerkampf, Pool min/avg/max, Anteil Ticks mit Mana < Cast-Kosten = Weak-Melee-Fenster)

| Build | maxMana | min | avg | Cost | Regen/Cast-Intervall | below-cost % | Burn-Uptime |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Stab L10** (iron_staff) | 104 | **0** | 13 | 9 | 10.4 | **29.1 %** | dauerhaft |
| Stab L40 (mithril_staff) | 236 | 78 | 195 | 14 | 19.9 | 0 % | dauerhaft |
| **Stab L50** (adamantium_staff) | 281 | **0** | 34 | 15 | 24.2 | **18.8 %** | dauerhaft |
| Stab L99 (godiron_staff) | 560 | **507** | 549 | 24 | 43.2 | **0 %** | dauerhaft |
| Wand+Fokus L10 | 116 | 0 | 51 | 6 | 9.5 | 5.7 % | — (frost) |
| Wand+Fokus L50 | 315 | 0 | 270 | 9 | 22.4 | **0.1 %** | — (shock) |
| Wand+Fokus L99 | 650 | 618 | 646 | 12 | 40.2 | **0 %** | — (shock) |

**Lesart — entscheidend:** In **jedem** Tier ist `Regen/Cast-Intervall ≥ Cost` (z.B. L50 Stab: Regen 24.2 > Cost 15). **Casten allein deplettiert Mana also nie** — der `manaCost ×1.5`-Nerf für sich genommen ist weiterhin inert (run3-Befund B4 bleibt für den reinen Cast-Loop gültig). Dass der Pool beim **Stab L10/L50 trotzdem auf 0 fällt** (29 % / 19 % Weak-Melee), kommt **fast ausschließlich vom Mana-Schild**, der eingehende Treffer mit 2 Mana/HP abfängt und denselben Pool leert. Genau das ist die intendierte Opportunitätskosten-Kopplung — **sie greift jetzt real**, aber nur dort, wo der Magier (a) Treffer kassiert und (b) keinen mana-spendenden Fokus trägt → **nur der 2H-Stab, nur früh/mid**. Bei L99 ist der Pool (560/650) + Regen (15/s) so groß, dass selbst Cast+Schild ihn nicht drücken (min 507) → **Mana ist endgame wieder komplett inert**.

---

## Top-Stärken (Magie)

1. **Mana-Schild hat jetzt echte Zähne — am 2H-Stab.** Früh/mid leert der Schild den Pool real (L10 29 %, L50 19 % Weak-Melee), der `MAGIC_WEAK_FACTOR (0.35)`-Notschlag feuert tatsächlich (run3: nie). Damit ist Magies „Burst + Sustain + Defense ohne Spannung" für den Stab gebrochen.
2. **Echte Stab/Wand/Fokus-Identität.** Stab = höchster Roh-Schaden (0.85·D) + dauerhafter **Burn-DoT** (burnTicks ~always-on über alle Tiers) + teuerster Cast (8→24) + Mana-Spannung. Wand = Kontrolle (frost T1–4 → shock T5–12) + billiger Cast (5→12) + −300 ms Intervall. Fokus = reiner Stat-Stick (+magicDmg/+maxMana/+manaRegen/+critChance). Drei klar unterscheidbare Rollen — gute Tiefe.
3. **Burn-DoT sauber & exklusiv.** Nur Stäbe legen Burn (an echten Cast gekoppelt — Weak-Melee legt keinen), Wands nie (frost/shock), Foki nie. Tier-eskalierende Magnitude (1→31) funktioniert. Konsistent mit der Content-Spec.
4. **Robe-Leiter lückenlos.** Lehrling→Frost(L20)→**Glut/ember(L30)**→Aether(L45)→Arkan(L58)→Runenwirk(L72)→Götzenfunken(L88)→**Leerengewebe/voidweave(L99)**. Die in run3 Fix F geforderte L22→L40-Lücke schließt ember sauber (magic-off 30 Gate, +magicDmg/+int).

---

## Priorisierte Findings

### [P0] — keine. Keine Crashes, NaN-Drift, 0 Tode über alle Magie-Läufe; Save-Guards greifen.

### [P1 Balance] L99-Parität durch voidweave-Robe (Fix F) überschossen — Magie raus aus dem Band
**Befund:** run3 hatte L99-Magie sauber konvergiert (**1.11×**, im ±15 %-Band). run4: **Stab 1.54×, Wand+Fokus 1.74×** — klar drüber. Treiber ist die neue **voidweave-Robe-Stufe** (magic-only, req 99): body `magicDamage 40 / int 17 / crit 0.05 / critDamage 0.18`, voidweave_set `+magicDamage 36 / crit 0.05 / critDamage 0.20`. Magie-Schaden springt L99 **391 (run3) → 599 (Stab) / 600 (Wand)**, Crit **0.13 → 0.29**. **Melee/Ranged bekamen kein paralleles neues L99-Top-Tier** (Platte endet bei godiron, Leder bei dragonhide-Klasse) → die Robe ist ein einseitiger Power-Step. Eine Robe-Leiter, die L99 schließen *sollte*, hat es **wieder aufgerissen**.
**Fix-Vorschlag (content/balance):** voidweave-Werte zurücknehmen, bis L99-Magie ~1.1–1.15× trifft (z.B. body-magicDamage 40→28, set-magicDamage 36→22, crit/critDamage des Sets streichen) **oder** ein gleichwertiges godiron+-Top-Tier für Platte/Leder ergänzen (Parität durch Symmetrie statt Nerf).

### [P1 Balance] Wand+Fokus umgeht die Mana-Bremse vollständig und ist der dominante Magie-Build
**Befund:** Der `manaCost ×1.5`-Nerf + Mana-Schild erzeugen Druck **nur am 2H-Stab** (kein Offhand-Slot). Der **Fokus** trägt +maxMana **und** +manaRegen und **neutralisiert exakt den Nerf**: Wand+Fokus below-cost **0–0.1 %** über alle Tiers, dazu billigerer Cast (5→12 statt 8→24) und −300 ms Intervall. Resultat: Wand+Fokus ist an **jedem** Checkpoint ab L40 der **stärkste Durchsatz-Stil** (1.74–1.84×) **ohne** Ressourcen-Kehrseite. Die intendierte Mana-Opportunitätskosten ist also **opt-out** — wer sie spüren will, muss den schlechteren (Stab-)Build spielen.
**Fix-Vorschlag:** Fokus-`maxMana`/`manaRegen` deutlich trimmen (der Fokus sollte Burst/Crit liefern, nicht die Mana-Spannung auflösen) **oder** Wand-`manaCost` an Stab-Niveau anheben, damit auch der schnelle 1H-Caster den Pool spürt. Ziel: Mana-Druck soll buildunabhängig existieren, nicht nur den Stab bestrafen.

### [P2 Balance] Mana-Knappheit ist Schild-getrieben, nicht Cast-getrieben — und endgame wieder inert
**Befund (verifiziert):** `Regen/Cast-Intervall ≥ Cost` in **allen** Tiers (L50 Stab 24.2 vs 15) → reines Casten leert nie. Die gemessene Knappheit (Stab L10 29 %, L50 19 %) stammt vom **Mana-Schild** (2 Mana/HP). Bei L99 ist der Pool (560) + Regen (15/s) so groß, dass auch Cast+Schild ihn nicht drücken (min **507**) → **Mana endgame komplett inert** (run3-Befund B4 lebt dort weiter). Der ×1.5-Nerf liefert also keinen eigenständigen Mana-Loop; er verschärft nur leicht den Schild-Druck im Früh-/Mid-Game.
**Fix-Vorschlag:** Wenn Mana ein durchgehender Hebel sein soll: `manaRegen`-Skalierung (`1 + wis·0.3 + eq`) am oberen Ende dämpfen **oder** `MANA_SHIELD_COST_PER_DAMAGE` mit dem Tier skalieren, damit der Schild auch endgame in den Pool schneidet. Alternativ bewusst akzeptieren, dass Mana ein Früh-/Mid-Stab-Feature ist (idle-fair) — dann aber P1-Wand-Lücke schließen.

### [P2 Balance] L10-Magie unterschießt jetzt (schwächster Stil) — Überkorrektur am unteren Ende
**Befund:** run3 L10 Magie 1.33×; run4 **Stab 0.92×, Wand 0.96×** — unter Melee/Ranged. Ursache: Mini-Pool (104), den der Schild in ~28 s auf 0 zieht → 29 % Weak-Melee (×0.35-Schläge) bei ohnehin niedrigem iron_staff-Schaden, während der teurere Cast (iron_staff 9) den Wiederanlauf bremst. Der frühe Magier ist jetzt das Durchsatz-Schlusslicht — das exakte Gegenteil des run3-Bildes.
**Fix-Vorschlag:** Früh-Tier-`manaCost` der Stäbe (copper/bronze/iron 8–9) wieder Richtung 5–6 senken **oder** Schild-Absorb erst ab einem Mindest-Mana greifen lassen (kein Leerlaufen des Mini-Pools), damit der Einstieg nicht mana-erstickt.

### [P3 Balance] Strukturelle int-Skalierung bleibt der Overshoot-Treiber (run3 P2 offen)
**Befund:** `magicDamage = int·2 + magic_off·1.2 + eq` — `int·2` ist der höchste Attribut-Koeffizient aller Stile (melee str·1.5, ranged dex·1.2). Mit den int-schweren Roben (voidweave body **int 17**) stapelt sich der Term enorm (L99 int ≈ 92 → 184 Schaden allein aus dem Attribut). Solange `int·2` steht, drückt jedes neue Robe-Tier Magie überproportional nach oben — die Wurzel von P1.
**Fix-Vorschlag:** `int·2 → int·1.6–1.7` (run3-Vorschlag), dann voidweave/Foki nur fein nachjustieren.

### [P3 Politur] Spielerseitige Magie-Status weiterhin auf burn/frost/shock beschränkt
**Befund:** Stäbe burn, Wands frost/shock, Foki nichts. poison/bleed bleiben spielerseitig (auch magisch) ungenutzt — wie run3 P3. Kein Regressionspunkt, nur unverändert eng.

---

## Mechanik-Checks (Magie, alle bestanden)
- **Per-Waffe manaCost** korrekt gelesen (copper_staff 8, godiron_staff 24, copper_wand 5, godiron_wand 12; Staff > Wand im Tier). Fallback auf `MANA_PER_CAST` bei fehlendem/negativem Feld.
- **Cast → Weak-Melee → Regen → Resume** deterministisch, kein Hänger bei manaRegen-Boden; Weak-Melee legt keinen Burn (Effekt an echten Cast gekoppelt).
- **Mana-Schild** greift NACH Defense-Mitigation, gedeckelt (50 %/2 Mana je HP), endlich → keine Unsterblichkeit; draint denselben Pool wie Casten (verifiziert als Haupt-Mana-Senke).
- **Burn-DoT** ignoriert Rüstung, tickt korrekt, tier-eskalierend; Refresh statt Stacking.
- **accuracy** stil-abhängig an magic_off gekoppelt (run3-Fix B1 intakt): Magie trifft zuverlässig (L99 acc 637, miss ~0–2/Log).

## Fazit
Der Mana-/Schild-Loop ist **mechanisch reifer** als in run3 — echte Stab-vs-Wand-Spannung, Weak-Factor lebt. **Aber die Balance ist an beiden Enden schlechter:** L99 durch die voidweave-Robe überschossen (P1), L10 überkorrigiert (P2), und die Mana-Bremse ist per Wand+Fokus opt-out (P1). Die **eine große Stellschraube:** voidweave/Fokus-Werte zurücknehmen + `int·2` leicht senken — dann sitzt Magie wieder im ±15 %-Band, ohne die neu gewonnene Mana-Tiefe (Stab) zu verlieren.

*(Sim-Harness war temporär und wurde nach dem Lauf entfernt — keine Engine-/Content-Änderung.)*
