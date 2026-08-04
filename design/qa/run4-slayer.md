# QA Run 4 — Slayer-System (Phase 1, Nach-Fix-Verifikation)

Playtester: Read-only Code-Review, echte Daten aus `packages/content`, `packages/engine`, `apps/client`.
Datum: 2026-06-27. Fokus: Verifikation der drei run3-Fixes (P1 Gratis-Cancel, P2 Welt/Turm-Pools,
P2 Lauf-Hilfe). Zusätzlich erneut geprüft: 4 Master + Task-Zuweisung, Turm (5 Etagen), Req-Items
(craftbar+kaufbar), Hard-Block, Determinismus. (Punkte-Shop-Sinks = Economy, deferred — nur erwähnt.)

Geprüfte Quellen:
- `packages/engine/src/slayer.ts` (+ `slayer.test.ts` — 13/13 grün)
- `packages/content/src/index.ts` (slayerMasters/taskPool, slayerTower, Monster-Zonen)
- `apps/client/src/renderer/pages/SlayerPage.tsx` + `CombatPage.tsx`
- `apps/client/src/renderer/styles/combat.css` + `i18n/translations.ts`

---

## Fun-Score: 8 / 10   (Δ vs run3: +2, von 6/10)

Alle drei run3-Reibungspunkte sind sauber behoben — und zwar belastbar, nicht nur kosmetisch.
Der Idle-Loop (Auftrag → Glow zeigt wohin → grinden → Punkte → Req-Item → tiefere Etage) ist jetzt
geschlossen und reibungsarm. Belohnungs-Commitment besteht wieder (Abbruch kostet), Welt-Tasks
verweisen nur noch auf echt auffindbare Mobs, und es gibt eine durchgehende Lauf-Hilfe
(Label + Button + Gold-Glow/Badge auf Karte, Zone UND Turm-Etage). Determinismus, Hard-Block und
Persistenz sind unverändert release-stabil. Der Deckel auf 8 (nicht 9) liegt nur noch an zwei
kosmetischen P3-Altlasten und kleinen Polish-Punkten — nichts mehr, was den Loop bremst.

---

## Verifikation der run3-Fixes

### [run3 P1] Kostenloser Sofort-Abbruch → BEHOBEN ✅
`SlayerPage.handleCancelTask` (Z. 89-96) gibt nur noch bei **nicht erfüllbarer Req** frei
(`!reqMet` → Impossible-Task-Ausweg). Sonst → `setConfirmCancel(true)`, und `executeCancelTask`
(Z. 98-103) ruft `spendSlayerPoints(state, skipCost)` und setzt den Task **nur bei Erfolg** auf null.
Der i18n-Key `slayer.task.cancelConfirm` wird jetzt **tatsächlich gerendert** (Z. 286) inkl.
Punktekosten `{n}`, plus Bestätigungs-Buttons (`cancelYes "Bestätigen ({n} Pkt.)"`/`cancelNo "Zurück"`).
Der Confirm-Button ist bei zu wenig Punkten disabled (`state.slayerPoints < skipCost`, Z. 292).
Ergebnis: Abbruch kostet `skipCost` (10/20/30/50 je Master) — exakt wie Skip; Gratis-Skip ist tot.
Engine sauber: keine `cancelTask`-Funktion, Abzug läuft über das vorhandene `spendSlayerPoints`.
Belegt: Der einzige Gratis-Pfad (`!reqMet`) ist der gewollte Eskaliv-Ausweg und nicht
points-farmbar (man bräuchte das fehlende Req-Item ohnehin zum Kämpfen).

### [run3 P2] „Welt"-Tasks zeigen auf Turm-exklusive Monster → BEHOBEN ✅
Doppelt abgesichert:
1. **Pools bereinigt.** Alle vier `taskPool`s (content/index.ts 11679-11735) enthalten nur noch
   Monster mit echter Welt-Zone. Verifiziert per Skript über alle 32 Pool-Einträge:
   - Brenna → borderlands/pastures/ashfields (goblin·chicken·boar·ash_rat·dust_vulture …)
   - Davorin → crypt/blackthorn/coast/wildwood (skeleton_*·rootling_*·mud_crab·gray_wolf …)
   - Seraphel → slagpit/coast/wildwood/blackthorn (pit_spider·ember_elemental·moss_golem …)
   - Varek → highlands/slagpit/coast/idolhall (roc_*·frost_hound·deep_kraken·void_titan …)
   **Monster mit `zone: "slayer_tower"` in einem Welt-Pool: 0.** Alle in run3 genannten
   Turm-Exklusiven (rot_rat, plague_grub, bone_stalker, ashfield_wraith, gaze_basilisk,
   wailing_shade, slag_abomination, cinder_wretch, forge_demon, dreadfang, void_stalker,
   sorrow_wraith) sind aus **jedem** Pool entfernt. (Geteilte Mobs wie goblin/skeleton_warrior/
   ember_elemental/roc_void existieren weiterhin sowohl in einer Welt-Zone als auch in einer
   Turm-Etage — korrekt, da in der Welt auffindbar.)
2. **Standort-Anzeige am echten `zone`/Etage festgemacht** statt am `isTower`-Flag
   (SlayerPage Z. 231-240): erst Turm-Etage prüfen (`floors.includes`), sonst `monster.zone` →
   Zonenname, sonst Fallback „Offene Welt". Damit zeigt selbst ein als Welt gewürfelter Task auf
   einem geteilten Mob korrekt die Zone/Etage an.

### [run3 P2] Keine Lauf-Hilfe / kein „Zum Auftrag"-Sprung → BEHOBEN ✅
Vollständiger Locator, drei Ebenen:
- **Task-Panel-Label** (SlayerPage Z. 230-241): „Slayer-Turm, Etage N" bzw. konkreter Zonenname.
- **Navigations-Button** „Zum Kampf" (`slayer.task.goToMonster`, Z. 242-249) → `onNavigate("combat")`.
- **Glow + Badge im CombatPage** (`taskMonsterId`-Vergleich): Zonen-Karte (Z. 1098/1111-1113) und
  Turm-Etagen-Karte (Z. 1201/1212-1213) bekommen `slayer-target-zone` + Badge „Enthält Auftragsziel"
  (`slayer.task.targetZone`); die einzelne Monster-Karte (Z. 940) bekommt `slayer-target`.
  CSS real (combat.css 35-60): Gold-Rahmen + `box-shadow … 0 0 18px rgba(216,192,106,.3)`-Glow + Badge.

---

## Restbefunde (alle P3, kein Loop-Blocker)

### [P3] „nicht im Inventar"-Meldung weiter irreführend (run3-Altlast, NICHT gefixt)
`slayer.req.missing` = „Benötigt: {item} — nicht im Inventar!" (translations.ts 697/1449), aber
`slayerRequirementMet` akzeptiert das Item auch aus der **Bank** (slayer.ts 79). Text suggeriert
weiterhin fälschlich, Inventar-Besitz sei nötig. **Fix:** „… nicht im Besitz!".

### [P3] Stale/falscher Kommentar über `slayerShop` (run3-Altlast, NICHT gefixt)
content/index.ts 11668-11669: „Slayer-Punkte-Shop = cross-revier (kein ContentDB.slayerShop
befüllt …)" — inhaltlich falsch, `slayerShop` ist direkt darunter (11776) voll befüllt, und die
Klammer ist grammatisch offen. **Fix:** Kommentar korrigieren/entfernen.

### [P3] „Zum Kampf" navigiert nur generisch (neu, minor)
`goToMonster` springt auf die Combat-Übersicht, nicht direkt in die Ziel-Zone/Etage. Der Gold-Glow
+ das Badge fangen das gut ab (man sieht sofort, wohin), aber ein Deep-Link in die konkrete Zone
wäre der letzte Komfort-Schliff. Reine UI-Navigation, optional.

### [P3] Reward-XP-Varianz innerhalb eines Pools (run3-Hinweis, bewusst belassen)
`xpReward = round(monster.xp * SLAYER_XP_KILL_FACTOR * required)` beim Assign fixiert. Pools mischen
weiterhin Mobs unterschiedlicher `xp`-Höhe → gefühlte Glücksabhängigkeit der Slayer-XP. Punkte
(`basePoints`) bleiben pro Master fix und federn ab. Reines Balance-Feintuning, kein Bug.

---

## Loop-Bewertung (Kurz)

- **Tasks sinnvoll?** Ja — Welt/Turm-Vermischung weg, Pools thematisch sauber pro Master-Tier.
- **Belohnungen sinnvoll?** Ja — Skip/Cancel-Punkte-Senke wieder aktiv (Commitment hergestellt);
  Punkte fließen in Skip + Shop. (Tiefere Shop-Sinks = Economy, deferred.)
- **Gating sinnvoll?** Unverändert kohärent (Master-Unlocks CL/SL, Etagen SL 1/20/40/60/80,
  Shop-Level ↔ Etagen-Req).
- **Lauf-Hilfe?** Jetzt durchgehend: Label + Button + Glow/Badge auf Zone, Turm-Etage und Mob-Karte.
- **Determinismus/Hard-Block/Save?** Engine strukturell unverändert (RNG nur in `assignTask`),
  Doppel-Gate (`canFightMonster` + `recordKillForSlayer`) intakt, 13/13 Tests grün.

**Keine P0/P1/P2 offen.** Drei run3-Fixes verifiziert behoben; nur kosmetische P3-Reste.
Slayer Phase 1 ist aus Tester-Sicht Steam-tauglich.

---

### Δ vs run3 — Zusammenfassung
| run3 | Schweregrad run3 | Status run4 |
|---|---|---|
| Gratis-Sofort-Abbruch | P1 | **behoben** (Confirm + skipCost; Gratis nur bei unerfüllbarer Req) |
| Welt-Pools → Turm-Exklusive | P2 | **behoben** (0 Turm-Mobs in Welt-Pools + Standort aus echter Zone) |
| Keine Lauf-Hilfe | P2 | **behoben** (Label + Button + Glow/Badge Zone/Etage/Mob) |
| „nicht im Inventar"-Wording | P3 | offen |
| Stale slayerShop-Kommentar | P3 | offen |
| Reward-XP-Varianz | P3 (Hinweis) | bewusst belassen |

Fun-Score 6 → **8** (+2).
