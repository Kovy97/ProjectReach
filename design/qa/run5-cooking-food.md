# QA-Run 5 — Cooking & Food-Loop (dedizierte Linse: Koch → Kampf)

**Tester:** Playtester-Analyst (STRIKT READ-ONLY; einzige Schreibdatei = dieser Bericht) · **Datum:** 2026-06-28
**Scope (eigene Linse auf die Food-Loop-TIEFE, nicht Stil-Parität allgemein):**
Roh→Gericht-Ketten lückenlos · Heilwert-Kurve level-gerecht & gold-positiv (break-even+) ·
Combo-Food (Heal+Buff) für alle 3 Stile · Auto-Eat-Integration (Tiers, `curesPoison`,
food-empty-Safety) · neue Crop-Consumables sinnvoll. **Leitfrage: Ist der Koch→Kampf-Loop
befriedigend — und was fehlt für 9,5?**
**Kontext (nicht direkt verglichen, als Linse genutzt):** `run4-gather-farm-forage-herb.md`
(Verarbeitungs-Ökonomie-P2: `gallows_preserve` −472 Gold) + `run4-combat-status.md`
(Auto-Eat-Tiers wirkungslos P2, `curesPoison` im Auto-Eat ignoriert P3).

**Methode — echte Daten:** Temporäres Vitest-Harness direkt auf `@hearthforge/content` + Engine
(`createGame`/`computeStats`/`useConsumable`/`startCombat`/`combatStep`), **nach dem Lauf entfernt**.
Alle Zahlen unten sind reale Harness-/Engine-Ausgaben. Zusätzlich 23 relevante Guard-Tests grün
(`buffs`, `autoeat-dot`, `poison`, `processing`, `content-integrity`, `wiring-audit`).
maxHp-Referenz = Engine-`computeStats` einer ungerüsteten Figur mit allen con-Skills auf Ziel-Level
(**konservativ — überschätzt con**, d.h. die ausgewiesenen Heil-%-Werte sind eine Untergrenze;
real heilen die Gerichte eher stärker).

---

## Fun-Score: **8,5 / 10**

Der Koch→Kampf-Loop ist **rund und befriedigend**. Die drei zu prüfenden Run-5-Fixes sind alle
sauber gelandet und live verifiziert: (1) jedes Crop-/Herblore-Rezept ist jetzt **gold-positiv**
(der run4-Ausreißer `gallows_preserve` von **−472 → +8** Gold, Heilwert 60 → 140), (2) `curesPoison`
wird im Auto-Eat-Pfad **tatsächlich angewandt** (Poison-DoT nach einem Auto-Bissen entfernt), und
(3) **Combo-Food heilt UND bufft** über den identischen Pfad wie der manuelle Verzehr — auch im Kampf.
Die Roh→Gericht-Kette ist lückenlos, food-empty ist crashfrei abgesichert, und Combo-Food deckt
formell alle drei Stile ab.

Gebremst (nicht höher) durch **eine echte Content-Lücke in der Combo-Food-Stil-Parität**: Nahkampf
bekommt drei stil-passende Combo-Gerichte (L38/L75/L90), **Fernkampf und Magie aber nur je EINES bei
L48/L52 — danach klafft bis L90 (Festmahl) ein ~40-Level-Loch**, in dem das Premium-Gericht
(`witherleek_bouillabaisse` L75) offensiv nur dem Nahkämpfer (+8 meleeDamage) dient. Dazu zwei
Carryover-/Konsistenz-Punkte: Auto-Eat-Tiers differenzieren weiterhin kaum (adjazent, run4-Combat),
und Fleisch (Combo-Pflichtzutat) hat als einzige Zutatengruppe **keinen Shop-Fallback**.

---

## Verifikation der Run-5-Fixes (reale Zahlen)

### Fix A — Crop-/Herblore-Consumables neu balanciert: ALLE break-even+ ✓
Gold-Bilanz = Vendorwert des **gekochten** Outputs minus Vendorsumme der Roh-Inputs (= „lohnt
Verarbeiten statt Rohware vendorn?"). Run 4 hatte hier 4 Rezepte tief im Minus; jetzt ist **jedes ≥ 0**:

| Rezept | Input-Gold | Output-Value | Heilwert | Δ Gold | Heil-% @ReqLvl |
|---|---:|---:|---:|---:|---:|
| cook_ashroot_broth (L1) | 14 | 16 | 30 | **+2** | 30/110 ≈ 27 % |
| cook_grimwheat_porridge (L3) | 18 | 20 | 40 | **+2** | 40/136 ≈ 29 % |
| cook_gallows_preserve (L50) | 142 | 150 | **140** | **+8** | 140/867 ≈ 16 % |
| brew_mandrake_tincture (L30) | 182 | 200 | 130 | **+18** | 130/557 ≈ 23 % |
| brew_nightshade_extract (L35) | 55 | 80 | (def +8) | **+25** | Buff |
| brew_emberroot_tonic (L65) | 173 | 185 | (regen +3) | **+12** | Buff |
| brew_corpse_lily_salve (L70) | 305 | 320 | **290** | **+15** | 290/1177 ≈ 25 % |
| brew_godbloom_infusion (L95) | 782 | 900 | 380 | **+118** | 380/1562 ≈ 24 % |

- **run4-P2 vollständig geschlossen:** `gallows_preserve` von **Δ −472 (heal 60) → Δ +8 (heal 140)**.
  Beide vorgeschlagenen Hebel wurden gezogen — Heilwert hoch (60→140) UND `gallows_apple`-Vendorwert
  runter (280 → ~70, ablesbar an Input-Gold 142 für 2 Äpfel + Phiole). `corpse_lily_salve` 250→290.
- **Heilwert-Kurve level-gerecht:** `gallows_preserve` heilt mit 140 (≈16 % maxHp) auf L50 sauber
  zwischen `cooked_crypteel` (110) und `cooked_abyssal_crawler` (215) — kein Ausreißer mehr nach unten.

### Fix B — `curesPoison` im Auto-Eat-Pfad (run4-P3): GELÖST & live verifiziert ✓
`tryAutoEat` (combat.ts:86) führt jetzt denselben Cure-Zweig wie `useConsumable` aus. Live-Sim:
Spieler mit aktivem `poison`-DoT, Auto-Eat-Food = `antivenom_tonic` (`curesPoison`), HP unter Schwelle
→ nach **einem** `combatStep`: **`poison`-Effekt entfernt = true**. Die in run4 gebrochene Erwartung
„Auto-Eat = manueller Verzehr" gilt jetzt auch für die Gift-Heilung.

### Fix C — Combo-Food heilt UND bufft, auch via Auto-Eat ✓
`applyConsumableBuff` ist geteilt zwischen `useConsumable` und `tryAutoEat`. Live-Sim:
Auto-Eat-Food = `soulgourd_brisket`, HP unter Schwelle → nach `combatStep` ist der Buff
(`hpRegen+4/def+10/crit+3 %`) in `character.buffs` registriert **= true**. Heilung + Buff in einem
Auto-Bissen, identisch zum Hand-Verzehr.

### food-empty-Safety ✓
Auto-Eat-Tier 3, Vorrat = 1, HP = 1, 5 Steps lang ohne Nachschub: **keine Exception, Restmenge
floort bei 0 (nie negativ), Held überlebt.** `itemCount < 1`-Guard greift sauber.

---

## Roh → Gericht-Kette: lückenlos ✓ (mit einem Quell-Hinweis)

Alle Inputs der 7 Combo-Gerichte + 8 Crop-/Brew-Rezepte existieren als Items (jeweils mehrfach
referenziert). Bezugsquellen:
- **Fisch** (`raw_murk_perch`…`raw_soulfish`): Fishing-Aktionen.
- **Crops** (`gravetato`, `bloodgrain`, `soulgourd`, `wither_leek`, `ambergrain`): Farming, Saaten
  seit run4 alle shop-kaufbar.
- **Kräuter** (`herb_marshroot`…`herb_godsbreath`): Foraging/Herblore.
- **Fleisch** (`raw_beef` 0.5–1.0, `raw_venison` 0.7, `raw_chicken` 0.1–0.6): **nur Monster-Drops.**

Das macht den Loop angenehm **selbstverstärkend** (Kämpfen liefert Fleisch → Combo-Food → besser
kämpfen). Einziger Wermutstropfen siehe P3 unten: Fleisch ist die **einzige** Zutatengruppe ohne
Shop-Fallback — bei trockener Drop-RNG kann Combo-Food vorübergehend stocken, während run4 für
Crops/Saaten bewusst Shop-Fallbacks ergänzt hat.

---

## Findings

### [P0] — keine.
Kein Crash, kein toter Effekt-Zweig, keine Heilwert-Inversion, kein Save-Risiko. food-empty
abgesichert, alle drei Run-5-Fixes verdrahtet und live wirksam.

### [P1] — keine.
Der Koch→Kampf-Loop ist strukturell vollständig und gold-positiv.

### [P2 — Content/Parität, IN-FOCUS] Combo-Food-Stil-Parität bricht im Mid/Late-Game ein
Die Leitvorgabe „Combo-Food (Heal+Buff) für alle 3 Stile" ist **formell** erfüllt, in der **Level-
Verteilung** aber stark schief. Reale Offensiv-Boni der 7 Combo-Gerichte:

| Gericht | Lvl | melee | ranged | magic | Stil |
|---|---:|---:|---:|---:|---|
| marshroot_chowder | 18 | – | – | – | neutral |
| bloodgrain_stew | 38 | +4 | – | – | **melee** |
| duskfin_rangers_stew | 48 | – | +4 | – | **ranged** |
| spellwarden_bisque | 52 | – | – | +4 | **magic** |
| soulgourd_brisket | 58 | – | – | – | neutral |
| witherleek_bouillabaisse | 75 | **+8** | – | – | **melee** |
| ambergrain_feast | 90 | +14 | +14 | +14 | alle |

→ **Nahkampf** bekommt stil-passendes Combo-Food bei L38, **L75** und L90 (drei).
**Fernkampf/Magie** je nur **eines** bei L48/L52 — danach **bis L90 nichts Stil-Passendes**. Das
Premium-Gericht der Late-Mid-Phase, `witherleek_bouillabaisse` (L75, höchster Heilwert+Regen seiner
Stufe), gibt offensiv **nur dem Nahkämpfer** (+8 meleeDamage) etwas; ein Bogen-/Magie-Main isst es
nur wegen Heal/Regen/Def und lässt seinen Offensiv-Bonus auf der Straße. Damit ist das beste
Mid-Game-Combo-Food für ~40 Level ein reines Nahkampf-Item.
**Impact:** Bricht die Run-5-Kernvorgabe für 2 von 3 Stilen und gibt Nahkampf ein still wirkendes
Combo-Food-Privileg. **Fix:** eine Ranged- und eine Magie-Variante im L58–L80-Band ergänzen
(z. B. `witherleek_bouillabaisse` zu einem Stil-Trio aufbohren, analog zum L48/L52-Paar), damit jeder
Stil eine durchgehende Combo-Food-Leiter early→endgame hat.

### [P2 — Carryover/adjazent] Auto-Eat-Tiers differenzieren weiterhin kaum
Die Tiers wurden seit run4 **erweitert** (jetzt T0–T3: threshold 0.5/0.6/0.7/0.8, healMult
1.0/1.1/1.25/**1.5**, cost 0/2k/8k/25k). Der run4-Befund bleibt aber im Kern gültig: Survival ist
schon bei T0 gelöst (0 Tode, run4-combat-status), also kaufen sich höhere Tiers v. a. „früher essen +
etwas mehr Heilung pro Bissen", nicht echte Überlebensfähigkeit. Aus **Food-Linse** relevant, weil
ein höheres healMult den **Combo-Food-Vorrat schont** (weniger Bissen pro Kampf) — der Wert der Tiers
liegt heute eher in Vorrats-Effizienz als in Survival. Liegt primär im Combat-Revier; hier nur als
Berührungspunkt notiert. **Fix:** siehe run4-combat-status (Tiers an echten Burst-Druck / Heal-Cap/s
koppeln) — ODER Tier-Nutzen bewusst als „Food-Sparfaktor" framen.

### [P3 — Konsistenz] Fleisch ohne Shop-Fallback (einzige Zutatengruppe)
`raw_beef`/`raw_venison`/`raw_chicken` sind **nur** Monster-Drops. run4 hat für Crops/Saaten bewusst
Shop-Fallbacks gegen Brachliegen ergänzt; Fleisch hat keinen. Da jedes Combo-Gericht Fleisch braucht,
kann eine trockene Drop-Phase die gesamte Combo-Food-Produktion vorübergehend blockieren.
Drop-Chancen sind gesund (0.5–1.0), Impact daher gering — aber inkonsistent zur Saat-/Crop-Politik.
**Fix (optional):** Metzger/Markt-Shop-Eintrag für Grund-Fleisch (raw_beef/chicken) als Fallback,
analog zu den Saaten.

### [P3 — Balance, minimal] Low-Tier-Crop-Margen hauchdünn
`ashroot_broth`/`grimwheat_porridge` sind mit Δ +2 Gold zwar break-even+ (Vorgabe erfüllt), aber so
knapp, dass über die Aktionsdauer das reine Roh-Vendorn minimal mehr Gold/Stunde bringt. Da der Zweck
Konsum (nicht Profit) ist und ein verwertbares Heil-Item entsteht, ist das **kein Loch** — nur ein
Hinweis, dass „break-even+" hier wörtlich genommen wurde. Niedrigste Priorität.

---

## Δ zu den Kontext-Linsen (run4)

| Thema | run4-Befund | Run 5 |
|---|---|---|
| `gallows_preserve` Verarbeitungs-Ökonomie | **P2**, Δ −472 / heal 60 | **GELÖST** — Δ +8 / heal 140 (beide Hebel) |
| Crop-/Brew-Rezepte gold-positiv | 4 im Minus | **alle ≥ 0** (verifiziert) |
| `curesPoison` im Auto-Eat | **P3** (ignoriert) | **GELÖST & live verifiziert** |
| Combo-Food (Heal+Buff via Auto-Eat) | n/a | **Gelandet & live verifiziert** |
| Combo-Food-Stil-Parität | n/a | **NEU [P2]** — ranged/magic Lücke L52→L90 |
| Auto-Eat-Tiers differenzierend | **P2** (3 Tiers, wirkungslos) | erweitert (T3, healMult 1.5), Kern offen |
| Fleisch-Shop-Fallback | (Crops gefixt) | **NEU [P3]** — Fleisch ohne Fallback |

---

## Was fehlt für 9,5?

Die Lücke von 8,5 auf 9,5 ist **eine gezielte Content-Ergänzung + ein Feinschliff**, kein
Strukturproblem:

1. **(P2, der Hauptpunkt) Combo-Food-Stil-Parität durchziehen.** Fernkampf und Magie brauchen je
   ein stil-passendes Combo-Gericht im **L58–L80-Band**, damit jeder Stil eine **durchgehende**
   Combo-Food-Leiter early→mid→endgame hat — nicht nur Nahkampf. Konkret: `witherleek_bouillabaisse`
   (L75) zu einem Stil-Trio aufbohren (Ranged-/Magie-Geschwister mit +ranged bzw. +magic), wie es das
   L48/L52-Paar bereits vormacht. **Das ist der eine echte Hebel**, der die Run-5-Kernvorgabe „alle 3
   Stile" für 2/3 der Spielerschaft erst wirklich einlöst.
2. **(P3) Fleisch-Shop-Fallback** ergänzen — schließt die letzte Zutaten-Beschaffungslücke und macht
   die Roh→Gericht-Kette auch RNG-unabhängig lückenlos (konsistent zur run4-Saat-Politik).
3. **(P3) Auto-Eat-Tiers** entweder spürbar an echten Druck koppeln oder ihren Nutzen klar als
   „Combo-Food-Sparfaktor" positionieren, damit die Gold-Senke 2k/8k/25k eine fühlbare Belohnung hat.

Mit Punkt 1 allein wäre der Loop bei ~9,0; mit 1–3 zusammen bei 9,5.

---

## Verdict
Die drei Run-5-Fixes **sitzen alle** — break-even+ über die ganze Crop-/Brew-Palette (inkl. des
run4-Sorgenkinds `gallows_preserve`), `curesPoison` im Auto-Eat **live wirksam**, Combo-Food heilt
UND bufft auch automatisch, food-empty crashfrei. Kein P0/P1: der Koch→Kampf-Loop ist befriedigend,
geschlossen und selbstverstärkend (Kampf → Fleisch → Combo-Food → Kampf). Der einzige echte Schritt
Richtung 9,5 ist **Content, kein Bug**: die Combo-Food-Stil-Parität fürs Mid/Late-Game für Fernkampf
und Magie nachziehen, damit „Combo-Food für alle 3 Stile" nicht nur formal, sondern über die ganze
Level-Kurve gilt.
