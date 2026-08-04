# QA-Run 4 — Economy & Progression-Pacing (nach Run-3-Fixes)

**Tester:** Playtester / Economy- & Pacing-Reviewer (STRIKT READ-ONLY, kein Code geändert) · **Datum:** 2026-06-27
**Scope (Chef):** XP-Kurven-Gesundheit · Pacing früh→endgame · **neue Endgame-Mob-g/h-Kurve (gravecliff_specter→void_titan, Fix A)** · neue Crop-Consumables/Holzschilde als Mini-Senken (Fix C/D) · trägt die Gear-Treadmill (Smithing/Drops/Enchant) das Endgame? · „Warum grinden?". Vergleich zu `design/qa/run3-economy.md`.
**Methode:** Direkt aus echten Daten — `packages/content/src/index.ts` (neue Mobs L87–110, Crop-Rezepte, Holzschilde, Fix-F-Gear, `slayerShop`, Seed-Shop), `packages/engine/src/leveling.ts` (XP-Tabelle **selbst nachgerechnet via Node**), `enchant.ts` + `packages/shared/src/index.ts` (`enchantGoldCost`, `enchantSlotsFor`). Gold-pro-Kill + erwarteter Loot-Wert je Mob aus Content gerechnet (Item-`value` × `chance` × Ø-Menge). g/h-Anker (geared) aus `gold-economy.md §1` / run3 übernommen. Temporäres Sim-Harness wurde verwendet und wieder entfernt; es wurde **keine** Datei außer dieser angelegt.
**Wichtig (Chef-Status):** Die bekannten Senken-Themen (Gold ab Mid tot · Slayer-Punkte tot · Werkzeug-Leiter fehlt für 3/5 Gather-Skills) sind per Chef-Verfügung **bewusst an das City-Feature gekoppelt (deferred)** → werden hier **nur im Status bestätigt**, NICHT als neue Blocker gemeldet.

---

## Fun-Score: **7 / 10** (Economy/Pacing-Linse) — **Δ vs run3: +1**

Run 3 stand bei 6/10. Die seither angewendeten Fixes treffen **genau die nicht-monetären Belohnungsachsen**, die das Endgame tragen müssen, und heben den Score um einen Punkt:

- **Fix A** legt eine echte, **monoton steigende Endgame-Mob-Kurve** (L87→L110) über das alte L84–92-Vakuum und die flache/invertierte Combat-Gold-Kurve — die Auftragsfrage *„warum grinden?"* hat im Endgame jetzt **Mob-Vielfalt + steigenden Gold/Drop-Ertrag pro Level** als Antwort (run3 P2-Combat-Gold + run3-endgame P1-Funnel adressiert).
- **Fix F** schließt die Stil-Gear-Dürren (Magie-Roben-Lücke L22→40; ranged/magic **L99-Parität**) → die **Gear-Treadmill trägt jetzt alle drei Stile bis 99**, nicht nur Melee. Das war in run3 die zentrale „nur XP/Melee trägt late"-Sorge (run3 P3).
- **Fix C/D** geben toten Holz-Tiers (Offhand-Schilde) und sinkenlosen Crops (Koch-/Herblore-Verarbeitung) einen Zweck — **Ressourcen-Senken** (keine Gold-Senken), die Gathering/Farming-Loops runder machen.

Der Deckel bleibt: die **zwei toten Währungen (Gold mid/late · Slayer-Punkte)** sind unverändert — aber **per Chef bewusst deferred (City)**, daher **kein Blocker**. Genau das hält den Score bei 7 statt 8: die *monetäre* Achse bleibt late tot, während die *Gear-/XP-Achsen* jetzt sauber tragen.

**Kurz:** Die Belohnungs-*Vielfalt* und das Endgame-*Pacing* sind klar besser als run3; die Gold/Punkte-Senken bleiben (gewollt) offen für die City-Welle.

---

## Δ vs run3 — was die Fixes ökonomisch bewirken

| run3-Finding (Economy/Pacing-relevant) | Status in run4 | Beleg |
|---|---|---|
| **P2 Combat-Gold flach/invertiert** (L120-Boss zahlt ~ wie L14-Mob; Max im Mid-Tier) | **deutlich entschärft im neuen Band** — gold/Kill steigt jetzt monoton L87→L110 | Fix A, s.u. Tabelle |
| **run3-endgame P1** Combat-Funnel auf 4 Mobs / L84–92-Vakuum | **geschlossen** — 5 neue Open-World-Mobs L87/90/96/101/110 über 3 Zonen, kein Slayer-Gate | `index.ts:8426–8508` |
| **P3 Pacing** Stil-Gear-Dürren (Magie/Ranged), nur XP/Melee trägt late | **adressiert** — Glut-Robe (L30, Lücke L22→40), Voidhide T8 ranged L99, Leerengewebe T5 magic L99 | Fix F (`index.ts:2800,3481,3711,7237,7271`) |
| **Sinkenlose Crops** (gold-economy §3.1: Combo-Food umgeht Shop) | **Crop-Senke ergänzt** (8 Koch-/Herblore-Verarbeitungsprodukte) + Seed-Shop-Fallback | Fix D (`index.ts:538,7518,8854`) |
| **Tote Holz-Tiers** | **Senke ergänzt** — 4 Fletching-Holzschilde (Offhand) | Fix C (`index.ts:2828,6160`) |
| **P1 Gold ab Mid tot / kein mitwachsender Sink** | **unverändert — deferred (City)** | `shop`/`bank.ts` unverändert |
| **P1 Slayer-Punkte tot** (5 Einmal-Unlocks, 975 Pkt total) | **unverändert — deferred** | `slayerShop` = exakt 5 Items (`index.ts:11776`) |
| **P2 Werkzeug-Leiter fehlt 3/5 Gather-Skills** | **unverändert — deferred (City/S1)** | nur Mining+WC haben Tools |
| **Datenfehler in run3-economy:** „~3,26 Mio XP bis L99" | **korrigiert:** real **13,03 Mio** (run3-economy hat fälschlich ein zweites ÷4 angesetzt; `leveling.ts` enthält das ÷4 bereits) | Node-Nachrechnung, s.u. |

---

## 1) XP-Kurven-Gesundheit (nachgerechnet)

`buildXpTable()`: `acc += floor(n + 300·2^(n/7))`, `table = floor(acc/4)` — die **Standard-RS/Melvor-Kurve**, hart bei L99 gedeckelt. Selbst per Node nachgerechnet:

| Meilenstein | Gesamt-XP/Skill | Anteil |
|---|---|---|
| bis L20 | 4.470 | 0,03 % |
| bis L50 | 101.333 | 0,8 % |
| bis L60 | 273.742 | 2,1 % |
| bis L70 | 737.627 | 5,7 % |
| bis L80 | 1.986.068 | 15,2 % |
| bis L90 | 5.346.332 | 41,0 % |
| **bis L99** | **13.034.431** | 100 % |
| **60→99** | 12.760.689 | **97,9 %** |
| **90→99** | 7.688.099 | **59,0 %** |

**Früh-Verstärker** `earlyXpMult = 1 + 2·max(0,(40−level)/39)`: L1 **3,00×** · L10 2,54× · L20 2,03× · L30 1,51× · L40 1,00×. → Frühgame zügig, ab L40 voller Grind.

**Bewertung:** Kurve ist **gesund konstruiert** (glatt, monoton, bewährt) und **bewusst extrem back-loaded** (90→99 = 59 % der gesamten Skill-XP) — für ein Idle-Spiel by design. **Aber:** der reale Late-Grind ist **~4× länger** als run3-economy behauptet (13,03 statt 3,26 Mio). Das verschärft die Pacing-Konsequenz: Genau im back-loadedsten Drittel (90→99) **muss** die Belohnungs-Vielfalt liefern — was Fix A/F jetzt tun (mehr Mobs, alle Stile bis 99). Ohne diese Fixes wäre die Kurvenlänge ein echter „zäh"-Treiber; mit ihnen ist sie tragbar. **Kein Curve-Bug, aber Daten-Korrektur + Bestätigung, dass die back-end-Belohnungsdichte kritisch ist.**

---

## 2) Neue Endgame-Mob-g/h-Kurve (Fix A) — gravecliff_specter → void_titan

5 neue Open-World-Mobs, **kein Slayer-Gate**, verteilt highlands/slagpit/coast (auch in Slayer-Master-4-Pool `varek_nameless` aufgenommen → Slayer-Tasks profitieren mit):

| Mob | Lv | Zone | gold/Kill | xp/Kill | atkInt | erwart. Loot-Wert/Kill* | **gold+loot/Kill (≈)** |
|---|---|---|---|---|---|---|---|
| gravecliff_specter | 87 | highlands | 270 | 1.500 | 2,6 s | ~35 (feather/aether/void/soulopal) | **~305** |
| voidhusk_crusher | 90 | slagpit | 350 | 1.750 | 3,6 s | ~50 (godiron_ore 0,15·220 + void) | **~400** |
| abyssal_tide_serpent | 96 | coast | 520 | 2.300 | 2,8 s | ~40 (scaled_leather/aether/void) | **~560** |
| charred_doomknight | 101 | slagpit | 580 | 2.900 | 3,4 s | ~175 (godiron_ore 0,3·220 + bar 0,12·480) | **~755** |
| void_titan | 110 | highlands | 700 | 5.000 | 3,2 s | ~130 (void 0,4·80 + ore + key 0,04) | **~830** |
| *(Vergleich)* last_idol | 120 | idolhall | 794 | 16.000 | 3,8 s | hoch (idol_shard/aether/staff 0,05) | (Boss) |

\* erwarteter Loot-Wert = Σ `value × chance × Ø-Menge`; Item-`value`: void_essence 80, aether_essence 35, godiron_ore 220, godiron_bar 480, scaled_leather 28, soulopal 60.

**Befund:** Die **gold-pro-Kill-Kurve ist jetzt monoton steigend mit dem Mob-Level** (270→350→520→580→700; inkl. Loot ~305→~830). Das ist exakt der run3-P2-Fix: „härter = monetär lohnender" gilt im neuen Band. Die **XP-pro-Kill steigt ebenfalls sauber** (1.500→5.000), und void_titan (L110, xp 5.000) ist ein attraktiver L90+-Grind-Spot **außerhalb** der einen Idol-Hall-Room — genau die in run3-endgame P1 geforderte Rotation.

**Einschränkung (ehrlich):** Der **L120-Boss `last_idol`** (gold 794) bleibt der Endpunkt; die run3-Beobachtung „Boss-g/h < Mid-Tier-Mob" ist damit **nur im neuen Open-World-Band gelöst**, nicht boss-seitig — aber last_idol ist ein Capstone (xp 16.000, regen 14, enrage), kein Farm-Spot, daher unkritisch. **g/h-Decke** hängt an der (nicht neu vermessenen) Kill-Rate des geared Helden; gold/Kill+Loot zeigt aber zweifelsfrei die korrekte **Richtung**. *(Hinweis: ein live geared-Sim-Lauf zur g/h-Bestätigung wurde gestartet; die gold-pro-Kill-Monotonie steht unabhängig davon fest aus dem Content.)*

**Pacing-Wirkung:** Das L84–115-Trichter-/Vakuum-Problem ist ökonomisch **behoben** — der teuerste XP-Abschnitt (90→99) hat jetzt fünf gestaffelte Open-World-Ziele mit steigendem Gold/XP/Drop, statt eines Slayer-RNG-gegateten Lochs.

---

## 3) Neue Mini-Senken (Fix C/D) — Ressourcen-Senken, KEINE Gold-Senken

**Wichtige Einordnung:** Beide Fixes schaffen **Material-/Crop-Senken** (geben gefarmten Inputs einen Zweck) — sie sind **gold-neutral** und adressieren das deferred Gold-Sink-Defizit **nicht** (das bleibt City-Sache). Als Loop-Gesundheit sind sie aber echte Verbesserungen:

- **Crop-Verarbeitung (Fix D):** 8 neue Consumables aus zuvor sinkenlosen Crops — Kochen (`ashroot_broth`, `grimwheat_porridge`, `gallows_preserve`) + Herblore (`nightshade_extract`, `mandrake_tincture`, `emberroot_tonic`, `corpse_lily_salve`, `godbloom_infusion`), gestaffelt L1→L95. Plus **Seed-Shop-Fallback** (7 Forage-Seeds, 3–320 g) — schließt eine Versorgungslücke **und** ist eine *winzige* wiederkehrende Gold-Senke (vernachlässigbar als Strom, aber endlich+früh wie alle anderen). → Crops haben jetzt eine Verwertungskette; Farming/Herblore/Cooking greifen ineinander.
- **Holzschilde (Fix C):** 4 Offhand-Schilde (`willowbark`→`grimwood`→`ashfen_buckler`→`voidwood_pavise`, def 7→58, L12→88) via Fletching aus toten Holz-Tiers. → Log-Senke + Offhand-Gear-Option für Nicht-Schild-Builds; verbreitert die Treadmill um den Offhand-Slot.

**Bewertung:** Gut für Crafting-/Gathering-*Verzahnung* und „nichts ist Müll", aber **kein** Beitrag zur Gold-Senken-Frage. Korrekt so — die Gold-Senken sind bewusst der City vorbehalten.

---

## 4) Trägt die Gear-Treadmill das Endgame? (Smithing / Drops / Enchant)

**Ja — und stärker als in run3.** Die drei Treadmill-Achsen:

1. **Smithing/Crafting-Tiers:** Runite(60)→Bloodiron(70)→Titanium(80)→Aetherium(90)→**Godiron(99)**, volle 9-teilige Sets + Waffenfamilien je Stil. Trägt unverändert sauber bis 99 (run3-endgame bestätigt).
2. **Drops:** Die neuen Mobs speisen die Top-Material-Pipeline (godiron_ore/bar, void/aether_essence) → Drops sind **Input für Smithing**, nicht nur Direkt-Gear → die Mob-Kurve und die Crafting-Treadmill greifen ineinander (charred_doomknight/void_titan als godiron-Quellen).
3. **Enchant:** `enchant.ts` + Affix-Runen sind live; Enchant-Slots nach Rarität (`enchantSlotsFor`: common 1 → epic 3 → legendary/godly mehr). **Gold-Kosten** `enchantGoldCost = 100·tier·(1+rarityIdx)` (z. B. T5/epic = 3.500 g/Enchant; Disenchant 0,5×). → Enchant ist eine **echte vierte Treadmill-Achse** *und* eine **kleine, wiederkehrende, mit Tier/Rarität skalierende Gold-Senke** — die einzige existierende Senke, die überhaupt mit dem Fortschritt mitwächst. Sie ist aber **zu klein**, um das Mid/Late-Gold-Loch zu schließen (3,5k vs. 150k+ g/h Income), und RNG-Reroll (der große ∞-Sink, `gold-economy.md` S5) hängt weiter am noch nicht freigegebenen Rarität-Reroll.

**Stil-Parität (Fix F):** Mit Voidhide (ranged L99) + Leerengewebe (magic L99) + Glut-Robe (L30) erreichen jetzt **alle drei Stile** eine L99-Rüstungsdecke und haben keine 40-Level-Gear-Dürre mehr → die Treadmill motiviert ranged/magic-Builds bis zum Cap gleichwertig zu Melee. Das war run3s größte „trägt nur Melee"-Lücke.

**Fazit:** Die Gear-Treadmill ist der **funktionierende Endgame-Motor** und seit run3 **breiter** (alle Stile bis 99) und **verzahnter** (neue Mobs → Crafting-Inputs). Gold bleibt dabei der schwache Belohnungsträger, aber Gear/XP tragen.

---

## 5) Priorisierte Findings

> Per Chef sind Gold-/Slayer-Punkte-Senken **deferred (City)** → unten als **[DEFERRED-STATUS]** geführt, **nicht** als neue Blocker.

### [P0] — **keine.**
Nichts in dieser Linse blockiert Gameplay.

### [P1 — DEFERRED-STATUS, bekannt] Gold ab Mid/Late tot — kein mitwachsender Sink
**Befund:** Unverändert ggü. run3/`gold-economy.md`. `shop`-Sortiment endet früh, `bank.ts` weiter gratis/unbegrenzt, einzige *mitwachsende* Senke ist **Enchant** (klein, s. §4). Income late 150k–Mio g/h. **Status bestätigt, per Chef an City gekoppelt → kein Blocker.** Daten geliefert; keine neue Empfehlung über `gold-economy.md §6-7` (S1+S2+S3) hinaus.

### [P1 — DEFERRED-STATUS, bekannt] Slayer-Punkte tote Währung
**Befund:** `slayerShop` ist **exakt die 5 Einmal-Unlocks** (50/75/100/250/500 = 975 Pkt total), keine wiederkehrende/∞-Senke. Master-4 (`varek_nameless`) zahlt 20 Pkt/Task → nach ~975 Pkt sammeln Punkte sich zwecklos an. **Unverändert; deferred. Status bestätigt, kein Blocker.**

### [P2] L120-Capstone-Boss-g/h bleibt unter dem neuen Open-World-Band
**Befund:** Fix A macht das **L87–110-Open-World-Band** monoton, aber `last_idol` (L120, gold 794) ist weiter der Endpunkt mit boss-typisch niedriger g/h (regen 14, enrage, 3,8 s atk). Da Boss ≠ Farm-Spot, **gering**. **Fix-Vorschlag (optional, erst sobald ein Gold-Sink existiert):** last_idol-gold leicht über void_titan ziehen, damit „höchster Content = höchstes gold/Kill" lückenlos gilt.

### [P3] Late-Pacing weiterhin lang (13,03 Mio/Skill bis 99) — jetzt aber besser abgefedert
**Befund:** 90→99 = 59 % aller Skill-XP. Mit Fix A (5 Mob-Ziele) + Fix F (alle Stile bis 99) ist die Belohnungs-Vielfalt im back-end gestiegen → die Länge ist **tragbar**, aber für reine Idle-Spieler bleibt der Late-Grind der wahrscheinlichste Absprungpunkt. **Fix-Vorschlag:** wie run3 — Mastery/Achievement-Mikro-Meilensteine im 90→99-Band als Zusatz-Takt (Post-1.0); Gold-Sinks (City) geben Gold late wieder Funktion.

### [P3] Crop-/Holz-Senken sind Material-Senken, nicht Gold-Senken (Erwartungs-Hygiene)
**Befund:** Fix C/D verbessern Loop-Verzahnung, lösen aber **nichts** am Gold-Loch — wichtig, damit sie nicht fälschlich als Gold-Sink-Fortschritt verbucht werden. **Kein Handlungsbedarf; reine Klarstellung.**

---

## 6) Pacing-Bewertung Früh → Endgame (aktualisiert)

| Phase | Income g/h (on-level) | Gold-Gefühl | XP-Takt | Belohnungs-Vielfalt | Verdikt |
|---|---|---|---|---|---|
| **Früh L1–20** | ~5–20k | knapp & bedeutsam | 3×→2× Verstärker, sehr zügig | Gear-Käufe + erste Crops/Schilde | ✅ **gesund** (bester Teil) |
| **Mid L20–50** | ~30–150k | lockert, dann Stau | 1×; Glut-Robe schließt Magie-Lücke | breit (alle Stile, Crop-Ketten) | 🟡 Gold-Inflation beginnt, sonst gut |
| **Late L50–99** | 150k–Mio | **Gold totes Polster** (deferred) | langer Grind (90→99 = 59 %) | **deutlich besser:** 5 neue Mobs + L99-Parität alle Stile + Enchant | 🟢→🟡 **Gear/XP tragen jetzt; nur Gold/Punkte tot** |

**„Gründe zu grinden", ehrlich bewertet (Δ vs run3):**
- **Gold:** früh ✅ · mid 🟡 · late kein Grund 🔴 *(unverändert, deferred)*
- **XP:** durchgehend ✅ — verlässlichste Carrot *(unverändert)*
- **Drops/Gear:** **stärker** ✅✅ — Treadmill jetzt für **alle drei Stile bis 99** + neue Mobs speisen Crafting-Inputs *(Δ: run3 nur Melee-stark)*
- **Slayer-Punkte:** schwach 🔴 *(unverändert, deferred)*
- **Crop-/Material-Verwertung:** neu 🟢 — „nichts ist Müll", Loops verzahnt *(Δ: run3 sinkenlose Crops/tote Holz-Tiers)*

---

## Bottom Line
Run 4 zeigt **gezielte, wirksame Fixes** an genau den Stellen, die run3 als Endgame-/Pacing-Schwächen markiert hatte: die **Endgame-Mob-Kurve ist jetzt monoton (gold & XP) und vielfältig** (Fix A), die **Gear-Treadmill trägt alle drei Stile bis L99** (Fix F), und tote Crops/Holz-Tiers haben **Material-Senken** bekommen (Fix C/D). Damit hat *„warum grinden?"* late-game endlich eine überzeugende **nicht-monetäre** Antwort. Die **zwei toten Währungen (Gold mid/late, Slayer-Punkte)** bleiben — **gewollt, per Chef an die City-Welle gekoppelt** — und deckeln den Score weiter bei **7/10 (Δ +1)**. Nebenbefund: die XP-Kurve ist real **13,03 Mio/Skill bis 99** (run3-economy lag mit „3,26 Mio" um Faktor 4 daneben), was die Bedeutung der jetzt verbesserten back-end-Belohnungsdichte unterstreicht.
