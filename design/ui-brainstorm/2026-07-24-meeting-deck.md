# UI-Brainstorm — Meeting-Deck (Synthese aus 3 Perspektiven, 24.07.2026)

*Quellen: `2026-07-24-ergonomie.md` (18 Befunde) · `2026-07-24-designsystem.md` (21 Befunde) ·
`2026-07-24-gamefeel.md` (10 Befunde + 11er „Nicht-anfassen"-Liste). Dedupliziert, priorisiert,
gegen laufende Arbeiten abgeglichen.*

---

## Wo sich die Perspektiven gegenseitig bestätigen (stärkste Signale)

1. **Stilles Auto-Stopp-Problem** — von ZWEI Perspektiven unabhängig gefunden (Game-Feel #3,
   Ergonomie #4): Stoppt eine Aktion online (Tasche voll/Material leer), während man woanders ist,
   gibt es keinen Toast, und das Queue-Panel sagt nur „Nichts läuft" ohne Grund. Doppel-Fund =
   höchste Dringlichkeit. → Toast mit Grund + Grund-Zeile im Queue-Panel.
2. **Queue-Schmerzen des Power-Users** (Ergonomie: keine freie Mengeneingabe, kein Umsortieren) —
   deckt sich mit dem Spieler-Feedback von heute Morgen. Drag&Drop ist BEREITS IN ARBEIT (QoL-Agent);
   Kampf-Einträge mit 1×/25×/50×/∞ sind eingeplant. NEU aus dem Brainstorm: **freie Mengeneingabe**
   (Zahlenfeld neben den Presets) — gehört in die Kampf-Queue-UI-Welle.
3. **Konsistenz-Baustellen bei gleichen Interaktionen**: 3 verschiedene Mengen-Presets für
   strukturell identische „Wie viele?"-Dialoge (Shop-Kauf/-Verkauf/Queue); Shift-Klick-Hinweis nur
   im Shop, obwohl die Bank dasselbe kann. → Ein gemeinsamer Mengen-Baustein.

## A. Quick-Win-Welle (alles S-Aufwand — Empfehlung: als Paket direkt in 0.2.2)

| # | Fix | Quelle |
|---|---|---|
| A1 | Rarity-Farben `magic` und `superRare` sind DERSELBE Hex (#5b8fd6) — trennen | Design-System, P1 |
| A2 | Fertigen `.ds-close-button` in allen 7 Modals einsetzen (ersetzt flachen `.modal-close`) | Design-System, P1 |
| A3 | Gemeinsame Modal-Eingangs-Animation (Fade+Scale) — fixt 9 Stellen inkl. Todes-Popup | Game-Feel, P1 |
| A4 | Auto-Stopp: Toast mit Grund + Grund-Zeile im Queue-Panel statt stillem Header-Icon | Doppel-Fund, P1 |
| A5 | `.zone-card` auf 9-Slice-Holzrahmen migrieren (erster Screen nach Charaktererstellung!) | Design-System, P1 |
| A6 | F1-Trailer-Autoscroll hinter DEV-Flag legen (liegt aktuell in Produktion auf der Hilfe-Taste) | Ergonomie, P1/Bug |
| A7 | Shift-Klick-Hinweis auch in der Bank (Verhalten existiert schon) | Ergonomie |
| A8 | Zonen-Suche im Kampf (Suchmuster existiert auf 3 anderen Seiten, kopierbar) | Ergonomie |

## B. Mittlere Pakete (M-Aufwand — Chef pickt)

- **B1 Elite-Kill-Zeremonie:** Champion-Tod bekommt eigenen Flourish (aktuell identisch mit
  gewöhnlicher Ratte, obwohl der Spawn Fanfare+Alert hat). Passt thematisch perfekt zur kommenden
  Combat-FX-Schiene. *(Game-Feel P1)*
- **B2 Einheitlicher Mengen-Baustein:** Ein „Wie viele?"-Widget (Presets + freie Eingabe) für
  Shop-Kauf, Verkauf, Skill-Queue, Kampf-Queue. *(Ergonomie)*
- **B3 Typografie-/Spacing-Fundament:** Global-Font (21px/700) mit der Design-System-Skala
  versöhnen; `--ds-gap-*` schrittweise in die Style-Dateien bringen (929 rohe px-Werte). Kein
  Hauruck — als Leitplanke für jede künftige UI-Arbeit. *(Design-System)*
- **B4 Icon-Zentralisierung:** 4-5 duplizierte Skill-Emoji-Fallback-Maps in ein Modul; echte Icons
  für Achievement-Kategorien exploration/meta (→ 2 Prompts für den Chef). *(Design-System)*
- **B5 Tastatur-Lücken:** `.bestiary-drop` u.a. per role/tabIndex erreichbar machen; Fokus-Sweep
  über interaktive Divs. *(Design-System)*

## C. Bewusst später

- **Guide-Lücke** (Hauptguide besucht Combat/Shop/Bank/Mail/Enchanting nie; Bereichstouren feuern
  für guide-treue Spieler nie): wichtigster Input für den **Onboarding-Meilenstein** (bewusst
  finaler Meilenstein laut Roadmap) — dort einarbeiten, nicht jetzt stückeln.
- Tote `NavSection`-Labels: zusammen mit künftiger Sidebar-Gruppierung entscheiden.
- Leerlauf-Charme-Ideen (atmende Elemente): nach Ambient-Canvas-Erfahrung neu bewerten.

## Bereits abgedeckt durch laufende Arbeit (nicht doppeln!)

Queue-DnD + Sidebar-Aktiv-Indikator + Elite-Mini-Fenster + Kategorie-Holz (QoL-Agent) ·
Ambient/Bloom/Wetter (Effekt-Paket) · Kampf-Queue 1×/25×/50×/∞ (geplant) ·
Ultrawide-Perf + Backdrop-Fit (läuft) · Cormorant-Fonts (Backlog, bestätigt Dev-only) ·
Game-Feel „Nicht-anfassen"-Liste (11 bereits polierte Systeme) beachten.
