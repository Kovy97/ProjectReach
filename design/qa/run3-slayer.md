# QA Run 3 — Slayer-System (Phase 1)

Playtester: Read-only Code-Review, echte Daten aus `packages/content`, `packages/engine`, `apps/client`.
Datum: 2026-06-27. Fokus: 4 Master + Task-Zuweisung, Slayer-Turm (5 Etagen), Anforderungs-Items,
Hard-Block, SlayerPage, Punkte-Shop. (Helm + legendäre Drops = bewusst Phase 2, nicht bewertet.)

Geprüfte Quellen:
- `packages/engine/src/slayer.ts` (+ `slayer.test.ts`)
- `packages/content/src/index.ts` (slayerMasters / slayerTower / slayerShop / Tower-Monster / Req-Items / Craft-Rezepte)
- `apps/client/src/renderer/pages/SlayerPage.tsx` + `CombatPage.tsx`
- `packages/shared` (State/Konstanten), `packages/persistence` (Migration/Validierung)

---

## Fun-Score: 6 / 10

Solides, sauber gebautes Fundament mit einem echten Idle-Loop (Auftrag holen → im Turm/Welt
auto-grinden → Punkte → Req-Items kaufen/craften → tiefere Etage). Determinismus, Save-Validierung
und Hard-Block sind professionell umgesetzt und gut getestet. Der Fun-Deckel kommt von drei
Reibungspunkten: (1) der kostenlose Sofort-Abbruch entwertet die gesamte Punkte-/Skip-Ökonomie,
(2) „Welt"-Tasks zeigen auf Turm-exklusive Monster und sind falsch verortet, (3) es fehlt jede
Lauf-Hilfe zum Auftragsmonster. Das ist alles fixbar und hebt den Score schnell Richtung 8.

---

## Stärken

- **Engine-Architektur sauber & additiv.** RNG ausschließlich in `assignTask` (spielergetriggert,
  wie Thieving), `recordKillForSlayer` ist pur/deterministisch, `computeStats`/Combat unangetastet.
- **Doppelte Sicherung beim Hard-Block.** `canFightMonster` blockt `startCombat` (combat.ts:141)
  UND `recordKillForSlayer` zählt nicht ohne erfülltes Item (slayer.ts:171). Robust gegen Lücken.
- **Besitz statt Ausrüstung = idle-fair.** Req-Item zählt aus Equipment, Inventar ODER Bank
  (slayer.ts:74-80). Gute Entscheidung für ein Idle-Game.
- **Zwei legitime Beschaffungswege je Req-Item.** Jedes der 5 Items (plague_mask … void_anchor)
  ist craftbar (5 Rezepte, je eigener Skill/Level) UND im Punkte-Shop — sauber gespiegelt.
- **Gating-Kohärenz Shop ↔ Turm.** Shop-Level passen zu den Etagen, die das Item verlangen
  (soul_veil L40 ↔ Forge_demon Etage 3 = L40; void_anchor L60 ↔ Etage 4 = L60). Stimmig.
- **Save/Migration vollständig.** `slayerPoints/slayerTask/slayerTasksCompleted` initialisiert
  (state.ts:57-59), migriert (index.ts:680-682) und gegen gelöschten Content validiert
  (index.ts:333-348). Folgt der MEMORY-Regel „Save-Logik immer mitziehen".
- **Tests decken den Kern ab.** Unlock-Gate, Typ-Split, Etagen-Gate, Completion, Hard-Block,
  Skip/Punkte-Senke — alle in `slayer.test.ts`.

---

## Findings

### [P1] Kostenloser Sofort-Abbruch hebelt die Skip-/Punkte-Ökonomie aus
`SlayerPage.handleCancelTask` (Zeile 85-89) setzt `state.slayerTask = null` **sofort, ohne Kosten
und ohne Bestätigung**. Daneben steht der Skip-Button, der `master.skipCost` Punkte kostet
(10–50). Damit zahlt niemand je Punkte zum Überspringen — man drückt einfach „Abbrechen".
Die gesamte Skip-Mechanik (und ein Großteil der Punkte-Senke) ist tot. Zusätzlich existiert der
i18n-Key `slayer.task.cancelConfirm` („Du erhältst keine XP oder Punkte.") — aber **es gibt keinen
Confirm-Dialog**; der String wird nirgends verwendet (klassischer „definiert, nie angewandt"-Fall).
**Fix:** Cancel an eine echte Bestätigung hängen UND einschränken — z. B. Gratis-Abbruch nur, wenn
das Task-Monster eine nicht erfüllbare Req hat (Eskaliv-Ausweg), sonst kostet es `skipCost` wie Skip.
Oder Cancel ganz entfernen und nur Skip (Punkte) lassen. So oder so: `cancelConfirm` tatsächlich rendern.

### [P2] „Welt"-Tasks zeigen auf Turm-exklusive Monster und sind falsch verortet
Große Teile der Master-`taskPool`s bestehen aus Monstern mit `zone: "slayer_tower"`:
Brenna → `rot_rat`, `plague_grub`; Davorin → `bone_stalker`, `ashfield_wraith`, `gaze_basilisk`,
`wailing_shade`; Seraphel → `slag_abomination`, `cinder_wretch`, `forge_demon`, …; Varek →
`dreadfang`, `void_stalker`, `sorrow_wraith`, `roc_void`. Wird ein **Welt-Task** (isTower=false)
auf so ein Monster gewürfelt, zeigt die SlayerPage `slayer.location.world` = „Offene Welt"
(SlayerPage:217) — das Monster existiert aber **nur im Turm** und ist in der Welt-Zonenliste
ausgeblendet (`CombatPage` filtert `slayer_tower` raus, Zeile 1053). Der Spieler läuft die Welt ab
und findet es nie. **Fix:** Entweder Turm-Zone-Monster aus den Welt-`taskPool`s entfernen (nur echte
Open-World-Mobs in Welt-Pools), oder die Standort-Anzeige am `monster.zone`/`slayerFloor` festmachen
statt am `isTower`-Flag, damit auch ein „Welt"-Task korrekt auf die Turm-Etage verweist.

### [P2] Keine Lauf-Hilfe / kein „Zum Auftrag"-Sprung
Hat man einen Task, muss man das Monster manuell im Combat-Bereich suchen. Für Turm-Tasks nennt
das Panel die Etage (gut), für Welt-Tasks gibt es keinerlei Locator — bei Pools über viele Zonen
(Brenna mischt Borderlands/Krypta/Küste/Wald) ist das mühsam und unidletypisch. **Fix:** Einen
„Zum Auftragsmonster"-Button im Task-Panel, der direkt in die richtige Zone/Etage navigiert
(reine UI-Navigation, keine Engine-Änderung).

### [P3] Stale/widersprüchlicher Kommentar über `slayerShop`
`content/src/index.ts:11510-11511`: „Slayer-Punkte-Shop = cross-revier (kein ContentDB.slayerShop
befüllt (content-dev, 2026-06-27)." — grammatisch abgebrochene Klammer UND inhaltlich falsch:
`slayerShop` ist direkt darunter (11622) voll befüllt. **Fix:** Kommentar korrigieren/entfernen.

### [P3] Req-Warnung „nicht im Inventar" ist irreführend (Bank zählt)
`slayer.req.missing` = „Benötigt: {item} — nicht im Inventar!" (translations.ts:696/1408), aber
`slayerRequirementMet` akzeptiert das Item auch aus der **Bank**. Die Meldung erscheint nur, wenn
es wirklich nirgends ist — der Text suggeriert aber fälschlich, Inventar-Besitz sei nötig.
**Fix:** Formulierung neutralisieren („… nicht im Besitz!").

### [P3] Reward-Varianz innerhalb eines Pools (Hinweis, kein Bug)
`xpReward = round(monster.xp * 0.5 * N)` wird beim Assign fixiert. In einem Pool stehen Turm-Mobs
mit absichtlich niedrigem `xp` (z. B. `rot_rat` xp 2) neben deutlich höher dotierten Welt-Mobs.
Zwei Aufträge desselben Masters können dadurch stark unterschiedliche Slayer-XP geben — gefühlt
„glücksabhängig". Punkte (`basePoints`) sind erfreulicherweise pro Master fix, das federt es ab.
**Fix (optional):** XP-Reward eher an Master-`basePoints`/Tier koppeln als an roher Monster-`xp`,
oder Pool-XP-Spannen angleichen.

---

## Loop-Bewertung (Kurz)

- **Tasks sinnvoll?** Ja im Kern (4 Tier-Master, sauberes Combat+Slayer-Doppelgate). Getrübt durch
  P2 (Welt/Turm-Vermischung) und fehlenden Locator.
- **Belohnungen sinnvoll?** Punkte→Shop→Req-Item→tiefere Etage trägt. Skip-Punkte-Senke aber
  durch P1 (Gratis-Cancel) entwertet → Punkte haben aktuell fast nur den Shop als Senke.
- **Gating sinnvoll?** Sehr gut: Master-Unlocks (CL/SL), Etagen (SL 1/20/40/60/80) und Shop-Level
  greifen kohärent ineinander; Req-Items sind rechtzeitig verfügbar.
- **Macht es Spaß?** Grundsolide und „klickbar", aber Belohnungs-Commitment fehlt (P1) und die
  Verortungs-Reibung (P2) bremst den Idle-Flow. Mit den drei P1/P2-Fixes klar Steam-tauglich.

Keine P0 gefunden. Engine-Logik, Hard-Block und Persistenz sind release-stabil.
