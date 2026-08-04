# QA Run 4 — Gathering: Mining · Woodcutting · Fishing (+ Cooking-Versorgung)

> Playtester-Persona: Gathering-Sammler. Fokus: Erz-Adern copper→godiron, Edelstein-Adern lückenlos,
> Woodcutting 16 Tiers (insb. die 4 vormals **toten** Hölzer willowbark/grimwood/ashfen/voidwood),
> Fishing-Tiers + Cooking-Versorgung. Methode: READ-ONLY Daten-Audit von
> `packages/content/src/index.ts` (actions/items) + `packages/engine/src/leveling.ts` (XP-Kurve)
> + `packages/engine/src/tick.ts` (XP-Vergabe). Temporäres Sim-Harness für XP/h & Lücken
> (`scratchpad/sim.mjs`, nach Lauf entfernt). Vergleich: `run3-gathering.md`. Stand 2026-06-27.

## Fun-Score: **9 / 10**   (Δ vs run3: **+1**, war 8/10)

Der Sammel-Loop ist jetzt **lückenlos verdrahtet**: jedes der 16 Hölzer, alle 12 Erze, 8 Edelstein-Adern
und 17 Rohfische münden in eine konkrete Verarbeitungs-Senke. Der zentrale Run3-Mangel — **4 tote
Holztiers** — ist sauber gefixt (Fix C: Holzschilde via Fletching). Abzug nur noch für Polish-P3s:
ein paar XP/h-Dips an den Lückenfüller-Tiers und die altbekannte 15-Level-Erzpause L55→L70.
**Kein P0/P1/P2.**

---

## Verifikation: die 4 vormals toten Hölzer (Kernauftrag) — BESTÄTIGT GEFIXT

Run3 ließ `willowbark`/`grimwood`/`ashfen`/`voidwood`-Log nur droppen, ohne Abnehmer. Run4: jedes hat
genau eine Fletching-Schild-Senke (off-hand, defense+evasion+maxHp), Kette geschlossen:

| Holz (Cut) | Lvl | Senke (Fletch) | Lvl | Input | Output | Output-Bonus |
|---|---|---|---|---|---|---|
| willowbark_log | 15 | `fletch_willowbark_shield` | 15 | 3×log + 1×bowstring | willowbark_shield | def7/eva5/hp16 |
| grimwood_log | 25 | `fletch_grimwood_shield` | 25 | 3×log + 1×bowstring | grimwood_shield | def12/eva8/hp28 |
| ashfen_log | 63 | `fletch_ashfen_buckler` | 63 | 4×log + 1×bowstring | ashfen_buckler | def30/eva20/hp66 |
| voidwood_log | 92 | `fletch_voidwood_pavise` | 92 | 5×log + 1×bowstring | voidwood_pavise | def52+/eva/hp |

Schild-Fletch-Level == Holz-Cut-Level (kein Beschaffungs-Knick). Die übrigen **12** Hölzer speisen je
Shortbow+Longbow (normal→godiron-Tier). **Ergebnis: alle 16 Hölzer haben eine Senke — keine Holz-Totzone mehr.**

---

## Tier-Inventar & XP/h (Sim, xp/h = xp/durationMs·3.6e6)

**Woodcutting — 16 Tiers, L1–99** (xp/h 2.6k → 140k):
normal·birchwood·oak·willowbark·ashbark·grimwood·blackwood·blightwood·ironbark·bloodoak·ashfen·shadowpine·wraithwood·bonewood·voidwood·godwood.
Größte Level-Lücke: 10 (ironbark L45 → bloodoak L55).

**Mining-Erz — 12 Tiers, L1–95, copper→godiron LÜCKENLOS** (xp/h 2.4k → 180k):
copper/tin(1)·iron(10)·coal(15)·gravesteel(22)·mithril(35)·adamantite(45)·runite(55)·bloodiron(70)·titanium(80)·aetherite(90)·godiron(95).

**Mining-Edelstein — 8 Adern, L15–95** (xp/h 3.2k → 108k):
garnet(15)·bloodstone(25)·sapphire(35)·ruby(55)·diamond(75)·voidstone(82)·onyx(90)·godgem(95). Alle → Jewelcrafting (`cut_*`).

**Fishing — 17 Tiers, L1–97** (xp/h 2.4k → 116k):
shrimp(1)·murk_perch(5)·trout(10)·cod(15)·ghostfin_pike(20)·shadowcarp(25)·ironscale_bass(30)·salmon(35)·duskfin_carp(45)·lobster(55)·crypteel(60)·bloodfang_eel(63)·anglerfish(70)·wraithscale(78)·voidray(85)·abyssal_crawler(92)·soulfish(97).
**Jeder** Rohfisch hat eine `cook_*`-Aktion → Cooking-Versorgung 1:1 vollständig.

**Aktive Grind-Zeit 1→99** (immer beste freigeschaltete Aktion, Sim): Woodcutting ~269 h · Mining(Erz) ~228 h · Fishing ~224 h
(Gesamt-XP 1→99 = 13.034.431). Idle-fair: Aktionsdauern 2,8–12,5 s, alles läuft offline gedeckelt (MAX_OFFLINE 24h).

---

## Stärken

- **Alle Sammel-Outputs haben eine Senke** (Mining/Wood/Fish): Erz→Smithing, Gem→Jewelcrafting,
  Holz→Bögen/Schilde, Fisch→Cooking. Auch alle ERFUNDENEN Knoten (gravesteel, bloodstone, voidstone,
  godgem) sind angebunden. Im Run4-Scope **keine einzige Vendor-Sackgasse**.
- **Fishing massiv ausgebaut**: von ~11 (run3) auf **17 Tiers** mit dichter Level-Leiter (1/5/10/15/20/25/30/35/45/55/60/63/70/78/85/92/97).
- **Erz-Leiter durchgehend** copper→godiron (12 Tiers), gemstone-Adern lückenlos (8).
- **XP fair vergeben**: `tick.ts:90` addiert `action.xp` pro **abgeschlossener Aktion**, nicht pro
  Loot-Erfolg. Fang-Chance <1 (0,7–0,9) senkt also nur den **Ertrag** (Cooking-Nachschub), nie die XP-Rate.
  Selbst soulfish liefert bei 0,7 noch ~202 Fisch/h — Cooking-Versorgung gesichert.
- **Mastery-Layer** (preserve/double/speed) hebt Ertrag & Tempo idle-typisch über Zeit (`tick.ts`).
- **XP/h-Kurve mittleres/oberes Spiel sauber monoton** — Tier-Sprünge fühlen sich als Fortschritt an.

---

## Findings (alle P3 — Polish, kein Blocker)

### [P3] XP/h-Dips an Lückenfüller-Tiers (newest unlock fühlt sich schwächer an)
Sim zeigt: einige niedrigstufige Lückenfüller liefern **weniger** xp/h als der direkt vorige Haupt-Tier,
weil ihre XP per Formel auf 1–2 abgerundet wird:
- Woodcutting: normal 2571 → **birchwood(L5) 1125**; oak 3000 → **willowbark(L15) 1778**; ashbark 3200 → **grimwood(L25) 3032**.
- Mining: iron 3000 → **coal(L15) 2571**. Fishing: shrimp 2400 → **murk_perch(L5) 2057**.
Folge: ein rein XP-optimierender Spieler überspringt diese „neuen" Tiers und bleibt auf dem alten Baum/Knoten.
Praktisch unkritisch (birchwood/willowbark/grimwood/coal existieren v.a. als **Material**-Tier für Bögen/Schilde/Smithing),
aber der „höchster freigeschalteter Tier = bester"-Erwartung widerspricht es leicht.
**Fix (optional):** XP der Tiefstufen-Lückenfüller leicht über dem Vorgänger anheben (z.B. birchwood xp 1→2),
oder im UI klar als „Material-Tier" kennzeichnen.

### [P3] Mining: 15-Level-Erzpause L55→L70 (UNVERÄNDERT aus run3)
Nach `mine_runite`@L55 kommt das nächste **Erz** erst `mine_bloodiron`@L70 — dazwischen nur die
`mine_ruby_seam`@L55 (Edelstein), kein neues Erz. Längste Erz-Pause der Leiter; run3-P3 ist offen.
**Fix (optional):** Zwischenerz @~L62 analog zur Woodcutting-Lückenfüller-Logik.

### [P3] Fishing: 10-Level-Pause L35→L45 (salmon → duskfin_carp)
Größte Fishing-Lücke. Nicht kritisch (XP/h steigt sauber über die Lücke), aber spürbarer als die
sonst dichte Leiter. Optional ein L40-Fisch.

### [P3] Edelstein-Adern: 20-Level-Lücke L35→L55 (sapphire → ruby)
Isoliert betrachtet die größte Gem-Lücke; in der **kombinierten** Mining-Leiter (Erz+Gem) durch
adamantite@L45 überbrückt, daher kein echter Leerlauf. Nur erwähnt, falls Gem-Schürfen als eigener
Pfad gespielt wird.

---

## Δ vs run3 (zusammengefasst)
- **GEFIXT:** 4 tote Holztiers (willowbark/grimwood/ashfen/voidwood) → jetzt Fletching-Schild-Senken (Fix C). **(run3-Hauptmangel erledigt)**
- **VERBESSERT:** Fishing ~11 → **17 Tiers**; Gem-Adern 7 → **8** (+bloodstone L25); Cooking-Versorgung jetzt 1:1 für alle 17 Fische.
- **OFFEN (P3):** Mining-Erzpause L55→L70 unverändert.
- **NEU bemerkt (P3):** XP/h-Dips an Tiefstufen-Lückenfüllern (Rundungsartefakt).
- **Fun-Score 8 → 9.**

## Verdict
Sammel-Trias Mining/Woodcutting/Fishing ist im Run4-Scope **rund und totzonenfrei**: vollständige
Erz- und Holzleitern, alle Outputs verarbeitbar, Fishing↔Cooking lückenlos verzahnt, XP fair
pro Aktion. Kein P0/P1/P2. Restliche Hebel Richtung 10/10 sind reines Tuning: die XP/h-Dips der
Lückenfüller glätten und die L55→L70-Erzpause füllen.
