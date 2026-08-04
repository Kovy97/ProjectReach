# Sweep 2026-07-01 — Feel / QoL / Pacing (Tester 10)

Fokus: Spielgefühl, Quality-of-Life, Pacing. Idle-RPG-Maßstab „respektiert deine Zeit".
Methodik: headless Real-Play über `SimPlayer` (deterministisch, seed 5) + statische UI/Content-Analyse.
Alle Zahlen aus tatsächlichen Sim-Läufen, nicht geschätzt.

---

## Findings

### P2 — [feel] Standard-Nahkampfhaltung rotiert nie → einseitiger „Attack-only"-Build
- **Kontext/Repro:** Frischen Nahkämpfer erstellen, Hühner kämpfen, Haltung nie wechseln (= Default `combatStyle: "attack"`, `character.ts:86`).
- **Erwartet:** Über die Zeit entwickelt sich ein runder Kämpfer (Treffgenauigkeit + Schaden + Verteidigung + HP).
- **Tatsächlich:** Nach 10 Sim-Minuten Auto-Kampf: `attack:9, power:1, defence:1, vitality:4`. Nur `attack` (+passiv `vitality`) steigt; **`power` (Schaden) und `defence` bleiben auf Level 1**, weil die Default-Haltung ausschließlich attack-XP routet (`shared/index.ts:84-91`, `combat.ts:372-410`).
- **Verstärker:** Onboarding-Text behauptet „These seven skills level up automatically as you fight" (`translations.ts:868`) — für power/defence schlicht falsch. Der einzige Hinweis auf den Haltungs-Wechsel steckt in einem Hover-Tooltip der Stance-Leiste (`combat.styleHint`, `translations.ts:436`), es gibt keinen aktiven Nudge.
- **Owner Fix:** Combat-Dev (Default-Haltung / Auto-Rotation) + UI-Dev (Nudge-Toast + Onboarding-Text korrigieren).

### P2 — [ux] Onboarding ist eine 21-Schritt-Modalwand beim ersten Start
- **Kontext:** `Onboarding.tsx:32-41` baut die Schrittliste: Welcome + **14 Skills einzeln** + Combat + 4 Systeme + Done = **21 Klicks Text**, bevor man spielen darf. (21 Skills total, davon 7 Kampf → 14 „General"-Skills, jeder ein eigener Schritt.)
- **Erwartet (per Memory `onboarding-guide-final-milestone`):** „jetzt nur leichte In-Kontext-Hilfen; großer geführter Flow ganz zum Schluss."
- **Tatsächlich:** Voller 21-seitiger Guide direkt bei Spielstart. Für ein Idle-Spiel ist das eine hohe Einstiegshürde — die meisten drücken „Skip" und verlieren damit auch die wirklich nützlichen Hinweise (Auto-Eat, Munition, Mana, Farming-Offline).
- **Owner Fix:** UI-Dev — auf 3-5 Kern-Schritte kürzen; Skill-Deep-Dives als In-Kontext-Hinweis beim ersten Öffnen der jeweiligen Skill-Seite.

### P3 — [feel] Skilling-Frühgame deutlich zäher als Combat (Asymmetrie des ersten Eindrucks)
- **Kontext/Repro:** Frischer Char, `cut_normal_tree` dauerhaft (2 XP / 2,8 s). Gemessene Zeit bis Level:
  - L2 = 1m58s (41 identische Aktionen), L5 = 9m02s, L10 = 26m45s.
  - Combat zum Vergleich: erstes Kampf-Level nach ~44 s; `attack` L9 in 10 Min.
- **Erwartet:** Erster Fortschritts-Dopamin-Hit früh genug, damit der Einstieg nicht „zäh" wirkt.
- **Tatsächlich:** Erstes Skilling-Level dauert ~2 Min mit null Zwischen-Feedback außer der XP-Leiste. Gemildert (nicht aufgehoben) durch: sichtbare xp/h- & Yield-Kacheln, parallelen Mastery-Track und 1% Nest-Drops. Die Combat↔Skilling-Asymmetrie prägt aber den ersten Eindruck negativ für Skiller.
- **Beleg Persona-Sweep:** crafter-Persona erreicht nach 20 Sim-Min nur Fletching L3 (`persona-sweep`), progression_combat Kampf-Niveau 9 in 30 Min — beide „Grind lang, aber kein Wall".
- **Owner Fix:** Balance-Designer — Frühlevel-XP der Start-Aktionen leicht anheben ODER Mastery-Frühfeedback betonen (Content-Dev setzt Zahlen um).

### P3 — [ux] Bank ohne Sortierung / Suche / Filter
- **Kontext:** `CharacterPage.tsx:144,314` bietet Inventar-Sortiermodi (newest/name/value/rarity). `BankPage.tsx` hat **keine** Sortierung/Suche/Filter — nur Deposit-All / Withdraw-All / Shift-Click.
- **Erwartet:** Konsistente Auffind-QoL wie im Inventar.
- **Tatsächlich:** Bei ausbaubaren 60→ Slots und hunderten Item-Typen wird das Wiederfinden mühsam. Kein P2, weil Bankeinträge fungibel sind und Bulk-Aktionen existieren.
- **Owner Fix:** UI-Dev — Inventar-Sortier-Komponente in der Bank wiederverwenden, optional Textsuche.

### P3 — [feel] Skilling-Glücksfunde erzeugen keinen Feedback-Moment
- **Kontext:** `Toasts.tsx:187-204` feuert „Rare Find!" **nur aus Combat-Loot** (bewusst, Chef-Wunsch: kein Toast beim Verarbeiten). Skilling-Überraschungsdrops (Bird's Nest 1%, Rough Garnet 1% beim Mining) laufen komplett ohne Toast/SFX ins Inventar.
- **Erwartet:** Ein seltener Fund beim Skilling fühlt sich als Moment an.
- **Tatsächlich:** Null Akustik/Visuals — der Fund verschwindet unbemerkt im Bag. Für Skiller fehlt damit der „Jackpot"-Moment, den Combat hat.
- **Owner Fix:** UI-Dev — eigener, dezenter Skilling-Fund-Toast nur für echte Gather-Raritäten (Nest/Gem), nicht für craftbare Zwischenprodukte.

---

## Was gut ist (QoL-Stärken, kein Fix nötig)
- Toast-System deckt Level-up / seltenen Drop / Achievement / Pet / Slayer-Task ab, mit SFX (`Toasts.tsx`).
- Offline-Popup: klare Aufschlüsselung XP + Levels je Skill + Gold + Items (`OfflinePopup.tsx`).
- Skill-Seite zeigt xp/h-Rate, Zeit/Aktion, Yield/h, Mastery-Level + Fortschritt + Doppel-Ertrag-Bonus (`SkillPage.tsx`).
- Shop: Bulk-Buy 1×/5×/25×/100× + Mengen-Verkauf; Bank: Deposit-All/Stack, Withdraw-All.
- Item-Tooltip mit Ausrüst-Vergleich (`ItemTooltip.tsx` `compareItem`).
- Stance-Leiste im Kampf zeigt je Haltung Skill-Level + XP-Balken; klickbare HP-Leiste springt zum Fight.
- Header meldet „⚠ gestoppt" mit Grund (Inventar voll / kein Material) — kein stiller Stillstand.
- `Toasts` korrekt in `MainLayout` gemountet (nicht am App-Root) → kein Menü-Crash-Risiko.

---

## Friction-Log (Kurzfassung, chronologisch für einen neuen Spieler)
1. **Spielstart:** 21-seitige Onboarding-Modalwand — hohe Hürde, Skip-Reflex. (P2)
2. **Erste 2 Min Skilling:** 41 identische Klicks bis zum ersten Level, sonst nur eine kriechende XP-Leiste. (P3)
3. **Erste 10 Min Combat:** fühlt sich gut getaktet an (Level @44s, ~7 Kills/Min, 0 Tode, ~2000 Gold/h) — aber `power`/`defence` bleiben unbemerkt auf 1, weil die Haltung nie wechselt; Onboarding-Text hat „automatisch" versprochen. (P2)
4. **Skilling-Glücksfund (Nest/Gem):** kein Ton, kein Toast — verpuffter Moment. (P3)
5. **Bankwachstum:** keine Sortierung/Suche, Wiederfinden wird zäh. (P3)

## Top-3-QoL-Empfehlungen
1. **Kampf-Haltung „rund" machen:** Default auf eine ausgewogene/rotierende Haltung ODER einmaliger Nudge-Toast beim ersten Kampf („Tipp: Haltung wechseln, um Wucht & Verteidigung zu trainieren"); dazu den irreführenden Onboarding-Satz „level up automatically" präzisieren. (Combat-Dev + UI-Dev)
2. **Onboarding entschlacken:** First-Launch auf 3-5 Kern-Schritte kürzen, tiefe Skill-Erklärungen als In-Kontext-Hinweis beim ersten Öffnen der Skill-Seite (deckt sich mit der Memory-Design-Richtung). (UI-Dev)
3. **Bank-Sortierung/Suche** aus der Inventar-Komponente übernehmen. (UI-Dev)

*Verifikations-Notiz: temporärer Pacing-Probe-Test wurde nur zum Messen genutzt und wieder entfernt — Repo unverändert.*
