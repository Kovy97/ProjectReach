# QA Run 7 — Frühes Spiel (Level 1–15, Neuer-Spieler-Erfahrung)

**Datum:** 2026-06-28 · **Rolle:** Playtester-Analyst (Spieler-Sicht, STRIKT READ-ONLY — kein Spiel-Code/Content geändert)
**Scope:** Erste Stunde / L1–15. Fokus Run 7: **Krypta-Mobs droppen jetzt Equipment** (skeleton_warrior→iron_sword, skeleton_archer→iron_shortbow, skeleton_spearman→iron_spear), getaggt „run6-fix P2: Suffix-Feature früh sichtbar". Kernfrage: Ist der **frühe Suffix-Drop** jetzt für einen L1–15-Spieler **sichtbar**? Bleibt der **Ranged-Köcher-Idle-Stopp** der Hauptblocker (braucht passives Pfeil-Bergen)? Was fehlt für 9,5?
**Vergleichsbasis:** `design/qa/run6-early-l1-15.md` (Score 8.7).

**Methode:** Temporäres Sim-Harness über echte Engine-Pfade (`createGame` mit `startingStyle`/`starterKit`, `startCombat`+`combatStep`, Seed 42; Suffix-Drop über den realen Combat-Loot-Pfad gemessen, nicht geschätzt). Drop-Raten mit God-Char (str/dex/con/int/wis hoch, **LCK auf Basiswert** → realistische Loot-Chance) über je 4000 Kills; Köcher-Stopp/Krypta-Viabilität mit echtem `starterKit`-Char. **Harness nach dem Lauf wieder entfernt** (`packages/engine/src/_run7_pt_analyst.test.ts`). Vorgefundene Fremd-Harnesse (`_run7harness.test.ts`, `_run7_farm_audit.test.ts`) nicht angefasst.

**Quellen (im Code/Daten verifiziert):**
- `packages/content/src/index.ts:8550–8568` — **NEU (Run 7):** skeleton_warrior (Lvl **16**) droppt `iron_sword` @ **2,5 %**, skeleton_archer (Lvl 18) `iron_shortbow` @ 3 %, skeleton_spearman (Lvl 20) `iron_spear` @ 2,5 %. Kommentar Z. 8554: „run6-fix P2: Krypta-Equipment-Drops → Suffix-Feature früh sichtbar".
- `packages/content/src/index.ts:8548` — Zonen-Kopf bestätigt: **Krypta = Lvl 16–45**. Niedrigster Mob skeleton_warrior = **Lvl 16**.
- `packages/content/src/index.ts:8047–8066` — goblin_shaman (borderlands, **Lvl 4**, im Fenster!) droppt seit jeher `wooden_shield` 8 %, `bronze_sword` 5 %, `leather_body` 5 % → **drei Equipment-Drops im L1–15-Kern**, alle suffix-fähig. (Vom run6-Bericht übersehen.)
- `packages/engine/src/state.ts:85/101/106` — Starter **unverändert**: Köcher **150**, Food **20**, Saat **3×**, Start-Gold **0**.
- `packages/engine/src/combat.ts:747/771` — `endCombatOutOfAmmo` + `stopIfOutOfAmmo` **unverändert**: Ranged stoppt weiter **hart** bei leerem Köcher. **Kein** passives Pfeil-Bergen (`grep recover|retrieve|bergen|reclaim` → 0 Treffer in combat.ts).
- `packages/engine/src/combat.ts:416` — Drop-Suffix-Hook: jeder gedroppte Equipment-Stack rollt `DEFAULT_DROP_SUFFIX_CHANCE` (= **0,08**, shared:1124).
- `apps/client/src/renderer/components/Toasts.tsx:198–204` — `toast.enchanted` zeigt weiter **nur den Basisnamen** (kein Suffix-Name „… des Bären") — run6-P3 **unverändert**.
- `apps/client/src/renderer/components/Toasts.tsx:152/161` — Stil-Onboarding-Toast feuert weiter **nur bei Waffen-*Wechsel*** (`prev.weaponStyle !== … && weaponStyle === …`), nicht beim Start mit dem Stil — run6-P3 **unverändert**.

---

## Fun-Score: **8.7 / 10**  (Δ ±0,0 vs run6)

Run 7 fügt **echtes Equipment in die Krypta-Drop-Tabellen** ein — inhaltlich ein sinnvoller Schritt, der das Suffix-als-Drop-Feature über mehr Zonen verteilt. **Für die L1–15-Persona bewegt er den Frühspiel-Score aber nicht**, und zwar aus einem strukturellen Grund: Die neuen Equipment-Drops sitzen auf **Lvl 16–45** (skeleton_warrior ist der niedrigste Krypta-Mob @ **Lvl 16**) — also **eine Stufe oberhalb des bewerteten Fensters**. Schlimmer: Mit Starter-Gear ist die Krypta für einen frischen Char ein **Todesgrund** — gemessen **73 Kills bei 67 Toden in 10 min** gegen skeleton_warrior (cooked_shrimp heilt 8, der Mob schlägt 18). Der „früh sichtbar"-Effekt landet damit faktisch erst ab L16+ bei brauchbarem Gear, **nicht** im Neuer-Spieler-Kern.

Die eigentliche frühe Suffix-Sichtbarkeit kommt — schon vor Run 7 und vom run6-Bericht übersehen — von **goblin_shaman (borderlands, Lvl 4)**: drei Equipment-Drops (wooden_shield/bronze_sword/leather_body) ergeben gemessen **1 Suffix-Drop pro 63 Kills (1,58 %/Kill)** — ~5× häufiger als der Basis-Goblin (1/333). Plus der dominante Craft-Pfad (~1/5 Crafts). Der Suffix-„Wow" ist also im Fenster da — aber **nicht dank der Run-7-Änderung**.

Kein höherer Score, weil **alle strukturellen run6-Punkte unverändert sind**: Der **Ranged-Köcher-Stopp ist byte-identisch** (gemessen **386,3 s / 68 Kills**, exakt wie run6, kein passives Pfeil-Bergen), der **Suffix-Toast zeigt weiter keinen Suffix-Namen**, und der **Stil-Onboarding-Toast feuert weiter nicht für den Starter**. Run 7 hat keine dieser Top-Bremsen angefasst.

---

## Δ vs run6 — alle relevanten Punkte nachgeprüft

| Punkt | Status run7 | Beleg (gemessen/verifiziert) |
|---|---|---|
| **Frühen Suffix-Drop sichtbar machen** (Ziel der Run-7-Krypta-Drops) | 🟡 **VERFEHLT IM FENSTER** | Neue Drops sitzen auf **Lvl 16–45** (content:8548). skeleton_warrior iron_sword 2,5 % × Suffix 8,5 % = **1 Suffix-Drop pro 235 Kills** — und nur ab L16 erreichbar. Krypta @ Starter-Gear: **67 Tode/10 min**. |
| Früher Suffix-Drop **tatsächlich** im L1–15-Fenster | 🟢 **DA (via goblin_shaman, nicht via Run-7-Change)** | goblin_shaman Lvl 4: **1 Suffix-Drop pro 63 Kills (1,58 %/Kill)**, gemessen. Basis-Goblin weiter 1/333 (0,30 %/Kill). |
| **Ranged-Köcher-Idle-Stopp** | 🔴 **UNVERÄNDERT** | Köcher weiter 150 (state:85). Hard-Stop gemessen **386,3 s / 68 Kills / 0 Tode** — identisch zu run6 (387 s/68). **Kein** passives Pfeil-Bergen (combat.ts: 0 Treffer). |
| Suffix-Toast zeigt Suffix-Namen | 🔴 **UNVERÄNDERT** | Toasts.tsx:198–204 → nur Basisname („Eisen-Schwert"), nicht „… des Bären". |
| Stil-Onboarding-Toast für Starter | 🔴 **UNVERÄNDERT** | Toasts.tsx:152/161 → nur bei Waffen-Wechsel; Fernkampf-/Magie-Starter bleibt uninformiert. |
| Onboarding-Modal (Köcher/Farming/Suffix) | 🔴 **UNVERÄNDERT** | Weiter 7 Schritte, kein Munitions-/Farming-/Suffix-Schritt. |
| Start-Gold 0 | 🔴 **UNVERÄNDERT** | state:106-Umfeld / character = 0. Shop-Erstkontakt bleibt zu. |
| Balance L1–15 (Tode/Walls im Fenster) | 🟢 **UNVERÄNDERT GUT** | melee/magic laufen 30 min todesfrei; ranged 0 Tode bis zum Köcher-Stopp. Einziger Limiter bleibt Munition. |

---

## Gemessene Kernzahlen (Seed 42, echte Engine-Pfade)

**Starter (ranged, `starterKit`):** ammo **150** · ammoType crude_arrow · food cooked_shrimp **20** · graywort_seed **3** · gold **0**. → unverändert ggü. run6.

**Ranged-Köcher-Hardstop (starterKit vs goblin):** Stopp nach **386,3 s (6,44 min)**, **68 Kills**, ammoLeft 0, **0 Tode**. → byte-identisch zu run6.

**Suffix-Drop pro Kill (God-Char, LCK=Basis, 4000 Kills/Mob):**

| Monster | Zone / Lvl | Equipment-Drop(s) | Suffix-Drops | 1 pro … Kills | %/Kill |
|---|---|---|---|---|---|
| goblin | borderlands / 1 | leather_helm 4 % | 12 | **333** | 0,300 % |
| **goblin_shaman** | **borderlands / 4** | wooden_shield 8 % + bronze_sword 5 % + leather_body 5 % | 63 | **63** | **1,575 %** |
| skeleton_warrior | **crypt / 16** | iron_sword 2,5 % | 17 | **235** | 0,425 % |

**rollSuffix Fire-Rate** (realer Pool, DEFAULT_DROP_SUFFIX_CHANCE 0,08, 20 000 Würfe): **8,52 %** für alle getesteten Basen (leather_helm/bronze_sword/wooden_shield/leather_body/iron_sword/iron_shortbow/iron_spear) — Pool greift auf jeder Ilvl-Stufe.

**Krypta-Viabilität (L1-starterKit melee vs skeleton_warrior, 10 min):** **73 Kills / 67 Tode**. → ~1 Tod pro 9 Kills. Krypta ist für Frühspiel-Gear eine Todesfalle; die neuen Drops sind praktisch unerreichbar, bis der Spieler das L1–15-Fenster verlassen hat.

**Gating:** Einzel-Krypta-Mobs haben **kein** Level-Gate (`canFightMonster` prüft nur Slayer-Items; nur der Dungeon `crypt_depths` hat requiredLevel 30). Ein L1-Spieler kann skeleton_warrior also anklicken — und stirbt im Loop.

---

## Priorisierte Findings

### [P1 Balance/Idle] Ranged-Köcher stoppt weiter hart bei 6,44 min — unverändert, kein passives Bergen  *(run6-P1, UNVERÄNDERT)*
Gemessen **386,3 s / 68 Kills** — identisch zu run6. Ranged bleibt der **einzige** Stil mit harter Decke, während melee/magic 30 min durchlaufen. Kein passives Pfeil-Bergen, der renewable Loop (Fletchen) verlangt weiter eine Kampf-Unterbrechung. **Das ist und bleibt der Haupt-Frühspiel-Blocker** — Run 7 hat ihn nicht angefasst.
**Fix-Optionen (combat/content):** (a) **passives Pfeil-Bergen** (OSRS-Stil: Chance, verschossene Pfeile aus dem Kill zurückzubekommen) — der bereits in run6 gemessene ~3,4×-Feder-Überschuss füllt den Köcher dann *im Kampf*; und/oder (b) Start-Köcher 300–500. (a) löst die Idle-Lücke am saubersten.

### [P2 Content/Discoverability] Die Run-7-Krypta-Equipment-Drops verfehlen das L1–15-Fenster  *(NEU)*
Die neuen Drops (iron_sword/iron_shortbow/iron_spear) sollen laut Code-Kommentar „den Suffix früh sichtbar" machen, sitzen aber auf **Lvl 16–45**. Für die L1–15-Persona sind sie (a) erst am oberen Fensterrand erreichbar und (b) **praktisch tödlich** mit Starter-Gear (gemessen **67 Tode/10 min** vs skeleton_warrior). Der beabsichtigte „früh sichtbar"-Effekt landet faktisch erst ab L16+. Die Änderung ist als **Mid-Game-Content** in Ordnung, aber **nicht** der frühe-Suffix-Fix, als der sie getaggt ist.
**Fix (content):** Den frühen Suffix-Anker dort verankern, wo der Neuling kämpft — z. B. einen **garantierten/erhöhten Suffix-Drop auf ein borderlands-Schlüssel-Drop** (goblin_shaman trägt das bereits mit 1/63; ggf. einen Boss-Drop mit `suffixChance: 1` als erstes „Wow") — und das Krypta-Tagging als „L16-Content" ehrlich umbeschriften.

### [P3 Discoverability] Suffix-Toast zeigt weiter nur den Basisnamen  *(run6-P3, UNVERÄNDERT)*
`toast.enchanted` (Toasts.tsx:198–204) feuert pro neuer Instanz, nennt aber „Eisen-Schwert" statt „Eisen-Schwert **des Bären**". Genau der Suffix-Name ist der Reiz — er bleibt im Signal ungenutzt. Trifft jetzt auch alle neuen Krypta-Drops.
**Fix (ui, klein):** Suffix-Namen in den Toast-Detail aufnehmen.

### [P3 Discoverability] Stil-Onboarding-Toast erreicht den Starter weiter nicht  *(run6-P3, UNVERÄNDERT)*
Toasts.tsx:152/161 triggern nur bei Waffen-*Wechsel*; der Fernkampf-/Magie-Starter sieht den proaktiven „Pfeile/Mana werden verbraucht"-Hinweis nie. Genau der Spieler, der ihn braucht, bleibt uninformiert.
**Fix (ui, klein):** Beim Erst-Snapshot für den gewählten Startstil auslösen (`prev === null` && Stil ∈ {ranged, magic} && Hint ungesehen).

### [P3 Onboarding/UX] Onboarding-Modal + Start-Gold unverändert  *(run6-Carry-over)*
7 Schritte ohne Munition/Farming/Suffix; Start-Gold 0 hält den Shop-Erstkontakt zu. Beides unverändert, nicht blockierend.

---

## Was fehlt für 9,5? (konkret, umsetzbar)

1. **Ranged endlich idle-tauglich, ohne den Kampf zu verlassen.** Der mit Abstand größte verbleibende Hebel — und in Run 7 unangetastet (386 s Hard-Stop, byte-identisch). Sauber: **passives Pfeil-Bergen**; alternativ Köcher 300–500. (combat/content)
2. **Den frühen Suffix-Drop dorthin bringen, wo der Neuling kämpft.** Run 7 hat ihn in die **Krypta (L16+)** gelegt — am Fenster vorbei. goblin_shaman liefert bereits 1/63 im Kern; das als bewussten frühen Anker ausbauen (garantierter Suffix auf ein borderlands-Schlüssel-Drop) **statt** L16-Content als Frühspiel-Fix zu deklarieren. (content)
3. **Suffix-Namen in den Toast.** „Verzaubertes Item! · Eisen-Schwert des Bären" — billig, sofort wirksam, trifft Craft- und Drop-Pfad. (ui)
4. **Stil-Onboarding-Toast für den Starter fixen** + die leichten In-Kontext-Brücken (Fletch-Zeile im Köcher-Tooltip, suffixHint außerhalb der Enchanting-Seite). (ui)
5. **Kleiner Start-Gold-Betrag (25–50)** → öffnet den Shop-Erstkontakt. (logic/content)

Punkte 1–3 heben den Frühspiel-Score am stärksten. Combat-FX/Juice und der große geführte Tutorial-Flow bleiben laut Memory bewusst spätere Meilensteine und sind hier **nicht** bewertet.

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice, großer Tutorial-Flow, Sidebar-Design-Rollout** — laut Memory spätere Meilensteine, nicht bewertet.
- **Balance L1–15:** im Fenster weiter kein Wall, keine Todesfalle; melee/magic 30 min todesfrei, ranged 0 Tode bis Köcher-Stopp. Die Krypta-Tode (67/10 min) entstehen nur, wenn man **außerhalb** des Fensters (L16-Mobs) mit Starter-Gear kämpft.
- **Suffix-/Drop-Engine mechanisch korrekt** (rollSuffix-Pool greift auf jeder Ilvl, 8,52 % Fire-Rate). Die Findings betreffen **Platzierung/Discoverability**, nicht die Mechanik.
- **Eigenes Harness** (`_run7_pt_analyst.test.ts`) nach dem Lauf entfernt. Fremd-Harnesse (`_run7harness.test.ts`, `_run7_farm_audit.test.ts`) nicht angefasst (read-only).
