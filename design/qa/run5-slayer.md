# QA Run 5 — Slayer-System (Phase 1 + Turm-Kill-Achievements)

Playtester: Slayer-Persona, STRIKT read-only (echte Daten aus `packages/content`, `packages/engine`,
`apps/client`). Datum: 2026-06-28. Kein Temp-Harness nötig (alles per Code-Lese/grep/sed verifiziert).
Fokus: Verifikation des run4-meta-P2-Fixes (**Turm-Mobs haben jetzt Kill-Achievements**), 4 Master/
Task-Flow, Turm (5 Etagen), Req-Items, Lauf-Hilfe, Hard-Block. Plus: **Ist Slayer Phase 2
(Helm/legendäre Drops) der Hauptblocker zu 9,5?**

Geprüfte Quellen:
- `packages/engine/src/slayer.ts` + `slayer.test.ts` (**13/13 grün**, lokaler vitest-Run)
- `packages/content/src/index.ts` (slayerTower, slayerMasters/taskPool, slayerShop, Achievements, Boss-Loot, Items)
- `packages/engine/src/combat.ts` (monsterKills-Verdrahtung)
- `apps/client/src/renderer/pages/SlayerPage.tsx` + `CombatPage.tsx` (TowerFloorView)
- `apps/client/src/renderer/i18n/translations.ts`

---

## Fun-Score: 8,5 / 10   (Δ vs run4: +0,5, von 8/10)

Der run4-meta-P2-Befund („Turm-Bestiarium hat 0 Kill-Achievements") ist **belastbar behoben** — und
sogar großzügiger als empfohlen. Damit zahlt das Bekämpfen der Turm-exklusiven Mobs jetzt voll auf
die Achievement-Jagd ein; der frei begehbare Turm bekommt eine Completionist-Schicht zusätzlich zum
Task-Loop. Das ist ein echter, aber **additiver** Meta-Gewinn (+0,5), keine Kern-Loop-Transformation.

Der Deckel auf 8,5 (statt 9,5) ist **eindeutig**: Die **Belohnungs-/Aspirations-Decke fehlt komplett**.
Der Slayer-Loop ist mechanisch release-fest, aber die Punkte und die superRare-Turm-Drops führen ins
Leere — es gibt **keinen Slayer-Helm**, **keine Slayer-Ausrüstung/Sets**, und die Boss-Drops werden
von **keinem Rezept** verbraucht. Das ist genau das, was Slayer Phase 2 liefern soll. **Ja — Phase 2
ist der Hauptblocker zu 9,5** (Belege unten).

---

## Verifikation run4-meta-P2 (Turm-Kill-Achievements) → BEHOBEN ✅ (über-erfüllt)

- **Alle 20 Turm-exklusiven Mobs** (rot_rat, plague_grub, shambling_carcass, hollow_marrow,
  gaze_basilisk, wailing_shade, bone_stalker, ashfield_wraith, slag_abomination, cinder_wretch,
  forge_demon, iron_revenant, dreadfang, void_stalker, sorrow_wraith, bone_colossus, dread_knight,
  soul_flayer, void_herald, abyssal_devourer) haben jetzt die **volle 10/100/1000-Kill-Kette**
  (`ach_kills_<id>_10/100/1000`, je common/uncommon/rare; iron_revenant zusätzlich Boss-Achievement
  `ach_boss_iron_revenant`, count 1, epic). Keine doppelten Achievement-IDs.
- **Verdrahtung korrekt & erreichbar:** `recordKill` in `combat.ts` Z. 377 erhöht
  `state.monsterKills[monster.id]` bei **jedem** Kill — auch im Turm. `monster_kills`-Achievements
  lesen genau diesen Zähler (`shared/index.ts` 1669). Turm-Etagen sind über `TowerFloorView`
  (`CombatPage.tsx` 899-1037) **frei begehbar** (nur SL-Etagen-Gate + Hard-Block via Req-Item),
  NICHT task-RNG-gegated — die 1000er-Ketten sind also legitim grindbar wie jeder Welt-Mob.
- **Damit ist die run4-meta-Sorge gegenstandslos** („1000er weglassen, da task-RNG-gegated"): die
  Annahme war falsch, der Turm ist frei farmbar. Der Implementierer hat richtig entschieden — volle
  Ketten sind konsistent mit dem restlichen Bestiarium.
- **Engine strukturell unverändert**, 13/13 Slayer-Tests grün (Determinismus/Hard-Block/Completion intakt).

---

## Hauptbefund: Slayer Phase 2 fehlt komplett — DAS ist der 9,5-Blocker

### [P1] Keine Aspirations-Belohnung: Helm fehlt, Drops sind Sackgassen, Punkte-Sink endet
Der Loop ist mechanisch zu — aber er **belohnt nur funktional**, nie aspirational. Drei harte Belege:

1. **Kein Slayer-Helm im Content.** Die Engine ist bereit: `slayerRequirementMet` (slayer.ts 70-72)
   akzeptiert ein ausgerüstetes Item mit `slayerHelm: true` als Ersatz für ALLE Einzel-Req-Items.
   Im gesamten Content gibt es jedoch **0 Items mit `slayerHelm`**. Das ikonischste Slayer-Reward
   (kombinierter Helm) existiert nur als toter Engine-Hook.
2. **Keine Slayer-Ausrüstung/Sets/Waffen.** `grep slayer` über equipment/set/weapon im Katalog: **0
   Treffer**. Es gibt nichts Stat-Tragendes zu erjagen.
3. **Boss-Drops sind Sackgassen-Material.** Die „superRare" Turm-Boss-Drops sind alle
   `type: "material"` und werden von **keinem** Rezept verbraucht:
   - `soul_flayer_fang` (value 300) — 2 Refs (Def + 1 Loot-Tabelle), **kein** Crafting-Input
   - `void_herald_shard` (value 250) — Beschreibung wörtlich: *„Zukünftige legendäre
     Fernkampfwaffen-Zutat."* → das Rezept fehlt
   - `abyssal_core` (value 500), `dread_fang_shard` — ebenfalls von keinem Rezept genutzt
   Man hortet sie, ohne dass es je etwas damit zu tun gibt.
4. **Punkte-Shop endet.** `slayerShop` = nur **5 funktionale Req-Gate-Items** (plague_mask, ear_plugs,
   mirror_ward, soul_veil, void_anchor, Summe 975 Pkt.). Nach dem Kauf aller fünf haben Slayer-Punkte
   **keinen aspirationalen Sink mehr** — nur noch Skip/Cancel. Das ist die Langzeit-Motivations-Klippe.

**Fazit:** Phase 1 ist ein sauberer Motor ohne Ziel. Für einen Idle-Slayer (der genau auf
Langzeit-Belohnung spielt) ist die fehlende Aspirations-Decke der **alleinige** Grund, warum dies bei
8,5 und nicht bei 9,5 steht. → **Phase 2 ist der Hauptblocker, bestätigt.**

---

## Restbefunde

### [P2] `roc_void` (Turm-F5 + Highlands) hat 0 Kill-Achievements — letzte Lücke im Turm-Bestiarium
Nach dem Fix ist der Turm-Roster fast lückenlos: 25 von 26 Etagen-Mobs haben eine Kill-Kette. **Einzige
Ausnahme: `roc_void`** (steht auf Etage 5 neben dread_knight/soul_flayer/void_herald/abyssal_devourer
— die alle eine haben). roc_void ist auch ein normaler Highlands-Welt-Mob; trotzdem 0 Achievements.
Ein Completionist, der F5 leerräumt, sieht genau diesen einen Mob ohne Belohnung. (Schwester-Fall
außerhalb des Turms: `highland_wyvern` L79, ebenfalls 0 — beide schon in run4-meta P2 markiert,
**weiterhin offen**.) **Fix:** roc_void + highland_wyvern auf das Standard-[10/100/1000]-Schema heben.

### [P3] „nicht im Inventar!"-Wording weiter irreführend (run4-P3, NICHT gefixt)
`slayer.req.missing` = „Benötigt: {item} — nicht im Inventar!" (translations.ts 697/1458), aber
`slayerRequirementMet` akzeptiert Besitz auch aus der **Bank** (slayer.ts 79). **Fix:** „… nicht im Besitz!".

### [P3] Stale/grammatisch offener slayerShop-Kommentar (run4-P3, NICHT gefixt)
content/index.ts 11839-11840: „Slayer-Punkte-Shop = cross-revier (kein ContentDB.slayerShop befüllt …"
— inhaltlich falsch (`slayerShop` ist 11947 voll befüllt) und Klammer offen. **Fix:** korrigieren/entfernen.

### [P3] „Zum Kampf" navigiert nur generisch (run4-P3, NICHT gefixt)
`goToMonster` springt auf die Combat-Übersicht statt direkt in Ziel-Zone/Etage. Gold-Glow + Badge
fangen es gut ab; Deep-Link wäre der letzte Komfort-Schliff. Optional.

---

## Loop-Bewertung (Kurz)

- **Tasks/Lauf-Hilfe/Hard-Block/Determinismus:** unverändert release-stabil (run4-Fixes halten).
- **Turm:** 5 Etagen, SL-gegated (1/20/40/60/80), frei grindbar, **jetzt mit Kill-Achievements** →
  Completionist-Schicht ergänzt. ✅
- **Belohnungen:** funktional vollständig (Req-Gates), **aspirational leer** (kein Helm, keine Gear,
  tote Drops, endender Punkte-Sink) → der eine große Hebel.

---

## Was fehlt für 9,5? (priorisiert)

1. **(Kern) Slayer Phase 2 — Aspirations-Leiter bauen.** Engine ist bereit (`slayerHelm`-Hook lebt):
   - **Kombinierter Slayer-Helm** (`slayerHelm: true`), erst hochpreisig im Punkte-Shop ODER craftbar
     aus den vorhandenen Sackgassen-Drops — ersetzt sofort alle 5 Einzel-Req-Items. Der klassische Carrot.
   - **1-2 legendäre Slayer-Waffen/Rüstungsteile**, craftbar aus `soul_flayer_fang` / `void_herald_shard`
     (Beschreibung verspricht es bereits!) / `abyssal_core`. Verwandelt Drops + Punkte von „Gate" zu „Chase".
2. **Aspirationaler Punkte-Sink jenseits 975 Pkt.** (Helm + Prestige-/Kosmetik-/Buff-Items), damit
   Punkte dauerhaft Wert behalten.
3. **roc_void + highland_wyvern** Kill-Achievements → Turm-Bestiarium 100 % komplett (P2).
4. *(Optional, idle-stark)* Task-**Streak/Bonus-Punkte** (RS-Stil) als Langzeit-Hook — bewusst aus
   Phase 1 ausgeklammert, würde den Loop spürbar „klebriger" machen.
5. *(Kosmetik)* P3-Reste schließen: Wording „nicht im Besitz", stale slayerShop-Kommentar, Deep-Link goToMonster.

> Punkte 1+2 allein heben den Score auf ~9,5; ohne sie bleibt es trotz makellosem Loop bei 8,5,
> weil die Langzeit-Aspiration fehlt.

---

### Δ vs run4 — Zusammenfassung
| Punkt | run4 | run5 |
|---|---|---|
| Turm-Bestiarium Kill-Achievements | P2 (meta): 0/19 belohnt | **behoben** — alle 20 exkl. Mobs 10/100/1000, korrekt verdrahtet |
| roc_void / highland_wyvern Achievements | P2 (meta) offen | **weiter offen** (P2) — roc_void = letzte Turm-Lücke |
| „nicht im Inventar"-Wording | P3 offen | weiter offen (P3) |
| Stale slayerShop-Kommentar | P3 offen | weiter offen (P3) |
| goToMonster generisch | P3 offen | weiter offen (P3) |
| Slayer Phase 2 (Helm/Gear/Drops-Sink) | (nicht im Fokus) | **neu als P1 / 9,5-Blocker** — komplett abwesend |

Fun-Score 8 → **8,5** (+0,5). **Keine P0.** Ein P1 (Phase 2 = der 9,5-Blocker), ein P2 (roc_void),
drei P3-Altlasten.
