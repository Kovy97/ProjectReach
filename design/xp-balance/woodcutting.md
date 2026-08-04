# XP-Balance-Bericht — Holzfällen (`woodcutting`)

**Skill:** woodcutting · **Cap:** Level 99 · **Aktionen:** 16 · **Datum:** 2026-07-01
**Autor:** Balance-Designer · **Status:** Analyse + Empfehlungen (noch NICHT eingepflegt — Single-Writer-Domäne Content)

> Nur-Lesen-Audit. Zahlen sim-validiert gegen `pnpm --filter @hearthforge/engine test` (Sim-Fenster 2 min, ungeared, KEIN Holzfäll-Werkzeug, keine Mastery). Empfehlungen betreffen ausschließlich `xp`-Felder in `packages/content/src/index.ts`; Einpflegen erst nach Chef-Freigabe durch content-dev.

---

## 1. Datengrundlage — alle 16 Aktionen

Basis-XP/h = `xp · 3_600_000 / durationMs` (ohne Werkzeug/Mastery). Ziel = `target_xph(L) = 90·√(xpForLevel(L+1) − xpForLevel(L))`. Sim-XP/h aus dem Testlauf zur Gegenprobe.

| id | Lreq | xp | durationMs | Basis-XP/h | Sim-XP/h | target_xph(Lreq) | Verhältnis (Basis/Ziel) |
|---|---|---|---|---|---|---|---|
| cut_normal_tree | 1 | 2 | 2800 | 2571 | 2520 | 820 | **3.14** |
| cut_birchwood_tree | 5 | 3 | 3200 | 3375 | 3330 | 1002 | **3.37** |
| cut_oak_tree | 10 | 4 | 3600 | 4000 | 3960 | 1285 | **3.11** |
| cut_willowbark_tree | 15 | 5 | 4050 | 4444 | 4350 | 1647 | **2.70** |
| cut_ashbark_tree | 20 | 6 | 4500 | 4800 | 4680 | 2107 | 2.28 |
| cut_grimwood_tree | 25 | 7 | 4750 | 5305 | 5250 | 2697 | 1.97 |
| cut_blackwood_tree | 30 | 8 | 5000 | 5760 | 5760 | 3451 | 1.67 |
| cut_blightwood_tree | 38 | 9 | 5250 | 6171 | 5940 | 5123 | 1.20 |
| cut_ironbark_tree | 45 | 14 | 5500 | 9164 | 8820 | 7240 | 1.27 |
| cut_bloodoak_tree | 55 | 27 | 6500 | 14954 | 14580 | 11873 | 1.26 |
| cut_ashfen_tree | 63 | 33 | 6750 | 17600 | 16830 | 17640 | **1.00** |
| cut_shadowpine_tree | 70 | 62 | 7000 | 31886 | 31620 | 24944 | 1.28 |
| cut_wraithwood_tree | 78 | 77 | 7500 | 36960 | 36960 | 37065 | **1.00** |
| cut_bonewood_tree | 85 | 150 | 8000 | 67500 | 67500 | 52417 | 1.29 |
| cut_voidwood_tree | 92 | 177 | 8600 | 74093 | 74340 | 74127 | **1.00** |
| cut_godwood_tree | 99 | 350 | 9000 | 140000 | 136500 | — (Cap) | 1.40 |

Sim ≙ Basis (Abweichung nur Sampling-Rundung des 2-min-Fensters). Werkzeug/Mastery (unten) beschleunigen später zusätzlich und sind hier bewusst ausgeklammert.

Alle Loot-Tabellen: garantiert 1× Tier-Log + `birds_nest` mit steigender Chance (0.010 → 0.050). Keine Inputs, keine Verarbeitungsmarge. Gold/h steigt sauber und monoton (2.9k → 420k g/h) und ist kein Problemfeld.

---

## 2. Monotonie — bestanden

Basis-XP/h **streng monoton steigend** über alle 16 Tiers (in Level-Reihenfolge):

```
2571 → 3375 → 4000 → 4444 → 4800 → 5305 → 5760 → 6171 →
9164 → 14954 → 17600 → 31886 → 36960 → 67500 → 74093 → 140000
```

Keine flachen Plateaus, keine Rückschritte, **keine toten Zwischen-Tiers**. Die Code-Kommentare zeigen, dass frühere Läufe (`monoton-fix`, `run6-fix`) genau das bereits repariert haben. Der Sim meldet **0 gestallte Aktionen, keine 0-XP/h-Aktion** — keine roten Flags im Sim-Sinn.

---

## 3. „Diabolische" Fälle — hier KEINE

Der Chef-Anker („1 XP für eine Aktion mit Level 8 ist diabolisch") trifft auf Holzfällen **nicht** zu:

- Kleinste XP-Werte (2, 3, 4, 5) liegen alle bei **niedrigem** `levelRequired` (1/5/10/15). Kein einziger hoher Level-Gate mit Mini-XP.
- Die niedrigen Tiers sind **absichtlich über die Formel angehoben** (`run6-fix: floor angehoben`): die Formel wollte hier `xp = 1` (round(820·2800/3.6M)=1), gesetzt ist 2. Das ist **anti-brutal** und genau richtig — es verhindert das „1-XP-Gefühl".

**→ Wichtige Leitplanke für die Umsetzung: Die niedrigen Tiers (L1–L30) NICHT absenken.** Ihr hohes Verhältnis (1.7–3.4× Ziel) ist Floor-Padding gegen die 1-XP-Brutalität, kein Balance-Fehler. Ein reines „auf-die-Formel-glätten" würde normal→1, birch→2, oak→3 setzen und die vom Chef beklagte Brutalität *wieder einführen*. Das lehnen wir ab.

---

## 4. Kurven-Analyse — Zeit bis Level-up (beste freigeschaltete Aktion, Basis, ohne Werkzeug/Mastery)

| L | beste Aktion | XP/h | XP für L→L+1 | Stunden |
|---|---|---|---|---|
| 1 | normal | 2571 | 83 | 0.03 |
| 10 | oak | 4000 | 204 | 0.05 |
| 20 | ashbark | 4800 | 548 | 0.11 |
| 30 | blackwood | 5760 | 1470 | 0.26 |
| 38 | blightwood | 6171 | 3240 | 0.53 |
| 45 | ironbark | 9164 | 6471 | 0.71 |
| 50 | ironbark | 9164 | 10612 | 1.16 |
| 55 | bloodoak | 14954 | 17404 | 1.16 |
| 63 | ashfen | 17600 | 38416 | 2.18 |
| 70 | shadowpine | 31886 | 76818 | 2.41 |
| 78 | wraithwood | 36960 | 169608 | 4.59 |
| 85 | bonewood | 67500 | 339198 | 5.03 |
| 92 | voidwood | 74093 | 678376 | 9.16 |

**Gesamtzeit L1→99 (Basis, ohne Werkzeug/Mastery): ≈ 265 h.** Mit bestem Werkzeug (godwood-Axt `speedMult 0.50` ≈ 2× schneller) plus Mastery ≈ **130 h oder weniger** — für einen Idle-Sammelskill akzeptabel (läuft offline/nebenbei). Kein Brutalitäts-Problem im Zeitbudget.

---

## 5. Das eigentliche Problem — asymmetrischer Sägezahn (Late-Game-Dellen)

Jede Aktion startet beim Freischalten über Ziel und sinkt bis zum nächsten Tier darunter. Entscheidend ist die **Amplitude** dieses Sägezahns. Die Sprünge beim Freischalten sind ungleichmäßig:

```
+31% +19% +11% +8% +11% +9% +7% | +48% +63% +18% +81% +16% +83% +10% +89%
```

Die großen Sprünge (ironbark +48 %, bloodoak +63 %, shadowpine +81 %, bonewood +83 %) **wechseln sich ab** mit Mini-Sprüngen (ashfen +18 %, wraithwood +16 %, voidwood +10 %). Folge: Die Formel-exakten Tiers (ashfen/wraithwood/voidwood, Verhältnis 1.00 beim Unlock) fallen bis zum Ende ihrer Spanne auf **0.74× Ziel** — das sind die spürbaren „Walls" direkt VOR den großen Belohnungssprüngen.

| Aktion | Spanne | Verhältnis Unlock | Verhältnis am Spannen-Ende | Delle |
|---|---|---|---|---|
| cut_blightwood_tree | L38–44 | 1.20 | 0.90 | grenzwertig |
| cut_ironbark_tree | L45–54 | 1.27 | **0.81** | **Delle (breiteste Lücke, 10 Level)** |
| cut_bloodoak_tree | L55–62 | 1.26 | 0.89 | ok |
| cut_ashfen_tree | L63–69 | 1.00 | **0.74** | **Delle (vor shadowpine +81 %)** |
| cut_shadowpine_tree | L70–77 | 1.28 | 0.90 | ok |
| cut_wraithwood_tree | L78–84 | 1.00 | **0.74** | **Delle (vor bonewood +83 %)** |
| cut_bonewood_tree | L85–91 | 1.29 | 0.96 | ok |
| cut_voidwood_tree | L92–98 | 1.00 | **0.74** | **Delle (vor godwood +89 %)** |

**Muster:** „74 %-Schlick → plötzlicher +80–90 %-Sprung". Genau dieses Wechselbad fühlt sich zäh an (erst spürbar langsamer, dann schlagartig Erleichterung). Die Reparatur ist, die drei Formel-exakten Tiers auf das gleiche Kopf-Polster (~1.15–1.20 beim Unlock) wie ihre Nachbarn anzuheben — der Sägezahn wird gleichmäßig und flach (Dellen steigen von 0.74 auf ~0.86).

**Cross-Skill-Beleg (Sim, gleicher Level):** Fischen-Geschwister liegen bei L63/78/92 bei ~23.9k / 48.2k / 87.9k XP/h — Holzfällens ashfen/wraithwood/voidwood bei nur ~16.8k / 37.0k / 74.3k XP/h (≈ 70–77 % davon). Die drei Tiers sind auch im Skill-Vergleich die Ausreißer nach unten.

---

## 6. Empfehlungen

### 6a. Primär — die drei Late-Game-Dellen heben (Kern-Fix, anti-brutal)

Ziel jeder Aktion in die Nähe von `target_xph(Mittelpunkt der Spanne)` bringen, damit Unlock-Polster und End-Delle symmetrisch/flach werden. Nur `xp` ändern, `durationMs` bleibt.

| id | level | current (xp) | target (xph @Lreq) | recommended (xp) | neue XP/h | Verhältnis Unlock → Ende |
|---|---|---|---|---|---|---|
| cut_ashfen_tree | 63 | **33** | 17640 | **38** | 20267 | 1.15 → 0.85 |
| cut_wraithwood_tree | 78 | **77** | 37065 | **90** | 43200 | 1.17 → 0.87 |
| cut_voidwood_tree | 92 | **177** | 74127 | **205** | 85814 | 1.16 → 0.86 |

Begründung: Diese drei stehen aktuell exakt auf der Unlock-Formel (Verhältnis 1.00) und sacken deshalb als einzige auf 0.74 ab. Das leichte Anheben (+15 % xp) gibt ihnen dasselbe Kopf-Polster wie shadowpine/bonewood und hebt die Dellen auf ~0.86 — der Sägezahn wird gleichmäßig. Monotonie bleibt strikt erhalten (20267 liegt zwischen bloodoak 14954 und shadowpine 31886; 43200 zwischen 31886 und bonewood 67500; 85814 zwischen bonewood 67500 und godwood 140000). Die neuen Raten treffen zudem fast punktgenau die Fischen-Geschwister (43.2k vs 48.2k; 85.8k vs 87.9k) → Cross-Skill-Parität verbessert sich.

**Peaks (shadowpine 62, bonewood 150, godwood 350) NICHT absenken.** Ein strikt-symmetrisches Glätten würde sie um ~5–30 % kürzen (godwood 350→249), was pro-brutal wäre und dem Chef-Ziel widerspricht. Monotonie ist bereits erfüllt — wir heben die Täler, statt die Gipfel zu kappen.

### 6b. Sekundär (optional, strukturell) — die 10-Level-Lücke L45→L55 füllen

Der breiteste Gap (ironbark L45 → bloodoak L55, 10 Level) erzeugt die ironbark-Delle auf **0.81** bei L54. Rest des Skills folgt einer 7–8-Level-Kadenz — diese Lücke ist der Ausreißer. Empfehlung: **eine Füller-Aktion bei ~L50** einziehen (analog zu den bereits ergänzten birch/willow/grim/blight/ashfen-Füllern).

- Vorschlag: `cut_duskwood_tree`, `levelRequired: 50`, `durationMs: 6000`, **`xp: 17`** → 10 200 XP/h.
- Passt sauber zwischen ironbark (8820) und bloodoak (14580); ironbark-Spanne schrumpft auf L45–49 (Delle verschwindet, min. Verhältnis ~1.04), duskwood-Delle nur noch ~0.90.
- Benötigt zusätzlich ein neues Log-Item (`duskwood_log`) + Drop/Verkaufswert zwischen ironbark_log und bloodoak_log — das ist Content-dev-Domäne. Daher **optional**; ohne Umsetzung ist die 0.81-Delle tolerabel (Werkzeug/Mastery maskieren sie teilweise).

### 6c. Nicht anfassen

- **L1–L30 (normal…blackwood):** hohe Verhältnisse (1.7–3.4×) sind gewolltes Floor-Padding gegen das 1-XP-Gefühl. Belassen.
- **godwood L99:** Cap-Tier, kein „nächstes Level" — die 1.40× sind reines Endgame-Flex für Gold/Crafting. Belassen.
- **blightwood L38 (Delle 0.90):** grenzwertig, aber innerhalb ±10 % Ziel. Belassen (bei Umsetzung von 6b bleibt es unberührt).

---

## 7. Verdikt

**Brutalitäts-Note: 2 / 5 (mild).**
Holzfällen ist **nicht** die Quelle der Chef-Beschwerde — es ist monoton, floor-gepolstert (anti-1-XP) und im Zeitbudget fair (≈130 h mit Werkzeug bis Cap). Die verbleibenden Mängel sind reine „Feel"-Themen: drei Late-Game-Täler auf 0.74× Ziel und eine zu breite Mid-Game-Lücke.

**Top-3-Fixes (geordnete Apply-List für content-dev):**
1. `cut_ashfen_tree` — **xp 33 → 38** (L63-Delle 0.74 → 0.85)
2. `cut_wraithwood_tree` — **xp 77 → 90** (L78-Delle 0.74 → 0.87)
3. `cut_voidwood_tree` — **xp 177 → 205** (L92-Delle 0.74 → 0.87)

Optional strukturell: neue Füller-Aktion `cut_duskwood_tree` @L50 (durationMs 6000, xp 17) + Item `duskwood_log`, um die 10-Level-Lücke L45→L55 zu halbieren (ironbark-Delle 0.81 → ~1.04).

Alle drei Primär-Änderungen erhalten strikte Monotonie und heben KEINEN Peak ab. Nur `xp`-Felder betroffen; `durationMs` und Loot unverändert.
