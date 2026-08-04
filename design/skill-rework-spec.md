# Skill-Rework-Spec (implementierungsreif) — Thieving + Primär-Gatherer

**Datum:** 2026-06-27 · **Autor:** balance-designer (PLAN-ONLY) · **Scope:** NUR dieses Design-Doc, kein Code/Content.
**Grundlage:** `design/skill-interaction-audit.md` (Diagnose + Kandidaten), `design/overnight-ceo-plan.md` (Aufgabe 3).
**CEO-Entscheidung (fix):** Thieving WIRD in die Ketten eingebunden (Hehler-Kette). Reworks bleiben idle-RPG-tauglich: AFK-Kern erhalten, aber echte Momententscheidung (Risiko/Fokus-Toggle) + seltene „Sparkle"-Events.

**Code-Anker (verifiziert beim Schreiben):**
- Erfolgs-/Stun-Logik: `packages/engine/src/tick.ts` → `completeAction()` Z. 63–73 (Erfolgswurf → `state.stunMs` setzen, Early-Return). Stun-Abbau: `step()` Z. 141–145.
- Erfolgschance-Formel + Caps: `packages/shared/src/index.ts` → `actionSuccessChance()` Z. 758; `THIEVING_SUCCESS_CAP = 0.95`, `DEFAULT_STUN_MS = 3000` Z. 750–752.
- `ActionDef`-Felder: `gold?{min,max}`, `successBase`, `successPerLevel`, `stunMs`, `loot[]`, `inputs[]`, `category` (`shared/src/index.ts` Z. 490–501).
- `GameState.stunMs` Z. 1521; `state.settings.autoBank` (Muster für globalen Toggle).
- Thieving-Content: `packages/content/src/index.ts` Z. 4896–5120 (14 Aktionen, Lvl 1–115).
- Wertsachen-Items (heute nur Verkauf via `value`): `stolen_coinpurse`(18) Z.287, `cutpurse_trinket`(30) Z.288, `smugglers_key`(45) Z.289, `guard_insignia`(60) Z.291, `ledger_page`(75) Z.292, `signet_ring`(120) Z.293, `ornate_goblet`(240) Z.295, `reliquary_shard`(360) Z.296, `idol_coin`(600) Z.297. Mit-gedroppte Gems: `rough_garnet`/`rough_ruby`/`rough_diamond`/`rough_onyx`/`cut_gemstone`, Enchant-Mat `aether_essence`.
- UI: `apps/client/src/renderer/pages/SkillPage.tsx` → `isThief = action.successBase !== undefined` Z.184; Stun-Badge-Komponente Z.369–394; `setActiveAction(...)` Z.329.
- **`SAVE_VERSION = 33`** (`shared/src/index.ts` Z.29). Migration zentral in `packages/persistence/src/index.ts` → `migrateState()`.

**Persistenz-Regel (Master-Plan):** Jeder NEUE persistente State ⇒ **SAVE_VERSION-Bump + Migration**. Reine `ActionDef`-Profile/Loot/`inputs`-Ketten ⇒ **keine** Migration. Unten je Vorschlag klar markiert.

**Lese-Hinweis Reviere:** logic = engine/shared/persistence · content = content/index.ts · combat = combat.ts · ui = renderer. content/index.ts ist EINE Datei → Content-Edits seriell.

---

## Priorisierung nach Fun-pro-Aufwand (Apply-Reihenfolge)

| # | Maßnahme | Skill | Aufwand | Reviere | Migration? |
|---|---|---|---|---|---|
| **1** | **P1-A** Risiko-Toggle „Vorsichtig/Dreist" (global) + Stun→Ertragsverlust | Thieving | **M** | logic + content + ui | **JA** (1 Settings-Enum) |
| **2** | **P1-C** Hehler-Kette (Wertsachen → Gold/Gems/Mats via `inputs`) | Thieving | **S–M** | content (+ evtl. 1–2 neue Items) | **Nein** |
| **3** | **P2-A** „Reiche Ader / Schwarm"-Events (transient, light) | WC/Mining/Fishing | **S→M** | logic + content (+ ui-Badge) | **Nein** (transient) |
| **4** | **P2-B** Fokus-Toggle „Tempo/Ertrag" (global, Toggle-Pattern wiederverwenden) | WC/Mining/Fishing | **S** | logic + content + ui | **JA** (1 Settings-Enum) |
| **5** | **P2-C** Demand-Verzahnung (Outputs in neue Ketten ziehen) | WC/Mining/Fishing | **S** | content | **Nein** |
| **6** | **P1-B** Heat/Suspicion-Meter (OPTIONAL, Fast-Follow) | Thieving | **M** | logic + ui (+ content tuning) | **JA** (1 Float/Skill) |
| **7** | **P3** Smithing-Craftbar-Filter (UX-Notiz) | Smithing | **S** | ui | **Nein** |

> **Empfehlung:** #1+#2 zusammen als „Thieving-Welle" (löst Master-Plan-Frage + gibt Nicht-Gold-Identität). #3–#5 als günstiger „Sparkle"-Pass danach (Toggle-Pattern aus #1 wird in #4 1:1 wiederverwendet → fast gratis). #6 nur wenn #1 sich gut anfühlt aber „zu monoton" bleibt. #7 bei Gelegenheit über ui-dev.

---

# P1 — THIEVING

## P1-A — Risiko-Toggle „Vorsichtig / Dreist" + Stun-Ersatz  (Aufwand M, Top-ROI)

### Designidee
Ein **globaler** Modus-Toggle (nicht pro Aktion) — eine bewusste Dauer-Entscheidung, idle-freundlich (einmal stellen, läuft AFK weiter), kein Pro-Karte-Mikromanagement.
- **Vorsichtig** (Default): höhere Erfolgschance, weniger Gold, seltenere Wertsachen, **kein** Stun. Der sichere AFK-Grind.
- **Dreist**: niedrigere Erfolgschance, mehr Gold + höhere Wertsachen-Chance + Chance auf „Big Score" (Bonus-Roll auf das wertvollste Loot der Aktion). „Erwischt" kostet **Ertrag**, nicht primär Zeit.

**Stun ersetzen (Kernforderung):** Heute ist Fehlschlag = `state.stunMs` Leerlauf (Anti-Fun). Neu: Fehlschlag = **„erwischt"-Malus = dieser Zyklus bringt 0 Gold/0 Wertsachen** (Ertragsverlust), Aktion läuft sofort weiter. Optionaler Mini-Stun NUR im Dreist-Modus als Spannungs-Flavor (kurz, ≤1.2 s), nie im Vorsichtig-Modus.

### State-Form  → **SAVE_VERSION-Bump + Migration NÖTIG**
Neues persistentes Feld analog `settings.autoBank`:
```
state.settings.thievingRisk: 'careful' | 'bold'   // Default 'careful'
```
Migration (`migrateState`): fehlendes Feld → `'careful'` defaulten. Trivial, kein Datenverlust.
> Hinweis logic-dev: Serialisierung/Settings-Typ in `shared` + persistence mitziehen (gleiche Stelle wie `autoBank`).

### Engine-Hooks  (Revier: logic)
**Datei:** `packages/engine/src/tick.ts` → `completeAction()`, der Block Z. 63–73. **Plus** eine Risiko-Profil-Helferfunktion (am besten in `shared/src/index.ts` neben `actionSuccessChance`, damit Sim + UI dieselben Zahlen lesen).

1. **Risiko-Profil als Multiplikatoren** (statt zwei Profile pro Aktion zu pflegen → kein Content-Duplikat). Vorschlag-Konstanten:

| Modus | Erfolgschance (additiv) | Gold-Mult | Wertsachen-`chance`-Mult | Big-Score-Bonus-Roll | Erwischt-Folge |
|---|---|---|---|---|---|
| careful | **+0.10** | **×0.75** | **×0.70** | nein | 0 Gold/0 Loot, **kein** Stun |
| bold | **−0.10** | **×1.40** | **×1.30** | **+0.15** auf bestes Loot-Item | 0 Gold/0 Loot + Stun ≤1200 ms |

2. **Erfolgswurf** (Z. 64–72 umbauen): Risiko-additiv in `actionSuccessChance(action, level, petSuccess + riskDelta)` einfließen lassen (Cap 0.95 bleibt). Bei Fehlschlag: **NICHT** mehr pauschal `state.stunMs = action.stunMs`; stattdessen `return` ohne XP/Gold/Loot (= Ertragsverlust), und nur bei `bold` ein kurzer `state.stunMs = min(action.stunMs ?? 1200, 1200)`.
   - **Folge: `action.stunMs` in Content kann auf kleine Flavor-Werte (≤1200) sinken; die langen Stuns (bis 6000 ms) entfallen.** (Content-Tuning, siehe unten.)
3. **Gold** (Z. 99–101): `min/max` mit `goldMult` skalieren (gerundet, min 1).
4. **Loot** (Z. 108–121): jede `roll.chance` mit `lootChanceMult` skalieren (Cap 1.0). Big-Score (nur bold): nach normalem Loot ein zusätzlicher `nextFloat`-Roll mit `+0.15` auf das wertvollste `loot[]`-Item der Aktion.
   - **Determinismus-Pflicht (logic-dev):** Zusätzliche `nextFloat`-Würfe NUR ziehen, wenn der jeweilige Modifikator aktiv ist (z. B. Big-Score-Roll nur bei `bold`). Im Default-Pfad (careful, keine Buffs) muss die RNG-Sequenz **bit-identisch** zur heutigen bleiben → bestehende Determinismus-Fixtures (`thieving.test.ts`, `buffs.test.ts`) unverändert grün. Multiplikatoren, die nur Zahlen skalieren (Gold/Chance), ziehen keinen Extra-Wurf.

### UI-Änderung  (Revier: ui)
**Datei:** `apps/client/src/renderer/pages/SkillPage.tsx`.
- Wenn der aktive Skill `thieving` ist (erkennbar an `isThief`, Z.184): über/neben der Aktionsliste ein **Segmented-Toggle** „Vorsichtig | Dreist" (Citadel-Look: Pergament-Frame, Cinzel-Label, zwei Buttons wie der bestehende Button-Stil). Schreibt `state.settings.thievingRisk`.
- Pro Aktionskarte: kleiner Hinweis „Dreist: ~+40% Gold, höheres Risiko" als Tooltip. Erfolgschance-Anzeige (falls vorhanden) den Risiko-Delta einrechnen.
- **Stun-Badge** (Z.369–394) bleibt, feuert aber nur noch im Dreist-Fehlschlag (kurz). Default-Spieler (Vorsichtig) sieht praktisch nie Stun → Anti-Fun raus.
- i18n: neue Strings `skill.thieving.risk.careful/bold`, Tooltip-Text (en+de).

### Balance-Zahlen (Platzhalter, plausibel)
- Risiko-Deltas wie Tabelle oben. Netto-Ziel: **Vorsichtig ≈ heutiger Gold/h** (leicht darunter, dafür ~stunfrei → real oft mehr effektiv), **Dreist ≈ +25–35% Gold/h-Erwartung** trotz höherer Fehlschlagrate, plus spürbar mehr Wertsachen (Futter für Hehler-Kette).
- Erfolgschance bleibt unter Cap 0.95; Dreist auf hohen Lvl darf nicht trivial werden (−0.10 hält Spannung).

### Aufwand & Reviere
**M.** logic (tick.ts + shared-Helper + settings-Typ/persistence/Migration) · content (Stun-Werte senken, ggf. Big-Score-Item je Aktion markieren — implizit = teuerstes Loot, kein neues Feld nötig) · ui (Toggle + Tooltip + i18n).

---

## P1-C — Hehler-Kette (Fence/Zerlegen)  (Aufwand S–M, KEINE Migration)

### Designidee
Gestohlene Wertsachen sind heute **Sackgassen** (nur Verkauf via `value`). Neu: eine Verarbeitungs-Kette unter `skill: "thieving"`, die Wertsachen als **`inputs`** frisst und Gold + **gefragte** Mats ausspuckt → bindet Thieving an Jewelcrafting/Inscription/Runecrafting und gibt ihm eine Nicht-Gold-Identität. **Nutzt die bestehende `inputs`-Craft-Mechanik → 0 Engine-Änderung, 0 Migration.** Auf der SkillPage erscheinen die Fence-Aktionen automatisch (sie haben `inputs` → „craftbar: N"-Zähler greift schon).

### Konkrete neue Aktionen (Vorschlag-IDs, alle `skill: "thieving"`, mit `category: "fence"`)
| Aktion-ID | Input(s) | Output (Vorschlag) | Lvl | Anbindung |
|---|---|---|---|---|
| `fence_coinpurse` | 1× `stolen_coinpurse` | `gold` 22–34 + 8% `rough_garnet` | 1 | Gold-Basis |
| `fence_trinket` | 1× `cutpurse_trinket` | `gold` 30–50 + 18% `rough_garnet`/`rough_ruby` | 12 | → Jewelcrafting |
| `crack_smugglers_lock` | 1× `smugglers_key` | `gold` 50–80 + 15% `cut_gemstone` | 28 | → Jewelcrafting |
| `launder_ledger` | 2× `ledger_page` | 1× `blank_parchment`/Tinte-Vorstufe + `gold` 40–70 | 30 | → **Inscription** |
| `melt_insignia` | 1× `guard_insignia` | Barren-Vorstufe o. `gold` 70–110 + 10% `cut_gemstone` | 36 | → Smithing/Sink |
| `reforge_signet` | 1× `signet_ring` | `gold` 110–180 + 20% `cut_gemstone` + 8% `rough_diamond` | 65 | → Jewelcrafting |
| `melt_goblet` | 1× `ornate_goblet` | `gold` 220–340 + 25% `rough_diamond`/`rough_onyx` | 75 | → Jewelcrafting |
| `desecrate_reliquary` | 1× `reliquary_shard` | `gold` 320–500 + 30% `aether_essence` | 85 | → **Runecrafting/Enchant** |
| `appraise_idol` | 1× `idol_coin` | `gold` 600–900 + 25% `rough_onyx` + 10% `aether_essence` | 95 | → High-Tier Gems/Enchant |

- **XP** je Fence-Aktion via Standard-Kurve `xp = round(target_xph(levelRequired)·durationMs/3.6e6)`, min 1. `durationMs` ~2000–5000.
- **Bilanz-Leitplanke:** Fence-Gold-Erwartung soll den reinen Verkaufswert (`value`) um **~15–25%** schlagen (sonst zerlegt niemand). Gleichzeitig darf der Gem/Mat-Output die Gather-Skills (Mining-Gems, Jewelcrafting) **nicht entwerten** → Drop-Chancen niedrig halten (8–30%), Wertsachen sind selten.

### Neue Items (nur falls nötig)
- Die Kette kommt **fast ohne neue Items** aus (Gems/`aether_essence` existieren). Einzig für `launder_ledger`/Inscription evtl. eine vorhandene Tinten-/Pergament-Vorstufe wiederverwenden — content-dev prüft die echte Inscription-Input-ID; **kein** neues Item erfinden, wenn eine passende existiert.
- Falls eine Smithing-Anbindung (`melt_insignia`) eine „geschmolzene Barren"-Vorstufe braucht und keine passt: lieber auf `gold` ausweichen (kein neues Item) — Identität entsteht schon über die Gem-Outputs.

### State-Form / Engine / UI
- **State:** keine neuen Felder. **Engine:** keine Änderung (nutzt `inputs`/`completeAction`-Craft-Pfad, Z.49–61 + 106). **Migration:** keine.
- **UI:** automatisch — Fence-Aktionen erscheinen als Karten mit „craftbar: N". Empfohlen: eigene Kategorie `fence` (Feld `category`, Z.501) damit sie als einklappbarer Block „Hehler" getrennt von den Diebstahl-Aktionen stehen. Reine Content-Zuordnung, ui-dev muss nichts Neues bauen (Kategorie-Gruppierung existiert).

### Aufwand & Reviere
**S–M.** content (9 Aktionen + Kategorie + ggf. 0–1 Item) · ui (nichts/nur Kategorie-Label-i18n) · logic: **keins**.

---

## P1-B — Heat / Suspicion-Meter  (OPTIONAL, Aufwand M, Fast-Follow)

> **Empfehlung: erst NACH P1-A live-testen.** Nur bauen, wenn Dreist-Grind sich „zu eintönig" anfühlt. Mehrwert = erzwungene **Ziel-Rotation** (leichte aktive Würze, kein Reflex). Kosten = neuer persistenter State + Decay-Logik + UI-Balken.

### Designidee
Ein **skillweiter** Verdachts-Wert 0–100. Steigt bei Dreist-Erfolgen (+) und „erwischt" (++), **sinkt** beim Vorsichtig-Stehlen und bei Kampf/anderen Skills (Abkühlen). Hoher Heat → senkt Erfolgschance / erhöht Erwischt-Schwere → motiviert, Ziel zu wechseln oder kurz „abzukühlen". Idle-fair: kein Zeitdruck, kein Klick-Reflex, nur eine sanfte Selbstregulierung.

### State-Form  → **SAVE_VERSION-Bump + Migration NÖTIG**
```
state.thievingHeat: number   // 0..100, Default 0
```
Migration: fehlend → `0`. (Transient-Variante denkbar — nicht serialisieren, bei Load 0 → dann KEINE Migration; Trade-off: Offline-Abkühlung geht verloren. Für „echtes" Gefühl persistent empfohlen.)

### Engine-Hooks (Revier: logic)
**Datei:** `tick.ts`.
- In `completeAction` (Thieving-Pfad): bei Dreist-Erfolg `heat += 4`, bei Erwischt `heat += 9` (Cap 100). Heat fließt additiv-negativ in den Erfolgswurf (`riskDelta -= heat/100 * 0.20`, also bis −0.20 bei vollem Heat).
- In `step()` Abkühlung: pro Tick `heat = max(0, heat - decayPerTick)` wenn aktuelle Aktion **nicht** Thieving-Diebstahl ist (Fence zählt nicht als „heiß"); schnellerer Decay im Vorsichtig-Modus. Determinismus: keine RNG-Würfe, nur arithmetisch → Fixtures unberührt.

### UI (Revier: ui)
SkillPage: schmaler „Verdacht"-Balken über der Thieving-Liste (Citadel-Frame, rot füllend). Tooltip erklärt Mechanik.

### Balance (Platzhalter)
Heat-Gain bold +4/Erfolg, +9/Erwischt; Decay ~2/s aktiv-anderswo, ~5/s im Vorsichtig; Voll-Heat-Malus −0.20 Erfolgschance. Ziel: nach ~15–20 Dreist-Erfolgen am selben Ziel lohnt ein Wechsel/Pause.

### Aufwand & Reviere
**M.** logic (State + Migration + tick + step) · ui (Balken) · content (Tuning).

---

# P2 — PRIMÄR-GATHERER (Woodcutting / Mining / Fishing)

> Bewusst **klein**: diese Skills sind der ruhige AFK-Grundpfeiler. Nur „Sparkle", kein Vollumbau. WC=9 / Mining=16 / Fishing=15 Aktionen, reines Einzel-Node-Klicken.

## P2-A — „Reiche Ader / Schwarm"-Events  (Aufwand S→M, KEINE Migration)

### Designidee
Gelegentlich (selten) triggert ein kurzes **Bonus-Fenster**: „Reiche Ader" (Mining), „Vogelschwarm/Fischschwarm" (Fishing), „Honigbaum/Harzader" (WC) → für ~20–40 s doppelter Ertrag und/oder garantierter seltener Drop. Auto-aktiv (AFK bleibt AFK), aber sichtbar als Badge → erzeugt „oh nice"-Moment beim Vorbeischauen. Anknüpfung an bestehendes `birds_nest`-Precedent (Z.3330 ff., Chance 0.01–0.045).

### Zwei Ausbaustufen
**Stufe S (Baseline, reiner Content, sofort):** zusätzlicher seltener Loot-Roll je Node — ein wertvolles Bonus-Mat (z. B. `gem_geode` für Mining → Gems; `glittering_scale`/Schwarm-Fisch für Fishing; `honey_amber` für WC). Kein Timer, kein State, kein Engine. Erzeugt schon Varianz. **Empfohlen als erster Schritt.**

**Stufe M (echtes Event-Fenster, transient):** ephemerer State, **nicht persistiert** → KEINE Migration (bei Load leer):
```
state.gatherEvent: { kind: string; untilMs: number; yieldMult: number } | null   // transient, nicht serialisieren → default null
```
- **Engine-Hook:** `tick.ts` `completeAction` (Gather-Pfad): kleiner Trigger-Roll (`~0.4–0.8%` pro Abschluss) startet ein Fenster (`untilMs = elapsedMs + 30000`, `yieldMult = 2`). In `step()`/`completeAction` Yield/Doppelchance um `yieldMult` erhöhen solange aktiv. Determinismus: Trigger-Roll nur im Gather-Pfad und nur wenn Feature an → ggf. hinter Flag, sonst Fixtures anpassen (logic-dev bewertet; transient-Feld bricht keine Save-Fixture).
- **UI:** temporäres Badge „⛏ Reiche Ader! 0:27" über der Node-Liste (Citadel-Look, kupfer/grün-Theming je Skill).

### State / Migration
S: keine. M: transientes Feld, **keine Migration** (nicht im Save). Falls logic-dev es doch persistieren will (Offline-Mitlauf) → dann SAVE_VERSION-Bump, Default null.

### Balance-Zahlen (Platzhalter)
Trigger ~0.5%/Abschluss (≈ alle paar Min im AFK), Fenster 30 s, `yieldMult` 2.0; seltenes Event (~0.1%) = garantierter Premium-Drop. Stufe-S-Bonus-Drop-Chancen 0.5–3% (analog `birds_nest`).

### Aufwand & Reviere
S (Stufe S: nur content) bis M (Stufe M: + logic transient + ui Badge). Empfehlung: **Stufe S zuerst** ausliefern, M als Upgrade.

## P2-B — Fokus-Toggle „Tempo / Ertrag"  (Aufwand S, SAVE_VERSION-Bump)

### Designidee
Gleiches Pattern wie P1-A (Toggle-Komponente 1:1 wiederverwenden!): globaler Modus für alle Gather-Skills.
- **Tempo:** schnellere `durationMs` (×0.85), weniger Doppelertrag-Chance (−x). Mehr XP/h, weniger seltene Nebenmats.
- **Ertrag:** langsamer (×1.0–1.15), höhere Doppelertrag-/Nebendrop-Chance. Mehr Mats/Gems, weniger XP/h.

### State-Form → **SAVE_VERSION-Bump + Migration NÖTIG**
```
state.settings.gatherFocus: 'speed' | 'yield'   // Default 'yield' (= heutiges Verhalten am nächsten)
```
Migration: fehlend → `'yield'`. Trivial.

### Engine-Hooks (Revier: logic)
`tick.ts`: effektive Dauer-Berechnung (Z.169 ff., wo Tool/Mastery/Pool schon multiplizieren) um `focusSpeedMult` erweitern; Doppelertrag-`bonusChance` (Z.90–95) um `focusYieldBonus` erweitern (additiv, nur wenn ≠0 → Determinismus). Kein neuer RNG-Wurf.

### UI / Balance / Aufwand
UI: Toggle wie P1-A, gilt für WC/Mining/Fishing (ggf. alle Gatherer). Balance: Tempo `dur ×0.85`, `yieldBonus −0.05`; Ertrag `dur ×1.0`, `yieldBonus +0.05`. **Aufwand S** (Toggle-Pattern existiert nach P1-A). Reviere: logic + ui + content(Tuning).

## P2-C — Demand-Verzahnung  (Aufwand S, reiner Content)

Sicherstellen, dass WC/Mining/Fishing-Outputs **Pull-Demand** aus den neuen Ketten bekommen, statt nur Lager zu füllen:
- **Mining-Gems** ↔ Jewelcrafting/Fence-Output nicht doppelt entwerten (Fence-Gem-Chancen niedrig halten, s. P1-C-Leitplanke).
- **Fishing-Output** → Cooking-Combo-Food (läuft separat, Aufgabe 1): prüfen, dass Schwarm-/Premium-Fisch ein Combo-Rezept-Input ist.
- **WC-Output** → Fletching (existiert) + ggf. Inscription-Pergament (Holz→Pergament?) nur falls sinnvoll, nicht erzwingen.
Reines Content-Mapping, keine Engine/State.

---

# P3 — SMITHING (nur UX-Notiz)

Kein Inhalts-/Sink-Defizit — 252 fast identische Karten = Menü-Müdigkeit. **Reines ui-dev-Thema:** „nur craftbares zeigen"-Filter + „bestes Tier je Slot"-Schnellzugriff auf die bestehende Kategorie-Gruppierung (`category` existiert). Kein Content, kein State. Niedrige Prio. Optionale echte Tiefe (Hitze-/Qualitäts-Minispiel) wäre Aufwand M und ist **nicht empfohlen** für 1.0.

---

# Zusammenfassung für content-dev / logic-dev (Apply-List)

1. **logic-dev (P1-A):** `settings.thievingRisk` einführen (shared-Typ + persistence-Default + **SAVE_VERSION 33→34** + Migration `'careful'`). `tick.ts completeAction` Z.63–121 umbauen: Risiko-Delta in `actionSuccessChance`, Gold/Loot-Mult, Stun-Ersatz (Fehlschlag = 0 Ertrag statt Leerlauf; kurzer Stun nur bold). Risiko-Profil-Helper nach `shared`. Determinismus-Fixtures grün halten.
2. **content-dev (P1-A Tuning):** Thieving `stunMs` auf Flavor-Werte ≤1200 senken (lange Stuns raus).
3. **content-dev (P1-C):** 9 Fence-Aktionen (`category: "fence"`, `skill: "thieving"`, `inputs`) gem. Tabelle; XP via Standardkurve; max. 0–1 neues Item (vorhandene Inscription-Vorstufe wiederverwenden). Keine Engine/Migration.
4. **ui-dev (P1-A):** Risiko-Segmented-Toggle auf SkillPage (Thieving), Tooltips, i18n; Stun-Badge nur noch bold.
5. **logic+content (P2-A Stufe S):** seltene Bonus-Drops je WC/Mining/Fishing-Node (Content-only). Stufe M (Event-Fenster) optional danach.
6. **logic-dev (P2-B):** `settings.gatherFocus` (**SAVE_VERSION-Bump**, Default `'yield'`) + Dauer/Yield-Mult in `tick.ts`. ui: Toggle (Pattern aus P1-A). 
7. **content-dev (P2-C):** Demand-Mapping prüfen.
8. **(OPTIONAL) P1-B Heat-Meter** nur nach Live-Test von P1-A.
9. **ui-dev (P3):** Smithing-Craftbar-Filter bei Gelegenheit.

**Kritische Design-Defaults (sicher gewählt, falls Chef anders will → hier ändern):** Toggles sind **global** (nicht pro Aktion); Default Vorsichtig/Ertrag (= AFK-schonend); Fence bleibt **unter Thieving** (kein neuer Skill); Heat-Meter ist **optional/Fast-Follow**, nicht Teil der ersten Welle.
