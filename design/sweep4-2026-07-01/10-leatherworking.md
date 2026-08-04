# Sweep 4 — 10 Leatherworking / „Crafting" (L1→99 Deep-Dive + Note)

**Agent:** Kontrolleur (QA)  **Datum:** 2026-07-01  **Methode:** headless SimPlayer, echte Engine-Aktionen (jede der **107** Leatherworking-Aktionen einzeln über `setActiveAction`+`advance`, 1-h-Fenster, Mastery Lv1, kein Pet/Buff/Tool), Inputs via `SimPlayer.give()`, `autoBank`. Pet-Drop über den echten `tryPetDrop`-Pfad (2 Mio. Würfe). Test-Skript `leatherworking-sweep.test.ts` angelegt, ausgeführt (grün, 0 Null-XP-Aktionen), wieder **gelöscht**. Repo clean.

**NOTE: A−** — Sehr breites, tiefes, sauber verdrahtetes Verarbeitungs-Skill. Es ist der **Doppel-Schneider des Spiels**: crafted die komplette **Ranged-Rüstung (Hide + dex/rangedDamage)** UND die **Magie-Rüstung (Robes + int)** — plus Capes und Slayer-Gear. XP/h auf der Level-Linie streng monoton (0 Regressionen), Freischalt-Takt außergewöhnlich dicht (44 Unlock-Level, **keine** Leerlauf-Lücke ≥8), exploit-frei, Pet + Mastery verdrahtet. Zwei Reibungen halten es unter A: die vom Chef gewünschte **Tan-Aktion-vorne-Ordnung fehlt** (Smithing hat sie, LW nicht), und **`scaled_leather` hat als einziger Leder-Tier keine Gerb-Aktion** (nur Combat/Fishing-Drop).

---

## 1. XP/h-Kurve L1→99 (echte Engine, Mastery Lv1)

**Beste verfügbare Aktion je Level-Band (Optimalpfad) — streng monoton nicht-fallend, `best-available Regressionen: 0`:**

| Lvl | beste Aktion | XP/h |
|---|---|---|
| 1 | tan_leather | 2.428 |
| 14 | craft_scaled_body | 2.835 |
| 22 | tan_hardened_leather / craft_ear_plugs | 3.654 |
| 28 | craft_scaled_helm | 4.113 |
| 35 | craft_ember_robe_body | 4.662 |
| 45 | craft_aether_gloves | 9.725 |
| 50 | reinforce_studded_leather | 12.360 |
| 60 | craft_ironhide_helm | 25.500 |
| 70 | craft_warhide_helm | 33.235 |
| 78 | tan_dragonhide | 39.125 |
| 82 | craft_dragonhide_body | 47.436 |
| 90 | craft_godspark_vestment | 90.500 |
| 95 | craft_shadowhide_vambraces | 91.584 |
| 99 | craft_voidhide/voidweave (BiS) | ~218.000 |

**Auf der Level-LINIE keine Regression, keine Trap-Unlocks.** Anders als Smithing (Bronze/Eisen < Kupfer) gibt es hier **keine** neue Stufe, die langsamer ist als das, was der optimale Leveler schon nutzt. Grobe Zeit **L1→99 ≈ 229 h** (best-available, ohne Mastery/Pool-Speed; xpForLevel(99)=13.034.431) — idle-typisch, kein Wall.

**Wichtig (Kontext, kein Bug):** Die XP/h oben nehmen **Material auf der Hand** an. Die Verarbeitungs-/Gerb-Aktionen (`tan_*`, `cure_*`, `reinforce_*`) sind **Zwischenstufen** — ein autarker Skiller muss erst gerben, dann nähen; der reale Selbstversorger-Durchsatz liegt entsprechend darunter. Normal für ein Crafting-Skill.

## 2. Freischalt-Takt
- **Außergewöhnlich dicht:** neue Aktionen auf **44** distinkten Leveln — `1,2,3,5,8,12,14,15,16,18,20,21,22,23,24,28,30,31,32,35,38,45,46,47,50,51,52,57,58,60,61,62,65,70,71,72,75,78,82,88,89,90,95,99`.
- **Keine Leerlauf-Lücke ≥8 Level.** Praktisch auf jedem Abschnitt etwas Neues (Leder-Tier ODER Robe-Tier ODER Cape ODER Slayer-Gear). Bester Freischalt-Rhythmus der bisher gesweepten Skills.

## 3. Werkzeug/Upgrade-Progression
- **Kein Tempo-Werkzeug** (wie alle Verarbeitungs-Skills; Smithing ebenso). Upgrade-Achse = **Material-Tier-Leiter** (cured→hardened→scaled→studded→warhide→ironhide→dragonhide→shadowhide→voidhide) + drei parallele Robe-Ketten (apprentice→frost→ember→aether→arcane→runewoven→godspark→voidweave) + Mastery. Klar gestaffelt, spürbar. Kein Bug.

## 4. Drops + Skill-Pet
- **flayling** (`source:{kind:"skill",skill:"leatherworking"}`, `dropChance 1/95000` pro Abschluss). Über den echten `tryPetDrop`-Pfad **empirisch bestätigt: 18 Treffer / 2.000.000 = 1/111.111** (im RNG-Rahmen von 1/95.000). Effekt `gatherYield 4%` ist korrekt verdrahtet (`petDoubleYieldBonus`→tick.ts `completeAction`), Combat-Ability `armorRend` gesetzt. Über einen L1→99-Grind (~100k+ Abschlüsse) real erreichbar. `confirmed`.
- **Bonus-Drops:** Mastery-Doppelertrag (bis +50% auf 2× Output), Pool-Checkpoints. Sinnvoll.
- **Cross-Skill-Verdrahtung:** Hide-Outputs = **Ranged-Gear-Kette** (dex + rangedDamage), Robe-Outputs = **Magie-Gear**. Keine verwaisten Outputs; jedes gecraftete Teil ist ein ausrüstbares Gear-Item mit `requirements: { leatherworking: N }`.

## 5. Gold/Ökonomie
- Verkauf = **0,5 × value**. **Roh-Häute (raw_hide/scarred_hide/…) sind NICHT im Shop kaufbar** → **kein Tan-and-Sell-Exploit**. `tan_leather` ist wertneutral (2×raw_hide 12 → cured_leather 12). Exploit-frei. `confirmed`.
- Gear-Crafting ist ein **starker Gold-Weg**: gold/h beim Verkauf des Outputs skaliert von ~30k/h früh bis **1,0–1,8 Mio/h** bei L82–95 (schnelle 4000-ms-Vambraces/Boots-Crafts mit hohem Output-Wert, z.B. `craft_shadowhide_vambraces` 1,81 Mio/h). Materialwert-Uplift überall positiv. Kein Sink-Problem beobachtet (Gear → equippen/Suffix-Roll/Salvage).

## 6. Mastery
- Pro Aktion: Speed bis −14,7% (M99), Preserve bis +39,2%, Doppelertrag bis +49%. Real gemessen: `tan_leather` sammelt 2.428 Mastery-XP/h; Mastery Lv99 **einer** Aktion ≈ 5.368 h (Endgame-Anker, akzeptiert).
- Pool (skillweit, Ref-Level 20): Checkpoints 5/25/50/95% → +double/+speed/+preserve. **Bei 107 Aktionen ist die Pool-Kapazität groß**, aber der 1. Checkpoint (5%) ist früh spürbar. Guter Langzeit-Anreiz.

## 7. Feel / „lohnt es sich?"
Klar ja. Der breiteste und am dichtesten getaktete Skiller im Spiel, mit doppelter Daseinsberechtigung (Ranged- **und** Magie-Rüstung). Streng monotone XP-Kurve ohne Fallen, fetter Gold-Payoff im Midgame, verdrahtetes Pet + Mastery. Reibung ist reiner Polish: die fehlende Tan-vorne-Ordnung und die eine Lücke in der Gerb-Leiter (`scaled_leather`).

---

## TOP-3 FINDINGS
1. **[P2][ux] Tan-Aktion NICHT vorne in der Kategorie** (`confirmed`, **Chef-Wunsch analog Smelt**): SkillPage sortiert je Kategorie nur nach `(levelRequired, id)` — ein Leatherworking-Spezialfall wie `smithingOrderKey` fehlt. Folge: In `leather_cured` steht **`tan_leather` auf Position 3/7** (hinter `craft_leather_body`, `craft_leather_cap`); in `leather_hardened` steht `tan_hardened_leather` an 4. Stelle; in `leather_warhide` steht `cure_warhide` an 5. Stelle. (Nur wo die Gerb-Aktion zufällig ein niedrigeres Level hat — dragonhide/shadowhide — steht sie vorne.) `apps/client/src/renderer/pages/SkillPage.tsx:124-140` (Sort) & `:60 smithingOrderKey` (Vorlage). Owner: **ui-dev**.
2. **[P3][content] `scaled_leather` hat als EINZIGER Leder-Tier keine Gerb-Aktion** (`confirmed`): Alle anderen Basis-Leder haben ein Rezept (cured←raw_hide, hardened←scarred_hide, studded←scaled+steel, warhide←scaled+mithril, dragonhide←raw_dragonhide, shadowhide←raw_shadowhide). `scaled_leather` wird von **keiner** Aktion produziert (`grep loot scaled_leather` = 0) — nur Monster-/Fishing-Drop. Damit sind der Scaled-Tier (L14–30) **und** die scaled-abhängigen studded/warhide-Rezepte ohne Craft-Alternative combat/fishing-gegated. `packages/content/src/index.ts:424` (Material ohne Produzent). Owner: **content-dev**.
3. **[P3][feel] Gerb-Zwischenstufen als reine XP/Material-Schritte unsichtbar wertig** (`suspected`, mild): `tan_leather` (Uplift 0), `reinforce_studded_leather` (+9), `cure_warhide` (+54) liefern kaum Gold-Uplift und keinen eigenen Ausrüst-Nutzen — sie lesen sich als „Pflicht-Zwischenschritt". Kein Bug (Zwischenprodukte), aber ohne Mastery-Anreiz zäh. Owner: **content-dev** (optional).

## TOP-3 VERBESSERUNGEN (Soll-Zahlen)
1. **SkillPage: Material-/Gerb-Aktionen je Kategorie nach vorne** — analog `smithingOrderKey`: Output-Item vom Typ `material` (bzw. Aktion mit `tan_`/`cure_`/`reinforce_`-Prefix) bekommt Sort-Key 0, Rüstung danach. Erfüllt den Chef-Wunsch für alle Tiers konsistent (cured/hardened/warhide), nicht nur zufällig für dragon/shadow.
2. **`tan_scaled_leather` einführen** (L14, ~9.000 ms, xp ~7): Input z.B. `2× scaled_hide` (neuer Gather-/Drop-Roh-Input) **oder** `2× scarred_hide + 1× fang/scale` → schließt die Gerb-Leiter, gibt dem Scaled-Tier + studded/warhide eine Craft-Route und nimmt die combat-only-Härte. Falls `scaled_leather` bewusst „gefunden" bleiben soll: als Design-Entscheidung dokumentieren.
3. **Mastery der Gerb-Stufen leicht belohnen:** z.B. `tan_*`-Aktionen `min:1,max:1`→ bei Mastery-Doppelertrag ohnehin 2×; zusätzlich könnten `cure_warhide`/`reinforce_studded` bei Mastery ein kleines Barren-Preserve (steel/mithril) erhalten — macht die Zwischenstufen spürbar besser statt reine Pflicht.

## Bestätigt (GERADE GEFIXT / nicht neu melden)
- **Hide-dex-Mods present** (Sweep3 „hide-dex root-cause fix"): die gesamte Hide-Linie trägt jetzt `modifiers: { dex }` + `rangedDamage` (scaled +1/2 … voidhide +2…+5) — Hide ist damit sauber die **Ranged-Rüstungslinie**. `content:2913-3108, 8896-8927`. `confirmed`.
- **Drei-Stile-Struktur:** L99-Caps für alle drei Linien vorhanden (Godiron-Plate/Smithing = melee, voidhide = ranged, voidweave = magic) mit „parity with Godiron"-Kommentaren. Strukturell abgedeckt; feine ±10%-Parität liegt bei balance-designer (Sweep3).
- **Pet über echten Pfad dropbar**; **exploit-frei** (keine Häute im Shop); **0 Null-XP-Aktionen** über alle 107 Rezepte (nichts tot verdrahtet).

**Empfehlung: ship** — A−-Skill. Finding #1 (Tan-vorne) ist der einzige explizite Chef-Wunsch und ein kleiner UI-Sort-Fix; #2/#3 sind Content-Polish, kein Blocker.
