# Sweep 2 — Bericht 15: UI Skill-/Crafting-Seiten

**Fokus:** `apps/client/src/renderer/pages/SkillPage.tsx` + `styles/skills.css`
(Aktions-Karten, IN-PROGRESS-Bereich, Fortschrittsleiste, Kategorien/Collapse, Mastery-Bar, Tooltips, Overflow/Dev-Text).
**Methode:** Headless Code-Audit (kein Electron). i18n-Key-Parität, React-Reconciliation, Container-Query-Skalierung.

---

## Kurzfazit
Kernlayout ist solide: alle i18n-Keys der Seite existieren in `de` **und** `en` (translations.ts:514–546, 698–705, 843 / 1390–1422, 1574–1581, 1719), keine sichtbaren Roh-Keys, keine `TODO/undefined/NaN`-Leaks, echte Icons im IN-PROGRESS-Bereich und auf den Karten, Kacheln/Bar/Mastery rechnen konsistent mit `effectiveActionDurationMs`. **Ein echter State-Bug** (Collapse-Leck zwischen Skills) plus drei kleinere Politur-/i18n-Punkte.

---

## Findings (schwerste zuerst)

### [P2][ux] Kategorie-Collapse-Zustand leckt zwischen Skill-Seiten — CONFIRMED
**Datei:** `pages/SkillPage.tsx:93-102` (useState-Init) · `App.tsx:80-83` + `App.tsx:299` (kein `key`) · `content/index.ts:11752` (geteilte IDs)

`SkillPage` hält den eingeklappten Zustand in lokalem `useState` (`collapsed`), initialisiert **einmalig** beim Mount ("voll gesperrte Tiers starten zugeklappt"). In `App.tsx` rendert `PageContent` die Seite aber **ohne `key`** — bei Skill→Skill-Navigation gibt `PageContent` in beiden Fällen `<SkillPage …/>` zurück, React recycelt dieselbe Instanz, `collapsed` wird **nicht** neu initialisiert. Verschärfend: Smithing **und** Fletching benutzen dieselben Kategorie-IDs (`copper`, `bronze`, `iron`, … `godiron` — Smithing ab index.ts:5621, Fletching ab index.ts:7479; Kommentar bei categories:11752 nennt sie nur "Smithing-Metall-Tiers"). Der Sidebar-Wechsel ist ein reines `setActivePageId` ohne Remount.

**Repro:**
1. Smithing öffnen (hoher Level → alle Tiers offen), Kategorie **Bronze** manuell zuklappen.
2. In der Sidebar direkt auf **Fletching** wechseln.

**Erwartet:** Fletching zeigt seinen eigenen frischen Collapse-Zustand (gesperrte Tiers zu, freigeschaltete offen).
**Tatsächlich:** In Fletching ist **Bronze** eingeklappt (nie dort geklickt); zusätzlich werden Fletchings gesperrte High-Tiers **nicht** auto-zugeklappt, weil der Init nur beim ersten Skill der Sitzung lief. Bug tritt bei jeder direkten Skill→Skill-Navigation auf (Zwischenstopp auf einer Nicht-Skill-Seite wie Farming/Character setzt zurück, da dort ein anderer Komponententyp gemountet wird).

**Owner:** ui-dev. **Fix (1 Zeile):** `<SkillPage key={page.skillId ?? ""} skillId={page.skillId ?? ""} />` in `App.tsx:83` (erzwingt Remount pro Skill) — alternativ `collapsed` an `skillId` koppeln.

---

### [P3][ux/i18n] Inventar-Zähler-Tooltip ist tot + hartkodiertes Deutsch — CONFIRMED
**Datei:** `pages/SkillPage.tsx:355` · `styles/skills.css:279`

`.skillcard-invcount` hat `pointer-events: none` (skills.css:279) → das `title`-Attribut auf demselben Element (SkillPage.tsx:355) ist niemals hoverbar, der Tooltip erscheint nie. Zusätzlich ist der title-Text hartkodiert Deutsch: `` `${tr(outItem.name)} im Inventar: ${…}` `` — nicht lokalisiert. Praktischer Schaden aktuell = 0 (Tooltip unerreichbar), aber wer `pointer-events` repariert, exponiert EN-Nutzern einen DE-String.
**Owner:** ui-dev. **Fix:** entweder Tooltip-Absicht streichen oder `pointer-events` erlauben **und** Text über `t(...)` lokalisieren.

---

### [P3][feel] IN-PROGRESS-Raten ignorieren Werkzeug-/Mastery-Tempo — CONFIRMED
**Datei:** `pages/SkillPage.tsx:542-544` (ActivePanel)

Der aktive Bereich zeigt `xpPerHour(action)` und `out.perHour` als **Basiswerte** (ohne effSpeed). Die Karten-Kacheln (SkillPage.tsx:311, 317) zeigen dagegen effektive Raten (`… / effSpeed`, also inkl. Spitzhacke ⛏ / Mastery ★). Bei aktivem Werkzeug- oder Mastery-Tempo untertreibt der IN-PROGRESS-Header seine XP/h und Item/h gegenüber der Karte und der Realität.
**Owner:** ui-dev. **Fix:** in `ActivePanel` denselben `effSpeed`-Faktor anwenden (oder `effectiveActionDurationMs` als Ratenbasis nutzen).

---

### [P3][ux] Mats-Grid fällt bei üblichen Fenstergrößen auf 1 Spalte zurück — SUSPECTED
**Datei:** `styles/skills.css:481-491`

Chef-Vorgabe war "Mats 2-Spalten". `.skillcard` ist `container-type: inline-size`; die Container-Breite ist Kartenbreite − 14px (Border). Die Notbremse `@container (max-width: 260px) { .mats-list { grid-template-columns: 1fr } }` greift damit schon bei ~242px breiten Karten — das ist genau das 4-Spalten-Layout auf einem ~1024px-Content-Bereich (`(1024−54)/4 ≈ 242px` → Container ~228px < 260px). Ergebnis: auf kleineren Fenstern werden die Materialien **einspaltig** statt zweispaltig gezeigt. Auch `@container (max-width: 460px)` (Mats-Reihe + Craftable-Badge untereinander statt nebeneinander) greift im normalen 4-Spalten-Layout praktisch immer — das "Chips links / Badge rechts"-Design (Kommentar skills.css:371-378) erscheint nur bei sehr breiten Karten (>~474px Container).
**Owner:** ui-dev (Chef-Design-Domäne). **Bewertung:** funktioniert als responsiver Fallback, kollidiert aber mit der "immer 2 Spalten"-Absicht — kurz mit Chef abklären.

---

### [P3][ux/i18n] Fence-Hinweis (Diebeskunst) grammatikalisch kaputt — CONFIRMED
**Datei:** `i18n/translations.ts:1574`

DE: `"Verhehlte gestohlene Waren hier in Edelsteine und Gold."` — Satz ohne Verb/kaputte Verbform ("Verhehlte" statt Imperativ; das "…um sie zu verwandeln" fehlt ganz). EN korrekt: `"Fence stolen goods here to convert them into gems and gold."` (703… → 698). Wird über der `fence`-Kategorie auf der Diebeskunst-Skill-Seite gezeigt (SkillPage.tsx:253-255).
**Owner:** ui-dev/content. **Fix:** z.B. `"Verkaufe gestohlene Waren hier an den Hehler, um sie in Edelsteine und Gold zu verwandeln."`

---

### [P3][ux] Kleinkram (nicht blockierend)
- **Einzel-Material-Rezepte:** 2-Spalten-Mats-Grid mit nur 1 Zutat (viele Barren-Schmelz-Rezepte) → linke Hälfte gefüllt, rechte leer wirkt sparsam. Rein kosmetisch. (`styles/skills.css:380-390`)
- **A11y:** Mat-Chips sind `role="button" tabIndex={0}` ohne `onKeyDown` — per Tastatur nicht auslösbar (SkillPage.tsx:421-432). EA-Politur.

---

## Verifizierte Fixes im Fokusbereich (wirken, NICHT als Bug melden)
- **Echte Icons IN-PROGRESS:** `ActivePanel` nutzt `getActionSrc`/`getItemImage`, Emoji nur als Fallback (SkillPage.tsx:527, CSS `.skill-active-icon` 1199) — OK.
- **Header 0×/LV in Ecken:** Inventar-Zähler oben links, LV oben rechts, Titel unten rechts — keine Überlappung, LV zeigt Schloss-Icon wenn gesperrt (SkillPage.tsx:351-366) — OK.
- **Fortschrittsleiste bis 100%:** Karte und ActivePanel rechnen beide mit `effectiveActionDurationMs` → Bar läuft exakt voll (SkillPage.tsx:209, 273-274) — OK.
- **Mastery-Bar:** Level + Fortschritt + Doppel-Ertrag-Bonus, `mProg`/`mBonus` sauber geklammert (SkillPage.tsx:492-506) — OK.
- **Skalierung:** durchgehend `clamp()` + `cqw` auf Body/Kacheln/Mats/CTA → keine Overflow-Leaks bei kleiner Auflösung (die 1-Spalten-Mats-Frage oben ist Design, kein Bug).

---

## Zusammenfassung
- **P2:** 1 (Collapse-Leck Skill→Skill, confirmed)
- **P3:** 5 (2× confirmed i18n/tooltip, 1× confirmed feel-Rate, 1× confirmed DE-Grammatik, 1× suspected Mats-Spalten + Kleinkram)
- **P0/P1:** 0

**Top-3:**
1. [P2] Kategorie-Collapse leckt zwischen Skills (kein `key` in App.tsx + geteilte Smithing/Fletching-Kategorie-IDs) → `key={skillId}` setzen.
2. [P3] IN-PROGRESS-Raten ignorieren Werkzeug/Mastery-Tempo → untertreiben ggü. Karten-Kacheln.
3. [P3] `.skillcard-invcount`-Tooltip tot (`pointer-events:none`) + hartkodiertes DE "im Inventar:".

**Empfehlung:** fix-then-ship — Finding 1 (P2) vor EA fixen (1-Zeilen-`key`); die P3 sind Politur und können gebündelt nachziehen.
