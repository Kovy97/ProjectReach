# QA Run 6 — Frühes Spiel (Level 1–15, Neuer-Spieler-Erfahrung)

**Datum:** 2026-06-28 · **Rolle:** Playtester-Analyst (Spieler-Sicht, STRIKT READ-ONLY — kein Spiel-Code/Content geändert)
**Scope:** Erste Stunde / L1–15. Fokus Run 6: **erweitertes Starter-Kit** (Köcher 60→150, 3× graywort_seed, Food 10→20), **Suffix-Drop-Toast**, **neue In-Kontext-Onboarding-Hinweise**. Kernfrage: Köcher-150 + craftbarer Nachschub = kein Fernkampf-Stopp mehr? Starter-Saat/Food spürbar besser? Suffix früh sichtbar?
**Vergleichsbasis:** `design/qa/run5-early-l1-15.md` (Score 8.0).

**Methode:** Temporäres Sim-Harness (`createGame` mit echtem Renderer-Pfad `startingStyle` + `starterKit:true`, dann `startCombat`/`advance`, Seed 42; Suffix-Rolls über `rollSuffix` mit `DEFAULT_*_SUFFIX_CHANCE`). Drop-Messung mit `expandBaseCapacity` (kein Overflow). Kills über das eindeutige globale `stats.kills` (kein Doppelzählen am OOA-Stopp). **Harness nach dem Lauf wieder entfernt** (`packages/engine/src/_run6_early_mine.test.ts`). Zahlen unten sind gemessen, nicht geschätzt.

**Quellen (im Code/Daten verifiziert):**
- `packages/engine/src/state.ts` — Köcher-Start **150** (Z. 85, war 60), Start-Food **cooked_shrimp ×20** (Z. 101, war 10), **3× graywort_seed** (Z. 104–108, NEU). `character.ts:89` Start-Gold weiter **0**.
- `packages/engine/src/combat.ts` — `endCombatOutOfAmmo` (Z. 747) + `stopIfOutOfAmmo` (Z. 771): Ranged stoppt weiterhin **hart** bei leerem Köcher; Drop-Suffix-Hook Z. 416–421. Suffix-Engine `suffix.ts` unverändert korrekt.
- `packages/content/src/index.ts` — goblin (Z. 7950): feather **0.40** (1–2), leather_helm **0.04**; `fletch_crude_arrows` (5×arrow_shaft + 1×feather → 15 crude_arrow, Fletching L1, gold-frei) unverändert.
- `apps/client/src/renderer/components/Toasts.tsx` — **NEU**: `toast.enchanted` feuert pro neuer Instanz im Inventar (Affix **oder** Suffix, Z. 192–208); `toast.ammoEmpty` bei leerem Köcher im Kampf (Z. 171–179); `toast.onboarding.ranged/magic` (Z. 151–169); `farm.hint.plots`-Toast beim ersten Beet (Z. 210–219).
- `apps/client/src/renderer/pages/CombatPage.tsx:621` — Köcher-Anzeige mit Tooltip `combat.ammoHint` + Mengenanzeige (`combat.ammo: N`) + „Out of ammo"-Inline-Warnung.
- `apps/client/src/renderer/pages/EnchantingPage.tsx:171` — `enchant.suffixHint` (Erklärtext zum Suffix-System) — **nur auf der Enchanting-Seite**.
- `apps/client/src/renderer/components/Onboarding.tsx:13` — Onboarding-Modal **weiterhin 7 Schritte** (welcome/gather/process/equip/fight/economy/idle), **kein** Köcher-/Farming-/Suffix-Schritt.

---

## Fun-Score: **8.7 / 10**  (Δ +0.7 vs run5)

Run 6 räumt die **billigen, spürbaren Frühspiel-Bremsen aus run5 konsequent ab**: Das Starter-Kit dichtet alle drei Sackgassen ab (Saat → erster Farm-Besuch sofort spielbar; Food 20 → **0 Tode** im 30-min-Dauerkampf statt 1–3; Köcher 150 → Fernkampf hält **2,5× länger**). Und der **Suffix-„Wow" ist jetzt sichtbar**: ein neuer Suffix- (oder Affix-)Gegenstand im Inventar löst einen eigenen Toast „Verzaubertes Item!" aus — der greift sowohl beim häufigen **Craft-Pfad** (~1/5 Crafts) als auch beim seltenen Drop. Dazu kommen passive Sicherheitsnetze (Köcher-Tooltip, Munitions-Leer-Toast, Farming-Erstkontakt-Toast).

Kein höherer Score, weil zwei strukturelle Punkte aus run5 nur **teilweise** gelöst sind: (1) der Fernkampf **stoppt weiter hart** — jetzt bei **387 s (6,45 min)** statt 155 s, aber er stoppt, während melee/magic die vollen 30 min durchlaufen; kein passives Pfeil-Bergen, der renewable Loop verlangt weiter eine Kampf-Unterbrechung. (2) Das **Onboarding-Modal schweigt unverändert** zu Köcher/Farming/Suffix — und der dedizierte **Fernkampf-Onboarding-Toast feuert ausgerechnet für den Fernkampf-Starter NICHT** (er triggert nur bei einem Waffen-*Wechsel*, nicht beim Start mit dem Stil). Suffix-**Drops** bleiben numerisch selten (~1/287 Kills); sichtbar ja, aber als Anlass im Frühspiel rar.

---

## Δ vs run5 — alle gemeldeten Findings nachgeprüft

| run5-Finding | Status run6 | Beleg (gemessen/verifiziert) |
|---|---|---|
| **[P2] Fernkampf-Köcher stoppt nach 155 s hart** | 🟡 **VERBESSERT, nicht gelöst** | Köcher 60→**150** (state.ts:85). Gemessen: Hard-Stop jetzt **387 s / 68 Kills** statt 155 s / 22. Ranged weiter **einziger** Stil mit Decke; kein passives Pfeil-Bergen (2,21 Pfeile/Kill verschossen, 0 zurück). |
| **[P2] Suffix-„Wow" nur über Craft, nie über Drops, ohne UI-Signal** | 🟡 **VISIBILITÄT BEHOBEN, Frequenz offen** | `toast.enchanted` (Toasts.tsx:192) feuert pro neuer Affix-/Suffix-Instanz — deckt Craft (~1/5) **und** Drop. ABER: Drop-Frequenz unverändert (~1/287 Kills, leather_helm 4 % × Suffix 8,7 %); kein garantierter früher Suffix-Drop. Toast zeigt nur **Basisnamen**, nicht „… des Bären". |
| **[P2] Erster Farm-Besuch leer — keine Start-Saat** | 🟢 **BEHOBEN** | **3× graywort_seed** im Starter-Kit (state.ts:104–108, gemessen seed=3) — füllt die 3 Start-Beete genau einmal. |
| **[P3] Dünner 10-Stück-Nahrungspuffer (1–3 Tode/30 min)** | 🟢 **BEHOBEN** | Food 10→**20** (state.ts:101, gemessen food=20). Dauerkampf-Tode: melee/ranged/magic alle **0** über 30 min (run5: 3/0/1). |
| **[P3] Onboarding ohne Köcher-/Farming-/Suffix-Schritt** | 🟡 **TEILS** | Modal weiter **7 Schritte** (Onboarding.tsx:13). Aber neue In-Kontext-Hilfen: Köcher-Tooltip `combat.ammoHint`, `toast.ammoEmpty`, `farm.hint.plots`-Toast, `enchant.suffixHint` (nur Enchanting-Seite). |
| Start-Gold 0 | 🔴 **UNVERÄNDERT** | character.ts:89 = 0. Shop-Erstkontakt (Pfeile/Saat/Food kaufen) bleibt ohne Anschub zu. |

---

## Gemessene Startwerte (Seed 42, echter Renderer-Pfad `starterKit:true`)

| Stil | Mainhand | Munition/Mana | Nahrung | Saat | Gold |
|---|---|---|---|---|---|
| melee | rusty_sword | — | cooked_shrimp **×20** | **graywort_seed ×3** | 0 |
| ranged | cracked_bow | **crude_arrow ×150 im Köcher** | cooked_shrimp **×20** | **graywort_seed ×3** | 0 |
| magic | cracked_staff | maxMana, manaCost 5 | cooked_shrimp **×20** | **graywort_seed ×3** | 0 |

Alle drei Stile ab Sekunde 1 spielbar. **Erster Farm-Besuch jetzt direkt bestellbar** (3 Saat = 3 Beete). **Erster langer AFK-Lauf todesfrei** (Food 20 reicht über 30 min Dauerkampf).

---

## Parität — Dauerkampf vs Goblin (L1), `starterKit`, **ohne** manuellen Restock (30-min-Fenster, Seed 42)

| Stil | Kills | Tode | Limit |
|---|---|---|---|
| melee | **201** | **0** | läuft volle 30 min |
| **ranged** | **68** | **0** | **HARTER STOPP @ 387 s** (150 Pfeile leer, `endCombatOutOfAmmo`) |
| magic | **479** | **0** | läuft volle 30 min |

Gleiche Struktur wie run5, aber zwei klare Verbesserungen: **0 Tode überall** (Food-20-Puffer hält), und das Fernkampf-Fenster ist von 155 s → **387 s** gewachsen. Munition bleibt der **einzige** Limiter; kein Stat-Wall, keine Todesfalle. Magie hat weiter den höchsten Frühspiel-Durchsatz, melee solide, ranged von den 387-s-Fenstern gedeckelt.

### Fernkampf-Ökonomie im 150-Pfeil-Fenster (Seed 42, gemessen)
- Fenster **387 s**, 68 Kills, **2,21 Pfeile/Kill** verschossen, **0,50 Federn/Kill** gesammelt.
- Selbstversorgung: 0,50 Federn/Kill × 15 Pfeile/Feder (`fletch_crude_arrows`) = **~7,5 craftbare Pfeile/Kill verdient** vs. 2,21 verschossen → **~3,4× Überschuss**. Der gold-freie renewable Loop ist weiter klar positiv.
- Aber: man muss dafür weiter den Kampf verlassen (Holzfällen → `fletch_shafts` → `fletch_crude_arrows`), weil immer nur **eine** Aktion aktiv ist. Ökonomie gelöst, **Idle-Kontinuität nicht** — nur 2,5× später als run5.

### Suffix als „Wow" (gemessen)
- **Craft:** bronze_sword ilvl1 @ `DEFAULT_CRAFT_SUFFIX_CHANCE` 0,20 → gemessen **20,9 %** (~1/4,8 Crafts). **Und jetzt sichtbar:** der erste „Bronzeschwert"-Craft mit Suffix wirft `toast.enchanted` aus → echter, früher, **sichtbarer** Craft-Moment. ✅
- **Drop:** leather_helm ilvl1 @ `DEFAULT_DROP_SUFFIX_CHANCE` 0,08 → gemessen **8,7 %**. Aber goblin droppt leather_helm nur @ 4 % → **~1 Suffix-Drop pro ~287 Kills**. Sichtbar (Toast), aber als Frühspiel-Anlass weiter rar. 🟡
- **Toast-Detail-Lücke:** Der Toast zeigt nur den **Basis-Itemnamen** („Bronzeschwert"), nicht den Suffix („des Bären"). Genau der Name ist laut run5 der eigentliche Reiz — er bleibt im Signal ungenutzt.

---

## Priorisierte Findings

### [P1 → P2 Balance/Idle] Fernkampf stoppt weiter hart — jetzt bei 6,45 min statt 2,5 min  *(run5-P2, verbessert)*
Köcher 150 ist ein echter Fortschritt (Hard-Stop 155 s → **387 s**, Tode 0), aber **strukturell** ist nichts gelöst: ranged ist weiter der einzige Stil mit harter Decke, der renewable Loop verlangt eine Kampf-Unterbrechung, und es gibt **kein passives Pfeil-Bergen** (2,21 Pfeile/Kill verschossen, 0 zurück). Für ein Idle-Spiel mit Stunden-Sessions ist 6,45 min weiter ein abrupter Bruch — genau die Frühspiel-Asymmetrie, die run5 als Top-Punkt nannte, nur 2,5× später.
**Fix-Optionen (combat/content):** (a) **passives Pfeil-Bergen** (OSRS-Stil: Chance, verschossene Pfeile aus dem Kill zurückzubekommen) — der gemessene 3,4×-Feder-Überschuss füllt den Köcher dann *im Kampf*; **und/oder** (b) Start-Köcher noch höher (300–500). (a) löst die Idle-Lücke am saubersten, weil sie den Fletch-Umweg überflüssig macht.

### [P3 Discoverability] Fernkampf-/Magie-Onboarding-Toast feuert NICHT für Starter dieses Stils  *(NEU — Logik-Lücke)*
`Toasts.tsx:152` triggert den ranged-Hinweis nur bei `prev.weaponStyle !== "ranged" && weaponStyle === "ranged"`, also nur bei einem Waffen-**Wechsel**. `snap.current` startet `null`; beim ersten Tick wird der Snapshot mit `weaponStyle = "ranged"` initialisiert, **bevor** verglichen wird → für einen Spieler, der bei der Charaktererstellung Fernkampf wählt, ist `prev.weaponStyle` ab dem ersten Vergleich schon „ranged", die Bedingung bleibt dauerhaft falsch. **Der proaktive „Pfeile werden verbraucht — halte Munition bereit"-Hinweis erreicht also genau den Spieler nicht, der ihn am meisten braucht** (analog magic). Sicherheitsnetze bleiben (Köcher-Tooltip + `toast.ammoEmpty` bei Leerlauf), aber die proaktive Lehrsekunde fehlt.
**Fix (klein, ui):** den Stil-Onboarding-Toast auch beim **Erst-Snapshot** für den gewählten Startstil auslösen (z. B. wenn `prev === null` und `weaponStyle` ∈ {ranged, magic} und Hint noch nicht gesehen).

### [P3 Discoverability] Suffix-Drop sichtbar, aber im Frühspiel weiter selten; Toast zeigt den Suffix-Namen nicht  *(run5-P2-Rest)*
Die Visibilität ist gelöst (`toast.enchanted`). Offen bleibt: (a) über **Drops** trifft ein L1–15-Spieler den ersten Suffix erst nach **~287 Goblin-Kills** — der Toast feuert dann zwar, aber selten. (b) Der Toast nennt nur den Basisnamen („Bronzeschwert"), nicht „**des Bären**" — der eigentliche Reiz bleibt im Signal aus. (c) Der Erklärtext `enchant.suffixHint` lebt nur auf der **Enchanting-Seite**, die ein Frühspieler kaum öffnet.
**Fix (klein, content/ui):** garantierter/erhöhter Suffix auf ein frühes Schlüssel-Drop **oder** frühe Equipment-Drop-Raten leicht anheben; **Suffix-Namen in den Toast** aufnehmen („Verzaubertes Item! · Bronzeschwert des Bären"); suffixHint zusätzlich z. B. im Inventar/Char-Tooltip beim ersten Suffix-Item zeigen.

### [P3 Onboarding] Onboarding-Modal deckt Köcher/Munition, Farming und Suffix weiter nicht ab  *(run5-P3, teils)*
7 Schritte (Onboarding.tsx:13), keiner zu Munition-Nachschub (Fletchen ab L1!), Farming-Beeten oder Suffix. Die neuen In-Kontext-Toasts/Tooltips federn das gut ab, aber ein Frühspieler erfährt nirgends proaktiv, dass er Pfeile **selbst schnitzen** kann. Großer Tutorial-Flow ist laut Memory finaler Meilenstein; ein Einzeiler im Köcher-Tooltip („Pfeile aus normal_log + Federn fletchen, Fletching L1") wäre die billige Brücke.

### [P3 UX] Start-Gold weiterhin 0  *(run5-Carry-over)*
Mit Saat + Food + Köcher ist das Starter-Kit jetzt rund, aber Gold = 0 hält den **Shop-Erstkontakt** zu (Pfeile @1 Gold, Saat, Food nachkaufen). Ein kleiner Startbetrag (z. B. 25–50 Gold) würde den Shop als frühe Option überhaupt sichtbar machen. Nicht blockierend.

---

## Was fehlt für 9,5? (konkret, umsetzbar)

1. **Fernkampf endlich idle-tauglich, ohne den Kampf zu verlassen.** Köcher 150 verschiebt den Hard-Stop nur (155 s → 387 s). Der saubere Fix bleibt **passives Pfeil-Bergen** (Chance, verschossene Pfeile aus dem Kill zurückzuholen) — der ~3,4×-Feder-Überschuss füllt dann den Köcher *im Kampf*; alternativ Köcher 300–500. **Größter verbleibender Hebel.** (combat/content)
2. **Suffix-Drop früh tatsächlich auslösen + den Namen zeigen.** Heute sichtbar, aber ~1/287 Kills und ohne Suffix-Name im Toast. Garantierter/erhöhter Suffix auf ein frühes Schlüssel-Drop **plus** „… des Bären" in den Toast. (content/ui)
3. **Stil-Onboarding-Toast für Starter fixen.** Der ranged/magic-Hinweis feuert nur bei Waffen-Wechsel, nie beim Start mit dem Stil — genau der falsche Spieler bleibt uninformiert. Beim Erst-Snapshot auslösen. (ui)
4. **Drei leichte In-Kontext-Brücken vollenden:** Fletch-Zeile im Köcher-Tooltip, suffixHint auch außerhalb der Enchanting-Seite, optional ein Onboarding-Schritt „Munition & Farming". (ui)
5. **Kleiner Start-Gold-Betrag** (25–50) → öffnet den Shop-Erstkontakt; rundet das ohnehin stark verbesserte Starter-Kit ab. (logic/content)

Punkte 1–3 heben den Frühspiel-Score am stärksten; 4–5 sind Politur. Combat-FX/Juice und der große geführte Tutorial-Flow bleiben laut Memory bewusst spätere Meilensteine und sind hier **nicht** bewertet.

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice, großer Tutorial-Flow, Sidebar-Design-Rollout** — laut Memory spätere Meilensteine, nicht bewertet.
- **Balance L1–15:** kein Wall, keine Todesfalle, jetzt **0 Tode** über alle drei Stile im 30-min-Dauerkampf. Einziger Limiter bleibt die Fernkampf-Munition (P2). Magie höchster Durchsatz, melee solide.
- **Suffix-/Köcher-/Auto-Eat-/Farming-Engine** mechanisch korrekt (Tests vorhanden, im Sim bestätigt). Die Findings betreffen Balance/Discoverability/Onboarding, nicht die Mechanik.
- **Eigenes Harness** (`_run6_early_mine.test.ts`) nach dem Lauf wieder entfernt. `sim.ts` ist regulärer committeter Code (kein Temp), nicht angefasst.
