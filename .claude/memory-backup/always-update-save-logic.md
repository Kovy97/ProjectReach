---
name: always-update-save-logic
description: "Whenever new game state is added, the persistence/save logic must be updated too"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Bei JEDEM neuen Feature, das Spielzustand hinzufügt oder ändert (neue Felder in `GameState`/`CharacterState`, neue Slots, neue Systeme), muss die Speicherlogik mitgezogen werden, damit wirklich alles gespeichert/geladen wird.

**Why:** Der User hat explizit betont, dass die Speicherung nie hinterherhinken darf — verlorener Fortschritt ist in einem Idle-Spiel fatal.

**How to apply:** Beim Hinzufügen von State (1) prüfen, ob `serialize`/`deserialize` in `packages/persistence` und ggf. die `summary` es abdecken (State wird als Ganzes serialisiert, also meist automatisch — aber bewusst verifizieren); (2) bei Strukturänderungen am Save-Format `SAVE_VERSION` erhöhen und eine Migration/Normalisierung schreiben, die alte Saves um neue Felder/Defaults ergänzt (z.B. fehlende Equip-Slots auffüllen); (3) sicherstellen, dass `createGame`/`createCharacter` neue Felder initialisieren. Siehe [[game-design]].
