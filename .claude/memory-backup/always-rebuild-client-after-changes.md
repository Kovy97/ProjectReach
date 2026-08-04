---
name: always-rebuild-client-after-changes
description: "Nach abgeschlossenen UI-/Content-Änderungen den Client SELBST neu bauen, nie den Chef bauen lassen"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-22T17:52:16.687Z
---

Nach jeder abgeschlossenen Renderer-/Content-Änderung selbst `pnpm build` (bzw. `pnpm --filter @hearthforge/client build`) laufen lassen, BEVOR ich „fertig" melde — nicht den Chef bitten, neu zu bauen.

**Why:** Der Client bündelt UI-Code UND Assets zur Build-Zeit (`import.meta.glob`), nicht zur Laufzeit. Ohne Rebuild sieht der Chef alte Stände. Genau das führte zu wiederholtem „ist doch nicht erledigt!"-Frust (imp_horn übergroß, Skill-Kopfbox-Leiste, entfernte XP-Leiste) — der Code war jeweils korrekt, nur der Build veraltet. Der Chef erwartet ausdrücklich, dass ich wie früher selbst baue.

**How to apply:** UI/Content-Task abschließen → selbst bauen → dann erst „fertig" melden. Für den sichtbaren Beweis ggf. `apps/client/ui-audit/tour.mjs` (headless Screenshot) nach dem Build.

**Erweiterung (Chef 2026-07-22):** Wenn eine AGENT-WELLE komplett fertig ist, zusätzlich den
**Dev-Build für den Chef starten** (`pnpm --filter @hearthforge/client dev`, run_in_background) —
er will nach jeder Welle sofort selbst reintesten, ohne darum bitten zu müssen. Das ist die
erlaubte Standing-Ausnahme zur App-Instanz-Regel in [[no-unapproved-longrunners]]: der Dev-Build
FÜR den Chef auf seine Ansage ist ok; Agenten, die die App selbst BEDIENEN, brauchen weiterhin
explizites GO je Lauf.
