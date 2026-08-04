# QA Run 7 — Slayer-System (Phase 3: wiederkehrender Punkte-Sink + abyssal_core-Preisfix)

Playtester: Slayer-Persona, STRIKT read-only (echte Daten aus `packages/content`, `packages/engine`,
`apps/client`). Datum: 2026-06-28. Kein Temp-Harness erstellt (alles per Code-Lese verifiziert; die
bestehenden Engine-Tests lokal ausgeführt → **24/24 grün**: slayer 13 + buffs 9 + wiring-audit 2).
Kernfrage: **Sind Slayer-Punkte jetzt DAUERHAFT relevant (wiederkehrender Consumable-Sink)? Ist der
abyssal_core-Preis (2000→300) sinnvoll? Was hält Slayer noch unter 9,5?**

Geprüfte Quellen:
- `packages/content/src/index.ts`: neue Consumables `slayer_combat_draught` (4043), `slayer_hunters_elixir`
  (4053); `slayerShop` 12292-12311 (abyssal_core 300 @12305, Consumables @12309-12310);
  `slayerMasters` basePoints 12188-12256
- `packages/engine/src/consumable.ts` (applyConsumableBuff / useConsumable), `character.ts` 179-183
  (Buff → computeStats), `slayer.ts` (spendSlayerPoints 204)
- `apps/client/src/renderer/pages/SlayerPage.tsx` 408-419 (Shop-Kauf), `i18n/translations.ts` 697/1467
- Tests: `slayer.test.ts`, `buffs.test.ts`, `wiring-audit.test.ts` (24/24 grün)

---

## Fun-Score: 9,4 / 10   (Δ vs run6: +0,1, von 9,3/10)

**Beide run6-Hold-backs sind belastbar und MECHANISCH ECHT geschlossen.** Der run6-P1 (∞-Sink fehlt)
und der run6-P2 (abyssal_core-Preisinversion) sind erledigt — und zwar nicht als tote Felder, sondern
voll verdrahtet und testgrün:

1. **Wiederkehrender Punkte-Sink (run6-P1) → GELANDET.** Es gibt jetzt zwei kaufbare, **unbegrenzte**
   Consumables im slayerShop (`slayer_combat_draught` 50 Pkt, `slayer_hunters_elixir` 200 Pkt, beide
   **ohne `maxPurchases`**, beide `stackable`). Sie sind keine Kosmetik-Attrappe: Beide tragen ein
   echtes `buff`-Feld, das über `applyConsumableBuff` (consumable.ts 11-17) in `state.character.buffs`
   landet und in `computeStats` (character.ts 179-183) via `addBonus` auf die Kampfwerte wirkt — **exakt
   derselbe Pfad wie jedes andere Buff-Food** (Auto-Eat inklusive). Damit haben Punkte nach dem
   Kit-Out **nie wieder Null-Wert**: es gibt immer einen sinnvollen Kauf.

2. **abyssal_core 2000→300 (run6-P2) → GELANDET & korrekt.** Die Preisinversion ist aufgelöst: Der
   Helm-Craft braucht `abyssal_core×5`; via Shop kosten die 5 Cores jetzt **1.500 Pkt** statt 10.000 —
   **unter** den 3.000 Pkt des fertigen Helms. Der Craft-Pfad (Cores zukaufen) ist damit der
   punkte-günstigere Weg, und 300 Pkt ist ein fairer „letzten Core auffüllen"-Preis für Farmer. Der
   früher tote Shop-Eintrag ist jetzt rational. ✅

**Warum 9,4 und nicht 9,5:** Die KERNFRAGE „Punkte dauerhaft relevant?" ist mit **Ja** zu beantworten —
strukturell. Aber zwei Dinge halten ihn knapp darunter: (a) **neue, milde Wert-Inversion** beim
Elixier (s. P2 — der teurere Trank ist pro Punkt ~2,2× ineffizienter als der Trank und damit für den
Dauerbetrieb dominiert → genau das „Trap-Tier"-Muster, das wir bei abyssal_core gerade behoben haben);
(b) der gelieferte Sink ist die **einfachste** der drei run5/run6-Optionen — er hält Punkte *nützlich*,
aber nicht *aspirational*: es gibt keinen mitwachsenden Prestige-/Kosmetik-Horizont, auf den man
**spart**. Für die volle Idle-Langzeit-Aspiration fehlt damit weiter eine Spitze. Beides ist klein —
darum +0,1, nicht Stillstand, aber auch noch nicht 9,5.

---

## Verifikation Phase 3 → GELANDET ✅

### 1. Wiederkehrender Sink — echt, unbegrenzt, mechanisch wirksam ✅
- `slayer_combat_draught` (content 4043): `consumable`, `stackable`, **`buff { durationMs: 600_000,
  bonus { melee/ranged/magicDamage: 10, critChance: 0.03 } }`**. Shop: 50 Pkt, slayerLevel 1.
- `slayer_hunters_elixir` (content 4053): `consumable`, `stackable`, **`buff { 600_000,
  melee/ranged/magicDamage: 18, critChance: 0.05, critDamage: 0.15 }`**. Shop: 200 Pkt, slayerLevel 40.
- **Unbegrenzt:** kein `maxPurchases` an den Einträgen (12309-12310). Kaufpfad SlayerPage.tsx 413-414:
  `spendSlayerPoints` → `addItem`; Gate nur über level/points/canHold. Bei stackable Consumables also
  beliebig wiederholbar. ✅
- **Kein toter Hook:** `buff.bonus` fließt über `applyConsumableBuff` → `computeStats` `addBonus`
  (character.ts 182) in die realen Kampfwerte. `tickBuffs` (consumable.ts 81) läuft die 10 min runter.
  `buffs.test.ts` 9/9 grün. **Das ist der saubere Gegenentwurf zum „defined-but-never-applied"-Risiko.** ✅

### 2. abyssal_core-Preisfix — Inversion aufgelöst ✅
- slayerShop 12305: `abyssal_core` cost **300** (vorher 2000), slayerLevel 80. Kommentar dokumentiert
  den Fix („5×2000=10000 >> 3000 Helm war Preisinversion").
- Rechen-Check: 5 Cores × 300 = **1.500 Pkt < 3.000 Pkt** (Direkt-Helm). Craft via zugekaufte Cores
  ist jetzt der günstigere Weg → Eintrag rational statt tot. ✅

### 3. Punkte-Ökonomie — Sink-Kadenz plausibel (Spot-Check) ✅/⚠️
- `basePoints` je Master: 2 / 5 / 10 / 20 (12188-12256); Tasks 15-120 Kills.
- Endgame (20 Pkt/Task): **Combat-Trank 50 Pkt ≈ 2,5 Tasks** für 10 min → gute, nachhaltige
  Dauer-Senke; Voll-Uptime (~300 Pkt/h) ist anspruchsvoll, aber Teil-Uptime trivial. **Gut kalibriert.** ✅
- **Elixier 200 Pkt ≈ 10 Tasks** für 10 min → für Dauerbetrieb zu teuer; faktisch Burst-/Boss-Treat
  (s. P2). ⚠️

### 4. Regressions-Check (run6-Errungenschaften unverändert) ✅
- Helm/Set/Vambraces/Greaves/Amulet, 0 Boss-Drop-Sackgassen, `slayerHelm`-Hook: alles unverändert
  vorhanden; `wiring-audit.test.ts` bestätigt, dass **alle** slayerShop-Items reale produzierte Items
  sind (keine toten Referenzen durch die zwei Neuzugänge). 24/24 grün. ✅

---

## Was hält Slayer noch unter 9,5? (priorisiert)

### [P2] Elixier ist pro Punkt ~2,2× ineffizienter als der Trank → milde neue Wert-Inversion
`slayer_combat_draught`: 50 Pkt → +10 All-Style-Schaden = **0,20 Dmg/Pkt**.
`slayer_hunters_elixir`: 200 Pkt → +18 All-Style-Schaden = **0,09 Dmg/Pkt** (Krit/Krit-Dmg obendrauf,
aber der reine Punkte-Wirkungsgrad bleibt < halb so gut). Da beide **unterschiedliche itemIds** sind,
**stapeln** ihre Buffs additiv — ein rationaler, punkte-limitierter Spieler kauft also primär Tränke
(besserer Wirkungsgrad) und nimmt den Elixier nur fürs absolute Burst-Ceiling dazu. In einer Ökonomie,
wo **Punkte** die knappe Währung sind, ist der Elixier damit ein **soft dominiertes „Premium-Tier"** —
genau das Trap-Muster, das wir bei abyssal_core gerade behoben haben.
**Fix:** Elixier punkte-effizienter machen (z. B. ~120-140 Pkt) ODER ihn klar **andersartig** machen
(längere Dauer / Slayer-XP- bzw. Loot-Mult statt nur „mehr Schaden") statt einer strikt teureren Variante.

### [P2] Sink hält Punkte *nützlich*, aber nicht *aspirational* — die ∞-Spitze fehlt weiter
run5#2 / run6-P1 nannten drei Optionen: (a) mitwachsende Konsum-Buffs, (b) Prestige/Kosmetik,
(c) Task-Streak. Geliefert ist **(a) in flacher Form**: zwei feste Tränke. Das erfüllt das Minimum
(Punkte nie mehr terminal) — aber es gibt keinen **wachsenden** Horizont, auf den man hin-spart
(skalierende Buff-Stufen, Prestige-Rang, Kosmetik). Für das Idle-Versprechen „unendliche
Langzeit-Progression" bleibt damit die *aspirationale* Decke offen.
**Fix (= der eigentliche 9,5→9,7-Hebel):** ein **skalierender** Sink — z. B. wiederholbarer
„permanenter +1 % Slayer-XP/Loot"-Kauf mit steigenden Punktekosten, ODER kosmetische/Prestige-Ränge.

### [P3] Kein Buy-Once-Schutz auf non-stackable Gear im Shop
SlayerPage.tsx 408-419 prüft nur level/points/canHold — **kein** „bereits besessen"-Gate. Bei
non-stackable Gear (Helm/Vambraces/…) kann ein Spieler theoretisch ein Duplikat kaufen (Punkte +
Slot-Verschwendung, selbstverschuldet). Latent, geringer Schaden, aber unsauber.
**Fix:** Kauf deaktivieren, wenn das non-stackable Item bereits in Inventar/Bank/Ausrüstung liegt.

### [P3] `slayer_set` weiterhin nur ein 2-Teile-Breakpoint (run6-P3, NICHT gefixt)
`slayer_set` (10231) `minPieces: 2`, flacher Bonus; das 3./4. Teil gibt keinen Set-Zusatz. Für ein
als „Regalia" verkauftes 4-Teile-Set fehlt der Sammel-Gradient. **Fix:** zweiter Breakpoint (4-Teile).

### [P3] „nicht im Inventar!"-Wording weiter irreführend (run4→5→6→7, NICHT gefixt)
`slayer.req.missing` = „Benötigt: {item} — nicht im Inventar!" (translations.ts 697/1467), aber
`slayerRequirementMet` akzeptiert Besitz auch aus der **Bank** (slayer.ts 79). Jetzt **4. Run** offen.
**Fix:** „… nicht im Besitz!".

### [P3] „Zum Kampf" navigiert nur generisch (run5→6→7, NICHT gefixt)
`goToMonster` springt auf die Combat-Übersicht statt direkt in Ziel-Zone/Etage. Komfort-Schliff. Optional.

---

## Loop-Bewertung (Kurz)
- **Punkte-Dauerwert:** von „nach Kit-Out terminal" (run6) auf „immer ein sinnvoller Kauf da" gehoben —
  der zentrale run6-P1-Hebel ist gezogen. ✅
- **Sink-Mechanik:** echt & getestet (Buff → computeStats, 9/9 buffs-Tests). Kein toter Hook. ✅
- **abyssal_core:** Inversion sauber aufgelöst (1.500 < 3.000), Eintrag rational. ✅
- **Verbleibend:** Elixier-Wirkungsgrad (milde neue Inversion) + fehlende *skalierende/aspirational*
  Spitze. Beides klein → daher knapp unter 9,5.

---

## Δ vs run6 — Zusammenfassung
| Punkt | run6 | run7 |
|---|---|---|
| Wiederkehrender Punkte-Sink (∞) | **fehlt** (alleiniger P1) | **gelandet** — 2 unbegrenzte Consumables, Buff→computeStats, getestet ✅ |
| abyssal_core-Shop-Preis | **P2** (2000 vs Helm 3000 = Inversion) | **gefixt** — 300; 5 Cores = 1.500 < 3.000 ✅ |
| Punkte nach Kit-Out | terminal (Skip/Cancel) | **nie mehr terminal** — immer ein sinnvoller Kauf ✅ |
| Elixier-Wirkungsgrad | — | **neu P2** — pro Punkt ~2,2× schlechter als Trank → soft Trap-Tier |
| Aspirational/∞-Spitze | Teil von P1 | **weiter offen** (P2) — Sink ist nützlich, aber nicht skalierend/aspirational |
| Buy-Once-Schutz Gear-Shop | (latent) | **als P3 notiert** — kein „besessen"-Gate |
| slayer_set 2. Breakpoint | P3 | weiter offen (P3) |
| „nicht im Inventar"-Wording | P3 (3. Run) | weiter offen (P3, **4. Run**) |
| goToMonster generisch | P3 | weiter offen (P3) |
| Engine/Tests | 13/13 grün | **24/24 grün** (slayer + buffs + wiring-audit) ✅ |

Fun-Score 9,3 → **9,4** (+0,1). **Keine P0. Kein P1 mehr** (run6-P1 geschlossen). Zwei P2 (Elixier-
Wirkungsgrad, fehlende aspirational Spitze), vier P3 (Buy-Once, Set-Gradient, Wording, Deep-Link).

---

## Was fehlt für 9,5? (priorisiert)
1. **(Schnell, der direkte 9,5-Hebel) Elixier-Wert-Inversion beseitigen** — Elixier punkte-effizienter
   preisen (~120-140 Pkt) ODER ihn als **andersartigen** Buff repositionieren (längere Dauer /
   Slayer-XP- bzw. Loot-Mult statt nur mehr Schaden). Beseitigt das einzige neue Trap-Tier und macht
   beide Tränke zu echten Alternativen. → das hebt allein auf **9,5**.
2. **(Kern für 9,5→9,7) Skalierende/aspirational Sink-Spitze** — ein **mitwachsender** Punkte-Sink, auf
   den man hin-spart: wiederholbarer „permanenter +X % Slayer-XP/Loot"-Kauf mit steigenden Kosten,
   Prestige-Rang ODER Kosmetik. Macht den Loop über das einmalige Kit-Out hinaus *langfristig klebrig*.
3. *(Polish)* Buy-Once-Gate für non-stackable Gear im Shop (P3).
4. *(Polish)* `slayer_set` 2. Breakpoint (4-Teile-Bonus) (P3).
5. *(Altlast)* Wording „nicht im Besitz!" (4. Run offen) + Deep-Link goToMonster (P3).

> Punkt 1 hebt direkt auf 9,5 (er entfernt die einzige neue Inversion und vollendet den jetzt schon
> mechanisch echten Sink). Punkt 2 ist der nächste Sprung Richtung 9,7+: aus „Punkte immer nützlich"
> wird „Punkte immer *erstrebenswert*". Die Substanz steht — es fehlt nur die Feinkalibrierung und die
> skalierende Spitze.
