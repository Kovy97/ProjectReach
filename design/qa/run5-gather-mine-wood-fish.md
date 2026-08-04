# QA Run 5 — Gathering: Mining · Woodcutting · Fishing

> Playtester-Persona: Gathering-Sammler (Mining + Woodcutting + Fishing). Fokus: Erz-/Holz-/Fisch-Leitern
> lückenlos + Senken, XP/h-Kurven, die offenen run4-P3-Reste (XP-Dips an Lückenfüllern, Mining-Pause L55→L70).
> Methode: READ-ONLY Daten-Audit von `packages/content/src/index.ts` (actions/recipes) + `packages/engine/src/leveling.ts`
> (XP-Kurve). Temporäres Sim-Harness für XP/h, Leiterlücken & Senken-Spotcheck (`scratchpad/sim.mjs`, nach Lauf entfernt).
> Vergleich: `run4-gather-mine-wood-fish.md`. Stand 2026-06-28.

## Fun-Score: **9 / 10**   (Δ vs run4: **±0**, war 9/10)

Run-5-Kontext bestätigt: **seit run4 keine Gather-Änderungen**. Die frische Simulation reproduziert run4 1:1
(Total-XP 1→99 = **13.034.431** identisch; Wood-Grind ~269 h / Fishing ~224 h identisch; alle Leitern gleich
besetzt). Der Sammel-Loop bleibt **lückenlos verdrahtet und totzonenfrei** — und genau deshalb bleibt der Score
unverändert: es gab nichts zu reparieren, aber auch keinen der run4-Polish-Hebel zog jemand. **Kein P0/P1/P2.**
Was unter 9,5 hält, sind dieselben kleinen Dämpfer wie in run4 — unten konkret benannt.

---

## Regressions-/Senken-Check (frisch verifiziert) — ALLES INTAKT

| Prüfpunkt | Run5-Befund | Status |
|---|---|---|
| Mining-Leiter | 12 Erze (copper/tin→godiron) + 8 Gem-Adern = 20 Aktionen | unverändert |
| Woodcutting-Leiter | 16 Hölzer (normal→godwood) | unverändert |
| Fishing-Leiter | 17 Rohfische (shrimp L1 … soulfish L97) | unverändert |
| 4 vormals tote Hölzer | `fletch_{willowbark,grimwood,ashfen,voidwood}`-Schildsenken vorhanden | gefixt (run4) hält |
| Fisch→Cooking | 37 `cook_*`-Rezepte (≥1:1 für alle 17 Rohfische) | intakt |
| Gem→Jewelcrafting | 8 `cut_*` (garnet…godgem) = 1:1 zu 8 Adern | intakt |
| Erz→Smithing | 255 erznutzende Schmiede-Rezepte | intakt |
| XP-Kurve | `leveling.ts` unverändert; Total-XP 1→99 = 13.034.431 | identisch run4 |

**Keine Vendor-Sackgasse, keine tote Leiterstufe, keine Senken-Regression.**

---

## Tier-Inventar & XP/h (Sim, xp/h = xp/durationMs·3,6e6)

**Mining — 20 Aktionen (12 Erz + 8 Gem), L1–95** (xp/h 2,4k → 180k):
copper/tin(1)·iron(10)·**coal(15)**·gravesteel(22)·mithril(35)·adamantite(45)·runite(55)·bloodiron(70)·titanium(80)·aetherite(90)·godiron(95);
Gems garnet(15)·bloodstone(25)·sapphire(35)·ruby(55)·diamond(75)·voidstone(82)·onyx(90)·godgem(95).
Größte **Erz**-Lücke: **15** (runite L55 → bloodiron L70).

**Woodcutting — 16 Tiers, L1–99** (xp/h 1,1k → 140k):
normal(1)·**birchwood(5)**·oak(10)·**willowbark(15)**·ashbark(20)·**grimwood(25)**·blackwood(30)·blightwood(38)·ironbark(45)·bloodoak(55)·ashfen(63)·shadowpine(70)·wraithwood(78)·bonewood(85)·voidwood(92)·godwood(99).
Größte Lücke: **10** (ironbark L45 → bloodoak L55).

**Fishing — 17 Tiers, L1–97** (xp/h 2,1k → 116k):
shrimp(1)·**murk_perch(5)**·trout(10)·cod(15)·ghostfin_pike(20)·shadowcarp(25)·ironscale_bass(30)·salmon(35)·duskfin_carp(45)·lobster(55)·crypteel(60)·bloodfang_eel(63)·anglerfish(70)·wraithscale(78)·voidray(85)·abyssal_crawler(92)·soulfish(97).
Größte Lücke: **10** (salmon L35 → duskfin_carp L45).

Aktive Grind-Zeit 1→99 (beste freigeschaltete Aktion): Woodcutting ~269 h · Fishing ~224 h · Mining ~213 h
(inkl. Gem-Adern; reine Erz-Sicht ~228 h wie run4). Idle-fair: Dauern 2,8–12,5 s, XP pro **abgeschlossener
Aktion** (`tick.ts`), Fangchance <1 senkt nur den Ertrag, nie die XP-Rate.

---

## Findings (alle P3 — Polish, kein Blocker) · zugleich „Was hält es unter 9,5?"

Gereiht nach Hebelwirkung Richtung 9,5:

### [P3-A] XP/h-Dips an Tiefstufen-Lückenfüllern — der psychologische Hauptdämpfer
Mehrere „neu freigeschaltete" Tiers liefern **weniger** xp/h als der direkt vorige, weil ihre XP per Formel
auf 1–2 abgerundet wird. Frisch belegt:
- Woodcutting: normal **2571** → birchwood(L5) **1125**; oak 3000 → willowbark(L15) **1778**; ashbark 3200 → grimwood(L25) **3032**.
- Mining: iron 3000 → coal(L15) **2571**.
- Fishing: shrimp 2400 → murk_perch(L5) **2057**.

Folge: Ein XP-optimierender Spieler **überspringt das gerade freigeschaltete Tier** und bleibt auf dem alten
Knoten — das widerspricht der „höchster Tier = bester"-Erwartung am direktesten und ist der spürbarste der kleinen
Dämpfer. Praktisch unkritisch (diese Tiers existieren v.a. als **Material** für Bögen/Schilde/Smithing), aber genau
hier verliert das Spiel die letzten 0,5 Punkte.
**Fix (klein, hohe Wirkung):** Tiefstufen-Lückenfüller-XP minimal über den Vorgänger heben (z.B. birchwood xp 1→2,
willowbark/coal entsprechend) **oder** im UI klar als „Material-Tier" labeln, damit die Erwartung stimmt.

### [P3-B] Mining: 15-Level-Erzpause L55→L70 (runite → bloodiron) — UNVERÄNDERT seit run3
Längste Single-Ladder-Lücke im gesamten Sammel-Scope. Dazwischen nur `mine_ruby_seam`@L55 (Gem), kein neues Erz.
Wer auf der Erzschiene grindet, hat 15 Level „nichts Neues". Offener Dauerbrenner.
**Fix (optional):** Zwischenerz @~L62 analog zur Woodcutting-Lückenfüller-Logik.

### [P3-C] Fishing: 10-Level-Pause L35→L45 (salmon → duskfin_carp)
Größte Fishing-Lücke. XP/h steigt sauber über die Lücke, aber spürbarer als die sonst dichte Leiter.
**Fix (optional):** ein L40-Fisch.

### [P3-D] Woodcutting: 10-Level-Gap L45→L55 (ironbark → bloodoak)
Größte Holz-Lücke; durch keine andere Wood-Aktion überbrückt. Nicht kritisch, aber der einzige spürbare Durchhänger
der sonst engen Holzleiter.
**Fix (optional):** ein L50-Holz.

### [P3-E] Gem-Adern: 20-Level-Lücke L35→L55 (sapphire → ruby)
Isoliert die größte Gem-Lücke; in der **kombinierten** Mining-Leiter durch adamantite@L45 überbrückt, daher kein
echter Leerlauf. Nur relevant, falls Gem-Schürfen als eigener Pfad gespielt wird.

---

## Δ vs run4
- **Inhaltlich: nichts.** Keine Gather-Daten- oder XP-Kurven-Änderung; Sim reproduziert run4 1:1 (Total-XP, Grind-Zeiten, Leiterbesetzung).
- **Senken: weiterhin 100 % verdrahtet** — frisch gegengeprüft (cook/fletch-Schilde/jewel-cut/smith), keine Regression.
- **Alle run4-P3 weiterhin offen** (A XP-Dips, B L55→L70-Erzpause, C Fishing L35→L45, D Wood L45→L55, E Gem L35→L55) — keiner wurde angefasst.
- **Fun-Score 9 → 9** (kein Auf-, kein Abstieg).

## Was fehlt für 9,5? (konkret die kleinen Dämpfer)
Genau **zwei** Eingriffe heben den Score über 9 — beide reines Tuning, kein neues System:
1. **XP-Dips der Tiefstufen-Lückenfüller glätten** (P3-A): floor-XP der „neuen, aber schwächeren" Tiers um +1 anheben
   **oder** sie im UI als „Material-Tier" kennzeichnen. Das ist der einzige Punkt, an dem der Sammler eine bewusste
   Anti-Entscheidung trifft („das neue Tier ignorieren") — ihn zu entschärfen bringt die größte gefühlte Verbesserung.
2. **Die 15-Level-Erzpause L55→L70 füllen** (P3-B): ein Zwischenerz @~L62. Beseitigt den längsten „nichts Neues"-Abschnitt.

Optional für die volle 10/10 zusätzlich C+D (je ein L40-Fisch / L50-Holz). Alles ohne Risiko für die bereits
totzonenfreie Senken-Verdrahtung.

## Verdict
Sammel-Trias Mining/Woodcutting/Fishing ist im Run5-Scope **stabil und totzonenfrei** — bestätigt durch frische
Gegenprobe, keine Regression seit run4. Score bleibt 9/10, weil exakt dieselben Polish-Hebel offen liegen.
Die letzten 0,5 Punkte sind ein klar definierter, risikoarmer Zweischritt: Lückenfüller-XP-Dips glätten + die
L55→L70-Erzpause füllen.
