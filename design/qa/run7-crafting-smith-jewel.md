# QA Run 7 — Crafting: Smithing + Jewelcrafting (runite-md-Bump, murkvein_bar-Senke, smithing→str entfernt)

Playtester-Fokus (Chef-Kernfragen R5 für diesen Lauf): (1) ist die **Runite-Upgrade-Kadenz endlich behoben** (claimed „runite-md-Bump +15–18 % über Adamantium")? (2) hat **`murkvein_bar` jetzt eine Senke** (`forge_murkvein_longsword`)? (3) ist **Smithing weiter sinnvoll, nachdem `smithing.trains = "str"` entfernt wurde** (Platte als str-Träger)? (4) was hält es unter 9,5?

Methode: READ-ONLY am Code (keine Edits an Content/Engine). grep/read-Querprüfung an `packages/content/src/index.ts` (Items/Actions/Skills) + Engine-Guards. **Kein eigener Temp-Harness erzeugt** → nichts zu entfernen (Verifikation per Code-Lesung + bestehende Guard-Tests). Sanity: `npx vitest run content-integrity content-refs wiring-audit smithing` = **21/21 grün**, 0 dangling refs. Werte 1:1 gegen `design/qa/run6-crafting-smith-jewel.md` (war 9,4) verglichen.

## Fun-Score: 9,5 / 10

## Δ vs run6 (war 9,4): **+0,1**

- **[NEU — Headline] Der „runite-md-Bump" ist endlich da — die U-Senke ist weg.** Die seit run4 **dreimal** verschobene Anhebung wurde diesen Lauf angewandt. Runite-`meleeDamage` steigt über die **gesamte Waffenfamilie** auf konstant **+15,6 … +16,9 % über Adamantium** (exakt im claimed Korridor +15–18 %). Der alte Adamantium→Runite-Schritt war ×1,08 (totes Tier); jetzt ist er ×1,16–1,17 — gleichauf mit Runite→Bloodiron (×1,14). **Der run6-P2-Blocker (der einzige In-Scope-Punkt, der run6 unter 9,5 hielt) ist geschlossen.** Monoton, 0 Inversionen (ada < runite < bloodiron auf jedem Waffentyp).
- **[NEU] `murkvein_bar` hat eine Gear-Senke — der run6-Halb-Sackgassen-P2 ist geschlossen.** `forge_murkvein_longsword` (Smithing L63, category `runite`, 16 500 ms, xp 150): **2× `murkvein_bar` → `murkvein_longsword`** (sword, md 88, acc 96, attack-req 63, value 3000). Das L62/63-Zwischen-Tier (mine_murkvein → smelt_murkvein → **forge**) ist jetzt durchverdrahtet; der frisch eingeführte Barren ist kein toter Pfad mehr. md 88 schiebt sich sauber zwischen runite_sword (84) und bloodiron_sword (96) und füllt die L60→L70-Waffenlücke.
- **[NEU] `smithing.trains` entfernt — sauber & konsistent.** Die Skill-Def ist jetzt `smithing: { id, name }` **ohne `trains`**. Damit reiht sich Smithing bei den übrigen Craft-Skills ein (cooking/fletching/JC/RC/herblore trainieren ebenfalls nichts; nur leatherworking→dex). Smithing war bisher die einsame Ausnahme — jetzt konsistent. **0 veraltete Referenzen** im gesamten `.ts`-Code (grep `smithing.*str` / `trains.*smithing` = leer); kein gebrochenes computeStats. str kommt jetzt über die **Schwergear-Modifier-Familie** (platebody/platelegs/medhelm/fullhelm + maul), monoton getiered.
- **[KEINE Regression]** 21/21 Guard-Tests grün; alle neuen/geänderten Items & Actions referenz-vollständig; Waffen-/Platten-/Suffix-Backbones der run5/run6-Verifikation unverändert intakt.

Was den Sprung auf **genau 9,5** macht (nicht darüber): Der gating-P2 ist weg → die 9,5 ist verdient. Über 9,5 hinaus halten nur noch **P3-Polish-Schulden**: die murkvein-Senke ist **dünn** (genau 1 Rezept, nur Langschwert), drei **run6-Carry-over-P3** sind unangetastet (Smelt-Gates, `recycle_scrap` marginal, `cut_gemstone`-Level-Mismatch), und die Chef-Formulierung „Platte einzige str-Quelle" ist faktisch **überspitzt** (str sitzt auch auf platelegs/Helmen/maul, und das str-Attribut wird weiter von woodcutting + power trainiert).

---

## Verifikation Kernfrage 1: Runite-Kadenz / „runite-md-Bump" — **BESTANDEN (geliefert)**

`meleeDamage` der Waffenfamilie, Adamantium (L50) → **Runite NEU (L60)** → Bloodiron (L70), mit run6-Altwert zum Vergleich:

| Waffe | ada | **run NEU** | run (run6 alt) | blo | ada→run |
|---|---|---|---|---|---|
| dagger | 45 | **52** | — | 60 | +15,6 % |
| sword | 72 | **84** | 78 | 96 | +16,7 % |
| scimitar | 62 | **72** | — | 82 | +16,1 % |
| mace | 72 | **84** | — | 96 | +16,7 % |
| axe | 75 | **87** | 82 | 101 | +16,0 % |
| battleaxe | 83 | **97** | — | 111 | +16,9 % |
| spear | 81 | **94** | — | 108 | +16,0 % |
| greataxe | 117 | **136** | — | 156 | +16,2 % |
| greatsword | 134 | **156** | — | 178 | +16,4 % |
| maul | 155 | **181** | 168 | 207 | +16,8 % |

- **Korridor getroffen:** alle Tiers +15,6…16,9 % über Adamantium → deckt sich mit „+15–18 %". sword 78→**84**, axe 82→**87**, maul 168→**181** (run6→run7).
- **U-Senke eliminiert:** der relative Adamantium→Runite-Schritt steigt von ×1,08 auf ~×1,16–1,17; das „tote" Upgrade-Tier von run4/run5/run6 ist behoben.
- **Monoton, 0 Inversionen** über alle 10 Waffentypen (ada < runite < bloodiron je Tier).
- **Murkvein als Glättungs-Zwischenstufe:** runite_sword 84 → murkvein_longsword 88 (L63) → bloodiron_sword 96 — geschmeidige Sword-Leiter zwischen L60 und L70.

## Verifikation Kernfrage 2: `murkvein_bar`-Senke — **BESTANDEN (mit Dünn-Senken-Vorbehalt)**

- **Senke vorhanden:** `forge_murkvein_longsword` konsumiert 2× `murkvein_bar` (Qty > 0, monoton verbraucht). Item `murkvein_longsword` existiert, alle Refs sauber. Kette mine_murkvein@L62 → smelt_murkvein@L62 → forge@L63 vollständig.
- **Ökonomie unauffällig:** forge xp/h ≈ 32,7 k liegt **zwischen** runite_sword (≈27,9 k) und bloodiron_sword (≈46,7 k); kein XP-Ausreißer (runite_platebody mit 320 xp/17 s ≈ 67,8 k bleibt Smithing-XP-König). Gold/h folgt der Tier-Reihe (runite < murkvein < bloodiron). **Keine Dominanz, kein Balance-Bruch.**
- **Vorbehalt (P3):** `murkvein_bar` hat **genau eine** Senke und **nur den Waffentyp Langschwert**. Andere Barren speisen ~20 Senken; murkvein_bar speist 1. Der Orphan ist geschlossen, aber wer kein Schwert will, schmilzt murkvein_bar nie ein → das Tier bleibt eine Ein-Item-Nische. Schließen ✓, begehrenswert breit: noch nicht.

## Verifikation Kernfrage 3: Smithing ohne `trains:str` weiter sinnvoll? — **JA**

- **Removal sauber:** `smithing: { id, name }` ohne `trains`; 0 Reststellen im Code; jetzt konsistent mit den anderen Craft-Skills.
- **Wertschöpfung unvermindert:** Smithing ist weiterhin die **alleinige Quelle** für (a) alle 10 Nahkampf-Waffentypen × 13 Tiers (md-Backbone), (b) sämtliche Platten-Rüstung (def/maxHp/md **+ str-Modifier**), (c) die Smelt-Kette, die JC/LW/RC/Fletching mit Barren speist, (d) Pfeilspitzen, plus die Senken murkvein/recycle_scrap/Slayer-Crafts. Das Profil „Schmied = Gear-Fabrik des Nahkampfs" ist intakt.
- **str = Equipment statt Skill-Trickle:** Die str-Modifier sitzen auf der Schwergear-Familie und sind getiert (z. B. platebody ada 5 → runite 7 → … run6: tit 12/god 18; maul ada 7 → run 8 → blo 9). Die „Schmied = Bruiser"-Identität ist jetzt **equipment-gegated** (man trägt die geschmiedete Platte), nicht mehr passiv skill-gegated. Thematisch sauberer (Stärke aus schwerer Rüstung) und entfernt den Cheese „Craft-Skill leveln → permanent Nahkampf-Buff unabhängig vom Spielstil".
- **Nuance/Vorbehalt (P3, Doku):** „Platte einzige str-Quelle" ist **überspitzt**. str-Modifier liegen auch auf platelegs, beiden Helmen und dem maul (einer Waffe); zusätzlich trainieren **woodcutting** und der Kampf-Skill **power** weiterhin das str-Attribut. Platte ist das Herzstück der str-Schwergear-Familie, aber nicht die einzige Quelle. Kein Bug — nur Framing.
- **Mini-Identitätskosten:** der „Skill leveln → direkt stärker"-Idle-Feedback-Loop für Smithing entfällt; Auszahlung jetzt nur noch über das Anlegen der Output-Gear. Netto kohärent, leichte Identitäts-Abflachung.

---

## Findings

### [P3] (NEU) `murkvein_bar` ist eine Ein-Rezept-Dünn-Senke
Orphan geschlossen, aber nur `forge_murkvein_longsword` (nur Langschwert) verbraucht den Barren. Wer Axt/Maul/Fernkampf spielt, hat keinen Grund, murkvein zu verhütten → murkvein bleibt eine Ein-Item-Nische statt eines echten Zwischen-Tiers.
**Fix (klein):** 1–2 weitere murkvein-Gear-Teile (z. B. murkvein-Schild/-Helm) **oder** murkvein offiziell als Flux/Legierungs-Material deklarieren, damit der Barren breiter zieht.

### [P3] (CARRY-OVER, unverändert seit run3) Drei Smelt-Gates 5 Level vor dem eigenen Erz
`smelt_bloodiron` L65 (mine_bloodiron L70), `smelt_titanium` L75 (mine L80), `smelt_aetherium` L85 (mine_aetherite L90) — Gap −5. Reiner Schmied bezieht das Erz 5 Level über eigener Mining-Reichweite (Drops/Shop).
**Fix:** Smelt-Level angleichen oder als bewusste Cross-Skill-Abhängigkeit dokumentieren.

### [P3] (CARRY-OVER, unverändert) `recycle_scrap` nur → `copper_bar`, wirtschaftlich marginal
Salvage von beliebig hochtierigem Gear → `item_scrap` → immer nur `copper_bar` (value 8) bei +1 XP/3,5 s. Schließt den Orphan, ist aber Müllentsorgung mit Forge-Anstrich, kein Pull.
**Fix (optional):** scrap→Barren am Tier des zerlegten Items skalieren, oder Scrap → Reforge/Re-Roll-Token (Suffix neu würfeln).

### [P3] (CARRY-OVER, unverändert) `cut_gemstone`: Token-Level (Thieving 55–97) ≫ Output (gemstone_ring JC L20)
Senke existiert (`craft_gemstone_ring`), aber Resultat ist für den Anfall-Zeitpunkt trivial.
**Fix:** höher-tierigen JC-Craft (L55+) aus `cut_gemstone` oder Sammelrezept N× → hochwertiges Schmuckstück.

### [P3] (NEU, Doku) „Platte einzige str-Quelle" ist faktisch überspitzt
str-Modifier liegen auch auf platelegs/medhelm/fullhelm/maul; str-Attribut wird zusätzlich von woodcutting + power trainiert. Harmlos, aber die Design-Notiz sollte „Platte = Herzstück der str-Schwergear-Familie" statt „einzige Quelle" lauten.

### [P3] (CARRY-OVER, unverändert) Platten-`attackIntervalMs`-Malus flach über alle Tiers
body +100 / legs +50 / fullhelm +25 skaliert nicht mit, dämpft früh am stärksten den md-Backbone. Bewusster Bruiser-Tradeoff (Chef-Entscheidung).

---

## Was fehlt für 9,5?

**Nichts mehr — die 9,5 ist diesen Lauf erreicht.** Der einzige In-Scope-P2, der run6 unter 9,5 hielt (der dreimal verschobene runite-md-Bump), **ist geliefert**, zusätzlich ist die murkvein_bar-Halb-Sackgasse geschlossen und `smithing.trains` sauber & konsistent entfernt — alles ohne Regression, ohne neues P0/P1/P2.

Für den **Weg über 9,5 (Richtung 9,6–9,7)** bleiben nur P3-Polish-Schulden:
1. **murkvein breiter verankern** (NEU P3) — 1–2 weitere murkvein-Teile oder Flux-Deklaration, damit der neue Barren kein Ein-Item-Tier ist.
2. **Drei Smelt-Gates** an Mining angleichen (Carry-over seit run3).
3. **`recycle_scrap`** von Müll-Token auf echten Pull heben (Tier-Barren oder Reforge-Token).
4. **`cut_gemstone`-Output** ans Token-Level anpassen (höher-tieriger JC-Craft).
5. **Doku-Korrektur** „Platte einzige str-Quelle" → „Herzstück der str-Schwergear-Familie".

Optional fürs i-Tüpfelchen: Platten-`attackIntervalMs`-Malus leicht mit Tier abschmelzen.

---

## Fazit
Run 7 liefert endlich die **dreimal verschobene Hausaufgabe**: der **runite-md-Bump** ist über die ganze Waffenfamilie angekommen (+15,6…16,9 % über Adamantium, exakt im claimed Korridor), die **U-Senke ist eliminiert** (Schritt ×1,08 → ×1,16–1,17), und mit der murkvein-Zwischenstufe (84→88→96) ist die Sword-Leiter L60→L70 geschmeidig. Dazu zwei saubere Closes: **`murkvein_bar` hat eine Gear-Senke** (`forge_murkvein_longsword`, run6-Halb-Sackgasse geschlossen, ökonomisch unauffällig) und **`smithing.trains` entfernt** (jetzt konsistent mit allen Craft-Skills, str sauber auf die Schwergear-Familie verlagert, 0 Reststellen, 21/21 Guards grün). Keine Regression, kein P0/P1/P2.

Der gating-P2 aus run6 ist damit weg → **9,5 verdient (+0,1)**. Über 9,5 hinaus halten nur noch P3-Polish-Reste: die murkvein-Senke ist dünn (1 Rezept/nur Langschwert, NEU P3), drei run6-Carry-over-P3 sind unangetastet (Smelt-Gates, recycle marginal, cut_gemstone-Mismatch) und eine Doku-Nuance („Platte einzige str-Quelle" überspitzt). Null P0/P1/P2, fünf P3 — ein gezielter, sauberer Schritt über die 9,5-Schwelle.
