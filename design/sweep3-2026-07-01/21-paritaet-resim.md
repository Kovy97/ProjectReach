# Sweep 3 — 21 Paritäts-Re-Sim-Gate (Kontrolleur), 2026-07-01

**Auftrag:** Pflicht-Re-Sim nach Einpflegen von `balance-pass3-2026-07-01.md`. Steht die Drei-Stile-Parität?
**Methode:** headless, echte Engine (`computeStats`/`combat`/`combatStep`/`SimPlayer`), realistisches On-Tier-Gear je
Stil (Melee=Metall+Scimitar, Ranged=Leder/Hide **mit** neuen dex-Mods + Longbow + Tier-Pfeile, Magie=Stoff+Staff).
Symmetrische Skills (Offense + Gear-Beruf + defence/vitality/mining = Tier-Level). Temp-Vitest-Skript, danach gelöscht.
**Zwei Signale gemessen** (wie 05-minmaxer): **1a analytische effektive DPS** (unsterblicher High-HP-Dummy, resist
entfernt, def erhalten → overkill-frei, das härteste Paritäts-Signal) **und 1b echte Kills/h** (reale on-tier Mobs,
0 Tode, Survival via con+elixir_renewal+autoEat3 normiert → die Grundwahrheit inkl. Overkill/Resist/Mana/Ammo).

**Einpflege-Verifikation (Stichprobe, alle bestätigt):** longbow-Flats runite/bloodiron/titanium/aetherium/godiron
64/74/84/94/102 · aetherium_staff `attackIntervalMs -220`/manaCost 8 · last_vengeance bleed 0.40/30/7000 ·
spectral bleed · precise `speedMult 1.0` (shared) · RANGED/MAGIC_XP_FACTOR 1.1 · `magicOffense = magic_off` (dungeon.ts)
· 30 dex-Modifier an Hide. **Guards grün:** `pnpm typecheck` (5/5), `pnpm test` (**491/491**, inkl. content-integrity/
styles/ranged-vs-magic/set-bonus/wiring-audit/ranged-xp/kill-xp/over-level/tower-monsters/combat-level), Client-Build ✓.
Balance-Sim endet **ECHTE WALLS — (keine)**.

---

## Kriterium 1 — Parität ±10 % je Tier (L20/40/60/90)

### 1a) Analytische effektive DPS (overkill-frei, resist entfernt) — relativ zu Melee (attack-Stance, konservativ)
| Tier | melee | ranged | magic (staff) | magic (wand) |
|---|---|---|---|---|
| L20 | Basis | **−20.1 %** | −9.2 % | −13.5 % |
| L40 | Basis | **−10.2 %** | −8.5 % | −1.7 % |
| L60 | Basis | −2.0 % | −5.4 % | −8.7 % |
| L90 | Basis | **+4.3 %** | **−12.8 %** | **−31.5 %** |

### 1b) Echte Kills/h (reale on-tier Mobs, 0 Tode) — relativ zu Melee
| Tier | Mob | ranged | magic |
|---|---|---|---|
| L20 | goblin | −5.9 % | −4.6 % |
| L40 | ash_tyrant | −6.5 % | +0.8 % |
| L60 | skeleton_warrior | +7.3 % | −3.0 % |
| L90 | skeleton_pyroclasp (resist **burn**) | +8.0 % | **−30.4 %** |
| L90 | forest_hare (kein resist, 362 HP) | +16.2 % | **−22.7 %** |

**Deutung der Signal-Diskrepanz:** Analytisch (overkill-frei) ist Ranged früh hart (−20 % L20), weil Melee-Scimitar
(`-300` aIMs) Ranged die Tempo-Kante nimmt und der Roh-Schaden noch klafft (maxHit 93 vs 137). In den **echten Kills/h**
(Overkill an Trash-Mobs frisst Melees Großhits) liegt Ranged aber an **JEDEM** Tier im Band (−5.9/−6.5/+7.3/+8.0 %).
→ **Ranged-Parität in der Praxis erreicht; das Endgame-Ranged-Loch ist geschlossen** (pass2 real −23 % → jetzt +8 %).

**Magie ist der neue Endgame-Nachzügler:** L90 generell **−12.8 %** (analytisch, resist-frei, faire def) — der
Uptime-Hebel #3 hat geholfen (pass2 −22 % → −13 %), **reicht aber NICHT auf ±10 %**. Gegen zähe/burn-resistente Mobs
kippt Magie hart (skeleton_pyroclasp −30 %). Ursache: Magie-Intervall bleibt lahm (staff 2680 ms vs Melee 2025 ms) bei
vergleichbarem maxHit (567 vs 574); der Burn-DoT trägt zu wenig und wird von Resist-Mobs kassiert. **Wand ist am L90 KEIN
Ausweg** (−31.5 % — niedrigerer magicDamage-Flat).

**Verdikt K1: FAIL** — **L90 Magie außerhalb ±10 %** (−12.8 % generell, −22…−30 % gegen zähe/resist-Mobs). Ranged +
Magie L20–L60 innerhalb Band (echte Kills/h). Frühgame-Ranged nur analytisch weich (Overkill-Artefakt), praktisch ok.

---

## Kriterium 2 — 0 echte Walls: CONFIRMED
| Ziel | Ergebnis (kills / deaths, geared) |
|---|---|
| boar L10 (frischer Melee, **attack-Stance**, steel) | **65 / 0** |
| idol_warden | melee 109/0 · ranged 117/0 · magic 87/0 |
| aether_wraith | melee 103/0 · ranged 112/0 · magic 80/0 |
| scale_skarn (regen 6) | melee 77/0 · ranged 86/0 · magic 60/0 |
| last_idol (regen 10, enrage) | melee 52/0 · ranged 58/0 · magic 39/0 |

Alle 3 Stile besiegen alle 4 Endbosse + boar, **0 Tode**. Magie killt langsamer (konsistent mit K1), aber **keine Wall.**

---

## Kriterium 3 — CL-Pacing gleicher Aufwand: CONFIRMED
Gleiche Zeit (90 min), gleiches Mob (goblin), Start-CL 15 → End-CL: **Melee 26 (+11) · Ranged 28 (+13) · Magie 28 (+13)**.
**Spread = 2 CL** (≤ ~2). Ranged **=** Magie (der `magic_off`-allein-Fix #9a + symmetrische XP-Faktoren #9b wirken —
Magie nicht mehr im CL geklemmt); Melee ~2 CL darunter = **bewusstes, faires Gegengewicht** (Spec #9c).

---

## Kriterium 4 — Ranged-Bleed gegen tanky/regen (void_titan): CONFIRMED (für Ranged)
Netto-DPS vs void_titan (regen 6, def 168, HP-Riese), relativ zu Melee:
| Gear | melee | ranged | magic |
|---|---|---|---|
| craftbar (aetherium) | Basis | **+12.7 %** | **−33.9 %** |
| godly (last_judgement / last_vengeance-bleed / last_condemnation) | 2.8 netDPS | **3.5 netDPS** | 2.0 netDPS |

**Ranged nicht mehr −27 %** (pass2) — dex-Mods + un-getaperte Flats + Stance heben Ranged sogar an die Spitze; der
godly-bleed (#4) landet nachweislich (Guard `ranged-vs-magic` grün) und macht Ranged vs Regen zum Top-Stil.
**Aber:** derselbe Testfall entlarvt **Magie** als neuen Regen-Nachzügler (**−34 %** craftbar) — def 168 zerlegt Magies
langsame Direkthits, Burn-Rate zu niedrig gegen regen 6.

---

## Überschießt Ranged? (Chef-Frage → Spec-Fallback)
**NEIN — kein Fallback nötig.** Die maßgebliche L90-Haupttabelle liegt bei **+4.3 % (analytisch) / +8.0 % (echte
Kills/h)** — beide **unter +10 %**. Ranged reitet zwar am **oberen** Bandrand (L60–90 real +7…+8 %) und übersteigt +10 %
nur in Rand-Regimen (void_titan +12.7 %, Trivial-Mob forest_hare +16.2 % = reines Tempo-Regime). Der Spec-Trigger
(„L90-effDPS-Tabelle >+10 % → aetherium/godiron 94→88 / 102→96") **greift nicht**. Den Flat zurückzunehmen würde Ranged
wieder unter Parität drücken (analytisch schon −20 %/−10 % bei L20/L40) **und** das echte Problem (Magie) nicht lösen.

---

## Gesamt-Verdikt & Empfehlung

| Kriterium | Ergebnis |
|---|---|
| 1 Parität ±10 % | **FAIL** — L90 Magie −12.8 % (generell) bis −34 % (tanky/regen). Ranged + Magie L20–L60 im Band; Ranged-Endgame **gefixt** (+4/+8 %). |
| 2 0 Walls | **CONFIRMED** (0 Tode, alle Bosse + boar in allen 3 Stilen). |
| 3 CL-Pacing | **CONFIRMED** (Spread 2 CL, Ranged=Magie, Melee −2 by design). |
| 4 Ranged-Bleed vs regen | **CONFIRMED** für Ranged (+12.7 %, nicht mehr −27 %); Nebenbefund: Magie −34 % craftbar. |

**Empfehlung: NACHJUSTIEREN (fix-then-ship).** Die Drei-Stile-Parität steht **fast** — der Nachzügler ist von Ranged
auf **Magie am L90** gekippt. Ein einziger gezielter Hebel bleibt offen (Spec #3-Contingency, weiterziehen):
- **[content-dev / balance-designer]** Magie-Endgame-Intervall/Uptime am craftbaren req60+ **tiefer** ziehen
  (z.B. staff `attackIntervalMs` aetherium/godiron −220/−240 → ~−300/−340, evtl. +kleiner craftbarer magicDamage-Nudge),
  Ziel L90 staff generell auf ±10 %. Magie ist intervall-gebunden, **nicht** flat-gebunden (maxHit ist bereits ≈ Melee).
- **[design]** Magies DoT-Identität wird von burn-Resist-Mobs (skeleton_pyroclasp etc.) genullt (−30 %). Prüfen, ob das
  gewollter Mob-Konter ist oder ein sekundärer (nicht-burn) Status/Teil-Penetration gebraucht wird.
- **Ranged NICHT anfassen** (Fallback 94→88 **nicht** anwenden). **Melee unverändert** (Referenz, konservativ gemessen).

*Kontrolleur, headless-verifiziert. Kein Spiel-Code geändert (Temp-Skript angelegt+gelöscht).*
