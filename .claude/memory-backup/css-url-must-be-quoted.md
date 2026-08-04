---
name: css-url-must-be-quoted
description: background-image url() im Renderer IMMER quoten — sonst brechen Installpfade mit Klammern wie C:\Program Files (x86)\Steam
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-20T10:21:55.855Z
---

Launch-Blocker (gefunden 2026-07-20, Tag vor EA): Beim Freund des Chefs fehlten ALLE Hintergrundbilder (Zonen-BG, Monster-Karten-BG, Action-/Skill-Card-BG), während `<img src>` (Logo, UI-Icons, Monster-Porträts) normal rendern.

**Ursache:** Wir bauten inline `style={{ backgroundImage: `url(${pfad})` }}` **ohne Anführungszeichen**. Der Freund hatte Steam im Standardpfad `C:\Program Files (x86)\Steam\...`. Die **Klammern `(x86)`** brechen den CSS-`url()`-Parser → der Browser verwirft die ganze Deklaration → `node.style.backgroundImage` bleibt leer → React rendert gar kein `style`-Attribut (DOM zeigte `class="...has-bg"` gesetzt, aber KEIN style). `<img src>` ist unbetroffen, weil `src` kein CSS ist — Klammern egal. Chef selbst unbetroffen, weil seine Library `G:\SteamLibrary` (keine Klammern) hat.

**Warum kritisch:** `C:\Program Files (x86)\Steam` ist der DEFAULT-Steam-Pfad → die Mehrheit der Spieler wäre betroffen gewesen.

**Fix:** Runtime-injizierte CSS-URLs IMMER quoten: `` `url("${pfad}")` `` statt `` `url(${pfad})` ``. Windows-Dateinamen können kein `"` enthalten → Doppel-Quote ist robust. 12 Stellen gefixt (CombatPage, MainMenu, SkillPage, BestiaryPage, DungeonClearCeremony, ZoneMapEditor). Statische CSS-`url("../assets/…")` sind ok (gequotet + relativ). Diagnose kam aus DevTools-DOM-Vergleich Chef vs. Freund.

**Regel:** Jede neue `backgroundImage`/`--var: url(...)`-Injektion aus einem Laufzeitpfad MUSS gequotet sein. Verwandt: [[always-rebuild-client-after-changes]].
