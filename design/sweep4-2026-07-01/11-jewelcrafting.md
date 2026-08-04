# Sweep 4 — Jewelcrafting (Juwelierskunst) Deep-Dive & Note

**Agent:** Skill-Deep-Dive #11 · **Datum:** 2026-07-01 · **Methode:** echter `SimPlayer`-Treiber
(headless), analytische XP/h-Kurve + engine-getriebene 300s-Fenster (Ist ≈ Soll ±1 %), Pet-Force-Drop,
Ökonomie- und Ziel-Kurven-Rechnung. Temp-Skript `jewelcrafting-sweep4.test.ts` nach dem Lauf gelöscht.

**NOTE: B** — solide verdrahtete, sauber gestaffelte Produktions-Fertigkeit mit monoton steigender,
sogar über der Soll-Kurve liegender XP-Rate, funktionierendem Pet und lukrativer Ökonomie. Abzüge nur
für zwei am-Level-nicht-fütterbare „Phantom"-Rezepte (gemstone_ring/amulet) und eine echte Drei-Stile-
Lücke: **Fernkampf** bekommt über ~80 Level KEIN eigenes Schmuckstück. Keine P0/P1 — ship-tauglich mit
zwei Content-Nacharbeiten.

---

## 1) XP/h-Kurve L1→99 — monoton, über Soll, keine toten/regressiven Tiers

Bestes fütterbares Gem-Loop-Rezept je Band (Ist-Werte engine-gemessen, decken sich mit Analytik):

| ab Level | Aktion | xp/h | Δ zum Vorband |
|---|---|---|---|
| 1 | craft_garnet_ring | 3.600 | — |
| 15 | cut_sapphire | 3.600 | 0 % |
| 34 | cut_ruby | 5.143 | +43 % |
| 38 | craft_ruby_amulet | 6.545 | +27 % |
| 44 | cut_bloodstone | 10.800 | +65 % |
| 48 | craft_bloodstone_amulet | 13.355 | +24 % |
| 55 | cut_diamond | 15.200 | +14 % |
| 60 | craft_diamond_amulet | 19.543 | +29 % |
| 70 | cut_onyx | 32.073 | +64 % |
| 75 | craft_onyx_amulet | 40.950 | +28 % |
| 85 | cut_voidstone | 52.200 | +27 % |
| 88 | craft_voidstone_amulet | 60.400 | +16 % |
| 95 | craft_godgem_ring | 86.040 | +42 % |
| 99 | craft_godgem_amulet | 109.500 | +27 % |

- **Monoton nicht-fallend, keine regressiven Tiers.** Ist-Sim bestätigt jede Zeile (z. B. L75 REAL=41.496,
  L88 REAL=59.796, L99 REAL=109.500).
- **Gegen die spielinterne Soll-Kurve** (`target = 90·√Δxp`, aus dem gemstone_amulet-Kommentar): geliefert/Soll
  = **4,4× bei L1 → 1,0× bei L30**, danach 1,2–1,6× im Midgame, ~1,0× bei L85–95. Die „flache" 3.600 xp/h von
  L1–34 ist damit **kein Loch, sondern großzügig** — die XP-Anforderungen sind dort winzig (L1→34 = 20.224 xp
  ⇒ nur ~5,6 h Spielzeit). Gesamt L1→99 ≈ **259 Spielstunden** (fresh Mastery, ohne Pet/Buffs); ~98 % davon
  liegen ab L34.
- **Einzige Soll-Unterschreitung:** L95–98 sitzt bei ~0,86× Soll, weil `craft_godgem_ring` (86.040) bis
  `craft_godgem_amulet` (L99, 109.500) hält. 4 Level, im akzeptierten Endgame — P3.

## 2) Freischalt-Takt
Sauberer Gem-Staffel: garnet(1) → sapphire(15) → ruby(34) → bloodstone(44) → diamond(55) → onyx(70) →
voidstone(85) → godgem(95); je Tier Cut + Ring + Amulett. Zwei längere Ein-Gem-Strecken (garnet L3–15,
sapphire L18–34) — aber wall-time nur wenige Stunden, XP-Rate über Soll, also unkritisch. Die dafür
gedachten On-Level-Füller (gemstone_ring L20, gemstone_amulet L26) sind **nicht am Level fütterbar** (s. Finding 1).

## 3) Werkzeug-/Tier-Progression
Rohstein → schleifen → +Barren → Schmuck; jedes Tier fordert einen höheren Barren (copper→bronze→iron→
steel→mithril→gravesteel→runite→bloodiron→aetherium/godiron). Spürbare, saubere Treppe.
**Anmerkung:** Jewelcrafting hat **kein eigenes Werkzeug** (kein „Spitzhacke/Axt"-Äquivalent) — Tempo kommt
ausschließlich aus Mastery (bis 14,7 % bei m99). Weniger Upgrade-Dopamin als mining/woodcutting; bewusst? (P3-Feel).

## 4) Drops + Skill-Pet — bestätigt
- **gemwraith** droppt über den ECHTEN Skilling-Pfad: mit `dropChance=1` geforct → nach 1 `cut_garnet`
  `ownedPets.gemwraith === true`. Natürlich **1/110.000** pro Aktion.
- Über den Optimalpfad (~**127.000** Aktionen bis 99): Erwartungswert **1,16** Pet-Drops, P(bis 99 keins) ≈ **31 %**
  — für ein Rare-Skill-Pet („weiter grinden") ok; mehr Cut-lastige Runs erhöhen die Aktionszahl.
- **skillEffect `flawlessGem` 0,05 ist verdrahtet:** fließt via `petDoubleYieldBonus` (kind in der erlaubten
  Liste) in die jewelcrafting-Doppelertrag-Chance (tick.ts) — wirkt auf Cuts UND Schmuck. Combat-Ability
  `guaranteedCrit` ebenfalls aktiv. Kein „definiert aber nie gelesen"-Feld.

## 5) Gold/Ökonomie — sehr lukrativ, exploit-frei
Verkauf (0,5× value) der besten Band-Aktion: **96k/h (L1) → 1,47M/h (L99)**; z. B. cut_sapphire ~120k/h bei L15.
Schleifen hebt den Wert ~2,25× (rough_sapphire 90 → sapphire 200). **Kein Exploit**: Rohsteine sind
mining-zeit-gekoppelt; realer Durchsatz ist **mining-limitiert** (mine/h < cut/h in JEDEM Tier, z. B. Diamant
462 mined vs 800 cut). Hohe Zahlen fallen unter das akzeptierte „endgame gold/XP-Inflation" — nicht als Bug gemeldet.

## 6) Mastery — spürbar, generisch
Standard-Pool: bis **14,7 % Tempo** (m99), additive Doppelertrag- und Preservation-Chancen. Kein
jewelcrafting-eigenes Mastery-Unlock (systemkonform). Bei einem Verarbeitungs-Skill lohnend (mehr Schmuck/Gems
pro Rohstein via Doppelertrag + Materialsparen).

## 7) Feel / „lohnt es sich?" — Note B
Der Kern-Loop ist befriedigend: klare Gem-Treppe, jedes Tier neue Ausrüstung + spürbarer XP-Sprung, echtes
Pet, starke Ökonomie. Reibung: (a) zwei Rezepte, die man am Level SIEHT aber nicht bauen kann; (b)
Fernkampf-Spieler geht ~80 Level ohne stil-eigenes Schmuckstück leer aus; (c) kein Werkzeug-Upgrade.
Alles Content-Politur, keine Blocker → **B**.

## 8) Schmuck-Nutzen & Verdrahtung
Alle Schmuckstücke haben ein Rezept (keine Orphans) und alle Boni werden von `computeStats` gelesen
(Guard-Test bestätigt garnet_amulet +10 HP, fang_necklace +3 Nahkampf; Ring-Routing ring1→ring2 ok).
Slot-Abdeckung amulet + ring vollständig. **Aber Stil-Parität schief** (s. Finding 2).

---

## Top-3 Findings

**[P3][content/feel] gemstone_ring L20 & gemstone_amulet L26 sind am Level NICHT fütterbar — „Phantom"-Füller (confirmed).**
Ihr Input `cut_gemstone` fällt AUSSCHLIESSLICH aus Thieving (crack_strongbox L55, pickpocket_noble L65,
plunder_ashen_treasury L97). Ein Juwelier auf L20–26 kann sie nicht bauen. Bestätigt zugleich die Sweep-3-Bewertung:
der L26-„Lückenfüller" füllt faktisch nichts (die Lücke braucht auch keine Füllung — L20–34 liefert 1,2–1,7× Soll).
Zusätzlich sind beide xp-dominiert (2.400/2.700 xp/h < cut_sapphire 3.600). Evidence: index.ts:8222-8234 (Rezepte),
:7239-7341 (cut_gemstone-Quellen). **Owner: content-dev.** Fix-Optionen: (a) eine jewelcrafting-Cut-Aktion, die
`cut_gemstone` aus einem billigen Rohstein erzeugt; (b) Input auf `rough_bloodstone`/`garnet` ändern; (c) als reine
Thieving-Byproduct-Senke akzeptieren und die „Füller"-Rolle streichen.

**[P2][balance] Fernkampf bekommt aus Jewelcrafting KEIN stil-eigenes Amulett und erst ab L44 einen Ring.**
`rangedDamage` auf Amuletten gibt es NUR beim combat-gegateten heartforged_pendant (L82). Der früheste dedizierte
Ranged-Ring ist bloodstone_ring (L44). Zum Vergleich: Nahkampf hat fang_necklace L5, alpha_fang L36, ruby L38;
Magie hat sapphire_ring L15, sapphire_amulet L18, spellbinder L46, stormcaller L65. Ein Ranged-Skiller trägt ~80
Level lang nur „all-Stile"-Ersatz (onyx L70+). Evidence: index.ts:728-850 (Boni). **Owner: content-dev/balance-designer.**
Fix: ein Ranged-Amulett + -Ring im Band L15–40 (z. B. „Hawkeye/Marksman", rangedDamage + accuracy) analog zu
sapphire(Magie)/ruby(Nahkampf).

**[P3][balance] Endspurt L95–98 leicht unter Soll (~0,86×).**
godgem_ring (86.040 xp/h) hält von L95 bis godgem_amulet (L99, 109.500) — die letzten 4 Level sind minimal langsamer
als die 90·√Δxp-Zielkurve. Im akzeptierten Endgame, niedrige Prio. Evidence: index.ts:8319-8330. **Owner: content-dev.**
Optional: cut_godgem leicht anheben oder ein L96/97-Zwischenstück.

## Top-3 Verbesserungen (mit Soll-Zahlen)
1. **cut_gemstone am-Level erzeugbar machen** — neue Aktion `cut_gemstone` (jewelcrafting, levelRequired 20,
   durationMs ~3.500, xp 4, input `rough_garnet` ×1 → `cut_gemstone` ×1). Dann werden gemstone_ring/amulet zu echten
   On-Level-Optionen ohne Thieving-Zwang.
2. **Ranged-Schmuck-Paar einziehen** — z. B. `hawkeye_amulet` (L20, bonus `{ rangedDamage: 5, accuracy: 6 }`, Input
   `sapphire`+`iron_bar`) und `marksman_ring` (L38, `{ rangedDamage: 4, critChance: 0.02 }`, Input `ruby`+`steel_bar`),
   damit alle drei Stile im L15–40-Band ein eigenes Amulett+Ring haben.
3. **Optionales Werkzeug** — ein „Juwelier-Meißel"-Tool (analog Spitzhacke, speedMult gestaffelt bronze→godiron), um
   das Tempo-Upgrade-Feedback anzugleichen; alternativ bewusst als Design-Entscheid dokumentieren.

## Bestätigt aus Sweep-3-Fixliste (nicht neu gemeldet)
- gemstone_amulet L26 xp-Tuning vorhanden (index.ts:8228-8234) — XP passt; die Feedability-Lücke bleibt (Finding 1).
- Pet dropbar über echten Pfad (gemwraith) ✓. Balance-Parität ±10 % im Sinne monotoner, über-Soll-Kurve ✓.
