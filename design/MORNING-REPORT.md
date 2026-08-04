# 🌙 Nacht-Report — Übernacht-CEO-Run (2026-06-27)

**TL;DR:** Alles **grün & im SHIP-Zustand.** 334 Tests grün, Balance-Sim AUFFÄLLIGKEITEN(0)/WALLS(0), Client-Build grün, **keine Save-Migration** nötig (SAVE_VERSION unverändert 33). Drei Bau-Aufträge umgesetzt + ein kompletter Test→Fix→Test-Loop durchlaufen. Detail-Log: `design/overnight-ceo-plan.md`. QA-Reports: `design/qa/`.

---

## ✅ Gebaut & verifiziert

**1. Combo-Food + Spezial-Effekt-Foods** (dein Auftrag #1)
- Engine: `useConsumable` heilt+bufft jetzt ZUSAMMEN (vorher entweder/oder); neues `hpRegenPerSec` (echte Regeneration über Zeit, Idle + Kampf, gedeckelt).
- Content: 6 bestehende Foods mit Spezial-Effekten (auch low-level attraktiv) + **5 Combo-Gerichte** (Fisch+Fleisch+Crop+Herb), early→endgame, hpRegen-Leiter bis 12/s + Kampf-Boni. Bounded, kein Sustain-Exploit.
- Sichtbar gemacht: hpRegen steht jetzt im Item-Tooltip.

**2. Combat Level-Range-XP** (dein Nachtrag)
- Über-levelte Mobs geben **kein Kampf-XP** (voll bis +5 Lvl, linear →0 ab +15). **Loot/Gold bleibt voll** (alte Gold-Dämpfung entfernt). Klartext-Log „🚫 zu schwach — kein Kampf-XP", und auf Monster-Karten wird der XP-Stern ausgegraut, wenn 0 XP käme.
- Datenpunkt zu deiner Sorge: ein Gold-Farm-Exploit an schwachen Mobs existiert **nicht** (schwache Mobs geben am wenigsten Gold).

**3. Thieving in die Ketten eingebunden** (Hehler/Fence-Kette)
- 9 Fence-Aktionen: gestohlene Wertsachen → Gold + Edelsteine/Essenzen (an Jewelcrafting/Inscription/Runecrafting angebunden). Discovery-Hinweis auf der Thieving-Seite.

**Vorher diese Nacht ebenfalls fertig:** 4-Skill-Erweiterung (foraging/farming/herblore/inscription, ~90 Items/Aktionen, Inscription verzaubert Gear via #63), Fishing/Cooking-Ausbau, + alle UI-Tweaks (Steinwand-BG, Attribut-Karten, Tooltip-Icons, Kategorie-Header, Equipment-Slots, kein Durchscheinen).

## 🧪 Test→Fix→Test-Loop (deine „10 Tester")
- **T1** (3 Tester): fand P0-Sichtbarkeit (hpRegen/Über-Level-XP unsichtbar), P1 (Fence zu lukrativ, Monster-Lücke L75→92, Thieving-Stun).
- **F1** (UI): hpRegen-Tooltip, Über-Level-XP-Klartext-Log + Karten-Greying, Fence-Hint. ✅
- **F2** (Content): Brücken-Monster `highland_wyvern`(L79)+`roc_void`(L84) → schließt die Progressions-Lücke; Fence-Gold-Trim (+73-104% → +17-36%). ✅
- **T2** (2 Tester): **VERDIKT SHIP** — alle Fixes verifiziert, voller Sim grün, keine Regressionen.
- **F3** (Content): **Thieving-Stun entschärft** (bis 6000ms → 600-1400ms; war die letzte Anti-Fun-Spitze) + Loot-Magnete für die Brücken-Monster (wyvern_scale, highland_key, void_rune). ✅
- **T3** (E2E neuer Inhalte): **KONVERGIERT/SHIP** — alle Systeme rund, keine P0/P1, voller Sim nochmal grün.
- **F4** (UI): Fence-Discovery-Nudge — Badge am Thieving-Eintrag (Anzahl verhehlbarer Wertsachen) + 1x-Toast. ✅ Letzte Politur.
- **→ Loop konvergiert.** 3 Tester-Wellen + 4 Fix-Wellen, alles grün. Weitere identische Test-Wellen wären nur SHIP-Re-Bestätigung → gestoppt; Loop bleibt leichtgewichtig bis du zurück bist.

## 🟡 OFFENE CHEF-ENTSCHEIDUNGEN (bewusst nicht über Nacht entschieden)
1. **Farming-Plots** — umsetzungsreifer Plan liegt (`design/skills/farming-plots-plan.md`): passiv, Real-Timer, Auto-Ernte, level-gated Plots. Empfehlung *convert + auto-replant + PLOT_XP_SHARE 0.15* (SAVE_VERSION 34). Braucht dein „go" (convert vs. coexist), da Save-Format-Änderung + Ablösung der aktiven Farm-Aktionen.
2. **Thieving Risk-Toggle** „Vorsichtig/Dreist" — spezifiziert (`design/skill-rework-spec.md` P1-A), braucht Save-Bump → deine Entscheidung. (Stun-Entschärfung ist schon drin, ohne Bump.)
3. **Fence-Payoff-Philosophie** — ich habe auf +17-36% getrimmt; wenn Thieving lukrativer sein soll, 1 Zahl hoch.
4. **Fletching-Kategorien** (kosmetisch, smithing-Tier-Kategorien auf Fletching) — braucht ui+content-Koordination, niedrige Prio.
5. **Combo-Food T5-Bundle** ist nahe BiS (design-gewollt laut Balance-Tester) — sag, falls abschwächen.

## ⚪ Kleine Defer-Follow-ups (billig, kein Entscheid nötig — auf dein Wort)
- hpRegen auch im Charakterblatt (UI bot's an). · Toter Code `overLevelMult` in shared aufräumen. · `combatXpLevelMult`-NaN-Härtung (nicht erreichbar).
- Aus der Tag-Queue: #103 Responsive-Sweep · #104 Rarity/Flavor inhaltlich · #79 Starter-Stil-UI · Reskins Shop/Bank/Quests/City.
- **#105 Icons: inventory→Info-Leiste ✅ (über Nacht erledigt), woodcutting_speed→Tooltip ✅; nur `wealth`→Achievement-Kategorie offen** (bewusst defert: Kategorie-Icons sind alle Emojis, ein einzelnes PNG wäre inkonsistent → besser alle gemeinsam, wenn du Art lieferst/es siehst).

**Empfehlung:** Spielbarer, kohärenter, getesteter Stand. Gib die Farming-Plots frei, dann ist das das nächste große Feature; den Rest können wir nach deinen Prioritäten abräumen.
