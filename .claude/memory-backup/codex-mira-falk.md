---
name: codex-mira-falk
description: "Codex (OpenAI) arbeitet als Designerin „Mira Falk\" im Studio; Arbeitsbereich G:\\GameDev\\CODEX, Marker codex:<ISO>, Claude übernimmt Test-/Build-Verifikation"
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-08-03T08:43:39.149Z
---

Seit ~2026-07-30 arbeitet ein zweiter KI-Mitarbeiter im Studio: **Codex (OpenAI) mit der Arbeits-Persona „Mira Falk"** (Visual Designerin/Asset-Spezialistin, spricht den Chef als „Chef" an). Chef + Claude führen, Codex liefert. **Rollenteilung (Chef-Entscheid 03.08., bindend): Claude baut IMMER das Grundgerüst (alle Implementierung — Engine/Content/Persistenz/React/CSS/i18n/Tests/Release); Mira ist NUR für Assets + Generierung von UI-Element-Grafiken + visuelle Konzepte/Mockups zuständig. Produktiver Code durch Mira nur auf ausdrücklichen Chef-Einzelauftrag.**

**Why:** Chef hat die Zusammenarbeit fest eingerichtet (Root-`AGENTS.md`, `START-CODEX.bat`); Claude muss bei jeder Sitzung wissen, wo Miras Stände liegen und was ihre Sandbox NICHT kann.

**How to apply:**
- **Kommunikationsprotokoll (Chef-Regelung 03.08.):** Claude → Mira über Dateien in `CODEX/inbox/` (`YYYY-MM-DD-NN-slug.md`, Template + stehende Vereinbarungen in `CODEX/inbox/README.md`); Claude meldet dem Chef „Neue Nachricht für Mira: <Dateiname>", Chef reicht weiter; Mira antwortet über HANDOFF.md und verschiebt Erledigtes nach `inbox/done/`.
- Onboarding/Neueinstieg: `CODEX/PERSONA.md` → `RULES.md` → `PROJECT.md` → `CURRENT.md` → `HANDOFF.md` (Tail = neuester Stand, Datei ist riesig) → `WORKLOG.md` (Tail).
- Ihre Code-Eingriffe tragen Marker `codex:<ISO-Zeitstempel>` — workspaceweit per Grep `codex:` auffindbar. KEIN Git im Workspace (Stand 03.08.): die Marker + `CODEX/outbox/**`-Prechange-Backups (mit SHA-256-Manifesten) sind der Rollback-/Diff-Mechanismus.
- Staging: `CODEX/assets/**` und `CODEX/AssetControl/**` (nicht produktiv); Mockup-Studien: `CODEX/work/**`; produktiv erst nach Chef-GO.
- **Miras Sandbox kann keine Prozesse starten** (`spawn EPERM`): kein Vitest-Runner, kein `pnpm build`, kein Electron. Ihre Übergaben lassen „regulärer Testlauf/Build" explizit offen → das ist Claudes Pflichtteil nach jeder materiellen Codex-Lieferung (logic-dev/kontrolleur/ui-dev laut ihrem „Empfohlener Claude-Owner").
- Codex-Änderungen nicht pauschal überschreiben — erst HANDOFF-Abschnitt + Chef-Entscheide prüfen. Sie fasst `.claude/**` nie an.
- Stand 03.08.: SAVE_VERSION 79 (Codex-Bump 78→79, `character.autoPotion.autoRebuffUnlocked`); Fokus 0.3.0 „New Haven" ([[roadmap-1.0]], Encampment-V3-Assets produktiv, freie Platzierung); Chef-Direktive: **persistente visuelle Gebäudeanpassung (Skalierung 1–300 % + H-Spiegelung) über regulären GameState-/Migrations-/Sanitize-/Testpfad speichern, ausdrücklich NICHT localStorage** — bei Codex aktuell noch renderer-lokal.
