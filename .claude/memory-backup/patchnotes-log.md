---
name: patchnotes-log
description: Ab 2026-07-20 JEDEN Fix/Change in design/patchnotes.md eintragen — Quelle für Steam-Patchnotes
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-20T14:06:54.003Z
---

Chef-Regel (2026-07-20, Launch): Ab jetzt wird **jeder Fix und jede Änderung** in
`G:\GameDev\design\patchnotes.md` protokolliert.

**Warum:** Das Spiel ist live; wir posten laufend Steam-Update-Notes. Ohne laufendes Protokoll
fehlt uns beim Patch die Übersicht, was seit dem letzten Build geändert wurde.

**How to apply:** Nach jedem umgesetzten Fix/Change einen Eintrag in der Sektion
„Unveröffentlicht" ergänzen — spielertaugliche Zeile + kursive Dev-Notiz. Wenn ein Build live
geht, die Sektion in eine Versions-Überschrift umbenennen und neue leere „Unveröffentlicht"-Sektion
anlegen. Erste Einträge: url()-Hintergrund-Fix [[css-url-must-be-quoted]] + Ring-Slot-Fix.
Verwandt: [[save-compat-law]] (jeder Build braucht ggf. Bump+Migration+Vault-Pin).
