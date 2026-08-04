# QA Run 6 — Slayer-System (Phase 2: Helm / Gear-Set / Boss-Drop-Rezepte / Punkte-Shop)

Playtester: Slayer-Persona, STRIKT read-only (echte Daten aus `packages/content`, `packages/engine`,
`apps/client`). Datum: 2026-06-28. Kein Temp-Harness erstellt (alles per Code-Lese verifiziert; nur der
bestehende `slayer.test.ts` lokal ausgeführt → **13/13 grün**).
Kernfrage: **Schließt Phase 2 den 9,5-Blocker aus run5?** Helm sinnvoll/erreichbar? Boss-Drops jetzt
verwertet (0 Sackgassen)? Punkte dauerhaft relevant? Was hält Slayer noch unter 9,5?

Geprüfte Quellen:
- `packages/engine/src/slayer.ts` (slayerHelm-Hook, spendSlayerPoints) + `slayer.test.ts` (13/13 grün)
- `packages/content/src/index.ts`: neue Items 3968-4015, Rezepte 7898-7947, `slayer_set` 10142-10147,
  Boss-Loot 9002-9099, slayerShop 12206-12220, Achievements 9764-9769
- `apps/client/src/renderer/i18n/translations.ts` (P3-Wording)

---

## Fun-Score: 9,3 / 10   (Δ vs run5: +0,8, von 8,5/10)

**Der run5-P1 / 9,5-Blocker ist belastbar geschlossen.** Phase 2 ist nicht halbherzig, sondern
end-to-end verdrahtet: Es gibt einen echten kombinierten Helm, ein volles 4-teiliges Set mit
Set-Bonus, jede der vier superRare-Boss-Drops wird jetzt von einem Rezept verbraucht (0 Sackgassen),
und der Punkte-Shop ist von 5 auf 10 Einträge gewachsen (Gesamtkosten 975 → 10.475 Pkt). Dazu wurde
die letzte run5-P2-Achievement-Lücke (roc_void + highland_wyvern) gefüllt und der stale slayerShop-
Kommentar entfernt. Das ist die größte Einzel-Verbesserung der gesamten Slayer-Run-Serie.

**Warum 9,3 und nicht 9,5:** Genau die *zweite Hälfte* der run5-Empfehlung fehlt noch. run5 #2 lautete
nicht nur „mehr Shop-Einträge", sondern „aspirationaler Punkte-Sink, damit Punkte **dauerhaft** Wert
behalten (Prestige/Kosmetik/Buff)". Geliefert wurde der **einmalige** Teil (Gear = non-stackable,
buy-once). Nach dem Vollausstatten kippen Slayer-Punkte erneut in den reinen Skip/Cancel-Modus — der
einzige wiederholbare Shop-Kauf (`abyssal_core`) ist obendrein fehlpreisig (s. P2). Für ein **Idle**-
Spiel, dessen ganzer Pitch unendliche Langzeit-Progression ist, fehlt damit weiter der permanente
∞-Punkte-Sink. Das ist der verbleibende, jetzt deutlich kleinere Hebel zu 9,5.

---

## Verifikation Phase 2 → GELANDET ✅ (über das run5-Soll hinaus)

### 1. Slayer-Helm — echter Carrot, Engine-Hook jetzt belegt ✅
- `slayer_helm` (content 3968): `slot: helmet`, `rarity: epic`, **`slayerHelm: true`**,
  `bonus { defense:48, maxHp:140, accuracy:12, melee/ranged/magicDamage:12 }`, `requirements { slayer:80 }`.
- Engine-Hook lebt nicht mehr tot: `slayerRequirementMet` (slayer.ts 69-72) akzeptiert den
  ausgerüsteten Helm als Ersatz für **alle** Einzel-Req-Items — durch Test (slayer.test.ts 57) gedeckt.
- **Erreichbarkeit doppelt abgesichert (OSRS-Stil):**
  - Craft `craft_slayer_helm` (7898): smithing L80, verbraucht **alle 5 Req-Items** + `abyssal_core×5`
    + blighted_bone×20 + forge_ember×10 + titanium_bar×10. Das ist exakt der run5-Wunsch
    („kombinierter Helm ersetzt 5 Einzel-Items") — die alten Gates werden konsumiert, nicht doppelt getragen.
  - Shop-Fallback (12219): 3000 Pkt, slayer 80 — für Slayer ohne Smithing-Skill.
- Stat-Niveau ist aspirational (epic, all-style +12, hohe def/hp) und nicht Vendor-Trash. Sinnvoll. ✅

### 2. Slayer-Gear-Set — volle Aspirations-Leiter ✅
- `slayer_vambraces` (gloves, slayer 50), `slayer_greaves` (legs, slayer 65), `slayer_amulet`
  (amulet, slayer 70) — alle epic, alle mit echtem Stat-Profil über alle drei Kampfstile.
- **`slayer_set` „Slayers Ornat"** (10142): 4 Teile, `minPieces:2`, Bonus
  `{ def:20, maxHp:60, acc:10, all-dmg:8, crit:0.03 }`. Sauber gestaffelte Equip-Reqs (50/65/70/80)
  = eine echte Progressions-Leiter, kein Einzel-Drop. ✅

### 3. Boss-Drops → 0 Sackgassen (run5-Kernbefund behoben) ✅
Alle vier in run5 als „Sackgassen-Material" markierten superRare-Drops werden jetzt verbraucht:
| Drop | Quelle (Boss-Loot) | verbraucht von |
|---|---|---|
| `soul_flayer_fang` | soul_flayer 0.12 | `craft_slayer_vambraces` (×3) |
| `void_herald_shard` | void_herald 0.10 / 0.05 | `craft_slayer_amulet` (×3) |
| `dread_fang_shard` | dreadfang 0.35 / 0.20 / 0.18 | `craft_slayer_greaves` (×8) |
| `abyssal_core` | div. Bosse 0.04–0.08 | `craft_slayer_helm` (×5) + Shop |
Die Item-Beschreibungen (3955-3966) nennen jetzt korrekt die Ziel-Rezepte — das in run5 zitierte
„Zukünftige legendäre … Zutat" ist eingelöst. Auch die Nebenmaterialien (basilisk_scale→vambraces,
slag_carapace→greaves, blighted_bone/forge_ember→helm) sind jetzt Rezept-Inputs. **Sämtliche
Rezept-Inputs existieren** als reale Items (verifiziert). Keine toten superRare-Materialien mehr. ✅

### 4. Punkte-Shop von 5 → 10 Einträgen ✅ (aber: nur der einmalige Teil, s. Fazit)
- Neu: vambraces 1200 / greaves 1500 / amulet 1800 / abyssal_core 2000 / helm 3000.
- Gesamt-Sink 975 → **10.475 Pkt** — Größenordnung tiefer, klare Mid-/Endgame-Ziele, jeweils
  slayerLevel-gegated (50/65/70/80). Der Shop ist damit über die gesamte Reise hinweg relevant. ✅

### 5. run5-P2 (Turm-Bestiarium) → BEHOBEN ✅
`roc_void` und `highland_wyvern` haben jetzt die volle 10/100/1000-Kill-Kette (9764-9769).
Turm-Bestiarium ist damit zu 100 % Achievement-abgedeckt.

### 6. run5-P3 stale slayerShop-Kommentar → BEHOBEN ✅
Der „cross-revier (kein ContentDB.slayerShop befüllt …"-Kommentar ist aus dem Source entfernt
(kein Treffer mehr in `content/src/index.ts`); slayerShop trägt jetzt saubere Phase-1/Phase-2-Header.

---

## Was hält Slayer noch unter 9,5? (priorisiert)

### [P1] Punkte verlieren nach dem Vollausstatten erneut ihren Wert — der ∞-Sink fehlt weiter
Das ist der **alleinige verbleibende echte Hebel**. Der vertiefte Shop ist ausschließlich
**einmalige** Beute: 5 Req-Items + 4 Gear-Teile sind alle non-stackable/buy-once. Sobald der Slayer
einmal voll ausgerüstet ist, fallen Punkte zurück auf reines Skip/Cancel — exakt die run5-Langzeit-
Klippe, nur weiter nach hinten verschoben. Der einzige wiederholbare Kauf ist `abyssal_core`, und der
ist (a) fehlpreisig (s. P2) und (b) durch den Helm-Bedarf auf effektiv 5 Stück gedeckelt. Für einen
Idle-Slayer, der auf Dauer-Progression spielt, behalten Punkte damit **nicht dauerhaft** Wert.
**Fix (= der 9,5-Schlüssel):** ein permanenter/wiederholbarer Sink — z. B. mitwachsende
Slayer-XP-/Loot-Buff-Konsumvariablen, kosmetische/Prestige-Käufe, ODER Task-Streak-Bonuspunkte
(RS-Stil; run5 #4). Erst damit bleibt der Loop „klebrig" über das Kit-Out hinaus.

### [P2] `abyssal_core` im Shop ist eine ökonomische Falle (Preis-Inversion)
`abyssal_core` kostet 2000 Pkt; der **fertige Helm** kostet 3000 Pkt. Der Helm-Craft braucht aber
`abyssal_core×5` → Cores per Shop kaufen, um den Helm zu schmieden = **10.000+ Pkt** allein für die
Cores gegenüber 3000 Pkt für den fertigen Helm. Der Eintrag ist dadurch für rationale Spieler
praktisch tot (nur sinnvoll, wenn jemand 4 Cores gefarmt hat, den 5. braucht und Turm-Zugang fehlt).
**Fix:** Core-Preis deutlich senken (z. B. 600–800) ODER den Eintrag streichen.

### [P3] `slayer_set` hat nur einen 2-Teile-Breakpoint für ein 4-Teile-Set
`minPieces:2`, ein flacher Bonus. Das 3. und 4. Teil geben **keinen** zusätzlichen Set-Bonus (nur die
rohen Item-Stats). Für ein als „Regalia" verkauftes 4-Teile-Set fehlt der Sammel-Anreiz-Gradient.
**Fix:** zweiter Breakpoint (2-Teile / 4-Teile-Bonus). Konsistent zwar mit godgem_set (auch flach
2-Teile), aber dort sind es nur 2 Teile — hier verschenkt es Aspiration. (Kosmetisch, kein Blocker.)

### [P3] „nicht im Inventar!"-Wording weiter irreführend (run4-P3 → run5-P3 → run6, NICHT gefixt)
`slayer.req.missing` = „Benötigt: {item} — nicht im Inventar!" (translations.ts 697/1467), aber
`slayerRequirementMet` akzeptiert Besitz auch aus der **Bank** (slayer.ts 79). Drei Runs offen.
**Fix:** „… nicht im Besitz!".

### [P3] „Zum Kampf" navigiert nur generisch (run5-P3, NICHT gefixt)
`goToMonster` / `slayer.task.goToMonster` (SlayerPage.tsx 247) springt auf die Combat-Übersicht statt
direkt in Ziel-Zone/Etage. Gold-Glow + Badge fangen es ab; Deep-Link wäre der letzte Komfort-Schliff. Optional.

---

## Loop-Bewertung (Kurz)
- **Aspirations-Decke:** von „leer" (run5) auf „vorhanden & gut gebaut" gehoben — Helm + Set + Drops
  bilden jetzt eine vollständige Chase-Kette mit Craft- UND Punkte-Pfad. Das war der Kern-Hebel. ✅
- **Boss-Drops:** alle vier verwertet, 0 Sackgassen. ✅
- **Punkte:** über die Reise stark relevant (10.475-Sink), aber **nach** dem Kit-Out wieder terminal
  → der eine verbleibende Langzeit-Hebel.
- **Engine/Tests:** unverändert release-stabil, 13/13 grün, slayerHelm + spendSlayerPoints getestet.

---

## Δ vs run5 — Zusammenfassung
| Punkt | run5 | run6 |
|---|---|---|
| Slayer-Helm (`slayerHelm`-Item) | **fehlt** (toter Engine-Hook), P1-Blocker | **gelandet** — epic, Craft (5 Req-Items + Cores) + Shop 3000, getestet ✅ |
| Slayer-Gear / Set | **fehlt** (0 Treffer) | **gelandet** — vambraces/greaves/amulet + `slayer_set` (2-Teile-Bonus) ✅ |
| Boss-Drops = Sackgassen | **4 tote Materialien**, P1 | **0 Sackgassen** — alle 4 in Rezepten verbraucht ✅ |
| Punkte-Shop | 5 Einträge / 975 Pkt | **10 Einträge / 10.475 Pkt** ✅ (aber einmalig, kein ∞-Sink) |
| roc_void / highland_wyvern Achievements | P2 offen | **behoben** ✅ |
| stale slayerShop-Kommentar | P3 offen | **behoben** ✅ |
| Dauerhafter Punkte-Sink (Prestige/Buff) | Teil von #2 | **weiter offen** → neuer alleiniger P1 / 9,5-Rest-Hebel |
| `abyssal_core`-Shop-Preis | — | **neu P2** — Preis-Inversion (2000 vs. Helm 3000) |
| „nicht im Inventar"-Wording | P3 offen | weiter offen (P3, 3. Run) |
| goToMonster generisch | P3 offen | weiter offen (P3) |

Fun-Score 8,5 → **9,3** (+0,8). **Keine P0.** Ein P1 (∞-Punkte-Sink fehlt), ein P2
(abyssal_core-Preis), drei P3 (Set-Gradient, Wording, Deep-Link).

---

## Was fehlt für 9,5? (priorisiert)
1. **(Kern) Permanenter/wiederholbarer Punkte-Sink** — damit Slayer-Punkte **nach** dem Kit-Out
   weiter Wert behalten: mitwachsende Slayer-XP-/Loot-Buffs (konsumierbar), Prestige-/Kosmetik-Käufe,
   ODER Task-Streak-Bonuspunkte (RS-Stil, run5 #4). Das ist der einzige echte Rest-Hebel zu 9,5.
2. **(Schnell) `abyssal_core`-Shop-Preis fixen** (senken auf ~600–800 oder Eintrag streichen) —
   beseitigt die einzige Preis-Inversion und macht den einen wiederholbaren Kauf überhaupt sinnvoll.
3. *(Polish)* `slayer_set` zweiter Breakpoint (4-Teile-Bonus) für echten Sammel-Gradient.
4. *(Altlast)* P3-Reste: Wording „nicht im Besitz", Deep-Link goToMonster.

> Punkt 1 (ggf. + 2) hebt den Score auf 9,5. Die mechanische & Content-Substanz ist jetzt da; es fehlt
> nur noch die *dauerhafte* Idle-Aspiration jenseits des einmaligen Kit-Outs.
