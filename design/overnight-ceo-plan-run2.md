# Übernacht-CEO-Run #2 — Plan & Status

**Start:** 2026-06-27 (Chef ~12h abwesend, schwimmen)
**Mandat:** Offene Implementierung fertig → Tester-Loop → Fixes integrieren → Konzepte für Gold-Economy / Shop / Skill-Nutzung. „Wir nähern uns einem spielbaren Stand."

## Wellen

### Welle 1 (gestartet) — parallele Reviere
- **content-dev** → Farming-Plots **Phase 2** (ContentDB.crops füllen, alte aktive `farm_*`-Aktionen entfernen). [content/index.ts]
- **logic-dev** → **Thieving Risk-Toggle** (careful/bold) — state+engine+persistence (SAVE-Bump) + minimaler UI-Toggle. [shared/engine/persistence/SkillPage]
- **balance-designer** → drei Design-Docs: (1) Skill-Nutzungs/Aktionsdichte-Audit refresh, (2) Shop-Rework-Plan, (3) Gold-Economy-Plan (nur Planung, Impl. an City gekoppelt = deferred). [design/*.md, read-only Code]

### Welle 2 — nach Welle 1
- **ui-dev** → Farming-Plots **Phase 3** (Farm-Seite: Plot-Grid, Crop-Auswahl, Timer, Auto-Replant; 20 gestagte `icon_farming_*` einbinden). [renderer]
- Aus dem Audit: dünnste Skills mit zu wenig Aktionen identifizieren → content-dev Rework-Wellen.

### Welle 3 — Tester-Loop
- 10 „Tester" durchspielen lassen → Feedback sammeln → CEO entscheidet Gegenmaßnahmen → Fixes dispatchen → re-test bis Konvergenz (kein Regress, Sim sauber).

## Regeln (aus Erfahrung)
- `content/index.ts` ist seriell — immer nur EIN content-dev darauf.
- Agenten verifizieren scoped (tsc); CEO macht den ganzheitlichen Verify (tests + sim) vor „grün".
- Turbo-Cache-Falle beachten (rotes Replay → `--filter` direkt / Cache leeren).
- Craftbar max. epic; alles essbar; keine halluzinierten Features.

## Status-Log
- **Welle 1 gestartet:** Farming P2 (content-dev), Thieving-Toggle (logic-dev), Design-Docs (balance-designer).
- **NEU vom Chef (Top-Prio):** „Große Skalierungs-Umstellung" — bei 1920×1080 ist alles zu groß; dynamische Skalierung für JEDE Seite. → Audit/Plan-Agent (ui-dev, read-only) gestartet; Impl. erst NACH Thieving-Toggle (gibt skills.css/SkillPage frei).
- **✅ balance-designer fertig:** 3 Docs (`skill-usage-audit-run2.md`, `shop-rework-plan.md`, `gold-economy.md` §10).
  - Top-Thin-Skills: **Jewelcrafting** (Endgame-Lücke, Leiter endet L82), **Mining** (Totzone L15→35), **Fishing** (leichter Pass).
  - Shop: Tool-Leiter für alle Gather-Skills + Preis-Logik — vieles sofort machbar; Restock an City.
  - Gold: Sinks an City (S6 = ∞-Sink) — deferred, bleibt Plan.
- **Queue Welle 2:**
  - [content-lane, nach Farming P2] Thin-Skill-Rework: Jewelcrafting-Endgame (neue High-Gems, Creative-License), Mining-Erz-Einschub @~L22, Fishing-Sparkle.
  - [UI-lane, TOP, nach Thieving-Toggle + Scaling-Plan] Globale Skalierungs-Umstellung über alle Seiten.
  - [UI-lane, nach Scaling] Farming P3 (Farm-Seite, Plot-Grid, Crop-Icons).
- **✅ Thieving-Toggle gelandet** (alle Schichten, SAVE 35; shared+persistence tsc grün; engine-Test+Sim im Sammel-Verify). Junk-Abschlusstext des Agents ignoriert, selbst verifiziert.
- **✅ Skalierungs-Plan gelandet** → Hybrid (C). **Core sofort umgesetzt:** Zoom-Baseline `min(w/2400,h/1350)`, Floor 0.65/Cap 0.95 (1920×1080→0.80) in main/index.ts + Monster-Grid 4→3 Spalten. Voll-Build + Visual-QA folgen.
- **✅ Mat-Chips (Chef-Wunsch):** Crafting-Card-Icons 26→52px, „craftable"-Badge in dieselbe Zeile rechts (horizontal statt vertikal).
- **✅ Farming P2 gelandet:** 28 Crops Lv1–95, alle Senken (Herblore/Cooking/Inscription/Verkauf), 27 alte farm_*-Aktionen weg, Tests+Sim grün. → Phase 3 (UI) gestartet.
- **✅ Enchantment-Plan fertig** (`enchantment-system-rework-spec.md`): Arch A (slot-gebunden), Runecrafting=Enchanting-Skill, alte 11 RC- + 10 Inscription-Enchant-Rezepte raus, neues UI-Verzauberungstisch, SAVE→36, neues Feld lifestealBonus. **Impl. blockiert auf Chef-Freigabe (8 Entscheidungen)** → Morgen-Report. Chef-Zusatz (alte waffenspez. Rezepte raus) eingearbeitet.
- **✅ Farming P3 (UI) gelandet:** FarmPage Plot-Grid (4 Zustände, Crop-Picker, Auto-Replant, Live-Progress), in App.tsx geroutet, 25 i18n-Keys, Farm-CSS. typecheck+build grün. → **Farming komplett (P1–P3)**. Minor-Follow-up: 8 Legacy-Crops brauchen Icon-PNGs.
- **✅ Thin-Skill-Rework gelandet:** Mining (gravesteel L22 + voidstone/godgem-Adern), Jewelcrafting (Lücke L38-55 zu, bis L100, godgem-Set), Fishing (+shadowcarp/crypteel +Rezepte). 353 Tests + Sim grün. Erfundene Mats für Chef-Review: gravesteel/bloodstone/voidstone/godgem.
- **✅ Welle 2 KOMPLETT + ganzheitlicher Verify grün:** typecheck 5/5, Client-Build (5.17s), 353/353 Tests, Sim AUFFÄLLIGKEITEN(0).
- **🔄 Welle 3 — Tester-Loop gestartet:** 4 Tester (early/mid/endgame/systems-QA) → design/qa/run2-*.md → CEO triagiert → Fixes → re-verify bis Konvergenz.
- **✅ Welle 3 KONVERGIERT:** 4 Tester (7–7,5/10, SHIP-fähig, null P0/P1). 3 Fix-Wellen alle grün gelandet (UI: Monster-Badge+Ammo-Toast · content: XP-Glättung, Idolhall monoton, last_idol 5→2 Immunitäten, L82-Dungeon wyvern_lair, Stil-Parität [6 Magie-Roben, spellbinder_ring L46, 2 Combo-Foods, Bogen-Evasion raus] · logic: Sanitize + starterKit-Food). **Finaler CEO-Verify: typecheck 5/5 · 355 Engine-Tests · 35 Persistence · Sim 0/0 · Client-Build grün.**
- **🏁 RUN #2 ABGESCHLOSSEN.** Alle autonom umsetzbaren Punkte fertig & grün. Rest = Chef-Entscheidungen (siehe MORNING-REPORT-run2.md Abschnitt 4): Enchantment-System, Gold/Shop-Impl, Inscription-Zukunft, erfundene Mats, Stil-Parität-Review. Loop wartet auf Chef-Rückkehr.
- **Für Morgen-Report bündeln (Chef-Entscheidungen offen):** Enchantment (8), Gold/City-Sinks, Shop-Preis-Politik + Tool-Leiter, Jewelcrafting-/Mining-Materialnamen, Inscription-Zukunft.
- **Chef-Entscheidungen offen (für Rückkehr):** Jewelcrafting-Endgame-Motive, Mining-Einschub-Material, Shop-Preis-Politik, Tool-Leiter-Identität, City-Sink-Bestätigung (S6/S7), Restock-Politik. (Gold/City bleibt deferred.)
