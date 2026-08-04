# Sweep 3 — Report 20: Feel / QoL (leichtes Real-Play via SimPlayer)

**Rolle:** Kontrolleur (QA). **Datum:** 2026-07-01.
**Ziel:** Fühlt sich der Fortschritt nach dem Balance-Pass gut getaktet an? Wirkt Ranged/Magie jetzt
lohnend (Stil-Parität in der Praxis)? Feedback-Momente, Skilling-Rare-Toast (kein Gem-Spam), QoL-Reibung.

## Ziel erreicht? JA (confirmed).
Der Balance-Pass **wirkt**: Ranged/Magie liegen im Steel-Fenster jetzt innerhalb ~5 % der Melee-DPS
(teils leicht darüber). Feedback-Layer ist reich und die Skilling-Rare-Toast-Gate greift. Ein einziger
echter Feel-Nachzügler (Ranged-Starter-Munitionsökonomie), aber sauber abgefangen (Clean-Stop + Toast).

---

## Headless-Verifikation (voller Gate-Durchlauf)
- ✅ **Build** `@hearthforge/client` — grün (`built in 6.09s`).
- ✅ **Tests — Balance-Sim** (`sim.test.ts`) — 1 passed. **ECHTE WALLS (0)**. Die 12 „AUFFÄLLIGKEITEN"
  sind ausschließlich die **akzeptierte Bronze-Baseline** (undergeared Worst-Case gegen tanky Mid-Mobs,
  inkl. der 2 zurückgetierten Tower-Skelette) — laut Briefing NICHT zu melden. Quergecheckt: `goblin_butcher`
  (L26) steht in der Bronze-Liste als „unbesiegbar", meine **geared** Steel-Builds legen ihn mit 170–228
  kills/h → „geared clear alles" bestätigt.
- ✅ **Tests — Persistence** — 2 passed.
- ✅ **Tests — Guards** — 9 passed (`wiring-audit`, `status-coverage`, `achievements`, `content-integrity`,
  `content-refs`, `set-bonus`, `zones`, `gating`, `ammo-quiver`). Kein „defined-but-never-applied".
- ⚠️ **Typecheck** — ROT, aber **nur in Sweep-Geschwister-Scratch-Tests** (`zz-econ-sweep3.test.ts`,
  `zz-endgame-sim.test.ts`), NICHT in Produktivcode (shared/content/client = grün). Siehe P2 unten.

---

## Stil-Parität — GEMESSEN (confirmed)
Methode: drei SimPlayer, **identische Kampfskills** (attack/power/defence/ranged/magic_off/magic_def/vitality
alle auf denselben Wert) → identische Attribute; nur die Waffe unterscheidet sich (isoliert Waffe+Formel,
genau das, was der Balance-Pass geändert hat). Steel-Tier-Waffen: `steel_sword` (melee), `steel_longbow`
+`steel_arrow` (ranged), `steel_staff` (magic). theoDPS = crit-gewichtete Ø-Trefferzahl · Trefferquote /
Intervall; kills/h = echtes 30-Min-Kampf-Fenster (Auto-Restart).

| Skill | Ziel | Stil | theoDPS | kills/h |
|---|---|---|---|---|
| 20 | goblin (L15) | melee | 24.0 | 464 |
| 20 | goblin (L15) | ranged | 23.2 | 494 |
| 20 | goblin (L15) | magic | 23.1 | 490 |
| 20 | goblin_butcher (L26) | melee | 24.3 | 170 |
| 20 | goblin_butcher (L26) | ranged | 23.4 | 180 |
| 20 | goblin_butcher (L26) | magic | 23.4 | 188 |
| 30 | goblin (L15) | melee | 29.5 | 538 |
| 30 | goblin (L15) | ranged | 30.8 | 562 |
| 30 | goblin (L15) | magic | 30.2 | 560 |
| 30 | goblin_butcher (L26) | melee | 29.8 | 192 |
| 30 | goblin_butcher (L26) | ranged | 31.0 | 228 |
| 30 | goblin_butcher (L26) | magic | 30.5 | 224 |

**Fazit:** Spread ≤ ~5 % über alle vier Zellen; Ranged/Magie im höheren Tier sogar minimal vorn.
Der frühere „Melee +40–60 % im Midgame" ist WEG. Parität-Claim des Balance-Passes bestätigt.
(Nebenbeobachtung: Ranged/Magie sterben in diesem *rüstungslosen* Testaufbau öfter — Glass-Cannon-
Identität, Melee hat Lifesteal + Schild-Option; kills/h misst über Auto-Restart, Parität bleibt gültig.)

## Skilling-Rare-Toast / Gem-Spam — GEPRÜFT (confirmed OK)
`isSkillRareItem` (Toasts.tsx:70) unterdrückt Items, die **garantiertes Primärprodukt** der aktiven
Aktion sind (`roll.chance >= 1`). Daten bestätigen: `mine_garnet_seam.rough_garnet` hat `chance: 1`
(index.ts:6336) → kein Toast beim dedizierten Gem-Farmen. Dieselbe Roh-Gemme als **1 %-Nebenprodukt**
anderer Adern feuert weiterhin einen dezenten „Rare Find!" → korrekt. Kein Spam.

## Feedback-Momente — GEPRÜFT (confirmed reich)
Toasts.tsx deckt ab: Skill-Level-up, Gesamtlevel, Combat-Rare-Drop, Skilling-Rare-Fund, Achievement (+SFX),
Munition-leer, Fence-Discovery, verzauberter Drop, Farming-Erstkontakt, Slayer-Abschluss, Stil-Onboarding.
Im frischen Melee-Grind (1h) allein: attack 1→15, vitality 1→16, totalLvl 21→60 → dutzende Level-Toasts +
Achievements. Taktung fühlt sich dicht an.

## UI-Crash-Gate — GEPRÜFT (clean)
Alle `useGameState()`-Verbraucher, die live `state.*` anfassen, hängen in `MainLayout` (nur im „playing"-
Screen): `Toasts`, `PetCelebration`, `Onboarding`, `OfflinePopup`, `GameStats` (App.tsx:306-308, 299).
`ItemTooltipOverlay` sitzt zwar am App-Root (App.tsx:345), nutzt aber `useGameStateMaybe()` mit Null-Guard
(ItemTooltip.tsx:495, 747) → kein Menü-Crash. Kein Regress des „leeren Hauptmenüs".

---

## Findings (schwerste zuerst)

### [P2][process] Typecheck rot durch Sweep-Geschwister-Scratch-Tests — confirmed
- **Repro:** `pnpm typecheck` → `@hearthforge/engine#typecheck` exit 2.
- **Erwartet:** grüner Typecheck.
- **Tatsächlich:** Fehler NUR in `packages/engine/src/zz-econ-sweep3.test.ts` (Header: „Sweep3 Economy
  Loop Detector") und `zz-endgame-sim.test.ts` — `TS18048 'possibly undefined'` auf `b.ranged`/`b.magic`/
  `p.dps.*`. Produktivpakete (shared/content/client) grün; 3/5 Turbo-Tasks erfolgreich.
- **Owner:** die jeweiligen Sweep-3-Autoren (Econ- / Endgame-Sim-Agent) — Scratch-Test nach Briefing wieder
  **löschen** bzw. Optional-Chaining fixen. Kein Produktivcode-Problem, wahrscheinlich transient (paralleler
  Sweep-Lauf). NICHT dem Balance-Pass anzulasten.

### [P3][feel] Ranged-Starter-Köcher (150) leert sich sehr schnell — confirmed (gut abgefangen)
- **Repro:** Frischer Ranged-Held (`startingStyle:"ranged"`, `cracked_bow`+150 `crude_arrow`), 1h chicken-
  Grind. Munition 150→0 nach ~65 Kills (~6–7 Min aktives Farmen).
- **Erwartet:** Ein AFK-Ranged-Spieler farmt spürbar länger, bevor er eingreifen muss.
- **Tatsächlich:** Köcher leer → `stopIfOutOfAmmo` (combat.ts:946) beendet den Kampf **sauber**
  (`stopReason:"outOfAmmo"`) + „Munition leer"-Toast; Nachschub via Shop (`crude_arrow` @1 g, index.ts:10987)
  oder Fletching. Onboarding-Toast erklärt es vorab („Arrows are consumed per shot — keep ammo stocked!").
- **Evidence:** kills/h im 1h-Grind melee 626 / magic 871 / **ranged 66** (der 66-Wert ist ein `fightFor`-
  Auto-Restart-Artefakt; real STOPPT der Kampf sauber, kein stiller 10×-Absturz).
- **Empfehlung (optional, Feel-Politur):** Starter-Köcher **`crude_arrow` 150 → 250–300** für eine
  ruhigere erste Session. Rein Comfort, kein Korrektheits-/Balance-Problem. **Owner:** Content-Dev.

### [P3][balance] Magie-Starter früh leicht vor Melee gegen Trivial-Mobs — suspected (kein Problem)
- **Evidence:** Fresh-Starter 1h chicken: magic 871 kills/h vs melee 626 (+39 %). Ursache: `cracked_staff`-
  Burn-DoT (chance 0.25) überkillt 8-HP-Hühner effizient + Mana regeneriert gratis nach.
- **Bewertung:** Nur bei Trivial-Mobs; gegen echte Frühmobs (goblin L15) ist die Parität eben (s. Tabelle).
  Kein Handlungsbedarf — als Beobachtung notiert.

---

## Friction-Log (leichtes Real-Play, QoL)
1. **Ranged first-hour:** Muss den Köcher aktiv verwalten (150 reichen ~65 Kills). Abgefangen durch
   Onboarding-Toast + Leer-Toast + Clean-Stop + 1-Gold-Shop. Reibung real, aber gut kommuniziert.
2. **Magie-Sustain:** Mana-Pool/Regen (steel: 100/3.5–114/3.9) trägt das Casten durch — kein „Weak-Melee-
   Spiral" im Steel-Fenster beobachtet. Fühlt sich flüssig an.
3. **Melee:** Reibungsärmster Start (kein Ressourcen-Management, Lifesteal-Sustain) — bewusst die
   „einfache" Einstiegs-Identität.
4. **i18n-Parität:** Alle geprüften Feel-Strings (onboarding.ranged/magic, ammoEmpty) haben EN+DE.

## Top-3
1. ✅ **Stil-Parität confirmed** — Ranged/Magie ~=Melee (≤5 %) im Steel-Fenster; Midgame-Melee-Übermacht ist weg.
2. ⚠️ **Typecheck rot** durch fremde Sweep-Scratch-Tests (`zz-econ-sweep3`, `zz-endgame-sim`) — aufräumen, kein Produktivcode.
3. 💡 **Ranged-Starter-Köcher 150→~300** als optionale Feel-Politur (sonst gut abgefangen).

**Gesamt-Empfehlung: ship** (Feel/QoL grün). Vor einem sauberen `pnpm typecheck` müssen nur die
Sweep-Geschwister ihre Scratch-Tests aufräumen.
