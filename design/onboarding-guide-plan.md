# Onboarding-Guide — Großer geführter Tutorial-Flow (Design-Plan)

> Chef-Vorgabe 2026-07-01. Der finale Onboarding-Meilenstein ([[onboarding-guide-final-milestone]]),
> jetzt konkret. Wird NACH dem laufenden Balance-Sweep gebaut. Ersetzt das aktuelle schlichte
> 21-Schritt-Modal (`components/Onboarding.tsx`), das die Sweeps als zu schwer/nicht-adaptiv flaggten.

## Anforderungen (Chef)
1. **Trigger:** feuert automatisch bei **jedem neuen Spielstand**; zusätzlich **im Optionsmenü jederzeit neu startbar**.
2. **Erzwungenes Folgen (Spotlight-Gating):** Der Guide **animiert zum Folgen** — es ist **immer nur das Element
   klickbar, auf das der Guide zeigt**. Alles andere wird abgedunkelt/pointer-events:none, bis der Spieler die
   geforderte Aktion ausführt. Ein Spotlight/Highlight (Loch im Dim-Overlay) hebt das Ziel hervor + Sprechblase/
   Tooltip mit Erklärtext + „Weiter"/Aktionsbestätigung.
3. **Vollständige Abdeckung, jede Schaltfläche einmal:**
   - **Topbar:** jeder Unterpunkt einzeln erklärt.
   - **Sidebar:** jeder einzelne **Skill** erklärt — *wozu* dient er, *wie* levelt man ihn, *was* bewirkt er im Spiel.
   - (Danach ggf. Kernflächen: Kampf, Shop/Bank, Charakterblatt, Enchanting.)
4. **Ton: Lore / In-Game-Sicht, immersiv.** KEINE Dev-/Technik-Notizen (kein „computeStats", keine Feld-Namen).
   Ein In-World-Erzähler/Mentor (Grim-Reach-Dark-Fantasy-Ton).

## Technischer Ansatz (Vorschlag)
- **Guide-Overlay-Komponente** (Renderer): Vollbild-Dim mit ausgeschnittenem Spotlight um ein Ziel-Element
  (via `getBoundingClientRect` eines per `data-guide-id` markierten DOM-Knotens) + positionierte Sprechblase.
- **Schritt-Registry** (`onboarding-steps.ts`): geordnete Liste `{ id, targetGuideId, text(lore), requireAction }`.
  Jedes UI-Element, das der Guide anspricht, bekommt ein `data-guide-id="topbar.stats"` / `data-guide-id="sidebar.mining"`.
- **Gating:** während eines Schritts globaler CSS-Zustand `guide-active` → `pointer-events:none` auf allem außer
  dem aktiven Ziel (`.guide-spotlight-target`). Klick/Aktion am Ziel → nächster Schritt.
- **Per-Skill-Tiefe:** Kompromiss gegen die „40-Schritt-Wall"-Gefahr (Sweeps!) — Vorschlag: Der Guide führt
  sequenziell durch Topbar + Sidebar-Struktur; die **tiefe Einzel-Skill-Erklärung** kann beim **ersten Öffnen der
  jeweiligen Skill-Seite** (guide-gated) feuern statt alle 13 upfront. → Chef bestätigt Reihenfolge/Umfang beim Bau.
- **Zustand:** `state.onboardingStep`/`onboardingDone` (persistiert → SAVE_VERSION-Bump + Migration
  [[always-update-save-logic]]); Neu-Save setzt zurück; Options-Button setzt zurück + öffnet Guide.
- **Texte:** liegen als i18n-Keys `onboarding.guide.*` (en+de) vor — es gibt bereits vorgeschriebene
  `onboarding.*`-Strings ([[i18n-bulk-rest-unsafe]]); die Lore-Texte pro Topbar-Punkt/Skill neu verfassen.

## Offene Chef-Entscheidungen (beim Bau klären)
- Umfang/Reihenfolge: alle 13 Skills upfront ODER per-Skill beim ersten Seitenbesuch?
- Skippbar (mit „später im Menü")? Chef will erzwungenes Folgen — evtl. kein Skip, aber Options-Neustart.
- Mentor-Figur/Erzähler-Stimme (welcher Lore-Charakter spricht?).

## Status
GEPLANT — Bau startet nach dem Sweep-3-Balance-Feintuning. Großer Brocken (Overlay-System + Gating +
Schritt-Registry + Lore-Texte für ~10 Topbar-Punkte + 13 Skills). Wird als eigener, dedizierter Build-Pass
(ui-dev + logic-dev für den Zustand) umgesetzt.
