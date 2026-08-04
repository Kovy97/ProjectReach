# Test-Übersicht — Nacht-Session (00:01–03:50, 37 Iterationen)

Stand: 88 Tests grün, Build sauber, Simulation 0 Auffälligkeiten, Save-Format v13.
Alles unten ist im laufenden Spiel (`pnpm dev`) testbar. Reihenfolge = empfohlene Testreihenfolge.

---

## 1. Skills — „Was tue ich gerade?" + Raten
**Wo:** Sidebar → eine Sammel-Fertigkeit (z. B. 🪓 Holzfällen).
**Test:** Aktion starten → prominentes Panel mit großem Fortschrittsbalken, XP/h und Items/h.
Aktionskarten zeigen Start/Stop, benötigte Materialien (have/need) und Output-Vorschau.
Gesperrte Aktionen sind ausgegraut mit „🔒 Benötigt Level N".

## 2. Skill-Übersicht (neu, klickbar)
**Wo:** Sidebar → 📚 Fertigkeiten-Übersicht.
**Test:** Alle Fertigkeiten auf einen Blick (Gesamtlevel-Kopf, Gruppen *Allgemein* / *Kampf*),
je Karte Level + XP-Balken. **Klick auf eine allgemeine Karte → springt direkt zur Skill-Seite.**

## 3. Inventar-Füllstand + „voll"-Logik (Logik-Fix)
**Wo:** Kopfzeile oben rechts → „🎒 x/y".
**Test:** Inventar füllen (viel sammeln). Bei vollem Inventar:
- Anzeige färbt sich warnend.
- **Sammeln stoppt automatisch** (statt Loot zu verlieren) — vorher Bug.
- Skill-Seite zeigt „⚠ Gestoppt — Inventar voll…", Kopfzeile zeigt „⚠ Gestoppt: <Aktion>".

## 4. „Aktion gestoppt"-Hinweis bei Materialmangel
**Wo:** Eine Verarbeitung (z. B. 🔨 Schmieden → Bronze schmelzen) mit wenig Material starten.
**Test:** Wenn das Material ausgeht, stoppt die Aktion und Skill-Seite/Kopfzeile zeigen
„⚠ Gestoppt — Material leer…". (Auch nach Offline-Zeit sichtbar.)

---

## 5. Kampf — die drei Stile sind jetzt mechanisch eigenständig
**Wo:** Sidebar → ⚔️ Kampf. Gegner sind nach **Zonen** gruppiert; jede Karte zeigt
HP/Schaden/Verteidigung, ⭐XP·🪙Gold, Beute-Icons und ggf. Trait-Icons.

- **Nahkampf** = Lebensraub (heilt beim Treffer).
- **Magie** = Mana pro Zauber (ohne Mana schwacher Schlag) + Statuseffekte.
- **Fernkampf** = Krit/Tempo **+ Munitionsverbrauch (Pfeile)**.

### 5a. Fernkampf-Munition (neu)
**Test:** Kurzbogen ausrüsten (Charakter-Seite), „Eisenpfeile" kaufen (🪙 Shop) oder
fertigen (🏹 Bogenbau). Im Kampf: **Munitionsanzeige „🪶 Munition: N"** zählt runter.
Bei 0 Pfeilen → „Keine Munition!" + spürbar schwächere Schüsse. Auch am Charakterblatt sichtbar
(Kampfstil + Munition).

### 5b. Statuseffekte (neu) — Legende im Bestiarium
🔥 Brand · ❄️ Frost · ⚡ Schock · 🟢 **Gift** · 🩸 **Blutung**
- **Gift (Spieler):** gegen Morastkriecher (Lv8), Rankenhexe (Lv32) oder Grubenspinne (Lv42) kämpfen
  → Spieler-Badge 🟢 + Schaden über Zeit. **Antigift-Tonikum** (🧪 Kräuterkunde/Shop) heilt das Gift.
  Gegner-Karte warnt vorab „Verursacht: 🟢".
- **Blutung (Fernkampf/Nahkampf):** Schwarzdorn-Kriegsbogen oder Schwarzguss-Kriegsklinge → 🩸 am Gegner.
- **Kampf-Log** meldet Auslösungen: „X erleidet Gift!" / „Du erleidest Gift!" (lila, kursiv).

### 5c. Resistenzen/Immunitäten (neu)
**Test:** Gegner mit „Immun: <Icon>" auf der Karte — z. B. Glutelementar (🔥), Frosthund/Eishexer (❄️),
Eisenrevenant (🔥🩸), Endboss (alles). Dort greifen die jeweiligen Effekte **nicht**.

### 5d. Selbstheilung / Regen (neu)
**Test:** Moosgolem (Lv24) oder Drachenhaut-Skarn (Lv104). Karte zeigt „♻ N/s".
Im Kampf: ♻-Badge am Gegner; man muss seine Heilung **überbieten** (DPS-Check).

### 5e. Wut / Enrage (neu)
**Test:** Waldvogt (Lv40) oder Endboss (Lv120). Sinkt seine HP unter die Schwelle →
**pulsierendes 😡-Badge** + deutlich höherer Schaden. Karte zeigt 😡 vorab.

---

## 6. Bestiarium (neu)
**Wo:** Sidebar → 📖 Bestiarium.
**Test:** Alle Gegner nach Zone gruppiert; Entdeckt-Zähler (X/Y). Noch nicht besiegte sind „???".
Besiegte zeigen Werte, ☠ Kill-Zahl, Immunitäten, ♻/😡-Traits, Beute. **„⚔ Kämpfen"-Button**
springt direkt in den Kampf. Oben: Status-Effekt-**Legende**.

## 7. Achievements / Meilensteine (neu)
**Wo:** Sidebar → 📊 Statistik.
**Test:** 10 Erfolge (Gesamtlevel, Kills, Sammeln, Gold). Freigeschaltete sind hervorgehoben,
gesperrte mit 🔒. Schalten automatisch frei beim Erreichen (auch offline).

## 8. Gesamtfortschritt (neu)
**Wo:** 📊 Statistik → „Gesamtfortschritt".
**Test:** Fortschrittsbalken für Erfolge (X/Y · %) und Bestiarium (entdeckte Gegner · %).

## 9. Statistik-Seite
Gesamtlevel, Gesamt-XP, Spielzeit, Gold, besiegte Monster, Tode, gesammelte Items.

## 10. Sonstiges (früher in der Nacht)
- **Optionen** (⚙️): Sprachumschalter Deutsch/English **im Spiel** — alles bleibt zweisprachig.
- **Offline-Popup:** Spiel speichern, schließen, später laden → „Während du weg warst" (XP/Gold/Items).
- **Buffs:** Glyphen (📜 Schreibkunst) als Buff nutzbar; Tränke heilen. Aktive Buffs als Badges
  am Charakterblatt.

---

## Schneller „Happy-Path" zum Durchklicken
1. 🪓 Holzfällen starten → Panel + Raten ansehen, Inventar-Zähler beobachten.
2. ⚔️ Kampf → Goblin (Borderlands) besiegen → Bestiarium/Statistik füllen sich.
3. Magie-Stab ausrüsten, gegen Aschratte → 🔥-Status + Log-Meldung prüfen.
4. Bogen + Pfeile → Munition runterzählen lassen, dann leer schießen.
5. Gegen Morastkriecher → Gift bekommen → Antigift trinken.
6. Moosgolem (♻) und Waldvogt (😡) gegen die neuen Mechaniken testen.
7. 📊 Statistik → Erfolge + Gesamtfortschritt prüfen.

## Bekannte Nicht-Themen (bewusst offen)
- **Balance-Zahlen** (XP-Raten, Drop-Chancen, konkrete Level-Gates) sind absichtlich **nicht**
  feinjustiert — das ist deine Domäne. Simulation meldet sie nur (z. B. XP-Raten aktuell hoch).
- **Achievement-Toast** (Pop-up beim Freischalten) bewusst aufgeschoben, bis du es live prüfen kannst.
- Platzhalter-Grafiken (schwarze Silhouetten) für fehlende Item-/Portrait-Bilder.
