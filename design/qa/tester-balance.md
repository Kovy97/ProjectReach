# Tester-Report — Balance / Ökonomie / Pacing (Welle T1)

**Rolle:** balance-designer (read-only). **Datum:** 2026-06-27.
**Datenquelle:** `pnpm --filter @hearthforge/engine exec vitest run sim` (cache-frisch, voller 1h-Report — AKTIONEN + KAMPF Bronze-Baseline + KAMPF Geared-Endgame-Held).
**Yardstick:** `target_xph(L) = 90·√(xpForLevel(L+1)−xpForLevel(L))` → L1≈820, L18≈1909, L50≈9271, L75≈31950, L90≈67139, L99≈104831, L115≈231484.
**Sim-Status:** AUFFÄLLIGKEITEN(0), ECHTE WALLS(0), nur 2 erwartbare Über-Baseline-Mobs (scale_skarn L104, last_idol L120). Engine ist grün und gesund — die Findings unten sind Feinschliff, kein Brand.

---

## TL;DR — Priorisierung

| Prio | Befund | Empfehlung | Wer entscheidet |
|---|---|---|---|
| **P1** | Fence-Kette low/mid-Tier zahlt **+73 bis +104 %** über Input-Verkaufswert — der dokumentierte Guardrail ist „+15–25 %". Gem-Byprodukte sind der Treiber. | Gold-Ranges der gem-tragenden Fences senken (Tabelle unten) ODER Guardrail-Kommentar an die echte Intention anpassen. | CEO-safe (Content-Zahlen, reversibel); *Intent* = leichter Chef-Entscheid |
| **P1** | **Monster-Lücke L75→L92** (17 Level). Mit `XP_ZERO_GAP=15` bekommt ein Spezialist bei Kampf-Skill L76–90 von roc_storm(75) auslaufendes/Null-XP und hat als einzigen On/Above-Level-Mob idol_warden(92). Soft-Wall im Übergang. | Brücken-Monster Lv 78–86 ergänzen (Content). NICHT die XP-Konstanten anfassen. | Chef (neuer Content) — niedrig-Risiko |
| **P2** | Combat-Level-XP **Gold-Exploit an schwachen Mobs: existiert NICHT.** Gold skaliert mit Mob-Wert; schwächste Mobs = niedrigstes Gold/h. | Kein Eingriff. Worry des Chefs mit Daten geschlossen. | — |
| **P2** | Combo-Food T5 (`ambergrain_feast`) bündelt Heilung + 12 HP/s Regen + **großes Kampf-Buff-Paket** (+14 alle Schäden, +6 % Crit, +12 Acc, +22 Def). Macht es zum Pflicht-BiS-Food und könnte dedizierte Buff-Tränke entwerten. Trivialisiert Kampf aber **nicht** (12/s ≈ 1,8 %/s auf Endgame-HP-Pool). | So lassen; optional T5-Buff-Magnitude gg. Herblore-Tränke gegenchecken. Sim-Variante mit Combo-Food im Kampf ergänzen, um In-Combat-Sustain zu messen. | Chef (Design-Identität) |
| **P2** | Dominante Gold-Strategie ist **High-Tier-Smithing** (Forge-Margen 1–3,4 Mio g/h im Sim), nicht Fence/Thieving. Vorbestehend (crafting-margin-audit). | Außerhalb des Nacht-Scopes, aber: Fence/Thieving sind NICHT das Ökonomie-Problem. | Chef (vorbestehend) |
| **P2** | Farming läuft am unteren Level marginal heiß (farm_ashroot L12 +27 %), bleibt aber im Gathering-Band. | Toleranz, kein Eingriff nötig. | — |

---

## 1) Combo-Food — solide, gut gated

**Kochen-XP der Combo-Gerichte trifft die Formel praktisch exakt** (keine Verzerrung der Kochen-Progression):

| action | lvl | XP/h (sim) | target_xph | Abw. |
|---|---|---|---|---|
| cook_marshroot_chowder | 18 | 1813 | 1909 | −5 % |
| cook_bloodgrain_stew | 38 | 5267 | 5123 | +3 % |
| cook_soulgourd_brisket | 58 | 14420 | 13773 | +5 % |
| cook_witherleek_bouillabaisse | 75 | 33453 | 31950 | +5 % |
| cook_ambergrain_feast | 90 | 72570 | 67139 | +8 % |

**hpRegen-Leiter 1→2→4→7→12 HP/s** ist gestaffelt und gated (Kochen L18→L90 + jeweils Top-Tier-Inputs: T5 = raw_soulfish + 2×raw_beef + ambergrain + herb_godsbreath).
- **Trivialisiert Kampf NICHT.** Endgame-HP-Pool (`maxHp = 50 + con·10 + (vitality−1)·3 + eq`) liegt für einen geared L90-Helden grob bei ~650–900 HP. 12 HP/s = ~1,3–1,8 %/s → ein Supplement, kein Out-Heal; Auto-Eat (z. B. Voidray 170/Bissen) bleibt die Hauptheilung. Mid-Game (T3 = 4/s auf ~440 HP ≈ 0,9 %/s) noch unkritischer.
- **Bricht den Combat-Level-XP-Anreiz NICHT** — Regen gibt Survival, nicht XP; der Anreiz, On-Level zu kämpfen, bleibt.
- **Lohnt vs. einfache Foods:** `cooked_voidray` heilt 170 (kein Buff); `ambergrain_feast` heilt 265 + Regen + Kampf-Buffs. Klarer Upgrade, der den Input-Aufwand rechtfertigt → keine „toten Inhalte".

**Einzige Beobachtung (P2):** Das T5-Kampf-Buff-Paket ist so stark, dass Combo-Food strikt-BiS wird und Buff-orientierte Herblore-Tränke (z. B. brew_bloodrage/warpath/ironbark) im Schatten stehen könnten. Das ist *gewollt* („beste Quelle … mit sehr guten Effekten"), nur als Design-Wechselwirkung markiert. **Sim-Lücke:** Der Kampf-Sim füttert den Helden mit `cooked_voidray`, nie mit Combo-Food → In-Combat-Sustain mit 12/s wird aktuell nicht gemessen. Empfehlung: eine Sim-Variante mit `food: "ambergrain_feast"` ergänzen, um zu bestätigen, dass 12/s einen unter-gelevelten Helden nicht über +6–14-Level-Mobs facerollen lässt.

**Verdict: GRÜN.** Keine Zahl-Änderung nötig.

---

## 2) Combat-Level-XP (#113) — Mechanik gut getunt; Risiko liegt im Content-Gap

Konstanten: `XP_FULL_GAP=5`, `XP_ZERO_GAP=15` (voll bis +5 über Mob, linear → 0 ab +15; Spieler *unter* Mob nie gedämpft). Loot/Gold ungedämpft. Vitality-XP ungedämpft (kein Vitality-Dead-Zone). **Die Bandbreite ist sanft und fair — keine Änderung an den Konstanten empfohlen.**

### Gold-Exploit an schwachen Mobs? → NEIN (mit Daten geschlossen)
Gold ist ungedämpft, ABER Gold/h skaliert mit dem Mob-Wert, also sind schwache Mobs die *schlechteste* Gold-Quelle. Geared-Held, 1h:

| Mob | Lv | Gold/h |
|---|---|---|
| goblin | 1 | 4 456 |
| chicken | 1 | 4 415 |
| ash_tyrant | 20 | 46 936 |
| **slag_kobold** | **46** | **147 816** |
| **frost_hound** | **62** | **150 315** |
| last_idol | 120 | 74 157 |

Der optimale Gold-Farm ist der **höchste schnell tötbare Mid-Tier-Mob** (genau das beabsichtigte Verhalten), nicht der schwächste. Ein über-levelter Spieler, der einen Low-Mob ohne XP plättet, verdient ~4–7 k g/h — niemand wird das tun. **Befund: kein Exploit. Worry kann geschlossen werden.**

(Nebenbeobachtung P2: Gold/h hat sein Maximum bei Lv 42–62 und sinkt zum Endgame — last_idol(120) gibt weniger g/h als slag_kobold(46). Endgame-Mobs werden also um XP/Drops gekämpft, nicht um Gold. Akzeptabel, nur zur Kenntnis.)

### XP-Dead-Zone / erzwungene Wand? → EINE Stelle: L75→L92
Monster-Level-Leiter: …62, 65, 68, **75**, *(Lücke 17)*, **92**, 98, 104, 120.
- Bei Kampf-Skill L76–80 speist roc_storm(75) noch volle/leicht reduzierte XP (diff 1–5). Bei L81–89 läuft sie linear aus; bei **L90 ist diff=15 → exakt 0 XP** von roc_storm.
- Der nächste On/Above-Level-Mob ist idol_warden(92). Ein Spezialist (nur Magie / nur Fernkampf) im Übergang L85–91 muss faktisch idol_warden(92) angehen (+2–7 über sich) für volle XP. Geared schafft das locker (306 Kills/h), aber frisch-an-92 kann es klemmen → **Soft-Wall**, erzeugt durch die Content-Lücke × ZERO_GAP, nicht durch die Formel.

**Empfehlung (P1):** 1–2 Brücken-Monster im Bereich **Lv 78–86** ergänzen (Content, kein Engine-Eingriff). Konstanten NICHT verändern — ZERO_GAP=15 ist im Rest der Leiter (Lücken ≤7) konfliktfrei.

---

## 3) Fence-Kette — über dem dokumentierten Guardrail (P1)

Code-Kommentar: „Gold-EV ~15–25 % über dem Verkaufswert der Inputs". **Real (Gold-EV + Gem-Byprodukt-EV vs. Input-Verkaufswert):**

| action | lvl | Input (Wert) | Gold-EV | Gem/Byprod-EV | Total-EV | **vs. Input** |
|---|---|---|---|---|---|---|
| fence_coinpurse | 1 | stolen_coinpurse (18) | 28 | garnet 3,2 | 31,2 | **+73 %** |
| fence_trinket | 12 | cutpurse_trinket (30) | 40 | garnet 4 + ruby 12,8 | 56,8 | **+89 %** |
| crack_smugglers_lock | 28 | smugglers_key (45) | 65 | cut_gem 27 | 92 | **+104 %** |
| launder_ledger | 30 | 2× ledger_page (150) | 175 | parchment ~12 | ~187 | +25 % ✅ |
| melt_insignia | 36 | guard_insignia (60) | 90 | cut_gem 18 | 108 | **+80 %** |
| reforge_signet | 65 | signet_ring (120) | 145 | cut_gem 36 + diamond 25,6 | 206,6 | **+72 %** |
| melt_goblet | 75 | ornate_goblet (240) | 280 | diamond 48 + onyx 24 | 352 | +47 % |
| desecrate_reliquary | 85 | reliquary_shard (360) | 410 | aether 10,5 | 420,5 | +17 % ✅ |
| appraise_idol | 95 | idol_coin (600) | 750 | onyx 60 + aether 3,5 | 813,5 | +36 % |

**Treiber sind die Gem-Byprodukte** (garnet/ruby/cut_gemstone/diamond/onyx) bei den low/mid-Fences. Der Prompt sagt „Niedrig-Tier höher" sei gewollt — *höher* ist ok, aber **+73 bis +104 % = das 3–4-fache** des dokumentierten Ceilings ist vermutlich unbeabsichtigt.

### Entwertet Fence Mining/Jewelcrafting? → NEIN
Gem-Durchsatz aus Fence ist ein Rinnsal vs. dedizierte Seam-Mining: `mine_ruby_seam` 649 Ruby/h (112 160 g/h), `mine_diamond_seam` 586/h (191 600 g/h). Fence liefert wenige Gems/h und ist input-limitiert. Mining bleibt klar überlegen.

### Macht Fence Thieving „zu lukrativ"? → Grenzwertig, nicht dominant
Thieving-Steal-Gold/h (Sim, Input-unlimitiert = Decke): pickpocket_noble 50 k, raid_tax_vault 73 k, heist_idol_hoard 125 k g/h. Plus Fence oben drauf. Kombiniert endgame ~150–200 k g/h — **vergleichbar mit Kampf (≤150 k), weit unter Smithing (1–3,4 Mio).** Thieving ist voll AFK + 0 Todesrisiko (das ist seine Identität), aber nicht die No-Brainer-Dominanzstrategie. Trotzdem sollte der low-Tier-Over-Reward an den Guardrail.

**Empfehlung (P1) — Gold-Ranges auf ~+25–30 % gesamt trimmen** (Gem-EV einkalkuliert). Apply-Liste für content-dev:

| id | Feld | current `gold` | recommended `gold` | Begründung |
|---|---|---|---|---|
| `fence_coinpurse` | gold | `{min:22,max:34}` | `{min:14,max:22}` | EV 18 → Total ~21 (+19 %) |
| `fence_trinket` | gold | `{min:30,max:50}` | `{min:14,max:26}` | Gems tragen schon 16,8; Total ~37 (+24 %) |
| `crack_smugglers_lock` | gold | `{min:50,max:80}` | `{min:24,max:40}` | Gem 27; Total ~59 (+31 %) |
| `melt_insignia` | gold | `{min:70,max:110}` | `{min:48,max:78}` | Gem 18; Total ~81 (+35 %) |
| `reforge_signet` | gold | `{min:110,max:180}` | `{min:70,max:118}` | Gem 61,6; Total ~156 (+30 %) |
| `melt_goblet` | gold | `{min:220,max:340}` | `{min:200,max:300}` | Gem 72; Total ~322 (+34 %) |

`launder_ledger`, `desecrate_reliquary`, `appraise_idol` bleiben unangetastet (bereits im/nahe Band).
**Alternative (statt Gold-Trim):** den Kommentar in `index.ts` (Zeile ~5246) auf die echte, gewollte Intention umschreiben. → *Was die Intention ist (strenger +25 %-Guardrail vs. Fence als bewusster Thieving-Gold-Payoff), ist ein leichter Chef/CEO-Entscheid; der Trim selbst ist CEO-safe (reine Content-Zahlen, reversibel, bringt den Code an seinen eigenen dokumentierten Guardrail).*

---

## 4) 4-Skill-Erweiterung (farming · foraging · herblore · inscription) — konsistent

Alle vier haben glatte, in sich konsistente Kurven, keine flachen Strecken / Klippen / 0-XP-Aktionen.

**Herblore** (Haupt-Brau-Linie) trifft die Formel quasi perfekt:
| action | lvl | XP/h | target | Abw. |
|---|---|---|---|---|
| brew_minor_heal | 1 | 1029 | 820 | +25 % |
| brew_heal | 21 | 2215 | ~2200 | ±0 |
| brew_greater_heal | 41 | 6000 | ~6100 | −2 % |
| brew_potent_heal | 61 | 15900 | ~16500 | −4 % |
| brew_godsbreath_elixir | 99 | 104760 | 104831 | **±0** |

**Inscription** (Glyphen/Sigille) läuft konsistent ~+27 % über der bloßen Formel — **dasselbe Band** wie die etablierten Gathering-Skills:
- scribe_glyph_bulwark L55 → 15 200/h (target 11 873, +28 %); scribe_glyph_ruin L85 → 66 460/h (target 52 417, +27 %).
- Enchant-Sub-Linien (`inscription_enchanting`) haben bewusst niedrige XP/Aktion (verbrauchen Gear) — Value-Add, keine XP-Farm. Korrekt.

**Farming & Foraging** (Sim, XP/h) liegen ebenfalls im Gathering-Band (Woodcutting/Mining/Fishing laufen alle ~+25–40 % über der nackten 90·√-Formel; die Neuen sitzen daneben):
- farm_ashroot L12 1818 (+27 %), farm_emberroot L65 25 896 (+33 %), farm_godbloom L95 119 425 (≈ Mining/Fishing L95 ~120 k) → **konsistent mit den Geschwistern.**
- Sekundär-Linien (Kräuter/Pigmente/Reeds) haben niedriges Gold/h (1–12 k) — Input-Produktion für Herblore/Inscription, downstream monetisiert. Keine toten Inhalte, solange die Verbraucher-Skills die Mats abnehmen (tun sie).
- Foraging ist gold-stark (forage_godfungus 132 k, forage_starcaps 134 k g/h) — auf Mining-Niveau, für einen Gather-Skill ok.

**Verdict: GRÜN.** Kein P0/P1. Pacing early→endgame durchgehend glatt.

---

## 5) Tedium / tote Inhalte / Dominanz — Gesamtbild

- **No-Brainer-Gold = High-Tier-Smithing**, nicht die Nacht-Systeme. Forge-Margen im Sim: `forge_godiron_greatsword` 3,42 Mio g/h, `forge_titanium_maul` 1,78 Mio, `forge_bloodiron_spear` 1,04 Mio. (Sim = Input-unlimitiert; real erz-gated, aber die Pro-Item-Marge ist enorm.) Das ist die eigentliche Ökonomie-Stellschraube — vorbestehend (`design/crafting-margin-audit.md`), außerhalb des Nacht-Scopes, aber relevant fürs Framing: **Fence/Thieving sind nicht das Problem.**
- **Combat-Health:** AUFFÄLLIGKEITEN(0), keine geared-Walls. `skeleton_nekro` L45 (Bronze 3 Kills/1200s, geared 373) und `roc_storm` L75 (Bronze 8 Kills/15 Tode, geared 227) sind bewusste Regen/DPS-Checks — für den unter-gerüsteten Baseline erwartbar, kein Bug. Mild tedious für exakt-On-Level-Spieler, vorbestehend.
- **Keine 0-XP-Aktionen, keine kills=0-Walls** für den geared Helden.

---

## Apply-Liste (geordnet, für CEO → content-dev)

1. **[P1, CEO-safe] Fence-Gold trimmen** auf den dokumentierten Guardrail — 6 Aktionen, Tabelle in §3. *(Oder: Intent klären + Kommentar anpassen — leichter Chef-Entscheid.)*
2. **[P1, Chef] Brücken-Monster Lv 78–86** ergänzen, um die L75→L92-Lücke zu schließen (entschärft die Combat-XP-Soft-Wall für Spezialisten).
3. **[P2, Sim-Tooling] Kampf-Sim-Variante mit Combo-Food** (`food: "ambergrain_feast"`), um In-Combat-Sustain der 12 HP/s zu messen — aktuell ungetestet.
4. **[P2, Chef] T5-Combo-Food-Buff-Magnitude** gg. Herblore-Buff-Tränke gegenchecken (Redundanz-Risiko) — Design-Identität, kein Bug.
5. **[Kein Eingriff] Combat-Level-XP-Gold** — kein Exploit (Daten in §2). Worry geschlossen.

**Nichts hiervon ist ein Brand.** Die Nacht-Systeme sind grundsolide; #1 und #2 sind die einzigen konkreten Zahl-/Content-Hebel.
