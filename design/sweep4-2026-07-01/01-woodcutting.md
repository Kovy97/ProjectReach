# Sweep 4 — 01 Woodcutting (Holzfällen) L1→99

**Agent:** Kontrolleur (QA) · **Datum:** 2026-07-01 · **Methode:** echter headless `SimPlayer`-Treiber
(temporäres Vitest-Skript, danach gelöscht) + statische Content-/Engine-Analyse.
Basis-XP/h ist bei Mastery 0 exakt (`action.xp × 3.6e6 / durationMs`); Band-Stunden analytisch
gerollt und gegen einen **echten** L1→55-Durchlauf validiert (Analytik 20.5 h vs. real 18.6 h →
real ~9 % schneller durch akkumulierte Mastery-Speed, d. h. die Analytik ist ein leicht
konservativer Überschätzer). Combat blieb aus (reiner-Skiller-Blickwinkel).

## NOTE: **B−**
Solide, monoton, sauber getaktet, mit funktionierendem Pet-Pfad/Mastery/Nestern und echten
Log-Sinks (Fletching). Zwei strukturelle Reibungen drücken die Note: die **Werkzeug-Progression
ist an Attack (Combat) gekoppelt statt an Holzfällen** (2× Durchsatz-Kluft für reine Skiller, und
das einzige Gather-Skill ohne Shop-Werkzeug), plus Polish-Lücken (Nest funktionslos, Pet-Drop ein
Münzwurf, sehr langer Endgame-Grind). Nichts davon ist ein Blocker.

---

## 1. XP/h-Kurve L1→99 (Basis, ohne Werkzeug, Mastery 0)

| Baum | Lvl | dur ms | xp | Basis-XP/h | logWert | Formel-Ziel@Start | ratioStart | ratioEnd |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 1 | 2800 | 2 | 2 571 | 2 | 820 | 3.14 | 2.70 |
| birchwood | 5 | 3200 | 3 | 3 375 | 4 | 1 002 | 3.37 | 2.76 |
| oak | 10 | 3600 | 4 | 4 000 | 8 | 1 285 | 3.11 | 2.55 |
| willowbark | 15 | 4050 | 5 | 4 444 | 12 | 1 647 | 2.70 | 2.22 |
| ashbark | 20 | 4500 | 6 | 4 800 | 18 | 2 107 | 2.28 | 1.87 |
| grimwood | 25 | 4750 | 7 | 5 305 | 25 | 2 697 | 1.97 | 1.62 |
| blackwood | 30 | 5000 | 8 | 5 760 | 35 | 3 451 | 1.67 | 1.18 |
| blightwood | 38 | 5250 | 9 | 6 171 | 50 | 5 123 | 1.20 | **0.90** |
| ironbark | 45 | 5500 | 14 | 9 164 | 70 | 7 240 | 1.27 | **0.81** |
| bloodoak | 55 | 6500 | 27 | 14 954 | 140 | 11 873 | 1.26 | 0.89 |
| ashfen | 63 | 6750 | 38 | 20 267 | 200 | 17 640 | 1.15 | 0.85 |
| shadowpine | 70 | 7000 | 62 | 31 886 | 280 | 24 944 | 1.28 | 0.90 |
| wraithwood | 78 | 7500 | 90 | 43 200 | 380 | 37 065 | 1.17 | 0.87 |
| bonewood | 85 | 8000 | 150 | 67 500 | 520 | 52 417 | 1.29 | 0.96 |
| voidwood | 92 | 8600 | 205 | 85 814 | 720 | 74 127 | 1.16 | 0.86 |
| godwood | 99 | 9000 | 350 | 140 000 | 1000 | – | – | – |

- **Monoton auf der Freischalt-Linie: JA** (kein toter/regressiver Tier). Beste Aktion je Band =
  immer der neu freigeschaltete Baum; kein Grund je auf ältere zu wechseln.
- `ratioStart/End` = Basis-XP/h ÷ Design-Formel `90·√Δxp`. Frühgame liegt **weit über** dem Ziel
  (bis 3.37×) → die ersten ~30 Level fliegen vorbei; ab L38 konvergiert es und sackt am **Band-Ende**
  leicht durch (Sawtooth). Tiefste Delle: **ironbark rEnd 0.81 @ L54** (dieses Level dauert ~23 %
  länger als die Formel vorsieht). Die Sweep-3-Fixes trafen ashfen/wraithwood/voidwood, nicht ironbark.
- Gesamt-XP L1→99 = **13 034 431** (Standard-RS-Kurve).

## 2. Werkzeug (Äxte) — gemessen

`normal_tree` XP/h: **kein Werkzeug 2 588** (analytisch 2 571 ✓), **copper_axe ×1.088**,
**godiron_axe ×2.012**. Der Tool-Faktor ist ein flacher Durchsatz-Multiplikator (gilt für alle Tiers).

- Alle Holzfäll-„Werkzeuge" sind **Kampf-Äxte** (`copper_axe` 0.92 … `godiron_axe` 0.50,
  index.ts:903–2437) mit `requirements: { attack: 1/5/10/20/30/40/50/60/70/80/90/99 }`.
- **Kein Beil im Shop.** Der Shop verkauft Spitzhacken (req `mining`) und Angelruten (req `fishing`)
  (index.ts:11014–11024), aber **kein** Holzfäll-Werkzeug.
- Neuer Charakter startet **ohne** Axt (Speed 1.0); copper_axe muss geschmiedet werden (kein Combat
  nötig), höhere Äxte sind ohne Attack-Level unbrauchbar.

## 3. Freischalt-Takt

16 Bäume: L1/5/10/15/20/25/30/38/45/55/63/70/78/85/92/99. Früh alle 5 Level, später 7–10.
Größte „trockene" Strecke: **L45→55 (10 Level, ~10.6 h copper ohne neuen Baum)**. Insgesamt
großzügig und gut getaktet — auf jedem Abschnitt kommt etwas Neues.

## 4. Voller L1→99-Rollup

| | reiner Skiller (copper 0.92) | voll gegeared (godiron 0.50) |
|---|---:|---:|
| Gesamtzeit (analytisch) | **~224 h** | **~122 h** |
| Gesamtzeit (real, mit Mastery-Speed) | **~205 h** | **~112 h** |
| Aktionen gesamt | 118 813 | 118 813 |
| min/Level Spanne | 2.1 (L1) → **599 (L92-98)** | 1.1 → 326 |

- Reiner Skiller ist **hart auf copper (×1.09) gedeckelt** → grob **2× langsamer** als ein
  Combat-Spieler mit godiron. Voll erreichbar, aber es ist die langsamste 99 aller drei Gather-Skills.
- Späteste 7 Level (voidwood, L92-98): **~70 h copper / 38 h godiron** — die eigentliche Grind-Wand.
  (Endgame-XP/Gold-Inflation ist laut Briefing bekannt & akzeptiert → nur Kontext.)

## 5. Drops / Skill-Pet (gemessen)

- **Vogelnest droppt über den echten Pfad** (bestätigt). Rate skaliert 1 % (normal) → 5 % (godwood).
  4h-Stichproben: normal 0.76 % (kleine Stichprobe, cfg 1.0 %), bonewood 5.00 % (cfg 4.5 %),
  godwood 5.75 % (cfg 5.0 %) — Werte > Config kommen vom Mastery-Doppelertrag (erwartet).
- **Nest ist funktionslos:** `birds_nest` (14 g) wird nirgends als Input genutzt (0 Treffer), kein
  Samen/Ring-Mechanismus. Über einen 99-Grind fallen ~3 500 Nester = nur ~50 k g reines Vendor-Gold.
- **Pet `rotbark`:** `dropChance 1/100000` je Aktion, Skill-Effekt `instantAction 5 %` (index.ts:13363).
  Über 118 813 Aktionen = **1.19 erwartete Drops** (Poisson λ=1.19 → ~30 % erreichen 99 **ohne** je das
  Pet zu sehen). Im echten L1→55-Run: kein Drop (erwartet ~0.4). Pfad ist korrekt, Rate ist ein Münzwurf.

## 6. Gold / Ökonomie

- Holzfällen gibt **kein direktes Gold** (keine `gold`-Felder auf den Cut-Aktionen). Einkommen =
  Logs/Nester verkaufen **oder** in Fletching stecken.
- **Echter Sink:** jeder Log-Tier → ein Bogen-Tier (fletch_*_shortbow/longbow), `normal_log` →
  Pfeilschäfte (index.ts:7499). Sauber verdrahtet, keine toten Logs.
- Vendor-Wert skaliert 2 g → 1000 g/Log. Endgame (voidwood) ~300 k g/h wenn alles verkauft; Frühgame
  ~2.5 k g/h. Exploit-frei (Auto-Bank/999-Stack füllen nur weiter, kein Dupe).

## 7. Mastery

- Pro-Aktion-Mastery folgt dem Skill-Level (ironbark endet L50, bonewood L85 …); die Retirement-Aktion
  godwood bleibt L1 (wird nie zum Leveln gegrindet — inhärent).
- **Pool** (Kapazität 16 × xpForLevel(20) = 71 520) erreicht den 95 %-Capstone bereits **Mid-Game**
  (während des ironbark-Bands) → dauerhaft **+8 % Speed, +8 % Doppelertrag**. Das ist der Grund, warum
  der Real-Run ~9 % schneller lief als die Basis-Analytik. Mastery „verpufft" nicht, ist aber leise
  (inkrementeller Durchsatz, kein sichtbares Freischalt-Event).

---

## Findings (schwerste zuerst; alle *confirmed*)

**[P2][balance/ux] Holzfäll-Werkzeug-Tier ist an Attack (Combat) gegated, nicht an Holzfällen — und kein Shop-Beil.**
Repro: `bestToolSpeed` → `meetsRequirements(axe)`; alle Äxte haben `requirements:{attack:N}`
(index.ts:909…2437). Spitzhacken req `mining`, Ruten req `fishing`; Shop führt beide, aber kein Beil
(index.ts:11014-11024). Erwartet: Gather-Tool skaliert mit dem eigenen Skill (wie Mining/Fishing),
kaufbar. Tatsächlich: reiner Skiller klebt auf copper (0.92, ×1.09), sieht iron/steel/…-Äxte, kann sie
aber nie nutzen; Combat-Spieler erreicht godiron (×2.0). Evidence: gemessen copper ×1.088, godiron
×2.012 (letzteres nur mit attack 99). **Owner: content-dev** (Daten) / logic-dev (falls Tool-Req-Semantik).

**[P3][balance] Später Sawtooth: ironbark-Band sackt auf 0.81× Ziel-XP/h @ L54.**
Repro/Evidence: rEnd ironbark 0.81 (L54), voidwood 0.86, bloodoak 0.89; übrige 0.85-0.96. → L54 dauert
~23 % länger als die Formel `90·√Δxp` vorsieht. Ironbark blieb bei den Sweep-3-Fixes außen vor.
**Owner: content-dev.**

**[P3][feel] Skill-Pet `rotbark` ist selbst auf 99 ein Münzwurf.**
1/100000/Aktion → 1.19 erwartete Drops über den vollen 99-Grind (118 813 Aktionen); ~30 % der Spieler
erreichen 99 ohne das Pet. Pfad korrekt, aber die Belohnung ist statistisch unsichtbar.
**Owner: content-dev (dropChance) / logic-dev (optional Pity).**

**[P3][feel] Vogelnest ist reine Vendor-Ware ohne Funktion.**
`birds_nest` nie als Input (0 Treffer), kein Öffnen/Samen/Ring. ~3 500 Nester über den Grind = ~50 k g
Trash. In RS/Melvor sind Nester ein Mini-Ziel (Samen/Ringe). **Owner: content-dev.**

**[P3][feel] Sehr große Zeit-pro-Level-Spanne (Kontext, nicht Bug).**
2.1 min/Level (L1) → ~599 min/Level (L92-98, copper); voll-99 ~205 h copper / ~112 h godiron.
Genre-typisch (Melvor), fällt aber unter die akzeptierte Endgame-Inflation → nur zur Kenntnis.

### Bestätigt sauber (nicht als Problem melden)
Monoton auf der Freischalt-Linie (kein regressiver Tier); Nester droppen über den echten Pfad;
Log→Fletching-Sink vollständig verdrahtet; Mastery-Pool greift ab Mid-Game (+8 %/+8 %);
Freischalt-Takt gut (16 Bäume, alle 5–10 Level).

---

## Top-3-Findings
1. **[P2]** Werkzeug-Progression combat-(attack-)gegated statt woodcutting-gegated; kein Shop-Beil → reiner Skiller 2× langsamer, tote sichtbare Axt-Tiers.
2. **[P3]** ironbark-Sawtooth (0.81× @ L54).
3. **[P3]** rotbark 1/100000 = ~30 % erreichen 99 ohne Pet; Vogelnest funktionslos.

## Top-3-Verbesserungen (Soll-Werte)
1. **Dediziertes Beil einführen:** `copper_hatchet … godiron_hatchet`, `type:"tool"`,
   `requirements:{woodcutting:1/10/20/30/40/50/60/70/80/90/99}`, `speedMult 0.92→0.50`, im Shop
   (Preise analog Spitzhacken 110→4500 g). **Alternativ:** den bestehenden Äxten die Tool-Speed an
   `woodcutting`-Level knüpfen (Wield weiter attack). Entkoppelt Holzfällen von Combat, spiegelt
   Mining/Fishing.
2. **ironbark xp 14→15** (9 164→9 818 Basis-XP/h) → rEnd @ L54 steigt von 0.81 auf ~0.87 (analog der
   ashfen/wraithwood/voidwood-Glättungen).
3. **rotbark dropChance 1/100000 → 1/40000** (Erwartung ~3.0/Grind, P(0)≈5 %) **oder** Vogelnest
   öffenbar machen (→ Farming-Samen / seltener Nest-Ring), damit die 3 500+ Nester ein Ziel statt
   Vendor-Trash werden.
