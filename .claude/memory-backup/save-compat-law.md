---
name: save-compat-law
description: GESETZ ab Produktivbetrieb — Saves müssen bei JEDEM Update kompatibel bleiben; Korruption durch Updates ist inakzeptabel
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-20T07:44:21.450Z
---

Chef-Gesetz (2026-07-08, vor Steam-Launch): **Sobald wir produktiv sind, müssen Saves IMMER kompatibel sein.** Ein Save, das durch ein Update korrumpiert/unlesbar wird, ist unter keinen Umständen akzeptabel.

**Why:** Zahlende Steam-Kunden; ein einziger „Save weg"-Thread zerstört Launch-Reviews. Idle-Spiele leben von hunderten Stunden Fortschritt.

**How to apply:**
1. Jede State-Änderung: SAVE_VERSION-Bump + Migration + Migrations-Guard-Test (bestehende Regel [[always-update-save-logic]], jetzt verschärft: KEINE Ausnahme, kein „Feld einfach löschen").
2. **Save-Kompat-Vault:** eingefrorene ECHTE Saves jeder ausgelieferten Version liegen als Fixtures (`packages/persistence/fixtures/save-compat/vNN-*.json`); ein Guard-Test lädt ALLE durch deserialize und asserted Erfolg + Invarianten. Vor jedem Steam-Depot-Upload muss dieser Test grün sein. v56-Fixtures (= erster ausgelieferter Build) am 2026-07-08 aus den echten Chef-Saves eingefroren.
3. Content-Entfernungen laufen über den sanitize-Strip (Items verschwinden verlustarm, Save lädt) — nie über Format-Brüche.
4. Backups (#288) sind das Sicherheitsnetz (pre-migration-Snapshot je Version, atomare Writes, Selbstheilung) — aber Netz, nicht Ersatz für Kompatibilität.
5. SAVE_VERSION-Nummern werden NIE wiederverwendet; Migrationen bleiben dauerhaft im Code (Kette ab ältester ausgelieferter Version).

**VERSCHÄRFUNG POST-LAUNCH (Chef 2026-07-19, EA-Launch 24.07.): Das Spiel ist ab jetzt LIVE mit STÄNDIGEN Updates — Save-Kompat ist die oberste Dauer-Auflage jeder künftigen Änderung, kein einmaliger Launch-Check.** Konkret für JEDES künftige Update, egal wie klein:
- Berührt es State → Bump + Migration + Guard-Test + **neuen Vault-Pin `vNN-release-*.json`** (Muster v64/v69: echten Vorgänger-Save über die reale deserialize→serialize-Kette hochmigrieren, Neuflächen über echte Engine-Pfade setzen, als sanitize-Fixpunkt pinnen, +7-Tage-Robustheit). Der Vault wächst mit jeder ausgelieferten Version, ALTE Fixtures bleiben und müssen weiter grün durchmigrieren.
- Die Migrations-Kette wird nur länger, nie kürzer/umgeschrieben — ein Spieler kann von JEDER je ausgelieferten Version auf die neueste springen (überspringt evtl. mehrere Versionen).
- Vor JEDEM Depot-Upload: Vault-Guard grün, sonst kein Upload. Balance-/Content-Änderungen ohne Schema-Berührung brauchen keinen Bump, aber der Vault-Guard läuft trotzdem.
- Steam-Auto-Cloud-Pfad `%APPDATA%\Grim Reach\saves\*.json` darf sich NIE ändern (Task #288). Diese Auflage gilt, solange das Spiel existiert.
