---
name: token-thrift
description: "Chef-Regel — Token-Verbrauch aktiv optimieren, ohne Qualitätsverlust; Modell-Tiering für Subagents"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef (2026-07-09): „Kannst du deine Token Usage optimieren, dass du nicht an Qualität verlierst, aber Tokens einsparst? Wir sind gerade sehr verschwenderisch."

**Why:** Weekly-Limit ist die knappe Ressource des Sprints; Subagents sind der Großverbraucher (300–550k Tokens pro Lauf).

**How to apply:**
1. **Modell-Tiering bei Agents:** mechanische, gut spezifizierte Arbeit (i18n-Key-Löschung, Locale-Übersetzungs-Pässe, Fixture-/Screenshot-Routinen, Suchen-und-Ersetzen-Sweeps, scripted Tester) → `model: "sonnet"` (ggf. haiku); Fable nur für Urteils-Arbeit (Balance-Design, Architektur, komplexe Engine-Eingriffe). Qualitätsnetz bleibt: Guard-Tests + CEO-Abnahme.
2. **Spawn-Schwelle hoch:** Kleinkram (wenige Edits, 3 Zahlen, ein Grep) mache ich SELBST statt einen Agent zu starten; Agent-Finales/Nacharbeiten selbst erledigen statt Agent wiederzubeleben.
3. **Stufen bündeln:** verwandte Arbeit in EINEN Agent-Lauf packen statt mehrere Spawns (Revier-Grenzen beachten).
4. **Briefs verweisen statt zitieren:** auf Spec-/Plan-Dateien zeigen, nicht Inhalte einbetten; kein Boilerplate wiederholen.
5. **Output-Disziplin:** Testläufe durch grep/tail filtern, nie volle Dumps; Screenshots sparsam + gecroppt (Bilder sind teuer); nur anschauen, was die Entscheidung braucht.
6. **Kontrolleur/Audits:** EIN Abschluss-Audit statt Audit je Landung.
7. Eigene Berichte an den Chef kompakt halten (Ergebnis zuerst, kein Schmuck).
8. **Depot-Zip NUR auf Chef-Zuruf** (Chef 2026-07-10: „Nicht jedes Mal zippen, erst wenn ich eine neue Zip hochladen will — verschwendet Tokens!"): electron-builder-Repackage + Compress-Archive entfallen nach Wellen-Landungen. Nur `pnpm build` bleibt Standard (Standing Rule always-rebuild-client). Zip/frische Exe erst auf ausdrücklichen Wunsch.
