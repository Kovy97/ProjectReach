# Weapon-Damage-Scaling + Food-Ökonomie + Kampf-XP — Balance-Spec

**Autor:** balance-designer · **Datum:** 2026-07-06 · **Status:** AUDIT + SPEC (Zahlen-Vorschlag, kein Content geändert)
**Adressat:** CEO → content-dev (Waffen-/Food-Werte) · combat-dev/logic-dev (Engine-Konstanten, klar getaggt)
**Grounding:** `packages/content/src/index.ts` (245 Waffen geparst), `packages/engine/src/character.ts` (`computeStats`), `packages/shared/src/index.ts` (Konstanten), `packages/engine/src/sim.test.ts` (Sim-Lauf 2026-07-06).

---

## 0. Kernbefunde (TL;DR)

1. **Waffen-Scaling ist ein SÄGEZAHN, kein Ladder.** Die Tier-Schritte oszillieren wild: `+12 %` (blacksteel→mithril, Chef-Beispiel) neben `+87 %` (bronze→iron). Betroffen sind **alle 1H-Melee-Linien** (dagger/sword/scimitar/mace/axe/battleaxe) und **beide Fernkampf-/Magie-Materiallinien** (bow/staff/wand). Die 2H-Linien (greatsword/greataxe/maul) sind bereits gesund (~+20–26 %/Tier). **Spear** (2H) hat Spät-Dips (`+6 %`).
2. **Die Engine ADDIERT die Waffen-Basis auf den Charakter-Schaden** (`attackDamage = charDamage + weaponAvg`), sie multipliziert NICHT. Dadurch verwässert der Tier-Sprung im TOTAL noch stärker: blacksteel→mithril sind `+12 %` Waffen-DPS, aber nur **`+4.8 %`** im gefühlten In-Game-Total (bei gleichem Charakter-Level). Das ist die eigentliche Ursache des „fühlt sich nicht wie Upgrade an".
3. **SOLL: konsistente geometrische Kurve, `×1.25`/Tier (+25 % Waffen-DPS)** für alle 1H-/Ranged-/Magie-Materiallinien, verankert am aktuellen Iron-Wert (copper/bronze/iron bleiben). Ergebnis: jeder Tier-Schritt `+24–28 %` (in Chefs Zielband 25–40 %), gefühlter In-Game-Swap `~9–13 %` (verdoppelt die heutigen mittleren ~5 %). Decke steigt nur `×1.25–1.42`. **Sim-sicher** (Beweis §4).
4. **Food-Burn ist real, aber NICHT über die Heil-RATE lösbar** — die ist durch die „Rüstung-ist-Pflicht"-Garantie bei `~4 %/s` gedeckelt (naked-Inflow ~5 %/s). Hebel sind: **(a) Top-Schwelle 0.80→0.70** (frisst sonst bei Chip-Schaden) und **(b) größerer Bissen + längerer Cooldown bei gleicher Rate** (18 %/4.5 s statt 12 %/3 s) → **~⅓ weniger Food-Items** bei identischer Sustain. **healPct vs flat:** flat-tier-skaliert gewinnt bei Tier-Lesbarkeit & Low/Mid-Stärke → **Hybrid `max(flat, round(maxHp·pct))`** empfohlen (§5).
5. **Kampf-XP (nebenbei):** HEISS früh (2.5× Ziel @L15), KALT spät (0.34× @L90) — schadensbasierte XP wächst ~linear, die Skilling-Kurve exponentiell. **Kein flacher `MELEE_XP_PER_DAMAGE`-Buff** (überhitzt Früh-Game). Falls Endgame-Kampf-XP mithalten soll: level-skalierter `monster.xp`-Kill-Bonus (§6, EMPFEHLUNG, optional).

---

## 1. Wie Waffen-Basis ins Total geht (Engine-Fakten)

`computeStats` (character.ts), Range-Form-Waffe (hat `damageMin/Max`):

```
charDamage = (0.1 + str·0.3 + power·0.08) · dmgMult      // Melee, attack-Stance dmgMult=1
attackDamageMin = charDamage + weapon.damageMin (+ ammo)
attackDamageMax = charDamage + weapon.damageMax (+ ammo)
attackIntervalMs = weapon.attackIntervalMs − dex·40      // Waffe trägt das Tempo ABSOLUT
```

**Wichtig — der Chef-Merksatz „multipliziert mit STR/Power" stimmt so nicht:** die Waffen-Spanne wird **addiert**. Konsequenz: die Waffe ist nur EIN Summand neben `charDamage`. `charDamage` wächst mit power/str ~linear mit dem Level; ist bei den relevanten Tiers ungefähr **so groß wie die Waffen-Spanne selbst** (~50 % Anteil). Deshalb schrumpft ein Waffen-DPS-Delta im Total: ein Waffen-Tausch bei gleichem Level bringt `weaponAvgDelta / (charDamage + altWeaponAvg)`.

**Dilution-Modell (scimitar, power≈attack≈req, str=3+⌊power/8⌋):**

| Tier | req | charDmg | Waffe avg IST | Total avg | Waffen-DPS-Δ | **gefühlter Swap-Δ @Level** |
|---|---|---|---|---|---|---|
| steel | 20 | 3.20 | 2.70 | 5.90 | +25.6 % | +10.3 % |
| blacksteel | 30 | 4.30 | 3.70 | 8.00 | +37.0 % | +14.3 % |
| **mithril** | **40** | **5.70** | **4.15** | **9.85** | **+12.2 %** | **+4.8 %** ← Chef-Beispiel |
| adamantium | 50 | 6.80 | 5.30 | 12.10 | +27.7 % | +10.5 % |
| runite | 60 | 7.90 | 6.15 | 14.05 | +16.0 % | +6.4 % |
| bloodiron | 70 | 9.00 | 7.05 | 16.05 | +14.6 % | +5.9 % |

**Fazit:** die `+12 %`, die der Chef sieht, sind im tatsächlichen Kampf nur `~+5 %`. Und weil `charDamage` mitwächst, MUSS die Waffen-Basis **überproportional (geometrisch, nicht additiv-konstant)** steigen, damit der Tier-Sprung im Total spürbar bleibt. Genau das leistet eine `×r`/Tier-Kurve.

---

## 2. IST-Analyse: die Sägezahn-Kurve

**Ø Waffen-DPS pro Tier über alle 10 Melee-Typen** (weaponDPS = avg/Intervall, ohne Charakter):

| Tier | req | Ø weaponDPS | Δ zum Vortier |
|---|---|---|---|
| copper | 1 | 0.465 | — |
| bronze | 5 | 0.692 | **+48.7 %** |
| iron | 10 | 1.177 | **+70.0 %** |
| steel | 20 | 1.536 | +30.6 % |
| blacksteel | 30 | 2.087 | +35.8 % |
| **mithril** | 40 | 2.487 | **+19.2 %** |
| adamantium | 50 | 3.116 | +25.3 % |
| runite | 60 | 3.679 | **+18.1 %** |
| bloodiron | 70 | 4.252 | **+15.6 %** |
| titanium | 80 | 5.127 | +20.6 % |
| aetherium | 90 | 6.060 | +18.2 % |
| godiron | 99 | 7.295 | +20.4 % |

Der **Durchschnitts-Slope ist okay (~28 %/Tier)** — das Problem ist die **VARIANZ**: Schritte springen zwischen `+12 %` und `+87 %`. Die schlimmsten Einzel-Fälle (1H-Linien):

- **scimitar:** blacksteel→mithril **+12.2 %**, runite→bloodiron +14.6 %
- **dagger:** blacksteel→mithril **+8.7 %**
- **sword:** mithril +12.8 %
- **shortbow (ranged):** aetherium→godiron **+3.8 %** (avg 8.1→8.4), titanium→aetherium +8.1 %
- **staff (magic):** titanium→aetherium +6.0 %, aetherium→godiron +9.0 %
- **spear (2H):** titanium **+6.1 %**, godiron +9.3 %

Ursache: die IST-Kurven wachsen in **~konstanten absoluten Increments** (scimitar avg-Deltas: +0.45/+1.0/+0.55/+1.0/**+0.45**/+1.15/…). Ein Increment von `+0.45` ist bei Basis 0.70 = +64 %, bei Basis 3.70 = nur +12 %. Prozentual kollabiert die Kurve genau da, wo die Basis schon groß ist (Mid-/Endgame).

Die **2H-Linien greatsword/greataxe/maul sind bereits gesund** (durchweg +18–26 %, kein Dip < 14 %) — sie brauchen keinen Eingriff.

---

## 3. SOLL-Kurve

### 3.1 Regel (für content-dev)

> **Pro Materiallinie: copper/bronze/iron BLEIBEN. Ab steel gilt** `avg[Tier] = iron_avg · 1.25^(TierIndex−iron)`. **`damageMin`/`damageMax` behalten ihr aktuelles min:max-Verhältnis (Krit-Spread), auf 0.1 gerundet. `attackIntervalMs` bleibt UNVERÄNDERT** (Waffentyp-Identität: Maul langsam/hart, Scimitar schnell/leicht — Speed-Verhältnisse unangetastet).

- **`r = 1.25` = +25 % Waffen-DPS/Tier** → jeder Schritt landet nach Rundung bei **+24–28 %** (Chefs Band 25–40 %, sauber über der alten +12 %-Senke).
- Anwenden auf: **alle 1H-Melee** (dagger, sword, scimitar, mace, axe, battleaxe) + **ranged** (shortbow, longbow) + **magic** (staff, wand). → **Stil-Parität:** dieselbe Kurve/`r` für alle drei Stile; jede Linie an ihrem EIGENEN Iron verankert, damit die Stil-Identität (Ranged/Magie tragen bewusst ~10–20 % weniger Rohschaden, dafür Krit+Tempo bzw. Mana+Status) erhalten bleibt. **Nicht** Melee-Zahlen auf Bögen kopieren.
- **2H greatsword/greataxe/maul:** **NICHT anfassen** (bereits gesund).
- **spear (2H):** Dips glätten via keep-endpoints (`r≈1.19`, Decke bleibt) — Tabelle §3.4.

Warum copper/bronze/iron bleiben: (a) Früh-Game soll snappy bleiben (Onboarding), (b) die Sim-Baseline nutzt `bronze_sword` → unverändert ⇒ die gepinnten 14 Bronze-Auffälligkeiten kippen NICHT.

### 3.2 1H-Melee — konkrete SOLL-Werte (`damageMin`/`damageMax`, avg, weaponDPS)

**scimitar** (2650 ms) — Chef-Beispiel:

| Tier | req | IST min/max (avg, DPS) | **SOLL min/max (avg, DPS)** | Schritt |
|---|---|---|---|---|
| copper | 1 | 0.5/0.9 (0.70, 0.26) | 0.5/0.9 (0.70) | — |
| bronze | 5 | 0.8/1.5 (1.15, 0.43) | 0.8/1.5 (1.15) | — |
| iron | 10 | 1.5/2.8 (2.15, 0.81) | 1.5/2.8 (2.15) | — |
| steel | 20 | 1.9/3.5 (2.70, 1.02) | **1.9/3.5 (2.70, 1.02)** | +26 % |
| blacksteel | 30 | 2.6/4.8 (3.70, 1.40) | **2.4/4.4 (3.40, 1.28)** | +26 % |
| mithril | 40 | 2.9/5.4 (4.15, 1.57) | **2.9/5.4 (4.15, 1.57)** | +22 % |
| adamantium | 50 | 3.7/6.9 (5.30, 2.00) | **3.7/6.9 (5.30, 2.00)** | +28 % |
| runite | 60 | 4.3/8.0 (6.15, 2.32) | **4.6/8.6 (6.60, 2.49)** | +25 % |
| bloodiron | 70 | 4.9/9.2 (7.05, 2.66) | **5.7/10.7 (8.20, 3.09)** | +24 % |
| titanium | 80 | 6.1/11.3 (8.70, 3.28) | **7.2/13.3 (10.25, 3.87)** | +25 % |
| aetherium | 90 | 7.1/13.2 (10.15, 3.83) | **9.0/16.7 (12.85, 4.85)** | +25 % |
| godiron | 99 | 8.7/16.2 (12.45, 4.70) | **11.2/20.9 (16.05, 6.06)** | +25 % |

> Hinweis: einige Mid-Tiers (z. B. blacksteel) werden LEICHT gesenkt, weil sie IST ein Spike waren; die Mehrheit steigt. Das ist die Glättung.

**dagger** (2400 ms): steel 1.7/2.5 · blacksteel **2.1/3.2** · mithril **2.6/4.0** · adamantium 3.3/4.9 · runite **4.2/6.3** · bloodiron **5.2/7.8** · titanium **6.5/9.7** · aetherium **8.1/12.1** · godiron **10.2/15.2**

**sword** (2900 ms): steel **2.3/4.2** · blacksteel **2.9/5.4** · mithril **3.5/6.5** · adamantium **4.4/8.2** · runite 5.6/10.4 · bloodiron **6.9/12.8** · titanium **8.7/16.2** · aetherium **10.8/20.1** · godiron **13.6/25.2**
*(steel hat IST einen Dublette-Eintrag 3.2/4.8 @3000ms — content-dev bitte prüfen/vereinheitlichen.)*

**mace** (3000 ms): steel 2.4/4.4 · blacksteel **2.9/5.4** · mithril **3.7/6.8** · adamantium **4.6/8.5** · runite **5.8/10.8** · bloodiron **7.2/13.4** · titanium **9.0/16.6** · aetherium **11.2/20.9** · godiron **14.1/26.1**

**axe** (3100 ms): steel **2.4/4.4** · blacksteel **2.9/5.5** · mithril **3.7/6.9** · adamantium **4.6/8.6** · runite 5.8/10.7 · bloodiron **7.2/13.3** · titanium **9.0/16.8** · aetherium **11.3/21.0** · godiron **14.0/26.1**

**battleaxe** (3250 ms): steel **2.7/5.1** · blacksteel **3.4/6.4** · mithril **4.2/7.8** · adamantium **5.3/9.9** · runite 6.6/12.3 · bloodiron **8.3/15.4** · titanium **10.3/19.1** · aetherium **13.0/24.1** · godiron **16.1/30.1**

### 3.3 Ranged & Magic — konkrete SOLL-Werte (Stil-Parität, `r=1.25` from iron)

**shortbow** (2650 ms): steel **1.6/2.4** · blacksteel **2.0/3.0** · mithril **2.5/3.7** · adamantium **3.1/4.7** · runite **3.9/5.8** · bloodiron **4.9/7.4** · titanium **6.1/9.1** · aetherium **7.7/11.5** · godiron **9.5/14.3** *(IST-godiron 6.7/10.1 war extrem flach → Decke ×1.42; korrigiert eine kaputte Kurve)*

**longbow** (3000 ms): steel **1.6/2.6** · blacksteel **2.0/3.4** · mithril **2.5/4.1** · adamantium **3.1/5.3** · runite **3.9/6.5** · bloodiron **4.9/8.2** · titanium **6.1/10.1** · aetherium **7.6/12.7** · godiron **9.5/15.8**

**staff** (3000 ms): steel **1.7/2.6** · blacksteel **2.1/3.2** · mithril **2.7/4.1** · adamantium **3.3/4.9** · runite **4.2/6.2** · bloodiron **5.2/7.7** · titanium **6.5/9.8** · aetherium **8.1/12.2** · godiron **10.2/15.2**

**wand** (2700 ms): steel **1.3/1.6** · blacksteel **1.6/2.1** · mithril **2.0/2.6** · adamantium **2.6/3.3** · runite **3.2/4.1** · bloodiron **4.0/5.2** · titanium **5.1/6.4** · aetherium **6.3/8.0** · godiron **7.9/9.9**

> Ranged/Magie behalten ihre Nicht-Tier-Drops (odd reqs, z. B. `stagstride_longbow` req24) — diese liegen als „Chase"-Interpolation ZWISCHEN den geglätteten Tier-Ankern; content-dev nach dem Tier-Apply gegenprüfen, dass ein Drop nicht über dem nächsten vollen Tier liegt.

### 3.4 spear (2H) — Dips glätten, Decke bleibt (keep-endpoints `r≈1.19`)

steel **3.1/5.2** · blacksteel **3.7/6.1** · mithril **4.4/7.4** · adamantium **5.2/8.7** · runite **6.2/10.3** · bloodiron **7.3/12.2** · titanium **8.8/14.6** · aetherium **10.4/17.3** · godiron 12.3/20.6 (unverändert)
> Achtung: das SENKT Mid-Spear ~15–20 % (IST war front-loaded). **Alternative, falls kein Mid-Nerf gewünscht:** nur die drei Dip-Tiers anheben (titanium 9.8/16.3→**11.0/18.4**, bloodiron ok, godiron 12.3/20.6→**13.5/22.6**). Chef-Entscheidung.

### 3.5 Fallback-Variante „Null-Decken-Änderung"

Falls der Chef die Endgame-Decke exakt halten will (keine Economy-Berührung): **keep-endpoints je Linie** (glätte zwischen aktuellem iron & godiron). Ergibt nur `~+21.5 %`/Tier (unter Chefs Band, aber Sägezahn weg, Decke unverändert). Empfehlung bleibt `r=1.25` (§3.1) — die Decken-Inflation ist sim-sicher (§4).

---

## 4. Sim-Sicherheit: warum das die Garantien NICHT kippt

**Struktureller Beweis:** Waffen-Schaden wirkt AUSSCHLIESSLICH offensiv. Er beeinflusst weder eingehenden Schaden, Rüstung/Mitigation, dodge/block/ward noch HP. Daher gilt invariant:

1. **„0 echte Walls" (geared unbesiegbar):** eine Wall = der Held STIRBT (Survival). Mehr Waffen-Schaden = schnellere Kills = **weniger** eingesteckter Schaden = SICHERER. Ein Waffen-Buff kann eine Wall nur ENTFERNEN, nie erzeugen. Der geared Held (`godiron_sword`) tötet heute alles mit **0 Toden**; `godiron_sword` avg 15.55→19.40 (×1.25) ⇒ ~25 % schnellere Kills, weiterhin 0 Tode.
2. **„Rüstung bleibt Pflicht":** das hängt an eingehendem Schaden vs. Mitigation/Heilrate — **völlig unabhängig vom Waffen-Schaden**. Naked bleibt naked.
3. **Gepinnte 14 Bronze-Auffälligkeiten:** die Baseline nutzt `bronze_sword` — in meinem Vorschlag **unverändert** (copper/bronze/iron bleiben). ⇒ Bronze-Sim **bit-identisch**, Pin hält.
4. **Einziger Sim-Effekt:** geared **gold/h steigt ~25 %** (schnellere Kills) auf den godiron-Farm-Zeilen. Das ist eine ECONOMY-Notiz, keine Wall — content-dev kann bei Bedarf Top-Mob-`gold` leicht trimmen. Der Sim-Test asserted keine Kill-Zahlen (nur `finite` & `≥0`).

**1H↔2H-Parität bleibt:** godiron-scimitar SOLL-DPS 6.06 (1H, erlaubt Schild) vs. maul 13.41 (2H, kein Schild) — 2H weiter ~2.2× Waffen-DPS = klarer Glass-Cannon. Der 1H-Buff verringert nur die Lücke, die 1H VORHER zu groß hatte (1H war die unterversorgte, flache Klasse).

---

## 5. FOOD-/AUTO-EAT-ÖKONOMIE (CEO-Zusatz)

### 5.1 IST-Mechanik (verifiziert)

- Heilung: `consumableHeal = healPct != null ? round(maxHp·healPct) : healAmount` (shared:702). **Fast alle Foods setzen `healPct` ⇒ der flache `healAmount` ist toter Fallback-Code.** Food heilt heute **rein prozentual**.
- `AUTO_EAT_TIERS` Schwellen = **0.5 / 0.6 / 0.7 / 0.8**, alle `healMult = 1.0`. T3 (80 %) frisst schon bei 20 % Chip-Schaden.
- `AUTO_EAT_COOLDOWN_MS = 3000` (max 1 Bissen/3 s).
- healPct-Bänder: Basis-Food **0.05–0.09**, Spezialgerichte 0.08–0.12, Feasts 0.10–0.12; Tränke (Herblore, eigener Auto-Trank-Track) 0.12–0.25.

### 5.2 Die harte Grenze: Heil-RATE ist gedeckelt

Max. Sustain = `Bissen-% / Cooldown_s`. Aktuell Top-Food `12 % / 3 s = 4 %/s`.

| Bissen | Cooldown | Rate | Armor-Guard |
|---|---|---|---|
| 9 % | 3 s | 3.0 %/s | ok |
| **12 %** | **3 s** | **4.0 %/s** | ok (IST) |
| 18 % | 4.5 s | 4.0 %/s | ok (SOLL) |
| 18 % | 3 s | 6.0 %/s | ✗ > naked-Inflow (~5 %/s) → Rüstung optional |
| 25 % | 4.5 s | 5.6 %/s | ✗ |

**Kernpunkt:** die naked-v2-Inflow (~5 %/s, Chef) ist die „Rüstung-Pflicht"-Garantie. Steigt die Heil-RATE darüber, kann ein nackter Held face-tanken → Garantie kippt. Das aktuelle 4 %/s liegt bereits knapp darunter. **Man kann Food-Burn NICHT durch „mehr Heilung/Sekunde" lösen.** Der Hebel ist die STRUKTUR des Fressens, nicht die Rate.

### 5.3 Warum es sich „schwach" anfühlt & zu viel burnt

1. **80 %-Schwelle × kleiner Bissen = Dauer-Fressen.** Bei Schwelle 0.8 + 9 %-Bissen landet man nach dem Essen bei ~89 % und fällt sofort wieder unter 80 % → nahezu jeden Chip-Treffer wird gegessen. Maximaler Item-Verbrauch.
2. **round(maxHp·pct) ist bei kleinem maxHp mickrig.** Beispiel bear_haunch (L48-Food, `healPct 0.06`) bei ~63 maxHp = **round(3.8) = 4 HP**. Der alte flache `healAmount` war 5 → **das %-Modell hat Mid-Food sogar genervt.** Das ist die „fühlt sich schwach an"-Wahrnehmung.
3. **Über-Level-Kämpfe (Chef: L54-Mobs mit Attack 48):** Über-Level-Inflow übersteigt die 4 %/s-Decke → man frisst permanent UND ist in Gefahr. Das ist teils gewollter Über-Level-Druck, aber verstärkt den Burn.

### 5.4 healPct (%maxHP) vs. FLAT tier-skaliert — Verdikt

| | % maxHP (IST) | Flat tier-skaliert |
|---|---|---|
| Tier-Progression fühlbar | ✗ jede Stufe ~gleiche % → „Tiers gleich" | ✓ „heilt 12 → 20 → 34" liest sich als Upgrade |
| Low/Mid-Stärke | ✗ round() → winzige/0-Heilung bei kleinem maxHp | ✓ garantierter Substanz-Heal |
| Skaliert mit riesigem End-maxHp | ✓ automatisch | ✗ fester Flat wird %-anteilig klein |
| Heil-RATE (der eigentliche Schwach-Faktor) | durch Armor-Guard bei ~4 %/s gedeckelt — **identisch für beide** | dito |

**Empfehlung: HYBRID `heal = max(flatTier, round(maxHp · pct))`** (Chef-Option c, flat-gewichtet).
- **`flatTier`** trägt die gefühlte Tier-Leiter + Low/Mid-Stärke (dominiert on-level).
- **`pct`** (angehobener Floor ~0.10) fängt sehr hohes End-maxHp ab, damit Food nie hinter einem riesigen Balken zurückfällt.
- Der Chef hat recht, dass **rein-%** falsch ist (Tiers verschwimmen, Mid-Nerf durch Rundung). Rein-flat ist aber am Endgame riskant (fixer Wert wird %-klein) — deshalb `max(...)`.

### 5.5 Konkrete SOLL-Werte

**Engine/shared (combat-dev + logic-dev):**
- `AUTO_EAT_COOLDOWN_MS` **3000 → 4500**.
- `AUTO_EAT_TIERS`-Schwellen **[0.5, 0.6, 0.7, 0.8] → [0.45, 0.55, 0.62, 0.70]** (Top-Tier hört auf, Chip zu fressen; behält Tier-Staffelung).
- `consumableHeal` Auflösung **`healPct != null ? round(maxHp·pct) : healAmount`  →  `max(healAmount, round(maxHp·pct))`** (flat = fühlbare Leiter + Floor, % = High-HP-Floor).
- Peak-Sustain bleibt **~4 %/s** (18 %-Bissen / 4.5 s) ⇒ Armor-Guard & 0-Walls unberührt. Effekt: **~⅓ weniger Food-Items** bei gleicher Sustain (größerer Bissen, seltener) + jeder Heal ist eine große, befriedigende Zahl.

**Content (content-dev) — `healAmount` (flat) neu als Tier-Leiter (~18 % des level-typischen maxHp, ~1.3×/Tier); `healPct` als Floor auf ~0.10–0.12 anheben.** Repräsentative Bänder (IST healPct → SOLL flat / pct-Floor):

| Food-Band (Cooking-Lvl) | ~maxHp | IST healPct (Heal HP) | **SOLL flat** | SOLL pct-Floor |
|---|---|---|---|---|
| Shrimp/Chicken (L3–5) | ~15 | 0.05 (1) | **3** | 0.12 |
| Trout/Beef (L11–15) | ~25 | 0.05–0.06 (1–2) | **5** | 0.12 |
| Salmon (L35) | ~50 | 0.05 (3) | **9** | 0.11 |
| Bear Haunch (L48) | ~65 | 0.06 (4) | **12** | 0.11 |
| Lobster (L55) | ~80 | 0.06 (5) | **15** | 0.11 |
| Anglerfish/Wyvern (L70–72) | ~110 | 0.08 (9) | **20** | 0.11 |
| Voidray (L85) | ~160 | 0.10 (16) | **30** | 0.11 |
| Soulfish/Feast (L95–98) | ~210 | 0.09–0.12 (19–25) | **40** | 0.11 |

> maxHp-Spalte ist eine Schätzung (`maxHp = 5 + con·2 + (vit−1)·0.3 + eqHp`); combat-dev soll den Flat je Band an das reale on-level-maxHp = **~18 % davon** eichen. Der Flat wächst dadurch schneller als das rein-% (das nur ~9–12 % lieferte) ⇒ Food fühlt sich stark an, ohne die 4 %/s-Decke zu reißen (der Cooldown 4.5 s hält die Rate).

**Nicht anfassen:** Heiltränke (0.12–0.25, eigener Auto-Trank-Track mit längerem Cooldown) sind bereits stark & tier-gestaffelt — sie liefern schon das „starke Heilung"-Gefühl. Fokus liegt auf Cooking-Food.

---

## 6. KAMPF-XP-RATE (nebenbei, klar getrennt)

### 6.1 Befund

Skilling-Ziel `target_xph(L) = 90·√(xpFor(L+1)−xpFor(L))` (verifiziert: L1=820, L48=8 398, L98=99 767; Anker `Δxp(48→49)=8 707` ✓). Reale Skilling-Aktionen laufen **~6× über** dieser Referenz (Sim: cook_bear_shank L48 = 55 800 XP/h; cut_voidwood L92 = 496 000 XP/h) ⇒ ~43 h/Skill (#232) passt.

Kampf-XP ist **schadensbasiert** (`damage·1.3·styleFactor·mult`, attack-Stance-Split 55/45). Modell (on-level Mob, on-level scimitar, DPS aus der Engine-Formel):

| L | Kampf-DPS | atk-XP/h | +pow/h | +vit/h | Skilling-Ziel/h | atk ÷ Ziel |
|---|---|---|---|---|---|---|
| 15 | 1.87 | 4 081 | 3 339 | 2 854 | 1 647 | **2.48×** |
| 30 | 3.32 | 7 378 | 6 037 | 5 160 | 3 451 | 2.14× |
| 48 | 4.71 | 10 633 | 8 699 | 7 435 | 8 398 | 1.27× |
| 60 | 6.24 | 13 993 | 11 449 | 9 785 | 15 206 | 0.92× |
| 70 | 7.26 | 16 281 | 13 320 | 11 385 | 24 944 | 0.65× |
| 90 | 10.36 | 22 899 | 18 735 | 16 013 | 67 139 | **0.34×** |

**Kampf-XP ist HEISS früh, KALT spät.** Crossover ~L60. Ursache: Schadens-XP wächst ~linear mit DPS, die Skilling-Kurve exponentiell. Gegen REALE Skilling-Aktionen (die ~6× über der Referenz liegen) ist Endgame-Kampf pro Skill **~10–20× langsamer**. Das ist strukturell (idle-typisch: Kampf zahlt in Gold+Drops, Skilling in XP-Tempo) — teils gewollt (Combat = fundamentaler Gold-/Mat-Pfad).

### 6.2 Empfehlung (EMPFEHLUNG, Chef-Entscheidung — NICHT Teil des Waffen-Applies)

- **KEIN flacher `MELEE_XP_PER_DAMAGE`-Buff.** Er hebt gerade das ohnehin heiße Früh-Game (2.5× @L15) weiter an und lässt die Endgame-Lücke fast unberührt (dort ist DPS, nicht der Faktor, der Engpass).
- **Wenn** Endgame-Kampf-XP mithalten soll: **level-skalierter `monster.xp`-Kill-Bonus** statt Damage-Faktor. Heute ist `monster.xp` vernachlässigbar (~1–2 % der Kampf-XP). Vorschlag-Formel: `monster.xp ≈ k · target_xph(monster.level) · TTK_on-level / 3600` mit `k ≈ 0.4–0.6`, sodass ein on-level-Kill einen Bonus in Höhe von ~40–60 % der Skilling-Referenz-Rate zusteuert — das wächst automatisch mit der Kurve und wirkt gezielt spät (früh sind die Mob-Levels/`target_xph` klein). `combatXpLevelMult` (XP=0 ab +15 Level über Mob) verhindert weiterhin Low-Mob-Dauerfarm.
- **Alternativ (mein Rat):** so lassen. Kampf ist per Design der Gold-/Drop-Pfad (geared 100–550k g/h) und trainiert 3 Skills gleichzeitig; „Kampf-Skills langsamer als reines Skilling" ist ein legitimes Idle-Pacing. Die Waffen-Kurve (§3) ist die dringlichere Baustelle.

---

## 7. APPLY-LIST (für content-dev, nach Chef-OK)

**A. Waffen (Kern):**
1. **1H-Melee** (dagger, sword, scimitar, mace, axe, battleaxe): `damageMin`/`damageMax` der Tiers **steel→godiron** ersetzen gemäß §3.2. `attackIntervalMs`, copper/bronze/iron **unverändert**.
2. **ranged** (shortbow, longbow) + **magic** (staff, wand): steel→godiron ersetzen gemäß §3.3.
3. **spear**: steel→godiron gemäß §3.4 (oder nur Dip-Tiers — Chef-Wahl).
4. **greatsword/greataxe/maul: NICHT anfassen.**
5. Danach: prüfen, dass Nicht-Tier-Drops (odd-req Bögen/Stäbe) nicht über dem nächsten vollen Tier liegen; ggf. Top-Mob-`gold` leicht trimmen (geared g/h +25 %).

**B. Food (CEO-Zusatz) — gemischtes Ownership:**
6. *(combat-/logic-dev)* `AUTO_EAT_COOLDOWN_MS` 3000→4500; `AUTO_EAT_TIERS`-Schwellen → [0.45, 0.55, 0.62, 0.70]; `consumableHeal` → `max(healAmount, round(maxHp·pct))`.
7. *(content-dev)* Cooking-Food `healAmount` (flat) neu als Tier-Leiter (~18 % on-level-maxHp, §5.5); `healPct`-Floor auf ~0.10–0.12. Tränke unverändert.

**C. Kampf-XP:** nur EMPFEHLUNG (§6.2) — kein Apply ohne separaten Chef-Beschluss.

**Gegenprobe nach Apply:** `pnpm test` / `sim.test.ts` — erwartbar: Bronze-Auffälligkeiten **bleiben 14** (bronze_sword unberührt), „ECHTE WALLS" **bleibt leer**, geared g/h steigt leicht. Weicht die 14 ab → nicht blind neu pinnen, sondern gegen on-tier/geared-Killbarkeit prüfen.
