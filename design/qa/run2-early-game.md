# QA Run 2 — Frühes Spiel (Level 1–25, Neuer-Spieler-Erfahrung)

**Datum:** 2026-06-27 · **Rolle:** Playtester-Analyst (Spieler-Sicht, read-only — kein Code geändert)
**Scope:** Erste Stunde / L1–25. Onboarding-Klarheit, Skill-/Combat-Flow, Pacing, Fun.

**Quellen (im Code/Daten verifiziert):**
- `packages/content/src/index.ts` — Skills (8–34), Items/Starter-Waffen (184–287), Aktionen (3597–6900), Monster (7102–7460), Zonen/Dungeons/Quests (8469–9130), Shop (7905+).
- `packages/engine/src/character.ts` (computeStats 180–241), `state.ts` (createGame/Startausstattung), `consumable.ts`, `combat.ts` (Auto-Eat 64–75, Ammo-Stopp 599–688, Mana 503–594), `tick.ts` (HP/Mana-Regen 237–253), `leveling.ts` (XP-Kurve).
- `packages/shared/src/index.ts` (BASE_ATTRIBUTE_VALUE=5, AUTO_EAT_TIERS, HP_REGEN_PER_TICK=0.4/Tick).
- `apps/client/src/renderer/i18n/translations.ts` (Onboarding 159–172, Combat-Hints 400–417), `pages/CombatPage.tsx`.
- `design/balance-xp-table.md` (sim-abgeleitetes TTK-Band) und `design/qa/t3-final.md` (frischer cache-freier Sim-Lauf: **Bronze-Baseline 0 Auffälligkeiten, 0 echte Walls, 334 Tests grün**).

> Hinweis: Ein eigener Vollsim-Lauf (`sim.test.ts`, ~160 Stunden-Sims) lief im Zeitfenster nicht zu Ende (console.log flusht erst am Testende). Die Balance-Aussagen stützen sich daher auf den zuletzt **committeten, verifizierten** Sim-Lauf (t3-final.md) plus die sim-abgeleitete TTK-Tabelle — nicht auf Schätzung.

---

## Fun-Score: **7.5 / 10**

Solides, ungewöhnlich **breites** Frühspiel mit klarem Onboarding und fairen, verzeihenden ersten Kämpfen. Punktabzug für ein paar Neuling-Stolpersteine (gemischte Schwierigkeiten in den Startzonen ohne Warnung, Nahrung/Munition nur per Hint signalisiert) und eine konkrete Kill-XP-Inkonsistenz in den Grenzlanden.

---

## Top-Stärken

1. **Geführtes 6-Schritt-Onboarding** deckt den kompletten Kern-Loop ab (Sammeln → Verarbeiten → Ausrüsten → Kämpfen → Ökonomie → Idle/Offline) — `onboarding.*` (translations 159–172), jederzeit über Optionen erneut aufrufbar. Für ein Idle-RPG vorbildlich klar, ohne den großen Tutorial-Flow vorwegzunehmen.
2. **Dichte, gut sequenzierte Quest-Linie** ab Sekunde 1: First Steps (5 Hühner) → Goblin-Feldzug → Sammler/Bergbau/Holz → Krypta, mit **Gear-Belohnungen, die den nächsten Tier ziehen** (copper_sword → bronze → iron → steel …) + Heiltränke. Gibt dem Neuling immer ein „warum/was als Nächstes".
3. **Alle 16 Skills haben eine erreichbare Level-1-Erstaktion** (Holz/Erz/Fisch/Foraging/Thieving/Smithing/Cooking/Fletching/Leatherworking/Jewelcrafting/Runecrafting/Inscription/Herblore + Kampf). Enorme Breite sofort verfügbar — kein „leerer" Frühstart.
4. **Drei Startstile ab L1 alle spielbar & abwechslungsreich** (Code-belegt, L1-Werte): Nahkampf `rusty_sword` ~12 Schaden; Fernkampf `cracked_bow` ~10, schneller (~2,5 s) + höhere Crit; Magie `cracked_staff` ~14 + Burn-DoT, mana-nachhaltig (Kosten 3 < Regen ~2,5/s im Kampf, kein Stall — degradiert höchstens zu Weak-Melee).
5. **Verzeihende erste Kämpfe:** L1-Held hat **100 HP** (`50 + con·10`), Startmobs machen 1–9 Schaden → großer Puffer, keine frustrierenden Frühtode bei normaler Mob-Wahl.
6. **Gesundes TTK-Band & saubere Balance:** sim-abgeleitet ~2,8 s/Kill (goblin L1) bis ~11 s/Kill (ash_tyrant L20); committeter Sim-Lauf meldet **0 Walls / 0 Auffälligkeiten** im Bronze-Baseline. Keine toten Strecken im Gathering L1–25 (Holz L1/5/10/15/20/25, Fisch L1/5/10/15/20/25, Erz L1/10/15/22/25 …).
7. **Mining-Totzone bestätigt gefixt:** `mine_gravesteel` (L22) und `mine_bloodstone_seam` (L25) füllen die alte Lücke Coal (L15) → Mithril (L35) — gegengeprüft, greift.
8. **Gute In-Kontext-Hilfen** statt Wall-of-Text: `combat.noFood`, `combat.ammoHint`, `combat.regenHint`, `combat.enrageHint`, `combat.inflictsHint`, `thieving.fenceHint`, Farm-Hints.

---

## Priorisierte Findings

### [P1 Balance] Kill-XP-Inkonsistenz: Warband-Goblins geben ~2× XP gleichstufiger Mobs (Grenzlande, offen farmbar)
Die „benannte" Früh-Roster wurde auf die XP-Kurve heruntergetunt (chicken/goblin **xp 1**, goblin_shaman L4 **xp 4**, dust_vulture L5 **xp 5**, boar L6 **xp 6**, pitch_beetle L14 **xp 12**). Die Warband-Goblins (`zone: "borderlands"`, also frei im offenen Zonen-Kampf wählbar, nicht dungeon-exklusiv) blieben auf alten Werten:
- `goblin_rogue` L5 **xp 10** (vs dust_vulture L5 xp 5 → 2×)
- `goblin_spearman` L6 **xp 12**, `goblin_archer` L7 **xp 13**, `goblin_crossbower` L9 **xp 16**, `goblin_butcher` L10 **xp 18**, `goblin_felmagician` L11 **xp 20**, `goblin_stormcaller` L12 **xp 21**, `goblin_warlock` L14 **xp 25** (vs pitch_beetle L14 xp 12 → 2×).

**Wirkung:** Die Warband-Goblins sind bei niedrigen HP/kurzem TTK der eindeutig beste frühe Kampf-XP-Spot und machen den benannten Startroster (chicken/goblin/shaman/cow) XP-technisch nahezu obsolet. `design/balance-xp-table.md` empfahl für genau diese IDs xp→1–2; die Empfehlung wurde auf die Warband nie angewandt.
**Fix:** Warband-Goblin-`xp` an dieselbe `ziel_xph(level)`-Kurve angleichen (rogue→~1, butcher→~2, warlock→~4), oder bewusst als „Elite"-Tier mit höherer Gefahr/HP rechtfertigen und kenntlich machen. (Revier: content/balance-designer.)

### [P2 UX] Startzonen mischen Trivial- und Gefahr-Mobs ohne Empfehlungs-/Gefahren-Indikator
Monster sind innerhalb einer Zone **frei wählbar, nicht level-gegatet** (nur Dungeons haben `requiredLevel`, CombatPage.tsx 956–957). In den ersten beiden Zonen liegen weit auseinander:
- **Weiden:** chicken L1 (12 HP, 1 Schaden) … neben `bull_boss` „Rasender Bulle" L10, **220 HP**, 16 Schaden, **Enrage** ×1.6.
- **Grenzlande:** goblin L1 … neben `goblin_warlock` L14, **110 HP**, **24 Schaden + Burn**.
Ein L1-Neuling ohne Nahrung kann versehentlich den Bullen/Warlock anklicken und (über Burn/Enrage) sterben. Es gibt Trait-Warnungen (`inflictsHint`/`enrageHint`) und einen XP-Multiplikator-Hinweis, aber **keinen klaren „empfohlenes Level / zu stark"-Indikator** auf den Monster-Karten.
**Fix:** Auf der Monster-Karte das Monster-Level relativ zum Kampf-Level einfärben (grün/gelb/rot) bzw. „empfohlen ab Lv N"; günstig, rein UI.

### [P2 UX] Neuer Spieler startet ohne Nahrung & ohne ausgewählte Auto-Eat-Nahrung; HP regeneriert nicht im Dauer-Kampf
`createGame` gibt 0 Gold, Starterwaffe, **keine Nahrung** (`food: null`, `autoEatTier: 0`). HP-Regen läuft **nur außerhalb des Kampfes** (`tick.ts` 238: `if (combat.monsterId === null)`); im fortlaufenden Auto-Battle heilt ohne Nahrung/Regen-Gear nichts. Auto-Eat ist ab Tier 0 gratis (Schwelle 50 %), aber **erst, wenn der Spieler aktiv eine Nahrung auswählt**. Bei den 1–9-Schaden-Startmobs unkritisch (100 HP Puffer), wird aber relevant, sobald 16+-Schaden-Mobs idle gefarmt werden — und hängt allein am `combat.noFood`-Hint.
**Fix (klein):** Entweder eine kleine Start-Stack gekochter Nahrung mitgeben, ODER die erste aufgesammelte/gekochte Nahrung automatisch als Auto-Eat-Food vorbelegen, ODER den Nahrungs-Schritt im Onboarding (Schritt 4 „Fight") explizit um „wähle eine Nahrung für Auto-Eat" ergänzen.

### [P2 UX] Fernkampf-Starter läuft nach ~2,5 min Munition leer; Kampf stoppt — Grund für Neulinge unklar
`cracked_bow` startet mit 60 `crude_arrow` (state.ts 74–76). Munition wird pro Schuss verbraucht (combat.ts 603–605); bei 0 Pfeilen wird der Kampf **sauber gestoppt** (`endCombatOutOfAmmo`, 668–688) statt leise zu degradieren — gutes Verhalten. Aber ein Fernkampf-Neuling versteht evtl. nicht, **warum** der Kampf aufhört bzw. wie man nachrüstet (Pfeile gibt es im Shop für 1 g, Fletching aus Federn). Es gibt `combat.ammoEmpty`/`combat.ammoHint`.
**Fix:** Beim Ammo-Stopp einen aktiven Toast „Keine Munition — im Shop kaufen oder mit Bogenbau herstellen" prominent zeigen (nicht nur das Inline-Tag).

### [P3 Politur] Startzonen-Namen vs. Quest-Lenkung leicht verwirrend
Quest „First Steps" schickt auf **Die Weiden** (Hühner), „First Blood/Goblin Slayer" in **Die Grenzlande** (Goblins). Daneben existiert eine separate Anfängerzone **Die Aschfelder** (ash_rat L2 … ash_tyrant L20). Drei überlappende L1–20-Startzonen (Weiden/Grenzlande/Aschfelder) ohne klare Reihenfolge können einen Neuling kurz orientierungslos machen, welche „die erste" ist. Kein Fehler, aber eine sanfte Lenkung (z. B. Quest nennt die Zone, Zonenliste sortiert nach Empf.-Level) würde helfen.

### [P3 Politur] Sehr niedrige Kill-XP der absoluten Startmobs fühlt sich erst „groß" an, wenn Zahlen rollen
Nach dem Retune geben chicken/goblin/ash_rat **1 XP/Kill**. Bei ~2,8 s/Kill ist die XP/h zwar kurvenkonform (~Ziel 820/h), aber „+1" pro Kill liest sich für Neulinge wenig belohnend. Optional: Kill-XP-Toast kumulieren oder Combat-Skill-Fortschrittsbalken prominenter — reine Wahrnehmung, keine Balance-Änderung nötig.

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice** (Spell-Moment Platzhalter) — laut Memory späterer Meilenstein, nicht bewertet.
- **Großer Tutorial-Flow** — bewusst späterer Meilenstein; die vorhandenen leichten In-Kontext-Hilfen sind für L1–25 ausreichend.
- Keine P0-Bugs im Frühbereich gefunden; Engine-Guards (NaN-Härtung in computeStats, Ammo-Stopp, Mana-Degradation statt Stall) greifen sauber.
