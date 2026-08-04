# Sweep 2 (2026-07-01) — Onboarding & Erste-Stunde-Klarheit (Kontrolleur)

**Fokus (laut Auftrag):** NICHT die Schrittzahl (Chef-Milestone, akzeptiert), sondern:
Korrektheit der Guide-Texte (v.a. der gefixte „automatisch leveln"-Text), Passung des Guides zum
gewählten Startstil, Auffindbarkeit von Kernaktionen (Equip/Kampf/Craft), fehlende In-Kontext-Hilfen.
**Rein statische Code-/Text-Analyse + Engine-Cross-Check. Headless, kein Electron.**

## Gates
- **client build:** ✅ grün (`built in 9.36s`, exit 0) — die auslieferbare App kompiliert sauber.
- **typecheck:** ❌ **ROT** — aber **ausschließlich** in liegen­gebliebenen Temp-Sweep-Skripten (→ **G0**),
  nicht in App-/Engine-Quellcode.
- **tests:** nicht separat gefahren (würde an denselben Temp-Files ebenfalls rot laufen; Domäne der
  Balance/Sim-Personas). Onboarding berührt keine Engine-Logik-Gates außer der UI.
- **UI-Crash-Gate:** ✅ sauber. `Onboarding` ist nur in `MainLayout` gemountet (`App.tsx:305`),
  nicht an der App-Wurzel/Menü/Creation → kann nicht vor Spielstart rendern. `useGameState()`-Nutzer
  bleiben im Playing-Layout.

---

## Findings (schwerste zuerst)

### O1 — [P2 / ux+correctness / confirmed] „Automatisch-leveln"-Fix hat übersteuert: Combat-Panel behauptet „nur EINE Fertigkeit bekommt XP" — die Engine trainiert 3 gleichzeitig
Direkte Antwort auf den Prüfauftrag „der Text wurde gefixt — **stimmt er jetzt?**": **Nein, jetzt ist er
in die Gegenrichtung falsch.**
- **Text (gezeigt im Onboarding-Combat-Schritt):**
  `onboarding.guide.combat.intro` (`i18n/translations.ts:867` EN / `:1743` DE) —
  EN: *„At any time, only one of these skills earns XP: the one tied to your current combat Focus.
  Switch Focus during a fight to train the others…"*, DE emphatisch: *„…steigt jeweils nur **EINE**
  dieser Fertigkeiten…"*.
- **Engine-Realität (jeder normale Kampf trainiert parallel):**
  1. **Offensiv-Skill** je Fokus (attack/power/ranged/magic_off) — pro Treffer + Kill-XP
     (`packages/engine/src/combat.ts:410`, `:433`).
  2. **Vitality** — auf **jeden ausgeteilten** (`combat.ts:411`) **und jeden eingesteckten** Treffer
     (`combat.ts:702`).
  3. **Defence** (bzw. **magic_def**) — auf **jeden eingesteckten** Treffer, **stanceunabhängig**
     (`combat.ts:1034` → `grantDefenseXp`; Kommentar `:1027-1028`: „…zusätzlich zum Defensiv-Stil,
     damit Defence auch bei Attack/Wucht-Spielern mitwächst").
  Alle drei XP-Konstanten sind >0: `MELEE_XP_PER_DAMAGE=0.13`, `DEFENCE_XP_PER_DAMAGE=0.11`,
  `VITALITY_XP_PER_DAMAGE=0.05` (`packages/shared/src/index.ts:287,289,291`).
- **Selbst-Widerspruch auf DEMSELBEN Screen:** Der Combat-Schritt listet unter dem Intro **alle**
  `COMBAT_SKILL_IDS` inkl. `vitality` (`components/Onboarding.tsx:151-166`) mit
  `skilldesc.vitality` = *„grows as you deal **and take** damage"* (`translations.ts:346` / `:1222`).
  Der Neuling liest also gleichzeitig „nur eine Fertigkeit bekommt XP" **und** „Vitality wächst durchs
  Aus- und Einteilen" — direkter Widerspruch.
- **Folge-Missverständnis:** *„Switch Focus … to train the others (e.g. Defensive Focus trains
  Defence)"* suggeriert, man **müsse** auf Defensiv wechseln, um Defence zu leveln — tatsächlich
  levelt Defence in **jeder** Haltung passiv beim Schaden-Einstecken.
- **Korrekte Aussage wäre** etwa: „Dein **Fokus** bestimmt, welcher **Offensiv**-Skill trainiert
  (Angriff/Wucht bzw. Fern-/Magieangriff). **Verteidigung und Vitalität** steigen automatisch durchs
  Ein- und Austeilen von Schaden."
- **Owner: UI-Dev** (i18n-Text `onboarding.guide.combat.intro` EN+DE; optional analog der Tooltip
  `combat.styleHint` `:435`/`:1311`, der dieselbe „…decides which melee skill earns XP"-Verkürzung nutzt).

### O2 — [P2 / ux / confirmed] Fernkampf-/Magie-Starter sehen ihren Stil-Hinweis-Toast NIE — genau die Spieler, die ihn am dringendsten brauchen
- **Repro:** Charakter mit Startstil **Fernkampf** (oder **Magie**) erstellen → nie erscheint der
  Toast „Jetzt: Fernkampf / Pfeile werden pro Schuss verbraucht" bzw. „Jetzt: Magie / Mana…".
- **Ursache:** Der Hinweis feuert nur bei einem **Stil-Wechsel**
  (`components/Toasts.tsx:242` `prev.weaponStyle !== "ranged" && weaponStyle === "ranged"` bzw. `:251`),
  und der ganze Block liegt in `if (prev)` (`:162`). Der neue Spieler bekommt seine Startwaffe aber
  **bereits vor dem ersten Snapshot** ausgerüstet (`packages/engine/src/state.ts:77-88`), und
  `weaponStyle` kommt aus `computeStats(state).style` (`Toasts.tsx:123-124`) → im **ersten** Snapshot
  ist er schon `"ranged"`/`"magic"`. Damit gibt es nie den Übergang `melee→ranged/magic`, der den
  Hinweis auslöst. Der Toast erscheint **nur** für einen Melee-Starter, der später einen Bogen/Stab
  anlegt.
- **Erwartet:** Genau der Fernkampf-Starter braucht „Pfeile werden pro Schuss verbraucht — halte
  Munition bereit" und der Magie-Starter „Bei leerem Mana kämpfst du schwach". Strings existieren und
  sind DE/EN vorhanden (`toast.onboarding.ranged*/magic*`, `translations.ts:656-659` / `:1532-1535`).
- **Fix-Richtung:** Beim ersten Snapshot (bzw. wenn `!hasSeenRangedHint()`/`!hasSeenMagicHint()` und
  aktueller Stil ranged/magic) den Hinweis auch **ohne** Übergang einmalig zeigen.
- **Owner: UI-Dev.**

### O3 — [P3 / ux / confirmed] Der tatsächlich gezeigte Guide erklärt das Ausrüsten nirgends
- Die real gerenderten Schritte (`components/Onboarding.tsx:32-41`: Welcome + 14 Skills + Combat +
  4 Systeme + Done) enthalten **keinen** Equip-Schritt. Der frühere „drag items onto the paperdoll"-Text
  (`onboarding.equip.body`) ist verwaist (→ O5) und wird nicht angezeigt.
- Equip ist zwar auffindbar — Item auf die Paperdoll ziehen (`pages/CharacterPage.tsx:557-570`) **oder**
  Item anklicken → Kontextaktion „Ausrüsten" (`CharacterPage.tsx:346`, `:350`) — aber der Guide lehrt
  keinen der beiden Wege. **Gemildert:** die Startwaffe ist bereits angelegt (`state.ts:81`), der Neuling
  kann sofort kämpfen; relevant wird Equip erst für gecraftete/gelootete **Rüstung**.
- (Deckt sich mit Sweep-1 F3; hier nur bestätigt, dass der Fix noch aussteht.) **Owner: UI-Dev.**

### O4 — [P3 / ux / confirmed] Guide passt sich nicht an den gewählten Startstil an
- Der 21-Schritte-Guide ist für melee/ranged/magic identisch. Ein **Magie**-Starter bekommt trotzdem
  den Fletching-Screen „keep your quiver stocked" (`onboarding.guide.fletching`,
  `translations.ts:858`/`:1734`) und ein **Melee**-Starter den Runecrafting-/Mana-Screen. Die Infos
  sind für alle Stile vollständig, aber nicht auf den eigenen Stil zugespitzt. Zusammen mit **O2**
  (Stil-Toast fehlt) hat der Fernkampf-/Magie-Starter damit **gar keine** stilspezifische Zuspitzung.
- (Überschneidet Sweep-1 F1; hier bewusst nicht als Schrittzahl-Kritik, sondern als Stil-Passung.)
  **Owner: UI-Dev / CEO-Produktentscheid.**

### O5 — [P3 / code+i18n / confirmed] Verwaiste Legacy-Onboarding-Keys weiterhin im Baum (Sweep-1 F4 noch offen)
- `onboarding.{gather,process,equip,fight,economy,idle}.{title,body}` (24 Keys, EN `:178-189` /
  DE `:1054-1065`) sind definiert, aber **nirgends** im Renderer referenziert (grep über
  `apps/client/src/renderer/**` außer `translations.ts` = 0 Treffer) — Reste des alten 5-Schritt-Guides.
  Zusätzlich veraltete Terminologie: `onboarding.fight.body` sagt „combat style (Attack, Power,
  Defensive)", während die Live-UI durchgängig **„Focus"/„Fokus"** nutzt (`combat.meleeFocusLabel`
  `:651`/`:1527`). Tot, aber unnötiger Pflegeaufwand + Terminologie-Drift. **Owner: UI-Dev.**

### G0 — [P2 / process / confirmed] typecheck-Gate ROT durch liegengebliebene Temp-Sweep-Skripte (kein Onboarding, aber rotes Gate)
- `pnpm typecheck` bricht in `@hearthforge/engine` ab — **nur** in Temp-Testfiles, alle **heute**
  (2026-07-01, 14:22–15:30) angelegt, also Artefakte von **Schwester-Personas dieses Sweeps**:
  - `packages/engine/src/magic-sweep.test.ts:161,164` (TS2532)
  - `packages/engine/src/midgame-dump.test.ts:67` (TS2367), `:88` (TS2783) — importiert sogar
    `writeFileSync` (Daten-Dump, kein echter Unit-Test)
  - `packages/engine/src/midgame-sweep.test.ts:46-48` (TS2532)
  - zusätzlich `earlygame-sweep.test.ts`, `persona-sweep.test.ts` (typecheck-clean, aber ebenfalls
    liegengebliebene Temp-Skripte).
- **App-/Engine-Quellcode ist unberührt** — der **client build ist grün**. Analog zu Sweep-1 G0
  (`zzz_qa_idle.test.ts`). **Read-only-QA: ich lösche fremde Dateien nicht.**
- **Routing: CEO** → betroffene Personas ihre Temp-Skripte löschen lassen (Sweep-Regel: „…**löscht es
  danach wieder**"), damit das Gate wieder grün wird.

---

## Verifikation der „gerade gefixten" / fokus­relevanten Punkte
- **„Automatisch-leveln"-Combat-Text:** ⚠️ **nur teilweise** — Text wurde geändert, ist jetzt aber
  inhaltlich falsch (→ **O1**).
- **Terminologie „Focus":** ✅ konsistent — CombatPage-Selektor heißt „Melee/Range/Magic Focus"
  (`combat.meleeFocusLabel` `:651`; Label-Logik `pages/CombatPage.tsx:1664-1687`), passend zum
  Onboarding-„Focus".
- **Guide nur im Playing-Layout gemountet:** ✅ `App.tsx:305` (UI-Crash-Gate sauber).
- **Guide-Lifecycle:** ✅ Reset bei neuem Charakter (`game/GameContext.tsx:120,125`), erneut öffenbar
  über Optionen (`pages/OptionsPage.tsx:228` → `reopenOnboarding`).
- **i18n-Parität & keine Roh-Key-Leaks im Guide:** ✅ Alle 14 General-Skills + Combat + 4 Systeme haben
  `onboarding.guide.*`-Keys in EN **und** DE; `skilldesc.vitality` existiert (`:346`/`:1222`), d.h. der
  7. Eintrag der Combat-Liste (`Onboarding.tsx:151`) zeigt keinen rohen Key.
- **Startausstattung passt zum gewählten Stil:** ✅ melee→rusty_sword / ranged→cracked_bow (+150 Köcher
  +50 Pfeile) / magic→cracked_staff, sofort ausgerüstet (`state.ts:71-94`); Starterkit: 20 cooked_shrimp
  (Auto-Eat vorbelegt) + 3 graywort_seed (`state.ts:104-116`).

---

## Kurz-Zusammenfassung
- **Gates:** client build ✅ · typecheck ❌ (nur Temp-Sweep-Skripte, → G0) · UI-Crash-Gate ✅
- **P0:** 0 · **P1:** 0 · **P2:** 3 (O1, O2, G0) · **P3:** 3 (O3, O4, O5) · **suspected:** 0
- **Top-3:**
  1. **O1** — „Automatisch-leveln"-Fix übersteuert: Combat-Panel behauptet „nur EINE Fertigkeit bekommt
     XP", während Engine Offensiv-Skill + Vitality + Defence parallel trainiert — Widerspruch sogar zur
     Vitality-Zeile auf demselben Screen. (UI-Dev, i18n)
  2. **O2** — Fernkampf-/Magie-Starter sehen ihren Stil-Hinweis-Toast nie (Hinweis hängt an einem
     Stil-**Wechsel**, der beim gleichnamigen Startstil nie eintritt). (UI-Dev)
  3. **G0** — typecheck rot durch liegengebliebene Temp-Sweep-Testfiles der Schwester-Personas
     (aufräumen → Gate grün). (CEO-Routing)
- **Empfehlung: fix-then-ship.** Onboarding-**Mechanik** ist ship-fähig (kein Blocker, Lifecycle +
  UI-Crash-Gate sauber), aber O1 (falscher Kern-Progressions-Text) und O2 (fehlende Stil-Zuspitzung für
  same-style-Starter) sind je ein kleiner i18n-/Toast-Fix und sollten vor EA rein. G0 muss vor grünem
  Gate aufgeräumt werden.
