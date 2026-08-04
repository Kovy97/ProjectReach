# Tester-Welle T2 — Kontrolleur (Bug & Integrität)

**Datum:** 2026-06-27 · **Modus:** read-only, unabhängige Verifikation
**Scope:** Verifikation der Fix-Wellen **F1 (ui-dev)** + **F2 (content-dev)** nach T1.

## Verdikt: GRÜN — alle Fixes verifiziert, keine neuen Bugs. Ship.

| Gate | Ergebnis |
|---|---|
| `pnpm --filter @hearthforge/engine exec vitest run` (cache-frisch, inkl. Sim) | **61 Files / 334 Tests passed**, exit 0, Dauer 755 s |
| Sim Balance-Report | **AUFFÄLLIGKEITEN — Bronze-Baseline (0)** · **ECHTE WALLS (0)** · nur 2 erwartbare Über-Baseline-Mobs (scale_skarn L104, last_idol L120, unverändert seit T1) |
| Sim: 2 neue Brücken-Monster | **beide kills>0 in BEIDEN Läufen** — highland_wyvern L79 (Bronze kills=21/d1 · geared kills=223/d0), roc_void L84 (Bronze kills=2/d21 · geared kills=200/d0) |
| `pnpm --filter @hearthforge/client exec tsc --noEmit` | grün, exit 0 |

Cache vor dem Lauf geleert (`rm -rf .turbo node_modules/.cache/turbo`) → kein Turbo-Replay.

---

## 1) F1 (ui-dev) — alle drei Punkte verifiziert ✅

**hpRegenPerSec im ItemTooltip — verifiziert.**
`ItemTooltip.tsx:212-213` (Equip-Bonus) und `:345` (Buff-Bonus) pushen die StatRow nur unter `if (b.hpRegenPerSec)` / `if (bb.hpRegenPerSec)` — also **nur wenn das Feld gesetzt/truthy ist**; bei unset oder 0 erscheint keine Zeile. Anzeige `+{n}/s`, korrektes Label `stat.hpRegen`.

**Über-Level-XP=0 transparent — verifiziert (Klartext-Log + Karten-Greying).**
- Klartext-Logzeile: `eventText` (`CombatPage.tsx:85-88`) rendert bei `e.amount === 0` die Zeile `combat.logXpZero` mit `{mob}` → „🚫 {mob} zu schwach — kein Kampf-XP (Beute unverändert)". Kein „+0 XP" mehr.
- Greying-Logik nutzt **den XP-empfangenden Skill** korrekt: `playerOffenseSkillLevel` (`CombatPage.tsx:50-59`) routet via `computeStats().style` auf ranged/magic_off bzw. melee-Substil (power/defence/attack) — identisch zur XP-Quelle. `xpIsZero = combatXpLevelMult(offenseLevel, m.level) === 0` (`:1046-1047`); bei true bekommt der ⭐-Stern die Klasse `xp-zero` + Tooltip und zeigt `combat.xpNone` statt der Zahl (`:1072-1077`). Identisch im Detail-Modal (`:1150,:1179-1182`).

**Fence-Discovery-Hinweis nur auf Thieving-Seite — verifiziert.**
`SkillPage.tsx:166-168` rendert `thieving.fenceHint` **ausschließlich** unter `g.cat.id === "fence"`. Die `fence`-Kategorie existiert nur im Thieving-Skill → der Hinweis kann auf keiner anderen Skill-Seite erscheinen.

**i18n-Parität en+de — vollständig.** Alle vier neuen Keys in beiden Blöcken: `stat.hpRegen` (297/924), `combat.xpNone` (431/1058), `combat.logXpZero` (430/1057), `thieving.fenceHint` (632/1259). (`category.fence.name` liegt korrekt in `ContentDB.categories`, nicht in translations.ts — kein fehlendes Label.)

## 2) F2 (content-dev) — Brücken-Monster valide ✅

`highland_wyvern` (L79) und `roc_void` (L84) in `packages/content/src/index.ts:7205-7231`, beide `zone: "highlands"`, korrekt zwischen roc_storm(75) und idol_warden(92) eingehängt.

- **Mob-Level-Leiter Highlands/Übergang jetzt: 75 → 79 → 84 → 92.** Lücken **4 / 5 / 8 — alle ≤10**, deutlich unter `XP_ZERO_GAP=15`. Das 0-XP-Loch der T1-Soft-Wall (L75→L92, 17 Level) ist geschlossen.
- **Stats konsistent & monoton** steigend (HP 720→780→860, dmg 92→98→106, acc 108→111→115, def 26→27→28). XP 1050→1200→1380, Gold 253→256→262 — glatte Progression.
- **Inflict valide:** wyvern `bleed` (mag 12), roc_void `burn` (mag 8) + `resist:["shock"]`. Alle Typen werden bereits von bestehenden Mobs genutzt (status-coverage/resistances Tests grün). Magnitude-Format = Flat-Schaden/Tick wie etablierte bleed/burn-Mobs (skaliert hoch fürs Level). `enrage` korrekt.
- **Loot hat Sinks:** feather, storm_essence, aether_essence, scarred_hide (Tanning/Craft), void_essence (Runecrafting craft_*), soulopal — alle als Item definiert und in Rezepten verbraucht. wiring-audit/content-integrity grün.

## 3) F2 — Fence-Gold-Trim ✅

Alle 6 Gold-Ranges exakt auf die T1-Empfehlung getrimmt; Kommentar (`index.ts:5246`) auf „~+25–40 %" aktualisiert. Unabhängig nachgerechnet (Total-EV = ⌀Gold + Σ(Loot-Chance×Wert) vs. Input-Wert):

| Aktion | Input-Wert | Total-EV | vs. Input |
|---|---|---|---|
| fence_coinpurse | 18 | 21,2 | **+18 %** (Coinpurse darf drunter) |
| fence_trinket | 30 | 36,8 | +23 % |
| crack_smugglers_lock | 45 | 59 | +31 % |
| launder_ledger | 150 | 180 | +20 % |
| melt_insignia | 60 | 81 | +35 % |
| reforge_signet | 120 | 155,6 | +30 % |
| melt_goblet | 240 | 322 | +34 % |
| desecrate_reliquary | 360 | 420,5 | +17 % |
| appraise_idol | 600 | 813,5 | +36 % |

**Keine Aktion mit Nettoverlust** — alle EV > Input. Band liegt jetzt ~+17 bis +36 % (vorher +73 bis +104 %), im gewünschten ~+25–40 %-Korridor; die drei knapp drunter (coinpurse/ledger/reliquary) sind unkritisch und entsprechen dem Brief.

## 4) Keine neuen Bugs / Regressionen ✅

- **UI-Crash-Gate (eigene Hardrule):** Einziger App-Root-Mount mit State-Zugriff ist `<ItemTooltipOverlay/>` (`App.tsx:278`, außerhalb MainLayout) — nutzt aber **`useGameStateMaybe`** (`ItemTooltip.tsx:359`, gibt null im Menü/Char-Creation zurück, mit Kommentar). Alle echten `useGameState`-Verbraucher (GameStats, Toasts, PetCelebration, Onboarding, Sidebar, alle Pages) sind innerhalb `MainLayout` gemountet (`App.tsx:225-256`). Kein „leeres Hauptmenü"-Risiko durch F1.
- **Feld-definiert-nie-angewandt:** nichts Neues. hpRegenPerSec wird weiterhin in beiden Ticks angewandt (T1 bestätigt); `monster.xp` der neuen Mobs wird über denselben combat-Pfad vergeben (Sim zeigt XP-Erträge). Status-Inflicts der neuen Mobs durch status-coverage-Guard abgedeckt.
- **Save/Migration:** F1/F2 führen keinen neuen persistenten State ein → `SAVE_VERSION` unverändert korrekt.

## Neue Befunde

**Keine P0/P1.**

- **P2 (nur Info, kein Eingriff):** roc_void(L84) ist für die **Bronze-Baseline** ein harter Regen/DPS-Check (Bronze kills=2, deaths=21) — analog zu roc_storm(75) in T1 („bewusster Check"). `kills>0`, Sim flaggt nicht (AUFFÄLLIGKEITEN 0), geared trivial (200 kills/0 deaths). Erwartbar für eine L84-Brücke vs. unter-gerüstetem Baseline. Owner: niemand — Kenntnisnahme.
- **P2 (Alt-Lasten aus T1, NICHT durch F1/F2):** toter `overLevelMult` in `packages/shared/src/index.ts` (logic-dev) · Fletching trägt Smithing-Tier-Kategorien (content-dev) · `combatXpLevelMult` NaN-Härtung bei fehlendem `MonsterDef.level` (nicht erreichbar, combat-dev). Alle defer/optional, kein Blocker.

## Finales Gate-Ergebnis

✅ Tests **334 passed / 61 Files** · ✅ Sim **AUFFÄLLIGKEITEN(0) MIT beiden neuen Monstern (kills>0)** · ✅ ECHTE WALLS(0) · ✅ client tsc grün.

**Empfehlung: SHIP.** Beide Fix-Wellen sauber umgesetzt und verifiziert; T1-P1-Befunde (Soft-Wall L75→L92, Fence-Over-Reward) sind geschlossen. Nur Alt-P2-Cleanups offen — keiner blockiert.
