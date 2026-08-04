# Read-only Asset-Gap-Sweep — sichtbare Behelfsgrafiken

**Datum:** 2026-08-03  
**Scope:** ausschließlich Bestandsaufnahme; kein Renderer-, Package-, i18n- oder Runtime-Asset-Code
verändert. Fundstellen beziehen sich auf den Stand während Claudes Nachricht `02`.

## Kurzfazit

Die Kerninhalte sind erstaunlich vollständig bebildert. Der sichtbare Restbruch sitzt weniger bei
Items/Kreaturen als in der UI-Chrome: Statuszeichen, Filterkategorien, leere Zustände und einzelne
Bedienaktionen verwenden noch direkte Unicode-/Emoji-Symbole.

## Bestätigte Asset-Abdeckung

- **Items:** 355/355 Content-IDs besitzen direkte Art oder den bestehenden `hunting_bow`-Alias.
- **Monster:** 109/109 IDs lösen direkt oder über die vorgesehenen `tower_`-/`dg_`-Basisaliase auf.
- **Companions:** 21/21 Pet-IDs besitzen ein Bild.
- **UI-Icons:** 53/53 statische `getUiIcon("…")`-Referenzen besitzen eine Datei.
- Die Emoji-Werte in `navigation.ts`, `skillIcons.ts` und zahlreichen `??`-Zweigen sind damit oft
  nur Sicherheitsnetze und nicht automatisch ein aktuell sichtbarer Fehler.

## Priorität A — garantiert direkte Unicode-Grafik im UI

1. **Action Queue** — `components/ActionQueuePanel.tsx`: Clipboard-Kopf `📋` (ca. Z. 450), Warnung
   `⚠`, Blockiert `⏳`, Priorisieren/Start `⚡` und Pfeilzeichen (ca. Z. 461–626). Sinnvoll wäre ein
   geschlossenes kleines Set aus Queue, Warnung, Zeitblock und Priorität im selben Strichgewicht.
2. **Quest-/Contract-Wall** — `pages/QuestsPage.tsx`: Münze, Ticket, Orts-Pin, Sprechblase,
   Kalender und Buch-Platzhalter (ca. Z. 223, 260, 300, 437, 525, 585, 629, 828, 1302).
   Besonders Ticket/Ort/Dialog sind dauerhaft sichtbare UI-Semantik und lohnen ein Mini-Set.
3. **Achievements** — `pages/AchievementsPage.tsx`: neun Kategoriezeichen (`🏆`, `⚒`, `⚔`, `🌿`,
   `🔨`, `📜`, `💰`, `🎁`, `🧭`, `⭐`, ca. Z. 33–42), Milestone-Trophäe und Suche (ca. Z. 388/486).
   Ein einheitliches monochromes Kategorienset würde hier den größten Kohäsionsgewinn bringen.
4. **Combat-Chrome** — `pages/CombatPage.tsx`: direkte Heileffekt-Quellen `🩸/💀/✨`, Gegner-/Boss-
   Platzhalter `⚔/💀`, Immunität `🚫`, Dungeon-Kopf `🏰` und einzelne Statusglyphen. Nicht die
   Monsterbilder fehlen, sondern die kleinen semantischen Kampfzeichen.
5. **Farming-Leerzustände** — `pages/FarmPage.tsx`: mehrfach direktes `🌱` für Kategorie,
   unbepflanzte/fehlende Pflanze und Plot-Fallback (ca. Z. 205, 319, 490, 550, 556, 640).
6. **Options-/Systemaktionen** — `pages/OptionsPage.tsx`: Unicode-Checkboxen `☑/☐` und Ordner
   `📂` (ca. Z. 112/218). Für Checkboxen besser ein echter UI-State als zwei Schriftglyphen.
7. **Mail/Offline-Zustände** — `pages/MailPage.tsx` nutzt `✉` direkt (ca. Z. 72/197);
   `pages/OfflinePopup.tsx` besitzt direkte Warn-/Leerzustände (`⚠`, `💤`) und mehrere Emoji-
   Fallbacks für Gold/XP/Kampf/Erfolg. Ein kleines System-Status-Set kann beide Screens bedienen.
8. **Footer-Texte** — `i18n/translations.ts` und fünf Overlays enthalten `💾`/`↩` direkt in den
   lokalisierten Save-/Main-Menu-Strings. Das ist kein fehlendes Content-Bild, aber ein sichtbarer
   Stilbruch, der langfristig aus Text in Icon+Label getrennt werden sollte.

## Priorität B — nur sichtbar, wenn ein Asset ausfällt

- `equipSlotIcons.ts` enthält für alle Slots Emoji-Fallbacks; diese sind bei intakter Slot-Art nicht
  sichtbar, sollten aber bei einem späteren Asset-Rename nicht plötzlich im Produkt auftauchen.
- `BestiaryPage`, `CombatPage`, `NewHavenPage`, `SkillPage`, `ItemChip` und `ActionQueuePanel`
  fallen bei fehlender Item-Art auf Content-Emoji oder `▪` zurück. Der jetzige 355/355-Abgleich
  zeigt keinen aktuellen Item-Gap.
- `sidebarIcons.ts` fällt für New Haven derzeit bewusst auf `sidebaricon_city.webp` zurück. Das neue
  Emblem unter `CODEX/AssetControl/newhaven-emblem/` ist der konkrete Ersatzkandidat.
- Monster- und Pet-Platzhalter bleiben als defensive Absicherung sinnvoll; aktuell lösen alle
  bekannten IDs auf echte Art auf.

## Empfohlene nächste Asset-Aufträge

1. **Action-Queue-Micro-Icon-Set** (4–6 Icons, 14–18 px)
2. **Quest-Semantik-Set** (Ticket, Ort, Dialog, Kalender, Journal)
3. **Achievement-Kategorien** als geschlossenes 10er-Set
4. **Combat-Status-Micro-Set** (Heilquelle, Kill, Effekt, Immun, Boss, Regeneration)
5. **System/Empty-State-Set** (Warnung, Schlaf/Idle, Mail, Ordner)

Alle Sets sollten zuerst als 14/16/20-px-Prüftafel abgenommen werden; eine hübsche 512er Quelle
allein ist für diese Use Cases kein ausreichender Qualitätsnachweis.
