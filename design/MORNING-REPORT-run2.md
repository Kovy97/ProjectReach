# 🌅 Morgen-Report — CEO-Übernacht-Run #2

**Zeitraum:** Nacht 2026-06-27 (Chef ~12h schwimmen)
**Kurzfassung:** Alle offenen Implementierungen fertig & grün, Spiel ist laut Systems-QA **SHIP-fähig (keine P0/P1-Blocker)**, vier Tester geben **7–7,5/10**. Vier große Features geplant und entscheidungsreif. Ein paar Entscheidungen warten auf dich (unten, Abschnitt 4).

---

## 1. Implementiert & grün (diese Nacht)

| Feature | Status |
|---|---|
| **Crafting-Rework** (Leatherworking→„Crafting/Handwerk") — Leder/Range-Rüstung komplett (Gloves/Boots), Magie-Roben migriert, **Capes** (leerer Slot gefüllt), Dragonhide/Shadowhide-Tiers | ✅ grün |
| **Farming-Plots komplett (P1–P3)** — 28 Crops Lv1–95, interaktive Plot-Seite (pflanzen/ernten/auto-replant/Live-Timer, offline-fähig) | ✅ grün |
| **Thieving Risk-Toggle** (careful/bold) + Live-Reflektion in den Stat-Kacheln | ✅ grün |
| **Thin-Skill-Rework** — Mining-Totzone (gravesteel L22), Jewelcrafting bis **L100** (Lücke L38–55 zu), Fishing-Ausbau | ✅ grün |
| **Globale UI-Skalierung** — Zoom-Baseline neu (1920×1080 → **0.80**, 20 % kleiner), Monster-Grid 4→3 Spalten | ✅ Kern grün (Visual-QA = dein `pnpm dev`) |
| **Mat-Chips** — Crafting-Icons 26→52px, „craftable" rechts in die Zeile | ✅ grün |
| **Kategorie-Level-Spannen** in Skill-Headern | ✅ grün |
| **Achievement-Kategorie-Icons** verdrahtet + 64 Item-Arts gebunden, 117 Quellen archiviert | ✅ grün |

**Verify-Stand:** typecheck 5/5 · 353 Engine-Tests · 33 Persistence-Tests · Client-Build · Balance-Sim AUFFÄLLIGKEITEN(0)/WALLS(0).

---

## 2. Tester-Loop (Welle 3)

4 differenzierte Tester (read-only QA), Reports unter `design/qa/run2-*.md`:

| Tester | Fun-Score | Kernaussage |
|---|---|---|
| Early-Game L1–25 | **7,5** | Breit, klar, verzeihend; Mining-Fix gegengeprüft |
| Mid-Game L25–60 | **7** | Reworks sauber gelandet; Hauptbremse = Stil-Parität |
| Endgame L60–100+ | **7** | Endgame kohärent bis Cap + Capstone-Boss |
| Systems-QA-Bughunt | **SHIP** | Keine P0/P1, kein „defined-but-never-applied"-Leck, Save crash-sicher |

**Null P0-Bugs.** Alle Findings waren Balance/UX-Feinschliff → in Fix-Wellen adressiert (Abschnitt 3).

---

## 3. Fix-Wellen (aus Tester-Triage)

- **UI** ✅ gelandet: Monster-Schwierigkeits-Badge (Machbar/Riskant/Gefährlich vs. Combat-Level) · Ammo-Stopp-Toast.
- **content** ✅ gelandet (Sim 0/0; finaler Voll-Lauf wird im Holistik-Verify bestätigt):
  - **XP-Ausreißer:** Warband-Goblins auf ~Level×1 (goblin_rogue 10→5 … goblin_warlock 25→13); reef_drowned 90→35; wild_stag 160→55.
  - **Idolhall monoton:** idol_warden HP 520→900/Gold 189→400; aether_wraith HP 480→950/Gold 196→480; scale_skarn HP 620→1150/Gold 285→620 (def jeweils leicht gesenkt → weniger „Rüstungs-Schwamm").
  - **Boss `last_idol`:** Immunitäten 5→**2** (nur noch shock/poison; burn/bleed/frost wirken jetzt → DoT-/Enchant-Builds nutzbar).
  - **Neuer Dungeon `wyvern_lair`** (Highlands, L82, Key=highland_key) + 3 Achievements.
  - **Stil-Parität:** 6 neue Magie-Roben (arcane L57-58, runewoven L71-72) + 2 Set-Boni · Magie-Ring `spellbinder_ring` L46 · Range/Magie-Combo-Food (`duskfin_rangers_stew` L48, `spellwarden_bisque` L52) · **Bogen-Evasion entfernt** (12 Shortbows + 3 verzauberte) → Range nicht mehr „tanky+top-DPS".
- **logic** ✅ gelandet: activeActionId-Sanitize (defensiv genullt, kein SAVE-Bump) · Start-Nahrung als **Opt-in-Flag** `starterKit` (Default-ON hätte 4 Sim-/Test-Fixtures gebrochen) — neue Spieler bekommen 10× cooked_shrimp + Auto-Eat-Vorbelegung; im Renderer (`GameContext.tsx`) ist das Flag jetzt verdrahtet (sonst inert).

> **✅ FINALER HOLISTIK-VERIFY (CEO):** typecheck **5/5** · Engine **355 Tests** · Persistence **35** · Sim **AUFFÄLLIGKEITEN(0)/WALLS(0)** (logic-dev frisch auf kombiniertem Baum, Cache umgangen) · **Client-Build grün** (mit starterKit-Wire). **Welle 3 konvergiert — keine offene Regression, keine 2. Tester-Runde nötig.**
> **Erfundene Mats aus diesem Pass:** keine neuen Roh-Mats (Roben/Schmuck/Food nutzen bestehende Essenzen/Runen/Leder). Die Thin-Skill-Mats (gravesteel/bloodstone/voidstone/godgem) stehen in 4.2.

---

## 4. 🟡 ENTSCHEIDUNGSPAKET — wartet auf dich

### 4.1 Enchantment-System (Plan fertig: `design/enchantment-system-rework-spec.md`)
Craftbare Verzauberungs-Runen + eigener „Verzauberungstisch" (Minecraft-Style). **8 Entscheidungen** (Empfehlung jeweils zuerst):
1. **Item-Architektur:** (A) Enchants am Equipment-Slot _(empfohlen — kein Inventar-Umbau)_ · (B) echte Item-Instanzen _(3–4× Aufwand)_ · (C) Hybrid.
2. **Inscription-Zukunft:** ganz abwickeln · oder als reiner Schriftrollen-/Tinten-Skill behalten?
3. **Enchant-Slots:** fix 1 (Phase 1) · oder 1–3 nach Rarity?
4. **Disenchant:** ja/nein (falls ja: Rune weg + Gold, oder halbe Rune zurück)?
5. **Kosten:** nur Rune verbrauchen _(empfohlen)_ · oder + Gold?
6. **Erfolg:** deterministisch _(empfohlen)_ · oder mit Chance?
7. **Rüstungs-Enchants:** jetzt vorbereiten · oder Phase 2?
8. Bestätigung: **alte 11 RC- + 10 Inscription-Waffen-Enchant-Rezepte raus** (sauber, Legacy→Basis-Item-Migration), Runecrafting craftet künftig die Runen.

### 4.2 Erfundene Materialien (Creative-Lizenz, brauchen dein OK/Namens-Veto)
- **`gravesteel`** (Mining L22, füllt Totzone) · **`bloodstone`** (L25/44) · **`voidstone`** (L82/85) · **`godgem`** (L95/100, Endgame-Schmuck). Namen okay oder umbenennen?

### 4.3 Gold-Economy & Shop (Pläne fertig, Impl. bewusst deferred)
- `design/gold-economy.md` (§10) + `design/shop-rework-plan.md`: Faucets skalieren, Sinks nicht. **City** ist das Trägersystem (S6 Gebäude-Ausbau/Schrein = ∞-Sink). Sofort machbar (City-unabhängig): Tool-Leiter für Gather-Skills, Shop-Preis-Logik. **Frage:** Soll ich das City-unabhängige Shop-/Tool-Paket schon umsetzen, oder alles an die City-Welle koppeln?

### 4.4 Stil-Parität (nach Fix-Welle)
- Range war ~+30 % über Melee, Magie unterversorgt. Ich habe konservativ getrimmt/ergänzt (Zahlen folgen in Abschnitt 3). **Bitte gegenchecken**, ob die Richtung passt — das ist der zentrale Balance-Hebel.

### 4.5 Kleinere Follow-ups
- 8 Legacy-Farming-Crops brauchen Icon-PNGs (Emoji-Fallback aktiv).
- Neue BG-Texturen (blue/green/purple/…) liegen am Asset-Root, CSS-Theming optional.
- `inscription_enchanting`-Sim-Heuristik wird mit dem Enchantment-Umbau obsolet.
- **`resistMult` (echte partielle Status-Resistenz):** Engine kennt nur Binär-Immunität; `last_idol` ist jetzt via „2 statt 5 Immunitäten" approximiert. Ein `resistMult`-Feld (shared + combat.ts, reduzierte Proc-Chance/Dauer) wäre die saubere Lösung — lohnt sich besonders zusammen mit dem Enchantment-System (Status-Enchants vs. resistente Bosse). Logic/combat-Aufgabe, optional.

---

## 5. Nächste Schritte (nach deiner Freigabe)
1. Enchantment-System umsetzen (shared→engine→persistence→content→UI) — sobald 4.1 entschieden.
2. Stil-Parität-Feintuning (falls du nachjustieren willst).
3. City-Feature (trägt die Gold-Sinks) — größeres eigenes Vorhaben.
4. Visual-QA der Skalierung über 1920/1600/1366 (am besten du auf `pnpm dev`).

_Status-Log & Detailplan: `design/overnight-ceo-plan-run2.md`._
